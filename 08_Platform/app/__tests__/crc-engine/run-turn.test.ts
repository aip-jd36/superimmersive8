/**
 * Canonical per-turn loop -- mock-stack integration tests
 * (LIVE_INTERVIEW_RUNTIME_ARCHITECTURE.md §5, Live Interview Runtime
 * milestone). Mock stack only (constantExtractor/constantCandidateQuestionGenerator/
 * constantConstraintADecider) -- deterministic, no live model, mirroring
 * Prototype Alpha's own "mock dry run before live battery" two-stage
 * discipline. A live-model battery for run-turn.ts is explicitly a
 * separate, later milestone, not part of this pass.
 */

import { runTurn, type RunTurnDeps } from '@/lib/crc-engine/run-turn'
import { createInMemorySessionStore } from '@/lib/crc-engine/in-memory-session-store'
import { constantExtractor } from '@/lib/interview-engine/mock-extractor'
import { constantCandidateQuestionGenerator } from '@/lib/interview-engine/mock-candidate-question'
import { constantConstraintADecider } from '@/lib/interview-engine/mock-decision'
import type { CandidateObservation } from '@/lib/interview-engine/extraction'
import type { CandidateQuestionProposal } from '@/lib/interview-engine/candidate-question'
import type { ConstraintADecision } from '@/lib/interview-engine/decision'
import type { SessionStore } from '@/lib/crc-engine/session-store'

