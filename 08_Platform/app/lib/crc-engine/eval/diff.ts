/**
 * Structured-state diffing for the Live Interview Runtime evaluation
 * harness. Eval-only, human-readable-string output for logging -- not a
 * correctness mechanism (unlike gates.ts's own private diff functions,
 * which gate Gate 2's actual behavior). Deliberately independent of those:
 * importing a private function isn't possible, and this diff's purpose is
 * observability for a report, not a decision any runtime logic depends on
 * -- a coarser, simpler diff is fine here even though it wouldn't be for
 * Gate 2 itself.
 */

import type { BoundaryState } from '@/lib/interview-engine/boundaries'
import type { StructuredUnderstanding } from '@/types/interview-engine'

export function diffStructuredUnderstanding(before: StructuredUnderstanding, after: StructuredUnderstanding): string[] {
  const changes: string[] = []

  const beforeTools = new Map(before.tool_mentions.map((m) => [m.mention_id, m]))
  for (const m of after.tool_mentions) {
    const prior = beforeTools.get(m.mention_id)
    if (!prior) {
      const label = m.resolution.kind === 'canonical' ? m.resolution.identifier : `unresolved:${m.resolution.raw_name}`
      changes.push(`+tool_mention ${m.mention_id} (${label})`)
    } else if (prior.superseded_by !== m.superseded_by) {
      changes.push(`tool_mention ${m.mention_id} superseded_by ${prior.superseded_by} -> ${m.superseded_by}`)
    }
  }

  const beforeObs = new Map(before.scoped_observations.map((o) => [o.observation_id, o]))
  for (const o of after.scoped_observations) {
    const prior = beforeObs.get(o.observation_id)
    if (!prior) {
      changes.push(`+scoped_observation ${o.observation_id} (${o.scope}, ${o.confidence})`)
    } else if (prior.confidence !== o.confidence || prior.superseded_by !== o.superseded_by) {
      changes.push(`scoped_observation ${o.observation_id} confidence ${prior.confidence}->${o.confidence}, superseded_by ${prior.superseded_by}->${o.superseded_by}`)
    }
  }

  if (before.project_facts.intended_use.attestation.state !== after.project_facts.intended_use.attestation.state) {
    changes.push(`intended_use ${before.project_facts.intended_use.attestation.state} -> ${after.project_facts.intended_use.attestation.state}`)
  }
  if (before.project_facts.workflow_role.attestation.state !== after.project_facts.workflow_role.attestation.state) {
    changes.push(`workflow_role ${before.project_facts.workflow_role.attestation.state} -> ${after.project_facts.workflow_role.attestation.state}`)
  }

  if (before.current_phase !== after.current_phase) changes.push(`current_phase ${before.current_phase} -> ${after.current_phase}`)
  if (before.gate_1_state !== after.gate_1_state) changes.push(`gate_1_state ${before.gate_1_state} -> ${after.gate_1_state}`)
  if (before.gate_2_state !== after.gate_2_state) changes.push(`gate_2_state ${before.gate_2_state} -> ${after.gate_2_state}`)
  if (before.completion_reason !== after.completion_reason) changes.push(`completion_reason ${before.completion_reason} -> ${after.completion_reason}`)
  if (before.opt_out_scope !== after.opt_out_scope) changes.push(`opt_out_scope ${before.opt_out_scope} -> ${after.opt_out_scope}`)

  return changes
}

export function diffBoundaryState(before: BoundaryState, after: BoundaryState): string[] {
  const changes: string[] = []

  for (const key of new Set([...Object.keys(before.follow_ups_used), ...Object.keys(after.follow_ups_used)])) {
    const b = before.follow_ups_used[key] ?? 0
    const a = after.follow_ups_used[key] ?? 0
    if (b !== a) changes.push(`follow_ups_used[${key}] ${b} -> ${a}`)
  }
  for (const key of new Set([...Object.keys(before.uncertainty_clarifications_used), ...Object.keys(after.uncertainty_clarifications_used)])) {
    const b = before.uncertainty_clarifications_used[key] ?? 0
    const a = after.uncertainty_clarifications_used[key] ?? 0
    if (b !== a) changes.push(`uncertainty_clarifications_used[${key}] ${b} -> ${a}`)
  }
  if (before.historical_experience_asked !== after.historical_experience_asked) {
    changes.push(`historical_experience_asked ${before.historical_experience_asked} -> ${after.historical_experience_asked}`)
  }
  if (before.disentangling_question_asked !== after.disentangling_question_asked) {
    changes.push(`disentangling_question_asked ${before.disentangling_question_asked} -> ${after.disentangling_question_asked}`)
  }
  if (before.interview_ended !== after.interview_ended) {
    changes.push(`interview_ended ${before.interview_ended} -> ${after.interview_ended}`)
  }
  if (before.phases_ended.length !== after.phases_ended.length || before.phases_ended.some((p, i) => p !== after.phases_ended[i])) {
    changes.push(`phases_ended [${before.phases_ended.join(',')}] -> [${after.phases_ended.join(',')}]`)
  }

  return changes
}
