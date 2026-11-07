-- CR-V2-MVP-M2A — customer live examination: durable storage, an access-log purpose, and a per-creator cost ledger.
--
-- NOT APPLIED ANYWHERE. Tested on disposable local PostgreSQL only. Applying it to any project, and in particular Production, is a
-- separate, explicitly authorized step; applying it alone enables nothing.
--
-- What it adds (additive: no existing row, function or trigger is replaced):
--   * an ENABLEMENT row (singleton, operator-established, never writable by an API role). Without it every function below refuses,
--     and no `live_examination` read can be logged. It also holds the per-creator limits, each bounded by a CHECK;
--   * a RESERVATION ledger: one row per live attempt, taken before any model call, bound to one logged read, never deleted, settled
--     once. Spend is counted as the larger of what was reserved and what was charged, so a crash costs its full reservation;
--   * a second shape on the 1A attempts table: `live_model` / `customer_document` / `anthropic`, always with its reservation. The
--     `mock_test` shape is unchanged; nothing mixes;
--   * the access-log purpose `live_examination`, checked by its own trigger (the existing guard passes other purposes through);
--   * three functions, executable by service_role only: reserve, record, settle.
--
-- What it does NOT do: allow a known synthetic fixture to be examined as live; store anything for a document that is not the
-- owner's own stored upload; let a second reading or a fourth attempt exist; let a reservation be reused; trust the application's
-- limits (the database re-checks every one under a per-creator lock).

DO $pre$
BEGIN
  IF to_regclass('public.creator_record_v2_live_examination_attempts') IS NULL THEN
    RAISE EXCEPTION '20261110000000 requires 20261108000000' USING ERRCODE = 'P0001';
  END IF;
END
$pre$;

-- ── 1. Enablement and its limits ──────────────────────────────────────────────────────────────────────

CREATE TABLE public.creator_record_v2_customer_live_enablement (
  singleton                          boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  supabase_project_ref               text NOT NULL CHECK (supabase_project_ref ~ '^[a-z0-9]{20}$'),
  max_attempts_per_creator_per_day   integer NOT NULL CHECK (max_attempts_per_creator_per_day BETWEEN 1 AND 24),
  max_spend_micro_usd_per_creator    integer NOT NULL CHECK (max_spend_micro_usd_per_creator BETWEEN 1 AND 5000000),
  max_reserve_micro_usd_per_attempt  integer NOT NULL CHECK (max_reserve_micro_usd_per_attempt BETWEEN 1 AND 1000000),
  established_by                     text NOT NULL CHECK (length(trim(established_by)) BETWEEN 1 AND 200),
  reason                             text NOT NULL CHECK (length(trim(reason)) BETWEEN 1 AND 500),
  created_at                         timestamptz NOT NULL DEFAULT now()
);

-- Deleting the row switches customer live examination off. Changing it is not possible: delete and establish again.
CREATE OR REPLACE FUNCTION public.creator_record_v2_customer_live_enablement_guard()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'the customer live examination enablement is not changed in place' USING ERRCODE = 'P0001';
END;
$$;
CREATE TRIGGER creator_record_v2_customer_live_enablement_guard
  BEFORE UPDATE ON public.creator_record_v2_customer_live_enablement
  FOR EACH ROW EXECUTE FUNCTION public.creator_record_v2_customer_live_enablement_guard();

-- ── 2. The reservation ledger ─────────────────────────────────────────────────────────────────────────

ALTER TABLE public.creator_record_v2_evidence_access_log DROP CONSTRAINT creator_record_v2_evidence_access_log_purpose_check;
ALTER TABLE public.creator_record_v2_evidence_access_log
  ADD CONSTRAINT creator_record_v2_evidence_access_log_purpose_check CHECK (purpose IN ('file_download', 'examination', 'live_examination'));

