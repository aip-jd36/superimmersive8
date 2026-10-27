/**
 * CR-V2-VERTICAL-SLICE-1 — PILOT Question Registry, Observation Map and
 * wording for the INTERNAL admin prototype only.
 *
 * ┌──────────────────────────────────────────────────────────────────────┐
 * │ INTERNAL AND UNAPPROVED. Nothing here is a governance decision.      │
 * │ The questions and wording are drafts taken from PRD v0.3 §5.1. They  │
 * │ have had no counsel review and no Register approval.                 │
 * └──────────────────────────────────────────────────────────────────────┘
 *
 * The contract core shows only entries whose approval status is `approved`
 * (an unapproved entry behaves as absent, v0.3 §2.2 rule 5). To let the
 * internal prototype exercise the real contract, every pilot entry carries
 * PILOT_APPROVAL: status `approved`, but an approver string that says, in
 * terms, that it is NOT a governance approval. `isPilotApproval()` lets any
 * caller detect it, and the authoritative sources (`../governed/sources.ts`)
 * contain none (test-enforced).
 *
 * Scope rules carried from the PRD:
 *  - No question asks the creator to judge legal adequacy, scope, validity,
 *    sufficiency, applicability or permission to use, and none asks about
 *    stock Editorial designation, release status, separate authorization or
 *    rights-and-clearance status (v0.3 §5.1 "Not asked, by design").
 *  - Existence questions (L3, M2, M3D, M4) are record-only: they attach to
 *    nothing governed (v0.3 §2.4, §2.5).
 *  - Location answers are recorded only; they never reach `jurisdiction`.
 *  - CR-V2-EVIDENCE-SLICE-1: tools (T1) and asset providers (M1, M3) are
 *    chosen from the canonical identity registries (`../identity/`), never
 *    from a publication ledger. Only a registered identity option attaches to
 *    an identity; "not listed" and "not sure" are record-only, and the name a
 *    creator types for an unlisted tool or service (T1X, M1X, M3X) is kept
 *    verbatim and attaches to nothing.
 */

import type { ObservationMapEntry, QuestionEntry, RegistryInput } from '../contract/question-registry'
import type { GovernanceApproval } from '../contract/types'
import {
  ASSET_PROVIDER_OPTION_CODES,
  ASSET_PROVIDER_OPTION_LABELS,
  CANONICAL_ASSET_PROVIDER_ID_LIST,
  CANONICAL_TOOL_ID_LIST,
  OTHER_PROVIDER,
  OTHER_TOOL,
  TOOL_OPTION_CODES,
  TOOL_OPTION_LABELS,
} from '../identity/selectable-identities'

export const PILOT_MARKER = 'PILOT-UAT'
export const PILOT_REGISTRY_VERSION = 'PILOT-UAT-REGISTRY-1'
export const PILOT_VALUE_MAPPING_VERSION = 'PILOT-UAT-MAP-1'

export const PILOT_APPROVAL: GovernanceApproval = Object.freeze({
  status: 'approved',
  approver: 'PILOT-UAT — internal prototype only, NOT a governance approval',
  decision_date: '2026-10-26',
  review_ref: 'PILOT-UAT CR-V2-VERTICAL-SLICE-1 (unapproved)',
}) as GovernanceApproval

export function isPilotApproval(a: GovernanceApproval | null | undefined): boolean {
  return !!a && typeof a.approver === 'string' && a.approver.startsWith(PILOT_MARKER)
}

/** How the questionnaire renders a question. Presentation metadata only; the contract never reads it. */
export type PilotInput = 'text' | 'textarea' | 'single' | 'multi' | 'select' | 'plan'

export interface PilotQuestionMeta {
  q_id: string
  section: 'project' | 'locations' | 'tools' | 'people' | 'materials' | 'contribution'
  input: PilotInput
  /** Required when shown. */
  required: boolean
  /** Answered once per declared tool (an answer `instance`). */
  per_tool: boolean
  text: string
  help: string | null
  option_labels: Readonly<Record<string, string>>
  /** For free-text questions: offer a "Not sure" choice that records `not_sure`. */
  allow_not_sure: boolean
}

const YES_NO = ['yes', 'no', 'not_sure']
const YES_NO_LABELS = { yes: 'Yes', no: 'No', not_sure: 'Not sure' }

const LOCATION_CODES = ['US', 'GB', 'NL', 'AE', 'SG', 'TW', 'EU', 'online_worldwide', 'other', 'not_sure']
const LOCATION_LABELS = {
  US: 'United States',
  GB: 'United Kingdom',
  NL: 'Netherlands',
  AE: 'United Arab Emirates',
  SG: 'Singapore',
  TW: 'Taiwan',
  EU: 'European Union (as a whole)',
  online_worldwide: 'Online, worldwide',
  other: 'Somewhere else',
  not_sure: 'Not sure',
}

