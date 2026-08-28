/**
 * Signal lineage resolution tests (CRC_PROTOTYPE_ALPHA_ROADMAP.md Phase 7,
 * JD instruction 2026-08-08 item 3). Covers exactly the 5 required cases:
 * first follow-up on a signal; that signal superseded; the replacement
 * targeted by a second follow-up; the second follow-up blocked because it
 * belongs to the same lineage; a genuinely unrelated signal keeping its own
 * independent allowance. boundaries.ts is exercised entirely unmodified --
 * only resolveLineageRoot's output is fed into it.
 */

import { resolveLineageRoot } from '@/lib/interview-engine/signal-lineage'
import { createInitialBoundaryState, evaluateBoundary } from '@/lib/interview-engine/boundaries'
import type { StructuredUnderstanding, ToolMention } from '@/types/interview-engine'

function su(overrides: Partial<StructuredUnderstanding> = {}): StructuredUnderstanding {
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

function toolMention(overrides: Partial<ToolMention> & Pick<ToolMention, 'mention_id'>): ToolMention {
  return {
    resolution: { kind: 'unresolved_alias', raw_name: 'Nano Banana' },
    access_surface: { state: 'unknown' },
    plan_tier: { state: 'unknown' },
    account_status: { state: 'unknown' },
    confidence: 'unresolved_no_visibility',
    source_turn: 1,
    source_statement: 'placeholder',
    superseded_by: null,
    ...overrides,
  }
}

describe('resolveLineageRoot (pure function)', () => {
  test('an id with no supersession history resolves to itself', () => {
    const state = su({ tool_mentions: [toolMention({ mention_id: 'tm-1' })] })
    expect(resolveLineageRoot(state, 'tm-1')).toBe('tm-1')
  })

  test('a single-hop supersession resolves to the original root', () => {
    const state = su({
      tool_mentions: [
        toolMention({ mention_id: 'tm-1', superseded_by: 'tm-2' }),
        toolMention({ mention_id: 'tm-2' }),
      ],
    })
    expect(resolveLineageRoot(state, 'tm-2')).toBe('tm-1')
  })

  test('a multi-hop chain (3 supersessions) still resolves to the original root', () => {
    const state = su({
      tool_mentions: [
        toolMention({ mention_id: 'tm-1', superseded_by: 'tm-2' }),
        toolMention({ mention_id: 'tm-2', superseded_by: 'tm-3' }),
        toolMention({ mention_id: 'tm-3', superseded_by: 'tm-4' }),
        toolMention({ mention_id: 'tm-4' }),
      ],
    })
    expect(resolveLineageRoot(state, 'tm-4')).toBe('tm-1')
  })

  test('a scoped_observation lineage resolves the same way as a tool_mention lineage', () => {
    const state = su({
      scoped_observations: [
        { observation_id: 'so-1', scope: 'current_project', workflow_stage: null, confidence: 'unresolved_no_visibility', status: null, note: '', superseded_by: 'so-2', source_turn: 1, source_statement: '' },
        { observation_id: 'so-2', scope: 'current_project', workflow_stage: null, confidence: 'confirmed', status: null, note: '', superseded_by: null, source_turn: 2, source_statement: '' },
      ],
    })
    expect(resolveLineageRoot(state, 'so-2')).toBe('so-1')
  })

  test('project fact signal ids never supersede and resolve to themselves', () => {
    const state = su()
    expect(resolveLineageRoot(state, 'project:intended_use')).toBe('project:intended_use')
    expect(resolveLineageRoot(state, 'project:workflow_role')).toBe('project:workflow_role')
  })

  test('an unrelated, unknown id resolves to itself (no lineage found)', () => {
    const state = su({ tool_mentions: [toolMention({ mention_id: 'tm-1' })] })
    expect(resolveLineageRoot(state, 'tm-99')).toBe('tm-99')
  })

  // Duplicate-Question Prevention milestone (2026-08-19). AssetProviderMention
  // became an eligible candidate-question signal this milestone -- proves the
  // exact same lineage-walk now applies to it, closing the "fresh id reopens
  // a capped need" loophole (implementation task §13) for asset providers
  // specifically, not just tool_mentions/scoped_observations.
  test('an asset_provider_mention lineage resolves the same way as a tool_mention lineage', () => {
    const state = su({
      asset_provider_mentions: [
        { mention_id: 'ap-1', resolution: { kind: 'unresolved_alias', raw_name: 'some stock site' }, confidence: 'unresolved_no_visibility', superseded_by: 'ap-2', source_turn: 1, source_statement: '', usage: { state: 'unknown' }, license: { state: 'unknown' } },
        { mention_id: 'ap-2', resolution: { kind: 'canonical', identifier: 'istock' }, confidence: 'confirmed', superseded_by: null, source_turn: 3, source_statement: '', usage: { state: 'unknown' }, license: { state: 'unknown' } },
      ],
    })
    expect(resolveLineageRoot(state, 'ap-2')).toBe('ap-1')
  })

  test('a follow_up_need cap keyed to the ORIGINAL asset_provider_mention id is still enforced after the mention is superseded and restated -- the actual signal-ID-restatement regression (§13)', () => {
    let state = createInitialBoundaryState()
    const first = evaluateBoundary(state, { kind: 'follow_up_on_signal', signal_id: 'ap-1', follow_up_need: 'asset_provider_usage', phase: 2 })
    expect(first.allowed).toBe(true)
    state = first.next_state

    // ap-1 (the mention the first follow-up was asked against) gets
    // superseded by ap-2 -- the extractor minted a fresh id when the user
    // restated/added detail, exactly the Diagnostic §13 scenario.
    const suAfterRestatement = su({
      asset_provider_mentions: [
        { mention_id: 'ap-1', resolution: { kind: 'canonical', identifier: 'istock' }, confidence: 'confirmed', superseded_by: 'ap-2', source_turn: 1, source_statement: '', usage: { state: 'unknown' }, license: { state: 'unknown' } },
        { mention_id: 'ap-2', resolution: { kind: 'canonical', identifier: 'istock' }, confidence: 'confirmed', superseded_by: null, source_turn: 3, source_statement: '', usage: { state: 'unknown' }, license: { state: 'unknown' } },
      ],
    })
    const resolvedRoot = resolveLineageRoot(suAfterRestatement, 'ap-2')
    expect(resolvedRoot).toBe('ap-1')

    // A new candidate targeting the FRESH id, lineage-resolved back to the
    // original root, is still blocked -- the fresh id does NOT reopen the
    // already-satisfied need.
    const second = evaluateBoundary(state, { kind: 'follow_up_on_signal', signal_id: resolvedRoot, follow_up_need: 'asset_provider_usage', phase: 2 })
    expect(second.allowed).toBe(false)
    expect(second.reason_code).toBe('FOLLOW_UP_NEED_ALREADY_ASKED')
  })
})

describe('boundary caps follow lineage, not record id (JD 5-case requirement, 2026-08-08)', () => {
  test('1: signal receives first follow-up -- allowed, cap consumed', () => {
    const state = createInitialBoundaryState()
    const result = evaluateBoundary(state, { kind: 'follow_up_on_signal', signal_id: 'tm-1', phase: 2 })
    expect(result.allowed).toBe(true)
    expect(result.next_state.follow_ups_used['tm-1']).toBe(1)
  })

  test('2 + 3: signal is superseded, replacement targeted -- lineage resolves back to the original root', () => {
    const suAfterSupersession = su({
      tool_mentions: [
        toolMention({ mention_id: 'tm-1', superseded_by: 'tm-2-resolved' }),
        toolMention({ mention_id: 'tm-2-resolved', resolution: { kind: 'canonical', identifier: 'gemini-api' } }),
      ],
    })
    expect(resolveLineageRoot(suAfterSupersession, 'tm-2-resolved')).toBe('tm-1')
  })

  test('4: second follow-up on the replacement is BLOCKED -- resolves to the same lineage root whose cap is already spent', () => {
    let state = createInitialBoundaryState()
    const first = evaluateBoundary(state, { kind: 'follow_up_on_signal', signal_id: 'tm-1', phase: 2 })
    expect(first.allowed).toBe(true)
    state = first.next_state

    const suAfterSupersession = su({
      tool_mentions: [
        toolMention({ mention_id: 'tm-1', superseded_by: 'tm-2-resolved' }),
        toolMention({ mention_id: 'tm-2-resolved', resolution: { kind: 'canonical', identifier: 'gemini-api' } }),
      ],
    })
    const resolvedRoot = resolveLineageRoot(suAfterSupersession, 'tm-2-resolved')
    expect(resolvedRoot).toBe('tm-1')

    const second = evaluateBoundary(state, { kind: 'follow_up_on_signal', signal_id: resolvedRoot, phase: 2 })
    expect(second.allowed).toBe(false)
    expect(second.reason_code).toBe('FOLLOW_UP_CAP_REACHED')
  })

  test('5: a genuinely unrelated signal still has its own independent allowance', () => {
    let state = createInitialBoundaryState()
    const first = evaluateBoundary(state, { kind: 'follow_up_on_signal', signal_id: 'tm-1', phase: 2 })
    state = first.next_state

    // tm-9 shares no lineage with tm-1 -- resolves to itself.
    const suUnrelated = su({ tool_mentions: [toolMention({ mention_id: 'tm-1' }), toolMention({ mention_id: 'tm-9' })] })
    expect(resolveLineageRoot(suUnrelated, 'tm-9')).toBe('tm-9')

    const third = evaluateBoundary(state, { kind: 'follow_up_on_signal', signal_id: 'tm-9', phase: 2 })
    expect(third.allowed).toBe(true)
  })

  test('supersession never merges or removes the underlying records -- both remain independently present and auditable', () => {
    const state = su({
      tool_mentions: [
        toolMention({ mention_id: 'tm-1', superseded_by: 'tm-2-resolved' }),
        toolMention({ mention_id: 'tm-2-resolved', resolution: { kind: 'canonical', identifier: 'gemini-api' } }),
      ],
    })
    expect(state.tool_mentions).toHaveLength(2)
    expect(state.tool_mentions.find((m) => m.mention_id === 'tm-1')?.superseded_by).toBe('tm-2-resolved')
    expect(state.tool_mentions.find((m) => m.mention_id === 'tm-2-resolved')?.superseded_by).toBeNull()
  })
})
