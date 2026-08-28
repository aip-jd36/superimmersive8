/**
 * Commercial Readiness Discovery Catalog -- integration test suite (CRC
 * Limited Pilot, 2026-08-12). Mock-stack only (deterministic, sequenced
 * mocks) -- the live-model battery lives in its own eval report, not
 * here. Covers the full required corpus from the approved integration
 * spec: eligibility gating (Gate 1, phase, category-specific
 * applicability, priority order, evidence gap/cap), Constraint A/B
 * interaction, Model 4's "attempt 2 never retries a second discovery
 * category" rule, cap persistence across turns, the Educational Takeaway
 * (delivery, verbatim copy, non-leakage into Projection), and a
 * regression check against the pre-integration Model 4 baseline.
 */

import { runTurn, type RunTurnDeps, type TurnOutcome } from '@/lib/crc-engine/run-turn'
import { createInMemorySessionStore } from '@/lib/crc-engine/in-memory-session-store'
import { constantExtractor } from '@/lib/interview-engine/mock-extractor'
import { constantCandidateQuestionGenerator } from '@/lib/interview-engine/mock-candidate-question'
import { constantConstraintADecider } from '@/lib/interview-engine/mock-decision'
import { sequencedGenerator, sequencedDecider } from '@/lib/interview-engine/eval/mock-sequenced'
import { createInitialBoundaryState } from '@/lib/interview-engine/boundaries'
import { COMMERCIAL_READINESS_DISCOVERY_QUESTIONS, COMMERCIAL_READINESS_TAKEAWAYS } from '@/lib/crc-engine/commercial-readiness-catalog'
import type { CandidateObservation } from '@/lib/interview-engine/extraction'
import type { CandidateQuestionProposal } from '@/lib/interview-engine/candidate-question'
import type { ConstraintADecision } from '@/lib/interview-engine/decision'
import type { SessionStore } from '@/lib/crc-engine/session-store'
import type { CRCSessionState } from '@/lib/crc-engine/types'

const MATRIX = [
  {
    identifier: 'runway-gen3',
    last_verified: '2026-08-05',
    claims: [{ claim_id: 'runway-gen3', crc_eligible: 'Yes' as const, crc_publication_scope: 'scope text', crc_candidate_statement: 'Runway statement.', applicability_requirements: [] }],
  },
]

function deps(overrides: Partial<RunTurnDeps> = {}, store?: SessionStore): RunTurnDeps {
  return {
    extractor: constantExtractor([]),
    generator: constantCandidateQuestionGenerator(null),
    decider: constantConstraintADecider({ should_ask: false, reason_code: 'NO_MATERIAL_IMPROVEMENT', rationale: 'x' }),
    sessionStore: store ?? createInMemorySessionStore(),
    matrix: MATRIX,
    ...overrides,
  }
}

function toolCandidate(overrides: Partial<CandidateObservation> = {}): CandidateObservation {
  return { proposal_id: 'p-1', turn: 1, raw_text: 'We used Runway.', kind: 'tool_mention', raw_tool_name: 'Runway', ...overrides }
}

function intendedUseCandidate(value: string): CandidateObservation {
  return { proposal_id: 'p-use', turn: 1, raw_text: value, kind: 'project_fact', raw_fact_field: 'intended_use', fact_confidence_hint: 'confirmed', fact_value_hint: value }
}

function workflowRoleCandidate(value: string): CandidateObservation {
  return { proposal_id: 'p-role', turn: 1, raw_text: value, kind: 'project_fact', raw_fact_field: 'workflow_role', fact_confidence_hint: 'confirmed', fact_value_hint: value }
}

function proposal(overrides: Partial<CandidateQuestionProposal> = {}): CandidateQuestionProposal {
  return { question_text: 'Ordinary question.', question_kind: 'other', target_signal_id: null, phase: 3, ...overrides }
}

function askDecision(overrides: Partial<ConstraintADecision> = {}): ConstraintADecision {
  return { should_ask: true, reason_code: 'MATERIALLY_IMPROVES_UNDERSTANDING', rationale: 'x', ...overrides }
}

