/**
 * CRC-USERGOAL-QUESTION-CONTEXT-1 (2026-10-02). Integration suite for the
 * generic governed-dependency-question context repair diagnosed by
 * CRC-UAT-USERGOAL-PROVENANCE-1: neither `governed_selector_clarification`
 * nor `knowledge_readiness_acquisition` was ever a member of
 * `PENDING_CLARIFICATION_KINDS` (pending-clarification.ts), so a reply
 * answering either kind of question reached extraction with NO signal that
 * it was answering CRC's own immediately preceding question -- a bare
 * `declarative need` statement in that reply (e.g. an uncertainty clause)
 * could then be proposed as a brand-new, independent `user_goal` purely on
 * the strength of the `user_goal` extraction rule's own text, which has no
 * turn-context precondition.
 *
 * Mock-stack only, same discipline as run-turn-second-jurisdiction-ux.test.ts
 * and run-turn-knowledge-readiness.test.ts. What this file does NOT prove:
 * whether the real Anthropic extractor actually treats a reply differently
 * given the new `answering_governed_dependency_question` context line --
 * that is an LLM-behavior question, not a mock-stack concern (same
 * disclaimer as the jurisdiction suite's own header). This file proves:
 * (1) the new BoundaryState field is threaded correctly end-to-end for BOTH
 * governed-dependency question kinds, and (2) the deterministic SU-mutation
 * layer downstream of extraction imposes no obstacle to -- and no silent
 * goal-deduplication side effect for -- any of the candidate shapes a
 * correctly-behaving model would produce for each required case.
 *
 * `governed_selector_clarification` proof (Case F, selector half): at the
 * time this milestone was written, `__tests__/crc-engine/run-turn-tool-
 * account-status-selector.test.ts` and sibling selector suites were already
 * failing on `origin/main`, BEFORE this milestone's own changes (confirmed
 * by running the full suite against a clean checkout of origin/main prior
 * to touching any file) -- real selector eligibility is not currently
 * reaching the asked/approved state in this environment, for reasons wholly
 * unrelated to this milestone (selector eligibility/derivation is explicitly
 * out of scope here; see the milestone's own Scope Gate). To avoid
 * conflating that pre-existing, out-of-scope breakage with this milestone's
 * own correctness, the selector half of Case F is proven by injecting a
 * synthetic `governed_selector_clarification`-kind proposal through the
 * mock ordinary `generator` (safe: evaluateBoundary's own cap-key
 * computation for this kind already falls back to 'unknown' when the
 * optional dedupe-key fields are absent -- boundaries.ts lines ~935-949) --
 * this isolates and proves ONLY this milestone's own downstream plumbing
 * (`isGovernedDependencyQuestionProposal` -> `governedDependencyQuestionJustAsked`
 * -> BoundaryState -> next turn's RawUserTurn), in total isolation from
 * whatever is separately wrong with real selector derivation.
 */

import { runTurn, type RunTurnDeps } from '@/lib/crc-engine/run-turn'
import { createInMemorySessionStore } from '@/lib/crc-engine/in-memory-session-store'
import { constantExtractor } from '@/lib/interview-engine/mock-extractor'
import { constantCandidateQuestionGenerator } from '@/lib/interview-engine/mock-candidate-question'
import { constantConstraintADecider } from '@/lib/interview-engine/mock-decision'
import type { CandidateObservation, RawUserTurn } from '@/lib/interview-engine/extraction'
import type { CandidateQuestionProposal } from '@/lib/interview-engine/candidate-question'
import type { SessionStore } from '@/lib/crc-engine/session-store'
import type { CRCSessionState } from '@/lib/crc-engine/types'
import type { TopicClaim } from '@/lib/retrieval-engine/types'
import { getAskabilityEntry } from '@/lib/crc-engine/dependency-askability'
import { MATRIX_FIXTURE } from '@/lib/retrieval-engine/matrix-fixture'
import { TOPIC_CLAIMS_FIXTURE } from '@/lib/retrieval-engine/topic-claims-fixture'
import { TOPIC_RELATIONSHIPS_FIXTURE } from '@/lib/retrieval-engine/topic-relationships-fixture'
import { JURISDICTION_CLARIFICATION_QUESTION } from '@/lib/crc-engine/jurisdiction-clarification'

