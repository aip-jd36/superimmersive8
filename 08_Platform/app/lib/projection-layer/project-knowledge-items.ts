/**
 * Knowledge Item projection (PROJECTION_LAYER_ARCHITECTURE.md §3 Step [B],
 * §4, §8; Prototype Beta, Slice 1B). Pure, deterministic transform of
 * RetrievalResult[] into the knowledge-item half of ProjectionOutput --
 * does not assemble "what we understood", opening/closing copy, or the
 * full ProjectionOutput shape (later slices).
 *
 * Reads exactly one field of each RetrievalResult for rendering
 * (candidate_statement) plus two for traceability/metadata (claim_id,
 * last_verified). Never reads publication_scope -- governance-boundary
 * prose, audit-only, architecture doc §4/§6 -- there is no code path in
 * this module that even references that field.
 *
 * Duplicate claim_id handling (decided here, per explicit instruction to
 * define this rather than rely on Retrieval's own dedup silently holding):
 * RetrievalResult[] is only guaranteed unique on the compound key
 * (matrix_identifier, claim_id), by Retrieval's own dedup logic
 * (lib/retrieval-engine/retrieve.ts's `seen` set, keyed on
 * `${matrix_identifier}:${claim_id}`). claim_id alone is NOT guaranteed
 * globally unique across different matrix rows by any enforced contract --
 * only by the current Matrix-authoring convention (single-claim rows
 * reuse the row's own already-unique identifier; compound rows namespace
 * with an `<identifier>-<slug>` prefix). This module does not rely on
 * that convention holding. It processes each RetrievalResult
 * independently and produces at most one knowledge item per result,
 * preserving array order and multiplicity 1:1 -- the same "each entry
 * matched independently, never combined" principle
 * RETRIEVAL_ENGINE_ARCHITECTURE.md §4 applies to multi-tool arrays,
 * carried one layer downstream. No deduplication is performed here: a
 * repeated claim_id (should the Matrix-authoring convention above ever
 * be violated) still names two distinct, real, eligible claims, each with
 * its own statement -- rendering both is not a fabrication, and silently
 * collapsing one would be an invented decision this module has no basis
 * to make. `claim_id` on ProjectionKnowledgeItem/ProjectionDiagnostic is
 * retained for traceability only and was never a uniqueness key this
 * module's own logic depends on.
 */

import type { RetrievalResult } from '@/lib/retrieval-engine/types'
import type { ProjectionDiagnostic, ProjectionKnowledgeItem } from './types'

export interface ProjectKnowledgeItemsOutput {
  knowledge_items: ProjectionKnowledgeItem[]
  diagnostics: ProjectionDiagnostic[]
}

export function projectKnowledgeItems(results: RetrievalResult[]): ProjectKnowledgeItemsOutput {
  const knowledge_items: ProjectionKnowledgeItem[] = []
  const diagnostics: ProjectionDiagnostic[] = []

  for (const result of results) {
    if (result.candidate_statement === null) {
      diagnostics.push({ claim_id: result.claim_id, reason: 'missing_candidate_statement' })
      continue
    }
    knowledge_items.push({
      claim_id: result.claim_id,
      statement: result.candidate_statement,
      last_verified: result.last_verified,
    })
  }

  return { knowledge_items, diagnostics }
}
