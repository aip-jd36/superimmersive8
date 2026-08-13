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
   * Email gate fallback trigger (design report §1): if no Commercial
   * Readiness Discovery takeaway has been delivered by the time this many
   * assistant turns have already happened, gate before the next one.
   * Default 3, per the approved design's explicit fallback rule.
   */
  emailGateFallbackTurn: envInt('CRC_EMAIL_GATE_FALLBACK_TURN', 3),

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
} as const
