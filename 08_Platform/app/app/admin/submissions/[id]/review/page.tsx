import { requireAdmin } from '@/lib/auth/admin'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import { WorkbookClient } from './WorkbookClient'
import { ReviewerShell } from './ReviewerShell'
import { ReviewerResources } from './ReviewerResources'
import { checkReviewerContextAccess } from '@/lib/reviewer-context/auth'
import { EMPTY_WORKBOOK } from './workbook-schema'
import { findAssessmentBySubmissionId } from '@/lib/assessments/repository'
import { collectSubmissionEvidencePaths } from '@/lib/reviewer-evidence/collect-evidence-paths'

type PageProps = { params: { id: string } }

export default async function WorkbookPage({ params }: PageProps) {
  await requireAdmin()

  const { data: submission, error } = await supabaseAdmin
    .from('submissions')
    .select(`
      *,
      user:users!user_id (email, name)
    `)
    .eq('id', params.id)
    .single()

  if (error || !submission) notFound()

  // Mark review as started (display only — no longer generates an ID here).
  // The canonical assessment_number doesn't exist until Generate Report is
  // clicked (Section 6 must be complete first — assessments.outcome is
  // NOT NULL). Read-only lookup: never creates or writes an assessment.
  if (!(submission as any).review_started_at) {
    await supabaseAdmin
      .from('submissions')
      .update({ review_started_at: new Date().toISOString() })
      .eq('id', params.id)
  }

  const existingAssessment = await findAssessmentBySubmissionId(params.id)
  const assessmentNumber: string | null = existingAssessment?.assessment_number ?? null
  const initialSignoffStatus: 'active' | 'invalidated' | null =
    (existingAssessment?.signoff_status as 'active' | 'invalidated' | null) ?? null

  const rawWorkbook = (submission as any).workbook_data
  const initialWorkbook = rawWorkbook
    ? (typeof rawWorkbook === 'string' ? JSON.parse(rawWorkbook) : rawWorkbook)
    : EMPTY_WORKBOOK

  // Collect evidence file paths from submission JSONB fields + direct upload
  // columns (CAH-4I.3: extended from 2 channels to all 7 known channels).
  // Files are stored at {user_id}/{folder}/{filename} — NOT under submission ID
  const rawPaths = collectSubmissionEvidencePaths(submission as any)

  // Generate signed URLs for all found paths (1-hour expiry)
  const evidenceFiles: Array<{ name: string; url: string }> = []
  if (rawPaths.length > 0) {
    const { data: signed } = await supabaseAdmin.storage
      .from('submission-files')
      .createSignedUrls(rawPaths.map(p => p.path), 3600)
    if (signed) {
      for (let i = 0; i < rawPaths.length; i++) {
        const signedUrl = signed[i]?.signedUrl
        if (signedUrl) {
          evidenceFiles.push({ name: rawPaths[i].label, url: signedUrl })
        }
      }
    }
  }

  // CATALOG DISABLED: video_url now lives on submissions.video_url directly (migration 20260710000002)
  // No longer fetching opt_ins to get video_url.

  // CAH-4F.1: one reviewer-resources access check here decides whether the
  // shell shows the inspector at all. `ReviewerResources` re-checks (defence in
  // depth). This is the SAME gate `requireAdmin()` already passed, so in
  // practice it is always available on this page — but we do not assume it.
  const reviewerResourcesAccess = await checkReviewerContextAccess()
  const resourcesAvailable = reviewerResourcesAccess.ok

  return (
    // CAH-4F.1 — Reviewer Workspace Shell:
    //   ASSESSMENT NAVIGATION | ASSESSMENT WORK SURFACE | REVIEWER RESOURCES
    // <ReviewerShell> owns the page frame + the inspector open/close +
    // responsive layout. <WorkbookClient> (its `children`) continues to own all
    // workbook behavior and is never remounted by inspector open/close. The
    // Reviewer Resources content reaches the shell as one opaque ReactNode
    // `inspector` slot — the shell never inspects or couples to it, so UI
    // adjacency does not merge the three authority surfaces (see ADR-001).
    <ReviewerShell
      resourcesAvailable={resourcesAvailable}
      inspector={resourcesAvailable ? <ReviewerResources submissionId={params.id} /> : null}
    >
      <WorkbookClient
        submissionId={params.id}
        assessmentNumber={assessmentNumber}
        initialSignoffStatus={initialSignoffStatus}
        initialWorkbook={initialWorkbook}
        submission={submission as any}
        evidenceFiles={evidenceFiles ?? []}
      />
    </ReviewerShell>
  )
}
