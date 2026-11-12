/**
 * CR-STAGE1-IMPL-1 — the Creator Record consultative summary (contract CR-SUM-0 v2, CR-PROD-1A §5). INERT.
 *
 * Nothing in the application imports this module, and it has no approved wording: its wording is an input
 * (`ReadinessSummaryTemplates`) that must carry an approval whose fingerprint matches it exactly. No approved summary
 * templates exist, so no customer can see a summary until a separately approved template set is published and a
 * caller is added in a later, separately authorised milestone.
 *
 * What it is: a pure, deterministic projection of ONE verified, version-scoped Creator Record. It re-orders and labels
 * what the record already concludes. It never interprets.
 *
 *   input   the stored canonical record + its SHA-256 (verified here), the summary templates + their approval
 *   output  topics present (label + approved framing), considerations grouped by the declaration that selected them,
 *           open items, and declared subjects that received no guidance
 *
 * Grounding (every string in the output is exactly one of):
 *   G1  text copied verbatim from the verified record (explanation, caveat text, question, answer, dependency label);
 *   G2  an approved template string looked up by a closed code (conclusion, topic, framing, "selected because" label);
 *   G4  a mechanical identifier or count (ids, versions, indexes, codes).
 * There is no G3 free composition in this version: no sentence is assembled from parts.
 *
 * Boundedness (each refusal below is a structural check, not a wording check):
 *   - the conclusion is the record's own, printed only through the approved conclusion map, and must be no stronger than
 *     the Bounded Interpretation status recorded for the same objective (`biRankForStatus`), and consistent with the
 *     composition rule that an open dependency or a non-met applicability caps it at `relevant_applicability_unresolved`;
 *   - every consideration's publication must be one the record itself carries in `sources.publications` (same entry,
 *     version and claim): knowledge that was not authorised at preparation cannot enter;
 *   - the BI goal must be the item's own objective (no cross-objective conclusions);
 *   - every selecting declaration must resolve to exactly one recorded observation and answer (provenance), on a
 *     question the approved templates name as a subject question;
 *   - the considerations are exactly the record's guidance items: none added, none dropped, none merged;
 *   - ordering is by the questionnaire position of the selecting declaration, then record order — never by status;
 *   - document readings never enter: integrated-assessment results are carried as codes and document ids only (D10).
 * Any failure throws `ReadinessSummaryRefusal`; nothing is partially rendered.
 *
 * Correction semantics: the output is a function of exactly one record version. A correction is a new prepared
 * version with its own digest, so its summary is recomputed from scratch; nothing is carried over.
 */
import { CREATOR_RECORD_CONCLUSIONS, biRankForStatus, conclusionRank, type CreatorRecordConclusion } from '../contract/compose'
import { CUSTOMER_RECORD_EXAMINATION_SCHEMA_VERSION, CUSTOMER_RECORD_SCHEMA_VERSION, isUncertainValue, verifyCustomerRecord, type CustomerRecordV2, type DeclaredAnswer } from '../customer-record/record'
import { assessIntegrated } from '../integrated-assessment/assess'
import { canonicalJson, sha256Hex } from '../record-core/canonical'

export const READINESS_SUMMARY_METHOD = { id: 'si8/creator-record-v2-readiness-summary', version: 1 } as const

/** The summary's wording. Every string here needs its own approval; none is approved today. */
export interface ReadinessSummaryTemplates {
  template_id: string
  version: number
  /** Label per Creator Record conclusion code. Must cover every code. */
  conclusion_labels: Record<CreatorRecordConclusion, string>
  /** Label per topic code, and the approved one-sentence framing per topic (project-independent). */
  topic_labels: Readonly<Record<string, string>>
  topic_framing: Readonly<Record<string, string>>
  /** Label shown before the declaration that selected a consideration. */
  selected_because_label: string
  /** Question ids whose answers name a subject (a tool or a service). Governed configuration, not code knowledge. */
  subject_questions: readonly string[]
  /**
   * CR-SUM-1b: shown on a consideration whose own conditions are met but whose conclusion is capped by its objective's
   * Bounded Interpretation status. Must reuse the approved PDF `topic_level` text exactly (enforced by the template approval).
   */
  topic_qualified_note: string
  /**
   * CR-SUM-1c: shown on a consideration whose weaker conclusion has no reason the record can show (its own applicability is
   * unresolved without a listed fact, or nothing else explains it). Must reuse the approved PDF `unspecified_condition` text
   * exactly (enforced by the template approval). It names no condition: the record does not identify one.
   */
  unspecified_condition_note: string
}

