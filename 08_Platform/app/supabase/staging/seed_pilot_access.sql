-- CR-V2-MVP-M4C — STAGING ONLY. Adds ONE test creator to the Creator Record v2 pilot invite list.
--
-- Run after all migrations (through 20261102000000, M3), and after the test creator exists in the
-- staging project (Supabase dashboard → Authentication → Add user, auto-confirm; the auth trigger
-- creates the matching public.users row). Usage:
--
--   psql -X -v ON_ERROR_STOP=1 -v creator_email=<test creator email> -f seed_pilot_access.sql -d "$STAGING_DATABASE_URL"
--
-- Refuses unless this database is the staging database: its ASSESS-005-2026-07-12 must be the staging
-- placeholder inserted by before_20260909000000_assessment_publications.sql. Production's is the real
-- Cloud World assessment, so this script cannot add anyone to Production's invite list.

\set ON_ERROR_STOP on
SELECT set_config('si8.staging_creator_email', :'creator_email', false);

DO $$
DECLARE
  v_email text := lower(trim(current_setting('si8.staging_creator_email')));
  v_user  uuid;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.assessments
     WHERE assessment_number = 'ASSESS-005-2026-07-12' AND methodology_version = 'STAGING-PLACEHOLDER' AND is_system_test
  ) THEN
    RAISE EXCEPTION 'not the staging database (no staging placeholder for ASSESS-005-2026-07-12); refusing';
  END IF;
  IF to_regclass('public.creator_record_v2_pilot_access') IS NULL THEN
    RAISE EXCEPTION 'creator_record_v2_pilot_access does not exist: apply migrations through M3 first';
  END IF;
  SELECT id INTO v_user FROM public.users WHERE lower(email) = v_email;
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'no public.users row for %: create the test creator in the staging project first', v_email;
  END IF;
  INSERT INTO public.creator_record_v2_pilot_access (user_id, added_by, reason)
  VALUES (v_user, 'CR-V2-MVP-M4C staging setup', 'Synthetic staging rehearsal test creator (not a customer)')
  ON CONFLICT (user_id) DO NOTHING;
  RAISE NOTICE 'pilot access present for % (%)', v_email, v_user;
END $$;
