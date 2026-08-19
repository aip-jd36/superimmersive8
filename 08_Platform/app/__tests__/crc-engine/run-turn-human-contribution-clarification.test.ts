/**
 * Human-contribution clarification -- integration test suite (Copyright
 * UAT Correction Milestone, 2026-08-19, PM-approved H6). Mock-stack only,
 * same discipline as run-turn-jurisdiction-clarification.test.ts, which
 * this file mirrors closely. Proves the deterministic candidate actually
 * gets injected at Model 4's shared attempt-#1 slot, that jurisdiction
 * wins the slot when both are eligible the same turn, that human-
 * contribution then wins over Discovery, that its own cap is independent,
 * and that Gate 1 need not be met.
 */

import { runTurn, type RunTurnDeps, type TurnOutcome } from '@/lib/crc-engine/run-turn'
import { createInMemorySessionStore } from '@/lib/crc-engine/in-memory-session-store'
import { constantExtractor } from '@/lib/interview-engine/mock-extractor'
import { constantCandidateQuestionGenerator } from '@/lib/interview-engine/mock-candidate-question'
import { constantConstraintADecider } from '@/lib/interview-engine/mock-decision'
import { JURISDICTION_CLARIFICATION_QUESTION } from '@/lib/crc-engine/jurisdiction-clarification'
import { HUMAN_CONTRIBUTION_CLARIFICATION_QUESTION } from '@/lib/crc-engine/human-contribution-clarification'
import type { CandidateObservation } from '@/lib/interview-engine/extraction'
import type { ConstraintADecision } from '@/lib/interview-engine/decision'
import type { SessionStore } from '@/lib/crc-engine/session-store'
import type { CRCSessionState } from '@/lib/crc-engine/types'
import type { TopicClaim } from '@/lib/retrieval-engine/types'

const MATRIX: RunTurnDeps['matrix'] = []

const COPYRIGHT_CLAIM: TopicClaim = {
  claim_id: 'CLAIM-COPY-TEST-v1',
  topic: 'copyright_ownership',
  claim_character: 'established',
  jurisdiction: 'United States',
  lifecycle: 'Adopted',
  crc_eligible: 'Yes',
  crc_publication_scope: 'scope',
  crc_candidate_statement: 'Test statement.',
  applicability_requirements: [{ fact: 'jurisdiction', operator: 'equals', value: 'United States' }],
  unresolved_project_dependencies: ['human_contribution_description'],
  provider_scope: null,
  last_verified: '2026-08-16',
  superseded_by: null,
}

function deps(overrides: Partial<RunTurnDeps> = {}, store?: SessionStore): RunTurnDeps {
  return {
    extractor: constantExtractor([]),
    generator: constantCandidateQuestionGenerator(null),
    decider: constantConstraintADecider({ should_ask: false, reason_code: 'NO_MATERIAL_IMPROVEMENT', rationale: 'x' }),
    sessionStore: store ?? createInMemorySessionStore(),
    matrix: MATRIX,
    topicClaims: [COPYRIGHT_CLAIM],
    ...overrides,
  }
}

function toolCandidate(overrides: Partial<CandidateObservation> = {}): CandidateObservation {
  return { proposal_id: 'p-1', turn: 1, raw_text: 'We used Kling.', kind: 'tool_mention', raw_tool_name: 'Kling', ...overrides }
}

function goalCandidate(overrides: Partial<CandidateObservation> = {}): CandidateObservation {
  return {
    proposal_id: 'p-goal',
    turn: 1,
    raw_text: 'Do I own the copyright?',
    kind: 'user_goal',
    goal_confidence_hint: 'confirmed',
    goal_category_hint: 'copyright_ownership',
    goal_scope_hint: 'informational',
    ...overrides,
  }
}

function askDecision(overrides: Partial<ConstraintADecision> = {}): ConstraintADecision {
  return { should_ask: true, reason_code: 'MATERIALLY_IMPROVES_UNDERSTANDING', rationale: 'x', ...overrides }
}

