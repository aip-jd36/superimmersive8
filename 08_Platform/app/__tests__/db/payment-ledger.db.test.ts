/**
 * CAA-SECURITY-3B — payment ledger migration against REAL PostgreSQL 15.
 *
 * Runs only with DATABASE_URL_TEST (CI: .github/workflows/payment-ledger-db-tests.yml).
 * The database name must start with `si8_test_` and the host must not be a
 * Supabase host; the public schema is dropped and rebuilt.
 *
 * Behavioural calls run as `service_role` (SET ROLE), exactly like production
 * PostgREST, so SECURITY INVOKER + grants are exercised for real.
 */
import { readFileSync } from 'fs'
import { join } from 'path'
import { randomUUID } from 'crypto'
import { Client } from 'pg'

const URL = process.env.DATABASE_URL_TEST
const MIGRATION_DIR = join(__dirname, '..', '..', 'supabase', 'migrations')
const MIGRATION = join(MIGRATION_DIR, '20261021000000_payment_fulfillments.sql')
// FIX-1 (forward-only): Stripe reports a fully discounted session as 'paid' with no PaymentIntent.
const MIGRATION_FIX_1 = join(MIGRATION_DIR, '20261022000000_payment_zero_total_paid.sql')
const BOOTSTRAP = join(__dirname, 'bootstrap.sql')
const PREFLIGHT = join(__dirname, '..', '..', '..', 'implementation', 'caa-3b', 'CAA_3B_PRODUCTION_SCHEMA_PREFLIGHT.sql')

