-- ============================================================================
-- CAA-SECURITY-3B — PRODUCTION SCHEMA PREFLIGHT (READ-ONLY)
--
-- Purpose : verify that Production is compatible with migration
--           20261021000000_payment_fulfillments.sql BEFORE it is applied.
-- Run in  : Supabase Dashboard → SQL Editor (Production), as the default
--           `postgres` role. Paste the whole file and run once.
-- Safety  : ONE SELECT statement. No DDL, no DML, no DO blocks, no function
--           creation, no SET, no side effects. Only catalog lookups and
--           aggregate counts — no customer emails, names or payment ids are
--           returned. Missing tables/functions are detected with to_regclass /
--           to_regprocedure, so the query itself cannot fail on them.
-- Output  : one row per check: check_id | check_name | observed | expected | verdict
--           verdict = PASS | BLOCKER | REVIEW | INFO
--           Any BLOCKER ⇒ do not apply the migration. REVIEW ⇒ PM/engineer
--           must read `observed` and confirm before applying.
-- This file is NOT a migration and must never be placed in supabase/migrations.
-- ============================================================================
WITH
expected_columns(tbl, col, want) AS (
  VALUES
    ('submissions', 'id', 'uuid'),
    ('submissions', 'user_id', 'uuid'),
    ('submissions', 'tier', 'text'),
    ('submissions', 'status', 'text'),
    ('submissions', 'payment_status', 'text'),
    ('submissions', 'stripe_checkout_session_id', 'text'),
    ('submissions', 'stripe_payment_intent_id', 'text'),
    ('submissions', 'amount_paid', 'integer'),
    ('submissions', 'title', 'text'),
    ('submissions', 'filmmaker_name', 'text'),
    ('submissions', 'tools_used', '(any)'),
    ('submissions', 'authorship_statement', '(any)'),
    ('submissions', 'likeness_confirmation', '(any)'),
    ('submissions', 'ip_confirmation', '(any)'),
    ('submissions', 'territory_preferences', '(any)'),
    ('rights_packages', 'id', 'uuid'),
    ('rights_packages', 'submission_id', 'uuid'),
    ('rights_packages', 'document_url', 'text'),
    ('users', 'id', 'uuid'),
    ('users', 'email', 'text'),
    ('users', 'name', 'text'),
    ('users', 'is_admin', 'boolean')
),
b1 AS (
  SELECT 'B1'::text AS check_id,
         'column public.' || e.tbl || '.' || e.col AS check_name,
         COALESCE(c.data_type || ' nullable=' || c.is_nullable, 'MISSING') AS observed,
         e.want AS expected,
         CASE
           WHEN c.column_name IS NULL THEN 'BLOCKER'
           WHEN e.want = '(any)' THEN 'PASS'
           WHEN c.data_type = e.want THEN 'PASS'
           WHEN e.want = 'text' AND c.data_type = 'character varying' THEN 'PASS'
           WHEN e.col = 'amount_paid' AND c.data_type IN ('bigint', 'numeric') THEN 'REVIEW'
           ELSE 'BLOCKER'
         END AS verdict
    FROM expected_columns e
    LEFT JOIN information_schema.columns c
      ON c.table_schema = 'public' AND c.table_name = e.tbl AND c.column_name = e.col
),
b2 AS (
  -- CHECK constraints on the vocabulary columns the ledger writes or reads.
  SELECT 'B2', 'check constraint ' || con.conrelid::regclass::text || '.' || con.conname,
         pg_get_constraintdef(con.oid),
         'tier ⊇ {creator_record,certified,si8_certified}; status allows ''approved''; payment_status ⊇ {unpaid,paid,refunded}',
         'REVIEW'
    FROM pg_constraint con
   WHERE con.contype = 'c'
     AND con.conrelid IN (to_regclass('public.submissions'), to_regclass('public.rights_packages'), to_regclass('public.users'))
  UNION ALL
  SELECT 'B2', 'submissions.id is PK/unique (needed for the new FK)',
         CASE WHEN EXISTS (SELECT 1 FROM pg_index i
                            WHERE i.indrelid = to_regclass('public.submissions') AND i.indisunique
                              AND i.indnkeyatts = 1
                              AND i.indkey[0] = (SELECT a.attnum FROM pg_attribute a
                                                  WHERE a.attrelid = to_regclass('public.submissions') AND a.attname = 'id'))
              THEN 'yes' ELSE 'no' END,
         'yes',
         CASE WHEN EXISTS (SELECT 1 FROM pg_index i
                            WHERE i.indrelid = to_regclass('public.submissions') AND i.indisunique
                              AND i.indnkeyatts = 1
                              AND i.indkey[0] = (SELECT a.attnum FROM pg_attribute a
                                                  WHERE a.attrelid = to_regclass('public.submissions') AND a.attname = 'id'))
              THEN 'PASS' ELSE 'BLOCKER' END
  UNION ALL
  -- Unique constraints/indexes touching the columns record_checkout_payment writes.
  SELECT 'B2', 'unique index on submissions: ' || ic.relname,
         pg_get_indexdef(i.indexrelid),
         'informational (session / payment-intent uniqueness is compatible)',
         'INFO'
    FROM pg_index i JOIN pg_class ic ON ic.oid = i.indexrelid
   WHERE i.indrelid = to_regclass('public.submissions') AND i.indisunique AND NOT i.indisprimary
),
b3 AS (
  SELECT 'B3', 'FK into submissions from ' || con.conrelid::regclass::text || ' (' || con.conname || ')',
         pg_get_constraintdef(con.oid),
         'informational; RESTRICT/NO ACTION already blocks submission deletion today',
         CASE WHEN con.confdeltype IN ('r', 'a') THEN 'REVIEW' ELSE 'INFO' END
    FROM pg_constraint con
   WHERE con.contype = 'f' AND con.confrelid = to_regclass('public.submissions')
),
b4 AS (
  SELECT 'B4', 'user trigger on submissions: ' || t.tgname,
         p.proname || ' enabled=' || t.tgenabled::text || ' :: ' || pg_get_triggerdef(t.oid),
         'only updated_at-style triggers; anything that writes/raises on UPDATE must be reviewed',
         'REVIEW'
    FROM pg_trigger t JOIN pg_proc p ON p.oid = t.tgfoid
   WHERE t.tgrelid = to_regclass('public.submissions') AND NOT t.tgisinternal
  UNION ALL
  SELECT 'B4', 'user trigger count on submissions',
         (SELECT count(*)::text FROM pg_trigger t
           WHERE t.tgrelid = to_regclass('public.submissions') AND NOT t.tgisinternal),
         'listed above (0 rows above = none)', 'INFO'
),
new_relations(name) AS (
  VALUES ('payment_fulfillments'), ('payment_legacy_session_policy'),
         ('payment_fulfillments_pkey'), ('payment_legacy_session_policy_pkey'),
         ('pf_one_accepted_per_submission'), ('pf_submission_id_idx'),
         ('pf_retry_candidates_idx'), ('pf_attention_idx')
),
new_functions(name) AS (
  VALUES ('payment_list_price_cents'), ('record_checkout_payment'), ('claim_payment_fulfillment'),
         ('mark_payment_fulfillment_step'), ('finish_payment_fulfillment'),
         ('reconcile_payment_fulfillment'), ('activate_payment_legacy_cutoff')
),
b5 AS (
  SELECT 'B5', 'name free: relation public.' || r.name,
         CASE WHEN to_regclass('public.' || r.name) IS NULL THEN 'absent' ELSE 'EXISTS' END,
         'absent',
         CASE WHEN to_regclass('public.' || r.name) IS NULL THEN 'PASS' ELSE 'BLOCKER' END
    FROM new_relations r
  UNION ALL
  SELECT 'B5', 'name free: function public.' || f.name,
         (SELECT CASE WHEN count(*) = 0 THEN 'absent' ELSE 'EXISTS (' || count(*) || ' overloads)' END
            FROM pg_proc p WHERE p.pronamespace = 'public'::regnamespace AND p.proname = f.name),
         'absent',
         (SELECT CASE WHEN count(*) = 0 THEN 'PASS' ELSE 'BLOCKER' END
            FROM pg_proc p WHERE p.pronamespace = 'public'::regnamespace AND p.proname = f.name)
    FROM new_functions f
),
roles(r) AS (VALUES ('anon'), ('authenticated'), ('service_role')),
b6 AS (
  SELECT 'B6', 'role ' || ro.r || ' exists / bypassrls',
         COALESCE((SELECT 'exists bypassrls=' || pr.rolbypassrls::text FROM pg_roles pr WHERE pr.rolname = ro.r), 'MISSING'),
         CASE WHEN ro.r = 'service_role' THEN 'exists bypassrls=true' ELSE 'exists' END,
         CASE
           WHEN NOT EXISTS (SELECT 1 FROM pg_roles pr WHERE pr.rolname = ro.r) THEN 'BLOCKER'
           WHEN ro.r = 'service_role' AND NOT (SELECT pr.rolbypassrls FROM pg_roles pr WHERE pr.rolname = ro.r) THEN 'BLOCKER'
           ELSE 'PASS'
         END
    FROM roles ro
  UNION ALL
  SELECT 'B6', 'RLS enabled on public.' || c.relname, c.relrowsecurity::text, 'informational', 'INFO'
    FROM pg_class c
   WHERE c.oid IN (to_regclass('public.submissions'), to_regclass('public.rights_packages'), to_regclass('public.users'))
  UNION ALL
  SELECT 'B6', 'service_role schema USAGE on public',
         has_schema_privilege('service_role', 'public', 'USAGE')::text, 'true',
         CASE WHEN has_schema_privilege('service_role', 'public', 'USAGE') THEN 'PASS' ELSE 'BLOCKER' END
  UNION ALL
  SELECT 'B6', 'service_role ' || g.priv || ' on public.' || g.tbl,
         CASE WHEN to_regclass('public.' || g.tbl) IS NULL THEN 'table missing'
              ELSE has_table_privilege('service_role', 'public.' || g.tbl, g.priv)::text END,
         'true',
         CASE WHEN to_regclass('public.' || g.tbl) IS NULL THEN 'BLOCKER'
              WHEN has_table_privilege('service_role', 'public.' || g.tbl, g.priv) THEN 'PASS'
              ELSE 'BLOCKER' END
    FROM (VALUES ('submissions', 'SELECT'), ('submissions', 'UPDATE'),
                 ('rights_packages', 'SELECT'), ('users', 'SELECT')) g(tbl, priv)
  UNION ALL
  SELECT 'B6', g.role || ' SELECT on public.submissions (pre-existing exposure check)',
         has_table_privilege(g.role, 'public.submissions', 'SELECT')::text, 'false (reported 2026-10-21)',
         CASE WHEN has_table_privilege(g.role, 'public.submissions', 'SELECT') THEN 'REVIEW' ELSE 'PASS' END
    FROM (VALUES ('anon'), ('authenticated')) g(role)
),
b7 AS (
  SELECT 'B7', 'server version', current_setting('server_version'), '>= 13 (gen_random_uuid in core)',
         CASE WHEN current_setting('server_version_num')::int >= 130000 THEN 'PASS' ELSE 'BLOCKER' END
  UNION ALL
  SELECT 'B7', 'current_user (the role that will own the new objects)', current_user::text, 'postgres',
         CASE WHEN current_user::text = 'postgres' THEN 'PASS' ELSE 'REVIEW' END
  UNION ALL
  SELECT 'B7', 'default privileges in public: ' || pg_get_userbyid(d.defaclrole) || ' / ' || d.defaclobjtype::text,
         d.defaclacl::text,
         'informational; the migration REVOKEs these explicitly for its own objects', 'INFO'
    FROM pg_default_acl d WHERE d.defaclnamespace = 'public'::regnamespace
  UNION ALL
  SELECT 'B7', 'PostgREST schema-reload event trigger present',
         (SELECT COALESCE(string_agg(e.evtname || ':' || e.evtenabled::text, ', '), 'none')
            FROM pg_event_trigger e WHERE e.evtname ILIKE '%pgrst%'),
         'at least one enabled (else run the reload step in the release runbook)',
         CASE WHEN EXISTS (SELECT 1 FROM pg_event_trigger e WHERE e.evtname ILIKE '%pgrst%' AND e.evtenabled <> 'D')
              THEN 'PASS' ELSE 'REVIEW' END
  UNION ALL
  SELECT 'B7', 'extension pgcrypto (not required on PG13+, informational)',
         COALESCE((SELECT extversion FROM pg_extension WHERE extname = 'pgcrypto'), 'not installed'), 'n/a', 'INFO'
),
b8 AS (
  -- Aggregate data facts only. No identifiers are returned.
  SELECT 'B8', 'submissions total', count(*)::text, 'informational', 'INFO' FROM public.submissions
  UNION ALL
  SELECT 'B8', 'tier values outside {creator_record,certified,si8_certified}',
         count(*) FILTER (WHERE tier IS NULL OR tier NOT IN ('creator_record', 'certified', 'si8_certified'))::text,
         '0 (else those rows reject as unknown_tier at payment)',
         CASE WHEN count(*) FILTER (WHERE tier IS NULL OR tier NOT IN ('creator_record', 'certified', 'si8_certified')) = 0
              THEN 'PASS' ELSE 'REVIEW' END
    FROM public.submissions
  UNION ALL
  SELECT 'B8', 'payment_status values outside {unpaid,paid,refunded}',
         count(*) FILTER (WHERE payment_status IS NULL OR payment_status NOT IN ('unpaid', 'paid', 'refunded'))::text,
         '0', CASE WHEN count(*) FILTER (WHERE payment_status IS NULL OR payment_status NOT IN ('unpaid', 'paid', 'refunded')) = 0
                   THEN 'PASS' ELSE 'REVIEW' END
    FROM public.submissions
  UNION ALL
  SELECT 'B8', 'status = needs_info (known app/DB vocabulary gap, out of scope)',
         count(*) FILTER (WHERE status = 'needs_info')::text, '0 (informational)', 'INFO'
    FROM public.submissions
  UNION ALL
  SELECT 'B8', 'unpaid + pending + no stored session id (legacy-eligible population)',
         count(*) FILTER (WHERE payment_status = 'unpaid' AND status = 'pending' AND stripe_checkout_session_id IS NULL)::text,
         'informational: only these can use the bounded legacy exception', 'INFO'
    FROM public.submissions
  UNION ALL
  SELECT 'B8', 'unpaid with a stored session id (any old-code session for them would be session_mismatch)',
         count(*) FILTER (WHERE payment_status = 'unpaid' AND stripe_checkout_session_id IS NOT NULL)::text,
         '0 expected (pre-3B checkout write was rejected)',
         CASE WHEN count(*) FILTER (WHERE payment_status = 'unpaid' AND stripe_checkout_session_id IS NOT NULL) = 0
              THEN 'PASS' ELSE 'REVIEW' END
    FROM public.submissions
  UNION ALL
  SELECT 'B8', 'paid submissions', count(*) FILTER (WHERE payment_status = 'paid')::text, 'informational', 'INFO'
    FROM public.submissions
  UNION ALL
  SELECT 'B8', 'refunded submissions (a new payment for them is duplicate_payment)',
         count(*) FILTER (WHERE payment_status = 'refunded')::text, 'informational', 'INFO'
    FROM public.submissions
  UNION ALL
  SELECT 'B8', 'session ids stored on more than one submission (groups)',
         (SELECT count(*) FROM (SELECT 1 FROM public.submissions
                                 WHERE stripe_checkout_session_id IS NOT NULL
                                 GROUP BY stripe_checkout_session_id HAVING count(*) > 1) d)::text,
         '0',
         CASE WHEN (SELECT count(*) FROM (SELECT 1 FROM public.submissions
                                           WHERE stripe_checkout_session_id IS NOT NULL
                                           GROUP BY stripe_checkout_session_id HAVING count(*) > 1) d) = 0
              THEN 'PASS' ELSE 'REVIEW' END
  UNION ALL
  SELECT 'B8', 'rights_packages without document_url',
         count(*) FILTER (WHERE document_url IS NULL)::text, 'informational (pre-ledger PDF evidence)', 'INFO'
    FROM public.rights_packages
),
b9 AS (
  SELECT 'B9', 'max(amount_paid) fits int4 and list prices',
         COALESCE(max(amount_paid)::text, 'null'), '<= 49900',
         CASE WHEN max(amount_paid) IS NULL OR max(amount_paid) <= 49900 THEN 'PASS' ELSE 'REVIEW' END
    FROM public.submissions
  UNION ALL
  SELECT 'B9', 'paid with no stored session id (pre-ledger; any new payment = duplicate_payment)',
         count(*) FILTER (WHERE payment_status = 'paid' AND stripe_checkout_session_id IS NULL)::text,
         'informational', 'INFO'
    FROM public.submissions
)
SELECT * FROM (
  SELECT * FROM b1 UNION ALL SELECT * FROM b2 UNION ALL SELECT * FROM b3 UNION ALL
  SELECT * FROM b4 UNION ALL SELECT * FROM b5 UNION ALL SELECT * FROM b6 UNION ALL
  SELECT * FROM b7 UNION ALL SELECT * FROM b8 UNION ALL SELECT * FROM b9
) all_checks(check_id, check_name, observed, expected, verdict)
ORDER BY CASE verdict WHEN 'BLOCKER' THEN 0 WHEN 'REVIEW' THEN 1 WHEN 'PASS' THEN 2 ELSE 3 END,
         check_id, check_name;
