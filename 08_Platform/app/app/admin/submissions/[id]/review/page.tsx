import { requireAdmin } from '@/lib/auth/admin'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import { WorkbookClient } from './WorkbookClient'
import { EMPTY_WORKBOOK } from './workbook-schema'

type PageProps = { params: { id: string } }

async function generateAssessId(submissionId: string): Promise<string> {
  // Count existing assessments to assign a sequential number
  const { count } = await supabaseAdmin
    .from('submissions')
    .select('id', { count: 'exact', head: true })
    .not('assess_id', 'is', null)

  const num = String((count ?? 0) + 1).padStart(3, '0')
  const date = new Date().toISOString().split('T')[0]
  return `ASSESS-${num}-${date}`
}

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

  // Generate assess_id on first workbook open
  let assessId: string = (submission as any).assess_id
  if (!assessId) {
    assessId = await generateAssessId(params.id)
    await supabaseAdmin
      .from('submissions')
      .update({
        assess_id: assessId,
        review_started_at: new Date().toISOString(),
      })
      .eq('id', params.id)
  }

  const rawWorkbook = (submission as any).workbook_data
  const initialWorkbook = rawWorkbook
    ? (typeof rawWorkbook === 'string' ? JSON.parse(rawWorkbook) : rawWorkbook)
    : EMPTY_WORKBOOK

  // Fetch opt-in to get video_url (stored in opt_ins, not submissions)
  const { data: optIn } = await supabaseAdmin
    .from('opt_ins')
    .select('video_url')
    .eq('submission_id', params.id)
    .single()

  // Fetch evidence files for the right panel
  const { data: evidenceFiles } = await supabaseAdmin.storage
    .from('submission-files')
    .list(params.id, { limit: 50 })

  // Merge video_url from opt_ins so Section 1 and Section 2 can surface the link
  const mergedSubmission = {
    ...(submission as any),
    video_url: (optIn as any)?.video_url ?? (submission as any).video_url ?? null,
  }

  return (
    <WorkbookClient
      submissionId={params.id}
      assessId={assessId}
      initialWorkbook={initialWorkbook}
      submission={mergedSubmission}
      evidenceFiles={evidenceFiles ?? []}
    />
  )
}
