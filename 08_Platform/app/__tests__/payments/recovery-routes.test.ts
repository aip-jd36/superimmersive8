/**
 * CAA-SECURITY-3B — recovery surfaces: scheduled sweep + admin reconciliation.
 */

const getUser = jest.fn()
jest.mock('@/lib/supabase/server', () => ({ createClient: () => ({ auth: { getUser } }) }))

const isAdminLookup = jest.fn()
jest.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: { from: () => ({ select: () => ({ eq: () => ({ single: () => isAdminLookup() }) }) }) },
}))

const listRetryCandidates = jest.fn()
const countAttention = jest.fn()
const reconcileFulfillment = jest.fn()
jest.mock('@/lib/payments/repository', () => ({
  RECONCILE_ACTIONS: ['retry_fulfillment', 'authorize_email_resend', 'close_unknown_email', 'resolve_anomaly'],
  listRetryCandidates: (...a: unknown[]) => listRetryCandidates(...a),
  countAttention: () => countAttention(),
  reconcileFulfillment: (...a: unknown[]) => reconcileFulfillment(...a),
}))

const runPaymentFulfillment = jest.fn()
jest.mock('@/lib/payments/run-payment-fulfillment', () => ({ runPaymentFulfillment: (...a: unknown[]) => runPaymentFulfillment(...a) }))
jest.mock('@/lib/payments/fulfillment-deps', () => ({ productionFulfillmentDeps: () => ({}) }))

import { POST as sweep } from '@/app/api/internal/payment-fulfillments/sweep/route'
import { POST as reconcile } from '@/app/api/admin/payments/[sessionId]/reconcile/route'

const SECRET = 's'.repeat(48)
const sweepReq = (auth: string | null) => ({ headers: { get: (h: string) => (h === 'authorization' ? auth : null) } }) as any
const jsonReq = (body: unknown) => ({ json: async () => body }) as any

beforeEach(() => {
  jest.clearAllMocks()
  process.env.PAYMENT_SWEEP_SECRET = SECRET
  listRetryCandidates.mockResolvedValue(['cs_a', 'cs_b'])
  countAttention.mockResolvedValue(3)
  runPaymentFulfillment.mockImplementation(async (s: string) => ({ sessionId: s, status: s === 'cs_a' ? 'completed' : 'not_claimed', reason: 'x' }))
  getUser.mockResolvedValue({ data: { user: { id: 'admin-1' } }, error: null })
  isAdminLookup.mockResolvedValue({ data: { is_admin: true } })
  reconcileFulfillment.mockResolvedValue('retry_scheduled')
})

describe('sweep', () => {
  it('fails closed when the secret is not configured', async () => {
    delete process.env.PAYMENT_SWEEP_SECRET
    expect((await sweep(sweepReq(`Bearer ${SECRET}`))).status).toBe(503)
    expect(listRetryCandidates).not.toHaveBeenCalled()
  })
  it('rejects a wrong or missing bearer', async () => {
    expect((await sweep(sweepReq('Bearer nope'))).status).toBe(401)
    expect((await sweep(sweepReq(null))).status).toBe(401)
    expect(listRetryCandidates).not.toHaveBeenCalled()
  })
  it('processes a bounded batch and reports counts + the durable attention queue', async () => {
    const res = await sweep(sweepReq(`Bearer ${SECRET}`))
    expect(res.status).toBe(200)
    expect(listRetryCandidates).toHaveBeenCalledWith(10, expect.any(String))
    expect(runPaymentFulfillment).toHaveBeenCalledTimes(2)
    expect(await res.json()).toMatchObject({ scanned: 2, completed: 1, not_claimed: 1, attention_open: 3 })
  })
  it('ledger unavailable → 500 (the workflow run fails visibly)', async () => {
    listRetryCandidates.mockRejectedValue(new Error('down'))
    expect((await sweep(sweepReq(`Bearer ${SECRET}`))).status).toBe(500)
  })
})

describe('admin reconciliation', () => {
  const ctx = { params: { sessionId: 'cs_test_1' } }
  it('401 unauthenticated, 403 non-admin', async () => {
    getUser.mockResolvedValueOnce({ data: { user: null }, error: null })
    expect((await reconcile(jsonReq({}), ctx)).status).toBe(401)
    isAdminLookup.mockResolvedValueOnce({ data: { is_admin: false } })
    expect((await reconcile(jsonReq({ action: 'retry_fulfillment', note: 'hello there' }), ctx)).status).toBe(403)
    expect(reconcileFulfillment).not.toHaveBeenCalled()
  })
  it('validates session id, action and note', async () => {
    expect((await reconcile(jsonReq({ action: 'retry_fulfillment', note: 'hello there' }), { params: { sessionId: 'x' } })).status).toBe(404)
    expect((await reconcile(jsonReq({ action: 'drop_table', note: 'hello there' }), ctx)).status).toBe(400)
    expect((await reconcile(jsonReq({ action: 'retry_fulfillment', note: 'hi' }), ctx)).status).toBe(400)
    expect(reconcileFulfillment).not.toHaveBeenCalled()
  })
  it('retry runs fulfillment immediately with the admin as actor', async () => {
    const res = await reconcile(jsonReq({ action: 'retry_fulfillment', note: '  PDF bucket fixed  ' }), ctx)
    expect(res.status).toBe(200)
    expect(reconcileFulfillment).toHaveBeenCalledWith('cs_test_1', 'retry_fulfillment', 'admin-1', 'PDF bucket fixed')
    expect(runPaymentFulfillment).toHaveBeenCalledTimes(1)
  })
  it('close_unknown_email / resolve_anomaly never trigger a send', async () => {
    reconcileFulfillment.mockResolvedValue('email_reconciled')
    await reconcile(jsonReq({ action: 'close_unknown_email', note: 'Resend shows delivered' }), ctx)
    reconcileFulfillment.mockResolvedValue('anomaly_resolved')
    await reconcile(jsonReq({ action: 'resolve_anomaly', note: 'refunded in Stripe' }), ctx)
    expect(runPaymentFulfillment).not.toHaveBeenCalled()
  })
  it('not_applicable → 409, not_found → 404', async () => {
    reconcileFulfillment.mockResolvedValue('not_applicable')
    expect((await reconcile(jsonReq({ action: 'retry_fulfillment', note: 'hello there' }), ctx)).status).toBe(409)
    reconcileFulfillment.mockResolvedValue('not_found')
    expect((await reconcile(jsonReq({ action: 'retry_fulfillment', note: 'hello there' }), ctx)).status).toBe(404)
  })
})
