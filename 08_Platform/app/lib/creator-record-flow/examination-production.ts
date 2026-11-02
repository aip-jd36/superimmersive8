/**
 * CR-V2-DOC-2C-C-B — production ports for the Creator Record v2 examination persistence adapter
 * (`lib/creator-record/examination/persistence.ts`). The ONLY module outside lib/creator-record/examination that
 * may import the examination foundation (test-enforced), and nothing imports it: no route, page or job.
 *
 * Service-role access only. The database decides everything that matters:
 *   - an examination-purpose access event is accepted only for the owner of a stored document, and only where the
 *     operator has established the isolated synthetic-test environment marker (absent in Production: refused);
 *   - creator_record_v2_record_examination re-checks the envelope, the key, the event, the document and the content.
 * This module never reads, creates or changes the environment marker, and passes no authority.
 *
 * Replay only: the core ports are the committed replay executor, the committed known-fixture registry and the
 * registered profiles. No model, SDK, live caller or live gate is reachable from here.
 */

import { supabaseAdmin } from '@/lib/supabase/admin'
import { EVIDENCE_BUCKET } from '@/lib/creator-record/evidence-intake/contract'
import type { ExaminationDocumentRecord } from '@/lib/creator-record/examination/examine-document'
import {
  classifyDatabaseError,
  ExaminationPortError,
  PERSISTED_RUN_COLUMNS,
  type ExaminationAdapterDeps,
  type ExaminationStoragePorts,
  type PersistedRunRow,
} from '@/lib/creator-record/examination/persistence'
import { defaultProfileRegistry, knownFixtureRegistry, replayExecutor } from '@/lib/creator-record/examination/replay-executor'

export const EXAMINATION_DOCUMENTS_TABLE = 'creator_record_v2_documents'
export const EXAMINATION_ACCESS_LOG_TABLE = 'creator_record_v2_evidence_access_log'
export const EXAMINATION_RUNS_TABLE = 'creator_record_v2_examination_runs'
export const EXAMINATION_RECORD_FUNCTION = 'creator_record_v2_record_examination'

/** The DOC-1 schema fixes every object path as `<user_id>/<document_id>` (CHECK on creator_record_v2_documents). */
export const evidenceObjectPath = (r: Pick<ExaminationDocumentRecord, 'user_id' | 'id'>) => `${r.user_id}/${r.id}`

export const examinationStorage: ExaminationStoragePorts = {
  async getDocument(documentId) {
    const { data, error } = await supabaseAdmin.from(EXAMINATION_DOCUMENTS_TABLE).select('id, user_id, sha256, media_type, byte_size, state').eq('id', documentId).maybeSingle()
    if (error) throw new ExaminationPortError('get_document', null)
    return (data as ExaminationDocumentRecord | null) ?? null
  },
  async logExaminationRead(documentId, ownerUserId) {
    const { data, error } = await supabaseAdmin
      .from(EXAMINATION_ACCESS_LOG_TABLE)
      .insert({ document_id: documentId, actor_user_id: ownerUserId, actor_role: 'owner', purpose: 'examination' })
      .select('id')
      .single()
    if (error || !data) throw new ExaminationPortError('log_read', classifyDatabaseError(error))
    return Number((data as { id: number | string }).id)
  },
  async readObject(record) {
    const { data, error } = await supabaseAdmin.storage.from(EVIDENCE_BUCKET).download(evidenceObjectPath(record))
    if (error) {
      const status = (error as { statusCode?: string | number; status?: number }).statusCode ?? (error as { status?: number }).status
      if (String(status) === '404' || /not.?found/i.test(error.message ?? '')) return null
      throw new ExaminationPortError('read_object', null)
    }
    return new Uint8Array(await data.arrayBuffer())
  },
  async recordExamination(accessLogId, envelopeCanonical) {
    const { data, error } = await supabaseAdmin.rpc(EXAMINATION_RECORD_FUNCTION, { p_access_log_id: accessLogId, p_envelope: envelopeCanonical })
    if (error) throw new ExaminationPortError('record', classifyDatabaseError(error))
    const row = (Array.isArray(data) ? data[0] : data) as { run_id?: string; result?: string } | null
    if (!row || typeof row.run_id !== 'string' || (row.result !== 'created' && row.result !== 'existing')) throw new ExaminationPortError('record', null)
    return { run_id: row.run_id, result: row.result }
  },
  async listRuns(ownerUserId, documentId) {
    const { data, error } = await supabaseAdmin.from(EXAMINATION_RUNS_TABLE).select(PERSISTED_RUN_COLUMNS).eq('user_id', ownerUserId).eq('document_id', documentId)
    if (error) throw new ExaminationPortError('list_runs', null)
    return ((data ?? []) as unknown as PersistedRunRow[]).map((r) => ({ ...r, access_log_id: Number(r.access_log_id) }))
  },
}

export function productionExaminationDeps(): ExaminationAdapterDeps {
  return {
    storage: examinationStorage,
    core: { fixtures: knownFixtureRegistry(), executor: replayExecutor(), profiles: defaultProfileRegistry() },
  }
}
