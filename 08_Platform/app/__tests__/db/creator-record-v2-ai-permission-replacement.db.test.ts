/**
 * CR-PUBLIC-2A-FIX — the proposed operator procedure `supabase/operator/creator-record-v2-terms/replace_ai_permission_authority.sql`,
 * run VERBATIM (only its EDIT constants filled) on real PostgreSQL with every migration through 20261113000000 applied.
 *
 * Proves: it refuses unless filled in, well formed, different, and matching the single current row; it replaces the row in one
 * transaction (other sessions see the old identifier until commit, never none); the guard still refuses UPDATE; the same script
 * with the constants swapped is the rollback. Stale-grant behaviour after a version change is proven by
 * creator-record-v2-ai-permission.db.test.ts ("a stale grant no longer permits examination after the version changes").
 *
 * Disposable local `si8_test_*` database only.
 */
import { readFileSync } from 'fs'
import { join } from 'path'
import { Client } from 'pg'

const URL = process.env.DATABASE_URL_TEST
const DIR = join(__dirname, '..', '..', 'supabase', 'migrations')
const MIGRATIONS = [
  '20261021000000_payment_fulfillments.sql', '20261022000000_payment_zero_total_paid.sql', '20261028000000_creator_record_artifacts.sql',
  '20261101000000_creator_record_v2_prepared.sql', '20261102000000_creator_record_v2_submission_binding.sql', '20261103000000_creator_record_v2_evidence.sql',
  '20261104000000_creator_record_v2_examination_runs.sql', '20261105000000_creator_record_v2_operator_synthetic_uat.sql', '20261106000000_creator_record_v2_customer_path_uat.sql',
  '20261107000000_creator_record_v2_admin_uat.sql', '20261108000000_creator_record_v2_live_examination_foundation.sql', '20261110000000_creator_record_v2_customer_live_examination.sql',
  '20261111000000_creator_record_v2_retention_m1a.sql', '20261112000000_creator_record_v2_ai_examination_permission.sql',
  '20261113000000_creator_record_v2_ai_permission_current_version.sql',
].map((f) => join(DIR, f))
const SCRIPT = readFileSync(join(__dirname, '..', '..', 'supabase', 'operator', 'creator-record-v2-terms', 'replace_ai_permission_authority.sql'), 'utf8')
const OLD = 'cr-v2-ai-permission-1__privacy-2026-11-09__terms-2026-11-14'
const NEW = 'cr-v2-ai-permission-1__privacy-2026-11-09__terms-2026-11-25'

function filled(over: Partial<Record<'current' | 'next' | 'operator' | 'ref', string>> = {}) {
  const v = { current: OLD, next: NEW, operator: 'db test operator', ref: 'TEST-ONLY', ...over }
  const set = (src: string, name: string, value: string) => src.replace(new RegExp(`(${name}\\s+constant text := )'EDIT:[^']*'`), `$1'${value.replace(/'/g, "''")}'`)
  return set(set(set(set(SCRIPT, 'c_expected_current', v.current), 'c_new_version', v.next), 'c_operator', v.operator), 'c_change_ref', v.ref)
}

