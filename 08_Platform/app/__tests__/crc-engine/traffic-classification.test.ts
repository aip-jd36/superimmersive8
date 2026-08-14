/**
 * Traffic classification tests (CRC Identity + Abuse Prevention + Analytics
 * milestone, design report §5). Every branch is server-determined -- these
 * tests exist specifically to lock in that a client-supplied signal can
 * never launder itself into a privileged classification (automated_eval,
 * internal_test) or contaminate real pilot analytics.
 */

import { classifyTraffic, shouldApplyRateLimiting } from '../../lib/crc-engine/traffic-classification'

const ORIGINAL_ENV = process.env

beforeEach(() => {
  process.env = { ...ORIGINAL_ENV }
  delete process.env.CRC_EVAL_SECRET
  delete process.env.CRC_INTERNAL_TEST_IPS
})

afterAll(() => {
  process.env = ORIGINAL_ENV
})

describe('classifyTraffic', () => {
  test('non-production nodeEnv is always development, regardless of other signals', () => {
    expect(classifyTraffic({ nodeEnv: 'test', evalKeyHeader: null, normalizedIp: '1.2.3.4' })).toBe('development')
    expect(classifyTraffic({ nodeEnv: undefined, evalKeyHeader: null, normalizedIp: null })).toBe('development')
  })

  test('production with no eval key, no allowlist match -> pilot (the default)', () => {
    expect(classifyTraffic({ nodeEnv: 'production', evalKeyHeader: null, normalizedIp: '1.2.3.4' })).toBe('pilot')
  })

  test('production with a matching eval secret header -> automated_eval', () => {
    process.env.CRC_EVAL_SECRET = 'shared-secret'
    expect(classifyTraffic({ nodeEnv: 'production', evalKeyHeader: 'shared-secret', normalizedIp: '1.2.3.4' })).toBe('automated_eval')
  })

  test('a WRONG eval key header does not grant automated_eval -- falls through to pilot', () => {
    process.env.CRC_EVAL_SECRET = 'shared-secret'
    expect(classifyTraffic({ nodeEnv: 'production', evalKeyHeader: 'guessed-value', normalizedIp: '1.2.3.4' })).toBe('pilot')
  })

  test('an eval key header present but no CRC_EVAL_SECRET configured -> pilot, never automated_eval', () => {
    expect(classifyTraffic({ nodeEnv: 'production', evalKeyHeader: 'anything', normalizedIp: '1.2.3.4' })).toBe('pilot')
  })

  test('a normalized IP in the internal-test allowlist -> internal_test', () => {
    process.env.CRC_INTERNAL_TEST_IPS = '36.230.101.105, 1.2.3.4'
    expect(classifyTraffic({ nodeEnv: 'production', evalKeyHeader: null, normalizedIp: '1.2.3.4' })).toBe('internal_test')
  })

  test('an IP NOT in the allowlist -> pilot, even with an allowlist configured', () => {
    process.env.CRC_INTERNAL_TEST_IPS = '36.230.101.105'
    expect(classifyTraffic({ nodeEnv: 'production', evalKeyHeader: null, normalizedIp: '9.9.9.9' })).toBe('pilot')
  })

  test('no CRC_INTERNAL_TEST_IPS configured at all -> pilot, never internal_test by accident', () => {
    expect(classifyTraffic({ nodeEnv: 'production', evalKeyHeader: null, normalizedIp: '36.230.101.105' })).toBe('pilot')
  })

  test('automated_eval is checked before internal_test -- a request matching both signals resolves to automated_eval', () => {
    process.env.CRC_EVAL_SECRET = 'shared-secret'
    process.env.CRC_INTERNAL_TEST_IPS = '1.2.3.4'
    expect(classifyTraffic({ nodeEnv: 'production', evalKeyHeader: 'shared-secret', normalizedIp: '1.2.3.4' })).toBe('automated_eval')
  })
})

/**
 * CRC Rate-Limit UX + Internal-Test Classification refinement, 2026-08-14.
 * shouldApplyRateLimiting is the exact gate route.ts uses to decide whether
 * burst/session_creation_rate/turn_ceiling checks run at all -- these tests
 * lock in that only real pilot traffic with a resolvable abuseKey is ever
 * bounded, and that no traffic type can talk its way out of that via a
 * forged/wrong signal (classifyTraffic's own tests above already confirm a
 * wrong eval key or an off-allowlist IP resolves to plain 'pilot' -- these
 * tests confirm what happens to rate limiting once that resolution is
 * final).
 */
describe('shouldApplyRateLimiting', () => {
  test('pilot traffic with a resolvable abuseKey -> rate limiting applies', () => {
    expect(shouldApplyRateLimiting('pilot', 'some-abuse-key')).toBe(true)
  })

  test('internal_test traffic -> rate limiting does not apply, even with a resolvable abuseKey', () => {
    expect(shouldApplyRateLimiting('internal_test', 'some-abuse-key')).toBe(false)
  })

  test('automated_eval traffic -> rate limiting does not apply', () => {
    expect(shouldApplyRateLimiting('automated_eval', 'some-abuse-key')).toBe(false)
  })

  test('development traffic -> rate limiting does not apply', () => {
    expect(shouldApplyRateLimiting('development', 'some-abuse-key')).toBe(false)
  })

  test('pilot traffic with a null abuseKey (HMAC secret unavailable) -> fails open, rate limiting does not apply', () => {
    expect(shouldApplyRateLimiting('pilot', null)).toBe(false)
  })

  test('a forged/wrong classification never reaches this function as anything but pilot -- classifyTraffic already resolved it', () => {
    // Belt-and-suspenders: even if some future caller passed a traffic type
    // string through untyped, only the literal 'pilot' turns rate limiting
    // on. There is no bypass path through this function itself.
    expect(shouldApplyRateLimiting('pilot', 'abuse-key')).toBe(true)
    ;(['internal_test', 'automated_eval', 'development'] as const).forEach((t) => {
      expect(shouldApplyRateLimiting(t, 'abuse-key')).toBe(false)
    })
  })
})
