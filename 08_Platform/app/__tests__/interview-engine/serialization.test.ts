/**
 * Serialization round-trip tests, including the Milestone 1 (2026-08-15)
 * backward-compatibility requirement: a session persisted before
 * `user_goals` existed on StructuredUnderstanding must still deserialize
 * safely, with `user_goals` defaulted to `[]` rather than `undefined` --
 * see serialization.ts's own deserializeStructuredUnderstanding for the
 * fix this tests.
 */

import { deserializeStructuredUnderstanding, serializeStructuredUnderstanding } from '../../lib/interview-engine/serialization'
import type { StructuredUnderstanding } from '../../types/interview-engine'

function currentSU(): StructuredUnderstanding {
  return {
    project_facts: {
      intended_use: { attestation: { state: 'confirmed', value: 'AI commercial for my client' }, source_turn: 1, source_statement: 'placeholder' },
      workflow_role: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
    },
    tool_mentions: [],
    scoped_observations: [],
    user_goals: [{ goal_id: 'g-1', state: 'confirmed', raw_text: 'Can I use this commercially?', category: 'unknown', scope: 'informational', superseded_by: null, source_turn: 1, source_statement: 'placeholder' }],
    current_phase: 1,
    gate_1_state: 'not_met',
    gate_2_state: 'not_yet_stable',
    completion_reason: null,
    opt_out_scope: null,
  }
}

describe('serializeStructuredUnderstanding / deserializeStructuredUnderstanding', () => {
  test('a current-shape session round-trips losslessly, including user_goals', () => {
    const su = currentSU()
    const roundTripped = deserializeStructuredUnderstanding(serializeStructuredUnderstanding(su))
    expect(roundTripped).toEqual(su)
  })

  test('a historical session JSON predating user_goals deserializes with user_goals defaulted to [], not undefined', () => {
    const historicalShape = currentSU()
    // Simulate a real pre-Milestone-1 row: build the JSON by hand, WITHOUT
    // a user_goals key at all -- not simply `{ ...su, user_goals: undefined }`,
    // since JSON.stringify would already drop an explicit undefined key,
    // but a real historical Supabase row genuinely never had the key.
    const { user_goals: _omitted, ...withoutUserGoals } = historicalShape
    const historicalJson = JSON.stringify(withoutUserGoals)
    expect(historicalJson).not.toContain('user_goals')

    const deserialized = deserializeStructuredUnderstanding(historicalJson)
    expect(deserialized.user_goals).toEqual([])
    expect(Array.isArray(deserialized.user_goals)).toBe(true)
    // Every other field survives unchanged -- this is a targeted default,
    // not a rewrite of the rest of the historical row.
    expect(deserialized.project_facts).toEqual(historicalShape.project_facts)
    expect(deserialized.current_phase).toBe(historicalShape.current_phase)
  })

  test('a historical session with user_goals absent does not throw when the result is used as an array (.filter, .some)', () => {
    const historicalShape = currentSU()
    const { user_goals: _omitted, ...withoutUserGoals } = historicalShape
    const deserialized = deserializeStructuredUnderstanding(JSON.stringify(withoutUserGoals))
    expect(() => deserialized.user_goals.filter((g) => g.superseded_by === null)).not.toThrow()
    expect(() => deserialized.user_goals.some((g) => g.state === 'confirmed')).not.toThrow()
  })

  test('a Milestone-1-era goal (user_goals array present, but individual goals lack category/scope) backfills category to "unknown" and scope to "informational" (Milestone 2, 2026-08-15)', () => {
    // Simulate a real row persisted between Milestone 1's launch and
    // Milestone 2's deploy: user_goals exists, but its elements predate the
    // category/scope fields, exactly as `as any` bypasses the current type
    // to construct (the real historical JSON in the database has no such
    // type to bypass -- it simply never had these keys).
    const historicalGoal = { goal_id: 'g-1', state: 'confirmed', raw_text: 'Can I use this commercially?', superseded_by: null, source_turn: 1, source_statement: 'placeholder' }
    const historicalJson = JSON.stringify({ ...currentSU(), user_goals: [historicalGoal] })
    expect(historicalJson).not.toContain('"category"')
    expect(historicalJson).not.toContain('"scope"')

    const deserialized = deserializeStructuredUnderstanding(historicalJson)
    expect(deserialized.user_goals[0].category).toBe('unknown')
    expect(deserialized.user_goals[0].scope).toBe('informational')
    // Every other field on the goal survives unchanged.
    expect(deserialized.user_goals[0].raw_text).toBe('Can I use this commercially?')
  })

  test('a current-shape goal with category/scope already set round-trips those values unchanged, never overwritten by the backfill default', () => {
    const su = currentSU()
    su.user_goals[0].category = 'likeness'
    su.user_goals[0].scope = 'determination_request'
    const roundTripped = deserializeStructuredUnderstanding(serializeStructuredUnderstanding(su))
    expect(roundTripped.user_goals[0].category).toBe('likeness')
    expect(roundTripped.user_goals[0].scope).toBe('determination_request')
  })
})
