/**
 * CR-V2-VERTICAL-SLICE-1 — the readable draft Creator Record (view model).
 *
 * Pure and deterministic. Built ONLY from:
 *   - the creator's own answers (verbatim) and the declared observations;
 *   - the existing guidance pipeline's result (`runCreatorRecordGuidance`):
 *     composition items, their dependency rows, omissions, and the per-
 *     objective trace — never re-derived here;
 *   - ledger explanations, labels, evidence notes and caveats (passed in);
 *   - the fixed templates in `./templates`.
 * It never evaluates applicability, never reads Bounded Interpretation prose,
 * and never upgrades a conclusion: the conclusion label is a fixed mapping of
 * composition's own (already narrowed) conclusion.
 *
 * Statement types are kept apart, as the PRD requires (v0.3 §4.1):
 * declarations / guidance / open items and missing evidence / matters for
 * independent review / what SI8 did not do.
 */

import type { CreatorRecordConclusion, GuidanceItem } from '../contract/compose'
import type { DeclaredObservation } from '../contract/provenance'
import type { CreatorRecordGuidanceResult } from '../integration/run-creator-record-guidance'
import type { ApplicabilityRequirement, TopicClaim } from '@/lib/retrieval-engine/types'
import type { CreatorRecordFormState, DiscardedAnswer, QuestionPresentation } from '../prototype/form'
import { toolInstance } from '../prototype/form'
import { T } from './templates'

export interface DraftRow {
  label: string
  value: string
  note?: string
}

export interface DraftDeclarationGroup {
  id: string
  heading: string
  rows: DraftRow[]
  note?: string
}

export interface DraftGuidanceCard {
  claim_id: string
  subject: string
  conclusion: CreatorRecordConclusion
  conclusion_label: string
  explanation: string
  basis: string[]
  depends_on: string[]
  open_item_labels: string[]
  caveats: string[]
  source: string
  provenance: { claim_id: string; publication_entry: string; objective: string; bi_status: string }
}

export interface DraftOpenItem {
  dependency_id: string
  label: string
  told_us: string
  documents: string
  evidence: string
  sufficiency: string
  status: string
  for_guidance: string[]
}

export interface DraftRecordView {
  pilot: boolean
  banner: { title: string; lines: string[] } | null
  header: { title: string; record_title: string; record_id: string; version: number; prepared_on: string; status: string }
  summary: string[]
  declarations: { intro: string; groups: DraftDeclarationGroup[] }
  guidance: { intro: string; cards: DraftGuidanceCard[]; empty: string | null }
  open_items: { intro: string; items: DraftOpenItem[]; empty: string | null; documents_mentioned: DraftRow[] }
  not_shown: { intro: string; lines: string[] }
  independent_review: { intro: string; lines: string[] }
  not_done: string[]
  method: DraftRow[]
  /** Internal UAT trace. Never part of a customer record. */
  trace: {
    objectives: CreatorRecordGuidanceResult['objectives']
    omissions: CreatorRecordGuidanceResult['composition']['omissions']
    governance_gaps: CreatorRecordGuidanceResult['governance_gaps']
    dropped_facts: CreatorRecordGuidanceResult['facts']['provenance']['dropped']
    discarded_answers: DiscardedAnswer[]
  }
}

export interface DraftRecordInput {
  state: CreatorRecordFormState
  presentation: Readonly<Record<string, QuestionPresentation & { section: string; text: string }>>
  /** Question order (registry order). */
  question_order: readonly string[]
  /** Questions shown at submission; anything else is "not asked". */
  shown: { single: readonly string[]; per_tool: readonly string[] }
  observations: readonly DeclaredObservation[]
  discarded: readonly DiscardedAnswer[]
  guidance: CreatorRecordGuidanceResult
  topicClaims: readonly TopicClaim[]
  dependencyLabel: (id: string) => string | undefined
  caveatText: (id: string) => string | undefined
  record: { record_id: string; version: number; prepared_on: string }
  versions: { registry: string; ledger: string; as_of: string }
  pilot: boolean
}

const EXISTENCE_QUESTIONS = new Set(['L3', 'M2', 'M3D', 'M4'])
const SECTION_ORDER = ['project', 'locations', 'tools', 'people', 'materials', 'contribution']

