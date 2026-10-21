/**
 * CAA-SECURITY-3B — POST /api/checkout/create-session
 *
 * Proves: authentication; ownership (missing ≡ foreign); tier/price/email
 * come from the persisted row + DB price function, never the body; only
 * unpaid+pending rows check out; session reuse; idempotent creation; the URL
 * is returned only for a session id bound to the submission; races.
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

import { POST } from '@/app/api/checkout/create-session/route'

const USER = { id: 'user-1', email: 'owner@example.com' }
const SUB_ID = '11111111-1111-4111-8111-111111111111'
const req = (body: unknown) => ({ json: async () => body }) as any
const has = (q: Q, m: string, ...a: unknown[]) => q.calls.some(([x, ...y]) => x === m && JSON.stringify(y) === JSON.stringify(a))

function row(over: Record<string, unknown> = {}) {
  return { id: SUB_ID, user_id: USER.id, tier: 'creator_record', status: 'pending', payment_status: 'unpaid', stripe_checkout_session_id: null, ...over }
}

/** Default: owned row found, bind succeeds. */
function standard(r: Record<string, unknown> = row(), bindResult: unknown[] | null = [{ id: SUB_ID }], latest?: Record<string, unknown>) {
  let loads = 0
  resolver = (q) => {
    if (q.calls.some(([m]) => m === 'update')) return { data: bindResult, error: null }
    loads++
    return { data: loads > 1 && latest ? latest : r }
  }
}

beforeEach(() => {
  jest.clearAllMocks()
  queries.length = 0
  getUser.mockResolvedValue({ data: { user: USER }, error: null })
  create.mockResolvedValue({ id: 'cs_new', status: 'open', url: 'https://checkout.stripe.test/new' })
  process.env.NEXT_PUBLIC_SITE_URL = 'https://app.test'
})

describe('authentication & ownership', () => {
  it('401 when unauthenticated, nothing touched', async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: null })
    const res = await POST(req({ submissionId: SUB_ID }))
    expect(res.status).toBe(401)
    expect(queries).toHaveLength(0)
    expect(create).not.toHaveBeenCalled()
  })

  it('missing and foreign submissions are an identical 404 (owner filter applied)', async () => {
    resolver = () => ({ data: null })
    const res = await POST(req({ submissionId: SUB_ID }))
    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({ error: 'Submission not found' })
    expect(has(queries[0], 'eq', 'user_id', USER.id)).toBe(true)
    expect(has(queries[0], 'eq', 'id', SUB_ID)).toBe(true)
    expect(create).not.toHaveBeenCalled()
  })

  it.each([undefined, 'not-a-uuid', 42])('malformed submissionId %p → 404 without a lookup', async (id) => {
    const res = await POST(req({ submissionId: id }))
    expect(res.status).toBe(404)
    expect(queries).toHaveLength(0)
  })
})

describe('tier, price and email come from the persisted submission', () => {
  it('body tier / email / price spoofing is ignored', async () => {
    standard(row({ tier: 'si8_certified' }))
    const res = await POST(req({ submissionId: SUB_ID, tier: 'creator_record', creatorEmail: 'evil@example.com', unit_amount: 1, payment_status: 'paid' }))
    expect(res.status).toBe(200)
    const [params] = create.mock.calls[0]
    expect(params.line_items[0].price_data.unit_amount).toBe(49900)
    expect(params.customer_email).toBe(USER.email)
    expect(params.client_reference_id).toBe(SUB_ID)
    expect(params.metadata).toEqual({ submissionId: SUB_ID, tier: 'si8_certified', checkout_contract: 'caa-3b-v2' })
    expect(params.allow_promotion_codes).toBe(true)
    expect(getListPriceCents).toHaveBeenCalledWith('si8_certified')
  })

  it.each([['creator_record', 2900], ['certified', 49900], ['si8_certified', 49900]])('%s → %i cents', async (tier, cents) => {
    standard(row({ tier }))
    await POST(req({ submissionId: SUB_ID }))
    expect(create.mock.calls[0][0].line_items[0].price_data.unit_amount).toBe(cents)
  })

  it('unknown tier fails closed', async () => {
    standard(row({ tier: 'platinum' }))
    const res = await POST(req({ submissionId: SUB_ID }))
    expect(res.status).toBe(400)
    expect(create).not.toHaveBeenCalled()
  })

  it.each([
    [{ payment_status: 'paid' }], [{ payment_status: 'refunded' }],
    [{ status: 'rejected' }], [{ status: 'info_requested' }], [{ status: 'under_review' }], [{ status: 'approved' }],
  ])('ineligible state %j → 409', async (over) => {
    standard(row(over))
    const res = await POST(req({ submissionId: SUB_ID }))
    expect(res.status).toBe(409)
    expect(create).not.toHaveBeenCalled()
  })
})

