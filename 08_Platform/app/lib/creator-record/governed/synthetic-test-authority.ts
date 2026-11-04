/**
 * CR-V2-MVP-M4B / M4C — the SYNTHETIC TEST publication authority, for an isolated end-to-end test only.
 *
 * NOT governance approval, and NOT SI8 wording. Selected only by `./publication-authority` in
 * 'synthetic-isolated-test' mode: outside Production, against a bound non-Production Supabase project,
 * with a Stripe test key. Governance mode (every Production deploy) never reads this file, and refuses
 * any bundle classed 'synthetic_test', so nothing here can become Production publication authority, on
 * any branch or deploy route.
 *
 * M4C content rules (test-enforced in `__tests__/creator-record/synthetic-test-authority.test.ts`):
 *   - every customer-visible string (question text, help, option labels, acknowledgements, caveats,
 *     dependency labels, ledger explanations and evidence notes, PDF template text) is NEW test-only
 *     wording marked "[TEST ONLY]" or "SYNTHETIC TEST". None of it is pilot wording, none is guidance;
 *   - every approval names the synthetic test authority, never a person, and none is a real decision;
 *   - the structure mirrors the questionnaire the product code expects (question ids P1, T1, T1X, T3,
 *     L1, M0, M1 are referenced by the customer flow), on a deliberately reduced question set;
 *   - ledger entries reference real governed claim ids only so the real retrieval pipeline can run;
 *     their customer explanations are placeholders, and the entry ids are SYN-*;
 *   - the two digests below are pinned, as a real approval would pin them: the test recomputes them,
 *     so any wording change is refused (digest / fingerprint mismatch) until it is re-pinned.
 *
 * Imports are type-only (test-enforced), so this file never pulls runtime code into governed/.
 */

import type { GovernanceApproval } from '../contract/types'
import type { ObservationMapEntry, QuestionEntry } from '../contract/question-registry'
import type { PublicationLedgerEntry } from '../contract/publication-ledger'
import type { CreatorRecordSources } from '../prototype/build-draft'
import type { SourceTextApproval } from '../customer-record/source-text'
import type { PdfTemplateApproval } from '../customer-pdf/templates'
import type { PublicationAuthorityBundle } from './publication-authority'

/** The synthetic authority's name. Reads as synthetic everywhere (governance mode refuses such text too). */
// NOTE (CR-V2-UAT-PROD-MIN-1): the name below says "staging rehearsal only" for historical reasons (it was written for the
// M4C staging rehearsal). It is deliberately NOT renamed: it is part of the pinned identity and digests. It is reused,
// unchanged, solely for the isolated identity-scoped synthetic Production UAT (`../customer-flow/synthetic-uat`). In every
// context it means the same thing: synthetic, no SI8 decision, not approved customer content, never issuable.
export const SYNTHETIC_TEST_AUTHORITY_NAME = 'SYNTHETIC TEST AUTHORITY (staging rehearsal only; no SI8 decision)'
const DECISION_DATE = '2026-11-01'

const SYN_APPROVAL: GovernanceApproval = Object.freeze({
  status: 'approved',
  approver: SYNTHETIC_TEST_AUTHORITY_NAME,
  decision_date: DECISION_DATE,
  review_ref: 'SYN-M4C-STAGING-REHEARSAL',
}) as GovernanceApproval

const t = (s: string) => `[TEST ONLY] ${s}`

const question = (over: Partial<QuestionEntry> & Pick<QuestionEntry, 'q_id'>): QuestionEntry => ({
  version: 1,
  question_kind: 'factual_value',
  wording_ref: `SYN-M4C-WORDING-${over.q_id}`,
  options: 'free_text',
  display_condition: { kind: 'always' },
  approval: SYN_APPROVAL,
  ...over,
})

const observation = (over: Partial<ObservationMapEntry> & Pick<ObservationMapEntry, 'o_id' | 'q_id' | 'target'>): ObservationMapEntry => ({
  version: 1,
  q_version: 1,
  applies_to: { kind: 'any_answer' },
  observation_kind: 'declared_value',
  value_mapping_version: 'SYN-M4C-MAP-1',
  approval: SYN_APPROVAL,
  ...over,
})

const showWhen = (q_id: string, any_of: string[]) => ({ kind: 'answer_includes' as const, q_id, any_of })

