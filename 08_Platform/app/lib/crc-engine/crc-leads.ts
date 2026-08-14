/**
 * crc_leads repository (CRC Results Gate milestone, 2026-08-14). Thin
 * wrapper around the upsert_crc_lead Postgres RPC -- deliberately not the
 * Supabase JS client's own .upsert(), which was confirmed live (2026-08-09,
 * see supabase-session-store.ts's save() comment) to unreliably detect
 * conflicts in this project. The RPC's INSERT ... ON CONFLICT is atomic at
 * the database level, race-safe for two sessions submitting the same new
 * email simultaneously.
 *
 * Email normalization (trim + lowercase, nothing more -- no Gmail-dot or
 * +alias stripping) happens here, once, so every caller gets it for free
 * and can't accidentally skip it.
 */

import type { SupabaseClient } from '@supabase/supabase-js'

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

/**
 * Creates or finds the crc_lead for this email and bumps last_seen_at.
 * Throws on failure -- per the approved DB-failure policy (PM revision,
 * §5), a lead-persistence failure must block the result send entirely, not
 * fail open. The caller is responsible for translating this throw into an
 * honest retryable error and never reaching the Resend call.
 */
export async function upsertCrcLead(client: SupabaseClient, email: string): Promise<{ leadId: string; emailNormalized: string }> {
  const emailNormalized = normalizeEmail(email)
  const { data, error } = await client.rpc('upsert_crc_lead', {
    p_email: email,
    p_email_normalized: emailNormalized,
    p_now: new Date().toISOString(),
  })
  if (error) {
    throw new Error(`[crc-leads] upsertCrcLead failed: ${error.message}`)
  }
  return { leadId: data as string, emailNormalized }
}

/**
 * Links a session to a lead. Separate from upsertCrcLead so the caller can
 * sequence "lead exists" before "session points at it" explicitly, matching
 * the approved write ordering.
 */
export async function linkSessionToLead(client: SupabaseClient, sessionId: string, leadId: string): Promise<void> {
  const { error } = await client.from('crc_sessions').update({ crc_lead_id: leadId }).eq('id', sessionId)
  if (error) {
    throw new Error(`[crc-leads] linkSessionToLead failed: ${error.message}`)
  }
}