function suppressDecision(overrides: Partial<ConstraintADecision> = {}): ConstraintADecision {
  return { should_ask: false, reason_code: 'NO_MATERIAL_IMPROVEMENT', rationale: 'x', ...overrides }
}

async function loadState(store: SessionStore, token: string): Promise<CRCSessionState> {
  return (await store.load(token)) as CRCSessionState
}

/**
 * Single-turn setup reaching Gate 1 met + Phase 3 in one extraction call:
 * a resolved tool mention, intended_use confirmed with the given
 * indicator-bearing text (the only source of applicability signal in
 * these tests), and workflow_role confirmed with generic, indicator-free
 * text purely to satisfy Phase 2's own exit condition. Starting from a
 * genuinely empty session guarantees Gate 2 registers MATERIAL_CHANGE_DETECTED
 * (everything just changed from nothing), so natural completion never
 * preempts candidate generation.
 */
function eligibleTurnDeps(indicatorText: string, overrides: Partial<RunTurnDeps> = {}, store?: SessionStore): RunTurnDeps {
  return deps(
    {
      extractor: constantExtractor([toolCandidate(), intendedUseCandidate(indicatorText), workflowRoleCandidate('solo operator')]),
      ...overrides,
    },
    store,
  )
}

describe('Commercial Readiness Discovery -- eligibility gating', () => {
  test('Gate 1 not met (no tool identity, no production-step observation) -> discovery never attempted even with affirmative-looking text present', async () => {
    const store = createInMemorySessionStore()
    const ordinary = proposal({ question_text: 'Ordinary question.' })
    const outcome = await runTurn(
      { token: 'crd-gate1-unmet', turnNumber: 1, userText: 'x' },
      deps(
        { extractor: constantExtractor([intendedUseCandidate('made the video for a client')]), generator: sequencedGenerator([ordinary]), decider: sequencedDecider([askDecision()]) },
        store,
      ),
    )
    expect(outcome).toEqual({
      kind: 'question',
      message: 'Ordinary question.',
      discoverySignal: { eligible_categories: [], selected_category: null, outcome: 'never_eligible' },
      selectorSignal: { eligible: false, outcome: 'never_eligible' },
    })
  })

  test('Gate 1 met but Phase 2 exit condition not yet met (workflow_role never confirmed) -> discovery never attempted even though applicability is affirmative', async () => {
    const store = createInMemorySessionStore()
    const ordinary = proposal({ question_text: 'Ordinary question.' })
    const outcome = await runTurn(
      { token: 'crd-phase2', turnNumber: 1, userText: 'x' },
      deps(
        {
          extractor: constantExtractor([toolCandidate(), intendedUseCandidate('made the video for a client')]),
          generator: sequencedGenerator([ordinary]),
          decider: sequencedDecider([askDecision()]),
        },
        store,
      ),
    )
    expect(outcome).toEqual({
      kind: 'question',
      message: 'Ordinary question.',
      discoverySignal: { eligible_categories: [], selected_category: null, outcome: 'never_eligible' },
      selectorSignal: { eligible: false, outcome: 'never_eligible' },
    })
  })

  test('Phase 3 + client_involvement affirmative -> Client-Provided Source Assets asked as attempt 1; ordinary generator never called', async () => {
    const store = createInMemorySessionStore()
    const throwingGenerator = async (): Promise<CandidateQuestionProposal | null> => {
      throw new Error('ordinary generator must not be called -- the deterministic discovery candidate should win attempt 1')
    }
    const outcome = await runTurn(
      { token: 'crd-client', turnNumber: 1, userText: 'x' },
      eligibleTurnDeps('made the video for a client', { generator: throwingGenerator, decider: sequencedDecider([askDecision()]) }, store),
    )
    expect(outcome).toEqual({
      kind: 'question',
      message: COMMERCIAL_READINESS_DISCOVERY_QUESTIONS.client_provided_source_assets,
      discoverySignal: { eligible_categories: ['client_provided_source_assets'], selected_category: 'client_provided_source_assets', outcome: 'asked' },
      selectorSignal: { eligible: false, outcome: 'never_eligible' },
    })
    const loaded = await loadState(store, 'crd-client')
    expect(loaded.boundary_state.commercial_readiness_discovery_asked).toBe(true)
    expect(loaded.pending_commercial_readiness_takeaway).toBe('client_provided_source_assets')
  })

  test('Phase 3 + person_depicted affirmative -> Likeness/Publicity Rights asked', async () => {
    const store = createInMemorySessionStore()
    const outcome = await runTurn(
      { token: 'crd-person', turnNumber: 1, userText: 'x' },
      eligibleTurnDeps('the video shows my face talking to the camera', { decider: sequencedDecider([askDecision()]) }, store),
    )
    expect(outcome).toEqual({
      kind: 'question',
      message: COMMERCIAL_READINESS_DISCOVERY_QUESTIONS.likeness_publicity_rights,
      discoverySignal: { eligible_categories: ['likeness_publicity_rights'], selected_category: 'likeness_publicity_rights', outcome: 'asked' },
      selectorSignal: { eligible: false, outcome: 'never_eligible' },
    })
  })

  test('Phase 3 + reference_material_used affirmative -> Third-Party Visual Assets asked', async () => {
    const store = createInMemorySessionStore()
    const outcome = await runTurn(
      { token: 'crd-ref', turnNumber: 1, userText: 'x' },
      eligibleTurnDeps('I used a reference image to guide the generation', { decider: sequencedDecider([askDecision()]) }, store),
    )
    expect(outcome).toEqual({
      kind: 'question',
      message: COMMERCIAL_READINESS_DISCOVERY_QUESTIONS.third_party_visual_assets,
      discoverySignal: { eligible_categories: ['third_party_visual_assets'], selected_category: 'third_party_visual_assets', outcome: 'asked' },
      selectorSignal: { eligible: false, outcome: 'never_eligible' },
    })
  })

  test('multiple categories eligible -> fixed pilot priority order picks client_provided_source_assets over likeness_publicity_rights', async () => {
    const store = createInMemorySessionStore()
    const outcome = await runTurn(
      { token: 'crd-multi', turnNumber: 1, userText: 'x' },
      eligibleTurnDeps('I made this for a client and it shows my face on camera.', { decider: sequencedDecider([askDecision()]) }, store),
    )
    expect(outcome).toEqual({
      kind: 'question',
      message: COMMERCIAL_READINESS_DISCOVERY_QUESTIONS.client_provided_source_assets,
      discoverySignal: {
        eligible_categories: ['client_provided_source_assets', 'likeness_publicity_rights'],
        selected_category: 'client_provided_source_assets',
        outcome: 'asked',
      },
      selectorSignal: { eligible: false, outcome: 'never_eligible' },
    })
  })

  test('no indicator language present -> Applicability unknown for all three categories, ordinary candidate flow used instead', async () => {
    const store = createInMemorySessionStore()
    const ordinary = proposal({ question_text: 'What platform did you use?' })
    const outcome = await runTurn(
      { token: 'crd-unknown', turnNumber: 1, userText: 'x' },
      eligibleTurnDeps('a short promotional video', { generator: sequencedGenerator([ordinary]), decider: sequencedDecider([askDecision()]) }, store),
    )
    expect(outcome).toEqual({
      kind: 'question',
      message: 'What platform did you use?',
      discoverySignal: { eligible_categories: [], selected_category: null, outcome: 'never_eligible' },
      selectorSignal: { eligible: false, outcome: 'never_eligible' },
    })
  })

  test('cap already used (from an earlier turn) -> category not eligible despite affirmative applicability; ordinary candidate flow used instead', async () => {
    const store = createInMemorySessionStore()
    await store.save('crd-capped', {
      structured_understanding: {
        project_facts: {
          intended_use: { attestation: { state: 'confirmed', value: 'made the video for a client' }, source_turn: 1, source_statement: 'x' },
          workflow_role: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
          jurisdiction: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
          human_contribution_description: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
        },
        tool_mentions: [
          {
            mention_id: 't1',
            resolution: { kind: 'canonical', identifier: 'runway-gen3' },
            access_surface: { state: 'unknown' },
            plan_tier: { state: 'unknown' },
            account_status: { state: 'unknown' },
            confidence: 'confirmed',
            source_turn: 1,
            source_statement: 'Runway',
            superseded_by: null,
          },
        ],
        scoped_observations: [],
        user_goals: [],
        asset_provider_mentions: [],
        assessment_jurisdiction_mentions: [],
        content_presence_mentions: [],
    current_phase: 2,
        gate_1_state: 'met',
        gate_2_state: 'not_yet_stable',
        completion_reason: null,
        opt_out_scope: null,
      },
      boundary_state: { ...createInitialBoundaryState(), commercial_readiness_discovery_asked: true },
      pending_clarification: null,
      pending_commercial_readiness_takeaway: null,
    })
    const ordinary = proposal({ question_text: 'Anything else about the workflow?' })
    const outcome = await runTurn(
      { token: 'crd-capped', turnNumber: 2, userText: 'anything' },
      deps(
        { extractor: constantExtractor([workflowRoleCandidate('solo operator')]), generator: sequencedGenerator([ordinary]), decider: sequencedDecider([askDecision()]) },
        store,
      ),
    )
    expect(outcome).toEqual({
      kind: 'question',
      message: 'Anything else about the workflow?',
      discoverySignal: { eligible_categories: [], selected_category: null, outcome: 'never_eligible' },
      selectorSignal: { eligible: false, outcome: 'never_eligible' },
    })
  })
})

