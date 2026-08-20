/**
 * Jurisdiction clarification -- integration test suite (CRC Living
 * Knowledge Phase 1, 2026-08-16). Mock-stack only, same discipline as
 * run-turn-commercial-readiness-discovery.test.ts. Proves the deterministic
 * candidate actually gets injected at Model 4 attempt #1 (the same real
 * slot Discovery uses -- confirmed by direct inspection of run-turn.ts
 * before this module was written, not assumed), that it goes through the
 * unchanged Constraint A/B pipeline (no privileged pass), that it takes
 * precedence over Discovery when both are eligible the same turn, that its
 * own cap is independent of Discovery's cap, and that the answer flows
 * through completely ordinary, already-existing extraction on the next
 * turn.
 */

import { runTurn, type RunTurnDeps, type TurnOutcome } from '@/lib/crc-engine/run-turn'
import { createInMemorySessionStore } from '@/lib/crc-engine/in-memory-session-store'
import { constantExtractor } from '@/lib/interview-engine/mock-extractor'
import { constantCandidateQuestionGenerator } from '@/lib/interview-engine/mock-candidate-question'
import { constantConstraintADecider } from '@/lib/interview-engine/mock-decision'
import { JURISDICTION_CLARIFICATION_QUESTION, JURISDICTION_CLARIFICATION_RETRY_QUESTION } from '@/lib/crc-engine/jurisdiction-clarification'
import type { CandidateObservation } from '@/lib/interview-engine/extraction'
import type { ConstraintADecision } from '@/lib/interview-engine/decision'
import type { SessionStore } from '@/lib/crc-engine/session-store'
import type { CRCSessionState } from '@/lib/crc-engine/types'
import type { TopicClaim } from '@/lib/retrieval-engine/types'

const MATRIX: RunTurnDeps['matrix'] = []

const COPYRIGHT_CLAIM: TopicClaim = {
  claim_id: 'CLAIM-COPY-TEST-v1',
  topic: 'copyright_ownership',
  claim_character: 'established',
  jurisdiction: 'United States',
  lifecycle: 'Adopted',
  crc_eligible: 'Yes',
  crc_publication_scope: 'scope',
  crc_candidate_statement: 'Test statement.',
  applicability_requirements: [{ fact: 'jurisdiction', operator: 'equals', value: 'United States' }],
  unresolved_project_dependencies: [],
  provider_scope: null,
  last_verified: '2026-08-16',
  superseded_by: null,
}

function deps(overrides: Partial<RunTurnDeps> = {}, store?: SessionStore): RunTurnDeps {
  return {
    extractor: constantExtractor([]),
    generator: constantCandidateQuestionGenerator(null),
    decider: constantConstraintADecider({ should_ask: false, reason_code: 'NO_MATERIAL_IMPROVEMENT', rationale: 'x' }),
    sessionStore: store ?? createInMemorySessionStore(),
    matrix: MATRIX,
    topicClaims: [COPYRIGHT_CLAIM],
    ...overrides,
  }
}

function toolCandidate(overrides: Partial<CandidateObservation> = {}): CandidateObservation {
  return { proposal_id: 'p-1', turn: 1, raw_text: 'We used Runway.', kind: 'tool_mention', raw_tool_name: 'Runway', ...overrides }
}

function intendedUseCandidate(value: string): CandidateObservation {
  return { proposal_id: 'p-use', turn: 1, raw_text: value, kind: 'project_fact', raw_fact_field: 'intended_use', fact_confidence_hint: 'confirmed', fact_value_hint: value }
}

function workflowRoleCandidate(value: string): CandidateObservation {
  return { proposal_id: 'p-role', turn: 1, raw_text: value, kind: 'project_fact', raw_fact_field: 'workflow_role', fact_confidence_hint: 'confirmed', fact_value_hint: value }
}

function goalCandidate(overrides: Partial<CandidateObservation> = {}): CandidateObservation {
  return {
    proposal_id: 'p-goal',
    turn: 1,
    raw_text: 'Do I own the copyright?',
    kind: 'user_goal',
    goal_confidence_hint: 'confirmed',
    goal_category_hint: 'copyright_ownership',
    goal_scope_hint: 'informational',
    ...overrides,
  }
}

function askDecision(overrides: Partial<ConstraintADecision> = {}): ConstraintADecision {
  return { should_ask: true, reason_code: 'MATERIALLY_IMPROVES_UNDERSTANDING', rationale: 'x', ...overrides }
}

async function loadState(store: SessionStore, token: string): Promise<CRCSessionState> {
  return (await store.load(token)) as CRCSessionState
}

