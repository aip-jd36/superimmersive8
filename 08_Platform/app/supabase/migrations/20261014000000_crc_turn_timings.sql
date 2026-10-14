-- Migration: crc_turn_timings -- observational per-turn latency telemetry
-- Date: 2026-10-14
--
-- CRC-LATENCY-2, implementing the measurement-only follow-up CRC-LATENCY-1's
-- read-only diagnostic recommended (that diagnostic established CRC has no
-- persisted Production turn-latency measurement of any kind -- see
-- CRC_CURRENT_STATE.md / that diagnostic's own report for the full evidence
-- trail).
--
-- PURPOSE: durably record, for each ordinary conversational CRC turn, the
-- total server-side processing duration, the total runTurn() duration, and a
-- per-physical-model-call timing breakdown (role, sequence within the turn,
-- which physical attempt of that call's own bounded recovery retry, and
-- elapsed_ms) -- so CRC-LATENCY-1's architecture-inferred latency hypotheses
-- can be checked against real measured data before any optimization is
-- proposed.
--
-- DELIBERATELY A SEPARATE TABLE FROM crc_turn_traces: that table is
-- provenance (what the CRC pipeline computed), explicitly never performance
-- telemetry (see its own migration's header). This milestone's governing
-- instructions were explicit that overloading it here would confuse the two
-- concerns. crc_turn_timings is sibling infrastructure, same posture, same
-- fail-open discipline, never read by any CRC runtime module.
--
-- OBSERVATIONAL ONLY, FAIL-OPEN: a row here describes a turn; it never
-- influences one. lib/crc-engine/turn-timing.ts's own recordCrcTurnTiming()
-- never throws to its caller, mirroring recordCrcCompletionTrace/
-- recordCrcExtractionTrace's existing discipline exactly.
--
-- CONTENT MINIMIZATION (hard requirement, not a style choice): no user
-- message text, no model prompts, no model responses, no CandidateObservation
-- content, no CandidateQuestionProposal text, no StructuredUnderstanding, no
-- RetrievalResult, no Bounded Interpretation content, no rendered CRC answer
-- is ever persisted here, by construction -- see turn-timing.ts's own
-- ModelCallObservation type, which carries only {role, sequence,
-- physical_attempt, is_recovery_retry, elapsed_ms}.
--
-- GENERIC, ONE-ROW-PER-TURN SHAPE: the per-call breakdown lives in one JSONB
-- array column (model_calls) on the same row as the turn summary, rather than
-- a second per-call child table -- deliberately, so persisting a turn's
-- complete timing picture costs exactly one INSERT, not N+1, keeping the
-- telemetry write itself a negligible, single additional round trip rather
-- than a second source of latency variance on the very path being measured.
--
-- session_id is a real FK, same reasoning as crc_turn_traces.session_id: a
-- timing row can only ever be written for a session that has already been
-- successfully, authoritatively saved by the CRC engine this same turn.
--
-- turn_number is the exact in-memory `turnNumber` value
-- app/api/crc/turn/route.ts's POST handler already computes for the current
-- request -- the same value already threaded into runTurn() and into
-- crc_turn_traces -- not re-derived, not a new concept.
--
-- UNIQUE (session_id, turn_number): one timing row per genuinely-processed
-- ordinary turn. A request that fails before this telemetry write is reached
-- (runTurn() throws, persistence fails) simply produces no row -- the
-- correct, honest behavior; this migration never backfills or reconstructs a
-- missing measurement.

-- =============================================
-- UP
-- =============================================

CREATE TABLE IF NOT EXISTS crc_turn_timings (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id             UUID NOT NULL REFERENCES crc_sessions(id),
  turn_number            INTEGER NOT NULL,
  runtime_commit         TEXT NOT NULL,
  -- Total server/request processing duration for this conversational
  -- request -- see turn-timing.ts's own header for the EXACT start/end
  -- boundary this measures (top of the POST handler through immediately
  -- before this telemetry write itself).
  request_duration_ms    INTEGER NOT NULL,
  -- Total duration of the single `await runTurn(...)` call this turn.
  run_turn_duration_ms   INTEGER NOT NULL,
  -- Count of physical model-call observations in model_calls below --
  -- denormalized for cheap aggregate querying without unnesting the JSONB
  -- array every time.
  model_call_count       INTEGER NOT NULL,
  -- ModelCallObservation[] -- role/sequence/physical_attempt/
  -- is_recovery_retry/elapsed_ms only. See turn-timing.ts.
  model_calls            JSONB NOT NULL,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS crc_turn_timings_session_id_idx
  ON crc_turn_timings (session_id);

ALTER TABLE crc_turn_timings
  ADD CONSTRAINT crc_turn_timings_session_turn_unique
  UNIQUE (session_id, turn_number);

ALTER TABLE crc_turn_timings ENABLE ROW LEVEL SECURITY;
-- Same posture as crc_turn_traces / crc_sessions: RLS enabled, ZERO
-- policies, service_role only via supabaseAdmin. No client-facing read
-- path of any kind -- never rendered, never emailed, never returned in any
-- API response.
GRANT ALL ON public.crc_turn_timings TO service_role;

-- =============================================
-- DOWN (rollback)
-- =============================================
-- ALTER TABLE crc_turn_timings DROP CONSTRAINT IF EXISTS crc_turn_timings_session_turn_unique;
-- DROP INDEX IF EXISTS crc_turn_timings_session_id_idx;
-- DROP TABLE IF EXISTS crc_turn_timings;
