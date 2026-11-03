/**
 * CR-V2-EXAM-INTEGRATION-X1 — real PostgreSQL 15 tests for 20261106000000_creator_record_v2_customer_path_uat.sql, applied
 * verbatim after the DOC-1 chain, DOC-2C-B and PROD-UAT-B (20261105000000) migrations, plus rollback_20261106.sql and
 * create_customer_path_grant.sql.
 *
 * Proves: the E4-shaped operator_seed history (grant, seeded document, events, run, revocation) is byte-identical across
 * the migration and reads as operator_seed; privileges are unchanged; a customer_path_uat grant binds ONE approved
 * (pilot-invited, history-free) test identity to ONE committed fixture fingerprint and, through the first examination read,
 * to that identity's own stored owner_upload document; it can never be seeded; it keeps expiry, revocation, the read and
 * new-run budgets, the nonce and the existing exclusivity (across kinds and with the marker); default-deny without an
 * eligible grant; runs carry customer_path_synthetic_uat and pass the committed run reader; operator_seed behaviour is
 * unchanged after the migration; rollback is refused once a customer-path grant exists and otherwise restores 20261105.
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
import { buildProfileRegistry, type ExaminationProfile } from '@/lib/creator-record/examination/profile'
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
].map((f) => join(DIR, f))
const M05 = join(DIR, '20261105000000_creator_record_v2_operator_synthetic_uat.sql')
const M06 = join(DIR, '20261106000000_creator_record_v2_customer_path_uat.sql')
const BOOTSTRAP = join(__dirname, 'bootstrap.sql')
const OPERATOR = join(APP, 'supabase', 'operator', 'creator-record-v2-uat')
const PROD_REF = 'lehqgcgnenwdmuzudbrs'
const TEST_REF = 'localpg15examination'
const INTAKE_CONSENT = 'DRAFT-UNAPPROVED-cr-v2-evidence-storage-consent-0'
const GRANTS = 'public.creator_record_v2_examination_uat_grants'

function assertDisposable(url: string) {
  const u = new globalThis.URL(url)
  const db = u.pathname.replace(/^\//, '')
  if (!db.startsWith('si8_test_')) throw new Error(`refusing to run: database "${db}" is not si8_test_*`)
  if (!['localhost', '127.0.0.1', '::1', '[::1]'].includes(u.hostname)) throw new Error(`refusing to run: host "${u.hostname}" is not a local disposable database`)
}
if (process.env.CI && !URL) throw new Error('DATABASE_URL_TEST is required in CI — the creator record v2 customer-path UAT DB suite must not be skipped')
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
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
const FIX = (id: string) => REPLAY_FIXTURES.find((f) => f.fixture_id === id)!
const F = FIX('pdf-kling-pro-monthly')
const F2 = FIX('pdf-runway-standard-monthly')
type Env = ExaminationEnvelope

function standIn(id: string, media: string): Uint8Array {
  const tag = Buffer.from(`synthetic-test:${id}`)
  if (media === 'application/pdf') return new Uint8Array(Buffer.from(`%PDF-1.4\n%synthetic-test:${id}\n%%EOF\n`))
  if (media === 'image/png') return new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, ...tag])
  return new Uint8Array([0xff, 0xd8, 0xff, ...tag])
}
function rekey(env: Env): Env {
  const key = examinationKey({ document_id: env.document.document_id, sha256: env.document.sha256, profile: env.profile, executor: env.executor })
  const p = key.slice(0, 16)
  return { ...env, examination_key: key, observations: env.observations.map((o) => ({ ...o, observation_id: p + o.observation_id.slice(16), source: { document_sha256: env.document.sha256, location: null } })) }
}
/** As the PROD-UAT-B suite: the committed core on stand-in bytes, rebound to the committed fixture fingerprint and size. */
async function envelopeFor(fixture: ReplayFixture, documentId: string, ownerId: string, profile: ExaminationProfile = RECEIPT_PROFILE): Promise<Env> {
  const bytes = standIn(fixture.fixture_id, fixture.media_type)
  const table = buildReplayTable([{ ...fixture, sha256: sha(bytes) }])
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
const v2 = (): ExaminationProfile => ({ ...RECEIPT_PROFILE, ref: { ...RECEIPT_PROFILE.ref, version: 2 } })
const setConst = (sql: string, name: string, value: string) => {
  const re = new RegExp(`(${name}\\s+constant text\\s+:= )'EDIT:(?:[^']|'')*'`)
  if (!re.test(sql)) throw new Error(`constant ${name} not found`)
  return sql.replace(re, `$1'${value.replace(/'/g, "''")}'`)
}

maybe('creator record v2 customer-path synthetic UAT grant (PostgreSQL)', () => {
  let admin: Client
  let svc: Client
  const extra: Client[] = []
  async function connect(role?: 'service_role' | 'anon' | 'authenticated'): Promise<Client> {
    const c = new Client({ connectionString: URL })
    extra.push(c)
    await c.connect()
    if (role) await c.query(`SET ROLE ${role}`)
    return c
  }
  async function schema(files: string[]) {
    await admin.query('DROP SCHEMA IF EXISTS public CASCADE')
    await admin.query('CREATE SCHEMA public')
    await admin.query(readFileSync(BOOTSTRAP, 'utf8'))
    await admin.query('DROP SCHEMA IF EXISTS storage CASCADE')
    await admin.query('CREATE SCHEMA storage; CREATE TABLE storage.buckets (id text PRIMARY KEY, name text NOT NULL, public boolean, file_size_limit bigint, allowed_mime_types text[])')
    for (const m of files) await admin.query(readFileSync(m, 'utf8'))
  }
  const apply = (file: string) => admin.query(readFileSync(file, 'utf8'))
  async function user(o: { email?: string; invited?: boolean; admin?: boolean } = {}) {
    const id = randomUUID()
    await admin.query('INSERT INTO public.users (id, email, name, is_admin) VALUES ($1, $2, $3, $4)', [id, o.email ?? `${id}@example.test`, 'Tester', o.admin ?? false])
    if (o.invited) await admin.query(`INSERT INTO public.creator_record_v2_pilot_access (user_id, added_by, reason) VALUES ($1, 'db test operator', 'customer-path UAT test')`, [id])
    return id
  }
  /** The DOC-1 intake as the service role writes it: an owner upload (consent recorded), pending → stored. */
  async function upload(userId: string, fixture: Pick<ReplayFixture, 'sha256' | 'media_type' | 'bytes'> = F, store = true) {
    const id = randomUUID()
    await svc.query(
      `INSERT INTO public.creator_record_v2_documents (id, user_id, sha256, media_type, byte_size, file_name, storage_path, consent_version, state)
       VALUES ($1, $2, $3, $4, $5, 'receipt', $6, $7, 'pending')`,
      [id, userId, fixture.sha256, fixture.media_type, fixture.bytes, `${userId}/${id}`, INTAKE_CONSENT],
    )
    if (store) await svc.query(`UPDATE public.creator_record_v2_documents SET state = 'stored', stored_at = now() WHERE id = $1`, [id])
    return id
  }
  const seedInsert = (c: Client, id: string, grantId: string, userId: string, fixture: Pick<ReplayFixture, 'sha256' | 'media_type' | 'bytes'> = F) =>
    c.query(
      `INSERT INTO public.creator_record_v2_documents (id, user_id, sha256, media_type, byte_size, file_name, storage_path, consent_version, state, origin, seed_grant_id)
       VALUES ($1, $2, $3, $4, $5, 'fixture.pdf', $6, NULL, 'pending', 'operator_synthetic_seed', $7)`,
      [id, userId, fixture.sha256, fixture.media_type, fixture.bytes, `${userId}/${id}`, grantId],
    )
  async function seed(grantId: string, userId: string, fixture = F) {
    const id = randomUUID()
    await seedInsert(svc, id, grantId, userId, fixture)
    await svc.query(`UPDATE public.creator_record_v2_documents SET state = 'stored', stored_at = now() WHERE id = $1`, [id])
    return id
  }
  const newNonce = () => randomUUID().replace(/-/g, '') + randomUUID().replace(/-/g, '')
  /** kind undefined = the 20261105000000 INSERT exactly as create_grant.sql writes it (no grant_kind column named). */
  async function grant(o: { user: string; kind?: 'operator_seed' | 'customer_path_uat'; fixture?: ReplayFixture; interval?: string; events?: number; nonce?: string }) {
    const nonce = o.nonce ?? newNonce()
    const cols = o.kind ? 'grant_kind, ' : ''
    const vals = o.kind ? `'${o.kind}', ` : ''
    const r = await admin.query(
      `INSERT INTO ${GRANTS} (${cols}test_user_id, document_sha256, supabase_project_ref, binding_nonce_sha256, established_by, reason, change_ref, expires_at, max_read_events)
       VALUES (${vals}$1, $2, $3, encode(sha256(convert_to($4, 'UTF8')), 'hex'), 'db test operator', 'synthetic UAT test', 'TEST-X1', now() + $5::interval, $6) RETURNING id`,
      [o.user, (o.fixture ?? F).sha256, PROD_REF, nonce, o.interval ?? '60 minutes', o.events ?? 4],
    )
    return { id: r.rows[0].id as string, nonce }
  }
  const revokeAll = () => admin.query(`UPDATE ${GRANTS} SET revoked_at = now(), revoked_by = 'db test operator', revoke_reason = 'test reset' WHERE revoked_at IS NULL`)
  const establish = () => admin.query(
    `INSERT INTO public.creator_record_v2_examination_environment (environment_kind, supabase_project_ref, established_by, reason) VALUES ('isolated_synthetic_test', $1, 'db test operator', 'isolated local PostgreSQL 15 test')`, [TEST_REF])
  const removeMarker = () => admin.query('DELETE FROM public.creator_record_v2_examination_environment')
  const logRead = async (c: Client, docId: string, actor: string, opts: { grant?: string } = {}) =>
    Number((await c.query(
      `INSERT INTO public.creator_record_v2_evidence_access_log (document_id, actor_user_id, actor_role, purpose${opts.grant ? ', uat_grant_id' : ''})
       VALUES ($1, $2, 'owner', 'examination'${opts.grant ? ', $3' : ''}) RETURNING id`,
      opts.grant ? [docId, actor, opts.grant] : [docId, actor],
    )).rows[0].id)
  const record = async (c: Client, logId: number, envText: string) => (await c.query('SELECT run_id, result FROM public.creator_record_v2_record_examination($1, $2)', [logId, envText])).rows[0] as { run_id: string; result: string }
  const status = async (c: Client, nonce: string) => (await c.query('SELECT * FROM public.creator_record_v2_examination_uat_status($1)', [nonce])).rows
  const count = async (sql: string, args: unknown[] = []) => Number((await admin.query(sql, args)).rows[0].n)
  const grantRow = async (id: string) => (await admin.query(`SELECT * FROM ${GRANTS} WHERE id = $1`, [id])).rows[0]
  const runRow = async (id: string) => (await admin.query(`SELECT ${PERSISTED_RUN_COLUMNS} FROM public.creator_record_v2_examination_runs WHERE id = $1`, [id])).rows[0] as PersistedRunRow
  /** A pilot-invited identity with an active customer_path_uat grant and its own stored upload of the granted fixture. */
  async function customerReady(o: { events?: number; interval?: string } = {}) {
    await revokeAll()
    const owner = await user({ invited: true })
    const g = await grant({ user: owner, kind: 'customer_path_uat', events: o.events, interval: o.interval })
    const docId = await upload(owner)
    const env = await envelopeFor(F, docId, owner)
    return { owner, grant: g, docId, env }
  }

  beforeAll(async () => {
    assertDisposable(URL as string)
    admin = new Client({ connectionString: URL })
    await admin.connect()
    await schema([])
    svc = await connect('service_role')
  })
  afterAll(async () => {
    for (const c of extra) await c.end().catch(() => undefined)
    await admin?.end()
  })

  // ── Migration preconditions and compatibility with the E4-shaped history ───────────────────────────────

  describe('migration preconditions and E4 compatibility', () => {
    test('it requires 20261105000000', async () => {
      await schema(BEFORE)
      expect((await fail(apply(M06))).message).toBe('20261106000000 requires 20261105000000')
    })

    test('an unexpected run authority constraint makes it refuse instead of replacing it', async () => {
      await schema([...BEFORE, M05])
      await admin.query(`ALTER TABLE public.creator_record_v2_examination_runs DROP CONSTRAINT creator_record_v2_examination_runs_authority_check,
                         ADD CONSTRAINT creator_record_v2_examination_runs_authority_check CHECK (environment_project_ref ~ '^[a-z0-9]{20}$')`)
      const r = await fail(apply(M06))
      expect([r.code, r.message.startsWith('unexpected run authority constraint')]).toEqual(['P0001', true])
      expect(await count(`SELECT count(*) n FROM information_schema.columns WHERE table_name = 'creator_record_v2_examination_uat_grants' AND column_name = 'grant_kind'`)).toBe(0)
    })

    test('E4 HISTORY: an operator_seed grant, its seeded document, events and run (revoked) are byte-identical afterwards, read as operator_seed, and the run still passes the committed reader and projection', async () => {
      await schema([...BEFORE, M05])
      const owner = await user()
      const g = await grant({ user: owner })
      const docId = await seed(g.id, owner)
      const env = await envelopeFor(F, docId, owner)
      const run = await record(svc, await logRead(svc, docId, owner), text(env))
      await logRead(svc, docId, owner)
      await revokeAll()
      const snap = async () => ({
        grant: (await admin.query(`SELECT row_to_json(g)::jsonb - 'grant_kind' AS r FROM ${GRANTS} g`)).rows,
        docs: (await admin.query('SELECT row_to_json(d)::jsonb AS r FROM public.creator_record_v2_documents d')).rows,
        log: (await admin.query('SELECT row_to_json(l)::jsonb AS r FROM public.creator_record_v2_evidence_access_log l ORDER BY id')).rows,
        runs: (await admin.query('SELECT row_to_json(r)::jsonb AS r FROM public.creator_record_v2_examination_runs r')).rows,
      })
      const before = await snap()
      await apply(M06)
      expect(await snap()).toEqual(before)
      await apply(M06) // idempotent re-apply
      expect(await snap()).toEqual(before)
      expect((await grantRow(g.id)).grant_kind).toBe('operator_seed')
      expect((await status(svc, g.nonce))[0]).toMatchObject({ grant_kind: 'operator_seed', revoked: true, bound_document_id: docId, read_events_used: 2, new_runs_used: 1 })
      const row = await runRow(run.run_id)
      expect(row.execution_boundary).toBe('operator_synthetic_uat')
      expect(verifyRunRow(row, owner, docId, { boundary: 'operator_synthetic_uat', uat_grant_id: g.id, project_ref: PROD_REF })).toBeNull()
      expect(projectVerifiedRun(row, owner, docId).ok).toBe(true)
    })

    test('PRIVILEGES unchanged: grants unreadable by every API role; only the write path and the status function are executable, by the service role alone', async () => {
      await schema([...BEFORE, M05, M06])
      for (const role of ['anon', 'authenticated', 'service_role', 'public']) for (const p of ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER'])
        expect([role, p, (await admin.query('SELECT has_table_privilege($1, $2, $3) ok', [role, GRANTS, p])).rows[0].ok]).toEqual([role, p, false])
      expect(await count(`SELECT count(*) n FROM pg_policies WHERE tablename = 'creator_record_v2_examination_uat_grants'`)).toBe(0)
      const fns = ['creator_record_v2_examination_uat_grant_guard()', 'creator_record_v2_documents_seed_binding()', 'creator_record_v2_evidence_access_log_insert_guard()',
        'creator_record_v2_record_examination(bigint,text)', 'creator_record_v2_examination_uat_status(text)']
      for (const fn of fns) for (const role of ['anon', 'authenticated', 'service_role', 'public']) {
        const ok = (await admin.query('SELECT has_function_privilege($1, $2, \'EXECUTE\') ok', [role, `public.${fn}`])).rows[0].ok
        expect([fn, role, ok]).toEqual([fn, role, role === 'service_role' && (fn.startsWith('creator_record_v2_record_examination') || fn.startsWith('creator_record_v2_examination_uat_status'))])
      }
      const owner = await user({ invited: true })
      const q = `INSERT INTO ${GRANTS} (grant_kind, test_user_id, document_sha256, supabase_project_ref, binding_nonce_sha256, established_by, reason, change_ref, expires_at, max_read_events) VALUES ('customer_path_uat', '${owner}', '${F.sha256}', '${PROD_REF}', '${'a'.repeat(64)}', 'x', 'y', 'z', now() + interval '1 hour', 4)`
      expect((await fail(svc.query(q))).code).toBe('42501')
      expect((await fail(svc.query(`SELECT * FROM ${GRANTS}`))).code).toBe('42501')
      // The status function answers only to the grant's code: nothing without it.
      const g = await grant({ user: owner, kind: 'customer_path_uat' })
      expect(await status(svc, 'x'.repeat(64))).toEqual([])
      expect((await status(svc, g.nonce))[0]).toMatchObject({ grant_id: g.id, grant_kind: 'customer_path_uat', bound_document_id: null, active: true })
      await revokeAll()
    })
  })

  // ── Everything below runs on 20261105 + 20261106 ───────────────────────────────────────────────────────

  describe('on the X1 schema', () => {
    beforeAll(async () => {
      await schema([...BEFORE, M05, M06])
    })
    beforeEach(async () => {
      await revokeAll()
      await removeMarker()
    })

    describe('creating a customer_path_uat grant', () => {
      test('the test identity must be non-admin and pilot-invited, never have held any grant, and have no submission, prepared record or live document', async () => {
        const refuse = 'a customer-path test identity must be a pilot-invited non-admin user with no earlier grant, submission, prepared record or live document'
        const notInvited = await user()
        expect((await fail(grant({ user: notInvited, kind: 'customer_path_uat' }))).message).toBe(refuse)
        const adminUser = await user({ invited: true, admin: true })
        expect((await fail(grant({ user: adminUser, kind: 'customer_path_uat' }))).message).toBe(refuse)
        const withDoc = await user({ invited: true })
        await upload(withDoc)
        expect((await fail(grant({ user: withDoc, kind: 'customer_path_uat' }))).message).toBe(refuse)
        const pendingDoc = await user({ invited: true })
        await upload(pendingDoc, F, false)
        expect((await fail(grant({ user: pendingDoc, kind: 'customer_path_uat' }))).message).toBe(refuse)
        // An identity that ever held a grant (of either kind) is never reused, so no earlier record is mixed in.
        const earlier = await user({ invited: true })
        await grant({ user: earlier, kind: 'customer_path_uat' })
        await revokeAll()
        expect((await fail(grant({ user: earlier, kind: 'customer_path_uat' }))).message).toBe(refuse)
        const ok = await user({ invited: true })
        await grant({ user: ok, kind: 'customer_path_uat' })
        expect(await count(`SELECT count(*) n FROM ${GRANTS} WHERE test_user_id = $1 AND grant_kind = 'customer_path_uat' AND bound_document_id IS NULL`, [ok])).toBe(1)
      })

      test('operator_seed creation is unchanged: a pilot-invited identity is still refused for it; omitting grant_kind creates operator_seed', async () => {
        const invited = await user({ invited: true })
        expect((await fail(grant({ user: invited })))).toMatchObject({ code: 'P0001', message: 'the test identity must be a dedicated non-admin user with no invitation, submission, prepared record or live document' })
        const plain = await user()
        const g = await grant({ user: plain })
        expect((await grantRow(g.id)).grant_kind).toBe('operator_seed')
        await revokeAll()
        // Any other kind is refused by the kind CHECK (the guard does not treat it as either kind).
        expect((await fail(admin.query(`INSERT INTO ${GRANTS} (grant_kind, test_user_id, document_sha256, supabase_project_ref, binding_nonce_sha256, established_by, reason, change_ref, expires_at, max_read_events) VALUES ('customer', $1, $2, $3, $4, 'x', 'y', 'z', now() + interval '1 hour', 4)`,
          [await user(), F.sha256, PROD_REF, sha(newNonce())]))).code).toBe('23514')
      })

      test('the fixture must be committed; window, budgets and nonce keep their database limits', async () => {
        const owner = await user({ invited: true })
        const insert = (sha256: string, interval: string, events: number, maxRuns = 1) => admin.query(
          `INSERT INTO ${GRANTS} (grant_kind, test_user_id, document_sha256, supabase_project_ref, binding_nonce_sha256, established_by, reason, change_ref, expires_at, max_read_events, max_new_runs)
           VALUES ('customer_path_uat', $1, $2, $3, $4, 'x', 'y', 'z', now() + $5::interval, $6, $7)`, [owner, sha256, PROD_REF, sha(newNonce()), interval, events, maxRuns])
        expect((await fail(insert('a'.repeat(64), '1 hour', 4))).code).toBe('23503')
        expect((await fail(insert(F.sha256, '3 hours', 4))).code).toBe('23514')
        expect((await fail(insert(F.sha256, '1 hour', 5))).code).toBe('23514')
        expect((await fail(insert(F.sha256, '1 hour', 4, 2))).code).toBe('23514')
        const nonce = newNonce()
        await grant({ user: owner, kind: 'customer_path_uat', nonce })
        await revokeAll()
        expect((await fail(grant({ user: await user({ invited: true }), kind: 'customer_path_uat', nonce }))).code).toBe('23505')
      })

      test('EXCLUSIVITY spans kinds and the marker: one active grant of any kind; never alongside the isolated-test marker', async () => {
        await grant({ user: await user({ invited: true }), kind: 'customer_path_uat' })
        expect((await fail(grant({ user: await user() }))).message).toBe('another examination UAT grant is active')
        expect((await fail(grant({ user: await user({ invited: true }), kind: 'customer_path_uat' }))).message).toBe('another examination UAT grant is active')
        expect((await fail(establish())).message).toBe('the isolated-test environment marker cannot coexist with an active examination UAT grant')
        await revokeAll()
        await grant({ user: await user() })
        expect((await fail(grant({ user: await user({ invited: true }), kind: 'customer_path_uat' }))).message).toBe('another examination UAT grant is active')
        await revokeAll()
        await establish()
        expect((await fail(grant({ user: await user({ invited: true }), kind: 'customer_path_uat' }))).message).toBe('an examination UAT grant cannot coexist with the isolated-test environment marker')
      })

      test('a grant is immutable: its kind cannot change, it cannot be bound by a direct update, revocation is final and nothing is deleted', async () => {
        const owner = await user({ invited: true })
        const g = await grant({ user: owner, kind: 'customer_path_uat' })
        expect((await fail(admin.query(`UPDATE ${GRANTS} SET grant_kind = 'operator_seed' WHERE id = $1`, [g.id]))).message).toBe('an examination UAT grant cannot be changed, extended or widened')
        const docId = await upload(owner)
        expect((await fail(admin.query(`UPDATE ${GRANTS} SET bound_document_id = $2 WHERE id = $1`, [g.id, docId]))).message).toBe('an examination UAT grant is bound only by seeding its document')
        await revokeAll()
        expect((await fail(admin.query(`UPDATE ${GRANTS} SET revoked_at = now(), revoked_by = 'x', revoke_reason = 'again' WHERE id = $1`, [g.id]))).message).toBe('an examination UAT grant revocation is final')
        expect((await fail(admin.query(`DELETE FROM ${GRANTS} WHERE id = $1`, [g.id]))).message).toBe('an examination UAT grant is never deleted; revoke it')
      })
    })

    describe('examination under a customer_path_uat grant', () => {
      test('HAPPY PATH: the identity’s own stored upload is bound by the first read, examined once and stamped customer_path_synthetic_uat; the run passes the committed reader and projection', async () => {
        const { owner, grant: g, docId, env } = await customerReady()
        expect((await status(svc, g.nonce))[0].bound_document_id).toBeNull()
        const logId = await logRead(svc, docId, owner)
        expect((await status(svc, g.nonce))[0]).toMatchObject({ bound_document_id: docId, read_events_used: 1, new_runs_used: 0, grant_kind: 'customer_path_uat' })
        expect((await admin.query('SELECT uat_grant_id FROM public.creator_record_v2_evidence_access_log WHERE id = $1', [logId])).rows[0].uat_grant_id).toBe(g.id)
        const run = await record(svc, logId, text(env))
        expect(run.result).toBe('created')
        const row = await runRow(run.run_id)
        expect([row.execution_boundary, row.uat_grant_id, row.environment_project_ref, row.document_id, row.user_id]).toEqual(['customer_path_synthetic_uat', g.id, PROD_REF, docId, owner])
        expect(verifyRunRow(row, owner, docId, { boundary: 'customer_path_synthetic_uat', uat_grant_id: g.id, project_ref: PROD_REF })).toBeNull()
        expect(verifyRunRow(row, owner, docId, { boundary: 'operator_synthetic_uat' })).toBe('expected_boundary')
        const projected = projectVerifiedRun(row, owner, docId)
        expect(projected.ok && projected.projection.execution_boundary).toBe('customer_path_synthetic_uat')
        // The same envelope again creates nothing ('existing'); a new run is refused after the one allowed.
        expect((await record(svc, await logRead(svc, docId, owner), text(env))).result).toBe('existing')
        const env2 = await envelopeFor(F, docId, owner, v2())
        expect((await fail(record(svc, await logRead(svc, docId, owner), text(env2)))).message).toBe('examination_uat_budget_exhausted')
        expect((await status(svc, g.nonce))[0]).toMatchObject({ read_events_used: 3, new_runs_used: 1 })
      })

      test('never seeded: an operator seed under a customer_path_uat grant is refused and leaves it unbound', async () => {
        await revokeAll()
        const owner = await user({ invited: true })
        const g = await grant({ user: owner, kind: 'customer_path_uat' })
        expect((await fail(seedInsert(svc, randomUUID(), g.id, owner))).message).toBe('operator seeding requires an active examination UAT grant')
        expect((await grantRow(g.id)).bound_document_id).toBeNull()
      })

      test('TARGET: another identity, other bytes, a pending upload, and (once bound) any other document of the identity are refused; nothing is logged or bound by a refusal', async () => {
        const { owner, grant: g, docId } = await customerReady()
        const stranger = await user({ invited: true })
        const strangerDoc = await upload(stranger)
        expect((await fail(logRead(svc, strangerDoc, stranger))).message).toBe('examination_uat_target_mismatch')
        expect((await fail(logRead(svc, strangerDoc, owner))).message).toBe('an examination read is logged only for the owner of a stored document')
        const other = await upload(owner, F2)
        expect((await fail(logRead(svc, other, owner))).message).toBe('examination_uat_target_mismatch')
        const pending = await upload(owner, FIX('conflict-other-provider'), false)
        expect((await fail(logRead(svc, pending, owner))).message).toBe('an examination read is logged only for the owner of a stored document')
        expect((await grantRow(g.id)).bound_document_id).toBeNull()
        expect(await count('SELECT count(*) n FROM public.creator_record_v2_evidence_access_log WHERE uat_grant_id = $1', [g.id])).toBe(0)
        await logRead(svc, docId, owner)
        expect((await grantRow(g.id)).bound_document_id).toBe(docId)
        // Once bound: the identity deletes that upload and uploads the same bytes again — still refused (bound once).
        await svc.query(`UPDATE public.creator_record_v2_documents SET state = 'deleted', deleted_at = now() WHERE id = $1`, [docId])
        const again = await upload(owner)
        expect((await fail(logRead(svc, again, owner))).message).toBe('examination_uat_target_mismatch')
        expect((await grantRow(g.id)).bound_document_id).toBe(docId)
      })

      test('TIMESTAMP is never authority: a caller-chosen created_at neither authorizes a document failing any other check nor bypasses the upload-after-grant check', async () => {
        await revokeAll()
        const owner = await user({ invited: true })
        const g = await grant({ user: owner, kind: 'customer_path_uat' })
        const insertAt = async (userId: string, fixture: Pick<ReplayFixture, 'sha256' | 'media_type' | 'bytes'>, at: string, store = true) => {
          const id = randomUUID()
          await svc.query(
            `INSERT INTO public.creator_record_v2_documents (id, user_id, sha256, media_type, byte_size, file_name, storage_path, consent_version, state, created_at)
             VALUES ($1, $2, $3, $4, $5, 'receipt', $6, $7, 'pending', $8::timestamptz)`,
            [id, userId, fixture.sha256, fixture.media_type, fixture.bytes, `${userId}/${id}`, INTAKE_CONSENT, at],
          )
          if (store) await svc.query(`UPDATE public.creator_record_v2_documents SET state = 'stored', stored_at = now() WHERE id = $1`, [id])
          return id
        }
        const future = new Date(Date.now() + 3600_000).toISOString()
        // A timestamp that satisfies the check does not help a document failing any other check.
        const stranger = await user({ invited: true })
        expect((await fail(logRead(svc, await insertAt(stranger, F, future), stranger))).message).toBe('examination_uat_target_mismatch') // not the test identity
        expect((await fail(logRead(svc, await insertAt(owner, F2, future), owner))).message).toBe('examination_uat_target_mismatch') // not the granted fingerprint
        expect((await fail(logRead(svc, await insertAt(owner, FIX('conflict-other-provider'), future, false), owner))).message)
          .toBe('an examination read is logged only for the owner of a stored document') // not stored
        // And a backdated timestamp on an otherwise-eligible upload is refused, not trusted.
        const backdated = await insertAt(owner, F, '2020-01-01T00:00:00Z')
        expect((await fail(logRead(svc, backdated, owner))).message).toBe('examination_uat_target_mismatch')
        expect((await grantRow(g.id)).bound_document_id).toBeNull()
        expect(await count('SELECT count(*) n FROM public.creator_record_v2_evidence_access_log WHERE uat_grant_id = $1', [g.id])).toBe(0)
      })

      test('a run cannot be recorded for an event of another grant, a revoked grant or an expired grant', async () => {
        const a = await customerReady()
        const logA = await logRead(svc, a.docId, a.owner)
        await revokeAll()
        expect((await fail(record(svc, logA, text(a.env)))).message).toBe('examination_environment_not_authorized')
        expect((await fail(logRead(svc, a.docId, a.owner))).message).toBe('examination reads are not authorized in this environment')
        const b = await customerReady({ interval: '2 seconds' })
        const logB = await logRead(svc, b.docId, b.owner)
        // A newer grant does not revive the older grant's event: it was issued under a revoked grant.
        expect((await fail(record(svc, logA, text(a.env)))).message).toBe('examination_environment_not_authorized')
        await sleep(2500)
        expect((await fail(record(svc, logB, text(b.env)))).message).toBe('examination_environment_not_authorized')
        expect((await fail(logRead(svc, b.docId, b.owner))).message).toBe('examination reads are not authorized in this environment')
      })

      test('READ BUDGET: at most max_read_events examination reads (concurrently too)', async () => {
        const { owner, docId, grant: g } = await customerReady({ events: 2 })
        const clients = await Promise.all([0, 1, 2, 3].map(() => connect('service_role')))
        const results = await Promise.all(clients.map((c) => fail(logRead(c, docId, owner))))
        expect(results.filter((r) => r.code === 'no error')).toHaveLength(2)
        expect(results.filter((r) => r.message === 'examination_uat_budget_exhausted')).toHaveLength(2)
        expect(await count('SELECT count(*) n FROM public.creator_record_v2_evidence_access_log WHERE uat_grant_id = $1', [g.id])).toBe(2)
        expect((await grantRow(g.id)).bound_document_id).toBe(docId)
      })

      test('DEFAULT DENY: with no active grant and no marker, the identity’s own upload can be neither read for examination nor examined', async () => {
        const { owner, docId, env } = await customerReady()
        await revokeAll()
        expect((await fail(logRead(svc, docId, owner))).message).toBe('examination reads are not authorized in this environment')
        await establish()
        const logId = await logRead(svc, docId, owner) // the isolated marker path, exactly as before
        await removeMarker()
        expect((await fail(record(svc, logId, text(env)))).message).toBe('examination_environment_not_authorized')
        expect(await count('SELECT count(*) n FROM public.creator_record_v2_examination_runs WHERE document_id = $1', [docId])).toBe(0)
      })

      test('the prepared-record origin guard is unchanged: only owner_upload documents (so customer-path uploads, never seeded ones) may enter a prepared record', async () => {
        const pd = (await admin.query(`SELECT pg_get_functiondef('public.creator_record_v2_prepared_documents_origin_guard()'::regprocedure) d`)).rows[0].d
        expect(pd).toContain("d.origin <> 'owner_upload'")
      })
    })

    describe('operator_seed behaviour after 20261106', () => {
      test('seed binds, the event is logged, the run is stamped operator_synthetic_uat; an owner upload is refused under an operator grant', async () => {
        const owner = await user()
        const g = await grant({ user: owner, kind: 'operator_seed' })
        const docId = await seed(g.id, owner)
        expect((await grantRow(g.id)).bound_document_id).toBe(docId)
        const env = await envelopeFor(F, docId, owner)
        const run = await record(svc, await logRead(svc, docId, owner), text(env))
        expect((await runRow(run.run_id)).execution_boundary).toBe('operator_synthetic_uat')
        await revokeAll()
        const o2 = await user()
        await grant({ user: o2 })
        const up = await upload(o2)
        expect((await fail(logRead(svc, up, o2))).message).toBe('examination_uat_target_mismatch')
      })

      test('the isolated-test marker path is unchanged: stamped isolated_synthetic_test with no grant', async () => {
        await establish()
        const owner = await user()
        const docId = await upload(owner)
        const env = await envelopeFor(F, docId, owner)
        const run = await record(svc, await logRead(svc, docId, owner), text(env))
        const row = await runRow(run.run_id)
        expect([row.execution_boundary, row.uat_grant_id, row.environment_project_ref]).toEqual(['isolated_synthetic_test', null, TEST_REF])
      })
    })

    describe('operator SQL', () => {
      test('create_customer_path_grant.sql: refuses placeholders, an unapplied migration and mismatched targets; creates exactly one customer_path_uat grant; revoke_grant.sql revokes it', async () => {
        const createSql = (o: { target: string; ref: string; email: string; fixture: string; hash: string }) => {
          let sql = readFileSync(join(OPERATOR, 'create_customer_path_grant.sql'), 'utf8')
          for (const [k, v] of Object.entries({ c_target: o.target, c_project_ref: o.ref, c_test_user_email: o.email, c_fixture_id: o.fixture, c_nonce_sha256: o.hash, c_established_by: 'db test operator', c_change_ref: 'TEST-X1', c_reason: 'operator SQL test' })) sql = setConst(sql, k, v)
          return sql
        }
        expect((await fail(admin.query(readFileSync(join(OPERATOR, 'create_customer_path_grant.sql'), 'utf8')))).message).toBe('REFUSED: edit every EDIT constant first')
        await admin.query(`CREATE TABLE IF NOT EXISTS public.assessments (assessment_number text PRIMARY KEY, methodology_version text, is_system_test boolean)`)
        await admin.query(`DELETE FROM public.assessments`)
        const email = `x1-${randomUUID()}@example.test`
        const owner = await user({ email, invited: true })
        const nonce = newNonce()
        const base = { target: 'production', ref: PROD_REF, email, fixture: F.fixture_id, hash: sha(nonce) }
        expect((await fail(admin.query(createSql(base)))).message).toBe('REFUSED: this database does not look like Production')
        await admin.query(`INSERT INTO public.assessments VALUES ('ASSESS-005-2026-07-12', 'SI8 Reviewer Manual v0.1', true)`)
        expect((await fail(admin.query(createSql({ ...base, target: 'staging', ref: TEST_REF })))).message).toBe('REFUSED: this database does not look like the staging database')
        expect((await fail(admin.query(createSql({ ...base, ref: TEST_REF })))).message).toBe('REFUSED: a production grant must name the Production project ref')
        expect((await fail(admin.query(createSql({ ...base, fixture: 'no-such-fixture' })))).message).toBe('REFUSED: no-such-fixture is not a committed synthetic fixture')
        const plain = `x1-plain-${randomUUID()}@example.test`
        await user({ email: plain })
        expect((await fail(admin.query(createSql({ ...base, email: plain })))).message).toBe('a customer-path test identity must be a pilot-invited non-admin user with no earlier grant, submission, prepared record or live document')
        await admin.query(createSql(base))
        const rows = await status(svc, nonce)
        expect(rows).toHaveLength(1)
        expect(rows[0]).toMatchObject({ grant_kind: 'customer_path_uat', test_user_id: owner, document_sha256: F.sha256, bound_document_id: null, active: true, max_read_events: 4, max_new_runs: 1 })
        expect(new Date(rows[0].expires_at).getTime() - new Date(rows[0].created_at).getTime()).toBe(120 * 60 * 1000)
        const revoke = setConst(setConst(readFileSync(join(OPERATOR, 'revoke_grant.sql'), 'utf8'), 'c_revoked_by', 'db test operator'), 'c_revoke_reason', 'test complete')
        await admin.query(revoke)
        expect((await status(svc, nonce))[0]).toMatchObject({ active: false, revoked: true })
        await admin.query('DROP TABLE public.assessments')
      })

      test('create_customer_path_grant.sql refuses where 20261106 is not applied', async () => {
        await schema([...BEFORE, M05])
        let sql = readFileSync(join(OPERATOR, 'create_customer_path_grant.sql'), 'utf8')
        for (const [k, v] of Object.entries({ c_target: 'production', c_project_ref: PROD_REF, c_test_user_email: 'a@b.c', c_fixture_id: F.fixture_id, c_nonce_sha256: 'a'.repeat(64), c_established_by: 'x', c_change_ref: 'y', c_reason: 'z' })) sql = setConst(sql, k, v)
        expect((await fail(admin.query(sql))).message).toBe('REFUSED: migration 20261106000000 is not applied here')
        await schema([...BEFORE, M05, M06])
      })
    })
  })

  // ── Rollback ───────────────────────────────────────────────────────────────────────────────────────────

  describe('rollback_20261106.sql', () => {
    test('refused once any customer_path_uat grant exists (even revoked); nothing changes', async () => {
      await schema([...BEFORE, M05, M06])
      await grant({ user: await user({ invited: true }), kind: 'customer_path_uat' })
      await revokeAll()
      await admin.query('BEGIN')
      const r = await fail(admin.query(readFileSync(join(OPERATOR, 'rollback_20261106.sql'), 'utf8')))
      await admin.query('ROLLBACK')
      expect([r.code, r.message]).toEqual(['P0001', '20261106 rollback refused: a customer_path_uat grant exists (revoke it; history is never dropped)'])
      expect(await count(`SELECT count(*) n FROM information_schema.columns WHERE table_name = 'creator_record_v2_examination_uat_grants' AND column_name = 'grant_kind'`)).toBe(1)
    })

    test('with only operator_seed history (E4-shaped): rollback + re-applying 20261105 in one transaction restores the exact 20261105 schema and keeps every row', async () => {
      await schema([...BEFORE, M05])
      const fingerprint = async () => ({
        fns: (await admin.query(`SELECT p.proname, md5(p.prosrc) src, p.prosecdef, p.proconfig, p.proacl::text acl, pg_get_function_result(p.oid) res FROM pg_proc p
                                 WHERE p.pronamespace = 'public'::regnamespace AND p.proname LIKE 'creator_record_v2%' ORDER BY 1, 2`)).rows,
        cols: (await admin.query(`SELECT table_name, column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_schema = 'public' AND table_name LIKE 'creator_record_v2%' ORDER BY 1, 2`)).rows,
        cons: (await admin.query(`SELECT conrelid::regclass::text t, conname, pg_get_constraintdef(oid) d FROM pg_constraint WHERE connamespace = 'public'::regnamespace AND conrelid::regclass::text LIKE '%creator_record_v2%' ORDER BY 1, 2`)).rows,
        trg: (await admin.query(`SELECT tgrelid::regclass::text t, tgname, tgenabled FROM pg_trigger WHERE NOT tgisinternal AND tgrelid::regclass::text LIKE '%creator_record_v2%' ORDER BY 1, 2`)).rows,
      })
      const before = await fingerprint()
      const owner = await user()
      const g = await grant({ user: owner })
      const docId = await seed(g.id, owner)
      const run = await record(svc, await logRead(svc, docId, owner), text(await envelopeFor(F, docId, owner)))
      await revokeAll()
      await apply(M06)
      const rows = async () => ({
        g: (await admin.query(`SELECT row_to_json(g)::jsonb - 'grant_kind' r FROM ${GRANTS} g`)).rows,
        r: (await admin.query('SELECT row_to_json(r)::jsonb r FROM public.creator_record_v2_examination_runs r')).rows,
        l: (await admin.query('SELECT row_to_json(l)::jsonb r FROM public.creator_record_v2_evidence_access_log l')).rows,
      })
      const held = await rows()
      await admin.query('BEGIN')
      await admin.query(readFileSync(join(OPERATOR, 'rollback_20261106.sql'), 'utf8'))
      await apply(M05)
      await admin.query('COMMIT')
      expect(await fingerprint()).toEqual(before)
      expect(await rows()).toEqual(held)
      expect((await status(svc, g.nonce))[0]).not.toHaveProperty('grant_kind')
      expect(verifyRunRow(await runRow(run.run_id), owner, docId, { boundary: 'operator_synthetic_uat', uat_grant_id: g.id })).toBeNull()
      // And forward again.
      await apply(M06)
      expect((await grantRow(g.id)).grant_kind).toBe('operator_seed')
    })
  })
})
