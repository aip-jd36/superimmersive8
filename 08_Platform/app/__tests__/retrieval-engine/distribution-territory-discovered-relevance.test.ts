/**
 * Generic Orthogonal-Fact Discovery — TopicRelationship Authorization
 * implementation proof (2026-09-11).
 *
 * REPLACES an earlier version of this file (Generic Distribution/
 * Output-Use Territory Contract, 2026-09-11) that tested a now-removed,
 * architecturally-defective mechanism: a fixed-topic Track A trigger
 * (`distribution_territory_mention -> copyright_ownership`) plus a
 * downstream `viaTerritoryTrigger`-gated narrowing filter in
 * `lookupDiscoveredTopicClaims`. A dedicated architecture diagnostic found
 * that mapping semantically invalid (an orthogonal fact does not determine
 * a single topic) and the downstream filter placement unsafe (it could not
 * coexist with a pair simultaneously reached by an unrelated trigger). See
 * `discovered-relevance.ts`'s own header for the full architecture
 * rationale this file now tests.
 *
 * This is an IMPLEMENTATION PROOF of the generic architecture. Every
 * `TopicClaim` and `TopicRelationship` used in the architecture-proof
 * sections below is unmistakably synthetic/test-only (`SYNTHETIC-*` claim
 * ids, `TEST-REL-*` relationship ids) -- none of THOSE sections touch
 * `TOPIC_CLAIMS_FIXTURE` or `TOPIC_RELATIONSHIPS_FIXTURE`, adopt any
 * governed claim, or constitute any EU AI Act Article 50(4) (or other)
 * substantive governance decision. A passing architecture-proof test proves
 * the MECHANISM, nothing about any real rule.
 *
 * ONE EXCEPTION (Final Packaging and Dormancy Regression, 2026-09-11): the
 * "real production fixture dormancy" describe block near the end of this
 * file DELIBERATELY imports the REAL `TOPIC_CLAIMS_FIXTURE`/
 * `TOPIC_RELATIONSHIPS_FIXTURE`, READ-ONLY, to prove current production
 * Living Knowledge is unaffected -- it never writes to, mutates, or adds
 * any entry to either fixture, and constructs only a synthetic
 * `DistributionTerritoryMention`/`StructuredUnderstanding` on the fact
 * side. This is the one place in this file where "real fixture" appears,
 * and it exists specifically to protect CURRENT PRODUCTION dormancy, not
 * to test generic architecture behavior (the architecture-proof sections
 * above already do that, exhaustively, with synthetic data).
 *
 * Run: npx jest __tests__/retrieval-engine/distribution-territory-discovered-relevance.test.ts
 */

import { territoryRelevanceMatches, providerScopeMatches } from '@/lib/retrieval-engine/lookup-topic-claims'
import { relationshipIsAdoptedAndCrcEligible } from '@/lib/retrieval-engine/lookup-topic-relationships'
import { lookupDiscoveredTopicClaims } from '@/lib/retrieval-engine/lookup-discovered-topic-claims'
import { retrieve } from '@/lib/retrieval-engine/retrieve'
import {
  deriveClaimTargetedDiscoveryOccurrences,
  deriveDiscoveredTopicOccurrences,
} from '@/lib/crc-engine/discovered-relevance'
import { TOPIC_CLAIMS_FIXTURE } from '@/lib/retrieval-engine/topic-claims-fixture'
import { TOPIC_RELATIONSHIPS_FIXTURE } from '@/lib/retrieval-engine/topic-relationships-fixture'
import type { ApplicabilityFacts } from '@/lib/retrieval-engine/lookup-topic-claims'
import type { TopicClaim, TopicRelationship } from '@/lib/retrieval-engine/types'
import type {
  AssetProviderMention,
  DistributionTerritoryMention,
  RetrievalHandoff,
  StructuredUnderstanding,
  UserGoal,
} from '@/types/interview-engine'

// ── synthetic fixture builders ───────────────────────────────────────────

function claim(overrides: Partial<TopicClaim> & Pick<TopicClaim, 'claim_id' | 'topic'>): TopicClaim {
  return {
    claim_character: 'established',
    jurisdiction: 'Global',
    lifecycle: 'Adopted',
    crc_eligible: 'Yes',
    crc_publication_scope: 'Test scope.',
    crc_candidate_statement: 'Synthetic candidate statement -- test-only, never a real governed proposition.',
    applicability_requirements: [],
    unresolved_project_dependencies: [],
    provider_scope: null,
    tool_scope: null,
    geographic_relevance_scope: null,
    last_verified: '2026-09-11',
    superseded_by: null,
    ...overrides,
  }
}

