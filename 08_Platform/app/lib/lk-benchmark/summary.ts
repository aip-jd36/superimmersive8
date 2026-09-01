/**
 * Deterministic benchmark summary calculation (LK-68; measurement semantics
 * corrected LK-82).
 *
 * Pure functions only -- given an event array, always produce the same
 * output. No file I/O, no clock reads, no randomness.
 *
 * LK-82 CORRECTION: the original LK-68 summary called `MACHINE_STAGE`
 * durations "measured" and folded them into a combined "attended-processing
 * lower bound" alongside modelled human seconds. Trial 4 established that a
 * `MACHINE_STAGE` duration is only ever the wall-clock gap between two
 * SEPARATE, operator-issued CLI invocations -- it is never verified to be
 * actual bounded-process execution, and may silently contain human review,
 * model/network waiting, or an operator being away. This module now keeps
 * three timing categories structurally separate and never blends them:
 *
 *   MEASURED   -- MACHINE_EXECUTION only (a single CLI invocation that spawns
 *                 and owns a real subprocess from start to exit)
 *   MODELLED   -- HUMAN_REVIEW_TURN / MANUAL_ORCHESTRATION_HANDOFF planning
 *                 assumptions (60s / 15s respectively) -- never measured labor
 *   BRACKETED  -- legacy MACHINE_STAGE elapsed intervals -- reported on their
 *                 own, explicitly labelled, and EXCLUDED from any combined
 *                 "trustworthy subtotal" (see combinedMeasuredAndModelledSeconds
 *                 below) because their provenance does not support treating
 *                 them as real execution
 *
 * PROCESS_WAIT / OPERATOR_UNAVAILABLE / UNMEASURED_WORK are reported as
 * plain counts only -- they carry no duration by design (see types.ts), so
 * there is nothing to sum. Wall-clock trial duration (TRIAL_START ->
 * TRIAL_END) remains fully separate from every category above and is never
 * used to derive labor or backfill an "unexplained" bucket.
 */

import {
  BenchmarkEvent,
  HANDOFF_MODELLED_SECONDS,
  HRT_MODELLED_SECONDS,
  HumanReviewTurnEvent,
  MachineExecutionEvent,
  MachineStageEndEvent,
  MachineStageStartEvent,
  ManualOrchestrationHandoffEvent,
} from './types'

export const COMBINED_SUBTOTAL_DISCLAIMER =
  'The combined measured+modelled subtotal is a partial planning figure (genuinely measured MACHINE_EXECUTION seconds + modelled HUMAN_REVIEW_TURN/MANUAL_ORCHESTRATION_HANDOFF seconds ONLY). It deliberately EXCLUDES bracketed-stage-elapsed seconds -- their provenance does not support treating them as real execution (see the BRACKETED disclaimer below). It is NOT total onboarding time, NOT labor, and does not account for process waiting, operator-unavailable time, or unmeasured work -- those are reported separately, only when explicitly recorded, and are never estimated or backfilled.'

export const BRACKETED_DISCLAIMER =
  'Bracketed-stage-elapsed seconds are the wall-clock gap between two SEPARATE, operator-issued CLI invocations (stage-start, then later stage-end/stage-fail). Nothing owns or observes what happens between them -- the interval may contain real work, human review, model/network waiting, or operator absence. This is historical LK-68 instrumentation, retained for backward-compatible parsing of existing ledgers (e.g. Trial 4). It is NEVER reported as measured machine execution, and is EXCLUDED from the combined measured+modelled subtotal above.'

export interface BenchmarkSummary {
  trialId: string

  // MODELLED -- planning assumptions, never measured labor
  hrtCount: number
  hrtModelledSeconds: number
  handoffCount: number
  handoffModelledSeconds: number
  modelledHumanSeconds: number

  // MEASURED -- genuine, benchmark-process-owned subprocess execution (LK-82)
  machineExecutionCompletedCount: number
  machineExecutionCompletedSeconds: number
  machineExecutionFailedCount: number
  machineExecutionFailedSeconds: number
  /** completed + failed -- both are genuinely measured; only a process that never started is excluded (it is never recorded at all -- see ledger.ts). */
  machineExecutionMeasuredSeconds: number

  // BRACKETED / ELAPSED -- legacy LK-68 MACHINE_STAGE, never execution-verified
  bracketedStageCompletedCount: number
  bracketedStageCompletedSeconds: number
  bracketedStageFailedCount: number
  bracketedStageFailedSeconds: number
  /** completed + failed elapsed seconds -- NOT execution-verified. Dangling (never closed) stages contribute nothing here. */
  bracketedStageElapsedSeconds: number
  /** Started but never ended/failed -- excluded from every total, surfaced so closeout cannot silently miss them. */
  bracketedStageDanglingLabels: string[]

