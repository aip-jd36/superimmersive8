import { NextRequest, NextResponse } from 'next/server'
import { verifySweepAuthorization } from '@/lib/payments/sweep-auth'
import { countAttention, listRetryCandidates } from '@/lib/payments/repository'
import { runPaymentFulfillment, type FulfillmentRunStatus } from '@/lib/payments/run-payment-fulfillment'
import { productionFulfillmentDeps } from '@/lib/payments/fulfillment-deps'

/**
 * CAA-SECURITY-3B — scheduled payment-fulfillment recovery (hourly, GitHub
 * Actions). Bearer PAYMENT_SWEEP_SECRET; fails closed when unconfigured.
 *
 * Bounded: at most SWEEP_BATCH rows per run, oldest first, and no new claims
 * after SWEEP_BUDGET_MS. Eligibility (attempt limit, retry window, unknown
 * email) is decided by claim_payment_fulfillment(); ineligible rows move to
 * the durable manual queue (needs_reconciliation), which has no age cutoff.
 */

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const SWEEP_BATCH = 10
const SWEEP_BUDGET_MS = 45_000

export async function POST(request: NextRequest) {
  const auth = verifySweepAuthorization(request.headers.get('authorization'), process.env.PAYMENT_SWEEP_SECRET)
  if (auth === 'not_configured') {
    return NextResponse.json({ error: 'Sweep not configured' }, { status: 503 })
  }
  if (auth !== 'ok') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const startedAt = Date.now()
  let candidates: string[]
  try {
    candidates = await listRetryCandidates(SWEEP_BATCH, new Date(startedAt).toISOString())
  } catch (err) {
    console.error('❌ Sweep: could not list candidates', String(err))
    return NextResponse.json({ error: 'Ledger unavailable' }, { status: 500 })
  }

  const counts: Record<FulfillmentRunStatus | 'skipped_budget', number> = {
    completed: 0, failed: 0, needs_reconciliation: 0, not_claimed: 0, fenced: 0, error: 0, skipped_budget: 0,
  }
  const deps = productionFulfillmentDeps()
  for (const sessionId of candidates) {
    if (Date.now() - startedAt > SWEEP_BUDGET_MS) {
      counts.skipped_budget++
      continue
    }
    try {
      const r = await runPaymentFulfillment(sessionId, deps)
      counts[r.status]++
    } catch (err) {
      counts.error++
      console.error('❌ Sweep: fulfillment run error', { sessionId, error: String(err) })
    }
  }

  let attentionOpen: number | null = null
  try {
    attentionOpen = await countAttention()
  } catch {
    attentionOpen = null
  }

  return NextResponse.json({ scanned: candidates.length, ...counts, attention_open: attentionOpen })
}
