/**
 * CAH-4B §6 / §14 — the reviewer-context route: authorization + submission
 * scoping. The auth wrapper and the read service are mocked; this suite
 * proves the ROUTE's own behavior.
 *   - unauthenticated -> 401, service NOT called;
 *   - non-admin -> 403, service NOT called;
 *   - authorized -> 200, service called with the SUBMISSION id from the path;
 *   - the route accepts no request body and no crc_session_id of any kind.
 */

const checkReviewerContextAccess = jest.fn()
const getReviewerCrcContext = jest.fn()

jest.mock('@/lib/reviewer-context/auth', () => ({ checkReviewerContextAccess }))
jest.mock('@/lib/reviewer-context/service', () => ({ getReviewerCrcContext }))

import { GET } from '@/app/api/admin/submissions/[id]/reviewer-crc-context/route'

const ctx = { params: { id: 'submission-123' } }
const req = {} as any

beforeEach(() => {
  jest.clearAllMocks()
  checkReviewerContextAccess.mockResolvedValue({ ok: true, userId: 'user-1' })
  getReviewerCrcContext.mockResolvedValue({ linked: false })
})

test('unauthenticated -> 401, service not called', async () => {
  checkReviewerContextAccess.mockResolvedValue({ ok: false, status: 401 })
  const res = await GET(req, ctx)
  expect(res.status).toBe(401)
  expect(getReviewerCrcContext).not.toHaveBeenCalled()
})

test('non-admin -> 403, service not called', async () => {
  checkReviewerContextAccess.mockResolvedValue({ ok: false, status: 403 })
  const res = await GET(req, ctx)
  expect(res.status).toBe(403)
  expect(getReviewerCrcContext).not.toHaveBeenCalled()
})

test('authorized -> 200, service called with the SUBMISSION id from the path only', async () => {
  getReviewerCrcContext.mockResolvedValue({ linked: true, associations: [] })
  const res = await GET(req, ctx)
  expect(res.status).toBe(200)
  expect(getReviewerCrcContext).toHaveBeenCalledTimes(1)
  expect(getReviewerCrcContext).toHaveBeenCalledWith('submission-123')
  expect(await res.json()).toEqual({ linked: true, associations: [] })
})

test('the route source accepts no body and no crc_session_id parameter', () => {
  const raw = require('fs').readFileSync(
    require('path').join(__dirname, '..', '..', 'app', 'api', 'admin', 'submissions', '[id]', 'reviewer-crc-context', 'route.ts'),
    'utf-8',
  )
  // strip comments — a doc comment legitimately explains "no crc_session_id"
  const src = raw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')
  expect(src).not.toMatch(/\.json\(\)/)          // no request-body parse
  expect(src).not.toMatch(/request\.(json|formData|text)/)
  expect(src).not.toMatch(/crc_session_id/)      // never names a session id in code
  expect(src).not.toMatch(/searchParams|nextUrl/) // no query-param session id either
  // only export is GET
  expect(src).toMatch(/export async function GET\b/)
  expect(src).not.toMatch(/export async function (POST|PUT|PATCH|DELETE)\b/)
})

test('auth wrapper is a distinct module from the projection/service (source-level separation)', () => {
  const authSrc = require('fs').readFileSync(
    require('path').join(__dirname, '..', '..', 'lib', 'reviewer-context', 'auth.ts'),
    'utf-8',
  )
  // the auth module does not compute or project anything
  expect(authSrc).not.toMatch(/buildCrcProjectContext|getReviewerCrcContext|compareCrcStateIdentity/)
  // and the isolation comment marks the single future change point
  expect(authSrc).toMatch(/is_admin/)
  expect(authSrc).toMatch(/FUTURE/i)
})
