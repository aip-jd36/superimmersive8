/**
 * Reviewer governed-claim selector (CAH-4E §4/§5/§10/§11).
 *
 * Parallel to — and NEVER a modification of — the CRC retrieval path
 * (`retrieve.ts`, `lookupTopicClaims`, `lookupRelatedTopicClaims`,
 * `lookupDiscoveredTopicClaims`, Track A/B/C). It reuses the existing GENERIC
 * PURE primitives (`providerScopeMatches`, `toolScopeMatches`,
 * `evaluateApplicabilityExpression`) and never reimplements them.
 *
 * Differences from CRC selection, all deliberate:
 *   - eligibility gate is `evaluateReviewerEligibility` (lifecycle +
 *     publication_scope + supersession), NOT `crc_eligible === 'Yes'`;
 *   - a topic-matched, scope-matched, reviewer-eligible claim with a VALID
 *     applicability expression is SURFACED regardless of its met/not_met/
 *     unresolved status — an unresolved requirement is shown to the
 *     reviewer verbatim, never silently withheld and never reinterpreted as
 *     a negative finding (§10). A claim whose governed `applicability_any_of`
 *     is itself structurally INVALID (ADR-001 §K.3) is a distinct condition
 *     — withheld via the same `withheld[]` mechanism as every other
 *     reviewer-ineligibility reason, reason `'invalid_governed_applicability'`
 *     (Reviewer/HRR Fail-Closed Completion milestone, 2026-09-15) — never
 *     treated as an ordinary met/not_met/unresolved outcome, and never
 *     reaching `claims[]` at all;
 *   - input is an EXPLICIT reviewer-selected topic + the submission's own
 *     authoritative facts — never CRC goals, CRC context, CRC transcript,
 *     discovered relevance, or in-flight workbook state (§6).
 *
 * Pure. No I/O. No LLM. No composition. No bounded interpretation.
 */

import {
  evaluateApplicabilityExpression,
  providerScopeMatches,
  toolScopeMatches,
  type ApplicabilityFacts,
} from '@/lib/retrieval-engine/lookup-topic-claims'
import type { KnowledgeTopic, TopicClaim } from '@/lib/retrieval-engine/types'
import { evaluateReviewerEligibility } from './eligibility'
import type { ReviewerApplicabilityOutcome, ReviewerLkClaim, ReviewerLkWithheld } from './types'

const GOVERNED_CLAIMS_DOC = '06_Operations/institutional-knowledge/notebook/GOVERNED-CLAIMS.md'

export interface SelectReviewerClaimsInput {
  /**
   * The topic the reviewer chose to research. `KnowledgeTopic`, not
   * `GoalCategory` (KnowledgeTopic Foundation milestone, 2026-09-13) --
   * reviewer knowledge browsing is legitimately topic-oriented, so a future
   * knowledge-only topic must be selectable here even though no
   * `UserGoal.category` could ever equal it. Today's real caller
   * (`ExplicitResearchIntent.topic: ReviewerResearchTopic`,
   * `lib/reviewer-lk/types.ts`) still only ever supplies a real
   * `GoalCategory`-shaped value -- that classifier enum is a deliberately
   * separate, still-narrower contract, unchanged by this milestone.
   */
  topic: KnowledgeTopic
  /** All governed topic claims (the production fixture, or a test set). */
  topicClaims: TopicClaim[]
  /** Submission-derived. Canonical asset-provider ids for `providerScopeMatches`. */
  assetProviderIds: string[]
  /** Submission-derived. Canonical tool ids for `toolScopeMatches`. */
  activeToolIds: string[]
  /** Submission-derived. For `evaluateApplicabilityDetailed`. */
  applicabilityFacts: ApplicabilityFacts
}

export interface SelectReviewerClaimsOutput {
  claims: ReviewerLkClaim[]
  withheld: ReviewerLkWithheld[]
}

