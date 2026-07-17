/**
 * Assessment Service
 *
 * Orchestrates the assessment processing lifecycle:
 *   DRAFT → REPORT_GENERATED → SIGNING → SIGNED → DELIVERED
 *
 * This module is the only place that calls the ProvenanceProvider.
 * It is provider-agnostic: pass any ProvenanceProvider implementation.
 *
 * Responsibilities:
 *   - Create and persist Assessment records
 *   - Compute PDF SHA-256
 *   - Download signed asset from provider and store in Supabase Storage
 *   - Advance processing_status through transitions
 *   - Preserve failure diagnostics on error
 *
 * NOT responsible for:
 *   - PDF generation (existing Typst pipeline)
 *   - Reviewer workbook logic
 *   - Customer-facing delivery emails
 */

import crypto from 'crypto'
import { supabaseAdmin } from '@/lib/supabase/admin'
import {
  createAssessment,
  findAssessmentById,
  findAssessmentBySubmissionId,
  generateAssessmentNumber,
  markFailed,
  transitionProcessingStatus,
  updateAssessment,
} from './repository'
import type {
  Assessment,
  AssessmentInsert,
  AssessmentMetadata,
  AssessmentOutcome,
  DigitalSourceTypeUri,
  ProvenanceProvider,
} from '@/types/assessment'
import { DIGITAL_SOURCE_TYPE_URIS } from '@/types/assessment'

// ── Constants ─────────────────────────────────────────────────────────────────

const REVIEWER_ORGANIZATION = 'PMF Strategy Inc. d/b/a SuperImmersive 8'
const METHODOLOGY_VERSION = 'SI8 Reviewer Manual v0.1'
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://app.superimmersive8.com'

// For v1, default to compositeWithTrainedAlgorithmicMedia (covers the typical
// agency composited video workflow).
// TODO v2: make reviewer-settable in the workbook UI.
const DEFAULT_DIGITAL_SOURCE_TYPE: DigitalSourceTypeUri =
  DIGITAL_SOURCE_TYPE_URIS.compositeWithTrainedAlgorithmicMedia

// ── Create assessment ─────────────────────────────────────────────────────────

/**
 * Get-or-create the canonical Assessment record for a submission.
 *
 * Called by the Generate Report action, the first point in the reviewer
 * workflow where a real assessment_number is needed (the assessments table
 * requires outcome NOT NULL, so this cannot run before Section 6 is filled
 * in — Generate Report only becomes available once it is).
 *
 * Strictly create-or-return: if an assessment already exists for this
 * submission_id, it is returned completely unchanged — this function never
 * mutates an existing row, including outcome. That's a deliberate, separate
 * step (see syncDraftAssessmentFromWorkbook) so that reconciling drift
 * between the workbook and an already-created assessment is always an
 * explicit, auditable operation, never a silent side effect of "just asking
 * for the assessment."
 */
export async function createAssessmentFromWorkbook(
  submissionId: string,
  outcome: AssessmentOutcome,
): Promise<Assessment> {
  // Idempotency: return existing assessment if already created
  const existing = await findAssessmentBySubmissionId(submissionId)
  if (existing) return existing

  const assessmentNumber = await generateAssessmentNumber()
  const verificationUrl = `${SITE_URL}/assessment/${assessmentNumber}`

  const insert: AssessmentInsert = {
    submission_id:        submissionId,
    assessment_number:    assessmentNumber,
    assessment_date:      new Date().toISOString().split('T')[0],
    methodology_version:  METHODOLOGY_VERSION,
    reviewer_organization: REVIEWER_ORGANIZATION,
    outcome,
    institutional_status: 'ACTIVE',
    status_reason:        null,
    processing_status:    'DRAFT',
    failure_diagnostic:   null,
    verification_url:     verificationUrl,
    numbers_asset_id:     null,
    signed_asset_path:    null,
    pdf_hash_sha256:      null,
  }

  return createAssessment(insert)
}

