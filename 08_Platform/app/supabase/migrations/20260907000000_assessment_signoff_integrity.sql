-- Migration: Commercial Assurance assessment integrity hardening (CA-RLK-2a)
-- Date: 2026-09-07
--
-- Accepted design: CA-RLK-1 diagnostic + CA-RLK-2a design + CA-RLK-2a-IMPL
-- (two binding corrections: preserve invalidated sign-off provenance; a real
-- workbook->sign-off concurrency invariant via workbook_revision).
--
-- The `assessments` row becomes the durable HUMAN DECISION record. It is
-- created by the reviewer's sign-off act (not by Generate Report). This
-- migration adds:
--
--   1. actor-bearing, system-timestamped sign-off on `assessments`, with an
--      `invalidated` state that PRESERVES who/when signed even after a later
--      workbook edit clears the active sign-off (correction #1);
--   2. `submissions.workbook_revision` — an authoritative monotonic counter
--      bumped on every workbook mutation; the sign-off binds one exact
--      revision, and the atomic RPCs below make a stale active sign-off
--      impossible (correction #2);
--   3. historical asset descriptors (`asset_title`/`asset_media_type`/
--      `asset_runtime`) so a mutable `submissions.title`/`runtime` can no
--      longer rewrite a delivered Public Assessment Record;
--   4. `scope_domain_codes` — the COMPLETE methodology-version domain set,
--      snapshotted at sign-off, so a future methodology domain change cannot
--      rewrite the scope section of an existing record. N/A control judgments
--      never remove a domain from this list.
--
-- Additive only. No existing column, constraint, function, policy, or the
-- `assessments_updated_at` trigger is modified. Legacy rows: sign-off actor
-- and timestamp stay NULL (NOT fabricated); descriptive asset/scope facts are
-- backfilled from present truth.
--
-- NOT added (deferred): assessment_signoffs table, assessment_events,
-- knowledge_claim_refs, reviewer-role schema, LK columns, CRC columns,
-- outcome_label.

-- =============================================
-- UP
-- =============================================

-- ── assessments: durable sign-off + snapshots ───────────────────────────────

ALTER TABLE assessments
  ADD COLUMN IF NOT EXISTS signed_off_by            UUID,
  ADD COLUMN IF NOT EXISTS signed_off_at            TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS signoff_status           TEXT,
  ADD COLUMN IF NOT EXISTS signoff_invalidated_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS signoff_invalidated_by   UUID,
  ADD COLUMN IF NOT EXISTS signed_workbook_revision BIGINT,
  ADD COLUMN IF NOT EXISTS asset_title              TEXT,
  ADD COLUMN IF NOT EXISTS asset_media_type         TEXT NOT NULL DEFAULT 'Video',
  ADD COLUMN IF NOT EXISTS asset_runtime            INTEGER,
  ADD COLUMN IF NOT EXISTS scope_domain_codes       TEXT[];

DO $$ BEGIN
  ALTER TABLE assessments
    ADD CONSTRAINT assessments_signoff_status_values
    CHECK (signoff_status IS NULL OR signoff_status IN ('active', 'invalidated'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- A present sign-off (active OR invalidated) always has actor + time + the
-- exact bound workbook revision. An invalidated one additionally has an
-- invalidation time. signoff_status NULL = legacy row, no sign-off provenance.
DO $$ BEGIN
  ALTER TABLE assessments
    ADD CONSTRAINT assessments_signoff_consistency
    CHECK (
      signoff_status IS NULL
      OR (
        signed_off_by IS NOT NULL
        AND signed_off_at IS NOT NULL
        AND signed_workbook_revision IS NOT NULL
        AND (signoff_status <> 'invalidated' OR signoff_invalidated_at IS NOT NULL)
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS assessments_signoff_status_idx
  ON assessments (signoff_status);

-- ── submissions: authoritative workbook revision ────────────────────────────

ALTER TABLE submissions
  ADD COLUMN IF NOT EXISTS workbook_revision BIGINT NOT NULL DEFAULT 0;

-- ── legacy backfill (descriptive facts only — NO fabricated provenance) ─────
--
-- asset_title / asset_runtime: the value the Verification Page shows today
-- (via the submissions join). Freezing it now stops future drift; it is the
-- present truth, not an invention.
-- scope_domain_codes: the seven domains — the same set for methodology v0.1
-- and v0.2 (verified: no domain-set change between versions).
-- signed_off_by / signed_off_at / signoff_status: deliberately left NULL.

UPDATE assessments a SET
  asset_title        = COALESCE(a.asset_title, s.title),
  asset_runtime      = COALESCE(a.asset_runtime, s.runtime),
  scope_domain_codes = COALESCE(a.scope_domain_codes, ARRAY['A','R','H','I','L','T','D'])
FROM submissions s
WHERE s.id = a.submission_id;

-- =============================================
-- RPC 1 — atomic workbook mutation + sign-off invalidation
-- =============================================
--
-- ONE transaction: bump workbook_revision, and if an ACTIVE sign-off exists on
-- a pre-delivery assessment, flip it to 'invalidated' WHILE PRESERVING
-- signed_off_by / signed_off_at / signed_workbook_revision (correction #1),
-- and (if REPORT_GENERATED) revert to DRAFT and clear the stale report binding.
-- A DELIVERED assessment blocks the whole operation (409 at the route).
-- An already-invalidated sign-off is NOT touched again — the FIRST
-- invalidation time is preserved until re-sign (CA-RLK-2a §14).

CREATE OR REPLACE FUNCTION patch_workbook_atomic(
  p_submission_id UUID,
  p_workbook_data JSONB,
  p_actor         UUID
) RETURNS JSONB AS $$
DECLARE
  v_has_assessment BOOLEAN;
  v_a              assessments%ROWTYPE;
  v_rev            BIGINT;
  v_signoff_invalidated BOOLEAN := false;
  v_report_invalidated  BOOLEAN := false;
BEGIN
  PERFORM 1 FROM submissions WHERE id = p_submission_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'code', 'submission_not_found');
  END IF;

  SELECT * INTO v_a FROM assessments WHERE submission_id = p_submission_id FOR UPDATE;
  v_has_assessment := FOUND;

  IF v_has_assessment AND v_a.processing_status = 'DELIVERED' THEN
    RETURN jsonb_build_object('ok', false, 'code', 'delivered');
  END IF;

  UPDATE submissions
     SET workbook_data     = p_workbook_data,
         workbook_revision = workbook_revision + 1
   WHERE id = p_submission_id
   RETURNING workbook_revision INTO v_rev;

  IF v_has_assessment AND v_a.signoff_status = 'active' THEN
    UPDATE assessments SET
      signoff_status         = 'invalidated',
      signoff_invalidated_at = now(),
      signoff_invalidated_by = p_actor,
      processing_status      = CASE WHEN processing_status = 'REPORT_GENERATED'
                                    THEN 'DRAFT' ELSE processing_status END
    WHERE id = v_a.id;
    v_signoff_invalidated := true;

    IF v_a.processing_status = 'REPORT_GENERATED' THEN
      UPDATE submissions
         SET report_pdf_url = NULL, report_pdf_assessment_id = NULL
       WHERE id = p_submission_id;
      v_report_invalidated := true;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'workbook_revision', v_rev,
    'signoff_invalidated', v_signoff_invalidated,
    'report_invalidated', v_report_invalidated
  );
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- RPC 2 — atomic durable sign-off / re-sign
-- =============================================
--
-- Creates the assessment row (fresh) or re-signs an existing invalidated /
-- drifted one, ONLY IF submissions.workbook_revision still equals the exact
-- revision the caller validated (correction #2). The submissions row is locked
-- FOR UPDATE, so a concurrent patch_workbook_atomic either committed before
-- (revision moved -> this returns 'workbook_changed') or blocks until this
-- commits (then its own revision bump invalidates this sign-off). A stale
-- 'active' sign-off for an older revision is therefore impossible.
--
-- assessment_date and signed_off_at are DB-derived (CURRENT_DATE / now()) --
-- never client-supplied. actor is the authenticated user id passed by the
-- trusted route. Methodology completeness validation happens in TypeScript
-- before this is called; this function trusts it and does not re-implement it.

CREATE OR REPLACE FUNCTION sign_off_assessment(
  p_submission_id         UUID,
  p_actor                 UUID,
  p_expected_revision     BIGINT,
  p_outcome               TEXT,
  p_methodology_version   TEXT,
  p_reviewer_organization TEXT,
  p_site_url              TEXT,
  p_asset_title           TEXT,
  p_asset_media_type      TEXT,
  p_asset_runtime         INTEGER,
  p_scope_domain_codes    TEXT[]
) RETURNS JSONB AS $$
DECLARE
  v_rev    BIGINT;
  v_a      assessments%ROWTYPE;
  v_number TEXT;
  v_now    TIMESTAMPTZ := now();
  v_today  DATE := (now())::date;
BEGIN
  SELECT workbook_revision INTO v_rev FROM submissions WHERE id = p_submission_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'code', 'submission_not_found');
  END IF;
  IF v_rev IS DISTINCT FROM p_expected_revision THEN
    RETURN jsonb_build_object('ok', false, 'code', 'workbook_changed', 'current_revision', v_rev);
  END IF;

  SELECT * INTO v_a FROM assessments WHERE submission_id = p_submission_id FOR UPDATE;

  IF FOUND THEN
    IF v_a.processing_status NOT IN ('DRAFT', 'REPORT_GENERATED') THEN
      RETURN jsonb_build_object('ok', false, 'code', 'not_pre_delivery',
                                'processing_status', v_a.processing_status);
    END IF;

    -- Idempotent: an unchanged active sign-off for this exact revision + decision
    IF v_a.signoff_status = 'active'
       AND v_a.signed_workbook_revision = p_expected_revision
       AND v_a.outcome = p_outcome
       AND v_a.methodology_version = p_methodology_version
       AND v_a.asset_title IS NOT DISTINCT FROM p_asset_title
       AND v_a.asset_runtime IS NOT DISTINCT FROM p_asset_runtime
       AND v_a.scope_domain_codes = p_scope_domain_codes THEN
      RETURN jsonb_build_object('ok', true, 'idempotent', true, 'assessment', to_jsonb(v_a));
    END IF;

    -- Re-sign (was invalidated, or the decision snapshot drifted)
    UPDATE assessments SET
      signed_off_by            = p_actor,
      signed_off_at            = v_now,
      signoff_status           = 'active',
      signoff_invalidated_at   = NULL,
      signoff_invalidated_by   = NULL,
      signed_workbook_revision = p_expected_revision,
      outcome                  = p_outcome,
      methodology_version      = p_methodology_version,
      reviewer_organization    = p_reviewer_organization,
      assessment_date          = v_today,
      asset_title              = p_asset_title,
      asset_media_type         = p_asset_media_type,
      asset_runtime            = p_asset_runtime,
      scope_domain_codes       = p_scope_domain_codes,
      processing_status        = CASE WHEN v_a.processing_status = 'REPORT_GENERATED'
                                      THEN 'DRAFT' ELSE v_a.processing_status END
    WHERE id = v_a.id
    RETURNING * INTO v_a;

    UPDATE submissions
       SET report_pdf_url = NULL, report_pdf_assessment_id = NULL
     WHERE id = p_submission_id AND report_pdf_assessment_id = v_a.id;

    RETURN jsonb_build_object('ok', true, 'resigned', true, 'assessment', to_jsonb(v_a));
  END IF;

  -- Fresh create
  v_number := generate_assessment_number();
  BEGIN
    INSERT INTO assessments (
      submission_id, assessment_number, assessment_date, methodology_version,
      reviewer_organization, outcome, institutional_status, status_reason,
      processing_status, is_system_test, failure_diagnostic, verification_url,
      numbers_asset_id, signed_asset_path, pdf_hash_sha256,
      signed_off_by, signed_off_at, signoff_status,
      signed_workbook_revision, asset_title, asset_media_type, asset_runtime,
      scope_domain_codes
    ) VALUES (
      p_submission_id, v_number, v_today, p_methodology_version,
      p_reviewer_organization, p_outcome, 'ACTIVE', NULL,
      'DRAFT', false, NULL, p_site_url || '/assessment/' || v_number,
      NULL, NULL, NULL,
      p_actor, v_now, 'active',
      p_expected_revision, p_asset_title, p_asset_media_type, p_asset_runtime,
      p_scope_domain_codes
    )
    RETURNING * INTO v_a;
  EXCEPTION WHEN unique_violation THEN
    SELECT * INTO v_a FROM assessments WHERE submission_id = p_submission_id;
    RETURN jsonb_build_object('ok', true, 'idempotent', true, 'assessment', to_jsonb(v_a));
  END;

  RETURN jsonb_build_object('ok', true, 'created', true, 'assessment', to_jsonb(v_a));
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- DOWN (rollback) -- commented, matching repo convention
-- =============================================
-- DROP FUNCTION IF EXISTS sign_off_assessment(UUID, UUID, BIGINT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER, TEXT[]);
-- DROP FUNCTION IF EXISTS patch_workbook_atomic(UUID, JSONB, UUID);
-- DROP INDEX IF EXISTS assessments_signoff_status_idx;
-- ALTER TABLE submissions DROP COLUMN IF EXISTS workbook_revision;
-- ALTER TABLE assessments DROP CONSTRAINT IF EXISTS assessments_signoff_consistency;
-- ALTER TABLE assessments DROP CONSTRAINT IF EXISTS assessments_signoff_status_values;
-- ALTER TABLE assessments
--   DROP COLUMN IF EXISTS scope_domain_codes,
--   DROP COLUMN IF EXISTS asset_runtime,
--   DROP COLUMN IF EXISTS asset_media_type,
--   DROP COLUMN IF EXISTS asset_title,
--   DROP COLUMN IF EXISTS signed_workbook_revision,
--   DROP COLUMN IF EXISTS signoff_invalidated_by,
--   DROP COLUMN IF EXISTS signoff_invalidated_at,
--   DROP COLUMN IF EXISTS signoff_status,
--   DROP COLUMN IF EXISTS signed_off_at,
--   DROP COLUMN IF EXISTS signed_off_by;
