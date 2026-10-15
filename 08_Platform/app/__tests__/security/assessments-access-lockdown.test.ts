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
    for (const f of later) {
      const s = stripComments(fs.readFileSync(path.join(MIGRATIONS, f), 'utf-8'))
      expect({ f, hit: /CREATE POLICY[^;]*ON\s+(public\.)?assessments\b[^;]*FOR\s+(SELECT|ALL)/i.test(s) }).toEqual({ f, hit: false })
      expect({ f, hit: /GRANT[^;]*ON\s+(TABLE\s+)?(public\.)?assessments\b[^;]*TO[^;]*\b(anon|authenticated|PUBLIC)\b/i.test(s) }).toEqual({ f, hit: false })
    }
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
