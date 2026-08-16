/**
 * Retrieval Engine — domain types (RETRIEVAL_ENGINE_ARCHITECTURE.md Phase 1,
 * Prototype Beta). Sibling to, not nested inside, lib/interview-engine/ —
 * architecturally independent per PRD_CRC_v1.0.md §3.
 *
 * Deliberately minimal: no relevance/risk/ranking/audience/applicability/
 * display-priority fields anywhere in this file. The architecture doc's own
 * emphasis is correctness and determinism, not ranking quality, and the
 * committed [PROTOTYPE ASSUMPTION -- TO VALIDATE] in that document is that
 * every CRC-Eligible: Yes claim under a matched row is retrievable, full
 * stop -- no applicability schema exists yet, and none is invented here.
 *
 * CRC Candidate Statement (added to RetrievalResult 2026-08-08, per JD
 * review of PROJECTION_LAYER_ARCHITECTURE.md's original claim_id
 * side-lookup design): carried on RetrievalResult as an opaque passthrough
 * field, copied verbatim from the same already-matched, already-eligible
 * claim that supplies `publication_scope`. This is a narrow,
 * consumer-driven contract extension, not a reopening of Phase 5/6's own
 * logic -- Retrieval still performs zero rendering, zero interpretation,
 * and makes no decision based on this field's content or presence (in
 * particular: unlike `publication_scope`, a null `candidate_statement`
 * does NOT cause a result to be skipped -- that is a Projection-time
 * concern, not a Retrieval-time one; see assemble-result.ts).
 *
 * Topic tagging (added to MatrixClaim/RetrievalResult 2026-08-15, CRC
 * Milestone 2 -- User Goal + Bounded Interpretation, PM revision 5:
 * "approve the minimal Matrix topic-tagging approach... do not build full
 * topic-based Retrieval in M2"). `MatrixClaim.topic` is OPTIONAL and
 * purely descriptive metadata -- it plays no role in Retrieval's own
 * matching logic (lookup-rows.ts, enumerate-eligible-claims.ts are
 * unchanged; a claim's eligibility and whether it surfaces at all is
 * decided exactly as before, tool-identifier-keyed only). It exists solely
 * so a downstream, Retrieval-external consumer (lib/bounded-interpretation/)
 * can ask "is there an already-eligible, already-retrieved result whose
 * subject matter matches this user goal's category" without Retrieval
 * itself growing any topic-based matching, ranking, or filtering
 * capability. `RetrievalResult.topic` is REQUIRED (never left undefined
 * for a consumer to guess about) -- assembleResult defaults an untagged
 * claim's topic to 'unknown', the same conservative fallback GoalCategory
 * uses everywhere else in this codebase.
 */

import type { GoalCategory } from '@/types/interview-engine'

export const CRC_ELIGIBLE_VALUES = ['Yes', 'No', 'Pending'] as const
export type CrcEligible = (typeof CRC_ELIGIBLE_VALUES)[number]

/**
 * One claim, exactly as recorded in a Matrix row's CRC Claims sub-table
 * (PLATFORM-RIGHTS-MATRIX.md, schema in PRD_LIVING_NOTEBOOK.md §
 * CRC-Eligible Governance § CRC Claims sub-table). `crc_publication_scope`
 * and `crc_candidate_statement` are human-authored governance/audit prose --
 * this type carries them verbatim; nothing in this module parses or
 * interprets their meaning anywhere.
 */
export interface MatrixClaim {
  claim_id: string
  crc_eligible: CrcEligible
  /** null only for a claim with no scope authored yet (typically CRC-Eligible: Pending). */
  crc_publication_scope: string | null
  /** Copied verbatim into RetrievalResult.candidate_statement -- see module header. */
  crc_candidate_statement: string | null
  /** Optional descriptive tag -- see module header's "Topic tagging" note. Absent on a claim means "not yet classified," not "no subject matter." */
  topic?: GoalCategory
}

