/**
 * Track B — Generic Living-Knowledge Readiness/Askability milestone
 * (2026-08-20). Integration tests for the run-turn.ts exhaustion-
 * interception wiring: the readiness check must fire ONLY as the
 * last-resort attempt #3, right where bounded search (attempt1+attempt2)
 * would otherwise declare `questioning_exhausted`, and must never fire
 * when no readiness need exists.
 *
 * Mocks dependency-askability.ts (standard jest.mock() of a pure,
 * synchronous, non-LLM data module -- same precedent as
 * knowledge-readiness.test.ts and this project's own
 * supabase-session-store.test.ts/results-email-delivery.test.ts) to
 * register a synthetic, test-only askable dependency -- no real governed
 * dependency is registered askable via the generic path yet (see
 * dependency-askability.ts's own header for why).
 */

import { runTurn, type RunTurnDeps } from '@/lib/crc-engine/run-turn'
import { createInMemorySessionStore } from '@/lib/crc-engine/in-memory-session-store'
import { constantExtractor } from '@/lib/interview-engine/mock-extractor'
import { constantCandidateQuestionGenerator } from '@/lib/interview-engine/mock-candidate-question'
import { constantConstraintADecider } from '@/lib/interview-engine/mock-decision'
import type { SessionStore } from '@/lib/crc-engine/session-store'
import type { CRCSessionState } from '@/lib/crc-engine/types'
import type { TopicClaim } from '@/lib/retrieval-engine/types'
import { getAskabilityEntry } from '@/lib/crc-engine/dependency-askability'

jest.mock('@/lib/crc-engine/dependency-askability', () => ({
  getAskabilityEntry: jest.fn(),
}))

const mockedGetAskabilityEntry = getAskabilityEntry as jest.Mock

const ASKABLE_ENTRY = {
  treatment: 'askable_in_crc' as const,
  generic_acquisition: {
    target: { kind: 'asset_provider_field' as const, field: 'license' as const },
    question_text: 'What license covers that provider material?',
    max_attempts: 1,
  },
}

const STOCK_CLAIM: TopicClaim = {
  claim_id: 'CLAIM-TEST-001',
  topic: 'third_party_source_rights',
  claim_character: 'established',
  jurisdiction: 'Global',
  lifecycle: 'Adopted',
  crc_eligible: 'Yes',
  crc_publication_scope: null,
  crc_candidate_statement: null,
  applicability_requirements: [],
  unresolved_project_dependencies: ['test_provider_license_confirmed'],
  provider_scope: ['istock'],
  last_verified: null,
  superseded_by: null,
}

const MATRIX = [{ identifier: 'kling', last_verified: '2026-08-05', claims: [{ claim_id: 'kling', crc_eligible: 'Yes' as const, crc_publication_scope: 'x', crc_candidate_statement: 'Kling statement.', applicability_requirements: [] }] }]

function deps(overrides: Partial<RunTurnDeps> = {}, store?: SessionStore): RunTurnDeps {
  return {
    extractor: constantExtractor([]),
    generator: constantCandidateQuestionGenerator(null),
    decider: constantConstraintADecider({ should_ask: true, reason_code: 'MATERIALLY_IMPROVES_UNDERSTANDING', rationale: 'x' }),
    sessionStore: store ?? createInMemorySessionStore(),
    matrix: MATRIX,
    topicClaims: [STOCK_CLAIM],
    ...overrides,
  }
}

async function seedRelevantSession(store: SessionStore, token: string) {
  await store.save(token, {
    structured_understanding: {
      project_facts: {
        intended_use: { attestation: { state: 'confirmed', value: 'an ad' }, source_turn: 1, source_statement: 'x' },
        workflow_role: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
        jurisdiction: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
        human_contribution_description: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
      },
      tool_mentions: [],
      scoped_observations: [],
      user_goals: [{ goal_id: 'g-1', state: 'confirmed', raw_text: 'Can I use this iStock image?', category: 'third_party_source_rights', scope: 'informational', superseded_by: null, source_turn: 1, source_statement: 'x' }],
      asset_provider_mentions: [
        { mention_id: 'ap-1', resolution: { kind: 'canonical', identifier: 'istock' }, confidence: 'confirmed', source_turn: 1, source_statement: 'iStock', superseded_by: null, usage: { state: 'confirmed', value: 'direct_generation_input' }, license: { state: 'unknown' } },
      ],
      current_phase: 3,
      gate_1_state: 'met',
      gate_2_state: 'not_yet_stable',
      completion_reason: null,
      opt_out_scope: null,
    },
    boundary_state: {
      follow_ups_used: {},
      uncertainty_clarifications_used: {},
      historical_experience_asked: false,
      disentangling_question_asked: false,
      commercial_readiness_discovery_asked: false,
      jurisdiction_clarification_asked: false,
      human_contribution_clarification_asked: false,
      jurisdiction_clarification_retry_asked: false,
      jurisdiction_clarification_pending_answer: false,
      knowledge_readiness_used: {},
      interview_ended: false,
      phases_ended: [],
    },
    pending_clarification: null,
    pending_commercial_readiness_takeaway: null,
  })
}

