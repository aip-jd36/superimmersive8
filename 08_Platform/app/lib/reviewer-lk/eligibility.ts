/**
 * Reviewer claim eligibility (CAH-4E §3).
 *
 * The generic predicate deciding whether a governed `TopicClaim` may be shown
 * to a Human Reviewer conducting a Commercial Assurance Assessment.
 *
 * Derived from THREE governance dimensions, and only these three:
 *   1. `lifecycle`         — must be `'Adopted'` (accepted SI8 institutional knowledge)
 *   2. `publication_scope` — must be reviewer-permitted (Reviewer/Commercial
 *                            Assurance | CRC eligible | Public SI8 position)
 *   3. supersession        — `superseded_by === null` (only the current version)
 *
 * `crc_eligible` (Yes / No / Pending) is DELIBERATELY NOT CONSULTED. It governs
 * only the unsupervised CRC publication channel; a Human Reviewer is the
 * judgment layer that channel exists to substitute for. See
 * `CRC-PUBLICATION-POLICY.md` and `GOVERNED-CLAIMS.md`
 * ("Reviewer access may legitimately expose knowledge that is Adopted but not
 * CRC Eligible").
 *
 * Fail closed (CAH-4E §2/§3): a missing, null, or unrecognized
 * `publication_scope` is reviewer-INELIGIBLE. `'Internal/research'` is
 * reviewer-ineligible. Ambiguous governance is never strengthened.
 *
 * Pure. No I/O. No LLM. No interpretation of proposition content.
 */

import {
  PUBLICATION_SCOPES,
  REVIEWER_ELIGIBLE_PUBLICATION_SCOPES,
  type PublicationScope,
  type TopicClaim,
} from '@/lib/retrieval-engine/types'
import type { ReviewerLkWithheld } from './types'

const REVIEWER_ELIGIBLE_SET: ReadonlySet<string> = new Set(REVIEWER_ELIGIBLE_PUBLICATION_SCOPES)
const KNOWN_SCOPE_SET: ReadonlySet<string> = new Set(PUBLICATION_SCOPES)

/**
 * `true` iff `scope` is a `PublicationScope` value a Human Reviewer may
 * consult. `undefined` / `null` / any unrecognized string → `false`.
 */
export function isReviewerEligiblePublicationScope(scope: unknown): scope is PublicationScope {
  return typeof scope === 'string' && REVIEWER_ELIGIBLE_SET.has(scope)
}

export type ReviewerEligibilityOutcome =
  | { eligible: true }
  | { eligible: false; reason: ReviewerLkWithheld['reason'] }

/**
 * The single reviewer eligibility decision for one governed claim. Order of
 * checks is deliberate: supersession and lifecycle before scope, so the
 * withheld reason is the most specific true one.
 */
export function evaluateReviewerEligibility(claim: TopicClaim): ReviewerEligibilityOutcome {
  if (claim.superseded_by !== null) return { eligible: false, reason: 'superseded' }
  if (claim.lifecycle !== 'Adopted') return { eligible: false, reason: 'not_adopted' }

  const scope: unknown = claim.publication_scope
  if (scope === undefined || scope === null || !KNOWN_SCOPE_SET.has(scope as string)) {
    // Missing, null, or a string that is not a recognized PublicationScope.
    return { eligible: false, reason: 'publication_scope_missing_or_unknown' }
  }
  if (!isReviewerEligiblePublicationScope(scope)) {
    // Recognized value, but not one a reviewer may consult (only
    // 'Internal/research' today).
    return { eligible: false, reason: 'publication_scope_not_reviewer_eligible' }
  }

  return { eligible: true }
}

export function isReviewerEligible(claim: TopicClaim): boolean {
  return evaluateReviewerEligibility(claim).eligible
}
