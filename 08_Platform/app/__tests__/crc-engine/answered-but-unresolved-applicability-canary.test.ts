/**
 * M2B.1 -- empirical CRC canary for the "Answered-but-Unresolved
 * Applicability" problem class (the original production UAT finding that
 * started the M0 -> M1 -> M2/M2A/M2A.1 -> M2B -> M2B.1 diagnostic chain).
 *
 * Deliberately NOT a hand-constructed ConsultativeAnswerPlan. Runs the REAL
 * production entry point, `runCRCConversation()`, over a real
 * `StructuredUnderstanding` -- the exact same function `run-turn.ts`,
 * `results-email-delivery.ts`, and `app/api/crc/turn/route.ts` all call --
 * through the FULL live path: retrieve() -> buildBoundedInterpretations() ->
 * buildConsultativeAnswerPlan() -> realizeUnresolvedApplicability(). No
 * shortcut, no internal function called directly except through this one
 * public orchestrator.
 *
 * Uses the REAL, CURRENTLY-LIVE `TOPIC_CLAIMS_FIXTURE` Kling claims
 * (`CLAIM-KLING-COMMERCIAL-USE-BASELINE-001-v1`, unconditional;
 * `CLAIM-KLING-COMMERCIAL-USE-MEMBER-001-v1`, gated on
 * `tool_account_status`) -- these are the CURRENT, Adopted, CRC-eligible
 * governed claims (CPR_015, 2026-09-02), not the retired `MATRIX_FIXTURE`
 * Kling row (crc_eligible: 'No' since the same date). This canary does not
 * repair or depend on any retired/stale Matrix representation -- it
 * exercises the claim that is actually live today.
 *
 * The architectural class under test, stated generically (per instruction,
 * not overfit to Kling wording): a user gives an answer that is real and
 * correctly captured, but is NOT the governed structured fact a withheld
 * claim's applicability requirement actually needs -- "user supplied
 * related information ≠ governed applicability fact established."
 */

import { runCRCConversation } from '@/lib/crc-engine/run-crc-conversation'
import { MATRIX_FIXTURE } from '@/lib/retrieval-engine/matrix-fixture'
import { TOPIC_CLAIMS_FIXTURE } from '@/lib/retrieval-engine/topic-claims-fixture'
import { TOPIC_RELATIONSHIPS_FIXTURE } from '@/lib/retrieval-engine/topic-relationships-fixture'
import type { StructuredUnderstanding, ToolMention, UserGoal } from '@/types/interview-engine'

const BASELINE_ID = 'CLAIM-KLING-COMMERCIAL-USE-BASELINE-001-v1'
const MEMBER_ID = 'CLAIM-KLING-COMMERCIAL-USE-MEMBER-001-v1'

function goal(overrides: Partial<UserGoal> & Pick<UserGoal, 'raw_text' | 'category'>): UserGoal {
  return { goal_id: 'g-1', state: 'confirmed', scope: 'informational', superseded_by: null, source_turn: 1, source_statement: overrides.raw_text, ...overrides }
}

function toolMention(overrides: Partial<ToolMention> & Pick<ToolMention, 'mention_id' | 'resolution'>): ToolMention {
  return {
    access_surface: { state: 'confirmed', value: 'the website' },
    plan_tier: { state: 'unknown' },
    account_status: { state: 'unknown' },
    confidence: 'confirmed',
    source_turn: 1,
    source_statement: 'placeholder',
    superseded_by: null,
    ...overrides,
  }
}

function emptyProjectFacts() {
  return {
    intended_use: { attestation: { state: 'confirmed' as const, value: 'a client ad' }, source_turn: 1, source_statement: 'for a client' },
    workflow_role: { attestation: { state: 'unknown' as const }, source_turn: 0, source_statement: '' },
    jurisdiction: { attestation: { state: 'unknown' as const }, source_turn: 0, source_statement: '' },
    human_contribution_description: { attestation: { state: 'unknown' as const }, source_turn: 0, source_statement: '' },
  }
}

