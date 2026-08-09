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
  test('gate 1 met + gate 2 stable, but still phase 1 or 2 -> NOT complete (Phase 3 proceeds regardless, per Section 11)', () => {
    expect(checkCompletion(gate1('met'), gate2('stable'), 1, null)).toEqual({ is_complete: false, reason: null })
    expect(checkCompletion(gate1('met'), gate2('stable'), 2, null)).toEqual({ is_complete: false, reason: null })
  })

  test('gate 1 met + gate 2 stable + phase 3 -> complete, gate_1_gate_2_met', () => {
    expect(checkCompletion(gate1('met'), gate2('stable'), 3, null)).toEqual({ is_complete: true, reason: 'gate_1_gate_2_met' })
  })

  test('gate 1 met but gate 2 not yet stable, even at phase 3 -> NOT complete, keep going', () => {
    expect(checkCompletion(gate1('met'), gate2('not_yet_stable'), 3, null)).toEqual({ is_complete: false, reason: null })
  })

  test('gate 1 not_met, phase 1 or 2 -> NOT complete (do not evaluate the insufficient-input fallback before Phase 1-2 has run its course)', () => {
    expect(checkCompletion(gate1('not_met'), gate2('not_yet_stable'), 1, null)).toEqual({ is_complete: false, reason: null })
    expect(checkCompletion(gate1('not_met'), gate2('not_yet_stable'), 2, null)).toEqual({ is_complete: false, reason: null })
  })

  test('gate 1 not_met + phase 3 -> complete, gate_1_unmet_exhausted, regardless of gate 2 state', () => {
    expect(checkCompletion(gate1('not_met'), gate2('not_yet_stable'), 3, null)).toEqual({ is_complete: true, reason: 'gate_1_unmet_exhausted' })
    expect(checkCompletion(gate1('not_met'), gate2('stable'), 3, null)).toEqual({ is_complete: true, reason: 'gate_1_unmet_exhausted' })
  })
})

describe('checkCompletion -- interview-scope decline (User Override, PRD_CRC_v1.0.md §9)', () => {
  // Confirmed engine defect, fixed 2026-08-10: an interview-scope decline
  // must complete immediately regardless of Gate 1, Gate 2, or phase -- the
  // exact regression matrix the fix was required to satisfy. gate1('met')
  // is the case that was silently broken in production (a user who had
  // already satisfied Gate 1 before pressing Stop stayed in an active,
  // unfinished session); the others confirm the fix generalizes correctly
  // rather than merely patching that one observed case.
  test('completes immediately regardless of gate 1 state, gate 2 state, or phase', () => {
    for (const g1 of ['not_met', 'met', 'not_applicable_declined'] as const) {
      for (const g2 of ['stable', 'not_yet_stable'] as const) {
        for (const phase of [1, 2, 3] as const) {
          expect(checkCompletion(gate1(g1), gate2(g2), phase, 'interview')).toEqual({ is_complete: true, reason: 'declined' })
        }
      }
    }
  })

  test('gate1.state alone is never sufficient -- not_applicable_declined without optOutScope === "interview" does NOT complete', () => {
    // This is the other latent defect the fix resolves as a direct
    // consequence: evaluateGate1 can report 'not_applicable_declined' for
    // a skip_question/skip_phase decline too (any decline issued before
    // minimum understanding was met), not only stop_interview. The old
    // code (`gate1.state === 'not_applicable_declined'`) could not tell
    // these apart and would have ended the whole interview on a mere
    // skip_question/skip_phase. Gates evaluate understanding; they must
    // not determine whether an explicit stop is honored.
    expect(checkCompletion(gate1('not_applicable_declined'), gate2('not_yet_stable'), 1, 'question')).toEqual({ is_complete: false, reason: null })
    expect(checkCompletion(gate1('not_applicable_declined'), gate2('not_yet_stable'), 1, 'phase')).toEqual({ is_complete: false, reason: null })
    expect(checkCompletion(gate1('not_applicable_declined'), gate2('not_yet_stable'), 1, null)).toEqual({ is_complete: false, reason: null })
  })

  test('a phase- or question-scope decline never triggers the interview-ending short-circuit -- only "interview" scope does', () => {
    // A config that would NOT complete via the normal gate/phase path
    // (phase 1, gate 1 not met) -- if 'phase'/'question' incorrectly
    // triggered the decline short-circuit, this would wrongly complete too.
    expect(checkCompletion(gate1('not_met'), gate2('not_yet_stable'), 1, 'question')).toEqual({ is_complete: false, reason: null })
    expect(checkCompletion(gate1('not_met'), gate2('not_yet_stable'), 1, 'phase')).toEqual({ is_complete: false, reason: null })
  })
})
