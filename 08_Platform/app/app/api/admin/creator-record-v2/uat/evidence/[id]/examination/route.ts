/**
 * Admin-only UAT: replay the examination of one of the administrator's own fixtures, or read its history.
 * The database re-checks is_admin, ownership and the fixture for every read and run. Replay only: no model is reachable.
 * Authenticates an administrator on every request, then calls the customer service with the admin dependencies
 * (lib/creator-record-flow/admin-uat.ts). The identity is the session user, never a request value.
 */
import { NextRequest, NextResponse } from 'next/server'
import { customerExaminationHistory } from '@/lib/creator-record/customer-flow/examination'
import { adminUatExaminationDeps, adminUatSession } from '@/lib/creator-record-flow/admin-uat'
import { examinationError } from '@/lib/creator-record-flow/examination-customer'
import { internalError, NO_STORE } from '@/lib/creator-record-flow/http'
import { handleExaminationRequest } from '@/lib/creator-record-flow/route-handlers'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await adminUatSession()
    if (!session.ok) return session.response
    return await handleExaminationRequest(request, session.userId, params.id, adminUatExaminationDeps(session.userId))
  } catch (err) {
    console.error('[creator-record-v2/admin-uat/examine] failed', { error: err instanceof Error ? err.message : 'unknown' })
    return internalError()
  }
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await adminUatSession()
    if (!session.ok) return session.response
    const r = await customerExaminationHistory(adminUatExaminationDeps(session.userId), session.userId, params.id)
    return r.ok ? NextResponse.json({ runs: r.runs }, { status: 200, headers: NO_STORE }) : examinationError(r)
  } catch (err) {
    console.error('[creator-record-v2/admin-uat/history] failed', { error: err instanceof Error ? err.message : 'unknown' })
    return internalError()
  }
}
