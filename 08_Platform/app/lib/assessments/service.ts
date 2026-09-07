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
  findAssessmentById,
  findAssessmentBySubmissionId,
  markFailed,
  transitionProcessingStatus,
  updateAssessment,
  signOffAssessment as signOffAssessmentAtomic,
} from './repository'
import { validateWorkbookForSignoff, domainCodesForMethodology } from './signoff'
import type {
  Assessment,
  AssessmentMetadata,
  AssessmentOutcome,
  DigitalSourceTypeUri,
  ProvenanceProvider,
} from '@/types/assessment'
import { DIGITAL_SOURCE_TYPE_URIS } from '@/types/assessment'

// ── Constants ─────────────────────────────────────────────────────────────────

const REVIEWER_ORGANIZATION = 'PMF Strategy Inc. d/b/a SuperImmersive 8'
// Exported (not just internal) specifically so a test can assert the current
// value directly, without mocking the full Supabase insert path in
// createAssessmentFromWorkbook. See Reviewer Manual v0.2, Part 7, "Version
// Bump Requirement" — this constant must move in lockstep with the Manual's
// own version header on every substantive Part 4/Part 5 change.
export const METHODOLOGY_VERSION = 'SI8 Reviewer Manual v0.2'
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://app.superimmersive8.com'

// For v1, default to compositeWithTrainedAlgorithmicMedia (covers the typical
// agency composited video workflow).
// TODO v2: make reviewer-settable in the workbook UI.
const DEFAULT_DIGITAL_SOURCE_TYPE: DigitalSourceTypeUri =
  DIGITAL_SOURCE_TYPE_URIS.compositeWithTrainedAlgorithmicMedia

// ── Durable human sign-off (CA-RLK-2a) ─────────────────────────

/**
 * The reviewer's durable sign-off act. THIS is what creates (or re-signs) the
 * canonical assessment row — not "Generate Report". Replaces the removed
 * createAssessmentFromWorkbook / syncDraftAssessmentFromWorkbook.
 *
 * The route has already authenticated + authorized (V1: users.is_admin) and
 * passes the actor's auth.users id. This function:
 *   - loads the canonical submission + workbook (never a client payload);
 *   - validates the EXISTING decision-completeness gates server-side
 *     (lib/assessments/signoff.ts validateWorkbookForSignoff — no new
 *     methodology rules);
 *   - derives outcome from the canonical workbook, methodology from the
 *     authoritative constant, the domain-scope set from the methodology, and
 *     the asset descriptors from the submission;
 *   - delegates the atomic create/re-sign + workbook-revision binding to the
 *     sign_off_assessment(...) Postgres RPC (migration 20260907000000), which
 *     locks the submission row and rejects the sign-off if the workbook
 *     revision moved (correction #2). assessment_date and signed_off_at are
 *     DB-derived inside the RPC — never client-supplied.
 */
export type SignOffOutcome =
  | { ok: true; assessment: Assessment; created?: boolean; resigned?: boolean; idempotent?: boolean }
  | { ok: false; code: 'incomplete'; reasons: string[] }
  | { ok: false; code: 'unknown_methodology' | 'submission_not_found' | 'workbook_changed' | 'not_pre_delivery'; detail?: string }

