/**
 * CR-SUM-PDF-A — test fixtures only (never imported by application code).
 *
 * The five synthetic scenarios of the consultative-summary proofs, as real records built locally by the real builder:
 * from the LIVE approved sources (Runway, Higgsfield), or from the pilot sources under a synthetic questionnaire/wording
 * approval. The Artlist entry used here is an approved TEST COPY of the staged proposal (the proposal itself stays Pending
 * and outside the live ledger); the Pika and Getty entries are the pilot ledger's, renamed SYN-. All test-only.
 *
 * The wording is the PROPOSED CR-SUM-2C render set and the CR-STAGE1-APPROVAL-1 summary set (draft fingerprints
 * 083ac093… and 20d844ad…), read from the approved PDF set where reused, under approvals labelled as SYNTHETIC and
 * registered nowhere. Nothing here approves any wording.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { GovernanceApproval } from '@/lib/creator-record/contract/types'
import { loadQuestionRegistry } from '@/lib/creator-record/contract/question-registry'
import type { PublicationLedgerEntry } from '@/lib/creator-record/contract/publication-ledger'
import { approvedCustomerRecordInputs, approvedPdfTemplates } from '@/lib/creator-record/customer-flow/approved-inputs'
import { buildCustomerRecord, CUSTOMER_RECORD_SCHEMA, CUSTOMER_RECORD_SCHEMA_VERSION } from '@/lib/creator-record/customer-record/record'
import { SOURCE_TEXT_CATEGORIES, SOURCE_TEXT_SOURCE_ID, sourceTextContent, sourceTextDigest } from '@/lib/creator-record/customer-record/source-text'
import { CREATOR_RECORD_CAVEATS, CREATOR_RECORD_GOVERNANCE_AUTHORITY as GOV, CREATOR_RECORD_PUBLICATION_LEDGER } from '@/lib/creator-record/governed/sources'
import { pilotSources, type CreatorRecordSources } from '@/lib/creator-record/prototype/build-draft'
import { readinessRenderFingerprint, type ReadinessRenderApproval, type ReadinessRenderTemplates } from '@/lib/creator-record/readiness-summary/render'
import { readinessTemplatesFingerprint, READINESS_SUMMARY_METHOD, type ReadinessSummaryApproval, type ReadinessSummaryTemplates } from '@/lib/creator-record/readiness-summary/summary'
import { TOPIC_CLAIMS_FIXTURE } from '@/lib/retrieval-engine/topic-claims-fixture'
import { withQuestionnaireApproval } from './questionnaire-approval'
import { preCutoverLiveSet } from './registered-template-sets'

export const SYNTHETIC_PROOF_AUTHORITY = 'SYNTHETIC TEST APPROVAL — CR-SUM-PDF-A proof — NOT APPROVED WORDING'

const V3 = (preCutoverLiveSet(8).templates as any) // CR-V2-MVP-APPROVAL-AND-RELEASE-1: the registered v3 set

/** Proposed summary set. CR-PDF-IMPL-1: wording as in CR-PDF-WORDING-2 / CR-PDF-APPROVAL-1 (R1, R2). PROPOSED, NOT APPROVED. */
export const PROPOSED_SUMMARY_TEMPLATES: ReadinessSummaryTemplates = {
  template_id: 'si8/creator-record-v2-readiness-summary-templates',
  version: 1,
  conclusion_labels: { relevant_on_declared_facts: V3.conclusion_labels.relevant_on_declared_facts, relevant_applicability_unresolved: V3.conclusion_labels.relevant_applicability_unresolved },
  topic_labels: { commercial_use: V3.topic_labels.commercial_use, third_party_source_rights: V3.topic_labels.third_party_source_rights },
  topic_framing: {
    commercial_use: 'The terms of an AI tool may contain conditions or restrictions on commercial use of its output.',
    third_party_source_rights: 'Music, stock footage and other third-party material may be subject to licence conditions and other rights or permissions that this record does not establish.',
  },
  selected_because_label: V3.sections.guidance.selected_because,
  based_on_label: V3.sections.guidance.on_what_you_told_us,
  subject_questions: ['T1', 'T1X', 'M1', 'M1X', 'M3', 'M3X'],
  topic_qualified_note: V3.sections.guidance.topic_level,
  unspecified_condition_note: V3.sections.guidance.unspecified_condition,
}

