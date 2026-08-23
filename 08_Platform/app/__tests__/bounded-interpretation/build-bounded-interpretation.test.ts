/**
 * Bounded Interpretation deterministic evaluation suite (CRC Milestone 2,
 * User Goal + Bounded Interpretation, 2026-08-15). Every case here is
 * deterministic -- no live model needed to graduate this module, matching
 * lib/retrieval-engine's own established discipline for its equivalent
 * suite (retrieve.test.ts).
 */

import { buildBoundedInterpretations } from '@/lib/bounded-interpretation/build-bounded-interpretation'
import { directlyRelevantSummary, humanContributionRelevanceSentence } from '@/lib/bounded-interpretation/rules'
import { retrieve } from '@/lib/retrieval-engine/retrieve'
import { MATRIX_FIXTURE } from '@/lib/retrieval-engine/matrix-fixture'
import { TOPIC_CLAIMS_FIXTURE } from '@/lib/retrieval-engine/topic-claims-fixture'
import { TOPIC_RELATIONSHIPS_FIXTURE } from '@/lib/retrieval-engine/topic-relationships-fixture'
import type { ApplicabilityFacts } from '@/lib/retrieval-engine/lookup-topic-claims'
import type { RetrievalHandoff, UserGoal } from '@/types/interview-engine'
import type { MatrixRow, TopicClaim } from '@/lib/retrieval-engine/types'

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

function tool(identifier: string) {
  return { identifier, access_surface: 'unresolved', plan_tier: 'unknown' }
}

function goal(overrides: Partial<UserGoal> & Pick<UserGoal, 'goal_id' | 'raw_text'>): UserGoal {
  return {
    state: 'confirmed',
    category: 'unknown',
    scope: 'informational',
    superseded_by: null,
    source_turn: 1,
    source_statement: overrides.raw_text,
    ...overrides,
  }
}

describe('buildBoundedInterpretations -- goal filtering', () => {
  test('empty goals -> empty interpretations', () => {
    expect(buildBoundedInterpretations([], [])).toEqual([])
  })

  test('a superseded goal produces no interpretation', () => {
    const g = goal({ goal_id: 'g-1', raw_text: 'Can I use this commercially?', category: 'commercial_use', superseded_by: 'g-2' })
    expect(buildBoundedInterpretations([g], [])).toEqual([])
  })

  test('a declined goal produces no interpretation', () => {
    const g = goal({ goal_id: 'g-1', raw_text: 'never mind', state: 'declined', category: 'commercial_use' })
    expect(buildBoundedInterpretations([g], [])).toEqual([])
  })

  test('a confirmed_absent goal ("just experimenting") produces no interpretation', () => {
    const g = goal({ goal_id: 'g-1', raw_text: "I'm just experimenting", state: 'confirmed_absent', category: 'unknown' })
    expect(buildBoundedInterpretations([g], [])).toEqual([])
  })

  test('only the active, confirmed goal among a mix produces an interpretation', () => {
    const superseded = goal({ goal_id: 'g-1', raw_text: 'old goal', category: 'commercial_use', superseded_by: 'g-2' })
    const declined = goal({ goal_id: 'g-2', raw_text: 'declined goal', state: 'declined', category: 'commercial_use' })
    const active = goal({ goal_id: 'g-3', raw_text: 'Can I use this commercially?', category: 'unknown' })
    const out = buildBoundedInterpretations([superseded, declined, active], [])
    expect(out).toHaveLength(1)
    expect(out[0].goal_id).toBe('g-3')
  })
})

