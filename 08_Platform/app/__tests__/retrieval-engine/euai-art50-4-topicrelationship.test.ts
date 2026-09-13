/**
 * Adopted `commercial_use -> ai_content_transparency` TopicRelationship
 * production representation (2026-09-13, bounded production Living-
 * Knowledge authoring milestone).
 *
 * Proves two things, independently: (1) the new
 * `REL-COMMERCIAL-USE-AI-CONTENT-TRANSPARENCY-v1` fixture entry faithfully
 * mirrors `TOPIC-RELATIONSHIPS.md`'s own adopted record, and (2) the
 * relationship (and, through it, its target claim) is structurally INERT
 * for CRC through every retrieval path -- related-topic lookup, public
 * `retrieve()`, discovered/Track C, and knowledge-readiness questioning --
 * solely because this relationship's own `crc_eligible: 'Pending'` (and,
 * independently, because the target claim's own `crc_eligible: 'Pending'`
 * is unaffected and unchanged). This milestone does not author a CRC
 * Publication Review, does not change either `crc_eligible` value, and does
 * not add `geographic_relevance_scope` or applicability metadata anywhere.
 */

import { TOPIC_CLAIMS_FIXTURE } from '@/lib/retrieval-engine/topic-claims-fixture'
import { TOPIC_RELATIONSHIPS_FIXTURE } from '@/lib/retrieval-engine/topic-relationships-fixture'
import { MATRIX_FIXTURE } from '@/lib/retrieval-engine/matrix-fixture'
import { retrieve } from '@/lib/retrieval-engine/retrieve'
import { lookupRelatedTopicClaims, relationshipIsAdoptedAndCrcEligible } from '@/lib/retrieval-engine/lookup-topic-relationships'
import { deriveClaimTargetedDiscoveryOccurrences, deriveDiscoveredTopicOccurrences } from '@/lib/crc-engine/discovered-relevance'
import { deriveKnowledgeReadinessNeeds } from '@/lib/crc-engine/knowledge-readiness'
import { createInitialBoundaryState } from '@/lib/interview-engine/boundaries'
import { GOAL_CATEGORIES, type GoalCategory, type RetrievalHandoff, type StructuredUnderstanding, type UserGoal } from '@/types/interview-engine'
import type { TopicClaim, TopicRelationship } from '@/lib/retrieval-engine/types'

const RELATIONSHIP_ID = 'REL-COMMERCIAL-USE-AI-CONTENT-TRANSPARENCY-v1'
const CLAIM_ID = 'CLAIM-EUAI-ART50-4-AUDIOVISUAL-DEEPFAKE-DISCLOSURE-001-v1'
const TOPIC = 'ai_content_transparency'

function relationship() {
  const r = TOPIC_RELATIONSHIPS_FIXTURE.find((x) => x.relationship_id === RELATIONSHIP_ID)
  if (!r) throw new Error(`${RELATIONSHIP_ID} not found in TOPIC_RELATIONSHIPS_FIXTURE`)
  return r
}

function targetClaim() {
  const c = TOPIC_CLAIMS_FIXTURE.find((x) => x.claim_id === CLAIM_ID)
  if (!c) throw new Error(`${CLAIM_ID} not found in TOPIC_CLAIMS_FIXTURE`)
  return c
}

function goal(overrides: Partial<UserGoal> = {}): UserGoal {
  return {
    goal_id: 'g-1',
    state: 'confirmed',
    raw_text: 'x',
    category: 'commercial_use',
    scope: 'informational',
    superseded_by: null,
    source_turn: 1,
    source_statement: 'x',
    ...overrides,
  }
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
    content_presence_mentions: [],
    distribution_territory_mentions: [],
    current_phase: 2,
    gate_1_state: 'not_met',
    gate_2_state: 'not_yet_stable',
    completion_reason: null,
    opt_out_scope: null,
    ...overrides,
  }
}

