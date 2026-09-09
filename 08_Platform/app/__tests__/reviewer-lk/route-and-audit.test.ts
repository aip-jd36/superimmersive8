/**
 * CAH-4E §12 / §16.E — the reviewer-lk route: FAIL-CLOSED AUDIT-BEFORE-CONTENT.
 *
 * Proves:
 *   - unauthenticated / non-admin -> 401/403, nothing selected, nothing audited;
 *   - unknown topic -> 400, NO audit;
 *   - no such submission -> 404, NO audit;
 *   - selection DB error -> 500, NO audit (no false access event);
 *   - one explicit lookup -> exactly one lk_research audit call, BEFORE the body;
 *   - audit THROWS -> 503, ZERO governed LK content;
 *   - the audit call carries actor + submission ONLY (no association/session, no query/claim text);
 *   - page load fetches nothing (source: the panel has no mount fetch).
 */

const checkReviewerContextAccess = jest.fn()
const getSubmissionFactsForReviewerLk = jest.fn()
const recordReviewerLkAccess = jest.fn()

jest.mock('@/lib/reviewer-context/auth', () => ({ checkReviewerContextAccess }))
jest.mock('@/lib/reviewer-lk/repository', () => ({ getSubmissionFactsForReviewerLk, recordReviewerLkAccess }))

import { GET } from '@/app/api/admin/submissions/[id]/reviewer-lk/route'

const ctx = { params: { id: 'sub-1' } }
function reqWithTopic(topic: string | null) {
  const url = new URL('http://x/api/admin/submissions/sub-1/reviewer-lk' + (topic === null ? '' : `?topic=${encodeURIComponent(topic)}`))
  return { nextUrl: url } as any
}

beforeEach(() => {
  jest.clearAllMocks()
  checkReviewerContextAccess.mockResolvedValue({ ok: true, userId: 'reviewer-9' })
  getSubmissionFactsForReviewerLk.mockResolvedValue({ tools_used: null, territory_preferences: 'United States' })
  recordReviewerLkAccess.mockResolvedValue(undefined)
})

test('unauthenticated -> 401; nothing selected, nothing audited', async () => {
  checkReviewerContextAccess.mockResolvedValue({ ok: false, status: 401 })
  const res = await GET(reqWithTopic('commercial_use'), ctx)
  expect(res.status).toBe(401)
  expect(getSubmissionFactsForReviewerLk).not.toHaveBeenCalled()
  expect(recordReviewerLkAccess).not.toHaveBeenCalled()
})

test('non-admin -> 403; nothing selected, nothing audited', async () => {
  checkReviewerContextAccess.mockResolvedValue({ ok: false, status: 403 })
  const res = await GET(reqWithTopic('commercial_use'), ctx)
  expect(res.status).toBe(403)
  expect(recordReviewerLkAccess).not.toHaveBeenCalled()
})

test('missing topic -> 400 unknown_topic, NOT audited', async () => {
  const res = await GET(reqWithTopic(null), ctx)
  expect(res.status).toBe(400)
  expect(await res.json()).toEqual({ ok: false, code: 'unknown_topic' })
  expect(recordReviewerLkAccess).not.toHaveBeenCalled()
})

test('bogus topic (incl. the "unknown" sentinel) -> 400, NOT audited', async () => {
  for (const t of ['not_a_topic', 'unknown']) {
    const res = await GET(reqWithTopic(t), ctx)
    expect(res.status).toBe(400)
  }
  expect(recordReviewerLkAccess).not.toHaveBeenCalled()
})

test('no such submission -> 404 no_such_submission, NOT audited', async () => {
  getSubmissionFactsForReviewerLk.mockResolvedValue(null)
  const res = await GET(reqWithTopic('commercial_use'), ctx)
  expect(res.status).toBe(404)
  expect(await res.json()).toEqual({ ok: false, code: 'no_such_submission' })
  expect(recordReviewerLkAccess).not.toHaveBeenCalled()
})

test('selection DB error -> 500, NO audit event', async () => {
  getSubmissionFactsForReviewerLk.mockRejectedValue(new Error('db down'))
  const res = await GET(reqWithTopic('commercial_use'), ctx)
  expect(res.status).toBe(500)
  expect(recordReviewerLkAccess).not.toHaveBeenCalled()
})

test('AUDIT ORDERING: select, THEN audit, THEN respond 200 with the governed result', async () => {
  const order: string[] = []
  getSubmissionFactsForReviewerLk.mockImplementation(async () => {
    order.push('select')
    return { tools_used: null, territory_preferences: 'United States' }
  })
  recordReviewerLkAccess.mockImplementation(async () => {
    order.push('audit')
  })
  const res = await GET(reqWithTopic('copyright_ownership'), ctx)
  expect(res.status).toBe(200)
  expect(order).toEqual(['select', 'audit'])
  expect(recordReviewerLkAccess).toHaveBeenCalledTimes(1)
  const body = await res.json()
  expect(body.ok).toBe(true)
  expect(body.topic).toBe('copyright_ownership')
  // real fixture: COPY-004 is the copyright_ownership claim
  expect(body.claims.map((c: any) => c.claim_id)).toContain('CLAIM-COPY-004-v1')
})

test('AUDIT FAILS -> 503 and ZERO governed LK content', async () => {
  recordReviewerLkAccess.mockRejectedValue(new Error('audit insert failed'))
  const res = await GET(reqWithTopic('copyright_ownership'), ctx)
  expect(res.status).toBe(503)
  const body = await res.json()
  expect(body).toEqual({ error: 'Living Knowledge research unavailable — access could not be recorded.' })
  expect(JSON.stringify(body)).not.toMatch(/CLAIM-|claims|statement/)
})

test('the audit call carries actor + submission ONLY', async () => {
  await GET(reqWithTopic('commercial_use'), ctx)
  expect(recordReviewerLkAccess).toHaveBeenCalledWith({ actorUserId: 'reviewer-9', submissionId: 'sub-1' })
  const arg = recordReviewerLkAccess.mock.calls[0][0]
  expect(Object.keys(arg).sort()).toEqual(['actorUserId', 'submissionId'])
})

test('three explicit lookups -> three append-only audit calls', async () => {
  await GET(reqWithTopic('commercial_use'), ctx)
  await GET(reqWithTopic('copyright_ownership'), ctx)
  await GET(reqWithTopic('likeness'), ctx)
  expect(recordReviewerLkAccess).toHaveBeenCalledTimes(3)
})

test('the review-page panel performs NO fetch on mount (source scan) — page load creates zero lk_research events', () => {
  const panel = require('fs').readFileSync(
    require('path').join(__dirname, '..', '..', 'app', 'admin', 'submissions', '[id]', 'review', 'ReviewerLkPanel.tsx'),
    'utf-8',
  )
  const lookup = require('fs').readFileSync(
    require('path').join(__dirname, '..', '..', 'app', 'admin', 'submissions', '[id]', 'review', 'ReviewerLkLookup.tsx'),
    'utf-8',
  )
  expect(panel).not.toMatch(/fetch\(|useEffect/)
  // lookup fetches only inside a click handler, never a mount effect
  expect(lookup).not.toMatch(/useEffect\([\s\S]*fetch\(/)
})
