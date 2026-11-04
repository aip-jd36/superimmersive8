#!/usr/bin/env node
// Generates the operator files for 20261107000000 (permanent admin-only UAT):
//   09_verify_20261107.sql   read-only: state, all_pass, failed[], from exact function-body digests and the exact constraint
//   08_apply_20261107.sql    one transaction: identity + pre-check, the committed migration verbatim, 09 as post-check, reload
//   ../rollback_20261107.sql restores the 20261106 functions; removes the admin boundary only if no admin run exists
// Run: node supabase/operator/creator-record-v2-uat/production-apply/build_20261107.js [--check]
//
// Digests are pinned in expected.json (functions_20261107) and recomputed here: a migration edit that is not also pinned
// refuses to build. The same computation must reproduce the pinned 20261106 digests, which were verified in Production.
const fs = require('fs'), path = require('path'), crypto = require('crypto')
const DIR = __dirname, APP = path.join(DIR, '..', '..', '..', '..')
const M = path.join(APP, 'supabase', 'migrations')
const read = (f) => fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n')
const md5 = (s) => crypto.createHash('md5').update(s, 'utf8').digest('hex')
const M06 = read(path.join(M, '20261106000000_creator_record_v2_customer_path_uat.sql'))
const M07 = read(path.join(M, '20261107000000_creator_record_v2_admin_uat.sql'))
const EXPECTED = JSON.parse(read(path.join(DIR, 'expected.json')))
const GUARD = 'creator_record_v2_evidence_access_log_insert_guard', WRITE = 'creator_record_v2_record_examination'
const fnText = (src, name) => { const s = src.indexOf(`CREATE OR REPLACE FUNCTION public.${name}(`), e = src.indexOf('\n$$;\n', s); if (s < 0 || e < 0) throw new Error(name); return src.slice(s, e + 5) }
/** md5(prosrc) as PostgreSQL stores it, for a file applied with LF or with CRLF line endings. */
const digests = (src, name) => { const t = fnText(src, name), body = t.slice(t.indexOf('AS $$') + 5, t.lastIndexOf('$$;')); return [md5(body), md5(body.replace(/\n/g, '\r\n'))] }
const same = (a, b) => [...a].sort().join() === [...b].sort().join()
for (const n of [GUARD, WRITE]) {
  if (!same(digests(M06, n), EXPECTED.functions_20261106[n])) throw new Error(`the digest method no longer reproduces the pinned 20261106 digest of ${n}`)
  if (!same(digests(M07, n), EXPECTED.functions_20261107[n])) throw new Error(`20261107000000 changed without pinning ${n} in expected.json`)
}
const lit = (s) => `'${String(s).replace(/'/g, "''")}'`
const list = (a) => a.map(lit).join(', ')
const CONSTRAINT = lit(EXPECTED.run_constraint_20261107)
const RUNS = 'public.creator_record_v2_examination_runs'
const WRITE_SIG = `public.${WRITE}(bigint,text)`, GUARD_SIG = `public.${GUARD}()`
const body = (sig) => `(SELECT md5(prosrc) FROM pg_proc WHERE oid = to_regprocedure('${sig}'))`
const def = `(SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = '${RUNS}'::regclass AND conname = 'creator_record_v2_examination_runs_authority_check')`
const fnSecure = (sig) => `coalesce((SELECT prosecdef AND proconfig::text = '{"search_path=public, pg_temp"}' FROM pg_proc WHERE oid = to_regprocedure('${sig}')), false)`
const P = (t) => `(SELECT relrowsecurity FROM pg_class WHERE oid = 'public.${t}'::regclass)`

