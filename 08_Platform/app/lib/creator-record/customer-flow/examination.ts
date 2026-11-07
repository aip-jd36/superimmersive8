/**
 * CR-V2-EXAM-INTEGRATION-X2 — a creator's examination of ONE of their own stored documents, and its history.
 *
 * Pure apart from the injected ports. Reuses, unchanged: the examination persistence adapter (`examineAndRecord`:
 * the DOC-2B core, replay only; audit event before any byte is read; the database's one write function) and the
 * strict read-back (`readExaminationHistory`: every stored run re-verified, fail closed).
 *
 * Boundaries, in order (each fails closed with a fixed code; nothing internal is returned):
 *   1. the session user (the route) — never a value from the request;
 *   2. the Creator Record v2 submissions stop and the pilot invitation (exactly the evidence-intake gate);
 *   3. the document is the creator's own (another creator's document is indistinguishable from a missing one);
 *   4. the DATABASE decides whether examination is permitted at all: an examination read is accepted only under the
 *      isolated-test marker or an active UAT grant naming this identity and this document (20261105000000 /
 *      20261106000000). With neither — Production today — it is refused and nothing is read.
 * The request carries nothing but the document id: no grant, nonce, envelope, profile, executor or credential is
 * accepted from the browser. Replay only: the production core ports are the committed replay executor and registry.
 *
 * History shows only runs this path can produce (isolated synthetic test, customer-path synthetic UAT). A history
 * containing an operator-seeded run (`operator_synthetic_uat`) is not shown here (unavailable, fail closed): those
 * belong to the operator UAT record, never to a customer view.
 *
 * Examination observations stay observations (`not_verified`): nothing here reaches declarations, guidance, records
 * or PDFs.
 */

import {
  examineAndRecord,
  readExaminationHistory,
  type ExaminationAdapterDeps,
  type PersistedRunRow,
  type VerifiedRun,
} from '../examination/persistence'
import { RECEIPT_READING_PROFILE } from '../examination/receipt-reading'
import { projectVerifiedRun, verifyReferencedRuns, type ExaminationProjection as ReplayExaminationProjection, type ExaminationRunReference, type RunReferenceIntegrity } from '../examination/projection'
import type { CustomerLiveResult } from '../live-examination/customer'
import { verifyLiveAttemptRow } from '../live-examination/examine'
import { liveProjectionOfVerifiedAttempt, type CustomerLiveAttemptRow, type LiveExaminationProjection } from '../live-examination/projection'

/** Either kind of bounded projection a record may carry (replay run or customer live attempt). */
type ExaminationProjection = ReplayExaminationProjection | LiveExaminationProjection

export type SubmissionsMode = 'open' | 'stopped'

export interface CustomerExaminationDeps {
  /** CREATOR_RECORD_V2_SUBMISSIONS. */
  submissions: SubmissionsMode
  hasPilotAccess(userId: string): Promise<boolean>
  /** The persistence adapter's ports (production: replay-only core). */
  adapter: ExaminationAdapterDeps
  log?(event: string, detail: Record<string, unknown>): void
  /**
   * Supplied only by the admin UAT wiring: the exception to the submissions stop. Examination authority itself stays
   * with the database.
   */
  syntheticUat?: { admits(userId: string, now: Date): boolean }
  now?(): Date
  /** The boundaries this path may read. Defaults to the customer list; only the admin UAT wiring sets it. */
  visibleBoundaries?: readonly string[]
  /**
   * CR-V2-MVP-M2A: the customer live examination (`../live-examination/customer`). Supplied by the production wiring only while both
   * code locks are true; absent, this path is the replay path exactly as before. The database still decides each step.
   */
  live?: { examine(userId: string, documentId: string): Promise<CustomerLiveResult> }
  /**
   * CR-V2-MVP-LAUNCH-FOUNDATION-1 (Decision 8Q): the creator's separate permission for AI examination, recorded for the one document
   * before any live examination (`creator_record_v2_grant_ai_examination_permission`). Required whenever `live` is present: a live
   * examination without it is refused here and, independently, by the database. `grant` throws `AiPermissionRefusal` for a fixed
   * refusal and any other error when unavailable.
   */
  aiPermission?: { version: string; grant(userId: string, documentId: string, version: string): Promise<'granted' | 'existing'> }
}

