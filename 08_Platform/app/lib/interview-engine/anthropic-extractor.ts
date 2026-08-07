/**
 * Anthropic adapter for CandidateExtractor (CRC_PROTOTYPE_ALPHA_ROADMAP.md
 * Phase 6a substage 2 -- real-model extraction evaluation).
 *
 * The ONLY module in lib/interview-engine permitted to import
 * @anthropic-ai/sdk. The canonical pipeline (extraction.ts) and domain
 * types (types/interview-engine.ts) never see an Anthropic-specific type --
 * this file's public surface is exactly one function returning a plain
 * CandidateExtractor, matching the same interface the mock extractor
 * implements.
 *
 * Model responsibility (enforced by the schema and system prompt below, not
 * assumed): the model may only produce CandidateObservation[]. It preserves
 * raw_text verbatim, classifies rough candidate kind, and reports raw tool
 * names / project-fact fields as stated. It must NEVER canonicalize an
 * alias, choose between Gemini Consumer App and Gemini API, mutate
 * Structured Understanding, decide supersession validity, apply gates or
 * boundaries, or make commercial/legal judgments -- all of that remains in
 * the deterministic pipeline (normalizeCandidate, attestCandidate,
 * mutations.ts, gates.ts, boundaries.ts), untouched by this module.
 *
 * Uses Anthropic's GA Structured Outputs (`output_config.format`, type
 * json_schema) rather than parsing prose or loosely-prompted JSON -- the
 * response is guaranteed schema-conformant by the API itself.
 *
 * Extended thinking is not enabled (no `thinking` param) -- this is a
 * bounded, single-turn extraction task, not a task calling for deliberation.
 * No sampling parameters (temperature/top_p/top_k) are set -- SDK/API
 * defaults only.
 */

import Anthropic from '@anthropic-ai/sdk'
import { jsonSchemaOutputFormat } from '@anthropic-ai/sdk/helpers/json-schema'
import type { CandidateExtractor, CandidateObservation, RawUserTurn } from './extraction'

export const DEFAULT_MODEL = 'claude-sonnet-5'

const SYSTEM_PROMPT = `You are the candidate-observation extraction stage of a larger, deterministic pipeline. Your only job is to read one user turn from a conversation about an AI-generated video project and propose a list of CandidateObservation objects describing what was said. You are not the only stage: everything you produce is a PROPOSAL, reviewed and possibly rejected by deterministic code downstream. You never see or affect the final state.

For each distinct fact-bearing statement in the turn, produce one candidate:
- kind "tool_mention": the user names a tool/platform/app they used.
- kind "scoped_observation": a fact about the project's process, review, or workflow (e.g. who reviewed it, what stage it's at, whether something happened).
- kind "project_fact": a fact about the overall project's intended use, or the user's own role.

A single turn can and often does contain multiple distinct facts -- propose one candidate per distinct fact, never merge them into one, and never invent a fact the turn doesn't actually contain.

raw_text must be the exact, verbatim portion of the turn each candidate is drawn from -- never paraphrase, never summarize, never correct grammar.

You MUST NOT:
- Decide which specific product a tool name refers to when it could mean more than one thing (e.g. "Nano Banana" could be a consumer app or a developer API -- report it exactly as the user said it, in raw_tool_name, and let downstream code decide whether the turn's own wording is specific enough to resolve it).
- Invent, infer, or fill in a canonical product name, brand name, or internal identifier the user did not say.
- Decide whether a statement should override or replace an earlier one -- only flag with is_correction whether it reads like a correction, never resolve what it corrects.
- Apply any judgment about commercial risk, legal risk, or readiness. You are not evaluating the project, only transcribing what was said about it.

If a turn contains nothing you can classify as one of the three kinds -- small talk, an incomplete thought, pure filler -- return no candidates for it, or set low_confidence: true on a best-effort candidate if you're genuinely unsure whether something is a real signal.`

const CANDIDATE_KIND_VALUES = ['tool_mention', 'scoped_observation', 'project_fact'] as const
const OBSERVATION_SCOPE_VALUES = ['current_project', 'historical_project', 'general_practice'] as const
const WORKFLOW_STAGE_VALUES = ['T0', 'T1', 'T2', 'T3', 'T4', 'T5'] as const
const CONFIDENCE_HINT_VALUES = ['confirmed', 'confirmed_absent', 'unresolved_no_visibility', 'unknown', 'declined'] as const
const PROJECT_FACT_FIELD_VALUES = ['intended_use', 'workflow_role'] as const

