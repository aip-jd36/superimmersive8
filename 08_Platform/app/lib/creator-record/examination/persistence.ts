/**
 * CR-V2-DOC-2C-C-B — the examination PERSISTENCE ADAPTER: connects the DOC-2B core to the DOC-2C-B database
 * contract (migration 20261104000000). Pure: every effect goes through injected ports; the only production
 * implementation is lib/creator-record-flow/examination-production.ts (no route, page or job uses it).
 *
 * examineAndRecord(ports, request):
 *   1. the DOC-2B core runs unchanged (request, profile, replay-only executor, document stored, owner);
 *   2. only when the core asks for the bytes — i.e. after it has accepted the request, the document state and the
 *      owner — an EXAMINATION-PURPOSE ACCESS EVENT is written (ports.logExaminationRead) and only then are the bytes
 *      read. If the event cannot be written, the bytes are never read;
 *   3. the core finishes (integrity, content recognition, replay through the unchanged engine) → an envelope;
 *   4. the envelope's exact canonical text and the access-event id go to the database's one write function, which
 *      re-checks everything and is authoritative: 'created' or 'existing' (idempotent), or a fixed refusal.
 *
 * Authority: this module never creates, reads or changes the environment marker and passes no authority of its
 * own. Fixture recognition stays content only (workflow_authorization 'not_established'); whether examination is
 * permitted at all is decided by the database (its environment marker), never here.
 *
 * Audit: the access event is EVENT CORRELATION — the server logged an examination read before persisting — not
 * proof that bytes were read. A failure after the event leaves the event without a run (over-reports, never
 * under-reports); a retry writes a new event and converges on the same deterministic key.
 *
 * readExaminationHistory(ports, userId, documentId): every stored run is re-verified (digest, strict v2 parser,
 * canonical form, recomputed key, every column against the envelope, owner, linear supersession). Any failure makes
 * the whole history 'unavailable' (fail closed). The chain is returned in supersession order; NO "current" run is
 * chosen (latest attempt vs latest successful is an open decision).
 *
 * Observations remain examination observations: nothing here reaches declarations, Living Knowledge, retrieval,
 * applicability, Bounded Interpretation, records or PDFs.
 */

import { canonicalJson, sha256Hex } from '../record-core/canonical'
import { parseExaminationEnvelope, type ExaminationEnvelope, type PreflightRefusal } from './envelope'
import {
  examineDocument,
  examinationKey,
  parseExaminationRequest,
  type ExaminationDeps,
  type ExaminationDocumentRecord,
} from './examine-document'

/** Fixed database refusals of the DOC-2C-B write path and its access-log guard. */
export const DATABASE_REFUSALS = [
  'environment_not_authorized',
  'envelope_invalid',
  'key_mismatch',
  'access_not_logged',
  'document_mismatch',
  'content_not_recognized',
  'key_conflict',
  'profile_regression',
  'examination_read_refused',
] as const
export type DatabaseRefusal = (typeof DATABASE_REFUSALS)[number]

const RAISED_MESSAGES: Readonly<Record<string, DatabaseRefusal>> = {
  examination_environment_not_authorized: 'environment_not_authorized',
  'examination reads are not authorized in this environment': 'environment_not_authorized',
  examination_envelope_invalid: 'envelope_invalid',
  examination_key_mismatch: 'key_mismatch',
  examination_access_not_logged: 'access_not_logged',
  examination_document_mismatch: 'document_mismatch',
  examination_content_not_recognized: 'content_not_recognized',
  examination_key_conflict: 'key_conflict',
  examination_profile_regression: 'profile_regression',
  'an examination read is logged only for the owner of a stored document': 'examination_read_refused',
}

/** A database error as both pg and PostgREST report it. Only P0001 with a known message is a refusal. */
export function classifyDatabaseError(err: { code?: string | null; message?: string | null } | null | undefined): DatabaseRefusal | null {
  if (!err || err.code !== 'P0001' || typeof err.message !== 'string') return null
  return RAISED_MESSAGES[err.message] ?? null
}

/** Thrown by a port: a classified refusal, or `null` = the dependency was unavailable. */
export class ExaminationPortError extends Error {
  constructor(readonly op: 'get_document' | 'log_read' | 'read_object' | 'record' | 'list_runs', readonly refusal: DatabaseRefusal | null) {
    super(`creator_record_examination_${op}${refusal ? `_${refusal}` : '_unavailable'}`)
  }
}

/** A stored run, exactly the columns of creator_record_v2_examination_runs the read-back needs. */
export interface PersistedRunRow {
  id: string
  examination_key: string
  document_id: string
  user_id: string
  document_sha256: string
  envelope_version: number
  content_class: string
  workflow_authorization: string
  execution_boundary: string
  environment_project_ref: string
  profile_id: string
  profile_version: number
  schema_version: string
  prompt_version: string
  executor_mode: string
  replay_set: string
  recording_sha256: string
  replay_fixture_id: string
  outcome_status: string
  outcome_reason: string | null
  envelope_canonical: string
  envelope_sha256: string
  supersedes_id: string | null
  access_log_id: number
  created_at: string
}

