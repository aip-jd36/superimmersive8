/**
 * Append-only, repository-local benchmark ledger (LK-68).
 *
 * File format: JSON Lines (.jsonl) -- one immutable BenchmarkEvent object per
 * line, in append order. Chosen because it is diff-friendly, requires no
 * whole-file rewrite to append, and needs no parsing library beyond
 * JSON.parse per line.
 *
 * Every write function in this module either appends exactly one valid,
 * fully-computed event, or throws before writing anything ("FAIL CLOSED: ").
 * There is no partial-write path and no path that fabricates a timestamp,
 * duration, or governance outcome. Timestamps are always `new Date()` at
 * call time -- never caller-suppliable -- so nothing here can backdate an
 * event or reconstruct a duration from memory.
 *
 * This module has no import relationship with Living Knowledge, Retrieval,
 * Bounded Interpretation, Composition, questioning, or Track A/B/C. See
 * __tests__/lk-benchmark/architecture-isolation.test.ts.
 */

import * as fs from 'fs'
import * as path from 'path'
import {
  BenchmarkEvent,
  ArchitectureDiscoveryEvent,
  HANDOFF_MODELLED_SECONDS,
  HRT_MODELLED_SECONDS,
  HumanReviewTurnEvent,
  MachineStageEndEvent,
  MachineStageStartEvent,
  ManualOrchestrationHandoffEvent,
  MAX_NOTE_LENGTH,
  ProcessFrictionEvent,
  TrialEndEvent,
  TrialStartEvent,
} from './types'

function nowIso(): string {
  return new Date().toISOString()
}

function validateNote(note: string | undefined): void {
  if (note === undefined) return
  if (note.length > MAX_NOTE_LENGTH) {
    throw new Error(
      `FAIL CLOSED: note exceeds MAX_NOTE_LENGTH (${MAX_NOTE_LENGTH} chars) -- got ${note.length}`
    )
  }
}

function requireNonEmpty(value: string, fieldName: string): void {
  if (!value || value.trim().length === 0) {
    throw new Error(`FAIL CLOSED: ${fieldName} must be a non-empty string`)
  }
}

export function readEvents(ledgerPath: string): BenchmarkEvent[] {
  if (!fs.existsSync(ledgerPath)) return []
  const raw = fs.readFileSync(ledgerPath, 'utf-8')
  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line) as BenchmarkEvent)
}

function nextSeq(ledgerPath: string): number {
  return readEvents(ledgerPath).length + 1
}

function appendEventRaw(ledgerPath: string, event: BenchmarkEvent): void {
  const dir = path.dirname(ledgerPath)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  fs.appendFileSync(ledgerPath, JSON.stringify(event) + '\n', 'utf-8')
}

function requireTrialOpen(ledgerPath: string, trialId: string): void {
  const events = readEvents(ledgerPath)
  const started = events.some((e) => e.trialId === trialId && e.type === 'TRIAL_START')
  const ended = events.some((e) => e.trialId === trialId && e.type === 'TRIAL_END')
  if (!started) {
    throw new Error(
      `FAIL CLOSED: no TRIAL_START recorded for trial "${trialId}" in ${ledgerPath} -- this ledger is prospective-only; it cannot record events for a trial it never saw start`
    )
  }
  if (ended) {
    throw new Error(`FAIL CLOSED: trial "${trialId}" already has a TRIAL_END -- cannot record further events`)
  }
}

// ---------------------------------------------------------------------------
// TRIAL_START / TRIAL_END
// ---------------------------------------------------------------------------

export function recordTrialStart(ledgerPath: string, trialId: string, provenance: string): TrialStartEvent {
  requireNonEmpty(trialId, 'trialId')
  requireNonEmpty(provenance, 'provenance')
  const events = readEvents(ledgerPath)
  if (events.some((e) => e.trialId === trialId && e.type === 'TRIAL_START')) {
    throw new Error(`FAIL CLOSED: TRIAL_START already recorded for trial "${trialId}"`)
  }
  const event: TrialStartEvent = {
    type: 'TRIAL_START',
    trialId,
    ts: nowIso(),
    seq: nextSeq(ledgerPath),
    provenance,
  }
  appendEventRaw(ledgerPath, event)
  return event
}

