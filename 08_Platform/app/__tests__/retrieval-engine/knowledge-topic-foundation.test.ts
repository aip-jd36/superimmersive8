/**
 * KnowledgeTopic Foundation milestone (2026-09-13) -- focused regression
 * tests proving the GoalCategory/KnowledgeTopic separation, without adding
 * any production knowledge-only topic value (KNOWLEDGE_ONLY_TOPICS stays
 * empty; no Article 50 content of any kind).
 *
 * This file does NOT re-prove existing exact-topic/related-topic/discovered-
 * topic behavior end to end -- the full pre-existing suite (retrieve.test.ts,
 * lookup-topic-claims.test.ts, lookup-topic-relationships.test.ts,
 * discovered-relevance tests, etc.) already covers that, and a byte-for-byte
 * failing-test-name comparison against a fresh pre-milestone baseline proved
 * zero behavior change there. This file targets only what is genuinely NEW:
 * the closed-set contract itself, the two narrowing guards this milestone
 * introduced, and the TopicRelationship source/target asymmetry.
 */

import {
  KNOWLEDGE_ONLY_TOPICS,
  KNOWLEDGE_TOPICS,
  isGoalCategoryTopic,
  type KnowledgeTopic,
} from '@/lib/retrieval-engine/types'
import { assembleTopicResult } from '@/lib/retrieval-engine/assemble-result'
import { reviewerClaimToBiResult } from '@/lib/hrr/bi-adapters'
import { lookupTopicClaims } from '@/lib/retrieval-engine/lookup-topic-claims'
import { selectReviewerClaims } from '@/lib/reviewer-lk/select-reviewer-claims'
import type { ReviewerLkClaim } from '@/lib/reviewer-lk/types'
import type { TopicClaim, TopicRelationship } from '@/lib/retrieval-engine/types'
import { GOAL_CATEGORIES } from '@/types/interview-engine'
import type { UserGoal } from '@/types/interview-engine'

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
    last_verified: '2026-08-16',
    superseded_by: null,
    ...overrides,
  }
}

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

function reviewerClaim(overrides: Partial<ReviewerLkClaim> & Pick<ReviewerLkClaim, 'claim_id' | 'topic'>): ReviewerLkClaim {
  return {
    claim_character: 'established',
    jurisdiction: 'Global',
    lifecycle: 'Adopted',
    publication_scope: 'CRC eligible',
    crc_eligible: 'Yes',
    statement: 'Statement.',
    crc_publication_scope: 'Scope text.',
    applicability_outcomes: [],
    applicability_established: true,
    unresolved_project_dependencies: [],
    provider_scope: null,
    tool_scope: null,
    last_verified: '2026-08-16',
    superseded_by: null,
    governed_claims_reference: 'GOVERNED-CLAIMS.md#test',
    ...overrides,
  }
}

/**
 * TEST-ONLY simulated future knowledge-only topic value. Never added to the
 * real, production `KNOWLEDGE_ONLY_TOPICS` closed set (that stays empty per
 * this milestone's own explicit scope) -- this is a plain string, forced
 * through the `KnowledgeTopic` type via an explicit test-only cast, exactly
 * mirroring how a REAL future governed knowledge-only topic would eventually
 * enter the type once actually adopted. Used only to exercise the two
 * narrowing guards this milestone introduced.
 */
const SIMULATED_KNOWLEDGE_ONLY_TOPIC = 'test_only_simulated_knowledge_only_topic' as unknown as KnowledgeTopic

describe('KnowledgeTopic closed-set contract', () => {
  test('KNOWLEDGE_ONLY_TOPICS is empty -- no production knowledge-only topic exists yet', () => {
    expect(KNOWLEDGE_ONLY_TOPICS).toEqual([])
  })

  test('KNOWLEDGE_TOPICS is exactly GOAL_CATEGORIES today (empty knowledge-only addition)', () => {
    expect([...KNOWLEDGE_TOPICS].sort()).toEqual([...GOAL_CATEGORIES].sort())
  })

  test('every GoalCategory value is a valid KnowledgeTopic (superset property)', () => {
    for (const category of GOAL_CATEGORIES) {
      expect(KNOWLEDGE_TOPICS).toContain(category)
    }
  })
})