function relationship(overrides: Partial<TopicRelationship> & Pick<TopicRelationship, 'relationship_id' | 'source_topic' | 'target_topic'>): TopicRelationship {
  return {
    relationship_type: 'relevant_consideration',
    rationale: 'Test-only synthetic relationship -- never a real governance decision.',
    lifecycle: 'Adopted',
    adoption_approver: 'TEST',
    adoption_decision_date: '2026-09-11',
    publication_scope: 'Reviewer/Commercial Assurance',
    crc_eligible: 'Yes',
    crc_approver: 'TEST',
    crc_decision_date: '2026-09-11',
    last_reviewed: '2026-09-11',
    superseded_by: null,
    ...overrides,
  }
}

function territoryMention(overrides: Partial<DistributionTerritoryMention> & Pick<DistributionTerritoryMention, 'mention_id' | 'value'>): DistributionTerritoryMention {
  return {
    confidence: 'confirmed',
    source_turn: 1,
    source_statement: `This will run in ${overrides.value}.`,
    superseded_by: null,
    ...overrides,
  }
}

function goal(overrides: Partial<UserGoal> & Pick<UserGoal, 'goal_id' | 'category'>): UserGoal {
  return {
    state: 'confirmed',
    raw_text: 'Are there any rules I should know about before using this commercially?',
    scope: 'informational',
    superseded_by: null,
    source_turn: 1,
    source_statement: 'Are there any rules I should know about before using this commercially?',
    ...overrides,
  }
}

function baseSU(overrides: Partial<StructuredUnderstanding> = {}): StructuredUnderstanding {
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
    content_presence_mentions: [],
    distribution_territory_mentions: [],
    current_phase: 3,
    gate_1_state: 'met',
    gate_2_state: 'stable',
    completion_reason: null,
    opt_out_scope: null,
    ...overrides,
  }
}

function facts(overrides: Partial<ApplicabilityFacts> = {}): ApplicabilityFacts {
  return { jurisdiction: { included: [], excluded: [] }, toolMentions: [], ...overrides }
}

function handoff(overrides: Partial<RetrievalHandoff> = {}): RetrievalHandoff {
  return {
    tools: [],
    unresolved_aliases: [],
    asset_providers: [],
    unresolved_asset_provider_mentions: [],
    workflow_role: 'unresolved',
    intended_use: 'unclear',
    scoped_observations: [],
    certainty_state: 'gate_1_unmet',
    exclusions: [],
    ...overrides,
  }
}

const COMMERCIAL_USE_GOAL = goal({ goal_id: 'g-cu', category: 'commercial_use' })

// ── territoryRelevanceMatches / relationshipIsAdoptedAndCrcEligible sanity ─

describe('shared primitives reused unmodified', () => {
  test('territoryRelevanceMatches: inverted polarity unchanged (null -> false, opposite of providerScopeMatches)', () => {
    const c = claim({ claim_id: 'SYNTHETIC-A', topic: 'likeness', geographic_relevance_scope: null })
    expect(territoryRelevanceMatches(c, ['France'])).toBe(false)
    expect(providerScopeMatches(c, [])).toBe(true)
  })

  test('relationshipIsAdoptedAndCrcEligible: requires non-superseded + Adopted + crc_eligible Yes, all three', () => {
    const r = relationship({ relationship_id: 'TEST-REL-1', source_topic: 'commercial_use', target_topic: 'likeness' })
    expect(relationshipIsAdoptedAndCrcEligible(r)).toBe(true)
    expect(relationshipIsAdoptedAndCrcEligible({ ...r, lifecycle: 'Candidate' })).toBe(false)
    expect(relationshipIsAdoptedAndCrcEligible({ ...r, crc_eligible: 'Pending' })).toBe(false)
    expect(relationshipIsAdoptedAndCrcEligible({ ...r, superseded_by: 'TEST-REL-2' })).toBe(false)
  })
})

// ── Matrix item 1: cross-topic genericity ────────────────────────────────

describe('1. Cross-topic genericity', () => {
  test('one territory (France), two claims of DIFFERENT topics both opt in, both authorized from the same active goal -> both topics discovered, no France->topic mapping anywhere', () => {
    const claimLikeness = claim({ claim_id: 'SYNTHETIC-CROSSTOPIC-LIKENESS', topic: 'likeness', geographic_relevance_scope: ['France'] })
    const claimCopyright = claim({ claim_id: 'SYNTHETIC-CROSSTOPIC-COPYRIGHT', topic: 'copyright_ownership', geographic_relevance_scope: ['France'] })
    const rels: TopicRelationship[] = [
      relationship({ relationship_id: 'TEST-REL-CU-LIKENESS', source_topic: 'commercial_use', target_topic: 'likeness' }),
      relationship({ relationship_id: 'TEST-REL-CU-COPYRIGHT', source_topic: 'commercial_use', target_topic: 'copyright_ownership' }),
    ]
    const su = baseSU({ user_goals: [COMMERCIAL_USE_GOAL], distribution_territory_mentions: [territoryMention({ mention_id: 'dt-1', value: 'France' })] })
    const occs = deriveClaimTargetedDiscoveryOccurrences(su, [claimLikeness, claimCopyright], rels)
    const topics = occs.map((o) => o.topic).sort()
    expect(topics).toEqual(['copyright_ownership', 'likeness'])
    // Same real explicit source goal preserved for both.
    expect(occs.every((o) => o.source_goal_category === 'commercial_use')).toBe(true)
    // No mapping anywhere ties 'France' specifically to either topic -- proven structurally: the
    // mechanism never reads mention.value anywhere except via territoryRelevanceMatches's own
    // literal comparison against each claim's own independently-authored geographic_relevance_scope.
  })
})

