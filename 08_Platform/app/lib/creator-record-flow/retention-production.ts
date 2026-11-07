/**
 * CR-V2-MVP-RETENTION-M1A — production ports for original-document retention (`lib/creator-record/evidence-intake/retention`).
 *
 * Service role only: every new table is select-only for it, and every change is one of the database functions of 20261111000000.
 * A known refusal (P0001 with a fixed message) becomes a `RetentionRefusal`; anything else is a plain error (unavailable, fail closed).
 */

import { supabaseAdmin } from '@/lib/supabase/admin'
import { sendCreatorRecordRetentionAdminAlert } from '@/lib/emails'
import {
  RETENTION_DATABASE_REFUSALS,
  RetentionRefusal,
  type DeletionRequestState,
  type RetentionApplyReport,
  type RetentionDeps,
  type RetentionPorts,
  type RetentionStatusReport,
} from '@/lib/creator-record/evidence-intake/retention'
import { evidenceObjects, evidenceStore } from './evidence-production'

export const RETENTION_FUNCTIONS = {
  requestDeletion: 'creator_record_v2_request_document_deletion',
  withdrawConsent: 'creator_record_v2_withdraw_consent',
  placeHold: 'creator_record_v2_place_retention_hold',
  renewHold: 'creator_record_v2_renew_retention_hold',
  releaseHold: 'creator_record_v2_release_retention_hold',
  apply: 'creator_record_v2_apply_retention',
  status: 'creator_record_v2_retention_status',
} as const

function raise(op: string, error: { code?: string | null; message?: string | null } | null): never {
  const known = error && error.code === 'P0001' && typeof error.message === 'string' ? RETENTION_DATABASE_REFUSALS[error.message] : undefined
  if (known) throw new RetentionRefusal(known)
  throw new Error(`creator_record_retention_${op}_unavailable`)
}

const firstRow = <T>(data: unknown): T | null => ((Array.isArray(data) ? data[0] : data) as T | null) ?? null

export const retentionPorts: RetentionPorts = {
  async requestDeletion(userId, documentId) {
    const { data, error } = await supabaseAdmin.rpc(RETENTION_FUNCTIONS.requestDeletion, { p_user_id: userId, p_document_id: documentId })
    if (error) raise('request_deletion', error)
    const row = firstRow<DeletionRequestState>(data)
    if (!row || typeof row.request_id !== 'string' || (row.status !== 'open' && row.status !== 'completed')) raise('request_deletion', null)
    return { request_id: row.request_id, status: row.status, awaiting: row.awaiting ?? null, resolution: row.resolution ?? null }
  },
  async withdrawConsent(userId) {
    const { data, error } = await supabaseAdmin.rpc(RETENTION_FUNCTIONS.withdrawConsent, { p_user_id: userId })
    if (error) raise('withdraw_consent', error)
    const row = firstRow<{ withdrawal_id: number | string; withdrawn_at: string; result: string }>(data)
    if (!row || (row.result !== 'created' && row.result !== 'existing')) raise('withdraw_consent', null)
    return { withdrawal_id: Number(row.withdrawal_id), withdrawn_at: row.withdrawn_at, result: row.result }
  },
  async placeHold(documentId, adminUserId, reason, days) {
    const { data, error } = await supabaseAdmin.rpc(RETENTION_FUNCTIONS.placeHold, { p_document_id: documentId, p_admin_user_id: adminUserId, p_reason: reason, p_days: days })
    if (error || typeof data !== 'string') raise('place_hold', error)
    return data as string
  },
  async renewHold(holdId, adminUserId, reason, days) {
    const { data, error } = await supabaseAdmin.rpc(RETENTION_FUNCTIONS.renewHold, { p_hold_id: holdId, p_admin_user_id: adminUserId, p_reason: reason, p_days: days })
    if (error || typeof data !== 'string') raise('renew_hold', error)
    return data as string
  },
  async releaseHold(holdId, adminUserId, reason) {
    const { data, error } = await supabaseAdmin.rpc(RETENTION_FUNCTIONS.releaseHold, { p_hold_id: holdId, p_admin_user_id: adminUserId, p_reason: reason })
    if (error || (data !== 'released' && data !== 'not_active')) raise('release_hold', error)
    return data as 'released' | 'not_active'
  },
  async apply(limit) {
    const { data, error } = await supabaseAdmin.rpc(RETENTION_FUNCTIONS.apply, { p_limit: limit })
    if (error || !data || typeof data !== 'object') raise('apply', error)
    return data as RetentionApplyReport
  },
  async status() {
    const { data, error } = await supabaseAdmin.rpc(RETENTION_FUNCTIONS.status)
    if (error || !data || typeof data !== 'object') raise('status', error)
    return data as RetentionStatusReport
  },
}

export function productionRetentionDeps(): RetentionDeps & { alert: typeof sendCreatorRecordRetentionAdminAlert } {
  return {
    retention: retentionPorts,
    store: evidenceStore,
    objects: evidenceObjects,
    now: () => new Date(),
    log: (event, detail) => console.warn(event, detail),
    alert: sendCreatorRecordRetentionAdminAlert,
  }
}
