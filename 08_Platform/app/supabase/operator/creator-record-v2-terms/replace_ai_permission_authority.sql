-- CR-PUBLIC-2A-FIX — replace the CURRENT AI-examination permission version after a Terms (or Privacy Notice) release.
-- PROPOSED operator procedure (reconstructed; see 08_Platform/implementation/cr-public-1/CR-PUBLIC-2A-FIX-AI-PERMISSION-RUNBOOK.md).
-- NOT AUTHORIZED TO RUN until the founder authorizes the Terms release and this run. Database operator only, in the SQL Editor
-- of the TARGET project. Tested verbatim on disposable local PostgreSQL only
-- (__tests__/db/creator-record-v2-ai-permission-replacement.db.test.ts).
--
-- What it does, in ONE transaction (one DO block; the SQL Editor runs it atomically):
--   1. refuses unless every EDIT constant is filled and the new identifier is well formed and different from the current one;
--   2. locks the authority table against concurrent writes (reads continue and see the old row until commit);
--   3. refuses unless exactly one row exists and it names c_expected_current;
--   4. deletes that row and inserts the new one (an UPDATE is refused by the table's guard, by design);
--   5. re-reads creator_record_v2_current_ai_permission_version() and refuses unless it is exactly c_new_version.
-- Any refusal rolls back the whole block: the old row stays current.
--
-- Rollback (e.g. after reverting the Terms build): run this same script again with c_expected_current and c_new_version swapped.
-- The deleted row is not kept by the database: record its values (preflight P1) in SI8-private-evidence before running.

DO $replace$
DECLARE
  c_expected_current constant text := 'EDIT: the identifier the authority row holds now (preflight P1)';
  c_new_version      constant text := 'EDIT: the identifier the deployed build asks for (cr-v2-ai-permission-1__privacy-…__terms-…)';
  c_operator         constant text := 'EDIT: operator name';
  c_change_ref       constant text := 'EDIT: founder approval reference for this release';
  v_rows  integer;
  v_now   text;
BEGIN
  IF c_expected_current LIKE 'EDIT:%' OR c_new_version LIKE 'EDIT:%' OR c_operator LIKE 'EDIT:%' OR c_change_ref LIKE 'EDIT:%' THEN
    RAISE EXCEPTION 'REFUSED: edit every EDIT constant first';
  END IF;
  IF c_new_version !~ '^cr-v2-ai-permission-[0-9]+__privacy-[a-z0-9._-]+__terms-[a-z0-9._-]+$' OR c_new_version ~* '(draft|unapproved)' THEN
    RAISE EXCEPTION 'REFUSED: c_new_version is not a well-formed, approved permission identifier';
  END IF;
  IF c_new_version = c_expected_current THEN
    RAISE EXCEPTION 'REFUSED: c_new_version equals the current identifier; nothing to replace';
  END IF;
  IF to_regclass('public.creator_record_v2_ai_permission_authority') IS NULL
     OR to_regprocedure('public.creator_record_v2_current_ai_permission_version()') IS NULL THEN
    RAISE EXCEPTION 'REFUSED: no AI-permission authority here (migration 20261113000000 not applied)';
  END IF;

  LOCK TABLE public.creator_record_v2_ai_permission_authority IN SHARE ROW EXCLUSIVE MODE;

  SELECT count(*) INTO v_rows FROM public.creator_record_v2_ai_permission_authority;
  IF v_rows <> 1 THEN
    RAISE EXCEPTION 'REFUSED: expected exactly one authority row, found %', v_rows;
  END IF;
  SELECT permission_version INTO v_now FROM public.creator_record_v2_ai_permission_authority WHERE singleton;
  IF v_now IS DISTINCT FROM c_expected_current THEN
    RAISE EXCEPTION 'REFUSED: the current identifier is %, not the expected one', v_now;
  END IF;

  DELETE FROM public.creator_record_v2_ai_permission_authority WHERE singleton AND permission_version = c_expected_current;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows <> 1 THEN
    RAISE EXCEPTION 'REFUSED: delete removed % rows', v_rows;
  END IF;
  INSERT INTO public.creator_record_v2_ai_permission_authority (permission_version, established_by, reason)
    VALUES (c_new_version, c_operator, 'CR-PUBLIC Terms release: ' || c_change_ref);

  IF public.creator_record_v2_current_ai_permission_version() IS DISTINCT FROM c_new_version THEN
    RAISE EXCEPTION 'REFUSED: verification failed after insert';
  END IF;
  RAISE NOTICE 'OK: current AI-examination permission version is now %', c_new_version;
END
$replace$;
