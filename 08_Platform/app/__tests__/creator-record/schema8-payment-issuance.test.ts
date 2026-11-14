/**
 * CR-V2-MVP-M4A — schema 8 payment and issuance, end to end over the real enforcement boundaries: `startPurchase` and
 * `checkV2Checkout` (checkout), the payment fulfilment runner (what the Stripe webhook runs after recording the payment), the registered
 * v2 renderer, `issueCreatorRecordArtifact`, the real PDF renderer and authenticated delivery.
 *
 * The model reading is made by the REAL customer live entry point and executor with a fake model behind the executor's adapter seam
 * (no network, no provider, no key, no cost); both live-examination code locks are lifted for this file only (module mock), as in the M2A
 * suites. Stores are in memory; Stripe is not called: the fulfilment runner is driven exactly as the webhook drives it after the
 * payment is recorded. Commercial support for schema 8 and for the reading method is named explicitly here: a shipped build has none.
 */
import { execFileSync } from 'node:child_process'
import { createHash, randomUUID } from 'node:crypto'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

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
jest.mock('@/lib/payments/repository', () => ({ hasCreatorRecordPdf: jest.fn(), loadFulfillmentSubmission: jest.fn() }))

import { approvedGovernanceSnapshot, approvedPdfTemplates, CREATOR_RECORD_V2_SUBMISSIONS } from '@/lib/creator-record/customer-flow/approved-inputs'
import { verifyReferencedReadings, type ReferencedReadingPorts } from '@/lib/creator-record/customer-flow/examination'
import { checkV2Checkout, renderV2ForIssuance, startPurchase, V2IssuanceRefusal, type CheckoutSubmission, type PurchaseDeps, type V2IssuanceDeps } from '@/lib/creator-record/customer-flow/purchase'
import type { PreparedRow } from '@/lib/creator-record/customer-flow/service'
import { syntheticUatInputs } from '@/lib/creator-record/customer-flow/synthetic-uat'
import { buildCustomerDocument, documentModelCanonical, documentText, type CustomerDocumentInput } from '@/lib/creator-record/customer-pdf/document-model'
import { templateFingerprint, type PdfTemplateApproval } from '@/lib/creator-record/customer-pdf/templates'
import { evaluateIssuanceEligibility, examinationMethodOf, type ExaminationMethodIdentity, type IssuanceEligibility } from '@/lib/creator-record/customer-record/eligibility'
import { CURRENT_ISSUANCE_SUPPORT, governanceSnapshotFrom, type CurrentGovernance } from '@/lib/creator-record/customer-record/governance-state'
import { buildCustomerRecord, CUSTOMER_RECORD_EXAMINATION_SCHEMA_VERSION, CUSTOMER_RECORD_SCHEMA, CUSTOMER_RECORD_SCHEMA_VERSION } from '@/lib/creator-record/customer-record/record'
import { LIVE_EXTRACTION_MODEL } from '@/lib/creator-record/evidence/live-caller'
import { REPLAY_FIXTURES } from '@/lib/creator-record/evidence/replay-fixtures.data'
import { CREATOR_RECORD_GOVERNANCE_AUTHORITY as GOV } from '@/lib/creator-record/governed/sources'
import { CREATOR_RECORD_SYNTHETIC_TEST_AUTHORITY as SYN_AUTH, SYNTHETIC_TEST_EXAMINATION_PDF as EXAM_PDF } from '@/lib/creator-record/governed/synthetic-test-authority'
import { examineCustomerDocumentLive, type CustomerLivePorts } from '@/lib/creator-record/live-examination/customer'
import { parseLiveEnvelope } from '@/lib/creator-record/live-examination/envelope'
import type { CustomerLiveAttemptRow } from '@/lib/creator-record/live-examination/projection'
import type { LiveAnthropicAdapter } from '@/lib/creator-record/live-examination/real-executor'
import { sha256Hex } from '@/lib/creator-record/record-core/canonical'
import { CREATOR_RECORD_V2_ISSUANCE } from '@/lib/creator-record-artifacts/config'
import { deliverCreatorRecordPdf } from '@/lib/creator-record-artifacts/deliver'
import { issueCreatorRecordArtifact, type ArtifactRow, type IssueDeps } from '@/lib/creator-record-artifacts/issue'
import { CREATOR_RECORD_V2_FAMILY, CREATOR_RECORD_V2_GENERATOR_VERSION, CreatorRecordIssuanceStoppedError, rendererForFamily } from '@/lib/creator-record-artifacts/renderers'
import { runPaymentFulfillment, type FulfillmentDeps } from '@/lib/payments/run-payment-fulfillment'
import type { FulfillmentSubmission } from '@/lib/payments/repository'
import { TOPIC_CLAIMS_FIXTURE as CLAIMS } from '@/lib/retrieval-engine/topic-claims-fixture'
import { COMMERCIAL_SUPPORT_UNDER_TEST } from '@/test-support/commercial-support'
import { schema8Fixture } from '@/test-support/customer-record-schema8'
import { syntheticTextPdf } from '@/test-support/synthetic-pdf'

const NOW = new Date('2026-11-07T09:00:00.000Z')
const AS_OF = '2026-11-07'
const OWNER = '11111111-1111-4111-8111-111111111111'
const DOC_ID = '33333333-3333-4333-8333-333333333391'
const SUB_ID = '44444444-4444-4444-8444-444444444491'
const DRAFT_ID = '55555555-5555-4555-8555-555555555591'
const SYN = syntheticUatInputs()
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T
const SUB: CheckoutSubmission = { id: SUB_ID, user_id: OWNER, tier: 'creator_record', creator_record_product: 'v2' }
const FULFILLMENT_SUB: FulfillmentSubmission = { ...SUB, status: 'approved', title: 'Creator Record', filmmaker_name: 'Creator', tools_used: [], authorship_statement: '', likeness_confirmation: {}, ip_confirmation: {}, territory_preferences: null }

// ── One model reading of one of the creator's own documents, by the real customer entry point (fake model) ──

