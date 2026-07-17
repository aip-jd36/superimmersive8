/**
 * Assessment Repository
 *
 * The single interface between application code and the assessments table.
 * All database access to the assessments table must go through this module.
 *
 * Uses supabaseAdmin (service_role) — bypasses RLS.
 * Never expose supabaseAdmin to client components.
 */

import { supabaseAdmin } from '@/lib/supabase/admin'
import type {
  Assessment,
  AssessmentInsert,
  AssessmentUpdate,
  AssessmentOutcome,
  InstitutionalStatus,
  ProcessingStatus,
  VerificationPageData,
} from '@/types/assessment'

// ── Public visibility gate ────────────────────────────────────────────────────

/**
 * Processing statuses that make an assessment publicly resolvable on the
 * Verification Page. Public visibility follows institutional issuance
 * (delivery), not merely successful signing — a SIGNED asset may still fail
 * delivery or be intentionally paused before the customer receives it.
 *
 * DRAFT, REPORT_GENERATED, SIGNING, SIGNED, and FAILED assessments must
 * resolve identically to a nonexistent assessment number: no leaking that a
 * draft exists, what its preliminary outcome is, or that review is underway.
 */
const PUBLICLY_VISIBLE_PROCESSING_STATUSES: readonly ProcessingStatus[] = ['DELIVERED']

export function isPubliclyVisibleProcessingStatus(status: ProcessingStatus): boolean {
  return PUBLICLY_VISIBLE_PROCESSING_STATUSES.includes(status)
}

// ── Assessment number generation ──────────────────────────────────────────────

/**
 * Generate the next assessment number in ASSESS-NNN-YYYY-MM-DD format.
 *
 * Delegates to the PostgreSQL function generate_assessment_number(), which uses
 * a sequence (assessments_number_seq) to guarantee atomic, collision-safe
 * generation under any concurrency. Two simultaneous callers will always receive
 * different NNN values.
 *
 * Migration: 20260712000001_atomic_assessment_number.sql
 */
export async function generateAssessmentNumber(): Promise<string> {
  const { data, error } = await supabaseAdmin.rpc('generate_assessment_number')

  if (error || !data) {
    throw new Error(
      `Failed to generate assessment number: ${error?.message ?? 'no data returned'}`,
    )
  }

  return data as string
}

// ── Read ──────────────────────────────────────────────────────────────────────

export async function findAssessmentById(id: string): Promise<Assessment | null> {
  const { data, error } = await supabaseAdmin
    .from('assessments')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) return null
  return data as Assessment
}

export async function findAssessmentBySubmissionId(
  submissionId: string,
): Promise<Assessment | null> {
  const { data, error } = await supabaseAdmin
    .from('assessments')
    .select('*')
    .eq('submission_id', submissionId)
    .single()

  if (error || !data) return null
  return data as Assessment
}

/**
 * Find assessment by assessment_number for the public Verification Page.
 *
 * The Verification Page is a public, read-only representation of the authoritative
 * Assessment Registry. The Registry (this table) is the source of truth; the
 * Verification Page reflects it — it does not define it.
 *
 * Returns only the VerificationPageData subset — safe to pass to public routes.
 * Never returns: customer data, reviewer notes, evidence, confidence, findings.
 *
 * Asset section: joins to submissions to pull asset_title and asset_runtime.
 * The allowlist is explicit — only title and runtime are fetched from submissions.
 * Submission ID, creator identity, storage paths, and filenames are NOT selected.
 *
 * v1: asset_title sourced from submissions.title.
 * Future: assessments table may carry its own asset_title to allow
 * reviewer-controlled public asset title independent of submission.
 * Future: asset_media_type may be stored in assessments for non-video assets.
 * Future: confidential assets may use "Confidential Commercial Asset" as public title.
 */
