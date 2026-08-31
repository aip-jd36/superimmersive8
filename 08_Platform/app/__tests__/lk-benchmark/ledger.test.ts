/**
 * LK-68 -- tests for the append-only benchmark ledger.
 *
 * Every test uses a fresh OS temp directory, never the real repository
 * ledger location, so test runs can never corrupt real trial data.
 */

import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import {
  endMachineStage,
  failMachineStage,
  readEvents,
  recordArchitectureDiscovery,
  recordHumanReviewTurn,
  recordManualOrchestrationHandoff,
  recordProcessFriction,
  recordTrialEnd,
  recordTrialStart,
  startMachineStage,
} from '@/lib/lk-benchmark/ledger'
import { HANDOFF_MODELLED_SECONDS, HRT_MODELLED_SECONDS } from '@/lib/lk-benchmark/types'

let tmpDir: string
let ledgerPath: string

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lk-benchmark-test-'))
  ledgerPath = path.join(tmpDir, 'TEST-TRIAL.jsonl')
})

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true })
})

describe('A: valid prospective event recording', () => {
  test('TRIAL_START then events then TRIAL_END round-trips through readEvents', () => {
    recordTrialStart(ledgerPath, 'TEST-TRIAL', 'unit-test')
    recordHumanReviewTurn(ledgerPath, 'TEST-TRIAL', 'unit-test')
    recordManualOrchestrationHandoff(ledgerPath, 'TEST-TRIAL', 'unit-test')
    recordTrialEnd(ledgerPath, 'TEST-TRIAL', 'unit-test')

    const events = readEvents(ledgerPath)
    expect(events.map((e) => e.type)).toEqual([
      'TRIAL_START',
      'HUMAN_REVIEW_TURN',
      'MANUAL_ORCHESTRATION_HANDOFF',
      'TRIAL_END',
    ])
    // seq is monotonic
    expect(events.map((e) => e.seq)).toEqual([1, 2, 3, 4])
  })

  test('ledger file is append-only JSON Lines -- one JSON object per line', () => {
    recordTrialStart(ledgerPath, 'TEST-TRIAL', 'unit-test')
    recordHumanReviewTurn(ledgerPath, 'TEST-TRIAL', 'unit-test')
    const raw = fs.readFileSync(ledgerPath, 'utf-8')
    const lines = raw.split('\n').filter(Boolean)
    expect(lines).toHaveLength(2)
    expect(() => JSON.parse(lines[0])).not.toThrow()
    expect(() => JSON.parse(lines[1])).not.toThrow()
  })
})

describe('B: HUMAN_REVIEW_TURN', () => {
  test('records exactly 60 modelled seconds', () => {
    recordTrialStart(ledgerPath, 'TEST-TRIAL', 'unit-test')
    const event = recordHumanReviewTurn(ledgerPath, 'TEST-TRIAL', 'PM message', 'FGR decision received')
    expect(event.timing).toBe('modelled')
    expect(event.modelledSeconds).toBe(HRT_MODELLED_SECONDS)
    expect(event.modelledSeconds).toBe(60)
  })

  test('does not infer or encode any approval outcome', () => {
    recordTrialStart(ledgerPath, 'TEST-TRIAL', 'unit-test')
    const event = recordHumanReviewTurn(ledgerPath, 'TEST-TRIAL', 'PM message', 'FGR decision received')
    const keys = Object.keys(event)
    // the event schema has no field capable of representing ADOPT/REVISE/REJECT/APPROVE/etc.
    expect(keys).toEqual(
      expect.not.arrayContaining(['outcome', 'decision', 'approved', 'adopted', 'status'])
    )
    expect(JSON.stringify(event)).not.toMatch(/ADOPT|REJECT|APPROVE|WITHHOLD/)
  })
})

describe('C: MANUAL_ORCHESTRATION_HANDOFF', () => {
  test('records exactly 15 modelled seconds', () => {
    recordTrialStart(ledgerPath, 'TEST-TRIAL', 'unit-test')
    const event = recordManualOrchestrationHandoff(ledgerPath, 'TEST-TRIAL', 'CLI operator')
    expect(event.timing).toBe('modelled')
    expect(event.modelledSeconds).toBe(HANDOFF_MODELLED_SECONDS)
    expect(event.modelledSeconds).toBe(15)
  })
})

