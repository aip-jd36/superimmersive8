-- Migration: Create crc_sessions table (CRC Product Integration -- First Usable Live Slice)
-- Date: 2026-08-09
--
-- Backs lib/crc-engine/session-store.ts's SessionStore interface via a new
-- SupabaseSessionStore implementation. The `id` column IS the opaque token
-- the browser holds (via an httpOnly cookie, never read by client JS) --
-- no separate token column.
--
-- Two distinct kinds of data live in this one row, deliberately kept
-- separate in naming even though they're stored together for simplicity:
--   - Engine state (structured_understanding, boundary_state,
--     pending_clarification): exactly CRCSessionState
--     (lib/crc-engine/types.ts), serialized JSON, opaque to this table --
--     the engine owns this shape entirely; this migration does not
--     interpret it.
--   - Product state (transcript, turn_count): NOT part of CRCSessionState.
--     The runtime does not need a message transcript to resume correctly
--     (StructuredUnderstanding stores extracted facts, not literal
--     message text) -- transcript exists solely so the browser can
--     redisplay prior conversation turns after a refresh (Phase 6/Phase 2
--     "refresh resumes correctly" from the user's own point of view, not
--     just the engine's). turn_count exists because RunTurnInput requires
--     a turnNumber the caller supplies, and it is not reliably
--     recomputable from persisted engine state alone (a turn producing
--     zero candidates -- e.g. a decline action -- leaves no
--     source_turn-bearing record behind).
--
-- INTENTIONALLY EXCLUDED (challenged and rejected per JD instruction,
-- "before adding fields, challenge whether each value is durable or
-- recomputable"):
--   - a separate completion/is_complete column: completion_reason already
--     lives inside structured_understanding, and runTurn() itself already
--     short-circuits a completed session using only that field
--     (run-turn.ts's own "a completed session never re-enters the loop"
--     recovery). A second column would be a second, driftable source of
--     truth for the same fact.
--   - a stored ProjectionOutput: fully recomputable, deterministically and
--     cheaply (runCRCConversation is pure, no LLM calls), from
--     structured_understanding + the static Matrix fixture.

-- =============================================
-- UP
-- =============================================

CREATE TABLE IF NOT EXISTS crc_sessions (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Engine state -- exactly CRCSessionState (lib/crc-engine/types.ts).
  -- Serialized via serializeStructuredUnderstanding/serializeBoundaryState
  -- (lib/interview-engine/serialization.ts) before storage, so a jsonb
  -- round-trip quirk in the Supabase client can never silently diverge
  -- from what those functions themselves produce -- same discipline the
  -- Stripe webhook route already applies to its own JSONB columns.
  structured_understanding  JSONB NOT NULL,
  boundary_state            JSONB NOT NULL,
  pending_clarification     JSONB,

  -- Product state -- see header comment. Not part of CRCSessionState.
  transcript                JSONB NOT NULL DEFAULT '[]'::jsonb,
  turn_count                INTEGER NOT NULL DEFAULT 0,

  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── updated_at trigger ────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_crc_sessions_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER crc_sessions_updated_at
  BEFORE UPDATE ON crc_sessions
  FOR EACH ROW
  EXECUTE PROCEDURE update_crc_sessions_updated_at();

-- ── RLS ───────────────────────────────────────────────────────────────────────
-- No auth in v1 -- there is no per-user identity to scope a policy to, and
-- unlike the assessments table there is no public-facing page that reads
-- this table directly. RLS is enabled with ZERO policies: default-deny for
-- both anon and authenticated roles. The only access path is the
-- /api/crc/turn Route Handler using supabaseAdmin (service_role), which
-- bypasses RLS entirely -- "server is sole writer" (and sole reader).

ALTER TABLE crc_sessions ENABLE ROW LEVEL SECURITY;

-- No SELECT / INSERT / UPDATE / DELETE policies at all.

-- =============================================
-- DOWN (rollback)
-- =============================================
-- DROP TRIGGER IF EXISTS crc_sessions_updated_at ON crc_sessions;
-- DROP FUNCTION IF EXISTS update_crc_sessions_updated_at();
-- DROP TABLE IF EXISTS crc_sessions;
