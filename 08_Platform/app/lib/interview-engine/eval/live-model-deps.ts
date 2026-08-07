/**
 * Live-model diagnostics-capturing dependencies for the Phase 7 real-model
 * battery (CRC_PROTOTYPE_ALPHA_ROADMAP.md Phase 7; JD instruction
 * 2026-08-08). Eval-only.
 *
 * Wraps each real Anthropic adapter's *WithDiagnostics function (already
 * built in Phase 6a/6b/6c: extractWithDiagnostics, generateWithDiagnostics,
 * decideWithDiagnostics) behind the exact plain CandidateExtractor/
 * CandidateQuestionGenerator/ConstraintADecider interfaces run-dialogue.ts's
 * DialogueRunnerDeps already expects -- so the orchestrator itself needs
 * zero changes to accept live-model deps instead of sequenced mocks. Token
 * usage and latency are captured as a side effect into a caller-supplied
 * array, one entry per live call, tagged by which subsystem made it.
 *
 * Does not modify anthropic-extractor.ts, anthropic-candidate-question.ts,
 * or anthropic-decision.ts -- their own createAnthropic... / ...WithDiagnostics
 * functions are called exactly as already built, with default options
 * (model selection via each adapter's own env var, unchanged). No prompt,
 * schema, or decision-logic change of any kind.
 */

import { extractWithDiagnostics } from '../anthropic-extractor'
import { generateWithDiagnostics } from '../anthropic-candidate-question'
import { decideWithDiagnostics } from '../anthropic-decision'
import type { CandidateExtractor, RawUserTurn } from '../extraction'
import type { CandidateQuestionGenerator, CandidateQuestionGeneratorInput } from '../candidate-question'
import type { ConstraintADecider, ConstraintAInput } from '../decision'
import type { DialogueRunnerDeps } from './run-dialogue'

export interface LiveCallRecord {
  subsystem: 'extraction' | 'candidate_generation' | 'constraint_a'
  inputTokens: number
  outputTokens: number
  latencyMs: number
}

/**
 * Builds one fresh DialogueRunnerDeps whose three functions are backed by
 * live Anthropic calls, appending one LiveCallRecord per call to `calls`, in
 * call order, tagged only by subsystem. `run-dialogue.ts` is not modified to
 * carry a turn number through to these calls (ConstraintAInput/
 * CandidateQuestionGeneratorInput don't carry one, and threading it through
 * would touch orchestration logic mid-battery). Reconciling a given
 * LiveCallRecord to a specific turn number is done by the harness instead,
 * post-hoc, from the already-known per-turn shape of a completed
 * DialogueRunResult: extraction is called exactly once per turn (1:1, in
 * order); candidate_generation is called exactly once per turn (1:1, in
 * order, since run-dialogue.ts always attempts generation); constraint_a is
 * called only on turns whose DialogueTurnResult.constraint_a_decision is
 * non-null, consumed in that same order. The caller supplies `calls`
 * (typically a fresh array per dialogue run) so usage stays attributable to
 * exactly one run.
 */
export function createLiveDialogueDeps(calls: LiveCallRecord[]): DialogueRunnerDeps {
  const extractor: CandidateExtractor = async (turn: RawUserTurn) => {
    const { candidates, inputTokens, outputTokens, latencyMs } = await extractWithDiagnostics(turn)
    calls.push({ subsystem: 'extraction', inputTokens, outputTokens, latencyMs })
    return candidates
  }

  const generator: CandidateQuestionGenerator = async (input: CandidateQuestionGeneratorInput) => {
    const { proposal, inputTokens, outputTokens, latencyMs } = await generateWithDiagnostics(input)
    calls.push({ subsystem: 'candidate_generation', inputTokens, outputTokens, latencyMs })
    return proposal
  }

  const decider: ConstraintADecider = async (input: ConstraintAInput) => {
    const { decision, inputTokens, outputTokens, latencyMs } = await decideWithDiagnostics(input)
    calls.push({ subsystem: 'constraint_a', inputTokens, outputTokens, latencyMs })
    return decision
  }

  return { extractor, generator, decider }
}
