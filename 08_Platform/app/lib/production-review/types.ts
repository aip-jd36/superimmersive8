/**
 * Product A — Production Rights & Provenance Review: domain types
 * (CAA-PRODUCT-A-2, internal preview slice).
 *
 * Product A is a predominantly automated, producer-facing review of declared
 * production facts against SI8's governed Living Knowledge. It is a SEPARATE
 * product from the Commercial Assurance Assessment (Product B): it has no
 * reviewer judgment, no outcome, no sign-off, and must never reuse Product B's
 * `Verified / Partially Verified / ...` vocabulary or its five outcomes.
 *
 * This module is a consumer of the existing engines, never a second one:
 *   - tool identity      → `normalizeCandidate` (lib/interview-engine/extraction)
 *   - claim selection    → `selectReviewerClaims` (lib/reviewer-lk) — scope,
 *                           eligibility, lifecycle, supersession, applicability
 *   - semantic ceiling   → `buildBoundedInterpretations` (lib/bounded-interpretation)
 *
 * Four lanes are kept structurally separate on every finding and must never
 * be collapsed into one another:
 *   1. applicability  — does a governed condition apply on the DECLARED facts?
 *   2. fact basis     — where the fact came from (this slice: customer
 *                       declaration only; nothing here is ever verified)
 *   3. dependencies   — governed project facts the claim leaves open
 *   4. permitted conclusion — a fixed template (project-production-review.ts)
 *
 * INTERNAL PREVIEW ONLY. Reviewer-eligible knowledge is used here because the
 * output is shown to an SI8 administrator, not a customer. This does not
 * authorize any customer-facing publication of Product A output.
 */

import type { ApplicabilityRequirement, KnowledgeTopic, Lifecycle, PublicationScope } from '@/lib/retrieval-engine/types'
import type { InterpretationStatus } from '@/lib/bounded-interpretation/types'

/** The governed topics this slice reviews. Both are provider/tool-oriented and carry no jurisdiction gate today. */
export const PRODUCTION_REVIEW_TOPICS = ['commercial_use', 'third_party_source_rights'] as const
export type ProductionReviewTopic = (typeof PRODUCTION_REVIEW_TOPICS)[number]

// ── Lane 1: applicability (from the deterministic evaluator, never re-derived) ──

export const PA_APPLICABILITY = [
  /** Every governed requirement is met on the declared facts (or the claim has none). */
  'applies',
  /** At least one governed requirement could not be evaluated from the declared facts. */
  'applies_if',
  /** A governed requirement evaluated `not_met` on the declared facts. */
  'does_not_apply_on_declared_facts',
] as const
export type PaApplicability = (typeof PA_APPLICABILITY)[number]

// ── Lane 2: fact basis ───────────────────────────────────────────────────────

/**
 * Where a production fact came from. This slice produces only
 * `customer_declared` and `not_declared`. `document_presented` means a file
 * exists — it is NEVER examined, read, or treated as proof of anything.
 * There is deliberately no `verified` member.
 */
export const PA_FACT_BASIS = ['customer_declared', 'document_presented', 'not_declared'] as const
export type PaFactBasis = (typeof PA_FACT_BASIS)[number]

// ── Declared production facts ────────────────────────────────────────────────

export type DeclaredToolIdentity =
  | { kind: 'canonical'; tool_id: string }
  | { kind: 'unresolved'; reason: 'unrecognized' | 'ambiguous' | 'missing_name' }

/**
 * How the declared plan relates to governed applicability for this tool.
 *   - `matches_governed_value`: the declared plan string exactly equals a
 *     value some governed `tool_plan_tier` requirement for this tool uses. It
 *     is passed to the evaluator as a DECLARATION only.
 *   - `not_a_governed_value`: a plan was declared but no governed requirement
 *     for this tool uses that value (or the tool has no plan-gated claims).
 *     It is shown but never fed to applicability.
 *   - `not_declared`.
 */
export type DeclaredPlanRelation = 'matches_governed_value' | 'not_a_governed_value' | 'not_declared'

