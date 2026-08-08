/**
 * Instrumented live-model deps wrapper (Live Interview Runtime milestone,
 * live-model validation). Mirrors
 * lib/interview-engine/eval/live-model-deps.ts's own role for Phase 7's
 * battery: wraps the real Anthropic adapters so each call's own input/
 * output is captured as a side effect, WITHOUT modifying `run-turn.ts`
 * itself or its own return contract.
 *
 * This is the deliberate design answer to a real constraint: `runTurn()`
 * was built as production code with a minimal `TurnOutcome`-only return
 * (per its own design -- diagnostics are not a production concern), but
 * this evaluation needs per-turn visibility into what Extraction,
 * candidate generation, and Constraint A actually returned. Wrapping the
 * three DEPS `runTurn()` already takes as parameters -- not touching
 * `runTurn()`'s own body -- gets that visibility while exercising the
 * exact, real, shipping code path, not a parallel reimplementation. A
 * reimplementation would validate something that merely resembles
 * `runTurn()`, not `runTurn()` itself -- exactly what this milestone
 * says not to do.
 *
 * `runTurn()` calls each dep exactly once per turn it's invoked at all
 * (extractor always; generator/decider only if the turn doesn't complete
 * before reaching them), so `lastExtraction`/`lastProposal`/`lastDecision`
 * are unambiguous for the turn just executed -- read immediately after
 * each `runTurn()` call, before the next one overwrites them.
 */

import type { CandidateExtractor, CandidateObservation, RawUserTurn } from '@/lib/interview-engine/extraction'
import type { CandidateQuestionGenerator, CandidateQuestionGeneratorInput, CandidateQuestionProposal } from '@/lib/interview-engine/candidate-question'
import type { ConstraintADecider, ConstraintADecision, ConstraintAInput } from '@/lib/interview-engine/decision'

export interface InstrumentedCapture {
  lastExtraction: { input: RawUserTurn; output: CandidateObservation[] } | null
  lastProposal: { input: CandidateQuestionGeneratorInput; output: CandidateQuestionProposal | null } | null
  lastDecision: { input: ConstraintAInput; output: ConstraintADecision } | null
  /** Reset before each runTurn() call so a turn that never reaches candidate generation (e.g. completes at gate evaluation) correctly reports null, not a stale prior turn's value. */
  reset(): void
}

export function createCapture(): InstrumentedCapture {
  return {
    lastExtraction: null,
    lastProposal: null,
    lastDecision: null,
    reset() {
      this.lastExtraction = null
      this.lastProposal = null
      this.lastDecision = null
    },
  }
}

export function instrumentExtractor(base: CandidateExtractor, capture: InstrumentedCapture): CandidateExtractor {
  return async (turn) => {
    const output = await base(turn)
    capture.lastExtraction = { input: turn, output }
    return output
  }
}

export function instrumentGenerator(base: CandidateQuestionGenerator, capture: InstrumentedCapture): CandidateQuestionGenerator {
  return async (input) => {
    const output = await base(input)
    capture.lastProposal = { input, output }
    return output
  }
}

export function instrumentDecider(base: ConstraintADecider, capture: InstrumentedCapture): ConstraintADecider {
  return async (input) => {
    const output = await base(input)
    capture.lastDecision = { input, output }
    return output
  }
}
