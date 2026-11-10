/**
 * CR-V2-MVP-INTEGRATION-3 — PROPOSED customer wording for the `integrated_assessment` PDF template block.
 *
 * DRAFT FOR PRODUCT-OWNER APPROVAL. NOT APPROVED. Test support only: no application code imports it, and no shipped template set
 * carries the block, so nothing a customer sees changes. Activation = approving this wording into a new template set version.
 *
 * Structure (6): the one full explanation is `intro`, printed once at the top of a guidance item's block; each condition row then
 * uses short, condition-specific lines; `not_compared` is a one-line closing reminder.
 */
export const DRAFT_INTEGRATED_WORDING = {
  heading: 'How your documents relate to this guidance',
  intro:
    'Each condition this guidance depends on is shown below with what you told us and what SI8\'s automated examination read on the documents you linked to that tool. An automated reading is not an independent check: SI8 has not confirmed what any document says. A document that contains relevant information does not show that a condition is satisfied, and a document with no usable information for a condition may still be relevant to it. Nothing here changes the guidance above.',
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
  not_compared: 'SI8 has not compared what your documents show with your answers.',
  method: 'Integrated assessment method, version {version}',
}
