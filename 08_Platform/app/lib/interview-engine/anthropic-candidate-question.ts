/**
 * Anthropic adapter for CandidateQuestionGenerator (CRC_PROTOTYPE_ALPHA_ROADMAP.md
 * Phase 6b, step 5 -- real-model candidate-question generation).
 *
 * The ONLY module besides anthropic-extractor.ts permitted to import
 * @anthropic-ai/sdk, and deliberately does not share internals with it --
 * duplicating the small amount of client setup here keeps this module
 * decoupled from Extraction, rather than accidentally coupling the two
 * subsystems through shared code (see the Phase 6b pre-code critique: "what
 * could accidentally violate the Interview/Extraction separation").
 *
 * The model proposes a question_text, question_kind, and target_signal_id.
 * It NEVER decides whether the question is allowed -- that is entirely
 * validateCandidateReference() (deterministic) and evaluateBoundary()
 * (deterministic, Phase 4, unchanged). It also never mints its own signal
 * identity: target_signal_id must come from the eligible set supplied in
 * the prompt, or be null.
 *
 * Same discipline as anthropic-extractor.ts: GA Structured Outputs, no
 * non-default sampling parameters. No `thinking` param is set -- but per
 * the CRC 503 Reliability Diagnostic (2026-08-20), the currently-resolved
 * model has been directly observed (against the sibling decider adapter,
 * same model, structurally identical call shape) emitting an un-requested
 * `thinking` content block anyway, sharing the same max_tokens budget as
 * the `text` block that carries the actual structured output -- the
 * confirmed mechanism behind this adapter's own latent, structurally
 * identical failure class (parsed_output missing, no text block, budget
 * exhausted during thinking). See anthropic-structured-output-retry.ts
 * for the bounded recovery retry this file now uses to recover from it.
 * Model configurable via INTERVIEW_CANDIDATE_QUESTION_MODEL (deliberately
 * separate from INTERVIEW_EXTRACTOR_MODEL -- two independently-tunable
 * model configs, not one shared setting for two different jobs),
 * defaulting to claude-sonnet-5.
 */

import Anthropic from '@anthropic-ai/sdk'
import { jsonSchemaOutputFormat } from '@anthropic-ai/sdk/helpers/json-schema'
import type {
  CandidateExclusion,
  CandidateQuestionGenerator,
  CandidateQuestionGeneratorInput,
  CandidateQuestionProposal,
} from './candidate-question'
import { CANDIDATE_QUESTION_KINDS, FOLLOW_UP_NEEDS, type CandidateQuestionKind, type FollowUpNeed } from './boundaries'
import { callWithOneRecoveryRetry } from './anthropic-structured-output-retry'

export const DEFAULT_MODEL = 'claude-sonnet-5'

/** Same sizing rationale as the decider -- see anthropic-decision.ts. */
const BASE_CANDIDATE_QUESTION_MAX_TOKENS = 1024
const RETRY_CANDIDATE_QUESTION_MAX_TOKENS = 2048

/**
 * CRC Limited Pilot -- Commercial Readiness Discovery Catalog integration,
 * 2026-08-12. `commercial_readiness_discovery` is deliberately excluded
 * from the LLM-facing schema enum below, even though it is a real,
 * additive CandidateQuestionKind (boundaries.ts). That kind is ONLY ever
 * constructed deterministically by lib/crc-engine/commercial-readiness-
 * catalog.ts, from a fixed per-category question text, never freely
 * generated -- this adapter's own system prompt (unchanged, below) has no
 * instructions describing when to use it, and giving the model the option
 * anyway would let it emit an ungoverned "discovery" question with no
 * known category, meaning no fixed Educational Takeaway to pair it with.
 * Removing it from the enum makes that structurally unreachable rather
 * than relying on the model simply never choosing an undocumented value.
 */
