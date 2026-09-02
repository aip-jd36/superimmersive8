/**
 * GET /api/admin/crc-leads/sessions/[session_id]/answer-context (CAH-3B).
 *
 * SECONDARY, lazy, current-governed-knowledge view. Separate endpoint so
 * the default contact detail never pays the recompute cost and never fails
 * because of it. Returns { available: false } on any recompute failure or
 * for a non-eligible session -- the caller degrades gracefully.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireCrcLeadAccess } from '@/lib/crc-sales/auth'
import { getEligibleSessionForAnswerContext } from '@/lib/crc-sales/repository'
import { buildSalesAnswerContext } from '@/lib/crc-sales/answer-context'

export const dynamic = 'force-dynamic'

const UNAVAILABLE = {
  available: false as const,
  temporal_note:
    'This reflects SI8’s current governed knowledge, recomputed now from the customer’s CRC project state. ' +
    'It is not a record of exactly what CRC told the customer during the conversation.',
}

export async function GET(_req: NextRequest, { params }: { params: { session_id: string } }) {
  const access = await requireCrcLeadAccess()
  if (!access.ok) return NextResponse.json({ error: access.status === 401 ? 'Unauthorized' : 'Forbidden' }, { status: access.status })

  try {
    const loaded = await getEligibleSessionForAnswerContext(params.session_id)
    if (!loaded) return NextResponse.json(UNAVAILABLE)
    return NextResponse.json(buildSalesAnswerContext(loaded.su, loaded.runtime_commit))
  } catch (err) {
    console.error('[api/admin/crc-leads/.../answer-context] failed', err)
    return NextResponse.json(UNAVAILABLE)
  }
}
