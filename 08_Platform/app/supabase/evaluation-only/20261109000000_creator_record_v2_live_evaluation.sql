-- CR-V2-DOC-LIVE-1C-A — the durable authority, cost ledger and result store for a controlled live-examination evaluation.
--
-- EVALUATION-ONLY. NOT A MIGRATION. This file is outside supabase/migrations on purpose, so no migration tooling applies it. It may be
-- applied by hand only to an isolated evaluation project, after 20261108000000, and never to Production. It has been applied only to
-- disposable local test databases. Applying it anywhere is a separate decision.
--
-- CHANGES NOTHING THAT EXISTS: no existing table, column, CHECK, trigger, function, row, grant or policy. The 1A attempts table stays
-- mock_test only. Live results go to their own table here.
--
-- WHAT IT DOES:
--   * Authority is DURABLE and not the application's: an authorization row names the evaluation, operator, environment, expiry (at most
--     7 days), model, profile, attempt and spend ceilings, and each permitted document with its digest and an authority reference. The
--     service role can read these rows and cannot write them. Only the database operator can create, extend or revoke one. Revocation
--     only narrows authority.
--   * Every function first requires an evaluation environment marker naming this project, and the authorization must name the same
--     project. Neither may name the Production project.
--   * Cost is a durable LEDGER: a reservation is taken under a lock before a model call, and is never refunded. A settled reservation
--     costs the larger of its reservation and the reported estimate. An unsettled one costs its reservation, so a crash or a restart
--     cannot reset spend.
--   * A result is stored only against an unsettled reservation of the same document, operator and authorization, with a recent
--     examination read for that document. One reading per document and profile, first write wins, three attempts, append-only.
--
-- LIMITS OF WHAT A DATABASE CAN PROVE: the marker records the operator's decision about where this runs; it cannot observe it. The
-- authority reference is a reference to consent or authority recorded elsewhere; the database cannot verify that consent. Spend figures
-- are estimates from reported token counts; the provider's bill is the reference. None of this defends against the database operator.
--
-- NOTHING READS these tables for a record, guidance, PDF, payment or eligibility.
--
-- ROLLBACK (only while every table is empty): drop the six functions (authority, spent, preflight, reserve, settle, record), the five
-- tables (environment, authorizations, documents, reservations, attempts) and the three trigger guard functions (authorization,
-- document, reservation). The environment marker and the attempts reuse the existing creator_record_v2_examination_append_only_guard,
-- which stays.

DO $pre$
BEGIN
  IF to_regclass('public.creator_record_v2_live_examination_attempts') IS NULL THEN
    RAISE EXCEPTION 'the evaluation schema requires 20261108000000' USING ERRCODE = 'P0001';
  END IF;
END
$pre$;

-- ── 1. Environment marker ───────────────────────────────────────────────────────────────────────────

CREATE TABLE public.creator_record_v2_live_evaluation_environment (
  singleton             boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  supabase_project_ref  text NOT NULL CHECK (supabase_project_ref ~ '^[a-z0-9]{20}$' AND supabase_project_ref <> 'lehqgcgnenwdmuzudbrs'),
  established_by        text NOT NULL CHECK (length(trim(established_by)) > 0),
  reason                text NOT NULL CHECK (length(trim(reason)) > 0),
  established_at        timestamptz NOT NULL DEFAULT now()
);
-- It can be removed (that only narrows authority), never changed.
CREATE TRIGGER creator_record_v2_live_evaluation_environment_fixed
  BEFORE UPDATE ON public.creator_record_v2_live_evaluation_environment
  FOR EACH ROW EXECUTE FUNCTION public.creator_record_v2_examination_append_only_guard();

-- ── 2. Authorizations and their documents ───────────────────────────────────────────────────────────

CREATE TABLE public.creator_record_v2_live_evaluation_authorizations (
  evaluation_id               text PRIMARY KEY CHECK (evaluation_id ~ '^[a-z0-9][a-z0-9._-]{7,63}$'),
  operator_user_id            uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  environment_ref             text NOT NULL CHECK (environment_ref ~ '^[a-z0-9]{20}$' AND environment_ref <> 'lehqgcgnenwdmuzudbrs'),
  provider                    text NOT NULL CHECK (provider = 'anthropic'),
  model                       text NOT NULL CHECK (model ~ '^[a-z0-9][a-z0-9._-]{0,99}$' AND model !~* '(mock|test|fixture|synthetic|double)'),
  profile_id                  text NOT NULL CHECK (profile_id ~ '^[a-z][a-z0-9_-]{0,39}$'),
  profile_version             integer NOT NULL CHECK (profile_version >= 1),
  max_attempts                integer NOT NULL CHECK (max_attempts BETWEEN 1 AND 30),
  max_spend_micro_usd         bigint NOT NULL CHECK (max_spend_micro_usd BETWEEN 1 AND 10000000),
  attempt_reserve_micro_usd   bigint NOT NULL CHECK (attempt_reserve_micro_usd >= 1),
  approved_by                 text NOT NULL CHECK (length(trim(approved_by)) > 0),
  approval_reference          text NOT NULL CHECK (approval_reference ~ '^[a-z0-9][a-z0-9._-]{7,63}$'),
  created_at                  timestamptz NOT NULL DEFAULT now(),
  expires_at                  timestamptz NOT NULL,
  revoked_at                  timestamptz,
  revocation_reason           text,
  CHECK (attempt_reserve_micro_usd <= max_spend_micro_usd),
  CHECK (expires_at > created_at AND expires_at <= created_at + interval '7 days'),
  CHECK ((revoked_at IS NULL) = (revocation_reason IS NULL)),
  CHECK (revocation_reason IS NULL OR length(trim(revocation_reason)) > 0)
);

