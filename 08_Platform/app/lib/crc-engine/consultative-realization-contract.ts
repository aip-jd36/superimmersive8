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
 * `unresolved_groups[].items` is `section.unresolved_items` passed through
 * `collapseExactSameClaimApplicabilityDuplicates` (CC-4C.2F, 2026-09-19) --
 * see that function's own header for the full, narrowly-scoped predicate.
 * This is the ONE exception to "copied through unchanged" for
 * `unresolved_items` specifically: `missing_evidence_groups[].items` remains
 * an exact, uncollapsed copy of `section.missing_evidence`, and
 * `ConsultativeAnswerPlan` itself is never mutated -- Plan stays
 * provenance-complete, carrying every original item.
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
import type { ApplicabilityUnresolvedReason } from '@/lib/retrieval-engine/types'
import { getDependencyDisplayLabel } from './dependency-fact-display'

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

/**
 * CRC-CC-SCOPE-5 (2026-09-24) -- the smallest structural vocabulary for how
 * an already-authorized unresolved item MAY later be organized for
 * presentation. `'primary'` is the existing/default treatment (byte-
 * identical to all pre-SCOPE-5 behavior); `'scoped_context'` is the one
 * currently-authorized non-default treatment, reserved for the single
 * explicitly-approved case (see `presentationRoleForUnresolvedReason`
 * below). Structural only -- does NOT mean, and must never be read to
 * imply: material/immaterial, important/unimportant, high/low priority,
 * risk, blocker/non-blocker, relevant/irrelevant, applicable/not
 * applicable, inside/outside legal scope, safe to ignore, or commercial
 * clearance. Does NOT modify `PlanUnresolvedItem`, `BoundedInterpretation`
 * disposition, or applicability status -- those remain exactly as computed
 * upstream, in `unresolved_groups`/`missing_evidence_groups`, unchanged by
 * this milestone. This milestone is propagation/organization data only --
 * no renderer reads this value.
 */
export type ConsultativeUnresolvedPresentationRole = 'primary' | 'scoped_context'

/**
 * CRC-CC-SCOPE-5 (2026-09-24) -- the ONLY currently-authorized mapping from
 * an evaluator-owned `ApplicabilityUnresolvedReason` to a non-default
 * presentation role. Deliberately an exhaustive `Record` over
 * `ApplicabilityUnresolvedReason`, NOT a `reason !== null` / `reason ?
 * ... : ...` test -- adding a second literal to that union without adding a
 * corresponding entry here is a TypeScript compile error, forcing conscious
 * human review before any future reason can acquire non-default
 * presentation behavior (human-review correction, SCOPE-5 milestone
 * instructions -- a prior `!== null` design was explicitly rejected as too
 * broad). No new future reason may be added to this table by this
 * milestone.
 */
const AUTHORIZED_SCOPED_CONTEXT_REASONS: Record<ApplicabilityUnresolvedReason, boolean> = {
  value_not_among_established_values: true,
}

/**
 * CRC-CC-SCOPE-5 (2026-09-24) -- Realization-owned, the sole function
 * translating a bounded technical reason into a presentation role. `null`
 * (scope dimension unknown, or no evaluator-supplied reason at all) ->
 * `'primary'`, always. A non-null reason -> `'scoped_context'` ONLY when
 * explicitly present (and `true`) in `AUTHORIZED_SCOPED_CONTEXT_REASONS`;
 * `=== true` (not merely truthy) is a deliberate defensive runtime check --
 * an unrecognized string that somehow bypasses the compile-time
 * `ApplicabilityUnresolvedReason` type (a malformed/adversarial runtime
 * value) looks up as `undefined` in the Record and therefore fails closed
 * to `'primary'` here too, with no special-casing required. Reads no
 * project fact, no `ApplicabilityRequirement`, no jurisdiction/tool/claim
 * category value, no `UserGoal` text -- the technical reason is the only
 * input, per this milestone's own explicit prohibition on reconstructing
 * or inspecting evaluator semantics here.
 */
function presentationRoleForUnresolvedReason(reason: ApplicabilityUnresolvedReason | null): ConsultativeUnresolvedPresentationRole {
  if (reason === null) return 'primary'
  return AUTHORIZED_SCOPED_CONTEXT_REASONS[reason] === true ? 'scoped_context' : 'primary'
}

