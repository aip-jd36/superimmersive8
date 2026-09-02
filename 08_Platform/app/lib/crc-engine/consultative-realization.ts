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
 * ("What this means").
 *
 * CC-3B.1 (2026-09-02) render-ownership + structural-identity correction:
 *   - the "already in a goal section" set is `explicit_sections[].
 *     summary_claim_refs` -- EVERY claim whose prose BI folded into that
 *     section's `bi_summary_blocks` (= `BoundedInterpretation.
 *     supporting_claim_ids`), INCLUDING a discovered-origin claim that Track
 *     C routed into the authorizing goal's bounded answer. CC-3B originally
 *     used `supported_claim_refs` (explicit-origin only), which left a
 *     discovered claim's prose rendered once in the goal summary AND again
 *     under the subordinate heading. `discovered_context` still carries the
 *     Track C provenance separately -- unchanged.
 *   - identity is the authoritative structural pair `(matrix_identifier,
 *     claim_id)`, the exact key Retrieval's own dedup uses. `claim_id`
 *     alone is Matrix-authoring convention, not a proven global-uniqueness
 *     invariant (project-knowledge-items.ts case 10). `ProjectionKnowledgeItem`
 *     now carries `matrix_identifier` for this.
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
   * `explicit_sections[].summary_claim_refs`). A renderer must NOT render
   * these a second time -- that repeat is exactly the duplicate presentation
   * CC-3B removes. Includes discovered-origin claims that Track C folded
   * into the authorizing goal's bounded answer (their `discovered_context`
   * provenance is retained separately by the plan).
   */
  renderedInGoalSection: ProjectionKnowledgeItem[]
  /**
   * Everything else -- a governed consideration Retrieval surfaced whose
   * prose is NOT in any goal section's summary. In the has-goal case these
   * are discovered-context claims whose authorizing goal rendered no claim
   * prose (e.g. a determination-declined or outside-coverage goal); in the
   * no-goal case these are simply all of the knowledge_items and stay the
   * primary content.
   */
  supplementary: ProjectionKnowledgeItem[]
}

/**
 * `(matrix_identifier, claim_id)` -- the authoritative structural identity,
 * space-joined (matching CC-3A's own `render_once_markers` key). Neither
 * component ever contains a space: matrix/topic identifiers and claim ids
 * are slugs. This key is internal to this function and never serialized.
 */
function structuralKey(matrix_identifier: string, claim_id: string): string {
  return `${matrix_identifier} ${claim_id}`
}

/**
 * Structural identity only: `(matrix_identifier, claim_id)`, the exact key
 * Retrieval's own dedup uses. Two DIFFERENT structural identities are never
 * collapsed, however identical their prose. Nothing is ever dropped --
 * every input item lands in exactly one output bucket, order preserved.
 * An item missing `matrix_identifier` (should never happen -- it is a
 * required field) fails closed to `supplementary` (rendered, not suppressed).
 */
export function partitionKnowledgeItemsByPlan(
  items: ProjectionKnowledgeItem[],
  plan: ConsultativeAnswerPlan,
): PartitionedKnowledgeItems {
  const inAGoalSection = new Set<string>(
    plan.explicit_sections.flatMap((section) =>
      section.summary_claim_refs.map((ref) => structuralKey(ref.matrix_identifier, ref.claim_id)),
    ),
  )
  const renderedInGoalSection: ProjectionKnowledgeItem[] = []
  const supplementary: ProjectionKnowledgeItem[] = []
  for (const item of items) {
    const owned =
      typeof item.matrix_identifier === 'string' &&
      item.matrix_identifier.length > 0 &&
      inAGoalSection.has(structuralKey(item.matrix_identifier, item.claim_id))
    if (owned) renderedInGoalSection.push(item)
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
