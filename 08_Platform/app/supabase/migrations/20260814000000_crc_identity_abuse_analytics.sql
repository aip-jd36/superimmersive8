-- Migration: CRC Identity + Abuse Prevention + Analytics milestone
-- Date: 2026-08-14
--
-- Approved design: see the Stage A/B/C design report (this session) for the
-- full reasoning behind every field below. Summary of what's added and why:
--
-- 1. crc_sessions -- identity, traffic classification, abuse-key, runtime
--    metadata, Calendly attribution, and a small product-layer stop reason.
--    All nullable-or-defaulted, all additive. No existing column is
--    modified or rewritten.
--
--    - email / email_captured_at / identity_source: the email gate's
--      captured identity. Deliberately flat columns on crc_sessions, not a
--      separate identities table -- see design report §2 for why a
--      separate table would be premature structure (no need beyond what a
--      GROUP BY on this column already answers).
--    - traffic_type: pilot / internal_test / automated_eval / development.
--      Server-determined only (see lib/crc-engine/traffic-classification.ts)
--      -- never client-settable in a way that could bypass abuse limits or
--      contaminate pilot analytics. Defaults to 'pilot' so every existing
--      row backfills cleanly.
--    - abuse_key: HMAC-derived from the originating request's IP, captured
--      once at session creation (see lib/crc-engine/abuse-key.ts). Never the
--      raw IP -- see crc_pilot_events' own raw_ip column below for the one
--      narrow, short-retention exception.
--    - attribution_token: opaque, unique, generated once per session,
--      passed to Calendly instead of the real session id (design report §9
--      -- avoids putting the actual internal row identifier into a
--      third-party URL/referrer chain for no benefit).
--    - runtime_commit / model_config: what code and which models actually
--      served this session. Deliberately NOT five separate
--      Engine/Retrieval/Projection/Catalog/Matrix version strings -- all of
--      those ship as one deployable unit in one commit, so a single commit
--      SHA already captures all of them precisely (design report §7).
--      model_config captures the one thing commit SHA can't: env-var model
--      overrides, independent of any deploy.
--    - product_stop_reason: a PRODUCT-layer "this session is done" flag,
--      deliberately separate from structured_understanding.completion_reason
--      (an Interview-Engine-owned field). Declining the email gate, or
--      hitting the hard turn ceiling, are business decisions to stop
--      spending on a session -- not the interview engine deciding it's
--      naturally finished. Kept out of completion_reason specifically so
--      this milestone never has to touch types/interview-engine.ts or any
--      Interview Engine completion logic. Both GET and POST /api/crc/turn
--      treat structured_understanding.completion_reason !== null OR
--      product_stop_reason !== null as "render the finalized view" -- see
--      route.ts.
--
-- 2. crc_pilot_events -- extended, not repurposed. One new event_type
--    (rate_limited) and one new nullable column (raw_ip), populated ONLY
--    for that event type, short-retention, for exactly one purpose: letting
--    a human investigate/clear a false-positive lockout (e.g. a shared
--    office IP) after the fact -- a hash alone isn't human-interpretable.
--    Everything else about this table (its narrow diagnostic-only scope,
--    its TEXT/nullable session_id) is unchanged.
--
-- 3. crc_analytics_events -- a NEW table, deliberately not a further
--    extension of crc_pilot_events. crc_pilot_events' own module header is
--    explicit that it exists only for operational/diagnostic signals with
--    no other trace. CTA clicks, the bridge-impression event, and the
--    discovery-eligibility signal are a different kind of thing --
--    structured product/funnel data, not operational diagnostics. Naming
--    the new purpose honestly rather than letting crc_pilot_events' scope
--    silently drift (design report §8). Unlike crc_pilot_events,
--    session_id here IS a real FK: every event in this table always
--    originates from a resolvable, already-existing session.

-- =============================================
-- UP
-- =============================================

-- ── crc_sessions additions ──────────────────────────────────────────────

ALTER TABLE crc_sessions ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE crc_sessions ADD COLUMN IF NOT EXISTS email_captured_at TIMESTAMPTZ;
ALTER TABLE crc_sessions ADD COLUMN IF NOT EXISTS identity_source TEXT;
ALTER TABLE crc_sessions ADD COLUMN IF NOT EXISTS traffic_type TEXT NOT NULL DEFAULT 'pilot';
ALTER TABLE crc_sessions ADD COLUMN IF NOT EXISTS abuse_key TEXT;
ALTER TABLE crc_sessions ADD COLUMN IF NOT EXISTS attribution_token TEXT;
ALTER TABLE crc_sessions ADD COLUMN IF NOT EXISTS runtime_commit TEXT;
ALTER TABLE crc_sessions ADD COLUMN IF NOT EXISTS model_config JSONB;
ALTER TABLE crc_sessions ADD COLUMN IF NOT EXISTS product_stop_reason TEXT;

