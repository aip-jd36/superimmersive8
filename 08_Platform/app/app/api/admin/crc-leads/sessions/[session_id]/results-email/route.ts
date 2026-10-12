/**
 * GET /api/admin/crc-leads/sessions/[session_id]/results-email
 * (CRC-EMAIL-HISTORY-1B).
 *
 * FAIL-CLOSED AUDITED results-email-history access, mirroring the
 * transcript route's own required sequence exactly (CAH-3B §19):
 *
 *   authenticate/authorize
 *   -> verify target session is on an authorized lead/session path
 *      (see repository.ts's getResultsEmailHistoryForSession for the exact
 *      authority rule -- deliberately NOT isSalesEligible)
 *   -> load persisted artifact + delivery-attempt history
 *   -> PERSIST the results-email-view audit event (throws on failure)
 *   -> only then return artifact content
 *
 * If the audit row cannot be persisted, NO artifact content is returned.
 *
 * This route is a pure READ projection over already-persisted rows. It
 * never calls runCRCConversation, Retrieval, Bounded Interpretation,
 * Composition, results-email generation, or results-email delivery, and it
 * never mutates / regenerates / resends anything.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireCrcLeadAccess } from '@/lib/crc-sales/auth'
import { getResultsEmailHistoryForSession, recordResultsEmailViewAudit } from '@/lib/crc-sales/repository'

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest, { params }: { params: { session_id: string } }) {
  const access = await requireCrcLeadAccess()
  if (!access.ok) return NextResponse.json({ error: access.status === 401 ? 'Unauthorized' : 'Forbidden' }, { status: access.status })

  let result
  try {
    result = await getResultsEmailHistoryForSession(params.session_id)
  } catch (err) {
    console.error('[api/admin/crc-leads/.../results-email] load failed', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
  if (!result.found) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Audit MUST be durably recorded before any artifact content is
  // returned. A failure here denies the content (mirrors transcript route).
  try {
    await recordResultsEmailViewAudit(access.userId, params.session_id)
  } catch (err) {
    console.error('[api/admin/crc-leads/.../results-email] audit persistence failed — denying content', err)
    return NextResponse.json({ error: 'Results email unavailable — access could not be recorded.' }, { status: 503 })
  }

  return NextResponse.json({ artifacts: result.artifacts })
}