async function loadState(store: SessionStore, token: string): Promise<CRCSessionState> {
  return (await store.load(token)) as CRCSessionState
}

/** Goal + a minimal workflow anchor (tool mention), no intended_use/workflow_role -- Gate 1 deliberately NOT met. */
function eligibleDeps(overrides: Partial<RunTurnDeps> = {}, store?: SessionStore): RunTurnDeps {
  return deps(
    {
      extractor: constantExtractor([toolCandidate(), goalCandidate()]),
      decider: constantConstraintADecider(askDecision()),
      ...overrides,
    },
    store,
  )
}

describe('human-contribution clarification -- eligibility gating', () => {
  test('eligible: an active copyright_ownership goal + a dependency-gated Adopted/CRC-eligible claim + a minimal workflow anchor + jurisdiction already known -> asked as attempt 1, exact PM-approved copy', async () => {
    const store = createInMemorySessionStore()
    let generatorCalled = false
    const generator = async () => {
      generatorCalled = true
      return null
    }
    // Jurisdiction already confirmed so it does not preempt this turn.
    const jurisdictionAnswer: CandidateObservation = {
      proposal_id: 'p-jur', turn: 1, raw_text: 'United States', kind: 'project_fact',
      raw_fact_field: 'jurisdiction', fact_confidence_hint: 'confirmed', fact_value_hint: 'United States',
    }
    const d = eligibleDeps({ generator, extractor: constantExtractor([toolCandidate(), goalCandidate(), jurisdictionAnswer]) }, store)
    const outcome = await runTurn({ token: 't1', turnNumber: 1, userText: 'x' }, d)
    expect(outcome.kind).toBe('question')
    if (outcome.kind === 'question') {
      expect(outcome.message).toBe(HUMAN_CONTRIBUTION_CLARIFICATION_QUESTION)
    }
    expect(outcome.humanContributionSignal).toEqual({ eligible: true, outcome: 'asked' })
    expect(generatorCalled).toBe(false)

    const state = await loadState(store, 't1')
    expect(state.boundary_state.human_contribution_clarification_asked).toBe(true)
    expect(state.structured_understanding.gate_1_state).toBe('not_met')
  })

  test('not eligible: no goal at all -> humanContributionSignal is omitted entirely (undefined)', async () => {
    const store = createInMemorySessionStore()
    const d = deps({ extractor: constantExtractor([toolCandidate()]), decider: constantConstraintADecider({ should_ask: false, reason_code: 'NO_MATERIAL_IMPROVEMENT', rationale: 'x' }) }, store)
    const outcome = await runTurn({ token: 't2', turnNumber: 1, userText: 'x' }, d)
    expect(outcome.humanContributionSignal).toBeUndefined()
  })

  test('the answer on the NEXT turn flows through completely ordinary, already-existing project_fact extraction', async () => {
    const store = createInMemorySessionStore()
    const jurisdictionAnswer: CandidateObservation = {
      proposal_id: 'p-jur', turn: 1, raw_text: 'United States', kind: 'project_fact',
      raw_fact_field: 'jurisdiction', fact_confidence_hint: 'confirmed', fact_value_hint: 'United States',
    }
    await runTurn({ token: 't3', turnNumber: 1, userText: 'x' }, eligibleDeps({ extractor: constantExtractor([toolCandidate(), goalCandidate(), jurisdictionAnswer]) }, store))

    const contributionAnswer: CandidateObservation = {
      proposal_id: 'p-hc', turn: 2, raw_text: 'I only wrote prompts.', kind: 'project_fact',
      raw_fact_field: 'human_contribution_description', fact_confidence_hint: 'confirmed', fact_value_hint: 'I only wrote prompts.',
    }
    await runTurn({ token: 't3', turnNumber: 2, userText: 'I only wrote prompts.' }, eligibleDeps({ extractor: constantExtractor([contributionAnswer]) }, store))

    const state = await loadState(store, 't3')
    expect(state.structured_understanding.project_facts.human_contribution_description).toEqual({
      attestation: { state: 'confirmed', value: 'I only wrote prompts.' },
      source_turn: 2,
      source_statement: 'I only wrote prompts.',
    })
  })

  test('cumulative correction: a later turn restating the full combined description overwrites (plain replacement), never silently drops the earlier detail because the extractor is expected to restate the complete picture', async () => {
    const store = createInMemorySessionStore()
    const jurisdictionAnswer: CandidateObservation = {
      proposal_id: 'p-jur', turn: 1, raw_text: 'United States', kind: 'project_fact',
      raw_fact_field: 'jurisdiction', fact_confidence_hint: 'confirmed', fact_value_hint: 'United States',
    }
    await runTurn({ token: 't4', turnNumber: 1, userText: 'x' }, eligibleDeps({ extractor: constantExtractor([toolCandidate(), goalCandidate(), jurisdictionAnswer]) }, store))

    const firstAnswer: CandidateObservation = {
      proposal_id: 'p-hc1', turn: 2, raw_text: 'I only wrote prompts.', kind: 'project_fact',
      raw_fact_field: 'human_contribution_description', fact_confidence_hint: 'confirmed', fact_value_hint: 'I only wrote prompts.',
    }
    // Generator overridden to return a real (non-null) ordinary proposal so this
    // turn asks something ordinary rather than exhausting into
    // questioning_exhausted -- which would otherwise prevent turn 3 from ever
    // running (a completed session short-circuits at the top of runTurn).
    const ordinaryProposal = { question_text: 'Anything else about the workflow?', question_kind: 'other' as const, target_signal_id: null, phase: 2 as const }
    await runTurn(
      { token: 't4', turnNumber: 2, userText: 'I only wrote prompts.' },
      eligibleDeps({ extractor: constantExtractor([firstAnswer]), generator: constantCandidateQuestionGenerator(ordinaryProposal) }, store),
    )

    // Additive clarification -- the extractor's own job (not this pipeline's) is to
    // restate the FULL cumulative value; this test proves the mutation layer
    // performs a plain overwrite with whatever value it is given, exactly like
    // jurisdiction's own correction semantics.
    const cumulativeAnswer: CandidateObservation = {
      proposal_id: 'p-hc2', turn: 3, raw_text: 'Actually, I also did a lot of compositing.', kind: 'project_fact',
      raw_fact_field: 'human_contribution_description', fact_confidence_hint: 'confirmed',
      fact_value_hint: 'I wrote prompts, and I also did a lot of compositing.',
    }
    await runTurn({ token: 't4', turnNumber: 3, userText: 'Actually, I also did a lot of compositing.' }, eligibleDeps({ extractor: constantExtractor([cumulativeAnswer]) }, store))

    const state = await loadState(store, 't4')
    expect(state.structured_understanding.project_facts.human_contribution_description.attestation).toEqual({
      state: 'confirmed',
      value: 'I wrote prompts, and I also did a lot of compositing.',
    })
  })

  test('capped: once asked, a later turn never asks again even though jurisdiction is known and the description is still unconfirmed', async () => {
    const store = createInMemorySessionStore()
    const jurisdictionAnswer: CandidateObservation = {
      proposal_id: 'p-jur', turn: 1, raw_text: 'United States', kind: 'project_fact',
      raw_fact_field: 'jurisdiction', fact_confidence_hint: 'confirmed', fact_value_hint: 'United States',
    }
    await runTurn({ token: 't5', turnNumber: 1, userText: 'x' }, eligibleDeps({ extractor: constantExtractor([toolCandidate(), goalCandidate(), jurisdictionAnswer]) }, store))

    // A second, distinct tool mention -- genuine new material for Gate 2 to
    // register as a material change (diffToolMentions), WITHOUT satisfying
    // Phase 2->3's own "resolved tool AND (confirmed workflow_role OR
    // affirmative scoped_observation)" exit condition (deliberately no
    // scoped_observation and no workflow_role here) -- otherwise phase would
    // advance to 3 this turn and, since Gate 1 is deliberately never met in
    // this scenario, completion would fire immediately via
    // gate_1_unmet_exhausted before candidate generation is ever reached.
    const secondTool: CandidateObservation = { proposal_id: 'p-tool2', turn: 2, raw_text: 'We also used ElevenLabs for the voiceover.', kind: 'tool_mention', raw_tool_name: 'ElevenLabs' }
    let generatorCalled = false
    const generator = async () => {
      generatorCalled = true
      return null
    }
    const outcome2 = await runTurn(
      { token: 't5', turnNumber: 2, userText: 'more info' },
      eligibleDeps({ generator, extractor: constantExtractor([secondTool]) }, store),
    )
    expect(outcome2.humanContributionSignal).toBeUndefined()
    expect(generatorCalled).toBe(true)
  })

  test('declining the question: description stays unresolved but the cap still prevents re-asking', async () => {
    const store = createInMemorySessionStore()
    const jurisdictionAnswer: CandidateObservation = {
      proposal_id: 'p-jur', turn: 1, raw_text: 'United States', kind: 'project_fact',
      raw_fact_field: 'jurisdiction', fact_confidence_hint: 'confirmed', fact_value_hint: 'United States',
    }
    await runTurn({ token: 't6', turnNumber: 1, userText: 'x' }, eligibleDeps({ extractor: constantExtractor([toolCandidate(), goalCandidate(), jurisdictionAnswer]) }, store))
    await runTurn({ token: 't6', turnNumber: 2, userText: "Let's skip this question.", declineAction: 'skip_question' }, eligibleDeps({}, store))

    const state = await loadState(store, 't6')
    expect(state.structured_understanding.project_facts.human_contribution_description.attestation.state).toBe('unknown')
    expect(state.boundary_state.human_contribution_clarification_asked).toBe(true)
  })
})

