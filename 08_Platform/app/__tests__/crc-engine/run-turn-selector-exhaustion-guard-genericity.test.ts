/**
 * Selector Opportunity at questioning_exhausted milestone (2026-08-25) --
 * genericity proof. The dedicated last-resort attempt added to run-turn.ts
 * is `deriveSelectorNeeds(suAfter, deps.matrix, topicClaims, boundaryStateForTurn)`
 * -- literally the same function call the ordinary ask-path and the prior
 * completion-guard milestone already make, with zero fact/tool/category-
 * specific branching anywhere in it. Proven here at the same mocked-
 * selector-askability-registry boundary this session's sibling test files
 * already established (a synthetic tool_plan_tier entry, scoped to this
 * test file via jest.mock -- never touching the real production registry).
 */

import { runTurn, type RunTurnDeps } from '@/lib/crc-engine/run-turn'
import { createInMemorySessionStore } from '@/lib/crc-engine/in-memory-session-store'
import { constantExtractor } from '@/lib/interview-engine/mock-extractor'
import { constantCandidateQuestionGenerator } from '@/lib/interview-engine/mock-candidate-question'
import { getSelectorAskabilityEntry } from '@/lib/crc-engine/selector-askability'
import type { ConstraintADecider } from '@/lib/interview-engine/decision'
import type { CandidateObservation } from '@/lib/interview-engine/extraction'
import type { SessionStore } from '@/lib/crc-engine/session-store'
import type { TopicClaim } from '@/lib/retrieval-engine/types'

jest.mock('@/lib/crc-engine/selector-askability', () => ({
  getSelectorAskabilityEntry: jest.fn(),
}))

const mockedGetSelectorAskabilityEntry = getSelectorAskabilityEntry as jest.Mock

const FILLER_PROPOSAL = { question_text: '[ordinary filler]', question_kind: 'other' as const, target_signal_id: null, phase: 3 as const }

const selectorOnlyDecider: ConstraintADecider = async ({ candidate }) => ({
  should_ask: candidate.question_kind === 'governed_selector_clarification',
  reason_code: candidate.question_kind === 'governed_selector_clarification' ? 'MATERIALLY_IMPROVES_UNDERSTANDING' : 'NO_MATERIAL_IMPROVEMENT',
  rationale: 'x',
})

const rejectAllDecider: ConstraintADecider = async () => ({ should_ask: false, reason_code: 'NO_MATERIAL_IMPROVEMENT', rationale: 'x' })

const MATRIX_PLAN_TIER_GATED: RunTurnDeps['matrix'] = [
  {
    identifier: 'runway-gen3',
    last_verified: '2026-08-25',
    claims: [
      {
        claim_id: 'runway-plan-tier-gated-exhaustion-genericity-test',
        crc_eligible: 'Yes',
        crc_publication_scope: 'x',
        crc_candidate_statement: 'x',
        topic: 'commercial_use',
        applicability_requirements: [{ fact: 'tool_plan_tier', tool: 'runway-gen3', operator: 'equals', value: 'paid' }],
      },
    ],
  },
]

function deps(overrides: Partial<RunTurnDeps> = {}, store?: SessionStore): RunTurnDeps {
  return {
    extractor: constantExtractor([]),
    generator: constantCandidateQuestionGenerator(FILLER_PROPOSAL),
    decider: rejectAllDecider,
    sessionStore: store ?? createInMemorySessionStore(),
    matrix: MATRIX_PLAN_TIER_GATED,
    topicClaims: [] as TopicClaim[],
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

function goalCandidate(): CandidateObservation {
  return {
    proposal_id: 'p-goal',
    turn: 1,
    raw_text: 'Can I use this commercially?',
    kind: 'user_goal',
    goal_confidence_hint: 'confirmed',
    goal_category_hint: 'commercial_use',
    goal_scope_hint: 'informational',
  }
}

function foundationDeps(overrides: Partial<RunTurnDeps> = {}, store?: SessionStore): RunTurnDeps {
  return deps(
    {
      extractor: constantExtractor([toolCandidate(), intendedUseCandidate('a paid campaign for a client'), workflowRoleCandidate('solo operator'), goalCandidate()]),
      decider: async () => ({ should_ask: true, reason_code: 'MATERIALLY_IMPROVES_UNDERSTANDING', rationale: 'x' }),
      ...overrides,
    },
    store,
  )
}

beforeEach(() => {
  mockedGetSelectorAskabilityEntry.mockReset()
  mockedGetSelectorAskabilityEntry.mockImplementation((fact) => (fact === 'tool_plan_tier' ? { treatment: 'askable_in_crc', question_text: 'Which plan for {tool}?' } : undefined))
})

describe('N: genericity -- the dedicated exhaustion attempt reuses the mechanism identically for a synthetic, non-Kling governed fact', () => {
  test('a mocked tool_plan_tier registration on a Runway claim is rescued from exhaustion the same way the real tool_account_status entry is', async () => {
    const store = createInMemorySessionStore()
    await runTurn({ token: 't1', turnNumber: 1, userText: 'x' }, foundationDeps({}, store))

    const second = await runTurn({ token: 't1', turnNumber: 2, userText: 'x' }, deps({ decider: selectorOnlyDecider }, store))
    expect(second.kind).toBe('question')
    if (second.kind === 'question') {
      expect(second.message).toBe('Which plan for runway-gen3?')
    }

    const loaded = (await store.load('t1')) as { structured_understanding: { completion_reason: string | null }; boundary_state: { selector_needs_used: Record<string, number> } }
    expect(loaded.structured_understanding.completion_reason).toBeNull()
    expect(loaded.boundary_state.selector_needs_used['tool_plan_tier::runway-gen3']).toBe(1)
  })

  test('when the dedicated synthetic attempt is also rejected, exhaustion proceeds and its cap is never consumed', async () => {
    const store = createInMemorySessionStore()
    await runTurn({ token: 't1', turnNumber: 1, userText: 'x' }, foundationDeps({}, store))

    const second = await runTurn({ token: 't1', turnNumber: 2, userText: 'x' }, deps({ decider: rejectAllDecider }, store))
    expect(second.kind).toBe('complete')

    const loaded = (await store.load('t1')) as { structured_understanding: { completion_reason: string | null }; boundary_state: { selector_needs_used: Record<string, number> } }
    expect(loaded.structured_understanding.completion_reason).toBe('questioning_exhausted')
    expect(loaded.boundary_state.selector_needs_used['tool_plan_tier::runway-gen3']).toBeUndefined()
  })
})
