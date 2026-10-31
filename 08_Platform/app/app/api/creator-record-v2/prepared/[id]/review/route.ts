/**
 * POST /api/creator-record-v2/prepared/[id]/review   (CR-V2-MVP-M2)
 *
 * The signed-in owner confirms the declarations of the draft's latest version,
 * freezing it for later payment binding. No body is read: the version is
 * identified by its id alone, and its content can no longer change.
 */
import { reviewPrepared } from '@/lib/creator-record/customer-flow/service'
import { productionFlowDeps } from '@/lib/creator-record-flow/production'
import { internalError, respond, sessionUserId, unauthorized } from '@/lib/creator-record-flow/http'

export const dynamic = 'force-dynamic'

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  const userId = await sessionUserId()
  if (!userId) return unauthorized()
  try {
    return respond(await reviewPrepared(productionFlowDeps(), userId, params.id))
  } catch (err) {
    console.error('[creator-record-v2/prepared/review] failed', { error: err instanceof Error ? err.message : 'unknown' })
    return internalError()
  }
}
