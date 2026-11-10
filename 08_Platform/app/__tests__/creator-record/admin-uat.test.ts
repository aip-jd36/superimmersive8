/**
 * Permanent admin-only UAT: the injected dependencies and static boundaries. Security invariants I4, I7–I12, I14, I18–I21
 * (08_Platform/implementation/production-uat/SI8_Production_UAT_Security_Invariants.md). No database, route, model or
 * network. The routes are in admin-uat-routes.test.ts and the database behaviour in
 * __tests__/db/creator-record-v2-admin-uat.db.test.ts.
 */
import { createHash } from 'node:crypto'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { adminUatEvidenceDeps, adminUatExaminationDeps, adminUatFlowDeps, ADMIN_UAT_API_BASE, ADMIN_UAT_BOUNDARIES } from '@/lib/creator-record-flow/admin-uat'
import { productionEvidenceDeps } from '@/lib/creator-record-flow/evidence-production'
import { productionCustomerExaminationDeps } from '@/lib/creator-record-flow/examination-customer'
import { productionFlowDeps } from '@/lib/creator-record-flow/production'
import { CUSTOMER_VISIBLE_BOUNDARIES, customerExaminationHistory, examinationProjectionFor } from '@/lib/creator-record/customer-flow/examination'
import { getPrepared, preparePrepared as prepareAsSent, reviewPrepared, type FlowDeps, type NewPreparedRow, type PreparedRow } from '@/lib/creator-record/customer-flow/service'
import { CREATOR_RECORD_V2_SUBMISSIONS } from '@/lib/creator-record/customer-flow/approved-inputs'
import { CREATOR_RECORD_V2_ISSUANCE } from '@/lib/creator-record-artifacts/config'
import { uploadEvidence, listEvidence } from '@/lib/creator-record/evidence-intake/service'
import { EVIDENCE_INTAKE_REAL_DOCUMENTS_PERMITTED } from '@/lib/creator-record/evidence-intake/contract'
import { LIVE_EXTRACTION_PERMITTED_IN_THIS_BUILD } from '@/lib/creator-record/evidence/config'
import { buildReplayTable } from '@/lib/creator-record/evidence/replay'
import { REPLAY_FIXTURES } from '@/lib/creator-record/evidence/replay-fixtures.data'
import type { ExaminationEnvelope } from '@/lib/creator-record/examination/envelope'
import { examineAndRecord, verifyRunRow, type PersistedRunRow } from '@/lib/creator-record/examination/persistence'
import { defaultProfileRegistry, knownFixtureRegistry, replayExecutor } from '@/lib/creator-record/examination/replay-executor'
import { sha256Hex } from '@/lib/creator-record/record-core/canonical'
import { namingCurrentContract } from '@/test-support/questionnaire-approval'

const preparePrepared = namingCurrentContract(prepareAsSent)

jest.mock('@/lib/supabase/server', () => ({ createClient: () => ({}) }))

const APP = process.cwd()
const read = (rel: string) => readFileSync(path.join(APP, rel), 'utf8')
const ADMIN = '11111111-1111-4111-8111-111111111111'
const OTHER = '22222222-2222-4222-8222-222222222222'
const DOC = '33333333-3333-4333-8333-333333333333'
const RUN = '44444444-4444-4444-8444-444444444444'
const NOW = new Date('2026-11-05T10:00:00.000Z')

const state = () => ({ answers: { P1: ['Admin UAT'], P3: ['own_channels'], F1: ['TW'], F2: ['online_worldwide'], L1: ['no'], M0: ['none'], H1: ['edited'] }, tools: [{ T1: ['kling'], T3: ['Pro'] }], acknowledgements: { A1: true, A2: true } })

function memoryStore() {
  const rows: PreparedRow[] = []
  return {
    rows,
    store: {
      async insert(r: NewPreparedRow) { const row: PreparedRow = { ...r, status: 'prepared', created_at: NOW.toISOString(), reviewed_at: null, submission_id: null }; rows.push(row); return row },
      async get(id: string) { return rows.find((r) => r.id === id) ?? null },
      async latestVersion(d: string) { return rows.filter((r) => r.draft_id === d).sort((a, b) => b.version - a.version)[0] ?? null },
      async markReviewed(id: string, u: string) { const r = rows.find((x) => x.id === id && x.user_id === u && x.status === 'prepared'); if (!r) return null; r.status = 'reviewed'; r.reviewed_at = NOW.toISOString(); return r },
    } as FlowDeps['store'],
  }
}
let n = 0
const newId = () => `${String(++n).padStart(8, '0')}-aaaa-4aaa-8aaa-aaaaaaaaaaaa`
const adminFlow = (store: FlowDeps['store'], over: Partial<FlowDeps> = {}): FlowDeps => ({ ...adminUatFlowDeps(ADMIN), store, now: () => NOW, newId, ...over })

