/**
 * CR-V2-MVP-M2A — the bounded projection of ONE stored customer live examination attempt: the only form in which a model reading may
 * appear in a Creator Record, and from there in its PDF. The counterpart of `../examination/projection` (replay), with the same keys,
 * so a record carries either kind the same way.
 *
 * Pure, and imports no engine, executor or port: a record reaches only this file. Contract:
 *   - SOURCE: made (by the customer examination service, `../customer-flow/examination`) only from a stored attempt that passes
 *     `verifyLiveAttemptRow`, is `live_model`, holds a reading (`examined`) and names its reservation. A mocked attempt, a failed attempt
 *     or anything unstored never becomes one.
 *   - CONTENT: the envelope verbatim. `run_id` is the attempt's id. `verification` is always `not_verified`: a reading is what a
 *     document appears to show, never a declaration, a fact, a finding or a clearance, and it never reaches guidance.
 *   - Self-verifying: `parseLiveExaminationProjection` re-parses the envelope strictly, recomputes its key and checks its digest.
 */

import { canonicalJson, sha256Hex } from '../record-core/canonical'
import { liveExaminationKey, parseLiveEnvelope, type LiveEnvelope } from './envelope'
import type { LiveAttemptRow } from './examine'

export const LIVE_EXAMINATION_PROJECTION = { id: 'si8/creator-record-v2-examination-projection', version: 2 } as const
export const CUSTOMER_LIVE_BOUNDARY = 'customer_live_examination' as const

export interface LiveExaminationProjection {
  projection: typeof LIVE_EXAMINATION_PROJECTION
  /** The stored attempt this projection was made from. */
  run_id: string
  envelope_sha256: string
  execution_boundary: typeof CUSTOMER_LIVE_BOUNDARY
  run_integrity: 'persisted_attempt_rechecked'
  verification: 'not_verified'
  envelope: LiveEnvelope
}

export type LiveProjectionResult = { ok: true; projection: LiveExaminationProjection } | { ok: false; reason: string }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
const HEX64 = /^[0-9a-f]{64}$/
const KEYS = ['projection', 'run_id', 'envelope_sha256', 'execution_boundary', 'run_integrity', 'verification', 'envelope'] as const

/** A stored attempt with its reservation, as the customer path reads it. */
export type CustomerLiveAttemptRow = LiveAttemptRow & { reservation_id: string | null }

/** The projection of a stored attempt that has ALREADY passed `verifyLiveAttemptRow` for this owner and document. */
export function liveProjectionOfVerifiedAttempt(row: CustomerLiveAttemptRow): LiveProjectionResult {
  if (!row || typeof row.id !== 'string' || !UUID.test(row.id)) return { ok: false, reason: 'attempt_id' }
  if (row.execution_origin !== 'live_model' || typeof row.reservation_id !== 'string' || !UUID.test(row.reservation_id)) return { ok: false, reason: 'not_a_customer_attempt' }
  const envelope = parseLiveEnvelope(JSON.parse(row.envelope_canonical))
  if (!envelope || envelope.execution_origin !== 'live_model') return { ok: false, reason: 'envelope_parser' }
  if (envelope.outcome.status !== 'examined') return { ok: false, reason: 'no_reading' }
  return {
    ok: true,
    projection: {
      projection: LIVE_EXAMINATION_PROJECTION,
      run_id: row.id,
      envelope_sha256: row.envelope_sha256,
      execution_boundary: CUSTOMER_LIVE_BOUNDARY,
      run_integrity: 'persisted_attempt_rechecked',
      verification: 'not_verified',
      envelope,
    },
  }
}

/** Strict, non-repairing parse of a stored live projection. Null on any unknown, missing or inconsistent field. */
export function parseLiveExaminationProjection(raw: unknown): LiveExaminationProjection | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const r = raw as Record<string, unknown>
  if (Object.keys(r).length !== KEYS.length || !KEYS.every((k) => Object.prototype.hasOwnProperty.call(r, k))) return null
  const p = r.projection as Record<string, unknown> | null
  if (!p || typeof p !== 'object' || Object.keys(p).length !== 2 || p.id !== LIVE_EXAMINATION_PROJECTION.id || p.version !== LIVE_EXAMINATION_PROJECTION.version) return null
  if (typeof r.run_id !== 'string' || !UUID.test(r.run_id)) return null
  if (typeof r.envelope_sha256 !== 'string' || !HEX64.test(r.envelope_sha256)) return null
  if (r.execution_boundary !== CUSTOMER_LIVE_BOUNDARY || r.run_integrity !== 'persisted_attempt_rechecked' || r.verification !== 'not_verified') return null
  const envelope = parseLiveEnvelope(r.envelope)
  if (!envelope || envelope.execution_origin !== 'live_model' || envelope.outcome.status !== 'examined') return null
  let text: string
  try {
    text = canonicalJson(envelope)
  } catch {
    return null
  }
  if (sha256Hex(text) !== r.envelope_sha256) return null
  if (liveExaminationKey({ document_id: envelope.document.document_id, sha256: envelope.document.sha256, profile: envelope.profile, executor: envelope.executor }) !== envelope.examination_key) return null
  return r as unknown as LiveExaminationProjection
}