const BYTES = syntheticTextPdf('Synthetic receipt for the M4A pathway test')
const OUTPUT = REPLAY_FIXTURES.find((f) => f.fixture_id === 'pdf-pika-pro-no-period')!.parsed_output
const fakeAdapter: LiveAnthropicAdapter = {
  createAnthropicReceiptCaller: (o) => async () => ({ id: 'msg_live_1', model: o.model, stop_reason: 'end_turn', content: [{ type: 'text', text: '' }], usage: { input_tokens: 3000, output_tokens: 400 }, parsed_output: OUTPUT }) as never,
  classifyAnthropicFailure: () => 'server_error',
}

async function liveReading(): Promise<CustomerLiveAttemptRow> {
  const rows: CustomerLiveAttemptRow[] = []
  const reservation = randomUUID()
  const sha = createHash('sha256').update(BYTES).digest('hex')
  const ports: CustomerLivePorts = {
    getDocument: async (id) => (id === DOC_ID ? { id: DOC_ID, user_id: OWNER, sha256: sha, media_type: 'application/pdf', byte_size: BYTES.length, state: 'stored' } : null),
    logLiveRead: async () => 1,
    readObject: async () => BYTES,
    listLiveAttempts: async () => clone(rows),
    reserve: async () => reservation,
    async record(reservationId, text) {
      const e = parseLiveEnvelope(JSON.parse(text))!
      const id = randomUUID()
      rows.push({
        id, attempt_number: rows.length + 1, examination_key: e.examination_key, document_id: DOC_ID, user_id: OWNER, document_sha256: e.document.sha256,
        envelope_version: e.envelope.version, execution_origin: e.execution_origin, content_class: e.content_class, profile_id: e.profile.id, profile_version: e.profile.version,
        schema_version: e.profile.schema, prompt_version: e.profile.prompt, executor_mode: e.executor.mode, provider: e.executor.provider, model: e.executor.model,
        outcome_status: e.outcome.status, outcome_reason: e.outcome.reason, executed_at: e.executed_at, envelope_canonical: text, envelope_sha256: sha256Hex(text),
        access_log_id: 1, created_at: NOW.toISOString(), reservation_id: reservationId,
      })
      return { attempt_id: id, result: 'created' }
    },
    settle: async (_r, charged) => charged,
  }
  const r = await examineCustomerDocumentLive({ ports, isKnownSyntheticFixture: () => false, now: () => NOW, executorOptions: { env: { CREATOR_RECORD_EXTRACTION_API_KEY: 'test-key-not-real' }, loadAdapter: async () => fakeAdapter } }, OWNER, DOC_ID)
  if (r.result.kind !== 'examined' || rows.length !== 1) throw new Error(`fixture: no reading (${JSON.stringify(r.result)})`)
  return rows[0]
}

/** A reviewed, latest schema 8 version holding that reading, as a stored row. */
async function schema8Row(attempt: CustomerLiveAttemptRow, over: Partial<PreparedRow> = {}, version = 1): Promise<PreparedRow> {
  const { examinationProjectionFor } = await import('@/lib/creator-record/customer-flow/examination')
  const p = await examinationProjectionFor({ listRuns: async () => [] }, OWNER, DOC_ID, undefined, { listAttempts: async () => [clone(attempt)] })
  if (p.kind !== 'projection') throw new Error(`fixture: ${JSON.stringify(p)}`)
  const id = over.id ?? `66666666-6666-4666-8666-${String(version).padStart(12, '0')}`
  const built = buildCustomerRecord({
    state: { answers: { P1: ['M4A pathway video'], P3: ['own_channels'], F1: ['TW'], F2: ['online_worldwide'], L1: ['no'], M0: ['none'], H1: ['edited'] }, tools: [{ T1: ['pika'], T3: ['Standard'] }], acknowledgements: { A1: true, A2: true } },
    sources: SYN.sources, source_text: SYN.source_text_examination!, topicClaims: CLAIMS, as_of: AS_OF,
    record: { record_id: `PREP-${id}`, record_version: version, captured_at: NOW.toISOString() },
    documents: [{ document_id: DOC_ID, sha256: attempt.document_sha256, media_type: 'application/pdf', byte_size: BYTES.length, file_name: 'receipt.pdf', category: 'billing_receipt', tool_index: 0 }],
    examinations: [{ document_id: DOC_ID, projection: p.projection }],
  })
  if (!built.ok) throw new Error(`fixture: ${JSON.stringify(built).slice(0, 300)}`)
  return {
    id, user_id: OWNER, draft_id: DRAFT_ID, version, record_ref: `PREP-${id}`, record_schema: CUSTOMER_RECORD_SCHEMA, record_schema_version: built.record.schema_version,
    canonical: built.canonical, sha256: built.sha256, form_state: {}, status: 'reviewed', created_at: NOW.toISOString(), reviewed_at: NOW.toISOString(), submission_id: null, ...over,
  } as PreparedRow
}

// ── Governance, templates and the reading re-check, each explicit ──

let ATTEMPT: CustomerLiveAttemptRow
let ROW: PreparedRow
let BOUND: PreparedRow
let METHOD: ExaminationMethodIdentity
const issued: { input: CustomerDocumentInput | null } = { input: null }
beforeAll(async () => {
  ATTEMPT = await liveReading()
  ROW = await schema8Row(ATTEMPT)
  BOUND = { ...ROW, submission_id: SUB_ID }
  METHOD = examinationMethodOf(JSON.parse(ROW.canonical).documents.items[0].examination)
})

