/**
 * CR-V2-MVP-M2 — real PostgreSQL 15 tests for the creator_record_v2_prepared migration:
 * immutable content, prepared -> reviewed only, bind once, one owner per draft, one row
 * per draft version, no deletion of reviewed rows, and least-privilege access. Same
 * harness and safety guard as the other DB suites: a disposable local `si8_test_*`
 * database only (CI service container). Skipped locally without DATABASE_URL_TEST.
 */

import { readFileSync } from 'fs'
import { join } from 'path'
import { randomUUID } from 'crypto'
import { Client } from 'pg'

const URL = process.env.DATABASE_URL_TEST
const MIGRATION = join(__dirname, '..', '..', 'supabase', 'migrations', '20261101000000_creator_record_v2_prepared.sql')
const BOOTSTRAP = join(__dirname, 'bootstrap.sql')

function assertDisposable(url: string) {
  const u = new globalThis.URL(url)
  const db = u.pathname.replace(/^\//, '')
  if (!db.startsWith('si8_test_')) throw new Error(`refusing to run: database "${db}" is not si8_test_*`)
  if (!['localhost', '127.0.0.1', '::1', '[::1]'].includes(u.hostname)) throw new Error(`refusing to run: host "${u.hostname}" is not a local disposable database`)
}

if (process.env.CI && !URL) throw new Error('DATABASE_URL_TEST is required in CI — the creator record v2 prepared DB suite must not be skipped')
const maybe = URL ? describe : describe.skip

const errCode = async (p: Promise<unknown>) => {
  try {
    await p
    return 'no error'
  } catch (e) {
    return (e as { code?: string }).code ?? 'unknown'
  }
}

maybe('creator_record_v2_prepared (PostgreSQL)', () => {
  let admin: Client
  let svc: Client
  const extra: Client[] = []
  let owner: string
  let other: string

  async function connect(role: 'service_role' | 'anon' | 'authenticated'): Promise<Client> {
    const c = new Client({ connectionString: URL })
    await c.connect()
    await c.query(`SET ROLE ${role}`)
    extra.push(c)
    return c
  }

  async function insert(c: Client, userId: string, draftId: string, version: number) {
    const id = randomUUID()
    const r = await c.query(
      `INSERT INTO public.creator_record_v2_prepared (id, user_id, draft_id, version, record_ref, record_schema, record_schema_version, canonical, sha256, form_state, status)
       VALUES ($1, $2, $3, $4, 'PREP-' || $1::text, 'si8/creator-record-v2-record', 4, '{"x":1}', $5, '{"answers":{}}'::jsonb, 'prepared') RETURNING *`,
      [id, userId, draftId, version, 'c'.repeat(64)],
    )
    return r.rows[0]
  }

  beforeAll(async () => {
    assertDisposable(URL as string)
    admin = new Client({ connectionString: URL })
    await admin.connect()
    await admin.query('DROP SCHEMA IF EXISTS public CASCADE')
    await admin.query('CREATE SCHEMA public')
    await admin.query(readFileSync(BOOTSTRAP, 'utf8'))
    await admin.query(readFileSync(MIGRATION, 'utf8')) // verbatim
    owner = randomUUID()
    other = randomUUID()
    await admin.query(`INSERT INTO public.users (id, email) VALUES ($1, 'owner@example.test'), ($2, 'other@example.test')`, [owner, other])
    svc = await connect('service_role')
  })

  afterAll(async () => {
    for (const c of extra) await c.end().catch(() => undefined)
    await admin?.end()
  })

  test('the migration is idempotent', async () => {
    await admin.query(readFileSync(MIGRATION, 'utf8'))
  })

  test('content is immutable; only prepared -> reviewed; reviewed rows bind once and are never deleted', async () => {
    const row = await insert(svc, owner, randomUUID(), 1)
    expect(await errCode(svc.query(`UPDATE public.creator_record_v2_prepared SET canonical = '{"x":2}' WHERE id = $1`, [row.id]))).toBe('P0001')
    expect(await errCode(svc.query(`UPDATE public.creator_record_v2_prepared SET sha256 = $2 WHERE id = $1`, [row.id, 'd'.repeat(64)]))).toBe('P0001')
    expect(await errCode(svc.query(`UPDATE public.creator_record_v2_prepared SET user_id = $2 WHERE id = $1`, [row.id, other]))).toBe('P0001')
    expect(await errCode(svc.query(`UPDATE public.creator_record_v2_prepared SET form_state = '{}'::jsonb WHERE id = $1`, [row.id]))).toBe('P0001')

    await svc.query(`UPDATE public.creator_record_v2_prepared SET status = 'reviewed', reviewed_at = now() WHERE id = $1`, [row.id])
    expect(await errCode(svc.query(`UPDATE public.creator_record_v2_prepared SET status = 'prepared', reviewed_at = NULL WHERE id = $1`, [row.id]))).not.toBe('no error')
    expect(await errCode(svc.query(`UPDATE public.creator_record_v2_prepared SET reviewed_at = now() + interval '1 day' WHERE id = $1`, [row.id]))).toBe('P0001')

    const sub = (await admin.query(`INSERT INTO public.submissions (user_id, tier, status) VALUES ($1, 'creator_record', 'pending') RETURNING id`, [owner])).rows[0].id
    await svc.query(`UPDATE public.creator_record_v2_prepared SET submission_id = $2 WHERE id = $1`, [row.id, sub])
    const sub2 = (await admin.query(`INSERT INTO public.submissions (user_id, tier, status) VALUES ($1, 'creator_record', 'pending') RETURNING id`, [owner])).rows[0].id
    expect(await errCode(svc.query(`UPDATE public.creator_record_v2_prepared SET submission_id = $2 WHERE id = $1`, [row.id, sub2]))).toBe('P0001')

    expect(await errCode(admin.query(`DELETE FROM public.creator_record_v2_prepared WHERE id = $1`, [row.id]))).toBe('P0001')
  })

  test('an unreviewed version cannot be bound, and a prepared row cannot be inserted reviewed or bound', async () => {
    const row = await insert(svc, owner, randomUUID(), 1)
    const sub = (await admin.query(`INSERT INTO public.submissions (user_id, tier, status) VALUES ($1, 'creator_record', 'pending') RETURNING id`, [owner])).rows[0].id
    expect(await errCode(svc.query(`UPDATE public.creator_record_v2_prepared SET submission_id = $2 WHERE id = $1`, [row.id, sub]))).not.toBe('no error')
    const id = randomUUID()
    expect(await errCode(svc.query(
      `INSERT INTO public.creator_record_v2_prepared (id, user_id, draft_id, version, record_ref, record_schema, record_schema_version, canonical, sha256, form_state, status, reviewed_at)
       VALUES ($1, $2, $3, 1, 'PREP-' || $1::text, 'si8/creator-record-v2-record', 4, '{}', $4, '{}'::jsonb, 'reviewed', now())`,
      [id, owner, randomUUID(), 'e'.repeat(64)],
    ))).toBe('P0001')
  })

  test('one owner per draft and one row per draft version', async () => {
    const draft = randomUUID()
    await insert(svc, owner, draft, 1)
    expect(await errCode(insert(svc, owner, draft, 1))).toBe('23505')
    expect(await errCode(insert(svc, other, draft, 2))).toBe('P0001')
    await insert(svc, owner, draft, 2)
  })

  test('anon and authenticated have no access; the service role cannot delete; the pilot list is read-only to it', async () => {
    const anon = await connect('anon')
    const authed = await connect('authenticated')
    for (const c of [anon, authed]) {
      expect(await errCode(c.query('SELECT 1 FROM public.creator_record_v2_prepared'))).toBe('42501')
      expect(await errCode(c.query('SELECT 1 FROM public.creator_record_v2_pilot_access'))).toBe('42501')
    }
    const row = await insert(svc, owner, randomUUID(), 1)
    expect(await errCode(svc.query('DELETE FROM public.creator_record_v2_prepared WHERE id = $1', [row.id]))).toBe('42501')
    expect(await errCode(svc.query(`INSERT INTO public.creator_record_v2_pilot_access (user_id, added_by, reason) VALUES ($1, 'x', 'y')`, [owner]))).toBe('42501')
    await admin.query(`INSERT INTO public.creator_record_v2_pilot_access (user_id, added_by, reason) VALUES ($1, 'operator', 'pilot invite')`, [owner])
    expect((await svc.query('SELECT user_id FROM public.creator_record_v2_pilot_access WHERE user_id = $1', [owner])).rows).toEqual([{ user_id: owner }])
  })
})
