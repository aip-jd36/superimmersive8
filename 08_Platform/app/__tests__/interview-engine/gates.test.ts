/**
 * Unit tests for Gate 1 (Minimum Understanding) and Gate 2 (Understanding
 * Stability) evaluators (CRC_PROTOTYPE_ALPHA_ROADMAP.md Phase 3).
 *
 * Run: npx jest __tests__/interview-engine/gates.test.ts
 */

import type { ProjectFacts, ScopedObservation, StructuredUnderstanding, ToolMention } from '../../types/interview-engine'
import { evaluateGate1, evaluateGate2 } from '../../lib/interview-engine/gates'

function projectFacts(overrides: Partial<ProjectFacts> = {}): ProjectFacts {
  return {
    intended_use: { state: 'confirmed', value: 'Paid social ad campaign' },
    workflow_role: { state: 'confirmed', value: 'Producer' },
    ...overrides,
  }
}

function toolMention(overrides: Partial<ToolMention> & Pick<ToolMention, 'mention_id' | 'resolution'>): ToolMention {
  return {
    access_surface: { state: 'unknown' },
    plan_tier: { state: 'unknown' },
    confidence: 'confirmed',
    source_turn: 1,
    source_statement: 'placeholder statement',
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
    source_statement: 'placeholder statement',
    ...overrides,
  }
}

function baseSU(overrides: Partial<StructuredUnderstanding> = {}): StructuredUnderstanding {
  return {
    project_facts: projectFacts(),
    tool_mentions: [],
    scoped_observations: [],
    current_phase: 2,
    gate_1_state: 'not_met',
    gate_2_state: 'not_yet_stable',
    completion_reason: null,
    opt_out_scope: null,
    ...overrides,
  }
}

