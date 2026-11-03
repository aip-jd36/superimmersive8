/**
 * CR-V2-EXAM-INTEGRATION-X1 — real PostgreSQL tests for the 20261106000000 Production apply / verify files
 * (supabase/operator/creator-record-v2-uat/production-apply/05_apply_20261106.sql, 06_verify_20261106.sql), run the way the
 * Supabase SQL Editor runs them (one multi-statement simple-protocol query) on a Production-shaped database that has had
 * 01 and 03 applied through the pack AND holds the E4 operator-UAT history (a revoked operator_seed grant, its seeded
 * document, examination read events and one run).
 *
 * Proves: the 02 / 04 checks that E4 fails are exactly the documented data counts; 05 commits on that state, keeps every
 * E4 row byte-identical, and leaves 06 applied with every check passing and 02 / 04 failing nothing but the documented
 * set; 05 refuses (nothing committed) on: a second run, an active grant, the isolated-test marker, the staging placeholder,
 * any security deviation; a failed post-check commits nothing and sends no schema-cache NOTIFY; 06 fails on integrity
 * deviations and never errors in any state; the documented rollback restores the 20261105 state with E4 intact.
 *
 * STUB: Production's Cloud World assessments row. Disposable local `si8_test_*` database only (PostgreSQL 15 and 17).
 * Skipped without DATABASE_URL_TEST (required in CI).
 */
import { readFileSync } from 'fs'
import { join } from 'path'
import { createHash, randomUUID } from 'crypto'
import { Client, type Notification } from 'pg'
import { parseExaminationEnvelope, type ExaminationEnvelope } from '@/lib/creator-record/examination/envelope'
import { examineDocument, examinationKey } from '@/lib/creator-record/examination/examine-document'
import { buildProfileRegistry } from '@/lib/creator-record/examination/profile'
import { RECEIPT_PROFILE } from '@/lib/creator-record/examination/receipt-profile'
import { knownFixtureRegistry, replayExecutor } from '@/lib/creator-record/examination/replay-executor'
import { buildReplayTable } from '@/lib/creator-record/evidence/replay'
import { REPLAY_FIXTURES } from '@/lib/creator-record/evidence/replay-fixtures.data'
import { canonicalJson } from '@/lib/creator-record/record-core/canonical'

const URL = process.env.DATABASE_URL_TEST
const APP = join(__dirname, '..', '..')
const MIG = join(APP, 'supabase', 'migrations')
const OPERATOR = join(APP, 'supabase', 'operator', 'creator-record-v2-uat')
const PACK = join(OPERATOR, 'production-apply')
const DOC1_CHAIN = [
  '20261021000000_payment_fulfillments.sql',
  '20261022000000_payment_zero_total_paid.sql',
  '20261028000000_creator_record_artifacts.sql',
  '20261101000000_creator_record_v2_prepared.sql',
  '20261102000000_creator_record_v2_submission_binding.sql',
  '20261103000000_creator_record_v2_evidence.sql',
].map((f) => join(MIG, f))
const PROD_REF = 'lehqgcgnenwdmuzudbrs'
const GRANTS = 'public.creator_record_v2_examination_uat_grants'

