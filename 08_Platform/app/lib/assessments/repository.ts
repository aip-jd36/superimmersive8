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
import { LOCKED_ASSESSMENT_FIELDS } from './signoff'
// The governed public-visibility predicate now lives in a pure module so the
// admin Sign & Deliver projection can share it (see ./public-visibility.ts).
// Re-exported here to keep the existing import path stable.
import { isPubliclyVisibleProcessingStatus } from './public-visibility'

export { isPubliclyVisibleProcessingStatus } from './public-visibility'

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
      `assessment_number, institutional_status, status_reason, outcome, assessment_date, methodology_version, reviewer_organization, numbers_asset_id, processing_status, is_system_test,
       asset_title, asset_media_type, asset_runtime, scope_domain_codes`,
    )
    .eq('assessment_number', assessmentNumber)
    .single()

  if (error) {
    // PGRST116 ("JSON object requested, multiple (or no) rows returned") is
    // .single()'s normal signal for zero matching rows — the expected,
    // frequent outcome for a genuinely nonexistent or mistyped assessment
    // number. Not worth logging; would spam logs on every bad lookup.
    //
    // Any other code is a real failure (connection issue, malformed
    // relationship query, permissions problem, etc.) masquerading as an
    // ordinary "not found" to the public caller — by design, this function
    // must not leak the distinction externally (a real assessment that
    // exists but isn't DELIVERED must look identical to one that failed to
    // query or never existed). But internally, these are different
    // problems and must be distinguishable in logs. Externally
    // indistinguishable, internally observable.
    if (error.code !== 'PGRST116') {
      console.error('[findAssessmentForVerification] query failed', {
        assessmentNumber,
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      })
    }
    return null
  }

  if (!data) return null

  // Public exposure gate: an assessment that exists but hasn't been delivered
  // must resolve exactly like a nonexistent assessment number — no distinguishing
  // "not found" from "found but not yet issued" in the response.
  if (!isPubliclyVisibleProcessingStatus(data.processing_status as ProcessingStatus)) return null

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
    is_system_test:     data.is_system_test,
    // CA-RLK-2a: asset descriptors + scope are HISTORICAL SNAPSHOTS on the
    // assessments row (written at sign-off), not a live submissions lookup.
    // A delivered record no longer drifts when the submission is edited.
    asset_title:        (data.asset_title as string | null) ?? '',
    asset_runtime:      (data.asset_runtime as number | null) ?? null,
    asset_media_type:   (data.asset_media_type as string | null) ?? 'Video',
    scope_domain_codes: (data.scope_domain_codes as string[] | null) ?? null,
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

/**
 * Generic assessment update. CA-RLK-2a §28: this path must NEVER mutate a
 * locked sign-off / snapshot column — those are written ONLY by the atomic
 * sign_off_assessment RPC (see signOffAssessment). A stray attempt is a bug,
 * so this throws rather than silently dropping the key.
 */
export async function updateAssessment(
  id: string,
  updates: AssessmentUpdate,
): Promise<Assessment> {
  const locked = Object.keys(updates).filter((k) => LOCKED_ASSESSMENT_FIELDS.includes(k))
  if (locked.length > 0) {
    throw new Error(
      `updateAssessment(${id}): refusing to mutate locked field(s) [${locked.join(', ')}] — ` +
      `sign-off/snapshot columns are written only by the sign_off_assessment RPC (CA-RLK-2a §28).`,
    )
  }
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

// ── CA-RLK-2a: atomic sign-off + atomic workbook mutation ────────────────────

export interface SignOffParams {
  submissionId: string
  actorUserId: string
  expectedRevision: number
  outcome: string
  methodologyVersion: string
  reviewerOrganization: string
  siteUrl: string
  assetTitle: string | null
  assetMediaType: string
  assetRuntime: number | null
  scopeDomainCodes: readonly string[]
}

export type SignOffResult =
  | { ok: true; assessment: Assessment; created?: boolean; resigned?: boolean; idempotent?: boolean }
  | { ok: false; code: 'submission_not_found' | 'workbook_changed' | 'not_pre_delivery' | string; currentRevision?: number; processingStatus?: string }

/** Calls the atomic sign_off_assessment(...) Postgres function (migration 20260907000000). */
export async function signOffAssessment(p: SignOffParams): Promise<SignOffResult> {
  const { data, error } = await supabaseAdmin.rpc('sign_off_assessment', {
    p_submission_id:         p.submissionId,
    p_actor:                 p.actorUserId,
    p_expected_revision:     p.expectedRevision,
    p_outcome:               p.outcome,
    p_methodology_version:   p.methodologyVersion,
    p_reviewer_organization: p.reviewerOrganization,
    p_site_url:              p.siteUrl,
    p_asset_title:           p.assetTitle,
    p_asset_media_type:      p.assetMediaType,
    p_asset_runtime:         p.assetRuntime,
    p_scope_domain_codes:    p.scopeDomainCodes as string[],
  })
  if (error) throw new Error(`[assessments/repository] signOffAssessment RPC: ${error.message}`)
  const row = (Array.isArray(data) ? data[0] : data) as Record<string, unknown> | null
  if (!row || typeof row !== 'object') throw new Error('[assessments/repository] signOffAssessment: RPC returned no object')
  if (row.ok === true) {
    return {
      ok: true,
      assessment: row.assessment as unknown as Assessment,
      created: row.created as boolean | undefined,
      resigned: row.resigned as boolean | undefined,
      idempotent: row.idempotent as boolean | undefined,
    }
  }
  return {
    ok: false,
    code: (row.code as string) ?? 'unknown',
    currentRevision: row.current_revision as number | undefined,
    processingStatus: row.processing_status as string | undefined,
  }
}

export type PatchWorkbookResult =
  | { ok: true; workbookRevision: number; signoffInvalidated: boolean; reportInvalidated: boolean }
  | { ok: false; code: 'submission_not_found' | 'delivered' | string }

/** Calls the atomic patch_workbook_atomic(...) Postgres function. */
export async function patchWorkbookAtomic(
  submissionId: string,
  workbookData: unknown,
  actorUserId: string,
): Promise<PatchWorkbookResult> {
  const { data, error } = await supabaseAdmin.rpc('patch_workbook_atomic', {
    p_submission_id: submissionId,
    p_workbook_data: workbookData,
    p_actor:         actorUserId,
  })
  if (error) throw new Error(`[assessments/repository] patchWorkbookAtomic RPC: ${error.message}`)
  const row = (Array.isArray(data) ? data[0] : data) as Record<string, unknown> | null
  if (!row || typeof row !== 'object') throw new Error('[assessments/repository] patchWorkbookAtomic: RPC returned no object')
  if (row.ok === true) {
    return {
      ok: true,
      workbookRevision: row.workbook_revision as number,
      signoffInvalidated: Boolean(row.signoff_invalidated),
      reportInvalidated: Boolean(row.report_invalidated),
    }
  }
  return { ok: false, code: (row.code as string) ?? 'unknown' }
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