function existenceSentence(value: string | undefined): string {
  switch (value) {
    case 'yes':
      return T.existence_yes_not_provided
    case 'no':
      return T.existence_no
    case 'some':
      return T.existence_some
    default:
      return T.existence_not_sure
  }
}

function answerText(p: QuestionPresentation, values: readonly string[] | undefined): string {
  if (!values || values.length === 0 || values.every((v) => v.trim() === '')) return T.not_answered
  if (p.input === 'text' || p.input === 'textarea') return values[0] === 'not_sure' ? 'Not sure' : values[0].trim()
  return values.map((v) => p.option_labels[v] ?? v).join('; ')
}

export function buildDraftRecord(input: DraftRecordInput): DraftRecordView {
  const { guidance, state } = input
  const prov = guidance.facts.provenance
  const claimsById = new Map(input.topicClaims.map((c) => [c.claim_id, c]))

  // Names as the creator typed them, per canonical id.
  const toolName = (id: string) => prov.tools.find((t) => t.tool_id === id)?.declared ?? id
  const providerName = (id: string) => prov.providers.find((p) => p.provider_id === id)?.declared ?? id
  const subjectOf = (claim: TopicClaim | undefined): string => {
    if (!claim) return T.subject_general
    const tool = (claim.tool_scope ?? []).find((t) => prov.tools.some((x) => x.tool_id === t))
    if (tool) return T.subject_tool(toolName(tool))
    const provider = (claim.provider_scope ?? []).find((p) => prov.providers.some((x) => x.provider_id === p))
    if (provider) return T.subject_provider(providerName(provider))
    return T.subject_general
  }

  // ── Declarations ──
  const groups: DraftDeclarationGroup[] = []
  for (const section of SECTION_ORDER) {
    const rows: DraftRow[] = []
    if (section === 'tools') {
      state.tools.forEach((t, i) => {
        const instance = toolInstance(i)
        const toolRec = prov.tools.find((x) => x.instance === instance)
        for (const q_id of input.shown.per_tool) {
          const p = input.presentation[q_id]
          const value = answerText(p, t[q_id])
          let note: string | undefined
          if (q_id === 'T1') note = toolRec?.tool_id ? T.tool_recognized(toolName(toolRec.tool_id)) : T.tool_not_recognized
          if (q_id === 'T3' && toolRec?.tool_id) note = planNote(prov, instance, t[q_id])
          rows.push({ label: `${T.tool_heading(i + 1)} — ${p.text}`, value, ...(note ? { note } : {}) })
        }
      })
    } else {
      for (const q_id of input.question_order) {
        const p = input.presentation[q_id]
        if (!p || p.per_tool || p.section !== section || !input.shown.single.includes(q_id)) continue
        const values = state.answers[q_id]
        const row: DraftRow = { label: p.text, value: answerText(p, values) }
        if (EXISTENCE_QUESTIONS.has(q_id) && values && values.length > 0) row.note = existenceSentence(values[0])
        rows.push(row)
      }
    }
    if (rows.length === 0) continue
    groups.push({ id: section, heading: T.declaration_group[section], rows, ...(section === 'locations' ? { note: T.locations_note } : {}) })
  }

  // ── Guidance ──
  const cards: DraftGuidanceCard[] = guidance.composition.items.map((item) => guidanceCard(item, claimsById.get(item.claim_id), subjectOf, toolName, prov, input))

  // ── Open items (deduplicated by dependency) ──
  const openById = new Map<string, DraftOpenItem>()
  for (const item of guidance.composition.items) {
    const subject = subjectOf(claimsById.get(item.claim_id))
    for (const row of item.dependency_rows) {
      const existing = openById.get(row.dependency_id)
      if (existing) {
        if (!existing.for_guidance.includes(subject)) existing.for_guidance.push(subject)
        continue
      }
      openById.set(row.dependency_id, {
        dependency_id: row.dependency_id,
        label: row.label ?? T.open_unlabelled,
        told_us: row.declarations.length > 0 ? row.declarations.map((d) => d.answer_verbatim).join('; ') : T.open_told_us_none,
        documents: T.open_documents_none,
        evidence: row.evidence_note ?? T.open_evidence_default,
        sufficiency: T.open_sufficiency,
        status: T.open_status,
        for_guidance: [subject],
      })
    }
  }
  const openItems = Array.from(openById.values())
  const documentsMentioned: DraftRow[] = input.question_order
    .filter((q) => EXISTENCE_QUESTIONS.has(q) && input.shown.single.includes(q) && (state.answers[q] ?? []).length > 0)
    .map((q) => ({ label: input.presentation[q].text, value: answerText(input.presentation[q], state.answers[q]), note: existenceSentence(state.answers[q][0]) }))

  // ── Not shown ──
  const notShown: string[] = []
  const add = (line: string) => {
    if (!notShown.includes(line)) notShown.push(line)
  }
  const shownIds = new Set(guidance.composition.items.map((i) => i.claim_id))
  for (const t of prov.tools) if (t.tool_id === null && t.declared.trim() !== '' && t.declared !== 'not_sure') add(T.not_shown_unrecognized(t.declared))
  for (const p of prov.providers) if (p.provider_id === null && p.declared.trim() !== '' && p.declared !== 'not_sure') add(T.not_shown_unrecognized(p.declared))
  for (const tr of guidance.objectives) {
    for (const id of tr.excluded_not_met) {
      const claim = claimsById.get(id)
      add(T.not_shown_other_condition(subjectOf(claim), conditionDetail(claim, toolName)))
    }
    for (const r of tr.refused_before_bi) {
      const subject = subjectOf(claimsById.get(r.claim_id))
      if (r.reason === 'jurisdiction_scoped_guidance_disabled') add(T.not_shown_location)
      else if (r.reason === 'no_ledger_entry' || r.reason === 'not_eligible') add(cards.some((c) => c.subject === subject) ? T.not_shown_more_no_entry(subject) : T.not_shown_no_entry(subject))
      else add(T.not_shown_could_not_show(subject))
    }
  }
  for (const o of guidance.composition.omissions) if (!shownIds.has(o.claim_id)) add(T.not_shown_could_not_show(subjectOf(claimsById.get(o.claim_id))))
  // A recognized tool or provider with no guidance at all reaching this record.
  const covered = (subject: string) => cards.some((c) => c.subject === subject) || notShown.some((l) => l.startsWith(`${subject}:`))
  for (const t of prov.tools) if (t.tool_id && !covered(T.subject_tool(toolName(t.tool_id)))) add(T.not_shown_no_entry(T.subject_tool(toolName(t.tool_id))))
  for (const p of prov.providers) if (p.provider_id && !covered(T.subject_provider(providerName(p.provider_id)))) add(T.not_shown_no_entry(T.subject_provider(providerName(p.provider_id))))

  // ── Independent review ──
  const review: string[] = []
  if (openItems.length > 0) review.push(T.review_open_items)
  if ((state.answers.L1 ?? []).includes('yes') && input.shown.single.includes('L1')) review.push(T.review_likeness)
  if ((state.answers.M0 ?? []).some((v) => v === 'brands' || v === 'client_material') && input.shown.single.includes('M0')) review.push(T.review_third_party)
  review.push(T.review_laws)

  const title = answerText(input.presentation.P1 ?? { q_id: 'P1', input: 'text', required: true, per_tool: false, option_labels: {}, allow_not_sure: false }, state.answers.P1)

  return {
    pilot: input.pilot,
    banner: input.pilot ? { title: T.prototype_banner_title, lines: [...T.prototype_banner_lines] } : null,
    header: { title, record_title: T.record_title, record_id: input.record.record_id, version: input.record.version, prepared_on: input.record.prepared_on, status: T.status_draft },
    summary: [T.summary_intro, T.summary_counts(cards.length, openItems.length), T.summary_not_assessment],
    declarations: { intro: T.declarations_intro, groups },
    guidance: { intro: T.guidance_intro, cards, empty: cards.length === 0 ? T.guidance_none : null },
    open_items: { intro: T.open_items_intro, items: openItems, empty: openItems.length === 0 ? T.open_none : null, documents_mentioned: documentsMentioned },
    not_shown: { intro: T.not_shown_intro, lines: notShown.length > 0 ? notShown : [T.not_shown_none] },
    independent_review: { intro: T.independent_review_intro, lines: review },
    not_done: [...T.not_done],
    method: [
      { label: T.method_record, value: `${input.record.record_id} v${input.record.version}` },
      { label: T.method_registry, value: input.versions.registry },
      { label: T.method_ledger, value: input.versions.ledger },
      { label: T.method_as_of, value: input.versions.as_of },
      { label: T.method_engine, value: T.method_engine_value },
    ],
    trace: {
      objectives: guidance.objectives,
      omissions: guidance.composition.omissions,
      governance_gaps: guidance.governance_gaps,
      dropped_facts: prov.dropped,
      discarded_answers: [...input.discarded],
    },
  }
}

