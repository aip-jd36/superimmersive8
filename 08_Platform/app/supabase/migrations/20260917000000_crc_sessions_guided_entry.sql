-- Migration: Guided Entry Foundation (GE-1) -- crc_sessions columns
-- Date: 2026-09-17
--
-- Adds the minimum persistence needed to distinguish, for any crc_sessions
-- row, how the session was initialized: ordinary Free Form conversation, or
-- a validated Guided Entry submission (see
-- lib/crc-engine/guided-entry-init.ts and app/api/crc/turn/route.ts's new
-- `guided_entry_init` request-kind branch).
--
-- initialization_source: 'free_form' | 'guided' | NULL. Deliberately NOT
-- backfilled for any pre-existing row -- an unknown historical
-- initialization path is recorded as unknown (NULL), never assumed
-- 'free_form'. Every session created by this milestone's own code (both
-- paths) sets it explicitly; no code path leaves it implicitly NULL for a
-- NEW row going forward.
--
-- guided_entry_definition_id / guided_entry_definition_version: NULL unless
-- initialization_source = 'guided'. Together they let a guided-initialized
-- session remain historically interpretable even after the (in-code,
-- data-driven) GuidedEntryDefinition catalogue changes later -- see
-- lib/crc-engine/guided-entry-definitions.ts's own header.
--
-- No new table: crc_sessions already merges engine state and product-layer
-- bookkeeping in one row (see supabase-session-store.ts's own module
-- header) -- these three columns are additive bookkeeping of the exact
-- same kind already living there (traffic_type, abuse_key, ...), not a
-- second source of truth for anything StructuredUnderstanding already
-- owns. The actual guided-origin facts themselves (workflow_role/tool/
-- jurisdiction) are NOT duplicated here -- they live exactly once, in
-- structured_understanding, tagged with a [guided_entry] source_statement
-- prefix (see guided-entry-init.ts) for provenance, same column that
-- already exists for every other fact regardless of origin.
--
-- RLS: UNCHANGED. crc_sessions already has "RLS enabled with ZERO
-- policies" (service-role only, matching every other CRC-adjacent table --
-- see this migration's own sibling files). Adding columns to an existing
-- table never touches its RLS posture; no new policy is added here, and
-- none should be.
--
-- Additive only.

-- =============================================
-- UP
-- =============================================

ALTER TABLE crc_sessions
  ADD COLUMN IF NOT EXISTS initialization_source TEXT,
  ADD COLUMN IF NOT EXISTS guided_entry_definition_id TEXT,
  ADD COLUMN IF NOT EXISTS guided_entry_definition_version TEXT;

DO $$ BEGIN
  ALTER TABLE crc_sessions
    ADD CONSTRAINT crc_sessions_initialization_source_values
    CHECK (initialization_source IS NULL OR initialization_source IN ('free_form', 'guided'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- guided_entry_definition_id/version are only ever meaningful together with
-- initialization_source = 'guided' -- enforced, not merely documented, so a
-- future bug (e.g. setting a definition id on a free_form row) fails loud
-- at the database rather than silently producing a misleading row.
DO $$ BEGIN
  ALTER TABLE crc_sessions
    ADD CONSTRAINT crc_sessions_guided_entry_definition_requires_guided_source
    CHECK (
      (guided_entry_definition_id IS NULL AND guided_entry_definition_version IS NULL)
      OR initialization_source = 'guided'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON COLUMN crc_sessions.initialization_source IS
  'Guided Entry Foundation (GE-1). How this session began: free_form (ordinary conversational entry) or guided (a validated Guided Entry submission). NULL for rows created before this milestone -- never backfilled/assumed.';
COMMENT ON COLUMN crc_sessions.guided_entry_definition_id IS
  'GE-1. Set only when initialization_source = guided -- which GuidedEntryDefinition (lib/crc-engine/guided-entry-definitions.ts) the user selected.';
COMMENT ON COLUMN crc_sessions.guided_entry_definition_version IS
  'GE-1. Set only when initialization_source = guided -- the definition version at selection time, preserved even if the in-code catalogue later changes that definition.';

-- =============================================
-- DOWN (rollback) -- commented, matching repo convention
-- =============================================
-- ALTER TABLE crc_sessions DROP CONSTRAINT IF EXISTS crc_sessions_guided_entry_definition_requires_guided_source;
-- ALTER TABLE crc_sessions DROP CONSTRAINT IF EXISTS crc_sessions_initialization_source_values;
-- ALTER TABLE crc_sessions
--   DROP COLUMN IF EXISTS guided_entry_definition_version,
--   DROP COLUMN IF EXISTS guided_entry_definition_id,
--   DROP COLUMN IF EXISTS initialization_source;