export function selectReviewerClaims(input: SelectReviewerClaimsInput): SelectReviewerClaimsOutput {
  const claims: ReviewerLkClaim[] = []
  const withheld: ReviewerLkWithheld[] = []
  const seen = new Set<string>()

  // Candidate pre-filter: topic match + provider scope + tool scope.
  // `providerScopeMatches` / `toolScopeMatches` fail closed for a
  // provider/tool-scoped claim whose identity is unresolved in the
  // submission-derived context (§11). Supersession is NOT pre-filtered here
  // (unlike `lookupTopicClaims`) — it is handled by `evaluateReviewerEligibility`
  // so a superseded claim on the topic is reported in `withheld` with reason
  // `'superseded'`, giving the reviewer visibility that a newer version exists
  // rather than silently omitting it.
  const candidates = input.topicClaims
    .filter((c) => c.topic === input.topic)
    .filter((c) => providerScopeMatches(c, input.assetProviderIds))
    .filter((c) => toolScopeMatches(c, input.activeToolIds))

  for (const claim of candidates) {
    if (seen.has(claim.claim_id)) continue
    seen.add(claim.claim_id)

    const eligibility = evaluateReviewerEligibility(claim)
    if (!eligibility.eligible) {
      withheld.push({ claim_id: claim.claim_id, reason: eligibility.reason })
      continue
    }

    // Generic Shallow Applicability -- Runtime Foundation milestone
    // (2026-09-15): the CALCULATION now goes through
    // `evaluateApplicabilityExpression` (mandatory + optional
    // `applicability_any_of` alternatives, ADR-001 §K); this consumer's own
    // POLICY is unchanged -- every eligible claim is still surfaced
    // regardless of applicability status (§10, unchanged), carrying the
    // full raw leaf detail (mandatory group first, then each alternative
    // group in order) for the reviewer to read verbatim, and a single
    // established boolean, unchanged in meaning.
    //
    // Reviewer/HRR Fail-Closed Completion milestone (2026-09-15): invalid
    // governed applicability (ADR-001 §K.3) is now withheld HERE, at the
    // earliest point the authoritative evaluator's own explicit `valid`
    // flag is available -- exactly the same place, and the same existing
    // `withheld[]` mechanism, every other reviewer-ineligibility reason
    // already uses (see `evaluateReviewerEligibility` immediately above).
    // An invalid claim never becomes a `ReviewerLkClaim` at all, so no
    // downstream consumer (the HRR applicability partition, the BI
    // adapter) ever has to infer invalidity from
    // `applicability_outcomes.length === 0` -- a shape that, before this
    // fix, was indistinguishable from a legitimately empty, vacuously-met
    // requirement list, and let an invalid claim reach
    // `BiResult.applicability = { status: 'established' }` (the strongest
    // possible conclusion) undetected. See
    // `__tests__/reviewer-lk/hrr-invalid-governance-fail-closed.test.ts`
    // for the end-to-end regression proving this.
    const result = evaluateApplicabilityExpression(claim.applicability_requirements, claim.applicability_any_of, input.applicabilityFacts)
    if (!result.valid) {
      withheld.push({ claim_id: claim.claim_id, reason: 'invalid_governed_applicability' })
      continue
    }
    const applicability_outcomes: ReviewerApplicabilityOutcome[] = result.all_outcomes.map((o) => ({ requirement: o.requirement, status: o.status }))
    const applicability_established = result.status === 'met'

    claims.push({
      claim_id: claim.claim_id,
      topic: claim.topic,
      claim_character: claim.claim_character,
      jurisdiction: claim.jurisdiction,
      lifecycle: claim.lifecycle,
      // Safe: the eligibility gate guarantees a reviewer-permitted scope.
      publication_scope: claim.publication_scope!,
      crc_eligible: claim.crc_eligible,
      statement: claim.crc_candidate_statement,
      crc_publication_scope: claim.crc_publication_scope,
      applicability_outcomes,
      applicability_established,
      unresolved_project_dependencies: claim.unresolved_project_dependencies,
      provider_scope: claim.provider_scope,
      tool_scope: claim.tool_scope,
      last_verified: claim.last_verified,
      superseded_by: null,
      governed_claims_reference: `${GOVERNED_CLAIMS_DOC}#${claim.claim_id.toLowerCase()}`,
    })
  }

  // Deterministic order: by claim_id. Never a relevance / priority rank.
  claims.sort((a, b) => (a.claim_id < b.claim_id ? -1 : a.claim_id > b.claim_id ? 1 : 0))
  withheld.sort((a, b) => (a.claim_id < b.claim_id ? -1 : a.claim_id > b.claim_id ? 1 : 0))

  return { claims, withheld }
}
