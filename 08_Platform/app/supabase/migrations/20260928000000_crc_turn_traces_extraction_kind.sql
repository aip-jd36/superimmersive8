-- Migration: crc_turn_traces -- widen trace_kind to add 'extraction'
-- Date: 2026-09-28
--
-- CRC-EXTRACTION-OBS-2 (Bounded Extraction Observability). Additive-only:
-- widens the existing crc_turn_traces_trace_kind_values CHECK constraint
-- from ('completion') to ('completion', 'extraction'). Every existing
-- 'completion' row remains valid under the new constraint -- no existing
-- row is read, rewritten, or reinterpreted by this migration. No column is
-- added, dropped, or retyped; no index changes; no RLS/grant changes (the
-- table's existing "service_role only, zero policies" posture already
-- covers any trace_kind value, see the original migration's own RLS
-- section).
--
-- This is exactly the extension 20260915000000_crc_turn_traces.sql's own
-- "GENERIC, KIND-KEYED SHAPE" section anticipated: one small generic table,
-- keyed by trace_kind + a JSONB payload column, so a new trace_kind never
-- requires a new table or a column-per-kind schema change -- only a wider
-- CHECK constraint.
--
-- payload for trace_kind = 'extraction' (documented here; enforced in
-- TypeScript by lib/crc-engine/turn-traces.ts's buildExtractionTracePayload,
-- not by a JSON-schema CHECK constraint -- same application-layer-validation
-- precedent the original migration's own 'completion' payload comment
-- already established):
--   {
--     candidate_count: number,
--     candidates: [
--       {
--         ordinal: number,
--         proposal_id: string,
--         candidate_kind: CandidateObservation['kind'],
--         disposition: 'accepted' | 'rejected' | 'deferred',
--         reason_code?: RejectedReasonCode | DeferredReasonCode,
--         applied_identifier?: string
--       },
--       ...
--     ]
--   }
-- Unlike the 'completion' payload (a faithful, unreduced projection of
-- CRCPipelineResult), this payload is a deliberately minimized, fixed
-- allowlist projection of ExtractionDiagnostic[] -- no raw user-turn text,
-- no raw tool/provider/jurisdiction name, no normalization/attestation
-- detail, no interpreted confidence score, no new semantic conclusion. See
-- turn-traces.ts's own header and buildExtractionTracePayload's own header
-- for the full field-by-field justification.
--
-- Written once per turn that actually reaches extraction (see run-turn.ts's
-- own `extractionDiagnostics` field header for the one turn-outcome path
-- that never reaches it -- the completed-session replay short-circuit),
-- including turns where zero candidates were extracted (candidate_count: 0,
-- candidates: []) -- a real, meaningful, persisted value distinct from "no
-- row exists for this turn at all" (extraction never ran, or the fail-open
-- write itself failed). This is the reason `candidate_count` is stored as
-- its own top-level field rather than requiring a reader to compute
-- `payload.candidates.length`.

-- =============================================
-- UP
-- =============================================

ALTER TABLE crc_turn_traces
  DROP CONSTRAINT IF EXISTS crc_turn_traces_trace_kind_values;

ALTER TABLE crc_turn_traces
  ADD CONSTRAINT crc_turn_traces_trace_kind_values
  CHECK (trace_kind IN ('completion', 'extraction'));

-- No new index: trace_kind cardinality is still low (two values), matching
-- the original migration's own "add one if/when a second trace_kind makes
-- that query pattern real" reasoning -- two low-cardinality values still
-- doesn't make it real.

-- =============================================
-- DOWN (rollback)
-- =============================================
-- Only safe if no 'extraction' rows have been written yet -- a rollback
-- after real 'extraction' rows exist would violate the narrowed constraint
-- and must delete those rows first (a deliberate manual decision, not
-- automated here).
-- ALTER TABLE crc_turn_traces DROP CONSTRAINT IF EXISTS crc_turn_traces_trace_kind_values;
-- ALTER TABLE crc_turn_traces ADD CONSTRAINT crc_turn_traces_trace_kind_values CHECK (trace_kind IN ('completion'));
