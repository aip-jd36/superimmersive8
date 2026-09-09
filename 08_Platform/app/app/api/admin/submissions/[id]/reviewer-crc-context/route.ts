/**
 * GET /api/admin/submissions/[id]/reviewer-crc-context  (CAH-4B)
 *
 * READ-ONLY. Returns the CRC context associated with a submission the
 * authenticated reviewer may access — association provenance, a bounded
 * non-interpreting projection of the customer's CRC project state, and a
 * neutral state-change comparison. CRC context is customer-provided context,
 * NOT assessment evidence.
 *
 * Authority-relevant inputs are server-derived: the acting user from the
 * session, and the SUBMISSION from the path. The client supplies NOTHING —
 * there is no request body, and no `crc_session_id` parameter of any kind: the
 * CRC session is resolved server-side from the authoritative
 * `crc_assurance_associations` row for this submission
 * (`getReviewerCrcContext` -> `listActiveAssociationsForSubmission`).
 *
 * This route performs no write. It imports the reviewer-context read service
 * and its auth wrapper only — never `@/lib/assessments`, never the workbook
 * write path.
 */

import { NextRequest, NextResponse } from 'next/server'
import { checkReviewerContextAccess } from '@/lib/reviewer-context/auth'
import { getReviewerCrcContext } from '@/lib/reviewer-context/service'

export const dynamic = 'force-dynamic'

type RouteContext = { params: { id: string } }

export async function GET(_request: NextRequest, { params }: RouteContext) {
  const access = await checkReviewerContextAccess()
  if (!access.ok) {
    return NextResponse.json(
      { error: access.status === 401 ? 'Unauthorized' : 'Forbidden' },
      { status: access.status },
    )
  }

  const context = await getReviewerCrcContext(params.id)
  return NextResponse.json(context)
}