CREATE TABLE public.creator_record_v2_customer_live_reservations (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  document_id         uuid NOT NULL REFERENCES public.creator_record_v2_documents(id) ON DELETE RESTRICT,
  profile_id          text NOT NULL CHECK (profile_id ~ '^[a-z][a-z0-9_-]{0,39}$'),
  attempt_number      integer NOT NULL CHECK (attempt_number BETWEEN 1 AND 3),
  access_log_id       bigint NOT NULL UNIQUE REFERENCES public.creator_record_v2_evidence_access_log(id) ON DELETE RESTRICT,
  input_tokens_bound  integer NOT NULL CHECK (input_tokens_bound BETWEEN 1 AND 60000),
  reserved_micro_usd  integer NOT NULL CHECK (reserved_micro_usd >= 1),
  created_at          timestamptz NOT NULL DEFAULT now(),
  attempt_id          uuid UNIQUE,
  charged_micro_usd   integer CHECK (charged_micro_usd BETWEEN 0 AND 100000000),
  settled_at          timestamptz,
  CHECK ((charged_micro_usd IS NULL) = (settled_at IS NULL))
);
CREATE INDEX creator_record_v2_customer_live_reservations_owner ON public.creator_record_v2_customer_live_reservations (user_id, created_at);
CREATE INDEX creator_record_v2_customer_live_reservations_document ON public.creator_record_v2_customer_live_reservations (document_id, profile_id);

-- Never deleted. A reservation's terms never change; its attempt and its settlement are each set once.
CREATE OR REPLACE FUNCTION public.creator_record_v2_customer_live_reservations_guard()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'a live examination reservation is never deleted' USING ERRCODE = 'P0001';
  END IF;
  IF (NEW.id, NEW.user_id, NEW.document_id, NEW.profile_id, NEW.attempt_number, NEW.access_log_id, NEW.input_tokens_bound, NEW.reserved_micro_usd, NEW.created_at)
     IS DISTINCT FROM (OLD.id, OLD.user_id, OLD.document_id, OLD.profile_id, OLD.attempt_number, OLD.access_log_id, OLD.input_tokens_bound, OLD.reserved_micro_usd, OLD.created_at)
     OR (OLD.attempt_id IS NOT NULL AND NEW.attempt_id IS DISTINCT FROM OLD.attempt_id)
     OR (OLD.settled_at IS NOT NULL AND (NEW.charged_micro_usd, NEW.settled_at) IS DISTINCT FROM (OLD.charged_micro_usd, OLD.settled_at)) THEN
    RAISE EXCEPTION 'a live examination reservation is changed only by being recorded or settled, once' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER creator_record_v2_customer_live_reservations_guard
  BEFORE UPDATE OR DELETE ON public.creator_record_v2_customer_live_reservations
  FOR EACH ROW EXECUTE FUNCTION public.creator_record_v2_customer_live_reservations_guard();

-- ── 3. The live shape on the attempts table ───────────────────────────────────────────────────────────

-- The five single-value CHECKs of 20261108000000 (their generated names are truncated, so they are found by definition: exactly five).
DO $drop$
DECLARE
  v_names text[];
  v_name  text;
BEGIN
  SELECT array_agg(conname ORDER BY conname) INTO v_names FROM pg_constraint
   WHERE conrelid = 'public.creator_record_v2_live_examination_attempts'::regclass AND contype = 'c'
     AND pg_get_constraintdef(oid) IN (
       'CHECK ((execution_origin = ''mock_test''::text))', 'CHECK ((content_class = ''known_synthetic_fixture''::text))',
       'CHECK ((executor_mode = ''mock_test''::text))', 'CHECK ((provider = ''test_double''::text))', 'CHECK ((model = ''mock-model-test-only''::text))');
  IF coalesce(array_length(v_names, 1), 0) <> 5 THEN
    RAISE EXCEPTION '20261110000000: the 20261108000000 single-value CHECKs were not found as expected' USING ERRCODE = 'P0001';
  END IF;
  FOREACH v_name IN ARRAY v_names LOOP
    EXECUTE format('ALTER TABLE public.creator_record_v2_live_examination_attempts DROP CONSTRAINT %I', v_name);
  END LOOP;
END
$drop$;

