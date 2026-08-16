/**
 * Jurisdiction clarification eligibility deterministic tests (CRC Living
 * Knowledge Phase 1, 2026-08-16). No live model needed -- pure functions,
 * same discipline as commercial-readiness-catalog.test.ts.
 */

import { evaluateJurisdictionClarificationEligibility, buildJurisdictionClarificationProposal, JURISDICTION_CLARIFICATION_QUESTION } from '@/lib/crc-engine/jurisdiction-clarification'
import type { StructuredUnderstanding, UserGoal } from '@/types/interview-engine'
import type { TopicClaim } from '@/lib/retrieval-engine/types'

function baseSU(overrides: Partial<StructuredUnderstanding> = {}): StructuredUnderstanding {
  return {
    project_facts: {
      intended_use: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
      workflow_role: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
      jurisdiction: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
    },
    tool_mentions: [],
    scoped_observations: [],
    user_goals: [],
    current_phase: 1,
    gate_1_state: 'not_met',
    gate_2_state: 'not_yet_stable',
    completion_reason: null,
    opt_out_scope: null,
    ...overrides,
  }
}

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

function jurisdictionGatedClaim(overrides: Partial<TopicClaim> & Pick<TopicClaim, 'claim_id' | 'topic'> = { claim_id: 'C-1', topic: 'copyright_ownership' }): TopicClaim {
  return {
    claim_character: 'established',
    jurisdiction: 'United States',
    lifecycle: 'Adopted',
    crc_eligible: 'Yes',
    crc_publication_scope: 'scope',
    crc_candidate_statement: 'statement',
    applicability_requirements: [{ fact: 'jurisdiction', operator: 'equals', value: 'United States' }],
    last_verified: '2026-08-16',
    superseded_by: null,
    ...overrides,
  }
}

