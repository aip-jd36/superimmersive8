/**
 * Result assembly (RETRIEVAL_ENGINE_ARCHITECTURE.md Phase 6, Prototype
 * Beta). Combines one matched source fact + eligible claim + its row into a
 * RetrievalResult -- structured references only, never rendered Knowledge
 * Card content. Projection remains deferred.
 *
 * Deliberately excludes: SI8 Interpretation, CRC Decision Date, CRC
 * Approver, internal reviewer notes, any risk conclusion, CRC-Eligible
 * itself as user-facing content, and CRC Candidate Statement -- none of
 * these are fields on RetrievalResult (types.ts) or MatrixRow/MatrixClaim
 * beyond what those types already carry, so there is nothing here to
 * accidentally leak. `publication_scope` is the one piece of Matrix prose
 * this module passes forward, verbatim -- exactly what the architecture
 * doc's Phase 5/§5 requires, not more.
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
    last_verified: row.last_verified,
  }
}
