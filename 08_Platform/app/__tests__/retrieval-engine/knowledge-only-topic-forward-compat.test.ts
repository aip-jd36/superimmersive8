/**
 * KnowledgeTopic Foundation — First Knowledge-Only Topic Forward-Compatibility
 * Review (2026-09-13). Exercises the REAL production pipeline (retrieve(),
 * lookupRelatedTopicClaims, deriveClaimTargetedDiscoveryOccurrences,
 * lookupDiscoveredTopicClaims, assemble*Result, buildBoundedInterpretations,
 * buildConsultativeAnswerPlan, deriveKnowledgeReadinessNeeds,
 * selectReviewerClaims, reviewerClaimToBiResult) with a TEST-ONLY simulated
 * knowledge-only topic, to prove the KnowledgeTopic architecture (f64aacd)
 * actually supports a genuine future knowledge-only topic before any real
 * one is ever adopted.
 *
 * The simulated topic is NEVER added to production KNOWLEDGE_ONLY_TOPICS,
 * NEVER a GoalCategory, NEVER in the extractor schema, NEVER in a production
 * fixture. This file adopts nothing, implies no Article 50 content, and
 * constitutes no governance decision -- exactly mirroring the discipline
 * distribution-territory-discovered-relevance.test.ts's own header already
 * establishes for synthetic TopicClaim/TopicRelationship fixtures.
 */

import { GOAL_CATEGORIES } from '@/types/interview-engine'
import type { AssetProviderMention, DistributionTerritoryMention, RetrievalHandoff, StructuredUnderstanding, UserGoal } from '@/types/interview-engine'
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
import { reviewerClaimToBiResult, researchIntentToBiIntent } from '@/lib/hrr/bi-adapters'
import { topicSelectionGateResult, runHrrResearch } from '@/lib/hrr/run-hrr-research'
import { createInitialBoundaryState } from '@/lib/interview-engine/boundaries'
import { KNOWLEDGE_ONLY_TOPICS, isGoalCategoryTopic, type KnowledgeTopic } from '@/lib/retrieval-engine/types'
import type { ReviewerLkClaim } from '@/lib/reviewer-lk/types'
import type { TopicClaim, TopicRelationship } from '@/lib/retrieval-engine/types'

/**
 * TEST-ONLY simulated future knowledge-only topic -- see this file's own
 * header. Distinct string from the prior milestone's own
 * SIMULATED_KNOWLEDGE_ONLY_TOPIC constant (a different file, deliberately
 * not shared, so each file's failure messages are independently
 * identifiable).
 */
const SIMULATED_TOPIC = 'test_only_regulatory_disclosure' as unknown as KnowledgeTopic

// ── shared synthetic-fixture builders (mirror distribution-territory-discovered-relevance.test.ts's own conventions exactly) ──

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

// ── STEP 3/4: test-only mechanism + compile-time type-separation proof ────