export async function signOffAssessment(
  submissionId: string,
  actorUserId: string,
): Promise<SignOffOutcome> {
  const { data: submission, error } = await supabaseAdmin
    .from('submissions')
    .select('id, title, runtime, tier, custodian_declaration, indemnification_confirmed, workbook_data, workbook_revision')
    .eq('id', submissionId)
    .single()
  if (error || !submission) return { ok: false, code: 'submission_not_found' }

  const validation = validateWorkbookForSignoff(submission.workbook_data, {
    custodian_declaration: submission.custodian_declaration,
    indemnification_confirmed: submission.indemnification_confirmed,
    tier: submission.tier,
  })
  if (!validation.ok || !validation.outcome) {
    return { ok: false, code: 'incomplete', reasons: validation.reasons }
  }

  const scopeDomainCodes = domainCodesForMethodology(METHODOLOGY_VERSION)
  if (!scopeDomainCodes) {
    // FAIL CLOSED — never snapshot "current domains" for an unknown methodology.
    return { ok: false, code: 'unknown_methodology', detail: METHODOLOGY_VERSION }
  }

  const result = await signOffAssessmentAtomic({
    submissionId,
    actorUserId,
    expectedRevision: Number(submission.workbook_revision ?? 0),
    outcome: validation.outcome,
    methodologyVersion: METHODOLOGY_VERSION,
    reviewerOrganization: REVIEWER_ORGANIZATION,
    siteUrl: SITE_URL,
    assetTitle: (submission.title as string | null) ?? null,
    assetMediaType: 'Video',
    assetRuntime: (submission.runtime as number | null) ?? null,
    scopeDomainCodes,
  })

  if (result.ok) {
    return { ok: true, assessment: result.assessment, created: result.created, resigned: result.resigned, idempotent: result.idempotent }
  }
  if (result.code === 'workbook_changed') return { ok: false, code: 'workbook_changed' }
  if (result.code === 'not_pre_delivery') return { ok: false, code: 'not_pre_delivery', detail: result.processingStatus }
  if (result.code === 'submission_not_found') return { ok: false, code: 'submission_not_found' }
  return { ok: false, code: 'not_pre_delivery', detail: result.code }
}


