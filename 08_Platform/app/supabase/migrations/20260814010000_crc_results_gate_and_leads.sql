-- Migration: CRC Results Gate (email delivery) + crc_leads
-- Date: 2026-08-14
--
-- Approved design: PM-revised Stage A/B/C report (this session). Summary:
--
-- 1. crc_leads -- durable, deduplicated cross-session identity. Deliberately
--    thin (id/email/email_normalized/created_at/last_seen_at) -- session
--    count/first/latest session are derived by querying crc_sessions, never
--    cached here. UNIQUE on email_normalized (trim+lowercase) is what makes
--    the upsert RPC below race-safe.
--
-- 2. crc_sessions additions -- lead linkage, notice/template versioning, and
--    result-delivery state. All nullable-or-defaulted, all additive. No
--    existing column modified or rewritten.
--
--    - crc_lead_id: nullable FK. One session belongs to at most one lead.
--    - capture_notice_version / results_email_template_version: two
--      independent version tags (which gate copy was shown vs. which email
--      template was actually sent) -- can drift independently, kept
--      separate per the approved design.
--    - results_email_status: 'pending' | 'accepted' | 'failed' | 'unknown'.
--      No 'delivered'/'bounced' state exists -- that requires webhook data
--      this milestone deliberately does not add (deferred to phase 2).
--    - results_email_accepted_at: the moment Resend's API confirmed
--      acceptance of the request -- NOT delivery, NOT open, NOT ownership
--      verification. Named precisely per the approved design's explicit
--      instruction to prefer "accepted" over "sent".
--    - results_email_last_recipient / results_email_attempt_count /
--      results_email_explicit_resend_count: track state for the CURRENT
--      target only. attempt_count is diagnostic (every claim, including
--      free retries after failure); explicit_resend_count is the capped,
--      user-facing "resend" count (max 2, enforced in claim_crc_result_send)
--      -- kept as two separate counters so an automatic retry-after-failure
--      never consumes a user's explicit resend allowance.
--    - results_email_recipients_used: every distinct normalized email ever
--      targeted for this session's result, capped at 3 (original + 2
--      corrections) by both a CHECK constraint and the claim function.
--
--    A JSONB per-recipient array was considered and rejected: since a user
--    never returns to a PREVIOUS recipient once they've corrected their
--    email (the UI only ever targets "current"), flat columns for the
--    current target plus a simple TEXT[] history of distinct addresses is
--    sufficient and matches the approved design's preference for flat,
--    precisely-named columns over a new relational structure.
--
-- 3. claim_crc_result_send() -- the atomic send-ownership mechanism. A
--    Postgres function using SELECT ... FOR UPDATE to lock the session row,
--    so two concurrent claim attempts serialize at the database level: the
--    second call only proceeds once the first transaction commits, and then
--    correctly observes the already-claimed state. This is what makes
--    double-click / browser-retry / refresh unable to produce two sends --
--    not application-level locking, not a SELECT-then-INSERT race. The
--    installed Resend SDK (v3.5.0) does not expose an Idempotency-Key
--    option through its typed send() call (only a `query` param on
--    CreateEmailRequestOptions) -- rather than bypass the SDK with a raw
--    fetch just for this one call, atomicity is enforced entirely
--    server-side, BEFORE any request ever reaches Resend. A request that
--    loses the claim never calls Resend at all.
--
-- 4. upsert_crc_lead() -- same atomic INSERT ... ON CONFLICT pattern
--    already used for exactly this reason elsewhere in this project's own
--    history (see supabase-session-store.ts's save() comment: Supabase's
--    JS-client .upsert() was confirmed live, 2026-08-09, to unreliably
--    detect conflicts). A raw SQL ON CONFLICT is not subject to that bug.
--
-- 5. record_crc_result_send_outcome() -- called after the Resend call
--    returns, regardless of outcome. Per the approved DB-failure policy: if
--    this call itself fails AFTER Resend already confirmed acceptance, the
--    user must still see the confirmation state (Resend already did its
--    job) -- the route layer handles that, this function is just the
--    write, allowed to fail loudly (logged) without changing what the user
--    is told.
--
-- 6. crc_analytics_events -- 'results_gate_shown' added to the existing
--    event_type CHECK constraint. Same table, same posture, no new table.

-- =============================================
-- UP
-- =============================================

