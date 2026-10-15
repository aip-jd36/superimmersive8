/**
 * CAA-SECURITY-2A — assessments table is never client-readable.
 *
 * 1. The lockdown migration drops the permissive public policy and revokes
 *    client-role access (and never re-grants it).
 * 2. No later migration re-creates permissive anon/authenticated access.
 * 3. Every application query of `assessments` goes through the service role,
 *    so the lockdown cannot silently break a page.
 */
import fs from 'fs'
import path from 'path'

const APP = path.resolve(__dirname, '../..')
const MIGRATIONS = path.join(APP, 'supabase/migrations')
const LOCKDOWN = '20261015000000_lock_down_assessments_access.sql'

const stripComments = (sql: string) => sql.replace(/--.*$/gm, '')

/** Returns why a single SQL statement would re-open client access to assessments, or null. */
function reopens(s: string): string | null {
  const onAssessments = /\bON (TABLE )?(public\.)?"?assessments"?(\s|$)/i.test(s)
  const clientRole = /\bTO [^;]*\b(anon|authenticated|PUBLIC)\b/i.test(s)
  // Any non-restrictive policy on assessments (a policy with no FOR clause is FOR ALL).
  if (/^CREATE POLICY\b/i.test(s) && onAssessments && !/\bAS RESTRICTIVE\b/i.test(s)) return 'permissive policy'
  if (/^GRANT\b/i.test(s) && onAssessments && clientRole) return 'table grant to client role'
  if (/^GRANT\b/i.test(s) && /\bON ALL TABLES IN SCHEMA public\b/i.test(s) && clientRole) return 'schema-wide grant to client role'
  if (/^ALTER TABLE (public\.)?"?assessments"? DISABLE ROW LEVEL SECURITY/i.test(s)) return 'RLS disabled'
  if (/^CREATE (OR REPLACE )?(MATERIALIZED )?VIEW\b/i.test(s) && /\bassessments\b/i.test(s)) return 'view over assessments'
  return null
}

describe('assessments access lockdown migration', () => {
  const sql = stripComments(fs.readFileSync(path.join(MIGRATIONS, LOCKDOWN), 'utf-8'))

  test('drops the permissive public select policy and revokes client-role access in one transaction', () => {
    expect(sql).toMatch(/BEGIN;/)
    expect(sql).toMatch(/COMMIT;/)
    expect(sql).toMatch(/DROP POLICY IF EXISTS "assessments_public_select" ON public\.assessments;/)
    expect(sql).toMatch(/REVOKE ALL ON TABLE public\.assessments FROM PUBLIC, anon, authenticated;/)
    expect(sql).toMatch(/REVOKE EXECUTE ON FUNCTION public\.generate_assessment_number\(\) FROM PUBLIC, anon, authenticated;/)
  })

  test('never grants anything on assessments to anon or authenticated', () => {
    expect(sql).not.toMatch(/GRANT[^;]*TO[^;]*\b(anon|authenticated|PUBLIC)\b/i)
    expect(sql).not.toMatch(/CREATE POLICY/i)
  })

  test('no later migration re-opens client access to assessments', () => {
    const later = fs.readdirSync(MIGRATIONS).filter((f) => f.endsWith('.sql') && f > LOCKDOWN)
    const statements = (f: string) =>
      stripComments(fs.readFileSync(path.join(MIGRATIONS, f), 'utf-8')).split(';').map((s) => s.replace(/\s+/g, ' ').trim())
    for (const f of later) {
      for (const s of statements(f)) expect({ f, s, reopens: reopens(s) }).toEqual({ f, s, reopens: null })
    }
  })

  test.each([
    ['CREATE POLICY "x" ON public.assessments FOR SELECT USING (true)', 'permissive policy'],
    ['CREATE POLICY "x" ON assessments USING (true)', 'permissive policy'],
    ['GRANT SELECT ON public.assessments TO anon', 'table grant to client role'],
    ['GRANT ALL ON TABLE assessments TO authenticated', 'table grant to client role'],
    ['GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon', 'schema-wide grant to client role'],
    ['ALTER TABLE public.assessments DISABLE ROW LEVEL SECURITY', 'RLS disabled'],
    ['CREATE OR REPLACE VIEW public_assessments AS SELECT * FROM assessments', 'view over assessments'],
  ])('detector flags %s', (stmt, why) => {
    expect(reopens(stmt)).toBe(why)
  })

  test.each([
    ['CREATE POLICY "assessments_deny_delete" ON assessments AS RESTRICTIVE FOR DELETE TO anon, authenticated USING (false)'],
    ['GRANT ALL ON TABLE public.assessments TO service_role'],
    ['GRANT SELECT ON public.assessment_publications TO service_role'],
    ['CREATE POLICY "x" ON public.crc_sessions FOR SELECT USING (true)'],
  ])('detector allows %s', (stmt) => {
    expect(reopens(stmt)).toBeNull()
  })
})

describe('application access to assessments is service-role only', () => {
  function walk(dir: string): string[] {
    return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
      const p = path.join(dir, e.name)
      if (e.isDirectory()) return e.name === 'node_modules' || e.name.startsWith('.') ? [] : walk(p)
      return /\.(ts|tsx)$/.test(e.name) ? [p] : []
    })
  }

  test('every file querying the assessments table imports supabaseAdmin and no user-scoped client', () => {
    const files = ['app', 'lib', 'components'].flatMap((d) => walk(path.join(APP, d)))
    const querying = files.filter((f) => /\.from\(\s*['"`]assessments['"`]\s*\)/.test(fs.readFileSync(f, 'utf-8')))
    expect(querying.length).toBeGreaterThan(0)
    for (const f of querying) {
      const src = fs.readFileSync(f, 'utf-8')
      const rel = path.relative(APP, f)
      expect({ rel, admin: /from ['"]@\/lib\/supabase\/admin['"]/.test(src) }).toEqual({ rel, admin: true })
      // Each `.from('assessments')` call (same line or chained on the next) must be on the service-role client.
      const calls = src.match(/(\w+)\s*\.from\(\s*['"`]assessments['"`]\s*\)/g) ?? []
      for (const c of calls) expect({ rel, c: c.split(/\s|\./)[0] }).toEqual({ rel, c: 'supabaseAdmin' })
    }
  })
})
