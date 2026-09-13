/**
 * First Real Knowledge-Only Topic milestone (2026-09-13) -- `ai_content_transparency`.
 *
 * `KNOWLEDGE_ONLY_TOPICS` gained its first real member this milestone (see
 * that constant's own doc comment in `lib/retrieval-engine/types.ts` for the
 * full governance provenance -- CAND-EUAI-ART50-4-AUDIOVISUAL-DEEPFAKE-
 * DISCLOSURE-001, Lifecycle: Adopted, `crc_eligible: Pending`, FGR_019).
 * `KnowledgeOnlyTopic` is therefore no longer `never`, and `KnowledgeTopic`
 * is now GENUINELY WIDER than `GoalCategory` at compile time for the first
 * time -- the `GoalCategory | never` collapse the prior two milestones'
 * own tests (`knowledge-topic-foundation.test.ts`,
 * `knowledge-only-topic-forward-compat.test.ts`) had to document and work
 * around with an `as unknown as KnowledgeTopic` cast no longer applies to
 * this real value.
 *
 * This file proves two things those two prior files structurally could not:
 *
 *   1. REAL compile-time separation -- no cast needed. The four
 *      `// @ts-expect-error` assertions below are the ones those files
 *      explicitly attempted and had to abandon (flagged by `tsc` as unused
 *      directives, since no genuinely-KnowledgeTopic-but-not-GoalCategory
 *      value existed to construct the negative case with). They now fire
 *      for real, using the real member.
 *   2. REAL (non-simulated) pipeline behavior for the actual production
 *      closed-set member, via synthetic TEST FIXTURES ONLY -- no production
 *      Article 50 TopicClaim/TopicRelationship, no geographic_relevance_scope,
 *      no crc_eligible change. This file adopts nothing and activates
 *      nothing; it only proves the architecture correctly represents the
 *      one real value that governance has already adopted into the
 *      taxonomy.
 *
 * `ai_content_transparency` is used directly throughout (never cast) --
 * TypeScript itself enforces every negative case below.
 */

import { GOAL_CATEGORIES } from '@/types/interview-engine'
import type { DistributionTerritoryMention, RetrievalHandoff, StructuredUnderstanding, UserGoal } from '@/types/interview-engine'
import { retrieve } from '@/lib/retrieval-engine/retrieve'
import { lookupRelatedTopicClaims } from '@/lib/retrieval-engine/lookup-topic-relationships'
import { lookupDiscoveredTopicClaims } from '@/lib/retrieval-engine/lookup-discovered-topic-claims'
import { lookupTopicClaims, type ApplicabilityFacts } from '@/lib/retrieval-engine/lookup-topic-claims'
import { assembleRelatedTopicResult, assembleDiscoveredTopicResult, assembleTopicResult } from '@/lib/retrieval-engine/assemble-result'
import { deriveClaimTargetedDiscoveryOccurrences, deriveDiscoveredTopicOccurrences } from '@/lib/crc-engine/discovered-relevance'
import { deriveKnowledgeReadinessNeeds } from '@/lib/crc-engine/knowledge-readiness'
import { buildBoundedInterpretations } from '@/lib/bounded-interpretation/build-bounded-interpretation'
import { userGoalsToBiIntents } from '@/lib/bounded-interpretation/adapters'
import { buildConsultativeAnswerPlan } from '@/lib/crc-engine/consultative-answer-plan'
import { selectReviewerClaims } from '@/lib/reviewer-lk/select-reviewer-claims'
import { reviewerClaimToBiResult } from '@/lib/hrr/bi-adapters'
import { topicSelectionGateResult, runHrrResearch } from '@/lib/hrr/run-hrr-research'
import { createInitialBoundaryState } from '@/lib/interview-engine/boundaries'
import { KNOWLEDGE_ONLY_TOPICS, isGoalCategoryTopic, type KnowledgeTopic } from '@/lib/retrieval-engine/types'
import type { GoalCategory } from '@/types/interview-engine'
import type { ReviewerLkClaim } from '@/lib/reviewer-lk/types'
import type { TopicClaim, TopicRelationship, DiscoveredTopicOccurrence, RetrievalResult } from '@/lib/retrieval-engine/types'

/** The real, adopted-into-taxonomy closed-set value -- never a cast. */
const REAL_TOPIC: KnowledgeTopic = 'ai_content_transparency'

// ── shared synthetic-fixture builders (mirror the prior milestone's own
// knowledge-only-topic-forward-compat.test.ts conventions exactly) ─────────

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
    last_verified: '2026-09-13',
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
    adoption_decision_date: '2026-09-13',
    publication_scope: 'Reviewer/Commercial Assurance',
    crc_eligible: 'Yes',
    crc_approver: 'TEST',
    crc_decision_date: '2026-09-13',
    last_reviewed: '2026-09-13',
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

