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

import type { MatrixClaim, MatrixRow, RetrievalResult, RetrievalSourceFact } from './types'

/** Returns null (never a fabricated scope) if the claim has no publication scope text -- see the 'yes_claim_missing_scope' diagnostic in retrieve.ts, which is where this case is actually surfaced. */
export function assembleResult(sourceFact: RetrievalSourceFact, row: MatrixRow, claim: MatrixClaim): RetrievalResult | null {
  if (claim.crc_publication_scope === null) return null
  return {
    source_fact: sourceFact,
    claim_id: claim.claim_id,
    matrix_identifier: row.identifier,
    publication_scope: claim.crc_publication_scope,
    candidate_statement: claim.crc_candidate_statement,
    last_verified: row.last_verified,
  }
}