describe('human-contribution clarification -- precedence (jurisdiction > human-contribution > Discovery)', () => {
  test('when both jurisdiction and human-contribution are unknown/eligible the same turn, jurisdiction wins the slot first', async () => {
    const store = createInMemorySessionStore()
    const d = eligibleDeps({}, store) // no jurisdiction answer this turn -- still unknown
    const outcome = await runTurn({ token: 't7', turnNumber: 1, userText: 'x' }, d)
    expect(outcome.kind).toBe('question')
    if (outcome.kind === 'question') {
      expect(outcome.message).toBe(JURISDICTION_CLARIFICATION_QUESTION)
    }
    expect(outcome.jurisdictionSignal?.outcome).toBe('asked')
    expect(outcome.humanContributionSignal).toEqual({ eligible: true, outcome: 'preempted_by_jurisdiction' })

    const state = await loadState(store, 't7')
    expect(state.boundary_state.jurisdiction_clarification_asked).toBe(true)
    // Human-contribution's own cap must NOT be consumed merely because jurisdiction fired this turn.
    expect(state.boundary_state.human_contribution_clarification_asked).toBe(false)
  })

  test('after jurisdiction is answered (and capped), human-contribution clarification asks next if still eligible', async () => {
    const store = createInMemorySessionStore()
    await runTurn({ token: 't8', turnNumber: 1, userText: 'x' }, eligibleDeps({}, store))
    expect((await loadState(store, 't8')).boundary_state.jurisdiction_clarification_asked).toBe(true)

    const jurisdictionAnswer: CandidateObservation = {
      proposal_id: 'p-jur', turn: 2, raw_text: 'United States', kind: 'project_fact',
      raw_fact_field: 'jurisdiction', fact_confidence_hint: 'confirmed', fact_value_hint: 'United States',
    }
    const outcome2 = await runTurn({ token: 't8', turnNumber: 2, userText: 'United States' }, eligibleDeps({ extractor: constantExtractor([jurisdictionAnswer]) }, store))
    expect(outcome2.kind).toBe('question')
    if (outcome2.kind === 'question') {
      expect(outcome2.message).toBe(HUMAN_CONTRIBUTION_CLARIFICATION_QUESTION)
    }
    expect(outcome2.humanContributionSignal?.outcome).toBe('asked')
  })
})