beforeEach(() => {
  mockedGetAskabilityEntry.mockReset()
})

describe('run-turn.ts knowledge readiness exhaustion interception', () => {
  test('J: bounded search (attempt1+attempt2) both null -> readiness need exists and is askable -> question asked instead of questioning_exhausted', async () => {
    mockedGetAskabilityEntry.mockImplementation((id: string) => (id === 'test_provider_license_confirmed' ? ASKABLE_ENTRY : undefined))
    const store = createInMemorySessionStore()
    await seedRelevantSession(store, 'rt-readiness-1')

    const outcome = await runTurn({ token: 'rt-readiness-1', turnNumber: 2, userText: 'anything' }, deps({}, store))

    expect(outcome.kind).toBe('question')
    expect((outcome as { message: string }).message).toBe('What license covers that provider material?')
    const loaded = (await store.load('rt-readiness-1')) as CRCSessionState
    expect(loaded.structured_understanding.completion_reason).toBeNull()
    expect(loaded.boundary_state.knowledge_readiness_used['ap-1::test_provider_license_confirmed']).toBe(1)
  })

  test('K: readiness question rejected by Constraint A -> normal exhaustion (questioning_exhausted) proceeds, exactly as before this milestone', async () => {
    mockedGetAskabilityEntry.mockImplementation((id: string) => (id === 'test_provider_license_confirmed' ? ASKABLE_ENTRY : undefined))
    const store = createInMemorySessionStore()
    await seedRelevantSession(store, 'rt-readiness-2')

    const outcome = await runTurn(
      { token: 'rt-readiness-2', turnNumber: 2, userText: 'anything' },
      deps({ decider: constantConstraintADecider({ should_ask: false, reason_code: 'NO_MATERIAL_IMPROVEMENT', rationale: 'x' }) }, store),
    )

    expect(outcome.kind).toBe('complete')
    const loaded = (await store.load('rt-readiness-2')) as CRCSessionState
    expect(loaded.structured_understanding.completion_reason).toBe('questioning_exhausted')
  })

  test('no readiness need exists at all (no matching goal/claim) -> unaffected, questioning_exhausted fires exactly as before this milestone', async () => {
    mockedGetAskabilityEntry.mockReturnValue(undefined)
    const store = createInMemorySessionStore()
    // Fresh session, turn 1, minimal extraction -- no third_party_source_rights
    // goal, no provider mention, no readiness need possible.
    const outcome = await runTurn(
      { token: 'rt-readiness-none', turnNumber: 1, userText: 'We used Kling.' },
      deps({ extractor: constantExtractor([{ proposal_id: 'p1', turn: 1, raw_text: 'We used Kling.', kind: 'tool_mention', raw_tool_name: 'Kling' }]), topicClaims: [STOCK_CLAIM] }, store),
    )
    expect(outcome.kind).toBe('complete')
    const loaded = (await store.load('rt-readiness-none')) as CRCSessionState
    expect(loaded.structured_understanding.completion_reason).toBe('questioning_exhausted')
    expect(loaded.boundary_state.knowledge_readiness_used).toEqual({})
  })

  test('J follow-up: after the license is answered and confirmed, the readiness need disappears -- no second identical question, normal exhaustion proceeds', async () => {
    mockedGetAskabilityEntry.mockImplementation((id: string) => (id === 'test_provider_license_confirmed' ? ASKABLE_ENTRY : undefined))
    const store = createInMemorySessionStore()
    await seedRelevantSession(store, 'rt-readiness-3')

    // Turn 2: readiness question asked (as in test J above).
    const turn2 = await runTurn({ token: 'rt-readiness-3', turnNumber: 2, userText: 'anything' }, deps({}, store))
    expect(turn2.kind).toBe('question')

    // Turn 3: the user answers, extraction confirms the license on the
    // provider mention -- the readiness need is now satisfied.
    const turn3 = await runTurn(
      { token: 'rt-readiness-3', turnNumber: 3, userText: 'I have the standard iStock license.' },
      deps(
        {
          extractor: constantExtractor([
            { proposal_id: 'p1', turn: 3, raw_text: 'I have the standard iStock license.', kind: 'asset_provider_mention', raw_provider_name: 'iStock', license_confidence_hint: 'confirmed', license_value_hint: 'standard license' },
          ]),
        },
        store,
      ),
    )
    expect(turn3.kind).toBe('complete')
    const loaded = (await store.load('rt-readiness-3')) as CRCSessionState
    expect(loaded.structured_understanding.completion_reason).toBe('questioning_exhausted')
    const active = loaded.structured_understanding.asset_provider_mentions.filter((m) => m.superseded_by === null)
    expect(active[0].license).toEqual({ state: 'confirmed', value: 'standard license' })
  })
})
