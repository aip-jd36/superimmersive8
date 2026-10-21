-- ============================================================================
-- CAA-SECURITY-3B FIX-1 — accept Stripe's zero-total 'paid' checkout sessions.
--
-- FORWARD-ONLY. Requires 20261021000000_payment_fulfillments.sql. Changes
-- exactly two things, consistently:
--   1. record_checkout_payment(): the 'paid' branch. Positive totals still
--      require a well-formed PaymentIntent (unchanged). A zero total is now
--      accepted as 'paid' only with NO PaymentIntent — observed live Stripe
--      behaviour for a 100%-discounted payment-mode Checkout Session
--      (Production incident CAA-SECURITY-3B-M2-2-INCIDENT-1). Every earlier
--      check (session complete, payment mode, stored-tier list price, USD,
--      subtotal = price, no tax/shipping, total = subtotal - discount) and
--      every later rule (binding, duplicate, legacy cutoff, replay) is
--      byte-for-byte unchanged.
--   2. pf_accepted_payment_facts: also admits that one combination
--      ('paid', total 0, PaymentIntent NULL) for accepted rows.
--
-- 'no_payment_required' handling is unchanged. No existing ledger row is
-- updated: a session already recorded (including one rejected under the old
-- rule) keeps its stored outcome on replay — history is never rewritten.
-- Function ownership, SECURITY INVOKER, search_path and grants are kept; the
-- grants are re-asserted below.
--
-- Run as ONE transaction (the SQL Editor runs a multi-statement script
-- atomically; or wrap in BEGIN/COMMIT). Rollback = forward migration only.
-- ============================================================================

DO $pre$
BEGIN
  IF to_regclass('public.payment_fulfillments') IS NULL
     OR to_regprocedure('public.record_checkout_payment(text, text, text, bigint, text, text, text, text, text, integer, integer, integer, integer, integer)') IS NULL
     OR NOT EXISTS (SELECT 1 FROM pg_constraint
                     WHERE conname = 'pf_accepted_payment_facts'
                       AND conrelid = to_regclass('public.payment_fulfillments')) THEN
    RAISE EXCEPTION 'FIX-1 requires migration 20261021000000_payment_fulfillments to be applied first'
      USING ERRCODE = '55000';
  END IF;
END
$pre$;

-- ---------------------------------------------------------------------------
-- 1) Ledger constraint: one additional accepted combination.
--    Existing accepted rows satisfied the old (strictly narrower) rule, so
--    re-validation cannot fail on them.
-- ---------------------------------------------------------------------------
ALTER TABLE public.payment_fulfillments DROP CONSTRAINT pf_accepted_payment_facts;
ALTER TABLE public.payment_fulfillments ADD CONSTRAINT pf_accepted_payment_facts CHECK (
    outcome <> 'accepted' OR COALESCE((
          currency = 'usd'
      AND expected_amount IS NOT NULL
      AND amount_subtotal = expected_amount
      AND amount_total BETWEEN 0 AND amount_subtotal
      AND amount_total = amount_subtotal - COALESCE(amount_discount, 0)
      AND COALESCE(amount_tax, 0) = 0
      AND COALESCE(amount_shipping, 0) = 0
      AND stripe_session_status = 'complete'
      AND stripe_mode = 'payment'
      AND (   (stripe_payment_status = 'paid' AND amount_total > 0 AND stripe_payment_intent_id IS NOT NULL)
           OR (stripe_payment_status = 'paid' AND amount_total = 0 AND stripe_payment_intent_id IS NULL)
           OR (stripe_payment_status = 'no_payment_required' AND amount_total = 0))
    ), false));