const support = (methods: readonly ExaminationMethodIdentity[] = [METHOD]) => ({ ...COMMERCIAL_SUPPORT_UNDER_TEST, examination_methods: methods })
const state = (over: Partial<CurrentGovernance> = {}) => governanceSnapshotFrom({ issuance_date: AS_OF, sources: SYN.sources, topicClaims: CLAIMS, source_text_approvals: [SYN.source_text_examination!.approval!], support: support(), authority_class: 'synthetic_test', ...over })
type Governance = () => ReturnType<typeof state>
/** The current governance state, whatever issuance date the caller asks for (the fixture's sources do not change by date). */
const current: Governance = () => state()
const SYN_TEMPLATES = (schema: { id: string; version: number }) => approvedPdfTemplates(SYN_AUTH, schema)
/** The stored attempts the re-check reads (in memory). */
const store = { attempts: [] as CustomerLiveAttemptRow[] }
const readingPorts = (): ReferencedReadingPorts => ({ listRuns: async () => [], listLiveAttempts: async (o, d) => clone(store.attempts.filter((a) => a.user_id === o && a.document_id === d)) })
const intact = (ports: ReferencedReadingPorts = readingPorts()) => (owner: string, refs: Parameters<typeof verifyReferencedReadings>[2]) => verifyReferencedReadings(ports, owner, refs)
beforeEach(() => { store.attempts = [clone(ATTEMPT)] })

function purchaseDeps(o: { governance?: Governance; rows?: PreparedRow[]; over?: Partial<PurchaseDeps> } = {}) {
  const rows = o.rows ?? [ROW]
  const bind = jest.fn(async () => ({ submissionId: SUB_ID, reason: 'created' as const }))
  const deps: PurchaseDeps = {
    submissions: 'open', issuance: 'enabled', hasPilotAccess: async () => true, legalPoliciesApproved: () => true,
    getPrepared: async (id) => clone(rows.find((r) => r.id === id) ?? null),
    latestVersion: async (d) => clone([...rows].filter((r) => r.draft_id === d).sort((a, b) => b.version - a.version)[0] ?? null),
    boundTo: async () => clone({ ...rows[0], submission_id: SUB_ID }),
    bind, governance: o.governance ?? current, now: () => NOW,
    evidenceIntact: async () => ({ ok: true }), examinationsIntact: intact(), templates: SYN_TEMPLATES,
    ...o.over,
  }
  return { deps, bind }
}
function issuanceDeps(o: { governance?: Governance; rows?: PreparedRow[]; over?: Partial<V2IssuanceDeps> } = {}) {
  const rows = o.rows ?? [BOUND]
  const rendered: unknown[] = []
  const deps: V2IssuanceDeps = {
    boundTo: async () => clone(rows[0]),
    latestVersion: async (d) => clone([...rows].filter((r) => r.draft_id === d).sort((a, b) => b.version - a.version)[0] ?? null),
    governance: o.governance ?? current, templates: SYN_TEMPLATES,
    // The exact document model the PDF is drawn from (react-pdf does not load under Jest; the real PDF is rendered by tsx, test 1).
    renderPdf: async (input) => { rendered.push(input); return new TextEncoder().encode(documentModelCanonical(buildCustomerDocument(input))) },
    evidenceIntact: async () => ({ ok: true }), examinationsIntact: intact(),
    ...o.over,
  }
  return { deps, rendered }
}
const refusal = (p: Promise<unknown>) => p.then(() => 'issued', (e) => (e instanceof V2IssuanceRefusal ? e.code : `other:${String(e)}`))
const reasons = (e: IssuanceEligibility) => (e.decision === 'ineligible' ? e.reasons.map((r) => `${r.kind}:${r.code}`) : [e.decision])

