/**
 * Discovered-topic claim lookup (Track C — Discovered-Topic Goal Provenance,
 * 2026-08-21). Parallel to lookup-topic-relationships.ts, not a modification
 * of lookup-topic-claims.ts -- same "small, independent, parallel pure
 * function" discipline both of those modules already establish.
 *
 * Root problem this closes: Track A (`lib/crc-engine/discovered-relevance.ts`)
 * correctly discovers that a topic is relevant, and correctly knows WHICH
 * explicit parent goal category authorized that discovery
 * (`DiscoveredTopicOccurrence.source_goal_category`) -- but until this
 * module existed, that provenance was discarded before result assembly:
 * discovered topics were folded into `lookupTopicClaims`'s own
 * `activeGoalCategories` union as bare `GoalCategory` values, and
 * `assembleTopicResult` stamped `matched_goal_category: claim.topic` (the
 * claim's own intrinsic subject, e.g. `third_party_source_rights`) rather
 * than the goal that actually asked the question (e.g. `commercial_use`).
 * `buildBoundedInterpretations`'s own, correct, unchanged
 * `matched_goal_category === goal.category` filter then had no way to
 * associate the two.
 *
 * This module is the discovered-topic counterpart to
 * `lookupRelatedTopicClaims` -- same double-gate discipline (claim's own
 * Lifecycle/CRC-eligible, independently of anything about the trigger),
 * same goal-scoped dedupe key shape (`${sourceGoalCategory}:${claim_id}`,
 * not bare `claim_id}`), same "diagnostics are attributed to the
 * ORIGINATING goal category, never the claim's own topic" rule (required
 * for Case 3A -- `build-bounded-interpretation.ts`'s own
 * `hasUnmetApplicability` check reads `diagnostics.some(d => d.identifier
 * === goal.category ...)`).
 *
 * `lookupTopicClaims` itself is completely unmodified by this milestone --
 * its own `discoveredTopics` parameter/behavior remains fully intact and
 * independently correct for explicit-topic-only lookups; the real
 * production pipeline (`retrieve.ts`) simply stops feeding discovered
 * topics into it, routing them through this module instead.
 *
 * Provider_scope, Lifecycle, CRC-eligibility, and applicability gating are
 * reused verbatim from `lookup-topic-claims.ts` (`providerScopeMatches`,
 * `isApplicable`) -- this module adds zero new gating logic, only
 * provenance-correct result shaping.
 */

import type { GoalCategory } from '@/types/interview-engine'
import type { DiscoveredTopicOccurrence, RetrievalDiagnostic, TopicClaim } from './types'
import { isApplicable, providerScopeMatches, type ApplicabilityFacts } from './lookup-topic-claims'

/**
 * One discovered-topic-eligible claim, still paired with the originating
 * goal category that produced it -- `assembleDiscoveredTopicResult` (Phase
 * 6) needs this to stamp `RetrievalResult.matched_goal_category` correctly,
 * mirroring `RelatedTopicMatch`'s identical shape/purpose exactly.
 */
export interface DiscoveredTopicClaimMatch {
  claim: TopicClaim
  sourceGoalCategory: GoalCategory
}

export interface DiscoveredTopicClaimLookupResult {
  matches: DiscoveredTopicClaimMatch[]
  diagnostics: RetrievalDiagnostic[]
}

/**
 * `occurrences` is the FULL, provenance-preserving list from
 * `deriveDiscoveredTopicOccurrences` -- never the flattened
 * `discoveredTopicCategories()` view (that view remains correct and
 * unchanged for Track B, which only ever needed "is this topic active,"
 * never "for which goal").
 *
 * Distinct `(topic, sourceGoalCategory)` pairs are derived from the
 * occurrence list first -- multiple qualifying mentions satisfying the same
 * trigger/parent-goal (e.g. iStock AND Getty both mentioned) collapse to
 * one claim lookup, since claim eligibility never depends on WHICH specific
 * structured fact triggered discovery, only on which topic and which
 * originating goal.
 */
export function lookupDiscoveredTopicClaims(
  occurrences: DiscoveredTopicOccurrence[],
  topicClaims: TopicClaim[],
  facts: ApplicabilityFacts,
  assetProviders: string[] = [],
): DiscoveredTopicClaimLookupResult {
  const diagnostics: RetrievalDiagnostic[] = []
  const matches: DiscoveredTopicClaimMatch[] = []
  const seen = new Set<string>()

  const pairs = new Map<string, { topic: GoalCategory; sourceGoalCategory: GoalCategory }>()
  for (const occ of occurrences) {
    pairs.set(`${occ.topic}:${occ.source_goal_category}`, { topic: occ.topic, sourceGoalCategory: occ.source_goal_category })
  }

  for (const { topic, sourceGoalCategory } of pairs.values()) {
    // Provider pre-filter runs as part of computing `candidates` itself --
    // BEFORE Lifecycle/CRC-eligible/applicability evaluation below, same
    // ordering/discipline as lookupTopicClaims's own candidates computation.
    const candidates = topicClaims.filter((c) => c.topic === topic && c.superseded_by === null).filter((c) => providerScopeMatches(c, assetProviders))

    if (candidates.length === 0) {
      diagnostics.push({ identifier: sourceGoalCategory, reason: 'no_topic_claim' })
      continue
    }

    let anyEligible = false
    let anyApplicable = false

    for (const claim of candidates) {
      if (claim.lifecycle !== 'Adopted' || claim.crc_eligible !== 'Yes') continue
      anyEligible = true

      if (!isApplicable(claim.applicability_requirements, facts)) continue
      anyApplicable = true

      // Goal-scoped dedup, identical discipline to lookupRelatedTopicClaims's
      // own `${category}:${claim.claim_id}` key -- the same claim may
      // legitimately be retrieved once here (discovered, for one goal) and
      // once via a different path for a different goal; this dedupe only
      // guards against the same claim being reached twice for the SAME
      // originating goal.
      const dedupeKey = `${sourceGoalCategory}:${claim.claim_id}`
      if (seen.has(dedupeKey)) continue
      seen.add(dedupeKey)
      matches.push({ claim, sourceGoalCategory })
    }

    if (!anyEligible) {
      diagnostics.push({ identifier: sourceGoalCategory, reason: 'not_adopted_or_eligible' })
    } else if (!anyApplicable) {
      diagnostics.push({ identifier: sourceGoalCategory, reason: 'applicability_unmet' })
    }
  }

  return { matches, diagnostics }
}
