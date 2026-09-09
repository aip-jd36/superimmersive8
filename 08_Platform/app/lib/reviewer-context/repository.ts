/**
 * Reviewer-context data access (CAH-4C).
 *
 * The ONLY module in `lib/reviewer-context/` that talks to the database
 * directly (the service delegates every OTHER read to
 * `lib/crc-assurance-handoff/repository`). It:
 *   - READS `crc_sessions.transcript` for a CRC session id the caller has
 *     ALREADY authorized (server-derived from an active association — this
 *     function does not, and must not, authorize);
 *   - WRITES the fail-closed context-access audit row to
 *     `crc_context_access_events` — the ONLY write CAH-4C introduces.
 *
 * It never reads or writes any `assessments` / `submissions` / `workbook_*` /
 * `crc_sales_*` / `crc_assurance_association*` table. It never writes to
 * `crc_sessions`. Enforced by `__tests__/reviewer-context/authority-firewall.test.ts`.
 */

import { supabaseAdmin } from '@/lib/supabase/admin'

/**
 * Loads the raw persisted `transcript` array for a CRC session. Returns `null`
 * for a non-existent session row; `[]` for a session with an empty transcript.
 * Shaping into `{role,text,timestamp}` entries is the caller's job (via the
 * neutral `shapeCrcTranscript` primitive) — this only fetches the one column.
 */
export async function getCrcSessionTranscript(crcSessionId: string): Promise<unknown[] | null> {
  const { data, error } = await supabaseAdmin
    .from('crc_sessions')
    .select('transcript')
    .eq('id', crcSessionId)
    .maybeSingle()
  if (error) throw new Error(`[reviewer-context/repository] getCrcSessionTranscript: ${error.message}`)
  if (!data) return null
  const raw = (data as { transcript: unknown }).transcript
  return Array.isArray(raw) ? raw : []
}

export interface ReviewerContextAccessAudit {
  actorUserId: string
  submissionId: string
  associationId: string
  crcSessionId: string
}

/**
 * FAIL-CLOSED context-access audit. Persists one `crc_context_access_events`
 * row and THROWS if it cannot be persisted — the caller (the route) MUST NOT
 * return transcript content on throw (CAH-4C §4, mirroring CAH-3B Correction 2
 * for the Sales transcript route). Records the bounded ACCESS FACT only: actor,
 * submission, association, session, timestamp — no transcript text, no
 * "relied upon", no "accepted", no assessment linkage.
 */
export async function recordReviewerTranscriptAccess(audit: ReviewerContextAccessAudit): Promise<void> {
  const { error } = await supabaseAdmin.from('crc_context_access_events').insert({
    access_kind: 'transcript',
    actor_user_id: audit.actorUserId,
    submission_id: audit.submissionId,
    association_id: audit.associationId,
    crc_session_id: audit.crcSessionId,
  })
  if (error) {
    throw new Error(`[reviewer-context/repository] recordReviewerTranscriptAccess failed: ${error.message}`)
  }
}
