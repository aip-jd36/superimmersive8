/**
 * CR-V2-EXAM-INTEGRATION-X2 — the creator examination service and route, with fake storage ports and the REAL
 * persistence adapter + replay core (stand-in bytes rebound to a committed fixture, as the adapter suite does).
 * The database authority itself is exercised by __tests__/db/creator-record-v2-customer-examination.db.test.ts.
 */

import { createHash, randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { buildReplayTable } from '@/lib/creator-record/evidence/replay'
import { REPLAY_FIXTURES } from '@/lib/creator-record/evidence/replay-fixtures.data'
import { canonicalJson, sha256Hex } from '@/lib/creator-record/record-core/canonical'
import type { ExaminationEnvelope } from '@/lib/creator-record/examination/envelope'
import type { ExaminationDocumentRecord } from '@/lib/creator-record/examination/examine-document'
import { defaultProfileRegistry, knownFixtureRegistry, replayExecutor } from '@/lib/creator-record/examination/replay-executor'
import { ExaminationPortError, type ExaminationAdapterDeps, type PersistedRunRow } from '@/lib/creator-record/examination/persistence'
import {
  CUSTOMER_VISIBLE_BOUNDARIES,
  customerExaminationHistory,
  requestCustomerExamination,
  type CustomerExaminationDeps,
} from '@/lib/creator-record/customer-flow/examination'
import { CREATOR_RECORD_V2_SUBMISSIONS } from '@/lib/creator-record/customer-flow/approved-inputs'
import { LIVE_EXTRACTION_PERMITTED_IN_THIS_BUILD } from '@/lib/creator-record/evidence/config'

jest.mock('@/lib/supabase/admin', () => ({ supabaseAdmin: {} }))
jest.mock('@/lib/supabase/server', () => ({ createClient: () => ({}) }))

const OWNER = '11111111-1111-4111-8111-111111111111'
const OTHER = '22222222-2222-4222-8222-222222222222'
const APP = process.cwd()
const read = (rel: string) => readFileSync(path.join(APP, rel), 'utf8')
const sha = (b: Uint8Array) => createHash('sha256').update(b).digest('hex')
const FIX = REPLAY_FIXTURES[0]
const bytesFor = (id: string) => new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, ...Buffer.from(`synthetic-test:${id}`)])

function world(o: { submissions?: 'open' | 'stopped'; invited?: boolean; doc?: Partial<ExaminationDocumentRecord>; bytes?: Uint8Array } = {}) {
  const standIn = bytesFor(FIX.fixture_id)
  const doc: ExaminationDocumentRecord = { id: randomUUID(), user_id: OWNER, sha256: sha(standIn), media_type: 'image/png', byte_size: standIn.length, state: 'stored', ...o.doc }
  const table = buildReplayTable([{ ...FIX, sha256: sha(standIn) }])
  const calls: string[] = []
  const recorded: { text?: string; logged?: [string, string] } = {}
  const fail: { log?: Error; record?: Error; get?: Error; list?: Error } = {}
  let rows: PersistedRunRow[] = []
  const adapter: ExaminationAdapterDeps = {
    core: { fixtures: knownFixtureRegistry(table), executor: replayExecutor(table), profiles: defaultProfileRegistry() },
    storage: {
      async getDocument(id) { calls.push('get'); if (fail.get) throw fail.get; return id === doc.id ? doc : null },
      async logExaminationRead(id, owner) { calls.push('log'); recorded.logged = [id, owner]; if (fail.log) throw fail.log; return 7 },
      async readObject() { calls.push('read'); return o.bytes ?? standIn },
      async recordExamination(_id, text) { calls.push('record'); if (fail.record) throw fail.record; recorded.text = text; return { run_id: randomUUID(), result: 'created' } },
      async listRuns(owner, id) { calls.push('list'); if (fail.list) throw fail.list; return rows.filter((r) => r.user_id === owner && r.document_id === id) },
    },
  }
  const logs: string[] = []
  let pilotChecks = 0
  const deps: CustomerExaminationDeps = {
    submissions: o.submissions ?? 'open',
    hasPilotAccess: async () => { pilotChecks++; return o.invited ?? true },
    adapter,
    log: (e) => logs.push(e),
  }
  return { deps, doc, calls, recorded, fail, logs, setRows: (r: PersistedRunRow[]) => { rows = r }, pilot: () => pilotChecks }
}