/**
 * Explicitly synchronize outcome from the workbook onto a DRAFT assessment.
 *
 * Only valid while the assessment is still DRAFT. Once a report has been
 * generated (REPORT_GENERATED or later), an outcome change must go through
 * invalidateGeneratedReport() first — the workbook autosave route does this
 * automatically whenever workbook data changes on a REPORT_GENERATED
 * assessment, which reverts it to DRAFT and clears the stale report binding.
 * This guards against the case where a PDF was generated for Outcome A, the
 * reviewer silently changes Section 6 to Outcome B, and the (now
 * substantively wrong) PDF remains signable because only the assessment
 * number — not the report's content — was being checked.
 *
 * No-ops (returns the assessment unchanged, no DB write) if outcome hasn't
 * actually changed, so routine autosave ticks don't bump updated_at.
 */
export async function syncDraftAssessmentFromWorkbook(
  assessmentId: string,
  outcome: AssessmentOutcome,
): Promise<Assessment> {
  const assessment = await findAssessmentById(assessmentId)
  if (!assessment) throw new Error(`Assessment ${assessmentId} not found`)

  if (assessment.processing_status !== 'DRAFT') {
    throw new Error(
      `Cannot sync outcome onto assessment ${assessmentId}: processing_status is ` +
      `${assessment.processing_status}, expected DRAFT. A generated report must be ` +
      `invalidated (see invalidateGeneratedReport) before its outcome can change.`,
    )
  }

  if (assessment.outcome === outcome) return assessment
  return updateAssessment(assessmentId, { outcome })
}

/**
 * Record a successfully generated report PDF against its canonical assessment.
 *
 * Call ONLY after Typst compilation succeeded, the PDF was uploaded to
 * Supabase Storage, and its SHA-256 was computed — the REPORT_GENERATED
 * transition is deliberately the LAST operation in that sequence. A partial
 * failure upstream (compile error, storage failure) must never leave the
 * assessment claiming a report exists when the file or hash is missing.
 *
 * Idempotent against retry after a partial failure of this function itself:
 * if the assessment is already REPORT_GENERATED (transition succeeded on a
 * prior attempt but the submissions binding update below failed), this skips
 * straight to re-applying the binding rather than attempting an invalid
 * REPORT_GENERATED → REPORT_GENERATED transition.
 *
 * Binds submissions.report_pdf_url to this exact assessment via
 * report_pdf_assessment_id — validated by /sign before signing (see
 * signAssessment()).
 */
export async function recordReportGenerated(
  assessmentId: string,
  submissionId: string,
  args: { pdfStoragePath: string; pdfHashSha256: string },
): Promise<Assessment> {
  const current = await findAssessmentById(assessmentId)
  if (!current) throw new Error(`Assessment ${assessmentId} not found`)

  const assessment = current.processing_status === 'DRAFT'
    ? await transitionProcessingStatus(assessmentId, 'REPORT_GENERATED', {
        pdfHashSha256: args.pdfHashSha256,
      })
    : current

  if (assessment.processing_status !== 'REPORT_GENERATED') {
    throw new Error(
      `Cannot record report generation for assessment ${assessmentId}: ` +
      `processing_status is ${assessment.processing_status}, expected DRAFT or REPORT_GENERATED.`,
    )
  }

  const { error } = await supabaseAdmin
    .from('submissions')
    .update({
      report_pdf_url:            args.pdfStoragePath,
      report_pdf_assessment_id:  assessmentId,
    })
    .eq('id', submissionId)

  if (error) {
    throw new Error(
      `Report generated and hashed for assessment ${assessmentId}, but failed to ` +
      `bind it to submission ${submissionId}: ${error.message}`,
    )
  }

  return assessment
}

