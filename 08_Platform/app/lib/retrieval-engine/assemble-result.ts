/**
 * Result assembly (RETRIEVAL_ENGINE_ARCHITECTURE.md Phase 6, Prototype
 * Beta). Combines one matched source fact + eligible claim + its row into a
 * RetrievalResult -- structured references only, never rendered Knowledge
 * Card content. Projection remains deferred.
 *
 * Deliberately excludes: SI8 Interpretation, CRC Decision Date, CRC
 * Approver, internal reviewer notes, any risk conclusion, and CRC-Eligible
 * itself as user-facing content -- none of these are fields on
 * RetrievalResult (types.ts) or MatrixRow/MatrixClaim beyond what those
 * types already carry, so there is nothing here to accidentally leak.
 * `publication_scope` and `candidate_statement` are the two pieces of
 * Matrix prose this module passes forward, both verbatim, both copied
 * exactly as authored -- neither is parsed, rewritten, rendered, or used
 * to make any decision here. `candidate_statement` is copied opaquely even
 * when null: unlike `publication_scope` (whose absence on a Yes claim
 * blocks the result entirely, per the Matrix-authoring-inconsistency
 * discipline below), a missing `candidate_statement` is not this module's
 * concern to gate on -- that is a Projection-time rendering decision, not
 * a Retrieval-time eligibility one (JD review, 2026-08-08, narrowing the
 * original PROJECTION_LAYER_ARCHITECTURE.md side-lookup design into this
 * consumer-driven contract extension instead).
 */

import type { MatrixClaim, MatrixRow, RetrievalResult, RetrievalSourceFact, TopicClaim } from './types'

/** Returns null (never a fabricated scope) if the claim has no publication scope text -- see the 'yes_claim_missing_scope' diagnostic in retrieve.ts, which is where this case is actually surfaced. */
export function assembleResult(sourceFact: RetrievalSourceFact, row: MatrixRow, claim: MatrixClaim): RetrievalResult | null {
  if (claim.crc_publication_scope === null) return null
  const topic = claim.topic ?? 'unknown'
  return {
    source_fact: sourceFact,
    claim_id: claim.claim_id,
    matrix_identifier: row.identifier,
    publication_scope: claim.crc_publication_scope,
    candidate_statement: claim.crc_candidate_statement,
    last_verified: row.last_verified,
    topic,
    // Always empty for a tool-sourced result -- see RetrievalResult's own
    // doc comment. Phase 1 does not model this concept for Matrix claims.
    unresolved_project_dependencies: [],
    // A tool result is always exact-topic -- Governed Topic Relationships
    // (2026-08-16) only ever expand non-tool-scoped Topic Retrieval. See
    // RetrievalResult's own doc comment for match_origin/matched_goal_category.
    match_origin: 'exact_topic',
    matched_goal_category: topic,
    relationship_id: null,
  }
}

/**
 * Topic-claim counterpart (CRC Living Knowledge Phase 1, 2026-08-16). No
 * MatrixRow exists for a non-tool-scoped claim, so `matrix_identifier`
 * carries the claim's own `topic` instead of a row identifier -- the
 * closest analogous "which group does this belong to" value. Same
 * never-fabricate-scope discipline as assembleResult: a topic claim only
 * ever reaches this function after lookupTopicClaims has already confirmed
 * Adopted + CRC-eligible + applicable (see lookup-topic-claims.ts), so the
 * null-scope guard here is defensive, not a real Phase 1 code path -- a
 * Yes-eligible topic claim with no scope text would be an authoring
 * inconsistency, exactly mirroring the Matrix's own 'yes_claim_missing_scope'
 * case.
 */
export function assembleTopicResult(claim: TopicClaim): RetrievalResult | null {
  if (claim.crc_publication_scope === null) return null
  return {
    source_fact: { kind: 'topic', identifier: claim.topic },
    claim_id: claim.claim_id,
    matrix_identifier: claim.topic,
    publication_scope: claim.crc_publication_scope,
    candidate_statement: claim.crc_candidate_statement,
    last_verified: claim.last_verified,
    topic: claim.topic,
    unresolved_project_dependencies: claim.unresolved_project_dependencies,
    // A direct Topic Retrieval match is exact-topic by definition -- the
    // claim's own topic already equals the goal's category (lookupTopicClaims'
    // own matching rule). See RetrievalResult's own doc comment.
    match_origin: 'exact_topic',
    matched_goal_category: claim.topic,
    relationship_id: null,
  }
}

/**
 * Related-topic counterpart (Governed Topic Relationships milestone,
 * 2026-08-16). Produced only by `lookupRelatedTopicClaims` for a
 * `TopicClaim` reached via a governed `TopicRelationship`, never directly by
 * `retrieve()`. `sourceGoalCategory` is the relationship's own
 * `source_topic` -- the ORIGINATING goal category, not the claim's own
 * topic -- becomes `matched_goal_category`; `claim.topic` is preserved
 * unchanged as the claim's own intrinsic subject (never overwritten to look
 * exact -- see RetrievalResult.topic's own doc comment). Same
 * never-fabricate-scope discipline as assembleResult/assembleTopicResult.
 */
export function assembleRelatedTopicResult(claim: TopicClaim, relationshipId: string, sourceGoalCategory: TopicClaim['topic']): RetrievalResult | null {
  if (claim.crc_publication_scope === null) return null
  return {
    source_fact: { kind: 'topic', identifier: claim.topic },
    claim_id: claim.claim_id,
    matrix_identifier: claim.topic,
    publication_scope: claim.crc_publication_scope,
    candidate_statement: claim.crc_candidate_statement,
    last_verified: claim.last_verified,
    topic: claim.topic,
    unresolved_project_dependencies: claim.unresolved_project_dependencies,
    match_origin: 'related_topic',
    matched_goal_category: sourceGoalCategory,
    relationship_id: relationshipId,
  }
}
