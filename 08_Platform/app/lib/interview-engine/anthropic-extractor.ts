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
- kind "project_fact": a fact about the overall project's intended use, the user's own role, or which country's laws they say are relevant (jurisdiction). For jurisdiction specifically: only propose this when the user DIRECTLY states a country/jurisdiction in answer to a question about applicable law -- e.g. "United States", "we're based in Taiwan", "US copyright rules apply here". NEVER infer it from where they mention working, filming, their client's location, or any other indirect signal -- those are separate facts (e.g. workflow details), not a jurisdiction statement. If the user names more than one country or gives an ambiguous answer (e.g. "the client is American but we're filming in Taiwan"), do NOT propose a single jurisdiction value -- either propose nothing for this fact, or propose it with fact_confidence_hint "unknown" to reflect the genuine ambiguity, never guess which one governs.
- kind "user_goal": the user explicitly states what they came here wanting to know or achieve about THIS workflow's commercial readiness -- a question ("Can I use this commercially?", "Will my client own this?") and a declarative need ("My client needs proof this is cleared.", "I'm trying to figure out whether this is okay for a paid campaign.") are equally valid; capture either. This is distinct from project_fact's intended_use: intended_use describes what the OUTPUT is for (e.g. "an AI commercial for my client"); user_goal is what the USER wants to know or achieve regarding commercial readiness. A turn can and often does contain both at once -- propose both candidates when it does, never merge them into one.

A turn stating two distinct goals joined by "and" is still TWO candidates, never one merged candidate, even though they appear in a single sentence.
Example: "Can I use this commercially and do I own the copyright?"
- One user_goal candidate for the commercial-use question, raw_text covering only that part of the sentence.
- One user_goal candidate for the copyright-ownership question, raw_text covering only that part of the sentence.
Do not produce a single candidate whose raw_text is the entire combined sentence -- that discards the fact that two distinct things were asked.

Do NOT propose a user_goal candidate for:
- An incidental question about CRC itself, this conversation, or how the process works -- e.g. "What does CRC do?", "Can I skip this question?", "Why are you asking me that?", "How long will this take?" are never user_goal candidates, regardless of how they're phrased.
- A plain workflow statement with no accompanying question or stated need -- e.g. "I'm using Kling for a client ad." is a tool_mention (and possibly a project_fact), never also a user_goal, unless the user separately states something they want to know or achieve.
- Anything not explicitly stated by the user this turn. Never infer a goal from unrelated workflow facts -- e.g. never propose "the user wants copyright assurance" just because they mentioned a client, a paid campaign, or any other fact that merely sounds adjacent to a commercial-readiness question.

For every user_goal candidate, also propose two independent classification hints. Neither hint is itself an answer to the user -- both exist only so downstream code knows which governed information (if any) might be relevant, and whether the user is asking a question versus asking for a determination.

goal_category_hint -- the goal's coarse subject matter:
- "commercial_use": whether/how the output can be used commercially (e.g. "Can I use this in a paid campaign?", "Is this okay for a client ad?").
- "copyright_ownership": who owns the copyright in the output (e.g. "Do I own this?", "Does my client own the rights?").
- "copyrightability": whether the output can be copyrighted at all, as a category (e.g. "Is AI-generated video even copyrightable?"). Distinct from copyright_ownership -- ownership presupposes something ownable exists; copyrightability asks whether it exists at all. Only use this when the user is asking about the concept in general, not who specifically owns a specific piece.
- "likeness": questions about a real person's face, voice, or likeness appearing in or being cloned by the output.
- "unknown": the goal doesn't clearly fit any of the above, or you're not confident enough to classify it.
Never guess a specific category from adjacent context the user didn't actually state -- e.g. never "copyright_ownership" merely because a client or a paid campaign was mentioned elsewhere in the turn. When genuinely unsure, use "unknown" rather than guessing.

goal_scope_hint -- whether the goal reads as an ordinary informational question/need, or as an explicit request for CRC itself to issue a determination:
- "informational": an ordinary question or stated need about commercial readiness (e.g. "Can I use this commercially?", "My client needs proof this is cleared." -- stating a NEED for proof is still informational, not itself a request that CRC produce that proof right now).
- "determination_request": the user is explicitly asking CRC (this conversation, this tool) to certify, clear, guarantee, or officially determine something right now (e.g. "Can you certify this is safe to use?", "Is this officially cleared?", "Can you confirm this passes?").
Default to "informational" when uncertain -- only use "determination_request" when the user is clearly asking THIS conversation to issue a determination, not merely asking a question about their own commercial readiness.

