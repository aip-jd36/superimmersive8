/**
 * One-time backfill: crc_leads from existing crc_sessions.email rows (CRC
 * Results Gate milestone, 2026-08-14, PM-approved §26/§27). Run once,
 * manually, after the migration is applied:
 *
 *   npx tsx --env-file=.env.local lib/crc-engine/scripts/backfill-crc-leads.ts
 *
 * Hard rules (non-negotiable, per approval):
 *   - Does NOT resend historical CRC results -- never calls Resend, never
 *     touches results_email_* columns.
 *   - Does NOT rewrite transcripts.
 *   - Does NOT rewrite historical identity_source (stays 'email_gate' for
 *     every backfilled row -- that's the true, historically accurate
 *     capture mechanism; none of these went through the results gate).
 *   - Only ADDS crc_lead_id -- crc_sessions.email/email_captured_at/
 *     identity_source are read, never written.
 *
 * Uses the SAME upsert_crc_lead RPC live traffic uses (not a separate
 * backfill-specific SQL path), called once per historical session in
 * chronological order per distinct normalized email -- this naturally
 * reconstructs accurate created_at (first session) / last_seen_at (latest
 * session) timestamps via the RPC's own ON CONFLICT DO UPDATE, rather than
 * defaulting everything to "now".
 *
 * Idempotent: re-running is safe -- upsert_crc_lead is itself idempotent,
 * and re-linking a session to the same lead_id it already points to is a
 * no-op.
 */

import { createClient } from '@supabase/supabase-js'

const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

async function main() {
  const { data: sessions, error } = await client
    .from('crc_sessions')
    .select('id, email, created_at')
    .not('email', 'is', null)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Query failed:', error)
    process.exit(1)
  }
  if (!sessions || sessions.length === 0) {
    console.log('No crc_sessions rows with email found. Nothing to backfill.')
    return
  }

  const groups = new Map<string, { rawEmail: string; sessionIds: string[]; createdAts: string[] }>()
  for (const row of sessions) {
    const normalized = normalizeEmail(row.email as string)
    const group = groups.get(normalized) ?? { rawEmail: row.email as string, sessionIds: [], createdAts: [] }
    group.sessionIds.push(row.id as string)
    group.createdAts.push(row.created_at as string)
    groups.set(normalized, group)
  }

  console.log(`Found ${sessions.length} sessions with email, across ${groups.size} distinct normalized addresses.`)

  let leadsCreatedOrUpdated = 0
  let sessionsLinked = 0

  for (const [normalized, group] of groups) {
    let leadId: string | null = null
    // Chronological replay -- first call creates the lead at the earliest
    // session's timestamp, each subsequent call bumps last_seen_at to that
    // session's own timestamp (all via the live upsert_crc_lead RPC).
    for (const createdAt of group.createdAts) {
      const { data, error: rpcError } = await client.rpc('upsert_crc_lead', {
        p_email: group.rawEmail,
        p_email_normalized: normalized,
        p_now: createdAt,
      })
      if (rpcError) {
        console.error(`upsert_crc_lead failed for ${normalized}:`, rpcError)
        continue
      }
      leadId = data as string
    }
    if (!leadId) continue
    leadsCreatedOrUpdated++

    const { error: linkError } = await client.from('crc_sessions').update({ crc_lead_id: leadId }).in('id', group.sessionIds)
    if (linkError) {
      console.error(`Linking sessions failed for ${normalized}:`, linkError)
      continue
    }
    sessionsLinked += group.sessionIds.length
  }

  console.log(`Backfill complete: ${leadsCreatedOrUpdated} leads created/updated, ${sessionsLinked} sessions linked.`)
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
