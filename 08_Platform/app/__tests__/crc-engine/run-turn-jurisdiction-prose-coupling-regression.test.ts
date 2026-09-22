/**
 * Jurisdiction-Clarification Prose-Coupling Regression (Production UAT
 * Diagnostic, 2026-09-21). TEST-ONLY milestone -- adds regression coverage
 * for a confirmed production defect; does NOT implement a fix. See the
 * diagnostic session's own final report for the full background. Summary:
 *
 *   A production UAT for the Taiwan AI-Assisted Copyrightability claim
 *   (TW-COPY-1) failed in a GENERIC jurisdiction-acquisition seam, not a
 *   Taiwan-specific one. Turn 1's assistant question was organically worded
 *   ("When you think about this copyright question, should I be evaluating
 *   it under Taiwan's law specifically, or are there other countries whose
 *   laws might also matter here...") -- semantically a jurisdiction
 *   clarification, but NOT byte-identical to either fixed catalog constant
 *   (JURISDICTION_CLARIFICATION_QUESTION / _RETRY_QUESTION,
 *   jurisdiction-clarification.ts). run-turn.ts's own arming logic for
 *   `BoundaryState.jurisdiction_clarification_pending_answer` (the flag
 *   that tells the NEXT turn "the user is now answering a pending
 *   jurisdiction question") is an EXACT STRING EQUALITY check against those
 *   two constants (run-turn.ts, ~lines 1225-1227):
 *
 *     outcome.message === JURISDICTION_CLARIFICATION_QUESTION ||
 *     outcome.message === JURISDICTION_CLARIFICATION_RETRY_QUESTION
 *
 *   Because the organic wording didn't match, the flag was never armed, so
 *   turn 2's RawUserTurn.answering_jurisdiction_question was false, so
 *   anthropic-extractor.ts's buildUserMessageContent() passed the user's
 *   bare reply ("Taiwan specifically.") to the extractor with ZERO context,
 *   instead of prepending the context line it adds when the flag is true.
 *
 *   The defect class is generic: semantic "the user is now answering a
 *   pending jurisdiction question" state must not depend on exact rendered
 *   prose equality. Reproduced below using the existing COPY-001/002/003
 *   (topic 'copyrightability', jurisdiction: United States) fixture claims
 *   -- no Taiwan-specific claim, orchestration, or language inference is
 *   used or required anywhere in this file.
 *
 * Existing coverage inspected before writing this file (cited, not
 * duplicated):
 *   - run-turn-jurisdiction-clarification.test.ts: deterministic eligibility
 *     -> deterministic candidate -> deterministic outcome, for BOTH fixed
 *     catalog constants. Never exercises non-catalog wording.
 *   - run-turn-second-jurisdiction-ux.test.ts (J1 context threading suite):
 *     proves the SAME arming logic exercised here, but only ever drives it
 *     with the deterministic catalog proposal (whose `question_text` is,
 *     by construction, always exactly one of the two fixed constants --
 *     see jurisdiction-clarification.ts's buildJurisdictionClarificationProposal/
 *     buildJurisdictionClarificationRetryProposal). It therefore proves the
 *     arming logic works correctly for canonical wording, but never proves
 *     -- or disproves -- what happens for organically-worded-but-
 *     semantically-identical wording. That untested gap is exactly this
 *     file's subject. Its own header (lines 11-17) explicitly disclaims
 *     proving real extractor behavior on bare replies -- unrelated to (and
 *     not weakened by) this file, which stays entirely in mock-stack
 *     territory the same way.
 *   - assessment-jurisdiction-mentions.test.ts: injects
 *     assessment_jurisdiction_mention candidates directly; does not exercise
 *     run-turn.ts's question-arming seam at all.
 *   - anthropic-extractor-context.test.ts: unit-tests buildUserMessageContent()
 *     in isolation given a hand-built RawUserTurn (both
 *     answering_jurisdiction_question: true and false are already covered
 *     there, correctly). That file proves the pure function is correct
 *     GIVEN a flag value. It does NOT prove run-turn.ts computes the RIGHT
 *     flag value in the first place -- this file closes exactly that gap by
 *     feeding a REAL RawUserTurn, captured from a REAL run-turn.ts
 *     orchestration, into that SAME real buildUserMessageContent() function.
 *
 * What this file proves: given a genuine, real jurisdiction-semantic
 * question -- reached through the real eligibility/candidate/Constraint
 * A/Constraint B/boundary pipeline, using a real confirmed goal and real
 * governed claims -- whose delivered prose is NOT byte-identical to the two
 * fixed catalog constants, run-turn.ts's real orchestration (a) fails to
 * arm `jurisdiction_clarification_pending_answer`, and (b) as a direct,
 * real-code consequence, constructs a RawUserTurn for the next turn that,
 * when passed through the real buildUserMessageContent(), produces content
 * with NO jurisdiction-context line at all -- byte-identical to the user's
 * bare reply.
 *
 * What this file explicitly does NOT prove: whether the real Anthropic
 * extractor could or couldn't still recover a valid jurisdiction candidate
 * from the bare reply with zero context. That is a live-model-behavior
 * question, out of scope here, and unconfirmed either way -- same
 * discipline and same disclaimer as run-turn-second-jurisdiction-ux.test.ts's
 * own header.
 *
 * Reproduction technique: the real deterministic jurisdiction candidate
 * (jurisdiction-clarification.ts) always builds its proposal with
 * question_text set to exactly one of the two fixed constants -- by
 * construction, it can never itself produce "organic" wording. To reach an
 * organically-worded jurisdiction-semantic question through REAL code
 * (never reimplementing run-turn.ts's own logic), this file's regression
 * test configures Constraint A (the `decider`) to reject ONLY the
 * deterministic jurisdiction_clarification candidate specifically, which
 * -- per run-turn.ts's own documented Model 4 bounded-search design (see
 * that module's header and the attempt2 comment at ~line 1090, "attempt2
 * is always the ordinary generator") -- causes the REAL attempt2 fallback
 * to call the ordinary candidate-question generator for a genuine second
 * attempt, through the exact same tryCandidate() / validateCandidateReference()
 * / Constraint A / evaluateBoundary() pipeline every real candidate goes
 * through, never bypassed or reimplemented here. The mock generator is
 * configured to return a candidate that is structurally a jurisdiction
 * follow-up (question_kind: 'follow_up_on_signal', target_signal_id:
 * PROJECT_FACT_SIGNAL_IDS.jurisdiction -- the same structural shape
 * run-turn-second-jurisdiction-ux.test.ts's own J2 suite already uses for
 * an "organic candidate...targets project:jurisdiction"), with question_text
 * set to wording modeled directly on the real production turn-1 message.
 * This is a reproduction vehicle only: it makes no claim about WHY
 * Constraint A rejected the deterministic candidate in the real production
 * incident (that reason was not part of the diagnostic's confirmed ground
 * truth and is not re-derived here) -- only that Constraint A rejecting a
 * proposal, and the ordinary generator organically producing a
 * jurisdiction-semantic question instead, is itself a real, unremarkable,
 * already-supported code path.
 */

