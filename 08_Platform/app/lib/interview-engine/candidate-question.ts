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
import type { BoundaryState, CandidateQuestion, CandidateQuestionKind, FollowUpNeed } from './boundaries'

// ── Eligible signals (deterministic derivation) ─────────────────────────────

/**
 * 'asset_provider_mention' added Duplicate-Question Prevention milestone
 * (2026-08-19). Diagnostic finding: AssetProviderMention was the one active
 * StructuredUnderstanding record kind never derived as an eligible signal,
 * so a follow-up naming a specific provider (e.g. "how was the iStock image
 * used?") could never be asked as a capped follow_up_on_signal at all -- it
 * was structurally forced toward kind 'other', which boundaries.ts never
 * caps. This addition alone does not fix duplicate questioning (see
 * FollowUpNeed in boundaries.ts for the actual cap); it only makes the
 * signal reachable in the first place.
 */
export const ELIGIBLE_SIGNAL_KINDS = ['scoped_observation', 'tool_mention', 'project_fact', 'asset_provider_mention'] as const

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
 * every ACTIVE (non-superseded) ScopedObservation, ToolMention, and (2026-08-19)
 * AssetProviderMention by their own existing stable runtime id, plus the two
 * project facts unconditionally (including when unresolved/declined -- a
 * follow-up about an unresolved fact is still a valid thing to eventually ask).
 */
export function deriveEligibleSignals(su: StructuredUnderstanding): EligibleSignal[] {
  const signals: EligibleSignal[] = []

  for (const o of su.scoped_observations) {
    if (o.superseded_by === null) signals.push({ signal_id: o.observation_id, kind: 'scoped_observation' })
  }
  for (const m of su.tool_mentions) {
    if (m.superseded_by === null) signals.push({ signal_id: m.mention_id, kind: 'tool_mention' })
  }
  for (const p of su.asset_provider_mentions) {
    if (p.superseded_by === null) signals.push({ signal_id: p.mention_id, kind: 'asset_provider_mention' })
  }
  signals.push({ signal_id: PROJECT_FACT_SIGNAL_IDS.intended_use, kind: 'project_fact' })
  signals.push({ signal_id: PROJECT_FACT_SIGNAL_IDS.workflow_role, kind: 'project_fact' })

  return signals
}

/**
 * Duplicate-Question Prevention milestone (2026-08-19). Structural
 * presatisfaction: 'tool_plan_tier' can become confirmed via a channel OTHER
 * than an asked-and-answered follow-up candidate -- the user may simply
 * state "Kling Pro plan" directly, in the same turn as naming the tool (see
 * anthropic-extractor.ts's plan_tier_value_hint). boundaries.ts's own
 * compound-key cap (FollowUpNeed, evaluateBoundary) only tracks needs that
 * were actually ASKED as a candidate; it has, and must keep, zero
 * StructuredUnderstanding awareness by design (see boundaries.ts's own
 * header: "does not import ... StructuredUnderstanding"). This function
 * closes that gap from the outside: called once per turn, before any
 * candidate is generated, it returns a BoundaryState with follow_ups_used
 * pre-seeded (idempotently, additively -- never lowers an existing count)
 * for every (signal_id, 'tool_plan_tier') pair already structurally
 * confirmed, so evaluateBoundary rejects a later attempt to re-ask it even
 * though it was never itself asked as a capped candidate before.
 *
 * Deliberately scoped to ONLY 'tool_plan_tier': it is the sole FollowUpNeed
 * with an existing Attested<T> field to check. The two asset_provider_*
 * needs have no such field at all (AssetProviderMention records identity
 * only -- Duplicate-Question Diagnostic §7/§25), so they are NOT
 * presatisfied here; their only "already answered" signal is the compound
 * cap key itself, set the first time a candidate carrying that need is
 * actually asked (see evaluateBoundary). Extending presatisfaction to a
 * free-text-only need would require inventing exactly the kind of
 * text-similarity inference this milestone's diagnostic identified as
 * unsafe -- out of scope by design, not an oversight.
 */
export function presatisfyStructuralFollowUpNeeds(su: StructuredUnderstanding, boundaryState: BoundaryState): BoundaryState {
  let followUpsUsed = boundaryState.follow_ups_used
  let changed = false
  for (const m of su.tool_mentions) {
    if (m.superseded_by !== null) continue
    if (m.plan_tier.state !== 'confirmed') continue
    const key = `${m.mention_id}::tool_plan_tier`
    if ((followUpsUsed[key] ?? 0) >= 1) continue
    followUpsUsed = { ...followUpsUsed, [key]: 1 }
    changed = true
  }
  return changed ? { ...boundaryState, follow_ups_used: followUpsUsed } : boundaryState
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
  /**
   * Duplicate-Question Prevention milestone (2026-08-19). Optional,
   * best-effort classification: which narrow FollowUpNeed (boundaries.ts)
   * this question addresses, if any of the small closed set applies.
   * Deliberately NOT required on every proposal -- an omitted/null value
   * falls through to the pre-existing per-signal-id cap unchanged (see
   * validateCandidateReference below), so imperfect model instruction-
   * following degrades to prior behavior rather than rejecting the
   * candidate outright.
   */
  target_follow_up_need?: FollowUpNeed | null
}

// ── Generator interface ─────────────────────────────────────────────────────

