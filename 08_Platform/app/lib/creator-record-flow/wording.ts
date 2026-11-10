/**
 * CR-V2-MVP-M3 — Creator Record v2 customer wording for checkout, the ready email and the dashboard.
 *
 * DRAFT — PENDING M0 WORDING APPROVAL. Not approved customer wording. Every string a v2 customer sees
 * outside the questionnaire and the PDF is here, so the M0 review can replace it in one place.
 *
 * Rules (test-enforced, `__tests__/creator-record-flow/v2-wording.test.ts`): self-declared and
 * educational; never legal advice, clearance, certification, verification, approval or a human review;
 * never a review date; never "safe to use".
 */

export const V2_WORDING_STATUS = 'DRAFT — pending M0 wording approval' as const

export const V2_CHECKOUT_COPY = {
  name: 'SI8 Creator Record',
  description: 'A private PDF of what you told SI8 about your AI video, what any documents you added appear to show, and educational guidance. Not legal advice, not a clearance and not a human-reviewed SI8 assessment.',
} as const

export const V2_READY_EMAIL = {
  subject: 'Your Creator Record is ready',
  intro: 'Your Creator Record PDF is ready to download from your dashboard.',
  nature: 'It records what you told SI8 about your video, what any documents you added appear to show, and educational guidance where SI8 has published it. No person at SI8 checked your answers, your video or your documents.',
  limits: 'It is not legal advice, not a clearance and not SI8’s human-reviewed Commercial Assurance Assessment.',
  cta: 'Download your Creator Record',
  // CR-V2-APPROVAL-AUTHORITY-FIX-1: the greeting and sign-off, previously typed into the email builder.
  greeting: 'Hi {name},',
  sign_off: 'Best,',
  signature: 'The SI8 Team',
} as const

export const V2_DASHBOARD = {
  heading: 'Creator Record',
  awaiting_payment: 'You confirmed your declarations. Complete payment to receive your Creator Record.',
  preparing: 'Payment received. Your Creator Record PDF is being prepared. If it is not ready soon, email jd@superimmersive8.com. Your payment is recorded and you will not be charged again.',
  // CR-V2-MVP-LAUNCH-FOUNDATION-1: a paid order waiting for a person (any reason), and a record paused by withdrawn AI permission.
  support_required: 'SI8 needs to look at this Creator Record before it can be completed, and will contact you. Your payment is recorded and you will not be charged again. You can also email jd@superimmersive8.com.',
  paused: 'This record is paused because you withdrew permission for AI examination of a document it uses. It cannot be paid for or completed as it is. Email jd@superimmersive8.com to discuss your options.',
  badge_support_required: 'NEEDS ATTENTION',
  badge_paused: 'PAUSED',
  ready: 'Your Creator Record PDF is ready.',
  unavailable: 'The status of your Creator Record cannot be shown right now. Please try again later.',
  download: 'Download Creator Record PDF',
  nature: 'A record of what you told SI8, what any documents you added appear to show, and educational guidance. Not legal advice, not a clearance and not a human-reviewed SI8 assessment.',
  badge_awaiting_payment: 'AWAITING PAYMENT',
  badge_preparing: 'BEING PREPARED',
  badge_ready: 'READY',
  refunded: 'This purchase was refunded.',
  // CR-V2-APPROVAL-AUTHORITY-FIX-1: dashboard chrome, previously typed into the pages.
  entry_label: 'Creator Record',
  back: 'Back to Dashboard',
  started: 'Started {date}',
} as const

/** CR-V2-MVP-LAUNCH-FOUNDATION-1: the dashboard control for withdrawing AI-examination permission (Decision 8Q / 8N). */
export const V2_CONSENT = {
  title: 'AI examination permission',
  active: 'You can withdraw permission for AI examination of the documents you have added. After you withdraw, no AI model reads those documents again, and records that use them are paused. Withdrawing does not delete your documents. You can ask for deletion separately by emailing jd@superimmersive8.com.',
  withdraw: 'Withdraw AI examination permission',
  confirm_prompt: 'Withdraw now? This cannot be undone for the documents you have already added.',
  confirm: 'Yes, withdraw',
  cancel: 'Keep permission',
  working: 'Withdrawing…',
  withdrawn: 'You withdrew permission for AI examination. No AI model reads the documents you added before then, and records that use them are paused. Email jd@superimmersive8.com about any paid order.',
  withdrawn_on: 'Withdrawn on',
  // CR-V2-MVP-LAUNCH-FOUNDATION-1-CORRECTIONS-1: the outcome of a failed or timed-out request is not known, so it is never stated.
  failed: 'SI8 could not confirm whether your withdrawal was recorded. You can try again: withdrawing more than once has the same effect as withdrawing once. If this keeps happening, email jd@superimmersive8.com.',
  signed_out: 'You are signed out, so your withdrawal was not recorded. Sign in again, then withdraw.',
  // Shown when the current state cannot be read: the withdrawal stays available (the request is idempotent).
  unknown: 'Your AI examination permission status cannot be shown right now. You can still withdraw permission here; if you have already withdrawn, withdrawing again changes nothing. You can also email jd@superimmersive8.com.',
  // Support only: no online withdrawal is offered or promised.
  unavailable: 'Withdrawing AI examination permission is not available online yet. To withdraw, email jd@superimmersive8.com.',
  unconfirmed: 'Your AI examination permission status cannot be shown right now. To withdraw, email jd@superimmersive8.com, or try again later.',
} as const

