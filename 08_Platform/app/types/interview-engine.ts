/**
 * CRC Interview Engine — Structured Understanding domain model.
 *
 * Runtime type definitions for what the Interview Engine currently understands
 * about a project. See `08_Platform/implementation/INTERVIEW_ENGINE_ARCHITECTURE.md`
 * (normative design, §4-§5, §11-§12) and `CRC_PROTOTYPE_ALPHA_ROADMAP.md` (Phase 1)
 * for the source requirements this module implements.
 *
 * Scope: types only. No extraction, no mutation engine, no gate evaluation, no
 * boundary enforcement — those are later phases. This module exists so that a
 * Structured Understanding state can be constructed, serialized, and
 * deserialized without losing any of the distinctions it's required to carry.
 */

// ── Confidence / certainty ──────────────────────────────────────────────────

/**
 * Five-state certainty taxonomy (architecture doc §5, normative scoped-
 * observation schema). These must never collapse into a generic null/missing
 * value — each state means something structurally different:
 *   - confirmed: the fact is known and true.
 *   - confirmed_absent: the engine confirmed the fact does NOT hold (a clean "no").
 *   - unresolved_no_visibility: the fact exists but the user can't see/attest to it
 *     (e.g. which Gemini surface a colleague used).
 *   - unknown: genuinely not known by anyone asked.
 *   - declined: the user was asked and chose not to answer.
 */
export const CONFIDENCE_STATES = [
  'confirmed',
  'confirmed_absent',
  'unresolved_no_visibility',
  'unknown',
  'declined',
] as const

export type ConfidenceState = (typeof CONFIDENCE_STATES)[number]

/**
 * A value that is only present when its certainty state is 'confirmed'.
 * Discriminated on `state` so TypeScript enforces that `value` cannot be read
 * (or accidentally fabricated) for any non-confirmed state. This is the
 * mechanism that satisfies the "must not collapse into a generic null"
 * requirement for single-value project facts (access surface, plan tier,
 * intended use, workflow role) — the same five states as ConfidenceState,
 * carrying a typed payload only in the confirmed case.
 */
export type Attested<T> =
  | { state: 'confirmed'; value: T }
  | { state: 'confirmed_absent' }
  | { state: 'unresolved_no_visibility' }
  | { state: 'unknown' }
  | { state: 'declined' }

// ── Scoped observations (architecture doc §5, normative schema) ────────────

export const OBSERVATION_SCOPES = [
  'current_project',
  'historical_project',
  'general_practice',
] as const

export type ObservationScope = (typeof OBSERVATION_SCOPES)[number]

export const WORKFLOW_STAGES = ['T0', 'T1', 'T2', 'T3', 'T4', 'T5'] as const

export type WorkflowStage = (typeof WORKFLOW_STAGES)[number] | null

export const OBSERVATION_STATUSES = ['in_progress', 'completed'] as const

export type ObservationStatus = (typeof OBSERVATION_STATUSES)[number] | null

/**
 * Scoped observation — normative fields (scope, workflow_stage, confidence,
 * status, note) plus the four runtime-only extension fields from architecture
 * doc §5 (observation_id, superseded_by, source_turn, source_statement). The
 * runtime-only fields are additive and must never be exposed to Retrieval,
 * Discovery Data, or any consumer expecting the normative schema — see
 * RetrievalHandoff below, which carries only current (non-superseded)
 * ScopedObservation values with these fields still attached, since the
 * handoff consumer is Retrieval-internal-to-SI8, not an external schema
 * boundary. (If a future consumer needs the strict normative-only shape,
 * that's a narrowing function, not a type change here.)
 */
export interface ScopedObservation {
  observation_id: string
  scope: ObservationScope
  workflow_stage: WorkflowStage
  confidence: ConfidenceState
  status: ObservationStatus
  note: string
  /** id of the observation that replaced this one, or null if still active */
  superseded_by: string | null
  source_turn: number
  source_statement: string
}

