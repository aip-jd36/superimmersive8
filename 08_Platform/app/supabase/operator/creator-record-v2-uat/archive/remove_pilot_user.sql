-- CR-V2-UAT-PROD-MIN-1 — remove the synthetic UAT identity's Creator Record v2 pilot invitation (undo of
-- invite_pilot_user.sql). Database operator only (SQL Editor of the TARGET project). One DO block.
--
-- Removes exactly ONE invitation, and only one that invite_pilot_user.sql created (its reason marks it). Deletes nothing
-- else: the identity, its documents, examination runs, prepared versions and any grant stay (they are append-only
-- history). With the invitation gone, every Creator Record v2 customer operation refuses that identity (403), even inside
-- an open UAT window. Revoke any active grant separately (revoke_grant.sql).
-- Edit ONLY the constants marked EDIT. Every check fails closed; on any error nothing is changed.

DO $remove$
DECLARE
  c_target           constant text := 'EDIT: production | staging';
  c_project_ref      constant text := 'EDIT: 20-character project ref shown in the dashboard URL';
  c_test_user_email  constant text := 'EDIT: the synthetic test identity''s email';
  v_user  uuid;
  v_n     integer;
BEGIN
  IF c_target LIKE 'EDIT:%' OR c_project_ref LIKE 'EDIT:%' OR c_test_user_email LIKE 'EDIT:%' THEN
    RAISE EXCEPTION 'REFUSED: edit every EDIT constant first';
  END IF;
  IF c_target NOT IN ('production', 'staging') THEN
    RAISE EXCEPTION 'REFUSED: c_target must be production or staging';
  END IF;
  IF c_project_ref !~ '^[a-z0-9]{20}$' THEN
    RAISE EXCEPTION 'REFUSED: malformed project ref';
  END IF;
  IF to_regclass('public.assessments') IS NULL THEN
    RAISE EXCEPTION 'REFUSED: no assessments table; cannot apply the target safeguard';
  END IF;
  IF c_target = 'production' THEN
    IF c_project_ref <> 'lehqgcgnenwdmuzudbrs' OR NOT EXISTS (SELECT 1 FROM public.assessments WHERE assessment_number = 'ASSESS-005-2026-07-12'
                     AND methodology_version IS DISTINCT FROM 'STAGING-PLACEHOLDER') THEN
      RAISE EXCEPTION 'REFUSED: this database does not look like Production';
    END IF;
  ELSE
    IF c_project_ref = 'lehqgcgnenwdmuzudbrs' OR NOT EXISTS (SELECT 1 FROM public.assessments WHERE assessment_number = 'ASSESS-005-2026-07-12'
                     AND methodology_version = 'STAGING-PLACEHOLDER' AND is_system_test) THEN
      RAISE EXCEPTION 'REFUSED: this database does not look like the staging database';
    END IF;
  END IF;

  SELECT count(*) INTO v_n FROM public.users WHERE lower(email) = lower(trim(c_test_user_email));
  IF v_n <> 1 THEN
    RAISE EXCEPTION 'REFUSED: exactly one user must have that email (found %)', v_n;
  END IF;
  SELECT id INTO v_user FROM public.users WHERE lower(email) = lower(trim(c_test_user_email));

  DELETE FROM public.creator_record_v2_pilot_access
   WHERE user_id = v_user AND reason LIKE 'CR-V2-UAT-PROD-MIN synthetic UAT identity; %';
  GET DIAGNOSTICS v_n = ROW_COUNT;
  IF v_n <> 1 THEN
    RAISE EXCEPTION 'REFUSED: no synthetic UAT invitation for that identity (removed %); nothing changed', v_n;
  END IF;
  RAISE NOTICE 'removed the synthetic UAT invitation';
END
$remove$;
