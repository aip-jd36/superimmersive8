/**
 * Extractor Thinking Disable milestone (2026-08-26). Behavioral/request-
 * shape coverage: mocks the Anthropic SDK client directly (a new pattern
 * for this test suite, introduced narrowly here) so these tests assert
 * what is ACTUALLY sent on the wire for both the base and recovery
 * extractor calls, rather than only the retry-wrapper's abstract
 * max_tokens-passing behavior (already covered, unmodified, by
 * anthropic-extractor-retry.test.ts). jsonSchemaOutputFormat is left
 * unmocked (pure, no network) so output_config is the real production
 * shape.
 *
 * Adapter's own request-construction is the unit under test here, not the
 * shared callWithStructuredOutputRecoveryRetry mechanism (unmodified,
 * covered elsewhere) or the real model (covered by the accepted bounded
 * real-model comparison, not re-run in unit tests).
 */
const mockParse = jest.fn()

jest.mock('@anthropic-ai/sdk', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    messages: { parse: mockParse },
  })),
}))

import { createAnthropicExtractor, extractWithDiagnostics } from '../../lib/interview-engine/anthropic-extractor'

const MISSING_OUTPUT_RESPONSE = {
  id: 'msg_missing',
  stop_reason: 'max_tokens',
  content: [{ type: 'thinking' }],
  usage: { input_tokens: 11000, output_tokens: 3072, output_tokens_details: { thinking_tokens: 3072 } },
  parsed_output: null,
}

const SUCCESS_RESPONSE = {
  id: 'msg_success',
  stop_reason: 'end_turn',
  content: [{ type: 'text' }],
  usage: { input_tokens: 11000, output_tokens: 400, output_tokens_details: { thinking_tokens: 0 } },
  parsed_output: { candidates: [] },
}

beforeEach(() => {
  mockParse.mockReset()
  process.env.ANTHROPIC_API_KEY = 'test-key-not-real'
})

describe('createAnthropicExtractor -- thinking explicitly disabled on every real call', () => {
  test('A/B/D/E: base call disabled + 3072, recovery call disabled + 4096, exactly 2 calls total, output_config present on both', async () => {
    mockParse.mockResolvedValueOnce(MISSING_OUTPUT_RESPONSE).mockResolvedValueOnce(SUCCESS_RESPONSE)

    const extractor = createAnthropicExtractor()
    const result = await extractor({ turn: 1, text: 'We made a video with Runway.' })

    expect(result).toEqual([])
    expect(mockParse).toHaveBeenCalledTimes(2)

    const baseCallArgs = mockParse.mock.calls[0][0]
    const recoveryCallArgs = mockParse.mock.calls[1][0]

    expect(baseCallArgs.thinking).toEqual({ type: 'disabled' })
    expect(baseCallArgs.max_tokens).toBe(3072)
    expect(baseCallArgs).toHaveProperty('output_config')

    expect(recoveryCallArgs.thinking).toEqual({ type: 'disabled' })
    expect(recoveryCallArgs.max_tokens).toBe(4096)
    expect(recoveryCallArgs).toHaveProperty('output_config')
  })

  test('single successful attempt -- thinking still disabled, exactly one call, no recovery attempt made', async () => {
    mockParse.mockResolvedValueOnce(SUCCESS_RESPONSE)

    const extractor = createAnthropicExtractor()
    await extractor({ turn: 1, text: 'We made a video with Runway.' })

    expect(mockParse).toHaveBeenCalledTimes(1)
    expect(mockParse.mock.calls[0][0].thinking).toEqual({ type: 'disabled' })
  })
})

describe('extractWithDiagnostics -- identical thinking-disabled configuration', () => {
  test('base and recovery calls both explicitly disable thinking', async () => {
    mockParse.mockResolvedValueOnce(MISSING_OUTPUT_RESPONSE).mockResolvedValueOnce(SUCCESS_RESPONSE)

    await extractWithDiagnostics({ turn: 1, text: 'We made a video with Runway.' })

    expect(mockParse).toHaveBeenCalledTimes(2)
    expect(mockParse.mock.calls[0][0].thinking).toEqual({ type: 'disabled' })
    expect(mockParse.mock.calls[1][0].thinking).toEqual({ type: 'disabled' })
  })
})

describe('F/G: sibling adapters unchanged -- source-text guard, no production export needed', () => {
  test('F: candidate_generator (anthropic-candidate-question.ts) still sets no thinking parameter', () => {
    const fs = require('fs')
    const path = require('path')
    const source = fs.readFileSync(path.join(__dirname, '..', '..', 'lib', 'interview-engine', 'anthropic-candidate-question.ts'), 'utf-8')
    expect(source).not.toMatch(/thinking:\s*\{\s*type:\s*['"]disabled['"]/)
  })

  test('G: decider (anthropic-decision.ts) still sets no thinking parameter', () => {
    const fs = require('fs')
    const path = require('path')
    const source = fs.readFileSync(path.join(__dirname, '..', '..', 'lib', 'interview-engine', 'anthropic-decision.ts'), 'utf-8')
    expect(source).not.toMatch(/thinking:\s*\{\s*type:\s*['"]disabled['"]/)
  })
})
