/**
 * CR-V2-DOC-LIVE-1B / 1C-A — production storage and evaluation ports for a bound live examination. Disabled: nothing imports this module
 * (test-enforced), and it builds no executor, so it cannot reach a model.
 *
 * No new storage. Reads the document, logs the read and fetches the bytes through the examination ports already in use (service role, the
 * private `creator-record-evidence` bucket, the append-only access log), and writes through the database's one attempt function, which
 * refuses `live_model` and, without the isolated-test marker, everything else. Database errors carry a fixed refusal only. Nothing is logged.
 */

import { supabaseAdmin } from '@/lib/supabase/admin'
import { examinationStorage } from '@/lib/creator-record-flow/examination-production'
import type { LivePreparedSource, PreparedBindingRow } from '@/lib/creator-record/live-examination/document-access'
import { EVALUATION_DATABASE_REFUSALS, EvaluationPortError, type DurableAuthorization, type EvaluationPorts } from '@/lib/creator-record/live-examination/evaluation'
import { LIVE_DATABASE_REFUSALS, LivePortError, type LiveAttemptRow, type LiveStoragePorts } from '@/lib/creator-record/live-examination/examine'

export const LIVE_ATTEMPTS_TABLE = 'creator_record_v2_live_examination_attempts'
export const LIVE_RECORD_FUNCTION = 'creator_record_v2_record_live_examination'
export const PREPARED_TABLE = 'creator_record_v2_prepared'
const ATTEMPT_COLUMNS = 'id, attempt_number, examination_key, document_id, user_id, document_sha256, envelope_version, execution_origin, content_class, profile_id, profile_version, schema_version, prompt_version, executor_mode, provider, model, outcome_status, outcome_reason, executed_at, envelope_canonical, envelope_sha256, access_log_id, created_at'

const classify = (err: { code?: string | null; message?: string | null } | null | undefined): string | null =>
  err && err.code === 'P0001' && typeof err.message === 'string' ? LIVE_DATABASE_REFUSALS[err.message] ?? null : null

export const liveExaminationStorage: LiveStoragePorts = {
  getDocument: (documentId) => examinationStorage.getDocument(documentId),
  async logExaminationRead(documentId, ownerUserId) {
    try {
      return await examinationStorage.logExaminationRead(documentId, ownerUserId)
    } catch (e) {
      throw new LivePortError('log_read', (e as { refusal?: string | null }).refusal ?? null)
    }
  },
  readObject: (record) => examinationStorage.readObject(record),
  async recordLiveAttempt(accessLogId, envelopeCanonical) {
    const { data, error } = await supabaseAdmin.rpc(LIVE_RECORD_FUNCTION, { p_access_log_id: accessLogId, p_envelope: envelopeCanonical })
    if (error) throw new LivePortError('record', classify(error))
    const row = (Array.isArray(data) ? data[0] : data) as { attempt_id?: string; result?: string } | null
    if (!row || typeof row.attempt_id !== 'string' || (row.result !== 'created' && row.result !== 'existing')) throw new LivePortError('record', null)
    return { attempt_id: row.attempt_id, result: row.result }
  },
  async listLiveAttempts(ownerUserId, documentId, profileId) {
    const { data, error } = await supabaseAdmin.from(LIVE_ATTEMPTS_TABLE).select(ATTEMPT_COLUMNS).eq('user_id', ownerUserId).eq('document_id', documentId).eq('profile_id', profileId)
    if (error) throw new Error('creator_record_live_examination_list_unavailable')
    return ((data ?? []) as unknown as LiveAttemptRow[]).map((r) => ({ ...r, access_log_id: Number(r.access_log_id) }))
  },
}

export const livePreparedSource: LivePreparedSource = {
  async getPrepared(preparedId) {
    const { data, error } = await supabaseAdmin.from(PREPARED_TABLE).select('id, user_id, canonical, sha256, draft_id, version, status').eq('id', preparedId).maybeSingle()
    if (error) throw new Error('creator_record_live_examination_prepared_unavailable')
    if (!data) return null
    const row = data as Omit<PreparedBindingRow, 'latest_version'>
    // CR-V2-DOC-LIVE-1C-A: the newest version of the same draft, so a superseded version cannot bind.
    const latest = await supabaseAdmin.from(PREPARED_TABLE).select('version').eq('draft_id', row.draft_id).order('version', { ascending: false }).limit(1).maybeSingle()
    if (latest.error || !latest.data) throw new Error('creator_record_live_examination_prepared_unavailable')
    return { ...row, latest_version: Number((latest.data as { version: number }).version) }
  },
}

