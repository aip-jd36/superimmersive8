/**
 * Admin-only UAT: confirm a synthetic version, which freezes it. Nothing is purchased or issued.
 * Authenticates an administrator on every request, then calls the customer service with the admin dependencies
 * (lib/creator-record-flow/admin-uat.ts). The identity is the session user, never a request value.
 */
import { reviewPrepared } from '@/lib/creator-record/customer-flow/service'
import { adminUatFlowDeps, adminUatSession } from '@/lib/creator-record-flow/admin-uat'
import { internalError, respond } from '@/lib/creator-record-flow/http'

export const dynamic = 'force-dynamic'

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await adminUatSession()
    if (!session.ok) return session.response
    return respond(await reviewPrepared(adminUatFlowDeps(session.userId), session.userId, params.id))
  } catch (err) {
    console.error('[creator-record-v2/admin-uat/review] failed', { error: err instanceof Error ? err.message : 'unknown' })
    return internalError()
  }
}