type Prov = CreatorRecordGuidanceResult['facts']['provenance']

function planNote(prov: Prov, instance: string, values: readonly string[] | undefined): string {
  if (!values || values[0] === 'not_sure') return T.plan_not_sure
  const plan = prov.plans.find((p) => p.instance === instance)
  if (!plan) return T.plan_not_sure
  if (plan.passed_to_applicability) return T.plan_used
  if (prov.dropped.some((d) => d.observation_id === plan.observation_id && d.reason === 'plan_conflicting_declarations')) return T.plan_conflicting
  const sameTool = prov.plans.filter((p) => p.tool_id === plan.tool_id)
  if (new Set(sameTool.map((p) => p.declared.trim().toLowerCase())).size > 1) return T.plan_conflicting
  return T.plan_not_a_plan_name
}

function conditionDetail(claim: TopicClaim | undefined, toolName: (id: string) => string): string {
  const reqs: ApplicabilityRequirement[] = claim ? [...claim.applicability_requirements, ...(claim.applicability_any_of ?? []).flat()] : []
  const plan = reqs.find((r) => r.fact === 'tool_plan_tier' && r.tool)
  return plan ? T.plan_detail(toolName(plan.tool as string), String(plan.value)) : T.condition_detail
}

function guidanceCard(
  item: GuidanceItem,
  claim: TopicClaim | undefined,
  subjectOf: (c: TopicClaim | undefined) => string,
  toolName: (id: string) => string,
  prov: Prov,
  input: DraftRecordInput,
): DraftGuidanceCard {
  const basis = item.declared_applicability_basis
    .filter((b) => b.fact === 'tool_plan_tier' && b.tool)
    .map((b) => T.basis_plan(toolName(b.tool as string), prov.plans.find((p) => p.observation_id === b.observation_id)?.declared ?? String(b.normalized_value)))

  const depends: string[] = []
  for (const r of item.applicability.material_unresolved) {
    const tool = r.tool ? toolName(r.tool) : null
    if (r.fact === 'tool_plan_tier' && tool) {
      const mine = prov.plans.filter((p) => p.tool_id === r.tool)
      const conflicting = new Set(mine.map((p) => p.declared.trim().toLowerCase())).size > 1
      if (conflicting) depends.push(T.depends_plan_conflicting(tool, String(r.value)))
      else if (mine.length > 0) depends.push(T.depends_plan_not_named(tool, String(r.value), mine[0].declared))
      else depends.push(T.depends_plan_missing(tool, String(r.value)))
    } else if (r.fact === 'tool_account_status' && tool) depends.push(T.depends_account(tool, String(r.value)))
    else depends.push(T.depends_other)
  }
  if (item.dependency_rows.length > 0) depends.push(T.depends_open_items)

  return {
    claim_id: item.claim_id,
    subject: subjectOf(claim),
    conclusion: item.conclusion,
    conclusion_label: T.conclusion_label[item.conclusion],
    explanation: item.explanation,
    basis,
    depends_on: Array.from(new Set(depends)),
    open_item_labels: item.dependency_rows.map((r) => r.label ?? T.open_unlabelled),
    caveats: item.required_caveats.map((id) => input.caveatText(id)).filter((t): t is string => !!t),
    source: T.source_line(item.provenance.claim.last_verified),
    provenance: {
      claim_id: item.claim_id,
      publication_entry: item.provenance.publication.entry_id,
      objective: item.provenance.objective.objective_id,
      bi_status: item.provenance.bounded_interpretation.status,
    },
  }
}
