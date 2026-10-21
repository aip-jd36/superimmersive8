-- ============================================================================
-- CAA-SECURITY-3B — Stripe checkout & webhook integrity: payment ledger +
-- recoverable Creator Record / Certified fulfillment.
--
-- ADDITIVE ONLY. Creates two tables and seven functions. Does not alter or
-- backfill any existing table. Old application code ignores everything here.
--
-- Authority model:
--   * The application verifies the Stripe webhook signature and passes the
--     signed checkout-session facts VERBATIM to record_checkout_payment().
--   * This database decides acceptance. It derives the submission from
--     client_reference_id, locks it, binds the Stripe session to the session
--     id SI8 persisted at checkout, derives the list price from the stored
--     tier (payment_list_price_cents), and validates currency / amounts /
--     payment status itself. No "validation passed" flag is accepted from
--     the caller, and Stripe metadata is never an input.
--   * The webhook may only ever move a Creator Record from 'pending' to
--     'approved'. It never writes any other submission status and never
--     writes status for Certified tiers (human review stays separate).
--
-- Retention: payment-history retention after account/submission deletion is
-- an UNRESOLVED policy decision (PM). ON DELETE SET NULL keeps the ledger row
-- (with a non-FK submission_ref) so deletion is never blocked and payment
-- history is never silently destroyed. This migration does NOT establish a
-- permanent-retention policy and implements no purge.
--
-- Access: service_role only (RLS on, no policies; anon/authenticated have no
-- table or function privileges).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- List price: the single price authority for checkout AND webhook.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.payment_list_price_cents(p_tier text)
RETURNS integer
LANGUAGE sql
IMMUTABLE
SET search_path = pg_catalog, pg_temp
AS $$
  SELECT CASE p_tier
           WHEN 'creator_record' THEN 2900
           WHEN 'certified'      THEN 49900
           WHEN 'si8_certified'  THEN 49900
           ELSE NULL
         END
$$;

-- ---------------------------------------------------------------------------
-- Ledger: one row per Stripe checkout session that reached the webhook.
-- ---------------------------------------------------------------------------
CREATE TABLE public.payment_fulfillments (
  stripe_checkout_session_id text PRIMARY KEY,
  submission_ref             uuid,
  submission_id              uuid REFERENCES public.submissions(id) ON DELETE SET NULL,
  client_reference_id        text,
  session_binding            text NOT NULL,
  first_stripe_event_id      text NOT NULL,
  last_stripe_event_id       text NOT NULL,
  stripe_session_created_at  timestamptz,
  stripe_session_status      text,
  stripe_mode                text,
  stripe_payment_status      text,
  stripe_payment_intent_id   text,
  tier                       text,
  expected_amount            integer,
  currency                   text,
  amount_subtotal            integer,
  amount_total               integer,
  amount_discount            integer,
  amount_tax                 integer,
  amount_shipping            integer,
  outcome                    text NOT NULL,
  outcome_reason             text NOT NULL,
  anomaly_status             text NOT NULL DEFAULT 'none',
  anomaly_resolved_at        timestamptz,
  fulfillment_status         text NOT NULL,
  pdf_status                 text NOT NULL,
  pdf_completed_at           timestamptz,
  email_status               text NOT NULL,
  email_provider_id          text,
  email_accepted_at          timestamptz,
  claim_token                uuid,
  claimed_until              timestamptz,
  attempts                   integer NOT NULL DEFAULT 0,
  retry_window_started_at    timestamptz NOT NULL DEFAULT now(),
  last_error                 text,
  last_attempt_at            timestamptz,
  reconciliation_log         jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at                 timestamptz NOT NULL DEFAULT now(),
  updated_at                 timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT pf_session_id_format CHECK (stripe_checkout_session_id ~ '^cs_[A-Za-z0-9_]+$'),
  CONSTRAINT pf_event_id_format CHECK (first_stripe_event_id ~ '^evt_[A-Za-z0-9_]+$'
                                       AND last_stripe_event_id ~ '^evt_[A-Za-z0-9_]+$'),
  CONSTRAINT pf_binding_values CHECK (session_binding IN ('bound', 'unbound', 'mismatch', 'no_submission')),
  CONSTRAINT pf_tier_values CHECK (tier IS NULL OR tier IN ('creator_record', 'certified', 'si8_certified')),
  CONSTRAINT pf_outcome_values CHECK (outcome IN ('accepted', 'duplicate_payment', 'rejected')),
  CONSTRAINT pf_anomaly_values CHECK (anomaly_status IN ('none', 'open', 'resolved')),
  CONSTRAINT pf_fulfillment_values CHECK (fulfillment_status IN
    ('not_required', 'pending', 'in_progress', 'completed', 'failed', 'needs_reconciliation')),
  CONSTRAINT pf_pdf_values CHECK (pdf_status IN ('not_required', 'pending', 'completed')),
  CONSTRAINT pf_email_values CHECK (email_status IN
    ('not_required', 'pending', 'sending', 'accepted', 'failed', 'unknown', 'reconciled')),
  CONSTRAINT pf_attempts_nonneg CHECK (attempts >= 0),
  CONSTRAINT pf_log_is_array CHECK (jsonb_typeof(reconciliation_log) = 'array'),
  CONSTRAINT pf_ref_unless_rejected CHECK (outcome = 'rejected' OR submission_ref IS NOT NULL),
  CONSTRAINT pf_accepted_is_bound_or_unbound CHECK (outcome <> 'accepted' OR session_binding IN ('bound', 'unbound')),
  CONSTRAINT pf_unbound_has_created CHECK (
    outcome <> 'accepted' OR session_binding <> 'unbound' OR stripe_session_created_at IS NOT NULL),
  CONSTRAINT pf_accepted_payment_facts CHECK (
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
           OR (stripe_payment_status = 'no_payment_required' AND amount_total = 0))
    ), false)),
  CONSTRAINT pf_no_fulfillment_unless_accepted CHECK (
    outcome = 'accepted'
    OR (fulfillment_status = 'not_required' AND pdf_status = 'not_required' AND email_status = 'not_required')),
  CONSTRAINT pf_anomaly_unless_accepted CHECK (outcome = 'accepted' OR anomaly_status <> 'none'),
  CONSTRAINT pf_claim_iff_in_progress CHECK ((fulfillment_status = 'in_progress') = (claim_token IS NOT NULL)),
  CONSTRAINT pf_token_iff_lease CHECK ((claim_token IS NULL) = (claimed_until IS NULL)),
  CONSTRAINT pf_completed_is_terminal CHECK (
    fulfillment_status <> 'completed'
    OR (pdf_status IN ('not_required', 'completed') AND email_status IN ('not_required', 'accepted', 'reconciled'))),
  CONSTRAINT pf_accepted_email_has_id CHECK (email_status <> 'accepted' OR email_provider_id IS NOT NULL)
);

