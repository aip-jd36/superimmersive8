/**
 * CR-V2-DOC-2C-C-B — the examination persistence adapter end to end on real PostgreSQL 15: the committed DOC-2B
 * core and `examineAndRecord` / `readExaminationHistory`, through a test-only pg-backed port that MIRRORS the
 * operations of lib/creator-record-flow/examination-production.ts (same tables, columns, insert values and write
 * function), against migrations 20261104000000 and 20261105000000 (CR-V2-PROD-UAT-B: the reader selects
 * uat_grant_id) applied verbatim. Everything here is the isolated-marker path; the operator-UAT grant path is proved
 * by creator-record-v2-operator-uat.db.test.ts.
 *
 * NOT covered here: supabase-js, PostgREST and Supabase Storage. Object bytes come from an in-memory map, so this
 * suite does not verify the real Supabase storage integration (the production port is only unit-tested against a
 * mocked client).
 *
 * The committed fixture FILES are git-ignored, so the core cannot hash real fixture bytes here. The operator
 * connection therefore registers stand-in fixtures (bytes, set, id and the committed recording digest) in this
 * disposable database, as an operator seeds test data. Recognition of the committed fixtures themselves is proved
 * by creator-record-v2-examination.db.test.ts.
 *
 * Disposable local `si8_test_*` database only. Skipped without DATABASE_URL_TEST (required in CI).
 */
import { readFileSync } from 'fs'
import { join } from 'path'
import { createHash, randomUUID } from 'crypto'
import { Client } from 'pg'
import { buildReplayTable, REPLAY_SET_VERSION, type ReplayFixture } from '@/lib/creator-record/evidence/replay'
import { REPLAY_FIXTURES } from '@/lib/creator-record/evidence/replay-fixtures.data'
import { canonicalJson, sha256Hex } from '@/lib/creator-record/record-core/canonical'
import type { ExaminationDocumentRecord } from '@/lib/creator-record/examination/examine-document'
import { buildProfileRegistry } from '@/lib/creator-record/examination/profile'
import { RECEIPT_PROFILE } from '@/lib/creator-record/examination/receipt-profile'
import { defaultProfileRegistry, knownFixtureRegistry, replayExecutor } from '@/lib/creator-record/examination/replay-executor'
import {
  classifyDatabaseError,
  examineAndRecord,
  ExaminationPortError,
  PERSISTED_RUN_COLUMNS,
  readExaminationHistory,
  type ExaminationAdapterDeps,
  type ExaminationStoragePorts,
  type PersistedRunRow,
} from '@/lib/creator-record/examination/persistence'

const URL = process.env.DATABASE_URL_TEST
const DIR = join(__dirname, '..', '..', 'supabase', 'migrations')
const MIGRATIONS = [
  '20261021000000_payment_fulfillments.sql',
  '20261022000000_payment_zero_total_paid.sql',
  '20261028000000_creator_record_artifacts.sql',
  '20261101000000_creator_record_v2_prepared.sql',
  '20261102000000_creator_record_v2_submission_binding.sql',
  '20261103000000_creator_record_v2_evidence.sql',
  '20261104000000_creator_record_v2_examination_runs.sql',
  '20261105000000_creator_record_v2_operator_synthetic_uat.sql',
].map((f) => join(DIR, f))
const BOOTSTRAP = join(__dirname, 'bootstrap.sql')

function assertDisposable(url: string) {
  const u = new globalThis.URL(url)
  const db = u.pathname.replace(/^\//, '')
  if (!db.startsWith('si8_test_')) throw new Error(`refusing to run: database "${db}" is not si8_test_*`)
  if (!['localhost', '127.0.0.1', '::1', '[::1]'].includes(u.hostname)) throw new Error(`refusing to run: host "${u.hostname}" is not a local disposable database`)
}
if (process.env.CI && !URL) throw new Error('DATABASE_URL_TEST is required in CI — the examination adapter DB suite must not be skipped')
const maybe = URL ? describe : describe.skip

const sha = (b: Uint8Array) => createHash('sha256').update(b).digest('hex')
const standIn = (id: string) => new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, ...Buffer.from(`adapter-standin:${id}`)])
const FIX = (id: string) => REPLAY_FIXTURES.find((f) => f.fixture_id === id)!

