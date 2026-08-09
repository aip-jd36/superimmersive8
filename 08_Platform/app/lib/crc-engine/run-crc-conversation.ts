/**
 * CRC end-to-end orchestrator (Prototype Beta, CRC End-to-End Integration
 * milestone). Coordinates the three already-built, already-independently-
 * tested subsystems -- Interview Engine, Retrieval Engine, Projection
 * Layer -- into one deterministic pipeline. This is the ONLY module in the
 * codebase that imports actual logic from all three: `buildRetrievalHandoff`
 * (Interview), `retrieve` (Retrieval), `assembleProjectionOutput`
 * (Projection). Every other module's relationship to a sibling subsystem is
 * type-only (see the subsystem-boundaries test suite, which verifies this
 * as a structural property, not a discipline).
 *
 * Glue only: three already-published pure function calls, in order, each
 * one's full output passed to the next unmodified. No reinterpretation of
 * any value, no duplicated business logic, no re-implementation of
 * Retrieval's matching or Projection's rendering. If this function ever
 * needs to inspect or branch on the CONTENT of a handoff, a result, or an
 * output (beyond simply passing it forward), that is a sign business logic
 * is leaking into the orchestrator and belongs in the owning subsystem
 * instead.
 *
 * Input boundary (architecture decision, Phase 1 review, 2026-08-08):
 * `StructuredUnderstanding`, NOT raw conversation turns. JD's own
 * conceptual diagram for this milestone starts at "User conversation," but
 * running a full multi-turn scripted conversation requires injected
 * extractor/generator/decider dependencies (live-model or mocked) --
 * that is Interview Engine's own already-built eval-harness concern
 * (lib/interview-engine/eval/run-dialogue.ts), not "the smallest possible
 * deterministic orchestration function" this milestone asks for. This
 * module's own input is Interview Engine's true terminal state -- one
 * already-published, unmodified `buildRetrievalHandoff()` call away from
 * the `RetrievalHandoff` both Retrieval and Projection already treat as
 * their canonical shared contract. Composing this orchestrator with
 * `run-dialogue.ts`'s own `final_su` output (to represent a full scripted
 * conversation, deterministic under the mock stack) is possible from
 * calling code without this module needing to know anything about how a
 * `StructuredUnderstanding` was produced -- see the end-to-end test suite
 * for exactly this composition.
 *
 * `matrix: MatrixRow[]` is a required parameter, never defaulted to
 * `MATRIX_FIXTURE`, mirroring `retrieve()`'s own established discipline
 * (RETRIEVAL_ENGINE_ARCHITECTURE.md §2) -- so a future real-Matrix adapter
 * swaps in cleanly, and tests can supply exactly the rows a given case
 * needs.
 */

import { buildRetrievalHandoff } from '@/lib/interview-engine/handoff'
import { retrieve } from '@/lib/retrieval-engine/retrieve'
import type { MatrixRow, RetrievalDiagnostic, RetrievalResult } from '@/lib/retrieval-engine/types'
import { assembleProjectionOutput } from '@/lib/projection-layer/assemble-projection-output'
import type { ProjectionDiagnostic, ProjectionOutput } from '@/lib/projection-layer/types'
import type { RetrievalHandoff, StructuredUnderstanding } from '@/types/interview-engine'

export interface CRCPipelineDiagnostics {
  retrieval: RetrievalDiagnostic[]
  projection: ProjectionDiagnostic[]
}

/**
 * Diagnostics only (module header, and per instruction) -- never a second
 * source of truth for the final output. `projection_output` here is the
 * exact same object as the top-level `output` field, not a copy -- kept on
 * the trace for a single self-describing structure that shows the full
 * Interview -> Retrieval -> Projection chain in one place, at the cost of
 * one referentially-identical duplicate field, not a value-level one.
 */
export interface CRCPipelineTrace {
  retrieval_handoff: RetrievalHandoff
  retrieval_results: RetrievalResult[]
  projection_output: ProjectionOutput
}

export interface CRCPipelineResult {
  output: ProjectionOutput
  diagnostics: CRCPipelineDiagnostics
  trace: CRCPipelineTrace
}

export function runCRCConversation(understanding: StructuredUnderstanding, matrix: MatrixRow[]): CRCPipelineResult {
  const handoff = buildRetrievalHandoff(understanding)
  const { results, diagnostics: retrievalDiagnostics } = retrieve(handoff, matrix)
  const { output, diagnostics: projectionDiagnostics } = assembleProjectionOutput(handoff, results)

  return {
    output,
    diagnostics: { retrieval: retrievalDiagnostics, projection: projectionDiagnostics },
    trace: { retrieval_handoff: handoff, retrieval_results: results, projection_output: output },
  }
}