describe('D: MACHINE_STAGE bracketing', () => {
  test('records a real measured duration between start and end', async () => {
    recordTrialStart(ledgerPath, 'TEST-TRIAL', 'unit-test')
    startMachineStage(ledgerPath, 'TEST-TRIAL', 'evidence-capture', 'CLI operator')
    await new Promise((resolve) => setTimeout(resolve, 20))
    const end = endMachineStage(ledgerPath, 'TEST-TRIAL', 'evidence-capture', 'CLI operator')
    expect(end.status).toBe('completed')
    expect(end.timing).toBe('measured')
    expect(end.durationSeconds).toBeGreaterThanOrEqual(0)
    expect(Number.isFinite(end.durationSeconds)).toBe(true)
  })

  test('ending a stage that was never started fails closed -- no event written', () => {
    recordTrialStart(ledgerPath, 'TEST-TRIAL', 'unit-test')
    expect(() => endMachineStage(ledgerPath, 'TEST-TRIAL', 'never-started', 'CLI operator')).toThrow(/FAIL CLOSED/)
    const events = readEvents(ledgerPath)
    expect(events.filter((e) => e.type === 'MACHINE_STAGE')).toHaveLength(0)
  })

  test('a stage started but never ended is dangling, not silently completed', () => {
    recordTrialStart(ledgerPath, 'TEST-TRIAL', 'unit-test')
    startMachineStage(ledgerPath, 'TEST-TRIAL', 'unfinished-stage', 'CLI operator')
    const { danglingStageLabels } = recordTrialEnd(ledgerPath, 'TEST-TRIAL', 'CLI operator')
    expect(danglingStageLabels).toEqual(['unfinished-stage'])
  })

  test('stage-fail records a measured duration with status=failed, distinct from completed', async () => {
    recordTrialStart(ledgerPath, 'TEST-TRIAL', 'unit-test')
    startMachineStage(ledgerPath, 'TEST-TRIAL', 'interrupted-stage', 'CLI operator')
    await new Promise((resolve) => setTimeout(resolve, 5))
    const failed = failMachineStage(ledgerPath, 'TEST-TRIAL', 'interrupted-stage', 'CLI operator')
    expect(failed.status).toBe('failed')
    expect(failed.durationSeconds).toBeGreaterThanOrEqual(0)
  })

  test('repeated stages with the same label are distinguishable by matchedStartSeq', async () => {
    recordTrialStart(ledgerPath, 'TEST-TRIAL', 'unit-test')
    startMachineStage(ledgerPath, 'TEST-TRIAL', 'repeatable-stage', 'CLI operator')
    const firstEnd = endMachineStage(ledgerPath, 'TEST-TRIAL', 'repeatable-stage', 'CLI operator')
    startMachineStage(ledgerPath, 'TEST-TRIAL', 'repeatable-stage', 'CLI operator')
    const secondEnd = endMachineStage(ledgerPath, 'TEST-TRIAL', 'repeatable-stage', 'CLI operator')
    expect(firstEnd.matchedStartSeq).not.toBe(secondEnd.matchedStartSeq)
  })

  test('starting an already-open stage with the same label fails closed', () => {
    recordTrialStart(ledgerPath, 'TEST-TRIAL', 'unit-test')
    startMachineStage(ledgerPath, 'TEST-TRIAL', 'dup-stage', 'CLI operator')
    expect(() => startMachineStage(ledgerPath, 'TEST-TRIAL', 'dup-stage', 'CLI operator')).toThrow(/FAIL CLOSED/)
  })
})

