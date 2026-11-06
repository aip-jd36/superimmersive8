/**
 * CR-V2-DOC-LIVE-1B — production storage ports for a bound live examination. Disabled: nothing imports this module (test-enforced), and
 * it builds no executor, so it cannot reach a model.
 *
 * No new storage. Reads the document, logs the read and fetches the bytes through the examination ports already in use (service role, the
 * private `creator-record-evidence` bucket, the append-only access log), and writes through the database's one attempt function, which
 * refuses `live_model` and, without the isolated-test marker, everything else. Database errors carry a fixed refusal only. Nothing is logged.
 */

import { supabaseAdmin } from '@/lib/supabase/admin'
import { examinationStorage } from '@/lib/creator-record-flow/examination-production'
import type { LivePreparedSource, PreparedBindingRow } from '@/lib/creator-record/live-examination/document-access'
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
    const { data, error } = await supabaseAdmin.from(PREPARED_TABLE).select('id, user_id, canonical, sha256').eq('id', preparedId).maybeSingle()
    if (error) throw new Error('creator_record_live_examination_prepared_unavailable')
    return (data as PreparedBindingRow | null) ?? null
  },
}