-- ---------------------------------------------------------------------------
-- 2) record_checkout_payment — identical to 20261021000000 except the
--    'paid' branch.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.record_checkout_payment(
  p_session_id            text,
  p_event_id              text,
  p_client_reference_id   text,
  p_session_created_epoch bigint,
  p_session_status        text,
  p_mode                  text,
  p_payment_status        text,
  p_payment_intent_id     text,
  p_currency              text,
  p_amount_subtotal       integer,
  p_amount_total          integer,
  p_amount_discount       integer,
  p_amount_tax            integer,
  p_amount_shipping       integer
) RETURNS TABLE(out_outcome text, out_reason text, out_is_new boolean,
                out_fulfillment_status text, out_tier text, out_submission_id uuid)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
#variable_conflict error
DECLARE
  v_submission_id uuid;
  v_sub           public.submissions%ROWTYPE;
  v_existing      public.payment_fulfillments%ROWTYPE;
  v_price         integer;
  v_binding       text;
  v_outcome       text;
  v_reason        text;
  v_anomaly       text := 'none';
  v_ful           text := 'not_required';
  v_pdf           text := 'not_required';
  v_email         text := 'not_required';
  v_approve       boolean := false;
  v_tier          text;
  v_inserted      integer;
  v_created_at    timestamptz;
  v_cutoff_at     timestamptz;
  v_accept_until  timestamptz;