const q = (over: Partial<QuestionEntry> & Pick<QuestionEntry, 'q_id'>): QuestionEntry => ({
  version: 1,
  question_kind: 'factual_value',
  wording_ref: `${PILOT_MARKER}-WORDING-${over.q_id}`,
  options: 'free_text',
  display_condition: { kind: 'always' },
  approval: PILOT_APPROVAL,
  ...over,
})

const o = (over: Partial<ObservationMapEntry> & Pick<ObservationMapEntry, 'o_id' | 'q_id' | 'target'>): ObservationMapEntry => ({
  version: 1,
  q_version: 1,
  applies_to: { kind: 'any_answer' },
  observation_kind: 'declared_value',
  value_mapping_version: PILOT_VALUE_MAPPING_VERSION,
  approval: PILOT_APPROVAL,
  ...over,
})

const showWhen = (q_id: string, any_of: string[]) => ({ kind: 'answer_includes' as const, q_id, any_of })

/** Question order is the questionnaire order. */
const QUESTIONS: QuestionEntry[] = [
  q({ q_id: 'P1' }),
  q({ q_id: 'P2', question_kind: 'description' }),
  q({ q_id: 'P3', options: ['own_channels', 'client_work', 'paid_advertising', 'festival_or_screening', 'other_use', 'not_sure'] }),
  q({ q_id: 'F1', options: LOCATION_CODES }),
  q({ q_id: 'F2', options: LOCATION_CODES }),
  q({ q_id: 'F3', options: LOCATION_CODES, display_condition: showWhen('P3', ['client_work', 'paid_advertising']) }),
  q({ q_id: 'T1', options: [...TOOL_OPTION_CODES] }),
  q({ q_id: 'T1X', display_condition: showWhen('T1', [OTHER_TOOL]) }),
  q({ q_id: 'T3' }),
  q({ q_id: 'T4' }),
  q({ q_id: 'L1', question_kind: 'factual_presence', options: YES_NO }),
  q({ q_id: 'L3', question_kind: 'document_existence', options: YES_NO, display_condition: showWhen('L1', ['yes']) }),
  q({ q_id: 'M0', question_kind: 'factual_presence', options: ['music', 'stock', 'brands', 'client_material', 'none', 'not_sure'] }),
  q({ q_id: 'M1', options: [...ASSET_PROVIDER_OPTION_CODES], display_condition: showWhen('M0', ['music']) }),
  q({ q_id: 'M1X', display_condition: { kind: 'all', conditions: [showWhen('M0', ['music']), showWhen('M1', [OTHER_PROVIDER])] } }),
  q({ q_id: 'M2', question_kind: 'document_existence', options: YES_NO, display_condition: showWhen('M0', ['music']) }),
  q({ q_id: 'M3', options: [...ASSET_PROVIDER_OPTION_CODES], display_condition: showWhen('M0', ['stock']) }),
  q({ q_id: 'M3X', display_condition: { kind: 'all', conditions: [showWhen('M0', ['stock']), showWhen('M3', [OTHER_PROVIDER])] } }),
  q({ q_id: 'M3D', question_kind: 'document_existence', options: YES_NO, display_condition: showWhen('M0', ['stock']) }),
  q({ q_id: 'M4', question_kind: 'document_existence', options: ['yes', 'some', 'no', 'not_sure'], display_condition: showWhen('M0', ['brands', 'client_material']) }),
  q({
    q_id: 'H1',
    question_kind: 'description',
    options: ['wrote_script', 'directed_shots', 'selected_outputs', 'edited', 'composited', 'original_assets', 'other_contribution', 'not_sure'],
  }),
  q({ q_id: 'H2', question_kind: 'description' }),
]