export const PERSISTED_RUN_COLUMNS = 'id, examination_key, document_id, user_id, document_sha256, envelope_version, content_class, workflow_authorization, execution_boundary, environment_project_ref, profile_id, profile_version, schema_version, prompt_version, executor_mode, replay_set, recording_sha256, replay_fixture_id, outcome_status, outcome_reason, envelope_canonical, envelope_sha256, supersedes_id, access_log_id, created_at'

export interface ExaminationStoragePorts {
  getDocument(documentId: string): Promise<ExaminationDocumentRecord | null>
  /** Writes one examination-purpose access event for the document's owner; returns its id. Throws on failure. */
  logExaminationRead(documentId: string, ownerUserId: string): Promise<number>
  /** The stored object's bytes, or null when absent. */
  readObject(record: ExaminationDocumentRecord): Promise<Uint8Array | null>
  /** The database's one write function. Throws ExaminationPortError on refusal or unavailability. */
  recordExamination(accessLogId: number, envelopeCanonical: string): Promise<{ run_id: string; result: 'created' | 'existing' }>
  /** The owner's stored runs for one document. */
  listRuns(ownerUserId: string, documentId: string): Promise<PersistedRunRow[]>
}

export interface ExaminationAdapterDeps {
  storage: ExaminationStoragePorts
  /** The DOC-2B core's other ports (fixture registry, replay executor, profiles). Documents come from `storage`. */
  core: Omit<ExaminationDeps, 'documents'>
}

export type ExamineAndRecordResult =
  | { kind: 'recorded'; result: 'created' | 'existing'; run_id: string; envelope: ExaminationEnvelope }
  /** The core refused before an envelope existed (`read_logged` says whether an access event had been written). */
  | { kind: 'refused'; refusal: PreflightRefusal; read_logged: boolean }
  /** An access event could not be written (refused by the database or unavailable): the bytes were NOT read. */
  | { kind: 'not_read'; reason: DatabaseRefusal | 'audit_unavailable' }
  /** The document or its object could not be retrieved. */
  | { kind: 'unavailable'; stage: 'document' | 'object'; read_logged: boolean }
  /** An envelope was produced but the database did not persist it. */
  | { kind: 'not_recorded'; reason: DatabaseRefusal | 'persistence_unavailable'; envelope: ExaminationEnvelope }

class ReadNotLogged extends Error {
  constructor(readonly reason: DatabaseRefusal | 'audit_unavailable') {
    super('examination_read_not_logged')
  }
}
class StorageUnavailable extends Error {
  constructor(readonly stage: 'document' | 'object') {
    super('examination_storage_unavailable')
  }
}

export async function examineAndRecord(deps: ExaminationAdapterDeps, rawRequest: unknown): Promise<ExamineAndRecordResult> {
  const parsed = parseExaminationRequest(rawRequest)
  let accessLogId: number | null = null

  const documents: ExaminationDeps['documents'] = {
    async get(id) {
      try {
        return await deps.storage.getDocument(id)
      } catch {
        throw new StorageUnavailable('document')
      }
    },
    async readBytes(record) {
      // Reached only after the core accepted the request, the document state and the owner. Audit first.
      if (!parsed) throw new ReadNotLogged('audit_unavailable')
      try {
        accessLogId = await deps.storage.logExaminationRead(record.id, parsed.actor_user_id)
      } catch (e) {
        throw new ReadNotLogged(e instanceof ExaminationPortError && e.refusal ? e.refusal : 'audit_unavailable')
      }
      try {
        return await deps.storage.readObject(record)
      } catch {
        throw new StorageUnavailable('object')
      }
    },
  }

  let examined
  try {
    examined = await examineDocument({ ...deps.core, documents }, rawRequest)
  } catch (e) {
    if (e instanceof ReadNotLogged) return { kind: 'not_read', reason: e.reason }
    if (e instanceof StorageUnavailable) return { kind: 'unavailable', stage: e.stage, read_logged: accessLogId !== null }
    throw e
  }
  if (examined.kind === 'refused') return { kind: 'refused', refusal: examined, read_logged: accessLogId !== null }

  const envelope = examined.envelope
  // The core produced an envelope only after reading, so an access event exists; re-check the contract anyway.
  if (accessLogId === null || !parseExaminationEnvelope(envelope)) return { kind: 'not_recorded', reason: 'envelope_invalid', envelope }
  try {
    const saved = await deps.storage.recordExamination(accessLogId, canonicalJson(envelope))
    return { kind: 'recorded', result: saved.result, run_id: saved.run_id, envelope }
  } catch (e) {
    return { kind: 'not_recorded', reason: e instanceof ExaminationPortError && e.refusal ? e.refusal : 'persistence_unavailable', envelope }
  }
}

