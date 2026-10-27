/**
 * CR-V2-WORK-UAT-HARNESS-2 — the public UAT harness on/off switch. FAILS CLOSED.
 *
 * The harness (`/uat/creator-record-v2`, `POST /api/uat/creator-record-v2/draft`)
 * is open only when ALL hold:
 *   1. `PUBLIC_UAT_HARNESS_ENABLED` is true;
 *   2. `PUBLIC_UAT_WINDOW` is set (it is ARMED in the deployment commit, never
 *      during local development — `null` here means "not armed": closed);
 *   3. both window times parse, `closes_at` is after `opens_at`, and the window
 *      is at most `PUBLIC_UAT_MAX_WINDOW_DAYS` long (a far-future expiry is
 *      refused, not trusted);
 *   4. `opens_at <= now < closes_at`.
 * Anything else — including a malformed value — is closed: the page and the
 * route answer 404 before reading anything from the request.
 *
 * Disable procedure (any one is sufficient):
 *   a. Vercel instant rollback to the deployment before the harness (no code);
 *   b. set `PUBLIC_UAT_HARNESS_ENABLED = false` (or `PUBLIC_UAT_WINDOW = null`)
 *      and deploy;
 *   c. do nothing: it closes automatically at `closes_at`.
 */

export const PUBLIC_UAT_HARNESS_ENABLED: boolean = true

/**
 * ISO-8601 instants. `null` = not armed (closed). Armed only in the deployment commit.
 * ARMED by CR-V2-WORK-UAT-HARNESS-3B (PM GO, 2026-10-27): opens just before the
 * Production deployment, closes exactly 14 days later. Do not extend.
 */
export const PUBLIC_UAT_WINDOW: { opens_at: string; closes_at: string } | null = { opens_at: '2026-10-27T07:00:00Z', closes_at: '2026-11-10T07:00:00Z' }

export const PUBLIC_UAT_MAX_WINDOW_DAYS = 14

export type PublicUatClosedReason = 'disabled' | 'not_armed' | 'invalid_window' | 'window_too_long' | 'not_yet_open' | 'expired'
export type PublicUatStatus = { open: true; closes_at: string } | { open: false; reason: PublicUatClosedReason }

export interface PublicUatConfig {
  enabled: boolean
  window: { opens_at: string; closes_at: string } | null
}

const ISO_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})$/
const DAY_MS = 24 * 60 * 60 * 1000

export function publicUatStatus(now: Date = new Date(), config: PublicUatConfig = { enabled: PUBLIC_UAT_HARNESS_ENABLED, window: PUBLIC_UAT_WINDOW }): PublicUatStatus {
  try {
    if (config.enabled !== true) return { open: false, reason: 'disabled' }
    const w = config.window
    if (!w) return { open: false, reason: 'not_armed' }
    if (typeof w.opens_at !== 'string' || typeof w.closes_at !== 'string' || !ISO_INSTANT.test(w.opens_at) || !ISO_INSTANT.test(w.closes_at)) return { open: false, reason: 'invalid_window' }
    const opens = Date.parse(w.opens_at)
    const closes = Date.parse(w.closes_at)
    const t = now.getTime()
    if (!Number.isFinite(opens) || !Number.isFinite(closes) || !Number.isFinite(t) || closes <= opens) return { open: false, reason: 'invalid_window' }
    if (closes - opens > PUBLIC_UAT_MAX_WINDOW_DAYS * DAY_MS) return { open: false, reason: 'window_too_long' }
    if (t < opens) return { open: false, reason: 'not_yet_open' }
    if (t >= closes) return { open: false, reason: 'expired' }
    return { open: true, closes_at: new Date(closes).toISOString() }
  } catch {
    return { open: false, reason: 'invalid_window' }
  }
}
