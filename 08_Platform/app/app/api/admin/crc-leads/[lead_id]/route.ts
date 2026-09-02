/**
 * GET /api/admin/crc-leads/[lead_id] -- one contact + its eligible sessions
 * with bounded default structured context (CAH-3B).
 *
 * No transcript. No recompute. A corrupt session's project facts are
 * absent (never fabricated); the session still lists if eligibility was
 * safely established from columns.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireCrcLeadAccess } from '@/lib/crc-sales/auth'
import { getSalesContactDetail } from '@/lib/crc-sales/repository'

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest, { params }: { params: { lead_id: string } }) {
  const access = await requireCrcLeadAccess()
  if (!access.ok) return NextResponse.json({ error: access.status === 401 ? 'Unauthorized' : 'Forbidden' }, { status: access.status })

  try {
    const detail = await getSalesContactDetail(params.lead_id)
    if (!detail) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(detail)
  } catch (err) {
    console.error('[api/admin/crc-leads/[lead_id]] failed', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
