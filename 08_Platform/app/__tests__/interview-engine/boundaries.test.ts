/**
 * Unit tests for the conversation boundary state machine (Constraint B)
 * (CRC_PROTOTYPE_ALPHA_ROADMAP.md Phase 4).
 *
 * Run: npx jest __tests__/interview-engine/boundaries.test.ts
 */

import {
  createInitialBoundaryState,
  evaluateBoundary,
  BOUNDARY_REASON_CODES,
  type CandidateQuestion,
} from '../../lib/interview-engine/boundaries'
import { CONFIDENCE_STATES } from '../../types/interview-engine'
import {
  serializeBoundaryState,
  deserializeBoundaryState,
} from '../../lib/interview-engine/serialization'

function candidate(overrides: Partial<CandidateQuestion> & Pick<CandidateQuestion, 'kind'>): CandidateQuestion {
  return { phase: 3, ...overrides }
}

describe('follow-up cap (PRD §8 Rule 2)', () => {
  test('first follow-up on a signal is allowed', () => {
    const result = evaluateBoundary(createInitialBoundaryState(), candidate({ kind: 'follow_up_on_signal', signal_id: 'legal-review' }))
    expect(result.allowed).toBe(true)
    expect(result.action_scope).toBe('ask')
    expect(result.reason_code).toBe('ALLOWED')
    expect(result.next_state.follow_ups_used['legal-review']).toBe(1)
  })

  test('second follow-up on the SAME signal is suppressed', () => {
    const afterFirst = evaluateBoundary(createInitialBoundaryState(), candidate({ kind: 'follow_up_on_signal', signal_id: 'legal-review' }))
    const second = evaluateBoundary(afterFirst.next_state, candidate({ kind: 'follow_up_on_signal', signal_id: 'legal-review' }))
    expect(second.allowed).toBe(false)
    expect(second.reason_code).toBe('FOLLOW_UP_CAP_REACHED')
    expect(second.action_scope).toBe('suppress_current_question')
  })

  test('an UNRELATED signal is still eligible after a prior signal reaches its cap', () => {
    const afterFirst = evaluateBoundary(createInitialBoundaryState(), candidate({ kind: 'follow_up_on_signal', signal_id: 'legal-review' }))
    const capped = evaluateBoundary(afterFirst.next_state, candidate({ kind: 'follow_up_on_signal', signal_id: 'legal-review' }))
    const unrelated = evaluateBoundary(capped.next_state, candidate({ kind: 'follow_up_on_signal', signal_id: 'client-signoff' }))
    expect(unrelated.allowed).toBe(true)
    expect(unrelated.reason_code).toBe('ALLOWED')
  })

  test('repeated paraphrases of the same signal do not evade the cap', () => {
    // The type carries no question text -- two calls with the same signal_id
    // stand in for two different phrasings of the same underlying question.
    const first = evaluateBoundary(createInitialBoundaryState(), candidate({ kind: 'follow_up_on_signal', signal_id: 'legal-review' }))
    const rephrased = evaluateBoundary(first.next_state, candidate({ kind: 'follow_up_on_signal', signal_id: 'legal-review' }))
    expect(rephrased.allowed).toBe(false)
    expect(rephrased.reason_code).toBe('FOLLOW_UP_CAP_REACHED')
  })
})

describe('uncertainty clarification cap (PRD §8 Rule 4)', () => {
  test('first uncertainty clarification is allowed', () => {
    const result = evaluateBoundary(createInitialBoundaryState(), candidate({ kind: 'uncertainty_clarification', signal_id: 'review-visibility' }))
    expect(result.allowed).toBe(true)
    expect(result.next_state.uncertainty_clarifications_used['review-visibility']).toBe(1)
  })

  test('second uncertainty clarification on the same signal is suppressed', () => {
    const after = evaluateBoundary(createInitialBoundaryState(), candidate({ kind: 'uncertainty_clarification', signal_id: 'review-visibility' }))
    const second = evaluateBoundary(after.next_state, candidate({ kind: 'uncertainty_clarification', signal_id: 'review-visibility' }))
    expect(second.allowed).toBe(false)
    expect(second.reason_code).toBe('UNCERTAINTY_CLARIFICATION_CAP_REACHED')
    expect(second.action_scope).toBe('suppress_current_question')
  })
})

describe('historical-experience question (PRD §8 Rule 3)', () => {
  test('allowed once', () => {
    const result = evaluateBoundary(createInitialBoundaryState(), candidate({ kind: 'historical_experience' }))
    expect(result.allowed).toBe(true)
    expect(result.next_state.historical_experience_asked).toBe(true)
  })

  test('blocked thereafter, regardless of signal', () => {
    const after = evaluateBoundary(createInitialBoundaryState(), candidate({ kind: 'historical_experience' }))
    const second = evaluateBoundary(after.next_state, candidate({ kind: 'historical_experience' }))
    expect(second.allowed).toBe(false)
    expect(second.reason_code).toBe('HISTORICAL_EXPERIENCE_ALREADY_ASKED')
  })
})

