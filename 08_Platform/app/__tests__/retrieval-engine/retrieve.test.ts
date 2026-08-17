/**
 * Retrieval Engine deterministic evaluation suite
 * (RETRIEVAL_ENGINE_ARCHITECTURE.md Phase 7, Prototype Beta). Every case
 * here is deterministic -- no live model, no LLM evaluation needed to
 * graduate this milestone (architecture doc §9's own stated expectation
 * for a purely deterministic Retrieval Engine).
 */

import { retrieve } from '@/lib/retrieval-engine/retrieve'
import { MATRIX_FIXTURE } from '@/lib/retrieval-engine/matrix-fixture'
import type { MatrixRow, TopicClaim, TopicRelationship } from '@/lib/retrieval-engine/types'
import type { RetrievalHandoff, UserGoal } from '@/types/interview-engine'

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

function tool(identifier: string, overrides: Partial<{ access_surface: string; plan_tier: string }> = {}) {
  return { identifier, access_surface: 'unresolved', plan_tier: 'unknown', ...overrides }
}

describe('retrieve — required Phase 7 cases', () => {
  test('1: empty handoff -> empty result', () => {
    const out = retrieve(handoff(), MATRIX_FIXTURE)
    expect(out.results).toEqual([])
    expect(out.diagnostics).toEqual([])
  })

  test('2: one resolved tool + one Yes claim', () => {
    const out = retrieve(handoff({ tools: [tool('runway-gen3')] }), MATRIX_FIXTURE)
    expect(out.results).toHaveLength(1)
    expect(out.results[0].claim_id).toBe('runway-gen3')
    expect(out.results[0].matrix_identifier).toBe('runway-gen3')
    expect(out.diagnostics).toEqual([])
  })

  test('3: resolved tool + Pending claim -> no_eligible_claims', () => {
    const out = retrieve(handoff({ tools: [tool('google-veo')] }), MATRIX_FIXTURE)
    expect(out.results).toEqual([])
    expect(out.diagnostics).toEqual([{ identifier: 'google-veo', reason: 'no_eligible_claims' }])
  })

  test('4: resolved tool + single-claim No row -> no_eligible_claims, never fabricated', () => {
    const noRow: MatrixRow = {
      identifier: 'test-tool-no',
      last_verified: '2026-08-08',
      claims: [{ claim_id: 'test-tool-no', crc_eligible: 'No', crc_publication_scope: 'None — withheld for testing.', crc_candidate_statement: null }],
    }
    const out = retrieve(handoff({ tools: [tool('test-tool-no')] }), [noRow])
    expect(out.results).toEqual([])
    expect(out.diagnostics).toEqual([{ identifier: 'test-tool-no', reason: 'no_eligible_claims' }])
  })

  test('5: Verified-but-Pending row never treated as eligible (MatrixRow has no Status field at all, structurally cannot leak)', () => {
    // gemini-api is the real worked example: Verified Status in the actual Matrix, CRC-Eligible: Pending.
    const geminiRow = MATRIX_FIXTURE.find((r) => r.identifier === 'gemini-api')!
    expect((geminiRow as unknown as { status?: unknown }).status).toBeUndefined()
    const out = retrieve(handoff({ tools: [tool('gemini-api')] }), MATRIX_FIXTURE)
    expect(out.results).toEqual([])
    expect(out.diagnostics).toEqual([{ identifier: 'gemini-api', reason: 'no_eligible_claims' }])
  })

  test('6: compound row (ElevenLabs) -- Yes claim surfaces, No claim silently excluded, no diagnostic (row has >0 eligible claims)', () => {
    const out = retrieve(handoff({ tools: [tool('elevenlabs')] }), MATRIX_FIXTURE)
    expect(out.results).toHaveLength(1)
    expect(out.results[0].claim_id).toBe('elevenlabs-commercial-tiering')
    expect(out.results.some((r) => r.claim_id === 'elevenlabs-voice-consent')).toBe(false)
    expect(out.diagnostics).toEqual([])
  })

  test('7: multi-tool handoff -- each tool matched independently, never combined', () => {
    const out = retrieve(handoff({ tools: [tool('runway-gen3'), tool('kling')] }), MATRIX_FIXTURE)
    const claimIds = out.results.map((r) => r.claim_id).sort()
    expect(claimIds).toEqual(['kling', 'runway-gen3'])
  })

  test('8: unresolved alias only -- never matched, diagnosed as unresolved_alias', () => {
    const out = retrieve(handoff({ unresolved_aliases: ['Nano Banana'] }), MATRIX_FIXTURE)
    expect(out.results).toEqual([])
    expect(out.diagnostics).toEqual([{ identifier: 'Nano Banana', reason: 'unresolved_alias' }])
  })

  test('9: current + historical observations remain distinct in the matchable set', () => {
    const out = retrieve(
      handoff({
        scoped_observations: [
          { observation_id: 'so-1', scope: 'current_project', workflow_stage: 'T2', confidence: 'confirmed', status: 'completed', note: 'current fact', superseded_by: null, source_turn: 1, source_statement: 'x' },
          { observation_id: 'so-2', scope: 'historical_project', workflow_stage: 'T2', confidence: 'confirmed', status: 'completed', note: 'historical fact', superseded_by: null, source_turn: 2, source_statement: 'y' },
        ],
      }),
      MATRIX_FIXTURE,
    )
    // No non-tool indexing exists yet (architecture doc open question) -- neither observation produces a match,
    // but retrieve() must not error or conflate them.
    expect(out.results).toEqual([])
    expect(out.diagnostics).toEqual([])
  })

  test('10: excluded/declined topics never enter matching', () => {
    const out = retrieve(
      handoff({
        intended_use: 'declined',
        workflow_role: 'declined',
        scoped_observations: [
          { observation_id: 'so-1', scope: 'current_project', workflow_stage: null, confidence: 'declined', status: null, note: 'declined fact', superseded_by: null, source_turn: 1, source_statement: 'x' },
        ],
      }),
      MATRIX_FIXTURE,
    )
    expect(out.results).toEqual([])
    expect(out.diagnostics).toEqual([])
  })

  test('11: Matrix has no row for a resolved tool -> no_matrix_row', () => {
    const out = retrieve(handoff({ tools: [tool('some-unlisted-tool')] }), MATRIX_FIXTURE)
    expect(out.results).toEqual([])
    expect(out.diagnostics).toEqual([{ identifier: 'some-unlisted-tool', reason: 'no_matrix_row' }])
  })

  test('12: duplicate tool inputs dedupe correctly', () => {
    const out = retrieve(handoff({ tools: [tool('runway-gen3'), tool('runway-gen3')] }), MATRIX_FIXTURE)
    expect(out.results).toHaveLength(1)
    expect(out.results[0].claim_id).toBe('runway-gen3')
  })

  test('13: sparse gate_1_unmet handoff produces a valid partial result, never an error', () => {
    const out = retrieve(handoff({ certainty_state: 'gate_1_unmet', tools: [tool('kling')] }), MATRIX_FIXTURE)
    expect(out.results).toHaveLength(1)
    expect(out.results[0].claim_id).toBe('kling')
  })

  test('14: full opt-out handoff -> empty result, no error', () => {
    const out = retrieve(
      handoff({ certainty_state: 'declined', tools: [], unresolved_aliases: [], intended_use: 'declined', workflow_role: 'declined' }),
      MATRIX_FIXTURE,
    )
    expect(out.results).toEqual([])
    expect(out.diagnostics).toEqual([])
  })

  test('15: publication_scope text is preserved verbatim, character for character', () => {
    const out = retrieve(handoff({ tools: [tool('midjourney')] }), MATRIX_FIXTURE)
    const expectedText = MATRIX_FIXTURE.find((r) => r.identifier === 'midjourney')!.claims[0].crc_publication_scope
    expect(out.results[0].publication_scope).toBe(expectedText)
  })

  test('16: CRC Candidate Statement passes through to Retrieval output verbatim, byte-for-byte (contract extension, JD review 2026-08-08)', () => {
    const out = retrieve(handoff({ tools: [tool('runway-gen3')] }), MATRIX_FIXTURE)
    const sourceClaim = MATRIX_FIXTURE.find((r) => r.identifier === 'runway-gen3')!.claims[0]
    expect(out.results[0].candidate_statement).toBe(sourceClaim.crc_candidate_statement)
  })

  test('16b: Retrieval does not modify Candidate Statement text -- passthrough only, no interpretation/rewriting/rendering', () => {
    const out = retrieve(handoff({ tools: [tool('runway-gen3'), tool('elevenlabs')] }), MATRIX_FIXTURE)
    for (const result of out.results) {
      const row = MATRIX_FIXTURE.find((r) => r.identifier === result.matrix_identifier)!
      const claim = row.claims.find((c) => c.claim_id === result.claim_id)!
      expect(result.candidate_statement).toBe(claim.crc_candidate_statement)
    }
  })

  test('17 (defensive): a Yes claim with no publication scope is skipped, never fabricated', () => {
    const brokenRow: MatrixRow = {
      identifier: 'test-tool-broken',
      last_verified: null,
      claims: [{ claim_id: 'test-tool-broken', crc_eligible: 'Yes', crc_publication_scope: null, crc_candidate_statement: null }],
    }
    const out = retrieve(handoff({ tools: [tool('test-tool-broken')] }), [brokenRow])
    expect(out.results).toEqual([])
    expect(out.diagnostics).toEqual([{ identifier: 'test-tool-broken', reason: 'yes_claim_missing_scope' }])
  })
})

