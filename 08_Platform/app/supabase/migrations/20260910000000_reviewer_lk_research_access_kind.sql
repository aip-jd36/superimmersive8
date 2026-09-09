-- Migration: Reviewer Living Knowledge research access kind (CAH-4E)
-- Date: 2026-09-10
--
-- CAH-4C created `crc_context_access_events` as the one home for every
-- deliberate read a reviewer performs through the reviewer-context surface,
-- with `access_kind` as a governed vocabulary explicitly designed to be
-- extended: its own migration comment says
--   "A future access kind (e.g. Living Knowledge research) is added by
--    extending the CHECK — NO speculative columns for it are added here."
--
-- CAH-4E adds that access kind: `'lk_research'`. A Human Reviewer deliberately
-- looks up governed SI8 Living Knowledge while conducting a Commercial
-- Assurance Assessment; the access is durably audited BEFORE any governed
-- knowledge content is returned (fail-closed audit-before-content, identical
-- discipline to the CAH-4C transcript route).
--
-- An `lk_research` event carries the MINIMUM durable access fact only:
--   access_kind = 'lk_research'  |  actor_user_id  |  submission_id  |  created_at
-- No query text, no returned claim text, no reviewer interpretation, no
-- findings, no reliance assertion — the same bounded-access-fact discipline as
-- `'transcript'`.
--
-- association_id / crc_session_id are NOT required for `lk_research` (and the
-- reviewer-lk repository always leaves them NULL): LK research is not tied to
-- any CRC association. The existing `_transcript_is_scoped` CHECK is already
-- guarded on `access_kind = 'transcript'`, so it does not constrain
-- `lk_research` rows — no change to that constraint is needed or made.
--
-- Additive only. The table, its columns, indexes, RLS posture, and the
-- `_transcript_is_scoped` CHECK are all UNCHANGED. Only the `access_kind`
-- value CHECK is widened (a value CHECK cannot be extended in place, so it is
-- dropped and re-added with the wider set). `actor_user_id` / `submission_id`
-- remain NOT NULL for every access kind.

-- =============================================
-- UP
-- =============================================

-- Widen the governed access-kind vocabulary: 'transcript' (CAH-4C) + 'lk_research' (CAH-4E).
ALTER TABLE crc_context_access_events
  DROP CONSTRAINT IF EXISTS crc_context_access_events_access_kind_values;

DO $$ BEGIN
  ALTER TABLE crc_context_access_events
    ADD CONSTRAINT crc_context_access_events_access_kind_values
    CHECK (access_kind IN ('transcript', 'lk_research'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON TABLE crc_context_access_events IS
  'CAH-4C/CAH-4E. Append-only audit of deliberate reviewer reads through the reviewer-context and reviewer-LK surfaces. access_kind IN (transcript, lk_research). Records the bounded ACCESS FACT only — never that the transcript or governed knowledge became evidence, was accepted, or affected an assessment. transcript rows are association+session scoped; lk_research rows carry actor + submission only.';

-- =============================================
-- DOWN (rollback) — commented, matching repo convention
-- =============================================
-- ALTER TABLE crc_context_access_events DROP CONSTRAINT IF EXISTS crc_context_access_events_access_kind_values;
-- DO $$ BEGIN
--   ALTER TABLE crc_context_access_events
--     ADD CONSTRAINT crc_context_access_events_access_kind_values
--     CHECK (access_kind IN ('transcript'));
-- EXCEPTION WHEN duplicate_object THEN NULL;
-- END $$;
