/**
 * Deterministic phase derivation test suite (LIVE_INTERVIEW_RUNTIME_ARCHITECTURE.md
 * §2, Live Interview Runtime milestone). No live model -- computePhase is a
 * pure function of (StructuredUnderstanding, BoundaryState).
 */

import { computePhase, meetsPhase2ExitCondition } from '@/lib/interview-engine/phase'
import { createInitialBoundaryState, type BoundaryState } from '@/lib/interview-engine/boundaries'
import type {
  Attested,
  ProjectFacts,
  ScopedObservation,
  StructuredUnderstanding,
  ToolMention,
} from '@/types/interview-engine'

function attested<T>(overrides: Partial<Attested<T>> & { state: Attested<T>['state'] }): Attested<T> {
  return overrides as Attested<T>
}

function projectFacts(overrides: Partial<{ workflow_role: Attested<string>; intended_use: Attested<string> }> = {}): ProjectFacts {
  return {
    intended_use: { attestation: overrides.intended_use ?? { state: 'unknown' }, source_turn: 1, source_statement: 'x' },
    workflow_role: { attestation: overrides.workflow_role ?? { state: 'unknown' }, source_turn: 1, source_statement: 'x' },
    jurisdiction: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
    human_contribution_description: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
  }
}

function su(overrides: Partial<{ tool_mentions: ToolMention[]; scoped_observations: ScopedObservation[]; project_facts: ProjectFacts }> = {}): StructuredUnderstanding {
  return {
    project_facts: overrides.project_facts ?? projectFacts(),
    tool_mentions: overrides.tool_mentions ?? [],
    scoped_observations: overrides.scoped_observations ?? [],
    user_goals: [],
    asset_provider_mentions: [],
    assessment_jurisdiction_mentions: [],
    content_presence_mentions: [],
    current_phase: 1,
    gate_1_state: 'not_met',
    gate_2_state: 'not_yet_stable',
    completion_reason: null,
    opt_out_scope: null,
  }
}

function tool(overrides: Partial<ToolMention> = {}): ToolMention {
  return {
    mention_id: 'tm-1',
    resolution: { kind: 'canonical', identifier: 'runway-gen3' },
    access_surface: { state: 'unresolved_no_visibility' },
    plan_tier: { state: 'unknown' },
    account_status: { state: 'unknown' },
    confidence: 'confirmed',
    source_turn: 1,
    source_statement: 'x',
    superseded_by: null,
    ...overrides,
  }
}

function observation(overrides: Partial<ScopedObservation> & Pick<ScopedObservation, 'confidence'>): ScopedObservation {
  return {
    observation_id: 'so-1',
    scope: 'current_project',
    workflow_stage: null,
    status: null,
    note: 'x',
    superseded_by: null,
    source_turn: 1,
    source_statement: 'x',
    ...overrides,
  }
}

function boundary(overrides: Partial<BoundaryState> = {}): BoundaryState {
  return { ...createInitialBoundaryState(), ...overrides }
}

describe('computePhase -- Phase 1 -> 2', () => {
  test('empty SU, empty boundary -> stays phase 1', () => {
    expect(computePhase(su(), boundary())).toBe(1)
  })

  test('one active tool_mention (even unresolved alias) -> phase 2', () => {
    const state = su({ tool_mentions: [tool({ resolution: { kind: 'unresolved_alias', raw_name: 'Nano Banana' } })] })
    expect(computePhase(state, boundary())).toBe(2)
  })

  test('one active scoped_observation alone -> phase 2', () => {
    const state = su({ scoped_observations: [observation({ confidence: 'confirmed' })] })
    expect(computePhase(state, boundary())).toBe(2)
  })

  test('a superseded tool_mention alone does not advance phase', () => {
    const state = su({ tool_mentions: [tool({ superseded_by: 'tm-2' })] })
    expect(computePhase(state, boundary())).toBe(1)
  })

  test.each(['unresolved_no_visibility', 'unknown', 'declined'] as const)(
    'a lone %s-confidence scoped_observation does NOT advance phase -- a decline-describing record is not "engagement"',
    (confidence) => {
      const state = su({ scoped_observations: [observation({ confidence })] })
      expect(computePhase(state, boundary())).toBe(1)
    },
  )

  test('phases_ended includes 1 pushes to phase 2 even with an empty SU (decline forces advancement)', () => {
    expect(computePhase(su(), boundary({ phases_ended: [1] }))).toBe(2)
  })
})

