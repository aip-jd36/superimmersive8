/**
 * Thin deterministic regression tests for candidate-question.ts
 * (CRC_PROTOTYPE_ALPHA_ROADMAP.md Phase 6b, step 4). Proves
 * deriveEligibleSignals and validateCandidateReference plumbing before any
 * live model is involved.
 *
 * Run: npx jest __tests__/interview-engine/candidate-question.test.ts
 */

import type { AssetProviderMention, ProjectFacts, ScopedObservation, StructuredUnderstanding, ToolMention } from '../../types/interview-engine'
import {
  PROJECT_FACT_SIGNAL_IDS,
  deriveEligibleSignals,
  validateCandidateReference,
  presatisfyStructuralFollowUpNeeds,
  type CandidateQuestionProposal,
} from '../../lib/interview-engine/candidate-question'
import { createInitialBoundaryState } from '../../lib/interview-engine/boundaries'

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

function assetProviderMention(overrides: Partial<AssetProviderMention> & Pick<AssetProviderMention, 'mention_id' | 'resolution'>): AssetProviderMention {
  return {
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

  test('total eligible count is exactly active observations + active mentions + 3 project facts', () => {
    const su = baseSU({
      scoped_observations: [observation({ observation_id: 'so-1' }), observation({ observation_id: 'so-2', source_turn: 2 })],
      tool_mentions: [toolMention({ mention_id: 'tm-1', resolution: { kind: 'canonical', identifier: 'runway-gen3' } })],
    })
    expect(deriveEligibleSignals(su)).toHaveLength(2 + 1 + 3)
  })

  // Second-Jurisdiction UX milestone (2026-08-20), J2.
  test('project:jurisdiction is unconditionally eligible, same as intended_use/workflow_role -- including when unresolved AND when confirmed', () => {
    const unresolved = deriveEligibleSignals(baseSU())
    expect(unresolved).toContainEqual({ signal_id: PROJECT_FACT_SIGNAL_IDS.jurisdiction, kind: 'project_fact' })

    const confirmed = deriveEligibleSignals(
      baseSU({ project_facts: { ...projectFacts(), jurisdiction: { attestation: { state: 'confirmed', value: 'United States' }, source_turn: 2, source_statement: 'United States' } } }),
    )
    expect(confirmed).toContainEqual({ signal_id: PROJECT_FACT_SIGNAL_IDS.jurisdiction, kind: 'project_fact' })
  })

  // Duplicate-Question Prevention milestone (2026-08-19). Diagnostic finding:
  // AssetProviderMention was the one active record kind never derived as an
  // eligible signal at all, structurally forcing any follow-up naming a
  // specific provider toward the uncapped 'other' kind. Section 5/12 of the
  // implementation task: prove iStock/Getty/Shutterstock all become
  // eligible, and that unresolved-alias semantics are unaffected.
  describe('asset provider mentions (Duplicate-Question Prevention milestone, 2026-08-19)', () => {
    test('an iStock mention becomes an eligible candidate signal', () => {
      const su = baseSU({ asset_provider_mentions: [assetProviderMention({ mention_id: 'ap-istock', resolution: { kind: 'canonical', identifier: 'istock' } })] })
      expect(deriveEligibleSignals(su)).toContainEqual({ signal_id: 'ap-istock', kind: 'asset_provider_mention' })
    })

    test('a Getty mention becomes eligible', () => {
      const su = baseSU({ asset_provider_mentions: [assetProviderMention({ mention_id: 'ap-getty', resolution: { kind: 'canonical', identifier: 'getty' } })] })
      expect(deriveEligibleSignals(su)).toContainEqual({ signal_id: 'ap-getty', kind: 'asset_provider_mention' })
    })

    test('a Shutterstock mention becomes eligible', () => {
      const su = baseSU({ asset_provider_mentions: [assetProviderMention({ mention_id: 'ap-shutterstock', resolution: { kind: 'canonical', identifier: 'shutterstock' } })] })
      expect(deriveEligibleSignals(su)).toContainEqual({ signal_id: 'ap-shutterstock', kind: 'asset_provider_mention' })
    })

    test('an unresolved-alias provider mention is still eligible -- a follow-up about an unresolved provider is still a valid thing to ask, same reasoning as unresolved tool mentions', () => {
      const su = baseSU({ asset_provider_mentions: [assetProviderMention({ mention_id: 'ap-unknown', resolution: { kind: 'unresolved_alias', raw_name: 'some stock site' } })] })
      expect(deriveEligibleSignals(su)).toContainEqual({ signal_id: 'ap-unknown', kind: 'asset_provider_mention' })
    })

    test('excludes superseded asset provider mentions', () => {
      const su = baseSU({
        asset_provider_mentions: [
          assetProviderMention({ mention_id: 'ap-1', resolution: { kind: 'unresolved_alias', raw_name: 'x' }, superseded_by: 'ap-2' }),
          assetProviderMention({ mention_id: 'ap-2', resolution: { kind: 'canonical', identifier: 'istock' }, source_turn: 2 }),
        ],
      })
      const signals = deriveEligibleSignals(su)
      expect(signals).not.toContainEqual(expect.objectContaining({ signal_id: 'ap-1' }))
      expect(signals).toContainEqual({ signal_id: 'ap-2', kind: 'asset_provider_mention' })
    })

    test('total eligible count grows by exactly one per active asset provider mention', () => {
      const su = baseSU({
        asset_provider_mentions: [
          assetProviderMention({ mention_id: 'ap-1', resolution: { kind: 'canonical', identifier: 'istock' } }),
          assetProviderMention({ mention_id: 'ap-2', resolution: { kind: 'canonical', identifier: 'getty' } }),
        ],
      })
      expect(deriveEligibleSignals(su)).toHaveLength(0 + 0 + 2 + 3)
    })
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

  // Duplicate-Question Prevention milestone (2026-08-19).
  describe('target_follow_up_need', () => {
    const eligibleWithProvider = deriveEligibleSignals(
      baseSU({
        scoped_observations: [observation({ observation_id: 'so-1' })],
        tool_mentions: [toolMention({ mention_id: 'tm-1', resolution: { kind: 'canonical', identifier: 'kling' } })],
        asset_provider_mentions: [assetProviderMention({ mention_id: 'ap-1', resolution: { kind: 'canonical', identifier: 'istock' } })],
      }),
    )

    test('accepts and passes through asset_provider_usage when target_signal_id resolves to an eligible asset_provider_mention', () => {
      const result = validateCandidateReference(
        proposal({ target_signal_id: 'ap-1', target_follow_up_need: 'asset_provider_usage' }),
        eligibleWithProvider,
      )
      expect(result).toEqual({
        outcome: 'accepted',
        candidate: { kind: 'follow_up_on_signal', signal_id: 'ap-1', phase: 3, follow_up_need: 'asset_provider_usage' },
      })
    })

    test('accepts asset_provider_license the same way, independently', () => {
      const result = validateCandidateReference(
        proposal({ target_signal_id: 'ap-1', target_follow_up_need: 'asset_provider_license' }),
        eligibleWithProvider,
      )
      expect(result.outcome).toBe('accepted')
    })

    test('accepts tool_plan_tier when target_signal_id resolves to an eligible tool_mention', () => {
      const result = validateCandidateReference(
        proposal({ target_signal_id: 'tm-1', target_follow_up_need: 'tool_plan_tier' }),
        eligibleWithProvider,
      )
      expect(result).toEqual({
        outcome: 'accepted',
        candidate: { kind: 'follow_up_on_signal', signal_id: 'tm-1', phase: 3, follow_up_need: 'tool_plan_tier' },
      })
    })

    test('rejects asset_provider_usage targeting a tool_mention (wrong signal kind for this need)', () => {
      const result = validateCandidateReference(
        proposal({ target_signal_id: 'tm-1', target_follow_up_need: 'asset_provider_usage' }),
        eligibleWithProvider,
      )
      expect(result).toMatchObject({ outcome: 'rejected', reason_code: 'FOLLOW_UP_NEED_TARGET_MISMATCH' })
    })

    test('rejects tool_plan_tier targeting an asset_provider_mention (wrong signal kind for this need)', () => {
      const result = validateCandidateReference(
        proposal({ target_signal_id: 'ap-1', target_follow_up_need: 'tool_plan_tier' }),
        eligibleWithProvider,
      )
      expect(result).toMatchObject({ outcome: 'rejected', reason_code: 'FOLLOW_UP_NEED_TARGET_MISMATCH' })
    })

    test('rejects a follow_up_need with a null target_signal_id -- a need without a target makes no structural sense', () => {
      const result = validateCandidateReference(
        proposal({ target_signal_id: null, question_kind: 'other', target_follow_up_need: 'asset_provider_usage' }),
        eligibleWithProvider,
      )
      expect(result).toMatchObject({ outcome: 'rejected', reason_code: 'FOLLOW_UP_NEED_TARGET_MISMATCH' })
    })

    test('omitted/null target_follow_up_need is untouched, existing behavior -- no new validation runs', () => {
      const result = validateCandidateReference(proposal({ target_signal_id: 'so-1', target_follow_up_need: null }), eligibleWithProvider)
      expect(result).toEqual({
        outcome: 'accepted',
        candidate: { kind: 'follow_up_on_signal', signal_id: 'so-1', phase: 3, follow_up_need: undefined },
      })
    })

    test('a follow_up_need is accepted even on kind "other" -- Duplicate-Question Diagnostic §8: an "other" candidate that maps to a known structured need must be linkable to it, not just follow_up_on_signal', () => {
      const result = validateCandidateReference(
        proposal({ question_kind: 'other', target_signal_id: 'ap-1', target_follow_up_need: 'asset_provider_usage' }),
        eligibleWithProvider,
      )
      expect(result).toEqual({
        outcome: 'accepted',
        candidate: { kind: 'other', signal_id: 'ap-1', phase: 3, follow_up_need: 'asset_provider_usage' },
      })
    })
  })
})

describe('presatisfyStructuralFollowUpNeeds (Duplicate-Question Prevention milestone, 2026-08-19)', () => {
  test('H. tool plan_tier confirmed via direct statement (never asked as a candidate) is presatisfied -- pre-seeds the compound cap key', () => {
    const su = baseSU({
      tool_mentions: [
        toolMention({
          mention_id: 'tm-1',
          resolution: { kind: 'canonical', identifier: 'kling' },
          plan_tier: { state: 'confirmed', value: 'Kling Pro' },
        }),
      ],
    })
    const result = presatisfyStructuralFollowUpNeeds(su, createInitialBoundaryState())
    expect(result.follow_ups_used['tm-1::tool_plan_tier']).toBe(1)
  })

  test('plan_tier NOT confirmed (unknown) is left alone -- no presatisfaction, need remains genuinely askable', () => {
    const su = baseSU({
      tool_mentions: [toolMention({ mention_id: 'tm-1', resolution: { kind: 'canonical', identifier: 'kling' } })],
    })
    const result = presatisfyStructuralFollowUpNeeds(su, createInitialBoundaryState())
    expect(result.follow_ups_used['tm-1::tool_plan_tier']).toBeUndefined()
  })

  test('a superseded tool mention with confirmed plan_tier is NOT presatisfied -- only the active (non-superseded) mention counts', () => {
    const su = baseSU({
      tool_mentions: [
        toolMention({
          mention_id: 'tm-1',
          resolution: { kind: 'canonical', identifier: 'kling' },
          plan_tier: { state: 'confirmed', value: 'Kling Pro' },
          superseded_by: 'tm-2',
        }),
        toolMention({ mention_id: 'tm-2', resolution: { kind: 'canonical', identifier: 'kling' }, source_turn: 2 }),
      ],
    })
    const result = presatisfyStructuralFollowUpNeeds(su, createInitialBoundaryState())
    expect(result.follow_ups_used['tm-1::tool_plan_tier']).toBeUndefined()
  })

  test('idempotent -- applying twice produces the same result as applying once, never double-counts', () => {
    const su = baseSU({
      tool_mentions: [
        toolMention({ mention_id: 'tm-1', resolution: { kind: 'canonical', identifier: 'kling' }, plan_tier: { state: 'confirmed', value: 'Pro' } }),
      ],
    })
    const once = presatisfyStructuralFollowUpNeeds(su, createInitialBoundaryState())
    const twice = presatisfyStructuralFollowUpNeeds(su, once)
    expect(twice).toEqual(once)
  })

  test('never lowers or clobbers an existing count for the same key', () => {
    const su = baseSU({
      tool_mentions: [
        toolMention({ mention_id: 'tm-1', resolution: { kind: 'canonical', identifier: 'kling' }, plan_tier: { state: 'confirmed', value: 'Pro' } }),
      ],
    })
    const alreadyAsked = { ...createInitialBoundaryState(), follow_ups_used: { 'tm-1::tool_plan_tier': 1 } }
    const result = presatisfyStructuralFollowUpNeeds(su, alreadyAsked)
    expect(result.follow_ups_used['tm-1::tool_plan_tier']).toBe(1)
  })

  test('does not touch asset_provider_usage/asset_provider_license -- deliberately scoped to tool_plan_tier only (no structured field exists for the other two)', () => {
    const su = baseSU({
      asset_provider_mentions: [assetProviderMention({ mention_id: 'ap-1', resolution: { kind: 'canonical', identifier: 'istock' } })],
    })
    const result = presatisfyStructuralFollowUpNeeds(su, createInitialBoundaryState())
    expect(result.follow_ups_used['ap-1::asset_provider_usage']).toBeUndefined()
    expect(result.follow_ups_used['ap-1::asset_provider_license']).toBeUndefined()
  })

  test('unrelated pre-existing follow_ups_used entries are preserved untouched', () => {
    const su = baseSU()
    const withUnrelated = { ...createInitialBoundaryState(), follow_ups_used: { 'legal-review': 1 } }
    const result = presatisfyStructuralFollowUpNeeds(su, withUnrelated)
    expect(result.follow_ups_used['legal-review']).toBe(1)
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
