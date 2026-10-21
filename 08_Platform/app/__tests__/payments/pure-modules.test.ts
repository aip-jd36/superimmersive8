/**
 * CAA-SECURITY-3B — pure payment modules: signed-fact extraction, Resend
 * outcome classification, sweep authentication.
 */
import { extractCheckoutSessionFacts, isCheckoutSessionId } from '@/lib/payments/stripe-session-facts'
import { classifyResendResult, sendAndClassify, DEFINITE_REJECTION_ERROR_NAMES } from '@/lib/payments/email-outcome'
import { verifySweepAuthorization } from '@/lib/payments/sweep-auth'

describe('extractCheckoutSessionFacts', () => {
  const event = {
    id: 'evt_1',
    data: {
      object: {
        id: 'cs_test_1', client_reference_id: '11111111-1111-1111-1111-111111111111', created: 1760000000,
        status: 'complete', mode: 'payment', payment_status: 'paid', payment_intent: 'pi_1', currency: 'usd',
        amount_subtotal: 2900, amount_total: 2610,
        total_details: { amount_discount: 290, amount_tax: 0, amount_shipping: 0 },
        metadata: { tier: 'creator_record', submissionId: '22222222-2222-2222-2222-222222222222' },
        customer_email: 'attacker@example.com',
      },
    },
  }

  it('copies signed fields verbatim', () => {
    expect(extractCheckoutSessionFacts(event)).toEqual({
      sessionId: 'cs_test_1', eventId: 'evt_1', clientReferenceId: '11111111-1111-1111-1111-111111111111',
      sessionCreatedEpoch: 1760000000, sessionStatus: 'complete', mode: 'payment', paymentStatus: 'paid',
      paymentIntentId: 'pi_1', currency: 'usd', amountSubtotal: 2900, amountTotal: 2610,
      amountDiscount: 290, amountTax: 0, amountShipping: 0,
    })
  })

  it('never extracts metadata or customer email (not decision inputs)', () => {
    const facts = extractCheckoutSessionFacts(event) as unknown as Record<string, unknown>
    expect(JSON.stringify(facts)).not.toContain('22222222')
    expect(JSON.stringify(facts)).not.toContain('attacker@example.com')
    expect(Object.keys(facts)).not.toContain('tier')
  })

  it('handles an expanded payment_intent and a 100% promotion (null intent)', () => {
    const expanded = { ...event, data: { object: { ...event.data.object, payment_intent: { id: 'pi_2' } } } }
    expect(extractCheckoutSessionFacts(expanded).paymentIntentId).toBe('pi_2')
    // Observed live (INCIDENT-1): Stripe reports a 100% promotion as 'paid' with no PaymentIntent.
    const free = { ...event, data: { object: { ...event.data.object, payment_intent: null, payment_status: 'paid', amount_total: 0 } } }
    expect(extractCheckoutSessionFacts(free)).toMatchObject({ paymentIntentId: null, paymentStatus: 'paid', amountTotal: 0 })
    const absent = { ...event, data: { object: { ...event.data.object, payment_intent: undefined, payment_status: 'paid', amount_total: 0 } } }
    expect(extractCheckoutSessionFacts(absent).paymentIntentId).toBeNull()
    const npr = { ...event, data: { object: { ...event.data.object, payment_intent: null, payment_status: 'no_payment_required', amount_total: 0 } } }
    expect(extractCheckoutSessionFacts(npr)).toMatchObject({ paymentIntentId: null, paymentStatus: 'no_payment_required', amountTotal: 0 })
  })

  it('turns malformed values into null (the database rejects null)', () => {
    const bad = { id: 1, data: { object: { id: '', amount_total: '2900', amount_subtotal: 29.5, total_details: null } } }
    expect(extractCheckoutSessionFacts(bad as any)).toMatchObject({
      sessionId: null, eventId: null, amountTotal: null, amountSubtotal: null, amountDiscount: null,
    })
    expect(isCheckoutSessionId('cs_live_abc')).toBe(true)
    expect(isCheckoutSessionId('cs_bad id')).toBe(false)
  })
})

describe('classifyResendResult (accepted / definite rejection / unknown)', () => {
  it('accepted only with a provider id', () => {
    expect(classifyResendResult({ data: { id: 're_1' }, error: null })).toEqual({ status: 'accepted', providerId: 're_1' })
    expect(classifyResendResult({ data: {}, error: null })).toEqual({ status: 'unknown', reason: 'no_id_no_error' })
    expect(classifyResendResult(undefined)).toEqual({ status: 'unknown', reason: 'no_id_no_error' })
  })

  it.each([...DEFINITE_REJECTION_ERROR_NAMES])('%s is a definite rejection (safe to retry)', (name) => {
    expect(classifyResendResult({ data: null, error: { name, message: 'x' } })).toEqual({ status: 'failed', code: name })
  })

  it.each(['application_error', 'internal_server_error', 'something_new', undefined])(
    '%s is ambiguous → unknown (never auto-resent)', (name) => {
      expect(classifyResendResult({ data: null, error: { name, message: 'x' } }).status).toBe('unknown')
    })

  it('a thrown send is unknown', async () => {
    const r = await sendAndClassify(async () => { throw new Error('socket hang up') })
    expect(r).toEqual({ status: 'unknown', reason: 'exception:socket hang up' })
  })
})

describe('verifySweepAuthorization', () => {
  const secret = 'x'.repeat(40)
  it('fails closed when not configured or too short', () => {
    expect(verifySweepAuthorization(`Bearer ${secret}`, undefined)).toBe('not_configured')
    expect(verifySweepAuthorization('Bearer short', 'short')).toBe('not_configured')
  })
  it('accepts only the exact bearer secret', () => {
    expect(verifySweepAuthorization(`Bearer ${secret}`, secret)).toBe('ok')
    expect(verifySweepAuthorization(`Bearer ${secret}y`, secret)).toBe('unauthorized')
    expect(verifySweepAuthorization(secret, secret)).toBe('unauthorized')
    expect(verifySweepAuthorization(null, secret)).toBe('unauthorized')
  })
})
