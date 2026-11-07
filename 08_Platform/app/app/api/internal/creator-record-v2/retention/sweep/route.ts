import { NextRequest, NextResponse } from 'next/server'
import { verifySweepAuthorization } from '@/lib/payments/sweep-auth'
import { runRetentionSweep } from '@/lib/creator-record/evidence-intake/retention'
import { productionRetentionDeps } from '@/lib/creator-record-flow/retention-production'

/**
 * CR-V2-MVP-RETENTION-M1A — scheduled Creator Record original-document retention (GitHub Actions, every 6 hours, so a failed object
 * removal is retried many times inside the 7-day window). Bearer CREATOR_RECORD_RETENTION_SWEEP_SECRET (its own secret, not the
 * payment sweep's); fails closed when unconfigured. Every decision is the database's (20261111000000); the response carries counts
 * and fixed codes only. Non-2xx (so the scheduled job fails and GitHub notifies) on any failure or anything overdue.
 */

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(request: NextRequest) {
  const auth = verifySweepAuthorization(request.headers.get('authorization'), process.env.CREATOR_RECORD_RETENTION_SWEEP_SECRET)
  if (auth === 'not_configured') return NextResponse.json({ error: 'Sweep not configured' }, { status: 503 })
  if (auth !== 'ok') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const report = await runRetentionSweep(productionRetentionDeps())
    return NextResponse.json(report, { status: report.ok ? 200 : 500 })
  } catch (err) {
    console.error('Creator Record retention sweep error', String(err))
    return NextResponse.json({ error: 'Retention sweep failed' }, { status: 500 })
  }
}
