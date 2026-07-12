/**
 * SI8 Assessment Service v1.0 — Domain Types
 *
 * The Assessment is the primary object. Everything else (PDF, C2PA manifest,
 * Verification Page) is a derived representation.
 *
 * These types mirror the assessments table schema. Keep in sync with:
 *   supabase/migrations/20260712000000_create_assessments_table.sql
 */

// ── Outcome ───────────────────────────────────────────────────────────────────

export const ASSESSMENT_OUTCOMES = [
  'EVIDENCE_SUPPORTS',
  'EVIDENCE_SUPPORTS_WITH_CONDITIONS',
  'MATERIAL_RISKS_IDENTIFIED',
  'INSUFFICIENT_EVIDENCE',
  'UNABLE_TO_ASSESS',
] as const

export type AssessmentOutcome = typeof ASSESSMENT_OUTCOMES[number]

/** Human-readable labels for each outcome code. */
export const OUTCOME_LABELS: Record<AssessmentOutcome, string> = {
  EVIDENCE_SUPPORTS:
    'Evidence Supports Intended Commercial Use',
  EVIDENCE_SUPPORTS_WITH_CONDITIONS:
    'Evidence Supports Intended Commercial Use with Conditions',
  MATERIAL_RISKS_IDENTIFIED:
    'Evidence Indicates Material Commercial Risks',
  INSUFFICIENT_EVIDENCE:
    'Insufficient Supporting Evidence',
  UNABLE_TO_ASSESS:
    'Unable to Reach Assessment',
}

// ── Institutional Status ──────────────────────────────────────────────────────

export const INSTITUTIONAL_STATUSES = ['ACTIVE', 'SUPERSEDED', 'WITHDRAWN'] as const
export type InstitutionalStatus = typeof INSTITUTIONAL_STATUSES[number]

// ── Processing Status ─────────────────────────────────────────────────────────

/**
 * Processing lifecycle:
 *   DRAFT → REPORT_GENERATED → SIGNING → SIGNED → DELIVERED
 *                                             ↓
 *                                          FAILED (from any step after DRAFT)
 *
 * Institutional status (ACTIVE / SUPERSEDED / WITHDRAWN) is entirely separate.
 */
export const PROCESSING_STATUSES = [
  'DRAFT',
  'REPORT_GENERATED',
  'SIGNING',
  'SIGNED',
  'DELIVERED',
  'FAILED',
] as const

export type ProcessingStatus = typeof PROCESSING_STATUSES[number]

// ── C2PA / Provenance types ───────────────────────────────────────────────────

/**
 * Full IPTC URIs for digitalSourceType.
 * v1 default: compositeWithTrainedAlgorithmicMedia
 * TODO v2: make reviewer-settable in the workbook UI.
 */
export const DIGITAL_SOURCE_TYPE_URIS = {
  trainedAlgorithmicMedia:
    'http://cv.iptc.org/newscodes/digitalsourcetype/trainedAlgorithmicMedia',
  compositeWithTrainedAlgorithmicMedia:
    'http://cv.iptc.org/newscodes/digitalsourcetype/compositeWithTrainedAlgorithmicMedia',
} as const

export type DigitalSourceTypeUri =
  typeof DIGITAL_SOURCE_TYPE_URIS[keyof typeof DIGITAL_SOURCE_TYPE_URIS]

// ── Core Assessment record ────────────────────────────────────────────────────

/**
 * The Assessment row as stored in the database.
 *
 * Fields intentionally excluded:
 *   - customer name / campaign name / evidence
 *   - reviewer notes, gap log, findings, recommendations, internal reasoning
 *   - confidence (PDF-only, Zone C — never appears in the Registry, C2PA, or Verification Page)
 */
