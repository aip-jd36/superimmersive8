/**
 * LK-68 -- tests for deterministic benchmark summary calculation.
 * LK-82 -- rewritten for the corrected measurement semantics: MEASURED
 * (MACHINE_EXECUTION) vs. BRACKETED (legacy MACHINE_STAGE) vs. MODELLED
 * (HRT/handoff) are kept structurally separate; the combined subtotal
 * excludes bracketed seconds entirely.
 */

import { computeSummary, renderSummaryMarkdown } from '@/lib/lk-benchmark/summary'
import {
  BenchmarkEvent,
  HumanReviewTurnEvent,
  ManualOrchestrationHandoffEvent,
  MachineExecutionEvent,
  MachineStageEndEvent,
  MachineStageStartEvent,
  ProcessWaitEvent,
  OperatorUnavailableEvent,
  UnmeasuredWorkEvent,
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
  return { type: 'MACHINE_STAGE', phase: 'end', trialId: 'T', label, ts: '2026-09-01T00:00:10.000Z', seq, provenance: 'test', status, timing: 'bracketed', matchedStartSeq, durationSeconds }
}
function execution(seq: number, label: string, durationSeconds: number, status: 'completed' | 'failed' = 'completed', exitCode: number | null = 0): MachineExecutionEvent {
  return { type: 'MACHINE_EXECUTION', trialId: 'T', label, ts: '2026-09-01T00:00:10.000Z', seq, provenance: 'test', timing: 'measured', status, durationSeconds, exitCode, command: ['echo', 'hi'] }
}
function processWait(seq: number): ProcessWaitEvent {
  return { type: 'PROCESS_WAIT', trialId: 'T', ts: '2026-09-01T00:00:00.000Z', seq, provenance: 'test', note: 'waiting for deploy' }
}
function operatorUnavailable(seq: number): OperatorUnavailableEvent {
  return { type: 'OPERATOR_UNAVAILABLE', trialId: 'T', ts: '2026-09-01T00:00:00.000Z', seq, provenance: 'test', note: 'operator stepped away' }
}
function unmeasuredWork(seq: number): UnmeasuredWorkEvent {
  return { type: 'UNMEASURED_WORK', trialId: 'T', ts: '2026-09-01T00:00:00.000Z', seq, provenance: 'test', note: 'PM read a source PDF, duration not tracked' }
}

describe('computeSummary -- MODELLED (HRT/handoff)', () => {
  test('sums HRT and handoff counts/seconds correctly, and modelled HRT/handoff remain exactly 60s/15s per unit', () => {
    const events: BenchmarkEvent[] = [trialStart('2026-09-01T00:00:00.000Z', 1), hrt(2), hrt(3), handoff(4)]
    const summary = computeSummary(events, 'T')
    expect(summary.hrtCount).toBe(2)
    expect(summary.hrtModelledSeconds).toBe(120)
    expect(summary.handoffCount).toBe(1)
    expect(summary.handoffModelledSeconds).toBe(15)
    expect(summary.modelledHumanSeconds).toBe(135)
  })
})

describe('computeSummary -- BRACKETED (legacy MACHINE_STAGE, never execution-verified)', () => {
  test('a completed bracketed stage contributes to bracketedStageElapsedSeconds, NOT to machineExecutionMeasuredSeconds', () => {
    const events: BenchmarkEvent[] = [trialStart('2026-09-01T00:00:00.000Z', 1), stageStart(2, 'good'), stageEnd(3, 'good', 2, 100, 'completed')]
    const summary = computeSummary(events, 'T')
    expect(summary.bracketedStageElapsedSeconds).toBe(100)
    expect(summary.machineExecutionMeasuredSeconds).toBe(0)
    expect(summary.combinedMeasuredAndModelledSeconds).toBe(0) // bracketed is excluded entirely
  })

  test('a failed bracketed stage ALSO contributes to bracketedStageElapsedSeconds (outcome is diagnostic, not an eligibility rule) -- still never execution-verified', () => {
    const events: BenchmarkEvent[] = [trialStart('2026-09-01T00:00:00.000Z', 1), stageStart(2, 'bad'), stageEnd(3, 'bad', 2, 50, 'failed')]
    const summary = computeSummary(events, 'T')
    expect(summary.bracketedStageElapsedSeconds).toBe(50)
    expect(summary.bracketedStageFailedCount).toBe(1)
    expect(summary.machineExecutionMeasuredSeconds).toBe(0)
  })

  test('completed + failed bracketed aggregate equals the sum of both, distinct breakdown preserved', () => {
    const events: BenchmarkEvent[] = [
      trialStart('2026-09-01T00:00:00.000Z', 1),
      stageStart(2, 'good'),
      stageEnd(3, 'good', 2, 100, 'completed'),
      stageStart(4, 'bad'),
      stageEnd(5, 'bad', 4, 50, 'failed'),
    ]
    const summary = computeSummary(events, 'T')
    expect(summary.bracketedStageCompletedCount).toBe(1)
    expect(summary.bracketedStageCompletedSeconds).toBe(100)
    expect(summary.bracketedStageFailedCount).toBe(1)
    expect(summary.bracketedStageFailedSeconds).toBe(50)
    expect(summary.bracketedStageElapsedSeconds).toBe(150)
  })

  test('a dangling (started, never closed) bracketed stage does not contribute a fabricated duration and is surfaced visibly', () => {
    const events: BenchmarkEvent[] = [
      trialStart('2026-09-01T00:00:00.000Z', 1),
      stageStart(2, 'good'),
      stageEnd(3, 'good', 2, 100, 'completed'),
      stageStart(4, 'dangling'), // never closed
    ]
    const summary = computeSummary(events, 'T')
    expect(summary.bracketedStageDanglingLabels).toEqual(['dangling'])
    expect(summary.bracketedStageElapsedSeconds).toBe(100) // dangling contributes nothing
  })
})

