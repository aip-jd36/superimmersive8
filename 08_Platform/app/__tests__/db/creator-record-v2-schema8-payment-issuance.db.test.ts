/**
 * CR-V2-MVP-M4A — schema 8 payment and issuance on real PostgreSQL, every migration through 20261110 applied verbatim:
 *   upload → customer live examination (real database functions; fake model behind the executor's adapter seam) → schema 8 record →
 *   prepared and reviewed (creator_record_v2_prepared) → bound (create_creator_record_v2_submission) → checkout preconditions →
 *   payment recorded exactly as the Stripe webhook records it (record_checkout_payment, with synthetic session facts: Stripe is never
 *   called) → fulfilment claimed, run and finished by the ledger functions → artifact row issued (creator_record_artifacts) → delivery.
 * Then: a refusal after payment (failed, then the manual queue, then an operator retry), and a duplicate webhook.
 *
 * Both live-examination code locks are lifted for this file only (module mock). Disposable local `si8_test_*` database only. Objects
 * are kept in memory (Storage is not part of this schema); the PDF bytes are the document model (react-pdf does not load under Jest;
 * the unit suite renders the same input as a real PDF).
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
const issuanceDepsRef: { current: unknown } = { current: null }
jest.mock('@/lib/creator-record-flow/production', () => {
  const purchase = jest.requireActual('@/lib/creator-record/customer-flow/purchase')
  return {
    renderCreatorRecordV2Pdf: (sub: unknown, id: string, at: Date) => purchase.renderV2ForIssuance(issuanceDepsRef.current, sub, id, at),
    authorizeCreatorRecordV2Issuance: async (sub: unknown, at: Date) => { await purchase.authorizeV2Issuance(issuanceDepsRef.current, sub, at) },
  }
})
jest.mock('@/lib/creator-record-artifacts/store', () => ({ artifactGateDecision: jest.fn(), artifactStatus: jest.fn(), artifactTable: {}, newAttemptId: jest.fn(), privateObjectStore: {} }))
jest.mock('@/lib/payments/repository', () => ({ ...jest.requireActual('@/lib/payments/repository'), hasCreatorRecordPdf: jest.fn(), loadFulfillmentSubmission: jest.fn() }))

import { approvedPdfTemplates } from '@/lib/creator-record/customer-flow/approved-inputs'
import { examinationProjectionFor, verifyReferencedReadings } from '@/lib/creator-record/customer-flow/examination'
import { checkV2Checkout, startPurchase, type PurchaseDeps, type V2IssuanceDeps } from '@/lib/creator-record/customer-flow/purchase'
import type { PreparedRow } from '@/lib/creator-record/customer-flow/service'
import { syntheticUatInputs } from '@/lib/creator-record/customer-flow/synthetic-uat'
import { buildCustomerDocument, documentModelCanonical } from '@/lib/creator-record/customer-pdf/document-model'
import { examinationMethodOf } from '@/lib/creator-record/customer-record/eligibility'
import { governanceSnapshotFrom } from '@/lib/creator-record/customer-record/governance-state'
import { buildCustomerRecord, CUSTOMER_RECORD_EXAMINATION_SCHEMA_VERSION } from '@/lib/creator-record/customer-record/record'
import { REPLAY_FIXTURES } from '@/lib/creator-record/evidence/replay-fixtures.data'
import { CREATOR_RECORD_SYNTHETIC_TEST_AUTHORITY as SYN_AUTH, SYNTHETIC_TEST_EXAMINATION_PDF as EXAM_PDF } from '@/lib/creator-record/governed/synthetic-test-authority'
import { CUSTOMER_LIVE_DATABASE_REFUSALS, examineCustomerDocumentLive, type CustomerLivePorts } from '@/lib/creator-record/live-examination/customer'
import { LivePortError } from '@/lib/creator-record/live-examination/examine'
import type { CustomerLiveAttemptRow } from '@/lib/creator-record/live-examination/projection'
import type { LiveAnthropicAdapter } from '@/lib/creator-record/live-examination/real-executor'
import { deliverCreatorRecordPdf } from '@/lib/creator-record-artifacts/deliver'
import { issueCreatorRecordArtifact, type ArtifactRow, type ArtifactTable, type IssueDeps } from '@/lib/creator-record-artifacts/issue'
import { CREATOR_RECORD_V2_FAMILY, CREATOR_RECORD_V2_GENERATOR_VERSION, rendererForFamily } from '@/lib/creator-record-artifacts/renderers'
import { runPaymentFulfillment, type FulfillmentDeps } from '@/lib/payments/run-payment-fulfillment'
import type { FulfillmentSubmission } from '@/lib/payments/repository'
import { TOPIC_CLAIMS_FIXTURE as CLAIMS } from '@/lib/retrieval-engine/topic-claims-fixture'
import { COMMERCIAL_SUPPORT_UNDER_TEST } from '@/test-support/commercial-support'
import { syntheticTextPdf } from '@/test-support/synthetic-pdf'

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
const PREPARED_COLUMNS = 'id, user_id, draft_id, version, record_ref, record_schema, record_schema_version, canonical, sha256, form_state, status, created_at, reviewed_at, submission_id'
const ARTIFACT_COLUMNS = 'id, submission_id, record_id, attempt_id, storage_path, sha256, byte_size, generator_version, status, uat, issued_at'

function assertDisposable(url: string) {
  const u = new globalThis.URL(url)
  if (!u.pathname.replace(/^\//, '').startsWith('si8_test_')) throw new Error('refusing to run: not an si8_test_* database')
  if (!['localhost', '127.0.0.1', '::1', '[::1]'].includes(u.hostname)) throw new Error('refusing to run: host is not local')
}
if (process.env.CI && !URL) throw new Error('DATABASE_URL_TEST is required in CI')
const maybe = URL ? describe : describe.skip
const sha = (b: Uint8Array) => createHash('sha256').update(b).digest('hex')
const trim = (v: unknown) => (typeof v === 'string' ? v.trim() : v)

const fakeAdapter: LiveAnthropicAdapter = {
  createAnthropicReceiptCaller: (o) => async () => ({ id: 'msg_live_m4a', model: o.model, stop_reason: 'end_turn', content: [{ type: 'text', text: '' }], usage: { input_tokens: 3000, output_tokens: 400 }, parsed_output: OUTPUT }) as never,
  classifyAnthropicFailure: () => 'server_error',
}

maybe('schema 8 payment and issuance (PostgreSQL, through 20261110000000)', () => {
  let admin: Client
  let svc: Client
  const bytesOf = new Map<string, Uint8Array>()
  const objects = new Map<string, Uint8Array>()

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
      VALUES ('localpg15m4apathways', 24, 5000000, 1000000, 'db test operator', 'isolated local PostgreSQL test')`)
    svc = new Client({ connectionString: URL })
    await svc.connect()
    await svc.query('SET ROLE service_role')
  }, 60_000)
  afterAll(async () => {
    await svc?.end().catch(() => undefined)
    await admin?.end().catch(() => undefined)
  })

  // ── Ports over pg (production uses PostgREST with the same functions and the same service role) ──
  const refusalOf = (e: unknown) => CUSTOMER_LIVE_DATABASE_REFUSALS[(e as { message?: string }).message ?? ''] ?? null
  const listLiveAttempts = async (owner: string, documentId: string, profileId: string): Promise<CustomerLiveAttemptRow[]> => {
    const r = await svc.query(`SELECT ${ATTEMPT_COLUMNS} FROM public.creator_record_v2_live_examination_attempts WHERE user_id = $1 AND document_id = $2 AND profile_id = $3`, [owner, documentId, profileId])
    return r.rows.map((x) => ({ ...x, examination_key: trim(x.examination_key), document_sha256: trim(x.document_sha256), envelope_sha256: trim(x.envelope_sha256), access_log_id: Number(x.access_log_id), created_at: new Date(x.created_at).toISOString(), executed_at: x.executed_at instanceof Date ? x.executed_at.toISOString() : x.executed_at }))
  }
  const ports: CustomerLivePorts = {
    async getDocument(id) {
      const r = await svc.query('SELECT id, user_id, sha256, media_type, byte_size, state FROM public.creator_record_v2_documents WHERE id = $1', [id])
      return r.rows[0] ? { ...r.rows[0], sha256: String(r.rows[0].sha256).trim() } : null
    },
    async logLiveRead(documentId, owner) {
      try { return Number((await svc.query(`INSERT INTO public.creator_record_v2_evidence_access_log (document_id, actor_user_id, actor_role, purpose) VALUES ($1, $2, 'owner', 'live_examination') RETURNING id`, [documentId, owner])).rows[0].id) }
      catch (e) { throw new LivePortError('log_read', refusalOf(e)) }
    },
    readObject: async (record) => bytesOf.get(record.id) ?? null,
    listLiveAttempts,
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
  const listRuns = async (owner: string, documentId: string) => (await svc.query('SELECT * FROM public.creator_record_v2_examination_runs WHERE user_id = $1 AND document_id = $2', [owner, documentId])).rows
  const readingsIntact = (owner: string, refs: Parameters<typeof verifyReferencedReadings>[2]) => verifyReferencedReadings({ listRuns, listLiveAttempts }, owner, refs)

  const toRow = (r: Record<string, unknown>): PreparedRow => ({ ...r, sha256: trim(r.sha256), created_at: new Date(r.created_at as string).toISOString(), reviewed_at: r.reviewed_at ? new Date(r.reviewed_at as string).toISOString() : null } as PreparedRow)
  const getPrepared = async (id: string) => { const r = (await svc.query(`SELECT ${PREPARED_COLUMNS} FROM public.creator_record_v2_prepared WHERE id = $1`, [id])).rows[0]; return r ? toRow(r) : null }
  const latestVersion = async (draftId: string) => { const r = (await svc.query(`SELECT ${PREPARED_COLUMNS} FROM public.creator_record_v2_prepared WHERE draft_id = $1 ORDER BY version DESC LIMIT 1`, [draftId])).rows[0]; return r ? toRow(r) : null }
  const boundTo = async (sid: string) => { const r = (await svc.query(`SELECT ${PREPARED_COLUMNS} FROM public.creator_record_v2_prepared WHERE submission_id = $1`, [sid])).rows[0]; return r ? toRow(r) : null }

  const artifactRow = (r: Record<string, unknown>): ArtifactRow => ({ ...r, sha256: trim(r.sha256), byte_size: Number(r.byte_size), issued_at: r.issued_at ? new Date(r.issued_at as string).toISOString() : null } as ArtifactRow)
  const artifacts: ArtifactTable = {
    async find(sid) { const r = (await svc.query(`SELECT ${ARTIFACT_COLUMNS} FROM public.creator_record_artifacts WHERE submission_id = $1`, [sid])).rows[0]; return r ? artifactRow(r) : null },
    async insertPending(row) {
      try {
        const r = (await svc.query(`INSERT INTO public.creator_record_artifacts (submission_id, record_id, attempt_id, storage_path, sha256, byte_size, generator_version, uat, status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'pending') RETURNING ${ARTIFACT_COLUMNS}`,
          [row.submission_id, row.record_id, row.attempt_id, row.storage_path, row.sha256, row.byte_size, row.generator_version, row.uat])).rows[0]
        return { result: 'inserted', row: artifactRow(r) }
      } catch (e) { if ((e as { code?: string }).code === '23505') return { result: 'conflict' }; throw e }
    },
    async takeOver(id, expected, next) {
      const r = await svc.query(`UPDATE public.creator_record_artifacts SET attempt_id = $3, storage_path = $4, sha256 = $5, byte_size = $6, generator_version = $7 WHERE id = $1 AND attempt_id = $2 AND status = 'pending'`, [id, expected, next.attempt_id, next.storage_path, next.sha256, next.byte_size, next.generator_version])
      return r.rowCount === 1
    },
    async markIssued(id, attempt, digest) {
      const r = await svc.query(`UPDATE public.creator_record_artifacts SET status = 'issued', issued_at = now() WHERE id = $1 AND attempt_id = $2 AND sha256 = $3 AND status = 'pending'`, [id, attempt, digest])
      return r.rowCount === 1
    },
  }

  // ── The creator's path up to checkout ──
  async function creatorWithLiveRecord() {
    const owner = randomUUID()
    await admin.query('INSERT INTO public.users (id, email, name, is_admin) VALUES ($1, $2, $3, false)', [owner, `${owner}@example.test`, 'Creator'])
    const bytes = syntheticTextPdf(`Synthetic receipt ${randomUUID()}`)
    const docId = randomUUID()
    await svc.query(`INSERT INTO public.creator_record_v2_documents (id, user_id, sha256, media_type, byte_size, file_name, storage_path, consent_version, state) VALUES ($1, $2, $3, 'application/pdf', $4, 'receipt.pdf', $5, $6, 'pending')`, [docId, owner, sha(bytes), bytes.length, `${owner}/${docId}`, CONSENT])
    await svc.query(`UPDATE public.creator_record_v2_documents SET state = 'stored', stored_at = now() WHERE id = $1`, [docId])
    bytesOf.set(docId, bytes)

    const r = await examineCustomerDocumentLive({ ports, isKnownSyntheticFixture: () => false, now: () => new Date(), executorOptions: { env: ENV, loadAdapter: async () => fakeAdapter } }, owner, docId)
    expect(r.result.kind).toBe('examined')
    const projection = await examinationProjectionFor({ listRuns: async () => [] }, owner, docId, undefined, { listAttempts: (o, d) => listLiveAttempts(o, d, 'receipt') })
    if (projection.kind !== 'projection') throw new Error(`no projection: ${JSON.stringify(projection)}`)

    const SYN = syntheticUatInputs()
    const preparedId = randomUUID()
    const draftId = randomUUID()
    const state = { answers: { P1: ['M4A database pathway'], P3: ['own_channels'], F1: ['TW'], F2: ['online_worldwide'], L1: ['no'], M0: ['none'], H1: ['edited'] }, tools: [{ T1: ['pika'], T3: ['Standard'] }], acknowledgements: { A1: true, A2: true } }
    const built = buildCustomerRecord({
      state, sources: SYN.sources, source_text: SYN.source_text_examination!, topicClaims: CLAIMS, as_of: new Date().toISOString().slice(0, 10),
      record: { record_id: `PREP-${preparedId}`, record_version: 1, captured_at: new Date().toISOString().replace(/\.\d+Z$/, '.000Z') },
      documents: [{ document_id: docId, sha256: sha(bytes), media_type: 'application/pdf', byte_size: bytes.length, file_name: 'receipt.pdf', category: 'billing_receipt', tool_index: 0 }],
      examinations: [{ document_id: docId, projection: projection.projection }],
    })
    if (!built.ok) throw new Error(JSON.stringify(built).slice(0, 300))
    expect(built.record.schema_version).toBe(CUSTOMER_RECORD_EXAMINATION_SCHEMA_VERSION)
    await svc.query(`INSERT INTO public.creator_record_v2_prepared (id, user_id, draft_id, version, record_ref, record_schema, record_schema_version, canonical, sha256, form_state, status) VALUES ($1,$2,$3,1,$4,$5,$6,$7,$8,$9,'prepared')`,
      [preparedId, owner, draftId, `PREP-${preparedId}`, built.record.schema, built.record.schema_version, built.canonical, built.sha256, JSON.stringify(state)])
    await svc.query(`UPDATE public.creator_record_v2_prepared SET status = 'reviewed', reviewed_at = now() WHERE id = $1`, [preparedId])
    const method = examinationMethodOf(JSON.parse(built.canonical).documents.items[0].examination)
    return { owner, docId, preparedId, draftId, sha256: built.sha256, method, attemptId: projection.projection.run_id }
  }

  const governance = (methods: unknown[]) => (date: string) => governanceSnapshotFrom({
    issuance_date: date, sources: syntheticUatInputs().sources, topicClaims: CLAIMS, source_text_approvals: [syntheticUatInputs().source_text_examination!.approval!],
    support: { ...COMMERCIAL_SUPPORT_UNDER_TEST, examination_methods: methods as never }, authority_class: 'synthetic_test',
  })
  const templates = (schema: { id: string; version: number }) => approvedPdfTemplates(SYN_AUTH, schema)
  const purchaseDeps = (methods: unknown[]): PurchaseDeps => ({
    submissions: 'open', issuance: 'enabled', hasPilotAccess: async () => true, legalPoliciesApproved: () => true, getPrepared, latestVersion, boundTo,
    bind: async (p) => {
      const r = (await svc.query('SELECT * FROM public.create_creator_record_v2_submission($1, $2, $3, $4)', [p.preparedId, p.userId, p.sha256, 'Creator'])).rows[0]
      return { submissionId: r.out_submission_id, reason: r.out_reason }
    },
    governance: governance(methods), now: () => new Date(), evidenceIntact: async () => ({ ok: true }), examinationsIntact: readingsIntact, templates,
  })
  const issuanceDeps = (methods: unknown[], over: Partial<V2IssuanceDeps> = {}): V2IssuanceDeps => ({
    boundTo, latestVersion, governance: governance(methods), templates,
    renderPdf: async (input) => new TextEncoder().encode(documentModelCanonical(buildCustomerDocument(input))),
    evidenceIntact: async () => ({ ok: true }), examinationsIntact: readingsIntact, ...over,
  })

  // ── The webhook: payment recorded from the session facts, then fulfilment through the ledger functions ──
  const recordPayment = async (session: string, submissionId: string, event = `evt_${randomUUID().replace(/-/g, '')}`) =>
    (await svc.query('SELECT * FROM public.record_checkout_payment($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)',
      [session, event, submissionId, Math.floor(Date.now() / 1000), 'complete', 'payment', 'paid', 'pi_test_m4a', 'usd', 2900, 2900, 0, 0, 0])).rows[0]
  const ledger = async (session: string) => (await admin.query('SELECT * FROM public.payment_fulfillments WHERE stripe_checkout_session_id = $1', [session])).rows[0]
  function fulfilmentDeps(sub: FulfillmentSubmission, alerts: unknown[], emails: unknown[], maxAttempts = 6): { deps: FulfillmentDeps; issueDeps: IssueDeps } {
    const renderer = rendererForFamily(CREATOR_RECORD_V2_FAMILY, 'enabled')
    const issueDeps: IssueDeps = {
      artifacts, objects: { get: async (p) => objects.get(p) ?? null, put: async (p, b) => { if (objects.has(p)) return 'exists'; objects.set(p, b); return 'stored' } },
      renderer: { family: renderer.family, generator_version: renderer.generator_version, ownsGeneratorVersion: (v) => renderer.ownsGeneratorVersion(v), render: (rid) => renderer.render(sub, rid, new Date()), authorize: () => renderer.authorize!(sub, new Date()) },
      newAttemptId: () => randomUUID(), now: () => new Date(), uat: false,
    }
    const deps: FulfillmentDeps = {
      async claim(session) {
        const r = (await svc.query('SELECT * FROM public.claim_payment_fulfillment($1, 300, $2, 604800)', [session, maxAttempts])).rows[0]
        return { claimed: r.out_claimed === true, claimToken: r.out_claim_token ?? null, reason: r.out_reason, submissionId: r.out_submission_id ?? null, tier: r.out_tier ?? null, pdfStatus: r.out_pdf_status ?? null, emailStatus: r.out_email_status ?? null }
      },
      markStep: async (s, t, step, status, provider = null, err = null) => (await svc.query('SELECT public.mark_payment_fulfillment_step($1,$2,$3,$4,$5,$6) AS ok', [s, t, step, status, provider, err])).rows[0].ok === true,
      finish: async (s, t, err) => (await svc.query('SELECT public.finish_payment_fulfillment($1,$2,$3) AS s', [s, t, err])).rows[0].s,
      loadSubmission: async (id) => {
        const r = (await svc.query('SELECT id, user_id, tier, status, title, filmmaker_name, creator_record_product FROM public.submissions WHERE id = $1', [id])).rows[0]
        return r ? { ...sub, ...r } : null
      },
      hasCreatorRecordPdf: async (id) => (await artifacts.find(id))?.status === 'issued',
      generateCreatorRecordPdf: async () => { await issueCreatorRecordArtifact(sub.id, issueDeps) },
      loadUserContact: async () => ({ name: 'Creator', email: 'creator@example.test' }),
      sendCreatorRecordEmail: async () => { throw new Error('v1 email must not be sent') },
      sendCreatorRecordV2Email: async (p) => { emails.push(p); return { status: 'accepted', providerId: `re_${emails.length}` } },
      sendCertifiedReceivedEmail: async () => { throw new Error('certified email must not be sent') },
      notifyAdmin: async () => undefined, alert: async (subject, fields) => { alerts.push({ subject, ...fields }) }, siteUrl: 'https://example.test',
    }
    return { deps, issueDeps }
  }

  async function purchased(methods?: unknown[]) {
    const c = await creatorWithLiveRecord()
    const supported = methods ?? [c.method]
    const p = purchaseDeps(supported)
    const started = await startPurchase(p, c.owner, c.preparedId)
    if (!started.ok) throw new Error(`purchase refused: ${JSON.stringify(started)}`)
    const submissionId = started.submission_id
    const subRow = (await svc.query('SELECT id, user_id, tier, creator_record_product, status, payment_status FROM public.submissions WHERE id = $1', [submissionId])).rows[0]
    expect(subRow).toMatchObject({ user_id: c.owner, tier: 'creator_record', creator_record_product: 'v2', status: 'pending', payment_status: 'unpaid' })
    expect(await checkV2Checkout(p, c.owner, subRow)).toEqual({ ok: true, sha256: c.sha256, record_ref: `PREP-${c.preparedId}` })
    // The checkout route binds the Stripe session to the submission before redirecting (create-session).
    const session = `cs_test_${randomUUID().replace(/-/g, '')}`
    await svc.query('UPDATE public.submissions SET stripe_checkout_session_id = $1 WHERE id = $2', [session, submissionId])
    const sub: FulfillmentSubmission = { id: submissionId, user_id: c.owner, tier: 'creator_record', status: 'approved', creator_record_product: 'v2', title: 'Creator Record', filmmaker_name: 'Creator', tools_used: [], authorship_statement: '', likeness_confirmation: {}, ip_confirmation: {}, territory_preferences: null }
    return { ...c, submissionId, session, sub }
  }

  test('the full pathway: reading → record → checkout → payment → issued artifact → delivery; a duplicate webhook issues nothing more', async () => {
    const x = await purchased()
    issuanceDepsRef.current = issuanceDeps([x.method])
    const paid = await recordPayment(x.session, x.submissionId)
    expect(paid).toMatchObject({ out_outcome: 'accepted', out_is_new: true, out_submission_id: x.submissionId })
    expect((await svc.query('SELECT status, payment_status FROM public.submissions WHERE id = $1', [x.submissionId])).rows[0]).toEqual({ status: 'approved', payment_status: 'paid' })

    const alerts: unknown[] = []
    const emails: unknown[] = []
    const f = fulfilmentDeps(x.sub, alerts, emails)
    expect((await runPaymentFulfillment(x.session, f.deps)).status).toBe('completed')
    expect(await ledger(x.session)).toMatchObject({ fulfillment_status: 'completed', pdf_status: 'completed', email_status: 'accepted', last_error: null })
    const artifact = await artifacts.find(x.submissionId)
    expect(artifact).toMatchObject({ status: 'issued', generator_version: CREATOR_RECORD_V2_GENERATOR_VERSION })
    expect(emails).toHaveLength(1)
    expect(alerts).toEqual([])
    // The issued model is exactly the bound version, printed with the schema 8 templates.
    const model = JSON.parse(new TextDecoder().decode(objects.get(artifact!.storage_path)!))
    expect(model.identity).toMatchObject({ snapshot_sha256: x.sha256 })
    expect(JSON.stringify(model)).toContain(EXAM_PDF.templates.live_examination.method)

    // Delivery to the owner: the stored bytes, re-verified.
    const res = await deliverCreatorRecordPdf(x.submissionId, {
      currentUserId: async () => x.owner, submissionOwner: async () => x.owner, isAdmin: async () => false, findArtifact: (sid) => artifacts.find(sid),
      getObject: async (p) => objects.get(p) ?? null, legacyReferences: async () => [], getLegacyObject: async () => null, log: () => undefined,
    })
    expect(res.status).toBe(200)
    expect(sha(new Uint8Array(await res.arrayBuffer()))).toBe(artifact!.sha256)

    // Duplicate webhook (Stripe retries the same session; a new event id): no second payment row, nothing claimed, nothing issued.
    const dup = await recordPayment(x.session, x.submissionId)
    expect(dup.out_is_new).toBe(false)
    expect(await runPaymentFulfillment(x.session, f.deps)).toMatchObject({ status: 'not_claimed' })
    expect((await admin.query('SELECT count(*)::int n FROM public.payment_fulfillments WHERE submission_id = $1', [x.submissionId])).rows[0].n).toBe(1)
    expect((await admin.query('SELECT count(*)::int n FROM public.creator_record_artifacts WHERE submission_id = $1', [x.submissionId])).rows[0].n).toBe(1)
    expect(emails).toHaveLength(1)
  }, 120_000)

  test('a stale version cannot be checked out: a correction after binding refuses before any session exists', async () => {
    const c = await creatorWithLiveRecord()
    const p = purchaseDeps([c.method])
    const started = await startPurchase(p, c.owner, c.preparedId)
    if (!started.ok) throw new Error('purchase')
    const original = (await getPrepared(c.preparedId))!
    await svc.query(`INSERT INTO public.creator_record_v2_prepared (id, user_id, draft_id, version, record_ref, record_schema, record_schema_version, canonical, sha256, form_state, status) VALUES ($1,$2,$3,2,$4,$5,$6,$7,$8,$9,'prepared')`,
      [randomUUID(), c.owner, c.draftId, `PREP-${randomUUID()}`, original.record_schema, original.record_schema_version, original.canonical, original.sha256, JSON.stringify(original.form_state)])
    const subRow = (await svc.query('SELECT id, user_id, tier, creator_record_product FROM public.submissions WHERE id = $1', [started.submission_id])).rows[0]
    expect(await checkV2Checkout(p, c.owner, subRow)).toEqual({ ok: false, status: 409, code: 'superseded' })
  }, 120_000)

  test('method support withdrawn after payment: refused, payment kept, failed, then the manual queue, then an operator retry completes', async () => {
    const x = await purchased()
    issuanceDepsRef.current = issuanceDeps([]) // withdrawn after the session was paid
    expect((await recordPayment(x.session, x.submissionId)).out_outcome).toBe('accepted')
    const alerts: Record<string, unknown>[] = []
    const emails: unknown[] = []
    const f = fulfilmentDeps(x.sub, alerts as unknown[], emails, 2)

    expect((await runPaymentFulfillment(x.session, f.deps)).status).toBe('failed')
    let row = await ledger(x.session)
    expect(row).toMatchObject({ fulfillment_status: 'failed', pdf_status: 'pending', email_status: 'pending', stripe_payment_status: 'paid', amount_total: 2900 })
    expect(row.last_error).toContain('creator_record_v2_issuance_refused:governance_ineligible')
    expect(await artifacts.find(x.submissionId)).toBeNull()
    expect(emails).toEqual([])
    expect(alerts[0]).toMatchObject({ subject: 'Paid Creator Record could not be issued', session: x.session, submission: x.submissionId })

    // The retry pool runs it again (still refused), then the attempts run out (two here): the manual queue, with an alert.
    expect((await runPaymentFulfillment(x.session, f.deps)).status).toBe('failed')
    expect((await ledger(x.session)).attempts).toBe(2)
    const exhausted = await runPaymentFulfillment(x.session, f.deps)
    expect(exhausted.status).toBe('not_claimed')
    row = await ledger(x.session)
    expect(row.fulfillment_status).toBe('needs_reconciliation')
    expect(alerts.some((a) => a.subject === 'Fulfillment needs reconciliation')).toBe(true)

    // An operator restores what was withdrawn and retries (admin reconciliation, audited); the same paid row completes.
    const r = (await svc.query('SELECT public.reconcile_payment_fulfillment($1, $2, $3, $4) AS r', [x.session, 'retry_fulfillment', randomUUID(), 'support restored after review'])).rows[0].r
    expect(r).toBeTruthy()
    issuanceDepsRef.current = issuanceDeps([x.method])
    const done = await runPaymentFulfillment(x.session, fulfilmentDeps(x.sub, alerts as unknown[], emails, 6).deps)
    expect(done.status).toBe('completed')
    expect(await ledger(x.session)).toMatchObject({ fulfillment_status: 'completed', pdf_status: 'completed', email_status: 'accepted', stripe_payment_status: 'paid', amount_total: 2900 })
    expect((await artifacts.find(x.submissionId))?.status).toBe('issued')
    expect(emails).toHaveLength(1)
  }, 120_000)

  test('the stored reading altered after payment: refused as evidence_unavailable; nothing issued', async () => {
    const x = await purchased()
    // The owner-only database role can change it; nothing in the application can (append-only for the service role).
    await admin.query('ALTER TABLE public.creator_record_v2_live_examination_attempts DISABLE TRIGGER USER')
    try {
      await admin.query(`UPDATE public.creator_record_v2_live_examination_attempts SET envelope_sha256 = $2 WHERE id = $1`, [x.attemptId, 'f'.repeat(64)])
    } finally {
      await admin.query('ALTER TABLE public.creator_record_v2_live_examination_attempts ENABLE TRIGGER USER')
    }
    issuanceDepsRef.current = issuanceDeps([x.method])
    expect((await recordPayment(x.session, x.submissionId)).out_outcome).toBe('accepted')
    const alerts: unknown[] = []
    const out = await runPaymentFulfillment(x.session, fulfilmentDeps(x.sub, alerts, []).deps)
    expect(out.status).toBe('failed')
    expect((await ledger(x.session)).last_error).toContain('creator_record_v2_issuance_refused:evidence_unavailable')
    expect(await artifacts.find(x.submissionId)).toBeNull()
  }, 120_000)

  test('unsupported method or missing templates: refused before checkout, nothing bound', async () => {
    const c = await creatorWithLiveRecord()
    const before = (await admin.query('SELECT count(*)::int n FROM public.submissions WHERE user_id = $1', [c.owner])).rows[0].n
    expect(await startPurchase(purchaseDeps([]), c.owner, c.preparedId)).toEqual({ ok: false, status: 409, code: 'ineligible' })
    expect(await startPurchase({ ...purchaseDeps([c.method]), templates: (s) => approvedPdfTemplates({ ...SYN_AUTH!, pdf_template_sets: [] }, s) }, c.owner, c.preparedId)).toEqual({ ok: false, status: 503, code: 'unavailable' })
    expect((await admin.query('SELECT count(*)::int n FROM public.submissions WHERE user_id = $1', [c.owner])).rows[0].n).toBe(before)
    expect((await getPrepared(c.preparedId))?.submission_id).toBeNull()
  }, 120_000)
})
