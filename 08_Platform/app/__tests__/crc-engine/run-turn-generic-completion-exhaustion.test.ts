/**
 * Generic Completion-Exhaustion milestone (2026-09-17).
 *
 * Real-production-UAT-found defect: `gate_1_unmet_exhausted` (checkCompletion,
 * completion.ts) fires the instant phase reaches 3 with Gate 1 still unmet --
 * entirely independent of whether the existing, generic bounded candidate-
 * question search (jurisdiction / human-contribution / Discovery / ordinary
 * organic / Track B readiness / selector) has ever been given a chance to
 * run. Confirmed against real production evidence: a Guided Entry session
 * completed with `gate_1_unmet_exhausted`, `user_facing_questions_asked: 0`,
 * a confirmed commercial_use UserGoal, confirmed workflow role, canonical
 * tool, confirmed jurisdiction, and intended_use unresolved -- zero questions
 * ever asked.
 *
 * NOT a Guided Entry-specific repair and NOT tested as one here: every
 * fixture below is built from generic StructuredUnderstanding/BoundaryState
 * shapes, the same way GE-1 facts land in ordinary CRC state once accepted
 * (setWorkflowRole/addToolMention/addAssessmentJurisdictionMention). A
 * non-Kling tool (ElevenLabs) is used throughout specifically so
 * deriveSelectorNeeds() is always empty -- isolating this milestone's own
 * generic fix from the pre-existing, narrower Selector-Opportunity guard
 * (run-turn-selector-completion-guard.test.ts), which already deferred
 * completion for gate_1_unmet_exhausted whenever a selector need happened to
 * be pending.
 */

import { runTurn, type RunTurnDeps } from '@/lib/crc-engine/run-turn'
import { createInMemorySessionStore } from '@/lib/crc-engine/in-memory-session-store'
import { constantExtractor } from '@/lib/interview-engine/mock-extractor'
import { constantCandidateQuestionGenerator } from '@/lib/interview-engine/mock-candidate-question'
import { constantConstraintADecider } from '@/lib/interview-engine/mock-decision'
import { createInitialBoundaryState, type BoundaryState } from '@/lib/interview-engine/boundaries'
import type { ConstraintADecider } from '@/lib/interview-engine/decision'
import type { CandidateObservation } from '@/lib/interview-engine/extraction'
import type { SessionStore } from '@/lib/crc-engine/session-store'
import type { CRCSessionState } from '@/lib/crc-engine/types'
import type { StructuredUnderstanding } from '@/types/interview-engine'
import { MATRIX_FIXTURE } from '@/lib/retrieval-engine/matrix-fixture'

const FILLER_PROPOSAL = { question_text: '[ordinary filler]', question_kind: 'other' as const, target_signal_id: null, phase: 3 as const }

/** Rejects every candidate -- proves genuine exhaustion, not a privileged pass for any single attempt. */
const rejectAllDecider: ConstraintADecider = async () => ({ should_ask: false, reason_code: 'NO_MATERIAL_IMPROVEMENT', rationale: 'x' })

function deps(overrides: Partial<RunTurnDeps> = {}, store?: SessionStore): RunTurnDeps {
  return {
    extractor: constantExtractor([]),
    generator: constantCandidateQuestionGenerator(FILLER_PROPOSAL),
    decider: constantConstraintADecider({ should_ask: true, reason_code: 'MATERIALLY_IMPROVES_UNDERSTANDING', rationale: 'x' }),
    sessionStore: store ?? createInMemorySessionStore(),
    matrix: MATRIX_FIXTURE,
    topicClaims: [],
    ...overrides,
  }
}

function toolCandidate(overrides: Partial<CandidateObservation> = {}): CandidateObservation {
  // ElevenLabs: real canonical registry entry, but NOT a selector-registry
  // consumer (the sole real SELECTOR_ASKABILITY entry is Kling's
  // tool_account_status) -- keeps deriveSelectorNeeds() empty regardless of
  // goals, isolating this milestone's own generic fix.
  return { proposal_id: 'p-tool', turn: 1, raw_text: 'ElevenLabs', kind: 'tool_mention', raw_tool_name: 'ElevenLabs', ...overrides }
}

function workflowRoleCandidate(value: string, overrides: Partial<CandidateObservation> = {}): CandidateObservation {
  return { proposal_id: 'p-role', turn: 1, raw_text: value, kind: 'project_fact', raw_fact_field: 'workflow_role', fact_confidence_hint: 'confirmed', fact_value_hint: value, ...overrides }
}

function jurisdictionCandidate(value: string, overrides: Partial<CandidateObservation> = {}): CandidateObservation {
  return { proposal_id: 'p-jur', turn: 1, raw_text: value, kind: 'assessment_jurisdiction_mention', raw_jurisdiction_value: value, ...overrides }
}