const ORDINARY_GENERATOR_QUESTION_KINDS = CANDIDATE_QUESTION_KINDS.filter(
  (k) =>
    k !== 'commercial_readiness_discovery' &&
    k !== 'jurisdiction_clarification' &&
    k !== 'human_contribution_clarification' &&
    // Second-Jurisdiction UX milestone (2026-08-20), J3: same reasoning as
    // the three exclusions above -- deterministically constructed by
    // jurisdiction-clarification.ts's buildJurisdictionClarificationRetryProposal
    // from fixed copy, never freely generated.
    k !== 'jurisdiction_clarification_retry' &&
    // Track B — Generic Living-Knowledge Readiness/Askability milestone
    // (2026-08-20): same reasoning as every exclusion above -- deterministically
    // constructed by lib/crc-engine/knowledge-readiness.ts from a registry-owned
    // fixed question_text, never freely generated. This adapter's own system
    // prompt has no instructions describing when to use it or what
    // readiness_dependency_id values exist, so leaving it in the enum would let
    // the model emit an ungoverned readiness-shaped question with no real
    // dependency behind it.
    k !== 'knowledge_readiness_acquisition',
)

const SYSTEM_PROMPT = `You are the candidate-question generation stage of a larger, deterministic pipeline for CRC, a conversational tool that helps someone understand the commercial-use status of an AI-generated video project. Your only job is to propose ONE next question CRC might ask, given its current structured understanding of the project. You are not the only stage: everything you produce is a PROPOSAL, checked by deterministic code downstream that decides whether it is actually permitted to ask. You never see or affect whether your proposal gets used.

You will be given the current structured understanding of the project (as JSON) and a list of "eligible signals" -- the only identifiers you are allowed to reference if your question follows up on something specific.

Classify your proposed question into exactly one of these kinds:
- "follow_up_on_signal": a clarifying follow-up about something already recorded (scope, actor, request, or directness) -- never an incident investigation.
- "uncertainty_clarification": distinguishing whether the respondent lacks personal visibility into something versus it genuinely being unknown to anyone.
- "historical_experience": asking whether anything comparable has come up on a past, unrelated project -- only when nothing historical has surfaced naturally yet.
- "incident_investigation": drilling into the specifics of what went wrong on something -- you may classify a question this way, but understand downstream code will always refuse to ask it. Do not be clever about avoiding this classification if a question genuinely is this.
- "disentangling_question": asking which of two or more bundled, ambiguous facts applies to which project or time period -- only when a bundled answer genuinely can't be told apart otherwise.
- "other": an ordinary discovery question not covered by the above (e.g. simple Phase 1-2 project/workflow questions).

You MUST NOT:
- Invent, mint, or guess a target_signal_id. If your question follows up on something specific, target_signal_id MUST be exactly one of the ids in the eligible signal list you were given. If your question is general, or a disentangling question about the relationship between multiple signals, set target_signal_id to null.
- Decide whether your proposed question is allowed, wise, or worth asking. That is not your job.
- Reference or reason about Retrieval results, Knowledge Cards, Matrix contents, or commercial-readiness conclusions -- you were not given any of these, and must not assume or invent them.
- Propose a question about something already fully resolved with no remaining ambiguity, unless there is a genuine natural next thing to ask elsewhere in the understanding.

If there is no natural next question to propose -- understanding is already complete, or nothing further makes sense to ask right now -- set has_candidate to false and leave the other fields null.

Duplicate-Question Prevention (2026-08-19): if your target_signal_id refers to an asset-provider mention -- a named third-party source like iStock, Getty, or Shutterstock -- you MUST set target_follow_up_need to whichever of these two this specific question is about:
- "asset_provider_usage": how the asset was used in the workflow (e.g. uploaded as a reference image, used directly as a generation input, or some other use).
- "asset_provider_license": what license, purchase, or permission the user has for that asset.
These are DIFFERENT questions about the same provider and are tracked independently -- do not assume one is answered just because the other is.
If your target_signal_id refers to a tool mention and your question specifically asks which plan or access tier the user used (not anything else about the tool), set target_follow_up_need to "tool_plan_tier".
For every other question, leave target_follow_up_need null. Never guess a value here merely because a question happens to mention an asset provider or a tool -- only set it when the question IS specifically about one of these three narrow things.
Deterministic code downstream uses target_follow_up_need to avoid re-asking something already answered -- it does not affect whether your question is otherwise permitted.`