describe('retrieve — negative assertions, forbidden fields (Phase 6)', () => {
  test('no result ever carries SI8 Interpretation, CRC Decision Date, CRC Approver, or CRC-Eligible as content', () => {
    const out = retrieve(handoff({ tools: [tool('runway-gen3'), tool('elevenlabs')] }), MATRIX_FIXTURE)
    for (const result of out.results) {
      const keys = Object.keys(result)
      expect(keys).not.toContain('si8_interpretation')
      expect(keys).not.toContain('crc_decision_date')
      expect(keys).not.toContain('crc_approver')
      expect(keys).not.toContain('crc_eligible')
      // match_origin/matched_goal_category/relationship_id (Governed Topic
      // Relationships milestone, 2026-08-16) are provenance, not forbidden
      // reviewer-only content -- added to this whitelist deliberately.
      expect(keys.sort()).toEqual([
        'candidate_statement',
        'claim_id',
        'last_verified',
        'match_origin',
        'matched_goal_category',
        'matrix_identifier',
        'publication_scope',
        'relationship_id',
        'source_fact',
        'topic',
        'unresolved_project_dependencies',
      ])
    }
  })

  test('CRC Publication Scope IS allowed to pass forward -- must not be treated as a forbidden field', () => {
    const out = retrieve(handoff({ tools: [tool('runway-gen3')] }), MATRIX_FIXTURE)
    expect(out.results[0].publication_scope.length).toBeGreaterThan(0)
  })
})

