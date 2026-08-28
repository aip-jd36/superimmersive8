/**
 * Activate tool_account_status Selector milestone (2026-08-24).
 *
 * Deliberately unmocked -- uses the REAL selector-askability.ts registry
 * (unlike selector-questioning.test.ts, which mocks it to test
 * deriveSelectorNeeds's mechanics generically against a synthetic
 * `tool_plan_tier` entry). This file proves the actual production
 * behavior for `tool_account_status` specifically, including against the
 * real Kling Living Knowledge fixture (MATRIX_FIXTURE) -- the real
 * governed consumer this capability exists for.
 *
 * Run: npx jest __tests__/crc-engine/tool-account-status-selector.test.ts
 */

import { deriveSelectorNeeds, buildSelectorNeedProposal } from '@/lib/crc-engine/selector-questioning'
import { getSelectorAskabilityEntry, isSelectorAskable } from '@/lib/crc-engine/selector-askability'
import { createInitialBoundaryState, type BoundaryState } from '@/lib/interview-engine/boundaries'
import { MATRIX_FIXTURE } from '@/lib/retrieval-engine/matrix-fixture'
import { APPLICABILITY_FACTS } from '@/lib/retrieval-engine/types'
import type { MatrixRow, TopicClaim } from '@/lib/retrieval-engine/types'
import type { StructuredUnderstanding, ToolMention, UserGoal, Attested } from '@/types/interview-engine'

const NO_TOPIC_CLAIMS: TopicClaim[] = []

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
    current_phase: 2,
    gate_1_state: 'not_met',
    gate_2_state: 'not_yet_stable',
    completion_reason: null,
    opt_out_scope: null,
    ...overrides,
  }
}

function commercialUseGoal(overrides: Partial<UserGoal> = {}): UserGoal {
  return {
    goal_id: 'g-1',
    category: 'commercial_use',
    state: 'confirmed',
    raw_text: 'Can I use this commercially?',
    scope: 'informational',
    superseded_by: null,
    source_turn: 1,
    source_statement: 'Can I use this commercially?',
    ...overrides,
  }
}

function klingMention(overrides: Partial<ToolMention> = {}): ToolMention {
  return {
    mention_id: 'm1',
    resolution: { kind: 'canonical', identifier: 'kling' },
    access_surface: { state: 'unknown' },
    plan_tier: { state: 'unknown' },
    account_status: { state: 'unknown' },
    confidence: 'confirmed',
    source_turn: 1,
    source_statement: 'I used Kling.',
    superseded_by: null,
    ...overrides,
  }
}

function runwayMention(overrides: Partial<ToolMention> = {}): ToolMention {
  return {
    mention_id: 'm2',
    resolution: { kind: 'canonical', identifier: 'runway-gen3' },
    access_surface: { state: 'unknown' },
    plan_tier: { state: 'unknown' },
    account_status: { state: 'unknown' },
    confidence: 'confirmed',
    source_turn: 1,
    source_statement: 'I also used Runway.',
    superseded_by: null,
    ...overrides,
  }
}

describe('A: tool_account_status registry entry exists and is askable', () => {
  test('registered as askable_in_crc with a {tool}-substitutable question_text', () => {
    expect(isSelectorAskable('tool_account_status')).toBe(true)
    const entry = getSelectorAskabilityEntry('tool_account_status')
    expect(entry?.treatment).toBe('askable_in_crc')
    expect(entry?.question_text).toContain('{tool}')
  })
})

describe('B: unknown Kling account status + explicit commercial-use goal -> selector proposal generated', () => {
  test('real Kling fixture, real registry: a governed need is produced for tool_account_status::kling', () => {
    const su = emptySU({ user_goals: [commercialUseGoal()], tool_mentions: [klingMention()] })
    const needs = deriveSelectorNeeds(su, MATRIX_FIXTURE, NO_TOPIC_CLAIMS, createInitialBoundaryState())
    expect(needs).toHaveLength(1)
    expect(needs[0]).toMatchObject({
      fact: 'tool_account_status',
      tool: 'kling',
      originating_goal_category: 'commercial_use',
      dedupe_key: 'tool_account_status::kling',
      unmet_claim_ids: ['kling-commercial-use-member'],
    })

    const proposal = buildSelectorNeedProposal(needs[0], 2)
    expect(proposal.question_kind).toBe('governed_selector_clarification')
    expect(proposal.target_selector_dedupe_key).toBe('tool_account_status::kling')
    expect(proposal.question_text.toLowerCase()).toContain('kling')
  })
})

