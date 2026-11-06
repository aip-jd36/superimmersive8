/**
 * CR-V2-DOC-LIVE-1C-A — the one entry point for an authorized evaluation attempt on one document. Disabled: the code lock is checked
 * before anything else, and no route, page, job or script imports this module (test-enforced). There is no runner.
 *
 * Order, and nothing reaches the provider before every step before it has passed:
 *   1. the code lock;
 *   2. the operator, authenticated by an identity port, never named by the caller;
 *   3. the DURABLE authorization and the persistence preflight, in one database call (`creator_record_v2_live_evaluation_preflight`),
 *      re-checked here: operator, environment, expiry and maximum duration, model, profile, the document, its digest and its authority
 *      reference. A caller-supplied authorization is never accepted;
 *   4. the executor, built here and only here, so a caller cannot supply its own guard or call the model directly;
 *   5. `examineBoundDocument`: the current prepared version, the tool, the stored state, the read audit before the read, then the
 *      integrity, media type and bounds of the bytes;
 *   6. the durable reservation, taken in the database just before the first request;
 *   7. the model request(s), at most two, inside that reservation;
 *   8. the result stored against the reservation, or discarded;
 *   9. the reservation settled with the reported usage. It only ever adds cost, and an unsettled one counts in full.
 *
 * Results stay evidence only: nothing here reads or writes a declaration, guidance, governance, payment, issuance or eligibility.
 *
 * WHAT IT TRUSTS (CR-V2-DOC-LIVE-1C-A-FIX). Every dependency is supplied by the caller: the evaluation, document and prepared-version
 * ports, the profiles, the fixture check, the environment, the clock and the adapter loader. The guarantees above hold only with the
 * reviewed production ports (`creator-record-flow/live-examination-production`), the registered receipt profile and the real Anthropic
 * adapter. A caller that supplied its own evaluation port could skip the durable preflight and reservation and still reach the model;
 * one that supplied its own adapter or profile could produce fabricated observations labelled `live_model`, which the database cannot
 * tell apart from real ones. There is no runner. A future runner must use one fixed, reviewed production composition and must not
 * inject evaluation ports, profiles or model adapters of its own.
 */

import { LIVE_EXTRACTION_MODEL } from '../evidence/live-caller'
import { estimatedUsd, LIVE_EXAMINATION_PERMITTED_IN_THIS_BUILD, toMicroUsd, worstCaseAttemptUsd } from './controls'
import { examineBoundDocument, type LivePreparedSource } from './document-access'
import { LivePortError, type LiveAttemptRow, type LiveExaminationProfile, type LiveRecordResult, type LiveStoragePorts } from './examine'
import { LiveExaminationDisabled, loadRealLiveExecutor, type LiveAnthropicAdapter } from './real-executor'

/** The longest an authorization may run. The database enforces the same. */
export const MAX_AUTHORIZATION_DAYS = 7

export interface EvaluationRequest {
  /** A bearer credential for the operator's own account. Verified by the identity port; never trusted as an id. */
  credential: string
  evaluation_id: string
  prepared_id: string
  document_id: string
  tool_index: number
}

/** The durable authorization as the preflight returns it, for one document. */
export interface DurableAuthorization {
  evaluation_id: string
  operator_user_id: string
  environment_ref: string
  provider: string
  model: string
  profile_id: string
  profile_version: number
  max_attempts: number
  max_spend_micro_usd: number
  attempt_reserve_micro_usd: number
  created_at: string
  expires_at: string
  document_id: string
  document_sha256: string
  authority_reference: string
  spent_micro_usd: number
  reservations_used: number
}

export interface AttemptUsage {
  requests: number
  input_tokens: number
  output_tokens: number
  usage_complete: boolean
  estimated_micro_usd: number
}

