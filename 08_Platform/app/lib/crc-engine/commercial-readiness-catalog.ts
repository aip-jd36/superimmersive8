/**
 * Commercial Readiness Discovery Catalog -- eligibility logic (CRC Limited
 * Pilot, 2026-08-12). Consumes `CommercialReadinessIndicators`
 * (Applicability, from `commercial-readiness-indicators.ts`) and caller-
 * supplied conversation state (Evidence Gap, gate/phase state) to decide
 * which -- if any -- of the three pilot categories is eligible to be asked
 * about this turn.
 *
 * Deliberately kept separate from the indicators module per the approved
 * design: Indicators -> Applicability only; StructuredUnderstanding/
 * catalog state -> Evidence Gap; Applicability + Evidence Gap ->
 * eligibility. `evaluateCategoryEligibility` below keeps those as
 * genuinely separate fields on its return value even though, for v1, the
 * Evidence Gap computation collapses to a single boolean -- see its own
 * comment for why that collapse is a deliberate v1 simplification, not an
 * oversight, and does not mean the concepts are the same thing.
 *
 * This module does NOT read BoundaryState, does NOT know about
 * `CandidateQuestionKind`, and does NOT get called from `run-turn.ts` or
 * the candidate generator yet. `alreadyAskedThisConversation` is accepted
 * as a plain boolean parameter specifically so this logic is fully
 * testable in isolation before any of that wiring exists -- integrating a
 * real global BoundaryState cap and a `commercial_readiness_discovery`
 * question_kind is explicitly a later, separate step (approved 2026-08-12
 * implementation sequence, step 3), not part of this module.
 *
 * Selection order for v1 is a fixed pilot priority list, not a scored or
 * LLM-judged ranking: Client-Provided Source Assets -> Likeness/Publicity
 * Rights -> Third-Party Visual Assets. A future version may select for
 * "highest expected informational value given the workflow already
 * understood" instead of fixed priority -- deliberately not built now.
 */

import type { Phase } from '@/types/interview-engine'
import type { CandidateQuestionProposal } from '@/lib/interview-engine/candidate-question'
import type { CommercialReadinessIndicators, IndicatorState } from './commercial-readiness-indicators'

export const COMMERCIAL_READINESS_CATEGORIES = [
  'client_provided_source_assets',
  'likeness_publicity_rights',
  'third_party_visual_assets',
] as const

export type CommercialReadinessCategory = (typeof COMMERCIAL_READINESS_CATEGORIES)[number]

const CATEGORY_INDICATOR_KEY: Record<CommercialReadinessCategory, keyof CommercialReadinessIndicators> = {
  client_provided_source_assets: 'client_involvement',
  likeness_publicity_rights: 'person_depicted',
  third_party_visual_assets: 'reference_material_used',
}

const PILOT_PRIORITY_ORDER: readonly CommercialReadinessCategory[] = [
  'client_provided_source_assets',
  'likeness_publicity_rights',
  'third_party_visual_assets',
]

export interface CategoryEligibilityResult {
  category: CommercialReadinessCategory
  applicability: IndicatorState
  /**
   * v1 simplification: Evidence Gap collapses to "has a commercial-
   * readiness discovery question already been asked this conversation."
   * The catalog is capped globally (one question per conversation, per
   * the approved design), so once any category has been asked, every
   * category's evidence gap closes at once -- there is no per-category
   * evidence state to track yet. Kept as its own field (rather than
   * folded directly into `eligible`) so the Applicability/Evidence-Gap
   * distinction stays real in the type even though their v1 values
   * happen to be driven by the same input.
   */
  evidence_gap_open: boolean
  eligible: boolean
}

export function evaluateCategoryEligibility(
  category: CommercialReadinessCategory,
  indicators: CommercialReadinessIndicators,
  alreadyAskedThisConversation: boolean,
  gate1Met: boolean,
  phase: Phase,
): CategoryEligibilityResult {
  const indicatorKey = CATEGORY_INDICATOR_KEY[category]
  const applicability = indicators[indicatorKey]
  const evidenceGapOpen = !alreadyAskedThisConversation
  const eligible = gate1Met && phase === 3 && applicability === 'affirmative' && evidenceGapOpen

  return { category, applicability, evidence_gap_open: evidenceGapOpen, eligible }
}

/**
 * Returns the first eligible category in fixed pilot priority order, or
 * null if none is eligible. This is the entire v1 selection rule -- no
 * scoring, no LLM selector, no "highest-risk" judgment.
 */
export function selectEligibleCommercialReadinessCategory(
  indicators: CommercialReadinessIndicators,
  alreadyAskedThisConversation: boolean,
  gate1Met: boolean,
  phase: Phase,
): CommercialReadinessCategory | null {
  for (const category of PILOT_PRIORITY_ORDER) {
    const result = evaluateCategoryEligibility(category, indicators, alreadyAskedThisConversation, gate1Met, phase)
    if (result.eligible) return category
  }
  return null
}

