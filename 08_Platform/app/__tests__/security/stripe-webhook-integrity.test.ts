/**
 * CAA-SECURITY-3B — POST /api/webhooks/stripe
 *
 * The acceptance decision itself (binding, tier, price, currency, amounts,
 * payment status, human-state preservation, replay, concurrency) is proven
 * against real PostgreSQL in __tests__/db/payment-ledger.db.test.ts. This
 * suite proves the route: signature gate, signed facts passed verbatim
 * (metadata never), response mapping, side effects only on first record.
 */

const constructEvent = jest.fn()
jest.mock('@/lib/stripe', () => ({ stripe: { webhooks: { constructEvent: (...a: unknown[]) => constructEvent(...a) } } }))

const recordCheckoutPayment = jest.fn()
jest.mock('@/lib/payments/repository', () => ({ recordCheckoutPayment: (f: unknown) => recordCheckoutPayment(f) }))

const runPaymentFulfillment = jest.fn()
jest.mock('@/lib/payments/run-payment-fulfillment', () => ({ runPaymentFulfillment: (...a: unknown[]) => runPaymentFulfillment(...a) }))
jest.mock('@/lib/payments/fulfillment-deps', () => ({ productionFulfillmentDeps: () => ({}) }))

const sendPaymentLedgerAdminAlert = jest.fn()
jest.mock('@/lib/emails', () => ({ sendPaymentLedgerAdminAlert: (...a: unknown[]) => sendPaymentLedgerAdminAlert(...a) }))

import { POST } from '@/app/api/webhooks/stripe/route'

const fetchMock = jest.fn()
;(global as any).fetch = fetchMock

const SUB_ID = '11111111-1111-4111-8111-111111111111'

function completedEvent(over: Record<string, unknown> = {}) {
  return {
    id: 'evt_1',
    type: 'checkout.session.completed',
    data: {
      object: {
        id: 'cs_test_1', client_reference_id: SUB_ID, created: 1760000000, status: 'complete', mode: 'payment',
        payment_status: 'paid', payment_intent: 'pi_1', currency: 'usd', amount_subtotal: 49900, amount_total: 49900,
        total_details: { amount_discount: 0, amount_tax: 0, amount_shipping: 0 },
        metadata: { tier: 'creator_record', submissionId: '99999999-9999-4999-8999-999999999999' },
        ...over,
      },
    },
  }
}

const req = (sig: string | null = 'sig') => ({
  text: async () => 'raw-body',
  headers: { get: (h: string) => (h === 'stripe-signature' ? sig : null) },
}) as any

const recorded = (over: Record<string, unknown> = {}) => ({
  outcome: 'accepted', reason: 'accepted', isNew: true, fulfillmentStatus: 'pending', tier: 'si8_certified', submissionId: SUB_ID, ...over,
})

beforeEach(() => {
  jest.clearAllMocks()
  process.env.GA4_API_SECRET = 'ga'
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test'
  constructEvent.mockReturnValue(completedEvent())
  recordCheckoutPayment.mockResolvedValue(recorded())
  runPaymentFulfillment.mockResolvedValue({ status: 'completed' })
  fetchMock.mockResolvedValue({ ok: true })
})

describe('signature gate', () => {
  it('missing signature → 400, nothing recorded', async () => {
    expect((await POST(req(null))).status).toBe(400)
    expect(recordCheckoutPayment).not.toHaveBeenCalled()
  })
  it('invalid signature → 400, nothing recorded', async () => {
    constructEvent.mockImplementation(() => { throw new Error('No signatures found') })
    const res = await POST(req())
    expect(res.status).toBe(400)
    expect(recordCheckoutPayment).not.toHaveBeenCalled()
    expect(constructEvent).toHaveBeenCalledWith('raw-body', 'sig', 'whsec_test')
  })
  it('non-checkout events are acknowledged and ignored', async () => {
    constructEvent.mockReturnValue({ id: 'evt_2', type: 'charge.refunded', data: { object: {} } })
    expect((await POST(req())).status).toBe(200)
    expect(recordCheckoutPayment).not.toHaveBeenCalled()
  })
})

