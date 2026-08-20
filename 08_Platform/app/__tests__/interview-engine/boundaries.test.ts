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

  // W. old persisted session compatibility (Track B — Generic Living-Knowledge
  // Readiness/Askability milestone, 2026-08-20): a session persisted before
  // knowledge_readiness_used existed has no such key in its stored JSON at
  // all.
  test('a historical BoundaryState JSON with no knowledge_readiness_used key deserializes safely, defaulted to {}, and a readiness candidate can be evaluated against it without throwing', () => {
    const historicalJson = JSON.stringify({
      follow_ups_used: {},
      uncertainty_clarifications_used: {},
      historical_experience_asked: false,
      disentangling_question_asked: false,
      commercial_readiness_discovery_asked: false,
      jurisdiction_clarification_asked: false,
      human_contribution_clarification_asked: false,
      jurisdiction_clarification_retry_asked: false,
      jurisdiction_clarification_pending_answer: false,
      interview_ended: false,
      phases_ended: [],
    })
    const restored = deserializeBoundaryState(historicalJson)
    expect(restored.knowledge_readiness_used).toEqual({})
    expect(() =>
      evaluateBoundary(restored, candidate({ kind: 'knowledge_readiness_acquisition', signal_id: 'ap-1', readiness_dependency_id: 'test_provider_license_confirmed' })),
    ).not.toThrow()
  })
})

describe('follow-up need cap (Duplicate-Question Prevention milestone, 2026-08-19)', () => {
  test('A. exact duplicate: first ask of a need is allowed; the identical candidate again is blocked', () => {
    const first = evaluateBoundary(
      createInitialBoundaryState(),
      candidate({ kind: 'follow_up_on_signal', signal_id: 'istock-1', follow_up_need: 'asset_provider_usage' }),
    )
    expect(first.allowed).toBe(true)
    expect(first.next_state.follow_ups_used['istock-1::asset_provider_usage']).toBe(1)

    const repeat = evaluateBoundary(
      first.next_state,
      candidate({ kind: 'follow_up_on_signal', signal_id: 'istock-1', follow_up_need: 'asset_provider_usage' }),
    )
    expect(repeat.allowed).toBe(false)
    expect(repeat.reason_code).toBe('FOLLOW_UP_NEED_ALREADY_ASKED')
    expect(repeat.action_scope).toBe('suppress_current_question')
  })

  test("B. paraphrase evades cap the same way follow_up_on_signal's own cap does -- the type carries no text, so a differently-worded proposal that resolves to the SAME (signal_id, need) is indistinguishable from a repeat, by construction", () => {
    const first = evaluateBoundary(
      createInitialBoundaryState(),
      candidate({ kind: 'other', signal_id: 'istock-1', follow_up_need: 'asset_provider_usage' }),
    )
    const paraphrased = evaluateBoundary(
      first.next_state,
      candidate({ kind: 'other', signal_id: 'istock-1', follow_up_need: 'asset_provider_usage' }),
    )
    expect(paraphrased.allowed).toBe(false)
    expect(paraphrased.reason_code).toBe('FOLLOW_UP_NEED_ALREADY_ASKED')
  })

  test('C. same signal, DIFFERENT need: usage capped does not block license -- the primary false-positive guard', () => {
    const usageAsked = evaluateBoundary(
      createInitialBoundaryState(),
      candidate({ kind: 'follow_up_on_signal', signal_id: 'istock-1', follow_up_need: 'asset_provider_usage' }),
    )
    const usageRepeat = evaluateBoundary(
      usageAsked.next_state,
      candidate({ kind: 'follow_up_on_signal', signal_id: 'istock-1', follow_up_need: 'asset_provider_usage' }),
    )
    const license = evaluateBoundary(
      usageAsked.next_state,
      candidate({ kind: 'follow_up_on_signal', signal_id: 'istock-1', follow_up_need: 'asset_provider_license' }),
    )
    expect(usageRepeat.allowed).toBe(false)
    expect(license.allowed).toBe(true)
    expect(license.reason_code).toBe('ALLOWED')
  })

  test('a DIFFERENT signal_id with the same need is independently eligible (unrelated provider, unrelated tool)', () => {
    const istockUsage = evaluateBoundary(
      createInitialBoundaryState(),
      candidate({ kind: 'follow_up_on_signal', signal_id: 'istock-1', follow_up_need: 'asset_provider_usage' }),
    )
    const gettyUsage = evaluateBoundary(
      istockUsage.next_state,
      candidate({ kind: 'follow_up_on_signal', signal_id: 'getty-1', follow_up_need: 'asset_provider_usage' }),
    )
    expect(gettyUsage.allowed).toBe(true)
  })

  test('absent follow_up_need falls through to the unchanged, pre-existing bare-signal_id cap -- zero behavior change for every existing caller', () => {
    const first = evaluateBoundary(createInitialBoundaryState(), candidate({ kind: 'follow_up_on_signal', signal_id: 'istock-1' }))
    expect(first.next_state.follow_ups_used['istock-1']).toBe(1)
    expect(first.next_state.follow_ups_used['istock-1::asset_provider_usage']).toBeUndefined()

    const second = evaluateBoundary(first.next_state, candidate({ kind: 'follow_up_on_signal', signal_id: 'istock-1' }))
    expect(second.allowed).toBe(false)
    expect(second.reason_code).toBe('FOLLOW_UP_CAP_REACHED')
  })

  test('an incident_investigation candidate is still absolutely prohibited even if (hypothetically) tagged with a follow_up_need', () => {
    const result = evaluateBoundary(
      createInitialBoundaryState(),
      candidate({ kind: 'incident_investigation', signal_id: 'istock-1', follow_up_need: 'asset_provider_usage' }),
    )
    expect(result.allowed).toBe(false)
    expect(result.reason_code).toBe('INCIDENT_INVESTIGATION_PROHIBITED')
  })

  test('J. multi-goal: an unrelated candidate with no follow_up_need is unaffected by a capped need on a different signal', () => {
    const usageAsked = evaluateBoundary(
      createInitialBoundaryState(),
      candidate({ kind: 'follow_up_on_signal', signal_id: 'istock-1', follow_up_need: 'asset_provider_usage' }),
    )
    const unrelated = evaluateBoundary(usageAsked.next_state, candidate({ kind: 'follow_up_on_signal', signal_id: 'workflow-role' }))
    expect(unrelated.allowed).toBe(true)
  })
})

