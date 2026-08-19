/**
 * Extraction pipeline (CRC_PROTOTYPE_ALPHA_ROADMAP.md Phase 6a).
 *
 * "Extraction proposes. Mutation decides." The extractor is never the
 * authoritative source of Structured Understanding. This module produces
 * proposed observations from natural language; only mutations.ts (Phase 2)
 * is permitted to apply them to canonical interview state.
 *
 *   Raw user turn
 *         |
 *   Candidate observations   <- CandidateExtractor(turn): CandidateObservation[]
 *   preserves the user's wording verbatim; rough kind classification only
 *         |
 *   Normalization             <- normalizeCandidate
 *   attempts canonical tool mapping via an explicit alias registry
 *         |
 *   Attestation                <- attestCandidate
 *   records certainty and ambiguity as a fully-formed but UNAPPLIED proposal
 *         |
 *   Deterministic mutation    <- calls the matching mutations.ts function
 *   accepts, rejects (mutation's own invariants), or defers (attestation's
 *   own low-confidence judgment) -- never applied directly by this module
 *
 * Only the "candidate observations" stage requires live LLM interpretation.
 * Normalization, attestation, and mutation are deterministic here and remain
 * so when a real model is wired in behind CandidateExtractor (Phase 6a
 * substage 2) -- the interface, not this module's own logic, is what
 * changes.
 *
 * Ambiguous tool names are never silently canonicalized: "Nano Banana"
 * resolves only when the SAME turn's wording contains an unambiguous,
 * access-method-specific phrase (architecture doc §8's own suggested first
 * answer to its open question about ambiguity detection -- a hardcoded
 * registry, not a Matrix query). Zero matching phrases, or more than one
 * (contradictory signal in the same turn), both stay unresolved -- this
 * module never guesses.
 */

import type {
  AssetProviderId,
  AssetProviderMention,
  Attested,
  ConfidenceState,
  GoalCategory,
  GoalScope,
  ObservationScope,
  ScopedObservation,
  StructuredUnderstanding,
  ToolMention,
  UserGoal,
  WorkflowStage,
} from '@/types/interview-engine'
import {
  addAssetProviderMention,
  addObservation,
  addToolMention,
  addUserGoal,
  setHumanContributionDescription,
  setIntendedUse,
  setJurisdiction,
  setWorkflowRole,
  supersedeAssetProviderMention,
  supersedeObservation,
  supersedeToolMention,
  supersedeUserGoal,
} from './mutations'

// ── Raw input ────────────────────────────────────────────────────────────────

/**
 * `pending_clarification` (added for the Live Interview Runtime milestone,
 * PROTOTYPE_ALPHA_RETROSPECTIVE.md's Option D3): optional context about
 * which specific record the immediately-preceding assistant question was
 * asking about, so this turn's extraction can correctly interpret a reply
 * that only makes sense as an answer to that question (e.g. "the API one"
 * answering a tool-mention follow-up). Deliberately additive, not a
 * `CandidateExtractor` signature change -- every existing implementation
 * (mock-extractor.ts, and any test double) needs no change at all; only
 * an implementation that wants to actually use this context (e.g.
 * anthropic-extractor.ts) reads it. `null`/absent means no clarification
 * was pending -- the normal case for most turns.
 *
 * `current_human_contribution_description` (Copyright UAT Cumulative-
 * Restatement Fix, 2026-08-19, root-cause-confirmed P1): same additive,
 * "narrow deterministic slice of existing state" discipline as
 * `pending_clarification` above, added for the identical underlying reason
 * -- `createAnthropicExtractor()`'s own call is genuinely stateless per
 * turn (confirmed by direct inspection: one fresh `messages.parse()` call,
 * a single `{role: 'user', content}` message, no prior turns, no
 * `StructuredUnderstanding` visibility at all). Without this field, the
 * extractor has no way to know a `human_contribution_description` was
 * already confirmed, so it cannot possibly "restate the complete
 * cumulative picture" when the user later adds or corrects detail --
 * the instruction to do so (added when this fact was first introduced)
 * was, on inspection, unfulfillable without this. `null`/absent/empty
 * means nothing is confirmed yet -- the normal case before the dedicated
 * clarification question has been answered. Deliberately just the one
 * string value, not the full `StructuredUnderstanding` -- "the entire
 * conversation" was explicitly ruled out as unnecessary for this fix.
 */
export interface RawUserTurn {
  turn: number
  text: string
  pending_clarification?: import('./pending-clarification').PendingClarification | null
  current_human_contribution_description?: string | null
}

// ── Candidate observations (stage 1) ────────────────────────────────────────

/**
 * Deliberately rough: preserves the user's wording (raw_text) and a coarse
 * kind classification, plus per-kind hints an extractor (mock or real model)
 * proposes. Attestation (stage 3) is what finalizes these into an actual
 * ConfidenceState -- a hint is not a guarantee, and for tool_mention
 * candidates specifically, normalization's resolution status always takes
 * precedence over any confidence hint (see attestCandidate).
 */
export interface CandidateObservation {
  proposal_id: string
  turn: number
  raw_text: string
  kind: 'tool_mention' | 'scoped_observation' | 'project_fact' | 'user_goal' | 'asset_provider_mention'

  /** kind === 'tool_mention' */
  raw_tool_name?: string
  /** kind === 'tool_mention'; set when this candidate corrects an existing mention */
  supersedes_tool_mention_id?: string

  /**
   * kind === 'asset_provider_mention' (Living Knowledge — Third-Party Source
   * Rights, M1+M2, 2026-08-18). The user named an external source/asset
   * provider (e.g. "Getty", "iStock") -- distinct from raw_tool_name, which
   * is reserved for AI generation tools/platforms. Set independently of
   * whether the turn also states a third_party_source_rights goal --
   * provider recognition may occur on any turn that names one, regardless of
   * whether a goal is also present this turn (see SYSTEM_PROMPT in
   * anthropic-extractor.ts for the full explicit-question-vs-incidental-
   * disclosure distinction that governs GOAL creation, which this field does
   * not itself gate).
   */
  raw_provider_name?: string
  /** kind === 'asset_provider_mention'; set when this candidate corrects an existing mention */
  supersedes_asset_provider_mention_id?: string
  /**
   * kind === 'tool_mention'; set ONLY when the user directly stated the
   * access surface or plan tier in this turn (e.g. "the Gemini app," "team
   * API plan," "Kling Pro") -- never inferred from weak/generic context. A
   * bare tool mention with no such statement leaves both hints unset, and
   * attestCandidate falls back to whatever normalizeCandidate's own
   * disambiguation match deterministically established (for access_surface
   * only -- there is no equivalent deterministic channel for plan_tier), or
   * 'unknown' if neither channel has anything (JD instruction, 2026-08-08).
   */
  access_surface_confidence_hint?: ConfidenceState
  access_surface_value_hint?: string
  plan_tier_confidence_hint?: ConfidenceState
  plan_tier_value_hint?: string

