/**
 * Reviewer Living Knowledge — read-only data contract (CAH-4E).
 *
 * What a Commercial Assurance reviewer may see when they DELIBERATELY look up
 * governed SI8 Living Knowledge while conducting an assessment. This is
 * SI8-GOVERNED INSTITUTIONAL KNOWLEDGE — distinct from CRC context
 * (customer-provided, unverified — CAH-4B/4C) and from the assessment itself
 * (independent Human Reviewer judgment).
 *
 * Nothing in this contract may be written into `workbook_data`, an
 * `assessments` row, an evidence record, a control judgment, a gap, a finding,
 * an outcome, confidence, a sign-off, a report, or a publication decision.
 * Retrieval relevance is NOT assessment evidence. The authority firewall
 * (`__tests__/reviewer-lk/authority-firewall.test.ts`) enforces this
 * structurally, not by convention.
 *
 * Reviewer eligibility is governed by `lifecycle` + `publication_scope` +
 * supersession state ONLY. `crc_eligible` (Yes/No/Pending) NEVER determines
 * reviewer eligibility — see `eligibility.ts`.
 */

import type {
  ApplicabilityRequirement,
  ClaimCharacter,
  CrcEligible,
  Lifecycle,
  PublicationScope,
} from '@/lib/retrieval-engine/types'
import type { ApplicabilityRequirementStatus } from '@/lib/retrieval-engine/lookup-topic-claims'
import type { GoalCategory, GoalScope } from '@/types/interview-engine'

// ── HRR — free-form research intent (CAH-4G.2 Slice 2, 2026-09-10) ───────────
//
// The bounded interpretation of a Human Reviewer's free-form research
// question into VALIDATED STRUCTURED INTENT. This is intent entry only — it
// never answers the question, never retrieves Living Knowledge, never
// evaluates applicability, never runs Bounded Interpretation, never composes
// an answer. See `HRR_GRI_TECHNICAL_DESIGN.md §C/§D` and `ADR-002`.

/**
 * The governed topic universe a Human Reviewer may research — every
 * `GoalCategory` except `'unknown'` (`'unknown'` is never a research topic).
 * The single runtime source of the reviewer-facing labels for these is
 * `topic-labels.ts` (`REVIEWER_TOPIC_LABELS`); this tuple and those keys are
 * asserted equal (and equal to `GOAL_CATEGORIES \ 'unknown'`) by
 * `__tests__/reviewer-lk/hrr-intent-classifier.test.ts`, so a new
 * `GoalCategory` cannot silently bypass one of them.
 */
export const REVIEWER_RESEARCH_TOPICS = [
  'commercial_use',
  'copyright_ownership',
  'copyrightability',
  'likeness',
  'third_party_source_rights',
] as const

export type ReviewerResearchTopic = (typeof REVIEWER_RESEARCH_TOPICS)[number]

/**
 * The maximum number of distinct governed topics ONE free-form reviewer
 * question may resolve to (`HRR_GRI_TECHNICAL_DESIGN.md §T-4`, frozen
 * recommended default `2` pending a bounded internal experiment). Enforced
 * both in the classifier JSON schema (`maxItems`) and again deterministically
 * by `validateAndNormalizePermittedResearchIntent` (a model that ignores
 * `maxItems` must not be able to fan retrieval out later).
 */
export const HRR_MAX_RESOLVED_TOPICS = 2

/**
 * The maximum length (characters, post-trim) of ONE free-form reviewer research
 * question accepted by the HRR research route (CAH-4G.6). A bound at the route
 * boundary — Slice 2 froze no length. A research question about one submission
 * is a sentence or a short paragraph; anything longer is almost certainly a
 * pasted transcript / document and is rejected with a 400, never truncated.
 */
export const HRR_QUESTION_MAX_LENGTH = 1000

/**
 * Why the classifier could not (fully) resolve a permitted explicit research
 * topic. Diagnostic / UI-routing signal only — never an answer, never a
 * factual claim. A future free-form UI uses this to decide how to offer the
 * governed research paths. Enum-closed, no free text.
 */
export const HRR_UNRESOLVED_AMBIGUITY_REASONS = [
  'no_governed_topic_matched',
  'topic_without_governed_coverage',
  'question_too_general',
  'multiple_unrelated_topics',
] as const

export type HrrUnresolvedAmbiguityReason = (typeof HRR_UNRESOLVED_AMBIGUITY_REASONS)[number]

