/**
 * Prospective Living Knowledge benchmark event taxonomy (LK-68).
 *
 * This module defines the durable event shapes used to record onboarding
 * benchmark activity going forward (starting with Trial 4). It is pure
 * measurement infrastructure: it has no import relationship with, and no
 * influence over, Living Knowledge / Retrieval / Bounded Interpretation /
 * Composition / questioning / Track A/B/C. See
 * __tests__/lk-benchmark/architecture-isolation.test.ts for the enforced
 * boundary.
 *
 * NOTE_GOVERNANCE_DISCLAIMER: recording a HUMAN_REVIEW_TURN,
 * ARCHITECTURE_DISCOVERY, or PROCESS_FRICTION event -- including its `note`
 * field -- never constitutes, infers, or records a governance decision. The
 * actual decision (FGR ADOPT/REVISE/REJECT, CPR APPROVE/WITHHOLD/REVISE/STOP)
 * lives only in its own governance artifact
 * (06_Operations/institutional-knowledge/notebook/governance-reviews/).
 * `note` and `provenance` here are benchmark-purpose descriptive labels only.
 */

export const BENCHMARK_EVENT_TYPES = [
  'TRIAL_START',
  'MACHINE_STAGE',
  'HUMAN_REVIEW_TURN',
  'MANUAL_ORCHESTRATION_HANDOFF',
  'ARCHITECTURE_DISCOVERY',
  'PROCESS_FRICTION',
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

export type TimingKind = 'measured' | 'modelled' | 'unmeasured'

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

export interface MachineStageEndEvent extends BenchmarkEventBase {
  type: 'MACHINE_STAGE'
  phase: 'end'
  label: string
  status: 'completed' | 'failed'
  timing: 'measured'
  /** seq of the MachineStageStartEvent this end/fail closes. Required -- an end/fail can never exist without a real matched start. */
  matchedStartSeq: number
  /** Computed only from real (endTs - startTs). Never estimated. */
  durationSeconds: number
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

export type BenchmarkEvent =
  | TrialStartEvent
  | TrialEndEvent
  | HumanReviewTurnEvent
  | ManualOrchestrationHandoffEvent
  | MachineStageStartEvent
  | MachineStageEndEvent
  | ArchitectureDiscoveryEvent
  | ProcessFrictionEvent