describe('confirmed-jurisdiction suppression (Second-Jurisdiction UX milestone, 2026-08-20, J2)', () => {
  test('G. targets_confirmed_jurisdiction: true -> BLOCK, deterministic, no counter touched', () => {
    const state = createInitialBoundaryState()
    const result = evaluateBoundary(state, candidate({ kind: 'follow_up_on_signal', signal_id: 'project:jurisdiction', targets_confirmed_jurisdiction: true }))
    expect(result.allowed).toBe(false)
    expect(result.reason_code).toBe('JURISDICTION_ALREADY_CONFIRMED')
    expect(result.action_scope).toBe('suppress_current_question')
    expect(result.next_state).toEqual(state)
  })

  test('H. targets_confirmed_jurisdiction: false (or absent) -> falls through to ordinary per-kind logic unaffected -- e.g. a first follow_up_on_signal is still allowed', () => {
    const result = evaluateBoundary(
      createInitialBoundaryState(),
      candidate({ kind: 'follow_up_on_signal', signal_id: 'project:jurisdiction', targets_confirmed_jurisdiction: false }),
    )
    expect(result.allowed).toBe(true)
    expect(result.reason_code).toBe('ALLOWED')
  })

  test('fires for kind "other" too, not just follow_up_on_signal -- an organic candidate structurally targeting jurisdiction is blocked regardless of how it classified itself', () => {
    const result = evaluateBoundary(
      createInitialBoundaryState(),
      candidate({ kind: 'other', signal_id: 'project:jurisdiction', targets_confirmed_jurisdiction: true }),
    )
    expect(result.allowed).toBe(false)
    expect(result.reason_code).toBe('JURISDICTION_ALREADY_CONFIRMED')
  })

  test('J. jurisdiction suppression never affects an unrelated project fact (intended_use) -- flag is candidate-specific, not global', () => {
    const jurisdictionBlocked = evaluateBoundary(
      createInitialBoundaryState(),
      candidate({ kind: 'follow_up_on_signal', signal_id: 'project:jurisdiction', targets_confirmed_jurisdiction: true }),
    )
    const intendedUseAllowed = evaluateBoundary(
      jurisdictionBlocked.next_state,
      candidate({ kind: 'follow_up_on_signal', signal_id: 'project:intended_use' }),
    )
    expect(intendedUseAllowed.allowed).toBe(true)
    expect(intendedUseAllowed.reason_code).toBe('ALLOWED')
  })

  test('takes precedence over incident_investigation ordering is irrelevant here -- confirms the check sits before the per-kind switch by verifying it fires even for a kind that would otherwise be ALLOWED unconditionally ("other")', () => {
    const result = evaluateBoundary(createInitialBoundaryState(), candidate({ kind: 'other', targets_confirmed_jurisdiction: true }))
    expect(result.allowed).toBe(false)
    expect(result.reason_code).toBe('JURISDICTION_ALREADY_CONFIRMED')
  })
})