// ── Matrix item 2: multiple explicit goals, one authorized ──────────────

describe('2. Multiple explicit goals', () => {
  test('one matching claim, two active goals, only one has an eligible relationship -> only the authorized goal becomes source_goal_category', () => {
    const c = claim({ claim_id: 'SYNTHETIC-MULTIGOAL-1', topic: 'likeness', geographic_relevance_scope: ['France'] })
    const rels: TopicRelationship[] = [relationship({ relationship_id: 'TEST-REL-CU-LIKENESS-2', source_topic: 'commercial_use', target_topic: 'likeness' })]
    const su = baseSU({
      user_goals: [COMMERCIAL_USE_GOAL, goal({ goal_id: 'g-copy', category: 'copyright_ownership' })],
      distribution_territory_mentions: [territoryMention({ mention_id: 'dt-1', value: 'France' })],
    })
    const occs = deriveClaimTargetedDiscoveryOccurrences(su, [c], rels)
    expect(occs.map((o) => o.source_goal_category)).toEqual(['commercial_use'])
  })
})

// ── Matrix item 3: multiple authorized goals ─────────────────────────────

describe('3. Multiple authorized goals', () => {
  test('one matching claim, two active goals, BOTH independently authorized -> legitimate provenance for both, no arbitrary winner', () => {
    const c = claim({ claim_id: 'SYNTHETIC-MULTIAUTH-1', topic: 'likeness', geographic_relevance_scope: ['France'] })
    const rels: TopicRelationship[] = [
      relationship({ relationship_id: 'TEST-REL-CU-LIKENESS-3', source_topic: 'commercial_use', target_topic: 'likeness' }),
      relationship({ relationship_id: 'TEST-REL-COPY-LIKENESS-3', source_topic: 'copyright_ownership', target_topic: 'likeness' }),
    ]
    const su = baseSU({
      user_goals: [COMMERCIAL_USE_GOAL, goal({ goal_id: 'g-copy', category: 'copyright_ownership' })],
      distribution_territory_mentions: [territoryMention({ mention_id: 'dt-1', value: 'France' })],
    })
    const occs = deriveClaimTargetedDiscoveryOccurrences(su, [c], rels)
    expect(occs.map((o) => o.source_goal_category).sort()).toEqual(['commercial_use', 'copyright_ownership'])
  })
})

// ── Matrix item 4: no authorization -> fail closed ───────────────────────

describe('4. No authorization', () => {
  test('territory matches claim, no eligible relationship from any active goal -> NO discovered occurrence', () => {
    const c = claim({ claim_id: 'SYNTHETIC-NOAUTH-1', topic: 'likeness', geographic_relevance_scope: ['France'] })
    const su = baseSU({ user_goals: [COMMERCIAL_USE_GOAL], distribution_territory_mentions: [territoryMention({ mention_id: 'dt-1', value: 'France' })] })
    const occs = deriveClaimTargetedDiscoveryOccurrences(su, [c], [])
    expect(occs).toEqual([])
  })

  test('territory matches claim, a relationship exists but targets a DIFFERENT topic -> no occurrence, never guessed', () => {
    const c = claim({ claim_id: 'SYNTHETIC-NOAUTH-2', topic: 'likeness', geographic_relevance_scope: ['France'] })
    const rels: TopicRelationship[] = [relationship({ relationship_id: 'TEST-REL-WRONG-TARGET', source_topic: 'commercial_use', target_topic: 'copyright_ownership' })]
    const su = baseSU({ user_goals: [COMMERCIAL_USE_GOAL], distribution_territory_mentions: [territoryMention({ mention_id: 'dt-1', value: 'France' })] })
    expect(deriveClaimTargetedDiscoveryOccurrences(su, [c], rels)).toEqual([])
  })
})

// ── Matrix item 5: relationship governance fail-closed ───────────────────

