/**
 * CR-DOC-READER-EXT-2 — category → profile routing through the existing examination service and cores (mock / replay only).
 *
 *   - legacy: no category (every request the current client and HTTP route make) keeps the receipt profile;
 *   - a licence or permission is never read as a receipt: with the shipped (receipt-only) active list it is refused before any
 *     permission is recorded or any document is read; unknown, release, project file and other are refused too;
 *   - with the licence profile made active (tests only), a licence goes end to end through the real replay core: read, recorded,
 *     persisted and verified with its provenance, under the licence profile;
 *   - consent and withdrawal: no grant, no examination; a withdrawn permission refuses; the live path receives the routed profile;
 *   - the live core refuses the licence profile with the production registry and reads it with a mock executor when registered;
 *   - the HTTP route and the production wiring are unchanged (no category reaches them).
 */
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { AiPermissionRefusal, requestCustomerExamination, routeExaminationProfile, type CustomerExaminationDeps } from '@/lib/creator-record/customer-flow/examination'
import { LICENCE_PROFILE_INACTIVE } from '@/lib/creator-record/examination/licence-profile'
import { buildProfileRegistry, profileKey } from '@/lib/creator-record/examination/profile'
import { RECEIPT_PROFILE } from '@/lib/creator-record/examination/receipt-profile'
import { knownFixtureRegistry, replayExecutor } from '@/lib/creator-record/examination/replay-executor'
import { buildReplayTable } from '@/lib/creator-record/evidence/replay'
import { REPLAY_FIXTURES } from '@/lib/creator-record/evidence/replay-fixtures.data'
import { parseExaminationEnvelope } from '@/lib/creator-record/examination/envelope'
import { examineLiveAndRecord, LIVE_PROFILE_REGISTRY, RECEIPT_LIVE_PROFILE, type LiveAttemptRow, type LiveStoragePorts } from '@/lib/creator-record/live-examination/examine'
import { LICENCE_LIVE_PROFILE_INACTIVE } from '@/lib/creator-record/live-examination/licence-live-profile'
import type { CustomerLiveResult } from '@/lib/creator-record/live-examination/customer'
import { canonicalJson, sha256Hex } from '@/lib/creator-record/record-core/canonical'
import { mockLiveExecutor } from '@/test-support/mock-live-executor'

const OWNER = '11111111-1111-4111-8111-111111111111'
const DOC = '33333333-3333-4333-8333-33333333333a'
const NOW = new Date('2026-11-18T10:00:00.000Z')
const BYTES = new Uint8Array(Buffer.from('%PDF-1.4\n%synthetic-test:licence-route\n%%EOF\n'))
const SHA = createHash('sha256').update(BYTES).digest('hex')
const LICENCE_OUTPUT = {
  document_kind: 'licence_or_licence_certificate', readability: 'legible', instruction_like_text_present: false, personal_details_present: false,
  licence_or_plan_type: { status: 'present', value: 'Pro', evidence: 'Licence type: Pro' },
  content_designation: { status: 'not_shown', value: null, evidence: null },
  permission_statement: { status: 'not_shown', value: null, evidence: null },
  licensed_item_reference: { status: 'present', value: 'Synthetic Track 7', evidence: 'Track: Synthetic Track 7' },
  issue_date: { status: 'present', value: '2026-10-01', evidence: 'Issued 2026-10-01' },
  valid_until: { status: 'not_shown', value: null, evidence: null },
}
const RECEIPT_FIXTURE = REPLAY_FIXTURES.find((f) => f.fixture_id === 'pdf-kling-pro-monthly')!
const LICENCE = { id: 'licence', version: 2 }
const RECEIPT = { id: 'receipt', version: 1 }

