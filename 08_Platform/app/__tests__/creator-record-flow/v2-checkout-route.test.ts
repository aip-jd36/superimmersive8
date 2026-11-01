/**
 * CR-V2-MVP-M3 — POST /api/checkout/create-session for a Creator Record v2 submission.
 *
 * Same harness as __tests__/security/checkout-integrity.test.ts. Proves: the v2 preconditions
 * (checkV2Checkout) run for a v2-marked submission BEFORE any price lookup or Stripe call —
 * including reuse of an already-open session; a refusal returns its fixed code; v2 uses its own
 * copy and cancel path; an unknown marker fails closed; V1 never reaches the v2 check (and is retired).
 */

const getUser = jest.fn()
jest.mock('@/lib/supabase/server', () => ({ createClient: () => ({ auth: { getUser } }) }))

type Q = { table: string; calls: Array<[string, ...unknown[]]>; terminal: string }
let resolver: (q: Q) => { data?: unknown; error?: unknown }
const queries: Q[] = []
function from(table: string) {
  const q: Q = { table, calls: [], terminal: 'await' }
  queries.push(q)
  const b: any = {}
  for (const m of ['select', 'eq', 'is', 'update']) b[m] = (...a: unknown[]) => { q.calls.push([m, ...a]); return b }
  const run = (t: string) => { q.terminal = t; return Promise.resolve({ data: null, error: null, ...resolver(q) }) }
  b.maybeSingle = () => run('maybeSingle')
  b.then = (res: any, rej: any) => run('await').then(res, rej)
  return b
}
jest.mock('@/lib/supabase/admin', () => ({ supabaseAdmin: { from: (t: string) => from(t) } }))

const PRICES: Record<string, number> = { creator_record: 2900, certified: 49900, si8_certified: 49900 }
const getListPriceCents = jest.fn(async (tier: string | null) => (tier && PRICES[tier]) || null)
jest.mock('@/lib/payments/repository', () => ({ getListPriceCents: (t: string | null) => getListPriceCents(t) }))

const create = jest.fn()
const retrieve = jest.fn()
const expire = jest.fn()
jest.mock('@/lib/stripe', () => ({ stripe: { checkout: { sessions: { create: (...a: unknown[]) => create(...a), retrieve: (...a: unknown[]) => retrieve(...a), expire: (...a: unknown[]) => expire(...a) } } } }))

const checkV2Checkout = jest.fn()
jest.mock('@/lib/creator-record/customer-flow/purchase', () => ({ checkV2Checkout: (...a: unknown[]) => checkV2Checkout(...a) }))
const purchaseDeps = { marker: 'production purchase deps' }
jest.mock('@/lib/creator-record-flow/production', () => ({ productionPurchaseDeps: () => purchaseDeps }))

import { POST } from '@/app/api/checkout/create-session/route'
import { V2_CHECKOUT_COPY } from '@/lib/creator-record-flow/wording'

const USER = { id: 'user-1', email: 'owner@example.com' }
const SUB_ID = '11111111-1111-4111-8111-111111111111'
const req = (body: unknown) => ({ json: async () => body }) as any
const row = (over: Record<string, unknown> = {}) => ({ id: SUB_ID, user_id: USER.id, tier: 'creator_record', status: 'pending', payment_status: 'unpaid', stripe_checkout_session_id: null, creator_record_product: 'v2', ...over })
function standard(r: Record<string, unknown> = row()) {
  resolver = (q) => (q.calls.some(([m]) => m === 'update') ? { data: [{ id: SUB_ID }], error: null } : { data: r })
}

beforeEach(() => {
  jest.clearAllMocks()
  queries.length = 0
  getUser.mockResolvedValue({ data: { user: USER }, error: null })
  create.mockResolvedValue({ id: 'cs_new', status: 'open', url: 'https://checkout.stripe.test/new' })
  checkV2Checkout.mockResolvedValue({ ok: true, sha256: 'a'.repeat(64), record_ref: 'PREP-x' })
  process.env.NEXT_PUBLIC_SITE_URL = 'https://app.test'
})

