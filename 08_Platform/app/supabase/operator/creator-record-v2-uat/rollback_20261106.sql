-- CR-V2-EXAM-INTEGRATION-X1 — ROLLBACK of 20261106000000 (database operator only; run inside ONE transaction).
-- Allowed ONLY while no customer_path_uat grant has ever been created (then no customer-path binding, grant-path event
-- or customer_path_synthetic_uat run can exist). Once one exists, history is never dropped: revoke instead
-- (revoke_grant.sql). operator_seed grants (including the E4 grant) and their documents, events and runs are untouched.
-- In the SAME transaction, after the statements below, re-apply 20261105000000_creator_record_v2_operator_synthetic_uat.sql
-- verbatim: it restores its own five functions (CREATE OR REPLACE), its run authority constraint and its status function,
-- re-issues its REVOKE / GRANT statements and changes nothing else (every other statement is IF NOT EXISTS / unchanged).

DO $guard$
BEGIN
  IF EXISTS (SELECT 1 FROM public.creator_record_v2_examination_uat_grants WHERE grant_kind <> 'operator_seed') THEN
    RAISE EXCEPTION '20261106 rollback refused: a customer_path_uat grant exists (revoke it; history is never dropped)' USING ERRCODE = 'P0001';
  END IF;
END
$guard$;

-- The status function's return type differs, so 20261105000000's CREATE OR REPLACE needs it gone first.
DROP FUNCTION IF EXISTS public.creator_record_v2_examination_uat_status(text);
ALTER TABLE public.creator_record_v2_examination_runs DROP CONSTRAINT IF EXISTS creator_record_v2_examination_runs_authority_check;
ALTER TABLE public.creator_record_v2_examination_uat_grants DROP CONSTRAINT IF EXISTS creator_record_v2_examination_uat_grants_kind_check;
ALTER TABLE public.creator_record_v2_examination_uat_grants DROP COLUMN IF EXISTS grant_kind;
-- Now re-apply 20261105000000 verbatim, in this transaction.
