/**
 * projectHrrAuditRecord — deterministic sanitized audit projection for one HRR
 * research action (CAH-4G.5 Slice 5).
 *
 * ── WHAT AN HRR AUDIT RECORD MEANS ───────────────────────────────────────
 * "An authorized Human Reviewer used the governed Living Knowledge research
 *  capability, in this authorized submission context, at this time."
 *
 * ── WHAT IT DOES NOT MEAN ────────────────────────────────────────────────
 * NOT that the reviewer considered a topic important. NOT that the reviewer
 * relied on, accepted, or was influenced by any governed proposition. NOT a
 * finding, a control result, evidence, evidence sufficiency, assessment
 * reasoning, an assessment outcome, or a sign-off. It is an ACCESS / RESEARCH
 * fact (audit class A), never an assessment fact (audit class B).
 *
 * ── SCHEMA (CAH-4G.5 Option A — existing contract reused UNCHANGED) ───────
 * The record is exactly `{ actorUserId, submissionId }` — the same bounded
 * ACCESS FACT the deployed CAH-4E reviewer topic look-up already writes via
 * `recordReviewerLkAccess` into `crc_context_access_events`
 * (`access_kind = 'lk_research'`). The `lk_research` access kind is defined
 * (migration `20260910000000`) as "a Human Reviewer deliberately looks up
 * governed SI8 Living Knowledge" — which is exactly what HRR is, for BOTH the
 * topic-chip and the free-form entry mode. No topic, no claim ids, no research
 * mode, no BI status, no raw question, no answer prose is persisted — there is
 * no column for any of it and none is added.
 *
 * ── RAW-TEXT / PROSE FIREWALL ────────────────────────────────────────────
 * PURE. Reads ONLY the already-bounded structured `HrrResearchResult` and the
 * server-resolved identity. It NEVER reads `result.attributed_question`, never
 * touches `HrrResearchAnswer`, never re-runs classification / applicability /
 * Bounded Interpretation, and is structurally incapable of spreading raw
 * reviewer text into the payload: it names its two fields explicitly and
 * copies nothing else. There is no `{ ...result }` / `{ ...answer }` anywhere.
 */

import type { ReviewerLkAccessAudit } from '@/lib/reviewer-lk/types'
import type { HrrResearchResult } from './types'

/**
 * Whether the pipeline actually performed governed Living Knowledge research
 * for this action — true iff ≥1 permitted research clause ran
 * `selectReviewerClaims` + Bounded Interpretation (`result.per_topic` is
 * non-empty). A pure assessment-authority redirect with no surviving research
 * clause, and an unsupported / over-general question, both perform NO governed
 * research → no `lk_research` access event is created (CAH-4G.5 Phase 10:
 * never record governed-knowledge access when no governed knowledge was
 * accessed; never fabricate claim access).
 */
export function hrrGovernedResearchOccurred(result: HrrResearchResult): boolean {
  return result.per_topic.length > 0
}

/**
 * The sanitized, bounded audit record for one HRR research action, or `null`
 * when no governed research occurred (→ no audit event).
 *
 * One record per reviewer action, regardless of how many governed topics the
 * free-form classifier resolved (up to `HRR_MAX_RESOLVED_TOPICS`): the record
 * represents ONE reviewer action, and the reused `lk_research` contract records
 * no per-topic / per-claim detail — writing one row per resolved topic would
 * falsely imply that many separate look-ups occurred.
 */
export function projectHrrAuditRecord(
  identity: { actorUserId: string; submissionId: string },
  result: HrrResearchResult,
): ReviewerLkAccessAudit | null {
  if (!hrrGovernedResearchOccurred(result)) return null
  return { actorUserId: identity.actorUserId, submissionId: identity.submissionId }
}