/**
 * The bounded, schema-constrained output of the ONE classify-only model call
 * (`interpret-research-intent.ts`). A single reviewer utterance may carry
 * MORE THAN ONE semantic intent; the classifier separates them, the
 * deterministic authority gate (`hrr-authority-gate.ts`) routes each
 * independently.
 *
 * Structurally incapable of carrying an answer: every field is an enum, a
 * boolean, or an array of enums. There is no `answer` / `summary` /
 * `statement` / `explanation` / `conclusion` / `applicability` field, by
 * construction — a prose emission outside this contract fails validation and
 * the caller fails closed to the unsupported result.
 */
export interface PermittedResearchIntent {
  /**
   * Each governed research clause the question EXPLICITLY names, each with
   * ITS OWN scope. `[]` is valid (no explicitly-supported research clause).
   * Never a fabricated "closest topic". Deduplicated, capped at
   * `HRR_MAX_RESOLVED_TOPICS`.
   */
  research_intents: Array<{
    topic: ReviewerResearchTopic
    /**
     * THIS clause's own scope. `'determination_request'` only when THIS
     * research clause itself asks HRR to decide/determine the topic (e.g.
     * "can you determine whether copyright ownership is satisfied?"),
     * otherwise `'informational'`. Never set by contagion from a separate
     * assessment-decision request in the same utterance
     * (`HRR_GRI_TECHNICAL_DESIGN.md §T-5`, CAH-4G.1).
     */
    scope: GoalScope
  }>
  /**
   * `true` iff the utterance also asks HRR to make a Commercial Assurance
   * assessment decision it is not authorized to make — approve / reject /
   * commercially clear / mark a control passed / declare a finding / judge
   * evidence sufficiency / reach an assessment outcome / sign off. Declined
   * by the authority gate as its own block; NEVER changes the scope of any
   * `research_intents[]` entry.
   */
  assessment_decision_requested: boolean
  unresolved_ambiguity: HrrUnresolvedAmbiguityReason[]
}

/**
 * One permitted research clause, as routed by the deterministic authority
 * gate toward the (future, Slice 3) governed research pipeline. HRR-owned;
 * deliberately NOT a CRC `UserGoal` (which carries conversation lifecycle
 * meaningless for a single reviewer research action —
 * `HRR_GRI_TECHNICAL_DESIGN.md §B`). It also is not yet adapted to `BiIntent`
 * — that adapter lands with the converged pipeline in Slice 3, next to its
 * first real consumer.
 */
export interface ExplicitResearchIntent {
  source_kind: 'topic_selection' | 'interpreted_question'
  topic: ReviewerResearchTopic
  /** Per-clause scope, carried through verbatim from the classifier / the topic pick (always `'informational'` for a topic pick). */
  scope: GoalScope
  /** `true` iff `source_kind === 'interpreted_question'` — i.e. the topic was interpreted from a natural-language question rather than explicitly selected. Provenance, preserved for the answer. */
  interpreted: boolean
  /**
   * A reference to the originating reviewer action (for an interpreted
   * question) — NOT the raw question text, which is never persisted
   * (`HRR_GRI_TECHNICAL_DESIGN.md §T-6`). `null` for a topic pick and until
   * the audited action id exists (Slice 3+).
   */
  source_text_ref: string | null
}

/**
 * The deterministic output of the authority gate (`hrr-authority-gate.ts`) —
 * what the system is PERMITTED to route. Carries no answer, no governed
 * proposition, no assessment conclusion.
 */
export interface HrrAuthorityGateResult {
  /**
   * `'research'` — pure research; run the pipeline for `research_intents`.
   * `'assessment_judgment_redirected'` — the utterance asked for an
   * assessment decision; that is declined (its own refusal block), and any
   * `research_intents` still run independently at their own scope.
   * `'unsupported'` — nothing explicitly supported to research and no
   * assessment decision requested; offer the governed research paths.
   */
  authority_note: 'research' | 'assessment_judgment_redirected' | 'unsupported'
  /** The permitted research clauses to route onward. `[]` when `authority_note !== 'research'` and nothing survived. */
  research_intents: ExplicitResearchIntent[]
  /** The governed research paths to offer the reviewer — populated ONLY when `authority_note !== 'research'`; `null` otherwise. Never an invented "closest topic". */
  offered_research_paths: ReviewerResearchTopic[] | null
  /** Passed through from the classifier for UI routing / observability. */
  unresolved_ambiguity: HrrUnresolvedAmbiguityReason[]
}

