/**
 * CR-V2-PROD-UAT-D1 — real PostgreSQL tests for the Production migration execution pack
 * (supabase/operator/creator-record-v2-uat/production-apply), run the way the Supabase SQL Editor runs them: each file sent
 * as ONE multi-statement simple-protocol query on a DOC-1-state database (payment ledger → … → 20261103000000).
 *
 * Proves: the order is enforced (03 before 01 refused; neither re-runs); each apply commits atomically or not at all
 * (pre-check refusal, post-check failure, lock timeout, a migration precondition failure all leave state 'absent' and
 * nothing committed); an error leaves the session's transaction aborted until an explicit ROLLBACK (the documented
 * operator recovery step); the schema-cache NOTIFY is delivered only when COMMIT succeeds; the staging placeholder is
 * refused; historical owner uploads are classified owner_upload; the verification queries report absent / applied.
 *
 * STUB: a Production-shaped public.assessments row (Cloud World, is_system_test = true, as verified in Production on
 * 2026-11-03). Disposable local `si8_test_*` database only. Skipped without DATABASE_URL_TEST (required in CI).
 */
import { readFileSync } from 'fs'
import { join } from 'path'
import { randomUUID } from 'crypto'
import { Client, type Notification } from 'pg'

const URL = process.env.DATABASE_URL_TEST
const APP = join(__dirname, '..', '..')
const MIG = join(APP, 'supabase', 'migrations')
const PACK = join(APP, 'supabase', 'operator', 'creator-record-v2-uat', 'production-apply')
const DOC1_CHAIN = [
  '20261021000000_payment_fulfillments.sql',
  '20261022000000_payment_zero_total_paid.sql',
  '20261028000000_creator_record_artifacts.sql',
  '20261101000000_creator_record_v2_prepared.sql',
  '20261102000000_creator_record_v2_submission_binding.sql',
  '20261103000000_creator_record_v2_evidence.sql',
].map((f) => join(MIG, f))
const INTAKE_CONSENT = 'DRAFT-UNAPPROVED-cr-v2-evidence-storage-consent-0'
const SHA = 'a'.repeat(64)

