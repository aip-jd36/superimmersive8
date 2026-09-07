import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import {
  findAssessmentBySubmissionId,
  transitionProcessingStatus,
} from '@/lib/assessments/repository'

type RouteContext = { params: { id: string } }

/**
 * POST /api/admin/submissions/[id]/mark-delivered
 *
 * CA-RLK-2a.1 — a downstream integrity backstop. Even though a SIGNED
 * assessment's workbook is now locked (patch_workbook_atomic), delivery
 * still independently requires that the human sign-off is ACTIVE and bound
 * to the current workbook revision. Any failed check performs NO state
 * transition.
 */
export async function POST(_request: NextRequest, { params }: RouteContext) {
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

    const assessment = await findAssessmentBySubmissionId(params.id)
    if (!assessment) {
      return NextResponse.json(
        { error: 'assessment_not_signed_off', message: 'No assessment found for this submission. Sign the assessment first.' },
        { status: 400 },
      )
    }

    if (assessment.processing_status !== 'SIGNED') {
      return NextResponse.json(
        { error: 'not_signed', message: `Cannot mark delivered: assessment is in ${assessment.processing_status} state. Must be SIGNED.` },
        { status: 400 },
      )
    }

    // CA-RLK-2a.1: the human sign-off must be ACTIVE and revision-matched.
    if (assessment.signoff_status !== 'active') {
      return NextResponse.json(
        { error: 'signoff_invalidated', message: 'The sign-off is not active (invalidated by a later edit). Re-sign, regenerate the report, and re-sign the asset before delivering.' },
        { status: 409 },
      )
    }
    if (assessment.signed_workbook_revision == null) {
      return NextResponse.json(
        { error: 'assessment_not_signed_off', message: 'This assessment has no bound workbook revision.' },
        { status: 409 },
      )
    }
    const { data: submission } = await supabaseAdmin
      .from('submissions').select('workbook_revision').eq('id', params.id).single()
    const currentRevision = Number((submission as any)?.workbook_revision ?? 0)
    if (assessment.signed_workbook_revision !== currentRevision) {
      return NextResponse.json(
        { error: 'workbook_changed_since_signoff', message: 'The workbook changed after sign-off. Re-sign and regenerate before delivering.' },
        { status: 409 },
      )
    }

    await transitionProcessingStatus(assessment.id, 'DELIVERED')

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[mark-delivered] Error:', err)
    return NextResponse.json({ error: 'Internal server error', detail: err?.message }, { status: 500 })
  }
}