export const V2_REVIEW_PAGE = {
  pay: 'Continue to payment',
  paying: 'Opening payment…',
  payment_closed: 'You confirmed these declarations. This version is now fixed. Payment is not open yet.',
  confirmed: 'You confirmed these declarations. This version is now fixed.',
  // CR-V2-SCHEMA8-PATH-1 (E2/E3): the review page's own strings, held here so the M0 review covers them. DRAFT.
  not_purchasable: 'This version cannot be paid for right now. Your answers are kept. If this does not change, email jd@superimmersive8.com.',
  heading: 'Check your declarations',
  intro: 'This is exactly what SI8 recorded from your answers (version {version}). No person at SI8 has checked them. If anything is wrong, correct your answers; the corrected version is then the one you check.',
  answers_heading: 'Your answers',
  tool_heading: 'Tool {n}',
  acknowledgements_heading: 'What you acknowledged',
  correct: 'Correct my answers',
  confirm: 'Confirm these declarations',
  confirming: 'Confirming…',
  failed: 'Something went wrong. Please try again. If this keeps happening, email jd@superimmersive8.com.',
} as const

// ── CR-V2-MVP-PROD-PREP-1: wording that used to live inside server modules and components. Moved here, text unchanged, so that every
// customer string belongs to the customer wording set (`./customer-wording`) that the Source Text Approval names. DRAFT. ──

/** Customer flow API messages (`./http`). */
export const FLOW_MESSAGES = {
  unauthorized: 'Unauthorized',
  internal_error: 'Something went wrong. Nothing was changed.',
  invalid_request: 'The request could not be read.',
  invalid_documents: 'One or more documents could not be used. Check your documents and try again.',
  invalid_responses: 'One or more responses could not be recorded. Nothing was changed.',
  examination_unavailable: 'What the documents appear to show could not be included right now. Nothing was changed.',
  invalid_answers: 'Some answers need attention.',
  not_invited: 'Creator Record is currently available by invitation only.',
  not_found: 'Not found.',
  superseded: 'A newer version of these answers exists. Review the latest version.',
  conflict: 'This version changed while you were reviewing it. Reload and try again.',
  questionnaire_changed: 'The questionnaire has changed since this page was loaded. Nothing was recorded.',
  integrity_failure: 'This record could not be processed. Nothing was changed.',
  submissions_stopped: 'Creator Record is not taking new submissions right now.',
  unavailable: 'Creator Record is not available yet.',
} as const

/** Purchase refusals (`./http` `purchaseMessage`). */
export const PURCHASE_MESSAGES = {
  not_invited: FLOW_MESSAGES.not_invited,
  not_found: FLOW_MESSAGES.not_found,
  not_reviewed: 'Confirm your declarations before payment.',
  superseded: FLOW_MESSAGES.superseded,
  ineligible: 'This Creator Record cannot be completed at the moment.',
  integrity_failure: 'This record could not be verified. Nothing was changed.',
  submissions_stopped: FLOW_MESSAGES.submissions_stopped,
  issuance_stopped: 'Creator Record payments are not open yet.',
  evidence_unavailable: 'A document in this record is no longer available. Nothing was charged.',
  unavailable: 'Creator Record is not available right now.',
} as const

/** Document upload and storage refusals (`./evidence-http`). */
export const EVIDENCE_MESSAGES = {
  invalid_request: 'The request could not be read.',
  consent_required: 'Please agree to the document storage notice before adding documents.',
  empty_file: 'The file is empty.',
  file_too_large: 'The file is larger than 4 MB.',
  unsupported_format: 'Only PDF, PNG and JPEG files can be added.',
  pdf_malformed: 'This PDF could not be read.',
  pdf_encrypted: 'Password-protected or encrypted PDFs cannot be added.',
  pdf_active_content: 'This PDF contains scripts, attachments or interactive content and cannot be added.',
  image_header_invalid: 'This image could not be read.',
  image_too_large: 'This image is too large.',
  not_invited: 'Creator Record is currently available by invitation only.',
  synthetic_documents_only: 'Documents cannot be added yet.',
  not_found: 'Not found.',
  upload_in_progress: 'This file is still being added. Try again in a moment.',
  too_many_documents: 'You have reached the maximum number of documents.',
  document_retained: 'This document is part of a prepared record and is kept.',
  consent_outdated: 'You added this file earlier under a previous version of SI8’s storage notice, privacy notice or terms, so it cannot be reused under the current ones. Email jd@superimmersive8.com for help.',
  object_missing: 'This document is no longer available.',
  integrity_failure: 'This document could not be processed. Nothing was changed.',
  storage_failed: 'The document could not be stored. Nothing was kept.',
  submissions_stopped: 'Creator Record is not taking new submissions right now.',
  audit_unavailable: 'This document cannot be opened right now.',
} as const

