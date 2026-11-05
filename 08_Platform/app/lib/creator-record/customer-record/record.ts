/**
 * CR-V2-1 — the deterministic Creator Record v2 CUSTOMER RECORD.
 *
 * NOT APPROVED CUSTOMER CONTENT. This prepares the canonical, hashable record a
 * later milestone may issue. It does not render, store, deliver or approve
 * anything, and it is not the internal draft (`../internal-draft`), whose PDF
 * is internal only.
 *
 * Pure: no database, payment, Storage, email, PDF, network, clock or randomness.
 *
 * Schemas: this builder writes 7 (declarations) and 8 (examination-bearing) only. 5 and 6 are historical formats, kept
 * readable exactly as stored; nothing writes them, and they are never upgraded or stamped.
 *
 * Contract:
 *   - Sources: approved governed sources only (`./sources`), or nothing is built.
 *   - Declarations: the existing form validation and declaration mapping
 *     (`../prototype/declared-guidance`), unchanged. They come only from the
 *     creator's answers.
 *   - Documents: none are accepted. Every declared tool is recorded as
 *     `not_provided` (Option C: documents cannot create declarations).
 *   - Comparisons: disabled. Nothing is reconciled and nothing can influence
 *     guidance (guidance runs on declarations alone).
 *   - CR-V2-EXAM-INTEGRATION-X0: an EXAMINATION-BEARING record (schema v6) is built only when the caller supplies
 *     projections of persisted, integrity-checked examination runs (`./examination-section`). It adds, SEPARATELY
 *     from the declarations: each document's projection (verbatim, `not_verified`), comparisons derived here from
 *     this version's declarations, and this version's closed-code creator responses. Guidance still runs on
 *     declarations alone and is identical with or without them. Without examinations the record is the v5 record,
 *     byte for byte. v6 is not an issuable schema (`./governance-state`), and no route supplies examinations.
 *   - Guidance: exactly the composition the existing pipeline produced, read
 *     through an exact-key projection, then re-checked here: the conclusion
 *     can never be stronger than Bounded Interpretation and the selector's
 *     applicability permit, and every explanation and caveat is the approved
 *     ledger and source text, verbatim. Any mismatch throws.
 *   - Text: the record contains no SI8-generated prose. Every string is the
 *     creator's own answer, approved source text, an identifier or a fixed code.
 *     Wording is taken from the approved content set (`./source-text`), whose
 *     digest the record carries; acknowledgements are stored with their exact
 *     approved wording. Presentation wording is a later (renderer) milestone.
 *   - Integrity: `verifyCustomerRecord` checks a stored record from the record
 *     and its digest alone. It does not consult any approval: a record prepared
 *     under an approval that is later withdrawn still verifies. Whether such a
 *     record may still be ISSUED is a separate, not yet implemented decision.
 *   - Identity: a preparation reference, never an issued Creator Record id;
 *     the issued id is assigned at issuance and is not part of this hash.
 */

import { CREATOR_RECORD_CONCLUSIONS, biRankForStatus, type GuidanceItem } from '../contract/compose'
import { authorizePublication } from '../contract/publication-ledger'
import type { DeclaredObservation, RecordContext } from '../contract/provenance'
import { isIsoDate } from '../contract/types'
import type { CreatorRecordSources } from '../prototype/build-draft'
import { runDeclaredGuidance } from '../prototype/declared-guidance'
import { toolInstance, type FormIssue } from '../prototype/form'
import { TOOL_QUESTION_ROLES } from '../prototype/questionnaire-structure'
import { parseFormState } from '../prototype/parse-form-state'
import { canonicalJson, sha256Hex, CanonicalizationError } from '../record-core/canonical'
import { arr, int, nullable, obj, oneOf, ProjectionRefusal, str, type P } from '../record-core/projection'
import {
  claimContentDigest, claimRef, observationMapContentDigest, observationMapRef, publicationContentDigest, publicationRef,
  questionContentDigest, questionRef, type DigestedKind,
} from './authority-content'
import { embeddedContractValid, type EmbeddedQuestionnaireContract } from './questionnaire-contract'
import { checkApprovedSources, type SourceRefusal, type SourceTextInput, type TopicClaims } from './sources'
import {
  EVIDENCE_CATEGORIES, EVIDENCE_EXAMINATION_NOT_EXAMINED, EVIDENCE_MAX_BYTES, EVIDENCE_MAX_FILE_NAME_CHARS, EVIDENCE_MAX_PER_RECORD, EVIDENCE_MAX_PER_TOOL, EVIDENCE_MEDIA_TYPES,
  type EvidenceCategory, type EvidenceMediaType,
} from '../evidence-intake/vocabulary'
import type { ExaminationProjection } from '../examination/projection'
import {
  attachExaminations, deriveComparisons, examinationSectionsValid, PERSISTED_COMPARISON_METHOD, recordResponses,
  type CreatorResponse, type CreatorResponseInput, type CustomerComparison, type CustomerRecordExaminationInput,
} from './examination-section'

