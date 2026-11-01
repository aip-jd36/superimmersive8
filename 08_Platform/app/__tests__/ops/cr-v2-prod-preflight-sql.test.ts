/**
 * CR-V2-PROD-2 — the Production verification SQL pack must stay read-only.
 *
 * Every query in supabase/verification/cr-v2-prod-preflight is run by an operator in the Production SQL Editor,
 * so each file must be exactly ONE read-only statement (SELECT / WITH ... SELECT), with no statement or function
 * that writes data, schema, grants, sequences, locks, session settings or configuration, and no column that
 * would return personal data. (The queries were also executed inside READ ONLY transactions against the
 * rebuilt pre-M2 and post-M3 schemas on PostgreSQL 15 when the pack was made.)
 */
import { readdirSync, readFileSync } from 'fs'
import { join } from 'path'

const DIR = join(__dirname, '..', '..', 'supabase', 'verification', 'cr-v2-prod-preflight')
const files = readdirSync(DIR).filter((f) => f.endsWith('.sql')).sort()

/** The SQL with comments and string literals removed, so keywords are only matched in code. */
function code(sql: string): string {
  return sql
    .replace(/--[^\n]*/g, ' ')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/'(?:[^']|'')*'/g, "''")
}

const FORBIDDEN = [
  'insert', 'update', 'delete', 'merge', 'upsert', 'alter', 'create', 'drop', 'grant', 'revoke', 'truncate', 'comment',
  'copy', 'vacuum', 'analyze', 'reindex', 'cluster', 'refresh', 'notify', 'listen', 'lock', 'call', 'do', 'execute',
  'prepare', 'begin', 'commit', 'rollback', 'savepoint', 'set', 'reset', 'discard', 'security', 'into',
  'set_config', 'nextval', 'setval', 'pg_advisory_lock', 'pg_advisory_xact_lock', 'pg_terminate_backend', 'pg_cancel_backend',
  'pg_reload_conf', 'lo_import', 'lo_export', 'dblink', 'query_to_xml', 'pg_read_file', 'pg_ls_dir',
]
/** Columns that would return personal data or secrets. */
const PERSONAL = ['email', 'filmmaker_name', 'filmmaker_contact', 'name', 'title', 'raw_user_meta_data', 'stripe_payment_intent_id', 'storage_path', 'document_path', 'document_url', 'claim_token', 'activation_note', 'statements']

test('the pack has exactly the six labelled queries', () => {
  expect(files).toEqual([
    'q1_table_columns.sql', 'q2_constraints_triggers_indexes.sql', 'q3_functions_buckets.sql',
    'q4_migration_history.sql', 'q5_v1_exposure.sql', 'q6_m2_m3_compatibility.sql',
  ])
})

describe.each(files)('%s', (file) => {
  const sql = readFileSync(join(DIR, file), 'utf8')
  const body = code(sql)

  test('is labelled, and says it is read-only', () => {
    expect(sql).toMatch(new RegExp(`^-- CR-V2-PROD-2 · Q${file[1]} of 6 · `))
    expect(sql).toMatch(/READ-ONLY/)
  })

  test('is exactly one statement, and it is a SELECT', () => {
    const statements = body.split(';').map((s) => s.trim()).filter(Boolean)
    expect(statements).toHaveLength(1)
    expect(statements[0]).toMatch(/^(SELECT|WITH)\b/i)
  })

  test('uses no statement or function that writes, locks or changes settings', () => {
    for (const word of FORBIDDEN) expect({ word, found: new RegExp(`\\b${word}\\b`, 'i').test(body) }).toEqual({ word, found: false })
  })

  test('reads no personal-data or secret column', () => {
    // `name` is allowed only in catalog-only queries (Q1-Q4, Q6: CTE aliases and migration names, never a person);
    // Q5 reads row data, and none of its tables is `users`. A presence test (`document_url IS NOT NULL`) returns no value.
    const allowed = file.startsWith('q5_') ? [] : ['name']
    const scanned = body.replace(/\b[a-z_.]*document_url\s+IS\s+NOT\s+NULL\b/gi, ' ')
    for (const col of PERSONAL.filter((c) => !allowed.includes(c))) {
      expect({ col, found: new RegExp(`(^|[^a-z_'])${col}([^a-z_']|$)`, 'i').test(scanned) }).toEqual({ col, found: false })
    }
  })
})

test('Q5 reads only the v1 transaction tables, and only aggregate or identifier columns', () => {
  const body = code(readFileSync(join(DIR, 'q5_v1_exposure.sql'), 'utf8'))
  const tables = Array.from(body.matchAll(/\bFROM\s+([a-z_]+\.[a-z_]+)/gi)).map((m) => m[1].toLowerCase())
  for (const t of tables) expect(['public.submissions', 'public.payment_fulfillments', 'public.creator_record_artifacts', 'public.rights_packages',
    'storage.objects', 'public.creator_record_artifact_uat', 'public.payment_legacy_session_policy']).toContain(t)
  expect(body).not.toMatch(/\bcreator_record_product\b/) // valid against the CURRENT (pre-M3) schema
})
