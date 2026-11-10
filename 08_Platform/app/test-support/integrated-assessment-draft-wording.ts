/**
 * CR-V2-MVP-INTEGRATION-3/-4 — the customer wording for the `integrated_assessment` PDF template block, as APPROVED by the founder
 * (2026-11-10, CR-V2-MVP-INTEGRATION-4). Test support only: no application code imports it. The governed copy is the block in the
 * schema 8 template set version 3 (`lib/creator-record/governed/sources.ts`); a test asserts the two are identical.
 *
 * Structure (6): the one full explanation is `intro`, printed once at the top of a guidance item's block; each condition row then
 * uses short, condition-specific lines; `not_compared` is the closing statement. `intro` and `not_compared` are the product
 * owner's own edits (2026-11-10).
 */
export const DRAFT_INTEGRATED_WORDING = {
  heading: 'How your documents relate to this guidance',
  // Product-owner wording (CR-V2-MVP-INTEGRATION-3/-4, 2026-11-10). Its four paragraphs are kept with blank lines (the PDF prints them).
  intro:
    'This section shows what you told us and what our automated examination found in documents linked to the AI tool you used.\n\n' +
    'Where document information is relevant to a condition in the guidance above, we explain why.\n\n' +
    'The automated examination does not independently confirm the information in your documents. Finding relevant information does not mean a condition has been satisfied. A document may still be useful even when this automated check cannot read information relevant to that condition.\n\n' +
    'The guidance above remains unchanged.',
  requirement: 'Condition',
  unlabelled_requirement: 'A condition this guidance depends on',
  you_told_us: 'What you told us',
  nothing_told: 'You did not give an answer for this.',
  standing: 'Current position',
  standing_labels: {
    rests_on_declaration: 'Based on your answer.',
    not_established: 'Not established in this record. The guidance above stays conditional on it.',
    open: 'Open.',
  },
  evidence_labels: {
    no_linked_document: 'You did not link a document to this tool, so this rests on your answer alone.',
    not_read_from_documents: 'SI8\'s automated examination does not read this from documents, so your documents were not used for it.',
    evidence_requirement_not_defined: 'SI8 has not set out what document could show this, so your documents were not used for it. It remains open.',
  },
  document: 'Document {n}',
  status_labels: {
    not_examined: 'Not examined, so nothing from it was used.',
    creator_disputed: 'You asked SI8 not to rely on this reading, so it has not been used.',
    cannot_establish: 'No usable information for this condition was found in this document.',
    leaves_uncertainty: 'What this document shows about this condition is unclear.',
    relevant_observation_unverified: 'Contains information relevant to this condition.',
  },
  reason: 'Detail',
  reason_labels: {
    not_examined: 'The document was not examined.',
    creator_response: 'Your response to this document\'s reading.',
    examination_failed: 'The automated examination could not read the document.',
    reading_not_recoverable: 'The stored reading could not be used exactly as recorded.',
    tool_link_not_established: 'This record does not show which of your tools the document relates to for this condition.',
    not_a_billing_document: 'The examination did not read it as a receipt or invoice.',
    document_illegible: 'The examination could not read it clearly.',
    field_not_shown: 'The examination did not find a plan name on it.',
    field_unreadable: 'The examination found a plan name but could not read it.',
    field_ambiguous: 'The examination could not tell which plan name it shows.',
    multiple_plans_shown: 'The examination found more than one plan name.',
    plan_text_incomplete: 'The plan name the examination found appears cut off.',
    field_present: 'The examination found a plan name, and this condition depends on which plan you were on.',
  },
  appears_to_show: 'Plan name read from the document',
  excerpt: 'Text it was read from',
  your_response: 'Your response',
  // Product-owner wording (CR-V2-MVP-INTEGRATION-4, 2026-11-10): the closing statement.
  not_compared: 'SI8 has not determined whether the information read from your documents matches what you told us. This section explains how the document observations relate to the conditions in the guidance above.',
  method: 'Integrated assessment method, version {version}.',
}
