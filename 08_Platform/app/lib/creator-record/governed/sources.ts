/**
 * CR-V2-VERTICAL-SLICE-1 — the AUTHORITATIVE Creator Record governance sources.
 *
 * These are the only sources a customer-facing Creator Record may ever read.
 * Today every one of them is empty, because no Creator Record question,
 * Observation Map entry, dependency label or publication ledger entry has been
 * approved (PRD v0.3 §4.3: "zero entries exist today"). An empty source fails
 * closed: no question is shown and no governed claim is published.
 *
 * The internal prototype's pilot data lives in `../pilot/` and is NEVER merged
 * into these sources. `__tests__/creator-record/vertical-slice-boundaries.test.ts`
 * asserts that nothing here carries a pilot marker and that this file does not
 * import the pilot module.
 */

import type { PublicationLedgerEntry } from '../contract/publication-ledger'
import type { RegistryInput } from '../contract/question-registry'
import type { CreatorRecordSources } from '../prototype/build-draft'
import type { QuestionnaireContractApproval } from '../customer-record/questionnaire-contract'
import type { SourceTextApproval } from '../customer-record/source-text'
import type { PdfTemplateApproval } from '../customer-pdf/templates'
import type { PublicationAuthorityBundle } from './publication-authority'
import type { GovernanceApproval } from '../contract/types'
import type { ObservationMapEntry, QuestionEntry } from '../contract/question-registry'
import {
  ASSET_PROVIDER_OPTION_CODES, CANONICAL_ASSET_PROVIDER_ID_LIST, CANONICAL_TOOL_ID_LIST, OTHER_PROVIDER, OTHER_TOOL, TOOL_OPTION_CODES,
} from '../identity/selectable-identities'

// ── CR-V2-MVP-LEGAL-CONTENT-6: the founder-approved launch content (approval JD-CR-V2-MVP-LEGAL-CONTENT-5-20261109) ──
// Wording (question text, help, option labels, acknowledgements, caveats, dependency labels, section titles) is the frozen
// CR-V2-MVP-LEGAL-CONTENT-5 packet, verbatim (R2-R5, R1 section titles). Structure is the R1-approved launch structure: the
// questionnaire registry at 786af219 without L3, under launch identifiers. No ledger entry is approved (R7 is a separate
// approval), so no guidance is published yet. Nothing here opens submissions, uploads, examination, payment or issuance.

/** The founder approval every launch entry carries. */
export const CREATOR_RECORD_LAUNCH_APPROVAL_REF = 'JD-CR-V2-MVP-LEGAL-CONTENT-5-20261109'
const LAUNCH_AUTHORITY = 'JD, for PMF Strategy Inc. d/b/a SuperImmersive 8'
const LAUNCH_DECISION_DATE = '2026-11-09'
const LAUNCH_APPROVAL: GovernanceApproval = Object.freeze({
  status: 'approved',
  approver: LAUNCH_AUTHORITY,
  decision_date: LAUNCH_DECISION_DATE,
  review_ref: CREATOR_RECORD_LAUNCH_APPROVAL_REF,
}) as GovernanceApproval

const LAUNCH_ID = 'CR-V2-LAUNCH'
const question = (over: Partial<QuestionEntry> & Pick<QuestionEntry, 'q_id'>): QuestionEntry => ({
  version: 1,
  question_kind: 'factual_value',
  wording_ref: `${LAUNCH_ID}-WORDING-${over.q_id}`,
  options: 'free_text',
  display_condition: { kind: 'always' },
  approval: LAUNCH_APPROVAL,
  ...over,
})
const observation = (over: Partial<ObservationMapEntry> & Pick<ObservationMapEntry, 'o_id' | 'q_id' | 'target'>): ObservationMapEntry => ({
  version: 1,
  q_version: 1,
  applies_to: { kind: 'any_answer' },
  observation_kind: 'declared_value',
  value_mapping_version: `${LAUNCH_ID}-MAP-1`,
  approval: LAUNCH_APPROVAL,
  ...over,
})
const showWhen = (q_id: string, any_of: string[]) => ({ kind: 'answer_includes' as const, q_id, any_of })

