/**
 * Projection Layer — domain types (PROJECTION_LAYER_ARCHITECTURE.md §5,
 * Prototype Beta, Slice 1). Sibling to, not nested inside,
 * lib/interview-engine/ and lib/retrieval-engine/ — architecturally
 * independent per PRD_CRC_v1.0.md §3, extended to a third subsystem.
 * Named `projection-layer/`, not `projection-engine/`, deliberately
 * matching the architecture document's own consistent terminology
 * ("Projection Layer" throughout) rather than the sibling folders'
 * `-engine` suffix — this is Projection's own document's word choice,
 * not an inconsistency.
 *
 * Slice 1 scope: types only. No rendering/templating logic yet — that
 * begins in later slices (the "what we understood" path and the
 * knowledge-item path, per PROJECTION_LAYER_ARCHITECTURE.md §3's Steps
 * [A]/[B]). Mirrors how lib/retrieval-engine/types.ts shipped as
 * Retrieval's own Phase 1, before any of its pure functions existed.
 *
 * Deliberately excludes any field for "topics that often come up" —
 * PROJECTION_LAYER_ARCHITECTURE.md §5 states this section has no governed
 * content source in v1 and must not be invented. There is no field for it
 * on ProjectionOutput below, not even an always-empty one — the same
 * "structurally impossible, not just avoided by discipline" pattern
 * lib/retrieval-engine/types.ts uses for excluded Matrix research fields.
 *
 * This module has, and must continue to have, no import of
 * lib/retrieval-engine/matrix-fixture.ts or any other Matrix-representing
 * module — PROJECTION_LAYER_ARCHITECTURE.md §2 states Projection has no
 * direct or indirect access to the Matrix, CRC Claims registry, or Living
 * Notebook, enforced as a hard boundary, not a soft one.
 */

/**
 * One rendered knowledge item — the Matrix-sourced, Retrieval-delivered
 * half of PRD_CRC_v1.0.md §14's output template. `statement` is copied
 * from `RetrievalResult.candidate_statement` (lib/retrieval-engine/types.ts)
 * — already governed, already publication-ready — and must be rendered
 * verbatim, never paraphrased (architecture doc §4). `claim_id` is
 * retained for traceability/logging only; it is never itself rendered
 * into user-facing text (architecture doc §6 Deterministic Guarantees).
 */
export interface ProjectionKnowledgeItem {
  claim_id: string
  statement: string
  last_verified: string | null
}

/**
 * Why an eligible `RetrievalResult` produced no knowledge item —
 * diagnostic only, never surfaced to a user, never a risk/warning signal.
 * Mirrors `RetrievalDiagnostic`'s own discipline
 * (lib/retrieval-engine/types.ts). `'missing_candidate_statement'` is the
 * only reachable reason: a `RetrievalResult` whose `candidate_statement`
 * is null is skipped, never rendered from `publication_scope` as a
 * fallback, per architecture doc §8 Failure Behavior.
 */
export const PROJECTION_NON_RENDER_REASONS = ['missing_candidate_statement'] as const
export type ProjectionNonRenderReason = (typeof PROJECTION_NON_RENDER_REASONS)[number]

export interface ProjectionDiagnostic {
  claim_id: string
  reason: ProjectionNonRenderReason
}

/**
 * Final CRC output, per PRD_CRC_v1.0.md §14's template structure exactly
 * (architecture doc §5 Output Contract). `opening_line` and `closing_cta`
 * are fixed copy, owned entirely by Projection (architecture doc §4/§5) —
 * not sourced from either canonical input, but still part of the
 * structured output a renderer needs, not something callers are expected
 * to author themselves. `knowledge_items` is empty, not absent, when
 * `RetrievalResult[]` is empty or every eligible claim was skipped —
 * architecture doc §8 treats an empty knowledge-items list as the normal,
 * non-error early-conversation case, and a consumer of this type should
 * render "no items" (omit the section) rather than treat `[]` as
 * exceptional.
 */
export interface ProjectionOutput {
  opening_line: string
  understood_summary: string
  knowledge_items: ProjectionKnowledgeItem[]
  closing_cta: string
}
