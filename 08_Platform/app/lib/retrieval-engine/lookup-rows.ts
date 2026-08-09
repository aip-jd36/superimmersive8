/**
 * Exact row lookup (RETRIEVAL_ENGINE_ARCHITECTURE.md Phase 4, Prototype
 * Beta). Exact canonical-identifier match only -- no fuzzy matching, no
 * normalization. Interview already owns normalization (normalizeCandidate,
 * extraction.ts); by the time a tool identifier reaches Retrieval it is
 * already fully resolved, so ambiguity is structurally impossible here (see
 * RETRIEVAL_ENGINE_ARCHITECTURE.md §4 Matching Philosophy).
 */

import type { MatrixRow } from './types'

export interface RowLookupResult {
  identifier: string
  row: MatrixRow | null
}

/**
 * One lookup per requested identifier, preserving order and duplicates as
 * given -- deduplication (if desired) is the caller's job, not this
 * function's. A duplicate identifier in `identifiers` produces a duplicate
 * entry here, each independently resolved against the same rows.
 */
export function lookupRows(identifiers: string[], rows: MatrixRow[]): RowLookupResult[] {
  const byIdentifier = new Map(rows.map((r) => [r.identifier, r]))
  return identifiers.map((identifier) => ({ identifier, row: byIdentifier.get(identifier) ?? null }))
}