/** Every refusal the evaluation schema raises, and its fixed code. A conflict keeps the name the storing path expects. */
export const EVALUATION_DATABASE_REFUSALS: Readonly<Record<string, string>> = {
  live_evaluation_environment_not_established: 'environment_not_established',
  live_evaluation_authorization_not_found: 'authorization_not_found',
  live_evaluation_operator_mismatch: 'operator_mismatch',
  live_evaluation_environment_mismatch: 'environment_mismatch',
  live_evaluation_authorization_revoked: 'authorization_revoked',
  live_evaluation_authorization_expired: 'authorization_expired',
  live_evaluation_document_not_authorized: 'document_not_authorized',
  live_evaluation_document_mismatch: 'document_mismatch',
  live_evaluation_reading_exists: 'reading_exists',
  live_evaluation_not_retryable: 'not_retryable',
  live_evaluation_attempts_exhausted: 'attempts_exhausted',
  live_evaluation_budget_exhausted: 'budget_exhausted',
  live_evaluation_reservation_not_found: 'reservation_not_found',
  live_evaluation_reservation_settled: 'reservation_settled',
  live_evaluation_settlement_invalid: 'settlement_invalid',
  live_evaluation_envelope_invalid: 'envelope_invalid',
  live_evaluation_key_mismatch: 'key_mismatch',
  live_evaluation_access_not_logged: 'access_not_logged',
  live_evaluation_conflict: 'conflict',
}

/** Thrown by a port: a fixed refusal from the database, or null when the dependency was unavailable. */
export class EvaluationPortError extends Error {
  constructor(readonly op: 'authenticate' | 'preflight' | 'reserve' | 'settle' | 'record' | 'list', readonly refusal: string | null) {
    super(`creator_record_live_evaluation_${op}_${refusal ?? 'unavailable'}`)
  }
}

export interface EvaluationPorts {
  authenticateOperator(credential: string): Promise<{ user_id: string } | null>
  preflight(evaluationId: string, operatorUserId: string, documentId: string): Promise<DurableAuthorization>
  reserve(evaluationId: string, operatorUserId: string, documentId: string): Promise<{ reservation_id: string; reserved_micro_usd: number }>
  settle(reservationId: string, usage: AttemptUsage): Promise<{ charged_micro_usd: number }>
  record(reservationId: string, accessLogId: number, envelopeCanonical: string): Promise<{ attempt_id: string; result: 'created' | 'existing' }>
  listAttempts(evaluationId: string, ownerUserId: string, documentId: string, profileId: string): Promise<LiveAttemptRow[]>
}

export interface EvaluationDeps {
  evaluation: EvaluationPorts
  /** The existing examination storage: document rows, the read audit and the private object store. */
  documents: Pick<LiveStoragePorts, 'getDocument' | 'logExaminationRead' | 'readObject'>
  prepared: LivePreparedSource
  /** The project this process is configured for. Must equal the authorization's, and the database checks its own marker too. */
  environmentRef: string
  profiles: ReadonlyMap<string, LiveExaminationProfile>
  isKnownSyntheticFixture(sha256: string): boolean
  env?: Readonly<Record<string, string | undefined>>
  now?: () => Date
  /**
   * Test seam. The adapter IS the model call: a substitute here replaces the provider, and the result would still be labelled
   * `live_model`. Only tests may set it; a runner must leave it unset (see the header).
   */
  loadAdapter?: () => Promise<LiveAnthropicAdapter>
}

export type EvaluationStage = 'lock' | 'request' | 'operator' | 'authorization' | 'executor' | 'cost'
export type EvaluationResult =
  | { kind: 'refused'; stage: EvaluationStage; code: string }
  | {
      kind: 'completed'
      result: LiveRecordResult
      /** Why no reservation was taken, when the database refused one. */
      reservation_refusal: string | null
      settlement: { status: 'not_reserved' } | { status: 'settled'; charged_micro_usd: number } | { status: 'unsettled'; reason: string }
    }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
const ID = /^[a-z0-9][a-z0-9._-]{7,63}$/
const HEX64 = /^[0-9a-f]{64}$/
const PROJECT_REF = /^[a-z0-9]{20}$/
const PRODUCTION_PROJECT_REF = 'lehqgcgnenwdmuzudbrs'
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const refused = (stage: EvaluationStage, code: string): EvaluationResult => ({ kind: 'refused', stage, code })
const isCount = (v: unknown) => typeof v === 'number' && Number.isInteger(v) && v >= 0

