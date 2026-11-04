/**
 * POST /api/creator-record-v2/prepared   (CR-V2-MVP-M2)
 *
 * Prepares a new version of the signed-in creator's Creator Record v2 from their
 * questionnaire answers. Body: `{ state, draft_id? }`, at most 32 KB. Pilot-gated
 * and stopped by default. Prepares nothing until the approved sources exist.
 */
import { NextRequest } from 'next/server'
import { productionFlowDeps } from '@/lib/creator-record-flow/production'
import { handlePrepareRequest } from '@/lib/creator-record-flow/route-handlers'
import { internalError, sessionUserId, unauthorized } from '@/lib/creator-record-flow/http'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const userId = await sessionUserId()
  if (!userId) return unauthorized()
  try {
    return await handlePrepareRequest(request, userId, productionFlowDeps)
  } catch (err) {
    console.error('[creator-record-v2/prepared] failed', { error: err instanceof Error ? err.message : 'unknown' })
    return internalError()
  }
}
