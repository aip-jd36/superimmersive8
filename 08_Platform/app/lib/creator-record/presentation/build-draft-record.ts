/**
 * CR-V2-VERTICAL-SLICE-1 — the readable draft Creator Record (view model).
 *
 * Pure and deterministic. Built ONLY from:
 *   - the creator's own answers (verbatim) and the declared observations;
 *   - the existing guidance pipeline's result (`runCreatorRecordGuidance`):
 *     composition items, their dependency rows, omissions, and the per-
 *     objective trace — never re-derived here;
 *   - ledger explanations, labels, evidence notes and caveats (passed in);
 *   - the fixed templates in `./templates`;
 *   - (CR-V2-EVIDENCE-SLICE-1) the documents the creator added, shown ONLY
 *     as what each appears to show;
 *   - (CR-V2-MVP-6) the server-computed, provisional evidence reconciliation
 *     (`reconcileToolEvidence`), shown as its own statement type, always with
 *     its limitation.
 * It never evaluates applicability, never reads Bounded Interpretation prose,
 * and never upgrades a conclusion: the conclusion label is a fixed mapping of
 * composition's own (already narrowed) conclusion. Documents cannot change a
 * conclusion: guidance is computed before this module and only from
 * declarations.
 *
 * Statement types are kept apart, as the PRD requires (v0.3 §4.1):
 * declarations / documents / guidance / open items and missing evidence /
 * matters for independent review / what SI8 did not do.
 */

import type { CreatorRecordConclusion, GuidanceItem } from '../contract/compose'
import type { DeclaredObservation, DocumentObservation } from '../contract/provenance'
import type { EvidenceReconciliation, FieldReconciliation, ToolDocument } from '../evidence/document-observations'
import type { CreatorRecordGuidanceResult } from '../integration/run-creator-record-guidance'
import type { ApplicabilityRequirement, TopicClaim } from '@/lib/retrieval-engine/types'
import type { CreatorRecordFormState, DiscardedAnswer, QuestionPresentation } from '../prototype/form'
import { toolInstance } from '../prototype/form'
import { identityLabel, OTHER_PROVIDER, OTHER_TOOL } from '../identity/selectable-identities'
import { DOCUMENT_FIELDS } from '../evidence/document-observations'
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

/**
 * CR-V2-MVP-1 (CR-V2-COMP-001): information a piece of guidance depends on
 * that this record does not establish — Bounded Interpretation's unresolved
 * applicability (`material_unresolved`), aggregated per fact and tool. Distinct
 * from evidence dependencies (`DraftOpenItem`). Never a new obligation: each
 * entry comes from a requirement already on a governed claim shown here.
 */
export interface DraftNotEstablished {
  key: string
  label: string
  told_us: string
  status: string
  for_guidance: string[]
}

export interface DraftDocument {
  document_id: string
  heading: string
  rows: DraftRow[]
  notes: string[]
}

/** CR-V2-MVP-6: one tool's provisional comparison of declarations with a document. */
export interface DraftReconciliation {
  tool_index: number
  heading: string
  document_id: string | null
  rows: DraftRow[]
}

export interface DraftRecordView {
  pilot: boolean
  banner: { title: string; lines: string[] } | null
  header: { title: string; record_title: string; record_id: string; version: number; prepared_on: string; status: string }
  summary: string[]
  declarations: { intro: string; groups: DraftDeclarationGroup[] }
  documents: { intro: string; items: DraftDocument[]; empty: string | null }
  reconciliation: { intro: string; items: DraftReconciliation[]; empty: string | null }
  guidance: { intro: string; cards: DraftGuidanceCard[]; empty: string | null }
  open_items: { intro: string; not_established: DraftNotEstablished[]; items: DraftOpenItem[]; empty: string | null; documents_mentioned: DraftRow[] }
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
    /** Display-only document observations. None of them was an input to guidance. */
    document_observations: DocumentObservation[]
    /** Server-computed; never an input to guidance. */
    evidence_reconciliation: EvidenceReconciliation[]
  }
}