/**
 * Record a successfully generated report PDF against its canonical assessment.
 *
 * Call ONLY after Typst compilation succeeded, the PDF was uploaded to
 * Supabase Storage, and its SHA-256 was computed — the REPORT_GENERATED
 * transition (on first call) is deliberately the LAST operation in that
 * sequence. A partial failure upstream (compile error, storage failure)
 * must never leave the assessment claiming a report exists when the file or
 * hash is missing.
 *
 * pdf_hash_sha256 is ALWAYS written to match args.pdfHashSha256, on every
 * call, regardless of starting state — not just on the first DRAFT ->
 * REPORT_GENERATED transition. Every call to this function means "here is
 * the file currently bound to this assessment," and the stored hash must
 * always reflect whatever submissions.report_pdf_url currently points to.
 * Without this, a routine "Replace PDF" re-upload while still
 * REPORT_GENERATED (no workbook change, no invalidation in between) would
 * leave the hash stale, and signAssessment()'s hash check would then
 * incorrectly reject the freshly re-uploaded — and correct — file as
 * tampered.
 *
 * Handles three starting states:
 *   - DRAFT (normal, first-ever report for this assessment): transitions to
 *     REPORT_GENERATED with the given hash, atomically.
 *   - REPORT_GENERATED (a later re-upload, or retry after a partial failure
 *     of THIS function on a prior attempt where the transition succeeded
 *     but the binding/hash update below failed): stays REPORT_GENERATED
 *     (REPORT_GENERATED -> REPORT_GENERATED is not itself a valid
 *     transition, so this updates the hash directly via updateAssessment
 *     rather than transitionProcessingStatus).
 *   - FAILED (re-binding a corrected file after signAssessment() rejected
 *     the previous one — e.g. its ArtifactBindingValidation hash-mismatch
 *     check — and marked the assessment FAILED): deliberately stays FAILED,
 *     not transitioned to REPORT_GENERATED (the state machine does not
 *     permit that edge; see repository.ts PERMITTED_TRANSITIONS). The hash
 *     is still updated to match the corrected file. This is safe because
 *     signAssessment()'s FAILED retry path (FAILED -> SIGNING) does not
 *     re-verify the hash at all — it assumes a transient signing/provider
 *     failure, not a content problem — so retrying /sign after this simply
 *     proceeds with whatever file is now bound.
 *
 * Any other starting state (SIGNING, SIGNED, DELIVERED) is rejected — none
 * of those should ever have Generate Report re-run against them; the admin
 * UI doesn't expose that path, but this defends against it directly.
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

  let assessment: Assessment
  if (current.processing_status === 'DRAFT') {
    assessment = await transitionProcessingStatus(assessmentId, 'REPORT_GENERATED', {
      pdfHashSha256: args.pdfHashSha256,
    })
  } else if (current.processing_status === 'REPORT_GENERATED' || current.processing_status === 'FAILED') {
    assessment = current.pdf_hash_sha256 === args.pdfHashSha256
      ? current
      : await updateAssessment(assessmentId, { pdf_hash_sha256: args.pdfHashSha256 })
  } else {
    throw new Error(
      `Cannot record report generation for assessment ${assessmentId}: ` +
      `processing_status is ${current.processing_status}, expected DRAFT, REPORT_GENERATED, or FAILED.`,
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
 * Preconditions (enforced by the /sign route before this is called, and
 * re-checked here defensively):
 *   - processing_status is REPORT_GENERATED (normal) or FAILED (retry).
 *   - pdf_hash_sha256 is already persisted — recorded by recordReportGenerated()
 *     when the report PDF was uploaded and bound to this assessment, NOT by
 *     this function. This function never computes REPORT_GENERATED's hash;
 *     it only verifies the PDF it was handed still matches that hash.
 *
 * Steps from a fresh REPORT_GENERATED start:
 *   1. Verify pdfBuffer's SHA-256 matches the already-persisted pdf_hash_sha256
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
 * FAILED recovery: if processing_status is 'FAILED', skip Step 1's hash
 *   verification (already verified on the attempt that reached SIGNING) and
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

  const reportHash = crypto.createHash('sha256').update(pdfBuffer).digest('hex')

  // ── FAILED recovery path ──────────────────────────────────────────────────
  // processing_status = 'FAILED': previous attempt failed at some step after
  // REPORT_GENERATED. The hash was already verified on that attempt.
  // Transition directly FAILED → SIGNING to re-enter the signing flow at Step 3.
  // The failure_diagnostic string is retained in the DB during this retry;
  // it will be cleared by the SIGNED transition on success (see repository.ts).
  if (assessment.processing_status === 'FAILED') {
    await transitionProcessingStatus(assessmentId, 'SIGNING')
    // Fall through to Step 3 below.
  } else if (assessment.processing_status === 'REPORT_GENERATED') {
    // ── Step 1: artifact-binding validation ─────────────────────────────────
    // pdf_hash_sha256 was recorded when the report was generated and bound
    // to this assessment (recordReportGenerated, called from the
    // record-report route immediately after upload) — NOT here. Verifying
    // the freshly-downloaded PDF still matches it is the last line of
    // defense against a stale or manually swapped file that was never
    // re-bound: the /sign route already checks
    // submissions.report_pdf_assessment_id === assessment.id, but that only
    // proves *which* assessment the upload claims to belong to, not that the
    // file's content hasn't changed since binding.
    if (assessment.pdf_hash_sha256 && assessment.pdf_hash_sha256 !== reportHash) {
      const diagnostic =
        `Report PDF hash mismatch: expected ${assessment.pdf_hash_sha256}, got ${reportHash}. ` +
        `The bound report was regenerated or replaced without re-establishing the binding.`
      await markFailed(assessmentId, {
        step:      'ArtifactBindingValidation',
        error:     diagnostic,
        timestamp: new Date().toISOString(),
      })
      throw new Error(diagnostic)
    }

    // ── Step 2: Advance to SIGNING ──────────────────────────────────────────
    await transitionProcessingStatus(assessmentId, 'SIGNING')
  } else {
    // Defensive: the /sign route already rejects any status other than
    // REPORT_GENERATED or FAILED before calling this function. Reaching here
    // means that guard was bypassed or this function was called directly.
    throw new Error(
      `Cannot sign assessment ${assessmentId}: processing_status is ` +
      `${assessment.processing_status}, expected REPORT_GENERATED or FAILED.`,
    )
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
