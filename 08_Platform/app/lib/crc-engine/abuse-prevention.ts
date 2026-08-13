/**
 * Abuse-prevention checks (CRC Identity + Abuse Prevention + Analytics
 * milestone, design report §3/§13). Route-layer only -- none of this
 * touches StructuredUnderstanding, gates, phases, or completion logic.
 * Every check here runs BEFORE runTurn() is ever called, so a rate-limited
 * or ceiling-exceeded request never reaches an Anthropic call.
 *
 * Failure model (design report §13), applied consistently: a WORKING check
 * that correctly detects a real limit being hit fails CLOSED (blocks the
 * request, as designed). A check that CANNOT BE COMPUTED at all --
 * unresolvable IP, missing HMAC secret, Supabase unavailable -- fails
 * OPEN (allows the request through, logs loudly). The reasoning: this
 * system protects a low-stakes target (a free educational chat, cents of
 * model cost per turn); failing closed on an infra hiccup would mean the
 * entire pilot goes down over a config typo or a transient DB error, a
 * worse outcome than briefly running without this one check.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { CRC_CONFIG } from './config'

export type AbuseCheckResult =
  | { limited: false }
  | { limited: true; reason: 'session_creation_rate' | 'burst' | 'turn_ceiling'; retryAfterSeconds?: number }

/**
 * Only relevant when this request is about to CREATE a new crc_sessions
 * row (no existing token, or an explicit restart) -- an ordinary
 * continuing-conversation turn never calls this, so no extra DB load is
 * added to the common case.
 */
export async function checkSessionCreationRate(client: SupabaseClient, abuseKey: string): Promise<AbuseCheckResult> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { count, error } = await client
    .from('crc_sessions')
    .select('id', { count: 'exact', head: true })
    .eq('abuse_key', abuseKey)
    .gte('created_at', since)

  if (error) {
    console.error('[abuse-prevention] session-creation-rate query failed, failing open', error)
    return { limited: false }
  }
  if ((count ?? 0) >= CRC_CONFIG.maxNewSessionsPerAbuseKeyPerDay) {
    return { limited: true, reason: 'session_creation_rate', retryAfterSeconds: 24 * 60 * 60 }
  }
  return { limited: false }
}

/**
 * Only relevant when resuming an EXISTING session -- compares against that
 * session's own last-activity timestamp (crc_sessions.updated_at, which the
 * existing updated_at trigger already refreshes on every write to the
 * row, engine-state or product-state). No real human can submit two turns
 * within the configured window; this only ever catches a script hammering
 * one session.
 */
export function checkBurst(lastUpdatedAt: string | null): AbuseCheckResult {
  if (!lastUpdatedAt) return { limited: false }
  const elapsedSeconds = (Date.now() - new Date(lastUpdatedAt).getTime()) / 1000
  if (elapsedSeconds < CRC_CONFIG.minSecondsBetweenTurns) {
    return { limited: true, reason: 'burst', retryAfterSeconds: Math.ceil(CRC_CONFIG.minSecondsBetweenTurns - elapsedSeconds) }
  }
  return { limited: false }
}

/**
 * Hard ceiling on turns per session, regardless of rate. Purely a
 * comparison against the turn number this request would become -- no DB
 * call needed, turnNumber is already known to the caller.
 */
export function checkTurnCeiling(turnNumber: number): AbuseCheckResult {
  if (turnNumber > CRC_CONFIG.maxTurnsPerSession) {
    return { limited: true, reason: 'turn_ceiling' }
  }
  return { limited: false }
}

/**
 * Soft, logged-only signal (design report §3, §B item 3) -- never blocks.
 * Email is unverified in v1, so this is informational, not enforcement:
 * its value is visibility into casual/lazy repeat use, not a defensible
 * hard limit (a determined user bypasses it by typing a new address).
 * Failure here (query error) is silently absorbed -- this was never going
 * to block anything regardless.
 */
export async function countRecentCompletionsForEmail(client: SupabaseClient, email: string): Promise<number> {
  const since = new Date(Date.now() - CRC_CONFIG.completedPerEmailWindowDays * 24 * 60 * 60 * 1000).toISOString()
  const { count, error } = await client
    .from('crc_sessions')
    .select('id', { count: 'exact', head: true })
    .eq('email', email)
    .gte('created_at', since)
    .not('structured_understanding->>completion_reason', 'is', null)

  if (error) {
    console.error('[abuse-prevention] completed-per-email query failed, treating as zero', error)
    return 0
  }
  return count ?? 0
}

/**
 * Logs a rate_limited pilot event directly (not via logPilotEvent -- that
 * function's own PilotEvent shape deliberately has no raw_ip field, since
 * every OTHER event type must never receive one; this is the one narrow
 * exception, so it gets its own minimal insert rather than widening
 * logPilotEvent's shared contract for a single event type). Same
 * never-throws, best-effort discipline as logPilotEvent. rawIp is
 * populated ONLY here (design report §4/§12) -- purely so a false-positive
 * lockout (e.g. a shared office IP) can actually be investigated after the
 * fact; a hash alone isn't human-interpretable.
 */
export async function logRateLimitedEvent(
  client: SupabaseClient,
  sessionId: string | null,
  reason: 'session_creation_rate' | 'burst' | 'turn_ceiling',
  rawIp: string,
): Promise<void> {
  try {
    const { error } = await client
      .from('crc_pilot_events')
      .insert({ session_id: sessionId, event_type: 'rate_limited', detail: reason, raw_ip: rawIp })
    if (error) console.error('[abuse-prevention] logRateLimitedEvent insert error', error)
  } catch (err) {
    console.error('[abuse-prevention] logRateLimitedEvent unexpected failure', err)
  }
}