  /** kind === 'scoped_observation' */
  scope?: ObservationScope
  workflow_stage?: WorkflowStage
  observation_confidence_hint?: ConfidenceState
  /** kind === 'scoped_observation'; set when this candidate corrects an existing observation */
  supersedes_observation_id?: string

  /**
   * kind === 'project_fact'. 'jurisdiction' (CRC Living Knowledge Phase 1,
   * 2026-08-16) and 'human_contribution_description' (Copyright UAT
   * Correction Milestone, 2026-08-19) both reuse this same generic
   * project_fact candidate kind and attestCandidate branch as
   * intended_use/workflow_role -- zero new attestation logic. User-attested
   * only; never inferred from anything but a direct statement this turn.
   */
  raw_fact_field?: 'intended_use' | 'workflow_role' | 'jurisdiction' | 'human_contribution_description'
  fact_confidence_hint?: ConfidenceState
  fact_value_hint?: string

  /**
   * kind === 'user_goal' (Milestone 1, 2026-08-15). The goal's own content
   * lives in raw_text (already required, already verbatim) -- this hint
   * carries only the confidence state, mirroring how observation_confidence_hint
   * pairs with raw_text for scoped_observation rather than duplicating the
   * content into a second field the way plan_tier_value_hint had to (plan
   * tier needed its own value field because raw_tool_name already carries a
   * different meaning; a user_goal candidate has no such competing use for
   * raw_text). Set ONLY when the user explicitly stated a goal this turn --
   * never inferred from unrelated workflow facts (e.g. never "the user
   * wants copyright assurance" merely because a client was mentioned).
   * `is_correction`/`correction_of_raw_text` (already generic fields above)
   * are reused for goal corrections/retractions -- the same "the model
   * flags it looks like a correction, deterministic code resolves which
   * existing goal it targets" split already used for tool mentions.
   */
  goal_confidence_hint?: ConfidenceState
  /** kind === 'user_goal'; set when this candidate corrects or retracts an existing goal */
  supersedes_goal_id?: string

  /**
   * kind === 'user_goal' (Milestone 2 -- User Goal + Bounded Interpretation,
   * 2026-08-15 PM revision). Two independent classification hints,
   * proposed on the SAME extraction call that captures the goal itself --
   * never a second model call, never inferred from anything outside this
   * turn's own wording. Both are routing/boundary metadata only: they
   * decide which governed knowledge (if any) is even a candidate for a
   * Bounded Interpretation, and whether the goal reads as a request for a
   * determination CRC does not issue -- neither hint, nor anything derived
   * from it, is itself rendered as an answer or a legal conclusion.
   *
   * goal_category_hint: coarse subject-matter classification (see
   * GoalCategory). Unset/omitted -> attestCandidate defaults to 'unknown',
   * the conservative fallback -- never guessed from adjacent workflow facts
   * (e.g. never 'copyright_ownership' merely because a client was
   * mentioned).
   *
   * goal_scope_hint: whether this reads as an ordinary informational
   * question/need, or as an explicit request for CRC itself to certify,
   * clear, or determine something (see GoalScope). Unset/omitted ->
   * attestCandidate defaults to 'informational', the conservative
   * fallback -- assuming a determination request when the user only asked
   * a question would be the more consequential misclassification (it
   * would suppress a real, answerable governed claim behind the fixed
   * determination-declined template instead of surfacing it).
   */
  goal_category_hint?: GoalCategory
  goal_scope_hint?: GoalScope

  /**
   * Set by the extractor when the signal itself is too weak/unclear to
   * classify confidently at all -- distinct from a confidently-recorded
   * ambiguity (e.g. an unresolved tool alias, which IS a valid, accepted
   * proposal). A low_confidence candidate is deferred, not proposed.
   */
  low_confidence?: boolean

  /**
   * Whether this candidate appears to correct/contradict an earlier
   * statement -- a property of the extracted candidate itself, not anything
   * provider-specific, so it lives on the canonical type rather than an
   * adapter-only shape. Deliberately NOT the same thing as
   * supersedes_tool_mention_id/supersedes_observation_id: an extractor
   * (mock or real model) has no visibility into this pipeline's internal
   * mention_id/observation_id scheme, so it can only flag "this looks like
   * a correction," never resolve it to a specific internal target -- that
   * resolution is out of scope for Phase 6a (see Phase 6b/6c). Used for the
   * correction-detection-rate evaluation metric.
   */
  is_correction?: boolean
  correction_of_raw_text?: string
}

export type CandidateExtractor = (turn: RawUserTurn) => Promise<CandidateObservation[]>

// ── Normalization (stage 2) ─────────────────────────────────────────────────

export type NormalizationResult =
  | { status: 'not_applicable' }
  | { status: 'resolved'; canonical_identifier: string; access_surface?: string }
  | { status: 'known_ambiguous'; candidate_identifiers: string[] }
  | { status: 'unrecognized' }

interface AmbiguousToolEntry {
  candidateIdentifiers: string[]
  /**
   * Each pattern must describe an ACCESS METHOD, not just the tool's name or
   * generic enthusiasm about it -- "clearly describes how the user accessed
   * that tool," per the conservative-resolution requirement. Kept as a
   * short, curated list rather than broad keyword matching to minimize
   * false positives.
   *
   * `accessSurfaceLabel` (added per JD instruction, 2026-08-08): the exact
   * same regex match that already, deterministically, decides WHICH
   * canonical identifier to resolve to also deterministically tells us
   * which surface that identifier corresponds to -- attestCandidate reads
   * this back as one of two channels for populating ToolMention.access_surface
   * (the other being a direct-statement hint on the candidate itself; see
   * CandidateObservation below). Not a new inference: this is the existing
   * disambiguation match's own result, surfaced as a field instead of only
   * an identifier.
   */
  disambiguationRules: { pattern: RegExp; identifier: string; accessSurfaceLabel: string }[]
}

