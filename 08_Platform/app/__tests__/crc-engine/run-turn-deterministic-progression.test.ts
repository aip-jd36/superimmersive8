/**
 * CRC-QA-5 -- Next Deterministic Candidate Progression (2026-09-26).
 * Integration suite for the narrow control-flow change specified by
 * CRC-QA-4: when the highest-precedence deterministic candidate occupying
 * forced attempt #1 (jurisdiction > human contribution > commercial-
 * readiness discovery > governed selector) is rejected, exactly ONE
 * already-independently-eligible, lower-precedence deterministic candidate
 * -- already computed this same turn -- may occupy attempt #2 instead of
 * the ordinary/organic generator. If no such candidate exists, attempt #2
 * remains the ordinary generator, unchanged. The existing attempts #3
 * (Track B readiness) and #4 (selector-at-exhaustion) are otherwise
 * entirely unmodified, except for a same-turn selector duplicate-evaluation
 * guard (see CASE 13).
 *
 * Mock-stack only, real orchestration (`run-turn.ts`), real eligibility
 * modules, real `TOPIC_CLAIMS_FIXTURE`/`TOPIC_RELATIONSHIPS_FIXTURE`/
 * `MATRIX_FIXTURE` -- nothing about eligibility, askability, Constraint A's
 * own contract, Constraint B's own boundary rules, the question budget, or
 * completion is reimplemented here.
 *
 * CASE 9 (Constraint-B rejection of a forced attempt-#1 candidate) is
 * deliberately NOT reproduced end-to-end here. CRC-QA-4's own diagnostic
 * (Part G) established this is architecturally near-unreachable in
 * practice: every forced deterministic candidate's own eligibility check
 * already reads the identical BoundaryState flag/cap Constraint B would
 * separately enforce, so a proposal that would be Constraint-B-rejected is
 * essentially never constructed in the first place. Fabricating an
 * artificial desync between eligibility and BoundaryState to force this
 * path would not prove anything about real production behavior. The actual
 * safety property is a structural fact directly visible in `run-turn.ts`
 * itself: the progression branch is entered whenever `attempt1.status !==
 * 'approved'`, never `attempt1.reason === 'rejected_by_a'` specifically --
 * so a Constraint-B rejection (`reason: 'rejected_by_b'`), were one ever to
 * occur, would trigger the identical progression path with zero special
 * casing. No reason-code-sensitive branching exists anywhere in the new
 * code to prove or disprove per-case.
 */

import { runTurn, type RunTurnDeps } from '@/lib/crc-engine/run-turn'
import { createInMemorySessionStore } from '@/lib/crc-engine/in-memory-session-store'
import { constantExtractor } from '@/lib/interview-engine/mock-extractor'
import { constantCandidateQuestionGenerator } from '@/lib/interview-engine/mock-candidate-question'
import { constantConstraintADecider } from '@/lib/interview-engine/mock-decision'
import { HUMAN_CONTRIBUTION_CLARIFICATION_QUESTION } from '@/lib/crc-engine/human-contribution-clarification'
import { JURISDICTION_CLARIFICATION_QUESTION } from '@/lib/crc-engine/jurisdiction-clarification'
import { COMMERCIAL_READINESS_DISCOVERY_QUESTIONS } from '@/lib/crc-engine/commercial-readiness-catalog'
import { MATRIX_FIXTURE } from '@/lib/retrieval-engine/matrix-fixture'
import { TOPIC_CLAIMS_FIXTURE } from '@/lib/retrieval-engine/topic-claims-fixture'
import { TOPIC_RELATIONSHIPS_FIXTURE } from '@/lib/retrieval-engine/topic-relationships-fixture'
import type { CandidateObservation } from '@/lib/interview-engine/extraction'
import type { CandidateQuestionProposal } from '@/lib/interview-engine/candidate-question'
import type { ConstraintADecider, ConstraintADecision, ConstraintAInput } from '@/lib/interview-engine/decision'
import type { SessionStore } from '@/lib/crc-engine/session-store'
import type { CRCSessionState } from '@/lib/crc-engine/types'