/** Reaches Gate 1 met + Phase 3 + an active confirmed copyright_ownership goal in one turn. */
function eligibleDeps(overrides: Partial<RunTurnDeps> = {}, store?: SessionStore): RunTurnDeps {
  return deps(
    {
      extractor: constantExtractor([toolCandidate(), intendedUseCandidate('a paid campaign'), workflowRoleCandidate('solo operator'), goalCandidate()]),
      decider: constantConstraintADecider(askDecision()),
      ...overrides,
    },
    store,
  )
}

describe('jurisdiction clarification -- eligibility gating', () => {
  test('eligible: an active copyright_ownership goal + a jurisdiction-gated Adopted/CRC-eligible claim + unconfirmed jurisdiction -> asked as attempt 1, exact PM-approved copy, ordinary generator never called', async () => {
    const store = createInMemorySessionStore()
    let generatorCalled = false
    const generator = async () => {
      generatorCalled = true
      return null
    }
    const outcome = await runTurn({ token: 't1', turnNumber: 1, userText: 'x' }, eligibleDeps({ generator }, store))
    expect(outcome.kind).toBe('question')
    if (outcome.kind === 'question') {
      expect(outcome.message).toBe(JURISDICTION_CLARIFICATION_QUESTION)
    }
    expect(outcome.jurisdictionSignal).toEqual({ eligible: true, outcome: 'asked' })
    expect(generatorCalled).toBe(false)

    const state = await loadState(store, 't1')
    expect(state.boundary_state.jurisdiction_clarification_asked).toBe(true)
  })

  test('not eligible: no goal at all -> jurisdictionSignal is omitted entirely (undefined), not surfaced as a boring never_eligible value', async () => {
    const store = createInMemorySessionStore()
    const d = deps(
      {
        extractor: constantExtractor([toolCandidate(), intendedUseCandidate('a paid campaign'), workflowRoleCandidate('solo operator')]),
        decider: constantConstraintADecider({ should_ask: false, reason_code: 'NO_MATERIAL_IMPROVEMENT', rationale: 'x' }),
      },
      store,
    )
    const outcome = await runTurn({ token: 't2', turnNumber: 1, userText: 'x' }, d)
    expect(outcome.jurisdictionSignal).toBeUndefined()
  })

  test('not eligible: no topicClaims supplied at all (pre-Phase-1 caller / default) -> never fires, no crash', async () => {
    const store = createInMemorySessionStore()
    const d = eligibleDeps({ topicClaims: undefined }, store)
    const outcome = await runTurn({ token: 't3', turnNumber: 1, userText: 'x' }, d)
    expect(outcome.jurisdictionSignal).toBeUndefined()
  })

  test('the answer on the NEXT turn flows through completely ordinary, already-existing project_fact extraction -- no special-case answer handling needed', async () => {
    const store = createInMemorySessionStore()
    await runTurn({ token: 't4', turnNumber: 1, userText: 'x' }, eligibleDeps({}, store))

    const jurisdictionAnswer: CandidateObservation = {
      proposal_id: 'p-jur',
      turn: 2,
      raw_text: 'United States',
      kind: 'project_fact',
      raw_fact_field: 'jurisdiction',
      fact_confidence_hint: 'confirmed',
      fact_value_hint: 'United States',
    }
    await runTurn({ token: 't4', turnNumber: 2, userText: 'United States' }, eligibleDeps({ extractor: constantExtractor([jurisdictionAnswer]) }, store))

    const state = await loadState(store, 't4')
    expect(state.structured_understanding.project_facts.jurisdiction).toEqual({
      attestation: { state: 'confirmed', value: 'United States' },
      source_turn: 2,
      source_statement: 'United States',
    })
  })

  test('capped: once the INITIAL question is asked, the next turn gets the one bounded deterministic retry -- not the ordinary generator, and not silently dropped (Second-Jurisdiction UX milestone, 2026-08-20, J3; supersedes the pre-J3 "falls back to the ordinary generator" behavior)', async () => {
    const store = createInMemorySessionStore()
    await runTurn({ token: 't5', turnNumber: 1, userText: 'x' }, eligibleDeps({}, store))

    // A genuinely new signal this turn (not an empty extraction) so Gate 2
    // registers material change and the turn reaches candidate generation
    // at all, rather than short-circuiting to natural completion.
    const newObservation: CandidateObservation = {
      proposal_id: 'p-obs',
      turn: 2,
      raw_text: 'The client reviewed and approved the final cut.',
      kind: 'scoped_observation',
      scope: 'current_project',
      observation_confidence_hint: 'confirmed',
    }
    let generatorCalled = false
    const generator = async () => {
      generatorCalled = true
      return null
    }
    const outcome2 = await runTurn(
      { token: 't5', turnNumber: 2, userText: 'more info' },
      eligibleDeps({ generator, extractor: constantExtractor([newObservation]) }, store),
    )
    // jurisdictionSignal analytics remain scoped to the INITIAL eligibility
    // check only (unchanged, deliberate scope decision) -- undefined here
    // does not mean "nothing jurisdiction-related happened this turn."
    expect(outcome2.jurisdictionSignal).toBeUndefined()
    expect(outcome2.kind).toBe('question')
    if (outcome2.kind === 'question') {
      expect(outcome2.message).toBe(JURISDICTION_CLARIFICATION_RETRY_QUESTION)
    }
    // The deterministic retry occupies the slot -- the ordinary generator
    // is never even called this turn.
    expect(generatorCalled).toBe(false)

    const state = await loadState(store, 't5')
    expect(state.boundary_state.jurisdiction_clarification_retry_asked).toBe(true)
  })

  test('after the retry is also capped, a THIRD turn finally falls back to the ordinary generator', async () => {
    const store = createInMemorySessionStore()
    await runTurn({ token: 't5b', turnNumber: 1, userText: 'x' }, eligibleDeps({}, store))
    await runTurn(
      { token: 't5b', turnNumber: 2, userText: 'more info' },
      eligibleDeps({ extractor: constantExtractor([{ proposal_id: 'p-obs2', turn: 2, raw_text: 'detail', kind: 'scoped_observation', scope: 'current_project', observation_confidence_hint: 'confirmed' }]) }, store),
    )
    expect((await loadState(store, 't5b')).boundary_state.jurisdiction_clarification_retry_asked).toBe(true)

    let generatorCalled = false
    const generator = async () => {
      generatorCalled = true
      return null
    }
    const newObservation: CandidateObservation = {
      proposal_id: 'p-obs3',
      turn: 3,
      raw_text: 'Still not sure about the country.',
      kind: 'scoped_observation',
      scope: 'current_project',
      observation_confidence_hint: 'confirmed',
    }
    await runTurn(
      { token: 't5b', turnNumber: 3, userText: 'still not sure' },
      eligibleDeps({ generator, extractor: constantExtractor([newObservation]) }, store),
    )
    expect(generatorCalled).toBe(true)
  })

  test('declining the question means jurisdiction stays unconfirmed but the cap still prevents re-asking (no guess, no pestering)', async () => {
    const store = createInMemorySessionStore()
    await runTurn({ token: 't6', turnNumber: 1, userText: 'x' }, eligibleDeps({}, store))
    // User declines (skip_question) rather than answering.
    await runTurn({ token: 't6', turnNumber: 2, userText: "Let's skip this question.", declineAction: 'skip_question' }, eligibleDeps({}, store))

    const state = await loadState(store, 't6')
    expect(state.structured_understanding.project_facts.jurisdiction.attestation.state).toBe('unknown')
    expect(state.boundary_state.jurisdiction_clarification_asked).toBe(true)
  })
})

