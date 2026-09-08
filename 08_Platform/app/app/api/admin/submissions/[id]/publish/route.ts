import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import {
  findAssessmentBySubmissionId,
  findActivePublication,
  createPublicationEpisode,
} from '@/lib/assessments/repository'

type RouteContext = { params: { id: string } }

/**
 * POST /api/admin/submissions/[id]/publish  (CA-RLK-2g)
 *
 * The deliberate, audited act of authorizing a Public Assessment Record for
 * unauthenticated public projection. Server-owned: the client supplies NOTHING
 * — publication_basis (EXPLICIT_AUTHORIZATION), published_by (this admin), and
 * recorded_at (server time) are all derived here / by the DB.
 *
 * A "republish" after a prior revoke is this same call — it inserts a fresh
 * EXPLICIT_AUTHORIZATION episode; the prior revoked episode is untouched.
 *
 * Does NOT touch processing_status, institutional_status, sign-off, workbook,
 * or provenance.
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
        { error: 'assessment_not_found', message: 'No assessment exists for this submission.' },
        { status: 400 },
      )
    }

    if (assessment.processing_status !== 'DELIVERED') {
      return NextResponse.json(
        {
          error: 'not_delivered',
          message: `Cannot publish: assessment is in ${assessment.processing_status} state. It must be DELIVERED before its Public Assessment Record can be authorized.`,
        },
        { status: 409 },
      )
    }

    // Idempotent: already publicly authorized → no-op success, no second row.
    const existing = await findActivePublication(assessment.id)
    if (existing) {
      return NextResponse.json({
        success: true,
        alreadyPublished: true,
        assessmentNumber: assessment.assessment_number,
        episodeId: existing.id,
      })
    }

    const episode = await createPublicationEpisode({
      assessmentId: assessment.id,
      publishedBy: authUser.id,
    })

    return NextResponse.json({
      success: true,
      assessmentNumber: assessment.assessment_number,
      episodeId: episode.id,
    })
  } catch (err: any) {
    console.error('[publish] Error:', err)
    return NextResponse.json({ error: 'Internal server error', detail: err?.message }, { status: 500 })
  }
}
