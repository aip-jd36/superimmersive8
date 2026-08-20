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
 * No `thinking` param is set -- but per the CRC 503 Reliability
 * Diagnostic (2026-08-20), the currently-resolved model has been directly
 * observed (against the sibling decider/candidate-generator adapters,
 * same model) emitting an un-requested `thinking` content block anyway,
 * sharing the same max_tokens budget as the `text` block carrying actual
 * structured output. See callWithStructuredOutputRecoveryRetry below
 * (Extractor Structured-Output Recovery Extension, 2026-08-20) for the
 * bounded recovery retry this file now uses to recover from that
 * condition, in addition to this file's original SDK-parse-failure
 * recovery (callWithOneRecoveryRetry). No sampling parameters
 * (temperature/top_p/top_k) are set -- SDK/API defaults only.
 */

import Anthropic from '@anthropic-ai/sdk'
import { jsonSchemaOutputFormat } from '@anthropic-ai/sdk/helpers/json-schema'
import type { CandidateExtractor, CandidateObservation, RawUserTurn } from './extraction'
import { classifyMissingParsedOutput, type MinimalParsedAnthropicResponse, type StructuredOutputFailureClass } from './anthropic-structured-output-retry'

export const DEFAULT_MODEL = 'claude-sonnet-5'

const SYSTEM_PROMPT = `You are the candidate-observation extraction stage of a larger, deterministic pipeline. Your only job is to read one user turn from a conversation about an AI-generated video project and propose a list of CandidateObservation objects describing what was said. You are not the only stage: everything you produce is a PROPOSAL, reviewed and possibly rejected by deterministic code downstream. You never see or affect the final state.

For each distinct fact-bearing statement in the turn, produce one candidate:
- kind "tool_mention": the user names an AI generation tool/platform/app they used to CREATE something (e.g. Runway, Kling, ElevenLabs). Never use this for a third-party source/stock media provider -- see "asset_provider_mention" below for that distinct concept.
- kind "scoped_observation": a fact about the project's process, review, or workflow (e.g. who reviewed it, what stage it's at, whether something happened).
- kind "project_fact": a fact about the overall project's intended use, the user's own role, which country's laws they say are relevant (jurisdiction), or what the user personally did to shape the final output (human_contribution_description). For jurisdiction specifically: only propose this when the user DIRECTLY states a country/jurisdiction in answer to a question about applicable law -- e.g. "United States", "we're based in Taiwan", "US copyright rules apply here". NEVER infer it from where they mention working, filming, their client's location, or any other indirect signal -- those are separate facts (e.g. workflow details), not a jurisdiction statement. If the user names more than one country or gives an ambiguous answer (e.g. "the client is American but we're filming in Taiwan"), do NOT propose a single jurisdiction value -- either propose nothing for this fact, or propose it with fact_confidence_hint "unknown" to reflect the genuine ambiguity, never guess which one governs.
  EXCEPTION -- only when the message includes the "[Context: your immediately preceding question directly asked the user which country's copyright rules are most relevant...]" prefix (Second-Jurisdiction UX milestone, 2026-08-20): in that specific context, the user is directly answering CRC's own explicit legal-jurisdiction question, so a concise, otherwise-indirect-looking location reply -- a bare country name or common abbreviation ("US", "USA", "America", "Canada"), or a sentence naming where the client and/or project is based ("My client is in the US.", "The project is in the United States.", "We're in the US.") -- MAY be proposed as the jurisdiction answer (normalize a plain abbreviation/short form to its country name, e.g. "US"/"USA"/"America" -> "United States", exactly the same kind of ordinary normalization "we're based in Taiwan" already gets; do not invent aliases for countries not named). This exception applies ONLY to the turn carrying that exact context prefix. Without it, the original rule above (client/company location is never sufficient on its own) applies exactly as written -- do not apply this relaxed reading to any other turn, and it does not change the "more than one country / genuinely ambiguous" rule above, which still applies.
  For human_contribution_description specifically: propose this when the user directly describes what THEY PERSONALLY did to shape the FINAL VIDEO ITSELF, beyond (or instead of) entering prompts -- e.g. "I only wrote prompts", "I trimmed the beginning and end", "I selected several clips and reordered them", "I edited timing, added transitions, and composited several generated elements". This is specifically about shaping the OUTPUT (selecting takes, arranging the sequence, editing, compositing, directing what was generated) -- it is NOT about sourcing, creating, or supplying INPUT MATERIAL or handling OTHER PROJECT LOGISTICS. Do NOT propose a human_contribution_description candidate for statements like "I sourced everything else on my end", "I uploaded the reference images", "I created the mood board", "I sourced the music", "I handled the client relationship", "I produced the campaign", "I made the logo card" -- these are about supplying/sourcing material or managing the project, a different and separate kind of fact (capture them as a scoped_observation if they are a real, distinct project fact worth recording; never fold them into human_contribution_description). This distinction matters most, and is easy to get wrong, once a description has already been given: see the "[Context: the user has ALREADY confirmed...]" prefix below.
  Report the user's own description in compact free text via fact_value_hint, preserving what they actually said they did. You MUST NOT normalize, categorize, or rank this into any of "none"/"low"/"medium"/"high"/"meaningful"/"substantial"/"sufficient" or any other graded/legal-weight label -- this field records WHAT the user says they did, never HOW MUCH or WHETHER it counts for anything.
  When the turn begins with a line reading "[Context: the user has ALREADY confirmed this description of what they personally did to shape the video: "...".]" -- that is the CURRENT, real, already-confirmed value, given to you specifically because you have NO memory of prior turns. Read it. Only propose a NEW human_contribution_description candidate if the rest of the turn CLEARLY corrects or extends that specific description -- e.g. "Actually, I also did a lot of compositing", "Correction -- I didn't do the editing myself, my editor did", "I also arranged the sequence" -- and when you do, set is_correction: true, correction_of_raw_text to a short quote/paraphrase of the part being extended or corrected, and fact_value_hint to the COMPLETE UPDATED description (the preserved existing detail PLUS the new/corrected detail combined into one full statement, never just the new sentence alone). If the rest of the turn is about something else entirely -- sourcing, assets, logistics, or any of the excluded categories above, even one that superficially uses first-person creation verbs -- do NOT propose a human_contribution_description candidate at all, regardless of that context line being present; the existing confirmed value must be left untouched.
  If no such context line is present (nothing confirmed yet) and the user gives a vague or uncertain answer ("I don't know", "mostly AI", "I edited it a bit"), still propose the candidate with their own words as stated and fact_confidence_hint "confirmed" -- an imprecise self-report is still a real, confirmed answer, exactly like an imprecise intended_use answer is.
- kind "user_goal": the user explicitly states what they came here wanting to know or achieve about THIS workflow's commercial readiness -- a question ("Can I use this commercially?", "Will my client own this?") and a declarative need ("My client needs proof this is cleared.", "I'm trying to figure out whether this is okay for a paid campaign.") are equally valid; capture either. This is distinct from project_fact's intended_use: intended_use describes what the OUTPUT is for (e.g. "an AI commercial for my client"); user_goal is what the USER wants to know or achieve regarding commercial readiness. A turn can and often does contain both at once -- propose both candidates when it does, never merge them into one.
- kind "asset_provider_mention": the user names a third-party source/stock media provider that supplied material used IN the project (e.g. "Getty", "Getty Images", "iStock", "Shutterstock", "Adobe Stock") -- report the name via raw_provider_name, never raw_tool_name. This is a source of material, not a tool used to generate anything. Propose this candidate whenever a provider is named, REGARDLESS of whether the turn also contains a user_goal -- recognizing that a provider was mentioned is independent of whether the user is asking a rights question about it right now. If the user names a provider but is genuinely unsure which one ("I got it from Getty or iStock, I don't remember which"), set low_confidence: true rather than guessing between them.

Third-party source rights is its own user_goal category (see goal_category_hint below) for whether the user has the RIGHTS to use third-party source material (e.g. a stock image) in the project -- a materially different question from commercial_use (whether the AI-generated OUTPUT can be used commercially). This category is EXPLICIT-QUESTION-GATED ONLY, exactly like every other goal category: propose it only when the user asks a direct question or states a direct need about permission/rights to use the source material.
Examples that SHOULD produce a third_party_source_rights user_goal: "Can I use this Getty image in an ad?", "Can I use these iStock images in my client commercial?", "Do I have the rights to use this stock image?", "Can I use a Shutterstock Editorial photo in this campaign?", "Am I allowed to use this licensed stock footage in the video?".
Examples that must NOT produce a third_party_source_rights user_goal (an asset_provider_mention candidate may still be proposed for the provider name itself, but no goal): "I used Getty.", "The client gave me a Shutterstock image.", "One of the reference images came from iStock.", "I downloaded the image from Getty.", "Getty was one of the sources." -- these are plain workflow disclosures with no accompanying question or stated need, exactly the same "disclosure is not itself a goal" discipline that already applies to every other category.
A single turn can state both a source-rights question AND a commercial-use question about the finished piece -- propose both as separate user_goal candidates, never merged: "Can I use this Getty image in the video, and can I use the finished video commercially?" is one third_party_source_rights candidate and one commercial_use candidate.

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
- "third_party_source_rights": whether the user has sufficient rights or permission to use third-party source material (e.g. a stock image, licensed footage) in the project -- distinct from commercial_use, which is about the AI-generated OUTPUT, not an input source. See the asset_provider_mention guidance above for the full explicit-question-vs-incidental-disclosure distinction that governs this category specifically.
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

const CANDIDATE_KIND_VALUES = ['tool_mention', 'scoped_observation', 'project_fact', 'user_goal', 'asset_provider_mention'] as const
const OBSERVATION_SCOPE_VALUES = ['current_project', 'historical_project', 'general_practice'] as const
const WORKFLOW_STAGE_VALUES = ['T0', 'T1', 'T2', 'T3', 'T4', 'T5'] as const
const CONFIDENCE_HINT_VALUES = ['confirmed', 'confirmed_absent', 'unresolved_no_visibility', 'unknown', 'declined'] as const
const PROJECT_FACT_FIELD_VALUES = ['intended_use', 'workflow_role', 'jurisdiction', 'human_contribution_description'] as const
/** Milestone 2 (2026-08-15); extended with 'third_party_source_rights' (Living Knowledge — Third-Party Source Rights, M1+M2, 2026-08-18). Mirrors GOAL_CATEGORIES / GOAL_SCOPES in types/interview-engine.ts -- kept as separate local consts here, same pattern as every other *_VALUES const in this file, rather than importing the runtime const array across the adapter boundary. */
const GOAL_CATEGORY_VALUES = ['commercial_use', 'copyright_ownership', 'copyrightability', 'likeness', 'third_party_source_rights', 'unknown'] as const
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
          raw_provider_name: {
            type: ['string', 'null'],
            description:
              'When kind is asset_provider_mention: return ONLY the third-party source/stock media provider name itself (e.g. "Getty", "Getty Images", "iStock", "Shutterstock", "Adobe Stock"), preserving the user\'s wording. Never a tool/platform used to generate content -- see raw_tool_name for that. Never map it to a canonical id yourself. Null otherwise.',
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
              "When kind is project_fact: intended_use (what the output is for), workflow_role (the user's own role), jurisdiction (which country's laws the user says are relevant -- ONLY when they directly state one; never inferred from where they mention working, their company's location, or any other indirect signal, except the narrow context-prefixed exception described in full above), or human_contribution_description (what the user personally did to shape the final output, beyond or instead of prompting -- their own free-text description, never normalized into a graded/legal-weight category). Null otherwise.",
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
          'raw_provider_name',
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
  raw_provider_name: string | null
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
    raw_provider_name: parsed.raw_provider_name ?? undefined,
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

/**
 * Extractor Structured-Output Recovery Extension (CRC Reliability
 * Implementation follow-up, 2026-08-20).
 *
 * `callWithOneRecoveryRetry` above only ever retries when `callOnce`
 * THROWS the SDK's own `AnthropicError('Failed to parse structured
 * output...')` -- it never inspects a response that resolved normally but
 * carried `parsed_output: null` with no text content block, which is
 * exactly the confirmed failure mode fixed for the sibling decider/
 * candidate-generator adapters (CRC 503 Reliability Diagnostic,
 * 2026-08-20; see anthropic-structured-output-retry.ts's own header for
 * the full evidence trail: an un-requested `thinking` content block
 * shares this file's max_tokens budget too, and a sufficiently dense turn
 * can exhaust it before any text block is ever emitted).
 *
 * This function is the ONE retry mechanism actually invoked at both live
 * call sites below (createAnthropicExtractor, extractWithDiagnostics),
 * REPLACING their previous call to `callWithOneRecoveryRetry` above --
 * not stacking on top of it. `callWithOneRecoveryRetry` itself is left
 * completely unchanged, still exported, and still exercised exactly as
 * before by anthropic-extractor-retry.test.ts -- this avoids any
 * outer-retry x inner-retry double-retry risk (max 4 calls) by
 * construction: only one retry loop ever runs per live invocation, and
 * that loop makes at most 2 calls to `callOnce`, same as before this
 * extension.
 *
 * Reuses `classifyMissingParsedOutput` (pure, adapter-agnostic) from
 * anthropic-structured-output-retry.ts rather than inventing a second
 * parallel missing-output classifier, and reuses this file's own already-
 * existing `isStructuredOutputParseFailure` for the SDK-thrown case --
 * zero changes to anthropic-structured-output-retry.ts were needed.
 *
 * Base/recovery token budgets are unchanged from this file's existing
 * strategy (3072 / 4096, passed in by each call site below) -- this
 * extension changes WHEN a retry fires, never the extractor's token
 * schedule itself.
 */
export type ExtractorStructuredOutputTelemetryEvent = {
  adapter: 'extractor'
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

export type ExtractorTelemetrySink = (event: ExtractorStructuredOutputTelemetryEvent) => void

/** Same observability mechanism as anthropic-structured-output-retry.ts's defaultTelemetrySink -- console.warn, no new telemetry system. Metadata only: never a prompt, transcript, email, extracted candidate text, or raw source_statement. */
export const defaultExtractorTelemetrySink: ExtractorTelemetrySink = (event) => {
  console.warn('[anthropic-structured-output]', JSON.stringify(event))
}

interface ExtractorAttemptSuccess<T> {
  ok: true
  response: T
}
interface ExtractorAttemptFailure {
  ok: false
  failureClass: StructuredOutputFailureClass
  response?: MinimalParsedAnthropicResponse
}

function extractorTelemetryEvent(attempt: 1 | 2, outcome: ExtractorAttemptFailure, retrying: boolean): ExtractorStructuredOutputTelemetryEvent {
  const response = outcome.response
  return {
    adapter: 'extractor',
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

async function attemptExtractionOnceCatching<T extends MinimalParsedAnthropicResponse>(
  callOnce: (maxTokens: number) => Promise<T>,
  maxTokens: number,
): Promise<ExtractorAttemptSuccess<T> | ExtractorAttemptFailure> {
  let response: T
  try {
    response = await callOnce(maxTokens)
  } catch (err) {
    // Non-structured-output-shaped errors (auth, network, rate limit,
    // malformed request, unknown) are never classified as recoverable
    // here -- they propagate immediately, on either attempt, exactly as
    // before this extension existed.
    if (!isStructuredOutputParseFailure(err)) throw err
    return { ok: false, failureClass: 'sdk_parse_failure' }
  }
  const failureClass = classifyMissingParsedOutput(response)
  if (failureClass === null) return { ok: true, response }
  return { ok: false, failureClass, response }
}

/**
 * Exactly one recovery retry -- a maximum of 2 Anthropic calls total per
 * invocation, never more, never recursive. Retries on either a
 * classifiable structural missing-output condition (no text block, any
 * stop_reason -- see classifyMissingParsedOutput) or the SDK's own thrown
 * parse failure. Any other exception propagates immediately, unmodified.
 *
 * On final failure, throws a single error with accurate wording -- never
 * "schema validation may have failed" (the SDK performs no such
 * validation) -- and never returns a synthesized/fallback result.
 */
export async function callWithStructuredOutputRecoveryRetry<T extends MinimalParsedAnthropicResponse>(
  callOnce: (maxTokens: number) => Promise<T>,
  baseMaxTokens: number = BASE_EXTRACTION_MAX_TOKENS,
  retryMaxTokens: number = RETRY_EXTRACTION_MAX_TOKENS,
  telemetrySink: ExtractorTelemetrySink = defaultExtractorTelemetrySink,
): Promise<T> {
  const first = await attemptExtractionOnceCatching(callOnce, baseMaxTokens)
  if (first.ok) return first.response
  telemetrySink(extractorTelemetryEvent(1, first, true))

  const second = await attemptExtractionOnceCatching(callOnce, retryMaxTokens)
  if (second.ok) return second.response
  telemetrySink(extractorTelemetryEvent(2, second, false))

  throw new Error(
    `anthropic_structured_output_missing: extractor did not produce a usable structured-output response after 1 ` +
      `recovery retry (first attempt: ${first.failureClass}, retry attempt: ${second.failureClass}). The response ` +
      `contained no output to parse -- this is not a confirmed schema-validation failure.`,
  )
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
 *
 * `current_human_contribution_description` (Copyright UAT Cumulative-
 * Restatement Fix, 2026-08-19, P1): same discipline, a second independent
 * prefix line -- deterministic, built only from the raw confirmed string
 * already in `StructuredUnderstanding`, never any live-generated text.
 * Composes with `pending_clarification` above (both can be present the
 * same turn, e.g. answering an unrelated follow-up question turns after
 * contribution was already confirmed) -- each condition contributes its
 * own line independently; neither line's presence depends on the other.
 *
 * `answering_jurisdiction_question` (Second-Jurisdiction UX milestone,
 * 2026-08-20, J1): same discipline, a third independent prefix line --
 * deterministic, a fixed template string, never any live-generated text.
 * Set true ONLY when run-turn.ts has confirmed (via
 * `BoundaryState.jurisdiction_clarification_pending_answer`) that the
 * immediately preceding assistant turn asked the deterministic
 * jurisdiction_clarification question or its one bounded retry -- never
 * inferred from this turn's own text. Composes independently with both
 * lines above, same as they compose with each other.
 */
export function buildUserMessageContent(turn: RawUserTurn): string {
  const contextLines: string[] = []
  if (turn.pending_clarification) {
    contextLines.push(`[Context: your immediately preceding question was about ${turn.pending_clarification.unresolved_summary}. Interpret the following reply in light of that context if it applies.]`)
  }
  if (turn.current_human_contribution_description) {
    contextLines.push(
      `[Context: the user has ALREADY confirmed this description of what they personally did to shape the video: "${turn.current_human_contribution_description}". Only propose a new human_contribution_description candidate if this reply clearly corrects or adds to that specific description (flag it is_correction: true if so, restating the complete updated picture in fact_value_hint). Do not propose one for unrelated disclosures, even if they use first-person creation/sourcing language.]`,
    )
  }
  if (turn.answering_jurisdiction_question) {
    contextLines.push(
      `[Context: your immediately preceding question directly asked the user which country's copyright rules are most relevant to this project -- an explicit legal-jurisdiction question. See the jurisdiction guidance in your system prompt for how this changes what counts as a valid jurisdiction answer for this reply only.]`,
    )
  }
  if (contextLines.length === 0) return turn.text
  return `${contextLines.join('\n')}\n\n${turn.text}`
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
    const response = await callWithStructuredOutputRecoveryRetry((maxTokens) =>
      client.messages.parse({
        model,
        max_tokens: maxTokens,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: buildUserMessageContent(turn) }],
        output_config: { format: jsonSchemaOutputFormat(CANDIDATE_RESPONSE_SCHEMA) },
        // No temperature/top_p/top_k -- API defaults only, unchanged.
      }),
    )

    const parsed = response.parsed_output
    if (!parsed) {
      // Should be unreachable: callWithStructuredOutputRecoveryRetry only
      // returns successfully when parsed_output has already been
      // confirmed non-null. Kept only for TypeScript null-narrowing, with
      // accurate wording -- not a confirmed schema-validation failure.
      throw new Error('anthropic_structured_output_missing: extractor response had no parsed output after a successful recovery-retry resolution -- this should be unreachable.')
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
  const response = await callWithStructuredOutputRecoveryRetry((maxTokens) =>
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
  // turn. Unchanged by this extension.
  const latencyMs = Date.now() - start

  const parsed = response.parsed_output
  if (!parsed) {
    // Should be unreachable -- see the production path's identical guard above.
    throw new Error('anthropic_structured_output_missing: extractor response had no parsed output after a successful recovery-retry resolution -- this should be unreachable.')
  }

  return {
    candidates: parsed.candidates.map((c) => toCandidateObservation(c as ParsedCandidate, turn.turn)),
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
    latencyMs,
  }
}
