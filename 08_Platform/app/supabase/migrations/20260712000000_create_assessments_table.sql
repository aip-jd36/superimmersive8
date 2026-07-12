-- Migration: Create assessments table (Assessment Service v1.0)
-- Date: 2026-07-12
--
-- The assessments table is the primary object in the Assessment Service.
-- All other representations (PDF, C2PA manifest, Verification Page) derive from it.
-- The Registry is authoritative: if information differs between PDF, C2PA, and
-- Verification Page — the Registry wins.
--
-- INTENTIONALLY EXCLUDED from this table:
--   customer name, campaign name, evidence, reviewer notes, gap log,
--   findings, recommendations, internal reasoning.
-- confidence is intentionally excluded from the Registry: it is PDF-only (Zone C)

-- =============================================
-- UP
-- =============================================

CREATE TABLE IF NOT EXISTS assessments (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 1:1 with submissions in v1; UNIQUE enforces the constraint.
  -- An assessment cannot exist without a submission in v1.
  submission_id         UUID NOT NULL UNIQUE REFERENCES submissions(id) ON DELETE RESTRICT,

  -- Format: ASSESS-NNN-YYYY-MM-DD (zero-padded sequential, e.g. ASSESS-001-2026-07-10)
  assessment_number     TEXT NOT NULL UNIQUE,

  assessment_date       DATE NOT NULL,

  -- Methodology version string, e.g. "SI8 Reviewer Manual v0.1"
  methodology_version   TEXT NOT NULL,

  -- The issuing legal entity
  reviewer_organization TEXT NOT NULL,

  -- Outcome of the assessment (see CHECK constraint below)
  outcome               TEXT NOT NULL,

  -- Institutional validity — separate from processing workflow.
  -- ACTIVE:     currently valid
  -- SUPERSEDED: replaced by a newer assessment; status_reason should contain the replacement assessment_number
  -- WITHDRAWN:  revoked; status_reason should explain why
  institutional_status  TEXT NOT NULL DEFAULT 'ACTIVE',

  -- Reason for a SUPERSEDED or WITHDRAWN status; NULL when ACTIVE.
  status_reason         TEXT,

  -- Processing lifecycle — separate from institutional validity.
  -- DRAFT            → assessment record exists, PDF not yet generated
  -- REPORT_GENERATED → PDF generated, SHA-256 computed, ready for signing
  -- SIGNING          → Numbers Capture API call in progress
  -- SIGNED           → signed asset received, downloaded, stored in Supabase
  -- DELIVERED        → package delivered to customer
  -- FAILED           → failure at any step after DRAFT; see failure_diagnostic
  processing_status     TEXT NOT NULL DEFAULT 'DRAFT',

  -- Preserved when processing_status = FAILED. Never NULL on FAILED rows.
  -- The DB CHECK constraint enforces this; the service layer also enforces it.
  failure_diagnostic    TEXT,

  -- Public Verification Page URL
  -- e.g. https://app.superimmersive8.com/assessment/ASSESS-001-2026-07-10
  verification_url      TEXT NOT NULL,

  -- Numbers Protocol asset identifier (CID), populated after SIGNED
  numbers_asset_id      TEXT,

  -- Supabase Storage path in the 'signed-assets' bucket (private), populated after SIGNED.
  -- We download the signed MP4 from Numbers and store it here permanently.
  -- We do NOT serve signed assets via a permanent Numbers URL.
  signed_asset_path     TEXT,

  -- SHA-256 hex of the delivered PDF. Internal only.
  -- NOT embedded in the C2PA manifest in v1.
  -- NOT displayed on the Verification Page in v1.
  -- confidence is intentionally excluded from the Registry: it is PDF-only (Zone C)
  pdf_hash_sha256       TEXT,

  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── CHECK constraints on enum-like fields ────────────────────────────────────

ALTER TABLE assessments
  ADD CONSTRAINT assessments_outcome_values
  CHECK (outcome IN (
    'EVIDENCE_SUPPORTS',
    'EVIDENCE_SUPPORTS_WITH_CONDITIONS',
    'MATERIAL_RISKS_IDENTIFIED',
    'INSUFFICIENT_EVIDENCE',
    'UNABLE_TO_ASSESS'
  ));

ALTER TABLE assessments
  ADD CONSTRAINT assessments_institutional_status_values
  CHECK (institutional_status IN ('ACTIVE', 'SUPERSEDED', 'WITHDRAWN'));

ALTER TABLE assessments
  ADD CONSTRAINT assessments_processing_status_values
  CHECK (processing_status IN (
    'DRAFT',
    'REPORT_GENERATED',
    'SIGNING',
    'SIGNED',
    'DELIVERED',
    'FAILED'
  ));

-- FAILED rows must always have a diagnostic. Enforced at application layer too,
-- but the DB constraint is the safety net.
ALTER TABLE assessments
  ADD CONSTRAINT assessments_failed_requires_diagnostic
  CHECK (
    processing_status != 'FAILED' OR failure_diagnostic IS NOT NULL
  );

-- ── Indexes (with rationale) ──────────────────────────────────────────────────

-- Verification Page lookup: public route fetches by assessment_number
CREATE UNIQUE INDEX IF NOT EXISTS assessments_assessment_number_idx
  ON assessments (assessment_number);

-- Admin lookup: join from submissions table
CREATE INDEX IF NOT EXISTS assessments_submission_id_idx
  ON assessments (submission_id);

-- Operational queries: e.g. "find all ACTIVE+FAILED", "find all SIGNING (stuck)"
CREATE INDEX IF NOT EXISTS assessments_institutional_processing_idx
  ON assessments (institutional_status, processing_status);

-- ── updated_at trigger ────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_assessments_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER assessments_updated_at
  BEFORE UPDATE ON assessments
  FOR EACH ROW
  EXECUTE PROCEDURE update_assessments_updated_at();

-- ── RLS ───────────────────────────────────────────────────────────────────────
-- Enable RLS. The only user-facing access is the public Verification Page.
-- All admin routes use service_role (supabaseAdmin) and bypass RLS entirely.

ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;

-- Public read for Verification Page — the API route enforces its own field allowlist;
-- this policy allows the anon key to SELECT so server components can use it without
-- requiring service_role in a public-facing route.
CREATE POLICY "assessments_public_select" ON assessments
  FOR SELECT
  USING (true);

-- No INSERT / UPDATE / DELETE via anon key; all writes go through service_role.


-- ── Storage bucket: signed-assets ────────────────────────────────────────────
-- Private bucket for permanently storing signed MP4s downloaded from Numbers.
-- We never serve a Numbers URL as a permanent link.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'signed-assets',
  'signed-assets',
  false,
  524288000,  -- 500 MB
  ARRAY['video/mp4', 'video/quicktime', 'video/webm']
)
ON CONFLICT (id) DO NOTHING;


-- =============================================
-- DOWN (rollback)
-- =============================================
-- DROP TRIGGER IF EXISTS assessments_updated_at ON assessments;
-- DROP FUNCTION IF EXISTS update_assessments_updated_at();
-- DROP TABLE IF EXISTS assessments;
-- DELETE FROM storage.buckets WHERE id = 'signed-assets';
