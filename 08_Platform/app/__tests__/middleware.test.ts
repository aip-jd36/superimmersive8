/**
 * CRC-ACCESS-1 (2026-09-22): the pilot-access-code gate and the CRC API
 * namespace bypass that existed only to work around that gate's own
 * Supabase session-check overhead (P0 timeout diagnostic, 2026-08-21) are
 * both removed from middleware.ts, along with '/crc/:path*' and
 * '/api/crc/:path*' from config.matcher -- neither namespace was ever
 * subject to the Supabase-auth protection below, so once the gate is gone
 * there is no remaining reason for this middleware to run on them at all.
 *
 * Tests D-H (Supabase-auth protection for /dashboard, /submit, /record,
 * /certify) are preserved unchanged in meaning -- this milestone touches
 * none of that logic. The pilot-cookie-specific tests this file used to
 * carry (missing/valid/invalid pilot cookie, /crc/access exemption,
 * pilot-access endpoint exemption, the CRC API bypass reachability matrix)
 * are removed, since the code they proved now no longer exists.
 */

import { NextRequest } from 'next/server'

const mockGetSession = jest.fn()
const mockCreateServerClient = jest.fn((..._args: unknown[]) => ({
  auth: { getSession: mockGetSession },
}))

jest.mock('@supabase/ssr', () => ({
  createServerClient: (...args: unknown[]) => mockCreateServerClient(...args),
}))

import { middleware, config } from '@/middleware'

function makeRequest(path: string, cookies: Record<string, string> = {}): NextRequest {
  const cookieHeader = Object.entries(cookies)
    .map(([k, v]) => `${k}=${v}`)
    .join('; ')
  return new NextRequest(new URL(`https://example.com${path}`), cookieHeader ? { headers: { cookie: cookieHeader } } : undefined)
}

beforeEach(() => {
  mockCreateServerClient.mockClear()
  mockGetSession.mockReset()
  mockGetSession.mockResolvedValue({ data: { session: null } })
})

describe('CRC-ACCESS-1: CRC is no longer part of the access-code middleware gate', () => {
  // 1. CRC is no longer matched by this middleware at all -- proven
  // directly against the exported config, since matcher enforcement
  // itself is a Next.js routing-layer behavior, not something a direct
  // middleware() call can observe.
  test('1: config.matcher no longer includes /crc/:path* or /api/crc/:path*', () => {
    expect(config.matcher).not.toContain('/crc/:path*')
    expect(config.matcher).not.toContain('/api/crc/:path*')
    expect(config.matcher).toEqual(['/dashboard/:path*', '/submit/:path*', '/record/:path*', '/certify/:path*'])
  })

  // 2. /crc reachable without any pilot cookie -- no redirect to the
  // now-deleted /crc/access, no 401.
  test('2: /crc proceeds with no cookie at all -- no redirect, no 401', async () => {
    const response = await middleware(makeRequest('/crc'))
    expect(response.status).not.toBe(401)
    expect(response.status).not.toBe(307)
    expect(response.status).not.toBe(308)
  })

  // 3. CRC APIs are no longer subject to pilot-cookie enforcement -- even
  // called directly (bypassing the matcher the way a unit test must), the
  // function itself no longer returns pilot_access_required for any /api/crc/*
  // path. (In real production traffic this code path is never reached at
  // all for /api/crc/*, per test 1's matcher assertion -- this test proves
  // the function body itself carries no leftover gate logic either way.)
  test('3: /api/crc/turn proceeds with no cookie at all -- no pilot_access_required 401', async () => {
    const response = await middleware(makeRequest('/api/crc/turn'))
    expect(response.status).not.toBe(401)
  })
})

describe('non-CRC protected paths -- unchanged Supabase session behavior (D-H, preserved in meaning)', () => {
  // D. /dashboard/*
  test('4: /dashboard/* with no session redirects to /auth/login, and DOES use the Supabase session pathway', async () => {
    const response = await middleware(makeRequest('/dashboard/settings'))
    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toContain('/auth/login')
    expect(mockCreateServerClient).toHaveBeenCalledTimes(1)
    expect(mockGetSession).toHaveBeenCalledTimes(1)
  })

  // E. /submit/*
  test('5: /submit/* with no session redirects to /auth/login, unaffected by the CRC gate removal', async () => {
    const response = await middleware(makeRequest('/submit/new'))
    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toContain('/auth/login')
    expect(mockCreateServerClient).toHaveBeenCalledTimes(1)
  })

  // F. /record/*
  test('6: /record/* with no session redirects to /auth/login, unaffected by the CRC gate removal', async () => {
    const response = await middleware(makeRequest('/record'))
    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toContain('/auth/login')
    expect(mockCreateServerClient).toHaveBeenCalledTimes(1)
  })

  // G. /certify/*
  test('7: /certify/* with no session redirects to /auth/login, unaffected by the CRC gate removal', async () => {
    const response = await middleware(makeRequest('/certify'))
    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toContain('/auth/login')
    expect(mockCreateServerClient).toHaveBeenCalledTimes(1)
  })

  // H. Supabase auth behavior for a protected route with a valid session
  // remains unchanged -- proceeds, no redirect.
  test('8: /dashboard/* with a valid session proceeds without redirect -- Supabase auth outcome unchanged by this milestone', async () => {
    mockGetSession.mockResolvedValue({ data: { session: { user: { id: 'u1' } } } })
    const response = await middleware(makeRequest('/dashboard/settings'))
    expect(response.status).not.toBe(307)
    expect(mockCreateServerClient).toHaveBeenCalledTimes(1)
    expect(mockGetSession).toHaveBeenCalledTimes(1)
  })
})