function deps(overrides: Partial<RunTurnDeps> = {}, store?: SessionStore): RunTurnDeps {
  return {
    extractor: constantExtractor([]),
    generator: constantCandidateQuestionGenerator(null),
    decider: constantConstraintADecider({ should_ask: true, reason_code: 'MATERIALLY_IMPROVES_UNDERSTANDING', rationale: 'x' }),
    sessionStore: store ?? createInMemorySessionStore(),
    matrix: MATRIX_FIXTURE,
    topicClaims: TOPIC_CLAIMS_FIXTURE,
    relationships: TOPIC_RELATIONSHIPS_FIXTURE,
    ...overrides,
  }
}

function toolCandidate(overrides: Partial<CandidateObservation> = {}): CandidateObservation {
  return { proposal_id: 'p-tool', turn: 1, raw_text: 'We used Kling.', kind: 'tool_mention', raw_tool_name: 'Kling', ...overrides }
}
function intendedUseCandidate(value: string): CandidateObservation {
  return { proposal_id: 'p-use', turn: 1, raw_text: value, kind: 'project_fact', raw_fact_field: 'intended_use', fact_confidence_hint: 'confirmed', fact_value_hint: value }
}
function workflowRoleCandidate(value: string): CandidateObservation {
  return { proposal_id: 'p-role', turn: 1, raw_text: value, kind: 'project_fact', raw_fact_field: 'workflow_role', fact_confidence_hint: 'confirmed', fact_value_hint: value }
}
function copyrightGoalCandidate(overrides: Partial<CandidateObservation> = {}): CandidateObservation {
  return {
    proposal_id: 'p-goal-copy',
    turn: 1,
    raw_text: 'Do I own the copyright to this AI-generated output?',
    kind: 'user_goal',
    goal_confidence_hint: 'confirmed',
    goal_category_hint: 'copyrightability',
    goal_scope_hint: 'informational',
    ...overrides,
  }
}
function commercialUseGoalCandidate(overrides: Partial<CandidateObservation> = {}): CandidateObservation {
  return {
    proposal_id: 'p-goal-commercial',
    turn: 1,
    raw_text: 'Can I use this commercially?',
    kind: 'user_goal',
    goal_confidence_hint: 'confirmed',
    goal_category_hint: 'commercial_use',
    goal_scope_hint: 'informational',
    ...overrides,
  }
}
/** Confirms human_contribution_description directly, making human-contribution clarification ineligible (already resolved) without touching jurisdiction/tool/selector eligibility at all. */
function humanContributionAlreadyConfirmedCandidate(): CandidateObservation {
  return {
    proposal_id: 'p-hc',
    turn: 1,
    raw_text: 'I only wrote prompts, nothing else.',
    kind: 'project_fact',
    raw_fact_field: 'human_contribution_description',
    fact_confidence_hint: 'confirmed',
    fact_value_hint: 'I only wrote prompts, nothing else.',
  }
}
/** Confirms an assessment-jurisdiction mention directly, making jurisdiction clarification ineligible (already resolved) without touching human-contribution/tool/selector eligibility at all. */
function jurisdictionMentionCandidate(value: string): CandidateObservation {
  return { proposal_id: 'p-jur', turn: 1, raw_text: value, kind: 'assessment_jurisdiction_mention', raw_jurisdiction_value: value }
}

function ask(overrides: Partial<ConstraintADecision> = {}): ConstraintADecision {
  return { should_ask: true, reason_code: 'MATERIALLY_IMPROVES_UNDERSTANDING', rationale: 'x', ...overrides }
}
function suppress(overrides: Partial<ConstraintADecision> = {}): ConstraintADecision {
  return { should_ask: false, reason_code: 'NO_MATERIAL_IMPROVEMENT', rationale: 'x', ...overrides }
}
/** Approves everything except the given question_kind(s) -- the same technique run-turn-jurisdiction-prose-coupling-regression.test.ts already uses to force a real, non-reimplemented rejection of exactly one deterministic candidate. */
function rejectKinds(kinds: string[]): ConstraintADecider {
  return async (input: ConstraintAInput): Promise<ConstraintADecision> => (kinds.includes(input.candidate.question_kind) ? suppress() : ask())
}