jest.mock('@/lib/crc-engine/dependency-askability', () => ({
  ...jest.requireActual('@/lib/crc-engine/dependency-askability'),
  getAskabilityEntry: jest.fn(),
}))

const mockedGetAskabilityEntry = getAskabilityEntry as jest.Mock

// Deliberately a DIFFERENT provider than run-turn-knowledge-readiness.test.ts's
// own fixture (iStock) -- proves this mechanism is not provider-specific,
// per the milestone's own "do not encode provider/domain vocabulary"
// constraint. 'getty' is one of the real, already-registered
// AssetProviderMention resolutions (not a synthetic/fabricated provider).
const ASKABLE_ENTRY = {
  treatment: 'askable_in_crc' as const,
  generic_acquisition: {
    target: { kind: 'asset_provider_field' as const, field: 'license' as const },
    question_text: 'What license covers that provider material?',
    max_attempts: 1,
  },
}

const STOCK_CLAIM: TopicClaim = {
  claim_id: 'CLAIM-TEST-GOVERNED-DEP-CTX',
  topic: 'third_party_source_rights',
  claim_character: 'established',
  jurisdiction: 'Global',
  lifecycle: 'Adopted',
  crc_eligible: 'Yes',
  crc_publication_scope: null,
  crc_candidate_statement: null,
  applicability_requirements: [],
  unresolved_project_dependencies: ['test_provider_license_confirmed'],
  provider_scope: ['getty'],
  tool_scope: null,
  last_verified: null,
  superseded_by: null,
}

const MATRIX = [{ identifier: 'kling', last_verified: '2026-08-05', claims: [{ claim_id: 'kling', crc_eligible: 'Yes' as const, crc_publication_scope: 'x', crc_candidate_statement: 'Kling statement.', applicability_requirements: [] }] }]

function deps(overrides: Partial<RunTurnDeps> = {}, store?: SessionStore): RunTurnDeps {
  return {
    extractor: constantExtractor([]),
    generator: constantCandidateQuestionGenerator(null),
    decider: constantConstraintADecider({ should_ask: true, reason_code: 'MATERIALLY_IMPROVES_UNDERSTANDING', rationale: 'x' }),
    sessionStore: store ?? createInMemorySessionStore(),
    matrix: MATRIX,
    topicClaims: [STOCK_CLAIM],
    ...overrides,
  }
}

const BASE_BOUNDARY_STATE = {
  follow_ups_used: {},
  uncertainty_clarifications_used: {},
  historical_experience_asked: false,
  disentangling_question_asked: false,
  commercial_readiness_discovery_asked: false,
  jurisdiction_clarification_asked: false,
  human_contribution_clarification_asked: false,
  jurisdiction_clarification_retry_asked: false,
  jurisdiction_clarification_pending_answer: false,
  governed_dependency_question_pending_answer: false,
  knowledge_readiness_used: {},
  selector_needs_used: {},
  interview_ended: false,
  phases_ended: [],
  user_facing_questions_asked: 0,
}

function emptySU(overrides: Partial<CRCSessionState['structured_understanding']> = {}) {
  return {
    project_facts: {
      intended_use: { attestation: { state: 'confirmed' as const, value: 'an ad' }, source_turn: 1, source_statement: 'x' },
      workflow_role: { attestation: { state: 'unknown' as const }, source_turn: 0, source_statement: '' },
      jurisdiction: { attestation: { state: 'unknown' as const }, source_turn: 0, source_statement: '' },
      human_contribution_description: { attestation: { state: 'unknown' as const }, source_turn: 0, source_statement: '' },
    },
    tool_mentions: [],
    scoped_observations: [],
    user_goals: [] as CRCSessionState['structured_understanding']['user_goals'],
    asset_provider_mentions: [] as CRCSessionState['structured_understanding']['asset_provider_mentions'],
    assessment_jurisdiction_mentions: [],
    content_presence_mentions: [],
    distribution_territory_mentions: [],
    organization_location_mentions: [],
    current_phase: 3 as const,
    gate_1_state: 'met' as const,
    gate_2_state: 'not_yet_stable' as const,
    completion_reason: null,
    opt_out_scope: null,
    ...overrides,
  }
}