ALTER TABLE public.creator_record_v2_live_examination_attempts
  ADD COLUMN reservation_id uuid UNIQUE REFERENCES public.creator_record_v2_customer_live_reservations(id) ON DELETE RESTRICT,
  ADD CONSTRAINT creator_record_v2_live_examination_attempts_shape_check CHECK (
    (execution_origin = 'mock_test' AND content_class = 'known_synthetic_fixture' AND executor_mode = 'mock_test'
       AND provider = 'test_double' AND model = 'mock-model-test-only' AND reservation_id IS NULL)
    OR (execution_origin = 'live_model' AND content_class = 'customer_document' AND executor_mode = 'live_model' AND provider = 'anthropic'
       AND model ~ '^[a-z0-9][a-z0-9._-]{0,99}$' AND model !~* '(mock|test|fixture|synthetic|double)' AND reservation_id IS NOT NULL));

ALTER TABLE public.creator_record_v2_customer_live_reservations
  ADD CONSTRAINT creator_record_v2_customer_live_reservations_attempt_fk
  FOREIGN KEY (attempt_id) REFERENCES public.creator_record_v2_live_examination_attempts(id) ON DELETE RESTRICT;

-- ── 4. A live examination read is logged only for an owner's own stored upload, while enabled ─────────

CREATE OR REPLACE FUNCTION public.creator_record_v2_evidence_access_log_live_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF NEW.purpose <> 'live_examination' THEN
    RETURN NEW;
  END IF;
  NEW.accessed_at := now();
  NEW.uat_grant_id := NULL;
  IF NOT EXISTS (SELECT 1 FROM public.creator_record_v2_customer_live_enablement WHERE singleton) THEN
    RAISE EXCEPTION 'customer_live_examination_not_enabled' USING ERRCODE = 'P0001';
  END IF;
  IF NEW.actor_role <> 'owner' OR NOT EXISTS (
       SELECT 1 FROM public.creator_record_v2_documents d
       WHERE d.id = NEW.document_id AND d.user_id = NEW.actor_user_id AND d.state = 'stored'
         AND d.origin = 'owner_upload' AND d.seed_grant_id IS NULL) THEN
    RAISE EXCEPTION 'customer_live_read_target_mismatch' USING ERRCODE = 'P0001';
  END IF;
  IF EXISTS (SELECT 1 FROM public.creator_record_v2_documents d JOIN public.creator_record_v2_synthetic_fixtures f ON f.sha256 = d.sha256 WHERE d.id = NEW.document_id) THEN
    RAISE EXCEPTION 'customer_live_refuses_known_fixture' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER creator_record_v2_evidence_access_log_live_guard
  BEFORE INSERT ON public.creator_record_v2_evidence_access_log
  FOR EACH ROW EXECUTE FUNCTION public.creator_record_v2_evidence_access_log_live_guard();

-- ── 5. Reserve: before the first model request of an attempt ──────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.creator_record_v2_reserve_customer_live_examination(p_access_log_id bigint, p_profile_id text, p_input_tokens integer, p_reserved_micro_usd integer)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_en     public.creator_record_v2_customer_live_enablement%ROWTYPE;
  v_log    public.creator_record_v2_evidence_access_log%ROWTYPE;
  v_doc    public.creator_record_v2_documents%ROWTYPE;
  v_used   integer;
  v_day    integer;
  v_spent  bigint;
  v_id     uuid;