-- Created at server time, so it cannot be back-dated to stretch its life. Afterwards the one change allowed is revocation.
CREATE OR REPLACE FUNCTION public.creator_record_v2_live_evaluation_authorization_guard()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.revoked_at IS NOT NULL THEN
      RAISE EXCEPTION 'an authorization is created unrevoked' USING ERRCODE = 'P0001';
    END IF;
    NEW.created_at := now();
    RETURN NEW;
  END IF;
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'an authorization is never deleted; revoke it' USING ERRCODE = 'P0001';
  END IF;
  IF OLD.revoked_at IS NOT NULL OR NEW.revoked_at IS NULL
     OR (to_jsonb(NEW) - 'revoked_at' - 'revocation_reason') IS DISTINCT FROM (to_jsonb(OLD) - 'revoked_at' - 'revocation_reason') THEN
    RAISE EXCEPTION 'the only change to an authorization is revoking it, once' USING ERRCODE = 'P0001';
  END IF;
  NEW.revoked_at := now();
  RETURN NEW;
END;
$$;
CREATE TRIGGER creator_record_v2_live_evaluation_authorization_guard
  BEFORE INSERT OR UPDATE OR DELETE ON public.creator_record_v2_live_evaluation_authorizations
  FOR EACH ROW EXECUTE FUNCTION public.creator_record_v2_live_evaluation_authorization_guard();

CREATE TABLE public.creator_record_v2_live_evaluation_documents (
  evaluation_id        text NOT NULL REFERENCES public.creator_record_v2_live_evaluation_authorizations(evaluation_id) ON DELETE RESTRICT,
  document_id          uuid NOT NULL REFERENCES public.creator_record_v2_documents(id) ON DELETE RESTRICT,
  document_sha256      char(64) NOT NULL CHECK (document_sha256 ~ '^[0-9a-f]{64}$'),
  authority_reference  text NOT NULL CHECK (authority_reference ~ '^[a-z0-9][a-z0-9._-]{7,63}$'),
  added_at             timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (evaluation_id, document_id)
);

-- A permitted document is the operator's own, stored, with exactly these bytes, not a synthetic fixture, at most 10 per evaluation.
CREATE OR REPLACE FUNCTION public.creator_record_v2_live_evaluation_document_guard()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
DECLARE
  v_auth public.creator_record_v2_live_evaluation_authorizations%ROWTYPE;
  v_doc  public.creator_record_v2_documents%ROWTYPE;
BEGIN
  IF TG_OP <> 'INSERT' THEN
    RAISE EXCEPTION '% is append-only', TG_TABLE_NAME USING ERRCODE = 'P0001';
  END IF;
  SELECT * INTO v_auth FROM public.creator_record_v2_live_evaluation_authorizations a WHERE a.evaluation_id = NEW.evaluation_id FOR UPDATE;
  SELECT * INTO v_doc FROM public.creator_record_v2_documents d WHERE d.id = NEW.document_id;
  IF v_auth.revoked_at IS NOT NULL OR v_auth.expires_at <= now() THEN
    RAISE EXCEPTION 'documents are added only to an authorization in force' USING ERRCODE = 'P0001';
  END IF;
  IF v_doc.state <> 'stored' OR v_doc.user_id <> v_auth.operator_user_id OR v_doc.sha256 <> NEW.document_sha256
     OR EXISTS (SELECT 1 FROM public.creator_record_v2_synthetic_fixtures f WHERE f.sha256 = v_doc.sha256) THEN
    RAISE EXCEPTION 'a permitted document is the operator''s own stored document, by its exact SHA-256, and not a synthetic fixture' USING ERRCODE = 'P0001';
  END IF;
  IF (SELECT count(*) FROM public.creator_record_v2_live_evaluation_documents e WHERE e.evaluation_id = NEW.evaluation_id) >= 10 THEN
    RAISE EXCEPTION 'an evaluation names at most 10 documents' USING ERRCODE = 'P0001';
  END IF;
  NEW.added_at := now();
  RETURN NEW;
END;
$$;
CREATE TRIGGER creator_record_v2_live_evaluation_document_guard
  BEFORE INSERT OR UPDATE OR DELETE ON public.creator_record_v2_live_evaluation_documents
  FOR EACH ROW EXECUTE FUNCTION public.creator_record_v2_live_evaluation_document_guard();

-- ── 3. The cost ledger ──────────────────────────────────────────────────────────────────────────────

CREATE TABLE public.creator_record_v2_live_evaluation_reservations (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluation_id         text NOT NULL REFERENCES public.creator_record_v2_live_evaluation_authorizations(evaluation_id) ON DELETE RESTRICT,
  document_id           uuid NOT NULL REFERENCES public.creator_record_v2_documents(id) ON DELETE RESTRICT,
  operator_user_id      uuid NOT NULL,
  sequence              integer NOT NULL CHECK (sequence BETWEEN 1 AND 30),
  reserved_micro_usd    bigint NOT NULL CHECK (reserved_micro_usd >= 1),
  created_at            timestamptz NOT NULL DEFAULT now(),
  settled_at            timestamptz,
  requests              integer CHECK (requests BETWEEN 0 AND 2),
  input_tokens          bigint CHECK (input_tokens >= 0),
  output_tokens         bigint CHECK (output_tokens >= 0),
  usage_complete        boolean,
  estimated_micro_usd   bigint CHECK (estimated_micro_usd >= 0),
  charged_micro_usd     bigint,
  UNIQUE (evaluation_id, sequence),
  CHECK ((settled_at IS NULL) = (requests IS NULL) AND (settled_at IS NULL) = (input_tokens IS NULL) AND (settled_at IS NULL) = (output_tokens IS NULL)
         AND (settled_at IS NULL) = (usage_complete IS NULL) AND (settled_at IS NULL) = (estimated_micro_usd IS NULL) AND (settled_at IS NULL) = (charged_micro_usd IS NULL)),
  CHECK (charged_micro_usd IS NULL OR (charged_micro_usd >= reserved_micro_usd AND charged_micro_usd >= estimated_micro_usd))
);
CREATE INDEX creator_record_v2_live_evaluation_reservations_document ON public.creator_record_v2_live_evaluation_reservations (evaluation_id, document_id);

