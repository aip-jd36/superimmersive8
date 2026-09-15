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
import { getAskabilityEntry } from '@/lib/crc-engine/dependency-askability'
import { createInitialBoundaryState } from '@/lib/interview-engine/boundaries'
import { buildBoundedInterpretations } from '@/lib/bounded-interpretation/build-bounded-interpretation'
import { userGoalsToBiIntents } from '@/lib/bounded-interpretation/adapters'
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
    organization_location_mentions: [],
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
    // Principle 3 PM Concurrence Recording + Final CPR_026 Re-Review
    // milestone (2026-09-15): crc_eligible flips Pending -> Yes, together
    // with the target claim, per CPR_026 §N's own "approved together,
    // never staggered" sequencing. See
    // CPR_026_ADDENDUM_3_PRINCIPLE_3_CONCURRENCE_FINAL_REVIEW_2026-09-15.md.
    expect(r.crc_eligible).toBe('Yes')
    expect(r.superseded_by).toBeNull()
  })

  test('governed metadata matches TOPIC-RELATIONSHIPS.md\'s adopted record exactly -- no wording/value drift', () => {
    const r = relationship()
    expect(r.adoption_approver).toBe('JD (PM)')
    expect(r.adoption_decision_date).toBe('2026-09-13')
    expect(r.publication_scope).toBe('Reviewer/Commercial Assurance')
    expect(r.crc_approver).toBe('JD (PM)')
    expect(r.crc_decision_date).toBe('2026-09-15')
    expect(r.last_reviewed).toBe('2026-09-15')
  })

  test('F. target claim is Lifecycle: Adopted, crc_eligible: Yes -- together with this relationship (Principle 3 PM Concurrence Recording + Final CPR_026 Re-Review milestone, 2026-09-15)', () => {
    const c = targetClaim()
    expect(c.lifecycle).toBe('Adopted')
    expect(c.crc_eligible).toBe('Yes')
    // NY precedent jurisdiction gate (Bounded Fixture Governance
    // Authoring milestone, 2026-09-15) -- see
    // euai-art50-4-topicclaim.test.ts test B for the full assertion; this
    // gate, not crc_eligible, is now what governs whether the claim is
    // actually reached via this relationship (see G/H below).
    expect(c.applicability_requirements).toEqual([{ fact: 'jurisdiction', operator: 'equals', value: 'European Union' }])
    expect(c.geographic_relevance_scope).toBeUndefined()
  })

  test('relationshipIsAdoptedAndCrcEligible returns true for this relationship, now that crc_eligible: Yes (Principle 3 PM Concurrence Recording + Final CPR_026 Re-Review milestone, 2026-09-15) -- reachability is now governed by the jurisdiction gate (see G below), not this double gate', () => {
    expect(relationshipIsAdoptedAndCrcEligible(relationship())).toBe(true)
  })

  describe('G. commercial_use related-topic retrieval surfaces Article 50 through this relationship ONLY when EU assessment jurisdiction is stated (Principle 3 PM Concurrence Recording + Final CPR_026 Re-Review milestone, 2026-09-15)', () => {
    test('lookupRelatedTopicClaims: a confirmed commercial_use goal against the real, unmodified production fixtures, with NO jurisdiction stated, never returns the target claim (jurisdiction gate unresolved, not met)', () => {
      const result = lookupRelatedTopicClaims(
        [goal()],
        TOPIC_RELATIONSHIPS_FIXTURE,
        TOPIC_CLAIMS_FIXTURE,
        { jurisdiction: { included: [], excluded: [] }, toolMentions: [] },
      )
      expect(result.matches.map((m) => m.claim.claim_id)).not.toContain(CLAIM_ID)
    })

    test('lookupRelatedTopicClaims: with EU jurisdiction stated, the target claim IS now returned -- this is the intended, governed behavior (CPR_026 Addendum 2/3): the jurisdiction gate is an assessment-scope eligibility/relevance gate, not Article 2 applicability evidence; the claim\'s own bounded wording (euai-art50-4-topicclaim.test.ts test B2) independently forecloses CRC from treating this as establishing Article 50 applies to the project', () => {
      const result = lookupRelatedTopicClaims(
        [goal()],
        TOPIC_RELATIONSHIPS_FIXTURE,
        TOPIC_CLAIMS_FIXTURE,
        { jurisdiction: { included: ['European Union'], excluded: [] }, toolMentions: [] },
      )
      expect(result.matches.map((m) => m.claim.claim_id)).toContain(CLAIM_ID)
    })

    test('lookupRelatedTopicClaims: a non-EU jurisdiction (New York, France-as-literal-non-EU-alias-miss) still excludes the target claim -- the gate is specific to a literal "European Union" match, not any jurisdiction', () => {
      const result = lookupRelatedTopicClaims(
        [goal()],
        TOPIC_RELATIONSHIPS_FIXTURE,
        TOPIC_CLAIMS_FIXTURE,
        { jurisdiction: { included: ['New York', 'France'], excluded: [] }, toolMentions: [] },
      )
      expect(result.matches.map((m) => m.claim.claim_id)).not.toContain(CLAIM_ID)
    })

    for (const category of GOAL_CATEGORIES.filter((c) => c !== 'commercial_use')) {
      test(`no other real GoalCategory ('${category}') surfaces the target claim via this relationship, even with EU jurisdiction stated -- the relationship's own source_topic is commercial_use only`, () => {
        const result = lookupRelatedTopicClaims(
          [goal({ category })],
          TOPIC_RELATIONSHIPS_FIXTURE,
          TOPIC_CLAIMS_FIXTURE,
          { jurisdiction: { included: ['European Union'], excluded: [] }, toolMentions: [] },
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
   * Double-gate proof (Step 10; REWRITTEN, Principle 3 PM Concurrence
   * Recording + Final CPR_026 Re-Review milestone, 2026-09-15) -- fully
   * synthetic, never-production copies on BOTH sides of every row now.
   * The real claim and relationship are both `crc_eligible: 'Yes'` as of
   * this milestone (tests A/F above), so the double gate can no longer be
   * demonstrated using real current state for the "Pending" side, as the
   * pre-existing version of this block did. This rewrite makes the proof
   * self-contained and independent of either object's real eligibility
   * value going forward -- it demonstrates the permanent architectural
   * invariant (`lookupRelatedTopicClaims` requires BOTH sides
   * independently Adopted + crc_eligible: Yes), not a fact about this
   * specific claim's current governance state. All jurisdiction facts
   * below include European Union so the applicability dimension is
   * satisfied in every row -- isolating the eligibility dimension alone,
   * exactly as this block's own name promises.
   */
  describe('double-gate proof -- fully synthetic clones on both sides, independent of real production eligibility', () => {
    const euFacts = { jurisdiction: { included: ['European Union'], excluded: [] }, toolMentions: [] }

    const syntheticEligibleClaim: TopicClaim = {
      ...targetClaim(),
      crc_eligible: 'Yes',
      crc_publication_scope: targetClaim().crc_publication_scope ?? 'SYNTHETIC TEST ONLY -- not a real approved scope.',
      crc_candidate_statement: targetClaim().crc_candidate_statement ?? 'SYNTHETIC TEST ONLY.',
    }
    const syntheticPendingClaim: TopicClaim = {
      ...targetClaim(),
      crc_eligible: 'Pending',
    }
    const syntheticEligibleRelationship: TopicRelationship = {
      ...relationship(),
      crc_eligible: 'Yes',
      crc_approver: relationship().crc_approver,
      crc_decision_date: relationship().crc_decision_date,
    }
    const syntheticPendingRelationship: TopicRelationship = {
      ...relationship(),
      crc_eligible: 'Pending',
      crc_approver: 'PENDING',
      crc_decision_date: 'PENDING',
    }

    test('1. relationship Pending + claim Yes -> no retrieval', () => {
      const result = lookupRelatedTopicClaims(
        [goal()],
        [syntheticPendingRelationship],
        [...TOPIC_CLAIMS_FIXTURE.filter((c) => c.claim_id !== CLAIM_ID), syntheticEligibleClaim],
        euFacts,
      )
      expect(result.matches).toEqual([])
    })

    test('2. relationship Yes + claim Pending -> no retrieval', () => {
      const result = lookupRelatedTopicClaims(
        [goal()],
        [syntheticEligibleRelationship],
        [...TOPIC_CLAIMS_FIXTURE.filter((c) => c.claim_id !== CLAIM_ID), syntheticPendingClaim],
        euFacts,
      )
      expect(result.matches).toEqual([])
    })

    test('3. relationship Pending + claim Pending -> no retrieval', () => {
      const result = lookupRelatedTopicClaims(
        [goal()],
        [syntheticPendingRelationship],
        [...TOPIC_CLAIMS_FIXTURE.filter((c) => c.claim_id !== CLAIM_ID), syntheticPendingClaim],
        euFacts,
      )
      expect(result.matches).toEqual([])
    })

    test('sanity check: BOTH synthetically eligible together, WITH the EU jurisdiction gate satisfied, DOES retrieve -- confirms tests 1-3 fail closed for the right reason (the eligibility gate), not because the lookup is broken', () => {
      const result = lookupRelatedTopicClaims(
        [goal()],
        [syntheticEligibleRelationship],
        [...TOPIC_CLAIMS_FIXTURE.filter((c) => c.claim_id !== CLAIM_ID), syntheticEligibleClaim],
        euFacts,
      )
      expect(result.matches.map((m) => m.claim.claim_id)).toContain(CLAIM_ID)
    })

    test('this describe block never mutates the real production fixtures', () => {
      const beforeClaim = JSON.parse(JSON.stringify(targetClaim()))
      const beforeRel = JSON.parse(JSON.stringify(relationship()))
      expect(targetClaim()).toEqual(beforeClaim)
      expect(relationship()).toEqual(beforeRel)
    })
  })

  /**
   * Jurisdiction-gate canary (Bounded Fixture Governance Authoring
   * milestone, 2026-09-15; CPR_026 Remedy Reconsideration concurrence).
   * Proves, through the REAL, unmodified production pipeline
   * (`retrieve()` -> `buildBoundedInterpretations()`), that the NY-
   * precedent jurisdiction gate authored on the target claim (test B/F
   * above) behaves exactly as CPR_025 §V (canary tests 3 & 6) proved for
   * the real NY claim: gates ELIGIBILITY/RELEVANCE only, never lets
   * Bounded Interpretation reach `directly_relevant`, and leaves
   * `union_establishment_or_output_use` permanently, structurally
   * unresolved. Uses the SAME synthetic-clone technique as the double-gate
   * proof above (never the packaged `synthetic-eligibility-canary.ts`
   * harness, which has no `topicRelationships` parameter and so cannot
   * exercise this claim's only reach path) -- isolated `crc_eligible: 'Yes'`
   * overrides on structuredClone'd copies, the real fixture arrays never
   * mutated. Production `crc_eligible` remains `Pending` throughout this
   * entire describe block (test A/F above already prove this) -- this
   * canary exists to validate runtime READINESS for a future CPR_026
   * re-review, never to activate Article 50 itself.
   */
  describe('jurisdiction-gate canary -- synthetic clones only, production eligibility never changed', () => {
    const syntheticClaim: TopicClaim = structuredClone({
      ...targetClaim(),
      crc_eligible: 'Yes',
    })
    const syntheticRelationship: TopicRelationship = structuredClone({
      ...relationship(),
      crc_eligible: 'Yes',
      crc_approver: 'SYNTHETIC TEST',
      crc_decision_date: '2026-09-13',
    })
    // Deliberately isolated -- unlike the double-gate proof above (which
    // exercises the real, unmodified commercial_use claim population as
    // background), this canary supplies ONLY the synthetic Article 50
    // claim/relationship so `buildBoundedInterpretations`'s one resulting
    // `commercial_use` BoundedInterpretation is driven entirely by this
    // claim's own retrieval outcome -- no mixed-resolution aggregation
    // from unrelated real commercial_use claims to reason about or risk
    // masking a regression behind.
    const claims = [syntheticClaim]
    const relationships = [syntheticRelationship]

    function run(jurisdictionIncluded: string[], jurisdictionExcluded: string[] = []) {
      const out = retrieve(
        handoff(),
        [],
        [goal()],
        claims,
        { jurisdiction: { included: jurisdictionIncluded, excluded: jurisdictionExcluded }, toolMentions: [] },
        relationships,
      )
      const interpretations = buildBoundedInterpretations(userGoalsToBiIntents([goal()]), out.results, out.diagnostics, { state: 'unknown' })
      return { out, interpretations }
    }

    test('CASE A: assessment jurisdiction = European Union -- claim passes the gate and is retrieved', () => {
      const { out } = run(['European Union'])
      expect(out.results.map((r) => r.claim_id)).toContain(CLAIM_ID)
    })

    test('CASE B: assessment jurisdiction = New York -- claim does NOT survive the EU jurisdiction gate', () => {
      const { out } = run(['New York'])
      expect(out.results.map((r) => r.claim_id)).not.toContain(CLAIM_ID)
    })

    test('CASE C: assessment jurisdiction = California -- same exclusion', () => {
      const { out } = run(['California'])
      expect(out.results.map((r) => r.claim_id)).not.toContain(CLAIM_ID)
    })

    test('CASE D: assessment jurisdiction unresolved/absent -- Article 50 does not surface through ordinary CRC retrieval (fail-closed, never guessed)', () => {
      const { out } = run([])
      expect(out.results.map((r) => r.claim_id)).not.toContain(CLAIM_ID)
    })

    test('CASE E (global-reach test): a generic commercial_use conversation with no EU assessment jurisdiction never surfaces Article 50 -- this is CPR_026\'s §D/§F reach problem, now resolved for this bounded scope', () => {
      const { out } = run(['United States'])
      expect(out.results.map((r) => r.claim_id)).not.toContain(CLAIM_ID)
    })

    test('HARD BI TEST: with the jurisdiction gate MET (EU), the aggregate BI status is relevant_applicability_unresolved -- NEVER directly_relevant -- because union_establishment_or_output_use forces the hedge independently of the gate', () => {
      const { out, interpretations } = run(['European Union'])
      const result = out.results.find((r) => r.claim_id === CLAIM_ID)
      expect(result).toBeDefined()
      // The gate itself is met -- confirmed independently, not assumed:
      // no applicability_unmet diagnostic was raised for this goal.
      expect(out.diagnostics.some((d) => d.reason === 'applicability_unmet')).toBe(false)
      // Isolated scenario (only the synthetic Article 50 claim/relationship
      // are supplied) -- exactly one BoundedInterpretation, for the single
      // commercial_use goal, driven entirely by this claim.
      expect(interpretations).toHaveLength(1)
      expect(interpretations[0].status).not.toBe('directly_relevant')
      expect(interpretations[0].status).toBe('relevant_applicability_unresolved')
    })

    test('DEPENDENCY CANARY: union_establishment_or_output_use remains present, unresolved, and unresolved_project_dependencies is passed through unmodified regardless of jurisdiction gate outcome', () => {
      const { out } = run(['European Union'])
      const result = out.results.find((r) => r.claim_id === CLAIM_ID)
      expect(result?.unresolved_project_dependencies).toEqual([
        'deployer_status_confirmed',
        'content_constitutes_deep_fake',
        'artistic_creative_satirical_fictional_analogous_work',
        'union_establishment_or_output_use',
      ])
      // Not converted into a SelectorNeed / askability entry by anything this canary exercises.
      expect(getAskabilityEntry('union_establishment_or_output_use')).toBeUndefined()
      // Not satisfiable by DistributionTerritoryMention or OrganizationLocationMention -- neither
      // fact is consumed anywhere in this pipeline; only AssessmentJurisdictionMention (via the
      // `jurisdiction` ApplicabilityFact) is read by isApplicable for this claim's own gate.
    })

    test('original production fixtures are never mutated by this canary', () => {
      const beforeClaim = JSON.parse(JSON.stringify(targetClaim()))
      const beforeRel = JSON.parse(JSON.stringify(relationship()))
      run(['European Union'])
      expect(targetClaim()).toEqual(beforeClaim)
      expect(relationship()).toEqual(beforeRel)
    })
  })
})
