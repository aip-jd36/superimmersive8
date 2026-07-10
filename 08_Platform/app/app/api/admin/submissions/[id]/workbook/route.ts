import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

type RouteContext = { params: { id: string } }

// Milestone detection — returns which milestones are newly met so the caller
// can write immutable snapshots. Checks existing snapshots to avoid duplicates.
async function checkMilestones(
  submissionId: string,
  workbook: Record<string, any>,
  assessId: string,
): Promise<void> {
  const s1 = workbook.section_1?.scope_checks ?? {}
  const s3 = workbook.section_3 ?? {}
  const s5 = workbook.section_5 ?? {}
  const s6 = workbook.section_6 ?? {}

  const CONTROLS = ['A01','R01','R02','R03','R04','H01','H02','I01','I02','I03','L01','L02','L03','T01','D01','D02']

  const conditions: Record<string, boolean> = {
    intake_complete:
      !!(s1.no_list_reviewed && s1.custodian_declaration && s1.indemnification_confirmed &&
         s1.video_accessible && s1.certified_tier),
    evidence_complete:
      CONTROLS.every(id => !!(s3[id]?.judgment)),
    findings_complete:
      Array.isArray(s5.findings) && s5.findings.length > 0,
    signed_off:
      s6.signed_off === true,
  }

  // Fetch already-written milestones for this submission
  const { data: existing } = await supabaseAdmin
    .from('workbook_snapshots')
    .select('milestone')
    .eq('submission_id', submissionId)

  const already = new Set((existing ?? []).map((r: any) => r.milestone))

  for (const [milestone, met] of Object.entries(conditions)) {
    if (met && !already.has(milestone)) {
      await supabaseAdmin.from('workbook_snapshots').insert({
        submission_id: submissionId,
        assess_id: assessId,
        milestone,
        snapshot_data: workbook,
      })
    }
  }
}

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
    const { workbook_data } = body as { workbook_data: Record<string, any> }
    if (!workbook_data) {
      return NextResponse.json({ error: 'workbook_data required' }, { status: 400 })
    }

    const { data: sub } = await supabaseAdmin
      .from('submissions')
      .select('assess_id')
      .eq('id', params.id)
      .single()

    const { error: updateError } = await supabaseAdmin
      .from('submissions')
      .update({ workbook_data })
      .eq('id', params.id)

    if (updateError) {
      return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
    }

    // Milestone check — best-effort, don't block the save response on failure
    if (sub?.assess_id) {
      await checkMilestones(params.id, workbook_data, sub.assess_id).catch(err =>
        console.error('Milestone check failed:', err)
      )
    }

    return NextResponse.json({ savedAt: new Date().toISOString() })
  } catch (err: any) {
    console.error('Error in workbook save route:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
