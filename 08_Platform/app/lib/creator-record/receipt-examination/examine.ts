/**
 * PRODUCT-A-MVP-SPIKE-1A — examine one document, fail closed.
 *
 * Pure orchestration over an injected `ReceiptModelCaller`. This file imports
 * no SDK and makes no network call; the only real caller lives in
 * `examine.anthropic.ts` and is constructed explicitly by the evaluation
 * runner's live mode.
 *
 * Outcome is either `examined` (a schema-valid extraction) or
 * `could_not_examine` with a fixed reason. There is no partial or repaired
 * success: a provider error, a missing structured output after one retry, or
 * a schema-invalid response all become `could_not_examine`.
 */

import {
  classifyMissingParsedOutput,
  isStructuredOutputParseFailure,
  type MinimalParsedAnthropicResponse,
} from '@/lib/interview-engine/anthropic-structured-output-retry'
import { buildReceiptUserContent, RECEIPT_PROMPT_VERSION, type ReceiptContentBlock, type ReceiptMediaType } from './prompt'
import { RECEIPT_EXTRACTION_SCHEMA_VERSION, validateReceiptExtraction, type ReceiptExtraction } from './schema'

/** Same 10 MB ceiling as the existing upload route. */
export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024
export const BASE_MAX_TOKENS = 1024
export const RETRY_MAX_TOKENS = 2048

/** Structurally satisfied by `client.messages.parse()`'s result. */
export type ReceiptModelResponse = MinimalParsedAnthropicResponse

export interface ReceiptModelRequest {
  content: ReceiptContentBlock[]
  maxTokens: number
}

/** One model call. Implementations must not retry internally. */
export type ReceiptModelCaller = (request: ReceiptModelRequest) => Promise<ReceiptModelResponse>

export type CouldNotExamineReason =
  | 'unsupported_format'
  | 'file_too_large'
  | 'empty_file'
  | 'model_error'
  | 'structured_output_missing'
  | 'schema_invalid'

export interface ExaminationUsage {
  attempts: number
  input_tokens: number
  output_tokens: number
  latency_ms: number
}

export type ExaminationOutcome =
  | {
      status: 'examined'
      extraction: ReceiptExtraction
      detected_media_type: ReceiptMediaType
      usage: ExaminationUsage
      schema_version: typeof RECEIPT_EXTRACTION_SCHEMA_VERSION
      prompt_version: typeof RECEIPT_PROMPT_VERSION
    }
  | {
      status: 'could_not_examine'
      reason: CouldNotExamineReason
      detected_media_type: ReceiptMediaType | null
      usage: ExaminationUsage
      schema_version: typeof RECEIPT_EXTRACTION_SCHEMA_VERSION
      prompt_version: typeof RECEIPT_PROMPT_VERSION
    }

/** Media type from the file's own bytes; the browser-declared type is never trusted. */
export function detectMediaType(bytes: Uint8Array): ReceiptMediaType | null {
  const b = bytes
  if (b.length >= 5 && b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46 && b[4] === 0x2d) return 'application/pdf'
  if (b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 && b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a) return 'image/png'
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg'
  return null
}

export interface ExamineDeps {
  callModel: ReceiptModelCaller
  now?: () => number
}

export async function examineReceiptDocument(bytes: Uint8Array, deps: ExamineDeps): Promise<ExaminationOutcome> {
  const now = deps.now ?? (() => Date.now())
  const usage: ExaminationUsage = { attempts: 0, input_tokens: 0, output_tokens: 0, latency_ms: 0 }
  const versions = { schema_version: RECEIPT_EXTRACTION_SCHEMA_VERSION, prompt_version: RECEIPT_PROMPT_VERSION } as const
  const fail = (reason: CouldNotExamineReason, media: ReceiptMediaType | null): ExaminationOutcome => ({
    status: 'could_not_examine',
    reason,
    detected_media_type: media,
    usage,
    ...versions,
  })

  // Input checks happen before any model call.
  if (bytes.length === 0) return fail('empty_file', null)
  if (bytes.length > MAX_DOCUMENT_BYTES) return fail('file_too_large', detectMediaType(bytes))
  const media = detectMediaType(bytes)
  if (!media) return fail('unsupported_format', null)

  const content = buildReceiptUserContent(bytes, media)
  const started = now()
  let parsed: unknown = undefined
  let lastFailure: CouldNotExamineReason = 'structured_output_missing'

  // At most two calls: one attempt plus one recovery retry on a missing or
  // unparseable structured output. Provider errors are not retried.
  for (const maxTokens of [BASE_MAX_TOKENS, RETRY_MAX_TOKENS]) {
    usage.attempts += 1
    let response: ReceiptModelResponse
    try {
      response = await deps.callModel({ content, maxTokens })
    } catch (err) {
      if (isStructuredOutputParseFailure(err)) {
        lastFailure = 'structured_output_missing'
        continue
      }
      usage.latency_ms = now() - started
      return fail('model_error', media)
    }
    usage.input_tokens += response.usage?.input_tokens ?? 0
    usage.output_tokens += response.usage?.output_tokens ?? 0
    if (classifyMissingParsedOutput(response) === null) {
      parsed = response.parsed_output
      break
    }
    lastFailure = 'structured_output_missing'
  }
  usage.latency_ms = now() - started

  if (parsed === undefined) return fail(lastFailure, media)
  const extraction = validateReceiptExtraction(parsed)
  if (!extraction) return fail('schema_invalid', media)
  return { status: 'examined', extraction, detected_media_type: media, usage, ...versions }
}
