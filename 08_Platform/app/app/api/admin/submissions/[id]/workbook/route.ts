import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { patchWorkbookAtomic } from '@/lib/assessments/repository'

type RouteContext = { params: { id: string } }

// Milestone detection — write-only internal audit trail (workbook_snapshots).
// Best-effort, runs AFTER the atomic workbook write. Nothing reads it back;
// it is not part of the canonical Assessment Registry.
async function checkMilestones(
  submissionId: string,
  workbook: Record<string, any>,
  snapshotTag: string,
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

  const { data: existing } = await supabaseAdmin
    .from('workbook_snapshots')
    .select('milestone')
    .eq('submission_id', submissionId)

  const already = new Set((existing ?? []).map((r: any) => r.milestone))

  for (const [milestone, met] of Object.entries(conditions)) {
    if (met && !already.has(milestone)) {
      await supabaseAdmin.from('workbook_snapshots').insert({
        submission_id: submissionId,
        assess_id: snapshotTag,
        milestone,
        snapshot_data: workbook,
      })
    }
  }
}

/**
 * PATCH — save the workbook (CA-RLK-2a).
 *
 * ONE atomic operation (patch_workbook_atomic RPC): update workbook_data,
 * increment submissions.workbook_revision, and — if an ACTIVE durable sign-off
 * exists on a pre-delivery assessment — flip it to 'invalidated' while
 * PRESERVING signed_off_by / signed_off_at / signed_workbook_revision, and
 * (if REPORT_GENERATED) revert to DRAFT and clear the stale report binding.
 *
 * A DELIVERED assessment blocks the whole save with 409 — no workbook mutation,
 * no revision bump, no invalidation.
 */
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

    const result = await patchWorkbookAtomic(params.id, workbook_data, authUser.id)
    if (!result.ok) {
      if (result.code === 'delivered') {
        return NextResponse.json(
          { error: 'delivered', message: 'This assessment has been delivered and its workbook is locked.' },
          { status: 409 },
        )
      }
      if (result.code === 'submission_not_found') {
        return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
      }
      return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
    }

    // Best-effort audit snapshot — never blocks the save response.
    await checkMilestones(params.id, workbook_data, params.id).catch(err =>
      console.error('Milestone check failed:', err)
    )

    return NextResponse.json({
      savedAt: new Date().toISOString(),
      workbookRevision: result.workbookRevision,
      signoffInvalidated: result.signoffInvalidated,
      reportInvalidated: result.reportInvalidated,
    })
  } catch (err: any) {
    console.error('Error in workbook save route:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