const KNOWN_AMBIGUOUS_TOOLS: Record<string, AmbiguousToolEntry> = {
  'nano banana': {
    candidateIdentifiers: ['gemini-api', 'gemini-consumer-app'],
    disambiguationRules: [
      { pattern: /\b(api|developer key|api key)\b/i, identifier: 'gemini-api', accessSurfaceLabel: 'API' },
      { pattern: /\b(the app|website|web app|on my phone|consumer)\b/i, identifier: 'gemini-consumer-app', accessSurfaceLabel: 'Consumer App' },
    ],
  },
}

const KNOWN_TOOLS: Record<string, string> = {
  runway: 'runway-gen3',
  'runway gen-3': 'runway-gen3',
  'runway gen 3': 'runway-gen3',
  kling: 'kling',
  // 'kling ai' added 2026-08-19 (Copyright UAT Correction Milestone T2):
  // a real live UAT showed a user naming the tool exactly this way --
  // "Kling AI" is the product's own natural, correctly-branded name, not
  // an ambiguous or invented alias -- and the missing exact-string entry
  // left the mention permanently `unresolved_alias` for the rest of that
  // conversation (no later turn can repair it; see attestCandidate's own
  // "never silently canonicalize an ambiguous tool name" discipline).
  // Narrow, single alias only -- no fuzzy/generic matching added.
  'kling ai': 'kling',
  elevenlabs: 'elevenlabs',
  'eleven labs': 'elevenlabs',
}

/**
 * Bounded initial canonical asset-provider registry (Living Knowledge —
 * Third-Party Source Rights, M1+M2, 2026-08-18, PM-approved scope per
 * THIRD_PARTY_SOURCE_RIGHTS_PATH_A_PROVIDER_NARROWING.md §9): exactly the
 * four providers with an already-governed relationship (Getty, iStock,
 * Shutterstock have adopted claims; Adobe Stock has none yet but recognition
 * is still useful, per the approved design). Deliberately NOT expanded to
 * Unsplash/Pexels/Pond5/Storyblocks/Envato/etc. in this milestone. No
 * ambiguous-alias sub-registry is needed, unlike KNOWN_AMBIGUOUS_TOOLS above
 * -- none of these names are textually confusable with each other the way
 * "Nano Banana" is confusable across two Gemini access surfaces. Getty and
 * iStock are kept as DISTINCT canonical identifiers even though they are
 * corporately related -- their governed claims differ materially (see
 * GOVERNED-CLAIMS.md's CLAIM-STOCK-GETTY-EDITORIAL-001-v1 vs. CLAIM-STOCK-
 * ISTOCK-EDITORIAL-001-v1), so collapsing them would make correct future
 * routing architecturally impossible, not merely imprecise.
 */
const KNOWN_ASSET_PROVIDERS: Record<string, AssetProviderId> = {
  getty: 'getty',
  'getty images': 'getty',
  gettyimages: 'getty',
  istock: 'istock',
  istockphoto: 'istock',
  'istock by getty images': 'istock',
  shutterstock: 'shutterstock',
  'adobe stock': 'adobe-stock',
  adobestock: 'adobe-stock',
}

export function normalizeCandidate(candidate: CandidateObservation): NormalizationResult {
  if (candidate.kind === 'asset_provider_mention') {
    if (!candidate.raw_provider_name) return { status: 'not_applicable' }
    const providerKey = candidate.raw_provider_name.trim().toLowerCase()
    const knownProvider = KNOWN_ASSET_PROVIDERS[providerKey]
    // No ambiguous-provider registry exists (see KNOWN_ASSET_PROVIDERS'
    // own comment) -- a provider name is either a known alias (resolved) or
    // not (unrecognized), never known_ambiguous. "Getty or iStock, I don't
    // remember which" is handled upstream: the extractor is expected to
    // flag such a candidate low_confidence (attestCandidate defers it
    // before normalization's result is ever used to assert an identity),
    // never resolved here to either provider by guessing.
    return knownProvider ? { status: 'resolved', canonical_identifier: knownProvider } : { status: 'unrecognized' }
  }

  if (candidate.kind !== 'tool_mention' || !candidate.raw_tool_name) {
    return { status: 'not_applicable' }
  }

  const key = candidate.raw_tool_name.trim().toLowerCase()

  const ambiguous = KNOWN_AMBIGUOUS_TOOLS[key]
  if (ambiguous) {
    const matches = ambiguous.disambiguationRules.filter((rule) => rule.pattern.test(candidate.raw_text))
    // Conservative: resolve only on exactly one matching, access-method-
    // specific phrase. Zero matches -> no evidence yet. More than one match
    // -> contradictory/unclear signal in the same turn -- never guessed.
    if (matches.length === 1) {
      return { status: 'resolved', canonical_identifier: matches[0].identifier, access_surface: matches[0].accessSurfaceLabel }
    }
    return { status: 'known_ambiguous', candidate_identifiers: ambiguous.candidateIdentifiers }
  }

  const known = KNOWN_TOOLS[key]
  if (known) return { status: 'resolved', canonical_identifier: known }

  return { status: 'unrecognized' }
}

// ── Attestation (stage 3) ───────────────────────────────────────────────────

export type ProposedFact =
  | { kind: 'tool_mention'; mention: ToolMention }
  | { kind: 'scoped_observation'; observation: ScopedObservation }
  | { kind: 'project_fact'; field: 'intended_use' | 'workflow_role' | 'jurisdiction' | 'human_contribution_description'; value: Attested<string> }
  | { kind: 'user_goal'; goal: UserGoal }
  | { kind: 'asset_provider_mention'; mention: AssetProviderMention }
  | { kind: 'undetermined' }

