/**
 * CRC Selector Attempt Observability milestone (2026-08-27).
 *
 * Purely additive telemetry: `TurnOutcome.selectorSignal` labels the SAME
 * deterministic `selectorNeeds`/`selectorProposal` eligibility and the SAME
 * `tryCandidate()` validation/Constraint-A/Constraint-B pipeline that already
 * existed -- no new eligibility logic, no new candidate source, no change to
 * `deriveSelectorNeeds`, `evaluateBoundary`, or candidate precedence. These
 * tests prove the labeling is accurate and that nothing behavioral changed.
 *
 * Reuses the same real, unmocked Kling `tool_account_status` fixture shape
 * as run-turn-selector-exhaustion-guard.test.ts (its own sibling file) --
 * genericity of the underlying mechanism is proven there and in
 * tool-account-status-selector.test.ts, not re-proven here.
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

/** Approves only the governed selector's own proposal -- same helper shape as the sibling exhaustion-guard file. */
const selectorOnlyDecider: ConstraintADecider = async ({ candidate }) => ({
  should_ask: candidate.question_kind === 'governed_selector_clarification',
  reason_code: candidate.question_kind === 'governed_selector_clarification' ? 'MATERIALLY_IMPROVES_UNDERSTANDING' : 'NO_MATERIAL_IMPROVEMENT',
  rationale: 'x',
})

/** Rejects the governed selector specifically, but approves an ordinary ('other') candidate -- proves attempt-2 ordinary fallback is unaffected by the new telemetry. */
const rejectSelectorOnlyDecider: ConstraintADecider = async ({ candidate }) => ({
  should_ask: candidate.question_kind !== 'governed_selector_clarification',
  reason_code: candidate.question_kind !== 'governed_selector_clarification' ? 'MATERIALLY_IMPROVES_UNDERSTANDING' : 'NO_MATERIAL_IMPROVEMENT',
  rationale: 'x',
})

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

function harmlessNewFactCandidate(turn: number): CandidateObservation {
  return { proposal_id: 'p-harmless', turn, raw_text: 'we reviewed the draft internally', kind: 'scoped_observation', scope: 'current_project', workflow_stage: null, observation_confidence_hint: 'confirmed' }
}

/** "a paid campaign for a client" deliberately ALSO satisfies Discovery's own client_involvement indicator -- reused deliberately (not avoided) for the preemption test below. */
function foundationDeps(overrides: Partial<RunTurnDeps> = {}, store?: SessionStore): RunTurnDeps {
  return deps(
    { extractor: constantExtractor([toolCandidate(), intendedUseCandidate('a paid campaign for a client'), workflowRoleCandidate('solo operator'), goalCandidate()]), ...overrides },
    store,
  )
}

describe('selectorSignal: never eligible', () => {
  test('no governed selector need this turn -> eligible: false, outcome: never_eligible, no dedupe_key', async () => {
    const store = createInMemorySessionStore()
    const q = { question_text: 'Ordinary.', question_kind: 'other' as const, target_signal_id: null, phase: 3 as const }
    const outcome = await runTurn({ token: 't1', turnNumber: 1, userText: 'x' }, deps({ generator: constantCandidateQuestionGenerator(q) }, store))
    expect(outcome.kind).toBe('question')
    expect(outcome.selectorSignal).toEqual({ eligible: false, outcome: 'never_eligible' })
  })
})

describe('selectorSignal: preempted by a higher-precedence forced source', () => {
  test('Discovery and the Kling selector are BOTH eligible the same turn -> Discovery wins the forced slot; selectorSignal reports preempted_by_discovery, not asked/rejected', async () => {
    const store = createInMemorySessionStore()
    const outcome = await runTurn({ token: 't1', turnNumber: 1, userText: 'x' }, foundationDeps({}, store))
    // Discovery wins attempt 1 (jurisdiction/human-contribution not eligible in
    // this fixture at all; Discovery precedes selector when both eligible).
    expect(outcome.kind).toBe('question')
    expect(outcome.discoverySignal?.outcome).toBe('asked')
    expect(outcome.selectorSignal).toEqual({
      eligible: true,
      dedupe_key: 'tool_account_status::kling',
      outcome: 'preempted_by_discovery',
    })
    // The selector's own cap must NOT be consumed merely because it was
    // preempted -- only an approved evaluateBoundary call ever mutates state.
    const loaded = (await store.load('t1')) as { boundary_state: { selector_needs_used: Record<string, number> } }
    expect(loaded.boundary_state.selector_needs_used['tool_account_status::kling']).toBeUndefined()
  })
})

