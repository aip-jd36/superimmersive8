import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { signAssessment } from '@/lib/assessments/service'
import { findAssessmentBySubmissionId } from '@/lib/assessments/repository'
import { selectSigningProvider } from '@/lib/assessments/signing-provider-policy'

// Vercel Pro max — downloading + uploading large MP4s needs headroom
export const maxDuration = 60

type RouteContext = { params: { id: string } }

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
      .select('id, title, workbook_data, workbook_revision, source_video_url, report_pdf_url, report_pdf_assessment_id')
      .eq('id', params.id)
      .single()
    if (fetchError || !submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
    }

    // Prerequisite checks
    const missing: string[] = []
    if (!submission.source_video_url) missing.push('source video')
    if (!submission.report_pdf_url)   missing.push('report PDF')
    if (missing.length > 0) {
      return NextResponse.json(
        { error: `Prerequisites not met: ${missing.join(', ')}` },
        { status: 400 },
      )
    }

    // The assessment must already exist — created by the reviewer's durable
    // sign-off (POST /sign-off). /sign no longer creates it, and it no longer
    // trusts workbook_data.section_6.signed_off (a mutable draft field).
    const assessment = await findAssessmentBySubmissionId(params.id)
    if (!assessment) {
      return NextResponse.json(
        {
          error:
            'No assessment exists for this submission. Sign off the assessment in § 6, then ' +
            'generate the client report in § 7 before signing.',
        },
        { status: 400 },
      )
    }

    // CA-RLK-2a: provenance signing requires an ACTIVE, revision-matched durable
    // human sign-off — not the workbook boolean.
    if (
      assessment.processing_status !== 'SIGNED' &&
      assessment.processing_status !== 'DELIVERED'
    ) {
      if (assessment.signoff_status !== 'active') {
        return NextResponse.json(
          { error: 'Assessment sign-off is not active (invalidated by a later workbook edit). Re-sign in § 6.' },
          { status: 409 },
        )
      }
      if (assessment.signed_workbook_revision !== Number((submission as any).workbook_revision ?? 0)) {
        return NextResponse.json(
          { error: 'The workbook changed after sign-off. Re-sign in § 6 and regenerate the report before signing.' },
          { status: 409 },
        )
      }
    }

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

    // The assessment must have a generated (or previously in-flight, now
    // FAILED) report to sign — never DRAFT or SIGNING at this point.
    if (assessment.processing_status !== 'REPORT_GENERATED' && assessment.processing_status !== 'FAILED') {
      return NextResponse.json(
        {
          error:
            `Assessment is not ready to sign (status: ${assessment.processing_status}). ` +
            `Generate the report in § 7 and upload it before signing.`,
        },
        { status: 400 },
      )
    }

    // Artifact-binding validation: the uploaded report_pdf_url must have been
    // bound to THIS assessment by record-report (called from ReportPDFUpload
    // immediately after upload) — not merely present. Catches stale uploads
    // (workbook edited and report invalidated after upload, but somehow not
    // caught by the processing_status check above) and wrong-submission
    // mistakes. signAssessment() separately re-verifies the file's SHA-256
    // against what was recorded at binding time as a second, content-level
    // check — this one only proves the upload *claims* to belong here.
    if (submission.report_pdf_assessment_id !== assessment.id) {
      return NextResponse.json(
        {
          error:
            'Uploaded report PDF is not bound to this assessment — it may be stale or from a ' +
            'different submission. Regenerate the report in § 7 and re-upload before signing.',
        },
        { status: 409 },
      )
    }

    // Select provider — server-owned policy (CA-RLK-2d). The concrete choice
    // depends ONLY on the assessment's own is_system_test flag and the
    // server-side NUMBERS_API_KEY; nothing in the request can influence it.
    // A system-test assessment is isolated to the non-production provider even
    // when NUMBERS_API_KEY is configured. See lib/assessments/signing-provider-policy.ts.
    const { provider, kind, systemTestIsolated } = selectSigningProvider({
      isSystemTest: assessment.is_system_test,
      numbersApiKey: process.env.NUMBERS_API_KEY,
    })
    if (systemTestIsolated) {
      console.info(
        `[sign] assessment ${assessment.assessment_number} is is_system_test — ` +
        `isolated to the "${kind}" provider (production provenance provider withheld).`,
      )
    }

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
