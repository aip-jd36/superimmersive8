/**
 * Unit tests for interview-engine domain types and the 8 required dialogue
 * fixtures. Compile-time completeness (DIALOGUE_FIXTURES typed as
 * Record<DialogueFixtureId, ...>) already guarantees all 8 ids are present;
 * these tests check runtime shape sanity on top of that.
 *
 * Run: npx jest __tests__/interview-engine/types.test.ts
 */

import {
  CONFIDENCE_STATES,
  GATE_1_STATES,
  GATE_2_STATES,
  PHASES,
} from '../../types/interview-engine'
import { DIALOGUE_FIXTURE_IDS, DIALOGUE_FIXTURES } from '../../lib/interview-engine/fixtures'

describe('DIALOGUE_FIXTURES', () => {
  test('all 8 required fixture ids are present', () => {
    expect(Object.keys(DIALOGUE_FIXTURES).sort()).toEqual([...DIALOGUE_FIXTURE_IDS].sort())
    expect(DIALOGUE_FIXTURE_IDS).toHaveLength(8)
  })

  test('each fixture id matches its own key', () => {
    for (const id of DIALOGUE_FIXTURE_IDS) {
      expect(DIALOGUE_FIXTURES[id].id).toBe(id)
    }
  })

  test('every scoped observation uses a valid confidence state', () => {
    for (const id of DIALOGUE_FIXTURE_IDS) {
      for (const obs of DIALOGUE_FIXTURES[id].structured_understanding.scoped_observations) {
        expect(CONFIDENCE_STATES).toContain(obs.confidence)
      }
    }
  })

  test('every fixture uses a valid phase, gate 1, and gate 2 state', () => {
    for (const id of DIALOGUE_FIXTURE_IDS) {
      const su = DIALOGUE_FIXTURES[id].structured_understanding
      expect(PHASES).toContain(su.current_phase)
      expect(GATE_1_STATES).toContain(su.gate_1_state)
      expect(GATE_2_STATES).toContain(su.gate_2_state)
    }
  })

  test('full_opt_out fixture records an interview-scoped decline', () => {
    const su = DIALOGUE_FIXTURES.full_opt_out.structured_understanding
    expect(su.opt_out_scope).toBe('interview')
    expect(su.completion_reason).toBe('declined')
    expect(su.gate_1_state).toBe('not_applicable_declined')
  })

  test('current_vs_historical fixture keeps scopes distinct on the same topic', () => {
    const observations = DIALOGUE_FIXTURES.current_vs_historical.structured_understanding.scoped_observations
    const scopes = new Set(observations.map((o) => o.scope))
    expect(scopes).toEqual(new Set(['current_project', 'historical_project']))
  })

  test('ambiguous_multi_surface_tool fixture resolves an unresolved alias via supersession', () => {
    const mentions = DIALOGUE_FIXTURES.ambiguous_multi_surface_tool.structured_understanding.tool_mentions
    const unresolved = mentions.find((m) => m.resolution.kind === 'unresolved_alias')
    expect(unresolved?.superseded_by).not.toBeNull()

    const resolved = mentions.find((m) => m.mention_id === unresolved?.superseded_by)
    expect(resolved?.resolution.kind).toBe('canonical')
  })

  test('full_phase_1_to_4_trace fixture ends with a populated retrieval handoff', () => {
    const fixture = DIALOGUE_FIXTURES.full_phase_1_to_4_trace
    // current_phase: 3, not 4 -- calibrated to the Live Interview Runtime's
    // adopted model (Phase 1 -> 2 -> 3 -> Completion Check -> Finalization,
    // see fixtures.ts's own comment on this fixture). "Phase 4" is never a
    // stored current_phase value under that model.
    expect(fixture.structured_understanding.current_phase).toBe(3)
    expect(fixture.structured_understanding.completion_reason).toBe('gate_1_gate_2_met')
    expect(fixture.retrieval_handoff).not.toBeNull()
    expect(fixture.retrieval_handoff?.certainty_state).toBe('gate_1_met')
  })

  test('every other fixture leaves retrieval_handoff null (only assembled at completion)', () => {
    for (const id of DIALOGUE_FIXTURE_IDS) {
      if (id === 'full_phase_1_to_4_trace') continue
      expect(DIALOGUE_FIXTURES[id].retrieval_handoff).toBeNull()
    }
  })
})