describe('jurisdiction_clarification_retry cap (Second-Jurisdiction UX milestone, 2026-08-20, J3)', () => {
  test('first retry ask is allowed, cap consumed', () => {
    const result = evaluateBoundary(createInitialBoundaryState(), candidate({ kind: 'jurisdiction_clarification_retry' }))
    expect(result.allowed).toBe(true)
    expect(result.next_state.jurisdiction_clarification_retry_asked).toBe(true)
  })

  test('L. second retry ask (no third deterministic attempt) is blocked', () => {
    const after = evaluateBoundary(createInitialBoundaryState(), candidate({ kind: 'jurisdiction_clarification_retry' }))
    const second = evaluateBoundary(after.next_state, candidate({ kind: 'jurisdiction_clarification_retry' }))
    expect(second.allowed).toBe(false)
    expect(second.reason_code).toBe('JURISDICTION_CLARIFICATION_RETRY_ALREADY_ASKED')
    expect(second.action_scope).toBe('suppress_current_question')
  })

  test('retry cap is independent of the initial jurisdiction_clarification cap -- capping one never consumes the other', () => {
    const initialCapped = evaluateBoundary(createInitialBoundaryState(), candidate({ kind: 'jurisdiction_clarification' }))
    expect(initialCapped.next_state.jurisdiction_clarification_retry_asked).toBe(false)
    const retryStillAllowed = evaluateBoundary(initialCapped.next_state, candidate({ kind: 'jurisdiction_clarification_retry' }))
    expect(retryStillAllowed.allowed).toBe(true)
  })

  test('retry cap does not consume or interact with Discovery or human-contribution caps', () => {
    const retryAsked = evaluateBoundary(createInitialBoundaryState(), candidate({ kind: 'jurisdiction_clarification_retry' }))
    const discovery = evaluateBoundary(retryAsked.next_state, candidate({ kind: 'commercial_readiness_discovery' }))
    const humanContribution = evaluateBoundary(discovery.next_state, candidate({ kind: 'human_contribution_clarification' }))
    expect(discovery.allowed).toBe(true)
    expect(humanContribution.allowed).toBe(true)
  })
})

