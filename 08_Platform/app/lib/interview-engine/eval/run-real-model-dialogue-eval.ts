/**
 * Phase 7 live-model battery (CRC_PROTOTYPE_ALPHA_ROADMAP.md Phase 7; JD
 * instruction 2026-08-08). Runs all 9 scenarios (6 normative PRD dialogues +
 * 2 implementation fixtures + the Rule 5 probe) through the real orchestrator
 * with REAL Anthropic calls for extraction, candidate generation, and
 * Constraint A -- phase and decline scope remain script-supplied (Decision 1,
 * unchanged). Not a Jest test. Fails hard without ANTHROPIC_API_KEY, never
 * substitutes mocks.
 *
 * Two stages, per explicit instruction:
 *   1. Smoke pass -- one run per scenario (9 total). The smoke pass's own
 *      run counts as run #1 of that scenario's approved total (avoids
 *      re-spending on a throwaway first run) -- stated explicitly in the
 *      report, not a silent interpretation.
 *   2. Full battery -- each scenario continues for its REMAINING approved
 *      run count (PHASE_7_PLANNING.md §3): rich_signal 2, no_signal 3,
 *      current_vs_historical 3, ambiguous_uncertain 3, full_opt_out 2,
 *      mixed_multi_signal 3, ambiguous_multi_surface_tool 3,
 *      full_phase_1_to_4_trace 2, rule5_disentangling_probe 5. Only entered
 *      if the smoke pass shows no gross harness-level failure -- a per-run
 *      classifiable failure (e.g. one transient schema error) does not block
 *      it; an exception escaping the harness's own per-run try/catch would.
 *
 * No scenario is added or removed during the run. No frozen module is
 * tuned or modified while this script runs -- Extraction, normalization,
 * mutation/supersession, Gate 1/2, boundary logic, lineage resolution,
 * handoff assembly, candidate generation, Constraint A, and every dialogue
 * fixture/expected trace are exactly as committed before this run started.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { runDialogue } from './run-dialogue'
import type { DialogueRunResult } from './run-dialogue'
import { createLiveDialogueDeps, type LiveCallRecord } from './live-model-deps'
import { DIALOGUE_SCENARIOS, type DialogueScenario } from './dialogue-scenarios'
import { diffScenario, formatScenarioTrace } from './dialogue-trace-report'

function loadEnvLocal(): void {
  const envPath = join(__dirname, '..', '..', '..', '.env.local')
  if (!existsSync(envPath)) return
  const contents = readFileSync(envPath, 'utf-8')
  for (const line of contents.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    const value = trimmed.slice(eq + 1).trim()
    if (key && process.env[key] === undefined) process.env[key] = value
  }
}

// Approved asymmetric repeat counts (PHASE_7_PLANNING.md §3), TOTAL per
// scenario including the smoke-pass run.
const APPROVED_TOTAL_RUNS: Record<string, number> = {
  rich_signal: 2,
  no_signal: 3,
  current_vs_historical: 3,
  ambiguous_uncertain: 3,
  full_opt_out: 2,
  mixed_multi_signal: 3,
  ambiguous_multi_surface_tool: 3,
  full_phase_1_to_4_trace: 2,
  rule5_disentangling_probe: 5,
}

interface RunOutcome {
  scenario_id: string
  run_index: number
  status: 'completed' | 'harness_error'
  run: DialogueRunResult | null
  diff_passed: boolean | null
  diff_mismatches: string[]
  calls: LiveCallRecord[]
  error: string | null
}

async function runOnce(scenario: DialogueScenario, runIndex: number): Promise<RunOutcome> {
  const calls: LiveCallRecord[] = []
  const deps = createLiveDialogueDeps(calls)
  try {
    const run = await runDialogue(scenario.initial_su, scenario.turns, deps)
    const diff = diffScenario(scenario, run)
    return { scenario_id: scenario.id, run_index: runIndex, status: 'completed', run, diff_passed: diff.passed, diff_mismatches: diff.mismatches, calls, error: null }
  } catch (err) {
    const message = err instanceof Error ? `${err.message}\n${err.stack ?? ''}` : String(err)
    return { scenario_id: scenario.id, run_index: runIndex, status: 'harness_error', run: null, diff_passed: null, diff_mismatches: [], calls, error: message }
  }
}

async function main() {
  loadEnvLocal()

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('\nANTHROPIC_API_KEY is not set.\n')
    console.error('This is the Phase 7 live-model battery -- it makes real, billed Anthropic API calls and never')
    console.error('substitutes mocks when a key is missing. It stops here instead.\n')
    console.error('  1. Copy 08_Platform/app/.env.local.example to 08_Platform/app/.env.local (gitignored)')
    console.error('  2. Set ANTHROPIC_API_KEY=sk-ant-... in that file')
    console.error('  3. Re-run: npm run eval:dialogue-live\n')
    process.exit(1)
  }

  const lines: string[] = []
  const log = (s = '') => {
    console.log(s)
    lines.push(s)
  }

  const allOutcomes: RunOutcome[] = []

  log('=== Phase 7 Live-Model Battery ===')
  log(`${DIALOGUE_SCENARIOS.length} scenarios, real Anthropic calls for extraction/candidate-generation/Constraint A.`)
  log('Stage 1: smoke pass (1 run per scenario, counts as run #1 of the approved total).\n')

  // ── Stage 1: smoke pass ────────────────────────────────────────────────
  for (const scenario of DIALOGUE_SCENARIOS) {
    log(`--- SMOKE: ${scenario.id} (run 1/${APPROVED_TOTAL_RUNS[scenario.id]}) ---`)
    const outcome = await runOnce(scenario, 1)
    allOutcomes.push(outcome)
    if (outcome.status === 'harness_error') {
      log(`HARNESS ERROR: ${outcome.error}`)
    } else if (outcome.run) {
      const diff = { scenario_id: scenario.id, passed: outcome.diff_passed!, mismatches: outcome.diff_mismatches }
      log(formatScenarioTrace(scenario, outcome.run, diff))
      log(`Live calls this run: ${outcome.calls.length} (${outcome.calls.map((c) => c.subsystem).join(', ')})`)
    }
    log('')
  }

  const smokeHarnessErrors = allOutcomes.filter((o) => o.status === 'harness_error')
  const smokeErrorRate = smokeHarnessErrors.length / DIALOGUE_SCENARIOS.length

  log('=== Smoke Pass Summary ===')
  log(`${DIALOGUE_SCENARIOS.length - smokeHarnessErrors.length}/${DIALOGUE_SCENARIOS.length} scenarios completed without a harness-level error.`)
  if (smokeHarnessErrors.length > 0) {
    log(`Harness errors: ${smokeHarnessErrors.map((o) => o.scenario_id).join(', ')}`)
  }

  // Gross harness-level blocker = every scenario failed identically, or an
  // error indicates a wiring/import/systemic problem rather than one
  // scenario's own live-model output. A single isolated harness_error is
  // reported and classified, not treated as a reason to withhold the rest
  // of the battery from the scenarios that DID complete cleanly.
  const grossBlocker = smokeErrorRate === 1

  if (grossBlocker) {
    log('\n*** GROSS HARNESS-LEVEL BLOCKER: every scenario failed in the smoke pass. Stopping before the full battery. ***')
    writeReport(lines, 'BLOCKED')
    process.exit(1)
  }

  log('\nNo gross harness-level blocker. Proceeding to Stage 2 (full battery, remaining runs).\n')

  // ── Stage 2: full battery (remaining runs per scenario) ────────────────
  for (const scenario of DIALOGUE_SCENARIOS) {
    const total = APPROVED_TOTAL_RUNS[scenario.id]
    for (let runIndex = 2; runIndex <= total; runIndex++) {
      log(`--- FULL BATTERY: ${scenario.id} (run ${runIndex}/${total}) ---`)
      const outcome = await runOnce(scenario, runIndex)
      allOutcomes.push(outcome)
      if (outcome.status === 'harness_error') {
        log(`HARNESS ERROR: ${outcome.error}`)
      } else if (outcome.run) {
        const diff = { scenario_id: scenario.id, passed: outcome.diff_passed!, mismatches: outcome.diff_mismatches }
        log(formatScenarioTrace(scenario, outcome.run, diff))
        log(`Live calls this run: ${outcome.calls.length} (${outcome.calls.map((c) => c.subsystem).join(', ')})`)
      }
      log('')
    }
  }

  // ── Aggregate metrics ────────────────────────────────────────────────────
  log('=== Aggregate Metrics ===')
  const completed = allOutcomes.filter((o) => o.status === 'completed')
  log(`Runtime-complete dialogue runs: ${completed.length}/${allOutcomes.length}`)

  const byScenario = new Map<string, RunOutcome[]>()
  for (const o of allOutcomes) {
    if (!byScenario.has(o.scenario_id)) byScenario.set(o.scenario_id, [])
    byScenario.get(o.scenario_id)!.push(o)
  }
  for (const [id, outcomes] of byScenario) {
    const passed = outcomes.filter((o) => o.diff_passed === true).length
    const failed = outcomes.filter((o) => o.diff_passed === false).length
    const errored = outcomes.filter((o) => o.status === 'harness_error').length
    log(`  ${id}: ${passed} pass, ${failed} fail, ${errored} harness error (of ${outcomes.length} runs)`)
  }

  let totalInputTokens = 0
  let totalOutputTokens = 0
  let totalLatencyMs = 0
  let totalCalls = 0
  const bySubsystem: Record<string, { calls: number; inputTokens: number; outputTokens: number; latencyMs: number }> = {}
  for (const o of allOutcomes) {
    for (const c of o.calls) {
      totalInputTokens += c.inputTokens
      totalOutputTokens += c.outputTokens
      totalLatencyMs += c.latencyMs
      totalCalls += 1
      if (!bySubsystem[c.subsystem]) bySubsystem[c.subsystem] = { calls: 0, inputTokens: 0, outputTokens: 0, latencyMs: 0 }
      bySubsystem[c.subsystem].calls += 1
      bySubsystem[c.subsystem].inputTokens += c.inputTokens
      bySubsystem[c.subsystem].outputTokens += c.outputTokens
      bySubsystem[c.subsystem].latencyMs += c.latencyMs
    }
  }
  log(`\nTotal live API calls: ${totalCalls}`)
  log(`Total input tokens: ${totalInputTokens} | Total output tokens: ${totalOutputTokens}`)
  log(`Average latency per call: ${(totalLatencyMs / totalCalls).toFixed(0)}ms`)
  log(`Average calls per dialogue run: ${(totalCalls / completed.length).toFixed(1)}`)
  for (const [subsystem, s] of Object.entries(bySubsystem)) {
    log(`  ${subsystem}: ${s.calls} calls, ${s.inputTokens} in / ${s.outputTokens} out tokens, avg ${(s.latencyMs / s.calls).toFixed(0)}ms/call`)
  }
  // Estimated cost -- explicitly labeled assumption, not a verified invoice
  // figure. Using publicly documented Sonnet-tier pricing as of this
  // session ($3/M input, $15/M output tokens); the actual current rate for
  // claude-sonnet-5 should be checked at review time, not treated as
  // authoritative from this script alone.
  const estimatedCost = (totalInputTokens / 1_000_000) * 3 + (totalOutputTokens / 1_000_000) * 15
  log(`\nEstimated API cost (assumed $3/M input, $15/M output tokens -- verify current rate): $${estimatedCost.toFixed(4)}`)

  // ── Gate 2 scope comparison ──────────────────────────────────────────────
  log('\n=== Gate 2 Scope Comparison ===')
  let totalTurns = 0
  let disagreements = 0
  let disagreementsAffectingFinalState = 0
  for (const o of completed) {
    if (!o.run) continue
    for (const t of o.run.turns) {
      totalTurns++
      if (t.gate_2_phase_scope.state !== t.gate_2_interview_scope.state) {
        disagreements++
      }
    }
    const lastTurn = o.run.turns[o.run.turns.length - 1]
    if (lastTurn && lastTurn.gate_2_phase_scope.state !== lastTurn.gate_2_interview_scope.state) {
      disagreementsAffectingFinalState++
    }
  }
  log(`Turns with phase/interview Gate 2 disagreement: ${disagreements}/${totalTurns}`)
  log(`Runs where the FINAL turn's disagreement could have changed completion_reason: ${disagreementsAffectingFinalState}/${completed.length}`)

  // ── Rule 5 probe summary ─────────────────────────────────────────────────
  log('\n=== Rule 5 Probe Summary ===')
  const rule5Outcomes = completed.filter((o) => o.scenario_id === 'rule5_disentangling_probe')
  for (const o of rule5Outcomes) {
    if (!o.run) continue
    const turn1 = o.run.turns[0]
    const turn3 = o.run.turns[2]
    log(`  Run ${o.run_index}: turn1 candidate_kind=${turn1?.candidate_proposal?.question_kind ?? 'none'}, constraint_a=${turn1?.constraint_a_decision?.reason_code ?? 'n/a'}, action=${turn1?.assistant_action}`)
    log(`    turn3 candidate_kind=${turn3?.candidate_proposal?.question_kind ?? 'none'}, constraint_a=${turn3?.constraint_a_decision?.reason_code ?? 'n/a'}, action=${turn3?.assistant_action}`)
  }

  // ── Signal-lineage watch (all scenarios) ─────────────────────────────────
  // Deliberately does not attempt to auto-verdict "the fix worked" -- only
  // surfaces the two raw facts needed to judge it by hand against the full
  // per-run trace above: every supersession event (old id -> new id) and
  // every follow_up_on_signal/uncertainty_clarification proposal with its
  // target id and boundary outcome. A live case genuinely exercising the
  // fix requires BOTH: a proposal's target_signal_id appearing as a
  // supersession's "old id" in an EARLIER turn, and a LATER proposal
  // targeting the new id.
  log('\n=== Signal Lineage Watch (all scenarios) -- raw facts for manual cross-reference ===')
  for (const o of completed) {
    if (!o.run) continue
    const supersessions: string[] = []
    const cappedProposals: string[] = []
    o.run.turns.forEach((t, i) => {
      for (const d of t.extraction_diagnostics) {
        if (d.decision.outcome === 'accepted' && d.candidate.supersedes_tool_mention_id) {
          supersessions.push(`turn ${t.turn}: tool ${d.candidate.supersedes_tool_mention_id} -> ${d.decision.applied_identifier}`)
        }
        if (d.decision.outcome === 'accepted' && d.candidate.supersedes_observation_id) {
          supersessions.push(`turn ${t.turn}: observation ${d.candidate.supersedes_observation_id} -> ${d.decision.applied_identifier}`)
        }
      }
      if (t.candidate_proposal && (t.candidate_proposal.question_kind === 'follow_up_on_signal' || t.candidate_proposal.question_kind === 'uncertainty_clarification')) {
        cappedProposals.push(`turn ${t.turn}: ${t.candidate_proposal.question_kind} -> ${t.candidate_proposal.target_signal_id} | boundary=${t.boundary_result_reason_code ?? 'n/a'}`)
      }
    })
    if (supersessions.length > 0 || cappedProposals.length > 0) {
      log(`  ${o.scenario_id} run ${o.run_index}:`)
      for (const s of supersessions) log(`    supersession: ${s}`)
      for (const p of cappedProposals) log(`    capped-kind proposal: ${p}`)
    }
  }

  writeReport(lines, completed.length === allOutcomes.length ? 'COMPLETE' : 'COMPLETE_WITH_ERRORS')
}

function writeReport(lines: string[], status: string) {
  const reportsDir = join(__dirname, '..', '..', '..', '..', 'implementation', 'eval-reports')
  if (!existsSync(reportsDir)) mkdirSync(reportsDir, { recursive: true })
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const reportPath = join(reportsDir, `PHASE-7-LIVE-BATTERY-${status}-${timestamp}.md`)
  writeFileSync(reportPath, lines.join('\n'), 'utf-8')
  console.log(`\nReport written to: ${reportPath}`)
}

main()
