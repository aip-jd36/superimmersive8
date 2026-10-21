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
const MIGRATION = join(__dirname, '..', '..', 'supabase', 'migrations', '20261021000000_payment_fulfillments.sql')
const BOOTSTRAP = join(__dirname, 'bootstrap.sql')

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
    await admin.query(readFileSync(MIGRATION, 'utf8'))   // the migration, verbatim
  })

  afterAll(async () => {
    for (const c of extra) await c.end().catch(() => undefined)
    await admin?.end()
  })

  beforeEach(async () => {
    await admin.query('TRUNCATE public.payment_fulfillments, public.rights_packages, public.submissions, public.users CASCADE')
  })

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
    ['payment_status_inconsistent', { total: 0, discount: 2900 }],
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
})
