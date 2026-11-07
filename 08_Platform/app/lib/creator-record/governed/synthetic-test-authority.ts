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
import type { QuestionnaireContractApproval } from '../customer-record/questionnaire-contract'
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
const RECORD_SCHEMA = { id: 'si8/creator-record-v2-record', version: 7 }

/** Placeholder PDF templates (data only). Every string is marked TEST; the wording lock applies unchanged. */
const PDF_TEMPLATES = {
  template_id: 'si8/creator-record-v2-pdf-templates',
  version: 2,
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
    provenance: { heading: t('8. Provenance'), acknowledgements_heading: t('Acknowledged'), identity_heading: t('Record'), sources_heading: t('Sources'), publications_heading: t('Item sources'), labels: { record_id: t('Record id'), issued_on: t('Issued on'), prepared_ref: t('Ref'), record_version: t('Version'), prepared_on: t('Prepared'), captured_at: t('Captured'), snapshot: t('SHA-256'), record_schema: t('Schema'), record_schema_version: t('Schema version'), builder: t('Builder'), builder_version: t('Builder version'), registry_version: t('Registry'), ledger_version: t('Ledger'), wording: t('Wording'), wording_version: t('Wording version'), wording_digest: t('Wording digest'), questionnaire_contract: t('Questionnaire contract'), questionnaire_contract_version: t('Questionnaire contract version'), questionnaire_contract_ref: t('Questionnaire contract reference'), templates: t('Templates'), templates_version: t('Templates version'), templates_fingerprint: t('Templates fingerprint'), publication_version: t('Entry version') } },
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
export const SYNTHETIC_PDF_TEMPLATES_FINGERPRINT = '19857320de6f205f3c56d899beb5f05cf8b1359e3e6035dc32be123880458ec2'

/**
 * CR-V2-DECL-1B-1: the exact synthetic questionnaire contract. Test authorization only, like everything in this bundle: it
 * is no SI8 decision, carries no customer approval, and governance mode refuses it by its class and its text.
 */
export const SYNTHETIC_QUESTIONNAIRE_CONTRACT_SHA256 = '1aefef89527e17670a82be11cfe8e312386c8e1b30a03f3b1c665f228fbc1d4a'
const QUESTIONNAIRE_APPROVAL: QuestionnaireContractApproval = Object.freeze({
  contract_id: 'si8/creator-record-v2-questionnaire-contract',
  contract_version: 1,
  contract_sha256: SYNTHETIC_QUESTIONNAIRE_CONTRACT_SHA256,
  lifecycle: 'approved',
  authority: SYNTHETIC_TEST_AUTHORITY_NAME,
  decision_date: DECISION_DATE,
  review_ref: 'SYN-DECL-1B-1-CONTRACT (synthetic test)',
})

const SOURCE_TEXT_APPROVAL: SourceTextApproval = {
  source_id: 'si8/creator-record-v2-source-text',
  version: 2,
  content_sha256: SYNTHETIC_SOURCE_TEXT_SHA256,
  categories: ['question_wording', 'option_labels', 'acknowledgement_wording', 'dependency_labels', 'caveat_wording'],
  record_schema: RECORD_SCHEMA,
  lifecycle: 'approved',
  authority: SYNTHETIC_TEST_AUTHORITY_NAME,
  decision_date: DECISION_DATE,
  review_ref: 'SYN-DECL-1B-2-TEXT-V7-1',
}

/**
 * CR-V2-UAT-PROD-MIN-1: the same synthetic wording, approved by the SAME synthetic test authority for the
 * examination-bearing record (schema 8). Served only to the one identity of an open synthetic UAT window
 * (`../customer-flow/synthetic-uat`); never part of any governance bundle.
 */
export const SYNTHETIC_TEST_EXAMINATION_SOURCE_TEXT_APPROVAL: SourceTextApproval = Object.freeze({
  ...SOURCE_TEXT_APPROVAL,
  record_schema: { id: RECORD_SCHEMA.id, version: 8 },
  review_ref: 'SYN-DECL-1B-2-TEXT-V8-1',
})

const PDF_TEMPLATE_APPROVAL: PdfTemplateApproval = {
  template_id: 'si8/creator-record-v2-pdf-templates',
  version: 2,
  fingerprint: SYNTHETIC_PDF_TEMPLATES_FINGERPRINT,
  record_schema: RECORD_SCHEMA,
  lifecycle: 'approved',
  authority: SYNTHETIC_TEST_AUTHORITY_NAME,
  decision_date: DECISION_DATE,
  review_ref: 'SYN-PDF-7-TEMPLATE-1',
}

/**
 * CR-V2-MVP-M3A: placeholder templates for the examination-bearing record (schema 8), and their synthetic approval. Local tests
 * only, like everything here: every string is marked TEST, the wording lock applies unchanged, and the approval names the synthetic
 * authority. CR-V2-MVP-M4A: part of the synthetic test bundle only (`pdf_template_sets`), so schema-aware selection can be tested end to
 * end in an isolated synthetic test; never part of the governance bundle, and governance mode refuses them by their text.
 */
const EXAMINATION_PDF_TEMPLATES = {
  ...PDF_TEMPLATES,
  version: 3,
  record_schema: { id: RECORD_SCHEMA.id, version: 8 },
  sections: {
    ...PDF_TEMPLATES.sections,
    guidance: { ...PDF_TEMPLATES.sections.guidance, heading: t('6. Placeholder items') },
    open_items: { ...PDF_TEMPLATES.sections.open_items, heading: t('7. Open items') },
    not_done: { ...PDF_TEMPLATES.sections.not_done, heading: t('8. Not done') },
    provenance: { ...PDF_TEMPLATES.sections.provenance, heading: t('9. Provenance') },
  },
  examination: {
    heading: t('5. Documents and what was read from them'),
    intro: [t('What each document appears to show, as read by an automated examination. A reading is not something you told us, and it is not checked by a person.'), t('Readings do not change any item in the next section.')],
    document_heading: t('Document {n}'),
    status: t('Examination'),
    status_labels: { not_examined: t('Not examined'), examined: t('Examined'), could_not_examine: t('Could not be examined') },
    failure: t('Reason'),
    failure_labels: { unsupported_format: t('Unsupported format'), file_too_large: t('File too large'), empty_file: t('Empty file'), model_error: t('Examination error'), structured_output_missing: t('No reading returned'), schema_invalid: t('Reading not usable') },
    observations_heading: t('Readings'),
    no_observations: t('No readings.'),
    field_labels: {
      document_type: t('Kind of document'), readability: t('Legibility'), multiple_plans_shown: t('More than one plan shown'), instruction_like_text_present: t('Text addressed to an AI'),
      issuer_name: t('Issuer'), product_or_plan_name: t('Product or plan'), transaction_date: t('Transaction date'), service_period_start: t('Service period start'), service_period_end: t('Service period end'), plan_candidate: t('Plan name shown'),
    },
    qualifier: t('Where shown'),
    qualifier_labels: { heading_or_title: t('Heading or title'), current_plan_label: t('Current plan label'), charge_line: t('Charge line'), account_detail: t('Account detail'), other: t('Elsewhere') },
    classification_labels: {
      document_type: { receipt: t('Receipt'), invoice: t('Invoice'), subscription_confirmation: t('Subscription confirmation'), billing_screenshot: t('Billing screenshot'), not_a_billing_document: t('Not a billing document'), unknown: t('Unknown') },
      readability: { legible: t('Legible'), partially_legible: t('Partly legible'), illegible: t('Illegible') },
      multiple_plans_shown: { true: t('Yes'), false: t('No') },
      instruction_like_text_present: { true: t('Yes'), false: t('No') },
    },
    basis: t('Basis'),
    basis_labels: { printed_text: t('Printed on the document'), examiner_classification: t('The examination\'s own description') },
    reading: t('Reading'),
    reading_labels: { present: t('Shown'), not_shown: t('Not shown'), unreadable: t('Unreadable'), ambiguous: t('Ambiguous') },
    value: t('Value'),
    excerpt: t('Excerpt'),
    your_response: t('Your response'),
    response_labels: { reading_incorrect: t('You said this reading is incorrect'), wrong_document: t('You said this is the wrong document'), other_plan_applies: t('You said another plan applies'), not_relevant: t('You said this is not relevant') },
    comparison_response: t('Your response about the {field}'),
    comparison_field_labels: { provider: t('provider'), plan: t('plan') },
    limitations_heading: t('Limitations of this examination'),
    limitation_labels: {
      recorded_test_data_not_model_output: t('Recorded test data, not an examination of your document'), observations_not_verified: t('Readings are not checked by a person'),
      no_location_reference: t('No page or position is given'), fields_not_established: t('Some details were not established'), single_plan_reading_does_not_exclude_others: t('One plan reading does not rule out others'),
      multiple_plans_shown: t('More than one plan is shown'), instruction_like_text_present: t('The document contains text addressed to an AI'), not_a_billing_document: t('Not a billing document'),
      partially_legible: t('Partly legible'), illegible: t('Illegible'),
    },
    provenance_heading: t('Examination source'),
    reference: t('Examination reference'),
    method: t('Method'),
    method_labels: { fixture_replay: t('Recorded test data replay') },
    content: t('Content'),
    content_labels: { known_synthetic_fixture: t('A known SI8 synthetic test document') },
    profile: t('Reading profile'),
    profile_value: t('{id} version {version}'),
    comparison_note: t('This record does not say whether a document matches what you told us.'),
    open_items_pointer: t('Your documents and their readings are listed in section 5.'),
  },
  live_examination: {
    method: t('Automated reading by an AI model'),
    provider: t('Provider'),
    provider_labels: { anthropic: t('Anthropic') },
    model: t('Model'),
    executed_at: t('Read at'),
    content_labels: { customer_document: t('Your own uploaded document') },
    limitation_labels: {
      mock_test_data_not_model_output: t('Test data, not a reading of your document'), observations_not_verified: t('Readings are not checked by a person'),
      no_location_reference: t('No page or position is given'), fields_not_established: t('Some details were not established'), single_plan_reading_does_not_exclude_others: t('One plan reading does not rule out others'),
      multiple_plans_shown: t('More than one plan is shown'), instruction_like_text_present: t('The document contains text addressed to an AI'), not_a_billing_document: t('Not a billing document'),
      partially_legible: t('Partly legible'), illegible: t('Illegible'),
    },
  },
}

/** Pinned (recomputed by the test). */
export const SYNTHETIC_EXAMINATION_PDF_TEMPLATES_FINGERPRINT = 'cbdb3ba66bc94cc98125f50772e80cbbbcd1ca4541b7bb870767a9cd16e8bff9'

export const SYNTHETIC_TEST_EXAMINATION_PDF: { templates: typeof EXAMINATION_PDF_TEMPLATES; approval: PdfTemplateApproval } = Object.freeze({
  templates: EXAMINATION_PDF_TEMPLATES,
  approval: Object.freeze({
    ...PDF_TEMPLATE_APPROVAL,
    version: 3,
    fingerprint: SYNTHETIC_EXAMINATION_PDF_TEMPLATES_FINGERPRINT,
    record_schema: { id: RECORD_SCHEMA.id, version: 8 },
    review_ref: 'SYN-M3A-TEMPLATE-V8-1',
  }),
})

export const CREATOR_RECORD_SYNTHETIC_TEST_AUTHORITY:(PublicationAuthorityBundle & { readonly authority_class: 'synthetic_test' }) | null = Object.freeze({
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
  questionnaire_approval: QUESTIONNAIRE_APPROVAL,
  pdf_templates: PDF_TEMPLATES,
  pdf_template_approval: PDF_TEMPLATE_APPROVAL,
  pdf_template_sets: [SYNTHETIC_TEST_EXAMINATION_PDF],
})
