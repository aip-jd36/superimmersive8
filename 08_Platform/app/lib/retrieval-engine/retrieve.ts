/**
 * Retrieval orchestrator (RETRIEVAL_ENGINE_ARCHITECTURE.md §3, Prototype
 * Beta). Chains Phases 3-6 exactly as specified:
 *
 *   RetrievalHandoff
 *         v
 *   extractMatchableFacts        (Phase 3)
 *         v
 *   lookupRows                   (Phase 4 -- exact tool-identifier match only)
 *         v
 *   enumerateEligibleClaims      (Phase 5 -- CRC-Eligible: Yes only)
 *         v
 *   assembleResult                (Phase 6)
 *         v
 *   RetrievalResult[]
 *
 * No LLM, no fuzzy matching, no ranking, no semantic search, no parsing of
 * CRC Publication Scope -- every step above is a pure function over
 * already-structured data. `matrix` is a required parameter, not defaulted
 * to MATRIX_FIXTURE, so tests (and any future real caller) can supply
 * exactly the rows a given case needs without this module reaching for the
 * full fixture on their behalf.
 *
 * Deduplicates by (matrix_identifier, claim_id): the current extraction
 * pipeline can produce two independent ToolMention records that both
 * resolve to the same canonical identifier (two separate, uncorrected
 * mentions of the same tool across turns), which would otherwise surface
 * the same claim twice.
 */

import type { RetrievalHandoff, UserGoal } from '@/types/interview-engine'
import { extractMatchableFacts } from './extract-matchable-facts'
import { lookupRows } from './lookup-rows'
import { enumerateEligibleClaims } from './enumerate-eligible-claims'
import { assembleResult, assembleTopicResult, assembleRelatedTopicResult, assembleDiscoveredTopicResult } from './assemble-result'
import { lookupTopicClaims, type ApplicabilityFacts } from './lookup-topic-claims'
import { lookupRelatedTopicClaims } from './lookup-topic-relationships'
import { lookupDiscoveredTopicClaims } from './lookup-discovered-topic-claims'
import type { DiscoveredTopicOccurrence, MatrixRow, RetrievalDiagnostic, RetrievalResult, TopicClaim, TopicRelationship } from './types'

export interface RetrieveOutput {
  results: RetrievalResult[]
  diagnostics: RetrievalDiagnostic[]
}

const UNKNOWN_APPLICABILITY_FACTS: ApplicabilityFacts = { jurisdiction: { state: 'unknown' }, toolMentions: [] }

