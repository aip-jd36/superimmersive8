import { requireAdmin } from '@/lib/auth/admin'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import { WorkbookClient } from './WorkbookClient'
import { EMPTY_WORKBOOK } from './workbook-schema'
import { findAssessmentBySubmissionId } from '@/lib/assessments/repository'

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

  const rawWorkbook = (submission as any).workbook_data
  const initialWorkbook = rawWorkbook
    ? (typeof rawWorkbook === 'string' ? JSON.parse(rawWorkbook) : rawWorkbook)
    : EMPTY_WORKBOOK

  // Collect evidence file paths from submission JSONB fields
  // Files are stored at {user_id}/{folder}/{filename} — NOT under submission ID
  const rawPaths: Array<{ label: string; path: string }> = []

  // Tool receipts from tools_used JSONB
  const toolsUsedRaw = (submission as any).tools_used
  const toolsArr = Array.isArray(toolsUsedRaw)
    ? toolsUsedRaw
    : (typeof toolsUsedRaw === 'string' ? (() => { try { return JSON.parse(toolsUsedRaw) } catch { return [] } })() : [])
  for (const tool of toolsArr) {
    const path = tool?.receipt_path || tool?.receipt?.path
    if (path) {
      const toolLabel = tool.tool_name || tool.toolName || tool.tool || 'Tool'
      rawPaths.push({ label: `${toolLabel} receipt`, path })
    }
  }

  // Audio license from audio_disclosure JSONB
  const audioRaw = (submission as any).audio_disclosure
  const audioObj = audioRaw
    ? (typeof audioRaw === 'string' ? (() => { try { return JSON.parse(audioRaw) } catch { return null } })() : audioRaw)
    : null
  if (audioObj?.license_path) {
    rawPaths.push({ label: 'Audio license', path: audioObj.license_path })
  }

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

  return (
    <WorkbookClient
      submissionId={params.id}
      assessmentNumber={assessmentNumber}
      initialWorkbook={initialWorkbook}
      submission={submission as any}
      evidenceFiles={evidenceFiles ?? []}
    />
  )
}
