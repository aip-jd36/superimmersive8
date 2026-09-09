/**
 * Reviewer-LK data access (CAH-4E §12).
 *
 * The ONLY module in `lib/reviewer-lk/` that touches the database. It does
 * exactly two things:
 *   1. READ two authoritative, non-authority columns of one `submissions`
 *      row (`tools_used`, `territory_preferences`) — the submission facts
 *      used to narrow governed-knowledge retrieval (CAH-4E §7). This is a
 *      read of SUBMISSION FACTS, never assessment/workbook/evidence state.
 *   2. WRITE an append-only INSERT of the bounded LK-research access fact
 *      into `crc_context_access_events` (`access_kind = 'lk_research'`) —
 *      the ONLY write CAH-4E introduces.
 *
 * It NEVER reads or writes any `assessments` / `workbook_*` / `crc_sales_*` /
 * `crc_assurance_association*` table, NEVER writes `submissions` or
 * `crc_sessions`, and never reads a `submissions` column outside the two
 * named above. Governed-knowledge selection reads only the in-memory
 * `TOPIC_CLAIMS_FIXTURE`. Enforced by
 * `__tests__/reviewer-lk/authority-firewall.test.ts`.
 *
 * FAIL-CLOSED: `recordReviewerLkAccess` THROWS if the audit row cannot be
 * persisted. The caller (the route) MUST NOT return any governed LK content
 * on throw (CAH-4E §12, mirroring CAH-4C's transcript audit-before-content).
 * The row records the bounded ACCESS FACT only — actor, submission, time. No
 * query text, no returned claim text, no reviewer interpretation, no reliance
 * assertion. `association_id` / `crc_session_id` are left NULL — LK research
 * is not tied to any CRC association.
 */

import { supabaseAdmin } from '@/lib/supabase/admin'
import type { ReviewerLkAccessAudit } from './types'
import type { ReviewerLkSubmissionFactsInput } from './submission-facts'

/**
 * Reads the two authoritative submission-fact columns used to narrow
 * governed-knowledge retrieval. Returns `null` if the submission does not
 * exist. Never reads any other column, never any assessment/workbook state.
 */
export async function getSubmissionFactsForReviewerLk(
  submissionId: string,
): Promise<ReviewerLkSubmissionFactsInput | null> {
  const { data, error } = await supabaseAdmin
    .from('submissions')
    .select('tools_used, territory_preferences')
    .eq('id', submissionId)
    .maybeSingle()
  if (error) throw new Error(`[reviewer-lk/repository] getSubmissionFactsForReviewerLk: ${error.message}`)
  if (!data) return null
  return {
    tools_used: (data as { tools_used: unknown }).tools_used,
    territory_preferences: (data as { territory_preferences: unknown }).territory_preferences,
  }
}

export async function recordReviewerLkAccess(audit: ReviewerLkAccessAudit): Promise<void> {
  const { error } = await supabaseAdmin.from('crc_context_access_events').insert({
    access_kind: 'lk_research',
    actor_user_id: audit.actorUserId,
    submission_id: audit.submissionId,
    // association_id / crc_session_id deliberately omitted (NULL): LK research
    // has no CRC association. The migration's `_transcript_is_scoped` CHECK is
    // guarded on `access_kind = 'transcript'`, so a NULL pair is valid here.
  })
  if (error) {
    throw new Error(`[reviewer-lk/repository] recordReviewerLkAccess failed: ${error.message}`)
  }
}
