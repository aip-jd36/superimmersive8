/**
 * Retrieval Engine deterministic evaluation suite
 * (RETRIEVAL_ENGINE_ARCHITECTURE.md Phase 7, Prototype Beta). Every case
 * here is deterministic -- no live model, no LLM evaluation needed to
 * graduate this milestone (architecture doc §9's own stated expectation
 * for a purely deterministic Retrieval Engine).
 */

import { retrieve } from '@/lib/retrieval-engine/retrieve'
import { MATRIX_FIXTURE } from '@/lib/retrieval-engine/matrix-fixture'
import type { ApplicabilityFacts } from '@/lib/retrieval-engine/lookup-topic-claims'
import type { ApplicabilityRequirement, MatrixRow, TopicClaim, TopicRelationship } from '@/lib/retrieval-engine/types'
import type { RetrievalHandoff, ToolMention, UserGoal } from '@/types/interview-engine'

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
      claims: [{ claim_id: 'test-tool-no', crc_eligible: 'No', crc_publication_scope: 'None — withheld for testing.', crc_candidate_statement: null, applicability_requirements: [] }],
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
    expect(claimIds).toEqual(['kling-commercial-use-baseline', 'runway-gen3'])
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
    expect(out.results[0].claim_id).toBe('kling-commercial-use-baseline')
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
      claims: [{ claim_id: 'test-tool-broken', crc_eligible: 'Yes', crc_publication_scope: null, crc_candidate_statement: null, applicability_requirements: [] }],
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
      provider_scope: null,
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
    expect(out.diagnostics).toContainEqual({
      identifier: 'copyright_ownership',
      reason: 'applicability_unmet',
      unmet_applicability: [{ claim_id: 'CLAIM-COPY-001-v1', requirement: { fact: 'jurisdiction', operator: 'equals', value: 'United States' }, status: 'unresolved' }],
    })
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
      provider_scope: null,
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

