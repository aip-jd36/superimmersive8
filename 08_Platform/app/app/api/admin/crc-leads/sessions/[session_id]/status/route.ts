/**
 * PATCH /api/admin/crc-leads/sessions/[session_id]/status (CAH-3B, §8).
 *
 * Minimal Sales workflow transition. Body: { to: SalesStatus, close_reason?: SalesCloseReason }.
 * Server-side state-machine validation (lib/crc-sales/workflow.ts):
 *   - invalid transition          -> 409
 *   - CLOSED without close_reason  -> 409
 *   - non-CLOSED with close_reason -> 409
 *   - unknown session / not eligible -> 404
 *   - re-issuing the current status -> 409 (not a silent no-op)
 * A session's transition can never modify another session's row (PK = crc_session_id).
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireCrcLeadAccess } from '@/lib/crc-sales/auth'
import { applySalesTransition } from '@/lib/crc-sales/repository'
import { SALES_STATUSES, SALES_CLOSE_REASONS, type SalesStatus, type SalesCloseReason } from '@/lib/crc-sales/workflow'

export const dynamic = 'force-dynamic'

export async function PATCH(req: NextRequest, { params }: { params: { session_id: string } }) {
  const access = await requireCrcLeadAccess()
  if (!access.ok) return NextResponse.json({ error: access.status === 401 ? 'Unauthorized' : 'Forbidden' }, { status: access.status })

  let body: { to?: unknown; close_reason?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const to = body.to
  if (typeof to !== 'string' || !SALES_STATUSES.includes(to as SalesStatus)) {
    return NextResponse.json({ error: 'Invalid target status' }, { status: 400 })
  }
  let closeReason: SalesCloseReason | null = null
  if (body.close_reason != null) {
    if (typeof body.close_reason !== 'string' || !SALES_CLOSE_REASONS.includes(body.close_reason as SalesCloseReason)) {
      return NextResponse.json({ error: 'Invalid close reason' }, { status: 400 })
    }
    closeReason = body.close_reason as SalesCloseReason
  }

  try {
    const result = await applySalesTransition(params.session_id, to as SalesStatus, closeReason, access.userId)
    if (!result.ok) {
      if (result.code === 'session_not_found') return NextResponse.json({ error: 'Not found' }, { status: 404 })
      return NextResponse.json({ error: result.code }, { status: 409 })
    }
    return NextResponse.json({ workflow: result.workflow })
  } catch (err) {
    console.error('[api/admin/crc-leads/.../status] failed', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
