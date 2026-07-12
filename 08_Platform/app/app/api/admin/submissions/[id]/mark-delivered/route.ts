import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import {
  findAssessmentBySubmissionId,
  transitionProcessingStatus,
} from '@/lib/assessments/repository'

type RouteContext = { params: { id: string } }

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

    // Look up the assessment for this submission
    const assessment = await findAssessmentBySubmissionId(params.id)
    if (!assessment) {
      return NextResponse.json(
        { error: 'No assessment found for this submission. Sign the assessment first.' },
        { status: 400 },
      )
    }

    if (assessment.processing_status !== 'SIGNED') {
      return NextResponse.json(
        { error: `Cannot mark delivered: assessment is in ${assessment.processing_status} state. Must be SIGNED.` },
        { status: 400 },
      )
    }

    await transitionProcessingStatus(assessment.id, 'DELIVERED')

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[mark-delivered] Error:', err)
    return NextResponse.json({ error: 'Internal server error', detail: err?.message }, { status: 500 })
  }
}
