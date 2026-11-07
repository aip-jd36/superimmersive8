/**
 * CR-V2-MVP-M2A — ONE customer live examination attempt of ONE of the creator's own stored documents. Disabled: it refuses on its first
 * line unless both code locks are true (`LIVE_EXAMINATION_PERMITTED_IN_THIS_BUILD` and `CUSTOMER_LIVE_EXAMINATION_PERMITTED_IN_THIS_BUILD`),
 * and the database refuses every step without its customer enablement row (20261110000000).
 *
 * Reused unchanged: the engine and retry policy (`examineLiveAndRecord`: one reading, first write wins, three attempts, audit before
 * read), the executor and its request checks (`loadCustomerLiveExecutor`), the pre-call input bound, the live profile registry and the
 * committed synthetic-fixture registry (a known fixture is never examined as a customer document).
 *
 * Order, each step failing closed:
 *   1. the locks; 2. the executor (dedicated key, no unsafe SDK variable, this document's digest only);
 *   3. the engine: stored attempts re-verified; an existing reading is returned and costs nothing;
 *   4. the read is logged with purpose `live_examination` (the database checks enablement, owner, stored upload, not a fixture);
 *   5. the bytes are re-hashed and bounded; 6. a DURABLE reservation is taken for this attempt, under the database's per-document,
 *   per-day and per-creator spend limits, before the first model request; 7. the model is called (at most two requests);
 *   8. the attempt is stored against its reservation; 9. the reservation is settled once from reported usage. An unsettled
 *   reservation is counted at its full amount.
 * Nothing here logs, and no document content leaves this function except the stored envelope.
 */

import { estimatedUsd, LIVE_EXAMINATION_PERMITTED_IN_THIS_BUILD, CUSTOMER_LIVE_EXAMINATION_PERMITTED_IN_THIS_BUILD, attemptCostBoundUsd, toMicroUsd, worstCaseAttemptUsd } from './controls'
import { LIVE_EXTRACTION_MODEL } from '../evidence/live-caller'
import { examineLiveAndRecord, LIVE_PROFILE_REGISTRY, LivePortError, type LiveAttemptRow, type LiveRecordResult, type LiveStoragePorts } from './examine'
import { loadCustomerLiveExecutor, type LoadRealExecutorOptions, type RealLiveExecutor } from './real-executor'

type ExaminationDocumentRecord = NonNullable<Awaited<ReturnType<LiveStoragePorts['getDocument']>>>

/** What the database refuses a reservation with, as fixed codes (`20261110000000`). */
export const CUSTOMER_LIVE_DATABASE_REFUSALS: Readonly<Record<string, string>> = {
  customer_live_examination_not_enabled: 'not_enabled',
  customer_live_read_target_mismatch: 'target_mismatch',
  customer_live_refuses_known_fixture: 'known_fixture',
  customer_live_reservation_invalid: 'reservation_invalid',
  customer_live_access_not_logged: 'access_not_logged',
  customer_live_examination_held: 'held',
  customer_live_examination_not_retryable: 'not_retryable',
  customer_live_examination_in_progress: 'in_progress',
  customer_live_examination_attempts_exhausted: 'attempts_exhausted',
  customer_live_examination_daily_limit: 'daily_limit',
  customer_live_examination_spend_limit: 'spend_limit',
  customer_live_envelope_invalid: 'envelope_invalid',
  customer_live_key_mismatch: 'key_mismatch',
  customer_live_document_mismatch: 'document_mismatch',
  customer_live_conflict: 'conflict',
  customer_live_settlement_invalid: 'settlement_invalid',
  // CR-V2-MVP-RETENTION-M1A (20261111000000): the creator withdrew consent for documents uploaded under it. Refused at the read, the
  // reservation and the recorded attempt alike, so no stale authorization, retry or re-examination gets past it.
  creator_record_v2_consent_withdrawn: 'consent_withdrawn',
  // CR-V2-MVP-LAUNCH-FOUNDATION-1 (20261112000000, Decision 8Q): no recorded AI-examination permission for this document.
  creator_record_v2_ai_permission_required: 'ai_permission_required',
}

export interface CustomerLivePorts {
  getDocument(documentId: string): Promise<ExaminationDocumentRecord | null>
  /** Inserts the access-log row with purpose `live_examination`. Throws `LivePortError('log_read', refusal)`. */
  logLiveRead(documentId: string, ownerUserId: string): Promise<number>
  readObject(record: ExaminationDocumentRecord): Promise<Uint8Array | null>
  listLiveAttempts(ownerUserId: string, documentId: string, profileId: string): Promise<LiveAttemptRow[]>
  /** `creator_record_v2_reserve_customer_live_examination`. Throws `LivePortError('record', refusal)`. */
  reserve(accessLogId: number, profileId: string, inputTokens: number, reservedMicroUsd: number): Promise<string>
  /** `creator_record_v2_record_customer_live_examination`. Throws `LivePortError('record', refusal)`. */
  record(reservationId: string, envelopeCanonical: string): Promise<{ attempt_id: string; result: 'created' | 'existing' }>
  /** `creator_record_v2_settle_customer_live_reservation`. */
  settle(reservationId: string, chargedMicroUsd: number): Promise<number>
}

