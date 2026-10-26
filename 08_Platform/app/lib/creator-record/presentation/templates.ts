/**
 * CR-V2-VERTICAL-SLICE-1 — fixed, deterministic Creator Record draft templates.
 *
 * Every sentence the draft record shows that is not (a) the creator's own
 * answer, (b) an approved/pilot ledger explanation, label, evidence note or
 * caveat, or (c) a mechanical value (a name, a date, an id) comes from here.
 * Nothing is generated.
 *
 * PILOT wording: internal, unapproved, no counsel review (PRD v0.3 L-G6).
 *
 * Wording lock (PRD v0.3 §5.4), enforced by
 * __tests__/creator-record/draft-record-wording.test.ts over every rendered
 * draft: no "cleared/clearance" except in the fixed negations below, and never
 * compliant, certified, verified, approved (outside provenance), licensed to,
 * permitted to, safe to, "applies to you", "governed by" or "does not apply".
 * Dependency status words "met", "satisfied", "confirmed", "resolved" are never
 * used for a dependency row.
 */

import type { CreatorRecordConclusion } from '../contract/compose'

export const T = {
  record_title: 'Creator Record',
  status_draft: 'Draft — not issued',
  prototype_banner_title: 'Internal prototype — not a customer record',
  prototype_banner_lines: [
    'Questions, wording, guidance explanations and publication entries in this prototype are pilot drafts. None has been approved for Creator Records or reviewed by counsel.',
    'Nothing here has been saved, sent or charged. No files were uploaded and no AI model was called.',
  ],

  section_summary: 'Summary',
  section_declarations: 'What you told us',
  section_guidance: 'Commercial-use guidance',
  section_open_items: 'Open items and missing evidence',
  section_not_shown: 'Guidance not included',
  section_independent_review: 'Matters for independent review',
  section_not_done: 'What SI8 did not do',
  section_method: 'Method and versions',

  summary_intro: 'This record sets out what you told SI8 about this AI video, the general commercial-use guidance SI8 holds about the tools and materials you named, and what remains open.',
  summary_counts: (guidance: number, open: number) =>
    `${guidance} ${guidance === 1 ? 'piece' : 'pieces'} of guidance included; ${open} open ${open === 1 ? 'item' : 'items'}.`,
  summary_not_assessment: 'It records your own statements. SI8 has not checked them.',

  declarations_intro: 'These are your own answers, recorded as you gave them. SI8 has not checked them.',
  declaration_group: {
    project: 'Project',
    locations: 'Locations',
    tools: 'AI tools and plans',
    people: 'People',
    materials: 'Third-party materials',
    contribution: 'Your contribution',
  } as Record<string, string>,
  locations_note: 'Locations are recorded as you gave them. This record does not use them to decide which laws apply to the project.',
  tool_heading: (n: number) => `Tool ${n}`,
  tool_recognized: (name: string) => `Recognized as ${name}.`,
  tool_not_recognized: 'SI8 did not recognize this tool name, so no tool guidance is linked to it.',
  plan_used: 'Your plan answer was used to choose guidance, on what you told us.',
  plan_not_a_plan_name: 'SI8 holds no guidance that refers to this plan name, so it was not used to choose guidance.',
  plan_conflicting: 'You gave more than one plan for this tool, so none of them was used to choose guidance.',
  plan_not_sure: 'You were not sure of the plan, so it was not used to choose guidance.',
  not_answered: 'Not answered',
  existence_yes_not_provided: 'You told us you have one. It was not provided to SI8.',
  existence_no: 'You told us you do not have one.',
  existence_some: 'You told us you have this for some of them. Nothing was provided to SI8.',
  existence_not_sure: 'You were not sure.',

  guidance_intro: 'Each item below is general guidance SI8 holds about a tool or material you named. It describes the provider’s published terms; it is not a decision about this video.',
  guidance_none: 'SI8 has no guidance approved for Creator Records about the tools and materials you named yet.',
  conclusion_label: {
    relevant_on_declared_facts: 'Relevant to this project, on what you told us',
    relevant_applicability_unresolved: 'May be relevant — depends on information this record does not establish',
  } as Record<CreatorRecordConclusion, string>,
  basis_plan: (tool: string, plan: string) => `You told us you were on the “${plan}” plan with ${tool}. SI8 has not checked this.`,
  depends_plan_missing: (tool: string, plan: string) => `This guidance is about the ${tool} “${plan}” plan. You did not tell us which ${tool} plan you were on.`,
  depends_plan_not_named: (tool: string, plan: string, declared: string) => `This guidance is about the ${tool} “${plan}” plan. The plan name you gave (“${declared}”) is not one this guidance refers to.`,
  depends_plan_conflicting: (tool: string, plan: string) => `This guidance is about the ${tool} “${plan}” plan. You gave more than one plan for ${tool}.`,
  depends_account: (tool: string, value: string) => `This guidance is about a ${tool} account type (“${value}”). This record does not ask about account types.`,
  depends_other: 'This guidance depends on information this record does not collect.',
  depends_open_items: 'Open items listed below affect how this guidance relates to your project.',
  source_line: (lastReviewed: string) => `Source: provider terms as last reviewed by SI8 on ${lastReviewed}.`,
  subject_tool: (name: string) => `${name} (AI tool)`,
  subject_provider: (name: string) => `${name} (music or stock service)`,
  subject_general: 'General',

  open_items_intro: 'These are matters the guidance depends on that this record cannot settle. Each stays open: this record does not assess whether any document is sufficient.',
  open_none: 'No open items for the guidance included.',
  open_told_us_none: 'Not asked in this record.',
  open_documents_none: 'No document provided. File uploads are not available in this prototype.',
  open_evidence_default: 'This can only be shown with supporting documents.',
  open_sufficiency: 'Not assessed by this record.',
  open_status: 'Open',
  open_unlabelled: 'A matter SI8 has not yet described for Creator Records',
  existence_items_heading: 'Documents you mentioned',

  not_shown_intro: 'Some guidance SI8 holds was not included in this record.',
  not_shown_other_condition: (subject: string, detail: string) => `${subject}: not included, because on what you told us this guidance concerns ${detail}.`,
  not_shown_no_entry: (subject: string) => `${subject}: SI8 has no guidance approved for Creator Records about this yet.`,
  not_shown_more_no_entry: (subject: string) => `${subject}: other guidance SI8 holds about this has not been approved for Creator Records yet.`,
  not_shown_unrecognized: (declared: string) => `“${declared}”: SI8 did not recognize this name, so no guidance about it is included.`,
  not_shown_could_not_show: (subject: string) => `${subject}: some guidance could not be shown accurately for this record and was left out.`,
  not_shown_location: 'Guidance that depends on location is not included in this version of the record.',
  not_shown_none: 'Nothing was left out.',
  plan_detail: (tool: string, plan: string) => `a different ${tool} plan (“${plan}”)`,
  condition_detail: 'circumstances other than those you described',

  independent_review_intro: 'These questions need a person to review the actual documents and facts. SI8’s Commercial Assurance Assessment is a separate, human-reviewed service for this.',
  review_open_items: 'Whether the open items above are supported by documents.',
  review_likeness: 'The use of a real person’s likeness or voice, and any release or consent.',
  review_third_party: 'The use of brands, characters, logos or material supplied by others, and any permission for it.',
  review_laws: 'Which laws apply to this project. This record recorded your locations but did not decide that.',

  not_done: [
    'SI8 did not watch or review the video.',
    'SI8 did not check what you told us, or the status of any subscription, account, permission or document.',
    'SI8 did not decide which laws apply to the project.',
    'This record is not legal advice and is not a commercial clearance decision.',
    'This record is not SI8’s human-reviewed Commercial Assurance Assessment.',
  ],

  method_registry: 'Questionnaire version',
  method_ledger: 'Guidance publication entries',
  method_as_of: 'Guidance as of',
  method_record: 'Record',
  method_engine: 'Composition',
  method_engine_value: 'Creator Record guidance pipeline (deterministic; no AI model)',
} as const

/**
 * Fixed sentences that legitimately contain a banned stem only as a negation.
 * The wording-lock test removes exactly these strings before scanning.
 */
export const NEGATION_ALLOWLIST: readonly string[] = [
  'This record is not legal advice and is not a commercial clearance decision.',
  'I understand that this record contains what I told SI8 and general guidance. It is not legal advice, not a commercial clearance decision, and not SI8’s human-reviewed Commercial Assurance Assessment.',
]
