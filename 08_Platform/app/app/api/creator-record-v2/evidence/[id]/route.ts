/**
 * DELETE /api/creator-record-v2/evidence/[id]   (CR-V2-DOC-1)
 *
 * Deletes one of the signed-in creator's documents, only while no prepared version references it (a
 * referenced document is retained: 409). Stopped by default and invite-only, like adding documents.
 */
import { NextRequest, NextResponse } from 'next/server'
import { deleteEvidence } from '@/lib/creator-record/evidence-intake/service'
import { productionEvidenceDeps } from '@/lib/creator-record-flow/evidence-production'
import { evidenceError } from '@/lib/creator-record-flow/evidence-http'
import { internalError, NO_STORE, sessionUserId, unauthorized } from '@/lib/creator-record-flow/http'

export const dynamic = 'force-dynamic'

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await sessionUserId()
  if (!userId) return unauthorized()
  try {
    const r = await deleteEvidence(productionEvidenceDeps(), userId, params.id)
    return r.ok ? NextResponse.json({ deleted: true }, { status: 200, headers: NO_STORE }) : evidenceError(r)
  } catch (err) {
    console.error('[creator-record-v2/evidence] delete failed', { error: err instanceof Error ? err.message : 'unknown' })
    return internalError()
  }
}