/**
 * `goals`/`topicClaims`/`applicabilityFacts` are additive parameters (CRC
 * Living Knowledge Phase 1, 2026-08-16) -- every existing call site
 * continues to work unmodified (empty goals/claims list, unknown
 * jurisdiction default), same "defaults preserve existing behavior"
 * discipline already used for assembleProjectionOutput's own
 * `interpretations` parameter (CRC Milestone 2). Tool Retrieval and Topic
 * Retrieval run independently and their results are merged into ONE
 * `RetrievalResult[]` -- preserving the single "Governed Applicable Claim
 * Set" output PRD v0.2 §14 requires; lib/bounded-interpretation/ receives
 * one list and does not need to know which path produced which entry.
 *
 * `relationships` (additive, Governed Topic Relationships milestone,
 * 2026-08-16, same defaults-preserve-existing-behavior discipline): a
 * third, independent lookup -- lookupRelatedTopicClaims -- runs after Topic
 * Retrieval and merges into the same `RetrievalResult[]`. Empty array
 * default means every pre-existing call site is completely unaffected.
 * With the real, single, CRC-Pending REL-COPY-OWNERSHIP-COPYRIGHTABILITY-v1
 * relationship, `lookupRelatedTopicClaims` returns zero matches by
 * construction (its own relationship-eligibility filter excludes any
 * non-CRC-eligible relationship before any claim is even considered) --
 * this is the mechanism the zero-behavior-change requirement rests on.
 *
 * `assetProviders` (additive, Living Knowledge — Third-Party Source Rights,
 * M3, 2026-08-18, same defaults-preserve-existing-behavior discipline as
 * every parameter above it): threaded straight through to
 * `lookupTopicClaims`'s own provider pre-filter, unmodified. Deliberately
 * NOT sourced from `StructuredUnderstanding` directly by this module --
 * `handoff.asset_providers` (already computed by `buildRetrievalHandoff`,
 * Interview Engine's own boundary) is the correct, smallest-existing-route
 * source; `run-crc-conversation.ts` passes it explicitly. Never threaded
 * into `lookupRelatedTopicClaims` -- no `third_party_source_rights`
 * `TopicRelationship` is approved, so provider-scoped claims cannot
 * currently be reached via the related-topic path at all; see that
 * module's own architecture note if a future relationship ever targets or
 * sources this topic.
 *
 * `discoveredTopicOccurrences` (Track A — Generic Discovered Relevance
 * milestone, 2026-08-21; changed from a flat `GoalCategory[]` to this
 * provenance-preserving shape by Track C — Discovered-Topic Goal
 * Provenance, 2026-08-21): additive, same defaults-preserve-existing-
 * behavior discipline as every parameter above it. No longer threaded into
 * `lookupTopicClaims` at all (that function's own `discoveredTopics`
 * parameter remains fully intact and independently correct for
 * explicit-topic-only lookups -- this call site simply stops feeding it
 * discovered topics). Instead routed through the parallel, independent
 * `lookupDiscoveredTopicClaims` -> `assembleDiscoveredTopicResult` path,
 * which stamps `matched_goal_category` with the ORIGINATING explicit goal
 * category (`DiscoveredTopicOccurrence.source_goal_category`) rather than
 * the claim's own intrinsic topic -- see that module's own header for why:
 * `buildBoundedInterpretations`'s existing, unmodified
 * `matched_goal_category === goal.category` filter needs this to associate
 * discovered knowledge with the explicit goal that caused it to become
 * relevant. Deliberately NOT threaded into `lookupRelatedTopicClaims` -- no
 * discovered-relevance-sourced `TopicRelationship` traversal is in scope
 * for this milestone (see discovered-relevance.ts's own one-hop-boundary
 * note); a future relationship reachable only from a discovered topic
 * would need that extension made deliberately, not silently inherited
 * here.
 */
