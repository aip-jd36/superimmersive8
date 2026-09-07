import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { findAssessmentBySubmissionId } from '@/lib/assessments/repository'

type RouteContext = { params: { id: string } }

/**
 * POST /api/admin/submissions/[id]/ensure-assessment  (CA-RLK-2a — lookup only)
 *
 * Was: create-or-return the canonical assessment (accepting an outcome).
 * Now: verify a valid, ACTIVE, revision-matched durable sign-off exists.
 * Generate Report (§ 7) calls this before building the Typst content — the
 * assessment_number must already exist, and it now exists only as the product
 * of a server-validated human sign-off (POST /sign-off).
 *
 * This route NEVER creates an assessment and NEVER accepts an outcome.
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
        { error: 'assessment_not_signed_off', message: 'Sign off the assessment in § 6 before generating the report.' },
        { status: 400 },
      )
    }
    if (assessment.signoff_status !== 'active') {
      return NextResponse.json(
        { error: 'signoff_invalidated', message: 'The sign-off was invalidated by a later workbook edit. Re-sign in § 6.' },
        { status: 400 },
      )
    }

    const { data: submission } = await supabaseAdmin
      .from('submissions').select('workbook_revision').eq('id', params.id).single()
    const currentRevision = Number((submission as any)?.workbook_revision ?? 0)
    if (assessment.signed_workbook_revision !== currentRevision) {
      return NextResponse.json(
        {
          error: 'workbook_changed_since_signoff',
          message: 'The workbook changed after sign-off. Re-sign in § 6 before generating the report.',
        },
        { status: 400 },
      )
    }

    return NextResponse.json({
      assessmentId:     assessment.id,
      assessmentNumber: assessment.assessment_number,
      processingStatus: assessment.processing_status,
    })
  } catch (error: any) {
    console.error('[ensure-assessment]', error)
    return NextResponse.json(
      { error: error?.message ?? 'Failed to verify sign-off' },
      { status: 500 },
    )
  }
}
