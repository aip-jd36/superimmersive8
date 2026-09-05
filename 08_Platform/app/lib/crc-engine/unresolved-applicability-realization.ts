/**
 * Bounded Unresolved-Applicability Realization (M2B, 2026-09-05, following
 * the M2A / M2A.1 read-only design diagnostics and human architecture
 * review). Consultative-Composition-owned, deterministic, no LLM.
 *
 * ── WHAT THIS IS ────────────────────────────────────────────────────────
 *
 * A pure function, `realizeUnresolvedApplicability`, that reads the
 * already-built `ConsultativeAnswerPlan` (CC-3A) and produces, for at most
 * one narrow class of already-BI-authorized unresolved-applicability
 * section, ONE short bounded sentence naming the specific governed
 * condition -- using ONLY a governed display label (applicability-fact-
 * display.ts) and the existing `selector-askability.ts` askability
 * classification, both already-authoritative, both read-only here.
 *
 * ── WHAT THIS IS NOT (human review, M2A.1) ─────────────────────────────
 *
 * It never:
 *   - calls an applicability evaluator, or otherwise re-derives
 *     unresolved/not_met/met status (that status is read, verbatim, off
 *     `PlanUnresolvedItem` -- itself already computed by CC-3A from
 *     `RetrievalDiagnostic`, never re-run here);
 *   - inspects `StructuredUnderstanding`, `ApplicabilityFacts`,
 *     `ToolMention`, or any raw user text;
 *   - inspects `ApplicabilityRequirement.operator`/`.value`;
 *   - reads `plan.discovered_context` (explicit-goal sections only, by
 *     construction -- see `realizeUnresolvedApplicability`'s own signature:
 *     it is typed to receive `PlanGoalSection[]`, `plan.explicit_sections`
 *     only, never the whole plan);
 *   - makes a relevance, applicability, materiality, commercial-readiness,
 *     or legal decision;
 *   - independently restates or strengthens Bounded Interpretation's own
 *     applicability conclusion. BI already owns language equivalent to
 *     "CRC cannot determine whether that guidance applies" (see
 *     `mixedResolutionUnresolvedGuidanceSentence()`,
 *     lib/bounded-interpretation/rules.ts) -- this module's own sentence
 *     never repeats that conclusion; it only adds the ONE piece of bounded
 *     specificity BI's own fixed, parameter-free template cannot carry: the
 *     governed fact's display label. Human review, M2A.1: "BI owns the
 *     applicability conclusion. Composition owns only the bounded
 *     explanatory specificity."
 *   - passes anything back upstream into
 *     `lib/bounded-interpretation/build-bounded-interpretation.ts` or its
 *     `rules.ts` -- that signature is completely unchanged by this
 *     milestone (human review explicitly rejected the alternative);
 *   - mutates `BoundedInterpretation.summary_blocks` or
 *     `ProjectionGoalInterpretation.summary_blocks` -- both remain
 *     byte-identical whether or not this module produces anything.
 *
 * ── GOAL/SECTION ASSOCIATION (human review, M2A.1 constraint A) ────────
 *
 * `{category, goal_text}` is explicitly NOT used as an identity -- two
 * distinct active, confirmed `UserGoal`s can share both an identical
 * category and identical verbatim raw text (e.g. the same question asked in
 * two separate turns with no supersession relationship recorded between
 * them), and BI produces one `BoundedInterpretation` per goal regardless.
 *
 * The narrowest ALREADY-EXISTING stable identity available at every
 * boundary this note must cross is ARRAY POSITION within the shared
 * `interpretations: BoundedInterpretation[]` array a single
 * `runCRCConversation()` call already computes once. Three sibling arrays
 * are each built by an UNCONDITIONAL, order-preserving, 1:1
 * `interpretations.map(...)` over that exact same array, with no filtering
 * and no reordering:
 *   - `ConsultativeAnswerPlan.explicit_sections` --
 *     `interpretations.map((interp) => {...})` (consultative-answer-plan.ts);
 *   - `ProjectionOutput.goal_interpretations` --
 *     `interpretations.map((i) => ({...}))` (assemble-projection-output.ts's
 *     own `renderGoalInterpretations`).
 * Because both are literally `.map()` over the identical input array, index
 * `i` of `plan.explicit_sections` and index `i` of
 * `output.goal_interpretations` refer to the SAME goal, by construction, not
 * by convention -- verified in both source files, not assumed. Both
 * renderers (`CrcProjectionOutput.tsx`, `results-email-template.ts`)
 * already iterate `goal_interpretations` in this same original array order
 * with no reorder/filter of their own. This positional correspondence is
 * therefore already relied upon elsewhere in this pipeline (the same
 * "preserving array order and multiplicity 1:1" discipline
 * project-knowledge-items.ts's own header documents for
 * `RetrievalResult[]` -> `ProjectionKnowledgeItem[]`) -- reusing it here is
 * not a new architecture, only a new consumer of an existing invariant.
 *
 * `goal_index` is therefore an ephemeral, per-turn, per-response
 * positional correlator -- not a persistent identifier, not a governed ID,
 * not `BoundedInterpretation.goal_id` (which stays internal-only, "never
 * expose internal ids," exactly as before). It carries no more information
 * than the loop counter both renderers already maintain.
 *
 * Ambiguity: because association is positional rather than text/category
 * matching, two goals sharing identical `category` and `goal_text` cannot
 * cause a note to attach to the wrong section -- each occupies its own,
 * distinct index, and each is evaluated independently against its OWN
 * `unresolved_items`. See __tests__/crc-engine/unresolved-applicability-
 * realization.test.ts's own duplicate-goal-text case.
 */

