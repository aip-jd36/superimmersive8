#!/usr/bin/env node
// CR-V2-PROD-UAT-D1 / D1C — generates the operator files of the Production migration execution pack:
//   02_verify_20261104.sql, 04_verify_20261105.sql   read-only verification, from expected.json and the fixed rules below
//   01_apply_20261104.sql,  03_apply_20261105.sql    one transaction each, embedding the committed migration verbatim and
//                                                    the verification query verbatim as pre- and post-checks
//   06_verify_20261106.sql, 05_apply_20261106.sql    CR-V2-EXAM-INTEGRATION-X1: the same for 20261106000000, on a
//                                                    database that already holds the E4 operator-UAT history
//   node supabase/operator/creator-record-v2-uat/production-apply/build.js           # (re)write the four files
//   node supabase/operator/creator-record-v2-uat/production-apply/build.js --check   # exit 1 if any differs
// __tests__/ops/cr-v2-production-apply-sql.test.ts requires the files on disk to equal this output exactly.
// No connection, no network, no dependency. This is a fixed expectation list for these migrations, not a schema diff.
const fs = require('fs')
const path = require('path')

const HERE = __dirname
const APP = path.join(HERE, '..', '..', '..', '..')
const MIGRATIONS = path.join(APP, 'supabase', 'migrations')
const read = (p) => fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n')
const EXPECTED = JSON.parse(read(path.join(HERE, 'expected.json')))
const C = (a, b) => (a < b ? -1 : a > b ? 1 : 0) // byte order, as COLLATE "C"
const lit = (s) => `'${s.replace(/'/g, "''")}'`
const arr = (xs) => (xs.length ? `ARRAY[${xs.map(lit).join(', ')}]` : 'ARRAY[]::text[]')

