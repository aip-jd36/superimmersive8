/**
 * Shared bounded-recovery-retry helper for the two Anthropic structured-
 * output adapters that had zero retry coverage before this milestone --
 * the Constraint A decider (anthropic-decision.ts) and the candidate-
 * question generator (anthropic-candidate-question.ts). Built from the
 * accepted findings of the CRC 503 Reliability Diagnostic (2026-08-20).
 *
 * Deliberately NOT used by anthropic-extractor.ts, which already has its
 * own working callWithOneRecoveryRetry/isStructuredOutputParseFailure
 * pair, scoped to a different, already-resolved incident and its own
 * max_tokens ceilings (2048/3072/4096, vs. 1024/2048 here) -- left
 * untouched. Each of the three adapter files documents its own deliberate
 * non-coupling from the other two; this file preserves that by not
 * importing from or being imported by anthropic-extractor.ts.
 *
 * Classification is STRUCTURAL where possible, not message-string
 * matching: classifyMissingParsedOutput() inspects response.stop_reason
 * and response.content block types directly. Live evidence (13 calls,
 * 2026-08-20, against the real decider prompt/schema) showed the model
 * emits an un-requested `thinking` content block sharing the same
 * max_tokens budget as the eventual `text` block, with thinking-token
 * usage scaling with case complexity (up to 381 tokens observed for an
 * iStock-style likeness/animation-rights judgment call, vs. ~130-230 for
 * simple cases). A sufficiently hard case can exhaust max_tokens during
 * thinking, before any text block is ever emitted -- producing
 * parsed_output === null with NO SDK-level parse error, since the SDK's
 * own json-schema helper (helpers/json-schema.ts) only throws when a
 * text block exists and fails JSON.parse (see lib/parser.ts). This is
 * the confirmed mechanism behind the production error "Anthropic
 * response did not include parsed_output -- schema validation may have
 * failed" -- which is itself misleading: the SDK performs no client-side
 * schema-conformance validation at all.
 *
 * Also retries once on the SDK's own thrown parse failure
 * (AnthropicError('Failed to parse structured output...')) -- the same
 * failure class anthropic-extractor.ts already recovers from. Both
 * adapters here share the identical small-schema, low-max_tokens shape
 * that makes this worth covering too, so the predicate is duplicated
 * (not imported) rather than coupling this file to the extractor's.
 */

export type StructuredOutputFailureClass = 'missing_output_max_tokens' | 'missing_output_other' | 'sdk_parse_failure'

export type StructuredOutputAdapterName = 'decider' | 'candidate_generator'

/**
 * The minimal shape this module needs from a parsed Anthropic response.
 * Deliberately not typed against the SDK's own ParsedMessage<T> generic --
 * this file does not import @anthropic-ai/sdk at all. Any real
 * client.messages.parse() result structurally satisfies this shape.
 */
export interface MinimalParsedAnthropicResponse {
  id: string
  stop_reason: string | null
  content: Array<{ type: string }>
  usage: {
    input_tokens: number
    output_tokens: number
    output_tokens_details?: { thinking_tokens: number } | null
  }
  parsed_output: unknown
}

/**
 * Returns null for a genuine success (parsed_output present). Otherwise
 * classifies the specific missing-output condition. Never assumes a text
 * block exists that merely failed to parse -- client.messages.parse()
 * itself throws in that case (a distinct, separately-handled failure
 * class, see isStructuredOutputParseFailure below), so a null
 * parsed_output reaching this function with a text block present is not
 * an expected shape; classified conservatively as 'missing_output_other'
 * rather than assumed impossible.
 */
export function classifyMissingParsedOutput(response: MinimalParsedAnthropicResponse): StructuredOutputFailureClass | null {
  if (response.parsed_output != null) return null
  const hasTextBlock = response.content.some((block) => block.type === 'text')
  if (!hasTextBlock && response.stop_reason === 'max_tokens') return 'missing_output_max_tokens'
  return 'missing_output_other'
}

/** Same predicate anthropic-extractor.ts uses, duplicated deliberately -- see module header. */
export function isStructuredOutputParseFailure(err: unknown): boolean {
  return err instanceof Error && err.message.includes('Failed to parse structured output')
}

export interface StructuredOutputTelemetryEvent {
  adapter: StructuredOutputAdapterName
  attempt: 1 | 2
  anthropic_response_id: string | null
  stop_reason: string | null
  content_block_types: string[] | null
  parsed_output_present: boolean
  thinking_tokens: number | null
  output_tokens: number | null
  input_tokens: number | null
  failure_class: StructuredOutputFailureClass
  retrying: boolean
}

