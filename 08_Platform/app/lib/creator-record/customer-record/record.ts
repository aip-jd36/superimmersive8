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
 * Contract:
 *   - Sources: approved governed sources only (`./sources`), or nothing is built.
 *   - Declarations: the existing form validation and declaration mapping
 *     (`../prototype/declared-guidance`), unchanged. They come only from the
 *     creator's answers.
 *   - Documents: none are accepted. Every declared tool is recorded as
 *     `not_provided` (Option C: documents cannot create declarations).
 *   - Comparisons: disabled. Nothing is reconciled and nothing can influence
 *     guidance (guidance runs on declarations alone).
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
import { parseFormState } from '../prototype/parse-form-state'
import { canonicalJson, sha256Hex, CanonicalizationError } from '../record-core/canonical'
import { arr, int, nullable, obj, oneOf, ProjectionRefusal, str, type P } from '../record-core/projection'
import { checkApprovedSources, type SourceRefusal, type SourceTextInput, type TopicClaims } from './sources'

export const CUSTOMER_RECORD_SCHEMA = 'si8/creator-record-v2-record'
/** v2 (CR-V2-1A): content-addressed source text provenance; acknowledgements with their wording. */
export const CUSTOMER_RECORD_SCHEMA_VERSION = 2
/** The content contract: what may appear in the record (no generated prose). Bump with any content change. */
export const CUSTOMER_RECORD_CONTENT = { id: 'si8/creator-record-v2-record-content', version: 1, generated_text: 'none' } as const
/** Issued Creator Record ids (CR-YYYY-8 hex): assigned at issuance, never part of a prepared record. */
const ISSUED_RECORD_ID = /^CR-\d{4}-[0-9A-F]{8}$/i
const ISO_DATETIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/

export interface CustomerRecordInput {
  /** The questionnaire state, exactly as submitted; parsed strictly here. Documents are not accepted. */
  state: unknown
  sources: CreatorRecordSources
  /** The approved wording: its Source Text Approval and the acknowledgement wording it covers. */
  source_text: SourceTextInput | null
  topicClaims: TopicClaims
  /** Guidance date (YYYY-MM-DD), supplied by the caller. */
  as_of: string
  /** Preparation reference, record version and capture time (ISO, UTC). */
  record: RecordContext
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
  provenance: GuidanceItem['provenance']
}

export interface CustomerRecordV2 {
  schema: typeof CUSTOMER_RECORD_SCHEMA
  schema_version: typeof CUSTOMER_RECORD_SCHEMA_VERSION
  status: 'prepared_not_issued'
  content: typeof CUSTOMER_RECORD_CONTENT
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
  }
  /** Acknowledgements the creator accepted, with the exact approved wording shown. */
  declarations: { answers: DeclaredAnswer[]; observations: DeclaredObservation[]; acknowledgements: { id: string; text: string }[] }
  documents: { status: 'not_provided'; tools: { tool_index: number; status: 'not_provided' }[] }
  comparison: { policy: 'disabled' }
  guidance: { items: CustomerGuidanceItem[] }
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
  return issues
}

export function buildCustomerRecord(input: CustomerRecordInput): CustomerRecordResult {
  // 1. Input shape, strictly. Documents are not an input.
  const shapeIssues = inputIssues(input)
  const parsed = parseFormState(input.state)
  if (!parsed.ok) shapeIssues.push('state')
  if (shapeIssues.length > 0 || !parsed.ok) return { ok: false, stage: 'input', issues: shapeIssues }
  const state = parsed.state

  // 2. Approved governed sources only.
  const check = checkApprovedSources(input.sources, input.source_text, input.topicClaims, input.as_of, { id: CUSTOMER_RECORD_SCHEMA, version: CUSTOMER_RECORD_SCHEMA_VERSION })
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

  const record: CustomerRecordV2 = JSON.parse(
    JSON.stringify({
      schema: CUSTOMER_RECORD_SCHEMA,
      schema_version: CUSTOMER_RECORD_SCHEMA_VERSION,
      status: 'prepared_not_issued',
      content: CUSTOMER_RECORD_CONTENT,
      record: { record_ref: input.record.record_id, record_version: input.record.record_version, prepared_on: input.as_of, captured_at: input.record.captured_at },
      sources: {
        kind: 'governed',
        registry_version: approved.registry_version,
        ledger_version: approved.ledger_version,
        source_text: approved.source_text,
        guidance_as_of: input.as_of,
        questions,
        publications,
      },
      declarations: {
        answers,
        observations: [...observations].sort((a, b) => (a.observation_id < b.observation_id ? -1 : a.observation_id > b.observation_id ? 1 : 0)),
        acknowledgements: input.sources.acknowledgement_ids
          .filter((id) => state.acknowledgements[id] === true)
          .map((id) => ({ id, text: text.acknowledgements[id] }))
          .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)),
      },
      documents: { status: 'not_provided', tools: state.tools.slice(0, input.sources.max_tools).map((_, i) => ({ tool_index: i, status: 'not_provided' })) },
      comparison: { policy: 'disabled' },
      guidance: { items },
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
  if (r.schema !== CUSTOMER_RECORD_SCHEMA || r.schema_version !== CUSTOMER_RECORD_SCHEMA_VERSION || r.status !== 'prepared_not_issued') return { ok: false, reason: 'wrong_schema' }
  return { ok: true, record: r as CustomerRecordV2 }
}
