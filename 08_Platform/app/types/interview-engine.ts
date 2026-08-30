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
/**
 * `account_status` (CRC Kling Governed Knowledge Correction + Decomposition
 * milestone, 2026-08-24). Same per-tool, not project-wide, reasoning as
 * `access_surface`/`plan_tier` immediately above -- but a structurally
 * DIFFERENT concept from `plan_tier`, not a synonym for it: a governed
 * account/membership-status distinction a provider's own terms draw
 * independently of subscription grade (e.g. Kling's own Member Account vs.
 * Regular Account, per K2 §1.4-1.6, is orthogonal to its separate
 * Standard/Pro/Ultra/Team/Enterprise Membership Grade, K2 §3.1.1 -- a
 * provider can vary BOTH independently, so cramming both into one field
 * would either lose information or require inventing compound string
 * values). Deliberately generic: represents the CLASS of condition "which
 * governed account/membership state applies to this tool," not any single
 * provider's own vocabulary -- a future provider with an analogous
 * account-class distinction (e.g. "verified" vs. "unverified," "team" vs.
 * "individual") reuses this same field, with its own governed canonical
 * values, never a new field. No acquisition/attestation path exists for
 * this field yet in this milestone (deliberately -- see the governed
 * applicability_requirements' own header in retrieval-engine/types.ts):
 * every ToolMention constructed today defaults it to `{state: 'unknown'}`
 * and nothing currently sets it to `'confirmed'`.
 */
