/**
 * Traffic classification tests (CRC Identity + Abuse Prevention + Analytics
 * milestone, design report §5). Every branch is server-determined -- these
 * tests exist specifically to lock in that a client-supplied signal can
 * never launder itself into a privileged classification (automated_eval,
 * internal_test) or contaminate real pilot analytics.
 */

import { classifyTraffic } from '../../lib/crc-engine/traffic-classification'

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
