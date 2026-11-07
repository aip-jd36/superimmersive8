/**
 * CR-V2-DOC-LIVE-1A: real PostgreSQL tests for 20261108000000.
 *
 * Proves the migration is additive, that history and the replay path are untouched, that `live_model` is refused outright, and that
 * the database itself enforces one reading, first write wins, capped attempts and full envelope validation. All envelopes come from
 * the mock executor. Disposable local `si8_test_*` database only. Skipped without DATABASE_URL_TEST (required in CI).
 */
import { readFileSync } from 'fs'
import { join } from 'path'
import { createHash, randomUUID } from 'crypto'
import { Client } from 'pg'
import { examineDocument, examinationKey } from '@/lib/creator-record/examination/examine-document'
import { parseExaminationEnvelope, type ExaminationEnvelope } from '@/lib/creator-record/examination/envelope'
import { buildProfileRegistry, profileKey } from '@/lib/creator-record/examination/profile'
import { RECEIPT_PROFILE } from '@/lib/creator-record/examination/receipt-profile'
import { knownFixtureRegistry, replayExecutor } from '@/lib/creator-record/examination/replay-executor'
import { PERSISTED_RUN_COLUMNS, verifyRunRow, type PersistedRunRow } from '@/lib/creator-record/examination/persistence'
import { buildReplayTable } from '@/lib/creator-record/evidence/replay'
import { REPLAY_FIXTURES } from '@/lib/creator-record/evidence/replay-fixtures.data'
import { canonicalJson } from '@/lib/creator-record/record-core/canonical'
import { liveExaminationKey, parseLiveEnvelope, type LiveEnvelope } from '@/lib/creator-record/live-examination/envelope'
import { RECEIPT_LIVE_PROFILE, runLiveExamination, verifyLiveAttemptRow, type LiveAttemptRow } from '@/lib/creator-record/live-examination/examine'
import { mockLiveExecutor, type MockStep } from '@/test-support/mock-live-executor'

const URL = process.env.DATABASE_URL_TEST
const DIR = join(__dirname, '..', '..', 'supabase', 'migrations')
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
  '20261107000000_creator_record_v2_admin_uat.sql',
].map((f) => join(DIR, f))
const M08_FILE = join(DIR, '20261108000000_creator_record_v2_live_examination_foundation.sql')
const M08 = readFileSync(M08_FILE, 'utf8')
const CONSENT = 'DRAFT-UNAPPROVED-cr-v2-evidence-storage-consent-0'
const ATTEMPTS = 'public.creator_record_v2_live_examination_attempts'

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
const OTHER_OUTPUT = REPLAY_FIXTURES.find((f) => f.fixture_id !== F.fixture_id && f.media_type === 'application/pdf')!.parsed_output
const GOOD: MockStep = { output: F.parsed_output }

/** A real run of the core against the mock, rebound to the committed fixture's digest and size (its bytes are not in the repository). */
async function envelope(documentId: string, owner: string, steps: MockStep[] = [GOOD]): Promise<LiveEnvelope> {
  const bytes = new Uint8Array(Buffer.from(`%PDF-1.4\n%synthetic-test:${F.fixture_id}\n%%EOF\n`))
  const record = { id: documentId, user_id: owner, sha256: sha(bytes), media_type: 'application/pdf' as const, byte_size: bytes.length, state: 'stored' as const }
  const r = await runLiveExamination(
    { documents: { get: async () => record, readBytes: async () => bytes }, isKnownSyntheticFixture: () => true, executor: mockLiveExecutor(steps), profiles: new Map([[profileKey(RECEIPT_LIVE_PROFILE.ref), RECEIPT_LIVE_PROFILE]]), livePermitted: false, now: () => new Date() },
    { actor_user_id: owner, document_id: documentId, profile: { id: 'receipt', version: 1 } },
  )
  if (r.kind !== 'envelope') throw new Error(r.code)
  return rebind(r.envelope)
}
function rebind(e: LiveEnvelope): LiveEnvelope {
  const document = { ...e.document, sha256: F.sha256, byte_size: F.bytes! }
  const key = liveExaminationKey({ document_id: document.document_id, sha256: document.sha256, profile: e.profile, executor: e.executor })
  const out = { ...e, document, examination_key: key, observations: e.observations.map((o) => ({ ...o, observation_id: key.slice(0, 16) + o.observation_id.slice(16), source: { document_sha256: document.sha256, location: null as null } })) }
  if (!parseLiveEnvelope(out)) throw new Error('rebound envelope fails the parser')
  return out
}

