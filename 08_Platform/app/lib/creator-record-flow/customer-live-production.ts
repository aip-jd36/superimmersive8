/**
 * CR-V2-MVP-M2A — production ports for the customer live examination (20261110000000). Loaded only on demand, by the customer route
 * wiring (`./examination-customer`), while both code locks are true. Kept apart from the evaluation ports module on purpose: nothing
 * here reaches the evaluation entry point, the fixed runner or the evaluation-only schema, so the application bundle does not either.
 *
 * Service role only; every database function refuses without the customer enablement row. Errors carry a fixed refusal only.
 */

import { supabaseAdmin } from '@/lib/supabase/admin'
import { EXAMINATION_ACCESS_LOG_TABLE, examinationStorage } from '@/lib/creator-record-flow/examination-production'
import { CUSTOMER_LIVE_DATABASE_REFUSALS, type CustomerLivePorts } from '@/lib/creator-record/live-examination/customer'
import { LivePortError, type LiveAttemptRow } from '@/lib/creator-record/live-examination/examine'

export const CUSTOMER_LIVE_ATTEMPTS_TABLE = 'creator_record_v2_live_examination_attempts'
export const CUSTOMER_LIVE_FUNCTIONS = {
  reserve: 'creator_record_v2_reserve_customer_live_examination',
  record: 'creator_record_v2_record_customer_live_examination',
  settle: 'creator_record_v2_settle_customer_live_reservation',
} as const
const ATTEMPT_COLUMNS = 'id, attempt_number, examination_key, document_id, user_id, document_sha256, envelope_version, execution_origin, content_class, profile_id, profile_version, schema_version, prompt_version, executor_mode, provider, model, outcome_status, outcome_reason, executed_at, envelope_canonical, envelope_sha256, access_log_id, created_at, reservation_id'

/** A stored attempt with its reservation, as the record's projection of a live reading needs it. */
type CustomerLiveAttemptRow = LiveAttemptRow & { reservation_id: string | null }

const refusal = (err: { code?: string | null; message?: string | null } | null | undefined): string | null =>
  err && err.code === 'P0001' && typeof err.message === 'string' ? CUSTOMER_LIVE_DATABASE_REFUSALS[err.message] ?? null : null

/** The creator's stored live attempts for one document and profile, with their reservations. */
export async function listCustomerLiveAttempts(ownerUserId: string, documentId: string, profileId: string): Promise<CustomerLiveAttemptRow[]> {
  const { data, error } = await supabaseAdmin.from(CUSTOMER_LIVE_ATTEMPTS_TABLE).select(ATTEMPT_COLUMNS).eq('user_id', ownerUserId).eq('document_id', documentId).eq('profile_id', profileId)
  if (error) throw new Error('creator_record_live_examination_list_unavailable')
  return ((data ?? []) as unknown as CustomerLiveAttemptRow[]).map((r) => ({ ...r, access_log_id: Number(r.access_log_id) }))
}

export const customerLivePorts: CustomerLivePorts = {
  getDocument: (documentId) => examinationStorage.getDocument(documentId),
  async logLiveRead(documentId, ownerUserId) {
    const { data, error } = await supabaseAdmin
      .from(EXAMINATION_ACCESS_LOG_TABLE)
      .insert({ document_id: documentId, actor_user_id: ownerUserId, actor_role: 'owner', purpose: 'live_examination' })
      .select('id')
      .single()
    if (error || !data) throw new LivePortError('log_read', refusal(error))
    return Number((data as { id: number | string }).id)
  },
  readObject: (record) => examinationStorage.readObject(record),
  listLiveAttempts: (owner, documentId, profileId) => listCustomerLiveAttempts(owner, documentId, profileId),
  async reserve(accessLogId, profileId, inputTokens, reservedMicroUsd) {
    const { data, error } = await supabaseAdmin.rpc(CUSTOMER_LIVE_FUNCTIONS.reserve, { p_access_log_id: accessLogId, p_profile_id: profileId, p_input_tokens: inputTokens, p_reserved_micro_usd: reservedMicroUsd })
    if (error || typeof data !== 'string') throw new LivePortError('record', refusal(error))
    return data
  },
  async record(reservationId, envelopeCanonical) {
    const { data, error } = await supabaseAdmin.rpc(CUSTOMER_LIVE_FUNCTIONS.record, { p_reservation_id: reservationId, p_envelope: envelopeCanonical })
    if (error) throw new LivePortError('record', refusal(error))
    const row = (Array.isArray(data) ? data[0] : data) as { attempt_id?: string; result?: string } | null
    if (!row || typeof row.attempt_id !== 'string' || (row.result !== 'created' && row.result !== 'existing')) throw new LivePortError('record', null)
    return { attempt_id: row.attempt_id, result: row.result }
  },
  async settle(reservationId, chargedMicroUsd) {
    const { data, error } = await supabaseAdmin.rpc(CUSTOMER_LIVE_FUNCTIONS.settle, { p_reservation_id: reservationId, p_charged_micro_usd: chargedMicroUsd })
    if (error || typeof data !== 'number') throw new LivePortError('record', refusal(error))
    return data
  },
}