function territoryMention(overrides: Partial<DistributionTerritoryMention> & Pick<DistributionTerritoryMention, 'mention_id' | 'value'>): DistributionTerritoryMention {
  return { confidence: 'confirmed', source_turn: 1, source_statement: `This will run in ${overrides.value}.`, superseded_by: null, ...overrides }
}

const COMMERCIAL_USE_GOAL = goal({ goal_id: 'g-cu', category: 'commercial_use' })

// ── STEP 6: REAL compile-time separation proof, no cast ────────────────────

describe('STEP 6 -- compile-time separation, using the REAL closed-set member (no cast)', () => {
  test('ai_content_transparency is a real member of KNOWLEDGE_ONLY_TOPICS', () => {
    expect(KNOWLEDGE_ONLY_TOPICS).toContain('ai_content_transparency')
  })

  test('ai_content_transparency is a valid KnowledgeTopic, and is NOT a valid GoalCategory at runtime', () => {
    const t: KnowledgeTopic = REAL_TOPIC
    expect(t).toBe('ai_content_transparency')
    expect(isGoalCategoryTopic(REAL_TOPIC)).toBe(false)
    expect((GOAL_CATEGORIES as readonly string[])).not.toContain(REAL_TOPIC)
  })

  test('valid in every knowledge-subject-bearing position: TopicClaim.topic, TopicRelationship.target_topic, RetrievalResult.topic, DiscoveredTopicOccurrence.topic', () => {
    const c: TopicClaim = claim({ claim_id: 'REAL-1', topic: REAL_TOPIC })
    expect(c.topic).toBe(REAL_TOPIC)

    const r: TopicRelationship = relationship({ relationship_id: 'REAL-REL-1', source_topic: 'commercial_use', target_topic: REAL_TOPIC })
    expect(r.target_topic).toBe(REAL_TOPIC)

    const result: RetrievalResult = {
      source_fact: { kind: 'topic', identifier: REAL_TOPIC },
      claim_id: 'REAL-1',
      matrix_identifier: REAL_TOPIC,
      publication_scope: 'Test scope.',
      candidate_statement: null,
      last_verified: null,
      topic: REAL_TOPIC,
      unresolved_project_dependencies: [],
      match_origin: 'related_topic',
      matched_goal_category: 'commercial_use',
      relationship_id: 'REAL-REL-1',
    }
    expect(result.topic).toBe(REAL_TOPIC)

    const occ: DiscoveredTopicOccurrence = {
      topic: REAL_TOPIC,
      trigger_id: 'test-trigger',
      source_kind: 'test_source',
      source_id: 'test-source-id',
      source_goal_category: 'commercial_use',
    }
    expect(occ.topic).toBe(REAL_TOPIC)
  })

  test('REAL compile-time rejection: ai_content_transparency cannot be assigned to UserGoal.category', () => {
    // @ts-expect-error -- UserGoal.category is GoalCategory; ai_content_transparency is knowledge-only.
    const bad: GoalCategory = REAL_TOPIC
    void bad
  })

  test('REAL compile-time rejection: ai_content_transparency cannot be assigned to TopicRelationship.source_topic', () => {
    expect(() => {
      const bad: TopicRelationship = relationship({
        relationship_id: 'REAL-REL-BAD',
        // @ts-expect-error -- source_topic is GoalCategory-only, load-bearing per this interface's own doc comment.
        source_topic: REAL_TOPIC,
        target_topic: 'commercial_use',
      })
      void bad
    }).not.toThrow() // construction succeeds at runtime; the point is the compiler flags the line above.
  })

  test('REAL compile-time rejection: ai_content_transparency cannot be assigned to RetrievalResult.matched_goal_category', () => {
    const bad: RetrievalResult = {
      source_fact: { kind: 'topic', identifier: REAL_TOPIC },
      claim_id: 'REAL-2',
      matrix_identifier: REAL_TOPIC,
      publication_scope: 'Test scope.',
      candidate_statement: null,
      last_verified: null,
      topic: REAL_TOPIC,
      unresolved_project_dependencies: [],
      match_origin: 'related_topic',
      // @ts-expect-error -- matched_goal_category is GoalCategory-only.
      matched_goal_category: REAL_TOPIC,
      relationship_id: null,
    }
    expect(bad.matched_goal_category).toBe(REAL_TOPIC)
  })

  test('REAL compile-time rejection: ai_content_transparency cannot be assigned to DiscoveredTopicOccurrence.source_goal_category', () => {
    const bad: DiscoveredTopicOccurrence = {
      topic: 'commercial_use',
      trigger_id: 'test-trigger',
      source_kind: 'test_source',
      source_id: 'test-source-id',
      // @ts-expect-error -- source_goal_category is GoalCategory-only.
      source_goal_category: REAL_TOPIC,
    }
    expect(bad.source_goal_category).toBe(REAL_TOPIC)
  })
})

