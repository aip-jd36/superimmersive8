/**
 * Rate-limit UX copy tests (CRC Rate-Limit UX + Internal-Test
 * Classification refinement, 2026-08-14).
 */

import { formatRetryAfter, getRateLimitMessage } from '../../lib/crc-engine/rate-limit-copy'

describe('formatRetryAfter', () => {
  test('under 60 seconds -> "a few seconds"', () => {
    expect(formatRetryAfter(1)).toBe('a few seconds')
    expect(formatRetryAfter(30)).toBe('a few seconds')
    expect(formatRetryAfter(59)).toBe('a few seconds')
  })

  test('under 60 minutes -> "about X minutes"', () => {
    expect(formatRetryAfter(60)).toBe('about 1 minute')
    expect(formatRetryAfter(300)).toBe('about 5 minutes')
    expect(formatRetryAfter(59 * 60)).toBe('about 59 minutes')
  })

  test('under 24 hours -> "about X hours"', () => {
    expect(formatRetryAfter(60 * 60)).toBe('about 1 hour')
    expect(formatRetryAfter(2 * 60 * 60)).toBe('about 2 hours')
    expect(formatRetryAfter(23 * 60 * 60)).toBe('about 23 hours')
  })

  test('24 hours or more -> "about X days"', () => {
    expect(formatRetryAfter(24 * 60 * 60)).toBe('about 1 day')
    expect(formatRetryAfter(2 * 24 * 60 * 60)).toBe('about 2 days')
  })

  test('the real session_creation_rate value (24h, 86400s) formats as "about 1 day"', () => {
    // Locks in the actual value abuse-prevention.ts's checkSessionCreationRate
    // returns -- not just the formatting rule in isolation.
    expect(formatRetryAfter(24 * 60 * 60)).toBe('about 1 day')
  })

  test('singular vs. plural units', () => {
    expect(formatRetryAfter(60)).toContain('1 minute')
    expect(formatRetryAfter(60)).not.toContain('minutes')
    expect(formatRetryAfter(60 * 60)).toContain('1 hour')
    expect(formatRetryAfter(60 * 60)).not.toContain('hours')
    expect(formatRetryAfter(24 * 60 * 60)).toContain('1 day')
    expect(formatRetryAfter(24 * 60 * 60)).not.toContain('days')
  })
})

describe('getRateLimitMessage', () => {
  test('burst -> short, fixed retry copy, independent of retryAfterSeconds', () => {
    expect(getRateLimitMessage('burst', 3)).toBe("You're sending messages a little too quickly. Try again in a few seconds.")
    // Same copy even if retryAfterSeconds is unset -- the burst message never depends on it.
    expect(getRateLimitMessage('burst', undefined)).toBe("You're sending messages a little too quickly. Try again in a few seconds.")
  })

  test('session_creation_rate at the real config value (24h, 86400s) -> "Try again tomorrow."', () => {
    // Locks in the actual value abuse-prevention.ts's checkSessionCreationRate
    // returns -- not just the copy rule in isolation. Copy refinement,
    // 2026-08-14: natural "tomorrow" phrasing instead of "about 1 day".
    expect(getRateLimitMessage('session_creation_rate', 24 * 60 * 60)).toBe(
      "You've reached today's limit for new Commercial Readiness Checks from this network. Try again tomorrow.",
    )
  })

  test('session_creation_rate for any retryAfterSeconds approximately a day or more -> "tomorrow", not "about N days"', () => {
    expect(getRateLimitMessage('session_creation_rate', 23 * 60 * 60)).toBe(
      "You've reached today's limit for new Commercial Readiness Checks from this network. Try again tomorrow.",
    )
    expect(getRateLimitMessage('session_creation_rate', 2 * 24 * 60 * 60)).toBe(
      "You've reached today's limit for new Commercial Readiness Checks from this network. Try again tomorrow.",
    )
  })

  test('session_creation_rate for a genuinely shorter window -> human-readable duration, not "tomorrow"', () => {
    expect(getRateLimitMessage('session_creation_rate', 5 * 60)).toBe(
      "You've reached today's limit for new Commercial Readiness Checks from this network. Try again in about 5 minutes.",
    )
    expect(getRateLimitMessage('session_creation_rate', 2 * 60 * 60)).toBe(
      "You've reached today's limit for new Commercial Readiness Checks from this network. Try again in about 2 hours.",
    )
  })

  test('session_creation_rate with a missing retryAfterSeconds still produces a sensible message, not a crash', () => {
    expect(getRateLimitMessage('session_creation_rate', undefined)).toBe(
      "You've reached today's limit for new Commercial Readiness Checks from this network. Try again in a little later.",
    )
  })

  test('an unrecognized/missing reason falls back to a generic message rather than guessing', () => {
    expect(getRateLimitMessage(undefined, 5)).toBe("You've reached the limit for this session right now. Try again in a bit.")
  })

  test('burst and session_creation_rate never produce the same message', () => {
    const burst = getRateLimitMessage('burst', 3)
    const daily = getRateLimitMessage('session_creation_rate', 86400)
    expect(burst).not.toBe(daily)
  })
})