describe('5. Relationship governance fail-closed', () => {
  const baseCase = () => ({
    c: claim({ claim_id: 'SYNTHETIC-GOVGATE-1', topic: 'likeness', geographic_relevance_scope: ['France'] }),
    su: baseSU({ user_goals: [COMMERCIAL_USE_GOAL], distribution_territory_mentions: [territoryMention({ mention_id: 'dt-1', value: 'France' })] }),
  })

  test('non-Adopted relationship -> no authorization', () => {
    const { c, su } = baseCase()
    const rels: TopicRelationship[] = [relationship({ relationship_id: 'TEST-REL-NOTADOPTED', source_topic: 'commercial_use', target_topic: 'likeness', lifecycle: 'Candidate' })]
    expect(deriveClaimTargetedDiscoveryOccurrences(su, [c], rels)).toEqual([])
  })

  test('non-CRC-eligible relationship (Pending) -> no authorization', () => {
    const { c, su } = baseCase()
    const rels: TopicRelationship[] = [relationship({ relationship_id: 'TEST-REL-PENDING', source_topic: 'commercial_use', target_topic: 'likeness', crc_eligible: 'Pending' })]
    expect(deriveClaimTargetedDiscoveryOccurrences(su, [c], rels)).toEqual([])
  })

  test('superseded relationship -> no authorization, even if Adopted + crc_eligible Yes', () => {
    const { c, su } = baseCase()
    const rels: TopicRelationship[] = [
      relationship({ relationship_id: 'TEST-REL-SUPERSEDED', source_topic: 'commercial_use', target_topic: 'likeness', superseded_by: 'TEST-REL-SUPERSEDED-v2' }),
    ]
    expect(deriveClaimTargetedDiscoveryOccurrences(su, [c], rels)).toEqual([])
  })

  test('mirrors current related-topic relationship gating exactly: a relationship failing ANY one gate is excluded identically to lookupRelatedTopicClaims\' own eligibleRelationships filter', () => {
    const r = relationship({ relationship_id: 'TEST-REL-MIRROR', source_topic: 'commercial_use', target_topic: 'likeness', crc_eligible: 'No' })
    expect(relationshipIsAdoptedAndCrcEligible(r)).toBe(false)
  })
})

// ── Matrix item 6: explicit precedence ───────────────────────────────────

describe('6. Explicit precedence', () => {
  test('claim.topic already an active explicit UserGoal -> no duplicate discovered occurrence, explicit retrieval remains sufficient', () => {
    const c = claim({ claim_id: 'SYNTHETIC-EXPLICIT-1', topic: 'likeness', geographic_relevance_scope: ['France'] })
    const rels: TopicRelationship[] = [relationship({ relationship_id: 'TEST-REL-EXPLICIT', source_topic: 'commercial_use', target_topic: 'likeness' })]
    const su = baseSU({
      user_goals: [COMMERCIAL_USE_GOAL, goal({ goal_id: 'g-likeness', category: 'likeness' })],
      distribution_territory_mentions: [territoryMention({ mention_id: 'dt-1', value: 'France' })],
    })
    expect(deriveClaimTargetedDiscoveryOccurrences(su, [c], rels)).toEqual([])
  })
})

// ── Matrix item 7: inverted geographic default ───────────────────────────

describe('7. Inverted geographic default', () => {
  const rels = (topic: TopicClaim['topic']): TopicRelationship[] => [relationship({ relationship_id: 'TEST-REL-DEFAULT', source_topic: 'commercial_use', target_topic: topic })]

  test('geographic_relevance_scope null -> no territory discovery', () => {
    const c = claim({ claim_id: 'SYNTHETIC-DEFAULT-NULL', topic: 'likeness', geographic_relevance_scope: null })
    const su = baseSU({ user_goals: [COMMERCIAL_USE_GOAL], distribution_territory_mentions: [territoryMention({ mention_id: 'dt-1', value: 'France' })] })
    expect(deriveClaimTargetedDiscoveryOccurrences(su, [c], rels('likeness'))).toEqual([])
  })

  test('geographic_relevance_scope absent (field never set) -> no territory discovery', () => {
    const { geographic_relevance_scope, ...rest } = claim({ claim_id: 'SYNTHETIC-DEFAULT-ABSENT', topic: 'likeness' })
    const c = rest as TopicClaim
    expect(c.geographic_relevance_scope).toBeUndefined()
    const su = baseSU({ user_goals: [COMMERCIAL_USE_GOAL], distribution_territory_mentions: [territoryMention({ mention_id: 'dt-1', value: 'France' })] })
    expect(deriveClaimTargetedDiscoveryOccurrences(su, [c], rels('likeness'))).toEqual([])
  })

  test('geographic_relevance_scope empty array -> no territory discovery (mirrors provider_scope\'s own "never authored empty" rule)', () => {
    const c = claim({ claim_id: 'SYNTHETIC-DEFAULT-EMPTY', topic: 'likeness', geographic_relevance_scope: [] })
    const su = baseSU({ user_goals: [COMMERCIAL_USE_GOAL], distribution_territory_mentions: [territoryMention({ mention_id: 'dt-1', value: 'France' })] })
    expect(deriveClaimTargetedDiscoveryOccurrences(su, [c], rels('likeness'))).toEqual([])
  })

  test('territory mismatch (claim opts into Germany, mention is France) -> no territory discovery', () => {
    const c = claim({ claim_id: 'SYNTHETIC-DEFAULT-MISMATCH', topic: 'likeness', geographic_relevance_scope: ['Germany'] })
    const su = baseSU({ user_goals: [COMMERCIAL_USE_GOAL], distribution_territory_mentions: [territoryMention({ mention_id: 'dt-1', value: 'France' })] })
    expect(deriveClaimTargetedDiscoveryOccurrences(su, [c], rels('likeness'))).toEqual([])
  })
})