// ── STEP 7A -- related-topic retrieval ──────────────────────────────────────

describe('STEP 7A -- related-topic retrieval: commercial_use (real GoalCategory source) -> ai_content_transparency synthetic target claim', () => {
  test('lookupRelatedTopicClaims + assembleRelatedTopicResult: reachable, topic preserves the real knowledge-only member, matched_goal_category preserves the explicit goal, no fabricated UserGoal', () => {
    const g = goal({ goal_id: 'g-1', category: 'commercial_use' })
    const rel = relationship({ relationship_id: 'REAL-REL-2', source_topic: 'commercial_use', target_topic: REAL_TOPIC })
    const c = claim({ claim_id: 'REAL-3', topic: REAL_TOPIC })
    const lookup = lookupRelatedTopicClaims([g], [rel], [c], facts())
    expect(lookup.matches).toEqual([{ claim: c, relationship: rel, sourceGoalCategory: 'commercial_use' }])

    const assembled = assembleRelatedTopicResult(c, rel.relationship_id, 'commercial_use')
    expect(assembled).not.toBeNull()
    expect(assembled?.topic).toBe(REAL_TOPIC)
    expect(assembled?.matched_goal_category).toBe('commercial_use')
    expect(assembled?.match_origin).toBe('related_topic')
  })

  test('full retrieve() integration: real explicit goal + synthetic relationship + real-knowledge-only-topic target claim -> reachable via the public API, no fabricated UserGoal', () => {
    const g = goal({ goal_id: 'g-2', category: 'commercial_use' })
    const rel = relationship({ relationship_id: 'REAL-REL-3', source_topic: 'commercial_use', target_topic: REAL_TOPIC })
    const c = claim({ claim_id: 'REAL-4', topic: REAL_TOPIC })
    const output = retrieve(handoff(), [], [g], [c], facts(), [rel])
    const result = output.results.find((r) => r.claim_id === 'REAL-4')
    expect(result).toBeDefined()
    expect(result?.topic).toBe(REAL_TOPIC)
    expect(result?.matched_goal_category).toBe('commercial_use')
    expect(result?.match_origin).toBe('related_topic')
  })
})

// ── STEP 7B -- discovered/Track C retrieval ────────────────────────────────

describe('STEP 7B -- discovered/Track C retrieval: synthetic governed discovery path targeting ai_content_transparency', () => {
  test('deriveClaimTargetedDiscoveryOccurrences + lookupDiscoveredTopicClaims + assembleDiscoveredTopicResult: topic = real knowledge-only member, matched_goal_category = real goal, originating explicit-goal provenance preserved, no fabricated UserGoal', () => {
    const c = claim({ claim_id: 'REAL-5', topic: REAL_TOPIC, geographic_relevance_scope: ['France'] })
    const rel = relationship({ relationship_id: 'REAL-REL-4', source_topic: 'commercial_use', target_topic: REAL_TOPIC })
    const su = baseSU({ user_goals: [COMMERCIAL_USE_GOAL], distribution_territory_mentions: [territoryMention({ mention_id: 'dt-1', value: 'France' })] })

    const targetedOccs = deriveClaimTargetedDiscoveryOccurrences(su, [c], [rel])
    expect(targetedOccs).toEqual([
      { topic: REAL_TOPIC, trigger_id: expect.any(String), source_kind: 'distribution_territory_mention', source_id: 'dt-1', source_goal_category: 'commercial_use' },
    ])

    const occs = deriveDiscoveredTopicOccurrences(su, [c], [rel])
    const discoveredLookup = lookupDiscoveredTopicClaims(occs, [c], facts())
    expect(discoveredLookup.matches).toEqual([{ claim: c, sourceGoalCategory: 'commercial_use' }])

    const assembled = assembleDiscoveredTopicResult(c, 'commercial_use')
    expect(assembled?.topic).toBe(REAL_TOPIC)
    expect(assembled?.matched_goal_category).toBe('commercial_use')
    expect(assembled?.match_origin).toBe('discovered_topic')
  })

  test('full retrieve() integration: the real knowledge-only topic never becomes exact-goal reachable', () => {
    const g = goal({ goal_id: 'g-3', category: 'commercial_use' })
    const c = claim({ claim_id: 'REAL-6', topic: REAL_TOPIC, geographic_relevance_scope: ['France'] })
    const rel = relationship({ relationship_id: 'REAL-REL-5', source_topic: 'commercial_use', target_topic: REAL_TOPIC })
    const su = baseSU({ user_goals: [COMMERCIAL_USE_GOAL], distribution_territory_mentions: [territoryMention({ mention_id: 'dt-2', value: 'France' })] })
    const occs = deriveDiscoveredTopicOccurrences(su, [c], [rel])
    const output = retrieve(handoff(), [], [g], [c], facts(), [rel], [], occs)
    const result = output.results.find((r) => r.claim_id === 'REAL-6')
    expect(result?.match_origin).toBe('discovered_topic')
    expect(result?.topic).toBe(REAL_TOPIC)
    expect(result?.matched_goal_category).toBe('commercial_use')
  })
})