export type AiPermissionRefusalCode = 'withdrawn' | 'not_found' | 'invalid'

/** The database refused to record an AI-examination permission. */
export class AiPermissionRefusal extends Error {
  constructor(readonly code: AiPermissionRefusalCode) {
    super(`creator_record_ai_permission_${code}`)
  }
}

export type CustomerExaminationErrorCode =
  | 'submissions_stopped'
  | 'not_invited'
  | 'not_found'
  | 'not_ready'
  | 'not_examinable'
  | 'examination_not_permitted'
  | 'examination_limit_reached'
  | 'unavailable'
  | 'ai_permission_required'

export type CustomerExaminationError = { ok: false; status: 400 | 403 | 404 | 409 | 422 | 429 | 503; code: CustomerExaminationErrorCode }

export interface CustomerExaminationRun {
  run_id: string
  supersedes_id: string | null
  created_at: string
  /** The persisted envelope, verbatim, after the strict read-back. Observations are `not_verified`. */
  envelope: VerifiedRun['envelope']
}

/** Only these boundaries may appear in a customer's history. */
export const CUSTOMER_VISIBLE_BOUNDARIES = ['isolated_synthetic_test', 'customer_path_synthetic_uat'] as const

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
const err = (status: CustomerExaminationError['status'], code: CustomerExaminationErrorCode): CustomerExaminationError => ({ ok: false, status, code })

async function gate(deps: CustomerExaminationDeps, userId: string): Promise<CustomerExaminationError | null> {
  const uat = deps.syntheticUat !== undefined && deps.syntheticUat.admits(userId, deps.now ? deps.now() : new Date())
  if (deps.submissions !== 'open' && !uat) return err(503, 'submissions_stopped')
  if (!(await deps.hasPilotAccess(userId))) return err(403, 'not_invited')
  return null
}

/** The gate alone, for a route to apply before reading anything else from the request. */
export const checkCustomerExaminationGate = gate

/** The document exists and is the creator's own; otherwise `not_found` (another creator's document looks missing). */
async function owned(deps: CustomerExaminationDeps, userId: string, documentId: unknown): Promise<{ ok: true; state: string } | CustomerExaminationError> {
  if (typeof documentId !== 'string' || !UUID.test(documentId)) return err(404, 'not_found')
  let doc
  try {
    doc = await deps.adapter.storage.getDocument(documentId)
  } catch {
    return err(503, 'unavailable')
  }
  if (!doc || doc.user_id !== userId) return err(404, 'not_found')
  return { ok: true, state: doc.state }
}