/** Proposed render set. CR-PDF-IMPL-1: wording as in CR-PDF-WORDING-2 / CR-PDF-APPROVAL-1 (V1–V3, H1, G4, N3, N4). PROPOSED. */
export const PROPOSED_RENDER_TEMPLATES: ReadinessRenderTemplates = {
  template_id: 'si8/creator-record-v2-readiness-render-templates',
  version: 1,
  summary_method: { ...READINESS_SUMMARY_METHOD },
  heading: 'Commercial-readiness considerations',
  // CR-PDF-RELEASE-FIX-1 (FZ-3, PROPOSED): neutral to how many considerations apply; assumes nothing was named.
  orientation: 'This section brings together any of SI8’s published guidance that was selected from what you told SI8, what remains open, and what this record does not establish. It does not weigh these points against each other or reach an overall conclusion, and it is not a decision about whether the video may be used commercially.',
  declared_heading: V3.sections.open_items.what_you_told_us,
  guidance_heading: 'What SI8’s published guidance says',
  guidance_intro: V3.sections.guidance.intro,
  item_limitation: V3.sections.guidance.item_limitation,
  dependency_told_label: V3.sections.open_items.what_you_told_us,
  dependency_nothing_told: V3.sections.open_items.nothing_told,
  dependency_evidence_label: V3.sections.open_items.evidence_note,
  conclusion_label: V3.sections.guidance.conclusion,
  caveats_label: V3.sections.guidance.caveats,
  consideration_ref_label: 'Consideration',
  caveat_applies_to_label: 'Applies to considerations',
  depends_on_label: V3.sections.guidance.depends_on,
  fact_labels: V3.fact_labels,
  unresolved_heading: 'Considerations and what remains open',
  unresolved_intro: 'An open item is not a problem SI8 has found, and it is not resolved by anything in this record.',
  unresolved_empty: V3.sections.open_items.empty,
  dependency_status_label: V3.sections.open_items.status,
  dependency_status_labels: V3.dependency_codes.status,
  dependency_sufficiency_label: V3.sections.open_items.sufficiency,
  dependency_sufficiency_labels: V3.dependency_codes.sufficiency,
  topic_qualified_heading: V3.sections.open_items.topic_qualified_heading,
  unspecified_heading: V3.sections.open_items.unspecified_heading,
  not_sure_heading: V3.sections.open_items.not_sure_heading,
  not_established_heading: 'What this record does not establish',
  // CR-PDF-RELEASE-FIX-1 (PROPOSED). FZ-2: replaces the guidance introduction when no consideration applies (the approved
  // `sections.guidance.empty`, which says what SI8 has published, is not used by this layout). G4: singular and plural forms.
  guidance_none_selected: 'No guidance was selected for this record.',
  uncovered_intro: {
    one: 'This record contains no SI8 guidance for this tool or service you named:',
    other: 'This record contains no SI8 guidance for these tools and services you named:',
  },
  rest_of_answers: 'The rest of your answers received no guidance in this record. That is not a finding about them: it neither suggests nor rules out commercial use, and it does not mean there is nothing to consider.',
  assurance_heading: 'How this differs from a human-reviewed assessment',
  // CR-PDF-RELEASE-FIX-1 (R3 / F2, PROPOSED): second person, as in the rest of the record.
  assurance_text: 'This record organises what you declared and what SI8’s published guidance says about it. It does not examine the evidence behind your answers, resolve open items or decide whether your video may be used commercially. SI8’s Commercial Assurance Assessment is a separate service in which a person at SI8 reviews a project and its evidence.',
  // N3: set per schema by the proposed template sets (`./readiness-proposed-templates`); this unnumbered value is a fixture default.
  limitations_heading: 'Limitations of this record',
  overview_no_open: 'No open item was identified for this consideration from what you told SI8. This does not mean nothing is open.',
  // CR-PDF-REVIEW-2 — PROPOSED, NOT APPROVED. U1: subject answers that identify no tool or service. U2/U3: the About count of open
  // items shown as its two parts (items linked to considerations; answers the creator was not sure about). Same total.
  guidance_unidentified: {
    one: 'No guidance specific to a tool or service could be selected for this answer, because you did not identify the tool or service:',
    other: 'No guidance specific to a tool or service could be selected for these answers, because you did not identify the tools or services:',
  },
  // CR-PDF-DECISION-1 — PROPOSED, NOT APPROVED. W1: About opening when no consideration applies (schema 7 form; the proposed
  // schema 8 set replaces it with its own form, see `./readiness-proposed-templates`).
  about_intro_no_guidance: 'This Creator Record sets out what you told SI8 about your AI video. None of the general educational guidance that SI8 has published was selected from what you told SI8.',
  count_open_linked: { one: '{n} open item linked to considerations.', other: '{n} open items linked to considerations.' },
  count_not_sure: { one: '{n} answer you were not sure about.', other: '{n} answers you were not sure about.' },
}