  // Explicit, operator-recorded, no-duration qualitative markers (LK-82)
  processWaitCount: number
  operatorUnavailableCount: number
  unmeasuredWorkCount: number

  frictionCount: number
  discoveryCount: number

  /** TRIAL_START -> TRIAL_END, independent of every category above. May contain machine execution, human activity, waiting, operator-unavailable periods, and unmeasured work in any proportion -- never decomposed from this number. */
  wallClockSeconds: number | null
  trialStarted: boolean
  trialEnded: boolean

  /** machineExecutionMeasuredSeconds + modelledHumanSeconds ONLY -- see COMBINED_SUBTOTAL_DISCLAIMER. */
  combinedMeasuredAndModelledSeconds: number

  combinedSubtotalDisclaimer: string
  bracketedDisclaimer: string
}

export function computeSummary(events: BenchmarkEvent[], trialId: string): BenchmarkSummary {
  const trialEvents = events.filter((e) => e.trialId === trialId)

  const hrts = trialEvents.filter((e): e is HumanReviewTurnEvent => e.type === 'HUMAN_REVIEW_TURN')
  const handoffs = trialEvents.filter(
    (e): e is ManualOrchestrationHandoffEvent => e.type === 'MANUAL_ORCHESTRATION_HANDOFF'
  )

  const stageStarts = trialEvents.filter(
    (e): e is MachineStageStartEvent => e.type === 'MACHINE_STAGE' && e.phase === 'start'
  )
  const stageEnds = trialEvents.filter(
    (e): e is MachineStageEndEvent => e.type === 'MACHINE_STAGE' && e.phase === 'end'
  )
  const closedStartSeqs = new Set(stageEnds.map((e) => e.matchedStartSeq))
  const danglingLabels = Array.from(
    new Set(stageStarts.filter((s) => !closedStartSeqs.has(s.seq)).map((s) => s.label))
  )
  const bracketedCompleted = stageEnds.filter((e) => e.status === 'completed')
  const bracketedFailed = stageEnds.filter((e) => e.status === 'failed')

  const executions = trialEvents.filter((e): e is MachineExecutionEvent => e.type === 'MACHINE_EXECUTION')
  const executionsCompleted = executions.filter((e) => e.status === 'completed')
  const executionsFailed = executions.filter((e) => e.status === 'failed')

  const hrtCount = hrts.length
  const hrtModelledSeconds = hrtCount * HRT_MODELLED_SECONDS
  const handoffCount = handoffs.length
  const handoffModelledSeconds = handoffCount * HANDOFF_MODELLED_SECONDS
  const modelledHumanSeconds = hrtModelledSeconds + handoffModelledSeconds

  const machineExecutionCompletedSeconds = executionsCompleted.reduce((sum, e) => sum + e.durationSeconds, 0)
  const machineExecutionFailedSeconds = executionsFailed.reduce((sum, e) => sum + e.durationSeconds, 0)
  const machineExecutionMeasuredSeconds = machineExecutionCompletedSeconds + machineExecutionFailedSeconds

  const bracketedStageCompletedSeconds = bracketedCompleted.reduce((sum, e) => sum + e.durationSeconds, 0)
  const bracketedStageFailedSeconds = bracketedFailed.reduce((sum, e) => sum + e.durationSeconds, 0)
  const bracketedStageElapsedSeconds = bracketedStageCompletedSeconds + bracketedStageFailedSeconds

  const combinedMeasuredAndModelledSeconds = machineExecutionMeasuredSeconds + modelledHumanSeconds

  const start = trialEvents.find((e) => e.type === 'TRIAL_START')
  const end = trialEvents.find((e) => e.type === 'TRIAL_END')
  const wallClockSeconds = start && end ? (Date.parse(end.ts) - Date.parse(start.ts)) / 1000 : null

  return {
    trialId,
    hrtCount,
    hrtModelledSeconds,
    handoffCount,
    handoffModelledSeconds,
    modelledHumanSeconds,
    machineExecutionCompletedCount: executionsCompleted.length,
    machineExecutionCompletedSeconds,
    machineExecutionFailedCount: executionsFailed.length,
    machineExecutionFailedSeconds,
    machineExecutionMeasuredSeconds,
    bracketedStageCompletedCount: bracketedCompleted.length,
    bracketedStageCompletedSeconds,
    bracketedStageFailedCount: bracketedFailed.length,
    bracketedStageFailedSeconds,
    bracketedStageElapsedSeconds,
    bracketedStageDanglingLabels: danglingLabels,
    processWaitCount: trialEvents.filter((e) => e.type === 'PROCESS_WAIT').length,
    operatorUnavailableCount: trialEvents.filter((e) => e.type === 'OPERATOR_UNAVAILABLE').length,
    unmeasuredWorkCount: trialEvents.filter((e) => e.type === 'UNMEASURED_WORK').length,
    frictionCount: trialEvents.filter((e) => e.type === 'PROCESS_FRICTION').length,
    discoveryCount: trialEvents.filter((e) => e.type === 'ARCHITECTURE_DISCOVERY').length,
    wallClockSeconds,
    trialStarted: !!start,
    trialEnded: !!end,
    combinedMeasuredAndModelledSeconds,
    combinedSubtotalDisclaimer: COMBINED_SUBTOTAL_DISCLAIMER,
    bracketedDisclaimer: BRACKETED_DISCLAIMER,
  }
}