// ── Names ─────────────────────────────────────────────────────────────────────────────────────────────────────────
const DOC = 'creator_record_v2_documents', LOG = 'creator_record_v2_evidence_access_log', PDOC = 'creator_record_v2_prepared_documents'
const PREP = 'creator_record_v2_prepared', MARK = 'creator_record_v2_examination_environment', FIX = 'creator_record_v2_synthetic_fixtures'
const RUNS = 'creator_record_v2_examination_runs', GRANTS = 'creator_record_v2_examination_uat_grants'
const ROLES = ['anon', 'authenticated', 'public', 'service_role']
/** Every table privilege the database knows; MAINTAIN exists from PostgreSQL 17. */
const PRIVS = `ARRAY['DELETE', 'INSERT', 'REFERENCES', 'SELECT', 'TRIGGER', 'TRUNCATE', 'UPDATE'] || CASE WHEN current_setting('server_version_num')::int >= 170000 THEN ARRAY['MAINTAIN'] ELSE ARRAY[]::text[] END`
/** The only API privileges on protected tables (both stages). Everything else, for anon, authenticated, PUBLIC and service_role, fails. */
const TABLE_PRIVS = {
  [DOC]: ['DELETE', 'INSERT', 'SELECT', 'UPDATE'].map((p) => `service_role:${p}`),
  [LOG]: ['INSERT', 'SELECT'].map((p) => `service_role:${p}`),
  [PDOC]: ['service_role:SELECT'],
  [MARK]: [], [FIX]: ['service_role:SELECT'], [RUNS]: ['service_role:SELECT'], [GRANTS]: [],
}
const PATH = 'search_path=public, pg_temp'
/** Protected functions: security mode and settings, and who may EXECUTE them. */
const FN = {
  DOC1: [
    { sig: 'creator_record_v2_append_only_guard()', definer: false, config: null },
    { sig: 'creator_record_v2_documents_guard()', definer: false, config: null },
    { sig: 'creator_record_v2_prepared_documents_link()', definer: true, config: PATH },
  ],
  M04: [
    { sig: 'creator_record_v2_jsonb_exact_keys(jsonb,text[])', definer: false, config: PATH },
    { sig: 'creator_record_v2_examination_environment_guard()', definer: false, config: PATH },
    { sig: 'creator_record_v2_examination_append_only_guard()', definer: false, config: PATH },
    { sig: 'creator_record_v2_evidence_access_log_insert_guard()', definer: true, config: PATH },
    { sig: 'creator_record_v2_record_examination(bigint,text)', definer: true, config: PATH, execute: ['service_role'] },
  ],
  M05: [
    { sig: 'creator_record_v2_examination_uat_grant_guard()', definer: false, config: PATH },
    { sig: 'creator_record_v2_examination_environment_exclusivity()', definer: false, config: PATH },
    { sig: 'creator_record_v2_documents_provenance_guard()', definer: false, config: PATH },
    { sig: 'creator_record_v2_documents_seed_binding()', definer: true, config: PATH },
    { sig: 'creator_record_v2_prepared_documents_origin_guard()', definer: false, config: PATH },
    { sig: 'creator_record_v2_examination_uat_status(text)', definer: true, config: PATH, execute: ['service_role'] },
  ],
}
/** Triggers on protected tables, all enabled ('O'). After 20261105 some tables gain triggers. */
const TRIGGERS_04 = {
  [DOC]: ['creator_record_v2_documents_guard'],
  [LOG]: ['creator_record_v2_evidence_access_log_append_only', 'creator_record_v2_evidence_access_log_insert_guard'],
  [PDOC]: ['creator_record_v2_prepared_documents_append_only'],
  [MARK]: ['creator_record_v2_examination_environment_guard'],
  [FIX]: ['creator_record_v2_synthetic_fixtures_append_only'],
  [RUNS]: ['creator_record_v2_examination_runs_append_only'],
}
const TRIGGERS_05 = {
  ...TRIGGERS_04,
  [DOC]: [...TRIGGERS_04[DOC], 'creator_record_v2_documents_provenance_guard', 'creator_record_v2_documents_seed_binding'],
  [PDOC]: [...TRIGGERS_04[PDOC], 'creator_record_v2_prepared_documents_origin_guard'],
  [MARK]: ['creator_record_v2_examination_environment_exclusivity', ...TRIGGERS_04[MARK]],
  [GRANTS]: ['creator_record_v2_examination_uat_grant_guard'],
}
/** Every table and function name expected under the prefix; anything else is reported as drift, never a failure. */
const KNOWN_TABLES = [DOC, LOG, PDOC, PREP, 'creator_record_v2_pilot_access', MARK, FIX, RUNS, GRANTS]
const KNOWN_FUNCTIONS = [...FN.DOC1, ...FN.M04, ...FN.M05].map((f) => f.sig.replace(/\(.*$/, ''))
  .concat(['create_creator_record_v2_submission', 'creator_record_v2_prepared_guard', 'rights_packages_creator_record_v2_guard'])
const S05 = `to_regclass('public.${GRANTS}') IS NOT NULL` // 20261105000000 has been applied

// ── Check builders (each returns one VALUES row: ('name', boolean)) ───────────────────────────────────────────────────
const row = (name, expr) => `  (${lit(name)}, ${expr.trim()})`
function tablePrivileges(tables) {
  const expected = tables.flatMap((t) => TABLE_PRIVS[t].map((rp) => `${t}:${rp}`)).sort(C)
  return `(SELECT coalesce(array_agg(t.tbl || ':' || r.role || ':' || p.priv ORDER BY t.tbl || ':' || r.role || ':' || p.priv COLLATE "C"), ARRAY[]::text[])
       FROM unnest(${arr(tables)}) t(tbl), unnest(${arr(ROLES)}) r(role), unnest(${PRIVS}) p(priv)
      WHERE coalesce(has_table_privilege(r.role, to_regclass('public.' || t.tbl), p.priv), false))
    = ${arr(expected)}`
}
const oids = (tables) => `ARRAY[${tables.map((t) => `to_regclass('public.${t}')`).join(', ')}]::oid[]`
const rlsOn = (tables) => `(SELECT count(*) FROM pg_class WHERE oid = ANY (${oids(tables)}) AND relrowsecurity) = ${tables.length}`
const noPolicies = (tables) => `NOT EXISTS (SELECT 1 FROM pg_policy WHERE polrelid = ANY (${oids(tables)}))`
const triggerList = (map) => Object.entries(map).flatMap(([t, gs]) => gs.map((g) => `${t}:${g}:O`)).sort(C)
const actualTriggers = (tables) => `(SELECT coalesce(array_agg(c.relname || ':' || t.tgname || ':' || t.tgenabled::text ORDER BY c.relname || ':' || t.tgname COLLATE "C"), ARRAY[]::text[])
       FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid WHERE NOT t.tgisinternal AND c.oid = ANY (${oids(tables)}))`
function functionModes(fns) {
  const expected = fns.map((f) => `${f.sig}:${f.definer ? 'definer' : 'invoker'}:${f.config ?? '-'}`).sort(C)
  return `(SELECT coalesce(array_agg(f.sig || ':' || CASE WHEN p.prosecdef THEN 'definer' ELSE 'invoker' END || ':' || coalesce(array_to_string(p.proconfig, ';'), '-') ORDER BY f.sig COLLATE "C"), ARRAY[]::text[])
       FROM unnest(${arr(fns.map((f) => f.sig))}) f(sig) JOIN pg_proc p ON p.oid = to_regprocedure('public.' || f.sig))
    = ${arr(expected)}`
}
const functionOwners = (fns) => `(SELECT count(*) FROM unnest(${arr(fns.map((f) => f.sig))}) f(sig) JOIN pg_proc p ON p.oid = to_regprocedure('public.' || f.sig)
      WHERE p.proowner = (SELECT relowner FROM pg_class WHERE oid = 'public.${DOC}'::regclass)) = ${fns.length}`
function functionExecute(fns) {
  const expected = fns.flatMap((f) => (f.execute ?? []).map((r) => `${f.sig}:${r}`)).sort(C)
  return `(SELECT coalesce(array_agg(f.sig || ':' || r.role ORDER BY f.sig || ':' || r.role COLLATE "C"), ARRAY[]::text[])
       FROM unnest(${arr(fns.map((f) => f.sig))}) f(sig), unnest(${arr(ROLES)}) r(role)
      WHERE coalesce(has_function_privilege(r.role, to_regprocedure('public.' || f.sig), 'EXECUTE'), false))
    = ${arr(expected)}`
}
const tableOwners = (tables) => `(SELECT count(*) FROM pg_class WHERE oid = ANY (${oids(tables)}) AND relowner = (SELECT relowner FROM pg_class WHERE oid = 'public.${DOC}'::regclass)) = ${tables.length}`
/** A migration-owned shape group: exactly these named items, with exactly these definitions (extra items are drift). */
function shape(group, table, kind) {
  const g = EXPECTED.groups[group]
  if (!g) throw new Error(`expected.json has no group ${group}`)
  const sql = {
    columns: `(SELECT count(*) || ':' || md5(string_agg(a.attname || ' ' || format_type(a.atttypid, a.atttypmod) || CASE WHEN a.attnotnull THEN ' not null' ELSE '' END
                 || coalesce(' default ' || pg_get_expr(d.adbin, d.adrelid), ''), E'\\n' ORDER BY a.attname COLLATE "C"))
       FROM pg_attribute a LEFT JOIN pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
      WHERE a.attrelid = to_regclass('public.${table}') AND a.attnum > 0 AND NOT a.attisdropped AND a.attname = ANY (${arr(g.names)}))`,
    constraints: `(SELECT count(*) || ':' || md5(string_agg(conname || ': ' || pg_get_constraintdef(oid), E'\\n' ORDER BY conname COLLATE "C"))
       FROM pg_constraint WHERE conrelid = to_regclass('public.${table}') AND conname = ANY (${arr(g.names)}))`,
    indexes: `(SELECT count(*) || ':' || md5(string_agg(pg_get_indexdef(i.indexrelid), E'\\n' ORDER BY c.relname COLLATE "C"))
       FROM pg_index i JOIN pg_class c ON c.oid = i.indexrelid WHERE i.indrelid = to_regclass('public.${table}') AND c.relname = ANY (${arr(g.names)}))`,
  }[kind]
  return `${sql}\n    = '${g.n}:${g.md5}'`
}
const doc1Bodies = `(SELECT count(*) = 3 FROM pg_proc p WHERE p.pronamespace = 'public'::regnamespace AND (p.proname::text, md5(p.prosrc)) IN (
       ('creator_record_v2_append_only_guard', '853241fdf43eebd7a783cc6b633bc1dd'), ('creator_record_v2_append_only_guard', '509db484094209260f0378431fe917f8'),
       ('creator_record_v2_documents_guard', '16acef5be434a536c6527f05a5c64cb7'), ('creator_record_v2_documents_guard', 'c7137201b1f6bcf2e7f7f871a0b9ccb3'),
       ('creator_record_v2_prepared_documents_link', '98f1183d8e42468347e10f8de1c1a15b'), ('creator_record_v2_prepared_documents_link', 'cf2fee7f2acf902eaef69dd0cc2dee9c')))`
const rowCount = (table, where, expect, guard) => `CASE WHEN ${guard ?? `to_regclass('public.${table}') IS NULL`} THEN NULL ELSE
       (xpath('/row/n/text()', query_to_xml(${lit(`SELECT count(*) AS n FROM public.${table}${where ? ` WHERE ${where}` : ''}`)}, false, true, '')))[1]::text = '${expect}' END`
const hasColumn = (table, col) => `EXISTS (SELECT 1 FROM pg_attribute WHERE attrelid = 'public.${table}'::regclass AND attname = '${col}' AND attnum > 0 AND NOT attisdropped)`

/** Drift: names under the prefix, or on protected tables, that neither migration expects. Reported, never a failure. */
function drift(tables, extraKnown = {}) {
  const per = (kind, sql) => `'${kind}', (SELECT coalesce(json_agg(x.n ORDER BY x.n COLLATE "C"), '[]'::json) FROM (${sql}) x(n))`
  const names = (t, kind) => (extraKnown[`${t}.${kind}`] ? [...EXPECTED.known[`${t}.${kind}`], ...extraKnown[`${t}.${kind}`]].sort(C) : EXPECTED.known[`${t}.${kind}`])
  const known = (kind) => tables.map((t) => `(c.relname = '${t}' AND NOT (x.nm = ANY (${arr(names(t, kind))})))`).join('\n            OR ')
  return `json_build_object(
    ${per('tables', `SELECT relname::text FROM pg_class WHERE relnamespace = 'public'::regnamespace AND relkind IN ('r', 'v', 'm', 'p', 'f') AND relname LIKE 'creator\\_record\\_v2\\_%' AND NOT (relname = ANY (${arr(KNOWN_TABLES)}))`)},
    ${per('functions', `SELECT DISTINCT proname::text FROM pg_proc WHERE pronamespace = 'public'::regnamespace AND proname LIKE '%creator\\_record\\_v2%' AND NOT (proname = ANY (${arr([...new Set(KNOWN_FUNCTIONS)].sort(C))}))`)},
    ${per('columns', `SELECT c.relname || '.' || x.nm FROM pg_class c JOIN LATERAL (SELECT attname::text FROM pg_attribute WHERE attrelid = c.oid AND attnum > 0 AND NOT attisdropped) x(nm) ON true
        WHERE c.oid = ANY (${oids(tables)}) AND (${known('columns')})`)},
    ${per('constraints', `SELECT c.relname || '.' || x.nm FROM pg_class c JOIN LATERAL (SELECT conname::text FROM pg_constraint WHERE conrelid = c.oid) x(nm) ON true
        WHERE c.oid = ANY (${oids(tables)}) AND (${known('constraints')})`)},
    ${per('indexes', `SELECT c.relname || '.' || x.nm FROM pg_class c JOIN LATERAL (SELECT ic.relname::text FROM pg_index i JOIN pg_class ic ON ic.oid = i.indexrelid WHERE i.indrelid = c.oid) x(nm) ON true
        WHERE c.oid = ANY (${oids(tables)}) AND (${known('indexes')})`)})`
}

function verify({ migration, column, header, stateParts, rows, driftTables, extraKnown }) {
  return `${header}
SELECT json_build_object(
  'migration', '${migration}',
  'state', CASE (SELECT count(*) FROM (VALUES
${stateParts.map((p) => `                   (${p})`).join(',\n')}) o(x) WHERE o.x IS NOT NULL)
             WHEN 0 THEN 'absent' WHEN ${stateParts.length} THEN 'applied' ELSE 'partial' END,
  'all_pass', bool_and(coalesce(t.ok, false)),
  'failed', coalesce(json_agg(t.name ORDER BY t.name) FILTER (WHERE NOT coalesce(t.ok, false)), '[]'::json),
  'checks', count(*),
  'drift', ${drift(driftTables, extraKnown)}
) AS ${column}
FROM (VALUES
${rows.join(',\n')}
) AS t(name, ok);
`
}

const COMMON_HEADER = (n, migration, title, after) => `-- CR-V2-PROD-UAT-D1 · ${n} · READ-ONLY verification of ${migration} (${title}). One SELECT; reads catalogs and row counts.
-- GENERATED by build.js from expected.json: do not edit. Run it on its own after ${after}: it, not the Dashboard's response, is
-- the authority on whether ${after} COMMITTED. It is also embedded verbatim as the pre- and post-checks inside the apply files.
--   state 'absent'  : no ${migration} object exists (${after} did not commit; there is nothing to undo)
--   state 'applied' : every ${migration} object exists
--   state 'partial' : some exist. Impossible for a transactional apply: STOP and report.
--   all_pass / failed : the security and migration-integrity checks. Any failure is a STOP.
--   drift : names under the creator_record_v2 prefix, or on the protected tables, that neither migration expects. Reported
--           for review; never a failure by itself (unrelated objects are not migration blockers).
-- Exact on protected tables and functions: privileges of anon / authenticated / PUBLIC / service_role (incl. TRUNCATE, and
-- MAINTAIN on 17), RLS, policies, triggers (and that each is enabled), EXECUTE, function security mode and settings.
-- Safe in every state: a row count runs (query_to_xml, a fixed SELECT count(*)) only when its table or column exists.
-- Returns state, booleans and object names only (no ids, emails, paths or row contents).`

const DOC1_TABLES = [DOC, LOG, PDOC]
const P02 = [DOC, LOG, PDOC, MARK, FIX, RUNS]
const VERIFY_02 = verify({
  migration: '20261104000000', column: 'verify_20261104', driftTables: P02,
  header: COMMON_HEADER('02', '20261104000000', 'DOC-2C-B', '01'),
  stateParts: [`to_regclass('public.${MARK}')::oid`, `to_regclass('public.${FIX}')::oid`, `to_regclass('public.${RUNS}')::oid`,
    `to_regprocedure('public.creator_record_v2_record_examination(bigint,text)')::oid`,
    `(SELECT a.attrelid FROM pg_attribute a WHERE a.attrelid = 'public.${LOG}'::regclass AND a.attname = 'purpose' AND a.attnum > 0 AND NOT a.attisdropped)`],
  rows: [
    '  -- Migration-owned shapes (exact definitions of the named items)',
    row('shape_marker_columns', shape('marker_columns', MARK, 'columns')),
    row('shape_marker_constraints', shape('marker_constraints', MARK, 'constraints')),
    row('shape_marker_indexes', shape('marker_indexes', MARK, 'indexes')),
    row('shape_fixtures_columns', shape('fixtures_columns', FIX, 'columns')),
    row('shape_fixtures_constraints', shape('fixtures_constraints', FIX, 'constraints')),
    row('shape_fixtures_indexes', shape('fixtures_indexes', FIX, 'indexes')),
    row('shape_runs_columns', shape('runs_columns', RUNS, 'columns')),
    row('shape_runs_constraints', shape('runs_constraints', RUNS, 'constraints')),
    '  -- the two run constraints 20261105000000 replaces: exactly as committed until then',
    row('shape_runs_replaced_constraints', `CASE WHEN ${S05} THEN true ELSE ${shape('runs_replaced_constraints_s04', RUNS, 'constraints')} END`),
    row('shape_runs_indexes', shape('runs_indexes', RUNS, 'indexes')),
    row('shape_access_log_purpose', shape('access_log_purpose', LOG, 'columns')),
    row('shape_access_log_purpose_check', shape('access_log_purpose_check', LOG, 'constraints')),
    '  -- Data: no examination authority, nothing examined, the 45 committed fixtures, DOC-1 rows all downloads',
    row('marker_rows_0', rowCount(MARK, '', '0')),
    row('runs_rows_0', rowCount(RUNS, '', '0')),
    row('fixtures_rows_45', rowCount(FIX, "fixture_set = 'receipt-fixtures-v2/oracle-replay'", '45')),
    row('access_log_all_downloads', rowCount(LOG, "purpose <> 'file_download'", '0', `NOT ${hasColumn(LOG, 'purpose')}`)),
    '  -- Security, DOC-1 boundary (these must already pass before 20261104000000: 01 refuses otherwise), exact',
    row('doc1_table_privileges', tablePrivileges(DOC1_TABLES)),
    row('doc1_rls_on', rlsOn(DOC1_TABLES)),
    row('doc1_no_policies', noPolicies(DOC1_TABLES)),
    row('doc1_triggers_enabled', `(SELECT count(*) FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid WHERE t.tgenabled = 'O' AND NOT t.tgisinternal AND (c.relname, t.tgname) IN (
       ('${DOC}', 'creator_record_v2_documents_guard'), ('${LOG}', 'creator_record_v2_evidence_access_log_append_only'),
       ('${PDOC}', 'creator_record_v2_prepared_documents_append_only'), ('${PREP}', 'creator_record_v2_prepared_documents_link'))) = 4`),
    row('doc1_function_modes', functionModes(FN.DOC1)),
    row('doc1_function_execute', functionExecute(FN.DOC1)),
    row('doc1_function_bodies', doc1Bodies),
    '  -- Security, 20261104000000 objects, exact; triggers exact on every protected table',
    row('table_privileges', tablePrivileges([MARK, FIX, RUNS])),
    row('rls_on', rlsOn([MARK, FIX, RUNS])),
    row('no_policies', noPolicies([MARK, FIX, RUNS])),
    row('triggers', `${actualTriggers(P02)}
    = CASE WHEN ${S05} THEN ${arr(triggerList(Object.fromEntries(P02.map((t) => [t, TRIGGERS_05[t]]))))}
      ELSE ${arr(triggerList(TRIGGERS_04))} END`),
    row('table_owner', tableOwners([MARK, FIX, RUNS])),
    row('function_modes', functionModes(FN.M04)),
    row('function_owner', functionOwners(FN.M04)),
    row('function_execute', functionExecute(FN.M04)),
  ],
})

const P04 = [DOC, LOG, PDOC, MARK, FIX, RUNS, GRANTS]
const M04_KEPT = FN.M04.filter((f) => !/record_examination|access_log_insert_guard/.test(f.sig))
const M05_ALL = [...FN.M05, ...FN.M04.filter((f) => /record_examination|access_log_insert_guard/.test(f.sig))] // created or replaced by 20261105
const VERIFY_04 = verify({
  migration: '20261105000000', column: 'verify_20261105', driftTables: P04,
  header: COMMON_HEADER('04', '20261105000000', 'PROD-UAT-B', '03') + '\n-- Run 02 as well: the 20261104000000 checks must still pass after 20261105000000.',
  stateParts: [`to_regclass('public.${GRANTS}')::oid`, `to_regprocedure('public.creator_record_v2_examination_uat_status(text)')::oid`,
    `to_regprocedure('public.creator_record_v2_documents_seed_binding()')::oid`,
    `(SELECT a.attrelid FROM pg_attribute a WHERE a.attrelid = 'public.${DOC}'::regclass AND a.attname = 'origin' AND a.attnum > 0 AND NOT a.attisdropped)`,
    `(SELECT a.attrelid FROM pg_attribute a WHERE a.attrelid = 'public.${LOG}'::regclass AND a.attname = 'uat_grant_id' AND a.attnum > 0 AND NOT a.attisdropped)`],
  rows: [
    '  -- Migration-owned shapes (exact definitions of the named items)',
    row('shape_grants_columns', shape('grants_columns', GRANTS, 'columns')),
    row('shape_grants_constraints', shape('grants_constraints', GRANTS, 'constraints')),
    row('shape_grants_indexes', shape('grants_indexes', GRANTS, 'indexes')),
    row('shape_documents_columns', shape('documents_columns', DOC, 'columns')),
    row('shape_documents_constraints', shape('documents_constraints', DOC, 'constraints')),
    row('shape_documents_indexes', shape('documents_indexes', DOC, 'indexes')),
    row('shape_access_log_columns', shape('access_log_columns', LOG, 'columns')),
    row('shape_access_log_constraints', shape('access_log_constraints', LOG, 'constraints')),
    row('shape_access_log_indexes', shape('access_log_indexes', LOG, 'indexes')),
    row('shape_runs_columns', shape('runs05_columns', RUNS, 'columns')),
    row('shape_runs_constraints', shape('runs05_constraints', RUNS, 'constraints')),
    row('shape_runs_indexes', shape('runs05_indexes', RUNS, 'indexes')),
    row('runs_old_checks_replaced', `NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = to_regclass('public.${RUNS}')
       AND conname IN ('creator_record_v2_examination_runs_execution_boundary_check', 'creator_record_v2_examination_run_environment_project_ref_check'))`),
    row('doc1_consent_check_kept', `EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.${DOC}'::regclass AND conname = 'creator_record_v2_documents_consent_version_check')`),
    '  -- Data: no grant, every historical document an owner upload, nothing attributed to a grant, no marker',
    row('grants_rows_0', rowCount(GRANTS, '', '0')),
    row('documents_all_owner_upload', rowCount(DOC, "origin <> 'owner_upload' OR seed_grant_id IS NOT NULL OR consent_version IS NULL", '0', `NOT ${hasColumn(DOC, 'seed_grant_id')}`)),
    row('access_log_no_grant_rows', rowCount(LOG, 'uat_grant_id IS NOT NULL', '0', `NOT ${hasColumn(LOG, 'uat_grant_id')}`)),
    row('marker_rows_0', rowCount(MARK, '', '0')),
    '  -- Security: every protected table (DOC-1 + 20261104 + 20261105), exact',
    row('table_privileges', tablePrivileges(P04)),
    row('rls_on', rlsOn(P04)),
    row('no_policies', noPolicies(P04)),
    row('triggers', `${actualTriggers(P04)}
    = ${arr(triggerList(TRIGGERS_05))}`),
    row('doc1_link_trigger_enabled', `EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid = 'public.${PREP}'::regclass AND tgname = 'creator_record_v2_prepared_documents_link' AND tgenabled = 'O')`),
    row('table_owner', tableOwners([GRANTS])),
    '  -- Security: every protected function, exact',
    row('function_modes', functionModes([...FN.DOC1, ...M04_KEPT, ...M05_ALL])),
    row('function_owner', functionOwners(M05_ALL)),
    row('function_execute', functionExecute([...FN.DOC1, ...M04_KEPT, ...M05_ALL])),
    row('doc1_function_bodies', doc1Bodies),
  ],
})

// ── 20261106000000 (CR-V2-EXAM-INTEGRATION-X1): the customer_path_uat grant kind ─────────────────────────────────────────
/** The five functions 20261106000000 replaces, by body (md5 of prosrc, captured from the committed migration). */
const M06_BODIES = EXPECTED.functions_20261106
const M06_KNOWN = { [`${GRANTS}.columns`]: ['grant_kind'], [`${GRANTS}.constraints`]: ['creator_record_v2_examination_uat_grants_kind_check'] }
const S06_KIND = `(SELECT a.attrelid FROM pg_attribute a WHERE a.attrelid = to_regclass('public.${GRANTS}') AND a.attname = 'grant_kind' AND a.attnum > 0 AND NOT a.attisdropped)`
const VERIFY_06 = verify({
  migration: '20261106000000', column: 'verify_20261106', driftTables: P04, extraKnown: M06_KNOWN,
  header: COMMON_HEADER('06', '20261106000000', 'CR-V2-EXAM-INTEGRATION-X1', '05')
    + '\n-- Run 02 and 04 as well. On a database holding the E4 operator-UAT history they report that history as failed DATA checks'
    + '\n-- (02: runs_rows_0, access_log_all_downloads; 04: grants_rows_0, documents_all_owner_upload, access_log_no_grant_rows) and,'
    + '\n-- after 20261106000000, 04 also reports shape_runs_constraints (the run authority constraint this migration replaces). Any'
    + '\n-- other failure is a STOP. The checks below are invariants: they hold in every later state, not only at apply time.',
  stateParts: [S06_KIND,
    `(SELECT oid FROM pg_constraint WHERE conrelid = to_regclass('public.${GRANTS}') AND conname = 'creator_record_v2_examination_uat_grants_kind_check')`,
    `(SELECT oid FROM pg_constraint WHERE conrelid = to_regclass('public.${RUNS}') AND conname = 'creator_record_v2_examination_runs_authority_check' AND pg_get_constraintdef(oid) LIKE '%customer_path_synthetic_uat%')`],
  rows: [
    '  -- Migration-owned shapes (exact definitions of the named items)',
    row('shape_grants_columns', shape('grants06_columns', GRANTS, 'columns')),
    row('shape_grants_constraints', shape('grants06_constraints', GRANTS, 'constraints')),
    row('shape_grants_indexes', shape('grants_indexes', GRANTS, 'indexes')),
    row('shape_runs_columns', shape('runs05_columns', RUNS, 'columns')),
    row('shape_runs_constraints', shape('runs06_constraints', RUNS, 'constraints')),
    // Each body as committed: LF (as embedded in 05_apply) or CRLF (applied from a Windows checkout); one per function.
    row('function_bodies', `(SELECT count(DISTINCT p.proname) FROM pg_proc p WHERE p.pronamespace = 'public'::regnamespace AND (p.proname::text, md5(p.prosrc)) IN (
       ${Object.entries(M06_BODIES).flatMap(([n, ms]) => ms.map((m) => `(${lit(n)}, ${lit(m)})`)).join(', ')})) = ${Object.keys(M06_BODIES).length}`),
    row('status_function_result', `coalesce(pg_get_function_result(to_regprocedure('public.creator_record_v2_examination_uat_status(text)')), '') = ${lit(EXPECTED.status_result_20261106)}`),
    '  -- Data invariants: a run boundary agrees with its grant kind; a customer-path grant binds only its identity\'s own upload',
    row('runs_boundary_matches_grant_kind', rowCount(RUNS, `uat_grant_id IS NOT NULL AND (execution_boundary = 'customer_path_synthetic_uat') <> (uat_grant_id IN (SELECT id FROM public.${GRANTS} WHERE grant_kind = 'customer_path_uat'))`, '0', `${S06_KIND} IS NULL`)),
    row('customer_path_binds_owner_upload', rowCount(GRANTS, `grant_kind = 'customer_path_uat' AND bound_document_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.${DOC} d WHERE d.id = bound_document_id AND d.origin = 'owner_upload' AND d.seed_grant_id IS NULL AND d.user_id = test_user_id AND d.sha256 = document_sha256)`, '0', `${S06_KIND} IS NULL`)),
    '  -- Security: every protected table and function, exact (unchanged by 20261106000000)',
    row('table_privileges', tablePrivileges(P04)),
    row('rls_on', rlsOn(P04)),
    row('no_policies', noPolicies(P04)),
    row('triggers', `${actualTriggers(P04)}
    = ${arr(triggerList(TRIGGERS_05))}`),
    row('table_owner', tableOwners([GRANTS])),
    row('function_modes', functionModes([...FN.DOC1, ...M04_KEPT, ...M05_ALL])),
    row('function_owner', functionOwners(M05_ALL)),
    row('function_execute', functionExecute([...FN.DOC1, ...M04_KEPT, ...M05_ALL])),
    row('doc1_function_bodies', doc1Bodies),
  ],
})
/** The 02 / 04 checks the E4 operator-UAT history fails by design (data counts written for a pre-UAT database), and nothing else. */
const E4_DATA_02 = ['access_log_all_downloads', 'runs_rows_0']
const E4_DATA_04 = ['access_log_no_grant_rows', 'documents_all_owner_upload', 'grants_rows_0']
/**
 * The EXACT E4 history (expected.json e4_20261106, sourced from the committed E4 record and its e1_state reconciliation):
 * one run, one document, one examination access event and one grant, each with its recorded identity and relationships.
 * Anything more, less or different refuses. Checked runs → documents → examination events → grants, so the first
 * difference is named. `afterMigration` adds the one expected schema difference: the grant then reads operator_seed.
 */
const E4 = EXPECTED.e4_20261106
function e4Fingerprint(tag, afterMigration) {
  const L = (s) => lit(String(s))
  return `  -- The exact E4 history (08_Platform/implementation/CR_V2_PROD_UAT_E4_EXAMINATION_RECORD.md; expected.json e4_20261106).
  IF (SELECT count(*) FROM public.${RUNS}) <> 1 OR NOT EXISTS (SELECT 1 FROM public.${RUNS} r
       WHERE r.id = ${L(E4.run_id)} AND r.examination_key = ${L(E4.examination_key)} AND r.document_id = ${L(E4.document_id)}
         AND r.user_id = ${L(E4.test_user_id)} AND r.uat_grant_id = ${L(E4.grant_id)} AND r.execution_boundary = 'operator_synthetic_uat'
         AND r.environment_project_ref = ${L(E4.project_ref)} AND r.document_sha256 = ${L(E4.fixture_sha256)} AND r.replay_fixture_id = ${L(E4.fixture_id)}
         AND r.outcome_status = 'examined' AND r.outcome_reason IS NULL AND r.supersedes_id IS NULL) THEN
    RAISE EXCEPTION '${tag}: the examination runs are not exactly the E4 run';
  END IF;
  IF (SELECT count(*) FROM public.${DOC}) <> 1 OR NOT EXISTS (SELECT 1 FROM public.${DOC} d
       WHERE d.id = ${L(E4.document_id)} AND d.user_id = ${L(E4.test_user_id)} AND d.sha256 = ${L(E4.fixture_sha256)}
         AND d.origin = 'operator_synthetic_seed' AND d.seed_grant_id = ${L(E4.grant_id)} AND d.consent_version IS NULL AND d.state = 'stored') THEN
    RAISE EXCEPTION '${tag}: the documents are not exactly the E4 seeded document';
  END IF;
  IF (SELECT count(*) FROM public.${LOG} WHERE purpose = 'examination') <> 1
     OR (SELECT count(*) FROM public.${LOG} WHERE uat_grant_id IS NOT NULL) <> 1
     OR NOT EXISTS (SELECT 1 FROM public.${LOG} l JOIN public.${RUNS} r ON r.access_log_id = l.id
       WHERE l.purpose = 'examination' AND l.actor_role = 'owner' AND l.document_id = ${L(E4.document_id)}
         AND l.actor_user_id = ${L(E4.test_user_id)} AND l.uat_grant_id = ${L(E4.grant_id)} AND r.id = ${L(E4.run_id)}) THEN
    RAISE EXCEPTION '${tag}: the examination access events are not exactly the E4 event';
  END IF;
  IF (SELECT count(*) FROM public.${GRANTS}) <> 1 OR NOT EXISTS (SELECT 1 FROM public.${GRANTS} g
       WHERE g.id = ${L(E4.grant_id)} AND g.test_user_id = ${L(E4.test_user_id)} AND g.document_sha256 = ${L(E4.fixture_sha256)}
         AND g.bound_document_id = ${L(E4.document_id)} AND g.supabase_project_ref = ${L(E4.project_ref)}
         AND g.created_at = ${L(E4.grant_created_at)}::timestamptz AND g.expires_at = ${L(E4.grant_expires_at)}::timestamptz
         AND g.max_read_events = ${E4.grant_max_read_events} AND g.max_new_runs = ${E4.grant_max_new_runs}
         AND g.revoked_at IS NOT NULL AND g.revoked_by IS NOT NULL AND g.revoke_reason IS NOT NULL${afterMigration ? `
         AND g.grant_kind = 'operator_seed'` : ''}) THEN
    RAISE EXCEPTION '${tag}: the UAT grants are not exactly the revoked E4 grant';
  END IF;`
}
const onlyAllowed = (tag, label, allowed) => `  IF v->>'state' IS DISTINCT FROM 'applied' OR EXISTS (SELECT 1 FROM json_array_elements_text(v->'failed') f(name) WHERE NOT (f.name = ANY (${arr(allowed)}))) THEN
    RAISE EXCEPTION '${tag}: ${label} is not applied, or fails a check other than the E4 history: %', v;
  END IF;`

// ── Apply files ─────────────────────────────────────────────────────────────────────────────────────────────────────
/** Bounded waits for every apply transaction (see README: lock release, aborted sessions, idle and transaction timeouts). */
const OPEN = `BEGIN;
SET LOCAL lock_timeout = '5s';                          -- fail rather than queue for a lock (a queued ALTER would block others)
SET LOCAL statement_timeout = '120s';                   -- no single statement may run longer
SET LOCAL idle_in_transaction_session_timeout = '60s';  -- a transaction left OPEN and idle (no error) ends within a minute
DO $timeout$ BEGIN  -- PostgreSQL 17+: bound the whole transaction, even while busy (the setting does not exist before 17)
  IF current_setting('server_version_num')::int >= 170000 THEN PERFORM set_config('transaction_timeout', '180s', true); END IF;
END $timeout$;
-- On any error the transaction aborts and releases every lock at once; the session then accepts nothing but ROLLBACK
-- (which the operator runs). An abort also reverts these SET LOCAL values, so they do not apply to the aborted session.`

/** Production corroboration only: the Dashboard establishes identity; this refuses a database that is plainly not Production. */
const IDENTITY = (tag) => `  IF current_setting('server_version_num')::int < 150000 THEN
    RAISE EXCEPTION '${tag} refused: PostgreSQL 15 or later is required (found %)', current_setting('server_version');
  END IF;
  -- Supporting evidence, not authentication: Production holds the real Cloud World assessment (an SI8 system-test record,
  -- is_system_test = true since 20260719000000); a staging copy holds the placeholder with methodology STAGING-PLACEHOLDER.
  IF to_regclass('public.assessments') IS NULL OR NOT EXISTS (
       SELECT 1 FROM public.assessments
        WHERE assessment_number = 'ASSESS-005-2026-07-12' AND methodology_version IS DISTINCT FROM 'STAGING-PLACEHOLDER') THEN
    RAISE EXCEPTION '${tag} refused: this database does not look like Production';
  END IF;`

const body = (sql) => sql.replace(/;\s*$/, '')
const verifyInto = (sql, column) => `  SELECT x.${column} INTO v FROM (
${body(sql)}
  ) x;`

function apply({ tag, migration, title, pre, post, verifySql, verifyFile, verifyColumn }) {
  return `-- CR-V2-PROD-UAT-D1 · ${tag} · APPLY ${migration} (${title}) — ONE transaction. Database operator only, in the SQL
-- Editor of the verified Production project. GENERATED by build.js from the committed migration and ${verifyFile}: do not edit.
--
-- What happens: BEGIN with bounded timeouts → pre-check (refuses before any change) → the migration, verbatim → post-check
-- (${verifyFile}, verbatim; refuses unless every check passes) → schema-cache reload notification → COMMIT.
-- Every refusal or error happens before COMMIT, so nothing is committed. The NOTIFY is delivered only if COMMIT succeeds.
--
-- Success looks like exactly one returned row: ${tag.toLowerCase()}_result = '${migration} COMMITTED'. Then run ${verifyFile}.
-- On ANY error or an unclear response (timeout, network, browser): run   ROLLBACK;   on its own (harmless if nothing is
-- open), then run ${verifyFile} on its own. Its "state" decides: 'absent' = nothing committed; 'applied' = committed;
-- 'partial' = STOP and report. Never re-run this file without reading that result first. See README.md.

${OPEN}

-- ═══ PRE-CHECK ═══════════════════════════════════════════════════════════════════════════════════════════════
DO $d1_pre$
DECLARE
  v json;
BEGIN
${IDENTITY(tag)}
${pre}
END
$d1_pre$;

-- ═══ BEGIN VERBATIM supabase/migrations/${migration}_${title}.sql ═══════════════════════════════════════
${read(path.join(MIGRATIONS, `${migration}_${title}.sql`)).trimEnd()}
-- ═══ END VERBATIM ════════════════════════════════════════════════════════════════════════════════════════════

-- ═══ POST-CHECK: ${verifyFile}, verbatim ═══════════════════════════════════════════════════════════
DO $d1_post$
DECLARE
  v json;
BEGIN
${verifyInto(verifySql, verifyColumn)}
  IF v->>'state' IS DISTINCT FROM 'applied' OR (v->>'all_pass')::boolean IS NOT TRUE THEN
    RAISE EXCEPTION '${tag} post-check failed; nothing is committed: %', v;
  END IF;${post ? `\n${post}` : ''}
END
$d1_post$;

NOTIFY pgrst, 'reload schema';
COMMIT;
SELECT '${migration} COMMITTED' AS ${tag.toLowerCase()}_result;
`
}

/** The pre-check for 01 requires these 02 checks to pass already on the DOC-1 schema (the DOC-1 boundary as verified in Production). */
const DOC1_PRECHECKS = ['doc1_function_bodies', 'doc1_function_execute', 'doc1_function_modes', 'doc1_no_policies', 'doc1_rls_on', 'doc1_table_privileges', 'doc1_triggers_enabled']

const FILES = {
  '02_verify_20261104.sql': VERIFY_02,
  '04_verify_20261105.sql': VERIFY_04,
  '06_verify_20261106.sql': VERIFY_06,
  '01_apply_20261104.sql': apply({
    tag: 'D1A', migration: '20261104000000', title: 'creator_record_v2_examination_runs',
    verifySql: VERIFY_02, verifyFile: '02_verify_20261104.sql', verifyColumn: 'verify_20261104',
    pre: `  -- 20261104000000 must be wholly absent, and the DOC-1 boundary exactly as verified in Production (U3).
${verifyInto(VERIFY_02, 'verify_20261104')}
  IF v->>'state' IS DISTINCT FROM 'absent' THEN
    RAISE EXCEPTION 'D1A refused: 20261104000000 is not absent (state %); run 02_verify_20261104.sql and stop', v->>'state';
  END IF;
  IF (v->'failed')::jsonb ?| ${arr(DOC1_PRECHECKS)} THEN
    RAISE EXCEPTION 'D1A refused: the DOC-1 boundary differs from the verified Production fingerprint: %', v->'failed';
  END IF;
  -- 20261105000000 must be absent too (it can only follow this file).
${verifyInto(VERIFY_04, 'verify_20261105')}
  IF v->>'state' IS DISTINCT FROM 'absent' THEN
    RAISE EXCEPTION 'D1A refused: 20261105000000 objects exist (state %); stop', v->>'state';
  END IF;`,
  }),
  '03_apply_20261105.sql': apply({
    tag: 'D1B', migration: '20261105000000', title: 'creator_record_v2_operator_synthetic_uat',
    verifySql: VERIFY_04, verifyFile: '04_verify_20261105.sql', verifyColumn: 'verify_20261105',
    pre: `  -- 20261104000000 must be applied and still pass every check (01 → 02 done), and 20261105000000 wholly absent.
${verifyInto(VERIFY_02, 'verify_20261104')}
  IF v->>'state' IS DISTINCT FROM 'applied' OR (v->>'all_pass')::boolean IS NOT TRUE THEN
    RAISE EXCEPTION 'D1B refused: 20261104000000 is not applied and verified: %', v;
  END IF;
${verifyInto(VERIFY_04, 'verify_20261105')}
  IF v->>'state' IS DISTINCT FROM 'absent' THEN
    RAISE EXCEPTION 'D1B refused: 20261105000000 is not absent (state %); run 04_verify_20261105.sql and stop', v->>'state';
  END IF;
  -- (The migration's own preconditions follow: historical consent consistency and the exact DOC-2C-B run constraints.)`,
  }),
  '05_apply_20261106.sql': apply({
    tag: 'X1P', migration: '20261106000000', title: 'creator_record_v2_customer_path_uat',
    verifySql: VERIFY_06, verifyFile: '06_verify_20261106.sql', verifyColumn: 'verify_20261106',
    pre: `  -- 20261106000000 wholly absent (checked first: a second run is named as such).
${verifyInto(VERIFY_06, 'verify_20261106')}
  IF v->>'state' IS DISTINCT FROM 'absent' THEN
    RAISE EXCEPTION 'X1P refused: 20261106000000 is not absent (state %); run 06_verify_20261106.sql and stop', v->>'state';
  END IF;
  -- 20261104000000 and 20261105000000 applied, failing nothing but the E4 operator-UAT history (data counts).
${verifyInto(VERIFY_02, 'verify_20261104')}
${onlyAllowed('X1P refused', '20261104000000', E4_DATA_02)}
${verifyInto(VERIFY_04, 'verify_20261105')}
${onlyAllowed('X1P refused', '20261105000000', E4_DATA_04)}
${e4Fingerprint('X1P refused', false)}
  -- No examination authority in force while the schema changes: no active grant of any kind, no isolated-test marker.
  IF EXISTS (SELECT 1 FROM public.${GRANTS} WHERE revoked_at IS NULL AND expires_at > now()) THEN
    RAISE EXCEPTION 'X1P refused: an examination UAT grant is active; revoke it first';
  END IF;
  IF EXISTS (SELECT 1 FROM public.${MARK}) THEN
    RAISE EXCEPTION 'X1P refused: the isolated-test environment marker exists; this is not the Production state';
  END IF;
  -- (The migration's own precondition follows: the exact 20261105000000 run authority constraint.)`,
    post: `  -- 02 and 04 still fail nothing but the E4 history (04 also: the run authority constraint 20261106000000 replaced).
${verifyInto(VERIFY_02, 'verify_20261104')}
${onlyAllowed('X1P post-check failed; nothing is committed', '20261104000000', E4_DATA_02)}
${verifyInto(VERIFY_04, 'verify_20261105')}
${onlyAllowed('X1P post-check failed; nothing is committed', '20261105000000', [...E4_DATA_04, 'shape_runs_constraints'].sort(C))}
  -- Every E4 row is still exactly as before; the grant now reads operator_seed (the one expected schema difference).
${e4Fingerprint('X1P post-check failed; nothing is committed', true)}`,
  }),
}

module.exports = { FILES, TABLE_PRIVS, TRIGGERS_04, TRIGGERS_05, FN, E4_DATA_02, E4_DATA_04 }
if (require.main === module) {
  const check = process.argv.includes('--check')
  let stale = 0
  for (const [name, text] of Object.entries(FILES)) {
    const file = path.join(HERE, name)
    const current = fs.existsSync(file) ? read(file) : null
    if (check) {
      if (current !== text) { console.log(`STALE: ${name}`); stale++ }
    } else {
      fs.writeFileSync(file, text)
      console.log(`wrote ${name}`)
    }
  }
  if (check) { console.log(stale ? `${stale} file(s) differ from build.js output` : 'pack files are current'); process.exit(stale ? 1 : 0) }
}
