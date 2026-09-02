/**
 * GET /api/admin/crc-leads -- internal Sales contact list (CAH-3B).
 *
 * Thin handler: auth gate -> repository -> serialize. No business logic.
 * Never includes transcript content. Recompute never happens here.
 */

import { NextResponse } from 'next/server'
import { requireCrcLeadAccess } from '@/lib/crc-sales/auth'
import { listSalesContacts } from '@/lib/crc-sales/repository'

export const dynamic = 'force-dynamic'

export async function GET() {
  const access = await requireCrcLeadAccess()
  if (!access.ok) return NextResponse.json({ error: access.status === 401 ? 'Unauthorized' : 'Forbidden' }, { status: access.status })

  try {
    const contacts = await listSalesContacts()
    return NextResponse.json({ contacts })
  } catch (err) {
    console.error('[api/admin/crc-leads] list failed', err)
    return NextResponse.json({ error: 'Internal error', contacts: [] }, { status: 500 })
  }
}
