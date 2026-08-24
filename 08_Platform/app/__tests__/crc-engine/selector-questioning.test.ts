/**
 * CRC Narrow Governed Selector Questioning milestone (2026-08-24). Tests
 * deriveSelectorNeeds/buildSelectorNeedProposal in isolation, via a mocked
 * selector-askability.ts registry -- same jest.mock() precedent
 * knowledge-readiness.test.ts already established for the sibling
 * dependency-askability.ts registry. The production registry itself ships
 * empty (see selector-askability.ts's own module); every positive-path
 * scenario here uses a synthetic, test-mocked askability entry, never a
 * real one.
 */

import { deriveSelectorNeeds, buildSelectorNeedProposal } from '@/lib/crc-engine/selector-questioning'
import { createInitialBoundaryState, type BoundaryState } from '@/lib/interview-engine/boundaries'
import type { StructuredUnderstanding, ToolMention, UserGoal } from '@/types/interview-engine'
import type { MatrixRow, TopicClaim } from '@/lib/retrieval-engine/types'
import { getSelectorAskabilityEntry } from '@/lib/crc-engine/selector-askability'

jest.mock('@/lib/crc-engine/selector-askability', () => ({
  getSelectorAskabilityEntry: jest.fn(),
}))

const mockedGetSelectorAskabilityEntry = getSelectorAskabilityEntry as jest.Mock

/** No Matrix rows -- every existing test in this file exercises TopicClaim-origin readiness only; Matrix-origin coverage lives in its own describe block below. */
const NO_MATRIX: MatrixRow[] = []

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
    current_phase: 2,
    gate_1_state: 'not_met',
    gate_2_state: 'not_yet_stable',
    completion_reason: null,
    opt_out_scope: null,
    ...overrides,
  }
}

function goal(overrides: Partial<UserGoal> & Pick<UserGoal, 'category'>): UserGoal {
  return {
    goal_id: 'g-1',
    state: 'confirmed',
    raw_text: 'x',
    scope: 'informational',
    superseded_by: null,
    source_turn: 1,
    source_statement: 'x',
    ...overrides,
  }
}

function toolMention(overrides: Partial<ToolMention> & Pick<ToolMention, 'mention_id' | 'resolution'>): ToolMention {
  return {
    access_surface: { state: 'unknown' },
    plan_tier: { state: 'unknown' },
    account_status: { state: 'unknown' },
    confidence: 'confirmed',
    source_turn: 1,
    source_statement: 'x',
    superseded_by: null,
    ...overrides,
  }
}

function planClaim(overrides: Partial<TopicClaim> & Pick<TopicClaim, 'claim_id'>): TopicClaim {
  return {
    topic: 'commercial_use',
    claim_character: 'conditional',
    jurisdiction: 'Global',
    lifecycle: 'Adopted',
    crc_eligible: 'Yes',
    crc_publication_scope: 'Test scope.',
    crc_candidate_statement: 'Test statement.',
    applicability_requirements: [{ fact: 'tool_plan_tier', tool: 'kling', operator: 'equals', value: 'paid' }],
    unresolved_project_dependencies: [],
    provider_scope: null,
    last_verified: null,
    superseded_by: null,
    ...overrides,
  }
}

beforeEach(() => {
  mockedGetSelectorAskabilityEntry.mockReset()
})

