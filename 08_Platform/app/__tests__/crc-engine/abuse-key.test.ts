/**
 * Abuse-key derivation tests (CRC Identity + Abuse Prevention + Analytics
 * milestone, design report §4).
 */

import { resolveClientIp, normalizeIp, deriveAbuseKey, LOCAL_DEV_IP_SENTINEL } from '../../lib/crc-engine/abuse-key'

function fakeRequest(headers: Record<string, string>): { headers: { get: (name: string) => string | null } } {
  return { headers: { get: (name: string) => headers[name.toLowerCase()] ?? null } }
}

describe('resolveClientIp', () => {
  test('prefers x-vercel-forwarded-for when present', () => {
    const req = fakeRequest({ 'x-vercel-forwarded-for': '1.1.1.1', 'x-forwarded-for': '2.2.2.2', 'x-real-ip': '3.3.3.3' })
    expect(resolveClientIp(req as any)).toBe('1.1.1.1')
  })

  test('falls back to the first entry of x-forwarded-for when x-vercel-forwarded-for is absent', () => {
    const req = fakeRequest({ 'x-forwarded-for': '2.2.2.2, 9.9.9.9', 'x-real-ip': '3.3.3.3' })
    expect(resolveClientIp(req as any)).toBe('2.2.2.2')
  })

  test('falls back to x-real-ip when neither forwarded header is present', () => {
    const req = fakeRequest({ 'x-real-ip': '3.3.3.3' })
    expect(resolveClientIp(req as any)).toBe('3.3.3.3')
  })

  test('falls back to the local-dev sentinel when no header is present at all', () => {
    const req = fakeRequest({})
    expect(resolveClientIp(req as any)).toBe(LOCAL_DEV_IP_SENTINEL)
  })
})

describe('normalizeIp', () => {
  test('an IPv4 address passes through unchanged', () => {
    expect(normalizeIp('203.0.113.42')).toBe('203.0.113.42')
  })

  test('an IPv6 address is truncated to a /56-equivalent prefix (top 4 hextets)', () => {
    expect(normalizeIp('2001:db8:1234:5678:9abc:def0:1234:5678')).toBe('2001:db8:1234:5678::/56')
  })

  test('two IPv6 addresses differing only in the low-order hextets normalize to the SAME key material', () => {
    expect(normalizeIp('2001:db8:1234:5678:aaaa:bbbb:cccc:dddd')).toBe(normalizeIp('2001:db8:1234:5678:1111:2222:3333:4444'))
  })

  test('the local-dev sentinel passes through unchanged, not misparsed as an address', () => {
    expect(normalizeIp(LOCAL_DEV_IP_SENTINEL)).toBe(LOCAL_DEV_IP_SENTINEL)
  })
})

describe('deriveAbuseKey', () => {
  const ORIGINAL_ENV = process.env
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV, CRC_ABUSE_KEY_HMAC_SECRET: 'test-secret' }
  })
  afterAll(() => {
    process.env = ORIGINAL_ENV
  })

  test('the same normalized IP always derives the same key', () => {
    expect(deriveAbuseKey('203.0.113.42')).toBe(deriveAbuseKey('203.0.113.42'))
  })

  test('different normalized IPs derive different keys', () => {
    expect(deriveAbuseKey('203.0.113.42')).not.toBe(deriveAbuseKey('203.0.113.99'))
  })

  test('the derived key never contains the raw IP as a substring', () => {
    const key = deriveAbuseKey('203.0.113.42')
    expect(key).not.toContain('203.0.113.42')
  })

  test('throws (fail-loud, caller handles fail-open) when CRC_ABUSE_KEY_HMAC_SECRET is not configured', () => {
    delete process.env.CRC_ABUSE_KEY_HMAC_SECRET
    expect(() => deriveAbuseKey('203.0.113.42')).toThrow('CRC_ABUSE_KEY_HMAC_SECRET')
  })

  test('a different secret derives a different key for the same IP', () => {
    const key1 = deriveAbuseKey('203.0.113.42')
    process.env.CRC_ABUSE_KEY_HMAC_SECRET = 'a-different-secret'
    const key2 = deriveAbuseKey('203.0.113.42')
    expect(key1).not.toBe(key2)
  })
})
