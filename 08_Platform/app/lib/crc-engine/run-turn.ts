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
import { createInitialBoundaryState, evaluateBoundary, type CandidateQuestion } from '@/lib/interview-engine/boundaries'
import {
  deriveEligibleSignals,
  validateCandidateReference,
  type CandidateQuestionGenerator,
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
import type { StructuredUnderstanding } from '@/types/interview-engine'

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
  const proposal = await deps.generator({ structured_understanding: suAfter, eligible_signals: eligible, phase })

  let nextBoundaryState = boundaryStateLoaded
  let pendingClarification: PendingClarification | null = null
  let outcome: TurnOutcome = { kind: 'acknowledgment', message: ACKNOWLEDGMENT_COPY }

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
      } else if (declineSignal) {
        const boundaryResult = evaluateBoundary(boundaryStateLoaded, { kind: 'other', phase }, declineSignal)
        nextBoundaryState = boundaryResult.next_state
      }
    }
  } else if (declineSignal) {
    const boundaryResult = evaluateBoundary(boundaryStateLoaded, { kind: 'other', phase }, declineSignal)
    nextBoundaryState = boundaryResult.next_state
  }

  const sessionState: CRCSessionState = {
    structured_understanding: suAfter,
    boundary_state: nextBoundaryState,
    pending_clarification: pendingClarification,
  }
  await deps.sessionStore.save(input.token, sessionState)

  return outcome
}
