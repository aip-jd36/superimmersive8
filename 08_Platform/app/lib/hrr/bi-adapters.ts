/**
 * HRR → Bounded Interpretation input adapters (CAH-4G.3 Slice 3, 2026-09-10).
 *
 * Deferred from Slices 1 and 2 until a real consumer existed (`runHrrResearch`
 * is that consumer). Pure, deterministic, tiny.
 *
 *   `researchIntentToBiIntent`  — a permitted `ExplicitResearchIntent`
 *                                  → the generic `BiIntent`. NO synthetic
 *                                  `UserGoal`; NO CRC type.
 *   `reviewerClaimToBiResult`   — a reviewer-eligible `ReviewerLkClaim`
 *                                  → the generic `BiResult` (the minimal
 *                                  6-field shape BI reads). Needs NONE of
 *                                  `RetrievalResult`'s CRC-shaped fields
 *                                  (`matrix_identifier`, `relationship_id`,
 *                                  `publication_scope`, `topic`,
 *                                  `source_fact.identifier`) — no synthetic
 *                                  value is ever constructed.
 */

import type { BiIntent, BiResult } from '@/lib/bounded-interpretation/types'
import type { ExplicitResearchIntent, ReviewerLkClaim } from '@/lib/reviewer-lk/types'
import { reviewerTopicLabel } from '@/lib/reviewer-lk/topic-labels'

/**
 * `intent_text` is the fixed governed topic label — NOT the reviewer's raw
 * question (CAH-4G.3 safety refinement of the frozen §H proposal). BI uses
 * `intent_text` only as `BoundedInterpretation.goal_text`, which it renders
 * verbatim and never transforms; for CRC that is genuinely the user's own
 * captured words, but for HRR the thing BI is interpreting is "research
 * topic T" — so the honest, safe `goal_text` is the topic label. The raw
 * reviewer question flows entirely separately, as
 * `HrrResearchResult.attributed_question`, for Slice-4 attributed display
 * ("You asked: …") — it never enters BI at all.
 *
 * `intent_id` is deterministic and traceable to the explicit reviewer
 * action: `<source_text_ref or source_kind>:<topic>`.
 */
export function researchIntentToBiIntent(intent: ExplicitResearchIntent): BiIntent {
  const trace = intent.source_text_ref ?? intent.source_kind
  return {
    intent_id: `hrr:${trace}:${intent.topic}`,
    intent_text: reviewerTopicLabel(intent.topic),
    category: intent.topic,
    scope: intent.scope,
  }
}

/**
 * A reviewer-eligible governed claim → the minimal `BiResult`. Every field
 * is a verbatim passthrough of the `ReviewerLkClaim` (itself a verbatim
 * projection of the governed `TopicClaim`):
 *   - `matched_goal_category = claim.topic` — the reviewer-channel selector
 *     only ever returns claims whose own `topic` equals the researched
 *     topic, so this is accurate, not fabricated;
 *   - `candidate_statement = claim.statement` (the governed
 *     `crc_candidate_statement`, verbatim);
 *   - `match_origin = 'exact_topic'` — HRR V1 has no related/discovered
 *     path, and the claim's topic already equals the researched topic;
 *   - `source_fact.kind = 'topic'` — a topic-sourced (non-tool) governed
 *     claim, so BI's tool-terms boundary clause correctly does not fire;
 *   - `applicability` (CAH-4G.3A) — the ALREADY-DETERMINED reviewer
 *     applicability result, translated (never re-evaluated, no fact
 *     inferred): `established` when every requirement is `met`,
 *     `unresolved` when ≥1 requirement is `unresolved` (carrying those
 *     requirement(s) for a later composition step). This is what stops BI
 *     from rendering an applicability-`unresolved` governed proposition as
 *     `directly_relevant`.
 *
 * The caller (`runHrrResearch`) is responsible for NOT passing a claim with
 * any `not_met` applicability requirement here — such a claim is excluded
 * from the BI feed entirely and returned in `does_not_apply[]`.
 */
export function reviewerClaimToBiResult(claim: ReviewerLkClaim): BiResult {
  const unresolved = claim.applicability_outcomes.filter((o) => o.status === 'unresolved')
  return {
    matched_goal_category: claim.topic,
    unresolved_project_dependencies: claim.unresolved_project_dependencies,
    claim_id: claim.claim_id,
    candidate_statement: claim.statement,
    match_origin: 'exact_topic',
    source_fact: { kind: 'topic' },
    applicability:
      unresolved.length > 0
        ? { status: 'unresolved', unresolved_requirements: unresolved.map((o) => o.requirement) }
        : { status: 'established' },
  }
}