export const CUSTOMER_RECORD_SCHEMA = 'si8/creator-record-v2-record'
/**
 * v2 (CR-V2-1A): content-addressed source text provenance; acknowledgements with their wording.
 * v3 (CR-V2-1C): builder provenance; content digest of every referenced governed entry.
 * v4 (CR-V2-2E): selection provenance on each guidance item (`selection_basis`).
 * v5 (CR-V2-DOC-1): `documents` is an inventory of the creator's own stored documents, each fixed by its
 *     SHA-256 (never examined in this version; no document reaches guidance).
 */
export const HISTORICAL_RECORD_SCHEMA_VERSION = 5
/**
 * v6 (CR-V2-EXAM-INTEGRATION-X0): the EXAMINATION-BEARING record: v5 plus per-document examination projections,
 * derived comparisons and version-specific creator responses. Used only when examinations are supplied.
 */
export const HISTORICAL_EXAMINATION_SCHEMA_VERSION = 6
/**
 * v7, v8 (CR-V2-DECL-1B-2): v5 and v6 plus `sources.questionnaire_contract`: the approved contract's identity, its approval
 * details, its whole body and the whole wording set, so a record says what it was prepared under without any deployed code.
 * Neither is issuable: not in `CURRENT_ISSUANCE_SUPPORT`, and the customer PDF does not read them.
 */
export const CUSTOMER_RECORD_SCHEMA_VERSION = 7
export const CUSTOMER_RECORD_EXAMINATION_SCHEMA_VERSION = 8
/**
 * The code that prepared the record. Technical provenance only: it grants no
 * commercial authority, and an issuance check can only refuse an unsupported
 * builder, never be satisfied by one. Raise the version with any change to how
 * a record is built or to the guidance pipeline it runs.
 */
export const CUSTOMER_RECORD_BUILDER = { id: 'si8/creator-record-v2-record-builder', version: 5 } as const
/** The builder of a v5 record, which is the only builder issuance supports today. */
export const HISTORICAL_RECORD_BUILDER = { id: 'si8/creator-record-v2-record-builder', version: 3 } as const
/** The content contract: what may appear in the record (no generated prose). Bump with any content change. */
export const CUSTOMER_RECORD_CONTENT = { id: 'si8/creator-record-v2-record-content', version: 4, generated_text: 'none' } as const
/** CR-V2-EXAM-INTEGRATION-X0: the builder and content identities of an examination-bearing record. */
export const CUSTOMER_RECORD_EXAMINATION_BUILDER = { id: 'si8/creator-record-v2-record-builder', version: 6 } as const
export const CUSTOMER_RECORD_EXAMINATION_CONTENT = { id: 'si8/creator-record-v2-record-content', version: 5, generated_text: 'none' } as const
/** Issued Creator Record ids (CR-YYYY-8 hex): assigned at issuance, never part of a prepared record. */
const ISSUED_RECORD_ID = /^CR-\d{4}-[0-9A-F]{8}$/i
const ISO_DATETIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/

export interface CustomerRecordInput {
  /** The questionnaire state, exactly as submitted; parsed strictly here. Documents are not part of the state (see `documents`). */
  state: unknown
  sources: CreatorRecordSources
  /** The approved wording: its Source Text Approval and the acknowledgement wording it covers. */
  source_text: SourceTextInput | null
  topicClaims: TopicClaims
  /** Guidance date (YYYY-MM-DD), supplied by the caller. */
  as_of: string
  /** Preparation reference, record version and capture time (ISO, UTC). */
  record: RecordContext
  /**
   * CR-V2-DOC-1: the creator's own stored documents this version references, already resolved by the caller
   * against the evidence store (owner, stored, SHA-256). Inventory only: never an input to guidance.
   */
  documents?: readonly CustomerRecordDocument[]
  /**
   * CR-V2-EXAM-INTEGRATION-X0: for inventoried documents, the projection of one persisted run each, made by the
   * caller with `projectVerifiedRun` (integrity, owner and document checked). Observations only: never an input
   * to guidance. Supplying any makes the record examination-bearing (v6).
   */
  examinations?: readonly CustomerRecordExaminationInput[]
  /** CR-V2-EXAM-INTEGRATION-X0: this version's creator responses (closed codes). Never carried from another version. */
  responses?: readonly CreatorResponseInput[]
}

/** One inventoried document, fixed by its SHA-256. The category is the creator's description, not a fact. */
export interface CustomerRecordDocument {
  document_id: string
  sha256: string
  media_type: EvidenceMediaType
  byte_size: number
  file_name: string
  category: EvidenceCategory
  tool_index: number | null
}

export interface DeclaredAnswer {
  q_id: string
  q_version: number
  /** Index of the declared tool block, or null for a single question. */
  tool_index: number | null
  /** Approved question wording. */
  question: string
  /** The answer exactly as recorded on its observations. */
  answer_verbatim: string
  values: { value: string; kind: 'option' | 'free_text' | 'not_sure'; label: string | null }[]
}