describe('retrieve -- Matrix applicability (CRC Narrow Matrix Applicability milestone, 2026-08-23)', () => {
  function toolMention(overrides: Partial<ToolMention> & Pick<ToolMention, 'mention_id' | 'resolution'>): ToolMention {
    return {
      access_surface: { state: 'unknown' },
      plan_tier: { state: 'unknown' },
      account_status: { state: 'unknown' },
      confidence: 'confirmed',
      source_turn: 1,
      source_statement: 'placeholder',
      superseded_by: null,
      ...overrides,
    }
  }

  function facts(overrides: Partial<ApplicabilityFacts> = {}): ApplicabilityFacts {
    return { jurisdiction: { state: 'unknown' }, toolMentions: [], ...overrides }
  }

  // Test A: every existing (unconditional, applicability_requirements: [])
  // Matrix claim retrieves exactly as before -- the migration is provably
  // behavior-preserving, not merely asserted. Every other test in this file
  // that already exercises MATRIX_FIXTURE (Tests 1-17 above) is itself
  // additional, broader evidence of the same invariant; this is the one
  // narrow, explicit regression check for it.
  test('A: an existing unconditional Matrix claim (applicability_requirements: []) is unaffected by the new gate', () => {
    const out = retrieve(handoff({ tools: [{ identifier: 'kling', access_surface: 'unresolved', plan_tier: 'unknown' }] }), MATRIX_FIXTURE)
    expect(out.results).toHaveLength(1)
    expect(out.results[0].claim_id).toBe('kling-commercial-use-baseline')
    expect(out.results[0].candidate_statement).toBe(MATRIX_FIXTURE.find((r) => r.identifier === 'kling')!.claims[0].crc_candidate_statement)
    // CRC Kling Governed Knowledge Correction + Decomposition milestone
    // (2026-08-24): Kling's row now has a SECOND, applicability-gated claim
    // (kling-commercial-use-member) sharing this row -- its own unresolved
    // diagnostic is expected here and does not indicate the unconditional
    // baseline claim (asserted above) was affected by the gate in any way.
    expect(out.diagnostics).toEqual([
      {
        identifier: 'commercial_use',
        reason: 'applicability_unmet',
        unmet_applicability: [{ claim_id: 'kling-commercial-use-member', requirement: { fact: 'tool_account_status', tool: 'kling', operator: 'equals', value: 'Member Account' }, status: 'unresolved' }],
      },
    ])
  })

  // Test B: matching applicability, using jurisdiction -- an already
  // well-normalized applicability fact -- to test the generic capability
  // without coupling to tool_plan_tier's own separately-tracked, unrelated
  // normalization debt (see Final Report §O).
  test('B: a gated Matrix claim retrieves when its applicability requirement is met', () => {
    const gatedRow: MatrixRow = {
      identifier: 'test-matrix-jurisdiction',
      last_verified: '2026-08-23',
      claims: [
        {
          claim_id: 'test-matrix-jurisdiction',
          crc_eligible: 'Yes',
          crc_publication_scope: 'Test scope text.',
          crc_candidate_statement: 'Test candidate statement.',
          topic: 'commercial_use',
          applicability_requirements: [{ fact: 'jurisdiction', operator: 'equals', value: 'United States' }],
        },
      ],
    }
    const out = retrieve(
      handoff({ tools: [{ identifier: 'test-matrix-jurisdiction', access_surface: 'unresolved', plan_tier: 'unknown' }] }),
      [gatedRow],
      [],
      [],
      facts({ jurisdiction: { state: 'confirmed', value: 'United States' } }),
    )
    expect(out.results).toHaveLength(1)
    expect(out.results[0].claim_id).toBe('test-matrix-jurisdiction')
    expect(out.diagnostics).toEqual([])
  })

  // Test C: known, nonmatching applicability.
  test('C: a gated Matrix claim is withheld, with applicability_unmet, when its requirement is known but not met', () => {
    const gatedRow: MatrixRow = {
      identifier: 'test-matrix-jurisdiction',
      last_verified: '2026-08-23',
      claims: [
        {
          claim_id: 'test-matrix-jurisdiction',
          crc_eligible: 'Yes',
          crc_publication_scope: 'Test scope text.',
          crc_candidate_statement: 'Test candidate statement.',
          topic: 'commercial_use',
          applicability_requirements: [{ fact: 'jurisdiction', operator: 'equals', value: 'United States' }],
        },
      ],
    }
    const out = retrieve(
      handoff({ tools: [{ identifier: 'test-matrix-jurisdiction', access_surface: 'unresolved', plan_tier: 'unknown' }] }),
      [gatedRow],
      [],
      [],
      facts({ jurisdiction: { state: 'confirmed', value: 'Taiwan' } }),
    )
    expect(out.results).toEqual([])
    // identifier is the claim's topic (commercial_use), not claim_id -- see
    // retrieve.ts's own comment at this exact call site for why.
    expect(out.diagnostics).toEqual([
      {
        identifier: 'commercial_use',
        reason: 'applicability_unmet',
        unmet_applicability: [{ claim_id: 'test-matrix-jurisdiction', requirement: { fact: 'jurisdiction', operator: 'equals', value: 'United States' }, status: 'not_met' }],
      },
    ])
  })

  // Test D: unknown applicability fails closed identically to a known-wrong
  // value -- never guessed, never both branches exposed. Deliberately omits
  // `topic` (untagged claim) to also exercise the `claim.topic ?? 'unknown'`
  // diagnostic fallback -- Test C already covers the tagged-claim case.
  test('D: a gated Matrix claim fails closed -- unconfirmed applicability fact behaves identically to a nonmatching one', () => {
    const gatedRow: MatrixRow = {
      identifier: 'test-matrix-jurisdiction',
      last_verified: '2026-08-23',
      claims: [
        {
          claim_id: 'test-matrix-jurisdiction',
          crc_eligible: 'Yes',
          crc_publication_scope: 'Test scope text.',
          crc_candidate_statement: 'Test candidate statement that must never leak while unresolved.',
          applicability_requirements: [{ fact: 'jurisdiction', operator: 'equals', value: 'United States' }],
        },
      ],
    }
    const out = retrieve(handoff({ tools: [{ identifier: 'test-matrix-jurisdiction', access_surface: 'unresolved', plan_tier: 'unknown' }] }), [gatedRow])
    expect(out.results).toEqual([])
    expect(out.diagnostics).toEqual([
      {
        identifier: 'unknown',
        reason: 'applicability_unmet',
        unmet_applicability: [{ claim_id: 'test-matrix-jurisdiction', requirement: { fact: 'jurisdiction', operator: 'equals', value: 'United States' }, status: 'unresolved' }],
      },
    ])
  })

  // Test E: two independently-governed conditional claims under one row
  // (mirrors the existing live elevenlabs two-claim precedent), gated on
  // tool_plan_tier specifically -- proves per-claim, not per-row,
  // evaluation, and sibling suppression without any variant-family concept.
  test('E: two mutually exclusive conditional claims under one row -- only the applicable one retrieves, the sibling is withheld with its own diagnostic', () => {
    const twoClaimRow: MatrixRow = {
      identifier: 'test-tool-tiered',
      last_verified: '2026-08-23',
      claims: [
        {
          claim_id: 'test-tool-tiered-paid',
          crc_eligible: 'Yes',
          crc_publication_scope: 'Paid scope text.',
          crc_candidate_statement: 'Paid candidate statement.',
          topic: 'commercial_use',
          applicability_requirements: [{ fact: 'tool_plan_tier', tool: 'test-tool-tiered', operator: 'equals', value: 'paid' }],
        },
        {
          claim_id: 'test-tool-tiered-free',
          crc_eligible: 'Yes',
          crc_publication_scope: 'Free scope text.',
          crc_candidate_statement: 'Free candidate statement.',
          topic: 'commercial_use',
          applicability_requirements: [{ fact: 'tool_plan_tier', tool: 'test-tool-tiered', operator: 'equals', value: 'free' }],
        },
      ],
    }
    const tm = toolMention({ mention_id: 'm1', resolution: { kind: 'canonical', identifier: 'test-tool-tiered' }, plan_tier: { state: 'confirmed', value: 'paid' } })
    const out = retrieve(
      handoff({ tools: [{ identifier: 'test-tool-tiered', access_surface: 'unresolved', plan_tier: 'paid' }] }),
      [twoClaimRow],
      [],
      [],
      facts({ toolMentions: [tm] }),
    )
    expect(out.results).toHaveLength(1)
    expect(out.results[0].claim_id).toBe('test-tool-tiered-paid')
    expect(out.results.some((r) => r.claim_id === 'test-tool-tiered-free')).toBe(false)
    // identifier is the (shared) topic, not the failing claim's own claim_id.
    expect(out.diagnostics).toEqual([
      {
        identifier: 'commercial_use',
        reason: 'applicability_unmet',
        unmet_applicability: [
          { claim_id: 'test-tool-tiered-free', requirement: { fact: 'tool_plan_tier', tool: 'test-tool-tiered', operator: 'equals', value: 'free' }, status: 'not_met' },
        ],
      },
    ])
  })

  // Correction semantics: retrieve() is a pure function re-run fresh from
  // current state every turn (no caching in this module) -- a plan-tier
  // correction simply changes which claim's requirement evaluates true on
  // the NEXT call, exactly as it already does for jurisdiction. No new
  // mechanism exists or is needed to "re-evaluate" a stale conclusion.
  test('correction: the same two-claim row selects the other variant when plan_tier changes between calls', () => {
    const twoClaimRow: MatrixRow = {
      identifier: 'test-tool-tiered',
      last_verified: '2026-08-23',
      claims: [
        {
          claim_id: 'test-tool-tiered-paid',
          crc_eligible: 'Yes',
          crc_publication_scope: 'Paid scope text.',
          crc_candidate_statement: 'Paid candidate statement.',
          applicability_requirements: [{ fact: 'tool_plan_tier', tool: 'test-tool-tiered', operator: 'equals', value: 'paid' }],
        },
        {
          claim_id: 'test-tool-tiered-free',
          crc_eligible: 'Yes',
          crc_publication_scope: 'Free scope text.',
          crc_candidate_statement: 'Free candidate statement.',
          applicability_requirements: [{ fact: 'tool_plan_tier', tool: 'test-tool-tiered', operator: 'equals', value: 'free' }],
        },
      ],
    }
    const h = handoff({ tools: [{ identifier: 'test-tool-tiered', access_surface: 'unresolved', plan_tier: 'unknown' }] })

    const paidTm = toolMention({ mention_id: 'm1', resolution: { kind: 'canonical', identifier: 'test-tool-tiered' }, plan_tier: { state: 'confirmed', value: 'paid' } })
    const paidOut = retrieve(h, [twoClaimRow], [], [], facts({ toolMentions: [paidTm] }))
    expect(paidOut.results.map((r) => r.claim_id)).toEqual(['test-tool-tiered-paid'])

    const freeTm = toolMention({ mention_id: 'm1', resolution: { kind: 'canonical', identifier: 'test-tool-tiered' }, plan_tier: { state: 'confirmed', value: 'free' } })
    const freeOut = retrieve(h, [twoClaimRow], [], [], facts({ toolMentions: [freeTm] }))
    expect(freeOut.results.map((r) => r.claim_id)).toEqual(['test-tool-tiered-free'])
  })
})
