/**
 * CR-V2-UAT-PROD-3 — keeps 07_preflight_20261106.sql (the read-only standalone preflight) synchronized with the checks
 * 05_apply_20261106.sql makes ITSELF. No database.
 *
 * Every authoritative condition in 07 must be exactly the positive (De Morgan) form of 05's refusal condition, compared
 * as text after whitespace normalization: the four E4 fingerprint conditions, no active grant, no marker, the Production
 * identity predicate, the server-version bound and the exact 20261105 run authority constraint literal. Changing a
 * fingerprint value, a predicate or a literal in either file fails this test. 07 must also be one read-only SELECT.
 */
import { readFileSync } from 'fs'
import { join } from 'path'

const DIR = join(__dirname, '..', '..', 'supabase', 'operator', 'creator-record-v2-uat', 'production-apply')
const read = (f: string) => readFileSync(join(DIR, f), 'utf8').replace(/\r\n/g, '\n')
const APPLY = read('05_apply_20261106.sql')
const P4 = read('07_preflight_20261106.sql')
const norm = (s: string) => s.replace(/\s+/g, ' ').trim()

/** 05's PRE-CHECK only (before the verbatim migration), so the post-check's grant_kind clause never enters. */
const PRE = APPLY.slice(APPLY.indexOf('-- ═══ PRE-CHECK'), APPLY.indexOf('-- ═══ BEGIN VERBATIM'))
/** `IF <cond> THEN RAISE EXCEPTION '<message>'` in 05's pre-check, by message. */
function refusal(message: string): string {
  const at = PRE.indexOf(`RAISE EXCEPTION '${message}'`)
  if (at < 0) throw new Error(`05 has no refusal: ${message}`)
  const start = PRE.lastIndexOf('\n  IF ', at)
  return norm(PRE.slice(start + '\n  IF '.length, PRE.lastIndexOf(' THEN', at)))
}
/** The expression 07 reports under `'<key>', <expr>,` (up to the next top-level key or the closing paren). */
function reported(key: string): string {
  const start = P4.indexOf(`  '${key}', `)
  if (start < 0) throw new Error(`07 has no key: ${key}`)
  const rest = P4.slice(start + key.length + 6)
  const end = rest.search(/,\n  '[a-z0-9_]+', |\n\) AS preflight_20261106;/)
  return norm(rest.slice(0, end))
}
/** The positive form of a refusal condition: NOT (a <> 1 OR b <> 1 OR NOT EXISTS x) = a = 1 AND b = 1 AND EXISTS x. */
const positive = (cond: string) => cond.replace(/ OR NOT EXISTS \(/g, ' AND EXISTS (').replace(/ <> 1 (OR|AND) /g, ' = 1 AND ')

describe('07 mirrors 05’s own pre-check conditions exactly', () => {
  test.each([
    ['e4_run_exact', 'X1P refused: the examination runs are not exactly the E4 run'],
    ['e4_document_exact', 'X1P refused: the documents are not exactly the E4 seeded document'],
    ['e4_event_exact', 'X1P refused: the examination access events are not exactly the E4 event'],
    ['e4_grant_exact_and_revoked', 'X1P refused: the UAT grants are not exactly the revoked E4 grant'],
  ])('%s is the positive form of 05’s fingerprint condition, value for value', (key, message) => {
    const cond = refusal(message)
    expect(cond).toMatch(/^\(SELECT count\(\*\) FROM public\.creator_record_v2_[a-z_]+( WHERE [^)]*)?\) <> 1 OR /)
    expect(reported(key)).toBe(positive(cond))
  })

  test('no active grant and no marker are the negations of 05’s refusals', () => {
    expect(reported('no_active_grant')).toBe(`NOT ${refusal('X1P refused: an examination UAT grant is active; revoke it first')}`)
    expect(reported('no_marker')).toBe(`NOT ${refusal('X1P refused: the isolated-test environment marker exists; this is not the Production state')}`)
  })

  test('the Production identity predicate and the server-version bound are 05’s', () => {
    const identity = norm(PRE.slice(PRE.indexOf('SELECT 1 FROM public.assessments'), PRE.indexOf(') THEN', PRE.indexOf('SELECT 1 FROM public.assessments'))))
    expect(reported('looks_like_production')).toBe(`EXISTS (${identity})`)
    expect(PRE).toContain("IF current_setting('server_version_num')::int < 150000 THEN")
    expect(reported('server_version_ok')).toBe("current_setting('server_version_num')::int >= 150000")
  })

  test('the run authority constraint literal is exactly the one the migration requires', () => {
    const m = APPLY.match(/IF NOT FOUND OR \(v_def <> ('(?:[^']|'')*') AND v_def NOT LIKE '%customer_path_synthetic_uat%'\) THEN/)
    expect(m).not.toBeNull()
    expect(reported('run_authority_constraint_is_20261105')).toMatch(/= ('(?:[^']|'')*')$/)
    expect(reported('run_authority_constraint_is_20261105').endsWith(`= ${m![1]}`)).toBe(true)
  })

  test('the E4 values come from the pack’s expected.json (no other source)', () => {
    const e4 = JSON.parse(read('expected.json')).e4_20261106 as Record<string, string | number>
    for (const k of ['grant_id', 'document_id', 'run_id', 'test_user_id', 'examination_key', 'fixture_sha256', 'fixture_id', 'project_ref', 'grant_created_at', 'grant_expires_at'])
      expect([k, P4.includes(String(e4[k]))]).toEqual([k, true])
  })
})

describe('07 is read-only', () => {
  const code = (sql: string) => sql.replace(/--[^\n]*/g, ' ').replace(/'(?:[^']|'')*'/g, "''")
  test('exactly one SELECT statement', () => {
    const statements = code(P4).split(';').map((s) => s.trim()).filter(Boolean)
    expect(statements).toHaveLength(1)
    expect(statements[0]).toMatch(/^SELECT\b/)
  })
  test('writes, locks and changes nothing (the pack’s verification word list)', () => {
    const body = code(P4)
    for (const w of ['insert', 'update', 'delete', 'merge', 'alter', 'create', 'drop', 'grant', 'revoke', 'truncate', 'comment', 'copy', 'vacuum', 'analyze', 'refresh', 'notify',
      'listen', 'lock', 'call', 'do', 'execute', 'prepare', 'begin', 'commit', 'rollback', 'savepoint', 'set', 'reset', 'discard', 'into', 'set_config', 'nextval', 'setval',
      'pg_advisory_lock', 'pg_advisory_xact_lock', 'pg_terminate_backend', 'pg_cancel_backend', 'pg_reload_conf', 'lo_import', 'lo_export', 'dblink', 'pg_read_file', 'pg_ls_dir'])
      expect({ w, found: new RegExp(`\\b${w}\\b`, 'i').test(body) }).toEqual({ w, found: false })
  })
  test('returns booleans and counts only (no ids, emails, paths or row contents)', () => {
    const keys = Array.from(P4.matchAll(/^ {2}'([a-z0-9_]+)', /gm)).map((m) => m[1])
    expect(keys).toEqual(['server_version_ok', 'looks_like_production', 'counts', 'e4_run_exact', 'e4_document_exact', 'e4_event_exact', 'e4_grant_exact_and_revoked', 'no_active_grant', 'no_marker', 'run_authority_constraint_is_20261105', 'grant_kind_absent'])
  })
})
