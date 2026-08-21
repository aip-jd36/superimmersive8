/**
 * CRC 503 Reliability Implementation (2026-08-20), authorized follow-up to
 * the CRC 503 Reliability Diagnostic of the same date. Tests
 * callWithOneRecoveryRetry / classifyMissingParsedOutput /
 * isStructuredOutputParseFailure in isolation, via an injected fake
 * `callOnce` -- no live Anthropic client, no network call, no jest.mock of
 * the SDK. Same "test the pure parts, keep the live-model boundary itself
 * thin and untested" discipline anthropic-extractor-retry.test.ts already
 * established for the sibling adapter's own retry helper -- this is the
 * correct unit-testing boundary here too, since both anthropic-decision.ts
 * and anthropic-candidate-question.ts delegate their entire retry
 * decision to this exact function, tagged with their own adapter name.
 *
 * Test IDs below (A-L) map directly to the reliability implementation
 * task's own required test matrix.
 */

import {
  callWithOneRecoveryRetry,
  classifyMissingParsedOutput,
  isStructuredOutputParseFailure,
  defaultSuccessTelemetrySink,
  type MinimalParsedAnthropicResponse,
  type StructuredOutputTelemetryEvent,
  type StructuredOutputSuccessTelemetryEvent,
} from '@/lib/interview-engine/anthropic-structured-output-retry'

function response(overrides: Partial<MinimalParsedAnthropicResponse> = {}): MinimalParsedAnthropicResponse {
  return {
    id: 'msg_test',
    stop_reason: 'end_turn',
    content: [
      { type: 'thinking' },
      { type: 'text' },
    ],
    usage: { input_tokens: 100, output_tokens: 200, output_tokens_details: { thinking_tokens: 50 } },
    parsed_output: { should_ask: true },
    ...overrides,
  }
}

const SUCCESS = response()
const MISSING_MAX_TOKENS = response({ stop_reason: 'max_tokens', content: [{ type: 'thinking' }], parsed_output: null })
const MISSING_OTHER = response({ stop_reason: 'refusal', content: [], parsed_output: null })

const SDK_PARSE_FAILURE = new Error("Failed to parse structured output: Unterminated string in JSON at position 2728 (line 1 column 2729)")
const RATE_LIMIT_FAILURE = Object.assign(new Error('429 rate limited'), { status: 429 })
const AUTH_FAILURE = Object.assign(new Error('401 invalid x-api-key'), { status: 401 })

describe('classifyMissingParsedOutput', () => {
  test('parsed_output present -> null (success, no classification)', () => {
    expect(classifyMissingParsedOutput(SUCCESS)).toBeNull()
  })

  test('parsed_output null, no text block, stop_reason max_tokens -> missing_output_max_tokens', () => {
    expect(classifyMissingParsedOutput(MISSING_MAX_TOKENS)).toBe('missing_output_max_tokens')
  })

  test('parsed_output null, no text block, other stop_reason -> missing_output_other', () => {
    expect(classifyMissingParsedOutput(MISSING_OTHER)).toBe('missing_output_other')
  })

  test('parsed_output null but a text block IS present -> classified conservatively as missing_output_other, not assumed unreachable', () => {
    const weird = response({ content: [{ type: 'text' }], parsed_output: null, stop_reason: 'end_turn' })
    expect(classifyMissingParsedOutput(weird)).toBe('missing_output_other')
  })
})

