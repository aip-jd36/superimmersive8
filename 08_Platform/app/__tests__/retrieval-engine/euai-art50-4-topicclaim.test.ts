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
 * become, a `GoalCategory` value). This milestone does not author a CRC
 * Publication Review, does not change `crc_eligible`, and does not author a
 * `commercial_use -> ai_content_transparency` `TopicRelationship`.
 *
 * [UPDATE, Adopted TopicRelationship production representation milestone,
 * 2026-09-13, same day, later session]: `REL-COMMERCIAL-USE-AI-CONTENT-
 * TRANSPARENCY-v1` now exists in `topic-relationships-fixture.ts` (formally
 * Adopted, `crc_eligible: 'Pending'`) -- test C below is updated
 * accordingly to assert the correct, current invariant (a relationship
 * targeting this topic must remain `crc_eligible: 'Pending'`, not that none
 * exists). Full relationship-side dormancy proof lives in
 * `euai-art50-4-topicrelationship.test.ts`, not duplicated here.
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
    organization_location_mentions: [],
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
    // Principle 3 PM Concurrence Recording + Final CPR_026 Re-Review
    // milestone (2026-09-15): crc_eligible flips Pending -> Yes, together
    // with REL-COMMERCIAL-USE-AI-CONTENT-TRANSPARENCY-v1 (test C below),
    // following PM's explicit Principle 3 concurrence and a final CPR_026
    // re-review of all seven Publication Policy principles. See
    // CPR_026_ADDENDUM_3_PRINCIPLE_3_CONCURRENCE_FINAL_REVIEW_2026-09-15.md.
    expect(c.crc_eligible).toBe('Yes')
    expect(c.superseded_by).toBeNull()
  })

  test('B. governed metadata matches GOVERNED-CLAIMS.md\'s Wave 9 record exactly -- no wording/value drift', () => {
    const c = claim()
    expect(c.claim_character).toBe('established')
    expect(c.jurisdiction).toBe('European Union')
    // Bounded Fixture Governance Authoring milestone (2026-09-15, CPR_026
    // Remedy Reconsideration concurrence): the NY precedent's jurisdiction
    // gate, transferred -- see the fixture's own inline comment for why
    // this is eligibility/relevance gating, never Article 2 applicability
    // evidence. union_establishment_or_output_use (below) remains the
    // sole carrier of the actual statutory question.
    expect(c.applicability_requirements).toEqual([{ fact: 'jurisdiction', operator: 'equals', value: 'European Union' }])
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

  test('B2. crc_publication_scope/crc_candidate_statement are authored and, as of the final CPR_026 re-review (2026-09-15), APPROVED -- crc_eligible: Yes (test A) means these fields now govern real CRC output', () => {
    const c = claim()
    expect(c.crc_publication_scope).not.toBeNull()
    expect(c.crc_candidate_statement).not.toBeNull()
    // The T-finding terminology clarification (CPR_026 Remedy
    // Reconsideration concurrence): must explicitly disclaim jurisdiction-
    // attachment even from mere mention, mirroring CPR_025's own NY wording.
    expect(c.crc_publication_scope).toMatch(/even.*merely.*mentioning|including the user merely (selecting|stating|mentioning)/i)
    expect(c.crc_publication_scope).toMatch(/does NOT establish that Regulation \(EU\) 2024\/1689 territorially applies/i)
    expect(c.crc_publication_scope).toMatch(/must not state or imply.*that the user.*is the statutory "deployer"/i)
    expect(c.crc_publication_scope).toMatch(/Article 2\(1\)\(b\).*establishment.*Article 2\(1\)\(c\).*output-use.*remain unresolved/i)
  })

  test('B3. crc_candidate_statement is byte-identical to FGR_019 §2\'s corrected wording -- a wording-fidelity defect (light restructuring, not actually verbatim despite an earlier commit\'s own comment claiming so) was found and fixed during the final CPR_026 re-review (2026-09-15)', () => {
    const c = claim()
    expect(c.crc_candidate_statement).toBe(
      'Under Article 50(4), first subparagraph, of Regulation (EU) 2024/1689 (the AI Act), a deployer of an AI system that generates or manipulates image, audio, or video content constituting a "deep fake" must disclose that the content has been artificially generated or manipulated. This obligation does not apply where the use is authorised by law to detect, prevent, investigate, or prosecute criminal offences. Where the content forms part of an evidently artistic, creative, satirical, fictional, or analogous work or programme, this disclosure obligation is not removed but is limited to disclosing the existence of such generated or manipulated content in an appropriate manner that does not hamper the display or enjoyment of the work.',
    )
  })

  test('C. the one TopicRelationship targeting ai_content_transparency in the production fixture is now crc_eligible: Yes, together with this claim (Principle 3 PM Concurrence Recording + Final CPR_026 Re-Review milestone, 2026-09-15) -- see euai-art50-4-topicrelationship.test.ts for the full relationship-side proof', () => {
    const targeting = TOPIC_RELATIONSHIPS_FIXTURE.filter((r) => r.target_topic === TOPIC)
    expect(targeting).toHaveLength(1)
    for (const r of targeting) {
      expect(r.crc_eligible).toBe('Yes')
      expect(r.lifecycle).toBe('Adopted')
    }
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

    test('lookupTopicClaims: even with EU-flavored jurisdiction/territory facts attested, commercial_use never returns this claim (this claim is knowledge-only -- ai_content_transparency is not a GoalCategory, so it is structurally unreachable via lookupTopicClaims\'s exact-topic path regardless of applicability_requirements or crc_eligible; the newly-authored jurisdiction gate, per test B above, has no bearing on this exact-topic path at all -- see euai-art50-4-topicrelationship.test.ts and the jurisdiction-gate canary for the relationship path this gate actually governs)', () => {
      const result = lookupTopicClaims(
        [goal({ category: 'commercial_use' })],
        TOPIC_CLAIMS_FIXTURE,
        { jurisdiction: { included: ['European Union', 'France'], excluded: [] }, toolMentions: [] },
      )
      expect(result.matches.map((m) => m.claim_id)).not.toContain(CLAIM_ID)
    })
  })

  describe('related-topic retrieval never surfaces this claim absent a stated EU assessment jurisdiction, for any active goal (Principle 3 PM Concurrence Recording + Final CPR_026 Re-Review milestone, 2026-09-15: REL-COMMERCIAL-USE-AI-CONTENT-TRANSPARENCY-v1 now targets this claim and both are crc_eligible: Yes -- see euai-art50-4-topicrelationship.test.ts\'s own jurisdiction-gate canary for the EU-jurisdiction-present case where commercial_use DOES reach this claim)', () => {
    for (const category of GOAL_CATEGORIES) {
      test(`lookupRelatedTopicClaims: a confirmed '${category}' goal with NO jurisdiction stated never reaches ${CLAIM_ID} (jurisdiction gate resolves unresolved, not met)`, () => {
        const result = lookupRelatedTopicClaims(
          [goal({ category })],
          TOPIC_RELATIONSHIPS_FIXTURE,
          TOPIC_CLAIMS_FIXTURE,
          { jurisdiction: { included: [], excluded: [] }, toolMentions: [] },
        )
        expect(result.matches.map((m) => m.claim.claim_id)).not.toContain(CLAIM_ID)
      })
    }

    test('lookupRelatedTopicClaims: a confirmed commercial_use goal with a NON-EU jurisdiction stated (New York) still never reaches CLAIM_ID -- the gate is specific, not merely "any jurisdiction stated"', () => {
      const result = lookupRelatedTopicClaims(
        [goal({ category: 'commercial_use' })],
        TOPIC_RELATIONSHIPS_FIXTURE,
        TOPIC_CLAIMS_FIXTURE,
        { jurisdiction: { included: ['New York'], excluded: [] }, toolMentions: [] },
      )
      expect(result.matches.map((m) => m.claim.claim_id)).not.toContain(CLAIM_ID)
    })
  })

  describe('F. discovered/territory-driven retrieval never surfaces this claim', () => {
    test('deriveClaimTargetedDiscoveryOccurrences: a confirmed EU-flavored distribution-territory mention alongside an active commercial_use goal produces zero occurrences for this claim -- geographic_relevance_scope remains absent (opt-out), independently sufficient on its own now that crc_eligible: Yes (Principle 3 PM Concurrence Recording + Final CPR_026 Re-Review milestone, 2026-09-15) no longer provides a second, independent reason', () => {
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

    test('lookupDiscoveredTopicClaims: a synthetic, directly-constructed occurrence naming this exact topic, with NO jurisdiction stated, is still excluded -- via the jurisdiction applicability gate now that crc_eligible: Yes no longer blocks it on its own (Principle 3 PM Concurrence Recording + Final CPR_026 Re-Review milestone, 2026-09-15)', () => {
      const result = lookupDiscoveredTopicClaims(
        [{ topic: TOPIC, trigger_id: 'synthetic-test-trigger', source_kind: 'distribution_territory_mention', source_id: 'dt-1', source_goal_category: 'commercial_use' }],
        TOPIC_CLAIMS_FIXTURE,
        { jurisdiction: { included: [], excluded: [] }, toolMentions: [] },
      )
      expect(result.matches.map((m) => m.claim.claim_id)).not.toContain(CLAIM_ID)
    })

    test('lookupDiscoveredTopicClaims: with a synthetic occurrence AND EU jurisdiction stated, the claim WOULD now be retrieved via this path too -- consistent, not a regression: Track A applies the SAME generic applicability gate as the relationship path (evaluateApplicabilityExpression), so this is expected once eligible; what actually prevents this in practice is that geographic_relevance_scope remains absent, so real discovery (the F tests above) can never produce such an occurrence to begin with -- this test exercises the synthetic/defense-in-depth path only, not real discovery', () => {
      const result = lookupDiscoveredTopicClaims(
        [{ topic: TOPIC, trigger_id: 'synthetic-test-trigger', source_kind: 'distribution_territory_mention', source_id: 'dt-1', source_goal_category: 'commercial_use' }],
        TOPIC_CLAIMS_FIXTURE,
        { jurisdiction: { included: ['European Union'], excluded: [] }, toolMentions: [] },
      )
      expect(result.matches.map((m) => m.claim.claim_id)).toContain(CLAIM_ID)
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