function assertDisposable(url: string) {
  const u = new globalThis.URL(url)
  if (!u.pathname.replace(/^\//, '').startsWith('si8_test_')) throw new Error('refusing to run: not an si8_test_* database')
  if (!['localhost', '127.0.0.1', '::1', '[::1]'].includes(u.hostname)) throw new Error('refusing to run: host is not local')
}
if (process.env.CI && !URL) throw new Error('DATABASE_URL_TEST is required in CI')
const maybe = URL ? describe : describe.skip

maybe('AI-permission authority replacement procedure (PostgreSQL, through 20261113000000)', () => {
  let admin: Client
  let other: Client
  const rows = async () => (await admin.query('SELECT permission_version, established_by, reason FROM public.creator_record_v2_ai_permission_authority')).rows
  const current = async (c: Client = admin) => (await c.query('SELECT public.creator_record_v2_current_ai_permission_version() AS v')).rows[0].v
  const reset = async (v: string | null) => {
    await admin.query('DELETE FROM public.creator_record_v2_ai_permission_authority')
    if (v) await admin.query("INSERT INTO public.creator_record_v2_ai_permission_authority (permission_version, established_by, reason) VALUES ($1, 'seed', 'seed')", [v])
  }

  beforeAll(async () => {
    assertDisposable(URL!)
    admin = new Client({ connectionString: URL })
    await admin.connect()
    await admin.query('DROP SCHEMA IF EXISTS public CASCADE')
    await admin.query('CREATE SCHEMA public')
    await admin.query(readFileSync(join(__dirname, 'bootstrap.sql'), 'utf8'))
    await admin.query('DROP SCHEMA IF EXISTS storage CASCADE')
    await admin.query('CREATE SCHEMA storage; CREATE TABLE storage.buckets (id text PRIMARY KEY, name text NOT NULL, public boolean, file_size_limit bigint, allowed_mime_types text[])')
    for (const m of MIGRATIONS) await admin.query(readFileSync(m, 'utf8'))
    other = new Client({ connectionString: URL })
    await other.connect()
  })
  afterAll(async () => { await other?.end(); await admin?.end() })
  beforeEach(async () => { await reset(OLD) })

  test('the script as committed refuses: every EDIT constant must be filled; nothing changes', async () => {
    await expect(admin.query(SCRIPT)).rejects.toThrow('REFUSED: edit every EDIT constant first')
    expect(await current()).toBe(OLD)
  })

  test('refuses a malformed, draft or unchanged new identifier', async () => {
    for (const next of ['terms-2026-11-25', 'cr-v2-ai-permission-1__privacy-2026-11-09', 'cr-v2-ai-permission-1__privacy-x__terms-DRAFT', 'DRAFT-UNAPPROVED-x', OLD]) {
      await expect(admin.query(filled({ next }))).rejects.toThrow('REFUSED')
      expect(await current()).toBe(OLD)
    }
  })

  test('refuses unless exactly one row exists and it names the expected current identifier', async () => {
    await expect(admin.query(filled({ current: 'cr-v2-ai-permission-1__privacy-2026-11-09__terms-2026-01-01' }))).rejects.toThrow(/REFUSED: the current identifier is cr-v2-ai-permission-1__privacy-2026-11-09__terms-2026-11-14/)
    expect(await current()).toBe(OLD)
    await reset(null)
    await expect(admin.query(filled())).rejects.toThrow('REFUSED: expected exactly one authority row, found 0')
    expect(await current()).toBeNull()
  })

  test('replaces the single row: the new identifier is current, with actor and reason recorded', async () => {
    await admin.query(filled())
    expect(await rows()).toEqual([{ permission_version: NEW, established_by: 'db test operator', reason: 'CR-PUBLIC Terms release: TEST-ONLY' }])
    expect(await current()).toBe(NEW)
  })

  test('atomic: until commit another session still sees the old identifier, never none; after commit it sees the new one', async () => {
    await admin.query('BEGIN')
    await admin.query(filled())
    expect(await current(other)).toBe(OLD)
    await admin.query('COMMIT')
    expect(await current(other)).toBe(NEW)
  })

  test('a failure inside the block rolls everything back (old row kept)', async () => {
    await admin.query('BEGIN')
    await expect(admin.query(filled({ next: OLD }))).rejects.toThrow('REFUSED')
    await admin.query('ROLLBACK')
    expect(await current()).toBe(OLD)
  })

  test('rollback = the same script with the constants swapped', async () => {
    await admin.query(filled())
    expect(await current()).toBe(NEW)
    await admin.query(filled({ current: NEW, next: OLD }))
    expect(await current()).toBe(OLD)
  })

  test('the table guard still refuses an in-place UPDATE (the reason the procedure deletes and inserts)', async () => {
    await expect(admin.query('UPDATE public.creator_record_v2_ai_permission_authority SET permission_version = $1', [NEW])).rejects.toThrow('not changed in place')
    expect(await current()).toBe(OLD)
  })
})
