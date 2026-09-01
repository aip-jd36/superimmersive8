/**
 * Prospective Living Knowledge benchmark event taxonomy (LK-68; measurement
 * semantics corrected LK-82).
 *
 * This module defines the durable event shapes used to record onboarding
 * benchmark activity going forward (starting with Trial 4). It is pure
 * measurement infrastructure: it has no import relationship with, and no
 * influence over, Living Knowledge / Retrieval / Bounded Interpretation /
 * Composition / questioning / Track A/B/C. See
 * __tests__/lk-benchmark/architecture-isolation.test.ts for the enforced
 * boundary.
 *
 * LK-82 CORRECTION (Trial 4 finding): `MACHINE_STAGE` (LK-68) brackets the
 * wall-clock interval between two SEPARATE, operator-issued CLI invocations
 * (`stage-start` then, later, `stage-end`/`stage-fail`). Nothing in that
 * mechanism owns or observes what happens between the two invocations --
 * the interval may contain real work, human review, model/network waiting,
 * or an operator simply being away. It was never actual bounded-process
 * execution, and per this correction it is NEVER reported as "measured
 * machine execution" -- only as a BRACKETED ELAPSED interval. This event
 * type, its stored shape, and its historical data (e.g.
 * 06_Operations/institutional-knowledge/lk-benchmark/LK-TRIAL-4.jsonl) are
 * preserved completely unchanged for backward compatibility and historical
 * immutability -- only how summary.ts INTERPRETS AND LABELS it changed.
 *
 * `MACHINE_EXECUTION` (new, LK-82) is the only event type whose duration may
 * honestly be called measured machine execution: a single CLI invocation
 * spawns a bounded subprocess itself, owns the interval from immediately
 * before spawn to immediately after exit, and records one atomic event --
 * no operator-mediated gap can enter the measured interval. See
 * `recordMachineExecution` in ledger.ts.
 *
 * `PROCESS_WAIT` / `OPERATOR_UNAVAILABLE` / `UNMEASURED_WORK` (new, LK-82)
 * are explicit, operator-recorded, NO-DURATION qualitative markers -- they
 * exist so a real, known interval-shaping fact (an external/process wait, an
 * operator-absence gap, a known-but-untimed piece of material work) can be
 * made visible in the ledger without ever fabricating a duration for it or
 * folding it into any numeric total. Deliberately symmetric with the
 * pre-existing PROCESS_FRICTION/ARCHITECTURE_DISCOVERY shape (required
 * non-empty `note`, no duration field) -- not a residual bucket, and never
 * auto-inferred from unexplained elapsed time. An interval this milestone's
 * caller does not explicitly mark with one of these three event types simply
 * remains unexplained; see summary.ts's own UNMEASURED/UNCLASSIFIED
 * disclaimer.
 *
 * NOTE_GOVERNANCE_DISCLAIMER: recording a HUMAN_REVIEW_TURN,
 * ARCHITECTURE_DISCOVERY, or PROCESS_FRICTION event -- including its `note`
 * field -- never constitutes, infers, or records a governance decision. The
 * actual decision (FGR ADOPT/REVISE/REJECT, CPR APPROVE/WITHHOLD/REVISE/STOP)
 * lives only in its own governance artifact
 * (06_Operations/institutional-knowledge/notebook/governance-reviews/).
 * `note` and `provenance` here are benchmark-purpose descriptive labels only.
 * The same disclaimer applies to the three new LK-82 qualitative markers.
 */

export const BENCHMARK_EVENT_TYPES = [
  'TRIAL_START',
  'MACHINE_STAGE',
  'MACHINE_EXECUTION',
  'HUMAN_REVIEW_TURN',
  'MANUAL_ORCHESTRATION_HANDOFF',
  'ARCHITECTURE_DISCOVERY',
  'PROCESS_FRICTION',
  'PROCESS_WAIT',
  'OPERATOR_UNAVAILABLE',
  'UNMEASURED_WORK',
  'TRIAL_END',
] as const

export type BenchmarkEventType = (typeof BENCHMARK_EVENT_TYPES)[number]

export function isBenchmarkEventType(value: unknown): value is BenchmarkEventType {
  return typeof value === 'string' && (BENCHMARK_EVENT_TYPES as readonly string[]).includes(value)
}

/** Established benchmark convention (Trial 1-3) -- not caller-overridable. */
export const HRT_MODELLED_SECONDS = 60
/** Established benchmark convention (Trial 1-3) -- not caller-overridable. */
export const HANDOFF_MODELLED_SECONDS = 15

export const MAX_NOTE_LENGTH = 200

/**
 * `'measured'` -- genuine, benchmark-process-owned execution duration (LK-82
 * `MACHINE_EXECUTION` only). `'modelled'` -- HRT/handoff planning-assumption
 * seconds. `'bracketed'` -- LK-68/82 legacy `MACHINE_STAGE` two-invocation
 * elapsed interval, never execution-verified. `'unmeasured'` -- reserved for
 * a future defensible-but-not-yet-implemented case; not currently produced
 * by any event in this module.
 */
export type TimingKind = 'measured' | 'modelled' | 'bracketed' | 'unmeasured'

interface BenchmarkEventBase {
  trialId: string
  /** ISO 8601. Always machine-captured "now" at record time -- never caller-suppliable, so a duration can never be backdated or reconstructed from memory. */
  ts: string
  /** Monotonic within one ledger file, assigned by the ledger writer. */
  seq: number
  /** Free-text description of who/what supplied this event (e.g. "PM message", "CLI operator", "self-dogfood"). Descriptive only -- never used for branching logic. */
  provenance: string
  /** Bounded free-text benchmark label. See NOTE_GOVERNANCE_DISCLAIMER above -- never a governance record. */
  note?: string
}

