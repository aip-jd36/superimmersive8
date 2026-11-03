/**
 * CR-V2-EXAM-INTEGRATION-X2 — the creator examination service end to end on real PostgreSQL 15: the committed service
 * (`requestCustomerExamination` / `customerExaminationHistory`), the unchanged adapter and replay core, through a
 * test-only pg-backed port that MIRRORS lib/creator-record-flow/examination-production.ts (same tables, columns and
 * write function), against the migrations applied verbatim.
 *
 * Proves: on the schema Production has today (through 20261105000000), the creator path has NO examination authority —
 * refused with nothing read, logged or stored — and an active operator_seed grant does not lend it any; with
 * 20261106000000 a customer_path_uat grant lets exactly its test identity examine exactly its own upload, stamped
 * customer_path_synthetic_uat, and nothing else (other identities, other documents, revoked grants); history is
 * own-document only and never shows an operator-seeded run.
 *
 * NOT covered: supabase-js, PostgREST, Supabase Storage (objects come from an in-memory map), the HTTP route (unit
 * tested). Stand-in fixtures are registered by the operator connection, as the adapter suite does.
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
import { defaultProfileRegistry, knownFixtureRegistry, replayExecutor } from '@/lib/creator-record/examination/replay-executor'
import { classifyDatabaseError, ExaminationPortError, PERSISTED_RUN_COLUMNS, type ExaminationStoragePorts, type PersistedRunRow } from '@/lib/creator-record/examination/persistence'
import { customerExaminationHistory, examinationProjectionFor, requestCustomerExamination, type CustomerExaminationDeps } from '@/lib/creator-record/customer-flow/examination'

const URL = process.env.DATABASE_URL_TEST
const DIR = join(__dirname, '..', '..', 'supabase', 'migrations')
const THROUGH_05 = [
  '20261021000000_payment_fulfillments.sql',
  '20261022000000_payment_zero_total_paid.sql',
  '20261028000000_creator_record_artifacts.sql',
  '20261101000000_creator_record_v2_prepared.sql',
  '20261102000000_creator_record_v2_submission_binding.sql',
  '20261103000000_creator_record_v2_evidence.sql',
  '20261104000000_creator_record_v2_examination_runs.sql',
  '20261105000000_creator_record_v2_operator_synthetic_uat.sql',
].map((f) => join(DIR, f))
const M06 = join(DIR, '20261106000000_creator_record_v2_customer_path_uat.sql')
const BOOTSTRAP = join(__dirname, 'bootstrap.sql')
const GRANTS = 'public.creator_record_v2_examination_uat_grants'
const PROD_REF = 'lehqgcgnenwdmuzudbrs'
const CONSENT = 'DRAFT-UNAPPROVED-cr-v2-evidence-storage-consent-0'

function assertDisposable(url: string) {
  const u = new globalThis.URL(url)
  const db = u.pathname.replace(/^\//, '')
  if (!db.startsWith('si8_test_')) throw new Error(`refusing to run: database "${db}" is not si8_test_*`)
  if (!['localhost', '127.0.0.1', '::1', '[::1]'].includes(u.hostname)) throw new Error(`refusing to run: host "${u.hostname}" is not a local disposable database`)
}
if (process.env.CI && !URL) throw new Error('DATABASE_URL_TEST is required in CI — the customer examination DB suite must not be skipped')
const maybe = URL ? describe : describe.skip

const sha = (b: Uint8Array) => createHash('sha256').update(b).digest('hex')
const standIn = (id: string) => new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, ...Buffer.from(`customer-standin:${id}`)])
const FIX = (id: string) => REPLAY_FIXTURES.find((f) => f.fixture_id === id)!

maybe('creator record v2 customer examination (PostgreSQL)', () => {
  let admin: Client
  let svc: Client
  const objects = new Map<string, Uint8Array>()
  const reads: string[] = []
  const standIns: ReplayFixture[] = []

  const pgStorage = (): ExaminationStoragePorts => ({
    async getDocument(id) {
      try {
        return ((await svc.query('SELECT id, user_id, sha256, media_type, byte_size, state FROM public.creator_record_v2_documents WHERE id = $1', [id])).rows[0] as ExaminationDocumentRecord | undefined) ?? null
      } catch { throw new ExaminationPortError('get_document', null) }
    },
    async logExaminationRead(documentId, owner) {
      try {
        return Number((await svc.query(`INSERT INTO public.creator_record_v2_evidence_access_log (document_id, actor_user_id, actor_role, purpose) VALUES ($1, $2, 'owner', 'examination') RETURNING id`, [documentId, owner])).rows[0].id)
      } catch (e) { throw new ExaminationPortError('log_read', classifyDatabaseError(e as { code?: string; message?: string })) }
    },
    async readObject(r) {
      reads.push(r.id)
      return objects.get(`${r.user_id}/${r.id}`) ?? null
    },
    async recordExamination(logId, text) {
      try {
        const row = (await svc.query('SELECT run_id, result FROM public.creator_record_v2_record_examination($1, $2)', [logId, text])).rows[0]
        return { run_id: row.run_id, result: row.result }
      } catch (e) { throw new ExaminationPortError('record', classifyDatabaseError(e as { code?: string; message?: string })) }
    },
    async listRuns(owner, documentId) {
      try {
        return (await svc.query(`SELECT ${PERSISTED_RUN_COLUMNS} FROM public.creator_record_v2_examination_runs WHERE user_id = $1 AND document_id = $2`, [owner, documentId])).rows
          .map((r) => ({ ...r, access_log_id: Number(r.access_log_id), created_at: new Date(r.created_at).toISOString() })) as PersistedRunRow[]
      } catch { throw new ExaminationPortError('list_runs', null) }
    },
  })
  /** The service exactly as production wires it, but with submissions OPEN (the code constant is 'stopped'). */
  const deps = (): CustomerExaminationDeps => {
    const table = buildReplayTable(standIns)
    return {
      submissions: 'open',
      hasPilotAccess: async (id) => (await svc.query('SELECT 1 FROM public.creator_record_v2_pilot_access WHERE user_id = $1', [id])).rowCount === 1,
      adapter: { storage: pgStorage(), core: { fixtures: knownFixtureRegistry(table), executor: replayExecutor(table), profiles: defaultProfileRegistry() } },
    }
  }
  async function user(invited = true) {
    const id = randomUUID()
    await admin.query('INSERT INTO public.users (id, email, name) VALUES ($1, $2, $3)', [id, `${id}@example.test`, 'Tester'])
    if (invited) await admin.query(`INSERT INTO public.creator_record_v2_pilot_access (user_id, added_by, reason) VALUES ($1, 'db test operator', 'X2 test')`, [id])
    return id
  }
  /** The DOC-1 intake as the service role writes it: owner upload, consent recorded, pending → stored, object kept. */
  async function upload(owner: string, fixtureId = 'pdf-kling-pro-monthly') {
    const bytes = standIn(fixtureId)
    const id = randomUUID()
    await svc.query(`INSERT INTO public.creator_record_v2_documents (id, user_id, sha256, media_type, byte_size, file_name, storage_path, consent_version, state) VALUES ($1, $2, $3, 'image/png', $4, 'r', $5, $6, 'pending')`, [id, owner, sha(bytes), bytes.length, `${owner}/${id}`, CONSENT])
    await svc.query(`UPDATE public.creator_record_v2_documents SET state = 'stored', stored_at = now() WHERE id = $1`, [id])
    objects.set(`${owner}/${id}`, bytes)
    return id
  }
  async function grant(owner: string, kind?: 'customer_path_uat', fixtureId = 'pdf-kling-pro-monthly') {
    const r = await admin.query(
      `INSERT INTO ${GRANTS} (${kind ? 'grant_kind, ' : ''}test_user_id, document_sha256, supabase_project_ref, binding_nonce_sha256, established_by, reason, change_ref, expires_at, max_read_events)
       VALUES (${kind ? `'${kind}', ` : ''}$1, $2, $3, $4, 'db test operator', 'X2 test', 'TEST-X2', now() + interval '1 hour', 4) RETURNING id`,
      [owner, sha(standIn(fixtureId)), PROD_REF, sha(Buffer.from(randomUUID()))],
    )
    return r.rows[0].id as string
  }
  const revokeAll = () => admin.query(`UPDATE ${GRANTS} SET revoked_at = now(), revoked_by = 'db test operator', revoke_reason = 'test reset' WHERE revoked_at IS NULL`)
  const count = async (sql: string, p: unknown[] = []) => Number((await admin.query(sql, p)).rows[0].n)

  async function schema(files: string[]) {
    await admin.query('DROP SCHEMA IF EXISTS public CASCADE')
    await admin.query('CREATE SCHEMA public')
    await admin.query(readFileSync(BOOTSTRAP, 'utf8'))
    await admin.query('DROP SCHEMA IF EXISTS storage CASCADE')
    await admin.query('CREATE SCHEMA storage; CREATE TABLE storage.buckets (id text PRIMARY KEY, name text NOT NULL, public boolean, file_size_limit bigint, allowed_mime_types text[])')
    for (const m of files) await admin.query(readFileSync(m, 'utf8'))
    if (files.length > 0) for (const s of standIns)
      await admin.query('INSERT INTO public.creator_record_v2_synthetic_fixtures (sha256, fixture_set, fixture_id, recording_sha256) VALUES ($1, $2, $3, $4)', [s.sha256, REPLAY_SET_VERSION, s.fixture_id, sha256Hex(canonicalJson(FIX(s.fixture_id.replace(/^standin-/, '')).parsed_output))])
  }

  beforeAll(async () => {
    assertDisposable(URL as string)
    admin = new Client({ connectionString: URL })
    await admin.connect()
    for (const id of ['pdf-kling-pro-monthly', 'pdf-runway-standard-monthly']) standIns.push({ ...FIX(id), fixture_id: `standin-${id}`, sha256: sha(standIn(id)) })
    await schema([])
    svc = new Client({ connectionString: URL })
    await svc.connect()
    await svc.query('SET ROLE service_role')
  })
  afterAll(async () => {
    await svc?.end()
    await admin?.end()
  })

  describe('on the schema Production has today (through 20261105000000)', () => {
    beforeAll(async () => { await schema(THROUGH_05) })

    test('NO AUTHORITY: an invited creator’s own stored upload is refused; nothing is read, logged or stored', async () => {
      const owner = await user()
      const doc = await upload(owner)
      expect(await requestCustomerExamination(deps(), owner, doc)).toEqual({ ok: false, status: 409, code: 'examination_not_permitted' })
      expect(reads).not.toContain(doc)
      expect(await count('SELECT count(*) n FROM public.creator_record_v2_evidence_access_log WHERE document_id = $1', [doc])).toBe(0)
      expect(await count('SELECT count(*) n FROM public.creator_record_v2_examination_runs')).toBe(0)
      expect(await customerExaminationHistory(deps(), owner, doc)).toEqual({ ok: true, runs: [] })
    })

    test('an active operator_seed grant lends the creator path nothing: its own upload is refused (not the seeded document)', async () => {
      const operatorIdentity = await user(false)
      await grant(operatorIdentity)
      const owner = await user()
      const doc = await upload(owner)
      expect(await requestCustomerExamination(deps(), owner, doc)).toEqual({ ok: false, status: 409, code: 'examination_not_permitted' })
      expect(reads).not.toContain(doc)
      await revokeAll()
    })
  })

  describe('with 20261106000000 and a customer_path_uat grant', () => {
    beforeAll(async () => { await schema([...THROUGH_05, M06]) })
    beforeEach(async () => { await revokeAll() })

    test('the grant’s test identity examines its own upload once: customer_path_synthetic_uat; idempotent; own history verified', async () => {
      const owner = await user()
      const grantId = await grant(owner, 'customer_path_uat')
      const doc = await upload(owner)
      const r = await requestCustomerExamination(deps(), owner, doc)
      expect(r).toMatchObject({ ok: true, result: 'created' })
      const run = (await admin.query('SELECT execution_boundary, uat_grant_id, user_id, document_id FROM public.creator_record_v2_examination_runs WHERE id = $1', [(r as { run_id: string }).run_id])).rows[0]
      expect(run).toEqual({ execution_boundary: 'customer_path_synthetic_uat', uat_grant_id: grantId, user_id: owner, document_id: doc })
      expect(await requestCustomerExamination(deps(), owner, doc)).toMatchObject({ ok: true, result: 'existing', run_id: (r as { run_id: string }).run_id })
      const h = await customerExaminationHistory(deps(), owner, doc)
      expect(h.ok && h.runs.map((x) => [x.run_id, x.envelope.document.document_id, x.envelope.observations.every((o) => o.verification === 'not_verified')])).toEqual([[(r as { run_id: string }).run_id, doc, true]])
      // CR-V2-EXAM-INTEGRATION-X3: the prepare flow's projection of that persisted run, from the real tables.
      const projected = await examinationProjectionFor(pgStorage(), owner, doc)
      expect(projected.kind === 'projection' && [projected.projection.run_id, projected.projection.verification, projected.projection.execution_boundary, projected.projection.envelope.document.document_id])
        .toEqual([(r as { run_id: string }).run_id, 'not_verified', 'customer_path_synthetic_uat', doc])
      // Another creator can neither examine nor read it.
      const other = await user()
      expect(await examinationProjectionFor(pgStorage(), other, doc)).toEqual({ kind: 'none' })
      expect(await requestCustomerExamination(deps(), other, doc)).toEqual({ ok: false, status: 404, code: 'not_found' })
      expect(await customerExaminationHistory(deps(), other, doc)).toEqual({ ok: false, status: 404, code: 'not_found' })
    })

    test('RUN IDENTITY: a temporary failure, its retry and a repeated request converge on ONE run (no conflicting second run)', async () => {
      const owner = await user()
      const grantId = await grant(owner, 'customer_path_uat')
      const doc = await upload(owner)
      // 1. Temporary failure after the audit event (the write path is unavailable once): nothing persisted.
      const base = deps()
      const flaky: CustomerExaminationDeps = { ...base, adapter: { ...base.adapter, storage: { ...base.adapter.storage, async recordExamination() { throw new ExaminationPortError('record', null) } } } }
      expect(await requestCustomerExamination(flaky, owner, doc)).toEqual({ ok: false, status: 503, code: 'unavailable' })
      expect(await count('SELECT count(*) n FROM public.creator_record_v2_examination_runs WHERE document_id = $1', [doc])).toBe(0)
      // 2. Retry: created. 3. Repeated request: the same run, 'existing'.
      const first = await requestCustomerExamination(deps(), owner, doc)
      expect(first).toMatchObject({ ok: true, result: 'created' })
      const again = await requestCustomerExamination(deps(), owner, doc)
      expect(again).toEqual({ ok: true, result: 'existing', run_id: (first as { run_id: string }).run_id })
      expect(await count('SELECT count(*) n FROM public.creator_record_v2_examination_runs WHERE document_id = $1', [doc])).toBe(1)
      // Each attempt is audited (3 reads of the grant's 4); the run budget (1) was never exceeded.
      expect(await count('SELECT count(*) n FROM public.creator_record_v2_evidence_access_log WHERE uat_grant_id = $1', [grantId])).toBe(3)
      // 4. The prepare flow can still carry it: exactly one run, the same one.
      const p = await examinationProjectionFor(pgStorage(), owner, doc)
      expect(p.kind === 'projection' && p.projection.run_id).toBe((first as { run_id: string }).run_id)
      // 5. The read budget then ends further attempts; still one run, nothing stranded.
      expect(await requestCustomerExamination(deps(), owner, doc)).toEqual({ ok: true, result: 'existing', run_id: (first as { run_id: string }).run_id })
      expect(await requestCustomerExamination(deps(), owner, doc)).toEqual({ ok: false, status: 409, code: 'examination_not_permitted' })
      expect(await count('SELECT count(*) n FROM public.creator_record_v2_examination_runs WHERE document_id = $1', [doc])).toBe(1)
    })

    test('MISMATCH fails closed: another invited creator’s own upload, the identity’s other bytes, and anything after revocation', async () => {
      const owner = await user()
      await grant(owner, 'customer_path_uat')
      const stranger = await user()
      const strangerDoc = await upload(stranger)
      expect(await requestCustomerExamination(deps(), stranger, strangerDoc)).toEqual({ ok: false, status: 409, code: 'examination_not_permitted' })
      const otherBytes = await upload(owner, 'pdf-runway-standard-monthly')
      expect(await requestCustomerExamination(deps(), owner, otherBytes)).toEqual({ ok: false, status: 409, code: 'examination_not_permitted' })
      const doc = await upload(owner)
      await revokeAll()
      expect(await requestCustomerExamination(deps(), owner, doc)).toEqual({ ok: false, status: 409, code: 'examination_not_permitted' })
      for (const d of [strangerDoc, otherBytes, doc]) expect(reads).not.toContain(d)
      expect(await count('SELECT count(*) n FROM public.creator_record_v2_examination_runs WHERE document_id = ANY($1)', [[strangerDoc, otherBytes, doc]])).toBe(0)
    })

    test('an operator-seeded run is never shown through the creator history (fail closed)', async () => {
      const operatorIdentity = await user(false)
      const grantId = await grant(operatorIdentity)
      const bytes = standIn('pdf-kling-pro-monthly')
      const seeded = randomUUID()
      await svc.query(`INSERT INTO public.creator_record_v2_documents (id, user_id, sha256, media_type, byte_size, file_name, storage_path, consent_version, state, origin, seed_grant_id) VALUES ($1, $2, $3, 'image/png', $4, 'f', $5, NULL, 'pending', 'operator_synthetic_seed', $6)`, [seeded, operatorIdentity, sha(bytes), bytes.length, `${operatorIdentity}/${seeded}`, grantId])
      await svc.query(`UPDATE public.creator_record_v2_documents SET state = 'stored', stored_at = now() WHERE id = $1`, [seeded])
      objects.set(`${operatorIdentity}/${seeded}`, bytes)
      // The operator path (the unchanged adapter, as the operator CLI uses it) records an operator_synthetic_uat run.
      const { examineAndRecord } = await import('@/lib/creator-record/examination/persistence')
      const op = await examineAndRecord(deps().adapter, { actor_user_id: operatorIdentity, document_id: seeded, profile: { id: 'receipt', version: 1 } })
      expect(op.kind).toBe('recorded')
      // Even if that identity were invited, the creator history refuses to show it.
      await admin.query(`INSERT INTO public.creator_record_v2_pilot_access (user_id, added_by, reason) VALUES ($1, 'db test operator', 'X2 test')`, [operatorIdentity])
      expect(await customerExaminationHistory(deps(), operatorIdentity, seeded)).toEqual({ ok: false, status: 503, code: 'unavailable' })
      // ... and the prepare flow refuses to carry it (X3).
      expect(await examinationProjectionFor(pgStorage(), operatorIdentity, seeded)).toEqual({ kind: 'unavailable', reason: 'boundary_not_customer_visible' })
    })
  })
})
