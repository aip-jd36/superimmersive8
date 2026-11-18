/**
 * CR-DOC-READER-EXT-1 (D) — DRAFT wording candidate for printing integrated assessment method v2 in a future PDF template set.
 * STATUS: DRAFT — NOT APPROVED, NOT REGISTERED. Not part of any template set; no renderer reads it.
 *
 * Why only a candidate: the approved template contract (`../customer-pdf/templates.ts`) labels exactly method v1's codes, and the
 * reading layout refuses an integrated block (CR-PDF-DECISION-1 guard). Printing v2 needs a new template contract version, a
 * renderer change and a deliberate, founder-approved relaxation of that guard for the new set only — a separate, approval-gated
 * step. Existing template sets and issued PDFs are unaffected.
 *
 * Every string must pass the existing customer wording lock and still needs human content approval and counsel review.
 */
import { DEPENDENCY_DOCUMENT_REASONS, DEPENDENCY_DOCUMENT_STATUSES, type DependencyDocumentReason, type DependencyDocumentStatus } from './vocabulary-v2'

export const V2_WORDING_CANDIDATE_STATUS = 'DRAFT — NOT APPROVED, NOT REGISTERED' as const

export const V2_WORDING_CANDIDATE = Object.freeze({
  heading: 'How your documents relate to this consideration',
  intro: 'The documents you added were read automatically, as described above. What follows is how a reading may relate to a point in the guidance. No person at SI8 checked it, and it was not compared with your answers.',
  association: 'This document is listed here because of the document type you chose for it. SI8 did not check that it comes from this service, concerns your material or relates to this video.',
  open_dependency: 'This point remains open. A document reading does not settle it, and does not show that you hold the rights or permission you need.',
  no_document: 'You did not add a document of this type.',
  not_read: 'Documents are not read for this point.',
  observed: 'The document appears to show: “{value}”.',
  status_labels: Object.freeze({
    not_examined: 'Not read',
    creator_disputed: 'You told us this reading is wrong or not relevant',
    cannot_establish: 'Could not be used for this point',
    leaves_uncertainty: 'Unclear',
    relevant_observation_unverified: 'May be relevant (automated reading, not checked)',
  } satisfies Record<DependencyDocumentStatus, string>),
  reason_labels: Object.freeze({
    not_examined: 'The document was not read.',
    creator_response: 'Your response takes precedence over the reading.',
    linked_to_tool: 'You linked this document to an AI tool, not to this material.',
    examination_failed: 'The document could not be read.',
    profile_mismatch: 'The document was read as a different document type from the one now chosen.',
    association_ambiguous: 'Your answers name more than one possible source for this document, so it could not be linked to this point.',
    not_a_licence_or_permission: 'The reading did not identify a licence or permission.',
    document_illegible: 'The document could not be read clearly.',
    field_not_shown: 'The document does not appear to show this.',
    field_unreadable: 'This part of the document could not be read.',
    field_ambiguous: 'The document is unclear on this point.',
    multiple_values_shown: 'The document appears to show more than one value.',
    field_present: 'The document appears to show something relevant to this point.',
  } satisfies Record<DependencyDocumentReason, string>),
})

export const V2_WORDING_CODES = { statuses: DEPENDENCY_DOCUMENT_STATUSES, reasons: DEPENDENCY_DOCUMENT_REASONS } as const
