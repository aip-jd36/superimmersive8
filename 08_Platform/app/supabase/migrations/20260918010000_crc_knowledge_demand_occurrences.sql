-- Migration: crc_knowledge_demand_occurrences -- durable material-demand evidence
-- Date: 2026-09-18
--
-- LK-DEMAND-2C (Durable Material Demand Evidence). Persists the qualified
-- KnowledgeDemandOccurrence records lib/interview-engine/extraction.ts's
-- runExtractionPipeline already computes every turn (LK-DEMAND-2A) but,
-- until this migration, discards -- app/api/crc/turn/route.ts destructures
-- only { updated } from runExtractionPipeline's own return value.
--
-- CORE INVARIANT (see KnowledgeDemandOccurrence's own header,
-- types/interview-engine.ts, and this table's own RLS/grant section below):
-- this table persists EVIDENCE, never a coverage conclusion. A row means
-- exactly: "on this turn, the extraction system identified a material
-- subject/condition/constraint participating in this explicit, active
-- UserGoal, with deterministic provenance resolution to that goal." It
-- does NOT mean, and this schema has no column capable of meaning:
-- identity resolution, GovernedSubject membership, KnowledgeTopic,
-- coverage/non-coverage, legal or commercial significance, or an LK
-- onboarding recommendation. LK-DEMAND-2B's own provisional coverage
-- resolver (lib/crc-engine/knowledge-demand-coverage.ts, preserved only on
-- the local lk-demand-2b-preserved branch, never integrated) is explicitly
-- NOT wired to this table by this migration.
--
-- APPEND-ONLY, mirroring crc_turn_traces' own "observational, faithful
-- persistence" discipline (20260915000000_crc_turn_traces.sql) rather than
-- crc_sessions' mutable-current-state model: these rows are historical
-- governance evidence, not current project state, and are never updated in
-- place once written (see below for why `superseded_by` does not change
-- this -- it records the RUNTIME's own already-computed same-turn
-- correction result, never a later UPDATE to an existing row).
--
-- session_id is a real FK, mirroring crc_turn_traces (never
-- crc_pilot_events' own deliberately-nullable, non-FK session_id) -- a
-- demand-evidence row is only ever written for a session already
-- authoritatively saved by runTurn() this same turn, so the row is
-- guaranteed to exist.
--
-- occurrence_id is the runtime-generated id (extraction.ts,
-- computeMaterialDemandOccurrenceId) -- `kd-t{turn}-{sha256 digest}[:16]`,
-- where the digest is over a canonical JSON tuple of (turn, the resolved
-- goal's own raw_text, the demand's own raw_text, a same-turn ordinal).
-- REPAIRED under LK-DEMAND-2C-R1 (2026-09-18): the ORIGINAL 2C formula was
-- `kd-t{turn}-{proposal_id}`, where proposal_id is a MODEL-ASSIGNED
-- transport label with no cross-call stability guarantee -- a genuine
-- client retry of an already-accepted turn re-invokes the (non-
-- temperature-pinned) extractor, which could assign different labels to
-- the same semantic content on its second sample, producing a DIFFERENT
-- occurrence_id and defeating the uniqueness constraint below. The
-- repaired formula depends only on stable, non-model-assigned provenance,
-- so the SAME accepted turn's SAME qualified demand now resolves to the
-- SAME occurrence_id on retry.
--
-- Stable WITHIN one session, but not globally unique across sessions (two
-- different sessions' own turn-3/identical-demand-text slots would mint
-- the identical digest). UNIQUE (session_id, occurrence_id), not
-- occurrence_id alone, is therefore the correct idempotency key -- a
-- client-retried request that re-runs the same turn's extraction and
-- reproduces the same (turn, goal text, demand text, ordinal) tuple must
-- not create a duplicate evidence row. The primary key remains a fresh
-- gen_random_uuid(), mirroring crc_turn_traces' own id column, since
-- occurrence_id's own uniqueness is scoped, not global.
--
-- qualification_state is persisted as written by the runtime
-- (QUALIFICATION_STATES: 'qualified' | 'indeterminate', types/
-- interview-engine.ts) -- an indeterminate occurrence is persisted as raw
-- evidence exactly like a qualified one (LK-DEMAND-2C's own Final Report,
-- Phase 11 Case C, records the rationale: the extractor's own uncertainty
-- is itself a real, honest fact worth preserving, and future governance
-- review over this table is the correct place to weigh confidence, not a
-- write-time filter that would silently discard signal).
--
-- superseded_by persists the RUNTIME's own already-computed same-turn
-- correction result (runExtractionPipeline's own within-turn-only
-- resolution, extraction.ts) verbatim -- this migration does not compute,
-- infer, or retroactively apply any correction of its own, and does not
-- implement cross-turn correction (deferred, per extraction.ts's own
-- documented limitation: a later turn has no durable store to resolve
-- against until a caller reads this very table, which no code does yet).
-- A later turn's differently-worded demand is therefore persisted as an
-- entirely independent, non-superseding row -- historical evidence remains
-- historical evidence; "the user asked this on turn N" stays true even if
-- the user's request evolves on a later turn.
--
-- No coverage/subject/onboarding/notification/aggregation column exists on
-- this table, matching the LK-DEMAND-2C task's own explicit exclusion
-- list. Zero GovernedSubjectTypes and zero GovernedSubjects exist in
-- production as of this migration (lib/retrieval-engine/types.ts) and this
-- table does not reference either concept.

-- =============================================
-- UP
-- =============================================

CREATE TABLE IF NOT EXISTS crc_knowledge_demand_occurrences (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id             UUID NOT NULL REFERENCES crc_sessions(id),
  occurrence_id          TEXT NOT NULL,
  goal_id                TEXT NOT NULL,
  source_turn            INTEGER NOT NULL,
  raw_text               TEXT NOT NULL,
  source_statement       TEXT NOT NULL,
  qualification_state    TEXT NOT NULL,
  superseded_by          TEXT,
  runtime_commit         TEXT NOT NULL,
  schema_version         INTEGER NOT NULL,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE crc_knowledge_demand_occurrences
  ADD CONSTRAINT crc_knowledge_demand_occurrences_qualification_state_values
  CHECK (qualification_state IN ('qualified', 'indeterminate'));

-- Idempotency: a retried write for the same session/turn/candidate slot
-- must never create a duplicate row -- see this migration's own header.
ALTER TABLE crc_knowledge_demand_occurrences
  ADD CONSTRAINT crc_knowledge_demand_occurrences_session_occurrence_unique
  UNIQUE (session_id, occurrence_id);

CREATE INDEX IF NOT EXISTS crc_knowledge_demand_occurrences_session_id_idx
  ON crc_knowledge_demand_occurrences (session_id);

ALTER TABLE crc_knowledge_demand_occurrences ENABLE ROW LEVEL SECURITY;
-- No SELECT / INSERT / UPDATE / DELETE policies -- same posture as every
-- other crc_* evidence table (crc_sessions, crc_pilot_events,
-- crc_analytics_events, crc_turn_traces): RLS enabled with ZERO policies
-- (default-deny for anon/authenticated), service_role only, via
-- supabaseAdmin from app/api/crc/turn/route.ts. Raw user text
-- (raw_text/source_statement) receives exactly the same access boundary
-- this project already applies to crc_sessions.transcript and
-- crc_turn_traces' own structured_understanding_snapshot -- no new
-- privacy regime is introduced.
GRANT ALL ON public.crc_knowledge_demand_occurrences TO service_role;

-- =============================================
-- DOWN (rollback)
-- =============================================
-- DROP INDEX IF EXISTS crc_knowledge_demand_occurrences_session_id_idx;
-- ALTER TABLE crc_knowledge_demand_occurrences DROP CONSTRAINT IF EXISTS crc_knowledge_demand_occurrences_session_occurrence_unique;
-- ALTER TABLE crc_knowledge_demand_occurrences DROP CONSTRAINT IF EXISTS crc_knowledge_demand_occurrences_qualification_state_values;
-- DROP TABLE IF EXISTS crc_knowledge_demand_occurrences;
