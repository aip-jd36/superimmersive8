/**
 * User-facing copy for a `status: 'rate_limited'` response (CRC Rate-Limit
 * UX + Internal-Test Classification refinement, 2026-08-14). Pure, no React
 * -- kept separate from app/crc/page.tsx so it's directly unit-testable.
 *
 * Only `burst` and `session_creation_rate` are handled by name -- those are
 * the only two reasons a `rate_limited` response can ever carry (see
 * RateLimitReason in api-contract.ts). `turn_ceiling` never reaches this
 * function: a hard ceiling finalizes the conversation gracefully via
 * `status: 'complete'` instead, so there is no rate-limit message for it at
 * all, by design -- not an oversight here.
 */

import type { RateLimitReason } from './api-contract'

/**
 * Renders `retryAfterSeconds` as a simple, approximate human-readable
 * duration. Deliberately coarse (rounded, no live countdown) -- this is a
 * one-line status message, not a timer UI. Each bucket's threshold is
 * checked against the raw `seconds` value, not a previously-rounded one, so
 * a value from an adjacent bucket never gets double-rounded into a
 * confusing label (e.g. "60 minutes" instead of "1 hour").
 */
export function formatRetryAfter(seconds: number): string {
  if (seconds < 60) return 'a few seconds'

  if (seconds < 60 * 60) {
    const minutes = Math.round(seconds / 60)
    return `about ${minutes} minute${minutes === 1 ? '' : 's'}`
  }

  if (seconds < 60 * 60 * 24) {
    const hours = Math.round(seconds / (60 * 60))
    return `about ${hours} hour${hours === 1 ? '' : 's'}`
  }

  const days = Math.round(seconds / (60 * 60 * 24))
  return `about ${days} day${days === 1 ? '' : 's'}`
}

/**
 * Below this, a session_creation_rate retry window reads as "about N
 * hours"/"about N minutes" (still useful, specific information). At or
 * above it, "tomorrow" is more natural than "about 1 day" -- copy
 * refinement, 2026-08-14. 23h rather than exactly 24h so a value that's
 * "approximately a day" (per product direction) still gets the natural
 * phrasing even if it lands a little under the exact 86400s the real
 * config produces today.
 */
const NEAR_ONE_DAY_SECONDS = 23 * 60 * 60

/**
 * Final message text for a `rate_limited` response. `reason`/
 * `retryAfterSeconds` come directly from the API -- never inferred from
 * timing on the client, since the backend already knows exactly which
 * check fired.
 */
export function getRateLimitMessage(reason: RateLimitReason | undefined, retryAfterSeconds: number | undefined): string {
  if (reason === 'burst') {
    return "You're sending messages a little too quickly. Try again in a few seconds."
  }

  if (reason === 'session_creation_rate') {
    if (typeof retryAfterSeconds === 'number' && retryAfterSeconds >= NEAR_ONE_DAY_SECONDS) {
      return "You've reached today's limit for new Commercial Readiness Checks from this network. Try again tomorrow."
    }
    const retryText = typeof retryAfterSeconds === 'number' ? formatRetryAfter(retryAfterSeconds) : 'a little later'
    return `You've reached today's limit for new Commercial Readiness Checks from this network. Try again in ${retryText}.`
  }

  // Defensive fallback only -- reached if a client is ever served a
  // 'rate_limited' response with no reason (e.g. a stale deployed bundle
  // talking to a newer/older API). Never guesses a specific reason it
  // can't confirm.
  return "You've reached the limit for this session right now. Try again in a bit."
}
