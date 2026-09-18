/**
 * Material Demand governance-intake foundation (LK-DEMAND-2D1, 2026-09-18).
 * Writes to crc_knowledge_demand_governance_candidates and
 * crc_knowledge_demand_governance_candidate_evidence -- the smallest
 * durable architecture by which qualified Material Demand evidence
 * (crc_knowledge_demand_occurrences, LK-DEMAND-2C) becomes reviewable
 * human-governance input, per LK-DEMAND-2D/2D0.
 *
 * CORE INVARIANT: a governance candidate proves ONLY that a human reviewer
 * intentionally created a review container. An association row proves
 * ONLY that a human reviewer intentionally linked one specific evidence
 * row to one candidate. Neither proves subject identity, a KnowledgeTopic,
 * a domain, knowledge coverage, a knowledge gap, or an onboarding
 * decision -- see the migration's own header
 * (20260918020000_governance_candidates.sql) for the full boundary.
 *
 * HUMAN-ONLY CREATION BOUNDARY: nothing in this module is called from
 * extraction, run-turn.ts, the CRC turn route, completion, the Results
 * Gate, analytics, or traces. Every exported function here is a
 * server-side operation intended to be invoked ONLY from an
 * authenticated-reviewer code path (mirroring lib/reviewer-lk's own
 * requireAdmin()-gated precedent) -- 2D1 ships no such caller (no reviewer
 * UI, no admin route) because none is required for this milestone; these
 * functions exist to be exercised directly (tests, or a future route) and
 * introduce zero automatic candidate creation anywhere.
 *
 * FAIL-CLOSED, unlike knowledge-demand-evidence.ts's own fail-open
 * discipline: every write here THROWS on failure (mirrors
 * lib/reviewer-lk/repository.ts's recordReviewerLkAccess). This is
 * deliberate human governance action, not best-effort side-channel
 * evidence capture -- a reviewer who creates or links a candidate must see
 * an error if the write fails, never silently lose the action.
 *
 * actorUserId (createGovernanceCandidate / linkDemandEvidence): the
 * server-resolved reviewer/admin identity (lib/auth/admin.ts's
 * requireAdmin(), never client-supplied), written verbatim to
 * created_by/linked_by. No FK to `users` -- mirrors the established
 * actor_user_id convention (crc_sales_events, crc_assurance_associations,
 * reviewer_crc_context_access_events), none of which FK to `users` either.
 *
 * Label contract: label is a reviewer's own free-text organizational
 * note. Callers MUST supply their own text -- this module has no raw
 * Material Demand text in scope to auto-populate it from, and must never
 * be changed to accept one for that purpose.
 */

import type { SupabaseClient } from '@supabase/supabase-js'

export interface GovernanceCandidate {
  id: string
  label: string
  created_by: string
  created_at: string
}

export interface GovernanceCandidateEvidenceLink {
  id: string
  candidate_id: string
  evidence_row_id: string
  linked_by: string
  linked_at: string
  unlinked_at: string | null
}

function assertNonEmptyLabel(label: string): void {
  if (label.trim().length === 0) {
    throw new Error('[governance-candidates] label must not be empty or whitespace-only')
  }
}

/**
 * Creates a new governance candidate -- a durable, human-created review
 * container. `label` must be the reviewer's own text, never derived from
 * raw evidence. Throws on failure (fail-closed).
 */
export async function createGovernanceCandidate(
  client: SupabaseClient,
  params: { label: string; actorUserId: string },
): Promise<GovernanceCandidate> {
  assertNonEmptyLabel(params.label)
  const { data, error } = await client
    .from('crc_knowledge_demand_governance_candidates')
    .insert({ label: params.label, created_by: params.actorUserId })
    .select()
    .single()
  if (error) {
    throw new Error(`[governance-candidates] createGovernanceCandidate failed: ${error.message}`)
  }
  return data as GovernanceCandidate
}

/**
 * Edits an existing candidate's own label in place -- a reviewer's working
 * note, not evidence or ontology. No history is kept (LK-DEMAND-2D0's own
 * conclusion: a label edit is low-stakes and reversible by construction,
 * unlike evidence or a governance decision). Cannot mutate evidence or any
 * Living Knowledge registry -- nothing else references label content.
 * Throws on failure (fail-closed) or if candidateId does not exist.
 */
export async function updateGovernanceCandidateLabel(
  client: SupabaseClient,
  params: { candidateId: string; label: string },
): Promise<GovernanceCandidate> {
  assertNonEmptyLabel(params.label)
  const { data, error } = await client
    .from('crc_knowledge_demand_governance_candidates')
    .update({ label: params.label })
    .eq('id', params.candidateId)
    .select()
    .single()
  if (error) {
    throw new Error(`[governance-candidates] updateGovernanceCandidateLabel failed: ${error.message}`)
  }
  return data as GovernanceCandidate
}