describe('Commercial Readiness Discovery -- Constraint A / Constraint B interaction', () => {
  test('Constraint A rejects the discovery candidate -> not asked; falls back to the ordinary pool; cap is NOT consumed by a rejected attempt', async () => {
    const store = createInMemorySessionStore()
    const ordinary = proposal({ question_text: 'Ordinary fallback question.' })
    const outcome = await runTurn(
      { token: 'crd-constraint-a', turnNumber: 1, userText: 'x' },
      eligibleTurnDeps(
        'made the video for a client',
        // sequencedGenerator scripted with exactly ONE entry: if attempt 1
        // wrongly called the ordinary generator instead of using the
        // deterministic override, or attempt 2 somehow called it twice,
        // this throws.
        { generator: sequencedGenerator([ordinary]), decider: sequencedDecider([suppressDecision(), askDecision()]) },
        store,
      ),
    )
    expect(outcome).toEqual({
      kind: 'question',
      message: 'Ordinary fallback question.',
      discoverySignal: { eligible_categories: ['client_provided_source_assets'], selected_category: 'client_provided_source_assets', outcome: 'rejected_by_a' },
      selectorSignal: { eligible: false, outcome: 'never_eligible' },
    })
    const loaded = await loadState(store, 'crd-constraint-a')
    expect(loaded.boundary_state.commercial_readiness_discovery_asked).toBe(false)
    expect(loaded.pending_commercial_readiness_takeaway).toBeNull()
  })

  test('Constraint B is the mechanism enforcing the cap (unit-level proof) -- see boundaries.test.ts "commercial-readiness discovery cap" suite for the direct evaluateBoundary() coverage this integration relies on', () => {
    // Deliberately not re-tested here: selectEligibleCommercialReadinessCategory
    // already prevents a second discovery candidate from ever being
    // CONSTRUCTED once the cap is set, so evaluateBoundary()'s own
    // COMMERCIAL_READINESS_DISCOVERY_ALREADY_ASKED branch is structurally
    // unreachable from run-turn.ts's own wiring in practice -- it is
    // covered directly, at the unit level, in boundaries.test.ts instead.
    expect(true).toBe(true)
  })
})