describe('deriveSelectorNeeds -- eligibility', () => {
  test('1: explicit confirmed goal + unresolved + registered-askable selector -> a need is derived', () => {
    mockedGetSelectorAskabilityEntry.mockImplementation((fact: string) => (fact === 'tool_plan_tier' ? { treatment: 'askable_in_crc', question_text: 'Which plan for {tool}?' } : undefined))
    const su = emptySU({ user_goals: [goal({ goal_id: 'g-1', category: 'commercial_use' })] })
    const needs = deriveSelectorNeeds(su, NO_MATRIX, [planClaim({ claim_id: 'C-1' })], createInitialBoundaryState())
    expect(needs).toHaveLength(1)
    expect(needs[0]).toMatchObject({ fact: 'tool_plan_tier', tool: 'kling', originating_goal_category: 'commercial_use', dedupe_key: 'tool_plan_tier::kling', unmet_claim_ids: ['C-1'] })
  })

  test('2: registry missing an entry for the fact -> no need', () => {
    mockedGetSelectorAskabilityEntry.mockImplementation(() => undefined)
    const su = emptySU({ user_goals: [goal({ goal_id: 'g-1', category: 'commercial_use' })] })
    const needs = deriveSelectorNeeds(su, NO_MATRIX, [planClaim({ claim_id: 'C-1' })], createInitialBoundaryState())
    expect(needs).toEqual([])
  })

  test('3a: registry explicitly not_askable -> no need', () => {
    mockedGetSelectorAskabilityEntry.mockImplementation((fact: string) => (fact === 'tool_plan_tier' ? { treatment: 'not_askable' } : undefined))
    const su = emptySU({ user_goals: [goal({ goal_id: 'g-1', category: 'commercial_use' })] })
    const needs = deriveSelectorNeeds(su, NO_MATRIX, [planClaim({ claim_id: 'C-1' })], createInitialBoundaryState())
    expect(needs).toEqual([])
  })

  test('3b: registry explicitly evidence_only -> no need (fail-closed, same as not_askable)', () => {
    mockedGetSelectorAskabilityEntry.mockImplementation((fact: string) => (fact === 'tool_plan_tier' ? { treatment: 'evidence_only' } : undefined))
    const su = emptySU({ user_goals: [goal({ goal_id: 'g-1', category: 'commercial_use' })] })
    const needs = deriveSelectorNeeds(su, NO_MATRIX, [planClaim({ claim_id: 'C-1' })], createInitialBoundaryState())
    expect(needs).toEqual([])
  })

  test('4: a known not_met sibling requirement on the same claim suppresses the unresolved one -- resolving it could not make this claim applicable', () => {
    mockedGetSelectorAskabilityEntry.mockImplementation((fact: string) => (fact === 'tool_plan_tier' ? { treatment: 'askable_in_crc', question_text: 'Which plan for {tool}?' } : undefined))
    const compoundClaim = planClaim({
      claim_id: 'C-1',
      applicability_requirements: [
        { fact: 'jurisdiction', operator: 'equals', value: 'United States' },
        { fact: 'tool_plan_tier', tool: 'kling', operator: 'equals', value: 'paid' },
      ],
    })
    // jurisdiction confirmed to a DIFFERENT value -> known not_met.
    const su = emptySU({
      user_goals: [goal({ goal_id: 'g-1', category: 'commercial_use' })],
      project_facts: {
        intended_use: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
        workflow_role: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
        jurisdiction: { attestation: { state: 'confirmed', value: 'Taiwan' }, source_turn: 1, source_statement: 'x' },
        human_contribution_description: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
      },
    })
    const needs = deriveSelectorNeeds(su, NO_MATRIX, [compoundClaim], createInitialBoundaryState())
    expect(needs).toEqual([])
  })

  test('5: two unresolved requirements on the same claim (two different tool-scoped facts) -> both produce needs, in requirement-array order', () => {
    // Uses two tool_plan_tier requirements for two different tools rather
    // than jurisdiction + tool_plan_tier, since jurisdiction is always
    // excluded by this module's own HANDLED_BY_DEDICATED_MODULE guard
    // regardless of registry content (see test 8 below) -- this test is
    // about multi-requirement ordering, not jurisdiction's own exclusion.
    mockedGetSelectorAskabilityEntry.mockImplementation((fact: string) => (fact === 'tool_plan_tier' ? { treatment: 'askable_in_crc', question_text: 'x' } : undefined))
    const compoundClaim = planClaim({
      claim_id: 'C-1',
      applicability_requirements: [
        { fact: 'tool_plan_tier', tool: 'kling', operator: 'equals', value: 'paid' },
        { fact: 'tool_plan_tier', tool: 'runway-gen3', operator: 'equals', value: 'paid' },
      ],
    })
    const su = emptySU({ user_goals: [goal({ goal_id: 'g-1', category: 'commercial_use' })] })
    const needs = deriveSelectorNeeds(su, NO_MATRIX, [compoundClaim], createInitialBoundaryState())
    expect(needs.map((n) => n.dedupe_key)).toEqual(['tool_plan_tier::kling', 'tool_plan_tier::runway-gen3'])
  })

  test('6: two claims, one blocked only by the selector and one blocked by a known-false sibling -- the selector need still exists (aggregation, not global suppression)', () => {
    mockedGetSelectorAskabilityEntry.mockImplementation((fact: string) => (fact === 'tool_plan_tier' ? { treatment: 'askable_in_crc', question_text: 'x' } : undefined))
    const claimA = planClaim({ claim_id: 'CLAIM-A', applicability_requirements: [{ fact: 'tool_plan_tier', tool: 'kling', operator: 'equals', value: 'paid' }] })
    const claimB = planClaim({
      claim_id: 'CLAIM-B',
      applicability_requirements: [
        { fact: 'jurisdiction', operator: 'equals', value: 'United States' },
        { fact: 'tool_plan_tier', tool: 'kling', operator: 'equals', value: 'paid' },
      ],
    })
    const su = emptySU({
      user_goals: [goal({ goal_id: 'g-1', category: 'commercial_use' })],
      project_facts: {
        intended_use: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
        workflow_role: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
        jurisdiction: { attestation: { state: 'confirmed', value: 'Taiwan' }, source_turn: 1, source_statement: 'x' },
        human_contribution_description: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
      },
    })
    const needs = deriveSelectorNeeds(su, NO_MATRIX, [claimA, claimB], createInitialBoundaryState())
    expect(needs).toHaveLength(1)
    expect(needs[0].dedupe_key).toBe('tool_plan_tier::kling')
    // Aggregated: only CLAIM-A contributes (CLAIM-B's own not_met jurisdiction suppresses its own contribution).
    expect(needs[0].unmet_claim_ids).toEqual(['CLAIM-A'])
  })

  test('7: discovered-only relevance (no explicit goal shares the category) -> no need, even with an otherwise-eligible claim', () => {
    mockedGetSelectorAskabilityEntry.mockImplementation((fact: string) => (fact === 'tool_plan_tier' ? { treatment: 'askable_in_crc', question_text: 'x' } : undefined))
    // No user_goals at all -- the claim's own topic is never reached by lookupTopicClaims without an explicit goal.
    const su = emptySU({ user_goals: [] })
    const needs = deriveSelectorNeeds(su, NO_MATRIX, [planClaim({ claim_id: 'C-1' })], createInitialBoundaryState())
    expect(needs).toEqual([])
  })

  test('8: jurisdiction is explicitly excluded from this mechanism, even if hypothetically registered askable here -- it remains owned entirely by jurisdiction-clarification.ts', () => {
    mockedGetSelectorAskabilityEntry.mockImplementation((fact: string) => (fact === 'jurisdiction' ? { treatment: 'askable_in_crc', question_text: 'x' } : undefined))
    const jurisdictionOnlyClaim = planClaim({ claim_id: 'C-1', applicability_requirements: [{ fact: 'jurisdiction', operator: 'equals', value: 'United States' }] })
    const su = emptySU({ user_goals: [goal({ goal_id: 'g-1', category: 'commercial_use' })] })
    const needs = deriveSelectorNeeds(su, NO_MATRIX, [jurisdictionOnlyClaim], createInitialBoundaryState())
    expect(needs).toEqual([])
  })

  test('9: two tools both needing tool_plan_tier -> two distinct scoped needs, independent dedupe_keys', () => {
    mockedGetSelectorAskabilityEntry.mockImplementation((fact: string) => (fact === 'tool_plan_tier' ? { treatment: 'askable_in_crc', question_text: 'x' } : undefined))
    const klingClaim = planClaim({ claim_id: 'CLAIM-KLING', applicability_requirements: [{ fact: 'tool_plan_tier', tool: 'kling', operator: 'equals', value: 'paid' }] })
    const runwayClaim = planClaim({
      claim_id: 'CLAIM-RUNWAY',
      topic: 'commercial_use',
      applicability_requirements: [{ fact: 'tool_plan_tier', tool: 'runway-gen3', operator: 'equals', value: 'paid' }],
    })
    const su = emptySU({ user_goals: [goal({ goal_id: 'g-1', category: 'commercial_use' })] })
    const needs = deriveSelectorNeeds(su, NO_MATRIX, [klingClaim, runwayClaim], createInitialBoundaryState())
    expect(needs.map((n) => n.dedupe_key).sort()).toEqual(['tool_plan_tier::kling', 'tool_plan_tier::runway-gen3'])
  })

  test('a dedupe_key already consumed in BoundaryState is not re-derived', () => {
    mockedGetSelectorAskabilityEntry.mockImplementation((fact: string) => (fact === 'tool_plan_tier' ? { treatment: 'askable_in_crc', question_text: 'x' } : undefined))
    const su = emptySU({ user_goals: [goal({ goal_id: 'g-1', category: 'commercial_use' })] })
    const usedBoundary: BoundaryState = { ...createInitialBoundaryState(), selector_needs_used: { 'tool_plan_tier::kling': 1 } }
    const needs = deriveSelectorNeeds(su, NO_MATRIX, [planClaim({ claim_id: 'C-1' })], usedBoundary)
    expect(needs).toEqual([])
  })

  test('correction survives: a stable canonical tool identifier is used for the dedupe_key, never a transient mention_id -- two ToolMention objects for the same canonical tool (before/after a correction) produce the identical dedupe_key', () => {
    mockedGetSelectorAskabilityEntry.mockImplementation((fact: string) => (fact === 'tool_plan_tier' ? { treatment: 'askable_in_crc', question_text: 'x' } : undefined))
    const su1 = emptySU({
      user_goals: [goal({ goal_id: 'g-1', category: 'commercial_use' })],
      tool_mentions: [toolMention({ mention_id: 'm1', resolution: { kind: 'canonical', identifier: 'kling' } })],
    })
    const needs1 = deriveSelectorNeeds(su1, NO_MATRIX, [planClaim({ claim_id: 'C-1' })], createInitialBoundaryState())
    // Correction: m1 superseded by m2, still canonically 'kling'.
    const su2 = emptySU({
      user_goals: [goal({ goal_id: 'g-1', category: 'commercial_use' })],
      tool_mentions: [
        toolMention({ mention_id: 'm1', resolution: { kind: 'canonical', identifier: 'kling' }, superseded_by: 'm2' }),
        toolMention({ mention_id: 'm2', resolution: { kind: 'canonical', identifier: 'kling' } }),
      ],
    })
    const needs2 = deriveSelectorNeeds(su2, NO_MATRIX, [planClaim({ claim_id: 'C-1' })], createInitialBoundaryState())
    expect(needs1[0].dedupe_key).toBe(needs2[0].dedupe_key)
    expect(needs1[0].dedupe_key).toBe('tool_plan_tier::kling')
  })
})