// Reduced option sets. Tool / provider codes are canonical identities (test-checked against the registries).
const USES = ['own_channels', 'paid_advertising', 'other_use', 'not_sure']
const LOCATIONS = ['US', 'GB', 'TW', 'online_worldwide', 'other', 'not_sure']
const TOOL_IDS = ['kling', 'pika', 'runway-gen3']
const TOOLS = [...TOOL_IDS, 'other_tool', 'not_sure']
const MUSIC = ['artlist', 'other_provider', 'not_sure']
const MATERIALS = ['music', 'none', 'not_sure']
const CONTRIBUTIONS = ['edited', 'selected_outputs', 'other_contribution', 'not_sure']
const YES_NO = ['yes', 'no', 'not_sure']

const QUESTIONS: QuestionEntry[] = [
  question({ q_id: 'P1' }),
  question({ q_id: 'P3', options: USES }),
  question({ q_id: 'F1', options: LOCATIONS }),
  question({ q_id: 'F2', options: LOCATIONS }),
  question({ q_id: 'T1', options: TOOLS }),
  question({ q_id: 'T1X', display_condition: showWhen('T1', ['other_tool']) }),
  question({ q_id: 'T3' }),
  question({ q_id: 'L1', question_kind: 'factual_presence', options: YES_NO }),
  question({ q_id: 'M0', question_kind: 'factual_presence', options: MATERIALS }),
  question({ q_id: 'M1', options: MUSIC, display_condition: showWhen('M0', ['music']) }),
  question({ q_id: 'M1X', display_condition: { kind: 'all', conditions: [showWhen('M0', ['music']), showWhen('M1', ['other_provider'])] } }),
  question({ q_id: 'H1', question_kind: 'description', options: CONTRIBUTIONS }),
]

const OBSERVATION_MAP: ObservationMapEntry[] = [
  observation({ o_id: 'SYN-M4C-O-F1', q_id: 'F1', target: { kind: 'location', role: 'creator_base' } }),
  observation({ o_id: 'SYN-M4C-O-F2', q_id: 'F2', target: { kind: 'location', role: 'distribution_market' } }),
  ...TOOL_IDS.map((id) => observation({ o_id: `SYN-M4C-O-T1-${id}`, q_id: 'T1', applies_to: { kind: 'option', value: id }, target: { kind: 'tool_identity' } })),
  observation({ o_id: 'SYN-M4C-O-T3', q_id: 'T3', target: { kind: 'applicability_fact', fact: 'tool_plan_tier' } }),
  observation({ o_id: 'SYN-M4C-O-M1-artlist', q_id: 'M1', applies_to: { kind: 'option', value: 'artlist' }, target: { kind: 'asset_provider_identity' } }),
  observation({ o_id: 'SYN-M4C-O-M1-DEP', q_id: 'M1', target: { kind: 'dependency', dependency_id: 'which_music_provider' } }),
  observation({ o_id: 'SYN-M4C-O-H1', q_id: 'H1', observation_kind: 'declared_description', target: { kind: 'dependency', dependency_id: 'human_contribution_description' } }),
]

/** CR-V2-DECL-1A: obeys the same semantic mapping contract as every bundle. Synthetic: no SI8 decision. */
const SEMANTIC_REVIEW_REF = 'SYN-DECL-1A-SEMANTIC-REVIEW (synthetic test)'
const SEMANTIC_MAPPINGS = [
  { q_id: 'M1', q_version: 1, dependency_id: 'which_music_provider', review_ref: SEMANTIC_REVIEW_REF },
  { q_id: 'H1', q_version: 1, dependency_id: 'human_contribution_description', review_ref: SEMANTIC_REVIEW_REF },
]

/** Legal determinations and evidence-only dimensions a declaration may never target (kept as strict as governance). */
const PROHIBITED_DEPENDENCY_TARGETS: readonly string[] = [
  'editorial_designation_confirmed',
  'release_status_confirmed',
  'separate_authorization_obtained',
  'rights_and_clearance_status',
  'asset_confirmed_getty',
  'asset_confirmed_istock',
  'asset_confirmed_shutterstock',
  'actual_knowledge_confirmed',
  'content_constitutes_deep_fake',
  'expressive_work_exemption_applies',
  'artistic_creative_satirical_fictional_analogous_work',
  'confusion_as_to_affiliation_or_sponsorship',
  'deployer_status_confirmed',
  'provider_status_confirmed',
  'advertiser_or_duty_holder_status_confirmed',
  'union_establishment_or_output_use',
]

type Meta = CreatorRecordSources['presentation'][string]
const meta = (m: Omit<Meta, 'option_labels' | 'help' | 'allow_not_sure' | 'per_tool'> & Partial<Meta>): Meta => ({
  help: null,
  option_labels: {},
  allow_not_sure: false,
  per_tool: false,
  ...m,
})
const labels = (codes: string[]): Record<string, string> => Object.fromEntries(codes.map((c) => [c, t(`Option ${c}`)]))

