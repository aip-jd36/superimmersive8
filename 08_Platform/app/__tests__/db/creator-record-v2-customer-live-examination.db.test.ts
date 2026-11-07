/**
 * CR-V2-MVP-M2A — the customer live examination end to end, on real PostgreSQL (20261110000000): questionnaire → upload → examination
 * → bounded observations → schema 8 record → PDF model, with the real customer entry point, the real executor and the real database
 * functions. The model is a fake behind the executor's adapter seam: no network, no provider, no key. The documents are synthetic and
 * not committed fixtures. Both code locks are lifted for this file only (module mock). Disposable local `si8_test_*` database only.
 */
import { readFileSync } from 'fs'
import { join } from 'path'
import { createHash, randomUUID } from 'crypto'
import { Client } from 'pg'
import { syntheticUatInputs } from '@/lib/creator-record/customer-flow/synthetic-uat'
import { examinationProjectionFor, requestCustomerExamination, type CustomerExaminationDeps } from '@/lib/creator-record/customer-flow/examination'
import { buildCustomerDocument, CustomerPdfRefusal, documentText, type Block } from '@/lib/creator-record/customer-pdf/document-model'
import { templateFingerprint } from '@/lib/creator-record/customer-pdf/templates'
import { buildCustomerRecord, verifyCustomerRecord, CUSTOMER_RECORD_EXAMINATION_SCHEMA_VERSION } from '@/lib/creator-record/customer-record/record'
import { LIVE_EXTRACTION_MODEL } from '@/lib/creator-record/evidence/live-caller'
import { REPLAY_FIXTURES } from '@/lib/creator-record/evidence/replay-fixtures.data'
import { CREATOR_RECORD_SYNTHETIC_TEST_AUTHORITY, SYNTHETIC_TEST_EXAMINATION_PDF as EXAM_PDF } from '@/lib/creator-record/governed/synthetic-test-authority'
import { approvedPdfTemplates } from '@/lib/creator-record/customer-flow/approved-inputs'
import { CUSTOMER_LIVE_DATABASE_REFUSALS, examineCustomerDocumentLive, type CustomerLivePorts } from '@/lib/creator-record/live-examination/customer'
import { LivePortError } from '@/lib/creator-record/live-examination/examine'
import type { LiveAnthropicAdapter } from '@/lib/creator-record/live-examination/real-executor'
import type { CustomerLiveAttemptRow } from '@/lib/creator-record/live-examination/projection'
import { TOPIC_CLAIMS_FIXTURE as CLAIMS } from '@/lib/retrieval-engine/topic-claims-fixture'
import { syntheticTextPdf } from '@/test-support/synthetic-pdf'

jest.mock('@/lib/creator-record/live-examination/controls', () => ({
  ...jest.requireActual('@/lib/creator-record/live-examination/controls'),
  LIVE_EXAMINATION_PERMITTED_IN_THIS_BUILD: true,
  CUSTOMER_LIVE_EXAMINATION_PERMITTED_IN_THIS_BUILD: true,
}))

const URL = process.env.DATABASE_URL_TEST
const DIR = join(__dirname, '..', '..', 'supabase', 'migrations')
const MIGRATIONS = [
  '20261021000000_payment_fulfillments.sql', '20261022000000_payment_zero_total_paid.sql', '20261028000000_creator_record_artifacts.sql',
  '20261101000000_creator_record_v2_prepared.sql', '20261102000000_creator_record_v2_submission_binding.sql', '20261103000000_creator_record_v2_evidence.sql',
  '20261104000000_creator_record_v2_examination_runs.sql', '20261105000000_creator_record_v2_operator_synthetic_uat.sql', '20261106000000_creator_record_v2_customer_path_uat.sql',
  '20261107000000_creator_record_v2_admin_uat.sql', '20261108000000_creator_record_v2_live_examination_foundation.sql', '20261110000000_creator_record_v2_customer_live_examination.sql',
].map((f) => join(DIR, f))
const CONSENT = 'DRAFT-UNAPPROVED-cr-v2-evidence-storage-consent-0'
const ENV = { CREATOR_RECORD_EXTRACTION_API_KEY: 'test-key-not-real' }
const OUTPUT = REPLAY_FIXTURES.find((f) => f.fixture_id === 'pdf-pika-pro-no-period')!.parsed_output
const ATTEMPT_COLUMNS = 'id, attempt_number, examination_key, document_id, user_id, document_sha256, envelope_version, execution_origin, content_class, profile_id, profile_version, schema_version, prompt_version, executor_mode, provider, model, outcome_status, outcome_reason, executed_at, envelope_canonical, envelope_sha256, access_log_id, created_at, reservation_id'