const OBSERVATION_MAP: ObservationMapEntry[] = [
  o({ o_id: 'PILOT-O-P3-ADS', q_id: 'P3', applies_to: { kind: 'option', value: 'paid_advertising' }, target: { kind: 'dependency', dependency_id: 'advertisement_purpose_confirmed' } }),
  o({ o_id: 'PILOT-O-F1', q_id: 'F1', target: { kind: 'location', role: 'creator_base' } }),
  o({ o_id: 'PILOT-O-F2', q_id: 'F2', target: { kind: 'location', role: 'distribution_market' } }),
  o({ o_id: 'PILOT-O-F3', q_id: 'F3', target: { kind: 'location', role: 'client_base' } }),
  // One entry per registered tool identity: only a canonical option attaches to an identity.
  ...CANONICAL_TOOL_ID_LIST.map((id) => o({ o_id: `PILOT-O-T1-${id}`, q_id: 'T1', applies_to: { kind: 'option', value: id }, target: { kind: 'tool_identity' } })),
  // Bound to the tool declared in the same tool block (answer instance).
  o({ o_id: 'PILOT-O-T3', q_id: 'T3', target: { kind: 'applicability_fact', fact: 'tool_plan_tier' } }),
  o({ o_id: 'PILOT-O-L1', q_id: 'L1', applies_to: { kind: 'option', value: 'yes' }, observation_kind: 'declared_presence', target: { kind: 'dependency', dependency_id: 'synthetic_performer_present_confirmed' } }),
  ...CANONICAL_ASSET_PROVIDER_ID_LIST.map((id) => o({ o_id: `PILOT-O-M1-PROVIDER-${id}`, q_id: 'M1', applies_to: { kind: 'option', value: id }, target: { kind: 'asset_provider_identity' } })),
  o({ o_id: 'PILOT-O-M1-DEP', q_id: 'M1', target: { kind: 'dependency', dependency_id: 'which_music_provider' } }),
  ...CANONICAL_ASSET_PROVIDER_ID_LIST.map((id) => o({ o_id: `PILOT-O-M3-PROVIDER-${id}`, q_id: 'M3', applies_to: { kind: 'option', value: id }, target: { kind: 'asset_provider_identity' } })),
  o({ o_id: 'PILOT-O-M3-DEP', q_id: 'M3', target: { kind: 'dependency', dependency_id: 'which_provider' } }),
  o({ o_id: 'PILOT-O-H1', q_id: 'H1', observation_kind: 'declared_description', target: { kind: 'dependency', dependency_id: 'human_contribution_description' } }),
]

/**
 * Dependencies a declaration may never target (legal determinations and the
 * stock dimensions that stay evidence-only, v0.3 §2.7). Passed to the loader
 * so a pilot mapping to any of them is rejected outright.
 */
