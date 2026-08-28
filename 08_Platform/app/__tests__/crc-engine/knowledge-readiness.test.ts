/**
 * Track B — Generic Living-Knowledge Readiness/Askability milestone
 * (2026-08-20). Tests deriveKnowledgeReadinessNeeds/buildKnowledgeReadinessProposal
 * in isolation, via a mocked dependency-askability.ts registry (standard
 * jest.mock() of a pure, synchronous, non-LLM data module -- same
 * precedent as supabase-session-store.test.ts/results-email-delivery.test.ts,
 * not the "never mock the live Anthropic SDK" discipline that governs a
 * different concern entirely). No real governed dependency is registered
 * askable via the generic path today (see dependency-askability.ts's own
 * header for the exact naming-mismatch finding) -- every positive-path
 * scenario here uses a synthetic, test-only dependency id, exactly the
 * pattern this milestone's own task spec sanctions ("Synthetic claim:
 * eligible/current, unresolved dependency: foo_evidence_status").
 */

import { deriveKnowledgeReadinessNeeds, buildKnowledgeReadinessProposal } from '@/lib/crc-engine/knowledge-readiness'
import { createInitialBoundaryState, type BoundaryState } from '@/lib/interview-engine/boundaries'
import type { StructuredUnderstanding, AssetProviderMention, UserGoal } from '@/types/interview-engine'
import type { TopicClaim } from '@/lib/retrieval-engine/types'
import { getAskabilityEntry } from '@/lib/crc-engine/dependency-askability'

jest.mock('@/lib/crc-engine/dependency-askability', () => ({
  getAskabilityEntry: jest.fn(),
}))

const mockedGetAskabilityEntry = getAskabilityEntry as jest.Mock

function emptySU(overrides: Partial<StructuredUnderstanding> = {}): StructuredUnderstanding {
  return {
    project_facts: {
      intended_use: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
      workflow_role: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
      jurisdiction: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
      human_contribution_description: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
    },
    tool_mentions: [],
    scoped_observations: [],
    user_goals: [],
    asset_provider_mentions: [],
    assessment_jurisdiction_mentions: [],
    current_phase: 2,
    gate_1_state: 'not_met',
    gate_2_state: 'not_yet_stable',
    completion_reason: null,
    opt_out_scope: null,
    ...overrides,
  }
}

function goal(overrides: Partial<UserGoal> = {}): UserGoal {
  return {
    goal_id: 'g-1',
    state: 'confirmed',
    raw_text: 'x',
    category: 'third_party_source_rights',
    scope: 'informational',
    superseded_by: null,
    source_turn: 1,
    source_statement: 'x',
    ...overrides,
  }
}

function providerMention(overrides: Partial<AssetProviderMention> & Pick<AssetProviderMention, 'mention_id'>): AssetProviderMention {
  return {
    resolution: { kind: 'canonical', identifier: 'istock' },
    confidence: 'confirmed',
    source_turn: 1,
    source_statement: 'iStock',
    superseded_by: null,
    usage: { state: 'unknown' },
    license: { state: 'unknown' },
    ...overrides,
  }
}

function stockClaim(overrides: Partial<TopicClaim> = {}): TopicClaim {
  return {
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
    ...overrides,
  }
}

const ASKABLE_ENTRY = {
  treatment: 'askable_in_crc' as const,
  generic_acquisition: {
    target: { kind: 'asset_provider_field' as const, field: 'license' as const },
    question_text: 'What license covers that provider material?',
    max_attempts: 1,
  },
}

beforeEach(() => {
  mockedGetAskabilityEntry.mockReset()
})

