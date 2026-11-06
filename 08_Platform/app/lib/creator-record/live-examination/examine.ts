/**
 * CR-V2-DOC-LIVE-1A — one model-read examination of one stored document, and the policy for storing it. Closed.
 *
 * Pure apart from injected ports, and nothing imports this module except tests (test-enforced): no route, page, job or
 * production wiring. There is no real executor. A `live_model` executor is refused while the code lock
 * `LIVE_EXTRACTION_PERMITTED_IN_THIS_BUILD` is false, whatever the caller passes, and the database refuses `live_model` as well.
 *
 * Reused unchanged: the receipt engine (`examineReceiptDocument`: input checks, one recovery retry, strict validator, no repair),
 * its mapping to observations and limitations, the integrity re-check and the audit-before-read order of the replay path.
 *
 * Retry and idempotency (`examineLiveAndRecord`), so stored runs can never contradict each other:
 *   - at most one `examined` attempt per document and profile. Once it exists no model is called again: it is returned as is;
 *   - two racing attempts: the first write wins, and the loser receives the winner's reading, never its own;
 *   - a failed attempt is kept for audit and never counts as a reading. Only a retryable reason may be retried, at most
 *     `MAX_LIVE_ATTEMPTS` in all, and that is checked BEFORE any model call, so an exhausted document costs nothing;
 *   - a failure that depends on the file (format, size, empty) is final;
 *   - the database enforces the same rules under a lock and is authoritative.
 * Single request, no queue or worker: the caller waits, as the replay path does.
 */

import { LIVE_EXTRACTION_PERMITTED_IN_THIS_BUILD } from '../evidence/config'
import { sha256Bytes, sniffMediaType } from '../evidence-intake/contract'
import type { EvidenceMediaType } from '../evidence-intake/vocabulary'
import { canonicalJson, sha256Hex } from '../record-core/canonical'
import { examineReceiptDocument, type ExaminationUsage, type ReceiptModelCaller } from '../receipt-examination/examine'
import { RECEIPT_PROMPT_VERSION } from '../receipt-examination/prompt'
import { RECEIPT_EXTRACTION_SCHEMA_VERSION } from '../receipt-examination/schema'
import type { ProfileRef } from '../examination/envelope'
import type { ExaminationDocumentRecord } from '../examination/examine-document'
import { parseExaminationRequest } from '../examination/examine-document'
import {
  LIVE_EXAMINATION_ENVELOPE,
  LIVE_ORIGIN_RULES,
  LIVE_RETRYABLE_REASONS,
  liveExaminationKey,
  parseLiveEnvelope,
  type LiveEnvelope,
  type LiveExecutorIdentity,
  type LiveFailureReason,
  type LiveLimitation,
} from './envelope'
import type { ProfileObservation } from '../examination/profile'
import { profileKey } from '../examination/profile'
import { receiptLimitations, receiptObservations, RECEIPT_PROFILE_ID, RECEIPT_PROFILE_VERSION } from '../examination/receipt-profile'

/** A document gets this many attempts in all. */
export const MAX_LIVE_ATTEMPTS = 3

/** Thrown by an executor when its request timed out. Any other throw is a provider failure. */
export class LiveModelTimeout extends Error {
  constructor() {
    super('live_model_timeout')
  }
}

export interface LiveExecutor {
  readonly identity: LiveExecutorIdentity
  readonly callModel: ReceiptModelCaller
}

type LiveReading =
  | { status: 'examined'; observations: ProfileObservation[]; limitations: LiveLimitation[]; usage: ExaminationUsage }
  | { status: 'could_not_examine'; reason: LiveFailureReason | 'model_error'; usage: ExaminationUsage }

/** The model-read side of a profile. Kept apart from `ExaminationProfile`, whose interface cannot reach a model. */
export interface LiveExaminationProfile {
  readonly ref: ProfileRef
  readonly media_types: readonly EvidenceMediaType[]
  read(bytes: Uint8Array, callModel: ReceiptModelCaller): Promise<LiveReading>
}