export interface ReadinessSummaryApproval {
  template_id: string
  version: number
  /** SHA-256 of the canonical JSON of the templates, exactly. */
  fingerprint: string
  lifecycle: 'approved'
  authority: string
  decision_date: string
}

export const readinessTemplatesFingerprint = (t: ReadinessSummaryTemplates): string => sha256Hex(canonicalJson(t))

export const READINESS_SUMMARY_REFUSALS = [
  'record_not_verified',
  'record_schema_unsupported',
  'templates_not_approved',
  'templates_fingerprint_mismatch',
  'templates_incomplete',
  'duplicate_claim',
  'unknown_conclusion',
  'unlabelled_topic',
  'bi_permits_nothing',
  'stronger_than_bi',
  'conclusion_inconsistent_with_open_items',
  'interpretation_objective_mismatch',
  'claim_provenance_mismatch',
  'publication_not_in_record',
  'empty_explanation',
  'empty_caveat',
  'unlabelled_dependency',
  'selection_provenance_broken',
  'subject_question_not_approved',
  'integrated_assessment_mismatch',
] as const
export type ReadinessSummaryRefusalCode = (typeof READINESS_SUMMARY_REFUSALS)[number]

export class ReadinessSummaryRefusal extends Error {
  constructor(readonly code: ReadinessSummaryRefusalCode, readonly ref: string | null = null) {
    super(`creator_record_readiness_summary_refused: ${code}${ref ? `: ${ref}` : ''}`)
  }
}

/** The declaration a consideration rests on, verbatim and traceable. */
export interface SummaryDeclaration {
  observation_id: string
  q_id: string
  tool_index: number | null
  question: string
  answer: string
}

export interface SummaryConsideration {
  /** 1-based position in the summary. */
  index: number
  /** Traceability only; never shown to a customer. */
  claim_id: string
  publication: { entry_id: string; version: number }
  topic: string
  /** The status, kept apart from all explanatory text. */
  conclusion: { code: CreatorRecordConclusion; label: string }
  /** Approved ledger explanation, verbatim. */
  explanation: string
  caveats: string[]
  selected_because: { label: string; declarations: SummaryDeclaration[] }
  /** What the record's own item says it depends on (codes and recorded labels only). */
  depends_on: ({ kind: 'applicability'; fact: string; tool: string | null } | { kind: 'dependency'; dependency_id: string; label: string })[]
  /**
   * CR-SUM-1b: the approved topic-level explanation, only when this item's own applicability is met, it has no own
   * dependency, and its weaker conclusion comes from its objective's BI status (the PDF's `topicLevel` rule, exactly).
   * Otherwise null. It never changes the conclusion and names no other item.
   */
  topic_qualified: string | null
  /**
   * CR-SUM-1c: the approved "condition this record does not identify" text, only under the PDF's `unspecified` rule
   * (`isUnspecifiedCondition`). Otherwise null. It never names, invents or resolves a condition.
   */
  unspecified_condition: string | null
  /** Integrated assessment as codes and document ids only. Never a reading value or excerpt (D10). */
  documents: { requirement: { kind: 'applicability' | 'dependency'; id: string }; standing: string; evidence: string; document_statuses: { document_id: string; status: string; reason: string }[] }[]
}

export interface SummarySubjectGroup {
  /** The declaration that selected the considerations in this group, or null for items with no selecting declaration. */
  subject: SummaryDeclaration | null
  considerations: SummaryConsideration[]
}

