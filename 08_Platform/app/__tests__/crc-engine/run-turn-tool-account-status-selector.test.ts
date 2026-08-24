/**
 * Activate tool_account_status Selector milestone (2026-08-24). Model 4
 * integration suite -- sibling to run-turn-governed-selector-questioning.ts
 * (which exercises the mechanism generically via a still-unregistered
 * `tool_plan_tier`), proving the same mechanism end-to-end for the real,
 * now-live `tool_account_status` fact, against the real, UNMOCKED
 * selector-askability.ts registry and the real Kling MATRIX_FIXTURE claims
 * (kling-commercial-use-baseline / kling-commercial-use-member).
 *
 * Does not assert final CRC guidance text (Retrieval/BI/Projection) --
 * that is explicitly out of scope for this milestone; already-existing
 * coverage for tool_account_status applicability evaluation lives in
 * kling-commercial-use.test.ts and build-bounded-interpretation.test.ts.
 * This file only proves the SELECTOR QUESTION itself surfaces, resolves,
 * and does not re-ask, through the real run-turn.ts orchestration.
 */

import { runTurn, type RunTurnDeps } from '@/lib/crc-engine/run-turn'
import { createInMemorySessionStore } from '@/lib/crc-engine/in-memory-session-store'
import { constantExtractor } from '@/lib/interview-engine/mock-extractor'
import { constantCandidateQuestionGenerator } from '@/lib/interview-engine/mock-candidate-question'
import { constantConstraintADecider } from '@/lib/interview-engine/mock-decision'
import type { CandidateObservation } from '@/lib/interview-engine/extraction'
import type { ConstraintADecision } from '@/lib/interview-engine/decision'
import type { SessionStore } from '@/lib/crc-engine/session-store'
import { MATRIX_FIXTURE } from '@/lib/retrieval-engine/matrix-fixture'

const NO_TOPIC_CLAIMS: RunTurnDeps['topicClaims'] = []

function deps(overrides: Partial<RunTurnDeps> = {}, store?: SessionStore): RunTurnDeps {
  return {
    extractor: constantExtractor([]),
    generator: constantCandidateQuestionGenerator(null),
    decider: constantConstraintADecider({ should_ask: false, reason_code: 'NO_MATERIAL_IMPROVEMENT', rationale: 'x' }),
    sessionStore: store ?? createInMemorySessionStore(),
    matrix: MATRIX_FIXTURE,
    topicClaims: NO_TOPIC_CLAIMS,
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
    turn: 1,
    raw_text: 'Can I use this commercially?',
    kind: 'user_goal',
    goal_confidence_hint: 'confirmed',
    goal_category_hint: 'commercial_use',
    goal_scope_hint: 'informational',
    ...overrides,
  }
}

function askDecision(overrides: Partial<ConstraintADecision> = {}): ConstraintADecision {
  return { should_ask: true, reason_code: 'MATERIALLY_IMPROVES_UNDERSTANDING', rationale: 'x', ...overrides }
}

/** Reaches Gate 1 met + Phase 3 + an active confirmed commercial_use goal + a Kling tool mention (account_status unknown), in one turn. */
function eligibleDeps(overrides: Partial<RunTurnDeps> = {}, store?: SessionStore): RunTurnDeps {
  return deps(
    {
      extractor: constantExtractor([toolCandidate(), intendedUseCandidate('a paid campaign'), workflowRoleCandidate('solo operator'), goalCandidate()]),
      decider: constantConstraintADecider(askDecision()),
      ...overrides,
    },
    store,
  )
}

describe('Kling unknown -> account-status question appears (real registry, real MATRIX_FIXTURE)', () => {
  test('an otherwise-eligible unresolved tool_account_status::kling gap is asked as the attempt-1 governed selector question', async () => {
    const store = createInMemorySessionStore()
    let generatorCalled = false
    const generator = async () => {
      generatorCalled = true
      return null
    }
    const outcome = await runTurn({ token: 't1', turnNumber: 1, userText: 'x' }, eligibleDeps({ generator }, store))
    expect(outcome.kind).toBe('question')
    if (outcome.kind === 'question') {
      expect(outcome.message).toBe('Do you know what kind of kling account or membership you currently have?')
    }
    expect(generatorCalled).toBe(false)

    const loaded = (await store.load('t1')) as { boundary_state: { selector_needs_used: Record<string, number> } }
    expect(loaded.boundary_state.selector_needs_used['tool_account_status::kling']).toBe(1)
  })
})