describe('isStructuredOutputParseFailure', () => {
  test('matches the SDK\'s own structured-output parse error message', () => {
    expect(isStructuredOutputParseFailure(SDK_PARSE_FAILURE)).toBe(true)
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
  // A. First decider attempt valid -> no retry -> exactly one Anthropic call.
  test('A: decider, first attempt valid -> exactly one call, base max_tokens used, no telemetry emitted', async () => {
    const callOnce = jest.fn().mockResolvedValue(SUCCESS)
    const telemetrySink = jest.fn()
    const result = await callWithOneRecoveryRetry('decider', callOnce, 1024, 2048, telemetrySink)
    expect(result).toBe(SUCCESS)
    expect(callOnce).toHaveBeenCalledTimes(1)
    expect(callOnce).toHaveBeenNthCalledWith(1, 1024)
    expect(telemetrySink).not.toHaveBeenCalled()
  })

  // B. First decider response: parsed_output null, no text block, stop_reason
  // max_tokens. Second valid. -> exactly one recovery retry -> success.
  test('B: decider, first missing (max_tokens), second valid -> exactly two calls, recovery max_tokens used, one telemetry event (attempt 1, retrying:true)', async () => {
    const callOnce = jest.fn().mockResolvedValueOnce(MISSING_MAX_TOKENS).mockResolvedValueOnce(SUCCESS)
    const telemetrySink = jest.fn()
    const result = await callWithOneRecoveryRetry('decider', callOnce, 1024, 2048, telemetrySink)
    expect(result).toBe(SUCCESS)
    expect(callOnce).toHaveBeenCalledTimes(2)
    expect(callOnce).toHaveBeenNthCalledWith(1, 1024)
    expect(callOnce).toHaveBeenNthCalledWith(2, 2048)
    expect(telemetrySink).toHaveBeenCalledTimes(1)
    const event: StructuredOutputTelemetryEvent = telemetrySink.mock.calls[0][0]
    expect(event.adapter).toBe('decider')
    expect(event.attempt).toBe(1)
    expect(event.failure_class).toBe('missing_output_max_tokens')
    expect(event.retrying).toBe(true)
  })

  // C. First and second decider responses both missing parsed_output. ->
  // exactly two calls -> controlled failure -> no third attempt.
  test('C: decider, both attempts missing -> exactly two calls, controlled failure with accurate wording, two telemetry events, no third attempt', async () => {
    const callOnce = jest.fn().mockResolvedValueOnce(MISSING_MAX_TOKENS).mockResolvedValueOnce(MISSING_OTHER)
    const telemetrySink = jest.fn()
    await expect(callWithOneRecoveryRetry('decider', callOnce, 1024, 2048, telemetrySink)).rejects.toThrow(
      /^anthropic_structured_output_missing: decider did not produce a usable structured-output response after 1 recovery retry/,
    )
    expect(callOnce).toHaveBeenCalledTimes(2)
    expect(telemetrySink).toHaveBeenCalledTimes(2)
    expect(telemetrySink.mock.calls[1][0].attempt).toBe(2)
    expect(telemetrySink.mock.calls[1][0].retrying).toBe(false)
  })

  test('C2: final failure message never says "schema validation may have failed" (task section 10)', async () => {
    const callOnce = jest.fn().mockResolvedValue(MISSING_MAX_TOKENS)
    await expect(callWithOneRecoveryRetry('decider', callOnce, 1024, 2048)).rejects.not.toThrow(/schema validation may have failed/)
  })

  // D. Candidate generator first missing parsed_output, second valid. ->
  // succeeds on one recovery retry.
  test('D: candidate_generator, first missing, second valid -> exactly two calls, success', async () => {
    const callOnce = jest.fn().mockResolvedValueOnce(MISSING_OTHER).mockResolvedValueOnce(SUCCESS)
    const result = await callWithOneRecoveryRetry('candidate_generator', callOnce, 1024, 2048)
    expect(result).toBe(SUCCESS)
    expect(callOnce).toHaveBeenCalledTimes(2)
  })

  // E. Candidate generator both attempts fail. -> controlled failure after
  // exactly two calls.
  test('E: candidate_generator, both attempts missing -> exactly two calls, controlled failure, adapter name in telemetry and error', async () => {
    const callOnce = jest.fn().mockResolvedValue(MISSING_OTHER)
    const telemetrySink = jest.fn()
    await expect(callWithOneRecoveryRetry('candidate_generator', callOnce, 1024, 2048, telemetrySink)).rejects.toThrow(
      /^anthropic_structured_output_missing: candidate_generator did not produce a usable structured-output response/,
    )
    expect(callOnce).toHaveBeenCalledTimes(2)
    expect(telemetrySink.mock.calls[0][0].adapter).toBe('candidate_generator')
    expect(telemetrySink.mock.calls[1][0].adapter).toBe('candidate_generator')
  })

  // F. Valid first candidate-generator response. -> no retry.
  test('F: candidate_generator, first attempt valid -> exactly one call, no telemetry', async () => {
    const callOnce = jest.fn().mockResolvedValue(SUCCESS)
    const telemetrySink = jest.fn()
    const result = await callWithOneRecoveryRetry('candidate_generator', callOnce, 1024, 2048, telemetrySink)
    expect(result).toBe(SUCCESS)
    expect(callOnce).toHaveBeenCalledTimes(1)
    expect(telemetrySink).not.toHaveBeenCalled()
  })

  // G. SDK structured-output parse failure on first attempt, valid second
  // (classifier intentionally supports this). -> one retry.
  test('G: SDK-thrown structured-output parse failure on first attempt, valid second -> exactly two calls, one recovery retry, success', async () => {
    const callOnce = jest.fn().mockRejectedValueOnce(SDK_PARSE_FAILURE).mockResolvedValueOnce(SUCCESS)
    const telemetrySink = jest.fn()
    const result = await callWithOneRecoveryRetry('decider', callOnce, 1024, 2048, telemetrySink)
    expect(result).toBe(SUCCESS)
    expect(callOnce).toHaveBeenCalledTimes(2)
    expect(telemetrySink.mock.calls[0][0].failure_class).toBe('sdk_parse_failure')
    expect(telemetrySink.mock.calls[0][0].anthropic_response_id).toBeNull() // no response object available on a thrown SDK error
  })

  test('G2: SDK-thrown structured-output parse failure on BOTH attempts -> controlled failure after exactly two calls', async () => {
    const callOnce = jest.fn().mockRejectedValue(SDK_PARSE_FAILURE)
    await expect(callWithOneRecoveryRetry('candidate_generator', callOnce, 1024, 2048)).rejects.toThrow(/anthropic_structured_output_missing/)
    expect(callOnce).toHaveBeenCalledTimes(2)
  })

  // H. Clearly non-retryable local/application error. -> no custom retry.
  test('H: non-retryable error (rate limit) on first attempt -> no retry, exactly one call, original error propagates unmodified', async () => {
    const callOnce = jest.fn().mockRejectedValue(RATE_LIMIT_FAILURE)
    await expect(callWithOneRecoveryRetry('decider', callOnce, 1024, 2048)).rejects.toBe(RATE_LIMIT_FAILURE)
    expect(callOnce).toHaveBeenCalledTimes(1)
  })

  test('H2: non-retryable error (auth) on first attempt -> same, no inappropriate retry', async () => {
    const callOnce = jest.fn().mockRejectedValue(AUTH_FAILURE)
    await expect(callWithOneRecoveryRetry('candidate_generator', callOnce, 1024, 2048)).rejects.toBe(AUTH_FAILURE)
    expect(callOnce).toHaveBeenCalledTimes(1)
  })

  test('H3: non-retryable error on the SECOND (retry) attempt propagates unmodified, not re-wrapped', async () => {
    const callOnce = jest.fn().mockResolvedValueOnce(MISSING_MAX_TOKENS).mockRejectedValueOnce(RATE_LIMIT_FAILURE)
    await expect(callWithOneRecoveryRetry('decider', callOnce, 1024, 2048)).rejects.toBe(RATE_LIMIT_FAILURE)
    expect(callOnce).toHaveBeenCalledTimes(2)
  })

  // K. Retry attempt uses increased max_tokens if that is the implemented mitigation.
  test('K: retry attempt is called with the higher retryMaxTokens ceiling, base attempt unchanged, for both adapters', async () => {
    const deciderCallOnce = jest.fn().mockResolvedValueOnce(MISSING_MAX_TOKENS).mockResolvedValueOnce(SUCCESS)
    await callWithOneRecoveryRetry('decider', deciderCallOnce, 1024, 2048)
    expect(deciderCallOnce).toHaveBeenNthCalledWith(1, 1024)
    expect(deciderCallOnce).toHaveBeenNthCalledWith(2, 2048)

    const candidateCallOnce = jest.fn().mockResolvedValueOnce(MISSING_MAX_TOKENS).mockResolvedValueOnce(SUCCESS)
    await callWithOneRecoveryRetry('candidate_generator', candidateCallOnce, 1024, 2048)
    expect(candidateCallOnce).toHaveBeenNthCalledWith(1, 1024)
    expect(candidateCallOnce).toHaveBeenNthCalledWith(2, 2048)
  })

  test('never makes a third call under any combination of failures', async () => {
    const callOnce = jest.fn().mockResolvedValue(MISSING_MAX_TOKENS)
    await expect(callWithOneRecoveryRetry('decider', callOnce, 1024, 2048)).rejects.toThrow()
    expect(callOnce).toHaveBeenCalledTimes(2)
  })
})

// L. Telemetry does not contain raw transcript/prompt/user content.
describe('L: telemetry privacy', () => {
  const SENSITIVE_MARKER = 'SENSITIVE_USER_PROMPT_CONTENT_MUST_NEVER_APPEAR_IN_TELEMETRY'

  test('telemetry event contains only the documented non-sensitive metadata field set', async () => {
    const callOnce = jest.fn().mockResolvedValueOnce(MISSING_MAX_TOKENS).mockResolvedValueOnce(SUCCESS)
    const telemetrySink = jest.fn()
    await callWithOneRecoveryRetry('decider', callOnce, 1024, 2048, telemetrySink)

    const event: StructuredOutputTelemetryEvent = telemetrySink.mock.calls[0][0]
    expect(Object.keys(event).sort()).toEqual(
      [
        'adapter',
        'anthropic_response_id',
        'attempt',
        'content_block_types',
        'failure_class',
        'input_tokens',
        'output_tokens',
        'parsed_output_present',
        'retrying',
        'stop_reason',
        'thinking_tokens',
      ].sort(),
    )
  })

  test('telemetry never contains prompt/candidate/transcript content even when the response object carries it in an unexpected field', async () => {
    // Simulates a hypothetical future response shape carrying extra fields
    // this module never reads -- proves the telemetry builder only ever
    // projects the documented fixed field set, never spreads the response.
    const contaminated: any = response({ stop_reason: 'max_tokens', content: [{ type: 'thinking' }], parsed_output: null })
    contaminated.candidate_question_text_DO_NOT_LOG = SENSITIVE_MARKER
    contaminated.raw_prompt_DO_NOT_LOG = SENSITIVE_MARKER

    const callOnce = jest.fn().mockResolvedValueOnce(contaminated).mockResolvedValueOnce(SUCCESS)
    const telemetrySink = jest.fn()
    await callWithOneRecoveryRetry('candidate_generator', callOnce, 1024, 2048, telemetrySink)

    const event = telemetrySink.mock.calls[0][0]
    expect(JSON.stringify(event)).not.toContain(SENSITIVE_MARKER)
  })

  test('defaultTelemetrySink logs via console.warn (existing observability mechanism), not a new external system', async () => {
    const { defaultTelemetrySink } = await import('@/lib/interview-engine/anthropic-structured-output-retry')
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
    const callOnce = jest.fn().mockResolvedValueOnce(MISSING_MAX_TOKENS).mockResolvedValueOnce(SUCCESS)
    await callWithOneRecoveryRetry('decider', callOnce, 1024, 2048, defaultTelemetrySink)
    expect(warnSpy).toHaveBeenCalledTimes(1)
    expect(warnSpy.mock.calls[0][0]).toBe('[anthropic-structured-output]')
    expect(warnSpy.mock.calls[0][1]).not.toContain('SENSITIVE')
    warnSpy.mockRestore()
  })
})

/**
 * P0 timeout diagnostic follow-up (2026-08-21) -- per-call SUCCESS timing
 * telemetry. Test IDs below map to the milestone's own required test
 * matrix (A-P, applied here to callWithOneRecoveryRetry; the extractor's
 * identical, deliberately-uncoupled mechanism is covered separately in
 * anthropic-extractor-structured-output-recovery.test.ts).
 */
describe('callWithOneRecoveryRetry -- success timing telemetry', () => {
  // A/B/C. First-attempt success emits exactly one success event, correct
  // adapter, attempt 1 -- via a SEPARATE sink from the existing failure
  // telemetrySink, which must remain uncalled (proves the two channels
  // are independent, and that test A/F above are still exactly correct).
  test('A/B/C: first-attempt success -> exactly one success event, correct adapter, attempt 1; failure sink untouched', async () => {
    const callOnce = jest.fn().mockResolvedValue(SUCCESS)
    const telemetrySink = jest.fn()
    const successTelemetrySink = jest.fn()
    const result = await callWithOneRecoveryRetry('decider', callOnce, 1024, 2048, telemetrySink, successTelemetrySink)
    expect(result).toBe(SUCCESS)
    expect(telemetrySink).not.toHaveBeenCalled()
    expect(successTelemetrySink).toHaveBeenCalledTimes(1)
    const event: StructuredOutputSuccessTelemetryEvent = successTelemetrySink.mock.calls[0][0]
    expect(event.adapter).toBe('decider')
    expect(event.attempt).toBe(1)
    expect(event.outcome).toBe('success')
  })

  // D. elapsed_ms present and non-negative.
  test('D: elapsed_ms is present and non-negative', async () => {
    const callOnce = jest.fn().mockResolvedValue(SUCCESS)
    const successTelemetrySink = jest.fn()
    await callWithOneRecoveryRetry('candidate_generator', callOnce, 1024, 2048, undefined, successTelemetrySink)
    const event: StructuredOutputSuccessTelemetryEvent = successTelemetrySink.mock.calls[0][0]
    expect(typeof event.elapsed_ms).toBe('number')
    expect(event.elapsed_ms).toBeGreaterThanOrEqual(0)
  })

  // E. Recovery success identifies attempt = 2.
  test('E: first missing, second valid -> success event has attempt 2', async () => {
    const callOnce = jest.fn().mockResolvedValueOnce(MISSING_MAX_TOKENS).mockResolvedValueOnce(SUCCESS)
    const successTelemetrySink = jest.fn()
    const result = await callWithOneRecoveryRetry('decider', callOnce, 1024, 2048, undefined, successTelemetrySink)
    expect(result).toBe(SUCCESS)
    expect(successTelemetrySink).toHaveBeenCalledTimes(1)
    expect(successTelemetrySink.mock.calls[0][0].attempt).toBe(2)
  })

  // F. First failure + second success preserves the EXISTING failure event
  // (attempt 1, retrying:true) AND emits exactly one success event for the
  // recovery attempt (attempt 2) -- both distinguishable, neither merged.
  test('F: first failure + second success -> existing failure telemetry preserved AND one success event emitted for attempt 2', async () => {
    const callOnce = jest.fn().mockResolvedValueOnce(MISSING_MAX_TOKENS).mockResolvedValueOnce(SUCCESS)
    const telemetrySink = jest.fn()
    const successTelemetrySink = jest.fn()
    await callWithOneRecoveryRetry('decider', callOnce, 1024, 2048, telemetrySink, successTelemetrySink)

    expect(telemetrySink).toHaveBeenCalledTimes(1)
    const failureEvent: StructuredOutputTelemetryEvent = telemetrySink.mock.calls[0][0]
    expect(failureEvent.attempt).toBe(1)
    expect(failureEvent.retrying).toBe(true)
    expect(failureEvent.failure_class).toBe('missing_output_max_tokens')

    expect(successTelemetrySink).toHaveBeenCalledTimes(1)
    const successEvent: StructuredOutputSuccessTelemetryEvent = successTelemetrySink.mock.calls[0][0]
    expect(successEvent.attempt).toBe(2)
  })

  // G/H/I. response ID, stop_reason, token usage included when available.
  test('G/H/I: success event includes anthropic_response_id, stop_reason, and token usage', async () => {
    const callOnce = jest.fn().mockResolvedValue(SUCCESS)
    const successTelemetrySink = jest.fn()
    await callWithOneRecoveryRetry('decider', callOnce, 1024, 2048, undefined, successTelemetrySink)
    const event: StructuredOutputSuccessTelemetryEvent = successTelemetrySink.mock.calls[0][0]
    expect(event.anthropic_response_id).toBe(SUCCESS.id)
    expect(event.stop_reason).toBe(SUCCESS.stop_reason)
    expect(event.input_tokens).toBe(SUCCESS.usage.input_tokens)
    expect(event.output_tokens).toBe(SUCCESS.usage.output_tokens)
  })

  // J/K/L. Privacy: fixed allowlist only, no prompt/user/transcript content,
  // no leakage even when the response object carries unexpected extra
  // fields -- same discipline test L already proves for the failure event.
  describe('success telemetry privacy', () => {
    const SENSITIVE_MARKER = 'SENSITIVE_USER_PROMPT_CONTENT_MUST_NEVER_APPEAR_IN_SUCCESS_TELEMETRY'

    test('success event contains only the documented fixed field set', async () => {
      const callOnce = jest.fn().mockResolvedValue(SUCCESS)
      const successTelemetrySink = jest.fn()
      await callWithOneRecoveryRetry('decider', callOnce, 1024, 2048, undefined, successTelemetrySink)
      const event: StructuredOutputSuccessTelemetryEvent = successTelemetrySink.mock.calls[0][0]
      expect(Object.keys(event).sort()).toEqual(
        [
          'adapter',
          'attempt',
          'outcome',
          'elapsed_ms',
          'anthropic_response_id',
          'stop_reason',
          'content_block_types',
          'parsed_output_present',
          'thinking_tokens',
          'output_tokens',
          'input_tokens',
        ].sort(),
      )
    })

    test('success event never leaks an unexpected extra field on the response object (no spreading)', async () => {
      const contaminated: any = response()
      contaminated.candidate_question_text_DO_NOT_LOG = SENSITIVE_MARKER
      contaminated.raw_prompt_DO_NOT_LOG = SENSITIVE_MARKER
      const callOnce = jest.fn().mockResolvedValue(contaminated)
      const successTelemetrySink = jest.fn()
      await callWithOneRecoveryRetry('candidate_generator', callOnce, 1024, 2048, undefined, successTelemetrySink)
      const event = successTelemetrySink.mock.calls[0][0]
      expect(JSON.stringify(event)).not.toContain(SENSITIVE_MARKER)
    })

    test('defaultSuccessTelemetrySink logs via console.log with a distinct tag, no sensitive content', async () => {
      const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {})
      const callOnce = jest.fn().mockResolvedValue(SUCCESS)
      await callWithOneRecoveryRetry('decider', callOnce, 1024, 2048, undefined, defaultSuccessTelemetrySink)
      expect(logSpy).toHaveBeenCalledTimes(1)
      expect(logSpy.mock.calls[0][0]).toBe('[anthropic-structured-output-timing]')
      logSpy.mockRestore()
    })
  })

  // M/N. No change to max call count or recovery token budgets.
  test('M/N: adding success telemetry does not change call count or token budgets', async () => {
    const callOnce = jest.fn().mockResolvedValueOnce(MISSING_MAX_TOKENS).mockResolvedValueOnce(SUCCESS)
    const successTelemetrySink = jest.fn()
    await callWithOneRecoveryRetry('decider', callOnce, 1024, 2048, undefined, successTelemetrySink)
    expect(callOnce).toHaveBeenCalledTimes(2)
    expect(callOnce).toHaveBeenNthCalledWith(1, 1024)
    expect(callOnce).toHaveBeenNthCalledWith(2, 2048)
  })

  // O. No success event for a call that ultimately fails (both attempts miss).
  test('O: both attempts fail -> zero success events emitted', async () => {
    const callOnce = jest.fn().mockResolvedValue(MISSING_OTHER)
    const successTelemetrySink = jest.fn()
    await expect(callWithOneRecoveryRetry('decider', callOnce, 1024, 2048, undefined, successTelemetrySink)).rejects.toThrow()
    expect(successTelemetrySink).not.toHaveBeenCalled()
  })
})