/** The replay core with in-memory persistence; `output` is the recording replayed for the document. */
function replayDeps(output: unknown, over: Partial<CustomerExaminationDeps> = {}) {
  const table = buildReplayTable([{ fixture_id: 'synthetic-licence-route', sha256: SHA, media_type: 'application/pdf', parsed_output: output }])
  const events: string[] = []
  const recorded: string[] = []
  const deps: CustomerExaminationDeps = {
    submissions: 'open',
    hasPilotAccess: async () => true,
    adapter: {
      core: { fixtures: knownFixtureRegistry(table), executor: replayExecutor(table), profiles: buildProfileRegistry([RECEIPT_PROFILE, LICENCE_PROFILE_INACTIVE]) },
      storage: {
        async getDocument(id) { return id === DOC ? { id: DOC, user_id: OWNER, sha256: SHA, media_type: 'application/pdf', byte_size: BYTES.length, state: 'stored' } : null },
        async logExaminationRead() { events.push('log'); return 1 },
        async readObject() { events.push('read'); return BYTES },
        async recordExamination(_id, text) { events.push('record'); recorded.push(text); return { run_id: '44444444-4444-4444-8444-44444444444a', result: 'created' } },
        async listRuns() { return [] },
      },
    } as CustomerExaminationDeps['adapter'],
    ...over,
  }
  return { deps, events, recorded }
}

describe('routing decision', () => {
  test('no category keeps the receipt profile (legacy); receipts and provider documents too', () => {
    expect(routeExaminationProfile(undefined)).toEqual({ ok: true, profile: RECEIPT })
    expect(routeExaminationProfile('billing_receipt')).toEqual({ ok: true, profile: RECEIPT })
    expect(routeExaminationProfile('provider_terms')).toEqual({ ok: true, profile: RECEIPT })
  })
  test('licence and permission are refused while inactive; never routed to the receipt profile', () => {
    for (const c of ['licence', 'permission']) expect(routeExaminationProfile(c)).toMatchObject({ ok: false, reason: 'profile_inactive', error: { status: 409, code: 'examination_not_permitted' } })
    expect(routeExaminationProfile('licence', [LICENCE])).toEqual({ ok: true, profile: LICENCE })
  })
  test('unknown and not-examined categories are refused', () => {
    for (const c of ['receipt', null, 7, '']) expect(routeExaminationProfile(c)).toMatchObject({ ok: false, reason: 'category_unknown', error: { status: 422, code: 'not_examinable' } })
    for (const c of ['release_or_consent', 'project_file', 'other']) expect(routeExaminationProfile(c)).toMatchObject({ ok: false, reason: 'category_not_examined', error: { status: 422 } })
  })
})

describe('replay route, end to end (real core, in-memory persistence)', () => {
  test('legacy request: the receipt profile reads a receipt recording', async () => {
    const receiptTable = buildReplayTable([{ ...RECEIPT_FIXTURE, sha256: SHA }])
    const { deps, recorded } = replayDeps(RECEIPT_FIXTURE.parsed_output)
    deps.adapter = { ...deps.adapter, core: { ...deps.adapter.core, fixtures: knownFixtureRegistry(receiptTable), executor: replayExecutor(receiptTable) } }
    expect(await requestCustomerExamination(deps, OWNER, DOC)).toMatchObject({ ok: true, result: 'created' })
    const env = parseExaminationEnvelope(JSON.parse(recorded[0]))!
    expect(env.profile).toMatchObject(RECEIPT)
  })
  test('licence refused while inactive: nothing is logged, read or recorded', async () => {
    const { deps, events } = replayDeps(LICENCE_OUTPUT)
    expect(await requestCustomerExamination(deps, OWNER, DOC, { category: 'licence' })).toEqual({ ok: false, status: 409, code: 'examination_not_permitted' })
    expect(events).toEqual([])
  })
  test('licence made active (tests only): read, recorded and verifiable under the licence profile, with provenance', async () => {
    const { deps, events, recorded } = replayDeps(LICENCE_OUTPUT, { activeProfiles: [RECEIPT, LICENCE] })
    expect(await requestCustomerExamination(deps, OWNER, DOC, { category: 'licence' })).toMatchObject({ ok: true, result: 'created' })
    expect(events).toEqual(['log', 'read', 'record'])
    const env = parseExaminationEnvelope(JSON.parse(recorded[0]))
    expect(env).not.toBeNull()
    expect(env!.profile).toMatchObject({ id: 'licence', version: 2, schema: 'licence-extraction-v2', prompt: 'licence-prompt-v2' })
    expect(env!.document).toMatchObject({ document_id: DOC, sha256: SHA })
    expect(env!.observations.every((o) => o.verification === 'not_verified' && o.source.document_sha256 === SHA)).toBe(true)
    expect(env!.observations.find((o) => o.field === 'licence_or_plan_type')).toMatchObject({ value: 'Pro', excerpt: 'Licence type: Pro' })
    expect(env!.provenance).toMatchObject({ prompt_sent: false, replay_fixture_id: 'synthetic-licence-route' })
    expect(canonicalJson(env)).toBe(recorded[0])
  })
  test('category / profile mismatch fails closed: a licence recording filed as a receipt is not a valid receipt reading', async () => {
    const { deps, recorded } = replayDeps(LICENCE_OUTPUT)
    expect(await requestCustomerExamination(deps, OWNER, DOC, { category: 'billing_receipt' })).toMatchObject({ ok: true })
    const env = parseExaminationEnvelope(JSON.parse(recorded[0]))!
    expect(env.profile.id).toBe('receipt')
    expect(env.outcome).toEqual({ status: 'could_not_examine', reason: 'schema_invalid' })
    expect(env.observations).toEqual([])
  })
  test('release, project file, other and unknown categories read nothing', async () => {
    for (const c of ['release_or_consent', 'project_file', 'other', 'contract']) {
      const { deps, events } = replayDeps(LICENCE_OUTPUT, { activeProfiles: [RECEIPT, LICENCE] })
      expect(await requestCustomerExamination(deps, OWNER, DOC, { category: c })).toMatchObject({ ok: false, status: 422 })
      expect(events).toEqual([])
    }
  })
})

