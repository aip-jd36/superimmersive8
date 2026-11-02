/**
 * CR-V2-PROD-UAT-B — real PostgreSQL 15 tests for 20261105000000_creator_record_v2_operator_synthetic_uat.sql, applied
 * verbatim after the payment ledger, artifacts, M2, M3, DOC-1 and DOC-2C-B migrations (deploy order), plus the
 * operator SQL (create / revoke / rollback) and the read-only preflight pack.
 *
 * Proves: document provenance and consent; that the DOC-1 functions and grants are unchanged (privilege boundary);
 * grant creation, immutability and once-only binding; that the service role can neither create, expand, read nor
 * revoke a grant; marker / grant mutual exclusion (including concurrently); examination authorization (identity,
 * document, expiry, revocation); the read-event budget (including concurrently) and the one-new-run limit; that the
 * isolated-test path is unchanged; prepared-record exclusion; partial-seed containment.
 *
 * Envelopes come from the committed DOC-2B core on stand-in bytes rebound to the committed fixture fingerprint and
 * size (the generated fixture files are git-ignored), exactly as the DOC-2C-B suite does.
 *
 * The superuser `admin` connection stands in for the database operator. It also performs the few explicit test-only
 * actions a real operator never needs (marked FORCED / STUB below: forcing a coexistence state by disabling a trigger,
 * stub assessments and supabase_migrations tables). Disposable local `si8_test_*` database only. Skipped without
 * DATABASE_URL_TEST (required in CI).
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
import { canonicalJson } from '@/lib/creator-record/record-core/canonical'

const URL = process.env.DATABASE_URL_TEST
const APP = join(__dirname, '..', '..')
const DIR = join(APP, 'supabase', 'migrations')
const DOC1_CHAIN = [
  '20261021000000_payment_fulfillments.sql',
  '20261022000000_payment_zero_total_paid.sql',
  '20261028000000_creator_record_artifacts.sql',
  '20261101000000_creator_record_v2_prepared.sql',
  '20261102000000_creator_record_v2_submission_binding.sql',
  '20261103000000_creator_record_v2_evidence.sql',
].map((f) => join(DIR, f))
const DOC2CB = join(DIR, '20261104000000_creator_record_v2_examination_runs.sql')
const MIGRATION = join(DIR, '20261105000000_creator_record_v2_operator_synthetic_uat.sql')
const BOOTSTRAP = join(__dirname, 'bootstrap.sql')
const OPERATOR = join(APP, 'supabase', 'operator', 'creator-record-v2-uat')
const PREFLIGHT = join(APP, 'supabase', 'verification', 'cr-v2-uat-preflight')
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
if (process.env.CI && !URL) throw new Error('DATABASE_URL_TEST is required in CI — the creator record v2 operator UAT DB suite must not be skipped')
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
/** Replace one `c_name constant <type> := 'EDIT: …';` value in the operator SQL. */
const setConst = (sql: string, name: string, value: string) => {
  const re = new RegExp(`(${name}\\s+constant text\\s+:= )'EDIT:(?:[^']|'')*'`)
  if (!re.test(sql)) throw new Error(`constant ${name} not found`)
  return sql.replace(re, `$1'${value.replace(/'/g, "''")}'`)
}