/**
 * Resolves one of ToolMention's access_surface/plan_tier fields from two
 * possible channels, in priority order (JD instruction, 2026-08-08):
 *   1. A direct-statement hint on the candidate itself (the extractor
 *      observed the user actually say it -- "team API plan," "Kling Pro").
 *   2. A deterministic value already established by normalizeCandidate's own
 *      disambiguation match (access_surface only -- there is no equivalent
 *      deterministic channel for plan_tier in the current KNOWN_AMBIGUOUS_TOOLS
 *      registry).
 * Neither channel present -> 'unknown'. Never infers from weak/generic
 * context -- both channels are either an explicit extractor observation or
 * an already-deterministic code-level match, never a guess.
 */
function resolveAttestedToolField(
  confidenceHint: ConfidenceState | undefined,
  valueHint: string | undefined,
  deterministicValue: string | undefined,
): Attested<string> {
  if (confidenceHint) {
    return confidenceHint === 'confirmed' && valueHint ? { state: 'confirmed', value: valueHint } : ({ state: confidenceHint } as Attested<string>)
  }
  if (deterministicValue) return { state: 'confirmed', value: deterministicValue }
  return { state: 'unknown' }
}

/**
 * Returns null when the candidate should be deferred rather than proposed
 * (see DEFERRED_REASON_CODES) -- attestCandidate itself decides this, not
 * mutation.
 */
export function attestCandidate(
  candidate: CandidateObservation,
  normalization: NormalizationResult,
): ProposedFact | null {
  if (candidate.low_confidence) return null

  if (candidate.kind === 'tool_mention') {
    if (!candidate.raw_tool_name) return null

    // Turn-qualified, not the bare model-assigned proposal_id -- proposal_id
    // is a turn-local transport identifier only (the model restarts
    // numbering at "c1" every call); mention_id must be persistent and
    // collision-free across the whole conversation. Applies uniformly
    // whether or not this candidate also supersedes an existing mention --
    // one minting rule, not two, since turn-qualification alone already
    // guarantees uniqueness (turn numbers are monotonic and never repeat
    // within one conversation; proposal_ids are unique within one turn).
    const mentionId = `t${candidate.turn}-${candidate.proposal_id}`

    let resolution: ToolMention['resolution']
    let confidence: ConfidenceState
    if (normalization.status === 'resolved') {
      resolution = { kind: 'canonical', identifier: normalization.canonical_identifier }
      confidence = 'confirmed'
    } else {
      // known_ambiguous or unrecognized: both stay an unresolved_alias with
      // the same confidence -- normalization's resolution status is the
      // authoritative signal, never overridden by a candidate's own
      // confidence hint. This is the concrete enforcement of "never
      // silently canonicalize an ambiguous tool name."
      resolution = { kind: 'unresolved_alias', raw_name: candidate.raw_tool_name }
      confidence = 'unresolved_no_visibility'
    }

    const deterministicAccessSurface = normalization.status === 'resolved' ? normalization.access_surface : undefined

    return {
      kind: 'tool_mention',
      mention: {
        mention_id: mentionId,
        resolution,
        access_surface: resolveAttestedToolField(candidate.access_surface_confidence_hint, candidate.access_surface_value_hint, deterministicAccessSurface),
        // No deterministic-normalization channel exists for plan_tier in the
        // current registry -- only the direct-statement hint channel applies.
        plan_tier: resolveAttestedToolField(candidate.plan_tier_confidence_hint, candidate.plan_tier_value_hint, undefined),
        confidence,
        source_turn: candidate.turn,
        source_statement: candidate.raw_text,
        superseded_by: null,
      },
    }
  }

  if (candidate.kind === 'scoped_observation') {
    if (!candidate.observation_confidence_hint) return null
    // Turn-qualified, not the bare model-assigned proposal_id -- CRC
    // production incident fix, 2026-08-16 (canonical session
    // fd92b4aa-072f-4d45-918f-ea520231b0d0): proposal_id is a turn-local
    // transport identifier only (the model restarts numbering at "c1"
    // every call, confirmed live -- turn 2's logo observation and turn 4's
    // unrelated permission-limitation observation both arrived as
    // proposal_id "c1"). observation_id must be persistent and
    // collision-free across the whole conversation, exactly the same
    // requirement mention_id/goal_id already satisfy via this identical
    // `t${turn}-${proposal_id}` pattern (see attestCandidate's own
    // tool_mention branch, a few lines above, for the original statement
    // of this rule) -- scoped_observation was the one candidate kind still
    // minting from the bare, collision-prone proposal_id. The mismatch was
    // silent: addObservation() throws on an id collision, and
    // runExtractionPipeline's own per-candidate try/catch (below) converts
    // that throw into an internal-only 'rejected' diagnostic -- the
    // candidate was correctly proposed by extraction, then silently
    // dropped by mutation, never a extraction-quality problem. Turn-
    // qualification alone already guarantees uniqueness (turn numbers are
    // monotonic and never repeat within one conversation; proposal_ids are
    // unique within one turn), so this one change closes the whole
    // collision class -- applied to BOTH branches below (not just the
    // reachable one) since `supersedes_observation_id` is a real declared
    // capability on this candidate kind, even though nothing currently
    // populates it (no scoped-observation-specific resolver exists, unlike
    // tool_mention/user_goal's own dedicated resolvers) -- leaving its
    // suffix on the same bare, collision-prone pattern would just move
    // this exact bug to whenever that resolver is eventually added.
    const observationId = candidate.supersedes_observation_id
      ? `t${candidate.turn}-${candidate.proposal_id}-corrected`
      : `t${candidate.turn}-${candidate.proposal_id}`
    return {
      kind: 'scoped_observation',
      observation: {
        observation_id: observationId,
        scope: candidate.scope ?? 'current_project',
        workflow_stage: candidate.workflow_stage ?? null,
        confidence: candidate.observation_confidence_hint,
        status: null,
        note: candidate.raw_text,
        superseded_by: null,
        source_turn: candidate.turn,
        source_statement: candidate.raw_text,
      },
    }
  }

  if (candidate.kind === 'project_fact') {
    if (!candidate.raw_fact_field || !candidate.fact_confidence_hint) return null
    const value: Attested<string> =
      candidate.fact_confidence_hint === 'confirmed' && candidate.fact_value_hint
        ? { state: 'confirmed', value: candidate.fact_value_hint }
        : ({ state: candidate.fact_confidence_hint } as Attested<string>)
    return { kind: 'project_fact', field: candidate.raw_fact_field, value }
  }

  if (candidate.kind === 'asset_provider_mention') {
    if (!candidate.raw_provider_name) return null

    // Turn-qualified, same minting rule as tool_mention/user_goal/
    // scoped_observation above -- proposal_id is a turn-LOCAL transport id
    // the model restarts numbering from every call, so mention_id must be
    // persistent and collision-free across the whole conversation. See the
    // tool_mention branch's own comment (and the 2026-08-16 scoped_observation
    // production-incident fix it documents) for the full reasoning; applied
    // here from the start rather than retrofitted later.
    const mentionId = `t${candidate.turn}-${candidate.proposal_id}`

    let resolution: AssetProviderMention['resolution']
    let confidence: ConfidenceState
    if (normalization.status === 'resolved') {
      resolution = { kind: 'canonical', identifier: normalization.canonical_identifier }
      confidence = 'confirmed'
    } else {
      // unrecognized (or, defensively, not_applicable/known_ambiguous --
      // neither reachable for this kind, see normalizeCandidate) stays an
      // unresolved_alias -- normalization's resolution status is the
      // authoritative signal, never overridden by a candidate's own
      // confidence hint, mirroring tool_mention's own discipline exactly.
      resolution = { kind: 'unresolved_alias', raw_name: candidate.raw_provider_name }
      confidence = 'unresolved_no_visibility'
    }

    return {
      kind: 'asset_provider_mention',
      mention: {
        mention_id: mentionId,
        resolution,
        confidence,
        source_turn: candidate.turn,
        source_statement: candidate.raw_text,
        superseded_by: null,
      },
    }
  }

  if (candidate.kind === 'user_goal') {
    if (!candidate.goal_confidence_hint) return null
    // Turn-qualified unconditionally, mirroring tool_mention's own minting
    // rule exactly (not scoped_observation's bare-proposal_id-plus
    // "-corrected"-suffix scheme): proposal_id is only a turn-LOCAL
    // transport id the model restarts numbering from ("c1", "c2") every
    // call, so two different turns can legitimately both propose "c1" --
    // colliding under a bare id whether or not either is a correction.
    // Turn-qualification alone already guarantees uniqueness, so this is
    // one minting rule, not two, for the same reason tool_mention's own
    // mentionId comment gives.
    const goalId = `t${candidate.turn}-${candidate.proposal_id}`
    return {
      kind: 'user_goal',
      goal: {
        goal_id: goalId,
        state: candidate.goal_confidence_hint,
        raw_text: candidate.raw_text,
        category: candidate.goal_category_hint ?? 'unknown',
        scope: candidate.goal_scope_hint ?? 'informational',
        superseded_by: null,
        source_turn: candidate.turn,
        source_statement: candidate.raw_text,
      },
    }
  }

  return null
}