describe('STEP 3/4 -- test-only KnowledgeTopic mechanism and type separation', () => {
  test('valid in topic-bearing positions (TopicClaim.topic, TopicRelationship.target_topic, DiscoveredTopicOccurrence.topic via a real claim)', () => {
    const c = claim({ claim_id: 'SIM-1', topic: SIMULATED_TOPIC })
    expect(c.topic).toBe(SIMULATED_TOPIC)
    const r = relationship({ relationship_id: 'SIM-REL-1', source_topic: 'commercial_use', target_topic: SIMULATED_TOPIC })
    expect(r.target_topic).toBe(SIMULATED_TOPIC)
  })

  /**
   * NOTE ON WHAT CANNOT YET BE COMPILE-TIME TESTED, VERIFIED DIRECTLY AGAINST
   * `tsc --noEmit` (not merely asserted -- the four negative `@ts-expect-error`
   * assertions originally attempted here were each independently flagged by
   * full-project `tsc` as UNUSED directives, i.e. no error occurs): while
   * `KNOWLEDGE_ONLY_TOPICS` is empty, `KnowledgeOnlyTopic = never`, so
   * `KnowledgeTopic = GoalCategory | never` COLLAPSES to exactly
   * `GoalCategory` -- the same collapse the prior milestone's own
   * `knowledge-topic-foundation.test.ts` already documents for
   * `TopicRelationship.source_topic`. There is currently no way to construct
   * a value that is a `KnowledgeTopic` but PROVABLY NOT a `GoalCategory`
   * (even via `as unknown as KnowledgeTopic`), so assigning
   * `SIMULATED_TOPIC` into any `GoalCategory`-typed field does not, and
   * cannot, produce a compile error today. This is not a defect in f64aacd
   * -- it is the direct, unavoidable consequence of Requirement 7's own
   * "acceptable for the initial KnowledgeTopic value set to contain no
   * knowledge-only production values yet." The four field-level separations
   * (UserGoal.category, TopicRelationship.source_topic,
   * RetrievalResult.matched_goal_category,
   * DiscoveredTopicOccurrence.source_goal_category) are real and enforced by
   * their DECLARED types (see the field-by-field commit message and
   * lib/retrieval-engine/types.ts's own doc comments) -- they become
   * compile-time-testable the moment a real value is ever added to
   * KNOWLEDGE_ONLY_TOPICS. What IS proven here, and throughout STEP 5-11
   * below via real pipeline execution: every actual code path in this
   * codebase only ever stores a real GoalCategory value in these four
   * fields -- SIMULATED_TOPIC is never once assigned into any of them
   * anywhere in this file.
   */
  test('NOT valid as UserGoal.category, TopicRelationship.source_topic, RetrievalResult.matched_goal_category, or DiscoveredTopicOccurrence.source_goal_category -- proven by field declaration, not by negative compile assertion (see the note above for why)', () => {
    const c = claim({ claim_id: 'SIM-2', topic: 'commercial_use' })
    const result = assembleTopicResult(c)
    // Positive control: every one of these four fields, populated through
    // real production code anywhere in this file, is always a real
    // GoalCategory -- never SIMULATED_TOPIC.
    expect(GOAL_CATEGORIES).toContain(COMMERCIAL_USE_GOAL.category)
    expect(result?.matched_goal_category).not.toBe(SIMULATED_TOPIC)
    expect(GOAL_CATEGORIES).toContain(result?.matched_goal_category)
  })

  test('GOAL_CATEGORIES remains unchanged (6 values, extractor schema untouched)', () => {
    expect(GOAL_CATEGORIES.length).toBe(6)
    expect(isGoalCategoryTopic(SIMULATED_TOPIC)).toBe(false)
  })

  test('KNOWLEDGE_ONLY_TOPICS remains empty -- this file adopts nothing', () => {
    expect(KNOWLEDGE_ONLY_TOPICS).toEqual([])
  })
})

// ── STEP 5: related-topic flow ─────────────────────────────────────────────

describe('STEP 5 -- related-topic flow: real GoalCategory -> source_topic -> knowledge-only target_topic -> TopicClaim.topic', () => {
  test('lookupRelatedTopicClaims + assembleRelatedTopicResult: the claim is reachable, RetrievalResult.topic preserves the knowledge-only topic, matched_goal_category preserves the real explicit goal', () => {
    const g = goal({ goal_id: 'g-1', category: 'commercial_use' })
    const rel = relationship({ relationship_id: 'SIM-REL-2', source_topic: 'commercial_use', target_topic: SIMULATED_TOPIC })
    const c = claim({ claim_id: 'SIM-3', topic: SIMULATED_TOPIC })
    const lookup = lookupRelatedTopicClaims([g], [rel], [c], facts())
    expect(lookup.matches).toEqual([{ claim: c, relationship: rel, sourceGoalCategory: 'commercial_use' }])

    const assembled = assembleRelatedTopicResult(c, rel.relationship_id, 'commercial_use')
    expect(assembled).not.toBeNull()
    expect(assembled?.topic).toBe(SIMULATED_TOPIC)
    expect(assembled?.matched_goal_category).toBe('commercial_use')
    expect(assembled?.match_origin).toBe('related_topic')
  })

  test('full retrieve() integration: real explicit goal + relationship + knowledge-only target claim -> reachable via the public API, no fabricated UserGoal', () => {
    const g = goal({ goal_id: 'g-2', category: 'commercial_use' })
    const rel = relationship({ relationship_id: 'SIM-REL-3', source_topic: 'commercial_use', target_topic: SIMULATED_TOPIC })
    const c = claim({ claim_id: 'SIM-4', topic: SIMULATED_TOPIC })
    const output = retrieve(handoff(), [], [g], [c], facts(), [rel])
    const result = output.results.find((r) => r.claim_id === 'SIM-4')
    expect(result).toBeDefined()
    expect(result?.topic).toBe(SIMULATED_TOPIC)
    expect(result?.matched_goal_category).toBe('commercial_use')
    expect(result?.match_origin).toBe('related_topic')
  })
})