// ── Tool mentions ────────────────────────────────────────────────────────────

/**
 * A tool named by the user, either already resolved to a canonical Platform
 * Rights Matrix row, or named but not yet resolved (e.g. "Nano Banana" before
 * disambiguating Gemini Consumer App vs. Gemini API). Neither architecture doc
 * nor the roadmap specifies a runtime schema for this beyond the flattened
 * `canonical_tool_identifiers: string[]` / `unresolved_aliases: string[]`
 * arrays in the §12 handoff — those are a derived snapshot. This is the
 * richer runtime representation those arrays are built from.
 */
export type ToolResolution =
  | { kind: 'canonical'; identifier: string }
  | { kind: 'unresolved_alias'; raw_name: string }

export interface ToolMention {
  mention_id: string
  resolution: ToolResolution
  confidence: ConfidenceState
  source_turn: number
  source_statement: string
  superseded_by: string | null
}

// ── Project facts ────────────────────────────────────────────────────────────

/**
 * Single-value project facts, each independently attested. access_surface,
 * plan_tier, intended_use, workflow_role are the four named in the roadmap's
 * Phase 1 requirement list; each needs the same confirmed/absent/unresolved/
 * unknown/declined distinction as scoped observations, hence Attested<T>
 * rather than plain optional strings.
 */
export interface ProjectFacts {
  access_surface: Attested<string>
  plan_tier: Attested<string>
  intended_use: Attested<string>
  workflow_role: Attested<string>
}

// ── Phase state, gates, completion (architecture doc §3, §11) ──────────────

export const PHASES = [1, 2, 3, 4] as const

export type Phase = (typeof PHASES)[number]

export const GATE_1_STATES = ['met', 'not_met', 'not_applicable_declined'] as const

export type Gate1State = (typeof GATE_1_STATES)[number]

export const GATE_2_STATES = ['stable', 'not_yet_stable'] as const

export type Gate2State = (typeof GATE_2_STATES)[number]

export const COMPLETION_REASONS = [
  'gate_1_gate_2_met',
  'declined',
  'gate_1_unmet_exhausted',
] as const

export type CompletionReason = (typeof COMPLETION_REASONS)[number] | null

/**
 * Which scope a user's decline ended (architecture doc §6, §11): the current
 * candidate question only, the current phase, or the entire interview. Not a
 * formally named field in the architecture doc's §3 output contract (which
 * only defines completion_reason) — this is the Phase 1 resolution of the
 * "termination reason" language used informally in the roadmap and §13b.
 * See CRC_PROTOTYPE_ALPHA_ROADMAP Phase 1 report (this branch's first commits)
 * for the reasoning; flagged as an assumption, not a confirmed spec term.
 */
export const OPT_OUT_SCOPES = ['question', 'phase', 'interview'] as const

export type OptOutScope = (typeof OPT_OUT_SCOPES)[number] | null

// ── Structured Understanding (architecture doc §4) ──────────────────────────

export interface StructuredUnderstanding {
  project_facts: ProjectFacts
  tool_mentions: ToolMention[]
  scoped_observations: ScopedObservation[]
  current_phase: Phase
  gate_1_state: Gate1State
  gate_2_state: Gate2State
  completion_reason: CompletionReason
  opt_out_scope: OptOutScope
}

// ── Interview → Retrieval handoff (architecture doc §12) ───────────────────

/**
 * Facts only — never publication conclusions, risk scores, or a fabricated
 * resolution to something unresolved. An "unresolved" or "unknown" value is a
 * valid, complete answer here, not a gap to fill before handoff.
 */
export interface RetrievalHandoff {
  canonical_tool_identifiers: string[]
  unresolved_aliases: string[]
  access_surface: string | 'unresolved'
  plan_tier: string | 'unknown'
  workflow_role: string
  intended_use: string | 'unclear'
  scoped_observations: ScopedObservation[]
  certainty_state: 'gate_1_met' | 'gate_1_unmet' | 'declined'
  exclusions: string[]
}
