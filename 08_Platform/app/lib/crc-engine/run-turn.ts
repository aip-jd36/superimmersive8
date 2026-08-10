/**
 * Canonical per-turn loop (LIVE_INTERVIEW_RUNTIME_ARCHITECTURE.md §5, Live
 * Interview Runtime milestone). Glue over already-built, already-tested
 * primitives -- Extraction+Mutation (fused, `runExtractionPipeline`),
 * Gate 1/2, candidate generation, Constraint A, Constraint B, signal
 * lineage -- plus the four new pieces this milestone built
 * (`computePhase`, `checkCompletion`, `resolveDeclineSignal`,
 * `buildPendingClarification`). Not a copy of `run-dialogue.ts` (eval-only,
 * imported by nothing, and this module must not depend on it per the
 * subsystem-boundaries discipline) -- reimplemented fresh here, over the
 * same primitives, with the corrected ordering the accepted architecture
 * doc's own critique of the originally-proposed loop requires.
 *
 * The accepted loop, exactly:
 *   Extraction + Mutation (fused)
 *   -> decline pre-processing (opt_out_scope resolved BEFORE gates --
 *      Phase 7's own shipped bugfix)
 *   -> Gate 1 + Gate 2 evaluation
 *   -> Phase transition (fresh phase, so a phase-completing turn's own
 *      candidate generation already reflects the new phase -- reordered
 *      relative to the originally-proposed loop, per Section 11)
 *   -> Natural-completion check -- if complete, persist and finalize via
 *      the already-built runCRCConversation(), never re-entering below
 *   -> Candidate generation -> Constraint A -> Constraint B (decline
 *      scope applied here too, mirroring run-dialogue.ts's own pattern)
 *   -> set/clear pending_clarification
 *   -> persist -> assistant response
 *
 * `[MODEL 4 -- 2026-08-10]` CRC Limited Pilot, bounded alternative-question
 * search: the organic (no-decline) branch above is now a BOUNDED SEARCH,
 * via `tryCandidate()`, not a single attempt. A rejected or null first
 * candidate gets exactly one alternative attempt (excluding the first's
 * own (kind, target_signal_id) when it was a genuine rejection, no
 * exclusion invented for a null result -- candidate generation is
 * stochastic, confirmed by live-trial evidence during the design review).
 * If the second attempt also fails, the turn finalizes directly with
 * `completion_reason: 'questioning_exhausted'` -- never a third attempt,
 * and never routed through `checkCompletion()`, which remains entirely
 * unaware of Constraint B/BoundaryState by design (kept that way
 * deliberately; see the approved design review for why completion
 * learning about boundary-cap state was rejected in favor of this
 * runtime-local bound). The explicit skip_question/skip_phase decline
 * path is untouched -- Model 4 never engages when declineSignal is set,
 * a deliberate scope boundary from the same review.
 *
 * `[FINDING]`, disclosed rather than hidden: a phase-scope decline updates
 * `BoundaryState.phases_ended` only via `evaluateBoundary`, which this
 * loop calls *after* phase/completion are already computed for this same
 * turn (candidate generation, and therefore boundary evaluation, cannot
 * happen before phase is known -- see the reordering above). A phase
 * ended by decline this turn therefore takes effect starting the
 * *following* turn's `computePhase` call, not instantaneously within the
 * same turn. This does not cause an incorrect outcome: the assistant
 * still asks nothing further this turn regardless (Constraint B's own
 * suppression handles that immediately), and completion is never gated on
 * a phase-scope decline (only an interview-scope one is, via
 * `suForGates.opt_out_scope === 'interview'`, checked directly by
 * `checkCompletion` -- see completion.ts's own `[FIXED 2026-08-10]` note;
 * this was previously, and incorrectly, read off `gate1.state ===
 * 'not_applicable_declined'` instead) -- so nothing is silently wrong,
 * only a one-turn delay in an internal bookkeeping value nothing
 * user-facing depends on this turn.
 *
 * `gate_2_state` (and the value fed to `checkCompletion`) uses the
 * `'interview'` evaluation scope, not `'phase'` -- matching
 * `run-dialogue.ts`'s own established precedent (it stores `gate_2_state`
 * from interview scope as the canonical value) and `gates.ts`'s own
 * framing of `'interview'` as the full-object default. `'phase'` scope is
 * still computed (mirroring existing precedent) but not used to drive
 * anything in this module -- and, per the Phase 2->3 design review that
 * preceded this implementation, must never be used as a phase-transition
 * signal (that would be the rejected Candidate C).
 */

