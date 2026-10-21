import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { RECONCILE_ACTIONS, reconcileFulfillment, type ReconcileAction } from '@/lib/payments/repository'
import { isCheckoutSessionId } from '@/lib/payments/stripe-session-facts'
import { runPaymentFulfillment } from '@/lib/payments/run-payment-fulfillment'
import { productionFulfillmentDeps } from '@/lib/payments/fulfillment-deps'

/**
 * CAA-SECURITY-3B — admin-led payment reconciliation.
 *
 * Every action requires an admin, a note, and is appended to the ledger row's
 * reconciliation_log by reconcile_payment_fulfillment(). An unknown email
 * outcome is only ever resent through the explicit `authorize_email_resend`
 * action. retry/resend actions run fulfillment immediately afterwards.
 */

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const RUN_AFTER = new Set<ReconcileAction>(['retry_fulfillment', 'authorize_email_resend'])

export async function POST(request: NextRequest, { params }: { params: { sessionId: string } }) {
  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: actor } = await supabaseAdmin.from('users').select('is_admin').eq('id', user.id).single()
  if (!actor?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  if (!isCheckoutSessionId(params.sessionId)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  let body: { action?: unknown; note?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
  const action = body?.action as ReconcileAction
  const note = typeof body?.note === 'string' ? body.note.trim() : ''
  if (!RECONCILE_ACTIONS.includes(action)) return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  if (note.length < 5) return NextResponse.json({ error: 'A note of at least 5 characters is required' }, { status: 400 })

  let result: string
  try {
    result = await reconcileFulfillment(params.sessionId, action, user.id, note)
  } catch (err) {
    console.error('❌ Reconcile failed', { sessionId: params.sessionId, action, error: String(err) })
    return NextResponse.json({ error: 'Reconciliation failed' }, { status: 500 })
  }
  if (result === 'not_found') return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (result === 'not_applicable') {
    return NextResponse.json({ error: 'Action not applicable to the current state' }, { status: 409 })
  }

  let fulfillment = null
  if (RUN_AFTER.has(action)) {
    try {
      fulfillment = await runPaymentFulfillment(params.sessionId, productionFulfillmentDeps())
    } catch (err) {
      console.error('❌ Reconcile: fulfillment run failed (sweep will retry)', String(err))
    }
  }
  return NextResponse.json({ result, fulfillment })
}
