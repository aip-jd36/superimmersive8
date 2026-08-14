/**
 * Traffic classification (CRC Identity + Abuse Prevention + Analytics
 * milestone, design report §5). `traffic_type` on crc_sessions, set once at
 * session creation. Four values, all server-determined -- never
 * client-settable in a direction that could either bypass abuse limits
 * (falsely claiming automated_eval/internal_test) or launder fake traffic
 * as real (falsely claiming pilot).
 *
 * `internal_test` reuses a pattern already validated elsewhere in this
 * project rather than inventing a new one: the marketing site's own GA4
 * setup already excludes JD's home IP the same way (see CLAUDE.md, "GA4
 * internal IP filter"). No new mechanism, no UI affordance, no friction.
 */

export const TRAFFIC_TYPES = ['pilot', 'internal_test', 'automated_eval', 'development'] as const
export type TrafficType = (typeof TRAFFIC_TYPES)[number]

export interface ClassifyTrafficInput {
  nodeEnv: string | undefined
  /** Value of the X-CRC-Eval-Key request header, if present. */
  evalKeyHeader: string | null
  /** Normalized client IP (pre-hash) -- see abuse-key.ts. Null if unresolvable. */
  normalizedIp: string | null
}

/**
 * Comma-separated list of normalized IPs to auto-classify as internal_test,
 * e.g. "36.230.101.105". Never required -- an empty/unset allowlist simply
 * means no traffic is ever auto-classified internal_test, which is a safe,
 * conservative default (worst case, JD's own manual testing shows up as
 * ordinary pilot traffic until this is configured).
 */
function internalTestIpAllowlist(): string[] {
  const raw = process.env.CRC_INTERNAL_TEST_IPS
  if (!raw) return []
  return raw.split(',').map((ip) => ip.trim()).filter(Boolean)
}

export function classifyTraffic(input: ClassifyTrafficInput): TrafficType {
  if (input.nodeEnv !== 'production') return 'development'

  const evalSecret = process.env.CRC_EVAL_SECRET
  if (evalSecret && input.evalKeyHeader && input.evalKeyHeader === evalSecret) return 'automated_eval'

  if (input.normalizedIp && internalTestIpAllowlist().includes(input.normalizedIp)) return 'internal_test'

  return 'pilot'
}

/**
 * Whether abuse-prevention checks (burst / session_creation_rate /
 * turn_ceiling) apply to this request at all (CRC Rate-Limit UX +
 * Internal-Test Classification refinement, 2026-08-14). Extracted out of
 * route.ts's own inline boolean so it's independently testable -- this is
 * the exact gate that makes internal_test/automated_eval/development
 * traffic exempt from the limits real pilot users are bounded by, and it's
 * worth being able to assert that directly rather than only indirectly via
 * a full route-level test. Only `pilot` traffic with a resolvable abuseKey
 * is ever rate-limited; a null abuseKey (HMAC secret missing/misconfigured)
 * fails OPEN for every traffic type, per the approved failure model.
 */
export function shouldApplyRateLimiting(trafficType: TrafficType, abuseKey: string | null): boolean {
  return trafficType === 'pilot' && abuseKey !== null
}
