/**
 * Reviewer governed-claim selector (CAH-4E §4/§5/§10/§11).
 *
 * Parallel to — and NEVER a modification of — the CRC retrieval path
 * (`retrieve.ts`, `lookupTopicClaims`, `lookupRelatedTopicClaims`,
 * `lookupDiscoveredTopicClaims`, Track A/B/C). It reuses the existing GENERIC
 * PURE primitives (`providerScopeMatches`, `toolScopeMatches`,
 * `evaluateApplicabilityDetailed`) and never reimplements them.
 *
 * Differences from CRC selection, all deliberate:
 *   - eligibility gate is `evaluateReviewerEligibility` (lifecycle +
 *     publication_scope + supersession), NOT `crc_eligible === 'Yes'`;
 *   - a topic-matched, scope-matched, reviewer-eligible claim is SURFACED
 *     regardless of applicability status — an unresolved requirement is shown
 *     to the reviewer verbatim, never silently withheld and never
 *     reinterpreted as a negative finding (§10);
 *   - input is an EXPLICIT reviewer-selected topic + the submission's own
 *     authoritative facts — never CRC goals, CRC context, CRC transcript,
 *     discovered relevance, or in-flight workbook state (§6).
 *
 * Pure. No I/O. No LLM. No composition. No bounded interpretation.
 */

import {
  evaluateApplicabilityDetailed,
  providerScopeMatches,
  toolScopeMatches,
  type ApplicabilityFacts,
} from '@/lib/retrieval-engine/lookup-topic-claims'
import type { TopicClaim } from '@/lib/retrieval-engine/types'
import type { GoalCategory } from '@/types/interview-engine'
import { evaluateReviewerEligibility } from './eligibility'
import type { ReviewerApplicabilityOutcome, ReviewerLkClaim, ReviewerLkWithheld } from './types'

const GOVERNED_CLAIMS_DOC = '06_Operations/institutional-knowledge/notebook/GOVERNED-CLAIMS.md'

export interface SelectReviewerClaimsInput {
  /** The explicit topic the reviewer chose to research. */
  topic: GoalCategory
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

    const rawOutcomes = evaluateApplicabilityDetailed(claim.applicability_requirements, input.applicabilityFacts)
    const applicability_outcomes: ReviewerApplicabilityOutcome[] = rawOutcomes.map((o) => ({
      requirement: o.requirement,
      status: o.status,
    }))
    const applicability_established = applicability_outcomes.every((o) => o.status === 'met')

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