/** Request one examination of the creator's own stored document. Idempotent: the same document and profile converge. */
export async function requestCustomerExamination(
  deps: CustomerExaminationDeps,
  userId: string,
  documentId: unknown,
  options: { aiPermission?: string | null } = {},
): Promise<{ ok: true; run_id: string; result: 'created' | 'existing' } | CustomerExaminationError> {
  const gated = await gate(deps, userId)
  if (gated) return gated
  const doc = await owned(deps, userId, documentId)
  if (!doc.ok) return doc
  if (doc.state !== 'stored') return err(409, 'not_ready')
  if (deps.live) {
    // Decision 8Q: no AI examination without the creator's explicit permission for THIS document, recorded first. A withdrawal
    // covering the document makes the grant impossible (the database refuses it), so a withdrawn permission is never re-granted.
    if (!deps.aiPermission) return err(503, 'unavailable')
    if (options.aiPermission !== deps.aiPermission.version) return err(400, 'ai_permission_required')
    try {
      await deps.aiPermission.grant(userId, documentId as string, options.aiPermission)
    } catch (e) {
      if (!(e instanceof AiPermissionRefusal)) return err(503, 'unavailable')
      deps.log?.('creator_record_v2_ai_permission_refused', { code: e.code })
      if (e.code === 'withdrawn') return err(409, 'examination_not_permitted')
      if (e.code === 'not_found') return err(404, 'not_found')
      return err(400, 'ai_permission_required')
    }
    return liveOutcome(deps, await deps.live.examine(userId, documentId as string))
  }

  const r = await examineAndRecord(deps.adapter, {
    actor_user_id: userId,
    document_id: documentId as string,
    profile: { id: RECEIPT_READING_PROFILE.id, version: RECEIPT_READING_PROFILE.version },
  })
  switch (r.kind) {
    case 'recorded':
      return { ok: true, run_id: r.run_id, result: r.result }
    case 'refused':
      deps.log?.('creator_record_v2_examination_refused', { stage: r.refusal.stage, code: r.refusal.code })
      // The core's own request / owner checks: never reveal which.
      if (r.refusal.stage === 'request' || r.refusal.code === 'not_owner' || r.refusal.code === 'document_not_found') return err(404, 'not_found')
      if (r.refusal.code === 'document_not_stored') return err(409, 'not_ready')
      // Server-side configuration or storage (profile, executor, object): not the creator's document.
      if (r.refusal.stage === 'profile' || r.refusal.stage === 'executor' || r.refusal.code === 'object_unavailable') return err(503, 'unavailable')
      // Integrity or content (not a known synthetic fixture, no recording, unsupported type).
      return err(422, 'not_examinable')
    case 'not_read':
      deps.log?.('creator_record_v2_examination_not_read', { reason: r.reason })
      return r.reason === 'audit_unavailable' ? err(503, 'unavailable') : err(409, 'examination_not_permitted')
    case 'unavailable':
      deps.log?.('creator_record_v2_examination_unavailable', { stage: r.stage })
      return err(503, 'unavailable')
    case 'not_recorded':
      deps.log?.('creator_record_v2_examination_not_recorded', { reason: r.reason })
      return r.reason === 'persistence_unavailable' ? err(503, 'unavailable') : err(409, 'examination_not_permitted')
  }
}

/** CR-V2-MVP-M2A: a live attempt's outcome as the route's fixed codes. Nothing internal is returned; the detail is logged by code only. */
const LIMIT_REFUSALS = ['daily_limit', 'spend_limit', 'attempts_exhausted', 'in_progress']
function liveOutcome(deps: CustomerExaminationDeps, live: CustomerLiveResult): { ok: true; run_id: string; result: 'created' | 'existing' } | CustomerExaminationError {
  const r = live.result
  if (r.kind !== 'examined') deps.log?.('creator_record_v2_live_examination_outcome', { kind: r.kind, code: 'code' in r ? r.code : 'reason' in r ? r.reason : null, reservation_refusal: live.reservation_refusal, settlement: live.settlement.status })
  switch (r.kind) {
    case 'examined':
      return { ok: true, run_id: r.attempt_id, result: r.model_called ? 'created' : 'existing' }
    case 'failed':
      return r.retryable ? err(503, 'unavailable') : err(422, 'not_examinable')
    case 'attempts_exhausted':
    case 'not_retryable':
      return err(422, 'not_examinable')
    case 'disabled':
      return err(409, 'examination_not_permitted')
    case 'refused':
      if (r.code === 'invalid_request' || r.code === 'not_owner' || r.code === 'document_not_found') return err(404, 'not_found')
      if (r.code === 'document_not_stored') return err(409, 'not_ready')
      if (r.code === 'live_budget_exhausted') return live.reservation_refusal !== null && LIMIT_REFUSALS.includes(live.reservation_refusal) ? err(429, 'examination_limit_reached') : err(409, 'examination_not_permitted')
      if (r.code === 'live_examination_disabled' || r.code === 'profile_not_registered' || r.code === 'executor_not_permitted' || r.code === 'object_unavailable') return err(503, 'unavailable')
      return err(422, 'not_examinable')
    case 'not_read':
      return r.reason === 'audit_unavailable' ? err(503, 'unavailable') : err(409, 'examination_not_permitted')
    case 'unavailable':
      return err(503, 'unavailable')
    case 'not_recorded':
      return r.reason === 'persistence_unavailable' ? err(503, 'unavailable') : err(409, 'examination_not_permitted')
  }
}

