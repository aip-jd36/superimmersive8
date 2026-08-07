/**
 * Legible actual-vs-expected trace reporter (CRC_PROTOTYPE_ALPHA_ROADMAP.md
 * Phase 7). Eval-only, consumed by both the mock dry run and (later) the
 * live-model battery -- one reporter, so the two are directly comparable.
 *
 * Deliberately checks structured state only (ids, kinds, reason codes,
 * gate/completion states) -- never assistant wording, per the explicit
 * "evaluate semantics and behavior, not prose matching" instruction.
 */

import type { DialogueRunResult } from './run-dialogue'
import type { DialogueScenario, ScenarioExpected } from './dialogue-scenarios'

export interface ScenarioDiff {
  scenario_id: string
  passed: boolean
  mismatches: string[]
}

function activeIds(items: { superseded_by: string | null }[], idOf: (i: any) => string): string[] {
  return items.filter((i) => i.superseded_by === null).map(idOf)
}

export function diffScenario(scenario: DialogueScenario, run: DialogueRunResult): ScenarioDiff {
  const mismatches: string[] = []
  const exp: ScenarioExpected = scenario.expected

  const actualActions = run.turns.map((t) => t.assistant_action)
  if (JSON.stringify(actualActions) !== JSON.stringify(exp.assistant_actions)) {
    mismatches.push(`assistant_actions: expected ${JSON.stringify(exp.assistant_actions)}, got ${JSON.stringify(actualActions)}`)
  }

  const actualObs = activeIds(run.final_su.scoped_observations, (o) => o.observation_id).sort()
  const expectedObs = [...exp.final_active_observation_ids].sort()
  if (JSON.stringify(actualObs) !== JSON.stringify(expectedObs)) {
    mismatches.push(`final_active_observation_ids: expected ${JSON.stringify(expectedObs)}, got ${JSON.stringify(actualObs)}`)
  }

  const actualTools = activeIds(run.final_su.tool_mentions, (m) => m.mention_id).sort()
  const expectedTools = [...exp.final_active_tool_mention_ids].sort()
  if (JSON.stringify(actualTools) !== JSON.stringify(expectedTools)) {
    mismatches.push(`final_active_tool_mention_ids: expected ${JSON.stringify(expectedTools)}, got ${JSON.stringify(actualTools)}`)
  }

  if (run.final_su.gate_1_state !== exp.final_gate_1_state) {
    mismatches.push(`final_gate_1_state: expected ${exp.final_gate_1_state}, got ${run.final_su.gate_1_state}`)
  }
  if (run.final_su.gate_2_state !== exp.final_gate_2_state) {
    mismatches.push(`final_gate_2_state: expected ${exp.final_gate_2_state}, got ${run.final_su.gate_2_state}`)
  }
  if (run.completion_reason !== exp.final_completion_reason) {
    mismatches.push(`final_completion_reason: expected ${JSON.stringify(exp.final_completion_reason)}, got ${JSON.stringify(run.completion_reason)}`)
  }

  // Verifies Finding 1's access_surface/plan_tier fix explicitly (JD
  // instruction, 2026-08-08 item 5) -- not just eyeballed from raw JSON.
  const sortById = (a: { identifier: string }, b: { identifier: string }) => a.identifier.localeCompare(b.identifier)
  const actualHandoffTools = [...run.final_handoff.tools].sort(sortById)
  const expectedHandoffTools = [...exp.final_handoff_tools].sort(sortById)
  if (JSON.stringify(actualHandoffTools) !== JSON.stringify(expectedHandoffTools)) {
    mismatches.push(`final_handoff.tools: expected ${JSON.stringify(expectedHandoffTools)}, got ${JSON.stringify(actualHandoffTools)}`)
  }

  return { scenario_id: scenario.id, passed: mismatches.length === 0, mismatches }
}

/** Turn 4 / Expected: .../ Actual: .../ Diff: ... -- the exact legible shape requested. */
export function formatScenarioTrace(scenario: DialogueScenario, run: DialogueRunResult, diff: ScenarioDiff): string {
  const lines: string[] = []
  lines.push(`=== ${scenario.id}${scenario.is_normative_probe ? ' (IMPLEMENTATION PROBE, not a normative PRD dialogue)' : ''} ===`)
  lines.push(scenario.description)
  lines.push('')

  run.turns.forEach((t, i) => {
    lines.push(`Turn ${t.turn} (phase ${t.phase}): "${scenario.turns[i].user_text}"`)
    lines.push(`  Extraction: ${t.extraction_diagnostics.map((d) => `${d.proposal_id}=${d.decision.outcome}`).join(', ') || '(no candidates)'}`)
    lines.push(`  Gate 1: ${t.gate_1.state} (${t.gate_1.reason_code})`)
    lines.push(`  Gate 2 [phase]: ${t.gate_2_phase_scope.state} (${t.gate_2_phase_scope.reason_code}) | [interview]: ${t.gate_2_interview_scope.state} (${t.gate_2_interview_scope.reason_code})`)
    lines.push(`  Candidate: ${t.candidate_proposal ? `${t.candidate_proposal.question_kind} -> ${t.candidate_proposal.target_signal_id ?? 'null'}` : '(none proposed)'}`)
    if (t.validation_rejected_reason) lines.push(`  Validation: REJECTED -- ${t.validation_rejected_reason}`)
    if (t.constraint_a_decision) lines.push(`  Constraint A: should_ask=${t.constraint_a_decision.should_ask} (${t.constraint_a_decision.reason_code})`)
    if (t.boundary_result_reason_code) lines.push(`  Constraint B: ${t.boundary_action_scope} (${t.boundary_result_reason_code})`)
    lines.push(`  Assistant action: ${t.assistant_action}`)
    lines.push('')
  })

  lines.push(`Final: gate_1=${run.final_su.gate_1_state}, gate_2=${run.final_su.gate_2_state}, completion_reason=${JSON.stringify(run.completion_reason)}`)
  lines.push(`Final handoff: ${JSON.stringify(run.final_handoff)}`)
  lines.push('')
  lines.push(`Diff: ${diff.passed ? 'PASS' : `FAIL (${diff.mismatches.length} mismatch(es))`}`)
  for (const m of diff.mismatches) lines.push(`  - ${m}`)
  lines.push(`Notes: ${scenario.expected.notes}`)
  lines.push('')

  return lines.join('\n')
}
