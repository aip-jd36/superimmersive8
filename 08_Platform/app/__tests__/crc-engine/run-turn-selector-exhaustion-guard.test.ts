/**
 * Selector Opportunity at questioning_exhausted milestone (2026-08-25).
 *
 * Real-UAT-found defect: the completion guard added by the prior milestone
 * (Selector Opportunity Before Natural Completion) correctly defers ordinary
 * gate_1_gate_2_met completion when a governed selector need is still
 * pending, but a higher-precedence forced candidate (jurisdiction/human-
 * contribution/Commercial Readiness Discovery) can still legitimately
 * occupy attempt 1 the same turn, get rejected by Constraint A, exhaust
 * attempt 2 (always the ordinary pool, per Model 4's own unchanged rule),
 * and fall through to the SEPARATE `questioning_exhausted` finalization
 * path -- which never re-consults checkCompletion() and therefore never
 * saw the still-pending selector at all.
 *
 * Fixed by adding one more last-resort forced attempt (attempt #4), in the
 * exact same slot the existing Track B (Knowledge Readiness) check already
 * occupies, reusing deriveSelectorNeeds/buildSelectorNeedProposal verbatim.
 *
 * Uses the real, unmocked selector-askability registry and the real Kling
 * MATRIX_FIXTURE throughout (Kling is simply the first governed consumer --
 * genericity of the mechanism ITSELF is proven separately, at the same
 * mocked-registry boundary this session's sibling test files already
 * established, in run-turn-selector-exhaustion-guard-genericity.test.ts).
 */

import { runTurn, type RunTurnDeps } from '@/lib/crc-engine/run-turn'
import { createInMemorySessionStore } from '@/lib/crc-engine/in-memory-session-store'
import { constantExtractor } from '@/lib/interview-engine/mock-extractor'
import { constantCandidateQuestionGenerator } from '@/lib/interview-engine/mock-candidate-question'
import { constantConstraintADecider } from '@/lib/interview-engine/mock-decision'
import type { ConstraintADecider } from '@/lib/interview-engine/decision'
import type { CandidateObservation } from '@/lib/interview-engine/extraction'
import type { SessionStore } from '@/lib/crc-engine/session-store'
import { MATRIX_FIXTURE } from '@/lib/retrieval-engine/matrix-fixture'

const FILLER_PROPOSAL = { question_text: '[ordinary filler]', question_kind: 'other' as const, target_signal_id: null, phase: 3 as const }

/** Approves only the governed selector's own proposal; rejects everything else (Discovery, ordinary, jurisdiction, human-contribution). Simulates the real UAT's live Constraint A rejecting the higher-precedence candidate while still being willing to approve the selector's dedicated last-resort attempt. */
const selectorOnlyDecider: ConstraintADecider = async ({ candidate }) => ({
  should_ask: candidate.question_kind === 'governed_selector_clarification',
  reason_code: candidate.question_kind === 'governed_selector_clarification' ? 'MATERIALLY_IMPROVES_UNDERSTANDING' : 'NO_MATERIAL_IMPROVEMENT',
  rationale: 'x',
})

/** Rejects every candidate, selector included -- proves the dedicated attempt is genuinely bounded by Constraint A, not a privileged pass. */
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
  return { proposal_id: 'p-1', turn: 1, raw_text: 'We used Kling.', kind: 'tool_mention', raw_tool_name: 'Kling', ...overrides }
}

function intendedUseCandidate(value: string): CandidateObservation {
  return { proposal_id: 'p-use', turn: 1, raw_text: value, kind: 'project_fact', raw_fact_field: 'intended_use', fact_confidence_hint: 'confirmed', fact_value_hint: value }
}

function workflowRoleCandidate(value: string): CandidateObservation {
  return { proposal_id: 'p-role', turn: 1, raw_text: value, kind: 'project_fact', raw_fact_field: 'workflow_role', fact_confidence_hint: 'confirmed', fact_value_hint: value }
}

function goalCandidate(): CandidateObservation {
  return {
    proposal_id: 'p-goal',
    turn: 1,
    raw_text: 'Can I use this commercially?',
    kind: 'user_goal',
    goal_confidence_hint: 'confirmed',
    goal_category_hint: 'commercial_use',
    goal_scope_hint: 'informational',
  }
}