COMMENT ON TABLE public.payment_fulfillments IS
  'CAA-SECURITY-3B payment ledger. service_role only. Retention policy after deletion: UNRESOLVED (PM decision pending); no purge implemented.';

-- At most one accepted payment per submission (survives submission deletion).
CREATE UNIQUE INDEX pf_one_accepted_per_submission
  ON public.payment_fulfillments (submission_ref) WHERE outcome = 'accepted';
CREATE INDEX pf_submission_id_idx ON public.payment_fulfillments (submission_id);
-- Automatic retry candidates (no age cutoff: eligibility is decided by the claim).
CREATE INDEX pf_retry_candidates_idx ON public.payment_fulfillments (created_at)
  WHERE fulfillment_status IN ('pending', 'in_progress', 'failed');
-- Durable manual reconciliation queue (no age cutoff, ever).
CREATE INDEX pf_attention_idx ON public.payment_fulfillments (created_at)
  WHERE anomaly_status = 'open' OR fulfillment_status IN ('needs_reconciliation', 'failed');

-- ---------------------------------------------------------------------------
-- Legacy unbound-session policy (singleton). Pre-3B checkout never persisted
-- its session id, so a session it created arrives "unbound". That exception
-- is bounded twice, both enforced inside record_checkout_payment():
--   * cutoff_at    — only sessions whose Stripe-signed `created` is strictly
--                    before this instant are eligible;
--   * accept_until — after this instant no unbound session is accepted at
--                    all, whatever its creation time (absolute sunset).
-- FAIL-CLOSED DEFAULTS: applying this migration sets a provisional cutoff of
-- apply-time + 72h and accept_until = cutoff + 7 days. If the post-deploy
-- activation is missed, the exception still closes on its own. Activation
-- (activate_payment_legacy_cutoff) can only TIGHTEN both bounds. Missing row
-- or NULL creation time ⇒ rejected. Rejections are durable ledger anomalies.
-- service_role may only READ this table; it cannot reopen the exception.
-- ---------------------------------------------------------------------------
CREATE TABLE public.payment_legacy_session_policy (
  singleton       boolean PRIMARY KEY DEFAULT true,
  cutoff_at       timestamptz NOT NULL,
  accept_until    timestamptz NOT NULL,
  installed_at    timestamptz NOT NULL DEFAULT now(),
  activated_at    timestamptz,
  activation_note text,
  CONSTRAINT plsp_singleton CHECK (singleton),
  CONSTRAINT plsp_order CHECK (accept_until >= cutoff_at),
  CONSTRAINT plsp_bounded_tail CHECK (accept_until <= cutoff_at + interval '7 days'),
  CONSTRAINT plsp_activation_noted CHECK ((activated_at IS NULL) = (activation_note IS NULL))
);