export interface CustomerLiveDeps {
  ports: CustomerLivePorts
  isKnownSyntheticFixture(sha256: string): boolean
  now(): Date
  /** Passed to `loadCustomerLiveExecutor` (environment, adapter seam for tests, deadline). */
  executorOptions?: LoadRealExecutorOptions
}

export type CustomerLiveResult = {
  result: LiveRecordResult | { kind: 'disabled'; reason: string }
  /** Why the database refused the reservation, when it did. No model was called. */
  reservation_refusal: string | null
  settlement: { status: 'not_reserved' } | { status: 'settled'; charged_micro_usd: number } | { status: 'unsettled' }
}

const PROFILE = { id: 'receipt', version: 1 } as const

export async function examineCustomerDocumentLive(deps: CustomerLiveDeps, ownerUserId: string, documentId: string): Promise<CustomerLiveResult> {
  const disabled = (reason: string): CustomerLiveResult => ({ result: { kind: 'disabled', reason }, reservation_refusal: null, settlement: { status: 'not_reserved' } })
  if (LIVE_EXAMINATION_PERMITTED_IN_THIS_BUILD !== true || CUSTOMER_LIVE_EXAMINATION_PERMITTED_IN_THIS_BUILD !== true) return disabled('code_lock')

  let record: ExaminationDocumentRecord | null
  try {
    record = await deps.ports.getDocument(documentId)
  } catch {
    return disabled('storage_unavailable')
  }
  if (!record || record.user_id !== ownerUserId) return { result: { kind: 'refused', code: 'not_owner', read_logged: false }, reservation_refusal: null, settlement: { status: 'not_reserved' } }

  let executor: RealLiveExecutor
  try {
    executor = await loadCustomerLiveExecutor({ document_sha256: record.sha256 }, deps.executorOptions)
  } catch (e) {
    return disabled(e instanceof Error ? e.message.replace(/^live_examination_disabled:/, '') : 'executor_unavailable')
  }

  let accessLogId: number | null = null
  let reservationId: string | null = null
  let reservationRefusal: string | null = null
  const memory = executor.guard
  const guarded: RealLiveExecutor = {
    ...executor,
    guard: {
      documentPermitted: (sha256) => memory.documentPermitted(sha256),
      async reserveAttempt(inputTokensPerRequest) {
        // The executor's own in-memory check first (bound, ceiling, one attempt), then the durable one.
        if ((await memory.reserveAttempt(inputTokensPerRequest)) !== true || accessLogId === null) return false
        const planning = worstCaseAttemptUsd(LIVE_EXTRACTION_MODEL)
        const bounded = attemptCostBoundUsd(LIVE_EXTRACTION_MODEL, inputTokensPerRequest)
        if (planning === null || bounded === null) return false
        try {
          reservationId = await deps.ports.reserve(accessLogId, PROFILE.id, inputTokensPerRequest, toMicroUsd(Math.max(planning, bounded)))
          return true
        } catch (e) {
          reservationRefusal = e instanceof LivePortError && e.refusal ? e.refusal : 'reservation_unavailable'
          return false
        }
      },
    },
  }

  const storage: LiveStoragePorts = {
    getDocument: (id) => deps.ports.getDocument(id),
    async logExaminationRead(id, owner) {
      accessLogId = await deps.ports.logLiveRead(id, owner)
      return accessLogId
    },
    readObject: (r) => deps.ports.readObject(r),
    async recordLiveAttempt(_accessLogId, envelopeCanonical) {
      if (reservationId === null) throw new LivePortError('record', 'reservation_missing')
      return deps.ports.record(reservationId, envelopeCanonical)
    },
    listLiveAttempts: (owner, id, profileId) => deps.ports.listLiveAttempts(owner, id, profileId),
  }

  const result = await examineLiveAndRecord(
    { storage, core: { executor: guarded, isKnownSyntheticFixture: deps.isKnownSyntheticFixture, profiles: LIVE_PROFILE_REGISTRY, livePermitted: true, now: deps.now } },
    { actor_user_id: ownerUserId, document_id: documentId, profile: PROFILE },
  )

  if (reservationId === null) return { result, reservation_refusal: reservationRefusal, settlement: { status: 'not_reserved' } }
  const report = executor.report()
  const charged = toMicroUsd(estimatedUsd(LIVE_EXTRACTION_MODEL, report.input_tokens, report.output_tokens) ?? 0)
  try {
    const counted = await deps.ports.settle(reservationId, charged)
    return { result, reservation_refusal: null, settlement: { status: 'settled', charged_micro_usd: counted } }
  } catch {
    // Unsettled: the database keeps counting its full reservation.
    return { result, reservation_refusal: null, settlement: { status: 'unsettled' } }
  }
}
