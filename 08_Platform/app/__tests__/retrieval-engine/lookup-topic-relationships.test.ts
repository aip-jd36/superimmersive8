/**
 * Governed topic relationship lookup deterministic tests (Governed Topic
 * Relationships implementation milestone, 2026-08-16). No live model needed
 * -- pure functions, same discipline as lookup-topic-claims.test.ts, whose
 * `goal`/`claim`/`facts` helper shapes this file mirrors exactly.
 */

import { lookupRelatedTopicClaims } from '@/lib/retrieval-engine/lookup-topic-relationships'
import type { ApplicabilityFacts } from '@/lib/retrieval-engine/lookup-topic-claims'
import type { TopicClaim, TopicRelationship } from '@/lib/retrieval-engine/types'
import type { UserGoal } from '@/types/interview-engine'

function goal(overrides: Partial<UserGoal> & Pick<UserGoal, 'goal_id' | 'category'>): UserGoal {
  return {
    state: 'confirmed',
    raw_text: 'placeholder',
    scope: 'informational',
    superseded_by: null,
    source_turn: 1,
    source_statement: 'placeholder',
    ...overrides,
  }
}

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
    last_verified: '2026-08-16',
    superseded_by: null,
    ...overrides,
  }
}

function relationship(overrides: Partial<TopicRelationship> & Pick<TopicRelationship, 'relationship_id' | 'source_topic' | 'target_topic'>): TopicRelationship {
  return {
    relationship_type: 'relevant_consideration',
    rationale: 'Structural rationale placeholder.',
    lifecycle: 'Adopted',
    adoption_approver: 'JD (PM)',
    adoption_decision_date: '2026-08-16',
    publication_scope: 'Reviewer/Commercial Assurance',
    crc_eligible: 'Yes',
    crc_approver: 'JD (PM)',
    crc_decision_date: '2026-08-16',
    last_reviewed: '2026-08-16',
    superseded_by: null,
    ...overrides,
  }
}

function facts(overrides: Partial<ApplicabilityFacts> = {}): ApplicabilityFacts {
  return { jurisdiction: { state: 'unknown' }, toolMentions: [], ...overrides }
}

describe('lookupRelatedTopicClaims -- one-hop resolution', () => {
  test('an eligible relationship + eligible target claim -> the claim is retrieved as a related match', () => {
    const g = goal({ goal_id: 'g-1', category: 'copyright_ownership' })
    const rel = relationship({ relationship_id: 'REL-1', source_topic: 'copyright_ownership', target_topic: 'copyrightability' })
    const c = claim({ claim_id: 'C-1', topic: 'copyrightability' })
    const result = lookupRelatedTopicClaims([g], [rel], [c], facts())
    expect(result.matches).toEqual([{ claim: c, relationship: rel, sourceGoalCategory: 'copyright_ownership' }])
    expect(result.diagnostics).toEqual([])
  })

  test('a goal with no active relationship for its category -> no matches, no diagnostics', () => {
    const g = goal({ goal_id: 'g-1', category: 'likeness' })
    const rel = relationship({ relationship_id: 'REL-1', source_topic: 'copyright_ownership', target_topic: 'copyrightability' })
    const c = claim({ claim_id: 'C-1', topic: 'copyrightability' })
    const result = lookupRelatedTopicClaims([g], [rel], [c], facts())
    expect(result.matches).toEqual([])
    expect(result.diagnostics).toEqual([])
  })

  test('a superseded or declined goal is never looked up', () => {
    const rel = relationship({ relationship_id: 'REL-1', source_topic: 'copyright_ownership', target_topic: 'copyrightability' })
    const c = claim({ claim_id: 'C-1', topic: 'copyrightability' })
    const superseded = goal({ goal_id: 'g-1', category: 'copyright_ownership', superseded_by: 'g-2' })
    const declined = goal({ goal_id: 'g-2', category: 'copyright_ownership', state: 'declined' })
    expect(lookupRelatedTopicClaims([superseded], [rel], [c], facts()).matches).toEqual([])
    expect(lookupRelatedTopicClaims([declined], [rel], [c], facts()).matches).toEqual([])
  })

  test('a superseded relationship version is never used', () => {
    const g = goal({ goal_id: 'g-1', category: 'copyright_ownership' })
    const rel = relationship({ relationship_id: 'REL-1-v1', source_topic: 'copyright_ownership', target_topic: 'copyrightability', superseded_by: 'REL-1-v2' })
    const c = claim({ claim_id: 'C-1', topic: 'copyrightability' })
    expect(lookupRelatedTopicClaims([g], [rel], [c], facts()).matches).toEqual([])
  })

  test('a superseded target claim is never retrieved via a relationship', () => {
    const g = goal({ goal_id: 'g-1', category: 'copyright_ownership' })
    const rel = relationship({ relationship_id: 'REL-1', source_topic: 'copyright_ownership', target_topic: 'copyrightability' })
    const c = claim({ claim_id: 'C-1', topic: 'copyrightability', superseded_by: 'C-1-v2' })
    expect(lookupRelatedTopicClaims([g], [rel], [c], facts()).matches).toEqual([])
  })

  test('no target claims exist under target_topic at all -> no_topic_claim diagnostic, attributed to the originating goal', () => {
    const g = goal({ goal_id: 'g-1', category: 'copyright_ownership' })
    const rel = relationship({ relationship_id: 'REL-1', source_topic: 'copyright_ownership', target_topic: 'copyrightability' })
    const result = lookupRelatedTopicClaims([g], [rel], [], facts())
    expect(result.matches).toEqual([])
    expect(result.diagnostics).toEqual([{ identifier: 'copyright_ownership', reason: 'no_topic_claim' }])
  })
})

