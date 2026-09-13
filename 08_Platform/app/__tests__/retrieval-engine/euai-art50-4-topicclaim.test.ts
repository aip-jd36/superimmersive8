/**
 * Adopted Article 50(4) Audiovisual TopicClaim production representation
 * (2026-09-13, bounded production Living-Knowledge authoring milestone).
 *
 * Proves two things, independently: (1) the new
 * `CLAIM-EUAI-ART50-4-AUDIOVISUAL-DEEPFAKE-DISCLOSURE-001-v1` fixture entry
 * faithfully mirrors GOVERNED-CLAIMS.md's own Wave 9 record, and (2) the
 * claim is structurally INERT for CRC through every retrieval path --
 * exact-topic, related-topic, discovered/territory-topic, and knowledge-
 * readiness questioning -- solely because `crc_eligible: 'Pending'` (plus,
 * independently, because `ai_content_transparency` is not, and does not
 * become, a `GoalCategory` value, and no `TopicRelationship` targets it).
 * This milestone does not author a CRC Publication Review, does not change
 * `crc_eligible`, and does not author a `commercial_use ->
 * ai_content_transparency` `TopicRelationship`.
 */

import { TOPIC_CLAIMS_FIXTURE } from '@/lib/retrieval-engine/topic-claims-fixture'
import { TOPIC_RELATIONSHIPS_FIXTURE } from '@/lib/retrieval-engine/topic-relationships-fixture'
import { lookupTopicClaims } from '@/lib/retrieval-engine/lookup-topic-claims'
import { lookupRelatedTopicClaims } from '@/lib/retrieval-engine/lookup-topic-relationships'
import { lookupDiscoveredTopicClaims } from '@/lib/retrieval-engine/lookup-discovered-topic-claims'
import { deriveClaimTargetedDiscoveryOccurrences, deriveDiscoveredTopicOccurrences } from '@/lib/crc-engine/discovered-relevance'
import { deriveKnowledgeReadinessNeeds } from '@/lib/crc-engine/knowledge-readiness'
import { getAskabilityEntry } from '@/lib/crc-engine/dependency-askability'
import { createInitialBoundaryState } from '@/lib/interview-engine/boundaries'
import { GOAL_CATEGORIES, type GoalCategory, type StructuredUnderstanding, type UserGoal } from '@/types/interview-engine'
import { isGoalCategoryTopic } from '@/lib/retrieval-engine/types'

const CLAIM_ID = 'CLAIM-EUAI-ART50-4-AUDIOVISUAL-DEEPFAKE-DISCLOSURE-001-v1'
const TOPIC = 'ai_content_transparency'

