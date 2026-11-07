/**
 * Permanent admin-only UAT routes (invariants I2–I5): signed-out and non-admin requests reach nothing, a lookup failure is a
 * refusal, status is re-read per request, and the identity is always the session user. The services are mocked here.
 */
const access = { value: { ok: false, status: 401 } as { ok: true; userId: string } | { ok: false; status: 401 | 403 } }
const lookups = { n: 0 }
const calls: { fn: string; userId: string; arg?: unknown }[] = []
jest.mock('@/lib/reviewer-context/auth', () => ({ checkReviewerContextAccess: async () => { lookups.n += 1; if (access.value === null) throw new Error('lookup failed'); return access.value } }))
jest.mock('@/lib/supabase/server', () => ({ createClient: () => ({}) }))
jest.mock('@/lib/creator-record-flow/production', () => ({ productionFlowDeps: () => ({}), preparedVersionsOf: async () => [] }))
jest.mock('@/lib/creator-record-flow/evidence-production', () => ({ productionEvidenceDeps: () => ({}) }))
jest.mock('@/lib/creator-record-flow/examination-customer', () => ({
  productionCustomerExaminationDeps: () => ({}),
  emptyRequestBody: async () => true,
  // CR-V2-MVP-LAUNCH-FOUNDATION-1: the shared handler now reads the body through this (empty → no AI permission).
  examinationRequestBody: async () => ({ ok: true, aiPermission: null }),
  examinationError: (e: { status: number }) => new Response(null, { status: e.status }),
}))
jest.mock('@/lib/creator-record-flow/examination-production', () => ({ productionExaminationDeps: () => ({ storage: {} }) }))
jest.mock('@/lib/creator-record/customer-flow/service', () => {
  const view = { id: 'v', draft_id: 'd', version: 1, status: 'prepared', record_ref: 'PREP-v', created_at: 'x', reviewed_at: null, form_state: {}, declarations: { answers: [], acknowledgements: [] }, documents: [], guidance_items: 0 }
  const record = (fn: string) => async (_d: unknown, userId: string, arg: unknown) => ((calls.push({ fn, userId, arg })), { ok: true, view })
  return { preparePrepared: record('prepare'), getPrepared: record('get'), reviewPrepared: record('review'), verifiedRecord: () => null }
})
jest.mock('@/lib/creator-record/customer-flow/examination', () => ({
  CUSTOMER_VISIBLE_BOUNDARIES: [],
  examinationProjectionFor: async () => ({ kind: 'none' }),
  checkCustomerExaminationGate: async () => null,
  requestCustomerExamination: async (_d: unknown, userId: string, arg: unknown) => ((calls.push({ fn: 'examine', userId, arg })), { ok: true, run_id: 'r', result: 'created' }),
  customerExaminationHistory: async (_d: unknown, userId: string, arg: unknown) => ((calls.push({ fn: 'history', userId, arg })), { ok: true, runs: [] }),
}))
jest.mock('@/lib/creator-record/evidence-intake/service', () => ({
  checkEvidenceGate: async () => null,
  listEvidence: async (_d: unknown, userId: string) => ((calls.push({ fn: 'list', userId })), { ok: true, documents: [] }),
  uploadEvidence: async (_d: unknown, userId: string) => ((calls.push({ fn: 'upload', userId })), { ok: true, document: {}, deduplicated: false }),
}))

import { POST as prepare } from '@/app/api/admin/creator-record-v2/uat/prepared/route'
import { GET as open } from '@/app/api/admin/creator-record-v2/uat/prepared/[id]/route'
import { POST as confirm } from '@/app/api/admin/creator-record-v2/uat/prepared/[id]/review/route'
import { GET as list, POST as upload } from '@/app/api/admin/creator-record-v2/uat/evidence/route'
import { GET as history, POST as examine } from '@/app/api/admin/creator-record-v2/uat/evidence/[id]/examination/route'

const ADMIN = '11111111-1111-4111-8111-111111111111'
const params = { params: { id: 'p1' } }
const jsonReq = (body: unknown) => new Request('http://localhost/x', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }) as any
const plain = () => new Request('http://localhost/x', { method: 'POST' }) as any
const all: [string, () => Promise<Response>][] = [
  ['prepare', () => prepare(jsonReq({ state: {} }))],
  ['open', () => open(new Request('http://localhost/x'), params)],
  ['confirm', () => confirm(plain(), params)],
  ['list', () => list()],
  ['upload', () => upload(plain())],
  ['examine', () => examine(plain(), params)],
  ['history', () => history(plain(), params)],
]

beforeEach(() => { calls.length = 0; lookups.n = 0 })

test.each(all)('I2: signed out: %s is 401 and reaches nothing', async (_n, run) => {
  access.value = { ok: false, status: 401 }
  const r = await run()
  expect(r.status).toBe(401)
  expect(r.headers.get('cache-control')).toBe('private, no-store')
  expect(calls).toEqual([])
})

test.each(all)('I3: non-admin: %s is 403 and reaches nothing', async (_n, run) => {
  access.value = { ok: false, status: 403 }
  expect((await run()).status).toBe(403)
  expect(calls).toEqual([])
})

test.each(all)('fail closed: a failing admin lookup on %s reaches nothing', async (_n, run) => {
  access.value = null as never
  expect((await run()).status).toBe(403)
  expect(calls).toEqual([])
})

test('I4: the identity is the session user; a user id in the body is untrusted input, never identity', async () => {
  access.value = { ok: true, userId: ADMIN }
  const body = { state: {}, user_id: 'someone-else' }
  expect((await prepare(jsonReq(body))).status).toBe(200)
  expect(calls).toEqual([{ fn: 'prepare', userId: ADMIN, arg: body }])
})

test('I4: every operation runs as the session administrator, on the path id only', async () => {
  access.value = { ok: true, userId: ADMIN }
  await open(new Request('http://localhost/x'), params)
  await confirm(new Request('http://localhost/x', { method: 'POST', body: JSON.stringify({ status: 'reviewed' }) }) as any, params)
  await list()
  await examine(plain(), params)
  await history(plain(), params)
  expect(calls).toEqual([
    { fn: 'get', userId: ADMIN, arg: 'p1' }, { fn: 'review', userId: ADMIN, arg: 'p1' }, { fn: 'list', userId: ADMIN },
    { fn: 'examine', userId: ADMIN, arg: 'p1' }, { fn: 'history', userId: ADMIN, arg: 'p1' },
  ])
})

test('I5: status is re-read on every request, so a demotion takes effect at once', async () => {
  access.value = { ok: true, userId: ADMIN }
  expect((await list()).status).toBe(200)
  access.value = { ok: false, status: 403 }
  expect((await list()).status).toBe(403)
  expect(lookups.n).toBe(2)
})

test('bodies are parsed as on the customer routes: non-JSON and oversized bodies are refused before the service', async () => {
  access.value = { ok: true, userId: ADMIN }
  expect((await prepare(new Request('http://localhost/x', { method: 'POST', headers: { 'content-type': 'text/plain' }, body: 'x' }) as any)).status).toBe(400)
  expect((await prepare(new Request('http://localhost/x', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{not json' }) as any)).status).toBe(400)
  expect((await prepare(jsonReq({ state: { answers: { P1: ['x'.repeat(40_000)] } } }))).status).toBe(413)
  expect(calls).toEqual([])
})
