-- STAGING ONLY. Never run against Production (Production already has the real ASSESS-005-2026-07-12).
-- Migration 20260909000000 refuses to apply unless the legacy public assessment ASSESS-005-2026-07-12
-- exists and is DELIVERED. A fresh staging database has no such record, so this inserts a clearly
-- labelled placeholder (system-test, no login, no real customer data) immediately before it.
DO $$
DECLARE
  v_user uuid := '00000000-0000-4000-8000-00000000a005';
  v_sub  uuid := '00000000-0000-4000-8000-00000000b005';
BEGIN
  IF EXISTS (SELECT 1 FROM public.assessments WHERE assessment_number = 'ASSESS-005-2026-07-12') THEN
    RAISE EXCEPTION 'ASSESS-005-2026-07-12 already exists: this is not a fresh staging database; refusing';
  END IF;
  INSERT INTO auth.users (id, email) VALUES (v_user, 'staging-placeholder-assess-005@invalid.example');
  INSERT INTO public.users (id, email, name) VALUES (v_user, 'staging-placeholder-assess-005@invalid.example', 'STAGING PLACEHOLDER')
    ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.submissions (id, user_id, title, filmmaker_name, tools_used, authorship_statement, likeness_confirmation, ip_confirmation, audio_disclosure)
    VALUES (v_sub, v_user, 'STAGING PLACEHOLDER for ASSESS-005 (not a real assessment)', 'STAGING PLACEHOLDER', '[]', 'staging placeholder', '{}', '{}', '{}');
  INSERT INTO public.assessments (submission_id, assessment_number, assessment_date, methodology_version, reviewer_organization, outcome, processing_status, verification_url, is_system_test)
    VALUES (v_sub, 'ASSESS-005-2026-07-12', '2026-07-12', 'STAGING-PLACEHOLDER', 'STAGING PLACEHOLDER', 'UNABLE_TO_ASSESS', 'DELIVERED', 'https://staging.invalid/assessment/ASSESS-005-2026-07-12', true);
END $$;