async function loadState(store: SessionStore, token: string): Promise<CRCSessionState> {
  return (await store.load(token)) as CRCSessionState
}

const THROW_IF_CALLED = async (): Promise<CandidateQuestionProposal | null> => {
  throw new Error('ordinary generator must not be called this turn')
}

/**
 * Makes jurisdiction, human-contribution, discovery, and the tool_account_status
 * selector need ALL independently eligible in a single turn 1:
 *  - jurisdiction + human-contribution: a confirmed 'copyrightability' goal
 *    (TOPIC_CLAIMS_FIXTURE's real CLAIM-COPY-001/002/003-v1, each requiring
 *    jurisdiction) + a Kling tool mention (human-contribution's own minimal
 *    workflow anchor).
 *  - discovery: Gate 1 met (tool + intended_use + workflow_role all
 *    confirmed) + Phase 3 + 'for a client' triggering the real
 *    client_involvement affirmative indicator (client_provided_source_assets
 *    category).
 *  - selector: a confirmed 'commercial_use' goal + the same Kling tool
 *    mention, real MATRIX_FIXTURE kling-commercial-use-* claims, account
 *    status unknown.
 */
function allFourEligibleCandidates(): CandidateObservation[] {
  return [toolCandidate(), copyrightGoalCandidate(), commercialUseGoalCandidate(), intendedUseCandidate('for a client'), workflowRoleCandidate('solo operator')]
}