import { getSelectorAskabilityEntry } from './selector-askability'
import { getApplicabilityFactLabel } from './applicability-fact-display'
import type { PlanGoalSection, PlanUnresolvedItem } from './consultative-answer-plan'
import type { ApplicabilityFact } from '@/lib/retrieval-engine/types'
import type { GoalCategory } from '@/types/interview-engine'

/**
 * Internal, rich representation -- carries provenance for tracing/testing
 * only. Never itself crosses an API/render boundary; see `ConsultativeNote`
 * below for the narrow transport shape that does. `claim_id`/`fact`/`tool`
 * are internal-only and are never rendered into `text` -- the sentence
 * grammar (M2A, human-reviewed) deliberately omits the canonical tool
 * identifier and the internal fact name, naming only the governed display
 * label.
 */
export interface RealizedUnresolvedApplicabilityNote {
  /** Positional correlator into the shared per-turn goal-interpretation arrays -- see module header. */
  goal_index: number
  /** Provenance only, never rendered. */
  category: GoalCategory
  /** Provenance only, never rendered (verbatim user words, already safe, but this sentence does not repeat it). */
  goal_text: string
  /** Provenance only, never rendered -- the withheld governed claim this realization concerns. */
  claim_id: string
  /** Provenance only, never rendered -- the internal enum value; only its governed display label may appear in `text`. */
  fact: ApplicabilityFact
  /** Provenance only, never rendered. */
  tool: string | null
  /**
   * The single bounded sentence Composition is authorized to produce. See
   * this module's own header for the exact authority split between this
   * text and Bounded Interpretation's own, separately-rendered conclusion.
   */
  text: string
}

/**
 * Narrow transport type -- the ONLY shape that crosses a render/API
 * boundary (mirrors `ProjectionKnowledgeItem`'s own narrowing of
 * `RetrievalResult`, project-knowledge-items.ts). No internal identifier,
 * no fact, no tool, no claim_id -- a renderer needs nothing more than where
 * to attach the sentence and what the sentence says.
 */
export interface ConsultativeNote {
  goal_index: number
  text: string
}

function candidateApplicabilityFacts(items: PlanUnresolvedItem[]): Extract<PlanUnresolvedItem, { kind: 'unresolved_applicability' }>[] {
  return items.filter((item): item is Extract<PlanUnresolvedItem, { kind: 'unresolved_applicability' }> => item.kind === 'unresolved_applicability')
}

/**
 * Realizes at most one bounded note per explicit-goal section. Every
 * trigger condition below is a fail-closed AND: any single failure produces
 * no note for that section, leaving the section's existing, unchanged
 * `bi_summary_blocks` (and therefore `BoundedInterpretation.summary_blocks`
 * / `ProjectionGoalInterpretation.summary_blocks`) as the sole
 * unresolved-applicability language -- see this module's own header.
 *
 * Takes `sections: PlanGoalSection[]` -- callers pass
 * `plan.explicit_sections`, never `plan` itself, so this function is
 * structurally incapable of reading `plan.discovered_context` regardless of
 * what a future caller might otherwise attempt.
 */
