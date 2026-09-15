/**
 * CRC observational pipeline trace persistence (CRC-PILOT-OBS-3, Durable
 * Pipeline Trace Implementation -- implements the design closed out by
 * CRC-PILOT-OBS-2 / CRC-PILOT-OBS-2A). Writes to crc_turn_traces --
 * deliberately not part of SupabaseSessionStore or the SessionStore
 * interface, same reasoning as pilot-events.ts: this is diagnostic
 * pipeline-output capture, not engine state, and the engine must remain
 * entirely unaware it exists (see the authority-firewall test).
 *
 * OBSERVATIONAL ONLY. A completion trace means "what the CRC pipeline
 * computed at completion" -- never "what the user saw" (OBS-2A: for a
 * non-grandfathered session, the completing turn displays no substantive
 * answer in the chat UI at all; see complete-response.ts and
 * app/crc/page.tsx). This module never touches crc_sessions.transcript.
 *
 * Faithful persistence, not a reduced DTO: every field below is the exact
 * runtime value CRCPipelineResult already computed (OBS-2A: none of these
 * runtime types carry a large blob field, so there is no storage-driven
 * reason to summarize or trim, and doing so would only introduce a second
 * contract that can drift from the runtime type).
 *
 * recordCrcCompletionTrace() never throws to its caller -- same fail-open,
 * best-effort discipline as logPilotEvent()/logAnalyticsEvent(): a
 * transient failure to write a trace row must never become a new,
 * unhandled failure mode for the actual completing turn it's describing,
 * and must never change the CRC conclusion or the user-visible response.
 *
 * turnNumber (CRC-PILOT-OBS-3A pre-push correction): the exact `turnNumber`
 * value app/api/crc/turn/route.ts's POST handler already computes for the
 * current request (RunTurnInput.turnNumber, the same value threaded into
 * runTurn()) -- not re-read from crc_sessions.turn_count, which can lag one
 * turn behind for the product-layer turn-ceiling stop path (that branch
 * never calls saveCrcSessionProductState). Required, not optional: it is
 * the identity component that lets crc_turn_traces remain a genuinely
 * generic sibling table -- see the migration's own "UNIQUENESS" header for
 * why UNIQUE(session_id, trace_kind) alone would have blocked a future
 * trace_kind = 'question' (multiple rows per session, one per accepted
 * question) from ever sharing this table.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { CRCPipelineResult } from './run-crc-conversation'
import { getRuntimeCommit } from './runtime-metadata'

export const TRACE_SCHEMA_VERSION = 1

export type TraceKind = 'completion'

/**
 * Mirrors CRCPipelineResult's own completion fields exactly (see that
 * module's header for why each is faithful, not reduced) -- this is a type
 * alias over the subset of CRCPipelineResult this table's `payload` column
 * stores, not an independent shape a future CRCPipelineResult change could
 * silently drift from.
 */
export type CrcCompletionTracePayload = Pick<
  CRCPipelineResult,
  | 'structured_understanding'
  | 'output'
  | 'plan'
  | 'bounded_interpretations'
  | 'consultative_notes'
  | 'discovered_topic_occurrences'
> & {
  retrieval_results: CRCPipelineResult['trace']['retrieval_results']
  retrieval_diagnostics: CRCPipelineResult['diagnostics']['retrieval']
}

function buildCompletionPayload(result: CRCPipelineResult): CrcCompletionTracePayload {
  return {
    structured_understanding: result.structured_understanding,
    output: result.output,
    plan: result.plan,
    bounded_interpretations: result.bounded_interpretations,
    consultative_notes: result.consultative_notes,
    discovered_topic_occurrences: result.discovered_topic_occurrences,
    retrieval_results: result.trace.retrieval_results,
    retrieval_diagnostics: result.diagnostics.retrieval,
  }
}

export interface RecordCrcCompletionTraceParams {
  sessionId: string
  turnNumber: number
  result: CRCPipelineResult
}

/**
 * Writes exactly one crc_turn_traces row with trace_kind = 'completion'.
 * Callers are responsible for calling this ONLY at a genuine first-
 * completion point (never a recomputation/rehydration/resend of an
 * already-completed session) -- see app/api/crc/turn/route.ts's own
 * `wasAlreadyComplete` gate and the crc_turn_traces_session_turn_kind_unique
 * constraint, which is the backstop for a concurrent duplicate attempt this
 * application-level gate alone cannot fully rule out. A unique-violation
 * from a genuine race is expected and swallowed the same as any other
 * write failure -- it means a trace already exists for this completion,
 * which is the correct outcome, not an error to surface.
 */
export async function recordCrcCompletionTrace(client: SupabaseClient, params: RecordCrcCompletionTraceParams): Promise<void> {
  try {
    const { error } = await client.from('crc_turn_traces').insert({
      session_id: params.sessionId,
      turn_number: params.turnNumber,
      trace_kind: 'completion' satisfies TraceKind,
      runtime_commit: getRuntimeCommit(),
      trace_schema_version: TRACE_SCHEMA_VERSION,
      payload: buildCompletionPayload(params.result),
    })
    if (error) {
      console.error('[recordCrcCompletionTrace] insert error', error)
    }
  } catch (err) {
    console.error('[recordCrcCompletionTrace] unexpected failure', err)
  }
}