describe('Member response -> account_status resolves, no repeat question', () => {
  test('a clear Member Account correction on turn 2 populates account_status; turn 3 never re-asks (cap + resolved fact both suppress it)', async () => {
    const store = createInMemorySessionStore()
    const first = await runTurn({ token: 't1', turnNumber: 1, userText: 'x' }, eligibleDeps({}, store))
    expect(first.kind).toBe('question')

    const loadedAfterFirst = (await store.load('t1')) as { structured_understanding: { tool_mentions: { mention_id: string }[] } }
    const priorId = loadedAfterFirst.structured_understanding.tool_mentions[0].mention_id

    const correction = toolCandidate({
      proposal_id: 'p-correction',
      turn: 2,
      raw_text: 'I have a Kling Member Account.',
      supersedes_tool_mention_id: priorId,
      account_status_confidence_hint: 'confirmed',
      account_status_value_hint: 'Member Account',
    })
    const second = await runTurn(
      { token: 't1', turnNumber: 2, userText: 'I have a Kling Member Account.' },
      eligibleDeps({ extractor: constantExtractor([correction]) }, store),
    )
    if (second.kind === 'question') {
      expect(second.message).not.toBe('Do you know what kind of kling account or membership you currently have?')
    }

    const loadedAfterSecond = (await store.load('t1')) as {
      structured_understanding: { tool_mentions: { account_status: { state: string; value?: string } }[] }
      boundary_state: { selector_needs_used: Record<string, number> }
    }
    const activeMention = loadedAfterSecond.structured_understanding.tool_mentions.find((m) => (m as unknown as { superseded_by: string | null }).superseded_by === null)
    expect(activeMention?.account_status).toEqual({ state: 'confirmed', value: 'Member Account' })
    // Cap was already consumed on turn 1 and is never decremented/reopened.
    expect(loadedAfterSecond.boundary_state.selector_needs_used['tool_account_status::kling']).toBe(1)

    const third = await runTurn({ token: 't1', turnNumber: 3, userText: 'x' }, eligibleDeps({}, store))
    if (third.kind === 'question') {
      expect(third.message).not.toBe('Do you know what kind of kling account or membership you currently have?')
    }
  })
})

describe('Regular Account response -> account_status resolves, no repeat question', () => {
  test('a clear Regular Account correction resolves the fact; no re-ask', async () => {
    const store = createInMemorySessionStore()
    const first = await runTurn({ token: 't1', turnNumber: 1, userText: 'x' }, eligibleDeps({}, store))
    expect(first.kind).toBe('question')

    const loadedAfterFirst = (await store.load('t1')) as { structured_understanding: { tool_mentions: { mention_id: string }[] } }
    const priorId = loadedAfterFirst.structured_understanding.tool_mentions[0].mention_id

    const correction = toolCandidate({
      proposal_id: 'p-correction',
      turn: 2,
      raw_text: 'I have a Kling Regular Account.',
      supersedes_tool_mention_id: priorId,
      account_status_confidence_hint: 'confirmed',
      account_status_value_hint: 'Regular Account',
    })
    const second = await runTurn(
      { token: 't1', turnNumber: 2, userText: 'I have a Kling Regular Account.' },
      eligibleDeps({ extractor: constantExtractor([correction]) }, store),
    )
    if (second.kind === 'question') {
      expect(second.message).not.toBe('Do you know what kind of kling account or membership you currently have?')
    }

    const loadedAfterSecond = (await store.load('t1')) as {
      structured_understanding: { tool_mentions: { account_status: { state: string; value?: string } }[] }
    }
    const activeMention = loadedAfterSecond.structured_understanding.tool_mentions.find((m) => (m as unknown as { superseded_by: string | null }).superseded_by === null)
    expect(activeMention?.account_status).toEqual({ state: 'confirmed', value: 'Regular Account' })
  })
})

describe('Ambiguous response -> unknown remains, no repeat question, fail-closed', () => {
  test('an ambiguous statement ("I have Kling Pro.") leaves account_status unknown; the cap still suppresses re-asking', async () => {
    const store = createInMemorySessionStore()
    const first = await runTurn({ token: 't1', turnNumber: 1, userText: 'x' }, eligibleDeps({}, store))
    expect(first.kind).toBe('question')

    const loadedAfterFirst = (await store.load('t1')) as { structured_understanding: { tool_mentions: { mention_id: string }[] } }
    const priorId = loadedAfterFirst.structured_understanding.tool_mentions[0].mention_id

    // No account_status hint at all -- matches how the real extractor
    // behaves for ambiguous plan/payment/credits language (verified in the
    // Small Bounded tool_account_status UAT).
    const ambiguousCorrection = toolCandidate({
      proposal_id: 'p-ambiguous',
      turn: 2,
      raw_text: 'I have Kling Pro.',
      supersedes_tool_mention_id: priorId,
      plan_tier_confidence_hint: 'confirmed',
      plan_tier_value_hint: 'Pro',
    })
    const second = await runTurn(
      { token: 't1', turnNumber: 2, userText: 'I have Kling Pro.' },
      eligibleDeps({ extractor: constantExtractor([ambiguousCorrection]) }, store),
    )
    if (second.kind === 'question') {
      expect(second.message).not.toBe('Do you know what kind of kling account or membership you currently have?')
    }

    const loadedAfterSecond = (await store.load('t1')) as {
      structured_understanding: { tool_mentions: { account_status: { state: string } }[] }
      boundary_state: { selector_needs_used: Record<string, number> }
    }
    const activeMention = loadedAfterSecond.structured_understanding.tool_mentions.find((m) => (m as unknown as { superseded_by: string | null }).superseded_by === null)
    expect(activeMention?.account_status).toEqual({ state: 'unknown' })
    expect(loadedAfterSecond.boundary_state.selector_needs_used['tool_account_status::kling']).toBe(1)

    const third = await runTurn({ token: 't1', turnNumber: 3, userText: 'x' }, eligibleDeps({}, store))
    if (third.kind === 'question') {
      expect(third.message).not.toBe('Do you know what kind of kling account or membership you currently have?')
    }
  })
})