import { runTurn, type RunTurnDeps } from '@/lib/crc-engine/run-turn'
import { createInMemorySessionStore } from '@/lib/crc-engine/in-memory-session-store'
import { constantExtractor } from '@/lib/interview-engine/mock-extractor'
import { constantCandidateQuestionGenerator } from '@/lib/interview-engine/mock-candidate-question'
import { constantConstraintADecider } from '@/lib/interview-engine/mock-decision'
import { buildUserMessageContent } from '@/lib/interview-engine/anthropic-extractor'
import {
  JURISDICTION_CLARIFICATION_QUESTION,
  JURISDICTION_CLARIFICATION_RETRY_QUESTION,
} from '@/lib/crc-engine/jurisdiction-clarification'
import { MATRIX_FIXTURE } from '@/lib/retrieval-engine/matrix-fixture'
import { TOPIC_CLAIMS_FIXTURE } from '@/lib/retrieval-engine/topic-claims-fixture'
import { TOPIC_RELATIONSHIPS_FIXTURE } from '@/lib/retrieval-engine/topic-relationships-fixture'
import type { CandidateObservation, RawUserTurn } from '@/lib/interview-engine/extraction'
import { PROJECT_FACT_SIGNAL_IDS, type CandidateQuestionProposal } from '@/lib/interview-engine/candidate-question'
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
  return { proposal_id: 'p-tool', turn: 1, raw_text: 'Kling AI', kind: 'tool_mention', raw_tool_name: 'Kling AI', ...overrides }
}

