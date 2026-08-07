/**
 * Candidate-question generation support (CRC_PROTOTYPE_ALPHA_ROADMAP.md
 * Phase 6b). "The model proposes. Deterministic code validates and
 * enforces." -- the same discipline Phase 6a's extraction pipeline used,
 * applied here to question generation instead of fact extraction.
 *
 *   StructuredUnderstanding
 *         |
 *   deriveEligibleSignals()        <- deterministic, no LLM
 *         |
 *   LLM proposes (Structured Outputs):
 *     question_text, question_kind, target_signal_id
 *         |
 *   validateCandidateReference()   <- deterministic, rejects hallucinated
 *         |                           or invalid references
 *   Constraint B (boundaries.ts, unchanged)
 *
 * The model is never responsible for creating or maintaining signal
 * identity across turns -- that would put a deterministic identity problem
 * inside the least deterministic component. It may only select a signal_id
 * from the eligible set this module derives, or explicitly decline to
 * target one (null).
 */

import type { Phase, StructuredUnderstanding } from '@/types/interview-engine'
import type { CandidateQuestion, CandidateQuestionKind } from './boundaries'

// ── Eligible signals (deterministic derivation) ─────────────────────────────

export const ELIGIBLE_SIGNAL_KINDS = ['scoped_observation', 'tool_mention', 'project_fact'] as const

export type EligibleSignalKind = (typeof ELIGIBLE_SIGNAL_KINDS)[number]

/**
 * Deliberately minimal: no summary/description field, no new topic
 * ontology. The generator also receives the full StructuredUnderstanding as
 * input, so it can look up what a signal_id refers to there -- a redundant
 * description here would be a second, driftable representation of the same
 * content.
 */
export interface EligibleSignal {
  signal_id: string
  kind: EligibleSignalKind
}

/**
 * Fixed, deterministic references for the two singular project facts, which
 * have no per-instance identity to reuse (unlike ScopedObservation/
 * ToolMention, which already carry stable runtime ids). Always exactly
 * these two strings -- never minted, never per-instance.
 */
export const PROJECT_FACT_SIGNAL_IDS = {
  intended_use: 'project:intended_use',
  workflow_role: 'project:workflow_role',
} as const

/**
 * Enumerates every signal currently addressable by a candidate question:
 * every ACTIVE (non-superseded) ScopedObservation and ToolMention by their
 * own existing stable runtime id, plus the two project facts unconditionally
 * (including when unresolved/declined -- a follow-up about an unresolved
 * fact is still a valid thing to eventually ask).
 */
export function deriveEligibleSignals(su: StructuredUnderstanding): EligibleSignal[] {
  const signals: EligibleSignal[] = []

  for (const o of su.scoped_observations) {
    if (o.superseded_by === null) signals.push({ signal_id: o.observation_id, kind: 'scoped_observation' })
  }
  for (const m of su.tool_mentions) {
    if (m.superseded_by === null) signals.push({ signal_id: m.mention_id, kind: 'tool_mention' })
  }
  signals.push({ signal_id: PROJECT_FACT_SIGNAL_IDS.intended_use, kind: 'project_fact' })
  signals.push({ signal_id: PROJECT_FACT_SIGNAL_IDS.workflow_role, kind: 'project_fact' })

  return signals
}

// ── Model-facing proposal ───────────────────────────────────────────────────

/**
 * What the model (or mock) proposes. Distinct from CandidateQuestion
 * (boundaries.ts, Phase 4, unchanged) -- that type deliberately carries no
 * question text, precisely so rephrasing can't evade a cap. question_text
 * exists only here, in the proposal, and is stripped before anything reaches
 * Constraint B.
 */
export interface CandidateQuestionProposal {
  question_text: string
  question_kind: CandidateQuestionKind
  /** Must be a signal_id from the eligible set, or null. Never minted by the model. */
  target_signal_id: string | null
  phase: Phase
}

// ── Deterministic validation ────────────────────────────────────────────────

export const CANDIDATE_QUESTION_REJECTION_REASON_CODES = [
  'SIGNAL_ID_NOT_ELIGIBLE',
  'MISSING_REQUIRED_SIGNAL_ID',
] as const

export type CandidateQuestionRejectionReasonCode = (typeof CANDIDATE_QUESTION_REJECTION_REASON_CODES)[number]

export type CandidateReferenceValidation =
  | { outcome: 'accepted'; candidate: CandidateQuestion }
  | { outcome: 'rejected'; reason_code: CandidateQuestionRejectionReasonCode; reason: string }

const SIGNAL_REQUIRED_KINDS: CandidateQuestionKind[] = ['follow_up_on_signal', 'uncertainty_clarification']

/**
 * Rejects a proposal referencing a signal_id outside the supplied eligible
 * set (hallucinated, stale, or otherwise invalid) BEFORE it ever reaches
 * evaluateBoundary -- the same "reject at the validation boundary" shape
 * Phase 6a's runExtractionPipeline uses for mutation rejections. Also
 * rejects a proposal missing a required signal_id for its own kind, rather
 * than letting evaluateBoundary's defensive throw fire.
 *
 * On acceptance, strips question_text -- Constraint B never sees it.
 */
export function validateCandidateReference(
  proposal: CandidateQuestionProposal,
  eligibleSignals: EligibleSignal[],
): CandidateReferenceValidation {
  if (SIGNAL_REQUIRED_KINDS.includes(proposal.question_kind) && proposal.target_signal_id === null) {
    return {
      outcome: 'rejected',
      reason_code: 'MISSING_REQUIRED_SIGNAL_ID',
      reason: `question_kind '${proposal.question_kind}' requires a target_signal_id, but none was proposed.`,
    }
  }

  if (proposal.target_signal_id !== null) {
    const eligible = eligibleSignals.some((s) => s.signal_id === proposal.target_signal_id)
    if (!eligible) {
      return {
        outcome: 'rejected',
        reason_code: 'SIGNAL_ID_NOT_ELIGIBLE',
        reason: `target_signal_id '${proposal.target_signal_id}' is not in the eligible signal set derived from current StructuredUnderstanding.`,
      }
    }
  }

  return {
    outcome: 'accepted',
    candidate: {
      kind: proposal.question_kind,
      signal_id: proposal.target_signal_id ?? undefined,
      phase: proposal.phase,
    },
  }
}
