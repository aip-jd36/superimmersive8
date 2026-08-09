/**
 * Mock-stack dry run (CRC_PROTOTYPE_ALPHA_ROADMAP.md Phase 7, step 1 of the
 * approved implementation order). Runs all 9 scenarios through the REAL
 * orchestrator (run-dialogue.ts) and REAL deterministic modules
 * (normalizeCandidate, attestCandidate, mutations, evaluateGate1/2,
 * deriveEligibleSignals, validateCandidateReference, evaluateBoundary,
 * buildRetrievalHandoff) with only the three genuinely model-dependent
 * decision points (extraction candidates, candidate-question proposals,
 * Constraint A decisions) supplied from each scenario's own pre-authored
 * queue via mock-sequenced.ts.
 *
 * Zero API cost, zero network calls. Purpose: prove the harness itself is
 * wired correctly -- state threading, gate scope handling, boundary/decline
 * integration, handoff assembly timing -- independent of any live-model
 * variance, before a single dollar of API budget is spent on the real
 * battery. Per JD's explicit instruction: STOP after this report. Do not
 * proceed to the live-model battery from this script.
 *
 * Not a Jest test (see dialogue-orchestrator.test.ts for the thin
 * always-run regression version of the same idea) -- this is the full,
 * human-readable trace report, written to eval-reports/, following the same
 * convention every real-model harness in this directory already uses.
 */

import { existsSync, mkdirSync, writeFileSync } from 'fs'
import { join } from 'path'
import { runDialogue } from './run-dialogue'
import { sequencedExtractor, sequencedGenerator, sequencedDecider } from './mock-sequenced'
import { DIALOGUE_SCENARIOS } from './dialogue-scenarios'
import { diffScenario, formatScenarioTrace } from './dialogue-trace-report'

async function main() {
  const lines: string[] = []
  const log = (s = '') => {
    console.log(s)
    lines.push(s)
  }

  log('=== Phase 7 Mock-Stack Dry Run ===')
  log(`${DIALOGUE_SCENARIOS.length} scenarios, real orchestrator + real deterministic modules, mocked extraction/generation/decision only.`)
  log('Zero API calls. Per JD instruction: this run stops here -- no live-model battery follows from this script.\n')

  let passCount = 0
  const failedIds: string[] = []

  for (const scenario of DIALOGUE_SCENARIOS) {
    const deps = {
      extractor: sequencedExtractor(scenario.turn_candidates),
      generator: sequencedGenerator(scenario.generator_queue),
      decider: sequencedDecider(scenario.decider_queue),
    }
    const run = await runDialogue(scenario.initial_su, scenario.turns, deps)
    const diff = diffScenario(scenario, run)
    log(formatScenarioTrace(scenario, run, diff))
    if (diff.passed) passCount++
    else failedIds.push(scenario.id)
  }

  log('=== Summary ===')
  log(`${passCount}/${DIALOGUE_SCENARIOS.length} scenarios passed.`)
  if (failedIds.length > 0) log(`Failed: ${failedIds.join(', ')}`)
  log('\nThis dry run validates ORCHESTRATOR WIRING against each scenario’s own hand-authored expectations -- it does not')
  log('and cannot validate whether a live model would produce the same candidates/proposals/decisions. That is the')
  log('explicit purpose of the (not-yet-run) live-model battery, gated on this report first per JD instruction.')

  const reportsDir = join(__dirname, '..', '..', '..', '..', 'implementation', 'eval-reports')
  if (!existsSync(reportsDir)) mkdirSync(reportsDir, { recursive: true })
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const reportPath = join(reportsDir, `PHASE-7-MOCK-DRY-RUN-${timestamp}.md`)
  writeFileSync(reportPath, lines.join('\n'), 'utf-8')
  console.log(`\nReport written to: ${reportPath}`)

  if (failedIds.length > 0) process.exit(1)
}

main()
