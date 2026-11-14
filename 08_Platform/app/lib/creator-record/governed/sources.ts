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
import { NOT_SURE } from '../contract/question-registry'
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

// ── CR-V2-MVP-PROVIDER-SCOPE-1 (founder decision, JD, 2026-11-11) ──
// The MVP supports Higgsfield and Runway. Pika is removed from new customer tool choices and from the active publication set;
// Pika research, claim updates and Living Knowledge expansion are deferred until after the MVP. Pika Living Knowledge is not
// touched, CRC coverage is unchanged, and records already issued keep their own embedded questionnaire contract and guidance.
// The other registered tools stay selectable and, outside MVP scope, receive no guidance, as before.
export const CREATOR_RECORD_PROVIDER_SCOPE_APPROVAL_REF = 'JD-CR-V2-MVP-PROVIDER-SCOPE-1-20261111'
const PROVIDER_SCOPE_DECISION_DATE = '2026-11-11'

// ── CR-V2-MVP-PROVIDER-SCOPE-2 (CRV2-PA-1A, founder decision, JD, 2026-11-11) ──
// New Creator Records may select only the MVP tools, Higgsfield and Runway. Every other registered tool, and "My tool isn't
// listed" (so the free-text tool name T1X can no longer be shown or answered), is removed from T1 v3. "Not sure" stays: the
// question registry requires it on every closed question, and it attaches to no identity and no guidance. The T1 help text
// drops its sentence about "My tool isn't listed" (founder-approved wording). The tool identity registry, CRC, Living
// Knowledge and the publication ledger are unchanged. Issued records keep their own embedded contract and guidance.
export const CREATOR_RECORD_PROVIDER_SCOPE_2_APPROVAL_REF = 'JD-CR-V2-MVP-PROVIDER-SCOPE-2-20261111'
const PROVIDER_SCOPE_2_APPROVAL: GovernanceApproval = Object.freeze({
  status: 'approved',
  approver: LAUNCH_AUTHORITY,
  decision_date: PROVIDER_SCOPE_DECISION_DATE,
  review_ref: CREATOR_RECORD_PROVIDER_SCOPE_2_APPROVAL_REF,
}) as GovernanceApproval
/** The only tools a new Creator Record offers (CR-V2-MVP-PROVIDER-SCOPE-2). */
export const CREATOR_RECORD_MVP_TOOL_IDS: readonly string[] = Object.freeze(['higgsfield', 'runway-gen3'])
/** Registered tools that new Creator Records do not offer as a choice: every registered tool outside the MVP set. */
export const CREATOR_RECORD_EXCLUDED_TOOL_IDS: readonly string[] = Object.freeze(CANONICAL_TOOL_ID_LIST.filter((id) => !CREATOR_RECORD_MVP_TOOL_IDS.includes(id)))
const offeredTool = (code: string) => CREATOR_RECORD_MVP_TOOL_IDS.includes(code) || code === NOT_SURE
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
  // T1 v3 (CR-V2-MVP-PROVIDER-SCOPE-2): v1 offered every registered tool, v2 every tool but Pika; v3 offers only the MVP tools
  // and "Not sure". T1X is unchanged but can no longer be shown: its condition needs "My tool isn't listed", which v3 does not
  // offer, and an answer to a question that is not shown is refused (`hidden_answer`).
  question({ q_id: 'T1', version: 3, options: TOOL_OPTION_CODES.filter(offeredTool), approval: PROVIDER_SCOPE_2_APPROVAL }),
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
  ...CANONICAL_TOOL_ID_LIST.filter(offeredTool).map((id) => observation({ o_id: `${LAUNCH_ID}-O-T1-${id}`, version: 3, q_id: 'T1', q_version: 3, applies_to: { kind: 'option', value: id }, target: { kind: 'tool_identity' }, approval: PROVIDER_SCOPE_2_APPROVAL })),
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

/**
 * Approved Creator Record publication ledger (R7, R8): Runway, Pika baseline and Higgsfield, founder-approved
 * (JD-CR-V2-MVP-APPROVAL-PACKET-1-20261110). Explanations, applicability, caveats and refresh dates verbatim from the frozen packet; JD is responsible for
 * re-verification before refresh_by. An entry lapses after refresh_by, and is suspended if its claim is re-verified.
 *
 * CR-V2-LAUNCH-LEDGER-3 (CR-V2-MVP-PROVIDER-SCOPE-1): the Pika baseline entry is withdrawn by a version 2 entry
 * (`creator_record_eligible: 'No'`). Version 1 is kept unchanged except for `superseded_by`, which names its successor.
 * Runway and Higgsfield are unchanged.
 */
export const CREATOR_RECORD_PUBLICATION_LEDGER: readonly PublicationLedgerEntry[] = Object.freeze([
  {
    "entry_id": "CR-V2-LAUNCH-LEDGER-CLAIM-RUNWAY-COMMERCIAL-USE-001-v1",
    "version": 1,
    "claim_id": "CLAIM-RUNWAY-COMMERCIAL-USE-001-v1",
    "claim_last_verified": "2026-09-03",
    "creator_record_eligible": "Yes",
    "explanation": "Under Runway’s current Terms of Use, generated output may be used commercially on Runway’s Free, Standard, Pro and Max plans, except that the service and its outputs may not be used to create, train, develop or improve similar or competing products or services. This does not cover Runway’s Enterprise plan. This record does not show which Runway plan applied to your video.",
    "applicability_policy": "met_only",
    "evidence_notes": {},
    "required_caveats": [
      "CR-CAV-PROVIDER-OWN-TERMS",
      "CR-CAV-TERMS-CHANGE"
    ],
    "approver": "JD, for PMF Strategy Inc. d/b/a SuperImmersive 8",
    "decision_date": "2026-11-10",
    "refresh_by": "2027-02-10",
    "superseded_by": null
  },
  {
    "entry_id": "CR-V2-LAUNCH-LEDGER-CLAIM-PIKA-COMMERCIAL-USE-BASELINE-001-v1",
    "version": 1,
    "claim_id": "CLAIM-PIKA-COMMERCIAL-USE-BASELINE-001-v1",
    "claim_last_verified": "2026-09-06",
    "creator_record_eligible": "Yes",
    "explanation": "Under Pika’s current Terms of Service, generated output is limited to personal, non-commercial use by default. Pika’s paid subscription plans (Standard, Pro and Fancy) are the exception: they include commercial-use rights. This record does not show which Pika plan applied to your video.",
    "applicability_policy": "met_only",
    "evidence_notes": {},
    "required_caveats": [
      "CR-CAV-PROVIDER-OWN-TERMS",
      "CR-CAV-TERMS-CHANGE"
    ],
    "approver": "JD, for PMF Strategy Inc. d/b/a SuperImmersive 8",
    "decision_date": "2026-11-10",
    "refresh_by": "2027-02-10",
    "superseded_by": "CR-V2-LAUNCH-LEDGER-CLAIM-PIKA-COMMERCIAL-USE-BASELINE-001-v1-WITHDRAWN-2"
  },
  {
    "entry_id": "CR-V2-LAUNCH-LEDGER-CLAIM-PIKA-COMMERCIAL-USE-BASELINE-001-v1-WITHDRAWN-2",
    "version": 2,
    "claim_id": "CLAIM-PIKA-COMMERCIAL-USE-BASELINE-001-v1",
    "claim_last_verified": "2026-09-06",
    "creator_record_eligible": "No",
    "explanation": null,
    "applicability_policy": null,
    "evidence_notes": {},
    "required_caveats": [],
    "approver": "JD, for PMF Strategy Inc. d/b/a SuperImmersive 8",
    "decision_date": "2026-11-11",
    "refresh_by": null,
    "superseded_by": null
  },
  {
    "entry_id": "CR-V2-LAUNCH-LEDGER-CLAIM-HIGGSFIELD-COMMERCIAL-USE-001-v1",
    "version": 1,
    "claim_id": "CLAIM-HIGGSFIELD-COMMERCIAL-USE-001-v1",
    "claim_last_verified": "2026-10-14",
    "creator_record_eligible": "Yes",
    "explanation": "Under Higgsfield’s current Terms of Use, generated output may be used commercially on Higgsfield’s standard (non-Enterprise) terms, and those rights continue after an account or subscription ends. The terms also allow exported outputs to be transferred or sublicensed, including to clients. This does not extend to Higgsfield’s Enterprise tier, which has its own separate agreement that is not public. This concerns Higgsfield’s own terms only. It does not address the terms of any other provider’s model used through Higgsfield, or rights in people, voices, music or other material in the video.",
    "applicability_policy": "met_only",
    "evidence_notes": {},
    "required_caveats": [
      "CR-CAV-PROVIDER-OWN-TERMS",
      "CR-CAV-TERMS-CHANGE"
    ],
    "approver": "JD, for PMF Strategy Inc. d/b/a SuperImmersive 8",
    "decision_date": "2026-11-10",
    "refresh_by": "2027-02-10",
    "superseded_by": null
  }
]) as readonly PublicationLedgerEntry[]

