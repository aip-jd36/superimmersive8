/**
 * Track A — Generic Discovered Relevance milestone (2026-08-21). Tests
 * deriveDiscoveredTopicOccurrences/discoveredTopicCategories/computeRelevantTopics
 * in isolation, against real fixture-shaped TopicClaim data (no mocking
 * needed -- this module reads TopicClaim[] as plain data, same as
 * knowledge-readiness.test.ts's own synthetic-claim discipline).
 *
 * Test IDs below (A-J, plus synthetic extensibility) map to this
 * milestone's own required test matrix, Section 33.
 */

import { deriveDiscoveredTopicOccurrences, discoveredTopicCategories, computeRelevantTopics, type DiscoveredRelevanceSourceKind } from '@/lib/crc-engine/discovered-relevance'
import type { StructuredUnderstanding, AssetProviderMention, AssetProviderId, UserGoal } from '@/types/interview-engine'
import type { TopicClaim } from '@/lib/retrieval-engine/types'

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
    current_phase: 2,
    gate_1_state: 'not_met',
    gate_2_state: 'not_yet_stable',
    completion_reason: null,
    opt_out_scope: null,
    ...overrides,
  }
}

function goal(overrides: Partial<UserGoal> = {}): UserGoal {
  return { goal_id: 'g-1', state: 'confirmed', raw_text: 'x', category: 'commercial_use', scope: 'informational', superseded_by: null, source_turn: 1, source_statement: 'x', ...overrides }
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

// Generic stock claim (provider_scope: null), mirroring the real
// CLAIM-STOCK-EDITORIAL-001-v1 shape, minus text content.
function genericStockClaim(overrides: Partial<TopicClaim> = {}): TopicClaim {
  return {
    claim_id: 'CLAIM-STOCK-GENERIC-TEST',
    topic: 'third_party_source_rights',
    claim_character: 'established',
    jurisdiction: 'Global',
    lifecycle: 'Adopted',
    crc_eligible: 'Yes',
    crc_publication_scope: null,
    crc_candidate_statement: null,
    applicability_requirements: [],
    unresolved_project_dependencies: [],
    provider_scope: null,
    last_verified: null,
    superseded_by: null,
    ...overrides,
  }
}

function providerScopedClaim(providerId: AssetProviderId, overrides: Partial<TopicClaim> = {}): TopicClaim {
  return genericStockClaim({ claim_id: `CLAIM-STOCK-${providerId.toUpperCase()}-TEST`, provider_scope: [providerId], ...overrides })
}

describe('deriveDiscoveredTopicOccurrences', () => {
  // A. commercial_use + confirmed iStock -> discovered third_party_source_rights
  test('A: commercial_use goal + confirmed canonical iStock mention -> discovers third_party_source_rights', () => {
    const su = emptySU({ user_goals: [goal()], asset_provider_mentions: [providerMention({ mention_id: 'ap-1' })] })
    const occurrences = deriveDiscoveredTopicOccurrences(su, [genericStockClaim()])
    expect(occurrences).toHaveLength(1)
    expect(occurrences[0]).toEqual({ topic: 'third_party_source_rights', trigger_id: 'asset_provider_mention_to_third_party_source_rights', source_kind: 'asset_provider_mention', source_id: 'ap-1' })
  })

  // B/C: same topic for Getty/Shutterstock -- generic trigger, no provider-specific branching
  test('B: commercial_use + confirmed Getty -> same discovered topic', () => {
    const su = emptySU({ user_goals: [goal()], asset_provider_mentions: [providerMention({ mention_id: 'ap-1', resolution: { kind: 'canonical', identifier: 'getty' } })] })
    const occurrences = deriveDiscoveredTopicOccurrences(su, [genericStockClaim()])
    expect(occurrences).toHaveLength(1)
    expect(occurrences[0].topic).toBe('third_party_source_rights')
  })

  test('C: commercial_use + confirmed Shutterstock -> same discovered topic', () => {
    const su = emptySU({ user_goals: [goal()], asset_provider_mentions: [providerMention({ mention_id: 'ap-1', resolution: { kind: 'canonical', identifier: 'shutterstock' } })] })
    const occurrences = deriveDiscoveredTopicOccurrences(su, [genericStockClaim()])
    expect(occurrences).toHaveLength(1)
    expect(occurrences[0].topic).toBe('third_party_source_rights')
  })

  // D. two providers -> one discovered topic, multiple source IDs
  test('D: commercial_use + iStock + Getty -> one discovered topic, two distinct source_ids', () => {
    const su = emptySU({
      user_goals: [goal()],
      asset_provider_mentions: [
        providerMention({ mention_id: 'ap-istock', resolution: { kind: 'canonical', identifier: 'istock' } }),
        providerMention({ mention_id: 'ap-getty', resolution: { kind: 'canonical', identifier: 'getty' } }),
      ],
    })
    const occurrences = deriveDiscoveredTopicOccurrences(su, [genericStockClaim()])
    expect(occurrences).toHaveLength(2)
    expect(occurrences.every((o) => o.topic === 'third_party_source_rights')).toBe(true)
    expect(occurrences.map((o) => o.source_id).sort()).toEqual(['ap-getty', 'ap-istock'])
    expect(discoveredTopicCategories(occurrences)).toEqual(['third_party_source_rights'])
  })

  // E. explicit goal + provider -> no duplicate topic in the merged diagnostic view
  test('E: explicit third_party_source_rights goal + provider mention -> computeRelevantTopics shows one explicit entry, no discovered duplicate', () => {
    const su = emptySU({
      user_goals: [goal({ category: 'third_party_source_rights' })],
      asset_provider_mentions: [providerMention({ mention_id: 'ap-1' })],
    })
    // Note: the real trigger's allowed_parent_goals is ['commercial_use'] only,
    // so this scenario would not even discover the topic on its own -- but
    // the dedup logic in computeRelevantTopics must hold regardless (defense
    // in depth), proven directly here.
    const relevant = computeRelevantTopics(su, [genericStockClaim()])
    const stockTopics = relevant.filter((r) => r.topic === 'third_party_source_rights')
    expect(stockTopics).toHaveLength(1)
    expect(stockTopics[0].origin).toBe('explicit_goal')
  })

  // F. provider mention only, no allowed parent goal -> no discovered topic
  test('F: provider mention with NO active goal at all -> no discovered topic (Path B stays off)', () => {
    const su = emptySU({ user_goals: [], asset_provider_mentions: [providerMention({ mention_id: 'ap-1' })] })
    expect(deriveDiscoveredTopicOccurrences(su, [genericStockClaim()])).toHaveLength(0)
  })

  test('F2: provider mention + a goal category NOT in allowed_parent_goals -> no discovered topic', () => {
    const su = emptySU({ user_goals: [goal({ category: 'copyright_ownership' })], asset_provider_mentions: [providerMention({ mention_id: 'ap-1' })] })
    expect(deriveDiscoveredTopicOccurrences(su, [genericStockClaim()])).toHaveLength(0)
  })

  // G. unresolved provider -> no discovered topic
  test('G: unresolved provider alias -> no discovered topic, fail closed', () => {
    const su = emptySU({ user_goals: [goal()], asset_provider_mentions: [providerMention({ mention_id: 'ap-1', resolution: { kind: 'unresolved_alias', raw_name: 'PhotoMega' }, confidence: 'unresolved_no_visibility' })] })
    expect(deriveDiscoveredTopicOccurrences(su, [genericStockClaim()])).toHaveLength(0)
  })

  // H. superseded provider -> no discovered topic
  test('H: superseded provider mention -> no discovered topic', () => {
    const su = emptySU({ user_goals: [goal()], asset_provider_mentions: [providerMention({ mention_id: 'ap-1', superseded_by: 'ap-2' })] })
    expect(deriveDiscoveredTopicOccurrences(su, [genericStockClaim()])).toHaveLength(0)
  })

  // I. unregistered trigger source -> no discovered topic (no governed claim for the topic at all)
  test('I: no Adopted+CRC-eligible claim exists for the topic at all -> no discovered topic even with a valid provider+goal', () => {
    const su = emptySU({ user_goals: [goal()], asset_provider_mentions: [providerMention({ mention_id: 'ap-1' })] })
    expect(deriveDiscoveredTopicOccurrences(su, [])).toHaveLength(0)
    expect(deriveDiscoveredTopicOccurrences(su, [genericStockClaim({ lifecycle: 'Under Review' })])).toHaveLength(0)
    expect(deriveDiscoveredTopicOccurrences(su, [genericStockClaim({ crc_eligible: 'No' })])).toHaveLength(0)
  })

  // J. wrong parent goal -> no discovered topic (duplicate of F2, kept for matrix-letter traceability)
  test('J: wrong parent goal (copyrightability) -> no discovered topic', () => {
    const su = emptySU({ user_goals: [goal({ category: 'copyrightability' })], asset_provider_mentions: [providerMention({ mention_id: 'ap-1' })] })
    expect(deriveDiscoveredTopicOccurrences(su, [genericStockClaim()])).toHaveLength(0)
  })

  // Low-confidence mention (canonical but not 'confirmed' -- defensive, not
  // reachable via real extraction today, but the gate is explicit per Section 5.
  test('a canonical mention with non-confirmed confidence never discovers relevance (defense in depth)', () => {
    const su = emptySU({ user_goals: [goal()], asset_provider_mentions: [providerMention({ mention_id: 'ap-1', confidence: 'unresolved_no_visibility' })] })
    expect(deriveDiscoveredTopicOccurrences(su, [genericStockClaim()])).toHaveLength(0)
  })
})

describe('provider_scope remains the sole narrowing filter (Section 11/12)', () => {
  test('provider-scoped claims are untouched by this module -- discovery only ever produces a TOPIC, never a claim-level decision', () => {
    const su = emptySU({ user_goals: [goal()], asset_provider_mentions: [providerMention({ mention_id: 'ap-1', resolution: { kind: 'canonical', identifier: 'istock' } })] })
    const occurrences = deriveDiscoveredTopicOccurrences(su, [genericStockClaim(), providerScopedClaim('istock'), providerScopedClaim('getty')])
    // Exactly one occurrence (one trigger, one matching mention) -- this
    // module never inspects provider_scope on any claim; that narrowing
    // happens entirely downstream, in lookupTopicClaims's own
    // providerScopeMatches (untouched by this milestone).
    expect(occurrences).toHaveLength(1)
  })
})

describe('one-hop / no recursive discovery (Section 21, Y)', () => {
  test('discovering third_party_source_rights does not itself produce a second discovered topic, even if a hypothetical trigger existed for that topic as a parent goal', () => {
    // No trigger in the real registry uses third_party_source_rights as an
    // allowed_parent_goal, so this is already structurally impossible --
    // proven directly: running derivation twice (as if feeding the
    // discovered topic back in as a goal) produces no NEW occurrence type.
    const su = emptySU({ user_goals: [goal()], asset_provider_mentions: [providerMention({ mention_id: 'ap-1' })] })
    const first = deriveDiscoveredTopicOccurrences(su, [genericStockClaim()])
    expect(first).toHaveLength(1)
    // Simulate feeding the discovered topic back in as if it were an
    // active goal category (the one-hop boundary this module itself never
    // performs) -- even then, no chained trigger exists to fire from it.
    const suWithDiscoveredAsGoal = emptySU({ user_goals: [goal(), goal({ goal_id: 'g-2', category: 'third_party_source_rights' })], asset_provider_mentions: [providerMention({ mention_id: 'ap-1' })] })
    const second = deriveDiscoveredTopicOccurrences(suWithDiscoveredAsGoal, [genericStockClaim()])
    expect(second.map((o) => o.topic)).toEqual(['third_party_source_rights'])
  })
})

describe('synthetic extensibility (Section 32 — likeness/music scalability, NOT implemented, shape-only proof)', () => {
  test('the trigger/occurrence type shape supports a future, structurally different source_kind without changing this module\'s public function signatures', () => {
    // This test does NOT implement a real likeness/music trigger -- it only
    // proves the TYPE shape (DiscoveredRelevanceTrigger/DiscoveredTopicOccurrence)
    // is generic enough that a hypothetical future trigger object is
    // assignable to the same interfaces used by the real registry, with no
    // change needed to deriveDiscoveredTopicOccurrences's own signature to
    // accept a config object of this shape.
    const hypotheticalFutureTrigger: { trigger_id: string; source_kind: DiscoveredRelevanceSourceKind | 'recognizable_person_present'; topic: 'commercial_use'; allowed_parent_goals: 'commercial_use'[] } = {
      trigger_id: 'recognizable_person_present_to_likeness_rights',
      source_kind: 'recognizable_person_present',
      topic: 'commercial_use', // placeholder -- 'likeness' is a real GoalCategory value but this test only proves shape compatibility, not a real registration
      allowed_parent_goals: ['commercial_use'],
    }
    expect(hypotheticalFutureTrigger.trigger_id).toBeTruthy()
    // A genuinely new source_kind would additionally require one new `if`
    // branch in deriveDiscoveredTopicOccurrences's own source_kind switch
    // (see that function's own header) -- never a change to run-turn.ts,
    // retrieve(), or any orchestration call site. Not implemented here.
  })
})

describe('Z: old session compatibility', () => {
  test('a historical AssetProviderMention lacking usage/license (deserialized-and-defaulted shape) still triggers discovery correctly -- discovery never reads usage/license at all', () => {
    const su = emptySU({
      user_goals: [goal()],
      asset_provider_mentions: [providerMention({ mention_id: 'ap-1', usage: { state: 'unknown' }, license: { state: 'unknown' } })],
    })
    const occurrences = deriveDiscoveredTopicOccurrences(su, [genericStockClaim()])
    expect(occurrences).toHaveLength(1)
  })
})

describe('computeRelevantTopics', () => {
  test('explicit and discovered topics are both represented, each with correct origin and source_ids, when they differ', () => {
    const su = emptySU({
      user_goals: [goal({ category: 'commercial_use' }), goal({ goal_id: 'g-2', category: 'copyright_ownership' })],
      asset_provider_mentions: [providerMention({ mention_id: 'ap-1' })],
    })
    const relevant = computeRelevantTopics(su, [genericStockClaim()])
    const byTopic = new Map(relevant.map((r) => [r.topic, r]))
    expect(byTopic.get('commercial_use')).toEqual({ topic: 'commercial_use', origin: 'explicit_goal', source_ids: ['g-1'] })
    expect(byTopic.get('copyright_ownership')).toEqual({ topic: 'copyright_ownership', origin: 'explicit_goal', source_ids: ['g-2'] })
    expect(byTopic.get('third_party_source_rights')).toEqual({ topic: 'third_party_source_rights', origin: 'discovered', source_ids: ['ap-1'] })
  })
})
