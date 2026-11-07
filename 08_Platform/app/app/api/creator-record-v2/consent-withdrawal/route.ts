/**
 * /api/creator-record-v2/consent-withdrawal   (CR-V2-MVP-RETENTION-M1A; GET added by CR-V2-MVP-LAUNCH-FOUNDATION-1)
 *
 * POST — the signed-in creator withdraws consent: from now on no AI examination of any document they uploaded under it (the
 * database refuses every new examination read, reservation and recorded attempt, and refuses a new AI-examination permission for
 * those documents), and unissued records relying on them are paused. Body: `{ "confirm": true }` (JSON). Idempotent. Documents are
 * not deleted by this; a deletion request is separate.
 * GET  — the signed-in creator's own consent state: `{ consent: { withdrawn, withdrawn_at } }`. Read-only.
 *
 * Both are available whatever the submissions stop or the pilot invitation.
 */
import { NextRequest, NextResponse } from 'next/server'
import { readConsentState, withdrawEvidenceConsent } from '@/lib/creator-record/evidence-intake/retention'
import { productionRetentionDeps } from '@/lib/creator-record-flow/retention-production'
import { isConfirmation, readJsonBody, retentionError } from '@/lib/creator-record-flow/retention-http'
import { internalError, NO_STORE, sessionUserId, unauthorized } from '@/lib/creator-record-flow/http'

export const dynamic = 'force-dynamic'

export async function GET() {
  const userId = await sessionUserId()
  if (!userId) return unauthorized()
  try {
    const r = await readConsentState(productionRetentionDeps(), userId)
    return r.ok ? NextResponse.json({ consent: { withdrawn: r.withdrawn, withdrawn_at: r.withdrawn_at } }, { status: 200, headers: NO_STORE }) : retentionError(r)
  } catch (err) {
    console.error('[creator-record-v2] consent state failed', { error: err instanceof Error ? err.message : 'unknown' })
    return internalError()
  }
}

export async function POST(req: NextRequest) {
  const userId = await sessionUserId()
  if (!userId) return unauthorized()
  if (!isConfirmation(await readJsonBody(req))) return NextResponse.json({ code: 'invalid_request' }, { status: 400, headers: NO_STORE })
  try {
    const r = await withdrawEvidenceConsent(productionRetentionDeps(), userId)
    return r.ok ? NextResponse.json({ consent_withdrawal: { result: r.result, withdrawn_at: r.withdrawn_at } }, { status: 200, headers: NO_STORE }) : retentionError(r)
  } catch (err) {
    console.error('[creator-record-v2] consent withdrawal failed', { error: err instanceof Error ? err.message : 'unknown' })
    return internalError()
  }
}