describe('isGoalCategoryTopic', () => {
  test('positive: returns true for every real GoalCategory value', () => {
    for (const category of GOAL_CATEGORIES) {
      expect(isGoalCategoryTopic(category)).toBe(true)
    }
  })

  test('negative: returns false for a simulated knowledge-only value -- the guard is a real check, not a no-op', () => {
    expect(isGoalCategoryTopic(SIMULATED_KNOWLEDGE_ONLY_TOPIC)).toBe(false)
  })
})

describe('assembleTopicResult -- fail-closed guard (CRC retrieval boundary)', () => {
  test('positive: a real, exact-topic-matched claim assembles normally, matched_goal_category equals topic', () => {
    const c = claim({ claim_id: 'C-1', topic: 'commercial_use' })
    const result = assembleTopicResult(c)
    expect(result).not.toBeNull()
    expect(result?.topic).toBe('commercial_use')
    expect(result?.matched_goal_category).toBe('commercial_use')
  })

  test('negative: a claim with a simulated knowledge-only topic throws rather than silently fabricating matched_goal_category -- structurally unreachable via lookupTopicClaims in production, exercised here only to prove the guard fires', () => {
    const c = claim({ claim_id: 'C-2', topic: SIMULATED_KNOWLEDGE_ONLY_TOPIC })
    expect(() => assembleTopicResult(c)).toThrow(/knowledge-only topic/)
  })
})

describe('reviewerClaimToBiResult -- fail-closed guard (HRR research boundary)', () => {
  test('positive: a real, topic-matched reviewer claim converts normally', () => {
    const c = reviewerClaim({ claim_id: 'C-3', topic: 'likeness' })
    const result = reviewerClaimToBiResult(c)
    expect(result.matched_goal_category).toBe('likeness')
  })

  test('negative: a reviewer claim with a simulated knowledge-only topic throws rather than silently fabricating matched_goal_category', () => {
    const c = reviewerClaim({ claim_id: 'C-4', topic: SIMULATED_KNOWLEDGE_ONLY_TOPIC })
    expect(() => reviewerClaimToBiResult(c)).toThrow(/knowledge-only topic/)
  })
})

describe('explicit exact-topic retrieval invariant -- a knowledge-only topic can never become exact-goal reachable', () => {
  test('a real UserGoal only ever matches claims whose topic equals its own GoalCategory value; the simulated knowledge-only claim never enters activeGoalCategories', () => {
    const claims = [claim({ claim_id: 'C-5', topic: 'commercial_use' }), claim({ claim_id: 'C-6', topic: SIMULATED_KNOWLEDGE_ONLY_TOPIC })]
    const g = goal({ goal_id: 'G-1', category: 'commercial_use' })
    const result = lookupTopicClaims([g], claims, { jurisdiction: { included: [], excluded: [] }, toolMentions: [] })
    expect(result.matches.map((c) => c.claim_id)).toEqual(['C-5'])
  })
})

