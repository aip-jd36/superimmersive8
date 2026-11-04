/**
 * Admin-only UAT: list the administrator's documents, or add a committed synthetic fixture. Anything else is refused.
 * Authenticates an administrator on every request, then calls the customer service with the admin dependencies
 * (lib/creator-record-flow/admin-uat.ts). The identity is the session user, never a request value.
 */
import { NextRequest, NextResponse } from 'next/server'
import { listEvidence } from '@/lib/creator-record/evidence-intake/service'
import { adminUatEvidenceDeps, adminUatSession } from '@/lib/creator-record-flow/admin-uat'
import { evidenceError } from '@/lib/creator-record-flow/evidence-http'
import { internalError, NO_STORE } from '@/lib/creator-record-flow/http'
import { handleEvidenceUpload } from '@/lib/creator-record-flow/route-handlers'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  try {
    const session = await adminUatSession()
    if (!session.ok) return session.response
    const r = await listEvidence(adminUatEvidenceDeps(session.userId), session.userId)
    return r.ok ? NextResponse.json({ documents: r.documents }, { status: 200, headers: NO_STORE }) : evidenceError(r)
  } catch (err) {
    console.error('[creator-record-v2/admin-uat/evidence-list] failed', { error: err instanceof Error ? err.message : 'unknown' })
    return internalError()
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await adminUatSession()
    if (!session.ok) return session.response
    return await handleEvidenceUpload(request, session.userId, adminUatEvidenceDeps(session.userId))
  } catch (err) {
    console.error('[creator-record-v2/admin-uat/evidence-upload] failed', { error: err instanceof Error ? err.message : 'unknown' })
    return internalError()
  }
}
