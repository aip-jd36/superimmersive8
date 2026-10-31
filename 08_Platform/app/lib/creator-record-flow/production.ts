/**
 * CR-V2-MVP-M2 — production ports for the Creator Record v2 customer flow
 * (`lib/creator-record/customer-flow/service.ts`).
 *
 * Service-role access to the two M2 tables. The tables grant nothing to anon or
 * authenticated; the routes are the authorization boundary and always pass the
 * session user. Database error details are logged here by code only.
 */

import { randomUUID } from 'node:crypto'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { TOPIC_CLAIMS_FIXTURE } from '@/lib/retrieval-engine/topic-claims-fixture'
import type { FlowDeps, NewPreparedRow, PreparedRow, PreparedStore } from '@/lib/creator-record/customer-flow/service'
import { approvedCustomerRecordInputs, approvedGovernanceSnapshot, approvedPdfTemplates, CREATOR_RECORD_V2_SUBMISSIONS } from '@/lib/creator-record/customer-flow/approved-inputs'
import { renderV2ForIssuance, type BindReason, type CheckoutSubmission, type PurchaseDeps, type V2IssuanceDeps } from '@/lib/creator-record/customer-flow/purchase'
import { CREATOR_RECORD_V2_ISSUANCE } from '@/lib/creator-record-artifacts/config'

export const PREPARED_TABLE = 'creator_record_v2_prepared'
export const PILOT_ACCESS_TABLE = 'creator_record_v2_pilot_access'

const COLUMNS = 'id, user_id, draft_id, version, record_ref, record_schema, record_schema_version, canonical, sha256, form_state, status, created_at, reviewed_at, submission_id'

export class PreparedStoreError extends Error {
  constructor(op: string, code: string | undefined) {
    super(`creator_record_v2_store:${op}:${code ?? 'unknown'}`)
  }
}

export const preparedStore: PreparedStore = {
  async insert(row: NewPreparedRow): Promise<PreparedRow> {
    const { data, error } = await supabaseAdmin.from(PREPARED_TABLE).insert({ ...row, status: 'prepared' }).select(COLUMNS).single()
    if (error || !data) throw new PreparedStoreError('insert', error?.code)
    return data as PreparedRow
  },
  async get(id: string): Promise<PreparedRow | null> {
    const { data, error } = await supabaseAdmin.from(PREPARED_TABLE).select(COLUMNS).eq('id', id).maybeSingle()
    if (error) throw new PreparedStoreError('get', error.code)
    return (data as PreparedRow | null) ?? null
  },
  async latestVersion(draftId: string): Promise<PreparedRow | null> {
    const { data, error } = await supabaseAdmin.from(PREPARED_TABLE).select(COLUMNS).eq('draft_id', draftId).order('version', { ascending: false }).limit(1).maybeSingle()
    if (error) throw new PreparedStoreError('latest', error.code)
    return (data as PreparedRow | null) ?? null
  },
  async markReviewed(id: string, userId: string): Promise<PreparedRow | null> {
    const { data, error } = await supabaseAdmin
      .from(PREPARED_TABLE)
      .update({ status: 'reviewed', reviewed_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', userId)
      .eq('status', 'prepared')
      .select(COLUMNS)
      .maybeSingle()
    if (error) throw new PreparedStoreError('review', error.code)
    return (data as PreparedRow | null) ?? null
  },
}

/** CR-V2-MVP-M3: the version bound to a submission (submission_id is UNIQUE), or null. */
export async function preparedBoundTo(submissionId: string): Promise<PreparedRow | null> {
  const { data, error } = await supabaseAdmin.from(PREPARED_TABLE).select(COLUMNS).eq('submission_id', submissionId).maybeSingle()
  if (error) throw new PreparedStoreError('bound', error.code)
  return (data as PreparedRow | null) ?? null
}

const BIND_REASONS: readonly BindReason[] = ['created', 'existing', 'not_found', 'not_reviewed', 'digest_mismatch', 'superseded']

/** CR-V2-MVP-M3: `create_creator_record_v2_submission` (atomic, idempotent; see the M3 migration). */
export async function bindPreparedToSubmission(p: { preparedId: string; userId: string; sha256: string }): Promise<{ submissionId: string | null; reason: BindReason }> {
  const { data: u, error: userError } = await supabaseAdmin.from('users').select('name').eq('id', p.userId).maybeSingle()
  if (userError) throw new PreparedStoreError('bind_user', userError.code)
  const { data, error } = await supabaseAdmin.rpc('create_creator_record_v2_submission', {
    p_prepared_id: p.preparedId, p_user_id: p.userId, p_sha256: p.sha256, p_filmmaker_name: (u as { name?: string | null } | null)?.name ?? '',
  })
  const row = (Array.isArray(data) ? data[0] : data) as { out_submission_id?: string | null; out_reason?: string } | undefined
  if (error || !row || !BIND_REASONS.includes(row.out_reason as BindReason)) throw new PreparedStoreError('bind', error?.code)
  return { submissionId: row.out_submission_id ?? null, reason: row.out_reason as BindReason }
}

export async function hasPilotAccess(userId: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin.from(PILOT_ACCESS_TABLE).select('user_id').eq('user_id', userId).maybeSingle()
  if (error) throw new PreparedStoreError('pilot_access', error.code)
  return !!data
}

export function productionFlowDeps(): FlowDeps {
  return {
    submissions: CREATOR_RECORD_V2_SUBMISSIONS,
    hasPilotAccess,
    store: preparedStore,
    inputs: () => approvedCustomerRecordInputs(),
    topicClaims: TOPIC_CLAIMS_FIXTURE,
    now: () => new Date(),
    newId: () => randomUUID(),
    log: (event, detail) => console.warn(event, detail),
  }
}

/** CR-V2-MVP-M3: purchase ports (bind + checkout preconditions). */
export function productionPurchaseDeps(): PurchaseDeps {
  return {
    submissions: CREATOR_RECORD_V2_SUBMISSIONS,
    issuance: CREATOR_RECORD_V2_ISSUANCE,
    hasPilotAccess,
    getPrepared: (id) => preparedStore.get(id),
    latestVersion: (draftId) => preparedStore.latestVersion(draftId),
    boundTo: preparedBoundTo,
    bind: bindPreparedToSubmission,
    governance: (date) => approvedGovernanceSnapshot(date, TOPIC_CLAIMS_FIXTURE),
    now: () => new Date(),
    log: (event, detail) => console.warn(event, detail),
  }
}

/** CR-V2-MVP-M3: issuance ports for the v2 renderer. */
export function productionV2IssuanceDeps(): V2IssuanceDeps {
  return {
    boundTo: preparedBoundTo,
    governance: (date) => approvedGovernanceSnapshot(date, TOPIC_CLAIMS_FIXTURE),
    templates: () => approvedPdfTemplates(),
    // Loaded on first render only.
    renderPdf: async (input) => (await (await import('@/lib/creator-record/customer-pdf/CustomerRecordPDF')).renderCustomerRecordPdf(input)).bytes,
  }
}

/** CR-V2-MVP-M3: the v2 renderer body (registered in lib/creator-record-artifacts/renderers.ts). */
export function renderCreatorRecordV2Pdf(sub: CheckoutSubmission, recordId: string, issuedAt: Date): Promise<Uint8Array> {
  return renderV2ForIssuance(productionV2IssuanceDeps(), sub, recordId, issuedAt)
}