COMMENT ON TABLE public.payment_legacy_session_policy IS
  'CAA-SECURITY-3B legacy unbound checkout-session exception. Fail-closed provisional bounds; tighten-only activation via activate_payment_legacy_cutoff().';

INSERT INTO public.payment_legacy_session_policy (cutoff_at, accept_until)
VALUES (now() + interval '72 hours', now() + interval '72 hours' + interval '7 days');

-- Operator procedure (run as the migration owner, AFTER the 3B deploy is
-- confirmed live at time T):  SELECT * FROM public.activate_payment_legacy_cutoff(T, 'note');
-- T must be in the past and no later than the current cutoff.
CREATE OR REPLACE FUNCTION public.activate_payment_legacy_cutoff(
  p_cutoff timestamptz,
  p_note   text
) RETURNS TABLE(out_cutoff_at timestamptz, out_accept_until timestamptz)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
#variable_conflict error
DECLARE
  v_pol public.payment_legacy_session_policy%ROWTYPE;
BEGIN
  IF p_cutoff IS NULL OR p_cutoff > now() THEN
    RAISE EXCEPTION 'cutoff must be a confirmed past deploy time' USING ERRCODE = '22023';
  END IF;
  IF p_note IS NULL OR length(btrim(p_note)) < 5 THEN
    RAISE EXCEPTION 'activation requires a note (min 5 chars)' USING ERRCODE = '22023';
  END IF;
  SELECT p.* INTO v_pol FROM public.payment_legacy_session_policy p WHERE p.singleton FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'legacy session policy row missing' USING ERRCODE = '22023';
  END IF;
  IF p_cutoff > v_pol.cutoff_at THEN
    RAISE EXCEPTION 'activation may only tighten the cutoff (current %)', v_pol.cutoff_at USING ERRCODE = '22023';
  END IF;

  UPDATE public.payment_legacy_session_policy p
     SET cutoff_at       = p_cutoff,
         accept_until    = LEAST(p.accept_until, p_cutoff + interval '7 days'),
         activated_at    = now(),
         activation_note = left(btrim(p_note), 2000)
   WHERE p.singleton;

  RETURN QUERY SELECT p.cutoff_at, p.accept_until FROM public.payment_legacy_session_policy p WHERE p.singleton;
END
$$;

-- ---------------------------------------------------------------------------
-- 1) record_checkout_payment — atomic: ledger row + payment + CR approval.
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
    IF p_amount_total = 0 OR p_payment_intent_id IS NULL OR p_payment_intent_id !~ '^pi_[A-Za-z0-9_]+$' THEN
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

-- ---------------------------------------------------------------------------
-- 2) claim_payment_fulfillment — automatic-retry eligibility + lease/fencing.
--    Rows that may not be retried automatically move to needs_reconciliation
--    (the durable manual queue); nothing is ever dropped by age.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.claim_payment_fulfillment(
  p_session_id           text,
  p_lease_seconds        integer,
  p_max_attempts         integer,
  p_retry_window_seconds integer
) RETURNS TABLE(out_claimed boolean, out_claim_token uuid, out_reason text,
                out_submission_id uuid, out_tier text, out_pdf_status text, out_email_status text)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
#variable_conflict error
DECLARE
  v_row   public.payment_fulfillments%ROWTYPE;
  v_email text;
  v_token uuid;
  v_to    text;
