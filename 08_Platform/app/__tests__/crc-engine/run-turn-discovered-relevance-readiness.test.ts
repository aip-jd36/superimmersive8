/**
 * Track A — Generic Discovered Relevance milestone (2026-08-21). Proves
 * Track B interoperability (Section 15/27 of the task spec): a topic
 * discovered from structured evidence (no explicit UserGoal) feeds the
 * SAME already-relevant claim universe Track B's readiness mechanism
 * already inspects -- with no special-cased iStock logic anywhere, and
 * with the real (unmocked) askability registry proving that no real
 * stock readiness question fires yet, since no real stock dependency is
 * registered askable_in_crc (Section 35 -- deliberately not added by this
 * milestone).
 */

import { runTurn, type RunTurnDeps } from '@/lib/crc-engine/run-turn'
import { createInMemorySessionStore } from '@/lib/crc-engine/in-memory-session-store'
import { constantExtractor } from '@/lib/interview-engine/mock-extractor'
import { constantCandidateQuestionGenerator } from '@/lib/interview-engine/mock-candidate-question'
import { constantConstraintADecider } from '@/lib/interview-engine/mock-decision'
import { deriveKnowledgeReadinessNeeds } from '@/lib/crc-engine/knowledge-readiness'
import { deriveDiscoveredTopicOccurrences, discoveredTopicCategories } from '@/lib/crc-engine/discovered-relevance'
import { TOPIC_CLAIMS_FIXTURE } from '@/lib/retrieval-engine/topic-claims-fixture'
import type { SessionStore } from '@/lib/crc-engine/session-store'
import type { CRCSessionState } from '@/lib/crc-engine/types'
import type { StructuredUnderstanding } from '@/types/interview-engine'
import { getAskabilityEntry } from '@/lib/crc-engine/dependency-askability'

jest.mock('@/lib/crc-engine/dependency-askability', () => ({
  getAskabilityEntry: jest.fn(),
}))

const mockedGetAskabilityEntry = getAskabilityEntry as jest.Mock

const MATRIX = [{ identifier: 'kling', last_verified: '2026-08-05', claims: [{ claim_id: 'kling', crc_eligible: 'Yes' as const, crc_publication_scope: 'x', crc_candidate_statement: 'Kling statement.', applicability_requirements: [] }] }]

function deps(overrides: Partial<RunTurnDeps> = {}, store?: SessionStore): RunTurnDeps {
  return {
    extractor: constantExtractor([]),
    generator: constantCandidateQuestionGenerator(null),
    decider: constantConstraintADecider({ should_ask: true, reason_code: 'MATERIALLY_IMPROVES_UNDERSTANDING', rationale: 'x' }),
    sessionStore: store ?? createInMemorySessionStore(),
    matrix: MATRIX,
    topicClaims: TOPIC_CLAIMS_FIXTURE,
    ...overrides,
  }
}

function discoveredOnlySU(overrides: Partial<StructuredUnderstanding> = {}): StructuredUnderstanding {
  return {
    project_facts: {
      intended_use: { attestation: { state: 'confirmed', value: 'an ad' }, source_turn: 1, source_statement: 'x' },
      workflow_role: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
      jurisdiction: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
      human_contribution_description: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
    },
    tool_mentions: [],
    scoped_observations: [],
    // Deliberately ONLY commercial_use -- no explicit third_party_source_rights
    // goal, matching the exact real production case.
    user_goals: [{ goal_id: 'g-1', state: 'confirmed', raw_text: 'Can I use that commercially?', category: 'commercial_use', scope: 'informational', superseded_by: null, source_turn: 1, source_statement: 'x' }],
    asset_provider_mentions: [
      { mention_id: 'ap-1', resolution: { kind: 'canonical', identifier: 'istock' }, confidence: 'confirmed', source_turn: 1, source_statement: 'iStock', superseded_by: null, usage: { state: 'confirmed', value: 'direct_generation_input' }, license: { state: 'unknown' } },
    ],
    current_phase: 3,
    gate_1_state: 'met',
    gate_2_state: 'not_yet_stable',
    completion_reason: null,
    opt_out_scope: null,
    ...overrides,
  }
}

