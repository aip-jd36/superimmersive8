/**
 * CRC-EXTRACTION-OBS-2 (Bounded Extraction Observability, 2026-09-28).
 * Proves TurnOutcome.extractionDiagnostics threading at the runTurn() level
 * -- i.e. that run-turn.ts's own destructure/return-point wiring (see that
 * module's own `extractionDiagnostics` field header) actually surfaces
 * runExtractionPipeline's real diagnostics on every reachable return path,
 * always present (including the zero-candidate case) except the one
 * documented exception: the §7 "a completed session never re-enters the
 * loop" recovery short-circuit, which returns before extraction ever runs.
 *
 * Deliberately narrow: buildExtractionTracePayload's own minimization/
 * reason-code-fidelity/compound-goal-at-the-pipeline-level coverage lives
 * in turn-traces.test.ts, next to the function it tests. This file's job is
 * only the run-turn.ts threading contract -- mock stack only
 * (constantExtractor/constantCandidateQuestionGenerator/
 * constantConstraintADecider), matching every sibling run-turn-*.test.ts
 * file in this directory.
 */

import { runTurn, type RunTurnDeps } from '@/lib/crc-engine/run-turn'
import { createInMemorySessionStore } from '@/lib/crc-engine/in-memory-session-store'
import { constantExtractor } from '@/lib/interview-engine/mock-extractor'
import { sequencedGenerator } from '@/lib/interview-engine/eval/mock-sequenced'
import { constantCandidateQuestionGenerator } from '@/lib/interview-engine/mock-candidate-question'
import { constantConstraintADecider } from '@/lib/interview-engine/mock-decision'
import type { CandidateObservation } from '@/lib/interview-engine/extraction'
import type { SessionStore } from '@/lib/crc-engine/session-store'

const MATRIX = [
  {
    identifier: 'runway-gen3',
    last_verified: '2026-08-05',
    claims: [{ claim_id: 'runway-gen3', crc_eligible: 'Yes' as const, crc_publication_scope: 'scope text', crc_candidate_statement: 'Runway statement.', applicability_requirements: [] }],
  },
]

function deps(overrides: Partial<RunTurnDeps> = {}, store?: SessionStore): RunTurnDeps {
  return {
    extractor: constantExtractor([]),
    generator: constantCandidateQuestionGenerator(null),
    decider: constantConstraintADecider({ should_ask: false, reason_code: 'NO_MATERIAL_IMPROVEMENT', rationale: 'x' }),
    sessionStore: store ?? createInMemorySessionStore(),
    matrix: MATRIX,
    ...overrides,
  }
}

function toolCandidate(overrides: Partial<CandidateObservation> = {}): CandidateObservation {
  return { proposal_id: 'p-1', turn: 1, raw_text: 'We used Runway.', kind: 'tool_mention', raw_tool_name: 'Runway', ...overrides }
}

function goalCandidate(overrides: Partial<CandidateObservation> = {}): CandidateObservation {
  return { proposal_id: 'g-1', turn: 1, raw_text: 'Can I use this commercially?', kind: 'user_goal', goal_confidence_hint: 'confirmed', ...overrides }
}

