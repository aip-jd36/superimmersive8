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
 * `thinking`, no non-default sampling parameters. Model configurable via
 * INTERVIEW_CANDIDATE_QUESTION_MODEL (deliberately separate from
 * INTERVIEW_EXTRACTOR_MODEL -- two independently-tunable model configs, not
 * one shared setting for two different jobs), defaulting to claude-sonnet-5.
 */

import Anthropic from '@anthropic-ai/sdk'
import { jsonSchemaOutputFormat } from '@anthropic-ai/sdk/helpers/json-schema'
import type {
  CandidateExclusion,
  CandidateQuestionGenerator,
  CandidateQuestionGeneratorInput,
  CandidateQuestionProposal,
} from './candidate-question'
import { CANDIDATE_QUESTION_KINDS, type CandidateQuestionKind } from './boundaries'

export const DEFAULT_MODEL = 'claude-sonnet-5'

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
const ORDINARY_GENERATOR_QUESTION_KINDS = CANDIDATE_QUESTION_KINDS.filter((k) => k !== 'commercial_readiness_discovery' && k !== 'jurisdiction_clarification')

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

If there is no natural next question to propose -- understanding is already complete, or nothing further makes sense to ask right now -- set has_candidate to false and leave the other fields null.`

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

const CANDIDATE_QUESTION_RESPONSE_SCHEMA = {
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
  },
  required: ['has_candidate', 'question_text', 'question_kind', 'target_signal_id'],
  additionalProperties: false,
} as const

interface ParsedCandidateQuestionResponse {
  has_candidate: boolean
  question_text: string | null
  question_kind: CandidateQuestionKind | null
  target_signal_id: string | null
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
    const response = await client.messages.parse({
      model,
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: buildUserMessage(input) }],
      output_config: { format: jsonSchemaOutputFormat(CANDIDATE_QUESTION_RESPONSE_SCHEMA) },
      // No `thinking`, no temperature/top_p/top_k -- same discipline as anthropic-extractor.ts.
    })

    const parsed = response.parsed_output as ParsedCandidateQuestionResponse | null
    if (!parsed) {
      throw new Error('Anthropic response did not include parsed_output -- schema validation may have failed.')
    }
    if (!parsed.has_candidate || !parsed.question_text || !parsed.question_kind) {
      return null
    }

    return {
      question_text: parsed.question_text,
      question_kind: parsed.question_kind,
      target_signal_id: parsed.target_signal_id,
      phase: input.phase,
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
  const response = await client.messages.parse({
    model,
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: buildUserMessage(input) }],
    output_config: { format: jsonSchemaOutputFormat(CANDIDATE_QUESTION_RESPONSE_SCHEMA) },
  })
  const latencyMs = Date.now() - start

  const parsed = response.parsed_output as ParsedCandidateQuestionResponse | null
  if (!parsed) {
    throw new Error('Anthropic response did not include parsed_output -- schema validation may have failed.')
  }

  const proposal =
    !parsed.has_candidate || !parsed.question_text || !parsed.question_kind
      ? null
      : {
          question_text: parsed.question_text,
          question_kind: parsed.question_kind,
          target_signal_id: parsed.target_signal_id,
          phase: input.phase,
        }

  return {
    proposal,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
    latencyMs,
  }
}
