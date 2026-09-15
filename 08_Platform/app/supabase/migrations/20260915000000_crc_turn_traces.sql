-- Migration: crc_turn_traces -- observational CRC pipeline trace table
-- Date: 2026-09-15
--
-- CRC-PILOT-OBS-3 (Durable Pipeline Trace Implementation), implementing the
-- design closed out by CRC-PILOT-OBS-2 / CRC-PILOT-OBS-2A.
--
-- PURPOSE: preserve, for a genuine CRC completion, the structured pipeline
-- outputs the CRC engine already computed (Retrieval results/diagnostics,
-- Bounded Interpretation, Projection, Consultative Composition, Track A
-- discovered-topic occurrences, and the StructuredUnderstanding snapshot the
-- completion was computed from) -- so a poor result can later be diagnosed
-- as arising from Living Knowledge, Retrieval, questioning, Bounded
-- Interpretation, or final composition.
--
-- THIS TABLE IS OBSERVATIONAL ONLY. It is never read by any CRC runtime
-- module (Interview Engine, Retrieval, Bounded Interpretation, Projection,
-- Consultative Composition) -- see
-- __tests__/crc-engine/turn-traces-authority-firewall.test.ts, which proves
-- this the same way __tests__/crc-engine/subsystem-boundaries.test.ts proves
-- the existing subsystem import boundaries.
--
-- OBS-2A CORRECTION (do not misread this table as "what the user saw"):
-- for a non-grandfathered session (every current/future session, see the
-- CRC Results Gate milestone, 2026-08-14) the completing turn does not
-- display a substantive final assistant answer in the chat UI at all -- it
-- moves into the Results Gate. A row in this table means "what the CRC
-- pipeline computed at completion," never "what the user saw." No row here
-- is appended to crc_sessions.transcript, and this migration does not touch
-- crc_sessions.transcript in any way.
--
-- GENERIC, KIND-KEYED SHAPE: `trace_kind` + one `payload` JSONB column,
-- rather than one column per completion-payload field. This milestone only
-- ever writes `trace_kind = 'completion'`, but the table is deliberately
-- shaped as a generic sibling trace surface (mirroring crc_pilot_events'
-- own "one small generic table, not a new one per concern" precedent) so a
-- later, separate milestone can add a differently-shaped `trace_kind =
-- 'question'` row (accepted CandidateQuestionProposal provenance -- see
-- CRC-PILOT-OBS-2's own deferred question-trace proposal) without a second
-- table. Named JSONB sub-columns (crc_sessions' own convention for
-- structured_understanding/boundary_state) were considered and rejected
-- here specifically because a future trace_kind's payload shape is
-- expected to differ entirely from completion's -- a fixed column set
-- would either force nullable completion-only columns for every future
-- kind or force a schema change per kind, defeating the point of a shared
-- sibling table.
--
-- payload for trace_kind = 'completion' (documented here; enforced in
-- TypeScript by lib/crc-engine/turn-traces.ts, not by a JSON-schema CHECK
-- constraint -- consistent with crc_sessions' own structured_understanding/
-- boundary_state columns, which are also JSONB-typed and validated at the
-- application layer, not in SQL):
--   {
--     structured_understanding_snapshot: StructuredUnderstanding,
--     projection_output: ProjectionOutput,
--     consultative_answer_plan: ConsultativeAnswerPlan,
--     bounded_interpretations: BoundedInterpretation[],
--     consultative_notes: ConsultativeNote[],
--     retrieval_results: RetrievalResult[],
--     retrieval_diagnostics: RetrievalDiagnostic[],
--     discovered_topic_occurrences: DiscoveredTopicOccurrence[]
--   }
-- Every field is the exact runtime object CRCPipelineResult already
-- produced for that completion (lib/crc-engine/run-crc-conversation.ts) --
-- no reduced/summarized DTO, no new transformation. See that module's own
-- header for why: OBS-2A found none of these runtime types carry a large
-- blob field, so faithful persistence costs no more than a reduced one
-- while avoiding a second contract that can drift from the runtime type.
--
-- session_id is a real FK, unlike crc_pilot_events.session_id (TEXT,
-- nullable, deliberately not a FK there because a missing_session pilot
-- event is BY DEFINITION a token that does not resolve to any crc_sessions
-- row). A completion trace can only ever be written for a session that has
-- just been successfully, authoritatively saved by the CRC engine -- the
-- row is guaranteed to exist, so a real FK is the correct, tighter
-- constraint here.
--
-- UNIQUENESS: UNIQUE (session_id, turn_number, trace_kind) -- CRC-PILOT-
-- OBS-3A pre-push correction. The original OBS-3 cut of this migration used
-- UNIQUE (session_id, trace_kind), reasoned as follows: completion happens
-- AT MOST ONCE per session (lib/crc-engine/run-turn.ts's own "a completed
-- session never re-enters the loop" completion_reason !== null short-
-- circuit; the product-layer turn-ceiling stop in app/api/crc/turn/route.ts
-- is independently guarded the same way by its own pre-existing
-- product_stop_reason check) -- so for trace_kind = 'completion' alone,
-- (session_id, trace_kind) already correctly rejects a concurrent duplicate
-- write (e.g. two racing POSTs) that the application-level "was this
-- session already complete before this turn" check alone cannot fully rule
-- out. That reasoning was correct as far as it went, but incomplete: this
-- table is deliberately generic (see the header above) specifically so a
-- future trace_kind = 'question' can share it, and a future question trace
-- is expected to legitimately produce MULTIPLE rows per session (one per
-- accepted question, each on its own turn) -- which (session_id, trace_kind)
-- would incorrectly forbid the moment a second question-trace row was ever
-- written for the same session, baking a known incompatibility into the
-- initial schema exactly as flagged in the OBS-3A pre-push review.
--
-- turn_number closes this without speculative generalization: it is not a
-- new concept invented for this table -- it is the exact `turnNumber` value
-- app/api/crc/turn/route.ts's POST handler already computes for every
-- request (`RunTurnInput.turnNumber`, the same value threaded into
-- runTurn() and, for the ordinary completion path, into
-- crc_sessions.turn_count via saveCrcSessionProductState), already in scope
-- at both places this table is written, with zero new computation and zero
-- CRC behavior change. UNIQUE (session_id, turn_number, trace_kind) permits
-- exactly what a future 'question' kind will legitimately need (multiple
-- question-trace rows per session, one per turn) while still correctly
-- preventing a duplicate 'completion' row: a genuine completion happens on
-- one specific turn, and the one real concurrency risk (two requests racing
-- on the same stale pre-completion read) produces two attempts that compute
-- the SAME turn_number from the same stale crc_sessions.turn_count read, so
-- the constraint still correctly serializes/rejects the duplicate. A
-- client-level retry-after-server-success (the response is lost after the
-- first attempt already committed) computes a DIFFERENT, later turn_number
-- on retry, but never reaches this table at all regardless of turn_number:
-- that retry re-enters runTurn()'s own already-complete recovery guard, and
-- app/api/crc/turn/route.ts's application-level `wasAlreadyComplete` check
-- (keyed off structured_understanding.completion_reason, not turn_number)
-- already excludes it upstream of this constraint.
--
-- crc_sessions.turn_count itself (the persisted DB column, as opposed to
-- the in-memory `turnNumber` route.ts already has) is NOT used here as the
-- source of this value, and is not reliable for that purpose in general:
-- the product-layer turn-ceiling stop branch never calls
-- saveCrcSessionProductState, so a later read of crc_sessions.turn_count
-- can lag one turn behind the actual completing request for that path. The
-- in-memory `turnNumber` local variable route.ts already computes for the
-- current request is the correct, already-authoritative source -- see
-- lib/crc-engine/turn-traces.ts's own header.
--
-- runtime_commit + trace_schema_version, not a separate Living Knowledge
-- version field: getRuntimeCommit() (lib/crc-engine/runtime-metadata.ts)
-- already pins the exact code (Interview Engine, Retrieval, Projection,
-- Discovery Catalog, Platform Rights Matrix -- all static, git-committed
-- fixtures) that produced a given result; that module's own header already
-- explains why a single commit SHA is preferred over five hand-maintained
-- version strings. trace_schema_version pins only the shape of THIS
-- table's own payload, independent of application code changes.

-- =============================================
-- UP
-- =============================================

CREATE TABLE IF NOT EXISTS crc_turn_traces (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id             UUID NOT NULL REFERENCES crc_sessions(id),
  turn_number            INTEGER NOT NULL,
  trace_kind             TEXT NOT NULL,
  runtime_commit         TEXT NOT NULL,
  trace_schema_version   INTEGER NOT NULL,
  payload                JSONB NOT NULL,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE crc_turn_traces
  ADD CONSTRAINT crc_turn_traces_trace_kind_values
  CHECK (trace_kind IN ('completion'));

-- See the migration header's own "UNIQUENESS" note above.
ALTER TABLE crc_turn_traces
  ADD CONSTRAINT crc_turn_traces_session_turn_kind_unique
  UNIQUE (session_id, turn_number, trace_kind);

-- Pilot/forensic review queries: "show me the completion trace for this
-- session" (the FK/unique index above already covers session_id lookups
-- efficiently; no separate index needed for that). trace_kind has low
-- cardinality (one value today) so no separate index is added for it either
-- -- add one if/when a second trace_kind makes that query pattern real.

ALTER TABLE crc_turn_traces ENABLE ROW LEVEL SECURITY;
-- No SELECT / INSERT / UPDATE / DELETE policies -- same posture as
-- crc_sessions and crc_pilot_events: RLS enabled with ZERO policies
-- (default-deny for anon/authenticated), service_role only, via
-- supabaseAdmin from app/api/crc/turn/route.ts. This table has no
-- client-facing read path of any kind -- it is not rendered, not emailed,
-- not returned in any API response.
GRANT ALL ON public.crc_turn_traces TO service_role;

-- =============================================
-- DOWN (rollback)
-- =============================================
-- ALTER TABLE crc_turn_traces DROP CONSTRAINT IF EXISTS crc_turn_traces_session_turn_kind_unique;
-- ALTER TABLE crc_turn_traces DROP CONSTRAINT IF EXISTS crc_turn_traces_trace_kind_values;
-- DROP TABLE IF EXISTS crc_turn_traces;