A single turn can and often does contain multiple distinct facts -- propose one candidate per distinct fact, never merge them into one, and never invent a fact the turn doesn't actually contain.

When a user states that they lack access to, visibility into, or involvement in a process, preserve that as its own candidate fact about respondent visibility/knowledge. If the same turn also states that another person or team owns or manages the process, extract that as a separate confirmed fact. The second fact must not replace or erase the respondent's lack-of-visibility fact -- both belong in the output, as distinct candidates, each with its own correct confidence.

Example: "I don't have access to that -- someone else on the team manages billing and approvals."
- The respondent's own lack of visibility/access is its own candidate, with confidence unresolved_no_visibility.
- That another person/team manages the process is a separate candidate, with confidence confirmed.
Neither candidate should be dropped in favor of the other.

raw_text must be the exact, verbatim portion of the turn each candidate is drawn from -- never paraphrase, never summarize, never correct grammar.

You MUST NOT:
- Decide which specific product a tool name refers to when it could mean more than one thing (e.g. "Nano Banana" could be a consumer app or a developer API -- report it exactly as the user said it, in raw_tool_name, and let downstream code decide whether the turn's own wording is specific enough to resolve it).
- Invent, infer, or fill in a canonical product name, brand name, or internal identifier the user did not say.
- Decide whether a statement should override or replace an earlier one -- only flag with is_correction whether it reads like a correction, never resolve what it corrects.
- Apply any judgment about commercial risk, legal risk, or readiness. You are not evaluating the project, only transcribing what was said about it.

When kind is "tool_mention" and the user DIRECTLY states which specific plan/tier or access surface they used for that tool in THIS turn, also report it via plan_tier_confidence_hint/plan_tier_value_hint and access_surface_confidence_hint/access_surface_value_hint:
- plan_tier_value_hint: the user's own wording for their subscription/account tier (e.g. "paid", "free", "the free plan", "personal paid plan", "business plan", "enterprise plan"). Report their words as stated -- never translate to a specific branded tier name (e.g. "Pro", "Team") they did not themselves say.
- access_surface_value_hint: the user's own wording for HOW they accessed the tool (e.g. "the website", "the app", "the API", "a developer key") -- distinct from plan_tier, which is about their tier of subscription, not the surface they used it through.
- Set the paired confidence_hint to "confirmed" only when the user stated the plan/tier or access surface as a clear, direct fact this turn. If they expressed genuine uncertainty (e.g. "I think it might be Pro"), set confidence_hint to "unknown" instead of "confirmed", and leave the value_hint null.
- Leave both pairs null/unset when the turn says nothing about plan tier or access surface for that tool -- never infer either from generic enthusiasm, unrelated context, or a different tool's plan.
- These two hints are independent: a turn can state one, both, or neither for the same tool mention.

If a turn contains nothing you can classify as one of the four kinds -- small talk, an incomplete thought, pure filler -- return no candidates for it, or set low_confidence: true on a best-effort candidate if you're genuinely unsure whether something is a real signal.`

const CANDIDATE_KIND_VALUES = ['tool_mention', 'scoped_observation', 'project_fact', 'user_goal'] as const
const OBSERVATION_SCOPE_VALUES = ['current_project', 'historical_project', 'general_practice'] as const
const WORKFLOW_STAGE_VALUES = ['T0', 'T1', 'T2', 'T3', 'T4', 'T5'] as const
const CONFIDENCE_HINT_VALUES = ['confirmed', 'confirmed_absent', 'unresolved_no_visibility', 'unknown', 'declined'] as const
const PROJECT_FACT_FIELD_VALUES = ['intended_use', 'workflow_role', 'jurisdiction'] as const
/** Milestone 2 (2026-08-15). Mirrors GOAL_CATEGORIES / GOAL_SCOPES in types/interview-engine.ts -- kept as separate local consts here, same pattern as every other *_VALUES const in this file, rather than importing the runtime const array across the adapter boundary. */
const GOAL_CATEGORY_VALUES = ['commercial_use', 'copyright_ownership', 'copyrightability', 'likeness', 'unknown'] as const
const GOAL_SCOPE_VALUES = ['informational', 'determination_request'] as const

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
              'When kind is tool_mention: return ONLY the tool or platform name itself, preserving the user\'s wording. Do not include surrounding explanation, access-method phrases, punctuation, plan details, or qualifiers -- the complete user wording belongs in raw_text separately, not here. Never map it to a canonical product id or pick between similarly-named products yourself. ' +
              'Valid: "Nano Banana", "Kling", "ElevenLabs". ' +
              'Invalid: "Nano Banana — just the app on my phone" (includes an access-method phrase), "Kling on the paid plan" (includes a plan detail), "ElevenLabs, but only for a temporary voice" (includes a qualifier). ' +
              'Null otherwise.',
          },
          access_surface_confidence_hint: {
            type: ['string', 'null'],
            enum: [...CONFIDENCE_HINT_VALUES, null],
            description:
              "When kind is tool_mention and the user directly stated HOW they accessed the tool this turn (e.g. \"the website\", \"the app\", \"the API\"): confirmed. If they expressed genuine uncertainty about it: unknown. Null when the turn says nothing about access surface for this tool -- never inferred from generic context.",
          },
          access_surface_value_hint: {
            type: ['string', 'null'],
            description:
              "When access_surface_confidence_hint is confirmed: the user's own wording for how they accessed the tool. Null otherwise.",
          },
          plan_tier_confidence_hint: {
            type: ['string', 'null'],
            enum: [...CONFIDENCE_HINT_VALUES, null],
            description:
              "When kind is tool_mention and the user directly stated their plan/subscription/account tier for this tool this turn (e.g. \"free\", \"paid\", \"personal paid plan\", \"business plan\", \"enterprise plan\"): confirmed. If they expressed genuine uncertainty about it (e.g. \"I think it might be Pro\"): unknown. Null when the turn says nothing about plan tier for this tool -- never inferred from generic context, and never a guessed branded tier name.",
          },
          plan_tier_value_hint: {
            type: ['string', 'null'],
            description:
              "When plan_tier_confidence_hint is confirmed: the user's own wording for their plan/tier, preserved as stated -- never translated to a specific branded tier name (e.g. \"Pro\", \"Team\") they did not themselves say. Null otherwise.",
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
              "When kind is project_fact: intended_use (what the output is for), workflow_role (the user's own role), or jurisdiction (which country's laws the user says are relevant -- ONLY when they directly state one; never inferred from where they mention working, their company's location, or any other indirect signal). Null otherwise.",
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
          goal_confidence_hint: {
            type: ['string', 'null'],
            enum: [...CONFIDENCE_HINT_VALUES, null],
            description:
              'When kind is user_goal: confirmed (the user clearly stated a specific goal or question about commercial readiness), confirmed_absent (the user explicitly said they have no particular goal, e.g. "I\'m just experimenting"), declined (the user explicitly declined to say why they\'re here). Null otherwise. The goal\'s own content belongs in raw_text, not here -- this field carries only the confidence state.',
          },
          goal_category_hint: {
            type: ['string', 'null'],
            enum: [...GOAL_CATEGORY_VALUES, null],
            description:
              'When kind is user_goal and goal_confidence_hint is confirmed: the goal\'s coarse subject matter -- commercial_use, copyright_ownership, copyrightability, likeness, or unknown if you cannot confidently classify it. Never guessed from adjacent context the user did not actually state. Null otherwise.',
          },
          goal_scope_hint: {
            type: ['string', 'null'],
            enum: [...GOAL_SCOPE_VALUES, null],
            description:
              'When kind is user_goal and goal_confidence_hint is confirmed: informational (an ordinary question or stated need) or determination_request (the user is explicitly asking CRC itself to certify/clear/determine something right now). Default to informational when uncertain. Null otherwise.',
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
          'access_surface_confidence_hint',
          'access_surface_value_hint',
          'plan_tier_confidence_hint',
          'plan_tier_value_hint',
          'is_correction',
          'correction_of_raw_text',
          'scope',
          'workflow_stage',
          'observation_confidence_hint',
          'raw_fact_field',
          'fact_confidence_hint',
          'fact_value_hint',
          'goal_confidence_hint',
          'goal_category_hint',
          'goal_scope_hint',
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
  access_surface_confidence_hint: (typeof CONFIDENCE_HINT_VALUES)[number] | null
  access_surface_value_hint: string | null
  plan_tier_confidence_hint: (typeof CONFIDENCE_HINT_VALUES)[number] | null
  plan_tier_value_hint: string | null
  is_correction: boolean
  correction_of_raw_text: string | null
  scope: (typeof OBSERVATION_SCOPE_VALUES)[number] | null
  workflow_stage: (typeof WORKFLOW_STAGE_VALUES)[number] | null
  observation_confidence_hint: (typeof CONFIDENCE_HINT_VALUES)[number] | null
  raw_fact_field: (typeof PROJECT_FACT_FIELD_VALUES)[number] | null
  fact_confidence_hint: (typeof CONFIDENCE_HINT_VALUES)[number] | null
  fact_value_hint: string | null
  goal_confidence_hint: (typeof CONFIDENCE_HINT_VALUES)[number] | null
  goal_category_hint: (typeof GOAL_CATEGORY_VALUES)[number] | null
  goal_scope_hint: (typeof GOAL_SCOPE_VALUES)[number] | null
  low_confidence: boolean
}

export function toCandidateObservation(parsed: ParsedCandidate, turn: number): CandidateObservation {
  return {
    proposal_id: parsed.proposal_id,
    turn,
    raw_text: parsed.raw_text,
    kind: parsed.kind,
    raw_tool_name: parsed.raw_tool_name ?? undefined,
    access_surface_confidence_hint: parsed.access_surface_confidence_hint ?? undefined,
    access_surface_value_hint: parsed.access_surface_value_hint ?? undefined,
    plan_tier_confidence_hint: parsed.plan_tier_confidence_hint ?? undefined,
    plan_tier_value_hint: parsed.plan_tier_value_hint ?? undefined,
    is_correction: parsed.is_correction || undefined,
    correction_of_raw_text: parsed.correction_of_raw_text ?? undefined,
    scope: parsed.scope ?? undefined,
    workflow_stage: parsed.workflow_stage ?? undefined,
    observation_confidence_hint: parsed.observation_confidence_hint ?? undefined,
    raw_fact_field: parsed.raw_fact_field ?? undefined,
    fact_confidence_hint: parsed.fact_confidence_hint ?? undefined,
    fact_value_hint: parsed.fact_value_hint ?? undefined,
    goal_confidence_hint: parsed.goal_confidence_hint ?? undefined,
    goal_category_hint: parsed.goal_category_hint ?? undefined,
    goal_scope_hint: parsed.goal_scope_hint ?? undefined,
    low_confidence: parsed.low_confidence || undefined,
  }
}

/**
 * CRC extraction robustness follow-up (2026-08-16, confirmed unrelated to
 * the same-day Living Knowledge deployment -- see the incident's own root-
 * cause trail: `anthropic-extractor.ts` was last touched several commits
 * before that work, in Phase B). Live production failure: a dense real
 * user turn (a tool mention with plan tier, two distinct user_goal
 * candidates, plus prompting/editing detail) produced a structured-output
 * response that got cut off mid-generation, and the Anthropic SDK's own
 * JSON.parse of the truncated text threw "Unterminated string in JSON at
 * position 2728" -- the canonical signature of output truncation, not a
 * parser bug (confirmed by reading the SDK's own source,
 * helpers/json-schema.ts and lib/parser.ts: `JSON.parse` is called
 * directly on the raw response text, and both of the SDK's own two
 * wrapping layers use the literal phrase "Failed to parse structured
 * output" for exactly this failure class, with no internal retry of its
 * own).
 *
 * Two contributing factors, both evidence-based, not assumed:
 *   1. `max_tokens: 2048` (the pre-existing ceiling) is genuinely marginal
 *      for a realistically dense turn under this schema -- every candidate
 *      object requires all 20 schema fields present (nullable-required,
 *      not optional, a deliberate prior design choice for structured-
 *      output reliability -- see CANDIDATE_RESPONSE_SCHEMA's own header),
 *      so even a handful of real candidates carries substantial fixed
 *      per-object overhead before any actual content is counted.
 *   2. The schema's own verbosity (many long field names, all required)
 *      inflates every candidate's size regardless of how much it actually
 *      has to say -- evaluated and deliberately NOT changed here: it's a
 *      documented, working design choice this pipeline already depends on
 *      for structured-output reliability across every other live turn;
 *      shrinking it now would be a larger, independently risky change for
 *      uncertain token savings, not "obvious unnecessary inflation."
 *
 * Fix: (a) a modest, evidence-based max_tokens increase (2048 -> 3072,
 * +50%, sized against the schema's own per-candidate field count above,
 * not a round-number guess), and (b) exactly ONE bounded recovery retry,
 * only when the first call fails with this specific, precisely-matched
 * failure class -- never for a network error, auth failure, rate limit,
 * or any other exception, which all propagate immediately unretried,
 * exactly as before this fix. The retry uses a still-higher ceiling
 * (4096) rather than repeating the same one, since retrying identically
 * would likely reproduce the same truncation for an equally dense turn.
 *
 * `isStructuredOutputParseFailure` matches on message text ("Failed to
 * parse structured output"), not `instanceof Anthropic.AnthropicError` --
 * deliberately: `APIError` (auth failures, rate limits, etc.) also
 * extends `AnthropicError` in the SDK's own class hierarchy, so an
 * `instanceof` check alone would be far too broad and would incorrectly
 * retry failures that have nothing to do with output truncation.
 *
 * `callWithOneRecoveryRetry` is exported and takes an injected call
 * function specifically so the retry/no-retry DECISION LOGIC is unit-
 * testable without a live Anthropic client or network call -- same "test
 * the pure parts, keep the live-model boundary itself thin and untested"
 * discipline this file's own `buildUserMessageContent` already
 * established (see this file's module header and
 * anthropic-extractor-context.test.ts).
 */
export function isStructuredOutputParseFailure(err: unknown): boolean {
  return err instanceof Error && err.message.includes('Failed to parse structured output')
}

const BASE_EXTRACTION_MAX_TOKENS = 3072
const RETRY_EXTRACTION_MAX_TOKENS = 4096

export async function callWithOneRecoveryRetry<T>(
  callOnce: (maxTokens: number) => Promise<T>,
  baseMaxTokens: number = BASE_EXTRACTION_MAX_TOKENS,
  retryMaxTokens: number = RETRY_EXTRACTION_MAX_TOKENS,
): Promise<T> {
  try {
    return await callOnce(baseMaxTokens)
  } catch (err) {
    if (!isStructuredOutputParseFailure(err)) throw err
    try {
      return await callOnce(retryMaxTokens)
    } catch (retryErr) {
      if (isStructuredOutputParseFailure(retryErr)) {
        // Classifiable in the existing retryable_failure pilot-event
        // `detail` column (route.ts) without any new DB column, migration,
        // or analytics event -- the raw message text already carries the
        // classification.
        const message = retryErr instanceof Error ? retryErr.message : String(retryErr)
        throw new Error(`structured_output_truncated: extraction failed after 1 recovery retry -- ${message}`)
      }
      throw retryErr
    }
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
 * Extraction context wiring (Live Interview Runtime milestone,
 * PROTOTYPE_ALPHA_RETROSPECTIVE.md Option D3): when a clarification is
 * pending, prepend a short, deterministic prefix built entirely from
 * `unresolved_summary` (itself deterministic templating, per
 * pending-clarification.ts's own header) -- never the candidate-question
 * generator's own live `question_text`, which is exactly the coupling D3
 * was chosen over D2 to avoid (see Alpha's own D1/D2/D3 comparison). This
 * is the type-level channel added in extraction.ts's own `RawUserTurn`
 * actually being read; every prior call site that never sets
 * `pending_clarification` gets byte-identical prompt content to before
 * this change.
 */
export function buildUserMessageContent(turn: RawUserTurn): string {
  if (!turn.pending_clarification) return turn.text
  return `[Context: your immediately preceding question was about ${turn.pending_clarification.unresolved_summary}. Interpret the following reply in light of that context if it applies.]\n\n${turn.text}`
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
    const response = await callWithOneRecoveryRetry((maxTokens) =>
      client.messages.parse({
        model,
        max_tokens: maxTokens,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: buildUserMessageContent(turn) }],
        output_config: { format: jsonSchemaOutputFormat(CANDIDATE_RESPONSE_SCHEMA) },
        // No `thinking` param: disabled by omission, per Phase 6a substage 2
        // instructions -- this is a bounded extraction task.
        // No temperature/top_p/top_k: API defaults only, per instructions.
      }),
    )

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
  const response = await callWithOneRecoveryRetry((maxTokens) =>
    client.messages.parse({
      model,
      max_tokens: maxTokens,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: buildUserMessageContent(turn) }],
      output_config: { format: jsonSchemaOutputFormat(CANDIDATE_RESPONSE_SCHEMA) },
    }),
  )
  // Measures the FULL operation including a recovery retry if one
  // happened, not just the final call -- an honest latency figure for the
  // eval harness rather than one that looks deceptively fast on a retried
  // turn.
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
