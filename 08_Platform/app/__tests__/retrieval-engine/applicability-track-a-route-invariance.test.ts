/**
 * Route-invariance tests (Generic Shallow Applicability -- Track A Authority
 * Completion milestone, 2026-09-15; ADR-001-generic-applicability-
 * architecture.md §K). Proves the SAME `TopicClaim` applicability expression
 * produces the SAME authoritative aggregate result whether evaluated through
 * `lookupTopicClaims` (ordinary explicit-goal route) or
 * `lookupDiscoveredTopicClaims` (Track A discovered-relevance route) -- a
 * TopicClaim must not acquire different applicability meaning merely because
 * of which retrieval route reached it. No live model needed -- pure
 * functions, same discipline as lookup-discovered-topic-claims.test.ts.
 */

import { lookupTopicClaims, evaluateApplicabilityExpression, type ApplicabilityFacts } from '@/lib/retrieval-engine/lookup-topic-claims'
import { lookupDiscoveredTopicClaims } from '@/lib/retrieval-engine/lookup-discovered-topic-claims'
import { deriveApplicabilityReadinessGaps } from '@/lib/retrieval-engine/applicability-readiness'
import { deriveSelectorNeeds } from '@/lib/crc-engine/selector-questioning'
import { createInitialBoundaryState } from '@/lib/interview-engine/boundaries'
import type { ApplicabilityRequirement, DiscoveredTopicOccurrence, TopicClaim } from '@/lib/retrieval-engine/types'
import type { RetrievalHandoff, StructuredUnderstanding, ToolMention, UserGoal } from '@/types/interview-engine'

function facts(overrides: Partial<ApplicabilityFacts> = {}): ApplicabilityFacts {
  return { jurisdiction: { included: [], excluded: [] }, toolMentions: [], ...overrides }
}

function goal(overrides: Partial<UserGoal> & Pick<UserGoal, 'category'>): UserGoal {
  return { goal_id: 'g-1', state: 'confirmed', raw_text: 'x', scope: 'informational', superseded_by: null, source_turn: 1, source_statement: 'x', ...overrides }
}

function occurrence(overrides: Partial<DiscoveredTopicOccurrence> & Pick<DiscoveredTopicOccurrence, 'topic' | 'source_goal_category'>): DiscoveredTopicOccurrence {
  return { trigger_id: 'test-trigger', source_kind: 'asset_provider_mention', source_id: 'ap-1', ...overrides }
}

function claim(overrides: Partial<TopicClaim> & Pick<TopicClaim, 'claim_id' | 'topic'>): TopicClaim {
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
    tool_scope: null,
    last_verified: '2026-09-15',
    superseded_by: null,
    ...overrides,
  }
}

/** One synthetic leaf requirement + the ToolMention needed to drive it to the desired status -- same construction as evaluate-applicability-expression.test.ts's own `leaf` helper. */
function leaf(id: string, status: 'met' | 'not_met' | 'unresolved'): { requirement: ApplicabilityRequirement; mention: ToolMention | null } {
  const requirement: ApplicabilityRequirement = { fact: 'tool_account_status', tool: id, operator: 'equals', value: 'Member Account' }
  if (status === 'unresolved') return { requirement, mention: null }
  const mention: ToolMention = {
    mention_id: `m-${id}`,
    resolution: { kind: 'canonical', identifier: id },
    access_surface: { state: 'unknown' },
    plan_tier: { state: 'unknown' },
    account_status: { state: 'confirmed', value: status === 'met' ? 'Member Account' : 'Regular Account' },
    confidence: 'confirmed',
    source_turn: 1,
    source_statement: `${id} account status`,
    superseded_by: null,
  }
  return { requirement, mention }
}

function mergeFacts(...leaves: ReturnType<typeof leaf>[]): ApplicabilityFacts {
  return facts({ toolMentions: leaves.map((l) => l.mention).filter((m): m is ToolMention => m !== null) })
}