const MATRIX = [
  {
    identifier: 'runway-gen3',
    last_verified: '2026-08-05',
    claims: [{ claim_id: 'runway-gen3', crc_eligible: 'Yes' as const, crc_publication_scope: 'scope text', crc_candidate_statement: 'Runway statement.' }],
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

function proposal(overrides: Partial<CandidateQuestionProposal> = {}): CandidateQuestionProposal {
  return { question_text: 'Which access surface did you use?', question_kind: 'follow_up_on_signal', target_signal_id: null, phase: 2, ...overrides }
}

describe('runTurn -- single-turn cases', () => {
  test('a turn that extracts a fact but proposes no question -> acknowledgment, never an error', async () => {
    const outcome = await runTurn({ token: 't1', turnNumber: 1, userText: 'We used Runway.' }, deps({ extractor: constantExtractor([toolCandidate()]) }))
    expect(outcome).toEqual({ kind: 'acknowledgment', message: expect.any(String) })
  })

  test('a turn that proposes an eligible, approved question -> question outcome with the proposal\'s own exact text', async () => {
    const store = createInMemorySessionStore()
    // Turn 1 establishes the tool so a signal_id exists to target.
    await runTurn({ token: 't2', turnNumber: 1, userText: 'We used Runway.' }, deps({ extractor: constantExtractor([toolCandidate()]) }, store))

    const questionProposal = proposal({ question_kind: 'other', target_signal_id: null, question_text: 'What was this project for?' })
    const outcome = await runTurn(
      { token: 't2', turnNumber: 2, userText: 'A social campaign.' },
      deps({ generator: constantCandidateQuestionGenerator(questionProposal), decider: constantConstraintADecider({ should_ask: true, reason_code: 'MATERIALLY_IMPROVES_UNDERSTANDING', rationale: 'x' }) }, store),
    )
    expect(outcome).toEqual({ kind: 'question', message: 'What was this project for?' })
  })

  test('a follow_up_on_signal question sets pending_clarification on the persisted session, consumed by the next turn', async () => {
    const store = createInMemorySessionStore()
    await runTurn({ token: 't3', turnNumber: 1, userText: 'We used Runway.' }, deps({ extractor: constantExtractor([toolCandidate()]) }, store))
    const loadedAfterTurn1 = await store.load('t3')
    const toolSignalId = loadedAfterTurn1!.structured_understanding.tool_mentions[0].mention_id

    const clarifyingProposal = proposal({ question_kind: 'follow_up_on_signal', target_signal_id: toolSignalId, question_text: 'Which specific plan?' })
    const outcome = await runTurn(
      { token: 't3', turnNumber: 2, userText: 'Not sure yet.' },
      deps({ generator: constantCandidateQuestionGenerator(clarifyingProposal), decider: constantConstraintADecider({ should_ask: true, reason_code: 'MATERIALLY_IMPROVES_UNDERSTANDING', rationale: 'x' }) }, store),
    )
    expect(outcome).toEqual({ kind: 'question', message: 'Which specific plan?' })

    const loadedAfterTurn2 = await store.load('t3')
    expect(loadedAfterTurn2!.pending_clarification).toEqual({
      signal_id: toolSignalId,
      kind: 'follow_up_on_signal',
      unresolved_summary: "tool mention 'runway-gen3'",
    })

    // Turn 3, no new question asked -> the prior pending_clarification is replaced, never left stale.
    await runTurn({ token: 't3', turnNumber: 3, userText: 'Team plan actually.' }, deps({}, store))
    const loadedAfterTurn3 = await store.load('t3')
    expect(loadedAfterTurn3!.pending_clarification).toBeNull()
  })
})

describe('runTurn -- decline handling', () => {
  test('stop_interview decline completes the interview immediately, on the very first turn, from an empty session', async () => {
    const outcome = await runTurn({ token: 't4', turnNumber: 1, userText: 'skip', declineAction: 'stop_interview' }, deps())
    expect(outcome.kind).toBe('complete')
    if (outcome.kind === 'complete') {
      expect(outcome.result.output).toEqual({ opening_line: '', understood_summary: '', knowledge_items: [], closing_cta: '' })
    }
  })

  test('stop_interview decline never calls the generator or decider -- boundary check happens before candidate generation would matter, and completion short-circuits before either runs', async () => {
    const throwingDeps = deps({
      generator: async () => {
        throw new Error('generator must not be called on an interview-scope decline')
      },
      decider: async () => {
        throw new Error('decider must not be called on an interview-scope decline')
      },
    })
    await expect(runTurn({ token: 't5', turnNumber: 1, userText: 'skip', declineAction: 'stop_interview' }, throwingDeps)).resolves.toEqual(
      expect.objectContaining({ kind: 'complete' }),
    )
  })
})

describe('runTurn -- session recovery', () => {
  test('a completed session never re-enters the loop -- extractor/generator/decider are never called on a second turn against it', async () => {
    const store = createInMemorySessionStore()
    await runTurn({ token: 't6', turnNumber: 1, userText: 'skip', declineAction: 'stop_interview' }, deps({}, store))

    const throwingDeps = deps(
      {
        extractor: async () => {
          throw new Error('extractor must not be called against a completed session')
        },
        generator: async () => {
          throw new Error('generator must not be called against a completed session')
        },
        decider: async () => {
          throw new Error('decider must not be called against a completed session')
        },
      },
      store,
    )
    const outcome = await runTurn({ token: 't6', turnNumber: 2, userText: 'anything at all' }, throwingDeps)
    expect(outcome.kind).toBe('complete')
  })

  test('facts accumulate across turns via the session store -- turn 2 sees turn 1\'s tool mention', async () => {
    const store = createInMemorySessionStore()
    await runTurn({ token: 't7', turnNumber: 1, userText: 'We used Runway.' }, deps({ extractor: constantExtractor([toolCandidate()]) }, store))
    await runTurn({ token: 't7', turnNumber: 2, userText: 'Also used Kling.' }, deps({ extractor: constantExtractor([toolCandidate({ proposal_id: 'p-2', raw_tool_name: 'Kling' })]) }, store))

    const loaded = await store.load('t7')
    const identifiers = loaded!.structured_understanding.tool_mentions.filter((m) => m.superseded_by === null).map((m) => m.resolution.kind === 'canonical' ? m.resolution.identifier : null)
    expect(identifiers.sort()).toEqual(['kling', 'runway-gen3'])
  })

  test('a brand-new token with no prior session starts from an empty StructuredUnderstanding, never errors', async () => {
    const outcome = await runTurn({ token: 'brand-new-token', turnNumber: 1, userText: 'Hello.' }, deps())
    expect(['question', 'acknowledgment', 'complete']).toContain(outcome.kind)
  })
})