describe('E: TRIAL_START / TRIAL_END wall-clock', () => {
  test('valid wall-clock seconds when both boundaries exist', async () => {
    recordTrialStart(ledgerPath, 'TEST-TRIAL', 'unit-test')
    await new Promise((resolve) => setTimeout(resolve, 10))
    recordTrialEnd(ledgerPath, 'TEST-TRIAL', 'unit-test')
    const events = readEvents(ledgerPath)
    const start = events.find((e) => e.type === 'TRIAL_START')!
    const end = events.find((e) => e.type === 'TRIAL_END')!
    const wallClockSeconds = (Date.parse(end.ts) - Date.parse(start.ts)) / 1000
    expect(wallClockSeconds).toBeGreaterThanOrEqual(0)
  })

  test('TRIAL_END without a prior TRIAL_START fails closed', () => {
    expect(() => recordTrialEnd(ledgerPath, 'NEVER-STARTED', 'unit-test')).toThrow(/FAIL CLOSED/)
  })

  test('duplicate TRIAL_START fails closed', () => {
    recordTrialStart(ledgerPath, 'TEST-TRIAL', 'unit-test')
    expect(() => recordTrialStart(ledgerPath, 'TEST-TRIAL', 'unit-test')).toThrow(/FAIL CLOSED/)
  })

  test('events after TRIAL_END fail closed', () => {
    recordTrialStart(ledgerPath, 'TEST-TRIAL', 'unit-test')
    recordTrialEnd(ledgerPath, 'TEST-TRIAL', 'unit-test')
    expect(() => recordHumanReviewTurn(ledgerPath, 'TEST-TRIAL', 'unit-test')).toThrow(/FAIL CLOSED/)
  })
})

describe('F: unmeasured/unknown work remains explicitly unmeasured', () => {
  test('a dangling MACHINE_STAGE never contributes a duration anywhere', () => {
    recordTrialStart(ledgerPath, 'TEST-TRIAL', 'unit-test')
    startMachineStage(ledgerPath, 'TEST-TRIAL', 'never-closed', 'CLI operator')
    const events = readEvents(ledgerPath)
    const ends = events.filter((e) => e.type === 'MACHINE_STAGE' && e.phase === 'end')
    expect(ends).toHaveLength(0)
  })
})

describe('H: invalid input fails closed', () => {
  test('recording an event for a trial with no TRIAL_START fails closed', () => {
    expect(() => recordHumanReviewTurn(ledgerPath, 'NEVER-STARTED', 'unit-test')).toThrow(/FAIL CLOSED/)
    expect(readEvents(ledgerPath)).toHaveLength(0)
  })

  test('empty provenance fails closed', () => {
    recordTrialStart(ledgerPath, 'TEST-TRIAL', 'unit-test')
    expect(() => recordHumanReviewTurn(ledgerPath, 'TEST-TRIAL', '')).toThrow(/FAIL CLOSED/)
  })

  test('a note exceeding MAX_NOTE_LENGTH fails closed', () => {
    recordTrialStart(ledgerPath, 'TEST-TRIAL', 'unit-test')
    const longNote = 'x'.repeat(300)
    expect(() => recordHumanReviewTurn(ledgerPath, 'TEST-TRIAL', 'unit-test', longNote)).toThrow(/FAIL CLOSED/)
  })

  test('ARCHITECTURE_DISCOVERY requires a non-empty note', () => {
    recordTrialStart(ledgerPath, 'TEST-TRIAL', 'unit-test')
    expect(() => recordArchitectureDiscovery(ledgerPath, 'TEST-TRIAL', 'unit-test', '')).toThrow(/FAIL CLOSED/)
  })

  test('PROCESS_FRICTION requires a non-empty note', () => {
    recordTrialStart(ledgerPath, 'TEST-TRIAL', 'unit-test')
    expect(() => recordProcessFriction(ledgerPath, 'TEST-TRIAL', 'unit-test', '')).toThrow(/FAIL CLOSED/)
  })

  test('no partial write occurs on a failed call', () => {
    recordTrialStart(ledgerPath, 'TEST-TRIAL', 'unit-test')
    const before = readEvents(ledgerPath).length
    expect(() => recordHumanReviewTurn(ledgerPath, 'TEST-TRIAL', '')).toThrow()
    expect(readEvents(ledgerPath).length).toBe(before)
  })
})