export function parseEvaluationRequest(raw: unknown): EvaluationRequest | null {
  if (!isObj(raw) || Object.keys(raw).length !== 5) return null
  const { credential, evaluation_id, prepared_id, document_id, tool_index } = raw
  if (typeof credential !== 'string' || credential.length < 16 || credential.length > 8192) return null
  if (typeof evaluation_id !== 'string' || !ID.test(evaluation_id)) return null
  if (typeof prepared_id !== 'string' || !UUID.test(prepared_id) || typeof document_id !== 'string' || !UUID.test(document_id)) return null
  if (typeof tool_index !== 'number' || !Number.isInteger(tool_index) || tool_index < 0) return null
  return { credential, evaluation_id, prepared_id, document_id, tool_index }
}

/** Every check the application makes on what the database returned. Null when it holds, otherwise the failing check. */
export function verifyDurableAuthorization(
  a: DurableAuthorization,
  expect: { evaluation_id: string; operator_user_id: string; document_id: string; environment_ref: string; now: Date; profiles: ReadonlyMap<string, LiveExaminationProfile> },
): string | null {
  if (!isObj(a)) return 'authorization_shape'
  if (a.evaluation_id !== expect.evaluation_id) return 'evaluation_mismatch'
  if (a.operator_user_id !== expect.operator_user_id) return 'operator_mismatch'
  if (!PROJECT_REF.test(expect.environment_ref) || expect.environment_ref === PRODUCTION_PROJECT_REF || a.environment_ref !== expect.environment_ref) return 'environment_mismatch'
  if (a.provider !== 'anthropic' || a.model !== LIVE_EXTRACTION_MODEL) return 'model_mismatch'
  if (!Array.from(expect.profiles.values()).some((p) => p.ref.id === a.profile_id && p.ref.version === a.profile_version)) return 'profile_not_registered'
  const created = Date.parse(a.created_at)
  const expires = Date.parse(a.expires_at)
  if (Number.isNaN(created) || Number.isNaN(expires)) return 'authorization_shape'
  if (expires - created > MAX_AUTHORIZATION_DAYS * 86_400_000 || expires <= created) return 'authorization_duration'
  if (expect.now.getTime() < created || expect.now.getTime() >= expires) return 'authorization_expired'
  if (a.document_id !== expect.document_id || typeof a.document_sha256 !== 'string' || !HEX64.test(a.document_sha256)) return 'document_not_authorized'
  if (typeof a.authority_reference !== 'string' || !ID.test(a.authority_reference)) return 'authority_reference_missing'
  if (![a.max_attempts, a.max_spend_micro_usd, a.attempt_reserve_micro_usd, a.spent_micro_usd, a.reservations_used].every(isCount)) return 'authorization_shape'
  if (a.max_attempts < 1 || a.max_attempts > 30 || a.max_spend_micro_usd < 1 || a.max_spend_micro_usd > 10_000_000) return 'authorization_shape'
  return null
}

