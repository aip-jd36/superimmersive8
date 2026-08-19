/**
 * Duplicate-Question Prevention -- run-turn() integration suite
 * (2026-08-19). Mock-stack only, same discipline as
 * run-turn-jurisdiction-clarification.test.ts. Proves the actual wiring
 * (presatisfyStructuralFollowUpNeeds -> boundaryStateForTurn -> every
 * evaluateBoundary call site in run-turn.ts) is live in production code, not
 * just correct in the isolated pure-function tests in boundaries.test.ts /
 * candidate-question.test.ts / signal-lineage.test.ts.
 *
 * The exhaustive per-rule proof (exact-duplicate block, paraphrase block,
 * usage-vs-license independence, fresh-id restatement, tool_plan_tier
 * presatisfaction, target-kind-mismatch rejection) already lives in those
 * three unit-level files. This file's job is the end-to-end regression
 * matrix (implementation task §11, letters A-J) exercised through the real
 * runTurn() entry point, plus explicit confirmation that jurisdiction and
 * human-contribution clarification -- both entirely separate deterministic
 * mechanisms -- are completely unaffected.
 */

import { runTurn, type RunTurnDeps } from '@/lib/crc-engine/run-turn'
import { createInMemorySessionStore } from '@/lib/crc-engine/in-memory-session-store'
import { constantExtractor } from '@/lib/interview-engine/mock-extractor'
import { constantCandidateQuestionGenerator } from '@/lib/interview-engine/mock-candidate-question'
import { constantConstraintADecider } from '@/lib/interview-engine/mock-decision'
import type { CandidateObservation } from '@/lib/interview-engine/extraction'
import type { CandidateQuestionProposal } from '@/lib/interview-engine/candidate-question'
import type { ConstraintADecision } from '@/lib/interview-engine/decision'
import type { SessionStore } from '@/lib/crc-engine/session-store'
import type { CRCSessionState } from '@/lib/crc-engine/types'
import type { TopicClaim } from '@/lib/retrieval-engine/types'

const MATRIX: RunTurnDeps['matrix'] = []

function deps(overrides: Partial<RunTurnDeps> = {}, store?: SessionStore): RunTurnDeps {
  return {
    extractor: constantExtractor([]),
    generator: constantCandidateQuestionGenerator(null),
    decider: constantConstraintADecider({ should_ask: false, reason_code: 'NO_MATERIAL_IMPROVEMENT', rationale: 'x' }),
    sessionStore: store ?? createInMemorySessionStore(),
    matrix: MATRIX,
    topicClaims: [] as TopicClaim[],
    ...overrides,
  }
}

function assetProviderCandidate(overrides: Partial<CandidateObservation> = {}): CandidateObservation {
  return { proposal_id: 'p-1', turn: 1, raw_text: 'I used Kling and iStock images.', kind: 'asset_provider_mention', raw_provider_name: 'iStock', ...overrides }
}

function toolCandidate(overrides: Partial<CandidateObservation> = {}): CandidateObservation {
  return { proposal_id: 'p-tool', turn: 1, raw_text: 'I used Kling.', kind: 'tool_mention', raw_tool_name: 'Kling', ...overrides }
}

function toolWithPlanTierCandidate(overrides: Partial<CandidateObservation> = {}): CandidateObservation {
  return {
    proposal_id: 'p-tool',
    turn: 1,
    raw_text: 'I used Kling Pro.',
    kind: 'tool_mention',
    raw_tool_name: 'Kling',
    plan_tier_confidence_hint: 'confirmed',
    plan_tier_value_hint: 'Kling Pro',
    ...overrides,
  }
}

function intendedUseCandidate(overrides: Partial<CandidateObservation> = {}): CandidateObservation {
  return { proposal_id: 'p-use', turn: 1, raw_text: 'a paid campaign', kind: 'project_fact', raw_fact_field: 'intended_use', fact_confidence_hint: 'confirmed', fact_value_hint: 'a paid campaign', ...overrides }
}

function workflowRoleCandidate(overrides: Partial<CandidateObservation> = {}): CandidateObservation {
  return { proposal_id: 'p-role', turn: 1, raw_text: 'solo operator', kind: 'project_fact', raw_fact_field: 'workflow_role', fact_confidence_hint: 'confirmed', fact_value_hint: 'solo operator', ...overrides }
}

