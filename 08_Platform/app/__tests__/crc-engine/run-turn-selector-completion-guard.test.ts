/**
 * Selector Opportunity Before Natural Completion milestone (2026-08-25).
 *
 * Real-UAT-found defect: natural completion (checkCompletion, gates.ts) was
 * entirely independent of whether an already-eligible, un-consumed governed
 * selector need existed -- CRC could finalize before a live tool_account_
 * status-style question ever got a chance to compete in candidate
 * generation, because natural completion short-circuits before candidate
 * generation ever runs. Fixed in run-turn.ts by reusing deriveSelectorNeeds
 * (the same sole selector-eligibility authority the ordinary ask-path
 * already uses) as a gate on finalizing.
 *
 * Test turns are deliberately sequenced to add the confirmed commercial_use
 * UserGoal on its OWN turn, touching nothing else -- Gate 2's diff
 * (gates.ts) does not track user_goals at all (a separate, pre-existing,
 * out-of-scope gap, same family as its already-known account_status/
 * asset_provider_mentions blindness), so that turn reads as materially
 * "stable" even though it is exactly the turn the Kling selector need
 * first becomes eligible -- reproducing the real defect's mechanism
 * directly rather than approximately.
 *
 * The default candidate-question generator returns a fixed, uncapped
 * ('other' kind, never subject to any boundary rule -- boundaries.ts's own
 * comment) filler proposal so that turns with nothing forced eligible
 * produce an ordinary "question" outcome instead of Model 4's separate
 * questioning_exhausted finalization path (a different, pre-existing,
 * unrelated completion route this milestone does not touch).
 *
 * Uses the real, unmocked selector-askability registry and the real Kling
 * MATRIX_FIXTURE throughout (Kling is simply the first governed consumer --
 * genericity of the fix ITSELF is proven separately, at the appropriate
 * mocked-registry boundary, in
 * run-turn-selector-completion-guard-genericity.test.ts).
 */

import { runTurn, type RunTurnDeps } from '@/lib/crc-engine/run-turn'
import { createInMemorySessionStore } from '@/lib/crc-engine/in-memory-session-store'
import { constantExtractor } from '@/lib/interview-engine/mock-extractor'
import { constantCandidateQuestionGenerator } from '@/lib/interview-engine/mock-candidate-question'
import { constantConstraintADecider } from '@/lib/interview-engine/mock-decision'
import type { CandidateObservation } from '@/lib/interview-engine/extraction'
import type { SessionStore } from '@/lib/crc-engine/session-store'
import { MATRIX_FIXTURE } from '@/lib/retrieval-engine/matrix-fixture'

const FILLER_PROPOSAL = { question_text: '[ordinary filler]', question_kind: 'other' as const, target_signal_id: null, phase: 3 as const }

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

function goalCandidate(overrides: Partial<CandidateObservation> = {}): CandidateObservation {
  return {
    proposal_id: 'p-goal',
    turn: 2,
    raw_text: 'Can I use this commercially?',
    kind: 'user_goal',
    goal_confidence_hint: 'confirmed',
    goal_category_hint: 'commercial_use',
    goal_scope_hint: 'informational',
    ...overrides,
  }
}

/** Turn 1: tool + intended_use + workflow_role only -- Gate 1 met, Phase 3, no goal yet (no selector need can exist without an explicit confirmed goal). */
function foundationTurnDeps(overrides: Partial<RunTurnDeps> = {}, store?: SessionStore): RunTurnDeps {
  return deps({ extractor: constantExtractor([toolCandidate(), intendedUseCandidate('a paid campaign'), workflowRoleCandidate('solo operator')]), ...overrides }, store)
}