describe('signed facts, never metadata', () => {
  it('passes the signed session facts verbatim', async () => {
    await POST(req())
    expect(recordCheckoutPayment).toHaveBeenCalledWith({
      sessionId: 'cs_test_1', eventId: 'evt_1', clientReferenceId: SUB_ID, sessionCreatedEpoch: 1760000000,
      sessionStatus: 'complete', mode: 'payment', paymentStatus: 'paid', paymentIntentId: 'pi_1', currency: 'usd',
      amountSubtotal: 49900, amountTotal: 49900, amountDiscount: 0, amountTax: 0, amountShipping: 0,
    })
  })

  it('metadata.tier spoofing has no effect: a $499 si8_certified session stays Certified (no approval path in the route)', async () => {
    await POST(req())
    const arg = JSON.stringify(recordCheckoutPayment.mock.calls[0][0])
    expect(arg).not.toContain('creator_record')
    expect(arg).not.toContain('99999999')   // metadata.submissionId ignored; client_reference_id wins
  })

  it('a valid 100% promotion is forwarded with a null payment intent', async () => {
    constructEvent.mockReturnValue(completedEvent({ payment_status: 'no_payment_required', payment_intent: null, amount_total: 0, total_details: { amount_discount: 49900 } }))
    await POST(req())
    expect(recordCheckoutPayment.mock.calls[0][0]).toMatchObject({ paymentStatus: 'no_payment_required', paymentIntentId: null, amountTotal: 0, amountDiscount: 49900 })
  })

  it('a signed event without usable ids is made visible and not retried', async () => {
    constructEvent.mockReturnValue(completedEvent({ id: undefined }))
    const res = await POST(req())
    expect(res.status).toBe(200)
    expect(recordCheckoutPayment).not.toHaveBeenCalled()
    expect(sendPaymentLedgerAdminAlert).toHaveBeenCalledTimes(1)
  })
})

