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
 * Counts all existing assessments to assign a sequential NNN.
 *
 * NOTE: This is not atomic — two concurrent calls could theoretically generate
 * the same number. In v1 with a single reviewer this is acceptable; v2 should
 * use a DB sequence.
 */
export async function generateAssessmentNumber(): Promise<string> {
  const { count } = await supabaseAdmin
    .from('assessments')
    .select('id', { count: 'exact', head: true })

  const num = String((count ?? 0) + 1).padStart(3, '0')
  const date = new Date().toISOString().split('T')[0]
  return `ASSESS-${num}-${date}`
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
  FAILED:           [],           // terminal — no further transitions
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
