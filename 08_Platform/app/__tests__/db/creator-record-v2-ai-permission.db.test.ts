/**
 * CR-V2-MVP-LAUNCH-FOUNDATION-1 — Decision 8Q on real PostgreSQL, every migration through 20261112000000 applied verbatim.
 *
 * AI-examination permission is separate from storage permission, recorded per document before any model reads it, enforced by the
 * database at the live read, the reservation and the attempt, never re-grantable after a withdrawal, never shared across documents
 * or creators, and serialized against withdrawal. Replay examination and file downloads are not AI examination and need no grant.
 *
 * Disposable local `si8_test_*` database only. The live-examination code locks are lifted for this file only (module mock); the
 * model is a fake behind the executor's adapter seam (no provider, no spending).
 */
import { readFileSync } from 'fs'
import { join } from 'path'
import { createHash, randomUUID } from 'crypto'
import { Client } from 'pg'

jest.mock('@/lib/creator-record/live-examination/controls', () => ({
  ...jest.requireActual('@/lib/creator-record/live-examination/controls'),
  LIVE_EXAMINATION_PERMITTED_IN_THIS_BUILD: true,
  CUSTOMER_LIVE_EXAMINATION_PERMITTED_IN_THIS_BUILD: true,
}))

import { CUSTOMER_LIVE_DATABASE_REFUSALS, examineCustomerDocumentLive, type CustomerLivePorts } from '@/lib/creator-record/live-examination/customer'
import { LivePortError } from '@/lib/creator-record/live-examination/examine'
import type { LiveAnthropicAdapter } from '@/lib/creator-record/live-examination/real-executor'
import { AiPermissionRefusal, requestCustomerExamination, type CustomerExaminationDeps } from '@/lib/creator-record/customer-flow/examination'
import { AI_EXAMINATION_PERMISSION_DRAFT_VERSION } from '@/lib/creator-record/evidence-intake/contract'
import { REPLAY_FIXTURES } from '@/lib/creator-record/evidence/replay-fixtures.data'
import { syntheticTextPdf } from '@/test-support/synthetic-pdf'

const URL = process.env.DATABASE_URL_TEST
const DIR = join(__dirname, '..', '..', 'supabase', 'migrations')
const MIGRATIONS = [
  '20261021000000_payment_fulfillments.sql', '20261022000000_payment_zero_total_paid.sql', '20261028000000_creator_record_artifacts.sql',
  '20261101000000_creator_record_v2_prepared.sql', '20261102000000_creator_record_v2_submission_binding.sql', '20261103000000_creator_record_v2_evidence.sql',
  '20261104000000_creator_record_v2_examination_runs.sql', '20261105000000_creator_record_v2_operator_synthetic_uat.sql', '20261106000000_creator_record_v2_customer_path_uat.sql',
  '20261107000000_creator_record_v2_admin_uat.sql', '20261108000000_creator_record_v2_live_examination_foundation.sql', '20261110000000_creator_record_v2_customer_live_examination.sql',
  '20261111000000_creator_record_v2_retention_m1a.sql', '20261112000000_creator_record_v2_ai_examination_permission.sql',
].map((f) => join(DIR, f))
const CONSENT = 'DRAFT-UNAPPROVED-cr-v2-evidence-storage-consent-0'
const VERSION = AI_EXAMINATION_PERMISSION_DRAFT_VERSION
const ENV = { CREATOR_RECORD_EXTRACTION_API_KEY: 'test-key-not-real' }
const OUTPUT = REPLAY_FIXTURES.find((f) => f.fixture_id === 'pdf-pika-pro-no-period')!.parsed_output