const YES_NO = ['yes', 'no', 'not_sure']
const YES_NO_NA = [...YES_NO, 'not_applicable']
const LOCATION_CODES = ['US', 'GB', 'NL', 'AE', 'SG', 'TW', 'EU', 'online_worldwide', 'other', 'not_sure']

/** Question order is the questionnaire order (R1: 21 questions, L3 excluded). */
const LAUNCH_QUESTIONS: QuestionEntry[] = [
  question({ q_id: 'P1' }),
  question({ q_id: 'P2', question_kind: 'description' }),
  question({ q_id: 'P3', options: ['own_channels', 'client_work', 'paid_advertising', 'festival_or_screening', 'other_use', 'not_sure'] }),
  question({ q_id: 'F1', options: LOCATION_CODES }),
  question({ q_id: 'F2', options: LOCATION_CODES }),
  question({ q_id: 'F3', options: LOCATION_CODES, display_condition: showWhen('P3', ['client_work', 'paid_advertising']) }),
  question({ q_id: 'T1', options: [...TOOL_OPTION_CODES] }),
  question({ q_id: 'T1X', display_condition: showWhen('T1', [OTHER_TOOL]) }),
  question({ q_id: 'T3' }),
  question({ q_id: 'T4' }),
  question({ q_id: 'L1', question_kind: 'factual_presence', options: YES_NO }),
  question({ q_id: 'M0', question_kind: 'factual_presence', options: ['music', 'stock', 'brands', 'client_material', 'none', 'not_sure'] }),
  question({ q_id: 'M1', options: [...ASSET_PROVIDER_OPTION_CODES], display_condition: showWhen('M0', ['music']) }),
  question({ q_id: 'M1X', display_condition: { kind: 'all', conditions: [showWhen('M0', ['music']), showWhen('M1', [OTHER_PROVIDER])] } }),
  question({ q_id: 'M2', version: 2, question_kind: 'document_existence', options: YES_NO_NA, display_condition: showWhen('M0', ['music']) }),
  question({ q_id: 'M3', options: [...ASSET_PROVIDER_OPTION_CODES], display_condition: showWhen('M0', ['stock']) }),
  question({ q_id: 'M3X', display_condition: { kind: 'all', conditions: [showWhen('M0', ['stock']), showWhen('M3', [OTHER_PROVIDER])] } }),
  question({ q_id: 'M3D', question_kind: 'document_existence', options: YES_NO, display_condition: showWhen('M0', ['stock']) }),
  question({ q_id: 'M4', question_kind: 'document_existence', options: ['yes', 'some', 'no', 'not_sure'], display_condition: showWhen('M0', ['brands', 'client_material']) }),
  question({
    q_id: 'H1',
    question_kind: 'description',
    options: ['wrote_script', 'directed_shots', 'selected_outputs', 'edited', 'composited', 'original_assets', 'other_contribution', 'not_sure'],
  }),
  question({ q_id: 'H2', question_kind: 'description' }),
]

