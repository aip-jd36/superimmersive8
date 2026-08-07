/**
 * Sequenced (queue-based) mocks for the Phase 7 mock-stack dry run. Distinct
 * from mock-extractor.ts/mock-candidate-question.ts/mock-decision.ts's
 * `constant*` builders, which return the SAME value on every call regardless
 * of input -- correct for single-state Phase 6 corpus cases, but unusable
 * for a multi-turn dialogue where each turn (and each candidate-generation/
 * decision call within it) needs a different pre-scripted answer.
 *
 * Each builder here returns the next value off a fixed, pre-authored queue,
 * in call order. This works because run-dialogue.ts's own per-turn call
 * order is deterministic and sequential (one extractor call, then at most one
 * generator call, then at most one decider call, per turn) -- the scenario
 * author already knows exactly how many of each will occur, from the same
 * expected trace used to grade the run.
 *
 * Eval-only. Does not touch or import the frozen constant* mocks -- a
 * parallel, purpose-built mechanism, not a modification of an existing one.
 */

import type { CandidateExtractor, CandidateObservation, RawUserTurn } from '../extraction'
import type { CandidateQuestionGenerator, CandidateQuestionGeneratorInput, CandidateQuestionProposal } from '../candidate-question'
import type { ConstraintADecider, ConstraintADecision, ConstraintAInput } from '../decision'

export function sequencedExtractor(perTurnCandidates: CandidateObservation[][]): CandidateExtractor {
  let i = 0
  return async (_turn: RawUserTurn) => {
    if (i >= perTurnCandidates.length) {
      throw new Error(`sequencedExtractor: called ${i + 1} times but only ${perTurnCandidates.length} turns were scripted.`)
    }
    return perTurnCandidates[i++]
  }
}

export function sequencedGenerator(perCallProposals: (CandidateQuestionProposal | null)[]): CandidateQuestionGenerator {
  let i = 0
  return async (_input: CandidateQuestionGeneratorInput) => {
    if (i >= perCallProposals.length) {
      throw new Error(`sequencedGenerator: called ${i + 1} times but only ${perCallProposals.length} calls were scripted.`)
    }
    return perCallProposals[i++]
  }
}

export function sequencedDecider(perCallDecisions: ConstraintADecision[]): ConstraintADecider {
  let i = 0
  return async (_input: ConstraintAInput) => {
    if (i >= perCallDecisions.length) {
      throw new Error(`sequencedDecider: called ${i + 1} times but only ${perCallDecisions.length} calls were scripted.`)
    }
    return perCallDecisions[i++]
  }
}