describe('knowledge_readiness_acquisition cap (Track B — Generic Living-Knowledge Readiness/Askability milestone, 2026-08-20)', () => {
  test('K/J: first ask of a (signal_id, readiness_dependency_id) pair is allowed and increments knowledge_readiness_used, never follow_ups_used', () => {
    const result = evaluateBoundary(
      createInitialBoundaryState(),
      candidate({ kind: 'knowledge_readiness_acquisition', signal_id: 'ap-1', readiness_dependency_id: 'test_provider_license_confirmed' }),
    )
    expect(result.allowed).toBe(true)
    expect(result.next_state.knowledge_readiness_used['ap-1::test_provider_license_confirmed']).toBe(1)
    expect(result.next_state.follow_ups_used).toEqual({})
  })

  test('J: exact repeat of the same (signal_id, readiness_dependency_id) pair is blocked', () => {
    const first = evaluateBoundary(
      createInitialBoundaryState(),
      candidate({ kind: 'knowledge_readiness_acquisition', signal_id: 'ap-1', readiness_dependency_id: 'test_provider_license_confirmed' }),
    )
    const repeat = evaluateBoundary(
      first.next_state,
      candidate({ kind: 'knowledge_readiness_acquisition', signal_id: 'ap-1', readiness_dependency_id: 'test_provider_license_confirmed' }),
    )
    expect(repeat.allowed).toBe(false)
    expect(repeat.reason_code).toBe('KNOWLEDGE_READINESS_ALREADY_ASKED')
    expect(repeat.action_scope).toBe('suppress_current_question')
  })

  test('a different provider (different signal_id) with the same dependency id is independently eligible -- iStock license cap never blocks Getty license', () => {
    const istock = evaluateBoundary(
      createInitialBoundaryState(),
      candidate({ kind: 'knowledge_readiness_acquisition', signal_id: 'ap-istock', readiness_dependency_id: 'test_provider_license_confirmed' }),
    )
    const getty = evaluateBoundary(
      istock.next_state,
      candidate({ kind: 'knowledge_readiness_acquisition', signal_id: 'ap-getty', readiness_dependency_id: 'test_provider_license_confirmed' }),
    )
    expect(getty.allowed).toBe(true)
  })

  test('a project-scoped need (signal_id undefined) caps under the "project" key, independent of any provider-scoped need', () => {
    const projectNeed = evaluateBoundary(createInitialBoundaryState(), candidate({ kind: 'knowledge_readiness_acquisition', readiness_dependency_id: 'test_dependency' }))
    expect(projectNeed.next_state.knowledge_readiness_used['project::test_dependency']).toBe(1)
    const providerNeed = evaluateBoundary(projectNeed.next_state, candidate({ kind: 'knowledge_readiness_acquisition', signal_id: 'ap-1', readiness_dependency_id: 'test_dependency' }))
    expect(providerNeed.allowed).toBe(true)
  })

  test('L: this cap never touches or is touched by follow_ups_used -- the two vocabularies stay in separate records', () => {
    const followUpUsed = evaluateBoundary(createInitialBoundaryState(), candidate({ kind: 'follow_up_on_signal', signal_id: 'ap-1', follow_up_need: 'asset_provider_usage' }))
    const readiness = evaluateBoundary(
      followUpUsed.next_state,
      candidate({ kind: 'knowledge_readiness_acquisition', signal_id: 'ap-1', readiness_dependency_id: 'test_provider_license_confirmed' }),
    )
    expect(readiness.allowed).toBe(true)
    expect(readiness.next_state.follow_ups_used['ap-1::asset_provider_usage']).toBe(1)
    expect(readiness.next_state.knowledge_readiness_used['ap-1::test_provider_license_confirmed']).toBe(1)
  })

  test('an incident_investigation candidate is still absolutely prohibited even if (hypothetically) tagged with a readiness_dependency_id', () => {
    const result = evaluateBoundary(
      createInitialBoundaryState(),
      candidate({ kind: 'incident_investigation', readiness_dependency_id: 'test_provider_license_confirmed' }),
    )
    expect(result.allowed).toBe(false)
    expect(result.reason_code).toBe('INCIDENT_INVESTIGATION_PROHIBITED')
  })

  // Note: like follow_ups_used/uncertainty_clarifications_used, evaluateBoundary
  // itself relies entirely on the caller (createInitialBoundaryState/
  // deserializeBoundaryState) to guarantee this Record exists -- it does not
  // independently guard against a wholly-missing top-level field, matching
  // this file's own established precedent for every other Record-typed cap.
  // The real safety net for a historical session is deserializeBoundaryState's
  // explicit `?? {}` default -- see serialization.test.ts's own W-item coverage.
})
