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

import type { RetrievalHandoff } from '@/types/interview-engine'
import { extractMatchableFacts } from './extract-matchable-facts'
import { lookupRows } from './lookup-rows'
import { enumerateEligibleClaims } from './enumerate-eligible-claims'
import { assembleResult } from './assemble-result'
import type { MatrixRow, RetrievalDiagnostic, RetrievalResult } from './types'

export interface RetrieveOutput {
  results: RetrievalResult[]
  diagnostics: RetrievalDiagnostic[]
}

export function retrieve(handoff: RetrievalHandoff, matrix: MatrixRow[]): RetrieveOutput {
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
      const dedupeKey = `${assembled.matrix_identifier}:${assembled.claim_id}`
      if (seen.has(dedupeKey)) continue
      seen.add(dedupeKey)
      results.push(assembled)
    }
  }

  return { results, diagnostics }
}