/**
 * The exact reproduced UAT shape: user established Kling use via the
 * website, stated a commercial-use goal, and -- when asked something
 * plan-tier-shaped -- answered with their plan/subscription wording. That
 * answer populates `plan_tier` (a real, correctly-captured fact) and
 * deliberately leaves `account_status` at `{state:'unknown'}` -- the
 * SEPARATE governed fact `CLAIM-KLING-COMMERCIAL-USE-MEMBER-001-v1`'s own
 * `applicability_requirements` actually needs. No test code here performs
 * or simulates any plan_tier -> account_status mapping; the fixture simply
 * reflects that the two ToolMention fields are independent and the second
 * one was never confirmed by anything the user said.
 */
function structuredUnderstanding(): StructuredUnderstanding {
  return {
    project_facts: emptyProjectFacts(),
    tool_mentions: [
      toolMention({
        mention_id: 'tm-1',
        resolution: { kind: 'canonical', identifier: 'kling' },
        plan_tier: { state: 'confirmed', value: 'one of Kling’s paid Starter plans' },
        account_status: { state: 'unknown' },
      }),
    ],
    scoped_observations: [],
    user_goals: [goal({ raw_text: 'I’m making an AI-generated video for a client and want to know whether I can use it commercially.', category: 'commercial_use' })],
    asset_provider_mentions: [],
    assessment_jurisdiction_mentions: [],
    content_presence_mentions: [],
    current_phase: 3,
    gate_1_state: 'met',
    gate_2_state: 'stable',
    completion_reason: 'gate_1_gate_2_met',
    opt_out_scope: null,
  }
}

/** Correction variant: account_status confirmed Member Account (requirement met). */
function withMemberAccountConfirmed(su: StructuredUnderstanding): StructuredUnderstanding {
  return { ...su, tool_mentions: [{ ...su.tool_mentions[0], account_status: { state: 'confirmed', value: 'Member Account' } }] }
}

/** Correction variant: account_status confirmed Regular Account (requirement conclusively not_met). */
function withRegularAccountConfirmed(su: StructuredUnderstanding): StructuredUnderstanding {
  return { ...su, tool_mentions: [{ ...su.tool_mentions[0], account_status: { state: 'confirmed', value: 'Regular Account' } }] }
}

function runPipeline(su: StructuredUnderstanding) {
  return runCRCConversation(su, MATRIX_FIXTURE, TOPIC_CLAIMS_FIXTURE, TOPIC_RELATIONSHIPS_FIXTURE)
}