-- ── crc_leads (new table) ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS crc_leads (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email             TEXT NOT NULL,
  email_normalized  TEXT NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$ BEGIN
  ALTER TABLE crc_leads ADD CONSTRAINT crc_leads_email_normalized_unique UNIQUE (email_normalized);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE crc_leads ENABLE ROW LEVEL SECURITY;
-- No SELECT/INSERT/UPDATE/DELETE policies -- service_role only, same posture
-- as every other crc_* table.
GRANT ALL ON public.crc_leads TO service_role;

-- ── crc_sessions additions ──────────────────────────────────────────────

ALTER TABLE crc_sessions ADD COLUMN IF NOT EXISTS crc_lead_id UUID REFERENCES crc_leads(id);
ALTER TABLE crc_sessions ADD COLUMN IF NOT EXISTS capture_notice_version TEXT;
ALTER TABLE crc_sessions ADD COLUMN IF NOT EXISTS results_email_template_version TEXT;
ALTER TABLE crc_sessions ADD COLUMN IF NOT EXISTS results_email_status TEXT;
ALTER TABLE crc_sessions ADD COLUMN IF NOT EXISTS results_email_accepted_at TIMESTAMPTZ;
ALTER TABLE crc_sessions ADD COLUMN IF NOT EXISTS results_email_last_attempted_at TIMESTAMPTZ;
ALTER TABLE crc_sessions ADD COLUMN IF NOT EXISTS results_email_last_recipient TEXT;
ALTER TABLE crc_sessions ADD COLUMN IF NOT EXISTS results_email_attempt_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE crc_sessions ADD COLUMN IF NOT EXISTS results_email_explicit_resend_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE crc_sessions ADD COLUMN IF NOT EXISTS results_email_recipients_used TEXT[] NOT NULL DEFAULT '{}';

DO $$ BEGIN
  ALTER TABLE crc_sessions
    ADD CONSTRAINT crc_sessions_results_email_status_values
    CHECK (results_email_status IS NULL OR results_email_status IN ('pending', 'accepted', 'failed', 'unknown'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE crc_sessions
    ADD CONSTRAINT crc_sessions_results_email_recipients_used_max
    CHECK (array_length(results_email_recipients_used, 1) IS NULL OR array_length(results_email_recipients_used, 1) <= 3);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS crc_sessions_crc_lead_id_idx ON crc_sessions (crc_lead_id);

-- ── crc_analytics_events: add results_gate_shown ────────────────────────

ALTER TABLE crc_analytics_events DROP CONSTRAINT IF EXISTS crc_analytics_events_event_type_values;
ALTER TABLE crc_analytics_events
  ADD CONSTRAINT crc_analytics_events_event_type_values
  CHECK (event_type IN (
    'cta_click',
    'discovery_signal',
    'commercial_assurance_bridge_shown',
    'results_gate_shown'
  ));

-- ── Functions ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION upsert_crc_lead(
  p_email TEXT,
  p_email_normalized TEXT,
  p_now TIMESTAMPTZ
) RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO crc_leads (email, email_normalized, created_at, last_seen_at)
  VALUES (p_email, p_email_normalized, p_now, p_now)
  ON CONFLICT (email_normalized) DO UPDATE SET last_seen_at = p_now
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$ LANGUAGE plpgsql;

-- claimed=false reasons: 'session_not_found', 'distinct_recipient_limit',
-- 'send_in_progress', 'already_sent', 'cooldown', 'resend_limit',
-- 'not_yet_sent' (explicit resend requested before any send ever accepted --
-- a defensive guard; the UI should never be able to produce this).
CREATE OR REPLACE FUNCTION claim_crc_result_send(
  p_session_id UUID,
  p_email_normalized TEXT,
  p_is_explicit_resend BOOLEAN,
  p_cooldown_seconds INTEGER,
  p_max_explicit_resends INTEGER,
  p_max_distinct_recipients INTEGER
) RETURNS TABLE(claimed BOOLEAN, reason TEXT) AS $$
DECLARE
  v_row crc_sessions%ROWTYPE;
  v_now TIMESTAMPTZ := now();
  v_is_new_recipient BOOLEAN;
  v_already_used BOOLEAN;
BEGIN
  SELECT * INTO v_row FROM crc_sessions WHERE id = p_session_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'session_not_found'::text;
    RETURN;
  END IF;

  v_is_new_recipient := (v_row.results_email_last_recipient IS DISTINCT FROM p_email_normalized);

  IF v_is_new_recipient THEN
    -- A "resend" only ever targets the current recipient. If p_is_explicit_resend
    -- is true here, the email differs from the current target -- the route
    -- layer never constructs a resend request with an email field, so this
    -- branch is reached only via the ordinary email-correction path; treat
    -- it as a correction (allowed, subject to the distinct-recipient cap
    -- below), never as a resend against a stale target.
    v_already_used := p_email_normalized = ANY(v_row.results_email_recipients_used);
    IF NOT v_already_used AND array_length(v_row.results_email_recipients_used, 1) >= p_max_distinct_recipients THEN
      RETURN QUERY SELECT false, 'distinct_recipient_limit'::text;
      RETURN;
    END IF;

    UPDATE crc_sessions SET
      results_email_last_recipient = p_email_normalized,
      results_email_attempt_count = 1,
      results_email_explicit_resend_count = 0,
      results_email_status = 'pending',
      results_email_last_attempted_at = v_now,
      results_email_recipients_used = CASE
        WHEN v_already_used THEN v_row.results_email_recipients_used
        ELSE array_append(v_row.results_email_recipients_used, p_email_normalized)
      END
    WHERE id = p_session_id;

    RETURN QUERY SELECT true, NULL::text;
    RETURN;
  END IF;

  -- Same recipient as the current target.
  IF v_row.results_email_status = 'pending' THEN
    RETURN QUERY SELECT false, 'send_in_progress'::text;
    RETURN;
  END IF;

  IF p_is_explicit_resend THEN
    IF v_row.results_email_status IS DISTINCT FROM 'accepted' THEN
      RETURN QUERY SELECT false, 'not_yet_sent'::text;
      RETURN;
    END IF;
    IF v_row.results_email_last_attempted_at IS NOT NULL
       AND v_now - v_row.results_email_last_attempted_at < make_interval(secs => p_cooldown_seconds) THEN
      RETURN QUERY SELECT false, 'cooldown'::text;
      RETURN;
    END IF;
    IF v_row.results_email_explicit_resend_count >= p_max_explicit_resends THEN
      RETURN QUERY SELECT false, 'resend_limit'::text;
      RETURN;
    END IF;

    UPDATE crc_sessions SET
      results_email_attempt_count = results_email_attempt_count + 1,
      results_email_explicit_resend_count = results_email_explicit_resend_count + 1,
      results_email_status = 'pending',
      results_email_last_attempted_at = v_now
    WHERE id = p_session_id;

    RETURN QUERY SELECT true, NULL::text;
    RETURN;
  END IF;

  -- Ordinary (non-explicit-resend) submission of the same email again --
  -- double-click, browser retry, or a refresh-resubmit.
  IF v_row.results_email_status = 'accepted' THEN
    -- Idempotent no-op: caller should render the existing confirmation, not
    -- treat this as an error and not send again.
    RETURN QUERY SELECT false, 'already_sent'::text;
    RETURN;
  END IF;

  -- status is 'failed', 'unknown', or NULL (first-ever attempt at this
  -- recipient reached via the new-recipient branch already, so this path
  -- is really "retry after a prior failure") -- free, does not touch
  -- explicit_resend_count.
  UPDATE crc_sessions SET
    results_email_attempt_count = results_email_attempt_count + 1,
    results_email_status = 'pending',
    results_email_last_attempted_at = v_now
  WHERE id = p_session_id;

  RETURN QUERY SELECT true, NULL::text;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION record_crc_result_send_outcome(
  p_session_id UUID,
  p_email_normalized TEXT,
  p_status TEXT,
  p_accepted_at TIMESTAMPTZ,
  p_template_version TEXT
) RETURNS VOID AS $$
BEGIN
  UPDATE crc_sessions
  SET results_email_status = p_status,
      results_email_accepted_at = CASE WHEN p_status = 'accepted' THEN p_accepted_at ELSE results_email_accepted_at END,
      results_email_template_version = p_template_version
  WHERE id = p_session_id
    AND results_email_last_recipient = p_email_normalized;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- DOWN (rollback)
-- =============================================
-- DROP FUNCTION IF EXISTS record_crc_result_send_outcome(UUID, TEXT, TEXT, TIMESTAMPTZ, TEXT);
-- DROP FUNCTION IF EXISTS claim_crc_result_send(UUID, TEXT, BOOLEAN, INTEGER, INTEGER, INTEGER);
-- DROP FUNCTION IF EXISTS upsert_crc_lead(TEXT, TEXT, TIMESTAMPTZ);
-- ALTER TABLE crc_analytics_events DROP CONSTRAINT IF EXISTS crc_analytics_events_event_type_values;
-- ALTER TABLE crc_analytics_events
--   ADD CONSTRAINT crc_analytics_events_event_type_values
--   CHECK (event_type IN ('cta_click','discovery_signal','commercial_assurance_bridge_shown'));
-- DROP INDEX IF EXISTS crc_sessions_crc_lead_id_idx;
-- ALTER TABLE crc_sessions DROP CONSTRAINT IF EXISTS crc_sessions_results_email_recipients_used_max;
-- ALTER TABLE crc_sessions DROP CONSTRAINT IF EXISTS crc_sessions_results_email_status_values;
-- ALTER TABLE crc_sessions DROP COLUMN IF EXISTS results_email_recipients_used;
-- ALTER TABLE crc_sessions DROP COLUMN IF EXISTS results_email_explicit_resend_count;
-- ALTER TABLE crc_sessions DROP COLUMN IF EXISTS results_email_attempt_count;
-- ALTER TABLE crc_sessions DROP COLUMN IF EXISTS results_email_last_recipient;
-- ALTER TABLE crc_sessions DROP COLUMN IF EXISTS results_email_last_attempted_at;
-- ALTER TABLE crc_sessions DROP COLUMN IF EXISTS results_email_accepted_at;
-- ALTER TABLE crc_sessions DROP COLUMN IF EXISTS results_email_status;
-- ALTER TABLE crc_sessions DROP COLUMN IF EXISTS results_email_template_version;
-- ALTER TABLE crc_sessions DROP COLUMN IF EXISTS capture_notice_version;
-- ALTER TABLE crc_sessions DROP COLUMN IF EXISTS crc_lead_id;
-- DROP TABLE IF EXISTS crc_leads;