/**
 * CR-V2-DECL-1A: whether a recorded answer value is the creator's uncertainty. Read-side only: the stored value and the
 * record's digest are untouched. A free-text "Not sure" choice has kind `not_sure`; a closed `not_sure` option has kind
 * `option`. Text the creator typed is never uncertainty, whatever it says.
 */
export function isUncertainValue(v: DeclaredAnswer['values'][number]): boolean {
  return v.kind === 'not_sure' || (v.kind === 'option' && v.value === 'not_sure')
}

export interface CustomerGuidanceItem {
  claim_id: string
  conclusion: GuidanceItem['conclusion']
  /** Approved ledger explanation, verbatim. */
  explanation: string
  /** Approved caveat text, verbatim. */
  caveats: { caveat_id: string; text: string }[]
  applicability: GuidanceItem['applicability']
  declared_applicability_basis: GuidanceItem['declared_applicability_basis']
  dependency_rows: GuidanceItem['dependency_rows']
  /**
   * CR-V2-2E: why this claim was selected: for each scope the governed claim declares, the matched canonical
   * ids and exactly the declared observations that contributed them. Selection evidence only; empty `scopes`
   * means the claim is not scope-restricted.
   */
  selection_basis: { scopes: { scope: 'tool' | 'asset_provider'; matched_ids: string[]; observation_ids: string[] }[] }
  provenance: GuidanceItem['provenance']
}

export interface CustomerRecordV2 {
  schema: typeof CUSTOMER_RECORD_SCHEMA
  schema_version: typeof HISTORICAL_RECORD_SCHEMA_VERSION | typeof HISTORICAL_EXAMINATION_SCHEMA_VERSION | typeof CUSTOMER_RECORD_SCHEMA_VERSION | typeof CUSTOMER_RECORD_EXAMINATION_SCHEMA_VERSION
  status: 'prepared_not_issued'
  content: { id: string; version: number; generated_text: 'none' }
  builder: { id: string; version: number }
  record: { record_ref: string; record_version: number; prepared_on: string; captured_at: string }
  sources: {
    kind: 'governed'
    registry_version: string
    ledger_version: string
    /** The approved wording set: identity, approval and the digest of exactly the texts used. */
    source_text: {
      source_id: string
      version: number
      content_sha256: string
      categories: string[]
      record_schema: { id: string; version: number }
      authority: string
      decision_date: string
      review_ref: string | null
    }
    guidance_as_of: string
    questions: { q_id: string; version: number; approver: string; decision_date: string; review_ref: string | null }[]
    publications: { entry_id: string; version: number; claim_id: string; claim_last_verified: string; approver: string; decision_date: string; refresh_by: string }[]
    /**
     * CR-V2-1C: the content digest of every governed entry the record relied on, by kind,
     * id and version. Version labels alone are not proof of content (`./authority-content`).
     */
    authority_digests: { kind: DigestedKind; id: string; version: string; content_sha256: string }[]
    /** CR-V2-DECL-1B-2: required on v7 and v8, absent on v5 and v6. */
    questionnaire_contract?: EmbeddedQuestionnaireContract
  }
  /** Acknowledgements the creator accepted, with the exact approved wording shown. */
  declarations: { answers: DeclaredAnswer[]; observations: DeclaredObservation[]; acknowledgements: { id: string; text: string }[] }
  /** v5, v7: `inventory_only`, every item `not_examined`. v6, v8: `inventory_with_examination`, each item `not_examined` or a projection. */
  documents: { policy: 'inventory_only' | 'inventory_with_examination'; items: (CustomerRecordDocument & { examination: typeof EVIDENCE_EXAMINATION_NOT_EXAMINED | ExaminationProjection })[] }
  /** v5, v7: disabled. v6, v8: derived from this version's declarations (never supplied, never carried). */
  comparison: { policy: 'disabled' } | { policy: 'derived_per_version'; method: typeof PERSISTED_COMPARISON_METHOD; items: CustomerComparison[] }
  guidance: { items: CustomerGuidanceItem[] }
  /** v6, v8 only: this version's closed-code creator responses. */
  creator_responses?: { policy: 'closed_codes_this_version_only'; items: CreatorResponse[] }
}

export type CustomerRecordResult =
  | { ok: true; record: CustomerRecordV2; canonical: string; sha256: string }
  | { ok: false; stage: 'input'; issues: string[] }
  | { ok: false; stage: 'sources'; refusals: SourceRefusal[] }
  | { ok: false; stage: 'form'; issues: FormIssue[] }

/** An internal invariant failed (the pipeline produced something the record must not carry). Nothing is built. */
export class CustomerRecordInvariantError extends Error {
  constructor(reason: string) {
    super(`creator_record_v2_record_invariant: ${reason}`)
  }
}

// ── The composition, read through an exact-key projection ──

