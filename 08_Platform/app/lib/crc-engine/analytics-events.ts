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

export const ANALYTICS_EVENT_TYPES = ['cta_click', 'discovery_signal', 'commercial_assurance_bridge_shown'] as const
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
  try {
    const { data, error: selectError } = await client
      .from('crc_analytics_events')
      .select('id')
      .eq('session_id', sessionId)
      .eq('event_type', 'commercial_assurance_bridge_shown')
      .limit(1)
    if (selectError) {
      console.error('[logBridgeShownEventOnce] existence check failed', selectError)
      return
    }
    if (data && data.length > 0) return

    const { error: insertError } = await client
      .from('crc_analytics_events')
      .insert({ session_id: sessionId, event_type: 'commercial_assurance_bridge_shown', event_data: null })
    if (insertError) {
      console.error('[logBridgeShownEventOnce] insert error', insertError)
    }
  } catch (err) {
    console.error('[logBridgeShownEventOnce] unexpected failure', err)
  }
}
