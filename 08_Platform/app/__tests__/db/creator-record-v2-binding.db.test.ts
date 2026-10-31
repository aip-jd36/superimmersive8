/**
 * CR-V2-MVP-M3 — real PostgreSQL tests for 20261102000000_creator_record_v2_submission_binding.sql,
 * applied verbatim after the payment ledger, FIX-1 and the M2 prepared-record migration (deploy order).
 *
 * Covers: the v2 marker (only via the bind function, immutable, creator_record only, V1 unaffected),
 * contiguous version ordering, no review or binding of a superseded version, the bind function
 * (ownership, review state, digest, idempotency, concurrency), least privilege, and that a bound v2
 * submission settles through the UNCHANGED payment ledger like any Creator Record.
 *
 * Disposable local `si8_test_*` database only. Skipped without DATABASE_URL_TEST (required in CI).
 */

import { readFileSync } from 'fs'
import { join } from 'path'
import { randomUUID } from 'crypto'
import { Client } from 'pg'

const URL = process.env.DATABASE_URL_TEST
const DIR = join(__dirname, '..', '..', 'supabase', 'migrations')
const MIGRATIONS = [
  '20261021000000_payment_fulfillments.sql',
  '20261022000000_payment_zero_total_paid.sql',
  '20261101000000_creator_record_v2_prepared.sql',
  '20261102000000_creator_record_v2_submission_binding.sql',
].map((f) => join(DIR, f))
const M3 = MIGRATIONS[3]
const BOOTSTRAP = join(__dirname, 'bootstrap.sql')