/**
 * console.warn by default -- the same observability mechanism route.ts's
 * own console.error already uses at the one existing failure-logging
 * site (the runTurn() catch block). No new telemetry system introduced.
 * Injectable so tests never need to spy on the real console and so a
 * future caller with a structured logger can supply one without changing
 * this module. Fields are metadata only: no prompt, transcript, question
 * text, or user content of any kind is ever included.
 */
export type StructuredOutputTelemetrySink = (event: StructuredOutputTelemetryEvent) => void

export const defaultTelemetrySink: StructuredOutputTelemetrySink = (event) => {
  console.warn('[anthropic-structured-output]', JSON.stringify(event))
}

interface AttemptSuccess<T> {
  ok: true
  response: T
}
interface AttemptFailure {
  ok: false
  failureClass: StructuredOutputFailureClass
  response?: MinimalParsedAnthropicResponse
}

function telemetryEvent(
  adapter: StructuredOutputAdapterName,
  attempt: 1 | 2,
  outcome: AttemptFailure,
  retrying: boolean,
): StructuredOutputTelemetryEvent {
  const response = outcome.response
  return {
    adapter,
    attempt,
    anthropic_response_id: response?.id ?? null,
    stop_reason: response?.stop_reason ?? null,
    content_block_types: response ? response.content.map((b) => b.type) : null,
    parsed_output_present: response ? response.parsed_output != null : false,
    thinking_tokens: response?.usage.output_tokens_details?.thinking_tokens ?? null,
    output_tokens: response?.usage.output_tokens ?? null,
    input_tokens: response?.usage.input_tokens ?? null,
    failure_class: outcome.failureClass,
    retrying,
  }
}

async function attemptOnceCatching<T extends MinimalParsedAnthropicResponse>(
  callOnce: (maxTokens: number) => Promise<T>,
  maxTokens: number,
): Promise<AttemptSuccess<T> | AttemptFailure> {
  let response: T
  try {
    response = await callOnce(maxTokens)
  } catch (err) {
    // Non-structured-output-shaped errors (auth, network, rate limit,
    // malformed request, unknown) are never classified as recoverable
    // here -- they propagate immediately, on either attempt, exactly as
    // before this module existed.
    if (!isStructuredOutputParseFailure(err)) throw err
    return { ok: false, failureClass: 'sdk_parse_failure' }
  }
  const failureClass = classifyMissingParsedOutput(response)
  if (failureClass === null) return { ok: true, response }
  return { ok: false, failureClass, response }
}

/**
 * Exactly one recovery retry -- a maximum of 2 Anthropic calls total for
 * one logical adapter invocation, never more, never recursive. Retries
 * ONLY a classifiable structured-output miss (missing parsed_output with
 * no text block, any stop_reason; or the SDK's own thrown parse
 * failure). Any other exception is not this module's concern and
 * propagates unmodified -- this makes no attempt to duplicate or stack
 * additional retries on top of whatever the Anthropic SDK already does
 * internally for transport-level failures.
 *
 * On final failure (both attempts unresolved), throws a single error
 * with accurate wording -- never "schema validation may have failed"
 * (the SDK performs no such validation) -- and never returns a
 * synthesized/fallback result. The caller (the adapter) has nothing left
 * to do but let the failure propagate; this module never invents a
 * question or a decision.
 */
export async function callWithOneRecoveryRetry<T extends MinimalParsedAnthropicResponse>(
  adapter: StructuredOutputAdapterName,
  callOnce: (maxTokens: number) => Promise<T>,
  baseMaxTokens: number,
  retryMaxTokens: number,
  telemetrySink: StructuredOutputTelemetrySink = defaultTelemetrySink,
): Promise<T> {
  const first = await attemptOnceCatching(callOnce, baseMaxTokens)
  if (first.ok) return first.response
  telemetrySink(telemetryEvent(adapter, 1, first, true))

  const second = await attemptOnceCatching(callOnce, retryMaxTokens)
  if (second.ok) return second.response
  telemetrySink(telemetryEvent(adapter, 2, second, false))

  throw new Error(
    `anthropic_structured_output_missing: ${adapter} did not produce a usable structured-output response after 1 ` +
      `recovery retry (first attempt: ${first.failureClass}, retry attempt: ${second.failureClass}). The response ` +
      `contained no output to parse -- this is not a confirmed schema-validation failure.`,
  )
}