BEGIN
  SELECT * INTO v_en FROM public.creator_record_v2_customer_live_enablement WHERE singleton;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'customer_live_examination_not_enabled' USING ERRCODE = 'P0001';
  END IF;
  IF p_profile_id IS NULL OR p_profile_id !~ '^[a-z][a-z0-9_-]{0,39}$' OR p_input_tokens IS NULL OR p_input_tokens NOT BETWEEN 1 AND 60000
     OR p_reserved_micro_usd IS NULL OR p_reserved_micro_usd NOT BETWEEN 1 AND v_en.max_reserve_micro_usd_per_attempt THEN
    RAISE EXCEPTION 'customer_live_reservation_invalid' USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO v_log FROM public.creator_record_v2_evidence_access_log l WHERE l.id = p_access_log_id FOR UPDATE;
  IF NOT FOUND OR v_log.purpose <> 'live_examination' OR v_log.actor_role <> 'owner'
     OR v_log.accessed_at < now() - interval '15 minutes' OR v_log.accessed_at > now()
     OR EXISTS (SELECT 1 FROM public.creator_record_v2_customer_live_reservations r WHERE r.access_log_id = v_log.id) THEN
    RAISE EXCEPTION 'customer_live_access_not_logged' USING ERRCODE = 'P0001';
  END IF;
  SELECT * INTO v_doc FROM public.creator_record_v2_documents d WHERE d.id = v_log.document_id FOR SHARE;
  IF NOT FOUND OR v_doc.state <> 'stored' OR v_doc.user_id <> v_log.actor_user_id OR v_doc.origin <> 'owner_upload' OR v_doc.seed_grant_id IS NOT NULL THEN
    RAISE EXCEPTION 'customer_live_read_target_mismatch' USING ERRCODE = 'P0001';
  END IF;

  -- One creator's reservations are taken one at a time, so no two can pass the limits together.
  PERFORM pg_advisory_xact_lock(hashtextextended('si8.cr_v2_customer_live:' || v_doc.user_id::text, 0));

  IF EXISTS (SELECT 1 FROM public.creator_record_v2_live_examination_attempts a WHERE a.document_id = v_doc.id AND a.profile_id = p_profile_id AND a.outcome_status = 'examined') THEN
    RAISE EXCEPTION 'customer_live_examination_held' USING ERRCODE = 'P0001';
  END IF;
  IF EXISTS (SELECT 1 FROM public.creator_record_v2_live_examination_attempts a WHERE a.document_id = v_doc.id AND a.profile_id = p_profile_id
             AND a.outcome_reason IN ('unsupported_format', 'file_too_large', 'empty_file')) THEN
    RAISE EXCEPTION 'customer_live_examination_not_retryable' USING ERRCODE = 'P0001';
  END IF;
  -- An attempt still running for this document: no second one in parallel.
  IF EXISTS (SELECT 1 FROM public.creator_record_v2_customer_live_reservations r WHERE r.document_id = v_doc.id AND r.profile_id = p_profile_id
             AND r.attempt_id IS NULL AND r.settled_at IS NULL AND r.created_at > now() - interval '15 minutes') THEN
    RAISE EXCEPTION 'customer_live_examination_in_progress' USING ERRCODE = 'P0001';
  END IF;
  -- Every reservation counts, recorded or not: an attempt that crashed before it was stored still used one of the three.
  SELECT count(*) INTO v_used FROM public.creator_record_v2_customer_live_reservations r WHERE r.document_id = v_doc.id AND r.profile_id = p_profile_id;
  IF v_used >= 3 THEN
    RAISE EXCEPTION 'customer_live_examination_attempts_exhausted' USING ERRCODE = 'P0001';
  END IF;
  SELECT count(*) INTO v_day FROM public.creator_record_v2_customer_live_reservations r WHERE r.user_id = v_doc.user_id AND r.created_at > now() - interval '24 hours';
  IF v_day >= v_en.max_attempts_per_creator_per_day THEN
    RAISE EXCEPTION 'customer_live_examination_daily_limit' USING ERRCODE = 'P0001';
  END IF;
  SELECT coalesce(sum(greatest(r.reserved_micro_usd, coalesce(r.charged_micro_usd, 0))), 0) INTO v_spent
    FROM public.creator_record_v2_customer_live_reservations r WHERE r.user_id = v_doc.user_id;
  IF v_spent + p_reserved_micro_usd > v_en.max_spend_micro_usd_per_creator THEN
    RAISE EXCEPTION 'customer_live_examination_spend_limit' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.creator_record_v2_customer_live_reservations (user_id, document_id, profile_id, attempt_number, access_log_id, input_tokens_bound, reserved_micro_usd)
  VALUES (v_doc.user_id, v_doc.id, p_profile_id, v_used + 1, v_log.id, p_input_tokens, p_reserved_micro_usd)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- ── 6. Record: the attempt, against its own reservation ───────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.creator_record_v2_record_customer_live_examination(p_reservation_id uuid, p_envelope text)
