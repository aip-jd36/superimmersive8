/**
 * CR-V2-MVP-M2 — Creator Record v2 customer flow: prepare, view and review.
 *
 * PURE apart from the injected ports (store, pilot access, clock, ids); unit-tested
 * with fakes. The routes are thin: they take the creator from the authenticated
 * session and call these functions with production ports.
 *
 * Server authority:
 *   - The creator is the session user, never a request field.
 *   - The request carries only the questionnaire state and, for a correction, the
 *     draft it corrects. Record ids, versions, digests, statuses and approvals are
 *     never read from a request.
 *   - The record is built here, from the approved sources only, by the existing
 *     fail-closed builder. Unapproved, pilot or empty sources prepare nothing.
 *
 * Versions:
 *   - Each submission of answers creates a NEW immutable version of a draft. A
 *     version is never edited; a correction is the next version.
 *   - Review freezes exactly one version (the draft's latest). A reviewed version
 *     stays as it is; correcting it afterwards creates a further version that
 *     must itself be reviewed.
 *   - Every read re-verifies the stored canonical record against its digest and
 *     the row's own identity columns; a mismatch fails closed.
 */

import type { FormIssue } from '../prototype/form'
import { parseFormState } from '../prototype/parse-form-state'
import type { CreatorRecordFormState } from '../prototype/form'
import type { CreatorRecordSources } from '../prototype/build-draft'
import { buildCustomerRecord, verifyCustomerRecord, CUSTOMER_RECORD_SCHEMA, type CustomerRecordV2 } from '../customer-record/record'
import type { SourceTextInput, TopicClaims } from '../customer-record/sources'
import { parseEvidenceReferences } from '../evidence-intake/contract'
import { resolveEvidenceReferences, type EvidenceStore } from '../evidence-intake/service'

export type PreparedStatus = 'prepared' | 'reviewed'

export interface PreparedRow {
  id: string
  user_id: string
  draft_id: string
  version: number
  record_ref: string
  record_schema: string
  record_schema_version: number
  canonical: string
  sha256: string
  form_state: CreatorRecordFormState
  status: PreparedStatus
  created_at: string
  reviewed_at: string | null
  submission_id: string | null
}

export type NewPreparedRow = Omit<PreparedRow, 'status' | 'created_at' | 'reviewed_at' | 'submission_id'>

export interface PreparedStore {
  insert(row: NewPreparedRow): Promise<PreparedRow>
  get(id: string): Promise<PreparedRow | null>
  /** The highest version of a draft, or null. */
  latestVersion(draftId: string): Promise<PreparedRow | null>
  /** Marks a version reviewed only if it is still 'prepared' and owned by `userId`; null otherwise. */
  markReviewed(id: string, userId: string): Promise<PreparedRow | null>
}

export interface ApprovedInputs {
  sources: CreatorRecordSources
  source_text: SourceTextInput | null
}

export type SubmissionsMode = 'open' | 'stopped'

export interface FlowDeps {
  submissions: SubmissionsMode
  hasPilotAccess(userId: string): Promise<boolean>
  store: PreparedStore
  inputs(): ApprovedInputs
  topicClaims: TopicClaims
  now(): Date
  newId(): string
  log?(event: string, detail: Record<string, unknown>): void
  /**
   * CR-V2-DOC-1: the creator's stored documents, read only to resolve a version's references. Absent → a
   * version that references any document is refused (fail closed).
   */
  evidence?: Pick<EvidenceStore, 'get'>
}

export interface PreparedView {
  id: string
  draft_id: string
  version: number
  status: PreparedStatus
  record_ref: string
  created_at: string
  reviewed_at: string | null
  /** The answers as submitted, for correcting them. */
  form_state: CreatorRecordFormState
  /** Exactly as recorded in the prepared record. */
  declarations: {
    answers: { q_id: string; tool_index: number | null; question: string; answer: string }[]
    acknowledgements: { id: string; text: string }[]
  }
  /** CR-V2-DOC-1: the documents this version references, exactly as recorded (inventory only, not examined). */
  documents: { document_id: string; file_name: string; media_type: string; byte_size: number; sha256: string; category: string; tool_index: number | null }[]
  guidance_items: number
}