const LAUNCH_OBSERVATION_MAP: ObservationMapEntry[] = [
  observation({ o_id: `${LAUNCH_ID}-O-F1`, q_id: 'F1', target: { kind: 'location', role: 'creator_base' } }),
  observation({ o_id: `${LAUNCH_ID}-O-F2`, q_id: 'F2', target: { kind: 'location', role: 'distribution_market' } }),
  observation({ o_id: `${LAUNCH_ID}-O-F3`, q_id: 'F3', target: { kind: 'location', role: 'client_base' } }),
  ...CANONICAL_TOOL_ID_LIST.map((id) => observation({ o_id: `${LAUNCH_ID}-O-T1-${id}`, q_id: 'T1', applies_to: { kind: 'option', value: id }, target: { kind: 'tool_identity' } })),
  observation({ o_id: `${LAUNCH_ID}-O-T3`, q_id: 'T3', target: { kind: 'applicability_fact', fact: 'tool_plan_tier' } }),
  ...CANONICAL_ASSET_PROVIDER_ID_LIST.map((id) => observation({ o_id: `${LAUNCH_ID}-O-M1-PROVIDER-${id}`, q_id: 'M1', applies_to: { kind: 'option', value: id }, target: { kind: 'asset_provider_identity' } })),
  observation({ o_id: `${LAUNCH_ID}-O-M1-DEP`, q_id: 'M1', target: { kind: 'dependency', dependency_id: 'which_music_provider' } }),
  ...CANONICAL_ASSET_PROVIDER_ID_LIST.map((id) => observation({ o_id: `${LAUNCH_ID}-O-M3-PROVIDER-${id}`, q_id: 'M3', applies_to: { kind: 'option', value: id }, target: { kind: 'asset_provider_identity' } })),
  observation({ o_id: `${LAUNCH_ID}-O-M3-DEP`, q_id: 'M3', target: { kind: 'dependency', dependency_id: 'which_provider' } }),
  observation({ o_id: `${LAUNCH_ID}-O-H1`, q_id: 'H1', observation_kind: 'declared_description', target: { kind: 'dependency', dependency_id: 'human_contribution_description' } }),
]

