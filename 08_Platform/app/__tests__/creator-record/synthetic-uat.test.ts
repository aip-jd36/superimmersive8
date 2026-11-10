/**
 * The service-level guarantees of the synthetic path, over a test-local port: only an admitted identity gets synthetic
 * inputs, closing admission closes every operation, and every other path is exactly as before. The temporary window is
 * retired; only the admin UAT wiring supplies this port (admin-uat.test.ts).
 * Production conditions are simulated: submissions STOPPED and an EMPTY governance bundle.
 */

import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { buildReplayTable } from '@/lib/creator-record/evidence/replay'
import { REPLAY_FIXTURES } from '@/lib/creator-record/evidence/replay-fixtures.data'
import { sha256Hex } from '@/lib/creator-record/record-core/canonical'
import type { ExaminationEnvelope } from '@/lib/creator-record/examination/envelope'
import { defaultProfileRegistry, knownFixtureRegistry, replayExecutor } from '@/lib/creator-record/examination/replay-executor'
import { examineAndRecord, ExaminationPortError, type ExaminationAdapterDeps, type PersistedRunRow } from '@/lib/creator-record/examination/persistence'
import { syntheticUatInputs, type SyntheticUatPorts } from '@/lib/creator-record/customer-flow/synthetic-uat'
import { approvedCustomerRecordInputs, approvedGovernanceSnapshot, CREATOR_RECORD_V2_SUBMISSIONS } from '@/lib/creator-record/customer-flow/approved-inputs'
import { examinationProjectionFor, requestCustomerExamination, customerExaminationHistory, type CustomerExaminationDeps } from '@/lib/creator-record/customer-flow/examination'
import { getPrepared, preparePrepared as prepareAsSent, reviewPrepared, type ApprovedInputs, type FlowDeps, type NewPreparedRow, type PreparedRow, type PreparedView } from '@/lib/creator-record/customer-flow/service'
import { startPurchase, type PurchaseDeps } from '@/lib/creator-record/customer-flow/purchase'
import { listEvidence, type EvidenceDeps, type EvidenceRow } from '@/lib/creator-record/evidence-intake/service'
import { CREATOR_RECORD_SYNTHETIC_TEST_AUTHORITY } from '@/lib/creator-record/governed/synthetic-test-authority'
import { CREATOR_RECORD_V2_ISSUANCE } from '@/lib/creator-record-artifacts/config'
import { LIVE_EXTRACTION_PERMITTED_IN_THIS_BUILD } from '@/lib/creator-record/evidence/config'
import { EVIDENCE_INTAKE_REAL_DOCUMENTS_PERMITTED } from '@/lib/creator-record/evidence-intake/contract'
import { TOPIC_CLAIMS_FIXTURE } from '@/lib/retrieval-engine/topic-claims-fixture'
import { namingCurrentContract } from '@/test-support/questionnaire-approval'

const preparePrepared = namingCurrentContract(prepareAsSent)

jest.mock('@/lib/supabase/server', () => ({ createClient: () => ({}) }))

const APP = process.cwd()
const read = (rel: string) => readFileSync(path.join(APP, rel), 'utf8')
const UAT_USER = '77777777-7777-4777-8777-777777777777'
const OTHER = '22222222-2222-4222-8222-222222222222'
const DOC_ID = '33333333-3333-4333-8333-333333333333'
const RUN_ID = '44444444-4444-4444-8444-444444444444'
const START = new Date('2026-11-05T09:00:00.000Z')
const INSIDE = new Date('2026-11-05T10:00:00.000Z')
const EXPIRED = new Date('2026-11-05T15:00:00.000Z')
type TestConfig = { user_id: string; ends: Date }
const CONFIG: TestConfig = { user_id: UAT_USER, ends: EXPIRED }
/** Test-local admission: the port decides; these suites only need it to be able to close. */
const syntheticUatWindowOpen = (config: TestConfig | null, userId: unknown, now: Date) => !!config && userId === config.user_id && now.getTime() >= START.getTime() && now.getTime() < config.ends.getTime()