BEGIN
  IF p_lease_seconds IS NULL OR p_lease_seconds NOT BETWEEN 30 AND 900 THEN
    RAISE EXCEPTION 'lease must be 30..900 seconds' USING ERRCODE = '22023';
  END IF;
  IF p_max_attempts IS NULL OR p_max_attempts NOT BETWEEN 1 AND 20 THEN
    RAISE EXCEPTION 'max attempts must be 1..20' USING ERRCODE = '22023';
  END IF;
  IF p_retry_window_seconds IS NULL OR p_retry_window_seconds NOT BETWEEN 3600 AND 2592000 THEN
    RAISE EXCEPTION 'retry window must be 1h..30d' USING ERRCODE = '22023';
  END IF;

  SELECT f.* INTO v_row
    FROM public.payment_fulfillments f
   WHERE f.stripe_checkout_session_id = p_session_id
     FOR UPDATE;
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::uuid, 'not_found'::text, NULL::uuid, NULL::text, NULL::text, NULL::text;
    RETURN;
  END IF;

  IF v_row.fulfillment_status IN ('not_required', 'completed', 'needs_reconciliation') THEN
    RETURN QUERY SELECT false, NULL::uuid,
                        CASE WHEN v_row.fulfillment_status = 'needs_reconciliation'
                             THEN 'needs_reconciliation' ELSE 'nothing_to_do' END,
                        v_row.submission_id, v_row.tier, v_row.pdf_status, v_row.email_status;
    RETURN;
  END IF;
  IF v_row.fulfillment_status = 'in_progress' AND v_row.claimed_until > now() THEN
    RETURN QUERY SELECT false, NULL::uuid, 'claimed_elsewhere'::text,
                        v_row.submission_id, v_row.tier, v_row.pdf_status, v_row.email_status;
    RETURN;
  END IF;

  v_email := v_row.email_status;
  IF v_email = 'sending' THEN
    v_email := 'unknown';            -- previous holder lost its lease mid-send: outcome ambiguous
  END IF;

  -- Previous holder completed every step but died before finish().
  IF v_row.pdf_status IN ('not_required', 'completed') AND v_email IN ('not_required', 'accepted', 'reconciled') THEN
    UPDATE public.payment_fulfillments
       SET fulfillment_status = 'completed', email_status = v_email,
           claim_token = NULL, claimed_until = NULL, last_error = NULL, updated_at = now()
     WHERE stripe_checkout_session_id = p_session_id;
    RETURN QUERY SELECT false, NULL::uuid, 'already_complete'::text,
                        v_row.submission_id, v_row.tier, v_row.pdf_status, v_email;
    RETURN;
  END IF;

  v_to := CASE
            WHEN v_email = 'unknown' THEN 'email_outcome_unknown'
            WHEN v_row.attempts >= p_max_attempts THEN 'attempts_exhausted'
            WHEN v_row.retry_window_started_at < now() - make_interval(secs => p_retry_window_seconds)
              THEN 'retry_window_expired'
          END;
  IF v_to IS NOT NULL THEN
    UPDATE public.payment_fulfillments
       SET fulfillment_status = 'needs_reconciliation', email_status = v_email,
           claim_token = NULL, claimed_until = NULL,
           last_error = left(v_to || COALESCE(': ' || last_error, ''), 1000), updated_at = now()
     WHERE stripe_checkout_session_id = p_session_id;
    RETURN QUERY SELECT false, NULL::uuid, v_to, v_row.submission_id, v_row.tier, v_row.pdf_status, v_email;
    RETURN;
  END IF;

  v_token := gen_random_uuid();
  UPDATE public.payment_fulfillments
     SET fulfillment_status = 'in_progress',
         claim_token        = v_token,
         claimed_until      = now() + make_interval(secs => p_lease_seconds),
         attempts           = attempts + 1,
         last_attempt_at    = now(),
         email_status       = v_email,
         updated_at         = now()
   WHERE stripe_checkout_session_id = p_session_id;

  RETURN QUERY SELECT true, v_token, 'claimed'::text,
                      v_row.submission_id, v_row.tier, v_row.pdf_status, v_email;
END
$$;

-- ---------------------------------------------------------------------------
-- 3) mark_payment_fulfillment_step — fenced by claim token; legal moves only.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.mark_payment_fulfillment_step(
  p_session_id  text,
  p_claim_token uuid,
  p_step        text,
  p_status      text,
  p_provider_id text,
  p_error       text
) RETURNS boolean
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
#variable_conflict error
DECLARE
  v_count integer;