export type FlowError =
  | { ok: false; status: 400; code: 'invalid_request' | 'invalid_documents' }
  | { ok: false; status: 400; code: 'invalid_answers'; issues: FormIssue[] }
  | { ok: false; status: 403; code: 'not_invited' }
  | { ok: false; status: 404; code: 'not_found' }
  | { ok: false; status: 409; code: 'superseded' | 'conflict' }
  | { ok: false; status: 500; code: 'integrity_failure' }
  | { ok: false; status: 503; code: 'submissions_stopped' | 'unavailable' }

export type FlowResult = { ok: true; view: PreparedView } | FlowError

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

type WithoutOk<T> = T extends unknown ? Omit<T, 'ok'> : never
const err = (e: WithoutOk<FlowError>): FlowError => ({ ok: false, ...e }) as FlowError

async function gate(deps: FlowDeps, userId: string): Promise<FlowError | null> {
  if (deps.submissions !== 'open') return err({ status: 503, code: 'submissions_stopped' })
  if (!(await deps.hasPilotAccess(userId))) return err({ status: 403, code: 'not_invited' })
  return null
}

function viewOf(row: PreparedRow, record: CustomerRecordV2): PreparedView {
  return {
    id: row.id,
    draft_id: row.draft_id,
    version: row.version,
    status: row.status,
    record_ref: row.record_ref,
    created_at: row.created_at,
    reviewed_at: row.reviewed_at,
    form_state: row.form_state,
    declarations: {
      answers: record.declarations.answers.map((a) => ({ q_id: a.q_id, tool_index: a.tool_index, question: a.question, answer: a.answer_verbatim })),
      acknowledgements: record.declarations.acknowledgements.map((a) => ({ id: a.id, text: a.text })),
    },
    documents: record.documents.items.map((d) => ({ document_id: d.document_id, file_name: d.file_name, media_type: d.media_type, byte_size: d.byte_size, sha256: d.sha256, category: d.category, tool_index: d.tool_index })),
    guidance_items: record.guidance.items.length,
  }
}

/** The stored record, re-verified against its digest and the row's identity columns. Null on any mismatch. */
export function verifiedRecord(row: PreparedRow): CustomerRecordV2 | null {
  const v = verifyCustomerRecord(row.canonical, row.sha256)
  if (!v.ok) return null
  const r = v.record
  if (r.schema !== row.record_schema || r.schema_version !== row.record_schema_version) return null
  if (r.record.record_ref !== row.record_ref || r.record.record_version !== row.version) return null
  return r
}

async function ownedVerified(deps: FlowDeps, userId: string, id: unknown): Promise<{ row: PreparedRow; record: CustomerRecordV2 } | FlowError> {
  if (typeof id !== 'string' || !UUID.test(id)) return err({ status: 404, code: 'not_found' })
  const row = await deps.store.get(id)
  // Another creator's record is indistinguishable from a missing one.
  if (!row || row.user_id !== userId) return err({ status: 404, code: 'not_found' })
  const record = verifiedRecord(row)
  if (!record) {
    deps.log?.('creator_record_v2_integrity_failure', { prepared_id: row.id })
    return err({ status: 500, code: 'integrity_failure' })
  }
  return { row, record }
}

/**
 * Prepare a new version from submitted answers. `body` is the untrusted request body:
 * `{ state, draft_id?, documents? }`, where `documents` references the creator's OWN stored documents
 * (CR-V2-DOC-1). Each reference is resolved here against the evidence store and recorded with its SHA-256;
 * the database re-checks the same at insert. A foreign, missing, pending or deleted document refuses.
 */
