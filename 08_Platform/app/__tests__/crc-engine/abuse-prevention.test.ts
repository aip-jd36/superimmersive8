/**
 * Abuse-prevention checks (CRC Identity + Abuse Prevention + Analytics
 * milestone, design report §3/§13). Pure checks (checkBurst, checkTurnCeiling)
 * are tested directly. The Supabase-backed checks (checkSessionCreationRate,
 * countRecentCompletionsForEmail) use a small fake client whose query
 * builder is itself thenable, so any chain of .eq()/.gte()/.not() calls
 * resolves to the configured result regardless of exactly which methods
 * were chained -- this test cares about the RESULT of the query and the
 * fail-open behavior on error, not the literal call sequence.
 */

import { checkBurst, checkTurnCeiling, checkSessionCreationRate, countRecentCompletionsForEmail, logRateLimitedEvent } from '../../lib/crc-engine/abuse-prevention'
import { CRC_CONFIG } from '../../lib/crc-engine/config'

function fakeCountClient(result: { count: number | null; error: unknown }) {
  const insertCalls: unknown[] = []
  function chain(): any {
    const node: any = {
      eq: () => chain(),
      gte: () => chain(),
      not: () => chain(),
      then: (resolve: (v: unknown) => void) => resolve(result),
    }
    return node
  }
  const client = {
    from: jest.fn(() => ({
      select: jest.fn(() => chain()),
      insert: jest.fn(async (payload: unknown) => {
        insertCalls.push(payload)
        return { error: null }
      }),
    })),
  }
  return { client: client as any, insertCalls }
}

describe('checkBurst', () => {
  test('no prior activity timestamp -> never limited (nothing to compare against, e.g. a brand-new session)', () => {
    expect(checkBurst(null)).toEqual({ limited: false })
  })

  test('activity older than the configured window -> not limited', () => {
    const old = new Date(Date.now() - (CRC_CONFIG.minSecondsBetweenTurns + 5) * 1000).toISOString()
    expect(checkBurst(old)).toEqual({ limited: false })
  })

  test('activity within the configured window -> limited, with a retryAfterSeconds', () => {
    const recent = new Date(Date.now() - 1000).toISOString()
    const result = checkBurst(recent)
    expect(result.limited).toBe(true)
    if (result.limited) {
      expect(result.reason).toBe('burst')
      expect(result.retryAfterSeconds).toBeGreaterThan(0)
    }
  })
})

describe('checkTurnCeiling', () => {
  test('a turn number at or below the ceiling -> not limited', () => {
    expect(checkTurnCeiling(CRC_CONFIG.maxTurnsPerSession)).toEqual({ limited: false })
  })

  test('a turn number beyond the ceiling -> limited', () => {
    expect(checkTurnCeiling(CRC_CONFIG.maxTurnsPerSession + 1)).toEqual({ limited: true, reason: 'turn_ceiling' })
  })

  test('the default ceiling is well above any real observed pilot conversation length (grounded in real production data, not arbitrary)', () => {
    // Real production data (47 sessions, audited pre-milestone): max
    // observed turn_count was 5. The default ceiling must stay generously
    // above that, not accidentally tightened to something that would
    // clip real users.
    expect(CRC_CONFIG.maxTurnsPerSession).toBeGreaterThan(5)
  })
})

describe('checkSessionCreationRate', () => {
  test('count below the threshold -> not limited', async () => {
    const { client } = fakeCountClient({ count: CRC_CONFIG.maxNewSessionsPerAbuseKeyPerDay - 1, error: null })
    await expect(checkSessionCreationRate(client, 'some-abuse-key')).resolves.toEqual({ limited: false })
  })

  test('count at or above the threshold -> limited', async () => {
    const { client } = fakeCountClient({ count: CRC_CONFIG.maxNewSessionsPerAbuseKeyPerDay, error: null })
    const result = await checkSessionCreationRate(client, 'some-abuse-key')
    expect(result.limited).toBe(true)
    if (result.limited) expect(result.reason).toBe('session_creation_rate')
  })

  test('a query error fails OPEN -- never blocks the request over an infra hiccup', async () => {
    const { client } = fakeCountClient({ count: null, error: { message: 'connection failed' } })
    await expect(checkSessionCreationRate(client, 'some-abuse-key')).resolves.toEqual({ limited: false })
  })
})

describe('countRecentCompletionsForEmail', () => {
  test('returns the count on success', async () => {
    const { client } = fakeCountClient({ count: 2, error: null })
    await expect(countRecentCompletionsForEmail(client, 'jd@example.com')).resolves.toBe(2)
  })

  test('a query error is treated as zero, never thrown -- this signal is soft/informational only', async () => {
    const { client } = fakeCountClient({ count: null, error: { message: 'connection failed' } })
    await expect(countRecentCompletionsForEmail(client, 'jd@example.com')).resolves.toBe(0)
  })
})

describe('logRateLimitedEvent', () => {
  test('inserts a rate_limited pilot event carrying the raw IP -- the one deliberate exception to "never store raw IP"', async () => {
    const { client, insertCalls } = fakeCountClient({ count: 0, error: null })
    await logRateLimitedEvent(client, 'session-1', 'burst', '203.0.113.42')
    expect(insertCalls).toEqual([{ session_id: 'session-1', event_type: 'rate_limited', detail: 'burst', raw_ip: '203.0.113.42' }])
  })

  test('never throws, even if the insert fails', async () => {
    const client = {
      from: jest.fn(() => ({
        insert: jest.fn(async () => ({ error: { message: 'insert failed' } })),
      })),
    }
    await expect(logRateLimitedEvent(client as any, 'session-1', 'turn_ceiling', '203.0.113.42')).resolves.toBeUndefined()
  })
})
