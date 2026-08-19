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
import type { ApplicabilityFacts } from '@/lib/retrieval-engine/lookup-topic-claims'
import type { RetrievalHandoff, UserGoal } from '@/types/interview-engine'
import type { TopicClaim } from '@/lib/retrieval-engine/types'

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