describe('A: natural completion + live selector -- CRC does not finalize before the selector opportunity', () => {
  test('adding the confirmed goal on its own turn (invisible to Gate 2) makes the Kling selector eligible for the first time on an otherwise-stable turn -- completion is deferred and the real selector question is asked', async () => {
    const store = createInMemorySessionStore()
    const first = await runTurn({ token: 't1', turnNumber: 1, userText: 'x' }, foundationTurnDeps({}, store))
    expect(first.kind).not.toBe('complete')

    // Turn 2: ONLY the goal. Gate 2 reads stable (user_goals untracked),
    // Gate 1 was already met, phase stays 3 -- WITHOUT this milestone's
    // fix, checkCompletion would finalize here with reason
    // gate_1_gate_2_met, and the Kling selector -- newly eligible on this
    // EXACT turn -- would never get a chance to compete.
    const second = await runTurn({ token: 't1', turnNumber: 2, userText: 'x' }, deps({ extractor: constantExtractor([goalCandidate()]) }, store))
    expect(second.kind).toBe('question')
    if (second.kind === 'question') {
      expect(second.message).toBe('Do you know what kind of kling account or membership you currently have?')
    }

    const loaded = (await store.load('t1')) as { structured_understanding: { completion_reason: string | null }; boundary_state: { selector_needs_used: Record<string, number> } }
    expect(loaded.structured_understanding.completion_reason).toBeNull()
    expect(loaded.boundary_state.selector_needs_used['tool_account_status::kling']).toBe(1)
  })
})

describe('B: cap consumed -- an unresolved selector does not indefinitely block natural completion', () => {
  test('after the selector is asked and the answer leaves the fact unknown, the next stable turn completes normally, not asked again', async () => {
    const store = createInMemorySessionStore()
    await runTurn({ token: 't1', turnNumber: 1, userText: 'x' }, foundationTurnDeps({}, store))
    const asked = await runTurn({ token: 't1', turnNumber: 2, userText: 'x' }, deps({ extractor: constantExtractor([goalCandidate()]) }, store))
    expect(asked.kind).toBe('question')

    const loadedAfterAsk = (await store.load('t1')) as { structured_understanding: { tool_mentions: { mention_id: string }[] } }
    const priorId = loadedAfterAsk.structured_understanding.tool_mentions[0].mention_id

    // Turn 3: an ambiguous answer -- no account_status hint at all, matches
    // the real extractor's proven behavior for "I have Kling Pro." etc.
    // (Minimal Generic tool_account_status Capture milestone UAT). The
    // fact stays unknown; the cap is already consumed regardless.
    const ambiguousAnswer = toolCandidate({ proposal_id: 'p-2', turn: 3, raw_text: 'I have Kling Pro.', supersedes_tool_mention_id: priorId })
    const third = await runTurn({ token: 't1', turnNumber: 3, userText: 'I have Kling Pro.' }, deps({ extractor: constantExtractor([ambiguousAnswer]) }, store))
    if (third.kind === 'question') {
      expect(third.message).not.toBe('Do you know what kind of kling account or membership you currently have?')
    }

    // Turn 4: nothing new -- Gate 2 should be stable, and this time
    // completion must NOT be deferred (the selector's cap is consumed, so
    // deriveSelectorNeeds no longer returns it) -- CRC completes with the
    // fact still genuinely unresolved, exactly the desired lead-gen
    // product behavior (unknown is an acceptable terminal CRC state).
    const fourth = await runTurn({ token: 't1', turnNumber: 4, userText: 'x' }, deps({}, store))
    expect(fourth.kind).toBe('complete')

    const loaded = (await store.load('t1')) as { boundary_state: { selector_needs_used: Record<string, number> } }
    expect(loaded.boundary_state.selector_needs_used['tool_account_status::kling']).toBe(1)
  })
})

describe('C: clear answer resolves through the existing path with no special completion code', () => {
  test('a clear Member Account answer given during the deferred turn resolves normally; the following stable turn completes with the resolved fact intact', async () => {
    const store = createInMemorySessionStore()
    await runTurn({ token: 't1', turnNumber: 1, userText: 'x' }, foundationTurnDeps({}, store))
    const asked = await runTurn({ token: 't1', turnNumber: 2, userText: 'x' }, deps({ extractor: constantExtractor([goalCandidate()]) }, store))
    expect(asked.kind).toBe('question')

    const loadedAfterAsk = (await store.load('t1')) as { structured_understanding: { tool_mentions: { mention_id: string }[] } }
    const priorId = loadedAfterAsk.structured_understanding.tool_mentions[0].mention_id

    const memberAnswer = toolCandidate({
      proposal_id: 'p-2',
      turn: 3,
      raw_text: 'I have a Kling Member Account.',
      supersedes_tool_mention_id: priorId,
      account_status_confidence_hint: 'confirmed',
      account_status_value_hint: 'Member Account',
    })
    await runTurn({ token: 't1', turnNumber: 3, userText: 'I have a Kling Member Account.' }, deps({ extractor: constantExtractor([memberAnswer]) }, store))

    const fourth = await runTurn({ token: 't1', turnNumber: 4, userText: 'x' }, deps({}, store))
    expect(fourth.kind).toBe('complete')

    const loaded = (await store.load('t1')) as { structured_understanding: { tool_mentions: { account_status: { state: string; value?: string }; superseded_by: string | null }[] } }
    const active = loaded.structured_understanding.tool_mentions.find((m) => m.superseded_by === null)
    expect(active?.account_status).toEqual({ state: 'confirmed', value: 'Member Account' })
  })
})