/** Dependencies a declaration may never target (legal determinations; evidence-only dimensions). */
const LAUNCH_PROHIBITED_DEPENDENCY_TARGETS: readonly string[] = [
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

/** The dependency mappings reviewed against each governed definition (CR-V2-DECL-1A semantic review, 2026-11-05). */
const SEMANTIC_REVIEW_REF = 'CR-V2-DECL-1A-SEMANTIC-REVIEW'
const LAUNCH_SEMANTIC_MAPPINGS = [
  { q_id: 'M1', q_version: 1, dependency_id: 'which_music_provider', review_ref: SEMANTIC_REVIEW_REF },
  { q_id: 'M3', q_version: 1, dependency_id: 'which_provider', review_ref: SEMANTIC_REVIEW_REF },
  { q_id: 'H1', q_version: 1, dependency_id: 'human_contribution_description', review_ref: SEMANTIC_REVIEW_REF },
]

/** Approved Question Registry and Observation Map entries (R1). */
export const CREATOR_RECORD_REGISTRY_INPUT: RegistryInput = Object.freeze({
  questions: LAUNCH_QUESTIONS,
  observation_map: LAUNCH_OBSERVATION_MAP,
  prohibited_dependency_targets: LAUNCH_PROHIBITED_DEPENDENCY_TARGETS,
  semantic_mappings: LAUNCH_SEMANTIC_MAPPINGS,
}) as RegistryInput

/** Approved Creator Record publication ledger. None approved yet (R7 is a separate approval): no guidance is published. */
export const CREATOR_RECORD_PUBLICATION_LEDGER: readonly PublicationLedgerEntry[] = Object.freeze([])

// Approved wording (R2-R5 and the R1 section titles), verbatim from the frozen packet.
export const CREATOR_RECORD_PRESENTATION: CreatorRecordSources['presentation'] = Object.freeze({
  P1: { q_id: "P1", section: "project", input: "text", required: true, per_tool: false, allow_not_sure: false, text: "What is the title of the video?", help: "Use the title you would put on the finished video. A working title is fine.", option_labels: {} },
  P2: { q_id: "P2", section: "project", input: "textarea", required: false, per_tool: false, allow_not_sure: false, text: "Describe the video in a sentence or two (optional).", help: "For example: a 30-second product teaser made for a skincare brand.", option_labels: {} },
  P3: { q_id: "P3", section: "project", input: "multi", required: true, per_tool: false, allow_not_sure: false, text: "How do you intend to use the video? Select all that apply.", help: "Choose what you plan now. If you are not sure yet, choose “Not sure yet”.", option_labels: {"client_work": "As work for a client", "festival_or_screening": "At a festival or screening", "not_sure": "Not sure yet", "other_use": "Something else", "own_channels": "On my own channels or portfolio", "paid_advertising": "In paid advertising"} },
  F1: { q_id: "F1", section: "locations", input: "single", required: true, per_tool: false, allow_not_sure: false, text: "Where are you or your business based?", help: "This is recorded in your record only. It does not change which guidance is shown.", option_labels: {"AE": "United Arab Emirates", "EU": "European Union (as a whole)", "GB": "United Kingdom", "NL": "Netherlands", "SG": "Singapore", "TW": "Taiwan", "US": "United States", "not_sure": "Not sure", "online_worldwide": "Online, worldwide", "other": "Somewhere else"} },
  F2: { q_id: "F2", section: "locations", input: "multi", required: true, per_tool: false, allow_not_sure: false, text: "Where do you expect the video to be published or shown? Select all that apply.", help: "This is recorded in your record only. It does not change which guidance is shown.", option_labels: {"AE": "United Arab Emirates", "EU": "European Union (as a whole)", "GB": "United Kingdom", "NL": "Netherlands", "SG": "Singapore", "TW": "Taiwan", "US": "United States", "not_sure": "Not sure", "online_worldwide": "Online, worldwide", "other": "Somewhere else"} },
  F3: { q_id: "F3", section: "locations", input: "single", required: true, per_tool: false, allow_not_sure: false, text: "Where is the client or advertiser based?", help: "This is recorded in your record only. It does not change which guidance is shown.", option_labels: {"AE": "United Arab Emirates", "EU": "European Union (as a whole)", "GB": "United Kingdom", "NL": "Netherlands", "SG": "Singapore", "TW": "Taiwan", "US": "United States", "not_sure": "Not sure", "online_worldwide": "Online, worldwide", "other": "Somewhere else"} },
  T1: { q_id: "T1", section: "tools", input: "select", required: true, per_tool: true, allow_not_sure: false, text: "Which AI tool did you use?", help: "Choose it from the list. If it is not listed, choose “My tool isn’t listed” and type its name. You can add up to 3 tools.", option_labels: {"adobe-firefly": "Adobe Firefly", "elevenlabs": "ElevenLabs", "gemini-api": "Gemini API (developer access)", "gemini-consumer-app": "Gemini app (consumer)", "google-veo": "Google Veo", "higgsfield": "Higgsfield", "kling": "Kling", "luma": "Luma Dream Machine", "midjourney": "Midjourney", "not_sure": "Not sure", "openai-sora": "OpenAI Sora", "other_tool": "My tool isn’t listed", "pika": "Pika", "runway-gen3": "Runway", "stability-ai": "Stability AI", "suno": "Suno", "synthesia": "Synthesia"} },
  T1X: { q_id: "T1X", section: "tools", input: "text", required: true, per_tool: true, allow_not_sure: false, text: "What is the tool called?", help: "Type the name as it appears on the tool’s website. SI8 records it as you type it.", option_labels: {} },
  T3: { q_id: "T3", section: "tools", input: "plan", required: true, per_tool: true, allow_not_sure: true, text: "Which plan were you on with this tool while you made the video?", help: "The list shows only some plan names, and may not include yours. If your plan is not listed, choose “Another plan” and type its name as the tool shows it. If you do not know, choose “Not sure”.", option_labels: {} },
  T4: { q_id: "T4", section: "tools", input: "text", required: true, per_tool: true, allow_not_sure: true, text: "When did you use this tool for the video?", help: "Month and year, for example March–May 2026. If you do not know, choose “Not sure”.", option_labels: {} },
  L1: { q_id: "L1", section: "people", input: "single", required: true, per_tool: false, allow_not_sure: false, text: "Does the video include the likeness or voice of a real person?", help: "Include yourself, actors, clients or anyone else whose face, body or voice can be recognised, whether filmed, recorded or generated.", option_labels: {"no": "No", "not_sure": "Not sure", "yes": "Yes"} },
  M0: { q_id: "M0", section: "materials", input: "multi", required: true, per_tool: false, allow_not_sure: false, text: "Does the video include any of these? Select all that apply.", help: "Count anything you did not make yourself with your AI tools.", option_labels: {"brands": "Brand names, logos, products or characters you don’t own", "client_material": "Material supplied by a client or someone else", "music": "Music or sound you didn’t make with your AI tools", "none": "None of these", "not_sure": "Not sure", "stock": "Stock footage, images or other stock assets"}, exclusive_options: ["none"] },
  M1: { q_id: "M1", section: "materials", input: "select", required: true, per_tool: false, allow_not_sure: false, text: "Where did the music come from?", help: "Choose the music library or service you used. If it is not listed, choose “My service isn’t listed”.", option_labels: {"adobe-stock": "Adobe Stock", "artlist": "Artlist", "envato-elements": "Envato Elements", "epidemic-sound": "Epidemic Sound", "getty": "Getty Images", "istock": "iStock", "not_sure": "Not sure", "other_provider": "My service isn’t listed", "pond5": "Pond5", "shutterstock": "Shutterstock", "storyblocks": "Storyblocks"} },
  M1X: { q_id: "M1X", section: "materials", input: "text", required: true, per_tool: false, allow_not_sure: false, text: "What is the music service called?", help: "SI8 records it as you type it.", option_labels: {} },
  M2: { q_id: "M2", section: "materials", input: "single", required: true, per_tool: false, allow_not_sure: false, text: "Do you hold a licence or download receipt for the music?", help: "This only records whether such a document exists. Choose “Not applicable” if you made the music yourself.", option_labels: {"no": "No", "not_applicable": "Not applicable", "not_sure": "Not sure", "yes": "Yes"} },
  M3: { q_id: "M3", section: "materials", input: "select", required: true, per_tool: false, allow_not_sure: false, text: "Which stock service did the stock material come from?", help: "Choose the stock library you downloaded it from. If it is not listed, choose “My service isn’t listed”.", option_labels: {"adobe-stock": "Adobe Stock", "artlist": "Artlist", "envato-elements": "Envato Elements", "epidemic-sound": "Epidemic Sound", "getty": "Getty Images", "istock": "iStock", "not_sure": "Not sure", "other_provider": "My service isn’t listed", "pond5": "Pond5", "shutterstock": "Shutterstock", "storyblocks": "Storyblocks"} },
  M3X: { q_id: "M3X", section: "materials", input: "text", required: true, per_tool: false, allow_not_sure: false, text: "What is the stock service called?", help: "SI8 records it as you type it.", option_labels: {} },
  M3D: { q_id: "M3D", section: "materials", input: "single", required: true, per_tool: false, allow_not_sure: false, text: "Do you hold the licence, receipt or download history for the stock material?", help: "This only records whether such a document exists. SI8 does not ask how an asset is marked or what its licence covers.", option_labels: {"no": "No", "not_sure": "Not sure", "yes": "Yes"} },
  M4: { q_id: "M4", section: "materials", input: "single", required: true, per_tool: false, allow_not_sure: false, text: "Do you hold written permission or a licence from the owner of these brands, characters or materials?", help: "This only records whether such a document exists. SI8 does not assess what it covers.", option_labels: {"no": "No", "not_sure": "Not sure", "some": "For some of them", "yes": "Yes"} },
  H1: { q_id: "H1", section: "contribution", input: "multi", required: true, per_tool: false, allow_not_sure: false, text: "What did you contribute to the video yourself? Select all that apply.", help: "Choose what you did yourself, not what the AI tools did.", option_labels: {"composited": "Combined or composited material", "directed_shots": "Planned or directed the shots", "edited": "Edited the video", "not_sure": "Not sure", "original_assets": "Made original material used in it", "other_contribution": "Something else", "selected_outputs": "Chose between generated outputs", "wrote_script": "Wrote the script or concept"} },
  H2: { q_id: "H2", section: "contribution", input: "textarea", required: false, per_tool: false, allow_not_sure: false, text: "Anything else about your own contribution? (optional)", help: "For example, how you developed the concept or which shots you reworked by hand.", option_labels: {} },
})

export const CREATOR_RECORD_ACKNOWLEDGEMENTS: Readonly<Record<string, string>> = Object.freeze({"A1": "I confirm that what I have told SI8 is accurate to the best of my knowledge.", "A2": "I understand that this record contains what I told SI8, general educational guidance and, if an AI model reads a document I add, what that document appears to show. No person at SI8 checks my answers or my documents. It is not legal advice, not a clearance and not SI8’s human-reviewed Commercial Assurance Assessment. I agree to the Creator Record Terms of Service and acknowledge that I have read the Privacy Notice."})
export const CREATOR_RECORD_CAVEATS: Readonly<Record<string, string>> = Object.freeze({"CR-CAV-PROVIDER-OWN-TERMS": "This describes the provider’s own published terms or policy, as SI8 read them. It is not law and it is not legal advice.", "CR-CAV-TERMS-CHANGE": "Providers change their terms. What SI8 last read may differ from the terms that were in force for your account when you made the video."})
export const CREATOR_RECORD_DEPENDENCY_LABELS: Readonly<Record<string, string>> = Object.freeze({"human_contribution_description": "A description of your own contribution", "which_music_provider": "Which music service the music came from", "which_provider": "Which stock service the material came from"})
export const CREATOR_RECORD_SECTION_TITLES: Readonly<Record<string, string>> = Object.freeze({"acknowledgements": "Before you continue", "contribution": "Your own contribution", "locations": "Where you are and where it will be shown", "materials": "Material from other sources", "people": "Real people", "project": "Your video", "tools": "The AI tools you used"})

/** Customer-facing versions of the approved registry and ledger. */
export const CREATOR_RECORD_VERSIONS: Readonly<{ registry: string; ledger: string }> = Object.freeze({ registry: 'CR-V2-LAUNCH-REGISTRY-1', ledger: 'CR-V2-LAUNCH-LEDGER-1 (no entries)' })

/** Maximum number of tool blocks in the approved questionnaire. */
export const CREATOR_RECORD_MAX_TOOLS = 3

/**
 * Pinned digests, computed by the code from the approved content above and the customer wording set. A mismatch means
 * approved content changed: preparation, checkout and issuance then refuse.
 */
export const CREATOR_RECORD_SOURCE_TEXT_SHA256 = '0947f3d27e82e2bf9f509668a309baefb53caf3977f7d885edfe7ed56084d967'
export const CREATOR_RECORD_QUESTIONNAIRE_CONTRACT_SHA256 = '7b63a6d98ebe1a4b02d43091135f8c58ac59e295c1f6a5b80d8e28702ec808be'

const sourceTextApproval = (version: number, recordSchemaVersion: number, reviewRef: string): SourceTextApproval => Object.freeze({
  source_id: 'si8/creator-record-v2-source-text',
  version,
  content_sha256: CREATOR_RECORD_SOURCE_TEXT_SHA256,
  categories: ['question_wording', 'option_labels', 'acknowledgement_wording', 'dependency_labels', 'caveat_wording', 'customer_wording'],
  record_schema: { id: 'si8/creator-record-v2-record', version: recordSchemaVersion },
  lifecycle: 'approved',
  authority: LAUNCH_AUTHORITY,
  decision_date: LAUNCH_DECISION_DATE,
  review_ref: reviewRef,
}) as SourceTextApproval

/** The Source Text Approval covering the wording above, for the declarations record (schema 7). */
export const CREATOR_RECORD_SOURCE_TEXT_APPROVAL: SourceTextApproval | null = sourceTextApproval(3, 7, `${CREATOR_RECORD_LAUNCH_APPROVAL_REF} schema 7`)

/** CR-V2-SCHEMA8-PATH-1: the distinct approval of the same wording for the examination-bearing record (schema 8). */
export const CREATOR_RECORD_EXAMINATION_SOURCE_TEXT_APPROVAL: SourceTextApproval | null = sourceTextApproval(4, 8, `${CREATOR_RECORD_LAUNCH_APPROVAL_REF} schema 8`)

/** The approval of the exact questionnaire contract (R1). */
export const CREATOR_RECORD_QUESTIONNAIRE_APPROVAL: QuestionnaireContractApproval | null = Object.freeze({
  contract_id: 'si8/creator-record-v2-questionnaire-contract',
  contract_version: 1,
  contract_sha256: CREATOR_RECORD_QUESTIONNAIRE_CONTRACT_SHA256,
  lifecycle: 'approved',
  authority: LAUNCH_AUTHORITY,
  decision_date: LAUNCH_DECISION_DATE,
  review_ref: CREATOR_RECORD_LAUNCH_APPROVAL_REF,
}) as QuestionnaireContractApproval

// CR-V2-MVP-M3: the customer PDF template set and its approval (`../customer-pdf/templates`). Rendering
// refuses without both, so no Creator Record v2 PDF can be issued until they are approved (M0).

/** The approved customer PDF template set (data only). None approved yet. */
export const CREATOR_RECORD_PDF_TEMPLATES: unknown = null

/** The approval covering `CREATOR_RECORD_PDF_TEMPLATES`. None issued yet. */
export const CREATOR_RECORD_PDF_TEMPLATE_APPROVAL: PdfTemplateApproval | null = null

/**
 * CR-V2-MVP-PROD-PREP-1: further approved template sets, one per other record schema. The schema 7 set goes in
 * `CREATOR_RECORD_PDF_TEMPLATES` above and the schema 8 (examination-bearing) set here, each with its own approval naming its
 * schema (`approvedPdfTemplates` selects exactly one per schema; none or more than one refuses). None approved yet.
 */
export const CREATOR_RECORD_PDF_TEMPLATE_SETS: readonly { readonly templates: unknown; readonly approval: PdfTemplateApproval }[] = Object.freeze([])

// CR-V2-MVP-PROD-PREP-1 — the other integration points an approved launch fills, outside this file (each null or empty today):
//   - customer wording set: `lib/creator-record-flow/customer-wording.ts` (identity, covered by the two Source Text Approvals above);
//   - approved consent and permission wording identifiers: `lib/creator-record-flow/authorization-versions.ts`;
//   - privacy notice and terms: `lib/legal/policies.ts`;
//   - what may be issued (record schemas, builders, reading methods): `CURRENT_ISSUANCE_SUPPORT` in
//     `lib/creator-record/customer-record/governance-state.ts` — deliberately empty until separately authorized.

// CR-V2-MVP-M4B: the governance bundle — the only bundle Production can publish from
// (`./publication-authority`). Synthetic test approvals never go here: they live in
// `./synthetic-test-authority`, which governance mode never reads.

/** Every approved input above, as the Production publication authority. */
export const CREATOR_RECORD_GOVERNANCE_AUTHORITY: PublicationAuthorityBundle = Object.freeze({
  authority_class: 'governance',
  registry_input: CREATOR_RECORD_REGISTRY_INPUT,
  publication_ledger: CREATOR_RECORD_PUBLICATION_LEDGER,
  dependency_labels: CREATOR_RECORD_DEPENDENCY_LABELS,
  presentation: CREATOR_RECORD_PRESENTATION,
  acknowledgements: CREATOR_RECORD_ACKNOWLEDGEMENTS,
  caveats: CREATOR_RECORD_CAVEATS,
  versions: CREATOR_RECORD_VERSIONS,
  max_tools: CREATOR_RECORD_MAX_TOOLS,
  source_text_approval: CREATOR_RECORD_SOURCE_TEXT_APPROVAL,
  source_text_examination_approval: CREATOR_RECORD_EXAMINATION_SOURCE_TEXT_APPROVAL,
  questionnaire_approval: CREATOR_RECORD_QUESTIONNAIRE_APPROVAL,
  pdf_templates: CREATOR_RECORD_PDF_TEMPLATES,
  pdf_template_approval: CREATOR_RECORD_PDF_TEMPLATE_APPROVAL,
  pdf_template_sets: CREATOR_RECORD_PDF_TEMPLATE_SETS,
})
