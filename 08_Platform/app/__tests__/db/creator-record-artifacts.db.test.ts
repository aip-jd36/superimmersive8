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
    const c1 = await connect('service_role') // CR-ARTIFACT-1J: the role the application uses, under its real grants
    const c2 = await connect('service_role')
    await c1.query('BEGIN')
    await insertPending(c1, s)
    const second = errCode(insertPending(c2, s)) // blocks on the uncommitted unique key
    await c1.query('COMMIT')
    expect(await second).toBe('23505')
  })

  test('takeover is a compare-and-swap under real row locks: of two concurrent takeovers exactly one wins', async () => {
    const s = await newSubmission()
    const row = (await insertPending(admin, s)).rows[0]
    const c1 = await connect('service_role')
    const c2 = await connect('service_role')
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

  test('anon and authenticated can neither read nor write either table (no grant; RLS on, no policies, as a second layer); the service role reads', async () => {
    const s = await newSubmission()
    await insertPending(admin, s)
    await admin.query(`INSERT INTO public.creator_record_artifact_uat (submission_id, added_by, reason) VALUES ($1, 'JD', 'CR-ARTIFACT-1 UAT')`, [s])
    // CR-ARTIFACT-1J: without a grant, reads are refused outright (42501) rather than filtered to 0 rows by RLS.
    for (const role of ['anon', 'authenticated'] as const) {
      const c = await connect(role)
      expect(await errCode(c.query(`SELECT * FROM public.creator_record_artifacts`))).toBe('42501')
      expect(await errCode(c.query(`SELECT * FROM public.creator_record_artifact_uat`))).toBe('42501')
      expect(await errCode(c.query(`INSERT INTO public.creator_record_artifact_uat (submission_id, added_by, reason) VALUES ($1, 'x', 'y')`, [await newSubmission()]))).toBe('42501')
      expect(await errCode(insertPending(c, await newSubmission()))).toBe('42501')
    }
    const rls = await admin.query(
      `SELECT c.relname::text AS relname, c.relrowsecurity, (SELECT count(*)::int FROM pg_policies p WHERE p.schemaname = 'public' AND p.tablename = c.relname) AS policies
       FROM pg_class c WHERE c.oid IN ('public.creator_record_artifacts'::regclass, 'public.creator_record_artifact_uat'::regclass) ORDER BY c.relname COLLATE "C"`,
    )
    expect(rls.rows).toEqual([
      { relname: 'creator_record_artifact_uat', relrowsecurity: true, policies: 0 },
      { relname: 'creator_record_artifacts', relrowsecurity: true, policies: 0 },
    ])
    const sr = await connect('service_role')
    expect((await sr.query(`SELECT * FROM public.creator_record_artifact_uat WHERE submission_id = $1`, [s])).rowCount).toBe(1)
  })

  test('CR-ARTIFACT-1J: effective privileges are exactly the least-privilege set, for every role and both tables', async () => {
    const PRIVS = ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER']
    const expected: Record<string, Record<string, string[]>> = {
      'public.creator_record_artifacts': { anon: [], authenticated: [], service_role: ['SELECT', 'INSERT', 'UPDATE'] },
      'public.creator_record_artifact_uat': { anon: [], authenticated: [], service_role: ['SELECT'] },
    }
    for (const [table, byRole] of Object.entries(expected)) {
      for (const [role, allowed] of Object.entries(byRole)) {
        const r = await admin.query(
          `SELECT p AS priv, has_table_privilege($1::name, $2::text, p) AS granted FROM unnest($3::text[]) AS p`,
          [role, table, PRIVS],
        )
        const granted = r.rows.filter((x) => x.granted).map((x) => x.priv)
        expect([table, role, granted]).toEqual([table, role, allowed])
      }
      // Nothing is granted to PUBLIC (grantee 0) on either table.
      const pub = await admin.query(`SELECT count(*)::int AS n FROM pg_class c, aclexplode(c.relacl) a WHERE c.oid = $1::regclass AND a.grantee = 0`, [table])
      expect([table, pub.rows[0].n]).toEqual([table, 0])
    }
    // The guard is a trigger function only: no API role can execute it directly.
    for (const role of ['anon', 'authenticated', 'service_role']) {
      const f = await admin.query(`SELECT has_function_privilege($1::name, 'public.creator_record_artifacts_guard()', 'EXECUTE') AS x`, [role])
      expect([role, f.rows[0].x]).toEqual([role, false])
    }
  })

  test('CR-ARTIFACT-1J: no API role can TRUNCATE either table, or DELETE an artifact (the guard cannot see TRUNCATE; privileges must)', async () => {
    const s = await newSubmission()
    const row = (await insertPending(admin, s)).rows[0]
    await markIssued(admin, row.id, row.attempt_id, row.sha256)
    const pending = (await insertPending(admin, await newSubmission())).rows[0]
    for (const role of ['anon', 'authenticated', 'service_role'] as const) {
      const c = await connect(role)
      expect([role, await errCode(c.query('TRUNCATE public.creator_record_artifacts'))]).toEqual([role, '42501'])
      expect([role, await errCode(c.query('TRUNCATE public.creator_record_artifact_uat'))]).toEqual([role, '42501'])
      expect([role, await errCode(c.query('DELETE FROM public.creator_record_artifacts WHERE id = $1', [pending.id]))]).toEqual([role, '42501'])
    }
    const left = await admin.query(`SELECT id, status FROM public.creator_record_artifacts WHERE id IN ($1, $2) ORDER BY status`, [row.id, pending.id])
    expect(left.rows).toEqual([{ id: row.id, status: 'issued' }, { id: pending.id, status: 'pending' }])
  })

  test('CR-ARTIFACT-1J: the service role can run the whole issuance lifecycle under its grants; the guard still fires; it cannot write the allowlist', async () => {
    const s = await newSubmission()
    const sr = await connect('service_role')
    const row = (await insertPending(sr, s)).rows[0] // INSERT ... RETURNING (needs SELECT)
    expect(row).toEqual(expect.objectContaining({ submission_id: s, status: 'pending' }))
    const next = randomUUID()
    expect((await takeOver(sr, row.id, row.attempt_id, next)).rowCount).toBe(1) // compare-and-swap UPDATE
    expect((await markIssued(sr, row.id, row.attempt_id, 'b'.repeat(64))).rowCount).toBe(0) // stale attempt fenced
    expect((await markIssued(sr, row.id, next, 'b'.repeat(64))).rowCount).toBe(1)
    const read = await sr.query(`SELECT status, attempt_id, storage_path FROM public.creator_record_artifacts WHERE submission_id = $1`, [s])
    expect(read.rows).toEqual([{ status: 'issued', attempt_id: next, storage_path: `${s}/${next}.pdf` }])
    // The guard fires for the service role although no role holds EXECUTE on it.
    expect(await errCode(sr.query(`UPDATE public.creator_record_artifacts SET byte_size = 1 WHERE id = $1`, [row.id]))).toBe('P0001')
    // The allowlist is operator-written only.
    expect(await errCode(sr.query(`INSERT INTO public.creator_record_artifact_uat (submission_id, added_by, reason) VALUES ($1, 'app', 'x')`, [s]))).toBe('42501')
    expect(await errCode(sr.query(`UPDATE public.creator_record_artifact_uat SET reason = 'x'`))).toBe('42501')
    expect(await errCode(sr.query(`DELETE FROM public.creator_record_artifact_uat`))).toBe('42501')
  })

  test('allowlist rows require who and why', async () => {
    const s = await newSubmission()
    expect(await errCode(admin.query(`INSERT INTO public.creator_record_artifact_uat (submission_id, added_by, reason) VALUES ($1, ' ', 'r')`, [s]))).toBe('23514')
    expect(await errCode(admin.query(`INSERT INTO public.creator_record_artifact_uat (submission_id, added_by, reason) VALUES ($1, 'JD', '')`, [s]))).toBe('23514')
  })
})