function goalCandidate(overrides: Partial<CandidateObservation> = {}): CandidateObservation {
  return {
    proposal_id: 'p-goal',
    turn: 1,
    raw_text: 'Can my client show this commercially?',
    kind: 'user_goal',
    goal_confidence_hint: 'confirmed',
    goal_category_hint: 'commercial_use',
    goal_scope_hint: 'informational',
    ...overrides,
  }
}

function affirmativeScopedObservationCandidate(overrides: Partial<CandidateObservation> = {}): CandidateObservation {
  return { proposal_id: 'p-obs', turn: 1, raw_text: 'We shot and edited the sequence ourselves.', kind: 'scoped_observation', scope: 'current_project', workflow_stage: null, observation_confidence_hint: 'confirmed', ...overrides }
}

async function loadState(store: SessionStore, token: string): Promise<CRCSessionState> {
  return (await store.load(token)) as CRCSessionState
}

describe('Case A -- production GE-2 shape: confirmed role + tool + jurisdiction + goal, intended_use unresolved', () => {
  test('does not immediately return gate_1_unmet_exhausted while a legitimate governed candidate remains -- the ordinary pipeline gets a chance and asks it', async () => {
    const store = createInMemorySessionStore()
    // Deliberately NO intended_use candidate -- Gate 1 stays not_met
    // (INTENDED_USE_MISSING). tool + confirmed workflow_role already
    // satisfies meetsPhase2ExitCondition -> phase 3. This is exactly the
    // confirmed production evidence shape (minus the Guided-Entry-specific
    // origin of the facts, which is irrelevant to this generic engine path).
    const outcome = await runTurn(
      { token: 'case-a', turnNumber: 1, userText: 'x' },
      deps({ extractor: constantExtractor([toolCandidate(), workflowRoleCandidate('agency, producing for a client'), jurisdictionCandidate('United States'), goalCandidate()]) }, store),
    )

    // Pre-fix: checkCompletion() returns gate_1_unmet_exhausted the instant
    // phase reaches 3 with Gate 1 unmet -- the completion guard's own
    // pendingSelectorNeeds check finds nothing (ElevenLabs has no selector
    // consumer) and finalizes immediately, WITHOUT the generator ever being
    // called and WITHOUT ever reaching this assertion's `question` outcome.
    expect(outcome.kind).toBe('question')

    const loaded = await loadState(store, 'case-a')
    expect(loaded.structured_understanding.gate_1_state).toBe('not_met')
    expect(loaded.structured_understanding.current_phase).toBe(3)
    // Not finalized -- the turn genuinely continued.
    expect(loaded.structured_understanding.completion_reason).toBeNull()
    expect(loaded.boundary_state.user_facing_questions_asked).toBe(1)
  })
})

describe('Case B -- prior rich-first-turn shape (synthetic Case 3): phase 3 reached via an affirmative scoped observation, not workflow_role', () => {
  test('does not finalize as gate_1_unmet_exhausted before the bounded candidate search runs, reached through the OTHER phase-2-exit branch', async () => {
    const store = createInMemorySessionStore()
    // No workflow_role at all here -- phase 3 is reached via
    // hasAffirmativeScopedObservation instead, proving the fix is not
    // accidentally coupled to which of the two OR-branches got the
    // interview to phase 3. Still no intended_use -- Gate 1 not_met.
    const outcome = await runTurn(
      { token: 'case-b', turnNumber: 1, userText: 'x' },
      deps({ extractor: constantExtractor([toolCandidate(), affirmativeScopedObservationCandidate(), goalCandidate()]) }, store),
    )

    expect(outcome.kind).toBe('question')

    const loaded = await loadState(store, 'case-b')
    expect(loaded.structured_understanding.gate_1_state).toBe('not_met')
    expect(loaded.structured_understanding.current_phase).toBe(3)
    expect(loaded.structured_understanding.completion_reason).toBeNull()
  })
})

describe('Case C -- true exhaustion: Gate 1 unmet, phase 3, but genuinely no legitimate candidate remains', () => {
  test('CRC still returns gate_1_unmet_exhausted -- this repair fixes FALSE exhaustion, not exhaustion itself', async () => {
    const store = createInMemorySessionStore()
    // Every candidate attempt is rejected by Constraint A (rejectAllDecider)
    // -- jurisdiction/human-contribution/Discovery/ordinary/Track B
    // readiness/selector all fail in turn, exactly like the pre-existing
    // exhaustion-guard suite's own "I/17" and "J/11" cases. The bounded
    // search must run (proving deferral happened) and must still end in
    // finalization with the CORRECT, specific reason -- never the generic
    // questioning_exhausted, and never stuck open forever.
    const outcome = await runTurn(
      { token: 'case-c', turnNumber: 1, userText: 'x' },
      deps({ extractor: constantExtractor([toolCandidate(), workflowRoleCandidate('independent creator, my own work')]), decider: rejectAllDecider }, store),
    )

    expect(outcome.kind).toBe('complete')

    const loaded = await loadState(store, 'case-c')
    expect(loaded.structured_understanding.gate_1_state).toBe('not_met')
    expect(loaded.structured_understanding.completion_reason).toBe('gate_1_unmet_exhausted')
    expect(loaded.boundary_state.user_facing_questions_asked).toBe(0)
  })
})