export const SYNTHETIC_SUMMARY_APPROVAL: ReadinessSummaryApproval = { template_id: PROPOSED_SUMMARY_TEMPLATES.template_id, version: 1, fingerprint: readinessTemplatesFingerprint(PROPOSED_SUMMARY_TEMPLATES), lifecycle: 'approved', authority: SYNTHETIC_PROOF_AUTHORITY, decision_date: '2026-11-12' }
export const SYNTHETIC_RENDER_APPROVAL: ReadinessRenderApproval = { template_id: PROPOSED_RENDER_TEMPLATES.template_id, version: 1, fingerprint: readinessRenderFingerprint(PROPOSED_RENDER_TEMPLATES), lifecycle: 'approved', authority: SYNTHETIC_PROOF_AUTHORITY, decision_date: '2026-11-12' }

// ── record builders ──
const ACK = { A1: true, A2: true }
const RECORD = (id: string, version = 1) => ({ record_id: id, record_version: version, captured_at: '2026-11-12T00:00:00Z' })
export function liveRecord(id: string, answers: Record<string, string[]>, tools: Record<string, string[]>[], version = 1) {
  const i = approvedCustomerRecordInputs(GOV as never)
  const r = buildCustomerRecord({ state: { answers, tools, acknowledgements: ACK } as never, sources: i.sources as never, source_text: i.source_text as never, topicClaims: TOPIC_CLAIMS_FIXTURE, as_of: '2026-11-12', record: RECORD(id, version) })
  if (!r.ok) throw new Error(JSON.stringify(r).slice(0, 500))
  return r
}
const SYN: GovernanceApproval = { status: 'approved', approver: 'SYNTHETIC TEST APPROVER (fixture only)', decision_date: '2026-11-12', review_ref: 'SYNTHETIC-REVIEW-PDF-A' }
export function pilotSourcesWith(ledger: readonly PublicationLedgerEntry[] | null): CreatorRecordSources {
  const p = pilotSources()
  return withQuestionnaireApproval({
    ...p,
    kind: 'governed',
    registry_input: {
      ...p.registry_input,
      questions: p.registry_input.questions.map((q) => ({ ...q, approval: q.approval.status === 'approved' ? SYN : q.approval })),
      observation_map: p.registry_input.observation_map.map((o) => ({ ...o, approval: o.approval.status === 'approved' ? SYN : o.approval })),
    },
    ...(ledger ? { ledger, caveats: { ...p.caveats, ...CREATOR_RECORD_CAVEATS } } : { ledger: p.ledger.map((e) => ({ ...e, entry_id: e.entry_id.replace(/^PILOT-UAT-/, 'SYN-'), approver: SYN.approver })) }),
    versions: { registry: 'SYNTHETIC-REGISTRY-PDF-A', ledger: 'SYNTHETIC-LEDGER-PDF-A' },
  } as CreatorRecordSources)
}
export function pilotRecord(id: string, sources: CreatorRecordSources, answers: Record<string, string[]>, tools: Record<string, string[]>[]) {
  const acks = Object.fromEntries(sources.acknowledgement_ids.map((a) => [a, `Synthetic acknowledgement ${a} (test fixture only).`]))
  const loaded = loadQuestionRegistry(sources.registry_input)
  if (!loaded.ok) throw new Error('registry')
  const approval = {
    source_id: SOURCE_TEXT_SOURCE_ID as typeof SOURCE_TEXT_SOURCE_ID, version: 1, content_sha256: sourceTextDigest(sourceTextContent(sources, loaded.registry, acks)),
    categories: [...SOURCE_TEXT_CATEGORIES], record_schema: { id: CUSTOMER_RECORD_SCHEMA, version: CUSTOMER_RECORD_SCHEMA_VERSION },
    lifecycle: 'approved' as const, authority: 'SYNTHETIC TEST AUTHORITY (fixture only)', decision_date: '2026-11-12', review_ref: 'SYNTHETIC-TEXT-PDF-A',
  }
  const r = buildCustomerRecord({ state: { answers, tools, acknowledgements: ACK } as never, sources, source_text: { approval, acknowledgements: acks }, topicClaims: TOPIC_CLAIMS_FIXTURE, as_of: '2026-11-12', record: RECORD(id) })
  if (!r.ok) throw new Error(JSON.stringify(r).slice(0, 500))
  return r
}