describe('computeSummary -- MEASURED (LK-82 MACHINE_EXECUTION, genuinely process-owned)', () => {
  test('a completed execution contributes to machineExecutionMeasuredSeconds and the combined subtotal', () => {
    const events: BenchmarkEvent[] = [trialStart('2026-09-01T00:00:00.000Z', 1), execution(2, 'test-run', 12.5, 'completed', 0)]
    const summary = computeSummary(events, 'T')
    expect(summary.machineExecutionCompletedCount).toBe(1)
    expect(summary.machineExecutionCompletedSeconds).toBe(12.5)
    expect(summary.machineExecutionMeasuredSeconds).toBe(12.5)
    expect(summary.combinedMeasuredAndModelledSeconds).toBe(12.5)
  })

  test('a failed execution (real process ran, non-zero exit) also contributes to machineExecutionMeasuredSeconds -- outcome is diagnostic, not an eligibility rule', () => {
    const events: BenchmarkEvent[] = [trialStart('2026-09-01T00:00:00.000Z', 1), execution(2, 'test-run', 3.2, 'failed', 1)]
    const summary = computeSummary(events, 'T')
    expect(summary.machineExecutionFailedCount).toBe(1)
    expect(summary.machineExecutionFailedSeconds).toBe(3.2)
    expect(summary.machineExecutionMeasuredSeconds).toBe(3.2)
  })

  test('MEASURED and BRACKETED never blend -- a ledger with both keeps them in separate totals', () => {
    const events: BenchmarkEvent[] = [
      trialStart('2026-09-01T00:00:00.000Z', 1),
      stageStart(2, 'legacy'),
      stageEnd(3, 'legacy', 2, 739.115, 'completed'),
      execution(4, 'real', 5, 'completed', 0),
    ]
    const summary = computeSummary(events, 'T')
    expect(summary.bracketedStageElapsedSeconds).toBe(739.115)
    expect(summary.machineExecutionMeasuredSeconds).toBe(5)
    expect(summary.combinedMeasuredAndModelledSeconds).toBe(5) // only the genuinely measured 5s, never the 739.115s bracketed figure
  })

  test('MEASURED and MODELLED remain separate categories that both feed the combined subtotal explicitly', () => {
    const events: BenchmarkEvent[] = [trialStart('2026-09-01T00:00:00.000Z', 1), hrt(2), handoff(3), execution(4, 'x', 10, 'completed', 0)]
    const summary = computeSummary(events, 'T')
    expect(summary.modelledHumanSeconds).toBe(75)
    expect(summary.machineExecutionMeasuredSeconds).toBe(10)
    expect(summary.combinedMeasuredAndModelledSeconds).toBe(85)
  })
})

describe('computeSummary -- UNMEASURED/UNCLASSIFIED markers never carry a fabricated duration', () => {
  test('PROCESS_WAIT/OPERATOR_UNAVAILABLE/UNMEASURED_WORK are counted but contribute no seconds to any total', () => {
    const events: BenchmarkEvent[] = [
      trialStart('2026-09-01T00:00:00.000Z', 1),
      processWait(2),
      operatorUnavailable(3),
      unmeasuredWork(4),
      hrt(5),
    ]
    const summary = computeSummary(events, 'T')
    expect(summary.processWaitCount).toBe(1)
    expect(summary.operatorUnavailableCount).toBe(1)
    expect(summary.unmeasuredWorkCount).toBe(1)
    expect(summary.modelledHumanSeconds).toBe(60) // unaffected by the three markers
    expect(summary.combinedMeasuredAndModelledSeconds).toBe(60)
  })

  test('an interval with no explicit marker at all is simply absent from every count -- never inferred as waiting or execution', () => {
    const events: BenchmarkEvent[] = [trialStart('2026-09-01T00:00:00.000Z', 1), trialEnd('2026-09-01T01:00:00.000Z', 2)]
    const summary = computeSummary(events, 'T')
    expect(summary.processWaitCount).toBe(0)
    expect(summary.operatorUnavailableCount).toBe(0)
    expect(summary.unmeasuredWorkCount).toBe(0)
    expect(summary.machineExecutionMeasuredSeconds).toBe(0)
    expect(summary.bracketedStageElapsedSeconds).toBe(0)
    // the full hour of wall clock is not attributed to any category
    expect(summary.wallClockSeconds).toBe(3600)
    expect(summary.combinedMeasuredAndModelledSeconds).toBe(0)
  })
})

