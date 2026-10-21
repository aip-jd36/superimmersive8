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

describe.each(['CAA_3B_FIX_1_PREFLIGHT.sql', 'CAA_3B_FIX_1_VERIFY.sql'])('FIX-1 operator script %s (static)', (file) => {
  const raw = readFileSync(join(__dirname, '..', '..', '..', 'implementation', 'caa-3b', file), 'utf8')
  const code = raw.replace(/--[^\n]*/g, '').replace(/'(?:[^']|'')*'/g, "''")

  it('is exactly one WITH ... SELECT statement with no dollar-quoted body', () => {
    expect(code.trim()).toMatch(/^WITH\b/i)
    expect((code.match(/;/g) ?? []).length).toBe(1)
    expect(code).not.toContain('$$')
  })

  it.each(['INSERT', 'UPDATE', 'DELETE', 'MERGE', 'TRUNCATE', 'CREATE', 'ALTER', 'DROP', 'GRANT', 'REVOKE',
           'DO', 'SET', 'RESET', 'CALL', 'COPY', 'LOCK', 'BEGIN', 'COMMIT', 'set_config', 'dblink'])('contains no %s', (kw) => {
    expect(code).not.toMatch(new RegExp(`\\b${kw}\\b`, 'i'))
  })

  it('outputs fixed columns only; session ids appear only inside an md5(...) fingerprint', () => {
    expect(code).not.toMatch(/\b(email|filmmaker_name|user_id|title|stripe_payment_intent_id)\b/i)
    expect(code).toMatch(/\)\s*SELECT ord, check_name, observed, expected,\s*CASE WHEN info THEN '' WHEN ok THEN '' ELSE '' END AS verdict\s+FROM checks/)
    const md5Spans: Array<[number, number]> = []
    for (const m of code.matchAll(/md5\(/g)) {
      let depth = 0, i = m.index! + 3
      do { if (code[i] === '(') depth++; else if (code[i] === ')') depth--; i++ } while (depth > 0 && i < code.length)
      md5Spans.push([m.index!, i])
    }
    const uses = [...code.matchAll(/stripe_checkout_session_id/g)].map((m) => m.index!)
    expect(uses.length).toBeGreaterThan(0)
    for (const at of uses) expect(md5Spans.some(([a, b]) => at > a && at < b)).toBe(true)
  })
})

describe('FIX-1 forward migration (static): zero-total paid sessions', () => {
  const fix = readFileSync(join(__dirname, '..', '..', 'supabase', 'migrations', '20261022000000_payment_zero_total_paid.sql'), 'utf8')
  const fnOf = (s: string) => {
    const a = s.indexOf('CREATE OR REPLACE FUNCTION public.record_checkout_payment(')
    return s.slice(a, s.indexOf('\n$$;', a) + 4)
  }
  const OLD_BRANCH = `    IF p_amount_total = 0 OR p_payment_intent_id IS NULL OR p_payment_intent_id !~ '^pi_[A-Za-z0-9_]+$' THEN
      v_reason := 'payment_status_inconsistent';
    END IF;`

  it('touches only pf_accepted_payment_facts and record_checkout_payment; no row writes, no other drops', () => {
    const outsideFn = fix.replace(fnOf(fix), '')   // the function body itself is checked against the deployed one below
    expect(fix.match(/\bDROP\b[^;]*/gi)).toEqual(['DROP CONSTRAINT pf_accepted_payment_facts'])
    expect(outsideFn).not.toMatch(/\b(DELETE\s+FROM|TRUNCATE|INSERT\s+INTO|UPDATE\s+public\.|ALTER\s+TABLE\s+public\.(submissions|users|rights_packages))/i)
    expect(fix.match(/CREATE OR REPLACE FUNCTION/g)).toHaveLength(1)
    expect(fix).not.toMatch(/SECURITY DEFINER/i)
  })

  it('record_checkout_payment is the deployed body except the paid branch', () => {
    const before = fnOf(sql)
    const after = fnOf(fix)
    expect(before).toContain(OLD_BRANCH)
    const a = after.indexOf("  ELSIF p_payment_status = 'paid' THEN")
    const b = after.indexOf("  ELSIF p_payment_status = 'no_payment_required' THEN")
    const rebuilt = after.slice(0, a) + "  ELSIF p_payment_status = 'paid' THEN\n" + OLD_BRANCH + '\n' + after.slice(b)
    expect(rebuilt).toBe(before)
    expect(after.slice(a, b)).toMatch(/IF p_amount_total > 0\s+AND \(p_payment_intent_id IS NULL OR p_payment_intent_id !~ '\^pi_\[A-Za-z0-9_\]\+\$'\) THEN/)
    expect(after.slice(a, b)).toMatch(/ELSIF p_amount_total = 0 AND p_payment_intent_id IS NOT NULL THEN/)
  })

  it('constraint adds exactly the paid + $0 + no PaymentIntent combination', () => {
    expect(fix).toMatch(/\(stripe_payment_status = 'paid' AND amount_total > 0 AND stripe_payment_intent_id IS NOT NULL\)/)
    expect(fix).toMatch(/\(stripe_payment_status = 'paid' AND amount_total = 0 AND stripe_payment_intent_id IS NULL\)/)
    expect(fix).toMatch(/\(stripe_payment_status = 'no_payment_required' AND amount_total = 0\)/)
  })

  it('re-asserts service_role-only execution and refuses to run before the base migration', () => {
    expect(fix).toMatch(/REVOKE ALL ON FUNCTION public\.record_checkout_payment\([^)]*\) FROM PUBLIC, anon, authenticated, service_role;/)
    expect(fix).toMatch(/GRANT EXECUTE ON FUNCTION public\.record_checkout_payment\([^)]*\) TO service_role;/)
    expect(fix).not.toMatch(/GRANT[^;]*TO[^;]*(anon|authenticated)/)
    expect(fix).toMatch(/requires migration 20261021000000_payment_fulfillments/)
  })
})