export interface DraftRecordInput {
  state: CreatorRecordFormState
  presentation: Readonly<Record<string, QuestionPresentation & { section: string; text: string }>>
  /** Question order (registry order). */
  question_order: readonly string[]
  /** Questions shown at submission; anything else is "not asked". `per_tool` is per tool block. */
  shown: { single: readonly string[]; per_tool: readonly (readonly string[])[] }
  observations: readonly DeclaredObservation[]
  discarded: readonly DiscardedAnswer[]
  guidance: CreatorRecordGuidanceResult
  topicClaims: readonly TopicClaim[]
  dependencyLabel: (id: string) => string | undefined
  caveatText: (id: string) => string | undefined
  record: { record_id: string; version: number; prepared_on: string }
  versions: { registry: string; ledger: string; as_of: string }
  pilot: boolean
  /** Documents the creator added, already validated. Display-only. */
  documents?: readonly ToolDocument[]
  document_observations?: readonly DocumentObservation[]
  /** Server-computed provisional reconciliation, one per tool block. Display-only. */
  reconciliation?: readonly EvidenceReconciliation[]
}

const EXISTENCE_QUESTIONS = new Set(['L3', 'M2', 'M3D', 'M4'])
const SECTION_ORDER = ['project', 'locations', 'tools', 'people', 'materials', 'contribution']
/** Free-text names typed for something not in SI8's lists. Kept verbatim; never resolved. */
const UNLISTED_NAME_QUESTIONS = new Set(['T1X', 'M1X', 'M3X'])

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
  if (p.input === 'text' || p.input === 'textarea' || p.input === 'plan') return values[0] === 'not_sure' ? 'Not sure' : values[0].trim()
  return values.map((v) => p.option_labels[v] ?? v).join('; ')
}

function providerNote(value: string | undefined): string | undefined {
  if (value === OTHER_PROVIDER) return T.provider_not_listed
  return undefined
}

