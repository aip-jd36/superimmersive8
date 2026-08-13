/**
 * Abuse-key derivation (CRC Identity + Abuse Prevention + Analytics
 * milestone, design report §4). Turns a request's originating IP into a
 * stable, non-reversible key usable for rate-limiting, without ever
 * storing the raw IP by default.
 *
 * IP resolution: Vercel's edge sets x-forwarded-for (and, on Vercel
 * specifically, x-vercel-forwarded-for) on the way in -- trustworthy
 * because Vercel's edge IS the network trust boundary, overwriting
 * whatever a client tried to send rather than passing through an
 * unverified client header. FLAGGED IN THE DESIGN REPORT AS NEEDING LIVE
 * VERIFICATION (§4, §B item 15): this has not been empirically confirmed
 * against a real request in this deployment. See
 * REPORT_BINDING... no -- see the Stage D live-validation checklist,
 * which must confirm the actual header value before this is trusted at
 * face value in production incident response.
 *
 * Local/dev: no real proxy in front of `next dev` -- forwarded-IP headers
 * are simply absent, and this resolves to the fixed sentinel 'local-dev',
 * naturally bucketing all local traffic together (harmless -- development
 * traffic is exempted from rate-limiting entirely by traffic
 * classification, see abuse-prevention.ts).
 */

import { createHmac } from 'crypto'
import type { NextRequest } from 'next/server'

export const LOCAL_DEV_IP_SENTINEL = 'local-dev'
export const UNKNOWN_IP_SENTINEL = 'unknown'

/**
 * Resolves the best-available client IP from request headers. Order:
 * x-vercel-forwarded-for (Vercel's own, edge-set variant) -> x-forwarded-for
 * (first entry -- the original client, since intermediate proxies append,
 * not prepend) -> x-real-ip -> local-dev sentinel if nothing is present at
 * all (no proxy in front, i.e. local development).
 */
export function resolveClientIp(request: NextRequest): string {
  const vercelForwarded = request.headers.get('x-vercel-forwarded-for')
  if (vercelForwarded) return vercelForwarded.split(',')[0].trim()

  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()

  const realIp = request.headers.get('x-real-ip')
  if (realIp) return realIp.trim()

  return LOCAL_DEV_IP_SENTINEL
}

/**
 * IPv4 passed through as-is. IPv6 truncated to a /56 prefix (top 4 of 8
 * hextets) before hashing -- some ISPs rotate the low-order bits per
 * session via privacy extensions, so hashing the full address would
 * under-catch abuse (a "new" key every request) while over-fragmenting
 * legitimate users (their own address drifts over days). Truncating to the
 * subnet gives IPv6 roughly the same "represents a household/office"
 * granularity IPv4 already has via NAT.
 */
export function normalizeIp(ip: string): string {
  if (ip === LOCAL_DEV_IP_SENTINEL || ip === UNKNOWN_IP_SENTINEL) return ip
  if (ip.includes(':')) {
    const hextets = ip.split(':')
    return hextets.slice(0, 4).join(':') + '::/56'
  }
  return ip
}

/**
 * HMAC-SHA256(normalized IP, secret), truncated to 32 hex chars. Requires
 * CRC_ABUSE_KEY_HMAC_SECRET -- a dedicated secret, not reused from
 * anything else, so a leak's blast radius is scoped to "someone can
 * precompute abuse keys for known IPs to dodge rate limits," not anything
 * more sensitive.
 *
 * Throws if the secret is missing/empty -- deliberately: per the approved
 * failure model, a misconfigured secret is a deploy-time bug, and the
 * CALLER (abuse-prevention.ts) is responsible for catching this and
 * failing OPEN (skip rate-limiting for this request, log loudly) rather
 * than this function silently returning a fake key that would let
 * unrelated requests collide into one abuse-key bucket.
 */
export function deriveAbuseKey(normalizedIp: string): string {
  const secret = process.env.CRC_ABUSE_KEY_HMAC_SECRET
  if (!secret) {
    throw new Error('CRC_ABUSE_KEY_HMAC_SECRET is not configured')
  }
  return createHmac('sha256', secret).update(normalizedIp).digest('hex').slice(0, 32)
}
