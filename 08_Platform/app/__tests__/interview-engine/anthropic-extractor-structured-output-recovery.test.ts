/**
 * CRC Extractor Reliability Extension (2026-08-20), authorized follow-up
 * to the CRC 503 Reliability Diagnostic and the decider/candidate-
 * generator reliability implementation (commit 2e22f0c). Tests
 * callWithStructuredOutputRecoveryRetry in isolation, via an injected fake
 * `callOnce` -- no live Anthropic client, no network call, no jest.mock of
 * the SDK. Same "test the pure parts, keep the live-model boundary itself
 * thin and untested" discipline anthropic-extractor-retry.test.ts and
 * anthropic-structured-output-retry.test.ts already established.
 *
 * This file does NOT touch or re-test callWithOneRecoveryRetry /
 * isStructuredOutputParseFailure's own existing exported behavior --
 * anthropic-extractor-retry.test.ts already covers that contract and is
 * left completely unmodified by this milestone; this file exclusively
 * covers the NEW combined recovery function used at the two live call
 * sites (createAnthropicExtractor, extractWithDiagnostics).
 *
 * Test IDs below (A-J) map directly to the reliability extension task's
 * own required test matrix.
 */

import {
  callWithStructuredOutputRecoveryRetry,
  defaultExtractorSuccessTelemetrySink,
  type ExtractorStructuredOutputTelemetryEvent,
  type ExtractorSuccessTelemetryEvent,
} from '@/lib/interview-engine/anthropic-extractor'
import type { MinimalParsedAnthropicResponse } from '@/lib/interview-engine/anthropic-structured-output-retry'

function response(overrides: Partial<MinimalParsedAnthropicResponse> = {}): MinimalParsedAnthropicResponse & { candidates: unknown[] } {
  return {
    id: 'msg_test',
    stop_reason: 'end_turn',
    content: [{ type: 'thinking' }, { type: 'text' }],
    usage: { input_tokens: 500, output_tokens: 800, output_tokens_details: { thinking_tokens: 200 } },
    parsed_output: { candidates: [] },
    candidates: [],
    ...overrides,
  }
}

const SUCCESS = response()
const MISSING_MAX_TOKENS = response({ stop_reason: 'max_tokens', content: [{ type: 'thinking' }], parsed_output: null })
const MISSING_OTHER = response({ stop_reason: 'refusal', content: [], parsed_output: null })

const SDK_PARSE_FAILURE = new Error('Failed to parse structured output: Unterminated string in JSON at position 2728 (line 1 column 2729)')
const RATE_LIMIT_FAILURE = Object.assign(new Error('429 rate limited'), { status: 429 })
const AUTH_FAILURE = Object.assign(new Error('401 invalid x-api-key'), { status: 401 })

