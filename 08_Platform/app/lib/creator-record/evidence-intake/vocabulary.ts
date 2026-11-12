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
 * Provisional limits (PM baseline, CR-V2-DOC-1). The per-file size matches the bucket and the 4.5 MB Vercel body limit.
 * Decision 8P (CR-V2-MVP-INTEGRATION-8P): uploads keep the deployed 4 MB limit. The live examination keeps its own, lower bound
 * (`LIVE_BOUNDS.max_document_bytes`, 1 MiB) and refuses a larger stored document before its read is logged, its bytes are fetched
 * or any model call or reservation is made (`document_exceeds_live_bounds`). The upload limit is never the AI-processing limit.
 */
export const EVIDENCE_MAX_BYTES = 4 * 1024 * 1024
/** The largest document a stored record may inventory: the bucket and table limit (4 MiB). Records made earlier keep verifying. */
export const EVIDENCE_STORED_MAX_BYTES = 4 * 1024 * 1024
export const EVIDENCE_MAX_PER_TOOL = 2
export const EVIDENCE_MAX_PER_RECORD = 12
export const EVIDENCE_MAX_FILE_NAME_CHARS = 120

/** Examination state recorded for every document in DOC-1: nothing is examined. */
export const EVIDENCE_EXAMINATION_NOT_EXAMINED = 'not_examined' as const

/**
 * CR-V2-ISSUER-DISPLAY-1 — document-reading fields never shown to a customer, in the pre-issuance review or the customer PDF.
 * `issuer_name`: a v2 reading reports the model's own judgement of who issued the document, which IA-4D and S3-PUBLIC showed it
 * cannot make reliably (a provider label or a letterhead is reported as the issuer), so no label could describe it accurately.
 * Display only: the stored reading, the record, its digests and every other reading are unchanged.
 */
export const CUSTOMER_SUPPRESSED_OBSERVATION_FIELDS: readonly string[] = Object.freeze(['issuer_name'])