maybe('creator record v2 examination adapter (PostgreSQL)', () => {
  let admin: Client
  let svc: Client
  const objects = new Map<string, Uint8Array>()
  const reads: string[] = []
  const standIns: ReplayFixture[] = []

  /** The same statements as the Supabase production port, over a service_role pg connection. */
  const pgStorage = (c: () => Client): ExaminationStoragePorts => ({
    async getDocument(id) {
      try {
        return ((await c().query('SELECT id, user_id, sha256, media_type, byte_size, state FROM public.creator_record_v2_documents WHERE id = $1', [id])).rows[0] as ExaminationDocumentRecord | undefined) ?? null
      } catch { throw new ExaminationPortError('get_document', null) }
    },
    async logExaminationRead(documentId, owner) {
      try {
        return Number((await c().query(`INSERT INTO public.creator_record_v2_evidence_access_log (document_id, actor_user_id, actor_role, purpose) VALUES ($1, $2, 'owner', 'examination') RETURNING id`, [documentId, owner])).rows[0].id)
      } catch (e) { throw new ExaminationPortError('log_read', classifyDatabaseError(e as { code?: string; message?: string })) }
    },
    async readObject(r) {
      reads.push(r.id)
      return objects.get(`${r.user_id}/${r.id}`) ?? null
    },
    async recordExamination(logId, text) {
      try {
        const row = (await c().query('SELECT run_id, result FROM public.creator_record_v2_record_examination($1, $2)', [logId, text])).rows[0]
        return { run_id: row.run_id, result: row.result }
      } catch (e) { throw new ExaminationPortError('record', classifyDatabaseError(e as { code?: string; message?: string })) }
    },
    async listRuns(owner, documentId) {
      try {
        return (await c().query(`SELECT ${PERSISTED_RUN_COLUMNS} FROM public.creator_record_v2_examination_runs WHERE user_id = $1 AND document_id = $2`, [owner, documentId])).rows
          .map((r) => ({ ...r, access_log_id: Number(r.access_log_id), created_at: new Date(r.created_at).toISOString() })) as PersistedRunRow[]
      } catch { throw new ExaminationPortError('list_runs', null) }
    },
  })
  const deps = (over: Partial<ExaminationAdapterDeps['core']> = {}, storage?: ExaminationStoragePorts): ExaminationAdapterDeps => {
    const table = buildReplayTable(standIns)
    return { storage: storage ?? pgStorage(() => svc), core: { fixtures: knownFixtureRegistry(table), executor: replayExecutor(table), profiles: defaultProfileRegistry(), ...over } }
  }
  async function user() {
    const id = randomUUID()
    await admin.query('INSERT INTO public.users (id, email, name) VALUES ($1, $2, $3)', [id, `${id}@example.test`, 'Tester'])
    return id
  }
  /** A stored stand-in document for `fixtureId`, its object, and a request. */
  async function stored(fixtureId: string, owner?: string) {
    const o = owner ?? (await user())
    const bytes = standIn(fixtureId)
    const id = randomUUID()
    await svc.query(`INSERT INTO public.creator_record_v2_documents (id, user_id, sha256, media_type, byte_size, file_name, storage_path, consent_version, state) VALUES ($1, $2, $3, 'image/png', $4, 'r', $5, 'DRAFT-UNAPPROVED-test', 'pending')`, [id, o, sha(bytes), bytes.length, `${o}/${id}`])
    await svc.query(`UPDATE public.creator_record_v2_documents SET state = 'stored', stored_at = now() WHERE id = $1`, [id])
    objects.set(`${o}/${id}`, bytes)
    return { owner: o, docId: id, req: { actor_user_id: o, document_id: id, profile: { id: 'receipt', version: 1 } } }
  }
  const count = async (sql: string, p: unknown[] = []) => Number((await admin.query(sql, p)).rows[0].n)
  const marker = { establish: () => admin.query(`INSERT INTO public.creator_record_v2_examination_environment (environment_kind, supabase_project_ref, established_by, reason) VALUES ('isolated_synthetic_test', 'localpg15adaptertest', 'db test operator', 'isolated local test')`), remove: () => admin.query('DELETE FROM public.creator_record_v2_examination_environment') }

  beforeAll(async () => {
    assertDisposable(URL as string)
    admin = new Client({ connectionString: URL })
    await admin.connect()
    await admin.query('DROP SCHEMA IF EXISTS public CASCADE')
    await admin.query('CREATE SCHEMA public')
    await admin.query(readFileSync(BOOTSTRAP, 'utf8'))
    await admin.query('DROP SCHEMA IF EXISTS storage CASCADE')
    await admin.query('CREATE SCHEMA storage; CREATE TABLE storage.buckets (id text PRIMARY KEY, name text NOT NULL, public boolean, file_size_limit bigint, allowed_mime_types text[])')
    for (const m of MIGRATIONS) await admin.query(readFileSync(m, 'utf8'))
    svc = new Client({ connectionString: URL })
    await svc.connect()
    await svc.query('SET ROLE service_role')
    for (const id of ['pdf-pika-pro-no-period', 'pdf-kling-pro-monthly', 'shot-runway-billing-history', 'photo-kling-dim']) {
      const f = FIX(id)
      const s: ReplayFixture = { ...f, fixture_id: `standin-${id}`, sha256: sha(standIn(id)) }
      standIns.push(s)
      await admin.query('INSERT INTO public.creator_record_v2_synthetic_fixtures (sha256, fixture_set, fixture_id, recording_sha256) VALUES ($1, $2, $3, $4)', [s.sha256, REPLAY_SET_VERSION, s.fixture_id, sha256Hex(canonicalJson(f.parsed_output))])
    }
  })
  afterAll(async () => {
    await svc?.end()
    await admin?.end()
  })

  test('without the environment marker the database refuses the access event: the bytes are never read, nothing is stored', async () => {
    const { docId, req } = await stored('pdf-pika-pro-no-period')
    expect(await examineAndRecord(deps(), req)).toEqual({ kind: 'not_read', reason: 'environment_not_authorized' })
    expect(reads).not.toContain(docId)
    expect(await count('SELECT count(*) n FROM public.creator_record_v2_evidence_access_log WHERE document_id = $1', [docId])).toBe(0)
    expect(await count('SELECT count(*) n FROM public.creator_record_v2_examination_runs')).toBe(0)
  })

  describe('with the isolated environment established by the operator', () => {
    beforeAll(async () => { await marker.establish() })

    test('examine → logged read → persisted run → strictly verified read-back, all through the real contract', async () => {
      const { owner, docId, req } = await stored('pdf-pika-pro-no-period')
      const r = await examineAndRecord(deps(), req)
      expect(r.kind === 'recorded' && r.result).toBe('created')
      if (r.kind !== 'recorded') return
      const log = (await admin.query('SELECT id, purpose, actor_role, actor_user_id FROM public.creator_record_v2_evidence_access_log WHERE document_id = $1', [docId])).rows
      expect(log).toEqual([{ id: log[0].id, purpose: 'examination', actor_role: 'owner', actor_user_id: owner }])
      const run = (await admin.query('SELECT access_log_id, envelope_canonical, workflow_authorization FROM public.creator_record_v2_examination_runs WHERE id = $1', [r.run_id])).rows[0]
      expect([String(run.access_log_id), run.envelope_canonical, run.workflow_authorization]).toEqual([String(log[0].id), canonicalJson(r.envelope), 'not_established'])
      const h = await readExaminationHistory(deps().storage, owner, docId)
      expect(h).toEqual({ kind: 'verified', runs: [{ run_id: r.run_id, supersedes_id: null, created_at: expect.any(String), envelope: r.envelope }] })
    })

    test('a duplicate request is idempotent (same run) and logs a second access event', async () => {
      const { docId, req } = await stored('pdf-kling-pro-monthly')
      const a = await examineAndRecord(deps(), req)
      const b = await examineAndRecord(deps(), req)
      expect([a.kind === 'recorded' && a.result, b.kind === 'recorded' && b.result]).toEqual(['created', 'existing'])
      expect(a.kind === 'recorded' && b.kind === 'recorded' && a.run_id === b.run_id).toBe(true)
      expect(await count('SELECT count(*) n FROM public.creator_record_v2_evidence_access_log WHERE document_id = $1', [docId])).toBe(2)
      expect(await count('SELECT count(*) n FROM public.creator_record_v2_examination_runs WHERE document_id = $1', [docId])).toBe(1)
    })

    test('different bytes under an existing key are refused as a conflict and the stored run is unchanged', async () => {
      const { owner, docId, req } = await stored('shot-runway-billing-history')
      const r = await examineAndRecord(deps(), req)
      if (r.kind !== 'recorded') throw new Error(r.kind)
      const storage = pgStorage(() => svc)
      const other = canonicalJson({ ...r.envelope, provenance: { ...r.envelope.provenance, engine_attempts: 2 } })
      const err = await storage.recordExamination(await storage.logExaminationRead(docId, owner), other).catch((e) => e)
      expect(err).toBeInstanceOf(ExaminationPortError)
      expect(err.refusal).toBe('key_conflict')
      expect((await admin.query('SELECT envelope_canonical FROM public.creator_record_v2_examination_runs WHERE id = $1', [r.run_id])).rows[0].envelope_canonical).toBe(canonicalJson(r.envelope))
    })

    test('a persistence failure after the read is safe: no run, the event remains, the retry converges on one run', async () => {
      const { docId, req } = await stored('photo-kling-dim')
      const real = pgStorage(() => svc)
      let failOnce = true
      const flaky: ExaminationStoragePorts = { ...real, async recordExamination(id, t) { if (failOnce) { failOnce = false; throw new ExaminationPortError('record', null) } return real.recordExamination(id, t) } }
      const r1 = await examineAndRecord(deps({}, flaky), req)
      expect([r1.kind, r1.kind === 'not_recorded' && r1.reason]).toEqual(['not_recorded', 'persistence_unavailable'])
      expect(await count('SELECT count(*) n FROM public.creator_record_v2_examination_runs WHERE document_id = $1', [docId])).toBe(0)
      const r2 = await examineAndRecord(deps({}, flaky), req)
      expect(r2.kind === 'recorded' && r2.result).toBe('created')
      expect(await count('SELECT count(*) n FROM public.creator_record_v2_evidence_access_log WHERE document_id = $1', [docId])).toBe(2)
      expect(await count('SELECT count(*) n FROM public.creator_record_v2_examination_runs WHERE document_id = $1', [docId])).toBe(1)
    })

    test('another creator is refused by the core (no event, no read); the database also refuses a forged cross-tenant event', async () => {
      const { docId, req } = await stored('pdf-pika-pro-no-period')
      const intruder = await user()
      const before = reads.length
      expect(await examineAndRecord(deps(), { ...req, actor_user_id: intruder })).toEqual({ kind: 'refused', refusal: { kind: 'refused', stage: 'ownership', code: 'not_owner' }, read_logged: false })
      expect(reads.length).toBe(before)
      const err = await pgStorage(() => svc).logExaminationRead(docId, intruder).catch((e) => e)
      expect(err.refusal).toBe('examination_read_refused')
    })

    test('unrecognised content is refused after a logged read; nothing is recorded', async () => {
      const { docId, req } = await stored('pdf-kling-pro-monthly')
      const r = await examineAndRecord(deps({ fixtures: { isKnownSyntheticFixture: () => false } }), req)
      expect(r).toEqual({ kind: 'refused', refusal: { kind: 'refused', stage: 'content', code: 'not_a_known_synthetic_fixture' }, read_logged: true })
      expect(await count('SELECT count(*) n FROM public.creator_record_v2_examination_runs WHERE document_id = $1', [docId])).toBe(0)
    })

    test('a profile chain persists linearly and reads back in order; the read-back chooses no current run', async () => {
      const { owner, docId, req } = await stored('shot-runway-billing-history')
      for (const v of [1, 2, 3]) {
        const profiles = buildProfileRegistry([{ ...RECEIPT_PROFILE, ref: { ...RECEIPT_PROFILE.ref, version: v } }])
        const r = await examineAndRecord(deps({ profiles }), { ...req, profile: { id: 'receipt', version: v } })
        expect(r.kind === 'recorded' && r.result).toBe('created')
      }
      const h = await readExaminationHistory(deps().storage, owner, docId)
      expect(h.kind === 'verified' && h.runs.map((x) => x.envelope.profile.version)).toEqual([1, 2, 3])
      expect(Object.keys(h)).toEqual(['kind', 'runs'])
    })

    test('a row written around the write function (by the operator) is detected by the strict read-back', async () => {
      const { owner, docId, req } = await stored('photo-kling-dim')
      const r = await examineAndRecord(deps(), req)
      if (r.kind !== 'recorded') throw new Error(r.kind)
      // The operator (superuser) bypasses the write function: a copy of the real run under another profile id and
      // key, with a digest that does not match its text. Only the strict read-back can catch it.
      const event = Number((await admin.query(`INSERT INTO public.creator_record_v2_evidence_access_log (document_id, actor_user_id, actor_role, purpose) VALUES ($1, $2, 'owner', 'examination') RETURNING id`, [docId, owner])).rows[0].id)
      await admin.query(
        `INSERT INTO public.creator_record_v2_examination_runs (examination_key, document_id, user_id, document_sha256, envelope_version, content_class, workflow_authorization, execution_boundary, environment_project_ref, profile_id, profile_version, schema_version, prompt_version, executor_mode, replay_set, recording_sha256, replay_fixture_id, outcome_status, envelope_canonical, envelope_sha256, supersedes_id, access_log_id)
         SELECT $2, document_id, user_id, document_sha256, envelope_version, content_class, workflow_authorization, execution_boundary, environment_project_ref, 'receipt_forged', profile_version, schema_version, prompt_version, executor_mode, replay_set, recording_sha256, replay_fixture_id, outcome_status, envelope_canonical, $3, NULL, $4
         FROM public.creator_record_v2_examination_runs WHERE id = $1`,
        [r.run_id, '9'.repeat(64), '8'.repeat(64), event],
      )
      const h = await readExaminationHistory(deps().storage, owner, docId)
      expect([h.kind, h.kind === 'unavailable' && h.reason]).toEqual(['unavailable', 'run_integrity'])
    })

    test('when the operator removes the marker, the adapter fails closed again', async () => {
      await marker.remove()
      const { docId, req } = await stored('pdf-pika-pro-no-period')
      expect(await examineAndRecord(deps(), req)).toEqual({ kind: 'not_read', reason: 'environment_not_authorized' })
      expect(reads).not.toContain(docId)
    })
  })
})