/**
 * Revert a REPORT_GENERATED assessment back to DRAFT and clear the stale
 * report binding on its submission.
 *
 * Called by the workbook autosave route on every save; no-ops immediately
 * (no DB write) if there's no assessment yet or it isn't currently
 * REPORT_GENERATED — the common case, since most saves happen while still
 * DRAFT, before any report has been generated.
 *
 * processing_status is reverted to DRAFT before the submissions binding is
 * cleared, not after: if the second update fails, /sign is still correctly
 * blocked (it requires REPORT_GENERATED), even though the now-stale
 * report_pdf_url briefly remains visible in the admin UI until the clear is
 * retried.
 */
export async function invalidateGeneratedReport(submissionId: string): Promise<void> {
  const assessment = await findAssessmentBySubmissionId(submissionId)
  if (!assessment || assessment.processing_status !== 'REPORT_GENERATED') return

  await transitionProcessingStatus(assessment.id, 'DRAFT')

  const { error } = await supabaseAdmin
    .from('submissions')
    .update({ report_pdf_url: null, report_pdf_assessment_id: null })
    .eq('id', submissionId)

  if (error) {
    throw new Error(
      `Invalidated generated report for submission ${submissionId} (assessment reverted ` +
      `to DRAFT) but failed to clear the stale report binding: ${error.message}`,
    )
  }
}

// ── Sign flow ─────────────────────────────────────────────────────────────────

export interface SignAssessmentInput {
  assessmentId: string
  /** The compiled PDF buffer (already generated by Typst pipeline) */
  pdfBuffer: Buffer
  /** The raw source MP4 buffer */
  videoBuffer: Buffer
  /** File extension for the source video, e.g. 'mp4' */
  videoExt: string
}

export interface SignAssessmentResult {
  reportHash: string
  numbersAssetId: string
  numbersVerifyUrl: string | null
  signedAssetPath: string
}

/**
 * Run the full signing flow for an assessment.
 *
 * Steps (fresh start from DRAFT):
 *   1. Compute PDF SHA-256, advance status to REPORT_GENERATED
 *   2. Advance status to SIGNING
 *   3. Call ProvenanceProvider.sign (Numbers Protocol)
 *   4. Download signed asset from provider URL
 *   5. Store signed asset in Supabase Storage (signed-assets bucket)
 *   6. Advance status to SIGNED, persist numbers_asset_id + signed_asset_path
 *
 * On any failure: mark FAILED with diagnostic, never throw silently.
 *
 * ── Retry paths ──────────────────────────────────────────────────────────────
 *
 * Idempotency (already SIGNED): if numbers_asset_id + signed_asset_path are
 *   both set, return immediately. The assessment is already complete.
 *
 * FAILED recovery: if processing_status is 'FAILED', skip Steps 1–2
 *   (pdf_hash_sha256 is already persisted from the original attempt) and
 *   transition directly FAILED → SIGNING. Then proceed from Step 3.
 *   - The failure_diagnostic is preserved during the retry (Option A).
 *   - It is cleared only on a successful SIGNED transition (in repository.ts).
 *
 * Partial-success recovery: if numbers_asset_id is already set but
 *   signed_asset_path is not, Numbers succeeded but SI8 never received or
 *   stored the result. Skip the provider.sign() call and proceed from Step 4
 *   (download). This avoids registering a duplicate asset with Numbers.
 *   TODO (Numbers API): idempotency key support is unconfirmed — if Numbers
 *   adds idempotency keys in future, this partial-success guard can be
 *   replaced with a safe idempotent re-call.
 */