export interface DeclaredTool {
  /** 0-based position in the submission's tools list. */
  index: number
  raw_name: string | null
  identity: DeclaredToolIdentity
  declared_plan: string | null
  plan_relation: DeclaredPlanRelation
  /** Always `not_declared` in this slice — /certify does not collect account status. */
  account_status_basis: 'not_declared'
  declared_window: { start: string | null; end: string | null }
  /** A receipt file exists. It was not opened, read, or assessed. */
  receipt_presented: boolean
  is_primary: boolean
}

export interface ProductionFacts {
  /** `unreadable` = the tools list could not be parsed at all → nothing is evaluated (fail closed). */
  tools_input: 'readable' | 'unreadable'
  tools: DeclaredTool[]
  /**
   * Creator-declared distribution territory (G1). Shown for context only.
   * It is NEVER an applicability `jurisdiction` fact — Product A has no
   * reviewer-established assessment jurisdiction (G2).
   */
  declared_distribution_territory: string | null
  /** Count of declared third-party assets. Provider identity is not captured by intake. */
  declared_third_party_asset_count: number
  /** True if the creator declared licensed audio. Provider identity is not captured by intake. */
  declared_licensed_audio: boolean
}

// ── Findings ────────────────────────────────────────────────────────────────

export interface ProductionClaimFinding {
  claim_id: string
  /** Version suffix parsed from the claim id (e.g. `v1`), or null if absent. */
  claim_version: string | null
  topic: ProductionReviewTopic
  /** The declared, canonical tool ids this tool-scoped claim attaches to. Empty for non-tool-scoped claims. */
  tool_ids: string[]
  applicability: PaApplicability
  /** Number of governed applicability requirements the evaluator checked (0 = unconditional claim). */
  evaluated_requirement_count: number
  unresolved_requirements: ApplicabilityRequirement[]
  /** The fact basis of the inputs that drove `applicability`. */
  fact_basis: PaFactBasis
  /** Governed statement, verbatim. */
  statement: string | null
  open_dependencies: string[]
  last_verified: string | null
  lifecycle: Lifecycle
  publication_scope: PublicationScope
  governed_claims_reference: string
}

export interface ProductionWithheldClaim {
  claim_id: string
  reason: string
}

export interface ProductionTopicResult {
  topic: ProductionReviewTopic
  findings: ProductionClaimFinding[]
  withheld: ProductionWithheldClaim[]
  /**
   * Bounded Interpretation status for the claims that apply or apply-if — the
   * semantic ceiling. Any fed claim with unresolved applicability caps this at
   * `relevant_applicability_unresolved`; it is never `directly_relevant` then.
   * null when no claim was fed.
   */
  bounded_interpretation_status: InterpretationStatus | null
}

export interface KnowledgeSnapshotEntry {
  claim_id: string
  claim_version: string | null
  last_verified: string | null
  /** null only if a withheld claim id could not be found in the supplied knowledge (never fabricated). */
  lifecycle: Lifecycle | null
  publication_scope: PublicationScope | null
  /** `evaluated` = surfaced as a finding; `withheld` = excluded by eligibility / governance. */
  disposition: 'evaluated' | 'withheld'
}

export interface ProductionReviewResult {
  status: 'reviewed' | 'input_unreadable'
  facts: ProductionFacts
  topics: ProductionTopicResult[]
  /** Canonical declared tools for which no reviewer-eligible governed claim was found. */
  tools_without_governed_coverage: string[]
  /** Declared tools whose identity could not be resolved. */
  unresolved_tools: DeclaredTool[]
  /** Every claim the selector considered, with its version and freshness — deterministic order. */
  knowledge_snapshot: KnowledgeSnapshotEntry[]
}

/** Topic type guard (narrowing a governed KnowledgeTopic to this slice's topics). */
export function isProductionReviewTopic(topic: KnowledgeTopic | string): topic is ProductionReviewTopic {
  return (PRODUCTION_REVIEW_TOPICS as readonly string[]).includes(topic)
}