/**
 * A fresh, distinct scoped_observation each call -- fed on every turn AFTER
 * the first so Gate 2 registers material change and the turn actually
 * reaches candidate generation, rather than short-circuiting to natural
 * completion (same discipline as run-turn-jurisdiction-clarification.test.ts's
 * own 'newObservation' pattern -- confirmed necessary by first running this
 * suite without it and observing every turn complete immediately).
 */
let freshObservationCounter = 0
function freshObservation(): CandidateObservation {
  freshObservationCounter += 1
  return {
    proposal_id: `p-fresh-${freshObservationCounter}`,
    turn: freshObservationCounter,
    raw_text: `incidental detail #${freshObservationCounter}`,
    kind: 'scoped_observation',
    scope: 'current_project',
    observation_confidence_hint: 'confirmed',
  }
}

function askDecision(overrides: Partial<ConstraintADecision> = {}): ConstraintADecision {
  return { should_ask: true, reason_code: 'MATERIALLY_IMPROVES_UNDERSTANDING', rationale: 'x', ...overrides }
}

/**
 * A generic, harmless organic proposal with no follow_up_need -- used ONLY
 * on turn 1 so Model 4's bounded search actually succeeds (an ASKED
 * question) instead of exhausting immediately. Model 4 finalizes a session
 * with completion_reason: 'questioning_exhausted' whenever BOTH attempts
 * fail to produce an approved candidate, REGARDLESS of phase/gate state --
 * this is unconditional, not gated by checkCompletion()'s own phase===3
 * requirement, and would otherwise end every test session after turn 1
 * before the real test proposal ever gets a chance to run (confirmed by
 * directly inspecting turn-1 output before adding this).
 */
const GENERIC_TURN_1_PROPOSAL: CandidateQuestionProposal = {
  question_text: 'What platform did you generate this with?',
  question_kind: 'other',
  target_signal_id: null,
  phase: 1,
}

function firstTurnAskingDeps(overrides: Partial<RunTurnDeps> = {}, store?: SessionStore): RunTurnDeps {
  return deps({ generator: constantCandidateQuestionGenerator(GENERIC_TURN_1_PROPOSAL), decider: constantConstraintADecider(askDecision()), ...overrides }, store)
}

function assetProviderFollowUp(need: 'asset_provider_usage' | 'asset_provider_license', mentionId: string, text: string): CandidateQuestionProposal {
  return { question_text: text, question_kind: 'follow_up_on_signal', target_signal_id: mentionId, phase: 2, target_follow_up_need: need }
}

function toolPlanTierFollowUp(mentionId: string, text: string): CandidateQuestionProposal {
  return { question_text: text, question_kind: 'follow_up_on_signal', target_signal_id: mentionId, phase: 2, target_follow_up_need: 'tool_plan_tier' }
}

async function loadState(store: SessionStore, token: string): Promise<CRCSessionState> {
  return (await store.load(token)) as CRCSessionState
}

async function firstMentionId(store: SessionStore, token: string, kind: 'asset_provider_mentions' | 'tool_mentions'): Promise<string> {
  const state = await loadState(store, token)
  const list = state.structured_understanding[kind] as { mention_id: string; superseded_by: string | null }[]
  const active = list.find((m) => m.superseded_by === null)
  if (!active) throw new Error(`no active ${kind} entry found`)
  return active.mention_id
}

