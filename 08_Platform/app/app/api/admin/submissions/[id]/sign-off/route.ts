/**
 * POST /api/admin/submissions/[id]/sign-off  (CA-RLK-2a)
 *
 * The reviewer's durable HUMAN DECISION act. Creates (or re-signs) the
 * canonical assessment row — this, not "Generate Report", is what turns a
 * review into a completed SI8 Commercial Assurance Assessment.
 *
 * The client body carries NO authority values. The actor is the authenticated
 * user id; the sign-off timestamp, assessment date, methodology, scope, and
 * asset descriptors are all server/DB-derived. The outcome is read from the
 * canonical workbook (Section 6), never from the request.
 *
 * Body: {} (nothing required). An optional `{ confirm: true }` is accepted but
 * not required — the button click is the confirmation.
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { signOffAssessment } from '@/lib/assessments/service'

export const dynamic = 'force-dynamic'

export async function POST(_request: NextRequest, { params }: { params: { id: string } }) {
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

  try {
    const result = await signOffAssessment(params.id, authUser.id)

    if (result.ok) {
      const a = result.assessment
      return NextResponse.json({
        ok: true,
        created: result.created ?? false,
        resigned: result.resigned ?? false,
        idempotent: result.idempotent ?? false,
        assessmentId: a.id,
        assessmentNumber: a.assessment_number,
        signoffStatus: a.signoff_status,
        signedOffAt: a.signed_off_at,
        signedWorkbookRevision: a.signed_workbook_revision,
        processingStatus: a.processing_status,
      })
    }

    switch (result.code) {
      case 'incomplete':
        return NextResponse.json(
          { ok: false, code: 'incomplete', reasons: result.reasons },
          { status: 422 },
        )
      case 'workbook_changed':
        return NextResponse.json(
          { ok: false, code: 'workbook_changed', error: 'The workbook changed while signing off. Review the current state and sign off again.' },
          { status: 409 },
        )
      case 'not_pre_delivery':
        return NextResponse.json(
          { ok: false, code: 'not_pre_delivery', error: `This assessment can no longer be signed off (state: ${result.detail}).` },
          { status: 409 },
        )
      case 'unknown_methodology':
        return NextResponse.json(
          { ok: false, code: 'unknown_methodology', error: `No domain-scope mapping for methodology "${result.detail}". Sign-off blocked (fail-closed).` },
          { status: 500 },
        )
      case 'submission_not_found':
        return NextResponse.json({ ok: false, code: 'submission_not_found', error: 'Submission not found.' }, { status: 404 })
      default:
        return NextResponse.json({ ok: false, code: 'error' }, { status: 500 })
    }
  } catch (err: any) {
    console.error('[sign-off]', err)
    return NextResponse.json({ ok: false, error: err?.message ?? 'Sign-off failed' }, { status: 500 })
  }
}
