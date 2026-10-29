import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { generateCreatorRecordPDF } from '@/lib/pdf/generateChainOfTitle'
import { hasCreatorRecordPdf, type FulfillmentSubmission } from '@/lib/payments/repository'
import { issueCreatorRecordArtifact } from '@/lib/creator-record-artifacts/issue'
import { EligibilityUnknownError, issuancePath, type IssuancePath } from '@/lib/creator-record-artifacts/precedence'
import { issueDepsFor } from '@/lib/creator-record-artifacts/production'
import { artifactGateDecision, artifactStatus } from '@/lib/creator-record-artifacts/store'

type RouteContext = { params: { id: string } }

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    // Verify admin auth
    const supabase = createClient()
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
    if (authError || !authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('is_admin')
      .eq('id', authUser.id)
      .single()

    if (!userData?.is_admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Fetch submission
    const { data: submission, error: submissionError } = await supabaseAdmin
      .from('submissions')
      .select('*')
      .eq('id', params.id)
      .single()

    if (submissionError || !submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
    }

    if ((submission as any).tier !== 'creator_record') {
      return NextResponse.json({ error: 'This endpoint is for Creator Record submissions only' }, { status: 400 })
    }

    // CR-ARTIFACT-1: submissions on the private artifact path (an artifact row exists, or the rollout
    // gate is open and no legacy PDF exists) are resumed through the same issuance procedure as
    // fulfilment. An issued artifact is immutable: `force` never replaces it. Legacy submissions
    // continue below, unchanged.
    // CR-ARTIFACT-1C: if eligibility or artifact state cannot be established, issue nothing on either path.
    let path: IssuancePath
    try {
      path = await issuancePath(params.id, { artifactStatus, legacyHasPdf: hasCreatorRecordPdf, gate: (id) => artifactGateDecision(id) })
    } catch (err) {
      const unknown = err instanceof EligibilityUnknownError
      return NextResponse.json({ error: unknown ? 'Issuance eligibility could not be established; nothing was issued. Try again later.' : 'Issuance state could not be established; nothing was issued.', status: 'unavailable' }, { status: 503 })
    }
    if (path === 'artifact') {
      if ((submission as any).status !== 'approved') {
        return NextResponse.json({ error: 'Creator Record is not approved (paid) yet' }, { status: 409 })
      }
      const result = await issueCreatorRecordArtifact(params.id, issueDepsFor(submission as FulfillmentSubmission))
      if (result.outcome === 'issued') return NextResponse.json({ success: true, status: 'issued', recordId: result.artifact.record_id })
      if (result.outcome === 'already_issued') {
        return NextResponse.json({ error: 'This Creator Record has already been issued and cannot be replaced.', status: 'issued', recordId: result.artifact.record_id }, { status: 409 })
      }
      if (result.outcome === 'contended') return NextResponse.json({ error: 'Issuance is in progress. Try again shortly.', status: 'in_progress' }, { status: 409 })
      return NextResponse.json({ error: 'Stored document does not match its record; nothing was changed.', status: 'integrity_conflict' }, { status: 500 })
    }

    // Check if already generated. ?force=true no longer regenerates an issued legacy PDF (CR-PDF-DECLARATIONS-1C, below).
    const forceRegenerate = new URL(request.url).searchParams.get('force') === 'true'
    const { data: existing } = await supabaseAdmin
      .from('rights_packages')
      .select('id, document_url')
      .eq('submission_id', params.id)
      .maybeSingle()

    if (existing?.document_url && !forceRegenerate) {
      return NextResponse.json({ error: 'Creator Record PDF already exists. It is not regenerated automatically; operator review is required.', documentUrl: existing.document_url }, { status: 400 })
    }

    // CR-PDF-DECLARATIONS-1C: an already-issued legacy PDF is never regenerated automatically,
    // whatever its declaration flags: regenerating would change a document the creator may already hold.
    if (existing?.document_url) {
      return NextResponse.json({
        error: 'This Creator Record PDF has already been issued and is not regenerated automatically. Nothing was changed; operator review is required.',
        status: 'regeneration_review_required',
      }, { status: 409 })
    }

    // Parse JSONB fields — handle both string (legacy) and already-parsed (JSONB) cases
    const parseJsonb = (val: any, fb: any) => { if (!val) return fb; if (typeof val === 'string') { try { return JSON.parse(val) } catch { return fb } } return val }
    const tools: any[] = parseJsonb(submission.tools_used, [])
    const likenessConfirmation: Record<string, boolean> = parseJsonb(submission.likeness_confirmation, {})
    const ipConfirmation: Record<string, boolean> = parseJsonb(submission.ip_confirmation, {})

    console.log('📄 Admin: Triggering Creator Record PDF for submission', params.id)

    const pdfUrl = await generateCreatorRecordPDF({
      submissionId: submission.id,
      filmmakerName: submission.filmmaker_name || 'Unknown',
      title: submission.title,
      tools,
      authorshipStatement: submission.authorship_statement || undefined,
      likenessConfirmation,
      ipConfirmation,
      territory: submission.territory_preferences || submission.territory || 'Global',
      custodianDeclaration: submission.custodian_declaration,
      indemnificationConfirmed: submission.indemnification_confirmed,
    })

    if (!pdfUrl) {
      return NextResponse.json({
        error: 'PDF generation failed — check Vercel function logs for details',
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      documentUrl: pdfUrl,
      message: 'Creator Record PDF generated successfully',
    })
  } catch (error: any) {
    console.error('❌ Admin generate-creator-record error:', error)
    return NextResponse.json({
      error: error?.message || 'Internal server error',
      stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined,
    }, { status: 500 })
  }
}
