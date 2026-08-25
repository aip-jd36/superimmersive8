/**
 * Selector Opportunity Before Natural Completion milestone (2026-08-25) --
 * genericity proof. The completion guard added to run-turn.ts is
 * `completion.reason === 'declined' ? [] : deriveSelectorNeeds(...)` --
 * literally the same function call the ordinary ask-path already makes,
 * with zero fact/tool/category-specific branching anywhere in it. Proven
 * here at the same mocked-selector-askability-registry boundary
 * run-turn-governed-selector-questioning.test.ts already established for
 * exactly this purpose (a synthetic tool_plan_tier entry, scoped to this
 * test file via jest.mock -- never touching the real production registry,
 * per the explicit instruction not to add fake production registry
 * entries). Confirms the guard defers completion for a non-Kling,
 * non-commercial_use, non-tool_account_status governed fact identically to
 * how it defers for the real one in the sibling test file. Same turn-
 * sequencing technique as that sibling file: the confirmed goal arrives on
 * its own turn, invisible to Gate 2 (user_goals are not diffed), so that
 * turn reads as materially stable while being exactly the turn the
 * synthetic selector need first becomes eligible.
 */

import { runTurn, type RunTurnDeps } from '@/lib/crc-engine/run-turn'
import { createInMemorySessionStore } from '@/lib/crc-engine/in-memory-session-store'
import { constantExtractor } from '@/lib/interview-engine/mock-extractor'
import { constantCandidateQuestionGenerator } from '@/lib/interview-engine/mock-candidate-question'
import { constantConstraintADecider } from '@/lib/interview-engine/mock-decision'
import { getSelectorAskabilityEntry } from '@/lib/crc-engine/selector-askability'
import type { CandidateObservation } from '@/lib/interview-engine/extraction'
import type { SessionStore } from '@/lib/crc-engine/session-store'
import type { TopicClaim } from '@/lib/retrieval-engine/types'

jest.mock('@/lib/crc-engine/selector-askability', () => ({
  getSelectorAskabilityEntry: jest.fn(),
}))

const mockedGetSelectorAskabilityEntry = getSelectorAskabilityEntry as jest.Mock

const FILLER_PROPOSAL = { question_text: '[ordinary filler]', question_kind: 'other' as const, target_signal_id: null, phase: 3 as const }

const MATRIX_PLAN_TIER_GATED: RunTurnDeps['matrix'] = [
  {
    identifier: 'runway-gen3',
    last_verified: '2026-08-25',
    claims: [
      {
        claim_id: 'runway-plan-tier-gated-genericity-test',
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
    decider: constantConstraintADecider({ should_ask: true, reason_code: 'MATERIALLY_IMPROVES_UNDERSTANDING', rationale: 'x' }),
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
    turn: 2,
    raw_text: 'Can I use this commercially?',
    kind: 'user_goal',
    goal_confidence_hint: 'confirmed',
    goal_category_hint: 'commercial_use',
    goal_scope_hint: 'informational',
  }
}

function foundationTurnDeps(overrides: Partial<RunTurnDeps> = {}, store?: SessionStore): RunTurnDeps {
  return deps({ extractor: constantExtractor([toolCandidate(), intendedUseCandidate('a paid campaign'), workflowRoleCandidate('solo operator')]), ...overrides }, store)
}

beforeEach(() => {
  mockedGetSelectorAskabilityEntry.mockReset()
  mockedGetSelectorAskabilityEntry.mockImplementation((fact) => (fact === 'tool_plan_tier' ? { treatment: 'askable_in_crc', question_text: 'Which plan for {tool}?' } : undefined))
})

describe('G: genericity -- the completion guard defers for a synthetic, non-Kling, non-tool_account_status governed fact identically', () => {
  test('a mocked tool_plan_tier registration on a Runway claim defers completion the same way the real tool_account_status entry does', async () => {
    const store = createInMemorySessionStore()
    await runTurn({ token: 't1', turnNumber: 1, userText: 'x' }, foundationTurnDeps({}, store))
    const second = await runTurn({ token: 't1', turnNumber: 2, userText: 'x' }, deps({ extractor: constantExtractor([goalCandidate()]) }, store))
    expect(second.kind).toBe('question')
    if (second.kind === 'question') {
      expect(second.message).toBe('Which plan for runway-gen3?')
    }

    const loaded = (await store.load('t1')) as { boundary_state: { selector_needs_used: Record<string, number> } }
    expect(loaded.boundary_state.selector_needs_used['tool_plan_tier::runway-gen3']).toBe(1)
  })

  test('once consumed, the same synthetic selector no longer defers completion on a later stable turn', async () => {
    const store = createInMemorySessionStore()
    await runTurn({ token: 't1', turnNumber: 1, userText: 'x' }, foundationTurnDeps({}, store))
    const asked = await runTurn({ token: 't1', turnNumber: 2, userText: 'x' }, deps({ extractor: constantExtractor([goalCandidate()]) }, store))
    expect(asked.kind).toBe('question')

    const loadedAfterAsk = (await store.load('t1')) as { structured_understanding: { tool_mentions: { mention_id: string }[] } }
    const priorId = loadedAfterAsk.structured_understanding.tool_mentions[0].mention_id

    const ambiguous = toolCandidate({ proposal_id: 'p-2', turn: 3, raw_text: "I'm not sure which plan.", supersedes_tool_mention_id: priorId })
    await runTurn({ token: 't1', turnNumber: 3, userText: "I'm not sure which plan." }, deps({ extractor: constantExtractor([ambiguous]) }, store))

    const fourth = await runTurn({ token: 't1', turnNumber: 4, userText: 'x' }, deps({}, store))
    expect(fourth.kind).toBe('complete')
  })
})
