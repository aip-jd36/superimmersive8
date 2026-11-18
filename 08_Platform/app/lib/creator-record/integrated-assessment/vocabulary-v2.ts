/**
 * CR-DOC-READER-EXT-1 (C) — closed codes of integrated assessment method v2 (`./assess-v2.ts`). A SEPARATE vocabulary: v1's codes
 * (`./vocabulary.ts`) are labelled exactly by the approved v3 template set and must not change.
 */
export const INTEGRATED_ASSESSMENT_METHOD_V2 = { id: 'si8/creator-record-v2-integrated-assessment', version: 2 } as const

/** Ordered by precedence. There is no status meaning "satisfied", "sufficient" or "matches". */
export const DEPENDENCY_DOCUMENT_STATUSES = ['not_examined', 'creator_disputed', 'cannot_establish', 'leaves_uncertainty', 'relevant_observation_unverified'] as const
export type DependencyDocumentStatus = (typeof DEPENDENCY_DOCUMENT_STATUSES)[number]

export const DEPENDENCY_DOCUMENT_REASONS = [
  'not_examined',
  'creator_response',
  'linked_to_tool', 'examination_failed', 'profile_mismatch', 'association_ambiguous', 'not_a_licence_or_permission', 'document_illegible', 'field_not_shown', 'field_unreadable',
  'field_ambiguous', 'multiple_values_shown',
  'field_present',
] as const
export type DependencyDocumentReason = (typeof DEPENDENCY_DOCUMENT_REASONS)[number]