// ── User goal identity resolution (mirrors resolveToolMentionTarget's own
// is_correction-flagged-retraction step, simplified: user goals have no
// normalization/canonicalization concept the way tool aliases do, so there
// is no equivalent to that function's "Step 1 same-identity match" -- every
// goal is already its own distinct statement, never re-resolved to a
// canonical form. Deliberately does not implement the same-turn
// retractedThisTurn double-supersede guard resolveToolMentionTarget carries
// -- that guards a specific failure mode found live for tool corrections
// (one sentence yielding two is_correction candidates that could ping-pong);
// user goals are capped at MAX_ACTIVE_USER_GOALS (3) and this narrower
// failure mode is accepted as an out-of-scope edge case for Milestone 1. ──

/**
 * Returns undefined for CREATE (no matching existing goal to target -- a
 * genuinely new one) or the goal_id to supersede for a correction/
 * retraction. The caller mints the actual replacement id; this function
 * never does.
 */
function resolveUserGoalTarget(candidate: CandidateObservation, su: StructuredUnderstanding): string | undefined {
  if (candidate.kind !== 'user_goal') return undefined
  if (candidate.supersedes_goal_id) return candidate.supersedes_goal_id
  if (!candidate.is_correction) return undefined

  const active = su.user_goals.filter((g) => g.superseded_by === null)
  const needle = (candidate.correction_of_raw_text ?? '').toLowerCase()
  if (needle) {
    const textMatches = active.filter((g) => needle.includes(g.raw_text.toLowerCase()))
    if (textMatches.length === 1) return textMatches[0].goal_id
  }

  // Vague back-reference ("never mind that") with only one other active
  // goal to plausibly mean -- same fallback shape resolveToolMentionTarget
  // uses for its own Step 2. Never guessed when more than one is active.
  if (active.length === 1) return active[0].goal_id

  return undefined
}

// ── Tool mention identity resolution (stage 3.5) ────────────────────────────