const jsonValue: P<unknown> = (v, path) => {
  try {
    canonicalJson(v)
  } catch (err) {
    if (err instanceof CanonicalizationError) throw new ProjectionRefusal(path, 'not plain data')
    throw err
  }
  return v
}
const dependencyRow = obj({
  dependency_id: str, label: str, declarations: arr(jsonValue), evidence_note: nullable(str),
  evidence_requirement: oneOf(['not_defined_by_governance'] as const), treated_as: oneOf(['evidence_required'] as const),
  sufficiency: oneOf(['not_assessed'] as const), status: oneOf(['open'] as const),
})
const guidanceItem = obj({
  claim_id: str,
  conclusion: oneOf(CREATOR_RECORD_CONCLUSIONS),
  explanation: str,
  required_caveats: arr(str),
  applicability: obj({ status: oneOf(['met', 'unresolved'] as const), material_unresolved: arr(jsonValue) }),
  declared_applicability_basis: arr(jsonValue),
  dependency_rows: arr(dependencyRow),
  // CR-V2-2E: required. A guidance item whose selection evidence was not captured refuses.
  selection_basis: obj({ scopes: arr(obj({ scope: oneOf(['tool', 'asset_provider'] as const), matched_ids: arr(str), observation_ids: arr(str) })) }),
  provenance: obj({
    claim: obj({ claim_id: str, last_verified: str }),
    objective: obj({ objective_id: str, version: int, topic: str, origin: oneOf(['creator_record_system_objective'] as const) }),
    bounded_interpretation: obj({ goal_id: str, status: str, citation: oneOf(['supporting', 'unresolved_relevant'] as const) }),
    publication: obj({ entry_id: str, version: int, approver: str, decision_date: str, refresh_by: str }),
  }),
})

