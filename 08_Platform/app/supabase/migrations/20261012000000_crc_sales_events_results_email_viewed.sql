-- Migration: add 'results_email_viewed' to crc_sales_events.event_type
-- Date: 2026-10-12
--
-- CRC-EMAIL-HISTORY-1B (Staff Results Email Viewer), implementing the
-- audited-access pattern CRC-EMAIL-HISTORY-1A found already established by
-- the transcript viewer (recordTranscriptViewAudit / 'transcript_viewed').
--
-- PURPOSE: crc_sales_events is the existing, single, append-only audit
-- table for sensitive CRC-Sales content access (20260903000000). Its
-- event_type CHECK constraint currently permits only 'transcript_viewed'.
-- This migration adds exactly one additional value, 'results_email_viewed',
-- so viewing a persisted historical results-email artifact
-- (crc_results_email_artifacts, 20261011000000) can be audited under the
-- SAME table and the SAME audit-before-content discipline, with no new
-- audit table and no generic activity-log abstraction (CRC-EMAIL-HISTORY-1B
-- §7, §17).
--
-- No other column, index, RLS policy, or grant on crc_sales_events changes.
-- Additive only -- a 'transcript_viewed' row remains valid and unaffected.

-- =============================================
-- UP
-- =============================================

ALTER TABLE crc_sales_events
  DROP CONSTRAINT IF EXISTS crc_sales_events_event_type_values;

ALTER TABLE crc_sales_events
  ADD CONSTRAINT crc_sales_events_event_type_values
  CHECK (event_type IN ('transcript_viewed', 'results_email_viewed'));

-- =============================================
-- DOWN (rollback)
-- =============================================
-- ALTER TABLE crc_sales_events DROP CONSTRAINT IF EXISTS crc_sales_events_event_type_values;
-- ALTER TABLE crc_sales_events ADD CONSTRAINT crc_sales_events_event_type_values CHECK (event_type IN ('transcript_viewed'));