const PROPOSAL = JSON.parse(readFileSync(join(__dirname, '../lib/creator-record/governed/proposals/CR-V2-LEDGER-4-artlist-standalone.proposal.json'), 'utf8')) as { entry: PublicationLedgerEntry }
/** TEST ONLY: the Artlist proposal as if approved. The staged proposal itself stays Pending and outside the live ledger. */
export const ARTLIST_APPROVED_TEST_COPY: PublicationLedgerEntry = { ...PROPOSAL.entry, creator_record_eligible: 'Yes', approver: 'SYNTHETIC TEST APPROVER', decision_date: '2026-11-12', refresh_by: '2027-02-12' }
const LIVE_PLUS_ARTLIST = [...CREATOR_RECORD_PUBLICATION_LEDGER.filter((e) => !e.superseded_by && e.creator_record_eligible === 'Yes'), ARTLIST_APPROVED_TEST_COPY]

const BASE = { P1: ['Synthetic PDF proof video'], P3: ['own_channels'], F1: ['TW'], F2: ['TW'], L1: ['no'], H1: ['edited'] }
const RUNWAY = { T1: ['runway-gen3'], T3: ['Pro'], T4: ['May 2026'] }
const HIGGSFIELD = { T1: ['higgsfield'], T3: ['Creator'], T4: ['May 2026'] }

/** The five scenarios. Each returns a real, verifying record (canonical + sha256 + record). */
export const READINESS_SCENARIOS = {
  '1-runway-higgsfield': () => liveRecord('PREP-PDFA-1', { ...BASE, M0: ['none'] }, [RUNWAY, HIGGSFIELD]),
  '2-tools-artlist-music': () => pilotRecord('PREP-PDFA-2', pilotSourcesWith(LIVE_PLUS_ARTLIST), { ...BASE, M0: ['music'], M1: ['artlist'], M2: ['yes'] }, [RUNWAY, HIGGSFIELD]),
  '3-tools-artlist-stock': () => pilotRecord('PREP-PDFA-3', pilotSourcesWith(LIVE_PLUS_ARTLIST), { ...BASE, M0: ['stock'], M3: ['artlist'], M3D: ['yes'] }, [RUNWAY, HIGGSFIELD]),
  '4-incomplete-declarations': () => liveRecord('PREP-PDFA-4', { ...BASE, L1: ['not_sure'], M0: ['music'], M1: ['not_sure'], M2: ['not_sure'] }, [{ T1: ['runway-gen3'], T3: ['not_sure'], T4: ['not_sure'] }, { T1: ['not_sure'], T3: ['not_sure'], T4: ['not_sure'] }]),
  '5-unresolved-and-topic-caps': () => pilotRecord('PREP-PDFA-5', pilotSourcesWith(null), { ...BASE, M0: ['stock'], M3: ['getty'], M3D: ['no'] }, [{ T1: ['pika'], T3: ['not_sure'], T4: ['May 2026'] }]),
} as const
export type ReadinessScenario = keyof typeof READINESS_SCENARIOS

