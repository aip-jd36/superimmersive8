/**
 * CAH-3B — transcript route: authorization + audit-before-content ordering,
 * fail-closed on audit failure (§19, §23.E).
 */

const auth = { requireCrcLeadAccess: jest.fn() }
const repo = {
  getEligibleSessionTranscript: jest.fn(),
  recordTranscriptViewAudit: jest.fn(),
}

jest.mock('@/lib/crc-sales/auth', () => auth)
jest.mock('@/lib/crc-sales/repository', () => repo)

import { GET } from '@/app/api/admin/crc-leads/sessions/[session_id]/transcript/route'

const ctx = { params: { session_id: 's1' } }
const req = {} as any

beforeEach(() => {
  jest.clearAllMocks()
  auth.requireCrcLeadAccess.mockResolvedValue({ ok: true, userId: 'user-1' })
  repo.getEligibleSessionTranscript.mockResolvedValue([{ role: 'user', text: 'hi', timestamp: null }])
  repo.recordTranscriptViewAudit.mockResolvedValue(undefined)
})

test('unauthenticated → 401, no repo calls', async () => {
  auth.requireCrcLeadAccess.mockResolvedValue({ ok: false, status: 401 })
  const res = await GET(req, ctx)
  expect(res.status).toBe(401)
  expect(repo.getEligibleSessionTranscript).not.toHaveBeenCalled()
  expect(repo.recordTranscriptViewAudit).not.toHaveBeenCalled()
})

test('non-admin → 403', async () => {
  auth.requireCrcLeadAccess.mockResolvedValue({ ok: false, status: 403 })
  expect((await GET(req, ctx)).status).toBe(403)
})

test('non-eligible / missing session → 404, audit NOT written', async () => {
  repo.getEligibleSessionTranscript.mockResolvedValue(null)
  const res = await GET(req, ctx)
  expect(res.status).toBe(404)
  expect(repo.recordTranscriptViewAudit).not.toHaveBeenCalled()
})

test('happy path → audit recorded, THEN transcript returned', async () => {
  const order: string[] = []
  repo.recordTranscriptViewAudit.mockImplementation(async () => {
    order.push('audit')
  })
  repo.getEligibleSessionTranscript.mockImplementation(async () => {
    order.push('load')
    return [{ role: 'user', text: 'hi', timestamp: null }]
  })
  const res = await GET(req, ctx)
  const body = await res.json()
  expect(res.status).toBe(200)
  expect(body.entries).toEqual([{ role: 'user', text: 'hi', timestamp: null }])
  expect(order).toEqual(['load', 'audit'])
  expect(repo.recordTranscriptViewAudit).toHaveBeenCalledWith('user-1', 's1')
})

test('FAIL CLOSED: audit persistence throws → 503 and NO transcript content', async () => {
  repo.recordTranscriptViewAudit.mockRejectedValue(new Error('audit failed'))
  const res = await GET(req, ctx)
  const body = await res.json()
  expect(res.status).toBe(503)
  expect(body.entries).toBeUndefined()
  expect(JSON.stringify(body)).not.toContain('hi')
})
