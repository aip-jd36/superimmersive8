/**
 * CR-DOC-READER-EXT-10B — admin-gated licence reading (founder decision, Option A). Mock and fake-model only: no network, no key, no
 * cost. Covers:
 *   1. the per-creator gate: switch on AND a PDF set that can print a licence reading AND an admin by a fresh server-side lookup;
 *      missing identity and lookup failures fail closed; nothing is looked up while licence reading is off;
 *   2. examination: an explicit Licence or Permission request from a creator who is not entitled is refused before any permission,
 *      reservation or model call; other categories keep the receipt reader; an entitled creator's request routes to the licence reader;
 *   3. the category–reading compatibility rule at checkout and issuance (a category change cannot present a receipt reading as a
 *      licence or permission reading; a Licence or Permission document without a reading stays legitimate);
 *   4. checkout and issuance authorize the licence reading method only for the server-bound record owner's entitlement;
 *   5. production wiring (source checks): every route resolves the entitlement from the authenticated user or the bound owner.
 */
import { createHash, randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import path from 'node:path'

jest.mock('@/lib/creator-record/live-examination/controls', () => ({
  ...jest.requireActual('@/lib/creator-record/live-examination/controls'),
  LIVE_EXAMINATION_PERMITTED_IN_THIS_BUILD: true,
  CUSTOMER_LIVE_EXAMINATION_PERMITTED_IN_THIS_BUILD: true,
}))
const fromSpy = jest.fn()
jest.mock('@/lib/supabase/admin', () => ({ supabaseAdmin: { from: (...a: unknown[]) => fromSpy(...a) } }))

import { approvedGovernanceSnapshot, LICENCE_READING_SWITCH, licenceReadingEnabled, licenceReadingEnabledFor } from '@/lib/creator-record/customer-flow/approved-inputs'
import { examinationCategoryForRouting, examinationProjectionFor, type CustomerExaminationDeps } from '@/lib/creator-record/customer-flow/examination'
import { authorizeV2Issuance, checkV2Checkout, purchaseOfferable, startPurchase, V2IssuanceRefusal, type CheckoutSubmission, type PurchaseDeps, type V2IssuanceDeps } from '@/lib/creator-record/customer-flow/purchase'
import type { PreparedRow } from '@/lib/creator-record/customer-flow/service'
import { syntheticUatInputs } from '@/lib/creator-record/customer-flow/synthetic-uat'
import { approvedPdfTemplates } from '@/lib/creator-record/customer-flow/approved-inputs'
import { evaluateIssuanceEligibility, examinationCategoryMismatch, examinationMethodOf, INELIGIBILITY_CODES, LICENCE_READING_CATEGORIES, LICENCE_READING_PROFILE_ID, type ExaminationMethodIdentity, type IssuanceEligibility } from '@/lib/creator-record/customer-record/eligibility'
import { CURRENT_ISSUANCE_SUPPORT, governanceSnapshotFrom, LICENCE_EXAMINATION_METHOD, type CurrentGovernance } from '@/lib/creator-record/customer-record/governance-state'
import { buildCustomerRecord, CUSTOMER_RECORD_SCHEMA } from '@/lib/creator-record/customer-record/record'
import { EVIDENCE_CATEGORIES } from '@/lib/creator-record/evidence-intake/vocabulary'
import { REPLAY_FIXTURES } from '@/lib/creator-record/evidence/replay-fixtures.data'
import { CATEGORY_PROFILES, customerProfilesFor } from '@/lib/creator-record/examination/category-profile'
import { LICENCE_PROFILE_ID } from '@/lib/creator-record/examination/licence-profile'
import { CREATOR_RECORD_GOVERNANCE_AUTHORITY as GOV } from '@/lib/creator-record/governed/sources'
import type { PublicationAuthorityBundle } from '@/lib/creator-record/governed/publication-authority'
import { CREATOR_RECORD_SYNTHETIC_TEST_AUTHORITY as SYN_AUTH } from '@/lib/creator-record/governed/synthetic-test-authority'
import { examineCustomerDocumentLive, type CustomerLivePorts } from '@/lib/creator-record/live-examination/customer'
import { parseLiveEnvelope } from '@/lib/creator-record/live-examination/envelope'
import { customerLiveProfileRegistry } from '@/lib/creator-record/live-examination/licence-live-profile'
import type { CustomerLiveAttemptRow } from '@/lib/creator-record/live-examination/projection'
import type { LiveAnthropicAdapter } from '@/lib/creator-record/live-examination/real-executor'
import { sha256Hex } from '@/lib/creator-record/record-core/canonical'
import { isAdminUser, productionLicenceReadingEnabledFor } from '@/lib/creator-record-flow/licence-entitlement'
import { handleExaminationRequest } from '@/lib/creator-record-flow/route-handlers'
import { TOPIC_CLAIMS_FIXTURE as CLAIMS } from '@/lib/retrieval-engine/topic-claims-fixture'
import { COMMERCIAL_SUPPORT_UNDER_TEST } from '@/test-support/commercial-support'
import { LICENCE_OUTPUT, SYNTHETIC_V8, V8 } from '@/test-support/doc-reader-ext-fixture'
import { syntheticTextPdf } from '@/test-support/synthetic-pdf'

const APP = path.join(__dirname, '../..')
const src = (p: string) => readFileSync(path.join(APP, p), 'utf8')
const NOW = new Date('2026-11-07T09:00:00.000Z')
const AS_OF = '2026-11-07'
const OWNER = '11111111-1111-4111-8111-111111111111'
const OTHER = '22222222-2222-4222-8222-222222222222'
const DOC_ID = '33333333-3333-4333-8333-3333333333a1'
const DOC_NO_READING = '33333333-3333-4333-8333-3333333333a2'
const SUB_ID = '44444444-4444-4444-8444-4444444444a1'
const DRAFT_ID = '55555555-5555-4555-8555-5555555555a1'
const SYN = syntheticUatInputs()
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T
const SUB: CheckoutSubmission = { id: SUB_ID, user_id: OWNER, tier: 'creator_record', creator_record_product: 'v2' }
const S8 = { id: CUSTOMER_RECORD_SCHEMA, version: 8 }
const withV8Approved = (): PublicationAuthorityBundle => ({
  ...GOV,
  pdf_template_sets: (GOV.pdf_template_sets ?? []).map((s) =>
    s.approval.record_schema.version !== 8 ? s : s.approval.version === 7 ? { ...s, approval: { ...s.approval, lifecycle: 'superseded' } } : s.approval.version === 8 ? { templates: s.templates, approval: SYNTHETIC_V8 } : s,
  ),
})
/** CR-DOC-READER-EXT-10D: the bundle as it was before v8 activation (v7 approved and selected, v8 pending). */
const withV7Selected = (): PublicationAuthorityBundle => ({
  ...GOV,
  pdf_template_sets: (GOV.pdf_template_sets ?? []).map((s) =>
    s.approval.record_schema.version !== 8 ? s : s.approval.version === 7 ? { ...s, approval: { ...s.approval, lifecycle: 'approved' } } : s.approval.version === 8 ? { ...s, approval: { ...s.approval, lifecycle: 'pending' } } : s,
  ),
})

// ── 1. The per-creator gate ──────────────────────────────────────────────────────────────────────────────────────

describe('1. licenceReadingEnabledFor: switch AND PDF set AND admin; fail closed', () => {
  test('CR-DOC-READER-EXT-11: this build (switch on, v8 selected): only the fresh admin answer decides, and it fails closed', async () => {
    expect(LICENCE_READING_SWITCH).toBe('on')
    expect(approvedPdfTemplates(GOV, S8).approval?.version).toBe(8)
    expect(licenceReadingEnabled()).toBe(true)
    const admin = jest.fn(async () => true)
    expect(await licenceReadingEnabledFor(OWNER, admin)).toBe(true)
    expect(admin).toHaveBeenCalledTimes(1)
    expect(await licenceReadingEnabledFor(OWNER, async () => false)).toBe(false)
    expect(await licenceReadingEnabledFor(OWNER, async () => { throw new Error('db down') })).toBe(false)
    expect(await licenceReadingEnabledFor(undefined, admin)).toBe(false)
  })

  test.each([
    ['off', 'v7', true, false], ['off', 'v8', true, false], ['on', 'v7', true, false],
    ['on', 'v8', false, false], ['on', 'v8', true, true],
  ] as const)('switch %s, PDF %s, admin %s → %s', async (sw, pdf, admin, expected) => {
    const bundle = pdf === 'v8' ? withV8Approved() : withV7Selected()
    const isAdmin = jest.fn(async () => admin)
    expect(await licenceReadingEnabledFor(OWNER, isAdmin, () => licenceReadingEnabled(sw, bundle))).toBe(expected)
    // The admin lookup happens only once the build-wide conditions hold.
    expect(isAdmin).toHaveBeenCalledTimes(sw === 'on' && pdf === 'v8' ? 1 : 0)
  })

  test.each([[undefined], [null], [''], ['not-a-uuid'], [42], [{ id: OWNER }]])('missing or malformed identity %p → false, no lookup', async (id) => {
    const isAdmin = jest.fn(async () => true)
    expect(await licenceReadingEnabledFor(id, isAdmin, () => true)).toBe(false)
    expect(isAdmin).not.toHaveBeenCalled()
  })

  test('a failed lookup and any answer other than exactly true are false', async () => {
    expect(await licenceReadingEnabledFor(OWNER, async () => { throw new Error('db down') }, () => true)).toBe(false)
    for (const v of ['true', 1, null, undefined, {}]) expect(await licenceReadingEnabledFor(OWNER, async () => v as never, () => true)).toBe(false)
    expect(await licenceReadingEnabledFor(OWNER, async () => true, () => true)).toBe(true)
  })

  test('the governance snapshot adds the licence method only for an entitled owner AND an enabled build (never one alone)', () => {
    const methods = (s: ReturnType<typeof approvedGovernanceSnapshot>) => s.examination_methods ?? []
    // CR-DOC-READER-EXT-11: this build is enabled, so an entitled owner gets the licence method; nobody else does.
    expect(methods(approvedGovernanceSnapshot(AS_OF, CLAIMS, GOV, { licenceEntitled: true }))).toEqual([...(CURRENT_ISSUANCE_SUPPORT.examination_methods ?? []), LICENCE_EXAMINATION_METHOD])
    expect(methods(approvedGovernanceSnapshot(AS_OF, CLAIMS, GOV, { licenceEntitled: false }))).toEqual(CURRENT_ISSUANCE_SUPPORT.examination_methods)
    expect(methods(approvedGovernanceSnapshot(AS_OF, CLAIMS, GOV))).toEqual(CURRENT_ISSUANCE_SUPPORT.examination_methods)
    // The PDF gate still decides: with the v7 set selected, even an entitled owner gets the unchanged support.
    expect(methods(approvedGovernanceSnapshot(AS_OF, CLAIMS, withV7Selected(), { licenceEntitled: true }))).toEqual(CURRENT_ISSUANCE_SUPPORT.examination_methods)
    expect(src('lib/creator-record/customer-flow/approved-inputs.ts')).toMatch(/issuanceSupportFor\(owner\.licenceEntitled === true && licenceReadingEnabled\(LICENCE_READING_SWITCH, bundle\)\)/)
  })
})

describe('1b. the production binding: a fresh service-role read of public.users.is_admin', () => {
  const lookup = (result: { data: unknown; error: unknown }) => {
    const calls: unknown[][] = []
    fromSpy.mockImplementation((table: string) => {
      calls.push(['from', table])
      const q = {
        select: (c: string) => (calls.push(['select', c]), q),
        eq: (k: string, v: string) => (calls.push(['eq', k, v]), q),
        maybeSingle: async () => result,
      }
      return q
    })
    return calls
  }
  beforeEach(() => fromSpy.mockReset())

  test('true only for is_admin === true; the query reads only is_admin of that user id', async () => {
    const calls = lookup({ data: { is_admin: true }, error: null })
    expect(await isAdminUser(OWNER)).toBe(true)
    expect(calls).toEqual([['from', 'users'], ['select', 'is_admin'], ['eq', 'id', OWNER]])
    for (const data of [{ is_admin: false }, { is_admin: 'true' }, { is_admin: null }, null]) {
      lookup({ data, error: null })
      expect(await isAdminUser(OWNER)).toBe(false)
    }
  })

  test('a database error throws (and the gate then fails closed)', async () => {
    lookup({ data: null, error: { code: '57014' } })
    await expect(isAdminUser(OWNER)).rejects.toThrow('creator_record_v2_store:admin_lookup:57014')
    expect(await licenceReadingEnabledFor(OWNER, isAdminUser, () => true)).toBe(false)
  })

  test('CR-DOC-READER-EXT-11: in this build (licence reading on) the production check is the fresh is_admin read, fail closed', async () => {
    const calls = lookup({ data: { is_admin: true }, error: null })
    expect(await productionLicenceReadingEnabledFor(OWNER)).toBe(true)
    expect(calls).toEqual([['from', 'users'], ['select', 'is_admin'], ['eq', 'id', OWNER]])
    lookup({ data: { is_admin: false }, error: null })
    expect(await productionLicenceReadingEnabledFor(OWNER)).toBe(false)
    lookup({ data: null, error: null })
    expect(await productionLicenceReadingEnabledFor(OWNER)).toBe(false)
    lookup({ data: null, error: { code: '57014' } })
    expect(await productionLicenceReadingEnabledFor(OWNER)).toBe(false)
    fromSpy.mockReset()
    expect(await productionLicenceReadingEnabledFor('not-a-uuid')).toBe(false)
    expect(fromSpy).not.toHaveBeenCalled()
  })
})

// ── 2. Examination: routing, refusal before anything is recorded ─────────────────────────────────────────────────

describe('2. examination routing', () => {
  const RECEIPT = customerProfilesFor(false)
  const BOTH = customerProfilesFor(true)

  test('the routing rule: not entitled → Licence/Permission passed on (to be refused), everything else ignored', () => {
    for (const c of EVIDENCE_CATEGORIES) {
      const callsForLicence = CATEGORY_PROFILES[c]?.id === 'licence'
      expect(examinationCategoryForRouting(c, RECEIPT)).toBe(callsForLicence ? c : undefined)
      expect(examinationCategoryForRouting(c, BOTH)).toBe(c)
    }
    expect([...EVIDENCE_CATEGORIES].filter((c) => CATEGORY_PROFILES[c]?.id === 'licence').sort()).toEqual(['licence', 'permission'])
    for (const v of [undefined, 'nonsense', 7, 'toString', '__proto__']) expect(examinationCategoryForRouting(v, RECEIPT)).toBeUndefined()
  })

  const PERMISSION_VERSION = 'perm-v1'
  function examinationDeps(licence: boolean) {
    const grant = jest.fn(async () => 'granted' as const)
    const examine = jest.fn(async (_u: string, _d: string, profile?: { id: string; version: number }) => ({ result: { kind: 'examined', attempt_id: `att-${profile?.id}`, model_called: true }, reservation_refusal: null, settlement: { status: 'settled' } }) as never)
    const deps: CustomerExaminationDeps = {
      submissions: 'open',
      hasPilotAccess: async () => true,
      activeProfiles: customerProfilesFor(licence),
      adapter: { storage: { getDocument: async (id: string) => (id === DOC_ID ? { id: DOC_ID, user_id: OWNER, sha256: 'a'.repeat(64), media_type: 'application/pdf', byte_size: 10, state: 'stored' } : null) } } as never,
      now: () => NOW,
      live: { examine },
      aiPermission: { version: PERMISSION_VERSION, grant },
    }
    return { deps, grant, examine }
  }
  const post = (body: Record<string, unknown>) => new Request('http://x/', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
  const ask = async (licence: boolean, category?: string) => {
    const x = examinationDeps(licence)
    const res = await handleExaminationRequest(post({ ai_permission: PERMISSION_VERSION, ...(category === undefined ? {} : { category }) }), OWNER, DOC_ID, x.deps)
    return { ...x, status: res.status, body: await res.json() }
  }

  test.each(['licence', 'permission'])('not entitled: an explicit %s request is refused with the existing message; no permission, reservation or model call', async (c) => {
    const r = await ask(false, c)
    expect(r.status).toBe(409)
    expect(r.body).toEqual({ error: 'AI reading is not available for this document.', code: 'examination_not_permitted' })
    expect(r.grant).not.toHaveBeenCalled()
    expect(r.examine).not.toHaveBeenCalled()
  })

  test('retries of a refused licence request are refused the same way and never fall back to the receipt reader', async () => {
    const x = examinationDeps(false)
    for (let i = 0; i < 3; i++) {
      const res = await handleExaminationRequest(post({ ai_permission: PERMISSION_VERSION, category: 'licence' }), OWNER, DOC_ID, x.deps)
      expect(res.status).toBe(409)
    }
    expect(x.grant).not.toHaveBeenCalled()
    expect(x.examine).not.toHaveBeenCalled()
  })

  test.each([undefined, 'billing_receipt', 'provider_terms', 'release_or_consent', 'project_file', 'other', 'nonsense'])('not entitled: category %p keeps the receipt reader exactly as before', async (c) => {
    const r = await ask(false, c)
    expect(r.status).toBe(200)
    expect(r.grant).toHaveBeenCalledTimes(1)
    expect(r.examine).toHaveBeenCalledTimes(1)
    expect(r.examine.mock.calls[0][2]).toEqual({ id: 'receipt', version: 1 })
  })

  test.each(['licence', 'permission'])('entitled: %s routes to the licence reader (after the permission is recorded)', async (c) => {
    const r = await ask(true, c)
    expect(r.status).toBe(200)
    expect(r.grant).toHaveBeenCalledTimes(1)
    expect(r.examine.mock.calls[0][2]).toEqual({ id: 'licence', version: 3 })
  })

  test('entitled: receipts still use the receipt reader; unexamined categories are refused as before (feature-on behaviour unchanged)', async () => {
    expect((await ask(true, 'billing_receipt')).examine.mock.calls[0][2]).toEqual({ id: 'receipt', version: 1 })
    for (const c of ['release_or_consent', 'project_file', 'other']) expect((await ask(true, c)).status).toBe(422)
  })
})

// ── Real model readings (fake model behind the executor seam) for the record-level tests ───────────────────────────

const RECEIPT_BYTES = syntheticTextPdf('Synthetic receipt for the EXT-10B gate test')
const RECEIPT_OUTPUT = REPLAY_FIXTURES.find((f) => f.fixture_id === 'pdf-pika-pro-no-period')!.parsed_output
const LICENCE_BYTES = syntheticTextPdf('Synthetic licence for the EXT-10B gate test')
const adapterReturning = (output: unknown): LiveAnthropicAdapter => ({
  createAnthropicReceiptCaller: (o) => async () => ({ id: 'msg_live', model: o.model, stop_reason: 'end_turn', content: [{ type: 'text', text: '' }], usage: { input_tokens: 3000, output_tokens: 400 }, parsed_output: output }) as never,
  classifyAnthropicFailure: () => 'server_error',
})

async function liveReading(profile: 'receipt' | 'licence'): Promise<{ attempt: CustomerLiveAttemptRow; bytes: Uint8Array }> {
  const bytes = profile === 'receipt' ? RECEIPT_BYTES : LICENCE_BYTES
  const rows: CustomerLiveAttemptRow[] = []
  const sha = createHash('sha256').update(bytes).digest('hex')
  const ports: CustomerLivePorts = {
    getDocument: async (id) => (id === DOC_ID ? { id: DOC_ID, user_id: OWNER, sha256: sha, media_type: 'application/pdf', byte_size: bytes.length, state: 'stored' } : null),
    logLiveRead: async () => 1,
    readObject: async () => bytes,
    listLiveAttempts: async () => clone(rows),
    reserve: async () => randomUUID(),
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
  const r = await examineCustomerDocumentLive(
    { ports, isKnownSyntheticFixture: () => false, now: () => NOW, profiles: customerLiveProfileRegistry(true), executorOptions: { env: { CREATOR_RECORD_EXTRACTION_API_KEY: 'test-key-not-real' }, loadAdapter: async () => adapterReturning(profile === 'receipt' ? RECEIPT_OUTPUT : LICENCE_OUTPUT) } },
    OWNER, DOC_ID, profile === 'receipt' ? { id: 'receipt', version: 1 } : { id: 'licence', version: 3 },
  )
  if (r.result.kind !== 'examined' || rows.length !== 1) throw new Error(`fixture: no ${profile} reading (${JSON.stringify(r.result)})`)
  return { attempt: rows[0], bytes }
}

/** A reviewed, latest schema 8 version: the read document under `category`, optionally a second, unread document. */
async function row(reading: { attempt: CustomerLiveAttemptRow; bytes: Uint8Array }, category: string, o: { unread?: string; owner?: string; version?: number } = {}): Promise<PreparedRow> {
  const p = await examinationProjectionFor({ listRuns: async () => [] }, OWNER, DOC_ID, undefined, { listAttempts: async () => [clone(reading.attempt)] })
  if (p.kind !== 'projection') throw new Error(`fixture: ${JSON.stringify(p)}`)
  const version = o.version ?? 1
  const id = `66666666-6666-4666-8666-${String(version).padStart(12, '0')}`
  const unreadBytes = syntheticTextPdf('A document that was never read')
  const built = buildCustomerRecord({
    state: { answers: { P1: ['EXT-10B gate video'], P3: ['own_channels'], F1: ['TW'], F2: ['online_worldwide'], L1: ['no'], M0: ['none'], H1: ['edited'] }, tools: [{ T1: ['pika'], T3: ['Standard'] }], acknowledgements: { A1: true, A2: true } },
    sources: SYN.sources, source_text: SYN.source_text_examination!, topicClaims: CLAIMS, as_of: AS_OF,
    record: { record_id: `PREP-${id}`, record_version: version, captured_at: NOW.toISOString() },
    documents: [
      { document_id: DOC_ID, sha256: reading.attempt.document_sha256, media_type: 'application/pdf', byte_size: reading.bytes.length, file_name: 'doc.pdf', category: category as never, tool_index: 0 },
      ...(o.unread ? [{ document_id: DOC_NO_READING, sha256: createHash('sha256').update(unreadBytes).digest('hex'), media_type: 'application/pdf' as const, byte_size: unreadBytes.length, file_name: 'unread.pdf', category: o.unread as never, tool_index: null }] : []),
    ],
    examinations: [{ document_id: DOC_ID, projection: p.projection }],
  })
  if (!built.ok) throw new Error(`fixture: ${JSON.stringify(built).slice(0, 300)}`)
  return {
    id, user_id: o.owner ?? OWNER, draft_id: DRAFT_ID, version, record_ref: `PREP-${id}`, record_schema: CUSTOMER_RECORD_SCHEMA, record_schema_version: built.record.schema_version,
    canonical: built.canonical, sha256: built.sha256, form_state: {}, status: 'reviewed', created_at: NOW.toISOString(), reviewed_at: NOW.toISOString(), submission_id: null,
  } as PreparedRow
}

let RECEIPT_READING: Awaited<ReturnType<typeof liveReading>>
let LICENCE_READING: Awaited<ReturnType<typeof liveReading>>
let RECEIPT_METHOD: ExaminationMethodIdentity
beforeAll(async () => {
  RECEIPT_READING = await liveReading('receipt')
  LICENCE_READING = await liveReading('licence')
  RECEIPT_METHOD = examinationMethodOf(JSON.parse((await row(RECEIPT_READING, 'billing_receipt')).canonical).documents.items[0].examination)
})

/** Governance as production builds it: the licence method only when the owner is entitled. */
const state = (licenceEntitled: boolean, over: Partial<CurrentGovernance> = {}) => governanceSnapshotFrom({
  issuance_date: AS_OF, sources: SYN.sources, topicClaims: CLAIMS, source_text_approvals: [SYN.source_text_examination!.approval!], authority_class: 'synthetic_test',
  support: { ...COMMERCIAL_SUPPORT_UNDER_TEST, examination_methods: licenceEntitled ? [RECEIPT_METHOD, LICENCE_EXAMINATION_METHOD] : [RECEIPT_METHOD] }, ...over,
})
const reasons = (e: IssuanceEligibility) => (e.decision === 'ineligible' ? e.reasons.map((r) => `${r.kind}:${r.code}`) : [e.decision])

// ── 3. The category–reading compatibility rule ──────────────────────────────────────────────────────────────────

describe('3. category–reading compatibility at checkout and issuance', () => {
  test('the pure rule: Licence/Permission documents carry only licence readings; licence readings only on Licence/Permission documents', () => {
    const reading = (id: unknown) => ({ envelope: { profile: { id } } })
    for (const c of EVIDENCE_CATEGORIES) {
      const lp = c === 'licence' || c === 'permission'
      expect(examinationCategoryMismatch(c, reading('receipt'))).toBe(lp ? 'receipt' : null)
      expect(examinationCategoryMismatch(c, reading('licence'))).toBe(lp ? null : 'licence')
      expect(examinationCategoryMismatch(c, undefined)).toBeNull()
      expect(examinationCategoryMismatch(c, null)).toBeNull()
    }
    expect(examinationCategoryMismatch('licence', reading(undefined))).toBe('unknown')
    expect(examinationCategoryMismatch('licence', {})).toBe('unknown')
    expect(INELIGIBILITY_CODES).toContain('examination_category_mismatch')
    // The eligibility module's own constants are exactly the routing map's (it imports no examination code).
    expect(LICENCE_READING_PROFILE_ID).toBe(LICENCE_PROFILE_ID)
    expect([...LICENCE_READING_CATEGORIES].sort()).toEqual([...EVIDENCE_CATEGORIES].filter((c) => CATEGORY_PROFILES[c]?.id === LICENCE_PROFILE_ID).sort())
  })

  test('ordinary receipt behaviour is unchanged: a receipt reading under every non-licence category is eligible', async () => {
    for (const c of ['billing_receipt', 'provider_terms', 'release_or_consent', 'project_file', 'other']) {
      const r = await row(RECEIPT_READING, c)
      expect([c, reasons(evaluateIssuanceEligibility(r.canonical, r.sha256, state(false)))]).toEqual([c, ['eligible']])
    }
  })

  test.each(['licence', 'permission'])('a receipt reading re-labelled %s is ineligible, whoever owns it (admin or not)', async (c) => {
    const r = await row(RECEIPT_READING, c)
    for (const entitled of [false, true]) expect(reasons(evaluateIssuanceEligibility(r.canonical, r.sha256, state(entitled)))).toEqual(['examination_method:examination_category_mismatch'])
  })

  test('a licence reading re-labelled as a receipt (or any other non-licence category) is ineligible', async () => {
    for (const c of ['billing_receipt', 'provider_terms', 'other']) {
      const r = await row(LICENCE_READING, c)
      expect(reasons(evaluateIssuanceEligibility(r.canonical, r.sha256, state(true)))).toEqual(['examination_method:examination_category_mismatch'])
    }
  })

  test.each(['licence', 'permission'])('a %s document WITHOUT a reading stays legitimate (no reading is required)', async (c) => {
    const r = await row(RECEIPT_READING, 'billing_receipt', { unread: c })
    expect(reasons(evaluateIssuanceEligibility(r.canonical, r.sha256, state(false)))).toEqual(['eligible'])
  })

  test('draft reuse: a new version of the same draft carrying the same mismatch is refused again (decided from the record content)', async () => {
    for (const version of [1, 2, 3]) {
      const r = await row(RECEIPT_READING, 'licence', { version })
      expect(evaluateIssuanceEligibility(r.canonical, r.sha256, state(true)).decision).toBe('ineligible')
    }
  })
})

// ── 4. Checkout and issuance: the server-bound owner's entitlement ─────────────────────────────────────────────

describe('4. checkout and issuance authorize the licence method only for an entitled record owner', () => {
  /** The selected sets as they would be with v8 approved (synthetic approval): schema 8 can print a licence reading. */
  const TEMPLATES = (schema: { id: string; version: number }) => (schema.version === 8 ? { templates: V8.templates, approval: SYNTHETIC_V8 } : approvedPdfTemplates(SYN_AUTH, schema)) as ReturnType<typeof approvedPdfTemplates>
  const ownerSeen: string[] = []
  const entitledFor = (who: 'admin' | 'non-admin' | 'throws') => async (owner: string) => {
    ownerSeen.push(owner)
    if (who === 'throws') throw new Error('db down')
    return who === 'admin'
  }
  beforeEach(() => { ownerSeen.length = 0 })

  function purchaseDeps(r: PreparedRow, licenceEntitled?: PurchaseDeps['licenceEntitled']): PurchaseDeps {
    return {
      submissions: 'open', issuance: 'enabled', hasPilotAccess: async () => true, legalPoliciesApproved: () => true,
      getPrepared: async (id) => (id === r.id ? clone(r) : null), latestVersion: async () => clone(r), boundTo: async () => clone({ ...r, submission_id: SUB_ID }),
      bind: async () => ({ submissionId: SUB_ID, reason: 'created' }),
      governance: (_d, owner) => state(owner?.licenceEntitled === true), now: () => NOW,
      evidenceIntact: async () => ({ ok: true }), examinationsIntact: async () => ({ ok: true }), templates: TEMPLATES,
      ...(licenceEntitled ? { licenceEntitled } : {}),
    }
  }
  function issuanceDeps(r: PreparedRow, licenceEntitled?: V2IssuanceDeps['licenceEntitled']): V2IssuanceDeps {
    const bound = { ...r, submission_id: SUB_ID }
    return {
      boundTo: async () => clone(bound), latestVersion: async () => clone(bound),
      governance: (_d, owner) => state(owner?.licenceEntitled === true), templates: TEMPLATES,
      renderPdf: async () => new Uint8Array(), evidenceIntact: async () => ({ ok: true }), examinationsIntact: async () => ({ ok: true }),
      ...(licenceEntitled ? { licenceEntitled } : {}),
    }
  }
  const issuance = (p: Promise<unknown>) => p.then(() => 'authorized', (e) => (e instanceof V2IssuanceRefusal ? e.code : `other:${String(e)}`))

  test('a licence reading, admin owner: checkout and issuance proceed; the entitlement is resolved for the bound owner', async () => {
    const r = await row(LICENCE_READING, 'licence')
    expect(await startPurchase(purchaseDeps(r, entitledFor('admin')), OWNER, r.id)).toEqual({ ok: true, submission_id: SUB_ID })
    expect(await checkV2Checkout(purchaseDeps(r, entitledFor('admin')), OWNER, SUB)).toMatchObject({ ok: true })
    expect(await issuance(authorizeV2Issuance(issuanceDeps(r, entitledFor('admin')), SUB, NOW))).toBe('authorized')
    expect(new Set(ownerSeen)).toEqual(new Set([OWNER]))
  })

  test.each([['non-admin'], ['throws'], ['no port']] as const)('a licence reading, owner %s: refused at checkout and at issuance', async (who) => {
    const r = await row(LICENCE_READING, 'licence')
    const port = who === 'no port' ? undefined : entitledFor(who)
    expect(await startPurchase(purchaseDeps(r, port), OWNER, r.id)).toMatchObject({ ok: false, status: 409, code: 'ineligible' })
    expect(await checkV2Checkout(purchaseDeps(r, port), OWNER, SUB)).toMatchObject({ ok: false, code: 'ineligible' })
    expect(await issuance(authorizeV2Issuance(issuanceDeps(r, port), SUB, NOW))).toBe('governance_ineligible')
  })

  test('another user cannot borrow an admin entitlement: the record owner, not the caller, is what is looked up', async () => {
    const r = await row(LICENCE_READING, 'licence', { owner: OTHER })
    const adminOnlyFor = (id: string) => async (owner: string) => (ownerSeen.push(owner), owner === id)
    // The owner check comes first, so a caller who does not own the record never reaches eligibility.
    expect(await startPurchase(purchaseDeps(r, adminOnlyFor(OWNER)), OWNER, r.id)).toMatchObject({ ok: false, code: 'not_found' })
    // The owner OTHER is not an admin: refused even though the session user would have been.
    expect(await startPurchase(purchaseDeps(r, adminOnlyFor(OWNER)), OTHER, r.id)).toMatchObject({ ok: false, code: 'ineligible' })
    expect(ownerSeen).toEqual([OTHER])
  })

  test('a receipt reading is unaffected by the entitlement (no port, non-admin or admin)', async () => {
    const r = await row(RECEIPT_READING, 'billing_receipt')
    for (const port of [undefined, entitledFor('non-admin'), entitledFor('admin')]) {
      expect(await startPurchase(purchaseDeps(r, port), OWNER, r.id)).toEqual({ ok: true, submission_id: SUB_ID })
      expect(await issuance(authorizeV2Issuance(issuanceDeps(r, port), SUB, NOW))).toBe('authorized')
    }
  })

  test('a category mismatch is refused at checkout and issuance even for an admin', async () => {
    for (const r of [await row(RECEIPT_READING, 'licence'), await row(LICENCE_READING, 'billing_receipt')]) {
      expect(await startPurchase(purchaseDeps(r, entitledFor('admin')), OWNER, r.id)).toMatchObject({ ok: false, code: 'ineligible' })
      expect(await issuance(authorizeV2Issuance(issuanceDeps(r, entitledFor('admin')), SUB, NOW))).toBe('governance_ineligible')
    }
  })

  test('the PDF gate stays authoritative: with a schema 8 set that cannot print a licence reading, an admin record is refused', async () => {
    const r = await row(LICENCE_READING, 'licence')
    const noLicenceSet = (schema: { id: string; version: number }) => approvedPdfTemplates(SYN_AUTH, schema)
    expect(await startPurchase({ ...purchaseDeps(r, entitledFor('admin')), templates: noLicenceSet }, OWNER, r.id)).toMatchObject({ ok: false, code: 'unavailable' })
    expect(await issuance(authorizeV2Issuance({ ...issuanceDeps(r, entitledFor('admin')), templates: noLicenceSet }, SUB, NOW))).toBe('templates_unavailable')
  })

  test('rollback: an admin record holding a licence reading is refused once the owner is no longer entitled (fail closed)', async () => {
    const r = await row(LICENCE_READING, 'licence')
    expect(await issuance(authorizeV2Issuance(issuanceDeps(r, entitledFor('admin')), SUB, NOW))).toBe('authorized')
    expect(await issuance(authorizeV2Issuance(issuanceDeps(r, entitledFor('non-admin')), SUB, NOW))).toBe('governance_ineligible')
  })

  test('the display-only payment offer follows the same rule (default: not entitled)', async () => {
    const lic = await row(LICENCE_READING, 'licence')
    const rec = await row(RECEIPT_READING, 'billing_receipt')
    const mism = await row(RECEIPT_READING, 'permission')
    const d = purchaseDeps(lic)
    expect(purchaseOfferable(d, lic)).toBe(false)
    expect(purchaseOfferable(d, lic, { licenceEntitled: true })).toBe(true)
    expect(purchaseOfferable(d, rec)).toBe(true)
    expect(purchaseOfferable(d, mism, { licenceEntitled: true })).toBe(false)
  })
})

// ── 5. Production wiring ───────────────────────────────────────────────────────────────────────────────────────

describe('5. production wiring: identity is always server-derived', () => {
  test('the examination route resolves the entitlement for the authenticated session user', () => {
    const route = src('app/api/creator-record-v2/evidence/[id]/examination/route.ts')
    expect(route).toMatch(/const userId = await sessionUserId\(\)/)
    expect(route).toMatch(/productionCustomerExaminationDeps\(await productionLicenceReadingEnabledFor\(userId\)\)/)
  })

  test('examination deps: profiles and the live registry both come from the per-creator value, default off', () => {
    const s = src('lib/creator-record-flow/examination-customer.ts')
    expect(s).toMatch(/export function productionCustomerExaminationDeps\(licenceEntitled = false\)/)
    expect(s).toMatch(/const licence = licenceEntitled === true && licenceReadingEnabled\(\)/)
    expect(s).toMatch(/activeProfiles: activeCustomerProfilesFor\(licence\)/)
    expect(s).toMatch(/live: productionCustomerLive\(licence\)/)
    expect(s).toMatch(/customerLiveProfileRegistry\(licence && licenceReadingEnabled\(\)\)/)
    expect(s).not.toMatch(/customerLiveProfileRegistry\(licenceReadingEnabled\(\)\)/)
  })

  test('purchase and issuance deps bind the owner entitlement; the offer is limited to versions the entitled user owns', () => {
    const s = src('lib/creator-record-flow/production.ts')
    expect(s.match(/licenceEntitled: productionLicenceReadingEnabledFor,/g)).toHaveLength(2)
    expect(s.match(/governance: \(date, owner\) => approvedGovernanceSnapshot\(date, TOPIC_CLAIMS_FIXTURE, undefined, owner\)/g)).toHaveLength(2)
    expect(s).toMatch(/licenceEntitled: typeof options\.licenceEntitledUserId === 'string' && row\.user_id === options\.licenceEntitledUserId/)
    expect(s).not.toMatch(/governance: \(date\) =>/)
  })

  test('checkout and issuance look up the server-bound owner (row.user_id), never the request', () => {
    const s = src('lib/creator-record/customer-flow/purchase.ts')
    expect(s.match(/licenceEntitled: await ownerLicenceEntitled\(deps, row\.user_id\)/g)).toHaveLength(2)
  })

  test('the owner views resolve the entitlement for the session user', () => {
    for (const f of ['app/api/creator-record-v2/prepared/[id]/route.ts', 'app/api/creator-record-v2/prepared/[id]/review/route.ts', 'app/creator-record/page.tsx']) {
      expect([f, src(f)]).toEqual([f, expect.stringMatching(/await productionFlowDepsFor\(userId\)/)])
    }
  })
})
