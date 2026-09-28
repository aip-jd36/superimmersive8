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
 *
 * CRC-EXTRACTION-OBS-2 (2026-09-28) adds a second trace_kind, 'extraction'
 * -- exactly the kind of future sibling trace this table's own migration
 * comment anticipated (see 20260915000000_crc_turn_traces.sql's "GENERIC,
 * KIND-KEYED SHAPE" section). Written once per turn (never gated on
 * whether any candidate was actually found -- see buildExtractionTracePayload
 * and recordCrcExtractionTrace's own headers below for why zero candidates
 * is itself a meaningful, persisted value), by the SAME route.ts call site
 * as recordCrcCompletionTrace, but unconditionally rather than only at
 * completion (extraction runs on every turn, not only a completing one).
 * UNLIKE the completion payload, the extraction payload is deliberately
 * NOT a faithful, unreduced projection of the runtime type: ExtractionDiagnostic
 * carries the full CandidateObservation (raw_text, raw_tool_name,
 * raw_provider_name, raw_jurisdiction_value, correction_of_raw_text -- all
 * verbatim user-turn content) plus NormalizationResult/ProposedFact, none
 * of which this milestone's data-minimization requirement permits
 * persisting. buildExtractionTracePayload therefore reads a fixed,
 * explicit allowlist of fields off each ExtractionDiagnostic (candidate
 * kind, proposal_id -- a short model-assigned label like "c1", never raw
 * text, see anthropic-extractor.ts's own CANDIDATE_RESPONSE_SCHEMA --
 * disposition, the existing reason_code verbatim, and applied_identifier,
 * which is always a structural id of the form `t{turn}-{proposal_id}` or a
 * fixed field path like `project_facts.human_contribution_description`,
 * never raw text) rather than persisting the diagnostic objects themselves.
 * See that function's own header for the full field-by-field justification.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { CRCPipelineResult } from './run-crc-conversation'
import { getRuntimeCommit } from './runtime-metadata'
import type { CandidateObservation, ExtractionDiagnostic, DeferredReasonCode, RejectedReasonCode } from '@/lib/interview-engine/extraction'

export const TRACE_SCHEMA_VERSION = 1

export type TraceKind = 'completion' | 'extraction'

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

// ── trace_kind = 'extraction' (CRC-EXTRACTION-OBS-2, 2026-09-28) ───────────

/**
 * One candidate's structural disposition for this turn's own extraction
 * pass -- a fixed, explicit allowlist projection of ExtractionDiagnostic,
 * never the diagnostic object itself. `ordinal` is this candidate's index
 * within the turn's own diagnostics array (stable given a fixed
 * CandidateExtractor output for that turn; exists so two candidates of the
 * SAME kind in one turn -- e.g. two `user_goal` proposals -- remain
 * distinguishable without relying on `proposal_id` alone).
 *
 * Every field here is either (a) a small, extractor-assigned structural
 * label the extractor's own wire schema already constrains to be short and
 * non-descriptive (`proposal_id`, e.g. "c1" -- see
 * anthropic-extractor.ts's CANDIDATE_RESPONSE_SCHEMA), (b) a fixed enum
 * already defined by extraction.ts (`candidate_kind`, `disposition`,
 * `reason_code` -- RejectedReasonCode/DeferredReasonCode, persisted
 * verbatim, never reworded), or (c) a structural identifier extraction.ts
 * itself constructs from turn number + proposal_id or a fixed field path
 * (`applied_identifier`, e.g. "t3-c1" or
 * "project_facts.human_contribution_description") -- never raw user text,
 * never a free-text value, never a confidence score, never a reviewer or
 * model conclusion.
 */
export interface ExtractionTraceCandidatePayload {
  ordinal: number
  proposal_id: string
  candidate_kind: CandidateObservation['kind']
  disposition: ExtractionDiagnostic['decision']['outcome']
  /** Present only for 'rejected'/'deferred' -- the existing RejectedReasonCode/DeferredReasonCode, verbatim. Absent (never fabricated) for 'accepted'. */
  reason_code?: RejectedReasonCode | DeferredReasonCode
  /** Present only for 'accepted' -- the structural identifier the mutation actually applied under (see this interface's own header). */
  applied_identifier?: string
}