describe('jurisdiction clarification -- fires before Gate 1 is met (Copyright UAT Correction Milestone T1, 2026-08-19)', () => {
  test('real orchestration: jurisdiction occupies attempt-1 and is asked even when Gate 1 is not_met -- the ordinary organic generator is never even called', async () => {
    const store = createInMemorySessionStore()
    let generatorCalled = false
    const generator = async () => {
      generatorCalled = true
      return null
    }
    // Deliberately NO tool mention and NO intended_use/workflow_role candidates --
    // only the copyright_ownership goal. Gate 1 therefore cannot be met
    // (NO_TOOL_OR_PRODUCTION_STEP_IDENTIFIED + INTENDED_USE_MISSING), reproducing
    // the exact pre-T1 blocking condition from the real live UAT.
    const d = deps(
      {
        extractor: constantExtractor([goalCandidate()]),
        decider: constantConstraintADecider(askDecision()),
        generator,
      },
      store,
    )
    const outcome = await runTurn({ token: 't9', turnNumber: 1, userText: 'Do I own the copyright to it?' }, d)

    const state = await loadState(store, 't9')
    // Verifies the precondition, not just asserts it: Gate 1 genuinely did not become met this turn.
    expect(state.structured_understanding.gate_1_state).toBe('not_met')

    expect(outcome.kind).toBe('question')
    if (outcome.kind === 'question') {
      expect(outcome.message).toBe(JURISDICTION_CLARIFICATION_QUESTION)
    }
    expect(outcome.jurisdictionSignal).toEqual({ eligible: true, outcome: 'asked' })
    expect(generatorCalled).toBe(false)
    expect(state.boundary_state.jurisdiction_clarification_asked).toBe(true)
  })
})