export function renderSummaryMarkdown(summary: BenchmarkSummary): string {
  const lines: string[] = [`# Benchmark summary — ${summary.trialId}`, '']

  lines.push(
    '## MEASURED (genuine, benchmark-process-owned subprocess execution)',
    `- MACHINE_EXECUTION completed: ${summary.machineExecutionCompletedCount} (${summary.machineExecutionCompletedSeconds}s measured)`,
  )
  if (summary.machineExecutionFailedCount > 0) {
    lines.push(`- MACHINE_EXECUTION failed: ${summary.machineExecutionFailedCount} (${summary.machineExecutionFailedSeconds}s measured -- a real process ran; outcome is diagnostic, not an eligibility rule)`)
  }
  lines.push(`- MACHINE_EXECUTION measured total: ${summary.machineExecutionMeasuredSeconds}s`, '')

  lines.push(
    '## MODELLED (planning assumptions, never measured labor)',
    `- HUMAN_REVIEW_TURN: ${summary.hrtCount} (${summary.hrtModelledSeconds}s modelled)`,
    `- MANUAL_ORCHESTRATION_HANDOFF: ${summary.handoffCount} (${summary.handoffModelledSeconds}s modelled)`,
    `- Modelled human total: ${summary.modelledHumanSeconds}s`,
    '',
  )

  lines.push(
    '## BRACKETED / ELAPSED (legacy MACHINE_STAGE -- never execution-verified)',
    `- Completed: ${summary.bracketedStageCompletedCount} (${summary.bracketedStageCompletedSeconds}s elapsed)`,
  )
  if (summary.bracketedStageFailedCount > 0) {
    lines.push(`- Failed: ${summary.bracketedStageFailedCount} (${summary.bracketedStageFailedSeconds}s elapsed -- still a real bracketed interval; outcome is diagnostic, not an eligibility rule)`)
  }
  if (summary.bracketedStageDanglingLabels.length > 0) {
    lines.push(`- Incomplete (started, never ended -- EXCLUDED from every total): ${summary.bracketedStageDanglingLabels.join(', ')}`)
  }
  lines.push(`- Bracketed elapsed total: ${summary.bracketedStageElapsedSeconds}s`, `> ${summary.bracketedDisclaimer}`, '')

  lines.push(
    '## UNMEASURED / UNCLASSIFIED (explicit, no-duration markers)',
    `- PROCESS_WAIT events: ${summary.processWaitCount}`,
    `- OPERATOR_UNAVAILABLE events: ${summary.operatorUnavailableCount}`,
    `- UNMEASURED_WORK events: ${summary.unmeasuredWorkCount}`,
    '(none of the above carry a duration -- their existence is recorded, never a quantity)',
    '',
  )

  lines.push(
    '## WALL CLOCK',
    summary.wallClockSeconds !== null
      ? `- TRIAL_START -> TRIAL_END: ${summary.wallClockSeconds}s (may contain any mix of every category above, in unknown proportion -- never decomposed from this number)`
      : '- not available (trial has not both started and ended)',
    '',
  )

  lines.push(
    '## Other',
    `- PROCESS_FRICTION events: ${summary.frictionCount}`,
    `- ARCHITECTURE_DISCOVERY events: ${summary.discoveryCount}`,
    '',
    `**Combined measured+modelled subtotal: ${summary.combinedMeasuredAndModelledSeconds}s**`,
    `> ${summary.combinedSubtotalDisclaimer}`,
  )

  return lines.join('\n')
}
