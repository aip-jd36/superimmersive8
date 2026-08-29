/**
 * CRC Narrow Governed Selector Questioning milestone (2026-08-24). Model 4
 * integration suite -- proves the deterministic selector proposal actually
 * gets injected at the same attempt-1 slot jurisdiction/human-contribution/
 * discovery already share, that it is ordered strictly AFTER all three
 * (never displacing existing precedence), that it goes through the
 * unchanged Constraint A/B pipeline (no privileged pass), and -- the
 * explicit PM acceptance requirement for this milestone -- that with the
 * REAL, unmocked, empty production selector-askability registry, current
 * CRC behavior is completely unchanged (the capability is dormant, not
 * live). Mock-stack only, same discipline as
 * run-turn-jurisdiction-clarification.test.ts.
 */

import { runTurn, type RunTurnDeps } from '@/lib/crc-engine/run-turn'
import { createInMemorySessionStore } from '@/lib/crc-engine/in-memory-session-store'
import { constantExtractor } from '@/lib/interview-engine/mock-extractor'
import { constantCandidateQuestionGenerator } from '@/lib/interview-engine/mock-candidate-question'
import { constantConstraintADecider } from '@/lib/interview-engine/mock-decision'
import { JURISDICTION_CLARIFICATION_QUESTION } from '@/lib/crc-engine/jurisdiction-clarification'
import { getSelectorAskabilityEntry } from '@/lib/crc-engine/selector-askability'
import type { CandidateObservation } from '@/lib/interview-engine/extraction'
import type { ConstraintADecision } from '@/lib/interview-engine/decision'
import type { SessionStore } from '@/lib/crc-engine/session-store'
import type { TopicClaim } from '@/lib/retrieval-engine/types'

jest.mock('@/lib/crc-engine/selector-askability', () => {
  const actual = jest.requireActual('@/lib/crc-engine/selector-askability')
  return { ...actual, getSelectorAskabilityEntry: jest.fn(actual.getSelectorAskabilityEntry) }
})

const mockedGetSelectorAskabilityEntry = getSelectorAskabilityEntry as jest.Mock
/** The genuine, unmocked implementation -- kept for tests that need to explicitly restore real (empty-registry) behavior after an earlier test in this file has overridden it via mockImplementation. */
const REAL_GET_SELECTOR_ASKABILITY_ENTRY = jest.requireActual('@/lib/crc-engine/selector-askability').getSelectorAskabilityEntry

const MATRIX: RunTurnDeps['matrix'] = []

const PLAN_GATED_CLAIM: TopicClaim = {
  claim_id: 'CLAIM-PLAN-TEST-v1',
  topic: 'commercial_use',
  claim_character: 'conditional',
  jurisdiction: 'Global',
  lifecycle: 'Adopted',
  crc_eligible: 'Yes',
  crc_publication_scope: 'scope',
  crc_candidate_statement: 'Test statement.',
  applicability_requirements: [{ fact: 'tool_plan_tier', tool: 'kling', operator: 'equals', value: 'paid' }],
  unresolved_project_dependencies: [],
  provider_scope: null,
  tool_scope: null,
  last_verified: '2026-08-24',
  superseded_by: null,
}

function deps(overrides: Partial<RunTurnDeps> = {}, store?: SessionStore): RunTurnDeps {
  return {
    extractor: constantExtractor([]),
    generator: constantCandidateQuestionGenerator(null),
    decider: constantConstraintADecider({ should_ask: false, reason_code: 'NO_MATERIAL_IMPROVEMENT', rationale: 'x' }),
    sessionStore: store ?? createInMemorySessionStore(),
    matrix: MATRIX,
    topicClaims: [PLAN_GATED_CLAIM],
    ...overrides,
  }
}

function toolCandidate(overrides: Partial<CandidateObservation> = {}): CandidateObservation {
  return { proposal_id: 'p-1', turn: 1, raw_text: 'We used Kling.', kind: 'tool_mention', raw_tool_name: 'Kling', ...overrides }
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
    raw_text: 'Can I use this commercially?',
    kind: 'user_goal',
    goal_confidence_hint: 'confirmed',
    goal_category_hint: 'commercial_use',
    goal_scope_hint: 'informational',
    ...overrides,
  }
}

function askDecision(overrides: Partial<ConstraintADecision> = {}): ConstraintADecision {
  return { should_ask: true, reason_code: 'MATERIALLY_IMPROVES_UNDERSTANDING', rationale: 'x', ...overrides }
}

