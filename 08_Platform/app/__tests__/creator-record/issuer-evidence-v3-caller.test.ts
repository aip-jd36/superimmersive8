/**
 * CRV2-IA-4D3 S2b — the live caller sends exactly one reading contract's prompt and schema together. The SDK is replaced by a
 * recorder: no network, no key, no model call.
 */

const mockParse = jest.fn(async (_params: Record<string, unknown>) => ({ id: 'rec', content: [], stop_reason: 'end_turn', usage: { input_tokens: 0, output_tokens: 0 } }))
jest.mock('@anthropic-ai/sdk', () => {
  class FakeAnthropic {
    messages = { parse: mockParse }
    constructor(_options: unknown) {}
  }
  return { __esModule: true, default: FakeAnthropic }
})

import { createAnthropicReceiptCaller, RECEIPT_CALL_CONTRACTS } from '@/lib/creator-record/receipt-examination/examine.anthropic'
import { RECEIPT_EXTRACTION_SCHEMA_VERSION_V3 } from '@/lib/creator-record/receipt-examination/issuer-evidence'
import { RECEIPT_EXAMINATION_SYSTEM_PROMPT, RECEIPT_EXAMINATION_SYSTEM_PROMPT_V3 } from '@/lib/creator-record/receipt-examination/prompt'
import { RECEIPT_EXTRACTION_SCHEMA, RECEIPT_EXTRACTION_SCHEMA_V3, RECEIPT_EXTRACTION_SCHEMA_VERSION } from '@/lib/creator-record/receipt-examination/schema'

const KEY_ENV = 'SI8_TEST_FAKE_RECEIPT_KEY'
beforeAll(() => {
  process.env[KEY_ENV] = 'not-a-real-key'
})
afterAll(() => {
  delete process.env[KEY_ENV]
})
beforeEach(() => mockParse.mockClear())

const send = async (readingContract?: string) => {
  const call = createAnthropicReceiptCaller({ model: 'claude-sonnet-5', apiKeyEnv: KEY_ENV, timeoutMs: 1000, readingContract: readingContract as never })
  await call({ content: [{ type: 'text', text: 'x' }], maxTokens: 1024 })
  return mockParse.mock.calls[0][0] as { system: string; output_config: { format: { schema: { properties: Record<string, unknown>; required: string[] } } } }
}

function hasKey(node: unknown, key: string): boolean {
  if (!node || typeof node !== 'object') return false
  if (Object.prototype.hasOwnProperty.call(node, key)) return true
  return Object.values(node as Record<string, unknown>).some((v) => hasKey(v, key))
}

describe('contract-aware live caller (no network)', () => {
  test('default is unchanged: the v2 prompt and the v2 schema', async () => {
    const p = await send()
    expect(p.system).toBe(RECEIPT_EXAMINATION_SYSTEM_PROMPT)
    expect(Object.keys(p.output_config.format.schema.properties)).toContain('issuer_name')
    expect(Object.keys(p.output_config.format.schema.properties)).not.toContain('issuer_statements')
  })

  test('v3 sends the v3 prompt with the v3 schema, never a mix', async () => {
    const p = await send(RECEIPT_EXTRACTION_SCHEMA_VERSION_V3)
    expect(p.system).toBe(RECEIPT_EXAMINATION_SYSTEM_PROMPT_V3)
    expect(Object.keys(p.output_config.format.schema.properties)).toContain('issuer_statements')
    expect(Object.keys(p.output_config.format.schema.properties)).not.toContain('issuer_name')
    expect(p.output_config.format.schema.required).toContain('issuer_statements')
  })

  test('an unknown contract refuses before any request', () => {
    expect(() => createAnthropicReceiptCaller({ model: 'claude-sonnet-5', apiKeyEnv: KEY_ENV, readingContract: 'receipt-extraction-v9' as never })).toThrow(/Unknown reading contract/)
    expect(mockParse).not.toHaveBeenCalled()
  })

  test('exactly two contracts, each pairing its own prompt and schema', () => {
    expect(Object.keys(RECEIPT_CALL_CONTRACTS).sort()).toEqual([RECEIPT_EXTRACTION_SCHEMA_VERSION, RECEIPT_EXTRACTION_SCHEMA_VERSION_V3].sort())
    expect(RECEIPT_CALL_CONTRACTS[RECEIPT_EXTRACTION_SCHEMA_VERSION]).toEqual({ system: RECEIPT_EXAMINATION_SYSTEM_PROMPT, schema: RECEIPT_EXTRACTION_SCHEMA })
    expect(RECEIPT_CALL_CONTRACTS[RECEIPT_EXTRACTION_SCHEMA_VERSION_V3]).toEqual({ system: RECEIPT_EXAMINATION_SYSTEM_PROMPT_V3, schema: RECEIPT_EXTRACTION_SCHEMA_V3 })
  })

  test('neither schema carries an array-size constraint (unsupported by structured outputs)', () => {
    for (const s of [RECEIPT_EXTRACTION_SCHEMA, RECEIPT_EXTRACTION_SCHEMA_V3]) {
      expect(hasKey(s, 'maxItems')).toBe(false)
      expect(hasKey(s, 'minItems')).toBe(false)
    }
  })
})
