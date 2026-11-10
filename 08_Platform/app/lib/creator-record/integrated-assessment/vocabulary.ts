/**
 * CR-V2-MVP-INTEGRATION-2 — the closed codes of the integrated assessment (`./assess.ts`). Data only, so the PDF template
 * contract can label them without loading the assessment.
 */

export const INTEGRATED_ASSESSMENT_METHOD = { id: 'si8/creator-record-v2-integrated-assessment', version: 1 } as const

/** What the requirement's standing is, copied from composition. Never changed here. */
export const REQUIREMENT_STANDINGS = ['rests_on_declaration', 'not_established', 'open'] as const
export type RequirementStanding = (typeof REQUIREMENT_STANDINGS)[number]

/** How documents bear on a requirement at all. */
export const REQUIREMENT_EVIDENCE = ['documents_considered', 'no_linked_document', 'not_read_from_documents', 'evidence_requirement_not_defined'] as const
export type RequirementEvidence = (typeof REQUIREMENT_EVIDENCE)[number]

/** For one linked document. Ordered by precedence: the first that applies wins. */
export const DOCUMENT_EVIDENCE_STATUSES = ['not_examined', 'creator_disputed', 'cannot_establish', 'leaves_uncertainty', 'relevant_observation_unverified'] as const
export type DocumentEvidenceStatus = (typeof DOCUMENT_EVIDENCE_STATUSES)[number]

export const DOCUMENT_EVIDENCE_REASONS = [
  'not_examined',
  'creator_response',
  'examination_failed', 'reading_not_recoverable', 'tool_link_not_established', 'not_a_billing_document', 'document_illegible', 'field_not_shown', 'field_unreadable',
  'field_ambiguous', 'multiple_plans_shown', 'plan_text_incomplete',
  'field_present',
] as const
export type DocumentEvidenceReason = (typeof DOCUMENT_EVIDENCE_REASONS)[number]

