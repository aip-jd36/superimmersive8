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
 *
 * `relevant_applicability_unresolved` (Living Knowledge governance review,
 * 2026-08-16, "relevant applicability" refinement, PM-approved): governed
 * knowledge relevant to the goal's category exists, but CRC cannot
 * responsibly resolve how it applies to THIS project from the
 * applicability/project information CRC currently has. Two sub-cases,
 * deliberately rendered differently (see build-bounded-interpretation.ts
 * and rules.ts for exactly where each branches) because they have
 * different safety properties, not because they're different states:
 *
 *   - Case 3A (a formal `applicability_requirements` gate is unmet -- e.g.
 *     jurisdiction unconfirmed): Retrieval withholds the claim's content
 *     entirely, by design -- it never reaches `matches[]` at all, only a
 *     `RetrievalDiagnostic` with reason `applicability_unmet` does.
 *     `supporting_claim_ids` is `[]` for this sub-case (there is nothing
 *     to cite -- quoting a jurisdiction-specific claim to a user whose
 *     jurisdiction isn't confirmed could misrepresent the applicable law).
 *     Detected from the `diagnostics` parameter now accepted by
 *     `buildBoundedInterpretations`, never by re-deriving applicability
 *     here.
 *
 *   - Case 3B (every formal gate passed, but the claim's own governance
 *     metadata says its real-world application still depends on project
 *     facts CRC doesn't model -- `RetrievalResult.
 *     unresolved_project_dependencies.length > 0`): the claim already
 *     reached `matches[]` exactly as a `directly_relevant` claim would;
 *     its already-governed `candidate_statement` IS quoted, same as
 *     `directly_relevant`, verbatim, never paraphrased. Multiple
 *     complementary claims may be quoted together (mirrors
 *     `directly_relevant`'s own existing multi-claim join). What differs
 *     is only the closing sentence (rules.ts) -- it says CRC cannot
 *     determine from what's known which principle(s) actually govern this
 *     project, instead of `directly_relevant`'s tool/topic boundary
 *     clause. `supporting_claim_ids` IS populated for this sub-case,
 *     mirroring `directly_relevant`.
 *
 * Neither sub-case ever infers a missing fact, invents doctrine, or turns
 * unresolved applicability into a project-specific conclusion -- see
 * rules.ts's own template functions for the exact fixed copy.
 */
export const INTERPRETATION_STATUSES = ['directly_relevant', 'outside_current_coverage', 'determination_declined', 'relevant_applicability_unresolved'] as const
export type InterpretationStatus = (typeof INTERPRETATION_STATUSES)[number]

/**
 * One goal's bounded, deterministic interpretation. `summary` is fixed,
 * templated copy (rules.ts) — never LLM-generated, never paraphrased from a
 * matched claim beyond quoting its already-governed `candidate_statement`
 * verbatim. `supporting_claim_ids` is traceability only (mirrors
 * ProjectionKnowledgeItem.claim_id's own "never itself rendered" discipline)
 * — empty unless status is `directly_relevant`, or `relevant_applicability_
 * unresolved` Case 3B specifically (Case 3A has nothing to cite — see the
 * status doc comment above).
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
  /**
   * CRC Email/UI Structural Readability -- Phase 1 (2026-08-23,
   * PM/Architecture-authorized). Additive presentation-only companion to
   * `summary` -- carries the exact same words, in the exact same order, as
   * separate ordered blocks instead of one pre-joined string, so a
   * renderer can display already-authorized clause boundaries (e.g. CC-1's
   * dependency-free vs. dependency-bearing split) without inferring or
   * inventing new structure. `summary` remains the authoritative flat
   * string and is never removed or altered by this field's existence;
   * `summary_blocks.join(' ')` reconstructs `summary` byte-for-byte for
   * every status (see rules.ts and this module's own test coverage).
   * Always exactly one block for a goal whose composition has no genuine
   * internal boundary (every status except Case-3B's mixed-group shape) --
   * never artificially split. Contains no new proposition, no status, no
   * priority, no valence -- purely a different container for content
   * `summary` already carries.
   */
  summary_blocks: string[]
  supporting_claim_ids: string[]
}
