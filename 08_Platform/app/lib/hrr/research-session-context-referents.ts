/**
 * ResearchSessionContext — AUTHORITATIVE REFERENT VALIDATION (CAH-4G.16,
 * 2026-09-11).
 *
 * Shape/length validation (`research-session-context.schema.ts`, CAH-4G.15)
 * is NECESSARY but NOT SUFFICIENT. A syntactically valid string like
 * `"ignore_previous_instructions"` passes every CAH-4G.15 bound check
 * (non-empty, ≤ `HRR_MAX_REFERENT_IDENTIFIER_LENGTH`, count ≤
 * `HRR_MAX_UNRESOLVED_REFERENTS`) while being pure client-invented text.
 *
 * This module proves a referent is a REAL, currently-governed identifier —
 * not merely well-formed — before it may ever reach the classifier boundary.
 *
 * Two identifier namespaces exist, matching `HrrUnresolvedInput.kind`
 * (`lib/hrr/types.ts`): `applicability_requirement` (an `ApplicabilityFact`
 * value) and `project_dependency` (a governed-claim-authored string, e.g.
 * `human_contribution_description`). Rather than tagging every referent
 * with its kind (a breaking change to the already-shipped CAH-4G.15
 * `ResearchSessionContext.unresolvedReferents: string[]` shape), this
 * module validates against the UNION of both namespaces, SCOPED to the
 * SAME submission + topic the real pipeline would have used to produce
 * them. This is judged an equivalent-safety representation because: (a)
 * the two namespaces' actual vocabularies never collide in practice
 * (`ApplicabilityFact` is a closed 3-value enum: `jurisdiction`,
 * `tool_plan_tier`, `tool_account_status`; project-dependency identifiers
 * are distinct descriptive strings); (b) the downstream use (an opaque
 * hint token in a classifier prefix) never needs to distinguish which
 * namespace a referent came from.
 *
 * Genericity (CAH-4G.16 Phase 4): NO copyright/likeness/music/provider-
 * specific identifier is hard-coded anywhere in this file. The authoritative
 * set is computed fresh, per request, from whatever governed claims
 * currently exist — by REUSING `selectReviewerClaims` (`lib/reviewer-lk/
 * select-reviewer-claims.ts`), the exact same eligibility-filtering function
 * the real research pipeline (`researchOneTopic`, `lib/hrr/
 * run-hrr-research.ts`) already uses. A referent that no eligible claim for
 * this submission and topic could ever have produced is never trusted,
 * regardless of how well-formed the string looks.
 */

import { selectReviewerClaims } from '@/lib/reviewer-lk/select-reviewer-claims'
import type { ReviewerLkContextBundle } from '@/lib/reviewer-lk/submission-facts'
import type { ReviewerResearchTopic } from '@/lib/reviewer-lk/types'
import type { TopicClaim } from '@/lib/retrieval-engine/types'
import { EMPTY_RESEARCH_SESSION_CONTEXT, type ResearchSessionContext } from './research-session-context'

/**
 * The exact, submission- and topic-scoped set of identifiers a real
 * `runHrrResearch()` call could legitimately have surfaced as an unresolved
 * referent — reused verbatim from the real pipeline's own eligibility
 * gate, never reimplemented or approximated.
 */
export function collectAuthoritativeReferentIdentifiers(
  topic: ReviewerResearchTopic,
  reviewerContext: ReviewerLkContextBundle,
  topicClaims: TopicClaim[],
): Set<string> {
  const { claims } = selectReviewerClaims({
    topic,
    topicClaims,
    assetProviderIds: reviewerContext.assetProviderIds,
    activeToolIds: reviewerContext.activeToolIds,
    applicabilityFacts: reviewerContext.applicabilityFacts,
  })

  const ids = new Set<string>()
  for (const claim of claims) {
    for (const outcome of claim.applicability_outcomes) ids.add(outcome.requirement.fact)
    for (const dependency of claim.unresolved_project_dependencies) ids.add(dependency)
  }
  return ids
}

/**
 * The server-authoritative enforcement step. `context` has already passed
 * CAH-4G.15's strict SHAPE validation (`resolveResearchSessionContext`) —
 * this step additionally proves every referent it carries is a REAL
 * identifier for THIS submission's THIS topic.
 *
 * Policy, stated explicitly (CAH-4G.16 Phase 5): on ANY referent that fails
 * authoritative validation, the WHOLE context is rejected — degraded to
 * `EMPTY_RESEARCH_SESSION_CONTEXT` — never a "keep the good referents, drop
 * the bad ones" partial sanitization. This is deliberately consistent with
 * CAH-4G.15's own whole-payload-rejection policy for shape violations: a
 * detected tampering/staleness signal on any part of the context is treated
 * as reason to distrust the whole object, not just the flagged field.
 *
 * `context.activeFocus === null` short-circuits to `context` unchanged —
 * there is nothing to authoritatively check (no referents can exist without
 * a focus; CAH-4G.15's schema validator already guarantees this invariant).
 */
export function enforceAuthoritativeReferents(
  context: ResearchSessionContext,
  reviewerContext: ReviewerLkContextBundle,
  topicClaims: TopicClaim[],
): ResearchSessionContext {
  if (context.activeFocus === null) return context
  if (context.unresolvedReferents.length === 0) return context

  const authoritative = collectAuthoritativeReferentIdentifiers(context.activeFocus, reviewerContext, topicClaims)
  const allValid = context.unresolvedReferents.every((id) => authoritative.has(id))
  if (allValid) return context

  return { ...EMPTY_RESEARCH_SESSION_CONTEXT }
}