describe('lookupRelatedTopicClaims -- directionality (no automatic inverse)', () => {
  test('copyright_ownership -> copyrightability does NOT imply the reverse for a copyrightability goal', () => {
    const g = goal({ goal_id: 'g-1', category: 'copyrightability' })
    const rel = relationship({ relationship_id: 'REL-1', source_topic: 'copyright_ownership', target_topic: 'copyrightability' })
    const ownershipClaim = claim({ claim_id: 'C-OWN', topic: 'copyright_ownership' })
    const result = lookupRelatedTopicClaims([g], [rel], [ownershipClaim], facts())
    expect(result.matches).toEqual([])
  })
})

describe('lookupRelatedTopicClaims -- one-hop only (no transitive expansion)', () => {
  test('A -> B -> C: a goal in A retrieves B, never recursively retrieves C', () => {
    const g = goal({ goal_id: 'g-1', category: 'copyright_ownership' })
    const relAB = relationship({ relationship_id: 'REL-A-B', source_topic: 'copyright_ownership', target_topic: 'copyrightability' })
    const relBC = relationship({ relationship_id: 'REL-B-C', source_topic: 'copyrightability', target_topic: 'likeness' })
    const claimB = claim({ claim_id: 'C-B', topic: 'copyrightability' })
    const claimC = claim({ claim_id: 'C-C', topic: 'likeness' })
    const result = lookupRelatedTopicClaims([g], [relAB, relBC], [claimB, claimC], facts())
    expect(result.matches).toHaveLength(1)
    expect(result.matches[0].claim.claim_id).toBe('C-B')
    expect(result.matches.some((m) => m.claim.claim_id === 'C-C')).toBe(false)
  })
})