export const PILOT_PROHIBITED_DEPENDENCY_TARGETS: readonly string[] = [
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

export const PILOT_REGISTRY_INPUT: RegistryInput = {
  questions: QUESTIONS,
  observation_map: OBSERVATION_MAP,
  prohibited_dependency_targets: PILOT_PROHIBITED_DEPENDENCY_TARGETS,
}

const meta = (m: Omit<PilotQuestionMeta, 'option_labels' | 'help' | 'allow_not_sure' | 'per_tool'> & Partial<PilotQuestionMeta>): PilotQuestionMeta => ({
  help: null,
  option_labels: {},
  allow_not_sure: false,
  per_tool: false,
  ...m,
})

/** PILOT wording (draft, unapproved, no counsel review). Keyed by q_id. */
export const PILOT_QUESTION_META: Readonly<Record<string, PilotQuestionMeta>> = {
  P1: meta({ q_id: 'P1', section: 'project', input: 'text', required: true, text: 'What is the title of the video?' }),
  P2: meta({ q_id: 'P2', section: 'project', input: 'textarea', required: false, text: 'Describe the video in a sentence or two (optional).' }),
  P3: meta({
    q_id: 'P3',
    section: 'project',
    input: 'multi',
    required: true,
    text: 'How do you intend to use the video? Select all that apply.',
    option_labels: {
      own_channels: 'On my own channels or portfolio',
      client_work: 'As work for a client',
      paid_advertising: 'In paid advertising',
      festival_or_screening: 'At a festival or screening',
      other_use: 'Something else',
      not_sure: 'Not sure yet',
    },
  }),
  F1: meta({ q_id: 'F1', section: 'locations', input: 'single', required: true, text: 'Where are you or your business based?', option_labels: LOCATION_LABELS }),
  F2: meta({ q_id: 'F2', section: 'locations', input: 'multi', required: true, text: 'Where do you expect the video to be published or shown? Select all that apply.', option_labels: LOCATION_LABELS }),
  F3: meta({ q_id: 'F3', section: 'locations', input: 'single', required: false, text: 'Where is the client or advertiser based?', option_labels: LOCATION_LABELS }),
  T1: meta({
    q_id: 'T1',
    section: 'tools',
    input: 'select',
    required: true,
    per_tool: true,
    text: 'Which AI tool did you use?',
    help: 'Choose it from the list. If it is not listed, choose “My tool isn’t listed” and type its name.',
    option_labels: TOOL_OPTION_LABELS,
  }),
  T1X: meta({ q_id: 'T1X', section: 'tools', input: 'text', required: true, per_tool: true, text: 'What is the tool called?', help: 'Type the name as it appears on the tool’s website.' }),
  T3: meta({
    q_id: 'T3',
    section: 'tools',
    input: 'plan',
    required: true,
    per_tool: true,
    allow_not_sure: true,
    text: 'Which plan were you on with this tool while you made the video?',
    help: 'The list shows only some plan names SI8 has guidance about, and may not include yours. If your plan is not listed, choose “Another plan” and type its name as the tool shows it.',
  }),
  T4: meta({ q_id: 'T4', section: 'tools', input: 'text', required: true, per_tool: true, allow_not_sure: true, text: 'When did you use this tool for the video?', help: 'Month and year, for example March–May 2026.' }),
  L1: meta({ q_id: 'L1', section: 'people', input: 'single', required: true, text: 'Does the video include the likeness or voice of a real person?', option_labels: YES_NO_LABELS }),
  L3: meta({ q_id: 'L3', section: 'people', input: 'single', required: false, text: 'Do you have a signed release or written consent from them?', option_labels: YES_NO_LABELS }),
  M0: meta({
    q_id: 'M0',
    section: 'materials',
    input: 'multi',
    required: true,
    text: 'Does the video include any of these? Select all that apply.',
    option_labels: {
      music: 'Music or sound you didn’t make with your AI tools',
      stock: 'Stock footage, images or other stock assets',
      brands: 'Brand names, logos, products or characters you don’t own',
      client_material: 'Material supplied by a client or someone else',
      none: 'None of these',
      not_sure: 'Not sure',
    },
  }),
  M1: meta({
    q_id: 'M1',
    section: 'materials',
    input: 'select',
    required: false,
    text: 'Where did the music come from?',
    help: 'Choose the music library or service you used. If it is not listed, choose “My service isn’t listed”.',
    option_labels: ASSET_PROVIDER_OPTION_LABELS,
  }),
  M1X: meta({ q_id: 'M1X', section: 'materials', input: 'text', required: true, text: 'What is the music service called?' }),
  M2: meta({ q_id: 'M2', section: 'materials', input: 'single', required: false, text: 'Do you have a licence or download receipt for the music?', option_labels: YES_NO_LABELS }),
  M3: meta({
    q_id: 'M3',
    section: 'materials',
    input: 'select',
    required: false,
    text: 'Which stock service did the stock material come from?',
    help: 'Choose the stock library you downloaded it from. If it is not listed, choose “My service isn’t listed”.',
    option_labels: ASSET_PROVIDER_OPTION_LABELS,
  }),
  M3X: meta({ q_id: 'M3X', section: 'materials', input: 'text', required: true, text: 'What is the stock service called?' }),
  M3D: meta({ q_id: 'M3D', section: 'materials', input: 'single', required: false, text: 'Do you have the licence, receipt or download history for the stock material?', option_labels: YES_NO_LABELS }),
  M4: meta({
    q_id: 'M4',
    section: 'materials',
    input: 'single',
    required: false,
    text: 'Do you have written permission or a licence from the owner of these brands, characters or materials?',
    option_labels: { yes: 'Yes', some: 'For some of them', no: 'No', not_sure: 'Not sure' },
  }),
  H1: meta({
    q_id: 'H1',
    section: 'contribution',
    input: 'multi',
    required: true,
    text: 'What did you contribute to the video yourself? Select all that apply.',
    option_labels: {
      wrote_script: 'Wrote the script or concept',
      directed_shots: 'Planned or directed the shots',
      selected_outputs: 'Chose between generated outputs',
      edited: 'Edited the video',
      composited: 'Combined or composited material',
      original_assets: 'Made original material used in it',
      other_contribution: 'Something else',
      not_sure: 'Not sure',
    },
  }),
  H2: meta({ q_id: 'H2', section: 'contribution', input: 'textarea', required: false, text: 'Anything else about your own contribution? (optional)' }),
}

/** Acknowledgements required before a draft is produced. PILOT wording, unapproved. */
export const PILOT_ACKNOWLEDGEMENTS = {
  A1: 'I confirm that what I have told SI8 is accurate to the best of my knowledge, and that I keep the original files I rely on.',
  A2: 'I understand that this record contains what I told SI8 and general guidance. It is not legal advice, not a commercial clearance decision, and not SI8’s human-reviewed Commercial Assurance Assessment.',
} as const

export const PILOT_MAX_TOOLS = 3