function claim() {
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

describe('CLAIM-EUAI-ART50-4-AUDIOVISUAL-DEEPFAKE-DISCLOSURE-001-v1 -- production TopicClaim representation (2026-09-13)', () => {
  test('A. exists in TOPIC_CLAIMS_FIXTURE with the correct identity fields', () => {
    const c = claim()
    expect(c.claim_id).toBe(CLAIM_ID)
    expect(c.topic).toBe(TOPIC)
    expect(c.lifecycle).toBe('Adopted')
    expect(c.crc_eligible).toBe('Pending')
    expect(c.superseded_by).toBeNull()
  })

  test('B. governed metadata matches GOVERNED-CLAIMS.md\'s Wave 9 record exactly -- no wording/value drift', () => {
    const c = claim()
    expect(c.claim_character).toBe('established')
    expect(c.jurisdiction).toBe('European Union')
    expect(c.applicability_requirements).toEqual([])
    expect(c.unresolved_project_dependencies).toEqual([
      'deployer_status_confirmed',
      'content_constitutes_deep_fake',
      'artistic_creative_satirical_fictional_analogous_work',
      'union_establishment_or_output_use',
    ])
    expect(c.provider_scope).toBeNull()
    expect(c.tool_scope).toBeNull()
    expect(c.publication_scope).toBe('Reviewer/Commercial Assurance')
    expect(c.last_verified).toBe('2026-09-13')
    // geographic_relevance_scope deliberately absent -- opt-out by this
    // field's own inverted default polarity (see types.ts).
    expect(c.geographic_relevance_scope).toBeUndefined()
  })

  test('B2. crc_publication_scope/crc_candidate_statement are null -- no CRC Publication Review has occurred, and the markdown\'s own candidate statement is an explicitly unapproved DRAFT, never carried into this production field', () => {
    const c = claim()
    expect(c.crc_publication_scope).toBeNull()
    expect(c.crc_candidate_statement).toBeNull()
  })

  test('C. no TopicRelationship in the production fixture targets ai_content_transparency -- this milestone does not author one', () => {
    const targeting = TOPIC_RELATIONSHIPS_FIXTURE.filter((r) => r.target_topic === TOPIC)
    expect(targeting).toEqual([])
  })

  test('H. ai_content_transparency is not, and does not become, a GoalCategory -- no fabricated UserGoal category exists for this topic', () => {
    expect((GOAL_CATEGORIES as readonly string[]).includes(TOPIC)).toBe(false)
    expect(isGoalCategoryTopic(TOPIC)).toBe(false)
  })

  test('V. no Article 50(2) claim exists anywhere in the production fixture', () => {
    const ids = TOPIC_CLAIMS_FIXTURE.map((c) => c.claim_id)
    expect(ids.some((id) => /ART50-2/i.test(id))).toBe(false)
  })

  test('W. no public-interest-text (Article 50(4) second subparagraph) claim exists anywhere in the production fixture', () => {
    const ids = TOPIC_CLAIMS_FIXTURE.map((c) => c.claim_id)
    expect(ids.some((id) => /PUBLIC.?INTEREST/i.test(id))).toBe(false)
  })

  describe('D/E. exact-topic retrieval never surfaces this claim, for any real GoalCategory (including commercial_use)', () => {
    for (const category of GOAL_CATEGORIES) {
      test(`lookupTopicClaims: a confirmed '${category}' goal never returns ${CLAIM_ID}`, () => {
        const result = lookupTopicClaims([goal({ category })], TOPIC_CLAIMS_FIXTURE, { jurisdiction: { included: [], excluded: [] }, toolMentions: [] })
        expect(result.matches.map((m) => m.claim_id)).not.toContain(CLAIM_ID)
      })
    }

    test('lookupTopicClaims: even with EU-flavored jurisdiction/territory facts attested, commercial_use never returns this claim (no formal gate exists to satisfy in the first place -- crc_eligible: Pending is the controlling gate)', () => {
      const result = lookupTopicClaims(
        [goal({ category: 'commercial_use' })],
        TOPIC_CLAIMS_FIXTURE,
        { jurisdiction: { included: ['European Union', 'France'], excluded: [] }, toolMentions: [] },
      )
      expect(result.matches.map((m) => m.claim_id)).not.toContain(CLAIM_ID)
    })
  })

  describe('related-topic retrieval never surfaces this claim (no relationship targets it, for any active goal)', () => {
    for (const category of GOAL_CATEGORIES) {
      test(`lookupRelatedTopicClaims: a confirmed '${category}' goal never reaches ${CLAIM_ID}`, () => {
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

  describe('F. discovered/territory-driven retrieval never surfaces this claim', () => {
    test('deriveClaimTargetedDiscoveryOccurrences: a confirmed EU-flavored distribution-territory mention alongside an active commercial_use goal produces zero occurrences for this claim -- geographic_relevance_scope is absent (opt-out) AND crc_eligible is Pending, either alone is sufficient', () => {
      const su = emptySU({
        user_goals: [goal({ category: 'commercial_use' })],
        distribution_territory_mentions: [
          { mention_id: 'dt-1', value: 'France', confidence: 'confirmed', source_turn: 1, source_statement: 'France', superseded_by: null },
          { mention_id: 'dt-2', value: 'European Union', confidence: 'confirmed', source_turn: 1, source_statement: 'EU', superseded_by: null },
        ],
      })
      const occurrences = deriveClaimTargetedDiscoveryOccurrences(su, TOPIC_CLAIMS_FIXTURE, TOPIC_RELATIONSHIPS_FIXTURE)
      expect(occurrences.some((o) => o.topic === TOPIC)).toBe(false)
    })

    test('deriveDiscoveredTopicOccurrences (the real production union of both discovery mechanisms): same EU-flavored scenario produces zero occurrences for this claim', () => {
      const su = emptySU({
        user_goals: [goal({ category: 'commercial_use' })],
        distribution_territory_mentions: [
          { mention_id: 'dt-1', value: 'European Union', confidence: 'confirmed', source_turn: 1, source_statement: 'EU', superseded_by: null },
        ],
      })
      const occurrences = deriveDiscoveredTopicOccurrences(su, TOPIC_CLAIMS_FIXTURE, TOPIC_RELATIONSHIPS_FIXTURE)
      expect(occurrences.some((o) => o.topic === TOPIC)).toBe(false)
    })

    test('lookupDiscoveredTopicClaims: defense in depth -- even a synthetic, directly-constructed occurrence naming this exact topic is still excluded, by the crc_eligible gate alone, independent of whether real discovery could ever produce one', () => {
      const result = lookupDiscoveredTopicClaims(
        [{ topic: TOPIC, trigger_id: 'synthetic-test-trigger', source_kind: 'distribution_territory_mention', source_id: 'dt-1', source_goal_category: 'commercial_use' }],
        TOPIC_CLAIMS_FIXTURE,
        { jurisdiction: { included: [], excluded: [] }, toolMentions: [] },
      )
      expect(result.matches.map((m) => m.claim.claim_id)).not.toContain(CLAIM_ID)
    })
  })

  describe('G. knowledge-readiness questioning never begins asking about this claim\'s dependencies', () => {
    test('deriveKnowledgeReadinessNeeds: a wide-open conversation (every real GoalCategory active) produces zero needs referencing this claim or any of its four dependency ids', () => {
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

    test('none of this claim\'s four unresolved dependencies are registered askable in the generic Living-Knowledge readiness path -- fail-closed by default, same discipline as the NY synthetic-performer claim\'s own actor-status dependency', () => {
      for (const dependencyId of [
        'deployer_status_confirmed',
        'content_constitutes_deep_fake',
        'artistic_creative_satirical_fictional_analogous_work',
        'union_establishment_or_output_use',
      ]) {
        expect(getAskabilityEntry(dependencyId)).toBeUndefined()
      }
    })
  })
})