describe('evaluateGate1', () => {
  test('unambiguous single-tool workflow: met', () => {
    const su = baseSU({
      tool_mentions: [toolMention({ mention_id: 'tm-1', resolution: { kind: 'canonical', identifier: 'runway-gen3' } })],
    })
    const result = evaluateGate1(su)
    expect(result.state).toBe('met')
    expect(result.reason_code).toBe('MINIMUM_UNDERSTANDING_MET')
    expect(result.unresolved_fields).toEqual([])
  })

  test('ambiguous multi-surface tool: not_met, names the unresolved mention', () => {
    const su = baseSU({
      tool_mentions: [
        toolMention({
          mention_id: 'tm-1',
          resolution: { kind: 'unresolved_alias', raw_name: 'Nano Banana' },
          confidence: 'unresolved_no_visibility',
        }),
      ],
    })
    const result = evaluateGate1(su)
    expect(result.state).toBe('not_met')
    expect(result.reason_code).toBe('AMBIGUOUS_TOOL_SURFACE_UNRESOLVED')
    expect(result.unresolved_fields).toEqual(['tool_mentions.tm-1'])
  })

  test('multiple tools, only one unresolved surface: not_met, names only the unresolved one', () => {
    const su = baseSU({
      tool_mentions: [
        toolMention({ mention_id: 'tm-1', resolution: { kind: 'canonical', identifier: 'runway-gen3' } }),
        toolMention({ mention_id: 'tm-2', resolution: { kind: 'canonical', identifier: 'elevenlabs' } }),
        toolMention({
          mention_id: 'tm-3',
          resolution: { kind: 'unresolved_alias', raw_name: 'Nano Banana' },
          confidence: 'unresolved_no_visibility',
        }),
      ],
    })
    const result = evaluateGate1(su)
    expect(result.state).toBe('not_met')
    expect(result.reason_code).toBe('AMBIGUOUS_TOOL_SURFACE_UNRESOLVED')
    expect(result.unresolved_fields).toEqual(['tool_mentions.tm-3'])
  })

  test('unknown tier does NOT block Gate 1 when tool identity and intended use are otherwise resolved', () => {
    const su = baseSU({
      tool_mentions: [
        toolMention({
          mention_id: 'tm-1',
          resolution: { kind: 'canonical', identifier: 'kling' },
          plan_tier: { state: 'unknown' },
        }),
      ],
    })
    const result = evaluateGate1(su)
    expect(result.state).toBe('met')
    expect(result.reason_code).toBe('MINIMUM_UNDERSTANDING_MET')
  })

  test('unknown tier DOES coexist with a not_met result when it is the tool IDENTITY that is unresolved, not just the tier', () => {
    // Contrast case: an unresolved alias blocks Gate 1 regardless of plan_tier's
    // own state -- the blocking signal is resolution.kind, never plan_tier.
    const su = baseSU({
      tool_mentions: [
        toolMention({
          mention_id: 'tm-1',
          resolution: { kind: 'unresolved_alias', raw_name: 'Nano Banana' },
          confidence: 'unresolved_no_visibility',
          plan_tier: { state: 'unknown' },
        }),
      ],
    })
    const result = evaluateGate1(su)
    expect(result.state).toBe('not_met')
    expect(result.reason_code).toBe('AMBIGUOUS_TOOL_SURFACE_UNRESOLVED')
  })

  test('a workflow with several tools does not fail Gate 1 merely because one nonessential plan detail is unknown', () => {
    const su = baseSU({
      tool_mentions: [
        toolMention({
          mention_id: 'tm-1',
          resolution: { kind: 'canonical', identifier: 'runway-gen3' },
          plan_tier: { state: 'confirmed', value: 'Team' },
        }),
        toolMention({
          mention_id: 'tm-2',
          resolution: { kind: 'canonical', identifier: 'elevenlabs' },
          plan_tier: { state: 'unknown' },
        }),
      ],
    })
    const result = evaluateGate1(su)
    expect(result.state).toBe('met')
  })

  test('missing intended use: not_met', () => {
    const su = baseSU({
      project_facts: projectFacts({ intended_use: { state: 'unknown' } }),
      tool_mentions: [toolMention({ mention_id: 'tm-1', resolution: { kind: 'canonical', identifier: 'runway-gen3' } })],
    })
    const result = evaluateGate1(su)
    expect(result.state).toBe('not_met')
    expect(result.reason_code).toBe('INTENDED_USE_MISSING')
    expect(result.unresolved_fields).toEqual(['project_facts.intended_use'])
  })

  test('opt-out before Gate 1: not_applicable_declined, never converted to unknown/absent/met', () => {
    const su = baseSU({
      project_facts: projectFacts({ intended_use: { state: 'declined' } }),
      tool_mentions: [],
      opt_out_scope: 'interview',
      completion_reason: 'declined',
    })
    const result = evaluateGate1(su)
    expect(result.state).toBe('not_applicable_declined')
    expect(result.reason_code).toBe('DECLINED_BEFORE_MINIMUM_UNDERSTANDING')
    expect(result.state).not.toBe('met')
  })

  test('decline coexisting with a specific unresolved alias still preserves the mention id for diagnostics, not just a generic placeholder', () => {
    const su = baseSU({
      tool_mentions: [
        toolMention({
          mention_id: 'tm-1',
          resolution: { kind: 'unresolved_alias', raw_name: 'Nano Banana' },
          confidence: 'unresolved_no_visibility',
        }),
      ],
      opt_out_scope: 'question',
    })
    const result = evaluateGate1(su)
    expect(result.state).toBe('not_applicable_declined')
    expect(result.reason_code).toBe('DECLINED_BEFORE_MINIMUM_UNDERSTANDING')
    // The specific blocking mention must survive even though the reason_code
    // is decline-driven -- this is the exact case that was previously
    // collapsed into a generic 'tool_identity_or_production_step' placeholder.
    expect(result.unresolved_fields).toEqual(['tool_mentions.tm-1'])
  })

  test('a decline that happens AFTER minimum understanding was already reached does not retroactively unmet Gate 1', () => {
    const su = baseSU({
      tool_mentions: [toolMention({ mention_id: 'tm-1', resolution: { kind: 'canonical', identifier: 'runway-gen3' } })],
      opt_out_scope: 'question', // user declined something unrelated afterward
    })
    const result = evaluateGate1(su)
    expect(result.state).toBe('met')
  })

  test('late correction changes Gate 1 from pass to fail', () => {
    const passing = baseSU({
      tool_mentions: [toolMention({ mention_id: 'tm-1', resolution: { kind: 'canonical', identifier: 'kling' } })],
    })
    expect(evaluateGate1(passing).state).toBe('met')

    // Simulate a late correction: the same tool identity is walked back to
    // ambiguous via supersession (superseding tm-1 with a new, unresolved
    // mention), exactly the "late correction" shape -- the evaluator is a
    // pure function of current state, so it re-evaluates correctly with no
    // special-casing needed.
    const corrected = baseSU({
      tool_mentions: [
        { ...passing.tool_mentions[0], superseded_by: 'tm-2' },
        toolMention({
          mention_id: 'tm-2',
          resolution: { kind: 'unresolved_alias', raw_name: 'Kling or Runway, not sure' },
          confidence: 'unresolved_no_visibility',
          source_turn: 2,
        }),
      ],
    })
    const result = evaluateGate1(corrected)
    expect(result.state).toBe('not_met')
    expect(result.reason_code).toBe('AMBIGUOUS_TOOL_SURFACE_UNRESOLVED')
  })
})