async function loadState(store: SessionStore, token: string): Promise<CRCSessionState> {
  return (await store.load(token)) as CRCSessionState
}

beforeEach(() => {
  mockedGetAskabilityEntry.mockReset()
})

describe('CRC-USERGOAL-QUESTION-CONTEXT-1 -- Case F: both governed question kinds receive the new context', () => {
  test('F1 (knowledge_readiness_acquisition, real derivation): answering_governed_dependency_question is threaded true on the turn immediately after a real readiness question is asked', async () => {
    mockedGetAskabilityEntry.mockImplementation((id: string) => (id === 'test_provider_license_confirmed' ? ASKABLE_ENTRY : undefined))
    const store = createInMemorySessionStore()
    await store.save('rt-f1', {
      structured_understanding: emptySU({
        user_goals: [{ goal_id: 'g-1', state: 'confirmed', raw_text: 'Can I use this Getty image?', category: 'third_party_source_rights', scope: 'informational', superseded_by: null, source_turn: 1, source_statement: 'x' }],
        asset_provider_mentions: [{ mention_id: 'ap-1', resolution: { kind: 'canonical', identifier: 'getty' }, confidence: 'confirmed', source_turn: 1, source_statement: 'Getty', superseded_by: null, usage: { state: 'confirmed', value: 'direct_generation_input' }, license: { state: 'unknown' } }],
      }),
      boundary_state: BASE_BOUNDARY_STATE,
      pending_clarification: null,
      pending_commercial_readiness_takeaway: null,
    })

    const readinessTurn = await runTurn({ token: 'rt-f1', turnNumber: 2, userText: 'anything' }, deps({}, store))
    expect(readinessTurn.kind).toBe('question')
    if (readinessTurn.kind === 'question') expect(readinessTurn.message).toBe(ASKABLE_ENTRY.generic_acquisition.question_text)

    let lastRawTurn: RawUserTurn | null = null
    const instrumentedExtractor = async (turn: RawUserTurn) => {
      lastRawTurn = turn
      return []
    }
    await runTurn({ token: 'rt-f1', turnNumber: 3, userText: 'The standard license.' }, deps({ extractor: instrumentedExtractor }, store))
    expect(lastRawTurn!.answering_governed_dependency_question).toBe(true)
  })

  test('F2 (governed_selector_clarification, injected proposal): answering_governed_dependency_question is threaded true on the turn immediately after a selector-kind question is asked', async () => {
    const store = createInMemorySessionStore()
    const selectorProposal: CandidateQuestionProposal = {
      question_text: '[synthetic governed selector question for plumbing proof only]',
      question_kind: 'governed_selector_clarification',
      target_signal_id: null,
      phase: 3,
    }
    const firstTurn = await runTurn(
      { token: 'rt-f2', turnNumber: 1, userText: 'x' },
      deps({ extractor: constantExtractor([]), generator: constantCandidateQuestionGenerator(selectorProposal) }, store),
    )
    expect(firstTurn.kind).toBe('question')
    if (firstTurn.kind === 'question') expect(firstTurn.message).toBe(selectorProposal.question_text)

    let lastRawTurn: RawUserTurn | null = null
    const instrumentedExtractor = async (turn: RawUserTurn) => {
      lastRawTurn = turn
      return []
    }
    await runTurn({ token: 'rt-f2', turnNumber: 2, userText: 'whatever' }, deps({ extractor: instrumentedExtractor, generator: constantCandidateQuestionGenerator(null) }, store))
    expect(lastRawTurn!.answering_governed_dependency_question).toBe(true)
  })

  test('false on an ordinary turn with no preceding governed-dependency question (safety: never inferred from this turn\'s own text)', async () => {
    const store = createInMemorySessionStore()
    let lastRawTurn: RawUserTurn | null = null
    const instrumentedExtractor = async (turn: RawUserTurn) => {
      lastRawTurn = turn
      return []
    }
    await runTurn({ token: 'rt-false', turnNumber: 1, userText: 'The standard license.' }, deps({ extractor: instrumentedExtractor }, store))
    expect(lastRawTurn!.answering_governed_dependency_question).toBe(false)
  })

  test('consumed, not carried forward indefinitely: BoundaryState resets to false at the end of the very turn that consumes it', async () => {
    // Turn 2 is given its own ordinary ('other'-kind, uncapped) filler
    // proposal via the generator, so it asks a FRESH question rather than
    // completing the interview. This is deliberate: a turn whose outcome is
    // 'complete' via questioning_exhausted/budget-exhausted/natural-completion
    // saves boundary_state through one of run-turn.ts's three terminal
    // early-return paths, which carry every BoundaryState field forward
    // UNCHANGED (confirmed directly: jurisdiction_clarification_pending_answer
    // exhibits the IDENTICAL carry-forward-without-reset behavior across a
    // real terminal completion -- pre-existing, not introduced by this
    // milestone, and inert: completion_reason !== null means no further
    // turn ever calls the extractor again, so a stale value there can never
    // reach a real context line). Keeping turn 2's outcome as 'question'
    // instead isolates and proves the actual, reachable reset behavior.
    const store = createInMemorySessionStore()
    const selectorProposal: CandidateQuestionProposal = {
      question_text: '[synthetic governed selector question for plumbing proof only]',
      question_kind: 'governed_selector_clarification',
      target_signal_id: null,
      phase: 3,
    }
    const fillerProposal: CandidateQuestionProposal = {
      question_text: '[ordinary filler question for plumbing proof only]',
      question_kind: 'other',
      target_signal_id: null,
      phase: 3,
    }
    const turn1 = await runTurn({ token: 'rt-consumed', turnNumber: 1, userText: 'x' }, deps({ generator: constantCandidateQuestionGenerator(selectorProposal) }, store))
    expect(turn1.kind).toBe('question')
    const afterFirst = await loadState(store, 'rt-consumed')
    expect(afterFirst.boundary_state.governed_dependency_question_pending_answer).toBe(true)

    const turn2 = await runTurn({ token: 'rt-consumed', turnNumber: 2, userText: 'The standard license.' }, deps({ generator: constantCandidateQuestionGenerator(fillerProposal) }, store))
    expect(turn2.kind).toBe('question')
    if (turn2.kind === 'question') expect(turn2.message).toBe(fillerProposal.question_text)
    const afterSecond = await loadState(store, 'rt-consumed')
    expect(afterSecond.boundary_state.governed_dependency_question_pending_answer).toBe(false)
  })

  test('does not interfere with answering_jurisdiction_question -- the two flags are independent, same turn can only ever reflect the actual immediately-preceding question', async () => {
    // Uses the REAL retrieval-engine fixtures (not this file's own minimal
    // MATRIX/STOCK_CLAIM), same as run-turn-second-jurisdiction-ux.test.ts --
    // real deterministic jurisdiction eligibility depends on the full
    // governed-knowledge/relationships derivation this file's own minimal
    // fixture does not exercise. This test is specifically about the
    // INDEPENDENCE of the two flags, not about this file's own readiness
    // fixture, so borrowing the real jurisdiction suite's own fixtures here
    // is the correct, narrow choice.
    const store = createInMemorySessionStore()
    const turn1 = await runTurn(
      { token: 'rt-jur-indep', turnNumber: 1, userText: 'I made an AI-generated video using Kling AI. Do I own the copyright?' },
      {
        extractor: constantExtractor([
          { proposal_id: 'p-tool', turn: 1, raw_text: 'Kling AI', kind: 'tool_mention', raw_tool_name: 'Kling AI' },
          { proposal_id: 'p-goal', turn: 1, raw_text: 'Do I own the copyright?', kind: 'user_goal', goal_confidence_hint: 'confirmed', goal_category_hint: 'copyright_ownership', goal_scope_hint: 'informational' },
          { proposal_id: 'p-use', turn: 1, raw_text: 'for a client', kind: 'project_fact', raw_fact_field: 'intended_use', fact_confidence_hint: 'confirmed', fact_value_hint: 'for a client' },
        ]),
        generator: constantCandidateQuestionGenerator(null),
        decider: constantConstraintADecider({ should_ask: true, reason_code: 'MATERIALLY_IMPROVES_UNDERSTANDING', rationale: 'x' }),
        sessionStore: store,
        matrix: MATRIX_FIXTURE,
        topicClaims: TOPIC_CLAIMS_FIXTURE,
        relationships: TOPIC_RELATIONSHIPS_FIXTURE,
      },
    )
    expect(turn1.kind).toBe('question')
    if (turn1.kind === 'question') expect(turn1.message).toBe(JURISDICTION_CLARIFICATION_QUESTION)

    let lastRawTurn: RawUserTurn | null = null
    const instrumentedExtractor = async (turn: RawUserTurn) => {
      lastRawTurn = turn
      return []
    }
    await runTurn(
      { token: 'rt-jur-indep', turnNumber: 2, userText: 'My client is in the US.' },
      {
        extractor: instrumentedExtractor,
        generator: constantCandidateQuestionGenerator(null),
        decider: constantConstraintADecider({ should_ask: true, reason_code: 'MATERIALLY_IMPROVES_UNDERSTANDING', rationale: 'x' }),
        sessionStore: store,
        matrix: MATRIX_FIXTURE,
        topicClaims: TOPIC_CLAIMS_FIXTURE,
        relationships: TOPIC_RELATIONSHIPS_FIXTURE,
      },
    )
    expect(lastRawTurn!.answering_jurisdiction_question).toBe(true)
    expect(lastRawTurn!.answering_governed_dependency_question).toBe(false)
  })
})