describe('Track A route invariance -- same expression, same aggregate, ordinary route vs discovered route', () => {
  test('1: A met OR B unresolved => aggregate MET on both routes -- Track A must not treat B as independently unresolved', () => {
    const A = leaf('a', 'met')
    const B = leaf('b', 'unresolved')
    const c = claim({ claim_id: 'C-1', topic: 'third_party_source_rights', applicability_any_of: [[A.requirement], [B.requirement]] })
    const f = mergeFacts(A, B)

    const ordinary = lookupTopicClaims([goal({ category: 'third_party_source_rights' })], [c], f)
    const discovered = lookupDiscoveredTopicClaims([occurrence({ topic: 'third_party_source_rights', source_goal_category: 'commercial_use' })], [c], f)

    expect(ordinary.matches).toEqual([c])
    expect(ordinary.diagnostics).toEqual([])
    expect(discovered.matches).toEqual([{ claim: c, sourceGoalCategory: 'commercial_use' }])
    expect(discovered.diagnostics).toEqual([])
  })

  test('2: A not_met OR B unresolved => aggregate UNRESOLVED on both routes -- Track A preserves its own existing unresolved diagnostic policy', () => {
    const A = leaf('a', 'not_met')
    const B = leaf('b', 'unresolved')
    const c = claim({ claim_id: 'C-1', topic: 'third_party_source_rights', applicability_any_of: [[A.requirement], [B.requirement]] })
    const f = mergeFacts(A, B)

    const ordinary = lookupTopicClaims([goal({ category: 'third_party_source_rights' })], [c], f)
    const discovered = lookupDiscoveredTopicClaims([occurrence({ topic: 'third_party_source_rights', source_goal_category: 'commercial_use' })], [c], f)

    expect(ordinary.matches).toEqual([])
    expect(ordinary.diagnostics).toEqual([{ identifier: 'third_party_source_rights', reason: 'applicability_unmet', unmet_applicability: [{ claim_id: 'C-1', requirement: B.requirement, status: 'unresolved' }] }])

    expect(discovered.matches).toEqual([])
    expect(discovered.diagnostics).toEqual([{ identifier: 'commercial_use', reason: 'applicability_unmet', unmet_applicability: [{ claim_id: 'C-1', requirement: B.requirement, status: 'unresolved' }] }])
  })

  test('3: A not_met OR B not_met => aggregate NOT_MET on both routes -- Track A preserves its own existing not_met diagnostic policy', () => {
    const A = leaf('a', 'not_met')
    const B = leaf('b', 'not_met')
    const c = claim({ claim_id: 'C-1', topic: 'third_party_source_rights', applicability_any_of: [[A.requirement], [B.requirement]] })
    const f = mergeFacts(A, B)

    const ordinary = lookupTopicClaims([goal({ category: 'third_party_source_rights' })], [c], f)
    const discovered = lookupDiscoveredTopicClaims([occurrence({ topic: 'third_party_source_rights', source_goal_category: 'commercial_use' })], [c], f)

    expect(ordinary.matches).toEqual([])
    // Diagnostic still fires (Case 3A presence), but nothing is material.
    expect(ordinary.diagnostics).toEqual([{ identifier: 'third_party_source_rights', reason: 'applicability_unmet', unmet_applicability: [] }])

    expect(discovered.matches).toEqual([])
    expect(discovered.diagnostics).toEqual([{ identifier: 'commercial_use', reason: 'applicability_unmet', unmet_applicability: [] }])
  })

  test('4: (A met AND B unresolved) OR C not_met => aggregate UNRESOLVED, only B material -- Track A does not recompute materiality itself, it consumes the evaluator\'s own answer', () => {
    const A = leaf('a', 'met')
    const B = leaf('b', 'unresolved')
    const C = leaf('c', 'not_met')
    const c = claim({ claim_id: 'C-1', topic: 'third_party_source_rights', applicability_any_of: [[A.requirement, B.requirement], [C.requirement]] })
    const f = mergeFacts(A, B, C)

    // Ground truth from the evaluator directly.
    const direct = evaluateApplicabilityExpression([], [[A.requirement, B.requirement], [C.requirement]], f)
    expect(direct.valid && direct.status).toBe('unresolved')
    expect(direct.valid && direct.material_unresolved).toEqual([{ requirement: B.requirement, status: 'unresolved' }])

    const ordinary = lookupTopicClaims([goal({ category: 'third_party_source_rights' })], [c], f)
    const discovered = lookupDiscoveredTopicClaims([occurrence({ topic: 'third_party_source_rights', source_goal_category: 'commercial_use' })], [c], f)

    expect(ordinary.diagnostics).toEqual([{ identifier: 'third_party_source_rights', reason: 'applicability_unmet', unmet_applicability: [{ claim_id: 'C-1', requirement: B.requirement, status: 'unresolved' }] }])
    expect(discovered.diagnostics).toEqual([{ identifier: 'commercial_use', reason: 'applicability_unmet', unmet_applicability: [{ claim_id: 'C-1', requirement: B.requirement, status: 'unresolved' }] }])
  })

  test('5: (A not_met AND B unresolved) OR C not_met => aggregate NOT_MET, B not material, on both routes', () => {
    const A = leaf('a', 'not_met')
    const B = leaf('b', 'unresolved')
    const C = leaf('c', 'not_met')
    const c = claim({ claim_id: 'C-1', topic: 'third_party_source_rights', applicability_any_of: [[A.requirement, B.requirement], [C.requirement]] })
    const f = mergeFacts(A, B, C)

    const ordinary = lookupTopicClaims([goal({ category: 'third_party_source_rights' })], [c], f)
    const discovered = lookupDiscoveredTopicClaims([occurrence({ topic: 'third_party_source_rights', source_goal_category: 'commercial_use' })], [c], f)

    expect(ordinary.diagnostics).toEqual([{ identifier: 'third_party_source_rights', reason: 'applicability_unmet', unmet_applicability: [] }])
    expect(discovered.diagnostics).toEqual([{ identifier: 'commercial_use', reason: 'applicability_unmet', unmet_applicability: [] }])
  })

  test('6: applicability_any_of absent => Track A behavior byte-identical to pre-milestone (single mandatory requirement, unresolved)', () => {
    const c = claim({
      claim_id: 'C-1',
      topic: 'third_party_source_rights',
      applicability_requirements: [{ fact: 'jurisdiction', operator: 'equals', value: 'United States' }],
    })
    const result = lookupDiscoveredTopicClaims([occurrence({ topic: 'third_party_source_rights', source_goal_category: 'commercial_use' })], [c], facts())
    expect(result.matches).toEqual([])
    expect(result.diagnostics).toEqual([
      { identifier: 'commercial_use', reason: 'applicability_unmet', unmet_applicability: [{ claim_id: 'C-1', requirement: { fact: 'jurisdiction', operator: 'equals', value: 'United States' }, status: 'unresolved' }] },
    ])
  })
})

