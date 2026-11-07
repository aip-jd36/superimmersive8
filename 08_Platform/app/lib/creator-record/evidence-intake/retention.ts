/**
 * CR-V2-MVP-RETENTION-M1A — original-document retention: deletion requests, consent withdrawal, administrative holds and the
 * scheduled retention sweep.
 *
 * PURE apart from the injected ports (unit-tested with fakes). The database decides every transition (20261111000000); this module
 * validates input, maps refusals to fixed codes, removes objects through the existing evidence object port and reports.
 *
 * Provisional product policy (not Production authorization): originals expire 90 days after upload; an unfinished paid order extends
 * that by at most 14 days, after which automated issuance stops and a refund / manual resolution is required; physical removal within
 * 7 days of the applicable expiry; holds of at most 30 days by a named admin with explicit, audited renewal; a hold never silently
 * defeats a deletion request; consent withdrawal stops every new examination of documents uploaded under it.
 *
 * Deletion requests and consent withdrawal are deliberately NOT behind the submissions stop or the pilot invitation: a creator can
 * always ask for their own documents to be deleted, or withdraw consent. Responses carry fixed codes only (no customer wording here:
 * none is approved).
 */

import { cleanupEvidence, type EvidenceObjects, type EvidenceStore } from './service'

export const RETENTION_ORIGINAL_DAYS = 90
export const RETENTION_PAID_ORDER_EXTENSION_DAYS = 14
export const RETENTION_REMOVAL_WINDOW_DAYS = 7
export const RETENTION_HOLD_MAX_DAYS = 30
export const RETENTION_SWEEP_LIMIT = 200

/** The database's fixed refusals (P0001 message) → this module's codes. */
export const RETENTION_DATABASE_REFUSALS: Readonly<Record<string, RetentionRefusalCode>> = {
  creator_record_v2_retention_not_found: 'not_found',
  creator_record_v2_retention_not_authorized: 'not_authorized',
  creator_record_v2_hold_invalid: 'invalid_request',
  creator_record_v2_retention_invalid: 'invalid_request',
  creator_record_v2_hold_conflicts_with_deletion_request: 'deletion_request_open',
  creator_record_v2_hold_already_active: 'hold_already_active',
  creator_record_v2_hold_not_renewable: 'hold_not_renewable',
}

export type RetentionRefusalCode = 'not_found' | 'not_authorized' | 'invalid_request' | 'deletion_request_open' | 'hold_already_active' | 'hold_not_renewable'

/** Thrown by a port when the database refused with a known code; any other failure is a plain error (unavailable). */
export class RetentionRefusal extends Error {
  constructor(readonly code: RetentionRefusalCode) {
    super(`creator_record_retention_${code}`)
  }
}

export interface DeletionRequestState {
  request_id: string
  status: 'open' | 'completed'
  awaiting: 'administrative_hold' | 'paid_order_in_progress' | null
  resolution: 'deleted' | 'already_deleted' | null
}

export interface RetentionApplyReport {
  deletion_requests: { deleted: number; already_deleted: number; awaiting_resolution: number }
  expired: number
  extended: number
  held: number
  issuance_stopped: number
}

export interface RetentionStatusReport {
  overdue_expiry: number
  removal_pending: number
  overdue_removal: number
  open_deletion_requests: number
  deletion_requests_awaiting_hold: number
  active_holds: number
  manual_resolution_open: number
}

export interface RetentionPorts {
  requestDeletion(userId: string, documentId: string): Promise<DeletionRequestState>
  withdrawConsent(userId: string): Promise<{ withdrawal_id: number; withdrawn_at: string; result: 'created' | 'existing' }>
  placeHold(documentId: string, adminUserId: string, reason: string, days: number): Promise<string>
  renewHold(holdId: string, adminUserId: string, reason: string, days: number): Promise<string>
  releaseHold(holdId: string, adminUserId: string, reason: string): Promise<'released' | 'not_active'>
  apply(limit: number): Promise<RetentionApplyReport>
  status(): Promise<RetentionStatusReport>
}

export interface RetentionDeps {
  retention: RetentionPorts
  store: EvidenceStore
  objects: EvidenceObjects
  now(): Date
  log?(event: string, detail: Record<string, unknown>): void
}

