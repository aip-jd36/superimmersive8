-- Migration: Explicit Publication Authorization (CA-RLK-2g)
-- Date: 2026-09-09
--
-- Accepted design: CA-RLK-2e / 2f / 2f.1 / 2f.2 (design closed).
--
-- Introduces an explicit, audited publication-authorization boundary.
-- Before this, a Public Assessment Record became publicly resolvable purely
-- because processing_status reached 'DELIVERED'. That coupled assessment
-- lifecycle to public exposure. After this:
--
--   publicly visible  ⇔  processing_status = 'DELIVERED'
--                        AND exactly one active (non-revoked) publication
--                            episode exists.
--
-- Publication is NEVER inferred from DELIVERED alone, verification_url,
-- is_system_test, institutional_status, report existence, or provenance state.
--
-- 1. assessment_publications -- one row PER PUBLISH CYCLE for an assessment.
--    * publication_basis:
--        EXPLICIT_AUTHORIZATION   -- a deliberate admin "Publish" command;
--                                    published_by is REQUIRED.
--        LEGACY_DELIVERED_MIGRATION -- the record was ALREADY publicly
--                                    accessible under the pre-CA-RLK-2f
--                                    implicit DELIVERED->public architecture;
--                                    migrated into an episode row WITHOUT
--                                    asserting a deliberate authorization act.
--                                    published_by MAY be NULL (no proven human
--                                    authorizer -- the legacy architecture
--                                    recorded none; founder status is not
--                                    evidence). Only ever the FIRST episode of
--                                    a record, created by this migration.
--    * recorded_at: server-owned. The moment the SYSTEM wrote the row. For an
--        explicit publish this IS the moment the record became public. For a
--        legacy migration it is this migration's execution time -- NOT a
--        fabricated historical publication moment (the exact onset is unknown
--        and is deliberately not represented).
--    * revoked_at / revoked_by / revoked_reason: one coherent revoke state --
--        all NULL (active) or all set (revoked, reason non-empty). Revocation
--        renders the R2 public tombstone; it never mutates the assessment,
--        institutional_status, sign-off, workbook, or provenance.
--    * At most ONE active episode per assessment (partial unique index).
--    * A "republish" is a NEW EXPLICIT_AUTHORIZATION row; prior revoked
--        episodes remain unchanged as audit history. History is never deleted.
--
-- No publication column is added to assessments -- one source of truth for
-- current publication state (the active episode, if any).
--
-- Additive only. No existing table, column, constraint, function, or policy
-- is modified. RLS enabled, service_role-only, same posture as every other
-- internal assessment mutation surface (all reads/writes go through
-- supabaseAdmin in authenticated /api/admin/* routes).

-- =============================================
-- UP
-- =============================================

CREATE TABLE IF NOT EXISTS assessment_publications (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id     UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  publication_basis TEXT NOT NULL,
  recorded_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  published_by      UUID,
  revoked_at        TIMESTAMPTZ,
  revoked_by        UUID,
  revoked_reason    TEXT
);

-- Governed vocabulary.
DO $$ BEGIN
  ALTER TABLE assessment_publications
    ADD CONSTRAINT assessment_publications_basis_values
    CHECK (publication_basis IN ('EXPLICIT_AUTHORIZATION', 'LEGACY_DELIVERED_MIGRATION'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- An explicit authorization must name its actor. A legacy migration may not
-- (and must not fabricate one).
DO $$ BEGIN
  ALTER TABLE assessment_publications
    ADD CONSTRAINT assessment_publications_explicit_requires_actor
    CHECK (publication_basis <> 'EXPLICIT_AUTHORIZATION' OR published_by IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Revoke state is coherent: all three NULL (active) or all set (revoked),
-- and a revoked row must carry a non-empty reason.
DO $$ BEGIN
  ALTER TABLE assessment_publications
    ADD CONSTRAINT assessment_publications_revoke_coherent
    CHECK (
      (revoked_at IS NULL AND revoked_by IS NULL AND revoked_reason IS NULL)
      OR
      (revoked_at IS NOT NULL AND revoked_by IS NOT NULL
        AND revoked_reason IS NOT NULL AND length(btrim(revoked_reason)) > 0)
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- At most one ACTIVE (non-revoked) publication episode per assessment.
CREATE UNIQUE INDEX IF NOT EXISTS assessment_publications_one_active
  ON assessment_publications (assessment_id)
  WHERE revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS assessment_publications_assessment_id
  ON assessment_publications (assessment_id);

ALTER TABLE assessment_publications ENABLE ROW LEVEL SECURITY;
-- No SELECT/INSERT/UPDATE/DELETE policies -- service_role only, same posture
-- as assessments (all access via lib/assessments/repository.ts).
GRANT ALL ON public.assessment_publications TO service_role;

COMMENT ON TABLE assessment_publications IS
  'Explicit publication-authorization episodes (CA-RLK-2g). One row per publish cycle. An active (revoked_at IS NULL) episode + processing_status = DELIVERED is the sole authority for public Assessment Record visibility.';
COMMENT ON COLUMN assessment_publications.publication_basis IS
  'EXPLICIT_AUTHORIZATION (deliberate admin Publish; published_by required) | LEGACY_DELIVERED_MIGRATION (already public under legacy implicit DELIVERED->public; published_by may be NULL; no deliberate act asserted).';
COMMENT ON COLUMN assessment_publications.recorded_at IS
  'Server time the system wrote this episode. For an explicit publish this is when the record became public; for a legacy migration it is the migration run time, NOT a historical publication moment.';

-- ── Legacy record: ASSESS-005-2026-07-12 (Cloud World) ────────────────────────
-- PM decision (CA-RLK-2f.1 #5 / 2f.2 #8): this record remains publicly
-- available. It was already public under the legacy implicit DELIVERED->public
-- architecture. We do NOT fabricate a human authorizer or a historical
-- authorization timestamp (CA-RLK-2f.2): published_by = NULL,
-- recorded_at = this migration's execution time, basis = LEGACY_DELIVERED_MIGRATION.
--
-- FAIL LOUD (CA-RLK-2g-D1 §O, CA-RLK-2g-D2 §2). This migration's primary
-- obligation is to carry the one existing public record across the
-- architecture change. A silent skip would let the migration "succeed" while
-- failing that obligation -- and the moment the new app deploys, the record's
-- public page goes dark with no signal anything went wrong. So:
--
--   * ASSESS-005-2026-07-12 absent            -> RAISE EXCEPTION, abort.
--   * ASSESS-005-2026-07-12 not DELIVERED     -> RAISE EXCEPTION, abort.
--   * an ACTIVE episode already exists        -> idempotent no-op, success.
--   * revoked history, NO active episode      -> RAISE EXCEPTION, abort.
--       A prior revoked episode means publication was DELIBERATELY revoked
--       under the new architecture. Re-running this migration must never
--       silently re-publish it.
--   * zero episodes                           -> insert the legacy episode.
--
-- No blanket backfill of other DELIVERED rows. ASSESS-007-2026-09-07 is not
-- referenced and receives no episode (it is not DELIVERED, and even if it were
-- this block only ever touches ASSESS-005-2026-07-12).
DO $$
DECLARE
  v_id           UUID;
  v_status       TEXT;
  v_total_count  INTEGER;
  v_active_count INTEGER;
BEGIN
  SELECT id, processing_status
    INTO v_id, v_status
    FROM assessments
   WHERE assessment_number = 'ASSESS-005-2026-07-12';

  IF v_id IS NULL THEN
    RAISE EXCEPTION
      'CA-RLK-2g: assessment ASSESS-005-2026-07-12 not found; refusing to apply (expected legacy public record is missing)';
  END IF;

  IF v_status IS DISTINCT FROM 'DELIVERED' THEN
    RAISE EXCEPTION
      'CA-RLK-2g: assessment ASSESS-005-2026-07-12 has processing_status %, expected DELIVERED; refusing to apply', v_status;
  END IF;

  SELECT
      count(*),
      count(*) FILTER (WHERE revoked_at IS NULL)
    INTO v_total_count, v_active_count
    FROM assessment_publications
   WHERE assessment_id = v_id;

  IF v_active_count > 0 THEN
    -- Legitimate idempotent re-run: an active episode is already present.
    RAISE NOTICE 'CA-RLK-2g: ASSESS-005-2026-07-12 already has an active publication episode; idempotent no-op';
  ELSIF v_total_count > 0 THEN
    -- Revoked history, no active episode: the revocation was deliberate.
    RAISE EXCEPTION
      'CA-RLK-2g: ASSESS-005-2026-07-12 has revoked publication history and no active episode; refusing to silently re-publish (revocation is a deliberate act under the new architecture)';
  ELSE
    -- Zero episodes: establish the legacy episode. No fabricated actor, no
    -- historical timestamp (CA-RLK-2f.2).
    INSERT INTO assessment_publications (assessment_id, publication_basis, recorded_at, published_by)
    VALUES (v_id, 'LEGACY_DELIVERED_MIGRATION', now(), NULL);
  END IF;
END $$;

-- =============================================
-- DOWN (rollback)
-- =============================================
-- DROP TABLE IF EXISTS assessment_publications;
