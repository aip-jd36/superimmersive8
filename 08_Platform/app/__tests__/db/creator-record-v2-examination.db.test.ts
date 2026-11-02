/**
 * CR-V2-DOC-2C-B — real PostgreSQL tests for 20261104000000_creator_record_v2_examination_runs.sql, applied verbatim
 * after the payment ledger, artifacts, M2, M3 and DOC-1 migrations (deploy order).
 *
 * Envelopes are produced by the committed DOC-2B core (`examineDocument`, receipt profile, replay executor) on
 * deterministic stand-in bytes, then REBOUND to the real committed fixture fingerprint and size with the committed
 * `examinationKey` (the generated fixture files are git-ignored). Every rebound envelope is re-checked by the
 * committed strict parser. What this suite proves is the DATABASE contract; TypeScript behaviour is proved by
 * __tests__/creator-record/examination-foundation.test.ts.
 *
 * The superuser `admin` connection stands in for the database operator. Disposable local `si8_test_*` database
 * only. Skipped without DATABASE_URL_TEST (required in CI).
 */
import { readFileSync } from 'fs'
import { join } from 'path'
import { createHash, randomUUID } from 'crypto'
import { Client } from 'pg'
import { parseExaminationEnvelope, type ExaminationEnvelope } from '@/lib/creator-record/examination/envelope'
import { examineDocument, examinationKey } from '@/lib/creator-record/examination/examine-document'
import { buildProfileRegistry, type ExaminationProfile } from '@/lib/creator-record/examination/profile'
import { RECEIPT_PROFILE } from '@/lib/creator-record/examination/receipt-profile'
import { knownFixtureRegistry, replayExecutor } from '@/lib/creator-record/examination/replay-executor'
import { buildReplayTable, type ReplayFixture } from '@/lib/creator-record/evidence/replay'
import { REPLAY_FIXTURES } from '@/lib/creator-record/evidence/replay-fixtures.data'
import { canonicalJson, sha256Hex } from '@/lib/creator-record/record-core/canonical'

const URL = process.env.DATABASE_URL_TEST
const DIR = join(__dirname, '..', '..', 'supabase', 'migrations')
const PRIOR = [
  '20261021000000_payment_fulfillments.sql',
  '20261022000000_payment_zero_total_paid.sql',
  '20261028000000_creator_record_artifacts.sql',
  '20261101000000_creator_record_v2_prepared.sql',
  '20261102000000_creator_record_v2_submission_binding.sql',
  '20261103000000_creator_record_v2_evidence.sql',
].map((f) => join(DIR, f))
const MIGRATION = join(DIR, '20261104000000_creator_record_v2_examination_runs.sql')
const BOOTSTRAP = join(__dirname, 'bootstrap.sql')
const PROD_REF = 'lehqgcgnenwdmuzudbrs'
const TEST_REF = 'localpg15examination'

/** The exact rollback statements of the runbook (guarded). */
const ROLLBACK = `
DO $guard$
BEGIN
  IF EXISTS (SELECT 1 FROM public.creator_record_v2_examination_runs)
     OR EXISTS (SELECT 1 FROM public.creator_record_v2_evidence_access_log WHERE purpose <> 'file_download') THEN
    RAISE EXCEPTION 'DOC-2C rollback refused: examination history exists' USING ERRCODE = 'P0001';
  END IF;
END
$guard$;
DROP FUNCTION IF EXISTS public.creator_record_v2_record_examination(bigint, text);
DROP TABLE IF EXISTS public.creator_record_v2_examination_runs;
DROP TABLE IF EXISTS public.creator_record_v2_synthetic_fixtures;
DROP TABLE IF EXISTS public.creator_record_v2_examination_environment;
DROP FUNCTION IF EXISTS public.creator_record_v2_examination_environment_guard();
DROP FUNCTION IF EXISTS public.creator_record_v2_examination_append_only_guard();
DROP TRIGGER IF EXISTS creator_record_v2_evidence_access_log_insert_guard ON public.creator_record_v2_evidence_access_log;
DROP FUNCTION IF EXISTS public.creator_record_v2_evidence_access_log_insert_guard();
DROP FUNCTION IF EXISTS public.creator_record_v2_jsonb_exact_keys(jsonb, text[]);
ALTER TABLE public.creator_record_v2_evidence_access_log DROP CONSTRAINT IF EXISTS creator_record_v2_evidence_access_log_purpose_check;
ALTER TABLE public.creator_record_v2_evidence_access_log DROP COLUMN IF EXISTS purpose;`

function assertDisposable(url: string) {
  const u = new globalThis.URL(url)
  const db = u.pathname.replace(/^\//, '')
  if (!db.startsWith('si8_test_')) throw new Error(`refusing to run: database "${db}" is not si8_test_*`)
  if (!['localhost', '127.0.0.1', '::1', '[::1]'].includes(u.hostname)) throw new Error(`refusing to run: host "${u.hostname}" is not a local disposable database`)
}
if (process.env.CI && !URL) throw new Error('DATABASE_URL_TEST is required in CI — the creator record v2 examination DB suite must not be skipped')
const maybe = URL ? describe : describe.skip

const fail = async (p: Promise<unknown>): Promise<{ code: string; message: string }> => {
  try {
    await p
    return { code: 'no error', message: '' }
  } catch (e) {
    return { code: (e as { code?: string }).code ?? 'unknown', message: (e as Error).message }
  }
}
const sha = (b: Uint8Array | string) => createHash('sha256').update(b).digest('hex')
const FIX = (id: string) => REPLAY_FIXTURES.find((f) => f.fixture_id === id)!
type Env = ExaminationEnvelope

function standIn(id: string, media: string): Uint8Array {
  const tag = Buffer.from(`synthetic-test:${id}`)
  if (media === 'application/pdf') return new Uint8Array(Buffer.from(`%PDF-1.4\n%synthetic-test:${id}\n%%EOF\n`))
  if (media === 'image/png') return new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, ...tag])
  return new Uint8Array([0xff, 0xd8, 0xff, ...tag])
}

/** Recompute the key and observation ids after changing a key field (forgery tests that must pass the key check). */
function rekey(env: Env): Env {
  const key = examinationKey({ document_id: env.document.document_id, sha256: env.document.sha256, profile: env.profile, executor: env.executor })
  const p = key.slice(0, 16)
  return { ...env, examination_key: key, observations: env.observations.map((o) => ({ ...o, observation_id: p + o.observation_id.slice(16), source: { document_sha256: env.document.sha256, location: null } })) }
}