describe('evaluateJurisdictionClarificationEligibility', () => {
  test('not eligible when Gate 1 is not met, even if everything else lines up', () => {
    const su = baseSU({ user_goals: [goal({ goal_id: 'g-1', category: 'copyright_ownership' })] })
    const result = evaluateJurisdictionClarificationEligibility(su, [jurisdictionGatedClaim()], false, false)
    expect(result.eligible).toBe(false)
  })

  test('not eligible when no active goal needs jurisdiction-scoped knowledge', () => {
    const su = baseSU({ user_goals: [goal({ goal_id: 'g-1', category: 'commercial_use' })] })
    const result = evaluateJurisdictionClarificationEligibility(su, [jurisdictionGatedClaim({ claim_id: 'C-1', topic: 'copyright_ownership' })], false, true)
    expect(result.needs_jurisdiction).toBe(false)
    expect(result.eligible).toBe(false)
  })

  test('not eligible when NO governed claim contains a jurisdiction applicability requirement -- claim existing alone is never the trigger', () => {
    const su = baseSU({ user_goals: [goal({ goal_id: 'g-1', category: 'copyright_ownership' })] })
    const claimWithoutJurisdictionGate: TopicClaim = { ...jurisdictionGatedClaim(), applicability_requirements: [] }
    const result = evaluateJurisdictionClarificationEligibility(su, [claimWithoutJurisdictionGate], false, true)
    expect(result.needs_jurisdiction).toBe(false)
    expect(result.eligible).toBe(false)
  })

  test('not eligible merely because a tool was mentioned -- the trigger is the goal, never the tool', () => {
    const su = baseSU({
      user_goals: [],
      tool_mentions: [
        {
          mention_id: 'tm-1',
          resolution: { kind: 'canonical', identifier: 'kling' },
          access_surface: { state: 'unknown' },
          plan_tier: { state: 'unknown' },
          confidence: 'confirmed',
          source_turn: 1,
          source_statement: 'Kling',
          superseded_by: null,
        },
      ],
    })
    const result = evaluateJurisdictionClarificationEligibility(su, [jurisdictionGatedClaim()], false, true)
    expect(result.eligible).toBe(false)
  })

  test('eligible when Gate 1 met, an active goal needs jurisdiction-scoped knowledge, and jurisdiction is unconfirmed', () => {
    const su = baseSU({ user_goals: [goal({ goal_id: 'g-1', category: 'copyright_ownership' })] })
    const result = evaluateJurisdictionClarificationEligibility(su, [jurisdictionGatedClaim()], false, true)
    expect(result.needs_jurisdiction).toBe(true)
    expect(result.jurisdiction_unresolved).toBe(true)
    expect(result.eligible).toBe(true)
  })

  test('not eligible once jurisdiction is confirmed -- do not re-ask a known fact', () => {
    const su = baseSU({
      user_goals: [goal({ goal_id: 'g-1', category: 'copyright_ownership' })],
      project_facts: {
        intended_use: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
        workflow_role: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
        jurisdiction: { attestation: { state: 'confirmed', value: 'United States' }, source_turn: 2, source_statement: 'US' },
      },
    })
    const result = evaluateJurisdictionClarificationEligibility(su, [jurisdictionGatedClaim()], false, true)
    expect(result.jurisdiction_unresolved).toBe(false)
    expect(result.eligible).toBe(false)
  })

  test('not eligible once jurisdiction is declined -- do not keep pestering after a decline', () => {
    const su = baseSU({
      user_goals: [goal({ goal_id: 'g-1', category: 'copyright_ownership' })],
      project_facts: {
        intended_use: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
        workflow_role: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
        jurisdiction: { attestation: { state: 'declined' }, source_turn: 2, source_statement: 'skip' },
      },
    })
    const result = evaluateJurisdictionClarificationEligibility(su, [jurisdictionGatedClaim()], false, true)
    expect(result.jurisdiction_unresolved).toBe(false)
    expect(result.eligible).toBe(false)
  })

  test('remains eligible when jurisdiction is unresolved_no_visibility or confirmed_absent -- only confirmed/declined close the question', () => {
    for (const state of ['unresolved_no_visibility', 'confirmed_absent'] as const) {
      const su = baseSU({
        user_goals: [goal({ goal_id: 'g-1', category: 'copyright_ownership' })],
        project_facts: {
          intended_use: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
          workflow_role: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
          jurisdiction: { attestation: { state }, source_turn: 2, source_statement: 'x' },
        },
      })
      const result = evaluateJurisdictionClarificationEligibility(su, [jurisdictionGatedClaim()], false, true)
      expect(result.eligible).toBe(true)
    }
  })

  test('not eligible when already asked this conversation', () => {
    const su = baseSU({ user_goals: [goal({ goal_id: 'g-1', category: 'copyright_ownership' })] })
    const result = evaluateJurisdictionClarificationEligibility(su, [jurisdictionGatedClaim()], true, true)
    expect(result.eligible).toBe(false)
  })

  test('a superseded or declined goal never triggers eligibility', () => {
    const superseded = goal({ goal_id: 'g-1', category: 'copyright_ownership', superseded_by: 'g-2' })
    const declined = goal({ goal_id: 'g-2', category: 'copyright_ownership', state: 'declined' })
    const su = baseSU({ user_goals: [superseded, declined] })
    const result = evaluateJurisdictionClarificationEligibility(su, [jurisdictionGatedClaim()], false, true)
    expect(result.eligible).toBe(false)
  })

  test('a claim with no eligible/adopted version never triggers eligibility (reviewer-only or candidate claim)', () => {
    const su = baseSU({ user_goals: [goal({ goal_id: 'g-1', category: 'copyright_ownership' })] })
    const overridesList: Partial<TopicClaim>[] = [{ lifecycle: 'Candidate' }, { crc_eligible: 'No' }, { superseded_by: 'C-2' }]
    for (const overrides of overridesList) {
      const result = evaluateJurisdictionClarificationEligibility(su, [{ ...jurisdictionGatedClaim(), ...overrides }], false, true)
      expect(result.eligible).toBe(false)
    }
  })
})

describe('buildJurisdictionClarificationProposal', () => {
  test('produces the exact PM-approved question text, kind, and null signal id', () => {
    const proposal = buildJurisdictionClarificationProposal(3)
    expect(proposal).toEqual({
      question_text: JURISDICTION_CLARIFICATION_QUESTION,
      question_kind: 'jurisdiction_clarification',
      target_signal_id: null,
      phase: 3,
    })
  })

  test('the approved copy is exactly "Which country\'s copyright rules are most relevant to this project?"', () => {
    expect(JURISDICTION_CLARIFICATION_QUESTION).toBe("Which country's copyright rules are most relevant to this project?")
  })
})
