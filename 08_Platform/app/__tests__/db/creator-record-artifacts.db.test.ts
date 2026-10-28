/**
 * CR-ARTIFACT-1C — real PostgreSQL 15 tests for the creator_record_artifacts
 * migration: one artifact per submission, attempt fencing (compare-and-swap
 * under real row locks), immutability of issued rows, constraints, and
 * row-level security. Same harness and safety guard as the payment ledger
 * suite: a disposable local `si8_test_*` database only (CI service container).
 */

import { readFileSync } from 'fs'
import { join } from 'path'
import { randomUUID } from 'crypto'
import { Client } from 'pg'

const URL = process.env.DATABASE_URL_TEST
const MIGRATION = join(__dirname, '..', '..', 'supabase', 'migrations', '20261028000000_creator_record_artifacts.sql')
const BOOTSTRAP = join(__dirname, 'bootstrap.sql')
// Supabase's storage schema does not exist in a plain Postgres: a minimal stand-in for the bucket insert.
const STORAGE_STUB = `CREATE SCHEMA IF NOT EXISTS storage;
CREATE TABLE IF NOT EXISTS storage.buckets (id text PRIMARY KEY, name text NOT NULL, public boolean, file_size_limit bigint, allowed_mime_types text[]);`

function assertDisposable(url: string) {
  const u = new globalThis.URL(url)
  const db = u.pathname.replace(/^\//, '')
  if (!db.startsWith('si8_test_')) throw new Error(`refusing to run: database "${db}" is not si8_test_*`)
  if (!['localhost', '127.0.0.1', '::1', '[::1]'].includes(u.hostname)) throw new Error(`refusing to run: host "${u.hostname}" is not a local disposable database`)
}

if (process.env.CI && !URL) throw new Error('DATABASE_URL_TEST is required in CI — the creator record artifact DB suite must not be skipped')
const maybe = URL ? describe : describe.skip

const errCode = async (p: Promise<unknown>) => {
  try {
    await p
    return 'no error'
  } catch (e) {
    return (e as { code?: string }).code ?? 'unknown'
  }
}

maybe('creator_record_artifacts (PostgreSQL)', () => {
  let admin: Client
  const extra: Client[] = []
  let userId: string

  async function connect(role?: 'service_role' | 'anon' | 'authenticated'): Promise<Client> {
    const c = new Client({ connectionString: URL })
    await c.connect()
    if (role) await c.query(`SET ROLE ${role}`)
    extra.push(c)
    return c
  }

  async function newSubmission(): Promise<string> {
    const r = await admin.query(`INSERT INTO public.submissions (user_id, tier, status) VALUES ($1, 'creator_record', 'approved') RETURNING id`, [userId])
    return r.rows[0].id
  }

  async function insertPending(c: Client, submissionId: string, attempt = randomUUID()) {
    return c.query(
      `INSERT INTO public.creator_record_artifacts (submission_id, record_id, attempt_id, storage_path, sha256, byte_size, generator_version, status, uat)
       VALUES ($1::uuid, $2, $3::uuid, $1::uuid::text || '/' || $3::uuid::text || '.pdf', $4, 100, 'legacy-creator-record-pdf-v1', 'pending', true) RETURNING *`,
      [submissionId, `CR-2026-${submissionId.slice(0, 8)}`, attempt, 'a'.repeat(64)],
    )
  }

  const takeOver = (c: Client, id: string, expected: string, next: string) =>
    c.query(
      `UPDATE public.creator_record_artifacts SET attempt_id = $3::uuid, storage_path = submission_id::text || '/' || $3::uuid::text || '.pdf', sha256 = $4
       WHERE id = $1 AND attempt_id = $2 AND status = 'pending'`,
      [id, expected, next, 'b'.repeat(64)],
    )

  const markIssued = (c: Client, id: string, attempt: string, sha: string) =>
    c.query(`UPDATE public.creator_record_artifacts SET status = 'issued', issued_at = now() WHERE id = $1 AND attempt_id = $2 AND sha256 = $3 AND status = 'pending'`, [id, attempt, sha])

  beforeAll(async () => {
    assertDisposable(URL as string)
    admin = new Client({ connectionString: URL })
    await admin.connect()
    await admin.query('DROP SCHEMA IF EXISTS public CASCADE')
    await admin.query('DROP SCHEMA IF EXISTS storage CASCADE')
    await admin.query('CREATE SCHEMA public')
    await admin.query(readFileSync(BOOTSTRAP, 'utf8'))
    await admin.query(STORAGE_STUB)
    await admin.query(readFileSync(MIGRATION, 'utf8')) // verbatim
    userId = randomUUID()
    await admin.query(`INSERT INTO public.users (id, email) VALUES ($1, 'uat@superimmersive8.com')`, [userId])
  })

  afterAll(async () => {
    for (const c of extra) await c.end().catch(() => undefined)
    await admin?.end()
  })

  test('the migration is idempotent and creates a PRIVATE pdf-only bucket', async () => {
    await admin.query(readFileSync(MIGRATION, 'utf8'))
    const b = await admin.query(`SELECT public, file_size_limit, allowed_mime_types FROM storage.buckets WHERE id = 'creator-records'`)
    expect(b.rows).toEqual([{ public: false, file_size_limit: '10485760', allowed_mime_types: ['application/pdf'] }])
  })

  test('one artifact per submission: a concurrent second insert fails with a unique violation', async () => {
    const s = await newSubmission()
    const c1 = await connect()
    const c2 = await connect()
    await c1.query('BEGIN')
    await insertPending(c1, s)
    const second = errCode(insertPending(c2, s)) // blocks on the uncommitted unique key
    await c1.query('COMMIT')
    expect(await second).toBe('23505')
  })

  test('takeover is a compare-and-swap under real row locks: of two concurrent takeovers exactly one wins', async () => {
    const s = await newSubmission()
    const row = (await insertPending(admin, s)).rows[0]
    const c1 = await connect()
    const c2 = await connect()
    await c1.query('BEGIN')
    const a = await takeOver(c1, row.id, row.attempt_id, randomUUID())
    const bPromise = takeOver(c2, row.id, row.attempt_id, randomUUID()) // waits for c1's row lock, then re-checks attempt_id
    await c1.query('COMMIT')
    const b = await bPromise
    expect([a.rowCount, b.rowCount].sort()).toEqual([0, 1])
  })

  test('a stale attempt can never mark itself issued after a takeover', async () => {
    const s = await newSubmission()
    const row = (await insertPending(admin, s)).rows[0]
    const newer = randomUUID()
    expect((await takeOver(admin, row.id, row.attempt_id, newer)).rowCount).toBe(1)
    expect((await markIssued(admin, row.id, row.attempt_id, row.sha256)).rowCount).toBe(0) // stale attempt
    expect((await markIssued(admin, row.id, newer, 'b'.repeat(64))).rowCount).toBe(1)
    expect((await admin.query(`SELECT status, attempt_id FROM public.creator_record_artifacts WHERE id = $1`, [row.id])).rows[0]).toEqual({ status: 'issued', attempt_id: newer })
  })

  test('markIssued requires the exact attempt AND digest', async () => {
    const s = await newSubmission()
    const row = (await insertPending(admin, s)).rows[0]
    expect((await markIssued(admin, row.id, row.attempt_id, 'c'.repeat(64))).rowCount).toBe(0)
    expect((await markIssued(admin, row.id, row.attempt_id, row.sha256)).rowCount).toBe(1)
  })

  test('an issued artifact is immutable: every update and delete is refused by the trigger', async () => {
    const s = await newSubmission()
    const row = (await insertPending(admin, s)).rows[0]
    await markIssued(admin, row.id, row.attempt_id, row.sha256)
    expect(await errCode(admin.query(`UPDATE public.creator_record_artifacts SET sha256 = $2 WHERE id = $1`, [row.id, 'd'.repeat(64)]))).toBe('P0001')
    expect(await errCode(admin.query(`UPDATE public.creator_record_artifacts SET status = 'pending', issued_at = NULL WHERE id = $1`, [row.id]))).toBe('P0001')
    expect(await errCode(takeOver(admin, row.id, row.attempt_id, randomUUID()))).toBe('no error') // matches 0 rows (status filter) — nothing changes
    expect(await errCode(admin.query(`DELETE FROM public.creator_record_artifacts WHERE id = $1`, [row.id]))).toBe('P0001')
    const sr = await connect('service_role')
    expect(await errCode(sr.query(`UPDATE public.creator_record_artifacts SET byte_size = 1 WHERE id = $1`, [row.id]))).toBe('P0001') // service role too
  })

  test('identity of a pending artifact cannot change (submission, record id, uat)', async () => {
    const s = await newSubmission()
    const row = (await insertPending(admin, s)).rows[0]
    expect(await errCode(admin.query(`UPDATE public.creator_record_artifacts SET record_id = 'CR-X' WHERE id = $1`, [row.id]))).toBe('P0001')
    expect(await errCode(admin.query(`UPDATE public.creator_record_artifacts SET uat = false WHERE id = $1`, [row.id]))).toBe('P0001')
  })

  test('constraints: path shape, digest format, status, issued_at consistency, positive size', async () => {
    const s = await newSubmission()
    const ins = (path: string, sha: string, status: string, issued: string | null, size = 1) =>
      admin.query(
        `INSERT INTO public.creator_record_artifacts (submission_id, record_id, attempt_id, storage_path, sha256, byte_size, generator_version, status, uat, issued_at)
         VALUES ($1, $2, '00000000-0000-4000-8000-000000000001', $3, $4, $7, 'g', $5, true, $6)`,
        [s, `CR-${randomUUID()}`, path, sha, status, issued, size],
      )
    const good = `${s}/00000000-0000-4000-8000-000000000001.pdf`
    expect(await errCode(ins(`${s}/other.pdf`, 'a'.repeat(64), 'pending', null))).toBe('23514')
    expect(await errCode(ins(good, 'NOT-HEX', 'pending', null))).toBe('23514')
    expect(await errCode(ins(good, 'a'.repeat(64), 'replaced', null))).toBe('23514')
    expect(await errCode(ins(good, 'a'.repeat(64), 'issued', null))).toBe('23514')
    expect(await errCode(ins(good, 'a'.repeat(64), 'pending', null, 0))).toBe('23514')
  })

  test('row-level security: anon and authenticated can neither read nor write either table; the service role can', async () => {
    const s = await newSubmission()
    await insertPending(admin, s)
    await admin.query(`INSERT INTO public.creator_record_artifact_uat (submission_id, added_by, reason) VALUES ($1, 'JD', 'CR-ARTIFACT-1 UAT')`, [s])
    for (const role of ['anon', 'authenticated'] as const) {
      const c = await connect(role)
      expect((await c.query(`SELECT * FROM public.creator_record_artifacts`)).rowCount).toBe(0)
      expect((await c.query(`SELECT * FROM public.creator_record_artifact_uat`)).rowCount).toBe(0)
      expect(await errCode(c.query(`INSERT INTO public.creator_record_artifact_uat (submission_id, added_by, reason) VALUES ($1, 'x', 'y')`, [await newSubmission()]))).toBe('42501')
    }
    const sr = await connect('service_role')
    expect((await sr.query(`SELECT * FROM public.creator_record_artifact_uat WHERE submission_id = $1`, [s])).rowCount).toBe(1)
  })

  test('allowlist rows require who and why', async () => {
    const s = await newSubmission()
    expect(await errCode(admin.query(`INSERT INTO public.creator_record_artifact_uat (submission_id, added_by, reason) VALUES ($1, ' ', 'r')`, [s]))).toBe('23514')
    expect(await errCode(admin.query(`INSERT INTO public.creator_record_artifact_uat (submission_id, added_by, reason) VALUES ($1, 'JD', '')`, [s]))).toBe('23514')
  })
})
