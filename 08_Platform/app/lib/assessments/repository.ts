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
 */
export async function findAssessmentForVerification(
  assessmentNumber: string,
): Promise<VerificationPageData | null> {
  const { data, error } = await supabaseAdmin
    .from('assessments')
    .select(
      'assessment_number, institutional_status, status_reason, outcome, assessment_date, methodology_version, reviewer_organization, numbers_asset_id, processing_status',
    )
    .eq('assessment_number', assessmentNumber)
    .single()

  if (error || !data) return null
  return data as VerificationPageData
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
  DRAFT:            ['REPORT_GENERATED', 'FAILED'],
  REPORT_GENERATED: ['SIGNING', 'FAILED'],
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

function validateTransition(from: ProcessingStatus, to: ProcessingStatus): void {
  const allowed = PERMITTED_TRANSITIONS[from] ?? []
  if (!allowed.includes(to)) {
    throw new Error(
      `Invalid processing_status transition: ${from} → ${to}. ` +
      `Permitted from ${from}: [${allowed.join(', ')}]`,
    )
  }
}