/**
 * CRC Limited Pilot -- Model 4 (bounded alternative-question search),
 * 2026-08-10. Deterministic templating only -- structured (kind,
 * signal_id) facts, never Constraint A/B's own rationale prose. This is
 * the entire content boundary: the model is told WHAT was already tried,
 * never WHY it was rejected, keeping generation decoupled from
 * Constraint A/B's own judgment exactly as candidate-question.ts's own
 * header requires ("the model must not decide whether its proposal is
 * allowed, wise, or worth asking").
 */
function buildExclusionInstruction(excluded: CandidateExclusion[] | undefined): string {
  if (!excluded || excluded.length === 0) return ''
  const lines = excluded.map((e) => (e.signal_id ? `- kind "${e.kind}" targeting signal_id "${e.signal_id}"` : `- kind "${e.kind}" (no specific signal)`))
  return `\n\nThis is a second attempt. The following question(s) were already tried this turn and are not permitted again -- propose something genuinely different, either a different signal or a different kind of question, not a reworded repeat of any of these:\n${lines.join('\n')}`
}

/** Exported (2026-08-21, P0 union-limit guardrail) solely so a deterministic, no-network test can inspect the ACTUAL production schema object -- export-only, zero runtime behavior change. */
export const CANDIDATE_QUESTION_RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    has_candidate: {
      type: 'boolean',
      description: 'False if there is no natural next question to propose right now. When false, the other fields must be null.',
    },
    question_text: {
      type: ['string', 'null'],
      description: 'The natural-language question you propose asking, in CRC\'s own conversational voice. Null when has_candidate is false.',
    },
    question_kind: {
      type: ['string', 'null'],
      enum: [...ORDINARY_GENERATOR_QUESTION_KINDS, null],
      description: 'Which of the defined kinds this question is. Null when has_candidate is false.',
    },
    target_signal_id: {
      type: ['string', 'null'],
      description:
        'Must be exactly one of the eligible signal ids supplied to you, or null if the question is general or spans multiple signals. Never invented.',
    },
    target_follow_up_need: {
      type: ['string', 'null'],
      enum: [...FOLLOW_UP_NEEDS, null],
      description:
        'Set ONLY when this question is specifically about one of these narrow, known needs (see system prompt for exact definitions); null otherwise. Never guessed.',
    },
  },
  required: ['has_candidate', 'question_text', 'question_kind', 'target_signal_id', 'target_follow_up_need'],
  additionalProperties: false,
} as const

interface ParsedCandidateQuestionResponse {
  has_candidate: boolean
  question_text: string | null
  question_kind: CandidateQuestionKind | null
  target_signal_id: string | null
  target_follow_up_need: FollowUpNeed | null
}

export interface AnthropicCandidateQuestionOptions {
  apiKey?: string
  model?: string
}

function resolveApiKey(options?: AnthropicCandidateQuestionOptions): string {
  const apiKey = options?.apiKey ?? process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new Error(
      'ANTHROPIC_API_KEY is not set. Required to run real-model candidate-question generation and never ' +
        'silently substituted with the mock generator. Add it to 08_Platform/app/.env.local (gitignored, ' +
        'never committed -- see .env.local.example). Get a key at https://console.anthropic.com/settings/keys',
    )
  }
  return apiKey
}

function resolveModel(options?: AnthropicCandidateQuestionOptions): string {
  return options?.model ?? process.env.INTERVIEW_CANDIDATE_QUESTION_MODEL ?? DEFAULT_MODEL
}

