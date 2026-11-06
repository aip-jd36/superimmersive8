/**
 * CR-V2-DOC-LIVE-1C-A: real PostgreSQL tests for the EVALUATION-ONLY schema (supabase/evaluation-only/20261109000000).
 *
 * Proves it changes nothing that exists, that the service role cannot write authority or spend, that the authority, the cost ledger
 * (including concurrent reservations) and the result store hold in the database itself, and that the 1A store still refuses live output.
 * Live-shaped envelopes are built from the mock executor and relabelled; no model is called. Disposable local `si8_test_*` database only.
 */
import { readFileSync } from 'fs'
import { join } from 'path'
import { createHash, randomUUID } from 'crypto'
import { Client } from 'pg'
import { REPLAY_FIXTURES } from '@/lib/creator-record/evidence/replay-fixtures.data'
import { profileKey } from '@/lib/creator-record/examination/profile'
import { canonicalJson } from '@/lib/creator-record/record-core/canonical'
import { liveExaminationKey, parseLiveEnvelope, type LiveEnvelope, type LiveExecutorIdentity } from '@/lib/creator-record/live-examination/envelope'
import { RECEIPT_LIVE_PROFILE, runLiveExamination } from '@/lib/creator-record/live-examination/examine'
import { mockLiveExecutor, type MockStep } from '@/test-support/mock-live-executor'
import { syntheticPdf } from '@/test-support/synthetic-pdf'

const URL = process.env.DATABASE_URL_TEST
const DIR = join(__dirname, '..', '..', 'supabase', 'migrations')
const CHAIN = [
  '20261021000000_payment_fulfillments.sql', '20261022000000_payment_zero_total_paid.sql', '20261028000000_creator_record_artifacts.sql',
  '20261101000000_creator_record_v2_prepared.sql', '20261102000000_creator_record_v2_submission_binding.sql', '20261103000000_creator_record_v2_evidence.sql',
  '20261104000000_creator_record_v2_examination_runs.sql', '20261105000000_creator_record_v2_operator_synthetic_uat.sql', '20261106000000_creator_record_v2_customer_path_uat.sql',
  '20261107000000_creator_record_v2_admin_uat.sql', '20261108000000_creator_record_v2_live_examination_foundation.sql',
].map((f) => join(DIR, f))
const EVALUATION_SQL = readFileSync(join(__dirname, '..', '..', 'supabase', 'evaluation-only', '20261109000000_creator_record_v2_live_evaluation.sql'), 'utf8')
const CONSENT = 'DRAFT-UNAPPROVED-cr-v2-evidence-storage-consent-0'
const PROJECT = 'localpg15examination'
const MODEL = 'claude-sonnet-5'
const RESERVE = 138720
const F = REPLAY_FIXTURES.find((f) => f.fixture_id === 'pdf-kling-pro-monthly')!

