/**
 * POST /api/creator-record-v2/evidence/[id]/deletion-request   (CR-V2-MVP-RETENTION-M1A)
 *
 * The signed-in creator asks for one of their own documents to be deleted. Body: `{ "confirm": true }` (JSON).
 * Available whatever the submissions stop or the pilot invitation (a creator can always ask for their own document to be deleted).
 * Completed at once, or left open with the reason it cannot proceed yet (an administrative hold or an unfinished paid order); the
 * scheduled retention sweep completes it. Response: fixed codes only.
 */
import { NextRequest, NextResponse } from 'next/server'
import { requestEvidenceDeletion } from '@/lib/creator-record/evidence-intake/retention'
import { productionRetentionDeps } from '@/lib/creator-record-flow/retention-production'
import { isConfirmation, readJsonBody, retentionError } from '@/lib/creator-record-flow/retention-http'
import { internalError, NO_STORE, sessionUserId, unauthorized } from '@/lib/creator-record-flow/http'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await sessionUserId()
  if (!userId) return unauthorized()
  if (!isConfirmation(await readJsonBody(req))) return NextResponse.json({ code: 'invalid_request' }, { status: 400, headers: NO_STORE })
  try {
    const r = await requestEvidenceDeletion(productionRetentionDeps(), userId, params.id)
    return r.ok ? NextResponse.json({ deletion_request: r.request }, { status: r.request.status === 'completed' ? 200 : 202, headers: NO_STORE }) : retentionError(r)
  } catch (err) {
    console.error('[creator-record-v2/evidence] deletion request failed', { error: err instanceof Error ? err.message : 'unknown' })
    return internalError()
  }
}