describe('Track A route invariance -- invalid governance (Phase 6)', () => {
  const INVALID_ANY_OF: ApplicabilityRequirement[][] = []

  test('a discovered claim with invalid applicability_any_of is excluded and reported under applicability_invalid_governance, never applicability_unmet', () => {
    const c = claim({ claim_id: 'C-1', topic: 'third_party_source_rights', applicability_any_of: INVALID_ANY_OF })
    const result = lookupDiscoveredTopicClaims([occurrence({ topic: 'third_party_source_rights', source_goal_category: 'commercial_use' })], [c], facts())
    expect(result.matches).toEqual([])
    expect(result.diagnostics).toEqual([{ identifier: 'commercial_use', reason: 'applicability_invalid_governance' }])
  })

  test('never carries unmet_applicability, never treated as ordinary project unresolved', () => {
    const c = claim({ claim_id: 'C-1', topic: 'third_party_source_rights', applicability_any_of: INVALID_ANY_OF })
    const result = lookupDiscoveredTopicClaims([occurrence({ topic: 'third_party_source_rights', source_goal_category: 'commercial_use' })], [c], facts())
    expect(result.diagnostics[0].unmet_applicability).toBeUndefined()
  })

  test('cannot become applicable through Track A -- never appears in matches regardless of facts', () => {
    const c = claim({ claim_id: 'C-1', topic: 'third_party_source_rights', applicability_any_of: INVALID_ANY_OF })
    const result = lookupDiscoveredTopicClaims(
      [occurrence({ topic: 'third_party_source_rights', source_goal_category: 'commercial_use' })],
      [c],
      facts({ jurisdiction: { included: ['United States'], excluded: [] } }),
    )
    expect(result.matches).toEqual([])
  })

  test('HARD TEST: creates no Track B need via the real, non-mocked deriveApplicabilityReadinessGaps + deriveSelectorNeeds composition (discovered-topic route)', () => {
    const c = claim({ claim_id: 'C-1', topic: 'third_party_source_rights', applicability_any_of: INVALID_ANY_OF })
    const handoff: RetrievalHandoff = {
      tools: [],
      unresolved_aliases: [],
      asset_providers: [],
      unresolved_asset_provider_mentions: [],
      workflow_role: 'unresolved',
      intended_use: 'unclear',
      scoped_observations: [],
      certainty_state: 'gate_1_unmet',
      exclusions: [],
    }
    // deriveApplicabilityReadinessGaps only ever considers EXPLICIT-goal
    // relevance (by design, unchanged by this milestone) -- so the Track-B
    // HARD TEST here is exercised the same way the prior milestone already
    // proved it end to end for the ordinary route; this test additionally
    // confirms an invalid discovered-topic claim is symmetric: it never
    // reaches matches[] via lookupDiscoveredTopicClaims (proven above),
    // and lookupDiscoveredTopicClaims's own diagnostics never feed Track B
    // at all (deriveApplicabilityReadinessGaps composes lookupTopicClaims/
    // lookupRows directly, never lookupDiscoveredTopicClaims) -- so an
    // invalid discovered-topic claim structurally cannot reach
    // deriveSelectorNeeds by any path.
    const gaps = deriveApplicabilityReadinessGaps(handoff, [], [goal({ category: 'third_party_source_rights' })], [c], facts())
    expect(gaps).toEqual([])
    const needs = deriveSelectorNeeds(
      {
        project_facts: {
          intended_use: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
          workflow_role: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
          jurisdiction: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
          human_contribution_description: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
        },
        tool_mentions: [],
        scoped_observations: [],
        user_goals: [goal({ category: 'third_party_source_rights' })],
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
      } satisfies StructuredUnderstanding,
      [],
      [c],
      createInitialBoundaryState(),
    )
    expect(needs).toEqual([])
  })
})