const VERIFY_QUERY = `WITH checks(n, ok) AS (VALUES
    -- Exact content
    ('function_body_access_log_guard', coalesce(${body(GUARD_SIG)} IN (${list(EXPECTED.functions_20261107[GUARD])}), false)),
    ('function_body_write_function', coalesce(${body(WRITE_SIG)} IN (${list(EXPECTED.functions_20261107[WRITE])}), false)),
    ('run_constraint_exact', coalesce(${def} = ${CONSTRAINT}, false)),
    -- Security mode and settings
    ('access_log_guard_security', ${fnSecure(GUARD_SIG)}),
    ('write_function_security', ${fnSecure(WRITE_SIG)}),
    ('access_log_guard_trigger_enabled', EXISTS (SELECT 1 FROM pg_trigger t WHERE t.tgrelid = 'public.creator_record_v2_evidence_access_log'::regclass AND t.tgfoid = to_regprocedure('${GUARD_SIG}') AND NOT t.tgisinternal AND t.tgenabled = 'O')),
    -- Privileges: nothing for an API role; the service role keeps only the write function
    ('write_function_anon_denied', NOT has_function_privilege('anon', '${WRITE_SIG}', 'EXECUTE')),
    ('write_function_authenticated_denied', NOT has_function_privilege('authenticated', '${WRITE_SIG}', 'EXECUTE')),
    ('write_function_service_role_allowed', has_function_privilege('service_role', '${WRITE_SIG}', 'EXECUTE')),
    ('guard_function_anon_denied', NOT has_function_privilege('anon', '${GUARD_SIG}', 'EXECUTE')),
    ('guard_function_authenticated_denied', NOT has_function_privilege('authenticated', '${GUARD_SIG}', 'EXECUTE')),
    ('guard_function_service_role_denied', NOT has_function_privilege('service_role', '${GUARD_SIG}', 'EXECUTE')),
    ('runs_anon_denied', NOT has_table_privilege('anon', '${RUNS}', 'SELECT,INSERT,UPDATE,DELETE')),
    ('runs_authenticated_denied', NOT has_table_privilege('authenticated', '${RUNS}', 'SELECT,INSERT,UPDATE,DELETE')),
    ('grants_service_role_denied', NOT has_table_privilege('service_role', 'public.creator_record_v2_examination_uat_grants', 'SELECT,INSERT,UPDATE,DELETE')),
    -- RLS on, with no policies, on the protected tables
    ('rls_on', coalesce(${P('creator_record_v2_examination_runs')} AND ${P('creator_record_v2_evidence_access_log')} AND ${P('creator_record_v2_documents')} AND ${P('creator_record_v2_examination_uat_grants')}, false)),
    ('no_policies', NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename IN ('creator_record_v2_examination_runs', 'creator_record_v2_evidence_access_log', 'creator_record_v2_documents', 'creator_record_v2_examination_uat_grants'))),
    -- Data
    ('no_environment_marker', NOT EXISTS (SELECT 1 FROM public.creator_record_v2_examination_environment)),
    ('no_active_grant', NOT EXISTS (SELECT 1 FROM public.creator_record_v2_examination_uat_grants WHERE revoked_at IS NULL AND expires_at > now())),
    ('admin_runs_carry_no_grant', NOT EXISTS (SELECT 1 FROM ${RUNS} WHERE execution_boundary = 'admin_synthetic_uat' AND uat_grant_id IS NOT NULL))
), s AS (
  SELECT ${body(GUARD_SIG)} IN (${list(EXPECTED.functions_20261106[GUARD])}) AND ${body(WRITE_SIG)} IN (${list(EXPECTED.functions_20261106[WRITE])}) AS fn06,
         ${body(GUARD_SIG)} IN (${list(EXPECTED.functions_20261107[GUARD])}) AND ${body(WRITE_SIG)} IN (${list(EXPECTED.functions_20261107[WRITE])}) AS fn07,
         ${def} LIKE '%admin_synthetic_uat%' AS admin_check
)
SELECT CASE WHEN fn07 AND admin_check AND (SELECT bool_and(n NOT IN ('function_body_access_log_guard', 'function_body_write_function', 'run_constraint_exact') OR ok) FROM checks) THEN 'applied'
            WHEN fn06 AND NOT admin_check THEN 'absent'
            WHEN fn06 AND admin_check THEN 'disabled'
            ELSE 'partial' END AS state,
       (SELECT bool_and(ok) FROM checks) AS all_pass,
       (SELECT coalesce(jsonb_agg(n ORDER BY n), '[]'::jsonb) FROM checks WHERE NOT ok) AS failed,
       (SELECT count(*) FROM ${RUNS} WHERE execution_boundary = 'admin_synthetic_uat') AS admin_runs
FROM s`
const VERIFY = `-- 20261107000000: READ-ONLY verification. One SELECT; changes nothing. GENERATED by build_20261107.js: do not edit.
-- This query, not the Dashboard's response, is the authority on whether 08_apply_20261107.sql committed.
--   state 'absent'   : the exact 20261106 functions, no admin boundary (08 did not commit; nothing to undo)
--   state 'applied'  : the exact 20261107 function bodies and run constraint
--   state 'disabled' : rollback_20261107.sql ran after an admin run existed (new admin reads refused; history kept)
--   state 'partial'  : anything else. STOP and report.
--   all_pass / failed: the exact content, security, privilege, RLS and data checks. Any failure is a STOP. all_pass is false
--                      by design when state is 'absent' or 'disabled'.
${VERIFY_QUERY};
`
const IDENTITY = `  IF current_setting('server_version_num')::int < 150000 THEN
    RAISE EXCEPTION 'REFUSED: PostgreSQL 15 or later is required (found %)', current_setting('server_version');
  END IF;
  -- Layered evidence, not authentication: a database cannot prove its own project ref, so the operator also confirms
  -- the ref in the dashboard URL. (1) Production holds the real Cloud World assessment; a staging copy holds a placeholder.
  IF to_regclass('public.assessments') IS NULL THEN
    RAISE EXCEPTION 'REFUSED: this database does not look like Production';
  END IF;
  IF NOT EXISTS (
       SELECT 1 FROM public.assessments
        WHERE assessment_number = 'ASSESS-005-2026-07-12' AND methodology_version IS DISTINCT FROM 'STAGING-PLACEHOLDER') THEN
    RAISE EXCEPTION 'REFUSED: this database does not look like Production';
  END IF;
  -- (2) Production holds the exact CR-V2-UAT-PROD-9 examination run, under its revoked grant, stamped with the Production ref.
  IF NOT EXISTS (
       SELECT 1 FROM ${RUNS} r JOIN public.creator_record_v2_examination_uat_grants g ON g.id = r.uat_grant_id
        WHERE r.id = ${lit(EXPECTED.prod9_20261107.run_id)}
          AND r.user_id = ${lit(EXPECTED.prod9_20261107.test_user_id)}
          AND r.execution_boundary = 'customer_path_synthetic_uat'
          AND r.environment_project_ref = ${lit(EXPECTED.prod9_20261107.project_ref)}
          AND g.change_ref = ${lit(EXPECTED.prod9_20261107.change_ref)}
          AND g.supabase_project_ref = ${lit(EXPECTED.prod9_20261107.project_ref)}
          AND g.revoked_at IS NOT NULL) THEN
    RAISE EXCEPTION 'REFUSED: the exact CR-V2-UAT-PROD-9 history was not found; this is not the verified Production database';
  END IF;`