/** Document examination refusals (`./examination-customer`). */
export const EXAMINATION_MESSAGES = {
  invalid_request: 'The request could not be read.',
  submissions_stopped: 'Creator Record is not taking new submissions right now.',
  not_invited: 'Creator Record is currently available by invitation only.',
  not_found: 'Not found.',
  not_ready: 'This document is still being added. Try again in a moment.',
  not_examinable: 'This document cannot be read.',
  examination_not_permitted: 'AI reading is not available for this document.',
  examination_limit_reached: 'AI reading has reached its limit for now. Please try again later.',
  unavailable: 'AI reading is not available right now.',
  ai_permission_required: 'Before a document is read, confirm that SI8 may send it to an AI model provider to be read.',
} as const

/** Questionnaire chrome (`components/creator-record/CreatorRecordQuestionnaire.tsx`). Section titles are in the questionnaire contract. */
export const QUESTIONNAIRE_CHROME = {
  issues: {
    required: 'Please answer this question.',
    invalid_option: 'Please choose one of the options.',
    too_long: 'Please shorten this answer.',
    single_choice_only: 'Please choose one option.',
    too_many_tools: 'Too many tools.',
    no_tools: 'Please add at least one tool.',
    acknowledgement_required: 'Please confirm this statement.',
    unknown_question: 'Unexpected answer.',
    exclusive_option_conflict: 'This choice cannot be combined with your other choices.',
  },
  issues_heading: 'Some answers need attention ({count})',
  error_prefix: 'Error: ',
  issue_tools_label: 'AI tools',
  tool_heading: 'Tool {n}',
  tool_prefix: 'Tool {n}: ',
  plan_name_label: 'Tool {n}: plan name',
  required: '(required)',
  optional: '(optional)',
  form_label: 'Creator Record questionnaire',
  choose: 'Choose…',
  another_plan: 'Another plan (type its name)',
  not_sure: 'Not sure',
  add_tool: 'Add another tool',
  documents_heading: 'Before you add a document',
  acknowledgements_heading: 'Before you continue',
  remove_tool: 'Remove tool {n}',
  synthetic_consent: 'I will add only synthetic test documents. I understand that a file I add is read on SI8’s server to describe what it appears to show, and is then discarded.',
  synthetic_reading_on: ' Automated reading is turned on: the file is sent to an AI model provider to be read.',
  synthetic_reading_off: ' Automated reading is turned off: only SI8’s own synthetic test documents can be described, from recorded test data, and no AI model is used.',
  submit: 'Prepare draft record',
  submitting: 'Preparing draft…',
} as const

/** Document and examination panels (`components/creator-record/{DocumentReviewPanel,EvidencePanel,ExaminationReview}.tsx`). */
export const PANEL_TEXT = {
  failed: 'Something went wrong. Nothing was changed.',
  no_document: 'No document',
  reading: 'Reading the document. This can take a few seconds.',
  loading_documents: 'Loading documents…',
  not_in_version: 'Not in this version',
  document_fallback: 'Document',
  table_detail: 'Detail',
  table_appears: 'Appears to show',
  table_respond: 'Respond',
  comparison_provider: 'Provider',
  comparison_plan: 'Plan',
  comparison_declared: '{field}: you declared {declared} — ',
  comparison_declared_nothing: 'nothing',
  guidance_reference: 'Reference: {claim_id}',
  billing_document_label: 'Tool {n}: billing document (optional)',
  read_document: 'Read document for Tool {n}',
  reading_document: 'Reading document for Tool {n}…',
  appears_heading: 'Tool {n}: what this document appears to show',
  remove_document: 'Remove document for Tool {n}',
  choose_document: 'Choose a document',
  your_response: 'Your response',
  recorded_response: 'Your response (version {version}): {label}',
  comparison_heading: 'Tool {n} — {file}',
  billing_document_help: 'A receipt, invoice or billing screenshot for this tool. PDF, PNG or JPEG, up to 4 MB. Synthetic test documents only.',
  billing_document_enable: ' Tick the statement under “Before you add a document” to enable this.',
  legal_links_and: ' and ',
  kind: 'Kind',
  comparison_summary: 'Provider: {provider}. Plan: {plan}.',
} as const

/** The customer page title (`app/creator-record/page.tsx`). */
export const PAGE_TEXT = {
  title: 'Creator Record',
  intro: 'Tell us about your video and how you made it. You will check your declarations before anything is completed. SI8 does not check your answers.',
} as const

/** Fills `{name}` slots in a review-page string (display only). */
export function fillReviewText(text: string, values: Readonly<Record<string, string | number>>): string {
  return text.replace(/\{([a-z_]+)\}/g, (m, k: string) => (Object.prototype.hasOwnProperty.call(values, k) ? String(values[k]) : m))
}