/** A real v2 envelope from the committed core, rebound to the committed fixture fingerprint and size. */
async function envelopeFor(fixture: ReplayFixture, documentId: string, ownerId: string, profile: ExaminationProfile = RECEIPT_PROFILE, parsedOutput?: unknown): Promise<Env> {
  const bytes = standIn(fixture.fixture_id, fixture.media_type)
  const table = buildReplayTable([{ ...fixture, sha256: sha(bytes), parsed_output: parsedOutput === undefined ? fixture.parsed_output : parsedOutput }])
  const r = await examineDocument(
    {
      documents: {
        get: async () => ({ id: documentId, user_id: ownerId, sha256: sha(bytes), media_type: fixture.media_type as Env['document']['media_type'], byte_size: bytes.length, state: 'stored' }),
        readBytes: async () => bytes,
      },
      fixtures: knownFixtureRegistry(table),
      executor: replayExecutor(table),
      profiles: buildProfileRegistry([profile]),
    },
    { actor_user_id: ownerId, document_id: documentId, profile: { id: profile.ref.id, version: profile.ref.version } },
  )
  if (r.kind !== 'envelope') throw new Error(`core refused: ${r.stage}/${r.code}`)
  const env = rekey({ ...r.envelope, document: { ...r.envelope.document, sha256: fixture.sha256, byte_size: fixture.bytes! } })
  if (!parseExaminationEnvelope(env)) throw new Error('rebound envelope fails the committed parser')
  return env
}
const text = (env: unknown) => canonicalJson(env)
const v = (version: number, over: Partial<ExaminationProfile> = {}): ExaminationProfile => ({ ...RECEIPT_PROFILE, ref: { ...RECEIPT_PROFILE.ref, version }, ...over })
const FAILING = (version: number) => v(version, { readRecorded: async () => ({ status: 'could_not_examine', reason: 'schema_invalid', engine_attempts: 1 }) })