maybe('creator record v2 live examination foundation (PostgreSQL)', () => {
  let admin: Client
  let svc: Client
  const extra: Client[] = []
  const connect = async (role?: 'service_role' | 'anon' | 'authenticated') => { const c = new Client({ connectionString: URL }); extra.push(c); await c.connect(); if (role) await c.query(`SET ROLE ${role}`); return c }
  const user = async (isAdmin = false) => {
    const id = randomUUID()
    await admin.query('INSERT INTO public.users (id, email, name, is_admin) VALUES ($1, $2, $3, $4)', [id, `${id}@example.test`, 'Tester', isAdmin])
    return id
  }
  const upload = async (owner: string, sha256 = F.sha256) => {
    const id = randomUUID()
    await svc.query(`INSERT INTO public.creator_record_v2_documents (id, user_id, sha256, media_type, byte_size, file_name, storage_path, consent_version, state) VALUES ($1, $2, $3, $4, $5, 'receipt', $6, $7, 'pending')`, [id, owner, sha256, F.media_type, F.bytes, `${owner}/${id}`, CONSENT])
    await svc.query(`UPDATE public.creator_record_v2_documents SET state = 'stored', stored_at = now() WHERE id = $1`, [id])
    return id
  }
  const log = async (docId: string, actor: string, opts: { purpose?: string } = {}) => Number((await svc.query(
    `INSERT INTO public.creator_record_v2_evidence_access_log (document_id, actor_user_id, actor_role, purpose) VALUES ($1, $2, 'owner', $3) RETURNING id`, [docId, actor, opts.purpose ?? 'examination'])).rows[0].id)
  const record = async (logId: number, text: string, c: Client = svc) => (await c.query('SELECT attempt_id, result FROM public.creator_record_v2_record_live_examination($1, $2)', [logId, text])).rows[0] as { attempt_id: string; result: string }
  const store = async (docId: string, owner: string, e: LiveEnvelope) => record(await log(docId, owner), canonicalJson(e))
  const fresh = async () => { const owner = await user(); return { owner, docId: await upload(owner) } }
  const count = async (where = 'true', args: unknown[] = []) => Number((await admin.query(`SELECT count(*) n FROM ${ATTEMPTS} WHERE ${where}`, args)).rows[0].n)
  const establish = () => admin.query(`INSERT INTO public.creator_record_v2_examination_environment (environment_kind, supabase_project_ref, established_by, reason) VALUES ('isolated_synthetic_test', 'localpg15examination', 'db test operator', 'isolated local PostgreSQL 15 test')`)
  const snapshot = async () => (await admin.query(`
    SELECT 'constraint' k, conrelid::regclass::text || '.' || conname n, pg_get_constraintdef(oid) d FROM pg_constraint WHERE connamespace = 'public'::regnamespace AND conrelid::regclass::text NOT LIKE '%live_examination%' AND conrelid <> 0
    UNION ALL SELECT 'function', p.oid::regprocedure::text, pg_get_functiondef(p.oid) FROM pg_proc p WHERE p.pronamespace = 'public'::regnamespace AND p.prokind = 'f' AND p.proname <> 'creator_record_v2_record_live_examination'
    UNION ALL SELECT 'column', table_name || '.' || column_name, data_type || is_nullable FROM information_schema.columns WHERE table_schema = 'public' AND table_name NOT LIKE '%live_examination%'
    UNION ALL SELECT 'trigger', t.tgrelid::regclass::text || '.' || t.tgname, pg_get_triggerdef(t.oid) FROM pg_trigger t WHERE NOT t.tgisinternal AND t.tgrelid::regclass::text NOT LIKE '%live_examination%'
    UNION ALL SELECT 'grant', grantee || '.' || table_name, string_agg(privilege_type, ',' ORDER BY privilege_type) FROM information_schema.role_table_grants WHERE table_schema = 'public' AND table_name NOT LIKE '%live_examination%' GROUP BY grantee, table_name
    ORDER BY 1, 2`)).rows
  let replayRunId = ''

  beforeAll(async () => {
    assertDisposable(URL!)
    admin = new Client({ connectionString: URL })
    await admin.connect()
    await admin.query('DROP SCHEMA IF EXISTS public CASCADE')
    await admin.query('CREATE SCHEMA public')
    await admin.query(readFileSync(join(__dirname, 'bootstrap.sql'), 'utf8'))
    await admin.query('DROP SCHEMA IF EXISTS storage CASCADE')
    await admin.query('CREATE SCHEMA storage; CREATE TABLE storage.buckets (id text PRIMARY KEY, name text NOT NULL, public boolean, file_size_limit bigint, allowed_mime_types text[])')
    for (const m of BEFORE) await admin.query(readFileSync(m, 'utf8'))
    svc = await connect('service_role')
  })
  afterAll(async () => {
    for (const c of extra) await c.end().catch(() => undefined)
    await admin?.end().catch(() => undefined)
  })

  /** A replay run through the real path, as an existing record's history would hold. */
  async function replayRun(owner: string, docId: string) {
    const bytes = new Uint8Array(Buffer.from(`%PDF-1.4\n%synthetic-test:${F.fixture_id}\n%%EOF\n`))
    const table = buildReplayTable([{ ...F, sha256: sha(bytes) }])
    const r = await examineDocument(
      { documents: { get: async () => ({ id: docId, user_id: owner, sha256: sha(bytes), media_type: 'application/pdf', byte_size: bytes.length, state: 'stored' }), readBytes: async () => bytes }, fixtures: knownFixtureRegistry(table), executor: replayExecutor(table), profiles: buildProfileRegistry([RECEIPT_PROFILE]) },
      { actor_user_id: owner, document_id: docId, profile: { id: 'receipt', version: 1 } },
    )
    if (r.kind !== 'envelope') throw new Error('replay refused')
    const e = { ...r.envelope, document: { ...r.envelope.document, sha256: F.sha256, byte_size: F.bytes! } }
    const key = examinationKey({ document_id: docId, sha256: F.sha256, profile: e.profile, executor: e.executor })
    const env: ExaminationEnvelope = { ...e, examination_key: key, observations: e.observations.map((o) => ({ ...o, observation_id: key.slice(0, 16) + o.observation_id.slice(16), source: { document_sha256: F.sha256, location: null } })) }
    if (!parseExaminationEnvelope(env)) throw new Error('rebound replay envelope fails the parser')
    const logId = await log(docId, owner)
    return (await svc.query('SELECT run_id, result FROM public.creator_record_v2_record_examination($1, $2)', [logId, canonicalJson(env)])).rows[0] as { run_id: string; result: string }
  }
  const runRow = async (id: string) => (await admin.query(`SELECT ${PERSISTED_RUN_COLUMNS} FROM public.creator_record_v2_examination_runs WHERE id = $1`, [id])).rows[0] as PersistedRunRow

  describe('the migration is additive', () => {
    test('it refuses to apply before 20261107000000', async () => {
      const probe = await admin.query(`SELECT count(*) n FROM pg_constraint WHERE conrelid = 'public.creator_record_v2_examination_runs'::regclass AND conname = 'creator_record_v2_examination_runs_authority_check' AND pg_get_constraintdef(oid) LIKE '%admin_synthetic_uat%'`)
      expect(Number(probe.rows[0].n)).toBe(1)
      expect(M08).toContain('20261108000000 requires 20261107000000')
    })

    test('with history in place, it changes nothing that already exists', async () => {
      const adminOwner = await user(true)
      const docA = await upload(adminOwner)
      const run = await replayRun(adminOwner, docA) // the Production shape: admin UAT, no marker
      expect(run.result).toBe('created')
      replayRunId = run.run_id
      const before = await snapshot()
      const rowBefore = await runRow(replayRunId)
      await admin.query(M08)
      expect(await snapshot()).toEqual(before)
      expect(await runRow(replayRunId)).toEqual(rowBefore)
      expect(verifyRunRow(rowBefore, adminOwner, docA)).toBeNull()
    })

    test('the replay path still works beside it, and its CHECKs still refuse v3', async () => {
      const adminOwner = await user(true)
      const docId = await upload(adminOwner)
      const run = await replayRun(adminOwner, docId)
      expect(run.result).toBe('created')
      const v3 = await envelope(docId, adminOwner)
      const logId = await log(docId, adminOwner)
      expect(await fail(svc.query('SELECT * FROM public.creator_record_v2_record_examination($1, $2)', [logId, canonicalJson(v3)]))).toBe('examination_envelope_invalid')
      expect(await count()).toBe(0)
    })

    test('privileges: no API role can write; only service_role reads and executes', async () => {
      const anon = await connect('anon')
      const authed = await connect('authenticated')
      for (const c of [anon, authed]) {
        expect(await fail(c.query(`SELECT * FROM ${ATTEMPTS}`))).toContain('permission denied')
        expect(await fail(c.query(`SELECT public.creator_record_v2_record_live_examination(1, '{}')`))).toContain('permission denied')
      }
      expect(await fail(svc.query(`INSERT INTO ${ATTEMPTS} (attempt_number) VALUES (1)`))).toContain('permission denied')
      expect(await fail(svc.query(`UPDATE ${ATTEMPTS} SET attempt_number = 1`))).toContain('permission denied')
      expect(await fail(svc.query(`DELETE FROM ${ATTEMPTS}`))).toContain('permission denied')
      expect(await fail(svc.query(`TRUNCATE ${ATTEMPTS}`))).toContain('permission denied')
      await expect(svc.query(`SELECT count(*) FROM ${ATTEMPTS}`)).resolves.toBeDefined()
      expect((await admin.query(`SELECT relrowsecurity r FROM pg_class WHERE oid = '${ATTEMPTS}'::regclass`)).rows[0].r).toBe(true)
    })
  })

  describe('without the isolated-test marker (the Production shape)', () => {
    test('nothing is stored, for an administrator or anyone else, and the API roles cannot create the marker', async () => {
      const adminOwner = await user(true)
      const docId = await upload(adminOwner)
      const e = await envelope(docId, adminOwner)
      const logId = await log(docId, adminOwner) // the admin UAT read path is valid here; this write is not
      expect(await fail(record(logId, canonicalJson(e)))).toBe('examination_environment_not_authorized')
      expect(await count()).toBe(0)
      expect(await fail(svc.query(`INSERT INTO public.creator_record_v2_examination_environment (environment_kind, supabase_project_ref, established_by, reason) VALUES ('isolated_synthetic_test', 'x', 'x', 'x')`))).toContain('permission denied')
    })
  })

  describe('with the marker', () => {
    beforeAll(establish)

    test('a mocked reading is stored, reads back and verifies, and the database computes the same key', async () => {
      const { owner, docId } = await fresh()
      const e = await envelope(docId, owner)
      const r = await store(docId, owner, e)
      expect(r.result).toBe('created')
      const row = (await admin.query(`SELECT * FROM ${ATTEMPTS} WHERE id = $1`, [r.attempt_id])).rows[0] as LiveAttemptRow
      expect(row).toMatchObject({ attempt_number: 1, execution_origin: 'mock_test', envelope_version: 3, provider: 'test_double', outcome_status: 'examined', outcome_reason: null })
      expect(verifyLiveAttemptRow({ ...row, access_log_id: Number(row.access_log_id) }, owner, docId)).toBeNull()
      expect(row.envelope_canonical).toBe(canonicalJson(e))
    })

    test('live_model is refused outright, even as a complete and internally consistent envelope', async () => {
      const { owner, docId } = await fresh()
      const m = await envelope(docId, owner, ['timeout'])
      const executor = { mode: 'live_model', provider: 'anthropic', model: 'a-real-model-name' } as const
      const key = liveExaminationKey({ document_id: docId, sha256: F.sha256, profile: m.profile, executor })
      const live = { ...m, examination_key: key, execution_origin: 'live_model', executor, content_class: 'customer_document', limitations: ['observations_not_verified'], provenance: { ...m.provenance, provider_response_id: null } }
      expect(parseLiveEnvelope(live)).not.toBeNull()
      const logId = await log(docId, owner)
      expect(await fail(record(logId, canonicalJson(live)))).toBe('live_examination_not_authorized')
      expect(await fail(record(logId, canonicalJson({ ...m, execution_origin: 'live_model' })))).toBe('live_examination_not_authorized')
      expect(await fail(record(logId, canonicalJson({ ...m, executor })))).toBe('live_examination_not_authorized')
      expect(await count('document_id = $1', [docId])).toBe(0)
      // The table refuses it too, whoever writes.
      expect(await fail(admin.query(`INSERT INTO ${ATTEMPTS} (attempt_number, examination_key, document_id, user_id, document_sha256, envelope_version, execution_origin, content_class, profile_id, profile_version, schema_version, prompt_version, executor_mode, provider, model, outcome_status, executed_at, envelope_canonical, envelope_sha256, access_log_id)
        VALUES (1, $1, $2, $3, $1, 3, 'live_model', 'known_synthetic_fixture', 'receipt', 1, 's', 'p', 'mock_test', 'test_double', 'mock-model-test-only', 'examined', '2026-11-06T00:00:00.000Z', '{}', $1, $4)`, [key, docId, owner, logId]))).toContain('check constraint')
    })

    test('a mocked attempt must be about a committed synthetic fixture', async () => {
      const owner = await user()
      const other = 'c'.repeat(64)
      const docId = await upload(owner, other)
      const e = await envelope(docId, owner)
      const key = liveExaminationKey({ document_id: docId, sha256: other, profile: e.profile, executor: e.executor })
      const rebound = { ...e, document: { ...e.document, sha256: other }, examination_key: key, observations: e.observations.map((o) => ({ ...o, observation_id: key.slice(0, 16) + o.observation_id.slice(16), source: { document_sha256: other, location: null } })) }
      const logId = await log(docId, owner)
      expect(await fail(record(logId, canonicalJson(rebound)))).toBe('live_examination_content_not_recognized')
    })

    test('malformed, relabelled or replay envelopes are refused', async () => {
      const { owner, docId } = await fresh()
      const e = await envelope(docId, owner)
      const logId = await log(docId, owner)
      const invalid: unknown[] = [
        { ...e, extra: 1 },
        { ...e, envelope: { ...e.envelope, version: 2 } },
        { ...e, envelope: { ...e.envelope, version: 4 } },
        { ...e, execution_origin: 'fixture_replay' },
        { ...e, identity: 'recording_bound' },
        { ...e, content_class: 'customer_document' },
        { ...e, workflow_authorization: 'authorized' },
        { ...e, executed_at: 'yesterday' },
        { ...e, executor: { ...e.executor, provider: 'anthropic' } },
        { ...e, executor: { ...e.executor, model: 'a-real-model-name' } },
        { ...e, executor: { ...e.executor, extra: 1 } },
        { ...e, outcome: { status: 'examined', reason: 'model_timeout' } },
        { ...e, outcome: { status: 'could_not_examine', reason: 'model_timeout' } },
        { ...e, outcome: { status: 'could_not_examine', reason: 'model_error' } },
        { ...e, limitations: ['observations_not_verified'] },
        { ...e, limitations: [...e.limitations, 'recorded_test_data_not_model_output'] },
        { ...e, limitations: [...e.limitations, e.limitations[0]] },
        { ...e, observations: e.observations.map((o, i) => (i === 0 ? { ...o, verification: 'verified' } : o)) },
        { ...e, observations: e.observations.map((o, i) => (i === 0 ? { ...o, origin: 'live_model_extracted' } : o)) },
        { ...e, observations: e.observations.map((o, i) => (i === 0 ? { ...o, conclusion: 'cleared' } : o)) },
        { ...e, observations: e.observations.map((o, i) => (i === 0 ? { ...o, source: { document_sha256: 'a'.repeat(64), location: null } } : o)) },
        { ...e, observations: e.observations.map((o, i) => (i === 0 ? { ...o, observation_id: 'x:y:0' } : o)) },
        { ...e, observations: [e.observations[0], e.observations[0]] },
        { ...e, provenance: { ...e.provenance, model_calls: 0, prompt_sent: false } },
        { ...e, provenance: { ...e.provenance, prompt_sent: false } },
        { ...e, provenance: { ...e.provenance, provider_response_id: null } },
        { ...e, provenance: { ...e.provenance, provider_response_id: 'msg_real' } },
        { ...e, provenance: { ...e.provenance, integrity: 'unchecked' } },
        [],
        'not json at all',
      ]
      for (const x of invalid) {
        const text = typeof x === 'string' ? x : canonicalJson(x)
        expect(await fail(record(logId, text))).toBe('live_examination_envelope_invalid')
      }
      // With no observations to expose it first, a wrong key meets the recomputation itself.
      const failed = await envelope(docId, owner, ['timeout'])
      expect(await fail(record(logId, canonicalJson({ ...failed, examination_key: 'a'.repeat(64) })))).toBe('live_examination_key_mismatch')
      expect(await fail(record(logId, canonicalJson({ ...failed, profile: { ...failed.profile, version: 2 } })))).toBe('live_examination_key_mismatch')
      expect(await count('document_id = $1', [docId])).toBe(0)
    })

    test('the access log and the document must match', async () => {
      const a = await fresh()
      const b = await fresh()
      const e = await envelope(a.docId, a.owner)
      const text = canonicalJson(e)
      expect(await fail(record(await log(b.docId, b.owner), text))).toBe('live_examination_access_not_logged') // another document's read
      expect(await fail(record(999999999, text))).toBe('live_examination_access_not_logged')
      expect(await fail(record(await log(a.docId, a.owner, { purpose: 'file_download' }), text))).toBe('live_examination_access_not_logged')
      // The log's time is the server's, so only the operator role can age one.
      const stale = await log(a.docId, a.owner)
      await admin.query('ALTER TABLE public.creator_record_v2_evidence_access_log DISABLE TRIGGER USER')
      await admin.query(`UPDATE public.creator_record_v2_evidence_access_log SET accessed_at = now() - interval '20 minutes' WHERE id = $1`, [stale])
      await admin.query('ALTER TABLE public.creator_record_v2_evidence_access_log ENABLE TRIGGER USER')
      expect(await fail(record(stale, text))).toBe('live_examination_access_not_logged')
      // A log used once cannot be used again, and neither can one a replay run consumed.
      const logId = await log(a.docId, a.owner)
      await record(logId, text)
      const c = await fresh()
      const failed = canonicalJson(await envelope(c.docId, c.owner, ['timeout']))
      const reused = await log(c.docId, c.owner)
      await record(reused, failed)
      expect(await fail(record(reused, failed))).toBe('live_examination_access_not_logged')
      // Far-future and stale execution times.
      const d = await fresh()
      const when = await envelope(d.docId, d.owner)
      expect(await fail(record(await log(d.docId, d.owner), canonicalJson({ ...when, executed_at: '2099-01-01T00:00:00.000Z' })))).toBe('live_examination_envelope_invalid')
      expect(await fail(record(await log(d.docId, d.owner), canonicalJson({ ...when, executed_at: '2020-01-01T00:00:00.000Z' })))).toBe('live_examination_envelope_invalid')
      // A document that is not exactly what the envelope names.
      const size = canonicalJson({ ...when, document: { ...when.document, byte_size: when.document.byte_size + 1 } })
      expect(await fail(record(await log(d.docId, d.owner), size))).toBe('live_examination_document_mismatch')
    })

    test('one reading: the same reading returns the first, a different reading is a conflict, and neither overwrites', async () => {
      const { owner, docId } = await fresh()
      const e = await envelope(docId, owner)
      const first = await store(docId, owner, e)
      expect(await store(docId, owner, e)).toEqual({ attempt_id: first.attempt_id, result: 'existing' })
      expect(await fail(store(docId, owner, await envelope(docId, owner, [{ output: OTHER_OUTPUT }])))).toBe('live_examination_conflict')
      expect(await fail(store(docId, owner, await envelope(docId, owner, ['timeout'])))).toBe('live_examination_conflict')
      expect(await count('document_id = $1', [docId])).toBe(1)
      expect((await admin.query(`SELECT envelope_canonical c FROM ${ATTEMPTS} WHERE document_id = $1`, [docId])).rows[0].c).toBe(canonicalJson(e))
    })

    test('two racing writes: exactly one reading, the other refused', async () => {
      const { owner, docId } = await fresh()
      const c2 = await connect('service_role')
      const a = canonicalJson(await envelope(docId, owner))
      const b = canonicalJson(await envelope(docId, owner, [{ output: OTHER_OUTPUT }]))
      const [la, lb] = [await log(docId, owner), await log(docId, owner)]
      const results = await Promise.all([fail(record(la, a, svc)), fail(record(lb, b, c2))])
      expect(results.sort()).toEqual(['live_examination_conflict', 'no error'])
      expect(await count(`document_id = $1 AND outcome_status = 'examined'`, [docId])).toBe(1)
    })

    test('a write waits for an uncommitted one, then sees it, so the loser gets the closed refusal and not a raw key error', async () => {
      const { owner, docId } = await fresh()
      const c2 = await connect('service_role')
      const a = canonicalJson(await envelope(docId, owner))
      const b = canonicalJson(await envelope(docId, owner, [{ output: OTHER_OUTPUT }]))
      const [la, lb] = [await log(docId, owner), await log(docId, owner)]
      await c2.query('BEGIN')
      await record(la, a, c2)
      const waiting = fail(record(lb, b, svc))
      await new Promise((r) => setTimeout(r, 300))
      await c2.query('COMMIT')
      expect(await waiting).toBe('live_examination_conflict')
      expect(await count('document_id = $1', [docId])).toBe(1)
    })

    test('the unique index forbids a second reading even past the function', async () => {
      const { owner, docId } = await fresh()
      await store(docId, owner, await envelope(docId, owner))
      const logId = await log(docId, owner)
      await expect(admin.query(`INSERT INTO ${ATTEMPTS} (attempt_number, examination_key, document_id, user_id, document_sha256, envelope_version, execution_origin, content_class, profile_id, profile_version, schema_version, prompt_version, executor_mode, provider, model, outcome_status, executed_at, envelope_canonical, envelope_sha256, access_log_id)
        SELECT 2, examination_key, document_id, user_id, document_sha256, 3, execution_origin, content_class, profile_id, profile_version, schema_version, prompt_version, executor_mode, provider, model, 'examined', executed_at, envelope_canonical, envelope_sha256, $2 FROM ${ATTEMPTS} WHERE document_id = $1`, [docId, logId])).rejects.toThrow('one_reading')
    })

    test('failures are kept and capped; a reading may follow a failure; a file-dependent failure is final', async () => {
      const a = await fresh()
      const failed = await envelope(a.docId, a.owner, ['timeout'])
      expect(failed.outcome.status).toBe('could_not_examine')
      await store(a.docId, a.owner, failed)
      await store(a.docId, a.owner, await envelope(a.docId, a.owner, ['provider_failure']))
      const reading = await store(a.docId, a.owner, await envelope(a.docId, a.owner))
      expect(reading.result).toBe('created')
      expect((await admin.query(`SELECT attempt_number n, outcome_status s FROM ${ATTEMPTS} WHERE document_id = $1 ORDER BY 1`, [a.docId])).rows).toEqual([{ n: 1, s: 'could_not_examine' }, { n: 2, s: 'could_not_examine' }, { n: 3, s: 'examined' }])

      const b = await fresh()
      for (let i = 0; i < 3; i++) await store(b.docId, b.owner, await envelope(b.docId, b.owner, ['timeout']))
      expect(await fail(store(b.docId, b.owner, await envelope(b.docId, b.owner)))).toBe('live_examination_attempts_exhausted')
      expect(await fail(store(b.docId, b.owner, await envelope(b.docId, b.owner, ['timeout'])))).toBe('live_examination_attempts_exhausted')

      const c = await fresh()
      const m = await envelope(c.docId, c.owner, ['timeout'])
      await store(c.docId, c.owner, { ...m, outcome: { status: 'could_not_examine', reason: 'file_too_large' } })
      expect(await fail(store(c.docId, c.owner, await envelope(c.docId, c.owner)))).toBe('live_examination_not_retryable')
      expect(await count('document_id = $1', [c.docId])).toBe(1)
    })

    test('attempts are append-only, for every role', async () => {
      const { owner, docId } = await fresh()
      await store(docId, owner, await envelope(docId, owner))
      expect(await fail(admin.query(`UPDATE ${ATTEMPTS} SET outcome_status = 'could_not_examine' WHERE document_id = $1`, [docId]))).toContain('append-only')
      expect(await fail(admin.query(`DELETE FROM ${ATTEMPTS} WHERE document_id = $1`, [docId]))).toContain('append-only')
    })

    test('the first stored replay run is still byte-identical and verifies', async () => {
      const row = await runRow(replayRunId)
      expect(verifyRunRow(row, row.user_id, row.document_id)).toBeNull()
    })
  })

  describe('rollback', () => {
    test('the documented statements refuse while attempts exist, and restore the exact prior schema once empty', async () => {
      const rollback = M08.split('\n').filter((l) => l.startsWith('--   D')).map((l) => l.slice(5)).join('\n')
      expect(rollback).toContain('DROP TABLE public.creator_record_v2_live_examination_attempts')
      expect(await fail(admin.query(rollback))).toContain('live attempts exist')
      // A disposable database can be emptied by the operator role; that is not available to the service role.
      await admin.query(`ALTER TABLE ${ATTEMPTS} DISABLE TRIGGER USER`)
      await admin.query(`DELETE FROM ${ATTEMPTS}`)
      await admin.query(`ALTER TABLE ${ATTEMPTS} ENABLE TRIGGER USER`)
      const before = await snapshot()
      await admin.query(rollback)
      expect(await snapshot()).toEqual(before)
      expect(Number((await admin.query(`SELECT count(*) n FROM pg_class WHERE relname LIKE '%live_examination%'`)).rows[0].n)).toBe(0)
      const row = await runRow(replayRunId)
      expect(verifyRunRow(row, row.user_id, row.document_id)).toBeNull()
    })
  })
})