BEGIN
  IF p_step IS NULL OR p_step NOT IN ('pdf', 'email') THEN
    RAISE EXCEPTION 'invalid fulfillment step' USING ERRCODE = '22023';
  END IF;

  UPDATE public.payment_fulfillments f
     SET pdf_status        = CASE WHEN p_step = 'pdf' THEN p_status ELSE f.pdf_status END,
         pdf_completed_at  = CASE WHEN p_step = 'pdf' AND p_status = 'completed' THEN now() ELSE f.pdf_completed_at END,
         email_status      = CASE WHEN p_step = 'email' THEN p_status ELSE f.email_status END,
         email_provider_id = CASE WHEN p_step = 'email' AND p_status = 'accepted' THEN left(p_provider_id, 200) ELSE f.email_provider_id END,
         email_accepted_at = CASE WHEN p_step = 'email' AND p_status = 'accepted' THEN now() ELSE f.email_accepted_at END,
         last_error        = COALESCE(left(p_error, 1000), f.last_error),
         updated_at        = now()
   WHERE f.stripe_checkout_session_id = p_session_id
     AND f.fulfillment_status = 'in_progress'
     AND f.claim_token = p_claim_token
     AND (   (p_step = 'pdf'   AND f.pdf_status = 'pending' AND p_status IN ('completed', 'not_required'))
          OR (p_step = 'email' AND f.email_status IN ('pending', 'failed') AND f.pdf_status <> 'pending'
                               AND p_status IN ('sending', 'not_required'))
          OR (p_step = 'email' AND f.email_status = 'sending' AND p_status IN ('failed', 'unknown'))
          OR (p_step = 'email' AND f.email_status = 'sending' AND p_status = 'accepted'
                               AND p_provider_id IS NOT NULL));
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count = 1;
END
$$;

-- ---------------------------------------------------------------------------
-- 4) finish_payment_fulfillment — release the claim, settle the status.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.finish_payment_fulfillment(
  p_session_id  text,
  p_claim_token uuid,
  p_error       text
) RETURNS text
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
#variable_conflict error
DECLARE
  v_status text;
BEGIN
  UPDATE public.payment_fulfillments f
     SET fulfillment_status = CASE
           WHEN f.pdf_status IN ('not_required', 'completed')
            AND f.email_status IN ('not_required', 'accepted', 'reconciled') THEN 'completed'
           WHEN f.email_status IN ('sending', 'unknown') THEN 'needs_reconciliation'
           ELSE 'failed'
         END,
         email_status  = CASE WHEN f.email_status = 'sending' THEN 'unknown' ELSE f.email_status END,
         claim_token   = NULL,
         claimed_until = NULL,
         last_error    = CASE
           WHEN f.pdf_status IN ('not_required', 'completed')
            AND f.email_status IN ('not_required', 'accepted', 'reconciled') THEN NULL
           ELSE COALESCE(left(p_error, 1000), f.last_error)
         END,
         updated_at    = now()
   WHERE f.stripe_checkout_session_id = p_session_id
     AND f.fulfillment_status = 'in_progress'
     AND f.claim_token = p_claim_token
  RETURNING f.fulfillment_status INTO v_status;

  RETURN COALESCE(v_status, 'not_owner');
END
$$;

-- ---------------------------------------------------------------------------
-- 5) reconcile_payment_fulfillment — admin-led reconciliation, audited.
--    retry_fulfillment       failed|needs_reconciliation -> pending (email must not be unknown)
--    authorize_email_resend  email unknown -> pending (operator accepts duplicate risk)
--    close_unknown_email     email unknown -> reconciled (operator confirmed / no resend)
--    resolve_anomaly         anomaly open -> resolved
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.reconcile_payment_fulfillment(
  p_session_id text,
  p_action     text,
  p_actor_id   uuid,
  p_note       text
) RETURNS text
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
#variable_conflict error
DECLARE
  v_row   public.payment_fulfillments%ROWTYPE;
  v_entry jsonb;
  v_ful   text;