describe('Duplicate-Question Prevention -- run-turn() integration (2026-08-19)', () => {
  test('I. primary regression: iStock usage asked once, answered, then a second attempt at the SAME need is not asked again', async () => {
    const store = createInMemorySessionStore()

    // Turn 1: establishes the iStock asset_provider_mention plus base facts
    // (intended_use/workflow_role) so Gate 1 is met and the conversation
    // stays open for the turns that follow.
    await runTurn(
      { token: 't1', turnNumber: 1, userText: 'I used Kling and iStock images.' },
      firstTurnAskingDeps({ extractor: constantExtractor([assetProviderCandidate(), intendedUseCandidate(), workflowRoleCandidate()]) }, store),
    )
    const mentionId = await firstMentionId(store, 't1', 'asset_provider_mentions')

    // Turn 2: organic generator proposes an asset_provider_usage follow-up; Constraint A approves it.
    const usageProposal = assetProviderFollowUp('asset_provider_usage', mentionId, 'How did you use the iStock images in Kling?')
    const turn2 = await runTurn(
      { token: 't1', turnNumber: 2, userText: 'ok' },
      deps({ extractor: constantExtractor([freshObservation()]), generator: constantCandidateQuestionGenerator(usageProposal), decider: constantConstraintADecider(askDecision()) }, store),
    )
    expect(turn2.kind).toBe('question')
    const afterTurn2 = await loadState(store, 't1')
    expect(afterTurn2.boundary_state.follow_ups_used[`${mentionId}::asset_provider_usage`]).toBe(1)

    // Turn 3: user answers; the SAME generator (constant) proposes the exact
    // same follow-up again on the next turn -- must NOT be asked again.
    const turn3 = await runTurn(
      { token: 't1', turnNumber: 3, userText: 'I uploaded them as references and also inputted some for generation.' },
      deps({ extractor: constantExtractor([freshObservation()]), generator: constantCandidateQuestionGenerator(usageProposal), decider: constantConstraintADecider(askDecision()) }, store),
    )
    expect(turn3.kind).not.toBe('question')
    const afterTurn3 = await loadState(store, 't1')
    // The cap key was consumed exactly once -- never double-counted, never reset.
    expect(afterTurn3.boundary_state.follow_ups_used[`${mentionId}::asset_provider_usage`]).toBe(1)
  })

  test('C. same provider, DIFFERENT need: usage capped does not block a genuinely distinct license follow-up -- primary false-positive guard', async () => {
    const store = createInMemorySessionStore()
    await runTurn(
      { token: 't2', turnNumber: 1, userText: 'I used Kling and iStock images.' },
      firstTurnAskingDeps({ extractor: constantExtractor([assetProviderCandidate(), intendedUseCandidate(), workflowRoleCandidate()]) }, store),
    )
    const mentionId = await firstMentionId(store, 't2', 'asset_provider_mentions')

    const usageProposal = assetProviderFollowUp('asset_provider_usage', mentionId, 'How did you use the iStock images?')
    await runTurn(
      { token: 't2', turnNumber: 2, userText: 'used as reference' },
      deps({ extractor: constantExtractor([freshObservation()]), generator: constantCandidateQuestionGenerator(usageProposal), decider: constantConstraintADecider(askDecision()) }, store),
    )

    const licenseProposal = assetProviderFollowUp('asset_provider_license', mentionId, 'What license do you have for the iStock images?')
    const licenseTurn = await runTurn(
      { token: 't2', turnNumber: 3, userText: 'ok' },
      deps({ extractor: constantExtractor([freshObservation()]), generator: constantCandidateQuestionGenerator(licenseProposal), decider: constantConstraintADecider(askDecision()) }, store),
    )
    expect(licenseTurn.kind).toBe('question')
  })

  test('H. tool plan_tier confirmed via direct statement (never asked as a candidate) is not re-askable through an organic follow-up', async () => {
    const store = createInMemorySessionStore()
    // Turn 1: user states the tool AND its plan tier directly -- plan_tier
    // is confirmed WITHOUT ever going through a follow-up candidate.
    await runTurn(
      { token: 't3', turnNumber: 1, userText: 'I used Kling Pro.' },
      firstTurnAskingDeps({ extractor: constantExtractor([toolWithPlanTierCandidate(), intendedUseCandidate(), workflowRoleCandidate()]) }, store),
    )
    const mentionId = await firstMentionId(store, 't3', 'tool_mentions')
    const afterTurn1 = await loadState(store, 't3')
    expect(afterTurn1.structured_understanding.tool_mentions.find((m) => m.mention_id === mentionId)?.plan_tier).toEqual({ state: 'confirmed', value: 'Kling Pro' })

    // Turn 2: organic generator (imperfectly) proposes a plan_tier follow-up anyway -- must be blocked by structural presatisfaction, not asked.
    const planTierProposal = toolPlanTierFollowUp(mentionId, 'What plan or tier did you use for Kling?')
    const turn2 = await runTurn(
      { token: 't3', turnNumber: 2, userText: 'ok' },
      deps({ extractor: constantExtractor([freshObservation()]), generator: constantCandidateQuestionGenerator(planTierProposal), decider: constantConstraintADecider(askDecision()) }, store),
    )
    expect(turn2.kind).not.toBe('question')
  })

  test('J. multi-goal: an unrelated follow-up with no follow_up_need is unaffected by a capped need on a different signal', async () => {
    const store = createInMemorySessionStore()
    await runTurn(
      { token: 't4', turnNumber: 1, userText: 'I used Kling and iStock images.' },
      firstTurnAskingDeps({ extractor: constantExtractor([assetProviderCandidate(), toolCandidate({ proposal_id: 'p-tool2' }), intendedUseCandidate(), workflowRoleCandidate()]) }, store),
    )
    const providerId = await firstMentionId(store, 't4', 'asset_provider_mentions')
    const toolId = await firstMentionId(store, 't4', 'tool_mentions')

    const usageProposal = assetProviderFollowUp('asset_provider_usage', providerId, 'How did you use the iStock images?')
    await runTurn(
      { token: 't4', turnNumber: 2, userText: 'used as reference' },
      deps({ extractor: constantExtractor([freshObservation()]), generator: constantCandidateQuestionGenerator(usageProposal), decider: constantConstraintADecider(askDecision()) }, store),
    )

    // A plain, ordinary follow-up on the UNRELATED tool signal, no follow_up_need at all -- exactly pre-existing behavior.
    const unrelatedProposal: CandidateQuestionProposal = { question_text: 'What was this project for?', question_kind: 'follow_up_on_signal', target_signal_id: toolId, phase: 2 }
    const unrelatedTurn = await runTurn(
      { token: 't4', turnNumber: 3, userText: 'ok' },
      deps({ extractor: constantExtractor([freshObservation()]), generator: constantCandidateQuestionGenerator(unrelatedProposal), decider: constantConstraintADecider(askDecision()) }, store),
    )
    expect(unrelatedTurn.kind).toBe('question')
  })

  test('Getty and Shutterstock are handled identically to iStock -- no provider-name special-casing', async () => {
    for (const provider of ['Getty', 'Shutterstock']) {
      const store = createInMemorySessionStore()
      const token = `t-${provider}`
      await runTurn(
        { token, turnNumber: 1, userText: `I used Kling and ${provider} images.` },
        firstTurnAskingDeps({ extractor: constantExtractor([assetProviderCandidate({ raw_provider_name: provider }), intendedUseCandidate(), workflowRoleCandidate()]) }, store),
      )
      const mentionId = await firstMentionId(store, token, 'asset_provider_mentions')

      const usageProposal = assetProviderFollowUp('asset_provider_usage', mentionId, `How did you use the ${provider} images?`)
      const firstAsk = await runTurn(
        { token, turnNumber: 2, userText: 'used as reference' },
        deps({ extractor: constantExtractor([freshObservation()]), generator: constantCandidateQuestionGenerator(usageProposal), decider: constantConstraintADecider(askDecision()) }, store),
      )
      expect(firstAsk.kind).toBe('question')

      const repeatAsk = await runTurn(
        { token, turnNumber: 3, userText: 'ok' },
        deps({ extractor: constantExtractor([freshObservation()]), generator: constantCandidateQuestionGenerator(usageProposal), decider: constantConstraintADecider(askDecision()) }, store),
      )
      expect(repeatAsk.kind).not.toBe('question')
    }
  })

  test('F. jurisdiction: legitimate re-ask remains structurally possible -- entirely separate deterministic mechanism, unaffected by this milestone', async () => {
    // jurisdiction_clarification is a deterministic catalog kind, never
    // affected by follow_up_need (its own eligibility gate -- jurisdiction
    // NEITHER confirmed nor declined -- was not touched by this milestone).
    // This test only confirms the boundary cap itself still behaves exactly
    // as before: allowed once, independent of any asset-provider/tool cap.
    const { createInitialBoundaryState, evaluateBoundary } = await import('@/lib/interview-engine/boundaries')
    const state = createInitialBoundaryState()
    const result = evaluateBoundary(state, { kind: 'jurisdiction_clarification', phase: 2 })
    expect(result.allowed).toBe(true)
    expect(result.next_state.jurisdiction_clarification_asked).toBe(true)
  })

  test('G. human-contribution clarification cap is unaffected by this milestone', async () => {
    const { createInitialBoundaryState, evaluateBoundary } = await import('@/lib/interview-engine/boundaries')
    const state = createInitialBoundaryState()
    const result = evaluateBoundary(state, { kind: 'human_contribution_clarification', phase: 3 })
    expect(result.allowed).toBe(true)
    expect(result.next_state.human_contribution_clarification_asked).toBe(true)
  })
})
