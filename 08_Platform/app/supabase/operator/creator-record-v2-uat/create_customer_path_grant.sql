-- CR-V2-EXAM-INTEGRATION-X1 — create ONE customer-path synthetic examination UAT grant (migration 20261106000000).
-- Database operator only (SQL Editor of the TARGET project). One DO block; nothing is returned except success.
-- NOT AUTHORIZED FOR PRODUCTION until a separate PM decision approves the test identity, fixture and window.
--
-- A customer_path_uat grant lets ONE approved test identity have ONE upload of its own examined: the identity uploads the
-- committed synthetic fixture through the ordinary DOC-1 intake (origin owner_upload, consent recorded); the first
-- examination read binds the grant to that document. Nobody can seed a document under it.
--
-- Before running:
--   1. In the operator shell: `npx tsx scripts/creator-record-v2-uat/examination-uat.ts nonce` → keep the code as
--      SI8_UAT_NONCE in that shell; paste ONLY its binding_nonce_sha256 below. Never reuse a code from an earlier grant.
--   2. The approved test identity exists, is non-admin and pilot-invited, has never held any UAT grant, and has no
--      submission, prepared record or live document. The database re-checks every one of these.
--   3. No other grant is active and no isolated-test marker exists (the database re-checks).
--   4. Confirm the project ref in the dashboard URL matches c_project_ref.
-- Edit ONLY the constants marked EDIT. Every check below fails closed; on any error nothing is written.
-- These checks are LAYERED OPERATOR SAFEGUARDS, not authentication of the database's identity.

DO $grant$
DECLARE
  c_target            constant text    := 'EDIT: production | staging';
  c_project_ref       constant text    := 'EDIT: 20-character project ref shown in the dashboard URL';
  c_test_user_email   constant text    := 'EDIT: the approved test identity''s email';
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
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public'
                   AND table_name = 'creator_record_v2_examination_uat_grants' AND column_name = 'grant_kind') THEN
    RAISE EXCEPTION 'REFUSED: migration 20261106000000 is not applied here';
  END IF;

  -- Target safeguard, exactly as create_grant.sql (supporting evidence only; told apart by methodology_version alone).
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

  -- The grant guard re-checks: no marker, no other active grant, an approved identity with no history.
  INSERT INTO public.creator_record_v2_examination_uat_grants
    (grant_kind, test_user_id, document_sha256, supabase_project_ref, binding_nonce_sha256, established_by, reason, change_ref, expires_at, max_read_events)
  VALUES
    ('customer_path_uat', v_user, v_sha, c_project_ref, c_nonce_sha256, c_established_by, c_reason, c_change_ref, now() + make_interval(mins => c_window_minutes), c_max_read_events);
  RAISE NOTICE 'customer-path grant created for % until %', c_fixture_id, now() + make_interval(mins => c_window_minutes);
END
$grant$;
