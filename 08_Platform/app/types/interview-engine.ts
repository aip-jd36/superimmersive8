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

/**
 * access_surface and plan_tier are attested per-tool, not project-wide: a
 * project can use several tools with different surfaces and plans (e.g.
 * Runway API team plan + ElevenLabs personal plan in the same project), and
 * "which surface" is sometimes the entire content of a tool's canonical
 * identity (Gemini Consumer App vs. Gemini API are different Platform Rights
 * Matrix rows). Phase 1 originally modeled these as singular ProjectFacts
 * fields; moved here in Phase 3 per explicit correction after the Phase 1
 * post-completion review flagged the mismatch (mixed_multi_signal could only
 * represent two tools' plans by mashing them into one prose string). See
 * CRC_PROTOTYPE_ALPHA_ROADMAP.md Phase 1 section for the original finding.
 */
export interface ToolMention {
  mention_id: string
  resolution: ToolResolution
  access_surface: Attested<string>
  plan_tier: Attested<string>
  confidence: ConfidenceState
  source_turn: number
  source_statement: string
  superseded_by: string | null
}

// ── Project facts ────────────────────────────────────────────────────────────

/**
 * An attested value plus the provenance it came from. ScopedObservation and
 * ToolMention have carried source_turn/source_statement since Phase 1;
 * ProjectFacts fields never did, because nothing wrote to them
 * programmatically until Phase 6a's extraction pipeline needed to justify
 * and audit its own writes, not just read a value. Added here rather than
 * folded into Attested<T> itself: ToolMention.access_surface/plan_tier also
 * use bare Attested<T>, and those are attested via the SAME turn/statement
 * as the enclosing mention already carries -- adding provenance to
 * Attested<T> itself would make it redundant there. This wrapper is scoped
 * to exactly the fields that need independent provenance of their own.
 */
export interface AttestedFact<T> {
  attestation: Attested<T>
  source_turn: number
  source_statement: string
}

/**
 * Single-value project facts that are genuinely project-wide, not per-tool:
 * intended_use (what the output is for) and workflow_role (the user's own
 * role) don't fork per tool the way access surface and plan tier do. Each is
 * independently attested via Attested<T> (wrapped in AttestedFact for
 * provenance) so the confirmed/absent/unresolved/unknown/declined
 * distinction is never collapsed into a plain optional string.
 */
export interface ProjectFacts {
  intended_use: AttestedFact<string>
  workflow_role: AttestedFact<string>
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
 * One resolved tool's identity plus its own attested access surface/plan
 * tier. Phase 5 type correction (2026-08-07): the architecture doc's §12
 * schema originally paired a flat `canonical_tool_identifiers: string[]`
 * with singular top-level `access_surface`/`plan_tier` fields — written
 * before the Phase 3 correction moved these facts onto ToolMention. A
 * project with two tools on different plans (Runway API team plan +
 * ElevenLabs personal plan) cannot be represented by one project-wide
 * access_surface/plan_tier pair. Replaced `canonical_tool_identifiers` with
 * this per-tool array; the singular top-level fields are removed rather than
 * kept as an ambiguous "summary" — a summarized value for multiple
 * disagreeing tools would itself be an invented fact, which this object must
 * never contain. `unresolved_aliases` is unchanged: an unresolved alias by
 * definition has no resolved surface/tier to attach.
 */
export interface RetrievalHandoffTool {
  identifier: string
  access_surface: string | 'unresolved'
  plan_tier: string | 'unknown'
}

/**
 * Facts only — never publication conclusions, risk scores, or a fabricated
 * resolution to something unresolved. An "unresolved" or "unknown" value is a
 * valid, complete answer here, not a gap to fill before handoff.
 */
export interface RetrievalHandoff {
  tools: RetrievalHandoffTool[]
  unresolved_aliases: string[]
  workflow_role: string
  intended_use: string | 'unclear'
  scoped_observations: ScopedObservation[]
  certainty_state: 'gate_1_met' | 'gate_1_unmet' | 'declined'
  exclusions: string[]
}

/**
 * The full set of non-affirmative string values any handoff-level scalar
 * field derived from `Attested<T>` can carry, across every field
 * `attestedToHandoffValue()` (lib/interview-engine/handoff.ts) is applied
 * to: `workflow_role`, `intended_use`, `RetrievalHandoffTool.access_surface`,
 * `RetrievalHandoffTool.plan_tier`. Not the same list as `CONFIDENCE_STATES`
 * above: `unresolved_no_visibility` and `unknown` both collapse into the
 * field's own designated fallback word at the string level ('unresolved'
 * for tools/workflow_role, 'unknown' for plan_tier, 'unclear' for
 * intended_use), while `confirmed_absent` and `declined` pass through as
 * their own literal strings unchanged, regardless of which field produced
 * them. This is the union of every string a downstream consumer of any of
 * those four fields must treat as "not an affirmative value" -- not
 * something to match against, not something to render as a fact.
 *
 * Canonical, single source of truth (added 2026-08-08) after Retrieval's
 * own sentinel handling (lib/retrieval-engine/extract-matchable-facts.ts)
 * and Projection's own sentinel handling (lib/projection-layer/
 * understood-summary.ts) were found to have independently drifted:
 * Retrieval's own local list omitted `'confirmed_absent'` -- a latent gap
 * with no live behavioral impact at the time (project-wide non-tool-keyed
 * matching isn't wired to anything downstream yet), but a genuine
 * correctness gap once it is, since `'confirmed_absent'` was previously
 * being treated as if it were a real matchable `intended_use`/
 * `workflow_role` value. Both modules now import this one constant rather
 * than maintaining their own copy, so this specific drift cannot recur.
 */
export const NON_AFFIRMATIVE_HANDOFF_SENTINELS = ['unresolved', 'unknown', 'unclear', 'confirmed_absent', 'declined'] as const
