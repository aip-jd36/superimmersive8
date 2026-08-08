/**
 * Finalization trigger deterministic test suite
 * (LIVE_INTERVIEW_RUNTIME_ARCHITECTURE.md §8, Live Interview Runtime
 * milestone). No live model -- checkCompletion is a pure function.
 */

import { checkCompletion } from '@/lib/crc-engine/completion'
import type { Gate1Result } from '@/lib/interview-engine/gates'
import type { Gate2Result } from '@/lib/interview-engine/gates'

// checkCompletion only ever reads `.state` off either result -- reason_code/
// changed_fields/evaluation_scope are irrelevant to it, so these fixtures
// deliberately don't populate them meaningfully.
function gate1(state: Gate1Result['state']): Gate1Result {
  return { state } as Gate1Result
}

function gate2(state: Gate2Result['state']): Gate2Result {
  return { state } as Gate2Result
}

describe('checkCompletion', () => {
  test('decline (not_applicable_declined) completes immediately regardless of gate 2 or phase', () => {
    for (const phase of [1, 2, 3] as const) {
      for (const g2 of ['stable', 'not_yet_stable'] as const) {
        expect(checkCompletion(gate1('not_applicable_declined'), gate2(g2), phase)).toEqual({ is_complete: true, reason: 'declined' })
      }
    }
  })

  test('gate 1 met + gate 2 stable, but still phase 1 or 2 -> NOT complete (Phase 3 proceeds regardless, per Section 11)', () => {
    expect(checkCompletion(gate1('met'), gate2('stable'), 1)).toEqual({ is_complete: false, reason: null })
    expect(checkCompletion(gate1('met'), gate2('stable'), 2)).toEqual({ is_complete: false, reason: null })
  })

  test('gate 1 met + gate 2 stable + phase 3 -> complete, gate_1_gate_2_met', () => {
    expect(checkCompletion(gate1('met'), gate2('stable'), 3)).toEqual({ is_complete: true, reason: 'gate_1_gate_2_met' })
  })

  test('gate 1 met but gate 2 not yet stable, even at phase 3 -> NOT complete, keep going', () => {
    expect(checkCompletion(gate1('met'), gate2('not_yet_stable'), 3)).toEqual({ is_complete: false, reason: null })
  })

  test('gate 1 not_met, phase 1 or 2 -> NOT complete (do not evaluate the insufficient-input fallback before Phase 1-2 has run its course)', () => {
    expect(checkCompletion(gate1('not_met'), gate2('not_yet_stable'), 1)).toEqual({ is_complete: false, reason: null })
    expect(checkCompletion(gate1('not_met'), gate2('not_yet_stable'), 2)).toEqual({ is_complete: false, reason: null })
  })

  test('gate 1 not_met + phase 3 -> complete, gate_1_unmet_exhausted, regardless of gate 2 state', () => {
    expect(checkCompletion(gate1('not_met'), gate2('not_yet_stable'), 3)).toEqual({ is_complete: true, reason: 'gate_1_unmet_exhausted' })
    expect(checkCompletion(gate1('not_met'), gate2('stable'), 3)).toEqual({ is_complete: true, reason: 'gate_1_unmet_exhausted' })
  })
})