BEGIN
  IF p_session_id IS NULL OR p_session_id !~ '^cs_[A-Za-z0-9_]+$' THEN
    RAISE EXCEPTION 'invalid checkout session id' USING ERRCODE = '22023';
  END IF;
  IF p_event_id IS NULL OR p_event_id !~ '^evt_[A-Za-z0-9_]+$' THEN
    RAISE EXCEPTION 'invalid stripe event id' USING ERRCODE = '22023';
  END IF;

  -- Lock the submission FIRST so every delivery for it serializes here.
  IF p_client_reference_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    v_submission_id := p_client_reference_id::uuid;
    SELECT s.* INTO v_sub FROM public.submissions s WHERE s.id = v_submission_id FOR UPDATE;
  END IF;

  -- Replay of an already-recorded session: no state change.
  SELECT f.* INTO v_existing
    FROM public.payment_fulfillments f
   WHERE f.stripe_checkout_session_id = p_session_id
     FOR UPDATE;
  IF FOUND THEN
    UPDATE public.payment_fulfillments
       SET last_stripe_event_id = p_event_id, updated_at = now()
     WHERE stripe_checkout_session_id = p_session_id;
    RETURN QUERY SELECT v_existing.outcome, v_existing.outcome_reason, false,
                        v_existing.fulfillment_status, v_existing.tier, v_existing.submission_id;
    RETURN;
  END IF;

  v_tier  := CASE WHEN v_sub.tier IN ('creator_record', 'certified', 'si8_certified') THEN v_sub.tier END;
  v_price := public.payment_list_price_cents(v_sub.tier);
  -- Stripe-signed session creation time (verified webhook payload).
  v_created_at := CASE WHEN p_session_created_epoch IS NULL THEN NULL ELSE to_timestamp(p_session_created_epoch) END;
  SELECT p.cutoff_at, p.accept_until INTO v_cutoff_at, v_accept_until
    FROM public.payment_legacy_session_policy p WHERE p.singleton;

  -- Session identity: Stripe session vs the session id SI8 persisted at checkout.
  IF v_sub.id IS NULL THEN
    v_binding := 'no_submission';
  ELSIF v_sub.stripe_checkout_session_id = p_session_id THEN
    v_binding := 'bound';
  ELSIF v_sub.stripe_checkout_session_id IS NULL THEN
    v_binding := 'unbound';          -- legacy: pre-3B checkout never persisted its session id
  ELSE
    v_binding := 'mismatch';
  END IF;

  -- Payment facts (all NULL-safe: NULL never passes).
  IF v_sub.id IS NULL THEN
    v_reason := 'unknown_submission';
  ELSIF p_session_status IS DISTINCT FROM 'complete' THEN
    v_reason := 'session_not_complete';
  ELSIF p_mode IS DISTINCT FROM 'payment' THEN
    v_reason := 'unexpected_mode';
  ELSIF v_price IS NULL THEN
    v_reason := 'unknown_tier';
  ELSIF p_currency IS DISTINCT FROM 'usd' THEN
    v_reason := 'currency_mismatch';
  ELSIF p_amount_subtotal IS DISTINCT FROM v_price THEN
    v_reason := 'amount_mismatch';
  ELSIF COALESCE(p_amount_tax, 0) <> 0 OR COALESCE(p_amount_shipping, 0) <> 0 THEN
    v_reason := 'unexpected_tax_or_shipping';
  ELSIF p_amount_total IS NULL OR p_amount_total < 0 OR p_amount_total > p_amount_subtotal THEN
    v_reason := 'total_out_of_range';
  ELSIF COALESCE(p_amount_discount, 0) < 0
     OR p_amount_total <> p_amount_subtotal - COALESCE(p_amount_discount, 0) THEN
    v_reason := 'discount_inconsistent';
  ELSIF p_payment_status = 'paid' THEN
    -- Positive total: a well-formed PaymentIntent is required (unchanged).
    -- Zero total (only reachable after every check above: complete, payment
    -- mode, stored tier, USD, subtotal = list price, no tax/shipping, total =
    -- subtotal - discount, i.e. a full discount): Stripe reports 'paid' and
    -- creates no PaymentIntent, so a PaymentIntent here is inconsistent.
    IF p_amount_total > 0
       AND (p_payment_intent_id IS NULL OR p_payment_intent_id !~ '^pi_[A-Za-z0-9_]+$') THEN
      v_reason := 'payment_status_inconsistent';
    ELSIF p_amount_total = 0 AND p_payment_intent_id IS NOT NULL THEN
      v_reason := 'payment_status_inconsistent';
    END IF;
  ELSIF p_payment_status = 'no_payment_required' THEN
    IF p_amount_total <> 0 THEN
      v_reason := 'payment_status_inconsistent';
    END IF;
  ELSE
    v_reason := 'payment_not_settled';
  END IF;

  IF v_reason IS NOT NULL THEN
    v_outcome := 'rejected';
    v_anomaly := 'open';
  ELSIF v_sub.payment_status = 'paid' AND v_binding = 'bound' THEN
    -- Paid by pre-ledger code for this exact session. Fulfillment evidence is
    -- NOT assumed: email outcome is unknown; PDF only from real evidence.
    v_outcome := 'accepted';
    v_reason  := 'pre_ledger_payment';
    v_anomaly := 'open';
    v_ful     := 'needs_reconciliation';
    v_email   := 'unknown';
    IF v_sub.tier = 'creator_record' AND v_sub.status = 'approved' THEN
      v_pdf := CASE WHEN EXISTS (SELECT 1 FROM public.rights_packages rp
                                  WHERE rp.submission_id = v_sub.id AND rp.document_url IS NOT NULL)
                    THEN 'completed' ELSE 'pending' END;
    END IF;
  ELSIF v_sub.payment_status IS DISTINCT FROM 'unpaid' THEN
    v_outcome := 'duplicate_payment';
    v_reason  := 'submission_already_' || COALESCE(v_sub.payment_status, 'null');
    v_anomaly := 'open';
  ELSIF EXISTS (SELECT 1 FROM public.payment_fulfillments f
                 WHERE f.submission_ref = v_sub.id AND f.outcome = 'accepted') THEN
    -- Submission shows unpaid (e.g. manually reset) but already has an
    -- accepted payment: a further payment is a duplicate to reconcile, never
    -- a unique-index error (which would 500 and loop Stripe retries).
    v_outcome := 'duplicate_payment';
    v_reason  := 'submission_has_accepted_payment';
    v_anomaly := 'open';
  ELSIF v_binding = 'mismatch' THEN
    v_outcome := 'rejected';
    v_reason  := 'session_mismatch';
    v_anomaly := 'open';
  ELSIF v_binding = 'unbound'
        AND (v_created_at IS NULL OR v_cutoff_at IS NULL OR v_accept_until IS NULL
             OR now() >= v_accept_until OR v_created_at >= v_cutoff_at) THEN
    -- Legacy exception does not apply (fail-closed): durable anomaly, no payment write.
    v_outcome := 'rejected';
    v_reason  := CASE
                   WHEN v_created_at IS NULL THEN 'unbound_session_created_unknown'
                   WHEN v_cutoff_at IS NULL OR v_accept_until IS NULL OR now() >= v_accept_until
                     THEN 'unbound_session_window_closed'
                   ELSE 'unbound_session_after_cutoff'
                 END;
    v_anomaly := 'open';
  ELSE
    -- Unpaid submission, session bound (or legacy-unbound): record payment.
    v_outcome := 'accepted';
    IF v_sub.status = 'pending' THEN
      v_reason := CASE WHEN v_binding = 'bound' THEN 'accepted' ELSE 'accepted_unbound_legacy_session' END;
      IF v_binding = 'unbound' THEN
        v_anomaly := 'open';       -- explicit, visible: no persisted session id to bind to
      END IF;
      v_ful   := 'pending';
      v_email := 'pending';
      IF v_sub.tier = 'creator_record' THEN
        v_approve := true;
        v_pdf     := 'pending';
      END IF;
    ELSE
      v_reason  := 'accepted_status_not_pending';   -- paid; human state untouched
      v_anomaly := 'open';
    END IF;

    UPDATE public.submissions s
       SET payment_status             = 'paid',
           stripe_checkout_session_id = p_session_id,
           stripe_payment_intent_id   = p_payment_intent_id,
           amount_paid                = p_amount_total,
           status                     = CASE WHEN v_approve THEN 'approved' ELSE s.status END
     WHERE s.id = v_sub.id;
  END IF;

  INSERT INTO public.payment_fulfillments (
    stripe_checkout_session_id, submission_ref, submission_id, client_reference_id, session_binding,
    first_stripe_event_id, last_stripe_event_id, stripe_session_created_at,
    stripe_session_status, stripe_mode, stripe_payment_status, stripe_payment_intent_id,
    tier, expected_amount, currency,
    amount_subtotal, amount_total, amount_discount, amount_tax, amount_shipping,
    outcome, outcome_reason, anomaly_status,
    fulfillment_status, pdf_status, email_status)
  VALUES (
    p_session_id, v_sub.id, v_sub.id, left(p_client_reference_id, 200), v_binding,
    p_event_id, p_event_id,
    v_created_at,
    left(p_session_status, 50), left(p_mode, 50), left(p_payment_status, 50), left(p_payment_intent_id, 200),
    v_tier, v_price, left(p_currency, 10),
    p_amount_subtotal, p_amount_total, p_amount_discount, p_amount_tax, p_amount_shipping,
    v_outcome, v_reason, v_anomaly,
    v_ful, v_pdf, v_email)
  ON CONFLICT (stripe_checkout_session_id) DO NOTHING;
  GET DIAGNOSTICS v_inserted = ROW_COUNT;

  IF v_inserted = 0 THEN
    IF v_outcome = 'accepted' AND v_reason <> 'pre_ledger_payment' THEN
      -- Never leave a submission update without its ledger row.
      RAISE EXCEPTION 'payment ledger conflict for %', p_session_id USING ERRCODE = '40001';
    END IF;
    RETURN QUERY
      SELECT f.outcome, f.outcome_reason, false, f.fulfillment_status, f.tier, f.submission_id
        FROM public.payment_fulfillments f
       WHERE f.stripe_checkout_session_id = p_session_id;
    RETURN;
  END IF;

  RETURN QUERY SELECT v_outcome, v_reason, true, v_ful, v_tier, v_sub.id;
END
$$;

REVOKE ALL ON FUNCTION public.record_checkout_payment(text, text, text, bigint, text, text, text, text, text, integer, integer, integer, integer, integer) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.record_checkout_payment(text, text, text, bigint, text, text, text, text, text, integer, integer, integer, integer, integer) TO service_role;
