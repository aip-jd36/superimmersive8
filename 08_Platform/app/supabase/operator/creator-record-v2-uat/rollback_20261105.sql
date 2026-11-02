-- CR-V2-PROD-UAT-B — ROLLBACK of 20261105000000 (database operator only; run inside a transaction).
-- Allowed ONLY while no UAT grant has ever been created (then no operator-seeded document, grant-path event or
-- operator-UAT run can exist). Once a grant exists, history is never dropped: revoke instead (revoke_grant.sql).
-- After the drops below, re-apply 20261104000000_creator_record_v2_examination_runs.sql verbatim: it restores its
-- own write function and access-log guard (CREATE OR REPLACE) and changes nothing else.

DO $guard$
BEGIN
  IF EXISTS (SELECT 1 FROM public.creator_record_v2_examination_uat_grants) THEN
    RAISE EXCEPTION '20261105 rollback refused: a UAT grant exists (revoke it; history is never dropped)' USING ERRCODE = 'P0001';
  END IF;
END
$guard$;

DROP TRIGGER IF EXISTS creator_record_v2_examination_environment_exclusivity ON public.creator_record_v2_examination_environment;
DROP TRIGGER IF EXISTS creator_record_v2_documents_seed_binding ON public.creator_record_v2_documents;
DROP TRIGGER IF EXISTS creator_record_v2_documents_provenance_guard ON public.creator_record_v2_documents;
DROP TRIGGER IF EXISTS creator_record_v2_prepared_documents_origin_guard ON public.creator_record_v2_prepared_documents;
DROP FUNCTION IF EXISTS public.creator_record_v2_examination_uat_status(text);
DROP FUNCTION IF EXISTS public.creator_record_v2_examination_environment_exclusivity();
DROP FUNCTION IF EXISTS public.creator_record_v2_documents_seed_binding();
DROP FUNCTION IF EXISTS public.creator_record_v2_documents_provenance_guard();
DROP FUNCTION IF EXISTS public.creator_record_v2_prepared_documents_origin_guard();

ALTER TABLE public.creator_record_v2_examination_runs DROP CONSTRAINT IF EXISTS creator_record_v2_examination_runs_authority_check;
DROP INDEX IF EXISTS public.creator_record_v2_examination_runs_uat_grant_idx;
ALTER TABLE public.creator_record_v2_examination_runs DROP COLUMN IF EXISTS uat_grant_id;
ALTER TABLE public.creator_record_v2_examination_runs ADD CONSTRAINT creator_record_v2_examination_runs_execution_boundary_check
  CHECK (execution_boundary = 'isolated_synthetic_test');
ALTER TABLE public.creator_record_v2_examination_runs ADD CONSTRAINT creator_record_v2_examination_run_environment_project_ref_check
  CHECK (environment_project_ref ~ '^[a-z0-9]{20}$' AND environment_project_ref <> 'lehqgcgnenwdmuzudbrs');

ALTER TABLE public.creator_record_v2_evidence_access_log DROP CONSTRAINT IF EXISTS creator_record_v2_evidence_access_log_uat_grant_check;
DROP INDEX IF EXISTS public.creator_record_v2_evidence_access_log_uat_grant_idx;
ALTER TABLE public.creator_record_v2_evidence_access_log DROP COLUMN IF EXISTS uat_grant_id;

ALTER TABLE public.creator_record_v2_documents DROP CONSTRAINT IF EXISTS creator_record_v2_documents_provenance_check;
DROP INDEX IF EXISTS public.creator_record_v2_documents_seed_grant_idx;
ALTER TABLE public.creator_record_v2_documents DROP COLUMN IF EXISTS seed_grant_id;
ALTER TABLE public.creator_record_v2_documents DROP COLUMN IF EXISTS origin;
ALTER TABLE public.creator_record_v2_documents ALTER COLUMN consent_version SET NOT NULL;

DROP TABLE IF EXISTS public.creator_record_v2_examination_uat_grants;
DROP FUNCTION IF EXISTS public.creator_record_v2_examination_uat_grant_guard();
