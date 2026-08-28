/**
 * CRC Global User-Facing Question Budget milestone (2026-08-26). Mock-stack
 * only (deterministic, sequenced mocks), same conventions as
 * run-turn-model4.test.ts and run-turn-commercial-readiness-discovery.test.ts.
 *
 * Covers the milestone's own required corpus: natural completion below
 * budget, the exact-six/never-seven boundary, rejected/failed attempts never
 * consuming budget, a real approved question always consuming exactly one
 * unit, Discovery's own cap co-existing with the global one, decline winning
 * regardless of budget state, and the questioning_exhausted vs
 * question_budget_exhausted distinction.
 */

import { runTurn, type RunTurnDeps } from '@/lib/crc-engine/run-turn'
import { createInMemorySessionStore } from '@/lib/crc-engine/in-memory-session-store'
import { constantExtractor } from '@/lib/interview-engine/mock-extractor'
import { constantCandidateQuestionGenerator } from '@/lib/interview-engine/mock-candidate-question'
import { constantConstraintADecider } from '@/lib/interview-engine/mock-decision'
import { sequencedGenerator, sequencedDecider } from '@/lib/interview-engine/eval/mock-sequenced'
import { createInitialBoundaryState, type BoundaryState } from '@/lib/interview-engine/boundaries'
import type { CandidateObservation } from '@/lib/interview-engine/extraction'
import type { CandidateQuestionProposal } from '@/lib/interview-engine/candidate-question'
import type { ConstraintADecision } from '@/lib/interview-engine/decision'
import type { SessionStore } from '@/lib/crc-engine/session-store'
import type { CRCSessionState } from '@/lib/crc-engine/types'
import type { StructuredUnderstanding } from '@/types/interview-engine'

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
function intendedUseCandidate(value: string): CandidateObservation {
  return { proposal_id: 'p-use', turn: 1, raw_text: value, kind: 'project_fact', raw_fact_field: 'intended_use', fact_confidence_hint: 'confirmed', fact_value_hint: value }
}
function workflowRoleCandidate(value: string): CandidateObservation {
  return { proposal_id: 'p-role', turn: 1, raw_text: value, kind: 'project_fact', raw_fact_field: 'workflow_role', fact_confidence_hint: 'confirmed', fact_value_hint: value }
}
function proposal(overrides: Partial<CandidateQuestionProposal> = {}): CandidateQuestionProposal {
  return { question_text: 'Ordinary question.', question_kind: 'other', target_signal_id: null, phase: 3, ...overrides }
}
function askDecision(overrides: Partial<ConstraintADecision> = {}): ConstraintADecision {
  return { should_ask: true, reason_code: 'MATERIALLY_IMPROVES_UNDERSTANDING', rationale: 'x', ...overrides }
}
function suppressDecision(overrides: Partial<ConstraintADecision> = {}): ConstraintADecision {
  return { should_ask: false, reason_code: 'NO_MATERIAL_IMPROVEMENT', rationale: 'x', ...overrides }
}
async function loadState(store: SessionStore, token: string): Promise<CRCSessionState> {
  return (await store.load(token)) as CRCSessionState
}

/** Single-turn setup reaching Gate 1 met + Phase 3 in one extraction call -- reused verbatim from run-turn-commercial-readiness-discovery.test.ts's own established pattern. */
function eligibleTurnDeps(indicatorText: string, overrides: Partial<RunTurnDeps> = {}, store?: SessionStore): RunTurnDeps {
  return deps(
    { extractor: constantExtractor([toolCandidate(), intendedUseCandidate(indicatorText), workflowRoleCandidate('solo operator')]), ...overrides },
    store,
  )
}