// ── Strict read-back ────────────────────────────────────────────────────────────────────────────────

export interface VerifiedRun {
  run_id: string
  supersedes_id: string | null
  created_at: string
  envelope: ExaminationEnvelope
}

export type ExaminationHistory =
  /** Every run of this owner and document, re-verified, in supersession order (root first). No run is chosen as current. */
  | { kind: 'verified'; runs: VerifiedRun[] }
  | { kind: 'unavailable'; reason: 'storage_unavailable' | 'run_integrity' | 'chain_integrity'; run_id?: string }

/** Every check a stored row must pass; null when it passes, otherwise the failing check. */
export function verifyRunRow(row: PersistedRunRow, ownerUserId: string, documentId: string): string | null {
  const t = row.envelope_canonical
  if (typeof t !== 'string' || sha256Hex(t) !== row.envelope_sha256) return 'envelope_digest'
  let raw: unknown
  try {
    raw = JSON.parse(t)
  } catch {
    return 'envelope_json'
  }
  const e = parseExaminationEnvelope(raw)
  if (!e) return 'envelope_parser'
  if (canonicalJson(e) !== t) return 'envelope_canonical_form'
  if (examinationKey({ document_id: e.document.document_id, sha256: e.document.sha256, profile: e.profile, executor: e.executor }) !== e.examination_key) return 'examination_key'
  const expect: [string, unknown, unknown][] = [
    ['examination_key', row.examination_key, e.examination_key],
    ['document_id', row.document_id, documentId],
    ['envelope_document_id', e.document.document_id, documentId],
    ['user_id', row.user_id, ownerUserId],
    ['document_sha256', row.document_sha256, e.document.sha256],
    ['envelope_version', row.envelope_version, e.envelope.version],
    ['content_class', row.content_class, e.content_class],
    ['workflow_authorization', row.workflow_authorization, e.workflow_authorization],
    ['profile_id', row.profile_id, e.profile.id],
    ['profile_version', row.profile_version, e.profile.version],
    ['schema_version', row.schema_version, e.profile.schema],
    ['prompt_version', row.prompt_version, e.profile.prompt],
    ['executor_mode', row.executor_mode, e.executor.mode],
    ['replay_set', row.replay_set, e.executor.replay_set],
    ['recording_sha256', row.recording_sha256, e.executor.recording_sha256],
    ['replay_fixture_id', row.replay_fixture_id, e.provenance.replay_fixture_id],
    ['outcome_status', row.outcome_status, e.outcome.status],
    ['outcome_reason', row.outcome_reason, e.outcome.reason],
  ]
  for (const [name, a, b] of expect) if (a !== b) return name
  return null
}

export async function readExaminationHistory(storage: Pick<ExaminationStoragePorts, 'listRuns'>, ownerUserId: string, documentId: string): Promise<ExaminationHistory> {
  let rows: PersistedRunRow[]
  try {
    rows = await storage.listRuns(ownerUserId, documentId)
  } catch {
    return { kind: 'unavailable', reason: 'storage_unavailable' }
  }
  const verified = new Map<string, VerifiedRun>()
  for (const row of rows) {
    if (verifyRunRow(row, ownerUserId, documentId) !== null) return { kind: 'unavailable', reason: 'run_integrity', run_id: row.id }
    verified.set(row.id, { run_id: row.id, supersedes_id: row.supersedes_id, created_at: row.created_at, envelope: JSON.parse(row.envelope_canonical) as ExaminationEnvelope })
  }
  // Linear supersession per profile id: one root, every link inside the set, no fork, no cycle.
  const ordered: VerifiedRun[] = []
  const byProfile = new Map<string, VerifiedRun[]>()
  for (const r of verified.values()) byProfile.set(r.envelope.profile.id, [...(byProfile.get(r.envelope.profile.id) ?? []), r])
  for (const profileId of [...byProfile.keys()].sort()) {
    const runs = byProfile.get(profileId)!
    const roots = runs.filter((r) => r.supersedes_id === null)
    const successors = new Map<string, VerifiedRun>()
    for (const r of runs) {
      if (r.supersedes_id === null) continue
      const prior = verified.get(r.supersedes_id)
      if (!prior || prior.envelope.profile.id !== profileId || successors.has(r.supersedes_id)) return { kind: 'unavailable', reason: 'chain_integrity', run_id: r.run_id }
      successors.set(r.supersedes_id, r)
    }
    if (roots.length !== 1) return { kind: 'unavailable', reason: 'chain_integrity' }
    const chain: VerifiedRun[] = []
    for (let cur: VerifiedRun | undefined = roots[0]; cur; cur = successors.get(cur.run_id)) chain.push(cur)
    if (chain.length !== runs.length) return { kind: 'unavailable', reason: 'chain_integrity' }
    ordered.push(...chain)
  }
  return { kind: 'verified', runs: ordered }
}
