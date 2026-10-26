/**
 * CR-V2-VERTICAL-SLICE-1 — admin-only access and side-effect boundaries of the
 * internal prototype (route + page).
 */

import { readFileSync } from 'node:fs'
import path from 'node:path'

const checkReviewerContextAccess = jest.fn()
jest.mock('@/lib/reviewer-context/auth', () => ({ checkReviewerContextAccess }))

import * as buildModule from '@/lib/creator-record/prototype/build-draft'
import { POST } from '@/app/api/admin/creator-record-v2/draft/route'

const APP = path.resolve(__dirname, '..', '..')
const req = (body: unknown) => ({ text: async () => (typeof body === 'string' ? body : JSON.stringify(body)) }) as any
const VALID = {
  answers: { P1: ['Night Market'], P3: ['own_channels'], F1: ['TW'], F2: ['online_worldwide'], L1: ['no'], M0: ['none'], H1: ['edited'] },
  tools: [{ T1: ['Pika'], T3: ['Pro'], T4: ['May 2026'] }],
  acknowledgements: { A1: true, A2: true },
}
const stripComments = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')

beforeEach(() => {
  jest.restoreAllMocks()
  checkReviewerContextAccess.mockReset()
  checkReviewerContextAccess.mockResolvedValue({ ok: true, userId: 'admin-1' })
})

describe('admin-only access', () => {
  test('unauthenticated → 401 and the draft is never built', async () => {
    checkReviewerContextAccess.mockResolvedValue({ ok: false, status: 401 })
    const spy = jest.spyOn(buildModule, 'buildCreatorRecordDraft')
    const res = await POST(req(VALID))
    expect(res.status).toBe(401)
    expect(spy).not.toHaveBeenCalled()
  })

  test('authenticated non-admin → 403 and the draft is never built', async () => {
    checkReviewerContextAccess.mockResolvedValue({ ok: false, status: 403 })
    const spy = jest.spyOn(buildModule, 'buildCreatorRecordDraft')
    const res = await POST(req(VALID))
    expect(res.status).toBe(403)
    expect(spy).not.toHaveBeenCalled()
  })

  test('the admin check runs before the body is read', async () => {
    checkReviewerContextAccess.mockResolvedValue({ ok: false, status: 401 })
    const text = jest.fn(async () => JSON.stringify(VALID))
    await POST({ text } as any)
    expect(text).not.toHaveBeenCalled()
  })

  test('the page sits under the admin layout, which requires admin', () => {
    const layout = readFileSync(path.join(APP, 'app', 'admin', 'layout.tsx'), 'utf8')
    expect(layout).toMatch(/await requireAdmin\(\)/)
    expect(readFileSync(path.join(APP, 'app', 'admin', 'creator-record-v2', 'page.tsx'), 'utf8')).toContain('CreatorRecordPrototypeClient')
  })
})

describe('request handling', () => {
  test('authorized + valid → 200 with a pilot-marked draft view', async () => {
    const res = await POST(req(VALID))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.ok).toBe(true)
    expect(data.view.pilot).toBe(true)
    expect(data.view.header.record_id).toMatch(/^PROTOTYPE-[0-9A-F]{8}$/)
    expect(data.view.guidance.cards.map((c: { claim_id: string }) => c.claim_id)).toEqual(['CLAIM-PIKA-COMMERCIAL-USE-BASELINE-001-v1', 'CLAIM-PIKA-COMMERCIAL-USE-PAID-PLAN-PRO-001-v1'])
  })

  test('the route always uses the pilot sources and the real claim fixtures', async () => {
    const spy = jest.spyOn(buildModule, 'buildCreatorRecordDraft')
    await POST(req(VALID))
    const arg = spy.mock.calls[0][0]
    expect(arg.sources.kind).toBe('pilot')
    expect(arg.topicClaims.length).toBeGreaterThan(30)
  })

  test('incomplete answers → 422 with issues', async () => {
    const res = await POST(req({ ...VALID, acknowledgements: { A1: true } }))
    expect(res.status).toBe(422)
    expect((await res.json()).issues).toContainEqual({ q_id: 'A2', tool_index: null, issue: 'acknowledgement_required' })
  })

  test.each([
    ['not JSON', 'not json'],
    ['extra top-level field', { ...VALID, ledger: [] }],
    ['sources override attempt', { ...VALID, sources: 'governed' }],
    ['non-string answer', { ...VALID, answers: { P1: [1] } }],
    ['bad key', { ...VALID, answers: { 'p1;drop': ['x'] } }],
    ['non-boolean acknowledgement', { ...VALID, acknowledgements: { A1: 'yes' } }],
    ['tools not an array', { ...VALID, tools: {} }],
  ])('malformed (%s) → 400', async (_name, body) => {
    const res = await POST(req(body))
    expect(res.status).toBe(400)
  })

  test('oversized body → 413', async () => {
    const res = await POST(req('x'.repeat(40_000)))
    expect(res.status).toBe(413)
  })
})

describe('no side effects', () => {
  const files = [
    'app/api/admin/creator-record-v2/draft/route.ts',
    'app/admin/creator-record-v2/page.tsx',
    'app/admin/creator-record-v2/CreatorRecordPrototypeClient.tsx',
    'components/creator-record/CreatorRecordQuestionnaire.tsx',
    'components/creator-record/DraftRecordView.tsx',
  ]
  test('no database write, storage, payment, email, PDF or AI SDK in the prototype surface', () => {
    for (const f of files) {
      const src = stripComments(readFileSync(path.join(APP, f), 'utf8'))
      expect(src).not.toMatch(/\.(insert|update|upsert|delete|rpc)\(|storage\.|@\/lib\/supabase\/admin|stripe|resend|@\/lib\/emails|@\/lib\/pdf|@anthropic-ai|localStorage|sessionStorage|cookies\(\)/i)
    }
  })
  test('the browser calls only the admin draft route', () => {
    const client = stripComments(readFileSync(path.join(APP, 'app/admin/creator-record-v2/CreatorRecordPrototypeClient.tsx'), 'utf8'))
    const urls = Array.from(client.matchAll(/fetch\('([^']+)'/g)).map((m) => m[1])
    expect(urls).toEqual(['/api/admin/creator-record-v2/draft'])
  })
})