/** Full StructuredUnderstanding at Phase 3, Gate 1 met, Gate 2 NOT stable -- guarantees the turn reaches the organic candidate-precedence path (not natural completion) so this file's own budget-check placement is what's actually exercised. */
function suAtPhase3(): StructuredUnderstanding {
  return {
    project_facts: {
      intended_use: { attestation: { state: 'confirmed', value: 'a paid ad' }, source_turn: 1, source_statement: 'x' },
      workflow_role: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
      jurisdiction: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
      human_contribution_description: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
    },
    tool_mentions: [{ mention_id: 't1-c1', resolution: { kind: 'canonical', identifier: 'runway-gen3' }, access_surface: { state: 'unknown' }, plan_tier: { state: 'unknown' }, account_status: { state: 'unknown' }, confidence: 'confirmed', source_turn: 1, source_statement: 'Runway', superseded_by: null }],
    scoped_observations: [],
    user_goals: [],
    asset_provider_mentions: [],
    assessment_jurisdiction_mentions: [],
    content_presence_mentions: [],
    current_phase: 3,
    gate_1_state: 'met',
    gate_2_state: 'not_yet_stable',
    completion_reason: null,
    opt_out_scope: null,
  }
}

function boundaryStateWithBudget(used: number, overrides: Partial<BoundaryState> = {}): BoundaryState {
  return { ...createInitialBoundaryState(), user_facing_questions_asked: used, ...overrides }
}

async function seed(store: SessionStore, token: string, boundaryState: BoundaryState) {
  await store.save(token, {
    structured_understanding: suAtPhase3(),
    boundary_state: boundaryState,
    pending_clarification: null,
    pending_commercial_readiness_takeaway: null,
  })
}

describe('A: natural completion below budget is unaffected', () => {
  test('a naturally-completing turn (gate_1_gate_2_met) never reaches the budget check -- counter stays exactly what it already was', async () => {
    const store = createInMemorySessionStore()
    // A confirmed scoped_observation + already-confirmed intended_use/workflow_role
    // is enough for Gate 2 stability at Phase 3 (existing, unmodified gates.ts logic).
    await store.save('budget-natural', {
      structured_understanding: {
        ...suAtPhase3(),
        project_facts: { ...suAtPhase3().project_facts, workflow_role: { attestation: { state: 'confirmed', value: 'producer' }, source_turn: 1, source_statement: 'x' } },
        scoped_observations: [{ observation_id: 'so-1', scope: 'current_project', workflow_stage: 'T4', confidence: 'confirmed', status: 'completed', note: 'shipped', superseded_by: null, source_turn: 1, source_statement: 'x' }],
        gate_2_state: 'stable',
      },
      boundary_state: boundaryStateWithBudget(3),
      pending_clarification: null,
      pending_commercial_readiness_takeaway: null,
    })

    const throwingGenerator = async (): Promise<CandidateQuestionProposal | null> => {
      throw new Error('must not be called -- natural completion must win before the organic path is ever reached')
    }
    const outcome = await runTurn({ token: 'budget-natural', turnNumber: 2, userText: 'anything' }, deps({ generator: throwingGenerator }, store))

    expect(outcome.kind).toBe('complete')
    const loaded = await loadState(store, 'budget-natural')
    expect(loaded.structured_understanding.completion_reason).toBe('gate_1_gate_2_met')
    expect(loaded.boundary_state.user_facing_questions_asked).toBe(3)
  })
})

describe('B: exactly six', () => {
  test('five already used, one more valid question available -> question #6 is returned, counter becomes 6', async () => {
    const store = createInMemorySessionStore()
    await seed(store, 'budget-six', boundaryStateWithBudget(5))

    const q = proposal({ question_text: 'The sixth question.' })
    const outcome = await runTurn({ token: 'budget-six', turnNumber: 2, userText: 'x' }, deps({ generator: sequencedGenerator([q]), decider: sequencedDecider([askDecision()]) }, store))

    expect(outcome).toEqual({
      kind: 'question',
      message: 'The sixth question.',
      discoverySignal: { eligible_categories: [], selected_category: null, outcome: 'never_eligible' },
      selectorSignal: { eligible: false, outcome: 'never_eligible' },
    })
    const loaded = await loadState(store, 'budget-six')
    expect(loaded.boundary_state.user_facing_questions_asked).toBe(6)
  })
})

