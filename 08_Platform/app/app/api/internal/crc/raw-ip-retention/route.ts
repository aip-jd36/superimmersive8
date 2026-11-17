import { NextRequest, NextResponse } from 'next/server'
import { verifySweepAuthorization } from '@/lib/payments/sweep-auth'
import { runCrcRawIpRetention } from '@/lib/crc-engine/raw-ip-retention'
import { supabaseAdmin } from '@/lib/supabase/admin'

/**
 * SI8-PRIVACY-CRC-1B — scheduled 30-day retention for crc_pilot_events.raw_ip (GitHub Actions, daily, gated off by default).
 * Bearer CRC_RAW_IP_RETENTION_SWEEP_SECRET (its own secret); fails closed (503) when unconfigured. The database function
 * (20261118000000) makes every decision; the response carries counts and fixed codes only, never an address.
 * Non-2xx on any failure, so the scheduled job fails visibly.
 */

export const dynamic = 'force-dynamic'
export const maxDuration = 30

export async function POST(request: NextRequest) {
  const auth = verifySweepAuthorization(request.headers.get('authorization'), process.env.CRC_RAW_IP_RETENTION_SWEEP_SECRET)
  if (auth === 'not_configured') return NextResponse.json({ error: 'Sweep not configured' }, { status: 503 })
  if (auth !== 'ok') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const report = await runCrcRawIpRetention(supabaseAdmin)
  return NextResponse.json(report, { status: report.ok ? 200 : 500 })
}
