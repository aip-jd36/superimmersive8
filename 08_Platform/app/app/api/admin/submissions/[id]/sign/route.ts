import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { createAssessmentFromWorkbook, signAssessment } from '@/lib/assessments/service'
import { MockProvenanceProvider } from '@/lib/assessments/providers/mock'
import { NumbersProvenanceProvider } from '@/lib/assessments/providers/numbers'
import type { AssessmentOutcome, ProvenanceProvider } from '@/types/assessment'

// Vercel Pro max — downloading + uploading large MP4s needs headroom
export const maxDuration = 60

type RouteContext = { params: { id: string } }

const VALID_OUTCOMES = new Set<AssessmentOutcome>([
  'EVIDENCE_SUPPORTS',
  'EVIDENCE_SUPPORTS_WITH_CONDITIONS',
  'MATERIAL_RISKS_IDENTIFIED',
  'INSUFFICIENT_EVIDENCE',
  'UNABLE_TO_ASSESS',
])

export async function POST(_request: NextRequest, { params }: RouteContext) {
  try {
    // Auth
    const supabase = createClient()
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
    if (authError || !authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { data: userData } = await supabaseAdmin
      .from('users').select('is_admin').eq('id', authUser.id).single()
    if (!userData?.is_admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Fetch submission
    const { data: submission, error: fetchError } = await supabaseAdmin
      .from('submissions')
      .select('id, title, workbook_data, source_video_url, report_pdf_url')
      .eq('id', params.id)
      .single()
    if (fetchError || !submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
    }

    // Prerequisite checks
    const missing: string[] = []
    if (!submission.source_video_url) missing.push('source video')
    if (!submission.report_pdf_url)   missing.push('report PDF')
    const workbookSignedOff = !!(submission.workbook_data as any)?.section_6?.signed_off
    if (!workbookSignedOff) missing.push('workbook sign-off (Section 6)')
    if (missing.length > 0) {
      return NextResponse.json(
        { error: `Prerequisites not met: ${missing.join(', ')}` },
        { status: 400 },
      )
    }

    // Extract and validate outcome from workbook
    const rawOutcome: string = (submission.workbook_data as any)?.section_6?.outcome ?? ''
    if (!VALID_OUTCOMES.has(rawOutcome as AssessmentOutcome)) {
      return NextResponse.json(
        { error: `Invalid or missing outcome in workbook section_6: "${rawOutcome}"` },
        { status: 400 },
      )
    }
    const outcome = rawOutcome as AssessmentOutcome

    // Create assessment record (idempotent — returns existing if already created)
    const assessment = await createAssessmentFromWorkbook(params.id, outcome)

    // Already fully signed — return success without re-running the signing flow
    if (
      assessment.processing_status === 'SIGNED' ||
      assessment.processing_status === 'DELIVERED'
    ) {
      return NextResponse.json({
        success:          true,
        assessmentNumber: assessment.assessment_number,
        verificationUrl:  assessment.verification_url,
        numbersAssetId:   assessment.numbers_asset_id,
        signedAssetPath:  assessment.signed_asset_path,
        alreadySigned:    true,
      })
    }

    // Select provider — real when Numbers API key is present, mock otherwise.
    // Swap activates automatically once NUMBERS_API_KEY is set in Vercel env vars.
    const provider: ProvenanceProvider = process.env.NUMBERS_API_KEY
      ? new NumbersProvenanceProvider(process.env.NUMBERS_API_KEY)
      : new MockProvenanceProvider()

    // Download report PDF
    const { data: pdfBlob, error: pdfError } = await supabaseAdmin.storage
      .from('report-pdfs')
      .download(submission.report_pdf_url as string)
    if (pdfError || !pdfBlob) {
      return NextResponse.json(
        { error: 'Failed to download report PDF', detail: pdfError?.message },
        { status: 500 },
      )
    }
    const pdfBuffer = Buffer.from(await pdfBlob.arrayBuffer())

    // Download source video
    const { data: videoBlob, error: videoError } = await supabaseAdmin.storage
      .from('source-videos')
      .download(submission.source_video_url as string)
    if (videoError || !videoBlob) {
      return NextResponse.json(
        { error: 'Failed to download source video', detail: videoError?.message },
        { status: 500 },
      )
    }
    const videoBuffer = Buffer.from(await videoBlob.arrayBuffer())
    const videoExt = (submission.source_video_url as string).split('.').pop() ?? 'mp4'

    // Run the signing flow via Assessment Service
    const result = await signAssessment(
      {
        assessmentId: assessment.id,
        pdfBuffer,
        videoBuffer,
        videoExt,
      },
      provider,
    )

    return NextResponse.json({
      success:          true,
      assessmentNumber: assessment.assessment_number,
      verificationUrl:  assessment.verification_url,
      reportHash:       result.reportHash,
      numbersAssetId:   result.numbersAssetId,
      signedAssetPath:  result.signedAssetPath,
    })
  } catch (err: any) {
    console.error('[sign] Error:', err)
    return NextResponse.json(
      { error: 'Internal server error', detail: err?.message },
      { status: 500 },
    )
  }
}
