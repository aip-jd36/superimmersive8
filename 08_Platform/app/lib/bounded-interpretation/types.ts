/**
 * Bounded Interpretation — domain types (CRC Milestone 2, User Goal +
 * Bounded Interpretation, 2026-08-15, PM-approved design + revisions).
 * Sibling to, not nested inside, lib/interview-engine/, lib/retrieval-engine/,
 * lib/projection-layer/ — a fourth, architecturally independent subsystem,
 * per the same PRD_CRC_v1.0.md §3 pattern the other three already follow.
 *
 * Purpose: connect a user's CAPTURED goal (UserGoal, Milestone 1) to
 * already-retrieved, already-eligible governed knowledge (RetrievalResult[],
 * Retrieval Engine's own output) via a small, fully deterministic rule
 * table — never a second LLM call, never new legal doctrine authored here,
 * never a fact-conditional matching capability added to Retrieval itself.
 * This module only asks "does an already-eligible result's topic match this
 * goal's category" — a lookup, not an inference.
 *
 * Import boundary: this module may read `@/types/interview-engine` (the
 * shared cross-subsystem contract, same exception every other subsystem
 * already has) and `@/lib/retrieval-engine/types` (RetrievalResult is an
 * input, exactly the same established exception Projection already has for
 * the same type). It must never import Retrieval Engine LOGIC, the Matrix
 * fixture, Interview Engine LOGIC, or Projection Layer — see the
 * subsystem-boundaries test suite's own new describe block for this module.
 *
 * `goal_id` is internal-only (traceability/logging/tests) and must never be
 * rendered to a user — the caller-facing shape derived from this
 * (ProjectionGoalInterpretation, lib/projection-layer/types.ts) deliberately
 * omits it, mirroring how RetrievalResult.claim_id is retained here for the
 * same internal-only reason and ProjectionKnowledgeItem.claim_id is
 * documented as "traceability only, never rendered."
 */

import type { GoalCategory } from '@/types/interview-engine'

/**
 * PM revision 4 (2026-08-15): named `directly_relevant`, not
 * `directly_addressed` — a governed platform claim being relevant to a
 * goal's category does not mean CRC has fully answered the user's overall
 * question (copyright, likeness, trademark, and jurisdiction may all still
 * be uncovered even when a commercial-use tier claim matched). Every
 * template for this status must say "relevant to," never "answers" or
 * "therefore cleared."
 *
 * `outside_current_coverage`: no eligible, topic-matched governed claim
 * exists for this goal's category today. This is the status for BOTH
 * `copyright_ownership` and `copyrightability` in the current Matrix (zero
 * governed coverage for either) and for any category with no matching
 * result among what Retrieval actually returned this conversation.
 *
 * `determination_declined`: the goal's own `scope` is
 * `determination_request` — the user asked CRC itself to certify, clear, or
 * determine something. This status is decided purely from `scope` and is
 * checked BEFORE any category/claim matching — a determination request
 * never receives a category-specific coverage answer, because answering
 * the category question at all would still be issuing something CRC
 * doesn't issue.
 *
 * A fourth status for "an ineligible (CRC-Eligible: No) claim exists for
 * this exact category" was considered and deliberately NOT implemented in
 * Milestone 2 (PM revision 5's "minimal topic-tagging... do not build full
 * topic-based Retrieval" boundary): Retrieval's own enumerateEligibleClaims
 * silently excludes non-Yes claims before a RetrievalResult is ever
 * produced, with no claim-level diagnostic surfacing which claims were
 * excluded and why. Building that visibility would mean extending
 * Retrieval's own diagnostic surface, which this milestone's approval does
 * not cover. A goal whose category has only an ineligible claim (today:
 * only 'likeness', via elevenlabs-voice-consent) resolves to
 * `outside_current_coverage` instead — an honest, if slightly
 * under-specific, answer ("no coverage available to share" is still
 * strictly true), not a misleading one. Documented as a known scoping
 * decision in the Milestone 2 report, not a silent gap.
 */
export const INTERPRETATION_STATUSES = ['directly_relevant', 'outside_current_coverage', 'determination_declined'] as const
export type InterpretationStatus = (typeof INTERPRETATION_STATUSES)[number]

/**
 * One goal's bounded, deterministic interpretation. `summary` is fixed,
 * templated copy (rules.ts) — never LLM-generated, never paraphrased from a
 * matched claim beyond quoting its already-governed `candidate_statement`
 * verbatim. `supporting_claim_ids` is traceability only (mirrors
 * ProjectionKnowledgeItem.claim_id's own "never itself rendered" discipline)
 * — empty unless status is `directly_relevant`.
 */
export interface BoundedInterpretation {
  /** Internal only — never rendered. See module header. */
  goal_id: string
  /** Verbatim UserGoal.raw_text — safe to render, since it is the user's own words, not a transformation of them (PM revision 6). */
  goal_text: string
  category: GoalCategory
  status: InterpretationStatus
  /** Fixed, templated explanation text — see rules.ts. Never invented per-conversation. */
  summary: string
  supporting_claim_ids: string[]
}