function assertDisposable(url: string) {
  const u = new globalThis.URL(url)
  if (!u.pathname.replace(/^\//, '').startsWith('si8_test_')) throw new Error('refusing to run: not an si8_test_* database')
  if (!['localhost', '127.0.0.1', '::1', '[::1]'].includes(u.hostname)) throw new Error('refusing to run: host is not local')
}
if (process.env.CI && !URL) throw new Error('DATABASE_URL_TEST is required in CI')
const maybe = URL ? describe : describe.skip
const sha = (b: Uint8Array) => createHash('sha256').update(b).digest('hex')
const fail = async (p: Promise<unknown>): Promise<string> => { try { await p; return 'no error' } catch (e) { return (e as Error).message } }

/** A fake model behind the adapter seam. Each step answers one request: a response, or a thrown provider error. */
type Step = 'ok' | 'throw'
function fakeAdapter(steps: Step[] = ['ok'], delayMs = 0) {
  const calls: unknown[] = []
  let n = 0
  const adapter: LiveAnthropicAdapter = {
    createAnthropicReceiptCaller: (o) => async (req) => {
      calls.push(req)
      if (delayMs) await new Promise((r) => setTimeout(r, delayMs))
      const step = steps[Math.min(n++, steps.length - 1)]
      if (step === 'throw') throw new Error('provider down (test)')
      return { id: `msg_test_${n}`.replace('test', 'live'), model: o.model, stop_reason: 'end_turn', content: [{ type: 'text', text: '' }], usage: { input_tokens: 3000, output_tokens: 400 }, parsed_output: OUTPUT } as never
    },
    classifyAnthropicFailure: () => 'server_error',
  }
  return { adapter, calls }
}

maybe('customer live examination (PostgreSQL, 20261110000000)', () => {
  let admin: Client
  let svc: Client
  const bytesOf = new Map<string, Uint8Array>()
  const fixtures = new Set<string>()

  const user = async () => {
    const id = randomUUID()
    await admin.query('INSERT INTO public.users (id, email, name, is_admin) VALUES ($1, $2, $3, false)', [id, `${id}@example.test`, 'Creator'])
    return id
  }
  /** The creator's own upload, stored as the intake path stores it. */
  const upload = async (owner: string, bytes: Uint8Array = syntheticTextPdf(`Synthetic receipt ${randomUUID()}`), media = 'application/pdf') => {
    const id = randomUUID()
    await svc.query(`INSERT INTO public.creator_record_v2_documents (id, user_id, sha256, media_type, byte_size, file_name, storage_path, consent_version, state) VALUES ($1, $2, $3, $4, $5, 'receipt.pdf', $6, $7, 'pending')`, [id, owner, sha(bytes), media, bytes.length, `${owner}/${id}`, CONSENT])
    await svc.query(`UPDATE public.creator_record_v2_documents SET state = 'stored', stored_at = now() WHERE id = $1`, [id])
    bytesOf.set(id, bytes)
    return { id, bytes }
  }
  const enable = (o: { day?: number; spend?: number; reserve?: number } = {}) => admin.query(
    `INSERT INTO public.creator_record_v2_customer_live_enablement (supabase_project_ref, max_attempts_per_creator_per_day, max_spend_micro_usd_per_creator, max_reserve_micro_usd_per_attempt, established_by, reason)
     VALUES ('localpg15liveexamine', $1, $2, $3, 'db test operator', 'isolated local PostgreSQL test')`, [o.day ?? 24, o.spend ?? 5_000_000, o.reserve ?? 1_000_000])
  const disable = () => admin.query('DELETE FROM public.creator_record_v2_customer_live_enablement')
  const refusalOf = (e: unknown) => { const m = (e as { message?: string }).message ?? ''; return CUSTOMER_LIVE_DATABASE_REFUSALS[m] ?? null }

  /** The customer ports over pg (production uses PostgREST with the same functions and the same service role). */
  const ports: CustomerLivePorts = {
    async getDocument(id) {
      const r = await svc.query('SELECT id, user_id, sha256, media_type, byte_size, state FROM public.creator_record_v2_documents WHERE id = $1', [id])
      return r.rows[0] ? { ...r.rows[0], sha256: String(r.rows[0].sha256).trim() } : null
    },
    async logLiveRead(documentId, owner) {
      try {
        return Number((await svc.query(`INSERT INTO public.creator_record_v2_evidence_access_log (document_id, actor_user_id, actor_role, purpose) VALUES ($1, $2, 'owner', 'live_examination') RETURNING id`, [documentId, owner])).rows[0].id)
      } catch (e) { throw new LivePortError('log_read', refusalOf(e)) }
    },
    readObject: async (record) => bytesOf.get(record.id) ?? null,
    async listLiveAttempts(owner, documentId, profileId) {
      const r = await svc.query(`SELECT ${ATTEMPT_COLUMNS} FROM public.creator_record_v2_live_examination_attempts WHERE user_id = $1 AND document_id = $2 AND profile_id = $3`, [owner, documentId, profileId])
      return r.rows.map((x) => ({ ...x, examination_key: String(x.examination_key).trim(), document_sha256: String(x.document_sha256).trim(), envelope_sha256: String(x.envelope_sha256).trim(), access_log_id: Number(x.access_log_id), created_at: new Date(x.created_at).toISOString() }))
    },
    async reserve(logId, profileId, tokens, micro) {
      try { return (await svc.query('SELECT public.creator_record_v2_reserve_customer_live_examination($1, $2, $3, $4) id', [logId, profileId, tokens, micro])).rows[0].id }
      catch (e) { throw new LivePortError('record', refusalOf(e)) }
    },
    async record(reservationId, text) {
      try { return (await svc.query('SELECT attempt_id, result FROM public.creator_record_v2_record_customer_live_examination($1, $2)', [reservationId, text])).rows[0] }
      catch (e) { throw new LivePortError('record', refusalOf(e)) }
    },
    async settle(reservationId, charged) {
      return Number((await svc.query('SELECT public.creator_record_v2_settle_customer_live_reservation($1, $2) n', [reservationId, charged])).rows[0].n)
    },
  }
  const examine = (owner: string, documentId: string, fake = fakeAdapter()) =>
    examineCustomerDocumentLive({ ports, isKnownSyntheticFixture: (s) => fixtures.has(s), now: () => new Date(), executorOptions: { env: ENV, loadAdapter: async () => fake.adapter } }, owner, documentId)
  const reservations = async (documentId: string) => (await admin.query('SELECT * FROM public.creator_record_v2_customer_live_reservations WHERE document_id = $1 ORDER BY attempt_number', [documentId])).rows
  const attempts = async (documentId: string) => (await admin.query('SELECT * FROM public.creator_record_v2_live_examination_attempts WHERE document_id = $1 ORDER BY attempt_number', [documentId])).rows

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
    for (const r of (await admin.query('SELECT sha256 FROM public.creator_record_v2_synthetic_fixtures')).rows) fixtures.add(String(r.sha256).trim())
    svc = new Client({ connectionString: URL })
    await svc.connect()
    await svc.query('SET ROLE service_role')
  }, 60_000)
  afterAll(async () => {
    await svc?.end().catch(() => undefined)
    await admin?.end().catch(() => undefined)
  })
  afterEach(async () => { await disable() })

  test('without the enablement row nothing is read, reserved or sent', async () => {
    const owner = await user()
    const doc = await upload(owner)
    const fake = fakeAdapter()
    const r = await examine(owner, doc.id, fake)
    expect(r.result).toEqual({ kind: 'not_read', reason: 'not_enabled' })
    expect(fake.calls).toHaveLength(0)
    expect(await reservations(doc.id)).toHaveLength(0)
  })

  test('the full pathway: questionnaire, upload, examination, bounded observations, schema 8 record, PDF', async () => {
    await enable()
    const owner = await user()
    const doc = await upload(owner)
    const fake = fakeAdapter()

    // Examination: one reservation, one or two requests, one stored reading, settled.
    const r = await examine(owner, doc.id, fake)
    expect(r.result.kind).toBe('examined')
    expect(r.settlement.status).toBe('settled')
    expect(fake.calls.length).toBeGreaterThanOrEqual(1)
    const [res] = await reservations(doc.id)
    const [att] = await attempts(doc.id)
    expect(att).toMatchObject({ execution_origin: 'live_model', content_class: 'customer_document', provider: 'anthropic', model: LIVE_EXTRACTION_MODEL, outcome_status: 'examined', reservation_id: res.id })
    expect(res).toMatchObject({ attempt_id: att.id, attempt_number: 1 })
    expect(res.settled_at).not.toBeNull()
    expect(res.reserved_micro_usd).toBeGreaterThan(0)

    // Asking again returns the stored reading: no model call, no new reservation.
    const again = fakeAdapter()
    const r2 = await examine(owner, doc.id, again)
    expect(r2.result).toMatchObject({ kind: 'examined', model_called: false })
    expect(again.calls).toHaveLength(0)
    expect(await reservations(doc.id)).toHaveLength(1)

    // Bounded observations: the record's projection of the one stored reading.
    const listAttempts = (o: string, id: string) => ports.listLiveAttempts(o, id, 'receipt') as Promise<CustomerLiveAttemptRow[]>
    const projection = await examinationProjectionFor({ listRuns: async () => [] }, owner, doc.id, undefined, { listAttempts })
    expect(projection.kind).toBe('projection')
    if (projection.kind !== 'projection') throw new Error('no projection')
    expect(projection.projection).toMatchObject({ projection: { version: 2 }, run_id: att.id, verification: 'not_verified', execution_boundary: 'customer_live_examination' })

    // Schema 8 record from the questionnaire and the projection.
    const SYN = syntheticUatInputs()
    const state = { answers: { P1: ['Live path video'], P3: ['own_channels'], F1: ['TW'], F2: ['online_worldwide'], L1: ['no'], M0: ['none'], H1: ['edited'] }, tools: [{ T1: ['pika'], T3: ['Standard'] }], acknowledgements: { A1: true, A2: true } }
    const base = { state, sources: SYN.sources, source_text: SYN.source_text_examination!, topicClaims: CLAIMS, as_of: '2026-11-07', record: { record_id: `PREP-${randomUUID()}`, record_version: 1, captured_at: '2026-11-07T09:00:00.000Z' } }
    const document = { document_id: doc.id, sha256: sha(doc.bytes), media_type: 'application/pdf' as const, byte_size: doc.bytes.length, file_name: 'receipt.pdf', category: 'billing_receipt' as const, tool_index: 0 }
    const built = buildCustomerRecord({ ...base, documents: [document], examinations: [{ document_id: doc.id, projection: projection.projection }] })
    if (!built.ok) throw new Error(JSON.stringify(built).slice(0, 300))
    expect(built.record.schema_version).toBe(CUSTOMER_RECORD_EXAMINATION_SCHEMA_VERSION)
    expect(verifyCustomerRecord(built.canonical, built.sha256).ok).toBe(true)
    // No determination: every comparison is withheld.
    const items = 'items' in built.record.comparison ? built.record.comparison.items : []
    expect(items.length).toBe(1)
    for (const c of items) expect([c.provider, c.plan]).toEqual([{ result: 'not_assessed', reason: 'determination_withheld' }, { result: 'not_assessed', reason: 'determination_withheld' }])

    // The PDF model: the reading printed as a model reading, apart from the declarations; guidance unchanged by the document.
    const model = buildCustomerDocument({ canonical: built.canonical, sha256: built.sha256, issued: { record_id: 'CR-2026-ABCD1234', issued_on: '2026-11-07' }, templates: EXAM_PDF.templates, template_approval: EXAM_PDF.approval })
    const docs = model.sections.find((s) => s.id === 'documents')!.blocks
    const rows = docs.filter((b): b is Extract<Block, { kind: 'row' }> => b.kind === 'row')
    const L = EXAM_PDF.templates.live_examination
    expect(rows.find((x) => x.label === EXAM_PDF.templates.examination.method)?.value).toBe(L.method)
    expect(rows.find((x) => x.label === L.model)).toMatchObject({ value: LIVE_EXTRACTION_MODEL, value_from: 'record' })
    expect(rows.find((x) => x.label === L.provider)?.value).toBe(L.provider_labels.anthropic)
    expect(rows.find((x) => x.label === L.executed_at)?.value).toBe(JSON.parse(att.envelope_canonical).executed_at)
    expect(rows.find((x) => x.label === EXAM_PDF.templates.examination.content)?.value).toBe(L.content_labels.customer_document)
    expect(docs.filter((b) => b.kind === 'bullet').map((b) => (b as { text: string }).text)).toContain(L.limitation_labels.observations_not_verified)
    // Templates approved without the live wording refuse a record that holds a model reading.
    const noLive = JSON.parse(JSON.stringify(EXAM_PDF.templates))
    delete noLive.live_examination
    let refusal = 'rendered'
    try {
      buildCustomerDocument({ canonical: built.canonical, sha256: built.sha256, issued: { record_id: 'CR-2026-ABCD1234', issued_on: '2026-11-07' }, templates: noLive, template_approval: { ...EXAM_PDF.approval, fingerprint: templateFingerprint(noLive) } })
    } catch (e) {
      refusal = e instanceof CustomerPdfRefusal ? e.code : String(e)
    }
    expect(refusal).toBe('templates_live_examination_missing')
    const text = documentText(model).join('\n')
    expect(text).not.toMatch(/appears[ _]consistent|appears[ _]to[ _]conflict|determination[ _]withheld|consisten|conflict/i)
    // The same declarations without the document: a schema 7 record, under its own wording approval and templates.
    const plain = buildCustomerRecord({ ...base, source_text: SYN.source_text })
    if (!plain.ok) throw new Error('plain')
    const t7 = approvedPdfTemplates(CREATOR_RECORD_SYNTHETIC_TEST_AUTHORITY)
    const plainModel = buildCustomerDocument({ canonical: plain.canonical, sha256: plain.sha256, issued: { record_id: 'CR-2026-ABCD1234', issued_on: '2026-11-07' }, templates: t7.templates, template_approval: t7.approval })
    expect(JSON.stringify(plainModel.sections.find((s) => s.id === 'guidance')!.blocks.slice(1))).toBe(JSON.stringify(model.sections.find((s) => s.id === 'guidance')!.blocks.slice(1)))
  })

  test('a provider failure is stored, settled and retried; the next attempt reads it', async () => {
    await enable()
    const owner = await user()
    const doc = await upload(owner)
    const first = await examine(owner, doc.id, fakeAdapter(['throw']))
    expect(first.result).toMatchObject({ kind: 'failed', reason: 'provider_failure', retryable: true })
    expect(first.settlement.status).toBe('settled')
    // A failed attempt is never a reading: the record carries nothing for this document yet.
    const listAttempts = (o: string, id: string) => ports.listLiveAttempts(o, id, 'receipt') as Promise<CustomerLiveAttemptRow[]>
    expect(await examinationProjectionFor({ listRuns: async () => [] }, owner, doc.id, undefined, { listAttempts })).toEqual({ kind: 'none' })
    const second = await examine(owner, doc.id, fakeAdapter(['ok']))
    expect(second.result.kind).toBe('examined')
    expect((await attempts(doc.id)).map((a) => [a.attempt_number, a.outcome_status])).toEqual([[1, 'could_not_examine'], [2, 'examined']])
    expect((await reservations(doc.id)).map((r) => [r.attempt_number, r.settled_at !== null])).toEqual([[1, true], [2, true]])
  })

  test('three failed attempts exhaust a document: the fourth calls nothing and reserves nothing', async () => {
    await enable()
    const owner = await user()
    const doc = await upload(owner)
    for (let i = 0; i < 3; i++) await examine(owner, doc.id, fakeAdapter(['throw']))
    const fake = fakeAdapter(['ok'])
    const r = await examine(owner, doc.id, fake)
    expect(r.result.kind).toBe('attempts_exhausted')
    expect(fake.calls).toHaveLength(0)
    expect(await reservations(doc.id)).toHaveLength(3)
  })

  test('the daily attempt limit and the spend limit refuse before any model request', async () => {
    await enable({ day: 1 })
    const owner = await user()
    const a = await upload(owner)
    const b = await upload(owner)
    expect((await examine(owner, a.id, fakeAdapter())).result.kind).toBe('examined')
    const fake = fakeAdapter()
    const r = await examine(owner, b.id, fake)
    expect(r).toMatchObject({ result: { kind: 'refused', code: 'live_budget_exhausted' }, reservation_refusal: 'daily_limit', settlement: { status: 'not_reserved' } })
    expect(fake.calls).toHaveLength(0)

    await disable()
    await enable({ spend: 100_000 })
    const other = await user()
    const c = await upload(other)
    const poor = fakeAdapter()
    const s = await examine(other, c.id, poor)
    expect(s).toMatchObject({ result: { kind: 'refused', code: 'live_budget_exhausted' }, reservation_refusal: 'spend_limit' })
    expect(poor.calls).toHaveLength(0)
    expect(await reservations(c.id)).toHaveLength(0)
  })

  test('the route maps a limit to its own code, and every refusal to a fixed one', async () => {
    await enable({ day: 1 })
    const owner = await user()
    const a = await upload(owner)
    const b = await upload(owner)
    const deps = (fake = fakeAdapter()): CustomerExaminationDeps => ({
      submissions: 'open', hasPilotAccess: async () => true,
      adapter: { storage: { getDocument: ports.getDocument, logExaminationRead: async () => { throw new Error('replay path must not run') }, readObject: ports.readObject, recordExamination: async () => { throw new Error('no') }, listRuns: async () => [] }, core: {} } as never,
      live: { examine: (u, d) => examine(u, d, fake) },
      // CR-V2-MVP-LAUNCH-FOUNDATION-1 (8Q): the live path requires the creator's AI-examination permission. This file applies
      // migrations through 20261110 only, so the grant is a stand-in here; it is enforced on PostgreSQL in the 8Q suite.
      aiPermission: { version: 'test-permission', grant: async () => 'granted' },
    })
    const permit = { aiPermission: 'test-permission' }
    expect(await requestCustomerExamination(deps(), owner, a.id, permit)).toMatchObject({ ok: true, result: 'created' })
    expect(await requestCustomerExamination(deps(), owner, a.id, permit)).toMatchObject({ ok: true, result: 'existing' })
    expect(await requestCustomerExamination(deps(), owner, b.id, permit)).toEqual({ ok: false, status: 429, code: 'examination_limit_reached' })
    const stranger = await user()
    expect(await requestCustomerExamination(deps(), stranger, a.id, permit)).toEqual({ ok: false, status: 404, code: 'not_found' })
    // Without the permission, the live path refuses before anything is read.
    expect(await requestCustomerExamination(deps(), owner, b.id)).toEqual({ ok: false, status: 400, code: 'ai_permission_required' })
  })

  test('a known synthetic fixture, another creator\'s document and a deleted document are never read', async () => {
    await enable()
    const owner = await user()
    const fixture = REPLAY_FIXTURES[0]
    const fixtureBytes = syntheticTextPdf('fixture stand-in')
    // A document whose digest is a committed fixture's (the database knows the fixture table).
    const id = randomUUID()
    await svc.query(`INSERT INTO public.creator_record_v2_documents (id, user_id, sha256, media_type, byte_size, file_name, storage_path, consent_version, state) VALUES ($1, $2, $3, $4, $5, 'f.pdf', $6, $7, 'pending')`, [id, owner, fixture.sha256, fixture.media_type, fixture.bytes, `${owner}/${id}`, CONSENT])
    await svc.query(`UPDATE public.creator_record_v2_documents SET state = 'stored', stored_at = now() WHERE id = $1`, [id])
    bytesOf.set(id, fixtureBytes)
    const f1 = fakeAdapter()
    expect((await examine(owner, id, f1)).result).toEqual({ kind: 'not_read', reason: 'known_fixture' })
    expect(f1.calls).toHaveLength(0)

    const mine = await upload(owner)
    const stranger = await user()
    const f2 = fakeAdapter()
    expect((await examine(stranger, mine.id, f2)).result).toMatchObject({ kind: 'refused', code: 'not_owner' })
    expect(await fail(svc.query(`INSERT INTO public.creator_record_v2_evidence_access_log (document_id, actor_user_id, actor_role, purpose) VALUES ($1, $2, 'owner', 'live_examination')`, [mine.id, stranger]))).toBe('customer_live_read_target_mismatch')
    await svc.query(`UPDATE public.creator_record_v2_documents SET state = 'deleted', deleted_at = now() WHERE id = $1`, [mine.id])
    expect((await examine(owner, mine.id, f2)).result).toMatchObject({ kind: 'refused', code: 'document_not_stored' })
    expect(f2.calls).toHaveLength(0)
  })

  test('two attempts at once on one document: one reading, never two, and every reservation settled or counted', async () => {
    await enable()
    const owner = await user()
    const doc = await upload(owner)
    const [x, y] = await Promise.all([examine(owner, doc.id, fakeAdapter(['ok'], 150)), examine(owner, doc.id, fakeAdapter(['ok'], 150))])
    const kinds = [x.result.kind, y.result.kind].sort()
    expect(kinds).toContain('examined')
    expect((await attempts(doc.id)).filter((a) => a.outcome_status === 'examined')).toHaveLength(1)
    const res = await reservations(doc.id)
    expect(res.length).toBeLessThanOrEqual(2)
    for (const r of res) expect(r.settled_at !== null || r.attempt_id === null).toBe(true)
  })

  describe('the database enforces its own rules, whatever the application does', () => {
    test('no API role can write the ledger, the enablement or an attempt directly', async () => {
      const owner = await user()
      const doc = await upload(owner)
      expect(await fail(svc.query(`INSERT INTO public.creator_record_v2_customer_live_enablement (supabase_project_ref, max_attempts_per_creator_per_day, max_spend_micro_usd_per_creator, max_reserve_micro_usd_per_attempt, established_by, reason) VALUES ('aaaaaaaaaaaaaaaaaaaa', 1, 1, 1, 'x', 'x')`))).toMatch(/permission denied/)
      expect(await fail(svc.query(`INSERT INTO public.creator_record_v2_customer_live_reservations (user_id, document_id, profile_id, attempt_number, access_log_id, input_tokens_bound, reserved_micro_usd) VALUES ($1, $2, 'receipt', 1, 1, 1, 1)`, [owner, doc.id]))).toMatch(/permission denied/)
      expect(await fail(svc.query(`UPDATE public.creator_record_v2_customer_live_reservations SET charged_micro_usd = 0`))).toMatch(/permission denied/)
    })

    test('a live row needs its reservation; a mocked row cannot have one; nothing mixes', async () => {
      const probe = await admin.query(`SELECT pg_get_constraintdef(oid) d FROM pg_constraint WHERE conname = 'creator_record_v2_live_examination_attempts_shape_check'`)
      expect(probe.rows[0].d).toContain("reservation_id IS NOT NULL")
      expect(probe.rows[0].d).toContain("reservation_id IS NULL")
    })

    test('a reservation is used once and settled once; the record function refuses another shape', async () => {
      await enable()
      const owner = await user()
      const doc = await upload(owner)
      const r = await examine(owner, doc.id, fakeAdapter())
      expect(r.result.kind).toBe('examined')
      const [res] = await reservations(doc.id)
      const [att] = await attempts(doc.id)
      expect(await fail(ports.record(res.id, att.envelope_canonical))).toBe('creator_record_live_examination_record_reservation_invalid')
      expect(await fail(ports.settle(res.id, 1))).toMatch(/customer_live_settlement_invalid/)
      const doc2 = await upload(owner)
      const logId = await ports.logLiveRead(doc2.id, owner)
      const resId = await ports.reserve(logId, 'receipt', 1000, 140_000)
      expect(await fail(ports.reserve(logId, 'receipt', 1000, 140_000))).toBe('creator_record_live_examination_record_access_not_logged')
      const mockShape = JSON.parse(att.envelope_canonical)
      mockShape.execution_origin = 'mock_test'
      expect(await fail(ports.record(resId, JSON.stringify(mockShape)))).toBe('creator_record_live_examination_record_envelope_invalid')
      expect(await fail(ports.reserve(await ports.logLiveRead(doc2.id, owner), 'receipt', 1000, 140_000))).toBe('creator_record_live_examination_record_in_progress')
      expect(await fail(ports.reserve(await ports.logLiveRead(doc2.id, owner), 'receipt', 1000, 2_000_000))).toBe('creator_record_live_examination_record_reservation_invalid')
    })

    test('switching off between the logged read and the reservation still refuses: every function checks the enablement itself', async () => {
      await enable()
      const owner = await user()
      const doc = await upload(owner)
      const logId = await ports.logLiveRead(doc.id, owner)
      await disable()
      expect(await fail(ports.reserve(logId, 'receipt', 1000, 140_000))).toBe('creator_record_live_examination_record_not_enabled')
      expect(await reservations(doc.id)).toHaveLength(0)
    })

    test('spend counts the larger of reserved and charged, and an unsettled reservation counts in full', async () => {
      await enable({ spend: 400_000 })
      const owner = await user()
      const a = await upload(owner)
      const b = await upload(owner)
      const c = await upload(owner)
      // Two reservations of 150,000 each, one never settled: 300,000 counted; a third of 150,000 would pass 400,000.
      const r1 = await ports.reserve(await ports.logLiveRead(a.id, owner), 'receipt', 1000, 150_000)
      await ports.settle(r1, 10)
      await ports.reserve(await ports.logLiveRead(b.id, owner), 'receipt', 1000, 150_000)
      expect(await fail(ports.reserve(await ports.logLiveRead(c.id, owner), 'receipt', 1000, 150_000))).toBe('creator_record_live_examination_record_spend_limit')
    })
  })
})