export async function signAssessment(
  input: SignAssessmentInput,
  provider: ProvenanceProvider,
): Promise<SignAssessmentResult> {
  const { assessmentId, pdfBuffer, videoBuffer, videoExt } = input

  // Fetch the current assessment record via repository (avoids raw supabaseAdmin call)
  const assessment = await findAssessmentById(assessmentId)
  if (!assessment) {
    throw new Error(`Assessment ${assessmentId} not found`)
  }

  // ── Full idempotency guard (already SIGNED / DELIVERED) ───────────────────
  // Both fields set = the entire signing flow completed on a previous attempt.
  // Return without touching state — the assessment is done.
  if (assessment.numbers_asset_id && assessment.signed_asset_path) {
    const reportHash = crypto.createHash('sha256').update(pdfBuffer).digest('hex')
    return {
      reportHash,
      numbersAssetId:   assessment.numbers_asset_id,
      numbersVerifyUrl: null,
      signedAssetPath:  assessment.signed_asset_path,
    }
  }

  // Always compute the PDF hash — same PDF = same hash, and we need it for
  // the REPORT_GENERATED transition on a fresh start (Step 1).
  const reportHash = crypto.createHash('sha256').update(pdfBuffer).digest('hex')

  // ── FAILED recovery path ──────────────────────────────────────────────────
  // processing_status = 'FAILED': previous attempt failed at some step after
  // DRAFT. Steps 1–2 are already complete (pdf_hash_sha256 is persisted).
  // Transition directly FAILED → SIGNING to re-enter the signing flow at Step 3.
  // The failure_diagnostic string is retained in the DB during this retry;
  // it will be cleared by the SIGNED transition on success (see repository.ts).
  if (assessment.processing_status === 'FAILED') {
    await transitionProcessingStatus(assessmentId, 'SIGNING')
    // Fall through to Step 3 below.
  } else {
    // ── Step 1: PDF hash + REPORT_GENERATED ────────────────────────────────
    await transitionProcessingStatus(assessmentId, 'REPORT_GENERATED', {
      pdfHashSha256: reportHash,
    })

    // ── Step 2: Advance to SIGNING ──────────────────────────────────────────
    await transitionProcessingStatus(assessmentId, 'SIGNING')
  }

  // ── Step 3: Call ProvenanceProvider ──────────────────────────────────────
  //
  // Partial-success guard: if numbers_asset_id is already set but
  // signed_asset_path is not, Numbers succeeded on a prior attempt but SI8's
  // response was lost (crash, timeout) before we could persist it. Skip the
  // provider call and reconstruct the download URL from the stored CID.
  //
  // TODO (Numbers API): idempotency key support is unconfirmed. If Numbers
  // returns a stable CID for the same (assessmentNumber, file) pair, this
  // guard can be removed in favour of a safe idempotent re-call.
  const assessmentMeta: AssessmentMetadata = {
    assessmentNumber:     assessment.assessment_number,
    assessmentDate:       assessment.assessment_date,
    reviewerOrganization: assessment.reviewer_organization,
    methodologyVersion:   assessment.methodology_version,
    outcomeCode:          assessment.outcome as AssessmentOutcome,
    verificationUrl:      assessment.verification_url,
  }

  let signedResult: { signedAssetUrl: string; provenanceAssetId: string; verificationUrl?: string; signedAssetBuffer?: Buffer }

  if (assessment.numbers_asset_id) {
    // numbers_asset_id is set but signed_asset_path is not — partial success.
    // Reconstruct the download URL from the known CID and skip provider.sign().
    // TODO (Numbers API): confirm the stable download URL pattern for a known CID.
    // If the download URL is not reconstructable from CID alone, a GET call to
    // /api/v3/assets/{cid}/ may be required.
    const cid = assessment.numbers_asset_id
    signedResult = {
      provenanceAssetId: cid,
      signedAssetUrl:    `https://api.numbersprotocol.io/api/v3/assets/${cid}/`,
      verificationUrl:   `https://verify.numbersprotocol.io/asset-profile?nid=${cid}`,
    }
  } else {
    try {
      signedResult = await provider.sign(videoBuffer, assessmentMeta, {
        digitalSourceType: DEFAULT_DIGITAL_SOURCE_TYPE,
      })
    } catch (err: any) {
      await markFailed(assessmentId, {
        step:      'ProvenanceProvider.sign',
        error:     err?.message ?? String(err),
        timestamp: new Date().toISOString(),
      })
      throw err
    }
  }

  // ── Step 4: Obtain signed asset buffer ────────────────────────────────────
  // If the provider pre-computed signedAssetBuffer (e.g. MockProvenanceProvider),
  // use it directly — no HTTP download needed. Otherwise fetch from signedAssetUrl.
  let signedVideoBuffer: Buffer
  if (signedResult.signedAssetBuffer) {
    signedVideoBuffer = signedResult.signedAssetBuffer
  } else {
    try {
      const downloadRes = await fetch(signedResult.signedAssetUrl)
      if (!downloadRes.ok) {
        throw new Error(`Download failed: HTTP ${downloadRes.status} from ${signedResult.signedAssetUrl}`)
      }
      signedVideoBuffer = Buffer.from(await downloadRes.arrayBuffer())
    } catch (err: any) {
      await markFailed(assessmentId, {
        step:      'DownloadSignedAsset',
        error:     err?.message ?? String(err),
        timestamp: new Date().toISOString(),
      })
      throw err
    }
  }

  // ── Step 5: Store signed asset in Supabase Storage ───────────────────────
  const storagePath = `${assessment.assessment_number}/signed.${videoExt}`
  try {
    const { error: uploadErr } = await supabaseAdmin.storage
      .from('signed-assets')
      .upload(storagePath, signedVideoBuffer, {
        contentType: 'video/mp4',
        upsert: true,
      })

    if (uploadErr) {
      throw new Error(`Supabase upload error: ${uploadErr.message}`)
    }
  } catch (err: any) {
    await markFailed(assessmentId, {
      step:      'StoreSignedAsset',
      error:     err?.message ?? String(err),
      timestamp: new Date().toISOString(),
    })
    throw err
  }

  // ── Step 6: Advance to SIGNED ─────────────────────────────────────────────
  // The SIGNED transition clears failure_diagnostic (see repository.ts).
  // Empty provenanceAssetId (mock mode) is treated as null — not persisted.
  // This allows real signing later without the idempotency guard blocking.
  const numbersAssetId = signedResult.provenanceAssetId || null
  await transitionProcessingStatus(assessmentId, 'SIGNED', {
    numbersAssetId:  numbersAssetId ?? undefined,
    signedAssetPath: storagePath,
  })

  return {
    reportHash,
    numbersAssetId:   numbersAssetId ?? '',
    numbersVerifyUrl: signedResult.verificationUrl ?? null,
    signedAssetPath:  storagePath,
  }
}