export interface TrialEndResult {
  event: TrialEndEvent
  /** MACHINE_STAGE labels started but never ended/failed for this trial -- excluded from every summary total, surfaced here so closeout cannot silently miss them. */
  danglingStageLabels: string[]
}

export function recordTrialEnd(ledgerPath: string, trialId: string, provenance: string): TrialEndResult {
  requireNonEmpty(trialId, 'trialId')
  requireNonEmpty(provenance, 'provenance')
  requireTrialOpen(ledgerPath, trialId)
  const events = readEvents(ledgerPath)
  const danglingStageLabels = findDanglingStageLabels(events, trialId)
  const event: TrialEndEvent = {
    type: 'TRIAL_END',
    trialId,
    ts: nowIso(),
    seq: nextSeq(ledgerPath),
    provenance,
  }
  appendEventRaw(ledgerPath, event)
  return { event, danglingStageLabels }
}

// ---------------------------------------------------------------------------
// HUMAN_REVIEW_TURN / MANUAL_ORCHESTRATION_HANDOFF
// ---------------------------------------------------------------------------

export function recordHumanReviewTurn(
  ledgerPath: string,
  trialId: string,
  provenance: string,
  note?: string
): HumanReviewTurnEvent {
  requireNonEmpty(trialId, 'trialId')
  requireNonEmpty(provenance, 'provenance')
  validateNote(note)
  requireTrialOpen(ledgerPath, trialId)
  const event: HumanReviewTurnEvent = {
    type: 'HUMAN_REVIEW_TURN',
    trialId,
    ts: nowIso(),
    seq: nextSeq(ledgerPath),
    provenance,
    timing: 'modelled',
    modelledSeconds: HRT_MODELLED_SECONDS,
    ...(note !== undefined ? { note } : {}),
  }
  appendEventRaw(ledgerPath, event)
  return event
}

export function recordManualOrchestrationHandoff(
  ledgerPath: string,
  trialId: string,
  provenance: string,
  note?: string
): ManualOrchestrationHandoffEvent {
  requireNonEmpty(trialId, 'trialId')
  requireNonEmpty(provenance, 'provenance')
  validateNote(note)
  requireTrialOpen(ledgerPath, trialId)
  const event: ManualOrchestrationHandoffEvent = {
    type: 'MANUAL_ORCHESTRATION_HANDOFF',
    trialId,
    ts: nowIso(),
    seq: nextSeq(ledgerPath),
    provenance,
    timing: 'modelled',
    modelledSeconds: HANDOFF_MODELLED_SECONDS,
    ...(note !== undefined ? { note } : {}),
  }
  appendEventRaw(ledgerPath, event)
  return event
}

// ---------------------------------------------------------------------------
// MACHINE_STAGE bracketing
// ---------------------------------------------------------------------------

function findOpenStage(
  events: BenchmarkEvent[],
  trialId: string,
  label: string
): MachineStageStartEvent | undefined {
  const starts = events.filter(
    (e): e is MachineStageStartEvent =>
      e.type === 'MACHINE_STAGE' && e.phase === 'start' && e.trialId === trialId && e.label === label
  )
  const closedStartSeqs = new Set(
    events
      .filter(
        (e): e is MachineStageEndEvent =>
          e.type === 'MACHINE_STAGE' && e.phase === 'end' && e.trialId === trialId && e.label === label
      )
      .map((e) => e.matchedStartSeq)
  )
  return starts.filter((s) => !closedStartSeqs.has(s.seq)).at(-1)
}

function findDanglingStageLabels(events: BenchmarkEvent[], trialId: string): string[] {
  const starts = events.filter(
    (e): e is MachineStageStartEvent => e.type === 'MACHINE_STAGE' && e.phase === 'start' && e.trialId === trialId
  )
  const labels = Array.from(new Set(starts.map((s) => s.label)))
  return labels.filter((label) => findOpenStage(events, trialId, label) !== undefined)
}

