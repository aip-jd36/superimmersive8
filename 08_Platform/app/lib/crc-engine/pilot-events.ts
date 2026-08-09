/**
 * CRC pilot event logging (CRC Limited Pilot milestone). Writes to
 * crc_pilot_events -- deliberately not part of SupabaseSessionStore or the
 * SessionStore interface: this is diagnostic/product-learning metadata,
 * not engine state, and the engine must remain entirely unaware it exists.
 *
 * Architectural rule from the approved pilot plan: only the six event
 * types below are logged, because none of them leave any trace anywhere
 * else in crc_sessions. Everything else the pilot needs (completion,
 * turn count, gate states, phases skipped, corrections, unresolved
 * aliases) is already derivable from crc_sessions and must NOT be
 * duplicated here.
 *
 * logPilotEvent() never throws to its caller. Event logging is
 * best-effort, diagnostic-only -- a transient failure to write a log
 * entry must never itself become a new, unhandled failure mode for the
 * actual user-facing request it's trying to describe. A logging failure
 * is itself only console-reported, never re-thrown.
 */

import type { SupabaseClient } from '@supabase/supabase-js'

export const PILOT_EVENT_TYPES = [
  'retryable_failure',
  'persistence_error',
  'missing_session',
  'skip_question',
  'skip_phase',
  'stop_interview',
] as const

export type PilotEventType = (typeof PILOT_EVENT_TYPES)[number]

export interface PilotEvent {
  /**
   * TEXT, not required to resolve to a real crc_sessions row -- a
   * missing_session event's whole point is a token that doesn't. null
   * when no token exists at all (e.g. a malformed request with no cookie).
   */
  session_id: string | null
  event_type: PilotEventType
  /** Short, system-generated diagnostic string only -- never conversation text. */
  detail?: string | null
}

export async function logPilotEvent(client: SupabaseClient, event: PilotEvent): Promise<void> {
  try {
    const { error } = await client
      .from('crc_pilot_events')
      .insert({ session_id: event.session_id, event_type: event.event_type, detail: event.detail ?? null })
    if (error) {
      console.error('[logPilotEvent] insert error', error)
    }
  } catch (err) {
    console.error('[logPilotEvent] unexpected failure', err)
  }
}
