/**
 * Admin-only UAT: prepare a new synthetic version.
 * Authenticates an administrator on every request, then calls the customer service with the admin dependencies
 * (lib/creator-record-flow/admin-uat.ts). The identity is the session user, never a request value.
 */
import { NextRequest } from 'next/server'
import { adminUatFlowDeps, adminUatSession } from '@/lib/creator-record-flow/admin-uat'
import { internalError } from '@/lib/creator-record-flow/http'
import { handlePrepareRequest } from '@/lib/creator-record-flow/route-handlers'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const session = await adminUatSession()
    if (!session.ok) return session.response
    return await handlePrepareRequest(request, session.userId, () => adminUatFlowDeps(session.userId))
  } catch (err) {
    console.error('[creator-record-v2/admin-uat/prepare] failed', { error: err instanceof Error ? err.message : 'unknown' })
    return internalError()
  }
}