export async function findAssessmentForVerification(
  assessmentNumber: string,
): Promise<VerificationPageData | null> {
  const { data, error } = await supabaseAdmin
    .from('assessments')
    .select(
      `assessment_number, institutional_status, status_reason, outcome, assessment_date, methodology_version, reviewer_organization, numbers_asset_id, processing_status,
       submission:submissions!submission_id ( title, runtime )`,
    )
    .eq('assessment_number', assessmentNumber)
    .single()

  if (error || !data) return null

  // Public exposure gate: an assessment that exists but hasn't been delivered
  // must resolve exactly like a nonexistent assessment number — no distinguishing
  // "not found" from "found but not yet issued" in the response.
  if (!isPubliclyVisibleProcessingStatus(data.processing_status as ProcessingStatus)) return null

  // Supabase returns joined rows as an array even for to-one relationships.
  // Unwrap the first element; use explicit field mapping — do not spread.
  const rawSub = Array.isArray(data.submission)
    ? (data.submission[0] ?? null)
    : (data.submission ?? null)
  const sub = rawSub as { title: string; runtime: number | null } | null

  return {
    assessment_number:  data.assessment_number,
    institutional_status: data.institutional_status,
    status_reason:      data.status_reason,
    outcome:            data.outcome,
    assessment_date:    data.assessment_date,
    methodology_version: data.methodology_version,
    reviewer_organization: data.reviewer_organization,
    numbers_asset_id:   data.numbers_asset_id,
    processing_status:  data.processing_status,
    // Asset section — sourced from submissions join.
    // asset_media_type is hardcoded "Video" for all v1 assessments.
    asset_title:      sub?.title ?? '',
    asset_runtime:    sub?.runtime ?? null,
    asset_media_type: 'Video',
  }
}

// ── Write ─────────────────────────────────────────────────────────────────────

export async function createAssessment(
  input: AssessmentInsert,
): Promise<Assessment> {
  const { data, error } = await supabaseAdmin
    .from('assessments')
    .insert(input)
    .select()
    .single()

  if (error || !data) {
    throw new Error(`Failed to create assessment: ${error?.message ?? 'unknown error'}`)
  }
  return data as Assessment
}

export async function updateAssessment(
  id: string,
  updates: AssessmentUpdate,
): Promise<Assessment> {
  const { data, error } = await supabaseAdmin
    .from('assessments')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error || !data) {
    throw new Error(`Failed to update assessment ${id}: ${error?.message ?? 'unknown error'}`)
  }
  return data as Assessment
}

// ── Processing status transitions ─────────────────────────────────────────────

/**
 * Advance processing_status. Validates the transition is permitted.
 *
 * Permitted transitions:
 *   DRAFT → REPORT_GENERATED
 *   REPORT_GENERATED → SIGNING
 *   SIGNING → SIGNED
 *   SIGNED → DELIVERED
 *   Any non-DRAFT → FAILED (with diagnostic required)
 *   FAILED → SIGNING  (recovery path — see PERMITTED_TRANSITIONS comment)
 *
 * On transition to SIGNED: failure_diagnostic is cleared (set to null).
 * This implements Option A (retain diagnostic until success): the existing
 * diagnostic string is preserved during retry, cleared only on SIGNED.
 */
export async function transitionProcessingStatus(
  id: string,
  to: ProcessingStatus,
  options?: {
    failureDiagnostic?: string     // required when to = 'FAILED'
    numbersAssetId?: string        // set when to = 'SIGNED'
    signedAssetPath?: string       // set when to = 'SIGNED'
    pdfHashSha256?: string         // set when to = 'REPORT_GENERATED'
  },
): Promise<Assessment> {
  const current = await findAssessmentById(id)
  if (!current) throw new Error(`Assessment ${id} not found`)

  validateTransition(current.processing_status, to)

  if (to === 'FAILED' && !options?.failureDiagnostic) {
    throw new Error('failureDiagnostic is required when transitioning to FAILED')
  }

  const updates: AssessmentUpdate = { processing_status: to }

  if (to === 'FAILED') {
    updates.failure_diagnostic = options?.failureDiagnostic!
  }
  if (to === 'REPORT_GENERATED' && options?.pdfHashSha256) {
    updates.pdf_hash_sha256 = options.pdfHashSha256
  }
  if (to === 'SIGNED') {
    if (options?.numbersAssetId) updates.numbers_asset_id = options.numbersAssetId
    if (options?.signedAssetPath) updates.signed_asset_path = options.signedAssetPath
    // Option A: retain failure_diagnostic during retry; clear only on successful SIGNED.
    // A FAILED → SIGNING → SIGNED retry path should leave no stale diagnostic text.
    updates.failure_diagnostic = null
  }

  return updateAssessment(id, updates)
}