DO $$ BEGIN
  ALTER TABLE crc_sessions
    ADD CONSTRAINT crc_sessions_identity_source_values
    CHECK (identity_source IS NULL OR identity_source IN ('email_gate'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE crc_sessions
    ADD CONSTRAINT crc_sessions_traffic_type_values
    CHECK (traffic_type IN ('pilot', 'internal_test', 'automated_eval', 'development'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE crc_sessions
    ADD CONSTRAINT crc_sessions_product_stop_reason_values
    CHECK (product_stop_reason IS NULL OR product_stop_reason IN ('email_declined', 'conversation_limit_reached'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE crc_sessions ADD CONSTRAINT crc_sessions_attribution_token_unique UNIQUE (attribution_token);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS crc_sessions_email_idx ON crc_sessions (email);
CREATE INDEX IF NOT EXISTS crc_sessions_abuse_key_idx ON crc_sessions (abuse_key);
CREATE INDEX IF NOT EXISTS crc_sessions_traffic_type_idx ON crc_sessions (traffic_type);

-- ── crc_pilot_events additions ──────────────────────────────────────────

ALTER TABLE crc_pilot_events ADD COLUMN IF NOT EXISTS raw_ip TEXT;

ALTER TABLE crc_pilot_events DROP CONSTRAINT IF EXISTS crc_pilot_events_event_type_values;
ALTER TABLE crc_pilot_events
  ADD CONSTRAINT crc_pilot_events_event_type_values
  CHECK (event_type IN (
    'retryable_failure',
    'persistence_error',
    'missing_session',
    'skip_question',
    'skip_phase',
    'stop_interview',
    'rate_limited'
  ));

-- ── crc_analytics_events (new table) ────────────────────────────────────

CREATE TABLE IF NOT EXISTS crc_analytics_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  UUID NOT NULL REFERENCES crc_sessions(id),
  event_type  TEXT NOT NULL,
  event_data  JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE crc_analytics_events
  ADD CONSTRAINT crc_analytics_events_event_type_values
  CHECK (event_type IN (
    'cta_click',
    'discovery_signal',
    'commercial_assurance_bridge_shown'
  ));

CREATE INDEX IF NOT EXISTS crc_analytics_events_session_id_idx ON crc_analytics_events (session_id);
CREATE INDEX IF NOT EXISTS crc_analytics_events_event_type_idx ON crc_analytics_events (event_type);

ALTER TABLE crc_analytics_events ENABLE ROW LEVEL SECURITY;
-- No SELECT / INSERT / UPDATE / DELETE policies -- service_role only, same
-- posture as crc_sessions and crc_pilot_events. Grant included in this same
-- migration, not a follow-up -- see crc_sessions' own two-migration history
-- for why that matters on this project specifically.
GRANT ALL ON public.crc_analytics_events TO service_role;

-- =============================================
-- DOWN (rollback)
-- =============================================
-- DROP TABLE IF EXISTS crc_analytics_events;
-- ALTER TABLE crc_pilot_events DROP CONSTRAINT IF EXISTS crc_pilot_events_event_type_values;
-- ALTER TABLE crc_pilot_events
--   ADD CONSTRAINT crc_pilot_events_event_type_values
--   CHECK (event_type IN ('retryable_failure','persistence_error','missing_session','skip_question','skip_phase','stop_interview'));
-- ALTER TABLE crc_pilot_events DROP COLUMN IF EXISTS raw_ip;
-- ALTER TABLE crc_sessions DROP CONSTRAINT IF EXISTS crc_sessions_attribution_token_unique;
-- ALTER TABLE crc_sessions DROP CONSTRAINT IF EXISTS crc_sessions_product_stop_reason_values;
-- ALTER TABLE crc_sessions DROP CONSTRAINT IF EXISTS crc_sessions_traffic_type_values;
-- ALTER TABLE crc_sessions DROP CONSTRAINT IF EXISTS crc_sessions_identity_source_values;
-- ALTER TABLE crc_sessions DROP COLUMN IF EXISTS product_stop_reason;
-- ALTER TABLE crc_sessions DROP COLUMN IF EXISTS model_config;
-- ALTER TABLE crc_sessions DROP COLUMN IF EXISTS runtime_commit;
-- ALTER TABLE crc_sessions DROP COLUMN IF EXISTS attribution_token;
-- ALTER TABLE crc_sessions DROP COLUMN IF EXISTS abuse_key;
-- ALTER TABLE crc_sessions DROP COLUMN IF EXISTS traffic_type;
-- ALTER TABLE crc_sessions DROP COLUMN IF EXISTS identity_source;
-- ALTER TABLE crc_sessions DROP COLUMN IF EXISTS email_captured_at;
-- ALTER TABLE crc_sessions DROP COLUMN IF EXISTS email;