-- Settling, once, is the only change; nothing is deleted, so spend cannot be reset.
CREATE OR REPLACE FUNCTION public.creator_record_v2_live_evaluation_reservation_guard()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
  IF TG_OP = 'DELETE' OR OLD.settled_at IS NOT NULL OR NEW.settled_at IS NULL
     OR (NEW.id, NEW.evaluation_id, NEW.document_id, NEW.operator_user_id, NEW.sequence, NEW.reserved_micro_usd, NEW.created_at)
        IS DISTINCT FROM (OLD.id, OLD.evaluation_id, OLD.document_id, OLD.operator_user_id, OLD.sequence, OLD.reserved_micro_usd, OLD.created_at) THEN
    RAISE EXCEPTION 'a reservation is only ever settled, once' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER creator_record_v2_live_evaluation_reservation_guard
  BEFORE UPDATE OR DELETE ON public.creator_record_v2_live_evaluation_reservations
  FOR EACH ROW EXECUTE FUNCTION public.creator_record_v2_live_evaluation_reservation_guard();

-- ── 4. Live results ─────────────────────────────────────────────────────────────────────────────────

CREATE TABLE public.creator_record_v2_live_evaluation_attempts (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluation_id       text NOT NULL REFERENCES public.creator_record_v2_live_evaluation_authorizations(evaluation_id) ON DELETE RESTRICT,
  reservation_id      uuid NOT NULL UNIQUE REFERENCES public.creator_record_v2_live_evaluation_reservations(id) ON DELETE RESTRICT,
  attempt_number      integer NOT NULL CHECK (attempt_number BETWEEN 1 AND 3),
  examination_key     char(64) NOT NULL CHECK (examination_key ~ '^[0-9a-f]{64}$'),
  document_id         uuid NOT NULL REFERENCES public.creator_record_v2_documents(id) ON DELETE RESTRICT,
  user_id             uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  document_sha256     char(64) NOT NULL CHECK (document_sha256 ~ '^[0-9a-f]{64}$'),
  envelope_version    integer NOT NULL CHECK (envelope_version = 3),
  execution_origin    text NOT NULL CHECK (execution_origin = 'live_model'),
  content_class       text NOT NULL CHECK (content_class = 'customer_document'),
  profile_id          text NOT NULL CHECK (profile_id ~ '^[a-z][a-z0-9_-]{0,39}$'),
  profile_version     integer NOT NULL CHECK (profile_version >= 1),
  schema_version      text NOT NULL CHECK (schema_version ~ '^[a-z0-9][a-z0-9._-]{0,99}$'),
  prompt_version      text NOT NULL CHECK (prompt_version ~ '^[a-z0-9][a-z0-9._-]{0,99}$'),
  executor_mode       text NOT NULL CHECK (executor_mode = 'live_model'),
  provider            text NOT NULL CHECK (provider = 'anthropic'),
  model               text NOT NULL CHECK (model ~ '^[a-z0-9][a-z0-9._-]{0,99}$' AND model !~* '(mock|test|fixture|synthetic|double)'),
  outcome_status      text NOT NULL CHECK (outcome_status IN ('examined', 'could_not_examine')),
  outcome_reason      text CHECK (outcome_reason IN ('unsupported_format', 'file_too_large', 'empty_file', 'model_timeout', 'provider_failure', 'structured_output_missing', 'schema_invalid')),
  executed_at         text NOT NULL CHECK (executed_at ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{3}Z$'),
  envelope_canonical  text NOT NULL CHECK (length(envelope_canonical) BETWEEN 2 AND 262144),
  envelope_sha256     char(64) NOT NULL CHECK (envelope_sha256 ~ '^[0-9a-f]{64}$'),
  access_log_id       bigint NOT NULL UNIQUE REFERENCES public.creator_record_v2_evidence_access_log(id) ON DELETE RESTRICT,
  created_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (evaluation_id, document_id, profile_id, attempt_number),
  CHECK ((outcome_status = 'examined') = (outcome_reason IS NULL))
);
CREATE UNIQUE INDEX creator_record_v2_live_evaluation_one_reading
  ON public.creator_record_v2_live_evaluation_attempts (evaluation_id, document_id, profile_id) WHERE outcome_status = 'examined';
CREATE TRIGGER creator_record_v2_live_evaluation_attempts_append_only
  BEFORE UPDATE OR DELETE ON public.creator_record_v2_live_evaluation_attempts
  FOR EACH ROW EXECUTE FUNCTION public.creator_record_v2_examination_append_only_guard();

-- ── 5. Authority: one check, used by every entry function ───────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.creator_record_v2_live_evaluation_authority(p_evaluation_id text, p_operator uuid, p_document_id uuid)
RETURNS public.creator_record_v2_live_evaluation_authorizations
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_env  public.creator_record_v2_live_evaluation_environment%ROWTYPE;
  v_auth public.creator_record_v2_live_evaluation_authorizations%ROWTYPE;
  v_perm public.creator_record_v2_live_evaluation_documents%ROWTYPE;
  v_doc  public.creator_record_v2_documents%ROWTYPE;
BEGIN
  SELECT * INTO v_env FROM public.creator_record_v2_live_evaluation_environment WHERE singleton;
  IF NOT FOUND THEN RAISE EXCEPTION 'live_evaluation_environment_not_established' USING ERRCODE = 'P0001'; END IF;
  SELECT * INTO v_auth FROM public.creator_record_v2_live_evaluation_authorizations a WHERE a.evaluation_id = p_evaluation_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'live_evaluation_authorization_not_found' USING ERRCODE = 'P0001'; END IF;
  IF v_auth.operator_user_id IS DISTINCT FROM p_operator THEN RAISE EXCEPTION 'live_evaluation_operator_mismatch' USING ERRCODE = 'P0001'; END IF;
  IF v_auth.environment_ref <> v_env.supabase_project_ref THEN RAISE EXCEPTION 'live_evaluation_environment_mismatch' USING ERRCODE = 'P0001'; END IF;
  IF v_auth.revoked_at IS NOT NULL THEN RAISE EXCEPTION 'live_evaluation_authorization_revoked' USING ERRCODE = 'P0001'; END IF;
  IF now() >= v_auth.expires_at OR now() < v_auth.created_at THEN RAISE EXCEPTION 'live_evaluation_authorization_expired' USING ERRCODE = 'P0001'; END IF;
  SELECT * INTO v_perm FROM public.creator_record_v2_live_evaluation_documents e WHERE e.evaluation_id = p_evaluation_id AND e.document_id = p_document_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'live_evaluation_document_not_authorized' USING ERRCODE = 'P0001'; END IF;
  SELECT * INTO v_doc FROM public.creator_record_v2_documents d WHERE d.id = p_document_id FOR SHARE;
  IF NOT FOUND OR v_doc.state <> 'stored' OR v_doc.user_id <> p_operator OR v_doc.sha256 <> v_perm.document_sha256
     OR EXISTS (SELECT 1 FROM public.creator_record_v2_synthetic_fixtures f WHERE f.sha256 = v_doc.sha256) THEN
    RAISE EXCEPTION 'live_evaluation_document_mismatch' USING ERRCODE = 'P0001';
  END IF;
  RETURN v_auth;
END;
$$;

-- What has been committed against an evaluation. An unsettled reservation counts in full.
CREATE OR REPLACE FUNCTION public.creator_record_v2_live_evaluation_spent(p_evaluation_id text)
RETURNS TABLE (spent_micro_usd bigint, reservations_used integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT coalesce(sum(coalesce(r.charged_micro_usd, r.reserved_micro_usd)), 0)::bigint, count(*)::integer
  FROM public.creator_record_v2_live_evaluation_reservations r WHERE r.evaluation_id = p_evaluation_id
$$;

-- ── 6. Entry functions ──────────────────────────────────────────────────────────────────────────────

-- The preflight, before anything is read: the environment, the authorization and the document, as the result store will check them.
CREATE OR REPLACE FUNCTION public.creator_record_v2_live_evaluation_preflight(p_evaluation_id text, p_operator uuid, p_document_id uuid)
RETURNS TABLE (evaluation_id text, operator_user_id uuid, environment_ref text, provider text, model text, profile_id text, profile_version integer,
               max_attempts integer, max_spend_micro_usd bigint, attempt_reserve_micro_usd bigint, created_at timestamptz, expires_at timestamptz,
               document_id uuid, document_sha256 text, authority_reference text, spent_micro_usd bigint, reservations_used integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_auth  public.creator_record_v2_live_evaluation_authorizations%ROWTYPE;
  v_perm  public.creator_record_v2_live_evaluation_documents%ROWTYPE;
  v_spent bigint;
  v_used  integer;
BEGIN
  v_auth := public.creator_record_v2_live_evaluation_authority(p_evaluation_id, p_operator, p_document_id);
  SELECT * INTO v_perm FROM public.creator_record_v2_live_evaluation_documents e WHERE e.evaluation_id = p_evaluation_id AND e.document_id = p_document_id;
  SELECT s.spent_micro_usd, s.reservations_used INTO v_spent, v_used FROM public.creator_record_v2_live_evaluation_spent(p_evaluation_id) s;
  RETURN QUERY SELECT v_auth.evaluation_id, v_auth.operator_user_id, v_auth.environment_ref, v_auth.provider, v_auth.model, v_auth.profile_id, v_auth.profile_version,
    v_auth.max_attempts, v_auth.max_spend_micro_usd, v_auth.attempt_reserve_micro_usd, v_auth.created_at, v_auth.expires_at,
    v_perm.document_id, v_perm.document_sha256::text, v_perm.authority_reference, v_spent, v_used;
END;
$$;

-- The reservation, just before the first model call, under one lock per evaluation: concurrent attempts cannot together exceed a ceiling.
CREATE OR REPLACE FUNCTION public.creator_record_v2_live_evaluation_reserve(p_evaluation_id text, p_operator uuid, p_document_id uuid)
RETURNS TABLE (reservation_id uuid, reserved_micro_usd bigint)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_auth  public.creator_record_v2_live_evaluation_authorizations%ROWTYPE;
  v_spent bigint;
  v_used  integer;
  v_id    uuid;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('si8.cr_v2_live_eval:' || coalesce(p_evaluation_id, ''), 0));
  v_auth := public.creator_record_v2_live_evaluation_authority(p_evaluation_id, p_operator, p_document_id);
  IF EXISTS (SELECT 1 FROM public.creator_record_v2_live_evaluation_attempts a WHERE a.evaluation_id = p_evaluation_id AND a.document_id = p_document_id
             AND a.profile_id = v_auth.profile_id AND a.outcome_status = 'examined') THEN
    RAISE EXCEPTION 'live_evaluation_reading_exists' USING ERRCODE = 'P0001';
  END IF;
  IF EXISTS (SELECT 1 FROM public.creator_record_v2_live_evaluation_attempts a WHERE a.evaluation_id = p_evaluation_id AND a.document_id = p_document_id
             AND a.profile_id = v_auth.profile_id AND a.outcome_reason IN ('unsupported_format', 'file_too_large', 'empty_file')) THEN
    RAISE EXCEPTION 'live_evaluation_not_retryable' USING ERRCODE = 'P0001';
  END IF;
  -- Every reservation is an attempt, stored or not: a crashed one still counts.
  IF (SELECT count(*) FROM public.creator_record_v2_live_evaluation_reservations r WHERE r.evaluation_id = p_evaluation_id AND r.document_id = p_document_id) >= 3 THEN
    RAISE EXCEPTION 'live_evaluation_attempts_exhausted' USING ERRCODE = 'P0001';
  END IF;
  SELECT s.spent_micro_usd, s.reservations_used INTO v_spent, v_used FROM public.creator_record_v2_live_evaluation_spent(p_evaluation_id) s;
  IF v_used >= v_auth.max_attempts THEN RAISE EXCEPTION 'live_evaluation_attempts_exhausted' USING ERRCODE = 'P0001'; END IF;
  IF v_spent + v_auth.attempt_reserve_micro_usd > v_auth.max_spend_micro_usd THEN RAISE EXCEPTION 'live_evaluation_budget_exhausted' USING ERRCODE = 'P0001'; END IF;
  INSERT INTO public.creator_record_v2_live_evaluation_reservations (evaluation_id, document_id, operator_user_id, sequence, reserved_micro_usd)
  VALUES (p_evaluation_id, p_document_id, p_operator, v_used + 1, v_auth.attempt_reserve_micro_usd)
  RETURNING id INTO v_id;
  RETURN QUERY SELECT v_id, v_auth.attempt_reserve_micro_usd;
END;
$$;

-- Settling records what was reported. It can only add cost: the charge is never below the reservation.
CREATE OR REPLACE FUNCTION public.creator_record_v2_live_evaluation_settle(p_reservation_id uuid, p_requests integer, p_input_tokens bigint, p_output_tokens bigint, p_usage_complete boolean, p_estimated_micro_usd bigint)
RETURNS bigint
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_res public.creator_record_v2_live_evaluation_reservations%ROWTYPE;
  v_charge bigint;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.creator_record_v2_live_evaluation_environment WHERE singleton) THEN
    RAISE EXCEPTION 'live_evaluation_environment_not_established' USING ERRCODE = 'P0001';
  END IF;
  SELECT * INTO v_res FROM public.creator_record_v2_live_evaluation_reservations r WHERE r.id = p_reservation_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'live_evaluation_reservation_not_found' USING ERRCODE = 'P0001'; END IF;
  IF v_res.settled_at IS NOT NULL THEN RAISE EXCEPTION 'live_evaluation_reservation_settled' USING ERRCODE = 'P0001'; END IF;
  IF p_requests IS NULL OR p_requests NOT BETWEEN 0 AND 2 OR p_input_tokens IS NULL OR p_input_tokens < 0 OR p_output_tokens IS NULL OR p_output_tokens < 0
     OR p_usage_complete IS NULL OR p_estimated_micro_usd IS NULL OR p_estimated_micro_usd < 0 THEN
    RAISE EXCEPTION 'live_evaluation_settlement_invalid' USING ERRCODE = 'P0001';
  END IF;
  v_charge := greatest(v_res.reserved_micro_usd, p_estimated_micro_usd);
  UPDATE public.creator_record_v2_live_evaluation_reservations
     SET settled_at = now(), requests = p_requests, input_tokens = p_input_tokens, output_tokens = p_output_tokens,
         usage_complete = p_usage_complete, estimated_micro_usd = p_estimated_micro_usd, charged_micro_usd = v_charge
   WHERE id = p_reservation_id;
  RETURN v_charge;
END;
$$;

-- The one write of a live result.
CREATE OR REPLACE FUNCTION public.creator_record_v2_live_evaluation_record(p_reservation_id uuid, p_access_log_id bigint, p_envelope text)
RETURNS TABLE (attempt_id uuid, result text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_env      jsonb;
  v_res      public.creator_record_v2_live_evaluation_reservations%ROWTYPE;
  v_auth     public.creator_record_v2_live_evaluation_authorizations%ROWTYPE;
  v_log      public.creator_record_v2_evidence_access_log%ROWTYPE;
  v_doc      public.creator_record_v2_documents%ROWTYPE;
  v_reading  public.creator_record_v2_live_evaluation_attempts%ROWTYPE;
  v_key      text;
  v_attempts integer;
  v_id       uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.creator_record_v2_live_evaluation_environment WHERE singleton) THEN
    RAISE EXCEPTION 'live_evaluation_environment_not_established' USING ERRCODE = 'P0001';
  END IF;

  -- (a) The reservation: unsettled, unused, recent. Its authority is checked again now, so a revoked or expired one stores nothing.
  SELECT * INTO v_res FROM public.creator_record_v2_live_evaluation_reservations r WHERE r.id = p_reservation_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'live_evaluation_reservation_not_found' USING ERRCODE = 'P0001'; END IF;
  IF v_res.settled_at IS NOT NULL OR v_res.created_at < now() - interval '15 minutes'
     OR EXISTS (SELECT 1 FROM public.creator_record_v2_live_evaluation_attempts a WHERE a.reservation_id = v_res.id) THEN
    RAISE EXCEPTION 'live_evaluation_reservation_settled' USING ERRCODE = 'P0001';
  END IF;
  v_auth := public.creator_record_v2_live_evaluation_authority(v_res.evaluation_id, v_res.operator_user_id, v_res.document_id);

  -- (b) Envelope v3, live shape only: exact keys at every level, closed vocabularies, typed scalars.
  IF p_envelope IS NULL OR length(p_envelope) NOT BETWEEN 2 AND 262144 THEN
    RAISE EXCEPTION 'live_evaluation_envelope_invalid' USING ERRCODE = 'P0001';
  END IF;
  BEGIN
    v_env := p_envelope::jsonb;
  EXCEPTION WHEN others THEN
    RAISE EXCEPTION 'live_evaluation_envelope_invalid' USING ERRCODE = 'P0001';
  END;
  IF NOT coalesce(
       public.creator_record_v2_jsonb_exact_keys(v_env, ARRAY['envelope', 'examination_key', 'identity', 'execution_origin', 'executed_at', 'document', 'content_class', 'workflow_authorization', 'profile', 'executor', 'outcome', 'observations', 'limitations', 'provenance'])
       AND public.creator_record_v2_jsonb_exact_keys(v_env -> 'envelope', ARRAY['id', 'version'])
       AND public.creator_record_v2_jsonb_exact_keys(v_env -> 'document', ARRAY['document_id', 'sha256', 'media_type', 'byte_size'])
       AND public.creator_record_v2_jsonb_exact_keys(v_env -> 'profile', ARRAY['id', 'version', 'schema', 'prompt'])
       AND public.creator_record_v2_jsonb_exact_keys(v_env -> 'executor', ARRAY['mode', 'provider', 'model'])
       AND public.creator_record_v2_jsonb_exact_keys(v_env -> 'outcome', ARRAY['status', 'reason'])
       AND public.creator_record_v2_jsonb_exact_keys(v_env -> 'provenance', ARRAY['integrity', 'model_calls', 'prompt_sent', 'input_tokens', 'output_tokens', 'provider_response_id'])
       AND jsonb_typeof(v_env -> 'observations') = 'array'
       AND jsonb_typeof(v_env -> 'limitations') = 'array'
       AND v_env #>> '{envelope,id}' = 'si8/creator-record-v2-examination'
       AND v_env #> '{envelope,version}' = '3'::jsonb
       AND v_env ->> 'identity' = 'execution_key'
       AND v_env ->> 'execution_origin' = 'live_model'
       AND v_env ->> 'content_class' = 'customer_document'
       AND v_env ->> 'workflow_authorization' = 'not_established'
       AND jsonb_typeof(v_env -> 'examination_key') = 'string' AND v_env ->> 'examination_key' ~ '^[0-9a-f]{64}$'
       AND jsonb_typeof(v_env -> 'executed_at') = 'string' AND v_env ->> 'executed_at' ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{3}Z$'
       AND v_env #>> '{document,document_id}' = v_res.document_id::text
       AND jsonb_typeof(v_env #> '{document,sha256}') = 'string' AND v_env #>> '{document,sha256}' ~ '^[0-9a-f]{64}$'
       AND v_env #>> '{document,media_type}' IN ('application/pdf', 'image/png', 'image/jpeg')
       AND jsonb_typeof(v_env #> '{document,byte_size}') = 'number' AND v_env #>> '{document,byte_size}' ~ '^[1-9][0-9]{0,8}$'
       AND v_env #>> '{profile,id}' = v_auth.profile_id
       AND v_env #> '{profile,version}' = to_jsonb(v_auth.profile_version)
       AND jsonb_typeof(v_env #> '{profile,schema}') = 'string' AND v_env #>> '{profile,schema}' ~ '^[a-z0-9][a-z0-9._-]{0,99}$'
       AND jsonb_typeof(v_env #> '{profile,prompt}') = 'string' AND v_env #>> '{profile,prompt}' ~ '^[a-z0-9][a-z0-9._-]{0,99}$'
       AND v_env #>> '{executor,mode}' = 'live_model'
       AND v_env #>> '{executor,provider}' = 'anthropic'
       AND v_env #>> '{executor,model}' = v_auth.model
       AND v_env #>> '{provenance,integrity}' = 'sha256_size_and_type_rechecked'
       AND jsonb_typeof(v_env #> '{provenance,model_calls}') = 'number' AND v_env #>> '{provenance,model_calls}' IN ('0', '1', '2')
       AND jsonb_typeof(v_env #> '{provenance,prompt_sent}') = 'boolean' AND (v_env #>> '{provenance,prompt_sent}')::boolean = (v_env #>> '{provenance,model_calls}' <> '0')
       AND jsonb_typeof(v_env #> '{provenance,input_tokens}') = 'number' AND v_env #>> '{provenance,input_tokens}' ~ '^[0-9]{1,9}$'
       AND jsonb_typeof(v_env #> '{provenance,output_tokens}') = 'number' AND v_env #>> '{provenance,output_tokens}' ~ '^[0-9]{1,9}$'
       AND (v_env #> '{provenance,provider_response_id}' = 'null'::jsonb
            OR (jsonb_typeof(v_env #> '{provenance,provider_response_id}') = 'string' AND length(v_env #>> '{provenance,provider_response_id}') BETWEEN 1 AND 200
                AND v_env #>> '{provenance,provider_response_id}' !~ '^mock-'))
       AND ((v_env #>> '{outcome,status}' = 'examined' AND v_env #> '{outcome,reason}' = 'null'::jsonb
             AND v_env #>> '{provenance,model_calls}' <> '0' AND jsonb_typeof(v_env #> '{provenance,provider_response_id}') = 'string')
            OR (v_env #>> '{outcome,status}' = 'could_not_examine'
                AND v_env #>> '{outcome,reason}' IN ('unsupported_format', 'file_too_large', 'empty_file', 'model_timeout', 'provider_failure', 'structured_output_missing', 'schema_invalid')
                AND jsonb_array_length(v_env -> 'observations') = 0))
       AND (v_env -> 'limitations') @> '["observations_not_verified"]'::jsonb
       AND NOT (v_env -> 'limitations') @> '["mock_test_data_not_model_output"]'::jsonb, false) THEN
    RAISE EXCEPTION 'live_evaluation_envelope_invalid' USING ERRCODE = 'P0001';
  END IF;
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(v_env -> 'limitations') l
             WHERE jsonb_typeof(l) IS DISTINCT FROM 'string' OR l #>> '{}' NOT IN (
               'observations_not_verified', 'no_location_reference', 'fields_not_established', 'single_plan_reading_does_not_exclude_others',
               'multiple_plans_shown', 'instruction_like_text_present', 'not_a_billing_document', 'partially_legible', 'illegible'))
     OR (SELECT count(*) FROM jsonb_array_elements(v_env -> 'limitations')) <> (SELECT count(DISTINCT l) FROM jsonb_array_elements(v_env -> 'limitations') l) THEN
    RAISE EXCEPTION 'live_evaluation_envelope_invalid' USING ERRCODE = 'P0001';
  END IF;
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(v_env -> 'observations') o
             WHERE NOT coalesce(
                   public.creator_record_v2_jsonb_exact_keys(o, ARRAY['observation_id', 'field', 'qualifier', 'basis', 'status', 'value', 'excerpt', 'source', 'verification', 'origin'])
               AND public.creator_record_v2_jsonb_exact_keys(o -> 'source', ARRAY['document_sha256', 'location'])
               AND jsonb_typeof(o -> 'field') = 'string' AND length(o ->> 'field') BETWEEN 1 AND 100
               AND jsonb_typeof(o -> 'observation_id') = 'string'
               AND o ->> 'observation_id' = substr(v_env ->> 'examination_key', 1, 16) || ':' || (o ->> 'field') || ':' || substring(o ->> 'observation_id' FROM '[0-9]+$')
               AND o ->> 'observation_id' ~ ':[0-9]{1,4}$'
               AND jsonb_typeof(o -> 'qualifier') IN ('string', 'null')
               AND o ->> 'basis' IN ('printed_text', 'examiner_classification')
               AND o ->> 'status' IN ('present', 'not_shown', 'unreadable', 'ambiguous')
               AND ((o ->> 'status' = 'present' AND jsonb_typeof(o -> 'value') = 'string') OR (o ->> 'status' <> 'present' AND o -> 'value' = 'null'::jsonb))
               AND jsonb_typeof(o -> 'excerpt') IN ('string', 'null')
               AND o #>> '{source,document_sha256}' = v_env #>> '{document,sha256}'
               AND o #> '{source,location}' = 'null'::jsonb
               AND o ->> 'verification' = 'not_verified'
               AND o ->> 'origin' = 'live_model_extracted', false))
     OR (SELECT count(*) FROM jsonb_array_elements(v_env -> 'observations')) <> (SELECT count(DISTINCT o ->> 'observation_id') FROM jsonb_array_elements(v_env -> 'observations') o) THEN
    RAISE EXCEPTION 'live_evaluation_envelope_invalid' USING ERRCODE = 'P0001';
  END IF;

  -- (c) The key, recomputed from validated, escape-free fields in canonicalJson order.
  v_key := encode(sha256(convert_to(
    '{"document_id":"' || (v_env #>> '{document,document_id}')
    || '","envelope":{"id":"si8/creator-record-v2-examination","version":3},"executor":{"mode":"live_model","model":"' || v_auth.model || '","provider":"anthropic"}'
    || ',"profile":{"id":"' || (v_env #>> '{profile,id}') || '","prompt":"' || (v_env #>> '{profile,prompt}')
    || '","schema":"' || (v_env #>> '{profile,schema}') || '","version":' || (v_env #>> '{profile,version}')
    || '},"sha256":"' || (v_env #>> '{document,sha256}') || '"}', 'UTF8')), 'hex');
  IF v_key <> v_env ->> 'examination_key' THEN
    RAISE EXCEPTION 'live_evaluation_key_mismatch' USING ERRCODE = 'P0001';
  END IF;

  -- (d) The read: an examination read of this document by its owner (the operator), logged shortly before the reservation, used by nothing else.
  SELECT * INTO v_log FROM public.creator_record_v2_evidence_access_log l WHERE l.id = p_access_log_id FOR UPDATE;
  IF NOT FOUND OR v_log.purpose <> 'examination' OR v_log.actor_role <> 'owner' OR v_log.uat_grant_id IS NOT NULL
     OR v_log.actor_user_id <> v_res.operator_user_id OR v_log.document_id <> v_res.document_id
     OR v_log.accessed_at < v_res.created_at - interval '15 minutes' OR v_log.accessed_at > v_res.created_at + interval '1 minute'
     OR EXISTS (SELECT 1 FROM public.creator_record_v2_examination_runs r WHERE r.access_log_id = v_log.id)
     OR EXISTS (SELECT 1 FROM public.creator_record_v2_live_examination_attempts a WHERE a.access_log_id = v_log.id)
     OR EXISTS (SELECT 1 FROM public.creator_record_v2_live_evaluation_attempts a WHERE a.access_log_id = v_log.id) THEN
    RAISE EXCEPTION 'live_evaluation_access_not_logged' USING ERRCODE = 'P0001';
  END IF;
  IF (v_env ->> 'executed_at')::timestamptz < v_res.created_at - interval '1 minute' OR (v_env ->> 'executed_at')::timestamptz > now() + interval '1 minute' THEN
    RAISE EXCEPTION 'live_evaluation_envelope_invalid' USING ERRCODE = 'P0001';
  END IF;

  -- (e) The bytes the envelope names are the document's.
  SELECT * INTO v_doc FROM public.creator_record_v2_documents d WHERE d.id = v_res.document_id FOR SHARE;
  IF v_doc.sha256 <> v_env #>> '{document,sha256}' OR v_doc.byte_size::text <> v_env #>> '{document,byte_size}' OR v_doc.media_type <> v_env #>> '{document,media_type}' THEN
    RAISE EXCEPTION 'live_evaluation_document_mismatch' USING ERRCODE = 'P0001';
  END IF;

  -- (f) One reading per document and profile in this evaluation, first write wins; three attempts; file-dependent failures are final.
  PERFORM pg_advisory_xact_lock(hashtextextended('si8.cr_v2_live_eval_doc:' || v_res.evaluation_id || ':' || v_doc.id::text || ':' || v_auth.profile_id, 0));
  SELECT * INTO v_reading FROM public.creator_record_v2_live_evaluation_attempts a
   WHERE a.evaluation_id = v_res.evaluation_id AND a.document_id = v_doc.id AND a.profile_id = v_auth.profile_id AND a.outcome_status = 'examined';
  IF FOUND THEN
    RAISE EXCEPTION 'live_evaluation_conflict' USING ERRCODE = 'P0001';
  END IF;
  IF EXISTS (SELECT 1 FROM public.creator_record_v2_live_evaluation_attempts a
             WHERE a.evaluation_id = v_res.evaluation_id AND a.document_id = v_doc.id AND a.profile_id = v_auth.profile_id
               AND a.outcome_reason IN ('unsupported_format', 'file_too_large', 'empty_file')) THEN
    RAISE EXCEPTION 'live_evaluation_not_retryable' USING ERRCODE = 'P0001';
  END IF;
  SELECT count(*) INTO v_attempts FROM public.creator_record_v2_live_evaluation_attempts a
   WHERE a.evaluation_id = v_res.evaluation_id AND a.document_id = v_doc.id AND a.profile_id = v_auth.profile_id;
  IF v_attempts >= 3 THEN
    RAISE EXCEPTION 'live_evaluation_attempts_exhausted' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.creator_record_v2_live_evaluation_attempts (
    evaluation_id, reservation_id, attempt_number, examination_key, document_id, user_id, document_sha256, envelope_version, execution_origin, content_class,
    profile_id, profile_version, schema_version, prompt_version, executor_mode, provider, model,
    outcome_status, outcome_reason, executed_at, envelope_canonical, envelope_sha256, access_log_id)
  VALUES (
    v_res.evaluation_id, v_res.id, v_attempts + 1, v_key, v_doc.id, v_doc.user_id, v_doc.sha256, 3, 'live_model', 'customer_document',
    v_auth.profile_id, v_auth.profile_version, v_env #>> '{profile,schema}', v_env #>> '{profile,prompt}', 'live_model', 'anthropic', v_auth.model,
    v_env #>> '{outcome,status}', v_env #>> '{outcome,reason}', v_env ->> 'executed_at', p_envelope, encode(sha256(convert_to(p_envelope, 'UTF8')), 'hex'), v_log.id)
  RETURNING id INTO v_id;
  RETURN QUERY SELECT v_id, 'created'::text;
END;
$$;

-- ── 7. Grants: the service role reads and calls the four entry functions. It writes nothing directly. ────

ALTER TABLE public.creator_record_v2_live_evaluation_environment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_record_v2_live_evaluation_authorizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_record_v2_live_evaluation_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_record_v2_live_evaluation_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_record_v2_live_evaluation_attempts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.creator_record_v2_live_evaluation_environment, public.creator_record_v2_live_evaluation_authorizations,
  public.creator_record_v2_live_evaluation_documents, public.creator_record_v2_live_evaluation_reservations,
  public.creator_record_v2_live_evaluation_attempts FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON TABLE public.creator_record_v2_live_evaluation_authorizations, public.creator_record_v2_live_evaluation_documents,
  public.creator_record_v2_live_evaluation_reservations, public.creator_record_v2_live_evaluation_attempts TO service_role;
REVOKE ALL ON FUNCTION public.creator_record_v2_live_evaluation_authority(text, uuid, uuid), public.creator_record_v2_live_evaluation_spent(text),
  public.creator_record_v2_live_evaluation_preflight(text, uuid, uuid), public.creator_record_v2_live_evaluation_reserve(text, uuid, uuid),
  public.creator_record_v2_live_evaluation_settle(uuid, integer, bigint, bigint, boolean, bigint), public.creator_record_v2_live_evaluation_record(uuid, bigint, text),
  public.creator_record_v2_live_evaluation_authorization_guard(), public.creator_record_v2_live_evaluation_document_guard(),
  public.creator_record_v2_live_evaluation_reservation_guard() FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.creator_record_v2_live_evaluation_preflight(text, uuid, uuid), public.creator_record_v2_live_evaluation_reserve(text, uuid, uuid),
  public.creator_record_v2_live_evaluation_settle(uuid, integer, bigint, bigint, boolean, bigint), public.creator_record_v2_live_evaluation_record(uuid, bigint, text) TO service_role;