/**
 * CRC Limited Pilot -- Model 4 (bounded alternative-question search),
 * 2026-08-10. Identifies a specific (question_kind, target_signal_id)
 * pair the first attempt already tried and had rejected, for the second,
 * bounded attempt to avoid repeating. Deliberately the SAME granularity
 * Constraint B's own caps already use (per-signal for
 * follow_up_on_signal/uncertainty_clarification; global, so signal_id is
 * null, for historical_experience/disentangling_question) -- excluding a
 * whole signal would discard other, still-open question kinds about it;
 * excluding only exact question text would leave the second attempt free
 * to re-trigger the identical Constraint B cap with different wording.
 * Structured data only, never Constraint A/B's own rationale prose --
 * see anthropic-candidate-question.ts's own prompt templating for why.
 */
export interface CandidateExclusion {
  kind: CandidateQuestionKind
  signal_id: string | null
}

/**
 * Input the generator receives -- current StructuredUnderstanding, the
 * deterministically-derived eligible signal set, and current phase, and
 * nothing more. Deliberately excludes Retrieval results, Knowledge Cards,
 * Matrix contents, and commercial-readiness conclusions (architecture doc
 * §1, §6 -- Extraction/Retrieval independence). The generator must not
 * re-run Extraction over the transcript; StructuredUnderstanding is its only
 * factual input.
 */
export interface CandidateQuestionGeneratorInput {
  structured_understanding: StructuredUnderstanding
  eligible_signals: EligibleSignal[]
  phase: Phase
  /**
   * CRC Limited Pilot -- Model 4. Present only on the bounded second
   * attempt after the first candidate was rejected by Constraint A or B;
   * absent (or empty) on every first attempt, and absent on a second
   * attempt following a null first candidate (per the approved
   * correction: a null first candidate invents nothing to exclude).
   */
  excluded?: CandidateExclusion[]
}

/**
 * CRC Limited Pilot -- Model 4. Deterministic, pure: true when a proposal
 * targets exactly the (kind, signal_id) pair already excluded. Used as a
 * defensive check on the bounded second attempt's own output -- if the
 * model's proposal violates the exclusion it was given (imperfect
 * instruction-following, not assumed reliable), this is caught without
 * spending a live Constraint A/B call re-confirming what's already known
 * deterministically.
 */
export function matchesExclusion(proposal: CandidateQuestionProposal, excluded: CandidateExclusion[]): boolean {
  return excluded.some((e) => e.kind === proposal.question_kind && e.signal_id === proposal.target_signal_id)
}

/**
 * Returns null when there's no natural next question to propose -- a valid,
 * complete answer, not an error. One proposal per call, not a batch:
 * generating the next candidate question is a single-question decision,
 * unlike Extraction's per-turn multi-fact extraction.
 */
export type CandidateQuestionGenerator = (
  input: CandidateQuestionGeneratorInput,
) => Promise<CandidateQuestionProposal | null>

// ── Deterministic validation ────────────────────────────────────────────────

export const CANDIDATE_QUESTION_REJECTION_REASON_CODES = [
  'SIGNAL_ID_NOT_ELIGIBLE',
  'MISSING_REQUIRED_SIGNAL_ID',
  /**
   * Duplicate-Question Prevention milestone (2026-08-19). Fires when
   * target_follow_up_need is set but target_signal_id is missing, or does
   * not resolve to an eligible signal of the kind that need requires
   * ('asset_provider_mention' for the two asset_provider_* needs,
   * 'tool_mention' for tool_plan_tier) -- a defensive check against a
   * hallucinated/mismatched need tag, same shape as SIGNAL_ID_NOT_ELIGIBLE.
   */
  'FOLLOW_UP_NEED_TARGET_MISMATCH',
] as const

/** Which EligibleSignalKind a given FollowUpNeed must target, if the need is set at all. */
const FOLLOW_UP_NEED_REQUIRED_SIGNAL_KIND: Record<FollowUpNeed, EligibleSignalKind> = {
  asset_provider_usage: 'asset_provider_mention',
  asset_provider_license: 'asset_provider_mention',
  tool_plan_tier: 'tool_mention',
}

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

  // ── Duplicate-Question Prevention milestone (2026-08-19). Only runs when
  // the model actually set a need; absent/null is untouched, existing
  // behavior. See FOLLOW_UP_NEED_REQUIRED_SIGNAL_KIND above.
  if (proposal.target_follow_up_need) {
    const requiredKind = FOLLOW_UP_NEED_REQUIRED_SIGNAL_KIND[proposal.target_follow_up_need]
    const target = proposal.target_signal_id === null
      ? undefined
      : eligibleSignals.find((s) => s.signal_id === proposal.target_signal_id)
    if (!target || target.kind !== requiredKind) {
      return {
        outcome: 'rejected',
        reason_code: 'FOLLOW_UP_NEED_TARGET_MISMATCH',
        reason: `target_follow_up_need '${proposal.target_follow_up_need}' requires target_signal_id to resolve to an eligible '${requiredKind}' signal, but got '${proposal.target_signal_id}'.`,
      }
    }
  }

  return {
    outcome: 'accepted',
    candidate: {
      kind: proposal.question_kind,
      signal_id: proposal.target_signal_id ?? undefined,
      phase: proposal.phase,
      follow_up_need: proposal.target_follow_up_need ?? undefined,
    },
  }
}