maybe('creator record v2 operator synthetic UAT (PostgreSQL)', () => {
  let admin: Client
  let svc: Client
  const extra: Client[] = []
  async function connect(role?: 'service_role' | 'anon' | 'authenticated'): Promise<Client> {
    const c = new Client({ connectionString: URL })
    await c.connect()
    if (role) await c.query(`SET ROLE ${role}`)
    extra.push(c)
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
  const full = () => schema([...DOC1_CHAIN, DOC2CB, MIGRATION])
  async function user(email?: string) {
    const id = randomUUID()
    await admin.query('INSERT INTO public.users (id, email, name) VALUES ($1, $2, $3)', [id, email ?? `${id}@example.test`, 'Tester'])
    return id
  }
  async function ownerDoc(userId: string, fixture: Pick<ReplayFixture, 'sha256' | 'media_type' | 'bytes'> = F, consent = INTAKE_CONSENT) {
    const id = randomUUID()
    await svc.query(
      `INSERT INTO public.creator_record_v2_documents (id, user_id, sha256, media_type, byte_size, file_name, storage_path, consent_version, state)
       VALUES ($1, $2, $3, $4, $5, 'receipt', $6, $7, 'pending')`,
      [id, userId, fixture.sha256, fixture.media_type, fixture.bytes, `${userId}/${id}`, consent],
    )
    await svc.query(`UPDATE public.creator_record_v2_documents SET state = 'stored', stored_at = now() WHERE id = $1`, [id])
    return id
  }
  const seedInsert = (c: Client, id: string, grantId: string | null, userId: string, fixture: Pick<ReplayFixture, 'sha256' | 'media_type' | 'bytes'> = F, consent: string | null = null) =>
    c.query(
      `INSERT INTO public.creator_record_v2_documents (id, user_id, sha256, media_type, byte_size, file_name, storage_path, consent_version, state, origin, seed_grant_id)
       VALUES ($1, $2, $3, $4, $5, 'fixture.pdf', $6, $7, 'pending', 'operator_synthetic_seed', $8)`,
      [id, userId, fixture.sha256, fixture.media_type, fixture.bytes, `${userId}/${id}`, consent, grantId],
    )
  async function seed(grantId: string, userId: string, fixture = F, store = true) {
    const id = randomUUID()
    await seedInsert(svc, id, grantId, userId, fixture)
    if (store) await svc.query(`UPDATE public.creator_record_v2_documents SET state = 'stored', stored_at = now() WHERE id = $1`, [id])
    return id
  }
  const newNonce = () => randomUUID().replace(/-/g, '') + randomUUID().replace(/-/g, '')
  async function grant(o: { user: string; fixture?: ReplayFixture; interval?: string; events?: number; ref?: string; nonce?: string; c?: Client }) {
    const nonce = o.nonce ?? newNonce()
    const r = await (o.c ?? admin).query(
      `INSERT INTO ${GRANTS} (test_user_id, document_sha256, supabase_project_ref, binding_nonce_sha256, established_by, reason, change_ref, expires_at, max_read_events)
       VALUES ($1, $2, $3, encode(sha256(convert_to($4, 'UTF8')), 'hex'), 'db test operator', 'synthetic UAT test', 'TEST-UAT-B', now() + $5::interval, $6) RETURNING id`,
      [o.user, (o.fixture ?? F).sha256, o.ref ?? PROD_REF, nonce, o.interval ?? '60 minutes', o.events ?? 4],
    )
    return { id: r.rows[0].id as string, nonce }
  }
  const revokeAll = () => admin.query(`UPDATE ${GRANTS} SET revoked_at = now(), revoked_by = 'db test operator', revoke_reason = 'test reset' WHERE revoked_at IS NULL`)
  const establish = (ref = TEST_REF) => admin.query(
    `INSERT INTO public.creator_record_v2_examination_environment (environment_kind, supabase_project_ref, established_by, reason) VALUES ('isolated_synthetic_test', $1, 'db test operator', 'isolated local PostgreSQL 15 test')`, [ref])
  const removeMarker = () => admin.query('DELETE FROM public.creator_record_v2_examination_environment')
  const logRead = async (c: Client, docId: string, actor: string, opts: { role?: string; purpose?: string; grant?: string } = {}) =>
    Number((await c.query(
      `INSERT INTO public.creator_record_v2_evidence_access_log (document_id, actor_user_id, actor_role, purpose${opts.grant ? ', uat_grant_id' : ''})
       VALUES ($1, $2, $3, $4${opts.grant ? ', $5' : ''}) RETURNING id`,
      opts.grant ? [docId, actor, opts.role ?? 'owner', opts.purpose ?? 'examination', opts.grant] : [docId, actor, opts.role ?? 'owner', opts.purpose ?? 'examination'],
    )).rows[0].id)
  const record = async (c: Client, logId: number, envText: string) => (await c.query('SELECT run_id, result FROM public.creator_record_v2_record_examination($1, $2)', [logId, envText])).rows[0] as { run_id: string; result: string }
  const status = async (c: Client, nonce: string) => (await c.query('SELECT * FROM public.creator_record_v2_examination_uat_status($1)', [nonce])).rows
  const count = async (sql: string, args: unknown[] = []) => Number((await admin.query(sql, args)).rows[0].n)
  /** A fresh test identity, an active grant, its seeded stored document and an envelope for it. */
  async function ready(o: { events?: number; interval?: string; fixture?: ReplayFixture } = {}) {
    await revokeAll()
    const owner = await user()
    const g = await grant({ user: owner, events: o.events, interval: o.interval, fixture: o.fixture })
    const docId = await seed(g.id, owner, o.fixture ?? F)
    const env = await envelopeFor(o.fixture ?? F, docId, owner)
    return { owner, grant: g, docId, env, log: () => logRead(svc, docId, owner) }
  }

  beforeAll(async () => {
    assertDisposable(URL as string)
    admin = new Client({ connectionString: URL })
    await admin.connect()
    svc = await connect('service_role')
  })
  afterAll(async () => {
    for (const c of extra) await c.end().catch(() => undefined)
    await admin?.end()
  })

  // ── Preflight pack and migration preconditions (each test builds its own schema) ─────────────────────

  describe('read-only preflight pack and migration preconditions', () => {
    const run = async (file: string) => {
      await admin.query('BEGIN READ ONLY')
      try {
        return (await admin.query(readFileSync(join(PREFLIGHT, file), 'utf8'))).rows[0]
      } finally {
        await admin.query('ROLLBACK')
      }
    }

    test('on the post-DOC-1 schema (as in Production today): U1 all absent, U2 establishable, U3 matches DOC-1, U4 empty — all READ ONLY', async () => {
      expect((await admin.query('SHOW server_version')).rows[0].server_version).toMatch(/^15\./)
      await schema(DOC1_CHAIN)
      const owner = await user()
      await ownerDoc(owner)
      const u1 = (await run('u1_object_presence.sql')).u1
      expect(Object.values(u1).every((v) => v === false)).toBe(true)
      expect(Object.keys(u1)).toHaveLength(12)
      const u2 = (await run('u2_document_provenance.sql')).u2
      expect(u2).toMatchObject({ documents_total: 1, documents_with_intake_consent: 1, documents_with_other_consent: 0, provenance_establishable: true, documents_by_state: { stored: 1 } })
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { compare } = require(join(PREFLIGHT, 'compare.js'))
      const expected = JSON.parse(readFileSync(join(PREFLIGHT, 'expected', 'u3_post_doc1.json'), 'utf8'))
      expect(compare((await run('u3_doc1_fingerprint.sql')).u3, expected)).toEqual([])
      // STUB: the CLI migration-history table, as Supabase has it.
      await admin.query('DROP SCHEMA IF EXISTS supabase_migrations CASCADE; CREATE SCHEMA supabase_migrations; CREATE TABLE supabase_migrations.schema_migrations (version text PRIMARY KEY)')
      expect((await run('u4_migration_history.sql')).u4).toEqual({ recorded: [] })
      await admin.query('DROP SCHEMA supabase_migrations CASCADE')
    })

    test('a document with any other consent value: U2 says not establishable and the migration REFUSES, classifying nothing', async () => {
      await schema([...DOC1_CHAIN, DOC2CB])
      const owner = await user()
      await ownerDoc(owner, F, 'DRAFT-UNAPPROVED-test')
      expect((await run('u2_document_provenance.sql')).u2).toMatchObject({ documents_with_other_consent: 1, provenance_establishable: false })
      const r = await fail(admin.query(readFileSync(MIGRATION, 'utf8')))
      expect([r.code, r.message]).toEqual(['P0001', 'historical document provenance cannot be established: a document does not carry the only consent value the DOC-1 intake writes; refusing to classify it'])
      expect(await count(`SELECT count(*) n FROM information_schema.columns WHERE table_name = 'creator_record_v2_documents' AND column_name = 'origin'`)).toBe(0)
    })

    test('historical rows with the intake consent (pending, stored and deleted) become owner_upload without firing any DOC-1 trigger', async () => {
      await schema([...DOC1_CHAIN, DOC2CB])
      const owner = await user()
      const stored = await ownerDoc(owner)
      const deleted = await ownerDoc(owner, F2)
      await svc.query(`UPDATE public.creator_record_v2_documents SET state = 'deleted', deleted_at = now() WHERE id = $1`, [deleted])
      const pending = randomUUID()
      await svc.query(`INSERT INTO public.creator_record_v2_documents (id, user_id, sha256, media_type, byte_size, file_name, storage_path, consent_version, state) VALUES ($1, $2, $3, 'application/pdf', 10, 'r', $4, $5, 'pending')`, [pending, owner, 'c'.repeat(64), `${owner}/${pending}`, INTAKE_CONSENT])
      await admin.query(readFileSync(MIGRATION, 'utf8'))
      const rows = (await admin.query('SELECT id, state, origin, seed_grant_id, consent_version FROM public.creator_record_v2_documents ORDER BY state')).rows
      expect(rows.map((r) => [r.state, r.origin, r.seed_grant_id, r.consent_version])).toEqual([['deleted', 'owner_upload', null, INTAKE_CONSENT], ['pending', 'owner_upload', null, INTAKE_CONSENT], ['stored', 'owner_upload', null, INTAKE_CONSENT]])
      expect([stored, deleted, pending].sort()).toEqual(rows.map((r) => r.id).sort())
    })

    test('an unexpected DOC-2C-B run constraint makes the migration refuse instead of replacing it', async () => {
      await schema([...DOC1_CHAIN, DOC2CB])
      await admin.query(`ALTER TABLE public.creator_record_v2_examination_runs DROP CONSTRAINT creator_record_v2_examination_runs_execution_boundary_check,
                         ADD CONSTRAINT creator_record_v2_examination_runs_execution_boundary_check CHECK (execution_boundary IN ('isolated_synthetic_test', 'production'))`)
      const r = await fail(admin.query(readFileSync(MIGRATION, 'utf8')))
      expect([r.code, r.message.startsWith('unexpected execution_boundary constraint')]).toEqual(['P0001', true])
    })

    test('it requires DOC-2C-B', async () => {
      await schema(DOC1_CHAIN)
      expect((await fail(admin.query(readFileSync(MIGRATION, 'utf8')))).message).toBe('20261105000000 requires 20261103000000 and 20261104000000')
    })

    test('DOC-1 PRIVILEGE BOUNDARY: the DOC-1 functions and DOC-1 table grants are byte-identical before and after; U1 is all present afterwards', async () => {
      await schema([...DOC1_CHAIN, DOC2CB])
      const fingerprint = async () => (await admin.query(`
        SELECT p.proname, md5(p.prosrc) AS src, p.prosecdef, p.proconfig, pg_get_userbyid(p.proowner) AS owner, p.proacl::text AS acl
          FROM pg_proc p WHERE p.pronamespace = 'public'::regnamespace
           AND p.proname IN ('creator_record_v2_documents_guard', 'creator_record_v2_prepared_documents_link', 'creator_record_v2_append_only_guard', 'creator_record_v2_jsonb_exact_keys', 'creator_record_v2_examination_environment_guard', 'creator_record_v2_examination_append_only_guard')
         ORDER BY 1`)).rows
      const grants = async () => (await admin.query(`
        SELECT c.relname, r.role, has_table_privilege(r.role, c.oid, 'SELECT') s, has_table_privilege(r.role, c.oid, 'INSERT') i, has_table_privilege(r.role, c.oid, 'UPDATE') u, has_table_privilege(r.role, c.oid, 'DELETE') d
          FROM pg_class c CROSS JOIN unnest(ARRAY['anon', 'authenticated', 'service_role']) r(role)
         WHERE c.relnamespace = 'public'::regnamespace AND c.relname IN ('creator_record_v2_documents', 'creator_record_v2_prepared_documents', 'creator_record_v2_evidence_access_log', 'creator_record_v2_examination_runs', 'creator_record_v2_synthetic_fixtures', 'creator_record_v2_examination_environment')
         ORDER BY 1, 2`)).rows
      const before = { f: await fingerprint(), g: await grants() }
      await admin.query(readFileSync(MIGRATION, 'utf8'))
      expect({ f: await fingerprint(), g: await grants() }).toEqual(before)
      expect(before.f.find((r) => r.proname === 'creator_record_v2_documents_guard')).toMatchObject({ prosecdef: false, proconfig: null })
      const u1 = (await run('u1_object_presence.sql')).u1
      expect(Object.values(u1).every((v) => v === true)).toBe(true)
    })
  })

  // ── Everything below runs on the full schema ──────────────────────────────────────────────────────────

  describe('on the full schema', () => {
    beforeAll(async () => {
      await full()
    })

    describe('privileges and the database boundary', () => {
      test('the migration re-applies idempotently; the two DOC-2C-B constraints are replaced by one authority constraint', async () => {
        await admin.query(readFileSync(MIGRATION, 'utf8'))
        const names = (await admin.query(`SELECT conname FROM pg_constraint WHERE conrelid = 'public.creator_record_v2_examination_runs'::regclass AND contype = 'c' AND (conname LIKE '%boundary%' OR conname LIKE '%project_ref%' OR conname LIKE '%authority%')`)).rows.map((r) => r.conname)
        expect(names).toEqual(['creator_record_v2_examination_runs_authority_check'])
      })

      test('grants: RLS on, no policies; no API role holds any privilege; the service role can neither read, create, expand, revoke, delete nor truncate', async () => {
        expect((await admin.query(`SELECT relrowsecurity r FROM pg_class WHERE oid = '${GRANTS}'::regclass`)).rows[0].r).toBe(true)
        expect(await count(`SELECT count(*) n FROM pg_policies WHERE tablename = 'creator_record_v2_examination_uat_grants'`)).toBe(0)
        for (const role of ['anon', 'authenticated', 'service_role', 'public']) for (const p of ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER'])
          expect([role, p, (await admin.query('SELECT has_table_privilege($1, $2, $3) ok', [role, GRANTS, p])).rows[0].ok]).toEqual([role, p, false])
        const owner = await user()
        for (const q of [
          `SELECT * FROM ${GRANTS}`,
          `INSERT INTO ${GRANTS} (test_user_id, document_sha256, supabase_project_ref, binding_nonce_sha256, established_by, reason, change_ref, expires_at, max_read_events) VALUES ('${owner}', '${F.sha256}', '${PROD_REF}', '${'a'.repeat(64)}', 'x', 'y', 'z', now() + interval '1 hour', 4)`,
          `UPDATE ${GRANTS} SET max_read_events = 4`,
          `UPDATE ${GRANTS} SET revoked_at = now(), revoked_by = 'x', revoke_reason = 'y'`,
          `DELETE FROM ${GRANTS}`,
          `TRUNCATE ${GRANTS}`,
        ]) expect([q.slice(0, 20), (await fail(svc.query(q))).code]).toEqual([q.slice(0, 20), '42501'])
      })

      test('functions: EXECUTE only on the write and status functions, only for the service role; definer functions pin search_path; the seed binding cannot be called directly', async () => {
        const fns = ['creator_record_v2_record_examination(bigint, text)', 'creator_record_v2_examination_uat_status(text)', 'creator_record_v2_evidence_access_log_insert_guard()', 'creator_record_v2_documents_seed_binding()', 'creator_record_v2_documents_provenance_guard()', 'creator_record_v2_prepared_documents_origin_guard()', 'creator_record_v2_examination_uat_grant_guard()', 'creator_record_v2_examination_environment_exclusivity()']
        for (const f of fns) for (const role of ['public', 'anon', 'authenticated', 'service_role']) {
          const ok = (await admin.query('SELECT has_function_privilege($1, $2, $3) ok', [role, `public.${f}`, 'EXECUTE'])).rows[0].ok
          expect([f, role, ok]).toEqual([f, role, role === 'service_role' && (f.startsWith('creator_record_v2_record_examination') || f.startsWith('creator_record_v2_examination_uat_status'))])
        }
        const rows = (await admin.query(`SELECT proname, prosecdef, proconfig FROM pg_proc WHERE pronamespace = 'public'::regnamespace AND proname = ANY($1) ORDER BY proname`, [fns.map((f) => f.split('(')[0])])).rows
        const definers = rows.filter((r) => r.prosecdef).map((r) => r.proname)
        expect(definers).toEqual(['creator_record_v2_documents_seed_binding', 'creator_record_v2_evidence_access_log_insert_guard', 'creator_record_v2_examination_uat_status', 'creator_record_v2_record_examination'])
        for (const r of rows) expect([r.proname, r.proconfig]).toEqual([r.proname, ['search_path=public, pg_temp']])
        expect((await fail(svc.query('SELECT public.creator_record_v2_documents_seed_binding()'))).code).toBe('42501')
        expect((await fail(admin.query('SELECT public.creator_record_v2_documents_seed_binding()'))).code).toBe('0A000')
        // Definers are owned by the owner of the tables they guard; application roles own nothing and cannot add triggers.
        const tableOwner = (await admin.query(`SELECT pg_get_userbyid(relowner) o FROM pg_class WHERE oid = 'public.creator_record_v2_documents'::regclass`)).rows[0].o
        const owners = (await admin.query(`SELECT DISTINCT pg_get_userbyid(proowner) o FROM pg_proc WHERE pronamespace = 'public'::regnamespace AND proname = ANY($1)`, [definers])).rows.map((r) => r.o)
        expect(owners).toEqual([tableOwner])
        expect((await admin.query(`SELECT pg_get_userbyid(relowner) o FROM pg_class WHERE oid = '${GRANTS}'::regclass`)).rows[0].o).toBe(tableOwner)
        for (const t of ['public.creator_record_v2_documents', GRANTS, 'public.creator_record_v2_evidence_access_log', 'public.creator_record_v2_examination_runs', 'public.creator_record_v2_prepared_documents'])
          for (const role of ['anon', 'authenticated', 'service_role']) expect([t, role, (await admin.query(`SELECT has_table_privilege($1, $2, 'TRIGGER') ok`, [role, t])).rows[0].ok]).toEqual([t, role, false])
        expect((await fail(svc.query('ALTER FUNCTION public.creator_record_v2_documents_seed_binding() SECURITY INVOKER'))).code).toBe('42501')
        expect((await fail(svc.query('ALTER TABLE public.creator_record_v2_documents DISABLE TRIGGER creator_record_v2_documents_provenance_guard'))).code).toBe('42501')
      })
    })

    describe('document provenance and consent', () => {
      beforeEach(async () => {
        await revokeAll()
        await removeMarker()
      })

      test('owner_upload (the default) keeps the DOC-1 consent requirement: no NULL, no empty value, no seeding grant', async () => {
        const owner = await user()
        const id = await ownerDoc(owner)
        expect((await admin.query('SELECT origin, consent_version, seed_grant_id FROM public.creator_record_v2_documents WHERE id = $1', [id])).rows[0]).toEqual({ origin: 'owner_upload', consent_version: INTAKE_CONSENT, seed_grant_id: null })
        const ins = (consent: string | null, extraCols = '', extraVals = '') => {
          const d = randomUUID()
          return svc.query(`INSERT INTO public.creator_record_v2_documents (id, user_id, sha256, media_type, byte_size, file_name, storage_path, consent_version, state${extraCols}) VALUES ($1, $2, $3, 'application/pdf', 10, 'r', $4, $5, 'pending'${extraVals})`, [d, owner, 'd'.repeat(64), `${owner}/${d}`, consent])
        }
        expect((await fail(ins(null))).code).toBe('23514')
        expect((await fail(ins('  '))).code).toBe('23514')
        const g = await grant({ user: await user() })
        expect((await fail(ins(INTAKE_CONSENT, ', seed_grant_id', `, '${g.id}'`))).code).toBe('23514')
        expect((await fail(ins(INTAKE_CONSENT, ', origin', `, 'something_else'`))).code).toBe('23514')
      })

      test('operator_synthetic_seed carries NO consent and needs an active grant; a refused seed leaves the grant unbound', async () => {
        const owner = await user()
        const none = await fail(seedInsert(svc, randomUUID(), randomUUID(), owner))
        expect([none.code, none.message]).toEqual(['P0001', 'operator seeding requires an active examination UAT grant'])
        const g = await grant({ user: owner })
        const withConsent = await fail(seedInsert(svc, randomUUID(), g.id, owner, F, INTAKE_CONSENT))
        expect(withConsent.code).toBe('23514')
        expect((await admin.query(`SELECT bound_document_id FROM ${GRANTS} WHERE id = $1`, [g.id])).rows[0].bound_document_id).toBeNull()
        const noGrant = await fail(svc.query(`INSERT INTO public.creator_record_v2_documents (id, user_id, sha256, media_type, byte_size, file_name, storage_path, state, origin) VALUES ($1, $2, $3, 'application/pdf', 10, 'r', $4, 'pending', 'operator_synthetic_seed')`, [randomUUID(), owner, F.sha256, `${owner}/x`]))
        expect(noGrant.code).toBe('P0001')
      })

      test('provenance is immutable, including NULL consent (which the DOC-1 guard’s <> comparison would miss)', async () => {
        const owner = await user()
        const g = await grant({ user: owner })
        const seeded = await seed(g.id, owner)
        const owned = await ownerDoc(await user())
        for (const [id, set] of [
          [seeded, `consent_version = '${INTAKE_CONSENT}'`], [seeded, `origin = 'owner_upload', seed_grant_id = NULL, consent_version = 'x'`], [seeded, `seed_grant_id = NULL`],
          [owned, `origin = 'operator_synthetic_seed'`], [owned, `consent_version = 'other'`],
        ] as const) {
          const r = await fail(svc.query(`UPDATE public.creator_record_v2_documents SET ${set} WHERE id = $1`, [id]))
          expect([set, r.code, r.message === 'document provenance is immutable' || r.message === 'document content is immutable']).toEqual([set, 'P0001', true])
        }
      })

      test('the DOC-1 owner life cycle is unchanged: pending → stored → deleted; a pending upload may be removed; a stored one may not', async () => {
        const owner = await user()
        const id = randomUUID()
        await svc.query(`INSERT INTO public.creator_record_v2_documents (id, user_id, sha256, media_type, byte_size, file_name, storage_path, consent_version, state) VALUES ($1, $2, $3, 'application/pdf', 10, 'r', $4, $5, 'pending')`, [id, owner, 'e'.repeat(64), `${owner}/${id}`, INTAKE_CONSENT])
        expect((await fail(svc.query(`UPDATE public.creator_record_v2_documents SET state = 'deleted', deleted_at = now() WHERE id = $1`, [id]))).code).toBe('P0001')
        await svc.query(`UPDATE public.creator_record_v2_documents SET state = 'stored', stored_at = now() WHERE id = $1`, [id])
        expect((await fail(svc.query('DELETE FROM public.creator_record_v2_documents WHERE id = $1', [id]))).message).toBe('only a pending (unfinished) upload may be removed')
        await svc.query(`UPDATE public.creator_record_v2_documents SET state = 'deleted', deleted_at = now() WHERE id = $1`, [id])
        const p2 = randomUUID()
        await svc.query(`INSERT INTO public.creator_record_v2_documents (id, user_id, sha256, media_type, byte_size, file_name, storage_path, consent_version, state) VALUES ($1, $2, $3, 'application/pdf', 10, 'r', $4, $5, 'pending')`, [p2, owner, 'e'.repeat(64), `${owner}/${p2}`, INTAKE_CONSENT])
        await svc.query('DELETE FROM public.creator_record_v2_documents WHERE id = $1', [p2])
      })
    })

    describe('grant creation, immutability and once-only binding', () => {
      beforeEach(async () => {
        await revokeAll()
        await removeMarker()
      })

      test('operator limits: at most 2 hours, 1..4 read events, exactly 1 new run, a committed fixture, created unbound and unrevoked', async () => {
        const owner = await user()
        expect((await fail(grant({ user: owner, interval: '121 minutes' }))).code).toBe('23514')
        expect((await fail(grant({ user: owner, interval: '-1 minutes' }))).code).toBe('23514')
        expect((await fail(grant({ user: owner, events: 5 }))).code).toBe('23514')
        expect((await fail(grant({ user: owner, events: 0 }))).code).toBe('23514')
        expect((await fail(admin.query(`INSERT INTO ${GRANTS} (test_user_id, document_sha256, supabase_project_ref, binding_nonce_sha256, established_by, reason, change_ref, expires_at, max_read_events, max_new_runs) VALUES ($1, $2, $3, $4, 'o', 'r', 'c', now() + interval '1 hour', 4, 2)`, [owner, F.sha256, PROD_REF, 'b'.repeat(64)]))).code).toBe('23514')
        expect((await fail(grant({ user: owner, fixture: { ...F, sha256: 'f'.repeat(64) } }))).code).toBe('23503')
        expect((await fail(admin.query(`INSERT INTO ${GRANTS} (test_user_id, document_sha256, supabase_project_ref, binding_nonce_sha256, established_by, reason, change_ref, expires_at, max_read_events, bound_document_id) VALUES ($1, $2, $3, $4, 'o', 'r', 'c', now() + interval '1 hour', 4, $5)`, [owner, F.sha256, PROD_REF, 'c'.repeat(64), randomUUID()]))).message).toBe('an examination UAT grant is created unbound and unrevoked')
        const g = await grant({ user: owner, interval: '120 minutes' })
        const row = (await admin.query(`SELECT created_at, expires_at, max_new_runs FROM ${GRANTS} WHERE id = $1`, [g.id])).rows[0]
        expect([new Date(row.expires_at).getTime() - new Date(row.created_at).getTime(), row.max_new_runs]).toEqual([2 * 60 * 60 * 1000, 1])
      })

      test('a dedicated test identity only: not an admin, not invited, no submission, no prepared record, no live document', async () => {
        const refused = 'the test identity must be a dedicated non-admin user with no invitation, submission, prepared record or live document'
        const a = await user(); await admin.query('UPDATE public.users SET is_admin = true WHERE id = $1', [a])
        const b = await user(); await admin.query(`INSERT INTO public.creator_record_v2_pilot_access (user_id, added_by, reason) VALUES ($1, 'x', 'y')`, [b])
        const c = await user(); await admin.query('INSERT INTO public.submissions (user_id) VALUES ($1)', [c])
        const d = await user(); await ownerDoc(d)
        for (const u of [a, b, c, d, randomUUID()]) {
          const r = await fail(grant({ user: u }))
          expect([r.code, r.message]).toEqual(['P0001', refused])
        }
      })

      test('one active grant at a time; a revoked or expired grant does not block a new one', async () => {
        const g1 = await grant({ user: await user() })
        expect((await fail(grant({ user: await user() }))).message).toBe('another examination UAT grant is active')
        await revokeAll()
        await grant({ user: await user(), interval: '1 second' })
        await sleep(1200)
        await grant({ user: await user() })
        expect(g1.id).toBeTruthy()
      })

      test('a grant cannot be changed, extended, widened, re-pointed, bound by hand, deleted or revoked twice', async () => {
        const owner = await user()
        const g = await grant({ user: owner })
        for (const set of [`expires_at = expires_at + interval '1 minute'`, 'max_read_events = 3', `test_user_id = '${await user()}'`, `document_sha256 = '${F2.sha256}'`, `supabase_project_ref = '${TEST_REF}'`, `binding_nonce_sha256 = '${'d'.repeat(64)}'`, `reason = 'x'`])
          expect([set, (await fail(admin.query(`UPDATE ${GRANTS} SET ${set} WHERE id = $1`, [g.id]))).message]).toEqual([set, 'an examination UAT grant cannot be changed, extended or widened'])
        expect((await fail(admin.query(`UPDATE ${GRANTS} SET bound_document_id = $2 WHERE id = $1`, [g.id, randomUUID()]))).message).toBe('an examination UAT grant is bound only by seeding its document')
        expect((await fail(admin.query(`DELETE FROM ${GRANTS} WHERE id = $1`, [g.id]))).message).toBe('an examination UAT grant is never deleted; revoke it')
        expect((await fail(admin.query(`UPDATE ${GRANTS} SET revoked_at = now() WHERE id = $1`, [g.id]))).code).toBe('23514')
        await admin.query(`UPDATE ${GRANTS} SET revoked_at = now(), revoked_by = 'op', revoke_reason = 'done' WHERE id = $1`, [g.id])
        expect((await fail(admin.query(`UPDATE ${GRANTS} SET revoked_by = 'someone else' WHERE id = $1`, [g.id]))).message).toBe('an examination UAT grant revocation is final')
      })

      test('seeding binds the grant to its one document, once; wrong identity or fixture, a second seed, or a revoked or expired grant are refused', async () => {
        const owner = await user()
        const g = await grant({ user: owner })
        expect((await fail(seedInsert(svc, randomUUID(), g.id, await user()))).message).toBe('operator seeding must place the grant\'s one synthetic document for its test identity')
        expect((await fail(seedInsert(svc, randomUUID(), g.id, owner, F2))).message).toBe('operator seeding must place the grant\'s one synthetic document for its test identity')
        const docId = await seed(g.id, owner)
        expect((await admin.query(`SELECT bound_document_id FROM ${GRANTS} WHERE id = $1`, [g.id])).rows[0].bound_document_id).toBe(docId)
        expect((await fail(seedInsert(svc, randomUUID(), g.id, owner))).message).toBe('this examination UAT grant is already bound to a document')
        await revokeAll()
        const o2 = await user()
        const revoked = await grant({ user: o2 })
        await revokeAll()
        expect((await fail(seedInsert(svc, randomUUID(), revoked.id, o2))).message).toBe('operator seeding requires an active examination UAT grant')
        const o3 = await user()
        const expiring = await grant({ user: o3, interval: '1 second' })
        await sleep(1200)
        expect((await fail(seedInsert(svc, randomUUID(), expiring.id, o3))).message).toBe('operator seeding requires an active examination UAT grant')
      })

      test('PARTIAL SEED: a pending seeded row (no object yet) cannot be examined, the grant stays bound, and removing the row never frees the grant for another document', async () => {
        const owner = await user()
        const g = await grant({ user: owner })
        const pending = await seed(g.id, owner, F, false)
        const r = await fail(logRead(svc, pending, owner))
        expect([r.code, r.message]).toEqual(['P0001', 'an examination read is logged only for the owner of a stored document'])
        // Ordinary cleanup (the service role) cannot remove it; only the database operator can, as a governed step.
        expect((await fail(svc.query('DELETE FROM public.creator_record_v2_documents WHERE id = $1', [pending]))).message).toBe('an operator-seeded synthetic document is removed only by the database operator')
        await admin.query('DELETE FROM public.creator_record_v2_documents WHERE id = $1', [pending])
        expect((await admin.query(`SELECT bound_document_id FROM ${GRANTS} WHERE id = $1`, [g.id])).rows[0].bound_document_id).toBe(pending)
        expect((await fail(seedInsert(svc, randomUUID(), g.id, owner))).message).toBe('this examination UAT grant is already bound to a document')
      })

      test('NO REMOVAL BY APPLICATION ROLES: a seeded row can be neither deleted nor marked deleted by service_role; owner uploads keep the DOC-1 rules; the operator can', async () => {
        const owner = await user()
        const g = await grant({ user: owner })
        const stored = await seed(g.id, owner)
        const refused = 'an operator-seeded synthetic document is removed only by the database operator'
        expect((await fail(svc.query(`UPDATE public.creator_record_v2_documents SET state = 'deleted', deleted_at = now() WHERE id = $1`, [stored]))).message).toBe(refused)
        expect((await fail(svc.query('DELETE FROM public.creator_record_v2_documents WHERE id = $1', [stored]))).code).toBe('P0001')
        for (const role of ['authenticated', 'anon'] as const) expect((await fail((await connect(role)).query('DELETE FROM public.creator_record_v2_documents WHERE id = $1', [stored]))).code).toBe('42501')
        expect((await admin.query('SELECT state FROM public.creator_record_v2_documents WHERE id = $1', [stored])).rows[0].state).toBe('stored')
        const ownerUpload = await ownerDoc(await user())
        await svc.query(`UPDATE public.creator_record_v2_documents SET state = 'deleted', deleted_at = now() WHERE id = $1`, [ownerUpload])
        await admin.query(`UPDATE public.creator_record_v2_documents SET state = 'deleted', deleted_at = now() WHERE id = $1`, [stored])
        expect((await admin.query('SELECT state FROM public.creator_record_v2_documents WHERE id = $1', [stored])).rows[0].state).toBe('deleted')
      })

      test('the status function answers only for the exact code: wrong, short or missing codes see nothing', async () => {
        const owner = await user()
        const g = await grant({ user: owner, events: 3 })
        const rows = await status(svc, g.nonce)
        expect(rows).toHaveLength(1)
        expect(rows[0]).toMatchObject({ grant_id: g.id, test_user_id: owner, document_sha256: F.sha256, bound_document_id: null, supabase_project_ref: PROD_REF, active: true, revoked: false, read_events_used: 0, max_read_events: 3, new_runs_used: 0, max_new_runs: 1 })
        expect(Object.keys(rows[0])).not.toContain('binding_nonce_sha256')
        for (const bad of [newNonce(), g.nonce.slice(0, 20), '', 'x'.repeat(300)]) expect(await status(svc, bad)).toEqual([])
        expect((await svc.query('SELECT * FROM public.creator_record_v2_examination_uat_status(NULL)')).rows).toEqual([])
      })
    })

    describe('marker and grant are mutually exclusive', () => {
      beforeEach(async () => {
        await revokeAll()
        await removeMarker()
      })

      test('a marker blocks a grant; an active grant blocks a marker; an expired grant does not', async () => {
        await establish()
        expect((await fail(grant({ user: await user() }))).message).toBe('an examination UAT grant cannot coexist with the isolated-test environment marker')
        await removeMarker()
        await grant({ user: await user(), interval: '1 second' })
        expect((await fail(establish())).message).toBe('the isolated-test environment marker cannot coexist with an active examination UAT grant')
        await sleep(1200)
        await establish()
        await removeMarker()
      })

      test.each(['grant first', 'marker first'])('concurrently (%s): the second transaction waits for the first and is refused', async (order) => {
        const a = await connect()
        const b = await connect()
        const owner = await user()
        await a.query('BEGIN')
        if (order === 'grant first') await grant({ user: owner, c: a })
        else await a.query(`INSERT INTO public.creator_record_v2_examination_environment (environment_kind, supabase_project_ref, established_by, reason) VALUES ('isolated_synthetic_test', '${TEST_REF}', 'op', 'concurrency')`)
        const second = order === 'grant first'
          ? fail(b.query(`INSERT INTO public.creator_record_v2_examination_environment (environment_kind, supabase_project_ref, established_by, reason) VALUES ('isolated_synthetic_test', '${TEST_REF}', 'op', 'concurrency')`))
          : fail(grant({ user: owner, c: b }))
        await sleep(300)
        await a.query('COMMIT')
        const r = await second
        expect([r.code, r.message]).toEqual(['P0001', order === 'grant first' ? 'the isolated-test environment marker cannot coexist with an active examination UAT grant' : 'an examination UAT grant cannot coexist with the isolated-test environment marker'])
        expect(await count('SELECT count(*) n FROM public.creator_record_v2_examination_environment')).toBe(order === 'grant first' ? 0 : 1)
        expect(await count(`SELECT count(*) n FROM ${GRANTS} WHERE revoked_at IS NULL AND expires_at > now()`)).toBe(order === 'grant first' ? 1 : 0)
      })

      test('FORCED coexistence (trigger disabled, test only): every examination read and run is refused', async () => {
        const { owner, docId, env } = await ready()
        const logId = await logRead(svc, docId, owner)
        await admin.query('ALTER TABLE public.creator_record_v2_examination_environment DISABLE TRIGGER creator_record_v2_examination_environment_exclusivity')
        try {
          await establish()
        } finally {
          await admin.query('ALTER TABLE public.creator_record_v2_examination_environment ENABLE TRIGGER creator_record_v2_examination_environment_exclusivity')
        }
        expect((await fail(logRead(svc, docId, owner))).message).toBe('examination reads are not authorized in this environment')
        expect((await fail(record(svc, logId, text(env)))).message).toBe('examination_environment_not_authorized')
        await removeMarker()
      })
    })

    describe('examination authorization and the activity budget', () => {
      beforeEach(async () => {
        await revokeAll()
        await removeMarker()
      })

      test('no grant and no marker: no examination read is ever logged (so nothing is read); download logging is untouched', async () => {
        const owner = await user()
        const docId = await ownerDoc(owner)
        expect((await fail(logRead(svc, docId, owner))).message).toBe('examination reads are not authorized in this environment')
        await logRead(svc, docId, owner, { purpose: 'file_download' })
        expect((await admin.query(`SELECT uat_grant_id FROM public.creator_record_v2_evidence_access_log WHERE document_id = $1`, [docId])).rows).toEqual([{ uat_grant_id: null }])
      })

      test('the happy path: one created run stamped operator_synthetic_uat with the grant and its project; the event carries the grant', async () => {
        const { owner, docId, env, grant: g, log } = await ready()
        const logId = await log()
        const saved = await record(svc, logId, text(env))
        expect(saved.result).toBe('created')
        const run = (await admin.query('SELECT execution_boundary, environment_project_ref, uat_grant_id, user_id, document_id, access_log_id FROM public.creator_record_v2_examination_runs WHERE id = $1', [saved.run_id])).rows[0]
        expect(run).toEqual({ execution_boundary: 'operator_synthetic_uat', environment_project_ref: PROD_REF, uat_grant_id: g.id, user_id: owner, document_id: docId, access_log_id: String(logId) })
        expect((await admin.query('SELECT uat_grant_id FROM public.creator_record_v2_evidence_access_log WHERE id = $1', [logId])).rows[0].uat_grant_id).toBe(g.id)
        expect((await status(svc, g.nonce))[0]).toMatchObject({ read_events_used: 1, new_runs_used: 1, bound_document_id: docId })
      })

      test('the caller can never choose the grant an event consumes (download rows and spoofed values are forced)', async () => {
        const { owner, docId, grant: g } = await ready()
        const other = randomUUID()
        const id1 = await logRead(svc, docId, owner, { purpose: 'file_download', grant: g.id })
        const id2 = Number((await svc.query(`INSERT INTO public.creator_record_v2_evidence_access_log (document_id, actor_user_id, actor_role, purpose, uat_grant_id) VALUES ($1, $2, 'owner', 'examination', $3) RETURNING id`, [docId, owner, other]).catch(() => ({ rows: [{ id: -1 }] }))).rows[0].id)
        const rows = (await admin.query('SELECT id, uat_grant_id FROM public.creator_record_v2_evidence_access_log WHERE id = ANY($1) ORDER BY id', [[id1, id2]])).rows
        expect(rows).toEqual([{ id: String(id1), uat_grant_id: null }, { id: String(id2), uat_grant_id: g.id }])
      })

      test('wrong identity or wrong document is refused before any read', async () => {
        const { owner, grant: g } = await ready()
        const stranger = await user()
        const strangerDoc = await ownerDoc(stranger)
        expect((await fail(logRead(svc, strangerDoc, stranger))).message).toBe('examination_uat_target_mismatch')
        const ownerSecond = await ownerDoc(owner, F2) // a later owner_upload document of the test identity (not the grant's)
        expect((await fail(logRead(svc, ownerSecond, owner))).message).toBe('examination_uat_target_mismatch')
        expect((await fail(logRead(svc, strangerDoc, owner))).message).toBe('an examination read is logged only for the owner of a stored document')
        expect((await status(svc, g.nonce))[0].read_events_used).toBe(0)
      })

      test('expired or revoked grants are refused; revoking or expiring AFTER an event makes the run refused', async () => {
        const a = await ready()
        const logA = await a.log()
        await revokeAll()
        expect((await fail(a.log())).message).toBe('examination reads are not authorized in this environment')
        expect((await fail(record(svc, logA, text(a.env)))).message).toBe('examination_environment_not_authorized')
        const b = await ready({ interval: '2 seconds' })
        const logB = await b.log()
        await sleep(2300)
        expect((await fail(b.log())).message).toBe('examination reads are not authorized in this environment')
        expect((await fail(record(svc, logB, text(b.env)))).message).toBe('examination_environment_not_authorized')
        expect(await count('SELECT count(*) n FROM public.creator_record_v2_examination_runs WHERE uat_grant_id = ANY($1)', [[a.grant.id, b.grant.id]])).toBe(0)
      })

      test('BUDGET: four read events, never a fifth; failed reads (no run) consume their event', async () => {
        const { grant: g, log } = await ready({ events: 4 })
        for (let i = 0; i < 4; i++) await log() // each is a read whose examination then "failed": no run is recorded
        const r = await fail(log())
        expect([r.code, r.message]).toEqual(['P0001', 'examination_uat_budget_exhausted'])
        expect((await status(svc, g.nonce))[0]).toMatchObject({ read_events_used: 4, new_runs_used: 0 })
      })

      test('BUDGET under concurrency: 8 simultaneous attempts on separate connections → exactly 4 events', async () => {
        const { owner, docId, grant: g } = await ready({ events: 4 })
        const conns = await Promise.all(Array.from({ length: 8 }, () => connect('service_role')))
        const results = await Promise.all(conns.map((c) => fail(logRead(c, docId, owner))))
        expect(results.filter((r) => r.code === 'no error')).toHaveLength(4)
        expect(results.filter((r) => r.message === 'examination_uat_budget_exhausted')).toHaveLength(4)
        expect(await count('SELECT count(*) n FROM public.creator_record_v2_evidence_access_log WHERE uat_grant_id = $1', [g.id])).toBe(4)
      })

      test('an idempotent repeat consumes another event but creates no run; no second NEW run is permitted', async () => {
        const { owner, docId, env, grant: g, log } = await ready({ events: 4 })
        const first = await record(svc, await log(), text(env))
        const again = await record(svc, await log(), text(env))
        expect([first.result, again.result, again.run_id]).toEqual(['created', 'existing', first.run_id])
        const env2 = await envelopeFor(F, docId, owner, v2())
        const r = await fail(record(svc, await log(), text(env2)))
        expect([r.code, r.message]).toEqual(['P0001', 'examination_uat_budget_exhausted'])
        expect((await status(svc, g.nonce))[0]).toMatchObject({ read_events_used: 3, new_runs_used: 1 })
        expect(await count('SELECT count(*) n FROM public.creator_record_v2_examination_runs WHERE uat_grant_id = $1', [g.id])).toBe(1)
      })

      test('events never cross authorities: a marker-path event cannot be consumed on the grant path, nor a grant event on the marker path', async () => {
        await establish()
        const owner = await user()
        const docId = await ownerDoc(owner)
        const markerEvent = await logRead(svc, docId, owner)
        const markerEnv = await envelopeFor(F, docId, owner)
        await removeMarker()
        const g = await ready()
        expect((await fail(record(svc, markerEvent, text(markerEnv)))).message).toBe('examination_access_not_logged')
        const grantEvent = await g.log()
        await revokeAll()
        await establish()
        expect((await fail(record(svc, grantEvent, text(g.env)))).message).toBe('examination_access_not_logged')
        await removeMarker()
      })

      test('the run constraint pairs boundary, grant and project (direct operator inserts)', async () => {
        const { env, log } = await ready()
        const saved = await record(svc, await log(), text(env))
        const copy = (boundary: string, ref: string, grantId: string | null) => admin.query(
          `INSERT INTO public.creator_record_v2_examination_runs (examination_key, document_id, user_id, document_sha256, envelope_version, content_class, workflow_authorization, execution_boundary, environment_project_ref, profile_id, profile_version, schema_version, prompt_version, executor_mode, replay_set, recording_sha256, replay_fixture_id, outcome_status, outcome_reason, envelope_canonical, envelope_sha256, supersedes_id, access_log_id, uat_grant_id)
           SELECT repeat('e', 64), document_id, user_id, document_sha256, envelope_version, content_class, workflow_authorization, $2, $3, 'other', profile_version, schema_version, prompt_version, executor_mode, replay_set, recording_sha256, replay_fixture_id, outcome_status, outcome_reason, envelope_canonical, repeat('f', 64), NULL, access_log_id, $4
             FROM public.creator_record_v2_examination_runs WHERE id = $1`, [saved.run_id, boundary, ref, grantId])
        const g = (await admin.query('SELECT uat_grant_id FROM public.creator_record_v2_examination_runs WHERE id = $1', [saved.run_id])).rows[0].uat_grant_id
        for (const [b, ref, gid] of [['isolated_synthetic_test', TEST_REF, g], ['isolated_synthetic_test', PROD_REF, null], ['operator_synthetic_uat', PROD_REF, null], ['production', PROD_REF, g], ['operator_synthetic_uat', 'Bad-Ref', g]] as const)
          expect([b, ref, (await fail(copy(b, ref, gid))).code]).toEqual([b, ref, '23514'])
      })
    })

    describe('prepared records and the isolated path', () => {
      beforeEach(async () => {
        await revokeAll()
        await removeMarker()
      })
      const prepared = (owner: string, docId: string, docSha: string) => {
        const prepId = randomUUID()
        return svc.query(
          `INSERT INTO public.creator_record_v2_prepared (id, user_id, draft_id, version, record_ref, record_schema, record_schema_version, canonical, sha256, form_state, status)
           VALUES ($1, $2, $3, 1, $4, 'si8/creator-record-v2-record', 5, $5, $6, '{"answers":{}}'::jsonb, 'prepared')`,
          [prepId, owner, randomUUID(), `PREP-${prepId}`, JSON.stringify({ documents: { policy: 'inventory_only', items: [{ document_id: docId, sha256: docSha }] } }), 'c'.repeat(64)],
        )
      }

      test('an operator-seeded document can never enter a prepared record; an owner upload still links', async () => {
        const { owner, docId } = await ready()
        const r = await fail(prepared(owner, docId, F.sha256))
        expect([r.code, r.message]).toEqual(['P0001', 'an operator-seeded synthetic document cannot enter a prepared record'])
        const o2 = await user()
        const d2 = await ownerDoc(o2)
        await prepared(o2, d2, F.sha256)
        expect(await count('SELECT count(*) n FROM public.creator_record_v2_prepared_documents WHERE document_id = $1', [d2])).toBe(1)
      })

      test('ISOLATED PATH UNCHANGED (with both migrations): marker-path runs are stamped exactly as before, idempotent, never consume a grant', async () => {
        await establish()
        const owner = await user()
        const docId = await ownerDoc(owner)
        const env = await envelopeFor(F, docId, owner)
        const first = await record(svc, await logRead(svc, docId, owner), text(env))
        const again = await record(svc, await logRead(svc, docId, owner), text(env))
        expect([first.result, again.result, again.run_id]).toEqual(['created', 'existing', first.run_id])
        const run = (await admin.query('SELECT execution_boundary, environment_project_ref, uat_grant_id FROM public.creator_record_v2_examination_runs WHERE id = $1', [first.run_id])).rows[0]
        expect(run).toEqual({ execution_boundary: 'isolated_synthetic_test', environment_project_ref: TEST_REF, uat_grant_id: null })
        expect(await count('SELECT count(*) n FROM public.creator_record_v2_evidence_access_log WHERE document_id = $1 AND uat_grant_id IS NOT NULL', [docId])).toBe(0)
        const extraLimitation = ['fields_not_established', 'no_location_reference', 'partially_legible', 'illegible'].find((l) => !env.limitations.includes(l as never))!
        const conflict = { ...env, limitations: [...env.limitations, extraLimitation] }
        expect((await fail(record(svc, await logRead(svc, docId, owner), text(conflict)))).message).toBe('examination_key_conflict')
        await removeMarker()
      })
    })

    describe('reviewed operator SQL', () => {
      beforeEach(async () => {
        await revokeAll()
        await removeMarker()
      })
      const createSql = (o: { target: string; ref: string; email: string; fixture: string; hash: string }) => {
        let sql = readFileSync(join(OPERATOR, 'create_grant.sql'), 'utf8')
        sql = setConst(sql, 'c_target', o.target)
        sql = setConst(sql, 'c_project_ref', o.ref)
        sql = setConst(sql, 'c_test_user_email', o.email)
        sql = setConst(sql, 'c_fixture_id', o.fixture)
        sql = setConst(sql, 'c_nonce_sha256', o.hash)
        sql = setConst(sql, 'c_established_by', 'db test operator')
        sql = setConst(sql, 'c_change_ref', 'TEST-UAT-B')
        return setConst(sql, 'c_reason', 'operator SQL test')
      }

      test('create_grant.sql: refuses placeholders and a mismatched target; creates exactly one grant on a Production-shaped database; revoke_grant.sql revokes and deletes nothing', async () => {
        expect((await fail(admin.query(readFileSync(join(OPERATOR, 'create_grant.sql'), 'utf8')))).message).toBe('REFUSED: edit every EDIT constant first')
        // STUB: the assessments rows that tell Production from staging.
        await admin.query(`CREATE TABLE IF NOT EXISTS public.assessments (assessment_number text PRIMARY KEY, methodology_version text, is_system_test boolean)`)
        await admin.query(`DELETE FROM public.assessments`)
        const email = `uat-${randomUUID()}@example.test`
        const owner = await user(email)
        const nonce = newNonce()
        const base = { target: 'production', ref: PROD_REF, email, fixture: F.fixture_id, hash: sha(nonce) }
        expect((await fail(admin.query(createSql(base)))).message).toBe('REFUSED: this database does not look like Production')
        await admin.query(`INSERT INTO public.assessments VALUES ('ASSESS-005-2026-07-12', 'v0.1', false)`)
        expect((await fail(admin.query(createSql({ ...base, target: 'staging', ref: TEST_REF })))).message).toBe('REFUSED: this database does not look like the staging database')
        expect((await fail(admin.query(createSql({ ...base, ref: TEST_REF })))).message).toBe('REFUSED: a production grant must name the Production project ref')
        expect((await fail(admin.query(createSql({ ...base, fixture: 'no-such-fixture' })))).message).toBe('REFUSED: no-such-fixture is not a committed synthetic fixture')
        expect((await fail(admin.query(createSql({ ...base, email: 'nobody@example.test' })))).message).toBe('REFUSED: exactly one user must have that email (found 0)')
        await admin.query(createSql(base))
        const rows = await status(svc, nonce)
        expect(rows).toHaveLength(1)
        expect(rows[0]).toMatchObject({ test_user_id: owner, document_sha256: F.sha256, supabase_project_ref: PROD_REF, active: true, max_read_events: 4 })
        expect(new Date(rows[0].expires_at).getTime() - new Date(rows[0].created_at).getTime()).toBe(120 * 60 * 1000)
        const docId = await seed(rows[0].grant_id, owner)
        let revoke = readFileSync(join(OPERATOR, 'revoke_grant.sql'), 'utf8')
        expect((await fail(admin.query(revoke))).message).toBe('REFUSED: edit both EDIT constants first')
        revoke = setConst(setConst(revoke, 'c_revoked_by', 'db test operator'), 'c_revoke_reason', 'test complete')
        await admin.query(revoke)
        expect((await status(svc, nonce))[0]).toMatchObject({ active: false, revoked: true, bound_document_id: docId })
        expect(await count('SELECT count(*) n FROM public.creator_record_v2_documents WHERE id = $1', [docId])).toBe(1)
        expect(await count(`SELECT count(*) n FROM ${GRANTS} WHERE id = $1`, [rows[0].grant_id])).toBe(1)
        await admin.query('DROP TABLE public.assessments')
      })

      test('rollback_20261105.sql: refused once any grant exists; on a grant-free database it restores the exact DOC-2C-B schema', async () => {
        await admin.query('BEGIN')
        const refused = await fail(admin.query(readFileSync(join(OPERATOR, 'rollback_20261105.sql'), 'utf8')))
        await admin.query('ROLLBACK')
        expect([refused.code, refused.message]).toEqual(['P0001', '20261105 rollback refused: a UAT grant exists (revoke it; history is never dropped)'])

        const catalog = async () => ({
          cols: (await admin.query(`SELECT table_name, column_name, is_nullable FROM information_schema.columns WHERE table_schema = 'public' AND table_name LIKE 'creator_record_v2_%' ORDER BY 1, 2`)).rows,
          cons: (await admin.query(`SELECT conrelid::regclass::text t, conname, pg_get_constraintdef(oid) d FROM pg_constraint WHERE connamespace = 'public'::regnamespace AND conrelid::regclass::text LIKE '%creator_record_v2_%' ORDER BY 1, 2`)).rows,
          trg: (await admin.query(`SELECT tgrelid::regclass::text t, tgname FROM pg_trigger WHERE NOT tgisinternal AND tgrelid::regclass::text LIKE '%creator_record_v2_%' ORDER BY 1, 2`)).rows,
          fns: (await admin.query(`SELECT proname, md5(prosrc) s, prosecdef, proacl::text a FROM pg_proc WHERE pronamespace = 'public'::regnamespace AND proname LIKE 'creator_record_v2_%' ORDER BY 1`)).rows,
        })
        await schema([...DOC1_CHAIN, DOC2CB])
        const doc2cb = await catalog()
        await admin.query(readFileSync(MIGRATION, 'utf8'))
        const owner = await user()
        await ownerDoc(owner)
        await admin.query('BEGIN')
        await admin.query(readFileSync(join(OPERATOR, 'rollback_20261105.sql'), 'utf8'))
        await admin.query(readFileSync(DOC2CB, 'utf8'))
        await admin.query('COMMIT')
        expect(await catalog()).toEqual(doc2cb)
        await full() // leave the full schema for any later test
      })
    })
  })
})