// Same discipline as run-turn-second-jurisdiction-ux.test.ts's own
// intendedUseCandidate() (see that file's comment) -- without it, Gate 1
// concerns aside, this keeps the two suites' turn-1 setup directly
// comparable.
function intendedUseCandidate(overrides: Partial<CandidateObservation> = {}): CandidateObservation {
  return { proposal_id: 'p-use', turn: 1, raw_text: 'for a client', kind: 'project_fact', raw_fact_field: 'intended_use', fact_confidence_hint: 'confirmed', fact_value_hint: 'for a client', ...overrides }
}

// 'copyrightability' (not 'copyright_ownership') -- matches this file's own
// task scope ("explicit copyrightability UserGoal") and directly matches
// CLAIM-COPY-001/002/003-v1's own `topic: 'copyrightability'` in
// TOPIC_CLAIMS_FIXTURE (each: lifecycle 'Adopted', crc_eligible 'Yes',
// superseded_by null, applicability_requirements requiring 'jurisdiction')
// -- the real governed claim set that makes jurisdiction eligibility
// genuinely true for this goal, not a synthetic/reimplemented condition.
function copyrightabilityGoalCandidate(overrides: Partial<CandidateObservation> = {}): CandidateObservation {
  return {
    proposal_id: 'p-goal',
    turn: 1,
    raw_text: 'Do I own the copyright to this AI-generated output?',
    kind: 'user_goal',
    goal_confidence_hint: 'confirmed',
    goal_category_hint: 'copyrightability',
    goal_scope_hint: 'informational',
    ...overrides,
  }
}

async function loadState(store: SessionStore, token: string): Promise<CRCSessionState> {
  return (await store.load(token)) as CRCSessionState
}

// Modeled directly on the real production turn-1 message (diagnostic
// background item #3) -- deliberately NOT byte-identical to either fixed
// catalog constant. This is the crux of the reproduction: it is
// semantically a jurisdiction clarification (asks the user to name a
// jurisdiction for the assessment), but prose-different.
const ORGANIC_JURISDICTION_WORDING =
  "When you think about this copyright question, should I be evaluating it under Taiwan's law specifically, or are there other countries whose laws might also matter here (for example, where the AI tools are based or where the video might be used)?"