/**
 * Resolves whether a NEW tool_mention candidate should attach to (supersede)
 * an existing active tool mention, or become a brand-new one -- the
 * deterministic step this pipeline was always missing between what
 * Extraction can structurally propose and what mutation needs
 * (`supersedes_tool_mention_id`). The LLM extractor has no visibility into
 * this pipeline's internal mention_ids (anthropic-extractor.ts's own
 * comment) and is never asked to invent or track them -- it only ever
 * reports `raw_tool_name`, and, for statements that read like a correction,
 * `is_correction`/`correction_of_raw_text`. Resolving those into a concrete
 * target id is entirely this function's job, against the CURRENT
 * StructuredUnderstanding, never the model's.
 *
 * Two independent match strategies, tried in order, neither one pushing any
 * new reasoning onto the model -- both work from fields the schema already
 * carries:
 *
 * STEP 1 -- same-tool identity match (ordinary re-mention / repeated
 * mention / workflow-switch phrasing the model does not flag as a
 * correction at all). A later candidate names the SAME real-world tool as
 * an already-active mention when either (a) both resolve to the same
 * canonical identifier via normalizeCandidate's own existing, deterministic
 * registry lookup, or (b) the candidate's own raw_tool_name text matches an
 * existing UNRESOLVED mention's own raw alias name -- the latter is what
 * lets an ambiguous alias mentioned again, now with disambiguating text,
 * correctly consolidate onto its own prior (still-ambiguous) record instead
 * of spawning a parallel duplicate (closes the same gap Finding F2,
 * LIVE-RUNTIME-VALIDATION-REPORT-2026-08-08, described for
 * unresolved_ambiguity_across_turns, as a direct consequence of fixing
 * identity generally, not a separately-targeted fix). Zero or multiple
 * matches resolve nothing here -- never guessed -- and fall through to
 * Step 2.
 *
 * STEP 2 -- is_correction-flagged retraction of a DIFFERENT existing tool
 * (the correction fix this generalizes, LIVE-RUNTIME-FOLLOWUP-REPORT-
 * 2026-08-08's own Follow-up 1, unchanged in its own logic): an exact
 * textual match of `correction_of_raw_text` against exactly one active
 * mention's own resolved label, falling back to "the one other active
 * mention" when the text is a vague back-reference ("that was wrong").
 * Only runs when Step 1 found no same-tool match and the model itself
 * flagged is_correction -- never invents a correction the model didn't
 * flag, never overrides an id the candidate already carries via an explicit
 * `supersedes_tool_mention_id`.
 *
 * `retractedThisTurn` guards a failure mode found validating the original
 * correction fix live: a single correction sentence sometimes yields TWO
 * is_correction candidates from the model (one for the new tool, one
 * re-stating the old tool's own name). Without this guard, the second
 * candidate's Step-2 fallback would find the just-added new mention as the
 * lone "other active" one and supersede it right back to the old tool,
 * silently reverting the correction. Once a label has been superseded THIS
 * turn, the fallback (never Step 1, never Step 2's own direct text-match
 * branch) refuses to target its replacement again this same turn -- worst
 * case the redundant candidate lands as an inert, non-superseding
 * duplicate, never a silent revert.
 *
 * Returns undefined for CREATE (no matching existing tool -- a genuinely
 * new one, or an ambiguous alias that stays unresolved, exactly as
 * normalizeCandidate already decides) or ATTACH/CORRECT (the mention_id to
 * supersede). The caller mints the actual replacement id; this function
 * never does, and never relies on proposal_id uniqueness to make its own
 * decision -- it only reads existing, already-persistent mention_ids.
 */
function resolveToolMentionTarget(
  candidate: CandidateObservation,
  su: StructuredUnderstanding,
  retractedThisTurn: ReadonlySet<string>,
): string | undefined {
  if (candidate.kind !== 'tool_mention') return undefined
  if (candidate.supersedes_tool_mention_id) return candidate.supersedes_tool_mention_id

  const active = su.tool_mentions.filter((m) => m.superseded_by === null)
  const label = (m: ToolMention) => (m.resolution.kind === 'canonical' ? m.resolution.identifier : m.resolution.raw_name).toLowerCase()
  const rawToolName = (candidate.raw_tool_name ?? '').trim().toLowerCase()

  // Step 1: same-tool identity match.
  const thisNormalization = normalizeCandidate(candidate)
  const thisCanonicalKey = thisNormalization.status === 'resolved' ? thisNormalization.canonical_identifier.toLowerCase() : null
  const identityMatches = active.filter((m) => {
    if (thisCanonicalKey && m.resolution.kind === 'canonical' && m.resolution.identifier.toLowerCase() === thisCanonicalKey) return true
    if (rawToolName && m.resolution.kind === 'unresolved_alias' && m.resolution.raw_name.trim().toLowerCase() === rawToolName) return true
    return false
  })
  if (identityMatches.length === 1) return identityMatches[0].mention_id
  if (identityMatches.length > 1) return undefined // ambiguous -- never guess, fall through to create

  // Step 2: is_correction-flagged retraction of a different tool.
  if (!candidate.is_correction) return undefined

  const needle = (candidate.correction_of_raw_text ?? '').toLowerCase()
  if (needle) {
    const textMatches = active.filter((m) => needle.includes(label(m)))
    if (textMatches.length === 1) return textMatches[0].mention_id
  }

  if (retractedThisTurn.has(rawToolName)) return undefined

  const otherActive = active.filter((m) => label(m) !== rawToolName)
  if (otherActive.length === 1) return otherActive[0].mention_id

  return undefined
}

// ── Asset provider mention identity resolution (stage 3.5, Living Knowledge
// — Third-Party Source Rights, M1+M2, 2026-08-18) ───────────────────────────

/**
 * Mirrors resolveToolMentionTarget's own two-step design exactly (same-
 * identity match, then is_correction-flagged retraction of a different
 * mention, with the same same-turn double-supersede guard) -- per explicit
 * instruction to reuse ToolMention's existing correction pattern rather than
 * inventing a stock-specific correction engine. The one simplification:
 * Step 1's identity match has no "unresolved-alias raw-name" sub-case to
 * consider beyond the direct comparison below, since KNOWN_ASSET_PROVIDERS
 * has no ambiguous-alias concept (see that registry's own comment) --
 * structurally simpler than the tool case, not a different algorithm.
 *
 * Returns undefined for CREATE (no matching existing mention -- a genuinely
 * new one) or the mention_id to supersede for a correction. The caller mints
 * the actual replacement id; this function never does.
 */