function assertDisposable(url: string) {
  const u = new globalThis.URL(url)
  const db = u.pathname.replace(/^\//, '')
  if (!db.startsWith('si8_test_')) throw new Error(`refusing to run: database "${db}" is not si8_test_*`)
  // Disposable local / CI service container only — never a remote or Supabase host.
  if (!['localhost', '127.0.0.1', '::1', '[::1]'].includes(u.hostname)) {
    throw new Error(`refusing to run: host "${u.hostname}" is not a local disposable database`)
  }
}

if (process.env.CI && !URL) {
  throw new Error('DATABASE_URL_TEST is required in CI — the payment ledger DB suite must not be skipped')
}
const maybe = URL ? describe : describe.skip

maybe('payment ledger (PostgreSQL)', () => {
  let admin: Client
  const extra: Client[] = []
  let installedPolicy: { cutoff_at: Date; accept_until: Date; installed_at: Date; activated_at: Date | null }
  type PreflightRow = { check_id: string; check_name: string; observed: string; expected: string; verdict: string }
  let preflightBefore: PreflightRow[]

  async function connect(role?: 'service_role' | 'anon' | 'authenticated'): Promise<Client> {
    const c = new Client({ connectionString: URL })
    await c.connect()
    if (role) await c.query(`SET ROLE ${role}`)
    extra.push(c)
    return c
  }

  beforeAll(async () => {
    assertDisposable(URL!)
    admin = new Client({ connectionString: URL })
    await admin.connect()
    await admin.query('DROP SCHEMA IF EXISTS public CASCADE')
    await admin.query('CREATE SCHEMA public')
    await admin.query(readFileSync(BOOTSTRAP, 'utf8'))
    preflightBefore = (await admin.query(readFileSync(PREFLIGHT, 'utf8'))).rows   // operator script, verbatim
    await admin.query(readFileSync(MIGRATION, 'utf8'))   // the migration, verbatim
    await admin.query(readFileSync(MIGRATION_FIX_1, 'utf8'))   // then FIX-1, verbatim, in deploy order
    installedPolicy = (await admin.query('SELECT * FROM public.payment_legacy_session_policy')).rows[0]
  })

  afterAll(async () => {
    for (const c of extra) await c.end().catch(() => undefined)
    await admin?.end()
  })

  beforeEach(async () => {
    await admin.query('TRUNCATE public.payment_fulfillments, public.rights_packages, public.submissions, public.users CASCADE')
    // Restore the migration's provisional (un-activated) legacy policy.
    await admin.query(`INSERT INTO public.payment_legacy_session_policy (singleton, cutoff_at, accept_until)
      VALUES (true, now() + interval '72 hours', now() + interval '72 hours' + interval '7 days')
      ON CONFLICT (singleton) DO UPDATE SET cutoff_at = EXCLUDED.cutoff_at, accept_until = EXCLUDED.accept_until,
                                            activated_at = NULL, activation_note = NULL`)
  })

  const nowEpoch = () => Math.floor(Date.now() / 1000)
  /** Set the legacy policy directly (owner), epochs in seconds. */
  async function setPolicy(cutoffEpoch: number, acceptUntilEpoch: number) {
    await admin.query('UPDATE public.payment_legacy_session_policy SET cutoff_at = to_timestamp($1), accept_until = to_timestamp($2)',
      [cutoffEpoch, acceptUntilEpoch])
  }
  const policy = async () => (await admin.query('SELECT * FROM public.payment_legacy_session_policy')).rows[0]

  // ---------------------------------------------------------------- helpers
  async function seedSubmission(over: Partial<{ tier: string; status: string; payment_status: string; stripe_checkout_session_id: string | null }> = {}) {
    const userId = randomUUID()
    await admin.query('INSERT INTO public.users (id, email, name) VALUES ($1, $2, $3)', [userId, `${userId}@example.test`, 'Tester'])
    const { rows } = await admin.query(
      `INSERT INTO public.submissions (user_id, tier, status, payment_status, stripe_checkout_session_id)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [userId, over.tier ?? 'creator_record', over.status ?? 'pending', over.payment_status ?? 'unpaid',
       over.stripe_checkout_session_id === undefined ? null : over.stripe_checkout_session_id],
    )
    return { id: rows[0].id as string, userId }
  }

  const sid = () => `cs_test_${randomUUID().replace(/-/g, '')}`
  const eid = () => `evt_${randomUUID().replace(/-/g, '')}`

  interface Facts {
    session: string; event: string; ref: string | null; created: number | null; status: string | null; mode: string | null
    payment_status: string | null; pi: string | null; currency: string | null
    subtotal: number | null; total: number | null; discount: number | null; tax: number | null; shipping: number | null
  }
  const facts = (over: Partial<Facts> & { session: string; ref: string | null }, price = 2900): Facts => ({
    event: eid(), created: 1760000000, status: 'complete', mode: 'payment', payment_status: 'paid',
    pi: 'pi_test_123', currency: 'usd', subtotal: price, total: price, discount: 0, tax: 0, shipping: 0, ...over,
  })

  async function record(c: Client, f: Facts) {
    const { rows } = await c.query(
      'SELECT * FROM public.record_checkout_payment($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)',
      [f.session, f.event, f.ref, f.created, f.status, f.mode, f.payment_status, f.pi, f.currency,
       f.subtotal, f.total, f.discount, f.tax, f.shipping],
    )
    return rows[0] as { out_outcome: string; out_reason: string; out_is_new: boolean; out_fulfillment_status: string; out_tier: string | null; out_submission_id: string | null }
  }
  const claim = async (c: Client, session: string, max = 6, windowSec = 7 * 24 * 3600) =>
    (await c.query('SELECT * FROM public.claim_payment_fulfillment($1, 300, $2, $3)', [session, max, windowSec])).rows[0]
  const mark = async (c: Client, session: string, token: string | null, step: string, status: string, provider: string | null = null) =>
    (await c.query('SELECT public.mark_payment_fulfillment_step($1,$2,$3,$4,$5,NULL) AS ok', [session, token, step, status, provider])).rows[0].ok as boolean
  const finish = async (c: Client, session: string, token: string | null, err: string | null = null) =>
    (await c.query('SELECT public.finish_payment_fulfillment($1,$2,$3) AS s', [session, token, err])).rows[0].s as string
  const reconcile = async (c: Client, session: string, action: string, note = 'checked Resend log') =>
    (await c.query('SELECT public.reconcile_payment_fulfillment($1,$2,$3,$4) AS r', [session, action, randomUUID(), note])).rows[0].r as string
  const ledger = async (session: string) =>
    (await admin.query('SELECT * FROM public.payment_fulfillments WHERE stripe_checkout_session_id = $1', [session])).rows[0]
  const sub = async (id: string) =>
    (await admin.query('SELECT * FROM public.submissions WHERE id = $1', [id])).rows[0]
  const errCode = async (p: Promise<unknown>) => { try { await p; return null } catch (e: any) { return e.code as string } }

  async function waitForLockWait(pid: number) {
    for (let i = 0; i < 100; i++) {
      const { rows } = await admin.query('SELECT wait_event_type FROM pg_stat_activity WHERE pid = $1', [pid])
      if (rows[0]?.wait_event_type === 'Lock') return true
      await new Promise((r) => setTimeout(r, 50))
    }
    return false
  }

  // ------------------------------------------------- operator preflight script
  test('production preflight script executes read-only and reports no BLOCKER on a compatible schema', async () => {
    expect(preflightBefore.length).toBeGreaterThan(40)
    for (const r of preflightBefore) expect(['PASS', 'BLOCKER', 'REVIEW', 'INFO']).toContain(r.verdict)
    expect(preflightBefore.filter((r) => r.verdict === 'BLOCKER')).toEqual([])
    expect(preflightBefore.find((r) => r.check_name === 'name free: relation public.payment_fulfillments')?.verdict).toBe('PASS')
  })

  test('production preflight script flags an already-applied migration and a missing privilege as BLOCKER', async () => {
    const run = async () => (await admin.query(readFileSync(PREFLIGHT, 'utf8'))).rows as PreflightRow[]
    const after = await run()
    const blockers = after.filter((r) => r.verdict === 'BLOCKER').map((r) => r.check_name)
    expect(blockers).toEqual(expect.arrayContaining([
      'name free: relation public.payment_fulfillments', 'name free: function public.record_checkout_payment',
      'name free: relation public.payment_legacy_session_policy']))
    await admin.query('REVOKE UPDATE ON public.submissions FROM service_role')
    try {
      expect((await run()).find((r) => r.check_name === 'service_role UPDATE on public.submissions')?.verdict).toBe('BLOCKER')
    } finally {
      await admin.query('GRANT UPDATE ON public.submissions TO service_role')
    }
  })

  // ------------------------------------------------------------- pricing
  test('price function is the single list-price authority', async () => {
    const svc = await connect('service_role')
    const { rows } = await svc.query(`SELECT t, public.payment_list_price_cents(t) AS p
      FROM (VALUES ('creator_record'), ('certified'), ('si8_certified'), ('bogus'), (NULL)) v(t)`)
    expect(rows.map((r) => r.p)).toEqual([2900, 49900, 49900, null, null])
  })

  // ------------------------------------------------------- atomic recording
  test('bound Creator Record payment: paid + approved + ledger row, atomically', async () => {
    const svc = await connect('service_role')
    const session = sid()
    const s = await seedSubmission({ tier: 'creator_record', stripe_checkout_session_id: session })
    const r = await record(svc, facts({ session, ref: s.id }))
    expect(r).toMatchObject({ out_outcome: 'accepted', out_reason: 'accepted', out_is_new: true, out_fulfillment_status: 'pending', out_tier: 'creator_record' })
    expect(await sub(s.id)).toMatchObject({ payment_status: 'paid', status: 'approved', amount_paid: 2900, stripe_payment_intent_id: 'pi_test_123' })
    expect(await ledger(session)).toMatchObject({ session_binding: 'bound', pdf_status: 'pending', email_status: 'pending', anomaly_status: 'none', expected_amount: 2900 })
  })

  test('Certified payment never changes review status', async () => {
    const svc = await connect('service_role')
    for (const tier of ['si8_certified', 'certified']) {
      const session = sid()
      const s = await seedSubmission({ tier, stripe_checkout_session_id: session })
      const r = await record(svc, facts({ session, ref: s.id }, 49900))
      expect(r.out_outcome).toBe('accepted')
      expect(await sub(s.id)).toMatchObject({ payment_status: 'paid', status: 'pending' })
      expect(await ledger(session)).toMatchObject({ pdf_status: 'not_required', email_status: 'pending' })
    }
  })

  test('a failure inside the transaction rolls back the submission update', async () => {
    const svc = await connect('service_role')
    const session = sid()
    const s = await seedSubmission({ stripe_checkout_session_id: session })
    await admin.query(`CREATE FUNCTION public.test_boom() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'boom'; END $$`)
    await admin.query('CREATE TRIGGER test_boom BEFORE INSERT ON public.payment_fulfillments FOR EACH ROW EXECUTE FUNCTION public.test_boom()')
    try {
      await expect(record(svc, facts({ session, ref: s.id }))).rejects.toThrow(/boom/)
      expect(await sub(s.id)).toMatchObject({ payment_status: 'unpaid', status: 'pending', stripe_payment_intent_id: null })
    } finally {
      await admin.query('DROP TRIGGER test_boom ON public.payment_fulfillments')
      await admin.query('DROP FUNCTION public.test_boom()')
    }
    expect(await ledger(session)).toBeUndefined()
  })

  // ------------------------------------------------- validation (null-safe)
  test.each([
    ['session_not_complete', { status: 'open' }],
    ['session_not_complete', { status: null }],
    ['unexpected_mode', { mode: 'subscription' }],
    ['currency_mismatch', { currency: 'eur' }],
    ['currency_mismatch', { currency: null }],
    ['amount_mismatch', { subtotal: 49900, total: 49900 }],
    ['amount_mismatch', { subtotal: null }],
    ['unexpected_tax_or_shipping', { tax: 100, total: 3000 }],
    ['unexpected_tax_or_shipping', { shipping: 50 }],
    ['total_out_of_range', { total: null }],
    ['total_out_of_range', { total: -1 }],
    ['total_out_of_range', { total: 3000 }],
    ['discount_inconsistent', { total: 1000, discount: 0 }],
    ['discount_inconsistent', { total: 2900, discount: -1 }],
    ['payment_status_inconsistent', { pi: null }],
    ['payment_status_inconsistent', { pi: 'not_a_pi' }],
    ['payment_status_inconsistent', { total: 0, discount: 2900 }],   // 'paid' $0 WITH a PaymentIntent
    ['payment_status_inconsistent', { total: 0, discount: 2900, pi: 'not_a_pi' }],
    ['payment_status_inconsistent', { payment_status: 'no_payment_required', total: 100, discount: 2800 }],
    ['payment_not_settled', { payment_status: 'unpaid' }],
    ['payment_not_settled', { payment_status: null }],
  ])('rejects %s (%j) without touching the submission', async (reason, over) => {
    const svc = await connect('service_role')
    const session = sid()
    const s = await seedSubmission({ stripe_checkout_session_id: session })
    const r = await record(svc, facts({ session, ref: s.id, ...(over as Partial<Facts>) }))
    expect(r).toMatchObject({ out_outcome: 'rejected', out_reason: reason, out_fulfillment_status: 'not_required' })
    expect(await sub(s.id)).toMatchObject({ payment_status: 'unpaid', status: 'pending' })
    expect(await ledger(session)).toMatchObject({ anomaly_status: 'open', pdf_status: 'not_required', email_status: 'not_required' })
  })

  test('old client-priced session ($29 on a $499 row) is rejected by amount', async () => {
    const svc = await connect('service_role')
    const session = sid()
    const s = await seedSubmission({ tier: 'si8_certified', stripe_checkout_session_id: session })
    const r = await record(svc, facts({ session, ref: s.id }, 2900))
    expect(r).toMatchObject({ out_outcome: 'rejected', out_reason: 'amount_mismatch' })
    expect(await sub(s.id)).toMatchObject({ payment_status: 'unpaid', status: 'pending' })
  })

  test('valid 100% promotion: no_payment_required, total 0, null payment intent', async () => {
    const svc = await connect('service_role')
    const session = sid()
    const s = await seedSubmission({ stripe_checkout_session_id: session })
    const r = await record(svc, facts({ session, ref: s.id, payment_status: 'no_payment_required', total: 0, discount: 2900, pi: null }))
    expect(r).toMatchObject({ out_outcome: 'accepted', out_reason: 'accepted' })
    expect(await sub(s.id)).toMatchObject({ payment_status: 'paid', status: 'approved', amount_paid: 0 })
  })

  // ------------------------------------------- FIX-1: Stripe 'paid' + $0
  // Observed live (INCIDENT-1): a 100%-discounted payment-mode session arrives
  // as payment_status 'paid', amount_total 0, payment_intent null.
  const zeroPaid = (price: number): Partial<Facts> => ({ payment_status: 'paid', total: 0, discount: price, pi: null })

  test('FIX-1: Creator Record $0 paid session (no PaymentIntent) is accepted and approved', async () => {
    const svc = await connect('service_role')
    const session = sid()
    const s = await seedSubmission({ tier: 'creator_record', stripe_checkout_session_id: session })
    const r = await record(svc, facts({ session, ref: s.id, ...zeroPaid(2900) }))
    expect(r).toMatchObject({ out_outcome: 'accepted', out_reason: 'accepted', out_is_new: true, out_fulfillment_status: 'pending', out_tier: 'creator_record' })
    expect(await sub(s.id)).toMatchObject({ payment_status: 'paid', status: 'approved', amount_paid: 0, stripe_payment_intent_id: null })
    expect(await ledger(session)).toMatchObject({
      session_binding: 'bound', anomaly_status: 'none', stripe_payment_status: 'paid', stripe_payment_intent_id: null,
      expected_amount: 2900, amount_subtotal: 2900, amount_discount: 2900, amount_total: 0,
      fulfillment_status: 'pending', pdf_status: 'pending', email_status: 'pending' })
  })

  test('FIX-1: Certified $0 paid session is accepted but never approved', async () => {
    const svc = await connect('service_role')
    for (const tier of ['si8_certified', 'certified']) {
      const session = sid()
      const s = await seedSubmission({ tier, stripe_checkout_session_id: session })
      const r = await record(svc, facts({ session, ref: s.id, ...zeroPaid(49900) }, 49900))
      expect(r).toMatchObject({ out_outcome: 'accepted', out_reason: 'accepted' })
      expect(await sub(s.id)).toMatchObject({ payment_status: 'paid', status: 'pending', amount_paid: 0 })
      expect(await ledger(session)).toMatchObject({ pdf_status: 'not_required', email_status: 'pending', anomaly_status: 'none' })
    }
  })

  test('FIX-1: positive paid sessions keep the PaymentIntent requirement', async () => {
    const svc = await connect('service_role')
    const cases: Array<[Partial<Facts>, string, string]> = [
      [{}, 'accepted', 'accepted'],                                            // full price
      [{ total: 1450, discount: 1450 }, 'accepted', 'accepted'],               // partial promotion
      [{ total: 1450, discount: 1450, pi: null }, 'rejected', 'payment_status_inconsistent'],
      [{ pi: null }, 'rejected', 'payment_status_inconsistent'],
      [{ pi: '' }, 'rejected', 'payment_status_inconsistent'],
      [{ pi: 'ch_123' }, 'rejected', 'payment_status_inconsistent'],
      [{ total: 1, discount: 2899, pi: null }, 'rejected', 'payment_status_inconsistent'],
    ]
    for (const [over, outcome, reason] of cases) {
      const session = sid()
      const s = await seedSubmission({ stripe_checkout_session_id: session })
      const r = await record(svc, facts({ session, ref: s.id, ...over }))
      expect([r.out_outcome, r.out_reason]).toEqual([outcome, reason])
      expect((await sub(s.id)).payment_status).toBe(outcome === 'accepted' ? 'paid' : 'unpaid')
    }
  })

  test.each([
    ['session_not_complete', { status: 'open' }],
    ['unexpected_mode', { mode: 'subscription' }],
    ['currency_mismatch', { currency: 'twd' }],
    ['amount_mismatch', { subtotal: 0 }],                                      // $0 list price is not a full discount
    ['amount_mismatch', { subtotal: 49900, discount: 49900 }],                 // wrong tier price
    ['unexpected_tax_or_shipping', { tax: 100 }],
    ['unexpected_tax_or_shipping', { shipping: 100 }],
    ['discount_inconsistent', { discount: 2800 }],                             // not a full discount
    ['discount_inconsistent', { discount: null }],
    ['payment_status_inconsistent', { pi: 'pi_test_123' }],                   // $0 with a PaymentIntent
    ['payment_not_settled', { payment_status: 'unpaid' }],
  ])('FIX-1: $0 paid session still rejected for %s (%j), submission untouched', async (reason, over) => {
    const svc = await connect('service_role')
    const session = sid()
    const s = await seedSubmission({ stripe_checkout_session_id: session })
    const r = await record(svc, facts({ session, ref: s.id, ...zeroPaid(2900), ...(over as Partial<Facts>) }))
    expect(r).toMatchObject({ out_outcome: 'rejected', out_reason: reason, out_fulfillment_status: 'not_required' })
    expect(await sub(s.id)).toMatchObject({ payment_status: 'unpaid', status: 'pending', amount_paid: null })
    expect(await ledger(session)).toMatchObject({ anomaly_status: 'open', pdf_status: 'not_required', email_status: 'not_required' })
  })

  test('FIX-1: $0 paid session keeps every binding rule (mismatch, unknown submission, unbound after cutoff)', async () => {
    const svc = await connect('service_role')
    const persisted = sid()
    const m = await seedSubmission({ stripe_checkout_session_id: persisted })
    const mismatch = await record(svc, facts({ session: sid(), ref: m.id, ...zeroPaid(2900) }))
    expect(mismatch).toMatchObject({ out_outcome: 'rejected', out_reason: 'session_mismatch' })
    expect(await sub(m.id)).toMatchObject({ payment_status: 'unpaid', status: 'pending', stripe_checkout_session_id: persisted })

    const unknown = await record(svc, facts({ session: sid(), ref: randomUUID(), ...zeroPaid(2900) }))
    expect(unknown).toMatchObject({ out_outcome: 'rejected', out_reason: 'unknown_submission' })

    const now = nowEpoch()
    await setPolicy(now - 3600, now + 86400)
    const u = await seedSubmission({ stripe_checkout_session_id: null })
    const unbound = await record(svc, facts({ session: sid(), ref: u.id, created: now - 60, ...zeroPaid(2900) }))
    expect(unbound).toMatchObject({ out_outcome: 'rejected', out_reason: 'unbound_session_after_cutoff' })
    expect(await sub(u.id)).toMatchObject({ payment_status: 'unpaid', status: 'pending' })
  })

  test('FIX-1: $0 paid replay is a no-op and a second $0 session is a duplicate', async () => {
    const svc = await connect('service_role')
    const session = sid()
    const s = await seedSubmission({ stripe_checkout_session_id: session })
    const f = facts({ session, ref: s.id, ...zeroPaid(2900) })
    expect((await record(svc, f)).out_is_new).toBe(true)
    const before = await sub(s.id)
    const replay = await record(svc, { ...f, event: eid() })
    expect(replay).toMatchObject({ out_outcome: 'accepted', out_reason: 'accepted', out_is_new: false })
    expect(await sub(s.id)).toEqual(before)
    const dup = await record(svc, facts({ session: sid(), ref: s.id, ...zeroPaid(2900) }))
    expect(dup).toMatchObject({ out_outcome: 'duplicate_payment', out_reason: 'submission_already_paid', out_is_new: true })
    expect((await admin.query(`SELECT count(*)::int AS n FROM public.payment_fulfillments WHERE outcome = 'accepted'`)).rows[0].n).toBe(1)
  })

  test('FIX-1: $0 paid Creator Record runs the normal fenced fulfillment to completion', async () => {
    const svc = await connect('service_role')
    const session = sid()
    const s = await seedSubmission({ stripe_checkout_session_id: session })
    await record(svc, facts({ session, ref: s.id, ...zeroPaid(2900) }))
    const c = await claim(svc, session)
    expect(c).toMatchObject({ out_claimed: true, out_pdf_status: 'pending', out_email_status: 'pending' })
    expect(await mark(svc, session, c.out_claim_token, 'pdf', 'completed')).toBe(true)
    expect(await mark(svc, session, c.out_claim_token, 'email', 'sending')).toBe(true)
    expect(await mark(svc, session, c.out_claim_token, 'email', 'accepted', 're_zero')).toBe(true)
    expect(await finish(svc, session, c.out_claim_token)).toBe('completed')
    expect((await claim(svc, session)).out_reason).toBe('nothing_to_do')
  })

  test('FIX-1: accepted-row constraint admits paid+$0 only without a PaymentIntent', async () => {
    const insert = async (ps: string, total: number, pi: string | null) => {
      const s = await seedSubmission()
      return errCode(admin.query(
        `INSERT INTO public.payment_fulfillments (stripe_checkout_session_id, submission_ref, submission_id, session_binding,
           first_stripe_event_id, last_stripe_event_id, stripe_session_status, stripe_mode, stripe_payment_status,
           stripe_payment_intent_id, tier, expected_amount, currency, amount_subtotal, amount_total, amount_discount,
           outcome, outcome_reason, fulfillment_status, pdf_status, email_status)
         VALUES ($1, $2, $2, 'bound', 'evt_x', 'evt_x', 'complete', 'payment', $3, $4, 'creator_record', 2900, 'usd', 2900,
           $5::int, 2900 - $5::int, 'accepted', 'accepted', 'not_required', 'not_required', 'not_required')`,
        [sid(), s.id, ps, pi, total]))
    }
    expect(await insert('paid', 0, null)).toBeNull()
    expect(await insert('paid', 0, 'pi_x')).toBe('23514')
    expect(await insert('paid', 2900, null)).toBe('23514')
    expect(await insert('paid', 2900, 'pi_x')).toBeNull()
    expect(await insert('no_payment_required', 0, null)).toBeNull()
    expect(await insert('no_payment_required', 100, null)).toBe('23514')
    expect(await insert('unpaid', 0, null)).toBe('23514')
  })

  test('partial promotion is accepted with the discounted total recorded', async () => {
    const svc = await connect('service_role')
    const session = sid()
    const s = await seedSubmission({ tier: 'si8_certified', stripe_checkout_session_id: session })
    const r = await record(svc, facts({ session, ref: s.id, total: 44910, discount: 4990 }, 49900))
    expect(r.out_outcome).toBe('accepted')
    expect(await sub(s.id)).toMatchObject({ amount_paid: 44910, status: 'pending' })
  })

  test('unknown / malformed client_reference_id is a rejected anomaly with no submission', async () => {
    const svc = await connect('service_role')
    for (const ref of [randomUUID(), 'not-a-uuid', null]) {
      const session = sid()
      const r = await record(svc, facts({ session, ref }))
      expect(r).toMatchObject({ out_outcome: 'rejected', out_reason: 'unknown_submission', out_submission_id: null })
      expect(await ledger(session)).toMatchObject({ session_binding: 'no_submission', submission_ref: null })
    }
  })

  test('invalid session / event ids raise 22023', async () => {
    const svc = await connect('service_role')
    const s = await seedSubmission()
    expect(await errCode(record(svc, facts({ session: 'bogus', ref: s.id })))).toBe('22023')
    expect(await errCode(record(svc, { ...facts({ session: sid(), ref: s.id }), event: 'nope' }))).toBe('22023')
  })

  // ------------------------------------------------ session reconciliation
  test('session mismatch (persisted id differs) is rejected, submission untouched', async () => {
    const svc = await connect('service_role')
    const s = await seedSubmission({ stripe_checkout_session_id: sid() })
    const session = sid()
    const r = await record(svc, facts({ session, ref: s.id }))
    expect(r).toMatchObject({ out_outcome: 'rejected', out_reason: 'session_mismatch' })
    expect(await ledger(session)).toMatchObject({ session_binding: 'mismatch', anomaly_status: 'open' })
    expect(await sub(s.id)).toMatchObject({ payment_status: 'unpaid' })
  })

  test('legacy unbound session (no persisted id) is accepted explicitly with an open anomaly', async () => {
    const svc = await connect('service_role')
    const s = await seedSubmission({ stripe_checkout_session_id: null })
    const session = sid()
    const r = await record(svc, facts({ session, ref: s.id }))
    expect(r).toMatchObject({ out_outcome: 'accepted', out_reason: 'accepted_unbound_legacy_session' })
    expect(await ledger(session)).toMatchObject({ session_binding: 'unbound', anomaly_status: 'open', fulfillment_status: 'pending' })
    expect(await sub(s.id)).toMatchObject({ payment_status: 'paid', status: 'approved', stripe_checkout_session_id: session })
  })

  // ------------------------------------------------- legacy unbound sunset (E2)
  test('migration installs fail-closed provisional bounds (72h cutoff, +7d absolute sunset, not activated)', async () => {
    const hours = (a: Date, b: Date) => (a.getTime() - b.getTime()) / 3_600_000
    expect(hours(installedPolicy.cutoff_at, installedPolicy.installed_at)).toBeCloseTo(72, 1)
    expect(hours(installedPolicy.accept_until, installedPolicy.cutoff_at)).toBeCloseTo(7 * 24, 5)
    expect(installedPolicy.activated_at).toBeNull()
  })

  test('unbound session created at/after the cutoff is rejected (signed created time), submission untouched', async () => {
    const svc = await connect('service_role')
    const cutoff = nowEpoch() - 3600
    await setPolicy(cutoff, cutoff + 7 * 86400)
    for (const created of [cutoff, cutoff + 1, nowEpoch()]) {
      const s = await seedSubmission({ stripe_checkout_session_id: null })
      const session = sid()
      const r = await record(svc, facts({ session, ref: s.id, created }))
      expect(r).toMatchObject({ out_outcome: 'rejected', out_reason: 'unbound_session_after_cutoff', out_is_new: true, out_fulfillment_status: 'not_required' })
      const row = await ledger(session)
      expect(row).toMatchObject({ session_binding: 'unbound', anomaly_status: 'open', pdf_status: 'not_required', email_status: 'not_required' })
      expect(row.stripe_session_created_at.getTime()).toBe(created * 1000)
      expect(await sub(s.id)).toMatchObject({ payment_status: 'unpaid', status: 'pending', stripe_checkout_session_id: null })
    }
  })

  test('unbound session created strictly before the cutoff, inside the window, is accepted with an open anomaly', async () => {
    const svc = await connect('service_role')
    const cutoff = nowEpoch() - 3600
    await setPolicy(cutoff, cutoff + 7 * 86400)
    const s = await seedSubmission({ stripe_checkout_session_id: null })
    const session = sid()
    const r = await record(svc, facts({ session, ref: s.id, created: cutoff - 1 }))
    expect(r).toMatchObject({ out_outcome: 'accepted', out_reason: 'accepted_unbound_legacy_session' })
    expect(await ledger(session)).toMatchObject({ session_binding: 'unbound', anomaly_status: 'open' })
  })

  test('unbound session with no signed creation time is rejected', async () => {
    const svc = await connect('service_role')
    const s = await seedSubmission({ stripe_checkout_session_id: null })
    const r = await record(svc, facts({ session: sid(), ref: s.id, created: null }))
    expect(r).toMatchObject({ out_outcome: 'rejected', out_reason: 'unbound_session_created_unknown' })
    expect(await sub(s.id)).toMatchObject({ payment_status: 'unpaid' })
  })

  test('absolute sunset: after accept_until even a genuinely pre-cutoff session is rejected (no expiry assumption)', async () => {
    const svc = await connect('service_role')
    const cutoff = nowEpoch() - 7 * 86400
    await setPolicy(cutoff, nowEpoch() - 60)
    const s = await seedSubmission({ stripe_checkout_session_id: null })
    const r = await record(svc, facts({ session: sid(), ref: s.id, created: cutoff - 3600 }))
    expect(r).toMatchObject({ out_outcome: 'rejected', out_reason: 'unbound_session_window_closed' })
    expect(await sub(s.id)).toMatchObject({ payment_status: 'unpaid' })
  })

  test('missing policy row fails closed', async () => {
    const svc = await connect('service_role')
    await admin.query('DELETE FROM public.payment_legacy_session_policy')
    const s = await seedSubmission({ stripe_checkout_session_id: null })
    const r = await record(svc, facts({ session: sid(), ref: s.id, created: 1000000000 }))
    expect(r).toMatchObject({ out_outcome: 'rejected', out_reason: 'unbound_session_window_closed' })
  })

  test('bound sessions are unaffected by the legacy cutoff or sunset', async () => {
    const svc = await connect('service_role')
    await setPolicy(nowEpoch() - 7 * 86400, nowEpoch() - 60)   // exception fully closed
    const session = sid()
    const s = await seedSubmission({ stripe_checkout_session_id: session })
    const r = await record(svc, facts({ session, ref: s.id, created: nowEpoch() }))
    expect(r).toMatchObject({ out_outcome: 'accepted', out_reason: 'accepted' })
  })

  test('a mismatched session is rejected whatever its creation time', async () => {
    const svc = await connect('service_role')
    for (const created of [1000000000, nowEpoch()]) {
      const s = await seedSubmission({ stripe_checkout_session_id: sid() })
      const r = await record(svc, facts({ session: sid(), ref: s.id, created }))
      expect(r).toMatchObject({ out_outcome: 'rejected', out_reason: 'session_mismatch' })
    }
  })

  test('activation procedure: tighten-only, past-only, noted; then enforces the exact deploy time T', async () => {
    const svc = await connect('service_role')
    const activate = (t: number | null, note: string | null = 'deploy confirmed live') =>
      admin.query('SELECT * FROM public.activate_payment_legacy_cutoff(to_timestamp($1), $2)', [t, note])
    expect(await errCode(activate(nowEpoch() + 3600))).toBe('22023')               // future
    expect(await errCode(activate(null))).toBe('22023')
    expect(await errCode(activate(nowEpoch() - 60, 'x'))).toBe('22023')            // note required
    const T = nowEpoch() - 600
    const { rows } = await activate(T)
    expect(rows[0].out_cutoff_at.getTime()).toBe(T * 1000)
    expect(rows[0].out_accept_until.getTime()).toBe((T + 7 * 86400) * 1000)        // tightened from provisional
    const pol = await policy()
    expect(pol.activation_note).toBe('deploy confirmed live')
    expect(pol.activated_at).not.toBeNull()
    expect(await errCode(activate(T + 60))).toBe('22023')                          // cannot loosen
    expect((await activate(T)).rows[0].out_cutoff_at.getTime()).toBe(T * 1000)    // idempotent

    const before = await seedSubmission({ stripe_checkout_session_id: null })
    expect(await record(svc, facts({ session: sid(), ref: before.id, created: T - 1 })))
      .toMatchObject({ out_outcome: 'accepted', out_reason: 'accepted_unbound_legacy_session' })
    const after = await seedSubmission({ stripe_checkout_session_id: null })
    expect(await record(svc, facts({ session: sid(), ref: after.id, created: T })))
      .toMatchObject({ out_outcome: 'rejected', out_reason: 'unbound_session_after_cutoff' })
  })

  test('service_role can read but never change the legacy policy or run activation', async () => {
    const svc = await connect('service_role')
    expect((await svc.query('SELECT cutoff_at FROM public.payment_legacy_session_policy')).rows).toHaveLength(1)
    expect(await errCode(svc.query(`UPDATE public.payment_legacy_session_policy SET accept_until = now() + interval '1 year'`))).toBe('42501')
    expect(await errCode(svc.query('DELETE FROM public.payment_legacy_session_policy'))).toBe('42501')
    expect(await errCode(svc.query(`INSERT INTO public.payment_legacy_session_policy (singleton, cutoff_at, accept_until) VALUES (true, now(), now())`))).toBe('42501')
    expect(await errCode(svc.query(`SELECT * FROM public.activate_payment_legacy_cutoff(now() - interval '1 hour', 'trying to reopen')`))).toBe('42501')
  })

  test('policy constraints: singleton, ordered bounds, tail at most 7 days', async () => {
    expect(await errCode(admin.query(`INSERT INTO public.payment_legacy_session_policy (singleton, cutoff_at, accept_until) VALUES (false, now(), now())`))).toBe('23514')
    expect(await errCode(admin.query(`UPDATE public.payment_legacy_session_policy SET accept_until = cutoff_at - interval '1 second'`))).toBe('23514')
    expect(await errCode(admin.query(`UPDATE public.payment_legacy_session_policy SET accept_until = cutoff_at + interval '8 days'`))).toBe('23514')
  })

  test('accepted unbound rows cannot lose their signed creation time', async () => {
    const svc = await connect('service_role')
    const s = await seedSubmission({ stripe_checkout_session_id: null })
    const session = sid()
    await record(svc, facts({ session, ref: s.id }))
    expect(await errCode(admin.query('UPDATE public.payment_fulfillments SET stripe_session_created_at = NULL WHERE stripe_checkout_session_id = $1', [session]))).toBe('23514')
  })

  // ------------------------------------------------ DB failure classification (E3)
  test('an unexpected constraint failure (23514) propagates with its SQLSTATE and writes nothing; a retry succeeds once fixed', async () => {
    const svc = await connect('service_role')
    const session = sid()
    const s = await seedSubmission({ stripe_checkout_session_id: session })
    await admin.query(`ALTER TABLE public.submissions ADD CONSTRAINT test_reject_paid CHECK (payment_status <> 'paid') NOT VALID`)
    const f = facts({ session, ref: s.id })
    try {
      expect(await errCode(record(svc, f))).toBe('23514')
      expect(await sub(s.id)).toMatchObject({ payment_status: 'unpaid', status: 'pending', stripe_checkout_session_id: session })
      expect(await ledger(session)).toBeUndefined()
    } finally {
      await admin.query('ALTER TABLE public.submissions DROP CONSTRAINT test_reject_paid')
    }
    // Environment fixed: the same delivery (Stripe retry) now records normally.
    expect(await record(svc, f)).toMatchObject({ out_outcome: 'accepted', out_reason: 'accepted', out_is_new: true })
  })

  test('pre-ledger payment: no fulfillment evidence is invented', async () => {
    const svc = await connect('service_role')
    const sessionA = sid()
    const a = await seedSubmission({ tier: 'creator_record', status: 'approved', payment_status: 'paid', stripe_checkout_session_id: sessionA })
    await admin.query('INSERT INTO public.rights_packages (submission_id, document_url) VALUES ($1, $2)', [a.id, 'https://x/doc.pdf'])
    const ra = await record(svc, facts({ session: sessionA, ref: a.id }))
    expect(ra).toMatchObject({ out_outcome: 'accepted', out_reason: 'pre_ledger_payment', out_fulfillment_status: 'needs_reconciliation' })
    expect(await ledger(sessionA)).toMatchObject({ pdf_status: 'completed', email_status: 'unknown', anomaly_status: 'open' })

    const sessionB = sid()
    const b = await seedSubmission({ tier: 'creator_record', status: 'approved', payment_status: 'paid', stripe_checkout_session_id: sessionB })
    await record(svc, facts({ session: sessionB, ref: b.id }))
    expect(await ledger(sessionB)).toMatchObject({ pdf_status: 'pending', email_status: 'unknown' })

    // automatic claims never touch it
    expect((await claim(svc, sessionB)).out_reason).toBe('needs_reconciliation')
    expect(await sub(b.id)).toMatchObject({ status: 'approved', payment_status: 'paid' })   // no submission write
  })

  // ------------------------------------------------ human state preserved
  test.each(['rejected', 'info_requested', 'under_review', 'approved'])(
    'unpaid %s submission: payment recorded, status untouched, anomaly open', async (status) => {
      const svc = await connect('service_role')
      const session = sid()
      const s = await seedSubmission({ tier: 'si8_certified', status, stripe_checkout_session_id: session })
      const r = await record(svc, facts({ session, ref: s.id }, 49900))
      expect(r).toMatchObject({ out_outcome: 'accepted', out_reason: 'accepted_status_not_pending', out_fulfillment_status: 'not_required' })
      expect(await sub(s.id)).toMatchObject({ status, payment_status: 'paid' })
      expect(await ledger(session)).toMatchObject({ anomaly_status: 'open' })
    })

  test('Creator Record already rejected by a human is never approved by payment', async () => {
    const svc = await connect('service_role')
    const session = sid()
    const s = await seedSubmission({ tier: 'creator_record', status: 'rejected', stripe_checkout_session_id: session })
    await record(svc, facts({ session, ref: s.id }))
    expect(await sub(s.id)).toMatchObject({ status: 'rejected', payment_status: 'paid' })
  })

  // ---------------------------------------------- replay / duplicates
  test('replay of the same session changes nothing but last_stripe_event_id', async () => {
    const svc = await connect('service_role')
    const session = sid()
    const s = await seedSubmission({ stripe_checkout_session_id: session })
    const f = facts({ session, ref: s.id })
    await record(svc, f)
    const before = await sub(s.id)
    const replayEvent = eid()
    const r2 = await record(svc, { ...f, event: replayEvent, total: 1 /* even altered facts are ignored */ })
    expect(r2).toMatchObject({ out_outcome: 'accepted', out_is_new: false })
    expect(await sub(s.id)).toEqual(before)
    expect((await ledger(session)).last_stripe_event_id).toBe(replayEvent)
    expect((await admin.query('SELECT count(*)::int AS n FROM public.payment_fulfillments')).rows[0].n).toBe(1)
  })

  test('second session for an already-paid submission is a duplicate_payment anomaly', async () => {
    const svc = await connect('service_role')
    const session1 = sid()
    const s = await seedSubmission({ stripe_checkout_session_id: session1 })
    await record(svc, facts({ session: session1, ref: s.id }))
    const session2 = sid()
    const r = await record(svc, facts({ session: session2, ref: s.id }))
    expect(r).toMatchObject({ out_outcome: 'duplicate_payment', out_reason: 'submission_already_paid' })
    expect(await sub(s.id)).toMatchObject({ stripe_checkout_session_id: session1 })
  })

  test('the database refuses a second accepted row for one submission', async () => {
    const svc = await connect('service_role')
    const session = sid()
    const s = await seedSubmission({ stripe_checkout_session_id: session })
    await record(svc, facts({ session, ref: s.id }))
    const code = await errCode(admin.query(
      `INSERT INTO public.payment_fulfillments (stripe_checkout_session_id, submission_ref, submission_id, session_binding,
         first_stripe_event_id, last_stripe_event_id, stripe_session_status, stripe_mode, stripe_payment_status,
         stripe_payment_intent_id, tier, expected_amount, currency, amount_subtotal, amount_total,
         outcome, outcome_reason, fulfillment_status, pdf_status, email_status)
       VALUES ($1, $2, $2, 'bound', 'evt_x', 'evt_x', 'complete', 'payment', 'paid', 'pi_x', 'creator_record', 2900, 'usd', 2900, 2900,
         'accepted', 'accepted', 'not_required', 'not_required', 'not_required')`, [sid(), s.id]))
    expect(code).toBe('23505')
  })

  test('paid → manually reset to unpaid → second genuine payment: duplicate anomaly, no error loop', async () => {
    const svc = await connect('service_role')
    const session1 = sid()
    const s = await seedSubmission({ tier: 'si8_certified', stripe_checkout_session_id: session1 })
    await record(svc, facts({ session: session1, ref: s.id }, 49900))
    const session2 = sid()
    await admin.query(`UPDATE public.submissions SET payment_status = 'unpaid', stripe_checkout_session_id = $2 WHERE id = $1`, [s.id, session2])
    const r = await record(svc, facts({ session: session2, ref: s.id }, 49900))   // must not raise 23505
    expect(r).toMatchObject({ out_outcome: 'duplicate_payment', out_reason: 'submission_has_accepted_payment', out_is_new: true })
    expect(await sub(s.id)).toMatchObject({ payment_status: 'unpaid', status: 'pending' })
    expect(await ledger(session2)).toMatchObject({ anomaly_status: 'open', fulfillment_status: 'not_required' })
    const again = await record(svc, facts({ session: session2, ref: s.id }, 49900))   // Stripe redelivery
    expect(again).toMatchObject({ out_outcome: 'duplicate_payment', out_is_new: false })
  })

  test('accepted-row constraint rejects NULL payment facts (CHECK NULL trap closed)', async () => {
    const s = await seedSubmission()
    const code = await errCode(admin.query(
      `INSERT INTO public.payment_fulfillments (stripe_checkout_session_id, submission_ref, session_binding,
         first_stripe_event_id, last_stripe_event_id, outcome, outcome_reason, fulfillment_status, pdf_status, email_status)
       VALUES ($1, $2, 'bound', 'evt_x', 'evt_x', 'accepted', 'accepted', 'not_required', 'not_required', 'not_required')`, [sid(), s.id]))
    expect(code).toBe('23514')
  })

  // ------------------------------------------------------- concurrency
  test('concurrent deliveries of one session serialize; exactly one is new', async () => {
    const a = await connect('service_role')
    const b = await connect('service_role')
    const session = sid()
    const s = await seedSubmission({ stripe_checkout_session_id: session })
    const f = facts({ session, ref: s.id })
    const bPid = (await b.query('SELECT pg_backend_pid() AS p')).rows[0].p
    await a.query('BEGIN')
    const ra = await record(a, f)
    const pb = record(b, { ...f, event: eid() })
    expect(await waitForLockWait(bPid)).toBe(true)
    await a.query('COMMIT')
    const rb = await pb
    expect(ra.out_is_new).toBe(true)
    expect(rb).toMatchObject({ out_is_new: false, out_outcome: 'accepted' })
    expect((await admin.query('SELECT count(*)::int AS n FROM public.payment_fulfillments')).rows[0].n).toBe(1)
  })

  test('concurrent different sessions for one submission: one accepted, one duplicate', async () => {
    const a = await connect('service_role')
    const b = await connect('service_role')
    const s = await seedSubmission({ stripe_checkout_session_id: null })   // legacy: both unbound
    const bPid = (await b.query('SELECT pg_backend_pid() AS p')).rows[0].p
    const sessionA = sid()
    const sessionB = sid()
    await a.query('BEGIN')
    const ra = await record(a, facts({ session: sessionA, ref: s.id }))
    const pb = record(b, facts({ session: sessionB, ref: s.id }))
    expect(await waitForLockWait(bPid)).toBe(true)
    await a.query('COMMIT')
    const rb = await pb
    expect(ra.out_outcome).toBe('accepted')
    expect(rb.out_outcome).toBe('duplicate_payment')
    expect(await sub(s.id)).toMatchObject({ stripe_checkout_session_id: sessionA })
  })

  test('concurrent unknown-submission deliveries produce one row (insert conflict path)', async () => {
    const a = await connect('service_role')
    const b = await connect('service_role')
    const session = sid()
    const f = facts({ session, ref: randomUUID() })
    const bPid = (await b.query('SELECT pg_backend_pid() AS p')).rows[0].p
    await a.query('BEGIN')
    await record(a, f)
    const pb = record(b, { ...f, event: eid() })
    expect(await waitForLockWait(bPid)).toBe(true)
    await a.query('COMMIT')
    const rb = await pb
    expect(rb).toMatchObject({ out_is_new: false, out_outcome: 'rejected' })
    expect((await admin.query('SELECT count(*)::int AS n FROM public.payment_fulfillments')).rows[0].n).toBe(1)
  })

  // ------------------------------------------- claim / lease / fencing
  async function acceptedCreatorRecord() {
    const svc = await connect('service_role')
    const session = sid()
    const s = await seedSubmission({ stripe_checkout_session_id: session })
    await record(svc, facts({ session, ref: s.id }))
    return { svc, session, s }
  }

  test('claim persists the token; second claim is refused while the lease is live', async () => {
    const { svc, session } = await acceptedCreatorRecord()
    const c1 = await claim(svc, session)
    expect(c1).toMatchObject({ out_claimed: true, out_reason: 'claimed', out_pdf_status: 'pending', out_email_status: 'pending' })
    const row = await ledger(session)
    expect(row.claim_token).toBe(c1.out_claim_token)
    expect(row.fulfillment_status).toBe('in_progress')
    expect(row.attempts).toBe(1)
    expect((await claim(svc, session)).out_reason).toBe('claimed_elsewhere')
  })

  test('expired lease is re-claimable with a new token; the old token is fenced out', async () => {
    const { svc, session } = await acceptedCreatorRecord()
    const c1 = await claim(svc, session)
    await admin.query(`UPDATE public.payment_fulfillments SET claimed_until = now() - interval '1 second' WHERE stripe_checkout_session_id = $1`, [session])
    const c2 = await claim(svc, session)
    expect(c2.out_claimed).toBe(true)
    expect(c2.out_claim_token).not.toBe(c1.out_claim_token)
    expect(await mark(svc, session, c1.out_claim_token, 'pdf', 'completed')).toBe(false)
    expect(await finish(svc, session, c1.out_claim_token)).toBe('not_owner')
    expect(await mark(svc, session, c2.out_claim_token, 'pdf', 'completed')).toBe(true)
    expect(await mark(svc, session, null, 'pdf', 'completed')).toBe(false)
  })

  test('full success path: pdf → email sending → accepted → completed', async () => {
    const { svc, session } = await acceptedCreatorRecord()
    const c = await claim(svc, session)
    expect(await mark(svc, session, c.out_claim_token, 'email', 'sending')).toBe(false)   // PDF first
    expect(await mark(svc, session, c.out_claim_token, 'pdf', 'completed')).toBe(true)
    expect(await mark(svc, session, c.out_claim_token, 'email', 'sending')).toBe(true)
    expect(await mark(svc, session, c.out_claim_token, 'email', 'accepted', null)).toBe(false)   // needs provider id
    expect(await mark(svc, session, c.out_claim_token, 'email', 'accepted', 're_123')).toBe(true)
    expect(await finish(svc, session, c.out_claim_token)).toBe('completed')
    expect(await ledger(session)).toMatchObject({ fulfillment_status: 'completed', claim_token: null, claimed_until: null, email_provider_id: 're_123' })
    expect((await claim(svc, session)).out_reason).toBe('nothing_to_do')
  })

  test('definite email rejection → failed → retried; PDF is not redone', async () => {
    const { svc, session } = await acceptedCreatorRecord()
    const c1 = await claim(svc, session)
    await mark(svc, session, c1.out_claim_token, 'pdf', 'completed')
    await mark(svc, session, c1.out_claim_token, 'email', 'sending')
    await mark(svc, session, c1.out_claim_token, 'email', 'failed')
    expect(await finish(svc, session, c1.out_claim_token, 'email_rejected:rate_limit_exceeded')).toBe('failed')
    const c2 = await claim(svc, session)
    expect(c2).toMatchObject({ out_claimed: true, out_pdf_status: 'completed', out_email_status: 'failed' })
    expect(await mark(svc, session, c2.out_claim_token, 'pdf', 'pending')).toBe(false)   // no PDF regression
  })

  test('crash mid-send: sending → unknown → needs_reconciliation, never auto-resent', async () => {
    const { svc, session } = await acceptedCreatorRecord()
    const c1 = await claim(svc, session)
    await mark(svc, session, c1.out_claim_token, 'pdf', 'completed')
    await mark(svc, session, c1.out_claim_token, 'email', 'sending')
    await admin.query(`UPDATE public.payment_fulfillments SET claimed_until = now() - interval '1 second' WHERE stripe_checkout_session_id = $1`, [session])
    const c2 = await claim(svc, session)
    expect(c2).toMatchObject({ out_claimed: false, out_reason: 'email_outcome_unknown', out_email_status: 'unknown' })
    expect(await ledger(session)).toMatchObject({ fulfillment_status: 'needs_reconciliation', email_status: 'unknown', claim_token: null })
    expect((await claim(svc, session)).out_reason).toBe('needs_reconciliation')
  })

  test('finish while still sending (outcome write lost) → unknown + needs_reconciliation', async () => {
    const { svc, session } = await acceptedCreatorRecord()
    const c = await claim(svc, session)
    await mark(svc, session, c.out_claim_token, 'pdf', 'completed')
    await mark(svc, session, c.out_claim_token, 'email', 'sending')
    expect(await finish(svc, session, c.out_claim_token, 'mark accepted failed')).toBe('needs_reconciliation')
    expect((await ledger(session)).email_status).toBe('unknown')
  })

  test('crash after all steps but before finish → already_complete on next claim', async () => {
    const { svc, session } = await acceptedCreatorRecord()
    const c = await claim(svc, session)
    await mark(svc, session, c.out_claim_token, 'pdf', 'completed')
    await mark(svc, session, c.out_claim_token, 'email', 'sending')
    await mark(svc, session, c.out_claim_token, 'email', 'accepted', 're_1')
    await admin.query(`UPDATE public.payment_fulfillments SET claimed_until = now() - interval '1 second' WHERE stripe_checkout_session_id = $1`, [session])
    expect((await claim(svc, session)).out_reason).toBe('already_complete')
    expect((await ledger(session)).fulfillment_status).toBe('completed')
  })

  test('attempt limit moves the row to the manual queue', async () => {
    const { svc, session } = await acceptedCreatorRecord()
    for (let i = 0; i < 2; i++) {
      const c = await claim(svc, session, 2)
      expect(c.out_claimed).toBe(true)
      expect(await finish(svc, session, c.out_claim_token, 'pdf_generation_failed')).toBe('failed')
    }
    expect((await claim(svc, session, 2)).out_reason).toBe('attempts_exhausted')
    expect(await ledger(session)).toMatchObject({ fulfillment_status: 'needs_reconciliation' })
  })

  test('retry window expiry moves the row to the manual queue (visible, not dropped)', async () => {
    const { svc, session } = await acceptedCreatorRecord()
    await admin.query(`UPDATE public.payment_fulfillments SET retry_window_started_at = now() - interval '8 days' WHERE stripe_checkout_session_id = $1`, [session])
    expect((await claim(svc, session)).out_reason).toBe('retry_window_expired')
    const { rows } = await svc.query(`SELECT count(*)::int AS n FROM public.payment_fulfillments
      WHERE anomaly_status = 'open' OR fulfillment_status IN ('needs_reconciliation', 'failed')`)
    expect(rows[0].n).toBe(1)
  })

  test('claim parameter guards', async () => {
    const svc = await connect('service_role')
    expect(await errCode(svc.query('SELECT * FROM public.claim_payment_fulfillment($1, 5, 6, 604800)', [sid()]))).toBe('22023')
    expect(await errCode(svc.query('SELECT * FROM public.claim_payment_fulfillment($1, 300, 0, 604800)', [sid()]))).toBe('22023')
    expect(await errCode(svc.query('SELECT * FROM public.claim_payment_fulfillment($1, 300, 6, 60)', [sid()]))).toBe('22023')
    expect((await claim(svc, sid())).out_reason).toBe('not_found')
  })

  test('claim-state constraints hold under direct writes', async () => {
    const { session } = await acceptedCreatorRecord()
    expect(await errCode(admin.query(`UPDATE public.payment_fulfillments SET fulfillment_status = 'in_progress' WHERE stripe_checkout_session_id = $1`, [session]))).toBe('23514')
    expect(await errCode(admin.query(`UPDATE public.payment_fulfillments SET fulfillment_status = 'completed' WHERE stripe_checkout_session_id = $1`, [session]))).toBe('23514')
  })

  // --------------------------------------------------- reconciliation
  test('admin reconciliation: close unknown email, authorize resend, retry, resolve anomaly', async () => {
    const svc = await connect('service_role')
    // unknown email after PDF done
    const { session } = await acceptedCreatorRecord()
    const c = await claim(svc, session)
    await mark(svc, session, c.out_claim_token, 'pdf', 'completed')
    await mark(svc, session, c.out_claim_token, 'email', 'sending')
    await mark(svc, session, c.out_claim_token, 'email', 'unknown')
    expect(await finish(svc, session, c.out_claim_token)).toBe('needs_reconciliation')

    expect(await errCode(svc.query('SELECT public.reconcile_payment_fulfillment($1, $2, $3, $4)', [session, 'close_unknown_email', randomUUID(), 'x']))).toBe('22023')
    expect(await errCode(svc.query('SELECT public.reconcile_payment_fulfillment($1, $2, NULL, $3)', [session, 'close_unknown_email', 'checked logs']))).toBe('22023')
    expect(await reconcile(svc, session, 'retry_fulfillment')).toBe('not_applicable')   // must decide the email first
    expect(await reconcile(svc, session, 'authorize_email_resend')).toBe('email_resend_authorized')
    expect(await ledger(session)).toMatchObject({ email_status: 'pending', fulfillment_status: 'pending', attempts: 0 })
    const c2 = await claim(svc, session)
    expect(c2).toMatchObject({ out_claimed: true, out_email_status: 'pending', out_pdf_status: 'completed' })
    await mark(svc, session, c2.out_claim_token, 'email', 'sending')
    await mark(svc, session, c2.out_claim_token, 'email', 'unknown')
    await finish(svc, session, c2.out_claim_token)
    expect(await reconcile(svc, session, 'close_unknown_email')).toBe('email_reconciled')
    const row = await ledger(session)
    expect(row).toMatchObject({ email_status: 'reconciled', fulfillment_status: 'completed' })
    expect(row.reconciliation_log).toHaveLength(2)

    // anomaly resolution
    const s2 = await seedSubmission({ stripe_checkout_session_id: sid() })
    const mism = sid()
    await record(svc, facts({ session: mism, ref: s2.id }))
    expect(await reconcile(svc, mism, 'retry_fulfillment')).toBe('not_applicable')
    expect(await reconcile(svc, mism, 'resolve_anomaly', 'refunded in Stripe dashboard')).toBe('anomaly_resolved')
    expect(await ledger(mism)).toMatchObject({ anomaly_status: 'resolved' })
    expect(await reconcile(svc, sid(), 'resolve_anomaly')).toBe('not_found')
  })

  test('retry_fulfillment re-opens an exhausted PDF failure with a fresh window', async () => {
    const { svc, session } = await acceptedCreatorRecord()
    const c = await claim(svc, session, 1)
    await finish(svc, session, c.out_claim_token, 'pdf_generation_failed')
    expect((await claim(svc, session, 1)).out_reason).toBe('attempts_exhausted')
    expect(await reconcile(svc, session, 'retry_fulfillment')).toBe('retry_scheduled')
    expect((await claim(svc, session, 1)).out_claimed).toBe(true)
  })

  // ------------------------------------------------------ privileges
  test.each(['anon', 'authenticated'] as const)('%s has no table or function access', async (role) => {
    const c = await connect(role)
    const s = await seedSubmission()
    expect(await errCode(c.query('SELECT * FROM public.payment_fulfillments'))).toBe('42501')
    expect(await errCode(c.query(`INSERT INTO public.payment_fulfillments (stripe_checkout_session_id) VALUES ('cs_x')`))).toBe('42501')
    expect(await errCode(c.query(`UPDATE public.payment_fulfillments SET attempts = 0`))).toBe('42501')
    expect(await errCode(c.query(`DELETE FROM public.payment_fulfillments`))).toBe('42501')
    expect(await errCode(c.query(`SELECT public.payment_list_price_cents('creator_record')`))).toBe('42501')
    expect(await errCode(record(c, facts({ session: sid(), ref: s.id })))).toBe('42501')
    expect(await errCode(c.query('SELECT * FROM public.claim_payment_fulfillment($1, 300, 6, 604800)', [sid()]))).toBe('42501')
    expect(await errCode(c.query(`SELECT public.mark_payment_fulfillment_step('cs_x', NULL, 'pdf', 'completed', NULL, NULL)`))).toBe('42501')
    expect(await errCode(c.query(`SELECT public.finish_payment_fulfillment('cs_x', NULL, NULL)`))).toBe('42501')
    expect(await errCode(c.query(`SELECT public.reconcile_payment_fulfillment('cs_x', 'resolve_anomaly', $1, 'hello')`, [randomUUID()]))).toBe('42501')
    expect(await errCode(c.query('SELECT * FROM public.payment_legacy_session_policy'))).toBe('42501')
    expect(await errCode(c.query(`SELECT * FROM public.activate_payment_legacy_cutoff(now(), 'hello there')`))).toBe('42501')
  })

  test('service_role: no DELETE or TRUNCATE on the ledger', async () => {
    const svc = await connect('service_role')
    expect(await errCode(svc.query('DELETE FROM public.payment_fulfillments'))).toBe('42501')
    expect(await errCode(svc.query('TRUNCATE public.payment_fulfillments'))).toBe('42501')
    const { rows } = await admin.query(`SELECT relrowsecurity FROM pg_class WHERE oid = 'public.payment_fulfillments'::regclass`)
    expect(rows[0].relrowsecurity).toBe(true)
  })

  // -------------------------------------------------------- deletion
  test('account deletion is not blocked; ledger keeps submission_ref', async () => {
    const svc = await connect('service_role')
    const session = sid()
    const s = await seedSubmission({ stripe_checkout_session_id: session })
    await record(svc, facts({ session, ref: s.id }))
    await admin.query('DELETE FROM public.users WHERE id = $1', [s.userId])   // cascades to submissions
    expect(await sub(s.id)).toBeUndefined()
    expect(await ledger(session)).toMatchObject({ submission_id: null, submission_ref: s.id, outcome: 'accepted' })
    const c = await claim(svc, session)
    expect(c).toMatchObject({ out_claimed: true, out_submission_id: null })
  })

  // ---------------------------------------- FIX-1 ordering + history (LAST:
  // rebuilds the schema and ends with both migrations applied, as beforeAll).
  test('FIX-1 over a live ledger: refuses to run first; a session rejected under the old rule stays rejected', async () => {
    await admin.query('DROP SCHEMA public CASCADE')
    await admin.query('CREATE SCHEMA public')
    await admin.query(readFileSync(BOOTSTRAP, 'utf8'))
    expect(await errCode(admin.query(readFileSync(MIGRATION_FIX_1, 'utf8')))).toBe('55000')
    await admin.query(readFileSync(MIGRATION, 'utf8'))

    const svc = await connect('service_role')
    const accepted = sid()
    const a = await seedSubmission({ stripe_checkout_session_id: accepted })
    await record(svc, facts({ session: accepted, ref: a.id }))                  // positive accepted row before FIX-1
    const session = sid()
    const s = await seedSubmission({ stripe_checkout_session_id: session })
    const f = facts({ session, ref: s.id, ...zeroPaid(2900) })
    expect(await record(svc, f)).toMatchObject({ out_outcome: 'rejected', out_reason: 'payment_status_inconsistent' })
    const rowBefore = await ledger(session)

    await admin.query(readFileSync(MIGRATION_FIX_1, 'utf8'))                    // existing rows re-validate
    const replay = await record(svc, { ...f, event: eid() })
    expect(replay).toMatchObject({ out_outcome: 'rejected', out_reason: 'payment_status_inconsistent', out_is_new: false })
    expect({ ...(await ledger(session)), last_stripe_event_id: null, updated_at: null })
      .toEqual({ ...rowBefore, last_stripe_event_id: null, updated_at: null })
    expect(await sub(s.id)).toMatchObject({ payment_status: 'unpaid', status: 'pending', amount_paid: null })
    expect(await reconcile(svc, session, 'retry_fulfillment')).toBe('not_applicable')
    expect((await ledger(accepted)).outcome).toBe('accepted')

    // Owner, SECURITY INVOKER, search_path and grants survive CREATE OR REPLACE.
    const { rows } = await admin.query(`SELECT p.prosecdef, p.proconfig,
        has_function_privilege('service_role', p.oid, 'EXECUTE') AS svc,
        has_function_privilege('anon', p.oid, 'EXECUTE') AS anon,
        has_function_privilege('authenticated', p.oid, 'EXECUTE') AS auth
      FROM pg_proc p WHERE p.oid = 'public.record_checkout_payment(text,text,text,bigint,text,text,text,text,text,integer,integer,integer,integer,integer)'::regprocedure`)
    expect(rows[0]).toEqual({ prosecdef: false, proconfig: ['search_path=public, pg_temp'], svc: true, anon: false, auth: false })

    const n = sid()
    const ns = await seedSubmission({ stripe_checkout_session_id: n })
    expect(await record(svc, facts({ session: n, ref: ns.id, ...zeroPaid(2900) }))).toMatchObject({ out_outcome: 'accepted' })
  })
})