export function buildDraftRecord(input: DraftRecordInput): DraftRecordView {
  const { guidance, state } = input
  const prov = guidance.facts.provenance
  const claimsById = new Map(input.topicClaims.map((c) => [c.claim_id, c]))
  const documents = input.documents ?? []

  // Canonical identities are named by their display label; anything else as declared.
  const toolName = (id: string) => (identityLabel(id) !== id ? identityLabel(id) : prov.tools.find((t) => t.tool_id === id)?.declared ?? id)
  const providerName = (id: string) => (identityLabel(id) !== id ? identityLabel(id) : prov.providers.find((p) => p.provider_id === id)?.declared ?? id)
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
        for (const q_id of input.shown.per_tool[i] ?? []) {
          const p = input.presentation[q_id]
          const value = answerText(p, t[q_id])
          let note: string | undefined
          if (q_id === 'T1') {
            const code = (t.T1 ?? [])[0]
            note = toolRec?.tool_id ? T.tool_recognized(toolName(toolRec.tool_id)) : code === OTHER_TOOL ? T.tool_not_listed : code === 'not_sure' ? T.tool_unsure : T.tool_not_recognized
          }
          if (q_id === 'T1X') note = T.tool_not_recognized
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
        if ((q_id === 'M1' || q_id === 'M3') && values && values.length > 0) {
          const n = providerNote(values[0])
          if (n) row.note = n
        }
        if (UNLISTED_NAME_QUESTIONS.has(q_id) && values && values.length > 0) row.note = T.provider_not_recognized
        rows.push(row)
      }
    }
    if (rows.length === 0) continue
    groups.push({ id: section, heading: T.declaration_group[section], rows, ...(section === 'locations' ? { note: T.locations_note } : {}) })
  }

  // ── Documents (display-only; never an input to guidance) ──
  const documentItems: DraftDocument[] = documents.map((d) => documentView(d))
  // ── Provisional reconciliation (server-computed; display-only) ──
  const reconciliation = input.reconciliation ?? []
  const reconItems: DraftReconciliation[] = documents.length === 0 ? [] : reconciliation.map((r) => reconciliationView(r))

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
        documents: documents.length > 0 ? T.open_documents_some : T.open_documents_none,
        evidence: row.evidence_note ?? T.open_evidence_default,
        sufficiency: T.open_sufficiency,
        status: T.open_status,
        for_guidance: [subject],
      })
    }
  }
  const openItems = Array.from(openById.values())

  // ── Information not established (unresolved applicability, CR-V2-COMP-001) ──
  const notEstablishedByKey = new Map<string, DraftNotEstablished>()
  for (const item of guidance.composition.items) {
    const subject = subjectOf(claimsById.get(item.claim_id))
    for (const r of item.applicability.material_unresolved) {
      const key = `${r.fact}:${r.tool ?? ''}`
      const existing = notEstablishedByKey.get(key)
      if (existing) {
        if (!existing.for_guidance.includes(subject)) existing.for_guidance.push(subject)
        continue
      }
      const tool = r.tool ? toolName(r.tool) : null
      const declaredPlans = r.tool ? Array.from(new Set(prov.plans.filter((p) => p.tool_id === r.tool).map((p) => p.declared))) : []
      const label =
        r.fact === 'tool_plan_tier' && tool ? T.not_established_plan(tool) : r.fact === 'tool_account_status' && tool ? T.not_established_account(tool) : T.not_established_other
      const told_us = r.fact === 'tool_plan_tier' ? (declaredPlans.length > 0 ? declaredPlans.join('; ') : T.not_established_told_plan_none) : T.open_told_us_none
      notEstablishedByKey.set(key, { key, label, told_us, status: T.open_status, for_guidance: [subject] })
    }
  }
  const notEstablished = Array.from(notEstablishedByKey.values())
  const unresolvedGuidance = cards.filter((c) => c.conclusion === 'relevant_applicability_unresolved').length
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
  // Names typed for a tool or service not in SI8's lists (kept exactly as typed).
  state.tools.forEach((t, i) => {
    if ((input.shown.per_tool[i] ?? []).includes('T1X') && (t.T1X ?? []).some((v) => v.trim() !== '')) add(T.not_shown_unrecognized(t.T1X[0].trim()))
  })
  for (const q of ['M1X', 'M3X']) if (input.shown.single.includes(q) && (state.answers[q] ?? []).some((v) => v.trim() !== '')) add(T.not_shown_unrecognized(state.answers[q][0].trim()))
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
  if (notEstablished.length > 0) review.push(T.review_not_established)
  if (openItems.length > 0) review.push(T.review_open_items)
  if ((state.answers.L1 ?? []).includes('yes') && input.shown.single.includes('L1')) review.push(T.review_likeness)
  if ((state.answers.M0 ?? []).some((v) => v === 'brands' || v === 'client_material') && input.shown.single.includes('M0')) review.push(T.review_third_party)
  review.push(T.review_laws)

  const title = answerText(input.presentation.P1 ?? { q_id: 'P1', input: 'text', required: true, per_tool: false, option_labels: {}, allow_not_sure: false }, state.answers.P1)

  const anyLive = documents.some((d) => d.document.extraction_mode === 'live_model' && d.document.model_calls > 0)
  const bannerSecond = documents.length === 0 ? T.record_banner_no_files : anyLive ? T.record_banner_files_live : T.record_banner_files_replay
  const documentMethod = documentMethodRow(documents)

  return {
    pilot: input.pilot,
    banner: input.pilot ? { title: T.prototype_banner_title, lines: [T.record_banner_pilot, bannerSecond] } : null,
    header: { title, record_title: T.record_title, record_id: input.record.record_id, version: input.record.version, prepared_on: input.record.prepared_on, status: T.status_draft },
    summary: [T.summary_intro, T.summary_counts(cards.length, unresolvedGuidance, notEstablished.length + openItems.length), T.summary_not_assessment],
    declarations: { intro: T.declarations_intro, groups },
    documents: { intro: T.documents_intro, items: documentItems, empty: documentItems.length === 0 ? T.documents_none : null },
    reconciliation: { intro: T.recon_intro, items: reconItems, empty: reconItems.length === 0 ? T.recon_none : null },
    guidance: { intro: T.guidance_intro, cards, empty: cards.length === 0 ? T.guidance_none : null },
    open_items: {
      intro: T.open_items_intro,
      not_established: notEstablished,
      items: openItems,
      empty: openItems.length === 0 && notEstablished.length === 0 ? T.open_none : null,
      documents_mentioned: documentsMentioned,
    },
    not_shown: { intro: T.not_shown_intro, lines: notShown.length > 0 ? notShown : [T.not_shown_none] },
    independent_review: { intro: T.independent_review_intro, lines: review },
    not_done: documents.length > 0 ? [...T.not_done, T.not_done_documents] : [...T.not_done],
    method: [
      { label: T.method_record, value: `${input.record.record_id} v${input.record.version}` },
      { label: T.method_registry, value: input.versions.registry },
      { label: T.method_ledger, value: input.versions.ledger },
      { label: T.method_as_of, value: input.versions.as_of },
      { label: T.method_engine, value: T.method_engine_value },
      ...(documentMethod ? [documentMethod] : []),
    ],
    trace: {
      objectives: guidance.objectives,
      omissions: guidance.composition.omissions,
      governance_gaps: guidance.governance_gaps,
      dropped_facts: prov.dropped,
      discarded_answers: [...input.discarded],
      document_observations: [...(input.document_observations ?? [])],
      evidence_reconciliation: [...reconciliation],
    },
  }
}

