/**
 * M2 (Bounded Interpretation) behavior for Governed Topic Relationships
 * (implementation milestone, 2026-08-16). Mirrors
 * build-bounded-interpretation.test.ts's own established pattern -- real
 * `retrieve()` end-to-end, test-only Adopted+CRC-eligible fixtures,
 * deliberately isolated from TOPIC_CLAIMS_FIXTURE/TOPIC_RELATIONSHIPS_FIXTURE
 * so this file's own assertions about M2's composition mechanism never
 * depend on real governance timing -- see
 * governed-topic-relationships-zero-behavior-change.test.ts for the
 * equivalent proof against the REAL fixtures.
 *
 * UPDATE (2026-08-19): CLAIM-COPY-002-v1/-003-v1 and
 * REL-COPY-OWNERSHIP-COPYRIGHTABILITY-v1 are now ALSO real
 * `crc_eligible: 'Yes'` (atomic copyright publication package -- see
 * governance-reviews/CPR_006_COPYRIGHT_PUBLICATION_PACKAGE_2026-08-19.md).
 * This file's own synthetic fixtures below were originally built to
 * exercise that future state ahead of publication; they remain valid,
 * still-isolated regression coverage of M2's composition mechanism now
 * that the state they modeled is real -- kept as test-only objects
 * (not switched to importing the real fixture) so this file continues to
 * prove M2's behavior independent of any future governance change.
 */

import { buildBoundedInterpretations } from '@/lib/bounded-interpretation/build-bounded-interpretation'
import { retrieve } from '@/lib/retrieval-engine/retrieve'
import { MATRIX_FIXTURE } from '@/lib/retrieval-engine/matrix-fixture'
import type { ApplicabilityFacts } from '@/lib/retrieval-engine/lookup-topic-claims'
import type { RetrievalHandoff, UserGoal } from '@/types/interview-engine'
import type { TopicClaim, TopicRelationship } from '@/lib/retrieval-engine/types'

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

// Test-only Adopted + CRC-eligible fixtures -- deliberately isolated from
// TOPIC_CLAIMS_FIXTURE/TOPIC_RELATIONSHIPS_FIXTURE regardless of their real
// governance state (see module header). Mirrors lookup-topic-claims.test.ts's
// own claim() helper shape.
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