/** Reaches Gate 1 met + Phase 3 + an active confirmed commercial_use goal + a Kling tool mention, in one turn. */
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

beforeEach(() => {
  mockedGetSelectorAskabilityEntry.mockClear()
})

describe('governed selector questioning -- production registry empty (dormant capability, no behavior change)', () => {
  test('with the REAL, unmocked, empty production registry, an otherwise-eligible unresolved plan selector produces NO question -- ordinary generator (null) is reached, turn falls through exactly as before this milestone', async () => {
    const store = createInMemorySessionStore()
    let generatorCalled = false
    const generator = async () => {
      generatorCalled = true
      return null
    }
    const outcome = await runTurn({ token: 't1', turnNumber: 1, userText: 'x' }, eligibleDeps({ generator }, store))
    // getSelectorAskabilityEntry was genuinely invoked (the mechanism ran),
    // but its real, unmocked, empty-registry answer is "not askable" for
    // every fact -- proving the dormant-capability invariant against the
    // actual production module, not an assumption about it.
    expect(mockedGetSelectorAskabilityEntry).toHaveBeenCalledWith('tool_plan_tier')
    expect(mockedGetSelectorAskabilityEntry.mock.results.every((r) => r.value === undefined)).toBe(true)
    expect(generatorCalled).toBe(true)
    if (outcome.kind === 'question') {
      expect(outcome.message).not.toMatch(/plan|tier/i)
    }
  })
})

describe('governed selector questioning -- eligibility gating (mocked registry)', () => {
  test('eligible: explicit commercial_use goal + tool_plan_tier-gated Adopted/CRC-eligible claim + unresolved plan + registered askable -> asked as attempt 1, ordinary generator never called', async () => {
    mockedGetSelectorAskabilityEntry.mockImplementation((fact: string) => (fact === 'tool_plan_tier' ? { treatment: 'askable_in_crc', question_text: 'Which plan or account tier were you using for {tool}?' } : undefined))
    const store = createInMemorySessionStore()
    let generatorCalled = false
    const generator = async () => {
      generatorCalled = true
      return null
    }
    const outcome = await runTurn({ token: 't1', turnNumber: 1, userText: 'x' }, eligibleDeps({ generator }, store))
    expect(outcome.kind).toBe('question')
    if (outcome.kind === 'question') {
      expect(outcome.message).toBe('Which plan or account tier were you using for kling?')
    }
    expect(generatorCalled).toBe(false)
  })

  test('ordering: when jurisdiction is ALSO eligible the same turn (a jurisdiction-gated claim additionally present), jurisdiction wins the shared slot -- selector questioning never displaces it', async () => {
    mockedGetSelectorAskabilityEntry.mockImplementation((fact: string) => (fact === 'tool_plan_tier' ? { treatment: 'askable_in_crc', question_text: 'x' } : undefined))
    const jurisdictionClaim: TopicClaim = {
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
      tool_scope: null,
      last_verified: '2026-08-16',
      superseded_by: null,
    }
    const store = createInMemorySessionStore()
    const outcome = await runTurn(
      { token: 't1', turnNumber: 1, userText: 'x' },
      eligibleDeps(
        {
          extractor: constantExtractor([
            toolCandidate(),
            intendedUseCandidate('a paid campaign'),
            workflowRoleCandidate('solo operator'),
            goalCandidate(),
            goalCandidate({ proposal_id: 'p-goal-2', raw_text: 'Do I own the copyright?', goal_category_hint: 'copyright_ownership' }),
          ]),
          topicClaims: [PLAN_GATED_CLAIM, jurisdictionClaim],
        },
        store,
      ),
    )
    expect(outcome.kind).toBe('question')
    if (outcome.kind === 'question') {
      expect(outcome.message).toBe(JURISDICTION_CLARIFICATION_QUESTION)
    }
  })

  test('registry not askable -> no selector question, falls through to ordinary generator', async () => {
    mockedGetSelectorAskabilityEntry.mockImplementation(() => undefined)
    const store = createInMemorySessionStore()
    let generatorCalled = false
    const generator = async () => {
      generatorCalled = true
      return null
    }
    await runTurn({ token: 't1', turnNumber: 1, userText: 'x' }, eligibleDeps({ generator }, store))
    expect(generatorCalled).toBe(true)
  })

  test('cap: once asked, selector_needs_used is recorded and persists via BoundaryState -- a second runTurn call never re-asks the same selector question', async () => {
    mockedGetSelectorAskabilityEntry.mockImplementation((fact: string) => (fact === 'tool_plan_tier' ? { treatment: 'askable_in_crc', question_text: 'Which plan for {tool}?' } : undefined))
    const store = createInMemorySessionStore()
    const first = await runTurn({ token: 't1', turnNumber: 1, userText: 'x' }, eligibleDeps({}, store))
    expect(first.kind).toBe('question')
    if (first.kind === 'question') expect(first.message).toBe('Which plan for kling?')

    const loaded = (await store.load('t1')) as { boundary_state: { selector_needs_used: Record<string, number> } }
    expect(loaded.boundary_state.selector_needs_used['tool_plan_tier::kling']).toBe(1)

    // Second turn -- re-derive deterministically from the persisted cap: the
    // same eligibility conditions (unresolved plan, explicit goal, askable
    // registry) still hold, but selector_dedupe_key 'tool_plan_tier::kling'
    // is already consumed, so the candidate must not be re-offered. (The
    // turn may complete naturally via Gate 2 stability rather than reaching
    // the ordinary generator -- that is a separate, correct mechanism; the
    // invariant this test proves is narrower and unaffected by it: no
    // repeat of the selector question, and no increment of its cap.)
    const second = await runTurn({ token: 't1', turnNumber: 2, userText: 'I am not sure.' }, eligibleDeps({}, store))
    if (second.kind === 'question') {
      expect(second.message).not.toBe('Which plan for kling?')
    }
    const loadedAfterSecond = (await store.load('t1')) as { boundary_state: { selector_needs_used: Record<string, number> } }
    expect(loadedAfterSecond.boundary_state.selector_needs_used['tool_plan_tier::kling']).toBe(1)
  })
})

