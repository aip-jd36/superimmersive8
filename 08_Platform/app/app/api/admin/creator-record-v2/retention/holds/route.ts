/**
 * POST /api/admin/creator-record-v2/retention/holds   (CR-V2-MVP-RETENTION-M1A)
 *
 * A named admin (the signed-in admin account; the database re-checks users.is_admin) places, renews or releases an administrative
 * hold on one owner-uploaded original. JSON body, closed keys:
 *   { "action": "place",   "document_id": uuid, "reason": 10–1000 chars, "days": 1–30 }
 *   { "action": "renew",   "hold_id": uuid,     "reason": 10–1000 chars, "days": 1–30 }   (explicit; of an active hold, once)
 *   { "action": "release", "hold_id": uuid,     "reason": 10–1000 chars }
 * A hold cannot be placed or renewed while a deletion request is open for the document (409 deletion_request_open). Every action is
 * recorded in the retention event log with the admin's id and reason.
 */
import { NextRequest, NextResponse } from 'next/server'
import { applyHoldAction } from '@/lib/creator-record/evidence-intake/retention'
import { productionRetentionDeps } from '@/lib/creator-record-flow/retention-production'
import { readJsonBody, retentionError } from '@/lib/creator-record-flow/retention-http'
import { isAdminUser } from '@/lib/creator-record-flow/evidence-http'
import { internalError, NO_STORE, sessionUserId, unauthorized } from '@/lib/creator-record-flow/http'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const userId = await sessionUserId()
  if (!userId) return unauthorized()
  if (!(await isAdminUser(userId))) return NextResponse.json({ code: 'not_found' }, { status: 404, headers: NO_STORE })
  const body = await readJsonBody(req)
  try {
    const r = await applyHoldAction(productionRetentionDeps(), userId, body)
    return r.ok ? NextResponse.json({ hold_id: r.hold_id, result: r.result }, { status: 200, headers: NO_STORE }) : retentionError(r)
  } catch (err) {
    console.error('[admin/creator-record-v2/retention] hold action failed', { error: err instanceof Error ? err.message : 'unknown' })
    return internalError()
  }
}
