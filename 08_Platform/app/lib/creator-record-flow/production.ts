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
import { legalPoliciesApproved } from '@/lib/legal/policies'
import { authorizeV2Issuance, purchaseOfferable, renderV2ForIssuance, type BindReason, type CheckoutSubmission, type PurchaseDeps, type V2IssuanceDeps } from '@/lib/creator-record/customer-flow/purchase'
import { CREATOR_RECORD_V2_ISSUANCE } from '@/lib/creator-record-artifacts/config'
import { hasPilotAccess, PILOT_ACCESS_TABLE } from './pilot-access'
import { evidenceObjects, evidenceStore } from './evidence-production'
import { productionExaminationProjections, productionReadingsIntact } from '@/lib/creator-record-flow/examination-customer'
import { verifyEvidenceIntact, type EvidenceIntegrity } from '@/lib/creator-record/evidence-intake/service'

type EvidenceItems = readonly { document_id: string; sha256: string; byte_size: number }[]

/**
 * CR-V2-DOC-1B: referenced documents still held intact (row stored, same fingerprint, bytes present and re-hashed).
 * CR-V2-MVP-RETENTION-M1A (8N): and the creator has not withdrawn AI-processing consent for any of them (`consent_withdrawn`):
 * checkout and issuance pause. A lookup error is `unavailable` (fail closed). The database guards at binding and artifact issuance
 * are the authority; this gives the application its refusal code.
 */
const evidenceIntact = async (userId: string, items: EvidenceItems): Promise<EvidenceIntegrity> => {
  const held = await verifyEvidenceIntact({ store: evidenceStore, objects: evidenceObjects }, userId, items)
  if (!held.ok || items.length === 0) return held
  const { data, error } = await supabaseAdmin.rpc('creator_record_v2_documents_consent_withdrawn', { p_document_ids: items.map((i) => i.document_id) })
  if (error || typeof data !== 'boolean') return { ok: false, reason: 'unavailable' }
  return data ? { ok: false, reason: 'consent_withdrawn' } : held
}

export { hasPilotAccess, PILOT_ACCESS_TABLE }

export const PREPARED_TABLE = 'creator_record_v2_prepared'

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

/** One user's most recent prepared versions, newest first (admin UAT only). */
export async function preparedVersionsOf(userId: string, limit: number): Promise<PreparedRow[]> {
  const { data, error } = await supabaseAdmin.from(PREPARED_TABLE).select(COLUMNS).eq('user_id', userId).order('created_at', { ascending: false }).limit(limit)
  if (error) throw new PreparedStoreError('list', error.code)
  return (data ?? []) as PreparedRow[]
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
    // CR-V2-DOC-1: read only to resolve a version's document references.
    evidence: evidenceStore,
    // CR-V2-EXAM-INTEGRATION-X3: the persisted, re-verified projection of an owned document's run (only when asked).
    examinations: productionExaminationProjections,
    // CR-V2-SCHEMA8-PATH-1 (E2): whether the page may offer payment; the same pure conditions the purchase steps check (display only).
    purchaseOfferable: (row) => purchaseOfferable(productionPurchaseDeps(), row),
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
    evidenceIntact,
    // CR-V2-MVP-M4A: referenced readings re-checked by kind; the approved templates for the version's own schema must render it.
    examinationsIntact: productionReadingsIntact,
    templates: (schema) => approvedPdfTemplates(undefined, schema),
    // CR-V2-SCHEMA8-PATH-1 (E4): nothing is sold until the approved privacy notice and terms are published.
    legalPoliciesApproved: () => legalPoliciesApproved(),
  }
}

/** CR-V2-MVP-M3: issuance ports for the v2 renderer. */
export function productionV2IssuanceDeps(): V2IssuanceDeps {
  return {
    boundTo: preparedBoundTo,
    latestVersion: (draftId) => preparedStore.latestVersion(draftId),
    governance: (date) => approvedGovernanceSnapshot(date, TOPIC_CLAIMS_FIXTURE),
    // CR-V2-MVP-M4A: the one approved template set for the record's own schema.
    templates: (schema) => approvedPdfTemplates(undefined, schema),
    // Loaded on first render only.
    renderPdf: async (input) => (await (await import('@/lib/creator-record/customer-pdf/CustomerRecordPDF')).renderCustomerRecordPdf(input)).bytes,
    evidenceIntact,
    examinationsIntact: productionReadingsIntact,
  }
}

/** CR-V2-MVP-M3: the v2 renderer body (registered in lib/creator-record-artifacts/renderers.ts). */
export function renderCreatorRecordV2Pdf(sub: CheckoutSubmission, recordId: string, issuedAt: Date): Promise<Uint8Array> {
  return renderV2ForIssuance(productionV2IssuanceDeps(), sub, recordId, issuedAt)
}

/** CR-V2-MVP-ELIGIBILITY-1: the same conditions, without rendering, immediately before an artifact is marked issued. */
export async function authorizeCreatorRecordV2Issuance(sub: CheckoutSubmission, issuedAt: Date): Promise<void> {
  await authorizeV2Issuance(productionV2IssuanceDeps(), sub, issuedAt)
}