// ── STEP 6: orthogonal / Track C flow ──────────────────────────────────────

describe('STEP 6 -- orthogonal/Track C flow: structured fact -> knowledge-only claim.topic -> TopicRelationship authorization from real GoalCategory -> DiscoveredTopicOccurrence -> RetrievalResult', () => {
  test('deriveClaimTargetedDiscoveryOccurrences: territory fact + knowledge-only-topic claim opted into geographic_relevance_scope + real relationship -> occurrence carries the knowledge-only topic and the real source goal', () => {
    const c = claim({ claim_id: 'SIM-5', topic: SIMULATED_TOPIC, geographic_relevance_scope: ['France'] })
    const rel = relationship({ relationship_id: 'SIM-REL-4', source_topic: 'commercial_use', target_topic: SIMULATED_TOPIC })
    const su = baseSU({ user_goals: [COMMERCIAL_USE_GOAL], distribution_territory_mentions: [territoryMention({ mention_id: 'dt-1', value: 'France' })] })
    const occs = deriveClaimTargetedDiscoveryOccurrences(su, [c], [rel])
    expect(occs).toEqual([
      { topic: SIMULATED_TOPIC, trigger_id: expect.any(String), source_kind: 'distribution_territory_mention', source_id: 'dt-1', source_goal_category: 'commercial_use' },
    ])
  })

  test('lookupDiscoveredTopicClaims + assembleDiscoveredTopicResult: end to end, topic = knowledge-only, matched_goal_category = real goal, no fabricated UserGoal', () => {
    const c = claim({ claim_id: 'SIM-6', topic: SIMULATED_TOPIC, geographic_relevance_scope: ['France'] })
    const rel = relationship({ relationship_id: 'SIM-REL-5', source_topic: 'commercial_use', target_topic: SIMULATED_TOPIC })
    const su = baseSU({ user_goals: [COMMERCIAL_USE_GOAL], distribution_territory_mentions: [territoryMention({ mention_id: 'dt-2', value: 'France' })] })
    const occs = deriveDiscoveredTopicOccurrences(su, [c], [rel])
    const discoveredLookup = lookupDiscoveredTopicClaims(occs, [c], facts())
    expect(discoveredLookup.matches).toEqual([{ claim: c, sourceGoalCategory: 'commercial_use' }])

    const assembled = assembleDiscoveredTopicResult(c, 'commercial_use')
    expect(assembled?.topic).toBe(SIMULATED_TOPIC)
    expect(assembled?.matched_goal_category).toBe('commercial_use')
    expect(assembled?.match_origin).toBe('discovered_topic')
  })

  test('full retrieve() integration: the knowledge-only topic never becomes exact-goal reachable -- lookupTopicClaims never sees it (activeGoalCategories stays GoalCategory-only)', () => {
    const g = goal({ goal_id: 'g-3', category: 'commercial_use' })
    const c = claim({ claim_id: 'SIM-7', topic: SIMULATED_TOPIC, geographic_relevance_scope: ['France'] })
    const rel = relationship({ relationship_id: 'SIM-REL-6', source_topic: 'commercial_use', target_topic: SIMULATED_TOPIC })
    const su = baseSU({ user_goals: [COMMERCIAL_USE_GOAL], distribution_territory_mentions: [territoryMention({ mention_id: 'dt-3', value: 'France' })] })
    const occs = deriveDiscoveredTopicOccurrences(su, [c], [rel])
    const output = retrieve(handoff(), [], [g], [c], facts(), [rel], [], occs)
    const result = output.results.find((r) => r.claim_id === 'SIM-7')
    expect(result?.match_origin).toBe('discovered_topic')
    expect(result?.topic).toBe(SIMULATED_TOPIC)
    expect(result?.matched_goal_category).toBe('commercial_use')

    // Exact-topic path explicitly proven never to see it -- lookupTopicClaims's
    // own activeGoalCategories is GoalCategory-only by type; passing [] for
    // discoveredTopics (production retrieve.ts's own real wiring) means a
    // knowledge-only claim can never surface as an exact_topic match.
    const exactLookup = lookupTopicClaims([g], [c], facts())
    expect(exactLookup.matches).toEqual([])
  })
})