// ── CR-V2-DOC-LIVE-1C-A: the evaluation ports. The schema is evaluation-only (supabase/evaluation-only) and exists in no deployed database. ──

export const EVALUATION_ATTEMPTS_TABLE = 'creator_record_v2_live_evaluation_attempts'
export const EVALUATION_FUNCTIONS = {
  preflight: 'creator_record_v2_live_evaluation_preflight',
  reserve: 'creator_record_v2_live_evaluation_reserve',
  settle: 'creator_record_v2_live_evaluation_settle',
  record: 'creator_record_v2_live_evaluation_record',
} as const

const refusal = (err: { code?: string | null; message?: string | null } | null | undefined): string | null =>
  err && err.code === 'P0001' && typeof err.message === 'string' ? EVALUATION_DATABASE_REFUSALS[err.message] ?? null : null
const firstRow = (data: unknown) => (Array.isArray(data) ? data[0] : data) as Record<string, unknown> | null | undefined

export const evaluationPorts: EvaluationPorts = {
  async authenticateOperator(credential) {
    // The operator's own session token, checked by Supabase Auth. An unknown or expired token is not an operator.
    const { data, error } = await supabaseAdmin.auth.getUser(credential)
    if (error || !data?.user?.id) return null
    return { user_id: data.user.id }
  },
  async preflight(evaluationId, operatorUserId, documentId) {
    const { data, error } = await supabaseAdmin.rpc(EVALUATION_FUNCTIONS.preflight, { p_evaluation_id: evaluationId, p_operator: operatorUserId, p_document_id: documentId })
    if (error) throw new EvaluationPortError('preflight', refusal(error))
    const r = firstRow(data)
    if (!r) throw new EvaluationPortError('preflight', null)
    return {
      ...(r as unknown as DurableAuthorization),
      max_attempts: Number(r.max_attempts),
      max_spend_micro_usd: Number(r.max_spend_micro_usd),
      attempt_reserve_micro_usd: Number(r.attempt_reserve_micro_usd),
      spent_micro_usd: Number(r.spent_micro_usd),
      reservations_used: Number(r.reservations_used),
    }
  },
  async reserve(evaluationId, operatorUserId, documentId) {
    const { data, error } = await supabaseAdmin.rpc(EVALUATION_FUNCTIONS.reserve, { p_evaluation_id: evaluationId, p_operator: operatorUserId, p_document_id: documentId })
    if (error) throw new EvaluationPortError('reserve', refusal(error))
    const r = firstRow(data)
    if (!r || typeof r.reservation_id !== 'string') throw new EvaluationPortError('reserve', null)
    return { reservation_id: r.reservation_id, reserved_micro_usd: Number(r.reserved_micro_usd) }
  },
  async settle(reservationId, usage) {
    const { data, error } = await supabaseAdmin.rpc(EVALUATION_FUNCTIONS.settle, {
      p_reservation_id: reservationId, p_requests: usage.requests, p_input_tokens: usage.input_tokens, p_output_tokens: usage.output_tokens,
      p_usage_complete: usage.usage_complete, p_estimated_micro_usd: usage.estimated_micro_usd,
    })
    if (error || data === null || data === undefined) throw new EvaluationPortError('settle', refusal(error))
    return { charged_micro_usd: Number(data) }
  },
  async record(reservationId, accessLogId, envelopeCanonical) {
    const { data, error } = await supabaseAdmin.rpc(EVALUATION_FUNCTIONS.record, { p_reservation_id: reservationId, p_access_log_id: accessLogId, p_envelope: envelopeCanonical })
    if (error) throw new EvaluationPortError('record', refusal(error))
    const r = firstRow(data)
    if (!r || typeof r.attempt_id !== 'string' || (r.result !== 'created' && r.result !== 'existing')) throw new EvaluationPortError('record', null)
    return { attempt_id: r.attempt_id, result: r.result }
  },
  async listAttempts(evaluationId, ownerUserId, documentId, profileId) {
    const { data, error } = await supabaseAdmin.from(EVALUATION_ATTEMPTS_TABLE).select(ATTEMPT_COLUMNS).eq('evaluation_id', evaluationId).eq('user_id', ownerUserId).eq('document_id', documentId).eq('profile_id', profileId)
    if (error) throw new EvaluationPortError('list', null)
    return ((data ?? []) as unknown as LiveAttemptRow[]).map((r) => ({ ...r, access_log_id: Number(r.access_log_id) }))
  },
}
