-- CAA-SECURITY-3B FIX-1 — PRODUCTION PREFLIGHT (read-only, one SELECT)
-- Run BEFORE 20261022000000_payment_zero_total_paid.sql. Save the full result.
-- Every row must be PASS (INFO rows are recorded, not judged). Any BLOCKER: stop.
-- Returns no email, name, user id, Stripe id or title.
WITH fn AS (
  SELECT p.oid, p.prosecdef, p.proconfig, pg_get_userbyid(p.proowner) AS owner, pg_get_functiondef(p.oid) AS def
    FROM pg_proc p
   WHERE p.oid = to_regprocedure('public.record_checkout_payment(text,text,text,bigint,text,text,text,text,text,integer,integer,integer,integer,integer)')
), con AS (
  SELECT pg_get_constraintdef(c.oid) AS def
    FROM pg_constraint c
   WHERE c.conname = 'pf_accepted_payment_facts' AND c.conrelid = to_regclass('public.payment_fulfillments')
), f AS (
  SELECT * FROM public.payment_fulfillments
), checks(ord, check_name, observed, expected, ok, info) AS (
  SELECT 1, 'run as', current_user::text, 'postgres (owner)', current_user::text = (SELECT pg_get_userbyid(relowner) FROM pg_class WHERE oid = to_regclass('public.payment_fulfillments')), false
  UNION ALL SELECT 2, 'base migration: ledger table present', (to_regclass('public.payment_fulfillments') IS NOT NULL)::text, 'true', to_regclass('public.payment_fulfillments') IS NOT NULL, false
  UNION ALL SELECT 3, 'base migration: record_checkout_payment present', (SELECT count(*)::text FROM fn), '1', (SELECT count(*) FROM fn) = 1, false
  UNION ALL SELECT 4, 'function owner = current_user', COALESCE((SELECT owner FROM fn), 'missing'), current_user::text, (SELECT owner FROM fn) = current_user::text, false
  UNION ALL SELECT 5, 'function SECURITY INVOKER', COALESCE((SELECT (NOT prosecdef)::text FROM fn), 'missing'), 'true', COALESCE((SELECT NOT prosecdef FROM fn), false), false
  UNION ALL SELECT 6, 'function is the deployed (pre-FIX-1) paid branch',
    COALESCE((SELECT (position('IF p_amount_total = 0 OR p_payment_intent_id IS NULL' IN def) > 0)::text FROM fn), 'missing'), 'true',
    COALESCE((SELECT position('IF p_amount_total = 0 OR p_payment_intent_id IS NULL' IN def) > 0 FROM fn), false), false
  UNION ALL SELECT 7, 'FIX-1 not yet applied (function)',
    COALESCE((SELECT (position('ELSIF p_amount_total = 0 AND p_payment_intent_id IS NOT NULL' IN def) = 0)::text FROM fn), 'missing'), 'true',
    COALESCE((SELECT position('ELSIF p_amount_total = 0 AND p_payment_intent_id IS NOT NULL' IN def) = 0 FROM fn), false), false
  UNION ALL SELECT 8, 'constraint pf_accepted_payment_facts present', (SELECT count(*)::text FROM con), '1', (SELECT count(*) FROM con) = 1, false
  UNION ALL SELECT 9, 'FIX-1 not yet applied (constraint has no paid+NULL-intent arm)',
    COALESCE((SELECT (def !~ 'stripe_payment_intent_id IS NULL')::text FROM con), 'missing'), 'true',
    COALESCE((SELECT def !~ 'stripe_payment_intent_id IS NULL' FROM con), false), false
  UNION ALL SELECT 10, 'service_role can execute record_checkout_payment',
    COALESCE((SELECT has_function_privilege('service_role', oid, 'EXECUTE')::text FROM fn), 'missing'), 'true',
    COALESCE((SELECT has_function_privilege('service_role', oid, 'EXECUTE') FROM fn), false), false
  UNION ALL SELECT 11, 'anon / authenticated cannot execute',
    COALESCE((SELECT (has_function_privilege('anon', oid, 'EXECUTE') OR has_function_privilege('authenticated', oid, 'EXECUTE'))::text FROM fn), 'missing'), 'false',
    COALESCE((SELECT NOT (has_function_privilege('anon', oid, 'EXECUTE') OR has_function_privilege('authenticated', oid, 'EXECUTE')) FROM fn), false), false
  UNION ALL SELECT 12, 'no fulfillment claim in progress (lease)', (SELECT count(*)::text FROM f WHERE fulfillment_status = 'in_progress'), '0', (SELECT count(*) FROM f WHERE fulfillment_status = 'in_progress') = 0, false
  UNION ALL SELECT 13, 'ledger rows', (SELECT count(*)::text FROM f), 'record', true, true
  UNION ALL SELECT 14, 'ledger accepted rows', (SELECT count(*)::text FROM f WHERE outcome = 'accepted'), 'record', true, true
  UNION ALL SELECT 15, 'ledger rejected paid zero-total rows (incident class)',
    (SELECT count(*)::text FROM f WHERE outcome = 'rejected' AND outcome_reason = 'payment_status_inconsistent'
                                    AND stripe_payment_status = 'paid' AND amount_total = 0), 'record (1 expected: UAT-3B-CR)', true, true
  UNION ALL SELECT 16, 'ledger fingerprint (must be identical in VERIFY)',
    (SELECT md5(COALESCE(string_agg(concat_ws('|', stripe_checkout_session_id, outcome, outcome_reason, session_binding, anomaly_status,
            fulfillment_status, pdf_status, email_status, first_stripe_event_id, last_stripe_event_id, updated_at::text),
            ',' ORDER BY stripe_checkout_session_id), '')) FROM f), 'record', true, true
  UNION ALL SELECT 17, 'taken_at', now()::text, 'record', true, true
)
SELECT ord, check_name, observed, expected,
       CASE WHEN info THEN 'INFO' WHEN ok THEN 'PASS' ELSE 'BLOCKER' END AS verdict
  FROM checks
 ORDER BY ord;