/**
 * Mark an assessment as FAILED and preserve the diagnostic.
 * Safe to call from catch blocks — never throws.
 */
export async function markFailed(
  id: string,
  diagnostic: { step: string; error: string; timestamp?: string },
): Promise<void> {
  const ts = diagnostic.timestamp ?? new Date().toISOString()
  const message = `[${ts}] Step: ${diagnostic.step} | Error: ${diagnostic.error}`

  try {
    await updateAssessment(id, {
      processing_status: 'FAILED',
      failure_diagnostic: message,
    })
  } catch (err) {
    // Log but do not rethrow — caller is likely already in an error path
    console.error(`[assessment/repository] Failed to mark assessment ${id} as FAILED:`, err)
  }
}

// ── Institutional status transitions ──────────────────────────────────────────

export async function supersede(
  id: string,
  replacementAssessmentNumber: string,
): Promise<Assessment> {
  return updateAssessment(id, {
    institutional_status: 'SUPERSEDED',
    status_reason: `Superseded by ${replacementAssessmentNumber}`,
  })
}

export async function withdraw(id: string, reason: string): Promise<Assessment> {
  return updateAssessment(id, {
    institutional_status: 'WITHDRAWN',
    status_reason: reason,
  })
}

// ── Internal validation ───────────────────────────────────────────────────────

const PERMITTED_TRANSITIONS: Record<ProcessingStatus, ProcessingStatus[]> = {
  // REPORT_GENERATED is reachable from DRAFT twice over: once via the normal
  // forward path (Generate Report), and again via DRAFT after a
  // REPORT_GENERATED → DRAFT invalidation (see below) once the report is
  // regenerated. Both are just "DRAFT → REPORT_GENERATED".
  DRAFT:            ['REPORT_GENERATED', 'FAILED'],
  //
  // REPORT_GENERATED → DRAFT: a generated report is invalidated back to DRAFT
  // when the reviewer edits workbook data after the report was already
  // generated. The previously generated PDF no longer reflects the current
  // review content and must not remain signable. See
  // service.ts invalidateGeneratedReport(), called from the workbook autosave
  // route whenever workbook_data changes on a REPORT_GENERATED assessment.
  REPORT_GENERATED: ['SIGNING', 'FAILED', 'DRAFT'],
  SIGNING:          ['SIGNED', 'FAILED'],
  SIGNED:           ['DELIVERED', 'FAILED'],
  DELIVERED:        ['FAILED'],   // edge case; should be rare
  //
  // FAILED is recoverable — not terminal.
  //
  // "FAILED" means "the most recent processing attempt failed", not
  // "can never be processed again." Transient provider errors (network timeout,
  // Numbers API 503, download failure) are the expected cause. The assessment
  // record is preserved with its failure_diagnostic; the reviewer initiates a
  // retry by transitioning FAILED → SIGNING.
  //
  // DELIVERED is the only true terminal state for a completed assessment.
  // FAILED from DELIVERED remains permitted as an edge case.
  //
  // The FAILED → SIGNING recovery path skips Steps 1–2 (REPORT_GENERATED and
  // SIGNING transitions from DRAFT) because pdf_hash_sha256 is already persisted
  // from the original attempt. See service.ts signAssessment() retry path.
  FAILED:           ['SIGNING'],
}

/**
 * Whether a processing_status transition is permitted. Exported (alongside
 * the underlying table) so the state machine itself is unit-testable without
 * a database — see __tests__/assessments/processing-status-transitions.test.ts.
 */
export function canTransitionProcessingStatus(from: ProcessingStatus, to: ProcessingStatus): boolean {
  return (PERMITTED_TRANSITIONS[from] ?? []).includes(to)
}

function validateTransition(from: ProcessingStatus, to: ProcessingStatus): void {
  if (!canTransitionProcessingStatus(from, to)) {
    throw new Error(
      `Invalid processing_status transition: ${from} → ${to}. ` +
      `Permitted from ${from}: [${(PERMITTED_TRANSITIONS[from] ?? []).join(', ')}]`,
    )
  }
}