/**
 * One Matrix row. `identifier` is the canonical tool identifier -- the same
 * string Interview's own normalizeCandidate resolves to and
 * RetrievalHandoffTool.identifier carries. Deliberately excludes every
 * research/audit field the Matrix records for human reviewers (Plan Tier,
 * Source Wording, SI8 Interpretation, Training Data Disclosure, Known
 * Restrictions, Source, Status, CRC Decision Date, CRC Approver) --
 * RETRIEVAL_ENGINE_ARCHITECTURE.md Phase 6 lists these as never belonging
 * in Retrieval's output, and there is no reason for Retrieval's own input
 * representation to carry them either if they're never used.
 */
export interface MatrixRow {
  identifier: string
  /** Row-level factual-freshness date (the Matrix's own "Last Verified" field) -- distinct from claim-level CRC Decision Date, which this type does not carry. */
  last_verified: string | null
  claims: MatrixClaim[]
}

// ── Topic claims (CRC Living Knowledge Phase 1, 2026-08-16) ────────────────
//
// Non-tool-scoped governed knowledge -- e.g. copyright/human-authorship
// claims that apply regardless of which AI platform was used, so they have
// no MatrixRow to attach to. Canonical source is
// `06_Operations/institutional-knowledge/notebook/GOVERNED-CLAIMS.md`,
// mirrored (same discipline as MATRIX_FIXTURE/matrix-fixture.ts, hand-synced,
// no live markdown parser -- no precedent for one exists in this repo) into
// `topic-claims-fixture.ts`.
//
// Reuses the Matrix's own CRC-Eligible vocabulary (`crc_eligible`) exactly
// -- extended to a second document, not a new publication concept.
// `lifecycle` is a SEPARATE enum from the Matrix's `Status` (which is a
// factual-freshness concept, e.g. "Needs Reverification") -- `lifecycle` is
// a governance-stage concept (Candidate -> Under Review -> Adopted ->
// Deprecated). Conflating the two was flagged as a live risk in
// MATRIX-LEARNINGS.md; kept structurally distinct here on purpose.

export const LIFECYCLE_VALUES = ['Candidate', 'Under Review', 'Adopted', 'Deprecated'] as const
export type Lifecycle = (typeof LIFECYCLE_VALUES)[number]

/**
 * `established` / `conditional` / `unsettled` -- PRD v0.2 §12's uncertainty
 * model. "No governed coverage" is deliberately NOT a fourth value here: it
 * is a retrieval outcome (no matching/applicable claim), never a stored
 * claim state -- see LK_PHASE1_TECHNICAL_DESIGN.md §6 for the full
 * reasoning. `conditional`'s condition lives in `applicability_requirements`
 * below, not a separate free-text field.
 */
export const CLAIM_CHARACTER_VALUES = ['established', 'conditional', 'unsettled'] as const
export type ClaimCharacter = (typeof CLAIM_CHARACTER_VALUES)[number]

/**
 * Phase 1 IMPLEMENTED applicability fact types only -- `jurisdiction`
 * (StructuredUnderstanding.project_facts.jurisdiction, added CRC Living
 * Knowledge Phase 1) and `tool_plan_tier` (ToolMention.plan_tier, already
 * exists). `client_supplied_asset`, `creator_relationship`, and
 * `distribution_context` were explicitly reviewed and REJECTED for Phase 1
 * (PM decision, 2026-08-16 final approval, §8): no reliable keyed
 * structured fact exists for any of them today (the closest is a free-text
 * ScopedObservation.note, and text-matching it to manufacture a boolean is
 * explicitly the "pretending a predicate is supported when the underlying
 * fact isn't" failure mode PM's own review warned against). Do not add a
 * claim referencing any fact outside this two-value union in Phase 1 -- it
 * would author a claim that can never become applicable, silently.
 */
export const APPLICABILITY_FACTS = ['jurisdiction', 'tool_plan_tier'] as const
export type ApplicabilityFact = (typeof APPLICABILITY_FACTS)[number]

