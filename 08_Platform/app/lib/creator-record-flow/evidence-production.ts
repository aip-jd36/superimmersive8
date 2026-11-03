/**
 * CR-V2-DOC-1 — production ports for Creator Record v2 evidence intake (`lib/creator-record/evidence-intake`).
 *
 * Service-role access only: the documents table, its access log and the private `creator-record-evidence`
 * bucket grant nothing to anon or authenticated, and the bucket has no storage policy. The routes are the
 * authorization boundary and always pass the session user. Database errors are logged here by code only.
 *
 * The synthetic-only check is membership of SI8's committed synthetic fixture table (by SHA-256). While the
 * code lock is in place, nothing else can be stored.
 */

import { randomUUID } from 'node:crypto'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { DEFAULT_REPLAY_TABLE } from '@/lib/creator-record/evidence/replay'
import { CREATOR_RECORD_V2_SUBMISSIONS } from '@/lib/creator-record/customer-flow/approved-inputs'
import { EVIDENCE_BUCKET, EVIDENCE_INTAKE_REAL_DOCUMENTS_PERMITTED } from '@/lib/creator-record/evidence-intake/contract'
import type { EvidenceDeps, EvidenceObjects, EvidenceRow, EvidenceStore, NewEvidenceRow } from '@/lib/creator-record/evidence-intake/service'
import { hasPilotAccess } from './pilot-access'
import { productionSyntheticUat } from '@/lib/creator-record/customer-flow/synthetic-uat'

export const EVIDENCE_TABLE = 'creator_record_v2_documents'
export const EVIDENCE_ACCESS_LOG_TABLE = 'creator_record_v2_evidence_access_log'
const COLUMNS = 'id, user_id, sha256, media_type, byte_size, file_name, storage_path, consent_version, state, created_at, stored_at, deleted_at, object_removed_at'
const UNIQUE_VIOLATION = '23505'
const RAISED = 'P0001'
const QUOTA = 'S8EQ1'

export class EvidenceStoreError extends Error {
  constructor(readonly op: string, readonly code: string | undefined) {
    super(`creator_record_evidence_store_${op}${code ? `_${code}` : ''}`)
  }
}

async function liveBySha(userId: string, sha256: string): Promise<EvidenceRow | null> {
  const { data, error } = await supabaseAdmin.from(EVIDENCE_TABLE).select(COLUMNS).eq('user_id', userId).eq('sha256', sha256).neq('state', 'deleted').maybeSingle()
  if (error) throw new EvidenceStoreError('live_by_sha', error.code)
  return (data as EvidenceRow | null) ?? null
}