export const RECEIPT_LIVE_PROFILE: LiveExaminationProfile = {
  ref: { id: RECEIPT_PROFILE_ID, version: RECEIPT_PROFILE_VERSION, schema: RECEIPT_EXTRACTION_SCHEMA_VERSION, prompt: RECEIPT_PROMPT_VERSION },
  media_types: ['application/pdf', 'image/png', 'image/jpeg'],
  async read(bytes, callModel) {
    const outcome = await examineReceiptDocument(bytes, { callModel })
    if (outcome.status !== 'examined') return { status: 'could_not_examine', reason: outcome.reason, usage: outcome.usage }
    return { status: 'examined', observations: receiptObservations(outcome.extraction), limitations: receiptLimitations(outcome.extraction) as LiveLimitation[], usage: outcome.usage }
  },
}

export interface LiveDocumentSource {
  get(documentId: string): Promise<ExaminationDocumentRecord | null>
  readBytes(record: ExaminationDocumentRecord): Promise<Uint8Array | null>
}

export interface LiveExaminationDeps {
  documents: LiveDocumentSource
  isKnownSyntheticFixture(sha256: string): boolean
  executor: LiveExecutor
  profiles: ReadonlyMap<string, LiveExaminationProfile>
  /** `liveExtractionEnabled()`. Required, with the code lock, for `live_model`. A mock never reaches a provider. */
  livePermitted: boolean
  now(): Date
}

export const LIVE_REFUSALS = [
  'invalid_request',
  'profile_not_registered',
  'executor_not_permitted',
  'live_examination_disabled',
  'document_not_found',
  'document_not_stored',
  'not_owner',
  'object_unavailable',
  'integrity_mismatch',
  'media_type_not_supported',
  'mock_requires_known_fixture',
  'live_refuses_known_fixture',
] as const
export type LiveRefusalCode = (typeof LIVE_REFUSALS)[number]
export type LiveExamination = { kind: 'envelope'; envelope: LiveEnvelope } | { kind: 'refused'; code: LiveRefusalCode }

const refuse = (code: LiveRefusalCode): LiveExamination => ({ kind: 'refused', code })

