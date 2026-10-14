/**
 * Observational per-turn model-call latency instrumentation (CRC-LATENCY-2,
 * 2026-10-14), implementing the measurement-only follow-up to CRC-LATENCY-1's
 * read-only diagnostic (which established CRC has no persisted Production
 * turn-latency measurement of any kind).
 *
 * Writes to its own dedicated crc_turn_timings table -- deliberately NOT
 * the existing CRC-PILOT-OBS-3 trace table (that table is provenance --
 * "what the CRC pipeline computed" -- and this milestone's governing
 * instructions were explicit that mixing performance telemetry into it
 * would confuse the two concerns). Same fail-open discipline as
 * turn-traces.ts's recordCrcCompletionTrace/recordCrcExtractionTrace: this
 * module never throws to its caller, and a telemetry failure must never
 * become a new failure mode for the turn it describes.
 *
 * OBSERVATIONAL ONLY -- this module:
 *   - never calls an Anthropic client itself;
 *   - never constructs, mutates, or returns a model input/output;
 *   - never changes retry decisions, timeouts, candidate ordering, question
 *     selection, or any StructuredUnderstanding/boundary-state value;
 *   - never persists user message text, model prompts, model responses,
 *     CandidateObservation content, CandidateQuestionProposal text,
 *     StructuredUnderstanding, RetrievalResult, Bounded Interpretation
 *     content, or any rendered CRC answer. ModelCallObservation below is the
 *     ONLY shape this module ever persists for a model call, and it is
 *     fixed to role/sequence/physical_attempt/is_recovery_retry/elapsed_ms.
 *
 * How it observes a physical model call, without touching retry logic: each
 * of the three Anthropic adapters (anthropic-extractor.ts,
 * anthropic-candidate-question.ts, anthropic-decision.ts) already computes
 * and reports its own per-physical-attempt elapsed_ms via an existing,
 * injectable `successTelemetrySink` parameter on their shared
 * callWithOneRecoveryRetry / callWithStructuredOutputRecoveryRetry helpers
 * (built for the P0 timeout diagnostic follow-up, 2026-08-21) -- that sink
 * already fires with {attempt: 1 | 2, elapsed_ms, ...} exactly once per
 * SUCCESSFUL physical call, console-only by default. TurnTimingCollector
 * below is consumed by a small sink-builder (recordingSuccessSink) passed
 * into each adapter factory's new, additive `successTelemetrySink` option
 * (see those three files' own CRC-LATENCY-2 header notes) -- this module
 * never computes its own model-call timing and never wraps the Anthropic
 * client or the retry/classification logic itself.
 *
 * KNOWN, DELIBERATE LIMITATION: a physical attempt that FAILS (the rare
 * case -- a classifiable structured-output miss, recovered by the existing
 * one-bounded-retry) has no elapsed_ms in the existing failure-telemetry
 * event shape, so a failed first attempt contributes no observation here
 * (only the eventual successful attempt does, correctly marked
 * is_recovery_retry when it was attempt 2). This under-counts total wall-
 * clock time on the rare retried-then-succeeded call by that one failed
 * attempt's own duration. Accepted for this measurement-only milestone
 * rather than touching anthropic-structured-output-retry.ts's failure-path
 * classification to add it -- see CRC-LATENCY-2's own final report.
 *
 * sequence is a plain 1-based counter over the ORDER calls were observed
 * within one turn -- not a label tied to run-turn.ts's own internal
 * attempt1/attempt2/attempt3/attempt4 terminology, which this module never
 * reads and must not be coupled to (run-turn.ts remains completely
 * unmodified by this milestone). Combined with `role`, the sequence already
 * distinguishes every case this milestone's own requirements list:
 * extraction-only (one 'extractor' observation, nothing else), extraction +
 * forced-candidate decider (two observations, no 'candidate_question_
 * generator' entry at all -- proving the generator was genuinely skipped,
 * not called-and-discarded), extraction + generator + decider (three),
 * multi-attempt candidate cascades (more than three, generator/decider
 * roles repeating), and an application-level recovery retry (an
 * observation with physical_attempt: 2 / is_recovery_retry: true).
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { getRuntimeCommit } from './runtime-metadata'
import type { StructuredOutputSuccessTelemetryEvent } from '@/lib/interview-engine/anthropic-structured-output-retry'
import type { ExtractorSuccessTelemetryEvent } from '@/lib/interview-engine/anthropic-extractor'

export type ModelCallRole = 'extractor' | 'candidate_question_generator' | 'constraint_a_decider'

/**
 * The ONLY shape this module ever persists for one physical model call.
 * Fixed, allowlisted fields -- never a spread of a telemetry event, never
 * prompt/candidate/transcript/user content of any kind.
 */