/**
 * One applicability requirement of a governed claim, paired with its
 * deterministically-evaluated status against the submission's own facts.
 * `status` is the exact value the generic `evaluateApplicabilityDetailed`
 * primitive returns — never re-derived, never interpreted here, never
 * withheld: `'unresolved'` is shown to the reviewer as "not established",
 * NOT silently treated as a negative finding.
 */
export interface ReviewerApplicabilityOutcome {
  requirement: ApplicabilityRequirement
  status: ApplicabilityRequirementStatus
}

/**
 * One reviewer-eligible governed claim, projected for professional research.
 * Carries the FULL governed record a reviewer needs — deliberately more than
 * `RetrievalResult` (which is minimised for the CRC consumer). Every field is
 * a verbatim passthrough of the governed `TopicClaim`; nothing is composed,
 * paraphrased, ranked, or interpreted.
 */
export interface ReviewerLkClaim {
  claim_id: string
  topic: GoalCategory
  claim_character: ClaimCharacter
  jurisdiction: string
  /** Governance-stage. Always `'Adopted'` for a surfaced claim (the eligibility gate excludes every other value). */
  lifecycle: Lifecycle
  /** Structured governed publication scope — always in `REVIEWER_ELIGIBLE_PUBLICATION_SCOPES` for a surfaced claim. */
  publication_scope: PublicationScope
  /**
   * CRC-channel publication status — DISPLAYED for the reviewer's awareness
   * (e.g. "this fact is not currently approved for the unsupervised CRC
   * channel"), NEVER a gate on whether the reviewer may see the claim.
   */
  crc_eligible: CrcEligible
  /**
   * The reviewer-appropriate statement of the proposition. Reuses the
   * governed `crc_candidate_statement` where one exists (it is the plainest
   * governed wording of the proposition); `null` when the claim has no
   * published statement yet — in which case the reviewer consults the
   * canonical ledger via `governed_claims_reference`.
   */
  statement: string | null
  /** The governed CRC publication-scope prose, verbatim. Additional reviewer context on what the statement is and is not scoped to say. */
  crc_publication_scope: string | null
  applicability_outcomes: ReviewerApplicabilityOutcome[]
  /** `true` iff every applicability requirement evaluated `'met'`. `false` means "one or more requirements are unresolved / not met" — shown, never interpreted as a negative finding. Empty requirement list ⇒ `true` (vacuously applicable). */
  applicability_established: boolean
  /** Governed project-fact dependencies CRC does not model — verbatim identifiers, informational only. */
  unresolved_project_dependencies: string[]
  provider_scope: string[] | null
  tool_scope: string[] | null
  last_verified: string | null
  /** Always `null` for a surfaced claim — the eligibility gate excludes superseded claims (only the current version is shown). */
  superseded_by: null
  /** A stable pointer into the canonical ledger for the full record (SI8 interpretation, prohibited conclusions, source references). */
  governed_claims_reference: string
}

/**
 * A governed claim that was topic-matched + scope-matched but WITHHELD from
 * the reviewer by the eligibility gate, with the bounded reason. Surfaced so
 * the reviewer knows governed knowledge exists on the topic that they are not
 * being shown (and why) — never the claim's content.
 */
export interface ReviewerLkWithheld {
  claim_id: string
  reason:
    | 'not_adopted'
    | 'superseded'
    | 'publication_scope_not_reviewer_eligible'
    | 'publication_scope_missing_or_unknown'
}

// `ReviewerLkLookupResult` (the CAH-4E topic-lookup response) was retired in
// CAH-4G.7 with the legacy `GET .../reviewer-lk` route. The converged HRR path
// returns `HrrResearchAnswer` (`lib/hrr/types.ts`) for both entry modes.

/**
 * The bounded, authoritative submission facts used as retrieval context.
 * These are SUBMISSION FACTS — they do not become Living Knowledge, and the
 * Living Knowledge results do not become submission evidence.
 */
export interface ReviewerLkRetrievalContext {
  /** Canonical tool identifiers resolved from the submission's own `tools_used`. */
  resolved_tool_ids: string[]
  /** Canonical asset-provider identifiers resolved from the submission (V1: not modelled; always `[]`). */
  resolved_asset_provider_ids: string[]
  /** Assessment-jurisdiction membership derived from the submission's `territory_preferences`. */
  jurisdiction_included: string[]
}

/** The one write CAH-4E introduces — a bounded, append-only access-fact audit. */
export interface ReviewerLkAccessAudit {
  actorUserId: string
  submissionId: string
}
