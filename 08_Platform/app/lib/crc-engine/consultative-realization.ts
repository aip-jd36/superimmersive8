/**
 * CC-3B -- deterministic realization helpers over a ConsultativeAnswerPlan
 * (2026-09-02). Pure. No LLM. No new prose. No re-derivation of plan
 * semantics -- these functions read ONLY the already-built plan (CC-3A) and
 * the already-built ProjectionOutput. They never re-read Retrieval
 * diagnostics, never re-classify askability, never re-compute the
 * explicit/discovered split, and never touch Bounded Interpretation.
 *
 * CC-3B's single user-visible job: stop rendering the same governed
 * statement twice -- once raw under "Current guidance" (knowledge_items) and
 * again, verbatim, embedded inside the goal section's own bounded summary
 * ("What this means"). The plan already knows which claims are in a goal
 * section (`explicit_sections[].supported_claim_refs`); this module uses
 * that, and only that, to decide which knowledge_items are redundant to
 * render a second time.
 *
 * Kept separate from `consultative-answer-plan.ts` (plan CONSTRUCTION) on
 * purpose -- construction is CC-3A, consumption is CC-3B, even though they
 * live one directory apart.
 */

import type { ConsultativeAnswerPlan } from './consultative-answer-plan'
import type { ProjectionKnowledgeItem } from '@/lib/projection-layer/types'

export interface PartitionedKnowledgeItems {
  /**
   * Claims whose governed statement is ALREADY rendered, verbatim, inside a
   * goal section's `bi_summary_blocks` (they appear in a plan
   * `explicit_sections[].supported_claim_refs`). A renderer must NOT render
   * these a second time as standalone "Current guidance" -- that repeat is
   * exactly the duplicate presentation CC-3B removes.
   */
  renderedInGoalSection: ProjectionKnowledgeItem[]
  /**
   * Everything else -- a governed consideration Retrieval surfaced that is
   * NOT tied to any explicit-goal section. In the has-goal case these are
   * the plan's discovered-context claims (relevant to the workflow, not to
   * the explicit question); in the no-goal case (no goal_interpretations at
   * all) these are simply all of the knowledge_items and stay the primary
   * content.
   */
  supplementary: ProjectionKnowledgeItem[]
}

/**
 * Structural identity only: matched on `claim_id`, the exact key
 * `BoundedInterpretation.supporting_claim_ids` itself uses (and the key the
 * goal section's refs are derived from). Two DIFFERENT claim_ids are never
 * collapsed, however similar their prose. Nothing is ever dropped -- every
 * input item lands in exactly one output bucket, order preserved.
 */
export function partitionKnowledgeItemsByPlan(
  items: ProjectionKnowledgeItem[],
  plan: ConsultativeAnswerPlan,
): PartitionedKnowledgeItems {
  const inAGoalSection = new Set<string>(
    plan.explicit_sections.flatMap((section) => section.supported_claim_refs.map((ref) => ref.claim_id)),
  )
  const renderedInGoalSection: ProjectionKnowledgeItem[] = []
  const supplementary: ProjectionKnowledgeItem[] = []
  for (const item of items) {
    if (inAGoalSection.has(item.claim_id)) renderedInGoalSection.push(item)
    else supplementary.push(item)
  }
  return { renderedInGoalSection, supplementary }
}

/**
 * True when the plan has at least one explicit-goal section -- i.e. a
 * "What this means for what you asked" block will render, so any leftover
 * knowledge_item is subordinate context, not the primary answer.
 */
export function planHasExplicitGoalSections(plan: ConsultativeAnswerPlan): boolean {
  return plan.explicit_sections.length > 0
}
