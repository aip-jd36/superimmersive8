/**
 * runProductionReview — the Product A internal-preview pipeline
 * (CAA-PRODUCT-A-2).
 *
 *   submission row
 *     → buildProductionFacts()        declared facts only (build-production-facts.ts)
 *     → per topic: selectReviewerClaims()
 *         reused UNCHANGED: provider/tool scope pre-filter, reviewer
 *         eligibility (lifecycle, publication scope, supersession), and the
 *         authoritative deterministic applicability evaluator
 *     → partition on applicability: not_met → does_not_apply_on_declared_facts
 *                                   met / unresolved → fed to Bounded Interpretation
 *     → buildBoundedInterpretations() via the existing HRR adapters — the
 *         semantic ceiling (unresolved applicability is never `directly_relevant`)
 *     → ProductionReviewResult (structured, no prose)
 *
 * PURE. No DB, no model call, no I/O, no writes of any kind.
 *
 * Authority invariants:
 *   - Never re-derives applicability; reads `applicability_status` exactly as
 *     the selector stamped it.
 *   - Never promotes `unresolved` to `applies`.
 *   - Never consults `crc_eligible` (this is a reviewer-eligible INTERNAL
 *     preview — see types.ts header).
 *   - Never infers an asset provider or a jurisdiction.
 *   - Never reads or writes Commercial Assurance (Product B) or CRC state.
 */

import { buildBoundedInterpretations } from '@/lib/bounded-interpretation/build-bounded-interpretation'
import type { BiIntent } from '@/lib/bounded-interpretation/types'
import { reviewerClaimToBiResult } from '@/lib/hrr/bi-adapters'
import { selectReviewerClaims } from '@/lib/reviewer-lk/select-reviewer-claims'
import { reviewerTopicLabel } from '@/lib/reviewer-lk/topic-labels'
import type { ReviewerLkClaim } from '@/lib/reviewer-lk/types'
import type { TopicClaim } from '@/lib/retrieval-engine/types'
import { buildProductionFacts, type ProductionFactsInput } from './build-production-facts'
import {
  PRODUCTION_REVIEW_TOPICS,
  type KnowledgeSnapshotEntry,
  type PaApplicability,
  type ProductionClaimFinding,
  type ProductionReviewResult,
  type ProductionReviewTopic,
  type ProductionTopicResult,
} from './types'

export function parseClaimVersion(claimId: string): string | null {
  const m = claimId.match(/-(v\d+)$/i)
  return m ? m[1].toLowerCase() : null
}

function toApplicability(status: ReviewerLkClaim['applicability_status']): PaApplicability {
  if (status === 'met') return 'applies'
  if (status === 'not_met') return 'does_not_apply_on_declared_facts'
  return 'applies_if' // 'unresolved' — and anything unexpected fails closed here too
}

function byClaimId<T extends { claim_id: string }>(a: T, b: T): number {
  return a.claim_id < b.claim_id ? -1 : a.claim_id > b.claim_id ? 1 : 0
}

function reviewTopic(
  topic: ProductionReviewTopic,
  topicClaims: TopicClaim[],
  bundle: ReturnType<typeof buildProductionFacts>,
): ProductionTopicResult {
  const selected = selectReviewerClaims({
    topic,
    topicClaims,
    assetProviderIds: bundle.assetProviderIds,
    activeToolIds: bundle.activeToolIds,
    applicabilityFacts: bundle.applicabilityFacts,
  })

  const findings: ProductionClaimFinding[] = selected.claims
    .map((claim) => ({
      claim_id: claim.claim_id,
      claim_version: parseClaimVersion(claim.claim_id),
      topic,
      tool_ids: (claim.tool_scope ?? []).filter((t) => bundle.activeToolIds.includes(t)).sort(),
      applicability: toApplicability(claim.applicability_status),
      evaluated_requirement_count: claim.applicability_outcomes.length,
      unresolved_requirements: claim.applicability_status === 'unresolved' ? claim.applicability_material_unresolved : [],
      // The only inputs that can drive applicability in this slice are customer declarations.
      fact_basis: 'customer_declared' as const,
      statement: claim.statement,
      open_dependencies: [...claim.unresolved_project_dependencies],
      last_verified: claim.last_verified,
      lifecycle: claim.lifecycle,
      publication_scope: claim.publication_scope,
      governed_claims_reference: claim.governed_claims_reference,
    }))
    .sort(byClaimId)

  // Bounded Interpretation over the claims that apply or apply-if (not_met excluded, as in HRR).
  const fed = selected.claims.filter((c) => c.applicability_status !== 'not_met')
  let biStatus: ProductionTopicResult['bounded_interpretation_status'] = null
  if (fed.length > 0) {
    const intent: BiIntent = {
      intent_id: `production-review:${topic}`,
      intent_text: reviewerTopicLabel(topic),
      category: topic,
      scope: 'informational',
    }
    const [bi] = buildBoundedInterpretations([intent], fed.map(reviewerClaimToBiResult))
    biStatus = bi?.status ?? null
  }

  return {
    topic,
    findings,
    withheld: [...selected.withheld].sort(byClaimId).map((w) => ({ claim_id: w.claim_id, reason: w.reason })),
    bounded_interpretation_status: biStatus,
  }
}

export function runProductionReview(submission: ProductionFactsInput, topicClaims: TopicClaim[]): ProductionReviewResult {
  const bundle = buildProductionFacts(submission, topicClaims)

  if (bundle.facts.tools_input === 'unreadable') {
    // Fail closed: an unreadable tools list means no governed evaluation at all.
    return {
      status: 'input_unreadable',
      facts: bundle.facts,
      topics: [],
      tools_without_governed_coverage: [],
      unresolved_tools: [],
      knowledge_snapshot: [],
    }
  }

  const topics = PRODUCTION_REVIEW_TOPICS.map((t) => reviewTopic(t, topicClaims, bundle))

  const coveredTools = new Set(topics.flatMap((t) => t.findings.flatMap((f) => f.tool_ids)))
  const toolsWithoutCoverage = bundle.activeToolIds.filter((id) => !coveredTools.has(id)).sort()

  const claimById = new Map(topicClaims.map((c) => [c.claim_id, c]))
  const snapshot: KnowledgeSnapshotEntry[] = []
  for (const t of topics) {
    for (const f of t.findings) {
      snapshot.push({
        claim_id: f.claim_id,
        claim_version: f.claim_version,
        last_verified: f.last_verified,
        lifecycle: f.lifecycle,
        publication_scope: f.publication_scope,
        disposition: 'evaluated',
      })
    }
    for (const w of t.withheld) {
      const c = claimById.get(w.claim_id)
      snapshot.push({
        claim_id: w.claim_id,
        claim_version: parseClaimVersion(w.claim_id),
        last_verified: c?.last_verified ?? null,
        lifecycle: c?.lifecycle ?? null,
        publication_scope: c?.publication_scope ?? null,
        disposition: 'withheld',
      })
    }
  }
  snapshot.sort(byClaimId)

  return {
    status: 'reviewed',
    facts: bundle.facts,
    topics,
    tools_without_governed_coverage: toolsWithoutCoverage,
    unresolved_tools: bundle.facts.tools.filter((t) => t.identity.kind === 'unresolved'),
    knowledge_snapshot: snapshot,
  }
}
