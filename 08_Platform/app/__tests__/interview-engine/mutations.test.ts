/**
 * Unit tests for the mutation and supersession engine
 * (CRC_PROTOTYPE_ALPHA_ROADMAP.md Phase 2 test strategy).
 *
 * Covers, each as its own case per the roadmap's explicit list:
 *   - correction and supersession (new added, prior marked, not deleted)
 *   - multiple observations extracted from one bundled answer (Dialogue F)
 *   - current-vs-historical scope preserved separately (Dialogue C)
 *   - absent vs. unknown vs. declined resolve to distinct confidence values
 *
 * Plus closes two gaps flagged in the Phase 1 post-completion review:
 *   - ToolMention supersession (previously fixture-demonstrated only)
 *   - multiple-observations-per-turn (previously fixture-demonstrated only)
 *
 * Run: npx jest __tests__/interview-engine/mutations.test.ts
 */

import type { ScopedObservation, StructuredUnderstanding, ToolMention } from '../../types/interview-engine'
import {
  addObservation,
  addObservations,
  addToolMention,
  retractObservation,
  supersedeObservation,
  supersedeToolMention,
} from '../../lib/interview-engine/mutations'

function emptyStructuredUnderstanding(): StructuredUnderstanding {
  return {
    project_facts: {
      intended_use: { state: 'unknown' },
      workflow_role: { state: 'unknown' },
    },
    tool_mentions: [],
    scoped_observations: [],
    current_phase: 1,
    gate_1_state: 'not_met',
    gate_2_state: 'not_yet_stable',
    completion_reason: null,
    opt_out_scope: null,
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

describe('correction and supersession', () => {
  test('supersedeObservation adds the replacement and marks the prior, without deleting it', () => {
    const su = addObservation(
      emptyStructuredUnderstanding(),
      observation({ observation_id: 'so-1', note: 'We used Kling.', source_turn: 1 }),
    )

    const corrected = supersedeObservation(
      su,
      'so-1',
      observation({ observation_id: 'so-2', note: 'Actually, we used Runway.', source_turn: 2 }),
    )

    expect(corrected.scoped_observations).toHaveLength(2)
    const prior = corrected.scoped_observations.find((o) => o.observation_id === 'so-1')
    const replacement = corrected.scoped_observations.find((o) => o.observation_id === 'so-2')
    expect(prior).toBeDefined()
    expect(prior?.note).toBe('We used Kling.')
    expect(prior?.superseded_by).toBe('so-2')
    expect(replacement?.superseded_by).toBeNull()
  })

  test('supersedeObservation throws when the target does not exist', () => {
    const su = emptyStructuredUnderstanding()
    expect(() =>
      supersedeObservation(su, 'does-not-exist', observation({ observation_id: 'so-2' })),
    ).toThrow(/unknown observation/)
  })

  test('supersedeObservation throws when the target is already superseded (must chain off the current head)', () => {
    let su = addObservation(emptyStructuredUnderstanding(), observation({ observation_id: 'so-1' }))
    su = supersedeObservation(su, 'so-1', observation({ observation_id: 'so-2' }))

    expect(() =>
      supersedeObservation(su, 'so-1', observation({ observation_id: 'so-3' })),
    ).toThrow(/already superseded/)
  })

  test('retractObservation supersedes with a low-certainty replacement rather than deleting', () => {
    const su = addObservation(
      emptyStructuredUnderstanding(),
      observation({ observation_id: 'so-1', confidence: 'confirmed', note: 'We used Kling.' }),
    )

    const retracted = retractObservation(su, 'so-1', {
      observation_id: 'so-1-retracted',
      source_turn: 2,
      source_statement: 'Actually, forget what I said about that.',
      note: 'User retracted the earlier tool claim without offering a replacement.',
    })

    const prior = retracted.scoped_observations.find((o) => o.observation_id === 'so-1')
    const replacement = retracted.scoped_observations.find((o) => o.observation_id === 'so-1-retracted')
    expect(prior?.superseded_by).toBe('so-1-retracted')
    expect(replacement?.confidence).toBe('unknown')
  })
})

describe('multiple observations from one bundled answer (Dialogue F shape)', () => {
  test('addObservations adds all of them, distinct and unmerged, sharing the same source_turn', () => {
    const su = addObservations(emptyStructuredUnderstanding(), [
      observation({ observation_id: 'so-1', note: 'Visuals via Runway.', source_turn: 3 }),
      observation({ observation_id: 'so-2', note: 'Voiceover via ElevenLabs.', source_turn: 3 }),
      observation({ observation_id: 'so-3', note: 'Legal already signed off.', source_turn: 3 }),
    ])

    expect(su.scoped_observations).toHaveLength(3)
    expect(su.scoped_observations.every((o) => o.source_turn === 3)).toBe(true)
    expect(new Set(su.scoped_observations.map((o) => o.observation_id)).size).toBe(3)
  })
})

describe('current-vs-historical scope preserved separately (Dialogue C shape)', () => {
  test('adding a current_project and a historical_project observation never merges or overwrites either', () => {
    let su = addObservation(
      emptyStructuredUnderstanding(),
      observation({ observation_id: 'so-current', scope: 'current_project', note: 'No review on this one.' }),
    )
    su = addObservation(
      su,
      observation({ observation_id: 'so-historical', scope: 'historical_project', note: 'A past project was reviewed.' }),
    )

    expect(su.scoped_observations).toHaveLength(2)
    const current = su.scoped_observations.find((o) => o.observation_id === 'so-current')
    const historical = su.scoped_observations.find((o) => o.observation_id === 'so-historical')
    expect(current?.scope).toBe('current_project')
    expect(historical?.scope).toBe('historical_project')
  })
})

describe('absent vs. unknown vs. declined resolve to distinct confidence values', () => {
  test('a clean "no", a genuine "I don\'t know", and an explicit refusal produce three distinct confidence states', () => {
    const su = addObservations(emptyStructuredUnderstanding(), [
      observation({ observation_id: 'so-absent', confidence: 'confirmed_absent', note: 'No, nobody reviewed it.' }),
      observation({ observation_id: 'so-unknown', confidence: 'unknown', note: "Honestly, no idea." }),
      observation({ observation_id: 'so-declined', confidence: 'declined', note: "I'd rather not say." }),
    ])

    const byId = Object.fromEntries(su.scoped_observations.map((o) => [o.observation_id, o.confidence]))
    expect(byId['so-absent']).toBe('confirmed_absent')
    expect(byId['so-unknown']).toBe('unknown')
    expect(byId['so-declined']).toBe('declined')
    expect(new Set(Object.values(byId)).size).toBe(3)
  })
})

describe('ToolMention supersession (closes Phase 1 review gap)', () => {
  test('supersedeToolMention resolves an unresolved alias to a canonical identifier, keeping the original', () => {
    const su = addToolMention(
      emptyStructuredUnderstanding(),
      toolMention({
        mention_id: 'tm-1',
        resolution: { kind: 'unresolved_alias', raw_name: 'Nano Banana' },
        confidence: 'unresolved_no_visibility',
      }),
    )

    const resolved = supersedeToolMention(
      su,
      'tm-1',
      toolMention({
        mention_id: 'tm-2',
        resolution: { kind: 'canonical', identifier: 'gemini-api' },
        confidence: 'confirmed',
        source_turn: 2,
      }),
    )

    expect(resolved.tool_mentions).toHaveLength(2)
    const original = resolved.tool_mentions.find((m) => m.mention_id === 'tm-1')
    const canonical = resolved.tool_mentions.find((m) => m.mention_id === 'tm-2')
    expect(original?.resolution).toEqual({ kind: 'unresolved_alias', raw_name: 'Nano Banana' })
    expect(original?.superseded_by).toBe('tm-2')
    expect(canonical?.resolution).toEqual({ kind: 'canonical', identifier: 'gemini-api' })
  })

  test('supersedeToolMention throws when the target is already superseded', () => {
    let su = addToolMention(
      emptyStructuredUnderstanding(),
      toolMention({ mention_id: 'tm-1', resolution: { kind: 'unresolved_alias', raw_name: 'Nano Banana' } }),
    )
    su = supersedeToolMention(
      su,
      'tm-1',
      toolMention({ mention_id: 'tm-2', resolution: { kind: 'canonical', identifier: 'gemini-api' } }),
    )

    expect(() =>
      supersedeToolMention(
        su,
        'tm-1',
        toolMention({ mention_id: 'tm-3', resolution: { kind: 'canonical', identifier: 'gemini-consumer-app' } }),
      ),
    ).toThrow(/already superseded/)
  })
})
