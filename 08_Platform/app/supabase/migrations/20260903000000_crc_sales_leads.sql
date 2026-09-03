-- Migration: CRC -> Sales lead capability (CAH-3B)
-- Date: 2026-09-03
--
-- Accepted design: CAH-3A architecture/implementation design + CAH-3B
-- implementation milestone (four binding corrections applied). Adds the
-- MINIMUM downstream Sales operational persistence. It stores ONLY what
-- Sales has operationally done; it never duplicates CRC conversational
-- state (email, StructuredUnderstanding, transcript, goals, project
-- assertions, Retrieval/BI output, results-email content, Living
-- Knowledge). Those remain authoritative in crc_sessions / crc_leads.
--
-- 1. crc_sales_state -- one row PER ELIGIBLE crc_session (NOT per contact).
--    A "convert"/"close" decision is about a specific project
--    conversation, and a later Assurance submission (future milestone)
--    associates to session/project state, not merely to the contact
--    email -- so this is keyed on crc_session_id, one row max per session.
--    A row exists only once an operational Sales transition has occurred;
--    a session with no row is treated as NEW (derived default) by the
--    read model -- no write happens at eligibility time.
--
--    status state machine (server-enforced in lib/crc-sales/workflow.ts):
--      NEW -> CONTACTED
--      CONTACTED -> CONVERTING
--      CONTACTED -> CLOSED
--      CONVERTING -> CLOSED
--      CLOSED -> CONTACTED           (single reopen path)
--    close_reason is required exactly when status = 'CLOSED', and is a
--    small bounded enum. No notes, no CRM fields, no deal value, no
--    forecast, no activity timeline.
--
-- 2. crc_sales_events -- DEDICATED append-only audit table for transcript
--    access. Deliberately NOT crc_pilot_events (session_id TEXT non-FK,
--    no actor concept, retention geared to abuse-lockout investigation)
--    and NOT crc_analytics_events (logAnalyticsEvent is explicitly
--    best-effort / never-throws / fail-OPEN -- the exact opposite of what
--    a transcript-access security audit needs). Transcript delivery is
--    FAIL-CLOSED on this table: the app persists the audit row and only
--    returns transcript content if that INSERT succeeded (CAH-3B
--    Correction 2). Contains no transcript text and no conversation
--    content -- actor id, session id, event type, timestamp only.
--
-- Additive only. No existing table, column, constraint, function, or
-- policy is modified. RLS enabled, service_role-only, same posture as
-- every other crc_* table (all reads/writes go through supabaseAdmin in
-- authenticated /api/admin/crc-leads/* routes).

-- =============================================
-- UP
-- =============================================

-- ── crc_sales_state ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS crc_sales_state (
  crc_session_id  UUID PRIMARY KEY REFERENCES crc_sessions(id) ON DELETE CASCADE,
  status          TEXT NOT NULL,
  close_reason    TEXT,
  contacted_at    TIMESTAMPTZ,
  converting_at   TIMESTAMPTZ,
  closed_at       TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by      UUID
);

DO $$ BEGIN
  ALTER TABLE crc_sales_state
    ADD CONSTRAINT crc_sales_state_status_values
    CHECK (status IN ('NEW', 'CONTACTED', 'CONVERTING', 'CLOSED'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE crc_sales_state
    ADD CONSTRAINT crc_sales_state_close_reason_values
    CHECK (close_reason IS NULL OR close_reason IN ('converted', 'declined', 'unreachable', 'no_response'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- close_reason present iff CLOSED -- fail-closed: a CLOSED row must say why,
-- and a non-CLOSED row must not carry a stale reason.
DO $$ BEGIN
  ALTER TABLE crc_sales_state
    ADD CONSTRAINT crc_sales_state_close_reason_iff_closed
    CHECK ((status = 'CLOSED') = (close_reason IS NOT NULL));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE OR REPLACE FUNCTION crc_sales_state_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS crc_sales_state_updated_at ON crc_sales_state;
CREATE TRIGGER crc_sales_state_updated_at
  BEFORE UPDATE ON crc_sales_state
  FOR EACH ROW
  EXECUTE PROCEDURE crc_sales_state_touch_updated_at();

ALTER TABLE crc_sales_state ENABLE ROW LEVEL SECURITY;
-- No SELECT/INSERT/UPDATE/DELETE policies -- service_role only, same
-- posture as crc_sessions / crc_leads / crc_pilot_events.
GRANT ALL ON public.crc_sales_state TO service_role;

-- ── crc_sales_events (transcript-access audit) ─────────────────────────

CREATE TABLE IF NOT EXISTS crc_sales_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type      TEXT NOT NULL,
  actor_user_id   UUID NOT NULL,
  crc_session_id  UUID NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$ BEGIN
  ALTER TABLE crc_sales_events
    ADD CONSTRAINT crc_sales_events_event_type_values
    CHECK (event_type IN ('transcript_viewed'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS crc_sales_events_session_idx
  ON crc_sales_events (crc_session_id, created_at DESC);

ALTER TABLE crc_sales_events ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.crc_sales_events TO service_role;

-- =============================================
-- DOWN (rollback) -- commented, matching repo convention
-- =============================================
-- DROP TABLE IF EXISTS crc_sales_events;
-- DROP TRIGGER IF EXISTS crc_sales_state_updated_at ON crc_sales_state;
-- DROP FUNCTION IF EXISTS crc_sales_state_touch_updated_at();
-- DROP TABLE IF EXISTS crc_sales_state;
