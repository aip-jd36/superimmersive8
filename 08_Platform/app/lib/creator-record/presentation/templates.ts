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
 *
 * Document wording (CR-V2-EVIDENCE-SLICE-1, enforced by
 * __tests__/creator-record/evidence-draft.test.ts): a document is only ever
 * described by what it "appears to show". Never match, consistent, confirm,
 * contradict, prove, verify, authentic or valid; never a comparison with the
 * creator's answers.
 */

import type { CreatorRecordConclusion } from '../contract/compose'

export const T = {
  record_title: 'Creator Record',
  status_draft: 'Draft — not issued',
  prototype_banner_title: 'Internal prototype — not a customer record',
  /** Shown on the questionnaire page, before any draft exists. */
  prototype_banner_lines: [
    'Questions, wording, guidance explanations and publication entries in this prototype are pilot drafts. None has been approved for Creator Records or reviewed by counsel.',
    'Nothing here is saved, sent or charged. If you add a document, use only synthetic test documents.',
  ],
  /** Record banner: first line is fixed; the second depends on what happened for this draft. */
  record_banner_pilot: 'Questions, wording, guidance explanations and publication entries in this prototype are pilot drafts. None has been approved for Creator Records or reviewed by counsel.',
  record_banner_no_files: 'Nothing here has been saved, sent or charged. No files were uploaded and no AI model was called.',
  record_banner_files_replay:
    'Nothing here has been saved, sent or charged. Files you added were read on SI8’s server and then discarded; nothing was stored. No AI model was called: documents were described from recorded test data (fixture replay).',
  /** CR-V2-WORK-UAT-HARNESS-2: the public UAT designation, on every public result. */
  public_uat_designation: 'PUBLIC UAT — SYNTHETIC TEST DATA — NOT AN ISSUED CREATOR RECORD',
  public_uat_record_title: 'Creator Record — PUBLIC UAT — SYNTHETIC TEST DATA — NOT AN ISSUED CREATOR RECORD',
  public_uat_status: 'UAT draft — synthetic test data — not issued',
  public_uat_summary_designation: 'PUBLIC UAT — SYNTHETIC TEST DATA — NOT AN ISSUED CREATOR RECORD. This is a test run of a prototype, prepared from test answers and SI8’s synthetic test documents. It cannot be relied on for any purpose.',
  public_uat_summary_unapproved: 'All guidance shown is pilot wording that has not been approved for Creator Records and has not been reviewed by counsel.',
  public_uat_banner_lines: [
    'All guidance and wording in this harness are unapproved pilot drafts. None has been approved for Creator Records or reviewed by counsel.',
    'Nothing here is saved, sent or charged. No file can be uploaded: documents are chosen from SI8’s synthetic test set and described from recorded test data. No AI model is called.',
  ],
  public_uat_page_intro: 'A public test harness for the Creator Record prototype. Use test answers only and do not enter real personal or customer information.',
  public_uat_doc_origin_label: 'Where it came from',
  public_uat_doc_origin: 'Chosen from SI8’s synthetic test set. No file was uploaded.',
  public_uat_not_done: 'This is a public test run on synthetic test data. It is not an issued Creator Record and cannot be relied on.',
  public_uat_method_registry: 'Pilot questionnaire (internal draft, unapproved)',
  public_uat_method_ledger: 'Pilot guidance entries (internal drafts, unapproved)',
  public_uat_method_run: 'Run',
  public_uat_method_run_value: 'Public UAT harness (synthetic test data; not an issued record)',
  public_uat_prepared: 'UAT draft prepared — synthetic test data — not an issued Creator Record',
  public_uat_documents_choose: 'Choose a synthetic test document (optional)',
  public_uat_documents_note: 'These are SI8’s own synthetic test documents. Nothing is uploaded.',
  public_uat_closed: 'This test harness is not available.',

  record_banner_files_live:
    'Nothing here has been saved, sent or charged. Files you added were read by an AI model and then discarded; nothing was stored. The guidance in this record was composed without an AI model.',

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
  plan_adopted_note: 'You chose this after reviewing a document you added. It is still your own statement; SI8 has not checked it.',
  tool_not_listed: 'You told us the tool is not in SI8’s list.',
  tool_unsure: 'You were not sure which tool, so no tool guidance is linked to it.',
  provider_not_listed: 'You told us the service is not in SI8’s list.',
  provider_not_recognized: 'SI8 did not recognize this service name, so no guidance about it is linked to it.',
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
  open_documents_none: 'No document for this was provided. This prototype accepts billing documents for AI tools only.',
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

  section_documents: 'Documents you added',
  documents_intro:
    'Each file you added is described only by what it appears to show. SI8 did not check whether any document is genuine, complete or current, and did not compare any document with your answers. Only your own answers were used to choose guidance.',
  documents_none: 'You did not add any documents.',
  doc_heading: (tool: number, name: string) => `Document for Tool ${tool}: ${name}`,
  doc_fingerprint_label: 'Fingerprint (SHA-256)',
  doc_fingerprint_note: 'The fingerprint identifies the exact file SI8 received; it does not show that the document is genuine, who created it, or when.',
  doc_read_label: 'How it was read',
  doc_read_replay: 'From recorded test data for one of SI8’s synthetic test documents (fixture replay). No AI model read this file, and this shows nothing about how well real documents are read.',
  doc_read_live: (calls: number) => `Read by an AI model (${calls} ${calls === 1 ? 'request' : 'requests'}). What it reports can be wrong or incomplete.`,
  doc_not_read: {
    unsupported_format: 'This file was not read: only PDF, PNG and JPEG files are accepted.',
    file_too_large: 'This file was not read: it is larger than the size limit.',
    empty_file: 'This file was not read: it is empty.',
    model_error: 'This file could not be read reliably, so nothing it shows is recorded.',
    structured_output_missing: 'This file could not be read reliably, so nothing it shows is recorded.',
    schema_invalid: 'This file could not be read reliably, so nothing it shows is recorded.',
    no_replay_fixture: 'This file was received but not read. While automated reading is turned off, this prototype can describe only SI8’s synthetic test documents.',
  } as Record<string, string>,
  doc_type_label: 'It appears to be',
  doc_type: {
    receipt: 'A receipt',
    invoice: 'An invoice',
    subscription_confirmation: 'A subscription email or notice',
    billing_screenshot: 'A screenshot of a billing page',
    not_a_billing_document: 'Not a billing document',
    unknown: 'Could not be determined',
  } as Record<string, string>,
  doc_readability_label: 'Readability',
  doc_readability: { legible: 'Readable', partially_legible: 'Partly readable', illegible: 'Not readable' } as Record<string, string>,
  doc_field_label: {
    issuer_name: 'Seller shown',
    product_or_plan_name: 'Plan or product shown',
    transaction_date: 'Payment or document date shown',
    service_period_start: 'Service period start shown',
    service_period_end: 'Service period end shown',
  } as Record<string, string>,
  doc_field_present: (value: string) => `Appears to show “${value}”`,
  doc_field_excerpt: (excerpt: string) => `Text on the document: “${excerpt}”`,
  doc_field_status: {
    not_shown: 'Not shown on the document',
    unreadable: 'Could not be read',
    ambiguous: 'Could not be determined (more than one reading is possible)',
  } as Record<string, string>,
  doc_issuer_note: 'The seller shown is not used to identify the tool. The tool is the one you chose.',
  doc_plan_names_label: 'Plan names printed on it',
  doc_plan_names_none: 'None printed',
  doc_multiple_plans: 'It appears to show more than one plan, so no single plan can be taken from it.',
  doc_instruction_text: 'It contains text addressed to an automated reader. That text was treated as part of the document and changed nothing.',
  doc_review_label: 'Your choice',
  doc_review: {
    adopted: (value: string) => `You chose to use “${value}”, which the document appears to show, as your plan answer. That answer is still your own statement.`,
    entered_different: 'You chose to give your own plan answer instead.',
    ignored: 'You chose to ignore what this document appears to show.',
    not_reviewed: 'You did not make a choice about this document.',
  },
  doc_not_compared: 'SI8 did not compare this document with your answers.',
  not_done_documents: 'SI8 did not check whether any document you added is genuine, complete or current, or compare it with your answers.',
  method_documents: 'Document reading',
  method_documents_replay: (schema: string, replaySet: string) => `Fixture replay of recorded test data (${schema}; ${replaySet}); no AI model`,
  method_documents_live: (schema: string, prompt: string) => `AI model reading (${schema}; ${prompt})`,

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
