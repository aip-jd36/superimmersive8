-- Migration: crc_results_email_artifacts + crc_results_email_delivery_attempts
-- Date: 2026-10-11
--
-- CRC-OUTBOUND-ARTIFACT-1B (Durable Exact Results Email Provenance),
-- implementing the architecture established by CRC-OUTBOUND-ARTIFACT-1A.
--
-- PURPOSE: CRC-OUTBOUND-ARTIFACT-1A found that current results-email
-- delivery (lib/crc-engine/results-email-delivery.ts) recomputes CRC,
-- re-renders results-email-v1, and hands the provider an exact
-- {subject, html, text} triple that is never durably persisted -- only
-- session-level delivery STATUS (crc_sessions.results_email_*) survives.
-- This migration adds the missing authoritative record of exactly what SI8
-- generated and attempted to send, without touching crc_sessions' existing
-- authority over session-level claim/resend/dedupe behavior (unchanged by
-- this migration -- see that table's own 20260814010000 migration).
--
-- CRC-SPECIFIC, NOT GENERIC (1A decision B/Y): this is deliberately named
-- crc_results_email_* rather than a generic outbound_artifacts table. CRC
-- results email is the first and, as of this migration, only producer;
-- crc_turn_traces (20260915000000) is this codebase's one existing
-- generic/kind-keyed sibling-table precedent, but its own header explicitly
-- scopes it to internal diagnostic data and explicitly excludes verbatim
-- customer-facing/user-controlled content -- reusing or extending it here
-- would violate that table's own established charter. A generic
-- abstraction is deferred until a second real producer demonstrates it is
-- actually shared, not assumed in advance.
--
-- ── crc_results_email_artifacts ─────────────────────────────────────────
-- ARTIFACT answers "what exactly did SI8 generate?" -- the immutable
-- customer-facing content triple (subject/html/text) plus the minimum
-- identity/provenance needed to explain why it was generated. Application
-- code must never UPDATE subject/html/text/content_hash after insert (see
-- lib/crc-engine/results-email-artifacts.ts's own header for the
-- enforcement discipline -- no update helper exists for this table at all).
--
-- crc_session_id is a real FK (same reasoning as crc_turn_traces.session_id):
-- an artifact can only ever be created for a session that already exists
-- and has already been claimed via claim_crc_result_send.
--
-- crc_lead_id is nullable -- a session's lead linkage happens immediately
-- before the claim (results-email-delivery.ts's own existing
-- upsertCrcLead/linkSessionToLead sequence), so it is normally present by
-- the time an artifact is created, but is not re-derived or enforced here;
-- this column is denormalized provenance, not the authoritative lead
-- relationship (crc_sessions.crc_lead_id remains authoritative for that).
--
-- content_hash: SHA-256 over the canonical JSON encoding of
-- {subject, html, text} (lib/crc-engine/results-email-artifacts.ts's
-- computeResultsEmailContentHash) -- integrity/debugging value only, never
-- a signature, certification, or legal attestation.
--
-- previous_artifact_id (self-FK, nullable): the immediately prior
-- crc_results_email_artifacts row for the SAME crc_session_id, if any, set
-- at creation time regardless of why a new artifact was generated (first
-- send has none; every later regenerated send -- ordinary retry or
-- explicit resend -- points at its own immediate predecessor). Named
-- `previous_artifact_id`, deliberately NOT `supersedes_artifact_id`: a
-- later artifact does not correct, invalidate, or supersede an earlier one
-- in the sense this codebase's UserGoal/ToolMention/AssetProviderMention
-- correction semantics use that word -- the earlier artifact remains a
-- true, authoritative historical record of what was actually generated and
-- sent at that time. This is a plain lineage pointer, nothing more.
--
-- attempt_number on the SIBLING delivery-attempts table (not here) is
-- always 1 under this milestone's own retry decision (see that table's own
-- header) -- 1B deliberately generates a NEW artifact for every
-- regenerated send rather than attempting same-artifact retry, because the
-- latter would require a material change to claim_crc_result_send's return
-- contract to distinguish "retry of unchanged content" from "first send"
-- (see results-email-artifacts.ts's own header for the full reasoning this
-- migration's application code follows).
--
-- ── crc_results_email_delivery_attempts ─────────────────────────────────
-- DELIVERY ATTEMPT answers "what happened when SI8 attempted to deliver
-- that artifact?" -- one row per actual Resend API call. artifact_id is a
-- real, required FK: an attempt can only ever exist for an artifact that
-- was already durably persisted (the governing invariant: if the artifact
-- cannot be persisted, Resend is never called, so no attempt row is ever
-- warranted -- see results-email-artifacts.ts).
--
-- outcome is bounded to exactly the three states the current Resend
-- integration can actually produce (lib/emails.ts's sendCrcResultsEmail):
-- 'accepted' (Resend's API confirmed receipt -- NOT delivered, NOT opened,
-- NOT clicked; no webhook data exists to say more, by design, same posture
-- as crc_sessions.results_email_status), 'failed' (a definitive provider
-- rejection), 'unknown' (network/timeout/exception before a definitive
-- response -- acceptance may have already happened). No
-- delivered/bounced/opened/clicked states exist; this migration
-- deliberately does not add webhook/event architecture.
--
-- provider_message_id is nullable: only populated when Resend's response
-- actually includes one ('accepted' outcome). Lives on the ATTEMPT, never
-- the artifact -- 1A's explicit boundary: the artifact is what SI8
-- generated, independent of any one delivery attempt's own provider
-- correlation id.
--
-- UNIQUE (artifact_id, attempt_number): defense-in-depth against a
-- concurrent duplicate-attempt write for the same artifact. In practice,
-- under this milestone's "new artifact per send" decision, every artifact
-- receives at most one attempt and the existing claim_crc_result_send row
-- lock (20260814010000) already serializes the whole surrounding sequence
-- per session -- this constraint is not load-bearing for today's actual
-- call pattern, but keeps the schema honest/ready should a future
-- same-artifact-retry milestone reuse an artifact across multiple attempts.

-- =============================================
-- UP
-- =============================================

CREATE TABLE IF NOT EXISTS crc_results_email_artifacts (
  id                    UUID PRIMARY KEY,
  crc_session_id        UUID NOT NULL REFERENCES crc_sessions(id),
  crc_lead_id           UUID REFERENCES crc_leads(id),
  recipient_normalized  TEXT NOT NULL,
  subject               TEXT NOT NULL,
  html                  TEXT NOT NULL,
  text                  TEXT NOT NULL,
  content_hash          TEXT NOT NULL,
  template_version      TEXT NOT NULL,
  runtime_commit        TEXT NOT NULL,
  attribution_token     TEXT,
  generated_at          TIMESTAMPTZ NOT NULL,
  previous_artifact_id  UUID REFERENCES crc_results_email_artifacts(id),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS crc_results_email_artifacts_session_id_idx
  ON crc_results_email_artifacts (crc_session_id);

CREATE INDEX IF NOT EXISTS crc_results_email_artifacts_previous_artifact_id_idx
  ON crc_results_email_artifacts (previous_artifact_id);

ALTER TABLE crc_results_email_artifacts ENABLE ROW LEVEL SECURITY;
-- No SELECT / INSERT / UPDATE / DELETE policies -- same posture as every
-- other crc_* table (crc_sessions, crc_leads, crc_turn_traces, crc_pilot_events):
-- RLS enabled with ZERO policies (default-deny for anon/authenticated),
-- service_role only, via supabaseAdmin. No client-facing read path of any
-- kind exists for this table.
GRANT ALL ON public.crc_results_email_artifacts TO service_role;

CREATE TABLE IF NOT EXISTS crc_results_email_delivery_attempts (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artifact_id          UUID NOT NULL REFERENCES crc_results_email_artifacts(id),
  attempt_number       INTEGER NOT NULL,
  attempted_at         TIMESTAMPTZ NOT NULL,
  provider             TEXT NOT NULL,
  provider_message_id  TEXT,
  outcome              TEXT NOT NULL,
  error_detail         TEXT,
  accepted_at          TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE crc_results_email_delivery_attempts
  ADD CONSTRAINT crc_results_email_delivery_attempts_outcome_values
  CHECK (outcome IN ('accepted', 'failed', 'unknown'));

ALTER TABLE crc_results_email_delivery_attempts
  ADD CONSTRAINT crc_results_email_delivery_attempts_artifact_attempt_unique
  UNIQUE (artifact_id, attempt_number);

CREATE INDEX IF NOT EXISTS crc_results_email_delivery_attempts_artifact_id_idx
  ON crc_results_email_delivery_attempts (artifact_id);

ALTER TABLE crc_results_email_delivery_attempts ENABLE ROW LEVEL SECURITY;
-- Same posture as above -- service_role only, zero policies.
GRANT ALL ON public.crc_results_email_delivery_attempts TO service_role;

-- =============================================
-- DOWN (rollback)
-- =============================================
-- DROP INDEX IF EXISTS crc_results_email_delivery_attempts_artifact_id_idx;
-- ALTER TABLE crc_results_email_delivery_attempts DROP CONSTRAINT IF EXISTS crc_results_email_delivery_attempts_artifact_attempt_unique;
-- ALTER TABLE crc_results_email_delivery_attempts DROP CONSTRAINT IF EXISTS crc_results_email_delivery_attempts_outcome_values;
-- DROP TABLE IF EXISTS crc_results_email_delivery_attempts;
-- DROP INDEX IF EXISTS crc_results_email_artifacts_previous_artifact_id_idx;
-- DROP INDEX IF EXISTS crc_results_email_artifacts_session_id_idx;
-- DROP TABLE IF EXISTS crc_results_email_artifacts;
