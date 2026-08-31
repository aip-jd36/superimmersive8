/**
 * Deterministic benchmark summary calculation (LK-68).
 *
 * Pure functions only -- given an event array, always produce the same
 * output. No file I/O, no clock reads, no randomness.
 */

import {
  BenchmarkEvent,
  HANDOFF_MODELLED_SECONDS,
  HRT_MODELLED_SECONDS,
  HumanReviewTurnEvent,
  MachineStageEndEvent,
  MachineStageStartEvent,
  ManualOrchestrationHandoffEvent,
} from './types'

export const LOWER_BOUND_DISCLAIMER =
  'The attended-processing lower bound is a partial subtotal (measured MACHINE_STAGE seconds -- completed or failed, any stage that was actually bracketed with a real start and end -- + modelled HUMAN_REVIEW_TURN/MANUAL_ORCHESTRATION_HANDOFF seconds). It is NOT total onboarding time: unmeasured human source-reading/research time, unmeasured external-model processing time, dangling (started but never ended/failed) machine-stage time, and any operator-unavailable intervals are excluded.'

export interface BenchmarkSummary {
  trialId: string
  hrtCount: number
  hrtModelledSeconds: number
  handoffCount: number
  handoffModelledSeconds: number
  machineStageCompletedCount: number
  machineStageCompletedSeconds: number
  machineStageFailedCount: number
  machineStageFailedSeconds: number
  /**
   * completed + failed measured seconds -- stage OUTCOME (completed/failed)
   * is diagnostic metadata, not an eligibility rule for whether a real,
   * successfully-bracketed duration counts as measured machine time. A
   * failed stage that actually ran for a measured duration is still real
   * machine-active processing. Only dangling (unclosed) stages are excluded
   * -- see machineStageDanglingLabels.
   */
  machineStageMeasuredSeconds: number
  /** Started but never ended/failed -- excluded from every total below. */
  machineStageDanglingLabels: string[]
  modelledHumanSeconds: number
  attendedProcessingLowerBoundSeconds: number
  frictionCount: number
  discoveryCount: number
  wallClockSeconds: number | null
  trialStarted: boolean
  trialEnded: boolean
  disclaimer: string
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

  const completed = stageEnds.filter((e) => e.status === 'completed')
  const failed = stageEnds.filter((e) => e.status === 'failed')

  const hrtCount = hrts.length
  const hrtModelledSeconds = hrtCount * HRT_MODELLED_SECONDS
  const handoffCount = handoffs.length
  const handoffModelledSeconds = handoffCount * HANDOFF_MODELLED_SECONDS
  const machineStageCompletedSeconds = completed.reduce((sum, e) => sum + e.durationSeconds, 0)
  const machineStageFailedSeconds = failed.reduce((sum, e) => sum + e.durationSeconds, 0)
  // Outcome (completed/failed) is diagnostic metadata, not an eligibility
  // rule: both are real, successfully-bracketed measured durations. Only
  // dangling (unclosed) stages are excluded -- they were never included in
  // stageEnds to begin with, so this sum never reaches them.
  const machineStageMeasuredSeconds = machineStageCompletedSeconds + machineStageFailedSeconds
  const modelledHumanSeconds = hrtModelledSeconds + handoffModelledSeconds
  const attendedProcessingLowerBoundSeconds = machineStageMeasuredSeconds + modelledHumanSeconds

  const start = trialEvents.find((e) => e.type === 'TRIAL_START')
  const end = trialEvents.find((e) => e.type === 'TRIAL_END')
  const wallClockSeconds = start && end ? (Date.parse(end.ts) - Date.parse(start.ts)) / 1000 : null

  return {
    trialId,
    hrtCount,
    hrtModelledSeconds,
    handoffCount,
    handoffModelledSeconds,
    machineStageCompletedCount: completed.length,
    machineStageCompletedSeconds,
    machineStageFailedCount: failed.length,
    machineStageFailedSeconds,
    machineStageMeasuredSeconds,
    machineStageDanglingLabels: danglingLabels,
    modelledHumanSeconds,
    attendedProcessingLowerBoundSeconds,
    frictionCount: trialEvents.filter((e) => e.type === 'PROCESS_FRICTION').length,
    discoveryCount: trialEvents.filter((e) => e.type === 'ARCHITECTURE_DISCOVERY').length,
    wallClockSeconds,
    trialStarted: !!start,
    trialEnded: !!end,
    disclaimer: LOWER_BOUND_DISCLAIMER,
  }
}

export function renderSummaryMarkdown(summary: BenchmarkSummary): string {
  const lines: string[] = [
    `# Benchmark summary — ${summary.trialId}`,
    '',
    `- HUMAN_REVIEW_TURN: ${summary.hrtCount} (${summary.hrtModelledSeconds}s modelled)`,
    `- MANUAL_ORCHESTRATION_HANDOFF: ${summary.handoffCount} (${summary.handoffModelledSeconds}s modelled)`,
    `- MACHINE_STAGE completed: ${summary.machineStageCompletedCount} (${summary.machineStageCompletedSeconds}s measured)`,
  ]
  if (summary.machineStageFailedCount > 0) {
    lines.push(
      `- MACHINE_STAGE failed: ${summary.machineStageFailedCount} (${summary.machineStageFailedSeconds}s measured -- still counted as measured machine time; outcome is diagnostic, not an eligibility rule)`
    )
  }
  if (summary.machineStageDanglingLabels.length > 0) {
    lines.push(
      `- MACHINE_STAGE incomplete (started, never ended -- EXCLUDED from every total): ${summary.machineStageDanglingLabels.join(', ')}`
    )
  }
  lines.push(
    `- MACHINE_STAGE measured total (completed + failed): ${summary.machineStageMeasuredSeconds}s`,
    `- Modelled human seconds (HRT + handoff): ${summary.modelledHumanSeconds}`,
    `- **Attended-processing lower bound: ${summary.attendedProcessingLowerBoundSeconds}s**`,
    `- PROCESS_FRICTION events: ${summary.frictionCount}`,
    `- ARCHITECTURE_DISCOVERY events: ${summary.discoveryCount}`,
    summary.wallClockSeconds !== null
      ? `- Wall-clock (TRIAL_START -> TRIAL_END): ${summary.wallClockSeconds}s`
      : `- Wall-clock: not available (trial has not both started and ended)`,
    '',
    `> ${summary.disclaimer}`
  )
  return lines.join('\n')
}