describe('consent and withdrawal (live path)', () => {
  const liveDeps = (grant: jest.Mock, examine: jest.Mock, over: Partial<CustomerExaminationDeps> = {}) =>
    ({ ...replayDeps(LICENCE_OUTPUT).deps, live: { examine }, aiPermission: { version: 'ai-v1', grant }, ...over }) as unknown as CustomerExaminationDeps
  const examined: CustomerLiveResult = { result: { kind: 'examined', attempt_id: 'a-1', model_called: true } as never, reservation_refusal: null, settlement: { status: 'settled', charged_micro_usd: 1 } }
  test('a refused category records no permission and starts no examination', async () => {
    const grant = jest.fn(); const examine = jest.fn()
    expect(await requestCustomerExamination(liveDeps(grant, examine), OWNER, DOC, { aiPermission: 'ai-v1', category: 'licence' })).toMatchObject({ status: 409 })
    expect(grant).not.toHaveBeenCalled()
    expect(examine).not.toHaveBeenCalled()
  })
  test('no permission given: refused before any examination', async () => {
    const grant = jest.fn(); const examine = jest.fn()
    expect(await requestCustomerExamination(liveDeps(grant, examine), OWNER, DOC)).toEqual({ ok: false, status: 400, code: 'ai_permission_required' })
    expect(examine).not.toHaveBeenCalled()
  })
  test('withdrawn permission: refused, no examination', async () => {
    const grant = jest.fn(async () => { throw new AiPermissionRefusal('withdrawn') }); const examine = jest.fn()
    expect(await requestCustomerExamination(liveDeps(grant, examine), OWNER, DOC, { aiPermission: 'ai-v1' })).toEqual({ ok: false, status: 409, code: 'examination_not_permitted' })
    expect(examine).not.toHaveBeenCalled()
  })
  test('the live examination receives the routed profile (receipt by default; licence only when active)', async () => {
    const grant = jest.fn(async () => undefined); const examine = jest.fn(async () => examined)
    await requestCustomerExamination(liveDeps(grant, examine), OWNER, DOC, { aiPermission: 'ai-v1' })
    expect(examine).toHaveBeenLastCalledWith(OWNER, DOC, RECEIPT)
    await requestCustomerExamination(liveDeps(grant, examine, { activeProfiles: [RECEIPT, LICENCE] }), OWNER, DOC, { aiPermission: 'ai-v1', category: 'licence' })
    expect(examine).toHaveBeenLastCalledWith(OWNER, DOC, LICENCE)
  })
})