function assertDisposable(url: string) {
  const u = new globalThis.URL(url)
  const db = u.pathname.replace(/^\//, '')
  if (!db.startsWith('si8_test_')) throw new Error(`refusing to run: database "${db}" is not si8_test_*`)
  if (!['localhost', '127.0.0.1', '::1', '[::1]'].includes(u.hostname)) throw new Error(`refusing to run: host "${u.hostname}" is not a local disposable database`)
}
if (process.env.CI && !URL) throw new Error('DATABASE_URL_TEST is required in CI — the 20261106 production-apply DB suite must not be skipped')
const maybe = URL ? describe : describe.skip

const file = (name: string) => readFileSync(join(PACK, name), 'utf8')
const APPLY_04 = file('01_apply_20261104.sql')
const APPLY_05 = file('03_apply_20261105.sql')
const APPLY_06 = file('05_apply_20261106.sql')
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
/** What E4's history fails by design in 02 / 04 (data counts written for a pre-UAT database) — and after 20261106, 04's replaced constraint. */
const E4_02 = ['access_log_all_downloads', 'runs_rows_0']
const E4_04 = ['access_log_no_grant_rows', 'documents_all_owner_upload', 'grants_rows_0']
const E4_04_AFTER_06 = ['access_log_no_grant_rows', 'documents_all_owner_upload', 'grants_rows_0', 'shape_runs_constraints']
/** The approved E4 history, exactly as the pack pins it (expected.json e4_20261106, sourced from the committed E4 record). */
const E4X = JSON.parse(readFileSync(join(PACK, 'expected.json'), 'utf8')).e4_20261106 as Record<string, string> & { grant_max_read_events: number; grant_max_new_runs: number }

const sha = (b: Uint8Array | string) => createHash('sha256').update(b).digest('hex')
const F = REPLAY_FIXTURES.find((f) => f.fixture_id === 'pdf-kling-pro-monthly')!
/** As the PROD-UAT-B suite: the committed core on stand-in bytes, rebound to the committed fixture fingerprint and size. */
async function envelopeFor(documentId: string, ownerId: string): Promise<ExaminationEnvelope> {
  const bytes = new Uint8Array(Buffer.from(`%PDF-1.4\n%synthetic-test:${F.fixture_id}\n%%EOF\n`))
  const table = buildReplayTable([{ ...F, sha256: sha(bytes) }])
  const r = await examineDocument(
    {
      documents: { get: async () => ({ id: documentId, user_id: ownerId, sha256: sha(bytes), media_type: 'application/pdf', byte_size: bytes.length, state: 'stored' }), readBytes: async () => bytes },
      fixtures: knownFixtureRegistry(table), executor: replayExecutor(table), profiles: buildProfileRegistry([RECEIPT_PROFILE]),
    },
    { actor_user_id: ownerId, document_id: documentId, profile: { id: RECEIPT_PROFILE.ref.id, version: RECEIPT_PROFILE.ref.version } },
  )
  if (r.kind !== 'envelope') throw new Error(`core refused: ${r.stage}/${r.code}`)
  const e = { ...r.envelope, document: { ...r.envelope.document, sha256: F.sha256, byte_size: F.bytes! } }
  const key = examinationKey({ document_id: e.document.document_id, sha256: e.document.sha256, profile: e.profile, executor: e.executor })
  const env: ExaminationEnvelope = { ...e, examination_key: key, observations: e.observations.map((o) => ({ ...o, observation_id: key.slice(0, 16) + o.observation_id.slice(16), source: { document_sha256: e.document.sha256, location: null } })) }
  if (!parseExaminationEnvelope(env)) throw new Error('rebound envelope fails the committed parser')
  return env
}

maybe('creator record v2 production apply / verify for 20261106000000 (PostgreSQL)', () => {
  let admin: Client
  let svc: Client
  const extra: Client[] = []
  async function connect(): Promise<Client> {
    const c = new Client({ connectionString: URL })
    await c.connect()
    extra.push(c)
    return c
  }
  async function run(c: Client, sql: string): Promise<Record<string, unknown> | undefined> {
    const r = (await c.query(sql)) as unknown
    const results = (Array.isArray(r) ? r : [r]) as { rows?: Record<string, unknown>[] }[]
    return results.filter((x) => x.rows && x.rows.length).pop()?.rows?.[0]
  }
  const verify = async (n: '02' | '04' | '06'): Promise<Verify> => {
    const name = { '02': ['02_verify_20261104.sql', 'verify_20261104'], '04': ['04_verify_20261105.sql', 'verify_20261105'], '06': ['06_verify_20261106.sql', 'verify_20261106'] }[n]
    return ((await run(admin, file(name[0]))) as Record<string, Verify>)[name[1]]
  }

  /** Production before E4: DOC-1 → 01 → 03 through the pack, no examination history. */
  async function production(methodology = 'SI8 Reviewer Manual v0.1') {
    await admin.query('DROP SCHEMA IF EXISTS public CASCADE')
    await admin.query('CREATE SCHEMA public')
    await admin.query(readFileSync(join(__dirname, 'bootstrap.sql'), 'utf8'))
    await admin.query('DROP SCHEMA IF EXISTS storage CASCADE')
    await admin.query('CREATE SCHEMA storage; CREATE TABLE storage.buckets (id text PRIMARY KEY, name text NOT NULL, public boolean, file_size_limit bigint, allowed_mime_types text[])')
    for (const m of DOC1_CHAIN) await admin.query(readFileSync(m, 'utf8'))
    await admin.query('CREATE TABLE public.assessments (assessment_number text PRIMARY KEY, methodology_version text NOT NULL, is_system_test boolean NOT NULL DEFAULT false)')
    await admin.query(`INSERT INTO public.assessments VALUES ('ASSESS-005-2026-07-12', $1, true)`, [methodology])
    expect(await run(admin, APPLY_04)).toEqual({ d1a_result: '20261104000000 COMMITTED' })
    expect(await run(admin, APPLY_05)).toEqual({ d1b_result: '20261105000000 COMMITTED' })
  }

  const HISTORY_TABLES = [GRANTS, 'public.creator_record_v2_documents', 'public.creator_record_v2_evidence_access_log', 'public.creator_record_v2_examination_runs']
  /**
   * Production today: the EXACT E4 history as recorded (expected.json e4_20261106, from the committed E4 record): the
   * identity, the revoked grant with its recorded id, created and expiry times and budgets, the seeded document, ONE
   * examination access event, and the run with its recorded id and key. FORCED (test-only): inserted with the row triggers
   * disabled, because the guards assign ids and times themselves, so recorded values cannot be reproduced through them.
   * The run's envelope is produced by the committed engine for the recorded document id, and must reproduce E4's key.
   */
  async function productionWithE4() {
    await production()
    const E = E4X
    await admin.query('INSERT INTO public.users (id, email, name) VALUES ($1, $2, $3)', [E.test_user_id, `${E.test_user_id}@example.test`, 'E4 synthetic identity'])
    const env = await envelopeFor(E.document_id, E.test_user_id)
    expect(env.examination_key).toBe(E.examination_key) // the committed engine reproduces the recorded E4 key
    const text = canonicalJson(env)
    await admin.query('BEGIN')
    for (const tbl of HISTORY_TABLES) await admin.query(`ALTER TABLE ${tbl} DISABLE TRIGGER USER`)
    await admin.query(
      `INSERT INTO ${GRANTS} (id, test_user_id, document_sha256, bound_document_id, supabase_project_ref, binding_nonce_sha256, established_by, reason, change_ref,
         created_at, expires_at, max_read_events, max_new_runs, revoked_at, revoked_by, revoke_reason)
       VALUES ($1, $2, $3, $4, $5, $6, 'SI8 operator', 'CR-V2-PROD-UAT-E4', 'CR-V2-PROD-UAT-E4', $7::timestamptz, $8::timestamptz, $9, $10,
         $8::timestamptz - interval '30 minutes', 'SI8 operator', 'CR-V2-PROD-UAT-E4 completed: synthetic examination and persisted history verified')`,
      [E.grant_id, E.test_user_id, E.fixture_sha256, E.document_id, E.project_ref, sha(randomUUID()), E.grant_created_at, E.grant_expires_at, E.grant_max_read_events, E.grant_max_new_runs])
    await admin.query(
      `INSERT INTO public.creator_record_v2_documents (id, user_id, sha256, media_type, byte_size, file_name, storage_path, consent_version, state, stored_at, origin, seed_grant_id)
       VALUES ($1, $2, $3, 'application/pdf', $4, 'pdf-kling-pro-monthly.pdf', $5, NULL, 'stored', now(), 'operator_synthetic_seed', $6)`,
      [E.document_id, E.test_user_id, E.fixture_sha256, F.bytes, `${E.test_user_id}/${E.document_id}`, E.grant_id])
    const logId = (await admin.query(
      `INSERT INTO public.creator_record_v2_evidence_access_log (document_id, actor_user_id, actor_role, purpose, uat_grant_id) VALUES ($1, $2, 'owner', 'examination', $3) RETURNING id`,
      [E.document_id, E.test_user_id, E.grant_id])).rows[0].id
    await admin.query(
      `INSERT INTO public.creator_record_v2_examination_runs (id, examination_key, document_id, user_id, document_sha256, envelope_version, content_class, workflow_authorization,
         execution_boundary, environment_project_ref, profile_id, profile_version, schema_version, prompt_version, executor_mode, replay_set, recording_sha256, replay_fixture_id,
         outcome_status, outcome_reason, envelope_canonical, envelope_sha256, supersedes_id, access_log_id, uat_grant_id)
       VALUES ($1, $2, $3, $4, $5, 2, 'known_synthetic_fixture', 'not_established', 'operator_synthetic_uat', $6, $7, $8, $9, $10, 'fixture_replay', $11, $12, $13,
         $14, $15, $16, $17, NULL, $18, $19)`,
      [E.run_id, env.examination_key, E.document_id, E.test_user_id, E.fixture_sha256, E.project_ref, env.profile.id, env.profile.version, env.profile.schema, env.profile.prompt,
        env.executor.replay_set, env.executor.recording_sha256, E.fixture_id, env.outcome.status, env.outcome.reason, text, sha(text), logId, E.grant_id])
    for (const tbl of HISTORY_TABLES) await admin.query(`ALTER TABLE ${tbl} ENABLE TRIGGER USER`)
    await admin.query('COMMIT')
  }

  /** One operator grant through the real guards: grant → seed → (optionally) one read + one run → revoke. */
  async function operatorFlow(owner: string, examine: boolean) {
    const grantId = (await admin.query(
      `INSERT INTO ${GRANTS} (test_user_id, document_sha256, supabase_project_ref, binding_nonce_sha256, established_by, reason, change_ref, expires_at, max_read_events)
       VALUES ($1, $2, $3, $4, 'operator', 'synthetic UAT', 'TEST', now() + interval '2 hours', 4) RETURNING id`, [owner, F.sha256, PROD_REF, sha(randomUUID())])).rows[0].id as string
    const docId = randomUUID()
    await svc.query(`INSERT INTO public.creator_record_v2_documents (id, user_id, sha256, media_type, byte_size, file_name, storage_path, consent_version, state, origin, seed_grant_id)
                     VALUES ($1, $2, $3, 'application/pdf', $4, 'pdf-kling-pro-monthly.pdf', $5, NULL, 'pending', 'operator_synthetic_seed', $6)`, [docId, owner, F.sha256, F.bytes, `${owner}/${docId}`, grantId])
    await svc.query(`UPDATE public.creator_record_v2_documents SET state = 'stored', stored_at = now() WHERE id = $1`, [docId])
    if (examine) {
      const logId = Number((await svc.query(`INSERT INTO public.creator_record_v2_evidence_access_log (document_id, actor_user_id, actor_role, purpose) VALUES ($1, $2, 'owner', 'examination') RETURNING id`, [docId, owner])).rows[0].id)
      await svc.query('SELECT * FROM public.creator_record_v2_record_examination($1, $2)', [logId, canonicalJson(await envelopeFor(docId, owner))])
    }
    await admin.query(`UPDATE ${GRANTS} SET revoked_at = now(), revoked_by = 'operator', revoke_reason = 'done' WHERE revoked_at IS NULL`)
    return grantId
  }
  const freshUser = async () => {
    const id = randomUUID()
    await admin.query('INSERT INTO public.users (id, email, name) VALUES ($1, $2, $3)', [id, `${id}@example.test`, 'Tester'])
    return id
  }
  const e4Rows = async () => ({
    g: (await admin.query(`SELECT row_to_json(g)::jsonb - 'grant_kind' r FROM ${GRANTS} g ORDER BY id`)).rows,
    d: (await admin.query('SELECT row_to_json(d)::jsonb r FROM public.creator_record_v2_documents d ORDER BY id')).rows,
    l: (await admin.query('SELECT row_to_json(l)::jsonb r FROM public.creator_record_v2_evidence_access_log l ORDER BY id')).rows,
    r: (await admin.query('SELECT row_to_json(r)::jsonb r FROM public.creator_record_v2_examination_runs r ORDER BY id')).rows,
  })
  /** The schema objects the migration could touch: function bodies, result types and grants; columns; constraints; triggers; table grants. */
  const catalog = async () => (await admin.query(`SELECT md5(string_agg(x, E'\n' ORDER BY x)) m FROM (
      SELECT 'f:' || proname || ':' || md5(prosrc) || ':' || pg_get_function_result(oid) || ':' || coalesce(proacl::text, '') x FROM pg_proc WHERE pronamespace = 'public'::regnamespace AND proname LIKE '%creator_record_v2%'
      UNION ALL SELECT 'c:' || table_name || '.' || column_name || ':' || data_type || ':' || coalesce(column_default, '') FROM information_schema.columns WHERE table_schema = 'public' AND table_name LIKE 'creator_record_v2%'
      UNION ALL SELECT 'k:' || conrelid::regclass::text || '.' || conname || ':' || pg_get_constraintdef(oid) FROM pg_constraint WHERE connamespace = 'public'::regnamespace AND conrelid::regclass::text LIKE '%creator_record_v2%'
      UNION ALL SELECT 't:' || tgrelid::regclass::text || '.' || tgname || ':' || tgenabled::text FROM pg_trigger WHERE NOT tgisinternal AND tgrelid::regclass::text LIKE '%creator_record_v2%'
      UNION ALL SELECT 'a:' || relname || ':' || coalesce(relacl::text, '') FROM pg_class WHERE relnamespace = 'public'::regnamespace AND relname LIKE 'creator_record_v2%') s`)).rows[0].m as string
  /** 05 refuses: the session is aborted until ROLLBACK, and afterwards the schema and every history row are exactly as before. */
  const refusedAndRolledBack = async (sql: string) => {
    const [schemaBefore, rowsBefore] = [await catalog(), await e4Rows()]
    const r = await fail(run(admin, sql))
    expect((await fail(admin.query('SELECT 1'))).code).toBe('25P02') // aborted until the operator's ROLLBACK
    await admin.query('ROLLBACK')
    expect((await verify('06')).state).toBe('absent')
    expect(await catalog()).toBe(schemaBefore)
    expect(await e4Rows()).toEqual(rowsBefore)
    return r.message
  }

  beforeAll(async () => {
    assertDisposable(URL as string)
    admin = new Client({ connectionString: URL })
    await admin.connect()
    await admin.query('DROP SCHEMA IF EXISTS public CASCADE')
    await admin.query('CREATE SCHEMA public')
    await admin.query(readFileSync(join(__dirname, 'bootstrap.sql'), 'utf8')) // API roles exist before SET ROLE
    svc = await connect()
    await svc.query('SET ROLE service_role')
  })
  afterAll(async () => {
    for (const c of extra) await c.end().catch(() => undefined)
    await admin?.end()
  })

  test('on Production with the E4 history: 02 / 04 fail exactly the documented data counts; 05 commits once; 06 passes; E4 rows unchanged', async () => {
    await productionWithE4()
    expect(await verify('02')).toMatchObject({ state: 'applied', all_pass: false, failed: E4_02, drift: NO_DRIFT })
    expect(await verify('04')).toMatchObject({ state: 'applied', all_pass: false, failed: E4_04, drift: NO_DRIFT })
    expect((await verify('06')).state).toBe('absent')
    const before = await e4Rows()

    expect(await run(admin, APPLY_06)).toEqual({ x1p_result: '20261106000000 COMMITTED' })
    const v06 = await verify('06')
    expect(v06).toEqual({ migration: '20261106000000', state: 'applied', all_pass: true, failed: [], checks: v06.checks, drift: NO_DRIFT })
    expect(v06.checks).toBe(18)
    expect(await verify('02')).toMatchObject({ state: 'applied', failed: E4_02, drift: NO_DRIFT })
    expect(await verify('04')).toMatchObject({ state: 'applied', failed: E4_04_AFTER_06 })
    expect(await e4Rows()).toEqual(before)
    expect((await admin.query(`SELECT grant_kind FROM ${GRANTS}`)).rows).toEqual([{ grant_kind: 'operator_seed' }])
  })

  test('05 never runs twice', async () => {
    await productionWithE4()
    expect(await run(admin, APPLY_06)).toEqual({ x1p_result: '20261106000000 COMMITTED' })
    const r = await fail(run(admin, APPLY_06))
    expect(r.message).toBe('X1P refused: 20261106000000 is not absent (state applied); run 06_verify_20261106.sql and stop')
    await admin.query('ROLLBACK')
    expect((await verify('06')).state).toBe('applied')
  })

  test('05 refuses before any change: an active grant, the isolated-test marker, the staging placeholder, a security deviation', async () => {
    // An active grant (a new operator grant for a fresh identity): refused by the fingerprint (a second grant) before the
    // active-grant check, which stays as defence in depth. Grants are never deleted, so the rest starts from a fresh E4.
    await productionWithE4()
    await admin.query(`INSERT INTO ${GRANTS} (test_user_id, document_sha256, supabase_project_ref, binding_nonce_sha256, established_by, reason, change_ref, expires_at, max_read_events)
                       VALUES ($1, $2, $3, $4, 'x', 'y', 'z', now() + interval '1 hour', 1)`, [await freshUser(), F.sha256, PROD_REF, sha(randomUUID())])
    expect(await refusedAndRolledBack(APPLY_06)).toBe('X1P refused: the UAT grants are not exactly the revoked E4 grant')
    await productionWithE4()
    // The isolated-test marker (never in Production).
    await admin.query(`INSERT INTO public.creator_record_v2_examination_environment (environment_kind, supabase_project_ref, established_by, reason) VALUES ('isolated_synthetic_test', 'localpg15examination', 'x', 'y')`)
    // Caught first by 02's marker_rows_0 (not E4 history); the dedicated marker refusal backs it up.
    expect(await refusedAndRolledBack(APPLY_06)).toMatch(/^X1P refused: 20261104000000 is not applied, or fails a check other than the E4 history: .*"marker_rows_0"/)
    await admin.query('DELETE FROM public.creator_record_v2_examination_environment')
    // A security deviation: 04 then fails something other than the E4 history.
    await admin.query('GRANT SELECT ON public.creator_record_v2_examination_runs TO anon')
    expect(await refusedAndRolledBack(APPLY_06)).toMatch(/^X1P refused: 20261104000000 is not applied, or fails a check other than the E4 history: .*"table_privileges"/)
    await admin.query('REVOKE SELECT ON public.creator_record_v2_examination_runs FROM anon')
    // The staging placeholder.
    await admin.query(`UPDATE public.assessments SET methodology_version = 'STAGING-PLACEHOLDER'`)
    expect(await refusedAndRolledBack(APPLY_06)).toBe('X1P refused: this database does not look like Production')
    await admin.query(`UPDATE public.assessments SET methodology_version = 'SI8 Reviewer Manual v0.1'`)
    expect(await run(admin, APPLY_06)).toEqual({ x1p_result: '20261106000000 COMMITTED' })
  })

  test('a failed post-check commits nothing and sends no schema-cache NOTIFY; the real apply then notifies once', async () => {
    await productionWithE4()
    const listener = await connect()
    const heard: Notification[] = []
    listener.on('notification', (n) => heard.push(n))
    await listener.query('LISTEN pgrst')
    // Tamper only the EXPECTED status result inside the embedded 06 check (quoted literal), not the migration.
    const tampered = APPLY_06.split("max_new_runs integer, grant_kind text)'").join("max_new_runs integer, grant_kind text, x int)'")
    expect(tampered).not.toBe(APPLY_06)
    expect(await refusedAndRolledBack(tampered)).toMatch(/^X1P post-check failed; nothing is committed: .*"status_function_result"/)
    await listener.query('SELECT 1')
    expect(heard).toHaveLength(0)
    expect(await run(admin, APPLY_06)).toEqual({ x1p_result: '20261106000000 COMMITTED' })
    await listener.query('SELECT 1')
    expect(heard.map((n) => [n.channel, n.payload])).toEqual([['pgrst', 'reload schema']])
  })

  test('06 fails on integrity deviations (each alone, rolled back) and reports unrelated drift without failing', async () => {
    await productionWithE4()
    expect(await run(admin, APPLY_06)).toEqual({ x1p_result: '20261106000000 COMMITTED' })
    const cases: [string, string, 'fail' | 'report'][] = [
      ['grant_kind default changed', `ALTER TABLE ${GRANTS} ALTER COLUMN grant_kind SET DEFAULT 'customer_path_uat'`, 'fail'],
      ['kind CHECK dropped', `ALTER TABLE ${GRANTS} DROP CONSTRAINT creator_record_v2_examination_uat_grants_kind_check`, 'fail'],
      ['run authority constraint widened', `ALTER TABLE public.creator_record_v2_examination_runs DROP CONSTRAINT creator_record_v2_examination_runs_authority_check, ADD CONSTRAINT creator_record_v2_examination_runs_authority_check CHECK (environment_project_ref ~ '^[a-z0-9]{20}$' AND execution_boundary LIKE '%customer_path_synthetic_uat%' OR true)`, 'fail'],
      ['a replaced function body changed', `CREATE OR REPLACE FUNCTION public.creator_record_v2_documents_seed_binding() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $f$ BEGIN RETURN NEW; END $f$`, 'fail'],
      ['anon EXECUTE on the status function', 'GRANT EXECUTE ON FUNCTION public.creator_record_v2_examination_uat_status(text) TO anon', 'fail'],
      ['service_role SELECT on grants', `GRANT SELECT ON ${GRANTS} TO service_role`, 'fail'],
      ['an extra column on grants', `ALTER TABLE ${GRANTS} ADD COLUMN extra text`, 'report'],
    ]
    const outcomes: string[] = []
    for (const [name, ddl] of cases) {
      await admin.query('BEGIN')
      try {
        await admin.query(ddl)
        const v = await verify('06')
        outcomes.push(`${name}: ${!v.all_pass ? 'fail' : Object.values(v.drift).some((x) => x.length) ? 'report' : 'unnoticed'}`)
      } finally {
        await admin.query('ROLLBACK')
      }
    }
    expect(outcomes).toEqual(cases.map(([n, , o]) => `${n}: ${o}`))
    expect(await verify('06')).toMatchObject({ all_pass: true, drift: NO_DRIFT })
  })

  test('06 never errors in any state: absent on DOC-1 and on 20261105, applied after 05', async () => {
    await admin.query('DROP SCHEMA IF EXISTS public CASCADE')
    await admin.query('CREATE SCHEMA public')
    await admin.query(readFileSync(join(__dirname, 'bootstrap.sql'), 'utf8'))
    await admin.query('DROP SCHEMA IF EXISTS storage CASCADE')
    await admin.query('CREATE SCHEMA storage; CREATE TABLE storage.buckets (id text PRIMARY KEY, name text NOT NULL, public boolean, file_size_limit bigint, allowed_mime_types text[])')
    for (const m of DOC1_CHAIN) await admin.query(readFileSync(m, 'utf8'))
    expect(await verify('06')).toMatchObject({ state: 'absent', all_pass: false })
    await productionWithE4()
    expect(await verify('06')).toMatchObject({ state: 'absent', all_pass: false })
  })

  describe('the E4 fingerprint: anything more, less or different refuses before any change', () => {
    test('an additional revoked grant (no document)', async () => {
      await productionWithE4()
      await admin.query(`INSERT INTO ${GRANTS} (test_user_id, document_sha256, supabase_project_ref, binding_nonce_sha256, established_by, reason, change_ref, expires_at, max_read_events)
                         VALUES ($1, $2, $3, $4, 'x', 'y', 'z', now() + interval '1 hour', 1)`, [await freshUser(), F.sha256, PROD_REF, sha(randomUUID())])
      await admin.query(`UPDATE ${GRANTS} SET revoked_at = now(), revoked_by = 'x', revoke_reason = 'y' WHERE revoked_at IS NULL`)
      expect(await refusedAndRolledBack(APPLY_06)).toBe('X1P refused: the UAT grants are not exactly the revoked E4 grant')
    })

    test('an additional seeded document (under its own revoked grant)', async () => {
      await productionWithE4()
      await operatorFlow(await freshUser(), false)
      expect(await refusedAndRolledBack(APPLY_06)).toBe('X1P refused: the documents are not exactly the E4 seeded document')
    })

    test('an additional examination access event (FORCED past the guard; nothing else differs)', async () => {
      await productionWithE4()
      await admin.query('BEGIN')
      await admin.query('ALTER TABLE public.creator_record_v2_evidence_access_log DISABLE TRIGGER USER')
      await admin.query(`INSERT INTO public.creator_record_v2_evidence_access_log (document_id, actor_user_id, actor_role, purpose) VALUES ($1, $2, 'owner', 'examination')`, [E4X.document_id, E4X.test_user_id])
      await admin.query('ALTER TABLE public.creator_record_v2_evidence_access_log ENABLE TRIGGER USER')
      await admin.query('COMMIT')
      expect(await refusedAndRolledBack(APPLY_06)).toBe('X1P refused: the examination access events are not exactly the E4 event')
    })

    test('an additional examination run (a second, complete operator UAT)', async () => {
      await productionWithE4()
      await operatorFlow(await freshUser(), true)
      expect(await refusedAndRolledBack(APPLY_06)).toBe('X1P refused: the examination runs are not exactly the E4 run')
    })

    test('a different but otherwise E4-shaped history (other identity, grant, document and run)', async () => {
      await production()
      await operatorFlow(await freshUser(), true)
      expect(await verify('02')).toMatchObject({ failed: E4_02 })
      expect(await verify('04')).toMatchObject({ failed: E4_04 })
      expect(await refusedAndRolledBack(APPLY_06)).toBe('X1P refused: the examination runs are not exactly the E4 run')
    })

    test('a database without the approved E4 history', async () => {
      await production()
      expect(await refusedAndRolledBack(APPLY_06)).toBe('X1P refused: the examination runs are not exactly the E4 run')
    })

    test('the post-check repeats the fingerprint: if the E4 rows did not read exactly as expected after the migration, nothing commits', async () => {
      await productionWithE4()
      // Tamper only the post-check's expected grant kind (the pre-check has no grant_kind clause).
      const tampered = APPLY_06.split("AND g.grant_kind = 'operator_seed'").join("AND g.grant_kind = 'customer_path_uat'")
      expect(tampered.split("g.grant_kind = 'customer_path_uat'").length - 1).toBe(1)
      expect(await refusedAndRolledBack(tampered)).toBe('X1P post-check failed; nothing is committed: the UAT grants are not exactly the revoked E4 grant')
    })

    test('the E4 grant with a different recorded value (created_at), everything else exact', async () => {
      await productionWithE4()
      await admin.query('BEGIN')
      await admin.query(`ALTER TABLE ${GRANTS} DISABLE TRIGGER USER`)
      await admin.query(`UPDATE ${GRANTS} SET created_at = created_at + interval '1 second'`)
      await admin.query(`ALTER TABLE ${GRANTS} ENABLE TRIGGER USER`)
      await admin.query('COMMIT')
      expect(await refusedAndRolledBack(APPLY_06)).toBe('X1P refused: the UAT grants are not exactly the revoked E4 grant')
    })
  })

  test('ROLLBACK (documented limits): with only operator_seed history, rollback_20261106 + 20261105 in one transaction restores the pre-05 state with E4 intact', async () => {
    await productionWithE4()
    const before = await e4Rows()
    const v04 = await verify('04')
    expect(await run(admin, APPLY_06)).toEqual({ x1p_result: '20261106000000 COMMITTED' })
    await admin.query('BEGIN')
    await admin.query(readFileSync(join(OPERATOR, 'rollback_20261106.sql'), 'utf8'))
    await admin.query(readFileSync(join(MIG, '20261105000000_creator_record_v2_operator_synthetic_uat.sql'), 'utf8'))
    await admin.query('COMMIT')
    expect((await verify('06')).state).toBe('absent')
    expect(await verify('04')).toEqual(v04)
    expect(await verify('02')).toMatchObject({ failed: E4_02 })
    expect(await e4Rows()).toEqual(before)
    // Forward again through the pack.
    expect(await run(admin, APPLY_06)).toEqual({ x1p_result: '20261106000000 COMMITTED' })
  })
})