describe('retrieve -- Topic Retrieval integration (CRC Living Knowledge Phase 1, 2026-08-16)', () => {
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

  function topicClaim(overrides: Partial<TopicClaim> & Pick<TopicClaim, 'claim_id' | 'topic'>): TopicClaim {
    return {
      claim_character: 'established',
      jurisdiction: 'Global',
      lifecycle: 'Adopted',
      crc_eligible: 'Yes',
      crc_publication_scope: 'Scope text.',
      crc_candidate_statement: 'Candidate statement.',
      applicability_requirements: [],
      unresolved_project_dependencies: [],
      last_verified: '2026-08-16',
      superseded_by: null,
      ...overrides,
    }
  }

  test('omitting goals/topicClaims entirely (pre-Phase-1 call shape) behaves exactly as before -- backward compatible default', () => {
    const out = retrieve(handoff({ tools: [tool('runway-gen3')] }), MATRIX_FIXTURE)
    expect(out.results).toHaveLength(1)
    expect(out.results[0].source_fact.kind).toBe('tool')
  })

  test('a topic claim surfaces via source_fact.kind "topic", independent of any tool match', () => {
    const g = goal({ goal_id: 'g-1', category: 'copyright_ownership' })
    const c = topicClaim({ claim_id: 'CLAIM-COPY-001-v1', topic: 'copyright_ownership' })
    const out = retrieve(handoff(), MATRIX_FIXTURE, [g], [c])
    expect(out.results).toHaveLength(1)
    expect(out.results[0].source_fact).toEqual({ kind: 'topic', identifier: 'copyright_ownership' })
    expect(out.results[0].claim_id).toBe('CLAIM-COPY-001-v1')
  })

  test('tool results and topic results merge into ONE list -- both present simultaneously, neither suppresses the other', () => {
    const g = goal({ goal_id: 'g-1', category: 'copyright_ownership' })
    const c = topicClaim({ claim_id: 'CLAIM-COPY-001-v1', topic: 'copyright_ownership' })
    const out = retrieve(handoff({ tools: [tool('kling')] }), MATRIX_FIXTURE, [g], [c])
    const kinds = out.results.map((r) => r.source_fact.kind).sort()
    expect(kinds).toEqual(['tool', 'topic'])
  })

  test('an applicability-gated topic claim with jurisdiction confirmed correctly surfaces', () => {
    const g = goal({ goal_id: 'g-1', category: 'copyright_ownership' })
    const c = topicClaim({
      claim_id: 'CLAIM-COPY-001-v1',
      topic: 'copyright_ownership',
      applicability_requirements: [{ fact: 'jurisdiction', operator: 'equals', value: 'United States' }],
    })
    const out = retrieve(handoff(), MATRIX_FIXTURE, [g], [c], { jurisdiction: { state: 'confirmed', value: 'United States' }, toolMentions: [] })
    expect(out.results).toHaveLength(1)
  })

  test('the same applicability-gated topic claim does NOT surface when jurisdiction is unknown -- default applicabilityFacts', () => {
    const g = goal({ goal_id: 'g-1', category: 'copyright_ownership' })
    const c = topicClaim({
      claim_id: 'CLAIM-COPY-001-v1',
      topic: 'copyright_ownership',
      applicability_requirements: [{ fact: 'jurisdiction', operator: 'equals', value: 'United States' }],
    })
    const out = retrieve(handoff(), MATRIX_FIXTURE, [g], [c])
    expect(out.results).toEqual([])
    expect(out.diagnostics).toContainEqual({ identifier: 'copyright_ownership', reason: 'applicability_unmet' })
  })

  test('Phase A: TOPIC_CLAIMS_FIXTURE is empty, so passing zero real topic claims produces byte-identical results to the pre-Phase-1 call shape', () => {
    const withoutTopics = retrieve(handoff({ tools: [tool('kling')] }), MATRIX_FIXTURE)
    const withEmptyTopics = retrieve(handoff({ tools: [tool('kling')] }), MATRIX_FIXTURE, [], [])
    expect(withEmptyTopics.results).toEqual(withoutTopics.results)
  })
})