describe('Answered-but-Unresolved Applicability -- empirical canary (real pipeline, real live governed claims)', () => {
  test('1: explicit goal remains explicit -- exactly one goal_interpretation/explicit_section for commercial_use', () => {
    const result = runPipeline(structuredUnderstanding())
    expect(result.output.goal_interpretations).toHaveLength(1)
    expect(result.plan.explicit_sections).toHaveLength(1)
    expect(result.plan.explicit_sections[0].category).toBe('commercial_use')
    expect(result.plan.discovered_context).toEqual([]) // no discovered-relevance widening
  })

  test('2: the relevant governed claim (baseline) is retrieved and rendered', () => {
    const result = runPipeline(structuredUnderstanding())
    expect(result.trace.retrieval_results.map((r) => r.claim_id)).toContain(BASELINE_ID)
    expect(result.output.understood_summary).toContain('kling')
  })

  test('3/4: the required fact is tool_account_status, and it remains unresolved after the plan-tier-style answer', () => {
    const result = runPipeline(structuredUnderstanding())
    const diag = result.diagnostics.retrieval.find((d) => d.reason === 'applicability_unmet' && d.unmet_applicability?.some((u) => u.claim_id === MEMBER_ID))
    expect(diag).toBeDefined()
    expect(diag?.unmet_applicability).toEqual([
      { claim_id: MEMBER_ID, requirement: { fact: 'tool_account_status', tool: 'kling', operator: 'equals', value: 'Member Account' }, status: 'unresolved' },
    ])
    // The Member claim never entered results -- withheld, not guessed applicable.
    expect(result.trace.retrieval_results.map((r) => r.claim_id)).not.toContain(MEMBER_ID)
  })

  test('5: no paid/plan-tier -> Member Account mapping occurred -- plan_tier stays a distinct, separately-attested field', () => {
    const su = structuredUnderstanding()
    expect(su.tool_mentions[0].plan_tier.state).toBe('confirmed')
    expect(su.tool_mentions[0].account_status.state).toBe('unknown') // untouched by the plan_tier answer
    const result = runPipeline(su)
    // The rendered summary may legitimately mention the tool, but never
    // asserts or implies a Member Account conclusion from the plan answer.
    expect(JSON.stringify(result.output)).not.toMatch(/member account/i)
  })

  test('6: BI retains its existing generic unresolved-applicability hedge, unchanged', () => {
    const result = runPipeline(structuredUnderstanding())
    const interp = result.bounded_interpretations[0]
    expect(interp.status).toBe('directly_relevant')
    expect(interp.unresolved_relevant_claims).toEqual([{ claim_id: MEMBER_ID }])
    expect(interp.summary_blocks[interp.summary_blocks.length - 1]).toBe(
      "There's additional governed guidance relevant to this topic that hasn't been confirmed as applicable based on what's been described here — it may or may not apply, and CRC can't determine that from this conversation.",
    )
  })

  test('7/8/9/10: exactly one Composition note, naming "account or membership status", with none of the forbidden strengthening language and no raw enum', () => {
    const result = runPipeline(structuredUnderstanding())
    expect(result.consultative_notes).toHaveLength(1)
    const note = result.consultative_notes[0]
    expect(note.text).toBe("Specifically, this depends on your account or membership status, which hasn't been confirmed in this conversation.")
    expect(note.text).toContain('account or membership status')
    expect(note.text).not.toMatch(/member account|paid|starter/i)
    expect(note.text).not.toMatch(/commercial clearance|material|significant|\brisk\b|blocks?|prevents|defeats|clears|verif|require|document|principal|severity|priority/i)
    expect(note.text).not.toMatch(/commercial assurance/i)
    expect(note.text).not.toContain('tool_account_status')
    expect(note.text).not.toContain('kling') // no provider name in rendered text either
  })

  test('11: the transport note carries only {goal_index, text} -- the exact shape that would reach the API/browser/email', () => {
    const result = runPipeline(structuredUnderstanding())
    expect(Object.keys(result.consultative_notes[0]).sort()).toEqual(['goal_index', 'text'])
    expect(result.consultative_notes[0].goal_index).toBe(0)
    // Index parity with the goal it belongs to, per the realization module's
    // own documented association mechanism.
    expect(result.output.goal_interpretations[0].goal_text).toBe(result.plan.explicit_sections[0].goal_text)
  })

  test('12: correction to met (Member Account confirmed) removes the note', () => {
    const result = runPipeline(withMemberAccountConfirmed(structuredUnderstanding()))
    expect(result.consultative_notes).toEqual([])
    expect(result.trace.retrieval_results.map((r) => r.claim_id).sort()).toEqual([BASELINE_ID, MEMBER_ID])
    expect(result.bounded_interpretations[0].unresolved_relevant_claims).toEqual([])
  })

  test('13: correction to not_met (Regular Account confirmed) removes the note -- and is never described as "missing information"', () => {
    const result = runPipeline(withRegularAccountConfirmed(structuredUnderstanding()))
    expect(result.consultative_notes).toEqual([])
    expect(result.trace.retrieval_results.map((r) => r.claim_id)).toEqual([BASELINE_ID])
    expect(result.bounded_interpretations[0].unresolved_relevant_claims).toEqual([])
  })

  test('14: correction back to unresolved restores the identical note, deterministically', () => {
    const unresolvedSU = structuredUnderstanding()
    const first = runPipeline(unresolvedSU).consultative_notes
    const afterMemberCorrection = runPipeline(withMemberAccountConfirmed(unresolvedSU)).consultative_notes
    const backToUnresolved = runPipeline(unresolvedSU).consultative_notes
    expect(first).toHaveLength(1)
    expect(afterMemberCorrection).toEqual([])
    expect(backToUnresolved).toEqual(first)
  })
})
