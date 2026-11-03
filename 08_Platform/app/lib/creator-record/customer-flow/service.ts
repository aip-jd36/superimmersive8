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
 *
 * CR-V2-EXAM-INTEGRATION-X3 (examination in a record):
 *   - `include_examinations: true` asks the SERVER to attach, for each referenced document, the bounded projection of
 *     the creator's one persisted, re-verified run (X0; `deps.examinations`). The browser never supplies a projection,
 *     a comparison or an envelope. Comparisons are derived by the builder from THIS version's declarations.
 *   - `responses` (closed codes) are recorded for THIS version only and must target an observation or comparison that
 *     exists in it. A response is therefore given by preparing a new version. Earlier responses are never copied: the
 *     server only LISTS those whose target is unchanged (`carry_forward_candidates`) for explicit re-affirmation.
 *   - Without `include_examinations` (or with no examined document) the record is the v5 record, byte for byte.
 *
 * CR-V2-UAT-PROD-MIN-1 (identity-scoped synthetic UAT, `./synthetic-uat`): while the submissions stop is in force,
 * `deps.syntheticUat` may admit ONE named identity inside ONE fixed window, still requiring the pilot invitation; that
 * request alone is served the synthetic test inputs. A version built from synthetic sources is readable only by a
 * request admitted to synthetic inputs, so expiry or a removed invitation also closes retrieval and review.
 */

import type { FormIssue } from '../prototype/form'
import { parseFormState } from '../prototype/parse-form-state'
import type { CreatorRecordFormState } from '../prototype/form'
import type { CreatorRecordSources } from '../prototype/build-draft'
import { buildCustomerRecord, verifyCustomerRecord, CUSTOMER_RECORD_SCHEMA, type CustomerRecordV2 } from '../customer-record/record'
import type { SourceTextInput, TopicClaims } from '../customer-record/sources'
import { parseEvidenceReferences } from '../evidence-intake/contract'
import { carryForwardCandidates, CREATOR_RESPONSE_CODES, type CreatorResponseInput, type CustomerRecordExaminationInput } from '../customer-record/examination-section'
import type { DocumentProjection } from './examination'
import { isSyntheticRecordAuthority, type SyntheticUatPorts } from './synthetic-uat'
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
  /** CR-V2-UAT-PROD-MIN-1: the wording approval for an examination-bearing (v6) version, when the inputs have one. */
  source_text_examination?: SourceTextInput | null
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
  /**
   * CR-V2-EXAM-INTEGRATION-X3: the bounded projection of the creator's persisted run for a document they own.
   * Absent → a version asking to include examinations is refused (fail closed).
   */
  examinations?: { projectionFor(userId: string, documentId: string): Promise<DocumentProjection> }
  /** CR-V2-UAT-PROD-MIN-1: the identity-scoped synthetic UAT exception. Absent or inert = none. */
  syntheticUat?: SyntheticUatPorts
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
  /**
   * CR-V2-EXAM-INTEGRATION-X3: present only on an examination-bearing version (record schema v6), exactly as recorded:
   * each examined document's unverified observations and limitations, the comparisons derived from THIS version's
   * declarations, and THIS version's creator responses. Never a verification, finding or clearance.
   */
  examination?: ExaminationView
  /** Earlier responses whose target is unchanged in this version: listed for explicit re-affirmation, never applied. */
  carry_forward_candidates?: CreatorResponseInput[]
}

export interface ExaminationView {
  documents: {
    document_id: string
    run_id: string
    verification: 'not_verified'
    outcome: { status: string; reason: string | null }
    observations: { observation_id: string; field: string; qualifier: string | null; basis: string; status: string; value: string | null; excerpt: string | null; verification: 'not_verified' }[]
    limitations: string[]
  }[]
  comparisons: { tool_index: number; document_id: string; run_id: string; declared: { tool_id: string | null; plan: string | null }; provider: { result: string; reason: string }; plan: { result: string; reason: string } }[]
  responses: { target: CreatorResponseInput['target']; code: CreatorResponseInput['code']; given_in_version: number }[]
  response_codes: readonly string[]
}

export type FlowError =
  | { ok: false; status: 400; code: 'invalid_request' | 'invalid_documents' | 'invalid_responses' }
  | { ok: false; status: 400; code: 'invalid_answers'; issues: FormIssue[] }
  | { ok: false; status: 403; code: 'not_invited' }
  | { ok: false; status: 404; code: 'not_found' }
  | { ok: false; status: 409; code: 'superseded' | 'conflict' | 'examination_unavailable' }
  | { ok: false; status: 500; code: 'integrity_failure' }
  | { ok: false; status: 503; code: 'submissions_stopped' | 'unavailable' }