export interface ModelCallObservation {
  role: ModelCallRole
  /** 1-based order within this turn's own sequence of calls -- see module header. */
  sequence: number
  /** Which physical attempt of that logical call's own bounded recovery retry this was. */
  physical_attempt: 1 | 2
  /** physical_attempt === 2, named explicitly so a reader never has to infer it. */
  is_recovery_retry: boolean
  elapsed_ms: number
}

/**
 * In-memory only, scoped to exactly one request -- constructed fresh by
 * app/api/crc/turn/route.ts for each POST, never shared across requests,
 * never persisted itself (only its final, summarized observations are, via
 * recordCrcTurnTiming below).
 */
export class TurnTimingCollector {
  private readonly calls: ModelCallObservation[] = []
  private counter = 0

  record(role: ModelCallRole, physicalAttempt: 1 | 2, elapsedMs: number): void {
    this.counter += 1
    this.calls.push({
      role,
      sequence: this.counter,
      physical_attempt: physicalAttempt,
      is_recovery_retry: physicalAttempt === 2,
      elapsed_ms: Math.round(elapsedMs),
    })
  }

  modelCalls(): ModelCallObservation[] {
    return this.calls
  }

  modelCallCount(): number {
    return this.calls.length
  }
}

/**
 * Builds a successTelemetrySink for the decider/candidate-generator shared
 * retry helper (anthropic-structured-output-retry.ts) that records into the
 * given collector instead of (or alongside) the module's own
 * console-only default. Reads only {attempt, elapsed_ms} off the event --
 * never anthropic_response_id, never any field that could carry content.
 */
export function recordingSuccessSink(collector: TurnTimingCollector, role: 'candidate_question_generator' | 'constraint_a_decider') {
  return (event: StructuredOutputSuccessTelemetryEvent): void => {
    collector.record(role, event.attempt, event.elapsed_ms)
  }
}

/** Same as recordingSuccessSink above, for the extractor's own separate (but identically-shaped) success-telemetry event type. */
export function recordingExtractorSuccessSink(collector: TurnTimingCollector) {
  return (event: ExtractorSuccessTelemetryEvent): void => {
    collector.record('extractor', event.attempt, event.elapsed_ms)
  }
}

export interface RecordCrcTurnTimingParams {
  sessionId: string
  turnNumber: number
  requestDurationMs: number
  runTurnDurationMs: number
  modelCalls: ModelCallObservation[]
}

/**
 * Fail-open, best-effort persistence -- mirrors recordCrcCompletionTrace/
 * recordCrcExtractionTrace (turn-traces.ts) exactly: never throws, logs and
 * swallows any failure. The authoritative CRC turn has already fully
 * completed and been persisted by the time this is ever called (route.ts
 * calls this last, after every other authoritative and best-effort write) --
 * a failure here can only ever mean "this one turn has no timing
 * measurement," never a altered or failed CRC response.
 */
export async function recordCrcTurnTiming(client: SupabaseClient, params: RecordCrcTurnTimingParams): Promise<void> {
  try {
    const { error } = await client.from('crc_turn_timings').insert({
      session_id: params.sessionId,
      turn_number: params.turnNumber,
      runtime_commit: getRuntimeCommit(),
      request_duration_ms: Math.round(params.requestDurationMs),
      run_turn_duration_ms: Math.round(params.runTurnDurationMs),
      model_call_count: params.modelCalls.length,
      model_calls: params.modelCalls,
    })
    if (error) {
      console.error('[recordCrcTurnTiming] insert error', error)
    }
  } catch (err) {
    console.error('[recordCrcTurnTiming] unexpected failure', err)
  }
}
