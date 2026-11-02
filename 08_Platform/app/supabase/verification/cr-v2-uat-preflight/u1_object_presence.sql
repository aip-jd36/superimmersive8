-- CR-V2-PROD-UAT-B preflight U1 · READ-ONLY. Which DOC-2C-B (20261104000000) and PROD-UAT-B (20261105000000) objects
-- exist. Catalog lookups only; reads no table data. Before either migration every value must be false.
SELECT json_build_object(
  'doc2cb_marker_table',              to_regclass('public.creator_record_v2_examination_environment') IS NOT NULL,
  'doc2cb_fixtures_table',            to_regclass('public.creator_record_v2_synthetic_fixtures') IS NOT NULL,
  'doc2cb_runs_table',                to_regclass('public.creator_record_v2_examination_runs') IS NOT NULL,
  'doc2cb_record_function',           to_regprocedure('public.creator_record_v2_record_examination(bigint,text)') IS NOT NULL,
  'doc2cb_access_log_guard',          to_regprocedure('public.creator_record_v2_evidence_access_log_insert_guard()') IS NOT NULL,
  'doc2cb_access_log_purpose_column', EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'creator_record_v2_evidence_access_log' AND column_name = 'purpose'),
  'uatb_grants_table',                to_regclass('public.creator_record_v2_examination_uat_grants') IS NOT NULL,
  'uatb_status_function',             to_regprocedure('public.creator_record_v2_examination_uat_status(text)') IS NOT NULL,
  'uatb_seed_binding_function',       to_regprocedure('public.creator_record_v2_documents_seed_binding()') IS NOT NULL,
  'uatb_documents_origin_column',     EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'creator_record_v2_documents' AND column_name = 'origin'),
  'uatb_access_log_grant_column',     EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'creator_record_v2_evidence_access_log' AND column_name = 'uat_grant_id'),
  'uatb_runs_grant_column',           EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'creator_record_v2_examination_runs' AND column_name = 'uat_grant_id')
) AS u1;