const PRESENTATION: CreatorRecordSources['presentation'] = {
  P1: meta({ q_id: 'P1', section: 'project', input: 'text', required: true, text: t('Test question P1: a title for this test video.') }),
  P3: meta({ q_id: 'P3', section: 'project', input: 'multi', required: true, text: t('Test question P3: choose one or more test uses.'), option_labels: labels(USES) }),
  F1: meta({ q_id: 'F1', section: 'locations', input: 'single', required: true, text: t('Test question F1: choose a test location.'), option_labels: labels(LOCATIONS) }),
  F2: meta({ q_id: 'F2', section: 'locations', input: 'multi', required: true, text: t('Test question F2: choose one or more test locations.'), option_labels: labels(LOCATIONS) }),
  T1: meta({ q_id: 'T1', section: 'tools', input: 'select', required: true, per_tool: true, text: t('Test question T1: choose a test tool.'), help: t('Help text for T1.'), option_labels: labels(TOOLS) }),
  T1X: meta({ q_id: 'T1X', section: 'tools', input: 'text', required: true, per_tool: true, text: t('Test question T1X: type a test tool name.') }),
  T3: meta({ q_id: 'T3', section: 'tools', input: 'plan', required: true, per_tool: true, allow_not_sure: true, text: t('Test question T3: choose or type a test plan name.'), help: t('Help text for T3.') }),
  L1: meta({ q_id: 'L1', section: 'people', input: 'single', required: true, text: t('Test question L1: choose yes, no or not sure.'), option_labels: labels(YES_NO) }),
  M0: meta({ q_id: 'M0', section: 'materials', input: 'multi', required: true, text: t('Test question M0: choose one or more test materials.'), option_labels: labels(MATERIALS), exclusive_options: ['none'] }),
  M1: meta({ q_id: 'M1', section: 'materials', input: 'select', required: true, text: t('Test question M1: choose a test music service.'), option_labels: labels(MUSIC) }),
  M1X: meta({ q_id: 'M1X', section: 'materials', input: 'text', required: true, text: t('Test question M1X: type a test music service name.') }),
  H1: meta({ q_id: 'H1', section: 'contribution', input: 'multi', required: true, text: t('Test question H1: choose one or more test contributions.'), option_labels: labels(CONTRIBUTIONS) }),
}

const ACKNOWLEDGEMENTS: Readonly<Record<string, string>> = {
  A1: t('Test acknowledgement A1. Tick to continue the staging rehearsal.'),
  A2: t('Test acknowledgement A2. This is a synthetic test record, not a Creator Record and not SI8 guidance.'),
}

const CAVEAT_ID = 'SYN-M4C-CAVEAT-1'
const CAVEATS: Readonly<Record<string, string>> = { [CAVEAT_ID]: t('Test caveat. Placeholder text for the staging rehearsal.') }

// CR-V2-DECL-1A: two labels below no longer have a mapping. They stay because the pinned source-text digest covers them.
const DEPENDENCY_LABELS: Readonly<Record<string, string>> = {
  advertisement_purpose_confirmed: t('Test dependency label: advertising use'),
  synthetic_performer_present_confirmed: t('Test dependency label: likeness'),
  which_music_provider: t('Test dependency label: music service'),
  human_contribution_description: t('Test dependency label: contribution'),
  artlist_subscription_active_at_publication_confirmed: t('Test dependency label: music subscription'),
}

const ledgerEntry = (claim_id: string, claim_last_verified: string, over: Partial<PublicationLedgerEntry> = {}): PublicationLedgerEntry => ({
  entry_id: `SYN-M4C-LEDGER-${claim_id}`,
  version: 1,
  claim_id,
  claim_last_verified,
  creator_record_eligible: 'Yes',
  explanation: t(`Placeholder explanation for ${claim_id}. Not SI8 guidance.`),
  applicability_policy: 'met_or_unresolved',
  evidence_notes: {},
  required_caveats: [CAVEAT_ID],
  approver: SYNTHETIC_TEST_AUTHORITY_NAME,
  decision_date: DECISION_DATE,
  refresh_by: '2027-01-31',
  superseded_by: null,
  ...over,
})

const LEDGER: readonly PublicationLedgerEntry[] = [
  ledgerEntry('CLAIM-PIKA-COMMERCIAL-USE-BASELINE-001-v1', '2026-09-06'),
  ledgerEntry('CLAIM-PIKA-COMMERCIAL-USE-PAID-PLAN-STANDARD-001-v1', '2026-09-06'),
  ledgerEntry('CLAIM-KLING-COMMERCIAL-USE-BASELINE-001-v1', '2026-09-02'),
  ledgerEntry('CLAIM-KLING-COMMERCIAL-USE-MEMBER-001-v1', '2026-09-02'),
  ledgerEntry('CLAIM-MUSIC-ARTLIST-PROJECT-LICENSE-DURATION-001-v1', '2026-08-27', {
    evidence_notes: { artlist_subscription_active_at_publication_confirmed: t('Placeholder evidence note.') },
  }),
]