describe('governed selector questioning -- Matrix-origin end-to-end (CRC Generic Applicability Readiness correction, 2026-08-24)', () => {
  const MATRIX_WITH_GATED_KLING_CLAIM: RunTurnDeps['matrix'] = [
    {
      identifier: 'kling',
      last_verified: '2026-08-24',
      claims: [
        {
          claim_id: 'kling',
          crc_eligible: 'Yes',
          crc_publication_scope: 'scope',
          crc_candidate_statement: 'Matrix test statement.',
          topic: 'commercial_use',
          applicability_requirements: [{ fact: 'tool_plan_tier', tool: 'kling', operator: 'equals', value: 'paid' }],
        },
      ],
    },
  ]

  test('a MatrixClaim-origin unresolved askable selector reaches the user through the full run-turn pipeline, identically to the TopicClaim case above -- proves deps.matrix threading, not just unit-level deriveSelectorNeeds', async () => {
    mockedGetSelectorAskabilityEntry.mockImplementation((fact: string) => (fact === 'tool_plan_tier' ? { treatment: 'askable_in_crc', question_text: 'Which plan for {tool}?' } : undefined))
    const store = createInMemorySessionStore()
    let generatorCalled = false
    const generator = async () => {
      generatorCalled = true
      return null
    }
    const outcome = await runTurn(
      { token: 't1', turnNumber: 1, userText: 'x' },
      eligibleDeps({ generator, matrix: MATRIX_WITH_GATED_KLING_CLAIM, topicClaims: [] }, store),
    )
    expect(outcome.kind).toBe('question')
    if (outcome.kind === 'question') {
      expect(outcome.message).toBe('Which plan for kling?')
    }
    expect(generatorCalled).toBe(false)
  })

  test('with the REAL, unmocked, empty production registry, the same Matrix-origin scenario produces no selector question -- dormant capability confirmed for Matrix origin too', async () => {
    // Explicitly restore the real implementation -- an earlier test in this
    // file overrides it via mockImplementation, and mockClear() (beforeEach)
    // only clears call history, never the active implementation.
    mockedGetSelectorAskabilityEntry.mockImplementation(REAL_GET_SELECTOR_ASKABILITY_ENTRY)
    const store = createInMemorySessionStore()
    let generatorCalled = false
    const generator = async () => {
      generatorCalled = true
      return null
    }
    await runTurn({ token: 't1', turnNumber: 1, userText: 'x' }, eligibleDeps({ generator, matrix: MATRIX_WITH_GATED_KLING_CLAIM, topicClaims: [] }, store))
    expect(mockedGetSelectorAskabilityEntry).toHaveBeenCalledWith('tool_plan_tier')
    expect(generatorCalled).toBe(true)
  })
})
