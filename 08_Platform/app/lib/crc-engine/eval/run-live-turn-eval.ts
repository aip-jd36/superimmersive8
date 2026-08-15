/**
 * Live Interview Runtime evaluation harness (Live Interview Runtime
 * milestone, live-model validation). Runs the SCENARIOS corpus against the
 * real Anthropic adapters, through the real, unmodified `runTurn()`, using
 * the in-memory SessionStore only. No API routes, no Supabase, no UI.
 *
 * Retrieval and Projection are exercised strictly as downstream
 * validation whenever a turn completes -- runTurn() already calls
 * runCRCConversation() internally on completion; this harness only checks
 * (a) it was called at all, (b) the ProjectionOutput shape is structurally
 * valid, (c) no forbidden governance field leaked into it. Their own
 * correctness is not re-evaluated -- that's Prototype Beta's own,
 * already-closed evaluation.
 *
 * Run: npx tsx lib/crc-engine/eval/run-live-turn-eval.ts [--trials=N] [--scenario=id]
 */

import { runTurn, type RunTurnDeps } from '@/lib/crc-engine/run-turn'
import { createInMemorySessionStore } from '@/lib/crc-engine/in-memory-session-store'
import { createAnthropicExtractor } from '@/lib/interview-engine/anthropic-extractor'
import { createAnthropicCandidateQuestionGenerator } from '@/lib/interview-engine/anthropic-candidate-question'
import { createAnthropicConstraintADecider } from '@/lib/interview-engine/anthropic-decision'
import { resolveDeclineSignal, type DeclineAction } from '@/lib/crc-engine/decline'
import { MATRIX_FIXTURE } from '@/lib/retrieval-engine/matrix-fixture'
import { createCapture, instrumentExtractor, instrumentGenerator, instrumentDecider } from './instrumented-live-deps'
import { diffBoundaryState, diffStructuredUnderstanding } from './diff'
import { SCENARIOS, type Scenario } from './scenarios'
import type { CRCSessionState } from '@/lib/crc-engine/types'
import type { DeclineSignal } from '@/lib/interview-engine/boundaries'
import * as fs from 'fs'
import * as path from 'path'

// ── Per-turn log ─────────────────────────────────────────────────────────

type ConstraintBVerdict = 'allowed' | 'blocked' | 'not_reached'

interface TurnLogEntry {
  scenario_id: string
  trial: number
  turn_number: number
  user_text: string
  decline_action: DeclineAction | null
  decline_state: DeclineSignal | null
  phase: number | null
  gate_1_state: string | null
  gate_2_state: string | null
  pending_clarification: unknown
  generated_candidate_question: unknown
  constraint_a_decision: unknown
  constraint_b_verdict: ConstraintBVerdict
  completion_state: { is_complete: boolean; reason: string | null }
  su_diff: string[]
  boundary_state_diff: string[]
  outcome_kind: string
  outcome_message: string | null
  error: string | null
}

interface ScenarioTrialResult {
  scenario_id: string
  trial: number
  turns: TurnLogEntry[]
  completed: boolean
  final_phase: number | null
  projection_check: { ran: boolean; structurally_valid: boolean; notes: string[] } | null
  aborted_error: string | null
}

// ── Harness ──────────────────────────────────────────────────────────────

