-- Add tier and submission_mode columns to submissions table
-- tier: 'creator_record' ($29 self-attested) or 'certified' ($499 human review)
-- submission_mode: 'creator' (own work) or 'agency' (client work, skips catalog/modification sections)

ALTER TABLE submissions
  ADD COLUMN IF NOT EXISTS tier TEXT NOT NULL DEFAULT 'certified',
  ADD COLUMN IF NOT EXISTS submission_mode TEXT NOT NULL DEFAULT 'creator';

-- Add check constraints
ALTER TABLE submissions
  ADD CONSTRAINT submissions_tier_check CHECK (tier IN ('creator_record', 'certified')),
  ADD CONSTRAINT submissions_submission_mode_check CHECK (submission_mode IN ('creator', 'agency'));

-- Comment the columns
COMMENT ON COLUMN submissions.tier IS 'Verification tier: creator_record ($29, self-attested) or certified ($499, human review)';
COMMENT ON COLUMN submissions.submission_mode IS 'Submission context: creator (own work, full form) or agency (client work, skips catalog/modification sections)';