const APPLY = `-- 20261107000000 (permanent admin-only UAT): APPLY, ONE transaction. GENERATED by build_20261107.js: do not edit.
-- Database operator only, in the SQL Editor of the verified Production project.
--
-- What happens: BEGIN with bounded timeouts -> identity and pre-check (refuses before any change) -> the migration, verbatim
-- -> post-check (09_verify_20261107.sql, verbatim) -> schema-cache reload notification -> COMMIT.
-- Every refusal or error happens before COMMIT, so nothing is committed.
--
-- Success looks like exactly one returned row: result = '20261107000000 COMMITTED'. Then run 09_verify_20261107.sql.
-- On ANY error or an unclear response (timeout, network, browser): run   ROLLBACK;   on its own (harmless if nothing is open),
-- then run 09_verify_20261107.sql on its own and read its state. Never re-run this file without reading that result first.

BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '120s';
SET LOCAL idle_in_transaction_session_timeout = '60s';
DO $timeout$ BEGIN
  IF current_setting('server_version_num')::int >= 170000 THEN PERFORM set_config('transaction_timeout', '180s', true); END IF;
END $timeout$;

-- === IDENTITY AND PRE-CHECK ===
DO $pre07$
DECLARE
  v jsonb;
BEGIN
${IDENTITY}
  -- Exactly the verified 20261106 state; no active grant or marker.
  SELECT to_jsonb(x) INTO v FROM (
${VERIFY_QUERY}
  ) x;
  IF v->>'state' IS DISTINCT FROM 'absent' THEN
    RAISE EXCEPTION 'REFUSED: 20261107000000 expects state absent, found %; run 09_verify_20261107.sql and stop', v->>'state';
  END IF;
  IF EXISTS (SELECT 1 FROM public.creator_record_v2_examination_environment) THEN RAISE EXCEPTION 'REFUSED: the isolated-test marker exists here'; END IF;
  IF EXISTS (SELECT 1 FROM public.creator_record_v2_examination_uat_grants WHERE revoked_at IS NULL AND expires_at > now()) THEN RAISE EXCEPTION 'REFUSED: an examination UAT grant is active'; END IF;
END
$pre07$;

-- === BEGIN VERBATIM supabase/migrations/20261107000000_creator_record_v2_admin_uat.sql ===
${M07.trimEnd()}
-- === END VERBATIM ===

-- === POST-CHECK: 09_verify_20261107.sql, verbatim ===
DO $post07$
DECLARE
  v jsonb;
BEGIN
  SELECT to_jsonb(x) INTO v FROM (
${VERIFY_QUERY}
  ) x;
  IF v->>'state' IS DISTINCT FROM 'applied' OR (v->>'all_pass')::boolean IS NOT TRUE THEN
    RAISE EXCEPTION 'REFUSED: post-check failed; nothing is committed: %', v;
  END IF;
END
$post07$;

NOTIFY pgrst, 'reload schema';
COMMIT;
SELECT '20261107000000 COMMITTED' AS result;
`
const ROLLBACK = `-- 20261107000000: ROLLBACK. GENERATED by build_20261107.js: do not edit. One transaction. Deletes nothing.
-- Always: restores the 20261106 functions, so admin examination reads and new runs are refused again.
-- Only if no admin_synthetic_uat run exists: restores the 20261106 run CHECK (09 then reads 'absent'). Otherwise the CHECK
-- stays, because that history is append-only and must remain valid (09 then reads 'disabled').
-- Application rollback (Vercel) is separate and can happen at any time.

BEGIN;

${fnText(M06, GUARD)}
${fnText(M06, WRITE)}
DO $rb07$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM ${RUNS} WHERE execution_boundary = 'admin_synthetic_uat') THEN
    ALTER TABLE ${RUNS} DROP CONSTRAINT creator_record_v2_examination_runs_authority_check;
    ALTER TABLE ${RUNS} ADD CONSTRAINT creator_record_v2_examination_runs_authority_check CHECK (
      environment_project_ref ~ '^[a-z0-9]{20}$' AND (
        (execution_boundary = 'isolated_synthetic_test' AND uat_grant_id IS NULL AND environment_project_ref <> 'lehqgcgnenwdmuzudbrs')
        OR (execution_boundary IN ('operator_synthetic_uat', 'customer_path_synthetic_uat') AND uat_grant_id IS NOT NULL)));
    RAISE NOTICE 'restored the 20261106 run CHECK';
  ELSE
    RAISE NOTICE 'admin runs exist: the run CHECK stays; new admin reads and runs are refused';
  END IF;
END
$rb07$;

REVOKE ALL ON FUNCTION public.${GUARD}() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.${WRITE}(bigint, text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.${WRITE}(bigint, text) TO service_role;

NOTIFY pgrst, 'reload schema';
COMMIT;
`
const OUT = { [path.join(DIR, '08_apply_20261107.sql')]: APPLY, [path.join(DIR, '09_verify_20261107.sql')]: VERIFY, [path.join(DIR, '..', 'rollback_20261107.sql')]: ROLLBACK }
const check = process.argv.includes('--check')
let stale = 0
for (const [f, text] of Object.entries(OUT)) {
  if (check) { if (!fs.existsSync(f) || read(f) !== text) { console.error('stale:', f); stale++ } } else fs.writeFileSync(f, text)
}
if (check && stale) process.exit(1)
console.log(check ? 'up to date' : 'written')
