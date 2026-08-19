/**
 * Constraint B enforcement over candidate-question proposals
 * (CRC_PROTOTYPE_ALPHA_ROADMAP.md Phase 6b, steps 6-8). Entirely
 * deterministic -- no live model calls anywhere in this file, mirroring
 * Phase 6a's own separation of deterministic contract tests from real-model
 * evaluation. "Real-candidate" here means a well-formed, non-adversarial
 * proposal (hand-built to look like well-behaved output), not literally a
 * live API call -- generation quality itself is evaluated separately (step
 * 5/9's standalone harness), reported apart from these results.
 *
 * Covers the roadmap's four required combinations: mocked x well-formed,
 * mocked x adversarial, real-understanding x well-formed, real-understanding
 * x adversarial -- plus the Rule 5 disentangling-question cap.
 *
 * Run: npx jest __tests__/interview-engine/constraint-b-candidate-question.test.ts
 */

import type { ProjectFacts, ScopedObservation, StructuredUnderstanding, ToolMention } from '../../types/interview-engine'
import { deriveEligibleSignals, validateCandidateReference, type CandidateQuestionProposal } from '../../lib/interview-engine/candidate-question'
import { createInitialBoundaryState, evaluateBoundary, type BoundaryState, type DeclineSignal } from '../../lib/interview-engine/boundaries'
import { DIALOGUE_FIXTURES } from '../../lib/interview-engine/fixtures'

/** Composes the real production pipeline shape: derive -> validate -> enforce. */
function evaluateProposal(
  su: StructuredUnderstanding,
  boundaryState: BoundaryState,
  proposal: CandidateQuestionProposal,
  decline?: DeclineSignal,
) {
  const eligible = deriveEligibleSignals(su)
  const validation = validateCandidateReference(proposal, eligible)
  if (validation.outcome === 'rejected') {
    return { stage: 'validation' as const, validation }
  }
  const result = evaluateBoundary(boundaryState, validation.candidate, decline)
  return { stage: 'boundary' as const, result }
}

function projectFacts(): ProjectFacts {
  return {
    intended_use: { attestation: { state: 'confirmed', value: 'Paid campaign' }, source_turn: 1, source_statement: 'placeholder' },
    workflow_role: { attestation: { state: 'confirmed', value: 'Producer' }, source_turn: 1, source_statement: 'placeholder' },
    jurisdiction: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
    human_contribution_description: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
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
    source_statement: 'placeholder',
    ...overrides,
  }
}

function toolMention(overrides: Partial<ToolMention> & Pick<ToolMention, 'mention_id' | 'resolution'>): ToolMention {
  return {
    access_surface: { state: 'unknown' },
    plan_tier: { state: 'unknown' },
    confidence: 'confirmed',
    source_turn: 1,
    source_statement: 'placeholder',
    superseded_by: null,
    ...overrides,
  }
}

function mockedSU(overrides: Partial<StructuredUnderstanding> = {}): StructuredUnderstanding {
  return {
    project_facts: projectFacts(),
    tool_mentions: [toolMention({ mention_id: 'tm-1', resolution: { kind: 'canonical', identifier: 'runway-gen3' } })],
    scoped_observations: [observation({ observation_id: 'so-1' })],
    user_goals: [],
    asset_provider_mentions: [],
    current_phase: 3,
    gate_1_state: 'met',
    gate_2_state: 'stable',
    completion_reason: null,
    opt_out_scope: null,
    ...overrides,
  }
}

function proposal(overrides: Partial<CandidateQuestionProposal> = {}): CandidateQuestionProposal {
  return {
    question_text: 'Did anyone review this before it went out?',
    question_kind: 'follow_up_on_signal',
    target_signal_id: 'so-1',
    phase: 3,
    ...overrides,
  }
}

describe('mocked understanding x well-formed candidate', () => {
  test('a well-formed candidate targeting an eligible signal is allowed end to end', () => {
    const outcome = evaluateProposal(mockedSU(), createInitialBoundaryState(), proposal())
    expect(outcome.stage).toBe('boundary')
    if (outcome.stage === 'boundary') {
      expect(outcome.result.allowed).toBe(true)
      expect(outcome.result.action_scope).toBe('ask')
    }
  })
})