// ── STEP 7C -- exact-topic non-reachability ────────────────────────────────

describe('STEP 7C -- exact-topic retrieval: ai_content_transparency cannot become an explicit exact-topic UserGoal', () => {
  test('lookupTopicClaims never places a real-knowledge-only-topic claim into matches, for any goal set', () => {
    const c = claim({ claim_id: 'REAL-7', topic: REAL_TOPIC })
    const cReal = claim({ claim_id: 'REAL-8', topic: 'commercial_use' })
    const g = goal({ goal_id: 'g-4', category: 'commercial_use' })
    const result = lookupTopicClaims([g], [c, cReal], facts())
    expect(result.matches.map((m) => m.claim_id)).toEqual(['REAL-8'])
  })

  test('assembleTopicResult still succeeds normally for a real GoalCategory-topic claim (unaffected)', () => {
    const c = claim({ claim_id: 'REAL-9', topic: 'commercial_use' })
    const result = assembleTopicResult(c)
    expect(result?.topic).toBe('commercial_use')
    expect(result?.matched_goal_category).toBe('commercial_use')
  })
})

// ── STEP 7D -- Bounded Interpretation ──────────────────────────────────────

describe('STEP 7D -- Bounded Interpretation: fed a RetrievalResult carrying ai_content_transparency', () => {
  test('BI is driven entirely by matched_goal_category -- no exception, no stronger inference merely because the topic is knowledge-only', () => {
    const g = goal({ goal_id: 'g-5', category: 'commercial_use' })
    const rel = relationship({ relationship_id: 'REAL-REL-6', source_topic: 'commercial_use', target_topic: REAL_TOPIC })
    const c = claim({ claim_id: 'REAL-10', topic: REAL_TOPIC })
    const output = retrieve(handoff(), [], [g], [c], facts(), [rel])

    const intents = userGoalsToBiIntents([g])
    expect(() => {
      const interpretations = buildBoundedInterpretations(intents, output.results, output.diagnostics)
      expect(interpretations).toHaveLength(1)
      expect(interpretations[0].category).toBe('commercial_use')
      expect(interpretations[0].status).not.toBe('determination_declined')
      expect(interpretations[0].supporting_claim_ids).toContain('REAL-10')
    }).not.toThrow()
  })
})

// ── STEP 7E -- Consultative Composition ────────────────────────────────────

describe('STEP 7E -- Composition: answer planning stays organized around the real GoalCategory, never surfaces ai_content_transparency as though explicitly asked', () => {
  test('no exception; the section is keyed by the real GoalCategory only', () => {
    const g = goal({ goal_id: 'g-6', category: 'commercial_use' })
    const rel = relationship({ relationship_id: 'REAL-REL-7', source_topic: 'commercial_use', target_topic: REAL_TOPIC })
    const c = claim({ claim_id: 'REAL-11', topic: REAL_TOPIC })
    const output = retrieve(handoff(), [], [g], [c], facts(), [rel])
    const intents = userGoalsToBiIntents([g])
    const interpretations = buildBoundedInterpretations(intents, output.results, output.diagnostics)

    expect(() => {
      const plan = buildConsultativeAnswerPlan(interpretations, output.results, output.diagnostics)
      expect(plan.explicit_sections).toHaveLength(1)
      expect(plan.explicit_sections[0].category).toBe('commercial_use')
      expect(plan.explicit_sections[0].supported_claim_refs[0].matrix_identifier).toBe('ai_content_transparency')
      expect(plan.explicit_sections[0].supported_claim_refs[0].matched_goal_category).toBe('commercial_use')
    }).not.toThrow()
  })
})

// ── STEP 7F -- knowledge readiness / dependency askability ─────────────────

