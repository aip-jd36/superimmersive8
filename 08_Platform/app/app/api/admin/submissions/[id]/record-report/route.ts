import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { findAssessmentBySubmissionId } from '@/lib/assessments/repository'
import { recordReportGenerated } from '@/lib/assessments/service'

type RouteContext = { params: { id: string } }

/**
 * Bind a just-uploaded report PDF to its canonical assessment.
 *
 * Called by ReportPDFUpload immediately after the file lands in the
 * report-pdfs Storage bucket (replaces the old generic delivery-files PATCH
 * for report_pdf_url specifically — a report PDF is not just a file
 * reference, it must be bound to the assessment it was generated for).
 *
 * Downloads the uploaded file to compute its SHA-256, then calls
 * recordReportGenerated(), which transitions the assessment
 * DRAFT -> REPORT_GENERATED (or re-applies the binding if already there —
 * idempotent against retry) and sets submissions.report_pdf_assessment_id.
 * /sign validates this binding before signing.
 *
 * Requires the canonical assessment to already exist — created by
 * Generate Report / ensure-assessment before this point. If no assessment
 * exists yet, the file is in Storage but the binding cannot be established;
 * the admin must run Generate Report in the workbook first.
 */
export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
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

    const { path } = await request.json()
    if (!path) {
      return NextResponse.json({ error: 'Missing path' }, { status: 400 })
    }

    const assessment = await findAssessmentBySubmissionId(params.id)
    if (!assessment) {
      return NextResponse.json(
        {
          error:
            'No assessment exists yet for this submission. Run "Generate Client Report (PDF)" in ' +
            'the Assessment Workbook (§ 7) before uploading — the uploaded file must be bound to a ' +
            'canonical assessment number.',
        },
        { status: 409 },
      )
    }

    const { data: pdfBlob, error: downloadError } = await supabaseAdmin.storage
      .from('report-pdfs')
      .download(path)
    if (downloadError || !pdfBlob) {
      return NextResponse.json(
        { error: 'Failed to read uploaded PDF for hashing', detail: downloadError?.message },
        { status: 500 },
      )
    }
    const pdfBuffer = Buffer.from(await pdfBlob.arrayBuffer())
    const pdfHashSha256 = crypto.createHash('sha256').update(pdfBuffer).digest('hex')

    const updated = await recordReportGenerated(assessment.id, params.id, {
      pdfStoragePath: path,
      pdfHashSha256,
    })

    return NextResponse.json({
      success:           true,
      assessmentNumber:  updated.assessment_number,
      processingStatus:  updated.processing_status,
    })
  } catch (error: any) {
    console.error('[record-report]', error)
    return NextResponse.json(
      { error: error?.message ?? 'Failed to bind report to assessment' },
      { status: 500 },
    )
  }
}