describe('callWithStructuredOutputRecoveryRetry', () => {
  // A. Extractor first call succeeds.
  test('A: first call succeeds -> exactly 1 call, no retry, base max_tokens used, output unchanged', async () => {
    const callOnce = jest.fn().mockResolvedValue(SUCCESS)
    const telemetrySink = jest.fn()
    const result = await callWithStructuredOutputRecoveryRetry(callOnce, 3072, 4096, telemetrySink)
    expect(result).toBe(SUCCESS)
    expect(callOnce).toHaveBeenCalledTimes(1)
    expect(callOnce).toHaveBeenNthCalledWith(1, 3072)
    expect(telemetrySink).not.toHaveBeenCalled()
  })

  // B. First response: parsed_output null, no text, stop_reason max_tokens. Second valid.
  test('B: first missing (max_tokens, no text), second valid -> exactly 2 calls, recovery max_tokens used on second, success', async () => {
    const callOnce = jest.fn().mockResolvedValueOnce(MISSING_MAX_TOKENS).mockResolvedValueOnce(SUCCESS)
    const telemetrySink = jest.fn()
    const result = await callWithStructuredOutputRecoveryRetry(callOnce, 3072, 4096, telemetrySink)
    expect(result).toBe(SUCCESS)
    expect(callOnce).toHaveBeenCalledTimes(2)
    expect(callOnce).toHaveBeenNthCalledWith(1, 3072)
    expect(callOnce).toHaveBeenNthCalledWith(2, 4096)
    expect(telemetrySink).toHaveBeenCalledTimes(1)
    const event: ExtractorStructuredOutputTelemetryEvent = telemetrySink.mock.calls[0][0]
    expect(event.adapter).toBe('extractor')
    expect(event.attempt).toBe(1)
    expect(event.failure_class).toBe('missing_output_max_tokens')
    expect(event.retrying).toBe(true)
  })

  // C. Both responses: parsed_output null, no text.
  test('C: both attempts missing -> exactly 2 calls, controlled failure, accurate wording, no third attempt', async () => {
    const callOnce = jest.fn().mockResolvedValueOnce(MISSING_MAX_TOKENS).mockResolvedValueOnce(MISSING_OTHER)
    const telemetrySink = jest.fn()
    await expect(callWithStructuredOutputRecoveryRetry(callOnce, 3072, 4096, telemetrySink)).rejects.toThrow(
      /^anthropic_structured_output_missing: extractor did not produce a usable structured-output response after 1 recovery retry/,
    )
    expect(callOnce).toHaveBeenCalledTimes(2)
    expect(telemetrySink).toHaveBeenCalledTimes(2)
    expect(telemetrySink.mock.calls[1][0].attempt).toBe(2)
    expect(telemetrySink.mock.calls[1][0].retrying).toBe(false)
  })

  test('C2: final failure message never says "schema validation may have failed"', async () => {
    const callOnce = jest.fn().mockResolvedValue(MISSING_MAX_TOKENS)
    await expect(callWithStructuredOutputRecoveryRetry(callOnce, 3072, 4096)).rejects.not.toThrow(/schema validation may have failed/)
  })

  // D. First call SDK parse failure, second succeeds -- existing behavior preserved.
  test('D: SDK-thrown structured-output parse failure on first attempt, valid second -> exactly 2 calls, success', async () => {
    const callOnce = jest.fn().mockRejectedValueOnce(SDK_PARSE_FAILURE).mockResolvedValueOnce(SUCCESS)
    const telemetrySink = jest.fn()
    const result = await callWithStructuredOutputRecoveryRetry(callOnce, 3072, 4096, telemetrySink)
    expect(result).toBe(SUCCESS)
    expect(callOnce).toHaveBeenCalledTimes(2)
    expect(callOnce).toHaveBeenNthCalledWith(1, 3072)
    expect(callOnce).toHaveBeenNthCalledWith(2, 4096)
    expect(telemetrySink.mock.calls[0][0].failure_class).toBe('sdk_parse_failure')
    expect(telemetrySink.mock.calls[0][0].anthropic_response_id).toBeNull()
  })

  // E. Both calls SDK parse failure.
  test('E: SDK-thrown structured-output parse failure on BOTH attempts -> exactly 2 calls, controlled failure', async () => {
    const callOnce = jest.fn().mockRejectedValue(SDK_PARSE_FAILURE)
    await expect(callWithStructuredOutputRecoveryRetry(callOnce, 3072, 4096)).rejects.toThrow(/anthropic_structured_output_missing/)
    expect(callOnce).toHaveBeenCalledTimes(2)
  })

  // F. First call non-retryable arbitrary error.
  test('F: non-retryable error (rate limit) on first attempt -> exactly 1 call, immediate failure, original error propagates unmodified', async () => {
    const callOnce = jest.fn().mockRejectedValue(RATE_LIMIT_FAILURE)
    await expect(callWithStructuredOutputRecoveryRetry(callOnce, 3072, 4096)).rejects.toBe(RATE_LIMIT_FAILURE)
    expect(callOnce).toHaveBeenCalledTimes(1)
  })

  test('F2: non-retryable error (auth) on first attempt -> same, no inappropriate retry', async () => {
    const callOnce = jest.fn().mockRejectedValue(AUTH_FAILURE)
    await expect(callWithStructuredOutputRecoveryRetry(callOnce, 3072, 4096)).rejects.toBe(AUTH_FAILURE)
    expect(callOnce).toHaveBeenCalledTimes(1)
  })

  test('F3: non-retryable error on the SECOND (retry) attempt propagates unmodified, not re-wrapped', async () => {
    const callOnce = jest.fn().mockResolvedValueOnce(MISSING_MAX_TOKENS).mockRejectedValueOnce(RATE_LIMIT_FAILURE)
    await expect(callWithStructuredOutputRecoveryRetry(callOnce, 3072, 4096)).rejects.toBe(RATE_LIMIT_FAILURE)
    expect(callOnce).toHaveBeenCalledTimes(2)
  })

  // I. Maximum-call-count invariant: no scenario exceeds 2 client.messages.parse() calls.
  test('I: never makes a third call under any combination of failures (missing-output x2)', async () => {
    const callOnce = jest.fn().mockResolvedValue(MISSING_MAX_TOKENS)
    await expect(callWithStructuredOutputRecoveryRetry(callOnce, 3072, 4096)).rejects.toThrow()
    expect(callOnce).toHaveBeenCalledTimes(2)
  })

  test('I2: never makes a third call when the failure classes differ across attempts (missing-output then SDK parse failure)', async () => {
    const callOnce = jest.fn().mockResolvedValueOnce(MISSING_OTHER).mockRejectedValueOnce(SDK_PARSE_FAILURE)
    await expect(callWithStructuredOutputRecoveryRetry(callOnce, 3072, 4096)).rejects.toThrow(/anthropic_structured_output_missing/)
    expect(callOnce).toHaveBeenCalledTimes(2)
  })

  test('default parameters (no explicit max_tokens args) use the module baseline/retry constants -- 3072 then 4096', async () => {
    const callOnce = jest.fn().mockResolvedValueOnce(MISSING_MAX_TOKENS).mockResolvedValueOnce(SUCCESS)
    await callWithStructuredOutputRecoveryRetry(callOnce)
    expect(callOnce).toHaveBeenNthCalledWith(1, 3072)
    expect(callOnce).toHaveBeenNthCalledWith(2, 4096)
  })
})