describe('commercial-readiness discovery cap (CRC Limited Pilot, 2026-08-12)', () => {
  test('allowed once', () => {
    const result = evaluateBoundary(createInitialBoundaryState(), candidate({ kind: 'commercial_readiness_discovery' }))
    expect(result.allowed).toBe(true)
    expect(result.next_state.commercial_readiness_discovery_asked).toBe(true)
  })

  test('blocked thereafter -- global, not per-category, not per-signal', () => {
    const after = evaluateBoundary(createInitialBoundaryState(), candidate({ kind: 'commercial_readiness_discovery' }))
    const second = evaluateBoundary(after.next_state, candidate({ kind: 'commercial_readiness_discovery' }))
    expect(second.allowed).toBe(false)
    expect(second.reason_code).toBe('COMMERCIAL_READINESS_DISCOVERY_ALREADY_ASKED')
    expect(second.action_scope).toBe('suppress_current_question')
  })

  test('does not consume or interact with any other cap (follow-up, uncertainty, historical, disentangling all remain independently available)', () => {
    const afterDiscovery = evaluateBoundary(createInitialBoundaryState(), candidate({ kind: 'commercial_readiness_discovery' }))
    const followUp = evaluateBoundary(afterDiscovery.next_state, candidate({ kind: 'follow_up_on_signal', signal_id: 'legal-review' }))
    const historical = evaluateBoundary(followUp.next_state, candidate({ kind: 'historical_experience' }))
    expect(followUp.allowed).toBe(true)
    expect(historical.allowed).toBe(true)
  })
})

describe('incident investigation (PRD §8 Rule 2, absolute prohibition)', () => {
  test('suppressed even though nothing has been asked yet -- not a depth cap', () => {
    const result = evaluateBoundary(createInitialBoundaryState(), candidate({ kind: 'incident_investigation' }))
    expect(result.allowed).toBe(false)
    expect(result.reason_code).toBe('INCIDENT_INVESTIGATION_PROHIBITED')
    expect(result.action_scope).toBe('suppress_current_question')
  })

  test('a candidate that passes Constraint A (would plausibly add information) is still blocked by Constraint B', () => {
    // Constraint A is evaluated elsewhere and is assumed to have already
    // said "yes, a plausible answer would materially improve understanding"
    // for this candidate -- Constraint B blocks it anyway, independent of
    // that judgment. This module has no way to represent "would add
    // information" at all, which is itself the point: it must not need to.
    const result = evaluateBoundary(createInitialBoundaryState(), candidate({ kind: 'incident_investigation' }))
    expect(result.allowed).toBe(false)
  })

  test('a capped follow_up_on_signal is a second example of Constraint A passing but Constraint B blocking', () => {
    const after = evaluateBoundary(createInitialBoundaryState(), candidate({ kind: 'follow_up_on_signal', signal_id: 'legal-review' }))
    const second = evaluateBoundary(after.next_state, candidate({ kind: 'follow_up_on_signal', signal_id: 'legal-review' }))
    // Even if this exact follow-up would plausibly surface something new
    // (Constraint A), the depth cap (Constraint B) still fires.
    expect(second.allowed).toBe(false)
    expect(second.reason_code).toBe('FOLLOW_UP_CAP_REACHED')
  })
})