async function runScenarioTrial(scenario: Scenario, trial: number): Promise<ScenarioTrialResult> {
  const store = createInMemorySessionStore()
  const token = `${scenario.id}-t${trial}`
  const capture = createCapture()
  const deps: RunTurnDeps = {
    extractor: instrumentExtractor(createAnthropicExtractor(), capture),
    generator: instrumentGenerator(createAnthropicCandidateQuestionGenerator(), capture),
    decider: instrumentDecider(createAnthropicConstraintADecider(), capture),
    sessionStore: store,
    matrix: MATRIX_FIXTURE,
  }

  const turns: TurnLogEntry[] = []
  let completed = false
  let finalPhase: number | null = null
  let projectionCheck: ScenarioTrialResult['projection_check'] = null
  let abortedError: string | null = null

  for (let i = 0; i < scenario.turns.length; i++) {
    if (completed) break // §7: a completed session never re-enters the loop; harness stops offering turns too.
    const turnScript = scenario.turns[i]
    capture.reset()
    const before = (await store.load(token)) as CRCSessionState | null

    try {
      const outcome = await runTurn({ token, turnNumber: i + 1, userText: turnScript.userText, declineAction: turnScript.declineAction }, deps)
      const after = (await store.load(token)) as CRCSessionState | null

      const declineState = turnScript.declineAction ? resolveDeclineSignal(turnScript.declineAction) : null

      let constraintBVerdict: ConstraintBVerdict = 'not_reached'
      if (capture.lastProposal?.output && capture.lastDecision?.output.should_ask) {
        constraintBVerdict = outcome.kind === 'question' ? 'allowed' : 'blocked'
      }

      const entry: TurnLogEntry = {
        scenario_id: scenario.id,
        trial,
        turn_number: i + 1,
        user_text: turnScript.userText,
        decline_action: turnScript.declineAction ?? null,
        decline_state: declineState,
        phase: after?.structured_understanding.current_phase ?? null,
        gate_1_state: after?.structured_understanding.gate_1_state ?? null,
        gate_2_state: after?.structured_understanding.gate_2_state ?? null,
        pending_clarification: after?.pending_clarification ?? null,
        generated_candidate_question: capture.lastProposal?.output ?? null,
        constraint_a_decision: capture.lastDecision?.output ?? null,
        constraint_b_verdict: constraintBVerdict,
        completion_state: { is_complete: outcome.kind === 'complete', reason: after?.structured_understanding.completion_reason ?? null },
        su_diff: before && after ? diffStructuredUnderstanding(before.structured_understanding, after.structured_understanding) : ['(no prior state -- first turn)'],
        boundary_state_diff: before && after ? diffBoundaryState(before.boundary_state, after.boundary_state) : ['(no prior state -- first turn)'],
        outcome_kind: outcome.kind,
        outcome_message: outcome.kind !== 'complete' ? outcome.message : null,
        error: null,
      }
      turns.push(entry)

      if (outcome.kind === 'complete') {
        completed = true
        finalPhase = entry.phase
        const notes: string[] = []
        let structurallyValid = true
        const output = outcome.result.output
        const keys = Object.keys(output).sort()
        if (JSON.stringify(keys) !== JSON.stringify(['closing_cta', 'goal_interpretations', 'knowledge_items', 'opening_line', 'understood_summary'])) {
          structurallyValid = false
          notes.push(`unexpected ProjectionOutput keys: ${keys.join(', ')}`)
        }
        if (!Array.isArray(output.knowledge_items)) {
          structurallyValid = false
          notes.push('knowledge_items is not an array')
        }
        const serialized = JSON.stringify(output)
        for (const forbidden of ['publication_scope', 'CRC-Eligible', 'CRC Decision Date', 'CRC Approver', 'SI8 Interpretation']) {
          if (serialized.includes(forbidden)) {
            structurallyValid = false
            notes.push(`forbidden governance field leaked into ProjectionOutput: ${forbidden}`)
          }
        }
        if (!Array.isArray(outcome.result.diagnostics.retrieval) || !Array.isArray(outcome.result.diagnostics.projection)) {
          structurallyValid = false
          notes.push('diagnostics.retrieval/projection are not arrays')
        }
        projectionCheck = { ran: true, structurally_valid: structurallyValid, notes }
      }
    } catch (err) {
      abortedError = err instanceof Error ? `${err.message}` : String(err)
      turns.push({
        scenario_id: scenario.id,
        trial,
        turn_number: i + 1,
        user_text: turnScript.userText,
        decline_action: turnScript.declineAction ?? null,
        decline_state: null,
        phase: null,
        gate_1_state: null,
        gate_2_state: null,
        pending_clarification: null,
        generated_candidate_question: null,
        constraint_a_decision: null,
        constraint_b_verdict: 'not_reached',
        completion_state: { is_complete: false, reason: null },
        su_diff: [],
        boundary_state_diff: [],
        outcome_kind: 'error',
        outcome_message: null,
        error: abortedError,
      })
      break
    }
  }

  return { scenario_id: scenario.id, trial, turns, completed, final_phase: finalPhase, projection_check: projectionCheck, aborted_error: abortedError }
}

async function main() {
  const args = process.argv.slice(2)
  const trialsArg = args.find((a) => a.startsWith('--trials='))
  const scenarioArg = args.find((a) => a.startsWith('--scenario='))
  const trials = trialsArg ? parseInt(trialsArg.split('=')[1], 10) : 2
  const scenariosToRun = scenarioArg ? SCENARIOS.filter((s) => s.id === scenarioArg.split('=')[1]) : SCENARIOS

  console.log(`\nLive Interview Runtime evaluation -- ${scenariosToRun.length} scenario(s), ${trials} trial(s) each\n${'='.repeat(72)}\n`)

  const results: ScenarioTrialResult[] = []

  for (const scenario of scenariosToRun) {
    for (let trial = 1; trial <= trials; trial++) {
      console.log(`[${scenario.id}] trial ${trial}/${trials} -- running ${scenario.turns.length} turn(s)...`)
      const result = await runScenarioTrial(scenario, trial)
      results.push(result)
      console.log(
        `[${scenario.id}] trial ${trial} -- ${result.turns.length} turns run, completed=${result.completed}, final_phase=${result.final_phase}, ` +
          `projection_valid=${result.projection_check?.structurally_valid ?? 'n/a'}${result.aborted_error ? `, ERROR: ${result.aborted_error}` : ''}`,
      )
    }
  }

  const outDir = path.join(process.cwd(), '..', 'implementation', 'eval-reports')
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const outPath = path.join(outDir, `LIVE-RUNTIME-VALIDATION-RAW-${timestamp}.json`)
  fs.writeFileSync(outPath, JSON.stringify(results, null, 2))
  console.log(`\nRaw results written to ${outPath}`)
}

main().catch((err) => {
  console.error('Harness-level failure:', err)
  process.exit(1)
})
