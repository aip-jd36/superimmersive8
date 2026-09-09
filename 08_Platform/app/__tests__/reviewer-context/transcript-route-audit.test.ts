/**
 * CAH-4C §4 / §5 / §12 — the transcript route: FAIL-CLOSED AUDIT-BEFORE-CONTENT.
 *
 * The ORDERING is the contract. Proves:
 *   - unauthenticated / non-admin -> 401/403, nothing resolved, nothing audited;
 *   - not an active association of this submission -> 404, NOT audited;
 *   - transcript-resolve DB error -> 500, NOT audited (no false access event);
 *   - resolve OK + audit OK -> 200 with { entries } — and the audit call
 *     happened BEFORE the response body was produced;
 *   - resolve OK + audit THROWS -> 503, ZERO transcript bytes (not log-and-continue);
 *   - the audit event carries the correct actor / submission / association / session;
 *   - repeated deliberate opens create an append-only history (N audit calls).
 */

const checkReviewerContextAccess = jest.fn()
const getReviewerCrcTranscript = jest.fn()
const recordReviewerTranscriptAccess = jest.fn()

jest.mock('@/lib/reviewer-context/auth', () => ({ checkReviewerContextAccess }))
jest.mock('@/lib/reviewer-context/service', () => ({ getReviewerCrcTranscript }))
jest.mock('@/lib/reviewer-context/repository', () => ({ recordReviewerTranscriptAccess }))

import { GET } from '@/app/api/admin/submissions/[id]/reviewer-crc-context/[association_id]/transcript/route'

const ctx = { params: { id: 'sub-1', association_id: 'assoc-1' } }
const req = {} as any
const ENTRIES = [
  { role: 'user', text: 'hello', timestamp: null },
  { role: 'assistant', text: 'hi', timestamp: null },
]

beforeEach(() => {
  jest.clearAllMocks()
  checkReviewerContextAccess.mockResolvedValue({ ok: true, userId: 'reviewer-9' })
  getReviewerCrcTranscript.mockResolvedValue({ ok: true, crcSessionId: 'sess-1', entries: ENTRIES })
  recordReviewerTranscriptAccess.mockResolvedValue(undefined)
})

test('unauthenticated -> 401; nothing resolved, nothing audited', async () => {
  checkReviewerContextAccess.mockResolvedValue({ ok: false, status: 401 })
  const res = await GET(req, ctx)
  expect(res.status).toBe(401)
  expect(getReviewerCrcTranscript).not.toHaveBeenCalled()
  expect(recordReviewerTranscriptAccess).not.toHaveBeenCalled()
})

test('non-admin -> 403; nothing resolved, nothing audited', async () => {
  checkReviewerContextAccess.mockResolvedValue({ ok: false, status: 403 })
  const res = await GET(req, ctx)
  expect(res.status).toBe(403)
  expect(getReviewerCrcTranscript).not.toHaveBeenCalled()
  expect(recordReviewerTranscriptAccess).not.toHaveBeenCalled()
})

test('not an active association of this submission -> 404, NOT audited', async () => {
  getReviewerCrcTranscript.mockResolvedValue({ ok: false, code: 'no_such_active_association' })
  const res = await GET(req, ctx)
  expect(res.status).toBe(404)
  expect(recordReviewerTranscriptAccess).not.toHaveBeenCalled()
  expect(await res.json()).toEqual({ error: 'Not found' })
})

test('session_unavailable -> 404, NOT audited', async () => {
  getReviewerCrcTranscript.mockResolvedValue({ ok: false, code: 'session_unavailable' })
  const res = await GET(req, ctx)
  expect(res.status).toBe(404)
  expect(recordReviewerTranscriptAccess).not.toHaveBeenCalled()
})

test('transcript-resolve throws (DB error) -> 500, NO audit event written', async () => {
  getReviewerCrcTranscript.mockRejectedValue(new Error('db down'))
  const res = await GET(req, ctx)
  expect(res.status).toBe(500)
  expect(recordReviewerTranscriptAccess).not.toHaveBeenCalled()
  // and zero transcript content
  expect(JSON.stringify(await res.json())).not.toMatch(/hello|hi|entries/)
})

test('AUDIT ORDERING: audit is called BEFORE the response body; success -> 200 { entries }', async () => {
  const order: string[] = []
  getReviewerCrcTranscript.mockImplementation(async () => {
    order.push('resolve')
    return { ok: true, crcSessionId: 'sess-1', entries: ENTRIES }
  })
  recordReviewerTranscriptAccess.mockImplementation(async () => {
    order.push('audit')
  })

  const res = await GET(req, ctx)

  expect(res.status).toBe(200)
  expect(await res.json()).toEqual({ entries: ENTRIES })
  // resolve, THEN audit, THEN (implicitly) respond
  expect(order).toEqual(['resolve', 'audit'])
  expect(recordReviewerTranscriptAccess).toHaveBeenCalledTimes(1)
})

test('AUDIT FAILS -> 503 and ZERO transcript bytes (not log-and-continue)', async () => {
  recordReviewerTranscriptAccess.mockRejectedValue(new Error('audit insert failed'))
  const res = await GET(req, ctx)
  expect(res.status).toBe(503)
  const body = await res.json()
  expect(body).toEqual({ error: 'Transcript unavailable — access could not be recorded.' })
  expect(JSON.stringify(body)).not.toMatch(/hello|hi|"entries"/)
})

test('the audit event carries the correct actor / submission / association / session', async () => {
  await GET(req, ctx)
  expect(recordReviewerTranscriptAccess).toHaveBeenCalledWith({
    actorUserId: 'reviewer-9',
    submissionId: 'sub-1',
    associationId: 'assoc-1',
    crcSessionId: 'sess-1', // server-derived by the service, echoed to the audit — never client-supplied
  })
})

test('repeated deliberate opens produce an append-only access history (one audit call each)', async () => {
  await GET(req, ctx)
  await GET(req, ctx)
  await GET(req, ctx)
  expect(recordReviewerTranscriptAccess).toHaveBeenCalledTimes(3)
  for (const call of recordReviewerTranscriptAccess.mock.calls) {
    expect(call[0]).toMatchObject({ actorUserId: 'reviewer-9', submissionId: 'sub-1', associationId: 'assoc-1' })
  }
})

test('the route reads no request body and names no crc_session_id (source scan)', () => {
  const raw = require('fs').readFileSync(
    require('path').join(
      __dirname, '..', '..', 'app', 'api', 'admin', 'submissions', '[id]',
      'reviewer-crc-context', '[association_id]', 'transcript', 'route.ts',
    ),
    'utf-8',
  )
  const src = raw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')
  expect(src).not.toMatch(/request\.(json|formData|text)|\.json\(\)/)
  expect(src).not.toMatch(/crc_session_id|crcSessionId\s*[:=]\s*(params|body|req)/)
  expect(src).toMatch(/export async function GET\b/)
  expect(src).not.toMatch(/export async function (POST|PUT|PATCH|DELETE)\b/)
})
