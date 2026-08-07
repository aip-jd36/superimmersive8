/**
 * Retrospective state-diff utility (CRC_PROTOTYPE_ALPHA_ROADMAP.md Phase 6c,
 * step 7). Diagnostic/calibration data only -- compares a prior
 * StructuredUnderstanding against a posterior one (an actual or
 * hand-constructed plausible answer's resulting state) and reports whether
 * material change actually occurred.
 *
 * This is NEVER fed back into Constraint A's prospective decision (decision.ts)
 * -- the whole point of the prospective/retrospective distinction is that
 * the prospective estimate has to work without this information, since the
 * real answer doesn't exist yet at decision time. This module exists purely
 * for the evaluation harness to ask, after the fact: did the question we
 * predicted would help actually turn out to help?
 *
 * Deliberately does NOT import gates.ts. Gate 2's evaluateBoundary-adjacent
 * diff logic answers a related but different question ("has understanding
 * stabilized") and is a frozen system Phase 6c must not modify or reach
 * into -- reusing it here, even read-only, would be exactly the kind of
 * reopening the frozen-systems instruction rules out. This is a fresh,
 * independent implementation of the same underlying idea (a new observation
 * appearing, or an existing one's confidence/workflow_stage changing, is
 * material; wording/note changes alone are not), scoped to this evaluation
 * harness only.
 */

import type { ProjectFacts, ScopedObservation, StructuredUnderstanding, ToolMention } from '@/types/interview-engine'

export interface RetrospectiveDiffResult {
  materialChange: boolean
  changedFields: string[]
}

function activeById<T extends { superseded_by: string | null }>(items: T[], idOf: (item: T) => string): Map<string, T> {
  return new Map(items.filter((i) => i.superseded_by === null).map((i) => [idOf(i), i]))
}

function diffScopedObservations(previous: ScopedObservation[], current: ScopedObservation[]): string[] {
  const changed: string[] = []
  const prevActive = activeById(previous, (o) => o.observation_id)
  const currActive = activeById(current, (o) => o.observation_id)

  for (const [id, obs] of currActive) {
    const prev = prevActive.get(id)
    if (!prev) {
      changed.push(`scoped_observations.${id} (new)`)
      continue
    }
    if (prev.confidence !== obs.confidence) changed.push(`scoped_observations.${id}.confidence`)
    if (prev.workflow_stage !== obs.workflow_stage) changed.push(`scoped_observations.${id}.workflow_stage`)
    if (prev.scope !== obs.scope) changed.push(`scoped_observations.${id}.scope`)
  }
  for (const id of prevActive.keys()) {
    if (!currActive.has(id)) changed.push(`scoped_observations.${id} (no longer active)`)
  }
  return changed
}

function diffToolMentions(previous: ToolMention[], current: ToolMention[]): string[] {
  const changed: string[] = []
  const prevActive = activeById(previous, (m) => m.mention_id)
  const currActive = activeById(current, (m) => m.mention_id)

  for (const [id, m] of currActive) {
    const prev = prevActive.get(id)
    if (!prev) {
      changed.push(`tool_mentions.${id} (new)`)
      continue
    }
    if (JSON.stringify(prev.resolution) !== JSON.stringify(m.resolution)) changed.push(`tool_mentions.${id}.resolution`)
    if (JSON.stringify(prev.access_surface) !== JSON.stringify(m.access_surface)) changed.push(`tool_mentions.${id}.access_surface`)
    if (JSON.stringify(prev.plan_tier) !== JSON.stringify(m.plan_tier)) changed.push(`tool_mentions.${id}.plan_tier`)
  }
  for (const id of prevActive.keys()) {
    if (!currActive.has(id)) changed.push(`tool_mentions.${id} (no longer active)`)
  }
  return changed
}

function diffProjectFacts(previous: ProjectFacts, current: ProjectFacts): string[] {
  const changed: string[] = []
  if (JSON.stringify(previous.intended_use.attestation) !== JSON.stringify(current.intended_use.attestation)) {
    changed.push('project_facts.intended_use')
  }
  if (JSON.stringify(previous.workflow_role.attestation) !== JSON.stringify(current.workflow_role.attestation)) {
    changed.push('project_facts.workflow_role')
  }
  return changed
}

/**
 * Material change = a new active fact appeared, or an existing one's
 * confidence/workflow_stage/scope/resolution/access_surface/plan_tier/
 * attestation changed. Wording/note/source_statement changes alone are not
 * material -- same discipline as everywhere else in this codebase that
 * measures materiality.
 */
export function computeRetrospectiveDiff(
  before: StructuredUnderstanding,
  after: StructuredUnderstanding,
): RetrospectiveDiffResult {
  const changedFields = [
    ...diffScopedObservations(before.scoped_observations, after.scoped_observations),
    ...diffToolMentions(before.tool_mentions, after.tool_mentions),
    ...diffProjectFacts(before.project_facts, after.project_facts),
  ]
  return { materialChange: changedFields.length > 0, changedFields }
}