// Approved wording (R2-R5 and the R1 section titles), verbatim from the frozen packet.
export const CREATOR_RECORD_PRESENTATION: CreatorRecordSources['presentation'] = Object.freeze({
  P1: { q_id: "P1", section: "project", input: "text", required: true, per_tool: false, allow_not_sure: false, text: "What is the title of the video?", help: "Use the title you would put on the finished video. A working title is fine.", option_labels: {} },
  P2: { q_id: "P2", section: "project", input: "textarea", required: false, per_tool: false, allow_not_sure: false, text: "Describe the video in a sentence or two (optional).", help: "For example: a 30-second product teaser made for a skincare brand.", option_labels: {} },
  P3: { q_id: "P3", section: "project", input: "multi", required: true, per_tool: false, allow_not_sure: false, text: "How do you intend to use the video? Select all that apply.", help: "Choose what you plan now. If you are not sure yet, choose “Not sure yet”.", option_labels: {"client_work": "As work for a client", "festival_or_screening": "At a festival or screening", "not_sure": "Not sure yet", "other_use": "Something else", "own_channels": "On my own channels or portfolio", "paid_advertising": "In paid advertising"} },
  F1: { q_id: "F1", section: "locations", input: "single", required: true, per_tool: false, allow_not_sure: false, text: "Where are you or your business based?", help: "This is recorded in your record only. It does not change which guidance is shown.", option_labels: {"AE": "United Arab Emirates", "EU": "European Union (as a whole)", "GB": "United Kingdom", "NL": "Netherlands", "SG": "Singapore", "TW": "Taiwan", "US": "United States", "not_sure": "Not sure", "online_worldwide": "Online, worldwide", "other": "Somewhere else"} },
  F2: { q_id: "F2", section: "locations", input: "multi", required: true, per_tool: false, allow_not_sure: false, text: "Where do you expect the video to be published or shown? Select all that apply.", help: "This is recorded in your record only. It does not change which guidance is shown.", option_labels: {"AE": "United Arab Emirates", "EU": "European Union (as a whole)", "GB": "United Kingdom", "NL": "Netherlands", "SG": "Singapore", "TW": "Taiwan", "US": "United States", "not_sure": "Not sure", "online_worldwide": "Online, worldwide", "other": "Somewhere else"} },
  F3: { q_id: "F3", section: "locations", input: "single", required: true, per_tool: false, allow_not_sure: false, text: "Where is the client or advertiser based?", help: "This is recorded in your record only. It does not change which guidance is shown.", option_labels: {"AE": "United Arab Emirates", "EU": "European Union (as a whole)", "GB": "United Kingdom", "NL": "Netherlands", "SG": "Singapore", "TW": "Taiwan", "US": "United States", "not_sure": "Not sure", "online_worldwide": "Online, worldwide", "other": "Somewhere else"} },
  T1: { q_id: "T1", section: "tools", input: "select", required: true, per_tool: true, allow_not_sure: false, text: "Which AI tool did you use?", help: "Choose it from the list. You can add up to 3 tools.", option_labels: {"higgsfield": "Higgsfield", "not_sure": "Not sure", "runway-gen3": "Runway"} },
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
export const CREATOR_RECORD_VERSIONS: Readonly<{ registry: string; ledger: string }> = Object.freeze({ registry: 'CR-V2-LAUNCH-REGISTRY-3', ledger: 'CR-V2-LAUNCH-LEDGER-3' })

/** Maximum number of tool blocks in the approved questionnaire. */
export const CREATOR_RECORD_MAX_TOOLS = 3

/**
 * Pinned digests, computed by the code from the approved content above and the customer wording set. A mismatch means
 * approved content changed: preparation, checkout and issuance then refuse.
 */
export const CREATOR_RECORD_SOURCE_TEXT_SHA256 = '7798a482cbb31772bce7819e503e5b065ac657a8ae2537faf69e494b6efdfbd9'
export const CREATOR_RECORD_QUESTIONNAIRE_CONTRACT_SHA256 = 'b398b0136f806278311d12a00a1faed54f8a1cef455910f67359ac48130abc95'

const sourceTextApproval = (version: number, recordSchemaVersion: number, reviewRef: string, decisionDate: string = LAUNCH_DECISION_DATE): SourceTextApproval => Object.freeze({
  source_id: 'si8/creator-record-v2-source-text',
  version,
  content_sha256: CREATOR_RECORD_SOURCE_TEXT_SHA256,
  categories: ['question_wording', 'option_labels', 'acknowledgement_wording', 'dependency_labels', 'caveat_wording', 'customer_wording'],
  record_schema: { id: 'si8/creator-record-v2-record', version: recordSchemaVersion },
  lifecycle: 'approved',
  authority: LAUNCH_AUTHORITY,
  decision_date: decisionDate,
  review_ref: reviewRef,
}) as SourceTextApproval

/**
 * The Source Text Approval covering the wording above, for the declarations record (schema 7). Versions 3 (schema 7) and 4
 * (schema 8) approved the launch wording with Pika in T1; versions 5 and 6 approved the same wording without it
 * (CR-V2-MVP-PROVIDER-SCOPE-1). Versions 7 (schema 7) and 8 (schema 8) approve T1 v3: only Higgsfield, Runway and "Not sure",
 * and the shortened T1 help text (CR-V2-MVP-PROVIDER-SCOPE-2). Nothing else in the wording changed.
 */
export const CREATOR_RECORD_SOURCE_TEXT_APPROVAL: SourceTextApproval | null = sourceTextApproval(7, 7, `${CREATOR_RECORD_PROVIDER_SCOPE_2_APPROVAL_REF} schema 7`, PROVIDER_SCOPE_DECISION_DATE)

/** CR-V2-SCHEMA8-PATH-1: the distinct approval of the same wording for the examination-bearing record (schema 8). */
export const CREATOR_RECORD_EXAMINATION_SOURCE_TEXT_APPROVAL: SourceTextApproval | null = sourceTextApproval(8, 8, `${CREATOR_RECORD_PROVIDER_SCOPE_2_APPROVAL_REF} schema 8`, PROVIDER_SCOPE_DECISION_DATE)

/**
 * The approval of the exact questionnaire contract (R1; version 2 = R1 with T1 v2, CR-V2-MVP-PROVIDER-SCOPE-1; version 3 = R1
 * with T1 v3, CR-V2-MVP-PROVIDER-SCOPE-2).
 */
export const CREATOR_RECORD_QUESTIONNAIRE_APPROVAL: QuestionnaireContractApproval | null = Object.freeze({
  contract_id: 'si8/creator-record-v2-questionnaire-contract',
  contract_version: 3,
  contract_sha256: CREATOR_RECORD_QUESTIONNAIRE_CONTRACT_SHA256,
  lifecycle: 'approved',
  authority: LAUNCH_AUTHORITY,
  decision_date: PROVIDER_SCOPE_DECISION_DATE,
  review_ref: CREATOR_RECORD_PROVIDER_SCOPE_2_APPROVAL_REF,
}) as QuestionnaireContractApproval

// CR-V2-MVP-M3: the customer PDF template set and its approval (`../customer-pdf/templates`). Rendering
// refuses without both, so no Creator Record v2 PDF can be issued until they are approved (M0).

/** The approved schema 7 customer PDF template set (R9, JD-CR-V2-MVP-APPROVAL-PACKET-1-20261110), verbatim from the frozen packet. */
export const CREATOR_RECORD_PDF_TEMPLATES: unknown = Object.freeze({
  "template_id": "si8/creator-record-v2-pdf-templates",
  "version": 1,
  "record_schema": {
    "id": "si8/creator-record-v2-record",
    "version": 7
  },
  "document_title": "SI8 Creator Record {record_id}",
  "stamp": "SELF-DECLARED RECORD · EDUCATIONAL GUIDANCE · NOT LEGAL ADVICE · NOT A CLEARANCE",
  "footer": "SI8 Creator Record {record_id} · Self-declared · Not legal advice · Not a clearance",
  "page_label": "Page {page} of {pages}",
  "sections": {
    "about": {
      "heading": "1. About this record",
      "intro": [
        "This Creator Record sets out what you told SI8 about your AI video, and general educational guidance that SI8 has published for the tools and services you named.",
        "Everything in sections 2 to 4 is your own declaration, recorded as you gave it. No person at SI8 checked it.",
        "The guidance in section 5 is educational. It describes providers’ own terms and policies as SI8 read them. It is not legal advice, and it does not say whether your video may be used commercially.",
        "Section 6 lists what this record does not establish. Section 7 lists what SI8 did not do."
      ],
      "counts": {
        "answers": {
          "one": "{n} answer recorded.",
          "other": "{n} answers recorded."
        },
        "guidance": {
          "one": "{n} guidance item.",
          "other": "{n} guidance items."
        },
        "open_items": {
          "one": "{n} open item.",
          "other": "{n} open items."
        }
      }
    },
    "project": {
      "heading": "2. Your video",
      "intro": "What you told SI8 about the video, where you are based and where it will be shown.",
      "empty": "You did not give any details here."
    },
    "tools": {
      "heading": "3. Your AI tools",
      "intro": "The AI tools you told SI8 you used, with the plan and dates you gave for each.",
      "tool_heading": "Tool {n}",
      "empty": "You did not name any tools."
    },
    "contribution": {
      "heading": "4. What went into the video",
      "intro": "What you told SI8 about real people, material from other sources and your own contribution.",
      "empty": "You did not give any details here."
    },
    "guidance": {
      "heading": "5. Educational guidance",
      "intro": "Guidance SI8 has published for Creator Records, selected from what you told SI8. Each item says why it was selected and what it depends on. An item is not a finding about your video.",
      "empty": "SI8 has no published guidance for the tools and services you named. That is not a finding about them: it neither suggests nor rules out commercial use, and it does not mean there is nothing to consider.",
      "item_heading": "Item {index}: {subject}",
      "subject_with_tool": "{topic} (tool {n})",
      "conclusion": "How this relates to what you told us",
      "item_limitation": "This is general educational guidance about the provider’s terms. It is not a determination about your video, your account or your use.",
      "selected_because": "Selected because you told us",
      "on_what_you_told_us": "Based on what you told us",
      "depends_on": "Depends on",
      "unspecified_condition": "A condition this record does not identify.",
      "topic_level": "Other information in this record means this subject is shown as not established, even though this item’s own conditions are based on what you told us.",
      "caveats": "Please note"
    },
    "open_items": {
      "heading": "6. Open items",
      "intro": "What this record does not establish. An open item is not a problem SI8 has found, and it is not resolved by anything in this record.",
      "empty": "No open items were identified from what you told SI8. This does not mean nothing is open.",
      "item_ref": "Item {index}",
      "for_guidance": "Relates to",
      "what_you_told_us": "What you told us",
      "nothing_told": "You did not tell us about this.",
      "evidence_note": "About evidence",
      "status": "Status",
      "sufficiency": "Sufficiency",
      "not_established_heading": "Not established by this record",
      "affects": "Affects items {items}",
      "unspecified_heading": "Conditions this record does not identify",
      "topic_qualified_heading": "Subjects shown as not established",
      "not_sure_heading": "Answers you were not sure about",
      "documents_heading": "Documents you added",
      "documents_not_provided": "You did not add any documents.",
      "limitations_heading": "Limitations of this record",
      "limitations": [
        "This record contains only what you told SI8. No person checked it against your video, your accounts or your documents.",
        "Guidance reflects providers’ terms as SI8 last read them. Terms change.",
        "Where you are based and where the video will be shown are recorded, but they do not change which guidance is shown.",
        "Tools and services SI8 has no published guidance for are recorded as you gave them, without guidance. That says nothing about whether they may be used commercially."
      ]
    },
    "not_done": {
      "heading": "7. What SI8 did not do",
      "lines": [
        "SI8 did not give legal advice.",
        "SI8 did not decide whether your video may be used commercially. This record is not a clearance.",
        "No person at SI8 reviewed your video, your answers or your documents.",
        "SI8 did not read or examine any document for this record.",
        "SI8 did not check that any document is genuine, complete or current.",
        "This is not SI8’s human-reviewed Commercial Assurance Assessment."
      ]
    },
    "provenance": {
      "heading": "8. How this record was made",
      "acknowledgements_heading": "What you acknowledged",
      "identity_heading": "This record",
      "sources_heading": "Questions and wording used",
      "publications_heading": "Guidance sources",
      "labels": {
        "record_id": "Record number",
        "issued_on": "Issued on",
        "prepared_ref": "Prepared record reference",
        "record_version": "Declaration version",
        "prepared_on": "Prepared on",
        "captured_at": "Answers captured at",
        "snapshot": "Answers fingerprint (SHA-256)",
        "record_schema": "Record format",
        "record_schema_version": "Record format version",
        "builder": "Record builder",
        "builder_version": "Record builder version",
        "registry_version": "Question set version",
        "ledger_version": "Guidance set version",
        "wording": "Wording set",
        "wording_version": "Wording version",
        "wording_digest": "Wording fingerprint",
        "questionnaire_contract": "Questionnaire",
        "questionnaire_contract_version": "Questionnaire version",
        "questionnaire_contract_ref": "Questionnaire reference",
        "templates": "Document layout",
        "templates_version": "Document layout version",
        "templates_fingerprint": "Document layout fingerprint",
        "publication_version": "Guidance entry version"
      }
    }
  },
  "documents": {
    "intro": "Documents you added, listed as received. SI8 did not read or examine them for this record.",
    "item_label": "File {n}",
    "type": "File type",
    "category": "Your description",
    "tool": "Linked to",
    "tool_value": "Tool {n}",
    "size": "Size",
    "size_value": "{bytes} bytes",
    "fingerprint": "SHA-256 fingerprint",
    "fingerprint_note": "A fingerprint identifies the exact file SI8 received. It does not show that the document is genuine, who made it, or when.",
    "examination": "Examination",
    "not_examined": "Not examined"
  },
  "document_type_labels": {
    "application/pdf": "PDF",
    "image/png": "PNG image",
    "image/jpeg": "JPEG image"
  },
  "document_category_labels": {
    "billing_receipt": "Receipt or invoice",
    "licence": "Licence",
    "provider_terms": "Provider terms",
    "release_or_consent": "Release or consent",
    "permission": "Permission",
    "project_file": "Project file",
    "other": "Other"
  },
  "question_sections": {
    "P1": "project",
    "P2": "project",
    "P3": "project",
    "F1": "project",
    "F2": "project",
    "F3": "project",
    "L1": "contribution",
    "M0": "contribution",
    "M1": "contribution",
    "M1X": "contribution",
    "M2": "contribution",
    "M3": "contribution",
    "M3X": "contribution",
    "M3D": "contribution",
    "M4": "contribution",
    "H1": "contribution",
    "H2": "contribution"
  },
  "conclusion_labels": {
    "relevant_on_declared_facts": "Relevant to what you told us",
    "relevant_applicability_unresolved": "May be relevant: it depends on something this record does not establish"
  },
  "topic_labels": {
    "commercial_use": "Commercial use of AI output",
    "third_party_source_rights": "Material from other sources"
  },
  "fact_labels": {
    "tool_plan_tier": "The plan you were on with this tool",
    "tool_account_status": "Your account status with this tool",
    "jurisdiction": "Where the terms are in force"
  },
  "not_sure_label": "Not sure",
  "dependency_codes": {
    "status": {
      "open": "Open"
    },
    "sufficiency": {
      "not_assessed": "Not assessed"
    }
  }
})

/** The approval covering `CREATOR_RECORD_PDF_TEMPLATES` (schema 7). */
export const CREATOR_RECORD_PDF_TEMPLATE_APPROVAL: PdfTemplateApproval | null = Object.freeze({
  template_id: 'si8/creator-record-v2-pdf-templates', version: 1, fingerprint: 'c5fe2a21ec8a096c6abf7eccf0bd55f3103401e10a26512052e5d2ee15a11c6c',
  record_schema: { id: 'si8/creator-record-v2-record', version: 7 }, lifecycle: 'superseded',
  authority: 'JD, for PMF Strategy Inc. d/b/a SuperImmersive 8', decision_date: '2026-11-10', review_ref: 'JD-CR-V2-MVP-APPROVAL-PACKET-1-20261110 R9',
}) as PdfTemplateApproval

/**
 * CR-V2-MVP-PROD-PREP-1: further approved template sets, one per other record schema. The schema 7 set goes in
 * `CREATOR_RECORD_PDF_TEMPLATES` above and the schema 8 (examination-bearing) set here, each with its own approval naming its
 * schema (`approvedPdfTemplates` selects exactly one per schema; none or more than one refuses). None approved yet.
 */
export const CREATOR_RECORD_PDF_TEMPLATE_SETS: readonly { readonly templates: unknown; readonly approval: PdfTemplateApproval }[] = Object.freeze([
  Object.freeze({
    // R10 (JD-CR-V2-MVP-APPROVAL-PACKET-1-20261110): the schema 8 set, including the approved live-reading labels, verbatim from the frozen packet.
    // CR-V2-MVP-INTEGRATION-4: plus the founder-approved integrated-assessment wording (version 3).
    templates: Object.freeze({
  "template_id": "si8/creator-record-v2-pdf-templates",
  "version": 3,
  "record_schema": {
    "id": "si8/creator-record-v2-record",
    "version": 8
  },
  "document_title": "SI8 Creator Record {record_id}",
  "stamp": "SELF-DECLARED RECORD · ANY DOCUMENT READINGS ARE AUTOMATED, NOT CHECKED BY A PERSON · EDUCATIONAL GUIDANCE · NOT LEGAL ADVICE · NOT A CLEARANCE",
  "footer": "SI8 Creator Record {record_id} · Self-declared · Not legal advice · Not a clearance",
  "page_label": "Page {page} of {pages}",
  "sections": {
    "about": {
      "heading": "1. About this record",
      "intro": [
        "This Creator Record sets out what you told SI8 about your AI video, what any documents you added appear to show, and general educational guidance that SI8 has published for the tools and services you named.",
        "Everything in sections 2 to 4 is your own declaration, recorded as you gave it. No person at SI8 checked it.",
        "Section 5 lists your documents, what an automated reading reported each one appears to show, and any response you gave to a reading. A reading is not something you told SI8, and no person checked it. A reading does not show that a document is genuine or what rights it gives. Readings do not change your declarations or the guidance.",
        "The guidance in section 6 is educational. It describes providers’ own terms and policies as SI8 read them. It is not legal advice, and it does not say whether your video may be used commercially.",
        "Section 7 lists what this record does not establish. Section 8 lists what SI8 did not do."
      ],
      "counts": {
        "answers": {
          "one": "{n} answer recorded.",
          "other": "{n} answers recorded."
        },
        "guidance": {
          "one": "{n} guidance item.",
          "other": "{n} guidance items."
        },
        "open_items": {
          "one": "{n} open item.",
          "other": "{n} open items."
        }
      }
    },
    "project": {
      "heading": "2. Your video",
      "intro": "What you told SI8 about the video, where you are based and where it will be shown.",
      "empty": "You did not give any details here."
    },
    "tools": {
      "heading": "3. Your AI tools",
      "intro": "The AI tools you told SI8 you used, with the plan and dates you gave for each.",
      "tool_heading": "Tool {n}",
      "empty": "You did not name any tools."
    },
    "contribution": {
      "heading": "4. What went into the video",
      "intro": "What you told SI8 about real people, material from other sources and your own contribution.",
      "empty": "You did not give any details here."
    },
    "guidance": {
      "heading": "6. Educational guidance",
      "intro": "Guidance SI8 has published for Creator Records, selected from what you told SI8. Document readings in section 5 were not used to select it. Each item says why it was selected and what it depends on. An item is not a finding about your video.",
      "empty": "SI8 has no published guidance for the tools and services you named. That is not a finding about them: it neither suggests nor rules out commercial use, and it does not mean there is nothing to consider.",
      "item_heading": "Item {index}: {subject}",
      "subject_with_tool": "{topic} (tool {n})",
      "conclusion": "How this relates to what you told us",
      "item_limitation": "This is general educational guidance about the provider’s terms. It is not a determination about your video, your account or your use.",
      "selected_because": "Selected because you told us",
      "on_what_you_told_us": "Based on what you told us",
      "depends_on": "Depends on",
      "unspecified_condition": "A condition this record does not identify.",
      "topic_level": "Other information in this record means this subject is shown as not established, even though this item’s own conditions are based on what you told us.",
      "caveats": "Please note"
    },
    "open_items": {
      "heading": "7. Open items",
      "intro": "What this record does not establish. An open item is not a problem SI8 has found, and it is not resolved by anything in this record.",
      "empty": "No open items were identified from what you told SI8. This does not mean nothing is open.",
      "item_ref": "Item {index}",
      "for_guidance": "Relates to",
      "what_you_told_us": "What you told us",
      "nothing_told": "You did not tell us about this.",
      "evidence_note": "About evidence",
      "status": "Status",
      "sufficiency": "Sufficiency",
      "not_established_heading": "Not established by this record",
      "affects": "Affects items {items}",
      "unspecified_heading": "Conditions this record does not identify",
      "topic_qualified_heading": "Subjects shown as not established",
      "not_sure_heading": "Answers you were not sure about",
      "documents_heading": "Documents you added",
      "documents_not_provided": "You did not add any documents.",
      "limitations_heading": "Limitations of this record",
      "limitations": [
        "Sections 2 to 4 contain only what you told SI8. No person checked them against your video, your accounts or your documents.",
        "Document readings in section 5 were made automatically and were not checked by a person. They may be wrong or incomplete.",
        "Guidance reflects providers’ terms as SI8 last read them. Terms change.",
        "Where you are based and where the video will be shown are recorded, but they do not change which guidance is shown.",
        "Tools and services SI8 has no published guidance for are recorded as you gave them, without guidance. That says nothing about whether they may be used commercially."
      ]
    },
    "not_done": {
      "heading": "8. What SI8 did not do",
      "lines": [
        "SI8 did not give legal advice.",
        "SI8 did not decide whether your video may be used commercially. This record is not a clearance.",
        "No person at SI8 reviewed your video, your answers, your documents or the readings of your documents.",
        "SI8 did not check that any document is genuine, complete or current, or that it belongs to you.",
        "SI8 drew no conclusion from comparing your documents with your declarations.",
        "This is not SI8’s human-reviewed Commercial Assurance Assessment."
      ]
    },
    "provenance": {
      "heading": "9. How this record was made",
      "acknowledgements_heading": "What you acknowledged",
      "identity_heading": "This record",
      "sources_heading": "Questions and wording used",
      "publications_heading": "Guidance sources",
      "labels": {
        "record_id": "Record number",
        "issued_on": "Issued on",
        "prepared_ref": "Prepared record reference",
        "record_version": "Declaration version",
        "prepared_on": "Prepared on",
        "captured_at": "Answers captured at",
        "snapshot": "Answers fingerprint (SHA-256)",
        "record_schema": "Record format",
        "record_schema_version": "Record format version",
        "builder": "Record builder",
        "builder_version": "Record builder version",
        "registry_version": "Question set version",
        "ledger_version": "Guidance set version",
        "wording": "Wording set",
        "wording_version": "Wording version",
        "wording_digest": "Wording fingerprint",
        "questionnaire_contract": "Questionnaire",
        "questionnaire_contract_version": "Questionnaire version",
        "questionnaire_contract_ref": "Questionnaire reference",
        "templates": "Document layout",
        "templates_version": "Document layout version",
        "templates_fingerprint": "Document layout fingerprint",
        "publication_version": "Guidance entry version"
      }
    }
  },
  "documents": {
    "intro": "Documents you added, listed as received.",
    "item_label": "File {n}",
    "type": "File type",
    "category": "Your description",
    "tool": "Linked to",
    "tool_value": "Tool {n}",
    "size": "Size",
    "size_value": "{bytes} bytes",
    "fingerprint": "SHA-256 fingerprint",
    "fingerprint_note": "A fingerprint identifies the exact file SI8 received. It does not show that the document is genuine, who made it, or when.",
    "examination": "Examination",
    "not_examined": "Not examined"
  },
  "integrated_assessment": {
    "heading": "How your documents relate to this guidance",
    "intro": "This section shows what you told us and what our automated examination found in documents linked to the AI tool you used.\n\nWhere document information is relevant to a condition in the guidance above, we explain why.\n\nThe automated examination does not independently confirm the information in your documents. Finding relevant information does not mean a condition has been satisfied. A document may still be useful even when this automated check cannot read information relevant to that condition.\n\nThe guidance above remains unchanged.",
    "requirement": "Condition",
    "unlabelled_requirement": "A condition this guidance depends on",
    "you_told_us": "What you told us",
    "nothing_told": "You did not give an answer for this.",
    "standing": "Current position",
    "standing_labels": {
      "rests_on_declaration": "Based on your answer.",
      "not_established": "Not established in this record. The guidance above stays conditional on it.",
      "open": "Open."
    },
    "evidence_labels": {
      "no_linked_document": "You did not link a document to this tool, so this rests on your answer alone.",
      "not_read_from_documents": "SI8's automated examination does not read this from documents, so your documents were not used for it.",
      "evidence_requirement_not_defined": "SI8 has not set out what document could show this, so your documents were not used for it. It remains open."
    },
    "document": "Document {n}",
    "status_labels": {
      "not_examined": "Not examined, so nothing from it was used.",
      "creator_disputed": "You asked SI8 not to rely on this reading, so it has not been used.",
      "cannot_establish": "No usable information for this condition was found in this document.",
      "leaves_uncertainty": "What this document shows about this condition is unclear.",
      "relevant_observation_unverified": "Contains information relevant to this condition."
    },
    "reason": "Detail",
    "reason_labels": {
      "not_examined": "The document was not examined.",
      "creator_response": "Your response to this document's reading.",
      "examination_failed": "The automated examination could not read the document.",
      "reading_not_recoverable": "The stored reading could not be used exactly as recorded.",
      "tool_link_not_established": "This record does not show which of your tools the document relates to for this condition.",
      "not_a_billing_document": "The examination did not read it as a receipt or invoice.",
      "document_illegible": "The examination could not read it clearly.",
      "field_not_shown": "The examination did not find a plan name on it.",
      "field_unreadable": "The examination found a plan name but could not read it.",
      "field_ambiguous": "The examination could not tell which plan name it shows.",
      "multiple_plans_shown": "The examination found more than one plan name.",
      "plan_text_incomplete": "The plan name the examination found appears cut off.",
      "field_present": "The examination found a plan name, and this condition depends on which plan you were on."
    },
    "appears_to_show": "Plan name read from the document",
    "excerpt": "Text it was read from",
    "your_response": "Your response",
    "not_compared": "SI8 has not determined whether the information read from your documents matches what you told us. This section explains how the document observations relate to the conditions in the guidance above.",
    "method": "Integrated assessment method, version {version}."
  },
  "document_type_labels": {
    "application/pdf": "PDF",
    "image/png": "PNG image",
    "image/jpeg": "JPEG image"
  },
  "document_category_labels": {
    "billing_receipt": "Receipt or invoice",
    "licence": "Licence",
    "provider_terms": "Provider terms",
    "release_or_consent": "Release or consent",
    "permission": "Permission",
    "project_file": "Project file",
    "other": "Other"
  },
  "question_sections": {
    "P1": "project",
    "P2": "project",
    "P3": "project",
    "F1": "project",
    "F2": "project",
    "F3": "project",
    "L1": "contribution",
    "M0": "contribution",
    "M1": "contribution",
    "M1X": "contribution",
    "M2": "contribution",
    "M3": "contribution",
    "M3X": "contribution",
    "M3D": "contribution",
    "M4": "contribution",
    "H1": "contribution",
    "H2": "contribution"
  },
  "conclusion_labels": {
    "relevant_on_declared_facts": "Relevant to what you told us",
    "relevant_applicability_unresolved": "May be relevant: it depends on something this record does not establish"
  },
  "topic_labels": {
    "commercial_use": "Commercial use of AI output",
    "third_party_source_rights": "Material from other sources"
  },
  "fact_labels": {
    "tool_plan_tier": "The plan you were on with this tool",
    "tool_account_status": "Your account status with this tool",
    "jurisdiction": "Where the terms are in force"
  },
  "not_sure_label": "Not sure",
  "dependency_codes": {
    "status": {
      "open": "Open"
    },
    "sufficiency": {
      "not_assessed": "Not assessed"
    }
  },
  "examination": {
    "heading": "5. Your documents and what they appear to show",
    "intro": [
      "For each document you added, this section shows what an automated reading reported it appears to show. Where you asked for it, the reading was made by an AI model.",
      "A reading is not something you told SI8, and no person checked it. It may be wrong or incomplete. It does not show that a document is genuine, that it belongs to you, or what rights it gives.",
      "Readings were not used to select or qualify the guidance in section 6."
    ],
    "document_heading": "Document {n}",
    "status": "Examination",
    "status_labels": {
      "not_examined": "Not examined",
      "examined": "Read",
      "could_not_examine": "Could not be read"
    },
    "failure": "Reason",
    "failure_labels": {
      "unsupported_format": "The file format could not be read",
      "file_too_large": "The file is too large to be read",
      "empty_file": "The file is empty",
      "model_error": "The reading failed",
      "structured_output_missing": "No reading was returned",
      "schema_invalid": "The reading returned could not be used"
    },
    "observations_heading": "What the document appears to show",
    "no_observations": "Nothing was reported for this document.",
    "field_labels": {
      "document_type": "Kind of document",
      "readability": "Legibility",
      "multiple_plans_shown": "More than one plan shown",
      "instruction_like_text_present": "Contains text addressed to an AI",
      "issuer_name": "Issued by",
      "product_or_plan_name": "Product or plan",
      "transaction_date": "Transaction date",
      "service_period_start": "Service period start",
      "service_period_end": "Service period end",
      "plan_candidate": "Plan name shown"
    },
    "qualifier": "Where it appears",
    "qualifier_labels": {
      "heading_or_title": "Heading or title",
      "current_plan_label": "Current plan label",
      "charge_line": "Charge line",
      "account_detail": "Account details",
      "other": "Elsewhere on the document"
    },
    "classification_labels": {
      "document_type": {
        "receipt": "Receipt",
        "invoice": "Invoice",
        "subscription_confirmation": "Subscription confirmation",
        "billing_screenshot": "Billing screenshot",
        "not_a_billing_document": "Not a billing document",
        "unknown": "Unknown"
      },
      "readability": {
        "legible": "Legible",
        "partially_legible": "Partly legible",
        "illegible": "Illegible"
      },
      "multiple_plans_shown": {
        "true": "Yes",
        "false": "No"
      },
      "instruction_like_text_present": {
        "true": "Yes",
        "false": "No"
      }
    },
    "basis": "Basis",
    "basis_labels": {
      "printed_text": "Text printed on the document",
      "examiner_classification": "The reading’s own description of the document"
    },
    "reading": "Reading",
    "reading_labels": {
      "present": "Shown",
      "not_shown": "Not shown",
      "unreadable": "Unreadable",
      "ambiguous": "Unclear"
    },
    "value": "Reported value",
    "excerpt": "Text it was read from",
    "your_response": "Your response",
    "response_labels": {
      "reading_incorrect": "You said this reading is wrong",
      "wrong_document": "You said this is the wrong document",
      "other_plan_applies": "You said a different plan was the one you used",
      "not_relevant": "You said this is not relevant"
    },
    "comparison_response": "Your response about the {field}",
    "comparison_field_labels": {
      "provider": "tool provider",
      "plan": "plan"
    },
    "limitations_heading": "Limitations of this reading",
    "limitation_labels": {
      "recorded_test_data_not_model_output": "This result replays SI8 test data. No AI model read the file.",
      "observations_not_verified": "No person checked this reading.",
      "no_location_reference": "The reading does not say where on the document each detail appears.",
      "fields_not_established": "Some details could not be read from the document.",
      "single_plan_reading_does_not_exclude_others": "Reading one plan name does not rule out other plans.",
      "multiple_plans_shown": "The document shows more than one plan.",
      "instruction_like_text_present": "The document contains text that looks like instructions to an AI. The reading was instructed to ignore it.",
      "not_a_billing_document": "The document does not appear to be a billing document.",
      "partially_legible": "Parts of the document are hard to read.",
      "illegible": "The document appears illegible."
    },
    "provenance_heading": "How the reading was made",
    "reference": "Reading reference",
    "method": "Method",
    "method_labels": {
      "fixture_replay": "Replay of SI8 test data (no AI model read a document)"
    },
    "content": "Document",
    "content_labels": {
      "known_synthetic_fixture": "An SI8 synthetic test document"
    },
    "profile": "Reading profile",
    "profile_value": "{id}, version {version}",
    "comparison_note": "This record does not say whether a document matches what you told SI8.",
    "open_items_pointer": "Your documents, and what each appears to show, are listed in section 5."
  },
  "live_examination": {
    "method": "Read by an AI model",
    "provider": "AI model provider",
    "provider_labels": {
      "anthropic": "Anthropic"
    },
    "model": "AI model",
    "executed_at": "Read at",
    "content_labels": {
      "customer_document": "A document you uploaded"
    },
    "limitation_labels": {
      "mock_test_data_not_model_output": "This result uses SI8 test data. No AI model read the file.",
      "observations_not_verified": "No person checked this reading.",
      "no_location_reference": "The reading does not say where on the document each detail appears.",
      "fields_not_established": "Some details could not be read from the document.",
      "single_plan_reading_does_not_exclude_others": "Reading one plan name does not rule out other plans.",
      "multiple_plans_shown": "The document shows more than one plan.",
      "instruction_like_text_present": "The document contains text that looks like instructions to an AI. The reading was instructed to ignore it.",
      "not_a_billing_document": "The document does not appear to be a billing document.",
      "partially_legible": "Parts of the document are hard to read.",
      "illegible": "The document appears illegible."
    }
  }
}),
    approval: Object.freeze({
      // CR-V2-MVP-INTEGRATION-4 (founder approval 2026-11-10): version 3 = the R10 set (version 2, fingerprint
      // a26f10643cfa838541fc4cf5ffd11e4d80cb90d2241610e8bbb7530c320a7346, unchanged) plus the approved `integrated_assessment` block
      // (PRD MVP scope §9). Exactly one set may name schema 8 (`approvedPdfTemplates`), so version 3 replaces version 2 here; a test
      // proves that removing the block and restoring `version: 2` reproduces version 2's approved fingerprint byte for byte. Issued records are not re-rendered.
      template_id: 'si8/creator-record-v2-pdf-templates', version: 3, fingerprint: '287de01d8dc365e4e7c62ab0ea25fdce0b824b26e31367560b85b2f9e779c1b5',
      record_schema: { id: 'si8/creator-record-v2-record', version: 8 }, lifecycle: 'superseded',
      authority: 'JD, for PMF Strategy Inc. d/b/a SuperImmersive 8', decision_date: '2026-11-10', review_ref: 'JD-CR-V2-MVP-INTEGRATION-4-20261110',
    }) as PdfTemplateApproval,
  }),
  Object.freeze({
    // CR-V2-MVP-CUTOVER: proposed v4 (schema 7) registered as approved: JD-CR-V2-MVP-RELEASE-AUTHORIZATION-1-20261114 v4.
    templates: Object.freeze({
  "template_id": "si8/creator-record-v2-pdf-templates",
  "version": 4,
  "record_schema": {
    "id": "si8/creator-record-v2-record",
    "version": 7
  },
  "document_title": "SI8 Creator Record {record_id}",
  "stamp": "SELF-DECLARED RECORD · EDUCATIONAL GUIDANCE · NOT LEGAL ADVICE · NOT A CLEARANCE",
  "footer": "SI8 Creator Record {record_id} · Self-declared · Not legal advice · Not a clearance",
  "page_label": "Page {page} of {pages}",
  "sections": {
    "about": {
      "heading": "1. About this record",
      "intro": [
        "This Creator Record sets out what you told SI8 about your AI video, and general educational guidance that SI8 has published for the tools and services you named.",
        "Everything in sections 3 to 5 is your own declaration, recorded as you gave it. No person at SI8 checked it.",
        "The guidance in section 2 is educational. It describes providers’ own terms and policies as SI8 read them. It is not legal advice, and it does not say whether your video may be used commercially.",
        "Section 2 also sets out what remains open and what this record does not establish. Section 6 sets out the record’s limitations, and section 7 lists what SI8 did not do."
      ],
      "counts": {
        "answers": {
          "one": "{n} answer recorded.",
          "other": "{n} answers recorded."
        },
        "guidance": {
          "one": "{n} consideration.",
          "other": "{n} considerations."
        },
        "open_items": {
          "one": "{n} open item.",
          "other": "{n} open items."
        }
      }
    },
    "project": {
      "heading": "3. Your video",
      "intro": "What you told SI8 about the video, where you are based and where it will be shown.",
      "empty": "You did not give any details here."
    },
    "tools": {
      "heading": "4. Your AI tools",
      "intro": "The AI tools you told SI8 you used, with the plan and dates you gave for each.",
      "tool_heading": "Tool {n}",
      "empty": "You did not name any tools."
    },
    "contribution": {
      "heading": "5. What went into the video",
      "intro": "What you told SI8 about real people, material from other sources and your own contribution.",
      "empty": "You did not give any details here."
    },
    "guidance": {
      "heading": "5. Educational guidance",
      "intro": "Guidance SI8 has published for Creator Records, selected from what you told SI8. Each item says why it was selected and what it depends on. An item is not a finding about your video.",
      "empty": "SI8 has no published guidance for the tools and services you named. That is not a finding about them: it neither suggests nor rules out commercial use, and it does not mean there is nothing to consider.",
      "item_heading": "Item {index}: {subject}",
      "subject_with_tool": "{topic} (tool {n})",
      "conclusion": "How this relates to what you told us",
      "item_limitation": "This is general educational guidance about the provider’s terms. It is not a determination about your video, your account or your use.",
      "selected_because": "Selected because you told us",
      "on_what_you_told_us": "Based on what you told us",
      "depends_on": "Depends on",
      "unspecified_condition": "A condition this record does not identify.",
      "topic_level": "Other information in this record means this subject is shown as not established, even though this item’s own conditions are based on what you told us.",
      "caveats": "Please note"
    },
    "open_items": {
      "heading": "6. Open items",
      "intro": "What this record does not establish. An open item is not a problem SI8 has found, and it is not resolved by anything in this record.",
      "empty": "No open items were identified from what you told SI8. This does not mean nothing is open.",
      "item_ref": "Item {index}",
      "for_guidance": "Relates to",
      "what_you_told_us": "What you told us",
      "nothing_told": "You did not tell us about this.",
      "evidence_note": "About evidence",
      "status": "Status",
      "sufficiency": "Sufficiency",
      "not_established_heading": "Not established by this record",
      "affects": "Affects items {items}",
      "unspecified_heading": "Conditions this record does not identify",
      "topic_qualified_heading": "Subjects shown as not established",
      "not_sure_heading": "Answers you were not sure about",
      "documents_heading": "Documents you added",
      "documents_not_provided": "You did not add any documents.",
      "limitations_heading": "Limitations of this record",
      "limitations": [
        "This record contains only what you told SI8. No person checked it against your video, your accounts or your documents.",
        "Guidance reflects providers’ terms as SI8 last read them. Terms change.",
        "Where you are based and where the video will be shown are recorded, but they do not change which guidance is shown.",
        "Tools and services SI8 has no published guidance for are recorded as you gave them, without guidance. That says nothing about whether they may be used commercially."
      ]
    },
    "not_done": {
      "heading": "7. What SI8 did not do",
      "lines": [
        "SI8 did not give legal advice.",
        "SI8 did not decide whether your video may be used commercially. This record is not a clearance.",
        "No person at SI8 reviewed your video, your answers or your documents.",
        "SI8 did not read or examine any document for this record.",
        "SI8 did not check that any document is genuine, complete or current.",
        "This is not SI8’s human-reviewed Commercial Assurance Assessment."
      ]
    },
    "provenance": {
      "heading": "8. How this record was made",
      "acknowledgements_heading": "What you acknowledged",
      "identity_heading": "This record",
      "sources_heading": "Questions and wording used",
      "publications_heading": "Guidance sources",
      "labels": {
        "record_id": "Record number",
        "issued_on": "Issued on",
        "prepared_ref": "Prepared record reference",
        "record_version": "Declaration version",
        "prepared_on": "Prepared on",
        "captured_at": "Answers captured at",
        "snapshot": "Answers fingerprint (SHA-256)",
        "record_schema": "Record format",
        "record_schema_version": "Record format version",
        "builder": "Record builder",
        "builder_version": "Record builder version",
        "registry_version": "Question set version",
        "ledger_version": "Guidance set version",
        "wording": "Wording set",
        "wording_version": "Wording version",
        "wording_digest": "Wording fingerprint",
        "questionnaire_contract": "Questionnaire",
        "questionnaire_contract_version": "Questionnaire version",
        "questionnaire_contract_ref": "Questionnaire reference",
        "templates": "Document layout",
        "templates_version": "Document layout version",
        "templates_fingerprint": "Document layout fingerprint",
        "publication_version": "Guidance entry version"
      }
    }
  },
  "documents": {
    "intro": "Documents you added, listed as received. SI8 did not read or examine them for this record.",
    "item_label": "File {n}",
    "type": "File type",
    "category": "Your description",
    "tool": "Linked to",
    "tool_value": "Tool {n}",
    "size": "Size",
    "size_value": "{bytes} bytes",
    "fingerprint": "SHA-256 fingerprint",
    "fingerprint_note": "A fingerprint identifies the exact file SI8 received. It does not show that the document is genuine, who made it, or when.",
    "examination": "Examination",
    "not_examined": "Not examined"
  },
  "document_type_labels": {
    "application/pdf": "PDF",
    "image/png": "PNG image",
    "image/jpeg": "JPEG image"
  },
  "document_category_labels": {
    "billing_receipt": "Receipt or invoice",
    "licence": "Licence",
    "provider_terms": "Provider terms",
    "release_or_consent": "Release or consent",
    "permission": "Permission",
    "project_file": "Project file",
    "other": "Other"
  },
  "question_sections": {
    "P1": "project",
    "P2": "project",
    "P3": "project",
    "F1": "project",
    "F2": "project",
    "F3": "project",
    "L1": "contribution",
    "M0": "contribution",
    "M1": "contribution",
    "M1X": "contribution",
    "M2": "contribution",
    "M3": "contribution",
    "M3X": "contribution",
    "M3D": "contribution",
    "M4": "contribution",
    "H1": "contribution",
    "H2": "contribution"
  },
  "conclusion_labels": {
    "relevant_on_declared_facts": "Relevant to what you told us",
    "relevant_applicability_unresolved": "May be relevant: it depends on something this record does not establish"
  },
  "topic_labels": {
    "commercial_use": "Commercial use of AI output",
    "third_party_source_rights": "Material from other sources"
  },
  "fact_labels": {
    "tool_plan_tier": "The plan you were on with this tool",
    "tool_account_status": "Your account status with this tool",
    "jurisdiction": "Where the terms are in force"
  },
  "not_sure_label": "Not sure",
  "dependency_codes": {
    "status": {
      "open": "Open"
    },
    "sufficiency": {
      "not_assessed": "Not assessed"
    }
  },
  "readiness_summary": {
    "summary": {
      "template_id": "si8/creator-record-v2-readiness-summary-templates",
      "version": 1,
      "conclusion_labels": {
        "relevant_on_declared_facts": "Relevant to what you told us",
        "relevant_applicability_unresolved": "May be relevant: it depends on something this record does not establish"
      },
      "topic_labels": {
        "commercial_use": "Commercial use of AI output",
        "third_party_source_rights": "Material from other sources"
      },
      "topic_framing": {
        "commercial_use": "The terms of an AI tool may contain conditions or restrictions on commercial use of its output.",
        "third_party_source_rights": "Music, stock footage and other third-party material may be subject to licence conditions and other rights or permissions that this record does not establish."
      },
      "selected_because_label": "Selected because you told us",
      "based_on_label": "Based on what you told us",
      "subject_questions": [
        "T1",
        "T1X",
        "M1",
        "M1X",
        "M3",
        "M3X"
      ],
      "topic_qualified_note": "Other information in this record means this subject is shown as not established, even though this consideration’s own conditions are based on what you told us.",
      "unspecified_condition_note": "A condition this record does not identify."
    },
    "render": {
      "template_id": "si8/creator-record-v2-readiness-render-templates",
      "version": 1,
      "summary_method": {
        "id": "si8/creator-record-v2-readiness-summary",
        "version": 2
      },
      "heading": "2. Commercial-readiness considerations",
      "orientation": "This section brings together any of SI8’s published guidance that was selected from what you told SI8, what remains open, and what this record does not establish. It does not weigh these points against each other or reach an overall conclusion, and it is not a decision about whether the video may be used commercially.",
      "declared_heading": "What you told us",
      "guidance_heading": "What SI8’s published guidance says",
      "guidance_intro": "Guidance SI8 has published for Creator Records, selected from what you told SI8. Each consideration says why it was selected and what it depends on. A consideration is not a finding about your video.",
      "item_limitation": "This is general educational guidance about the provider’s terms. It is not a determination about your video, your account or your use.",
      "dependency_told_label": "What you told us",
      "dependency_nothing_told": "You did not tell us about this.",
      "dependency_evidence_label": "About evidence",
      "conclusion_label": "How this relates to what you told us",
      "caveats_label": "Please note",
      "consideration_ref_label": "Consideration",
      "caveat_applies_to_label": "Applies to considerations",
      "depends_on_label": "Depends on",
      "fact_labels": {
        "tool_plan_tier": "The plan you were on with this tool",
        "tool_account_status": "Your account status with this tool",
        "jurisdiction": "Where the terms are in force"
      },
      "unresolved_heading": "Considerations and what remains open",
      "unresolved_intro": "An open item is not a problem SI8 has found, and it is not resolved by anything in this record.",
      "unresolved_empty": "No open items were identified from what you told SI8. This does not mean nothing is open.",
      "dependency_status_label": "Status",
      "dependency_status_labels": {
        "open": "Open"
      },
      "dependency_sufficiency_label": "Sufficiency",
      "dependency_sufficiency_labels": {
        "not_assessed": "Not assessed"
      },
      "topic_qualified_heading": "Subjects shown as not established",
      "unspecified_heading": "Conditions this record does not identify",
      "not_sure_heading": "Answers you were not sure about",
      "not_established_heading": "What this record does not establish",
      "guidance_none_selected": "No guidance was selected for this record.",
      "uncovered_intro": {
        "one": "This record contains no SI8 guidance for this tool or service you named:",
        "other": "This record contains no SI8 guidance for these tools and services you named:"
      },
      "rest_of_answers": "The rest of your answers received no guidance in this record. That is not a finding about them: it neither suggests nor rules out commercial use, and it does not mean there is nothing to consider.",
      "assurance_heading": "How this differs from a human-reviewed assessment",
      "assurance_text": "This record organises what you declared and what SI8’s published guidance says about it. It does not examine the evidence behind your answers, resolve open items or decide whether your video may be used commercially. SI8’s Commercial Assurance Assessment is a separate service in which a person at SI8 reviews a project and its evidence.",
      "limitations_heading": "6. Documents and limitations",
      "overview_no_open": "No open item was identified for this consideration from what you told SI8. This does not mean nothing is open.",
      "guidance_unidentified": {
        "one": "No guidance specific to a tool or service could be selected for this answer, because you did not identify the tool or service:",
        "other": "No guidance specific to a tool or service could be selected for these answers, because you did not identify the tools or services:"
      },
      "about_intro_no_guidance": "This Creator Record sets out what you told SI8 about your AI video. None of the general educational guidance that SI8 has published was selected from what you told SI8.",
      "count_open_linked": {
        "one": "{n} open item linked to considerations.",
        "other": "{n} open items linked to considerations."
      },
      "count_not_sure": {
        "one": "{n} answer you were not sure about.",
        "other": "{n} answers you were not sure about."
      }
    }
  }
}),
    approval: Object.freeze({"template_id": "si8/creator-record-v2-pdf-templates", "version": 4, "fingerprint": "d4ecf3f39487ed43ce6c5e621d988d6525b638c952a8c5ead01e0cc9b8504f7e", "record_schema": {"id": "si8/creator-record-v2-record", "version": 7}, "lifecycle": "approved", "authority": "JD, for PMF Strategy Inc. d/b/a SuperImmersive 8", "decision_date": "2026-11-14", "review_ref": "JD-CR-V2-MVP-RELEASE-AUTHORIZATION-1-20261114 v4"}) as PdfTemplateApproval,
  }),
  Object.freeze({
    // CR-V2-MVP-CUTOVER: proposed v5 (schema 8) registered as approved: JD-CR-V2-MVP-RELEASE-AUTHORIZATION-1-20261114 v5.
    templates: Object.freeze({
  "template_id": "si8/creator-record-v2-pdf-templates",
  "version": 5,
  "record_schema": {
    "id": "si8/creator-record-v2-record",
    "version": 8
  },
  "document_title": "SI8 Creator Record {record_id}",
  "stamp": "SELF-DECLARED RECORD · ANY DOCUMENT READINGS ARE AUTOMATED, NOT CHECKED BY A PERSON · EDUCATIONAL GUIDANCE · NOT LEGAL ADVICE · NOT A CLEARANCE",
  "footer": "SI8 Creator Record {record_id} · Self-declared · Not legal advice · Not a clearance",
  "page_label": "Page {page} of {pages}",
  "sections": {
    "about": {
      "heading": "1. About this record",
      "intro": [
        "This Creator Record sets out what you told SI8 about your AI video, what any documents you added appear to show, and general educational guidance that SI8 has published for the tools and services you named.",
        "Everything in sections 3 to 5 is your own declaration, recorded as you gave it. No person at SI8 checked it.",
        "Section 6 lists your documents, what an automated reading reported each one appears to show, and any response you gave to a reading. A reading is not something you told SI8, and no person checked it. A reading does not show that a document is genuine or what rights it gives. Readings do not change your declarations or the guidance.",
        "The guidance in section 2 is educational. It describes providers’ own terms and policies as SI8 read them. It is not legal advice, and it does not say whether your video may be used commercially.",
        "Section 2 also sets out what remains open and what this record does not establish. Section 7 sets out the record’s limitations, and section 8 lists what SI8 did not do."
      ],
      "counts": {
        "answers": {
          "one": "{n} answer recorded.",
          "other": "{n} answers recorded."
        },
        "guidance": {
          "one": "{n} consideration.",
          "other": "{n} considerations."
        },
        "open_items": {
          "one": "{n} open item.",
          "other": "{n} open items."
        }
      }
    },
    "project": {
      "heading": "3. Your video",
      "intro": "What you told SI8 about the video, where you are based and where it will be shown.",
      "empty": "You did not give any details here."
    },
    "tools": {
      "heading": "4. Your AI tools",
      "intro": "The AI tools you told SI8 you used, with the plan and dates you gave for each.",
      "tool_heading": "Tool {n}",
      "empty": "You did not name any tools."
    },
    "contribution": {
      "heading": "5. What went into the video",
      "intro": "What you told SI8 about real people, material from other sources and your own contribution.",
      "empty": "You did not give any details here."
    },
    "guidance": {
      "heading": "6. Educational guidance",
      "intro": "Guidance SI8 has published for Creator Records, selected from what you told SI8. Document readings in section 5 were not used to select it. Each item says why it was selected and what it depends on. An item is not a finding about your video.",
      "empty": "SI8 has no published guidance for the tools and services you named. That is not a finding about them: it neither suggests nor rules out commercial use, and it does not mean there is nothing to consider.",
      "item_heading": "Item {index}: {subject}",
      "subject_with_tool": "{topic} (tool {n})",
      "conclusion": "How this relates to what you told us",
      "item_limitation": "This is general educational guidance about the provider’s terms. It is not a determination about your video, your account or your use.",
      "selected_because": "Selected because you told us",
      "on_what_you_told_us": "Based on what you told us",
      "depends_on": "Depends on",
      "unspecified_condition": "A condition this record does not identify.",
      "topic_level": "Other information in this record means this subject is shown as not established, even though this item’s own conditions are based on what you told us.",
      "caveats": "Please note"
    },
    "open_items": {
      "heading": "7. Open items",
      "intro": "What this record does not establish. An open item is not a problem SI8 has found, and it is not resolved by anything in this record.",
      "empty": "No open items were identified from what you told SI8. This does not mean nothing is open.",
      "item_ref": "Item {index}",
      "for_guidance": "Relates to",
      "what_you_told_us": "What you told us",
      "nothing_told": "You did not tell us about this.",
      "evidence_note": "About evidence",
      "status": "Status",
      "sufficiency": "Sufficiency",
      "not_established_heading": "Not established by this record",
      "affects": "Affects items {items}",
      "unspecified_heading": "Conditions this record does not identify",
      "topic_qualified_heading": "Subjects shown as not established",
      "not_sure_heading": "Answers you were not sure about",
      "documents_heading": "Documents you added",
      "documents_not_provided": "You did not add any documents.",
      "limitations_heading": "Limitations of this record",
      "limitations": [
        "Sections 3 to 5 contain only what you told SI8. No person checked them against your video, your accounts or your documents.",
        "Document readings in section 6 were made automatically and were not checked by a person. They may be wrong or incomplete.",
        "Guidance reflects providers’ terms as SI8 last read them. Terms change.",
        "Where you are based and where the video will be shown are recorded, but they do not change which guidance is shown.",
        "Tools and services SI8 has no published guidance for are recorded as you gave them, without guidance. That says nothing about whether they may be used commercially."
      ]
    },
    "not_done": {
      "heading": "8. What SI8 did not do",
      "lines": [
        "SI8 did not give legal advice.",
        "SI8 did not decide whether your video may be used commercially. This record is not a clearance.",
        "No person at SI8 reviewed your video, your answers, your documents or the readings of your documents.",
        "SI8 did not check that any document is genuine, complete or current, or that it belongs to you.",
        "SI8 did not compare your documents, or their readings, with what you told SI8 or with the guidance.",
        "This is not SI8’s human-reviewed Commercial Assurance Assessment."
      ]
    },
    "provenance": {
      "heading": "9. How this record was made",
      "acknowledgements_heading": "What you acknowledged",
      "identity_heading": "This record",
      "sources_heading": "Questions and wording used",
      "publications_heading": "Guidance sources",
      "labels": {
        "record_id": "Record number",
        "issued_on": "Issued on",
        "prepared_ref": "Prepared record reference",
        "record_version": "Declaration version",
        "prepared_on": "Prepared on",
        "captured_at": "Answers captured at",
        "snapshot": "Answers fingerprint (SHA-256)",
        "record_schema": "Record format",
        "record_schema_version": "Record format version",
        "builder": "Record builder",
        "builder_version": "Record builder version",
        "registry_version": "Question set version",
        "ledger_version": "Guidance set version",
        "wording": "Wording set",
        "wording_version": "Wording version",
        "wording_digest": "Wording fingerprint",
        "questionnaire_contract": "Questionnaire",
        "questionnaire_contract_version": "Questionnaire version",
        "questionnaire_contract_ref": "Questionnaire reference",
        "templates": "Document layout",
        "templates_version": "Document layout version",
        "templates_fingerprint": "Document layout fingerprint",
        "publication_version": "Guidance entry version"
      }
    }
  },
  "documents": {
    "intro": "Documents you added, listed as received.",
    "item_label": "File {n}",
    "type": "File type",
    "category": "Your description",
    "tool": "Linked to",
    "tool_value": "Tool {n}",
    "size": "Size",
    "size_value": "{bytes} bytes",
    "fingerprint": "SHA-256 fingerprint",
    "fingerprint_note": "A fingerprint identifies the exact file SI8 received. It does not show that the document is genuine, who made it, or when.",
    "examination": "Examination",
    "not_examined": "Not examined"
  },
  "document_type_labels": {
    "application/pdf": "PDF",
    "image/png": "PNG image",
    "image/jpeg": "JPEG image"
  },
  "document_category_labels": {
    "billing_receipt": "Receipt or invoice",
    "licence": "Licence",
    "provider_terms": "Provider terms",
    "release_or_consent": "Release or consent",
    "permission": "Permission",
    "project_file": "Project file",
    "other": "Other"
  },
  "question_sections": {
    "P1": "project",
    "P2": "project",
    "P3": "project",
    "F1": "project",
    "F2": "project",
    "F3": "project",
    "L1": "contribution",
    "M0": "contribution",
    "M1": "contribution",
    "M1X": "contribution",
    "M2": "contribution",
    "M3": "contribution",
    "M3X": "contribution",
    "M3D": "contribution",
    "M4": "contribution",
    "H1": "contribution",
    "H2": "contribution"
  },
  "conclusion_labels": {
    "relevant_on_declared_facts": "Relevant to what you told us",
    "relevant_applicability_unresolved": "May be relevant: it depends on something this record does not establish"
  },
  "topic_labels": {
    "commercial_use": "Commercial use of AI output",
    "third_party_source_rights": "Material from other sources"
  },
  "fact_labels": {
    "tool_plan_tier": "The plan you were on with this tool",
    "tool_account_status": "Your account status with this tool",
    "jurisdiction": "Where the terms are in force"
  },
  "not_sure_label": "Not sure",
  "dependency_codes": {
    "status": {
      "open": "Open"
    },
    "sufficiency": {
      "not_assessed": "Not assessed"
    }
  },
  "examination": {
    "heading": "6. Your documents and what they appear to show",
    "intro": [
      "For each document you added, this section shows what an automated reading reported it appears to show. Where you asked for it, the reading was made by an AI model.",
      "A reading is not something you told SI8, and no person checked it. It may be wrong or incomplete. It does not show that a document is genuine, that it belongs to you, or what rights it gives.",
      "Readings were not compared with what you told SI8, and were not used to select or qualify the guidance in section 2."
    ],
    "document_heading": "Document {n}",
    "status": "Examination",
    "status_labels": {
      "not_examined": "Not examined",
      "examined": "Read",
      "could_not_examine": "Could not be read"
    },
    "failure": "Reason",
    "failure_labels": {
      "unsupported_format": "The file format could not be read",
      "file_too_large": "The file is too large to be read",
      "empty_file": "The file is empty",
      "model_error": "The reading failed",
      "structured_output_missing": "No reading was returned",
      "schema_invalid": "The reading returned could not be used"
    },
    "observations_heading": "What the document appears to show",
    "no_observations": "Nothing was reported for this document.",
    "field_labels": {
      "document_type": "Kind of document",
      "readability": "Legibility",
      "multiple_plans_shown": "More than one plan shown",
      "instruction_like_text_present": "Contains text addressed to an AI",
      "issuer_name": "Issued by",
      "product_or_plan_name": "Product or plan",
      "transaction_date": "Transaction date",
      "service_period_start": "Service period start",
      "service_period_end": "Service period end",
      "plan_candidate": "Plan name shown"
    },
    "qualifier": "Where it appears",
    "qualifier_labels": {
      "heading_or_title": "Heading or title",
      "current_plan_label": "Current plan label",
      "charge_line": "Charge line",
      "account_detail": "Account details",
      "other": "Elsewhere on the document"
    },
    "classification_labels": {
      "document_type": {
        "receipt": "Receipt",
        "invoice": "Invoice",
        "subscription_confirmation": "Subscription confirmation",
        "billing_screenshot": "Billing screenshot",
        "not_a_billing_document": "Not a billing document",
        "unknown": "Unknown"
      },
      "readability": {
        "legible": "Legible",
        "partially_legible": "Partly legible",
        "illegible": "Illegible"
      },
      "multiple_plans_shown": {
        "true": "Yes",
        "false": "No"
      },
      "instruction_like_text_present": {
        "true": "Yes",
        "false": "No"
      }
    },
    "basis": "Basis",
    "basis_labels": {
      "printed_text": "Text printed on the document",
      "examiner_classification": "The reading’s own description of the document"
    },
    "reading": "Reading",
    "reading_labels": {
      "present": "Shown",
      "not_shown": "Not shown",
      "unreadable": "Unreadable",
      "ambiguous": "Unclear"
    },
    "value": "Reported value",
    "excerpt": "Text it was read from",
    "your_response": "Your response",
    "response_labels": {
      "reading_incorrect": "You said this reading is wrong",
      "wrong_document": "You said this is the wrong document",
      "other_plan_applies": "You said a different plan was the one you used",
      "not_relevant": "You said this is not relevant"
    },
    "comparison_response": "Your response about the {field}",
    "comparison_field_labels": {
      "provider": "tool provider",
      "plan": "plan"
    },
    "limitations_heading": "Limitations of this reading",
    "limitation_labels": {
      "recorded_test_data_not_model_output": "This result replays SI8 test data. No AI model read the file.",
      "observations_not_verified": "No person checked this reading.",
      "no_location_reference": "The reading does not say where on the document each detail appears.",
      "fields_not_established": "Some details could not be read from the document.",
      "single_plan_reading_does_not_exclude_others": "Reading one plan name does not rule out other plans.",
      "multiple_plans_shown": "The document shows more than one plan.",
      "instruction_like_text_present": "The document contains text that looks like instructions to an AI. The reading was instructed to ignore it.",
      "not_a_billing_document": "The document does not appear to be a billing document.",
      "partially_legible": "Parts of the document are hard to read.",
      "illegible": "The document appears illegible."
    },
    "provenance_heading": "How the reading was made",
    "reference": "Reading reference",
    "method": "Method",
    "method_labels": {
      "fixture_replay": "Replay of SI8 test data (no AI model read a document)"
    },
    "content": "Document",
    "content_labels": {
      "known_synthetic_fixture": "An SI8 synthetic test document"
    },
    "profile": "Reading profile",
    "profile_value": "{id}, version {version}",
    "comparison_note": "This record does not say whether a document matches what you told SI8.",
    "open_items_pointer": "Your documents, and what each appears to show, are listed in section 5."
  },
  "live_examination": {
    "method": "Read by an AI model",
    "provider": "AI model provider",
    "provider_labels": {
      "anthropic": "Anthropic"
    },
    "model": "AI model",
    "executed_at": "Read at",
    "content_labels": {
      "customer_document": "A document you uploaded"
    },
    "limitation_labels": {
      "mock_test_data_not_model_output": "This result uses SI8 test data. No AI model read the file.",
      "observations_not_verified": "No person checked this reading.",
      "no_location_reference": "The reading does not say where on the document each detail appears.",
      "fields_not_established": "Some details could not be read from the document.",
      "single_plan_reading_does_not_exclude_others": "Reading one plan name does not rule out other plans.",
      "multiple_plans_shown": "The document shows more than one plan.",
      "instruction_like_text_present": "The document contains text that looks like instructions to an AI. The reading was instructed to ignore it.",
      "not_a_billing_document": "The document does not appear to be a billing document.",
      "partially_legible": "Parts of the document are hard to read.",
      "illegible": "The document appears illegible."
    }
  },
  "readiness_summary": {
    "summary": {
      "template_id": "si8/creator-record-v2-readiness-summary-templates",
      "version": 1,
      "conclusion_labels": {
        "relevant_on_declared_facts": "Relevant to what you told us",
        "relevant_applicability_unresolved": "May be relevant: it depends on something this record does not establish"
      },
      "topic_labels": {
        "commercial_use": "Commercial use of AI output",
        "third_party_source_rights": "Material from other sources"
      },
      "topic_framing": {
        "commercial_use": "The terms of an AI tool may contain conditions or restrictions on commercial use of its output.",
        "third_party_source_rights": "Music, stock footage and other third-party material may be subject to licence conditions and other rights or permissions that this record does not establish."
      },
      "selected_because_label": "Selected because you told us",
      "based_on_label": "Based on what you told us",
      "subject_questions": [
        "T1",
        "T1X",
        "M1",
        "M1X",
        "M3",
        "M3X"
      ],
      "topic_qualified_note": "Other information in this record means this subject is shown as not established, even though this consideration’s own conditions are based on what you told us.",
      "unspecified_condition_note": "A condition this record does not identify."
    },
    "render": {
      "template_id": "si8/creator-record-v2-readiness-render-templates",
      "version": 2,
      "summary_method": {
        "id": "si8/creator-record-v2-readiness-summary",
        "version": 2
      },
      "heading": "2. Commercial-readiness considerations",
      "orientation": "This section brings together any of SI8’s published guidance that was selected from what you told SI8, what remains open, and what this record does not establish. It does not weigh these points against each other or reach an overall conclusion, and it is not a decision about whether the video may be used commercially.",
      "declared_heading": "What you told us",
      "guidance_heading": "What SI8’s published guidance says",
      "guidance_intro": "Guidance SI8 has published for Creator Records, selected from what you told SI8. Document readings in section 6 were not used to select it. Each consideration says why it was selected and what it depends on. A consideration is not a finding about your video.",
      "item_limitation": "This is general educational guidance about the provider’s terms. It is not a determination about your video, your account or your use.",
      "dependency_told_label": "What you told us",
      "dependency_nothing_told": "You did not tell us about this.",
      "dependency_evidence_label": "About evidence",
      "conclusion_label": "How this relates to what you told us",
      "caveats_label": "Please note",
      "consideration_ref_label": "Consideration",
      "caveat_applies_to_label": "Applies to considerations",
      "depends_on_label": "Depends on",
      "fact_labels": {
        "tool_plan_tier": "The plan you were on with this tool",
        "tool_account_status": "Your account status with this tool",
        "jurisdiction": "Where the terms are in force"
      },
      "unresolved_heading": "Considerations and what remains open",
      "unresolved_intro": "An open item is not a problem SI8 has found, and it is not resolved by anything in this record.",
      "unresolved_empty": "No open items were identified from what you told SI8. This does not mean nothing is open.",
      "dependency_status_label": "Status",
      "dependency_status_labels": {
        "open": "Open"
      },
      "dependency_sufficiency_label": "Sufficiency",
      "dependency_sufficiency_labels": {
        "not_assessed": "Not assessed"
      },
      "topic_qualified_heading": "Subjects shown as not established",
      "unspecified_heading": "Conditions this record does not identify",
      "not_sure_heading": "Answers you were not sure about",
      "not_established_heading": "What this record does not establish",
      "guidance_none_selected": "No guidance was selected for this record.",
      "uncovered_intro": {
        "one": "This record contains no SI8 guidance for this tool or service you named:",
        "other": "This record contains no SI8 guidance for these tools and services you named:"
      },
      "rest_of_answers": "The rest of your answers received no guidance in this record. That is not a finding about them: it neither suggests nor rules out commercial use, and it does not mean there is nothing to consider.",
      "assurance_heading": "How this differs from a human-reviewed assessment",
      "assurance_text": "This record organises what you declared and what SI8’s published guidance says about it. It does not examine the evidence behind your answers, resolve open items or decide whether your video may be used commercially. SI8’s Commercial Assurance Assessment is a separate service in which a person at SI8 reviews a project and its evidence.",
      "limitations_heading": "7. Limitations of this record",
      "overview_no_open": "No open item was identified for this consideration from what you told SI8. This does not mean nothing is open.",
      "guidance_unidentified": {
        "one": "No guidance specific to a tool or service could be selected for this answer, because you did not identify the tool or service:",
        "other": "No guidance specific to a tool or service could be selected for these answers, because you did not identify the tools or services:"
      },
      "about_intro_no_guidance": "This Creator Record sets out what you told SI8 about your AI video and what any documents you added appear to show. None of the general educational guidance that SI8 has published was selected from what you told SI8.",
      "count_open_linked": {
        "one": "{n} open item linked to considerations.",
        "other": "{n} open items linked to considerations."
      },
      "count_not_sure": {
        "one": "{n} answer you were not sure about.",
        "other": "{n} answers you were not sure about."
      }
    }
  }
}),
    approval: Object.freeze({"template_id": "si8/creator-record-v2-pdf-templates", "version": 5, "fingerprint": "a27e23cdbc1b12c16330b9518bba210b218bb0e8807e53ac164d6673ec873408", "record_schema": {"id": "si8/creator-record-v2-record", "version": 8}, "lifecycle": "approved", "authority": "JD, for PMF Strategy Inc. d/b/a SuperImmersive 8", "decision_date": "2026-11-14", "review_ref": "JD-CR-V2-MVP-RELEASE-AUTHORIZATION-1-20261114 v5"}) as PdfTemplateApproval,
  }),
])

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