function assertDisposable(url: string) {
  const u = new globalThis.URL(url)
  const db = u.pathname.replace(/^\//, '')
  if (!db.startsWith('si8_test_')) throw new Error(`refusing to run: database "${db}" is not si8_test_*`)
  if (!['localhost', '127.0.0.1', '::1', '[::1]'].includes(u.hostname)) throw new Error(`refusing to run: host "${u.hostname}" is not a local disposable database`)
}

if (process.env.CI && !URL) throw new Error('DATABASE_URL_TEST is required in CI — the creator record v2 binding DB suite must not be skipped')
const maybe = URL ? describe : describe.skip

const errCode = async (p: Promise<unknown>) => {
  try {
    await p
    return 'no error'
  } catch (e) {
    return (e as { code?: string }).code ?? 'unknown'
  }
}

const SHA = (c: string) => c.repeat(64)

maybe('creator record v2 submission binding (PostgreSQL)', () => {
  let admin: Client
  let svc: Client
  const extra: Client[] = []

  async function connect(role: 'service_role' | 'anon' | 'authenticated'): Promise<Client> {
    const c = new Client({ connectionString: URL })
    await c.connect()
    await c.query(`SET ROLE ${role}`)
    extra.push(c)
    return c
  }

  async function user(name = 'Tester') {
    const id = randomUUID()
    await admin.query('INSERT INTO public.users (id, email, name) VALUES ($1, $2, $3)', [id, `${id}@example.test`, name])
    return id
  }

  async function insert(c: Client, userId: string, draftId: string, version: number, sha = SHA('c')) {
    const id = randomUUID()
    const r = await c.query(
      `INSERT INTO public.creator_record_v2_prepared (id, user_id, draft_id, version, record_ref, record_schema, record_schema_version, canonical, sha256, form_state, status)
       VALUES ($1, $2, $3, $4, $6, 'si8/creator-record-v2-record', 4, '{"x":1}', $5, '{"answers":{}}'::jsonb, 'prepared') RETURNING *`,
      [id, userId, draftId, version, sha, `PREP-${id}`],
    )
    return r.rows[0]
  }
  const review = (c: Client, id: string) => c.query(`UPDATE public.creator_record_v2_prepared SET status = 'reviewed', reviewed_at = now() WHERE id = $1`, [id])
  const bind = async (c: Client, preparedId: string, userId: string, sha: string) =>
    (await c.query('SELECT * FROM public.create_creator_record_v2_submission($1, $2, $3, $4)', [preparedId, userId, sha, 'Synthetic Creator'])).rows[0] as { out_submission_id: string | null; out_reason: string }

  async function reviewedRow(userId: string, sha = SHA('c')) {
    const row = await insert(svc, userId, randomUUID(), 1, sha)
    await review(svc, row.id)
    return row
  }

  beforeAll(async () => {
    assertDisposable(URL as string)
    admin = new Client({ connectionString: URL })
    await admin.connect()
    await admin.query('DROP SCHEMA IF EXISTS public CASCADE')
    await admin.query('CREATE SCHEMA public')
    await admin.query(readFileSync(BOOTSTRAP, 'utf8'))
    for (const m of MIGRATIONS) await admin.query(readFileSync(m, 'utf8')) // verbatim, deploy order
    svc = await connect('service_role')
  })

  afterAll(async () => {
    for (const c of extra) await c.end().catch(() => undefined)
    await admin?.end()
  })

  test('the migration is idempotent', async () => {
    await admin.query(readFileSync(M3, 'utf8'))
  })

  describe('the v2 marker', () => {
    test('a v2-marked submission cannot be inserted or marked directly; V1 submissions are unaffected', async () => {
      const u = await user()
      expect(await errCode(svc.query(`INSERT INTO public.submissions (user_id, tier, creator_record_product) VALUES ($1, 'creator_record', 'v2')`, [u]))).toBe('P0001')
      expect(await errCode(admin.query(`INSERT INTO public.submissions (user_id, tier, creator_record_product) VALUES ($1, 'creator_record', 'v2')`, [u]))).toBe('P0001')
      const v1 = (await svc.query(`INSERT INTO public.submissions (user_id, tier) VALUES ($1, 'creator_record') RETURNING id, creator_record_product`, [u])).rows[0]
      expect(v1.creator_record_product).toBeNull()
      expect(await errCode(svc.query(`UPDATE public.submissions SET creator_record_product = 'v2' WHERE id = $1`, [v1.id]))).toBe('P0001')
      // Ordinary V1 updates still work (payment, status).
      await svc.query(`UPDATE public.submissions SET status = 'approved', payment_status = 'paid' WHERE id = $1`, [v1.id])
    })

    test('the marker is v2 only, on creator_record only, and immutable once set', async () => {
      const u = await user()
      const row = await reviewedRow(u)
      const { out_submission_id: sub } = await bind(svc, row.id, u, row.sha256)
      expect(await errCode(svc.query(`UPDATE public.submissions SET creator_record_product = NULL WHERE id = $1`, [sub]))).toBe('P0001')
      expect(await errCode(svc.query(`UPDATE public.submissions SET tier = 'si8_certified' WHERE id = $1`, [sub]))).toBe('23514')
      // Even inside a binding transaction, another value or tier violates the check constraint.
      await admin.query('BEGIN')
      await admin.query(`SELECT set_config('si8.cr_v2_binding', 'on', true)`)
      expect(await errCode(admin.query(`INSERT INTO public.submissions (user_id, tier, creator_record_product) VALUES ($1, 'si8_certified', 'v2')`, [u]))).toBe('23514')
      await admin.query('ROLLBACK')
      await admin.query('BEGIN')
      await admin.query(`SELECT set_config('si8.cr_v2_binding', 'on', true)`)
      expect(await errCode(admin.query(`INSERT INTO public.submissions (user_id, tier, creator_record_product) VALUES ($1, 'creator_record', 'v3')`, [u]))).toBe('23514')
      await admin.query('ROLLBACK')
    })
  })

  describe('version ordering', () => {
    test('versions are contiguous; a gap or a reused number is refused', async () => {
      const u = await user()
      const draft = randomUUID()
      expect(await errCode(insert(svc, u, draft, 2))).toBe('P0001')
      await insert(svc, u, draft, 1)
      expect(await errCode(insert(svc, u, draft, 3))).toBe('P0001')
      expect(await errCode(insert(svc, u, draft, 1))).not.toBe('no error')
      await insert(svc, u, draft, 2)
    })

    test('only the latest version can be reviewed', async () => {
      const u = await user()
      const draft = randomUUID()
      const v1 = await insert(svc, u, draft, 1)
      const v2 = await insert(svc, u, draft, 2)
      expect(await errCode(review(svc, v1.id))).toBe('P0001')
      await review(svc, v2.id)
    })
  })

  describe('create_creator_record_v2_submission', () => {
    test('creates one pending, unpaid v2 Creator Record submission for the owner and binds it', async () => {
      const u = await user('Real Name')
      const row = await reviewedRow(u)
      const r = await bind(svc, row.id, u, row.sha256)
      expect(r.out_reason).toBe('created')
      const s = (await admin.query('SELECT * FROM public.submissions WHERE id = $1', [r.out_submission_id])).rows[0]
      expect(s).toMatchObject({ user_id: u, tier: 'creator_record', status: 'pending', payment_status: 'unpaid', creator_record_product: 'v2', title: 'Creator Record', filmmaker_name: 'Synthetic Creator' })
      expect((await admin.query('SELECT submission_id FROM public.creator_record_v2_prepared WHERE id = $1', [row.id])).rows[0].submission_id).toBe(r.out_submission_id)
    })

    test('is idempotent: a repeat returns the same submission and creates nothing', async () => {
      const u = await user()
      const row = await reviewedRow(u)
      const a = await bind(svc, row.id, u, row.sha256)
      const b = await bind(svc, row.id, u, row.sha256)
      expect(b).toEqual({ out_submission_id: a.out_submission_id, out_reason: 'existing' })
      expect(Number((await admin.query(`SELECT count(*) FROM public.submissions WHERE user_id = $1`, [u])).rows[0].count)).toBe(1)
    })

    test('refuses another owner, an unreviewed or superseded version, and a digest the server did not verify', async () => {
      const u = await user()
      const other = await user()
      const row = await reviewedRow(u, SHA('a'))
      expect((await bind(svc, row.id, other, row.sha256)).out_reason).toBe('not_found')
      expect((await bind(svc, randomUUID(), u, row.sha256)).out_reason).toBe('not_found')
      expect((await bind(svc, row.id, u, SHA('b'))).out_reason).toBe('digest_mismatch')

      const unreviewed = await insert(svc, u, randomUUID(), 1)
      expect((await bind(svc, unreviewed.id, u, unreviewed.sha256)).out_reason).toBe('not_reviewed')

      const draft = randomUUID()
      const v1 = await insert(svc, u, draft, 1)
      await review(svc, v1.id)
      await insert(svc, u, draft, 2) // a correction after review supersedes v1
      expect((await bind(svc, v1.id, u, v1.sha256)).out_reason).toBe('superseded')

      // Once bound, a repeat with another digest is refused too (no silent rebinding).
      const created = await bind(svc, row.id, u, row.sha256)
      expect(created.out_reason).toBe('created')
      expect((await bind(svc, row.id, u, SHA('b'))).out_reason).toBe('digest_mismatch')
      // Nothing above created a submission except the one bind.
      expect(Number((await admin.query(`SELECT count(*) FROM public.submissions WHERE user_id = $1`, [u])).rows[0].count)).toBe(1)
      expect(Number((await admin.query(`SELECT count(*) FROM public.submissions WHERE user_id = $1`, [other])).rows[0].count)).toBe(0)
    })

    test('a reviewed version cannot be bound by a direct update, even to a v2 submission of the owner', async () => {
      const u = await user()
      const a = await reviewedRow(u)
      const { out_submission_id: sub } = await bind(svc, a.id, u, a.sha256)
      const b = await reviewedRow(u)
      expect(await errCode(svc.query(`UPDATE public.creator_record_v2_prepared SET submission_id = $2 WHERE id = $1`, [b.id, sub]))).not.toBe('no error')
      const v1 = (await svc.query(`INSERT INTO public.submissions (user_id, tier) VALUES ($1, 'creator_record') RETURNING id`, [u])).rows[0].id
      expect(await errCode(svc.query(`UPDATE public.creator_record_v2_prepared SET submission_id = $2 WHERE id = $1`, [b.id, v1]))).toBe('P0001')
      // An UNBOUND v2 submission of the same owner (only constructible by the owner role, simulating the
      // function's flag): only the binding-flag rule stands between it and a direct bind.
      await admin.query('BEGIN')
      await admin.query(`SELECT set_config('si8.cr_v2_binding', 'on', true)`)
      const orphan = (await admin.query(`INSERT INTO public.submissions (user_id, tier, creator_record_product) VALUES ($1, 'creator_record', 'v2') RETURNING id`, [u])).rows[0].id
      await admin.query('COMMIT')
      expect(await errCode(svc.query(`UPDATE public.creator_record_v2_prepared SET submission_id = $2 WHERE id = $1`, [b.id, orphan]))).toBe('P0001')
    })

    test('the binding flag does not leak past the function into the same transaction', async () => {
      const u = await user()
      const row = await reviewedRow(u)
      await svc.query('BEGIN')
      await svc.query('SELECT * FROM public.create_creator_record_v2_submission($1, $2, $3, $4)', [row.id, u, row.sha256, 'x'])
      expect(await errCode(svc.query(`INSERT INTO public.submissions (user_id, tier, creator_record_product) VALUES ($1, 'creator_record', 'v2')`, [u]))).toBe('P0001')
      await svc.query('ROLLBACK')
    })

    test('concurrent binds of one version create exactly one submission', async () => {
      const u = await user()
      const row = await reviewedRow(u)
      const clients = await Promise.all(Array.from({ length: 8 }, () => connect('service_role')))
      const results = await Promise.all(clients.map((c) => bind(c, row.id, u, row.sha256)))
      expect(results.filter((r) => r.out_reason === 'created')).toHaveLength(1)
      expect(results.filter((r) => r.out_reason === 'existing')).toHaveLength(7)
      expect(new Set(results.map((r) => r.out_submission_id)).size).toBe(1)
      expect(Number((await admin.query(`SELECT count(*) FROM public.submissions WHERE user_id = $1`, [u])).rows[0].count)).toBe(1)
    })

    test('a bind racing a correction is serialized: either it binds the then-latest version or it is superseded', async () => {
      for (let i = 0; i < 5; i++) {
        const u = await user()
        const draft = randomUUID()
        const v1 = await insert(svc, u, draft, 1)
        await review(svc, v1.id)
        const [c1, c2] = await Promise.all([connect('service_role'), connect('service_role')])
        const [bound, corrected] = await Promise.allSettled([bind(c1, v1.id, u, v1.sha256), insert(c2, u, draft, 2)])
        expect(corrected.status).toBe('fulfilled') // a correction after a purchase is a new version, never blocked
        const reason = bound.status === 'fulfilled' ? bound.value.out_reason : 'error'
        expect(['created', 'superseded']).toContain(reason)
        const rows = (await admin.query('SELECT version, submission_id FROM public.creator_record_v2_prepared WHERE draft_id = $1 ORDER BY version', [draft])).rows
        expect(rows.map((r) => r.version)).toEqual([1, 2])
        expect(rows[1].submission_id).toBeNull()
        expect(rows[0].submission_id === null).toBe(reason === 'superseded')
      }
    })

    test('concurrent corrections of one draft never produce two rows with one version', async () => {
      const u = await user()
      const draft = randomUUID()
      await insert(svc, u, draft, 1)
      const [c1, c2] = await Promise.all([connect('service_role'), connect('service_role')])
      const results = await Promise.allSettled([insert(c1, u, draft, 2), insert(c2, u, draft, 2)])
      expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1)
      expect((await admin.query('SELECT version FROM public.creator_record_v2_prepared WHERE draft_id = $1 ORDER BY version', [draft])).rows.map((r) => r.version)).toEqual([1, 2])
    })
  })

  describe('least privilege and RLS', () => {
    test('anon and authenticated cannot call the bind function; RLS stays on with no policies', async () => {
      const u = await user()
      const row = await reviewedRow(u)
      for (const c of [await connect('anon'), await connect('authenticated')]) {
        expect(await errCode(c.query('SELECT * FROM public.create_creator_record_v2_submission($1, $2, $3, $4)', [row.id, u, row.sha256, 'x']))).toBe('42501')
        expect(await errCode(c.query('SELECT 1 FROM public.creator_record_v2_prepared'))).toBe('42501')
      }
      const rls = (await admin.query(`SELECT relname, relrowsecurity FROM pg_class WHERE relname IN ('creator_record_v2_prepared', 'creator_record_v2_pilot_access') ORDER BY relname`)).rows
      expect(rls).toEqual([{ relname: 'creator_record_v2_pilot_access', relrowsecurity: true }, { relname: 'creator_record_v2_prepared', relrowsecurity: true }])
      expect(Number((await admin.query(`SELECT count(*) FROM pg_policies WHERE tablename IN ('creator_record_v2_prepared', 'creator_record_v2_pilot_access')`)).rows[0].count)).toBe(0)
      expect(await errCode(svc.query('DELETE FROM public.creator_record_v2_prepared WHERE id = $1', [row.id]))).toBe('42501')
    })
  })

  describe('payment ledger compatibility (ledger unchanged)', () => {
    async function record(sessionId: string, ref: string, total = 2900) {
      return (await svc.query(
        'SELECT * FROM public.record_checkout_payment($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)',
        [sessionId, `evt_${randomUUID().replace(/-/g, '')}`, ref, Math.floor(Date.now() / 1000), 'complete', 'payment', 'paid', 'pi_test_1', 'usd', total, total, 0, 0, 0],
      )).rows[0]
    }

    test('a bound v2 submission is accepted at the Creator Record price and approved; the marker and binding survive', async () => {
      const u = await user()
      const row = await reviewedRow(u)
      const { out_submission_id: sub } = await bind(svc, row.id, u, row.sha256)
      const session = `cs_test_${randomUUID().replace(/-/g, '')}`
      await svc.query('UPDATE public.submissions SET stripe_checkout_session_id = $2 WHERE id = $1', [sub, session])
      const r = await record(session, sub as string)
      expect(r).toMatchObject({ out_outcome: 'accepted', out_reason: 'accepted', out_tier: 'creator_record', out_submission_id: sub })
      const s = (await admin.query('SELECT status, payment_status, creator_record_product FROM public.submissions WHERE id = $1', [sub])).rows[0]
      expect(s).toEqual({ status: 'approved', payment_status: 'paid', creator_record_product: 'v2' })
      expect((await admin.query('SELECT submission_id, status FROM public.creator_record_v2_prepared WHERE id = $1', [row.id])).rows[0]).toEqual({ submission_id: sub, status: 'reviewed' })
      // Duplicate delivery is idempotent.
      expect((await record(session, sub as string)).out_reason).toBe('accepted')
      expect(Number((await admin.query('SELECT count(*) FROM public.payment_fulfillments WHERE submission_id = $1', [sub])).rows[0].count)).toBe(1)
    })
  })
})