BEGIN
  IF p_action IS NULL OR p_action NOT IN
     ('retry_fulfillment', 'authorize_email_resend', 'close_unknown_email', 'resolve_anomaly') THEN
    RAISE EXCEPTION 'invalid reconciliation action' USING ERRCODE = '22023';
  END IF;
  IF p_actor_id IS NULL THEN
    RAISE EXCEPTION 'reconciliation requires an actor' USING ERRCODE = '22023';
  END IF;
  IF p_note IS NULL OR length(btrim(p_note)) < 5 THEN
    RAISE EXCEPTION 'reconciliation requires a note (min 5 chars)' USING ERRCODE = '22023';
  END IF;

  SELECT f.* INTO v_row
    FROM public.payment_fulfillments f
   WHERE f.stripe_checkout_session_id = p_session_id
     FOR UPDATE;
  IF NOT FOUND THEN
    RETURN 'not_found';
  END IF;

  v_entry := jsonb_build_object('at', now(), 'actor', p_actor_id, 'action', p_action,
                                'note', left(btrim(p_note), 2000),
                                'fulfillment_status', v_row.fulfillment_status,
                                'email_status', v_row.email_status);

  IF p_action = 'resolve_anomaly' THEN
    IF v_row.anomaly_status <> 'open' THEN
      RETURN 'not_applicable';
    END IF;
    UPDATE public.payment_fulfillments
       SET anomaly_status = 'resolved', anomaly_resolved_at = now(),
           reconciliation_log = reconciliation_log || jsonb_build_array(v_entry), updated_at = now()
     WHERE stripe_checkout_session_id = p_session_id;
    RETURN 'anomaly_resolved';
  END IF;

  IF v_row.outcome <> 'accepted' OR v_row.fulfillment_status = 'in_progress' THEN
    RETURN 'not_applicable';
  END IF;

  IF p_action = 'close_unknown_email' THEN
    IF v_row.email_status <> 'unknown' THEN
      RETURN 'not_applicable';
    END IF;
    v_ful := CASE WHEN v_row.pdf_status IN ('not_required', 'completed') THEN 'completed'
                  ELSE 'needs_reconciliation' END;
    UPDATE public.payment_fulfillments
       SET email_status = 'reconciled', fulfillment_status = v_ful,
           last_error = CASE WHEN v_ful = 'completed' THEN NULL ELSE last_error END,
           reconciliation_log = reconciliation_log || jsonb_build_array(v_entry), updated_at = now()
     WHERE stripe_checkout_session_id = p_session_id;
    RETURN 'email_reconciled';
  END IF;

  IF p_action = 'authorize_email_resend' THEN
    IF v_row.email_status <> 'unknown' THEN
      RETURN 'not_applicable';
    END IF;
    UPDATE public.payment_fulfillments
       SET email_status = 'pending', fulfillment_status = 'pending',
           attempts = 0, retry_window_started_at = now(),
           reconciliation_log = reconciliation_log || jsonb_build_array(v_entry), updated_at = now()
     WHERE stripe_checkout_session_id = p_session_id;
    RETURN 'email_resend_authorized';
  END IF;

  -- retry_fulfillment
  IF v_row.fulfillment_status NOT IN ('failed', 'needs_reconciliation') OR v_row.email_status = 'unknown' THEN
    RETURN 'not_applicable';
  END IF;
  UPDATE public.payment_fulfillments
     SET fulfillment_status = 'pending', attempts = 0, retry_window_started_at = now(),
         reconciliation_log = reconciliation_log || jsonb_build_array(v_entry), updated_at = now()
   WHERE stripe_checkout_session_id = p_session_id;
  RETURN 'retry_scheduled';
END
$$;

-- ---------------------------------------------------------------------------
-- Privileges: deny everyone (incl. Supabase default grants), then grant the
-- minimum to service_role. No DELETE / TRUNCATE for anyone.
-- ---------------------------------------------------------------------------
ALTER TABLE public.payment_fulfillments ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.payment_fulfillments FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE ON TABLE public.payment_fulfillments TO service_role;

ALTER TABLE public.payment_legacy_session_policy ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.payment_legacy_session_policy FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON TABLE public.payment_legacy_session_policy TO service_role;
-- Activation is an operator action only: no role but the owner may execute it.
REVOKE ALL ON FUNCTION public.activate_payment_legacy_cutoff(timestamptz, text) FROM PUBLIC, anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.payment_list_price_cents(text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.record_checkout_payment(text, text, text, bigint, text, text, text, text, text, integer, integer, integer, integer, integer) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.claim_payment_fulfillment(text, integer, integer, integer) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.mark_payment_fulfillment_step(text, uuid, text, text, text, text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.finish_payment_fulfillment(text, uuid, text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.reconcile_payment_fulfillment(text, text, uuid, text) FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.payment_list_price_cents(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.record_checkout_payment(text, text, text, bigint, text, text, text, text, text, integer, integer, integer, integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_payment_fulfillment(text, integer, integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.mark_payment_fulfillment_step(text, uuid, text, text, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.finish_payment_fulfillment(text, uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.reconcile_payment_fulfillment(text, text, uuid, text) TO service_role;