function resolveAssetProviderMentionTarget(
  candidate: CandidateObservation,
  su: StructuredUnderstanding,
  retractedThisTurn: ReadonlySet<string>,
): string | undefined {
  if (candidate.kind !== 'asset_provider_mention') return undefined
  if (candidate.supersedes_asset_provider_mention_id) return candidate.supersedes_asset_provider_mention_id

  const active = su.asset_provider_mentions.filter((m) => m.superseded_by === null)
  const label = (m: AssetProviderMention) => (m.resolution.kind === 'canonical' ? m.resolution.identifier : m.resolution.raw_name).toLowerCase()
  const rawProviderName = (candidate.raw_provider_name ?? '').trim().toLowerCase()

  // Step 1: same-provider identity match.
  const thisNormalization = normalizeCandidate(candidate)
  const thisCanonicalKey = thisNormalization.status === 'resolved' ? thisNormalization.canonical_identifier.toLowerCase() : null
  const identityMatches = active.filter((m) => {
    if (thisCanonicalKey && m.resolution.kind === 'canonical' && m.resolution.identifier.toLowerCase() === thisCanonicalKey) return true
    if (rawProviderName && m.resolution.kind === 'unresolved_alias' && m.resolution.raw_name.trim().toLowerCase() === rawProviderName) return true
    return false
  })
  if (identityMatches.length === 1) return identityMatches[0].mention_id
  if (identityMatches.length > 1) return undefined // ambiguous -- never guess, fall through to create

  // Step 2: is_correction-flagged retraction of a different provider.
  if (!candidate.is_correction) return undefined

  const needle = (candidate.correction_of_raw_text ?? '').toLowerCase()
  if (needle) {
    const textMatches = active.filter((m) => needle.includes(label(m)))
    if (textMatches.length === 1) return textMatches[0].mention_id
  }

  if (retractedThisTurn.has(rawProviderName)) return undefined

  const otherActive = active.filter((m) => label(m) !== rawProviderName)
  if (otherActive.length === 1) return otherActive[0].mention_id

  return undefined
}

// ── Deterministic mutation + diagnostics (stage 4) ──────────────────────────

export const REJECTED_REASON_CODES = [
  'MUTATION_TARGET_NOT_FOUND',
  'MUTATION_TARGET_ALREADY_SUPERSEDED',
  'MUTATION_DUPLICATE_ID',
  'MUTATION_ERROR_OTHER',
  /**
   * Copyright UAT Cumulative-Restatement Fix, 2026-08-19 (P1). Fires when a
   * `human_contribution_description` project_fact candidate arrives while a
   * value is already confirmed AND the candidate is not flagged
   * `is_correction` -- reuses the SAME generic, already-established
   * "extractor flags it looks like a correction, deterministic code
   * enforces/resolves it" split `resolveToolMentionTarget`/
   * `resolveUserGoalTarget`/`resolveAssetProviderMentionTarget` already use,
   * applied here as a hard reject rather than a supersession-target lookup
   * (this fact has no lineage/id to resolve against -- it is a single
   * current-state value). This is the deterministic backstop behind the
   * extractor's own (necessarily probabilistic) prompt discipline -- see
   * `runExtractionPipeline`'s own call site and anthropic-extractor.ts's
   * `buildUserMessageContent`/system-prompt guidance.
   */
  'HUMAN_CONTRIBUTION_ALREADY_CONFIRMED_NOT_A_CORRECTION',
] as const

export type RejectedReasonCode = (typeof REJECTED_REASON_CODES)[number]

export const DEFERRED_REASON_CODES = [
  'CANDIDATE_TOO_LOW_CONFIDENCE',
  'CANDIDATE_UNCLASSIFIABLE',
] as const

export type DeferredReasonCode = (typeof DEFERRED_REASON_CODES)[number]

export type ProposalDecision =
  | { outcome: 'accepted'; applied_identifier: string }
  | { outcome: 'rejected'; reason_code: RejectedReasonCode; reason: string }
  | { outcome: 'deferred'; reason_code: DeferredReasonCode; reason: string }

export interface ExtractionDiagnostic {
  proposal_id: string
  /** What the model (or mock) proposed. */
  candidate: CandidateObservation
  /** What normalization produced. */
  normalization: NormalizationResult
  /** What attestation assembled -- 'undetermined' when deferred before a fact could be formed. */
  proposed_fact: ProposedFact
  /** Whether mutation accepted, rejected, or deferred it, and why. */
  decision: ProposalDecision
}

function classifyMutationError(err: unknown): { reason_code: RejectedReasonCode; reason: string } {
  const reason = err instanceof Error ? err.message : String(err)
  if (/already superseded/.test(reason)) return { reason_code: 'MUTATION_TARGET_ALREADY_SUPERSEDED', reason }
  if (/unknown (observation|tool mention|user goal)/.test(reason)) return { reason_code: 'MUTATION_TARGET_NOT_FOUND', reason }
  if (/already exists/.test(reason)) return { reason_code: 'MUTATION_DUPLICATE_ID', reason }
  return { reason_code: 'MUTATION_ERROR_OTHER', reason }
}

/**
 * Runs the full pipeline for one raw turn: candidates -> normalize ->
 * attest -> attempt mutation -> diagnostic, accumulating su across
 * candidates so a later candidate in the same turn can correct an earlier
 * one. Returns the updated StructuredUnderstanding alongside a diagnostic
 * per candidate -- diagnostics are Prototype Alpha evaluation data, not
 * part of the production RetrievalHandoff (Phase 5's handoff.ts is
 * untouched by this module).
 *
 * Async because CandidateExtractor is: a live-model-backed extractor
 * (Phase 6a substage 2) is inherently IO-bound, and this pipeline uses the
 * same interface for both the mock and the real adapter -- normalize,
 * attest, and mutate remain synchronous/deterministic underneath.
 */
