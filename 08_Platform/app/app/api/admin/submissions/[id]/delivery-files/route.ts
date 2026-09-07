import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

type RouteContext = { params: { id: string } }

// report_pdf_url is deliberately excluded — it must go through
// /api/admin/submissions/[id]/record-report, which binds the file to its
// canonical assessment (hash + report_pdf_assessment_id) rather than just
// recording a path. See ReportPDFUpload.tsx.
const ALLOWED_FIELDS = ['source_video_url', 'source_video_filename'] as const

export async function PATCH(request: NextRequest, { params }: RouteContext) {
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

    const body = await request.json()
    const updates: Record<string, string | null> = {}
    for (const field of ALLOWED_FIELDS) {
      if (field in body) updates[field] = body[field]
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    // CA-RLK-2a / 2a.1: the source video is the signed-asset input. Once
    // provenance signing has begun (SIGNING) or completed (SIGNED / DELIVERED),
    // changing it would break the signed-asset <-> report relationship.
    const { data: assessment } = await supabaseAdmin
      .from('assessments')
      .select('processing_status')
      .eq('submission_id', params.id)
      .single()
    const ps = (assessment as any)?.processing_status
    if (ps === 'SIGNING' || ps === 'SIGNED' || ps === 'DELIVERED') {
      return NextResponse.json(
        { error: 'assessed_asset_locked', message: `Assessed-asset inputs are locked (assessment state: ${ps}).` },
        { status: 409 },
      )
    }

    const { error: updateError } = await supabaseAdmin
      .from('submissions')
      .update(updates)
      .eq('id', params.id)

    if (updateError) {
      console.error('Error updating delivery files:', updateError)
      return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Error in delivery-files route:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
