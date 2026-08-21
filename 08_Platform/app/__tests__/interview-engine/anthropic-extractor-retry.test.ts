/**
 * Extraction robustness follow-up (CRC live incident, 2026-08-16, confirmed
 * unrelated to the same-day Living Knowledge deployment). Tests
 * callWithOneRecoveryRetry / isStructuredOutputParseFailure in isolation,
 * via an injected fake `callOnce` -- no live Anthropic client, no network
 * call, no jest.mock of the SDK -- same "test the pure parts, keep the
 * live-model boundary itself thin and untested" discipline
 * anthropic-extractor-context.test.ts already established for this file.
 */

import { callWithOneRecoveryRetry, isStructuredOutputParseFailure, toCandidateObservation } from '@/lib/interview-engine/anthropic-extractor'

const PARSE_FAILURE = new Error(
  'Failed to parse structured output: Error: Failed to parse structured output: Unterminated string in JSON at position 2728 (line 1 column 2729)',
)
const RATE_LIMIT_FAILURE = Object.assign(new Error('429 rate limited'), { status: 429 })
const AUTH_FAILURE = Object.assign(new Error('401 invalid x-api-key'), { status: 401 })

describe('isStructuredOutputParseFailure', () => {
  test('matches the real production error message (both SDK wrapping layers)', () => {
    expect(isStructuredOutputParseFailure(PARSE_FAILURE)).toBe(true)
  })

  test('does not match a rate-limit error', () => {
    expect(isStructuredOutputParseFailure(RATE_LIMIT_FAILURE)).toBe(false)
  })

  test('does not match an auth error', () => {
    expect(isStructuredOutputParseFailure(AUTH_FAILURE)).toBe(false)
  })

  test('does not match a non-Error thrown value', () => {
    expect(isStructuredOutputParseFailure('a string, not an Error')).toBe(false)
  })
})

describe('callWithOneRecoveryRetry', () => {
  test('1: normal extraction -- first call succeeds -> exactly one call, base max_tokens used', async () => {
    const callOnce = jest.fn().mockResolvedValue({ result: 'ok' })
    const result = await callWithOneRecoveryRetry(callOnce, 3072, 4096)
    expect(result).toEqual({ result: 'ok' })
    expect(callOnce).toHaveBeenCalledTimes(1)
    expect(callOnce).toHaveBeenCalledWith(3072)
  })

  test('2: dense extraction succeeds within the limit -- indistinguishable from (1) at this layer: still exactly one call', async () => {
    // "Dense but fits" and "not dense" both just mean "the first call
    // succeeds" from this generic retry helper's point of view -- the
    // content-density distinction lives entirely in what the model
    // actually returns, which this pure helper never inspects.
    const callOnce = jest.fn().mockResolvedValue({ candidates: new Array(6).fill({}) })
    await callWithOneRecoveryRetry(callOnce, 3072, 4096)
    expect(callOnce).toHaveBeenCalledTimes(1)
  })

  test('3: first response truncated, second valid -> exactly two calls (base then retry ceiling), one final parsed result, nothing else', async () => {
    const callOnce = jest.fn().mockRejectedValueOnce(PARSE_FAILURE).mockResolvedValueOnce({ result: 'recovered' })
    const result = await callWithOneRecoveryRetry(callOnce, 3072, 4096)
    expect(result).toEqual({ result: 'recovered' })
    expect(callOnce).toHaveBeenCalledTimes(2)
    expect(callOnce).toHaveBeenNthCalledWith(1, 3072)
    expect(callOnce).toHaveBeenNthCalledWith(2, 4096)
  })

  test('4: both responses malformed -> exactly two calls (the bounded max), final error carries a classifiable structured_output_truncated prefix, never a third attempt', async () => {
    const callOnce = jest.fn().mockRejectedValue(PARSE_FAILURE)
    await expect(callWithOneRecoveryRetry(callOnce, 3072, 4096)).rejects.toThrow(/^structured_output_truncated: extraction failed after 1 recovery retry -- /)
    expect(callOnce).toHaveBeenCalledTimes(2)
  })

  test('5: non-parse model error (rate limit) -> no retry attempted at all, exactly one call, original error propagates unmodified', async () => {
    const callOnce = jest.fn().mockRejectedValue(RATE_LIMIT_FAILURE)
    await expect(callWithOneRecoveryRetry(callOnce, 3072, 4096)).rejects.toBe(RATE_LIMIT_FAILURE)
    expect(callOnce).toHaveBeenCalledTimes(1)
  })

  test('5b: non-parse model error (auth) -> same as above, no inappropriate retry', async () => {
    const callOnce = jest.fn().mockRejectedValue(AUTH_FAILURE)
    await expect(callWithOneRecoveryRetry(callOnce, 3072, 4096)).rejects.toBe(AUTH_FAILURE)
    expect(callOnce).toHaveBeenCalledTimes(1)
  })

  test('a non-parse error on the SECOND (retry) attempt propagates unmodified, not re-wrapped as a truncation failure', async () => {
    const callOnce = jest.fn().mockRejectedValueOnce(PARSE_FAILURE).mockRejectedValueOnce(RATE_LIMIT_FAILURE)
    await expect(callWithOneRecoveryRetry(callOnce, 3072, 4096)).rejects.toBe(RATE_LIMIT_FAILURE)
    expect(callOnce).toHaveBeenCalledTimes(2)
  })

  test('default parameters (no explicit max_tokens args) use the module baseline/retry constants -- 3072 then 4096', async () => {
    const callOnce = jest.fn().mockRejectedValueOnce(PARSE_FAILURE).mockResolvedValueOnce({ ok: true })
    await callWithOneRecoveryRetry(callOnce)
    expect(callOnce).toHaveBeenNthCalledWith(1, 3072)
    expect(callOnce).toHaveBeenNthCalledWith(2, 4096)
  })
})