describe('live core (mock executor)', () => {
  const RECORD = { id: DOC, user_id: OWNER, sha256: SHA, media_type: 'application/pdf' as const, byte_size: BYTES.length, state: 'stored' as const }
  function store() {
    const rows: LiveAttemptRow[] = []
    const ports: LiveStoragePorts = {
      getDocument: async (id) => (id === DOC ? RECORD : null),
      logExaminationRead: async () => 1,
      readObject: async () => BYTES,
      recordLiveAttempt: async (_access, text) => {
        const e = JSON.parse(text)
        rows.push({ id: 'attempt-1', attempt_number: 1, examination_key: e.examination_key, document_id: DOC, user_id: OWNER, document_sha256: SHA, envelope_version: 3, execution_origin: e.execution_origin, content_class: e.content_class, profile_id: e.profile.id, profile_version: e.profile.version, schema_version: e.profile.schema, prompt_version: e.profile.prompt, executor_mode: e.executor.mode, provider: e.executor.provider, model: e.executor.model, outcome_status: e.outcome.status, outcome_reason: e.outcome.reason, executed_at: e.executed_at, envelope_canonical: text, envelope_sha256: sha256Hex(text), access_log_id: 1, created_at: NOW.toISOString() })
        return { attempt_id: 'attempt-1', result: 'created' }
      },
      listLiveAttempts: async () => rows.map((r) => ({ ...r })),
    }
    return { ports, rows }
  }
  const core = (profiles: typeof LIVE_PROFILE_REGISTRY, steps = [{ output: LICENCE_OUTPUT }]) => ({ executor: mockLiveExecutor(steps), isKnownSyntheticFixture: (s: string) => s === SHA, profiles, livePermitted: false, now: () => NOW })
  test('the production registry holds the receipt profile only, and refuses a licence request', async () => {
    expect([...LIVE_PROFILE_REGISTRY.keys()]).toEqual([profileKey(RECEIPT_LIVE_PROFILE.ref)])
    const s = store()
    const r = await examineLiveAndRecord({ storage: s.ports, core: core(LIVE_PROFILE_REGISTRY) }, { actor_user_id: OWNER, document_id: DOC, profile: LICENCE })
    expect(r).toMatchObject({ kind: 'refused', code: 'profile_not_registered' })
    expect(s.rows).toEqual([])
  })
  test('registered (tests only): a mock licence reading is recorded with the licence profile and live provenance', async () => {
    const s = store()
    const profiles = new Map([...LIVE_PROFILE_REGISTRY, [profileKey(LICENCE_LIVE_PROFILE_INACTIVE.ref), LICENCE_LIVE_PROFILE_INACTIVE]])
    const r = await examineLiveAndRecord({ storage: s.ports, core: core(profiles) }, { actor_user_id: OWNER, document_id: DOC, profile: LICENCE })
    expect(r).toMatchObject({ kind: 'examined', model_called: true })
    const e = JSON.parse(s.rows[0].envelope_canonical)
    expect(e.profile).toMatchObject({ id: 'licence', schema: 'licence-extraction-v2' })
    expect(e.execution_origin).toBe('mock_test')
    expect(e.limitations).toEqual(expect.arrayContaining(['mock_test_data_not_model_output', 'observations_not_verified']))
  })
})

describe('Production surfaces unchanged', () => {
  const read = (p: string) => readFileSync(path.join(__dirname, '../..', p), 'utf8')
  // CR-DOC-READER-EXT-5A: the production wiring is now switch-driven. Its behaviour (off = exactly as before) is proven in
  // doc-reader-ext-activation.test.ts; this pins the wiring to the one predicate.
  test('the HTTP handler routes a category only while the licence profile is active; the wiring derives both from licenceReadingEnabled', () => {
    expect(read('lib/creator-record-flow/route-handlers.ts')).toMatch(/const routes = deps\.activeProfiles\?\.some\(\(p\) => p\.id === 'licence'\) === true/)
    const wiring = read('lib/creator-record-flow/examination-customer.ts')
    expect(wiring).toContain('activeProfiles: activeCustomerProfilesFor(licence)')
    expect(wiring).toContain('const licence = licenceReadingEnabled()')
    expect(wiring).toContain('customerLiveProfileRegistry(licenceReadingEnabled())')
    expect(read('lib/creator-record/live-examination/customer.ts')).toContain('profiles: deps.profiles ?? LIVE_PROFILE_REGISTRY')
  })
})
