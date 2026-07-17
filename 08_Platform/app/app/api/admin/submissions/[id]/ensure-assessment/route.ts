import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { createAssessmentFromWorkbook, syncDraftAssessmentFromWorkbook } from '@/lib/assessments/service'
import type { AssessmentOutcome } from '@/types/assessment'

type RouteContext = { params: { id: string } }

const VALID_OUTCOMES = new Set<AssessmentOutcome>([
  'EVIDENCE_SUPPORTS',
  'EVIDENCE_SUPPORTS_WITH_CONDITIONS',
  'MATERIAL_RISKS_IDENTIFIED',
  'INSUFFICIENT_EVIDENCE',
  'UNABLE_TO_ASSESS',
])

/**
 * Get-or-create the canonical assessment for a submission and return its
 * assessment_number, so the report PDF can be stamped with the real
 * Registry number instead of the legacy submissions.assess_id field.
 *
 * Called by Section7Brief's "Generate Report" / "Download source" actions
 * before building the Typst content — the assessment must exist first
 * because the number is embedded in the document itself, not attached to it
 * afterward.
 *
 * Requires an outcome (assessments.outcome is NOT NULL), which is why this
 * can't run any earlier than Section 6 being filled in — matches the
 * existing "Generate Report only available once Section 6 is complete" gate
 * in the workbook UI.
 */
export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
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

    const { outcome } = await request.json()
    if (!outcome || !VALID_OUTCOMES.has(outcome)) {
      return NextResponse.json(
        { error: `Missing or invalid outcome: "${outcome}". Complete Section 6 before generating a report.` },
        { status: 400 },
      )
    }

    // Create-or-return. Never mutates an existing row's outcome.
    const assessment = await createAssessmentFromWorkbook(params.id, outcome as AssessmentOutcome)

    // Reconcile outcome drift explicitly, only while still DRAFT. If the
    // assessment has already moved past DRAFT (a report was generated and
    // then invalidated, or — defensively — some other path), the workbook
    // autosave route is responsible for having already reverted it to DRAFT
    // when the outcome changed; if it somehow hasn't, sync throws rather
    // than silently drifting.
    const synced = assessment.processing_status === 'DRAFT'
      ? await syncDraftAssessmentFromWorkbook(assessment.id, outcome as AssessmentOutcome)
      : assessment

    return NextResponse.json({
      assessmentId:     synced.id,
      assessmentNumber: synced.assessment_number,
      processingStatus: synced.processing_status,
    })
  } catch (error: any) {
    console.error('[ensure-assessment]', error)
    return NextResponse.json(
      { error: error?.message ?? 'Failed to get or create assessment' },
      { status: 500 },
    )
  }
}
