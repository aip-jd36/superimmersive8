/**
 * GET /api/creator-record-v2/prepared/[id]   (CR-V2-MVP-M2)
 *
 * The signed-in owner's view of one prepared version, re-verified against its
 * digest. Anyone else's record is indistinguishable from a missing one (404).
 */
import { getPrepared } from '@/lib/creator-record/customer-flow/service'
import { productionFlowDeps } from '@/lib/creator-record-flow/production'
import { internalError, respond, sessionUserId, unauthorized } from '@/lib/creator-record-flow/http'

export const dynamic = 'force-dynamic'

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const userId = await sessionUserId()
  if (!userId) return unauthorized()
  try {
    return respond(await getPrepared(productionFlowDeps(), userId, params.id))
  } catch (err) {
    console.error('[creator-record-v2/prepared/get] failed', { error: err instanceof Error ? err.message : 'unknown' })
    return internalError()
  }
}