export type RetentionError =
  | { ok: false; status: 400; code: 'invalid_request' }
  | { ok: false; status: 403; code: 'not_authorized' }
  | { ok: false; status: 404; code: 'not_found' }
  | { ok: false; status: 409; code: 'deletion_request_open' | 'hold_already_active' | 'hold_not_renewable' }
  | { ok: false; status: 503; code: 'unavailable' }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
const STATUS_OF: Record<RetentionRefusalCode, RetentionError['status']> = {
  not_found: 404, not_authorized: 403, invalid_request: 400, deletion_request_open: 409, hold_already_active: 409, hold_not_renewable: 409,
}
const refused = (code: RetentionRefusalCode): RetentionError => ({ ok: false, status: STATUS_OF[code], code }) as RetentionError
const unavailable: RetentionError = { ok: false, status: 503, code: 'unavailable' }
const failure = (e: unknown): RetentionError => (e instanceof RetentionRefusal ? refused(e.code) : unavailable)

/**
 * The creator asks for one of their own documents to be deleted. Completed at once unless an administrative hold or an unfinished
 * paid order stands in the way, when the request stays open with that reason (the scheduled sweep completes it). When the document
 * was deleted now, its object is removed here; a failed removal is retried by the sweep.
 */
export async function requestEvidenceDeletion(deps: RetentionDeps, userId: string, documentId: unknown): Promise<{ ok: true; request: Omit<DeletionRequestState, 'request_id'> } | RetentionError> {
  if (typeof documentId !== 'string' || !UUID.test(documentId)) return refused('not_found')
  let state: DeletionRequestState
  try {
    state = await deps.retention.requestDeletion(userId, documentId)
  } catch (e) {
    return failure(e)
  }
  if (state.resolution === 'deleted') await removeObjectNow(deps, documentId)
  return { ok: true, request: { status: state.status, awaiting: state.awaiting, resolution: state.resolution } }
}

async function removeObjectNow(deps: RetentionDeps, documentId: string): Promise<void> {
  try {
    const row = await deps.store.get(documentId)
    if (!row || row.state !== 'deleted' || row.object_removed_at) return
    await deps.objects.remove(row.storage_path)
    await deps.store.markObjectRemoved(row.id, deps.now())
  } catch {
    deps.log?.('creator_record_evidence_object_removal_deferred', { document_id: documentId })
  }
}

/** The creator withdraws consent: no further AI examination of any document uploaded under it. Idempotent. */
export async function withdrawEvidenceConsent(deps: Pick<RetentionDeps, 'retention'>, userId: string): Promise<{ ok: true; result: 'created' | 'existing'; withdrawn_at: string } | RetentionError> {
  try {
    const w = await deps.retention.withdrawConsent(userId)
    return { ok: true, result: w.result, withdrawn_at: w.withdrawn_at }
  } catch (e) {
    return failure(e)
  }
}

export type HoldAction =
  | { action: 'place'; document_id: string; reason: string; days: number }
  | { action: 'renew'; hold_id: string; reason: string; days: number }
  | { action: 'release'; hold_id: string; reason: string }

/** Strict parse of an admin hold request: closed keys, ids, a 10–1000 character reason, 1–30 days. */
export function parseHoldAction(body: unknown): HoldAction | null {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null
  const b = body as Record<string, unknown>
  const reasonOk = typeof b.reason === 'string' && b.reason.trim().length >= 10 && b.reason.trim().length <= 1000
  const daysOk = Number.isInteger(b.days) && (b.days as number) >= 1 && (b.days as number) <= RETENTION_HOLD_MAX_DAYS
  const keys = Object.keys(b).sort().join(',')
  if (b.action === 'place' && keys === 'action,days,document_id,reason' && typeof b.document_id === 'string' && UUID.test(b.document_id) && reasonOk && daysOk)
    return { action: 'place', document_id: b.document_id, reason: (b.reason as string).trim(), days: b.days as number }
  if (b.action === 'renew' && keys === 'action,days,hold_id,reason' && typeof b.hold_id === 'string' && UUID.test(b.hold_id) && reasonOk && daysOk)
    return { action: 'renew', hold_id: b.hold_id, reason: (b.reason as string).trim(), days: b.days as number }
  if (b.action === 'release' && keys === 'action,hold_id,reason' && typeof b.hold_id === 'string' && UUID.test(b.hold_id) && reasonOk)
    return { action: 'release', hold_id: b.hold_id, reason: (b.reason as string).trim() }
  return null
}