/**
 * The model-facing schema. All fields are required (nullable rather than
 * optional) -- structured-output grammars generally expect a fixed key set
 * per object; the model expresses "not applicable" via explicit null, never
 * omission. Kept deliberately smaller than the canonical CandidateObservation
 * type: no supersedes_tool_mention_id/supersedes_observation_id (the model
 * cannot know this pipeline's internal ids), no `turn` (the adapter stamps
 * it from the RawUserTurn it was given, not from anything the model reports).
 */
const CANDIDATE_RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    candidates: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          proposal_id: {
            type: 'string',
            description: 'A short unique id you assign for this candidate within this turn, e.g. "c1", "c2".',
          },
          raw_text: {
            type: 'string',
            description: 'The exact, verbatim portion of the user turn this candidate is drawn from. Never paraphrase.',
          },
          kind: { type: 'string', enum: [...CANDIDATE_KIND_VALUES] },
          raw_tool_name: {
            type: ['string', 'null'],
            description:
              'When kind is tool_mention: the tool name exactly as the user said it. Never map it to a canonical product id or pick between similarly-named products yourself. Null otherwise.',
          },
          is_correction: {
            type: 'boolean',
            description: 'True if this statement corrects or contradicts something the user said earlier in the conversation.',
          },
          correction_of_raw_text: {
            type: ['string', 'null'],
            description:
              'If is_correction is true, a short quote or paraphrase of the earlier statement being corrected, if identifiable. Null otherwise.',
          },
          scope: {
            type: ['string', 'null'],
            enum: [...OBSERVATION_SCOPE_VALUES, null],
            description:
              'When kind is scoped_observation: whether this is about the current project, a past/historical project, or a general practice. Null otherwise.',
          },
          workflow_stage: {
            type: ['string', 'null'],
            enum: [...WORKFLOW_STAGE_VALUES, null],
            description:
              'When kind is scoped_observation and a specific production stage is identifiable: T0 pre-production, T1 generation, T2 review/approval, T3 delivery, T4 distribution, T5 post-delivery. Null otherwise or if unclear.',
          },
          observation_confidence_hint: {
            type: ['string', 'null'],
            enum: [...CONFIDENCE_HINT_VALUES, null],
            description:
              'When kind is scoped_observation: confirmed (stated as true), confirmed_absent (stated as NOT happening), unresolved_no_visibility (user lacks personal visibility but it may be true), unknown (genuinely nobody knows), declined (user refused to answer). Null otherwise.',
          },
          raw_fact_field: {
            type: ['string', 'null'],
            enum: [...PROJECT_FACT_FIELD_VALUES, null],
            description:
              "When kind is project_fact: intended_use (what the output is for) or workflow_role (the user's own role). Null otherwise.",
          },
          fact_confidence_hint: {
            type: ['string', 'null'],
            enum: [...CONFIDENCE_HINT_VALUES, null],
            description: 'When kind is project_fact: same confidence taxonomy as observation_confidence_hint. Null otherwise.',
          },
          fact_value_hint: {
            type: ['string', 'null'],
            description:
              "When kind is project_fact and fact_confidence_hint is confirmed: the value in the user's own words. Null otherwise.",
          },
          low_confidence: {
            type: 'boolean',
            description:
              'True if you are not confident this raw text represents a real, classifiable fact at all -- filler, unrelated small talk, or too vague to categorize.',
          },
        },
        required: [
          'proposal_id',
          'raw_text',
          'kind',
          'raw_tool_name',
          'is_correction',
          'correction_of_raw_text',
          'scope',
          'workflow_stage',
          'observation_confidence_hint',
          'raw_fact_field',
          'fact_confidence_hint',
          'fact_value_hint',
          'low_confidence',
        ],
        additionalProperties: false,
      },
    },
  },
  required: ['candidates'],
  additionalProperties: false,
} as const