describe('CRC-USERGOAL-QUESTION-CONTEXT-1 -- Cases A-D: deterministic SU-mutation layer imposes no obstacle given a correctly-behaving model', () => {
  /**
   * Every test below feeds `constantExtractor` a HAND-CONSTRUCTED candidate
   * set representing what a model instructed by the new context line
   * SHOULD propose for that case -- this does not, and cannot, prove the
   * real model will actually propose exactly that set (an LLM-behavior
   * question, out of scope for a mock-stack suite; see this file's own
   * header). What it proves: the deterministic StructuredUnderstanding
   * mutation layer (extraction.ts's attestCandidate/addUserGoal path)
   * neither fabricates a goal on its own, nor collapses/merges goals on
   * its own, nor blocks a genuinely new goal from being added -- i.e.
   * nothing downstream of extraction would frustrate any of these cases
   * even if the model classifies perfectly.
   */

  function goalOf(category: string, raw_text: string, proposal_id = 'p-goal'): CandidateObservation {
    return { proposal_id, turn: 2, raw_text, kind: 'user_goal', goal_confidence_hint: 'confirmed', goal_category_hint: category as CandidateObservation['goal_category_hint'], goal_scope_hint: 'informational' } as unknown as CandidateObservation
  }

  test('A: answer-only candidate set (no user_goal proposed) -> no goal is fabricated by the mutation layer itself', async () => {
    const store = createInMemorySessionStore()
    await store.save('rt-case-a', {
      structured_understanding: emptySU({
        user_goals: [{ goal_id: 'g-1', state: 'confirmed', raw_text: 'Can I use this Getty image?', category: 'third_party_source_rights', scope: 'informational', superseded_by: null, source_turn: 1, source_statement: 'x' }],
        asset_provider_mentions: [{ mention_id: 'ap-1', resolution: { kind: 'canonical', identifier: 'getty' }, confidence: 'confirmed', source_turn: 1, source_statement: 'Getty', superseded_by: null, usage: { state: 'confirmed', value: 'direct_generation_input' }, license: { state: 'unknown' } }],
      }),
      boundary_state: { ...BASE_BOUNDARY_STATE, governed_dependency_question_pending_answer: true },
      pending_clarification: null,
      pending_commercial_readiness_takeaway: null,
    })

    // Candidate set a compliant model proposes for "I have the standard license." -- evidence only, no goal.
    await runTurn(
      { token: 'rt-case-a', turnNumber: 3, userText: 'I have the standard license.' },
      deps({
        extractor: constantExtractor([
          { proposal_id: 'p-ev', turn: 3, raw_text: 'I have the standard license.', kind: 'asset_provider_mention', raw_provider_name: 'Getty', supersedes_asset_provider_mention_id: 'ap-1', license_confidence_hint: 'confirmed', license_value_hint: 'the standard license' },
        ]),
      }, store),
    )
    const loaded = await loadState(store, 'rt-case-a')
    expect(loaded.structured_understanding.user_goals).toHaveLength(1)
    expect(loaded.structured_understanding.user_goals[0].goal_id).toBe('g-1')
  })

  test('B: answer + uncertainty-about-the-answer candidate set (still no second user_goal proposed) -> exactly the Production failure shape, no goal is fabricated by the mutation layer itself', async () => {
    const store = createInMemorySessionStore()
    await store.save('rt-case-b', {
      structured_understanding: emptySU({
        user_goals: [{ goal_id: 'g-1', state: 'confirmed', raw_text: 'Can I use this Getty image commercially?', category: 'third_party_source_rights', scope: 'informational', superseded_by: null, source_turn: 1, source_statement: 'x' }],
        asset_provider_mentions: [{ mention_id: 'ap-1', resolution: { kind: 'canonical', identifier: 'getty' }, confidence: 'confirmed', source_turn: 1, source_statement: 'Getty', superseded_by: null, usage: { state: 'confirmed', value: 'direct_generation_input' }, license: { state: 'unknown' } }],
      }),
      boundary_state: { ...BASE_BOUNDARY_STATE, governed_dependency_question_pending_answer: true },
      pending_clarification: null,
      pending_commercial_readiness_takeaway: null,
    })

    // Sanitized regression shape of the Production failure (Section 13):
    // "I have the standard license, but I don't know whether that covers
    // this project." -- a correctly-instructed model proposes only the
    // evidence candidate; the uncertainty clause is NOT separately proposed
    // as a user_goal (contrast with test C below, where a genuinely new,
    // distinct ask IS proposed and must survive).
    await runTurn(
      { token: 'rt-case-b', turnNumber: 3, userText: "I have the standard license, but I don't know whether that covers this project." },
      deps({
        extractor: constantExtractor([
          { proposal_id: 'p-ev', turn: 3, raw_text: "I have the standard license, but I don't know whether that covers this project.", kind: 'asset_provider_mention', raw_provider_name: 'Getty', supersedes_asset_provider_mention_id: 'ap-1', license_confidence_hint: 'confirmed', license_value_hint: 'the standard license' },
        ]),
      }, store),
    )
    const loaded = await loadState(store, 'rt-case-b')
    expect(loaded.structured_understanding.user_goals).toHaveLength(1)
    expect(loaded.structured_understanding.user_goals[0].goal_id).toBe('g-1')
    // Append-only supersession history (mutations.ts): the prior mention
    // (ap-1) is marked superseded_by, never deleted/overwritten in place --
    // the CURRENT license lives on the newest, non-superseded mention.
    const currentMention = loaded.structured_understanding.asset_provider_mentions.find((m) => m.superseded_by === null)
    expect(currentMention?.license).toEqual({ state: 'confirmed', value: 'the standard license' })
  })

  test('C: answer + genuinely new, distinct explicit ask -> the new ask survives as its own user_goal, unsuppressed by the presence of an answer in the same turn', async () => {
    const store = createInMemorySessionStore()
    await store.save('rt-case-c', {
      structured_understanding: emptySU({
        user_goals: [{ goal_id: 'g-1', state: 'confirmed', raw_text: 'Can I use this Getty image?', category: 'third_party_source_rights', scope: 'informational', superseded_by: null, source_turn: 1, source_statement: 'x' }],
        asset_provider_mentions: [{ mention_id: 'ap-1', resolution: { kind: 'canonical', identifier: 'getty' }, confidence: 'confirmed', source_turn: 1, source_statement: 'Getty', superseded_by: null, usage: { state: 'confirmed', value: 'direct_generation_input' }, license: { state: 'unknown' } }],
      }),
      boundary_state: { ...BASE_BOUNDARY_STATE, governed_dependency_question_pending_answer: true },
      pending_clarification: null,
      pending_commercial_readiness_takeaway: null,
    })

    // "I have the standard license. Also, can I use the client's logo in
    // generated scenes?" -- a compliant model proposes BOTH the evidence
    // candidate AND a fresh, distinct user_goal for the logo question.
    await runTurn(
      { token: 'rt-case-c', turnNumber: 3, userText: "I have the standard license. Also, can I use the client's logo in generated scenes?" },
      deps({
        extractor: constantExtractor([
          { proposal_id: 'p-ev', turn: 3, raw_text: 'I have the standard license.', kind: 'asset_provider_mention', raw_provider_name: 'Getty', supersedes_asset_provider_mention_id: 'ap-1', license_confidence_hint: 'confirmed', license_value_hint: 'the standard license' },
          goalOf('trademark', "can I use the client's logo in generated scenes?", 'p-goal-new'),
        ]),
      }, store),
    )
    const loaded = await loadState(store, 'rt-case-c')
    expect(loaded.structured_understanding.user_goals).toHaveLength(2)
    expect(loaded.structured_understanding.user_goals.map((g) => g.goal_id)).toContain('g-1')
    expect(loaded.structured_understanding.user_goals.some((g) => g.raw_text.includes("client's logo"))).toBe(true)
  })

  test('D: two genuinely distinct explicit goals sharing the SAME category remain both representable -- no automatic same-category merging, no category-based deduplication', async () => {
    const store = createInMemorySessionStore()
    await store.save('rt-case-d', {
      structured_understanding: emptySU({
        user_goals: [
          { goal_id: 'g-1', state: 'confirmed', raw_text: 'Can I use this Getty image in the video?', category: 'third_party_source_rights', scope: 'informational', superseded_by: null, source_turn: 1, source_statement: 'x' },
        ],
      }),
      boundary_state: BASE_BOUNDARY_STATE,
      pending_clarification: null,
      pending_commercial_readiness_takeaway: null,
    })

    // A genuinely distinct, unrelated second third_party_source_rights
    // question (a different provider entirely) -- must remain a SEPARATE
    // goal, never merged into g-1 merely because the category matches.
    await runTurn(
      { token: 'rt-case-d', turnNumber: 2, userText: 'Separately, can I use this Shutterstock clip in the same project?' },
      deps({
        extractor: constantExtractor([goalOf('third_party_source_rights', 'Can I use this Shutterstock clip in the same project?', 'p-goal-2')]),
      }, store),
    )
    const loaded = await loadState(store, 'rt-case-d')
    expect(loaded.structured_understanding.user_goals).toHaveLength(2)
    const categories = loaded.structured_understanding.user_goals.map((g) => g.category)
    expect(categories).toEqual(['third_party_source_rights', 'third_party_source_rights'])
    // Distinct raw_text preserved for each -- confirms no merge collapsed them into one record.
    const rawTexts = loaded.structured_understanding.user_goals.map((g) => g.raw_text)
    expect(rawTexts).toContain('Can I use this Getty image in the video?')
    expect(rawTexts).toContain('Can I use this Shutterstock clip in the same project?')
  })
})
