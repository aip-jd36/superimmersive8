/**
 * Anthropic adapter for the HRR research-intent classifier (CAH-4G.2 Slice
 * 2, 2026-09-10). One classify-only structured-output call per free-form HRR
 * action; any retry is reliability recovery, never a second reasoning stage.
 *
 * Modeled on `lib/interview-engine/anthropic-decision.ts` (the closest
 * existing analog: small enum schema, low `max_tokens`, GA Structured
 * Outputs, no non-default sampling params) and reuses the shared
 * `callWithOneRecoveryRetry` reliability helper verbatim — no second
 * structured-output stack is created. `thinking` is explicitly DISABLED on
 * every call (matching the extractor's own "Thinking Disable" milestone,
 * 2026-08-26): a pure enum-classification task has no use for a thinking
 * stage, and disabling it removes the un-requested-`thinking`-block failure
 * mode outright. The retry helper is still used — it also covers the SDK's
 * own thrown parse failure.
 *
 * FAIL CLOSED, NEVER THROW. On any failure — provider/SDK error, an
 * unrecoverable structured-output miss after the one retry, a schema/enum
 * violation the deterministic normalizer rejects — this adapter returns
 * `UNSUPPORTED_RESEARCH_INTENT`. It never invents a research intent, never
 * routes "all topics", never falls back to a keyword heuristic, and never
 * answers the question. The `callWithOneRecoveryRetry` telemetry sink still
 * records the underlying miss; a `console.warn` records a post-parse
 * validation rejection.
 *
 * Model: `HRR_INTENT_CLASSIFIER_MODEL` env override, else `claude-sonnet-5`
 * (`HRR_GRI_TECHNICAL_DESIGN.md §S-14` — inherits the interview-engine
 * adapter config pattern; no new HRR-specific model architecture). API key:
 * `ANTHROPIC_API_KEY`, never silently substituted with the mock.
 */

import Anthropic from '@anthropic-ai/sdk'
import { jsonSchemaOutputFormat } from '@anthropic-ai/sdk/helpers/json-schema'
import { callWithOneRecoveryRetry } from '@/lib/interview-engine/anthropic-structured-output-retry'
import {
  RESEARCH_INTENT_CLASSIFIER_SCHEMA,
  RESEARCH_INTENT_SYSTEM_PROMPT,
  unsupportedResearchIntent,
  validateAndNormalizePermittedResearchIntent,
  type ResearchIntentInterpreter,
} from './interpret-research-intent'
import type { PermittedResearchIntent } from './types'

export const DEFAULT_MODEL = 'claude-sonnet-5'

/**
 * Same first-attempt ceiling as the Constraint A decider (1024), whose
 * output is the same size class as this one (a handful of enum fields). The
 * recovery attempt is doubled to give the un-requested `thinking` block more
 * shared headroom before the structured-output block's own budget is
 * exhausted — see `anthropic-structured-output-retry.ts`.
 */
const BASE_CLASSIFIER_MAX_TOKENS = 1024
const RETRY_CLASSIFIER_MAX_TOKENS = 2048

export interface AnthropicResearchIntentOptions {
  apiKey?: string
  model?: string
}

function resolveApiKey(options?: AnthropicResearchIntentOptions): string {
  const apiKey = options?.apiKey ?? process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new Error(
      'ANTHROPIC_API_KEY is not set. Required to run the real HRR research-intent classifier and never silently ' +
        'substituted with the mock. Add it to 08_Platform/app/.env.local (gitignored, never committed). ' +
        'Get a key at https://console.anthropic.com/settings/keys',
    )
  }
  return apiKey
}

function resolveModel(options?: AnthropicResearchIntentOptions): string {
  return options?.model ?? process.env.HRR_INTENT_CLASSIFIER_MODEL ?? DEFAULT_MODEL
}

interface ClassifierResult {
  intent: PermittedResearchIntent
  /** `'model'` — the model produced a valid structured intent. `'fail_closed'` — any failure; `intent` is `UNSUPPORTED_RESEARCH_INTENT`. */
  outcome: 'model' | 'fail_closed'
}

async function classifyOnce(
  client: Anthropic,
  model: string,
  reviewerQuestion: string,
): Promise<ClassifierResult> {
  let parsedOutput: unknown
  try {
    const response = await callWithOneRecoveryRetry(
      'hrr_intent_classifier',
      (maxTokens) =>
        client.messages.parse({
          model,
          max_tokens: maxTokens,
          thinking: { type: 'disabled' },
          system: RESEARCH_INTENT_SYSTEM_PROMPT,
          // The reviewer's question is user-role DATA to classify — never a
          // system instruction. No transcript, no submission facts, no prior
          // question: the free-form classifier does not need project state
          // to determine what the reviewer explicitly asked to research.
          messages: [{ role: 'user', content: reviewerQuestion }],
          output_config: { format: jsonSchemaOutputFormat(RESEARCH_INTENT_CLASSIFIER_SCHEMA) },
          // No temperature/top_p/top_k — API defaults only.
        }),
      BASE_CLASSIFIER_MAX_TOKENS,
      RETRY_CLASSIFIER_MAX_TOKENS,
    )
    parsedOutput = response.parsed_output
  } catch {
    // Provider/SDK error, or an unrecoverable structured-output miss after
    // the one retry (callWithOneRecoveryRetry has already logged it).
    return { intent: unsupportedResearchIntent(), outcome: 'fail_closed' }
  }

  const normalized = validateAndNormalizePermittedResearchIntent(parsedOutput)
  if (!normalized) {
    console.warn(
      '[hrr-intent-classifier] structured output failed deterministic validation — failing closed to unsupported',
    )
    return { intent: unsupportedResearchIntent(), outcome: 'fail_closed' }
  }
  return { intent: normalized, outcome: 'model' }
}

export function createAnthropicResearchIntentInterpreter(
  options?: AnthropicResearchIntentOptions,
): ResearchIntentInterpreter {
  const apiKey = resolveApiKey(options)
  const model = resolveModel(options)
  const client = new Anthropic({ apiKey })

  return async (reviewerQuestion: string): Promise<PermittedResearchIntent> => {
    const { intent } = await classifyOnce(client, model, reviewerQuestion)
    return intent
  }
}

/** Parallel to the other adapters' diagnostics export — for an offline classifier cost/quality eval harness (`HRR_GRI_TECHNICAL_DESIGN.md §V-7`). Not used by the runtime path. */
export async function classifyResearchIntentWithDiagnostics(
  reviewerQuestion: string,
  options?: AnthropicResearchIntentOptions,
): Promise<{ intent: PermittedResearchIntent; outcome: 'model' | 'fail_closed'; latencyMs: number }> {
  const apiKey = resolveApiKey(options)
  const model = resolveModel(options)
  const client = new Anthropic({ apiKey })
  const start = Date.now()
  const result = await classifyOnce(client, model, reviewerQuestion)
  return { intent: result.intent, outcome: result.outcome, latencyMs: Date.now() - start }
}