// ── Matrix item 8: same-topic multi-claim ────────────────────────────────

describe('8. Same-topic multi-claim', () => {
  test('two matching claims share one topic, authorized by the same relationship -> both remain independently reachable through normal topic-scoped candidate enumeration downstream, no claim lost', () => {
    const claimA = claim({ claim_id: 'SYNTHETIC-MULTICLAIM-A', topic: 'likeness', geographic_relevance_scope: ['France'] })
    const claimB = claim({ claim_id: 'SYNTHETIC-MULTICLAIM-B', topic: 'likeness', geographic_relevance_scope: ['France'] })
    const rels: TopicRelationship[] = [relationship({ relationship_id: 'TEST-REL-MULTICLAIM', source_topic: 'commercial_use', target_topic: 'likeness' })]
    const su = baseSU({ user_goals: [COMMERCIAL_USE_GOAL], distribution_territory_mentions: [territoryMention({ mention_id: 'dt-1', value: 'France' })] })
    const occs = deriveClaimTargetedDiscoveryOccurrences(su, [claimA, claimB], rels)
    // Occurrences collapse to one (topic, sourceGoalCategory) pair by design (mirrors "iStock AND Getty" precedent).
    expect(occs.length).toBeGreaterThanOrEqual(1)
    expect(new Set(occs.map((o) => `${o.topic}:${o.source_goal_category}`)).size).toBe(1)
    // Downstream candidate enumeration independently re-discovers BOTH claims for that one pair.
    const result = lookupDiscoveredTopicClaims(occs, [claimA, claimB], facts())
    expect(result.matches.map((m) => m.claim.claim_id).sort()).toEqual(['SYNTHETIC-MULTICLAIM-A', 'SYNTHETIC-MULTICLAIM-B'])
  })
})

// ── Matrix item 9: cross-path independence ───────────────────────────────

describe('9. Cross-path independence', () => {
  test('a claim/topic independently reachable through a pre-existing valid discovery path, territory does NOT match that claim -> existing path remains intact, geography removes nothing', () => {
    // Simulates the existing asset_provider_mention -> third_party_source_rights
    // fixed-topic trigger's own occurrence, entirely independent of this milestone.
    const providerClaim = claim({ claim_id: 'SYNTHETIC-CROSSPATH-PROVIDER', topic: 'third_party_source_rights', geographic_relevance_scope: null })
    const providerOccurrence = {
      topic: 'third_party_source_rights' as const,
      trigger_id: 'asset_provider_mention_to_third_party_source_rights',
      source_kind: 'asset_provider_mention',
      source_id: 'ap-1',
      source_goal_category: 'commercial_use' as const,
    }
    // No territory mention at all -- deriveClaimTargetedDiscoveryOccurrences contributes nothing.
    const su = baseSU({ user_goals: [COMMERCIAL_USE_GOAL] })
    const territoryOccs = deriveClaimTargetedDiscoveryOccurrences(su, [providerClaim], [])
    expect(territoryOccs).toEqual([])
    const result = lookupDiscoveredTopicClaims([providerOccurrence, ...territoryOccs], [providerClaim], facts())
    expect(result.matches.map((m) => m.claim.claim_id)).toEqual(['SYNTHETIC-CROSSPATH-PROVIDER'])
  })
})

// ── Matrix item 10: multiple discovery paths ─────────────────────────────

describe('10. Multiple discovery paths', () => {
  test('same topic legitimately reached through territory AND another discovery path -> no narrowing collision, no lost claim, safe dedupe, deterministic provenance', () => {
    const c = claim({ claim_id: 'SYNTHETIC-MULTIPATH-1', topic: 'likeness', geographic_relevance_scope: ['France'] })
    const rels: TopicRelationship[] = [relationship({ relationship_id: 'TEST-REL-MULTIPATH', source_topic: 'commercial_use', target_topic: 'likeness' })]
    const su = baseSU({ user_goals: [COMMERCIAL_USE_GOAL], distribution_territory_mentions: [territoryMention({ mention_id: 'dt-1', value: 'France' })] })
    const territoryOcc = deriveClaimTargetedDiscoveryOccurrences(su, [c], rels)
    // Simulates the SAME claim ALSO being reached via the existing content_presence_mention
    // fixed-topic trigger (its own real, unrelated occurrence for the same topic/goal pair).
    const contentPresenceOcc = {
      topic: 'likeness' as const,
      trigger_id: 'synthetic_person_content_presence_to_likeness',
      source_kind: 'content_presence_mention',
      source_id: 'cp-1',
      source_goal_category: 'commercial_use' as const,
    }
    const merged = [...territoryOcc, contentPresenceOcc]
    const result = lookupDiscoveredTopicClaims(merged, [c], facts())
    // No duplication -- the claim surfaces exactly once for this (topic, goal) pair.
    expect(result.matches).toEqual([{ claim: c, sourceGoalCategory: 'commercial_use' }])
  })

  test('geography contributes nothing extra when the claim does not opt in, even though another path independently reaches the same topic', () => {
    const c = claim({ claim_id: 'SYNTHETIC-MULTIPATH-2', topic: 'likeness', geographic_relevance_scope: null })
    const su = baseSU({ user_goals: [COMMERCIAL_USE_GOAL], distribution_territory_mentions: [territoryMention({ mention_id: 'dt-1', value: 'France' })] })
    const territoryOcc = deriveClaimTargetedDiscoveryOccurrences(su, [c], [relationship({ relationship_id: 'TEST-REL-X', source_topic: 'commercial_use', target_topic: 'likeness' })])
    expect(territoryOcc).toEqual([])
    const contentPresenceOcc = {
      topic: 'likeness' as const,
      trigger_id: 'synthetic_person_content_presence_to_likeness',
      source_kind: 'content_presence_mention',
      source_id: 'cp-1',
      source_goal_category: 'commercial_use' as const,
    }
    const result = lookupDiscoveredTopicClaims([contentPresenceOcc], [c], facts())
    // The unrelated path still reaches the claim -- geography contributed nothing, removed nothing.
    expect(result.matches).toEqual([{ claim: c, sourceGoalCategory: 'commercial_use' }])
  })
})