/**
 * A harmless, unrelated new fact -- touches nothing Gate 2 already knows
 * about (a fresh scoped_observation, always "(new)" in diffScopedObservations
 * regardless of content) so Gate 2 reads not_yet_stable on this turn. Needed
 * only so the turn actually reaches candidate generation/exhaustion instead
 * of completing immediately via the prior milestone's own gate_1_gate_2_met
 * completion guard (which correctly short-circuits before candidate
 * generation whenever nothing changed AND no selector need is pending --
 * exactly the "unchanged normal-completion behavior" every negative test
 * below needs to route AROUND, not exercise, to actually reach exhaustion).
 */
function harmlessNewFactCandidate(turn: number): CandidateObservation {
  return {
    proposal_id: 'p-harmless',
    turn,
    raw_text: 'we reviewed the draft internally',
    kind: 'scoped_observation',
    scope: 'current_project',
    workflow_stage: null,
    observation_confidence_hint: 'confirmed',
  }
}

/**
 * "a paid campaign for a client" deliberately matches
 * commercial-readiness-indicators.ts's own CLIENT_INVOLVEMENT_AFFIRMATIVE_
 * PHRASES ("for a client") -- the exact mechanism that made Commercial
 * Readiness Discovery (client_provided_source_assets) eligible in the real
 * UAT, reused here (not re-derived) to faithfully reproduce the higher-
 * precedence-candidate condition.
 */
function foundationDeps(overrides: Partial<RunTurnDeps> = {}, store?: SessionStore): RunTurnDeps {
  return deps(
    {
      extractor: constantExtractor([toolCandidate(), intendedUseCandidate('a paid campaign for a client'), workflowRoleCandidate('solo operator'), goalCandidate()]),
      ...overrides,
    },
    store,
  )
}

describe('V/H: critical real-defect regression -- dedicated selector attempt rescues an otherwise-exhausted turn', () => {
  test('Discovery occupies and loses attempt 1, ordinary attempt 2 also fails, the selector gets a dedicated attempt 4 and is asked instead of exhausting', async () => {
    const store = createInMemorySessionStore()
    const first = await runTurn({ token: 't1', turnNumber: 1, userText: 'x' }, foundationDeps({}, store))
    expect(first.kind).not.toBe('complete')

    const second = await runTurn({ token: 't1', turnNumber: 2, userText: 'x' }, deps({ decider: selectorOnlyDecider }, store))
    expect(second.kind).toBe('question')
    if (second.kind === 'question') {
      expect(second.message).toBe('Do you know what kind of kling account or membership you currently have?')
    }

    const loaded = (await store.load('t1')) as { structured_understanding: { completion_reason: string | null }; boundary_state: { selector_needs_used: Record<string, number> } }
    expect(loaded.structured_understanding.completion_reason).toBeNull()
    expect(loaded.boundary_state.selector_needs_used['tool_account_status::kling']).toBe(1)
  })
})

describe('I/17: rejected dedicated attempt -- no retry, no fallback, exhaustion proceeds', () => {
  test('when the dedicated selector attempt is also rejected, the turn finalizes via questioning_exhausted exactly as before, cap never consumed', async () => {
    const store = createInMemorySessionStore()
    await runTurn({ token: 't1', turnNumber: 1, userText: 'x' }, foundationDeps({}, store))

    const second = await runTurn({ token: 't1', turnNumber: 2, userText: 'x' }, deps({ decider: rejectAllDecider }, store))
    expect(second.kind).toBe('complete')

    const loaded = (await store.load('t1')) as { structured_understanding: { completion_reason: string | null }; boundary_state: { selector_needs_used: Record<string, number> } }
    expect(loaded.structured_understanding.completion_reason).toBe('questioning_exhausted')
    expect(loaded.boundary_state.selector_needs_used['tool_account_status::kling']).toBeUndefined()
  })
})

describe('J/11: no eligible selector -- exhaustion behavior is unchanged', () => {
  test('account_status already confirmed (no unresolved gap) -> deriveSelectorNeeds() is empty -> exhaustion proceeds exactly as before this milestone', async () => {
    const store = createInMemorySessionStore()
    const preresolvedTool = toolCandidate({ account_status_confidence_hint: 'confirmed', account_status_value_hint: 'Member Account' })
    await runTurn(
      { token: 't1', turnNumber: 1, userText: 'x' },
      foundationDeps({ extractor: constantExtractor([preresolvedTool, intendedUseCandidate('a paid campaign for a client'), workflowRoleCandidate('solo operator'), goalCandidate()]) }, store),
    )

    const second = await runTurn(
      { token: 't1', turnNumber: 2, userText: 'x' },
      deps({ decider: rejectAllDecider, extractor: constantExtractor([harmlessNewFactCandidate(2)]) }, store),
    )
    expect(second.kind).toBe('complete')

    const loaded = (await store.load('t1')) as { structured_understanding: { completion_reason: string | null } }
    expect(loaded.structured_understanding.completion_reason).toBe('questioning_exhausted')
  })
})

