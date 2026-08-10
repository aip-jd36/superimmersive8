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

/** kind: 'project_fact' candidate that attests intended_use as confirmed -- combined with toolCandidate(), satisfies Gate 1's minimumUnderstandingMet. */
function intendedUseCandidate(overrides: Partial<CandidateObservation> = {}): CandidateObservation {
  return {
    proposal_id: 'p-use-1',
    turn: 1,
    raw_text: 'It is for an agency client ad campaign.',
    kind: 'project_fact',
    raw_fact_field: 'intended_use',
    fact_confidence_hint: 'confirmed',
    fact_value_hint: 'Paid ad campaign for an agency client',
    ...overrides,
  }
}

describe('runTurn -- single-turn cases', () => {
  test('a turn that extracts a fact but has no candidate on either bounded attempt -> finalizes with questioning_exhausted (Model 4, 2026-08-10 -- superseded pre-Model-4 acknowledgment behavior)', async () => {
    // Pre-Model-4, a null candidate fell through to a plain, non-complete
    // acknowledgment. Under Model 4's bounded search, a constant mock
    // returning null gives the SAME null answer on both attempts by
    // construction, and two failed attempts finalize -- this is the
    // correct, intended behavior change, not a regression.
    const outcome = await runTurn({ token: 't1', turnNumber: 1, userText: 'We used Runway.' }, deps({ extractor: constantExtractor([toolCandidate()]) }))
    expect(outcome.kind).toBe('complete')
    if (outcome.kind === 'complete') {
      expect(outcome.result.output).toBeDefined()
    }
  })

  test('a turn that proposes an eligible, approved question -> question outcome with the proposal\'s own exact text', async () => {
    const store = createInMemorySessionStore()
    // Turn 1 establishes the tool so a signal_id exists to target. Uses
    // an explicit decline so this setup turn resolves via the unchanged
    // decline path -- a plain null-generator organic turn would now
    // (correctly) finalize via Model 4's own bounded search instead of
    // leaving the session active for turn 2 to build on.
    await runTurn({ token: 't2', turnNumber: 1, userText: 'We used Runway.', declineAction: 'skip_question' }, deps({ extractor: constantExtractor([toolCandidate()]) }, store))

    const questionProposal = proposal({ question_kind: 'other', target_signal_id: null, question_text: 'What was this project for?' })
    const outcome = await runTurn(
      { token: 't2', turnNumber: 2, userText: 'A social campaign.' },
      deps({ generator: constantCandidateQuestionGenerator(questionProposal), decider: constantConstraintADecider({ should_ask: true, reason_code: 'MATERIALLY_IMPROVES_UNDERSTANDING', rationale: 'x' }) }, store),
    )
    expect(outcome).toEqual({ kind: 'question', message: 'What was this project for?' })
  })

  test('a follow_up_on_signal question sets pending_clarification on the persisted session, consumed by the next turn', async () => {
    const store = createInMemorySessionStore()
    await runTurn({ token: 't3', turnNumber: 1, userText: 'We used Runway.', declineAction: 'skip_question' }, deps({ extractor: constantExtractor([toolCandidate()]) }, store))
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

describe('runTurn -- stop_interview regression matrix (confirmed engine defect fix, 2026-08-10)', () => {
  // The pure gate1/gate2/phase x optOutScope matrix lives in
  // completion.test.ts (checkCompletion is where the fix actually is, and
  // where it can be tested exhaustively and cheaply). These are the
  // integration-level cases that can only be exercised through runTurn --
  // the exact scenario the production bug was found in, and the
  // pending_clarification interaction JD's regression matrix also required.

  test('Gate 1 already met (tool identity + intended use both established) -> stop_interview still completes immediately, not left active', async () => {
    const store = createInMemorySessionStore()
    // declineAction on turn 1 resolves via the unchanged decline path,
    // keeping this a pure "establish Gate 1, session stays active" setup
    // step -- an organic null-generator turn would now (correctly)
    // finalize via Model 4's own bounded search before this test ever
    // gets to exercise the stop_interview scenario it's actually about.
    await runTurn(
      { token: 't8', turnNumber: 1, userText: 'We made a short ad using Runway for an agency client.', declineAction: 'skip_question' },
      deps({ extractor: constantExtractor([toolCandidate(), intendedUseCandidate()]) }, store),
    )
    const afterTurn1 = await store.load('t8')
    // Sanity check the fixture actually reaches the exact precondition that
    // exposed the bug -- Gate 1 genuinely met, not merely close.
    expect(afterTurn1!.structured_understanding.gate_1_state).toBe('met')

    const outcome = await runTurn({ token: 't8', turnNumber: 2, userText: 'skip', declineAction: 'stop_interview' }, deps({}, store))
    expect(outcome.kind).toBe('complete')

    const afterTurn2 = await store.load('t8')
    expect(afterTurn2!.structured_understanding.completion_reason).toBe('declined')
    expect(afterTurn2!.pending_clarification).toBeNull()
  })

  test('the exact production scenario: Gate 1 met on turn 1 (tool + intended use in one message), a real follow-up question left pending on turn 2, Stop on turn 3 -> turn 3 returns complete, and a fresh load (refresh) shows the completed session, never active', async () => {
    const store = createInMemorySessionStore()
    // Turn 1: both facts land in one message, exactly as in production
    // ("We made a short ad using Runway for an agency client.") -- an
    // explicit decline keeps this a pure Gate-1-establishing setup step
    // via the unchanged decline path (a null-generator organic turn would
    // now correctly finalize via Model 4 instead of staying active).
    await runTurn(
      { token: 't9', turnNumber: 1, userText: 'We made a short ad using Runway for an agency client.', declineAction: 'skip_question' },
      deps({ extractor: constantExtractor([toolCandidate(), intendedUseCandidate()]) }, store),
    )
    const afterTurn1 = await store.load('t9')
    expect(afterTurn1!.structured_understanding.gate_1_state).toBe('met')
    const toolSignalId = afterTurn1!.structured_understanding.tool_mentions[0].mention_id

    // Turn 2: a real follow_up_on_signal question (the actual kind that
    // sets pending_clarification -- mirrors the live model's real
    // "Which access tier or plan..." question before Stop was pressed).
    const clarifyingProposal = proposal({ question_kind: 'follow_up_on_signal', target_signal_id: toolSignalId, question_text: 'Which access tier?' })
    await runTurn(
      { token: 't9', turnNumber: 2, userText: 'Not sure yet.' },
      deps({ generator: constantCandidateQuestionGenerator(clarifyingProposal), decider: constantConstraintADecider({ should_ask: true, reason_code: 'MATERIALLY_IMPROVES_UNDERSTANDING', rationale: 'x' }) }, store),
    )
    const afterTurn2 = await store.load('t9')
    expect(afterTurn2!.pending_clarification).not.toBeNull()

    const outcome = await runTurn({ token: 't9', turnNumber: 3, userText: "I'd like to stop here.", declineAction: 'stop_interview' }, deps({}, store))
    expect(outcome.kind).toBe('complete')

    // "Refresh" is a fresh load of persisted state -- the same field
    // (completion_reason) GET /api/crc/turn reads to decide 'active' vs
    // 'complete'. Must never still read as active.
    const refreshed = await store.load('t9')
    expect(refreshed!.structured_understanding.completion_reason).not.toBeNull()
    expect(refreshed!.pending_clarification).toBeNull()
  })

  test('Stop pressed immediately after an acknowledgment turn (not a question) still completes on the same turn with a valid final Projection (CRC Limited Pilot UX finding, 2026-08-10 -- product-flow fix companion coverage, engine behavior unchanged)', async () => {
    const store = createInMemorySessionStore()
    // Model 4 (2026-08-10) removed the organic (no-decline) path to a
    // non-complete acknowledgment entirely -- a rejected/null candidate
    // now gets one bounded retry and finalizes if that also fails,
    // rather than falling back to acknowledgment. The ONLY remaining way
    // to reach a genuine non-complete acknowledgment is the explicit
    // skip_question/skip_phase decline path, which Model 4 deliberately
    // does not touch (see run-turn.ts's own Model 4 header note). This
    // test's actual purpose -- stop_interview completing correctly from
    // a real, established-facts, non-complete acknowledgment state --
    // still needs exactly that state, so it's constructed via decline.
    const outcome1 = await runTurn(
      { token: 't11', turnNumber: 1, userText: 'We made a short ad using Runway for an agency client.', declineAction: 'skip_question' },
      deps({ extractor: constantExtractor([toolCandidate(), intendedUseCandidate()]) }, store),
    )
    expect(outcome1.kind).toBe('acknowledgment')
    const afterTurn1 = await store.load('t11')
    expect(afterTurn1!.structured_understanding.gate_1_state).toBe('met')

    const outcome2 = await runTurn({ token: 't11', turnNumber: 2, userText: "I'd like to stop here.", declineAction: 'stop_interview' }, deps({}, store))
    expect(outcome2.kind).toBe('complete')
    if (outcome2.kind === 'complete') {
      // A valid ProjectionOutput -- the exact shape, not sparse/empty this
      // time since real facts were gathered before Stop.
      expect(outcome2.result.output.opening_line).not.toBe('')
      expect(outcome2.result.output.understood_summary).not.toBe('')
    }

    const refreshed = await store.load('t11')
    expect(refreshed!.structured_understanding.completion_reason).toBe('declined')
  })

  test('an active pending_clarification at the moment of stop_interview does not block or delay completion', async () => {
    const store = createInMemorySessionStore()
    await runTurn({ token: 't10', turnNumber: 1, userText: 'We used Runway.', declineAction: 'skip_question' }, deps({ extractor: constantExtractor([toolCandidate()]) }, store))
    const afterTurn1 = await store.load('t10')
    const toolSignalId = afterTurn1!.structured_understanding.tool_mentions[0].mention_id

    const clarifyingProposal = proposal({ question_kind: 'follow_up_on_signal', target_signal_id: toolSignalId, question_text: 'Which plan?' })
    await runTurn(
      { token: 't10', turnNumber: 2, userText: 'Not sure.' },
      deps({ generator: constantCandidateQuestionGenerator(clarifyingProposal), decider: constantConstraintADecider({ should_ask: true, reason_code: 'MATERIALLY_IMPROVES_UNDERSTANDING', rationale: 'x' }) }, store),
    )
    const afterTurn2 = await store.load('t10')
    // Precondition: a clarification is genuinely pending when Stop is pressed next.
    expect(afterTurn2!.pending_clarification).not.toBeNull()

    const outcome = await runTurn({ token: 't10', turnNumber: 3, userText: 'stop', declineAction: 'stop_interview' }, deps({}, store))
    expect(outcome.kind).toBe('complete')
    const afterTurn3 = await store.load('t10')
    expect(afterTurn3!.pending_clarification).toBeNull()
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
    await runTurn({ token: 't7', turnNumber: 1, userText: 'We used Runway.', declineAction: 'skip_question' }, deps({ extractor: constantExtractor([toolCandidate()]) }, store))
    await runTurn({ token: 't7', turnNumber: 2, userText: 'Also used Kling.', declineAction: 'skip_question' }, deps({ extractor: constantExtractor([toolCandidate({ proposal_id: 'p-2', raw_tool_name: 'Kling' })]) }, store))

    const loaded = await store.load('t7')
    const identifiers = loaded!.structured_understanding.tool_mentions.filter((m) => m.superseded_by === null).map((m) => m.resolution.kind === 'canonical' ? m.resolution.identifier : null)
    expect(identifiers.sort()).toEqual(['kling', 'runway-gen3'])
  })

  test('a brand-new token with no prior session starts from an empty StructuredUnderstanding, never errors', async () => {
    const outcome = await runTurn({ token: 'brand-new-token', turnNumber: 1, userText: 'Hello.' }, deps())
    expect(['question', 'acknowledgment', 'complete']).toContain(outcome.kind)
  })
})
