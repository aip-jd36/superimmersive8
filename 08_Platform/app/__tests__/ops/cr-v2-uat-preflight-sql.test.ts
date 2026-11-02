/**
 * CR-V2-PROD-UAT-B — the operator synthetic UAT preflight pack (supabase/verification/cr-v2-uat-preflight) must stay
 * read-only: each file is exactly ONE SELECT, with no statement or function that writes data, schema, grants,
 * sequences, locks, session settings or configuration, and no column that returns personal data. Each query is also
 * executed inside READ ONLY transactions by __tests__/db/creator-record-v2-operator-uat.db.test.ts.
 */
import { readdirSync, readFileSync } from 'fs'
import { join } from 'path'

const DIR = join(__dirname, '..', '..', 'supabase', 'verification', 'cr-v2-uat-preflight')
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
/** Columns that would return personal data, secrets, paths or consent text. */
const PERSONAL = ['email', 'name', 'file_name', 'storage_path', 'consent_version', 'actor_user_id', 'binding_nonce_sha256', 'raw_user_meta_data', 'canonical', 'envelope_canonical']

test('the pack has exactly the four labelled queries', () => {
  expect(files).toEqual(['u1_object_presence.sql', 'u2_document_provenance.sql', 'u3_doc1_fingerprint.sql', 'u4_migration_history.sql'])
})

describe.each(files)('%s', (file) => {
  const sql = readFileSync(join(DIR, file), 'utf8')
  const body = code(sql)

  test('is labelled, and says it is read-only', () => {
    expect(sql).toMatch(new RegExp(`^-- CR-V2-PROD-UAT-B preflight U${file[1]} · READ-ONLY\\.`))
  })

  test('is exactly one statement, and it is a SELECT', () => {
    const statements = body.split(';').map((s) => s.trim()).filter(Boolean)
    expect(statements).toHaveLength(1)
    expect(statements[0]).toMatch(/^(SELECT|WITH)\b/i)
  })

  test('uses no statement or function that writes, locks or changes settings', () => {
    for (const word of FORBIDDEN) expect({ word, found: new RegExp(`\\b${word}\\b`, 'i').test(body) }).toEqual({ word, found: false })
  })

  test('returns no personal-data, path, consent-text or secret column', () => {
    // U2 may FILTER on consent_version (compared with a literal); it never selects it.
    const scanned = file.startsWith('u2_') ? body.replace(/\bconsent_version\s+(=|IS DISTINCT FROM)\s+''/gi, ' ') : body
    for (const col of PERSONAL) expect({ col, found: new RegExp(`(^|[^a-z_'])${col}([^a-z_']|$)`, 'i').test(scanned) }).toEqual({ col, found: false })
  })
})

test('U2 reads only DOC-1 tables, and only counts', () => {
  const body = code(readFileSync(join(DIR, 'u2_document_provenance.sql'), 'utf8'))
  const tables = Array.from(body.matchAll(/\bFROM\s+([a-z_]+\.[a-z_0-9]+)/gi)).map((m) => m[1].toLowerCase())
  for (const t of tables) expect(['public.creator_record_v2_documents', 'public.creator_record_v2_evidence_access_log', 'public.creator_record_v2_prepared_documents']).toContain(t)
})

test('the offline comparator accepts the expected fingerprint and refuses a changed function', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { compare } = require(join(DIR, 'compare.js'))
  const expected = JSON.parse(readFileSync(join(DIR, 'expected', 'u3_post_doc1.json'), 'utf8'))
  expect(compare(expected, expected)).toEqual([])
  const changed = JSON.parse(JSON.stringify(expected))
  changed.functions.creator_record_v2_documents_guard.definer = true
  changed.functions.creator_record_v2_prepared_documents_link.md5 = '0'.repeat(32)
  changed.consent_version_not_null = false
  expect(compare(changed, expected)).toEqual([
    'consent_version_not_null differs',
    'function creator_record_v2_documents_guard.definer differs',
    'function creator_record_v2_prepared_documents_link body differs from DOC-1 (beyond line endings)',
  ])
})