describe('the injected dependencies', () => {
  test('fixed: stopped submissions, synthetic inputs and pilot answers for the authenticated administrator only', async () => {
    const d = adminUatFlowDeps(ADMIN)
    expect(d.submissions).toBe('stopped')
    expect(await d.hasPilotAccess(ADMIN)).toBe(true)
    expect(await d.hasPilotAccess(OTHER)).toBe(false)
    expect(d.syntheticUat!.admits(ADMIN, NOW)).toBe(true)
    expect(d.syntheticUat!.admits(OTHER, NOW)).toBe(false)
    expect(d.syntheticUat!.admits('', NOW)).toBe(false)
  })

  test('I12: real documents stay refused, whatever the global lock says later; only committed fixtures pass', async () => {
    const d = adminUatEvidenceDeps(ADMIN)
    expect(d.realDocumentsPermitted).toBe(false)
    expect(d.submissions).toBe('stopped')
    expect(d.isSyntheticTestDocument('f'.repeat(64))).toBe(false)
    expect(d.isSyntheticTestDocument(REPLAY_FIXTURES[0].sha256)).toBe(true)
    const pdf = new Uint8Array(Buffer.from('%PDF-1.4\n% not a committed fixture\n%%EOF\n'))
    // CR-V2-MVP-LEGAL-CONTENT-6: the consent this wiring records is now the approved one; a real document is still refused.
    expect(await uploadEvidence({ ...d, now: () => NOW }, ADMIN, { bytes: pdf, file_name: 'real.pdf', consent: d.consentVersion })).toMatchObject({ ok: false, code: 'synthetic_documents_only' })
  })

  test('another identity is refused through every admin dependency set', async () => {
    const m = memoryStore()
    expect(await preparePrepared(adminFlow(m.store), OTHER, { state: state() })).toEqual({ ok: false, status: 503, code: 'submissions_stopped' })
    expect(await listEvidence({ ...adminUatEvidenceDeps(ADMIN), now: () => NOW }, OTHER)).toEqual({ ok: false, status: 503, code: 'submissions_stopped' })
    expect(await customerExaminationHistory({ ...adminUatExaminationDeps(ADMIN), now: () => NOW }, OTHER, DOC)).toEqual({ ok: false, status: 503, code: 'submissions_stopped' })
    expect(m.rows).toEqual([])
  })

  test('the real prepare flow gives a synthetic, digest-stamped record that the administrator can reopen and confirm', async () => {
    const m = memoryStore()
    const r = await preparePrepared(adminFlow(m.store), ADMIN, { state: state() })
    if (!r.ok) throw new Error(JSON.stringify(r))
    const rec = JSON.parse(m.rows[0].canonical)
    expect(rec.sources.source_text.authority).toMatch(/^SYNTHETIC TEST AUTHORITY/)
    expect(rec.status).toBe('prepared_not_issued')
    expect((await getPrepared(adminFlow(m.store), ADMIN, r.view.id)).ok).toBe(true)
    expect((await reviewPrepared(adminFlow(m.store), ADMIN, r.view.id)).ok).toBe(true)
  })

  test('I8, I10: customer dependencies give an administrator nothing: no prepare, and a synthetic record stays closed', async () => {
    const m = memoryStore()
    const r = await preparePrepared(adminFlow(m.store), ADMIN, { state: state() })
    if (!r.ok) throw new Error(JSON.stringify(r))
    const customer: FlowDeps = { ...productionFlowDeps(), store: m.store, now: () => NOW, hasPilotAccess: async () => true }
    expect(customer.syntheticUat).toBeUndefined()
    expect(await preparePrepared(customer, ADMIN, { state: state() })).toEqual({ ok: false, status: 503, code: 'submissions_stopped' })
    expect(await getPrepared(customer, ADMIN, r.view.id)).toEqual({ ok: false, status: 503, code: 'submissions_stopped' })
    expect(await reviewPrepared(customer, ADMIN, r.view.id)).toEqual({ ok: false, status: 503, code: 'submissions_stopped' })
    // After launch too: with submissions open the record is still refused to a customer path on non-synthetic inputs.
    const open: FlowDeps = { ...customer, submissions: 'open' }
    expect(await getPrepared(open, ADMIN, r.view.id)).toEqual({ ok: false, status: 404, code: 'not_found' })
  })

  test('I9: customer wiring supplies no synthetic port at all', () => {
    expect(productionFlowDeps().syntheticUat).toBeUndefined()
    expect(productionEvidenceDeps().syntheticUat).toBeUndefined()
    expect(productionCustomerExaminationDeps().syntheticUat).toBeUndefined()
  })

  test('I20: the commercial locks are unchanged', () => {
    expect(CREATOR_RECORD_V2_SUBMISSIONS).toBe('stopped')
    expect(CREATOR_RECORD_V2_ISSUANCE).toBe('stopped')
    expect(EVIDENCE_INTAKE_REAL_DOCUMENTS_PERMITTED).toBe(false)
    expect(LIVE_EXTRACTION_PERMITTED_IN_THIS_BUILD).toBe(false)
  })
})

