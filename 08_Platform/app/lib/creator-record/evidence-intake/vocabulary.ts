/**
 * CR-V2-DOC-1 — closed vocabularies for Creator Record v2 evidence intake. Pure (no Node API), so the
 * record builder and the PDF template contract can share them.
 *
 * A category is the creator's own DESCRIPTION of what a document is. It is never a verified fact: it
 * resolves no dependency, establishes no permission and is never read by retrieval, applicability or
 * Bounded Interpretation. A "release or consent" document does not touch `release_status_confirmed`, which
 * stays evidence-only.
 */

export const EVIDENCE_MEDIA_TYPES = ['application/pdf', 'image/png', 'image/jpeg'] as const
export type EvidenceMediaType = (typeof EVIDENCE_MEDIA_TYPES)[number]

export const EVIDENCE_CATEGORIES = ['billing_receipt', 'licence', 'provider_terms', 'release_or_consent', 'permission', 'project_file', 'other'] as const
export type EvidenceCategory = (typeof EVIDENCE_CATEGORIES)[number]

/**
 * Provisional limits (PM baseline, CR-V2-DOC-1).
 * CR-V2-MVP-M2A: a new upload is at most 1 MiB, the most a live examination reads (`LIVE_BOUNDS.max_document_bytes`, test-checked),
 * so nothing is accepted that could not be examined. Documents stored earlier, up to the bucket's 4 MiB, stay valid in their records.
 */
export const EVIDENCE_MAX_BYTES = 1024 * 1024
/** The largest document a stored record may inventory: the bucket and table limit (4 MiB). Records made earlier keep verifying. */
export const EVIDENCE_STORED_MAX_BYTES = 4 * 1024 * 1024
export const EVIDENCE_MAX_PER_TOOL = 2
export const EVIDENCE_MAX_PER_RECORD = 12
export const EVIDENCE_MAX_FILE_NAME_CHARS = 120

/** Examination state recorded for every document in DOC-1: nothing is examined. */
export const EVIDENCE_EXAMINATION_NOT_EXAMINED = 'not_examined' as const
