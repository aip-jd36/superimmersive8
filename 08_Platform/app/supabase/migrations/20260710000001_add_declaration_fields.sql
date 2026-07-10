-- Add declaration fields to submissions
-- These were enforced at form-submit time but never persisted.
-- Storing them creates an audit trail visible to reviewers.

ALTER TABLE submissions
  ADD COLUMN IF NOT EXISTS custodian_declaration BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS indemnification_confirmed BOOLEAN NOT NULL DEFAULT false;

-- Backfill existing SI8 Certified submissions (platform enforced the checkboxes).
-- Cloud World (a6a41b32-650d-419b-be6d-798d4783ecbc) and any other paid submissions
-- could not have been created without both boxes checked.
UPDATE submissions
SET
  custodian_declaration = true,
  indemnification_confirmed = true
WHERE payment_status = 'paid'
  AND tier = 'si8_certified';