describe('Case D -- question budget: the existing hard maximum remains authoritative, no regression', () => {
  test('a turn that would otherwise defer via gate_1_unmet_exhausted still finalizes as question_budget_exhausted once the ceiling is already reached', async () => {
    const store = createInMemorySessionStore()
    const suAtGate1UnmetPhase3: StructuredUnderstanding = {
      project_facts: {
        intended_use: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
        workflow_role: { attestation: { state: 'confirmed', value: 'agency, producing for a client' }, source_turn: 1, source_statement: 'x' },
        jurisdiction: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
        human_contribution_description: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
      },
      tool_mentions: [
        { mention_id: 't1', resolution: { kind: 'canonical', identifier: 'elevenlabs' }, access_surface: { state: 'unknown' }, plan_tier: { state: 'unknown' }, account_status: { state: 'unknown' }, confidence: 'confirmed', source_turn: 1, source_statement: 'ElevenLabs', superseded_by: null },
      ],
      scoped_observations: [],
      user_goals: [],
      asset_provider_mentions: [],
      assessment_jurisdiction_mentions: [],
      content_presence_mentions: [],
      distribution_territory_mentions: [],
      organization_location_mentions: [],
      current_phase: 3,
      gate_1_state: 'not_met',
      gate_2_state: 'stable',
      completion_reason: null,
      opt_out_scope: null,
    }
    const boundaryStateAtMax: BoundaryState = { ...createInitialBoundaryState(), user_facing_questions_asked: 6 }
    await store.save('case-d', { structured_understanding: suAtGate1UnmetPhase3, boundary_state: boundaryStateAtMax, pending_clarification: null, pending_commercial_readiness_takeaway: null })

    const throwingGenerator = async () => {
      throw new Error('must not be called -- the budget ceiling must win before the organic path is ever reached')
    }
    const outcome = await runTurn({ token: 'case-d', turnNumber: 2, userText: 'x' }, deps({ generator: throwingGenerator, extractor: constantExtractor([]) }, store))

    expect(outcome.kind).toBe('complete')
    const loaded = await loadState(store, 'case-d')
    expect(loaded.structured_understanding.completion_reason).toBe('question_budget_exhausted')
    expect(loaded.boundary_state.user_facing_questions_asked).toBe(6)
  })
})

describe('Case E -- evidence-only / non-askable: the repair never manufactures a question or converts evidence into self-attestation', () => {
  const MATRIX_WITH_PLAN_TIER_GATE: RunTurnDeps['matrix'] = [
    {
      identifier: 'elevenlabs',
      last_verified: '2026-09-17',
      claims: [
        {
          claim_id: 'elevenlabs-plan-tier-gated-test-claim',
          crc_eligible: 'Yes',
          crc_publication_scope: 'x',
          crc_candidate_statement: 'x',
          topic: 'commercial_use',
          applicability_requirements: [{ fact: 'tool_plan_tier', tool: 'elevenlabs', operator: 'equals', value: 'paid' }],
        },
      ],
    },
  ]

  test('an unresolved, non-askable applicability gap does not get asked -- genuine exhaustion still proceeds and finalizes as gate_1_unmet_exhausted', async () => {
    const store = createInMemorySessionStore()
    const outcome = await runTurn(
      { token: 'case-e', turnNumber: 1, userText: 'x' },
      deps(
        { extractor: constantExtractor([toolCandidate(), workflowRoleCandidate('in-house team, for my own organization'), goalCandidate()]), matrix: MATRIX_WITH_PLAN_TIER_GATE, decider: rejectAllDecider },
        store,
      ),
    )

    expect(outcome.kind).toBe('complete')

    const loaded = await loadState(store, 'case-e')
    expect(loaded.structured_understanding.gate_1_state).toBe('not_met')
    // Never manufactured a question about the ungated fact, and never
    // silently promoted the evidence-only requirement to self-attestable --
    // this outcome is reached purely because Constraint A rejected
    // everything and the applicability gap was never askable to begin with,
    // exactly like the pre-existing exhaustion-guard suite's own "L/13".
    expect(loaded.structured_understanding.completion_reason).toBe('gate_1_unmet_exhausted')
    expect(loaded.boundary_state.user_facing_questions_asked).toBe(0)
  })
})
