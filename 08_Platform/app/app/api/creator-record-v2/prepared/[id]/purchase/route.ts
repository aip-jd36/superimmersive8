/**
 * POST /api/creator-record-v2/prepared/[id]/purchase   (CR-V2-MVP-M3)
 *
 * The signed-in owner turns their reviewed (latest) version into a Creator Record v2
 * submission, atomically and idempotently: repeating it returns the same submission.
 * No body is read. The client then calls the existing POST /api/checkout/create-session
 * with that submission id, which re-checks everything before any Stripe call.
 */
import { NextResponse } from 'next/server'
import { startPurchase } from '@/lib/creator-record/customer-flow/purchase'
import { productionPurchaseDeps } from '@/lib/creator-record-flow/production'
import { internalError, NO_STORE, purchaseMessage, sessionUserId, unauthorized } from '@/lib/creator-record-flow/http'

export const dynamic = 'force-dynamic'

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  const userId = await sessionUserId()
  if (!userId) return unauthorized()
  try {
    const result = await startPurchase(productionPurchaseDeps(), userId, params.id)
    if (result.ok) return NextResponse.json({ submission_id: result.submission_id }, { status: 200, headers: NO_STORE })
    return NextResponse.json({ error: purchaseMessage(result.code), code: result.code }, { status: result.status, headers: NO_STORE })
  } catch (err) {
    console.error('[creator-record-v2/prepared/purchase] failed', { error: err instanceof Error ? err.message : 'unknown' })
    return internalError()
  }
}