describe('I14: the admin boundary', () => {
  const FIX = REPLAY_FIXTURES.find((f) => f.fixture_id === 'pdf-kling-pro-monthly')!
  const BYTES = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, ...Buffer.from(`synthetic-test:${FIX.fixture_id}`)])
  const SHA = createHash('sha256').update(BYTES).digest('hex')
  let text = ''
  let env: ExaminationEnvelope
  beforeAll(async () => {
    const table = buildReplayTable([{ ...FIX, sha256: SHA }])
    const r = await examineAndRecord({
      core: { fixtures: knownFixtureRegistry(table), executor: replayExecutor(table), profiles: defaultProfileRegistry() },
      storage: {
        async getDocument() { return { id: DOC, user_id: ADMIN, sha256: SHA, media_type: 'image/png', byte_size: BYTES.length, state: 'stored' } },
        async logExaminationRead() { return 1 },
        async readObject() { return BYTES },
        async recordExamination(_i, t) { text = t; return { run_id: RUN, result: 'created' } },
        async listRuns() { return [] },
      },
    }, { actor_user_id: ADMIN, document_id: DOC, profile: { id: 'receipt', version: 1 } })
    if (r.kind !== 'recorded') throw new Error('fixture run')
    env = r.envelope
  })
  const row = (over: Partial<PersistedRunRow> = {}): PersistedRunRow => ({
    id: RUN, examination_key: env.examination_key, document_id: DOC, user_id: ADMIN, document_sha256: env.document.sha256, envelope_version: 2, content_class: env.content_class,
    workflow_authorization: env.workflow_authorization, execution_boundary: 'admin_synthetic_uat', environment_project_ref: 'lehqgcgnenwdmuzudbrs', profile_id: env.profile.id, profile_version: env.profile.version,
    schema_version: env.profile.schema, prompt_version: env.profile.prompt, executor_mode: env.executor.mode, replay_set: env.executor.replay_set, recording_sha256: env.executor.recording_sha256,
    replay_fixture_id: env.provenance.replay_fixture_id, outcome_status: env.outcome.status, outcome_reason: env.outcome.reason, envelope_canonical: text, envelope_sha256: sha256Hex(text), supersedes_id: null, access_log_id: 1, uat_grant_id: null, created_at: NOW.toISOString(), ...over,
  })
  const listRuns = (r: PersistedRunRow) => ({ listRuns: async () => [r] })

  test('a run carries no grant, verifies, and is readable only under the admin list', async () => {
    expect(verifyRunRow(row(), ADMIN, DOC)).toBeNull()
    expect(verifyRunRow(row({ uat_grant_id: '55555555-5555-4555-8555-555555555555' }), ADMIN, DOC)).toBe('uat_grant_id')
    expect((CUSTOMER_VISIBLE_BOUNDARIES as readonly string[]).includes('admin_synthetic_uat')).toBe(false)
    expect(ADMIN_UAT_BOUNDARIES).toEqual(['admin_synthetic_uat'])
    expect(await examinationProjectionFor(listRuns(row()), ADMIN, DOC)).toEqual({ kind: 'unavailable', reason: 'boundary_not_customer_visible' })
    const p = await examinationProjectionFor(listRuns(row()), ADMIN, DOC, ADMIN_UAT_BOUNDARIES)
    expect(p.kind === 'projection' && [p.projection.execution_boundary, p.projection.verification]).toEqual(['admin_synthetic_uat', 'not_verified'])
  })

  test('the admin list reads nothing else: older boundaries stay out of admin records', async () => {
    const grant = '55555555-5555-4555-8555-555555555555'
    expect(await examinationProjectionFor(listRuns(row({ execution_boundary: 'customer_path_synthetic_uat', uat_grant_id: grant })), ADMIN, DOC, ADMIN_UAT_BOUNDARIES)).toEqual({ kind: 'unavailable', reason: 'boundary_not_customer_visible' })
    expect(await examinationProjectionFor(listRuns(row({ execution_boundary: 'operator_synthetic_uat', uat_grant_id: grant })), ADMIN, DOC, ADMIN_UAT_BOUNDARIES)).toEqual({ kind: 'unavailable', reason: 'boundary_not_customer_visible' })
  })

  test('replay only: an admin run still records no model call and stays not verified', () => {
    expect(env.executor.mode).toBe('fixture_replay')
    expect(env.provenance).toMatchObject({ model_calls: 0, prompt_sent: false })
    expect(env.observations.every((o) => o.verification === 'not_verified')).toBe(true)
    expect(env.workflow_authorization).toBe('not_established')
  })
})