function inputIssues(input: CustomerRecordInput): string[] {
  const issues: string[] = []
  const r = input.record as Partial<RecordContext> | null
  if (!r || typeof r !== 'object') return ['record']
  if (typeof r.record_id !== 'string' || r.record_id.trim() === '') issues.push('record.record_id')
  else if (ISSUED_RECORD_ID.test(r.record_id)) issues.push('record.record_id_is_issued_id')
  if (!Number.isInteger(r.record_version) || (r.record_version as number) < 1) issues.push('record.record_version')
  if (typeof r.captured_at !== 'string' || !ISO_DATETIME.test(r.captured_at)) issues.push('record.captured_at')
  if (!isIsoDate(input.as_of)) issues.push('as_of')
  const s = input.state
  if (s && typeof s === 'object' && !Array.isArray(s) && Object.prototype.hasOwnProperty.call(s, 'documents')) issues.push('state.documents_not_accepted')
  issues.push(...documentIssues(input.documents))
  if (input.examinations !== undefined && !Array.isArray(input.examinations)) issues.push('examinations')
  if (input.responses !== undefined && !Array.isArray(input.responses)) issues.push('responses')
  return issues
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
/** CR-V2-DOC-1: the document inventory, checked strictly (shape, limits, uniqueness). Tool range is checked against the parsed state. */
function documentIssues(docs: CustomerRecordInput['documents']): string[] {
  if (docs === undefined) return []
  if (!Array.isArray(docs) || docs.length > EVIDENCE_MAX_PER_RECORD) return ['documents']
  const issues: string[] = []
  const ids = new Set<string>()
  const perTool = new Map<number, number>()
  docs.forEach((d, i) => {
    const keys = d && typeof d === 'object' ? Object.keys(d).sort().join(',') : ''
    const ok =
      keys === 'byte_size,category,document_id,file_name,media_type,sha256,tool_index' &&
      UUID.test(d.document_id) && !ids.has(d.document_id) &&
      /^[0-9a-f]{64}$/.test(d.sha256) &&
      (EVIDENCE_MEDIA_TYPES as readonly string[]).includes(d.media_type) &&
      Number.isInteger(d.byte_size) && d.byte_size > 0 && d.byte_size <= EVIDENCE_MAX_BYTES &&
      typeof d.file_name === 'string' && d.file_name.trim() !== '' && Array.from(d.file_name).length <= EVIDENCE_MAX_FILE_NAME_CHARS &&
      (EVIDENCE_CATEGORIES as readonly string[]).includes(d.category) &&
      (d.tool_index === null || (Number.isInteger(d.tool_index) && d.tool_index >= 0))
    if (!ok) {
      issues.push(`documents[${i}]`)
      return
    }
    ids.add(d.document_id)
    if (d.tool_index !== null) {
      const n = (perTool.get(d.tool_index) ?? 0) + 1
      perTool.set(d.tool_index, n)
      if (n > EVIDENCE_MAX_PER_TOOL) issues.push(`documents[${i}].tool_index`)
    }
  })
  return issues
}

export function buildCustomerRecord(input: CustomerRecordInput): CustomerRecordResult {
  // 1. Input shape, strictly. Documents are never part of the state; the inventory comes separately and never reaches guidance.
  const shapeIssues = inputIssues(input)
  const parsed = parseFormState(input.state)
  if (!parsed.ok) shapeIssues.push('state')
  if (shapeIssues.length > 0 || !parsed.ok) return { ok: false, stage: 'input', issues: shapeIssues }
  const state = parsed.state
  const documents = input.documents ?? []
  const toolLimit = Math.min(state.tools.length, input.sources.max_tools)
  const outOfRange = documents.map((d, i) => (d.tool_index !== null && d.tool_index >= toolLimit ? `documents[${i}].tool_index` : null)).filter((x): x is string => x !== null)
  if (outOfRange.length > 0) return { ok: false, stage: 'input', issues: outOfRange }
  // CR-V2-EXAM-INTEGRATION-X0: an examination-bearing record only when examinations (or responses) are supplied.
  const examinationInputs = input.examinations ?? []
  const responseInputs = input.responses ?? []
  const examinationBearing = examinationInputs.length > 0 || responseInputs.length > 0
  const schemaVersion = examinationBearing ? CUSTOMER_RECORD_EXAMINATION_SCHEMA_VERSION : CUSTOMER_RECORD_SCHEMA_VERSION
  const attached = attachExaminations(documents, examinationInputs)
  if (!attached.ok) return { ok: false, stage: 'input', issues: attached.issues }

  // 2. Approved governed sources only (approved for the schema this record will have).
  const check = checkApprovedSources(input.sources, input.source_text, input.topicClaims, input.as_of, { id: CUSTOMER_RECORD_SCHEMA, version: schemaVersion })
  if (!check.ok) return { ok: false, stage: 'sources', refusals: check.refusals }
  const { approved } = check
  const text = approved.source_text_content

  // Only acknowledgements the questionnaire defines (and whose wording is approved) can be recorded.
  const unknownAck = Object.keys(state.acknowledgements).filter((id) => !input.sources.acknowledgement_ids.includes(id))
  if (unknownAck.length > 0) return { ok: false, stage: 'input', issues: unknownAck.map((id) => `state.acknowledgements.${id}`) }

  // 3. Existing validation, declaration mapping and guidance, on declarations alone.
  const declared = runDeclaredGuidance({ state, sources: input.sources, topicClaims: input.topicClaims, as_of: input.as_of, record: input.record })
  if (!declared.ok) return { ok: false, stage: 'form', issues: declared.issues }
  const { observations, guidance } = declared

  if (guidance.governance_gaps.some((g) => g.kind === 'ledger_entry_without_governed_claim')) throw new CustomerRecordInvariantError('ledger entry without a governed claim')

  // 4. Declarations, from the recorded observations (registry order, then tool block), worded from the approved content.
  const presentation = input.sources.presentation
  const order = Array.from(approved.registry.questions.keys())
  const groups = new Map<string, DeclaredObservation[]>()
  for (const o of observations) {
    const key = `${o.question.q_id}\u0000${o.instance ?? ''}`
    groups.set(key, [...(groups.get(key) ?? []), o])
  }
  const instanceIndex = (instance: string | null) => {
    if (instance === null) return null
    const i = state.tools.findIndex((_, n) => toolInstance(n) === instance)
    if (i < 0) throw new CustomerRecordInvariantError(`observation for an undeclared tool block ${instance}`)
    return i
  }
  const answers: DeclaredAnswer[] = Array.from(groups.values())
    .map((obs) => {
      const { q_id, q_version } = obs[0].question
      const q = approved.registry.questions.get(q_id)
      if (!q || q.version !== q_version) throw new CustomerRecordInvariantError(`observation for an unknown question ${q_id}`)
      const tool_index = instanceIndex(obs[0].instance)
      const submitted = (tool_index === null ? state.answers[q_id] : state.tools[tool_index][q_id]) ?? []
      const verbatims = new Set(obs.map((o) => o.answer_verbatim))
      if (submitted.length === 0 || verbatims.size !== 1) throw new CustomerRecordInvariantError(`observations for ${q_id} do not match the submitted answer`)
      const p = presentation[q_id]
      const approvedText = text.questions[q_id]
      if (!approvedText || approvedText.q_version !== q_version) throw new CustomerRecordInvariantError(`no approved wording for ${q_id} v${q_version}`)
      const labels = approvedText.option_labels
      const values = submitted.map((v) => {
        if (q.options !== 'free_text') {
          if (!Object.prototype.hasOwnProperty.call(labels, v)) throw new CustomerRecordInvariantError(`no approved label for ${q_id}.${v}`)
          return { value: v, kind: 'option' as const, label: labels[v] }
        }
        if (p.allow_not_sure && v === 'not_sure') return { value: v, kind: 'not_sure' as const, label: Object.prototype.hasOwnProperty.call(labels, v) ? labels[v] : null }
        return { value: v, kind: 'free_text' as const, label: null }
      })
      if (q.options !== 'free_text') {
        const recorded = new Set(obs.map((o) => o.normalized_value))
        if (recorded.size !== submitted.length || submitted.some((v) => !recorded.has(v))) throw new CustomerRecordInvariantError(`observations for ${q_id} do not match the submitted options`)
      }
      return { q_id, q_version, tool_index, question: approvedText.text, answer_verbatim: obs[0].answer_verbatim, values }
    })
    .sort((a, b) => order.indexOf(a.q_id) - order.indexOf(b.q_id) || (a.tool_index ?? -1) - (b.tool_index ?? -1))

  // 5. Guidance: projected exactly, then re-checked against the sources and BI.
  const claims = new Map(input.topicClaims.map((c) => [c.claim_id, c]))
  const observationById = new Map(observations.map((o) => [o.observation_id, o]))
  const caveatText = text.caveats
  const items: CustomerGuidanceItem[] = guidance.composition.items.map((raw, i) => {
    let item: ReturnType<typeof guidanceItem>
    try {
      item = guidanceItem(raw, `guidance[${i}]`)
    } catch (err) {
      if (err instanceof ProjectionRefusal) throw new CustomerRecordInvariantError(`${err.path}: ${err.reason}`)
      throw err
    }
    const claim = claims.get(item.claim_id)
    if (!claim) throw new CustomerRecordInvariantError(`guidance for an unknown claim ${item.claim_id}`)
    const auth = authorizePublication(input.sources.ledger, claim, input.as_of)
    if (!auth.authorized) throw new CustomerRecordInvariantError(`guidance not authorized for ${item.claim_id}: ${auth.reason}`)
    const entry = auth.entry
    const pub = item.provenance.publication
    if (pub.entry_id !== entry.entry_id || pub.version !== entry.version) throw new CustomerRecordInvariantError(`publication provenance mismatch for ${item.claim_id}`)
    if (item.explanation !== entry.explanation) throw new CustomerRecordInvariantError(`explanation is not the approved ledger text for ${item.claim_id}`)
    if (canonicalJson(item.required_caveats) !== canonicalJson(entry.required_caveats)) throw new CustomerRecordInvariantError(`caveats are not the approved ledger caveats for ${item.claim_id}`)
    if (item.provenance.claim.claim_id !== item.claim_id || item.provenance.claim.last_verified !== claim.last_verified) throw new CustomerRecordInvariantError(`claim provenance mismatch for ${item.claim_id}`)

    // Never stronger than what BI and applicability permit.
    const bi = item.provenance.bounded_interpretation
    const biRank = biRankForStatus(bi.status as Parameters<typeof biRankForStatus>[0])
    if (biRank === 0) throw new CustomerRecordInvariantError(`BI permits nothing for ${item.claim_id}`)
    if (item.conclusion === 'relevant_on_declared_facts') {
      const permitted = biRank === 2 && bi.citation === 'supporting' && item.applicability.status === 'met' && claim.unresolved_project_dependencies.length === 0
      if (!permitted) throw new CustomerRecordInvariantError(`conclusion stronger than permitted for ${item.claim_id}`)
    }
    if (entry.applicability_policy === 'met_only' && item.conclusion !== 'relevant_on_declared_facts') throw new CustomerRecordInvariantError(`ledger policy requires met for ${item.claim_id}`)
    // CR-V2-2E: selection evidence must be grounded in this record's own declarations and match the governed scopes.
    const scopedAs = new Set<string>([...(claim.tool_scope !== null ? ['tool'] : []), ...(claim.provider_scope !== null ? ['asset_provider'] : [])])
    const sb = item.selection_basis.scopes
    if (sb.length !== scopedAs.size || sb.some((x) => !scopedAs.has(x.scope)) || new Set(sb.map((x) => x.scope)).size !== sb.length) throw new CustomerRecordInvariantError(`selection basis does not match the governed scopes of ${item.claim_id}`)
    for (const x of sb) {
      if (x.matched_ids.length === 0 || x.observation_ids.length === 0) throw new CustomerRecordInvariantError(`empty selection basis for ${item.claim_id}`)
      const governedScope = (x.scope === 'tool' ? claim.tool_scope : claim.provider_scope) ?? []
      if (x.matched_ids.some((id) => !governedScope.includes(id))) throw new CustomerRecordInvariantError(`selection basis id outside the governed scope of ${item.claim_id}`)
      const kind = x.scope === 'tool' ? 'tool_identity' : 'asset_provider_identity'
      for (const id of x.observation_ids) {
        const o = observationById.get(id)
        if (!o || o.target.kind !== kind) throw new CustomerRecordInvariantError(`selection basis for ${item.claim_id} cites an observation that is not a ${kind} declaration in this record`)
      }
    }
    for (const row of item.dependency_rows) {
      if (!Object.prototype.hasOwnProperty.call(text.dependency_labels, row.dependency_id) || row.label !== text.dependency_labels[row.dependency_id]) throw new CustomerRecordInvariantError(`dependency label is not the approved wording for ${row.dependency_id}`)
    }
    for (const id of item.required_caveats) if (!Object.prototype.hasOwnProperty.call(caveatText, id)) throw new CustomerRecordInvariantError(`no approved wording for caveat ${id}`)

    return {
      claim_id: item.claim_id,
      conclusion: item.conclusion,
      explanation: item.explanation,
      caveats: item.required_caveats.map((id) => ({ caveat_id: id, text: caveatText[id] })),
      applicability: raw.applicability,
      declared_applicability_basis: raw.declared_applicability_basis,
      dependency_rows: raw.dependency_rows,
      selection_basis: { scopes: item.selection_basis.scopes.map((x) => ({ scope: x.scope, matched_ids: [...x.matched_ids], observation_ids: [...x.observation_ids] })) },
      provenance: raw.provenance,
    }
  })

  // 6. Source provenance for what the record actually uses.
  const answeredIds = new Set(answers.map((a) => a.q_id))
  const questions = order
    .filter((id) => answeredIds.has(id))
    .map((id) => {
      const q = approved.registry.questions.get(id)!
      return { q_id: id, version: q.version, approver: q.approval.approver as string, decision_date: q.approval.decision_date as string, review_ref: q.approval.review_ref }
    })
  const publications = items.map((it) => {
    const p = it.provenance.publication
    return { entry_id: p.entry_id, version: p.version, claim_id: it.claim_id, claim_last_verified: it.provenance.claim.last_verified, approver: p.approver, decision_date: p.decision_date, refresh_by: p.refresh_by }
  })

  // CR-V2-1C: content digests of exactly the governed entries the record relies on.
  const digests = new Map<string, CustomerRecordV2['sources']['authority_digests'][number]>()
  const addDigest = (kind: DigestedKind, ref: { id: string; version: string }, content_sha256: string) => {
    const key = `${kind}\u0000${ref.id}\u0000${ref.version}`
    const prior = digests.get(key)
    if (prior && prior.content_sha256 !== content_sha256) throw new CustomerRecordInvariantError(`two contents for ${kind} ${ref.id} v${ref.version}`)
    digests.set(key, { kind, ...ref, content_sha256 })
  }
  for (const q of questions) addDigest('question', questionRef({ q_id: q.q_id, version: q.version }), questionContentDigest(approved.registry.questions.get(q.q_id)!))
  for (const o of observations) {
    if (!o.map_entry) continue
    const m = o.map_entry
    const entry = approved.registry.observation_map.find((x) => x.o_id === m.o_id && x.version === m.o_version)
    if (!entry) throw new CustomerRecordInvariantError(`observation map entry ${m.o_id} v${m.o_version} not in the registry`)
    addDigest('observation_map_entry', observationMapRef(entry), observationMapContentDigest(entry))
  }
  for (const it of items) {
    const p = it.provenance.publication
    const entry = input.sources.ledger.find((e) => e.entry_id === p.entry_id && e.version === p.version)
    if (!entry) throw new CustomerRecordInvariantError(`ledger entry ${p.entry_id} v${p.version} not in the ledger`)
    addDigest('publication_entry', publicationRef(entry), publicationContentDigest(entry))
    const claim = claims.get(it.claim_id)!
    addDigest('governed_claim', claimRef(claim), claimContentDigest(claim))
  }
  // 7. CR-V2-EXAM-INTEGRATION-X0: comparisons derived from THIS version's declarations; this version's responses.
  // After guidance, never an input to it.
  const prov = guidance.facts.provenance
  const declaredFor = (i: number) => {
    const ids = Array.from(new Set(prov.tools.filter((x) => x.instance === toolInstance(i)).map((x) => x.tool_id)))
    return { tool_id: ids.length === 1 ? ids[0] : null, plan: (state.tools[i]?.[TOOL_QUESTION_ROLES.plan] ?? [])[0] ?? null }
  }
  const comparisons = examinationBearing ? deriveComparisons(documents, attached.byDocument, declaredFor) : []
  const responded = recordResponses(responseInputs, attached.byDocument, comparisons, input.record.record_version)
  if (!responded.ok) return { ok: false, stage: 'input', issues: responded.issues }

  const authority_digests = Array.from(digests.values()).sort((a, b) => (a.kind + a.id + a.version < b.kind + b.id + b.version ? -1 : a.kind + a.id + a.version > b.kind + b.id + b.version ? 1 : 0))

  const record: CustomerRecordV2 = JSON.parse(
    JSON.stringify({
      schema: CUSTOMER_RECORD_SCHEMA,
      schema_version: schemaVersion,
      status: 'prepared_not_issued',
      content: examinationBearing ? CUSTOMER_RECORD_EXAMINATION_CONTENT : CUSTOMER_RECORD_CONTENT,
      builder: examinationBearing ? CUSTOMER_RECORD_EXAMINATION_BUILDER : CUSTOMER_RECORD_BUILDER,
      record: { record_ref: input.record.record_id, record_version: input.record.record_version, prepared_on: input.as_of, captured_at: input.record.captured_at },
      sources: {
        kind: 'governed',
        registry_version: approved.registry_version,
        ledger_version: approved.ledger_version,
        source_text: approved.source_text,
        guidance_as_of: input.as_of,
        questions,
        publications,
        authority_digests,
        questionnaire_contract: { ...approved.questionnaire_contract, wording: text },
      },
      declarations: {
        answers,
        observations: [...observations].sort((a, b) => (a.observation_id < b.observation_id ? -1 : a.observation_id > b.observation_id ? 1 : 0)),
        acknowledgements: input.sources.acknowledgement_ids
          .filter((id) => state.acknowledgements[id] === true)
          .map((id) => ({ id, text: text.acknowledgements[id] }))
          .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)),
      },
      // CR-V2-DOC-1: inventory only, in the creator's order; nothing is examined and nothing reaches guidance.
      documents: {
        policy: examinationBearing ? 'inventory_with_examination' : 'inventory_only',
        items: documents.map((d) => ({
          document_id: d.document_id, sha256: d.sha256, media_type: d.media_type, byte_size: d.byte_size, file_name: d.file_name,
          category: d.category, tool_index: d.tool_index, examination: attached.byDocument.get(d.document_id) ?? EVIDENCE_EXAMINATION_NOT_EXAMINED,
        })),
      },
      comparison: examinationBearing ? { policy: 'derived_per_version', method: PERSISTED_COMPARISON_METHOD, items: comparisons } : { policy: 'disabled' },
      guidance: { items },
      ...(examinationBearing ? { creator_responses: { policy: 'closed_codes_this_version_only', items: responded.responses } } : {}),
    }),
  )
  const canonical = canonicalJson(record)
  return { ok: true, record, canonical, sha256: sha256Hex(canonical) }
}

