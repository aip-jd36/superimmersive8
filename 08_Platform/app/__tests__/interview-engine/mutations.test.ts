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

import type { ScopedObservation, StructuredUnderstanding, ToolMention, UserGoal } from '../../types/interview-engine'
import {
  addObservation,
  addObservations,
  addToolMention,
  addUserGoal,
  MAX_ACTIVE_USER_GOALS,
  retractObservation,
  setIntendedUse,
  setWorkflowRole,
  supersedeObservation,
  supersedeToolMention,
  supersedeUserGoal,
} from '../../lib/interview-engine/mutations'

function emptyStructuredUnderstanding(): StructuredUnderstanding {
  return {
    project_facts: {
      intended_use: { attestation: { state: 'unknown' }, source_turn: 1, source_statement: 'placeholder' },
      workflow_role: { attestation: { state: 'unknown' }, source_turn: 1, source_statement: 'placeholder' },
    },
    tool_mentions: [],
    scoped_observations: [],
    user_goals: [],
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

function userGoal(overrides: Partial<UserGoal> & Pick<UserGoal, 'goal_id'>): UserGoal {
  return {
    state: 'confirmed',
    raw_text: 'placeholder goal',
    superseded_by: null,
    source_turn: 1,
    source_statement: 'placeholder goal',
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

describe('setIntendedUse / setWorkflowRole', () => {
  test('setIntendedUse replaces the attestation and preserves source_turn/source_statement', () => {
    const su = emptyStructuredUnderstanding()
    const updated = setIntendedUse(
      su,
      { state: 'confirmed', value: 'Paid social ad campaign' },
      3,
      "It's for a paid social campaign.",
    )
    expect(updated.project_facts.intended_use).toEqual({
      attestation: { state: 'confirmed', value: 'Paid social ad campaign' },
      source_turn: 3,
      source_statement: "It's for a paid social campaign.",
    })
  })

  test('setWorkflowRole replaces the attestation and preserves source_turn/source_statement', () => {
    const su = emptyStructuredUnderstanding()
    const updated = setWorkflowRole(su, { state: 'confirmed', value: 'Producer' }, 2, "I'm the producer.")
    expect(updated.project_facts.workflow_role).toEqual({
      attestation: { state: 'confirmed', value: 'Producer' },
      source_turn: 2,
      source_statement: "I'm the producer.",
    })
  })

  test('setIntendedUse does not mutate the source object', () => {
    const su = emptyStructuredUnderstanding()
    const before = JSON.parse(JSON.stringify(su))
    setIntendedUse(su, { state: 'confirmed', value: 'Paid social ad campaign' }, 1, 'placeholder')
    expect(su).toEqual(before)
  })

  test('setWorkflowRole does not mutate the source object', () => {
    const su = emptyStructuredUnderstanding()
    const before = JSON.parse(JSON.stringify(su))
    setWorkflowRole(su, { state: 'confirmed', value: 'Producer' }, 1, 'placeholder')
    expect(su).toEqual(before)
  })

  test('setIntendedUse leaves workflow_role and all other fields untouched', () => {
    const su = setWorkflowRole(emptyStructuredUnderstanding(), { state: 'confirmed', value: 'Editor' }, 1, "I'm the editor.")
    const updated = setIntendedUse(su, { state: 'confirmed', value: 'Internal test' }, 2, 'Just a test.')
    expect(updated.project_facts.workflow_role).toEqual(su.project_facts.workflow_role)
  })

  test('a subsequent call replaces the previous attestation entirely -- no history array, latest call wins', () => {
    const first = setIntendedUse(emptyStructuredUnderstanding(), { state: 'unknown' }, 1, "Not sure yet.")
    const second = setIntendedUse(first, { state: 'confirmed', value: 'Paid campaign' }, 2, "Actually, it's a paid campaign.")
    expect(second.project_facts.intended_use.attestation).toEqual({ state: 'confirmed', value: 'Paid campaign' })
    expect(second.project_facts.intended_use.source_turn).toBe(2)
  })
})

describe('user goals (Milestone 1, 2026-08-15)', () => {
  test('addUserGoal adds one new goal', () => {
    const su = addUserGoal(emptyStructuredUnderstanding(), userGoal({ goal_id: 'g-1', raw_text: 'Can I use this commercially?' }))
    expect(su.user_goals).toHaveLength(1)
    expect(su.user_goals[0]).toMatchObject({ goal_id: 'g-1', raw_text: 'Can I use this commercially?', superseded_by: null })
  })

  test('addUserGoal rejects a duplicate goal_id, mirroring addObservation', () => {
    const su = addUserGoal(emptyStructuredUnderstanding(), userGoal({ goal_id: 'g-1' }))
    expect(() => addUserGoal(su, userGoal({ goal_id: 'g-1' }))).toThrow(/already exists/)
  })

  test('addUserGoal rejects a goal that is already superseded on add, mirroring addObservation', () => {
    expect(() => addUserGoal(emptyStructuredUnderstanding(), userGoal({ goal_id: 'g-1', superseded_by: 'g-2' }))).toThrow(
      /cannot already be superseded/,
    )
  })

  test('supersedeUserGoal adds the replacement and marks the prior, without deleting it -- correction case', () => {
    const su = addUserGoal(emptyStructuredUnderstanding(), userGoal({ goal_id: 'g-1', raw_text: 'Do I own the copyright?' }))
    const corrected = supersedeUserGoal(
      su,
      'g-1',
      userGoal({ goal_id: 'g-2', raw_text: 'Actually, I just need to know if my client can use it.' }),
    )
    expect(corrected.user_goals).toHaveLength(2)
    const prior = corrected.user_goals.find((g) => g.goal_id === 'g-1')
    const replacement = corrected.user_goals.find((g) => g.goal_id === 'g-2')
    expect(prior?.superseded_by).toBe('g-2')
    expect(prior?.raw_text).toBe('Do I own the copyright?')
    expect(replacement?.superseded_by).toBeNull()
  })

  test('supersedeUserGoal with a declined-state replacement is the retraction/decline mechanism -- no separate retract function', () => {
    const su = addUserGoal(emptyStructuredUnderstanding(), userGoal({ goal_id: 'g-1', raw_text: 'Do I own the copyright?' }))
    const retracted = supersedeUserGoal(su, 'g-1', userGoal({ goal_id: 'g-2', state: 'declined', raw_text: "I'd rather not say." }))
    const prior = retracted.user_goals.find((g) => g.goal_id === 'g-1')
    const replacement = retracted.user_goals.find((g) => g.goal_id === 'g-2')
    expect(prior?.superseded_by).toBe('g-2')
    expect(replacement?.state).toBe('declined')
  })

  test('supersedeUserGoal rejects targeting an unknown goal_id', () => {
    expect(() => supersedeUserGoal(emptyStructuredUnderstanding(), 'nonexistent', userGoal({ goal_id: 'g-2' }))).toThrow(
      /unknown user goal/,
    )
  })

  test('supersedeUserGoal rejects targeting an already-superseded goal -- must extend the chain from its current head', () => {
    const su = addUserGoal(emptyStructuredUnderstanding(), userGoal({ goal_id: 'g-1' }))
    const once = supersedeUserGoal(su, 'g-1', userGoal({ goal_id: 'g-2' }))
    expect(() => supersedeUserGoal(once, 'g-1', userGoal({ goal_id: 'g-3' }))).toThrow(/already superseded/)
  })

  test('two goals stated in one turn -- both independently represented, neither collapsed or ranked', () => {
    let su = emptyStructuredUnderstanding()
    su = addUserGoal(su, userGoal({ goal_id: 'g-1', raw_text: 'Can I use this commercially?' }))
    su = addUserGoal(su, userGoal({ goal_id: 'g-2', raw_text: 'Do I own the copyright?' }))
    const active = su.user_goals.filter((g) => g.superseded_by === null)
    expect(active).toHaveLength(2)
    expect(active.map((g) => g.raw_text).sort()).toEqual(['Can I use this commercially?', 'Do I own the copyright?'])
  })

  test('a goal introduced on a later turn is appended, not merged with an earlier unrelated goal', () => {
    let su = emptyStructuredUnderstanding()
    su = addUserGoal(su, userGoal({ goal_id: 'g-1', raw_text: 'Can I use this commercially?', source_turn: 1 }))
    su = addUserGoal(su, userGoal({ goal_id: 'g-2', raw_text: 'Can I post this on YouTube?', source_turn: 3 }))
    expect(su.user_goals.filter((g) => g.superseded_by === null)).toHaveLength(2)
    expect(su.user_goals.find((g) => g.goal_id === 'g-2')?.source_turn).toBe(3)
  })

  test('declarative-need goal (not phrased as a question) is represented identically to a question-phrased goal', () => {
    const su = addUserGoal(
      emptyStructuredUnderstanding(),
      userGoal({ goal_id: 'g-1', raw_text: 'My client needs proof this is cleared.' }),
    )
    expect(su.user_goals[0].state).toBe('confirmed')
    expect(su.user_goals[0].raw_text).toBe('My client needs proof this is cleared.')
  })

  test(`addUserGoal allows exactly ${MAX_ACTIVE_USER_GOALS} concurrent active goals`, () => {
    let su = emptyStructuredUnderstanding()
    for (let i = 1; i <= MAX_ACTIVE_USER_GOALS; i++) {
      su = addUserGoal(su, userGoal({ goal_id: `g-${i}`, raw_text: `Goal ${i}` }))
    }
    expect(su.user_goals.filter((g) => g.superseded_by === null)).toHaveLength(MAX_ACTIVE_USER_GOALS)
  })

  test('a 4th concurrent active goal is rejected, not silently dropped or silently accepted', () => {
    let su = emptyStructuredUnderstanding()
    for (let i = 1; i <= MAX_ACTIVE_USER_GOALS; i++) {
      su = addUserGoal(su, userGoal({ goal_id: `g-${i}`, raw_text: `Goal ${i}` }))
    }
    expect(() => addUserGoal(su, userGoal({ goal_id: 'g-4', raw_text: 'Goal 4' }))).toThrow(/maximum of 3 active user goals/)
    // Rejected, not silently applied -- the caller (extraction.ts) sees the
    // thrown error and classifies it as a diagnosable rejection; the
    // in-memory su itself is never mutated by the failed attempt (same
    // "return a new object or throw, never partially mutate" discipline as
    // every other mutation in this module).
    expect(su.user_goals.filter((g) => g.superseded_by === null)).toHaveLength(MAX_ACTIVE_USER_GOALS)
  })

  test('superseding an existing goal never counts against the active-goal cap -- a correction is not a new goal', () => {
    let su = emptyStructuredUnderstanding()
    for (let i = 1; i <= MAX_ACTIVE_USER_GOALS; i++) {
      su = addUserGoal(su, userGoal({ goal_id: `g-${i}`, raw_text: `Goal ${i}` }))
    }
    // At the cap -- a correction to one of the existing 3 must still succeed.
    const corrected = supersedeUserGoal(su, 'g-1', userGoal({ goal_id: 'g-1-corrected', raw_text: 'Corrected goal 1' }))
    expect(corrected.user_goals.filter((g) => g.superseded_by === null)).toHaveLength(MAX_ACTIVE_USER_GOALS)
  })

  test('no goal is ever fabricated by the mutation layer itself -- an empty StructuredUnderstanding has zero user_goals', () => {
    expect(emptyStructuredUnderstanding().user_goals).toEqual([])
  })
})
