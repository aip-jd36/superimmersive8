-- Migration: Add CertForm fields to submissions table
-- Date: 2026-04-01
-- Adds all new columns required for the $499 SI8 Certified (CertForm) product

-- Commercial context (Section 1 — Production Details)
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS campaign_context JSONB;
-- Shape: { is_live_campaign: boolean, budget_range: string, distribution_channels: string[] }

-- Third-party assets (Section 3 — Third-party Assets)
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS third_party_assets JSONB;
-- Shape: { has_third_party: boolean, items: [{ type: string, description: string, license_status: string }] }

-- Post-generation editing (Section 4 — Human Authorship)
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS post_gen_editing JSONB;
-- Shape: { has_post_gen_editing: boolean, tools_used: string[], description: string }

-- Scene attribution (Section 4 — Human Authorship)
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS scene_attribution JSONB;
-- Shape: { provided: boolean, scenes: [{ scene: string, tool: string, prompt_summary: string }] }

-- AI percentage estimate (Section 4 — Human Authorship)
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS ai_percentage INTEGER;
-- 0-100, creator's estimate of AI-generated content percentage

-- License file paths (Sections 5 & 6 — Likeness, IP)
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS likeness_release_path TEXT;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS ip_license_path TEXT;

-- Fair use (Section 6 — IP, Path C)
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS fair_use_argument TEXT;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS fair_use_doc_path TEXT;

-- Production evidence (Section 8 — optional)
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS production_evidence_paths JSONB;
-- Shape: string[] (array of Supabase storage paths)

-- Client name (Section 9 — Commercial Context, agency mode only)
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS client_name TEXT;

-- Legal checkboxes
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS content_integrity_accepted BOOLEAN DEFAULT FALSE;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS scope_acknowledged BOOLEAN DEFAULT FALSE;

-- Reviewer workflow (admin-side, populated by reviewer not creator)
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS reviewer_checklist JSONB;
-- Shape: {
--   pre_screen_complete: boolean,
--   pre_screen_notes: string,
--   video_watched: boolean,
--   video_flags: string,
--   tool_receipts_verified: boolean,
--   tool_receipts_notes: string,
--   authorship_reviewed: boolean,
--   authorship_notes: string,
--   rights_docs_reviewed: boolean,
--   rights_docs_notes: string,
--   risk_assessed: boolean,
--   reviewer_notes: string
-- }

-- Risk rating output (set by reviewer, appears in Chain of Title PDF)
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS risk_rating TEXT CHECK (risk_rating IN ('low', 'standard', 'elevated', 'high'));
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS risk_notes TEXT;

-- Add risk_rating to rights_packages so it's on the issued document
ALTER TABLE rights_packages ADD COLUMN IF NOT EXISTS risk_rating TEXT;
ALTER TABLE rights_packages ADD COLUMN IF NOT EXISTS risk_notes TEXT;
