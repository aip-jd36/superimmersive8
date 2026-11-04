-- Q6 — is public.users.is_admin writable by a signed-in user? READ-ONLY (a single SELECT). Production only: lehqgcgnenwdmuzudbrs.
-- Changes nothing and returns no email address. Row 1 is the direct answer; rows 5-6 tell you whether anything looks wrong already.
WITH checks AS (
  SELECT n, check_name, safe_value, actual,
         CASE WHEN safe_value = '(info)' THEN 'INFO'
              WHEN actual IS NOT DISTINCT FROM safe_value THEN 'SAFE'
              ELSE 'EXPOSED' END AS result
  FROM (VALUES
    (1, 'authenticated can UPDATE public.users.is_admin (table or column privilege)', 'false', has_column_privilege('authenticated', 'public.users', 'is_admin', 'UPDATE')::text),
    (2, 'anon can UPDATE public.users.is_admin (table or column privilege)', 'false', has_column_privilege('anon', 'public.users', 'is_admin', 'UPDATE')::text),
    (3, 'RLS UPDATE policies on public.users', '(info)', (SELECT string_agg(policyname || ' | roles=' || roles::text || ' | using=' || coalesce(qual, 'none') || ' | with_check=' || coalesce(with_check, 'none'), ' ;; ') FROM pg_policies WHERE schemaname = 'public' AND tablename = 'users' AND cmd IN ('UPDATE', 'ALL'))),
    (4, 'user-defined triggers on public.users', '(info)', (SELECT string_agg(t.tgname || ' -> ' || p.proname, ' ;; ') FROM pg_trigger t JOIN pg_proc p ON p.oid = t.tgfoid WHERE t.tgrelid = 'public.users'::regclass AND NOT t.tgisinternal)),
    (5, 'admin accounts now', '(info)', (SELECT count(*)::text FROM public.users WHERE is_admin IS TRUE)),
    (6, 'admin accounts: id / created (UTC) / profile last updated (UTC)', '(info)', (SELECT string_agg(id::text || ' / ' || (created_at AT TIME ZONE 'UTC')::text || ' / ' || (updated_at AT TIME ZONE 'UTC')::text, ' ;; ' ORDER BY created_at) FROM public.users WHERE is_admin IS TRUE)),
    (7, 'public.users RLS enabled', 'true', (SELECT relrowsecurity::text FROM pg_class WHERE oid = 'public.users'::regclass)),
    (8, 'test identity is an admin', 'false', (SELECT (is_admin IS TRUE)::text FROM public.users WHERE id = '3adfe2e0-3a48-45cb-a2e9-2f6d2b3683a6')),
    (9, 'authenticated can UPDATE public.submissions.payment_status', 'false', has_column_privilege('authenticated', 'public.submissions', 'payment_status', 'UPDATE')::text),
    (10, 'authenticated can UPDATE public.submissions.status', 'false', has_column_privilege('authenticated', 'public.submissions', 'status', 'UPDATE')::text),
    (11, 'authenticated can INSERT into public.submissions', 'false', has_table_privilege('authenticated', 'public.submissions', 'INSERT')::text),
    (12, 'RLS write policies on public.submissions', '(info)', (SELECT string_agg(policyname || ' | ' || cmd || ' | using=' || coalesce(qual, 'none') || ' | with_check=' || coalesce(with_check, 'none'), ' ;; ') FROM pg_policies WHERE schemaname = 'public' AND tablename = 'submissions' AND cmd IN ('UPDATE', 'INSERT', 'DELETE', 'ALL'))),
    (13, 'public.submissions RLS enabled', 'true', (SELECT relrowsecurity::text FROM pg_class WHERE oid = 'public.submissions'::regclass))
  ) AS t(n, check_name, safe_value, actual)
)
SELECT n AS "#", check_name, safe_value, actual, result FROM checks ORDER BY n;
