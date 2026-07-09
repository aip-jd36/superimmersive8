-- Migration: Reviewer Workbook UI — Phase 1
-- Date: 2026-07-10
-- Adds workbook data, delivery file tracking, provenance signing fields,
-- workbook_snapshots table, and storage buckets for source/signed videos
-- and report PDFs.

-- =============================================
-- UP
-- =============================================

-- Workbook fields (admin-side, populated by reviewer)
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS workbook_data JSONB;
-- Full workbook state: sections 1-7 + post_assessment_notes
-- See PRD_REVIEWER_WORKBOOK_UI.md for complete JSONB schema

ALTER TABLE submissions ADD COLUMN IF NOT EXISTS assess_id TEXT;
-- Format: ASSESS-NNN-YYYY-MM-DD. Auto-generated when reviewer first opens workbook.

ALTER TABLE submissions ADD COLUMN IF NOT EXISTS review_started_at TIMESTAMPTZ;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS review_completed_at TIMESTAMPTZ;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS review_total_minutes INTEGER;

-- Report delivery
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS report_pdf_url TEXT;
-- Supabase Storage path: report-pdfs/[submission_id]/report.pdf

ALTER TABLE submissions ADD COLUMN IF NOT EXISTS report_hash TEXT;
-- SHA-256 hex of the delivered PDF — computed at sign time, not at upload

ALTER TABLE submissions ADD COLUMN IF NOT EXISTS report_hash_algorithm TEXT DEFAULT 'SHA256';

-- Source video (raw MP4 uploaded by admin after creator provides it)
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS source_video_url TEXT;
-- Supabase Storage path: source-videos/[submission_id]/original.[ext]

ALTER TABLE submissions ADD COLUMN IF NOT EXISTS source_video_filename TEXT;
-- Original filename from creator (display only)

-- Numbers Protocol / C2PA provenance
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS provenance_status TEXT DEFAULT 'not_started';
-- Enum: not_started | signing | signed | delivered

ALTER TABLE submissions ADD COLUMN IF NOT EXISTS numbers_asset_id TEXT;
-- Numbers Protocol CID returned by Capture API

ALTER TABLE submissions ADD COLUMN IF NOT EXISTS numbers_verify_url TEXT;
-- verify.numbersprotocol.io URL returned by Capture API

ALTER TABLE submissions ADD COLUMN IF NOT EXISTS numbers_signed_at TIMESTAMPTZ;

ALTER TABLE submissions ADD COLUMN IF NOT EXISTS signed_video_url TEXT;
-- Supabase Storage path: signed-videos/[submission_id]/[assess_id]-signed.[ext]

ALTER TABLE submissions ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;


-- =============================================
-- WORKBOOK SNAPSHOTS TABLE
-- Immutable milestone records — one row per milestone per assessment.
-- Autosave overwrites workbook_data; snapshots here are permanent.
-- =============================================

CREATE TABLE IF NOT EXISTS workbook_snapshots (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id   UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  assess_id       TEXT NOT NULL,
  milestone       TEXT NOT NULL,
  -- Enum: intake_complete | evidence_complete | findings_complete | signed_off
  snapshot_data   JSONB NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS workbook_snapshots_submission_milestone_idx
  ON workbook_snapshots (submission_id, milestone);

-- RLS: enable but add no policies — service_role (used by all admin routes)
-- bypasses RLS entirely. No user-facing access to this table.
ALTER TABLE workbook_snapshots ENABLE ROW LEVEL SECURITY;


-- =============================================
-- STORAGE BUCKETS
-- All private (public = false). Access via signed URLs only.
-- =============================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  (
    'source-videos',
    'source-videos',
    false,
    524288000,  -- 500 MB
    ARRAY['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm']
  ),
  (
    'signed-videos',
    'signed-videos',
    false,
    524288000,  -- 500 MB
    ARRAY['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm']
  ),
  (
    'report-pdfs',
    'report-pdfs',
    false,
    52428800,   -- 50 MB
    ARRAY['application/pdf']
  )
ON CONFLICT (id) DO NOTHING;


-- =============================================
-- DOWN
-- =============================================
-- Run these statements to roll back this migration:
--
-- DROP TABLE IF EXISTS workbook_snapshots;
--
-- ALTER TABLE submissions
--   DROP COLUMN IF EXISTS workbook_data,
--   DROP COLUMN IF EXISTS assess_id,
--   DROP COLUMN IF EXISTS review_started_at,
--   DROP COLUMN IF EXISTS review_completed_at,
--   DROP COLUMN IF EXISTS review_total_minutes,
--   DROP COLUMN IF EXISTS report_pdf_url,
--   DROP COLUMN IF EXISTS report_hash,
--   DROP COLUMN IF EXISTS report_hash_algorithm,
--   DROP COLUMN IF EXISTS source_video_url,
--   DROP COLUMN IF EXISTS source_video_filename,
--   DROP COLUMN IF EXISTS provenance_status,
--   DROP COLUMN IF EXISTS numbers_asset_id,
--   DROP COLUMN IF EXISTS numbers_verify_url,
--   DROP COLUMN IF EXISTS numbers_signed_at,
--   DROP COLUMN IF EXISTS signed_video_url,
--   DROP COLUMN IF EXISTS delivered_at;
--
-- DELETE FROM storage.buckets
--   WHERE id IN ('source-videos', 'signed-videos', 'report-pdfs');