test('the v2 check runs with the session user and the persisted row, then v2 copy and cancel path are used', async () => {
  standard()
  const res = await POST(req({ submissionId: SUB_ID, creator_record_product: null }))
  expect(res.status).toBe(200)
  expect(checkV2Checkout).toHaveBeenCalledWith(purchaseDeps, USER.id, expect.objectContaining({ id: SUB_ID, user_id: USER.id, tier: 'creator_record', creator_record_product: 'v2' }))
  const [params] = create.mock.calls[0]
  expect(params.line_items[0].price_data.product_data).toEqual({ name: V2_CHECKOUT_COPY.name, description: V2_CHECKOUT_COPY.description })
  expect(params.line_items[0].price_data.unit_amount).toBe(2900)
  expect(params.cancel_url).toBe('https://app.test/creator-record?payment=cancelled')
  expect(params.client_reference_id).toBe(SUB_ID)
  expect(params.metadata).toEqual({ submissionId: SUB_ID, tier: 'creator_record', checkout_contract: 'caa-3b-v2', creator_record_product: 'v2' })
})

test.each([
  [503, 'issuance_stopped'], [503, 'submissions_stopped'], [403, 'not_invited'], [409, 'superseded'],
  [409, 'ineligible'], [409, 'not_reviewed'], [500, 'integrity_failure'], [503, 'unavailable'], [404, 'not_found'],
])('refusal %i %s → no price lookup, no Stripe call', async (status, code) => {
  standard()
  checkV2Checkout.mockResolvedValue({ ok: false, status, code })
  const res = await POST(req({ submissionId: SUB_ID }))
  expect(res.status).toBe(status)
  expect((await res.json()).code).toBe(code)
  expect(getListPriceCents).not.toHaveBeenCalled()
  expect(create).not.toHaveBeenCalled()
  expect(retrieve).not.toHaveBeenCalled()
})

test('a refused v2 submission does not get its already-open session back', async () => {
  standard(row({ stripe_checkout_session_id: 'cs_open' }))
  retrieve.mockResolvedValue({ id: 'cs_open', status: 'open', client_reference_id: SUB_ID, amount_subtotal: 2900, url: 'https://checkout.stripe.test/open' })
  checkV2Checkout.mockResolvedValue({ ok: false, status: 503, code: 'issuance_stopped' })
  const res = await POST(req({ submissionId: SUB_ID }))
  expect(res.status).toBe(503)
  expect(retrieve).not.toHaveBeenCalled()
})

test('a paid v2 submission is refused by the existing payment-state rule first', async () => {
  standard(row({ payment_status: 'paid', status: 'approved' }))
  const res = await POST(req({ submissionId: SUB_ID }))
  expect(res.status).toBe(409)
  expect(checkV2Checkout).not.toHaveBeenCalled()
  expect(create).not.toHaveBeenCalled()
})

test('an unknown marker fails closed; V1 (no marker) never reaches the v2 check and is retired (CR-V2-CUTOVER-1)', async () => {
  standard(row({ creator_record_product: 'v3' }))
  expect((await POST(req({ submissionId: SUB_ID }))).status).toBe(400)
  expect(create).not.toHaveBeenCalled()

  for (const marker of [null, undefined]) {
    jest.clearAllMocks()
    standard(row({ creator_record_product: marker }))
    const res = await POST(req({ submissionId: SUB_ID }))
    expect(res.status).toBe(409)
    expect(await res.json()).toMatchObject({ code: 'v1_creator_record_retired' })
    expect(checkV2Checkout).not.toHaveBeenCalled()
    expect(getListPriceCents).not.toHaveBeenCalled()
    expect(create).not.toHaveBeenCalled()
  }
})