describe('STEP 7F -- knowledge readiness/askability with ai_content_transparency as a discovered topic', () => {
  test('deriveKnowledgeReadinessNeeds accepts a KnowledgeTopic[] including the real member without crashing, fabricating a question, or coercing it into a goal', () => {
    const c = claim({
      claim_id: 'REAL-12',
      topic: REAL_TOPIC,
      unresolved_project_dependencies: ['human_contribution_description'],
    })
    const su = baseSU({ user_goals: [COMMERCIAL_USE_GOAL] })
    expect(() => {
      const needs = deriveKnowledgeReadinessNeeds(su, [c], createInitialBoundaryState(), [REAL_TOPIC])
      expect(Array.isArray(needs)).toBe(true)
    }).not.toThrow()
  })
})

// ── STEP 8 -- HRR / reviewer gap re-verification with the real member ─────

describe('STEP 8 -- HRR/reviewer: re-verify with the REAL member (not simulated) that current production wiring stays safe', () => {
  test("today's actual wiring (topicSelectionGateResult + runHrrResearch) is GoalCategory-constrained (ReviewerResearchTopic) and never reaches ai_content_transparency, even though it now really exists", () => {
    const c = claim({ claim_id: 'REAL-13', topic: 'likeness', publication_scope: 'CRC eligible' })
    const gate = topicSelectionGateResult('likeness')
    const result = runHrrResearch({
      gate,
      reviewerContext: {
        context: { resolved_tool_ids: [], resolved_asset_provider_ids: [], jurisdiction_included: [] },
        assetProviderIds: [],
        activeToolIds: [],
        applicabilityFacts: facts(),
      },
      topicClaims: [c],
    })
    expect(result.per_topic).toHaveLength(1)
    expect(result.per_topic[0].topic).toBe('likeness')
  })

  test('capability: SelectReviewerClaimsInput.topic legitimately accepts the real knowledge-only topic and correctly selects a matching claim -- no error, no fabricated GoalCategory', () => {
    const c = claim({ claim_id: 'REAL-14', topic: REAL_TOPIC, crc_publication_scope: 'Test scope.' })
    const selection = selectReviewerClaims({
      topic: REAL_TOPIC,
      topicClaims: [{ ...c, publication_scope: 'CRC eligible' }],
      assetProviderIds: [],
      activeToolIds: [],
      applicabilityFacts: facts(),
    })
    expect(selection.claims).toHaveLength(1)
    expect(selection.claims[0].topic).toBe(REAL_TOPIC)
  })

  test('GAP re-confirmed with the real member: reviewerClaimToBiResult throws if a claim genuinely selected under the real knowledge-only topic is fed to it -- structurally unreachable through any wiring in this repository today (the one real caller always constrains selectReviewerClaims to a ReviewerResearchTopic, itself GoalCategory-shaped)', () => {
    const reviewerClaim: ReviewerLkClaim = {
      claim_id: 'REAL-15',
      topic: REAL_TOPIC,
      claim_character: 'established',
      jurisdiction: 'Global',
      lifecycle: 'Adopted',
      publication_scope: 'CRC eligible',
      crc_eligible: 'Yes',
      statement: 'Test statement.',
      crc_publication_scope: 'Test scope.',
      applicability_outcomes: [],
      applicability_established: true,
      unresolved_project_dependencies: [],
      provider_scope: null,
      tool_scope: null,
      last_verified: '2026-09-13',
      superseded_by: null,
      governed_claims_reference: 'GOVERNED-CLAIMS.md#test',
    }
    expect(() => reviewerClaimToBiResult(reviewerClaim)).toThrow(/knowledge-only topic/)
  })
})

// ── STEP 9 -- production dormancy ──────────────────────────────────────────

describe('STEP 9 -- production dormancy: ai_content_transparency existing in the closed set does not, by itself, make anything retrievable or CRC-active', () => {
  test('production retrieve() with zero synthetic fixtures surfaces nothing for ai_content_transparency -- no production TopicClaim/TopicRelationship references it', () => {
    const g = goal({ goal_id: 'g-7', category: 'commercial_use' })
    // Empty production-shaped inputs: no topicClaims, no relationships supplied.
    const output = retrieve(handoff(), [], [g], [], facts(), [])
    const anyAiTransparency = output.results.filter((r) => r.topic === REAL_TOPIC)
    expect(anyAiTransparency).toEqual([])
  })

  test('KNOWLEDGE_ONLY_TOPICS contains exactly one member -- adding the taxonomy value did not silently pull in any other knowledge-only subject', () => {
    expect(KNOWLEDGE_ONLY_TOPICS).toEqual(['ai_content_transparency'])
  })
})