describe('retrieve -- Governed Topic Relationships integration (2026-08-16)', () => {
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

  function topicClaim(overrides: Partial<TopicClaim> & Pick<TopicClaim, 'claim_id' | 'topic'>): TopicClaim {
    return {
      claim_character: 'established',
      jurisdiction: 'Global',
      lifecycle: 'Adopted',
      crc_eligible: 'Yes',
      crc_publication_scope: 'Scope text.',
      crc_candidate_statement: 'Candidate statement.',
      applicability_requirements: [],
      unresolved_project_dependencies: [],
      last_verified: '2026-08-16',
      superseded_by: null,
      ...overrides,
    }
  }

  function topicRelationship(overrides: Partial<TopicRelationship> & Pick<TopicRelationship, 'relationship_id' | 'source_topic' | 'target_topic'>): TopicRelationship {
    return {
      relationship_type: 'relevant_consideration',
      rationale: 'Structural rationale placeholder.',
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

  test('omitting relationships entirely (pre-milestone call shape) behaves exactly as before -- backward compatible default', () => {
    const g = goal({ goal_id: 'g-1', category: 'copyright_ownership' })
    const c = topicClaim({ claim_id: 'CLAIM-COPY-004-v1', topic: 'copyright_ownership' })
    const withoutParam = retrieve(handoff(), MATRIX_FIXTURE, [g], [c], { jurisdiction: { state: 'unknown' }, toolMentions: [] })
    const withEmptyRelationships = retrieve(handoff(), MATRIX_FIXTURE, [g], [c], { jurisdiction: { state: 'unknown' }, toolMentions: [] }, [])
    expect(withEmptyRelationships.results).toEqual(withoutParam.results)
  })

  test('a related-topic result carries correct provenance: topic stays the claim\'s own subject, matched_goal_category is the originating goal, relationship_id traces back', () => {
    const g = goal({ goal_id: 'g-1', category: 'copyright_ownership' })
    const rel = topicRelationship({ relationship_id: 'REL-TEST-1', source_topic: 'copyright_ownership', target_topic: 'copyrightability' })
    const c = topicClaim({ claim_id: 'C-1', topic: 'copyrightability' })
    const out = retrieve(handoff(), MATRIX_FIXTURE, [g], [c], undefined, [rel])
    expect(out.results).toHaveLength(1)
    expect(out.results[0].topic).toBe('copyrightability')
    expect(out.results[0].matched_goal_category).toBe('copyright_ownership')
    expect(out.results[0].match_origin).toBe('related_topic')
    expect(out.results[0].relationship_id).toBe('REL-TEST-1')
  })

  test('exact-topic and tool results are stamped exact_topic with relationship_id null', () => {
    const g = goal({ goal_id: 'g-1', category: 'copyright_ownership' })
    const c = topicClaim({ claim_id: 'CLAIM-COPY-004-v1', topic: 'copyright_ownership' })
    const out = retrieve(handoff({ tools: [tool('kling')] }), MATRIX_FIXTURE, [g], [c])
    for (const result of out.results) {
      expect(result.match_origin).toBe('exact_topic')
      expect(result.relationship_id).toBeNull()
      expect(result.matched_goal_category).toBe(result.topic)
    }
  })

  test('canonical cross-goal dedup scenario (PM decision, approved 2026-08-16): the SAME claim (COPY-002) legitimately produces two distinct, both-kept results -- exact_topic for a copyrightability goal, related_topic for a copyright_ownership goal -- neither erases the other', () => {
    const copyrightabilityGoal = goal({ goal_id: 'g-1', category: 'copyrightability' })
    const ownershipGoal = goal({ goal_id: 'g-2', category: 'copyright_ownership' })
    const rel = topicRelationship({ relationship_id: 'REL-COPY-OWNERSHIP-COPYRIGHTABILITY-v1', source_topic: 'copyright_ownership', target_topic: 'copyrightability' })
    const copy002 = topicClaim({ claim_id: 'CLAIM-COPY-002-v1', topic: 'copyrightability' })

    const out = retrieve(handoff(), MATRIX_FIXTURE, [copyrightabilityGoal, ownershipGoal], [copy002], undefined, [rel])

    const forCopyrightability = out.results.filter((r) => r.matched_goal_category === 'copyrightability')
    const forOwnership = out.results.filter((r) => r.matched_goal_category === 'copyright_ownership')

    expect(forCopyrightability).toHaveLength(1)
    expect(forCopyrightability[0]).toMatchObject({ claim_id: 'CLAIM-COPY-002-v1', topic: 'copyrightability', match_origin: 'exact_topic', relationship_id: null })

    expect(forOwnership).toHaveLength(1)
    expect(forOwnership[0]).toMatchObject({
      claim_id: 'CLAIM-COPY-002-v1',
      topic: 'copyrightability',
      match_origin: 'related_topic',
      relationship_id: 'REL-COPY-OWNERSHIP-COPYRIGHTABILITY-v1',
    })

    // Both results present simultaneously -- total count is 2, not 1.
    expect(out.results).toHaveLength(2)
  })

  test('within a single goal, a genuinely duplicate related result (same claim, same relationship) is still deduped', () => {
    const g = goal({ goal_id: 'g-1', category: 'copyright_ownership' })
    const rel = topicRelationship({ relationship_id: 'REL-1', source_topic: 'copyright_ownership', target_topic: 'copyrightability' })
    const c = topicClaim({ claim_id: 'C-1', topic: 'copyrightability' })
    // Same claim object passed twice -- simulates a hypothetical
    // upstream-duplicated fixture entry.
    const out = retrieve(handoff(), MATRIX_FIXTURE, [g], [c, c], undefined, [rel])
    expect(out.results).toHaveLength(1)
  })
})