export interface ReadinessSummary {
  method: typeof READINESS_SUMMARY_METHOD
  identity: { record_ref: string; record_version: number; snapshot_sha256: string; schema_version: number; ledger_version: string }
  templates: { template_id: string; version: number; fingerprint: string }
  topics: { topic: string; label: string; framing: string }[]
  groups: SummarySubjectGroup[]
  open_items: {
    dependencies: { consideration: number; dependency_id: string; label: string; status: string; sufficiency: string }[]
    unresolved_applicability: { consideration: number; fact: string; tool: string | null }[]
    /** CR-SUM-1b: considerations shown at the topic level (see `SummaryConsideration.topic_qualified`). */
    topic_qualified: { consideration: number }[]
    /** CR-SUM-1c: considerations whose unresolved condition the record does not identify. */
    unspecified: { consideration: number }[]
    not_sure: { q_id: string; tool_index: number | null; question: string }[]
  }
  /** Declared subjects (tools or services) that no consideration cites. Listing them is not a finding about them. */
  uncovered_subjects: SummaryDeclaration[]
}

type Item = CustomerRecordV2['guidance']['items'][number]
type Observation = CustomerRecordV2['declarations']['observations'][number]

const nonEmpty = (v: unknown): v is string => typeof v === 'string' && v.trim() !== ''

/**
 * CR-SUM-1b — exactly the customer PDF's `topicLevel` rule (`../customer-pdf/document-model.ts`): the item's own
 * applicability is met, it has no own dependency, its conclusion is the weaker one, and that conclusion comes from its
 * objective's BI status (`relevant_applicability_unresolved`, cited as supporting).
 */
export function isTopicQualified(i: Pick<Item, 'conclusion' | 'applicability' | 'dependency_rows' | 'provenance'>): boolean {
  return (
    i.conclusion === 'relevant_applicability_unresolved' &&
    i.applicability.status === 'met' &&
    i.dependency_rows.length === 0 &&
    i.provenance.bounded_interpretation.citation === 'supporting' &&
    i.provenance.bounded_interpretation.status === 'relevant_applicability_unresolved'
  )
}

/**
 * CR-SUM-1c — exactly the customer PDF's `unspecified` rule (`../customer-pdf/document-model.ts`): the conclusion is the
 * weaker one, and either the item's own applicability is unresolved with no listed fact, or the record shows no reason for
 * it at all (no listed fact, no own dependency, and not topic-level).
 */
export function isUnspecifiedCondition(i: Pick<Item, 'conclusion' | 'applicability' | 'dependency_rows' | 'provenance'>): boolean {
  if (i.conclusion !== 'relevant_applicability_unresolved') return false
  const ownUnlisted = i.applicability.status === 'unresolved' && i.applicability.material_unresolved.length === 0
  const shownReason = i.applicability.material_unresolved.length > 0 || i.dependency_rows.length > 0 || isTopicQualified(i)
  return ownUnlisted || !shownReason
}

/** `tool-<n>` (1-based) → tool index; null instance → null. Anything else cannot be attributed. */
function instanceToolIndex(instance: string | null): number | null | undefined {
  if (instance === null) return null
  const m = /^tool-([1-9]\d*)$/.exec(instance)
  return m ? Number(m[1]) - 1 : undefined
}

function checkTemplates(t: ReadinessSummaryTemplates, a: ReadinessSummaryApproval | null): string {
  if (!a || a.lifecycle !== 'approved' || !nonEmpty(a.authority) || !nonEmpty(a.decision_date)) throw new ReadinessSummaryRefusal('templates_not_approved')
  if (a.template_id !== t.template_id || a.version !== t.version) throw new ReadinessSummaryRefusal('templates_not_approved', 'identity')
  const fp = readinessTemplatesFingerprint(t)
  if (fp !== a.fingerprint) throw new ReadinessSummaryRefusal('templates_fingerprint_mismatch')
  if (!nonEmpty(t.selected_because_label) || !Array.isArray(t.subject_questions) || t.subject_questions.length === 0 || !nonEmpty(t.topic_qualified_note) || !nonEmpty(t.unspecified_condition_note)) throw new ReadinessSummaryRefusal('templates_incomplete')
  for (const c of CREATOR_RECORD_CONCLUSIONS) if (!nonEmpty(t.conclusion_labels?.[c])) throw new ReadinessSummaryRefusal('templates_incomplete', `conclusion_labels.${c}`)
  return fp
}

