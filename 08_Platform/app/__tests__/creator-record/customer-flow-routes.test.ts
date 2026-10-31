/**
 * CR-V2-MVP-M2 — the Creator Record v2 customer routes: the creator is the session user,
 * never a request field; unauthenticated requests reach nothing; bodies are size-limited
 * JSON; responses are private and never cached.
 */

const session = { userId: null as string | null }
const calls: { fn: string; userId: string; arg: unknown }[] = []
jest.mock('@/lib/supabase/server', () => ({
  createClient: () => ({ auth: { getUser: async () => (session.userId ? { data: { user: { id: session.userId } }, error: null } : { data: { user: null }, error: { message: 'no session' } }) } }),
}))
jest.mock('@/lib/creator-record-flow/production', () => ({ productionFlowDeps: () => ({}) }))
jest.mock('@/lib/creator-record/customer-flow/service', () => {
  const view = { id: 'v', draft_id: 'd', version: 1, status: 'prepared', record_ref: 'PREP-v', created_at: 'x', reviewed_at: null, form_state: {}, declarations: { answers: [], acknowledgements: [] }, guidance_items: 0 }
  const record = (fn: string) => async (_deps: unknown, userId: string, arg: unknown) => ((calls.push({ fn, userId, arg })), { ok: true, view })
  return { preparePrepared: record('prepare'), getPrepared: record('get'), reviewPrepared: record('review') }
})

import { POST as prepare } from '@/app/api/creator-record-v2/prepared/route'
import { GET as get } from '@/app/api/creator-record-v2/prepared/[id]/route'
import { POST as review } from '@/app/api/creator-record-v2/prepared/[id]/review/route'

const USER = '11111111-1111-4111-8111-111111111111'
const json = (body: unknown, headers: Record<string, string> = { 'content-type': 'application/json' }) =>
  new Request('http://localhost/api/creator-record-v2/prepared', { method: 'POST', headers, body: typeof body === 'string' ? body : JSON.stringify(body) }) as any

beforeEach(() => { calls.length = 0; session.userId = null })

test('unauthenticated requests reach nothing', async () => {
  expect((await prepare(json({ state: {} }))).status).toBe(401)
  expect((await get(new Request('http://localhost/x'), { params: { id: 'a' } })).status).toBe(401)
  expect((await review(new Request('http://localhost/x', { method: 'POST' }), { params: { id: 'a' } })).status).toBe(401)
  expect(calls).toEqual([])
})

test('the creator is the session user; a user id in the body is passed through untrusted, never used as identity', async () => {
  session.userId = USER
  const body = { state: { answers: {} }, user_id: 'someone-else' }
  const res = await prepare(json(body))
  expect(res.status).toBe(200)
  expect(res.headers.get('cache-control')).toBe('private, no-store')
  expect(calls).toEqual([{ fn: 'prepare', userId: USER, arg: body }])
})

test('view and review use the session user and the path id only', async () => {
  session.userId = USER
  expect((await get(new Request('http://localhost/x'), { params: { id: 'p1' } })).status).toBe(200)
  expect((await review(new Request('http://localhost/x', { method: 'POST', body: JSON.stringify({ status: 'reviewed', sha256: 'f'.repeat(64) }) }), { params: { id: 'p2' } })).status).toBe(200)
  expect(calls).toEqual([{ fn: 'get', userId: USER, arg: 'p1' }, { fn: 'review', userId: USER, arg: 'p2' }])
})

test('non-JSON, malformed and oversized bodies are refused before the service', async () => {
  session.userId = USER
  expect((await prepare(json({ state: {} }, { 'content-type': 'text/plain' }))).status).toBe(400)
  expect((await prepare(json('{not json'))).status).toBe(400)
  expect((await prepare(json({ state: { answers: { P1: ['x'.repeat(40_000)] } } }))).status).toBe(413)
  expect(calls).toEqual([])
})
