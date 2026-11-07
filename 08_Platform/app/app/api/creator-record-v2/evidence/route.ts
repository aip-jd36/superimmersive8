/**
 * /api/creator-record-v2/evidence   (CR-V2-DOC-1)
 *
 * GET  — the signed-in creator's stored documents (metadata only).
 * POST — add one document: multipart `file` + `consent` (the consent identifier), at most 1 MiB (CR-V2-MVP-M2A: the live examination's limit).
 *
 * Stopped by default: while CREATOR_RECORD_V2_SUBMISSIONS is 'stopped' (Production) both answer 503 before
 * any body is read. Invite-only. While the evidence code lock is in place only SI8's synthetic test
 * documents are stored. Nothing is examined.
 */
import { NextRequest, NextResponse } from 'next/server'
import { listEvidence } from '@/lib/creator-record/evidence-intake/service'
import { productionEvidenceDeps } from '@/lib/creator-record-flow/evidence-production'
import { evidenceError } from '@/lib/creator-record-flow/evidence-http'
import { handleEvidenceUpload } from '@/lib/creator-record-flow/route-handlers'
import { internalError, NO_STORE, sessionUserId, unauthorized } from '@/lib/creator-record-flow/http'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  const userId = await sessionUserId()
  if (!userId) return unauthorized()
  try {
    const r = await listEvidence(productionEvidenceDeps(), userId)
    return r.ok ? NextResponse.json({ documents: r.documents }, { status: 200, headers: NO_STORE }) : evidenceError(r)
  } catch (err) {
    console.error('[creator-record-v2/evidence] list failed', { error: err instanceof Error ? err.message : 'unknown' })
    return internalError()
  }
}

export async function POST(request: NextRequest) {
  const userId = await sessionUserId()
  if (!userId) return unauthorized()
  try {
    return await handleEvidenceUpload(request, userId, productionEvidenceDeps())
  } catch (err) {
    console.error('[creator-record-v2/evidence] upload failed', { error: err instanceof Error ? err.message : 'unknown' })
    return internalError()
  }
}
