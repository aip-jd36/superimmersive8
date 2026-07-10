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

  // Fetch evidence files for the right panel
  const { data: listedFiles } = await supabaseAdmin.storage
    .from('submission-files')
    .list(params.id, { limit: 50 })

  const evidenceFiles: Array<{ name: string; url: string }> = []
  if (listedFiles && listedFiles.length > 0) {
    const paths = listedFiles.map(f => `${params.id}/${f.name}`)
    const { data: signed } = await supabaseAdmin.storage
      .from('submission-files')
      .createSignedUrls(paths, 3600) // 1-hour expiry
    if (signed) {
      for (let i = 0; i < listedFiles.length; i++) {
        evidenceFiles.push({ name: listedFiles[i].name, url: signed[i]?.signedUrl ?? '' })
      }
    }
  }

  // CATALOG DISABLED: video_url now lives on submissions.video_url directly (migration 20260710000002)
  // No longer fetching opt_ins to get video_url.

  return (
    <WorkbookClient
      submissionId={params.id}
      assessId={assessId}
      initialWorkbook={initialWorkbook}
      submission={submission as any}
      evidenceFiles={evidenceFiles ?? []}
    />
  )
}