/** No model is called until every check before it has passed. A refusal means no examination ran, so no envelope exists. */
export async function runLiveExamination(deps: LiveExaminationDeps, rawRequest: unknown): Promise<LiveExamination> {
  const request = parseExaminationRequest(rawRequest)
  if (!request) return refuse('invalid_request')
  const profile = deps.profiles.get(profileKey(request.profile))
  if (!profile) return refuse('profile_not_registered')

  const executor = deps.executor.identity
  if (executor.mode !== 'live_model' && executor.mode !== 'mock_test') return refuse('executor_not_permitted')
  if (!(LIVE_ORIGIN_RULES[executor.mode].providers as readonly string[]).includes(executor.provider)) return refuse('executor_not_permitted')
  if (executor.mode === 'live_model' && (LIVE_EXTRACTION_PERMITTED_IN_THIS_BUILD !== true || deps.livePermitted !== true)) return refuse('live_examination_disabled')

  const record = await deps.documents.get(request.document_id)
  if (!record || record.id !== request.document_id) return refuse('document_not_found')
  if (record.state !== 'stored') return refuse('document_not_stored')
  if (record.user_id !== request.actor_user_id) return refuse('not_owner')

  const bytes = await deps.documents.readBytes(record)
  if (!bytes) return refuse('object_unavailable')
  const sha256 = sha256Bytes(bytes)
  if (sha256 !== record.sha256 || bytes.length !== record.byte_size || sniffMediaType(bytes) !== record.media_type) return refuse('integrity_mismatch')
  if (!profile.media_types.includes(record.media_type)) return refuse('media_type_not_supported')

  const fixture = deps.isKnownSyntheticFixture(sha256)
  if (executor.mode === 'mock_test' && !fixture) return refuse('mock_requires_known_fixture')
  if (executor.mode === 'live_model' && fixture) return refuse('live_refuses_known_fixture')

  let thrown: 'model_timeout' | 'provider_failure' = 'provider_failure'
  let responseId: string | null = null
  const callModel: ReceiptModelCaller = async (req) => {
    try {
      const response = await deps.executor.callModel(req)
      responseId = typeof response.id === 'string' && response.id !== '' ? response.id : null
      return response
    } catch (err) {
      if (err instanceof LiveModelTimeout) thrown = 'model_timeout'
      throw err
    }
  }
  const reading = await profile.read(bytes, callModel)

  const rules = LIVE_ORIGIN_RULES[executor.mode]
  const identity: LiveExecutorIdentity = { mode: executor.mode, provider: executor.provider, model: executor.model }
  const examination_key = liveExaminationKey({ document_id: record.id, sha256, profile: { ...profile.ref }, executor: identity })
  const prefix = examination_key.slice(0, 16)
  const counters = new Map<string, number>()
  const observations =
    reading.status === 'examined'
      ? reading.observations.map((o) => {
          const i = counters.get(o.field) ?? 0
          counters.set(o.field, i + 1)
          return { observation_id: `${prefix}:${o.field}:${i}`, ...o, source: { document_sha256: sha256, location: null }, verification: 'not_verified' as const, origin: rules.observation_origin }
        })
      : []
  const limitations = Array.from(new Set<LiveLimitation>([...(executor.mode === 'mock_test' ? (['mock_test_data_not_model_output'] as const) : []), 'observations_not_verified', ...(reading.status === 'examined' ? reading.limitations : [])]))

  const envelope = {
    envelope: { ...LIVE_EXAMINATION_ENVELOPE },
    examination_key,
    identity: 'execution_key',
    execution_origin: executor.mode,
    executed_at: deps.now().toISOString(),
    document: { document_id: record.id, sha256, media_type: record.media_type, byte_size: record.byte_size },
    content_class: rules.content_class,
    workflow_authorization: 'not_established',
    profile: { ...profile.ref },
    executor: identity,
    outcome: reading.status === 'examined' ? { status: 'examined', reason: null } : { status: 'could_not_examine', reason: reading.reason === 'model_error' ? thrown : reading.reason },
    observations,
    limitations,
    provenance: { integrity: 'sha256_size_and_type_rechecked', model_calls: reading.usage.attempts, prompt_sent: reading.usage.attempts > 0, input_tokens: reading.usage.input_tokens, output_tokens: reading.usage.output_tokens, provider_response_id: responseId },
  }
  // What was assembled must itself be a valid envelope, or nothing leaves here (an executor that names no response id, for one).
  const checked = parseLiveEnvelope(envelope)
  if (!checked) return { kind: 'envelope', envelope: failedInstead(envelope) }
  return { kind: 'envelope', envelope: checked }
}

/** An output that cannot be represented truthfully is a provider failure, never a reading. */
function failedInstead(envelope: Record<string, unknown> & { provenance: Record<string, unknown>; limitations: LiveLimitation[] }): LiveEnvelope {
  const out = {
    ...envelope,
    outcome: { status: 'could_not_examine', reason: 'provider_failure' },
    observations: [],
    limitations: envelope.limitations.filter((l) => l === 'mock_test_data_not_model_output' || l === 'observations_not_verified'),
    provenance: { ...envelope.provenance, provider_response_id: null },
  }
  const checked = parseLiveEnvelope(out)
  if (!checked) throw new Error('creator_record_live_envelope_unrepresentable')
  return checked
}

// ── Storing it ──────────────────────────────────────────────────────────────────────────────────────

export interface LiveAttemptRow {
  id: string
  attempt_number: number
  examination_key: string
  document_id: string
  user_id: string
  document_sha256: string
  envelope_version: number
  execution_origin: string
  content_class: string
  profile_id: string
  profile_version: number
  schema_version: string
  prompt_version: string
  executor_mode: string
  provider: string
  model: string
  outcome_status: string
  outcome_reason: string | null
  executed_at: string
  envelope_canonical: string
  envelope_sha256: string
  access_log_id: number
  created_at: string
}

export const LIVE_DATABASE_REFUSALS: Readonly<Record<string, string>> = {
  examination_environment_not_authorized: 'environment_not_authorized',
  'examination reads are not authorized in this environment': 'environment_not_authorized',
  live_examination_not_authorized: 'live_not_authorized',
  live_examination_envelope_invalid: 'envelope_invalid',
  live_examination_key_mismatch: 'key_mismatch',
  live_examination_access_not_logged: 'access_not_logged',
  live_examination_document_mismatch: 'document_mismatch',
  live_examination_content_not_recognized: 'content_not_recognized',
  live_examination_conflict: 'conflict',
  live_examination_attempts_exhausted: 'attempts_exhausted',
  live_examination_not_retryable: 'not_retryable',
}