/** The creator's own document's examination history, every run re-verified. */
export async function customerExaminationHistory(
  deps: CustomerExaminationDeps,
  userId: string,
  documentId: unknown,
): Promise<{ ok: true; runs: CustomerExaminationRun[] } | CustomerExaminationError> {
  const gated = await gate(deps, userId)
  if (gated) return gated
  const doc = await owned(deps, userId, documentId)
  if (!doc.ok) return doc

  const visible = {
    async listRuns(owner: string, id: string): Promise<PersistedRunRow[]> {
      const rows = await deps.adapter.storage.listRuns(owner, id)
      const allowed: readonly string[] = deps.visibleBoundaries ?? CUSTOMER_VISIBLE_BOUNDARIES
      if (rows.some((row) => !allowed.includes(row.execution_boundary))) throw new Error('boundary_not_customer_visible')
      return rows
    },
  }
  const h = await readExaminationHistory(visible, userId, documentId as string)
  if (h.kind !== 'verified') {
    deps.log?.('creator_record_v2_examination_history_unavailable', { reason: h.reason })
    return err(503, 'unavailable')
  }
  return { ok: true, runs: h.runs.map((r) => ({ run_id: r.run_id, supersedes_id: r.supersedes_id, created_at: r.created_at, envelope: r.envelope })) }
}

// ── CR-V2-EXAM-INTEGRATION-X3: the projection a prepared record may carry ───────────────────────────

export type DocumentProjection =
  | { kind: 'none' }
  | { kind: 'projection'; projection: ExaminationProjection }
  | { kind: 'unavailable'; reason: 'storage_unavailable' | 'boundary_not_customer_visible' | 'multiple_runs' | 'run_integrity' }

/**
 * The bounded projection (X0) of the creator's ONE persisted run for a document they own, re-checked byte for byte
 * (`projectVerifiedRun`: authority stamp, digest, strict parse, canonical form, key, owner, document). No run: `none`.
 * Fail closed on anything else: a run outside the customer-visible boundaries (an operator-seeded run), more than one
 * run (which one a record should carry is not decided), or any integrity failure. Never reads a grant.
 */
export async function examinationProjectionFor(
  storage: Pick<ExaminationAdapterDeps['storage'], 'listRuns'>,
  userId: string,
  documentId: string,
  visibleBoundaries: readonly string[] = CUSTOMER_VISIBLE_BOUNDARIES,
  /** CR-V2-MVP-M2A: the creator's stored live attempts. Absent: replay runs only, exactly as before. */
  live?: { listAttempts(ownerUserId: string, documentId: string): Promise<CustomerLiveAttemptRow[]> },
): Promise<DocumentProjection> {
  let rows: PersistedRunRow[]
  let attempts: CustomerLiveAttemptRow[] = []
  try {
    rows = await storage.listRuns(userId, documentId)
    if (live) attempts = await live.listAttempts(userId, documentId)
  } catch {
    return { kind: 'unavailable', reason: 'storage_unavailable' }
  }
  if (rows.some((row) => !visibleBoundaries.includes(row.execution_boundary))) return { kind: 'unavailable', reason: 'boundary_not_customer_visible' }
  // Live attempts: every stored attempt re-verified; the record carries the one reading, never a failed attempt.
  if (attempts.length > 0) {
    if (rows.length > 0) return { kind: 'unavailable', reason: 'multiple_runs' }
    if (attempts.some((a) => verifyLiveAttemptRow(a, userId, documentId) !== null)) return { kind: 'unavailable', reason: 'run_integrity' }
    const readings = attempts.filter((a) => a.outcome_status === 'examined')
    if (readings.length === 0) return { kind: 'none' }
    if (readings.length > 1) return { kind: 'unavailable', reason: 'multiple_runs' }
    // Every attempt passed `verifyLiveAttemptRow` above, for this owner and document.
    const p = liveProjectionOfVerifiedAttempt(readings[0])
    return p.ok ? { kind: 'projection', projection: p.projection } : { kind: 'unavailable', reason: 'run_integrity' }
  }
  if (rows.length === 0) return { kind: 'none' }
  if (rows.length > 1) return { kind: 'unavailable', reason: 'multiple_runs' }
  const p = projectVerifiedRun(rows[0], userId, documentId)
  return p.ok ? { kind: 'projection', projection: p.projection } : { kind: 'unavailable', reason: 'run_integrity' }
}