/**
 * CRC-CC-SCOPE-5 (2026-09-24) -- the single place presentation role is
 * derived for an unresolved item of ANY kind. `open_project_dependency`
 * items carry no `unresolved_reason` field at all (a structurally distinct
 * mechanism from applicability -- see `PlanUnresolvedItem`'s own header,
 * consultative-answer-plan.ts) and therefore always resolve to `'primary'`,
 * exactly like a `null` reason on the other two kinds -- never a special
 * case, just the natural consequence of that kind never producing a
 * reason to look up.
 */
function roleForUnresolvedItem(item: PlanUnresolvedItem): ConsultativeUnresolvedPresentationRole {
  if (item.kind === 'open_project_dependency') return 'primary'
  return presentationRoleForUnresolvedReason(item.unresolved_reason)
}

/**
 * CRC-CC-SCOPE-6F (2026-09-25) -- the single place a governed dependency
 * display label is resolved for an unresolved item of ANY kind. Reads only
 * `dependency_id`, and only for `kind === 'open_project_dependency'` --
 * `unresolved_applicability`/`withheld_relevant_claim` items always resolve
 * to `null` here, unaffected; their own display resolution (the
 * `ApplicabilityFact` registry, `applicability-fact-display.ts`) remains
 * exactly where it already was, in `results-email-template.ts`, untouched
 * by this milestone (SCOPE-6F's own narrow scope -- see that milestone's
 * own architectural-requirement section for why this is deliberate, not an
 * oversight: moving the ALREADY-WORKING applicability lookup into
 * Realization is explicitly out of scope here). `getDependencyDisplayLabel`
 * is fail-closed by construction (`undefined` for any unregistered/unknown
 * ID) -- `?? null` narrows that to the fixed `string | null` contract this
 * field promises; no fallback text, no mechanical derivation from the ID,
 * ever originates here.
 */
function dependencyDisplayLabelForUnresolvedItem(item: PlanUnresolvedItem): string | null {
  if (item.kind !== 'open_project_dependency') return null
  return getDependencyDisplayLabel(item.dependency_id) ?? null
}

/**
 * One `PlanUnresolvedItem`, annotated with its Realization-derived
 * presentation role. `item` is the EXACT, unmutated Plan item -- full
 * semantic provenance (claim_id, fact, tool, unresolved_reason, dependency
 * fields) is preserved verbatim; this wrapper adds metadata, it never
 * replaces or narrows the underlying item. Goal-local only, exactly like
 * `ConsultativeUnresolvedGroup` -- never correlated across goals.
 *
 * `display_label` (CRC-CC-SCOPE-6F, 2026-09-25) -- additive. The governed,
 * already-resolved dependency display label for this item, or `null` when
 * none is authorized (every kind other than `open_project_dependency`;
 * every unregistered dependency ID; every evidence-only dependency that has
 * not been separately, explicitly labeled). A renderer consuming this field
 * never inspects `dependency_id`, never derives wording, and never learns
 * WHY the label is absent -- absence is uniformly "no governed vocabulary
 * exists for this item," the same fail-closed signal regardless of cause.
 */
export interface ConsultativeUnresolvedItemPresentation {
  goal_index: number
  category: GoalCategory
  item: PlanUnresolvedItem
  presentation_role: ConsultativeUnresolvedPresentationRole
  display_label: string | null
}

/**
 * One `PlanMissingEvidenceRef`, annotated with a presentation role
 * INHERITED from its exactly-correlated originating `PlanUnresolvedItem`
 * (see `findCorrelatedUnresolvedItem`'s own header) -- never independently
 * derived from `dependency_id`, `applicability_fact`, `classification`, or
 * any other evidence-shaped field. `item` is the exact, unmutated
 * `PlanMissingEvidenceRef` -- evidence classification, askability
 * treatment, and presence are entirely unaffected by this annotation.
 */
export interface ConsultativeMissingEvidencePresentation {
  goal_index: number
  category: GoalCategory
  item: PlanMissingEvidenceRef
  presentation_role: ConsultativeUnresolvedPresentationRole
}

