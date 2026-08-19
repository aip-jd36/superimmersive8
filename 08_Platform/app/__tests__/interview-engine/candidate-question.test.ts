/**
 * Thin deterministic regression tests for candidate-question.ts
 * (CRC_PROTOTYPE_ALPHA_ROADMAP.md Phase 6b, step 4). Proves
 * deriveEligibleSignals and validateCandidateReference plumbing before any
 * live model is involved.
 *
 * Run: npx jest __tests__/interview-engine/candidate-question.test.ts
 */

import type { ProjectFacts, ScopedObservation, StructuredUnderstanding, ToolMention } from '../../types/interview-engine'
import {
  PROJECT_FACT_SIGNAL_IDS,
  deriveEligibleSignals,
  validateCandidateReference,
  type CandidateQuestionProposal,
} from '../../lib/interview-engine/candidate-question'

function projectFacts(): ProjectFacts {
  return {
    intended_use: { attestation: { state: 'confirmed', value: 'Paid campaign' }, source_turn: 1, source_statement: 'placeholder' },
    workflow_role: { attestation: { state: 'confirmed', value: 'Producer' }, source_turn: 1, source_statement: 'placeholder' },
    jurisdiction: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
    human_contribution_description: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
  }
}

function toolMention(overrides: Partial<ToolMention> & Pick<ToolMention, 'mention_id' | 'resolution'>): ToolMention {
  return {
    access_surface: { state: 'unknown' },
    plan_tier: { state: 'unknown' },
    confidence: 'confirmed',
    source_turn: 1,
    source_statement: 'placeholder',
    superseded_by: null,
    ...overrides,
  }
}

function observation(overrides: Partial<ScopedObservation> & Pick<ScopedObservation, 'observation_id'>): ScopedObservation {
  return {
    scope: 'current_project',
    workflow_stage: null,
    confidence: 'confirmed',
    status: null,
    note: 'placeholder',
    superseded_by: null,
    source_turn: 1,
    source_statement: 'placeholder',
    ...overrides,
  }
}

function baseSU(overrides: Partial<StructuredUnderstanding> = {}): StructuredUnderstanding {
  return {
    project_facts: projectFacts(),
    tool_mentions: [],
    scoped_observations: [],
    user_goals: [],
    asset_provider_mentions: [],
    current_phase: 2,
    gate_1_state: 'met',
    gate_2_state: 'stable',
    completion_reason: null,
    opt_out_scope: null,
    ...overrides,
  }
}

describe('deriveEligibleSignals', () => {
  test('always includes both project facts, unconditionally', () => {
    const signals = deriveEligibleSignals(baseSU())
    expect(signals).toEqual(
      expect.arrayContaining([
        { signal_id: PROJECT_FACT_SIGNAL_IDS.intended_use, kind: 'project_fact' },
        { signal_id: PROJECT_FACT_SIGNAL_IDS.workflow_role, kind: 'project_fact' },
      ]),
    )
  })

  test('includes active scoped observations by their own observation_id', () => {
    const su = baseSU({ scoped_observations: [observation({ observation_id: 'so-1' })] })
    const signals = deriveEligibleSignals(su)
    expect(signals).toContainEqual({ signal_id: 'so-1', kind: 'scoped_observation' })
  })

  test('excludes superseded scoped observations', () => {
    const su = baseSU({
      scoped_observations: [
        observation({ observation_id: 'so-1', superseded_by: 'so-2' }),
        observation({ observation_id: 'so-2', source_turn: 2 }),
      ],
    })
    const signals = deriveEligibleSignals(su)
    expect(signals).not.toContainEqual({ signal_id: 'so-1', kind: 'scoped_observation' })
    expect(signals).toContainEqual({ signal_id: 'so-2', kind: 'scoped_observation' })
  })

  test('includes active tool mentions by their own mention_id', () => {
    const su = baseSU({
      tool_mentions: [toolMention({ mention_id: 'tm-1', resolution: { kind: 'canonical', identifier: 'runway-gen3' } })],
    })
    const signals = deriveEligibleSignals(su)
    expect(signals).toContainEqual({ signal_id: 'tm-1', kind: 'tool_mention' })
  })

  test('excludes superseded tool mentions', () => {
    const su = baseSU({
      tool_mentions: [
        toolMention({ mention_id: 'tm-1', resolution: { kind: 'unresolved_alias', raw_name: 'Nano Banana' }, superseded_by: 'tm-2' }),
        toolMention({ mention_id: 'tm-2', resolution: { kind: 'canonical', identifier: 'gemini-api' }, source_turn: 2 }),
      ],
    })
    const signals = deriveEligibleSignals(su)
    expect(signals).not.toContainEqual(expect.objectContaining({ signal_id: 'tm-1' }))
    expect(signals).toContainEqual({ signal_id: 'tm-2', kind: 'tool_mention' })
  })

  test('total eligible count is exactly active observations + active mentions + 2 project facts', () => {
    const su = baseSU({
      scoped_observations: [observation({ observation_id: 'so-1' }), observation({ observation_id: 'so-2', source_turn: 2 })],
      tool_mentions: [toolMention({ mention_id: 'tm-1', resolution: { kind: 'canonical', identifier: 'runway-gen3' } })],
    })
    expect(deriveEligibleSignals(su)).toHaveLength(2 + 1 + 2)
  })
})