// ── Integration step (2026-08-12) ───────────────────────────────────────
//
// Everything below is what turns an eligible category into an actual
// candidate the interview pipeline can evaluate, and what turns an asked
// category back into fixed, user-facing education. Neither function below
// renders or sends anything -- buildCommercialReadinessDiscoveryProposal
// only constructs a CandidateQuestionProposal, the exact same shape the
// ordinary LLM generator produces, for run-turn.ts to feed through the
// unchanged validate -> Constraint A -> Constraint B pipeline. The hard
// rule from the approved integration spec: "Eligibility only creates a
// candidate. The existing interview pipeline still decides whether it
// gets asked." This module has no path that skips that pipeline.

/**
 * Fixed, catalog-owned question text per pilot category. Deliberately not
 * LLM-generated -- "category-specific question text" per the approved
 * spec, the same "fixed copy is Runtime/catalog's own job" discipline
 * ACKNOWLEDGMENT_COPY (run-turn.ts) already uses for its own fixed string.
 * Plain, conversational, no legal terminology, no verdict framing.
 */
export const COMMERCIAL_READINESS_DISCOVERY_QUESTIONS: Record<CommercialReadinessCategory, string> = {
  client_provided_source_assets:
    "Did the client (or brand) give you any of their own images, video, logos, or brand assets to use as source material for this project?",
  likeness_publicity_rights:
    'Does the video show a real, identifiable person -- anyone\'s face, voice, or likeness -- rather than a fully synthetic character?',
  third_party_visual_assets:
    'Did you use any reference images, footage, or other existing visual material -- from stock sites, the internet, or elsewhere -- to guide or start the generation?',
}

/**
 * Fixed, catalog-owned Educational Takeaway per pilot category, shown
 * immediately after the user answers (run-turn.ts's own concern, not this
 * module's). Verbatim, never LLM-rewritten. Introduces a commercial-
 * readiness concept; does not establish anything about THIS project, and
 * never uses verdict language ("checked," "cleared," "verified," "found a
 * risk") -- per the approved "CRC introduces commercial readiness; it does
 * not establish commercial readiness" principle.
 *
 * ANSWER-NEUTRALITY INVARIANT (CRD-1, 2026-09-05, following the CC-4
 * Negative-State Relevance diagnostic). The takeaway lifecycle is
 * deliberately unconditional: the discovery question is asked, then this
 * fixed concept takeaway is shown -- run-turn.ts never inspects the user's
 * answer to decide whether or how to show it (CC-4 confirmed this, and the
 * accepted architecture decision keeps it that way -- no answer-state
 * classifier, no affirmative/negative variants). Because of that, EACH
 * string here must stay semantically coherent whichever way the preceding
 * answer went -- affirmative, negative, unknown, declined, or otherwise
 * unresolved. A takeaway may teach the concept, but it must NOT presuppose
 * that the concept's triggering condition is present in this project (nor
 * that it is absent): a live UAT surfaced the client_provided_source_assets
 * entry telling a user to "document what the client supplied" one turn
 * after they said the client supplied nothing. Prefer conditional
 * constructions ("when X is supplied...", "any such material...") over
 * present-tense/second-person-specific phrasing ("what you supplied", "what
 * you fed in") that reads as if the answer went one way. This is rhetorical
 * neutrality only -- it adds no project-state finding, no legal conclusion,
 * no materiality/risk language, and no new substantive proposition.
 */
export const COMMERCIAL_READINESS_TAKEAWAYS: Record<CommercialReadinessCategory, string> = {
  client_provided_source_assets:
    "Worth knowing: when a client or brand supplies their own photos, footage, logos, or brand assets, that material carries its own rights and documentation questions, separate from the AI platform's own terms. For commercial work, it's useful to document any such client-supplied material -- what was provided, and what permissions or representations came with it.",
  likeness_publicity_rights:
    "Worth knowing: showing a real person's face, voice, or likeness in commercial content is typically governed by publicity and likeness rights, which are separate from -- and not covered by -- an AI tool's own commercial-use terms. Getting a platform's permission to generate something is not the same as getting that person's permission to be shown.",
  third_party_visual_assets:
    "Worth knowing: reference material you upload or start from -- photos, stock footage, existing video -- carries its own licensing terms, separate from the AI tool's own commercial-use terms. A platform's terms cover what it generates, not necessarily the rights to any material fed into it.",
}

/**
 * Deterministically constructs the CandidateQuestionProposal for a
 * selected category -- the exact same shape validateCandidateReference()/
 * Constraint A/Constraint B already accept from the ordinary generator.
 * target_signal_id is always null: "no invented signal semantics" per the
 * approved spec -- a discovery question is not a follow-up on any existing
 * StructuredUnderstanding signal, so it is deliberately absent from
 * SIGNAL_REQUIRED_KINDS (candidate-question.ts) and needs none here.
 */
export function buildCommercialReadinessDiscoveryProposal(category: CommercialReadinessCategory, phase: Phase): CandidateQuestionProposal {
  return {
    question_text: COMMERCIAL_READINESS_DISCOVERY_QUESTIONS[category],
    question_kind: 'commercial_readiness_discovery',
    target_signal_id: null,
    phase,
  }
}

/** Trivial, verbatim lookup -- never rewritten, never generated. */
export function getCommercialReadinessTakeaway(category: CommercialReadinessCategory): string {
  return COMMERCIAL_READINESS_TAKEAWAYS[category]
}
