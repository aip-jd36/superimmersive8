-- Migration: Guided Entry mobile product surface (GE-2) -- analytics event types
-- Date: 2026-09-18
--
-- Widens the governed crc_analytics_events.event_type vocabulary with three
-- new values so GE-2's entry-path funnel can be measured using the
-- EXISTING analytics table -- no new analytics system, no new table (see
-- lib/crc-engine/analytics-events.ts's own updated header for the full
-- session_id/FK reasoning: only events that occur once a real crc_sessions
-- row already exists are logged here -- true pre-session impressions, e.g.
-- the entry-choice screen being shown or a role card being tapped before
-- any session exists, are deliberately NOT added, since this table's
-- session_id is NOT NULL REFERENCES crc_sessions(id) and this route's own
-- established discipline never trusts a client-supplied session_id).
--
-- 'guided_entry_submitted': a validated Guided Entry selection successfully
--   created (or idempotently re-resolved) its crc_sessions row -- logged
--   before the free-text concern's own runTurn() call is attempted.
-- 'guided_entry_crc_initialized': that same session's first real runTurn()
--   call (the free-text concern) succeeded -- CRC conversation is now
--   genuinely underway. Deliberately distinct from the event above: the two
--   can diverge (a session can be created but the first turn can fail).
-- 'free_form_crc_initialized': the Free Form equivalent -- a brand-new
--   session's first runTurn() call succeeded. Lets Guided Entry and Free
--   Form both be compared on "did CRC actually get started," not just "was
--   a form submitted."
--
-- Additive only. Table, columns, indexes, RLS posture, and every other
-- constraint are unchanged -- only the event_type value CHECK is widened
-- (a value CHECK cannot be extended in place, so it is dropped and
-- re-added with the wider set, matching this table's own established
-- migration pattern).

-- =============================================
-- UP
-- =============================================

ALTER TABLE crc_analytics_events DROP CONSTRAINT IF EXISTS crc_analytics_events_event_type_values;
ALTER TABLE crc_analytics_events
  ADD CONSTRAINT crc_analytics_events_event_type_values
  CHECK (event_type IN (
    'cta_click',
    'discovery_signal',
    'commercial_assurance_bridge_shown',
    'results_gate_shown',
    'guided_entry_submitted',
    'guided_entry_crc_initialized',
    'free_form_crc_initialized'
  ));

-- =============================================
-- DOWN (rollback) -- commented, matching repo convention
-- =============================================
-- ALTER TABLE crc_analytics_events DROP CONSTRAINT IF EXISTS crc_analytics_events_event_type_values;
-- ALTER TABLE crc_analytics_events
--   ADD CONSTRAINT crc_analytics_events_event_type_values
--   CHECK (event_type IN ('cta_click','discovery_signal','commercial_assurance_bridge_shown','results_gate_shown'));
