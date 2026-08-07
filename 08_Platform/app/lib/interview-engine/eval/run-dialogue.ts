/**
 * Per-turn dialogue orchestrator (CRC_PROTOTYPE_ALPHA_ROADMAP.md Phase 7).
 * Eval-only: lives in eval/, imports every subsystem, is imported by none of
 * them. No frozen module is modified to build this -- it is new glue over
 * existing pure functions and injected extractor/generator/decider
 * dependencies, following exactly the chaining pattern
 * run-real-model-integration-eval.ts (Phase 6b step 9) already established,
 * extended with Gate 1/2, Constraint A, decline handling, and handoff
 * assembly, none of which that script covered.
 *
 * Phase and decline scope are SCRIPT-SUPPLIED, not inferred (JD decision,
 * 2026-08-08, PHASE_7_PLANNING.md / roadmap Phase 7 section). No module in
 * this codebase has ever derived either from conversation text -- every
 * existing module that needs `phase` (decision.ts, candidate-question.ts,
 * boundaries.ts) already takes it as external input. Building inference here
 * would be a new, untested classifier smuggled into an evaluation whose
 * purpose is to validate the already-built pipeline. This is a Prototype
 * Alpha harness assumption, not production architecture -- revisit
 * explicitly before any production build.
 */

import type { CandidateQuestionKind, DeclineSignal } from '../boundaries'
import { createInitialBoundaryState, evaluateBoundary, type BoundaryState } from '../boundaries'
import { deriveEligibleSignals, validateCandidateReference } from '../candidate-question'
import type { CandidateQuestionGenerator, CandidateQuestionProposal, EligibleSignal } from '../candidate-question'
import type { ConstraintADecider, ConstraintADecision } from '../decision'
import type { CandidateExtractor, ExtractionDiagnostic, RawUserTurn } from '../extraction'
import { runExtractionPipeline } from '../extraction'
import { evaluateGate1, evaluateGate2, type Gate1Result, type Gate2Result } from '../gates'
import { buildRetrievalHandoff } from '../handoff'
import { resolveLineageRoot } from '../signal-lineage'
import type { CompletionReason, OptOutScope, Phase, RetrievalHandoff, StructuredUnderstanding } from '@/types/interview-engine'

// ── Script input ─────────────────────────────────────────────────────────────

export interface DialogueTurnScript {
  turn: number
  user_text: string
  /** Script-supplied -- see module header. */
  phase: Phase
  /** Script-supplied, only present on turns meant to trigger a boundary decline. */
  decline?: DeclineSignal
}

// ── Per-turn result ──────────────────────────────────────────────────────────

export const ASSISTANT_ACTIONS = [
  'ASK',
  'NONE_PROPOSED',
  'SUPPRESSED_BY_GENERATION_REJECTION',
  'SUPPRESSED_BY_CONSTRAINT_A',
  'SUPPRESSED_BY_CONSTRAINT_B',
  'PHASE_ENDED_BY_DECLINE',
  'INTERVIEW_ENDED_BY_DECLINE',
] as const

export type AssistantAction = (typeof ASSISTANT_ACTIONS)[number]

export interface DialogueTurnResult {
  turn: number
  phase: Phase
  su_before: StructuredUnderstanding
  su_after: StructuredUnderstanding
  extraction_diagnostics: ExtractionDiagnostic[]
  eligible_signals: EligibleSignal[]
  candidate_proposal: CandidateQuestionProposal | null
  validation_rejected_reason: string | null
  constraint_a_decision: ConstraintADecision | null
  boundary_result_reason_code: string | null
  boundary_action_scope: string | null
  gate_1: Gate1Result
  gate_2_phase_scope: Gate2Result
  gate_2_interview_scope: Gate2Result
  assistant_action: AssistantAction
  asked_question: { question_kind: CandidateQuestionKind; target_signal_id: string | null } | null
}

export interface DialogueRunnerDeps {
  extractor: CandidateExtractor
  generator: CandidateQuestionGenerator
  decider: ConstraintADecider
}

interface DialogueRunnerState {
  su: StructuredUnderstanding
  boundaryState: BoundaryState
}

