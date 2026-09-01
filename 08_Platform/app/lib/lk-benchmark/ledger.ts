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
import { spawnSync } from 'child_process'
import {
  BenchmarkEvent,
  ArchitectureDiscoveryEvent,
  HANDOFF_MODELLED_SECONDS,
  HRT_MODELLED_SECONDS,
  HumanReviewTurnEvent,
  MachineExecutionEvent,
  MachineStageEndEvent,
  MachineStageStartEvent,
  ManualOrchestrationHandoffEvent,
  MAX_NOTE_LENGTH,
  OperatorUnavailableEvent,
  ProcessFrictionEvent,
  ProcessWaitEvent,
  TrialEndEvent,
  TrialStartEvent,
  UnmeasuredWorkEvent,
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
    timing: 'bracketed',
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
// MACHINE_EXECUTION (LK-82) -- benchmark-process-owned subprocess execution,
// the only event type whose duration may honestly be called measured
// machine execution. Unlike MACHINE_STAGE, this is a SINGLE call that spawns
// the bounded subprocess itself and owns the entire interval -- there is no
// second, separately-issued CLI invocation for an operator-mediated gap to
// hide inside.
// ---------------------------------------------------------------------------

/**
 * Spawns `command` (argv array -- `command[0]` is the executable, the rest
 * are literal arguments) as a real child process, with `shell: false`
 * (explicit, not merely the default) so no argument is ever interpolated
 * into a shell string -- eliminates shell-injection-prone construction by
 * construction, not by sanitization. Records start/end timestamps
 * immediately around the `spawnSync` call and appends exactly one atomic
 * event once the process has genuinely exited.
 *
 * Fail-closed, per this module's own established discipline: if the process
 * never actually started (`result.error` set -- e.g. ENOENT, EACCES), this
 * throws WITHOUT appending anything. There is no defensible duration to
 * record for a process that never ran, so none is invented -- exactly
 * "UNMEASURED is preferable to MEASURED" (LK-82 fail-closed measurement
 * principle). A process that DID start and exit -- whether with a zero or
 * non-zero exit code, or terminated by signal -- has a genuinely measured,
 * real duration, so it IS recorded: `status: 'completed'` only for exit code
 * 0, `'failed'` otherwise (including signal termination, where `exitCode` is
 * `null`, never fabricated as 0).
 */
export function recordMachineExecution(
  ledgerPath: string,
  trialId: string,
  label: string,
  provenance: string,
  command: string[]
): MachineExecutionEvent {
  requireNonEmpty(trialId, 'trialId')
  requireNonEmpty(label, 'label')
  requireNonEmpty(provenance, 'provenance')
  if (command.length === 0 || !command[0] || command[0].trim().length === 0) {
    throw new Error('FAIL CLOSED: command must be a non-empty argv array with a non-empty executable as command[0]')
  }
  requireTrialOpen(ledgerPath, trialId)

  const startMs = Date.now()
  const result = spawnSync(command[0], command.slice(1), { stdio: 'inherit', shell: false })
  const endTs = nowIso()
  const durationSeconds = (Date.now() - startMs) / 1000

  if (result.error) {
    throw new Error(
      `FAIL CLOSED: MACHINE_EXECUTION "${label}" never actually started (${result.error.message}) -- refusing to record a duration for a process that never ran`
    )
  }

  const exitCode = result.status
  const status: 'completed' | 'failed' = exitCode === 0 ? 'completed' : 'failed'

  const event: MachineExecutionEvent = {
    type: 'MACHINE_EXECUTION',
    trialId,
    label,
    ts: endTs,
    seq: nextSeq(ledgerPath),
    provenance,
    timing: 'measured',
    status,
    durationSeconds,
    exitCode,
    command,
  }
  appendEventRaw(ledgerPath, event)
  return event
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

// ---------------------------------------------------------------------------
// PROCESS_WAIT / OPERATOR_UNAVAILABLE / UNMEASURED_WORK (LK-82) -- explicit,
// operator-recorded, no-duration qualitative markers. Same shape and
// discipline as ARCHITECTURE_DISCOVERY/PROCESS_FRICTION above: a required
// non-empty note, no duration field, no classification performed by this
// module. Never auto-inferred from a timestamp gap -- see types.ts's own
// header comment.
// ---------------------------------------------------------------------------

export function recordProcessWait(ledgerPath: string, trialId: string, provenance: string, note: string): ProcessWaitEvent {
  requireNonEmpty(trialId, 'trialId')
  requireNonEmpty(provenance, 'provenance')
  requireNonEmpty(note, 'note (required for PROCESS_WAIT: what was being waited on)')
  validateNote(note)
  requireTrialOpen(ledgerPath, trialId)
  const event: ProcessWaitEvent = {
    type: 'PROCESS_WAIT',
    trialId,
    ts: nowIso(),
    seq: nextSeq(ledgerPath),
    provenance,
    note,
  }
  appendEventRaw(ledgerPath, event)
  return event
}

export function recordOperatorUnavailable(ledgerPath: string, trialId: string, provenance: string, note: string): OperatorUnavailableEvent {
  requireNonEmpty(trialId, 'trialId')
  requireNonEmpty(provenance, 'provenance')
  requireNonEmpty(note, 'note (required for OPERATOR_UNAVAILABLE: what the gap was / why)')
  validateNote(note)
  requireTrialOpen(ledgerPath, trialId)
  const event: OperatorUnavailableEvent = {
    type: 'OPERATOR_UNAVAILABLE',
    trialId,
    ts: nowIso(),
    seq: nextSeq(ledgerPath),
    provenance,
    note,
  }
  appendEventRaw(ledgerPath, event)
  return event
}

export function recordUnmeasuredWork(ledgerPath: string, trialId: string, provenance: string, note: string): UnmeasuredWorkEvent {
  requireNonEmpty(trialId, 'trialId')
  requireNonEmpty(provenance, 'provenance')
  requireNonEmpty(note, 'note (required for UNMEASURED_WORK: what the unmeasured work was)')
  validateNote(note)
  requireTrialOpen(ledgerPath, trialId)
  const event: UnmeasuredWorkEvent = {
    type: 'UNMEASURED_WORK',
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