function testRelationship(
  overrides: Partial<TopicRelationship> & Pick<TopicRelationship, 'relationship_id' | 'source_topic' | 'target_topic'>,
): TopicRelationship {
  return {
    relationship_type: 'relevant_consideration',
    rationale: 'Structural rationale placeholder -- never rendered.',
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

const usFacts: ApplicabilityFacts = { jurisdiction: { state: 'confirmed', value: 'United States' }, toolMentions: [] }
const unknownFacts: ApplicabilityFacts = { jurisdiction: { state: 'unknown' }, toolMentions: [] }

describe('M2 -- related-only (no exact-topic match, only related-topic)', () => {
  test('a goal with zero exact-topic claims but an eligible related-topic claim is NOT outside_current_coverage', () => {
    const rel = testRelationship({ relationship_id: 'REL-1', source_topic: 'copyright_ownership', target_topic: 'copyrightability' })
    const relatedClaim = testTopicClaim({ claim_id: 'TEST-RELATED', topic: 'copyrightability', crc_candidate_statement: 'Related statement.' })
    const g = goal({ goal_id: 'g-1', raw_text: 'Do I own the copyright?', category: 'copyright_ownership' })
    // Deliberately zero copyright_ownership-topic claims -- only the
    // related copyrightability claim exists.
    const out = retrieve(handoff(), MATRIX_FIXTURE, [g], [relatedClaim], usFacts, [rel])
    const [interp] = buildBoundedInterpretations([g], out.results, out.diagnostics)
    expect(interp.status).not.toBe('outside_current_coverage')
    expect(interp.status).toBe('directly_relevant')
    expect(interp.summary).toContain('Related statement.')
  })
})

describe('M2 -- exact + related composition', () => {
  test('exact-topic claim (COPY-004-equivalent) and related-topic claims combine into one interpretation; both claim_ids traceable', () => {
    const rel = testRelationship({ relationship_id: 'REL-1', source_topic: 'copyright_ownership', target_topic: 'copyrightability' })
    const exactClaim = testTopicClaim({ claim_id: 'TEST-OWNERSHIP', topic: 'copyright_ownership', crc_candidate_statement: 'Ownership framing statement.' })
    const relatedClaim = testTopicClaim({ claim_id: 'TEST-COPYRIGHTABILITY', topic: 'copyrightability', crc_candidate_statement: 'Copyrightability principle statement.' })
    const g = goal({ goal_id: 'g-1', raw_text: 'Do I own the copyright?', category: 'copyright_ownership' })
    const out = retrieve(handoff(), MATRIX_FIXTURE, [g], [exactClaim, relatedClaim], usFacts, [rel])
    const [interp] = buildBoundedInterpretations([g], out.results, out.diagnostics)
    expect(interp.summary).toContain('Ownership framing statement.')
    expect(interp.summary).toContain('Copyrightability principle statement.')
    expect(interp.supporting_claim_ids.sort()).toEqual(['TEST-COPYRIGHTABILITY', 'TEST-OWNERSHIP'])
  })
})

describe('M2 -- related-topic content with unresolved_project_dependencies -> existing Case 3B path, no new state', () => {
  test('a related claim carrying unresolved_project_dependencies triggers relevant_applicability_unresolved, content still quoted', () => {
    const rel = testRelationship({ relationship_id: 'REL-1', source_topic: 'copyright_ownership', target_topic: 'copyrightability' })
    const relatedClaim = testTopicClaim({
      claim_id: 'TEST-DEP',
      topic: 'copyrightability',
      crc_candidate_statement: 'Statement with unresolved dependency.',
      unresolved_project_dependencies: ['human_creative_contribution_level'],
    })
    const g = goal({ goal_id: 'g-1', raw_text: 'Do I own the copyright?', category: 'copyright_ownership' })
    const out = retrieve(handoff(), MATRIX_FIXTURE, [g], [relatedClaim], usFacts, [rel])
    const [interp] = buildBoundedInterpretations([g], out.results, out.diagnostics)
    expect(interp.status).toBe('relevant_applicability_unresolved')
    expect(interp.summary).toContain('Statement with unresolved dependency.')
    expect(interp.summary).toContain("there isn't enough project-specific information to determine how it applies to your specific project.")
  })
})

describe('M2 -- Case 3A diagnostic-origin fix (the specific bug the design report flagged)', () => {
  test('a related-topic claim that fails ITS OWN formal applicability gate still produces relevant_applicability_unresolved for the ORIGINATING goal, not outside_current_coverage', () => {
    const rel = testRelationship({ relationship_id: 'REL-1', source_topic: 'copyright_ownership', target_topic: 'copyrightability' })
    const relatedClaim = testTopicClaim({
      claim_id: 'TEST-GATED',
      topic: 'copyrightability',
      crc_candidate_statement: 'Must never leak -- jurisdiction unconfirmed.',
      applicability_requirements: [{ fact: 'jurisdiction', operator: 'equals', value: 'United States' }],
    })
    const g = goal({ goal_id: 'g-1', raw_text: 'Do I own the copyright?', category: 'copyright_ownership' })
    // jurisdiction UNKNOWN -- the related claim's own gate fails.
    const out = retrieve(handoff(), MATRIX_FIXTURE, [g], [relatedClaim], unknownFacts, [rel])
    expect(out.results).toEqual([]) // withheld entirely, by design
    // The load-bearing assertion: the diagnostic must carry the
    // ORIGINATING goal category (copyright_ownership), not the related
    // claim's own topic (copyrightability) -- see
    // lookup-topic-relationships.ts's own module header for why.
    expect(out.diagnostics).toContainEqual({ identifier: 'copyright_ownership', reason: 'applicability_unmet' })

    const [interp] = buildBoundedInterpretations([g], out.results, out.diagnostics)
    expect(interp.status).toBe('relevant_applicability_unresolved')
    expect(interp.summary).not.toContain('Must never leak')
    expect(interp.supporting_claim_ids).toEqual([])
  })

  test('without the origin fix, this would have silently fallen back to outside_current_coverage -- explicit contrast case using a diagnostic keyed to the WRONG (target) category', () => {
    const g = goal({ goal_id: 'g-1', raw_text: 'Do I own the copyright?', category: 'copyright_ownership' })
    // Simulates the bug: a diagnostic keyed to the target topic instead of
    // the originating goal category.
    const wronglyKeyedDiagnostics = [{ identifier: 'copyrightability' as const, reason: 'applicability_unmet' as const }]
    const [interp] = buildBoundedInterpretations([g], [], wronglyKeyedDiagnostics)
    expect(interp.status).toBe('outside_current_coverage') // the failure mode this milestone's fix avoids
  })
})

describe('M2 -- generic epistemic boundary clause (PM override of the design report\'s topic-interpolated proposal)', () => {
  test('the exact fixed clause appears for related-topic content, no topic-label interpolation', () => {
    const rel = testRelationship({ relationship_id: 'REL-1', source_topic: 'copyright_ownership', target_topic: 'copyrightability' })
    const relatedClaim = testTopicClaim({ claim_id: 'TEST-RELATED', topic: 'copyrightability', crc_candidate_statement: 'Related statement.' })
    const g = goal({ goal_id: 'g-1', raw_text: 'Do I own the copyright?', category: 'copyright_ownership' })
    const out = retrieve(handoff(), MATRIX_FIXTURE, [g], [relatedClaim], usFacts, [rel])
    const [interp] = buildBoundedInterpretations([g], out.results, out.diagnostics)
    expect(interp.summary).toContain('This information is relevant to what you asked, but does not by itself determine the answer.')
    // No topic-interpolated sentence of the design report's original,
    // explicitly-rejected form.
    expect(interp.summary).not.toMatch(/related consideration \(/i)
  })

  test('an exact-topic-only match never gets the related-topic clause', () => {
    const exactClaim = testTopicClaim({ claim_id: 'TEST-EXACT', topic: 'copyright_ownership', crc_candidate_statement: 'Exact-only statement.' })
    const g = goal({ goal_id: 'g-1', raw_text: 'Do I own the copyright?', category: 'copyright_ownership' })
    const out = retrieve(handoff(), MATRIX_FIXTURE, [g], [exactClaim], usFacts, [])
    const [interp] = buildBoundedInterpretations([g], out.results, out.diagnostics)
    expect(interp.summary).not.toContain('This information is relevant to what you asked, but does not by itself determine the answer.')
  })

  test('the clause appears exactly once even when multiple related claims contribute', () => {
    const rel = testRelationship({ relationship_id: 'REL-1', source_topic: 'copyright_ownership', target_topic: 'copyrightability' })
    const relatedA = testTopicClaim({ claim_id: 'TEST-A', topic: 'copyrightability', crc_candidate_statement: 'Statement A.' })
    const relatedB = testTopicClaim({ claim_id: 'TEST-B', topic: 'copyrightability', crc_candidate_statement: 'Statement B.' })
    const g = goal({ goal_id: 'g-1', raw_text: 'Do I own the copyright?', category: 'copyright_ownership' })
    const out = retrieve(handoff(), MATRIX_FIXTURE, [g], [relatedA, relatedB], usFacts, [rel])
    const [interp] = buildBoundedInterpretations([g], out.results, out.diagnostics)
    const occurrences = interp.summary.split('This information is relevant to what you asked, but does not by itself determine the answer.').length - 1
    expect(occurrences).toBe(1)
  })
})

describe('M2 -- no relationship internals ever render', () => {
  test('relationship rationale, relationship_id, and relationship_type never appear anywhere in the rendered summary', () => {
    const rel = testRelationship({
      relationship_id: 'REL-DO-NOT-RENDER-ME',
      source_topic: 'copyright_ownership',
      target_topic: 'copyrightability',
      rationale: 'THIS RATIONALE TEXT MUST NEVER APPEAR IN OUTPUT.',
    })
    const relatedClaim = testTopicClaim({ claim_id: 'TEST-RELATED', topic: 'copyrightability', crc_candidate_statement: 'Related statement.' })
    const g = goal({ goal_id: 'g-1', raw_text: 'Do I own the copyright?', category: 'copyright_ownership' })
    const out = retrieve(handoff(), MATRIX_FIXTURE, [g], [relatedClaim], usFacts, [rel])
    const [interp] = buildBoundedInterpretations([g], out.results, out.diagnostics)
    expect(interp.summary).not.toContain('THIS RATIONALE TEXT MUST NEVER APPEAR IN OUTPUT')
    expect(interp.summary).not.toContain('REL-DO-NOT-RENDER-ME')
    expect(interp.summary).not.toContain('relevant_consideration')
    expect(interp.summary).not.toMatch(/relationship/i)
  })

  test('no internal topic identifier (e.g. the literal string "copyrightability") is interpolated into the rendered summary by the related-topic clause itself', () => {
    const rel = testRelationship({ relationship_id: 'REL-1', source_topic: 'copyright_ownership', target_topic: 'copyrightability' })
    const relatedClaim = testTopicClaim({ claim_id: 'TEST-RELATED', topic: 'copyrightability', crc_candidate_statement: 'Related statement with no topic name in it.' })
    const g = goal({ goal_id: 'g-1', raw_text: 'Do I own the copyright?', category: 'copyright_ownership' })
    const out = retrieve(handoff(), MATRIX_FIXTURE, [g], [relatedClaim], usFacts, [rel])
    const [interp] = buildBoundedInterpretations([g], out.results, out.diagnostics)
    // The fixed clause itself contains no topic label; CATEGORY_LABELS'
    // own "whether this kind of output can be copyrighted at all" label is
    // still used by the OUTER "This is relevant to..." sentence (unchanged,
    // pre-existing behavior) -- what must never appear is the raw internal
    // enum string.
    expect(interp.summary).not.toContain('copyrightability')
  })
})

describe('M2 -- goal isolation preserved (commercial_use unaffected by an unrelated copyright relationship)', () => {
  test('a commercial_use goal in the same conversation as a copyright_ownership goal is completely unaffected by the relationship', () => {
    const rel = testRelationship({ relationship_id: 'REL-1', source_topic: 'copyright_ownership', target_topic: 'copyrightability' })
    const exactClaim = testTopicClaim({ claim_id: 'TEST-OWNERSHIP', topic: 'copyright_ownership', crc_candidate_statement: 'Ownership statement.' })
    const relatedClaim = testTopicClaim({ claim_id: 'TEST-COPYRIGHTABILITY', topic: 'copyrightability', crc_candidate_statement: 'Copyrightability statement.' })
    const commercialUseGoal = goal({ goal_id: 'g-1', raw_text: 'Can I use this commercially?', category: 'commercial_use' })
    const ownershipGoal = goal({ goal_id: 'g-2', raw_text: 'Do I own the copyright?', category: 'copyright_ownership' })

    const out = retrieve(handoff({ tools: [tool('kling')] }), MATRIX_FIXTURE, [commercialUseGoal, ownershipGoal], [exactClaim, relatedClaim], usFacts, [rel])
    const interps = buildBoundedInterpretations([commercialUseGoal, ownershipGoal], out.results, out.diagnostics)

    const commercialInterp = interps.find((i) => i.category === 'commercial_use')!
    const ownershipInterp = interps.find((i) => i.category === 'copyright_ownership')!

    expect(commercialInterp.summary).not.toContain('Copyrightability statement.')
    expect(commercialInterp.summary).not.toContain('Ownership statement.')
    expect(commercialInterp.summary).not.toContain('This information is relevant to what you asked, but does not by itself determine the answer.')
    expect(commercialInterp.supporting_claim_ids).not.toContain('TEST-COPYRIGHTABILITY')
    expect(commercialInterp.supporting_claim_ids).not.toContain('TEST-OWNERSHIP')

    expect(ownershipInterp.summary).toContain('Ownership statement.')
    expect(ownershipInterp.summary).toContain('Copyrightability statement.')
  })
})

describe('M2 -- canonical worked future scenario (PM task §23)', () => {
  test('commercial_use + copyright_ownership, Kling paid, US jurisdiction, synthetic eligible relationship + COPY-004/002/003 equivalents', () => {
    const rel = testRelationship({ relationship_id: 'REL-COPY-OWNERSHIP-COPYRIGHTABILITY-v1', source_topic: 'copyright_ownership', target_topic: 'copyrightability' })
    const copy004 = testTopicClaim({
      claim_id: 'CLAIM-COPY-004-v1',
      topic: 'copyright_ownership',
      crc_candidate_statement:
        "Whether a platform's terms allow commercial use of the output, and whether that output is copyrighted (and who owns it), are two separate questions -- a platform granting commercial-use permission doesn't by itself answer either.",
      applicability_requirements: [],
      unresolved_project_dependencies: [],
    })
    const copy002 = testTopicClaim({
      claim_id: 'CLAIM-COPY-002-v1',
      topic: 'copyrightability',
      crc_candidate_statement: 'Writing prompts alone generally does not establish sufficient human authorship on its own.',
      applicability_requirements: [{ fact: 'jurisdiction', operator: 'equals', value: 'United States' }],
      unresolved_project_dependencies: ['human_creative_contribution_level'],
    })
    const copy003 = testTopicClaim({
      claim_id: 'CLAIM-COPY-003-v1',
      topic: 'copyrightability',
      crc_candidate_statement: 'Meaningfully selecting, arranging, or editing AI-generated material can support a copyright claim on its own.',
      applicability_requirements: [{ fact: 'jurisdiction', operator: 'equals', value: 'United States' }],
      unresolved_project_dependencies: ['human_creative_contribution_level'],
    })

    const commercialUseGoal = goal({ goal_id: 'g-1', raw_text: 'Can I use this commercially, and do I own the copyright?', category: 'commercial_use' })
    const ownershipGoal = goal({ goal_id: 'g-2', raw_text: 'Can I use this commercially, and do I own the copyright?', category: 'copyright_ownership' })

    const out = retrieve(
      handoff({ tools: [tool('kling')] }),
      MATRIX_FIXTURE,
      [commercialUseGoal, ownershipGoal],
      [copy004, copy002, copy003],
      usFacts,
      [rel],
    )
    const interps = buildBoundedInterpretations([commercialUseGoal, ownershipGoal], out.results, out.diagnostics)

    const commercialInterp = interps.find((i) => i.category === 'commercial_use')!
    const ownershipInterp = interps.find((i) => i.category === 'copyright_ownership')!

    // COMMERCIAL_USE: receives the Kling claim, receives NOTHING copyright-related.
    expect(commercialInterp.summary).toMatch(/Kling/i)
    expect(commercialInterp.supporting_claim_ids).not.toContain('CLAIM-COPY-004-v1')
    expect(commercialInterp.supporting_claim_ids).not.toContain('CLAIM-COPY-002-v1')
    expect(commercialInterp.supporting_claim_ids).not.toContain('CLAIM-COPY-003-v1')

    // COPYRIGHT_OWNERSHIP: receives all three, correctly split exact vs related.
    expect(ownershipInterp.supporting_claim_ids.sort()).toEqual(['CLAIM-COPY-002-v1', 'CLAIM-COPY-003-v1', 'CLAIM-COPY-004-v1'])
    const ownershipMatches = out.results.filter((r) => r.matched_goal_category === 'copyright_ownership')
    expect(ownershipMatches.find((r) => r.claim_id === 'CLAIM-COPY-004-v1')?.match_origin).toBe('exact_topic')
    expect(ownershipMatches.find((r) => r.claim_id === 'CLAIM-COPY-002-v1')?.match_origin).toBe('related_topic')
    expect(ownershipMatches.find((r) => r.claim_id === 'CLAIM-COPY-003-v1')?.match_origin).toBe('related_topic')

    // human_creative_contribution_level correctly identified as unresolved -> Case 3B.
    expect(ownershipInterp.status).toBe('relevant_applicability_unresolved')

    // Never a prohibited conclusion.
    const forbidden = /\bis copyrightable\b|\bis not copyrightable\b|\byou own\b|\byou do not own\b|\bthe video is\b.*(protected|not protected)/i
    expect(ownershipInterp.summary).not.toMatch(forbidden)
    expect(commercialInterp.summary).not.toMatch(forbidden)
  })
})
