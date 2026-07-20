-- Migration: Add is_system_test flag to assessments table
-- Date: 2026-07-19
--
-- Distinguishes system-validation records (submitter and reviewer are the same
-- person, exercising the pipeline rather than producing a real client
-- deliverable — e.g. Cloud World, ASSESS-005-2026-07-12) from genuine external
-- customer engagements. Surfaced as a quiet footer disclaimer on the Public
-- Verification Page, not a prominent banner — this is a factual label, not a
-- warning. Public visibility (the DELIVERED gate) is unaffected; a system-test
-- record can still be shown, just accurately labeled.

-- =============================================
-- UP
-- =============================================

ALTER TABLE assessments
  ADD COLUMN IF NOT EXISTS is_system_test BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN assessments.is_system_test IS
  'True for an internal SI8 demonstration, pipeline validation, or other non-client assessment. Such records must be disclosed as internal tests if publicly displayed.';

-- Cloud World (ASSESS-005-2026-07-12) is the founder's own self-test submission,
-- reviewed by the founder — no independent third party involved. See
-- 06_Operations/assessments/ASSESS-005-2026-07-12/README.md.
UPDATE assessments
SET is_system_test = true
WHERE assessment_number = 'ASSESS-005-2026-07-12';

-- =============================================
-- DOWN (rollback)
-- =============================================
-- ALTER TABLE assessments DROP COLUMN IF EXISTS is_system_test;
