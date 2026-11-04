-- CR-V2-UAT-PROD-MIN-1 — invite ONE dedicated SI8 synthetic test identity to the Creator Record v2 pilot list.
-- Database operator only (SQL Editor of the TARGET project). One DO block; nothing is returned except success.
-- NOT AUTHORIZED TO RUN until a PM decision approves the identity and the UAT window.
--
-- Scope: this script exists ONLY for the identity-scoped synthetic UAT (synthetic-uat.ts). It refuses any identity
-- that is an admin, already invited, or has any history (submission, prepared record, live document, UAT grant): a
-- real creator can never be invited with it. An invitation grants nothing on its own while the submissions stop is
-- in force; it is one of the three locks (code window, invitation, database grant).
--
-- Before running:
--   1. The identity exists (Authentication → Add user, auto-confirm, random password kept by the tester only).
--   2. Confirm the project ref in the dashboard URL matches c_project_ref.
-- Edit ONLY the constants marked EDIT. Every check fails closed; on any error nothing is written.
-- Undo: remove_pilot_user.sql. These checks are LAYERED OPERATOR SAFEGUARDS, not authentication of the database.

DO $invite$
DECLARE
  c_target           constant text := 'EDIT: production | staging';
  c_project_ref      constant text := 'EDIT: 20-character project ref shown in the dashboard URL';
  c_test_user_email  constant text := 'EDIT: the dedicated synthetic test identity''s email';
  c_added_by         constant text := 'EDIT: operator name';
  c_change_ref       constant text := 'EDIT: approval reference';
  v_user  uuid;
  v_n     integer;
BEGIN
  IF c_target LIKE 'EDIT:%' OR c_project_ref LIKE 'EDIT:%' OR c_test_user_email LIKE 'EDIT:%' OR c_added_by LIKE 'EDIT:%' OR c_change_ref LIKE 'EDIT:%' THEN
    RAISE EXCEPTION 'REFUSED: edit every EDIT constant first';
  END IF;
  IF c_target NOT IN ('production', 'staging') THEN
    RAISE EXCEPTION 'REFUSED: c_target must be production or staging';
  END IF;
  IF c_project_ref !~ '^[a-z0-9]{20}$' THEN
    RAISE EXCEPTION 'REFUSED: malformed project ref';
  END IF;
  IF to_regclass('public.creator_record_v2_pilot_access') IS NULL THEN
    RAISE EXCEPTION 'REFUSED: no pilot invitation table here';
  END IF;

  -- Target safeguard, exactly as create_grant.sql (supporting evidence only; told apart by methodology_version alone).
  IF to_regclass('public.assessments') IS NULL THEN
    RAISE EXCEPTION 'REFUSED: no assessments table; cannot apply the target safeguard';
  END IF;
  IF c_target = 'production' THEN
    IF c_project_ref <> 'lehqgcgnenwdmuzudbrs' THEN
      RAISE EXCEPTION 'REFUSED: a production invitation must name the Production project ref';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.assessments WHERE assessment_number = 'ASSESS-005-2026-07-12'
                     AND methodology_version IS DISTINCT FROM 'STAGING-PLACEHOLDER') THEN
      RAISE EXCEPTION 'REFUSED: this database does not look like Production';
    END IF;
  ELSE
    IF c_project_ref = 'lehqgcgnenwdmuzudbrs' THEN
      RAISE EXCEPTION 'REFUSED: a staging invitation can never name the Production project ref';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.assessments WHERE assessment_number = 'ASSESS-005-2026-07-12'
                     AND methodology_version = 'STAGING-PLACEHOLDER' AND is_system_test) THEN
      RAISE EXCEPTION 'REFUSED: this database does not look like the staging database';
    END IF;
  END IF;

  SELECT count(*) INTO v_n FROM public.users WHERE lower(email) = lower(trim(c_test_user_email));
  IF v_n <> 1 THEN
    RAISE EXCEPTION 'REFUSED: exactly one user must have that email (found %)', v_n;
  END IF;
  SELECT id INTO v_user FROM public.users WHERE lower(email) = lower(trim(c_test_user_email));

  -- A dedicated, history-free test identity only.
  IF EXISTS (SELECT 1 FROM public.users WHERE id = v_user AND is_admin IS TRUE) THEN
    RAISE EXCEPTION 'REFUSED: the identity is an admin';
  END IF;
  IF EXISTS (SELECT 1 FROM public.creator_record_v2_pilot_access WHERE user_id = v_user) THEN
    RAISE EXCEPTION 'REFUSED: the identity is already invited';
  END IF;
  IF EXISTS (SELECT 1 FROM public.submissions WHERE user_id = v_user)
     OR EXISTS (SELECT 1 FROM public.creator_record_v2_prepared WHERE user_id = v_user)
     OR (to_regclass('public.creator_record_v2_documents') IS NOT NULL AND EXISTS (SELECT 1 FROM public.creator_record_v2_documents WHERE user_id = v_user AND state <> 'deleted'))
     OR (to_regclass('public.creator_record_v2_examination_uat_grants') IS NOT NULL AND EXISTS (SELECT 1 FROM public.creator_record_v2_examination_uat_grants WHERE test_user_id = v_user)) THEN
    RAISE EXCEPTION 'REFUSED: the identity has history (submission, prepared record, live document or UAT grant); use a fresh identity';
  END IF;

  INSERT INTO public.creator_record_v2_pilot_access (user_id, added_by, reason)
  VALUES (v_user, c_added_by, 'CR-V2-UAT-PROD-MIN synthetic UAT identity; ' || c_change_ref);
  RAISE NOTICE 'invited the synthetic UAT identity (%)', c_change_ref;
END
$invite$;