export type FlowResult = { ok: true; view: PreparedView } | FlowError

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

type WithoutOk<T> = T extends unknown ? Omit<T, 'ok'> : never
const err = (e: WithoutOk<FlowError>): FlowError => ({ ok: false, ...e }) as FlowError

/** Who may use the customer flow now, and with which approved inputs. The pilot invitation is always required. */
interface Admission { uat: boolean; inputs: () => ApprovedInputs }
async function admit(deps: FlowDeps, userId: string): Promise<Admission | FlowError> {
  const uat = deps.submissions !== 'open' && deps.syntheticUat !== undefined && deps.syntheticUat.admits(userId, deps.now())
  if (deps.submissions !== 'open' && !uat) return err({ status: 503, code: 'submissions_stopped' })
  if (!(await deps.hasPilotAccess(userId))) return err({ status: 403, code: 'not_invited' })
  return { uat, inputs: uat ? deps.syntheticUat!.inputs : deps.inputs }
}
const refused = (a: Admission | FlowError): a is FlowError => 'ok' in a

/**
 * CR-V2-UAT-PROD-MIN-1: a version built from synthetic sources is readable only by a request admitted to synthetic
 * inputs (an open UAT window for this identity, or an environment whose own inputs are synthetic). Otherwise it is
 * closed: the stop's answer when no admission exists, not_found when admitted only to non-synthetic inputs.
 */
async function syntheticClosed(deps: FlowDeps, userId: string, record: CustomerRecordV2): Promise<FlowError | null> {
  if (!isSyntheticRecordAuthority(record.sources.source_text.authority)) return null
  const a = await admit(deps, userId)
  if (refused(a)) return a
  const own = a.inputs().source_text?.approval?.authority
  return isSyntheticRecordAuthority(own) ? null : err({ status: 404, code: 'not_found' })
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
    ...(record.schema_version === 6 ? { examination: examinationViewOf(record) } : {}),
  }
}

