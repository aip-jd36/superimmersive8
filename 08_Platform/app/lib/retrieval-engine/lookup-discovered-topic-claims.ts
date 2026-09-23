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
 * `evaluateApplicabilityDetailed`) -- this module adds zero new gating
 * logic, only provenance-correct result shaping.
 *
 * CRC Generic Applicability Diagnostic Parity milestone (2026-08-24):
 * switched from the boolean-only `isApplicable()` to
 * `evaluateApplicabilityDetailed()` -- the same single three-state
 * applicability authority every other Retrieval path already uses (Matrix,
 * explicit TopicClaim) -- so a discovered-topic-origin claim's diagnostic
 * can carry the same `unmet_applicability` claim-level detail (met/
 * unresolved/not_met) the other two paths already produce. `isApplicable()`
 * itself is unchanged and remains this module's sibling functions' shared
 * authority elsewhere in the codebase; this file simply stopped calling it,
 * in favor of the strictly more informative function it is already derived
 * from.
 */

import type { GoalCategory } from '@/types/interview-engine'
import type { DiscoveredTopicOccurrence, KnowledgeTopic, RetrievalDiagnostic, TopicClaim, UnmetApplicabilityDetail } from './types'
import { evaluateApplicabilityExpression, providerScopeMatches, type ApplicabilityFacts } from './lookup-topic-claims'

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

  const pairs = new Map<string, { topic: KnowledgeTopic; sourceGoalCategory: GoalCategory }>()
  for (const occ of occurrences) {
    pairs.set(`${occ.topic}:${occ.source_goal_category}`, { topic: occ.topic, sourceGoalCategory: occ.source_goal_category })
  }

  for (const { topic, sourceGoalCategory } of pairs.values()) {
    // Provider pre-filter runs as part of computing `candidates` itself --
    // BEFORE Lifecycle/CRC-eligible/applicability evaluation below, same
    // ordering/discipline as lookupTopicClaims's own candidates computation.
    //
    // Generic Orthogonal-Fact Discovery — TopicRelationship Authorization
    // milestone (2026-09-11): geographic (or any other orthogonal-fact)
    // narrowing is DELIBERATELY NOT applied here. An orthogonal fact's own
    // claim-level discovery metadata (e.g. `geographic_relevance_scope`) is
    // consulted ONLY upstream, in `deriveClaimTargetedDiscoveryOccurrences`
    // (lib/crc-engine/discovered-relevance.ts), to decide WHETHER a
    // territory-sourced occurrence exists for a given (topic,
    // sourceGoalCategory) pair at all -- geography is additive discovery
    // only, never a downstream narrowing filter here. A prior
    // implementation (superseded, see that module's own header) applied a
    // `viaTerritoryTrigger`-gated territory filter in this exact spot; it
    // was removed because a pair-level narrowing filter cannot safely
    // coexist with a pair simultaneously reached by an unrelated,
    // non-territory trigger (it would silently exclude claims that trigger
    // legitimately reached) -- see `discovered-relevance.ts`'s own header
    // for the full architecture-diagnostic trail.
    const candidates = topicClaims.filter((c) => c.topic === topic && c.superseded_by === null).filter((c) => providerScopeMatches(c, assetProviders))

    if (candidates.length === 0) {
      diagnostics.push({ identifier: sourceGoalCategory, reason: 'no_topic_claim' })
      continue
    }

    let anyEligible = false
    // CRC Generic Applicability Diagnostic Parity milestone (2026-08-24):
    // mirrors lookup-topic-claims.ts's own `unmetDetail` aggregation
    // exactly -- built per-claim during this loop regardless of whether a
    // sibling candidate is applicable, and emitted below whenever non-empty
    // (never gated on "every candidate is inapplicable," which is what
    // silently dropped this detail before this milestone).
    //
    // Generic Shallow Applicability -- Track A Authority Completion
    // milestone (2026-09-15): the applicability CALCULATION now goes
    // through `evaluateApplicabilityExpression` (ADR-001-generic-
    // applicability-architecture.md §K), the SAME authoritative evaluator
    // `lookupTopicClaims`/`retrieve.ts`/`applicability-readiness.ts` already
    // use -- closing the exact local-duplicate-interpretation seam this
    // module's own header previously described ("switched from
    // isApplicable() to evaluateApplicabilityDetailed()... the same single
    // three-state applicability authority every other Retrieval path
    // already uses"). This module still does zero OR/AND/materiality logic
    // of its own -- it consumes the evaluator's authoritative `status` and
    // centrally-derived `material_unresolved` exactly as the other three
    // consumers do. `unmetDetail` is populated from `material_unresolved`
    // (empty for a claim whose own aggregate has settled `not_met` --
    // nothing is material once an expression is false; see
    // lookup-topic-claims.ts's own identical-rationale comment).
    // `anyNonMet`, tracked independently of `unmetDetail.length`, preserves
    // this module's own documented Case 3A requirement (diagnostic
    // PRESENCE, keyed on `sourceGoalCategory`, must fire whenever any
    // eligible discovered claim failed to fully match -- unchanged by
    // whether anything in it turned out to be material).
    const unmetDetail: UnmetApplicabilityDetail[] = []
    const invalidGovernanceClaimIds: string[] = []
    let anyNonMet = false

    for (const claim of candidates) {
      if (claim.lifecycle !== 'Adopted' || claim.crc_eligible !== 'Yes') continue
      anyEligible = true

      const result = evaluateApplicabilityExpression(claim.applicability_requirements, claim.applicability_any_of, facts)

      if (!result.valid) {
        invalidGovernanceClaimIds.push(claim.claim_id)
        continue
      }

      if (result.status !== 'met') {
        anyNonMet = true
        for (const o of result.material_unresolved)
          unmetDetail.push({ claim_id: claim.claim_id, requirement: o.requirement, status: o.status, unresolved_reason: o.unresolved_reason })
        continue
      }

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
    } else {
      if (anyNonMet) {
        // `identifier: sourceGoalCategory` (the ORIGINATING explicit goal
        // category), never `topic` -- unchanged Track C provenance discipline,
        // identical to every other diagnostic this loop already emits (see
        // this module's own header) and identical to how `matches` above are
        // already stamped with `sourceGoalCategory`, not the claim's own
        // intrinsic topic.
        diagnostics.push({ identifier: sourceGoalCategory, reason: 'applicability_unmet', unmet_applicability: unmetDetail })
      }
      // Invalid-governance defense (ADR-001 §K.3): a distinct diagnostic,
      // never `applicability_unmet`, never carrying `unmet_applicability` --
      // never feeds materiality, never creates a Track B need, never
      // silently reinterpreted. Unreachable for any production discovered-
      // topic claim today (every `applicability_any_of` is absent or
      // already valid). Same generic diagnostic reason every other
      // Retrieval path already uses -- no Track-A-specific taxonomy needed.
      if (invalidGovernanceClaimIds.length > 0) diagnostics.push({ identifier: sourceGoalCategory, reason: 'applicability_invalid_governance' })
    }
  }

  return { matches, diagnostics }
}