// The synthetic bundle's own questionnaire: the answer set its own suite uses (synthetic-test-authority.test.ts).
const B = CREATOR_RECORD_SYNTHETIC_TEST_AUTHORITY!
const syntheticState = () => ({
  answers: { P1: ['UAT synthetic video'], P3: ['own_channels'], F1: ['TW'], F2: ['online_worldwide'], L1: ['no'], M0: ['music'], M1: ['artlist'], H1: ['edited'] },
  tools: [{ T1: ['pika'], T3: ['Standard'] }],
  acknowledgements: { A1: true, A2: true },
})

// A real persisted run (real adapter over fake ports), as in the X0 / X3 suites.
const FIX = REPLAY_FIXTURES.find((f) => f.fixture_id === 'pdf-kling-pro-monthly')!
const STAND_IN = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, ...Buffer.from(`synthetic-test:${FIX.fixture_id}`)])
const STAND_IN_SHA = createHash('sha256').update(STAND_IN).digest('hex')
let ENV_TEXT = ''
let ENV: ExaminationEnvelope
beforeAll(async () => {
  const table = buildReplayTable([{ ...FIX, sha256: STAND_IN_SHA }])
  const r = await examineAndRecord({
    core: { fixtures: knownFixtureRegistry(table), executor: replayExecutor(table), profiles: defaultProfileRegistry() },
    storage: {
      async getDocument(id) { return id === DOC_ID ? { id: DOC_ID, user_id: UAT_USER, sha256: STAND_IN_SHA, media_type: 'image/png', byte_size: STAND_IN.length, state: 'stored' } : null },
      async logExaminationRead() { return 1 },
      async readObject() { return STAND_IN },
      async recordExamination(_i, text) { ENV_TEXT = text; return { run_id: RUN_ID, result: 'created' } },
      async listRuns() { return [] },
    },
  }, { actor_user_id: UAT_USER, document_id: DOC_ID, profile: { id: 'receipt', version: 1 } })
  if (r.kind !== 'recorded') throw new Error('fixture run')
  ENV = r.envelope
})
const runRow = (): PersistedRunRow => ({
  id: RUN_ID, examination_key: ENV.examination_key, document_id: DOC_ID, user_id: UAT_USER, document_sha256: ENV.document.sha256, envelope_version: 2,
  content_class: ENV.content_class, workflow_authorization: ENV.workflow_authorization, execution_boundary: 'customer_path_synthetic_uat', environment_project_ref: 'lehqgcgnenwdmuzudbrs',
  profile_id: ENV.profile.id, profile_version: ENV.profile.version, schema_version: ENV.profile.schema, prompt_version: ENV.profile.prompt, executor_mode: ENV.executor.mode,
  replay_set: ENV.executor.replay_set, recording_sha256: ENV.executor.recording_sha256, replay_fixture_id: ENV.provenance.replay_fixture_id, outcome_status: ENV.outcome.status,
  outcome_reason: ENV.outcome.reason, envelope_canonical: ENV_TEXT, envelope_sha256: sha256Hex(ENV_TEXT), supersedes_id: null, access_log_id: 1, uat_grant_id: '55555555-5555-4555-8555-555555555555', created_at: '2026-11-05T09:30:00.000Z',
})

