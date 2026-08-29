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
    tool_scope: null,
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
  return { jurisdiction: { included: [], excluded: [] }, toolMentions: [], ...overrides }
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
    const result = lookupDiscoveredTopicClaims([occ], [c], facts({ jurisdiction: { included: [], excluded: [] } }))
    expect(result.matches).toEqual([])
    // CRC Generic Applicability Diagnostic Parity milestone (2026-08-24):
    // now carries unmet_applicability detail, matching the explicit
    // TopicClaim and Matrix paths -- the diagnostic used to be a bare
    // {identifier, reason} pair (Gap B, documented and fixed this milestone).
    expect(result.diagnostics).toEqual([
      {
        identifier: 'commercial_use',
        reason: 'applicability_unmet',
        unmet_applicability: [{ claim_id: 'C-1', requirement: { fact: 'jurisdiction', operator: 'equals', value: 'United States' }, status: 'unresolved' }],
      },
    ])
  })

  test('applicability satisfied -> the claim IS retrieved, proving the gate is a real pass/fail check, not a bypass', () => {
    const occ = occurrence({ topic: 'copyrightability', source_goal_category: 'commercial_use' })
    const c = claim({
      claim_id: 'C-1',
      topic: 'copyrightability',
      applicability_requirements: [{ fact: 'jurisdiction', operator: 'equals', value: 'United States' }],
    })
    const result = lookupDiscoveredTopicClaims([occ], [c], facts({ jurisdiction: { included: ['United States'], excluded: [] } }))
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

// ── CRC Generic Applicability Diagnostic Parity milestone (2026-08-24) --
// Gap B fix: this module previously used the boolean-only isApplicable(),
// so its applicability_unmet diagnostic never carried unmet_applicability
// detail, and (like lookupTopicClaims before its own Gap A fix) suppressed
// the diagnostic entirely whenever any sibling candidate was applicable. ──
describe('lookupDiscoveredTopicClaims -- applicability diagnostic parity (CRC Generic Applicability Diagnostic Parity milestone, 2026-08-24)', () => {
  // H. discovered relevant claim + unresolved applicability
  test('H: a discovered relevant claim with unresolved applicability -- withheld, with claim-level unresolved detail', () => {
    const occ = occurrence({ topic: 'third_party_source_rights', source_goal_category: 'commercial_use' })
    const c = claim({
      claim_id: 'C-1',
      topic: 'third_party_source_rights',
      applicability_requirements: [{ fact: 'jurisdiction', operator: 'equals', value: 'United States' }],
    })
    const result = lookupDiscoveredTopicClaims([occ], [c], facts({ jurisdiction: { included: [], excluded: [] } }))
    expect(result.matches).toEqual([])
    expect(result.diagnostics).toEqual([
      {
        identifier: 'commercial_use',
        reason: 'applicability_unmet',
        unmet_applicability: [{ claim_id: 'C-1', requirement: { fact: 'jurisdiction', operator: 'equals', value: 'United States' }, status: 'unresolved' }],
      },
    ])
  })

  // I. discovered relevant claim + known not_met
  test('I: a discovered relevant claim with a known-not-applicable requirement -- withheld, correctly classified not_met, never unresolved', () => {
    const occ = occurrence({ topic: 'third_party_source_rights', source_goal_category: 'commercial_use' })
    const c = claim({
      claim_id: 'C-1',
      topic: 'third_party_source_rights',
      applicability_requirements: [{ fact: 'jurisdiction', operator: 'equals', value: 'United States' }],
    })
    // Assessment-Jurisdiction Mention Model (2026-08-28): a genuine not_met
    // now requires an EXPLICIT exclusion, not merely a different included
    // value.
    const result = lookupDiscoveredTopicClaims([occ], [c], facts({ jurisdiction: { included: [], excluded: ['United States'] } }))
    expect(result.matches).toEqual([])
    expect(result.diagnostics).toEqual([
      {
        identifier: 'commercial_use',
        reason: 'applicability_unmet',
        unmet_applicability: [{ claim_id: 'C-1', requirement: { fact: 'jurisdiction', operator: 'equals', value: 'United States' }, status: 'not_met' }],
      },
    ])
  })

  // J. discovered relevant claim + met -- retrieves exactly as before
  test('J: a discovered relevant claim with met applicability -- retrieves exactly as before, no diagnostic', () => {
    const occ = occurrence({ topic: 'third_party_source_rights', source_goal_category: 'commercial_use' })
    const c = claim({
      claim_id: 'C-1',
      topic: 'third_party_source_rights',
      applicability_requirements: [{ fact: 'jurisdiction', operator: 'equals', value: 'United States' }],
    })
    const result = lookupDiscoveredTopicClaims([occ], [c], facts({ jurisdiction: { included: ['United States'], excluded: [] } }))
    expect(result.matches).toEqual([{ claim: c, sourceGoalCategory: 'commercial_use' }])
    expect(result.diagnostics).toEqual([])
  })

  // Mixed sibling case, the direct discovered-topic analogue of TopicClaim's own Gap A -- proves the same category-level suppression bug is fixed here too.
  test('mixed siblings: one discovered met claim + one discovered unresolved claim, same originating goal -- met claim retrieves, unresolved one preserved via diagnostic (previously silently dropped)', () => {
    const occ = occurrence({ topic: 'third_party_source_rights', source_goal_category: 'commercial_use' })
    const met = claim({ claim_id: 'MET', topic: 'third_party_source_rights' })
    const unresolved = claim({
      claim_id: 'UNRESOLVED',
      topic: 'third_party_source_rights',
      applicability_requirements: [{ fact: 'jurisdiction', operator: 'equals', value: 'United States' }],
    })
    const result = lookupDiscoveredTopicClaims([occ], [met, unresolved], facts({ jurisdiction: { included: [], excluded: [] } }))
    expect(result.matches).toEqual([{ claim: met, sourceGoalCategory: 'commercial_use' }])
    expect(result.diagnostics).toEqual([
      {
        identifier: 'commercial_use',
        reason: 'applicability_unmet',
        unmet_applicability: [{ claim_id: 'UNRESOLVED', requirement: { fact: 'jurisdiction', operator: 'equals', value: 'United States' }, status: 'unresolved' }],
      },
    ])
  })

  // L. discovered relevance retains originating explicit-goal/category provenance
  test('L: the diagnostic is attributed to the ORIGINATING explicit goal category (source_goal_category), never the claim\'s own intrinsic topic', () => {
    const occ = occurrence({ topic: 'third_party_source_rights', source_goal_category: 'copyright_ownership' })
    const c = claim({
      claim_id: 'C-1',
      topic: 'third_party_source_rights', // intrinsic topic differs from the originating goal category
      applicability_requirements: [{ fact: 'jurisdiction', operator: 'equals', value: 'United States' }],
    })
    const result = lookupDiscoveredTopicClaims([occ], [c], facts({ jurisdiction: { included: [], excluded: [] } }))
    expect(result.diagnostics[0].identifier).toBe('copyright_ownership') // the originating goal, not 'third_party_source_rights'
  })

  // M. discovered-only relevance still does NOT fabricate a UserGoal
  test('M: no UserGoal is fabricated or referenced anywhere -- this function never takes a UserGoal[] parameter at all, only DiscoveredTopicOccurrence[]', () => {
    // Structural proof, not merely behavioral: the function signature itself has no UserGoal parameter.
    const occ = occurrence({ topic: 'third_party_source_rights', source_goal_category: 'commercial_use' })
    const c = claim({ claim_id: 'C-1', topic: 'third_party_source_rights', applicability_requirements: [{ fact: 'jurisdiction', operator: 'equals', value: 'United States' }] })
    const result = lookupDiscoveredTopicClaims([occ], [c], facts({ jurisdiction: { included: [], excluded: [] } }))
    expect(Object.keys(result)).toEqual(['matches', 'diagnostics'])
    expect(result.diagnostics[0]).not.toHaveProperty('goal_id')
  })

  // N. provider-mismatched discovered claim emits no inappropriate applicability diagnostic
  test('N: a provider-mismatched discovered claim never contributes unmet_applicability detail -- it was never a candidate at all', () => {
    const occ = occurrence({ topic: 'third_party_source_rights', source_goal_category: 'commercial_use' })
    const met = claim({ claim_id: 'MET', topic: 'third_party_source_rights' })
    const otherProvider = claim({
      claim_id: 'OTHER-PROVIDER',
      topic: 'third_party_source_rights',
      provider_scope: ['getty'],
      applicability_requirements: [{ fact: 'jurisdiction', operator: 'equals', value: 'United States' }],
    })
    const result = lookupDiscoveredTopicClaims([occ], [met, otherProvider], facts({ jurisdiction: { included: [], excluded: [] } }), ['istock'])
    expect(result.matches).toEqual([{ claim: met, sourceGoalCategory: 'commercial_use' }])
    expect(result.diagnostics).toEqual([])
  })
})