describe('C: generic tool substitution -- no hardcoded Kling branch', () => {
  test('the SAME real registry entry substitutes any tool identifier, not just kling', () => {
    const klingNeed = { fact: 'tool_account_status' as const, tool: 'kling', originating_goal_category: 'commercial_use' as const, unmet_claim_ids: ['x'], dedupe_key: 'tool_account_status::kling' }
    const runwayNeed = { ...klingNeed, tool: 'runway-gen3', dedupe_key: 'tool_account_status::runway-gen3' }

    const klingProposal = buildSelectorNeedProposal(klingNeed, 2)
    const runwayProposal = buildSelectorNeedProposal(runwayNeed, 2)

    expect(klingProposal.question_text).toBe('Do you know what kind of kling account or membership you currently have?')
    expect(runwayProposal.question_text).toBe('Do you know what kind of runway-gen3 account or membership you currently have?')
    // Proves substitution is a mechanical string replace, not a lookup keyed on 'kling' specifically.
    expect(klingProposal.question_text).not.toContain('runway')
    expect(runwayProposal.question_text).not.toContain('kling')
  })
})

describe('D/E: already-known status -> no selector question', () => {
  test('D: confirmed Member Account -> Member claim already resolves; no need produced', () => {
    const confirmedMember: Attested<string> = { state: 'confirmed', value: 'Member Account' }
    const su = emptySU({
      user_goals: [commercialUseGoal()],
      tool_mentions: [klingMention({ account_status: confirmedMember })],
    })
    const needs = deriveSelectorNeeds(su, MATRIX_FIXTURE, NO_TOPIC_CLAIMS, createInitialBoundaryState())
    expect(needs).toHaveLength(0)
  })

  test('E: confirmed Regular Account -> Member claim resolves not_met; baseline is unconditional; no need produced', () => {
    const confirmedRegular: Attested<string> = { state: 'confirmed', value: 'Regular Account' }
    const su = emptySU({
      user_goals: [commercialUseGoal()],
      tool_mentions: [klingMention({ account_status: confirmedRegular })],
    })
    const needs = deriveSelectorNeeds(su, MATRIX_FIXTURE, NO_TOPIC_CLAIMS, createInitialBoundaryState())
    expect(needs).toHaveLength(0)
  })
})

describe('F/G: ambiguous or don\'t-know answer -> unknown remains, cap prevents re-ask', () => {
  test('F: after the dedupe key is marked used (ambiguous answer never resolved it), no need is produced on the next turn', () => {
    const su = emptySU({ user_goals: [commercialUseGoal()], tool_mentions: [klingMention()] })

    const firstNeeds = deriveSelectorNeeds(su, MATRIX_FIXTURE, NO_TOPIC_CLAIMS, createInitialBoundaryState())
    expect(firstNeeds).toHaveLength(1)

    // Simulates boundaries.ts's own cap-consumption (verified separately in
    // boundaries.test.ts) -- account_status is still unknown (an ambiguous
    // answer like "I have Kling Pro." never resolved it), but the cap is
    // now consumed for this dedupe key.
    const usedBoundary: BoundaryState = { ...createInitialBoundaryState(), selector_needs_used: { 'tool_account_status::kling': 1 } }
    const secondNeeds = deriveSelectorNeeds(su, MATRIX_FIXTURE, NO_TOPIC_CLAIMS, usedBoundary)
    expect(secondNeeds).toHaveLength(0)
  })

  test('G: don\'t know / skip -- same mechanism, no re-ask once the cap is consumed', () => {
    const su = emptySU({ user_goals: [commercialUseGoal()], tool_mentions: [klingMention()] })
    const usedBoundary: BoundaryState = { ...createInitialBoundaryState(), selector_needs_used: { 'tool_account_status::kling': 1 } }
    const needs = deriveSelectorNeeds(su, MATRIX_FIXTURE, NO_TOPIC_CLAIMS, usedBoundary)
    expect(needs).toHaveLength(0)
    // Interview is not blocked -- account_status remains genuinely unknown, not an error state.
    expect(su.tool_mentions[0].account_status).toEqual({ state: 'unknown' })
  })
})

describe('H: explicit-goal-only preserved -- discovered-only relevance does not ask', () => {
  test('no confirmed UserGoal at all -> no need, even with Kling unknown and Living Knowledge coverage present', () => {
    const su = emptySU({ user_goals: [], tool_mentions: [klingMention()] })
    const needs = deriveSelectorNeeds(su, MATRIX_FIXTURE, NO_TOPIC_CLAIMS, createInitialBoundaryState())
    expect(needs).toHaveLength(0)
  })

  test('a non-confirmed (e.g. superseded) goal does not trigger the question either', () => {
    const su = emptySU({
      user_goals: [commercialUseGoal({ state: 'superseded' as UserGoal['state'], superseded_by: 'g-2' })],
      tool_mentions: [klingMention()],
    })
    const needs = deriveSelectorNeeds(su, MATRIX_FIXTURE, NO_TOPIC_CLAIMS, createInitialBoundaryState())
    expect(needs).toHaveLength(0)
  })
})