describe('buildBoundedInterpretations -- determination_request (PM revision 2/3, checked before category matching)', () => {
  test('a determination_request goal always resolves to determination_declined, even when a matching claim exists', () => {
    const out = retrieve(handoff({ tools: [tool('runway-gen3')] }), MATRIX_FIXTURE)
    const g = goal({ goal_id: 'g-1', raw_text: 'Can you certify this is cleared?', category: 'commercial_use', scope: 'determination_request' })
    const interpretations = buildBoundedInterpretations([g], out.results)
    expect(interpretations).toHaveLength(1)
    expect(interpretations[0].status).toBe('determination_declined')
    expect(interpretations[0].summary).toMatch(/doesn't issue certifications/i)
    expect(interpretations[0].supporting_claim_ids).toEqual([])
  })
})

describe('buildBoundedInterpretations -- directly_relevant', () => {
  test('a commercial_use goal with a matching eligible retrieval result resolves to directly_relevant, quoting the governed statement verbatim', () => {
    const out = retrieve(handoff({ tools: [tool('runway-gen3')] }), MATRIX_FIXTURE)
    const g = goal({ goal_id: 'g-1', raw_text: 'Can I use this commercially?', category: 'commercial_use' })
    const interpretations = buildBoundedInterpretations([g], out.results)
    expect(interpretations).toHaveLength(1)
    expect(interpretations[0].status).toBe('directly_relevant')
    expect(interpretations[0].summary).toContain("Runway's current Terms allow commercial use across all subscription tiers, provided you comply with the Terms of Service.")
    expect(interpretations[0].supporting_claim_ids).toEqual(['runway-gen3'])
  })

  test('directly_relevant summary is framed as "relevant to," never as answering or clearing the whole question (PM revision 4/10)', () => {
    const out = retrieve(handoff({ tools: [tool('kling')] }), MATRIX_FIXTURE)
    const g = goal({ goal_id: 'g-1', raw_text: 'Can I use this commercially?', category: 'commercial_use' })
    const interpretations = buildBoundedInterpretations([g], out.results)
    expect(interpretations[0].summary).toMatch(/relevant to/i)
    expect(interpretations[0].summary).not.toMatch(/therefore/i)
    expect(interpretations[0].summary).not.toMatch(/is cleared/i)
    expect(interpretations[0].summary).not.toMatch(/you can use this commercially\./i)
  })

  test('two mentioned tools both tagged commercial_use -> both governed statements are combined, neither dropped', () => {
    const out = retrieve(handoff({ tools: [tool('runway-gen3'), tool('kling')] }), MATRIX_FIXTURE)
    const g = goal({ goal_id: 'g-1', raw_text: 'Can I use this commercially?', category: 'commercial_use' })
    const interpretations = buildBoundedInterpretations([g], out.results)
    expect(interpretations[0].summary).toContain('Runway')
    expect(interpretations[0].summary).toContain('Kling')
    expect(interpretations[0].supporting_claim_ids.sort()).toEqual(['kling', 'runway-gen3'])
  })
})

describe('buildBoundedInterpretations -- outside_current_coverage', () => {
  test('copyright_ownership always resolves to outside_current_coverage -- no governed claim exists for it in the current Matrix (PM revision 1/9)', () => {
    const out = retrieve(handoff({ tools: [tool('runway-gen3')] }), MATRIX_FIXTURE)
    const g = goal({ goal_id: 'g-1', raw_text: 'Do I own the copyright for this video?', category: 'copyright_ownership' })
    const interpretations = buildBoundedInterpretations([g], out.results)
    expect(interpretations[0].status).toBe('outside_current_coverage')
    expect(interpretations[0].summary).toMatch(/doesn't establish an answer/i)
    expect(interpretations[0].summary).not.toMatch(/you own|you do not own|yes,|no,/i)
    expect(interpretations[0].supporting_claim_ids).toEqual([])
  })

  test('copyrightability resolves to outside_current_coverage and is worded distinctly from copyright_ownership (PM revision 1)', () => {
    const g = goal({ goal_id: 'g-1', raw_text: 'Is AI video even copyrightable?', category: 'copyrightability' })
    const interpretations = buildBoundedInterpretations([g], [])
    expect(interpretations[0].status).toBe('outside_current_coverage')
    expect(interpretations[0].summary).toMatch(/copyrighted/i)
    expect(interpretations[0].summary).not.toEqual(
      buildBoundedInterpretations([{ ...g, category: 'copyright_ownership' }], [])[0].summary,
    )
  })

  // 2026-08-16, PM boundary review: an earlier version of rules.ts's
  // outside_current_coverage copy for copyright_ownership/copyrightability
  // asserted substantive legal doctrine ("Copyright ownership of
  // AI-generated video is an unsettled, fact-specific legal question")
  // that was never derived from any governed Matrix/LK claim -- this
  // module has zero governed coverage for either category, so it has no
  // basis to characterize the STATE of the law, only that CRC itself
  // lacks an answer. These tests pin the corrected, neutral pattern-A
  // language and guard against the doctrine creeping back in, for every
  // category this function can produce outside_current_coverage for --
  // not just the two categories where it was actually found.
  test('outside_current_coverage never asserts a substantive legal characterization (e.g. "unsettled," "fact-specific," "settled," "public domain," "protected by copyright") for ANY category -- neutral no-coverage language only', () => {
    const doctrineSmell = /\bunsettled\b|\bfact-specific\b|\bsettled\b|public domain|protected by copyright|automatically (owned|copyrighted)|is not copyrightable|is copyrightable/i
    for (const category of ['commercial_use', 'copyright_ownership', 'copyrightability', 'likeness', 'unknown'] as const) {
      const g = goal({ goal_id: 'g-1', raw_text: 'placeholder question', category })
      const [interp] = buildBoundedInterpretations([g], [])
      expect(interp.summary).not.toMatch(doctrineSmell)
    }
  })

  test('outside_current_coverage for copyright_ownership and copyrightability follows the exact neutral pattern "CRC\'s current governed knowledge doesn\'t establish an answer to <topic>" -- no additional substantive clause attached', () => {
    const ownershipGoal = goal({ goal_id: 'g-1', raw_text: 'Do I own this?', category: 'copyright_ownership' })
    const copyrightabilityGoal = goal({ goal_id: 'g-2', raw_text: 'Is this copyrightable?', category: 'copyrightability' })
    const [ownershipInterp] = buildBoundedInterpretations([ownershipGoal], [])
    const [copyrightabilityInterp] = buildBoundedInterpretations([copyrightabilityGoal], [])
    expect(ownershipInterp.summary).toMatch(/^CRC's current governed knowledge doesn't establish an answer to who owns the copyright\. /)
    expect(copyrightabilityInterp.summary).toMatch(/^CRC's current governed knowledge doesn't establish an answer to whether this kind of output can be copyrighted at all\. /)
  })

  test('commercial_use with no matched tool -> outside_current_coverage, not a fabricated answer', () => {
    const g = goal({ goal_id: 'g-1', raw_text: 'Can I use this commercially?', category: 'commercial_use' })
    const interpretations = buildBoundedInterpretations([g], [])
    expect(interpretations[0].status).toBe('outside_current_coverage')
  })

  test("likeness resolves to outside_current_coverage under the current Matrix -- the one eligible-looking claim (elevenlabs-voice-consent) is CRC-Eligible: No and never reaches RetrievalResult[] at all, so this module never sees it (documented scoping decision, not a bug)", () => {
    const out = retrieve(handoff({ tools: [tool('elevenlabs')] }), MATRIX_FIXTURE)
    // Sanity: elevenlabs' only Retrieval-visible result is the eligible commercial-tiering claim, not the withheld voice-consent one.
    expect(out.results.map((r) => r.claim_id)).toEqual(['elevenlabs-commercial-tiering'])
    const g = goal({ goal_id: 'g-1', raw_text: 'Is voice cloning of a real person okay here?', category: 'likeness' })
    const interpretations = buildBoundedInterpretations([g], out.results)
    expect(interpretations[0].status).toBe('outside_current_coverage')
  })

  test("third_party_source_rights (Living Knowledge — Third-Party Source Rights, M1+M2, 2026-08-18) resolves to outside_current_coverage -- the category exists so CRC can recognize the question, but no TOPIC_CLAIMS_FIXTURE entry is reachable for it yet (M3/M4 not authorized), and the fixed copy never asserts a substantive answer", () => {
    const g = goal({ goal_id: 'g-1', raw_text: 'Can I use this Getty image in an ad?', category: 'third_party_source_rights' })
    const interpretations = buildBoundedInterpretations([g], [])
    expect(interpretations[0].status).toBe('outside_current_coverage')
    expect(interpretations[0].summary.toLowerCase()).not.toMatch(/safe|compliant|approved|cleared|low risk|high risk/)
  })
})

describe('buildBoundedInterpretations -- source-aware boundary clause (LK Phase 1 governance refinement, 2026-08-16)', () => {
  // Test-only Adopted + CRC-eligible TopicClaim -- deliberately NOT the real
  // TOPIC_CLAIMS_FIXTURE (Wave 1 is Candidate/Pending and must never surface
  // here or anywhere else; see wave1-candidate-claims-excluded.test.ts).
  // Mirrors lookup-topic-claims.test.ts's own claim() helper shape.
  function testTopicClaim(overrides: Partial<TopicClaim> & Pick<TopicClaim, 'claim_id' | 'topic'>): TopicClaim {
    return {
      claim_character: 'established',
      jurisdiction: 'Global',
      lifecycle: 'Adopted',
      crc_eligible: 'Yes',
      crc_publication_scope: 'Test scope text.',
      crc_candidate_statement: 'Test governed statement.',
      applicability_requirements: [],
      unresolved_project_dependencies: [],
      provider_scope: null,
      last_verified: '2026-08-16',
      superseded_by: null,
      ...overrides,
    }
  }

  const testFacts: ApplicabilityFacts = { jurisdiction: { state: 'unknown' }, toolMentions: [] }

  test('tool-sourced-only match gets the EXACT original platform-terms boundary, byte-for-byte unchanged (hard requirement: tool behavior unchanged)', () => {
    const out = retrieve(handoff({ tools: [tool('runway-gen3')] }), MATRIX_FIXTURE)
    const g = goal({ goal_id: 'g-1', raw_text: 'Can I use this commercially?', category: 'commercial_use' })
    const [interp] = buildBoundedInterpretations([g], out.results)
    expect(interp.summary).toContain("though it reflects the platform's own terms, not a full determination of your specific project's commercial readiness.")
  })

  test('topic-sourced-only match gets the neutral boundary, never the "platform\'s own terms" claim', () => {
    const topicClaims = [testTopicClaim({ claim_id: 'TEST-001', topic: 'copyrightability', crc_candidate_statement: 'Test copyrightability statement.' })]
    const g = goal({ goal_id: 'g-1', raw_text: 'Is this copyrightable?', category: 'copyrightability' })
    const out = retrieve(handoff(), MATRIX_FIXTURE, [g], topicClaims, testFacts)
    expect(out.results).toHaveLength(1)
    expect(out.results[0].source_fact.kind).toBe('topic')
    const [interp] = buildBoundedInterpretations([g], out.results)
    expect(interp.status).toBe('directly_relevant')
    expect(interp.summary).toContain("though it doesn't by itself determine the answer for your specific project.")
    expect(interp.summary).not.toMatch(/platform's own terms/i)
  })

  test('mixed tool + topic match on the same category gets the neutral boundary (not the platform-terms one) -- every word stays true for both sources', () => {
    // A genuine same-category mix: tag a test-only topic claim onto
    // commercial_use, the one category the real Matrix already has live
    // tool-sourced coverage for (Runway), so both a tool-sourced and a
    // topic-sourced result land in the same matches[] array.
    const topicClaims = [testTopicClaim({ claim_id: 'TEST-002', topic: 'commercial_use', crc_candidate_statement: 'Test commercial_use topic statement.' })]
    const g = goal({ goal_id: 'g-1', raw_text: 'Can I use this commercially?', category: 'commercial_use' })
    const out = retrieve(handoff({ tools: [tool('runway-gen3')] }), MATRIX_FIXTURE, [g], topicClaims, testFacts)
    const sourceKinds = out.results.map((r) => r.source_fact.kind).sort()
    expect(sourceKinds).toEqual(['tool', 'topic'])
    const [interp] = buildBoundedInterpretations([g], out.results)
    expect(interp.summary).toContain('Test commercial_use topic statement.')
    expect(interp.summary).toContain("Runway's current Terms allow commercial use across all subscription tiers, provided you comply with the Terms of Service.")
    expect(interp.summary).toContain("though it doesn't by itself determine the answer for your specific project.")
    expect(interp.summary).not.toMatch(/platform's own terms/i)
  })

  test('no substantive legal doctrine lives in either boundary clause -- both are pure boundary/scoping language', () => {
    const doctrineSmell = /\bunsettled\b|\bfact-specific\b|\bsettled\b|public domain|protected by copyright|automatically (owned|copyrighted)|is not copyrightable|is copyrightable|you own|you do not own/i
    expect(directlyRelevantSummary('copyright_ownership', 'Some governed statement.', true)).not.toMatch(doctrineSmell)
    expect(directlyRelevantSummary('copyright_ownership', 'Some governed statement.', false)).not.toMatch(doctrineSmell)
  })

  test('directlyRelevantSummary defaults allToolSourced to true when omitted -- pre-existing call sites (if any exist elsewhere) are unaffected', () => {
    expect(directlyRelevantSummary('commercial_use', 'X.')).toBe(directlyRelevantSummary('commercial_use', 'X.', true))
  })
})

describe('buildBoundedInterpretations -- Case 3A / Case 3B relevant_applicability_unresolved (Living Knowledge governance review, 2026-08-16, PM-approved "relevant applicability" refinement)', () => {
  function testTopicClaim(overrides: Partial<TopicClaim> & Pick<TopicClaim, 'claim_id' | 'topic'>): TopicClaim {
    return {
      claim_character: 'established',
      jurisdiction: 'Global',
      lifecycle: 'Adopted',
      crc_eligible: 'Yes',
      crc_publication_scope: 'Test scope text.',
      crc_candidate_statement: 'Test governed statement.',
      applicability_requirements: [],
      unresolved_project_dependencies: [],
      provider_scope: null,
      last_verified: '2026-08-16',
      superseded_by: null,
      ...overrides,
    }
  }

  const usFacts: ApplicabilityFacts = { jurisdiction: { state: 'confirmed', value: 'United States' }, toolMentions: [] }
  const unknownFacts: ApplicabilityFacts = { jurisdiction: { state: 'unknown' }, toolMentions: [] }

  test('Case 3A -- eligible claim exists, jurisdiction unknown -> relevant_applicability_unresolved, substantive claim text NOT exposed', () => {
    const topicClaims = [
      testTopicClaim({
        claim_id: 'TEST-3A',
        topic: 'copyrightability',
        crc_candidate_statement: 'US-only substantive claim text that must never leak.',
        applicability_requirements: [{ fact: 'jurisdiction', operator: 'equals', value: 'United States' }],
      }),
    ]
    const g = goal({ goal_id: 'g-1', raw_text: 'Is this copyrightable?', category: 'copyrightability' })
    const out = retrieve(handoff(), MATRIX_FIXTURE, [g], topicClaims, unknownFacts)
    expect(out.results).toEqual([]) // Retrieval withholds the claim entirely -- by design
    expect(out.diagnostics).toContainEqual({ identifier: 'copyrightability', reason: 'applicability_unmet' })

    const [interp] = buildBoundedInterpretations([g], out.results, out.diagnostics)
    expect(interp.status).toBe('relevant_applicability_unresolved')
    expect(interp.summary).not.toContain('US-only substantive claim text that must never leak.')
    expect(interp.supporting_claim_ids).toEqual([])
  })

  test('Case 3B -- claim passed its formal applicability gate, but its own governance metadata says application still depends on unmodeled project facts -> relevant_applicability_unresolved, content MAY be exposed, unresolved closing present', () => {
    const topicClaims = [
      testTopicClaim({
        claim_id: 'TEST-3B',
        topic: 'copyrightability',
        crc_candidate_statement: 'Formally-applicable substantive claim text.',
        applicability_requirements: [{ fact: 'jurisdiction', operator: 'equals', value: 'United States' }],
        unresolved_project_dependencies: ['human_contribution_description'],
      }),
    ]
    const g = goal({ goal_id: 'g-1', raw_text: 'Is this copyrightable?', category: 'copyrightability' })
    const out = retrieve(handoff(), MATRIX_FIXTURE, [g], topicClaims, usFacts)
    expect(out.results).toHaveLength(1) // formal gate passed -- the claim DOES reach matches[]

    const [interp] = buildBoundedInterpretations([g], out.results, out.diagnostics)
    expect(interp.status).toBe('relevant_applicability_unresolved')
    expect(interp.summary).toContain('Formally-applicable substantive claim text.')
    expect(interp.summary).toContain("there isn't enough project-specific information to determine")
    expect(interp.supporting_claim_ids).toEqual(['TEST-3B'])
  })

  test('a claim with empty unresolved_project_dependencies (ordinary Case 2) still resolves to directly_relevant, unaffected by the new logic', () => {
    const topicClaims = [testTopicClaim({ claim_id: 'TEST-2', topic: 'copyrightability', crc_candidate_statement: 'Fully resolvable claim.', unresolved_project_dependencies: [] })]
    const g = goal({ goal_id: 'g-1', raw_text: 'Is this copyrightable?', category: 'copyrightability' })
    const out = retrieve(handoff(), MATRIX_FIXTURE, [g], topicClaims, unknownFacts)
    const [interp] = buildBoundedInterpretations([g], out.results, out.diagnostics)
    expect(interp.status).toBe('directly_relevant')
  })

  test('Case 3B with multiple complementary claims -- both are quoted together, no conclusion is invented, no claim is picked as "the answer" (worked COPY-002 + COPY-003 shape)', () => {
    const topicClaims = [
      testTopicClaim({
        claim_id: 'TEST-002-LIKE',
        topic: 'copyrightability',
        crc_candidate_statement: 'Prompting alone generally does not establish sufficient human authorship.',
        applicability_requirements: [{ fact: 'jurisdiction', operator: 'equals', value: 'United States' }],
        unresolved_project_dependencies: ['human_contribution_description'],
      }),
      testTopicClaim({
        claim_id: 'TEST-003-LIKE',
        topic: 'copyrightability',
        crc_candidate_statement: 'Qualifying selection, arrangement, or editing may support copyright protection.',
        applicability_requirements: [{ fact: 'jurisdiction', operator: 'equals', value: 'United States' }],
        unresolved_project_dependencies: ['human_contribution_description'],
      }),
    ]
    const g = goal({ goal_id: 'g-1', raw_text: 'Is this copyrightable?', category: 'copyrightability' })
    const out = retrieve(handoff(), MATRIX_FIXTURE, [g], topicClaims, usFacts)
    expect(out.results).toHaveLength(2)

    const [interp] = buildBoundedInterpretations([g], out.results, out.diagnostics)
    expect(interp.status).toBe('relevant_applicability_unresolved')
    expect(interp.summary).toContain('Prompting alone generally does not establish sufficient human authorship.')
    expect(interp.summary).toContain('Qualifying selection, arrangement, or editing may support copyright protection.')
    expect(interp.supporting_claim_ids.sort()).toEqual(['TEST-002-LIKE', 'TEST-003-LIKE'])
    // No invented project-specific conclusion -- neither claim is singled out as "the answer," and no determination language appears.
    expect(interp.summary).not.toMatch(/therefore|this means your|your video is|your work is|is copyrighted\.|is not copyrighted\./i)
  })

  test('governance boundary: a Candidate-lifecycle claim with non-empty unresolved_project_dependencies still NEVER reaches M2 by any path -- excluded before the new logic even runs', () => {
    const topicClaims = [
      testTopicClaim({
        claim_id: 'TEST-CANDIDATE',
        topic: 'copyrightability',
        lifecycle: 'Candidate',
        crc_eligible: 'Pending',
        applicability_requirements: [],
        unresolved_project_dependencies: ['human_contribution_description'],
      }),
    ]
    const g = goal({ goal_id: 'g-1', raw_text: 'Is this copyrightable?', category: 'copyrightability' })
    const out = retrieve(handoff(), MATRIX_FIXTURE, [g], topicClaims, usFacts)
    expect(out.results).toEqual([])
    expect(out.diagnostics).toContainEqual({ identifier: 'copyrightability', reason: 'not_adopted_or_eligible' })

    const [interp] = buildBoundedInterpretations([g], out.results, out.diagnostics)
    // NOT relevant_applicability_unresolved -- that status is reserved for a
    // real applicability_unmet diagnostic, never for a governance exclusion.
    expect(interp.status).toBe('outside_current_coverage')
  })

  test('governance boundary: an Adopted-but-reviewer-only claim (CRC-Eligible: Pending) with non-empty unresolved_project_dependencies still NEVER reaches M2', () => {
    const topicClaims = [
      testTopicClaim({
        claim_id: 'TEST-REVIEWER-ONLY',
        topic: 'copyrightability',
        lifecycle: 'Adopted',
        crc_eligible: 'Pending',
        applicability_requirements: [],
        unresolved_project_dependencies: ['human_contribution_description'],
      }),
    ]
    const g = goal({ goal_id: 'g-1', raw_text: 'Is this copyrightable?', category: 'copyrightability' })
    const out = retrieve(handoff(), MATRIX_FIXTURE, [g], topicClaims, usFacts)
    expect(out.results).toEqual([])
    const [interp] = buildBoundedInterpretations([g], out.results, out.diagnostics)
    expect(interp.status).toBe('outside_current_coverage')
  })

  test('governance boundary: a non-CRC-eligible claim (CRC-Eligible: No) with non-empty unresolved_project_dependencies still NEVER reaches M2', () => {
    const topicClaims = [
      testTopicClaim({
        claim_id: 'TEST-NOT-ELIGIBLE',
        topic: 'copyrightability',
        lifecycle: 'Adopted',
        crc_eligible: 'No',
        applicability_requirements: [],
        unresolved_project_dependencies: ['human_contribution_description'],
      }),
    ]
    const g = goal({ goal_id: 'g-1', raw_text: 'Is this copyrightable?', category: 'copyrightability' })
    const out = retrieve(handoff(), MATRIX_FIXTURE, [g], topicClaims, usFacts)
    expect(out.results).toEqual([])
    const [interp] = buildBoundedInterpretations([g], out.results, out.diagnostics)
    expect(interp.status).toBe('outside_current_coverage')
  })

  test('determination_request is checked before Case 3A/3B and is completely unaffected -- no conflict found', () => {
    const topicClaims = [
      testTopicClaim({
        claim_id: 'TEST-DETERMINATION',
        topic: 'copyrightability',
        applicability_requirements: [{ fact: 'jurisdiction', operator: 'equals', value: 'United States' }],
        unresolved_project_dependencies: ['human_contribution_description'],
      }),
    ]
    const g = goal({ goal_id: 'g-1', raw_text: 'Can you certify this is copyrighted?', category: 'copyrightability', scope: 'determination_request' })
    const out = retrieve(handoff(), MATRIX_FIXTURE, [g], topicClaims, usFacts)
    const [interp] = buildBoundedInterpretations([g], out.results, out.diagnostics)
    expect(interp.status).toBe('determination_declined')
  })

  test('omitting the new diagnostics parameter defaults to [] -- pre-existing call sites are unaffected (Case 3A never fires without it, Case 3B still works since it only depends on results)', () => {
    const topicClaims = [
      testTopicClaim({
        claim_id: 'TEST-NO-DIAGNOSTICS',
        topic: 'copyrightability',
        applicability_requirements: [{ fact: 'jurisdiction', operator: 'equals', value: 'United States' }],
      }),
    ]
    const g = goal({ goal_id: 'g-1', raw_text: 'Is this copyrightable?', category: 'copyrightability' })
    const out = retrieve(handoff(), MATRIX_FIXTURE, [g], topicClaims, unknownFacts)
    const [interp] = buildBoundedInterpretations([g], out.results) // no 3rd argument
    expect(interp.status).toBe('outside_current_coverage') // not relevant_applicability_unresolved, since diagnostics defaulted to []
  })

  describe('humanContributionRelevanceSentence -- deterministic rendering', () => {
    test('a description with no trailing punctuation gets exactly one period added', () => {
      expect(humanContributionRelevanceSentence('I only wrote prompts')).toContain('"I only wrote prompts."')
    })

    test('a description already ending in a period is never double-punctuated', () => {
      const sentence = humanContributionRelevanceSentence('I only wrote prompts.')
      expect(sentence).toContain('"I only wrote prompts."')
      expect(sentence).not.toContain('prompts..')
    })

    test('a description ending in ! or ? is preserved as-is, not overwritten with a period', () => {
      expect(humanContributionRelevanceSentence('I just typed prompts!')).toContain('"I just typed prompts!"')
      expect(humanContributionRelevanceSentence('Does prompting even count?')).toContain('"Does prompting even count?"')
    })

    test('leading/trailing whitespace is trimmed', () => {
      expect(humanContributionRelevanceSentence('  I only wrote prompts.  ')).toContain('"I only wrote prompts."')
    })
  })

  // ── H5 -- minimal echo-only relevance composition (Copyright UAT Correction
  // Milestone, 2026-08-19, PM-approved narrow scope) ──────────────────────
  describe('H5 -- minimal echo-only relevance composition', () => {
    const copyrightOwnershipGoal = goal({ goal_id: 'g-1', raw_text: 'Do I own the copyright to it?', category: 'copyright_ownership' })
    const contributionClaim = () =>
      testTopicClaim({
        claim_id: 'TEST-3B-H5',
        topic: 'copyright_ownership',
        crc_candidate_statement: 'Formally-applicable substantive claim text.',
        applicability_requirements: [],
        unresolved_project_dependencies: ['human_contribution_description'],
      })

    function scenarioOutput(description: string) {
      const out = retrieve(handoff(), MATRIX_FIXTURE, [copyrightOwnershipGoal], [contributionClaim()], usFacts)
      return buildBoundedInterpretations([copyrightOwnershipGoal], out.results, out.diagnostics, { state: 'confirmed', value: description })[0]
    }

    const PROHIBITED_CONCLUSIONS = /\byou own\b|\bis copyrighted\b|\bis not copyrighted\b|\bsatisfies\b|\bsufficient\b(?! creative)|\bthis (establishes|proves)\b|\bnot eligible for copyright\b(?!.{0,40}generally)/i

    test('Scenario A ("I only wrote prompts.") -- description echoed, existing hedge remains, no prohibited conclusion', () => {
      const interp = scenarioOutput('I only wrote prompts.')
      expect(interp.status).toBe('relevant_applicability_unresolved')
      expect(interp.summary).toContain('You described your own contribution as: "I only wrote prompts."')
      expect(interp.summary).toContain("there isn't enough project-specific information to determine")
      expect(interp.summary).not.toMatch(PROHIBITED_CONCLUSIONS)
    })

    test('Scenario B ("I wrote prompts and trimmed the output.") -- echoed, no ranking language ("trimming is/is not enough")', () => {
      const interp = scenarioOutput('I wrote prompts and trimmed the output.')
      expect(interp.summary).toContain('You described your own contribution as: "I wrote prompts and trimmed the output."')
      expect(interp.summary).not.toMatch(/trimming is (enough|not enough)/i)
      expect(interp.summary).not.toMatch(PROHIBITED_CONCLUSIONS)
    })

    test('Scenario C (selection/arrangement/compositing) -- echoed, relevance grounded in COPY-002/003 language, no sufficiency conclusion', () => {
      const description = 'I selected the best generations, reordered the sequence, changed timing, and composited several elements.'
      const interp = scenarioOutput(description)
      expect(interp.summary).toContain(`You described your own contribution as: "${description}"`)
      expect(interp.summary).toMatch(/selecting, arranging, or editing/i)
      expect(interp.summary).not.toMatch(/this satisfies the copyright threshold|your video is copyrighted|you own it/i)
      expect(interp.summary).not.toMatch(PROHIBITED_CONCLUSIONS)
    })

    test('Scenario D (manual structure, AI for shots) -- echoed, still no legal sufficiency or ownership conclusion', () => {
      const description = 'I used AI for individual clips but manually created the overall sequence and story structure.'
      const interp = scenarioOutput(description)
      expect(interp.summary).toContain(`You described your own contribution as: "${description}"`)
      expect(interp.summary).not.toMatch(PROHIBITED_CONCLUSIONS)
    })

    test('condition A: does NOT fire for an unrelated goal category, even with a confirmed description and a carrying claim', () => {
      const commercialUseGoal = goal({ goal_id: 'g-2', raw_text: 'Can I use this commercially?', category: 'commercial_use' })
      const claim = testTopicClaim({
        claim_id: 'TEST-COMMERCIAL',
        topic: 'commercial_use',
        applicability_requirements: [],
        unresolved_project_dependencies: ['human_contribution_description'],
      })
      const out = retrieve(handoff(), MATRIX_FIXTURE, [commercialUseGoal], [claim], usFacts)
      const [interp] = buildBoundedInterpretations([commercialUseGoal], out.results, out.diagnostics, { state: 'confirmed', value: 'I only wrote prompts.' })
      expect(interp.summary).not.toContain('You described your own contribution as')
    })

    test('condition B: does NOT fire when the matched claim does not carry the human_contribution_description dependency', () => {
      const claimWithoutDependency = testTopicClaim({
        claim_id: 'TEST-NO-DEP',
        topic: 'copyright_ownership',
        applicability_requirements: [],
        unresolved_project_dependencies: [],
      })
      const out = retrieve(handoff(), MATRIX_FIXTURE, [copyrightOwnershipGoal], [claimWithoutDependency], usFacts)
      const [interp] = buildBoundedInterpretations([copyrightOwnershipGoal], out.results, out.diagnostics, { state: 'confirmed', value: 'I only wrote prompts.' })
      expect(interp.status).toBe('directly_relevant') // no dependency -> Case 3B never fires at all, H5 moot
      expect(interp.summary).not.toContain('You described your own contribution as')
    })

    test('condition C: does NOT fire when human_contribution_description is not confirmed (unknown, declined, unresolved_no_visibility)', () => {
      for (const state of [{ state: 'unknown' as const }, { state: 'declined' as const }, { state: 'unresolved_no_visibility' as const }]) {
        const out = retrieve(handoff(), MATRIX_FIXTURE, [copyrightOwnershipGoal], [contributionClaim()], usFacts)
        const [interp] = buildBoundedInterpretations([copyrightOwnershipGoal], out.results, out.diagnostics, state)
        expect(interp.summary).not.toContain('You described your own contribution as')
      }
    })

    test('omitting the 4th parameter entirely defaults to unconfirmed -- pre-existing call sites (jurisdiction milestone, Slice 1, etc.) render byte-identically to before H5 existed', () => {
      const out = retrieve(handoff(), MATRIX_FIXTURE, [copyrightOwnershipGoal], [contributionClaim()], usFacts)
      const withoutParam = buildBoundedInterpretations([copyrightOwnershipGoal], out.results, out.diagnostics)[0]
      const withExplicitUnknown = buildBoundedInterpretations([copyrightOwnershipGoal], out.results, out.diagnostics, { state: 'unknown' })[0]
      expect(withoutParam).toEqual(withExplicitUnknown)
      expect(withoutParam.summary).not.toContain('You described your own contribution as')
    })

    test('the dependency itself is never removed/marked resolved by H5 -- the underlying claim data (matched, not this module\'s output) still carries the dependency regardless of what H5 renders', () => {
      const out = retrieve(handoff(), MATRIX_FIXTURE, [copyrightOwnershipGoal], [contributionClaim()], usFacts)
      expect(out.results[0].unresolved_project_dependencies).toEqual(['human_contribution_description'])
      buildBoundedInterpretations([copyrightOwnershipGoal], out.results, out.diagnostics, { state: 'confirmed', value: 'I only wrote prompts.' })
      // Re-running retrieve() independently after composition proves nothing was mutated -- the dependency is claim-level governance metadata, never touched by this module.
      const outAgain = retrieve(handoff(), MATRIX_FIXTURE, [copyrightOwnershipGoal], [contributionClaim()], usFacts)
      expect(outAgain.results[0].unresolved_project_dependencies).toEqual(['human_contribution_description'])
    })

    test('raw user text is never dumped unbounded -- always wrapped by the fixed "You described your own contribution as:" prefix, never interpolated as if CRC were asserting it', () => {
      const interp = scenarioOutput("it's complicated, I did some stuff")
      // No trailing punctuation in the input -- a period is added exactly once, never doubled.
      expect(interp.summary).toContain('You described your own contribution as: "it\'s complicated, I did some stuff."')
      // The description never appears OUTSIDE the bounded quoted prefix.
      const withoutPrefix = interp.summary.replace('You described your own contribution as: "it\'s complicated, I did some stuff."', '')
      expect(withoutPrefix).not.toContain('it\'s complicated, I did some stuff')
    })
  })
})

// ── CC-1 -- Claim-Level Bounded Grouping (2026-08-21, PM/Architecture-
// authorized) ────────────────────────────────────────────────────────────
describe('buildBoundedInterpretations -- CC-1 Claim-Level Bounded Grouping', () => {
  function testTopicClaim(overrides: Partial<TopicClaim> & Pick<TopicClaim, 'claim_id' | 'topic'>): TopicClaim {
    return {
      claim_character: 'established',
      jurisdiction: 'Global',
      lifecycle: 'Adopted',
      crc_eligible: 'Yes',
      crc_publication_scope: 'Test scope text.',
      crc_candidate_statement: 'Test governed statement.',
      applicability_requirements: [],
      unresolved_project_dependencies: [],
      provider_scope: null,
      last_verified: '2026-08-16',
      superseded_by: null,
      ...overrides,
    }
  }

  const noConclusionLanguage =
    /\bresolved\b|\bunresolved_issue_resolved\b|\bappears resolved\b|\bsatisfied\b|\bverified\b|\bchecked\b|\bcleared\b|\bsafe\b|\bapproved\b|commercially usable|not a blocker|not the issue|no longer an issue/i

  const facts: ApplicabilityFacts = { jurisdiction: { state: 'unknown' }, toolMentions: [] }

  test('1. single claim, empty dependency array -- unaffected by CC-1, no generated conclusion language', () => {
    const claims = [testTopicClaim({ claim_id: 'NO-DEP', topic: 'copyrightability', crc_candidate_statement: 'A dependency-free governed statement.' })]
    const g = goal({ goal_id: 'g-1', raw_text: 'Is this copyrightable?', category: 'copyrightability' })
    const out = retrieve(handoff(), MATRIX_FIXTURE, [g], claims, facts)
    const [interp] = buildBoundedInterpretations([g], out.results, out.diagnostics)
    expect(interp.status).toBe('directly_relevant')
    expect(interp.summary).not.toMatch(noConclusionLanguage)
  })

  test('2. single dependency-bearing claim -- existing unresolved-applicability behavior and hedge unchanged', () => {
    const claims = [testTopicClaim({ claim_id: 'DEP-ONLY', topic: 'copyrightability', crc_candidate_statement: 'A dependency-bearing governed statement.', unresolved_project_dependencies: ['human_contribution_description'] })]
    const g = goal({ goal_id: 'g-1', raw_text: 'Is this copyrightable?', category: 'copyrightability' })
    const out = retrieve(handoff(), MATRIX_FIXTURE, [g], claims, facts)
    const [interp] = buildBoundedInterpretations([g], out.results, out.diagnostics)
    expect(interp.status).toBe('relevant_applicability_unresolved')
    expect(interp.summary).toBe(
      "A dependency-bearing governed statement. This is relevant to whether this kind of output can be copyrighted at all, but based on what's been described here, there isn't enough project-specific information to determine how it applies to your specific project. A human-reviewed Commercial Assurance Assessment can address this directly.",
    )
  })

  test('3. mixed claims under one explicit goal -- no longer one undifferentiated block: the dependency-free claim gets its own boundary clause, ordered before the dependency-bearing claim, single hedge preserved', () => {
    const claims = [
      testTopicClaim({ claim_id: 'NO-DEP', topic: 'third_party_source_rights', crc_candidate_statement: 'Dependency-free statement.' }),
      testTopicClaim({ claim_id: 'DEP', topic: 'third_party_source_rights', crc_candidate_statement: 'Dependency-bearing statement.', unresolved_project_dependencies: ['editorial_designation_confirmed'] }),
    ]
    const g = goal({ goal_id: 'g-1', raw_text: 'Can I use these third-party images commercially?', category: 'third_party_source_rights' })
    const out = retrieve(handoff(), MATRIX_FIXTURE, [g], claims, facts)
    const [interp] = buildBoundedInterpretations([g], out.results, out.diagnostics)
    expect(interp.status).toBe('relevant_applicability_unresolved')
    // Both governed statements survive verbatim.
    expect(interp.summary).toContain('Dependency-free statement.')
    expect(interp.summary).toContain('Dependency-bearing statement.')
    // Ordered as two distinguishable clauses, not interleaved -- the
    // dependency-free clause (with its own boundary sentence) precedes the
    // dependency-bearing clause (with the unresolved-applicability hedge).
    expect(interp.summary.indexOf('Dependency-free statement.')).toBeLessThan(interp.summary.indexOf('Dependency-bearing statement.'))
    expect(interp.summary).toContain("though it doesn't by itself determine the answer for your specific project.")
    expect(interp.summary).toContain("there isn't enough project-specific information to determine how it applies")
    // Exactly one bridge sentence -- not duplicated.
    expect(interp.summary.match(/A human-reviewed Commercial Assurance Assessment can address this directly\./g)).toHaveLength(1)
    expect(interp.supporting_claim_ids.sort()).toEqual(['DEP', 'NO-DEP'])
    expect(interp.summary).not.toMatch(noConclusionLanguage)
  })

  test('4. multiple dependency-bearing claims, no dependency-free claim present -- all survive, none singled out, byte-identical to pre-CC-1 template shape', () => {
    const claims = [
      testTopicClaim({ claim_id: 'DEP-A', topic: 'third_party_source_rights', crc_candidate_statement: 'First dependency-bearing statement.', unresolved_project_dependencies: ['editorial_designation_confirmed'] }),
      testTopicClaim({ claim_id: 'DEP-B', topic: 'third_party_source_rights', crc_candidate_statement: 'Second dependency-bearing statement.', unresolved_project_dependencies: ['release_status_confirmed'] }),
    ]
    const g = goal({ goal_id: 'g-1', raw_text: 'Can I use these third-party images commercially?', category: 'third_party_source_rights' })
    const out = retrieve(handoff(), MATRIX_FIXTURE, [g], claims, facts)
    const [interp] = buildBoundedInterpretations([g], out.results, out.diagnostics)
    expect(interp.summary).toContain('First dependency-bearing statement.')
    expect(interp.summary).toContain('Second dependency-bearing statement.')
    expect(interp.summary.match(/A human-reviewed Commercial Assurance Assessment can address this directly\./g)).toHaveLength(1)
    expect(interp.supporting_claim_ids.sort()).toEqual(['DEP-A', 'DEP-B'])
  })

  test('6. explicit third_party_source_rights goal -- grouping is generic, not dependent on discovered-topic origin (identical mechanics to a discovered case)', () => {
    const claims = [
      testTopicClaim({ claim_id: 'EXPLICIT-NO-DEP', topic: 'third_party_source_rights', crc_candidate_statement: 'Explicit-goal dependency-free statement.' }),
      testTopicClaim({ claim_id: 'EXPLICIT-DEP', topic: 'third_party_source_rights', crc_candidate_statement: 'Explicit-goal dependency-bearing statement.', unresolved_project_dependencies: ['which_provider'] }),
    ]
    const g = goal({ goal_id: 'g-1', raw_text: 'Can I use these third-party images commercially?', category: 'third_party_source_rights' })
    const out = retrieve(handoff(), MATRIX_FIXTURE, [g], claims, facts)
    expect(out.results.every((r) => r.match_origin === 'exact_topic')).toBe(true) // explicit path, not discovered
    const [interp] = buildBoundedInterpretations([g], out.results, out.diagnostics)
    expect(interp.summary.indexOf('Explicit-goal dependency-free statement.')).toBeLessThan(interp.summary.indexOf('Explicit-goal dependency-bearing statement.'))
    expect(interp.summary).toContain("though it doesn't by itself determine the answer for your specific project.")
  })

  test('9. dependency identity opacity -- no raw dependency identifier string is ever introduced into the rendered summary', () => {
    const claims = [
      testTopicClaim({ claim_id: 'NO-DEP', topic: 'third_party_source_rights', crc_candidate_statement: 'Dependency-free statement.' }),
      testTopicClaim({
        claim_id: 'DEP',
        topic: 'third_party_source_rights',
        crc_candidate_statement: 'Dependency-bearing statement.',
        unresolved_project_dependencies: ['asset_confirmed_istock', 'editorial_designation_confirmed'],
      }),
    ]
    const g = goal({ goal_id: 'g-1', raw_text: 'Can I use these third-party images commercially?', category: 'third_party_source_rights' })
    const out = retrieve(handoff(), MATRIX_FIXTURE, [g], claims, facts)
    const [interp] = buildBoundedInterpretations([g], out.results, out.diagnostics)
    expect(interp.summary).not.toMatch(/asset_confirmed_istock|editorial_designation_confirmed|unresolved_project_dependencies/)
  })

  test('10. evidence-only-shaped dependencies remain unresolved -- never rendered as self-attestation or inferred resolution', () => {
    const claims = [testTopicClaim({ claim_id: 'DEP', topic: 'third_party_source_rights', crc_candidate_statement: 'Editorial-restriction statement.', unresolved_project_dependencies: ['editorial_designation_confirmed'] })]
    const g = goal({ goal_id: 'g-1', raw_text: 'Can I use these third-party images commercially?', category: 'third_party_source_rights' })
    const out = retrieve(handoff(), MATRIX_FIXTURE, [g], claims, facts)
    const [interp] = buildBoundedInterpretations([g], out.results, out.diagnostics)
    expect(interp.status).toBe('relevant_applicability_unresolved')
    expect(interp.summary).not.toMatch(noConclusionLanguage)
  })

  test('16. semantic asymmetry -- an empty unresolved_project_dependencies array generates no project-state conclusion beyond the governed claim statement + existing directly_relevant boundary clause', () => {
    const claims = [testTopicClaim({ claim_id: 'NO-DEP', topic: 'copyrightability', crc_candidate_statement: 'Dependency-free statement.' })]
    const g = goal({ goal_id: 'g-1', raw_text: 'Is this copyrightable?', category: 'copyrightability' })
    const out = retrieve(handoff(), MATRIX_FIXTURE, [g], claims, facts)
    const [interp] = buildBoundedInterpretations([g], out.results, out.diagnostics)
    // Exactly the pre-existing directly_relevant template -- nothing stronger.
    expect(interp.summary).toBe(directlyRelevantSummary('copyrightability', 'Dependency-free statement.', false, false))
    expect(interp.summary).not.toMatch(noConclusionLanguage)
  })

  test('17. claim preservation / traceability -- every grouped statement (both the dependency-free clause and the dependency-bearing clause) remains a verbatim substring of the summary, traceable to its own candidate_statement', () => {
    const noDep = testTopicClaim({ claim_id: 'NO-DEP', topic: 'third_party_source_rights', crc_candidate_statement: 'Traceable dependency-free statement.' })
    const dep = testTopicClaim({ claim_id: 'DEP', topic: 'third_party_source_rights', crc_candidate_statement: 'Traceable dependency-bearing statement.', unresolved_project_dependencies: ['editorial_designation_confirmed'] })
    const g = goal({ goal_id: 'g-1', raw_text: 'Can I use these third-party images commercially?', category: 'third_party_source_rights' })
    const out = retrieve(handoff(), MATRIX_FIXTURE, [g], [noDep, dep], facts)
    const [interp] = buildBoundedInterpretations([g], out.results, out.diagnostics)
    expect(interp.summary).toContain(noDep.crc_candidate_statement)
    expect(interp.summary).toContain(dep.crc_candidate_statement)
  })

  test('all-tool-sourced vs mixed-source boundary clause is computed independently per group -- a tool-sourced dependency-free match still gets the platform-terms clause even when grouped alongside a topic-sourced dependency-bearing match', () => {
    const stockClaim = testTopicClaim({ claim_id: 'STOCK-DEP', topic: 'commercial_use', crc_candidate_statement: 'Stock dependency-bearing statement.', unresolved_project_dependencies: ['editorial_designation_confirmed'] })
    const g = goal({ goal_id: 'g-1', raw_text: 'Can I use this commercially?', category: 'commercial_use' })
    const out = retrieve(handoff({ tools: [tool('kling')] }), MATRIX_FIXTURE, [g], [stockClaim], facts)
    const [interp] = buildBoundedInterpretations([g], out.results, out.diagnostics)
    expect(interp.summary).toContain("Kling's commercial-use permissions depend on your account type")
    // Kling (tool-sourced, dependency-free) keeps the EXACT existing tool boundary clause, byte-for-byte.
    expect(interp.summary).toContain("though it reflects the platform's own terms, not a full determination of your specific project's commercial readiness.")
    expect(interp.summary).toContain('Stock dependency-bearing statement.')
    expect(interp.summary).not.toMatch(noConclusionLanguage)
  })
})

// ── CC-2 -- Semantics-Preserving Rhetorical Composition (2026-08-21,
// PM/Architecture-authorized) ───────────────────────────────────────────
describe('buildBoundedInterpretations -- CC-2 Semantics-Preserving Rhetorical Composition', () => {
  function testTopicClaim(overrides: Partial<TopicClaim> & Pick<TopicClaim, 'claim_id' | 'topic'>): TopicClaim {
    return {
      claim_character: 'established',
      jurisdiction: 'Global',
      lifecycle: 'Adopted',
      crc_eligible: 'Yes',
      crc_publication_scope: 'Test scope text.',
      crc_candidate_statement: 'Test governed statement.',
      applicability_requirements: [],
      unresolved_project_dependencies: [],
      provider_scope: null,
      last_verified: '2026-08-16',
      superseded_by: null,
      ...overrides,
    }
  }

  const noConclusionLanguage =
    /\bresolved\b|\bappears resolved\b|\bsatisfied\b|\bverified\b|\bchecked\b|\bcleared\b|\bsafe\b|\bapproved\b|commercially usable|not a blocker|\bblocker\b|main concern|material issue|material unresolved issue|most important issue|only remaining issue|not the issue|no longer an issue|primary blocker|because of this|therefore/i

  const facts: ApplicabilityFacts = { jurisdiction: { state: 'unknown' }, toolMentions: [] }

  test('mixed-group repetition reduction: "This is relevant to" is asserted exactly once, not twice, in a mixed dependency-free + dependency-bearing answer', () => {
    const claims = [
      testTopicClaim({ claim_id: 'NO-DEP', topic: 'third_party_source_rights', crc_candidate_statement: 'Dependency-free statement.' }),
      testTopicClaim({ claim_id: 'DEP', topic: 'third_party_source_rights', crc_candidate_statement: 'Dependency-bearing statement.', unresolved_project_dependencies: ['editorial_designation_confirmed'] }),
    ]
    const g = goal({ goal_id: 'g-1', raw_text: 'Can I use these third-party images commercially?', category: 'third_party_source_rights' })
    const out = retrieve(handoff(), MATRIX_FIXTURE, [g], claims, facts)
    const [interp] = buildBoundedInterpretations([g], out.results, out.diagnostics)
    expect(interp.summary.match(/This is relevant to/g)).toHaveLength(1)
    // The single occurrence is still the dependency-free clause's own lead-in.
    expect(interp.summary).toContain('Dependency-free statement. This is relevant to')
    // The closing hedge substance is fully preserved, just without a repeated lead-in.
    expect(interp.summary).toContain('But based on what\'s been described here, there isn\'t enough project-specific information to determine how it applies to your specific project.')
  })

  test('single-group (all dependency-bearing) case renders byte-identical to pre-CC-2/pre-CC-1 -- no repetition existed here, nothing to remove', () => {
    const claims = [testTopicClaim({ claim_id: 'DEP-ONLY', topic: 'copyrightability', crc_candidate_statement: 'A dependency-bearing governed statement.', unresolved_project_dependencies: ['human_contribution_description'] })]
    const g = goal({ goal_id: 'g-1', raw_text: 'Is this copyrightable?', category: 'copyrightability' })
    const out = retrieve(handoff(), MATRIX_FIXTURE, [g], claims, facts)
    const [interp] = buildBoundedInterpretations([g], out.results, out.diagnostics)
    expect(interp.summary).toBe(
      "A dependency-bearing governed statement. This is relevant to whether this kind of output can be copyrighted at all, but based on what's been described here, there isn't enough project-specific information to determine how it applies to your specific project. A human-reviewed Commercial Assurance Assessment can address this directly.",
    )
    expect(interp.summary.match(/This is relevant to/g)).toHaveLength(1)
  })

  test('genericity: the same repetition reduction applies to the copyright/related-topic domain, not just third_party_source_rights -- no domain-specific branching', () => {
    const copyOwnershipDirect = testTopicClaim({ claim_id: 'COPY-004-LIKE', topic: 'copyright_ownership', crc_candidate_statement: 'Framing statement, no dependency.' })
    const copyrightabilityDep = testTopicClaim({
      claim_id: 'COPY-001-LIKE',
      topic: 'copyrightability',
      crc_candidate_statement: 'Copyrightability statement with a dependency.',
      applicability_requirements: [{ fact: 'jurisdiction', operator: 'equals', value: 'United States' }],
      unresolved_project_dependencies: ['human_contribution_description'],
    })
    const relationship = {
      relationship_id: 'REL-TEST-v1',
      source_topic: 'copyright_ownership' as const,
      target_topic: 'copyrightability' as const,
      relationship_type: 'relevant_consideration' as const,
      rationale: 'Test rationale.',
      lifecycle: 'Adopted' as const,
      adoption_approver: 'test',
      adoption_decision_date: '2026-08-16',
      publication_scope: 'CRC eligible' as const,
      crc_eligible: 'Yes' as const,
      crc_approver: 'test',
      crc_decision_date: '2026-08-16',
      last_reviewed: '2026-08-16',
      superseded_by: null,
    }
    const g = goal({ goal_id: 'g-1', raw_text: 'Do I own the copyright?', category: 'copyright_ownership' })
    const usFacts: ApplicabilityFacts = { jurisdiction: { state: 'confirmed', value: 'United States' }, toolMentions: [] }
    const out = retrieve(handoff(), MATRIX_FIXTURE, [g], [copyOwnershipDirect, copyrightabilityDep], usFacts, [relationship])
    const [interp] = buildBoundedInterpretations([g], out.results, out.diagnostics)
    expect(interp.summary.match(/This is relevant to/g)).toHaveLength(1)
    expect(interp.summary).toContain('Framing statement, no dependency.')
    expect(interp.summary).toContain('Copyrightability statement with a dependency.')
    expect(interp.summary).not.toMatch(noConclusionLanguage)
  })

  test('H5 co-occurring with the dependency-free clause: repetition still reduced to one lead-in, H5 sentence still appears exactly once, unaffected', () => {
    const noDep = testTopicClaim({ claim_id: 'NO-DEP-COPY', topic: 'copyright_ownership', crc_candidate_statement: 'Copyright framing statement.' })
    const h5Claim = testTopicClaim({
      claim_id: 'H5-CLAIM',
      topic: 'copyright_ownership',
      crc_candidate_statement: 'H5-eligible statement.',
      unresolved_project_dependencies: ['human_contribution_description'],
    })
    const g = goal({ goal_id: 'g-1', raw_text: 'Do I own the copyright?', category: 'copyright_ownership' })
    const out = retrieve(handoff(), MATRIX_FIXTURE, [g], [noDep, h5Claim], facts)
    const [interp] = buildBoundedInterpretations([g], out.results, out.diagnostics, { state: 'confirmed', value: 'I only wrote prompts.' })
    expect(interp.summary.match(/This is relevant to/g)).toHaveLength(1)
    expect(interp.summary.match(/You described your own contribution as:/g)).toHaveLength(1)
    expect(interp.summary).toContain('You described your own contribution as: "I only wrote prompts."')
  })

  test('multiple dependency-bearing claims (no dependency-free claim) -- single-group path unaffected, still one lead-in, all statements preserved', () => {
    const claims = [
      testTopicClaim({ claim_id: 'DEP-A', topic: 'third_party_source_rights', crc_candidate_statement: 'First dependency-bearing statement.', unresolved_project_dependencies: ['editorial_designation_confirmed'] }),
      testTopicClaim({ claim_id: 'DEP-B', topic: 'third_party_source_rights', crc_candidate_statement: 'Second dependency-bearing statement.', unresolved_project_dependencies: ['release_status_confirmed'] }),
    ]
    const g = goal({ goal_id: 'g-1', raw_text: 'Can I use these third-party images commercially?', category: 'third_party_source_rights' })
    const out = retrieve(handoff(), MATRIX_FIXTURE, [g], claims, facts)
    const [interp] = buildBoundedInterpretations([g], out.results, out.diagnostics)
    expect(interp.summary.match(/This is relevant to/g)).toHaveLength(1)
    expect(interp.summary).toContain('First dependency-bearing statement.')
    expect(interp.summary).toContain('Second dependency-bearing statement.')
  })

  test('no prohibited stronger semantic language appears anywhere in a mixed-group answer, including the reworded closing transition', () => {
    const claims = [
      testTopicClaim({ claim_id: 'NO-DEP', topic: 'commercial_use', crc_candidate_statement: 'Platform permits commercial use for paid members.' }),
      testTopicClaim({ claim_id: 'DEP', topic: 'commercial_use', crc_candidate_statement: 'Editorial restriction statement.', unresolved_project_dependencies: ['editorial_designation_confirmed'] }),
    ]
    const g = goal({ goal_id: 'g-1', raw_text: 'Can I use this commercially?', category: 'commercial_use' })
    const out = retrieve(handoff(), MATRIX_FIXTURE, [g], claims, facts)
    const [interp] = buildBoundedInterpretations([g], out.results, out.diagnostics)
    expect(interp.summary).not.toMatch(noConclusionLanguage)
  })

  test('Case 3A (content-free, no matches at all) is completely unaffected by the CC-2 template change', () => {
    const topicClaims = [
      testTopicClaim({
        claim_id: 'TEST-3A',
        topic: 'copyrightability',
        crc_candidate_statement: 'US-only substantive claim text that must never leak.',
        applicability_requirements: [{ fact: 'jurisdiction', operator: 'equals', value: 'United States' }],
      }),
    ]
    const g = goal({ goal_id: 'g-1', raw_text: 'Is this copyrightable?', category: 'copyrightability' })
    const unknownFacts: ApplicabilityFacts = { jurisdiction: { state: 'unknown' }, toolMentions: [] }
    const out = retrieve(handoff(), MATRIX_FIXTURE, [g], topicClaims, unknownFacts)
    const [interp] = buildBoundedInterpretations([g], out.results, out.diagnostics)
    expect(interp.status).toBe('relevant_applicability_unresolved')
    expect(interp.summary).toBe(
      "SI8 has governed knowledge relevant to whether this kind of output can be copyrighted at all, but it depends on project-specific information that hasn't been confirmed in this conversation. A human-reviewed Commercial Assurance Assessment can address this directly.",
    )
  })
})

// ── CRC Email/UI Structural Readability -- Phase 1 (2026-08-23,
// PM/Architecture-authorized) ───────────────────────────────────────────
describe('buildBoundedInterpretations -- Phase 1 summary_blocks structural equivalence', () => {
  function testTopicClaim(overrides: Partial<TopicClaim> & Pick<TopicClaim, 'claim_id' | 'topic'>): TopicClaim {
    return {
      claim_character: 'established',
      jurisdiction: 'Global',
      lifecycle: 'Adopted',
      crc_eligible: 'Yes',
      crc_publication_scope: 'Test scope text.',
      crc_candidate_statement: 'Test governed statement.',
      applicability_requirements: [],
      unresolved_project_dependencies: [],
      provider_scope: null,
      last_verified: '2026-08-16',
      superseded_by: null,
      ...overrides,
    }
  }

  const facts: ApplicabilityFacts = { jurisdiction: { state: 'unknown' }, toolMentions: [] }

  test('structural equivalence: summary_blocks.join(\' \') reconstructs summary byte-for-byte, for every status', () => {
    const cases: Array<{ label: string; goals: ReturnType<typeof goal>[]; claims: TopicClaim[] }> = [
      { label: 'directly_relevant', goals: [goal({ goal_id: 'g-1', raw_text: 'Can I use this commercially?', category: 'commercial_use' })], claims: [] },
      {
        label: 'relevant_applicability_unresolved (single-group)',
        goals: [goal({ goal_id: 'g-1', raw_text: 'Is this copyrightable?', category: 'copyrightability' })],
        claims: [testTopicClaim({ claim_id: 'DEP', topic: 'copyrightability', crc_candidate_statement: 'Dep statement.', unresolved_project_dependencies: ['human_contribution_description'] })],
      },
      {
        label: 'relevant_applicability_unresolved (mixed)',
        goals: [goal({ goal_id: 'g-1', raw_text: 'Can I use these third-party images commercially?', category: 'third_party_source_rights' })],
        claims: [
          testTopicClaim({ claim_id: 'NO-DEP', topic: 'third_party_source_rights', crc_candidate_statement: 'No-dep statement.' }),
          testTopicClaim({ claim_id: 'DEP', topic: 'third_party_source_rights', crc_candidate_statement: 'Dep statement.', unresolved_project_dependencies: ['editorial_designation_confirmed'] }),
        ],
      },
      { label: 'outside_current_coverage', goals: [goal({ goal_id: 'g-1', raw_text: 'Do I own the copyright?', category: 'copyright_ownership' })], claims: [] },
      {
        label: 'determination_declined',
        goals: [goal({ goal_id: 'g-1', raw_text: 'Certify this.', category: 'commercial_use', scope: 'determination_request' })],
        claims: [],
      },
    ]
    for (const c of cases) {
      const out = retrieve(handoff({ tools: c.label === 'directly_relevant' ? [tool('runway-gen3')] : [] }), MATRIX_FIXTURE, c.goals, c.claims, facts)
      const [interp] = buildBoundedInterpretations(c.goals, out.results, out.diagnostics)
      expect(interp.summary_blocks.join(' ')).toBe(interp.summary)
      expect(interp.summary_blocks.length).toBeGreaterThan(0)
    }
  })

  test('Case 3A (content-free) produces exactly one block, equal to summary', () => {
    const topicClaims = [
      testTopicClaim({
        claim_id: 'TEST-3A',
        topic: 'copyrightability',
        crc_candidate_statement: 'US-only substantive claim text that must never leak.',
        applicability_requirements: [{ fact: 'jurisdiction', operator: 'equals', value: 'United States' }],
      }),
    ]
    const g = goal({ goal_id: 'g-1', raw_text: 'Is this copyrightable?', category: 'copyrightability' })
    const unknownFacts: ApplicabilityFacts = { jurisdiction: { state: 'unknown' }, toolMentions: [] }
    const out = retrieve(handoff(), MATRIX_FIXTURE, [g], topicClaims, unknownFacts)
    const [interp] = buildBoundedInterpretations([g], out.results, out.diagnostics)
    expect(interp.summary_blocks).toEqual([interp.summary])
    expect(interp.summary_blocks).toHaveLength(1)
  })

  test('mixed Case-3B produces exactly two blocks -- one dependency-free, one dependency-bearing (canonical Kling+iStock shape)', () => {
    const noDep = testTopicClaim({ claim_id: 'NO-DEP', topic: 'third_party_source_rights', crc_candidate_statement: 'Dependency-free statement.' })
    const dep = testTopicClaim({ claim_id: 'DEP', topic: 'third_party_source_rights', crc_candidate_statement: 'Dependency-bearing statement.', unresolved_project_dependencies: ['editorial_designation_confirmed'] })
    const g = goal({ goal_id: 'g-1', raw_text: 'Can I use these third-party images commercially?', category: 'third_party_source_rights' })
    const out = retrieve(handoff(), MATRIX_FIXTURE, [g], [noDep, dep], facts)
    const [interp] = buildBoundedInterpretations([g], out.results, out.diagnostics)
    expect(interp.summary_blocks).toHaveLength(2)
    expect(interp.summary_blocks[0]).toContain('Dependency-free statement.')
    expect(interp.summary_blocks[0]).toContain("though it doesn't by itself determine the answer for your specific project.")
    expect(interp.summary_blocks[1]).toContain('Dependency-bearing statement.')
    expect(interp.summary_blocks[1]).toContain("there isn't enough project-specific information to determine how it applies")
    expect(interp.summary_blocks[1]).toContain('A human-reviewed Commercial Assurance Assessment can address this directly.')
    // No block is a substring artifact of the other, and nothing new appears.
    expect(interp.summary_blocks.join(' ')).toBe(interp.summary)
  })

  test('single dependency-bearing-only group produces exactly one block (no artificial segmentation)', () => {
    const claims = [testTopicClaim({ claim_id: 'DEP-ONLY', topic: 'copyrightability', crc_candidate_statement: 'A dependency-bearing governed statement.', unresolved_project_dependencies: ['human_contribution_description'] })]
    const g = goal({ goal_id: 'g-1', raw_text: 'Is this copyrightable?', category: 'copyrightability' })
    const out = retrieve(handoff(), MATRIX_FIXTURE, [g], claims, facts)
    const [interp] = buildBoundedInterpretations([g], out.results, out.diagnostics)
    expect(interp.summary_blocks).toHaveLength(1)
    expect(interp.summary_blocks[0]).toBe(interp.summary)
  })

  test('directly_relevant (tool-only) produces exactly one block', () => {
    const out = retrieve(handoff({ tools: [tool('runway-gen3')] }), MATRIX_FIXTURE)
    const g = goal({ goal_id: 'g-1', raw_text: 'Can I use this commercially?', category: 'commercial_use' })
    const [interp] = buildBoundedInterpretations([g], out.results)
    expect(interp.summary_blocks).toHaveLength(1)
    expect(interp.summary_blocks[0]).toBe(interp.summary)
  })

  test('copyright H5 + related-topic mixed shape: blocks preserve H5 exactly once and related-topic boundary clause, join reconstructs summary', () => {
    const noDep = testTopicClaim({ claim_id: 'COPY-004-LIKE', topic: 'copyright_ownership', crc_candidate_statement: 'Framing statement, no dependency.' })
    const copyrightabilityDep = testTopicClaim({
      claim_id: 'COPY-001-LIKE',
      topic: 'copyrightability',
      crc_candidate_statement: 'Copyrightability statement with a dependency.',
      applicability_requirements: [{ fact: 'jurisdiction', operator: 'equals', value: 'United States' }],
      unresolved_project_dependencies: ['human_contribution_description'],
    })
    const relationship = {
      relationship_id: 'REL-TEST-v1',
      source_topic: 'copyright_ownership' as const,
      target_topic: 'copyrightability' as const,
      relationship_type: 'relevant_consideration' as const,
      rationale: 'Test rationale.',
      lifecycle: 'Adopted' as const,
      adoption_approver: 'test',
      adoption_decision_date: '2026-08-16',
      publication_scope: 'CRC eligible' as const,
      crc_eligible: 'Yes' as const,
      crc_approver: 'test',
      crc_decision_date: '2026-08-16',
      last_reviewed: '2026-08-16',
      superseded_by: null,
    }
    const g = goal({ goal_id: 'g-1', raw_text: 'Do I own the copyright?', category: 'copyright_ownership' })
    const usFacts: ApplicabilityFacts = { jurisdiction: { state: 'confirmed', value: 'United States' }, toolMentions: [] }
    const out = retrieve(handoff(), MATRIX_FIXTURE, [g], [noDep, copyrightabilityDep], usFacts, [relationship])
    const [interp] = buildBoundedInterpretations([g], out.results, out.diagnostics, { state: 'confirmed', value: 'I only wrote prompts.' })
    expect(interp.summary_blocks).toHaveLength(2)
    expect(interp.summary_blocks[0]).toContain('Framing statement, no dependency.')
    expect(interp.summary_blocks[1]).toContain('Copyrightability statement with a dependency.')
    expect(interp.summary_blocks[1]).toContain('This information is relevant to what you asked, but does not by itself determine the answer.')
    expect(interp.summary_blocks[1].match(/You described your own contribution as:/g)).toHaveLength(1)
    expect(interp.summary_blocks.join(' ')).toBe(interp.summary)
  })

  test('Track C / discovered-topic: canonical Kling+iStock via full retrieve() -- blocks preserve discovered attribution to the real explicit goal, provider isolation intact', () => {
    const g = goal({ goal_id: 'g-1', raw_text: 'Can I use that commercially?', category: 'commercial_use' })
    const out = retrieve(
      handoff({ tools: [tool('kling')] }),
      MATRIX_FIXTURE,
      [g],
      TOPIC_CLAIMS_FIXTURE,
      facts,
      TOPIC_RELATIONSHIPS_FIXTURE,
      ['istock'],
      [{ topic: 'third_party_source_rights', trigger_id: 'test', source_kind: 'asset_provider_mention', source_id: 'ap-1', source_goal_category: 'commercial_use' }],
    )
    const [interp] = buildBoundedInterpretations([g], out.results, out.diagnostics)
    expect(interp.summary_blocks).toHaveLength(2)
    expect(interp.summary_blocks[0]).toContain("Kling's commercial-use permissions depend on your account type")
    expect(interp.summary_blocks[1]).toContain('iStock')
    // Provider isolation: no Getty/Shutterstock-SPECIFIC claim was retrieved
    // (the generic stock claim's own already-governed text legitimately
    // names multiple providers as context -- isolation is about which
    // CLAIMS retrieve, not whether a provider name ever appears in prose).
    const claimIds = out.results.map((r) => r.claim_id)
    expect(claimIds).not.toContain('CLAIM-STOCK-GETTY-EDITORIAL-001-v1')
    expect(claimIds).not.toContain('CLAIM-STOCK-SHUTTERSTOCK-EDITORIAL-001-v1')
    expect(interp.summary_blocks.join(' ')).toBe(interp.summary)
  })
})

describe('buildBoundedInterpretations -- never fabricates, never invents claim content', () => {
  test('summary text is always either fixed template copy or a verbatim RetrievalResult.candidate_statement -- never contains text absent from both sources', () => {
    const out = retrieve(handoff({ tools: [tool('midjourney')] }), MATRIX_FIXTURE)
    const g = goal({ goal_id: 'g-1', raw_text: 'Can I use this commercially?', category: 'commercial_use' })
    const [interp] = buildBoundedInterpretations([g], out.results)
    const claim = out.results.find((r) => r.claim_id === 'midjourney')!
    expect(interp.summary).toContain(claim.candidate_statement)
  })

  test('goal_text is the verbatim raw_text, never paraphrased or altered', () => {
    const raw = 'My client needs proof this is cleared before they will pay the invoice.'
    const g = goal({ goal_id: 'g-1', raw_text: raw, category: 'commercial_use' })
    const [interp] = buildBoundedInterpretations([g], [])
    expect(interp.goal_text).toBe(raw)
  })
})

describe('buildBoundedInterpretations -- Case 3A reuse for a Matrix-origin applicability_unmet diagnostic (CRC Narrow Matrix Applicability milestone, 2026-08-23)', () => {
  const usFacts: ApplicabilityFacts = { jurisdiction: { state: 'confirmed', value: 'United States' }, toolMentions: [] }
  const unknownFacts: ApplicabilityFacts = { jurisdiction: { state: 'unknown' }, toolMentions: [] }

  test('a gated Matrix claim with jurisdiction unknown -> relevant_applicability_unresolved, exactly as an equivalent TopicClaim diagnostic already does -- no Matrix-specific BI branch exists or is needed', () => {
    const gatedRow: MatrixRow = {
      identifier: 'test-matrix-gated',
      last_verified: '2026-08-23',
      claims: [
        {
          claim_id: 'test-matrix-gated',
          crc_eligible: 'Yes',
          crc_publication_scope: 'Test scope text.',
          crc_candidate_statement: 'Matrix-origin substantive claim text that must never leak while unresolved.',
          topic: 'commercial_use',
          applicability_requirements: [{ fact: 'jurisdiction', operator: 'equals', value: 'United States' }],
        },
      ],
    }
    const g = goal({ goal_id: 'g-1', raw_text: 'Can I use this commercially?', category: 'commercial_use' })
    const out = retrieve(handoff({ tools: [tool('test-matrix-gated')] }), [gatedRow], [], [], unknownFacts)
    expect(out.results).toEqual([]) // withheld entirely, same as a TopicClaim's own Case 3A
    // identifier is the claim's topic (goal.category), not claim_id -- BI's
    // existing, unmodified Case 3A detection matches on category, exactly
    // like the topic path's own applicability_unmet diagnostic already does.
    expect(out.diagnostics).toContainEqual({ identifier: 'commercial_use', reason: 'applicability_unmet' })

    const [interp] = buildBoundedInterpretations([g], out.results, out.diagnostics)
    expect(interp.status).toBe('relevant_applicability_unresolved')
    expect(interp.summary).not.toContain('Matrix-origin substantive claim text that must never leak while unresolved.')
    expect(interp.supporting_claim_ids).toEqual([])
  })

  test('the same gated Matrix claim correctly surfaces once jurisdiction is confirmed -- known-selector path reaches BI as an ordinary directly_relevant claim', () => {
    const gatedRow: MatrixRow = {
      identifier: 'test-matrix-gated-2',
      last_verified: '2026-08-23',
      claims: [
        {
          claim_id: 'test-matrix-gated-2',
          crc_eligible: 'Yes',
          crc_publication_scope: 'Test scope text.',
          crc_candidate_statement: 'Matrix-origin substantive claim text, now correctly applicable.',
          topic: 'commercial_use',
          applicability_requirements: [{ fact: 'jurisdiction', operator: 'equals', value: 'United States' }],
        },
      ],
    }
    const g = goal({ goal_id: 'g-1', raw_text: 'Can I use this commercially?', category: 'commercial_use' })
    const out = retrieve(handoff({ tools: [tool('test-matrix-gated-2')] }), [gatedRow], [], [], usFacts)
    expect(out.results).toHaveLength(1)

    const [interp] = buildBoundedInterpretations([g], out.results, out.diagnostics)
    expect(interp.status).toBe('directly_relevant')
    expect(interp.summary).toContain('Matrix-origin substantive claim text, now correctly applicable.')
  })
})