/**
 * CRC-CC-SCOPE-5 (2026-09-24) -- exact-correlation only, fail-closed.
 * Matches a `PlanMissingEvidenceRef` back to the single `PlanUnresolvedItem`
 * (within the SAME already-2F-collapsed goal-local item list) that caused
 * it, using only the identity-field pairing `consultative-answer-plan.ts`'s
 * own `missing_evidence` construction already establishes as 1:1:
 *   - a ref with `dependency_id === null` (applicability-shaped) can only
 *     have been produced from an `unresolved_applicability` item, by
 *     `source_claim_id === claim_id` + `applicability_fact === fact`;
 *   - a ref with `dependency_id !== null` (dependency-shaped) can only have
 *     been produced from an `open_project_dependency` item, by
 *     `source_claim_id === source_claim_id` + `dependency_id === dependency_id`.
 * `withheld_relevant_claim` items are NEVER candidates -- Plan's own
 * `missing_evidence` derivation never produces a ref for that kind ("Nothing
 * to classify from the bare claim_id alone -- do not invent one"). Returns
 * `undefined` (never guesses, never picks a "closest" match) unless EXACTLY
 * ONE candidate matches -- covering zero matches, and the multi-requirement/
 * multi-claim ambiguous cases this milestone's own instructions require to
 * fail closed.
 */
function findCorrelatedUnresolvedItem(ref: PlanMissingEvidenceRef, items: PlanUnresolvedItem[]): PlanUnresolvedItem | undefined {
  const candidates = items.filter((item) => {
    if (ref.dependency_id === null) {
      return ref.applicability_fact !== null && item.kind === 'unresolved_applicability' && item.claim_id === ref.source_claim_id && item.fact === ref.applicability_fact
    }
    return item.kind === 'open_project_dependency' && item.source_claim_id === ref.source_claim_id && item.dependency_id === ref.dependency_id
  })
  return candidates.length === 1 ? candidates[0] : undefined
}

export interface ConsultativeRealization {
  /** One entry per `plan.explicit_sections` entry, same order, same count. */
  goal_answers: ConsultativeGoalAnswer[]
  /** One entry per goal with >=1 unresolved item (see module header's DESIGN CHOICE note). Ordered by goal_index. */
  unresolved_groups: ConsultativeUnresolvedGroup[]
  /** One entry per goal with >=1 missing-evidence item. Ordered by goal_index. */
  missing_evidence_groups: ConsultativeMissingEvidenceGroup[]
  /**
   * CRC-CC-SCOPE-5 (2026-09-24) -- additive, propagation/organization data
   * only; no renderer reads this yet. One entry per item in
   * `unresolved_groups` (same items, same 2F-collapsed set, same order,
   * flattened across goals) -- never a filtered or narrowed view. Full
   * semantic provenance is preserved verbatim inside each `item`.
   */
  unresolved_item_presentation: ConsultativeUnresolvedItemPresentation[]
  /**
   * CRC-CC-SCOPE-5 (2026-09-24) -- additive, propagation/organization data
   * only; no renderer reads this yet. One entry per item in
   * `missing_evidence_groups` (same items, same order, flattened across
   * goals) -- never a filtered or narrowed view. `presentation_role` is
   * `'primary'` whenever exact correlation to an originating unresolved
   * item is not possible (see `findCorrelatedUnresolvedItem`).
   */
  missing_evidence_presentation: ConsultativeMissingEvidencePresentation[]
  /** Verbatim `plan.discovered_context`, unchanged. */
  discovered_context: PlanDiscoveredContextItem[]
  commercial_assurance: ConsultativeCommercialAssurance
}

/** `notes.find` by `goal_index` -- identical matching discipline to `results-email-template.ts`/`CrcProjectionOutput.tsx`'s own existing `consultativeNotes?.find((n) => n.goal_index === i)` (read-only precedent, not duplicated code -- those files are untouched by this milestone). */
function noteForGoal(notes: ConsultativeNote[], goal_index: number): ConsultativeNote | null {
  return notes.find((n) => n.goal_index === goal_index) ?? null
}