export interface ToolMention {
  mention_id: string
  resolution: ToolResolution
  access_surface: Attested<string>
  plan_tier: Attested<string>
  account_status: Attested<string>
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

/**
 * Canonical asset-provider identifiers (Living Knowledge — Third-Party
 * Source Rights, M3 provider-scoped retrieval, 2026-08-18). Single source
 * of truth for the providers M2's own `KNOWN_ASSET_PROVIDERS` alias
 * registry (lib/interview-engine/extraction.ts) already resolves to --
 * defined here, in the shared types module, rather than in extraction.ts
 * itself, specifically so `TopicClaim.provider_scope`
 * (lib/retrieval-engine/types.ts) can reference the identical type without
 * Retrieval importing an Interview Engine LOGIC module (subsystem-
 * boundaries.test.ts permits only type-only imports from this module across
 * that boundary). `KNOWN_ASSET_PROVIDERS`'s own value type now references
 * this type too, so the two can never independently drift -- a typo'd
 * provider id in either place is a compile error, not a silent runtime gap.
 *
 * `'artlist'` added 2026-08-27 (Music Scenario A -- Artlist A-3 synthetic
 * runtime canary): pure generic registry extension, same mechanism as the
 * original four -- no new provider category, no domain field, no Music-
 * specific resolver. Registering the identifier is independent of any
 * Music claim's own CRC-publication status; see GOVERNED-CLAIMS.md's
 * CLAIM-MUSIC-* entries (Adopted, `CRC Approver: PENDING`, unaffected by
 * this registration) and CPR_007's own confirmation that runtime
 * reachability and CRC eligibility are separately governed.
 *
 * `'storyblocks'` added 2026-08-30 (Trial 2 Living Knowledge onboarding
 * benchmark -- CLAIM-STORYBLOCKS-BUSINESS-LICENSE-BROADCAST-001-v1):
 * identity registration only, same generic mechanism as every entry above.
 * Deliberately does NOT add a `KNOWN_ASSET_PROVIDERS` extraction alias in
 * the same change (unlike the combined Artlist registration commit) --
 * per this milestone's own explicit instruction, identity registration and
 * conversational extraction remain separate, independently-timed decisions,
 * mirroring the LK-24/LK-40 precedent already established for canonical
 * TOOL identity (`lib/tool-identity/registry.ts`) and its own deliberately
 * unaliased entries. No conversational path can produce a confirmed,
 * canonical Storyblocks `AssetProviderMention` as of this registration.
 *
 * `'pond5'` added 2026-08-30 (LK-59, Trial 3 Living Knowledge onboarding
 * benchmark -- CAND-POND5-EDITORIAL-COMMERCIAL-USE-CONSENT-001): identity
 * registration only, same generic mechanism as every entry above --
 * mechanically required before `provider_scope: ['pond5']` can appear on a
 * type-checked `TopicClaim`/Candidate (this field is typed `AssetProviderId[]
 * | null`, not `string[]`), not itself a governance judgment. Deliberately
 * does NOT add a `KNOWN_ASSET_PROVIDERS` extraction alias -- identity
 * registration and conversational extraction remain separate,
 * independently-timed decisions, same discipline as Storyblocks above. No
 * conversational path can produce a confirmed, canonical Pond5
 * `AssetProviderMention` as of this registration.
 */
export const ASSET_PROVIDER_IDS = ['getty', 'istock', 'shutterstock', 'adobe-stock', 'artlist', 'storyblocks', 'pond5'] as const

export type AssetProviderId = (typeof ASSET_PROVIDER_IDS)[number]

/**
 * Track B — Generic Living-Knowledge Readiness/Askability milestone
 * (2026-08-20). Production evidence (the confirmed iStock UAT session)
 * proved usage and license had nowhere to live structurally -- usage was
 * only indirectly evidenced through `BoundaryState.follow_ups_used`
 * bookkeeping (an interview-side "was this asked" flag, not a fact), and
 * license had no representation at all. A single value, not a set: no real
 * production or governance example currently requires representing
 * simultaneous multiple usages for one provider mention (checked, not
 * assumed -- see the milestone's own final report, item 26); should a real
 * case ever require it, this is an additive, non-breaking widening
 * (`Attested<AssetProviderUsageValue>` -> `Attested<AssetProviderUsageValue[]>`),
 * not a redesign.
 */
export const ASSET_PROVIDER_USAGE_VALUES = ['reference_material', 'direct_generation_input', 'other'] as const

export type AssetProviderUsageValue = (typeof ASSET_PROVIDER_USAGE_VALUES)[number]

export interface AssetProviderMention {
  mention_id: string
  resolution: AssetProviderResolution
  confidence: ConfidenceState
  source_turn: number
  source_statement: string
  superseded_by: string | null
  /**
   * How the asset was used in the workflow (reference material vs. fed
   * directly into AI generation vs. other) -- plain-overwrite correction
   * semantics, same as ToolMention.access_surface/plan_tier (a still-active
   * mention's own sub-fact, not a new supersession chain). Free-form
   * `other` deliberately has no further sub-classification -- Phase 1 of
   * this milestone does not attempt to enumerate every possible usage
   * shape, mirroring `unresolved_project_dependencies`'s own "don't build
   * the large ontology up front" discipline.
   */
  usage: Attested<AssetProviderUsageValue>
  /**
   * Free text (e.g. "standard license", "Editorial use only"), not a
   * closed enum -- mirrors `ProjectFacts.jurisdiction`'s own "Wave 1 needs
   * exactly one representable value; a richer representation is addable
   * later without a schema change" reasoning. Same plain-overwrite
   * correction semantics as `usage` above.
   */
  license: Attested<string>
}

// ── Assessment jurisdiction mentions (CRC Assessment-Jurisdiction Mention
// Model, 2026-08-28, following the accepted Jurisdiction Acquisition Contract
// semantic diagnostic) ───────────────────────────────────────────────────────

/**
 * A jurisdiction the user has explicitly asked CRC to consider governed
 * knowledge for -- deliberately NOT a factual-territory fact (distribution
 * region, filming/client/subject location) and NOT a CRC-determined
 * conclusion about which law actually governs. Sibling concept to
 * `AssetProviderMention`, deliberately simpler: no `resolution` kind split
 * (canonical vs. unresolved_alias) -- jurisdiction values are canonicalized
 * via an open, additive alias table (`JURISDICTION_VALUE_ALIASES`,
 * lib/retrieval-engine/lookup-topic-claims.ts) at comparison time only, never
 * gated behind a closed provider-style registry the way asset providers are.
 *
 * `confidence` uses only two of the five `ConfidenceState` values
 * meaningfully at the per-mention level: `confirmed` (an explicit inclusion
 * -- "also assess New York") and `confirmed_absent` (an explicit exclusion
 * -- "don't assess New York" / "US only, not New York"). `unknown`/
 * `declined`/`unresolved_no_visibility` do not naturally attach to a stated
 * value and are not produced here -- those remain conversation-level facts
 * tracked by the existing jurisdiction-clarification boundary-state flags,
 * never duplicated into this list.
 *
 * Values remain flat, ungraded labels -- deliberately no `level`, `parent`,
 * `country`, or `subdivision` field. "United States", "New York", and
 * "European Union" are all represented identically; no code anywhere
 * classifies or infers a geographic hierarchy from a mention's value.
 *
 * `superseded_by` follows the same supersede-and-mark discipline as every
 * other mention type in this file -- a correction never deletes or edits a
 * prior mention in place.
 */
export interface AssessmentJurisdictionMention {
  mention_id: string
  value: string
  confidence: ConfidenceState
  source_turn: number
  source_statement: string
  superseded_by: string | null
}

// ── Content presence mentions (CRC Content-Presence Mention Model,
// 2026-08-28, following the accepted Representation Simplification Review)
// ─────────────────────────────────────────────────────────────────────────

/**
 * Closed, minimal, evidence-only category vocabulary (Content-Presence
 * Representation Simplification Review, 2026-08-28). Only the two values
 * with real, adopted governed need today -- see
 * CLAIM-LIKENESS-NY-CONSENT-REQUIREMENT-001-v1's own
 * `recognizable_likeness_or_voice_present` unresolved project dependency
 * (GOVERNED-CLAIMS.md). Deliberately NOT named after the governed
 * dependency string, and deliberately NOT using the statutory term
 * "likeness" (NY Civil Rights Law §§50-51's own literal vocabulary) --
 * StructuredUnderstanding records what the user factually stated the
 * project's output contains, never a legal term of art. Mirrors this
 * project's own precedent for exactly this move:
 * `human_creative_contribution_level` was renamed to
 * `human_contribution_description` for the identical reason (avoiding a
 * name that reads as a legal/graded judgment).
 *
 * Owned here, by the StructuredUnderstanding/extractor schema layer -- NOT
 * by Living Knowledge (which owns dependency-string vocabulary,
 * `unresolved_project_dependencies`) and NOT by a dependency-askability
 * registry (which owns a third, separate askability vocabulary,
 * `lib/crc-engine/dependency-askability.ts`). These three vocabularies are
 * deliberately never merged, mirroring the established FollowUpNeed-vs.-
 * governed-dependency-string precedent (`knowledge-readiness.ts`'s own
 * header).
 *
 * Extended later, one evidenced value at a time -- same discipline as
 * `ASSET_PROVIDER_IDS`/`EXTRACTED_ATTRIBUTE_KEY_VALUES` growth. Do not add
 * a category speculatively (no logo/product/signage/location/music/stock
 * value exists here, and none should be added without its own governed
 * evidence).
 */
export const CONTENT_PRESENCE_CATEGORIES = ['person_visual_presence', 'person_voice_presence'] as const

export type ContentPresenceCategory = (typeof CONTENT_PRESENCE_CATEGORIES)[number]

/**
 * One user-stated proposition that content of a bounded factual category
 * (`category`) is present in, or explicitly absent from, the project's
 * output. Sibling concept to `AssessmentJurisdictionMention`, same
 * mention/supersession shape, same two-meaningful-states confidence
 * discipline (`confirmed` / `confirmed_absent` -- `unknown`/`declined`/
 * `unresolved_no_visibility` do not naturally attach to a stated category
 * and are not produced here, mirroring `AssessmentJurisdictionMention`'s
 * own doc comment exactly).
 *
 * This does NOT mean: CRC inspected the project's output; CRC verified the
 * statement; CRC determined the depicted person is legally recognizable
 * (see CLAIM-LIKENESS-NY-CONSENT-REQUIREMENT-001-v1's own Prohibited
 * Conclusions text -- "whether the depicted person is actually recognizable
 * as a matter of fact" is explicitly barred, and no field here attempts to
 * establish it); CRC identified the person; CRC determined a legal right is
 * implicated, that consent is required, or that any law applies.
 *
 * Deliberately excludes (Content-Presence Representation Simplification
 * Review, 2026-08-28, after the fuller CRC Content-Presence Mention Model —
 * Implementation Design's own first pass considered and rejected them):
 *   - `count` -- the adopted governed dependency
 *     (`recognizable_likeness_or_voice_present`) is a pure existence/OR
 *     test; it never needed "how many." Retaining a numeric count would
 *     also force an aggregate-correction case ("two real people" -> "one is
 *     synthetic") to be resolved by ARITHMETIC DECOMPOSITION
 *     (`real: 2 -> 1`, `synthetic: 0 -> 1`) -- an inference no existing
 *     mention/supersession correction in this codebase ever performs (every
 *     precedent -- AssetProviderMention, ToolMention,
 *     AssessmentJurisdictionMention, scalar AttestedFact corrections -- is
 *     strict 1:1 supersession, never a 1-to-many split). Content-presence
 *     free-form extraction is append-only precisely because no such 1:1
 *     target can ever be established without a count/identity this type
 *     deliberately never carries (Content-Presence Correction Safety —
 *     Append-Only Closure, 2026-08-28) -- see `superseded_by`'s own doc
 *     comment below. The literal count, if the user states one, survives
 *     only in `source_statement`.
 *   - `recognizability` -- the governed claim's own Prohibited Conclusions
 *     text makes any structured recognizability value permanently unusable
 *     for a downstream conclusion regardless of how it's captured; a
 *     dedicated field would buy nothing a verbatim `source_statement`
 *     doesn't already preserve, while inviting exactly the "user statement"
 *     vs. "CRC fact" conflation that Prohibited Conclusions text exists to
 *     prevent. The literal word "recognizable" (or its absence, or "I don't
 *     know if identifiable") is fully recoverable from `source_statement`.
 *   - person identity, names, a legal-likeness-status field, an
 *     applicable-law field, or any consent/advertising/trade field -- none
 *     of these fit the bounded self-report vocabulary this type records at
 *     all; they belong, if ever modeled, to a different governance layer
 *     entirely, never to this type.
 *
 * `real_or_synthetic` (bounded to `real`/`synthetic`, self-reported only,
 * never inferred by extraction): a plain nullable field on this interface,
 * `null` meaning unstated/unresolved, never a third asserted "unknown"
 * value. Extracted via the existing generic `attributes[]` wire-level
 * extraction mechanism (`EXTRACTED_ATTRIBUTE_KEY_VALUES`,
 * lib/interview-engine/anthropic-extractor.ts), the same TRANSPORT
 * mechanism `usage`/`license`/`account_status` already use -- but, exactly
 * like those three, that mechanism governs only how the value crosses the
 * wire from the model; the value is still stored as a real field on the
 * StructuredUnderstanding-side type it belongs to (`AssetProviderMention.
 * usage`/`.license` are the direct precedent: both are real fields, not
 * merely transient extraction-time attributes). Required to be a genuine
 * stored field, not a design-time simplification: an explicit,
 * real-qualified absence ("no REAL person's image appears," as opposed to
 * "no person's image appears" at all) is only expressible if this value
 * persists on the mention itself. Genuinely required, not optional
 * richness -- it is the one axis the governed proposition's own statutory
 * scope ("any living person," NY Civil Rights Law §§50-51, Class-A-verified
 * in GOVERNED-CLAIMS.md) cannot even be approximated without.
 * `attestCandidate` (extraction.ts) is the single place this value is read
 * out of the generic wire-level `attributes[]` array and attached here.
 *
 * `superseded_by` exists on this type for structural consistency with every
 * other mention type in this file, but -- unlike those types -- free-form
 * extraction NEVER sets it here. Content-Presence Correction Safety —
 * Append-Only Closure (2026-08-28) established that logical conflict
 * between two content-presence propositions (e.g. a later `absent` matching
 * an earlier `present`) is NOT proof that the user intended to retract the
 * earlier one: this type deliberately carries no count, individual
 * identity, or project/temporal scope, so a free-form correction statement
 * can never be matched to a single, deterministic, provably-correct prior
 * target (a category can legitimately hold many independently-true
 * propositions at once -- "three people appear" produces exactly ONE
 * mention, with "three" surviving only in `source_statement` -- and even an
 * apparently-contradicting later statement may describe a different
 * project version/scope this type has no field to record). Every new
 * content-presence candidate from ordinary conversation is therefore always
 * a plain addition (`addContentPresenceMention`), never a supersession --
 * see `runExtractionPipeline`'s content-presence dispatch branch
 * (extraction.ts), which calls only that function for this candidate kind.
 * `superseded_by` remains `null` for every mention this pipeline produces
 * and is reserved, unused, for a future SYSTEM-controlled correction
 * mechanism (CRC itself selecting the exact target `mention_id` before
 * asking a targeted question -- never the model or user choosing it) --
 * not implemented, not scheduled, by this milestone.
 */
export interface ContentPresenceMention {
  mention_id: string
  category: ContentPresenceCategory
  /** `null` means unstated/unresolved -- never a third asserted value alongside 'real'/'synthetic'. See this interface's own header comment. */
  real_or_synthetic: 'real' | 'synthetic' | null
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
 *
 * `human_contribution_description` (Copyright UAT Correction Milestone,
 * 2026-08-19, PM-approved H2): free-text, user-reported description of
 * what the user personally did to shape the final output (e.g. "I only
 * wrote prompts," "I selected clips and reordered them"). Deliberately
 * named `_description`, not `_level` -- the rejected `human_creative_
 * contribution_level` framing (the governed dependency string's original
 * name) reads as an ordinal/graded judgment, which is exactly the kind of
 * legal-sufficiency conclusion this field must never encode. This stores
 * ONLY what the user says they did -- never whether it satisfies any
 * copyright threshold, never a ranking, never a normalized category (no
 * `none`/`low`/`medium`/`high`/`meaningful`/`substantial`/`sufficient`
 * values -- see mutations.ts/anthropic-extractor.ts's own guidance). Same
 * plain-overwrite correction semantics as `intended_use`/`workflow_role`/
 * `jurisdiction` above -- a later, additive clarification ("actually, I
 * also did a lot of compositing") is captured by the extractor restating
 * the complete, cumulative description as the new value, not by inventing
 * a supersession chain for this field alone. Scoped to what the USER
 * personally did, mirroring `workflow_role`'s own existing scope -- this
 * project deliberately does NOT model multi-person/team contribution
 * allocation (contributor graphs, work-made-for-hire, employment
 * analysis); if a user mentions someone else's involvement, it is simply
 * part of the free-text description, informationally present, never
 * structurally attributed. Ownership allocation across people remains
 * Commercial Assurance territory, never CRC's.
 */
export interface ProjectFacts {
  intended_use: AttestedFact<string>
  workflow_role: AttestedFact<string>
  jurisdiction: AttestedFact<string>
  human_contribution_description: AttestedFact<string>
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
  /**
   * CRC Global User-Facing Question Budget milestone (2026-08-26).
   * Deliberately distinct from 'questioning_exhausted': that reason means
   * the bounded candidate search found no further permissible question at
   * all; this one means CRC deliberately stopped at its own product-level
   * conversation ceiling (MAX_USER_FACING_QUESTIONS) while further
   * candidate work may still have been possible -- a different provenance
   * fact worth preserving even though no downstream consumer currently
   * reads it differently. Constructed directly by run-turn.ts's own
   * budget check, never by checkCompletion() -- same non-ownership
   * discipline as questioning_exhausted above.
   */
  'question_budget_exhausted',
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
  /**
   * CRC Assessment-Jurisdiction Mention Model (2026-08-28). Additive and
   * backward-compatible, same discipline as `asset_provider_mentions` before
   * it: a historical session's stored JSON predating this field
   * deserializes with it defaulted to `[]` (see serialization.ts's
   * deserializeStructuredUnderstanding), never `undefined` at runtime.
   * `project_facts.jurisdiction` (the pre-existing scalar) becomes
   * compatibility-only the moment this collection has ever received any
   * entry (active or superseded) for a session -- see
   * lib/crc-engine/assessment-jurisdiction-scope.ts for the exact,
   * marker-free authority rule and why no launch-timestamp gate is needed.
   */
  assessment_jurisdiction_mentions: AssessmentJurisdictionMention[]
  /**
   * CRC Content-Presence Mention Model (2026-08-28). Additive and
   * backward-compatible, same discipline as `assessment_jurisdiction_mentions`
   * before it: a historical session's stored JSON predating this field
   * deserializes with it defaulted to `[]` (see serialization.ts's
   * deserializeStructuredUnderstanding), never `undefined` at runtime. An
   * empty array means no recorded information -- NEVER confirmed absence --
   * for both a genuinely untouched new session and a historical session
   * that predates this field entirely; no migration fabricates a
   * content-presence fact for either case. Generic project state only: no
   * dependency evaluation, no askability, no Track A discovery, no BI/
   * Projection/Composition consumer exists for this field yet (deliberately
   * -- each is its own, separately authorized future milestone).
   */
  content_presence_mentions: ContentPresenceMention[]
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