RETURNS TABLE (attempt_id uuid, result text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_res       public.creator_record_v2_customer_live_reservations%ROWTYPE;
  v_env       jsonb;
  v_log       public.creator_record_v2_evidence_access_log%ROWTYPE;
  v_doc       public.creator_record_v2_documents%ROWTYPE;
  v_reading   public.creator_record_v2_live_examination_attempts%ROWTYPE;
  v_key       text;
  v_attempts  integer;
  v_id        uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.creator_record_v2_customer_live_enablement WHERE singleton) THEN
    RAISE EXCEPTION 'customer_live_examination_not_enabled' USING ERRCODE = 'P0001';
  END IF;
  SELECT * INTO v_res FROM public.creator_record_v2_customer_live_reservations r WHERE r.id = p_reservation_id FOR UPDATE;
  IF NOT FOUND OR v_res.attempt_id IS NOT NULL OR v_res.settled_at IS NOT NULL THEN
    RAISE EXCEPTION 'customer_live_reservation_invalid' USING ERRCODE = 'P0001';
  END IF;

  -- Envelope v3, live shape: exact keys at every level, closed vocabularies, typed scalars.
  IF p_envelope IS NULL OR length(p_envelope) NOT BETWEEN 2 AND 262144 THEN
    RAISE EXCEPTION 'customer_live_envelope_invalid' USING ERRCODE = 'P0001';
  END IF;
  BEGIN
    v_env := p_envelope::jsonb;
  EXCEPTION WHEN others THEN
    RAISE EXCEPTION 'customer_live_envelope_invalid' USING ERRCODE = 'P0001';
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
       AND jsonb_typeof(v_env #> '{document,document_id}') = 'string' AND v_env #>> '{document,document_id}' ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
       AND jsonb_typeof(v_env #> '{document,sha256}') = 'string' AND v_env #>> '{document,sha256}' ~ '^[0-9a-f]{64}$'
       AND v_env #>> '{document,media_type}' IN ('application/pdf', 'image/png', 'image/jpeg')
       AND jsonb_typeof(v_env #> '{document,byte_size}') = 'number' AND v_env #>> '{document,byte_size}' ~ '^[1-9][0-9]{0,8}$'
       AND jsonb_typeof(v_env #> '{profile,id}') = 'string' AND v_env #>> '{profile,id}' = v_res.profile_id
       AND jsonb_typeof(v_env #> '{profile,version}') = 'number' AND v_env #>> '{profile,version}' ~ '^[1-9][0-9]{0,8}$'
       AND jsonb_typeof(v_env #> '{profile,schema}') = 'string' AND v_env #>> '{profile,schema}' ~ '^[a-z0-9][a-z0-9._-]{0,99}$'
       AND jsonb_typeof(v_env #> '{profile,prompt}') = 'string' AND v_env #>> '{profile,prompt}' ~ '^[a-z0-9][a-z0-9._-]{0,99}$'
       AND v_env #>> '{executor,mode}' = 'live_model'
       AND v_env #>> '{executor,provider}' = 'anthropic'
       AND jsonb_typeof(v_env #> '{executor,model}') = 'string' AND v_env #>> '{executor,model}' ~ '^[a-z0-9][a-z0-9._-]{0,99}$'
       AND v_env #>> '{executor,model}' !~* '(mock|test|fixture|synthetic|double)'
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
    RAISE EXCEPTION 'customer_live_envelope_invalid' USING ERRCODE = 'P0001';
  END IF;
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(v_env -> 'limitations') l
             WHERE jsonb_typeof(l) IS DISTINCT FROM 'string' OR l #>> '{}' NOT IN (
               'observations_not_verified', 'no_location_reference', 'fields_not_established', 'single_plan_reading_does_not_exclude_others',
               'multiple_plans_shown', 'instruction_like_text_present', 'not_a_billing_document', 'partially_legible', 'illegible'))
     OR (SELECT count(*) FROM jsonb_array_elements(v_env -> 'limitations')) <> (SELECT count(DISTINCT l) FROM jsonb_array_elements(v_env -> 'limitations') l) THEN
    RAISE EXCEPTION 'customer_live_envelope_invalid' USING ERRCODE = 'P0001';
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
    RAISE EXCEPTION 'customer_live_envelope_invalid' USING ERRCODE = 'P0001';
  END IF;

  -- The key, recomputed from the validated, escape-free fields in canonicalJson order (the model is a restricted identifier).
  v_key := encode(sha256(convert_to(
    '{"document_id":"' || (v_env #>> '{document,document_id}')
    || '","envelope":{"id":"si8/creator-record-v2-examination","version":3},"executor":{"mode":"live_model","model":"' || (v_env #>> '{executor,model}') || '","provider":"anthropic"}'
    || ',"profile":{"id":"' || (v_env #>> '{profile,id}') || '","prompt":"' || (v_env #>> '{profile,prompt}')
    || '","schema":"' || (v_env #>> '{profile,schema}') || '","version":' || (v_env #>> '{profile,version}')
    || '},"sha256":"' || (v_env #>> '{document,sha256}') || '"}', 'UTF8')), 'hex');
  IF v_key <> v_env ->> 'examination_key' THEN
    RAISE EXCEPTION 'customer_live_key_mismatch' USING ERRCODE = 'P0001';
  END IF;

  -- The reservation's own logged read: this document, its owner, the attempt finished after it.
  SELECT * INTO v_log FROM public.creator_record_v2_evidence_access_log l WHERE l.id = v_res.access_log_id;
  IF NOT FOUND OR v_log.purpose <> 'live_examination' OR v_log.document_id <> v_res.document_id OR v_log.actor_user_id <> v_res.user_id
     OR v_log.document_id::text <> v_env #>> '{document,document_id}'
     OR (v_env ->> 'executed_at')::timestamptz < v_log.accessed_at - interval '1 minute' OR (v_env ->> 'executed_at')::timestamptz > now() + interval '1 minute' THEN
    RAISE EXCEPTION 'customer_live_document_mismatch' USING ERRCODE = 'P0001';
  END IF;
  SELECT * INTO v_doc FROM public.creator_record_v2_documents d WHERE d.id = v_res.document_id FOR SHARE;
  IF NOT FOUND OR v_doc.state <> 'stored' OR v_doc.user_id <> v_res.user_id OR v_doc.origin <> 'owner_upload' OR v_doc.seed_grant_id IS NOT NULL
     OR v_doc.sha256 <> v_env #>> '{document,sha256}' OR v_doc.byte_size::text <> v_env #>> '{document,byte_size}' OR v_doc.media_type <> v_env #>> '{document,media_type}' THEN
    RAISE EXCEPTION 'customer_live_document_mismatch' USING ERRCODE = 'P0001';
  END IF;
  IF EXISTS (SELECT 1 FROM public.creator_record_v2_synthetic_fixtures f WHERE f.sha256 = v_doc.sha256) THEN
    RAISE EXCEPTION 'customer_live_refuses_known_fixture' USING ERRCODE = 'P0001';
  END IF;

  -- The same lock and rules as 20261108000000: one reading, first write wins, three attempts, file-dependent failures are final.
  PERFORM pg_advisory_xact_lock(hashtextextended('si8.cr_v2_live_exam:' || v_doc.id::text || ':' || (v_env #>> '{profile,id}'), 0));
  SELECT * INTO v_reading FROM public.creator_record_v2_live_examination_attempts a
   WHERE a.document_id = v_doc.id AND a.profile_id = v_env #>> '{profile,id}' AND a.outcome_status = 'examined';
  IF FOUND THEN
    RAISE EXCEPTION 'customer_live_conflict' USING ERRCODE = 'P0001';
  END IF;
  IF EXISTS (SELECT 1 FROM public.creator_record_v2_live_examination_attempts a
             WHERE a.document_id = v_doc.id AND a.profile_id = v_env #>> '{profile,id}'
               AND a.outcome_reason IN ('unsupported_format', 'file_too_large', 'empty_file')) THEN
    RAISE EXCEPTION 'customer_live_examination_not_retryable' USING ERRCODE = 'P0001';
  END IF;
  SELECT count(*) INTO v_attempts FROM public.creator_record_v2_live_examination_attempts a WHERE a.document_id = v_doc.id AND a.profile_id = v_env #>> '{profile,id}';
  IF v_attempts >= 3 THEN
    RAISE EXCEPTION 'customer_live_examination_attempts_exhausted' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.creator_record_v2_live_examination_attempts (
    attempt_number, examination_key, document_id, user_id, document_sha256, envelope_version, execution_origin, content_class,
    profile_id, profile_version, schema_version, prompt_version, executor_mode, provider, model,
    outcome_status, outcome_reason, executed_at, envelope_canonical, envelope_sha256, access_log_id, reservation_id)
  VALUES (
    v_attempts + 1, v_key, v_doc.id, v_doc.user_id, v_doc.sha256, 3, 'live_model', 'customer_document',
    v_env #>> '{profile,id}', (v_env #>> '{profile,version}')::integer, v_env #>> '{profile,schema}', v_env #>> '{profile,prompt}', 'live_model', 'anthropic', v_env #>> '{executor,model}',
    v_env #>> '{outcome,status}', v_env #>> '{outcome,reason}', v_env ->> 'executed_at', p_envelope, encode(sha256(convert_to(p_envelope, 'UTF8')), 'hex'), v_log.id, v_res.id)
  RETURNING id INTO v_id;
  UPDATE public.creator_record_v2_customer_live_reservations SET attempt_id = v_id WHERE id = v_res.id;
  RETURN QUERY SELECT v_id, 'created'::text;
END;
$$;

-- ── 7. Settle: once, after the attempt, from reported usage ───────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.creator_record_v2_settle_customer_live_reservation(p_reservation_id uuid, p_charged_micro_usd integer)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_res public.creator_record_v2_customer_live_reservations%ROWTYPE;
BEGIN
  IF p_charged_micro_usd IS NULL OR p_charged_micro_usd NOT BETWEEN 0 AND 100000000 THEN
    RAISE EXCEPTION 'customer_live_settlement_invalid' USING ERRCODE = 'P0001';
  END IF;
  SELECT * INTO v_res FROM public.creator_record_v2_customer_live_reservations r WHERE r.id = p_reservation_id FOR UPDATE;
  IF NOT FOUND OR v_res.settled_at IS NOT NULL THEN
    RAISE EXCEPTION 'customer_live_settlement_invalid' USING ERRCODE = 'P0001';
  END IF;
  UPDATE public.creator_record_v2_customer_live_reservations SET charged_micro_usd = p_charged_micro_usd, settled_at = now() WHERE id = v_res.id;
  RETURN greatest(v_res.reserved_micro_usd, p_charged_micro_usd);
END;
$$;

-- ── Privileges: service_role reads the ledger and calls the three functions; no API role writes anything ──

ALTER TABLE public.creator_record_v2_customer_live_enablement ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_record_v2_customer_live_reservations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.creator_record_v2_customer_live_enablement FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE public.creator_record_v2_customer_live_reservations FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON TABLE public.creator_record_v2_customer_live_reservations TO service_role;
REVOKE ALL ON FUNCTION public.creator_record_v2_customer_live_enablement_guard() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.creator_record_v2_customer_live_reservations_guard() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.creator_record_v2_evidence_access_log_live_guard() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.creator_record_v2_reserve_customer_live_examination(bigint, text, integer, integer) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.creator_record_v2_record_customer_live_examination(uuid, text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.creator_record_v2_settle_customer_live_reservation(uuid, integer) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.creator_record_v2_reserve_customer_live_examination(bigint, text, integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.creator_record_v2_record_customer_live_examination(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.creator_record_v2_settle_customer_live_reservation(uuid, integer) TO service_role;
