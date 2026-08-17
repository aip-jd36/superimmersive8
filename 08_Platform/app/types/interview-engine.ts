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

// ── Asset provider mentions (Living Knowledge — Third-Party Source Rights,
// M1+M2, 2026-08-18) ─────────────────────────────────────────────────────────

/**
 * A third-party source/asset provider named by the user (e.g. "Getty",
 * "iStock"), either already resolved to a canonical identifier or named but
 * not yet resolved — sibling concept to ToolMention (THIRD_PARTY_SOURCE_
 * ASSETS_ROUTING_ARCHITECTURE.md's PM decision record, restated in
 * THIRD_PARTY_SOURCE_RIGHTS_PATH_A_PROVIDER_NARROWING.md §3.D), deliberately
 * its OWN type rather than a variant of ToolMention or a shared resolution
 * type import — a tool (an AI generation platform) and an asset provider (an
 * external source of material) are different kinds of thing, and this
 * codebase's own established discipline is to duplicate small shapes to keep
 * concepts decoupled rather than force an accidental shared dependency (see
 * AssetProviderResolution's own mirroring of ToolResolution below).
 *
 * Semantic meaning (fixed by PM decision, unchanged by this milestone):
 * records recognition of the named provider only. It does NOT mean SI8
 * verified a license, that a valid license exists, that commercial use is
 * permitted, that Editorial/Creative status is known, that the asset appears
 * in or was used in the final output, that AI-input rights exist, that
 * release status is known, or that the user owns anything. No asset-level
 * inventory is modeled — "I got three images from Getty and two from
 * Shutterstock" produces exactly one Getty mention and one Shutterstock
 * mention, never five, matching THIRD_PARTY_SOURCE_RIGHTS_PATH_A_PROVIDER_
 * NARROWING.md §9's explicit non-goal.
 */
export type AssetProviderResolution =
  | { kind: 'canonical'; identifier: string }
  | { kind: 'unresolved_alias'; raw_name: string }

