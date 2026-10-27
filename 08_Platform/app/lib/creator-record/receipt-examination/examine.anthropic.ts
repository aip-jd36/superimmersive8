/**
 * PRODUCT-A-MVP-SPIKE-1A — the ONLY file in lib/creator-record that imports
 * the Anthropic SDK. Imported dynamically by the evaluation runner's live
 * mode only; nothing else references it. Constructing a caller makes no call.
 *
 * Mirrors the existing structured-output adapters (HRR classifier,
 * interview-engine extractor): `messages.parse` + `jsonSchemaOutputFormat`,
 * thinking disabled, API-default sampling. Retry policy lives in
 * `examine.ts`, so this caller performs exactly one request per invocation.
 *
 * The API key is read from the environment and never logged or returned.
 */

import Anthropic from '@anthropic-ai/sdk'
import { jsonSchemaOutputFormat } from '@anthropic-ai/sdk/helpers/json-schema'
import { RECEIPT_EXAMINATION_SYSTEM_PROMPT } from './prompt'
import { RECEIPT_EXTRACTION_SCHEMA } from './schema'
import type { ReceiptModelCaller, ReceiptModelResponse } from './examine'

export const DEFAULT_RECEIPT_MODEL = 'claude-sonnet-5'

export interface AnthropicReceiptCallerOptions {
  model?: string
  /** Per-request timeout. Defaults to 55 s, under the 60 s route ceiling used elsewhere. */
  timeoutMs?: number
  /**
   * Environment variable holding the API key (CR-V2-MVP-1). Defaults to
   * `ANTHROPIC_API_KEY` for the eval runner; the app's live path uses a
   * dedicated key so its spend can be capped separately. The key is read
   * here only and never logged or returned.
   */
  apiKeyEnv?: string
}

export function resolveReceiptModel(options?: AnthropicReceiptCallerOptions): string {
  return options?.model ?? process.env.CREATOR_RECORD_RECEIPT_MODEL ?? DEFAULT_RECEIPT_MODEL
}

export function createAnthropicReceiptCaller(options?: AnthropicReceiptCallerOptions): ReceiptModelCaller {
  const keyEnv = options?.apiKeyEnv ?? 'ANTHROPIC_API_KEY'
  const apiKey = process.env[keyEnv]
  if (!apiKey) {
    throw new Error(`${keyEnv} is not set in this process environment. Live receipt examination cannot run.`)
  }
  const model = resolveReceiptModel(options)
  const client = new Anthropic({ apiKey, timeout: options?.timeoutMs ?? 55_000, maxRetries: 0 })

  return async ({ content, maxTokens }) => {
    const response = await client.messages.parse({
      model,
      max_tokens: maxTokens,
      thinking: { type: 'disabled' },
      system: RECEIPT_EXAMINATION_SYSTEM_PROMPT,
      messages: [{ role: 'user', content }],
      output_config: { format: jsonSchemaOutputFormat(RECEIPT_EXTRACTION_SCHEMA) },
    })
    return response as unknown as ReceiptModelResponse
  }
}
