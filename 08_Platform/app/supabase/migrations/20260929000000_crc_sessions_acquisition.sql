-- Migration: CRC acquisition attribution -- crc_sessions columns
-- Date: 2026-09-29
--
-- Adds first-touch campaign attribution to crc_sessions so every Supabase
-- CRC funnel stage (initialization -> results -> Commercial Assurance CTA)
-- can be attributed to the campaign that brought the visitor in. GA4
-- remains authoritative for acquisition/landing behavior; from CRC
-- initialization onward, these columns are the attribution of record.
--
-- Captured from exactly five approved URL parameters, sanitized server-side
-- by lib/crc-engine/acquisition.ts before anything reaches this table:
--
--   utm_source / utm_medium / utm_campaign / utm_content -- same names;
--   ref -> acquisition_ref (an optional NON-PII lead/reference code, e.g.
--          an existing CRM code such as B087 -- never a name, email, or URL).
--
-- Values are opaque strings: charset ^[A-Za-z0-9._~-]+$, never truncated
-- (an oversized or invalid value is stored as NULL instead), never
-- case-folded or parsed. No other query parameter, no document.referrer,
-- and no GA identifier is stored.
--
-- Write-path rule (enforced in application code and tests, deliberately NOT
-- by a trigger): written ONLY at session creation -- in the same atomic
-- guided INSERT (createGuidedEntrySession) or the one-time free-form
-- creation UPDATE (saveCrcSessionCreationMeta) -- and never updated on an
-- existing session. Null values are omitted from those writes, so untagged
-- sessions never reference these columns at all.
--
-- All five columns are nullable with no default and NO backfill: every
-- historical and untagged session is genuinely unattributed (NULL), never
-- assumed. No index: attribution queries at current volume are trivial
-- scans; add a partial index later if that changes.
--
-- DEPLOYMENT ORDER: apply this migration to production BEFORE deploying the
-- application code that writes these columns. Guided session creation is a
-- single INSERT, so a tagged guided start would fail against a schema that
-- lacks them. This migration is additive-only and safe for the currently
-- deployed code.

ALTER TABLE crc_sessions
  ADD COLUMN IF NOT EXISTS utm_source TEXT,
  ADD COLUMN IF NOT EXISTS utm_medium TEXT,
  ADD COLUMN IF NOT EXISTS utm_campaign TEXT,
  ADD COLUMN IF NOT EXISTS utm_content TEXT,
  ADD COLUMN IF NOT EXISTS acquisition_ref TEXT;

ALTER TABLE crc_sessions
  DROP CONSTRAINT IF EXISTS crc_sessions_acquisition_lengths;
ALTER TABLE crc_sessions
  ADD CONSTRAINT crc_sessions_acquisition_lengths CHECK (
    (utm_source IS NULL OR char_length(utm_source) <= 100)
    AND (utm_medium IS NULL OR char_length(utm_medium) <= 100)
    AND (utm_campaign IS NULL OR char_length(utm_campaign) <= 100)
    AND (utm_content IS NULL OR char_length(utm_content) <= 100)
    AND (acquisition_ref IS NULL OR char_length(acquisition_ref) <= 64)
  );

-- Rollback (manual, only if this migration must be reverted):
-- ALTER TABLE crc_sessions DROP CONSTRAINT IF EXISTS crc_sessions_acquisition_lengths;
-- ALTER TABLE crc_sessions DROP COLUMN IF EXISTS utm_source;
-- ALTER TABLE crc_sessions DROP COLUMN IF EXISTS utm_medium;
-- ALTER TABLE crc_sessions DROP COLUMN IF EXISTS utm_campaign;
-- ALTER TABLE crc_sessions DROP COLUMN IF EXISTS utm_content;
-- ALTER TABLE crc_sessions DROP COLUMN IF EXISTS acquisition_ref;