describe('user decline (PRD §8 Rule 6)', () => {
  test('question-only opt-out: suppresses only this question, state otherwise untouched', () => {
    const state = createInitialBoundaryState()
    const result = evaluateBoundary(state, candidate({ kind: 'other' }), { scope: 'question' })
    expect(result.allowed).toBe(false)
    expect(result.reason_code).toBe('USER_DECLINED_QUESTION')
    expect(result.action_scope).toBe('suppress_current_question')
    expect(result.next_state).toEqual(state)
  })

  test('phase-level opt-out: ends the current phase, other phases remain unaffected', () => {
    const result = evaluateBoundary(createInitialBoundaryState(), candidate({ kind: 'other', phase: 3 }), { scope: 'phase' })
    expect(result.allowed).toBe(false)
    expect(result.reason_code).toBe('USER_DECLINED_PHASE')
    expect(result.action_scope).toBe('end_current_phase')
    expect(result.next_state.phases_ended).toEqual([3])

    // A later candidate in a DIFFERENT phase is untouched by the closure.
    const otherPhase = evaluateBoundary(result.next_state, candidate({ kind: 'other', phase: 4 }))
    expect(otherPhase.allowed).toBe(true)

    // A later candidate in the SAME closed phase stays blocked.
    const samePhase = evaluateBoundary(result.next_state, candidate({ kind: 'other', phase: 3 }))
    expect(samePhase.allowed).toBe(false)
    expect(samePhase.reason_code).toBe('PHASE_ALREADY_ENDED_BY_DECLINE')
  })

  test('interview-level opt-out: ends the interview, persists across all future evaluations', () => {
    const result = evaluateBoundary(createInitialBoundaryState(), candidate({ kind: 'other' }), { scope: 'interview' })
    expect(result.allowed).toBe(false)
    expect(result.reason_code).toBe('USER_DECLINED_INTERVIEW')
    expect(result.action_scope).toBe('end_interview')
    expect(result.next_state.interview_ended).toBe(true)

    const later = evaluateBoundary(result.next_state, candidate({ kind: 'other', phase: 1 }))
    expect(later.allowed).toBe(false)
    expect(later.reason_code).toBe('INTERVIEW_ALREADY_ENDED_BY_DECLINE')
  })

  test('ambiguous opt-out scope defaults to question-level suppression, never expanding beyond what the user expressed', () => {
    const state = createInitialBoundaryState()
    const result = evaluateBoundary(state, candidate({ kind: 'other' }), { scope: 'ambiguous' })
    expect(result.allowed).toBe(false)
    expect(result.action_scope).toBe('suppress_current_question')
    expect(result.reason_code).toBe('DECLINE_SCOPE_AMBIGUOUS_DEFAULTED_TO_QUESTION')
    // Narrowest possible interpretation: no phase or interview closure recorded.
    expect(result.next_state).toEqual(state)
  })

  test('decline is never converted into unknown, absence, stability, or completion', () => {
    const result = evaluateBoundary(createInitialBoundaryState(), candidate({ kind: 'other' }), { scope: 'interview' })
    // Decline-driven reason codes and the ScopedObservation confidence
    // taxonomy are disjoint vocabularies -- a decline result can never be
    // mistaken for (or silently rendered as) a confidence value.
    expect(CONFIDENCE_STATES).not.toContain(result.reason_code as any)
    expect(BOUNDARY_REASON_CODES).toContain(result.reason_code)
    // And it never reports as an "allowed"/successful-completion-shaped result.
    expect(result.allowed).toBe(false)
  })

  test('a boundary hit from one signal does not automatically terminate later unrelated questioning', () => {
    const capped = evaluateBoundary(createInitialBoundaryState(), candidate({ kind: 'follow_up_on_signal', signal_id: 'legal-review' }))
    const secondAttempt = evaluateBoundary(capped.next_state, candidate({ kind: 'follow_up_on_signal', signal_id: 'legal-review' }))
    expect(secondAttempt.allowed).toBe(false)

    // An ordinary depth-cap suppression must not have set interview_ended or
    // touched phases_ended -- only an actual decline does that.
    expect(secondAttempt.next_state.interview_ended).toBe(false)
    expect(secondAttempt.next_state.phases_ended).toEqual([])

    const unrelated = evaluateBoundary(secondAttempt.next_state, candidate({ kind: 'other' }))
    expect(unrelated.allowed).toBe(true)
  })
})

describe('boundary state serialization', () => {
  test('BoundaryState survives a serialize/deserialize round trip', () => {
    const afterFollowUp = evaluateBoundary(createInitialBoundaryState(), candidate({ kind: 'follow_up_on_signal', signal_id: 'legal-review' }))
    const afterHistorical = evaluateBoundary(afterFollowUp.next_state, candidate({ kind: 'historical_experience' }))
    const afterPhaseDecline = evaluateBoundary(afterHistorical.next_state, candidate({ kind: 'other', phase: 3 }), { scope: 'phase' })

    const json = serializeBoundaryState(afterPhaseDecline.next_state)
    const restored = deserializeBoundaryState(json)

    expect(restored).toEqual(afterPhaseDecline.next_state)
    expect(restored.follow_ups_used['legal-review']).toBe(1)
    expect(restored.historical_experience_asked).toBe(true)
    expect(restored.phases_ended).toEqual([3])

    // A mutation applied post-deserialization behaves identically to one
    // applied pre-serialization -- same check discipline as Alpha 0.
    const fromRestored = evaluateBoundary(restored, candidate({ kind: 'follow_up_on_signal', signal_id: 'client-signoff' }))
    const fromOriginal = evaluateBoundary(afterPhaseDecline.next_state, candidate({ kind: 'follow_up_on_signal', signal_id: 'client-signoff' }))
    expect(fromRestored.next_state).toEqual(fromOriginal.next_state)
  })
})