/** The real runner over an in-memory payment ledger row, the real artifact path and the real v2 renderer. */
function fulfilment(issuance: V2IssuanceDeps) {
  issuanceDepsRef.current = issuance
  const artifacts = new Map<string, ArtifactRow>()
  const objects = new Map<string, Uint8Array>()
  const ledger = { payment_status: 'paid', amount_paid: 2900, pdf: 'pending', email: 'pending', status: 'in_progress', error: null as string | null }
  const emails = jest.fn(async () => ({ status: 'accepted' as const, providerId: 'p' }))
  const alert = jest.fn(async () => undefined)
  const renderer = rendererForFamily(CREATOR_RECORD_V2_FAMILY, 'enabled')
  let n = 0
  const issueDeps: IssueDeps = {
    artifacts: {
      find: async (sid) => clone(Array.from(artifacts.values()).find((r) => r.submission_id === sid) ?? null),
      insertPending: async (row) => {
        if (Array.from(artifacts.values()).some((r) => r.submission_id === row.submission_id)) return { result: 'conflict' }
        const full: ArtifactRow = { ...row, id: `art-${artifacts.size + 1}`, status: 'pending', issued_at: null }
        artifacts.set(full.id, full)
        return { result: 'inserted', row: clone(full) }
      },
      takeOver: async () => false,
      markIssued: async (id, attempt, sha) => { const r = artifacts.get(id)!; if (r.status !== 'pending' || r.attempt_id !== attempt || r.sha256 !== sha) return false; r.status = 'issued'; r.issued_at = NOW.toISOString(); return true },
    },
    objects: { get: async (p) => objects.get(p) ?? null, put: async (p, b) => { if (objects.has(p)) return 'exists'; objects.set(p, b); return 'stored' } },
    renderer: { family: renderer.family, generator_version: renderer.generator_version, ownsGeneratorVersion: (v) => renderer.ownsGeneratorVersion(v), render: (rid) => renderer.render(FULFILLMENT_SUB, rid, NOW), authorize: () => renderer.authorize!(FULFILLMENT_SUB, NOW) },
    newAttemptId: () => `attempt-${++n}`, now: () => NOW, uat: false,
  }
  const deps: FulfillmentDeps = {
    // The ledger's own claim rule, in memory: a completed row is never claimed again.
    claim: async () => (ledger.status === 'completed'
      ? { claimed: false, claimToken: null, reason: 'nothing_to_do', submissionId: SUB_ID, tier: 'creator_record', pdfStatus: ledger.pdf, emailStatus: ledger.email }
      : { claimed: true, claimToken: 't', reason: 'claimed', submissionId: SUB_ID, tier: 'creator_record', pdfStatus: ledger.pdf, emailStatus: ledger.email }),
    markStep: async (_s, _t, step, status) => { if (step === 'pdf') ledger.pdf = status; else ledger.email = status; return true },
    finish: async (_s, _t, err) => { ledger.error = err; ledger.status = ledger.pdf === 'completed' && ledger.email === 'accepted' ? 'completed' : 'failed'; return ledger.status },
    loadSubmission: async () => FULFILLMENT_SUB,
    hasCreatorRecordPdf: async () => Array.from(artifacts.values()).some((a) => a.status === 'issued'),
    generateCreatorRecordPdf: async () => { await issueCreatorRecordArtifact(SUB_ID, issueDeps) },
    loadUserContact: async () => ({ name: 'Creator', email: 'creator@example.test' }),
    sendCreatorRecordEmail: jest.fn(), sendCreatorRecordV2Email: emails, sendCertifiedReceivedEmail: jest.fn(), notifyAdmin: async () => undefined, alert, siteUrl: 'https://example.test',
  }
  /** The authenticated delivery route's logic, over the same stores, as the owner. */
  const deliver = (as = OWNER) => deliverCreatorRecordPdf(SUB_ID, {
    currentUserId: async () => as, submissionOwner: async () => OWNER, isAdmin: async () => false,
    findArtifact: async (sid) => clone(Array.from(artifacts.values()).find((r) => r.submission_id === sid) ?? null),
    getObject: async (p) => objects.get(p) ?? null, legacyReferences: async () => [], getLegacyObject: async () => null, log: () => undefined,
  })
  return { deps, ledger, artifacts, objects, emails, alert, issueDeps, deliver }
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────

describe('1. eligible schema 8 record with a model reading → checkout → payment → PDF issuance → delivery', () => {
  test('the fixture is what it claims: one reserved live_model reading, in a schema 8 record, method named from the record', () => {
    expect(ATTEMPT).toMatchObject({ execution_origin: 'live_model', provider: 'anthropic', model: LIVE_EXTRACTION_MODEL, outcome_status: 'examined' })
    expect(ROW.record_schema_version).toBe(CUSTOMER_RECORD_EXAMINATION_SCHEMA_VERSION)
    expect(METHOD).toEqual({ origin: 'live_model', provider: 'anthropic', model: LIVE_EXTRACTION_MODEL, profile: { id: ATTEMPT.profile_id, version: ATTEMPT.profile_version, schema: ATTEMPT.schema_version, prompt: ATTEMPT.prompt_version } })
    expect(evaluateIssuanceEligibility(ROW.canonical, ROW.sha256, state()).decision).toBe('eligible')
  })

  test('the whole pathway, with every check run and nothing determined', async () => {
    const seen: unknown[] = []
    const p = purchaseDeps({ over: { examinationsIntact: async (o, refs) => { seen.push(refs); return intact()(o, refs) } } })
    expect(await startPurchase(p.deps, OWNER, ROW.id)).toEqual({ ok: true, submission_id: SUB_ID })
    expect(await checkV2Checkout(p.deps, OWNER, SUB)).toEqual({ ok: true, sha256: ROW.sha256, record_ref: ROW.record_ref })
    // The reading was re-checked by its own kind and profile, against the stored attempt.
    expect(seen[0]).toEqual([{ run_id: ATTEMPT.id, document_id: DOC_ID, envelope_sha256: ATTEMPT.envelope_sha256, kind: 'live', profile_id: 'receipt' }])

    // Payment accepted (recorded by the webhook before fulfilment runs): the runner issues the PDF, then tells the customer.
    const i = issuanceDeps()
    const f = fulfilment(i.deps)
    expect((await runPaymentFulfillment('cs_test_m4a', f.deps)).status).toBe('completed')
    expect(f.ledger).toMatchObject({ payment_status: 'paid', pdf: 'completed', email: 'accepted', status: 'completed' })
    const [artifact] = Array.from(f.artifacts.values())
    expect(artifact).toMatchObject({ status: 'issued', generator_version: CREATOR_RECORD_V2_GENERATOR_VERSION, record_id: 'CR-2026-44444444' })
    expect(i.rendered).toHaveLength(1)
    // Rendered with the schema 8 template set the bundle approved for schema 8, exactly from the bound version.
    expect(i.rendered[0]).toMatchObject({ canonical: BOUND.canonical, sha256: BOUND.sha256, template_approval: EXAM_PDF.approval })
    expect(f.emails).toHaveBeenCalledTimes(1)
    expect(f.alert).not.toHaveBeenCalled()

    // Delivery: the owner receives exactly the stored bytes (a real PDF); anyone else is refused.
    const res = await f.deliver()
    expect(res.status).toBe(200)
    const bytes = new Uint8Array(await res.arrayBuffer())
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(artifact.sha256)
    expect((await f.deliver('99999999-9999-4999-8999-999999999999')).status).toBe(404)
    // What was issued: the model reading printed as a reading, apart from the declarations, with no determination.
    const model = JSON.parse(new TextDecoder().decode(bytes))
    expect(model.identity).toMatchObject({ record_id: 'CR-2026-44444444', snapshot_sha256: BOUND.sha256 })
    const text = documentText(buildCustomerDocument(i.rendered[0] as CustomerDocumentInput)).join(' | ')
    expect(text).toContain(EXAM_PDF.templates.live_examination.method)
    expect(text).toContain(LIVE_EXTRACTION_MODEL)
    expect(text).not.toMatch(/appears[ _]consistent|appears[ _]to[ _]conflict|determination[ _]withheld|cleared|compliant|certified/i)
    issued.input = i.rendered[0] as CustomerDocumentInput
  }, 60_000)

  test('the same issuance input renders as a real PDF with the real renderer (tsx: react-pdf does not load under Jest)', () => {
    expect(issued.input).not.toBeNull()
    const dir = mkdtempSync(join(tmpdir(), 'si8-m4a-'))
    try {
      const file = join(dir, 'input.json')
      writeFileSync(file, JSON.stringify(issued.input))
      const out = JSON.parse(execFileSync(process.execPath, [join(process.cwd(), 'node_modules', 'tsx', 'dist', 'cli.mjs'), '--tsconfig', 'tsconfig.json', join('test-support', 'customer-pdf-render-input.tsx'), file], { cwd: process.cwd(), encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }))
      expect(out).toMatchObject({ ok: true, header: '%PDF-' })
      expect(out.byte_size).toBeGreaterThan(1000)
      expect(out.pages).toBeGreaterThanOrEqual(1)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  }, 120_000)
})

describe('2. a stale record is refused before checkout', () => {
  test('a later version exists: refused at both checkout steps, never bound, nothing sold', async () => {
    const later = await schema8Row(ATTEMPT, { status: 'prepared', reviewed_at: null }, 2)
    const p = purchaseDeps({ rows: [ROW, later] })
    expect(await startPurchase(p.deps, OWNER, ROW.id)).toEqual({ ok: false, status: 409, code: 'superseded' })
    expect(await checkV2Checkout(p.deps, OWNER, SUB)).toEqual({ ok: false, status: 409, code: 'superseded' })
    expect(p.bind).not.toHaveBeenCalled()
  })

  test('an unreviewed version is refused', async () => {
    const p = purchaseDeps({ rows: [{ ...ROW, status: 'prepared', reviewed_at: null }] })
    expect(await startPurchase(p.deps, OWNER, ROW.id)).toEqual({ ok: false, status: 409, code: 'not_reviewed' })
    expect(p.bind).not.toHaveBeenCalled()
  })
})

describe('3. examination or approval withdrawn after payment → issuance refusal and a recoverable reconciliation state', () => {
  test.each([
    ['the reading method is no longer supported', () => issuanceDeps({ governance: () => state({ support: support([]) }) }).deps, 'governance_ineligible'],
    ['schema 8 is no longer supported', () => issuanceDeps({ governance: () => state({ support: { ...support(), record_schemas: COMMERCIAL_SUPPORT_UNDER_TEST.record_schemas.filter((s) => s.version !== 8) } }) }).deps, 'governance_ineligible'],
    ['the wording approval is withdrawn', () => issuanceDeps({ governance: () => state({ source_text_approvals: [{ ...SYN.source_text_examination!.approval!, lifecycle: 'withdrawn' }] }) }).deps, 'governance_ineligible'],
    ['the schema 8 template approval is withdrawn', () => issuanceDeps({ over: { templates: () => ({ templates: EXAM_PDF.templates, approval: { ...EXAM_PDF.approval, lifecycle: 'withdrawn' } }) } }).deps, 'templates_unavailable'],
    ['the stored reading is gone', () => issuanceDeps({ over: { examinationsIntact: intact({ listRuns: async () => [], listLiveAttempts: async () => [] }) } }).deps, 'evidence_unavailable'],
  ])('%s: no artifact, no ready email, payment recorded, step visibly incomplete, operator alerted', async (_n, deps, code) => {
    const f = fulfilment(deps())
    const out = await runPaymentFulfillment('cs_test_m4a', f.deps)
    expect(out.status).toBe('failed')
    expect(f.artifacts.size).toBe(0)
    expect(f.objects.size).toBe(0)
    expect(f.emails).not.toHaveBeenCalled()
    expect(f.ledger).toMatchObject({ payment_status: 'paid', amount_paid: 2900, pdf: 'pending', email: 'pending', status: 'failed' })
    expect(f.ledger.error).toContain(`creator_record_v2_issuance_refused:${code}`)
    expect(f.alert).toHaveBeenCalledWith('Paid Creator Record could not be issued', expect.objectContaining({ session: 'cs_test_m4a', submission: SUB_ID, reason: expect.stringContaining(code) }))
  })

  test('recoverable: once the cause is resolved, the same paid row is retried and completes; no second charge, one artifact', async () => {
    const refusing = issuanceDeps({ governance: () => state({ support: support([]) }) })
    const f = fulfilment(refusing.deps)
    expect((await runPaymentFulfillment('cs_test_m4a', f.deps)).status).toBe('failed')
    // An operator retry (or the sweep) after support is restored: the ledger row is claimed again, nothing else changes.
    issuanceDepsRef.current = issuanceDeps().deps
    expect((await runPaymentFulfillment('cs_test_m4a', f.deps)).status).toBe('completed')
    expect(f.ledger).toMatchObject({ payment_status: 'paid', amount_paid: 2900, pdf: 'completed', email: 'accepted' })
    expect(f.artifacts.size).toBe(1)
    expect(f.emails).toHaveBeenCalledTimes(1)
  }, 60_000)

  test('a pending artifact rendered before the withdrawal is not marked issued afterwards', async () => {
    const f = fulfilment(issuanceDeps().deps)
    await issueCreatorRecordArtifact(SUB_ID, { ...f.issueDeps, artifacts: { ...f.issueDeps.artifacts, markIssued: async () => false } }).catch(() => undefined)
    const [pending] = Array.from(f.artifacts.values())
    expect(pending.status).toBe('pending')
    issuanceDepsRef.current = issuanceDeps({ governance: () => state({ support: support([]) }) }).deps
    expect(await refusal(issueCreatorRecordArtifact(SUB_ID, f.issueDeps))).toBe('governance_ineligible')
    expect(f.artifacts.get(pending.id)).toMatchObject({ status: 'pending', issued_at: null })
  }, 60_000)

  test('payment never implies examination or clearance: the issued record still says not_verified, and nothing is refunded here', async () => {
    const rec = JSON.parse(BOUND.canonical)
    expect(rec.documents.items[0].examination).toMatchObject({ verification: 'not_verified', run_integrity: 'persisted_attempt_rechecked' })
    for (const c of rec.comparison.items) expect([c.provider, c.plan]).toEqual([{ result: 'not_assessed', reason: 'determination_withheld' }, { result: 'not_assessed', reason: 'determination_withheld' }])
    const src = readFileSync(join(process.cwd(), 'lib', 'payments', 'run-payment-fulfillment.ts'), 'utf8') + readFileSync(join(process.cwd(), 'lib', 'creator-record', 'customer-flow', 'purchase.ts'), 'utf8')
    expect(src).not.toMatch(/refunds?\.create|\.refunds\b|from ['"]stripe['"]|new Stripe\(/i)
  })
})

describe('4. missing or invalid live-reading provenance → refusal', () => {
  test('a method not on the support list is refused at checkout and at issuance, by that rule', async () => {
    const g = () => state({ support: support([{ ...METHOD, model: 'claude-other-model' }]) })
    expect(reasons(evaluateIssuanceEligibility(ROW.canonical, ROW.sha256, g()))).toEqual(['examination_method:examination_method_not_supported'])
    const p = purchaseDeps({ governance: g })
    expect(await startPurchase(p.deps, OWNER, ROW.id)).toEqual({ ok: false, status: 409, code: 'ineligible' })
    expect(p.bind).not.toHaveBeenCalled()
    expect(await refusal(renderV2ForIssuance(issuanceDeps({ governance: g }).deps, SUB, 'CR-2026-44444444', NOW))).toBe('governance_ineligible')
  })

  test.each([
    ['a different prompt version', { profile: { ...({} as ExaminationMethodIdentity['profile']), prompt: 'other' } }],
    ['a different profile version', { profile: { version: 99 } }],
  ])('%s is a different method', (_n, change) => {
    const m = { ...METHOD, profile: { ...METHOD.profile, ...(change.profile as object) } } as ExaminationMethodIdentity
    expect(reasons(evaluateIssuanceEligibility(ROW.canonical, ROW.sha256, state({ support: support([m]) })))).toEqual(['examination_method:examination_method_not_supported'])
  })

  test.each([
    ['the stored attempt is missing', [], 'run_missing'],
    ['its envelope digest differs from the record', () => [{ ...ATTEMPT, envelope_sha256: 'a'.repeat(64) }], 'run_mismatch'],
    ['its stored envelope was altered', () => [{ ...ATTEMPT, envelope_canonical: ATTEMPT.envelope_canonical.replace('"examined"', '"examined" ') }], 'run_integrity'],
    ['it belongs to another creator', () => [{ ...ATTEMPT, user_id: '22222222-2222-4222-8222-222222222222' }], 'run_integrity'],
    ['it lost its reservation', () => [{ ...ATTEMPT, reservation_id: null }], 'run_integrity'],
  ] as const)('%s: refused at checkout and at issuance', async (_n, attempts, reason) => {
    store.attempts = typeof attempts === 'function' ? attempts() : []
    const refs = [{ run_id: ATTEMPT.id, document_id: DOC_ID, envelope_sha256: ATTEMPT.envelope_sha256, kind: 'live' as const, profile_id: 'receipt' }]
    // 'another creator' rows are not listed for this owner, so the lookup finds none.
    expect((await verifyReferencedReadings(readingPorts(), OWNER, refs))).toEqual({ ok: false, reason: _n === 'it belongs to another creator' ? 'run_missing' : reason })
    const p = purchaseDeps()
    expect(await startPurchase(p.deps, OWNER, ROW.id)).toEqual({ ok: false, status: 409, code: 'evidence_unavailable' })
    expect(p.bind).not.toHaveBeenCalled()
    expect(await refusal(renderV2ForIssuance(issuanceDeps().deps, SUB, 'CR-2026-44444444', NOW))).toBe('evidence_unavailable')
  })

  test('with no model-reading lookup (the live locks off: this build) a model reading cannot be re-checked: refused', async () => {
    const refs = [{ run_id: ATTEMPT.id, document_id: DOC_ID, envelope_sha256: ATTEMPT.envelope_sha256, kind: 'live' as const, profile_id: 'receipt' }]
    expect(await verifyReferencedReadings({ listRuns: async () => [] }, OWNER, refs)).toEqual({ ok: false, reason: 'unavailable' })
    const p = purchaseDeps({ over: { examinationsIntact: intact({ listRuns: async () => [] }) } })
    expect(await startPurchase(p.deps, OWNER, ROW.id)).toEqual({ ok: false, status: 409, code: 'evidence_unavailable' })
    const lookupDown = intact({ listRuns: async () => [], listLiveAttempts: async () => { throw new Error('down') } })
    expect(await refusal(renderV2ForIssuance(issuanceDeps({ over: { examinationsIntact: lookupDown } }).deps, SUB, 'CR-2026-44444444', NOW))).toBe('evidence_unavailable')
  })

  test('without the run-check port at all, a record holding a reading is neither sold nor issued', async () => {
    const p = purchaseDeps({ over: { examinationsIntact: undefined } })
    expect(await startPurchase(p.deps, OWNER, ROW.id)).toEqual({ ok: false, status: 409, code: 'evidence_unavailable' })
    expect(await refusal(renderV2ForIssuance(issuanceDeps({ over: { examinationsIntact: undefined } }).deps, SUB, 'CR-2026-44444444', NOW))).toBe('evidence_unavailable')
  })

  test('a recorded-replay reading (a known synthetic test document) is never commercially eligible outside the synthetic test class', async () => {
    const fx = await schema8Fixture()
    const g = state({ authority_class: 'governance', support: support([]) })
    expect(reasons(evaluateIssuanceEligibility(fx.canonical, fx.sha256, g))).toEqual(expect.arrayContaining(['examination_method:synthetic_examination']))
  })
})

describe('5. unsupported templates → refusal', () => {
  const withTemplates = (t: (s: { id: string; version: number }) => { templates: unknown; approval: PdfTemplateApproval | null }) => ({
    purchase: purchaseDeps({ over: { templates: t } }), issuance: issuanceDeps({ over: { templates: t } }),
  })
  const noLive = (() => { const t = clone(EXAM_PDF.templates) as Record<string, unknown>; delete t.live_examination; return t })()
  test.each([
    ['no approved set for schema 8 (only the schema 7 set is approved)', (s: { id: string; version: number }) => approvedPdfTemplates({ ...SYN_AUTH!, pdf_template_sets: [] }, s)],
    ['the schema 7 set offered for a schema 8 record', () => approvedPdfTemplates(SYN_AUTH)],
    ['a withdrawn approval', () => ({ templates: EXAM_PDF.templates, approval: { ...EXAM_PDF.approval, lifecycle: 'withdrawn' as const } })],
    ['a superseded approval', () => ({ templates: EXAM_PDF.templates, approval: { ...EXAM_PDF.approval, lifecycle: 'superseded' as const } })],
    ['a pending approval', () => ({ templates: EXAM_PDF.templates, approval: { ...EXAM_PDF.approval, lifecycle: 'pending' as const } })],
    ['templates changed under the approval', () => ({ templates: { ...EXAM_PDF.templates, stamp: 'TEST changed' }, approval: EXAM_PDF.approval })],
    ['templates without the model-reading wording', () => ({ templates: noLive, approval: { ...EXAM_PDF.approval, fingerprint: templateFingerprint(noLive) } })],
    ['a pilot-marked approval', () => ({ templates: EXAM_PDF.templates, approval: { ...EXAM_PDF.approval, authority: 'PILOT UAT, not a governance approval' } })],
    ['two sets approved for schema 8', (s: { id: string; version: number }) => approvedPdfTemplates({ ...SYN_AUTH!, pdf_template_sets: [EXAM_PDF, EXAM_PDF] }, s)],
  ])('%s: refused before checkout (nothing bound) and at issuance (nothing rendered)', async (_n, t) => {
    const x = withTemplates(t as never)
    expect(await startPurchase(x.purchase.deps, OWNER, ROW.id)).toEqual({ ok: false, status: 503, code: 'unavailable' })
    expect(x.purchase.bind).not.toHaveBeenCalled()
    expect(await refusal(renderV2ForIssuance(x.issuance.deps, SUB, 'CR-2026-44444444', NOW))).toBe('templates_unavailable')
    expect(x.issuance.rendered).toHaveLength(0)
  })

  test('selection is by the schema the approval names: schema 7 gets the schema 7 set, schema 8 the schema 8 set, and the default is unchanged', () => {
    expect(approvedPdfTemplates(SYN_AUTH, { id: CUSTOMER_RECORD_SCHEMA, version: CUSTOMER_RECORD_SCHEMA_VERSION })).toEqual({ templates: SYN_AUTH!.pdf_templates, approval: SYN_AUTH!.pdf_template_approval })
    expect(approvedPdfTemplates(SYN_AUTH, { id: CUSTOMER_RECORD_SCHEMA, version: 8 })).toEqual({ templates: EXAM_PDF.templates, approval: EXAM_PDF.approval })
    expect(approvedPdfTemplates(SYN_AUTH)).toEqual({ templates: SYN_AUTH!.pdf_templates, approval: SYN_AUTH!.pdf_template_approval })
    expect(approvedPdfTemplates(SYN_AUTH, { id: CUSTOMER_RECORD_SCHEMA, version: 6 })).toEqual({ templates: null, approval: null })
    expect(approvedPdfTemplates(SYN_AUTH, { id: 'si8/other', version: 8 })).toEqual({ templates: null, approval: null })
    expect(approvedPdfTemplates(GOV, { id: CUSTOMER_RECORD_SCHEMA, version: 8 }).approval?.review_ref).toBe('JD-CR-V2-MVP-INTEGRATION-4-20261110')
    expect(approvedPdfTemplates(null, { id: CUSTOMER_RECORD_SCHEMA, version: 8 })).toEqual({ templates: null, approval: null })
  })
})

describe('6. a duplicate webhook does not issue twice', () => {
  test('the same paid session delivered again: one artifact, one render, one email', async () => {
    const i = issuanceDeps()
    const f = fulfilment(i.deps)
    expect((await runPaymentFulfillment('cs_test_m4a', f.deps)).status).toBe('completed')
    const again = await runPaymentFulfillment('cs_test_m4a', f.deps)
    expect(again).toMatchObject({ status: 'not_claimed', reason: 'nothing_to_do' })
    // Even if the fulfilment step were run again directly, the issued artifact is returned untouched.
    expect(await issueCreatorRecordArtifact(SUB_ID, f.issueDeps)).toMatchObject({ outcome: 'already_issued' })
    expect(f.artifacts.size).toBe(1)
    expect(i.rendered).toHaveLength(1)
    expect(f.emails).toHaveBeenCalledTimes(1)
  }, 60_000)

  test('a retry while the first attempt still holds the row cannot insert a second artifact', async () => {
    const f = fulfilment(issuanceDeps().deps)
    await issueCreatorRecordArtifact(SUB_ID, f.issueDeps)
    expect(await f.issueDeps.artifacts.insertPending({ submission_id: SUB_ID, record_id: 'x', attempt_id: 'y', storage_path: 'z', sha256: 'a'.repeat(64), byte_size: 1, generator_version: CREATOR_RECORD_V2_GENERATOR_VERSION, uat: false })).toEqual({ result: 'conflict' })
  }, 60_000)
})

describe('7. historical schema 7 behaviour is unchanged', () => {
  async function schema7(): Promise<PreparedRow> {
    const built = buildCustomerRecord({
      state: { answers: { P1: ['Schema 7 video'], P3: ['own_channels'], F1: ['TW'], F2: ['online_worldwide'], L1: ['no'], M0: ['none'], H1: ['edited'] }, tools: [{ T1: ['pika'], T3: ['Standard'] }], acknowledgements: { A1: true, A2: true } },
      sources: SYN.sources, source_text: SYN.source_text!, topicClaims: CLAIMS, as_of: AS_OF, record: { record_id: `PREP-${ROW.id}`, record_version: 1, captured_at: NOW.toISOString() },
    })
    if (!built.ok) throw new Error('fixture')
    return { ...ROW, record_schema_version: built.record.schema_version, canonical: built.canonical, sha256: built.sha256 }
  }
  const g7 = () => state({ source_text_approvals: [SYN.source_text!.approval!], support: { ...COMMERCIAL_SUPPORT_UNDER_TEST } })

  test('a schema 7 record is sold and issued with the schema 7 set, without the reading check and with no method support', async () => {
    const row = await schema7()
    expect(row.record_schema_version).toBe(CUSTOMER_RECORD_SCHEMA_VERSION)
    const spy = jest.fn(async () => ({ ok: true as const }))
    const p = purchaseDeps({ rows: [row], governance: g7, over: { examinationsIntact: spy } })
    expect(await startPurchase(p.deps, OWNER, row.id)).toEqual({ ok: true, submission_id: SUB_ID })
    const i = issuanceDeps({ rows: [{ ...row, submission_id: SUB_ID }], governance: g7, over: { examinationsIntact: spy } })
    expect(await refusal(renderV2ForIssuance(i.deps, SUB, 'CR-2026-44444444', NOW))).toBe('issued')
    expect(i.rendered[0]).toMatchObject({ template_approval: SYN_AUTH!.pdf_template_approval })
    expect(spy).not.toHaveBeenCalled()
  }, 60_000)

  test('a schema 7 record is still refused by every earlier rule, and the schema 8 set cannot render it', async () => {
    const row = await schema7()
    expect(reasons(evaluateIssuanceEligibility(row.canonical, row.sha256, state({ source_text_approvals: [SYN.source_text!.approval!], support: { record_schemas: [], builders: [] } })))).toEqual(['builder:reference_missing', 'record_schema:reference_missing'])
    const wrong = purchaseDeps({ rows: [row], governance: g7, over: { templates: () => EXAM_PDF } })
    expect(await startPurchase(wrong.deps, OWNER, row.id)).toEqual({ ok: false, status: 503, code: 'unavailable' })
  })
})

describe('8. every commercial gate stays closed by default', () => {
  test('the support list is the approved R15 list, both stops are stopped, Production has the approved templates, and both live locks are false in source', () => {
    expect(CURRENT_ISSUANCE_SUPPORT).toEqual({ record_schemas: [{ id: 'si8/creator-record-v2-record', version: 7 }, { id: 'si8/creator-record-v2-record', version: 8 }], builders: [{ id: 'si8/creator-record-v2-record-builder', version: 5 }, { id: 'si8/creator-record-v2-record-builder', version: 7 }], examination_methods: [{ origin: 'live_model', provider: 'anthropic', model: 'claude-sonnet-5', profile: { id: 'receipt', version: 1, schema: 'receipt-extraction-v2', prompt: 'receipt-prompt-v2' } }] }) // R15 option (a), JD-CR-V2-MVP-APPROVAL-PACKET-1-20261110
    expect(CREATOR_RECORD_V2_ISSUANCE).toBe('enabled') // CR-V2-MVP-PROD-UAT-ACTIVATION-1
    expect(CREATOR_RECORD_V2_SUBMISSIONS).toBe('stopped')
    expect(approvedPdfTemplates(GOV, { id: CUSTOMER_RECORD_SCHEMA, version: 8 }).approval?.fingerprint).toBe('287de01d8dc365e4e7c62ab0ea25fdce0b824b26e31367560b85b2f9e779c1b5')
    expect(GOV.pdf_template_sets).toHaveLength(1)
    // The controls module is mocked in this file; the shipped source is read directly.
    const controls = readFileSync(join(process.cwd(), 'lib', 'creator-record', 'live-examination', 'controls.ts'), 'utf8')
    expect(controls).toMatch(/export const LIVE_EXAMINATION_PERMITTED_IN_THIS_BUILD(: boolean)? = true/)
    expect(controls).toMatch(/export const CUSTOMER_LIVE_EXAMINATION_PERMITTED_IN_THIS_BUILD(: boolean)? = true/)
  })

  test('an unlisted schema, builder or reading method refuses the eligible record, not merely one of them', () => {
    // A refusal read from the record itself (here: the unsupported reading method) is definitive and reported on its own, as a
    // synthetic record is; with the method supported, the shipped schema and builder lists refuse it too.
    const shipped = state({ support: { record_schemas: [], builders: [], examination_methods: [] } }) // the refusal mechanism, with nothing listed
    expect(reasons(evaluateIssuanceEligibility(ROW.canonical, ROW.sha256, shipped))).toEqual(['examination_method:examination_method_not_supported'])
    expect(reasons(evaluateIssuanceEligibility(ROW.canonical, ROW.sha256, state({ support: { ...{ record_schemas: [], builders: [], examination_methods: [] }, examination_methods: [METHOD] } })))).toEqual(['builder:reference_missing', 'record_schema:reference_missing'])
    // Schema 8 supported but no method: still refused. Supporting a schema never admits its readings.
    expect(reasons(evaluateIssuanceEligibility(ROW.canonical, ROW.sha256, state({ support: { ...COMMERCIAL_SUPPORT_UNDER_TEST } })))).toEqual(['examination_method:examination_method_not_supported'])
    // Production governance (no approvals at all) refuses it outright.
    expect(evaluateIssuanceEligibility(ROW.canonical, ROW.sha256, approvedGovernanceSnapshot(AS_OF, CLAIMS, GOV)).decision).toBe('ineligible')
  })

  test('the stops still come first: checkout and the renderer refuse before any check runs', async () => {
    const p = purchaseDeps()
    expect(await startPurchase({ ...p.deps, issuance: 'stopped' }, OWNER, ROW.id)).toEqual({ ok: false, status: 503, code: 'issuance_stopped' })
    expect(await startPurchase({ ...p.deps, submissions: 'stopped' }, OWNER, ROW.id)).toEqual({ ok: false, status: 503, code: 'submissions_stopped' })
    expect(() => rendererForFamily(CREATOR_RECORD_V2_FAMILY, 'stopped')).toThrow(CreatorRecordIssuanceStoppedError)
  })
})