export function realizeUnresolvedApplicability(sections: PlanGoalSection[]): RealizedUnresolvedApplicabilityNote[] {
  const notes: RealizedUnresolvedApplicabilityNote[] = []

  sections.forEach((section, goal_index) => {
    // Scoped to the branch where Bounded Interpretation's own generic
    // "additional governed guidance" hedge (mixedResolutionUnresolvedGuidanceSentence,
    // rules.ts) was actually appended -- build-bounded-interpretation.ts
    // only calls that sentence builder inside its own `matches.length > 0`
    // branch (directly_relevant, or Case 3B with a resolved sibling).
    // `supported_claim_refs.length > 0` is CC-3A's own read of that same
    // condition (built from the identical `matches` array). Pure Case 3A
    // (no matched claim at all) uses a DIFFERENT, already-specific BI
    // template (`relevantApplicabilityUnresolvedNoContentSummary`, which
    // already names the category and already states the condition is
    // unconfirmed) and is deliberately out of this milestone's scope --
    // adding this sentence there would either duplicate that template's own
    // wording or land after its own Commercial Assurance bridge sentence.
    if (section.supported_claim_refs.length === 0) return

    const applicabilityItems = candidateApplicabilityFacts(section.unresolved_items)
    if (applicabilityItems.length === 0) return

    // Exactly one distinct supported fact, never a list, never a rank --
    // human review + M2A/M2A.1: two or more distinct facts fail closed to
    // the existing generic hedge, no exception.
    const distinctFacts = new Set(applicabilityItems.map((item) => item.fact))
    if (distinctFacts.size !== 1) return
    const [fact] = distinctFacts

    // jurisdiction remains on its own dedicated, unmigrated clarification
    // path (jurisdiction-clarification.ts) and its own dedicated Bounded
    // Interpretation Case-3A template -- never duplicated here. Mirrors
    // selector-questioning.ts's own independently-declared
    // HANDLED_BY_DEDICATED_MODULE guard (not imported from there: that
    // guard is question-orchestration-scoped, this is a separate,
    // independently-justified realization-scoped guard over the same
    // underlying fact).
    if (fact === 'jurisdiction') return

    // Reads the SAME governed registry selector-questioning.ts's own
    // classification already consults -- a fixed-registry lookup, never a
    // re-evaluation of applicability. requires_documentary_evidence and
    // applicability_unresolved (not askable, not evidence-only-registered)
    // both fail closed here -- no specific realization for either class in
    // this milestone (no document naming, no evidence taxonomy).
    if (getSelectorAskabilityEntry(fact)?.treatment !== 'askable_in_crc') return

    const label = getApplicabilityFactLabel(fact)
    if (!label) return // fail closed to the existing generic Bounded Interpretation copy -- never the raw enum, never an improvised description.

    // Any one of the (necessarily identically-`fact`) items supplies the
    // internal-only claim_id/tool provenance -- the sentence itself never
    // varies by which withheld claim is picked, since only `fact` (via its
    // label) is ever rendered.
    const [{ claim_id, tool }] = applicabilityItems

    notes.push({
      goal_index,
      category: section.category,
      goal_text: section.goal_text,
      claim_id,
      fact,
      tool,
      // Authority split (human review, M2A.1): this sentence identifies the
      // unresolved condition ONLY. It never restates or strengthens Bounded
      // Interpretation's own separately-rendered applicability conclusion
      // ("CRC cannot determine whether that guidance applies" -- BI's own
      // words, unchanged, rendered immediately before this sentence in
      // `summary_blocks`) -- "Specifically" presupposes exactly that
      // antecedent, which is guaranteed present whenever this fires (see
      // the `supported_claim_refs.length > 0` gate above).
      text: `Specifically, this depends on your ${label}, which hasn't been confirmed in this conversation.`,
    })
  })

  return notes
}

/** Narrows the internal, rich result to the transport shape -- see `ConsultativeNote`'s own header. */
export function toConsultativeNotes(notes: RealizedUnresolvedApplicabilityNote[]): ConsultativeNote[] {
  return notes.map(({ goal_index, text }) => ({ goal_index, text }))
}