function buildUserMessage(input: CandidateQuestionGeneratorInput): string {
  return (
    JSON.stringify(
      {
        structured_understanding: input.structured_understanding,
        eligible_signals: input.eligible_signals,
        current_phase: input.phase,
      },
      null,
      2,
    ) + buildExclusionInstruction(input.excluded)
  )
}

export function createAnthropicCandidateQuestionGenerator(
  options?: AnthropicCandidateQuestionOptions,
): CandidateQuestionGenerator {
  const apiKey = resolveApiKey(options)
  const model = resolveModel(options)
  const client = new Anthropic({ apiKey })

  return async (input: CandidateQuestionGeneratorInput): Promise<CandidateQuestionProposal | null> => {
    const response = await callWithOneRecoveryRetry(
      'candidate_generator',
      (maxTokens) =>
        client.messages.parse({
          model,
          max_tokens: maxTokens,
          system: SYSTEM_PROMPT,
          messages: [{ role: 'user', content: buildUserMessage(input) }],
          output_config: { format: jsonSchemaOutputFormat(CANDIDATE_QUESTION_RESPONSE_SCHEMA) },
          // No temperature/top_p/top_k -- API defaults only, unchanged.
        }),
      BASE_CANDIDATE_QUESTION_MAX_TOKENS,
      RETRY_CANDIDATE_QUESTION_MAX_TOKENS,
    )

    const parsed = response.parsed_output as ParsedCandidateQuestionResponse | null
    if (!parsed) {
      // Should be unreachable -- see anthropic-decision.ts's identical guard.
      throw new Error('anthropic_structured_output_missing: candidate generator response had no parsed output after a successful recovery-retry resolution -- this should be unreachable.')
    }
    if (!parsed.has_candidate || !parsed.question_text || !parsed.question_kind) {
      return null
    }

    return {
      question_text: parsed.question_text,
      question_kind: parsed.question_kind,
      target_signal_id: parsed.target_signal_id,
      phase: input.phase,
      target_follow_up_need: parsed.target_follow_up_need,
    }
  }
}

/**
 * Parallel to anthropic-extractor.ts's extractWithDiagnostics -- surfaces
 * token usage and latency for the evaluation harness, kept separate from
 * the plain CandidateQuestionGenerator return shape.
 */
export async function generateWithDiagnostics(
  input: CandidateQuestionGeneratorInput,
  options?: AnthropicCandidateQuestionOptions,
): Promise<{
  proposal: CandidateQuestionProposal | null
  inputTokens: number
  outputTokens: number
  latencyMs: number
}> {
  const apiKey = resolveApiKey(options)
  const model = resolveModel(options)
  const client = new Anthropic({ apiKey })

  const start = Date.now()
  const response = await callWithOneRecoveryRetry(
    'candidate_generator',
    (maxTokens) =>
      client.messages.parse({
        model,
        max_tokens: maxTokens,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: buildUserMessage(input) }],
        output_config: { format: jsonSchemaOutputFormat(CANDIDATE_QUESTION_RESPONSE_SCHEMA) },
      }),
    BASE_CANDIDATE_QUESTION_MAX_TOKENS,
    RETRY_CANDIDATE_QUESTION_MAX_TOKENS,
  )
  // Measures the FULL operation including a recovery retry if one
  // happened -- same discipline as anthropic-extractor.ts's own
  // extractWithDiagnostics.
  const latencyMs = Date.now() - start

  const parsed = response.parsed_output as ParsedCandidateQuestionResponse | null
  if (!parsed) {
    // Should be unreachable -- see the production path's identical guard above.
    throw new Error('anthropic_structured_output_missing: candidate generator response had no parsed output after a successful recovery-retry resolution -- this should be unreachable.')
  }

  const proposal =
    !parsed.has_candidate || !parsed.question_text || !parsed.question_kind
      ? null
      : {
          question_text: parsed.question_text,
          question_kind: parsed.question_kind,
          target_signal_id: parsed.target_signal_id,
          phase: input.phase,
          target_follow_up_need: parsed.target_follow_up_need,
        }

  return {
    proposal,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
    latencyMs,
  }
}