describe('validateCandidateReference', () => {
  const eligible = deriveEligibleSignals(
    baseSU({
      scoped_observations: [observation({ observation_id: 'so-1' })],
      tool_mentions: [toolMention({ mention_id: 'tm-1', resolution: { kind: 'canonical', identifier: 'runway-gen3' } })],
    }),
  )

  function proposal(overrides: Partial<CandidateQuestionProposal> = {}): CandidateQuestionProposal {
    return {
      question_text: 'Did anyone review this before it went out?',
      question_kind: 'follow_up_on_signal',
      target_signal_id: 'so-1',
      phase: 3,
      ...overrides,
    }
  }

  test('accepts a proposal targeting an eligible signal_id, strips question_text', () => {
    const result = validateCandidateReference(proposal(), eligible)
    expect(result).toEqual({
      outcome: 'accepted',
      candidate: { kind: 'follow_up_on_signal', signal_id: 'so-1', phase: 3 },
    })
  })

  test('accepts a null target_signal_id for a kind that does not require one', () => {
    const result = validateCandidateReference(proposal({ question_kind: 'historical_experience', target_signal_id: null }), eligible)
    expect(result).toEqual({
      outcome: 'accepted',
      candidate: { kind: 'historical_experience', signal_id: undefined, phase: 3 },
    })
  })

  test('accepts a project-fact signal reference', () => {
    const result = validateCandidateReference(
      proposal({ target_signal_id: PROJECT_FACT_SIGNAL_IDS.intended_use }),
      eligible,
    )
    expect(result.outcome).toBe('accepted')
  })

  test('rejects a hallucinated signal_id not in the eligible set', () => {
    const result = validateCandidateReference(proposal({ target_signal_id: 'so-does-not-exist' }), eligible)
    expect(result).toMatchObject({ outcome: 'rejected', reason_code: 'SIGNAL_ID_NOT_ELIGIBLE' })
  })

  test('rejects a stale signal_id that was eligible before a supersession but is not anymore', () => {
    const staleId = 'tm-1' // eligible in the base set above
    const afterSupersession = deriveEligibleSignals(
      baseSU({
        tool_mentions: [
          toolMention({ mention_id: 'tm-1', resolution: { kind: 'unresolved_alias', raw_name: 'x' }, superseded_by: 'tm-2' }),
          toolMention({ mention_id: 'tm-2', resolution: { kind: 'canonical', identifier: 'kling' }, source_turn: 2 }),
        ],
      }),
    )
    const result = validateCandidateReference(proposal({ target_signal_id: staleId }), afterSupersession)
    expect(result).toMatchObject({ outcome: 'rejected', reason_code: 'SIGNAL_ID_NOT_ELIGIBLE' })
  })

  test('rejects a missing signal_id when the question_kind requires one', () => {
    const result = validateCandidateReference(proposal({ question_kind: 'uncertainty_clarification', target_signal_id: null }), eligible)
    expect(result).toMatchObject({ outcome: 'rejected', reason_code: 'MISSING_REQUIRED_SIGNAL_ID' })
  })

  test('accepts a disentangling_question with no target_signal_id', () => {
    const result = validateCandidateReference(proposal({ question_kind: 'disentangling_question', target_signal_id: null }), eligible)
    expect(result).toEqual({
      outcome: 'accepted',
      candidate: { kind: 'disentangling_question', signal_id: undefined, phase: 3 },
    })
  })
})

describe('user_goals never enter the eligible-signal set (Milestone 1 hard scope boundary, 2026-08-15)', () => {
  test('deriveEligibleSignals output is byte-identical whether user_goals is empty or populated -- Model 4/Constraint A/B candidate pool never grows from a stated goal', () => {
    const goal = { goal_id: 'g-1', state: 'confirmed' as const, raw_text: 'Can I use this commercially?', category: 'unknown' as const, scope: 'informational' as const, superseded_by: null, source_turn: 1, source_statement: 'placeholder' }
    const withoutGoals = baseSU({ user_goals: [] })
    const withGoals = baseSU({ user_goals: [goal] })
    expect(deriveEligibleSignals(withoutGoals)).toEqual(deriveEligibleSignals(withGoals))
  })

  test('no eligible signal ever carries kind "user_goal" -- the type itself has no such member, confirmed structurally', () => {
    const goal = { goal_id: 'g-1', state: 'confirmed' as const, raw_text: 'Can I use this commercially?', category: 'unknown' as const, scope: 'informational' as const, superseded_by: null, source_turn: 1, source_statement: 'placeholder' }
    const su = baseSU({ user_goals: [goal] })
    const signals = deriveEligibleSignals(su)
    expect(signals.every((s) => s.kind !== ('user_goal' as never))).toBe(true)
  })
})