/**
 * CC-4C.2F (2026-09-19), human-approved exact collapse predicate. Removes,
 * from ONE goal's already-computed `unresolved_items`, the
 * `withheld_relevant_claim` half of a pair that is structurally proven
 * (CC-4C.2E) to represent the SAME underlying `UnmetApplicabilityDetail` as
 * a sibling `unresolved_applicability` item -- two independent, pre-existing
 * Plan-construction loops (`consultative-answer-plan.ts`) read the same
 * `RetrievalDiagnostic.unmet_applicability` data and, for a withheld
 * (never-matched) claim, always produce one item of each kind with
 * identical `claim_id`/`fact`/`tool`. This function does NOT touch
 * `ConsultativeAnswerPlan` -- Plan remains provenance-complete, carrying
 * both original items unchanged; only this realization-level, answer-facing
 * copy is affected.
 *
 * ELIGIBLE ONLY WHEN, for one `withheld_relevant_claim` item W and one
 * `unresolved_applicability` item U within the SAME `items` array (i.e. the
 * same goal / same `ConsultativeUnresolvedGroup` -- this function is called
 * once per goal section, so cross-goal pairing is structurally impossible):
 *   1. W.claim_id === U.claim_id
 *   2. W.fact !== null            (an ambiguous/absent fact -- CC-4C.2D's
 *                                  own fail-closed {fact:null,tool:null}
 *                                  case -- can never participate; two
 *                                  unknowns are never treated as the same
 *                                  thing)
 *   3. W.fact === U.fact
 *   4. W.tool === U.tool
 * Symmetric with respect to source ordering (Plan's own `sortUnresolvedItems`
 * places `withheld_relevant_claim` before `unresolved_applicability` by
 * `UNRESOLVED_KIND_ORDER`, but this function never assumes that order).
 *
 * SURVIVING REPRESENTATION: `unresolved_applicability` is retained,
 * `withheld_relevant_claim` is removed. DESIGN CHOICE (human-approved,
 * per this milestone's own Part 3): `unresolved_applicability` is the
 * direct requirement-instance representation and is what Plan's own
 * `missing_evidence` derivation already reads (`classifyApplicabilityFact`)
 * -- unaffected either way, since `missing_evidence` is computed entirely
 * in Plan, before this function ever runs, and this function never touches
 * `PlanMissingEvidenceRef`/`missing_evidence_groups`. The one OBSERVABLE
 * consequence of this choice: when `fact` has no registered display label
 * (`getApplicabilityFactLabel` returns `undefined`), `results-email-
 * template.ts`'s existing, UNCHANGED `unresolvedItemSentence` falls back to
 * `unresolved_applicability`'s own fallback ("A related condition hasn't
 * been confirmed in this conversation."), never `withheld_relevant_claim`'s
 * ("An additional governed consideration for this topic hasn't been
 * confirmed.") -- both were already existing, already-approved fallback
 * strings; this function only decides which ONE of the two pre-existing
 * strings survives when a pair collapses, authors neither.
 *
 * MULTIPLICITY / FAIL-CLOSED (CC-4C.2E Part 13): current Plan construction
 * can allow a withheld claim's own `unresolved_relevant_claims` entry
 * (deduped 1:1 by `claim_id` at the BI layer -- see build-bounded-
 * interpretation.ts's `collectUnresolvedRelevantClaimIds`) to coexist with
 * MORE THAN ONE `unresolved_applicability` item sharing the identical
 * `(claim_id, fact, tool)` -- e.g. if a governed claim's own
 * `applicability_requirements` array happened to contain a literal
 * duplicate requirement (not type-prevented, though not observed in
 * production governed data). When a withheld item has zero or MORE THAN
 * ONE matching `unresolved_applicability` candidate, it is left
 * untouched -- never collapsed, never guessed. This function never removes
 * an `unresolved_applicability` item; same-kind duplicates (two
 * `unresolved_applicability` items, or two `withheld_relevant_claim`
 * items) are explicitly out of this milestone's approved predicate and are
 * never touched, regardless of how many fields they share.
 *
 * No lookups, no Retrieval diagnostics, no Living Knowledge access, no
 * display strings, no semantic inference -- reads only the four already-
 * existing fields (`kind`, `claim_id`, `fact`, `tool`) already present on
 * `PlanUnresolvedItem`.
 */