// ── Build C2PA assertion payload ──────────────────────────────────────────────

/**
 * Build the Zone A C2PA custom assertion payload for the Numbers Capture API.
 *
 * Approved embedded fields (si8.commercial-assurance/v1 namespace):
 *   - si8:assessment_number
 *   - si8:assessment_date
 *   - si8:reviewer_organization
 *   - si8:methodology_version
 *   - si8:outcome_code
 *   - si8:verification_url
 *
 * NOT embedded: confidence, report_hash (v1), findings, customer info,
 *   tool names, evidence, likeness assessment, commercial_authorization.
 *
 * The digitalSourceType IPTC URI is provided separately as a standard C2PA field.
 */
export function buildC2PAManifest(
  assessment: Pick<
    Assessment,
    | 'assessment_number'
    | 'assessment_date'
    | 'reviewer_organization'
    | 'methodology_version'
    | 'outcome'
    | 'verification_url'
  >,
): Record<string, string> {
  return {
    'si8:assessment_number':    assessment.assessment_number,
    'si8:assessment_date':      assessment.assessment_date,
    'si8:reviewer_organization': assessment.reviewer_organization,
    'si8:methodology_version':  assessment.methodology_version,
    'si8:outcome_code':         assessment.outcome,
    'si8:verification_url':     assessment.verification_url,
  }
}