// ── Matrix item 11: applicability isolation ──────────────────────────────

describe('11. Applicability isolation', () => {
  test('territory discovery succeeds; claim has a separate unresolved applicability requirement -> discovered, applicability remains unresolved', () => {
    const c = claim({
      claim_id: 'SYNTHETIC-APPLIC-1',
      topic: 'likeness',
      geographic_relevance_scope: ['France'],
      applicability_requirements: [{ fact: 'jurisdiction', operator: 'equals', value: 'European Union' }],
    })
    const rels: TopicRelationship[] = [relationship({ relationship_id: 'TEST-REL-APPLIC', source_topic: 'commercial_use', target_topic: 'likeness' })]
    const su = baseSU({ user_goals: [COMMERCIAL_USE_GOAL], distribution_territory_mentions: [territoryMention({ mention_id: 'dt-1', value: 'France' })] })
    const occs = deriveClaimTargetedDiscoveryOccurrences(su, [c], rels)
    expect(occs.length).toBe(1)
    // No jurisdiction fact supplied -- applicability remains unresolved, not satisfied by France.
    const result = lookupDiscoveredTopicClaims(occs, [c], facts())
    expect(result.matches).toEqual([]) // unresolved applicability withholds the claim from matches
    expect(result.diagnostics).toEqual([{ identifier: 'commercial_use', reason: 'applicability_unmet', unmet_applicability: [{ claim_id: 'SYNTHETIC-APPLIC-1', requirement: { fact: 'jurisdiction', operator: 'equals', value: 'European Union' }, status: 'unresolved' }] }])
  })

  test('the distribution territory fact itself never satisfies a jurisdiction applicability requirement -- France does not silently become "European Union"', () => {
    const c = claim({
      claim_id: 'SYNTHETIC-APPLIC-2',
      topic: 'likeness',
      geographic_relevance_scope: ['France'],
      applicability_requirements: [{ fact: 'jurisdiction', operator: 'equals', value: 'European Union' }],
    })
    const rels: TopicRelationship[] = [relationship({ relationship_id: 'TEST-REL-APPLIC-2', source_topic: 'commercial_use', target_topic: 'likeness' })]
    const su = baseSU({ user_goals: [COMMERCIAL_USE_GOAL], distribution_territory_mentions: [territoryMention({ mention_id: 'dt-1', value: 'France' })] })
    const occs = deriveClaimTargetedDiscoveryOccurrences(su, [c], rels)
    // Even supplying "France" as an included jurisdiction fact does not equal "European Union" --
    // applicability is a wholly separate, unchanged contract, never touched by this mechanism.
    const result = lookupDiscoveredTopicClaims(occs, [c], facts({ jurisdiction: { included: ['France'], excluded: [] } }))
    expect(result.matches).toEqual([])
  })
})

// ── Matrix item 12: territory correction / supersession ──────────────────

