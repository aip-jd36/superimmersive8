/**
 * Coarse request-network-geography helpers (CRC-OPS-GEO-1, 2026-09-23).
 * Operational metadata only -- describes the NETWORK/egress country a
 * request appears to originate from, never a verified physical user
 * location. Deliberately its own sibling module, not folded into
 * lib/crc-engine/abuse-key.ts -- that module's own concern is IP-derived
 * rate-limiting identity (abuse_key), a fundamentally different purpose
 * from this one (display-only operational context for admin
 * notifications); the two happen to both start from a request header, but
 * coupling them would make a future change to either module's real
 * purpose (e.g. abuse-key hashing) risk silently affecting the other.
 *
 * EMPIRICAL BASIS (CRC-OPS-GEO-1A, 2026-09-23): a real Taiwan cellular
 * request against the live CRC request path was confirmed, via temporary
 * Production instrumentation (since removed), to receive
 * `x-vercel-ip-country: TW` -- Vercel's edge-injected geolocation header
 * is present and trustworthy on this deployment's real request path, not
 * merely platform-documented.
 *
 * ARCHITECTURAL BOUNDARY (restated from the approved design): this value
 * may only ever flow into an operational admin-notification payload
 * (lib/emails.ts). It must never become a ProjectFact, UserGoal,
 * AssessmentJurisdictionMention, DistributionTerritoryMention, Retrieval
 * input, Living Knowledge applicability fact, Bounded Interpretation
 * input, or any other CRC semantic/reasoning state -- nothing in this
 * module imports, or is imported by, any Interview Engine, Retrieval,
 * Bounded Interpretation, or Composition module.
 */

import type { NextRequest } from 'next/server'

const COUNTRY_CODE_PATTERN = /^[A-Za-z]{2}$/

/**
 * Reads Vercel's edge-injected `x-vercel-ip-country` header -- the same
 * trust model this codebase already relies on for `x-vercel-forwarded-for`
 * (see abuse-key.ts's own header: Vercel's edge overwrites whatever a
 * client tried to send, so this header cannot be spoofed by an ordinary
 * client in this deployment model). Strict, fail-closed validation:
 * absent, empty, or anything other than exactly two alphabetic characters
 * resolves to `null` -- never a best-effort guess, never a partial/
 * malformed value passed downstream. Returns the normalized uppercase
 * ISO 3166-1 alpha-2 code on success (e.g. 'tw' -> 'TW').
 */
export function resolveRequestCountryCode(request: NextRequest): string | null {
  const raw = request.headers.get('x-vercel-ip-country')
  if (!raw) return null
  const trimmed = raw.trim()
  if (!COUNTRY_CODE_PATTERN.test(trimmed)) return null
  return trimmed.toUpperCase()
}

/**
 * Formats an already-validated two-letter country code as a human-readable
 * English display name, using the native `Intl.DisplayNames` runtime API
 * (no dependency, no manually-maintained country-name table). Defensive by
 * design -- a code that is well-formed but unrecognized/unassigned, or a
 * runtime lacking full ICU data, must never throw into a caller; the
 * bounded, non-destructive fallback is the validated code itself (e.g.
 * 'TW'), never an invented name.
 */
export function formatCountryDisplayName(code: string): string {
  try {
    const displayNames = new Intl.DisplayNames(['en'], { type: 'region' })
    return displayNames.of(code) ?? code
  } catch {
    return code
  }
}

/**
 * Convenience composition of the two functions above -- resolve, then
 * format, collapsing straight to `null` if resolution itself failed. This
 * is the one function route.ts actually needs to call; the two primitives
 * above stay separately exported/testable per the approved design's own
 * phase separation (resolver, then formatter).
 */
export function resolveApproximateCountryDisplayName(request: NextRequest): string | null {
  const code = resolveRequestCountryCode(request)
  return code ? formatCountryDisplayName(code) : null
}