describe('jurisdiction clarification -- precedence over Commercial Readiness Discovery (PM SS6)', () => {
  test('when both jurisdiction and Discovery are eligible the same turn, jurisdiction wins the attempt-1 slot', async () => {
    const store = createInMemorySessionStore()
    // Phase 3 + client_involvement affirmative text makes Discovery eligible too.
    const d = eligibleDeps(
      {
        extractor: constantExtractor([
          toolCandidate(),
          intendedUseCandidate('made the video for a client'),
          workflowRoleCandidate('solo operator'),
          goalCandidate(),
        ]),
      },
      store,
    )
    const outcome = await runTurn({ token: 't7', turnNumber: 1, userText: 'x' }, d)
    expect(outcome.kind).toBe('question')
    if (outcome.kind === 'question') {
      expect(outcome.message).toBe(JURISDICTION_CLARIFICATION_QUESTION)
    }
    expect(outcome.jurisdictionSignal?.outcome).toBe('asked')
    // Discovery was eligible but preempted -- distinct from rejected_by_a.
    expect(outcome.discoverySignal?.outcome).toBe('preempted_by_jurisdiction')

    const state = await loadState(store, 't7')
    // Discovery's own cap must NOT be consumed merely because jurisdiction fired this turn.
    expect(state.boundary_state.commercial_readiness_discovery_asked).toBe(false)
    expect(state.boundary_state.jurisdiction_clarification_asked).toBe(true)
  })

  test('jurisdiction initial asked/capped -> the retry (still independently eligible) preempts Discovery for the SAME slot (Second-Jurisdiction UX milestone, 2026-08-20 -- supersedes the pre-J3 "Discovery is free the very next turn" behavior: the retry now sits between the initial question and Discovery in the precedence chain)', async () => {
    const store = createInMemorySessionStore()
    await runTurn({ token: 't8', turnNumber: 1, userText: 'x' }, eligibleDeps({}, store))
    expect((await loadState(store, 't8')).boundary_state.jurisdiction_clarification_asked).toBe(true)
    expect((await loadState(store, 't8')).boundary_state.commercial_readiness_discovery_asked).toBe(false)

    const d2 = eligibleDeps(
      {
        extractor: constantExtractor([intendedUseCandidate('made the video for a client'), workflowRoleCandidate('solo operator')]),
      },
      store,
    )
    const outcome2 = await runTurn({ token: 't8', turnNumber: 2, userText: 'more info' }, d2)
    expect(outcome2.kind).toBe('question')
    if (outcome2.kind === 'question') {
      expect(outcome2.message).toBe(JURISDICTION_CLARIFICATION_RETRY_QUESTION)
    }
    expect(outcome2.discoverySignal?.outcome).toBe('preempted_by_jurisdiction')
    expect((await loadState(store, 't8')).boundary_state.commercial_readiness_discovery_asked).toBe(false)
  })

  test('jurisdiction initial AND retry both capped -> Discovery is finally free to fire (independent caps, PM SS7)', async () => {
    const store = createInMemorySessionStore()
    await runTurn({ token: 't8b', turnNumber: 1, userText: 'x' }, eligibleDeps({}, store))
    await runTurn(
      { token: 't8b', turnNumber: 2, userText: 'more info' },
      eligibleDeps({ extractor: constantExtractor([{ proposal_id: 'p-obs2', turn: 2, raw_text: 'detail', kind: 'scoped_observation', scope: 'current_project', observation_confidence_hint: 'confirmed' }]) }, store),
    )
    expect((await loadState(store, 't8b')).boundary_state.jurisdiction_clarification_retry_asked).toBe(true)
    expect((await loadState(store, 't8b')).boundary_state.commercial_readiness_discovery_asked).toBe(false)

    const d3 = eligibleDeps(
      {
        extractor: constantExtractor([intendedUseCandidate('made the video for a client'), workflowRoleCandidate('solo operator')]),
      },
      store,
    )
    const outcome3 = await runTurn({ token: 't8b', turnNumber: 3, userText: 'even more info' }, d3)
    // both jurisdiction slots are capped now, so Discovery (still independently eligible) gets the slot.
    expect(outcome3.discoverySignal?.outcome).toBe('asked')
  })
})