function collapseExactSameClaimApplicabilityDuplicates(items: PlanUnresolvedItem[]): PlanUnresolvedItem[] {
  type UnresolvedApplicabilityItem = Extract<PlanUnresolvedItem, { kind: 'unresolved_applicability' }>
  const applicabilityByClaimId = new Map<string, UnresolvedApplicabilityItem[]>()
  for (const item of items) {
    if (item.kind !== 'unresolved_applicability') continue
    const existing = applicabilityByClaimId.get(item.claim_id)
    if (existing) existing.push(item)
    else applicabilityByClaimId.set(item.claim_id, [item])
  }

  const withheldToRemove = new Set<PlanUnresolvedItem>()
  for (const item of items) {
    if (item.kind !== 'withheld_relevant_claim') continue
    if (item.fact === null) continue
    const candidates = (applicabilityByClaimId.get(item.claim_id) ?? []).filter((u) => u.fact === item.fact && u.tool === item.tool)
    if (candidates.length !== 1) continue // 0 -> no eligible sibling; >1 -> ambiguous, fail closed (retain everything)
    withheldToRemove.add(item)
  }

  return withheldToRemove.size === 0 ? items : items.filter((item) => !withheldToRemove.has(item))
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

  // CC-4C.2F: collapses ONLY the exact same-claim withheld_relevant_claim/
  // unresolved_applicability pair, per goal, per section.unresolved_items --
  // never across goals (this .map() runs once per section, already
  // goal-scoped). Plan itself (`section.unresolved_items`) is never mutated
  // or reassigned -- see collapseExactSameClaimApplicabilityDuplicates's
  // own header. CRC-CC-SCOPE-5 (2026-09-24): computed ONCE per goal here
  // and reused for both `unresolved_groups` and `unresolved_item_presentation`
  // below -- never re-collapsed independently, so the two can never diverge.
  const unresolvedByGoal = plan.explicit_sections.map((section, goal_index) => ({
    goal_index,
    category: section.category,
    items: collapseExactSameClaimApplicabilityDuplicates(section.unresolved_items),
  }))

  const unresolved_groups: ConsultativeUnresolvedGroup[] = unresolvedByGoal.filter((group) => group.items.length > 0)

  const missing_evidence_groups: ConsultativeMissingEvidenceGroup[] = plan.explicit_sections
    .map((section, goal_index) => ({ goal_index, category: section.category, items: section.missing_evidence }))
    .filter((group) => group.items.length > 0)

  // CRC-CC-SCOPE-5 (2026-09-24): additive presentation-role annotation,
  // flattened across goals, one entry per already-2F-collapsed unresolved
  // item -- see ConsultativeUnresolvedItemPresentation's own header.
  // CRC-CC-SCOPE-6F (2026-09-25): `display_label` resolved here too, from
  // the SAME item, in the SAME pass -- never a second, independently-timed
  // lookup.
  const unresolved_item_presentation: ConsultativeUnresolvedItemPresentation[] = unresolvedByGoal.flatMap((group) =>
    group.items.map((item) => ({
      goal_index: group.goal_index,
      category: group.category,
      item,
      presentation_role: roleForUnresolvedItem(item),
      display_label: dependencyDisplayLabelForUnresolvedItem(item),
    })),
  )

  // CRC-CC-SCOPE-5 (2026-09-24): additive presentation-role annotation for
  // missing evidence, inherited from the exactly-correlated originating
  // unresolved item (fails closed to 'primary' otherwise) -- see
  // findCorrelatedUnresolvedItem's own header.
  const missing_evidence_presentation: ConsultativeMissingEvidencePresentation[] = plan.explicit_sections.flatMap((section, goal_index) =>
    section.missing_evidence.map((ref) => {
      const correlated = findCorrelatedUnresolvedItem(ref, unresolvedByGoal[goal_index].items)
      return { goal_index, category: section.category, item: ref, presentation_role: correlated ? roleForUnresolvedItem(correlated) : ('primary' as const) }
    }),
  )

  const commercial_assurance: ConsultativeCommercialAssurance = {
    applies: plan.commercial_assurance_refs.length > 0 || output.closing_cta !== '',
    closing_cta: output.closing_cta,
  }

  return {
    goal_answers,
    unresolved_groups,
    missing_evidence_groups,
    unresolved_item_presentation,
    missing_evidence_presentation,
    discovered_context: plan.discovered_context,
    commercial_assurance,
  }
}
