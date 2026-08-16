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
import { assembleResult, assembleTopicResult, assembleRelatedTopicResult } from './assemble-result'
import { lookupTopicClaims, type ApplicabilityFacts } from './lookup-topic-claims'
import { lookupRelatedTopicClaims } from './lookup-topic-relationships'
import type { MatrixRow, RetrievalDiagnostic, RetrievalResult, TopicClaim, TopicRelationship } from './types'

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
 */
export function retrieve(
  handoff: RetrievalHandoff,
  matrix: MatrixRow[],
  goals: UserGoal[] = [],
  topicClaims: TopicClaim[] = [],
  applicabilityFacts: ApplicabilityFacts = UNKNOWN_APPLICABILITY_FACTS,
  relationships: TopicRelationship[] = [],
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

  const topicLookup = lookupTopicClaims(goals, topicClaims, applicabilityFacts)
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