describe('Jurisdiction-clarification prose-coupling regression (Production UAT Diagnostic, 2026-09-21)', () => {
  test('CONTROL (passes today): canonical deterministic wording arms jurisdiction_clarification_pending_answer and threads a real context line into the real extractor input', async () => {
    const store = createInMemorySessionStore()

    const turn1 = await runTurn(
      { token: 'control-1', turnNumber: 1, userText: 'I made an AI-generated video using Kling AI. Do I own the copyright?' },
      deps({ extractor: constantExtractor([toolCandidate(), copyrightabilityGoalCandidate(), intendedUseCandidate()]) }, store),
    )
    expect(turn1.kind).toBe('question')
    if (turn1.kind === 'question') expect(turn1.message).toBe(JURISDICTION_CLARIFICATION_QUESTION)

    const stateAfterTurn1 = await loadState(store, 'control-1')
    expect(stateAfterTurn1.boundary_state.jurisdiction_clarification_pending_answer).toBe(true)

    let capturedTurn2: RawUserTurn | null = null
    const capturingExtractor = async (turn: RawUserTurn) => {
      capturedTurn2 = turn
      return []
    }
    await runTurn({ token: 'control-1', turnNumber: 2, userText: 'Taiwan specifically.' }, deps({ extractor: capturingExtractor }, store))

    expect(capturedTurn2).not.toBeNull()
    expect(capturedTurn2!.answering_jurisdiction_question).toBe(true)

    // Real buildUserMessageContent(), same function anthropic-extractor.ts
    // actually calls before sending anything to the model -- proves the
    // full seam end to end for the canonical-wording case.
    const content = buildUserMessageContent(capturedTurn2!)
    expect(content).toContain('directly asked the user which jurisdiction(s) CRC should consider for this assessment')
    expect(content).toContain('Taiwan specifically.')
  })

  test('REGRESSION (fails against current, unfixed production code): organically-worded-but-semantically-identical jurisdiction question fails to arm jurisdiction_clarification_pending_answer, so the real next-turn extractor context line is silently dropped', async () => {
    const store = createInMemorySessionStore()

    // Constraint A: reject ONLY the deterministic jurisdiction_clarification
    // candidate, so the real attempt2 fallback (ordinary generator) gets a
    // genuine turn -- see this file's header for why this is a legitimate,
    // real code path and not a reimplementation of run-turn.ts's own logic.
    const decider: ConstraintADecider = async (input: ConstraintAInput): Promise<ConstraintADecision> =>
      input.candidate.question_kind === 'jurisdiction_clarification'
        ? { should_ask: false, reason_code: 'NO_MATERIAL_IMPROVEMENT', rationale: 'test: force the real attempt2 (ordinary generator) fallback path' }
        : { should_ask: true, reason_code: 'MATERIALLY_IMPROVES_UNDERSTANDING', rationale: 'x' }

    const organicProposal: CandidateQuestionProposal = {
      question_text: ORGANIC_JURISDICTION_WORDING,
      question_kind: 'follow_up_on_signal',
      target_signal_id: PROJECT_FACT_SIGNAL_IDS.jurisdiction,
      phase: 1,
    }

    const turn1 = await runTurn(
      { token: 'regress-1', turnNumber: 1, userText: 'I made an AI-generated video using Kling AI. Do I own the copyright?' },
      deps(
        {
          extractor: constantExtractor([toolCandidate(), copyrightabilityGoalCandidate(), intendedUseCandidate()]),
          generator: constantCandidateQuestionGenerator(organicProposal),
          decider,
        },
        store,
      ),
    )

    // Reproduction-validity check: confirm a real jurisdiction-semantic
    // question WAS actually asked this turn, with wording that genuinely
    // differs from both fixed catalog constants -- the entire premise of
    // the defect. If this fails, the reproduction itself is broken, not the
    // production seam below.
    expect(turn1.kind).toBe('question')
    if (turn1.kind === 'question') {
      expect(turn1.message).toBe(ORGANIC_JURISDICTION_WORDING)
      expect(turn1.message).not.toBe(JURISDICTION_CLARIFICATION_QUESTION)
      expect(turn1.message).not.toBe(JURISDICTION_CLARIFICATION_RETRY_QUESTION)
    }

    // THE DEFECT -- proven directly against the real persisted BoundaryState
    // field run-turn.ts's own exact-string check (~lines 1225-1227) sets.
    // EXPECTED (correct/desired): true, exactly like the CONTROL test above
    // (a genuine jurisdiction clarification was just asked and left
    // unanswered). ACTUAL (current production, this exact SHA): false,
    // because the arming check compares outcome.message by exact string
    // equality against two fixed constants and this wording is not either
    // of them. This assertion is written to the desired value and therefore
    // FAILS against current, unfixed code -- that failure IS the regression
    // proof, not a mistake in this test.
    const stateAfterTurn1 = await loadState(store, 'regress-1')
    expect(stateAfterTurn1.boundary_state.jurisdiction_clarification_pending_answer).toBe(true)

    // Downstream consequence, chained through REAL code on both sides of the
    // seam, nothing reimplemented: capture the exact RawUserTurn run-turn.ts
    // really constructs for turn 2 (same instrumented-extractor technique as
    // run-turn-second-jurisdiction-ux.test.ts's own J1 suite), then feed
    // that real captured object into the real, independently-unit-tested
    // buildUserMessageContent() (anthropic-extractor.ts) to see the exact
    // content the live extractor would actually receive.
    let capturedTurn2: RawUserTurn | null = null
    const capturingExtractor = async (turn: RawUserTurn) => {
      capturedTurn2 = turn
      return []
    }
    await runTurn({ token: 'regress-1', turnNumber: 2, userText: 'Taiwan specifically.' }, deps({ extractor: capturingExtractor }, store))

    expect(capturedTurn2).not.toBeNull()
    // Same discipline as above: desired value asserted, fails pre-fix
    // (actual: false).
    expect(capturedTurn2!.answering_jurisdiction_question).toBe(true)

    const extractorInputContent = buildUserMessageContent(capturedTurn2!)
    // Desired: a jurisdiction-context line should be present, exactly as it
    // correctly is in the CONTROL test above for canonical wording. Fails
    // pre-fix: actual content is byte-identical to the user's bare reply
    // ("Taiwan specifically."), because answering_jurisdiction_question
    // ends up false, so buildUserMessageContent() (already independently
    // proven correct given a flag value, see anthropic-extractor-context.test.ts)
    // adds no context line at all -- this is precisely the "extractor
    // receives zero context" failure mode from the real production incident.
    expect(extractorInputContent).toContain('directly asked the user which jurisdiction(s) CRC should consider for this assessment')
  })
})
