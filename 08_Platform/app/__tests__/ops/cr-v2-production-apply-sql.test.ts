/**
 * CR-V2-PROD-UAT-D1 — static review of the Production migration execution pack
 * (supabase/operator/creator-record-v2-uat/production-apply). No database.
 *
 * The two apply files must be exactly what build.js assembles from the committed migrations and verification queries;
 * each must be one transaction with bounded waits, a pre-check, the migration verbatim, the verification query verbatim
 * as its post-check, the schema-cache NOTIFY inside the transaction, and a single COMMIT. The two verification queries
 * must be one read-only SELECT each.
 */
import { readFileSync } from 'fs'
import { join } from 'path'

const APP = join(__dirname, '..', '..')
const DIR = join(APP, 'supabase', 'operator', 'creator-record-v2-uat', 'production-apply')
const MIGRATIONS = join(APP, 'supabase', 'migrations')
const read = (p: string) => readFileSync(p, 'utf8').replace(/\r\n/g, '\n')
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { FILES } = require(join(DIR, 'build.js')) as { FILES: Record<string, string> }

const APPLY = [
  { file: '01_apply_20261104.sql', migration: '20261104000000_creator_record_v2_examination_runs.sql', verify: '02_verify_20261104.sql', tag: 'D1A' },
  { file: '03_apply_20261105.sql', migration: '20261105000000_creator_record_v2_operator_synthetic_uat.sql', verify: '04_verify_20261105.sql', tag: 'D1B' },
]
const VERIFY = ['02_verify_20261104.sql', '04_verify_20261105.sql']

/** SQL with comments and string literals blanked, so keywords are matched only in code. */
const code = (sql: string) => sql.replace(/--[^\n]*/g, ' ').replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/'(?:[^']|'')*'/g, "''")
/** Top-level statements: dollar-quoted bodies are blanked first so semicolons inside them do not split. */
const statements = (sql: string) => code(sql).replace(/\$([a-z0-9_]*)\$[\s\S]*?\$\1\$/gi, '$$$$').split(';').map((s) => s.trim()).filter(Boolean)

test('build.js reproduces all four pack files exactly (they never drift from the migrations, expected.json and the reviewed rules)', () => {
  expect(Object.keys(FILES).sort()).toEqual([...APPLY.map((a) => a.file), ...VERIFY].sort())
  for (const name of Object.keys(FILES)) expect(read(join(DIR, name))).toBe(FILES[name])
})

test('D1C: the verification privilege matrix covers every table privilege (MAINTAIN on 17) for anon, authenticated, PUBLIC and service_role', () => {
  for (const v of VERIFY) {
    const sql = read(join(DIR, v))
    expect(sql).toContain(
      "unnest(ARRAY['DELETE', 'INSERT', 'REFERENCES', 'SELECT', 'TRIGGER', 'TRUNCATE', 'UPDATE'] || CASE WHEN current_setting('server_version_num')::int >= 170000 THEN ARRAY['MAINTAIN'] ELSE ARRAY[]::text[] END) p(priv)")
    expect(sql).toContain("unnest(ARRAY['anon', 'authenticated', 'public', 'service_role']) r(role)")
    // drift is reported beside all_pass, never inside it
    expect(sql.indexOf("'drift', json_build_object(")).toBeGreaterThan(sql.indexOf("'all_pass', bool_and(coalesce(t.ok, false))"))
    expect(sql).toMatch(/'state', CASE/)
  }
  // the 01 pre-check requires the whole DOC-1 boundary group to pass before any change
  expect(read(join(DIR, '01_apply_20261104.sql'))).toContain(
    "IF (v->'failed')::jsonb ?| ARRAY['doc1_function_bodies', 'doc1_function_execute', 'doc1_function_modes', 'doc1_no_policies', 'doc1_rls_on', 'doc1_table_privileges', 'doc1_triggers_enabled'] THEN")
})

