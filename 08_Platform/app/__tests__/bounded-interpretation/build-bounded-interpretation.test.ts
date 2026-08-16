/**
 * Bounded Interpretation deterministic evaluation suite (CRC Milestone 2,
 * User Goal + Bounded Interpretation, 2026-08-15). Every case here is
 * deterministic -- no live model needed to graduate this module, matching
 * lib/retrieval-engine's own established discipline for its equivalent
 * suite (retrieve.test.ts).
 */

import { buildBoundedInterpretations } from '@/lib/bounded-interpretation/build-bounded-interpretation'
import { directlyRelevantSummary } from '@/lib/bounded-interpretation/rules'
import { retrieve } from '@/lib/retrieval-engine/retrieve'
import { MATRIX_FIXTURE } from '@/lib/retrieval-engine/matrix-fixture'
import type { ApplicabilityFacts } from '@/lib/retrieval-engine/lookup-topic-claims'
import type { RetrievalHandoff, UserGoal } from '@/types/interview-engine'
import type { TopicClaim } from '@/lib/retrieval-engine/types'

function handoff(overrides: Partial<RetrievalHandoff> = {}): RetrievalHandoff {
  return {
    tools: [],
    unresolved_aliases: [],
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
