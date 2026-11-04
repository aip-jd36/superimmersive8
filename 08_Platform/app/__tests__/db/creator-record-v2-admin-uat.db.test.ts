/**
 * Permanent admin-only UAT: real PostgreSQL tests for 20261107000000, its apply pack and its rollback.
 *
 * Proves the database enforces administrator authority on its own: a non-admin is refused exactly as before; an
 * administrator may examine only their own stored owner_upload of a committed fixture; demotion takes effect at once;
 * grant and marker paths are unchanged; envelopes stay replay-only and fully validated; history stays valid across rollback.
 *
 * The superuser `admin` connection stands in for the database operator. Disposable local `si8_test_*` database only.
 * Skipped without DATABASE_URL_TEST (required in CI).
 */
import { readFileSync } from 'fs'
import { join } from 'path'
import { createHash, randomUUID } from 'crypto'
import { Client } from 'pg'
import { parseExaminationEnvelope, type ExaminationEnvelope } from '@/lib/creator-record/examination/envelope'
import { examineDocument, examinationKey } from '@/lib/creator-record/examination/examine-document'
import { buildProfileRegistry } from '@/lib/creator-record/examination/profile'
import { RECEIPT_PROFILE } from '@/lib/creator-record/examination/receipt-profile'
import { knownFixtureRegistry, replayExecutor } from '@/lib/creator-record/examination/replay-executor'
import { PERSISTED_RUN_COLUMNS, verifyRunRow, type PersistedRunRow } from '@/lib/creator-record/examination/persistence'
import { projectVerifiedRun } from '@/lib/creator-record/examination/projection'
import { buildReplayTable, type ReplayFixture } from '@/lib/creator-record/evidence/replay'
import { REPLAY_FIXTURES } from '@/lib/creator-record/evidence/replay-fixtures.data'
import { canonicalJson } from '@/lib/creator-record/record-core/canonical'

const URL = process.env.DATABASE_URL_TEST
const APP = join(__dirname, '..', '..')
const DIR = join(APP, 'supabase', 'migrations')
const BEFORE = [
  '20261021000000_payment_fulfillments.sql',
  '20261022000000_payment_zero_total_paid.sql',
  '20261028000000_creator_record_artifacts.sql',
  '20261101000000_creator_record_v2_prepared.sql',
  '20261102000000_creator_record_v2_submission_binding.sql',
  '20261103000000_creator_record_v2_evidence.sql',
  '20261104000000_creator_record_v2_examination_runs.sql',
  '20261105000000_creator_record_v2_operator_synthetic_uat.sql',
  '20261106000000_creator_record_v2_customer_path_uat.sql',
].map((f) => join(DIR, f))
const M07 = join(DIR, '20261107000000_creator_record_v2_admin_uat.sql')
const PACK = join(APP, 'supabase', 'operator', 'creator-record-v2-uat')
const PROD_REF = 'lehqgcgnenwdmuzudbrs'
const TEST_REF = 'localpg15examination'
const CONSENT = 'DRAFT-UNAPPROVED-cr-v2-evidence-storage-consent-0'
const GRANTS = 'public.creator_record_v2_examination_uat_grants'