/**
 * `tool` is only meaningful (and only read) when `fact === 'tool_plan_tier'`
 * -- scopes the plan-tier check to one specific canonical tool identifier,
 * since plan_tier is attested per-tool, not project-wide (ToolMention's own
 * existing design). Deterministic `.every()` evaluation only -- no scoring,
 * no partial credit, no LLM judgment call at match time (PRD v0.2 §9/§10's
 * explicit "not a rules engine" instruction).
 */
export interface ApplicabilityRequirement {
  fact: ApplicabilityFact
  tool?: string
  operator: 'equals' | 'not_equals'
  value: string
}

/**
 * One non-tool-scoped governed claim, mirroring MatrixClaim's shape plus
 * the fields PRD v0.2 §7 requires that tool-scoped claims don't need
 * (jurisdiction, applicability, lifecycle, character, version lineage).
 * `claim_id` carries its own version suffix (e.g. "CLAIM-COPY-001-v1") --
 * a claim and a specific version of that claim share the same identity
 * concept here, distinguished by the suffix, per
 * LK_PHASE1_TECHNICAL_DESIGN.md §10's versioning design.
 */
/**
 * `unresolved_project_dependencies` (Living Knowledge governance review,
 * 2026-08-16, "relevant applicability" refinement) -- see the pressure-test
 * this field name is the outcome of, documented at
 * lib/bounded-interpretation/build-bounded-interpretation.ts's own header
 * comment. Deliberately NOT `fact_dependent: boolean`: a static boolean
 * (a) can't say WHAT is unresolved, which matters for governance review and
 * future LK research prioritization, and (b) has no natural graduation
 * path -- the day CRC models a real structured fact for one of these
 * dependencies (e.g. a future `human_creative_contribution_level`
 * ApplicabilityFact), a human simply removes that string from this list
 * (and, separately, decides whether to add a matching entry to
 * `applicability_requirements` above) rather than having to reinterpret a
 * stale `true`/`false`. This is INFORMATIONAL governance metadata only --
 * unlike `applicability_requirements`, nothing in this codebase evaluates
 * these strings against any `StructuredUnderstanding` field or gates a
 * claim's inclusion in `matches[]` on them; a claim reaches this field's
 * check only AFTER it has already passed every formal
 * `applicability_requirements` gate (Retrieval's existing, unchanged
 * mechanism) and every Lifecycle/CRC-eligible governance gate. Empty array
 * (the default expectation for most claims, e.g. CLAIM-COPY-004) means
 * "fully resolvable from what CRC already formally models" -- no new
 * interpretation-state behavior triggers. Free-form strings, not a closed
 * enum: Phase 1 deliberately does not attempt to enumerate every possible
 * future unmodeled-dependency kind across copyrightability, likeness,
 * trademark, disclosure, etc. up front -- that would be exactly the
 * "large new Structured Understanding ontology" this refinement was
 * explicitly asked not to build. A light naming convention
 * (snake_case, one identifier per distinct missing concept, e.g.
 * `human_creative_contribution_level`) is documented in
 * GOVERNED-CLAIMS.md's entry template, not enforced by a type.
 */
export interface TopicClaim {
  claim_id: string
  /** Matches UserGoal.category exactly -- this is the field Topic Retrieval actually matches on. */
  topic: GoalCategory
  claim_character: ClaimCharacter
  /** Free text (e.g. "United States (federal)", "Global") -- not an enum. Wave 1 needs exactly one value; richer values are representable without a schema change. */
  jurisdiction: string
  lifecycle: Lifecycle
  crc_eligible: CrcEligible
  crc_publication_scope: string | null
  crc_candidate_statement: string | null
  applicability_requirements: ApplicabilityRequirement[]
  /** See the doc comment immediately above this interface. */
  unresolved_project_dependencies: string[]
  last_verified: string | null
  /** id of the claim version that replaced this one, or null if this is the current version. Mirrors UserGoal.superseded_by's own convention. */
  superseded_by: string | null
}