function assertDisposable(url: string) {
  const u = new globalThis.URL(url)
  const db = u.pathname.replace(/^\//, '')
  if (!db.startsWith('si8_test_')) throw new Error(`refusing to run: database "${db}" is not si8_test_*`)
  if (!['localhost', '127.0.0.1', '::1', '[::1]'].includes(u.hostname)) throw new Error(`refusing to run: host "${u.hostname}" is not local`)
}
if (process.env.CI && !URL) throw new Error('DATABASE_URL_TEST is required in CI')
const maybe = URL ? describe : describe.skip

const fail = async (p: Promise<unknown>): Promise<string> => { try { await p; return 'no error' } catch (e) { return (e as Error).message } }
const sha = (b: Uint8Array) => createHash('sha256').update(b).digest('hex')
const LIVE: LiveExecutorIdentity = { mode: 'live_model', provider: 'anthropic', model: MODEL }

/** A mock examination of these bytes, relabelled into the live shape the evaluation store accepts. The mock path runs in memory only. */
async function liveEnvelope(documentId: string, owner: string, bytes: Uint8Array, steps: MockStep[] = [{ output: F.parsed_output }], executor: LiveExecutorIdentity = LIVE): Promise<LiveEnvelope> {
  const record = { id: documentId, user_id: owner, sha256: sha(bytes), media_type: 'application/pdf' as const, byte_size: bytes.length, state: 'stored' as const }
  const r = await runLiveExamination(
    { documents: { get: async () => record, readBytes: async () => bytes }, isKnownSyntheticFixture: () => true, executor: mockLiveExecutor(steps), profiles: new Map([[profileKey(RECEIPT_LIVE_PROFILE.ref), RECEIPT_LIVE_PROFILE]]), livePermitted: false, now: () => new Date() },
    { actor_user_id: owner, document_id: documentId, profile: { id: 'receipt', version: 1 } },
  )
  if (r.kind !== 'envelope') throw new Error(r.code)
  const e = r.envelope
  const key = liveExaminationKey({ document_id: documentId, sha256: e.document.sha256, profile: e.profile, executor })
  const out = {
    ...e, execution_origin: 'live_model', executor, content_class: 'customer_document', examination_key: key,
    limitations: e.limitations.filter((l) => l !== 'mock_test_data_not_model_output'),
    observations: e.observations.map((o) => ({ ...o, observation_id: key.slice(0, 16) + o.observation_id.slice(16), origin: 'live_model_extracted' })),
    provenance: { ...e.provenance, provider_response_id: e.outcome.status === 'examined' ? 'msg_01' : null },
  } as unknown as LiveEnvelope
  if (!parseLiveEnvelope(out)) throw new Error('relabelled envelope fails the parser')
  return out
}

maybe('creator record v2 live evaluation schema (PostgreSQL)', () => {
  let admin: Client
  let svc: Client
  const extra: Client[] = []
  const connect = async (role?: string) => { const c = new Client({ connectionString: URL }); extra.push(c); await c.connect(); if (role) await c.query(`SET ROLE ${role}`); return c }
  const user = async () => {
    const id = randomUUID()
    await admin.query('INSERT INTO public.users (id, email, name, is_admin) VALUES ($1, $2, $3, false)', [id, `${id}@example.test`, 'Tester'])
    return id
  }
  const upload = async (owner: string, bytes: Uint8Array = syntheticPdf(1, `eval-db-${randomUUID()}`), digest = sha(bytes)) => {
    const id = randomUUID()
    await svc.query(`INSERT INTO public.creator_record_v2_documents (id, user_id, sha256, media_type, byte_size, file_name, storage_path, consent_version, state) VALUES ($1, $2, $3, 'application/pdf', $4, 'receipt', $5, $6, 'pending')`, [id, owner, digest, bytes.length, `${owner}/${id}`, CONSENT])
    await svc.query(`UPDATE public.creator_record_v2_documents SET state = 'stored', stored_at = now() WHERE id = $1`, [id])
    return { id, bytes }
  }
  const authorize = async (operator: string, docs: string[], o: { env?: string; maxAttempts?: number; maxSpend?: number; expires?: string } = {}) => {
    const id = `eval-${randomUUID().slice(0, 8)}`
    await admin.query(
      `INSERT INTO public.creator_record_v2_live_evaluation_authorizations (evaluation_id, operator_user_id, environment_ref, provider, model, profile_id, profile_version, max_attempts, max_spend_micro_usd, attempt_reserve_micro_usd, approved_by, approval_reference, expires_at)
       VALUES ($1, $2, $3, 'anthropic', $4, 'receipt', 1, $5, $6, $7, 'db test approver', 'approval-ref-0001', now() + $8::interval)`,
      [id, operator, o.env ?? PROJECT, MODEL, o.maxAttempts ?? 18, o.maxSpend ?? 5_000_000, RESERVE, o.expires ?? '3 days'])
    for (const d of docs) await admin.query(`INSERT INTO public.creator_record_v2_live_evaluation_documents (evaluation_id, document_id, document_sha256, authority_reference) SELECT $1, id, sha256, 'consent-ref-0001' FROM public.creator_record_v2_documents WHERE id = $2`, [id, d])
    return id
  }
  const fresh = async (o: Parameters<typeof authorize>[2] = {}) => { const operator = await user(); const doc = await upload(operator); return { operator, doc, evaluation: await authorize(operator, [doc.id], o) } }
  const preflight = (e: string, op: string, d: string, c: Client = svc) => c.query('SELECT * FROM public.creator_record_v2_live_evaluation_preflight($1, $2, $3)', [e, op, d]).then((r) => r.rows[0])
  const reserve = (e: string, op: string, d: string, c: Client = svc) => c.query('SELECT * FROM public.creator_record_v2_live_evaluation_reserve($1, $2, $3)', [e, op, d]).then((r) => r.rows[0] as { reservation_id: string; reserved_micro_usd: string })
  const settle = (r: string, est: number, c: Client = svc) => c.query('SELECT public.creator_record_v2_live_evaluation_settle($1, 1, 1000, 200, true, $2) AS charged', [r, est]).then((x) => Number(x.rows[0].charged))
  const record = (r: string, log: number, text: string, c: Client = svc) => c.query('SELECT * FROM public.creator_record_v2_live_evaluation_record($1, $2, $3)', [r, log, text]).then((x) => x.rows[0] as { attempt_id: string; result: string })
  const logRead = async (doc: string, actor: string) => Number((await svc.query(`INSERT INTO public.creator_record_v2_evidence_access_log (document_id, actor_user_id, actor_role, purpose) VALUES ($1, $2, 'owner', 'examination') RETURNING id`, [doc, actor])).rows[0].id)
  const snapshot = async () => (await admin.query(`
    SELECT 'constraint' k, conrelid::regclass::text || '.' || conname n, pg_get_constraintdef(oid) d FROM pg_constraint WHERE connamespace = 'public'::regnamespace AND conrelid::regclass::text NOT LIKE '%live_evaluation%'
    UNION ALL SELECT 'function', p.oid::regprocedure::text, pg_get_functiondef(p.oid) FROM pg_proc p WHERE p.pronamespace = 'public'::regnamespace AND p.prokind = 'f' AND p.proname NOT LIKE '%live_evaluation%'
    UNION ALL SELECT 'column', table_name || '.' || column_name, data_type || is_nullable FROM information_schema.columns WHERE table_schema = 'public' AND table_name NOT LIKE '%live_evaluation%'
    UNION ALL SELECT 'trigger', t.tgrelid::regclass::text || '.' || t.tgname, pg_get_triggerdef(t.oid) FROM pg_trigger t WHERE NOT t.tgisinternal AND t.tgrelid::regclass::text NOT LIKE '%live_evaluation%'
    UNION ALL SELECT 'grant', grantee || '.' || table_name, string_agg(privilege_type, ',' ORDER BY privilege_type) FROM information_schema.role_table_grants WHERE table_schema = 'public' AND table_name NOT LIKE '%live_evaluation%' GROUP BY grantee, table_name
    ORDER BY 1, 2`)).rows

  beforeAll(async () => {
    assertDisposable(URL!)
    admin = new Client({ connectionString: URL })
    await admin.connect()
    await admin.query('DROP SCHEMA IF EXISTS public CASCADE')
    await admin.query('CREATE SCHEMA public')
    await admin.query(readFileSync(join(__dirname, 'bootstrap.sql'), 'utf8'))
    await admin.query('DROP SCHEMA IF EXISTS storage CASCADE')
    await admin.query('CREATE SCHEMA storage; CREATE TABLE storage.buckets (id text PRIMARY KEY, name text NOT NULL, public boolean, file_size_limit bigint, allowed_mime_types text[])')
    for (const m of CHAIN) await admin.query(readFileSync(m, 'utf8'))
    svc = await connect('service_role')
  })
  afterAll(async () => {
    for (const c of extra) await c.end().catch(() => undefined)
    await admin?.end().catch(() => undefined)
  })

  test('applies after 20261108000000 and changes nothing that exists', async () => {
    const before = await snapshot()
    await admin.query(EVALUATION_SQL)
    expect(await snapshot()).toEqual(before)
  })

  test('without the evaluation marker, every entry function refuses', async () => {
    // The 1104 marker is needed for the examination read log; it alone does not open the evaluation store.
    await admin.query(`INSERT INTO public.creator_record_v2_examination_environment (environment_kind, supabase_project_ref, established_by, reason) VALUES ('isolated_synthetic_test', $1, 'db test operator', 'isolated local PostgreSQL 15 test')`, [PROJECT])
    const { operator, doc, evaluation } = await fresh()
    expect(await fail(preflight(evaluation, operator, doc.id))).toBe('live_evaluation_environment_not_established')
    expect(await fail(reserve(evaluation, operator, doc.id))).toBe('live_evaluation_environment_not_established')
    expect(await fail(settle(randomUUID(), 0))).toBe('live_evaluation_environment_not_established')
    expect(await fail(record(randomUUID(), 1, '{}'))).toBe('live_evaluation_environment_not_established')
    expect(await fail(admin.query(`INSERT INTO public.creator_record_v2_live_evaluation_environment (supabase_project_ref, established_by, reason) VALUES ('lehqgcgnenwdmuzudbrs', 'x', 'y')`))).toMatch(/check constraint/)
    await admin.query(`INSERT INTO public.creator_record_v2_live_evaluation_environment (supabase_project_ref, established_by, reason) VALUES ($1, 'db test operator', 'isolated local PostgreSQL 15 evaluation test')`, [PROJECT])
    expect(await fail(admin.query(`UPDATE public.creator_record_v2_live_evaluation_environment SET reason = 'changed'`))).toMatch(/append-only/)
  })

  test('the service role reads and calls the entry functions; it writes no authority, spend or result directly', async () => {
    const { operator, doc, evaluation } = await fresh()
    expect(Number((await svc.query('SELECT count(*) n FROM public.creator_record_v2_live_evaluation_authorizations')).rows[0].n)).toBeGreaterThan(0)
    const denied = /permission denied/
    expect(await fail(svc.query(`INSERT INTO public.creator_record_v2_live_evaluation_authorizations (evaluation_id, operator_user_id, environment_ref, provider, model, profile_id, profile_version, max_attempts, max_spend_micro_usd, attempt_reserve_micro_usd, approved_by, approval_reference, expires_at) VALUES ('eval-selfmade', $1, $2, 'anthropic', $3, 'receipt', 1, 30, 10000000, 1, 'me', 'approval-ref-0001', now() + interval '1 day')`, [operator, PROJECT, MODEL]))).toMatch(denied)
    expect(await fail(svc.query(`INSERT INTO public.creator_record_v2_live_evaluation_documents (evaluation_id, document_id, document_sha256, authority_reference) VALUES ($1, $2, $3, 'consent-ref-0001')`, [evaluation, doc.id, sha(doc.bytes)]))).toMatch(denied)
    expect(await fail(svc.query(`UPDATE public.creator_record_v2_live_evaluation_authorizations SET max_spend_micro_usd = 10000000`))).toMatch(denied)
    expect(await fail(svc.query(`INSERT INTO public.creator_record_v2_live_evaluation_reservations (evaluation_id, document_id, operator_user_id, sequence, reserved_micro_usd) VALUES ($1, $2, $3, 1, 1)`, [evaluation, doc.id, operator]))).toMatch(denied)
    expect(await fail(svc.query(`DELETE FROM public.creator_record_v2_live_evaluation_reservations`))).toMatch(denied)
    expect(await fail(svc.query(`DELETE FROM public.creator_record_v2_live_evaluation_environment`))).toMatch(denied)
    expect(await fail(svc.query(`SELECT public.creator_record_v2_live_evaluation_authority($1, $2, $3)`, [evaluation, operator, doc.id]))).toMatch(denied)
    for (const role of ['anon', 'authenticated']) {
      const c = await connect(role)
      expect(await fail(preflight(evaluation, operator, doc.id, c))).toMatch(denied)
      expect(await fail(c.query('SELECT 1 FROM public.creator_record_v2_live_evaluation_authorizations'))).toMatch(denied)
    }
  })

  test('an authorization is created at server time, lasts at most seven days, and can only be revoked, once', async () => {
    const operator = await user()
    const backdated = await admin.query(`INSERT INTO public.creator_record_v2_live_evaluation_authorizations (evaluation_id, operator_user_id, environment_ref, provider, model, profile_id, profile_version, max_attempts, max_spend_micro_usd, attempt_reserve_micro_usd, approved_by, approval_reference, created_at, expires_at) VALUES ('eval-backdated', $1, $2, 'anthropic', $3, 'receipt', 1, 1, 1000000, $4, 'x', 'approval-ref-0001', now() - interval '30 days', now() + interval '1 day') RETURNING created_at > now() - interval '1 minute' AS fresh`, [operator, PROJECT, MODEL, RESERVE])
    expect(backdated.rows[0].fresh).toBe(true)
    const base = [operator, PROJECT, RESERVE]
    const ins = (id: string, cols: string, vals: string) => admin.query(`INSERT INTO public.creator_record_v2_live_evaluation_authorizations (evaluation_id, operator_user_id, environment_ref, provider, profile_id, profile_version, max_attempts, attempt_reserve_micro_usd, approved_by, approval_reference, ${cols}) VALUES ('${id}', $1, $2, 'anthropic', 'receipt', 1, 1, $3, 'x', 'approval-ref-0001', ${vals})`, base)
    expect(await fail(ins('eval-too-long', 'model, max_spend_micro_usd, expires_at', `'${MODEL}', 1000000, now() + interval '8 days'`))).toMatch(/check constraint/)
    expect(await fail(ins('eval-over-cap', 'model, max_spend_micro_usd, expires_at', `'${MODEL}', 10000001, now() + interval '1 day'`))).toMatch(/check constraint/)
    expect(await fail(ins('eval-mockmodel', 'model, max_spend_micro_usd, expires_at', `'mock-model-test-only', 1000000, now() + interval '1 day'`))).toMatch(/check constraint/)
    expect(await fail(admin.query(`INSERT INTO public.creator_record_v2_live_evaluation_authorizations (evaluation_id, operator_user_id, environment_ref, provider, model, profile_id, profile_version, max_attempts, max_spend_micro_usd, attempt_reserve_micro_usd, approved_by, approval_reference, expires_at) VALUES ('eval-production', $1, 'lehqgcgnenwdmuzudbrs', 'anthropic', $2, 'receipt', 1, 1, 1000000, $3, 'x', 'approval-ref-0001', now() + interval '1 day')`, [operator, MODEL, RESERVE]))).toMatch(/check constraint/)
    expect(await fail(admin.query(`UPDATE public.creator_record_v2_live_evaluation_authorizations SET max_spend_micro_usd = 2000000 WHERE evaluation_id = 'eval-backdated'`))).toBe('the only change to an authorization is revoking it, once')
    expect(await fail(admin.query(`UPDATE public.creator_record_v2_live_evaluation_authorizations SET expires_at = now() + interval '6 days' WHERE evaluation_id = 'eval-backdated'`))).toBe('the only change to an authorization is revoking it, once')
    await admin.query(`UPDATE public.creator_record_v2_live_evaluation_authorizations SET revoked_at = now(), revocation_reason = 'test' WHERE evaluation_id = 'eval-backdated'`)
    expect(await fail(admin.query(`UPDATE public.creator_record_v2_live_evaluation_authorizations SET revoked_at = now(), revocation_reason = 'again' WHERE evaluation_id = 'eval-backdated'`))).toBe('the only change to an authorization is revoking it, once')
    expect(await fail(admin.query(`DELETE FROM public.creator_record_v2_live_evaluation_authorizations WHERE evaluation_id = 'eval-backdated'`))).toBe('an authorization is never deleted; revoke it')
  })

  test('a permitted document is the operator’s own stored document, by its exact digest, not a fixture, at most ten', async () => {
    const operator = await user()
    const other = await user()
    const evaluation = await authorize(operator, [])
    const add = (doc: string, digest: string) => admin.query(`INSERT INTO public.creator_record_v2_live_evaluation_documents (evaluation_id, document_id, document_sha256, authority_reference) VALUES ($1, $2, $3, 'consent-ref-0001')`, [evaluation, doc, digest])
    const refusal = 'a permitted document is the operator\'s own stored document, by its exact SHA-256, and not a synthetic fixture'
    const theirs = await upload(other)
    expect(await fail(add(theirs.id, sha(theirs.bytes)))).toBe(refusal)
    const mine = await upload(operator)
    expect(await fail(add(mine.id, 'f'.repeat(64)))).toBe(refusal)
    const fixture = await upload(operator, new Uint8Array(F.bytes!), F.sha256)
    expect(await fail(add(fixture.id, F.sha256))).toBe(refusal)
    for (let i = 0; i < 10; i++) { const d = await upload(operator); await add(d.id, sha(d.bytes)) }
    expect(await fail(add(mine.id, sha(mine.bytes)))).toBe('an evaluation names at most 10 documents')
    expect(await fail(admin.query(`DELETE FROM public.creator_record_v2_live_evaluation_documents WHERE evaluation_id = $1`, [evaluation]))).toMatch(/append-only/)
  })

  test('the preflight checks operator, environment, revocation, expiry and the document', async () => {
    const { operator, doc, evaluation } = await fresh()
    const ok = await preflight(evaluation, operator, doc.id)
    expect(ok).toMatchObject({ evaluation_id: evaluation, operator_user_id: operator, environment_ref: PROJECT, provider: 'anthropic', model: MODEL, profile_id: 'receipt', profile_version: 1, document_id: doc.id, document_sha256: sha(doc.bytes), authority_reference: 'consent-ref-0001', reservations_used: 0 })
    expect(await fail(preflight('eval-missing0', operator, doc.id))).toBe('live_evaluation_authorization_not_found')
    expect(await fail(preflight(evaluation, await user(), doc.id))).toBe('live_evaluation_operator_mismatch')
    expect(await fail(preflight(evaluation, operator, randomUUID()))).toBe('live_evaluation_document_not_authorized')
    const elsewhere = await fresh({ env: 'otherprojectref00001' })
    expect(await fail(preflight(elsewhere.evaluation, elsewhere.operator, elsewhere.doc.id))).toBe('live_evaluation_environment_mismatch')
    const soon = await fresh({ expires: '1 second' })
    await admin.query('SELECT pg_sleep(1.2)')
    expect(await fail(preflight(soon.evaluation, soon.operator, soon.doc.id))).toBe('live_evaluation_authorization_expired')
    const revoked = await fresh()
    await admin.query(`UPDATE public.creator_record_v2_live_evaluation_authorizations SET revoked_at = now(), revocation_reason = 'test' WHERE evaluation_id = $1`, [revoked.evaluation])
    expect(await fail(preflight(revoked.evaluation, revoked.operator, revoked.doc.id))).toBe('live_evaluation_authorization_revoked')
    const deleted = await fresh()
    await svc.query(`UPDATE public.creator_record_v2_documents SET state = 'deleted', deleted_at = now() WHERE id = $1`, [deleted.doc.id])
    expect(await fail(preflight(deleted.evaluation, deleted.operator, deleted.doc.id))).toBe('live_evaluation_document_mismatch')
  })

  test('concurrent reservations cannot together exceed the spending ceiling', async () => {
    const { operator, doc, evaluation } = await fresh({ maxSpend: RESERVE * 2 + RESERVE / 2 })
    const clients = await Promise.all(Array.from({ length: 6 }, () => connect('service_role')))
    const results = await Promise.all(clients.map((c) => reserve(evaluation, operator, doc.id, c).then(() => 'reserved', (e: Error) => e.message)))
    expect(results.filter((r) => r === 'reserved')).toHaveLength(2)
    expect(results.filter((r) => r !== 'reserved')).toEqual(Array(4).fill('live_evaluation_budget_exhausted'))
    const spent = await preflight(evaluation, operator, doc.id)
    expect([Number(spent.spent_micro_usd), spent.reservations_used]).toEqual([RESERVE * 2, 2])
  })

  test('attempts are capped per evaluation and per document, and nothing resets them', async () => {
    const one = await fresh({ maxAttempts: 1 })
    await reserve(one.evaluation, one.operator, one.doc.id)
    expect(await fail(reserve(one.evaluation, one.operator, one.doc.id))).toBe('live_evaluation_attempts_exhausted')
    const three = await fresh()
    for (let i = 0; i < 3; i++) await reserve(three.evaluation, three.operator, three.doc.id)
    expect(await fail(reserve(three.evaluation, three.operator, three.doc.id))).toBe('live_evaluation_attempts_exhausted')
    // A fresh connection is a restarted process: the ledger is the same.
    const restarted = await connect('service_role')
    expect(await fail(reserve(three.evaluation, three.operator, three.doc.id, restarted))).toBe('live_evaluation_attempts_exhausted')
    expect(await fail(admin.query(`DELETE FROM public.creator_record_v2_live_evaluation_reservations WHERE evaluation_id = $1`, [three.evaluation]))).toBe('a reservation is only ever settled, once')
  })

  test('settling only adds cost, and only once', async () => {
    const { operator, doc, evaluation } = await fresh()
    const a = await reserve(evaluation, operator, doc.id)
    expect(await settle(a.reservation_id, 10)).toBe(RESERVE)
    expect(await fail(settle(a.reservation_id, 10))).toBe('live_evaluation_reservation_settled')
    const b = await reserve(evaluation, operator, doc.id)
    expect(await settle(b.reservation_id, RESERVE * 3)).toBe(RESERVE * 3)
    const c = await reserve(evaluation, operator, doc.id)
    expect(await fail(svc.query('SELECT public.creator_record_v2_live_evaluation_settle($1, 3, 0, 0, true, 0)', [c.reservation_id]))).toBe('live_evaluation_settlement_invalid')
    expect(await fail(settle(randomUUID(), 0))).toBe('live_evaluation_reservation_not_found')
    expect(await fail(admin.query(`UPDATE public.creator_record_v2_live_evaluation_reservations SET charged_micro_usd = 1, reserved_micro_usd = 1 WHERE id = $1`, [a.reservation_id]))).toBe('a reservation is only ever settled, once')
    expect(Number((await preflight(evaluation, operator, doc.id)).spent_micro_usd)).toBe(RESERVE + RESERVE * 3 + RESERVE)
  })

  test('a live result is stored only against its own reservation and its own read, once, and never as a mock', async () => {
    const { operator, doc, evaluation } = await fresh()
    const log = await logRead(doc.id, operator)
    const res = await reserve(evaluation, operator, doc.id)
    const env = await liveEnvelope(doc.id, operator, doc.bytes)
    const text = canonicalJson(env)

    // Refused shapes first, against the same reservation and read.
    const mock = canonicalJson({ ...env, execution_origin: 'mock_test' })
    expect(await fail(record(res.reservation_id, log, mock))).toBe('live_evaluation_envelope_invalid')
    expect(await fail(record(res.reservation_id, log, canonicalJson(await liveEnvelope(doc.id, operator, doc.bytes, undefined, { ...LIVE, model: 'claude-another-model' }))))).toBe('live_evaluation_envelope_invalid')
    expect(await fail(record(res.reservation_id, log, canonicalJson({ ...env, limitations: [...env.limitations, 'mock_test_data_not_model_output'] })))).toBe('live_evaluation_envelope_invalid')
    expect(await fail(record(res.reservation_id, log, canonicalJson({ ...env, provenance: { ...env.provenance, provider_response_id: 'mock-response-1' } })))).toBe('live_evaluation_envelope_invalid')
    expect(await fail(record(res.reservation_id, log, canonicalJson({ ...env, observations: env.observations.map((o) => ({ ...o, origin: 'mock_test_double' })) })))).toBe('live_evaluation_envelope_invalid')
    // A key that is internally consistent (observation ids follow it) but is not the key of these fields.
    const forged = 'a'.repeat(64)
    expect(await fail(record(res.reservation_id, log, canonicalJson({ ...env, examination_key: forged, observations: env.observations.map((o) => ({ ...o, observation_id: forged.slice(0, 16) + o.observation_id.slice(16) })) })))).toBe('live_evaluation_key_mismatch')
    const otherDoc = await upload(operator)
    expect(await fail(record(res.reservation_id, await logRead(otherDoc.id, operator), text))).toBe('live_evaluation_access_not_logged')

    const stored = await record(res.reservation_id, log, text)
    expect(stored.result).toBe('created')
    const row = (await svc.query('SELECT * FROM public.creator_record_v2_live_evaluation_attempts WHERE id = $1', [stored.attempt_id])).rows[0]
    expect(row).toMatchObject({ evaluation_id: evaluation, reservation_id: res.reservation_id, execution_origin: 'live_model', executor_mode: 'live_model', provider: 'anthropic', model: MODEL, outcome_status: 'examined', envelope_canonical: text })

    // The same reservation, or the same read, cannot store again; a reading ends further reservations for the document.
    expect(await fail(record(res.reservation_id, await logRead(doc.id, operator), text))).toBe('live_evaluation_reservation_settled')
    expect(await fail(reserve(evaluation, operator, doc.id))).toBe('live_evaluation_reading_exists')
    expect(await fail(admin.query('UPDATE public.creator_record_v2_live_evaluation_attempts SET model = model WHERE id = $1', [stored.attempt_id]))).toMatch(/append-only/)
    expect(await settle(res.reservation_id, 4000)).toBe(RESERVE)
    // The 1A store is unchanged: it still refuses live output, whatever the evaluation store holds.
    expect(await fail(svc.query('SELECT * FROM public.creator_record_v2_record_live_examination($1, $2)', [await logRead(doc.id, operator), text]))).toBe('live_examination_not_authorized')
  })

  test('a settled, revoked or stale reservation stores nothing; failures are kept and are never a reading', async () => {
    const a = await fresh()
    const log = await logRead(a.doc.id, a.operator)
    const settled = await reserve(a.evaluation, a.operator, a.doc.id)
    await settle(settled.reservation_id, 0)
    expect(await fail(record(settled.reservation_id, log, canonicalJson(await liveEnvelope(a.doc.id, a.operator, a.doc.bytes))))).toBe('live_evaluation_reservation_settled')

    const b = await fresh()
    const logB = await logRead(b.doc.id, b.operator)
    const resB = await reserve(b.evaluation, b.operator, b.doc.id)
    await admin.query(`UPDATE public.creator_record_v2_live_evaluation_authorizations SET revoked_at = now(), revocation_reason = 'test' WHERE evaluation_id = $1`, [b.evaluation])
    expect(await fail(record(resB.reservation_id, logB, canonicalJson(await liveEnvelope(b.doc.id, b.operator, b.doc.bytes))))).toBe('live_evaluation_authorization_revoked')

    const c = await fresh()
    const failed = canonicalJson(await liveEnvelope(c.doc.id, c.operator, c.doc.bytes, ['timeout']))
    const r1 = await reserve(c.evaluation, c.operator, c.doc.id)
    expect((await record(r1.reservation_id, await logRead(c.doc.id, c.operator), failed)).result).toBe('created')
    const r2 = await reserve(c.evaluation, c.operator, c.doc.id)
    expect((await record(r2.reservation_id, await logRead(c.doc.id, c.operator), canonicalJson(await liveEnvelope(c.doc.id, c.operator, c.doc.bytes)))).result).toBe('created')
    const rows = (await svc.query('SELECT outcome_status, attempt_number FROM public.creator_record_v2_live_evaluation_attempts WHERE evaluation_id = $1 ORDER BY attempt_number', [c.evaluation])).rows
    expect(rows).toEqual([{ outcome_status: 'could_not_examine', attempt_number: 1 }, { outcome_status: 'examined', attempt_number: 2 }])
  })
})