describe('deriveSelectorNeeds -- Matrix-origin genericity (CRC Generic Applicability Readiness correction, 2026-08-24)', () => {
  function matrixRow(overrides: Partial<MatrixRow> & Pick<MatrixRow, 'identifier'>): MatrixRow {
    return { last_verified: '2026-08-24', claims: [], ...overrides }
  }

  test('10: a Matrix-origin unresolved askable selector produces a SelectorNeed via the SAME consumer logic as a TopicClaim-origin one -- no source-specific branching', () => {
    mockedGetSelectorAskabilityEntry.mockImplementation((fact: string) => (fact === 'tool_plan_tier' ? { treatment: 'askable_in_crc', question_text: 'Which plan for {tool}?' } : undefined))
    const row = matrixRow({
      identifier: 'kling',
      claims: [
        {
          claim_id: 'kling',
          crc_eligible: 'Yes',
          crc_publication_scope: 'scope',
          crc_candidate_statement: 'statement',
          topic: 'commercial_use',
          applicability_requirements: [{ fact: 'tool_plan_tier', tool: 'kling', operator: 'equals', value: 'paid' }],
        },
      ],
    })
    const su = emptySU({
      user_goals: [goal({ goal_id: 'g-1', category: 'commercial_use' })],
      tool_mentions: [toolMention({ mention_id: 'm1', resolution: { kind: 'canonical', identifier: 'kling' } })],
    })
    const needs = deriveSelectorNeeds(su, [row], [], createInitialBoundaryState())
    expect(needs).toHaveLength(1)
    expect(needs[0]).toMatchObject({ fact: 'tool_plan_tier', tool: 'kling', originating_goal_category: 'commercial_use', dedupe_key: 'tool_plan_tier::kling', unmet_claim_ids: ['kling'] })
  })

  test('11: a Matrix-origin claim whose topic is NOT relevant to any explicit goal produces no need (explicit-goal-only policy applies identically to Matrix origin)', () => {
    mockedGetSelectorAskabilityEntry.mockImplementation((fact: string) => (fact === 'tool_plan_tier' ? { treatment: 'askable_in_crc', question_text: 'x' } : undefined))
    const row = matrixRow({
      identifier: 'kling',
      claims: [
        {
          claim_id: 'kling',
          crc_eligible: 'Yes',
          crc_publication_scope: 'scope',
          crc_candidate_statement: 'statement',
          topic: 'commercial_use',
          applicability_requirements: [{ fact: 'tool_plan_tier', tool: 'kling', operator: 'equals', value: 'paid' }],
        },
      ],
    })
    const su = emptySU({ user_goals: [], tool_mentions: [toolMention({ mention_id: 'm1', resolution: { kind: 'canonical', identifier: 'kling' } })] })
    const needs = deriveSelectorNeeds(su, [row], [], createInitialBoundaryState())
    expect(needs).toEqual([])
  })

  test('12: a Matrix-origin gap and a Topic-origin gap aggregate together in one deriveSelectorNeeds call, both reachable through identical code', () => {
    mockedGetSelectorAskabilityEntry.mockImplementation((fact: string) => (fact === 'tool_plan_tier' ? { treatment: 'askable_in_crc', question_text: 'x' } : undefined))
    const row = matrixRow({
      identifier: 'kling',
      claims: [
        {
          claim_id: 'kling',
          crc_eligible: 'Yes',
          crc_publication_scope: 'scope',
          crc_candidate_statement: 'statement',
          topic: 'commercial_use',
          applicability_requirements: [{ fact: 'tool_plan_tier', tool: 'kling', operator: 'equals', value: 'paid' }],
        },
      ],
    })
    const su = emptySU({
      user_goals: [goal({ goal_id: 'g-1', category: 'commercial_use' })],
      tool_mentions: [toolMention({ mention_id: 'm1', resolution: { kind: 'canonical', identifier: 'kling' } })],
    })
    const needs = deriveSelectorNeeds(su, [row], [planClaim({ claim_id: 'C-1' })], createInitialBoundaryState())
    expect(needs.map((n) => n.dedupe_key).sort()).toEqual(['tool_plan_tier::kling'])
    // Both the Matrix claim ('kling') and the TopicClaim ('C-1') contribute to the SAME dedupe_key, since both gate on the same (fact, tool).
    expect(needs[0].unmet_claim_ids.sort()).toEqual(['C-1', 'kling'])
  })
})