/**
 * One turn. Gate 2 is computed under BOTH scopes every turn (pure, no extra
 * live call) -- the open phase-vs-interview approximation gap (gates.ts) is
 * observed here, not resolved; StructuredUnderstanding.gate_2_state itself is
 * written from the INTERVIEW scope (the stricter/superset scope), consistent
 * with how the module's own docstring frames 'interview' as the full-object
 * default.
 *
 * Constraint B is only ever invoked when there is something for it to gate:
 * an accepted candidate Constraint A approved, or a decline that needs to
 * register into BoundaryState regardless of whether a candidate existed this
 * turn. This mirrors boundaries.ts's own cap semantics -- a cap only
 * consumes budget for a candidate that actually reached evaluateBoundary, so
 * a candidate Constraint A itself suppressed must never silently consume a
 * Constraint-B-administered cap.
 *
 * Before any evaluateBoundary call for an approved candidate, its signal_id
 * (when present) is resolved to its lineage root via resolveLineageRoot
 * (JD instruction, 2026-08-08) -- so a follow-up/uncertainty-clarification
 * cap tracks the semantic thing being asked about across supersession, not
 * whichever id currently happens to represent it. boundaries.ts itself is
 * unchanged; see signal-lineage.ts for the full rationale. The trace's own
 * `asked_question.target_signal_id` still reports the proposal's ORIGINAL
 * (unresolved) target, since that is what was actually asked about --
 * lineage resolution is purely an input to cap bookkeeping, never surfaced
 * as if it were the question's real subject.
 */
export async function runDialogueTurn(
  state: DialogueRunnerState,
  script: DialogueTurnScript,
  deps: DialogueRunnerDeps,
): Promise<{ state: DialogueRunnerState; result: DialogueTurnResult }> {
  const suBefore = state.su
  const rawTurn: RawUserTurn = { turn: script.turn, text: script.user_text }

  const { updated: extracted, diagnostics } = await runExtractionPipeline(suBefore, rawTurn, deps.extractor)

  // opt_out_scope must be current BEFORE gate evaluation, not only assembled
  // at the very end of the whole dialogue: evaluateGate1's decline branch
  // reads su.opt_out_scope directly, and evaluateGate2's
  // declineOccurredThisTransition reads previous.opt_out_scope === null &&
  // current.opt_out_scope !== null across exactly this turn boundary.
  // Mirrors boundaries.ts's own persistence model, not a new invention:
  // question-scoped and 'ambiguous' declines are transient and never
  // persisted there ("Question-scoped declines are NOT persisted anywhere"),
  // so only an interview-scoped decline updates this field; phase-scoped
  // declines are deliberately out of scope for Phase 7's scenario set (see
  // dialogue-scenarios.ts header) since OptOutScope has no per-phase
  // granularity to represent boundaries.ts's own phases_ended: Phase[] list
  // -- a real, narrower modeling gap, not solved here because none of the 9
  // scenarios need it.
  const optOutScope = script.decline?.scope === 'interview' ? 'interview' : suBefore.opt_out_scope

  const suForGates: StructuredUnderstanding = { ...extracted, opt_out_scope: optOutScope }
  const gate1 = evaluateGate1(suForGates)
  const gate2Phase = evaluateGate2(suBefore, suForGates, 'phase')
  const gate2Interview = evaluateGate2(suBefore, suForGates, 'interview')

  const suAfter: StructuredUnderstanding = {
    ...extracted,
    current_phase: script.phase,
    gate_1_state: gate1.state,
    gate_2_state: gate2Interview.state,
    opt_out_scope: optOutScope,
  }

  const eligible = deriveEligibleSignals(suAfter)
  const proposal = await deps.generator({ structured_understanding: suAfter, eligible_signals: eligible, phase: script.phase })

  let assistantAction: AssistantAction = 'NONE_PROPOSED'
  let validationRejectedReason: string | null = null
  let constraintADecision: ConstraintADecision | null = null
  let boundaryReasonCode: string | null = null
  let boundaryActionScope: string | null = null
  let askedQuestion: DialogueTurnResult['asked_question'] = null
  let nextBoundaryState = state.boundaryState

  if (proposal) {
    const validation = validateCandidateReference(proposal, eligible)
    if (validation.outcome === 'rejected') {
      assistantAction = 'SUPPRESSED_BY_GENERATION_REJECTION'
      validationRejectedReason = validation.reason
    } else {
      constraintADecision = await deps.decider({ structured_understanding: suAfter, candidate: proposal, phase: script.phase })
      if (constraintADecision.should_ask) {
        const lineageResolvedCandidate = validation.candidate.signal_id
          ? { ...validation.candidate, signal_id: resolveLineageRoot(suAfter, validation.candidate.signal_id) }
          : validation.candidate
        const boundaryResult = evaluateBoundary(state.boundaryState, lineageResolvedCandidate, script.decline)
        nextBoundaryState = boundaryResult.next_state
        boundaryReasonCode = boundaryResult.reason_code
        boundaryActionScope = boundaryResult.action_scope
        if (boundaryResult.allowed) {
          assistantAction = 'ASK'
          askedQuestion = { question_kind: proposal.question_kind, target_signal_id: proposal.target_signal_id }
        } else if (boundaryResult.action_scope === 'end_interview') {
          assistantAction = 'INTERVIEW_ENDED_BY_DECLINE'
        } else if (boundaryResult.action_scope === 'end_current_phase') {
          assistantAction = 'PHASE_ENDED_BY_DECLINE'
        } else {
          assistantAction = 'SUPPRESSED_BY_CONSTRAINT_B'
        }
      } else {
        assistantAction = 'SUPPRESSED_BY_CONSTRAINT_A'
        if (script.decline) {
          const boundaryResult = evaluateBoundary(state.boundaryState, { kind: 'other', phase: script.phase }, script.decline)
          nextBoundaryState = boundaryResult.next_state
          boundaryReasonCode = boundaryResult.reason_code
          boundaryActionScope = boundaryResult.action_scope
          if (boundaryResult.action_scope === 'end_interview') assistantAction = 'INTERVIEW_ENDED_BY_DECLINE'
          else if (boundaryResult.action_scope === 'end_current_phase') assistantAction = 'PHASE_ENDED_BY_DECLINE'
        }
      }
    }
  } else if (script.decline) {
    const boundaryResult = evaluateBoundary(state.boundaryState, { kind: 'other', phase: script.phase }, script.decline)
    nextBoundaryState = boundaryResult.next_state
    boundaryReasonCode = boundaryResult.reason_code
    boundaryActionScope = boundaryResult.action_scope
    assistantAction =
      boundaryResult.action_scope === 'end_interview'
        ? 'INTERVIEW_ENDED_BY_DECLINE'
        : boundaryResult.action_scope === 'end_current_phase'
          ? 'PHASE_ENDED_BY_DECLINE'
          : 'SUPPRESSED_BY_CONSTRAINT_B'
  }

  const result: DialogueTurnResult = {
    turn: script.turn,
    phase: script.phase,
    su_before: suBefore,
    su_after: suAfter,
    extraction_diagnostics: diagnostics,
    eligible_signals: eligible,
    candidate_proposal: proposal,
    validation_rejected_reason: validationRejectedReason,
    constraint_a_decision: constraintADecision,
    boundary_result_reason_code: boundaryReasonCode,
    boundary_action_scope: boundaryActionScope,
    gate_1: gate1,
    gate_2_phase_scope: gate2Phase,
    gate_2_interview_scope: gate2Interview,
    assistant_action: assistantAction,
    asked_question: askedQuestion,
  }

  return { state: { su: suAfter, boundaryState: nextBoundaryState }, result }
}