function assertDisposable(url: string) {
  const u = new globalThis.URL(url)
  if (!u.pathname.replace(/^\//, '').startsWith('si8_test_')) throw new Error('refusing to run: not an si8_test_* database')
  if (!['localhost', '127.0.0.1', '::1', '[::1]'].includes(u.hostname)) throw new Error('refusing to run: host is not local')
}
if (process.env.CI && !URL) throw new Error('DATABASE_URL_TEST is required in CI')
const maybe = URL ? describe : describe.skip
const sha = (b: Uint8Array) => createHash('sha256').update(b).digest('hex')
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
const iso = (v: unknown) => (v instanceof Date ? v.toISOString() : (v as string | null))

maybe('Decision 8Q: AI-examination permission (PostgreSQL, through 20261112000000)', () => {
  let admin: Client
  let svc: Client
  let svc2: Client
  const bytesOf = new Map<string, Uint8Array>()

  beforeAll(async () => {
    assertDisposable(URL!)
    admin = new Client({ connectionString: URL })
    await admin.connect()
    await admin.query('DROP SCHEMA IF EXISTS public CASCADE')
    await admin.query('CREATE SCHEMA public')
    await admin.query(readFileSync(join(__dirname, 'bootstrap.sql'), 'utf8'))
    await admin.query('DROP SCHEMA IF EXISTS storage CASCADE')
    await admin.query('CREATE SCHEMA storage; CREATE TABLE storage.buckets (id text PRIMARY KEY, name text NOT NULL, public boolean, file_size_limit bigint, allowed_mime_types text[])')
    for (const m of MIGRATIONS) await admin.query(readFileSync(m, 'utf8'))
    await admin.query(`INSERT INTO public.creator_record_v2_customer_live_enablement (supabase_project_ref, max_attempts_per_creator_per_day, max_spend_micro_usd_per_creator, max_reserve_micro_usd_per_attempt, established_by, reason)
      VALUES ('localpg15launchfound', 24, 5000000, 1000000, 'db test operator', 'isolated local PostgreSQL test')`)
    svc = new Client({ connectionString: URL })
    await svc.connect()
    await svc.query('SET ROLE service_role')
    svc2 = new Client({ connectionString: URL })
    await svc2.connect()
    await svc2.query('SET ROLE service_role')
  }, 60_000)
  afterAll(async () => {
    await svc2?.end().catch(() => undefined)
    await svc?.end().catch(() => undefined)
    await admin?.end().catch(() => undefined)
  })

  // ── Fixtures and ports (production uses PostgREST with the same functions and the same service role) ──
  async function user() {
    const id = randomUUID()
    await admin.query('INSERT INTO public.users (id, email, name, is_admin) VALUES ($1, $2, $3, false)', [id, `${id}@example.test`, 'Tester'])
    return id
  }
  async function doc(owner: string) {
    const bytes = syntheticTextPdf(`Synthetic AI-permission document ${randomUUID()}`)
    const id = randomUUID()
    await svc.query(`INSERT INTO public.creator_record_v2_documents (id, user_id, sha256, media_type, byte_size, file_name, storage_path, consent_version, state) VALUES ($1, $2, $3, 'application/pdf', $4, 'receipt.pdf', $5, $6, 'pending')`,
      [id, owner, sha(bytes), bytes.length, `${owner}/${id}`, CONSENT])
    await svc.query(`UPDATE public.creator_record_v2_documents SET state = 'stored', stored_at = now() WHERE id = $1`, [id])
    bytesOf.set(id, bytes)
    return { id, sha256: sha(bytes) }
  }
  const grant = (c: Client, owner: string, documentId: string, version = VERSION) =>
    c.query('SELECT public.creator_record_v2_grant_ai_examination_permission($1, $2, $3) r', [owner, documentId, version]).then((r) => r.rows[0].r as string)
  const withdraw = (c: Client, owner: string) => c.query('SELECT * FROM public.creator_record_v2_withdraw_consent($1)', [owner])
  const refusalOf = (e: unknown) => CUSTOMER_LIVE_DATABASE_REFUSALS[(e as { message?: string }).message ?? ''] ?? null
  const livePorts: CustomerLivePorts = {
    async getDocument(id) {
      const r = await svc.query('SELECT id, user_id, sha256, media_type, byte_size, state FROM public.creator_record_v2_documents WHERE id = $1', [id])
      return r.rows[0] ? { ...r.rows[0], sha256: String(r.rows[0].sha256).trim() } : null
    },
    async logLiveRead(documentId, owner) {
      try { return Number((await svc.query(`INSERT INTO public.creator_record_v2_evidence_access_log (document_id, actor_user_id, actor_role, purpose) VALUES ($1, $2, 'owner', 'live_examination') RETURNING id`, [documentId, owner])).rows[0].id) }
      catch (e) { throw new LivePortError('log_read', refusalOf(e)) }
    },
    readObject: async (record) => bytesOf.get(record.id) ?? null,
    async listLiveAttempts(owner, documentId, profileId) {
      const r = await svc.query('SELECT * FROM public.creator_record_v2_live_examination_attempts WHERE user_id = $1 AND document_id = $2 AND profile_id = $3', [owner, documentId, profileId])
      return r.rows.map((x) => ({ ...x, examination_key: String(x.examination_key).trim(), document_sha256: String(x.document_sha256).trim(), envelope_sha256: String(x.envelope_sha256).trim(), access_log_id: Number(x.access_log_id), created_at: iso(x.created_at), executed_at: iso(x.executed_at) }))
    },
    async reserve(logId, profileId, tokens, micro) {
      try { return (await svc.query('SELECT public.creator_record_v2_reserve_customer_live_examination($1, $2, $3, $4) id', [logId, profileId, tokens, micro])).rows[0].id }
      catch (e) { throw new LivePortError('record', refusalOf(e)) }
    },
    async record(reservationId, text) {
      try { return (await svc.query('SELECT attempt_id, result FROM public.creator_record_v2_record_customer_live_examination($1, $2)', [reservationId, text])).rows[0] }
      catch (e) { throw new LivePortError('record', refusalOf(e)) }
    },
    settle: async (reservationId, charged) => Number((await svc.query('SELECT public.creator_record_v2_settle_customer_live_reservation($1, $2) n', [reservationId, charged])).rows[0].n),
  }
  const calls = { n: 0 }
  const adapter: LiveAnthropicAdapter = {
    createAnthropicReceiptCaller: (o) => async () => {
      calls.n += 1
      return { id: 'msg_live_8q', model: o.model, stop_reason: 'end_turn', content: [{ type: 'text', text: '' }], usage: { input_tokens: 3000, output_tokens: 400 }, parsed_output: OUTPUT } as never
    },
    classifyAnthropicFailure: () => 'server_error',
  }
  const examine = (owner: string, documentId: string) =>
    examineCustomerDocumentLive({ ports: livePorts, isKnownSyntheticFixture: () => false, now: () => new Date(), executorOptions: { env: ENV, loadAdapter: async () => adapter } }, owner, documentId)
  const attempts = async (documentId: string) => (await admin.query('SELECT count(*)::int n FROM public.creator_record_v2_live_examination_attempts WHERE document_id = $1', [documentId])).rows[0].n
  /** The customer examination service over these ports, as the route uses it (live path, real grant function). */
  const service = (): CustomerExaminationDeps => ({
    submissions: 'open', hasPilotAccess: async () => true, now: () => new Date(),
    adapter: { storage: { getDocument: async (id: string) => livePorts.getDocument(id) } } as unknown as CustomerExaminationDeps['adapter'],
    live: { examine: (u, d) => examine(u, d) },
    aiPermission: {
      version: VERSION,
      async grant(u, d, v) {
        try { return (await grant(svc, u, d, v)) as 'granted' | 'existing' }
        catch (e) {
          const m = (e as { message?: string }).message
          if (m === 'creator_record_v2_ai_permission_withdrawn') throw new AiPermissionRefusal('withdrawn')
          if (m === 'creator_record_v2_retention_not_found') throw new AiPermissionRefusal('not_found')
          if (m === 'creator_record_v2_ai_permission_invalid') throw new AiPermissionRefusal('invalid')
          throw e
        }
      },
    },
  })

  test('storing a document is not permission: without a grant no live read, reservation or attempt is possible, and no model is called', async () => {
    const owner = await user()
    const d = await doc(owner)
    const before = calls.n
    expect((await examine(owner, d.id)).result).toEqual({ kind: 'not_read', reason: 'ai_permission_required' })
    expect(calls.n).toBe(before)
    await expect(svc.query(`INSERT INTO public.creator_record_v2_evidence_access_log (document_id, actor_user_id, actor_role, purpose) VALUES ($1, $2, 'owner', 'live_examination')`, [d.id, owner])).rejects.toThrow('creator_record_v2_ai_permission_required')
    await expect(admin.query(`INSERT INTO public.creator_record_v2_customer_live_reservations (document_id) VALUES ($1)`, [d.id])).rejects.toThrow('creator_record_v2_ai_permission_required')
    await expect(admin.query(`INSERT INTO public.creator_record_v2_live_examination_attempts (document_id, execution_origin) VALUES ($1, 'live_model')`, [d.id])).rejects.toThrow('creator_record_v2_ai_permission_required')
    expect(await attempts(d.id)).toBe(0)
  })

  test('the service records the explicit, versioned grant first, then examines; idempotent per document and version', async () => {
    const owner = await user()
    const d = await doc(owner)
    expect(await requestCustomerExamination(service(), owner, d.id, {})).toEqual({ ok: false, status: 400, code: 'ai_permission_required' })
    expect(await requestCustomerExamination(service(), owner, d.id, { aiPermission: 'DRAFT-some-other-version' })).toEqual({ ok: false, status: 400, code: 'ai_permission_required' })
    expect((await admin.query('SELECT count(*)::int n FROM public.creator_record_v2_ai_examination_permissions WHERE document_id = $1', [d.id])).rows[0].n).toBe(0)

    const r = await requestCustomerExamination(service(), owner, d.id, { aiPermission: VERSION })
    expect(r).toMatchObject({ ok: true, result: 'created' })
    const rows = (await admin.query('SELECT user_id, permission_version, granted_at FROM public.creator_record_v2_ai_examination_permissions WHERE document_id = $1', [d.id])).rows
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ user_id: owner, permission_version: VERSION })
    expect(await attempts(d.id)).toBe(1)
    expect(await grant(svc, owner, d.id)).toBe('existing')
    // Append-only and auditable.
    await expect(admin.query('UPDATE public.creator_record_v2_ai_examination_permissions SET permission_version = $2 WHERE document_id = $1', [d.id, 'x-other'])).rejects.toThrow('append-only')
    await expect(admin.query('DELETE FROM public.creator_record_v2_ai_examination_permissions WHERE document_id = $1', [d.id])).rejects.toThrow('append-only')
  })

  test('no leakage: a grant covers one document of one creator only', async () => {
    const owner = await user()
    const other = await user()
    const a = await doc(owner)
    const b = await doc(owner)
    await grant(svc, owner, a.id)
    expect((await examine(owner, b.id)).result).toEqual({ kind: 'not_read', reason: 'ai_permission_required' })
    await expect(grant(svc, other, a.id)).rejects.toThrow('creator_record_v2_retention_not_found')
    expect(await requestCustomerExamination(service(), other, a.id, { aiPermission: VERSION })).toMatchObject({ ok: false, code: 'not_found' })
    await expect(grant(svc, owner, a.id, 'bad version!')).rejects.toThrow('creator_record_v2_ai_permission_invalid')
  })

  test('withdrawal: no further examination even with an earlier grant, and no re-grant for those documents; a later upload needs its own grant', async () => {
    const owner = await user()
    const granted = await doc(owner)
    const never = await doc(owner)
    await grant(svc, owner, granted.id)
    await withdraw(svc, owner)
    const before = calls.n
    expect((await examine(owner, granted.id)).result).toEqual({ kind: 'not_read', reason: 'consent_withdrawn' })
    expect(calls.n).toBe(before)
    for (const d of [granted, never]) await expect(grant(svc, owner, d.id)).rejects.toThrow('creator_record_v2_ai_permission_withdrawn')
    expect(await requestCustomerExamination(service(), owner, never.id, { aiPermission: VERSION })).toEqual({ ok: false, status: 409, code: 'examination_not_permitted' })
    expect(calls.n).toBe(before)

    await sleep(5)
    const later = await doc(owner)
    expect((await examine(owner, later.id)).result).toEqual({ kind: 'not_read', reason: 'ai_permission_required' })  // no automatic grant
    expect(await requestCustomerExamination(service(), owner, later.id, { aiPermission: VERSION })).toMatchObject({ ok: true })
  })

  test('concurrency: a grant waiting on a withdrawal that commits is refused; a grant that commits first is then overridden', async () => {
    const owner = await user()
    const d = await doc(owner)
    const w = new Client({ connectionString: URL })
    await w.connect()
    await w.query('SET ROLE service_role')
    try {
      await w.query('BEGIN')
      await w.query('SELECT * FROM public.creator_record_v2_withdraw_consent($1)', [owner])
      const pending = grant(svc2, owner, d.id).then(() => 'granted', (e: Error) => e.message)
      await sleep(300)
      await w.query('COMMIT')
      expect(await pending).toBe('creator_record_v2_ai_permission_withdrawn')
    } finally { await w.end() }

    const owner2 = await user()
    const d2 = await doc(owner2)
    const g = new Client({ connectionString: URL })
    await g.connect()
    await g.query('SET ROLE service_role')
    try {
      await g.query('BEGIN')
      await g.query('SELECT public.creator_record_v2_grant_ai_examination_permission($1, $2, $3)', [owner2, d2.id, VERSION])
      const withdrawal = withdraw(svc2, owner2).then(() => 'withdrawn')
      await sleep(300)
      await g.query('COMMIT')
      expect(await withdrawal).toBe('withdrawn')
    } finally { await g.end() }
    expect((await admin.query('SELECT count(*)::int n FROM public.creator_record_v2_ai_examination_permissions WHERE document_id = $1', [d2.id])).rows[0].n).toBe(1)
    expect((await examine(owner2, d2.id)).result).toEqual({ kind: 'not_read', reason: 'consent_withdrawn' })
  })

  test('replay examination and file downloads are not AI examination: no grant needed', async () => {
    const owner = await user()
    const d = await doc(owner)
    await svc.query(`INSERT INTO public.creator_record_v2_evidence_access_log (document_id, actor_user_id, actor_role, purpose) VALUES ($1, $2, 'owner', 'file_download')`, [d.id, owner])
    await admin.query(`INSERT INTO public.creator_record_v2_examination_environment (environment_kind, supabase_project_ref, established_by, reason) VALUES ('isolated_synthetic_test', 'localpg15launchfound', 'db test', 'replay read check')`)
    try {
      await svc.query(`INSERT INTO public.creator_record_v2_evidence_access_log (document_id, actor_user_id, actor_role, purpose) VALUES ($1, $2, 'owner', 'examination')`, [d.id, owner])
    } finally {
      await admin.query('DELETE FROM public.creator_record_v2_examination_environment')
    }
  })

  test('read-only state for the dashboard; privileges', async () => {
    const owner = await user()
    const d = await doc(owner)
    const prepared = randomUUID()
    const canonical = JSON.stringify({ documents: { items: [{ document_id: d.id, sha256: d.sha256 }] } })
    await svc.query(`INSERT INTO public.creator_record_v2_prepared (id, user_id, draft_id, version, record_ref, record_schema, record_schema_version, canonical, sha256, form_state, status)
      VALUES ($1, $2, $3, 1, $4, 'si8/creator-record-v2-record', 8, $5, $6, '{}'::jsonb, 'prepared')`, [prepared, owner, randomUUID(), `PREP-${prepared}`, canonical, sha(new TextEncoder().encode(canonical))])
    const state = async () => (await svc.query('SELECT * FROM public.creator_record_v2_consent_state($1)', [owner])).rows[0]
    const paused = async () => (await svc.query('SELECT public.creator_record_v2_prepared_consent_paused($1) p', [prepared])).rows[0].p
    expect(await state()).toEqual({ withdrawn: false, withdrawn_at: null })
    expect(await paused()).toBe(false)
    await withdraw(svc, owner)
    const s = await state()
    expect(s.withdrawn).toBe(true)
    expect(s.withdrawn_at).toBeInstanceOf(Date)
    expect(await paused()).toBe(true)

    await expect(svc.query(`INSERT INTO public.creator_record_v2_ai_examination_permissions (user_id, document_id, permission_version) VALUES ($1, $2, 'x-direct')`, [owner, d.id])).rejects.toThrow(/permission denied/)
    await expect(svc.query('SELECT public.creator_record_v2_ai_permission_guard()')).rejects.toThrow(/permission denied|trigger/)
    for (const role of ['anon', 'authenticated']) {
      const c = new Client({ connectionString: URL })
      await c.connect()
      await c.query(`SET ROLE ${role}`)
      try {
        await expect(c.query('SELECT public.creator_record_v2_grant_ai_examination_permission($1, $2, $3)', [owner, d.id, VERSION])).rejects.toThrow(/permission denied/)
        await expect(c.query('SELECT * FROM public.creator_record_v2_consent_state($1)', [owner])).rejects.toThrow(/permission denied/)
      } finally { await c.end() }
    }
  })

  test('migration ordering: 20261112000000 refuses to apply without 20261111000000', async () => {
    const c = new Client({ connectionString: URL })
    await c.connect()
    try {
      await c.query('BEGIN')
      await c.query('DROP TABLE public.creator_record_v2_consent_withdrawals CASCADE')
      await expect(c.query(readFileSync(MIGRATIONS[MIGRATIONS.length - 1], 'utf8'))).rejects.toThrow('20261112000000 requires 20261111000000')
    } finally {
      await c.query('ROLLBACK').catch(() => undefined)
      await c.end()
    }
  })
})