export const evidenceStore: EvidenceStore = {
  async insertPending(row: NewEvidenceRow) {
    const { data, error } = await supabaseAdmin.from(EVIDENCE_TABLE).insert({ ...row, state: 'pending' }).select(COLUMNS).single()
    if (error?.code === UNIQUE_VIOLATION) return { inserted: false, existing: await liveBySha(row.user_id, row.sha256) }
    if (error?.code === QUOTA) return { inserted: false, existing: null, quota_exceeded: true }
    if (error || !data) throw new EvidenceStoreError('insert', error?.code)
    return { inserted: true, row: data as EvidenceRow }
  },
  async markStored(id, userId, at) {
    const { data, error } = await supabaseAdmin.from(EVIDENCE_TABLE).update({ state: 'stored', stored_at: at.toISOString() }).eq('id', id).eq('user_id', userId).eq('state', 'pending').select(COLUMNS).maybeSingle()
    if (error) throw new EvidenceStoreError('mark_stored', error.code)
    return (data as EvidenceRow | null) ?? null
  },
  async removePending(id) {
    const { data, error } = await supabaseAdmin.from(EVIDENCE_TABLE).delete().eq('id', id).eq('state', 'pending').select('id')
    if (error) throw new EvidenceStoreError('remove_pending', error.code)
    return (data ?? []).length === 1
  },
  async get(id) {
    const { data, error } = await supabaseAdmin.from(EVIDENCE_TABLE).select(COLUMNS).eq('id', id).maybeSingle()
    if (error) throw new EvidenceStoreError('get', error.code)
    return (data as EvidenceRow | null) ?? null
  },
  async listStored(userId) {
    const { data, error } = await supabaseAdmin.from(EVIDENCE_TABLE).select(COLUMNS).eq('user_id', userId).eq('state', 'stored').order('created_at', { ascending: false })
    if (error) throw new EvidenceStoreError('list', error.code)
    return (data ?? []) as EvidenceRow[]
  },
  async countLive(userId) {
    const { count, error } = await supabaseAdmin.from(EVIDENCE_TABLE).select('id', { count: 'exact', head: true }).eq('user_id', userId).neq('state', 'deleted')
    if (error) throw new EvidenceStoreError('count', error.code)
    return count ?? 0
  },
  async markDeleted(id, userId, at) {
    const { data, error } = await supabaseAdmin.from(EVIDENCE_TABLE).update({ state: 'deleted', deleted_at: at.toISOString() }).eq('id', id).eq('user_id', userId).eq('state', 'stored').select('id')
    // The database refuses deleting a document a prepared version references.
    if (error?.code === RAISED) return 'referenced'
    if (error) throw new EvidenceStoreError('mark_deleted', error.code)
    return (data ?? []).length === 1 ? 'deleted' : 'not_stored'
  },
  async markObjectRemoved(id, at) {
    const { error } = await supabaseAdmin.from(EVIDENCE_TABLE).update({ object_removed_at: at.toISOString() }).eq('id', id).eq('state', 'deleted').is('object_removed_at', null)
    if (error) throw new EvidenceStoreError('mark_object_removed', error.code)
  },
  async pendingCreatedBefore(before) {
    const { data, error } = await supabaseAdmin.from(EVIDENCE_TABLE).select(COLUMNS).eq('state', 'pending').lt('created_at', before.toISOString()).limit(200)
    if (error) throw new EvidenceStoreError('stale', error.code)
    return (data ?? []) as EvidenceRow[]
  },
  async deletedWithObject() {
    const { data, error } = await supabaseAdmin.from(EVIDENCE_TABLE).select(COLUMNS).eq('state', 'deleted').is('object_removed_at', null).limit(200)
    if (error) throw new EvidenceStoreError('deleted_with_object', error.code)
    return (data ?? []) as EvidenceRow[]
  },
  async logAccess(documentId, actorUserId, role) {
    const { error } = await supabaseAdmin.from(EVIDENCE_ACCESS_LOG_TABLE).insert({ document_id: documentId, actor_user_id: actorUserId, actor_role: role })
    if (error) throw new EvidenceStoreError('log_access', error.code)
  },
}

export const evidenceObjects: EvidenceObjects = {
  async put(path, bytes, mediaType) {
    const { error } = await supabaseAdmin.storage.from(EVIDENCE_BUCKET).upload(path, bytes, { contentType: mediaType, upsert: false })
    if (error) throw new EvidenceStoreError('object_put', undefined)
  },
  async get(path) {
    const { data, error } = await supabaseAdmin.storage.from(EVIDENCE_BUCKET).download(path)
    if (error) {
      const status = (error as { statusCode?: string | number; status?: number }).statusCode ?? (error as { status?: number }).status
      if (String(status) === '404' || /not.?found/i.test(error.message ?? '')) return null
      throw new EvidenceStoreError('object_get', undefined)
    }
    return new Uint8Array(await data.arrayBuffer())
  },
  async remove(path) {
    const { error } = await supabaseAdmin.storage.from(EVIDENCE_BUCKET).remove([path])
    if (error) throw new EvidenceStoreError('object_remove', undefined)
  },
}

export function productionEvidenceDeps(): EvidenceDeps {
  return {
    submissions: CREATOR_RECORD_V2_SUBMISSIONS,
    hasPilotAccess,
    realDocumentsPermitted: EVIDENCE_INTAKE_REAL_DOCUMENTS_PERMITTED,
    isSyntheticTestDocument: (sha256) => DEFAULT_REPLAY_TABLE.has(sha256),
    store: evidenceStore,
    objects: evidenceObjects,
    newId: () => randomUUID(),
    now: () => new Date(),
    log: (event, detail) => console.warn(event, detail),
    // CR-V2-UAT-PROD-MIN-1: inert unless the committed UAT window names this identity and is open.
    syntheticUat: productionSyntheticUat,
  }
}