import { runExtractionPipeline, type CandidateExtractor, type RawUserTurn } from '@/lib/interview-engine/extraction'
import { evaluateGate1, evaluateGate2 } from '@/lib/interview-engine/gates'
import { computePhase } from '@/lib/interview-engine/phase'
import { createInitialBoundaryState, evaluateBoundary, type BoundaryState, type CandidateQuestion } from '@/lib/interview-engine/boundaries'
import {
  deriveEligibleSignals,
  matchesExclusion,
  validateCandidateReference,
  type CandidateExclusion,
  type CandidateQuestionGenerator,
  type EligibleSignal,
} from '@/lib/interview-engine/candidate-question'
import type { ConstraintADecider } from '@/lib/interview-engine/decision'
import { resolveLineageRoot } from '@/lib/interview-engine/signal-lineage'
import { buildPendingClarification, type PendingClarification } from '@/lib/interview-engine/pending-clarification'
import { checkCompletion } from './completion'
import { resolveDeclineSignal, type DeclineAction } from './decline'
import { runCRCConversation, type CRCPipelineResult } from './run-crc-conversation'
import type { SessionStore } from './session-store'
import type { CRCSessionState } from './types'
import type { MatrixRow } from '@/lib/retrieval-engine/types'
import type { Phase, StructuredUnderstanding } from '@/types/interview-engine'

/**
 * Runtime-owned fixed copy for a turn where nothing is asked but the
 * interview continues -- a previously ownerless responsibility this
 * milestone's own architecture review found (LIVE_INTERVIEW_RUNTIME_ARCHITECTURE.md
 * §1/§5). No new generation layer, no LLM -- a single fixed string,
 * exactly the same "fixed copy is Runtime's own job" pattern
 * `assemble-projection-output.ts`'s opening_line/closing_cta already are.
 */
const ACKNOWLEDGMENT_COPY = 'Got it — thanks for sharing that.'

/**
 * Not imported from lib/interview-engine/eval/empty-structured-understanding.ts
 * deliberately -- that module lives under eval/, and production code must
 * never depend on eval-only code (the same directionality the subsystem-
 * boundaries test suite already enforces elsewhere in this pipeline).
 * Small enough to duplicate rather than relocate the eval module.
 */
function emptyStructuredUnderstanding(): StructuredUnderstanding {
  return {
    project_facts: {
      intended_use: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
      workflow_role: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
    },
    tool_mentions: [],
    scoped_observations: [],
    current_phase: 1,
    gate_1_state: 'not_met',
    gate_2_state: 'not_yet_stable',
    completion_reason: null,
    opt_out_scope: null,
  }
}

export type TurnOutcome =
  | { kind: 'question'; message: string }
  | { kind: 'acknowledgment'; message: string }
  | { kind: 'complete'; result: CRCPipelineResult }

export interface RunTurnDeps {
  extractor: CandidateExtractor
  generator: CandidateQuestionGenerator
  decider: ConstraintADecider
  sessionStore: SessionStore
  matrix: MatrixRow[]
}

export interface RunTurnInput {
  token: string
  turnNumber: number
  userText: string
  declineAction?: DeclineAction
}

type CandidateAttemptResult =
  | { status: 'approved'; outcome: TurnOutcome; nextBoundaryState: BoundaryState; pendingClarification: PendingClarification | null }
  /**
   * `exclusion` is null when nothing legitimate was actually proposed
   * this attempt (generator returned null, or the proposal failed
   * validateCandidateReference -- a hallucinated/stale signal_id isn't a
   * real eligible signal to steer away from) -- in both cases there is
   * nothing meaningful to exclude on a following attempt, matching the
   * same reasoning the approved correction already applies to a null
   * first candidate.
   */
  | { status: 'rejected'; exclusion: CandidateExclusion | null }

/**
 * CRC Limited Pilot -- Model 4 (bounded alternative-question search),
 * 2026-08-10. One full generate -> validate -> Constraint A -> Constraint
 * B attempt, organic (no-decline) path only. Never called for a turn with
 * a declineSignal -- that path's own existing, unchanged inline logic in
 * runTurn() still applies (see Model 4's approved scoping: explicit
 * skip_question/skip_phase declines never get a bounded retry).
 *
 * `excluded`, when supplied by the caller, is passed straight through to
 * the generator as structured (kind, signal_id) facts -- never Constraint
 * A/B's own rationale prose (see anthropic-candidate-question.ts's own
 * buildExclusionInstruction). The exclusion returned on a REJECTED result
 * uses the proposal's own raw target_signal_id (what the model itself
 * understands from eligible_signals), never a lineage-resolved id --
 * lineage resolution is Constraint B's own internal concern
 * (resolveLineageRoot, applied only to the boundary-evaluation call
 * below), and a lineage-root id wouldn't appear in eligible_signals at
 * all, so it would be meaningless to hand back to the next generation
 * call.
 */