describe('item 6: dense extraction still correctly captures tool + plan_tier + two goals + project facts (data-shape regression, not retry logic)', () => {
  test('toCandidateObservation preserves every field for a realistic dense-turn candidate set (tool_mention+plan_tier, scoped_observation, two user_goals, project_fact) unchanged by this fix', () => {
    const denseParsedCandidates = [
      {
        proposal_id: 'c1',
        raw_text: 'using Kling',
        kind: 'tool_mention' as const,
        raw_tool_name: 'Kling',
        raw_provider_name: null,
        attributes: [{ key: 'plan_tier' as const, confidence: 'confirmed' as const, value: 'paid' }],
        is_correction: false,
        correction_of_raw_text: null,
        scope: null,
        workflow_stage: null,
        observation_confidence_hint: null,
        raw_fact_field: null,
        fact_confidence_hint: null,
        fact_value_hint: null,
        goal_confidence_hint: null,
        goal_category_hint: null,
        goal_scope_hint: null,
        low_confidence: false,
      },
      {
        proposal_id: 'c2',
        raw_text: 'created the video mostly by writing prompts, with some editing afterward',
        kind: 'scoped_observation' as const,
        raw_tool_name: null,
        raw_provider_name: null,
        attributes: [],
        is_correction: false,
        correction_of_raw_text: null,
        scope: 'current_project' as const,
        workflow_stage: 'T1' as const,
        observation_confidence_hint: 'confirmed' as const,
        raw_fact_field: null,
        fact_confidence_hint: null,
        fact_value_hint: null,
        goal_confidence_hint: null,
        goal_category_hint: null,
        goal_scope_hint: null,
        low_confidence: false,
      },
      {
        proposal_id: 'c3',
        raw_text: 'an AI commercial for a client',
        kind: 'project_fact' as const,
        raw_tool_name: null,
        raw_provider_name: null,
        attributes: [],
        is_correction: false,
        correction_of_raw_text: null,
        scope: null,
        workflow_stage: null,
        observation_confidence_hint: null,
        raw_fact_field: 'intended_use' as const,
        fact_confidence_hint: 'confirmed' as const,
        fact_value_hint: 'an AI commercial for a client',
        goal_confidence_hint: null,
        goal_category_hint: null,
        goal_scope_hint: null,
        low_confidence: false,
      },
      {
        proposal_id: 'c4',
        raw_text: 'Can I use the video commercially',
        kind: 'user_goal' as const,
        raw_tool_name: null,
        raw_provider_name: null,
        attributes: [],
        is_correction: false,
        correction_of_raw_text: null,
        scope: null,
        workflow_stage: null,
        observation_confidence_hint: null,
        raw_fact_field: null,
        fact_confidence_hint: null,
        fact_value_hint: null,
        goal_confidence_hint: 'confirmed' as const,
        goal_category_hint: 'commercial_use' as const,
        goal_scope_hint: 'informational' as const,
        low_confidence: false,
      },
      {
        proposal_id: 'c5',
        raw_text: 'do I own the copyright',
        kind: 'user_goal' as const,
        raw_tool_name: null,
        raw_provider_name: null,
        attributes: [],
        is_correction: false,
        correction_of_raw_text: null,
        scope: null,
        workflow_stage: null,
        observation_confidence_hint: null,
        raw_fact_field: null,
        fact_confidence_hint: null,
        fact_value_hint: null,
        goal_confidence_hint: 'confirmed' as const,
        goal_category_hint: 'copyright_ownership' as const,
        goal_scope_hint: 'informational' as const,
        low_confidence: false,
      },
    ]

    const observations = denseParsedCandidates.map((c) => toCandidateObservation(c, 1))
    expect(observations).toHaveLength(5)

    const tool = observations.find((o) => o.kind === 'tool_mention')!
    expect(tool.raw_tool_name).toBe('Kling')
    expect(tool.plan_tier_confidence_hint).toBe('confirmed')
    expect(tool.plan_tier_value_hint).toBe('paid')

    const goals = observations.filter((o) => o.kind === 'user_goal')
    expect(goals).toHaveLength(2)
    expect(goals.map((g) => g.goal_category_hint).sort()).toEqual(['commercial_use', 'copyright_ownership'])

    const projectFact = observations.find((o) => o.kind === 'project_fact')!
    expect(projectFact.raw_fact_field).toBe('intended_use')
    expect(projectFact.fact_value_hint).toBe('an AI commercial for a client')

    const scopedObservation = observations.find((o) => o.kind === 'scoped_observation')!
    expect(scopedObservation.workflow_stage).toBe('T1')
  })
})