describe('session identity, reuse and concurrency', () => {
  it('first checkout: initial idempotency key and bind only where no session is persisted', async () => {
    standard()
    const res = await POST(req({ submissionId: SUB_ID }))
    expect(await res.json()).toEqual({ url: 'https://checkout.stripe.test/new' })
    expect(create.mock.calls[0][1]).toEqual({ idempotencyKey: `si8-checkout-v2:${SUB_ID}:initial` })
    const bind = queries.find((q) => q.calls.some(([m]) => m === 'update'))!
    expect(has(bind, 'update', { stripe_checkout_session_id: 'cs_new' })).toBe(true)
    expect(has(bind, 'is', 'stripe_checkout_session_id', null)).toBe(true)
    expect(has(bind, 'eq', 'payment_status', 'unpaid')).toBe(true)
    expect(has(bind, 'eq', 'user_id', USER.id)).toBe(true)
  })

  it('an open, matching persisted session is reused (no new session)', async () => {
    standard(row({ stripe_checkout_session_id: 'cs_old' }))
    retrieve.mockResolvedValue({ id: 'cs_old', status: 'open', client_reference_id: SUB_ID, amount_subtotal: 2900, url: 'https://checkout.stripe.test/old' })
    const res = await POST(req({ submissionId: SUB_ID }))
    expect(await res.json()).toEqual({ url: 'https://checkout.stripe.test/old' })
    expect(create).not.toHaveBeenCalled()
  })

  it('an open session with a stale amount is expired and replaced', async () => {
    standard(row({ stripe_checkout_session_id: 'cs_old' }))
    retrieve.mockResolvedValue({ id: 'cs_old', status: 'open', client_reference_id: SUB_ID, amount_subtotal: 49900, url: 'u' })
    const res = await POST(req({ submissionId: SUB_ID }))
    expect(res.status).toBe(200)
    expect(expire).toHaveBeenCalledWith('cs_old')
    expect(create.mock.calls[0][1]).toEqual({ idempotencyKey: `si8-checkout-v2:${SUB_ID}:cs_old` })
  })

  it('a completed persisted session → 409 (payment processing), no new session', async () => {
    standard(row({ stripe_checkout_session_id: 'cs_old' }))
    retrieve.mockResolvedValue({ id: 'cs_old', status: 'complete' })
    expect((await POST(req({ submissionId: SUB_ID }))).status).toBe(409)
    expect(create).not.toHaveBeenCalled()
  })

  it('expired persisted session: new session keyed on it, bind conditional on it', async () => {
    standard(row({ stripe_checkout_session_id: 'cs_old' }))
    retrieve.mockResolvedValue({ id: 'cs_old', status: 'expired' })
    await POST(req({ submissionId: SUB_ID }))
    const bind = queries.find((q) => q.calls.some(([m]) => m === 'update'))!
    expect(has(bind, 'eq', 'stripe_checkout_session_id', 'cs_old')).toBe(true)
  })

  it('idempotent replay of an expired session triggers one fresh attempt', async () => {
    standard()
    create.mockResolvedValueOnce({ id: 'cs_dead', status: 'expired', url: null })
    await POST(req({ submissionId: SUB_ID }))
    expect(create).toHaveBeenCalledTimes(2)
    expect(create.mock.calls[1][1]).toEqual({ idempotencyKey: `si8-checkout-v2:${SUB_ID}:initial:cs_dead` })
  })

  it('concurrent request already bound the same idempotent session → same URL, nothing expired', async () => {
    standard(row(), [], row({ stripe_checkout_session_id: 'cs_new' }))
    const res = await POST(req({ submissionId: SUB_ID }))
    expect(await res.json()).toEqual({ url: 'https://checkout.stripe.test/new' })
    expect(expire).not.toHaveBeenCalled()
  })

  it('lost the bind race to a different session → our session is expired, 409 retry', async () => {
    standard(row(), [], row({ stripe_checkout_session_id: 'cs_other' }))
    const res = await POST(req({ submissionId: SUB_ID }))
    expect(res.status).toBe(409)
    expect(expire).toHaveBeenCalledWith('cs_new')
  })

  it('bind failure → session expired, URL never returned', async () => {
    resolver = (q) => (q.calls.some(([m]) => m === 'update') ? { data: null, error: { code: 'XX' } } : { data: row() })
    const res = await POST(req({ submissionId: SUB_ID }))
    expect(res.status).toBe(500)
    expect(JSON.stringify(await res.json())).not.toContain('checkout.stripe.test')
    expect(expire).toHaveBeenCalledWith('cs_new')
  })

  it('Stripe idempotency conflict (concurrent in-flight) → 409 retry', async () => {
    standard()
    create.mockRejectedValue({ type: 'StripeIdempotencyError', statusCode: 400 })
    expect((await POST(req({ submissionId: SUB_ID }))).status).toBe(409)
  })
})

describe('current /record and /certify payloads remain compatible', () => {
  it('/record body ({submissionId, creatorEmail, tier}) checks out at $29', async () => {
    standard(row({ tier: 'creator_record' }))
    const res = await POST(req({ submissionId: SUB_ID, creatorEmail: 'owner@example.com', tier: 'creator_record' }))
    expect(res.status).toBe(200)
    expect(create.mock.calls[0][0].line_items[0].price_data.unit_amount).toBe(2900)
  })

  it('/certify body checks out at $499', async () => {
    standard(row({ tier: 'si8_certified' }))
    const res = await POST(req({ submissionId: SUB_ID, creatorEmail: 'owner@example.com', tier: 'si8_certified' }))
    expect(res.status).toBe(200)
    expect(create.mock.calls[0][0].line_items[0].price_data.unit_amount).toBe(49900)
  })
})