async function tryCandidate(
  suAfter: StructuredUnderstanding,
  eligible: EligibleSignal[],
  phase: Phase,
  boundaryStateLoaded: BoundaryState,
  deps: RunTurnDeps,
  excluded?: CandidateExclusion[],
): Promise<CandidateAttemptResult> {
  const proposal = await deps.generator({ structured_understanding: suAfter, eligible_signals: eligible, phase, excluded })
  if (!proposal) {
    return { status: 'rejected', exclusion: null }
  }

  // Defensive, deterministic check on the model's own compliance with the
  // exclusion it was given -- no live Constraint A/B call spent
  // re-confirming an answer already known from the first attempt.
  if (excluded && excluded.length > 0 && matchesExclusion(proposal, excluded)) {
    return { status: 'rejected', exclusion: { kind: proposal.question_kind, signal_id: proposal.target_signal_id } }
  }

  const validation = validateCandidateReference(proposal, eligible)
  if (validation.outcome !== 'accepted') {
    return { status: 'rejected', exclusion: null }
  }

  const decision = await deps.decider({ structured_understanding: suAfter, candidate: proposal, phase })
  if (!decision.should_ask) {
    return { status: 'rejected', exclusion: { kind: proposal.question_kind, signal_id: proposal.target_signal_id } }
  }

  const lineageResolvedCandidate: CandidateQuestion = validation.candidate.signal_id
    ? { ...validation.candidate, signal_id: resolveLineageRoot(suAfter, validation.candidate.signal_id) }
    : validation.candidate
  // declineSignal is always undefined here -- organic path only.
  const boundaryResult = evaluateBoundary(boundaryStateLoaded, lineageResolvedCandidate, undefined)
  if (!boundaryResult.allowed) {
    return { status: 'rejected', exclusion: { kind: proposal.question_kind, signal_id: proposal.target_signal_id } }
  }

  return {
    status: 'approved',
    outcome: { kind: 'question', message: proposal.question_text },
    nextBoundaryState: boundaryResult.next_state,
    pendingClarification: buildPendingClarification(proposal, suAfter),
  }
}