describe('meetsPhase2ExitCondition -- isolated unit tests for the Candidate B rule', () => {
  test('resolved tool alone (no workflow_role, no observation) is NOT sufficient', () => {
    expect(meetsPhase2ExitCondition(su({ tool_mentions: [tool()] }))).toBe(false)
  })

  test('resolved tool + confirmed workflow_role -> sufficient', () => {
    const state = su({ tool_mentions: [tool()], project_facts: projectFacts({ workflow_role: { state: 'confirmed', value: 'Producer' } }) })
    expect(meetsPhase2ExitCondition(state)).toBe(true)
  })

  test('resolved tool + confirmed scoped_observation -> sufficient', () => {
    const state = su({ tool_mentions: [tool()], scoped_observations: [observation({ confidence: 'confirmed' })] })
    expect(meetsPhase2ExitCondition(state)).toBe(true)
  })

  test('resolved tool + confirmed_absent scoped_observation -> sufficient (a stated absence is not a gap)', () => {
    const state = su({ tool_mentions: [tool()], scoped_observations: [observation({ confidence: 'confirmed_absent' })] })
    expect(meetsPhase2ExitCondition(state)).toBe(true)
  })

  test.each(['unresolved_no_visibility', 'unknown', 'declined'] as const)(
    'resolved tool + a %s-confidence scoped_observation alone -> NOT sufficient',
    (confidence) => {
      const state = su({ tool_mentions: [tool()], scoped_observations: [observation({ confidence })] })
      expect(meetsPhase2ExitCondition(state)).toBe(false)
    },
  )

  test('resolved tool + a superseded (even confirmed) scoped_observation -> NOT sufficient', () => {
    const state = su({ tool_mentions: [tool()], scoped_observations: [observation({ confidence: 'confirmed', superseded_by: 'so-2' })] })
    expect(meetsPhase2ExitCondition(state)).toBe(false)
  })

  test('unresolved alias tool (not resolved) + confirmed workflow_role -> NOT sufficient', () => {
    const state = su({
      tool_mentions: [tool({ resolution: { kind: 'unresolved_alias', raw_name: 'Nano Banana' } })],
      project_facts: projectFacts({ workflow_role: { state: 'confirmed', value: 'Producer' } }),
    })
    expect(meetsPhase2ExitCondition(state)).toBe(false)
  })

  test('a superseded resolved tool + confirmed workflow_role -> NOT sufficient', () => {
    const state = su({
      tool_mentions: [tool({ superseded_by: 'tm-2' })],
      project_facts: projectFacts({ workflow_role: { state: 'confirmed', value: 'Producer' } }),
    })
    expect(meetsPhase2ExitCondition(state)).toBe(false)
  })

  test.each(['unresolved_no_visibility', 'unknown', 'declined'] as const)(
    'resolved tool + %s workflow_role alone (no observation) -> NOT sufficient',
    (workflowRoleState) => {
      const state = su({ tool_mentions: [tool()], project_facts: projectFacts({ workflow_role: { state: workflowRoleState } as Attested<string> }) })
      expect(meetsPhase2ExitCondition(state)).toBe(false)
    },
  )
})

describe('computePhase -- Phase 2 -> 3', () => {
  test('resolved tool + confirmed workflow_role -> phase 3', () => {
    const state = su({ tool_mentions: [tool()], project_facts: projectFacts({ workflow_role: { state: 'confirmed', value: 'Producer' } }) })
    expect(computePhase(state, boundary())).toBe(3)
  })

  test('resolved tool alone -> stays phase 2, never skips straight to 3', () => {
    const state = su({ tool_mentions: [tool()] })
    expect(computePhase(state, boundary())).toBe(2)
  })

  test('phases_ended includes 2 pushes to phase 3 (decline forces advancement), even with only phase-1-level content', () => {
    const state = su({ scoped_observations: [observation({ confidence: 'unknown' })] }) // engaged (phase 1->2), but not phase-2-exit-sufficient
    expect(computePhase(state, boundary({ phases_ended: [2] }))).toBe(3)
  })

  test('phases_ended includes both 1 and 2 -> phase 3 directly, even from a fully empty SU (chained advancement)', () => {
    expect(computePhase(su(), boundary({ phases_ended: [1, 2] }))).toBe(3)
  })

  test('does not require Gate 1: gate_1_state on the SU is irrelevant to computePhase (function never reads it)', () => {
    const met = su({ tool_mentions: [tool()], project_facts: projectFacts({ workflow_role: { state: 'confirmed', value: 'Producer' } }) })
    const notMet = { ...met, gate_1_state: 'not_met' as const }
    expect(computePhase(met, boundary())).toBe(computePhase(notMet, boundary()))
  })
})

describe('computePhase -- required end-to-end cases', () => {
  test('a single bundled turn producing a resolved tool + observation in one shot reaches phase 3 immediately, not gradually over multiple turns', () => {
    const state = su({
      tool_mentions: [tool()],
      scoped_observations: [observation({ confidence: 'confirmed' })],
    })
    expect(computePhase(state, boundary())).toBe(3)
  })

  test('full opt-out shaped SU (everything declined) never advances past phase 1 on content alone', () => {
    const state = su({
      project_facts: projectFacts({ workflow_role: { state: 'declined' }, intended_use: { state: 'declined' } }),
      scoped_observations: [observation({ confidence: 'declined' })],
    })
    expect(computePhase(state, boundary())).toBe(1)
  })
})