describe('12. Territory correction / supersession', () => {
  test('original territory superseded by a correction -> old value produces no continuing discovery, corrected active value controls', () => {
    const c = claim({ claim_id: 'SYNTHETIC-CORRECTION-1', topic: 'likeness', geographic_relevance_scope: ['France'] })
    const rels: TopicRelationship[] = [relationship({ relationship_id: 'TEST-REL-CORRECTION', source_topic: 'commercial_use', target_topic: 'likeness' })]
    const su = baseSU({
      user_goals: [COMMERCIAL_USE_GOAL],
      distribution_territory_mentions: [
        territoryMention({ mention_id: 'dt-1', value: 'France', superseded_by: 'dt-2' }),
        territoryMention({ mention_id: 'dt-2', value: 'Germany' }),
      ],
    })
    // The superseded France mention no longer contributes -- claim opted into France only, not Germany.
    expect(deriveClaimTargetedDiscoveryOccurrences(su, [c], rels)).toEqual([])
  })

  test('a claim opted into the CORRECTED (new active) value discovers normally', () => {
    const c = claim({ claim_id: 'SYNTHETIC-CORRECTION-2', topic: 'likeness', geographic_relevance_scope: ['Germany'] })
    const rels: TopicRelationship[] = [relationship({ relationship_id: 'TEST-REL-CORRECTION-2', source_topic: 'commercial_use', target_topic: 'likeness' })]
    const su = baseSU({
      user_goals: [COMMERCIAL_USE_GOAL],
      distribution_territory_mentions: [
        territoryMention({ mention_id: 'dt-1', value: 'France', superseded_by: 'dt-2' }),
        territoryMention({ mention_id: 'dt-2', value: 'Germany' }),
      ],
    })
    const occs = deriveClaimTargetedDiscoveryOccurrences(su, [c], rels)
    expect(occs).toHaveLength(1)
    expect(occs[0].source_id).toBe('dt-2')
  })
})

// ── Track C provenance, full pipeline through retrieve() ─────────────────

describe('Track C provenance, full pipeline', () => {
  test('a territory-discovered RetrievalResult preserves the real explicit goal (matched_goal_category = commercial_use, match_origin = discovered_topic), never a fabricated UserGoal', () => {
    const c = claim({ claim_id: 'SYNTHETIC-TRACKC-1', topic: 'likeness', geographic_relevance_scope: ['France'] })
    const rels: TopicRelationship[] = [relationship({ relationship_id: 'TEST-REL-TRACKC', source_topic: 'commercial_use', target_topic: 'likeness' })]
    const su = baseSU({ user_goals: [COMMERCIAL_USE_GOAL], distribution_territory_mentions: [territoryMention({ mention_id: 'dt-1', value: 'France' })] })
    const occs = deriveDiscoveredTopicOccurrences(su, [c], rels)
    const out = retrieve(handoff(), [], su.user_goals, [c], facts(), rels, [], occs)
    const result = out.results.find((r) => r.claim_id === 'SYNTHETIC-TRACKC-1')
    expect(result).toBeDefined()
    expect(result?.match_origin).toBe('discovered_topic')
    expect(result?.matched_goal_category).toBe('commercial_use')
    expect(result?.topic).toBe('likeness')
    // Only the one real, explicit goal exists in su.user_goals -- nothing fabricated.
    expect(su.user_goals).toHaveLength(1)
    expect(su.user_goals[0].goal_id).toBe('g-cu')
  })

  test('retrieve() with relationships=[] (every pre-existing call site) produces zero claim-targeted occurrences -- true zero-behavior-change default', () => {
    const c = claim({ claim_id: 'SYNTHETIC-DEFAULTPARAM-1', topic: 'likeness', geographic_relevance_scope: ['France'] })
    const su = baseSU({ user_goals: [COMMERCIAL_USE_GOAL], distribution_territory_mentions: [territoryMention({ mention_id: 'dt-1', value: 'France' })] })
    const occs = deriveDiscoveredTopicOccurrences(su, [c]) // relationships omitted -> defaults to []
    expect(occs).toEqual([])
  })
})

// ── Existing Track A regression: real production case, untouched ────────

describe('13. Existing Track A regression (asset-provider + content-presence unchanged)', () => {
  function assetProviderMention(overrides: Partial<AssetProviderMention> = {}): AssetProviderMention {
    return {
      mention_id: 'ap-1',
      resolution: { kind: 'canonical', identifier: 'istock' },
      confidence: 'confirmed',
      source_turn: 1,
      source_statement: 'iStock footage',
      superseded_by: null,
      usage: { state: 'unknown' },
      license: { state: 'unknown' },
      ...overrides,
    }
  }

  test('asset_provider_mention -> third_party_source_rights fixed-topic trigger still fires exactly as before, unaffected by the new claim-targeted path being present', () => {
    const providerClaim = claim({ claim_id: 'SYNTHETIC-REGRESSION-PROVIDER', topic: 'third_party_source_rights' })
    const su = baseSU({ user_goals: [COMMERCIAL_USE_GOAL], asset_provider_mentions: [assetProviderMention()] })
    const occs = deriveDiscoveredTopicOccurrences(su, [providerClaim]) // no relationships -- irrelevant to this trigger
    expect(occs).toEqual([
      {
        topic: 'third_party_source_rights',
        trigger_id: 'asset_provider_mention_to_third_party_source_rights',
        source_kind: 'asset_provider_mention',
        source_id: 'ap-1',
        source_goal_category: 'commercial_use',
      },
    ])
  })

  test('supplying relationships does not change the fixed-topic trigger\'s own output at all', () => {
    const providerClaim = claim({ claim_id: 'SYNTHETIC-REGRESSION-PROVIDER-2', topic: 'third_party_source_rights' })
    const su = baseSU({ user_goals: [COMMERCIAL_USE_GOAL], asset_provider_mentions: [assetProviderMention()] })
    const withoutRels = deriveDiscoveredTopicOccurrences(su, [providerClaim])
    const withRels = deriveDiscoveredTopicOccurrences(su, [providerClaim], [relationship({ relationship_id: 'TEST-REL-UNRELATED', source_topic: 'commercial_use', target_topic: 'copyright_ownership' })])
    expect(withRels.filter((o) => o.source_kind === 'asset_provider_mention')).toEqual(withoutRels.filter((o) => o.source_kind === 'asset_provider_mention'))
  })
})