describe('K/12: selector already consumed -- cannot receive a second, exhaustion-triggered attempt', () => {
  test('an already-consumed dedupe key means deriveSelectorNeeds returns none even though the underlying applicability gap is still unresolved -- exhaustion proceeds, cap stays at 1', async () => {
    const store = createInMemorySessionStore()
    await runTurn({ token: 't1', turnNumber: 1, userText: 'x' }, foundationDeps({}, store))

    const loadedAfterFirst = await store.load('t1')
    await store.save('t1', {
      ...loadedAfterFirst!,
      boundary_state: { ...loadedAfterFirst!.boundary_state, selector_needs_used: { 'tool_account_status::kling': 1 } },
    })

    const second = await runTurn(
      { token: 't1', turnNumber: 2, userText: 'x' },
      deps({ decider: rejectAllDecider, extractor: constantExtractor([harmlessNewFactCandidate(2)]) }, store),
    )
    expect(second.kind).toBe('complete')

    const loaded = (await store.load('t1')) as { structured_understanding: { completion_reason: string | null }; boundary_state: { selector_needs_used: Record<string, number> } }
    expect(loaded.structured_understanding.completion_reason).toBe('questioning_exhausted')
    expect(loaded.boundary_state.selector_needs_used['tool_account_status::kling']).toBe(1)
  })
})

describe('L/13: non-askable unresolved applicability -- exhaustion proceeds, applicability != askability preserved', () => {
  const MATRIX_PLAN_TIER_ONLY: RunTurnDeps['matrix'] = [
    {
      identifier: 'kling',
      last_verified: '2026-08-25',
      claims: [
        {
          claim_id: 'kling-plan-tier-gated-exhaustion-test',
          crc_eligible: 'Yes',
          crc_publication_scope: 'x',
          crc_candidate_statement: 'x',
          topic: 'commercial_use',
          applicability_requirements: [{ fact: 'tool_plan_tier', tool: 'kling', operator: 'equals', value: 'paid' }],
        },
      ],
    },
  ]

  test('an unresolved tool_plan_tier gap (still unregistered/non-askable) never receives a dedicated attempt', async () => {
    const store = createInMemorySessionStore()
    await runTurn({ token: 't1', turnNumber: 1, userText: 'x' }, foundationDeps({ matrix: MATRIX_PLAN_TIER_ONLY }, store))

    const second = await runTurn(
      { token: 't1', turnNumber: 2, userText: 'x' },
      deps({ decider: rejectAllDecider, matrix: MATRIX_PLAN_TIER_ONLY, extractor: constantExtractor([harmlessNewFactCandidate(2)]) }, store),
    )
    expect(second.kind).toBe('complete')

    const loaded = (await store.load('t1')) as { structured_understanding: { completion_reason: string | null } }
    expect(loaded.structured_understanding.completion_reason).toBe('questioning_exhausted')
  })
})

describe('M/14: discovered-only relevance -- no explicit confirmed goal, exhaustion proceeds, Track A/C preserved', () => {
  test('Kling present with unresolved account_status but no confirmed explicit commercial_use goal -> no dedicated attempt, exhaustion proceeds', async () => {
    const store = createInMemorySessionStore()
    await runTurn(
      { token: 't1', turnNumber: 1, userText: 'x' },
      deps({ extractor: constantExtractor([toolCandidate(), intendedUseCandidate('a paid campaign for a client'), workflowRoleCandidate('solo operator')]) }, store),
    )

    const second = await runTurn(
      { token: 't1', turnNumber: 2, userText: 'x' },
      deps({ decider: rejectAllDecider, extractor: constantExtractor([harmlessNewFactCandidate(2)]) }, store),
    )
    expect(second.kind).toBe('complete')

    const loaded = (await store.load('t1')) as { structured_understanding: { completion_reason: string | null } }
    expect(loaded.structured_understanding.completion_reason).toBe('questioning_exhausted')
  })
})
