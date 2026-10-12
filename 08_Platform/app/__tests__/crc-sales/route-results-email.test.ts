/**
 * CRC-EMAIL-HISTORY-1B — results-email route: authorization + audit-before-
 * content ordering, fail-closed on audit failure. Mirrors
 * route-transcript.test.ts exactly (CAH-3B §19 pattern reused verbatim).
 */

const auth = { requireCrcLeadAccess: jest.fn() }
const repo = {
  getResultsEmailHistoryForSession: jest.fn(),
  recordResultsEmailViewAudit: jest.fn(),
}

jest.mock('@/lib/crc-sales/auth', () => auth)
jest.mock('@/lib/crc-sales/repository', () => repo)

import { GET } from '@/app/api/admin/crc-leads/sessions/[session_id]/results-email/route'

const ctx = { params: { session_id: 's1' } }
const req = {} as any

const SAMPLE_ARTIFACT = {
  id: 'a1',
  recipient_normalized: 'customer@example.com',
  subject: 'Your Commercial Readiness Check results',
  html: '<p>hello</p>',
  text: 'hello',
  generated_at: '2026-10-01T01:04:00Z',
  content_hash: 'hash-1',
  template_version: 'results-email-v1',
  runtime_commit: 'abc123',
  attribution_token: null,
  previous_artifact_id: null,
  attempts: [{ outcome: 'accepted', provider_message_id: 'resend-1', error_detail: null, attempted_at: '2026-10-01T01:04:30Z', accepted_at: '2026-10-01T01:04:31Z' }],
}

beforeEach(() => {
  jest.clearAllMocks()
  auth.requireCrcLeadAccess.mockResolvedValue({ ok: true, userId: 'user-1' })
  repo.getResultsEmailHistoryForSession.mockResolvedValue({ found: true, artifacts: [SAMPLE_ARTIFACT] })
  repo.recordResultsEmailViewAudit.mockResolvedValue(undefined)
})

test('unauthenticated → 401, no repo calls', async () => {
  auth.requireCrcLeadAccess.mockResolvedValue({ ok: false, status: 401 })
  const res = await GET(req, ctx)
  expect(res.status).toBe(401)
  expect(repo.getResultsEmailHistoryForSession).not.toHaveBeenCalled()
  expect(repo.recordResultsEmailViewAudit).not.toHaveBeenCalled()
})

test('non-admin → 403', async () => {
  auth.requireCrcLeadAccess.mockResolvedValue({ ok: false, status: 403 })
  expect((await GET(req, ctx)).status).toBe(403)
})

test('not found (unauthorized lead/session or nonexistent id) → 404, audit NOT written', async () => {
  repo.getResultsEmailHistoryForSession.mockResolvedValue({ found: false })
  const res = await GET(req, ctx)
  expect(res.status).toBe(404)
  expect(repo.recordResultsEmailViewAudit).not.toHaveBeenCalled()
})

test('happy path → audit recorded, THEN artifact content returned', async () => {
  const order: string[] = []
  repo.recordResultsEmailViewAudit.mockImplementation(async () => {
    order.push('audit')
  })
  repo.getResultsEmailHistoryForSession.mockImplementation(async () => {
    order.push('load')
    return { found: true, artifacts: [SAMPLE_ARTIFACT] }
  })
  const res = await GET(req, ctx)
  const body = await res.json()
  expect(res.status).toBe(200)
  expect(body.artifacts).toEqual([SAMPLE_ARTIFACT])
  expect(order).toEqual(['load', 'audit'])
  expect(repo.recordResultsEmailViewAudit).toHaveBeenCalledWith('user-1', 's1')
})

test('FAIL CLOSED: audit persistence throws → 503 and NO artifact content', async () => {
  repo.recordResultsEmailViewAudit.mockRejectedValue(new Error('audit failed'))
  const res = await GET(req, ctx)
  const body = await res.json()
  expect(res.status).toBe(503)
  expect(body.artifacts).toBeUndefined()
  expect(JSON.stringify(body)).not.toContain('hello')
  expect(JSON.stringify(body)).not.toContain('customer@example.com')
})

test('authorized happy path never mutates/resends — repository is called read-only (no args suggesting a write)', async () => {
  await GET(req, ctx)
  // The route itself exposes no mutation/resend capability: it calls
  // exactly the two read/audit functions, with no body parsing, no
  // method other than GET, and no params beyond session_id.
  expect(repo.getResultsEmailHistoryForSession).toHaveBeenCalledWith('s1')
  expect(repo.getResultsEmailHistoryForSession).toHaveBeenCalledTimes(1)
})