describe('computeSummary -- WALL CLOCK remains independent of every other category', () => {
  test('wall clock is null when trial has not both started and ended', () => {
    const events: BenchmarkEvent[] = [trialStart('2026-09-01T00:00:00.000Z', 1)]
    const summary = computeSummary(events, 'T')
    expect(summary.wallClockSeconds).toBeNull()
    expect(summary.trialStarted).toBe(true)
    expect(summary.trialEnded).toBe(false)
  })

  test('wall clock is computed when both boundaries exist, independent of measured/modelled/bracketed totals', () => {
    const events: BenchmarkEvent[] = [trialStart('2026-09-01T00:00:00.000Z', 1), hrt(2), execution(3, 'x', 5), trialEnd('2026-09-01T00:05:00.000Z', 4)]
    const summary = computeSummary(events, 'T')
    expect(summary.wallClockSeconds).toBe(300)
    expect(summary.combinedMeasuredAndModelledSeconds).toBe(65) // 5 measured + 60 modelled -- unrelated to the 300s wall clock
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

describe('renderSummaryMarkdown -- summary arithmetic never presents a partial metric as total onboarding time', () => {
  test('the phrase "total onboarding time" appears only inside a NOT disclaimer, never as a bare claim', () => {
    const events: BenchmarkEvent[] = [
      trialStart('2026-09-01T00:00:00.000Z', 1),
      hrt(2),
      handoff(3),
      stageStart(4, 'x'),
      stageEnd(5, 'x', 4, 10),
      execution(6, 'y', 3),
      trialEnd('2026-09-01T00:10:00.000Z', 7),
    ]
    const summary = computeSummary(events, 'T')
    const markdown = renderSummaryMarkdown(summary)
    const occurrences = markdown.match(/total onboarding time/gi) ?? []
    expect(occurrences.length).toBeGreaterThan(0)
    for (const lineWithPhrase of markdown.split('\n').filter((l) => /total onboarding time/i.test(l))) {
      expect(lineWithPhrase).toMatch(/NOT\s+total onboarding time/i)
    }
  })

  test('the combined subtotal is always labelled explicitly, never as a bare "total", and carries its own disclaimer', () => {
    const events: BenchmarkEvent[] = [trialStart('2026-09-01T00:00:00.000Z', 1), hrt(2)]
    const summary = computeSummary(events, 'T')
    const markdown = renderSummaryMarkdown(summary)
    expect(markdown).toMatch(/Combined measured\+modelled subtotal/)
    expect(markdown).toMatch(/EXCLUDES bracketed-stage-elapsed seconds/)
  })

  test('bracketed elapsed stat lines are never rendered with the word "measured" attached to the figure itself (the section\'s own explanatory disclaimer may still use the word "measured" to say what it is NOT)', () => {
    const events: BenchmarkEvent[] = [trialStart('2026-09-01T00:00:00.000Z', 1), stageStart(2, 'x'), stageEnd(3, 'x', 2, 739.115, 'completed')]
    const summary = computeSummary(events, 'T')
    const markdown = renderSummaryMarkdown(summary)
    const bracketedSection = markdown.split('## UNMEASURED')[0].split('## BRACKETED')[1]
    expect(bracketedSection).toBeDefined()
    const statLines = bracketedSection!.split('\n').filter((l) => l.trim().startsWith('-'))
    expect(statLines.length).toBeGreaterThan(0)
    for (const line of statLines) {
      expect(line).not.toMatch(/measured/i)
    }
    expect(bracketedSection).toMatch(/elapsed/i)
    // the disclaimer line itself is expected to explain what bracketed data is NOT
    expect(bracketedSection).toMatch(/NEVER reported as measured machine execution/i)
  })

  test('MEASURED and BRACKETED render as visually distinct sections', () => {
    const events: BenchmarkEvent[] = [trialStart('2026-09-01T00:00:00.000Z', 1), execution(2, 'x', 5)]
    const summary = computeSummary(events, 'T')
    const markdown = renderSummaryMarkdown(summary)
    expect(markdown).toMatch(/## MEASURED/)
    expect(markdown).toMatch(/## BRACKETED \/ ELAPSED/)
    expect(markdown).toMatch(/## MODELLED/)
    expect(markdown).toMatch(/## WALL CLOCK/)
  })
})