export interface AssetProviderMention {
  mention_id: string
  resolution: AssetProviderResolution
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
 *
 * `jurisdiction` (CRC Living Knowledge Phase 1, 2026-08-16, PM final
 * approval §1/§2): user-attested only -- NEVER inferred from IP address,
 * browser locale, company location, or traffic classification. Reuses
 * `AttestedFact<string>` exactly, no parallel confidence model. Free text
 * (e.g. "United States", "Taiwan"), not an enum -- Wave 1 needs exactly one
 * jurisdiction to check equality against; a richer representation is
 * addable later without a schema change. Single value only in Phase 1
 * (PM §2: "do not build bounded-list jurisdiction support yet") -- an
 * ambiguous multi-country statement ("US and EU") is represented by
 * `state` staying non-`confirmed` (never a fabricated single choice, never
 * a list), per the same "no guessing" discipline every other attested
 * field in this file already follows. Plain-overwrite correction
 * semantics, same as `intended_use`/`workflow_role` -- deliberately NOT
 * given `UserGoal`-style supersession lineage, since ProjectFacts fields
 * are singular current-state values by design, not a history to preserve.
 */
export interface ProjectFacts {
  intended_use: AttestedFact<string>
  workflow_role: AttestedFact<string>
  jurisdiction: AttestedFact<string>
}

// ── User goals (CRC User Goal — Milestone 1, capture + persistence only) ───

/**
 * What the user explicitly stated they came to CRC wanting to know or
 * achieve about this workflow's commercial readiness — a question ("Can I
 * use this commercially?") or a declarative need ("My client needs proof
 * this is cleared.") are equally valid; the concept is deliberately named
 * `user_goals`, not `user_questions`, for exactly this reason (2026-08-15
 * approval). Milestone 1 is capture + persistence only: this type has no
 * consumer anywhere outside StructuredUnderstanding itself yet — no Gate,
 * no candidate generation, no Retrieval, no Projection reads it (see
 * handoff.ts, deliberately unmodified: RetrievalHandoff enumerates specific
 * fields explicitly rather than spreading StructuredUnderstanding, so
 * user_goals cannot leak downstream by construction, not merely by
 * discipline).
 *
 * Shape mirrors ScopedObservation's own attested-content-plus-lineage
 * pattern (the closest existing precedent for "a bounded, independently
 * superseded list of attested facts") rather than inventing a parallel
 * shape, per the approved instruction to prefer existing conventions.
 * `scope`/`workflow_stage`/`status` are deliberately absent — those are
 * observation-specific concepts with no goal analogue.
 *
 * `state` reuses the existing five-state `ConfidenceState` taxonomy as-is
 * (no new parallel confidence model) — approved after concluding it is not
 * genuinely incompatible: `confirmed` (a specific goal was clearly stated)
 * and `confirmed_absent` (the user explicitly said they have no particular
 * goal, e.g. "I'm just experimenting") are the two states extraction is
 * expected to actually produce; `declined` (an explicit refusal to say why
 * they're here) is a real, if rare, third. `unresolved_no_visibility` has
 * no natural trigger for this field — a user always has visibility into
 * their own goal by definition — and `unknown` has none either, since
 * Milestone 1 never asks about a goal in the first place (see §5's
 * Interview Engine boundary below); both remain structurally available on
 * the shared type without being artificially excluded, the same way
 * ToolMention.confidence's full state space is never artificially narrowed
 * even though only a subset is realistically ever produced in practice.
 */
/**
 * Coarse topic classification of a user goal's subject matter (Milestone 2
 * -- User Goal + Bounded Interpretation, 2026-08-15, PM-revised). Routing
 * metadata only: decides which governed Matrix claims (if any) are even
 * candidates for a Bounded Interpretation, never itself an answer or a
 * legal conclusion. `copyright_ownership` and `copyrightability` are kept
 * as two DISTINCT categories per explicit PM instruction (2026-08-15 review)
 * even though both currently resolve to zero governed coverage -- they are
 * materially different legal questions (who owns it vs. whether it can be
 * owned at all), and a parallel Living Knowledge workstream is expected to
 * add coverage for one or both independently. `unknown` is the safe
 * fallback when the extractor cannot confidently classify -- never guessed
 * from adjacent context, mirroring every other `_hint` field's own
 * conservative-default discipline in this codebase.
 */
/**
 * `third_party_source_rights` (Living Knowledge — Third-Party Source Rights,
 * M1+M2, 2026-08-18, PM-approved per THIRD_PARTY_SOURCE_RIGHTS_PATH_A_PROVIDER_
 * NARROWING.md §22/§23): whether the user has sufficient rights or permission
 * to use third-party source material (e.g. a licensed stock image or clip)
 * in the project — a materially different question from `commercial_use`
 * (whether the AI-generated OUTPUT can be used commercially). Explicit-
 * question-gated only, mirroring every other category's own extraction
 * discipline: an incidental disclosure that a provider was used ("I used
 * Getty.") must never by itself create a goal in this category — only an
 * explicit question or stated need about rights/permission does (see
 * anthropic-extractor.ts's own SYSTEM_PROMPT for the extraction-time
 * enforcement). No governed claim is reachable under this category yet —
 * see GOVERNED-CLAIMS.md's five Adopted, CRC-Eligible: Pending stock-media
 * claims and topic-claims-fixture.ts's own GOVERNANCE TREATMENT notes for
 * why (provider-scoped retrieval, M3, is a separate, not-yet-authorized
 * milestone).
 */
export const GOAL_CATEGORIES = ['commercial_use', 'copyright_ownership', 'copyrightability', 'likeness', 'third_party_source_rights', 'unknown'] as const

export type GoalCategory = (typeof GOAL_CATEGORIES)[number]

/**
 * Whether the user is asking an ordinary informational question, or
 * explicitly asking CRC ITSELF to certify, clear, or determine something
 * (Milestone 2, PM revision 2, 2026-08-15 -- replaces an earlier
 * keyword-matcher design that PM rejected as brittle). Extracted the same
 * way `goal_category` is: a model-proposed hint on the SAME extraction
 * call that captures the goal, never a second model call, never inferred
 * from anything the user didn't actually say. `informational` is the safe
 * default -- assuming someone wants a certification when they only asked a
 * question would be the more consequential misclassification (it would
 * suppress a real, answerable governed claim behind the fixed
 * determination-declined template).
 */
export const GOAL_SCOPES = ['informational', 'determination_request'] as const

export type GoalScope = (typeof GOAL_SCOPES)[number]

export interface UserGoal {
  goal_id: string
  state: ConfidenceState
  raw_text: string
  /**
   * Milestone 2 additions (2026-08-15). Additive to the Milestone 1 shape:
   * a goal persisted before this milestone deserializes with both defaulted
   * (`category: 'unknown'`, `scope: 'informational'`) -- see
   * serialization.ts's deserializeStructuredUnderstanding -- never
   * `undefined` at runtime, no backfill/migration rewrite of historical
   * rows performed or required. Stored inside the existing, already-
   * unconstrained `structured_understanding` JSONB column: no DB migration
   * needed for either field.
   */
  category: GoalCategory
  scope: GoalScope
  /** id of the goal that replaced this one, or null if still active */
  superseded_by: string | null
  source_turn: number
  source_statement: string
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
  /**
   * CRC Limited Pilot -- Model 4 (bounded alternative-question search),
   * 2026-08-10. The bounded per-turn candidate search (at most one
   * alternative attempt) found no permissible question to ask -- not
   * because Gate 1/2 judge understanding complete (that's
   * 'gate_1_gate_2_met'), and not because the user declined
   * ('declined'). Deliberately distinct from both: this reason means the
   * runtime tried twice and both attempts were rejected, timed out, or
   * came back null/invalid -- Gate 2 may still be 'not_yet_stable' when
   * this fires. Constructed directly by run-turn.ts's own bounded-search
   * logic, never by checkCompletion() -- completion.ts remains unaware
   * of Constraint B/BoundaryState by design (see run-turn.ts's own
   * header for the full reasoning).
   */
  'questioning_exhausted',
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
  /**
   * Milestone 1 addition (2026-08-15). Additive and backward-compatible:
   * a historical session's stored JSON predating this field deserializes
   * with it defaulted to `[]` (see serialization.ts's
   * deserializeStructuredUnderstanding), never `undefined` at runtime, and
   * no backfill/migration rewrite of historical rows is performed or
   * required.
   */
  user_goals: UserGoal[]
  /**
   * Living Knowledge — Third-Party Source Rights, M1+M2 (2026-08-18).
   * Additive and backward-compatible, same discipline as `user_goals`
   * (Milestone 1) and `project_facts.jurisdiction` (LK Phase 1) before it: a
   * historical session's stored JSON predating this field deserializes with
   * it defaulted to `[]` (see serialization.ts's
   * deserializeStructuredUnderstanding), never `undefined` at runtime, no
   * backfill/migration rewrite of historical rows performed or required.
   * Captured independently of `user_goals` — a provider may be recognized
   * on a turn that states no goal at all, and recognizing one never itself
   * creates a goal or triggers retrieval (Path B preservation; see
   * THIRD_PARTY_SOURCE_RIGHTS_PATH_A_PROVIDER_NARROWING.md §9, §15).
   */
  asset_provider_mentions: AssetProviderMention[]
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
  /**
   * Living Knowledge — Third-Party Source Rights, M1+M2 (2026-08-18). Mirrors
   * `tools`/`unresolved_aliases` exactly, simplified for asset providers'
   * narrower shape (no access_surface/plan_tier dimension exists for a
   * provider): canonical identifiers only (`resolution.kind === 'canonical'`)
   * in `asset_providers`, raw unresolved names in
   * `unresolved_asset_provider_mentions`. M3 (provider-scoped retrieval) is
   * NOT authorized as of this milestone — these fields exist so Projection
   * can render recognized providers correctly (see understood-summary.ts);
   * they are deliberately not yet threaded into `retrieve()` or any
   * Retrieval-internal matching logic.
   */
  asset_providers: string[]
  unresolved_asset_provider_mentions: string[]
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