describe('D: no selector -- natural completion behavior is unchanged when nothing is eligible', () => {
  test('account_status already confirmed and goal already established on turn 1 -> no eligible selector need ever exists -> completes on the first otherwise-qualifying stable turn, unchanged', async () => {
    const store = createInMemorySessionStore()
    const preresolvedTool = toolCandidate({ account_status_confidence_hint: 'confirmed', account_status_value_hint: 'Member Account' })
    await runTurn(
      { token: 't1', turnNumber: 1, userText: 'x' },
      deps({ extractor: constantExtractor([preresolvedTool, intendedUseCandidate('a paid campaign'), workflowRoleCandidate('solo operator'), goalCandidate({ turn: 1 })]) }, store),
    )
    const second = await runTurn({ token: 't1', turnNumber: 2, userText: 'x' }, deps({}, store))
    expect(second.kind).toBe('complete')

    const loaded = (await store.load('t1')) as { structured_understanding: { completion_reason: string | null } }
    expect(loaded.structured_understanding.completion_reason).toBe('gate_1_gate_2_met')
  })
})

describe('E: non-askable unresolved applicability must not delay completion (applicability != askability)', () => {
  const MATRIX_WITH_PLAN_TIER_GATE: RunTurnDeps['matrix'] = [
    {
      identifier: 'kling',
      last_verified: '2026-08-25',
      claims: [
        {
          claim_id: 'kling-plan-tier-gated-test-claim',
          crc_eligible: 'Yes',
          crc_publication_scope: 'x',
          crc_candidate_statement: 'x',
          topic: 'commercial_use',
          applicability_requirements: [{ fact: 'tool_plan_tier', tool: 'kling', operator: 'equals', value: 'paid' }],
        },
      ],
    },
  ]

  test('an unresolved tool_plan_tier gap (still unregistered/non-askable) does not defer completion, even added on the same otherwise-stable turn as the explicit goal', async () => {
    const store = createInMemorySessionStore()
    await runTurn({ token: 't1', turnNumber: 1, userText: 'x' }, foundationTurnDeps({ matrix: MATRIX_WITH_PLAN_TIER_GATE }, store))
    const second = await runTurn({ token: 't1', turnNumber: 2, userText: 'x' }, deps({ extractor: constantExtractor([goalCandidate()]), matrix: MATRIX_WITH_PLAN_TIER_GATE }, store))
    expect(second.kind).toBe('complete')

    const loaded = (await store.load('t1')) as { structured_understanding: { completion_reason: string | null } }
    expect(loaded.structured_understanding.completion_reason).toBe('gate_1_gate_2_met')
  })
})

describe('F: explicit-goal boundary -- discovered-only relevance must not delay completion', () => {
  test('Kling present with unresolved account_status but NO confirmed explicit commercial_use goal ever established -> completes without deferral', async () => {
    const store = createInMemorySessionStore()
    await runTurn({ token: 't1', turnNumber: 1, userText: 'x' }, foundationTurnDeps({}, store))
    const second = await runTurn({ token: 't1', turnNumber: 2, userText: 'x' }, deps({}, store))
    expect(second.kind).toBe('complete')

    const loaded = (await store.load('t1')) as { structured_understanding: { completion_reason: string | null } }
    expect(loaded.structured_understanding.completion_reason).toBe('gate_1_gate_2_met')
  })
})