// ── Full dialogue run ────────────────────────────────────────────────────────

export interface DialogueRunResult {
  turns: DialogueTurnResult[]
  final_su: StructuredUnderstanding
  completion_reason: CompletionReason
  opt_out_scope: OptOutScope
  final_handoff: RetrievalHandoff
}

/**
 * completion_reason/opt_out_scope are, like phase, never derived anywhere
 * else in the codebase (fixtures.ts hand-sets them; nothing computes them).
 * Computed here, once, after the scripted turns finish -- not per-turn --
 * using only the three outcomes StructuredUnderstanding.completion_reason's
 * own type already enumerates. This is harness-level bookkeeping over
 * already-computed gate/boundary results, not a new inference subsystem.
 */
export async function runDialogue(
  initialSu: StructuredUnderstanding,
  turns: DialogueTurnScript[],
  deps: DialogueRunnerDeps,
): Promise<DialogueRunResult> {
  let state: DialogueRunnerState = { su: initialSu, boundaryState: createInitialBoundaryState() }
  const results: DialogueTurnResult[] = []

  for (const script of turns) {
    const { state: nextState, result } = await runDialogueTurn(state, script, deps)
    state = nextState
    results.push(result)
    if (result.assistant_action === 'INTERVIEW_ENDED_BY_DECLINE') break
  }

  const lastResult = results[results.length - 1]
  let completionReason: CompletionReason = null
  let optOutScope: OptOutScope = null

  if (lastResult?.assistant_action === 'INTERVIEW_ENDED_BY_DECLINE') {
    completionReason = 'declined'
    optOutScope = 'interview'
  } else if (state.su.gate_1_state === 'met' && state.su.gate_2_state === 'stable') {
    completionReason = 'gate_1_gate_2_met'
  } else if (state.su.gate_1_state === 'not_met') {
    completionReason = 'gate_1_unmet_exhausted'
  } else if (state.su.gate_1_state === 'not_applicable_declined') {
    completionReason = 'declined'
    optOutScope = state.su.opt_out_scope ?? 'interview'
  }

  const finalSu: StructuredUnderstanding = { ...state.su, completion_reason: completionReason, opt_out_scope: optOutScope }

  return {
    turns: results,
    final_su: finalSu,
    completion_reason: completionReason,
    opt_out_scope: optOutScope,
    final_handoff: buildRetrievalHandoff(finalSu),
  }
}