export interface LiveStoragePorts {
  getDocument(documentId: string): Promise<ExaminationDocumentRecord | null>
  logExaminationRead(documentId: string, ownerUserId: string): Promise<number>
  readObject(record: ExaminationDocumentRecord): Promise<Uint8Array | null>
  /** The database's one write function. Throws `LivePortError` with a fixed refusal, or a null one when unavailable. */
  recordLiveAttempt(accessLogId: number, envelopeCanonical: string): Promise<{ attempt_id: string; result: 'created' | 'existing' }>
  listLiveAttempts(ownerUserId: string, documentId: string, profileId: string): Promise<LiveAttemptRow[]>
}

export class LivePortError extends Error {
  constructor(readonly op: 'log_read' | 'record', readonly refusal: string | null) {
    super(`creator_record_live_examination_${op}_${refusal ?? 'unavailable'}`)
  }
}

export interface LiveAdapterDeps {
  storage: LiveStoragePorts
  core: Omit<LiveExaminationDeps, 'documents'>
}

export type LiveRecordResult =
  /** The stored reading. `model_called` is false when an earlier attempt already holds it. */
  | { kind: 'examined'; attempt_id: string; envelope: LiveEnvelope; model_called: boolean }
  /** This attempt failed and is stored. The reading does not exist. `retryable` says whether another attempt may run. */
  | { kind: 'failed'; attempt_id: string; reason: LiveFailureReason; retryable: boolean }
  | { kind: 'attempts_exhausted' }
  | { kind: 'not_retryable'; reason: LiveFailureReason }
  | { kind: 'refused'; code: LiveRefusalCode; read_logged: boolean }
  /** The read could not be logged, so the bytes were not read and no model was called. */
  | { kind: 'not_read'; reason: string }
  /** Stored attempts did not verify, or could not be read. Nothing ran. */
  | { kind: 'unavailable'; reason: 'storage_unavailable' | 'attempt_integrity' }
  /** An examination ran, and the database did not store it. The result is discarded: nothing unstored is ever returned as a reading. */
  | { kind: 'not_recorded'; reason: string }

/** Every check a stored attempt must pass. Null when it passes, otherwise the failing check. */
export function verifyLiveAttemptRow(row: LiveAttemptRow, ownerUserId: string, documentId: string): string | null {
  const t = row.envelope_canonical
  if (typeof t !== 'string' || sha256Hex(t) !== row.envelope_sha256) return 'envelope_digest'
  let raw: unknown
  try {
    raw = JSON.parse(t)
  } catch {
    return 'envelope_json'
  }
  const e = parseLiveEnvelope(raw)
  if (!e) return 'envelope_parser'
  if (canonicalJson(e) !== t) return 'envelope_canonical_form'
  const expect: [string, unknown, unknown][] = [
    ['examination_key', row.examination_key, e.examination_key],
    ['document_id', row.document_id, documentId],
    ['envelope_document_id', e.document.document_id, documentId],
    ['user_id', row.user_id, ownerUserId],
    ['document_sha256', row.document_sha256, e.document.sha256],
    ['envelope_version', row.envelope_version, e.envelope.version],
    ['execution_origin', row.execution_origin, e.execution_origin],
    ['content_class', row.content_class, e.content_class],
    ['profile_id', row.profile_id, e.profile.id],
    ['profile_version', row.profile_version, e.profile.version],
    ['schema_version', row.schema_version, e.profile.schema],
    ['prompt_version', row.prompt_version, e.profile.prompt],
    ['executor_mode', row.executor_mode, e.executor.mode],
    ['provider', row.provider, e.executor.provider],
    ['model', row.model, e.executor.model],
    ['outcome_status', row.outcome_status, e.outcome.status],
    ['outcome_reason', row.outcome_reason, e.outcome.reason],
    ['executed_at', row.executed_at, e.executed_at],
  ]
  for (const [name, a, b] of expect) if (a !== b) return name
  return null
}

