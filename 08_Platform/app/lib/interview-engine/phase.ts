/**
 * Deterministic phase derivation (LIVE_INTERVIEW_RUNTIME_ARCHITECTURE.md §2,
 * Prototype Beta / Live Interview Runtime milestone). Phase is a derived
 * property of `(StructuredUnderstanding, BoundaryState)`, not a state
 * machine with its own memory -- recomputed fresh every turn, the same
 * pattern `evaluateGate1`/`evaluateGate2` already are. Returns `1 | 2 | 3`
 * only, never `4` -- per the accepted runtime model, "Phase 4" is
 * `PRD_CRC_v1.0.md` §7's conceptual label for the completion-check
 * behavior (§9's two gates + user override), implemented as a separate
 * terminal step (completion.ts), not a fourth topic-bearing phase this
 * function traverses into.
 *
 * `BoundaryState.phases_ended` is consulted alongside `StructuredUnderstanding`:
 * a phase ended early by decline must still be treated as "over" for
 * advancement purposes, exactly as `LIVE_INTERVIEW_RUNTIME_ARCHITECTURE.md`
 * §4 requires -- a decline can push phase forward even when the phase's own
 * content condition below was never independently satisfied.
 *
 * Phase 1->2 (`INTERVIEW_ENGINE_ARCHITECTURE.md` §11: "on any
 * workflow-relevant fact volunteered or asked for"): this document's own
 * operationalization -- at least one active `ToolMention` (any resolution
 * kind, including an unresolved alias; naming a tool at all, even
 * ambiguously, is engagement with the workflow topic -- resolution.kind
 * itself already carries the "was this ambiguous" signal, so no further
 * confidence filter applies here) OR at least one active, AFFIRMATIVE
 * `ScopedObservation` (confidence 'confirmed' or 'confirmed_absent',
 * reusing the same filter Phase 2->3's own condition uses below). The
 * observation-side filter matters: a lone `ScopedObservation` merely
 * recording that the user declined to engage (e.g. an interview-scope
 * decline in turn 1, before any real workflow content existed --
 * `full_opt_out`'s own fixture shape) must not itself count as "engaging
 * with the workflow topic." Deliberately a lower bar than Phase 2->3's
 * own condition below on the tool-mention side (no resolution
 * requirement), but not on the observation side.
 *
 * Phase 2->3: `[PROTOTYPE ASSUMPTION -- TO VALIDATE]`, JD decision
 * 2026-08-08 ("Candidate B" from the design review preceding this
 * implementation -- see LIVE_INTERVIEW_RUNTIME_ARCHITECTURE.md §2 for the
 * full record, including Candidate C's explicit rejection). Both must
 * hold:
 *   1. at least one active, resolved/canonical ToolMention;
 *   2. at least one of: a confirmed workflow_role, or at least one active
 *      ScopedObservation whose confidence is 'confirmed' or
 *      'confirmed_absent'.
 * The confidence filter on condition 2's ScopedObservation branch mirrors
 * the exact same "only confirmed/confirmed_absent are affirmative"
 * discipline already independently used by
 * lib/retrieval-engine/extract-matchable-facts.ts and
 * lib/projection-layer/understood-summary.ts -- 'unresolved_no_visibility'/
 * 'unknown'/'declined' observations never count, matching JD's explicit
 * instruction not to count unresolved/unknown/declined/superseded facts.
 * `ToolMention.confidence` is deliberately NOT additionally checked for
 * condition 1 -- JD's instruction names "resolved/canonical" only
 * (`resolution.kind === 'canonical'`), which is itself the affirmative
 * signal for tool identity; `ToolMention.confidence` is a separate field
 * about mention-extraction clarity that this rule does not reference.
 *
 * Deliberately does NOT: require Gate 1 (INTERVIEW_ENGINE_ARCHITECTURE.md
 * §11 explicitly forbids this for Phase 2->3); call `evaluateGate2` (the
 * rejected Candidate C -- `'phase'` scope there means Gate-1-relevant-field
 * stability, not conversational-phase stability, and would have created
 * exactly the Gate-1-proxy behavior the constraint above forbids); depend
 * on Retrieval, Platform Intelligence, or Knowledge Cards; invoke an LLM;
 * or require every Phase 2 field (assets/contributors/workflow, in full)
 * to be populated.
 */

import type { BoundaryState } from './boundaries'
import type { ScopedObservation, StructuredUnderstanding, ToolMention } from '@/types/interview-engine'

function isActive<T extends { superseded_by: string | null }>(record: T): boolean {
  return record.superseded_by === null
}

function hasResolvedToolMention(tool_mentions: ToolMention[]): boolean {
  return tool_mentions.some((m) => isActive(m) && m.resolution.kind === 'canonical')
}

function hasConfirmedWorkflowRole(su: StructuredUnderstanding): boolean {
  return su.project_facts.workflow_role.attestation.state === 'confirmed'
}

function hasAffirmativeScopedObservation(scoped_observations: ScopedObservation[]): boolean {
  return scoped_observations.some((o) => isActive(o) && (o.confidence === 'confirmed' || o.confidence === 'confirmed_absent'))
}

function hasEngagedWorkflowTopic(su: StructuredUnderstanding): boolean {
  return su.tool_mentions.some(isActive) || hasAffirmativeScopedObservation(su.scoped_observations)
}

/** Phase 2->3 exit condition, per this module's own header -- exported separately so completion.ts / tests can reason about it in isolation from the 1->2 check. */
export function meetsPhase2ExitCondition(su: StructuredUnderstanding): boolean {
  return hasResolvedToolMention(su.tool_mentions) && (hasConfirmedWorkflowRole(su) || hasAffirmativeScopedObservation(su.scoped_observations))
}

/**
 * Computed as max(declineFloor, contentPhase), not sequential mutation --
 * a real, found-by-testing correction. `phases_ended.includes(2)` does NOT
 * imply `phases_ended.includes(1)`: a phase-2-scope decline only appends
 * `2` (boundaries.ts's own evaluateBoundary), regardless of whether phase
 * 1 ever independently ended by decline. A sequential "advance phase only
 * if already at phase N-1" implementation would wrongly require
 * `phases_ended.includes(1)` before `phases_ended.includes(2)` could have
 * any effect -- these two decline facts are independent evidence, each
 * capable of setting its own floor regardless of the other.
 */
export function computePhase(su: StructuredUnderstanding, boundaryState: BoundaryState): 1 | 2 | 3 {
  let declineFloor: 1 | 2 | 3 = 1
  if (boundaryState.phases_ended.includes(1)) declineFloor = 2
  if (boundaryState.phases_ended.includes(2)) declineFloor = 3

  let contentPhase: 1 | 2 | 3 = 1
  if (hasEngagedWorkflowTopic(su)) contentPhase = 2
  if (contentPhase === 2 && meetsPhase2ExitCondition(su)) contentPhase = 3

  return Math.max(declineFloor, contentPhase) as 1 | 2 | 3
}