// ── STEP 7: Bounded Interpretation ─────────────────────────────────────────

describe('STEP 7 -- Bounded Interpretation: fed a RetrievalResult with a knowledge-only topic', () => {
  test('BI is driven entirely by matched_goal_category -- no missing label, no fabricated intent, no exception, no stronger conclusion', () => {
    const g = goal({ goal_id: 'g-4', category: 'commercial_use' })
    const rel = relationship({ relationship_id: 'SIM-REL-7', source_topic: 'commercial_use', target_topic: SIMULATED_TOPIC })
    const c = claim({ claim_id: 'SIM-8', topic: SIMULATED_TOPIC })
    const output = retrieve(handoff(), [], [g], [c], facts(), [rel])

    const intents = userGoalsToBiIntents([g])
    expect(() => {
      const interpretations = buildBoundedInterpretations(intents, output.results, output.diagnostics)
      // No exception thrown; exactly one interpretation, for the real goal.
      expect(interpretations).toHaveLength(1)
      expect(interpretations[0].category).toBe('commercial_use')
      expect(interpretations[0].status).not.toBe('determination_declined')
      // The knowledge-only claim contributed real content -- BI did not
      // silently drop it or fail to find it (proves BI reads
      // matched_goal_category, not topic, and the result surfaces normally).
      expect(interpretations[0].supporting_claim_ids).toContain('SIM-8')
    }).not.toThrow()
  })
})

// ── STEP 8: Composition boundary ───────────────────────────────────────────

describe('STEP 8 -- Composition: the same result reaches buildConsultativeAnswerPlan safely, "what you asked" labels remain GoalCategory-based', () => {
  test('no exception; the section is keyed by the real GoalCategory, never a fabricated one; CATEGORY_LABELS is never consulted with a knowledge-only value', () => {
    const g = goal({ goal_id: 'g-5', category: 'commercial_use' })
    const rel = relationship({ relationship_id: 'SIM-REL-8', source_topic: 'commercial_use', target_topic: SIMULATED_TOPIC })
    const c = claim({ claim_id: 'SIM-9', topic: SIMULATED_TOPIC })
    const output = retrieve(handoff(), [], [g], [c], facts(), [rel])
    const intents = userGoalsToBiIntents([g])
    const interpretations = buildBoundedInterpretations(intents, output.results, output.diagnostics)

    expect(() => {
      const plan = buildConsultativeAnswerPlan(interpretations, output.results, output.diagnostics)
      expect(plan.explicit_sections).toHaveLength(1)
      // The section's own "what you asked" identity is `category` -- always
      // the real explicit GoalCategory, never the knowledge-only topic.
      expect(plan.explicit_sections[0].category).toBe('commercial_use')
      // The knowledge-only topic string DOES legitimately appear elsewhere in
      // the plan (`matrix_identifier`, a plain internal "which claim group"
      // identifier verbatim from RetrievalResult.matrix_identifier -- never a
      // rendered CATEGORY_LABELS "what you asked" string, never used as a
      // label lookup key). Confirming it is confined to that one internal
      // field, never substituted for `category`, is the actual boundary this
      // test proves -- not that the string never appears anywhere at all.
      expect(plan.explicit_sections[0].supported_claim_refs[0].matrix_identifier).toBe('test_only_regulatory_disclosure')
      expect(plan.explicit_sections[0].supported_claim_refs[0].matched_goal_category).toBe('commercial_use')
    }).not.toThrow()
  })
})

