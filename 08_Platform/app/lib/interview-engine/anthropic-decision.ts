/**
 * Anthropic adapter for ConstraintADecider (CRC_PROTOTYPE_ALPHA_ROADMAP.md
 * Phase 6c). The third and last file in lib/interview-engine permitted to
 * import @anthropic-ai/sdk, alongside anthropic-extractor.ts and
 * anthropic-candidate-question.ts -- deliberately not sharing internals
 * with either, for the same decoupling reason both of those already
 * document.
 *
 * The model decides ONLY whether a plausible answer would materially
 * improve structured understanding. It has no knowledge of Constraint B
 * (depth caps, decline scopes, or any enforcement concept) and is never
 * asked whether a question is "good," "useful," "interesting," or likely
 * to help Retrieval -- the system prompt exists specifically to keep this
 * decision genuinely independent of both.
 *
 * Same discipline as the other two adapters: GA Structured Outputs, no
 * non-default sampling parameters. No `thinking` param is set -- but per
 * the CRC 503 Reliability Diagnostic (2026-08-20), the currently-resolved
 * model has been directly observed emitting an un-requested `thinking`
 * content block anyway, sharing the same max_tokens budget as the `text`
 * block that carries the actual structured output. That is the confirmed
 * mechanism behind an intermittent production failure (parsed_output
 * missing, no text block, budget exhausted during thinking) -- see
 * anthropic-structured-output-retry.ts for the bounded recovery retry
 * this file now uses to recover from it. Disabling thinking outright was
 * considered and explicitly deferred (reported, not implemented, in that
 * diagnostic's follow-up implementation task) in favor of this narrower
 * retry-based mitigation.
 *
 * Model configurable via INTERVIEW_CONSTRAINT_A_MODEL, defaulting to
 * claude-sonnet-5.
 */

import Anthropic from '@anthropic-ai/sdk'
import { jsonSchemaOutputFormat } from '@anthropic-ai/sdk/helpers/json-schema'
import { CONSTRAINT_A_REASON_CODES, type ConstraintADecider, type ConstraintADecision, type ConstraintAInput, type ConstraintAReasonCode } from './decision'
import { callWithOneRecoveryRetry } from './anthropic-structured-output-retry'

export const DEFAULT_MODEL = 'claude-sonnet-5'

/**
 * First attempt unchanged (1024 -- task section 8, "do not change the
 * first-attempt behavior unless technically necessary"). Recovery attempt
 * doubled to give the un-requested thinking block more shared headroom
 * before the text block's own budget is exhausted -- the diagnostic's own
 * preferred starting design, not chosen from evidence of the recovery
 * ceiling itself ever being exceeded (13 live calls all stayed well under
 * even the base 1024).
 */
const BASE_DECISION_MAX_TOKENS = 1024
const RETRY_DECISION_MAX_TOKENS = 2048

const SYSTEM_PROMPT = `You are the Constraint A evaluator for CRC, a conversational tool that helps someone understand the commercial-use status of an AI-generated video project. You answer exactly one question: given CRC's current structured understanding of the project and one candidate question it might ask next, would a PLAUSIBLE answer to that question materially improve CRC's own understanding enough to justify asking it?

This is a PROSPECTIVE estimate. The real answer does not exist yet. Consider the space of realistic answers a person might plausibly give, and ask: would AT LEAST ONE realistic answer add a new fact, resolve a genuine ambiguity, correct a potentially wrong impression, or fill a fact that's currently missing? If every plausible answer would only restate something already confirmed, add finer detail than CRC actually needs, or change wording without changing meaning, the question should be suppressed.

Use this categorical judgment, not a numerical score. You are estimating a yes/no outcome about the STRUCTURE of understanding, not rating quality on a scale.

Ask (should_ask: true) typically applies when a plausible answer would:
- resolve an ambiguous, multi-surface tool reference
- establish an intended use that is currently missing
- distinguish whether a fact belongs to the current project or a past one
- clarify a fact the respondent currently lacks personal visibility into
- correct a fact that may have been recorded incorrectly
- disentangle two or more facts bundled together in one earlier answer
- fill a workflow fact that is genuinely missing and needed to understand what was done

Suppress (should_ask: false) typically applies when:
- the fact in question is already confirmed, and the answer would only restate it
- the question asks for detail finer than CRC's understanding actually needs
- the answer would be interesting context but would not change CRC's structural understanding of the situation
- the fact is already resolved with sufficient certainty for CRC's purposes
- the question reads as investigator-style drill-down beyond what CRC needs (e.g. demanding a forensic account of exactly what went wrong)
- the question's only plausible purpose is helping some other system (like a content-matching or example-retrieval system) find things, not improving CRC's own understanding
- the question is a different wording of something already answered, with no new meaning

You MUST NOT:
- Judge whether the question is well-written, interesting, or likely to produce a good conversation. Judge only whether a plausible answer would change CRC's structural understanding.
- Consider whether the question would help any Retrieval system, Knowledge Card, or Matrix lookup find better results. You were not given any of that, and must not assume or infer it exists.
- Consider whether CRC is currently ALLOWED to ask this question (depth caps, how many follow-ups have already been asked, whether the user has declined anything). You have no visibility into that, and it is not your job -- a separate, independent system decides permission. Your only job is whether asking would be worth it on understanding grounds alone, even if it turns out not to be asked for other reasons.

Choose exactly one reason_code from the fixed list you're given, matching the closest category. If a case does not fit one of the named categories, use MATERIALLY_IMPROVES_UNDERSTANDING (for should_ask: true) or NO_MATERIAL_IMPROVEMENT (for should_ask: false) instead of forcing a mismatched category.`