describe('selectorSignal: accepted candidate, behaviorally unchanged', () => {
  test('once Discovery is capped, the Kling selector wins the forced slot outright and is approved -> selectorSignal reports asked, cap consumed, question text unchanged from pre-observability behavior', async () => {
    const store = createInMemorySessionStore()
    await runTurn({ token: 't1', turnNumber: 1, userText: 'x' }, foundationDeps({}, store)) // Discovery asked + capped here.

    const second = await runTurn({ token: 't1', turnNumber: 2, userText: 'x' }, deps({ decider: selectorOnlyDecider }, store))
    expect(second.kind).toBe('question')
    if (second.kind === 'question') {
      // Exact same fixed text this mechanism has always produced -- proves
      // the observability change did not alter candidate generation.
      expect(second.message).toBe('Do you know what kind of kling account or membership you currently have?')
    }
    expect(second.selectorSignal).toEqual({ eligible: true, dedupe_key: 'tool_account_status::kling', outcome: 'asked' })

    const loaded = (await store.load('t1')) as { boundary_state: { selector_needs_used: Record<string, number> } }
    expect(loaded.boundary_state.selector_needs_used['tool_account_status::kling']).toBe(1)
  })
})

describe('selectorSignal: Constraint A rejection is distinguishable, ordinary fallback unchanged', () => {
  test('the selector is eligible and reaches the forced slot but Constraint A rejects it -> selectorSignal reports rejected_by_a, cap NOT consumed, attempt-2 ordinary fallback still asks its own question unaffected', async () => {
    const store = createInMemorySessionStore()
    await runTurn({ token: 't1', turnNumber: 1, userText: 'x' }, foundationDeps({}, store)) // Discovery asked + capped here.

    const second = await runTurn({ token: 't1', turnNumber: 2, userText: 'x' }, deps({ decider: rejectSelectorOnlyDecider }, store))
    // Ordinary fallback (attempt 2) is untouched -- FILLER_PROPOSAL still gets asked.
    expect(second.kind).toBe('question')
    if (second.kind === 'question') {
      expect(second.message).toBe('[ordinary filler]')
    }
    expect(second.selectorSignal).toEqual({ eligible: true, dedupe_key: 'tool_account_status::kling', outcome: 'rejected_by_a' })

    // A Constraint-A rejection must never consume the selector's own cap --
    // only evaluateBoundary's "allowed" branch (never reached here) mutates it.
    const loaded = (await store.load('t1')) as { boundary_state: { selector_needs_used: Record<string, number> } }
    expect(loaded.boundary_state.selector_needs_used['tool_account_status::kling']).toBeUndefined()
  })
})

describe('selectorSignal: Constraint-B rejection is structurally unreachable for this kind (documented, not forced)', () => {
  test('a dedupe key already marked used makes the need NOT ELIGIBLE at all (never_eligible), never a live rejected_by_b -- deriveSelectorNeeds\' own boundaryState filter (selector-questioning.ts) pre-empts evaluateBoundary\'s identical cap check before a proposal is ever built', async () => {
    const store = createInMemorySessionStore()
    await runTurn({ token: 't1', turnNumber: 1, userText: 'x' }, foundationDeps({}, store))
    const loadedAfterFirst = await store.load('t1')
    await store.save('t1', {
      ...loadedAfterFirst!,
      boundary_state: { ...loadedAfterFirst!.boundary_state, selector_needs_used: { 'tool_account_status::kling': 1 } },
    })

    const second = await runTurn(
      { token: 't1', turnNumber: 2, userText: 'x' },
      deps({ decider: selectorOnlyDecider, extractor: constantExtractor([harmlessNewFactCandidate(2)]) }, store),
    )
    // never_eligible, not rejected_by_b: eligibility (selector-questioning.ts)
    // and enforcement (boundaries.ts) check the IDENTICAL compound key from
    // the SAME boundaryStateForTurn within one turn, so eligibility always
    // pre-empts enforcement for this kind -- there is no live path that
    // reaches Constraint B with an already-capped selector need.
    expect(second.selectorSignal?.outcome).toBe('never_eligible')
    expect(second.selectorSignal?.eligible).toBe(false)
  })
})
