/**
 * HRR (Human Reviewer Research) — converged governed-research pipeline
 * types (CAH-4G.3 Slice 3, 2026-09-10).
 *
 * `lib/hrr/` is the CAH-4G convergence layer: it composes `lib/reviewer-lk/`
 * governed selection + eligibility + deterministic applicability with
 * `lib/bounded-interpretation/`. `lib/reviewer-lk/**` stays the deterministic
 * reviewer-LK authority surface with no interpretation layer (its authority
 * firewall — no BI import — is unchanged and still meaningful);
 * `lib/bounded-interpretation/**` stays pure. `lib/hrr/**` is the one place
 * allowed to import both.
 *
 * This is the STRUCTURED INTERNAL research result — sufficient for the later
 * (Slice 4) deterministic composition step. It carries NO final narrative
 * answer, NO assessment conclusion, NO evidence-sufficiency / control /
 * approval / commercial-clearance judgement, and NO model-authored prose.
 * Every string in it is either a verbatim governed value or a
 * `BoundedInterpretation` output (fixed templated copy from
 * `lib/bounded-interpretation/rules.ts`).
 */

import type { InterpretationStatus, UnresolvedRelevantClaim } from '@/lib/bounded-interpretation/types'
import type { GoalScope } from '@/types/interview-engine'
import type { HrrAuthorityGateResult, ReviewerLkClaim, ReviewerLkWithheld, ReviewerResearchTopic } from '@/lib/reviewer-lk/types'

/**
 * One researched governed topic, fully deterministic. `governed_claims` are
 * the reviewer-eligible, applicability-`met`-or-`unresolved` claims that were
 * fed to Bounded Interpretation; `does_not_apply` are the reviewer-eligible
 * claims that were EXCLUDED from BI because a requirement evaluated `not_met`
 * (provably does not apply — never a negative finding, never "unresolved").
 */
export interface HrrResearchTopicResult {
  topic: ReviewerResearchTopic
  /** The clause's own scope. `'determination_request'` → `bi_status` will be `'determination_declined'` (BI's semantic ceiling, not a separate HRR refusal). */
  scope: GoalScope
  intent_origin: 'topic_selection' | 'interpreted_question'
  /** Verbatim from `BoundedInterpretation`. HRR invents no status. */
  bi_status: InterpretationStatus
  /** Verbatim from `BoundedInterpretation.summary_blocks` — fixed templated copy, no new prose. */
  summary_blocks: string[]
  /** Verbatim from `BoundedInterpretation.supporting_claim_ids` — traceability only. */
  supporting_claim_ids: string[]
  /** Verbatim from `BoundedInterpretation.unresolved_relevant_claims`. */
  unresolved_relevant_claims: UnresolvedRelevantClaim[]
  /** The reviewer-eligible claims fed to BI (applicability `met` and/or `unresolved`, none `not_met`). Full `ReviewerLkClaim` projection — verbatim governed fields + per-requirement applicability outcomes. */
  governed_claims: ReviewerLkClaim[]
  /** Reviewer-eligible claims with ≥1 `not_met` requirement — excluded from BI, carried here for a separate "does not apply to this submission" block (Slice 4). */
  does_not_apply: ReviewerLkClaim[]
  /** Claims topic-matched but WITHHELD by the reviewer-channel eligibility gate (not adopted / superseded / not reviewer-eligible scope). Reason only, never content. */
  withheld: ReviewerLkWithheld[]
}

/**
 * The structured internal result of one `runHrrResearch()` call. For
 * `authority_note !== 'research'` (`assessment_judgment_redirected` with no
 * surviving research clause, or `unsupported`), `per_topic` is `[]` and NO
 * governed retrieval / applicability / BI ran.
 */
export interface HrrResearchResult {
  /** Mirrors the authority gate. `'assessment_judgment_redirected'` can still carry `per_topic` entries (the mixed case). */
  authority_note: HrrAuthorityGateResult['authority_note']
  /**
   * The raw reviewer question — carried for Slice-4 ATTRIBUTED display only
   * ("You asked: …"). It NEVER entered governed selection, applicability, or
   * Bounded Interpretation (those received only `{topic, scope}`). `null` for
   * the topic-shortcut path.
   */
  attributed_question: string | null
  per_topic: HrrResearchTopicResult[]
  /** The governed research paths to offer — populated ONLY when `authority_note !== 'research'`; `null` otherwise. Never an invented "closest topic". */
  offered_research_paths: ReviewerResearchTopic[] | null
  /** Passed through from the classifier / gate for Slice-4 UI routing. */
  unresolved_ambiguity: HrrAuthorityGateResult['unresolved_ambiguity']
}
