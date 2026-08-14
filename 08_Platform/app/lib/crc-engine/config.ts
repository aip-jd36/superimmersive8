/**
 * CRC Identity + Abuse Prevention + Analytics milestone -- configuration
 * constants. Every threshold from the approved design lives here, as
 * environment-overridable config, not hard-coded inside abuse-prevention.ts
 * or route.ts -- so a threshold can be adjusted (e.g. after real pilot
 * data shows 5 sessions/day/abuse-key is too strict for a shared agency
 * IP) without touching business logic (per JD's explicit instruction).
 *
 * Every default below is grounded in real production data pulled during
 * the persistence-architecture audit that preceded this milestone's design
 * (47 real crc_sessions rows, max observed turn_count = 5) -- see the
 * design report for the reasoning behind each specific number. None of
 * these are arbitrary.
 */

function envInt(name: string, fallback: number): number {
  const raw = process.env[name]
  if (raw === undefined || raw.trim() === '') return fallback
  const parsed = Number.parseInt(raw, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

export const CRC_CONFIG = {
  /**
   * Hard ceiling on turns for a single session, regardless of rate.
   * Default 15 -- 3x the highest turn_count ever observed in real pilot
   * data (5), generous headroom for a verbose real user while still
   * bounding worst-case cost per session.
   */
  maxTurnsPerSession: envInt('CRC_MAX_TURNS_PER_SESSION', 15),

  /**
   * New crc_sessions rows a single abuse key may create in a rolling 24h
   * window. Default 5 -- allows 2-3 legitimate restarts while bounding a
   * scripted loop. The real cost-protection layer (see design report §3
   * self-critique item 3) -- the email gate itself barely limits cost on
   * its own.
   */
  maxNewSessionsPerAbuseKeyPerDay: envInt('CRC_MAX_NEW_SESSIONS_PER_ABUSE_KEY_PER_DAY', 5),

  /**
   * Minimum seconds between two turn requests against the SAME session.
   * Default 3 -- no real human can beat this (each turn already takes
   * several seconds of sequential model calls), tight against a script
   * hammering one session.
   */
  minSecondsBetweenTurns: envInt('CRC_MIN_SECONDS_BETWEEN_TURNS', 3),

  /**
   * Soft, logged-only signal (design report §3/§B item 3): completed CRC
   * sessions for the same (unverified) email in a rolling window. Default
   * 3 completions per 7 days. Not enforced as a hard block -- email is
   * unverified in v1, so a determined abuser bypasses this trivially by
   * typing a new address; blocking on it would only add friction for
   * legitimate repeat use (e.g. an agency running CRC on several real
   * projects in a week).
   */
  maxCompletedPerEmailPerWindow: envInt('CRC_MAX_COMPLETED_PER_EMAIL', 3),
  completedPerEmailWindowDays: envInt('CRC_COMPLETED_PER_EMAIL_WINDOW_DAYS', 7),

  /**
   * Results Gate (email delivery model, 2026-08-14). Minimum seconds
   * between two EXPLICIT resend attempts to the same recipient. Does not
   * gate an ordinary retry after a failed send -- see
   * claim_crc_result_send()'s own comments.
   */
  resultsEmailResendCooldownSeconds: envInt('CRC_RESULTS_EMAIL_RESEND_COOLDOWN_SECONDS', 60),

  /** Max explicit resends per recipient -- original + this many = total sends to one address. PM-approved: 2. */
  resultsEmailMaxExplicitResends: envInt('CRC_RESULTS_EMAIL_MAX_EXPLICIT_RESENDS', 2),

  /** Max distinct recipient addresses one session may ever target (original + corrections). PM-approved: 3. */
  resultsEmailMaxDistinctRecipients: envInt('CRC_RESULTS_EMAIL_MAX_DISTINCT_RECIPIENTS', 3),

  /**
   * Sessions created before this instant use the pre-Results-Gate behavior
   * (full result visible in-browser, unconditionally) -- grandfathering, so
   * a real pilot user who already saw their result live never finds it
   * retroactively gated on a later revisit. Fixed at deploy time, not
   * env-overridable after the fact (changing it would un-grandfather
   * already-launched sessions).
   */
  resultsGateLaunchedAt: '2026-08-14T00:00:00.000Z',

  /** Bumped whenever the results-gate copy (teaser/gate/confirmation text) changes. */
  captureNoticeVersion: 'results-gate-v1',

  /** Bumped whenever the emailed-results template structure/copy changes. */
  resultsEmailTemplateVersion: 'results-email-v1',
} as const