describe('mocked understanding x adversarial candidates', () => {
  test('hallucinated signal_id is rejected at validation, never reaches Constraint B', () => {
    const outcome = evaluateProposal(mockedSU(), createInitialBoundaryState(), proposal({ target_signal_id: 'so-does-not-exist' }))
    expect(outcome.stage).toBe('validation')
    if (outcome.stage === 'validation') {
      expect(outcome.validation).toMatchObject({ outcome: 'rejected', reason_code: 'SIGNAL_ID_NOT_ELIGIBLE' })
    }
  })

  test('a second follow_up_on_signal on the same signal violates the depth cap', () => {
    const su = mockedSU()
    const first = evaluateProposal(su, createInitialBoundaryState(), proposal())
    expect(first.stage).toBe('boundary')
    const stateAfterFirst = first.stage === 'boundary' ? first.result.next_state : createInitialBoundaryState()

    const second = evaluateProposal(su, stateAfterFirst, proposal())
    expect(second.stage).toBe('boundary')
    if (second.stage === 'boundary') {
      expect(second.result.allowed).toBe(false)
      expect(second.result.reason_code).toBe('FOLLOW_UP_CAP_REACHED')
      expect(second.result.action_scope).toBe('suppress_current_question')
    }
  })

  test('a second uncertainty_clarification on the same signal violates the depth cap', () => {
    const su = mockedSU()
    const uncertaintyProposal = proposal({ question_kind: 'uncertainty_clarification' })
    const first = evaluateProposal(su, createInitialBoundaryState(), uncertaintyProposal)
    const stateAfterFirst = first.stage === 'boundary' ? first.result.next_state : createInitialBoundaryState()
    const second = evaluateProposal(su, stateAfterFirst, uncertaintyProposal)
    if (second.stage === 'boundary') {
      expect(second.result.reason_code).toBe('UNCERTAINTY_CLARIFICATION_CAP_REACHED')
    } else {
      throw new Error('expected boundary stage')
    }
  })

  test('a second historical_experience question violates the once-ever cap', () => {
    const su = mockedSU()
    const historicalProposal = proposal({ question_kind: 'historical_experience', target_signal_id: null })
    const first = evaluateProposal(su, createInitialBoundaryState(), historicalProposal)
    const stateAfterFirst = first.stage === 'boundary' ? first.result.next_state : createInitialBoundaryState()
    const second = evaluateProposal(su, stateAfterFirst, historicalProposal)
    if (second.stage === 'boundary') {
      expect(second.result.reason_code).toBe('HISTORICAL_EXPERIENCE_ALREADY_ASKED')
    } else {
      throw new Error('expected boundary stage')
    }
  })

  test('incident_investigation is prohibited absolutely, regardless of eligible signals', () => {
    const outcome = evaluateProposal(
      mockedSU(),
      createInitialBoundaryState(),
      proposal({ question_kind: 'incident_investigation', target_signal_id: null }),
    )
    if (outcome.stage === 'boundary') {
      expect(outcome.result.allowed).toBe(false)
      expect(outcome.result.reason_code).toBe('INCIDENT_INVESTIGATION_PROHIBITED')
    } else {
      throw new Error('expected boundary stage')
    }
  })

  test('a question-level decline suppresses only the current question', () => {
    const outcome = evaluateProposal(mockedSU(), createInitialBoundaryState(), proposal(), { scope: 'question' })
    if (outcome.stage === 'boundary') {
      expect(outcome.result.reason_code).toBe('USER_DECLINED_QUESTION')
      expect(outcome.result.action_scope).toBe('suppress_current_question')
      expect(outcome.result.next_state.interview_ended).toBe(false)
    } else {
      throw new Error('expected boundary stage')
    }
  })

  test('a phase-level decline ends the current phase and persists', () => {
    const outcome = evaluateProposal(mockedSU(), createInitialBoundaryState(), proposal(), { scope: 'phase' })
    if (outcome.stage === 'boundary') {
      expect(outcome.result.action_scope).toBe('end_current_phase')
      expect(outcome.result.next_state.phases_ended).toContain(3)
    } else {
      throw new Error('expected boundary stage')
    }
  })

  test('an interview-level decline ends the interview and persists across later evaluations', () => {
    const outcome = evaluateProposal(mockedSU(), createInitialBoundaryState(), proposal(), { scope: 'interview' })
    if (outcome.stage !== 'boundary') throw new Error('expected boundary stage')
    expect(outcome.result.action_scope).toBe('end_interview')

    const later = evaluateProposal(mockedSU(), outcome.result.next_state, proposal({ target_signal_id: 'tm-1', question_kind: 'other' }))
    if (later.stage !== 'boundary') throw new Error('expected boundary stage')
    expect(later.result.allowed).toBe(false)
    expect(later.result.reason_code).toBe('INTERVIEW_ALREADY_ENDED_BY_DECLINE')
  })
})

