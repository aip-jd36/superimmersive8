import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { getListPriceCents } from '@/lib/payments/repository'

/**
 * CAA-SECURITY-3B — create (or reuse) the Stripe Checkout session for a
 * submission the authenticated user owns.
 *
 * Contract:
 *   - The only body field read is `submissionId`. Tier, price, email and
 *     payment state always come from the persisted submission + the database
 *     price function. Missing and foreign submissions are indistinguishable.
 *   - Only unpaid + pending submissions can check out.
 *   - A checkout URL is returned ONLY for a session id that is persisted on
 *     the submission (the webhook binds payment to that id).
 *   - Concurrency: the Stripe idempotency key is derived from the persisted
 *     state, so racing requests receive the same session; the binding write
 *     is conditional on that same persisted state.
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const CERTIFIED_COPY = {
  name: 'SI8 Certified — Commercial Clearance Verification',
  description: 'Rights Verified verification service — 90-minute human review, CLEARED FOR COMMERCIAL USE PDF',
}
const PRODUCT_COPY: Record<string, { name: string; description: string }> = {
  creator_record: {
    name: 'Creator Record — Self-Attested Documentation',
    description: 'Structured Chain of Title record (self-attested, not for commercial use) — instant automated delivery',
  },
  certified: CERTIFIED_COPY,
  si8_certified: CERTIFIED_COPY,
}

const NOT_FOUND = () => NextResponse.json({ error: 'Submission not found' }, { status: 404 })
const RETRY = () => NextResponse.json({ error: 'Checkout is being prepared — please try again.' }, { status: 409 })
const SERVER_ERROR = () => NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 })

interface SubmissionRow {
  id: string
  user_id: string
  tier: string | null
  status: string | null
  payment_status: string | null
  stripe_checkout_session_id: string | null
}

async function loadOwnedSubmission(submissionId: string, userId: string) {
  return supabaseAdmin
    .from('submissions')
    .select('id, user_id, tier, status, payment_status, stripe_checkout_session_id')
    .eq('id', submissionId)
    .eq('user_id', userId)
    .maybeSingle()
}

async function expireQuietly(sessionId: string) {
  try {
    await stripe.checkout.sessions.expire(sessionId)
  } catch (err) {
    console.error('⚠️ Checkout: could not expire superseded session', { sessionId, error: String(err) })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }
    const submissionId = (body as { submissionId?: unknown } | null)?.submissionId
    if (typeof submissionId !== 'string' || !UUID_RE.test(submissionId)) return NOT_FOUND()

    const { data: found, error: loadError } = await loadOwnedSubmission(submissionId, user.id)
    if (loadError) return SERVER_ERROR()
    const row = found as SubmissionRow | null
    if (!row) return NOT_FOUND()

    if (row.payment_status !== 'unpaid' || row.status !== 'pending') {
      return NextResponse.json({ error: 'This submission is not awaiting payment.' }, { status: 409 })
    }

    const unitAmount = await getListPriceCents(row.tier)
    const copy = row.tier ? PRODUCT_COPY[row.tier] : undefined
    if (unitAmount === null || !copy) {
      return NextResponse.json({ error: 'Unsupported submission tier' }, { status: 400 })
    }

    // Reuse the persisted session while it is still payable.
    const previousSessionId = row.stripe_checkout_session_id
    if (previousSessionId) {
      const existing = await stripe.checkout.sessions.retrieve(previousSessionId)
      if (existing.status === 'complete') {
        return NextResponse.json({ error: 'Payment is already being processed for this submission.' }, { status: 409 })
      }
      if (existing.status === 'open') {
        if (existing.client_reference_id === row.id && existing.amount_subtotal === unitAmount && existing.url) {
          return NextResponse.json({ url: existing.url })
        }
        await expireQuietly(existing.id)
      }
    }

    const params = {
      payment_method_types: ['card' as const],
      allow_promotion_codes: true,
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: { name: copy.name, description: copy.description },
          unit_amount: unitAmount,
        },
        quantity: 1,
      }],
      mode: 'payment' as const,
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard?payment=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/record?payment=cancelled`,
      client_reference_id: row.id,
      ...(user.email ? { customer_email: user.email } : {}),
      // Informational only — never read for any decision.
      metadata: { submissionId: row.id, tier: row.tier as string, checkout_contract: 'caa-3b-v2' },
    }

    const baseKey = `si8-checkout-v2:${row.id}:${previousSessionId ?? 'initial'}`
    let session
    try {
      session = await stripe.checkout.sessions.create(params, { idempotencyKey: baseKey })
      if (session.status !== 'open') {
        // Idempotent replay of a session that has since expired: one fresh attempt.
        session = await stripe.checkout.sessions.create(params, { idempotencyKey: `${baseKey}:${session.id}` })
      }
    } catch (err: any) {
      if (err?.type === 'StripeIdempotencyError' || err?.statusCode === 409) return RETRY()
      throw err
    }
    if (session.status !== 'open' || !session.url) return RETRY()

    // Bind the session to the submission, conditional on the state we read.
    let bind = supabaseAdmin
      .from('submissions')
      .update({ stripe_checkout_session_id: session.id })
      .eq('id', row.id)
      .eq('user_id', user.id)
      .eq('payment_status', 'unpaid')
    bind = previousSessionId
      ? bind.eq('stripe_checkout_session_id', previousSessionId)
      : bind.is('stripe_checkout_session_id', null)
    const { data: bound, error: bindError } = await bind.select('id')
    if (bindError) {
      await expireQuietly(session.id)
      return SERVER_ERROR()
    }

    if (!bound || bound.length === 0) {
      // Another request changed the binding first.
      const { data: latest } = await loadOwnedSubmission(row.id, user.id)
      if ((latest as SubmissionRow | null)?.stripe_checkout_session_id === session.id) {
        return NextResponse.json({ url: session.url })   // same idempotent session
      }
      await expireQuietly(session.id)
      return RETRY()
    }

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Error creating checkout session:', error)
    return SERVER_ERROR()
  }
}