describe('runTurn -- extractionDiagnostics threading', () => {
  test('zero candidates -> extractionDiagnostics is present as an empty array, not undefined/omitted', async () => {
    const outcome = await runTurn({ token: 'eo-1', turnNumber: 1, userText: 'hello' }, deps({ extractor: constantExtractor([]) }))
    expect(outcome.extractionDiagnostics).toEqual([])
  })

  test('a single accepted candidate -> extractionDiagnostics has exactly one entry, reflecting the real pipeline result', async () => {
    const outcome = await runTurn({ token: 'eo-2', turnNumber: 1, userText: 'We used Runway.' }, deps({ extractor: constantExtractor([toolCandidate()]) }))
    expect(outcome.extractionDiagnostics).toHaveLength(1)
    expect(outcome.extractionDiagnostics?.[0].decision.outcome).toBe('accepted')
    expect(outcome.extractionDiagnostics?.[0].candidate.kind).toBe('tool_mention')
  })

  test('compound-goal canary: two explicit user_goal candidates proposed in the SAME turn are both preserved, independently, in extractionDiagnostics', async () => {
    const goalA = goalCandidate({ proposal_id: 'ga', raw_text: 'I want to license this to a streaming platform.' })
    const goalB = goalCandidate({ proposal_id: 'gb', raw_text: 'I also want to know if I can sell prints.' })
    const outcome = await runTurn({ token: 'eo-3', turnNumber: 1, userText: 'two goals in one message' }, deps({ extractor: constantExtractor([goalA, goalB]) }))
    expect(outcome.extractionDiagnostics).toHaveLength(2)
    expect(outcome.extractionDiagnostics?.[0]).toMatchObject({ proposal_id: 'ga', decision: { outcome: 'accepted' } })
    expect(outcome.extractionDiagnostics?.[1]).toMatchObject({ proposal_id: 'gb', decision: { outcome: 'accepted' } })
  })

  test('compound-goal canary, mixed disposition: one accepted + one deferred user_goal candidate in the same turn are both preserved with their own distinct disposition', async () => {
    const goalA = goalCandidate({ proposal_id: 'ga' })
    const goalB = goalCandidate({ proposal_id: 'gb', goal_confidence_hint: undefined })
    const outcome = await runTurn({ token: 'eo-4', turnNumber: 1, userText: 'two goals, one unclear' }, deps({ extractor: constantExtractor([goalA, goalB]) }))
    expect(outcome.extractionDiagnostics).toHaveLength(2)
    expect(outcome.extractionDiagnostics?.[0].decision.outcome).toBe('accepted')
    expect(outcome.extractionDiagnostics?.[1].decision).toMatchObject({ outcome: 'deferred', reason_code: 'CANDIDATE_UNCLASSIFIABLE' })
  })

  test('present on the decline path too -- extraction runs before decline pre-processing', async () => {
    const outcome = await runTurn(
      { token: 'eo-5', turnNumber: 1, userText: 'skip', declineAction: 'skip_question' },
      deps({ extractor: constantExtractor([toolCandidate()]) }),
    )
    expect(outcome.extractionDiagnostics).toHaveLength(1)
  })

  test('present on a genuine completing turn (kind: "complete")', async () => {
    const outcome = await runTurn({ token: 'eo-6', turnNumber: 1, userText: 'We used Runway.' }, deps({ extractor: constantExtractor([toolCandidate()]) }))
    expect(outcome.kind).toBe('complete')
    expect(outcome.extractionDiagnostics).toHaveLength(1)
  })

  test('absent (undefined) ONLY on the §7 "already complete" replay short-circuit, which returns before runExtractionPipeline is ever called', async () => {
    const store = createInMemorySessionStore()
    // Turn 1: both bounded Model 4 attempts return null -> finalizes with
    // completion_reason: 'questioning_exhausted' (same pattern as
    // run-turn-model4.test.ts's own "both attempts fail" case).
    const firstTurn = await runTurn(
      { token: 'eo-7', turnNumber: 1, userText: 'We used Runway.' },
      deps({ extractor: constantExtractor([toolCandidate()]), generator: sequencedGenerator([null, null]) }, store),
    )
    expect(firstTurn.kind).toBe('complete')
    expect(firstTurn.extractionDiagnostics).toHaveLength(1) // extraction DID run on the genuine completing turn itself

    // Turn 2: the session is already complete -- runTurn()'s own §7 guard
    // recomputes and returns WITHOUT ever calling runExtractionPipeline.
    const replayTurn = await runTurn({ token: 'eo-7', turnNumber: 2, userText: 'anything else' }, deps({ extractor: constantExtractor([toolCandidate()]) }, store))
    expect(replayTurn.kind).toBe('complete')
    expect(replayTurn.extractionDiagnostics).toBeUndefined()
  })
})