maybe('creator record v2 examination runs (PostgreSQL)', () => {
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
  async function user() {
    const id = randomUUID()
    await admin.query('INSERT INTO public.users (id, email, name) VALUES ($1, $2, $3)', [id, `${id}@example.test`, 'Tester'])
    return id
  }
  async function storedDoc(userId: string, fixture: Pick<ReplayFixture, 'sha256' | 'media_type' | 'bytes'>) {
    const id = randomUUID()
    await svc.query(
      `INSERT INTO public.creator_record_v2_documents (id, user_id, sha256, media_type, byte_size, file_name, storage_path, consent_version, state)
       VALUES ($1, $2, $3, $4, $5, 'receipt', $6, 'DRAFT-UNAPPROVED-test', 'pending')`,
      [id, userId, fixture.sha256, fixture.media_type, fixture.bytes, `${userId}/${id}`],
    )
    await svc.query(`UPDATE public.creator_record_v2_documents SET state = 'stored', stored_at = now() WHERE id = $1`, [id])
    return id
  }
  const logRead = async (c: Client, docId: string, actor: string, opts: { role?: string; purpose?: string; at?: string } = {}) =>
    Number((await c.query(
      `INSERT INTO public.creator_record_v2_evidence_access_log (document_id, actor_user_id, actor_role, purpose${opts.at ? ', accessed_at' : ''})
       VALUES ($1, $2, $3, $4${opts.at ? ', $5' : ''}) RETURNING id`,
      opts.at ? [docId, actor, opts.role ?? 'owner', opts.purpose ?? 'examination', opts.at] : [docId, actor, opts.role ?? 'owner', opts.purpose ?? 'examination'],
    )).rows[0].id)
  const record = async (c: Client, logId: number, envText: string) => (await c.query('SELECT run_id, result FROM public.creator_record_v2_record_examination($1, $2)', [logId, envText])).rows[0] as { run_id: string; result: string }
  const establish = (ref = TEST_REF) => admin.query(
    `INSERT INTO public.creator_record_v2_examination_environment (environment_kind, supabase_project_ref, established_by, reason) VALUES ('isolated_synthetic_test', $1, 'db test operator', 'isolated local PostgreSQL 15 test')`, [ref])
  const runCount = async () => Number((await admin.query('SELECT count(*) n FROM public.creator_record_v2_examination_runs')).rows[0].n)
  /** One owner, one stored fixture document, a logged read and the envelope, ready to record. */
  async function ready(fixture = REPLAY_FIXTURES[0], profile: ExaminationProfile = RECEIPT_PROFILE) {
    const owner = await user()
    const docId = await storedDoc(owner, fixture)
    const env = await envelopeFor(fixture, docId, owner, profile)
    return { owner, docId, env, log: async () => logRead(svc, docId, owner) }
  }

  async function freshSchema() {
    await admin.query('DROP SCHEMA IF EXISTS public CASCADE')
    await admin.query('CREATE SCHEMA public')
    await admin.query(readFileSync(BOOTSTRAP, 'utf8'))
    await admin.query('DROP SCHEMA IF EXISTS storage CASCADE')
    await admin.query('CREATE SCHEMA storage; CREATE TABLE storage.buckets (id text PRIMARY KEY, name text NOT NULL, public boolean, file_size_limit bigint, allowed_mime_types text[])')
    for (const m of PRIOR) await admin.query(readFileSync(m, 'utf8'))
    await admin.query(readFileSync(MIGRATION, 'utf8'))
  }

  beforeAll(async () => {
    assertDisposable(URL as string)
    admin = new Client({ connectionString: URL })
    await admin.connect()
    await freshSchema()
    svc = await connect('service_role')
  })
  afterAll(async () => {
    for (const c of extra) await c.end().catch(() => undefined)
    await admin?.end()
  })

  test('PostgreSQL 15; every committed fixture has a size; the migration re-applies idempotently', async () => {
    expect((await admin.query('SHOW server_version')).rows[0].server_version).toMatch(/^15\./)
    expect(REPLAY_FIXTURES.every((f) => typeof f.bytes === 'number' && f.bytes > 0 && f.bytes <= 4194304)).toBe(true)
    await admin.query(readFileSync(MIGRATION, 'utf8'))
    expect(Number((await admin.query('SELECT count(*) n FROM public.creator_record_v2_synthetic_fixtures')).rows[0].n)).toBe(45)
    expect(Number((await admin.query('SELECT count(*) n FROM public.creator_record_v2_examination_environment')).rows[0].n)).toBe(0)
  })

  describe('privileges, RLS, SECURITY DEFINER', () => {
    const TABLES = ['creator_record_v2_examination_environment', 'creator_record_v2_synthetic_fixtures', 'creator_record_v2_examination_runs']
    const PRIVS = ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER']
    const has = async (role: string, table: string, p: string) => (await admin.query('SELECT has_table_privilege($1, $2, $3) ok', [role, `public.${table}`, p])).rows[0].ok as boolean

    test('RLS on, no policies; anon, authenticated and PUBLIC hold nothing; service_role reads fixtures and runs only; the marker is invisible to it', async () => {
      for (const t of TABLES) {
        expect((await admin.query('SELECT relrowsecurity r FROM pg_class WHERE oid = $1::regclass', [`public.${t}`])).rows[0].r).toBe(true)
        expect(Number((await admin.query(`SELECT count(*) n FROM pg_policies WHERE schemaname = 'public' AND tablename = $1`, [t])).rows[0].n)).toBe(0)
        for (const role of ['anon', 'authenticated', 'public']) for (const p of PRIVS) expect(await has(role, t, p)).toBe(false)
      }
      for (const p of PRIVS) expect(await has('service_role', 'creator_record_v2_examination_environment', p)).toBe(false)
      for (const t of TABLES.slice(1)) for (const p of PRIVS) expect(await has('service_role', t, p)).toBe(p === 'SELECT')
      for (const role of ['anon', 'authenticated'] as const) {
        const c = await connect(role)
        for (const t of TABLES) expect((await fail(c.query(`SELECT 1 FROM public.${t}`))).code).toBe('42501')
      }
    })

    test('function EXECUTE: only the write function, only to service_role; definer functions pin search_path and are owned by the table owner', async () => {
      const fns = ['creator_record_v2_record_examination(bigint, text)', 'creator_record_v2_evidence_access_log_insert_guard()', 'creator_record_v2_examination_environment_guard()', 'creator_record_v2_examination_append_only_guard()', 'creator_record_v2_jsonb_exact_keys(jsonb, text[])']
      for (const f of fns) for (const role of ['public', 'anon', 'authenticated', 'service_role']) {
        const ok = (await admin.query('SELECT has_function_privilege($1, $2, $3) ok', [role, `public.${f}`, 'EXECUTE'])).rows[0].ok
        expect([f, role, ok]).toEqual([f, role, f.startsWith('creator_record_v2_record_examination') && role === 'service_role'])
      }
      const rows = (await admin.query(`SELECT proname, prosecdef, proconfig, pg_get_userbyid(proowner) owner FROM pg_proc WHERE pronamespace = 'public'::regnamespace AND proname IN ('creator_record_v2_record_examination', 'creator_record_v2_evidence_access_log_insert_guard') ORDER BY proname`)).rows
      const tableOwner = (await admin.query(`SELECT pg_get_userbyid(relowner) o FROM pg_class WHERE oid = 'public.creator_record_v2_examination_runs'::regclass`)).rows[0].o
      expect(rows).toHaveLength(2)
      for (const r of rows) expect([r.proname, r.prosecdef, r.proconfig, r.owner]).toEqual([r.proname, true, ['search_path=public, pg_temp'], tableOwner])
      expect((await fail(svc.query(`SELECT public.creator_record_v2_jsonb_exact_keys('{}'::jsonb, ARRAY['a'])`))).code).toBe('42501')
    })
  })

  describe('operator-controlled environment marker', () => {
    test('absent after migration; service_role can neither read, establish, edit, remove nor truncate it', async () => {
      expect(Number((await admin.query('SELECT count(*) n FROM public.creator_record_v2_examination_environment')).rows[0].n)).toBe(0)
      for (const q of [
        'SELECT * FROM public.creator_record_v2_examination_environment',
        `INSERT INTO public.creator_record_v2_examination_environment (environment_kind, supabase_project_ref, established_by, reason) VALUES ('isolated_synthetic_test', '${TEST_REF}', 'x', 'y')`,
        `UPDATE public.creator_record_v2_examination_environment SET reason = 'x'`,
        'DELETE FROM public.creator_record_v2_examination_environment',
        'TRUNCATE public.creator_record_v2_examination_environment',
      ]) expect((await fail(svc.query(q))).code).toBe('42501')
    })

    test('the operator cannot name the Production project, a malformed ref, another kind, or a second marker; the marker cannot be edited, only removed', async () => {
      expect((await fail(establish(PROD_REF))).code).toBe('23514')
      expect((await fail(establish('Not-A-Ref'))).code).toBe('23514')
      expect((await fail(admin.query(`INSERT INTO public.creator_record_v2_examination_environment (environment_kind, supabase_project_ref, established_by, reason) VALUES ('production', '${TEST_REF}', 'x', 'y')`))).code).toBe('23514')
      await establish()
      expect((await fail(establish('anotherlocalref00000'))).code).toBe('23505')
      expect((await fail(admin.query(`UPDATE public.creator_record_v2_examination_environment SET supabase_project_ref = '${PROD_REF}'`))).code).toBe('P0001')
      await admin.query('DELETE FROM public.creator_record_v2_examination_environment')
      expect(Number((await admin.query('SELECT count(*) n FROM public.creator_record_v2_examination_environment')).rows[0].n)).toBe(0)
    })

    test('without the marker: examination reads and writes fail closed; download logging is untouched', async () => {
      const { owner, docId, env } = await ready(FIX('pdf-pika-pro-no-period'))
      const r1 = await fail(logRead(svc, docId, owner))
      expect([r1.code, r1.message]).toEqual(['P0001', 'examination reads are not authorized in this environment'])
      const dl = await logRead(svc, docId, owner, { purpose: 'file_download' })
      const r2 = await fail(record(svc, dl, text(env)))
      expect([r2.code, r2.message]).toEqual(['P0001', 'examination_environment_not_authorized'])
      expect(await runCount()).toBe(0)
    })

    test('a session-local shadow of the marker (pg_temp) or of the helper cannot establish authority (pinned search_path, qualified names)', async () => {
      const c = await connect('service_role')
      await c.query(`CREATE TEMP TABLE creator_record_v2_examination_environment (singleton boolean, environment_kind text, supabase_project_ref text, established_by text, reason text, established_at timestamptz)`)
      await c.query(`INSERT INTO pg_temp.creator_record_v2_examination_environment VALUES (true, 'isolated_synthetic_test', '${TEST_REF}', 'x', 'y', now())`)
      await c.query(`CREATE FUNCTION pg_temp.creator_record_v2_jsonb_exact_keys(jsonb, text[]) RETURNS boolean LANGUAGE sql AS 'SELECT true'`)
      const { owner, docId, env } = await ready(FIX('pdf-kling-pro-monthly'))
      expect((await fail(logRead(c, docId, owner))).message).toBe('examination reads are not authorized in this environment')
      const dl = await logRead(c, docId, owner, { purpose: 'file_download' })
      expect((await fail(record(c, dl, text(env)))).message).toBe('examination_environment_not_authorized')
    })
  })

  describe('with an isolated environment established', () => {
    beforeAll(async () => {
      await establish()
    })

    test('all 45 committed fixtures persist; every derived column, the envelope digest and the DB-recomputed key agree with the committed code', async () => {
      for (const fixture of REPLAY_FIXTURES) {
        const { env, log } = await ready(fixture)
        const t = text(env)
        const res = await record(svc, await log(), t)
        expect(res.result).toBe('created')
        const row = (await admin.query('SELECT * FROM public.creator_record_v2_examination_runs WHERE id = $1', [res.run_id])).rows[0]
        expect({
          key: row.examination_key, doc: row.document_id, sha: row.document_sha256, ev: row.envelope_version, cc: row.content_class, wa: row.workflow_authorization,
          eb: row.execution_boundary, ref: row.environment_project_ref, pid: row.profile_id, pv: row.profile_version, sv: row.schema_version, pr: row.prompt_version,
          em: row.executor_mode, rs: row.replay_set, rec: row.recording_sha256, fx: row.replay_fixture_id, os: row.outcome_status, or: row.outcome_reason, sup: row.supersedes_id,
        }).toEqual({
          key: env.examination_key, doc: env.document.document_id, sha: fixture.sha256, ev: 2, cc: 'known_synthetic_fixture', wa: 'not_established',
          eb: 'isolated_synthetic_test', ref: TEST_REF, pid: 'receipt', pv: 1, sv: 'receipt-extraction-v2', pr: 'receipt-prompt-v2',
          em: 'fixture_replay', rs: env.executor.replay_set, rec: sha256Hex(canonicalJson(fixture.parsed_output)), fx: fixture.fixture_id, os: 'examined', or: null, sup: null,
        })
        expect(row.envelope_canonical).toBe(t)
        expect(row.envelope_sha256).toBe(sha256Hex(t))
        const back = parseExaminationEnvelope(JSON.parse(row.envelope_canonical))
        expect(back).not.toBeNull()
        expect(canonicalJson(back)).toBe(row.envelope_canonical)
      }
      expect(await runCount()).toBe(45)
    })

    test('a key the database does not recompute is refused (examination_key_mismatch)', async () => {
      const { env, log } = await ready(FIX('pdf-runway-standard-monthly'))
      for (const forged of ['0'.repeat(64), env.examination_key.slice(0, 63) + (env.examination_key.endsWith('0') ? '1' : '0')]) {
        const bad = { ...env, examination_key: forged, observations: env.observations.map((o) => ({ ...o, observation_id: forged.slice(0, 16) + o.observation_id.slice(16) })) }
        expect((await fail(record(svc, await log(), text(bad)))).message).toBe('examination_key_mismatch')
      }
    })

    describe('envelope v2 parser parity: every rule refused by the database AND by the committed parser', () => {
      const mutations: [string, (e: Env) => unknown][] = [
        ['a missing top-level key', (e) => { const { limitations: _l, ...r } = e; return r }],
        ['an extra top-level key', (e) => ({ ...e, extra: 1 })],
        ['the legacy authority field', (e) => ({ ...e, authority_class: 'synthetic_test' })],
        ['an established workflow authorization', (e) => ({ ...e, workflow_authorization: 'established' })],
        ['a customer content class', (e) => ({ ...e, content_class: 'customer' })],
        ['envelope v1', (e) => ({ ...e, envelope: { ...e.envelope, version: 1 } })],
        ['a wrong envelope id', (e) => ({ ...e, envelope: { ...e.envelope, id: 'x' } })],
        ['an extra executor key', (e) => ({ ...e, executor: { ...e.executor, model: 'm' } })],
        ['a live executor', (e) => ({ ...e, executor: { ...e.executor, mode: 'live_model' } })],
        ['a malformed recording digest', (e) => ({ ...e, executor: { ...e.executor, recording_sha256: 'x' } })],
        ['a fractional profile version', (e) => ({ ...e, profile: { ...e.profile, version: 1.5 } })],
        ['a string profile version', (e) => ({ ...e, profile: { ...e.profile, version: '1' } })],
        ['an extra profile key', (e) => ({ ...e, profile: { ...e.profile, extra: true } })],
        ['an extra document key', (e) => ({ ...e, document: { ...e.document, file_name: 'x' } })],
        ['an unsupported media type', (e) => ({ ...e, document: { ...e.document, media_type: 'text/html' } })],
        ['a string byte size', (e) => ({ ...e, document: { ...e.document, byte_size: String(e.document.byte_size) } })],
        ['model calls', (e) => ({ ...e, provenance: { ...e.provenance, model_calls: 1 } })],
        ['a sent prompt', (e) => ({ ...e, provenance: { ...e.provenance, prompt_sent: true } })],
        ['an extra provenance key', (e) => ({ ...e, provenance: { ...e.provenance, verified_by: 'x' } })],
        ['examined with a reason', (e) => ({ ...e, outcome: { status: 'examined', reason: 'schema_invalid' } })],
        ['could_not_examine with observations', (e) => ({ ...e, outcome: { status: 'could_not_examine', reason: 'schema_invalid' } })],
        ['an unknown failure reason', (e) => ({ ...e, outcome: { status: 'could_not_examine', reason: 'other' }, observations: [] })],
        ['a verified observation', (e) => ({ ...e, observations: e.observations.map((o, i) => (i === 0 ? { ...o, verification: 'verified' } : o)) })],
        ['a live-origin observation', (e) => ({ ...e, observations: e.observations.map((o, i) => (i === 0 ? { ...o, origin: 'live_model' } : o)) })],
        ['an extra observation key', (e) => ({ ...e, observations: e.observations.map((o, i) => (i === 0 ? { ...o, confidence: 0.9 } : o)) })],
        ['an observation for another document', (e) => ({ ...e, observations: e.observations.map((o, i) => (i === 0 ? { ...o, source: { document_sha256: 'f'.repeat(64), location: null } } : o)) })],
        ['an observation location', (e) => ({ ...e, observations: e.observations.map((o, i) => (i === 0 ? { ...o, source: { ...o.source, location: { page: 1 } } } : o)) })],
        ['a value without status present', (e) => ({ ...e, observations: e.observations.map((o) => (o.field === 'issuer_name' ? { ...o, status: 'not_shown' } : o)) })],
        ['an observation id not prefixed by the key', (e) => ({ ...e, observations: e.observations.map((o, i) => (i === 0 ? { ...o, observation_id: '0'.repeat(16) + o.observation_id.slice(16) } : o)) })],
        ['an unknown limitation', (e) => ({ ...e, limitations: [...e.limitations, 'cleared'] })],
        ['a duplicated limitation', (e) => ({ ...e, limitations: [...e.limitations, e.limitations[0]] })],
        ['a missing base limitation', (e) => ({ ...e, limitations: e.limitations.filter((l) => l !== 'observations_not_verified') })],
        ['observations not an array', (e) => ({ ...e, observations: {} })],
      ]
      test.each(mutations)('%s', async (_n, mutate) => {
        const { env, log } = await ready(FIX('pdf-midjourney-standard-annual'))
        const bad = mutate(env)
        expect(parseExaminationEnvelope(bad)).toBeNull()
        const r = await fail(record(svc, await log(), text(bad)))
        expect([r.code, r.message]).toEqual(['P0001', 'examination_envelope_invalid'])
      })

      test.each([
        ['not JSON', '{"envelope":'],
        ['a JSON array', '[]'],
        ['a JSON string', '"x"'],
        ['a NUL escape (jsonb refuses \\u0000)', '{"a":"\\u0000"}'],
        ['deep nesting', '['.repeat(100000) + ']'.repeat(100000)],
        ['over the size bound', '{"a":"' + 'x'.repeat(262200) + '"}'],
        ['empty', ''],
      ])('malicious or malformed text: %s', async (_n, raw) => {
        const { log } = await ready(FIX('pdf-midjourney-standard-annual'))
        const r = await fail(record(svc, await log(), raw))
        expect([r.code, r.message]).toEqual(['P0001', 'examination_envelope_invalid'])
      })
    })

    describe('content recognition: committed fixture bytes, set, id and recording (never authority)', () => {
      test('a forged fixture id, recording digest or replay set, or an altered recorded output, is refused', async () => {
        const fixture = FIX('shot-runway-billing-history')
        const { owner, docId, env, log } = await ready(fixture)
        const forged = [
          { ...env, provenance: { ...env.provenance, replay_fixture_id: 'pdf-pika-pro-no-period' } },
          rekey({ ...env, executor: { ...env.executor, recording_sha256: 'a'.repeat(64) } }),
          rekey({ ...env, executor: { ...env.executor, replay_set: 'receipt-fixtures-v3/oracle-replay' } }),
          await envelopeFor(fixture, docId, owner, RECEIPT_PROFILE, { ...(fixture.parsed_output as object), multiple_plans_shown: true }),
        ]
        for (const f of forged) expect((await fail(record(svc, await log(), text(f)))).message).toBe('examination_content_not_recognized')
      })

      test('bytes that are not a committed fixture are refused, even with a well-formed envelope bound to them', async () => {
        const fixture = FIX('pdf-elevenlabs-creator')
        const owner = await user()
        const foreign = { sha256: sha('not-a-fixture'), media_type: fixture.media_type, bytes: fixture.bytes }
        const docId = await storedDoc(owner, foreign)
        const env = rekey({ ...(await envelopeFor(fixture, docId, owner)), document: { document_id: docId, sha256: foreign.sha256, media_type: fixture.media_type as Env['document']['media_type'], byte_size: fixture.bytes! } })
        expect(parseExaminationEnvelope(env)).not.toBeNull()
        expect((await fail(record(svc, await logRead(svc, docId, owner), text(env)))).message).toBe('examination_content_not_recognized')
      })

      test('fixture recognition never yields workflow authority: every stored run says not_established', async () => {
        expect((await admin.query(`SELECT DISTINCT workflow_authorization w FROM public.creator_record_v2_examination_runs`)).rows).toEqual([{ w: 'not_established' }])
      })
    })

    describe('ownership, tenancy and document integrity', () => {
      test('another creator cannot log an examination read of, or record a run for, someone else’s document', async () => {
        const a = await ready(FIX('pdf-luma-plus-monthly'))
        const b = await user()
        expect((await fail(logRead(svc, a.docId, b))).message).toBe('an examination read is logged only for the owner of a stored document')
        const bDoc = await storedDoc(b, FIX('pdf-luma-plus-monthly'))
        const bLog = await logRead(svc, bDoc, b)
        expect((await fail(record(svc, bLog, text(a.env)))).message).toBe('examination_access_not_logged')
      })

      test('an admin-role or download-purpose read does not qualify', async () => {
        const { owner, docId, env } = await ready(FIX('pdf-luma-plus-monthly'))
        expect((await fail(logRead(svc, docId, owner, { role: 'admin' }))).message).toBe('an examination read is logged only for the owner of a stored document')
        expect((await fail(record(svc, await logRead(svc, docId, owner, { purpose: 'file_download' }), text(env)))).message).toBe('examination_access_not_logged')
      })

      test('size, type, a deleted document or a pending document do not match', async () => {
        const fixture = FIX('pdf-runway-unlimited-annual-with-tax')
        const { owner, docId, env, log } = await ready(fixture)
        for (const bad of [
          { ...env, document: { ...env.document, byte_size: env.document.byte_size + 1 } },
          { ...env, document: { ...env.document, media_type: env.document.media_type === 'image/png' ? 'image/jpeg' as const : 'image/png' as const } },
        ]) expect((await fail(record(svc, await log(), text(bad)))).message).toBe('examination_document_mismatch')
        const l = await log()
        await svc.query(`UPDATE public.creator_record_v2_documents SET state = 'deleted', deleted_at = now() WHERE id = $1`, [docId])
        expect((await fail(record(svc, l, text(env)))).message).toBe('examination_document_mismatch')
        expect((await fail(logRead(svc, docId, owner))).message).toBe('an examination read is logged only for the owner of a stored document')
        const pendingId = randomUUID()
        await svc.query(`INSERT INTO public.creator_record_v2_documents (id, user_id, sha256, media_type, byte_size, file_name, storage_path, consent_version, state) VALUES ($1, $2, $3, $4, $5, 'r', $6, 'c', 'pending')`, [pendingId, owner, fixture.sha256, fixture.media_type, fixture.bytes, `${owner}/${pendingId}`])
        expect((await fail(logRead(svc, pendingId, owner))).message).toBe('an examination read is logged only for the owner of a stored document')
      })
    })

    describe('audit-event correlation (not proof that bytes were read)', () => {
      test('no log, a reused log, an expired or a future-dated log does not qualify; examination rows carry server time', async () => {
        const { owner, docId, env, log } = await ready(FIX('pdf-higgsfield-day-month-format'))
        expect((await fail(record(svc, 999999999, text(env)))).message).toBe('examination_access_not_logged')
        const backdated = await logRead(svc, docId, owner, { at: '2001-01-01T00:00:00Z' })
        expect(Number((await admin.query(`SELECT extract(epoch FROM now() - accessed_at) s FROM public.creator_record_v2_evidence_access_log WHERE id = $1`, [backdated])).rows[0].s)).toBeLessThan(60)
        await admin.query('SET session_replication_role = replica')
        const old = Number((await admin.query(`INSERT INTO public.creator_record_v2_evidence_access_log (document_id, actor_user_id, actor_role, purpose, accessed_at) VALUES ($1, $2, 'owner', 'examination', now() - interval '16 minutes') RETURNING id`, [docId, owner])).rows[0].id)
        const future = Number((await admin.query(`INSERT INTO public.creator_record_v2_evidence_access_log (document_id, actor_user_id, actor_role, purpose, accessed_at) VALUES ($1, $2, 'owner', 'examination', now() + interval '1 hour') RETURNING id`, [docId, owner])).rows[0].id)
        await admin.query('SET session_replication_role = origin')
        expect((await fail(record(svc, old, text(env)))).message).toBe('examination_access_not_logged')
        expect((await fail(record(svc, future, text(env)))).message).toBe('examination_access_not_logged')
        const used = await log()
        expect((await record(svc, used, text(env))).result).toBe('created')
        const other = await envelopeFor(FIX('pdf-higgsfield-day-month-format'), docId, owner, v(2))
        expect((await fail(record(svc, used, text(other)))).message).toBe('examination_access_not_logged')
      })

      test('DOC-1 download rows are unchanged: default purpose, caller timestamp kept, admin role allowed, still append-only', async () => {
        const { owner, docId } = await ready(FIX('pdf-higgsfield-day-month-format'))
        const id = Number((await svc.query(`INSERT INTO public.creator_record_v2_evidence_access_log (document_id, actor_user_id, actor_role, accessed_at) VALUES ($1, $2, 'admin', '2001-01-01T00:00:00Z') RETURNING id`, [docId, owner])).rows[0].id)
        const row = (await admin.query('SELECT purpose, actor_role, accessed_at FROM public.creator_record_v2_evidence_access_log WHERE id = $1', [id])).rows[0]
        expect([row.purpose, row.actor_role, new Date(row.accessed_at).toISOString()]).toEqual(['file_download', 'admin', '2001-01-01T00:00:00.000Z'])
        expect((await fail(svc.query('UPDATE public.creator_record_v2_evidence_access_log SET purpose = $1 WHERE id = $2', ['examination', id]))).code).toBe('42501')
        expect((await fail(admin.query('UPDATE public.creator_record_v2_evidence_access_log SET purpose = $1 WHERE id = $2', ['examination', id]))).code).toBe('P0001')
        expect((await fail(svc.query(`INSERT INTO public.creator_record_v2_evidence_access_log (document_id, actor_user_id, actor_role, purpose) VALUES ($1, $2, 'owner', 'other')`, [docId, owner]))).code).toBe('23514')
      })

      test('FINDING (DOC-1, unchanged here): an operator DELETE on the access log is refused, but by a 42703 error in the shared guard, not its P0001', async () => {
        const { owner, docId } = await ready(FIX('pdf-higgsfield-day-month-format'))
        const id = await logRead(svc, docId, owner, { purpose: 'file_download' })
        const r = await fail(admin.query('DELETE FROM public.creator_record_v2_evidence_access_log WHERE id = $1', [id]))
        expect([r.code, r.message]).toEqual(['42703', 'record "old" has no field "prepared_id"'])
        expect(Number((await admin.query('SELECT count(*) n FROM public.creator_record_v2_evidence_access_log WHERE id = $1', [id])).rows[0].n)).toBe(1)
      })
    })

    describe('idempotency and conflicting writes', () => {
      test('the same envelope is idempotent; the same key with any different bytes is a conflict and never replaces the stored run', async () => {
        const { env, log } = await ready(FIX('photo-kling-dim'))
        const t = text(env)
        const a = await record(svc, await log(), t)
        const b = await record(svc, await log(), t)
        expect([a.result, b.result, b.run_id]).toEqual(['created', 'existing', a.run_id])
        for (const other of [JSON.stringify(env, null, 1), text({ ...env, provenance: { ...env.provenance, engine_attempts: 2 } })]) {
          expect((await fail(record(svc, await log(), other))).message).toBe('examination_key_conflict')
        }
        expect((await admin.query('SELECT envelope_canonical FROM public.creator_record_v2_examination_runs WHERE id = $1', [a.run_id])).rows[0].envelope_canonical).toBe(t)
      })

      test('concurrent identical writers converge on one run; concurrent conflicting writers never produce two', async () => {
        const { owner, docId, env } = await ready(FIX('photo-runway-rotated'))
        const t = text(env)
        const conns = await Promise.all(Array.from({ length: 8 }, () => connect('service_role')))
        const logs = await Promise.all(conns.map(() => logRead(svc, docId, owner)))
        const res = await Promise.all(conns.map((c, i) => record(c, logs[i], t)))
        expect(res.filter((r) => r.result === 'created')).toHaveLength(1)
        expect(new Set(res.map((r) => r.run_id)).size).toBe(1)
        const alt = text({ ...env, provenance: { ...env.provenance, engine_attempts: 3 } })
        const logs2 = await Promise.all(conns.map(() => logRead(svc, docId, owner)))
        const res2 = await Promise.all(conns.map((c, i) => fail(record(c, logs2[i], i % 2 ? alt : t))))
        expect(res2.every((r) => r.code === 'no error' || r.message === 'examination_key_conflict')).toBe(true)
        expect(Number((await admin.query('SELECT count(*) n FROM public.creator_record_v2_examination_runs WHERE document_id = $1', [docId])).rows[0].n)).toBe(1)
      })
    })

    describe('supersession: linear history, attempts versus successes', () => {
      const chain = async (docId: string) => (await admin.query(
        `WITH RECURSIVE c AS (SELECT r.*, 1 AS depth FROM public.creator_record_v2_examination_runs r WHERE document_id = $1 AND supersedes_id IS NULL
           UNION ALL SELECT r.*, c.depth + 1 FROM public.creator_record_v2_examination_runs r JOIN c ON r.supersedes_id = c.id)
         SELECT profile_version pv, outcome_status os, depth FROM c ORDER BY depth`, [docId])).rows

      test('examined → could_not_examine → examined; a repeat adds nothing; a lower version is refused; history is kept', async () => {
        const fixture = FIX('shot-luma-ambiguous-date')
        const { owner, docId, log } = await ready(fixture)
        for (const p of [RECEIPT_PROFILE, FAILING(2), v(3)]) expect((await record(svc, await log(), text(await envelopeFor(fixture, docId, owner, p)))).result).toBe('created')
        expect((await record(svc, await log(), text(await envelopeFor(fixture, docId, owner, FAILING(2))))).result).toBe('existing')
        // A version-1 run with a different engine label is a NEW key (not "existing") but lower than the head (3).
        const lower = await envelopeFor(fixture, docId, owner, v(1, { ref: { ...RECEIPT_PROFILE.ref, version: 1, schema: 'receipt-extraction-v9' } }))
        const regression = await fail(record(svc, await log(), text(lower)))
        expect(regression.message).toBe('examination_profile_regression')
        expect(await chain(docId)).toEqual([{ pv: 1, os: 'examined', depth: 1 }, { pv: 2, os: 'could_not_examine', depth: 2 }, { pv: 3, os: 'examined', depth: 3 }])
        const q = (await admin.query(
          `SELECT (SELECT profile_version FROM public.creator_record_v2_examination_runs r WHERE document_id = $1 AND NOT EXISTS (SELECT 1 FROM public.creator_record_v2_examination_runs s WHERE s.supersedes_id = r.id)) head,
                  (SELECT count(*) FROM public.creator_record_v2_examination_runs WHERE document_id = $1) total`, [docId])).rows[0]
        expect([q.head, Number(q.total)]).toEqual([3, 3])
      })

      test('a failed latest attempt stays the head: "latest attempt" and "latest successful" differ, and no selection rule is applied here', async () => {
        const fixture = FIX('shot-pika-multiple-payments')
        const { owner, docId, log } = await ready(fixture)
        await record(svc, await log(), text(await envelopeFor(fixture, docId, owner, RECEIPT_PROFILE)))
        await record(svc, await log(), text(await envelopeFor(fixture, docId, owner, FAILING(2))))
        const head = (await admin.query(`SELECT outcome_status FROM public.creator_record_v2_examination_runs r WHERE document_id = $1 AND NOT EXISTS (SELECT 1 FROM public.creator_record_v2_examination_runs s WHERE s.supersedes_id = r.id)`, [docId])).rows
        expect(head).toEqual([{ outcome_status: 'could_not_examine' }])
        expect(await chain(docId)).toEqual([{ pv: 1, os: 'examined', depth: 1 }, { pv: 2, os: 'could_not_examine', depth: 2 }])
      })

      test('competing writers on one document never fork the chain: one root, one head, linear', async () => {
        const fixture = FIX('shot-kling-confirmation-email')
        const { owner, docId } = await ready(fixture)
        const conns = await Promise.all(Array.from({ length: 6 }, () => connect('service_role')))
        const envs = await Promise.all([1, 2, 3, 4, 5, 6].map((n) => envelopeFor(fixture, docId, owner, n % 2 ? v(n) : FAILING(n))))
        const logs = await Promise.all(conns.map(() => logRead(svc, docId, owner)))
        const res = await Promise.all(conns.map((c, i) => fail(record(c, logs[i], text(envs[i])))))
        expect(res.every((r) => r.code === 'no error' || r.message === 'examination_profile_regression')).toBe(true)
        const stats = (await admin.query(
          `SELECT count(*) FILTER (WHERE supersedes_id IS NULL) roots,
                  count(*) FILTER (WHERE NOT EXISTS (SELECT 1 FROM public.creator_record_v2_examination_runs s WHERE s.supersedes_id = r.id)) heads,
                  count(*) total FROM public.creator_record_v2_examination_runs r WHERE document_id = $1`, [docId])).rows[0]
        expect([Number(stats.roots), Number(stats.heads)]).toEqual([1, 1])
        expect((await chain(docId)).length).toBe(Number(stats.total))
        const versions = (await chain(docId)).map((r) => r.pv)
        expect(versions).toEqual([...versions].sort((a, b) => a - b))
      })

      test('a different profile id is a separate chain', async () => {
        const fixture = FIX('shot-midjourney-plan-change')
        const { owner, docId, log } = await ready(fixture)
        await record(svc, await log(), text(await envelopeFor(fixture, docId, owner, RECEIPT_PROFILE)))
        await record(svc, await log(), text(await envelopeFor(fixture, docId, owner, { ...RECEIPT_PROFILE, ref: { ...RECEIPT_PROFILE.ref, id: 'receipt_alt' } })))
        expect(Number((await admin.query('SELECT count(*) n FROM public.creator_record_v2_examination_runs WHERE document_id = $1 AND supersedes_id IS NULL', [docId])).rows[0].n)).toBe(2)
      })
    })

    describe('immutability and bypass attempts', () => {
      test('runs and fixtures refuse every UPDATE and DELETE, even for the operator; service_role cannot write runs directly', async () => {
        const id = (await admin.query('SELECT id FROM public.creator_record_v2_examination_runs LIMIT 1')).rows[0].id
        for (const q of [`UPDATE public.creator_record_v2_examination_runs SET outcome_status = 'examined' WHERE id = '${id}'`, `DELETE FROM public.creator_record_v2_examination_runs WHERE id = '${id}'`,
          `UPDATE public.creator_record_v2_synthetic_fixtures SET fixture_id = 'x'`, `DELETE FROM public.creator_record_v2_synthetic_fixtures`]) {
          expect((await fail(admin.query(q))).code).toBe('P0001')
          expect((await fail(svc.query(q))).code).toBe('42501')
        }
        const row = (await admin.query('SELECT * FROM public.creator_record_v2_examination_runs LIMIT 1')).rows[0]
        expect((await fail(svc.query(`INSERT INTO public.creator_record_v2_examination_runs (examination_key, document_id, user_id, document_sha256, envelope_version, content_class, workflow_authorization, execution_boundary, environment_project_ref, profile_id, profile_version, schema_version, prompt_version, executor_mode, replay_set, recording_sha256, replay_fixture_id, outcome_status, envelope_canonical, envelope_sha256, access_log_id)
          SELECT '${'9'.repeat(64)}', document_id, user_id, document_sha256, 2, content_class, workflow_authorization, execution_boundary, environment_project_ref, profile_id, 9, schema_version, prompt_version, executor_mode, replay_set, recording_sha256, replay_fixture_id, outcome_status, envelope_canonical, '${'8'.repeat(64)}', access_log_id FROM public.creator_record_v2_examination_runs WHERE id = '${row.id}'`))).code).toBe('42501')
        for (const t of ['creator_record_v2_examination_runs', 'creator_record_v2_synthetic_fixtures']) expect((await fail(svc.query(`TRUNCATE public.${t}`))).code).toBe('42501')
        expect((await fail(svc.query(`INSERT INTO public.creator_record_v2_synthetic_fixtures VALUES ('${'7'.repeat(64)}', 'receipt-fixtures-v2/oracle-replay', 'forged', '${'6'.repeat(64)}')`))).code).toBe('42501')
      })

      test('even with CREATE on the schema, service_role cannot replace the write function or the guards', async () => {
        await admin.query('GRANT CREATE ON SCHEMA public TO service_role')
        try {
          expect((await fail(svc.query(`CREATE OR REPLACE FUNCTION public.creator_record_v2_record_examination(p_access_log_id bigint, p_envelope text) RETURNS TABLE (run_id uuid, result text) LANGUAGE sql AS 'SELECT NULL::uuid, ''created''::text'`))).code).toBe('42501')
          expect((await fail(svc.query(`CREATE OR REPLACE FUNCTION public.creator_record_v2_evidence_access_log_insert_guard() RETURNS trigger LANGUAGE plpgsql AS 'BEGIN RETURN NEW; END'`))).code).toBe('42501')
          expect((await fail(svc.query('ALTER TABLE public.creator_record_v2_examination_runs DISABLE TRIGGER ALL'))).code).toBe('42501')
        } finally {
          await admin.query('REVOKE CREATE ON SCHEMA public FROM service_role')
        }
      })

      test('a failing write is atomic: no run, no partial row; inside a caller transaction the logged read rolls back with it', async () => {
        const { owner, docId, env } = await ready(FIX('photo-pika-sideways'))
        const before = await runCount()
        const c = await connect('service_role')
        await c.query('BEGIN')
        const l = await logRead(c, docId, owner)
        expect((await fail(record(c, l, text({ ...env, provenance: { ...env.provenance, replay_fixture_id: 'conflict-two-plan-names' } })))).message).toBe('examination_content_not_recognized')
        await c.query('ROLLBACK')
        expect(await runCount()).toBe(before)
        expect(Number((await admin.query('SELECT count(*) n FROM public.creator_record_v2_evidence_access_log WHERE id = $1', [l])).rows[0].n)).toBe(0)
        const committed = await logRead(svc, docId, owner)
        expect((await fail(record(svc, committed, text({ ...env, document: { ...env.document, byte_size: 1 } })))).message).toBe('examination_document_mismatch')
        expect(Number((await admin.query('SELECT count(*) n FROM public.creator_record_v2_evidence_access_log WHERE id = $1', [committed])).rows[0].n)).toBe(1)
        expect(await runCount()).toBe(before)
      })
    })

    describe('DOC-1 and prepared-record compatibility', () => {
      test('runs do not block marking an unreferenced document deleted; references from prepared versions still derive', async () => {
        const fixture = FIX('pdf-pro-repeated-descriptions')
        const { owner, docId, env, log } = await ready(fixture)
        await record(svc, await log(), text(env))
        const prepId = randomUUID()
        await svc.query(
          `INSERT INTO public.creator_record_v2_prepared (id, user_id, draft_id, version, record_ref, record_schema, record_schema_version, canonical, sha256, form_state, status)
           VALUES ($1, $2, $3, 1, $4, 'si8/creator-record-v2-record', 5, $5, $6, '{"answers":{}}'::jsonb, 'prepared')`,
          [prepId, owner, randomUUID(), `PREP-${prepId}`, JSON.stringify({ documents: { policy: 'inventory_only', items: [{ document_id: docId, sha256: fixture.sha256 }] } }), 'c'.repeat(64)],
        )
        expect((await admin.query('SELECT sha256 FROM public.creator_record_v2_prepared_documents WHERE prepared_id = $1', [prepId])).rows).toEqual([{ sha256: fixture.sha256 }])
        const other = await ready(FIX('pdf-pro-repeated-descriptions'))
        await record(svc, await other.log(), text(other.env))
        await svc.query(`UPDATE public.creator_record_v2_documents SET state = 'deleted', deleted_at = now() WHERE id = $1`, [other.docId])
        expect(Number((await admin.query('SELECT count(*) n FROM public.creator_record_v2_examination_runs WHERE document_id = $1', [other.docId])).rows[0].n)).toBe(1)
      })
    })
  })

  describe('rollback guard (runs last)', () => {
    test('refused while examination history exists; nothing is dropped', async () => {
      await admin.query('BEGIN')
      const r = await fail(admin.query(ROLLBACK))
      await admin.query('ROLLBACK')
      expect([r.code, r.message]).toEqual(['P0001', 'DOC-2C rollback refused: examination history exists'])
      expect((await admin.query(`SELECT to_regclass('public.creator_record_v2_examination_runs') t`)).rows[0].t).not.toBeNull()
    })

    test('succeeds on a database with no examination history (marker present), leaves DOC-1 working, and the migration re-applies', async () => {
      await freshSchema()
      await establish()
      const owner = await user()
      const docId = await storedDoc(owner, REPLAY_FIXTURES[0])
      await logRead(svc, docId, owner, { purpose: 'file_download' })
      await admin.query('BEGIN')
      await admin.query(ROLLBACK)
      await admin.query('COMMIT')
      for (const t of ['creator_record_v2_examination_runs', 'creator_record_v2_synthetic_fixtures', 'creator_record_v2_examination_environment']) {
        expect((await admin.query('SELECT to_regclass($1) t', [`public.${t}`])).rows[0].t).toBeNull()
      }
      expect(Number((await admin.query(`SELECT count(*) n FROM information_schema.columns WHERE table_name = 'creator_record_v2_evidence_access_log' AND column_name = 'purpose'`)).rows[0].n)).toBe(0)
      await svc.query(`INSERT INTO public.creator_record_v2_evidence_access_log (document_id, actor_user_id, actor_role) VALUES ($1, $2, 'owner')`, [docId, owner])
      await admin.query(readFileSync(MIGRATION, 'utf8'))
      expect(Number((await admin.query('SELECT count(*) n FROM public.creator_record_v2_synthetic_fixtures')).rows[0].n)).toBe(45)
      expect(Number((await admin.query('SELECT count(*) n FROM public.creator_record_v2_examination_environment')).rows[0].n)).toBe(0)
    })
  })
})