describe('static boundaries', () => {
  const walk = (d: string): string[] => (existsSync(d) ? readdirSync(d).flatMap((e) => { const p = path.join(d, e); return statSync(p).isDirectory() ? walk(p) : [p] }) : [])
  const rel = (f: string) => path.relative(APP, f).split(path.sep).join('/')
  const code = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

  test('I18: the admin routes are exactly these; there is no purchase, checkout, webhook, issuance or delete route', () => {
    expect(walk(path.join(APP, 'app/api/admin/creator-record-v2/uat')).map(rel).sort()).toEqual([
      'app/api/admin/creator-record-v2/uat/evidence/[id]/examination/route.ts',
      'app/api/admin/creator-record-v2/uat/evidence/route.ts',
      'app/api/admin/creator-record-v2/uat/prepared/[id]/review/route.ts',
      'app/api/admin/creator-record-v2/uat/prepared/[id]/route.ts',
      'app/api/admin/creator-record-v2/uat/prepared/route.ts',
    ])
    expect(ADMIN_UAT_API_BASE).toBe('/api/admin/creator-record-v2/uat')
  })

  test('I2–I4: every handler authenticates first, and no route reads an identity or mode from the request', () => {
    for (const f of walk(path.join(APP, 'app/api/admin/creator-record-v2/uat'))) {
      const src = code(readFileSync(f, 'utf8'))
      const handlers = Array.from(src.matchAll(/export async function (GET|POST|PUT|PATCH|DELETE)\b/g))
      expect(handlers.length).toBeGreaterThan(0)
      expect([rel(f), src.split('await adminUatSession()').length - 1]).toEqual([rel(f), handlers.length])
      expect([rel(f), /request\.(json|text)|searchParams|user_id|x-si8|startPurchase|productionPurchaseDeps|supabaseAdmin/.test(src)]).toEqual([rel(f), false])
    }
  })

  test('I18: the page offers no payment and takes no identity from the URL', () => {
    const page = code(read('app/admin/creator-record-v2/uat/page.tsx'))
    expect(page).toContain('paymentOpen={false}')
    expect(page).toContain('checkReviewerContextAccess()')
    expect(page).not.toMatch(/startPurchase|productionPurchaseDeps|user_id|searchParams\.(user|admin)/)
    expect(code(read('lib/creator-record-flow/admin-uat.ts'))).not.toMatch(/startPurchase|productionPurchaseDeps|productionV2IssuanceDeps|renderV2ForIssuance/)
  })

  test('I21: nothing a route calls can send email or reach a model: no such import in the services and wiring it runs', () => {
    const files = ['lib/creator-record-flow/admin-uat.ts', 'lib/creator-record-flow/route-handlers.ts', 'lib/creator-record-flow/evidence-production.ts', 'lib/creator-record-flow/examination-customer.ts', 'lib/creator-record-flow/examination-production.ts', 'lib/creator-record/customer-flow/service.ts', 'lib/creator-record/customer-flow/examination.ts', 'lib/creator-record/evidence-intake/service.ts', 'lib/creator-record/examination/persistence.ts', 'lib/creator-record/examination/replay-executor.ts']
    for (const f of files) expect([f, /from\s+['"][^'"]*(resend|emails|stripe|anthropic|live-caller)[^'"]*['"]/i.test(read(f))]).toEqual([f, false])
  })

  test('I8: customer routes and services hold no administrator branch', () => {
    for (const f of ['app/api/creator-record-v2/prepared/route.ts', 'app/api/creator-record-v2/prepared/[id]/route.ts', 'app/api/creator-record-v2/prepared/[id]/review/route.ts', 'app/api/creator-record-v2/evidence/route.ts', 'app/api/creator-record-v2/evidence/[id]/examination/route.ts', 'app/creator-record/page.tsx', 'lib/creator-record/customer-flow/service.ts', 'lib/creator-record/customer-flow/examination.ts', 'lib/creator-record-flow/route-handlers.ts'])
      expect([f, /is_admin|isAdminUser|requireAdmin|checkReviewerContextAccess|admin-uat/.test(code(read(f)))]).toEqual([f, false])
  })

  test('operator tooling is retired; its SQL stays readable; history is untouched', () => {
    expect(existsSync(path.join(APP, 'scripts/creator-record-v2-uat/examination-uat.ts'))).toBe(false)
    expect(existsSync(path.join(APP, 'lib/creator-record-flow/examination-uat.ts'))).toBe(false)
    const OP = 'supabase/operator/creator-record-v2-uat'
    for (const f of ['create_grant.sql', 'create_customer_path_grant.sql', 'revoke_grant.sql', 'invite_pilot_user.sql', 'remove_pilot_user.sql']) {
      expect([f, existsSync(path.join(APP, OP, f))]).toEqual([f, false])
      expect([f, existsSync(path.join(APP, OP, 'archive', f))]).toEqual([f, true])
    }
    for (const m of ['20261105000000_creator_record_v2_operator_synthetic_uat.sql', '20261106000000_creator_record_v2_customer_path_uat.sql']) expect(existsSync(path.join(APP, 'supabase/migrations', m))).toBe(true)
  })

  test('the apply pack is current, pins exact digests and refuses without Production identity evidence', () => {
    const PACK = 'supabase/operator/creator-record-v2-uat/production-apply'
    expect(require('node:child_process').execFileSync(process.execPath, [path.join(APP, PACK, 'build_20261107.js'), '--check'], { cwd: APP }).toString()).toContain('up to date')
    const expected = JSON.parse(read(`${PACK}/expected.json`))
    const verify = read(`${PACK}/09_verify_20261107.sql`)
    for (const digests of Object.values(expected.functions_20261107) as string[][]) for (const d of digests) expect(verify).toContain(d)
    expect(verify).not.toMatch(/prosrc LIKE/)
    const apply = read(`${PACK}/08_apply_20261107.sql`)
    expect(apply).toContain('ASSESS-005-2026-07-12')
    expect(apply).toContain(expected.prod9_20261107.run_id)
    expect(apply.indexOf('does not look like Production')).toBeLessThan(apply.indexOf('BEGIN VERBATIM'))
    expect(apply.indexOf('CR-V2-UAT-PROD-9 history was not found')).toBeLessThan(apply.indexOf('BEGIN VERBATIM'))
    expect(apply.lastIndexOf('COMMIT;')).toBeGreaterThan(apply.indexOf('post-check failed'))
  })

  test('the separate public harness is left in place until its scheduled expiry', () => {
    expect(existsSync(path.join(APP, 'app/uat/creator-record-v2/page.tsx'))).toBe(true)
    expect(existsSync(path.join(APP, 'app/api/uat/creator-record-v2/draft/route.ts'))).toBe(true)
    expect(read('lib/creator-record/public-uat/config.ts')).toContain('2026-11-10T07:00:00Z')
  })
})