export interface Assessment {
  id: string
  submission_id: string
  assessment_number: string       // format: ASSESS-NNN-YYYY-MM-DD
  assessment_date: string         // ISO 8601 date, e.g. "2026-07-12"
  methodology_version: string     // e.g. "SI8 Reviewer Manual v0.1"
  reviewer_organization: string   // "PMF Strategy Inc. d/b/a SuperImmersive 8"
  outcome: AssessmentOutcome
  institutional_status: InstitutionalStatus
  status_reason: string | null
  processing_status: ProcessingStatus
  failure_diagnostic: string | null   // non-null when processing_status = 'FAILED'
  verification_url: string
  numbers_asset_id: string | null     // populated after SIGNED
  signed_asset_path: string | null    // Supabase storage path; populated after SIGNED
  pdf_hash_sha256: string | null      // internal only; not displayed or embedded in v1
  created_at: string
  updated_at: string
}

export type AssessmentInsert = Omit<Assessment, 'id' | 'created_at' | 'updated_at'>
export type AssessmentUpdate = Partial<Omit<Assessment, 'id' | 'submission_id' | 'created_at'>>

// ── ProvenanceProvider contract ───────────────────────────────────────────────

/**
 * The metadata SI8 passes to the provenance provider.
 * These fields map to the approved C2PA embedded fields under
 * namespace si8.commercial-assurance/v1.
 *
 * NOT included: confidence, report hash (v1), findings, customer info,
 * tool names, evidence.
 */
export interface AssessmentMetadata {
  assessmentNumber: string
  assessmentDate: string         // ISO 8601
  reviewerOrganization: string
  methodologyVersion: string
  outcomeCode: AssessmentOutcome
  verificationUrl: string
}

/**
 * IPTC provenance metadata — describes the digital source type of the asset.
 * digitalSourceType is a standard C2PA field; the full IPTC URI must be used.
 */
export interface ProvenanceMetadata {
  digitalSourceType: DigitalSourceTypeUri
}

/**
 * Result returned by the provenance provider after signing.
 */
export interface SignedAssetResult {
  /** URL from which the signed asset can be downloaded (temporary; must be persisted). */
  signedAssetUrl: string
  /** Provider-assigned asset identifier (Numbers CID). */
  provenanceAssetId: string
  /** Numbers verification URL for the asset, if returned by the provider. */
  verificationUrl?: string
}

/**
 * ProvenanceProvider — the abstraction that separates SI8 assessment logic
 * from any specific provenance signing implementation.
 *
 * Principle 3: Numbers provides provenance. SI8 provides commercial assessment.
 * These must never be conflated.
 */
export interface ProvenanceProvider {
  sign(
    asset: Buffer,
    assessment: AssessmentMetadata,
    provenance: ProvenanceMetadata,
  ): Promise<SignedAssetResult>
}

// ── Verification Page data ────────────────────────────────────────────────────

/**
 * The allowed public fields for the Verification Page.
 * This type enforces at the type-system level what can be returned to the public.
 *
 * Security: customer identity, campaign identity, evidence, reviewer notes,
 * confidence, findings, and internal reasoning are NOT in this type and must
 * never be returned by the public API route.
 */
export interface VerificationPageData {
  assessment_number: string
  institutional_status: InstitutionalStatus
  status_reason: string | null
  outcome: AssessmentOutcome
  assessment_date: string
  methodology_version: string
  reviewer_organization: string
  numbers_asset_id: string | null   // used to construct Numbers verification link
  processing_status: ProcessingStatus
}

// ── Assessment number format ──────────────────────────────────────────────────

/**
 * Parse the date component from an assessment number.
 * Returns ISO date string or today's date as fallback.
 */
export function parseAssessmentDate(assessmentNumber: string): string {
  const match = assessmentNumber.match(/(\d{4}-\d{2}-\d{2})$/)
  return match?.[1] ?? new Date().toISOString().split('T')[0]
}

/**
 * The 7 domains reviewed in every SI8 assessment.
 * Displayed on the Verification Page — no scores, no gap indicators, no findings.
 */
export const ASSESSMENT_DOMAINS = [
  { code: 'A', label: 'Identity & Accountability' },
  { code: 'R', label: 'Commercial Rights & Licensing' },
  { code: 'H', label: 'Human Creative Contribution' },
  { code: 'I', label: 'Third-Party IP' },
  { code: 'L', label: 'Likeness & Performer Rights' },
  { code: 'T', label: 'Technical Provenance' },
  { code: 'D', label: 'Documentation Integrity' },
] as const
