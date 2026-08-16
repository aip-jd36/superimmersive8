/**
 * Governed topic relationship lookup (CRC + Living Knowledge, Governed
 * Topic Relationships implementation milestone, 2026-08-16). Parallel to
 * lookup-topic-claims.ts, not a modification of it -- same "two small pure
 * functions" discipline that module's own header describes.
 *
 * One hop only, by construction: this function reads `relationships`
 * filtered by the caller's own active goal categories exactly once, and
 * never re-queries against a resolved `target_topic`'s own outgoing
 * relationships. There is no recursive call anywhere in this file and no
 * graph-traversal data structure -- "one hop" is not a runtime check, it is
 * the entire shape of the loop below.
 *
 * Double CRC gate (load-bearing, tested explicitly -- see
 * __tests__/retrieval-engine/lookup-topic-relationships.test.ts): a related
 * claim reaches `matches[]` only when BOTH the relationship itself
 * (`lifecycle === 'Adopted' && crc_eligible === 'Yes'`) AND the target
 * claim itself (`lifecycle === 'Adopted' && crc_eligible === 'Yes'`) pass
 * independently. Neither gate alone is sufficient -- a Reviewer/Commercial
 * Assurance-only relationship must never backdoor a CRC-eligible claim into
 * CRC output, and a CRC-eligible relationship must never backdoor a
 * Reviewer-only claim into CRC output.
 *
 * Diagnostics are attributed to the ORIGINATING goal category
 * (`source_topic`/`category`), never `target_topic` -- this is the Case 3A
 * fix the design report flagged: build-bounded-interpretation.ts's own
 * `hasUnmetApplicability` check reads `diagnostics.some(d => d.identifier
 * === goal.category ...)`, so a related-topic diagnostic must carry the
 * goal's own category or `relevant_applicability_unresolved` silently stops
 * firing for related content (falling back to the less-specific, but still
 * honest, `outside_current_coverage`).
 */

import type { GoalCategory, UserGoal } from '@/types/interview-engine'
import type { RetrievalDiagnostic, TopicClaim, TopicRelationship } from './types'
import { isApplicable, type ApplicabilityFacts } from './lookup-topic-claims'

/**
 * One related claim, still paired with the relationship and originating
 * goal category that produced it -- assembleRelatedTopicResult (Phase 6)
 * needs all three to stamp RetrievalResult's provenance fields correctly.
 */
export interface RelatedTopicMatch {
  claim: TopicClaim
  relationship: TopicRelationship
  sourceGoalCategory: GoalCategory
}

export interface RelatedTopicLookupResult {
  matches: RelatedTopicMatch[]
  diagnostics: RetrievalDiagnostic[]
}

/**
 * Only ACTIVE (superseded_by === null), CONFIRMED goals are considered --
 * mirrors lookupTopicClaims' own filter exactly (a declined or superseded
 * goal has nothing to look up related knowledge for).
 */
export function lookupRelatedTopicClaims(
  goals: UserGoal[],
  relationships: TopicRelationship[],
  topicClaims: TopicClaim[],
  facts: ApplicabilityFacts,
): RelatedTopicLookupResult {
  const diagnostics: RetrievalDiagnostic[] = []
  const matches: RelatedTopicMatch[] = []
  const seen = new Set<string>()

  const activeGoalCategories = new Set<GoalCategory>(
    goals.filter((g) => g.superseded_by === null && g.state === 'confirmed').map((g) => g.category),
  )

  for (const category of activeGoalCategories) {
    // Relationship gate: source_topic must match this goal's category
    // exactly (directionality -- a copyright_ownership -> copyrightability
    // relationship never activates for a copyrightability goal), and the
    // relationship itself must be Adopted + CRC-eligible. A relationship
    // that is Adopted-but-Pending (the real REL-COPY-OWNERSHIP-
    // COPYRIGHTABILITY-v1 record, today) never enters this list at all --
    // this is what makes the zero-behavior-change guarantee hold by
    // construction, not by a separate runtime check.
    const eligibleRelationships = relationships.filter(
      (r) => r.source_topic === category && r.superseded_by === null && r.lifecycle === 'Adopted' && r.crc_eligible === 'Yes',
    )

    for (const relationship of eligibleRelationships) {
      const targetCandidates = topicClaims.filter((c) => c.topic === relationship.target_topic && c.superseded_by === null)

      if (targetCandidates.length === 0) {
        diagnostics.push({ identifier: category, reason: 'no_topic_claim' })
        continue
      }

      let anyEligible = false
      let anyApplicable = false

      for (const claim of targetCandidates) {
        // Target claim's OWN gate -- see module header's "Double CRC gate."
        if (claim.lifecycle !== 'Adopted' || claim.crc_eligible !== 'Yes') continue
        anyEligible = true

        if (!isApplicable(claim.applicability_requirements, facts)) continue
        anyApplicable = true

        // Goal-scoped dedup (PM decision, approved 2026-08-16): keyed on
        // (originating goal category, claim_id), not claim_id alone -- the
        // same claim may legitimately be retrieved once per distinct
        // matched_goal_category (e.g. once here for copyright_ownership,
        // and separately, independently, exact-topic for a copyrightability
        // goal in the same conversation -- see retrieve.ts's own merge,
        // which is what actually produces the final cross-path dedupe).
        // This dedupe only guards against the same claim being reached
        // twice for the SAME originating goal via two different eligible
        // relationships that happen to share a source_topic.
        const dedupeKey = `${category}:${claim.claim_id}`
        if (seen.has(dedupeKey)) continue
        seen.add(dedupeKey)
        matches.push({ claim, relationship, sourceGoalCategory: category })
      }

      if (!anyEligible) {
        diagnostics.push({ identifier: category, reason: 'not_adopted_or_eligible' })
      } else if (!anyApplicable) {
        diagnostics.push({ identifier: category, reason: 'applicability_unmet' })
      }
    }
  }

  return { matches, diagnostics }
}