// ── CR-SUM-PDF-B1: synthetic Option R template sets (TEST ONLY; registered nowhere) ──
import type { PdfTemplateApproval } from '@/lib/creator-record/customer-pdf/templates'
import { templateFingerprint } from '@/lib/creator-record/customer-pdf/templates'

export const SYNTHETIC_OPTION_R_AUTHORITY = 'SYNTHETIC TEST APPROVAL — CR-SUM-PDF-B1 Option R proof — NOT APPROVED WORDING'

/**
 * A synthetic Option R template set: an EXISTING template set (never modified) plus the `readiness_summary` block, as a new
 * version, under a synthetic approval of exactly that set. The render keys that mirror text the replaced sections printed
 * (guidance intro, item limitation, dependency labels) are taken from the base set itself, so they always match its schema.
 */
export function optionRTemplates(base: { templates: Record<string, unknown>; approval: PdfTemplateApproval }, schemaVersion: 7 | 8, block?: { summary: ReadinessSummaryTemplates; render: ReadinessRenderTemplates }): { templates: Record<string, unknown>; approval: PdfTemplateApproval } {
  const b = JSON.parse(JSON.stringify(base.templates)) as any
  const G = b.sections.guidance
  const O = b.sections.open_items
  // Every key that mirrors text the replaced sections printed comes from the base set itself; only new strings are proposed.
  const summary: ReadinessSummaryTemplates = block?.summary ?? {
    ...PROPOSED_SUMMARY_TEMPLATES,
    conclusion_labels: b.conclusion_labels,
    topic_labels: b.topic_labels,
    selected_because_label: G.selected_because,
    based_on_label: G.on_what_you_told_us,
    topic_qualified_note: G.topic_level,
    unspecified_condition_note: G.unspecified_condition,
  }
  const render: ReadinessRenderTemplates = block?.render ?? {
    ...PROPOSED_RENDER_TEMPLATES,
    declared_heading: O.what_you_told_us,
    guidance_intro: G.intro,
    item_limitation: G.item_limitation,
    conclusion_label: G.conclusion,
    caveats_label: G.caveats,
    depends_on_label: G.depends_on,
    fact_labels: b.fact_labels,
    unresolved_empty: O.empty,
    dependency_told_label: O.what_you_told_us,
    dependency_nothing_told: O.nothing_told,
    dependency_evidence_label: O.evidence_note,
    dependency_status_label: O.status,
    dependency_status_labels: b.dependency_codes.status,
    dependency_sufficiency_label: O.sufficiency,
    dependency_sufficiency_labels: b.dependency_codes.sufficiency,
    topic_qualified_heading: O.topic_qualified_heading,
    unspecified_heading: O.unspecified_heading,
    not_sure_heading: O.not_sure_heading,
  }
  // CR-PDF-DECISION-1: the reading-layout design never carries the integrated assessment (document readings are shown only in the
  // documents section). A set with both refuses; the base set's integrated-assessment wording is therefore not carried over.
  delete b.integrated_assessment
  const templates = { ...b, version: (b.version as number) + 100, readiness_summary: { summary: JSON.parse(JSON.stringify(summary)), render: JSON.parse(JSON.stringify(render)) } }
  return {
    templates,
    approval: {
      template_id: templates.template_id, version: templates.version, fingerprint: templateFingerprint(templates),
      record_schema: { id: CUSTOMER_RECORD_SCHEMA, version: schemaVersion }, lifecycle: 'approved', authority: SYNTHETIC_OPTION_R_AUTHORITY, decision_date: '2026-11-12', review_ref: null,
    },
  }
}