/**
 * Build the summary for one verified record. Throws `ReadinessSummaryRefusal` on anything it cannot ground exactly.
 * Pure: no I/O, no clock, no model, no network.
 */
export function buildReadinessSummary(input: {
  canonical: string
  sha256: string
  templates: ReadinessSummaryTemplates
  approval: ReadinessSummaryApproval | null
}): ReadinessSummary {
  const fingerprint = checkTemplates(input.templates, input.approval)
  const v = verifyCustomerRecord(input.canonical, input.sha256)
  if (!v.ok) throw new ReadinessSummaryRefusal('record_not_verified', v.reason)
  const record = v.record
  if (record.schema_version !== CUSTOMER_RECORD_SCHEMA_VERSION && record.schema_version !== CUSTOMER_RECORD_EXAMINATION_SCHEMA_VERSION) {
    throw new ReadinessSummaryRefusal('record_schema_unsupported', String(record.schema_version))
  }
  const T = input.templates
  const subjectQuestions = new Set(T.subject_questions)

  // Declarations: observation id → its exact answer (and questionnaire position).
  const answers = record.declarations.answers
  const answerKey = (q: string, tool: number | null) => `${q}\u0000${tool === null ? '' : tool}`
  const answerAt = new Map<string, { answer: DeclaredAnswer; position: number }>()
  answers.forEach((a, position) => answerAt.set(answerKey(a.q_id, a.tool_index), { answer: a, position }))
  const observations = new Map<string, Observation>(record.declarations.observations.map((o) => [o.observation_id, o]))
  const declarationOf = (observationId: string, ref: string): { d: SummaryDeclaration; position: number } => {
    const o = observations.get(observationId)
    if (!o) throw new ReadinessSummaryRefusal('selection_provenance_broken', `${ref}: unknown observation`)
    const tool = instanceToolIndex(o.instance)
    if (tool === undefined) throw new ReadinessSummaryRefusal('selection_provenance_broken', `${ref}: unattributable instance`)
    const at = answerAt.get(answerKey(o.question.q_id, tool))
    if (!at || at.answer.q_version !== o.question.q_version || at.answer.answer_verbatim !== o.answer_verbatim) {
      throw new ReadinessSummaryRefusal('selection_provenance_broken', `${ref}: no matching answer`)
    }
    return { d: { observation_id: o.observation_id, q_id: at.answer.q_id, tool_index: at.answer.tool_index, question: at.answer.question, answer: at.answer.answer_verbatim }, position: at.position }
  }

  // Publications the record itself carries: the only knowledge that may appear.
  const published = new Set(record.sources.publications.map((p) => `${p.entry_id}\u0000${p.version}\u0000${p.claim_id}`))

  // Integrated assessment (schema 8 only): codes only.
  const integrated = record.schema_version === CUSTOMER_RECORD_EXAMINATION_SCHEMA_VERSION ? assessIntegrated(record as never) : null

  const seen = new Set<string>()
  const cited = new Set<string>()
  type Placed = { item: Item; recordIndex: number; subject: SummaryDeclaration | null; position: number; declarations: SummaryDeclaration[] }
  const placed: Placed[] = record.guidance.items.map((item, recordIndex) => {
    const ref = item.claim_id
    if (seen.has(item.claim_id)) throw new ReadinessSummaryRefusal('duplicate_claim', ref)
    seen.add(item.claim_id)
    if (!(CREATOR_RECORD_CONCLUSIONS as readonly string[]).includes(item.conclusion)) throw new ReadinessSummaryRefusal('unknown_conclusion', ref)
    const p = item.provenance
    if (p.claim.claim_id !== item.claim_id) throw new ReadinessSummaryRefusal('claim_provenance_mismatch', ref)
    if (p.bounded_interpretation.goal_id !== p.objective.objective_id) throw new ReadinessSummaryRefusal('interpretation_objective_mismatch', ref)
    const ceiling = biRankForStatus(p.bounded_interpretation.status)
    if (ceiling === 0) throw new ReadinessSummaryRefusal('bi_permits_nothing', ref)
    if (conclusionRank(item.conclusion) > ceiling) throw new ReadinessSummaryRefusal('stronger_than_bi', ref)
    const open = item.dependency_rows.length > 0 || item.applicability.status !== 'met'
    if (open && item.conclusion !== 'relevant_applicability_unresolved') throw new ReadinessSummaryRefusal('conclusion_inconsistent_with_open_items', ref)
    if (!published.has(`${p.publication.entry_id}\u0000${p.publication.version}\u0000${item.claim_id}`)) throw new ReadinessSummaryRefusal('publication_not_in_record', ref)
    if (!nonEmpty(item.explanation)) throw new ReadinessSummaryRefusal('empty_explanation', ref)
    for (const c of item.caveats) if (!nonEmpty(c.text)) throw new ReadinessSummaryRefusal('empty_caveat', ref)
    for (const d of item.dependency_rows) if (!nonEmpty(d.label)) throw new ReadinessSummaryRefusal('unlabelled_dependency', `${ref}: ${d.dependency_id}`)
    if (!nonEmpty(T.topic_labels[p.objective.topic]) || !nonEmpty(T.topic_framing[p.objective.topic])) throw new ReadinessSummaryRefusal('unlabelled_topic', `${ref}: ${p.objective.topic}`)

    const ids = item.selection_basis.scopes.flatMap((s) => s.observation_ids)
    const resolved = ids.map((id) => declarationOf(id, ref))
    for (const r of resolved) if (!subjectQuestions.has(r.d.q_id)) throw new ReadinessSummaryRefusal('subject_question_not_approved', `${ref}: ${r.d.q_id}`)
    resolved.sort((a, b) => a.position - b.position || a.d.observation_id.localeCompare(b.d.observation_id))
    for (const r of resolved) cited.add(r.d.observation_id)
    const first = resolved[0] ?? null
    return { item, recordIndex, subject: first ? first.d : null, position: first ? first.position : Number.MAX_SAFE_INTEGER, declarations: resolved.map((r) => r.d) }
  })

  // Neutral order: questionnaire position of the selecting declaration, then record order. Status is never used.
  placed.sort((a, b) => a.position - b.position || a.recordIndex - b.recordIndex)

  const groups: SummarySubjectGroup[] = []
  const topicsSeen: string[] = []
  const openDeps: ReadinessSummary['open_items']['dependencies'] = []
  const openApplicability: ReadinessSummary['open_items']['unresolved_applicability'] = []
  const topicQualified: ReadinessSummary['open_items']['topic_qualified'] = []
  const unspecified: ReadinessSummary['open_items']['unspecified'] = []
  placed.forEach((pl, i) => {
    const item = pl.item
    const n = i + 1
    const topic = item.provenance.objective.topic
    if (!topicsSeen.includes(topic)) topicsSeen.push(topic)
    let documents: SummaryConsideration['documents'] = []
    if (integrated) {
      const ia = integrated.items.find((x) => x.claim_id === item.claim_id)
      if (!ia || ia.conclusion !== item.conclusion) throw new ReadinessSummaryRefusal('integrated_assessment_mismatch', item.claim_id)
      documents = ia.requirements.map((q) => ({
        requirement: q.requirement.kind === 'applicability' ? { kind: 'applicability' as const, id: q.requirement.fact } : { kind: 'dependency' as const, id: q.requirement.dependency_id },
        standing: q.standing,
        evidence: q.evidence,
        document_statuses: q.documents.map((d) => ({ document_id: d.document_id, status: d.status, reason: d.reason })),
      }))
    }
    const depends_on: SummaryConsideration['depends_on'] = [
      ...item.applicability.material_unresolved.map((r) => ({ kind: 'applicability' as const, fact: r.fact, tool: r.tool ?? null })),
      ...item.dependency_rows.map((d) => ({ kind: 'dependency' as const, dependency_id: d.dependency_id, label: d.label as string })),
    ]
    for (const r of item.applicability.material_unresolved) openApplicability.push({ consideration: n, fact: r.fact, tool: r.tool ?? null })
    const qualified = isTopicQualified(item)
    if (qualified) topicQualified.push({ consideration: n })
    const unlisted = isUnspecifiedCondition(item)
    if (unlisted) unspecified.push({ consideration: n })
    for (const d of item.dependency_rows) openDeps.push({ consideration: n, dependency_id: d.dependency_id, label: d.label as string, status: d.status, sufficiency: d.sufficiency })
    const consideration: SummaryConsideration = {
      index: n,
      claim_id: item.claim_id,
      publication: { entry_id: item.provenance.publication.entry_id, version: item.provenance.publication.version },
      topic,
      conclusion: { code: item.conclusion, label: T.conclusion_labels[item.conclusion] },
      explanation: item.explanation,
      caveats: item.caveats.map((c) => c.text),
      selected_because: { label: T.selected_because_label, declarations: pl.declarations },
      depends_on,
      topic_qualified: qualified ? T.topic_qualified_note : null,
      unspecified_condition: unlisted ? T.unspecified_condition_note : null,
      documents,
    }
    // Group consecutive considerations selected by the same declaration. Items are never merged.
    const last = groups[groups.length - 1]
    const sameSubject = last && ((last.subject === null && pl.subject === null) || (last.subject !== null && pl.subject !== null && last.subject.observation_id === pl.subject.observation_id))
    if (sameSubject) last.considerations.push(consideration)
    else groups.push({ subject: pl.subject, considerations: [consideration] })
  })

  // Not-sure answers and declared subjects with no guidance, in questionnaire order.
  const not_sure = answers.filter((a) => a.values.some(isUncertainValue)).map((a) => ({ q_id: a.q_id, tool_index: a.tool_index, question: a.question }))
  const uncovered_subjects: SummaryDeclaration[] = []
  for (const o of record.declarations.observations) {
    if (!subjectQuestions.has(o.question.q_id) || cited.has(o.observation_id)) continue
    const tool = instanceToolIndex(o.instance)
    if (tool === undefined) continue
    const at = answerAt.get(answerKey(o.question.q_id, tool))
    if (!at || uncovered_subjects.some((u) => u.q_id === at.answer.q_id && u.tool_index === at.answer.tool_index)) continue
    // An answer is uncovered only if none of its observations is cited.
    const siblingCited = record.declarations.observations.some((x) => x.question.q_id === o.question.q_id && instanceToolIndex(x.instance) === tool && cited.has(x.observation_id))
    if (siblingCited) continue
    uncovered_subjects.push({ observation_id: o.observation_id, q_id: at.answer.q_id, tool_index: at.answer.tool_index, question: at.answer.question, answer: at.answer.answer_verbatim })
  }
  uncovered_subjects.sort((a, b) => answers.findIndex((x) => x.q_id === a.q_id && x.tool_index === a.tool_index) - answers.findIndex((x) => x.q_id === b.q_id && x.tool_index === b.tool_index))

  return {
    method: READINESS_SUMMARY_METHOD,
    identity: { record_ref: record.record.record_ref, record_version: record.record.record_version, snapshot_sha256: input.sha256, schema_version: record.schema_version, ledger_version: record.sources.ledger_version },
    templates: { template_id: T.template_id, version: T.version, fingerprint },
    topics: topicsSeen.map((t) => ({ topic: t, label: T.topic_labels[t], framing: T.topic_framing[t] })),
    groups,
    open_items: { dependencies: openDeps, unresolved_applicability: openApplicability, topic_qualified: topicQualified, unspecified, not_sure },
    uncovered_subjects,
  }
}