function rowFor(env: ExaminationEnvelope, text: string, over: Partial<PersistedRunRow> = {}): PersistedRunRow {
  return {
    id: randomUUID(), examination_key: env.examination_key, document_id: env.document.document_id, user_id: OWNER, document_sha256: env.document.sha256,
    envelope_version: env.envelope.version, content_class: env.content_class, workflow_authorization: env.workflow_authorization,
    execution_boundary: 'customer_path_synthetic_uat', environment_project_ref: 'localpg15examination', profile_id: env.profile.id,
    profile_version: env.profile.version, schema_version: env.profile.schema, prompt_version: env.profile.prompt, executor_mode: env.executor.mode,
    replay_set: env.executor.replay_set, recording_sha256: env.executor.recording_sha256, replay_fixture_id: env.provenance.replay_fixture_id,
    outcome_status: env.outcome.status, outcome_reason: env.outcome.reason, envelope_canonical: text, envelope_sha256: sha256Hex(text),
    supersedes_id: null, access_log_id: 7, uat_grant_id: randomUUID(), created_at: '2026-11-03T00:00:00.000Z', ...over,
  }
}

describe('request: gates, ownership and the unchanged adapter', () => {
  test('STOPPED (Production today): 503 before any port, pilot check or document read', async () => {
    const w = world({ submissions: 'stopped' })
    expect(await requestCustomerExamination(w.deps, OWNER, w.doc.id)).toEqual({ ok: false, status: 503, code: 'submissions_stopped' })
    expect(await customerExaminationHistory(w.deps, OWNER, w.doc.id)).toEqual({ ok: false, status: 503, code: 'submissions_stopped' })
    expect([w.calls, w.pilot()]).toEqual([[], 0])
  })

  test('not invited: 403 before any document read', async () => {
    const w = world({ invited: false })
    expect(await requestCustomerExamination(w.deps, OWNER, w.doc.id)).toEqual({ ok: false, status: 403, code: 'not_invited' })
    expect(await customerExaminationHistory(w.deps, OWNER, w.doc.id)).toEqual({ ok: false, status: 403, code: 'not_invited' })
    expect(w.calls).toEqual([])
  })

  test('another creator’s document, a missing one and a malformed id are the same 404; nothing is logged or read', async () => {
    const w = world({ doc: { user_id: OTHER } })
    for (const id of [w.doc.id, randomUUID(), 'not-a-uuid', '../x', undefined]) {
      expect(await requestCustomerExamination(w.deps, OWNER, id)).toEqual({ ok: false, status: 404, code: 'not_found' })
      expect(await customerExaminationHistory(w.deps, OWNER, id)).toEqual({ ok: false, status: 404, code: 'not_found' })
    }
    expect(w.calls.filter((c) => c !== 'get')).toEqual([])
  })

  test('a pending upload is not ready (409); nothing is logged', async () => {
    const w = world({ doc: { state: 'pending' } })
    expect(await requestCustomerExamination(w.deps, OWNER, w.doc.id)).toEqual({ ok: false, status: 409, code: 'not_ready' })
    expect(w.calls).toEqual(['get'])
  })

  test('HAPPY PATH: the session user is the actor, the receipt profile v1 is used, audit before bytes, the database write decides', async () => {
    const w = world()
    const r = await requestCustomerExamination(w.deps, OWNER, w.doc.id)
    expect(r).toMatchObject({ ok: true, result: 'created' })
    expect(w.calls).toEqual(['get', 'get', 'log', 'read', 'record'])
    expect(w.recorded.logged).toEqual([w.doc.id, OWNER])
    const env = JSON.parse(w.recorded.text!) as ExaminationEnvelope
    expect([env.profile.id, env.profile.version, env.executor.mode, env.provenance.model_calls, env.provenance.prompt_sent]).toEqual(['receipt', 1, 'fixture_replay', 0, false])
    expect(env.observations.every((x) => x.verification === 'not_verified')).toBe(true)
  })

  test.each([
    ['the database refuses the read (no marker, no grant: Production today)', 'log', new ExaminationPortError('log_read', 'environment_not_authorized'), 409, 'examination_not_permitted', ['get', 'get', 'log']],
    ['a UAT grant for another identity or document', 'log', new ExaminationPortError('log_read', 'uat_target_mismatch'), 409, 'examination_not_permitted', ['get', 'get', 'log']],
    ['the read budget is exhausted', 'log', new ExaminationPortError('log_read', 'uat_budget_exhausted'), 409, 'examination_not_permitted', ['get', 'get', 'log']],
    ['the audit log is unavailable', 'log', new ExaminationPortError('log_read', null), 503, 'unavailable', ['get', 'get', 'log']],
    ['the write path refuses (expired / revoked / mismatched)', 'record', new ExaminationPortError('record', 'environment_not_authorized'), 409, 'examination_not_permitted', ['get', 'get', 'log', 'read', 'record']],
    ['the write path is unavailable', 'record', new ExaminationPortError('record', null), 503, 'unavailable', ['get', 'get', 'log', 'read', 'record']],
  ] as const)('fails closed when %s; the bytes are never read before an accepted audit event', async (_n, where, error, status, code, calls) => {
    const w = world()
    if (where === 'log') w.fail.log = error
    else w.fail.record = error
    expect(await requestCustomerExamination(w.deps, OWNER, w.doc.id)).toEqual({ ok: false, status, code })
    expect(w.calls).toEqual(calls)
  })

  test('bytes that are not a committed synthetic fixture are not examinable (422); nothing is recorded', async () => {
    const w = world({ bytes: bytesFor('something-else') })
    expect(await requestCustomerExamination(w.deps, OWNER, w.doc.id)).toEqual({ ok: false, status: 422, code: 'not_examinable' })
    expect(w.calls).not.toContain('record')
  })

  test('a storage failure looking up the document is 503 (never a 404 that would hide a fault)', async () => {
    const w = world()
    w.fail.get = new Error('down')
    expect(await requestCustomerExamination(w.deps, OWNER, w.doc.id)).toEqual({ ok: false, status: 503, code: 'unavailable' })
  })
})

