/**
 * Shared Consultative Realization contract (CC-4C.2A, 2026-09-18). Pure. No
 * LLM. No I/O. No mutation of any input. A single deterministic function,
 * `buildConsultativeRealization`, that reshapes an already-built
 * `ConsultativeAnswerPlan` (CC-3A) + `ProjectionOutput` + optional
 * `ConsultativeNote[]` (M2B) into one generic, channel-independent structure
 * a future renderer (email or browser) can consume without making its own
 * semantic composition decisions.
 *
 * ── WHAT THIS IS ────────────────────────────────────────────────────────
 *
 * A reshaping layer only. Every field below is either:
 *   - an identity-preserving copy of something the Plan/ProjectionOutput
 *     already computed (goal_text, category, disposition, content_blocks,
 *     boundary_ref, unresolved_items, missing_evidence, discovered_context),
 *   - a mechanical grouping of that same data by an already-existing,
 *     already-stable identity (goal array position -- see IDENTITY below),
 *     or
 *   - a boolean presence signal derived from already-existing structural
 *     data (commercial_assurance.applies).
 *
 * ── WHAT THIS IS NOT ────────────────────────────────────────────────────
 *
 * It never:
 *   - infers materiality, priority, ranking, a "main"/"key"/"principal"/
 *     "dominant" issue, or causal/legal significance -- every unresolved
 *     item and every missing-evidence item is emitted in the SAME
 *     already-deterministic order CC-3A already produced (see
 *     `PlanGoalSection.unresolved_items`'s own "stable presentation order,
 *     explicitly NOT a priority or materiality rank" doc comment); this
 *     module adds no sort, no score, no weighting;
 *   - derives a "resolved" / "appears_resolved" / "cleared" / "satisfied"
 *     status from anything, including `unresolved_project_dependencies.
 *     length === 0` -- `PlanDisposition` (CC-3A's own vocabulary) is
 *     reproduced verbatim and is the ONLY status concept this module
 *     carries; a `governed_guidance_available` goal_answer may still have a
 *     non-empty entry in `unresolved_groups` for the SAME `goal_index` (the
 *     mixed-resolution case -- see `appendMixedResolutionGuidance` in
 *     build-bounded-interpretation.ts), and this module does nothing to
 *     hide or reconcile that;
 *   - writes a new "why it matters" / rationale / significance / impact
 *     field -- CC-4C.1 established no such semantic exists upstream, and
 *     none is invented here;
 *   - unifies, deduplicates, or synthesizes a `boundary_ref` across goals --
 *     human review explicitly rejected boundary deduplication for this
 *     milestone (CC-4C.1 §H/§M); every `goal_answers[]` entry keeps its OWN
 *     `boundary_ref`, exactly as CC-3A computed it, and this module contains
 *     no equality check or unification logic over that field at all;
 *   - paraphrases, merges, or rewrites any BI-authorized prose --
 *     `content_blocks` is `PlanGoalSection.bi_summary_blocks`, copied
 *     verbatim, array-for-array;
 *   - collapses `answerable_in_conversation` / `requires_documentary_
 *     evidence` / `applicability_unresolved` into each other, or converts a
 *     `requires_documentary_evidence` item into anything askable;
 *   - converts `discovered_context` into a goal, fabricates a `UserGoal`, or
 *     strips `authorizing_goal_category` -- `plan.discovered_context` is
 *     copied through unchanged, array-for-array;
 *   - invents a new Commercial Assurance claim, or any "will resolve" /
 *     "will clear" / "will approve" / "will certify" / "will confirm"
 *     wording -- `commercial_assurance.closing_cta` is
 *     `ProjectionOutput.closing_cta`, copied verbatim (already-approved
 *     fixed copy, assemble-projection-output.ts); `commercial_assurance.
 *     applies` is a plain boolean OR of two already-existing structural
 *     signals, never a count, never a claim/dependency identity (see that
 *     field's own doc comment for why those are deliberately NOT exposed
 *     here);
 *   - introduces any Copyright/Trademark/likeness/music/stock/provider/
 *     client-assets-specific branch -- every function here is generic over
 *     `GoalCategory` and reads no category value except to copy it through.
 *
 * ── IDENTITY ────────────────────────────────────────────────────────────
 *
 * `goal_index` is the array position of a `PlanGoalSection` within
 * `plan.explicit_sections` -- the exact same "ephemeral, per-turn,
 * per-response positional correlator" M2B's own `ConsultativeNote.
 * goal_index` already establishes (unresolved-applicability-realization.ts
 * header), reused here rather than reinvented. `PlanGoalSection` itself
 * carries no persistent goal id (CC-3A deliberately narrowed away
 * `BoundedInterpretation.goal_id`, an internal-only field never meant to
 * cross this boundary) -- array position is the strongest stable identity
 * current architecture legitimately provides, not a fabricated one.
 *
 * ── GROUPING (unresolved_groups / missing_evidence_groups) ─────────────
 *
 * DESIGN CHOICE: a group is emitted only for a goal whose own `items` array
 * is non-empty -- a goal with nothing unresolved / nothing missing produces
 * no entry, rather than an empty-`items` placeholder. This mirrors the
 * existing "empty means absent, a consumer omits the section" convention
 * already used throughout this pipeline (ProjectionOutput.knowledge_items /
 * goal_interpretations, PlanDiscoveredContextItem filtering) rather than
 * inventing a new one. Every item that exists is grouped under its
 * originating `goal_index` -- no unresolved/missing-evidence item can exist
 * in the output without a `goal_index` + `category` attached, by
 * construction (see `buildGroups` below: the group and its `goal_index` are
 * derived from the SAME loop that reads the section's own items, never
 * assembled separately).
 *
 * ── DISCOVERED CONTEXT ──────────────────────────────────────────────────
 *
 * `plan.discovered_context` is copied through unchanged -- CC-3A already
 * filters it to fail-closed provenance (`hasClaimProvenance`) and to only
 * categories an active explicit goal authorizes (`activeCategories`). This
 * module adds no additional grouping (the milestone allows, but does not
 * require, grouping by `authorizing_goal_category`; not adding one is the
 * smaller, more conservative change, and a consumer can group by that
 * already-present field itself if it needs to).
 *
 * ── LOCATION ────────────────────────────────────────────────────────────
 *
 * `lib/crc-engine/`, sibling to `consultative-answer-plan.ts` and
 * `consultative-realization.ts` -- NOT a change to either existing file.
 * `consultative-realization.ts` (CC-3B) is kept exactly as-is: its own job
 * (knowledge-item dedup partitioning against a plan) is a distinct,
 * narrower, already-shipped concern; this module does not touch, import
 * from, or duplicate it. `consultative-answer-plan.ts` (CC-3A) is read-only
 * here (types + the one already-built `ConsultativeAnswerPlan` value this
 * module's input already is).
 *
 * ── CHANNEL INDEPENDENCE (CC-4C.2A) ─────────────────────────────────────
 *
 * This module has ZERO call sites in production code as of this milestone.
 * `results-email-template.ts`, `CrcProjectionOutput.tsx`, `run-crc-
 * conversation.ts`, and the `/api/crc/turn` route are all untouched --
 * wiring this realization into a channel renderer is explicitly deferred to
 * CC-4C.2B, after human review. This module is independent of any UI
 * component, email-sending infrastructure, or locale/presentation-language
 * concern -- it takes no locale parameter and produces no rendered string.
 */