function assertDisposable(url: string) {
  const u = new globalThis.URL(url)
  const db = u.pathname.replace(/^\//, '')
  if (!db.startsWith('si8_test_')) throw new Error(`refusing to run: database "${db}" is not si8_test_*`)
  if (!['localhost', '127.0.0.1', '::1', '[::1]'].includes(u.hostname)) throw new Error(`refusing to run: host "${u.hostname}" is not a local disposable database`)
}
if (process.env.CI && !URL) throw new Error('DATABASE_URL_TEST is required in CI — the production-apply DB suite must not be skipped')
const maybe = URL ? describe : describe.skip

const file = (name: string) => readFileSync(join(PACK, name), 'utf8')
const APPLY_04 = file('01_apply_20261104.sql')
const APPLY_05 = file('03_apply_20261105.sql')
const fail = async (p: Promise<unknown>): Promise<{ code: string; message: string }> => {
  try {
    await p
    return { code: 'no error', message: '' }
  } catch (e) {
    return { code: (e as { code?: string }).code ?? 'unknown', message: (e as Error).message }
  }
}
type Drift = { tables: string[]; functions: string[]; columns: string[]; constraints: string[]; indexes: string[] }
type Verify = { migration: string; state: 'absent' | 'applied' | 'partial'; all_pass: boolean; failed: string[]; checks: number; drift: Drift }
const NO_DRIFT: Drift = { tables: [], functions: [], columns: [], constraints: [], indexes: [] }

maybe('creator record v2 production migration execution pack (PostgreSQL)', () => {
  let admin: Client
  const extra: Client[] = []
  async function connect(): Promise<Client> {
    const c = new Client({ connectionString: URL })
    await c.connect()
    extra.push(c)
    return c
  }
  /** Run one pack file as the SQL Editor does: one simple-protocol query; return its last row. */
  async function run(c: Client, sql: string): Promise<Record<string, unknown> | undefined> {
    const r = (await c.query(sql)) as unknown
    const results = (Array.isArray(r) ? r : [r]) as { rows?: Record<string, unknown>[] }[]
    return results.filter((x) => x.rows && x.rows.length).pop()?.rows?.[0]
  }
  const verify = async (n: '02' | '04'): Promise<Verify> => {
    const row = await run(admin, file(n === '02' ? '02_verify_20261104.sql' : '04_verify_20261105.sql'))
    return (row as Record<string, Verify>)[n === '02' ? 'verify_20261104' : 'verify_20261105']
  }
  const states = async () => [(await verify('02')).state, (await verify('04')).state]
  async function doc1State(methodology = 'SI8 Reviewer Manual v0.1') {
    await admin.query('DROP SCHEMA IF EXISTS public CASCADE')
    await admin.query('CREATE SCHEMA public')
    await admin.query(readFileSync(join(__dirname, 'bootstrap.sql'), 'utf8'))
    await admin.query('DROP SCHEMA IF EXISTS storage CASCADE')
    await admin.query('CREATE SCHEMA storage; CREATE TABLE storage.buckets (id text PRIMARY KEY, name text NOT NULL, public boolean, file_size_limit bigint, allowed_mime_types text[])')
    for (const m of DOC1_CHAIN) await admin.query(readFileSync(m, 'utf8'))
    // STUB: Production's Cloud World row (or the staging placeholder).
    await admin.query('CREATE TABLE public.assessments (assessment_number text PRIMARY KEY, methodology_version text NOT NULL, is_system_test boolean NOT NULL DEFAULT false)')
    await admin.query(`INSERT INTO public.assessments VALUES ('ASSESS-005-2026-07-12', $1, true)`, [methodology])
  }
  async function ownerDocument(consent = INTAKE_CONSENT) {
    const userId = randomUUID()
    const id = randomUUID()
    await admin.query('INSERT INTO public.users (id, email, name) VALUES ($1, $2, $3)', [userId, `${userId}@example.test`, 'Tester'])
    await admin.query(
      `INSERT INTO public.creator_record_v2_documents (id, user_id, sha256, media_type, byte_size, file_name, storage_path, consent_version, state)
       VALUES ($1, $2, $3, 'application/pdf', 100, 'receipt', $4, $5, 'pending')`,
      [id, userId, SHA.slice(0, 63) + Math.floor(Math.random() * 10), `${userId}/${id}`, consent],
    )
  }

  beforeAll(async () => {
    assertDisposable(URL as string)
    admin = new Client({ connectionString: URL })
    await admin.connect()
  })
  afterAll(async () => {
    for (const c of extra) await c.end().catch(() => undefined)
    await admin?.end()
  })

  test('the full sequence on a Production-shaped DOC-1 database: order enforced, each step commits once, and both verifications pass', async () => {
    await doc1State()
    expect(await states()).toEqual(['absent', 'absent'])

    // 03 before 01: refused by the pre-check; the session must then be rolled back explicitly.
    expect((await fail(run(admin, APPLY_05))).message).toMatch(/^D1B refused: 20261104000000 is not applied and verified/)
    expect((await fail(admin.query('SELECT 1'))).code).toBe('25P02')
    await admin.query('ROLLBACK')
    expect(await states()).toEqual(['absent', 'absent'])

    expect(await run(admin, APPLY_04)).toEqual({ d1a_result: '20261104000000 COMMITTED' })
    expect(await verify('02')).toEqual({ migration: '20261104000000', state: 'applied', all_pass: true, failed: [], checks: 31, drift: NO_DRIFT })
    expect((await verify('04')).state).toBe('absent')

    expect((await fail(run(admin, APPLY_04))).message).toBe('D1A refused: 20261104000000 is not absent (state applied); run 02_verify_20261104.sql and stop')
    await admin.query('ROLLBACK')

    expect(await run(admin, APPLY_05)).toEqual({ d1b_result: '20261105000000 COMMITTED' })
    expect(await verify('04')).toEqual({ migration: '20261105000000', state: 'applied', all_pass: true, failed: [], checks: 28, drift: NO_DRIFT })
    expect(await verify('02')).toMatchObject({ state: 'applied', all_pass: true })

    expect((await fail(run(admin, APPLY_05))).message).toBe('D1B refused: 20261105000000 is not absent (state applied); run 04_verify_20261105.sql and stop')
    await admin.query('ROLLBACK')
    expect(await states()).toEqual(['applied', 'applied'])
  })

  test('the staging placeholder is refused before any change', async () => {
    await doc1State('STAGING-PLACEHOLDER')
    expect((await fail(run(admin, APPLY_04))).message).toBe('D1A refused: this database does not look like Production')
    await admin.query('ROLLBACK')
    expect(await states()).toEqual(['absent', 'absent'])
  })

  test('a failed post-check commits nothing (atomic), and the NOTIFY is delivered only by a successful COMMIT', async () => {
    await doc1State()
    const listener = await connect()
    const heard: Notification[] = []
    listener.on('notification', (n) => heard.push(n))
    await listener.query('LISTEN pgrst')

    // Tamper only the expected fixture count in the embedded post-check: the migration runs, the post-check refuses.
    const tampered = APPLY_04.split("[1]::text = '45' END").join("[1]::text = '46' END")
    expect(tampered).not.toBe(APPLY_04)
    const r = await fail(run(admin, tampered))
    expect(r.message).toMatch(/^D1A post-check failed; nothing is committed: .*"fixtures_rows_45"/)
    await admin.query('ROLLBACK')
    expect(await states()).toEqual(['absent', 'absent'])
    await listener.query('SELECT 1')
    expect(heard).toHaveLength(0)

    expect(await run(admin, APPLY_04)).toEqual({ d1a_result: '20261104000000 COMMITTED' })
    await listener.query('SELECT 1')
    expect(heard.map((n) => [n.channel, n.payload])).toEqual([['pgrst', 'reload schema']])
  })

  test('a lock conflict fails within lock_timeout instead of queueing, leaves the session aborted until ROLLBACK, and commits nothing', async () => {
    await doc1State()
    const holder = await connect()
    await holder.query('BEGIN')
    await holder.query('LOCK TABLE public.creator_record_v2_evidence_access_log IN ACCESS SHARE MODE') // e.g. an in-flight DOC-1 read
    const t = Date.now()
    const r = await fail(run(admin, APPLY_04))
    const waited = Date.now() - t
    expect(r.code).toBe('55P03') // lock_not_available
    expect(waited).toBeGreaterThanOrEqual(4500)
    expect(waited).toBeLessThan(30000)
    expect((await fail(admin.query('SELECT 1'))).code).toBe('25P02') // in_failed_sql_transaction
    await admin.query('ROLLBACK')
    await holder.query('ROLLBACK')
    expect(await states()).toEqual(['absent', 'absent'])
    expect(await run(admin, APPLY_04)).toEqual({ d1a_result: '20261104000000 COMMITTED' })
  }, 60000)

  test('20261105: historical owner uploads become owner_upload; a document without the intake consent refuses the whole transaction', async () => {
    await doc1State()
    await ownerDocument()
    await ownerDocument()
    expect(await run(admin, APPLY_04)).toEqual({ d1a_result: '20261104000000 COMMITTED' })
    await ownerDocument('some-other-consent-value')
    const r = await fail(run(admin, APPLY_05))
    expect(r.message).toMatch(/^historical document provenance cannot be established/)
    await admin.query('ROLLBACK')
    expect(await states()).toEqual(['applied', 'absent'])
    expect(await verify('02')).toMatchObject({ all_pass: true })

    await admin.query(`DELETE FROM public.creator_record_v2_documents WHERE consent_version <> $1`, [INTAKE_CONSENT])
    expect(await run(admin, APPLY_05)).toEqual({ d1b_result: '20261105000000 COMMITTED' })
    expect(await verify('04')).toMatchObject({ state: 'applied', all_pass: true })
    expect(Number((await admin.query(`SELECT count(*) n FROM public.creator_record_v2_documents WHERE origin = 'owner_upload' AND consent_version IS NOT NULL`)).rows[0].n)).toBe(2)
  })

  /**
   * CR-V2-PROD-UAT-D1C: each deviation alone, inside a rolled-back transaction, against its classification.
   *   fail   = a security or migration-integrity invariant (all_pass must become false)
   *   report = unrelated namespace drift or an extra item on a migration-owned table (all_pass stays true; drift names it)
   */
  const MUTATIONS: [number, string, 'fail' | 'report', string, ('s04' | 's05')?][] = [
    [1, 'extra table under the prefix', 'report', 'CREATE TABLE public.creator_record_v2_examination_extra (id int)'],
    [2, 'extra function under the prefix', 'report', "CREATE FUNCTION public.creator_record_v2_examination_extra() RETURNS int LANGUAGE sql AS 'SELECT 1'"],
    [3, 'extra trigger on runs', 'fail', 'CREATE TRIGGER x_extra BEFORE INSERT ON public.creator_record_v2_examination_runs FOR EACH ROW EXECUTE FUNCTION public.creator_record_v2_examination_append_only_guard()'],
    [4, 'extra column on fixtures', 'report', 'ALTER TABLE public.creator_record_v2_synthetic_fixtures ADD COLUMN extra text'],
    [5, 'extra constraint on grants', 'report', 'ALTER TABLE public.creator_record_v2_examination_uat_grants ADD CONSTRAINT x_extra CHECK (true)', 's05'],
    [6, 'extra index on runs', 'report', 'CREATE INDEX x_extra ON public.creator_record_v2_examination_runs (created_at)'],
    [7, 'extra policy on fixtures', 'fail', 'CREATE POLICY x_extra ON public.creator_record_v2_synthetic_fixtures FOR SELECT USING (true)'],
    [8, 'anon SELECT on fixtures', 'fail', 'GRANT SELECT ON public.creator_record_v2_synthetic_fixtures TO anon'],
    [9, 'service_role INSERT on runs', 'fail', 'GRANT INSERT ON public.creator_record_v2_examination_runs TO service_role'],
    [10, 'anon EXECUTE on the status function', 'fail', 'GRANT EXECUTE ON FUNCTION public.creator_record_v2_examination_uat_status(text) TO anon', 's05'],
    [11, 'anon UPDATE on the DOC-1 access log', 'fail', 'GRANT UPDATE ON public.creator_record_v2_evidence_access_log TO anon'],
    [12, 'service_role TRUNCATE on DOC-1 documents', 'fail', 'GRANT TRUNCATE ON public.creator_record_v2_documents TO service_role'],
    [13, 'authenticated INSERT on DOC-1 documents', 'fail', 'GRANT INSERT ON public.creator_record_v2_documents TO authenticated'],
    [14, 'RLS disabled on DOC-1 documents', 'fail', 'ALTER TABLE public.creator_record_v2_documents DISABLE ROW LEVEL SECURITY'],
    [15, 'seed-binding trigger disabled', 'fail', 'ALTER TABLE public.creator_record_v2_documents DISABLE TRIGGER creator_record_v2_documents_seed_binding', 's05'],
    [16, 'search_path reset on a definer function', 'fail', 'ALTER FUNCTION public.creator_record_v2_documents_seed_binding() RESET search_path', 's05'],
    [17, 'DOC-1 guard trigger disabled', 'fail', 'ALTER TABLE public.creator_record_v2_documents DISABLE TRIGGER creator_record_v2_documents_guard'],
    [18, 'PUBLIC SELECT on runs', 'fail', 'GRANT SELECT ON public.creator_record_v2_examination_runs TO PUBLIC'],
    [19, 'service_role EXECUTE on a trigger function', 'fail', 'GRANT EXECUTE ON FUNCTION public.creator_record_v2_examination_append_only_guard() TO service_role'],
    [20, 'definer write function made invoker', 'fail', 'ALTER FUNCTION public.creator_record_v2_record_examination(bigint, text) SECURITY INVOKER'],
    [21, 'migration constraint dropped', 'fail', 'ALTER TABLE public.creator_record_v2_synthetic_fixtures DROP CONSTRAINT creator_record_v2_synthetic_fixtures_fixture_id_check'],
    [22, 'migration column default changed', 'fail', "ALTER TABLE public.creator_record_v2_evidence_access_log ALTER COLUMN purpose SET DEFAULT 'examination'"],
  ]
  const MAINTAIN: [number, string, 'fail', string] = [23, 'service_role MAINTAIN on fixtures (PostgreSQL 17)', 'fail', 'GRANT MAINTAIN ON public.creator_record_v2_synthetic_fixtures TO service_role']
  const isPg17 = async () => Number((await admin.query(`SELECT current_setting('server_version_num')::int v`)).rows[0].v) >= 170000
  async function classify(stage: 's04' | 's05'): Promise<string[]> {
    const outcomes: string[] = []
    const cases = [...MUTATIONS, ...((await isPg17()) ? [MAINTAIN] : [])]
    for (const [n, name, , ddl, only] of cases) {
      if (only && only !== stage) continue
      await admin.query('BEGIN')
      try {
        await admin.query(ddl)
        const results = [await verify('02'), ...(stage === 's05' ? [await verify('04')] : [])]
        const failing = results.some((r) => !r.all_pass)
        const drifted = results.some((r) => Object.values(r.drift).some((xs) => xs.length > 0))
        outcomes.push(`${n} ${name}: ${failing ? 'fail' : drifted ? 'report' : 'unnoticed'}`)
      } finally {
        await admin.query('ROLLBACK')
      }
    }
    return outcomes
  }
  const expectedOutcomes = (stage: 's04' | 's05', pg17: boolean) =>
    [...MUTATIONS, ...(pg17 ? [MAINTAIN] : [])].filter((m) => !m[4] || m[4] === stage).map(([n, name, outcome]) => `${n} ${name}: ${outcome}`)

  test('D1C: every security or migration-integrity deviation fails verification; unrelated drift is only reported (after each migration)', async () => {
    const pg17 = await isPg17()
    await doc1State()
    expect(await run(admin, APPLY_04)).toEqual({ d1a_result: '20261104000000 COMMITTED' })
    expect(await classify('s04')).toEqual(expectedOutcomes('s04', pg17))
    expect(await run(admin, APPLY_05)).toEqual({ d1b_result: '20261105000000 COMMITTED' })
    expect(await classify('s05')).toEqual(expectedOutcomes('s05', pg17))
    // Nothing persisted from the mutations: both verifications still pass, with no drift.
    expect(await verify('02')).toMatchObject({ all_pass: true, drift: NO_DRIFT })
    expect(await verify('04')).toMatchObject({ all_pass: true, drift: NO_DRIFT })
  })

  test('D1C: the 01 pre-check refuses a DOC-1 boundary deviation before any change, and commits nothing', async () => {
    await doc1State()
    await admin.query('GRANT TRUNCATE ON public.creator_record_v2_documents TO service_role')
    expect((await fail(run(admin, APPLY_04))).message).toMatch(/^D1A refused: the DOC-1 boundary differs from the verified Production fingerprint: .*"doc1_table_privileges"/)
    await admin.query('ROLLBACK')
    expect(await states()).toEqual(['absent', 'absent'])
    await admin.query('REVOKE TRUNCATE ON public.creator_record_v2_documents FROM service_role')
    expect(await run(admin, APPLY_04)).toEqual({ d1a_result: '20261104000000 COMMITTED' })
  })

  test('the verification queries never error in any state and report partial when objects exist without the full migration', async () => {
    await doc1State()
    expect(await verify('02')).toMatchObject({ state: 'absent', all_pass: false })
    expect(await verify('04')).toMatchObject({ state: 'absent', all_pass: false })
    // FORCED: a hand-made half state (cannot arise from the transactional files) must be reported as partial.
    await admin.query(`CREATE TABLE public.creator_record_v2_examination_environment (singleton boolean PRIMARY KEY)`)
    expect((await verify('02')).state).toBe('partial')
    await admin.query(`DROP TABLE public.creator_record_v2_examination_environment`)
  })
})