// J. Telemetry allowlist: no raw transcript/prompt/user content.
describe('J: telemetry privacy', () => {
  const SENSITIVE_MARKER = 'SENSITIVE_USER_TRANSCRIPT_CONTENT_MUST_NEVER_APPEAR_IN_TELEMETRY'

  test('telemetry event contains only the documented non-sensitive metadata field set', async () => {
    const callOnce = jest.fn().mockResolvedValueOnce(MISSING_MAX_TOKENS).mockResolvedValueOnce(SUCCESS)
    const telemetrySink = jest.fn()
    await callWithStructuredOutputRecoveryRetry(callOnce, 3072, 4096, telemetrySink)

    const event: ExtractorStructuredOutputTelemetryEvent = telemetrySink.mock.calls[0][0]
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
    expect(event.adapter).toBe('extractor')
  })

  test('telemetry never contains raw transcript/prompt/candidate/source_statement content even when the response object carries it in an unexpected field', async () => {
    const contaminated: any = response({ stop_reason: 'max_tokens', content: [{ type: 'thinking' }], parsed_output: null })
    contaminated.raw_text_DO_NOT_LOG = SENSITIVE_MARKER
    contaminated.source_statement_DO_NOT_LOG = SENSITIVE_MARKER
    contaminated.turn_text_DO_NOT_LOG = SENSITIVE_MARKER

    const callOnce = jest.fn().mockResolvedValueOnce(contaminated).mockResolvedValueOnce(SUCCESS)
    const telemetrySink = jest.fn()
    await callWithStructuredOutputRecoveryRetry(callOnce, 3072, 4096, telemetrySink)

    const event = telemetrySink.mock.calls[0][0]
    expect(JSON.stringify(event)).not.toContain(SENSITIVE_MARKER)
  })

  test('defaultExtractorTelemetrySink logs via console.warn (existing observability mechanism), not a new external system', async () => {
    const { defaultExtractorTelemetrySink } = await import('@/lib/interview-engine/anthropic-extractor')
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
    const callOnce = jest.fn().mockResolvedValueOnce(MISSING_MAX_TOKENS).mockResolvedValueOnce(SUCCESS)
    await callWithStructuredOutputRecoveryRetry(callOnce, 3072, 4096, defaultExtractorTelemetrySink)
    expect(warnSpy).toHaveBeenCalledTimes(1)
    expect(warnSpy.mock.calls[0][0]).toBe('[anthropic-structured-output]')
    warnSpy.mockRestore()
  })
})

/**
 * P0 timeout diagnostic follow-up (2026-08-21) -- per-call SUCCESS timing
 * telemetry for the extractor's own, deliberately-uncoupled retry
 * mechanism. Item P of the milestone's own test matrix: proves the
 * extractor uses the identical timing discipline as the decider/
 * candidate-generator (covered in anthropic-structured-output-retry.test.ts).
 */