export async function runTurn(input: RunTurnInput, deps: RunTurnDeps): Promise<TurnOutcome> {
  const loaded = await deps.sessionStore.load(input.token)
  const suLoaded = loaded?.structured_understanding ?? emptyStructuredUnderstanding()
  const boundaryStateLoaded = loaded?.boundary_state ?? createInitialBoundaryState()

  // §7 recovery: a completed session never re-enters the loop -- recompute
  // (cheap, pure, safe) rather than accept a new turn against it.
  if (suLoaded.completion_reason !== null) {
    return { kind: 'complete', result: runCRCConversation(suLoaded, deps.matrix) }
  }

  const declineSignal = input.declineAction ? resolveDeclineSignal(input.declineAction) : undefined

  const rawTurn: RawUserTurn = {
    turn: input.turnNumber,
    text: input.userText,
    pending_clarification: loaded?.pending_clarification ?? null,
  }
  const { updated: extracted } = await runExtractionPipeline(suLoaded, rawTurn, deps.extractor)

  // Decline pre-processing BEFORE gate evaluation -- Phase 7's own shipped
  // bugfix (evaluateGate1's decline branch, and evaluateGate2's decline
  // check, both need this current, not stale).
  const optOutScope = declineSignal?.scope === 'interview' ? 'interview' : extracted.opt_out_scope
  const suForGates: StructuredUnderstanding = { ...extracted, opt_out_scope: optOutScope }

  const gate1 = evaluateGate1(suForGates)
  const gate2Interview = evaluateGate2(suLoaded, suForGates, 'interview')

  const phase = computePhase(suForGates, boundaryStateLoaded)
  const completion = checkCompletion(gate1, gate2Interview, phase, suForGates.opt_out_scope)

  const suAfter: StructuredUnderstanding = {
    ...suForGates,
    current_phase: phase,
    gate_1_state: gate1.state,
    gate_2_state: gate2Interview.state,
    completion_reason: completion.reason,
  }

  if (completion.is_complete) {
    await deps.sessionStore.save(input.token, {
      structured_understanding: suAfter,
      boundary_state: boundaryStateLoaded,
      pending_clarification: null,
    })
    return { kind: 'complete', result: runCRCConversation(suAfter, deps.matrix) }
  }

  const eligible = deriveEligibleSignals(suAfter)

  let nextBoundaryState = boundaryStateLoaded
  let pendingClarification: PendingClarification | null = null
  let outcome: TurnOutcome = { kind: 'acknowledgment', message: ACKNOWLEDGMENT_COPY }

  if (declineSignal) {
    // Explicit skip_question/skip_phase decline -- unchanged by Model 4.
    // A user who explicitly asked to move past this specific thing does
    // not get an immediate substitute question; that is a different
    // product decision from the organic-rejection dead end Model 4
    // addresses (see this module's own Model 4 header note below and the
    // approved design review's explicit scoping).
    const proposal = await deps.generator({ structured_understanding: suAfter, eligible_signals: eligible, phase })
    if (proposal) {
      const validation = validateCandidateReference(proposal, eligible)
      if (validation.outcome === 'accepted') {
        const decision = await deps.decider({ structured_understanding: suAfter, candidate: proposal, phase })
        if (decision.should_ask) {
          const lineageResolvedCandidate: CandidateQuestion = validation.candidate.signal_id
            ? { ...validation.candidate, signal_id: resolveLineageRoot(suAfter, validation.candidate.signal_id) }
            : validation.candidate
          const boundaryResult = evaluateBoundary(boundaryStateLoaded, lineageResolvedCandidate, declineSignal)
          nextBoundaryState = boundaryResult.next_state
          if (boundaryResult.allowed) {
            outcome = { kind: 'question', message: proposal.question_text }
            pendingClarification = buildPendingClarification(proposal, suAfter)
          }
        } else {
          const boundaryResult = evaluateBoundary(boundaryStateLoaded, { kind: 'other', phase }, declineSignal)
          nextBoundaryState = boundaryResult.next_state
        }
      }
    } else {
      const boundaryResult = evaluateBoundary(boundaryStateLoaded, { kind: 'other', phase }, declineSignal)
      nextBoundaryState = boundaryResult.next_state
    }
  } else {
    // CRC Limited Pilot -- Model 4 (bounded alternative-question search),
    // 2026-08-10. Organic path only. At most one alternative attempt
    // after a rejected OR null first candidate -- a null result is not
    // treated as "nothing else is askable": live-trial evidence during
    // the design review showed identical conversational state producing
    // both a null/rejected candidate and a valid question across
    // different runs, so a null first attempt still gets the one bounded
    // retry, with no exclusion invented for it (approved correction,
    // 2026-08-10).
    const attempt1 = await tryCandidate(suAfter, eligible, phase, boundaryStateLoaded, deps)
    if (attempt1.status === 'approved') {
      outcome = attempt1.outcome
      nextBoundaryState = attempt1.nextBoundaryState
      pendingClarification = attempt1.pendingClarification
    } else {
      const excluded = attempt1.exclusion ? [attempt1.exclusion] : undefined
      const attempt2 = await tryCandidate(suAfter, eligible, phase, boundaryStateLoaded, deps, excluded)
      if (attempt2.status === 'approved') {
        outcome = attempt2.outcome
        nextBoundaryState = attempt2.nextBoundaryState
        pendingClarification = attempt2.pendingClarification
      } else {
        // Bounded search exhausted (no third attempt) -- finalize.
        // Constructed directly here, never via checkCompletion(), which
        // remains entirely unaware of Constraint B/BoundaryState by
        // design (see COMPLETION_REASONS' own doc in
        // types/interview-engine.ts and this module's own header).
        // nextBoundaryState is still boundaryStateLoaded here: neither
        // rejected attempt ever reaches evaluateBoundary's "allowed"
        // branch (the only branch that mutates boundary state), so
        // there is nothing to carry forward beyond what was already
        // loaded.
        const suExhausted: StructuredUnderstanding = { ...suAfter, completion_reason: 'questioning_exhausted' }
        await deps.sessionStore.save(input.token, {
          structured_understanding: suExhausted,
          boundary_state: nextBoundaryState,
          pending_clarification: null,
        })
        return { kind: 'complete', result: runCRCConversation(suExhausted, deps.matrix) }
      }
    }
  }

  const sessionState: CRCSessionState = {
    structured_understanding: suAfter,
    boundary_state: nextBoundaryState,
    pending_clarification: pendingClarification,
  }
  await deps.sessionStore.save(input.token, sessionState)

  return outcome
}