export async function runExtractionPipeline(
  su: StructuredUnderstanding,
  turn: RawUserTurn,
  extractCandidates: CandidateExtractor,
): Promise<{ updated: StructuredUnderstanding; diagnostics: ExtractionDiagnostic[] }> {
  const candidates = await extractCandidates(turn)
  const diagnostics: ExtractionDiagnostic[] = []
  let current = su
  /** Labels of tool mentions actually superseded so far this turn -- see resolveToolMentionTarget's own docs for why this guard exists. */
  const retractedThisTurn = new Set<string>()
  /** Same guard, own Set, for asset provider mentions -- kept separate from retractedThisTurn (not merged) so a coincidental name collision between a tool and a provider can never cross-suppress the other kind's own guard. */
  const retractedProvidersThisTurn = new Set<string>()

  for (const rawCandidate of candidates) {
    // Exactly one of these three resolvers can ever return a value for a
    // given candidate -- each short-circuits on candidate.kind not matching
    // its own concern -- mirroring the existing single-resolver call shape
    // rather than branching on kind here.
    const supersedesToolId = resolveToolMentionTarget(rawCandidate, current, retractedThisTurn)
    const supersedesGoalId = resolveUserGoalTarget(rawCandidate, current)
    const supersedesProviderId = resolveAssetProviderMentionTarget(rawCandidate, current, retractedProvidersThisTurn)
    const candidate = supersedesToolId
      ? { ...rawCandidate, supersedes_tool_mention_id: supersedesToolId }
      : supersedesGoalId
        ? { ...rawCandidate, supersedes_goal_id: supersedesGoalId }
        : supersedesProviderId
          ? { ...rawCandidate, supersedes_asset_provider_mention_id: supersedesProviderId }
          : rawCandidate

    const normalization = normalizeCandidate(candidate)
    const proposedFact = attestCandidate(candidate, normalization)

    if (!proposedFact) {
      diagnostics.push({
        proposal_id: candidate.proposal_id,
        candidate,
        normalization,
        proposed_fact: { kind: 'undetermined' },
        decision: {
          outcome: 'deferred',
          reason_code: candidate.low_confidence ? 'CANDIDATE_TOO_LOW_CONFIDENCE' : 'CANDIDATE_UNCLASSIFIABLE',
          reason: candidate.low_confidence
            ? 'Extractor flagged this candidate as too low-confidence to propose.'
            : 'Candidate lacked the fields attestation needs to form a well-formed fact for its kind.',
        },
      })
      continue
    }

    // Copyright UAT Cumulative-Restatement Fix, 2026-08-19 (P1 deterministic
    // backstop). A confirmed human_contribution_description is never
    // silently replaced by a fresh candidate the extractor did not itself
    // flag as `is_correction` -- this is checked BEFORE the try/mutation
    // block below, exactly like the `!proposedFact` deferral immediately
    // above, so an incidental contribution-adjacent disclosure (e.g. "I
    // sourced everything else on my end") that arrives after a rich answer
    // is already confirmed is rejected outright, never applied. Reads
    // `current` (the StructuredUnderstanding accumulated so far THIS turn),
    // not the pre-turn `su` -- correctly honors an earlier candidate in the
    // SAME turn that already confirmed the fact for the first time. Scoped
    // to this one field only -- intended_use/workflow_role/jurisdiction
    // mutation behavior is completely untouched by this guard.
    if (
      proposedFact.kind === 'project_fact' &&
      proposedFact.field === 'human_contribution_description' &&
      current.project_facts.human_contribution_description.attestation.state === 'confirmed' &&
      !candidate.is_correction
    ) {
      diagnostics.push({
        proposal_id: candidate.proposal_id,
        candidate,
        normalization,
        proposed_fact: proposedFact,
        decision: {
          outcome: 'rejected',
          reason_code: 'HUMAN_CONTRIBUTION_ALREADY_CONFIRMED_NOT_A_CORRECTION',
          reason: 'human_contribution_description is already confirmed and this candidate was not flagged as a correction/extension of it -- the existing value is preserved.',
        },
      })
      continue
    }

    try {
      let appliedIdentifier: string
      if (proposedFact.kind === 'tool_mention') {
        if (candidate.supersedes_tool_mention_id) {
          const target = current.tool_mentions.find((m) => m.mention_id === candidate.supersedes_tool_mention_id)
          if (target) {
            retractedThisTurn.add((target.resolution.kind === 'canonical' ? target.resolution.identifier : target.resolution.raw_name).toLowerCase())
          }
          current = supersedeToolMention(current, candidate.supersedes_tool_mention_id, proposedFact.mention)
        } else {
          current = addToolMention(current, proposedFact.mention)
        }
        appliedIdentifier = proposedFact.mention.mention_id
      } else if (proposedFact.kind === 'scoped_observation') {
        current = candidate.supersedes_observation_id
          ? supersedeObservation(current, candidate.supersedes_observation_id, proposedFact.observation)
          : addObservation(current, proposedFact.observation)
        appliedIdentifier = proposedFact.observation.observation_id
      } else if (proposedFact.kind === 'project_fact') {
        current =
          proposedFact.field === 'intended_use'
            ? setIntendedUse(current, proposedFact.value, candidate.turn, candidate.raw_text)
            : proposedFact.field === 'workflow_role'
              ? setWorkflowRole(current, proposedFact.value, candidate.turn, candidate.raw_text)
              : proposedFact.field === 'jurisdiction'
                ? setJurisdiction(current, proposedFact.value, candidate.turn, candidate.raw_text)
                : setHumanContributionDescription(current, proposedFact.value, candidate.turn, candidate.raw_text)
        appliedIdentifier = `project_facts.${proposedFact.field}`
      } else if (proposedFact.kind === 'user_goal') {
        current = candidate.supersedes_goal_id
          ? supersedeUserGoal(current, candidate.supersedes_goal_id, proposedFact.goal)
          : addUserGoal(current, proposedFact.goal)
        appliedIdentifier = proposedFact.goal.goal_id
      } else if (proposedFact.kind === 'asset_provider_mention') {
        if (candidate.supersedes_asset_provider_mention_id) {
          const target = current.asset_provider_mentions.find((m) => m.mention_id === candidate.supersedes_asset_provider_mention_id)
          if (target) {
            retractedProvidersThisTurn.add((target.resolution.kind === 'canonical' ? target.resolution.identifier : target.resolution.raw_name).toLowerCase())
          }
          current = supersedeAssetProviderMention(current, candidate.supersedes_asset_provider_mention_id, proposedFact.mention)
        } else {
          current = addAssetProviderMention(current, proposedFact.mention)
        }
        appliedIdentifier = proposedFact.mention.mention_id
      } else {
        // attestCandidate never actually returns {kind: 'undetermined'} (it
        // returns null instead, handled above) -- this branch exists only
        // because 'undetermined' is a member of ProposedFact's declared
        // type. Defensive, not reachable in practice.
        throw new Error(`Unexpected proposed_fact.kind: ${proposedFact.kind}`)
      }

      diagnostics.push({
        proposal_id: candidate.proposal_id,
        candidate,
        normalization,
        proposed_fact: proposedFact,
        decision: { outcome: 'accepted', applied_identifier: appliedIdentifier },
      })
    } catch (err) {
      diagnostics.push({
        proposal_id: candidate.proposal_id,
        candidate,
        normalization,
        proposed_fact: proposedFact,
        decision: { outcome: 'rejected', ...classifyMutationError(err) },
      })
    }
  }

  return { updated: current, diagnostics }
}