/** Exported (2026-08-21, P0 union-limit guardrail) solely so a deterministic, no-network test can inspect the ACTUAL production schema object -- export-only, zero runtime behavior change. */
export const DECISION_RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    should_ask: {
      type: 'boolean',
      description: 'True if a plausible answer would materially improve structured understanding enough to justify asking.',
    },
    reason_code: {
      type: 'string',
      enum: [...CONSTRAINT_A_REASON_CODES],
      description: 'Exactly one reason code from the fixed list, matching the closest category.',
    },
    rationale: {
      type: 'string',
      description: 'One or two sentences explaining the decision. Diagnostic only, not shown to the end user.',
    },
  },
  required: ['should_ask', 'reason_code', 'rationale'],
  additionalProperties: false,
} as const

interface ParsedDecisionResponse {
  should_ask: boolean
  reason_code: ConstraintAReasonCode
  rationale: string
}

export interface AnthropicDecisionOptions {
  apiKey?: string
  model?: string
}

function resolveApiKey(options?: AnthropicDecisionOptions): string {
  const apiKey = options?.apiKey ?? process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new Error(
      'ANTHROPIC_API_KEY is not set. Required to run real-model Constraint A evaluation and never silently ' +
        'substituted with the mock decider. Add it to 08_Platform/app/.env.local (gitignored, never committed -- ' +
        'see .env.local.example). Get a key at https://console.anthropic.com/settings/keys',
    )
  }
  return apiKey
}

function resolveModel(options?: AnthropicDecisionOptions): string {
  return options?.model ?? process.env.INTERVIEW_CONSTRAINT_A_MODEL ?? DEFAULT_MODEL
}

function buildUserMessage(input: ConstraintAInput): string {
  return JSON.stringify(
    {
      structured_understanding: input.structured_understanding,
      candidate_question: {
        question_text: input.candidate.question_text,
        question_kind: input.candidate.question_kind,
        target_signal_id: input.candidate.target_signal_id,
      },
      current_phase: input.phase,
    },
    null,
    2,
  )
}

export function createAnthropicConstraintADecider(options?: AnthropicDecisionOptions): ConstraintADecider {
  const apiKey = resolveApiKey(options)
  const model = resolveModel(options)
  const client = new Anthropic({ apiKey })

  return async (input: ConstraintAInput): Promise<ConstraintADecision> => {
    const response = await callWithOneRecoveryRetry(
      'decider',
      (maxTokens) =>
        client.messages.parse({
          model,
          max_tokens: maxTokens,
          system: SYSTEM_PROMPT,
          messages: [{ role: 'user', content: buildUserMessage(input) }],
          output_config: { format: jsonSchemaOutputFormat(DECISION_RESPONSE_SCHEMA) },
          // No temperature/top_p/top_k -- API defaults only, unchanged.
        }),
      BASE_DECISION_MAX_TOKENS,
      RETRY_DECISION_MAX_TOKENS,
    )

    const parsed = response.parsed_output as ParsedDecisionResponse | null
    if (!parsed) {
      // Should be unreachable: callWithOneRecoveryRetry only returns
      // successfully when parsed_output has already been confirmed
      // non-null. Kept only for TypeScript null-narrowing, with accurate
      // wording -- not a confirmed schema-validation failure, just a
      // missing structured output (see task section 10).
      throw new Error('anthropic_structured_output_missing: decider response had no parsed output after a successful recovery-retry resolution -- this should be unreachable.')
    }

    return {
      should_ask: parsed.should_ask,
      reason_code: parsed.reason_code,
      rationale: parsed.rationale,
    }
  }
}

/** Parallel to the other two adapters' diagnostics export -- token usage/latency for the eval harness. */
export async function decideWithDiagnostics(
  input: ConstraintAInput,
  options?: AnthropicDecisionOptions,
): Promise<{ decision: ConstraintADecision; inputTokens: number; outputTokens: number; latencyMs: number }> {
  const apiKey = resolveApiKey(options)
  const model = resolveModel(options)
  const client = new Anthropic({ apiKey })

  const start = Date.now()
  const response = await callWithOneRecoveryRetry(
    'decider',
    (maxTokens) =>
      client.messages.parse({
        model,
        max_tokens: maxTokens,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: buildUserMessage(input) }],
        output_config: { format: jsonSchemaOutputFormat(DECISION_RESPONSE_SCHEMA) },
      }),
    BASE_DECISION_MAX_TOKENS,
    RETRY_DECISION_MAX_TOKENS,
  )
  // Measures the FULL operation including a recovery retry if one
  // happened -- same discipline as anthropic-extractor.ts's
  // extractWithDiagnostics, an honest latency figure rather than one that
  // looks deceptively fast on a retried turn.
  const latencyMs = Date.now() - start

  const parsed = response.parsed_output as ParsedDecisionResponse | null
  if (!parsed) {
    // Should be unreachable -- see the production path's identical guard above.
    throw new Error('anthropic_structured_output_missing: decider response had no parsed output after a successful recovery-retry resolution -- this should be unreachable.')
  }

  return {
    decision: { should_ask: parsed.should_ask, reason_code: parsed.reason_code, rationale: parsed.rationale },
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
    latencyMs,
  }
}