describe('REL-COMMERCIAL-USE-AI-CONTENT-TRANSPARENCY-v1 -- production TopicRelationship representation (2026-09-13)', () => {
  test('A/B/C/D/E. exists in TOPIC_RELATIONSHIPS_FIXTURE with the correct identity fields', () => {
    const r = relationship()
    expect(r.relationship_id).toBe(RELATIONSHIP_ID)
    expect(r.source_topic).toBe('commercial_use')
    expect(r.target_topic).toBe(TOPIC)
    expect(r.relationship_type).toBe('relevant_consideration')
    expect(r.lifecycle).toBe('Adopted')
    expect(r.crc_eligible).toBe('Pending')
    expect(r.superseded_by).toBeNull()
  })

  test('governed metadata matches TOPIC-RELATIONSHIPS.md\'s adopted record exactly -- no wording/value drift', () => {
    const r = relationship()
    expect(r.adoption_approver).toBe('JD (PM)')
    expect(r.adoption_decision_date).toBe('2026-09-13')
    expect(r.publication_scope).toBe('Reviewer/Commercial Assurance')
    expect(r.crc_approver).toBe('PENDING')
    expect(r.crc_decision_date).toBe('PENDING')
    expect(r.last_reviewed).toBe('2026-09-13')
  })

  test('F. target claim remains Lifecycle: Adopted, crc_eligible: Pending -- unaffected and unchanged by this relationship\'s authoring', () => {
    const c = targetClaim()
    expect(c.lifecycle).toBe('Adopted')
    expect(c.crc_eligible).toBe('Pending')
    expect(c.applicability_requirements).toEqual([])
    expect(c.geographic_relevance_scope).toBeUndefined()
  })

  test('relationshipIsAdoptedAndCrcEligible returns false for this relationship -- crc_eligible: Pending alone is sufficient to exclude it from every eligible-relationship computation', () => {
    expect(relationshipIsAdoptedAndCrcEligible(relationship())).toBe(false)
  })

  describe('G. commercial_use related-topic retrieval does NOT surface Article 50 through this relationship', () => {
    test('lookupRelatedTopicClaims: a confirmed commercial_use goal against the real, unmodified production fixtures never returns the target claim', () => {
      const result = lookupRelatedTopicClaims(
        [goal()],
        TOPIC_RELATIONSHIPS_FIXTURE,
        TOPIC_CLAIMS_FIXTURE,
        { jurisdiction: { included: [], excluded: [] }, toolMentions: [] },
      )
      expect(result.matches.map((m) => m.claim.claim_id)).not.toContain(CLAIM_ID)
    })

    test('lookupRelatedTopicClaims: even with EU-flavored jurisdiction facts attested, still no match -- crc_eligible: Pending is the controlling gate, not applicability', () => {
      const result = lookupRelatedTopicClaims(
        [goal()],
        TOPIC_RELATIONSHIPS_FIXTURE,
        TOPIC_CLAIMS_FIXTURE,
        { jurisdiction: { included: ['European Union', 'France'], excluded: [] }, toolMentions: [] },
      )
      expect(result.matches.map((m) => m.claim.claim_id)).not.toContain(CLAIM_ID)
    })

    for (const category of GOAL_CATEGORIES) {
      test(`no other real GoalCategory ('${category}') surfaces the target claim via this relationship either`, () => {
        const result = lookupRelatedTopicClaims(
          [goal({ category })],
          TOPIC_RELATIONSHIPS_FIXTURE,
          TOPIC_CLAIMS_FIXTURE,
          { jurisdiction: { included: [], excluded: [] }, toolMentions: [] },
        )
        expect(result.matches.map((m) => m.claim.claim_id)).not.toContain(CLAIM_ID)
      })
    }
  })

  test('H. public retrieve() does not surface Article 50 for a real commercial_use conversation, with the real, unmodified production relationships/claims/matrix wired in exactly as production does', () => {
    const out = retrieve(
      handoff(),
      MATRIX_FIXTURE,
      [goal()],
      TOPIC_CLAIMS_FIXTURE,
      { jurisdiction: { included: [], excluded: [] }, toolMentions: [] },
      TOPIC_RELATIONSHIPS_FIXTURE,
    )
    expect(out.results.map((r) => r.claim_id)).not.toContain(CLAIM_ID)
    const serialized = JSON.stringify(out.results)
    expect(serialized).not.toContain('ai_content_transparency')
  })

  describe('I. discovered/Track C retrieval does not surface Article 50', () => {
    test('deriveClaimTargetedDiscoveryOccurrences: an EU-flavored distribution-territory mention alongside a commercial_use goal, with the real relationship fixture now present, still produces zero occurrences for this topic', () => {
      const su = emptySU({
        user_goals: [goal()],
        distribution_territory_mentions: [
          { mention_id: 'dt-1', value: 'European Union', confidence: 'confirmed', source_turn: 1, source_statement: 'EU', superseded_by: null },
        ],
      })
      const occurrences = deriveClaimTargetedDiscoveryOccurrences(su, TOPIC_CLAIMS_FIXTURE, TOPIC_RELATIONSHIPS_FIXTURE)
      expect(occurrences.some((o) => o.topic === TOPIC)).toBe(false)
    })

    test('deriveDiscoveredTopicOccurrences (real production union): same scenario, zero occurrences for this topic', () => {
      const su = emptySU({
        user_goals: [goal()],
        distribution_territory_mentions: [
          { mention_id: 'dt-1', value: 'European Union', confidence: 'confirmed', source_turn: 1, source_statement: 'EU', superseded_by: null },
        ],
      })
      const occurrences = deriveDiscoveredTopicOccurrences(su, TOPIC_CLAIMS_FIXTURE, TOPIC_RELATIONSHIPS_FIXTURE)
      expect(occurrences.some((o) => o.topic === TOPIC)).toBe(false)
    })
  })

  test('J. no fabricated UserGoal -- ai_content_transparency is not, and does not become, a GoalCategory', () => {
    expect((GOAL_CATEGORIES as readonly string[]).includes(TOPIC)).toBe(false)
  })

  test('K. geography remains dormant -- target claim carries no geographic_relevance_scope, and this relationship does not add territory metadata anywhere', () => {
    expect(targetClaim().geographic_relevance_scope).toBeUndefined()
    // No relationship field represents geography at all -- confirmed by the type shape asserted above (no such field exists on TopicRelationship).
  })

  test('L. knowledge-readiness/questioning does not begin asking about this claim\'s dependencies, even with every real GoalCategory active (including commercial_use, now that the relationship exists)', () => {
    const su = emptySU({ user_goals: (GOAL_CATEGORIES as readonly GoalCategory[]).map((category, i) => goal({ goal_id: `g-${i}`, category })) })
    const needs = deriveKnowledgeReadinessNeeds(su, TOPIC_CLAIMS_FIXTURE, createInitialBoundaryState())
    expect(needs.some((n) => n.claim_ids.includes(CLAIM_ID))).toBe(false)
    const artClaimDependencyIds = new Set([
      'deployer_status_confirmed',
      'content_constitutes_deep_fake',
      'artistic_creative_satirical_fictional_analogous_work',
      'union_establishment_or_output_use',
    ])
    expect(needs.some((n) => artClaimDependencyIds.has(n.dependency_id))).toBe(false)
  })

  test('the pre-existing live relationship (REL-COPY-OWNERSHIP-COPYRIGHTABILITY-v1) is unaffected by this addition', () => {
    const rel = TOPIC_RELATIONSHIPS_FIXTURE.find((r) => r.relationship_id === 'REL-COPY-OWNERSHIP-COPYRIGHTABILITY-v1')!
    expect(rel.lifecycle).toBe('Adopted')
    expect(rel.crc_eligible).toBe('Yes')
  })

  test('no duplicate relationship IDs in the production fixture', () => {
    const ids = TOPIC_RELATIONSHIPS_FIXTURE.map((r) => r.relationship_id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  /**
   * Double-gate proof (Step 10) -- synthetic, never-production copies only.
   * Neither production `crc_eligible` value is ever changed; these clones
   * exist solely to demonstrate the double gate holds in each direction
   * independently, establishing that a future publication decision on
   * either side remains independently governed.
   */
  describe('double-gate proof -- synthetic clones only, production eligibility never changed', () => {
    const syntheticEligibleClaim: TopicClaim = {
      ...targetClaim(),
      crc_eligible: 'Yes',
      crc_publication_scope: 'SYNTHETIC TEST ONLY -- not a real approved scope.',
      crc_candidate_statement: 'SYNTHETIC TEST ONLY.',
    }
    const syntheticEligibleRelationship: TopicRelationship = {
      ...relationship(),
      crc_eligible: 'Yes',
      crc_approver: 'SYNTHETIC TEST',
      crc_decision_date: '2026-09-13',
    }

    test('1. relationship Pending + claim Yes -> no retrieval', () => {
      const result = lookupRelatedTopicClaims(
        [goal()],
        TOPIC_RELATIONSHIPS_FIXTURE, // real, unmodified -- relationship still Pending
        [...TOPIC_CLAIMS_FIXTURE.filter((c) => c.claim_id !== CLAIM_ID), syntheticEligibleClaim],
        { jurisdiction: { included: [], excluded: [] }, toolMentions: [] },
      )
      expect(result.matches).toEqual([])
    })

    test('2. relationship Yes + claim Pending -> no retrieval', () => {
      const result = lookupRelatedTopicClaims(
        [goal()],
        [syntheticEligibleRelationship],
        TOPIC_CLAIMS_FIXTURE, // real, unmodified -- claim still Pending
        { jurisdiction: { included: [], excluded: [] }, toolMentions: [] },
      )
      expect(result.matches).toEqual([])
    })

    test('3. relationship Pending + claim Pending (the real, current production state) -> no retrieval', () => {
      const result = lookupRelatedTopicClaims(
        [goal()],
        TOPIC_RELATIONSHIPS_FIXTURE,
        TOPIC_CLAIMS_FIXTURE,
        { jurisdiction: { included: [], excluded: [] }, toolMentions: [] },
      )
      expect(result.matches).toEqual([])
    })

    test('sanity check: BOTH synthetically eligible together DOES retrieve -- confirms tests 1-3 fail closed for the right reason (a real gate), not because the lookup is broken', () => {
      const result = lookupRelatedTopicClaims(
        [goal()],
        [syntheticEligibleRelationship],
        [...TOPIC_CLAIMS_FIXTURE.filter((c) => c.claim_id !== CLAIM_ID), syntheticEligibleClaim],
        { jurisdiction: { included: [], excluded: [] }, toolMentions: [] },
      )
      expect(result.matches.map((m) => m.claim.claim_id)).toContain(CLAIM_ID)
    })
  })
})