describe('buildSelectorNeedProposal', () => {
  test('constructs the same downstream proposal shape as other deterministic clarification modules, with {tool} substituted for the canonical tool identifier', () => {
    mockedGetSelectorAskabilityEntry.mockImplementation((fact: string) => (fact === 'tool_plan_tier' ? { treatment: 'askable_in_crc', question_text: 'Which plan or account tier were you using for {tool}?' } : undefined))
    const su = emptySU({ user_goals: [goal({ goal_id: 'g-1', category: 'commercial_use' })] })
    const needs = deriveSelectorNeeds(su, NO_MATRIX, [planClaim({ claim_id: 'C-1' })], createInitialBoundaryState())
    const proposal = buildSelectorNeedProposal(needs[0], 3)
    expect(proposal).toEqual({
      question_text: 'Which plan or account tier were you using for kling?',
      question_kind: 'governed_selector_clarification',
      target_signal_id: null,
      phase: 3,
      target_selector_dedupe_key: 'tool_plan_tier::kling',
    })
  })

  test('an unscoped need (no tool) leaves the template unsubstituted', () => {
    const need = { fact: 'jurisdiction' as const, tool: null, originating_goal_category: 'commercial_use' as const, unmet_claim_ids: ['C-1'], dedupe_key: 'jurisdiction' }
    mockedGetSelectorAskabilityEntry.mockImplementation(() => ({ treatment: 'askable_in_crc', question_text: 'Fixed question, no placeholder.' }))
    const proposal = buildSelectorNeedProposal(need, 3)
    expect(proposal.question_text).toBe('Fixed question, no placeholder.')
  })
})
