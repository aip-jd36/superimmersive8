/**
 * CAA-SECURITY-3B — static guard rails on the ledger migration file.
 * NOT a substitute for the real-PostgreSQL suite (__tests__/db/, CI only);
 * this only catches accidental regressions of the privilege / authority
 * contract when the database suite is not available locally.
 */
import { readFileSync } from 'fs'
import { join } from 'path'

const sql = readFileSync(join(__dirname, '..', '..', 'supabase', 'migrations', '20261021000000_payment_fulfillments.sql'), 'utf8')
const FUNCTIONS = ['record_checkout_payment', 'claim_payment_fulfillment', 'mark_payment_fulfillment_step',
  'finish_payment_fulfillment', 'reconcile_payment_fulfillment', 'payment_list_price_cents']

describe('payment ledger migration (static)', () => {
  it('is additive: no DROP / ALTER of existing objects, no DELETE', () => {
    expect(sql).not.toMatch(/\bDROP\s+(TABLE|COLUMN|FUNCTION)\b/i)
    expect(sql).not.toMatch(/\bALTER\s+TABLE\s+public\.(submissions|users|rights_packages)\b/i)
    expect(sql).not.toMatch(/\bDELETE\s+FROM\b/i)
  })

  it('locks the table to service_role (RLS on, revoke all incl. default grants, no DELETE grant)', () => {
    expect(sql).toMatch(/ALTER TABLE public\.payment_fulfillments ENABLE ROW LEVEL SECURITY/)
    expect(sql).toMatch(/REVOKE ALL ON TABLE public\.payment_fulfillments FROM PUBLIC, anon, authenticated, service_role/)
    expect(sql).toMatch(/GRANT SELECT, INSERT, UPDATE ON TABLE public\.payment_fulfillments TO service_role;/)
    expect(sql).not.toMatch(/^GRANT[^;]*\b(DELETE|TRUNCATE|ALL)\b[^;]*payment_fulfillments\b/im)
    expect(sql).not.toMatch(/CREATE POLICY/i)
  })

  it.each(FUNCTIONS)('%s: revoked from everyone, executable by service_role only', (fn) => {
    expect(sql).toMatch(new RegExp(`REVOKE ALL ON FUNCTION public\\.${fn}\\([^)]*\\) FROM PUBLIC, anon, authenticated, service_role;`))
    expect(sql).toMatch(new RegExp(`GRANT EXECUTE ON FUNCTION public\\.${fn}\\([^)]*\\) TO service_role;`))
    expect(sql).not.toMatch(new RegExp(`GRANT[^;]*${fn}[^;]*TO[^;]*(anon|authenticated)`))
  })

  it('no SECURITY DEFINER; plpgsql functions pin search_path and forbid variable/column ambiguity', () => {
    expect(sql).not.toMatch(/SECURITY DEFINER/i)
    expect((sql.match(/SECURITY INVOKER/g) ?? []).length).toBe(6)
    expect((sql.match(/#variable_conflict error/g) ?? []).length).toBe(6)
    expect((sql.match(/SET search_path = public, pg_temp/g) ?? []).length).toBe(6)
  })

  it('legacy-session policy: service_role read-only; activation is owner-only and tighten-only', () => {
    expect(sql).toMatch(/REVOKE ALL ON TABLE public\.payment_legacy_session_policy FROM PUBLIC, anon, authenticated, service_role;/)
    expect(sql).toMatch(/GRANT SELECT ON TABLE public\.payment_legacy_session_policy TO service_role;/)
    expect(sql).not.toMatch(/^GRANT[^;]*(INSERT|UPDATE|DELETE|TRUNCATE|ALL)[^;]*payment_legacy_session_policy/im)
    expect(sql).toMatch(/REVOKE ALL ON FUNCTION public\.activate_payment_legacy_cutoff\(timestamptz, text\) FROM PUBLIC, anon, authenticated, service_role;/)
    expect(sql).not.toMatch(/^GRANT[^;]*activate_payment_legacy_cutoff/im)
    // fail-closed provisional bounds are installed by the migration itself
    expect(sql).toMatch(/VALUES \(now\(\) \+ interval '72 hours', now\(\) \+ interval '72 hours' \+ interval '7 days'\)/)
  })

  it('record_checkout_payment takes no caller-supplied verdict, tier or price', () => {
    const sig = /CREATE OR REPLACE FUNCTION public\.record_checkout_payment\(([\s\S]*?)\) RETURNS/.exec(sql)![1]
    expect(sig).not.toMatch(/validation|tier|expected|price|metadata/i)
    expect(sql).toMatch(/v_price := public\.payment_list_price_cents\(v_sub\.tier\)/)
  })

  it('locks the submission before checking the ledger, and the only status write is pending→approved for Creator Record', () => {
    const body = sql.slice(sql.indexOf('FUNCTION public.record_checkout_payment'), sql.indexOf('FUNCTION public.claim_payment_fulfillment'))
    expect(body.indexOf('FROM public.submissions s WHERE s.id = v_submission_id FOR UPDATE'))
      .toBeLessThan(body.indexOf('FROM public.payment_fulfillments f'))
    expect(body).toMatch(/status\s+= CASE WHEN v_approve THEN 'approved' ELSE s\.status END/)
    expect(body).toMatch(/IF v_sub\.tier = 'creator_record' THEN\s+v_approve := true;/)
    expect(body).not.toMatch(/'needs_info'/)
  })
})

describe('production preflight script (static)', () => {
  const pre = readFileSync(join(__dirname, '..', '..', '..', 'implementation', 'caa-3b', 'CAA_3B_PRODUCTION_SCHEMA_PREFLIGHT.sql'), 'utf8')
  // Strip comments, then string literals, so only executable SQL remains.
  const code = pre.replace(/--[^\n]*/g, '').replace(/'(?:[^']|'')*'/g, "''")

  it('is exactly one statement, a WITH ... SELECT', () => {
    expect(code.trim()).toMatch(/^WITH\b/i)
    expect((code.match(/;/g) ?? []).length).toBe(1)
    expect(code.trim().endsWith(';')).toBe(true)
  })

  it.each(['INSERT', 'UPDATE', 'DELETE', 'MERGE', 'TRUNCATE', 'CREATE', 'ALTER', 'DROP', 'GRANT', 'REVOKE',
           'DO', 'SET', 'RESET', 'NOTIFY', 'CALL', 'COPY', 'LOCK', 'VACUUM', 'ANALYZE', 'COMMENT', 'BEGIN', 'COMMIT',
           'set_config', 'pg_terminate_backend', 'pg_cancel_backend', 'pg_reload_conf', 'pg_read_file', 'dblink'])(
    'contains no %s', (kw) => {
      expect(code).not.toMatch(new RegExp(`\\b${kw}\\b`, 'i'))
    })

  it('has no dollar-quoted bodies and selects no customer identifiers', () => {
    expect(code).not.toContain('$$')
    expect(code).not.toMatch(/SELECT\s+(\w+\.)?(email|name|stripe_checkout_session_id|stripe_payment_intent_id|user_id|title|filmmaker_name)\b/i)
  })
})