/** Must equal CUSTOMER_RECORD_SCHEMA / _VERSION (test-checked). */
const RECORD_SCHEMA = { id: 'si8/creator-record-v2-record', version: 5 }

/** Placeholder PDF templates (data only). Every string is marked TEST; the wording lock applies unchanged. */
const PDF_TEMPLATES = {
  template_id: 'si8/creator-record-v2-pdf-templates',
  version: 1,
  record_schema: RECORD_SCHEMA,
  document_title: t('Synthetic test record {record_id}'),
  stamp: 'SYNTHETIC TEST RECORD · STAGING REHEARSAL ONLY · NOT A CREATOR RECORD · NOT A CLEARANCE OR LEGAL OPINION',
  footer: t('Synthetic test record {record_id}'),
  page_label: 'Page {page} of {pages}',
  sections: {
    about: { heading: t('1. About'), intro: [t('Placeholder introduction.')], counts: { answers: { one: t('{n} answer.'), other: t('{n} answers.') }, guidance: { one: t('{n} item.'), other: t('{n} items.') }, open_items: { one: t('{n} open item.'), other: t('{n} open items.') } } },
    project: { heading: t('2. Project'), intro: t('As entered in the test.'), empty: t('Nothing entered.') },
    tools: { heading: t('3. Tools'), intro: t('Tools entered in the test.'), tool_heading: t('Tool {n}'), empty: t('None.') },
    contribution: { heading: t('4. Contribution'), intro: t('As entered in the test.'), empty: t('Nothing entered.') },
    guidance: { heading: t('5. Placeholder items'), intro: t('Placeholder items for the rehearsal.'), empty: t('None.'), item_heading: t('Item {index}: {subject}'), subject_with_tool: '{topic} (tool {n})', conclusion: t('Reads'), selected_because: t('Because'), on_what_you_told_us: t('On what was entered'), depends_on: t('Depends on'), unspecified_condition: t('Unspecified.'), caveats: t('Note'), item_limitation: t('Placeholder limitation.'), topic_level: t('Topic level.') },
    open_items: { heading: t('6. Open items'), intro: t('Placeholder open items.'), empty: t('None.'), item_ref: t('Item {index}'), for_guidance: t('For'), not_established_heading: t('Not established'), affects: t('Affects {items}'), unspecified_heading: t('Unspecified'), topic_qualified_heading: t('Topic qualified'), what_you_told_us: t('Entered'), nothing_told: t('Nothing'), evidence_note: t('Evidence'), status: t('Status'), sufficiency: t('Evidence'), not_sure_heading: t('Not sure'), documents_heading: t('Documents'), documents_not_provided: t('No documents.'), limitations_heading: t('Limitations'), limitations: [t('Placeholder limitation.')] },
    not_done: { heading: t('7. Not done'), lines: [t('No review of any kind was performed. This is a synthetic test record.')] },
    provenance: { heading: t('8. Provenance'), acknowledgements_heading: t('Acknowledged'), identity_heading: t('Record'), sources_heading: t('Sources'), publications_heading: t('Item sources'), labels: { record_id: t('Record id'), issued_on: t('Issued on'), prepared_ref: t('Ref'), record_version: t('Version'), prepared_on: t('Prepared'), captured_at: t('Captured'), snapshot: t('SHA-256'), record_schema: t('Schema'), record_schema_version: t('Schema version'), builder: t('Builder'), builder_version: t('Builder version'), registry_version: t('Registry'), ledger_version: t('Ledger'), wording: t('Wording'), wording_version: t('Wording version'), wording_digest: t('Wording digest'), templates: t('Templates'), templates_version: t('Templates version'), templates_fingerprint: t('Templates fingerprint'), publication_version: t('Entry version') } },
  },
  question_sections: { P1: 'project', P3: 'project', F1: 'project', F2: 'project', L1: 'contribution', M0: 'contribution', M1: 'contribution', M1X: 'contribution', H1: 'contribution' },
  conclusion_labels: { relevant_on_declared_facts: t('Placeholder conclusion A'), relevant_applicability_unresolved: t('Placeholder conclusion B') },
  topic_labels: { commercial_use: t('Topic: commercial use'), third_party_source_rights: t('Topic: third-party material') },
  fact_labels: { tool_plan_tier: t('Fact: plan'), tool_account_status: t('Fact: account'), jurisdiction: t('Fact: jurisdiction') },
  not_sure_label: t('Not sure'),
  documents: { intro: t('Documents you added, listed as received.'), item_label: t('Document {n}'), type: t('Type'), category: t('Your description'), tool: t('Tool'), tool_value: t('Tool {n}'), size: t('Size'), size_value: t('{bytes} bytes'), fingerprint: t('SHA-256 fingerprint'), fingerprint_note: t('A fingerprint identifies the exact file received. It does not show that the document is genuine, who created it, or when.'), examination: t('Examination'), not_examined: t('Not examined by SI8') },
  document_type_labels: { 'application/pdf': t('PDF'), 'image/png': t('PNG image'), 'image/jpeg': t('JPEG image') },
  document_category_labels: { billing_receipt: t('Receipt or invoice'), licence: t('Licence'), provider_terms: t('Provider terms'), release_or_consent: t('Release or consent'), permission: t('Permission'), project_file: t('Project file'), other: t('Other') },
  dependency_codes: { status: { open: t('Open') }, sufficiency: { not_assessed: t('Not assessed') } },
}

