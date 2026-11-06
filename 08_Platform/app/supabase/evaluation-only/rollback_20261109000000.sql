-- CR-V2-DOC-LIVE-1C-B1 — removes the evaluation-only schema (20261109000000) from an evaluation project, in one transaction.
--
-- Refuses unless every evaluation table is empty: authorizations, reservations and results are never discarded by a rollback. To retire
-- a project that holds results, keep it, revoke its authorizations and remove its evaluation marker instead, or delete the whole project.
-- Leaves every object outside the evaluation schema, including the isolated-test marker and creator_record_v2_examination_append_only_guard.
-- See 08_Platform/implementation/CR_V2_DOC_LIVE_EVALUATION_ENVIRONMENT.md.

BEGIN;
DO $rollback$
DECLARE
  v_table text;
  v_found boolean;
BEGIN
  FOR v_table IN SELECT unnest(ARRAY['creator_record_v2_live_evaluation_attempts', 'creator_record_v2_live_evaluation_reservations', 'creator_record_v2_live_evaluation_documents',
                                     'creator_record_v2_live_evaluation_authorizations', 'creator_record_v2_live_evaluation_environment']) LOOP
    EXECUTE format('SELECT EXISTS (SELECT 1 FROM public.%I)', v_table) INTO v_found;
    IF v_found THEN
      RAISE EXCEPTION 'rollback refused: % is not empty', v_table USING ERRCODE = 'P0001';
    END IF;
  END LOOP;
END
$rollback$;
DROP FUNCTION public.creator_record_v2_live_evaluation_record(uuid, bigint, text);
DROP FUNCTION public.creator_record_v2_live_evaluation_settle(uuid, integer, bigint, bigint, boolean, bigint);
DROP FUNCTION public.creator_record_v2_live_evaluation_reserve(text, uuid, uuid);
DROP FUNCTION public.creator_record_v2_live_evaluation_preflight(text, uuid, uuid);
DROP FUNCTION public.creator_record_v2_live_evaluation_spent(text);
DROP FUNCTION public.creator_record_v2_live_evaluation_authority(text, uuid, uuid);
DROP TABLE public.creator_record_v2_live_evaluation_attempts;
DROP TABLE public.creator_record_v2_live_evaluation_reservations;
DROP TABLE public.creator_record_v2_live_evaluation_documents;
DROP TABLE public.creator_record_v2_live_evaluation_authorizations;
DROP TABLE public.creator_record_v2_live_evaluation_environment;
DROP FUNCTION public.creator_record_v2_live_evaluation_reservation_guard();
DROP FUNCTION public.creator_record_v2_live_evaluation_document_guard();
DROP FUNCTION public.creator_record_v2_live_evaluation_authorization_guard();
COMMIT;