describe('C/I: never seven -- budget wins over any candidate source, including a forced/high-precedence one', () => {
  test('six already used -> attempt #1 never begins at all (generator/decider never called), completion_reason = question_budget_exhausted', async () => {
    const store = createInMemorySessionStore()
    await seed(store, 'budget-seven', boundaryStateWithBudget(6))

    const throwingGenerator = async (): Promise<CandidateQuestionProposal | null> => {
      throw new Error('ordinary generator must not be called -- the budget check must win before attempt #1 begins')
    }
    const throwingDecider = async (): Promise<ConstraintADecision> => {
      throw new Error('decider must not be called -- no candidate should ever reach Constraint A once the budget is exhausted')
    }
    const outcome = await runTurn({ token: 'budget-seven', turnNumber: 7, userText: 'x' }, deps({ generator: throwingGenerator, decider: throwingDecider }, store))

    expect(outcome.kind).toBe('complete')
    const loaded = await loadState(store, 'budget-seven')
    expect(loaded.structured_understanding.completion_reason).toBe('question_budget_exhausted')
    expect(loaded.boundary_state.user_facing_questions_asked).toBe(6)
  })
})

describe('D: rejected candidate never consumes budget', () => {
  test('both bounded attempts rejected by Constraint A -> questioning_exhausted, counter unchanged', async () => {
    const store = createInMemorySessionStore()
    await seed(store, 'budget-rejected', boundaryStateWithBudget(2))

    const a = proposal({ question_text: 'Rejected candidate A.' })
    const b = proposal({ question_text: 'Rejected candidate B.' })
    const outcome = await runTurn(
      { token: 'budget-rejected', turnNumber: 2, userText: 'x' },
      deps({ generator: sequencedGenerator([a, b]), decider: sequencedDecider([suppressDecision(), suppressDecision()]) }, store),
    )

    expect(outcome.kind).toBe('complete')
    const loaded = await loadState(store, 'budget-rejected')
    expect(loaded.structured_understanding.completion_reason).toBe('questioning_exhausted')
    expect(loaded.boundary_state.user_facing_questions_asked).toBe(2)
  })
})

describe('E: failed model/API turn never consumes budget', () => {
  test('extractor throws before any candidate work begins -> runTurn rejects, session never saved, budget untouched', async () => {
    const store = createInMemorySessionStore()
    await seed(store, 'budget-failed', boundaryStateWithBudget(4))

    const throwingExtractor = async (): Promise<CandidateObservation[]> => {
      throw new Error('simulated extractor failure')
    }
    await expect(runTurn({ token: 'budget-failed', turnNumber: 2, userText: 'x' }, deps({ extractor: throwingExtractor }, store))).rejects.toThrow('simulated extractor failure')

    const loaded = await loadState(store, 'budget-failed')
    expect(loaded.boundary_state.user_facing_questions_asked).toBe(4)
  })
})

describe('F: a real approved/persisted question increments exactly once', () => {
  test('single approved question -> counter goes from 0 to 1, never more', async () => {
    const store = createInMemorySessionStore()
    await seed(store, 'budget-one', boundaryStateWithBudget(0))

    const q = proposal({ question_text: 'First question.' })
    await runTurn({ token: 'budget-one', turnNumber: 2, userText: 'x' }, deps({ generator: sequencedGenerator([q]), decider: sequencedDecider([askDecision()]) }, store))

    const loaded = await loadState(store, 'budget-one')
    expect(loaded.boundary_state.user_facing_questions_asked).toBe(1)
  })
})

describe('G: acknowledgment (no question asked) never consumes budget', () => {
  test('generator returns null on both attempts -> outcome is questioning_exhausted (a complete outcome, not an acknowledgment carrying a question) -- counter still unchanged either way', async () => {
    const store = createInMemorySessionStore()
    await seed(store, 'budget-ack', boundaryStateWithBudget(1))

    const outcome = await runTurn({ token: 'budget-ack', turnNumber: 2, userText: 'x' }, deps({ generator: sequencedGenerator([null, null]) }, store))

    expect(outcome.kind).toBe('complete')
    const loaded = await loadState(store, 'budget-ack')
    expect(loaded.boundary_state.user_facing_questions_asked).toBe(1)
  })
})