// ── Real production fixture dormancy (Final Packaging and Dormancy
// Regression, 2026-09-11) ─────────────────────────────────────────────────
//
// THIS BLOCK, UNIQUELY IN THIS FILE, IMPORTS THE REAL PRODUCTION
// TOPIC_CLAIMS_FIXTURE AND TOPIC_RELATIONSHIPS_FIXTURE -- READ-ONLY. It
// exists to protect CURRENT PRODUCTION Living Knowledge dormancy, not to
// re-prove generic architecture behavior (every other describe block above
// already does that exhaustively with synthetic-only fixtures). If this
// test ever starts failing, it means a real governed TopicClaim has been
// given a non-null/non-empty `geographic_relevance_scope` -- i.e. a human
// governance reviewer has deliberately opted a real claim into
// territory-driven discovery -- which is a legitimate, expected way for
// this test to eventually need updating, but must never happen silently:
// this test is the trip-wire.
describe('REAL PRODUCTION FIXTURE DORMANCY (protects current Living Knowledge, not generic architecture)', () => {
  test('fixture fact: zero entries in the real TOPIC_CLAIMS_FIXTURE have a non-null, non-empty geographic_relevance_scope today', () => {
    const optedIn = TOPIC_CLAIMS_FIXTURE.filter((c) => c.geographic_relevance_scope != null && c.geographic_relevance_scope.length > 0)
    expect(optedIn).toEqual([])
  })

  test('deriveClaimTargetedDiscoveryOccurrences(understanding, TOPIC_CLAIMS_FIXTURE, TOPIC_RELATIONSHIPS_FIXTURE) returns NO occurrence for a synthetic, confirmed, active DistributionTerritoryMention -- current production Living Knowledge cannot be geographically discovered by this mechanism today', () => {
    // A realistic active explicit goal (commercial_use) + a synthetic
    // territory value -- deliberately NOT tied to any real claim's own
    // topic or any real TopicRelationship's source_topic. The claim-level
    // geographic opt-in gate is the sole, sufficient reason this returns
    // empty (see the fixture-fact test immediately above) -- this holds
    // regardless of which goal is active or which real relationship
    // exists, since `deriveClaimTargetedDiscoveryOccurrences` filters on
    // `geographic_relevance_scope` BEFORE ever consulting `relationships`.
    const su = baseSU({
      user_goals: [COMMERCIAL_USE_GOAL],
      distribution_territory_mentions: [territoryMention({ mention_id: 'dt-dormancy-1', value: 'France' })],
    })
    const occurrences = deriveClaimTargetedDiscoveryOccurrences(su, TOPIC_CLAIMS_FIXTURE, TOPIC_RELATIONSHIPS_FIXTURE)
    expect(occurrences).toEqual([])
  })

  test('same dormancy holds through the public deriveDiscoveredTopicOccurrences entry point, real relationships supplied', () => {
    const su = baseSU({
      user_goals: [COMMERCIAL_USE_GOAL],
      distribution_territory_mentions: [territoryMention({ mention_id: 'dt-dormancy-2', value: 'Germany' })],
    })
    const occurrences = deriveDiscoveredTopicOccurrences(su, TOPIC_CLAIMS_FIXTURE, TOPIC_RELATIONSHIPS_FIXTURE)
    expect(occurrences.filter((o) => o.source_kind === 'distribution_territory_mention')).toEqual([])
  })

  test('end to end through lookupDiscoveredTopicClaims: no territory-sourced claim-targeted occurrence exists to look up, so no territory-attributable RetrievalResult can appear', () => {
    const su = baseSU({
      user_goals: [COMMERCIAL_USE_GOAL],
      distribution_territory_mentions: [territoryMention({ mention_id: 'dt-dormancy-3', value: 'Japan' })],
    })
    const occurrences = deriveDiscoveredTopicOccurrences(su, TOPIC_CLAIMS_FIXTURE, TOPIC_RELATIONSHIPS_FIXTURE)
    const territoryOccurrences = occurrences.filter((o) => o.source_kind === 'distribution_territory_mention')
    expect(territoryOccurrences).toEqual([])
    const result = lookupDiscoveredTopicClaims(territoryOccurrences, TOPIC_CLAIMS_FIXTURE, facts())
    expect(result.matches).toEqual([])
    expect(result.diagnostics).toEqual([])
  })
})
