/**
 * /api/creator-record-v2/evidence/[id]/examination   (CR-V2-EXAM-INTEGRATION-X2)
 *
 * POST — examine one of the signed-in creator's own stored documents (replay only). Body: empty or `{}`.
 * GET  — that document's examination history, every stored run re-verified.
 *
 * Stopped by default: while CREATOR_RECORD_V2_SUBMISSIONS is 'stopped' (Production) both answer 503 before anything
 * else is read. Invite-only. Even when open, the database permits an examination read only under the isolated-test
 * marker or an active UAT grant for this identity and document; with neither it is refused and nothing is read.
 * The browser never supplies a grant, nonce, envelope or credential. Observations are not verified.
 */
import { NextRequest, NextResponse } from 'next/server'
import { checkCustomerExaminationGate, customerExaminationHistory, requestCustomerExamination } from '@/lib/creator-record/customer-flow/examination'
import { emptyRequestBody, examinationError, productionCustomerExaminationDeps } from '@/lib/creator-record-flow/examination-customer'
import { internalError, NO_STORE, sessionUserId, unauthorized } from '@/lib/creator-record-flow/http'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const userId = await sessionUserId()
  if (!userId) return unauthorized()
  try {
    const deps = productionCustomerExaminationDeps()
    const gated = await checkCustomerExaminationGate(deps, userId)
    if (gated) return examinationError(gated)
    if (!(await emptyRequestBody(request))) return examinationError({ status: 400, code: 'invalid_request' })
    const r = await requestCustomerExamination(deps, userId, params.id)
    return r.ok ? NextResponse.json({ examination: { run_id: r.run_id, result: r.result } }, { status: 200, headers: NO_STORE }) : examinationError(r)
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
