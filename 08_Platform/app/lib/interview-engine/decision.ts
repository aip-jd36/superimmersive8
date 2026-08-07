/**
 * Constraint A -- Decision (CRC_PROTOTYPE_ALPHA_ROADMAP.md Phase 6c;
 * INTERVIEW_ENGINE_ARCHITECTURE.md §7).
 *
 * Answers exactly one question: given a valid candidate question and
 * current StructuredUnderstanding, would a plausible answer materially
 * improve the Interview Engine's own understanding enough to justify
 * asking it?
 *
 * This is the prospective estimation described in architecture doc §7 --
 * necessarily forward-looking, since the real answer doesn't exist yet.
 * The corresponding RETROSPECTIVE measurement (did a question that was
 * actually asked turn out to produce material change) is calibration data
 * only, computed separately in eval/retrospective-diff.ts, and must never
 * be used to retroactively justify why a question was asked -- it wasn't
 * available at decision time.
 *
 * Constraint A is genuinely independent of Constraint B (boundaries.ts,
 * Phase 4): this module never imports it, has no notion of depth caps,
 * decline scopes, or any enforcement concept, and does not decide whether
 * CRC is PERMITTED to ask -- only whether asking would be WORTH it, on
 * understanding grounds alone. A candidate can correctly get should_ask:
 * true here and still be suppressed by Constraint B (e.g. a follow-up cap
 * already reached) -- that is expected, not a bug to reconcile.
 *
 * Never mutates StructuredUnderstanding. Never performs boundary
 * enforcement. Never reasons about Retrieval, Knowledge Cards, Matrix
 * contents, or commercial-readiness conclusions -- those are out of scope
 * by design, not merely unused.
 */

import type { CandidateQuestionProposal } from './candidate-question'
import type { Phase, StructuredUnderstanding } from '@/types/interview-engine'

// ── Reason codes ─────────────────────────────────────────────────────────────

/**
 * One code per required category (7 ask, 7 suppress), plus two generic
 * fallbacks for genuine cases that don't fit a named category cleanly.
 * "Stable reason code" means an enumerated set, not a free-form string --
 * the same discipline every other reason-code enum in this codebase uses
 * (gates.ts, boundaries.ts, extraction.ts).
 */
export const CONSTRAINT_A_REASON_CODES = [
  // ask
  'AMBIGUOUS_TOOL_SURFACE_RESOLVABLE',
  'MISSING_INTENDED_USE',
  'CURRENT_VS_HISTORICAL_AMBIGUOUS',
  'VISIBILITY_GAP_CLARIFIABLE',
  'POTENTIAL_MISINTERPRETATION',
  'BUNDLED_OBSERVATIONS_DISENTANGLEABLE',
  'MISSING_WORKFLOW_FACT',
  'MATERIALLY_IMPROVES_UNDERSTANDING',
  // suppress
  'FACT_ALREADY_CONFIRMED',
  'DETAIL_NOT_MATERIAL',
  'INTERESTING_NOT_STRUCTURAL',
  'SUFFICIENT_CERTAINTY_ALREADY',
  'REVIEWER_STYLE_DRILLDOWN',
  'RETRIEVAL_MOTIVATED',
  'WORDING_ONLY_CHANGE',
  'NO_MATERIAL_IMPROVEMENT',
] as const

export type ConstraintAReasonCode = (typeof CONSTRAINT_A_REASON_CODES)[number]

/** The subset of reason codes that only ever accompany should_ask: true. */
export const ASK_REASON_CODES: readonly ConstraintAReasonCode[] = [
  'AMBIGUOUS_TOOL_SURFACE_RESOLVABLE',
  'MISSING_INTENDED_USE',
  'CURRENT_VS_HISTORICAL_AMBIGUOUS',
  'VISIBILITY_GAP_CLARIFIABLE',
  'POTENTIAL_MISINTERPRETATION',
  'BUNDLED_OBSERVATIONS_DISENTANGLEABLE',
  'MISSING_WORKFLOW_FACT',
  'MATERIALLY_IMPROVES_UNDERSTANDING',
]

/** The subset of reason codes that only ever accompany should_ask: false. */
export const SUPPRESS_REASON_CODES: readonly ConstraintAReasonCode[] = [
  'FACT_ALREADY_CONFIRMED',
  'DETAIL_NOT_MATERIAL',
  'INTERESTING_NOT_STRUCTURAL',
  'SUFFICIENT_CERTAINTY_ALREADY',
  'REVIEWER_STYLE_DRILLDOWN',
  'RETRIEVAL_MOTIVATED',
  'WORDING_ONLY_CHANGE',
  'NO_MATERIAL_IMPROVEMENT',
]

// ── Result shape ─────────────────────────────────────────────────────────────

export interface ConstraintADecision {
  should_ask: boolean
  reason_code: ConstraintAReasonCode
  /** Concise (one or two sentences), diagnostic -- not shown to the end user. */
  rationale: string
}

// ── Input ────────────────────────────────────────────────────────────────────

/**
 * Exactly what architecture doc §7's prospective mechanism needs, nothing
 * more: current understanding, the candidate itself (the full,
 * text-bearing CandidateQuestionProposal from candidate-question.ts -- not
 * the stripped boundaries.ts CandidateQuestion, since Constraint A must
 * reason about what the question actually asks, unlike Constraint B, which
 * deliberately never sees question text), and current phase. The candidate
 * is assumed to have already passed validateCandidateReference() upstream
 * -- this module does not re-validate signal references.
 *
 * Deliberately excludes: Retrieval results, Knowledge Cards, Matrix
 * contents, commercial-readiness conclusions, and raw conversation history
 * -- none of these are required by the architecture's own description of
 * this mechanism.
 */
export interface ConstraintAInput {
  structured_understanding: StructuredUnderstanding
  candidate: CandidateQuestionProposal
  phase: Phase
}

// ── Provider-neutral interface ──────────────────────────────────────────────

export type ConstraintADecider = (input: ConstraintAInput) => Promise<ConstraintADecision>