describe('callWithStructuredOutputRecoveryRetry -- success timing telemetry', () => {
  test('first-attempt success -> exactly one success event, adapter "extractor", attempt 1, failure sink untouched', async () => {
    const callOnce = jest.fn().mockResolvedValue(SUCCESS)
    const telemetrySink = jest.fn()
    const successTelemetrySink = jest.fn()
    const result = await callWithStructuredOutputRecoveryRetry(callOnce, 3072, 4096, telemetrySink, successTelemetrySink)
    expect(result).toBe(SUCCESS)
    expect(telemetrySink).not.toHaveBeenCalled()
    expect(successTelemetrySink).toHaveBeenCalledTimes(1)
    const event: ExtractorSuccessTelemetryEvent = successTelemetrySink.mock.calls[0][0]
    expect(event.adapter).toBe('extractor')
    expect(event.attempt).toBe(1)
    expect(event.outcome).toBe('success')
  })

  test('elapsed_ms is present and non-negative', async () => {
    const callOnce = jest.fn().mockResolvedValue(SUCCESS)
    const successTelemetrySink = jest.fn()
    await callWithStructuredOutputRecoveryRetry(callOnce, 3072, 4096, undefined, successTelemetrySink)
    const event: ExtractorSuccessTelemetryEvent = successTelemetrySink.mock.calls[0][0]
    expect(typeof event.elapsed_ms).toBe('number')
    expect(event.elapsed_ms).toBeGreaterThanOrEqual(0)
  })

  test('recovery success identifies attempt 2; existing failure telemetry for attempt 1 preserved unmodified', async () => {
    const callOnce = jest.fn().mockResolvedValueOnce(MISSING_MAX_TOKENS).mockResolvedValueOnce(SUCCESS)
    const telemetrySink = jest.fn()
    const successTelemetrySink = jest.fn()
    const result = await callWithStructuredOutputRecoveryRetry(callOnce, 3072, 4096, telemetrySink, successTelemetrySink)
    expect(result).toBe(SUCCESS)
    expect(telemetrySink).toHaveBeenCalledTimes(1)
    expect(telemetrySink.mock.calls[0][0].attempt).toBe(1)
    expect(telemetrySink.mock.calls[0][0].retrying).toBe(true)
    expect(successTelemetrySink).toHaveBeenCalledTimes(1)
    expect(successTelemetrySink.mock.calls[0][0].attempt).toBe(2)
  })

  test('success event includes anthropic_response_id, stop_reason, and token usage', async () => {
    const callOnce = jest.fn().mockResolvedValue(SUCCESS)
    const successTelemetrySink = jest.fn()
    await callWithStructuredOutputRecoveryRetry(callOnce, 3072, 4096, undefined, successTelemetrySink)
    const event: ExtractorSuccessTelemetryEvent = successTelemetrySink.mock.calls[0][0]
    expect(event.anthropic_response_id).toBe(SUCCESS.id)
    expect(event.stop_reason).toBe(SUCCESS.stop_reason)
    expect(event.input_tokens).toBe(SUCCESS.usage.input_tokens)
    expect(event.output_tokens).toBe(SUCCESS.usage.output_tokens)
  })

  test('success event contains only the documented fixed field set, and never leaks an unexpected response field', async () => {
    const SENSITIVE_MARKER = 'SENSITIVE_USER_TRANSCRIPT_CONTENT_MUST_NEVER_APPEAR_IN_SUCCESS_TELEMETRY'
    const contaminated: any = response()
    contaminated.raw_text_DO_NOT_LOG = SENSITIVE_MARKER
    const callOnce = jest.fn().mockResolvedValue(contaminated)
    const successTelemetrySink = jest.fn()
    await callWithStructuredOutputRecoveryRetry(callOnce, 3072, 4096, undefined, successTelemetrySink)
    const event = successTelemetrySink.mock.calls[0][0]
    expect(Object.keys(event).sort()).toEqual(
      ['adapter', 'attempt', 'outcome', 'elapsed_ms', 'anthropic_response_id', 'stop_reason', 'content_block_types', 'parsed_output_present', 'thinking_tokens', 'output_tokens', 'input_tokens'].sort(),
    )
    expect(JSON.stringify(event)).not.toContain(SENSITIVE_MARKER)
  })

  test('defaultExtractorSuccessTelemetrySink logs via console.log with a distinct tag', async () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {})
    const callOnce = jest.fn().mockResolvedValue(SUCCESS)
    await callWithStructuredOutputRecoveryRetry(callOnce, 3072, 4096, undefined, defaultExtractorSuccessTelemetrySink)
    expect(logSpy).toHaveBeenCalledTimes(1)
    expect(logSpy.mock.calls[0][0]).toBe('[anthropic-structured-output-timing]')
    logSpy.mockRestore()
  })

  test('no change to call count or token budgets, and no success event when both attempts fail', async () => {
    const callOnce = jest.fn().mockResolvedValue(MISSING_OTHER)
    const successTelemetrySink = jest.fn()
    await expect(callWithStructuredOutputRecoveryRetry(callOnce, 3072, 4096, undefined, successTelemetrySink)).rejects.toThrow()
    expect(callOnce).toHaveBeenCalledTimes(2)
    expect(successTelemetrySink).not.toHaveBeenCalled()
  })
})