describe('history: own document only, every run re-verified, customer-visible boundaries only', () => {
  async function recordedEnvelope() {
    const w = world()
    await requestCustomerExamination(w.deps, OWNER, w.doc.id)
    const text = w.recorded.text!
    return { w, text, env: JSON.parse(text) as ExaminationEnvelope }
  }

  test('verified runs are returned verbatim, in supersession order', async () => {
    const { w, text, env } = await recordedEnvelope()
    const row = rowFor(env, text)
    w.setRows([row])
    const h = await customerExaminationHistory(w.deps, OWNER, w.doc.id)
    expect(h).toEqual({ ok: true, runs: [{ run_id: row.id, supersedes_id: null, created_at: row.created_at, envelope: env }] })
    expect(canonicalJson((h as { runs: { envelope: unknown }[] }).runs[0].envelope)).toBe(text)
  })

  test('an operator-seeded run is never shown in a customer history (fail closed)', async () => {
    const { w, text, env } = await recordedEnvelope()
    w.setRows([rowFor(env, text, { execution_boundary: 'operator_synthetic_uat' })])
    expect(await customerExaminationHistory(w.deps, OWNER, w.doc.id)).toEqual({ ok: false, status: 503, code: 'unavailable' })
    expect(CUSTOMER_VISIBLE_BOUNDARIES).toEqual(['isolated_synthetic_test', 'customer_path_synthetic_uat'])
  })

  test('a tampered run, an unknown boundary or a storage failure makes the whole history unavailable', async () => {
    const { w, text, env } = await recordedEnvelope()
    w.setRows([rowFor(env, text, { envelope_sha256: 'f'.repeat(64) })])
    expect(await customerExaminationHistory(w.deps, OWNER, w.doc.id)).toMatchObject({ ok: false, code: 'unavailable' })
    w.setRows([rowFor(env, text, { execution_boundary: 'production' })])
    expect(await customerExaminationHistory(w.deps, OWNER, w.doc.id)).toMatchObject({ ok: false, code: 'unavailable' })
    w.fail.list = new Error('down')
    expect(await customerExaminationHistory(w.deps, OWNER, w.doc.id)).toMatchObject({ ok: false, code: 'unavailable' })
  })

  test('the history is read for the session user only (another creator’s rows never match)', async () => {
    const { w, text, env } = await recordedEnvelope()
    w.setRows([rowFor(env, text, { user_id: OTHER })])
    expect(await customerExaminationHistory(w.deps, OWNER, w.doc.id)).toEqual({ ok: true, runs: [] })
  })
})