describe('real-understanding (Phase 1 fixtures) x well-formed candidate', () => {
  test('a candidate targeting an eligible signal from a real dialogue fixture is allowed', () => {
    const su = DIALOGUE_FIXTURES.mixed_multi_signal.structured_understanding
    const eligible = deriveEligibleSignals(su)
    const realSignal = eligible.find((s) => s.kind === 'scoped_observation')
    expect(realSignal).toBeDefined()

    const outcome = evaluateProposal(
      su,
      createInitialBoundaryState(),
      proposal({ target_signal_id: realSignal!.signal_id, phase: su.current_phase }),
    )
    expect(outcome.stage).toBe('boundary')
    if (outcome.stage === 'boundary') expect(outcome.result.allowed).toBe(true)
  })
})

describe('real-understanding (Phase 1 fixtures) x adversarial candidates', () => {
  test('a signal_id that is valid in one fixture is hallucinated against a different fixture', () => {
    const richSignals = deriveEligibleSignals(DIALOGUE_FIXTURES.rich_signal.structured_understanding)
    const foreignSignalId = richSignals.find((s) => s.kind === 'tool_mention')!.signal_id

    // full_opt_out has no tool_mentions at all -- a signal_id valid elsewhere must not leak across understanding states.
    const optOutSU = DIALOGUE_FIXTURES.full_opt_out.structured_understanding
    const outcome = evaluateProposal(
      optOutSU,
      createInitialBoundaryState(),
      proposal({ target_signal_id: foreignSignalId, phase: optOutSU.current_phase }),
    )
    expect(outcome.stage).toBe('validation')
    if (outcome.stage === 'validation') expect(outcome.validation).toMatchObject({ reason_code: 'SIGNAL_ID_NOT_ELIGIBLE' })
  })
})

describe('Rule 5 -- disentangling_question cap', () => {
  test('bundled ambiguity: first disentangling question allowed, second suppressed, ambiguity never resolved by guessing', () => {
    // A bundled answer producing two observations whose scope is genuinely
    // ambiguous from the raw text -- exactly the shape Rule 5 targets.
    const su = mockedSU({
      scoped_observations: [
        observation({ observation_id: 'so-a', note: 'Something happened on this, or maybe the other one.' }),
        observation({ observation_id: 'so-b', scope: 'historical_project', note: 'Could be this one instead.', source_turn: 2 }),
      ],
    })

    const disentanglingProposal = proposal({ question_kind: 'disentangling_question', target_signal_id: null })

    const first = evaluateProposal(su, createInitialBoundaryState(), disentanglingProposal)
    if (first.stage !== 'boundary') throw new Error('expected boundary stage')
    expect(first.result.allowed).toBe(true)
    expect(first.result.next_state.disentangling_question_asked).toBe(true)

    const second = evaluateProposal(su, first.result.next_state, disentanglingProposal)
    if (second.stage !== 'boundary') throw new Error('expected boundary stage')
    expect(second.result.allowed).toBe(false)
    expect(second.result.reason_code).toBe('DISENTANGLING_QUESTION_ALREADY_ASKED')
    expect(second.result.action_scope).toBe('suppress_current_question')

    // "Never resolved by guessing": neither evaluateProposal nor anything in
    // this pipeline touches StructuredUnderstanding at all -- both original,
    // still-ambiguous observations remain present and distinct, unmerged.
    expect(su.scoped_observations.map((o) => o.observation_id)).toEqual(['so-a', 'so-b'])
    expect(su.scoped_observations.find((o) => o.observation_id === 'so-a')?.scope).toBe('current_project')
    expect(su.scoped_observations.find((o) => o.observation_id === 'so-b')?.scope).toBe('historical_project')
  })
})
