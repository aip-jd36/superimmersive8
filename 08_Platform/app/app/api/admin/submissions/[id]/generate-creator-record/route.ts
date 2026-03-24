import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { generateCreatorRecordPDF } from '@/lib/pdf/generateChainOfTitle'

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

    // Check if already generated — admin can force-regenerate by passing ?force=true
    const forceRegenerate = new URL(request.url).searchParams.get('force') === 'true'
    const { data: existing } = await supabaseAdmin
      .from('rights_packages')
      .select('id, document_url')
      .eq('submission_id', params.id)
      .maybeSingle()

    if (existing?.document_url && !forceRegenerate) {
      return NextResponse.json({ error: 'Creator Record PDF already exists. Use ?force=true to regenerate.', documentUrl: existing.document_url }, { status: 400 })
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