import type {
  ConsultativeAnswerPlan,
  PlanDisposition,
  PlanDiscoveredContextItem,
  PlanMissingEvidenceRef,
  PlanUnresolvedItem,
  RulesBoundaryId,
} from './consultative-answer-plan'
import type { ConsultativeNote } from './unresolved-applicability-realization'
import type { ProjectionOutput } from '@/lib/projection-layer/types'
import type { GoalCategory } from '@/types/interview-engine'

/**
 * One explicit goal's realized answer. `goal_index` is the identity every
 * other per-goal structure in this realization (unresolved_groups,
 * missing_evidence_groups, `note`) correlates back to -- see module header.
 * `boundary_ref` is this goal's OWN, individually-authorized boundary --
 * never unified, never compared against another goal's `boundary_ref` (see
 * module header; human review explicitly rejected boundary deduplication
 * for this milestone).
 */
export interface ConsultativeGoalAnswer {
  goal_index: number
  category: GoalCategory
  /** Verbatim `PlanGoalSection.goal_text` (the user's own words, unchanged since BI). */
  goal_text: string
  /** Verbatim `PlanGoalSection.disposition` -- the ONLY status vocabulary this module uses. Never "resolved". */
  disposition: PlanDisposition
  /** Verbatim `PlanGoalSection.bi_summary_blocks` -- the authoritative, already-governed content. Never paraphrased, merged, or reordered. */
  content_blocks: string[]
  /** Verbatim `PlanGoalSection.boundary_ref` -- this goal's own boundary only. */
  boundary_ref: RulesBoundaryId
  /** The M2B-realized note for this goal, if any (matched by `goal_index` against `notes` -- the same positional correlation M2B's own callers already use). `null`, not omitted, when none exists. */
  note: ConsultativeNote | null
}

/**
 * All of one goal's `PlanUnresolvedItem`s, grouped by their originating
 * goal. `items` is `PlanGoalSection.unresolved_items` copied through
 * unchanged -- same order, same content, same `kind` discrimination. A
 * group's mere existence is NOT a materiality signal; groups are ordered by
 * `goal_index` (the goal's own position in `plan.explicit_sections`), never
 * re-sorted by content.
 */