// ── CR-V2-MVP-M4A: the readings a record references, re-checked at checkout and at issuance ───────────────────────

/** A reading a record references, by kind (as `../customer-flow/purchase` builds it from the verified record). */
export type ReferencedReading = ExaminationRunReference & { kind: 'replay' | 'live'; profile_id: string }

export interface ReferencedReadingPorts {
  listRuns(ownerUserId: string, documentId: string): Promise<PersistedRunRow[]>
  /** The creator's stored live attempts. Absent: a model reading cannot be re-checked here, so it is refused (`unavailable`). */
  listLiveAttempts?(ownerUserId: string, documentId: string, profileId: string): Promise<CustomerLiveAttemptRow[]>
}

/**
 * Every referenced reading still exists and still verifies exactly as the record captured it:
 *   - a replay run: `verifyReferencedRuns` (unchanged: stamp, digest, strict parse, key, owner, document);
 *   - a model reading: the stored attempt with that id, for this owner and document, passes `verifyLiveAttemptRow`, is still a
 *     reserved `live_model` reading (`liveProjectionOfVerifiedAttempt`) and has exactly the captured envelope digest.
 * Fail closed: any lookup failure is `unavailable`. Integrity only: nothing here reads or judges what a document shows.
 */
export async function verifyReferencedReadings(ports: ReferencedReadingPorts, ownerUserId: string, refs: readonly ReferencedReading[]): Promise<RunReferenceIntegrity> {
  for (const ref of refs) {
    if (ref.kind === 'replay') {
      const r = await verifyReferencedRuns(async (runId) => (await ports.listRuns(ownerUserId, ref.document_id)).find((row) => row.id === runId) ?? null, ownerUserId, [ref])
      if (!r.ok) return r
      continue
    }
    if (ref.kind !== 'live' || !ports.listLiveAttempts) return { ok: false, reason: 'unavailable' }
    let attempts: CustomerLiveAttemptRow[]
    try {
      attempts = await ports.listLiveAttempts(ownerUserId, ref.document_id, ref.profile_id)
    } catch {
      return { ok: false, reason: 'unavailable' }
    }
    const row = attempts.find((a) => a.id === ref.run_id)
    if (!row) return { ok: false, reason: 'run_missing' }
    if (row.document_id !== ref.document_id || row.envelope_sha256 !== ref.envelope_sha256) return { ok: false, reason: 'run_mismatch' }
    if (verifyLiveAttemptRow(row, ownerUserId, ref.document_id) !== null) return { ok: false, reason: 'run_integrity' }
    const p = liveProjectionOfVerifiedAttempt(row)
    if (!p.ok || p.projection.envelope_sha256 !== ref.envelope_sha256) return { ok: false, reason: 'run_integrity' }
  }
  return { ok: true }
}