describe('H: Discovery consumes exactly one global question; its own existing cap behaves normally alongside it', () => {
  test('an approved Discovery question increments the global counter by 1 AND sets commercial_readiness_discovery_asked -- both caps fire together, neither replaces the other', async () => {
    const store = createInMemorySessionStore()
    const throwingGenerator = async (): Promise<CandidateQuestionProposal | null> => {
      throw new Error('ordinary generator must not be called -- Discovery should win attempt 1')
    }
    const outcome = await runTurn(
      { token: 'budget-discovery', turnNumber: 1, userText: 'x' },
      eligibleTurnDeps('made the video for a client', { generator: throwingGenerator, decider: sequencedDecider([askDecision()]) }, store),
    )

    expect(outcome.kind).toBe('question')
    const loaded = await loadState(store, 'budget-discovery')
    expect(loaded.boundary_state.commercial_readiness_discovery_asked).toBe(true)
    expect(loaded.boundary_state.user_facing_questions_asked).toBe(1)
  })
})

describe('L: decline wins regardless of budget state', () => {
  test('interview-scope decline at the ceiling -> completion_reason is declined, not question_budget_exhausted; budget never consulted', async () => {
    const store = createInMemorySessionStore()
    await seed(store, 'budget-decline', boundaryStateWithBudget(6))

    const throwingGenerator = async (): Promise<CandidateQuestionProposal | null> => {
      throw new Error('must not be called -- decline must short-circuit before the budget check is ever reached')
    }
    const outcome = await runTurn(
      { token: 'budget-decline', turnNumber: 7, userText: 'stop', declineAction: 'stop_interview' },
      deps({ generator: throwingGenerator }, store),
    )

    expect(outcome.kind).toBe('complete')
    const loaded = await loadState(store, 'budget-decline')
    expect(loaded.structured_understanding.completion_reason).toBe('declined')
    expect(loaded.boundary_state.user_facing_questions_asked).toBe(6)
  })
})

describe('M: questioning_exhausted vs question_budget_exhausted are produced in the right, distinct circumstances', () => {
  test('budget available, but genuinely no eligible/approved candidate remains -> questioning_exhausted', async () => {
    const store = createInMemorySessionStore()
    await seed(store, 'budget-vs-exhausted-1', boundaryStateWithBudget(1))
    const outcome = await runTurn({ token: 'budget-vs-exhausted-1', turnNumber: 2, userText: 'x' }, deps({ generator: sequencedGenerator([null, null]) }, store))
    expect(outcome.kind).toBe('complete')
    const loaded = await loadState(store, 'budget-vs-exhausted-1')
    expect(loaded.structured_understanding.completion_reason).toBe('questioning_exhausted')
  })

  test('budget at the ceiling, WOULD-BE-APPROVED candidate available -> question_budget_exhausted, never questioning_exhausted (proven by the candidate never even being generated)', async () => {
    const store = createInMemorySessionStore()
    await seed(store, 'budget-vs-exhausted-2', boundaryStateWithBudget(6))
    const throwingGenerator = async (): Promise<CandidateQuestionProposal | null> => {
      throw new Error('must not be called -- if this fired, the resulting completion_reason would be questioning_exhausted instead of question_budget_exhausted, which is exactly the distinction this test proves')
    }
    const outcome = await runTurn({ token: 'budget-vs-exhausted-2', turnNumber: 7, userText: 'x' }, deps({ generator: throwingGenerator }, store))
    expect(outcome.kind).toBe('complete')
    const loaded = await loadState(store, 'budget-vs-exhausted-2')
    expect(loaded.structured_understanding.completion_reason).toBe('question_budget_exhausted')
  })
})