export function startMachineStage(
  ledgerPath: string,
  trialId: string,
  label: string,
  provenance: string
): MachineStageStartEvent {
  requireNonEmpty(trialId, 'trialId')
  requireNonEmpty(label, 'label')
  requireNonEmpty(provenance, 'provenance')
  requireTrialOpen(ledgerPath, trialId)
  const events = readEvents(ledgerPath)
  if (findOpenStage(events, trialId, label)) {
    throw new Error(
      `FAIL CLOSED: MACHINE_STAGE "${label}" is already open for trial "${trialId}" -- end or fail it before starting again`
    )
  }
  const event: MachineStageStartEvent = {
    type: 'MACHINE_STAGE',
    phase: 'start',
    trialId,
    label,
    ts: nowIso(),
    seq: nextSeq(ledgerPath),
    provenance,
  }
  appendEventRaw(ledgerPath, event)
  return event
}

function endMachineStageInternal(
  ledgerPath: string,
  trialId: string,
  label: string,
  provenance: string,
  status: 'completed' | 'failed'
): MachineStageEndEvent {
  requireNonEmpty(trialId, 'trialId')
  requireNonEmpty(label, 'label')
  requireNonEmpty(provenance, 'provenance')
  requireTrialOpen(ledgerPath, trialId)
  const events = readEvents(ledgerPath)
  const openStart = findOpenStage(events, trialId, label)
  if (!openStart) {
    throw new Error(
      `FAIL CLOSED: no open MACHINE_STAGE "${label}" found for trial "${trialId}" -- cannot record an end/fail without a real matching start (a completed duration is never fabricated)`
    )
  }
  const endTs = nowIso()
  const durationSeconds = (Date.parse(endTs) - Date.parse(openStart.ts)) / 1000
  if (durationSeconds < 0) {
    throw new Error(
      `FAIL CLOSED: computed negative duration for stage "${label}" (end before start) -- refusing to record`
    )
  }
  const event: MachineStageEndEvent = {
    type: 'MACHINE_STAGE',
    phase: 'end',
    trialId,
    label,
    ts: endTs,
    seq: nextSeq(ledgerPath),
    provenance,
    status,
    timing: 'measured',
    matchedStartSeq: openStart.seq,
    durationSeconds,
  }
  appendEventRaw(ledgerPath, event)
  return event
}

export function endMachineStage(
  ledgerPath: string,
  trialId: string,
  label: string,
  provenance: string
): MachineStageEndEvent {
  return endMachineStageInternal(ledgerPath, trialId, label, provenance, 'completed')
}

export function failMachineStage(
  ledgerPath: string,
  trialId: string,
  label: string,
  provenance: string
): MachineStageEndEvent {
  return endMachineStageInternal(ledgerPath, trialId, label, provenance, 'failed')
}

// ---------------------------------------------------------------------------
// ARCHITECTURE_DISCOVERY / PROCESS_FRICTION
// ---------------------------------------------------------------------------

export function recordArchitectureDiscovery(
  ledgerPath: string,
  trialId: string,
  provenance: string,
  note: string
): ArchitectureDiscoveryEvent {
  requireNonEmpty(trialId, 'trialId')
  requireNonEmpty(provenance, 'provenance')
  requireNonEmpty(note, 'note (required for ARCHITECTURE_DISCOVERY: what was discovered)')
  validateNote(note)
  requireTrialOpen(ledgerPath, trialId)
  const event: ArchitectureDiscoveryEvent = {
    type: 'ARCHITECTURE_DISCOVERY',
    trialId,
    ts: nowIso(),
    seq: nextSeq(ledgerPath),
    provenance,
    note,
  }
  appendEventRaw(ledgerPath, event)
  return event
}

export function recordProcessFriction(
  ledgerPath: string,
  trialId: string,
  provenance: string,
  note: string
): ProcessFrictionEvent {
  requireNonEmpty(trialId, 'trialId')
  requireNonEmpty(provenance, 'provenance')
  requireNonEmpty(note, 'note (required for PROCESS_FRICTION: what happened)')
  validateNote(note)
  requireTrialOpen(ledgerPath, trialId)
  const event: ProcessFrictionEvent = {
    type: 'PROCESS_FRICTION',
    trialId,
    ts: nowIso(),
    seq: nextSeq(ledgerPath),
    provenance,
    note,
  }
  appendEventRaw(ledgerPath, event)
  return event
}

/** Default repository-local ledger path for a given trial ID. Callers may override with an explicit path. */
export function defaultLedgerPath(trialId: string): string {
  const repoRoot = path.resolve(__dirname, '../../../..')
  return path.join(repoRoot, '06_Operations/institutional-knowledge/lk-benchmark', `${trialId}.jsonl`)
}
