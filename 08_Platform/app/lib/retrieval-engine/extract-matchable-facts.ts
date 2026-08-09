/**
 * Matchable-fact extraction (RETRIEVAL_ENGINE_ARCHITECTURE.md Phase 3,
 * Prototype Beta). Pure function: RetrievalHandoff -> MatchableFacts. No
 * I/O, no Matrix access, no LLM.
 *
 * Extracts the FULL matchable set the architecture doc describes (tools,
 * confirmed/confirmed-absent observations, intended_use, workflow_role) --
 * not just the tool subset Phase 4 currently looks up against. This is a
 * deliberate scoping choice, not scope creep: the current Matrix is
 * tool-row-keyed only (non-tool-keyed indexing is an explicitly deferred
 * open question in the architecture doc), so observations/intended_use/
 * workflow_role are extracted correctly and completely here but currently
 * produce zero matches downstream -- expected, not a defect, and the
 * function stays ready for whenever non-tool indexing exists without
 * needing to be rewritten.
 *
 * Deliberately does NOT read `handoff.exclusions`. Tracing handoff.ts:
 * every exclusions[] entry and the corresponding field's own sentinel
 * value ('declined') are derived from the same underlying attestation
 * state in the same pass -- they cannot diverge. Checking each field's own
 * value directly is sufficient and is also the only option that actually
 * works for tools, since RetrievalHandoffTool exposes no id exclusions[]
 * entries could be correlated back to.
 *
 * Also checks for the literal 'declined' and 'confirmed_absent' sentinels
 * on intended_use/workflow_role even though RetrievalHandoff's own type
 * only declares 'unclear'/'unresolved' as the non-confirmed literal --
 * attestedToHandoffValue (handoff.ts) can return either for any field it's
 * applied to, a real reachable runtime value the type doesn't state. Not
 * an Interview Engine defect (the value is correct, just under-declared)
 * and not something this module needs Interview Engine changed to handle
 * correctly.
 *
 * Sentinel list fixed 2026-08-08: this module's own local sentinel list
 * previously omitted 'confirmed_absent', a genuine taxonomy-drift gap
 * found when Projection's own (correct) sentinel list was compared
 * against this one -- a 'confirmed_absent' intended_use/workflow_role
 * value was being treated as if it were a real matchable string, which it
 * is not. Now imports the shared, canonical NON_AFFIRMATIVE_HANDOFF_SENTINELS
 * constant (types/interview-engine.ts) instead of maintaining a local
 * copy, so this specific drift cannot recur. No live matching behavior
 * changes today (non-tool-keyed matching isn't wired to anything
 * downstream yet), but the extracted value is now correct regardless.
 */

import { NON_AFFIRMATIVE_HANDOFF_SENTINELS, type ObservationScope, type RetrievalHandoff, type ScopedObservation } from '@/types/interview-engine'

export interface MatchableObservation {
  observation_id: string
  scope: ObservationScope
  confidence: 'confirmed' | 'confirmed_absent'
  note: string
}

export interface MatchableFacts {
  /** Canonical tool identifiers only -- unresolved_aliases never enter this set. */
  tools: string[]
  observations: MatchableObservation[]
  intended_use: string | null
  workflow_role: string | null
}

function matchableScalar(value: string): string | null {
  return (NON_AFFIRMATIVE_HANDOFF_SENTINELS as readonly string[]).includes(value) ? null : value
}

function isMatchableObservation(o: ScopedObservation): o is ScopedObservation & { confidence: 'confirmed' | 'confirmed_absent' } {
  return o.confidence === 'confirmed' || o.confidence === 'confirmed_absent'
}

export function extractMatchableFacts(handoff: RetrievalHandoff): MatchableFacts {
  return {
    tools: handoff.tools.map((t) => t.identifier),
    observations: handoff.scoped_observations
      .filter(isMatchableObservation)
      .map((o) => ({ observation_id: o.observation_id, scope: o.scope, confidence: o.confidence, note: o.note })),
    intended_use: matchableScalar(handoff.intended_use),
    workflow_role: matchableScalar(handoff.workflow_role),
  }
}
