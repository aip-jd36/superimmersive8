/**
 * /api/creator-record-v2/evidence/[id]/examination   (CR-V2-EXAM-INTEGRATION-X2)
 *
 * POST — examine one of the signed-in creator's own stored documents (replay only). Body: empty or `{}`.
 * GET  — that document's examination history, every stored run re-verified.
 *
 * Stopped by default: while CREATOR_RECORD_V2_SUBMISSIONS is 'stopped' (Production) both answer 503 before anything
 * else is read. Invite-only. Even when open, the database decides whether an examination read is permitted; a
 * customer has no such authority today, so it is refused and nothing is read.
 * The browser never supplies a grant, nonce, envelope or credential. Observations are not verified.
 */
import { NextRequest, NextResponse } from 'next/server'
import { customerExaminationHistory } from '@/lib/creator-record/customer-flow/examination'
import { examinationError, productionCustomerExaminationDeps } from '@/lib/creator-record-flow/examination-customer'
import { handleExaminationRequest } from '@/lib/creator-record-flow/route-handlers'
import { internalError, NO_STORE, sessionUserId, unauthorized } from '@/lib/creator-record-flow/http'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const userId = await sessionUserId()
  if (!userId) return unauthorized()
  try {
    return await handleExaminationRequest(request, userId, params.id, productionCustomerExaminationDeps())
  } catch (err) {
    console.error('[creator-record-v2/examination] request failed', { error: err instanceof Error ? err.message : 'unknown' })
    return internalError()
  }
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await sessionUserId()
  if (!userId) return unauthorized()
  try {
    const r = await customerExaminationHistory(productionCustomerExaminationDeps(), userId, params.id)
    return r.ok ? NextResponse.json({ runs: r.runs }, { status: 200, headers: NO_STORE }) : examinationError(r)
  } catch (err) {
    console.error('[creator-record-v2/examination] history failed', { error: err instanceof Error ? err.message : 'unknown' })
    return internalError()
  }
}