describe('V: Track B readiness sees discovered-topic eligibility (unit level)', () => {
  test('deriveKnowledgeReadinessNeeds with discoveredTopics sees the iStock claim as already-relevant, exactly as it would for an explicit goal', () => {
    mockedGetAskabilityEntry.mockImplementation((id: string) =>
      id === 'test_provider_license_confirmed' ? { treatment: 'askable_in_crc', generic_acquisition: { target: { kind: 'asset_provider_field', field: 'license' }, question_text: 'What license?', max_attempts: 1 } } : undefined,
    )
    const su = discoveredOnlySU()
    const syntheticClaim = { ...TOPIC_CLAIMS_FIXTURE[0], claim_id: 'CLAIM-TEST-DISCOVERED', topic: 'third_party_source_rights' as const, provider_scope: ['istock'] as ('istock' | 'getty' | 'shutterstock' | 'adobe-stock')[], unresolved_project_dependencies: ['test_provider_license_confirmed'], lifecycle: 'Adopted' as const, crc_eligible: 'Yes' as const, superseded_by: null, applicability_requirements: [] }

    // Without discoveredTopics: Track B cannot see the claim (no explicit goal).
    const withoutDiscovery = deriveKnowledgeReadinessNeeds(su, [syntheticClaim], { follow_ups_used: {}, uncertainty_clarifications_used: {}, historical_experience_asked: false, disentangling_question_asked: false, commercial_readiness_discovery_asked: false, jurisdiction_clarification_asked: false, human_contribution_clarification_asked: false, jurisdiction_clarification_retry_asked: false, jurisdiction_clarification_pending_answer: false, knowledge_readiness_used: {}, interview_ended: false, phases_ended: [] })
    expect(withoutDiscovery).toHaveLength(0)

    // With discoveredTopics: Track B now sees it.
    const discoveredTopics = discoveredTopicCategories(deriveDiscoveredTopicOccurrences(su, [syntheticClaim]))
    const withDiscovery = deriveKnowledgeReadinessNeeds(su, [syntheticClaim], { follow_ups_used: {}, uncertainty_clarifications_used: {}, historical_experience_asked: false, disentangling_question_asked: false, commercial_readiness_discovery_asked: false, jurisdiction_clarification_asked: false, human_contribution_clarification_asked: false, jurisdiction_clarification_retry_asked: false, jurisdiction_clarification_pending_answer: false, knowledge_readiness_used: {}, interview_ended: false, phases_ended: [] }, discoveredTopics)
    expect(withDiscovery).toHaveLength(1)
    expect(withDiscovery[0].provider_mention_id).toBe('ap-1')
  })
})

describe('run-turn.ts end-to-end: discovered relevance feeds Track B without any real readiness question firing', () => {
  beforeEach(() => {
    mockedGetAskabilityEntry.mockReset()
  })

  test('W: with the real registry (no real stock dependency askable), a discovered-only session (commercial_use + iStock, no explicit goal) reaches normal questioning_exhausted -- no readiness question, no crash, no special iStock logic', async () => {
    // Mock returns exactly what the real, unmodified registry returns today:
    // askable only for human_contribution_description, nothing else.
    mockedGetAskabilityEntry.mockImplementation((id: string) => (id === 'human_contribution_description' ? { treatment: 'askable_in_crc' } : undefined))

    const store = createInMemorySessionStore()
    await store.save('rt-discovered-1', {
      structured_understanding: discoveredOnlySU(),
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

    const outcome = await runTurn({ token: 'rt-discovered-1', turnNumber: 2, userText: 'anything' }, deps({}, store))
    expect(outcome.kind).toBe('complete')
    const loaded = (await store.load('rt-discovered-1')) as CRCSessionState
    expect(loaded.structured_understanding.completion_reason).toBe('questioning_exhausted')
    expect(loaded.boundary_state.knowledge_readiness_used).toEqual({})
  })

  test('no duplicate readiness need when the SAME topic is both explicit and discovered simultaneously (defense in depth, using a synthetic askable dependency)', async () => {
    mockedGetAskabilityEntry.mockImplementation((id: string) =>
      id === 'test_provider_license_confirmed' ? { treatment: 'askable_in_crc', generic_acquisition: { target: { kind: 'asset_provider_field', field: 'license' }, question_text: 'What license covers that provider material?', max_attempts: 1 } } : undefined,
    )
    const syntheticClaim = { ...TOPIC_CLAIMS_FIXTURE[0], claim_id: 'CLAIM-TEST-DUP', topic: 'third_party_source_rights' as const, provider_scope: ['istock'] as ('istock' | 'getty' | 'shutterstock' | 'adobe-stock')[], unresolved_project_dependencies: ['test_provider_license_confirmed'], lifecycle: 'Adopted' as const, crc_eligible: 'Yes' as const, superseded_by: null, applicability_requirements: [] }

    const su = discoveredOnlySU({
      user_goals: [
        { goal_id: 'g-1', state: 'confirmed', raw_text: 'x', category: 'commercial_use', scope: 'informational', superseded_by: null, source_turn: 1, source_statement: 'x' },
        // ALSO explicit third_party_source_rights -- same topic, both origins active at once.
        { goal_id: 'g-2', state: 'confirmed', raw_text: 'Can I use this iStock image?', category: 'third_party_source_rights', scope: 'informational', superseded_by: null, source_turn: 1, source_statement: 'x' },
      ],
    })

    const store = createInMemorySessionStore()
    await store.save('rt-dup', {
      structured_understanding: su,
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

    const outcome = await runTurn({ token: 'rt-dup', turnNumber: 2, userText: 'anything' }, deps({ topicClaims: [syntheticClaim] }, store))
    // Exactly one question asked (the readiness need), not two -- Set-based
    // dedup between explicit and discovered categories guarantees this.
    expect(outcome.kind).toBe('question')
    expect((outcome as { message: string }).message).toBe('What license covers that provider material?')
  })
})