/** True only when `sha256` is the digest of this record's canonical form. */
export function customerRecordDigestMatches(record: CustomerRecordV2, sha256: string): boolean {
  return /^[0-9a-f]{64}$/.test(sha256) && sha256Hex(canonicalJson(record)) === sha256
}

/**
 * Verify a stored canonical record against its recorded digest: the digest must
 * match the exact text, the text must be the canonical form of what it parses
 * to, and it must be a v2 customer record of this schema.
 */
export function verifyCustomerRecord(canonical: string, sha256: string): { ok: true; record: CustomerRecordV2 } | { ok: false; reason: 'digest_malformed' | 'digest_mismatch' | 'not_json' | 'not_canonical' | 'wrong_schema' } {
  if (!/^[0-9a-f]{64}$/.test(sha256)) return { ok: false, reason: 'digest_malformed' }
  if (sha256Hex(canonical) !== sha256) return { ok: false, reason: 'digest_mismatch' }
  let parsed: unknown
  try {
    parsed = JSON.parse(canonical)
  } catch {
    return { ok: false, reason: 'not_json' }
  }
  try {
    if (canonicalJson(parsed) !== canonical) return { ok: false, reason: 'not_canonical' }
  } catch {
    return { ok: false, reason: 'not_canonical' }
  }
  const r = parsed as Partial<CustomerRecordV2>
  if (r.schema !== CUSTOMER_RECORD_SCHEMA || r.status !== 'prepared_not_issued') return { ok: false, reason: 'wrong_schema' }
  const examinationValid = () => !!r.record && examinationSectionsValid(r as unknown as Parameters<typeof examinationSectionsValid>[0])
  const sources = r.sources as (CustomerRecordV2['sources'] | undefined)
  // Historical formats: exactly what they were, and they never carry a contract.
  if (r.schema_version === HISTORICAL_RECORD_SCHEMA_VERSION || r.schema_version === HISTORICAL_EXAMINATION_SCHEMA_VERSION) {
    if (sources && 'questionnaire_contract' in sources) return { ok: false, reason: 'wrong_schema' }
    // CR-V2-EXAM-INTEGRATION-X0: a v6 record's examination parts must re-verify strictly.
    return r.schema_version === HISTORICAL_RECORD_SCHEMA_VERSION || examinationValid() ? { ok: true, record: r as CustomerRecordV2 } : { ok: false, reason: 'wrong_schema' }
  }
  // CR-V2-DECL-1B-2: v7 and v8 must prove their embedded contract and wording, and be of their own kind.
  if (r.schema_version === CUSTOMER_RECORD_SCHEMA_VERSION || r.schema_version === CUSTOMER_RECORD_EXAMINATION_SCHEMA_VERSION) {
    if (!sources || sources.source_text?.record_schema?.version !== r.schema_version || !embeddedContractValid(sources)) return { ok: false, reason: 'wrong_schema' }
    const kindValid = r.schema_version === CUSTOMER_RECORD_SCHEMA_VERSION
      ? r.documents?.policy === 'inventory_only' && r.comparison?.policy === 'disabled' && !('creator_responses' in r)
      : examinationValid()
    if (kindValid) return { ok: true, record: r as CustomerRecordV2 }
  }
  return { ok: false, reason: 'wrong_schema' }
}

/** Whether a verified record is examination-bearing, whichever schema generation it belongs to. */
export const isExaminationBearing = (record: Pick<CustomerRecordV2, 'schema_version'>): boolean =>
  record.schema_version === HISTORICAL_EXAMINATION_SCHEMA_VERSION || record.schema_version === CUSTOMER_RECORD_EXAMINATION_SCHEMA_VERSION
