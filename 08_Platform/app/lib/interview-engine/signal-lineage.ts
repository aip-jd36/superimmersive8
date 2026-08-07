/**
 * Signal lineage resolution (CRC_PROTOTYPE_ALPHA_ROADMAP.md Phase 7,
 * JD instruction 2026-08-08 item 3).
 *
 * The bug: Constraint B's per-signal caps (BoundaryState.follow_ups_used,
 * uncertainty_clarifications_used) are keyed by signal_id. Supersession
 * (mutations.ts's supersedeObservation/supersedeToolMention) gives a
 * corrected fact a NEW id -- so a follow-up already used against the OLD id
 * leaves the NEW id's cap untouched, letting CRC ask what is semantically a
 * second follow-up about the same underlying thing. Reproduced concretely by
 * the Phase 7 mock dry run (ambiguous_multi_surface_tool, first version).
 *
 * The fix deliberately does NOT touch boundaries.ts. boundaries.ts's whole
 * design point is genuine independence from StructuredUnderstanding (its own
 * header: "does not import gates.ts, Retrieval, or StructuredUnderstanding")
 * -- giving it supersession-chain knowledge would be exactly the "new model
 * dependency" JD's instruction ruled out. Instead, this module lives at the
 * ORCHESTRATION layer, which already has full StructuredUnderstanding
 * access, and resolves a signal_id to its stable lineage root BEFORE the
 * caller ever constructs the CandidateQuestion passed to evaluateBoundary.
 * boundaries.ts's own per-signal counters then work completely unchanged --
 * every supersession of the same underlying signal resolves to the same
 * root, so the SAME counter is read and updated every time, with zero
 * changes to boundaries.ts itself.
 *
 * "Root" = the earliest ancestor in the supersession chain (the first id
 * ever created for this lineage) -- a stable choice precisely because it
 * never changes as further corrections happen, unlike "the current active
 * id," which changes on every supersession. Does not merge or alter the
 * underlying records themselves: every observation/mention in the chain
 * remains present and independently auditable via its own superseded_by
 * pointer, exactly as mutations.ts (Phase 2) designed. This module only
 * reads StructuredUnderstanding; it never mutates it.
 *
 * project:intended_use / project:workflow_role signal ids never supersede
 * (mutations.ts's setIntendedUse/setWorkflowRole are plain immutable
 * replacement, not supersede-and-mark -- see that module's own header) --
 * resolveLineageRoot correctly returns them unchanged, since neither array
 * this function walks will ever contain a record pointing to them.
 */

import type { StructuredUnderstanding } from '@/types/interview-engine'

export function resolveLineageRoot(su: StructuredUnderstanding, signalId: string): string {
  let current = signalId
  // Bounded by the total number of records that could ever chain into this
  // lineage -- supersession only ever lengthens a chain by one record per
  // mutation, so this cannot loop indefinitely against real data.
  while (true) {
    const priorTool = su.tool_mentions.find((m) => m.superseded_by === current)
    if (priorTool) {
      current = priorTool.mention_id
      continue
    }
    const priorObservation = su.scoped_observations.find((o) => o.superseded_by === current)
    if (priorObservation) {
      current = priorObservation.observation_id
      continue
    }
    break
  }
  return current
}