export interface ExtractionTracePayload {
  /**
   * Turn-level count, independent of `candidates.length` only in the sense
   * that its PRESENCE (this whole payload existing as a row at all) is what
   * distinguishes "extraction ran, found zero candidates" (a row with
   * `candidate_count: 0` and `candidates: []`) from "no trace for this
   * turn" (no row at all -- either the §7 replay short-circuit, which never
   * calls runExtractionPipeline, or a failed/unavailable write, see
   * recordCrcExtractionTrace's own fail-open discipline below). Always
   * exactly `candidates.length` for a row that was actually written; kept
   * as its own explicit field (rather than requiring a reader to compute
   * `payload.candidates.length`) per this milestone's own design contract.
   */
  candidate_count: number
  candidates: ExtractionTraceCandidatePayload[]
}

/**
 * Reads a fixed, explicit allowlist of fields off each ExtractionDiagnostic
 * -- never spreads or forwards the diagnostic object itself, and never
 * reads `.candidate.raw_text`, `.candidate.raw_tool_name`,
 * `.candidate.raw_provider_name`, `.candidate.raw_jurisdiction_value`,
 * `.candidate.correction_of_raw_text`, `.normalization`, or
 * `.proposed_fact` -- all excluded by design (raw user-turn content,
 * interpreted normalization/attestation detail, or otherwise beyond this
 * milestone's "structural diagnostic metadata only" bound). See
 * ExtractionTraceCandidatePayload's own header for why each retained field
 * is safe to persist.
 */
function buildExtractionTracePayload(diagnostics: ExtractionDiagnostic[]): ExtractionTracePayload {
  return {
    candidate_count: diagnostics.length,
    candidates: diagnostics.map((diagnostic, ordinal) => ({
      ordinal,
      proposal_id: diagnostic.proposal_id,
      candidate_kind: diagnostic.candidate.kind,
      disposition: diagnostic.decision.outcome,
      ...(diagnostic.decision.outcome !== 'accepted' ? { reason_code: diagnostic.decision.reason_code } : {}),
      ...(diagnostic.decision.outcome === 'accepted' ? { applied_identifier: diagnostic.decision.applied_identifier } : {}),
    })),
  }
}

export interface RecordCrcExtractionTraceParams {
  sessionId: string
  turnNumber: number
  diagnostics: ExtractionDiagnostic[]
}

/**
 * Writes exactly one crc_turn_traces row with trace_kind = 'extraction',
 * for EVERY turn that reached extraction this turn -- unlike
 * recordCrcCompletionTrace, there is no "only at a genuine first
 * completion" gate here, because extraction itself is not a once-per-session
 * event: see run-turn.ts's own `extractionDiagnostics` field header for the
 * one case it is never called for (the §7 replay short-circuit, before
 * runExtractionPipeline runs at all).
 *
 * Same fail-open, best-effort discipline as recordCrcCompletionTrace: never
 * throws to its caller, a write failure only ever means a missing trace
 * row, never a changed CRC conclusion or user-visible response. A
 * unique-violation from a genuine concurrent-request race on the same
 * (session_id, turn_number) is expected and swallowed the same way -- see
 * the migration's own UNIQUENESS reasoning (written for 'completion', but
 * the same reasoning applies unchanged to 'extraction': two racing requests
 * that both read the same pre-turn turn_count compute the same turnNumber
 * and correctly collide; a client retry after a server-side success
 * computes a distinct, later turnNumber and never collides).
 */
export async function recordCrcExtractionTrace(client: SupabaseClient, params: RecordCrcExtractionTraceParams): Promise<void> {
  try {
    const { error } = await client.from('crc_turn_traces').insert({
      session_id: params.sessionId,
      turn_number: params.turnNumber,
      trace_kind: 'extraction' satisfies TraceKind,
      runtime_commit: getRuntimeCommit(),
      trace_schema_version: TRACE_SCHEMA_VERSION,
      payload: buildExtractionTracePayload(params.diagnostics),
    })
    if (error) {
      console.error('[recordCrcExtractionTrace] insert error', error)
    }
  } catch (err) {
    console.error('[recordCrcExtractionTrace] unexpected failure', err)
  }
}