export function retrieve(
  handoff: RetrievalHandoff,
  matrix: MatrixRow[],
  goals: UserGoal[] = [],
  topicClaims: TopicClaim[] = [],
  applicabilityFacts: ApplicabilityFacts = UNKNOWN_APPLICABILITY_FACTS,
  relationships: TopicRelationship[] = [],
  assetProviders: string[] = [],
  discoveredTopicOccurrences: DiscoveredTopicOccurrence[] = [],
): RetrieveOutput {
  const matchable = extractMatchableFacts(handoff)
  const diagnostics: RetrievalDiagnostic[] = []
  const seen = new Set<string>()
  const results: RetrievalResult[] = []

  for (const alias of handoff.unresolved_aliases) {
    diagnostics.push({ identifier: alias, reason: 'unresolved_alias' })
  }

  const lookups = lookupRows(matchable.tools, matrix)
  for (const { identifier, row } of lookups) {
    if (!row) {
      diagnostics.push({ identifier, reason: 'no_matrix_row' })
      continue
    }

    const eligibleClaims = enumerateEligibleClaims(row)
    if (eligibleClaims.length === 0) {
      diagnostics.push({ identifier, reason: 'no_eligible_claims' })
      continue
    }

    for (const claim of eligibleClaims) {
      const assembled = assembleResult({ kind: 'tool', identifier }, row, claim)
      if (!assembled) {
        diagnostics.push({ identifier: claim.claim_id, reason: 'yes_claim_missing_scope' })
        continue
      }
      // Dedupe key includes matched_goal_category (Governed Topic
      // Relationships milestone, 2026-08-16) -- purely additive for this
      // path: matched_goal_category is always a deterministic function of
      // the claim already (assembleResult sets it to the claim's own
      // topic), so no previously-deduped pair becomes un-deduped here.
      const dedupeKey = `${assembled.matrix_identifier}:${assembled.claim_id}:${assembled.matched_goal_category}`
      if (seen.has(dedupeKey)) continue
      seen.add(dedupeKey)
      results.push(assembled)
    }
  }

  const topicLookup = lookupTopicClaims(goals, topicClaims, applicabilityFacts, assetProviders)
  diagnostics.push(...topicLookup.diagnostics)
  for (const claim of topicLookup.matches) {
    const assembled = assembleTopicResult(claim)
    if (!assembled) {
      diagnostics.push({ identifier: claim.claim_id, reason: 'yes_claim_missing_scope' })
      continue
    }
    const dedupeKey = `${assembled.matrix_identifier}:${assembled.claim_id}:${assembled.matched_goal_category}`
    if (seen.has(dedupeKey)) continue
    seen.add(dedupeKey)
    results.push(assembled)
  }

  // Discovered-topic lookup (Track C — Discovered-Topic Goal Provenance,
  // 2026-08-21) -- independent fourth path, merged into the SAME
  // RetrievalResult[]. Dedupe key deliberately includes matched_goal_category
  // (the discovery's own originating goal category here, not the claim's
  // intrinsic topic): the same claim_id may legitimately produce two
  // distinct, both-kept results -- once exact_topic for an explicit goal
  // whose category equals the claim's own topic, and once discovered_topic
  // for a DIFFERENT goal that reaches it only through Track A structural-
  // evidence discovery (same "neither should erase the other" precedent the
  // related-topic path above already established). In practice this specific
  // overlap cannot occur for the one live trigger today:
  // deriveDiscoveredTopicOccurrences already suppresses discovering a topic
  // that is simultaneously an active explicit goal category, so a claim
  // reached via both paths for the SAME topic does not happen -- this merge
  // is written generically regardless, matching the related-topic path's own
  // discipline rather than relying on that upstream suppression alone.
  const discoveredLookup = lookupDiscoveredTopicClaims(discoveredTopicOccurrences, topicClaims, applicabilityFacts, assetProviders)
  diagnostics.push(...discoveredLookup.diagnostics)
  for (const { claim, sourceGoalCategory } of discoveredLookup.matches) {
    const assembled = assembleDiscoveredTopicResult(claim, sourceGoalCategory)
    if (!assembled) {
      diagnostics.push({ identifier: claim.claim_id, reason: 'yes_claim_missing_scope' })
      continue
    }
    const dedupeKey = `${assembled.matrix_identifier}:${assembled.claim_id}:${assembled.matched_goal_category}`
    if (seen.has(dedupeKey)) continue
    seen.add(dedupeKey)
    results.push(assembled)
  }

  // Related-topic lookup (Governed Topic Relationships milestone,
  // 2026-08-16) -- independent third path, merged into the SAME
  // RetrievalResult[]. Dedupe key deliberately includes
  // matched_goal_category (the relationship's own source_topic here, not
  // the claim's intrinsic topic): the same claim_id may legitimately
  // produce two distinct, both-kept results -- once exact_topic for a goal
  // whose category equals the claim's own topic, and once related_topic for
  // a DIFFERENT goal that reaches it only through a governed relationship
  // (PM decision, approved 2026-08-16 -- "neither should erase the other").
  const relatedLookup = lookupRelatedTopicClaims(goals, relationships, topicClaims, applicabilityFacts)
  diagnostics.push(...relatedLookup.diagnostics)
  for (const { claim, relationship, sourceGoalCategory } of relatedLookup.matches) {
    const assembled = assembleRelatedTopicResult(claim, relationship.relationship_id, sourceGoalCategory)
    if (!assembled) {
      diagnostics.push({ identifier: claim.claim_id, reason: 'yes_claim_missing_scope' })
      continue
    }
    const dedupeKey = `${assembled.matrix_identifier}:${assembled.claim_id}:${assembled.matched_goal_category}`
    if (seen.has(dedupeKey)) continue
    seen.add(dedupeKey)
    results.push(assembled)
  }

  return { results, diagnostics }
}