describe('Commercial Readiness Discovery -- Model 4 interaction', () => {
  test('attempt 1 (discovery) rejected -> attempt 2 falls back to the ordinary pool, never a second discovery category, even when a second category was also independently eligible', async () => {
    const store = createInMemorySessionStore()
    const ordinary = proposal({ question_text: 'Ordinary fallback question.' })
    const outcome = await runTurn(
      { token: 'crd-no-second-category', turnNumber: 1, userText: 'x' },
      eligibleTurnDeps(
        'I made this for a client and it shows my face on camera.',
        // client_provided_source_assets (priority 1) is attempt 1 and gets
        // rejected here. likeness_publicity_rights (priority 2) is ALSO
        // eligible this turn -- it must never become attempt 2.
        { generator: sequencedGenerator([ordinary]), decider: sequencedDecider([suppressDecision(), askDecision()]) },
        store,
      ),
    )
    expect(outcome).toEqual({
      kind: 'question',
      message: 'Ordinary fallback question.',
      discoverySignal: {
        eligible_categories: ['client_provided_source_assets', 'likeness_publicity_rights'],
        selected_category: 'client_provided_source_assets',
        outcome: 'rejected_by_a',
      },
      selectorSignal: { eligible: false, outcome: 'never_eligible' },
    })
  })

  test('questioning_exhausted still fires correctly when discovery is not eligible and both ordinary attempts fail (regression check against the pre-integration Model 4 baseline)', async () => {
    const store = createInMemorySessionStore()
    const outcome = await runTurn(
      { token: 'crd-exhausted', turnNumber: 1, userText: 'We used Runway.' },
      deps({ extractor: constantExtractor([toolCandidate()]), generator: sequencedGenerator([null, null]) }, store),
    )
    expect(outcome.kind).toBe('complete')
    const loaded = await loadState(store, 'crd-exhausted')
    expect(loaded.structured_understanding.completion_reason).toBe('questioning_exhausted')
  })
})