type Attempts = { ok: true; rows: { row: LiveAttemptRow; envelope: LiveEnvelope }[] } | { ok: false; reason: 'storage_unavailable' | 'attempt_integrity' }

async function verifiedAttempts(storage: LiveStoragePorts, owner: string, documentId: string, profileId: string): Promise<Attempts> {
  let rows: LiveAttemptRow[]
  try {
    rows = await storage.listLiveAttempts(owner, documentId, profileId)
  } catch {
    return { ok: false, reason: 'storage_unavailable' }
  }
  const out: { row: LiveAttemptRow; envelope: LiveEnvelope }[] = []
  for (const row of rows) {
    if (verifyLiveAttemptRow(row, owner, documentId) !== null) return { ok: false, reason: 'attempt_integrity' }
    out.push({ row, envelope: JSON.parse(row.envelope_canonical) as LiveEnvelope })
  }
  // More than one reading is a contradiction the database forbids. Never choose between them.
  if (out.filter((a) => a.envelope.outcome.status === 'examined').length > 1) return { ok: false, reason: 'attempt_integrity' }
  return { ok: true, rows: out }
}

export async function examineLiveAndRecord(deps: LiveAdapterDeps, rawRequest: unknown): Promise<LiveRecordResult> {
  const request = parseExaminationRequest(rawRequest)
  if (!request) return { kind: 'refused', code: 'invalid_request', read_logged: false }
  const owner = request.actor_user_id
  const documentId = request.document_id

  const before = await verifiedAttempts(deps.storage, owner, documentId, request.profile.id)
  if (!before.ok) return { kind: 'unavailable', reason: before.reason }
  const held = before.rows.find((a) => a.envelope.outcome.status === 'examined')
  if (held) return { kind: 'examined', attempt_id: held.row.id, envelope: held.envelope, model_called: false }
  for (const a of before.rows) {
    const reason = a.envelope.outcome.reason as LiveFailureReason
    if (!LIVE_RETRYABLE_REASONS.includes(reason)) return { kind: 'not_retryable', reason }
  }
  if (before.rows.length >= MAX_LIVE_ATTEMPTS) return { kind: 'attempts_exhausted' }

  let accessLogId: number | null = null
  let notRead: string | null = null
  const documents: LiveDocumentSource = {
    get: (id) => deps.storage.getDocument(id),
    async readBytes(record) {
      // Reached only after the request, the document state and the owner were accepted. Audit first.
      try {
        accessLogId = await deps.storage.logExaminationRead(record.id, owner)
      } catch (e) {
        notRead = e instanceof LivePortError && e.refusal ? e.refusal : 'audit_unavailable'
        return null
      }
      return deps.storage.readObject(record)
    },
  }
  const run = await runLiveExamination({ ...deps.core, documents }, rawRequest)
  if (notRead) return { kind: 'not_read', reason: notRead }
  if (run.kind === 'refused') return { kind: 'refused', code: run.code, read_logged: accessLogId !== null }
  if (accessLogId === null) return { kind: 'not_recorded', reason: 'access_not_logged' }

  try {
    const saved = await deps.storage.recordLiveAttempt(accessLogId, canonicalJson(run.envelope))
    const outcome = run.envelope.outcome
    if (outcome.status === 'examined') return { kind: 'examined', attempt_id: saved.attempt_id, envelope: run.envelope, model_called: true }
    return { kind: 'failed', attempt_id: saved.attempt_id, reason: outcome.reason, retryable: LIVE_RETRYABLE_REASONS.includes(outcome.reason) && before.rows.length + 1 < MAX_LIVE_ATTEMPTS }
  } catch (e) {
    const refusal = e instanceof LivePortError ? e.refusal : null
    if (refusal === 'conflict') {
      // Another attempt was stored first. Its reading stands; this one is dropped.
      const after = await verifiedAttempts(deps.storage, owner, documentId, request.profile.id)
      const winner = after.ok ? after.rows.find((a) => a.envelope.outcome.status === 'examined') : undefined
      if (winner) return { kind: 'examined', attempt_id: winner.row.id, envelope: winner.envelope, model_called: true }
    }
    return { kind: 'not_recorded', reason: refusal ?? 'persistence_unavailable' }
  }
}