describe('TopicRelationship source_topic/target_topic asymmetry (load-bearing, not stylistic)', () => {
  const baseRelationship: Omit<TopicRelationship, 'source_topic' | 'target_topic'> = {
    relationship_id: 'REL-TEST-v1',
    relationship_type: 'relevant_consideration',
    rationale: 'Test rationale.',
    lifecycle: 'Adopted',
    adoption_approver: 'Test',
    adoption_decision_date: '2026-09-13',
    publication_scope: 'CRC eligible',
    crc_eligible: 'Yes',
    crc_approver: 'Test',
    crc_decision_date: '2026-09-13',
    last_reviewed: '2026-09-13',
    superseded_by: null,
  }

  test('target_topic legitimately accepts a KnowledgeTopic value (may be knowledge-only)', () => {
    const relationship: TopicRelationship = {
      ...baseRelationship,
      source_topic: 'commercial_use',
      target_topic: SIMULATED_KNOWLEDGE_ONLY_TOPIC,
    }
    expect(relationship.target_topic).toBe(SIMULATED_KNOWLEDGE_ONLY_TOPIC)
  })

  // NOTE ON WHAT IS NOT, AND CANNOT YET BE, COMPILE-TIME TESTED HERE:
  // `KnowledgeOnlyTopic = (typeof KNOWLEDGE_ONLY_TOPICS)[number]` is `never`
  // while that tuple is empty (this milestone's own deliberate scope -- no
  // knowledge-only production value exists yet), so
  // `KnowledgeTopic = GoalCategory | never` COLLAPSES to exactly
  // `GoalCategory` today -- confirmed directly: a `// @ts-expect-error`
  // asserting that a KnowledgeTopic-only value is rejected by
  // `source_topic: GoalCategory` was attempted here and correctly flagged
  // by `tsc --noEmit` as an UNUSED directive (no error occurs), because
  // there is currently no value that is a KnowledgeTopic but not a
  // GoalCategory to construct the negative case with. The compile-time
  // asymmetry becomes real and testable the moment a real value is ever
  // added to KNOWLEDGE_ONLY_TOPICS (out of scope for this milestone). What
  // IS proven today, by the pre-existing, unmodified, byte-for-byte-passing
  // suite: the RUNTIME asymmetry -- lookup-topic-relationships.test.ts's own
  // coverage of `lookupRelatedTopicClaims` proves `source_topic` is matched
  // only against a real, active, confirmed explicit UserGoal.category, never
  // against a claim's own topic or a discovered occurrence.
})

describe('extractor isolation -- GOAL_CATEGORIES is untouched by this milestone', () => {
  test('GOAL_CATEGORIES is still exactly the 6 pre-existing values', () => {
    expect([...GOAL_CATEGORIES].sort()).toEqual(
      ['commercial_use', 'copyright_ownership', 'copyrightability', 'likeness', 'third_party_source_rights', 'unknown'].sort(),
    )
  })
})

describe('reviewer topic support -- selectReviewerClaims accepts a KnowledgeTopic, never fabricates one as a UserGoal', () => {
  test('positive regression: a real GoalCategory topic selection still selects the matching claim unchanged', () => {
    const claims = [
      claim({ claim_id: 'C-7', topic: 'likeness', publication_scope: 'CRC eligible' }),
      claim({ claim_id: 'C-8', topic: 'commercial_use', publication_scope: 'CRC eligible' }),
    ]
    const result = selectReviewerClaims({
      topic: 'likeness',
      topicClaims: claims,
      assetProviderIds: [],
      activeToolIds: [],
      applicabilityFacts: { jurisdiction: { included: [], excluded: [] }, toolMentions: [] },
    })
    expect(result.claims.map((c) => c.claim_id)).toEqual(['C-7'])
    expect(result.claims[0].topic).toBe('likeness')
  })

  test('capability: SelectReviewerClaimsInput.topic accepts a simulated knowledge-only KnowledgeTopic at compile time (future reviewer browsing of a knowledge-only topic), and it simply matches zero claims today (none governed yet), never an error, never a fabricated match', () => {
    const claims = [claim({ claim_id: 'C-9', topic: 'commercial_use' })]
    const result = selectReviewerClaims({
      topic: SIMULATED_KNOWLEDGE_ONLY_TOPIC,
      topicClaims: claims,
      assetProviderIds: [],
      activeToolIds: [],
      applicabilityFacts: { jurisdiction: { included: [], excluded: [] }, toolMentions: [] },
    })
    expect(result.claims).toEqual([])
    expect(result.withheld).toEqual([])
  })
})
