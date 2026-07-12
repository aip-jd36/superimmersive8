-- Migration: Atomic assessment number generation + explicit RLS hardening
-- Date: 2026-07-12
-- Depends on: 20260712000000_create_assessments_table.sql
--
-- Problem: generateAssessmentNumber() in repository.ts counts existing rows and
-- adds 1 in application code. Under concurrent creation (two admin tabs, retry
-- storms, or future multi-reviewer scenarios) two calls can observe the same
-- count and produce the same ASSESS-NNN number. The UNIQUE constraint on
-- assessment_number catches the duplicate at INSERT time and throws a hard error —
-- but there is no retry, so the second creation attempt fails.
--
-- Fix: PostgreSQL sequence + DB function that generates the next number atomically.
-- The sequence is global (not per-day), which matches the format spec:
-- "NNN is a global monotonically increasing sequence (does NOT reset daily)."
--
-- Also adds an explicit DELETE-denial RLS policy. The original migration relied on
-- policy absence to deny DELETE for the anon role (correct in Postgres when RLS is
-- enabled and no permissive policy exists), but the intent was not explicit.
-- An explicit DENY policy removes ambiguity and documents the constraint.

-- =============================================
-- UP
-- =============================================

-- ── Assessment number sequence ────────────────────────────────────────────────
-- Sequence starts at 1. Each call to nextval() is atomic and cannot repeat.
-- The sequence is intentionally NOT per-day — NNN is a global counter.

CREATE SEQUENCE IF NOT EXISTS assessments_number_seq
  START WITH 1
  INCREMENT BY 1
  NO MAXVALUE
  NO CYCLE;

-- Advance to the current high-water mark so the sequence doesn't
-- start below the count of already-inserted rows.
-- This is safe to run even on an empty table (SELECT coalesce(0, 0) + 1 = 1).
SELECT setval(
  'assessments_number_seq',
  GREATEST(
    (SELECT COUNT(*) FROM assessments),
    1
  )
);

-- ── DB function: generate_assessment_number() ────────────────────────────────
-- Returns the next ASSESS-NNN-YYYY-MM-DD string.
-- nextval() acquires a sequence lock — this is atomic under any concurrency.
-- Two simultaneous callers will receive different sequence values.

CREATE OR REPLACE FUNCTION generate_assessment_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  seq_val BIGINT;
  padded  TEXT;
  today   TEXT;
BEGIN
  seq_val := nextval('assessments_number_seq');
  padded  := lpad(seq_val::TEXT, 3, '0');
  today   := to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD');
  RETURN 'ASSESS-' || padded || '-' || today;
END;
$$;

-- Grant EXECUTE to the service_role so supabaseAdmin can call it.
-- The anon/authenticated roles do not need this — only server-side code
-- (via supabaseAdmin) creates assessments.
GRANT EXECUTE ON FUNCTION generate_assessment_number() TO service_role;

-- ── Explicit RLS: deny DELETE via anon key ────────────────────────────────────
-- When RLS is enabled and no permissive policy exists for an operation,
-- PostgreSQL denies access by default for non-superusers. The original migration
-- relied on this implicit denial.
--
-- This policy makes the intent explicit and protects against accidental policy
-- changes that might open DELETE in the future.
--
-- service_role bypasses RLS entirely and is not affected by this policy.

CREATE POLICY "assessments_deny_delete" ON assessments
  AS RESTRICTIVE
  FOR DELETE
  TO anon, authenticated
  USING (false);

-- =============================================
-- DOWN (rollback)
-- =============================================
-- DROP POLICY IF EXISTS "assessments_deny_delete" ON assessments;
-- DROP FUNCTION IF EXISTS generate_assessment_number();
-- DROP SEQUENCE IF EXISTS assessments_number_seq;