interface ParsedCandidate {
  proposal_id: string
  raw_text: string
  kind: (typeof CANDIDATE_KIND_VALUES)[number]
  raw_tool_name: string | null
  is_correction: boolean
  correction_of_raw_text: string | null
  scope: (typeof OBSERVATION_SCOPE_VALUES)[number] | null
  workflow_stage: (typeof WORKFLOW_STAGE_VALUES)[number] | null
  observation_confidence_hint: (typeof CONFIDENCE_HINT_VALUES)[number] | null
  raw_fact_field: (typeof PROJECT_FACT_FIELD_VALUES)[number] | null
  fact_confidence_hint: (typeof CONFIDENCE_HINT_VALUES)[number] | null
  fact_value_hint: string | null
  low_confidence: boolean
}

function toCandidateObservation(parsed: ParsedCandidate, turn: number): CandidateObservation {
  return {
    proposal_id: parsed.proposal_id,
    turn,
    raw_text: parsed.raw_text,
    kind: parsed.kind,
    raw_tool_name: parsed.raw_tool_name ?? undefined,
    is_correction: parsed.is_correction || undefined,
    correction_of_raw_text: parsed.correction_of_raw_text ?? undefined,
    scope: parsed.scope ?? undefined,
    workflow_stage: parsed.workflow_stage ?? undefined,
    observation_confidence_hint: parsed.observation_confidence_hint ?? undefined,
    raw_fact_field: parsed.raw_fact_field ?? undefined,
    fact_confidence_hint: parsed.fact_confidence_hint ?? undefined,
    fact_value_hint: parsed.fact_value_hint ?? undefined,
    low_confidence: parsed.low_confidence || undefined,
  }
}

export interface AnthropicExtractorOptions {
  apiKey?: string
  model?: string
}

function resolveApiKey(options?: AnthropicExtractorOptions): string {
  const apiKey = options?.apiKey ?? process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new Error(
      'ANTHROPIC_API_KEY is not set. This is required to run the real-model extraction evaluator ' +
        '(npm run eval:extraction) and is never silently substituted with the mock extractor. ' +
        'Add it to 08_Platform/app/.env.local (gitignored, never committed -- see .env.local.example ' +
        'for the placeholder). Get a key at https://console.anthropic.com/settings/keys',
    )
  }
  return apiKey
}

function resolveModel(options?: AnthropicExtractorOptions): string {
  return options?.model ?? process.env.INTERVIEW_EXTRACTOR_MODEL ?? DEFAULT_MODEL
}

/**
 * Returns a plain CandidateExtractor -- interchangeable with
 * constantExtractor() from mock-extractor.ts wherever a CandidateExtractor
 * is expected. Throws immediately (does not fall back to the mock) if no
 * API key is available.
 */
export function createAnthropicExtractor(options?: AnthropicExtractorOptions): CandidateExtractor {
  const apiKey = resolveApiKey(options)
  const model = resolveModel(options)
  const client = new Anthropic({ apiKey })

  return async (turn: RawUserTurn): Promise<CandidateObservation[]> => {
    const response = await client.messages.parse({
      model,
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: turn.text }],
      output_config: { format: jsonSchemaOutputFormat(CANDIDATE_RESPONSE_SCHEMA) },
      // No `thinking` param: disabled by omission, per Phase 6a substage 2
      // instructions -- this is a bounded extraction task.
      // No temperature/top_p/top_k: API defaults only, per instructions.
    })

    const parsed = response.parsed_output
    if (!parsed) {
      throw new Error('Anthropic response did not include parsed_output -- schema validation may have failed.')
    }

    return parsed.candidates.map((c) => toCandidateObservation(c as ParsedCandidate, turn.turn))
  }
}

/**
 * Same call as createAnthropicExtractor()'s returned function, but also
 * surfaces token usage and latency -- needed for the evaluation harness's
 * required metrics, kept out of the plain CandidateExtractor return shape
 * so that shape stays identical between the mock and this adapter.
 */
export async function extractWithDiagnostics(
  turn: RawUserTurn,
  options?: AnthropicExtractorOptions,
): Promise<{
  candidates: CandidateObservation[]
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
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: turn.text }],
    output_config: { format: jsonSchemaOutputFormat(CANDIDATE_RESPONSE_SCHEMA) },
  })
  const latencyMs = Date.now() - start

  const parsed = response.parsed_output
  if (!parsed) {
    throw new Error('Anthropic response did not include parsed_output -- schema validation may have failed.')
  }

  return {
    candidates: parsed.candidates.map((c) => toCandidateObservation(c as ParsedCandidate, turn.turn)),
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
    latencyMs,
  }
}
