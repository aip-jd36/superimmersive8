-- CR-V2-DOC-LIVE-1C-B1 — read-only verification of an evaluation project. Changes nothing.
--
-- Run as the database operator in the SQL editor of the EVALUATION project, after installing 20261109000000. Every row must say
-- ok = true, and `expected_project_ref` must be read aloud against the project reference in the dashboard URL before anything else.
-- See 08_Platform/implementation/CR_V2_DOC_LIVE_EVALUATION_ENVIRONMENT.md.

WITH
t AS (SELECT unnest(ARRAY['creator_record_v2_live_evaluation_environment', 'creator_record_v2_live_evaluation_authorizations', 'creator_record_v2_live_evaluation_documents',
                          'creator_record_v2_live_evaluation_reservations', 'creator_record_v2_live_evaluation_attempts']) AS name),
f AS (SELECT p.oid, p.proname, p.prosecdef, p.proconfig FROM pg_proc p WHERE p.pronamespace = 'public'::regnamespace AND p.proname LIKE 'creator_record_v2_live_evaluation_%'),
entry AS (SELECT unnest(ARRAY['creator_record_v2_live_evaluation_preflight', 'creator_record_v2_live_evaluation_reserve', 'creator_record_v2_live_evaluation_settle', 'creator_record_v2_live_evaluation_record']) AS name),
checks(check_name, ok, detail) AS (
  SELECT 'isolated-test marker present, not Production',
         EXISTS (SELECT 1 FROM public.creator_record_v2_examination_environment WHERE singleton AND supabase_project_ref <> 'lehqgcgnenwdmuzudbrs'),
         (SELECT string_agg(supabase_project_ref, ',') FROM public.creator_record_v2_examination_environment)
  UNION ALL
  SELECT 'evaluation marker present, not Production, same project as the isolated-test marker',
         EXISTS (SELECT 1 FROM public.creator_record_v2_live_evaluation_environment e JOIN public.creator_record_v2_examination_environment x ON x.supabase_project_ref = e.supabase_project_ref
                 WHERE e.supabase_project_ref <> 'lehqgcgnenwdmuzudbrs'),
         (SELECT string_agg(supabase_project_ref, ',') FROM public.creator_record_v2_live_evaluation_environment)
  UNION ALL
  SELECT 'every authorization names this project', NOT EXISTS (SELECT 1 FROM public.creator_record_v2_live_evaluation_authorizations a
         WHERE a.environment_ref IS DISTINCT FROM (SELECT supabase_project_ref FROM public.creator_record_v2_live_evaluation_environment)), NULL
  UNION ALL
  SELECT 'no customer, payment, issuance or UAT data',
         NOT EXISTS (SELECT 1 FROM public.submissions) AND NOT EXISTS (SELECT 1 FROM public.creator_record_v2_prepared WHERE submission_id IS NOT NULL)
         AND (to_regclass('public.payment_fulfillments') IS NULL OR NOT EXISTS (SELECT 1 FROM public.payment_fulfillments))
         AND (to_regclass('public.creator_record_artifacts') IS NULL OR NOT EXISTS (SELECT 1 FROM public.creator_record_artifacts))
         AND (to_regclass('public.creator_record_v2_examination_uat_grants') IS NULL OR NOT EXISTS (SELECT 1 FROM public.creator_record_v2_examination_uat_grants)), NULL
  UNION ALL
  SELECT 'all five evaluation tables exist with row level security on and no policy',
         (SELECT count(*) FROM t JOIN pg_class c ON c.relname = t.name AND c.relnamespace = 'public'::regnamespace AND c.relrowsecurity) = 5
         AND NOT EXISTS (SELECT 1 FROM pg_policies p JOIN t ON p.tablename = t.name WHERE p.schemaname = 'public'), NULL
  UNION ALL
  SELECT 'anon and authenticated hold no privilege on any evaluation table',
         NOT EXISTS (SELECT 1 FROM information_schema.role_table_grants g JOIN t ON g.table_name = t.name WHERE g.table_schema = 'public' AND g.grantee IN ('anon', 'authenticated', 'PUBLIC')), NULL
  UNION ALL
  SELECT 'service_role holds SELECT only, and on the four tables other than the marker',
         (SELECT coalesce(string_agg(g.table_name || ':' || g.privilege_type, ',' ORDER BY g.table_name, g.privilege_type), '') FROM information_schema.role_table_grants g JOIN t ON g.table_name = t.name
          WHERE g.table_schema = 'public' AND g.grantee = 'service_role')
         = 'creator_record_v2_live_evaluation_attempts:SELECT,creator_record_v2_live_evaluation_authorizations:SELECT,creator_record_v2_live_evaluation_documents:SELECT,creator_record_v2_live_evaluation_reservations:SELECT', NULL
  UNION ALL
  SELECT 'only the four entry functions are executable, and only by service_role',
         NOT EXISTS (SELECT 1 FROM f WHERE has_function_privilege('anon', f.oid, 'EXECUTE') OR has_function_privilege('authenticated', f.oid, 'EXECUTE'))
         AND (SELECT count(*) FROM f WHERE has_function_privilege('service_role', f.oid, 'EXECUTE')) = 4
         AND (SELECT count(*) FROM f JOIN entry ON entry.name = f.proname WHERE has_function_privilege('service_role', f.oid, 'EXECUTE')) = 4, NULL
  UNION ALL
  SELECT 'every evaluation function runs with a fixed search_path',
         NOT EXISTS (SELECT 1 FROM f WHERE f.proconfig IS NULL OR NOT EXISTS (SELECT 1 FROM unnest(f.proconfig) c WHERE c LIKE 'search_path=%')), NULL
  UNION ALL
  SELECT 'the 1A store still refuses live output (its function body is unchanged in that respect)',
         position('live_examination_not_authorized' IN pg_get_functiondef('public.creator_record_v2_record_live_examination(bigint, text)'::regprocedure)) > 0, NULL
)
SELECT check_name, ok, detail FROM checks
UNION ALL
SELECT 'ALL CHECKS', bool_and(ok), (SELECT string_agg(supabase_project_ref, ',') FROM public.creator_record_v2_live_evaluation_environment) FROM checks;
