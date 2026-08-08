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
  Attested,
  ConfidenceState,
  ObservationScope,
  ScopedObservation,
  StructuredUnderstanding,
  ToolMention,
  WorkflowStage,
} from '@/types/interview-engine'
import {
  addObservation,
  addToolMention,
  setIntendedUse,
  setWorkflowRole,
  supersedeObservation,
  supersedeToolMention,
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
 */
export interface RawUserTurn {
  turn: number
  text: string
  pending_clarification?: import('./pending-clarification').PendingClarification | null
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
  kind: 'tool_mention' | 'scoped_observation' | 'project_fact'

  /** kind === 'tool_mention' */
  raw_tool_name?: string
  /** kind === 'tool_mention'; set when this candidate corrects an existing mention */
  supersedes_tool_mention_id?: string
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

  /** kind === 'project_fact' */
  raw_fact_field?: 'intended_use' | 'workflow_role'
  fact_confidence_hint?: ConfidenceState
  fact_value_hint?: string

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
  elevenlabs: 'elevenlabs',
  'eleven labs': 'elevenlabs',
}

export function normalizeCandidate(candidate: CandidateObservation): NormalizationResult {
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
  | { kind: 'project_fact'; field: 'intended_use' | 'workflow_role'; value: Attested<string> }
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

    const mentionId = candidate.supersedes_tool_mention_id
      ? `${candidate.proposal_id}-resolved`
      : candidate.proposal_id

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
    const observationId = candidate.supersedes_observation_id
      ? `${candidate.proposal_id}-corrected`
      : candidate.proposal_id
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

  return null
}

// ── Deterministic mutation + diagnostics (stage 4) ──────────────────────────

export const REJECTED_REASON_CODES = [
  'MUTATION_TARGET_NOT_FOUND',
  'MUTATION_TARGET_ALREADY_SUPERSEDED',
  'MUTATION_DUPLICATE_ID',
  'MUTATION_ERROR_OTHER',
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
  if (/unknown (observation|tool mention)/.test(reason)) return { reason_code: 'MUTATION_TARGET_NOT_FOUND', reason }
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

  for (const candidate of candidates) {
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

    try {
      let appliedIdentifier: string
      if (proposedFact.kind === 'tool_mention') {
        current = candidate.supersedes_tool_mention_id
          ? supersedeToolMention(current, candidate.supersedes_tool_mention_id, proposedFact.mention)
          : addToolMention(current, proposedFact.mention)
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
            : setWorkflowRole(current, proposedFact.value, candidate.turn, candidate.raw_text)
        appliedIdentifier = `project_facts.${proposedFact.field}`
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
