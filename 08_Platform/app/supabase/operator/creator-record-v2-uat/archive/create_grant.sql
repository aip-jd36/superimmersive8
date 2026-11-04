-- CR-V2-PROD-UAT-B — create ONE operator synthetic examination UAT grant (migration 20261105000000).
-- Database operator only (SQL Editor of the TARGET project). One DO block; nothing is returned except success.
--
-- Before running:
--   1. In the operator shell: `npx tsx scripts/creator-record-v2-uat/examination-uat.ts nonce` → keep the code as
--      SI8_UAT_NONCE in that shell; paste ONLY its binding_nonce_sha256 below.
--   2. The dedicated test identity exists (Authentication → Add user, auto-confirm, random password discarded) and
--      has no admin flag, pilot invitation, submission, prepared record or live document. The database re-checks.
--   3. Confirm the project ref in the dashboard URL matches c_project_ref.
-- Edit ONLY the constants marked EDIT. Every check below fails closed; on any error nothing is written.
-- These checks are LAYERED OPERATOR SAFEGUARDS, not authentication of the database's identity.

DO $grant$
DECLARE
  c_target            constant text    := 'EDIT: production | staging';
  c_project_ref       constant text    := 'EDIT: 20-character project ref shown in the dashboard URL';
  c_test_user_email   constant text    := 'EDIT: the dedicated test identity''s email';
  c_fixture_id        constant text    := 'EDIT: committed fixture id, e.g. pdf-kling-pro-monthly';
  c_nonce_sha256      constant text    := 'EDIT: binding_nonce_sha256 printed by the `nonce` command';
  c_established_by    constant text    := 'EDIT: operator name';
  c_change_ref        constant text    := 'EDIT: approval reference';
  c_reason            constant text    := 'EDIT: reason';
  c_max_read_events   constant integer := 4;    -- 1..4 (database CHECK)
  c_window_minutes    constant integer := 120;  -- at most 120 (database CHECK)
  v_user   uuid;
  v_sha    text;
  v_n      integer;
BEGIN
  IF c_target LIKE 'EDIT:%' OR c_project_ref LIKE 'EDIT:%' OR c_test_user_email LIKE 'EDIT:%' OR c_fixture_id LIKE 'EDIT:%'
     OR c_nonce_sha256 LIKE 'EDIT:%' OR c_established_by LIKE 'EDIT:%' OR c_change_ref LIKE 'EDIT:%' OR c_reason LIKE 'EDIT:%' THEN
    RAISE EXCEPTION 'REFUSED: edit every EDIT constant first';
  END IF;
  IF c_target NOT IN ('production', 'staging') THEN
    RAISE EXCEPTION 'REFUSED: c_target must be production or staging';
  END IF;
  IF c_project_ref !~ '^[a-z0-9]{20}$' OR c_nonce_sha256 !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION 'REFUSED: malformed project ref or binding code hash';
  END IF;
  IF c_window_minutes NOT BETWEEN 1 AND 120 OR c_max_read_events NOT BETWEEN 1 AND 4 THEN
    RAISE EXCEPTION 'REFUSED: window 1..120 minutes, read events 1..4';
  END IF;
  IF to_regclass('public.creator_record_v2_examination_uat_grants') IS NULL THEN
    RAISE EXCEPTION 'REFUSED: migration 20261105000000 is not applied here';
  END IF;

  -- Target safeguard: Production holds the real Cloud World assessment ASSESS-005-2026-07-12; staging holds the
  -- placeholder that supabase/staging/before_20260909000000_assessment_publications.sql inserts. Supporting evidence only.
  -- The two are told apart by methodology_version alone. is_system_test is NOT a discriminator: 20260719000000 marks the
  -- real Production record is_system_test = true (Cloud World is SI8's own system-test assessment), and the staging
  -- placeholder is true as well (verified in Production by CR-V2-PROD-UAT-C1C, 2026-11-03).
  IF to_regclass('public.assessments') IS NULL THEN
    RAISE EXCEPTION 'REFUSED: no assessments table; cannot apply the target safeguard';
  END IF;
  IF c_target = 'production' THEN
    IF c_project_ref <> 'lehqgcgnenwdmuzudbrs' THEN
      RAISE EXCEPTION 'REFUSED: a production grant must name the Production project ref';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.assessments WHERE assessment_number = 'ASSESS-005-2026-07-12'
                     AND methodology_version IS DISTINCT FROM 'STAGING-PLACEHOLDER') THEN
      RAISE EXCEPTION 'REFUSED: this database does not look like Production';
    END IF;
  ELSE
    IF c_project_ref = 'lehqgcgnenwdmuzudbrs' THEN
      RAISE EXCEPTION 'REFUSED: a staging grant can never name the Production project ref';
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
  SELECT sha256 INTO v_sha FROM public.creator_record_v2_synthetic_fixtures WHERE fixture_id = c_fixture_id;
  IF v_sha IS NULL THEN
    RAISE EXCEPTION 'REFUSED: % is not a committed synthetic fixture', c_fixture_id;
  END IF;

  -- The grant guard re-checks: no marker, no other active grant, a dedicated identity, no live document.
  INSERT INTO public.creator_record_v2_examination_uat_grants
    (test_user_id, document_sha256, supabase_project_ref, binding_nonce_sha256, established_by, reason, change_ref, expires_at, max_read_events)
  VALUES
    (v_user, v_sha, c_project_ref, c_nonce_sha256, c_established_by, c_reason, c_change_ref, now() + make_interval(mins => c_window_minutes), c_max_read_events);
  RAISE NOTICE 'grant created for % until %', c_fixture_id, now() + make_interval(mins => c_window_minutes);
END
$grant$;