/**
 * Links one Material Demand evidence row (its own immutable
 * crc_knowledge_demand_occurrences.id, never occurrence_id) to one
 * candidate.
 *
 * LINK / RELINK semantics (LK-DEMAND-2D1's own explicit correction to the
 * 2D0 design): one candidate x one evidence row = exactly one durable
 * association row, never a second historical row.
 *   - no existing row for (candidateId, evidenceRowId): INSERT, linked_at
 *     = now(), unlinked_at = null.
 *   - existing row, currently active (unlinked_at IS NULL): idempotent
 *     success -- no duplicate insert, no rewrite of linked_at.
 *   - existing row, currently unlinked (unlinked_at IS NOT NULL):
 *     reactivate the SAME row (unlinked_at set back to NULL). linked_at is
 *     preserved at its ORIGINAL first-link value, never advanced to the
 *     reactivation time -- the row represents one durable association,
 *     not activation chronology.
 * Throws on failure (fail-closed), including an invalid candidateId or
 * evidenceRowId (FK violation).
 */
export async function linkDemandEvidence(
  client: SupabaseClient,
  params: { candidateId: string; evidenceRowId: string; actorUserId: string },
): Promise<GovernanceCandidateEvidenceLink> {
  const { data: existing, error: selectError } = await client
    .from('crc_knowledge_demand_governance_candidate_evidence')
    .select()
    .eq('candidate_id', params.candidateId)
    .eq('evidence_row_id', params.evidenceRowId)
    .maybeSingle()
  if (selectError) {
    throw new Error(`[governance-candidates] linkDemandEvidence lookup failed: ${selectError.message}`)
  }

  if (existing) {
    const row = existing as GovernanceCandidateEvidenceLink
    if (row.unlinked_at === null) {
      return row // already active -- idempotent, no rewrite
    }
    const { data, error } = await client
      .from('crc_knowledge_demand_governance_candidate_evidence')
      .update({ unlinked_at: null })
      .eq('id', row.id)
      .select()
      .single()
    if (error) {
      throw new Error(`[governance-candidates] linkDemandEvidence reactivate failed: ${error.message}`)
    }
    return data as GovernanceCandidateEvidenceLink
  }

  const { data, error } = await client
    .from('crc_knowledge_demand_governance_candidate_evidence')
    .insert({ candidate_id: params.candidateId, evidence_row_id: params.evidenceRowId, linked_by: params.actorUserId })
    .select()
    .single()
  if (error) {
    throw new Error(`[governance-candidates] linkDemandEvidence insert failed: ${error.message}`)
  }
  return data as GovernanceCandidateEvidenceLink
}

/**
 * Unlinks one evidence row from one candidate -- sets unlinked_at on the
 * SAME association row, never deletes it (preserves the historical fact
 * that this association once existed and was active).
 *   - active association exists: set unlinked_at = now().
 *   - already unlinked: idempotent success (no-op).
 *   - association never existed: no-op -- never manufactures a historical
 *     association merely to mark it unlinked.
 * Throws only on an actual database failure, never for the "nothing to
 * unlink" cases above.
 */
export async function unlinkDemandEvidence(
  client: SupabaseClient,
  params: { candidateId: string; evidenceRowId: string },
): Promise<GovernanceCandidateEvidenceLink | null> {
  const { data: existing, error: selectError } = await client
    .from('crc_knowledge_demand_governance_candidate_evidence')
    .select()
    .eq('candidate_id', params.candidateId)
    .eq('evidence_row_id', params.evidenceRowId)
    .maybeSingle()
  if (selectError) {
    throw new Error(`[governance-candidates] unlinkDemandEvidence lookup failed: ${selectError.message}`)
  }
  if (!existing) {
    return null // no association ever existed -- no-op, nothing manufactured
  }

  const row = existing as GovernanceCandidateEvidenceLink
  if (row.unlinked_at !== null) {
    return row // already unlinked -- idempotent, no rewrite
  }

  const { data, error } = await client
    .from('crc_knowledge_demand_governance_candidate_evidence')
    .update({ unlinked_at: new Date().toISOString() })
    .eq('id', row.id)
    .select()
    .single()
  if (error) {
    throw new Error(`[governance-candidates] unlinkDemandEvidence failed: ${error.message}`)
  }
  return data as GovernanceCandidateEvidenceLink
}