function assertDisposable(url: string) {
  const u = new globalThis.URL(url)
  const db = u.pathname.replace(/^\//, '')
  if (!db.startsWith('si8_test_')) throw new Error(`refusing to run: database "${db}" is not si8_test_*`)
  if (!['localhost', '127.0.0.1', '::1', '[::1]'].includes(u.hostname)) throw new Error(`refusing to run: host "${u.hostname}" is not local`)
}
if (process.env.CI && !URL) throw new Error('DATABASE_URL_TEST is required in CI')
const maybe = URL ? describe : describe.skip

const fail = async (p: Promise<unknown>): Promise<string> => { try { await p; return 'no error' } catch (e) { return (e as Error).message } }
const sha = (b: Uint8Array | string) => createHash('sha256').update(b).digest('hex')
const F = REPLAY_FIXTURES.find((f) => f.fixture_id === 'pdf-kling-pro-monthly')!
type Env = ExaminationEnvelope

async function envelopeFor(fixture: ReplayFixture, documentId: string, ownerId: string): Promise<Env> {
  const bytes = new Uint8Array(Buffer.from(`%PDF-1.4\n%synthetic-test:${fixture.fixture_id}\n%%EOF\n`))
  const table = buildReplayTable([{ ...fixture, sha256: sha(bytes) }])
  const r = await examineDocument(
    {
      documents: { get: async () => ({ id: documentId, user_id: ownerId, sha256: sha(bytes), media_type: fixture.media_type as Env['document']['media_type'], byte_size: bytes.length, state: 'stored' }), readBytes: async () => bytes },
      fixtures: knownFixtureRegistry(table), executor: replayExecutor(table), profiles: buildProfileRegistry([RECEIPT_PROFILE]),
    },
    { actor_user_id: ownerId, document_id: documentId, profile: { id: RECEIPT_PROFILE.ref.id, version: RECEIPT_PROFILE.ref.version } },
  )
  if (r.kind !== 'envelope') throw new Error(`core refused: ${r.stage}/${r.code}`)
  const e = { ...r.envelope, document: { ...r.envelope.document, sha256: fixture.sha256, byte_size: fixture.bytes! } }
  const key = examinationKey({ document_id: e.document.document_id, sha256: e.document.sha256, profile: e.profile, executor: e.executor })
  const p = key.slice(0, 16)
  const env: Env = { ...e, examination_key: key, observations: e.observations.map((o) => ({ ...o, observation_id: p + o.observation_id.slice(16), source: { document_sha256: e.document.sha256, location: null } })) }
  if (!parseExaminationEnvelope(env)) throw new Error('rebound envelope fails the parser')
  return env
}

maybe('creator record v2 admin-only UAT (PostgreSQL)', () => {
  let admin: Client
  let svc: Client
  const extra: Client[] = []
  const connect = async (role?: 'service_role' | 'anon' | 'authenticated') => { const c = new Client({ connectionString: URL }); extra.push(c); await c.connect(); if (role) await c.query(`SET ROLE ${role}`); return c }
  async function base() {
    await admin.query('DROP SCHEMA IF EXISTS public CASCADE')
    await admin.query('CREATE SCHEMA public')
    await admin.query(readFileSync(join(__dirname, 'bootstrap.sql'), 'utf8'))
    await admin.query('DROP SCHEMA IF EXISTS storage CASCADE')
    await admin.query('CREATE SCHEMA storage; CREATE TABLE storage.buckets (id text PRIMARY KEY, name text NOT NULL, public boolean, file_size_limit bigint, allowed_mime_types text[])')
    for (const m of BEFORE) await admin.query(readFileSync(m, 'utf8'))
  }
  const applyM07 = () => admin.query(readFileSync(M07, 'utf8'))
  async function user(isAdmin: boolean, invited = false) {
    const id = randomUUID()
    await admin.query('INSERT INTO public.users (id, email, name, is_admin) VALUES ($1, $2, $3, $4)', [id, `${id}@example.test`, 'Tester', isAdmin])
    if (invited) await admin.query(`INSERT INTO public.creator_record_v2_pilot_access (user_id, added_by, reason) VALUES ($1, 'db test', 'test')`, [id])
    return id
  }
  async function upload(userId: string, o: { sha256?: string; store?: boolean } = {}) {
    const id = randomUUID()
    await svc.query(`INSERT INTO public.creator_record_v2_documents (id, user_id, sha256, media_type, byte_size, file_name, storage_path, consent_version, state) VALUES ($1, $2, $3, $4, $5, 'receipt', $6, $7, 'pending')`,
      [id, userId, o.sha256 ?? F.sha256, F.media_type, F.bytes, `${userId}/${id}`, CONSENT])
    if (o.store !== false) await svc.query(`UPDATE public.creator_record_v2_documents SET state = 'stored', stored_at = now() WHERE id = $1`, [id])
    return id
  }
  const log = async (c: Client, docId: string, actor: string, role = 'owner') => Number((await c.query(`INSERT INTO public.creator_record_v2_evidence_access_log (document_id, actor_user_id, actor_role, purpose) VALUES ($1, $2, $3, 'examination') RETURNING id`, [docId, actor, role])).rows[0].id)
  const record = async (c: Client, logId: number, text: string) => (await c.query('SELECT run_id, result FROM public.creator_record_v2_record_examination($1, $2)', [logId, text])).rows[0] as { run_id: string; result: string }
  const runRow = async (id: string) => (await admin.query(`SELECT ${PERSISTED_RUN_COLUMNS} FROM public.creator_record_v2_examination_runs WHERE id = $1`, [id])).rows[0] as PersistedRunRow
  const count = async (sql: string, args: unknown[] = []) => Number((await admin.query(sql, args)).rows[0].n)
  const revokeAll = () => admin.query(`UPDATE ${GRANTS} SET revoked_at = now(), revoked_by = 'db test', revoke_reason = 'reset' WHERE revoked_at IS NULL`)
  const customerGrant = async (u: string) => (await admin.query(
    `INSERT INTO ${GRANTS} (grant_kind, test_user_id, document_sha256, supabase_project_ref, binding_nonce_sha256, established_by, reason, change_ref, expires_at, max_read_events)
     VALUES ('customer_path_uat', $1, $2, $3, $4, 'db test', 'test', 'TEST', now() + interval '60 minutes', 4) RETURNING id`, [u, F.sha256, PROD_REF, sha(randomUUID())])).rows[0].id as string

  beforeAll(async () => {
    assertDisposable(URL!)
    admin = new Client({ connectionString: URL }); await admin.connect()
    await base(); await applyM07()
    svc = await connect('service_role')
  })
  afterAll(async () => { for (const c of extra) await c.end().catch(() => undefined); await admin.end() })

  describe('I6: administrator authority in the database', () => {
    test('a non-admin is refused with no grant, at the read and at the write', async () => {
      const u = await user(false, true)
      const d = await upload(u)
      expect(await fail(log(svc, d, u))).toBe('examination reads are not authorized in this environment')
      expect(await count(`SELECT count(*) n FROM public.creator_record_v2_examination_runs WHERE user_id = $1`, [u])).toBe(0)
    })

    test('an administrator examines their own fixture: no grant, no invitation; stamped admin_synthetic_uat; the committed reader accepts it', async () => {
      const a = await user(true)
      const d = await upload(a)
      const env = await envelopeFor(F, d, a)
      const id = await log(svc, d, a)
      expect((await admin.query(`SELECT uat_grant_id FROM public.creator_record_v2_evidence_access_log WHERE id = $1`, [id])).rows[0].uat_grant_id).toBeNull()
      const r = await record(svc, id, canonicalJson(env))
      expect(r.result).toBe('created')
      const row = await runRow(r.run_id)
      expect([row.execution_boundary, row.uat_grant_id, row.executor_mode, row.content_class, row.workflow_authorization, row.environment_project_ref]).toEqual(['admin_synthetic_uat', null, 'fixture_replay', 'known_synthetic_fixture', 'not_established', PROD_REF])
      expect(verifyRunRow({ ...row, access_log_id: Number(row.access_log_id) }, a, d)).toBeNull()
      const p = projectVerifiedRun({ ...row, access_log_id: Number(row.access_log_id) }, a, d)
      expect(p.ok && [p.projection.execution_boundary, p.projection.verification]).toEqual(['admin_synthetic_uat', 'not_verified'])
    })

    test('repeatable: the same examination returns the existing run and creates no second one; no budget applies', async () => {
      const a = await user(true)
      const d = await upload(a)
      const t = canonicalJson(await envelopeFor(F, d, a))
      const first = await record(svc, await log(svc, d, a), t)
      for (let i = 0; i < 6; i++) expect(await record(svc, await log(svc, d, a), t)).toEqual({ run_id: first.run_id, result: 'existing' })
      expect(await count(`SELECT count(*) n FROM public.creator_record_v2_examination_runs WHERE document_id = $1`, [d])).toBe(1)
      expect(await count(`SELECT count(*) n FROM public.creator_record_v2_evidence_access_log WHERE document_id = $1`, [d])).toBe(7)
    })

    test.each([
      ['bytes that are not a committed fixture', async (a: string) => ({ d: await upload(a, { sha256: 'f'.repeat(64) }), actor: a })],
      ['another user\'s document', async () => { const o = await user(false); return { d: await upload(o), actor: await user(true) } }],
      ['another administrator\'s document', async () => { const o = await user(true); return { d: await upload(o), actor: await user(true) } }],
      ['a document still pending', async (a: string) => ({ d: await upload(a, { store: false }), actor: a })],
    ] as const)('an administrator is refused for %s', async (_n, setup) => {
      const a = await user(true)
      const { d, actor } = await setup(a)
      expect(await fail(log(svc, d, actor))).toBe('examination_admin_uat_target_mismatch')
    })

    test('the read must be logged as the owner', async () => {
      const a = await user(true)
      const d = await upload(a)
      expect(await fail(log(svc, d, a, 'admin'))).toBe('examination_admin_uat_target_mismatch')
    })

    test('an operator-seeded document cannot be examined this way', async () => {
      await revokeAll()
      const seedUser = await user(false)
      const g = (await admin.query(
        `INSERT INTO ${GRANTS} (test_user_id, document_sha256, supabase_project_ref, binding_nonce_sha256, established_by, reason, change_ref, expires_at, max_read_events)
         VALUES ($1, $2, $3, $4, 'db test', 'test', 'TEST', now() + interval '60 minutes', 4) RETURNING id`, [seedUser, F.sha256, PROD_REF, sha(randomUUID())])).rows[0].id
      const d = randomUUID()
      await svc.query(`INSERT INTO public.creator_record_v2_documents (id, user_id, sha256, media_type, byte_size, file_name, storage_path, consent_version, state, origin, seed_grant_id) VALUES ($1, $2, $3, $4, $5, 'fixture.pdf', $6, NULL, 'pending', 'operator_synthetic_seed', $7)`, [d, seedUser, F.sha256, F.media_type, F.bytes, `${seedUser}/${d}`, g])
      await svc.query(`UPDATE public.creator_record_v2_documents SET state = 'stored', stored_at = now() WHERE id = $1`, [d])
      await revokeAll()
      await admin.query('UPDATE public.users SET is_admin = true WHERE id = $1', [seedUser])
      expect(await fail(log(svc, d, seedUser))).toBe('examination_admin_uat_target_mismatch')
    })

    test('I5: demotion takes effect at once, at a new read and at a write already logged', async () => {
      const a = await user(true)
      const d = await upload(a)
      const t = canonicalJson(await envelopeFor(F, d, a))
      const pending = await log(svc, d, a)
      await admin.query('UPDATE public.users SET is_admin = false WHERE id = $1', [a])
      expect(await fail(log(svc, d, a))).toBe('examination reads are not authorized in this environment')
      expect(await fail(record(svc, pending, t))).toBe('examination_environment_not_authorized')
      expect(await count(`SELECT count(*) n FROM public.creator_record_v2_examination_runs WHERE document_id = $1`, [d])).toBe(0)
    })

    test('a write needs a real logged read: an unknown log id is refused', async () => {
      const a = await user(true)
      const d = await upload(a)
      const t = canonicalJson(await envelopeFor(F, d, a))
      expect(await fail(record(svc, 999999999, t))).toBe('examination_environment_not_authorized')
    })
  })

  describe('I15: replay only, envelope fully validated on the admin path', () => {
    test.each<[string, (e: any) => void, string]>([
      ['a model call', (e) => { e.provenance.model_calls = 1 }, 'examination_envelope_invalid'],
      ['a prompt sent', (e) => { e.provenance.prompt_sent = true }, 'examination_envelope_invalid'],
      ['a live executor', (e) => { e.executor.mode = 'live' }, 'examination_envelope_invalid'],
      ['a verified observation', (e) => { e.observations[0].verification = 'verified' }, 'examination_envelope_invalid'],
      ['a dropped mandatory limitation', (e) => { e.limitations = e.limitations.filter((l: string) => l !== 'observations_not_verified') }, 'examination_envelope_invalid'],
      ['an established workflow', (e) => { e.workflow_authorization = 'established' }, 'examination_envelope_invalid'],
      ['a different recording', (e) => { e.executor.recording_sha256 = 'a'.repeat(64) }, 'examination_key_mismatch'],
    ])('%s is refused', async (_n, mutate, expected) => {
      const a = await user(true)
      const d = await upload(a)
      const env = JSON.parse(canonicalJson(await envelopeFor(F, d, a)))
      mutate(env)
      expect(await fail(record(svc, await log(svc, d, a), canonicalJson(env)))).toBe(expected)
    })

    test('the run CHECK refuses an admin run carrying a grant, and any unknown boundary', async () => {
      const a = await user(true)
      const d = await upload(a)
      const t = canonicalJson(await envelopeFor(F, d, a))
      const r = await record(svc, await log(svc, d, a), t)
      const def = (await admin.query(`SELECT pg_get_constraintdef(oid) d FROM pg_constraint WHERE conname = 'creator_record_v2_examination_runs_authority_check'`)).rows[0].d as string
      expect(def).toMatch(/admin_synthetic_uat.*uat_grant_id IS NULL/)
      expect((await runRow(r.run_id)).uat_grant_id).toBeNull()
      expect(await fail(admin.query(`UPDATE public.creator_record_v2_examination_runs SET execution_boundary = 'customer' WHERE id = $1`, [r.run_id]))).toMatch(/append-only|violates check/)
    })
  })

  describe('existing paths are unchanged', () => {
    test('a non-admin grant path still stamps customer_path_synthetic_uat, with its grant', async () => {
      await revokeAll()
      const u = await user(false, true)
      const g = await customerGrant(u)
      const d = await upload(u)
      const r = await record(svc, await log(svc, d, u), canonicalJson(await envelopeFor(F, d, u)))
      const row = await runRow(r.run_id)
      expect([row.execution_boundary, row.uat_grant_id]).toEqual(['customer_path_synthetic_uat', g])
      await revokeAll()
    })

    test('an active grant neither blocks an administrator nor is consumed by one', async () => {
      await revokeAll()
      const u = await user(false, true)
      const g = await customerGrant(u)
      const a = await user(true)
      const d = await upload(a)
      const r = await record(svc, await log(svc, d, a), canonicalJson(await envelopeFor(F, d, a)))
      expect((await runRow(r.run_id)).execution_boundary).toBe('admin_synthetic_uat')
      expect(await count(`SELECT count(*) n FROM public.creator_record_v2_evidence_access_log WHERE uat_grant_id = $1`, [g])).toBe(0)
      expect(await count(`SELECT count(*) n FROM public.creator_record_v2_examination_runs WHERE uat_grant_id = $1`, [g])).toBe(0)
      await revokeAll()
    })

    test('a revoked grant gives its old identity nothing', async () => {
      await revokeAll()
      const u = await user(false, true)
      await customerGrant(u)
      const d = await upload(u)
      await revokeAll()
      expect(await fail(log(svc, d, u))).toBe('examination reads are not authorized in this environment')
    })

    test('I17: with the isolated-test marker, an administrator takes the marker path, not the admin path', async () => {
      await revokeAll()
      await admin.query(`INSERT INTO public.creator_record_v2_examination_environment (environment_kind, supabase_project_ref, established_by, reason) VALUES ('isolated_synthetic_test', $1, 'db test', 'test')`, [TEST_REF])
      const a = await user(true)
      const d = await upload(a)
      const r = await record(svc, await log(svc, d, a), canonicalJson(await envelopeFor(F, d, a)))
      const row = await runRow(r.run_id)
      expect([row.execution_boundary, row.environment_project_ref]).toEqual(['isolated_synthetic_test', TEST_REF])
      await admin.query('DELETE FROM public.creator_record_v2_examination_environment')
    })

    test('privileges are unchanged: API roles reach no table or function; the service role reaches only the write function', async () => {
      const a = await user(true)
      const d = await upload(a)
      for (const role of ['anon', 'authenticated'] as const) {
        const c = await connect(role)
        expect(await fail(c.query('SELECT 1 FROM public.creator_record_v2_examination_runs'))).toMatch(/permission denied/)
        expect(await fail(c.query(`SELECT 1 FROM ${GRANTS}`))).toMatch(/permission denied/)
        expect(await fail(c.query('SELECT public.creator_record_v2_record_examination(1, $1)', ['{}']))).toMatch(/permission denied/)
        expect(await fail(log(c, d, a))).toMatch(/permission denied/)
      }
      expect(await fail(svc.query(`SELECT 1 FROM ${GRANTS}`))).toMatch(/permission denied/)
    })

    test('I22: admin runs are append-only like every other run', async () => {
      const a = await user(true)
      const d = await upload(a)
      const r = await record(svc, await log(svc, d, a), canonicalJson(await envelopeFor(F, d, a)))
      expect(await fail(admin.query(`DELETE FROM public.creator_record_v2_examination_runs WHERE id = $1`, [r.run_id]))).toMatch(/append-only/)
    })

    test('I19: no submission, payment or artifact row is created by the admin path', async () => {
      expect(await count('SELECT count(*) n FROM public.submissions')).toBe(0)
      expect(await count('SELECT count(*) n FROM public.payment_fulfillments')).toBe(0)
      expect(await count('SELECT count(*) n FROM public.creator_record_artifacts')).toBe(0)
    })
  })

  describe('hardened apply pack, verify and rollback', () => {
    const PROD9 = JSON.parse(readFileSync(join(PACK, 'production-apply', 'expected.json'), 'utf8')).prod9_20261107 as { run_id: string; test_user_id: string; project_ref: string; change_ref: string }
    const lf = (s: string) => s.replace(/\r\n/g, '\n')
    const apply = () => lf(readFileSync(join(PACK, 'production-apply', '08_apply_20261107.sql'), 'utf8'))
    const verifySql = () => readFileSync(join(PACK, 'production-apply', '09_verify_20261107.sql'), 'utf8')
    const rollback = () => lf(readFileSync(join(PACK, 'rollback_20261107.sql'), 'utf8'))
    const verify = async () => (await admin.query(verifySql())).rows[0] as { state: string; all_pass: boolean; failed: string[]; admin_runs: string }
    const applyOk = async (sql = apply()) => {
      const results = await admin.query(sql) as unknown as { rows: { result?: string }[] }[]
      return results[results.length - 1].rows[0].result
    }
    /** Fails the file, leaves no transaction open, and reports the message. */
    const refused = async (sql = apply()) => { const m = await fail(admin.query(sql)); await admin.query('ROLLBACK'); return m }

    /** Production today: 20261106 applied, the Cloud World assessment, and the exact PROD-9 history under a revoked grant. */
    async function production(o: { methodology?: string; assessments?: boolean; run?: boolean; projectRef?: string; revoke?: boolean } = {}) {
      await base()
      svc = await connect('service_role')
      if (o.assessments !== false) {
        await admin.query('CREATE TABLE public.assessments (assessment_number text PRIMARY KEY, methodology_version text NOT NULL)')
        await admin.query(`INSERT INTO public.assessments VALUES ('ASSESS-005-2026-07-12', $1)`, [o.methodology ?? 'SI8 Reviewer Manual v0.1'])
      }
      if (o.run === false) return
      const u = PROD9.test_user_id
      await admin.query('INSERT INTO public.users (id, email, name, is_admin) VALUES ($1, $2, $3, false)', [u, 'uat@example.test', 'UAT'])
      await admin.query(`INSERT INTO public.creator_record_v2_pilot_access (user_id, added_by, reason) VALUES ($1, 'db test', 'test')`, [u])
      const g = (await admin.query(
        `INSERT INTO ${GRANTS} (grant_kind, test_user_id, document_sha256, supabase_project_ref, binding_nonce_sha256, established_by, reason, change_ref, expires_at, max_read_events)
         VALUES ('customer_path_uat', $1, $2, $3, $4, 'db test', 'test', $5, now() + interval '60 minutes', 4) RETURNING id`, [u, F.sha256, o.projectRef ?? PROD9.project_ref, sha(randomUUID()), PROD9.change_ref])).rows[0].id
      const d = await upload(u)
      const env = await envelopeFor(F, d, u)
      const log_ = await log(svc, d, u)
      const text = canonicalJson(env)
      await admin.query(
        `INSERT INTO public.creator_record_v2_examination_runs (id, examination_key, document_id, user_id, document_sha256, envelope_version, content_class, workflow_authorization, execution_boundary, environment_project_ref, profile_id, profile_version, schema_version, prompt_version, executor_mode, replay_set, recording_sha256, replay_fixture_id, outcome_status, envelope_canonical, envelope_sha256, access_log_id, uat_grant_id)
         VALUES ($1, $2, $3, $4, $5, 2, 'known_synthetic_fixture', 'not_established', 'customer_path_synthetic_uat', $6, $7, $8, $9, $10, 'fixture_replay', $11, $12, $13, 'examined', $14, $15, $16, $17)`,
        [PROD9.run_id, env.examination_key, d, u, env.document.sha256, o.projectRef ?? PROD9.project_ref, env.profile.id, env.profile.version, env.profile.schema, env.profile.prompt, env.executor.replay_set, env.executor.recording_sha256, env.provenance.replay_fixture_id, text, sha(text), log_, g])
      if (o.revoke !== false) await revokeAll()
    }

    test('the pack embeds the committed migration verbatim and is current', () => {
      expect(apply()).toContain(lf(readFileSync(M07, 'utf8')).trimEnd())
    })

    test('absent -> applied, every check passing, E4-shaped history intact; rollback returns to absent', async () => {
      await production()
      const before = await verify()
      expect(before.state).toBe('absent')
      expect(before.all_pass).toBe(false)
      const historyBefore = (await admin.query(`SELECT id, envelope_sha256 FROM public.creator_record_v2_examination_runs`)).rows
      expect(await applyOk()).toBe('20261107000000 COMMITTED')
      const v = await verify()
      expect([v.state, v.all_pass, v.failed, v.admin_runs]).toEqual(['applied', true, [], '0'])
      expect((await admin.query(`SELECT id, envelope_sha256 FROM public.creator_record_v2_examination_runs`)).rows).toEqual(historyBefore)
      await admin.query(rollback())
      expect((await verify()).state).toBe('absent')
      const a = await user(true)
      expect(await fail(log(svc, await upload(a), a))).toBe('examination reads are not authorized in this environment')
    })

    test('a Windows (CRLF) copy of the file applies and verifies exactly the same', async () => {
      await production()
      expect(await applyOk(apply().replace(/\n/g, '\r\n'))).toBe('20261107000000 COMMITTED')
      const v = await verify()
      expect([v.state, v.all_pass, v.failed]).toEqual(['applied', true, []])
    })

    describe('identity precondition: refuses and commits nothing', () => {
      test.each<[string, Parameters<typeof production>[0], RegExp]>([
        ['no assessments table', { assessments: false }, /does not look like Production/],
        ['a staging placeholder assessment', { methodology: 'STAGING-PLACEHOLDER' }, /does not look like Production/],
        ['no PROD-9 history', { run: false }, /CR-V2-UAT-PROD-9 history was not found/],
        ['PROD-9 history under another project ref', { projectRef: 'abcdefghijklmnopqrst' }, /CR-V2-UAT-PROD-9 history was not found/],
        ['the PROD-9 grant not yet revoked', { revoke: false }, /CR-V2-UAT-PROD-9 history was not found/],
      ])('%s', async (_n, shape, message) => {
        await production(shape)
        expect(await refused()).toMatch(message)
        expect((await verify()).state).toBe('absent')
      })
    })

    describe('pre-check: refuses and commits nothing', () => {
      test('a second run', async () => {
        await production()
        await applyOk()
        expect(await refused()).toMatch(/expects state absent, found applied/)
        expect((await verify()).state).toBe('applied')
      })
      test('an active grant', async () => {
        await production()
        await customerGrant(await user(false, true))
        expect(await refused()).toMatch(/an examination UAT grant is active/)
        expect((await verify()).state).toBe('absent')
      })
      test('the environment marker', async () => {
        await production()
        await admin.query(`INSERT INTO public.creator_record_v2_examination_environment (environment_kind, supabase_project_ref, established_by, reason) VALUES ('isolated_synthetic_test', $1, 'db test', 'test')`, [TEST_REF])
        expect(await refused()).toMatch(/isolated-test marker exists/)
      })
      test('a function that is not exactly the verified 20261106 body reads as partial and is refused', async () => {
        await production()
        const src = (await admin.query(`SELECT prosrc FROM pg_proc WHERE proname = 'creator_record_v2_record_examination'`)).rows[0].prosrc as string
        await admin.query(`CREATE OR REPLACE FUNCTION public.creator_record_v2_record_examination(p_access_log_id bigint, p_envelope text) RETURNS TABLE (run_id uuid, result text) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $body$${src}-- drift\n$body$`)
        expect((await verify()).state).toBe('partial')
        expect(await refused()).toMatch(/expects state absent, found partial/)
      })
    })

    describe('verify detects any drift after apply', () => {
      const appended = async (name: string, signature: string) => {
        const src = (await admin.query(`SELECT prosrc FROM pg_proc WHERE proname = $1`, [name])).rows[0].prosrc as string
        await admin.query(`CREATE OR REPLACE FUNCTION public.${name}${signature} LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $body$${src.replace('BEGIN', '-- a one-line change\nBEGIN')}$body$`)
      }
      test.each<[string, () => Promise<unknown>, string, string]>([
        ['a one-line change to the guard', () => appended('creator_record_v2_evidence_access_log_insert_guard', '() RETURNS trigger'), 'function_body_access_log_guard', 'partial'],
        ['a one-line change to the write function', () => appended('creator_record_v2_record_examination', '(p_access_log_id bigint, p_envelope text) RETURNS TABLE (run_id uuid, result text)'), 'function_body_write_function', 'partial'],
        ['a widened run constraint', async () => { await admin.query(`ALTER TABLE public.creator_record_v2_examination_runs DROP CONSTRAINT creator_record_v2_examination_runs_authority_check`); await admin.query(`ALTER TABLE public.creator_record_v2_examination_runs ADD CONSTRAINT creator_record_v2_examination_runs_authority_check CHECK (environment_project_ref ~ '^[a-z0-9]{20}$' AND execution_boundary IS NOT NULL AND execution_boundary <> 'admin_synthetic_uat_x' AND 'admin_synthetic_uat' IS NOT NULL)`) }, 'run_constraint_exact', 'partial'],
        ['execute granted to authenticated', () => admin.query('GRANT EXECUTE ON FUNCTION public.creator_record_v2_record_examination(bigint, text) TO authenticated'), 'write_function_authenticated_denied', 'applied'],
        ['execute removed from the service role', () => admin.query('REVOKE EXECUTE ON FUNCTION public.creator_record_v2_record_examination(bigint, text) FROM service_role'), 'write_function_service_role_allowed', 'applied'],
        ['the guard trigger disabled', () => admin.query('ALTER TABLE public.creator_record_v2_evidence_access_log DISABLE TRIGGER creator_record_v2_evidence_access_log_insert_guard'), 'access_log_guard_trigger_enabled', 'applied'],
        ['RLS turned off', () => admin.query('ALTER TABLE public.creator_record_v2_examination_runs DISABLE ROW LEVEL SECURITY'), 'rls_on', 'applied'],
        ['a policy added', () => admin.query(`CREATE POLICY x ON public.creator_record_v2_examination_runs FOR SELECT USING (true)`), 'no_policies', 'applied'],
        ['SELECT granted on runs to authenticated', () => admin.query('GRANT SELECT ON public.creator_record_v2_examination_runs TO authenticated'), 'runs_authenticated_denied', 'applied'],
        ['a marker added', () => admin.query(`INSERT INTO public.creator_record_v2_examination_environment (environment_kind, supabase_project_ref, established_by, reason) VALUES ('isolated_synthetic_test', '${TEST_REF}', 'db test', 'test')`), 'no_environment_marker', 'applied'],
      ])('%s', async (_n, tamper, check, state) => {
        await production()
        await applyOk()
        await tamper()
        const v = await verify()
        expect(v.all_pass).toBe(false)
        expect(v.failed).toContain(check)
        expect(v.state).toBe(state)
      })
    })

    test('the post-check refuses a pack whose migration differs from the pinned digests, and commits nothing', async () => {
      await production()
      const altered = apply().replace(`RETURN NEW;  -- uat_grant_id stays NULL: no grant, window or budget is involved`, `RETURN NEW;  -- altered`)
      expect(altered).not.toBe(apply())
      expect(await refused(altered)).toMatch(/post-check failed; nothing is committed/)
      expect((await verify()).state).toBe('absent')
    })

    test('rollback after an admin run: new admin reads refused; state disabled; the run and its constraint stay valid', async () => {
      await production()
      await applyOk()
      const a = await user(true)
      const d = await upload(a)
      const r = await record(svc, await log(svc, d, a), canonicalJson(await envelopeFor(F, d, a)))
      expect((await verify()).admin_runs).toBe('1')
      await admin.query(rollback())
      const v = await verify()
      expect([v.state, v.admin_runs]).toEqual(['disabled', '1'])
      expect(await fail(log(svc, d, a))).toBe('examination reads are not authorized in this environment')
      const row = await runRow(r.run_id)
      expect(row.execution_boundary).toBe('admin_synthetic_uat')
      expect(verifyRunRow({ ...row, access_log_id: Number(row.access_log_id) }, a, d)).toBeNull()
    })
  })
})