describe.each(APPLY)('$file', ({ file, migration, verify, tag }) => {
  const sql = read(join(DIR, file))
  const top = statements(sql)

  test('contains the committed migration verbatim, once, between the markers', () => {
    const body = read(join(MIGRATIONS, migration)).trimEnd()
    const start = sql.indexOf(`-- ═══ BEGIN VERBATIM supabase/migrations/${migration} `)
    const end = sql.indexOf('-- ═══ END VERBATIM ')
    expect(start).toBeGreaterThan(0)
    expect(end).toBeGreaterThan(start)
    const region = sql.slice(sql.indexOf('\n', start) + 1, end).replace(/\n$/, '')
    expect(region).toBe(body)
    expect(sql.split(body).length - 1).toBe(1)
  })

  test('is one transaction: BEGIN first, bounded waits before any change, NOTIFY then COMMIT last, and a single result row after it', () => {
    expect(top[0]).toBe('BEGIN')
    expect(top.slice(1, 4)).toEqual(["SET LOCAL lock_timeout = ''", "SET LOCAL statement_timeout = ''", "SET LOCAL idle_in_transaction_session_timeout = ''"])
    expect(sql).toContain("SET LOCAL lock_timeout = '5s';")
    expect(sql).toContain("SET LOCAL statement_timeout = '120s';")
    expect(sql).toContain("SET LOCAL idle_in_transaction_session_timeout = '60s';")
    expect(sql).toContain("PERFORM set_config('transaction_timeout', '180s', true)")
    expect(top.filter((s) => /^(BEGIN|START TRANSACTION)$/i.test(s))).toHaveLength(1)
    expect(top.filter((s) => /^(COMMIT|END)$/i.test(s))).toHaveLength(1)
    expect(top.filter((s) => /^(ROLLBACK|ABORT|SAVEPOINT|RELEASE|PREPARE TRANSACTION|COMMIT PREPARED)/i.test(s))).toHaveLength(0)
    expect(top.slice(-3)).toEqual(["NOTIFY pgrst, ''", 'COMMIT', `SELECT '' AS ${tag.toLowerCase()}_result`])
    expect(sql.trimEnd().endsWith(`SELECT '${migration.slice(0, 14)} COMMITTED' AS ${tag.toLowerCase()}_result;`)).toBe(true)
  })

  test('runs the identity, pre-check and post-check before COMMIT, with the verification query embedded verbatim as the post-check', () => {
    const verifyBody = read(join(DIR, verify)).replace(/;\s*$/, '')
    const post = sql.indexOf('-- ═══ POST-CHECK')
    expect(post).toBeGreaterThan(sql.indexOf('-- ═══ END VERBATIM'))
    expect(sql.indexOf(verifyBody, post)).toBeGreaterThan(post)
    expect(sql.indexOf('\nCOMMIT;')).toBeGreaterThan(sql.indexOf(verifyBody, post))
    expect(sql.indexOf('-- ═══ PRE-CHECK')).toBeLessThan(sql.indexOf('-- ═══ BEGIN VERBATIM'))
    expect(sql.slice(0, sql.indexOf('-- ═══ BEGIN VERBATIM'))).toContain("methodology_version IS DISTINCT FROM 'STAGING-PLACEHOLDER'")
    expect(sql).toContain(`RAISE EXCEPTION '${tag} post-check failed; nothing is committed: %', v;`)
  })

  test('never creates a grant, a marker, a user, a document or a run, and never touches auth or storage', () => {
    const own = code(sql.replace(read(join(MIGRATIONS, migration)).trimEnd(), ''))
    expect(own).not.toMatch(/\b(INSERT|UPDATE|DELETE|TRUNCATE|DROP|ALTER|CREATE|GRANT|REVOKE|COPY)\b/i)
    expect(sql).not.toMatch(/\bauth\.|\bstorage\./)
  })
})

describe.each(VERIFY)('%s', (file) => {
  const sql = read(join(DIR, file))
  const body = code(sql)

  test('is exactly one SELECT', () => {
    const s = statements(sql)
    expect(s).toHaveLength(1)
    expect(s[0]).toMatch(/^SELECT\b/)
  })

  test('writes, locks and changes nothing', () => {
    const FORBIDDEN = ['insert', 'update', 'delete', 'merge', 'alter', 'create', 'drop', 'grant', 'revoke', 'truncate', 'comment', 'copy', 'vacuum',
      'analyze', 'refresh', 'notify', 'listen', 'lock', 'call', 'do', 'execute', 'prepare', 'begin', 'commit', 'rollback', 'savepoint', 'set', 'reset',
      'discard', 'into', 'set_config', 'nextval', 'setval', 'pg_advisory_lock', 'pg_advisory_xact_lock', 'pg_terminate_backend', 'pg_cancel_backend',
      'pg_reload_conf', 'lo_import', 'lo_export', 'dblink', 'pg_read_file', 'pg_ls_dir']
    for (const w of FORBIDDEN) expect({ w, found: new RegExp(`\\b${w}\\b`, 'i').test(body) }).toEqual({ w, found: false })
  })

  test('runs only fixed row counts through query_to_xml, each guarded by the existence of its table or column', () => {
    const calls = Array.from(sql.matchAll(/query_to_xml\('((?:[^']|'')*)'/g)).map((m) => m[1])
    expect(calls.length).toBeGreaterThan(0)
    for (const q of calls) expect(q).toMatch(/^SELECT count\(\*\) AS n FROM public\.creator_record_v2_[a-z_]+( WHERE [^;]*)?$/)
    expect(sql.split('query_to_xml(').length - 1).toBe(calls.length)
    // every call sits in CASE WHEN <table or column missing> THEN NULL ELSE … END
    expect(sql.split('query_to_xml(').length - 1).toBe(sql.split(' THEN NULL ELSE\n').length - 1)
  })

  test('returns only state, booleans and check names (no personal data, paths or row contents)', () => {
    expect(sql).toMatch(/'state', CASE/)
    expect(body).not.toMatch(/\b(email|file_name|storage_path|actor_user_id|binding_nonce_sha256|envelope_canonical|raw_user_meta_data)\b/i)
  })
})
