/**
 * Discovered-topic claim lookup deterministic tests (Track C —
 * Discovered-Topic Goal Provenance, 2026-08-21). No live model needed --
 * pure functions, same discipline as lookup-topic-relationships.test.ts,
 * whose `claim`/`facts` helper shapes this file mirrors exactly.
 */

import { lookupDiscoveredTopicClaims } from '@/lib/retrieval-engine/lookup-discovered-topic-claims'
import type { ApplicabilityFacts } from '@/lib/retrieval-engine/lookup-topic-claims'
import type { DiscoveredTopicOccurrence, TopicClaim } from '@/lib/retrieval-engine/types'

function claim(overrides: Partial<TopicClaim> & Pick<TopicClaim, 'claim_id' | 'topic'>): TopicClaim {
  return {
    claim_character: 'established',
    jurisdiction: 'Global',
    lifecycle: 'Adopted',
    crc_eligible: 'Yes',
    crc_publication_scope: 'Scope text.',
    crc_candidate_statement: 'Candidate statement.',
    applicability_requirements: [],
    unresolved_project_dependencies: [],
    provider_scope: null,
    last_verified: '2026-08-21',
    superseded_by: null,
    ...overrides,
  }
}

function occurrence(overrides: Partial<DiscoveredTopicOccurrence> & Pick<DiscoveredTopicOccurrence, 'topic' | 'source_goal_category'>): DiscoveredTopicOccurrence {
  return {
    trigger_id: 'test-trigger',
    source_kind: 'asset_provider_mention',
    source_id: 'ap-1',
    ...overrides,
  }
}

function facts(overrides: Partial<ApplicabilityFacts> = {}): ApplicabilityFacts {
  return { jurisdiction: { state: 'unknown' }, toolMentions: [], ...overrides }
}

describe('lookupDiscoveredTopicClaims -- basic resolution', () => {
  test('an eligible occurrence + eligible claim -> the claim is retrieved with the originating goal category, not the claim\'s own topic', () => {
    const occ = occurrence({ topic: 'third_party_source_rights', source_goal_category: 'commercial_use' })
    const c = claim({ claim_id: 'C-1', topic: 'third_party_source_rights' })
    const result = lookupDiscoveredTopicClaims([occ], [c], facts())
    expect(result.matches).toEqual([{ claim: c, sourceGoalCategory: 'commercial_use' }])
    expect(result.diagnostics).toEqual([])
  })

  test('no occurrence at all -> no matches, no diagnostics', () => {
    const c = claim({ claim_id: 'C-1', topic: 'third_party_source_rights' })
    const result = lookupDiscoveredTopicClaims([], [c], facts())
    expect(result.matches).toEqual([])
    expect(result.diagnostics).toEqual([])
  })

  test('an occurrence for a topic with no matching claim at all -> no_topic_claim diagnostic, attributed to the ORIGINATING goal category', () => {
    const occ = occurrence({ topic: 'third_party_source_rights', source_goal_category: 'commercial_use' })
    const result = lookupDiscoveredTopicClaims([occ], [], facts())
    expect(result.matches).toEqual([])
    expect(result.diagnostics).toEqual([{ identifier: 'commercial_use', reason: 'no_topic_claim' }])
  })
})

// T. lifecycle Pending still excluded
describe('T: lifecycle gating', () => {
  test('a non-Adopted claim is never retrieved via discovery', () => {
    const occ = occurrence({ topic: 'third_party_source_rights', source_goal_category: 'commercial_use' })
    const c = claim({ claim_id: 'C-1', topic: 'third_party_source_rights', lifecycle: 'Candidate' })
    const result = lookupDiscoveredTopicClaims([occ], [c], facts())
    expect(result.matches).toEqual([])
    expect(result.diagnostics).toEqual([{ identifier: 'commercial_use', reason: 'not_adopted_or_eligible' }])
  })
})

// U. crc_eligible No still excluded
describe('U: CRC-eligibility gating', () => {
  test('a crc_eligible: No claim is never retrieved via discovery', () => {
    const occ = occurrence({ topic: 'third_party_source_rights', source_goal_category: 'commercial_use' })
    const c = claim({ claim_id: 'C-1', topic: 'third_party_source_rights', crc_eligible: 'No' })
    const result = lookupDiscoveredTopicClaims([occ], [c], facts())
    expect(result.matches).toEqual([])
    expect(result.diagnostics).toEqual([{ identifier: 'commercial_use', reason: 'not_adopted_or_eligible' }])
  })
})

describe('a superseded claim is never retrieved via discovery', () => {
  test('superseded_by non-null excludes the claim entirely (not even eligible/ineligible bookkeeping)', () => {
    const occ = occurrence({ topic: 'third_party_source_rights', source_goal_category: 'commercial_use' })
    const c = claim({ claim_id: 'C-1', topic: 'third_party_source_rights', superseded_by: 'C-2' })
    const result = lookupDiscoveredTopicClaims([occ], [c], facts())
    expect(result.matches).toEqual([])
    expect(result.diagnostics).toEqual([{ identifier: 'commercial_use', reason: 'no_topic_claim' }])
  })
})

