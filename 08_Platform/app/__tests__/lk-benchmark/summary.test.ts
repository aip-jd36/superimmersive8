/**
 * LK-68 -- tests for deterministic benchmark summary calculation.
 */

import { computeSummary, renderSummaryMarkdown } from '@/lib/lk-benchmark/summary'
import {
  BenchmarkEvent,
  HumanReviewTurnEvent,
  ManualOrchestrationHandoffEvent,
  MachineStageEndEvent,
  MachineStageStartEvent,
  TrialEndEvent,
  TrialStartEvent,
} from '@/lib/lk-benchmark/types'

function trialStart(ts: string, seq: number): TrialStartEvent {
  return { type: 'TRIAL_START', trialId: 'T', ts, seq, provenance: 'test' }
}
function trialEnd(ts: string, seq: number): TrialEndEvent {
  return { type: 'TRIAL_END', trialId: 'T', ts, seq, provenance: 'test' }
}
function hrt(seq: number): HumanReviewTurnEvent {
  return { type: 'HUMAN_REVIEW_TURN', trialId: 'T', ts: '2026-09-01T00:00:00.000Z', seq, provenance: 'test', timing: 'modelled', modelledSeconds: 60 }
}
function handoff(seq: number): ManualOrchestrationHandoffEvent {
  return { type: 'MANUAL_ORCHESTRATION_HANDOFF', trialId: 'T', ts: '2026-09-01T00:00:00.000Z', seq, provenance: 'test', timing: 'modelled', modelledSeconds: 15 }
}
function stageStart(seq: number, label: string): MachineStageStartEvent {
  return { type: 'MACHINE_STAGE', phase: 'start', trialId: 'T', label, ts: '2026-09-01T00:00:00.000Z', seq, provenance: 'test' }
}
function stageEnd(seq: number, label: string, matchedStartSeq: number, durationSeconds: number, status: 'completed' | 'failed' = 'completed'): MachineStageEndEvent {
  return { type: 'MACHINE_STAGE', phase: 'end', trialId: 'T', label, ts: '2026-09-01T00:00:10.000Z', seq, provenance: 'test', status, timing: 'measured', matchedStartSeq, durationSeconds }
}