describe('route: no client authority, stopped in Production, replay only', () => {
  test('the request body must be empty or {}: any field (grant, nonce, envelope, profile) is refused', async () => {
    const { emptyRequestBody } = await import('@/lib/creator-record-flow/examination-customer')
    const req = (body?: string) => new Request('http://local.invalid/', { method: 'POST', body })
    expect(await emptyRequestBody(req())).toBe(true)
    expect(await emptyRequestBody(req(''))).toBe(true)
    expect(await emptyRequestBody(req('{}'))).toBe(true)
    for (const b of ['{"uat_grant_id":"x"}', '{"nonce":"x"}', '{"envelope":{}}', '{"profile":{"id":"receipt","version":1}}', '[]', 'null', 'x', '{"a":1}', ' '.repeat(65) + '{}'])
      expect([b.slice(0, 30), await emptyRequestBody(req(b))]).toEqual([b.slice(0, 30), false])
  })

  test('the production wiring uses the code constants: submissions stopped, live extraction locked off, replay-only core', async () => {
    expect(CREATOR_RECORD_V2_SUBMISSIONS).toBe('stopped')
    expect(LIVE_EXTRACTION_PERMITTED_IN_THIS_BUILD).toBe(false)
    const { productionCustomerExaminationDeps } = await import('@/lib/creator-record-flow/examination-customer')
    const deps = productionCustomerExaminationDeps()
    expect(deps.submissions).toBe('stopped')
    expect(await requestCustomerExamination(deps, OWNER, randomUUID())).toEqual({ ok: false, status: 503, code: 'submissions_stopped' })
    const wiring = read('lib/creator-record-flow/examination-production.ts')
    expect(wiring).toMatch(/core: \{ fixtures: knownFixtureRegistry\(\), executor: replayExecutor\(\), profiles: defaultProfileRegistry\(\) \}/)
  })

  test('the route reads only the session user and the path id; it never reads a grant, nonce, envelope or credential from the request; gate before body', () => {
    const src = read('app/api/creator-record-v2/evidence/[id]/examination/route.ts').replace(/\/\*[\s\S]*?\*\//g, '')
    expect(src).not.toMatch(/request\.(json|formData|text|headers)|searchParams|uat_grant|nonce|envelope_canonical|service_role|SUPABASE/i)
    const handler = read('lib/creator-record-flow/route-handlers.ts')
    expect(handler.indexOf('checkCustomerExaminationGate(deps, userId)')).toBeLessThan(handler.indexOf('emptyRequestBody(request)'))
    expect(handler).toMatch(/requestCustomerExamination\(deps, userId, documentId\)/)
    expect(src).toMatch(/handleExaminationRequest\(request, userId, params\.id, productionCustomerExaminationDeps\(\)\)/)
    expect(src).toMatch(/customerExaminationHistory\(productionCustomerExaminationDeps\(\), userId, params\.id\)/)
    // Neither the service nor its wiring touches a grant, the marker or the status function.
    for (const f of ['lib/creator-record/customer-flow/examination.ts', 'lib/creator-record-flow/examination-customer.ts'])
      expect([f, /uat_grants|examination_environment|uat_status|grant_kind|binding_nonce/.test(read(f).replace(/\/\*[\s\S]*?\*\//g, ''))]).toEqual([f, false])
  })

  test('the prepared-record routes stay unchanged; the prepare service reaches examination code only by type (X3: projections come through its injected port)', () => {
    for (const f of ['app/api/creator-record-v2/prepared/route.ts', 'app/api/creator-record-v2/prepared/[id]/route.ts'])
      expect([f, /examination/.test(read(f))]).toEqual([f, false])
    const service = read('lib/creator-record/customer-flow/service.ts')
    expect(service).not.toMatch(/^import\s+(?!type\s)[^\n]*from '\.\/examination'/m)
    expect(service).not.toMatch(/from '\.\.\/examination\//)
  })
})