// V. applicability unmet still behaves according to existing semantics,
// attributed to the ORIGINATING goal category (Case 3A correctness -- the
// same requirement lookupRelatedTopicClaims's own module header documents).
describe('V: applicability gating, attributed to the originating goal category', () => {
  test('an applicability-gated claim with the requirement unmet -> applicability_unmet diagnostic under the ORIGINATING goal category, not the claim\'s own topic', () => {
    const occ = occurrence({ topic: 'copyrightability', source_goal_category: 'commercial_use' })
    const c = claim({
      claim_id: 'C-1',
      topic: 'copyrightability',
      applicability_requirements: [{ fact: 'jurisdiction', operator: 'equals', value: 'United States' }],
    })
    const result = lookupDiscoveredTopicClaims([occ], [c], facts({ jurisdiction: { state: 'unknown' } }))
    expect(result.matches).toEqual([])
    expect(result.diagnostics).toEqual([{ identifier: 'commercial_use', reason: 'applicability_unmet' }])
  })

  test('applicability satisfied -> the claim IS retrieved, proving the gate is a real pass/fail check, not a bypass', () => {
    const occ = occurrence({ topic: 'copyrightability', source_goal_category: 'commercial_use' })
    const c = claim({
      claim_id: 'C-1',
      topic: 'copyrightability',
      applicability_requirements: [{ fact: 'jurisdiction', operator: 'equals', value: 'United States' }],
    })
    const result = lookupDiscoveredTopicClaims([occ], [c], facts({ jurisdiction: { state: 'confirmed', value: 'United States' } }))
    expect(result.matches).toEqual([{ claim: c, sourceGoalCategory: 'commercial_use' }])
  })
})

// K. provider_scope remains enforced for the discovered path exactly as for
// the explicit path (same providerScopeMatches function, reused verbatim).
describe('K: provider_scope gating', () => {
  test('a provider-scoped claim only matches when its provider is in assetProviders', () => {
    const occ = occurrence({ topic: 'third_party_source_rights', source_goal_category: 'commercial_use' })
    const generic = claim({ claim_id: 'GENERIC', topic: 'third_party_source_rights', provider_scope: null })
    const istock = claim({ claim_id: 'ISTOCK', topic: 'third_party_source_rights', provider_scope: ['istock'] })
    const getty = claim({ claim_id: 'GETTY', topic: 'third_party_source_rights', provider_scope: ['getty'] })
    const result = lookupDiscoveredTopicClaims([occ], [generic, istock, getty], facts(), ['istock'])
    const ids = result.matches.map((m) => m.claim.claim_id).sort()
    expect(ids).toEqual(['GENERIC', 'ISTOCK'])
  })

  test('no assetProviders supplied -> only generic (provider_scope: null) claims match', () => {
    const occ = occurrence({ topic: 'third_party_source_rights', source_goal_category: 'commercial_use' })
    const generic = claim({ claim_id: 'GENERIC', topic: 'third_party_source_rights', provider_scope: null })
    const istock = claim({ claim_id: 'ISTOCK', topic: 'third_party_source_rights', provider_scope: ['istock'] })
    const result = lookupDiscoveredTopicClaims([occ], [generic, istock], facts())
    expect(result.matches.map((m) => m.claim.claim_id)).toEqual(['GENERIC'])
  })
})

describe('goal-scoped dedup and multi-occurrence collapsing', () => {
  test('two occurrences for the SAME (topic, sourceGoalCategory) pair (e.g. two provider mentions satisfying the same trigger) collapse to one claim lookup, no duplicate match', () => {
    const occ1 = occurrence({ topic: 'third_party_source_rights', source_goal_category: 'commercial_use', source_id: 'ap-istock' })
    const occ2 = occurrence({ topic: 'third_party_source_rights', source_goal_category: 'commercial_use', source_id: 'ap-getty' })
    const c = claim({ claim_id: 'C-1', topic: 'third_party_source_rights' })
    const result = lookupDiscoveredTopicClaims([occ1, occ2], [c], facts())
    expect(result.matches).toHaveLength(1)
  })

  test('two occurrences for the SAME topic but DIFFERENT sourceGoalCategory each produce their own independent match (goal-scoped dedup, not global claim_id dedup)', () => {
    const occCommercial = occurrence({ topic: 'third_party_source_rights', source_goal_category: 'commercial_use' })
    const occOther = occurrence({ topic: 'third_party_source_rights', source_goal_category: 'copyright_ownership' })
    const c = claim({ claim_id: 'C-1', topic: 'third_party_source_rights' })
    const result = lookupDiscoveredTopicClaims([occCommercial, occOther], [c], facts())
    expect(result.matches).toHaveLength(2)
    expect(result.matches.map((m) => m.sourceGoalCategory).sort()).toEqual(['commercial_use', 'copyright_ownership'])
  })
})