export async function runAuthorizedEvaluation(deps: EvaluationDeps, raw: unknown): Promise<EvaluationResult> {
  if (LIVE_EXAMINATION_PERMITTED_IN_THIS_BUILD !== true) return refused('lock', 'live_examination_disabled')
  const now = deps.now ?? (() => new Date())
  const request = parseEvaluationRequest(raw)
  if (!request) return refused('request', 'invalid_request')

  let operator: { user_id: string } | null
  try {
    operator = await deps.evaluation.authenticateOperator(request.credential)
  } catch {
    return refused('operator', 'operator_unavailable')
  }
  if (!operator || typeof operator.user_id !== 'string' || !UUID.test(operator.user_id)) return refused('operator', 'operator_not_authenticated')

  let auth: DurableAuthorization
  try {
    auth = await deps.evaluation.preflight(request.evaluation_id, operator.user_id, request.document_id)
  } catch (e) {
    return refused('authorization', e instanceof EvaluationPortError && e.refusal ? e.refusal : 'authorization_unavailable')
  }
  const problem = verifyDurableAuthorization(auth, { evaluation_id: request.evaluation_id, operator_user_id: operator.user_id, document_id: request.document_id, environment_ref: deps.environmentRef, now: now(), profiles: deps.profiles })
  if (problem) return refused('authorization', problem)

  const planned = worstCaseAttemptUsd(auth.model)
  if (planned === null || auth.attempt_reserve_micro_usd < toMicroUsd(planned)) return refused('cost', 'reserve_below_planning_maximum')

  let executor: Awaited<ReturnType<typeof loadRealLiveExecutor>>
  try {
    // The session view of the durable authorization, for the executor's own checks: this one document, this ceiling, this expiry.
    executor = await loadRealLiveExecutor(
      { authorization_id: auth.evaluation_id, expires_at: new Date(auth.expires_at).toISOString(), max_estimated_usd: auth.max_spend_micro_usd / 1_000_000, permitted_documents: [{ sha256: auth.document_sha256, consent_reference: auth.authority_reference }] },
      { env: deps.env, now, loadAdapter: deps.loadAdapter },
    )
  } catch (e) {
    return refused('executor', e instanceof LiveExaminationDisabled ? e.message.replace('live_examination_disabled:', '') : 'executor_unavailable')
  }

  let reservation: { reservation_id: string; reserved_micro_usd: number } | null = null
  let reservationRefusal: string | null = null
  const guard = {
    // The executor was built for this one durable document, so its own allowlist is exactly that digest.
    documentPermitted: (sha256: string) => executor.guard.documentPermitted(sha256),
    async reserveAttempt() {
      if (reservation !== null || !executor.guard.reserveAttempt()) return false
      try {
        reservation = await deps.evaluation.reserve(auth.evaluation_id, operator!.user_id, auth.document_id)
        return true
      } catch (e) {
        reservationRefusal = e instanceof EvaluationPortError && e.refusal ? e.refusal : 'reservation_unavailable'
        return false
      }
    },
  }
  const storage: LiveStoragePorts = {
    getDocument: (id) => deps.documents.getDocument(id),
    logExaminationRead: (id, owner) => deps.documents.logExaminationRead(id, owner),
    readObject: (record) => deps.documents.readObject(record),
    async recordLiveAttempt(accessLogId, envelopeCanonical) {
      if (!reservation) throw new LivePortError('record', 'not_reserved')
      try {
        return await deps.evaluation.record(reservation.reservation_id, accessLogId, envelopeCanonical)
      } catch (e) {
        throw new LivePortError('record', e instanceof EvaluationPortError ? e.refusal : null)
      }
    },
    listLiveAttempts: (owner, documentId, profileId) => deps.evaluation.listAttempts(auth.evaluation_id, owner, documentId, profileId),
  }

  const before = executor.report()
  let result: LiveRecordResult
  try {
    result = await examineBoundDocument(
      {
        storage,
        prepared: deps.prepared,
        core: { executor: { identity: executor.identity, callModel: executor.callModel, guard }, isKnownSyntheticFixture: deps.isKnownSyntheticFixture, profiles: deps.profiles, livePermitted: true, now },
      },
      { actor_user_id: operator.user_id, prepared_id: request.prepared_id, document_id: request.document_id, tool_index: request.tool_index },
      { id: auth.profile_id, version: auth.profile_version },
    )
  } catch {
    // A port that threw (the object store, for one). Whatever happened, a reservation taken is still settled below.
    result = { kind: 'unavailable', reason: 'storage_unavailable' }
  }

  const held = reservation as { reservation_id: string; reserved_micro_usd: number } | null
  if (!held) return { kind: 'completed', result, reservation_refusal: reservationRefusal, settlement: { status: 'not_reserved' } }
  const after = executor.report()
  const usage: AttemptUsage = {
    requests: after.requests - before.requests,
    input_tokens: after.input_tokens - before.input_tokens,
    output_tokens: after.output_tokens - before.output_tokens,
    usage_complete: after.responses_with_usage - before.responses_with_usage === after.requests - before.requests,
    estimated_micro_usd: 0,
  }
  usage.estimated_micro_usd = toMicroUsd(estimatedUsd(auth.model, usage.input_tokens, usage.output_tokens) ?? 0)
  try {
    const s = await deps.evaluation.settle(held.reservation_id, usage)
    return { kind: 'completed', result, reservation_refusal: null, settlement: { status: 'settled', charged_micro_usd: s.charged_micro_usd } }
  } catch (e) {
    return { kind: 'completed', result, reservation_refusal: null, settlement: { status: 'unsettled', reason: e instanceof EvaluationPortError && e.refusal ? e.refusal : 'settlement_unavailable' } }
  }
}