describe('computeSummary', () => {
  test('sums HRT and handoff counts/seconds correctly', () => {
    const events: BenchmarkEvent[] = [trialStart('2026-09-01T00:00:00.000Z', 1), hrt(2), hrt(3), handoff(4)]
    const summary = computeSummary(events, 'T')
    expect(summary.hrtCount).toBe(2)
    expect(summary.hrtModelledSeconds).toBe(120)
    expect(summary.handoffCount).toBe(1)
    expect(summary.handoffModelledSeconds).toBe(15)
    expect(summary.modelledHumanSeconds).toBe(135)
  })

  test('A: a completed stage duration contributes to measured machine total', () => {
    const events: BenchmarkEvent[] = [trialStart('2026-09-01T00:00:00.000Z', 1), stageStart(2, 'good'), stageEnd(3, 'good', 2, 100, 'completed')]
    const summary = computeSummary(events, 'T')
    expect(summary.machineStageMeasuredSeconds).toBe(100)
    expect(summary.attendedProcessingLowerBoundSeconds).toBe(100)
  })

  test('B: a failed stage duration ALSO contributes to measured machine total (outcome is diagnostic, not an eligibility rule)', () => {
    const events: BenchmarkEvent[] = [trialStart('2026-09-01T00:00:00.000Z', 1), stageStart(2, 'bad'), stageEnd(3, 'bad', 2, 50, 'failed')]
    const summary = computeSummary(events, 'T')
    expect(summary.machineStageMeasuredSeconds).toBe(50)
    expect(summary.attendedProcessingLowerBoundSeconds).toBe(50)
  })

  test('C: completed + failed aggregate measured machine time equals the sum of both', () => {
    const events: BenchmarkEvent[] = [
      trialStart('2026-09-01T00:00:00.000Z', 1),
      stageStart(2, 'good'),
      stageEnd(3, 'good', 2, 100, 'completed'),
      stageStart(4, 'bad'),
      stageEnd(5, 'bad', 4, 50, 'failed'),
    ]
    const summary = computeSummary(events, 'T')
    expect(summary.machineStageMeasuredSeconds).toBe(150)
    expect(summary.attendedProcessingLowerBoundSeconds).toBe(150)
  })

  test('D: failed remains visibly failed in the outcome breakdown, distinct from completed', () => {
    const events: BenchmarkEvent[] = [
      trialStart('2026-09-01T00:00:00.000Z', 1),
      stageStart(2, 'good'),
      stageEnd(3, 'good', 2, 100, 'completed'),
      stageStart(4, 'bad'),
      stageEnd(5, 'bad', 4, 50, 'failed'),
    ]
    const summary = computeSummary(events, 'T')
    expect(summary.machineStageCompletedCount).toBe(1)
    expect(summary.machineStageCompletedSeconds).toBe(100)
    expect(summary.machineStageFailedCount).toBe(1)
    expect(summary.machineStageFailedSeconds).toBe(50)
  })

  test('E: a dangling (started, never closed) stage does not contribute a fabricated duration', () => {
    const events: BenchmarkEvent[] = [
      trialStart('2026-09-01T00:00:00.000Z', 1),
      stageStart(2, 'good'),
      stageEnd(3, 'good', 2, 100, 'completed'),
      stageStart(4, 'dangling'), // never closed
    ]
    const summary = computeSummary(events, 'T')
    expect(summary.machineStageDanglingLabels).toEqual(['dangling'])
    expect(summary.machineStageMeasuredSeconds).toBe(100) // dangling contributes nothing
    expect(summary.attendedProcessingLowerBoundSeconds).toBe(100)
  })

  test('F: completed + failed + dangling together -- lower bound includes measured failed execution but never dangling', () => {
    const events: BenchmarkEvent[] = [
      trialStart('2026-09-01T00:00:00.000Z', 1),
      stageStart(2, 'good'),
      stageEnd(3, 'good', 2, 100, 'completed'),
      stageStart(4, 'bad'),
      stageEnd(5, 'bad', 4, 50, 'failed'),
      stageStart(6, 'dangling'), // never closed
    ]
    const summary = computeSummary(events, 'T')
    expect(summary.machineStageCompletedSeconds).toBe(100)
    expect(summary.machineStageFailedSeconds).toBe(50)
    expect(summary.machineStageDanglingLabels).toEqual(['dangling'])
    expect(summary.machineStageMeasuredSeconds).toBe(150) // completed + failed, dangling excluded
    expect(summary.attendedProcessingLowerBoundSeconds).toBe(150)
  })

  test('G: modelled human accounting is unaffected by the measured-machine-time correction', () => {
    const events: BenchmarkEvent[] = [
      trialStart('2026-09-01T00:00:00.000Z', 1),
      hrt(2),
      handoff(3),
      stageStart(4, 'bad'),
      stageEnd(5, 'bad', 4, 50, 'failed'),
    ]
    const summary = computeSummary(events, 'T')
    expect(summary.modelledHumanSeconds).toBe(75) // 60 + 15, unchanged
    expect(summary.attendedProcessingLowerBoundSeconds).toBe(125) // 50 measured + 75 modelled
  })

  test('wall clock is null when trial has not both started and ended', () => {
    const events: BenchmarkEvent[] = [trialStart('2026-09-01T00:00:00.000Z', 1)]
    const summary = computeSummary(events, 'T')
    expect(summary.wallClockSeconds).toBeNull()
    expect(summary.trialStarted).toBe(true)
    expect(summary.trialEnded).toBe(false)
  })

  test('wall clock is computed when both boundaries exist', () => {
    const events: BenchmarkEvent[] = [trialStart('2026-09-01T00:00:00.000Z', 1), trialEnd('2026-09-01T00:05:00.000Z', 2)]
    const summary = computeSummary(events, 'T')
    expect(summary.wallClockSeconds).toBe(300)
  })

  test('is scoped to the given trialId only, ignoring events from other trials', () => {
    const events: BenchmarkEvent[] = [
      trialStart('2026-09-01T00:00:00.000Z', 1),
      hrt(2),
      { ...hrt(3), trialId: 'OTHER-TRIAL' },
    ]
    const summary = computeSummary(events, 'T')
    expect(summary.hrtCount).toBe(1)
  })
})

describe('G: renderSummaryMarkdown never labels the lower bound as total onboarding time', () => {
  test('the phrase "total onboarding time" appears exactly once, and only inside the NOT disclaimer', () => {
    const events: BenchmarkEvent[] = [
      trialStart('2026-09-01T00:00:00.000Z', 1),
      hrt(2),
      handoff(3),
      stageStart(4, 'x'),
      stageEnd(5, 'x', 4, 10),
      trialEnd('2026-09-01T00:10:00.000Z', 6),
    ]
    const summary = computeSummary(events, 'T')
    const markdown = renderSummaryMarkdown(summary)

    const occurrences = markdown.match(/total onboarding time/g) ?? []
    expect(occurrences).toHaveLength(1)

    const disclaimerLine = markdown.split('\n').find((l) => l.includes('total onboarding time'))
    expect(disclaimerLine).toBeDefined()
    expect(disclaimerLine).toMatch(/NOT\s+total onboarding time/)
  })

  test('the lower bound figure is always labelled explicitly, never as a bare "total"', () => {
    const events: BenchmarkEvent[] = [trialStart('2026-09-01T00:00:00.000Z', 1), hrt(2)]
    const summary = computeSummary(events, 'T')
    const markdown = renderSummaryMarkdown(summary)
    expect(markdown).toMatch(/Attended-processing lower bound/)
  })
})