function documentMethodRow(documents: readonly ToolDocument[]): DraftRow | null {
  const examined = documents.filter((d) => d.document.outcome === 'document_examined')
  if (examined.length === 0) return null
  const values = Array.from(
    new Set(
      examined.map((d) =>
        d.document.extraction_mode === 'live_model'
          ? T.method_documents_live(d.document.versions.schema, d.document.versions.prompt ?? '')
          : T.method_documents_replay(d.document.versions.schema, d.document.versions.replay_set ?? ''),
      ),
    ),
  )
  return { label: T.method_documents, value: values.join('; ') }
}

function documentView(td: ToolDocument): DraftDocument {
  const d = td.document
  const rows: DraftRow[] = [{ label: T.doc_fingerprint_label, value: d.sha256, note: T.doc_fingerprint_note }]
  const notes: string[] = []
  if (d.outcome !== 'document_examined' || !d.extraction) {
    rows.push({ label: T.doc_read_label, value: T.doc_not_read[d.reason ?? 'model_error'] ?? T.doc_not_read.model_error })
  } else {
    const ex = d.extraction
    rows.push({ label: T.doc_read_label, value: d.extraction_mode === 'fixture_replay' ? T.doc_read_replay : T.doc_read_live(d.model_calls) })
    rows.push({ label: T.doc_type_label, value: T.doc_type[ex.document_type] ?? T.doc_type.unknown })
    rows.push({ label: T.doc_readability_label, value: T.doc_readability[ex.readability] ?? ex.readability })
    for (const name of DOCUMENT_FIELDS) {
      const f = ex[name]
      const row: DraftRow =
        f.status === 'present'
          ? { label: T.doc_field_label[name], value: T.doc_field_present(f.value as string), ...(f.evidence ? { note: T.doc_field_excerpt(f.evidence) } : {}) }
          : { label: T.doc_field_label[name], value: T.doc_field_status[f.status] }
      if (name === 'issuer_name' && f.status === 'present') row.note = row.note ? `${row.note} ${T.doc_issuer_note}` : T.doc_issuer_note
      rows.push(row)
    }
    rows.push({ label: T.doc_plan_names_label, value: ex.plan_candidates.length > 0 ? ex.plan_candidates.map((c) => `“${c.text}”`).join('; ') : T.doc_plan_names_none })
    if (ex.multiple_plans_shown) notes.push(T.doc_multiple_plans)
    if (ex.instruction_like_text_present) notes.push(T.doc_instruction_text)
  }
  return { document_id: d.document_id, heading: T.doc_heading(td.tool_index + 1, d.file_name), rows, notes }
}

/** One fixed result label + its fixed reason, then the limitation for any "appears" result. */
function reconciliationRow(label: string, f: FieldReconciliation): DraftRow {
  const limit = f.result === 'appears_consistent' ? T.recon_limit_consistent : f.result === 'appears_to_conflict' ? T.recon_limit_conflict : null
  return { label, value: T.recon_result[f.result], note: limit ? `${T.recon_reason[f.reason]} ${limit}` : T.recon_reason[f.reason] }
}

function reconciliationView(r: EvidenceReconciliation): DraftReconciliation {
  return {
    tool_index: r.tool_index,
    heading: T.recon_heading(r.tool_index + 1),
    document_id: r.document_id,
    rows: [reconciliationRow(T.recon_provider_label, r.provider), reconciliationRow(T.recon_plan_label, r.plan)],
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
  // Bounded Interpretation holds this guidance at "may be relevant" for its whole purpose (objective),
  // although none of its own conditions is unresolved: say why rather than show nothing (CR-V2-COMP-001).
  if (item.conclusion === 'relevant_applicability_unresolved' && depends.length === 0) depends.push(T.depends_shared_purpose)

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