describe('evaluateGate2', () => {
  test('material new information: not_yet_stable', () => {
    const previous = baseSU({
      tool_mentions: [toolMention({ mention_id: 'tm-1', resolution: { kind: 'canonical', identifier: 'runway-gen3' } })],
    })
    const current = baseSU({
      tool_mentions: previous.tool_mentions,
      scoped_observations: [observation({ observation_id: 'so-1', workflow_stage: 'T2', note: 'Legal reviewed it.' })],
    })
    const result = evaluateGate2(previous, current)
    expect(result.state).toBe('not_yet_stable')
    expect(result.reason_code).toBe('MATERIAL_CHANGE_DETECTED')
    expect(result.changed_fields).toContain('scoped_observations.so-1 (new)')
  })

  test('duplicate/restated information (note text only): stable', () => {
    const previous = baseSU({
      scoped_observations: [observation({ observation_id: 'so-1', confidence: 'confirmed', note: 'We used Runway.' })],
    })
    const current = baseSU({
      scoped_observations: [
        observation({ observation_id: 'so-1', confidence: 'confirmed', note: 'Yeah, definitely Runway, like I said.' }),
      ],
    })
    const result = evaluateGate2(previous, current)
    expect(result.state).toBe('stable')
    expect(result.reason_code).toBe('NO_MATERIAL_CHANGE')
  })

  test('confidence-only improvement (supersession to higher certainty): not_yet_stable', () => {
    const previous = baseSU({
      scoped_observations: [
        observation({ observation_id: 'so-1', confidence: 'unresolved_no_visibility', note: 'Not sure which plan.' }),
      ],
    })
    const current = baseSU({
      scoped_observations: [
        { ...previous.scoped_observations[0], superseded_by: 'so-2' },
        observation({ observation_id: 'so-2', confidence: 'confirmed', note: 'Confirmed: team plan.', source_turn: 2 }),
      ],
    })
    const result = evaluateGate2(previous, current)
    expect(result.state).toBe('not_yet_stable')
    expect(result.reason_code).toBe('MATERIAL_CHANGE_DETECTED')
  })

  test('ambiguity resolution (unresolved_alias -> canonical): not_yet_stable', () => {
    const previous = baseSU({
      tool_mentions: [
        toolMention({
          mention_id: 'tm-1',
          resolution: { kind: 'unresolved_alias', raw_name: 'Nano Banana' },
          confidence: 'unresolved_no_visibility',
        }),
      ],
    })
    const current = baseSU({
      tool_mentions: [
        { ...previous.tool_mentions[0], superseded_by: 'tm-2' },
        toolMention({ mention_id: 'tm-2', resolution: { kind: 'canonical', identifier: 'gemini-api' }, source_turn: 2 }),
      ],
    })
    const result = evaluateGate2(previous, current)
    expect(result.state).toBe('not_yet_stable')
    expect(result.changed_fields).toContain('tool_mentions.tm-2 (new)')
  })

  test('repeated uncertainty (same confidence restated): stable', () => {
    const previous = baseSU({
      scoped_observations: [observation({ observation_id: 'so-1', confidence: 'unknown', note: "Not sure." })],
    })
    const current = baseSU({
      scoped_observations: [observation({ observation_id: 'so-1', confidence: 'unknown', note: "Still not sure, sorry." })],
    })
    const result = evaluateGate2(previous, current)
    expect(result.state).toBe('stable')
  })

  test('correction after apparent Gate 2 stability: stable, then destabilized by the next turn', () => {
    const turn1 = baseSU({
      scoped_observations: [observation({ observation_id: 'so-1', confidence: 'confirmed', note: 'Used Runway.' })],
    })
    const turn2 = baseSU({
      scoped_observations: [
        observation({ observation_id: 'so-1', confidence: 'confirmed', note: 'Used Runway, yes.' }),
      ],
    })
    expect(evaluateGate2(turn1, turn2).state).toBe('stable')

    const turn3 = baseSU({
      scoped_observations: [
        { ...turn2.scoped_observations[0], superseded_by: 'so-2' },
        observation({
          observation_id: 'so-2',
          confidence: 'confirmed',
          note: 'Actually, wait, it was Kling, not Runway.',
          source_turn: 3,
        }),
      ],
    })
    const result = evaluateGate2(turn2, turn3)
    expect(result.state).toBe('not_yet_stable')
    expect(result.reason_code).toBe('MATERIAL_CHANGE_DETECTED')
  })

  test('phase-level stability vs. whole-interview stability: a workflow_role change is stable in phase scope, not in interview scope', () => {
    const previous = baseSU({ project_facts: projectFacts({ workflow_role: { state: 'confirmed', value: 'Editor' } }) })
    const current = baseSU({ project_facts: projectFacts({ workflow_role: { state: 'confirmed', value: 'Producer' } }) })

    const phaseResult = evaluateGate2(previous, current, 'phase')
    expect(phaseResult.state).toBe('stable')

    const interviewResult = evaluateGate2(previous, current, 'interview')
    expect(interviewResult.state).toBe('not_yet_stable')
    expect(interviewResult.changed_fields).toContain('project_facts.workflow_role')
  })

  test('decline is never treated as Gate 2 stability, even with no other tracked field change', () => {
    const previous = baseSU({
      tool_mentions: [toolMention({ mention_id: 'tm-1', resolution: { kind: 'canonical', identifier: 'runway-gen3' } })],
      opt_out_scope: null,
    })
    const current = baseSU({
      tool_mentions: previous.tool_mentions, // structurally identical tool_mentions
      opt_out_scope: 'question', // only the decline changed
    })
    const result = evaluateGate2(previous, current)
    expect(result.state).toBe('not_yet_stable')
    expect(result.reason_code).toBe('DECLINE_BLOCKS_STABILITY')
    expect(result.state).not.toBe('stable')
  })
})