describe('CRC-QA-5 -- Next Deterministic Candidate Progression', () => {
  test('CASE 1: jurisdiction rejected, human contribution independently eligible -> human contribution becomes attempt #2', async () => {
    const outcome = await runTurn(
      { token: 'case1', turnNumber: 1, userText: 'x' },
      deps({ extractor: constantExtractor(allFourEligibleCandidates()), generator: THROW_IF_CALLED, decider: rejectKinds(['jurisdiction_clarification']) }),
    )
    expect(outcome.kind).toBe('question')
    if (outcome.kind === 'question') expect(outcome.message).toBe(HUMAN_CONTRIBUTION_CLARIFICATION_QUESTION)
    expect(outcome.humanContributionSignal).toEqual({ eligible: true, outcome: 'asked' })
  })

  test('CASE 2: jurisdiction rejected, human contribution absent (already resolved), discovery eligible -> discovery becomes attempt #2', async () => {
    const outcome = await runTurn(
      { token: 'case2', turnNumber: 1, userText: 'x' },
      deps({
        extractor: constantExtractor([...allFourEligibleCandidates(), humanContributionAlreadyConfirmedCandidate()]),
        generator: THROW_IF_CALLED,
        decider: rejectKinds(['jurisdiction_clarification']),
      }),
    )
    expect(outcome.kind).toBe('question')
    if (outcome.kind === 'question') expect(outcome.message).toBe(COMMERCIAL_READINESS_DISCOVERY_QUESTIONS.client_provided_source_assets)
    expect(outcome.humanContributionSignal).toBeUndefined()
    expect(outcome.discoverySignal?.outcome).toBe('asked')
  })

  test('CASE 3: human contribution rejected (jurisdiction already resolved), discovery eligible -> discovery becomes attempt #2', async () => {
    const outcome = await runTurn(
      { token: 'case3', turnNumber: 1, userText: 'x' },
      deps({
        extractor: constantExtractor([...allFourEligibleCandidates(), jurisdictionMentionCandidate('United States')]),
        generator: THROW_IF_CALLED,
        decider: rejectKinds(['human_contribution_clarification']),
      }),
    )
    expect(outcome.kind).toBe('question')
    if (outcome.kind === 'question') expect(outcome.message).toBe(COMMERCIAL_READINESS_DISCOVERY_QUESTIONS.client_provided_source_assets)
    expect(outcome.jurisdictionSignal).toBeUndefined()
    expect(outcome.discoverySignal?.outcome).toBe('asked')
  })

  test('CASE 4: discovery rejected (jurisdiction + human contribution already resolved), selector eligible -> selector becomes attempt #2', async () => {
    const outcome = await runTurn(
      { token: 'case4', turnNumber: 1, userText: 'x' },
      deps({
        extractor: constantExtractor([...allFourEligibleCandidates(), jurisdictionMentionCandidate('United States'), humanContributionAlreadyConfirmedCandidate()]),
        generator: THROW_IF_CALLED,
        decider: rejectKinds(['commercial_readiness_discovery']),
      }),
    )
    expect(outcome.kind).toBe('question')
    expect(outcome.selectorSignal?.outcome).toBe('asked')
    expect(outcome.selectorSignal?.dedupe_key).toBe('tool_account_status::kling')
  })

  test('CASE 5: selector is the only deterministic candidate, rejected -> organic occupies attempt #2', async () => {
    // Neutral intended-use text (no client_involvement/person_depicted/
    // reference_material_used phrase) and no copyright goal at all -- only
    // the commercial_use goal + Kling tool, so jurisdiction/human-
    // contribution/discovery are never eligible this turn; selector alone
    // is.
    const organic: CandidateQuestionProposal = { question_text: 'Organic fallback question.', question_kind: 'other', target_signal_id: null, phase: 3 }
    const outcome = await runTurn(
      { token: 'case5', turnNumber: 1, userText: 'x' },
      deps({
        // The commercial_use goal used to make selector eligible ALSO
        // reaches jurisdiction-requiring claims in the real
        // TOPIC_CLAIMS_FIXTURE (jurisdiction eligibility is not copyright-
        // specific) -- pre-resolved via jurisdictionMentionCandidate,
        // exactly the same technique CASE 3/4/12/13 already use, rather
        // than emptying topicClaims/relationships (which, discovered during
        // implementation, also removes an eligibility input selector itself
        // needs, breaking the very case this test is isolating).
        extractor: constantExtractor([
          toolCandidate(),
          commercialUseGoalCandidate(),
          intendedUseCandidate('a personal test project'),
          workflowRoleCandidate('solo operator'),
          jurisdictionMentionCandidate('United States'),
        ]),
        generator: constantCandidateQuestionGenerator(organic),
        decider: rejectKinds(['governed_selector_clarification']),
      }),
    )
    expect(outcome.kind).toBe('question')
    if (outcome.kind === 'question') expect(outcome.message).toBe('Organic fallback question.')
    expect(outcome.selectorSignal?.outcome).toBe('rejected_by_a')
  })

  test('CASE 6: attempt #1 deterministic approved -> no attempt #2 (organic generator never called, no progression)', async () => {
    const outcome = await runTurn(
      { token: 'case6', turnNumber: 1, userText: 'x' },
      deps({ extractor: constantExtractor(allFourEligibleCandidates()), generator: THROW_IF_CALLED, decider: constantConstraintADecider(ask()) }),
    )
    expect(outcome.kind).toBe('question')
    if (outcome.kind === 'question') expect(outcome.message).toBe(JURISDICTION_CLARIFICATION_QUESTION)
    expect(outcome.humanContributionSignal).toEqual({ eligible: true, outcome: 'preempted_by_jurisdiction' })
  })

  test('CASE 7: attempt #1 rejected, attempt #2 deterministic approved -> exactly one delivered question, budget +1, organic generator never called', async () => {
    const store = createInMemorySessionStore()
    const outcome = await runTurn(
      { token: 'case7', turnNumber: 1, userText: 'x' },
      deps({ extractor: constantExtractor(allFourEligibleCandidates()), generator: THROW_IF_CALLED, decider: rejectKinds(['jurisdiction_clarification']) }, store),
    )
    expect(outcome.kind).toBe('question')
    if (outcome.kind === 'question') expect(outcome.message).toBe(HUMAN_CONTRIBUTION_CLARIFICATION_QUESTION)
    const state = await loadState(store, 'case7')
    expect(state.boundary_state.user_facing_questions_asked).toBe(1)
    expect(state.boundary_state.human_contribution_clarification_asked).toBe(true)
    // The rejected forced attempt-#1 candidate's own cap must remain unconsumed.
    expect(state.boundary_state.jurisdiction_clarification_asked).toBe(false)
  })

  test('CASE 8: attempt #1 rejected, attempt #2 deterministic also rejected, no lower candidate/readiness need -> falls through to existing exhaustion, no question, budget untouched', async () => {
    const store = createInMemorySessionStore()
    // jurisdiction already resolved (removed from the slot entirely) so
    // human-contribution occupies attempt #1 directly; human-contribution
    // rejected; discovery rejected too; no selector eligible this turn
    // (commercial_use goal omitted) and no Track B readiness need for this
    // fixture -> genuine, unmodified exhaustion.
    const outcome = await runTurn(
      { token: 'case8', turnNumber: 1, userText: 'x' },
      deps(
        {
          extractor: constantExtractor([toolCandidate(), copyrightGoalCandidate(), intendedUseCandidate('for a client'), workflowRoleCandidate('solo operator'), jurisdictionMentionCandidate('United States')]),
          generator: THROW_IF_CALLED,
          decider: rejectKinds(['human_contribution_clarification', 'commercial_readiness_discovery']),
        },
        store,
      ),
    )
    expect(outcome.kind).toBe('complete')
    const state = await loadState(store, 'case8')
    expect(state.boundary_state.user_facing_questions_asked).toBe(0)
    expect(state.boundary_state.human_contribution_clarification_asked).toBe(false)
  })

  test('CASE 10: user declines a delivered progression-attempt-#2 question -> existing decline semantics unchanged, no same-turn re-ask', async () => {
    const store = createInMemorySessionStore()
    const turn1 = await runTurn(
      { token: 'case10', turnNumber: 1, userText: 'x' },
      deps({ extractor: constantExtractor(allFourEligibleCandidates()), generator: THROW_IF_CALLED, decider: rejectKinds(['jurisdiction_clarification']) }, store),
    )
    expect(turn1.kind).toBe('question')
    if (turn1.kind === 'question') expect(turn1.message).toBe(HUMAN_CONTRIBUTION_CLARIFICATION_QUESTION)

    const turn2 = await runTurn(
      { token: 'case10', turnNumber: 2, userText: 'skip', declineAction: 'skip_question' },
      deps({ extractor: constantExtractor([]), generator: constantCandidateQuestionGenerator(null), decider: constantConstraintADecider(ask()) }, store),
    )
    // Decline path is unchanged by this milestone -- no assertion here
    // claims anything new about it beyond "it still runs and does not
    // re-ask the just-declined human-contribution question."
    if (turn2.kind === 'question') expect(turn2.message).not.toBe(HUMAN_CONTRIBUTION_CLARIFICATION_QUESTION)
    const state = await loadState(store, 'case10')
    expect(state.boundary_state.human_contribution_clarification_asked).toBe(true)
  })

  test('CASE 11: no deterministic candidates -> existing organic attempt #1/#2 behavior byte-unchanged (regression guard for the undefined===undefined diagnostics bug found during implementation)', async () => {
    // Deliberately DIFFERENT question_kind between the two proposals (not
    // just different text): tryCandidate's own defensive matchesExclusion
    // check (candidate-question.ts) rejects a same-(kind, signal_id) retry
    // as 'invalid' BEFORE ever calling Constraint A a second time -- a real,
    // pre-existing, unrelated-to-this-milestone behavior confirmed present
    // at the unmodified baseline too while debugging this fixture. Using
    // two structurally distinct kinds (neither requiring a signal_id) lets
    // attempt #2 actually reach Constraint A a second time, exactly as this
    // case needs.
    const rejectedFirst: CandidateQuestionProposal = { question_text: 'First (will be rejected).', question_kind: 'other', target_signal_id: null, phase: 1 }
    const secondApproved: CandidateQuestionProposal = { question_text: 'Second (approved).', question_kind: 'historical_experience', target_signal_id: null, phase: 1 }
    let call = 0
    const generator = async (): Promise<CandidateQuestionProposal | null> => {
      call += 1
      return call === 1 ? rejectedFirst : secondApproved
    }
    let deciderCall = 0
    const decider: ConstraintADecider = async (): Promise<ConstraintADecision> => {
      deciderCall += 1
      return deciderCall === 1 ? suppress() : ask()
    }
    // Gate 1 met (tool + intended_use + workflow_role all confirmed) with
    // NEUTRAL indicator text (no client_involvement/person_depicted/
    // reference_material_used phrase) and no goal of any category at all --
    // cleanly isolates "zero deterministic candidates eligible."
    const outcome = await runTurn(
      { token: 'case11', turnNumber: 1, userText: 'x' },
      deps({
        extractor: constantExtractor([toolCandidate(), intendedUseCandidate('a personal test project'), workflowRoleCandidate('solo operator')]),
        generator,
        decider,
        topicClaims: [],
        relationships: [],
      }),
    )
    expect(outcome.kind).toBe('question')
    if (outcome.kind === 'question') expect(outcome.message).toBe('Second (approved).')
    // No deterministic proposal was ever eligible this turn -- every
    // deterministic analytics signal must be absent/never_eligible exactly
    // as before this milestone, never corrupted by an undefined===undefined
    // reference-equality false match.
    expect(outcome.jurisdictionSignal).toBeUndefined()
    expect(outcome.humanContributionSignal).toBeUndefined()
    expect(outcome.discoverySignal).toEqual({ eligible_categories: [], selected_category: null, outcome: 'never_eligible' })
    expect(outcome.selectorSignal).toEqual({ eligible: false, outcome: 'never_eligible' })
  })

  test('CASE 12/14: selector initially preempted, then becomes attempt #2 and is delivered -> diagnostics report the true final disposition, not stale preempted_by_*', async () => {
    const outcome = await runTurn(
      { token: 'case12', turnNumber: 1, userText: 'x' },
      deps({
        extractor: constantExtractor([...allFourEligibleCandidates(), jurisdictionMentionCandidate('United States'), humanContributionAlreadyConfirmedCandidate()]),
        generator: THROW_IF_CALLED,
        decider: rejectKinds(['commercial_readiness_discovery']),
      }),
    )
    expect(outcome.kind).toBe('question')
    // Before CRC-QA-5, this candidate would have been permanently recorded
    // as 'preempted_by_discovery' the instant discovery won the forced
    // slot. It was, in fact, genuinely attempted (as progression's own
    // attempt #2) and delivered -- the diagnostic must say so.
    expect(outcome.selectorSignal?.outcome).toBe('asked')
    expect(outcome.selectorSignal?.outcome).not.toBe('preempted_by_discovery')
  })

  test('CASE 13 (MANDATORY): selector becomes attempt #2 and is rejected, no readiness need -> selector-at-exhaustion (attempt #4) must NOT re-evaluate the identical dedupe key', async () => {
    const store = createInMemorySessionStore()
    let selectorConstraintACalls = 0
    const decider: ConstraintADecider = async (input: ConstraintAInput): Promise<ConstraintADecision> => {
      if (input.candidate.question_kind === 'governed_selector_clarification') {
        selectorConstraintACalls += 1
        return suppress()
      }
      if (input.candidate.question_kind === 'commercial_readiness_discovery') return suppress()
      return ask()
    }
    const outcome = await runTurn(
      { token: 'case13', turnNumber: 1, userText: 'x' },
      deps(
        {
          extractor: constantExtractor([...allFourEligibleCandidates(), jurisdictionMentionCandidate('United States'), humanContributionAlreadyConfirmedCandidate()]),
          generator: THROW_IF_CALLED,
          decider,
        },
        store,
      ),
    )
    // Discovery (attempt #1) rejected -> selector (attempt #2, progression)
    // rejected -> no Track B readiness need for this fixture -> attempt #4
    // would, absent the guard, re-derive and re-propose the IDENTICAL
    // tool_account_status::kling need. The guard must suppress it: the
    // selector candidate is evaluated by Constraint A AT MOST ONCE this
    // turn, and the turn genuinely exhausts (no question delivered).
    expect(outcome.kind).toBe('complete')
    expect(selectorConstraintACalls).toBe(1)
    const state = await loadState(store, 'case13')
    expect(state.boundary_state.user_facing_questions_asked).toBe(0)
    expect(state.boundary_state.selector_needs_used['tool_account_status::kling']).toBeUndefined()
  })
})
