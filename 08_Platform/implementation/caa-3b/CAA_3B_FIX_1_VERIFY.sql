-- CAA-SECURITY-3B FIX-1 — PRODUCTION VERIFY (read-only, one SELECT)
-- Run AFTER 20261022000000_payment_zero_total_paid.sql. Every row must be PASS
-- except INFO rows; the ledger fingerprint must equal the PREFLIGHT value.
-- Returns no email, name, user id, Stripe id or title.
WITH fn AS (
  SELECT p.oid, p.prosecdef, p.proconfig, pg_get_userbyid(p.proowner) AS owner, pg_get_functiondef(p.oid) AS def
    FROM pg_proc p
   WHERE p.oid = to_regprocedure('public.record_checkout_payment(text,text,text,bigint,text,text,text,text,text,integer,integer,integer,integer,integer)')
), con AS (
  SELECT pg_get_constraintdef(c.oid) AS def, c.convalidated
    FROM pg_constraint c
   WHERE c.conname = 'pf_accepted_payment_facts' AND c.conrelid = to_regclass('public.payment_fulfillments')
), f AS (
  SELECT * FROM public.payment_fulfillments
), checks(ord, check_name, observed, expected, ok, info) AS (
  SELECT 1, 'function present (one overload)', (SELECT count(*)::text FROM pg_proc WHERE proname = 'record_checkout_payment' AND pronamespace = 'public'::regnamespace), '1',
    (SELECT count(*) FROM pg_proc WHERE proname = 'record_checkout_payment' AND pronamespace = 'public'::regnamespace) = 1, false
  UNION ALL SELECT 2, 'function: FIX-1 paid branch present',
    COALESCE((SELECT (position('ELSIF p_amount_total = 0 AND p_payment_intent_id IS NOT NULL' IN def) > 0)::text FROM fn), 'missing'), 'true',
    COALESCE((SELECT position('ELSIF p_amount_total = 0 AND p_payment_intent_id IS NOT NULL' IN def) > 0 FROM fn), false), false
  UNION ALL SELECT 3, 'function: positive-total PaymentIntent rule present',
    COALESCE((SELECT (position('IF p_amount_total > 0' IN def) > 0)::text FROM fn), 'missing'), 'true',
    COALESCE((SELECT position('IF p_amount_total > 0' IN def) > 0 FROM fn), false), false
  UNION ALL SELECT 4, 'function: old $0 rejection removed',
    COALESCE((SELECT (position('IF p_amount_total = 0 OR p_payment_intent_id IS NULL' IN def) = 0)::text FROM fn), 'missing'), 'true',
    COALESCE((SELECT position('IF p_amount_total = 0 OR p_payment_intent_id IS NULL' IN def) = 0 FROM fn), false), false
  UNION ALL SELECT 5, 'function: SECURITY INVOKER', COALESCE((SELECT (NOT prosecdef)::text FROM fn), 'missing'), 'true', COALESCE((SELECT NOT prosecdef FROM fn), false), false
  UNION ALL SELECT 6, 'function: search_path pinned', COALESCE((SELECT array_to_string(proconfig, ',') FROM fn), 'missing'), 'search_path=public, pg_temp',
    COALESCE((SELECT proconfig = ARRAY['search_path=public, pg_temp'] FROM fn), false), false
  UNION ALL SELECT 7, 'function: owner unchanged (current_user)', COALESCE((SELECT owner FROM fn), 'missing'), current_user::text, (SELECT owner FROM fn) = current_user::text, false
  UNION ALL SELECT 8, 'service_role can execute',
    COALESCE((SELECT has_function_privilege('service_role', oid, 'EXECUTE')::text FROM fn), 'missing'), 'true',
    COALESCE((SELECT has_function_privilege('service_role', oid, 'EXECUTE') FROM fn), false), false
  UNION ALL SELECT 9, 'anon / authenticated / PUBLIC cannot execute',
    COALESCE((SELECT (has_function_privilege('anon', oid, 'EXECUTE') OR has_function_privilege('authenticated', oid, 'EXECUTE'))::text FROM fn), 'missing'), 'false',
    COALESCE((SELECT NOT (has_function_privilege('anon', oid, 'EXECUTE') OR has_function_privilege('authenticated', oid, 'EXECUTE')) FROM fn), false), false
  UNION ALL SELECT 10, 'constraint present and validated', COALESCE((SELECT convalidated::text FROM con), 'missing'), 'true', COALESCE((SELECT convalidated FROM con), false), false
  UNION ALL SELECT 11, 'constraint: paid + $0 + NULL PaymentIntent arm',
    COALESCE((SELECT (def ~ 'stripe_payment_intent_id IS NULL')::text FROM con), 'missing'), 'true', COALESCE((SELECT def ~ 'stripe_payment_intent_id IS NULL' FROM con), false), false
  UNION ALL SELECT 12, 'constraint: positive arm still requires a PaymentIntent',
    COALESCE((SELECT (def ~ 'amount_total > 0\) AND \(stripe_payment_intent_id IS NOT NULL')::text FROM con), 'missing'), 'true',
    COALESCE((SELECT def ~ 'amount_total > 0\) AND \(stripe_payment_intent_id IS NOT NULL' FROM con), false), false
  UNION ALL SELECT 13, 'constraint: no_payment_required arm kept',
    COALESCE((SELECT (def ~ 'no_payment_required')::text FROM con), 'missing'), 'true', COALESCE((SELECT def ~ 'no_payment_required' FROM con), false), false
  UNION ALL SELECT 14, 'rejected paid zero-total rows untouched (still rejected)',
    (SELECT count(*)::text FROM f WHERE outcome = 'rejected' AND outcome_reason = 'payment_status_inconsistent'
                                    AND stripe_payment_status = 'paid' AND amount_total = 0), 'same as PREFLIGHT row 15', true, true
  UNION ALL SELECT 15, 'ledger rows', (SELECT count(*)::text FROM f), 'same as PREFLIGHT row 13', true, true
  UNION ALL SELECT 16, 'ledger fingerprint',
    (SELECT md5(COALESCE(string_agg(concat_ws('|', stripe_checkout_session_id, outcome, outcome_reason, session_binding, anomaly_status,
            fulfillment_status, pdf_status, email_status, first_stripe_event_id, last_stripe_event_id, updated_at::text),
            ',' ORDER BY stripe_checkout_session_id), '')) FROM f), 'same as PREFLIGHT row 16', true, true
  UNION ALL SELECT 17, 'taken_at', now()::text, 'record', true, true
)
SELECT ord, check_name, observed, expected,
       CASE WHEN info THEN 'INFO' WHEN ok THEN 'PASS' ELSE 'FAIL' END AS verdict
  FROM checks
 ORDER BY ord;