/** A named admin places, renews or releases a hold. The database re-checks that the actor is an admin. */
export async function applyHoldAction(deps: Pick<RetentionDeps, 'retention'>, adminUserId: string, body: unknown): Promise<{ ok: true; hold_id: string; result: 'placed' | 'renewed' | 'released' | 'not_active' } | RetentionError> {
  const a = parseHoldAction(body)
  if (!a) return refused('invalid_request')
  try {
    if (a.action === 'place') return { ok: true, hold_id: await deps.retention.placeHold(a.document_id, adminUserId, a.reason, a.days), result: 'placed' }
    if (a.action === 'renew') return { ok: true, hold_id: await deps.retention.renewHold(a.hold_id, adminUserId, a.reason, a.days), result: 'renewed' }
    return { ok: true, hold_id: a.hold_id, result: await deps.retention.releaseHold(a.hold_id, adminUserId, a.reason) }
  } catch (e) {
    return failure(e)
  }
}

export type SweepProblem = 'apply_failed' | 'cleanup_failed' | 'object_removal_failed' | 'status_unavailable' | 'overdue_expiry' | 'overdue_removal'
export type SweepNotice = 'manual_resolution_required' | 'deletion_request_awaiting_hold'

export interface RetentionSweepReport {
  ok: boolean
  applied: RetentionApplyReport | null
  cleanup: { pending_removed: number; objects_removed: number; failures: number } | null
  status: RetentionStatusReport | null
  problems: SweepProblem[]
  notices: SweepNotice[]
}

/**
 * The scheduled sweep: (1) the database applies deletion requests, expiry, the paid-order extension and stops automated issuance where
 * an original is gone; (2) the existing cleanup removes objects of every deleted document (and stale pending uploads), each failure
 * retried next run; (3) the database reports what is overdue. Not ok (the scheduler fails loudly) on any failure or anything overdue.
 * An operator is alerted on every problem and on anything needing a decision (manual resolution, a request waiting on a hold).
 */
export async function runRetentionSweep(deps: RetentionDeps & { alert(subject: string, fields: Record<string, string | number>): Promise<void> }): Promise<RetentionSweepReport> {
  const problems: SweepProblem[] = []
  const notices: SweepNotice[] = []

  let applied: RetentionApplyReport | null = null
  try {
    applied = await deps.retention.apply(RETENTION_SWEEP_LIMIT)
  } catch {
    problems.push('apply_failed')
  }
  let cleanup: RetentionSweepReport['cleanup'] = null
  try {
    cleanup = await cleanupEvidence({ store: deps.store, objects: deps.objects, now: deps.now, log: deps.log })
    if (cleanup.failures > 0) problems.push('object_removal_failed')
  } catch {
    problems.push('cleanup_failed')
  }
  let status: RetentionStatusReport | null = null
  try {
    status = await deps.retention.status()
    if (status.overdue_expiry > 0) problems.push('overdue_expiry')
    if (status.overdue_removal > 0) problems.push('overdue_removal')
    if (status.manual_resolution_open > 0) notices.push('manual_resolution_required')
    if (status.deletion_requests_awaiting_hold > 0) notices.push('deletion_request_awaiting_hold')
  } catch {
    problems.push('status_unavailable')
  }
  if (applied && applied.issuance_stopped > 0 && !notices.includes('manual_resolution_required')) notices.push('manual_resolution_required')

  if (problems.length > 0 || notices.length > 0) {
    const fields: Record<string, string | number> = { problems: problems.join(', ') || 'none', notices: notices.join(', ') || 'none' }
    if (cleanup) fields.object_removal_failures = cleanup.failures
    if (status) {
      fields.overdue_expiry = status.overdue_expiry
      fields.overdue_removal = status.overdue_removal
      fields.manual_resolution_open = status.manual_resolution_open
      fields.deletion_requests_awaiting_hold = status.deletion_requests_awaiting_hold
    }
    await deps.alert(problems.length > 0 ? 'Creator Record retention sweep needs attention' : 'Creator Record retention decision needed', fields).catch(() => undefined)
  }
  return { ok: problems.length === 0, applied, cleanup, status, problems, notices }
}