export async function preparePrepared(deps: FlowDeps, userId: string, body: unknown): Promise<FlowResult> {
  const gated = await gate(deps, userId)
  if (gated) return gated

  if (!body || typeof body !== 'object' || Array.isArray(body)) return err({ status: 400, code: 'invalid_request' })
  const b = body as Record<string, unknown>
  if (Object.keys(b).some((k) => k !== 'state' && k !== 'draft_id' && k !== 'documents')) return err({ status: 400, code: 'invalid_request' })
  const draftParam = b.draft_id
  if (draftParam !== undefined && draftParam !== null && (typeof draftParam !== 'string' || !UUID.test(draftParam))) return err({ status: 400, code: 'invalid_request' })

  // The prototype's display-only examined documents are never accepted in the state.
  if (b.state && typeof b.state === 'object' && !Array.isArray(b.state) && Object.prototype.hasOwnProperty.call(b.state, 'documents')) return err({ status: 400, code: 'invalid_request' })
  const parsed = parseFormState(b.state)
  if (!parsed.ok || parsed.documents.length > 0) return err({ status: 400, code: 'invalid_request' })

  // CR-V2-DOC-1: references to the creator's own stored documents.
  const refs = parseEvidenceReferences(b.documents, parsed.state.tools.length)
  if (!refs) return err({ status: 400, code: 'invalid_documents' })
  let documents: Awaited<ReturnType<typeof resolveEvidenceReferences>> = { ok: true, documents: [] }
  if (refs.length > 0) {
    if (!deps.evidence) return err({ status: 400, code: 'invalid_documents' })
    documents = await resolveEvidenceReferences(deps.evidence, userId, refs)
    if (!documents.ok) return err({ status: 400, code: 'invalid_documents' })
  }

  let draftId: string
  let version: number
  if (typeof draftParam === 'string') {
    const latest = await deps.store.latestVersion(draftParam)
    if (!latest || latest.user_id !== userId) return err({ status: 404, code: 'not_found' })
    draftId = draftParam
    version = latest.version + 1
  } else {
    draftId = deps.newId()
    version = 1
  }

  const id = deps.newId()
  const now = deps.now()
  const inputs = deps.inputs()
  const built = buildCustomerRecord({
    state: parsed.state,
    sources: inputs.sources,
    source_text: inputs.source_text,
    topicClaims: deps.topicClaims,
    as_of: now.toISOString().slice(0, 10),
    record: { record_id: `PREP-${id}`, record_version: version, captured_at: now.toISOString() },
    documents: documents.documents,
  })
  if (!built.ok) {
    if (built.stage === 'form') return err({ status: 400, code: 'invalid_answers', issues: built.issues })
    if (built.stage === 'sources') {
      deps.log?.('creator_record_v2_sources_unavailable', { codes: Array.from(new Set(built.refusals.map((r) => r.code))).sort() })
      return err({ status: 503, code: 'unavailable' })
    }
    if (built.issues.some((i) => i.startsWith('documents'))) return err({ status: 400, code: 'invalid_documents' })
    return err({ status: 400, code: 'invalid_request' })
  }

  // Defensive: store only a record that verifies exactly as built.
  const check = verifyCustomerRecord(built.canonical, built.sha256)
  if (!check.ok) throw new Error('creator_record_v2_prepared_record_unverifiable')

  const row = await deps.store.insert({
    id,
    user_id: userId,
    draft_id: draftId,
    version,
    record_ref: `PREP-${id}`,
    record_schema: CUSTOMER_RECORD_SCHEMA,
    record_schema_version: built.record.schema_version,
    canonical: built.canonical,
    sha256: built.sha256,
    form_state: parsed.state,
  })
  const record = verifiedRecord(row)
  if (!record) return err({ status: 500, code: 'integrity_failure' })
  return { ok: true, view: viewOf(row, record) }
}

/** The owner's view of one prepared version. */
export async function getPrepared(deps: FlowDeps, userId: string, id: unknown): Promise<FlowResult> {
  const r = await ownedVerified(deps, userId, id)
  if ('ok' in r) return r
  return { ok: true, view: viewOf(r.row, r.record) }
}

/** Freeze the draft's latest version as reviewed. Idempotent for an already reviewed version. */
export async function reviewPrepared(deps: FlowDeps, userId: string, id: unknown): Promise<FlowResult> {
  const gated = await gate(deps, userId)
  if (gated) return gated
  const r = await ownedVerified(deps, userId, id)
  if ('ok' in r) return r
  if (r.row.status === 'reviewed') return { ok: true, view: viewOf(r.row, r.record) }

  const latest = await deps.store.latestVersion(r.row.draft_id)
  if (!latest || latest.id !== r.row.id) return err({ status: 409, code: 'superseded' })

  const updated = await deps.store.markReviewed(r.row.id, userId)
  if (!updated) return err({ status: 409, code: 'conflict' })
  const record = verifiedRecord(updated)
  if (!record || updated.sha256 !== r.row.sha256) return err({ status: 500, code: 'integrity_failure' })
  return { ok: true, view: viewOf(updated, record) }
}
