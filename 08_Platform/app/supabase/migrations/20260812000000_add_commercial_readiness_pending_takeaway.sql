-- Migration: add crc_sessions.pending_commercial_readiness_takeaway
-- Date: 2026-08-12
--
-- CRC Limited Pilot -- Commercial Readiness Discovery Catalog integration.
-- New CRCSessionState field (lib/crc-engine/types.ts): set the turn a
-- commercial_readiness_discovery question is approved and asked, consumed
-- (read, then cleared) on the very next turn, which is when that
-- category's fixed Educational Takeaway is attached to whatever outcome
-- that next turn produces. Nullable TEXT, same shape and posture as
-- pending_clarification -- not a boolean, because run-turn.ts needs to
-- know WHICH of the three pilot categories to show the takeaway for, not
-- merely THAT one was asked (that enforcement fact lives in
-- boundary_state.commercial_readiness_discovery_asked instead, inside the
-- existing opaque boundary_state JSONB column -- no schema change needed
-- there).
--
-- No new RLS/grant setup needed -- same table, same "server is sole
-- writer/reader via supabaseAdmin" posture already established.

-- =============================================
-- UP
-- =============================================

ALTER TABLE crc_sessions ADD COLUMN IF NOT EXISTS pending_commercial_readiness_takeaway TEXT;

ALTER TABLE crc_sessions
  ADD CONSTRAINT crc_sessions_pending_commercial_readiness_takeaway_values
  CHECK (
    pending_commercial_readiness_takeaway IS NULL
    OR pending_commercial_readiness_takeaway IN (
      'client_provided_source_assets',
      'likeness_publicity_rights',
      'third_party_visual_assets'
    )
  );

-- =============================================
-- DOWN (rollback)
-- =============================================
-- ALTER TABLE crc_sessions DROP CONSTRAINT IF EXISTS crc_sessions_pending_commercial_readiness_takeaway_values;
-- ALTER TABLE crc_sessions DROP COLUMN IF EXISTS pending_commercial_readiness_takeaway;
