/**
 * Reviewer Living Knowledge projection (CAH-4E §9).
 *
 * Thin and neutral. It assembles the selector output + retrieval context into
 * the final `ReviewerLkLookupResult` and attaches the fixed framing. It does
 * NOT:
 *   - call `buildBoundedInterpretation` or any Consultative Composition
 *     module;
 *   - generate prose;
 *   - rank, weight, or prioritise claims;
 *   - interpret applicability status;
 *   - re-derive anything the selector already computed.
 *
 * The governed statements it carries are the verbatim
 * `TopicClaim.crc_candidate_statement` values the selector passed through —
 * the plainest GOVERNED wording of each proposition, not a CRC educational
 * answer and not reviewer-specific prose.
 */

import type { GoalCategory } from '@/types/interview-engine'
import type { SelectReviewerClaimsOutput } from './select-reviewer-claims'
import type { ReviewerLkLookupResult, ReviewerLkRetrievalContext } from './types'

/**
 * The reviewer-facing authority framing for this surface. Fixed, generic, not
 * domain-specific. Rendered wherever reviewer-LK results appear.
 */
export const REVIEWER_LK_FRAMING = {
  heading: 'Governed SI8 Living Knowledge — reviewer research',
  body:
    'This is governed SI8 institutional knowledge, provided for the reviewer’s research. ' +
    'It is not an assessment conclusion and completes no Commercial Assurance control. ' +
    'Applicability information is informational and does not substitute for reviewer judgment.',
  applicability_note:
    'Applicability is evaluated deterministically against the submission’s own facts. ' +
    '“Not established” means a required fact is unresolved or does not match — it is not a negative finding.',
} as const

export function projectReviewerLkResult(args: {
  topic: GoalCategory
  retrievalContext: ReviewerLkRetrievalContext
  selection: SelectReviewerClaimsOutput
}): Extract<ReviewerLkLookupResult, { ok: true }> {
  return {
    ok: true,
    topic: args.topic,
    retrieval_context: args.retrievalContext,
    claims: args.selection.claims,
    withheld: args.selection.withheld,
  }
}