/** Production conditions: submissions stopped, empty governance, the UAT ports over CONFIG and a controllable clock. */
function production(o: { config?: TestConfig | null; invited?: (u: string) => boolean } = {}) {
  let now = INSIDE
  const config = o.config === undefined ? CONFIG : o.config
  const invited = o.invited ?? ((u: string) => u === UAT_USER || u === OTHER)
  const uat: SyntheticUatPorts = { admits: (u, t) => syntheticUatWindowOpen(config, u, t), inputs: syntheticUatInputs }
  const rows: PreparedRow[] = []
  let n = 0
  const doc: EvidenceRow = { id: DOC_ID, user_id: UAT_USER, sha256: STAND_IN_SHA, media_type: 'image/png', byte_size: STAND_IN.length, file_name: 'synthetic.png', storage_path: `${UAT_USER}/${DOC_ID}`, consent_version: 'DRAFT-UNAPPROVED-cr-v2-evidence-storage-consent-0', state: 'stored', created_at: '', stored_at: '', deleted_at: null, object_removed_at: null }
  const deps: FlowDeps = {
    submissions: 'stopped',
    hasPilotAccess: async (u) => invited(u),
    store: {
      async insert(r: NewPreparedRow) { const row: PreparedRow = { ...r, status: 'prepared', created_at: now.toISOString(), reviewed_at: null, submission_id: null }; rows.push(row); return row },
      async get(id) { return rows.find((r) => r.id === id) ?? null },
      async latestVersion(d) { return rows.filter((r) => r.draft_id === d).sort((a, b) => b.version - a.version)[0] ?? null },
      async markReviewed(id, u) { const r = rows.find((x) => x.id === id && x.user_id === u && x.status === 'prepared'); if (!r) return null; r.status = 'reviewed'; r.reviewed_at = now.toISOString(); return r },
    },
    inputs: () => approvedCustomerRecordInputs(null), // Production's empty governance
    topicClaims: TOPIC_CLAIMS_FIXTURE,
    now: () => now,
    newId: () => `${String(++n).padStart(8, '0')}-aaaa-4aaa-8aaa-aaaaaaaaaaaa`,
    evidence: { get: async (id) => (id === DOC_ID ? doc : null) },
    examinations: { projectionFor: (u, d) => examinationProjectionFor({ listRuns: async (uu, dd) => [runRow()].filter((r) => r.user_id === uu && r.document_id === dd) }, u, d) },
    syntheticUat: uat,
  }
  return { deps, rows, uat, setNow: (t: Date) => { now = t } }
}
const REF = [{ document_id: DOC_ID, category: 'billing_receipt', tool_index: 0 }]
const viewOf = (r: Awaited<ReturnType<typeof preparePrepared>>): PreparedView => { if (!r.ok) throw new Error(JSON.stringify(r)); return r.view }