describe('response mapping and side effects', () => {
  it('new accepted payment → GA4 once + fulfillment, 200', async () => {
    const res = await POST(req())
    expect(res.status).toBe(200)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(runPaymentFulfillment).toHaveBeenCalledWith('cs_test_1', expect.anything())
    expect(sendPaymentLedgerAdminAlert).not.toHaveBeenCalled()
  })

  it('GA4 client_id is the session id, never the customer email or other personal data', async () => {
    constructEvent.mockReturnValue(completedEvent({
      customer_email: 'owner@example.com',
      customer_details: { email: 'owner@example.com', name: 'Owner Name', phone: '+15550100', address: { line1: '1 Main St' } },
      customer: 'cus_123',
    }))
    await POST(req())
    const raw = fetchMock.mock.calls[0][1].body as string
    const body = JSON.parse(raw)
    expect(body.client_id).toBe('cs_test_1')
    expect(body.user_id).toBeUndefined()
    expect(body.user_data).toBeUndefined()
    for (const pii of ['owner@example.com', 'Owner Name', '+15550100', '1 Main St', 'cus_123', SUB_ID]) {
      expect(raw).not.toContain(pii)
    }
  })

  it('GA4 purchase keeps dedup id, amount, currency and ledger tier authority', async () => {
    constructEvent.mockReturnValue(completedEvent({ customer_email: 'owner@example.com', currency: 'usd' }))
    await POST(req())
    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(body.events).toHaveLength(1)
    expect(body.events[0].name).toBe('purchase')
    expect(body.events[0].params).toMatchObject({ transaction_id: 'cs_test_1', value: 499, currency: 'USD' })
    expect(body.events[0].params.items[0].item_id).toBe('si8_certified')   // ledger tier, not metadata 'creator_record'
    // 100% promotion: value 0, still one event
    fetchMock.mockClear()
    constructEvent.mockReturnValue(completedEvent({ payment_status: 'no_payment_required', payment_intent: null, amount_total: 0 }))
    recordCheckoutPayment.mockResolvedValue(recorded({ tier: 'creator_record' }))
    await POST(req())
    const promo = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(promo.events[0].params).toMatchObject({ transaction_id: 'cs_test_1', value: 0 })
    expect(promo.events[0].params.items[0].item_id).toBe('creator_record')
  })

  it('replay with pending fulfillment resumes it, but repeats no GA4 / alert', async () => {
    recordCheckoutPayment.mockResolvedValue(recorded({ isNew: false, fulfillmentStatus: 'failed' }))
    await POST(req())
    expect(fetchMock).not.toHaveBeenCalled()
    expect(sendPaymentLedgerAdminAlert).not.toHaveBeenCalled()
    expect(runPaymentFulfillment).toHaveBeenCalledTimes(1)
  })

  it.each(['completed', 'not_required', 'needs_reconciliation'])('replay with %s fulfillment does nothing', async (fs) => {
    recordCheckoutPayment.mockResolvedValue(recorded({ isNew: false, fulfillmentStatus: fs }))
    await POST(req())
    expect(runPaymentFulfillment).not.toHaveBeenCalled()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it.each([
    ['rejected', 'amount_mismatch'], ['rejected', 'session_mismatch'], ['rejected', 'currency_mismatch'],
    ['duplicate_payment', 'submission_already_paid'],
    ['rejected', 'unbound_session_after_cutoff'], ['rejected', 'unbound_session_window_closed'],
    ['rejected', 'unbound_session_created_unknown'],
  ])('new %s/%s → durable anomaly alert, no fulfillment, no GA4, 200', async (outcome, reason) => {
    recordCheckoutPayment.mockResolvedValue(recorded({ outcome, reason, fulfillmentStatus: 'not_required' }))
    const res = await POST(req())
    expect(res.status).toBe(200)
    expect(sendPaymentLedgerAdminAlert).toHaveBeenCalledTimes(1)
    expect(runPaymentFulfillment).not.toHaveBeenCalled()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('legacy unbound session: accepted explicitly, alerted, fulfilled', async () => {
    recordCheckoutPayment.mockResolvedValue(recorded({ reason: 'accepted_unbound_legacy_session' }))
    await POST(req())
    expect(sendPaymentLedgerAdminAlert).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(runPaymentFulfillment).toHaveBeenCalledTimes(1)
  })

  it('pre-ledger payment: alerted, no GA4, no automatic fulfillment', async () => {
    recordCheckoutPayment.mockResolvedValue(recorded({ reason: 'pre_ledger_payment', fulfillmentStatus: 'needs_reconciliation' }))
    await POST(req())
    expect(sendPaymentLedgerAdminAlert).toHaveBeenCalledTimes(1)
    expect(fetchMock).not.toHaveBeenCalled()
    expect(runPaymentFulfillment).not.toHaveBeenCalled()
  })

  it('paid but human state not pending: recorded, alerted, nothing to fulfil', async () => {
    recordCheckoutPayment.mockResolvedValue(recorded({ reason: 'accepted_status_not_pending', fulfillmentStatus: 'not_required' }))
    await POST(req())
    expect(sendPaymentLedgerAdminAlert).toHaveBeenCalledTimes(1)
    expect(runPaymentFulfillment).not.toHaveBeenCalled()
  })

  it.each([
    ['23514', 'check_violation'], ['23505', 'unique_violation'], ['22023', 'invalid_parameter_value'],
    ['42883', 'undefined_function'], ['42501', 'insufficient_privilege'], ['40001', 'serialization_failure'],
    ['PGRST202', 'postgrest schema cache'],
  ])('database error %s (%s) stays retryable: 500, no alert-and-200, no side effects', async (code) => {
    recordCheckoutPayment.mockRejectedValue(Object.assign(new Error(`ledger error ${code}`), { code }))
    const res = await POST(req())
    expect(res.status).toBe(500)
    expect(runPaymentFulfillment).not.toHaveBeenCalled()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('ledger write failure → 500 so Stripe retries (recording is idempotent)', async () => {
    recordCheckoutPayment.mockRejectedValue(new Error('db down'))
    const res = await POST(req())
    expect(res.status).toBe(500)
    expect(JSON.stringify(await res.json())).not.toContain('db down')
    expect(runPaymentFulfillment).not.toHaveBeenCalled()
  })

  it('fulfillment failure after recording still returns 200 (ledger recovers it)', async () => {
    runPaymentFulfillment.mockRejectedValue(new Error('pdf exploded'))
    expect((await POST(req())).status).toBe(200)
  })
})
