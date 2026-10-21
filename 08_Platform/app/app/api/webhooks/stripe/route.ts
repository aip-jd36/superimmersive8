import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { extractCheckoutSessionFacts, isCheckoutSessionId, isStripeEventId } from '@/lib/payments/stripe-session-facts'
import { recordCheckoutPayment } from '@/lib/payments/repository'
import { runPaymentFulfillment } from '@/lib/payments/run-payment-fulfillment'
import { productionFulfillmentDeps } from '@/lib/payments/fulfillment-deps'
import { sendPaymentLedgerAdminAlert } from '@/lib/emails'

/**
 * CAA-SECURITY-3B — Stripe webhook.
 *
 *   1. Verify the Stripe signature (unchanged).
 *   2. Only checkout.session.completed is processed.
 *   3. Pass the signed session facts verbatim to record_checkout_payment();
 *      the database decides acceptance (session binding, stored tier, list
 *      price, currency, amounts, payment status). Metadata is never read.
 *   4. Ledger write failure → 500 (Stripe retries; recording is idempotent).
 *      Everything after a successful record returns 200: anomalies are durable
 *      in the ledger, and fulfillment failures are recovered by the ledger
 *      (sweep / admin), not by Stripe redelivery.
 */

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const OPEN_ANOMALY_REASONS = new Set(['accepted_unbound_legacy_session', 'accepted_status_not_pending', 'pre_ledger_payment'])
const RUNNABLE_FULFILLMENT = new Set(['pending', 'failed', 'in_progress'])

// GA4 payload is unchanged from the pre-3B webhook (client_id = customer email
// or session id, currency from the session), except: it fires once per
// accepted payment (not on replays) and the item tier comes from the
// persisted submission, not Stripe metadata.
async function sendGa4Purchase(sessionId: string, tier: string | null, amountTotal: number | null,
                               clientId: string, currency: string | null) {
  const ga4ApiSecret = process.env.GA4_API_SECRET
  if (!ga4ApiSecret) return
  const isCreatorRecord = tier === 'creator_record'
  try {
    await fetch(
      `https://www.google-analytics.com/mp/collect?measurement_id=G-628BLE9N15&api_secret=${ga4ApiSecret}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: clientId,
          events: [{
            name: 'purchase',
            params: {
              transaction_id: sessionId,
              value: (amountTotal || 0) / 100,
              currency: currency?.toUpperCase() || 'USD',
              items: [{
                item_id: isCreatorRecord ? 'creator_record' : 'si8_certified',
                item_name: isCreatorRecord ? 'Creator Record' : 'SI8 Certified',
                price: isCreatorRecord ? 29 : 499,
                quantity: 1,
              }],
            },
          }],
        }),
      },
    )
  } catch (err) {
    console.error('⚠️ Webhook: GA4 purchase event failed (non-fatal):', err)
  }
}

export async function POST(request: NextRequest) {
  const body = await request.text()
  const sig = request.headers.get('stripe-signature')
  if (!sig) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 })
  }

  let event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err?.message)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  if (event.type !== 'checkout.session.completed') {
    return NextResponse.json({ received: true })
  }

  const facts = extractCheckoutSessionFacts(event as any)
  if (!isCheckoutSessionId(facts.sessionId) || !isStripeEventId(facts.eventId)) {
    // A signed event without a usable session/event id cannot be recorded or
    // retried usefully. Make it visible; do not loop Stripe retries.
    console.error('❌ Webhook: signed checkout event without usable ids', { eventId: facts.eventId })
    await sendPaymentLedgerAdminAlert('Unrecordable checkout event', { event: facts.eventId, session: facts.sessionId })
    return NextResponse.json({ received: true })
  }

  let result
  try {
    result = await recordCheckoutPayment(facts)
  } catch (err) {
    console.error('❌ Webhook: payment ledger record failed', { sessionId: facts.sessionId, error: String(err) })
    return NextResponse.json({ error: 'Temporary processing failure' }, { status: 500 })
  }

  console.log('🔷 Webhook: payment recorded', {
    sessionId: facts.sessionId, outcome: result.outcome, reason: result.reason, isNew: result.isNew,
  })

  if (result.isNew && (result.outcome !== 'accepted' || OPEN_ANOMALY_REASONS.has(result.reason))) {
    await sendPaymentLedgerAdminAlert(
      result.outcome === 'accepted' ? 'Payment accepted with anomaly' : `Payment ${result.outcome}`,
      {
        session: facts.sessionId, submission: result.submissionId ?? facts.clientReferenceId,
        outcome: result.outcome, reason: result.reason,
        amount_total: facts.amountTotal, payment_status: facts.paymentStatus,
      },
    )
  }

  if (result.isNew && result.outcome === 'accepted'
      && (result.reason === 'accepted' || result.reason === 'accepted_unbound_legacy_session')) {
    const rawSession = (event as any).data?.object ?? {}
    const ga4ClientId = typeof rawSession.customer_email === 'string' && rawSession.customer_email
      ? rawSession.customer_email : facts.sessionId
    await sendGa4Purchase(facts.sessionId, result.tier, facts.amountTotal, ga4ClientId, facts.currency)
  }

  if (result.outcome === 'accepted' && RUNNABLE_FULFILLMENT.has(result.fulfillmentStatus)) {
    try {
      await runPaymentFulfillment(facts.sessionId, productionFulfillmentDeps())
    } catch (err) {
      // The ledger holds the state; the sweep / admin retry resumes it.
      console.error('❌ Webhook: fulfillment run failed (recoverable)', { sessionId: facts.sessionId, error: String(err) })
    }
  }

  return NextResponse.json({ received: true })
}