describe('deriveKnowledgeReadinessNeeds', () => {
  // A. explicit Path A (goal exists) still works, B implicitly (a real relevant claim + askable dep produces a need)
  test('E: relevant claim + unresolved askable dependency + attempt remaining -> produces exactly one readiness need', () => {
    mockedGetAskabilityEntry.mockImplementation((id: string) => (id === 'test_provider_license_confirmed' ? ASKABLE_ENTRY : undefined))
    const su = emptySU({
      user_goals: [goal()],
      asset_provider_mentions: [providerMention({ mention_id: 'ap-1' })],
    })
    const needs = deriveKnowledgeReadinessNeeds(su, [stockClaim()], createInitialBoundaryState())
    expect(needs).toHaveLength(1)
    expect(needs[0].dependency_id).toBe('test_provider_license_confirmed')
    expect(needs[0].provider_mention_id).toBe('ap-1')
    expect(needs[0].claim_ids).toEqual(['CLAIM-TEST-001'])
  })

  // G. satisfied dependency creates no question
  test('G: license already confirmed on the provider mention -> no need produced', () => {
    mockedGetAskabilityEntry.mockImplementation((id: string) => (id === 'test_provider_license_confirmed' ? ASKABLE_ENTRY : undefined))
    const su = emptySU({
      user_goals: [goal()],
      asset_provider_mentions: [providerMention({ mention_id: 'ap-1', license: { state: 'confirmed', value: 'standard license' } })],
    })
    const needs = deriveKnowledgeReadinessNeeds(su, [stockClaim()], createInitialBoundaryState())
    expect(needs).toHaveLength(0)
  })

  test('declined dependency (confirmed_absent/declined state) creates no question', () => {
    mockedGetAskabilityEntry.mockImplementation((id: string) => (id === 'test_provider_license_confirmed' ? ASKABLE_ENTRY : undefined))
    const su = emptySU({
      user_goals: [goal()],
      asset_provider_mentions: [providerMention({ mention_id: 'ap-1', license: { state: 'declined' } })],
    })
    const needs = deriveKnowledgeReadinessNeeds(su, [stockClaim()], createInitialBoundaryState())
    expect(needs).toHaveLength(0)
  })

  // H. exhausted dependency creates no question
  test('H: attempt budget already exhausted for this target -> no need produced', () => {
    mockedGetAskabilityEntry.mockImplementation((id: string) => (id === 'test_provider_license_confirmed' ? ASKABLE_ENTRY : undefined))
    const su = emptySU({
      user_goals: [goal()],
      asset_provider_mentions: [providerMention({ mention_id: 'ap-1' })],
    })
    const boundaryState: BoundaryState = { ...createInitialBoundaryState(), knowledge_readiness_used: { 'readiness::ap-1::test_provider_license_confirmed': 1 } }
    const needs = deriveKnowledgeReadinessNeeds(su, [stockClaim()], boundaryState)
    expect(needs).toHaveLength(0)
  })

  // F. unresolved non-askable dependency does not create a question (evidence_only)
  test('F/57: evidence_only treatment -> no need produced, no crash', () => {
    mockedGetAskabilityEntry.mockImplementation((id: string) => (id === 'test_provider_license_confirmed' ? { treatment: 'evidence_only' as const } : undefined))
    const su = emptySU({
      user_goals: [goal()],
      asset_provider_mentions: [providerMention({ mention_id: 'ap-1' })],
    })
    const needs = deriveKnowledgeReadinessNeeds(su, [stockClaim()], createInitialBoundaryState())
    expect(needs).toHaveLength(0)
  })

  // Section 24: unknown/non-registered dependency -> no question, no crash, no infinite block
  test('56: unknown dependency id (no registry entry at all) -> no need produced, no throw', () => {
    mockedGetAskabilityEntry.mockReturnValue(undefined)
    const su = emptySU({
      user_goals: [goal()],
      asset_provider_mentions: [providerMention({ mention_id: 'ap-1' })],
    })
    expect(() => deriveKnowledgeReadinessNeeds(su, [stockClaim({ unresolved_project_dependencies: ['foo_evidence_status'] })], createInitialBoundaryState())).not.toThrow()
    expect(deriveKnowledgeReadinessNeeds(su, [stockClaim({ unresolved_project_dependencies: ['foo_evidence_status'] })], createInitialBoundaryState())).toHaveLength(0)
  })

  // human_contribution_description structurally excluded, even if mock registry says askable+generic_acquisition
  test('human_contribution_description is never processed by the generic path, even if hypothetically registered with a generic_acquisition strategy', () => {
    mockedGetAskabilityEntry.mockImplementation((id: string) => (id === 'human_contribution_description' ? ASKABLE_ENTRY : undefined))
    const su = emptySU({ user_goals: [goal({ category: 'copyright_ownership' })] })
    const claim = stockClaim({ topic: 'copyright_ownership', provider_scope: null, unresolved_project_dependencies: ['human_contribution_description'] })
    const needs = deriveKnowledgeReadinessNeeds(su, [claim], createInitialBoundaryState())
    expect(needs).toHaveLength(0)
  })

  // 58/25: Pending claim (not Adopted/CRC-eligible) -> no question
  test('58: claim not Adopted -> excluded from readiness candidacy entirely', () => {
    mockedGetAskabilityEntry.mockImplementation((id: string) => (id === 'test_provider_license_confirmed' ? ASKABLE_ENTRY : undefined))
    const su = emptySU({ user_goals: [goal()], asset_provider_mentions: [providerMention({ mention_id: 'ap-1' })] })
    const needs = deriveKnowledgeReadinessNeeds(su, [stockClaim({ lifecycle: 'Under Review' })], createInitialBoundaryState())
    expect(needs).toHaveLength(0)
  })

  test('25b: claim CRC_eligible No -> excluded', () => {
    mockedGetAskabilityEntry.mockImplementation((id: string) => (id === 'test_provider_license_confirmed' ? ASKABLE_ENTRY : undefined))
    const su = emptySU({ user_goals: [goal()], asset_provider_mentions: [providerMention({ mention_id: 'ap-1' })] })
    const needs = deriveKnowledgeReadinessNeeds(su, [stockClaim({ crc_eligible: 'No' })], createInitialBoundaryState())
    expect(needs).toHaveLength(0)
  })

  test('25c: superseded claim -> excluded', () => {
    mockedGetAskabilityEntry.mockImplementation((id: string) => (id === 'test_provider_license_confirmed' ? ASKABLE_ENTRY : undefined))
    const su = emptySU({ user_goals: [goal()], asset_provider_mentions: [providerMention({ mention_id: 'ap-1' })] })
    const needs = deriveKnowledgeReadinessNeeds(su, [stockClaim({ superseded_by: 'CLAIM-TEST-002' })], createInitialBoundaryState())
    expect(needs).toHaveLength(0)
  })

  test('25d: unrelated-topic claim (no matching active goal) -> excluded', () => {
    mockedGetAskabilityEntry.mockImplementation((id: string) => (id === 'test_provider_license_confirmed' ? ASKABLE_ENTRY : undefined))
    const su = emptySU({ user_goals: [goal({ category: 'commercial_use' })], asset_provider_mentions: [providerMention({ mention_id: 'ap-1' })] })
    const needs = deriveKnowledgeReadinessNeeds(su, [stockClaim()], createInitialBoundaryState())
    expect(needs).toHaveLength(0)
  })

  // 59: provider_scope mismatch -> no leak
  test('59/C: provider_scope mismatch (claim scoped to getty, only istock active) -> no need produced, no leak', () => {
    mockedGetAskabilityEntry.mockImplementation((id: string) => (id === 'test_provider_license_confirmed' ? ASKABLE_ENTRY : undefined))
    const su = emptySU({ user_goals: [goal()], asset_provider_mentions: [providerMention({ mention_id: 'ap-1', resolution: { kind: 'canonical', identifier: 'istock' } })] })
    const needs = deriveKnowledgeReadinessNeeds(su, [stockClaim({ provider_scope: ['getty'] })], createInitialBoundaryState())
    expect(needs).toHaveLength(0)
  })

  // Multi-provider test (Section 23)
  test('multi-provider: iStock and Getty both active under a generic (provider_scope: null) claim -> two independent needs, one per provider, iStock state never satisfies Getty', () => {
    mockedGetAskabilityEntry.mockImplementation((id: string) => (id === 'test_provider_license_confirmed' ? ASKABLE_ENTRY : undefined))
    const su = emptySU({
      user_goals: [goal()],
      asset_provider_mentions: [
        providerMention({ mention_id: 'ap-istock', resolution: { kind: 'canonical', identifier: 'istock' }, license: { state: 'confirmed', value: 'standard' } }),
        providerMention({ mention_id: 'ap-getty', resolution: { kind: 'canonical', identifier: 'getty' } }),
      ],
    })
    const needs = deriveKnowledgeReadinessNeeds(su, [stockClaim({ provider_scope: null })], createInitialBoundaryState())
    expect(needs).toHaveLength(1)
    expect(needs[0].provider_mention_id).toBe('ap-getty')
  })

  // I. shared-dependency dedupe: multiple claims requiring the same dependency + target -> one need
  test('I/60: two claims sharing the identical dependency + provider target -> exactly one readiness need, claim_ids accumulate both', () => {
    mockedGetAskabilityEntry.mockImplementation((id: string) => (id === 'test_provider_license_confirmed' ? ASKABLE_ENTRY : undefined))
    const su = emptySU({ user_goals: [goal()], asset_provider_mentions: [providerMention({ mention_id: 'ap-1' })] })
    const claimA = stockClaim({ claim_id: 'CLAIM-A' })
    const claimB = stockClaim({ claim_id: 'CLAIM-B' })
    const needs = deriveKnowledgeReadinessNeeds(su, [claimA, claimB], createInitialBoundaryState())
    expect(needs).toHaveLength(1)
    expect(needs[0].claim_ids.sort()).toEqual(['CLAIM-A', 'CLAIM-B'])
  })

  // T/U: one-hop / no recursive traversal -- this module does not traverse
  // TopicRelationships at all (see its own header); confirm a claim only
  // reachable via a relationship never produces a need.
  test("T/U: a claim whose topic doesn't match any active goal category directly (would only be reachable via a relationship) never produces a need -- this module does not traverse TopicRelationships", () => {
    mockedGetAskabilityEntry.mockImplementation((id: string) => (id === 'test_provider_license_confirmed' ? ASKABLE_ENTRY : undefined))
    const su = emptySU({ user_goals: [goal({ category: 'commercial_use' })], asset_provider_mentions: [providerMention({ mention_id: 'ap-1' })] })
    // claim's own topic is third_party_source_rights, goal is commercial_use -- no direct match, no relationship traversal exists in this module
    const needs = deriveKnowledgeReadinessNeeds(su, [stockClaim()], createInitialBoundaryState())
    expect(needs).toHaveLength(0)
  })
})

describe('buildKnowledgeReadinessProposal', () => {
  test('constructs a deterministic proposal carrying the registry question_text, the readiness kind, and the dependency id', () => {
    const need = {
      claim_ids: ['CLAIM-TEST-001'],
      dependency_id: 'test_provider_license_confirmed',
      target: { kind: 'asset_provider_field' as const, field: 'license' as const },
      question_text: 'What license covers that provider material?',
      attempt_key: 'readiness::ap-1::test_provider_license_confirmed',
      provider_mention_id: 'ap-1',
    }
    const proposal = buildKnowledgeReadinessProposal(need, 2)
    expect(proposal).toEqual({
      question_text: 'What license covers that provider material?',
      question_kind: 'knowledge_readiness_acquisition',
      target_signal_id: 'ap-1',
      phase: 2,
      target_readiness_dependency_id: 'test_provider_license_confirmed',
    })
  })
})