/** CR-V2-EXAM-INTEGRATION-X3: the examination-bearing parts of a verified v6 record, as recorded (no interpretation). */
function examinationViewOf(record: CustomerRecordV2): ExaminationView {
  const documents: ExaminationView['documents'] = []
  for (const d of record.documents.items) {
    if (typeof d.examination !== 'object' || d.examination === null) continue
    const e = d.examination.envelope
    documents.push({
      document_id: d.document_id,
      run_id: d.examination.run_id,
      verification: d.examination.verification,
      outcome: { status: e.outcome.status, reason: e.outcome.reason },
      observations: e.observations.map((o) => ({ observation_id: o.observation_id, field: o.field, qualifier: o.qualifier, basis: o.basis, status: o.status, value: o.value, excerpt: o.excerpt, verification: o.verification })),
      limitations: [...e.limitations],
    })
  }
  const comparisons = record.comparison.policy === 'derived_per_version' ? record.comparison.items : []
  return {
    documents,
    comparisons: comparisons.map((c) => ({ tool_index: c.tool_index, document_id: c.document_id, run_id: c.run_id, declared: { ...c.declared }, provider: { result: c.provider.result, reason: c.provider.reason }, plan: { result: c.plan.result, reason: c.plan.reason } })),
    responses: (record.creator_responses?.items ?? []).map((r) => ({ target: r.target, code: r.code, given_in_version: r.given_in_version })),
    response_codes: CREATOR_RESPONSE_CODES,
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
  const admission = await admit(deps, userId)
  if (refused(admission)) return admission

  if (!body || typeof body !== 'object' || Array.isArray(body)) return err({ status: 400, code: 'invalid_request' })
  const b = body as Record<string, unknown>
  // CR-V2-EXAM-INTEGRATION-X3: `include_examinations` and `responses` are the only additions. A projection, a
  // comparison or an examination envelope is never accepted from the request.
  if (Object.keys(b).some((k) => k !== 'state' && k !== 'draft_id' && k !== 'documents' && k !== 'include_examinations' && k !== 'responses')) return err({ status: 400, code: 'invalid_request' })
  if (b.include_examinations !== undefined && b.include_examinations !== true) return err({ status: 400, code: 'invalid_request' })
  const includeExaminations = b.include_examinations === true
  if (b.responses !== undefined && (!includeExaminations || !Array.isArray(b.responses))) return err({ status: 400, code: 'invalid_responses' })
  const responses = (b.responses ?? []) as CreatorResponseInput[]
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

  // CR-V2-EXAM-INTEGRATION-X3: the server attaches each referenced document's persisted, re-verified projection.
  const examinations: CustomerRecordExaminationInput[] = []
  if (includeExaminations) {
    if (!deps.examinations) return err({ status: 409, code: 'examination_unavailable' })
    for (const d of documents.documents) {
      let p: DocumentProjection
      try {
        p = await deps.examinations.projectionFor(userId, d.document_id)
      } catch {
        p = { kind: 'unavailable', reason: 'storage_unavailable' }
      }
      if (p.kind === 'unavailable') {
        deps.log?.('creator_record_v2_examination_projection_unavailable', { reason: p.reason })
        return err({ status: 409, code: 'examination_unavailable' })
      }
      if (p.kind === 'projection') examinations.push({ document_id: d.document_id, projection: p.projection })
    }
  }

  let draftId: string
  let version: number
  let previous: PreparedRow | null = null
  if (typeof draftParam === 'string') {
    const latest = await deps.store.latestVersion(draftParam)
    if (!latest || latest.user_id !== userId) return err({ status: 404, code: 'not_found' })
    draftId = draftParam
    version = latest.version + 1
    previous = latest
  } else {
    draftId = deps.newId()
    version = 1
  }

  const id = deps.newId()
  const now = deps.now()
  const inputs = admission.inputs()
  // CR-V2-UAT-PROD-MIN-1: an examination-bearing version uses the inputs' v6 approval when they have one.
  const examinationBearing = examinations.length > 0 || responses.length > 0
  const sourceText = examinationBearing && inputs.source_text_examination ? inputs.source_text_examination : inputs.source_text
  const built = buildCustomerRecord({
    state: parsed.state,
    sources: inputs.sources,
    source_text: sourceText,
    topicClaims: deps.topicClaims,
    as_of: now.toISOString().slice(0, 10),
    record: { record_id: `PREP-${id}`, record_version: version, captured_at: now.toISOString() },
    documents: documents.documents,
    ...(examinations.length > 0 ? { examinations } : {}),
    ...(responses.length > 0 ? { responses } : {}),
  })
  if (!built.ok) {
    if (built.stage === 'form') return err({ status: 400, code: 'invalid_answers', issues: built.issues })
    if (built.stage === 'sources') {
      deps.log?.('creator_record_v2_sources_unavailable', { codes: Array.from(new Set(built.refusals.map((r) => r.code))).sort() })
      return err({ status: 503, code: 'unavailable' })
    }
    if (built.issues.some((i) => i.startsWith('documents'))) return err({ status: 400, code: 'invalid_documents' })
    if (built.issues.some((i) => i.startsWith('responses'))) return err({ status: 400, code: 'invalid_responses' })
    if (built.issues.some((i) => i.startsWith('examinations'))) return err({ status: 409, code: 'examination_unavailable' })
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
  // CR-V2-EXAM-INTEGRATION-X3: earlier responses whose target is unchanged, LISTED for re-affirmation; never applied.
  const prior = previous ? verifiedRecord(previous) : null
  const candidates = prior && prior.schema_version === 6 && record.schema_version === 6 ? carryForwardCandidates(prior, record) : []
  return { ok: true, view: { ...viewOf(row, record), ...(candidates.length > 0 ? { carry_forward_candidates: candidates } : {}) } }
}

/** The owner's view of one prepared version. */
export async function getPrepared(deps: FlowDeps, userId: string, id: unknown): Promise<FlowResult> {
  const r = await ownedVerified(deps, userId, id)
  if ('ok' in r) return r
  const closed = await syntheticClosed(deps, userId, r.record)
  if (closed) return closed
  return { ok: true, view: viewOf(r.row, r.record) }
}

/** Freeze the draft's latest version as reviewed. Idempotent for an already reviewed version. */
export async function reviewPrepared(deps: FlowDeps, userId: string, id: unknown): Promise<FlowResult> {
  const admission = await admit(deps, userId)
  if (refused(admission)) return admission
  const r = await ownedVerified(deps, userId, id)
  if ('ok' in r) return r
  const closed = await syntheticClosed(deps, userId, r.record)
  if (closed) return closed
  if (r.row.status === 'reviewed') return { ok: true, view: viewOf(r.row, r.record) }

  const latest = await deps.store.latestVersion(r.row.draft_id)
  if (!latest || latest.id !== r.row.id) return err({ status: 409, code: 'superseded' })

  const updated = await deps.store.markReviewed(r.row.id, userId)
  if (!updated) return err({ status: 409, code: 'conflict' })
  const record = verifiedRecord(updated)
  if (!record || updated.sha256 !== r.row.sha256) return err({ status: 500, code: 'integrity_failure' })
  return { ok: true, view: viewOf(updated, record) }
}