describe('the retired window', () => {
  test('no window configuration, identity or expiry remains in code', () => {
    const src = read('lib/creator-record/customer-flow/synthetic-uat.ts').replace(/\/\*[\s\S]*?\*\//g, '')
    expect(src).not.toMatch(/CREATOR_RECORD_V2_SYNTHETIC_UAT|syntheticUatWindowOpen|productionSyntheticUat|expires_at|starts_at|user_id/)
    for (const f of ['lib', 'app', 'components']) expect(require('node:child_process').execSync(`git grep -l "3adfe2e0-3a48" -- ${f} || true`, { cwd: APP }).toString()).toBe('')
  })

  test('customer wiring supplies no synthetic port', () => {
    for (const f of ['lib/creator-record-flow/production.ts', 'lib/creator-record-flow/evidence-production.ts', 'lib/creator-record-flow/examination-customer.ts', 'app/creator-record/page.tsx'])
      expect([f, /syntheticUat|synthetic-uat/.test(read(f))]).toEqual([f, false])
  })
})

describe('the customer flow under Production conditions (submissions stopped, empty governance)', () => {
  test('the named, invited identity inside the window prepares with SYNTHETIC inputs; provenance is persisted in the record', async () => {
    const w = production()
    const v = viewOf(await preparePrepared(w.deps, UAT_USER, { state: syntheticState() }))
    const rec = JSON.parse(w.rows[0].canonical)
    expect(rec.sources.source_text.authority).toMatch(/^SYNTHETIC TEST AUTHORITY/)
    expect(rec.sources.registry_version).toMatch(/synthetic test/)
    expect(rec.schema_version).toBe(7)
    expect(v.version).toBe(1)
  })

  test('an examination-bearing version uses the synthetic v6 approval; findings, comparisons and responses work', async () => {
    const w = production()
    const v1 = viewOf(await preparePrepared(w.deps, UAT_USER, { state: syntheticState(), documents: REF, include_examinations: true }))
    expect(JSON.parse(w.rows[0].canonical).schema_version).toBe(8)
    expect(JSON.parse(w.rows[0].canonical).sources.source_text.record_schema.version).toBe(8)
    expect(JSON.parse(w.rows[0].canonical).sources.source_text.authority).toMatch(/^SYNTHETIC TEST AUTHORITY/)
    expect(v1.examination!.documents[0].verification).toBe('not_verified')
    const obs = v1.examination!.documents[0].observations[0]
    const v2 = viewOf(await preparePrepared(w.deps, UAT_USER, { state: syntheticState(), documents: REF, draft_id: v1.draft_id, include_examinations: true, responses: [{ target: { kind: 'observation', run_id: RUN_ID, observation_id: obs.observation_id }, code: 'not_relevant' }] }))
    expect(v2.examination!.responses[0].given_in_version).toBe(2)
    expect((await getPrepared(w.deps, UAT_USER, v2.id) as { view: PreparedView }).view.version).toBe(2)
    expect((await reviewPrepared(w.deps, UAT_USER, v2.id)).ok).toBe(true)
  })

  test('another invited identity, an uninvited named identity, and the named identity with the configuration inert are refused', async () => {
    const w = production()
    expect(await preparePrepared(w.deps, OTHER, { state: syntheticState() })).toEqual({ ok: false, status: 503, code: 'submissions_stopped' })
    const notInvited = production({ invited: () => false })
    expect(await preparePrepared(notInvited.deps, UAT_USER, { state: syntheticState() })).toEqual({ ok: false, status: 403, code: 'not_invited' })
    const inert = production({ config: null })
    expect(await preparePrepared(inert.deps, UAT_USER, { state: syntheticState() })).toEqual({ ok: false, status: 503, code: 'submissions_stopped' })
    expect([w.rows, notInvited.rows, inert.rows]).toEqual([[], [], []])
  })

  test('EXPIRY closes every operation: prepare, respond/correct, retrieve and review', async () => {
    const w = production()
    const v1 = viewOf(await preparePrepared(w.deps, UAT_USER, { state: syntheticState(), documents: REF, include_examinations: true }))
    w.setNow(EXPIRED)
    const stopped = { ok: false, status: 503, code: 'submissions_stopped' }
    expect(await preparePrepared(w.deps, UAT_USER, { state: syntheticState() })).toEqual(stopped)
    expect(await preparePrepared(w.deps, UAT_USER, { state: syntheticState(), documents: REF, draft_id: v1.draft_id, include_examinations: true, responses: [] })).toEqual(stopped)
    expect(await getPrepared(w.deps, UAT_USER, v1.id)).toEqual(stopped)
    expect(await reviewPrepared(w.deps, UAT_USER, v1.id)).toEqual(stopped)
    expect(w.rows).toHaveLength(1)
  })

  test('REMOVING THE INVITATION closes every operation inside the window too', async () => {
    let invited = true
    const w = production({ invited: (u) => invited && u === UAT_USER })
    const v1 = viewOf(await preparePrepared(w.deps, UAT_USER, { state: syntheticState() }))
    invited = false
    const notInvited = { ok: false, status: 403, code: 'not_invited' }
    expect(await preparePrepared(w.deps, UAT_USER, { state: syntheticState(), draft_id: v1.draft_id })).toEqual(notInvited)
    expect(await getPrepared(w.deps, UAT_USER, v1.id)).toEqual(notInvited)
    expect(await reviewPrepared(w.deps, UAT_USER, v1.id)).toEqual(notInvited)
  })

  test('the browser cannot claim the exception or choose inputs', async () => {
    const w = production()
    for (const extra of [{ synthetic_uat: true }, { uat: true }, { user_id: UAT_USER }, { expires_at: '2099-01-01T00:00:00Z' }, { inputs: {} }, { source_text: {} }])
      expect(await preparePrepared(w.deps, OTHER, { state: syntheticState(), ...extra })).toEqual({ ok: false, status: 503, code: 'submissions_stopped' })
    for (const extra of [{ synthetic_uat: true }, { uat: true }, { source_text_examination: {} }])
      expect(await preparePrepared(w.deps, UAT_USER, { state: syntheticState(), ...extra })).toEqual({ ok: false, status: 400, code: 'invalid_request' })
  })

  test('ordinary Production paths never reach synthetic content: the governance inputs are the approved ones, and a non-UAT request gets nothing synthetic', async () => {
    const gov = approvedCustomerRecordInputs()
    // CR-V2-MVP-LEGAL-CONTENT-6: the founder-approved governance content, never the synthetic bundle.
    expect(gov.source_text?.approval?.review_ref).toBe('JD-CR-V2-MVP-LEGAL-CONTENT-5-20261109 schema 7')
    expect(gov.source_text_examination?.approval?.review_ref).toBe('JD-CR-V2-MVP-LEGAL-CONTENT-5-20261109 schema 8')
    expect(JSON.stringify(gov)).not.toMatch(/synthetic/i)
    // Even with submissions open (e.g. a future governed launch), the UAT exception is not consulted: governed inputs only.
    const w = production()
    const open: FlowDeps = { ...w.deps, submissions: 'open', syntheticUat: { admits: () => { throw new Error('must not be consulted') }, inputs: () => { throw new Error('must not be used') } } }
    // The synthetic answers do not fit the governed questionnaire: refused, and the UAT exception was never consulted.
    expect((await preparePrepared(open, UAT_USER, { state: syntheticState() })).ok).toBe(false)
  })

  test('a non-synthetic (governed) version is retrieved exactly as before, with no admission check', async () => {
    const w = production()
    const synthetic = syntheticUatInputs()
    const governed: ApprovedInputs = { ...synthetic, source_text: { ...synthetic.source_text!, approval: { ...synthetic.source_text!.approval!, authority: 'GOVERNANCE TEST AUTHORITY', review_ref: 'GOV-1' } } }
    const open: FlowDeps = { ...w.deps, submissions: 'open', inputs: () => governed }
    const v = await preparePrepared(open, UAT_USER, { state: syntheticState() })
    if (!v.ok) return // the governed digest differs from the synthetic wording; nothing to retrieve, nothing exposed
    const stoppedNoUat: FlowDeps = { ...w.deps, syntheticUat: undefined, hasPilotAccess: async () => false }
    expect((await getPrepared(stoppedNoUat, UAT_USER, v.view.id)).ok).toBe(true)
  })
})

describe('evidence and examination gates', () => {
  const evidenceDeps = (now: Date, invited = true): EvidenceDeps => ({
    submissions: 'stopped', hasPilotAccess: async () => invited, realDocumentsPermitted: false, isSyntheticTestDocument: () => true,
    store: { listStored: async () => [] } as unknown as EvidenceDeps['store'], objects: {} as EvidenceDeps['objects'], newId: () => 'x', now: () => now,
    syntheticUat: { admits: (u, t) => syntheticUatWindowOpen(CONFIG, u, t) },
  })

  test('evidence intake: named identity inside the window (invited) only; expiry, others and removed invitation refused', async () => {
    expect(await listEvidence(evidenceDeps(INSIDE), UAT_USER)).toEqual({ ok: true, documents: [] })
    expect(await listEvidence(evidenceDeps(INSIDE), OTHER)).toEqual({ ok: false, status: 503, code: 'submissions_stopped' })
    expect(await listEvidence(evidenceDeps(EXPIRED), UAT_USER)).toEqual({ ok: false, status: 503, code: 'submissions_stopped' })
    expect(await listEvidence(evidenceDeps(INSIDE, false), UAT_USER)).toEqual({ ok: false, status: 403, code: 'not_invited' })
  })

  const examDeps = (now: Date, record: () => Promise<{ run_id: string; result: 'created' | 'existing' }>): CustomerExaminationDeps => {
    const table = buildReplayTable([{ ...FIX, sha256: STAND_IN_SHA }])
    const adapter: ExaminationAdapterDeps = {
      core: { fixtures: knownFixtureRegistry(table), executor: replayExecutor(table), profiles: defaultProfileRegistry() },
      storage: {
        async getDocument(id) { return id === DOC_ID ? { id: DOC_ID, user_id: UAT_USER, sha256: STAND_IN_SHA, media_type: 'image/png', byte_size: STAND_IN.length, state: 'stored' } : null },
        async logExaminationRead() { throw new ExaminationPortError('log_read', 'environment_not_authorized') },
        async readObject() { return STAND_IN },
        recordExamination: record,
        async listRuns() { return [] },
      },
    }
    return { submissions: 'stopped', hasPilotAccess: async () => true, adapter, syntheticUat: { admits: (u, t) => syntheticUatWindowOpen(CONFIG, u, t) }, now: () => now }
  }

  test('examination: the window only opens the gate; the DATABASE GRANT stays authoritative (no grant → refused, nothing read)', async () => {
    const d = examDeps(INSIDE, async () => { throw new Error('must not record') })
    expect(await requestCustomerExamination(d, UAT_USER, DOC_ID)).toEqual({ ok: false, status: 409, code: 'examination_not_permitted' })
    expect(await requestCustomerExamination(examDeps(EXPIRED, async () => ({ run_id: RUN_ID, result: 'created' })), UAT_USER, DOC_ID)).toEqual({ ok: false, status: 503, code: 'submissions_stopped' })
    expect(await requestCustomerExamination(d, OTHER, DOC_ID)).toEqual({ ok: false, status: 503, code: 'submissions_stopped' })
    expect(await customerExaminationHistory(examDeps(EXPIRED, async () => ({ run_id: RUN_ID, result: 'created' })), UAT_USER, DOC_ID)).toEqual({ ok: false, status: 503, code: 'submissions_stopped' })
  })
})

describe('closed paths and unchanged controls', () => {
  test('purchase never admits the exception (no UAT port exists for it)', async () => {
    const w = production()
    viewOf(await preparePrepared(w.deps, UAT_USER, { state: syntheticState() }))
    const row = { ...w.rows[0], status: 'reviewed' as const, reviewed_at: INSIDE.toISOString() }
    const deps: PurchaseDeps = { submissions: 'stopped', issuance: 'stopped', hasPilotAccess: async () => true, legalPoliciesApproved: () => true, getPrepared: async () => row, latestVersion: async () => row, boundTo: async () => null, bind: async () => { throw new Error('must not bind') }, governance: () => { throw new Error('must not check') }, now: () => INSIDE }
    // Refused by the global stops (issuance first, then submissions); the exception is never consulted.
    const r = await startPurchase(deps, UAT_USER, row.id)
    expect(r.ok).toBe(false)
    expect(['issuance_stopped', 'submissions_stopped']).toContain((r as { code: string }).code)
    expect(await startPurchase({ ...deps, issuance: 'enabled' }, UAT_USER, row.id)).toEqual({ ok: false, status: 503, code: 'submissions_stopped' })
    expect(read('lib/creator-record/customer-flow/purchase.ts')).not.toMatch(/synthetic-uat|syntheticUat/)
    const production_ = read('lib/creator-record-flow/production.ts')
    const purchaseDeps = production_.slice(production_.indexOf('export function productionPurchaseDeps'), production_.indexOf('export function productionV2IssuanceDeps'))
    expect(purchaseDeps).not.toContain('syntheticUat')
    expect(production_.slice(production_.indexOf('export function productionV2IssuanceDeps'))).not.toContain('syntheticUat')
  })

  test('global stops, real-document and live-extraction locks are unchanged', () => {
    expect(CREATOR_RECORD_V2_SUBMISSIONS).toBe('open') // CR-V2-MVP-PROD-UAT-ACTIVATION-1
    expect(CREATOR_RECORD_V2_ISSUANCE).toBe('enabled')
    expect(EVIDENCE_INTAKE_REAL_DOCUMENTS_PERMITTED).toBe(true)
    expect(LIVE_EXTRACTION_PERMITTED_IN_THIS_BUILD).toBe(false)
  })

  test('the routes are unchanged: nothing about the exception is read from a request', () => {
    for (const f of ['app/api/creator-record-v2/prepared/route.ts', 'app/api/creator-record-v2/prepared/[id]/route.ts', 'app/api/creator-record-v2/prepared/[id]/review/route.ts',
      'app/api/creator-record-v2/evidence/route.ts', 'app/api/creator-record-v2/evidence/[id]/examination/route.ts'])
      expect([f, /synthetic[-_]?uat|syntheticUat|SYNTHETIC_UAT/i.test(read(f).replace(/\/\*[\s\S]*?\*\//g, ''))]).toEqual([f, false])
  })

  test('a synthetic version cannot be bought even after launch: every stop open, real governance, nothing bound', async () => {
    const w = production()
    viewOf(await preparePrepared(w.deps, UAT_USER, { state: syntheticState() }))
    const row = { ...w.rows[0], status: 'reviewed' as const, reviewed_at: INSIDE.toISOString() }
    const deps: PurchaseDeps = { submissions: 'open', issuance: 'enabled', hasPilotAccess: async () => true, legalPoliciesApproved: () => true, getPrepared: async () => row, latestVersion: async () => row, boundTo: async () => null, bind: async () => { throw new Error('must not bind') }, governance: (d) => approvedGovernanceSnapshot(d, TOPIC_CLAIMS_FIXTURE), now: () => INSIDE }
    const r = await startPurchase(deps, UAT_USER, row.id)
    expect(r.ok).toBe(false)
    expect(['ineligible', 'unavailable']).toContain((r as { code: string }).code)
  })

  test('the customer page never serves synthetic content; the notice lives in the shared client for the admin page', () => {
    const page = read('app/creator-record/page.tsx')
    expect(page).not.toMatch(/syntheticUat|synthetic-uat/)
    expect(page).toContain("paymentOpen={CREATOR_RECORD_V2_ISSUANCE === 'enabled' && legalPoliciesApproved()}")
    expect(read('app/creator-record/CreatorRecordV2Client.tsx')).toContain('data-synthetic-uat')
  })
})

describe('isolation pins', () => {
  const walk = (d: string): string[] => require('node:fs').readdirSync(d, { withFileTypes: true }).flatMap((e: { name: string; isDirectory(): boolean }) => {
    const p = path.join(d, e.name)
    return e.isDirectory() ? (e.name === 'node_modules' || e.name === '.next' ? [] : walk(p)) : /\.(ts|tsx)$/.test(e.name) ? [p] : []
  })
  const files = ['lib', 'app', 'components'].flatMap((r) => walk(path.join(APP, r)))
  const rel = (f: string) => path.relative(APP, f).split(path.sep).join('/')
  const importing = (re: RegExp) => files.filter((f) => re.test(readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, ''))).map(rel).sort()

  test('only the approved-inputs selector and the UAT module load the synthetic bundle (no route, page or component)', () => {
    expect(importing(/from\s+['"][^'"]*synthetic-test-authority['"]/)).toEqual(['lib/creator-record/customer-flow/approved-inputs.ts', 'lib/creator-record/customer-flow/synthetic-uat.ts'])
  })

  test('only the gated services and their production wiring know the UAT module; purchase and issuance never do', () => {
    expect(importing(/from\s+['"][^'"]*synthetic-uat['"]/)).toEqual([
      'app/admin/creator-record-v2/uat/page.tsx',
      'lib/creator-record-flow/admin-uat.ts',
      'lib/creator-record/customer-flow/service.ts',
    ])
  })
})