describe('I: multiple-tool dedupe keys remain independent for tool_account_status specifically', () => {
  test('two tools each gated on tool_account_status produce two distinct, independent needs -- no cross-tool cap or leakage', () => {
    const syntheticMatrix: MatrixRow[] = [
      {
        identifier: 'kling',
        last_verified: '2026-08-24',
        claims: [
          {
            claim_id: 'kling-commercial-use-member',
            crc_eligible: 'Yes',
            crc_publication_scope: 'x',
            crc_candidate_statement: 'x',
            topic: 'commercial_use',
            applicability_requirements: [{ fact: 'tool_account_status', tool: 'kling', operator: 'equals', value: 'Member Account' }],
          },
        ],
      },
      {
        identifier: 'runway-gen3',
        last_verified: '2026-08-24',
        claims: [
          {
            claim_id: 'runway-commercial-use-member',
            crc_eligible: 'Yes',
            crc_publication_scope: 'x',
            crc_candidate_statement: 'x',
            topic: 'commercial_use',
            applicability_requirements: [{ fact: 'tool_account_status', tool: 'runway-gen3', operator: 'equals', value: 'Member Account' }],
          },
        ],
      },
    ]
    const su = emptySU({ user_goals: [commercialUseGoal()], tool_mentions: [klingMention(), runwayMention()] })
    const needs = deriveSelectorNeeds(su, syntheticMatrix, NO_TOPIC_CLAIMS, createInitialBoundaryState())
    expect(needs.map((n) => n.dedupe_key).sort()).toEqual(['tool_account_status::kling', 'tool_account_status::runway-gen3'])

    // Consuming ONE tool's cap must not suppress the other.
    const oneUsedBoundary: BoundaryState = { ...createInitialBoundaryState(), selector_needs_used: { 'tool_account_status::kling': 1 } }
    const remaining = deriveSelectorNeeds(su, syntheticMatrix, NO_TOPIC_CLAIMS, oneUsedBoundary)
    expect(remaining.map((n) => n.dedupe_key)).toEqual(['tool_account_status::runway-gen3'])
  })
})

describe('J: tool_plan_tier remains non-askable', () => {
  test('the real registry does not authorize tool_plan_tier', () => {
    expect(isSelectorAskable('tool_plan_tier')).toBe(false)
    expect(getSelectorAskabilityEntry('tool_plan_tier')).toBeUndefined()
  })
})

describe('K: the registry does not expose evidence-only/unregistered facts', () => {
  test('of all three known ApplicabilityFact values, only tool_account_status is askable', () => {
    const askable = APPLICABILITY_FACTS.filter((f) => isSelectorAskable(f))
    expect(askable).toEqual(['tool_account_status'])
  })
})

describe('L: a correction volunteered later updates state without reopening the cap', () => {
  test('the dedupe key is keyed on the canonical tool identifier, not the mention_id -- a correction that keeps account_status unknown still respects an already-consumed cap', () => {
    const original = klingMention({ mention_id: 'm1' })
    const corrected = klingMention({ mention_id: 'm2', superseded_by: null, source_turn: 2, source_statement: 'Actually, through the API.' })
    const su = emptySU({
      user_goals: [commercialUseGoal()],
      tool_mentions: [{ ...original, superseded_by: 'm2' }, corrected],
    })

    const usedBoundary: BoundaryState = { ...createInitialBoundaryState(), selector_needs_used: { 'tool_account_status::kling': 1 } }
    const needs = deriveSelectorNeeds(su, MATRIX_FIXTURE, NO_TOPIC_CLAIMS, usedBoundary)
    expect(needs).toHaveLength(0)
  })

  test('a correction that DOES resolve account_status still needs no question, cap or not -- Living Knowledge is consumed automatically once the fact is confirmed', () => {
    const original = klingMention({ mention_id: 'm1' })
    const corrected = klingMention({
      mention_id: 'm2',
      source_turn: 2,
      source_statement: 'Actually, I have a Kling Member Account.',
      account_status: { state: 'confirmed', value: 'Member Account' },
    })
    const su = emptySU({
      user_goals: [commercialUseGoal()],
      tool_mentions: [{ ...original, superseded_by: 'm2' }, corrected],
    })

    const usedBoundary: BoundaryState = { ...createInitialBoundaryState(), selector_needs_used: { 'tool_account_status::kling': 1 } }
    const needs = deriveSelectorNeeds(su, MATRIX_FIXTURE, NO_TOPIC_CLAIMS, usedBoundary)
    expect(needs).toHaveLength(0)
  })
})
