/**
 * crc_analytics_events logging (CRC Identity + Abuse Prevention + Analytics
 * milestone, design report §8). Deliberately a NEW, separate module from
 * pilot-events.ts -- crc_pilot_events exists only for operational
 * diagnostics with no other trace; CTA clicks, the bridge-impression event,
 * and the discovery-eligibility signal are structured product/funnel data,
 * a different kind of thing. See the migration's own header for the full
 * reasoning.
 *
 * logAnalyticsEvent() never throws -- same best-effort, fail-open
 * discipline as logPilotEvent(). Analytics/attribution failures must never
 * become a new failure mode for the user-facing request that triggered
 * them (design report §13).
 *
 * event_data is always small, structured, and NEVER conversation text --
 * enforced here only by discipline (every call site in this codebase
 * passes a narrow, purpose-built object), not by a runtime check, matching
 * how pilot-events.ts's own `detail` field is disciplined the same way.
 */

import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * 'guided_entry_submitted' / 'guided_entry_crc_initialized' /
 * 'free_form_crc_initialized' (GE-2, Guided Entry mobile product surface).
 * Logged server-side, in app/api/crc/turn/route.ts, only at points a real
 * crc_sessions row already exists -- this table's own session_id column is
 * `NOT NULL REFERENCES crc_sessions(id)` (see its migration), and this
 * route's own established discipline (see cta-click/route.ts's own header)
 * is to never trust a client-supplied session_id. A true PRE-session
 * impression (the entry-choice screen shown, or a role card tapped, before
 * any session exists) is therefore deliberately NOT logged to this table in
 * GE-2 -- doing so honestly would require either a schema change (a
 * nullable/non-FK session_id) or trusting a client-generated id, neither
 * undertaken here without a separate, explicit product decision. See
 * GE-2's own Final Report, section M, for the full reasoning.
 */
export const ANALYTICS_EVENT_TYPES = [
  'cta_click',
  'discovery_signal',
  'commercial_assurance_bridge_shown',
  'results_gate_shown',
  'guided_entry_submitted',
  'guided_entry_crc_initialized',
  'free_form_crc_initialized',
] as const
export type AnalyticsEventType = (typeof ANALYTICS_EVENT_TYPES)[number]

export interface AnalyticsEvent {
  session_id: string
  event_type: AnalyticsEventType
  event_data?: Record<string, unknown> | null
}

export async function logAnalyticsEvent(client: SupabaseClient, event: AnalyticsEvent): Promise<void> {
  try {
    const { error } = await client
      .from('crc_analytics_events')
      .insert({ session_id: event.session_id, event_type: event.event_type, event_data: event.event_data ?? null })
    if (error) {
      console.error('[logAnalyticsEvent] insert error', error)
    }
  } catch (err) {
    console.error('[logAnalyticsEvent] unexpected failure', err)
  }
}

/**
 * commercial_assurance_bridge_shown must fire exactly once per completed
 * session (JD's explicit requirement) -- the bridge component can mount
 * more than once for the same session (a page refresh on an already-
 * complete session remounts it), so this checks for an existing row before
 * inserting rather than relying on the caller to only call it once.
 * Fails open/silent on the existence check too -- worst case on a query
 * error is a rare duplicate impression row, never a broken user-facing
 * flow.
 */
export async function logBridgeShownEventOnce(client: SupabaseClient, sessionId: string): Promise<void> {
  await logImpressionEventOnce(client, sessionId, 'commercial_assurance_bridge_shown')
}

/**
 * results_gate_shown (CRC Results Gate milestone, 2026-08-14, PM-approved,
 * §15). Same idempotent-per-session discipline as
 * commercial_assurance_bridge_shown -- the teaser/gate screen can
 * legitimately re-render on refresh, but the funnel metric needs exactly
 * one impression per session. event_data is always null: no email, no
 * transcript, no Projection content -- nothing here beyond "this
 * happened."
 */
export async function logResultsGateShownEventOnce(client: SupabaseClient, sessionId: string): Promise<void> {
  await logImpressionEventOnce(client, sessionId, 'results_gate_shown')
}

async function logImpressionEventOnce(client: SupabaseClient, sessionId: string, eventType: AnalyticsEventType): Promise<void> {
  try {
    const { data, error: selectError } = await client.from('crc_analytics_events').select('id').eq('session_id', sessionId).eq('event_type', eventType).limit(1)
    if (selectError) {
      console.error(`[logImpressionEventOnce:${eventType}] existence check failed`, selectError)
      return
    }
    if (data && data.length > 0) return

    const { error: insertError } = await client.from('crc_analytics_events').insert({ session_id: sessionId, event_type: eventType, event_data: null })
    if (insertError) {
      console.error(`[logImpressionEventOnce:${eventType}] insert error`, insertError)
    }
  } catch (err) {
    console.error(`[logImpressionEventOnce:${eventType}] unexpected failure`, err)
  }
}