describe('lookupRelatedTopicClaims -- double CRC gate (load-bearing)', () => {
  test('relationship CRC Yes + claim CRC Yes -> allowed', () => {
    const g = goal({ goal_id: 'g-1', category: 'copyright_ownership' })
    const rel = relationship({ relationship_id: 'REL-1', source_topic: 'copyright_ownership', target_topic: 'copyrightability', crc_eligible: 'Yes' })
    const c = claim({ claim_id: 'C-1', topic: 'copyrightability', crc_eligible: 'Yes' })
    expect(lookupRelatedTopicClaims([g], [rel], [c], facts()).matches).toHaveLength(1)
  })

  test('relationship CRC Pending + claim CRC Yes -> blocked (no matches at all -- relationship never enters the candidate loop)', () => {
    const g = goal({ goal_id: 'g-1', category: 'copyright_ownership' })
    const rel = relationship({ relationship_id: 'REL-1', source_topic: 'copyright_ownership', target_topic: 'copyrightability', crc_eligible: 'Pending' })
    const c = claim({ claim_id: 'C-1', topic: 'copyrightability', crc_eligible: 'Yes' })
    const result = lookupRelatedTopicClaims([g], [rel], [c], facts())
    expect(result.matches).toEqual([])
    expect(result.diagnostics).toEqual([])
  })

  test('relationship CRC Yes + claim CRC Pending -> blocked, not_adopted_or_eligible diagnostic attributed to the originating goal', () => {
    const g = goal({ goal_id: 'g-1', category: 'copyright_ownership' })
    const rel = relationship({ relationship_id: 'REL-1', source_topic: 'copyright_ownership', target_topic: 'copyrightability', crc_eligible: 'Yes' })
    const c = claim({ claim_id: 'C-1', topic: 'copyrightability', crc_eligible: 'Pending' })
    const result = lookupRelatedTopicClaims([g], [rel], [c], facts())
    expect(result.matches).toEqual([])
    expect(result.diagnostics).toEqual([{ identifier: 'copyright_ownership', reason: 'not_adopted_or_eligible' }])
  })

  test('relationship CRC Pending + claim CRC Pending -> blocked', () => {
    const g = goal({ goal_id: 'g-1', category: 'copyright_ownership' })
    const rel = relationship({ relationship_id: 'REL-1', source_topic: 'copyright_ownership', target_topic: 'copyrightability', crc_eligible: 'Pending' })
    const c = claim({ claim_id: 'C-1', topic: 'copyrightability', crc_eligible: 'Pending' })
    expect(lookupRelatedTopicClaims([g], [rel], [c], facts()).matches).toEqual([])
  })

  test('relationship not Adopted (Under Review) + claim CRC Yes -> blocked', () => {
    const g = goal({ goal_id: 'g-1', category: 'copyright_ownership' })
    const rel = relationship({ relationship_id: 'REL-1', source_topic: 'copyright_ownership', target_topic: 'copyrightability', lifecycle: 'Under Review', crc_eligible: 'Yes' })
    const c = claim({ claim_id: 'C-1', topic: 'copyrightability', crc_eligible: 'Yes' })
    expect(lookupRelatedTopicClaims([g], [rel], [c], facts()).matches).toEqual([])
  })

  test('relationship CRC Yes + claim not Adopted (Candidate) -> blocked', () => {
    const g = goal({ goal_id: 'g-1', category: 'copyright_ownership' })
    const rel = relationship({ relationship_id: 'REL-1', source_topic: 'copyright_ownership', target_topic: 'copyrightability', crc_eligible: 'Yes' })
    const c = claim({ claim_id: 'C-1', topic: 'copyrightability', lifecycle: 'Candidate', crc_eligible: 'Yes' })
    expect(lookupRelatedTopicClaims([g], [rel], [c], facts()).matches).toEqual([])
  })

  test('no backdoor: a Reviewer-only relationship (CRC Pending) cannot expose a CRC-eligible claim; a CRC-eligible relationship cannot expose a Reviewer-only claim -- both directions covered above, restated as a single combined scenario', () => {
    const g = goal({ goal_id: 'g-1', category: 'copyright_ownership' })
    const reviewerOnlyRel = relationship({ relationship_id: 'REL-1', source_topic: 'copyright_ownership', target_topic: 'copyrightability', crc_eligible: 'Pending' })
    const crcEligibleClaim = claim({ claim_id: 'C-1', topic: 'copyrightability', crc_eligible: 'Yes' })
    expect(lookupRelatedTopicClaims([g], [reviewerOnlyRel], [crcEligibleClaim], facts()).matches).toEqual([])

    const crcEligibleRel = relationship({ relationship_id: 'REL-2', source_topic: 'copyright_ownership', target_topic: 'copyrightability', crc_eligible: 'Yes' })
    const reviewerOnlyClaim = claim({ claim_id: 'C-2', topic: 'copyrightability', crc_eligible: 'No' })
    expect(lookupRelatedTopicClaims([g], [crcEligibleRel], [reviewerOnlyClaim], facts()).matches).toEqual([])
  })
})

describe('lookupRelatedTopicClaims -- applicability parity with exact-topic path', () => {
  test('applicability gate applies identically to related claims', () => {
    const g = goal({ goal_id: 'g-1', category: 'copyright_ownership' })
    const rel = relationship({ relationship_id: 'REL-1', source_topic: 'copyright_ownership', target_topic: 'copyrightability' })
    const c = claim({
      claim_id: 'C-1',
      topic: 'copyrightability',
      applicability_requirements: [{ fact: 'jurisdiction', operator: 'equals', value: 'United States' }],
    })
    const unmet = lookupRelatedTopicClaims([g], [rel], [c], facts({ jurisdiction: { state: 'unknown' } }))
    expect(unmet.matches).toEqual([])
    expect(unmet.diagnostics).toEqual([{ identifier: 'copyright_ownership', reason: 'applicability_unmet' }])

    const met = lookupRelatedTopicClaims([g], [rel], [c], facts({ jurisdiction: { state: 'confirmed', value: 'United States' } }))
    expect(met.matches).toHaveLength(1)
  })
})