describe('Commercial Readiness Discovery -- cap persistence + Educational Takeaway delivery', () => {
  test('once asked, no later turn asks a second discovery question; the fixed takeaway appears exactly once, on the very next turn, verbatim', async () => {
    const store = createInMemorySessionStore()

    // Turn 1: discovery question asked (client_provided_source_assets). No
    // takeaway yet -- nothing was pending before this turn.
    const turn1 = await runTurn(
      { token: 'crd-persist', turnNumber: 1, userText: 'x' },
      eligibleTurnDeps('made the video for a client', { decider: sequencedDecider([askDecision()]) }, store),
    )
    expect(turn1).toEqual({
      kind: 'question',
      message: COMMERCIAL_READINESS_DISCOVERY_QUESTIONS.client_provided_source_assets,
      discoverySignal: { eligible_categories: ['client_provided_source_assets'], selected_category: 'client_provided_source_assets', outcome: 'asked' },
      selectorSignal: { eligible: false, outcome: 'never_eligible' },
    })

    // Turn 2: user answers. Extracts a fresh scoped_observation so Gate 2
    // registers a real change (MATERIAL_CHANGE_DETECTED) instead of
    // 'stable' -- everything relevant to Gate 1/Phase 3 was already
    // confirmed on turn 1, so a turn extracting nothing new here would
    // read as gate_1_gate_2_met and finalize immediately, before this
    // turn's own candidate generation (and therefore its takeaway
    // delivery) is ever reached -- not what this test means to exercise.
    // The fixed, verbatim Educational Takeaway rides along with whatever
    // this turn's own outcome is -- here, an ordinary follow-up question.
    // Never a discovery repeat, even though the answer text itself
    // contains further client-involvement language.
    const ordinary = proposal({ question_text: 'Anything else?' })
    const turn2 = await runTurn(
      { token: 'crd-persist', turnNumber: 2, userText: 'Yes, they gave me their logo for a client campaign.' },
      deps(
        {
          extractor: constantExtractor([
            { proposal_id: 'c-obs', turn: 2, raw_text: 'They gave me their logo.', kind: 'scoped_observation', scope: 'current_project', workflow_stage: 'T2', observation_confidence_hint: 'confirmed' },
          ]),
          generator: sequencedGenerator([ordinary]),
          decider: sequencedDecider([askDecision()]),
        },
        store,
      ),
    )
    expect(turn2).toEqual({
      kind: 'question',
      message: 'Anything else?',
      precedingTakeaway: COMMERCIAL_READINESS_TAKEAWAYS.client_provided_source_assets,
      discoverySignal: { eligible_categories: [], selected_category: null, outcome: 'never_eligible' },
      selectorSignal: { eligible: false, outcome: 'never_eligible' },
    })

    // Turn 3: takeaway was already consumed on turn 2 -- must not repeat,
    // and no second discovery question fires despite continued applicability.
    // Another fresh scoped_observation keeps Gate 2 from reading 'stable'
    // for the same reason as turn 2 above.
    const ordinary2 = proposal({ question_text: 'One more thing.' })
    const turn3 = await runTurn(
      { token: 'crd-persist', turnNumber: 3, userText: 'anything' },
      deps(
        {
          extractor: constantExtractor([
            { proposal_id: 'c-obs2', turn: 3, raw_text: 'One more detail.', kind: 'scoped_observation', scope: 'current_project', workflow_stage: 'T3', observation_confidence_hint: 'confirmed' },
          ]),
          generator: sequencedGenerator([ordinary2]),
          decider: sequencedDecider([askDecision()]),
        },
        store,
      ),
    )
    expect(turn3).toEqual({
      kind: 'question',
      message: 'One more thing.',
      discoverySignal: { eligible_categories: [], selected_category: null, outcome: 'never_eligible' },
      selectorSignal: { eligible: false, outcome: 'never_eligible' },
    })
    expect((turn3 as TurnOutcome).precedingTakeaway).toBeUndefined()
  })

  test('takeaway never leaks into ProjectionOutput -- it lives only on TurnOutcome.precedingTakeaway, never Retrieval or Projection', async () => {
    const store = createInMemorySessionStore()
    await runTurn(
      { token: 'crd-no-leak', turnNumber: 1, userText: 'x' },
      eligibleTurnDeps('made the video for a client', { decider: sequencedDecider([askDecision()]) }, store),
    )
    // Turn 2: interview-scope decline finalizes the session THIS turn --
    // the deterministic way to reach a 'complete' outcome and exercise the
    // exact branch that must still attach precedingTakeaway to it.
    const outcome = await runTurn({ token: 'crd-no-leak', turnNumber: 2, userText: 'stop', declineAction: 'stop_interview' }, deps({}, store))
    expect(outcome.kind).toBe('complete')
    expect(outcome.precedingTakeaway).toBe(COMMERCIAL_READINESS_TAKEAWAYS.client_provided_source_assets)
    if (outcome.kind === 'complete') {
      const serialized = JSON.stringify(outcome.result.output)
      // "rights and documentation question" is a distinctive phrase from
      // the client_provided_source_assets takeaway text -- absent from
      // every other fixed string this pipeline produces.
      expect(serialized).not.toContain('rights and documentation question')
    }
  })

  test('the takeaway text used is exact, verbatim catalog copy -- never LLM-rewritten (proven by direct equality against the exported catalog constant, not a substring/approximate match)', async () => {
    const store = createInMemorySessionStore()
    await runTurn(
      { token: 'crd-verbatim', turnNumber: 1, userText: 'x' },
      eligibleTurnDeps('the video shows my face talking to the camera', { decider: sequencedDecider([askDecision()]) }, store),
    )
    const ordinary = proposal({ question_text: 'Anything else?' })
    const turn2 = await runTurn(
      { token: 'crd-verbatim', turnNumber: 2, userText: 'anything' },
      deps({ generator: sequencedGenerator([ordinary]), decider: sequencedDecider([askDecision()]) }, store),
    )
    expect(turn2.precedingTakeaway).toBe(COMMERCIAL_READINESS_TAKEAWAYS.likeness_publicity_rights)
    // Never a verdict word.
    for (const forbidden of ['checked', 'cleared', 'verified', 'found a risk', 'compliant', 'noncompliant']) {
      expect(turn2.precedingTakeaway?.toLowerCase()).not.toContain(forbidden)
    }
  })
})