export interface ConsultativeUnresolvedGroup {
  goal_index: number
  category: GoalCategory
  items: PlanUnresolvedItem[]
}

/**
 * All of one goal's `PlanMissingEvidenceRef`s, grouped the same way as
 * `ConsultativeUnresolvedGroup`. `classification` on each item is preserved
 * exactly (`answerable_in_conversation` / `requires_documentary_evidence` /
 * `applicability_unresolved`) -- never collapsed, never reclassified.
 */
export interface ConsultativeMissingEvidenceGroup {
  goal_index: number
  category: GoalCategory
  items: PlanMissingEvidenceRef[]
}

/**
 * One answer-level Commercial Assurance handoff. Deliberately carries NO
 * reference count, claim id, dependency id, or CA-ref identity -- those
 * remain reachable, unchanged, on the `ConsultativeAnswerPlan` this
 * realization was built from (`plan.commercial_assurance_refs`), for
 * provenance/tests, but are not surfaced here per this milestone's own
 * scope (§6): "the user-facing realization should eventually support one
 * bounded handoff, not implementation metadata."
 */
export interface ConsultativeCommercialAssurance {
  /**
   * True when EITHER `plan.commercial_assurance_refs` is non-empty OR
   * `output.closing_cta` is non-empty (the pre-existing, unconditional,
   * answer-level CA sentence `assemble-projection-output.ts` already
   * attaches to any non-fully-empty conversation). A plain boolean OR of
   * two already-authorized signals -- never a count, so two, five, or
   * fifty duplicate structural refs all produce the same `applies: true`,
   * never multiple handoffs.
   */
  applies: boolean
  /**
   * Verbatim `ProjectionOutput.closing_cta` -- the one existing fixed CA
   * sentence this module reuses. `''` exactly when `ProjectionOutput`
   * itself is in its own "fully empty" state (assemble-projection-
   * output.ts). Never authored, never paraphrased, never strengthened to
   * "will resolve" / "will clear" / "will approve" / "will certify" /
   * "will confirm" language -- no such wording exists in the source string
   * and none is added here.
   */
  closing_cta: string
}

export interface ConsultativeRealization {
  /** One entry per `plan.explicit_sections` entry, same order, same count. */
  goal_answers: ConsultativeGoalAnswer[]
  /** One entry per goal with >=1 unresolved item (see module header's DESIGN CHOICE note). Ordered by goal_index. */
  unresolved_groups: ConsultativeUnresolvedGroup[]
  /** One entry per goal with >=1 missing-evidence item. Ordered by goal_index. */
  missing_evidence_groups: ConsultativeMissingEvidenceGroup[]
  /** Verbatim `plan.discovered_context`, unchanged. */
  discovered_context: PlanDiscoveredContextItem[]
  commercial_assurance: ConsultativeCommercialAssurance
}

/** `notes.find` by `goal_index` -- identical matching discipline to `results-email-template.ts`/`CrcProjectionOutput.tsx`'s own existing `consultativeNotes?.find((n) => n.goal_index === i)` (read-only precedent, not duplicated code -- those files are untouched by this milestone). */
function noteForGoal(notes: ConsultativeNote[], goal_index: number): ConsultativeNote | null {
  return notes.find((n) => n.goal_index === goal_index) ?? null
}

/**
 * Pure. No I/O, no LLM, no mutation of `plan`, `output`, or `notes`. Given
 * structurally identical inputs, produces structurally identical output
 * (CC-4C.2A §9).
 */
export function buildConsultativeRealization(
  plan: ConsultativeAnswerPlan,
  output: ProjectionOutput,
  notes: ConsultativeNote[] = [],
): ConsultativeRealization {
  const goal_answers: ConsultativeGoalAnswer[] = plan.explicit_sections.map((section, goal_index) => ({
    goal_index,
    category: section.category,
    goal_text: section.goal_text,
    disposition: section.disposition,
    content_blocks: section.bi_summary_blocks,
    boundary_ref: section.boundary_ref,
    note: noteForGoal(notes, goal_index),
  }))

  const unresolved_groups: ConsultativeUnresolvedGroup[] = plan.explicit_sections
    .map((section, goal_index) => ({ goal_index, category: section.category, items: section.unresolved_items }))
    .filter((group) => group.items.length > 0)

  const missing_evidence_groups: ConsultativeMissingEvidenceGroup[] = plan.explicit_sections
    .map((section, goal_index) => ({ goal_index, category: section.category, items: section.missing_evidence }))
    .filter((group) => group.items.length > 0)

  const commercial_assurance: ConsultativeCommercialAssurance = {
    applies: plan.commercial_assurance_refs.length > 0 || output.closing_cta !== '',
    closing_cta: output.closing_cta,
  }

  return {
    goal_answers,
    unresolved_groups,
    missing_evidence_groups,
    discovered_context: plan.discovered_context,
    commercial_assurance,
  }
}
