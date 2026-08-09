-- Migration: CRC pilot events table + feedback columns on crc_sessions
-- Date: 2026-08-10
--
-- CRC Limited Pilot milestone. Two additions, kept in one migration since
-- both are pilot-support schema landing together:
--
-- 1. crc_pilot_events -- append-only, deliberately tiny. Architectural
--    rule from the approved plan: only record events that cannot already
--    be reconstructed from crc_sessions. completion/turn-count/gate-state/
--    phases-skipped/corrections/etc. all already live in crc_sessions and
--    are NOT duplicated here. This table exists only for the handful of
--    signals that leave no trace anywhere else: runtime failures/recoveries
--    and the specific decline action taken (the aggregate EFFECT of a
--    decline survives in boundary_state, but not which literal action
--    produced it, and not without fragile transcript text-matching).
--
--    session_id is TEXT, not a UUID FK: a `missing_session` event is BY
--    DEFINITION a token that does not resolve to any crc_sessions row (a
--    forged/expired/corrupt cookie) -- a foreign key constraint would
--    reject exactly the event this table exists to capture. Nullable for
--    the same reason: some failure paths may have no resolvable token at
--    all. Never contains conversation text -- `detail` is a short,
--    system-generated diagnostic string (e.g. an Anthropic/Postgres error
--    message), never user-entered content.
--
-- 2. crc_sessions.feedback_rating / feedback_text -- the one lightweight
--    feedback mechanism approved for this pilot. Two nullable columns on
--    the existing table rather than a new one: feedback is 1:1 with a
--    session and optional, and this reuses the exact update() write path
--    already hardened for crc_sessions (no new RLS/grant setup, no join).

-- =============================================
-- UP
-- =============================================

CREATE TABLE IF NOT EXISTS crc_pilot_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  TEXT,
  event_type  TEXT NOT NULL,
  detail      TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE crc_pilot_events
  ADD CONSTRAINT crc_pilot_events_event_type_values
  CHECK (event_type IN (
    'retryable_failure',
    'persistence_error',
    'missing_session',
    'skip_question',
    'skip_phase',
    'stop_interview'
  ));

-- Pilot review queries: "show me everything for this session" / "how many
-- of each event type occurred."
CREATE INDEX IF NOT EXISTS crc_pilot_events_session_id_idx ON crc_pilot_events (session_id);
CREATE INDEX IF NOT EXISTS crc_pilot_events_event_type_idx ON crc_pilot_events (event_type);

ALTER TABLE crc_pilot_events ENABLE ROW LEVEL SECURITY;
-- No SELECT / INSERT / UPDATE / DELETE policies -- service_role only, same
-- posture as crc_sessions. Grant included in this same migration (not a
-- follow-up) -- see crc_sessions' own two-migration history for why that
-- matters on this project specifically.
GRANT ALL ON public.crc_pilot_events TO service_role;

ALTER TABLE crc_sessions ADD COLUMN IF NOT EXISTS feedback_rating TEXT;
ALTER TABLE crc_sessions ADD COLUMN IF NOT EXISTS feedback_text TEXT;

ALTER TABLE crc_sessions
  ADD CONSTRAINT crc_sessions_feedback_rating_values
  CHECK (feedback_rating IS NULL OR feedback_rating IN ('yes', 'somewhat', 'no'));

-- =============================================
-- DOWN (rollback)
-- =============================================
-- ALTER TABLE crc_sessions DROP CONSTRAINT IF EXISTS crc_sessions_feedback_rating_values;
-- ALTER TABLE crc_sessions DROP COLUMN IF EXISTS feedback_text;
-- ALTER TABLE crc_sessions DROP COLUMN IF EXISTS feedback_rating;
-- DROP TABLE IF EXISTS crc_pilot_events;
