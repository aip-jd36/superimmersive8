import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import {
  findAssessmentBySubmissionId,
  findActivePublication,
  revokeActivePublication,
} from '@/lib/assessments/repository'

type RouteContext = { params: { id: string } }

/**
 * POST /api/admin/submissions/[id]/revoke-publication  (CA-RLK-2g)
 *
 * Deliberately withdraw a Public Assessment Record from publication. The URL
 * transitions to the R2 bounded tombstone. A non-empty reason is required
 * (audit only; admin-only for v1). Publication history is preserved — the
 * active episode is UPDATEd (revoked_at/by/reason), never deleted.
 *
 * Does NOT touch processing_status, institutional_status, sign-off, workbook,
 * or provenance. Distinct from assessment withdrawal (institutional_status).
 *
 * Body: { reason: string }
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

    const body = await request.json().catch(() => ({}))
    const reason = typeof body?.reason === 'string' ? body.reason.trim() : ''
    if (!reason) {
      return NextResponse.json(
        { error: 'reason_required', message: 'A non-empty reason is required to revoke publication.' },
        { status: 400 },
      )
    }

    const assessment = await findAssessmentBySubmissionId(params.id)
    if (!assessment) {
      return NextResponse.json(
        { error: 'assessment_not_found', message: 'No assessment exists for this submission.' },
        { status: 400 },
      )
    }

    // Idempotent: no active episode → already not published.
    const active = await findActivePublication(assessment.id)
    if (!active) {
      return NextResponse.json({
        success: true,
        alreadyRevoked: true,
        assessmentNumber: assessment.assessment_number,
      })
    }

    await revokeActivePublication({
      assessmentId: assessment.id,
      revokedBy: authUser.id,
      revokedReason: reason,
    })

    return NextResponse.json({ success: true, assessmentNumber: assessment.assessment_number })
  } catch (err: any) {
    console.error('[revoke-publication] Error:', err)
    return NextResponse.json({ error: 'Internal server error', detail: err?.message }, { status: 500 })
  }
}