/** Pinned digests (recomputed by the test; a mismatch means the wording changed and must be re-pinned). */
export const SYNTHETIC_SOURCE_TEXT_SHA256 = 'e589b6d8b9172463994a2f6335f622e08f11a53e0e3822e3c9acfce4003c221e'
export const SYNTHETIC_PDF_TEMPLATES_FINGERPRINT = '0a2ce73b68d1223f61a8bcd28a297b65f0beec9a08d7f77229d0fd8f2aa6acfd'

const SOURCE_TEXT_APPROVAL: SourceTextApproval = {
  source_id: 'si8/creator-record-v2-source-text',
  version: 1,
  content_sha256: SYNTHETIC_SOURCE_TEXT_SHA256,
  categories: ['question_wording', 'option_labels', 'acknowledgement_wording', 'dependency_labels', 'caveat_wording'],
  record_schema: RECORD_SCHEMA,
  lifecycle: 'approved',
  authority: SYNTHETIC_TEST_AUTHORITY_NAME,
  decision_date: DECISION_DATE,
  review_ref: 'SYN-M4C-TEXT-1',
}

/**
 * CR-V2-UAT-PROD-MIN-1: the same synthetic wording, approved by the SAME synthetic test authority for the
 * examination-bearing record (schema v6). Served only to the one identity of an open synthetic UAT window
 * (`../customer-flow/synthetic-uat`); never part of any governance bundle.
 */
export const SYNTHETIC_TEST_V6_SOURCE_TEXT_APPROVAL: SourceTextApproval = Object.freeze({
  ...SOURCE_TEXT_APPROVAL,
  record_schema: { id: RECORD_SCHEMA.id, version: 6 },
  review_ref: 'SYN-UAT-PROD-MIN-TEXT-V6-1',
})

const PDF_TEMPLATE_APPROVAL: PdfTemplateApproval = {
  template_id: 'si8/creator-record-v2-pdf-templates',
  version: 1,
  fingerprint: SYNTHETIC_PDF_TEMPLATES_FINGERPRINT,
  record_schema: RECORD_SCHEMA,
  lifecycle: 'approved',
  authority: SYNTHETIC_TEST_AUTHORITY_NAME,
  decision_date: DECISION_DATE,
  review_ref: 'SYN-M4C-TEMPLATE-1',
}

export const CREATOR_RECORD_SYNTHETIC_TEST_AUTHORITY: (PublicationAuthorityBundle & { readonly authority_class: 'synthetic_test' }) | null = Object.freeze({
  authority_class: 'synthetic_test' as const,
  registry_input: { questions: QUESTIONS, observation_map: OBSERVATION_MAP, prohibited_dependency_targets: PROHIBITED_DEPENDENCY_TARGETS, semantic_mappings: SEMANTIC_MAPPINGS },
  publication_ledger: LEDGER,
  dependency_labels: DEPENDENCY_LABELS,
  presentation: PRESENTATION,
  acknowledgements: ACKNOWLEDGEMENTS,
  caveats: CAVEATS,
  versions: { registry: 'SYN-M4C-REGISTRY-1 (synthetic test)', ledger: 'SYN-M4C-LEDGER-1 (synthetic test)' },
  max_tools: 2,
  source_text_approval: SOURCE_TEXT_APPROVAL,
  pdf_templates: PDF_TEMPLATES,
  pdf_template_approval: PDF_TEMPLATE_APPROVAL,
})
