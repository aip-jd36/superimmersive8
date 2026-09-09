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
import type { GoalCategory } from '@/types/interview-engine'

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

export type ReviewerLkLookupResult =
  | {
      ok: true
      topic: GoalCategory
      /** The submission facts actually used to narrow retrieval — echoed back for the reviewer's transparency, NEVER written anywhere. */
      retrieval_context: ReviewerLkRetrievalContext
      claims: ReviewerLkClaim[]
      withheld: ReviewerLkWithheld[]
    }
  | { ok: false; code: 'unknown_topic' | 'no_such_submission' | 'lookup_failed' }

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