export interface TrialStartEvent extends BenchmarkEventBase {
  type: 'TRIAL_START'
}

export interface TrialEndEvent extends BenchmarkEventBase {
  type: 'TRIAL_END'
}

export interface HumanReviewTurnEvent extends BenchmarkEventBase {
  type: 'HUMAN_REVIEW_TURN'
  timing: 'modelled'
  modelledSeconds: 60
}

export interface ManualOrchestrationHandoffEvent extends BenchmarkEventBase {
  type: 'MANUAL_ORCHESTRATION_HANDOFF'
  timing: 'modelled'
  modelledSeconds: 15
}

export interface MachineStageStartEvent extends BenchmarkEventBase {
  type: 'MACHINE_STAGE'
  phase: 'start'
  label: string
}

/**
 * `timing: 'bracketed'` (LK-82, renamed from the original LK-68 `'measured'`
 * literal -- see this module's own header for why). ONLY the literal string
 * stored in NEW events written from this point forward changes; every byte
 * already on disk in an existing ledger (e.g. Trial 4's own
 * `"timing":"measured"` entries) is never rewritten and remains exactly as
 * written -- `readEvents()` performs no runtime schema validation on this
 * field (a plain `JSON.parse` + type cast), so old ledgers keep parsing
 * identically regardless of this type's own current literal value.
 */
export interface MachineStageEndEvent extends BenchmarkEventBase {
  type: 'MACHINE_STAGE'
  phase: 'end'
  label: string
  status: 'completed' | 'failed'
  timing: 'bracketed'
  /** seq of the MachineStageStartEvent this end/fail closes. Required -- an end/fail can never exist without a real matched start. */
  matchedStartSeq: number
  /** Computed only from real (endTs - startTs) between the two separately-issued CLI invocations. Never estimated -- but never call this "measured machine execution" either; see this module's own header. */
  durationSeconds: number
}

/**
 * LK-82: the one event type whose duration may honestly be reported as
 * measured machine execution. A single `machine-execution` CLI invocation
 * spawns the bounded subprocess itself (see `recordMachineExecution`,
 * ledger.ts), owns the interval from immediately before spawn to
 * immediately after exit, and appends exactly one atomic event -- there is
 * no second, separately-issued CLI invocation for an operator-mediated gap
 * to hide inside. `command` is stored for audit/provenance only, never
 * re-executed by any reader.
 */
export interface MachineExecutionEvent extends BenchmarkEventBase {
  type: 'MACHINE_EXECUTION'
  label: string
  timing: 'measured'
  status: 'completed' | 'failed'
  /** Computed only from real (endTs - startTs) directly around the owned subprocess call. Never estimated, never recorded if the subprocess never actually started (see ledger.ts's own fail-closed handling). */
  durationSeconds: number
  /** Process exit code. `null` only when the process was terminated by signal -- never fabricated as 0. */
  exitCode: number | null
  /** The exact argv the benchmark process spawned (command + args, no shell interpolation) -- audit/provenance only. */
  command: string[]
}

export interface ArchitectureDiscoveryEvent extends BenchmarkEventBase {
  type: 'ARCHITECTURE_DISCOVERY'
  /** Required (non-empty): what was discovered and why it is architectural. Caller-supplied, already-decided -- this module does not classify anything. */
  note: string
}

export interface ProcessFrictionEvent extends BenchmarkEventBase {
  type: 'PROCESS_FRICTION'
  /** Required (non-empty). Caller-supplied, already-decided -- this module does not classify anything. */
  note: string
}

/**
 * LK-82: explicit, operator-recorded external/process latency (e.g.
 * "waiting for Vercel deployment to finish building"). Deliberately carries
 * no duration field -- see this module's own header for why a residual
 * "waiting" bucket is never inferred or quantified automatically.
 */
export interface ProcessWaitEvent extends BenchmarkEventBase {
  type: 'PROCESS_WAIT'
  /** Required (non-empty): what was being waited on. Caller-supplied, already-decided -- this module does not classify anything. */
  note: string
}

/**
 * LK-82: explicit, operator-recorded gap where the operator was not
 * actively progressing the trial. Never auto-inferred from a timestamp gap
 * between events -- this is not human labor, and no duration is recorded.
 */
export interface OperatorUnavailableEvent extends BenchmarkEventBase {
  type: 'OPERATOR_UNAVAILABLE'
  /** Required (non-empty): what the gap was / why. Caller-supplied, already-decided -- this module does not classify anything. */
  note: string
}

/**
 * LK-82: explicit acknowledgment of known material work for which the
 * instrumentation has no defensible measurement or classification. No
 * duration is recorded -- recording this event makes the gap VISIBLE, it
 * does not quantify it.
 */
export interface UnmeasuredWorkEvent extends BenchmarkEventBase {
  type: 'UNMEASURED_WORK'
  /** Required (non-empty): what the unmeasured work was. Caller-supplied, already-decided -- this module does not classify anything. */
  note: string
}

export type BenchmarkEvent =
  | TrialStartEvent
  | TrialEndEvent
  | HumanReviewTurnEvent
  | ManualOrchestrationHandoffEvent
  | MachineStageStartEvent
  | MachineStageEndEvent
  | MachineExecutionEvent
  | ArchitectureDiscoveryEvent
  | ProcessFrictionEvent
  | ProcessWaitEvent
  | OperatorUnavailableEvent
  | UnmeasuredWorkEvent
