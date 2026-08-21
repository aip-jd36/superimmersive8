/**
 * P0 middleware timeout diagnostic follow-up (2026-08-21). Deterministic
 * regression coverage for the CRC API namespace bypass: proves
 * /api/crc/* requests (once the existing pilot-access-cookie gate has
 * already been evaluated) never construct a Supabase server client or call
 * getSession(), while every other matched path -- /dashboard, /submit,
 * /record, /certify, and CRC PAGE paths like /crc/access -- continues using
 * the exact same Supabase session handling as before this milestone. No
 * live Supabase calls: @supabase/ssr's createServerClient is fully mocked.
 *
 * Test IDs below (A-H) map directly to this milestone's own required test
 * matrix.
 */

import { NextRequest } from 'next/server'

const mockGetSession = jest.fn()
const mockCreateServerClient = jest.fn((..._args: unknown[]) => ({
  auth: { getSession: mockGetSession },
}))

jest.mock('@supabase/ssr', () => ({
  createServerClient: (...args: unknown[]) => mockCreateServerClient(...args),
}))

import { middleware } from '@/middleware'
import { PILOT_ACCESS_COOKIE_NAME, PILOT_ACCESS_COOKIE_VALUE } from '@/lib/crc-engine/pilot-access'

function makeRequest(path: string, cookies: Record<string, string> = {}): NextRequest {
  const cookieHeader = Object.entries(cookies)
    .map(([k, v]) => `${k}=${v}`)
    .join('; ')
  return new NextRequest(new URL(`https://example.com${path}`), cookieHeader ? { headers: { cookie: cookieHeader } } : undefined)
}

const VALID_PILOT_COOKIE = { [PILOT_ACCESS_COOKIE_NAME]: PILOT_ACCESS_COOKIE_VALUE }

beforeEach(() => {
  mockCreateServerClient.mockClear()
  mockGetSession.mockReset()
  mockGetSession.mockResolvedValue({ data: { session: null } })
})

describe('CRC API namespace bypass', () => {
  // A. /api/crc/turn with valid pilot access: proceeds, no Supabase client/getSession.
  test('A: /api/crc/turn with valid pilot cookie proceeds and never constructs the Supabase client', async () => {
    const response = await middleware(makeRequest('/api/crc/turn', VALID_PILOT_COOKIE))
    expect(response.status).not.toBe(401)
    expect(response.status).not.toBe(307)
    expect(response.status).not.toBe(308)
    expect(mockCreateServerClient).not.toHaveBeenCalled()
    expect(mockGetSession).not.toHaveBeenCalled()
  })

  // B. Another representative /api/crc/* endpoint: same bypass.
  test('B: /api/crc/feedback with valid pilot cookie proceeds and never constructs the Supabase client', async () => {
    const response = await middleware(makeRequest('/api/crc/feedback', VALID_PILOT_COOKIE))
    expect(response.status).not.toBe(401)
    expect(mockCreateServerClient).not.toHaveBeenCalled()
    expect(mockGetSession).not.toHaveBeenCalled()
  })

  // Every other CRC API endpoint -- confirms the bypass is namespace-wide,
  // not hardcoded to /api/crc/turn alone (Section 3 of the milestone).
  test.each(['/api/crc/bridge-shown', '/api/crc/cta-click', '/api/crc/results-gate-shown', '/api/crc/pilot-access'])(
    '%s proceeds without constructing the Supabase client',
    async (path) => {
      const response = await middleware(makeRequest(path, VALID_PILOT_COOKIE))
      expect(response.status).not.toBe(401)
      expect(mockCreateServerClient).not.toHaveBeenCalled()
    },
  )

  // C. CRC request without required pilot access: existing rejection
  // behavior is preserved exactly -- the pilot gate is NOT bypassed.
  test('C: /api/crc/turn WITHOUT the pilot cookie still returns 401 pilot_access_required, and never reaches the Supabase block either', async () => {
    const response = await middleware(makeRequest('/api/crc/turn'))
    expect(response.status).toBe(401)
    const body = await response.json()
    expect(body).toEqual({ status: 'pilot_access_required' })
    expect(mockCreateServerClient).not.toHaveBeenCalled()
  })

  test('C2: a CRC PAGE path without the pilot cookie still redirects to /crc/access, unaffected by the API-only bypass', async () => {
    const response = await middleware(makeRequest('/crc/some-page'))
    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toContain('/crc/access')
  })

  test('C3: an invalid (wrong-value) pilot cookie on /api/crc/turn is treated identically to a missing one -- 401, no bypass', async () => {
    const response = await middleware(makeRequest('/api/crc/turn', { [PILOT_ACCESS_COOKIE_NAME]: 'wrong-value' }))
    expect(response.status).toBe(401)
  })
})

describe('non-CRC protected paths -- unchanged Supabase session behavior', () => {
  // D. /dashboard/*
  test('D: /dashboard/* with no session redirects to /auth/login, and DOES use the Supabase session pathway', async () => {
    const response = await middleware(makeRequest('/dashboard/settings'))
    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toContain('/auth/login')
    expect(mockCreateServerClient).toHaveBeenCalledTimes(1)
    expect(mockGetSession).toHaveBeenCalledTimes(1)
  })

  // E. /submit/*
  test('E: /submit/* with no session redirects to /auth/login, unaffected by the CRC bypass', async () => {
    const response = await middleware(makeRequest('/submit/new'))
    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toContain('/auth/login')
    expect(mockCreateServerClient).toHaveBeenCalledTimes(1)
  })

  // F. /record/*
  test('F: /record/* with no session redirects to /auth/login, unaffected by the CRC bypass', async () => {
    const response = await middleware(makeRequest('/record'))
    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toContain('/auth/login')
    expect(mockCreateServerClient).toHaveBeenCalledTimes(1)
  })

  // G. /certify/*
  test('G: /certify/* with no session redirects to /auth/login, unaffected by the CRC bypass', async () => {
    const response = await middleware(makeRequest('/certify'))
    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toContain('/auth/login')
    expect(mockCreateServerClient).toHaveBeenCalledTimes(1)
  })

  // H. Supabase auth behavior for a protected route with a valid session
  // remains unchanged -- proceeds, no redirect.
  test('H: /dashboard/* with a valid session proceeds without redirect -- Supabase auth outcome unchanged by this milestone', async () => {
    mockGetSession.mockResolvedValue({ data: { session: { user: { id: 'u1' } } } })
    const response = await middleware(makeRequest('/dashboard/settings'))
    expect(response.status).not.toBe(307)
    expect(mockCreateServerClient).toHaveBeenCalledTimes(1)
    expect(mockGetSession).toHaveBeenCalledTimes(1)
  })

  // Non-CRC, non-protected path (e.g. a route outside the matcher entirely
  // would never reach middleware at all -- not testable via a direct call,
  // since Next's own routing enforces the matcher; this instead proves an
  // unprotected-but-matched CRC PAGE path, /crc/access, is untouched by the
  // API-only scoping -- still goes through the Supabase block exactly as
  // before, since the bypass is deliberately isCrcApiPath-only.
  test('/crc/access (pilot-exempt CRC page) still proceeds through the existing Supabase block -- the bypass is API-namespace-only, not CRC-namespace-wide', async () => {
    const response = await middleware(makeRequest('/crc/access'))
    expect(response.status).not.toBe(401)
    expect(mockCreateServerClient).toHaveBeenCalledTimes(1)
  })
})