/**
 * Which handoff fact triggered a match. `'tool'` is the original,
 * Matrix-row-keyed match. `'topic'` (added CRC Living Knowledge Phase 1,
 * 2026-08-16, per PM-approved technical design) is a claim matched by
 * `UserGoal.category` against a non-tool-scoped `TopicClaim` rather than a
 * `MatrixRow` -- see the "Topic claims" section below. Both kinds produce
 * the same `RetrievalResult` shape; `lib/bounded-interpretation/` already
 * consumes results by `topic` alone and does not need to know which
 * `source_fact.kind` produced a given result.
 */
export const RETRIEVAL_SOURCE_FACT_KINDS = ['tool', 'topic'] as const
export type RetrievalSourceFactKind = (typeof RETRIEVAL_SOURCE_FACT_KINDS)[number]

export interface RetrievalSourceFact {
  kind: RetrievalSourceFactKind
  /** The matched value itself -- for kind 'tool', the canonical identifier. */
  identifier: string
}

/**
 * One eligible, traceable knowledge reference. Not a rendered Knowledge
 * Card (RETRIEVAL_ENGINE_ARCHITECTURE.md §5) -- Projection remains deferred.
 * `publication_scope` and `candidate_statement` are the two pieces of
 * Matrix prose Retrieval is permitted to pass forward, both verbatim, both
 * never parsed or interpreted for meaning anywhere in this module.
 * Everything else the Matrix records for human reviewers -- SI8
 * Interpretation, CRC Decision Date, CRC Approver, Status, any risk
 * conclusion -- is absent by construction, not by omission: this type
 * simply has no field for any of them.
 */
export interface RetrievalResult {
  source_fact: RetrievalSourceFact
  claim_id: string
  matrix_identifier: string
  publication_scope: string
  /** Opaque passthrough -- see the module-header note on MatrixClaim.crc_candidate_statement above. */
  candidate_statement: string | null
  last_verified: string | null
  /** Required, always resolved (defaults to 'unknown' for an untagged claim) -- see module header's "Topic tagging" note. Descriptive only; never influenced how this result was matched or whether it was included. */
  topic: GoalCategory
  /**
   * Passthrough of `TopicClaim.unresolved_project_dependencies` (Living
   * Knowledge governance review, 2026-08-16) -- always `[]` for a
   * tool-sourced result (`assembleResult()`; Phase 1 does not model this
   * concept for Matrix/tool claims). Descriptive only, exactly like
   * `topic` -- never influenced whether this result was matched or
   * included; Bounded Interpretation reads it to decide `directly_relevant`
   * vs `relevant_applicability_unresolved`, nothing upstream of assembly
   * branches on it.
   */
  unresolved_project_dependencies: string[]
}

/**
 * Why a candidate fact produced no result -- diagnostic only, never
 * surfaced to a user, never a risk/warning signal. Exists so tests (and
 * future engineering visibility into Matrix coverage gaps) can distinguish
 * "no row for this tool at all" from "row exists, no claim is eligible"
 * from "never a candidate in the first place" -- RETRIEVAL_ENGINE_
 * ARCHITECTURE.md §6 names this distinction explicitly as worth keeping
 * internally even though a user-facing consumer would see all three as
 * the same "nothing surfaced" outcome.
 */
export const NON_MATCH_REASONS = [
  'unresolved_alias',
  'no_matrix_row',
  'no_eligible_claims',
  /**
   * Defensive only -- a Yes claim with no CRC Publication Scope text is a
   * Matrix authoring inconsistency (Yes should always carry real scope
   * text), not a state Phase 5's filter itself produces from correct data.
   * Never fabricate scope text to fill the gap; skip the claim and record
   * why, per the same "an empty result is always safer than an invented
   * one" discipline as the rest of this module.
   */
  'yes_claim_missing_scope',
  /** Topic Retrieval reasons (CRC Living Knowledge Phase 1, 2026-08-16) -- see lookup-topic-claims.ts for exactly when each fires. One shared diagnostic type rather than a second parallel one, since both retrieval paths feed the same trace/reporting surface. */
  'no_topic_claim',
  'not_adopted_or_eligible',
  'applicability_unmet',
] as const
export type NonMatchReason = (typeof NON_MATCH_REASONS)[number]

export interface RetrievalDiagnostic {
  identifier: string
  reason: NonMatchReason
}