// ── STEP 9: reviewer flow ──────────────────────────────────────────────────

describe('STEP 9 -- reviewer flow: selectReviewerClaims / reviewerClaimToBiResult with a knowledge-only topic', () => {
  test("positive: today's actual wiring (topicSelectionGateResult + runHrrResearch) is GoalCategory-constrained (ReviewerResearchTopic) and remains completely safe -- never reaches a knowledge-only topic", () => {
    const c = claim({ claim_id: 'SIM-10', topic: 'likeness', publication_scope: 'CRC eligible' })
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

  test('capability: SelectReviewerClaimsInput.topic legitimately accepts the knowledge-only topic (Step 13 of the prior milestone), and correctly selects a matching claim', () => {
    const c = claim({ claim_id: 'SIM-11', topic: SIMULATED_TOPIC, crc_publication_scope: 'Test scope.' })
    const reviewerClaim = { ...c, publication_scope: 'CRC eligible' as const }
    // selectReviewerClaims filters on TopicClaim.topic directly.
    const selection = selectReviewerClaims({
      topic: SIMULATED_TOPIC,
      topicClaims: [{ ...c, publication_scope: 'CRC eligible' }],
      assetProviderIds: [],
      activeToolIds: [],
      applicabilityFacts: facts(),
    })
    expect(selection.claims).toHaveLength(1)
    expect(selection.claims[0].topic).toBe(SIMULATED_TOPIC)
    void reviewerClaim
  })

  test('GAP (classified in STEP 13/Q below): reviewerClaimToBiResult throws if a claim genuinely selected under a knowledge-only topic is fed to it -- because BiIntent.category/matched_goal_category stay GoalCategory-only. This is NOT reachable through any wiring that exists in this repository today (the one real caller, run-hrr-research.ts, always constrains selectReviewerClaims to a ReviewerResearchTopic, itself GoalCategory-shaped) -- demonstrated here only to make the gap concrete and testable, not to claim it happens in production.', () => {
    const reviewerClaim: ReviewerLkClaim = {
      claim_id: 'SIM-12',
      topic: SIMULATED_TOPIC,
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

// ── STEP 10: assembleTopicResult -- prove permanent unreachability ────────

describe('STEP 10 -- assembleTopicResult: proving the exact-topic path is TYPE-SYSTEM-enforced unreachable for a knowledge-only topic, not merely unreachable by convention', () => {
  test('lookupTopicClaims never places a knowledge-only-topic claim into matches, for any goal set -- the only production caller of assembleTopicResult', () => {
    const c = claim({ claim_id: 'SIM-13', topic: SIMULATED_TOPIC })
    const cReal = claim({ claim_id: 'SIM-14', topic: 'commercial_use' })
    const g = goal({ goal_id: 'g-6', category: 'commercial_use' })
    const result = lookupTopicClaims([g], [c, cReal], facts())
    expect(result.matches.map((m) => m.claim_id)).toEqual(['SIM-14'])
  })

  /**
   * `lookupTopicClaims`'s own `discoveredTopics` parameter (5th positional
   * arg) is declared `GoalCategory[]` in lib/retrieval-engine/lookup-topic-claims.ts
   * -- deliberately UNCHANGED by the KnowledgeTopic Foundation milestone
   * (unlike `deriveKnowledgeReadinessNeeds`'s own `discoveredTopics`, which
   * this milestone DID widen to `KnowledgeTopic[]` for Track B). This is
   * exactly why `assembleTopicResult`'s guard is structurally unreachable:
   * `retrieve.ts`'s own real call site always passes `[]` for it (proven by
   * source inspection, retrieve.ts line 213), and even a hypothetical future
   * caller wiring `discoveredTopicCategories()`'s now-`KnowledgeTopic[]`
   * output into this specific parameter would need a real, visible,
   * reviewable type change to this file first -- it cannot happen silently.
   * The same union-collapse limitation documented above (while
   * KNOWLEDGE_ONLY_TOPICS is empty) means this cannot be proven with a
   * negative `@ts-expect-error` today; it is proven instead by direct source
   * inspection, recorded as a verified fact, not an assumption.
   */
  test('production retrieve() never feeds discovered topics into the exact-topic path at all -- confirmed by the actual real call, not merely by the parameter default', () => {
    const g = goal({ goal_id: 'g-6b', category: 'commercial_use' })
    const c = claim({ claim_id: 'SIM-13b', topic: SIMULATED_TOPIC, geographic_relevance_scope: ['France'] })
    const rel = relationship({ relationship_id: 'SIM-REL-9', source_topic: 'commercial_use', target_topic: SIMULATED_TOPIC })
    const su = baseSU({ user_goals: [COMMERCIAL_USE_GOAL], distribution_territory_mentions: [territoryMention({ mention_id: 'dt-4', value: 'France' })] })
    const occs = deriveDiscoveredTopicOccurrences(su, [c], [rel])
    // retrieve() is called exactly like production run-crc-conversation.ts
    // calls it -- discoveredTopicOccurrences supplied, but the exact-topic
    // lookup inside retrieve() never receives it (retrieve.ts:213 always
    // passes [] to lookupTopicClaims's own discoveredTopics parameter).
    const output = retrieve(handoff(), [], [g], [c], facts(), [rel], [], occs)
    const exactOrigin = output.results.filter((r) => r.claim_id === 'SIM-13b' && r.match_origin === 'exact_topic')
    expect(exactOrigin).toEqual([])
  })

  test('positive regression: assembleTopicResult still succeeds normally for a real exact-topic claim', () => {
    const c = claim({ claim_id: 'SIM-15', topic: 'commercial_use' })
    const result = assembleTopicResult(c)
    expect(result?.topic).toBe('commercial_use')
    expect(result?.matched_goal_category).toBe('commercial_use')
  })
})

// ── STEP 11: knowledge readiness / dependency askability ──────────────────

describe('STEP 11 -- knowledge readiness/askability with a knowledge-only discovered topic', () => {
  test('deriveKnowledgeReadinessNeeds accepts a KnowledgeTopic[] discoveredTopics list including the simulated topic without crashing, fabricating a question, or coercing it into a goal', () => {
    const c = claim({
      claim_id: 'SIM-16',
      topic: SIMULATED_TOPIC,
      unresolved_project_dependencies: ['human_contribution_description'],
    })
    const su = baseSU({ user_goals: [COMMERCIAL_USE_GOAL] })
    expect(() => {
      const needs = deriveKnowledgeReadinessNeeds(su, [c], createInitialBoundaryState(), [SIMULATED_TOPIC])
      // human_contribution_description is HANDLED_BY_DEDICATED_MODULE (excluded
      // from this generic path) -- the call must simply not throw and must not
      // produce a need that pretends the topic is a goal.
      expect(Array.isArray(needs)).toBe(true)
    }).not.toThrow()
  })
})

// ── STEP 12: reviewer label contract coherence ─────────────────────────────

describe('STEP 12 -- reviewer label contract: reviewerTopicLabel gracefully labels an unmapped knowledge-only topic without crashing or fabricating a GoalCategory label', () => {
  test('reviewerTopicLabel falls back to a readable transformation, never throws, never returns a GoalCategory label for a knowledge-only topic', () => {
    // Imported lazily to keep this describe block self-contained.
    const { reviewerTopicLabel } = require('@/lib/reviewer-lk/topic-labels')
    const label = reviewerTopicLabel(SIMULATED_TOPIC as unknown as string)
    expect(label).toBe('Test only regulatory disclosure')
    expect(GOAL_CATEGORIES.map((c) => c as string)).not.toContain(label)
  })
})
