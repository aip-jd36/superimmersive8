-- CR-V2-DOC-LIVE-1A — the closed foundation for model-read examinations (envelope v3).
-- Requires 20261107000000. LOCAL ONLY until separately authorized: do not apply to Production or any remote database.
--
-- ADDS one table and one write function. Changes NO existing table, column, CHECK, trigger, function, row, grant or policy, so
-- creator_record_v2_examination_runs stays replay-only exactly as it is, and every historical run stays valid.
--
-- A separate table, not new values on the runs table: that table's CHECKs fix envelope_version = 2, content_class,
-- executor_mode = 'fixture_replay' and NOT NULL replay columns. Widening them would weaken what they guarantee.
--
-- CLOSED ON PURPOSE:
--   * no row can claim to be live: execution_origin and executor_mode are CHECKed to 'mock_test', and the function refuses
--     'live_model' outright. Allowing live output is a later, reviewed migration that also has to say who may run it.
--   * it runs only under the existing isolated-test marker, which Production does not have and no API role can create.
--     Admin and grant authority do not apply here.
--   * a mocked attempt must be about the bytes of a committed synthetic fixture.
--   * nothing reads this table: no record, projection, PDF, guidance or eligibility path.
--
-- One reading per document and profile (unique index), first write wins; failed attempts are kept, capped and never a reading.
--
-- ROLLBACK (only while the table is empty; the statements refuse otherwise):
--   DO $g$ BEGIN IF EXISTS (SELECT 1 FROM public.creator_record_v2_live_examination_attempts) THEN RAISE EXCEPTION 'live attempts exist'; END IF; END $g$;
--   DROP FUNCTION public.creator_record_v2_record_live_examination(bigint, text);
--   DROP TABLE public.creator_record_v2_live_examination_attempts;

DO $pre$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.creator_record_v2_examination_runs'::regclass AND conname = 'creator_record_v2_examination_runs_authority_check'
                 AND pg_get_constraintdef(oid) LIKE '%admin_synthetic_uat%') THEN
    RAISE EXCEPTION '20261108000000 requires 20261107000000' USING ERRCODE = 'P0001';
  END IF;
END
$pre$;

CREATE TABLE public.creator_record_v2_live_examination_attempts (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_number      integer NOT NULL CHECK (attempt_number BETWEEN 1 AND 3),
  examination_key     char(64) NOT NULL CHECK (examination_key ~ '^[0-9a-f]{64}$'),
  document_id         uuid NOT NULL REFERENCES public.creator_record_v2_documents(id) ON DELETE RESTRICT,
  user_id             uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  document_sha256     char(64) NOT NULL CHECK (document_sha256 ~ '^[0-9a-f]{64}$'),
  envelope_version    integer NOT NULL CHECK (envelope_version = 3),
  execution_origin    text NOT NULL CHECK (execution_origin = 'mock_test'),
  content_class       text NOT NULL CHECK (content_class = 'known_synthetic_fixture'),
  profile_id          text NOT NULL CHECK (profile_id ~ '^[a-z][a-z0-9_-]{0,39}$'),
  profile_version     integer NOT NULL CHECK (profile_version >= 1),
  schema_version      text NOT NULL CHECK (schema_version ~ '^[a-z0-9][a-z0-9._-]{0,99}$'),
  prompt_version      text NOT NULL CHECK (prompt_version ~ '^[a-z0-9][a-z0-9._-]{0,99}$'),
  executor_mode       text NOT NULL CHECK (executor_mode = 'mock_test'),
  provider            text NOT NULL CHECK (provider = 'test_double'),
  model               text NOT NULL CHECK (model = 'mock-model-test-only'),
  outcome_status      text NOT NULL CHECK (outcome_status IN ('examined', 'could_not_examine')),
  outcome_reason      text CHECK (outcome_reason IN ('unsupported_format', 'file_too_large', 'empty_file', 'model_timeout', 'provider_failure', 'structured_output_missing', 'schema_invalid')),
  executed_at         text NOT NULL CHECK (executed_at ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{3}Z$'),
  envelope_canonical  text NOT NULL CHECK (length(envelope_canonical) BETWEEN 2 AND 262144),
  envelope_sha256     char(64) NOT NULL CHECK (envelope_sha256 ~ '^[0-9a-f]{64}$'),
  access_log_id       bigint NOT NULL UNIQUE REFERENCES public.creator_record_v2_evidence_access_log(id) ON DELETE RESTRICT,
  created_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (document_id, profile_id, attempt_number),
  CHECK ((outcome_status = 'examined') = (outcome_reason IS NULL))
);
-- At most one reading per document and profile: a contradiction cannot be stored, whatever the application does.
CREATE UNIQUE INDEX creator_record_v2_live_examination_one_reading
  ON public.creator_record_v2_live_examination_attempts (document_id, profile_id) WHERE outcome_status = 'examined';
CREATE INDEX creator_record_v2_live_examination_owner ON public.creator_record_v2_live_examination_attempts (user_id, document_id);

CREATE TRIGGER creator_record_v2_live_examination_attempts_append_only
  BEFORE UPDATE OR DELETE ON public.creator_record_v2_live_examination_attempts
  FOR EACH ROW EXECUTE FUNCTION public.creator_record_v2_examination_append_only_guard();

CREATE OR REPLACE FUNCTION public.creator_record_v2_record_live_examination(p_access_log_id bigint, p_envelope text)
RETURNS TABLE (attempt_id uuid, result text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_env       jsonb;
  v_log       public.creator_record_v2_evidence_access_log%ROWTYPE;
  v_doc       public.creator_record_v2_documents%ROWTYPE;
  v_reading   public.creator_record_v2_live_examination_attempts%ROWTYPE;
  v_key       text;
  v_attempts  integer;
  v_id        uuid;
BEGIN
  -- (a) Authority first, before anything is parsed: the isolated-test marker only.
  IF NOT EXISTS (SELECT 1 FROM public.creator_record_v2_examination_environment WHERE singleton) THEN
    RAISE EXCEPTION 'examination_environment_not_authorized' USING ERRCODE = 'P0001';
  END IF;

  -- (b) Envelope v3: exact keys at every level, closed vocabularies, typed scalars.
  IF p_envelope IS NULL OR length(p_envelope) NOT BETWEEN 2 AND 262144 THEN
    RAISE EXCEPTION 'live_examination_envelope_invalid' USING ERRCODE = 'P0001';
  END IF;
  BEGIN
    v_env := p_envelope::jsonb;
  EXCEPTION WHEN others THEN
    RAISE EXCEPTION 'live_examination_envelope_invalid' USING ERRCODE = 'P0001';
  END;
  -- Live output is not accepted here at all. Named apart from malformed input: this is a decision, not a defect.
  IF v_env ->> 'execution_origin' = 'live_model' OR v_env #>> '{executor,mode}' = 'live_model' THEN
    RAISE EXCEPTION 'live_examination_not_authorized' USING ERRCODE = 'P0001';
  END IF;
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
       AND v_env ->> 'execution_origin' = 'mock_test'
       AND v_env ->> 'content_class' = 'known_synthetic_fixture'
       AND v_env ->> 'workflow_authorization' = 'not_established'
       AND jsonb_typeof(v_env -> 'examination_key') = 'string' AND v_env ->> 'examination_key' ~ '^[0-9a-f]{64}$'
       AND jsonb_typeof(v_env -> 'executed_at') = 'string' AND v_env ->> 'executed_at' ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{3}Z$'
       AND jsonb_typeof(v_env #> '{document,document_id}') = 'string' AND v_env #>> '{document,document_id}' ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
       AND jsonb_typeof(v_env #> '{document,sha256}') = 'string' AND v_env #>> '{document,sha256}' ~ '^[0-9a-f]{64}$'
       AND v_env #>> '{document,media_type}' IN ('application/pdf', 'image/png', 'image/jpeg')
       AND jsonb_typeof(v_env #> '{document,byte_size}') = 'number' AND v_env #>> '{document,byte_size}' ~ '^[1-9][0-9]{0,8}$'
       AND jsonb_typeof(v_env #> '{profile,id}') = 'string' AND v_env #>> '{profile,id}' ~ '^[a-z][a-z0-9_-]{0,39}$'
       AND jsonb_typeof(v_env #> '{profile,version}') = 'number' AND v_env #>> '{profile,version}' ~ '^[1-9][0-9]{0,8}$'
       AND jsonb_typeof(v_env #> '{profile,schema}') = 'string' AND v_env #>> '{profile,schema}' ~ '^[a-z0-9][a-z0-9._-]{0,99}$'
       AND jsonb_typeof(v_env #> '{profile,prompt}') = 'string' AND v_env #>> '{profile,prompt}' ~ '^[a-z0-9][a-z0-9._-]{0,99}$'
       AND v_env #>> '{executor,mode}' = 'mock_test'
       AND v_env #>> '{executor,provider}' = 'test_double'
       AND v_env #>> '{executor,model}' = 'mock-model-test-only'
       AND v_env #>> '{provenance,integrity}' = 'sha256_size_and_type_rechecked'
       AND jsonb_typeof(v_env #> '{provenance,model_calls}') = 'number' AND v_env #>> '{provenance,model_calls}' IN ('0', '1', '2')
       AND jsonb_typeof(v_env #> '{provenance,prompt_sent}') = 'boolean' AND (v_env #>> '{provenance,prompt_sent}')::boolean = (v_env #>> '{provenance,model_calls}' <> '0')
       AND jsonb_typeof(v_env #> '{provenance,input_tokens}') = 'number' AND v_env #>> '{provenance,input_tokens}' ~ '^[0-9]{1,9}$'
       AND jsonb_typeof(v_env #> '{provenance,output_tokens}') = 'number' AND v_env #>> '{provenance,output_tokens}' ~ '^[0-9]{1,9}$'
       AND (v_env #> '{provenance,provider_response_id}' = 'null'::jsonb OR (jsonb_typeof(v_env #> '{provenance,provider_response_id}') = 'string' AND v_env #>> '{provenance,provider_response_id}' ~ '^mock-'))
       AND ((v_env #>> '{outcome,status}' = 'examined' AND v_env #> '{outcome,reason}' = 'null'::jsonb
             AND v_env #>> '{provenance,model_calls}' <> '0' AND jsonb_typeof(v_env #> '{provenance,provider_response_id}') = 'string')
            OR (v_env #>> '{outcome,status}' = 'could_not_examine'
                AND v_env #>> '{outcome,reason}' IN ('unsupported_format', 'file_too_large', 'empty_file', 'model_timeout', 'provider_failure', 'structured_output_missing', 'schema_invalid')
                AND jsonb_array_length(v_env -> 'observations') = 0))
       AND (v_env -> 'limitations') @> '["mock_test_data_not_model_output", "observations_not_verified"]'::jsonb, false) THEN
    RAISE EXCEPTION 'live_examination_envelope_invalid' USING ERRCODE = 'P0001';
  END IF;
  -- Limitations: closed, with no replay limitation, so recorded test data cannot arrive here relabelled.
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(v_env -> 'limitations') l
             WHERE jsonb_typeof(l) IS DISTINCT FROM 'string' OR l #>> '{}' NOT IN (
               'mock_test_data_not_model_output', 'observations_not_verified', 'no_location_reference', 'fields_not_established',
               'single_plan_reading_does_not_exclude_others', 'multiple_plans_shown', 'instruction_like_text_present',
               'not_a_billing_document', 'partially_legible', 'illegible'))
     OR (SELECT count(*) FROM jsonb_array_elements(v_env -> 'limitations')) <> (SELECT count(DISTINCT l) FROM jsonb_array_elements(v_env -> 'limitations') l) THEN
    RAISE EXCEPTION 'live_examination_envelope_invalid' USING ERRCODE = 'P0001';
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
               AND o ->> 'origin' = 'mock_test_double', false))
     OR (SELECT count(*) FROM jsonb_array_elements(v_env -> 'observations')) <> (SELECT count(DISTINCT o ->> 'observation_id') FROM jsonb_array_elements(v_env -> 'observations') o) THEN
    RAISE EXCEPTION 'live_examination_envelope_invalid' USING ERRCODE = 'P0001';
  END IF;

  -- (c) The database recomputes the key from the validated, escape-free fields, in canonicalJson order (proved equal by test).
  v_key := encode(sha256(convert_to(
    '{"document_id":"' || (v_env #>> '{document,document_id}')
    || '","envelope":{"id":"si8/creator-record-v2-examination","version":3},"executor":{"mode":"mock_test","model":"mock-model-test-only","provider":"test_double"}'
    || ',"profile":{"id":"' || (v_env #>> '{profile,id}') || '","prompt":"' || (v_env #>> '{profile,prompt}')
    || '","schema":"' || (v_env #>> '{profile,schema}') || '","version":' || (v_env #>> '{profile,version}')
    || '},"sha256":"' || (v_env #>> '{document,sha256}') || '"}', 'UTF8')), 'hex');
  IF v_key <> v_env ->> 'examination_key' THEN
    RAISE EXCEPTION 'live_examination_key_mismatch' USING ERRCODE = 'P0001';
  END IF;

  -- (d) A recent examination read, for this document and its owner, used by no other run or attempt.
  SELECT * INTO v_log FROM public.creator_record_v2_evidence_access_log l WHERE l.id = p_access_log_id FOR UPDATE;
  IF NOT FOUND OR v_log.purpose <> 'examination' OR v_log.actor_role <> 'owner' OR v_log.uat_grant_id IS NOT NULL
     OR v_log.document_id::text <> v_env #>> '{document,document_id}'
     OR v_log.accessed_at < now() - interval '15 minutes' OR v_log.accessed_at > now()
     OR EXISTS (SELECT 1 FROM public.creator_record_v2_examination_runs r WHERE r.access_log_id = v_log.id)
     OR EXISTS (SELECT 1 FROM public.creator_record_v2_live_examination_attempts a WHERE a.access_log_id = v_log.id) THEN
    RAISE EXCEPTION 'live_examination_access_not_logged' USING ERRCODE = 'P0001';
  END IF;
  -- The attempt finished after its read was logged, and not in the future.
  IF (v_env ->> 'executed_at')::timestamptz < v_log.accessed_at - interval '1 minute' OR (v_env ->> 'executed_at')::timestamptz > now() + interval '1 minute' THEN
    RAISE EXCEPTION 'live_examination_envelope_invalid' USING ERRCODE = 'P0001';
  END IF;

  -- (e) The document: stored, owned by the logged actor, exactly the bytes the envelope names.
  SELECT * INTO v_doc FROM public.creator_record_v2_documents d WHERE d.id = v_log.document_id FOR SHARE;
  IF NOT FOUND OR v_doc.state <> 'stored' OR v_doc.user_id <> v_log.actor_user_id
     OR v_doc.sha256 <> v_env #>> '{document,sha256}' OR v_doc.byte_size::text <> v_env #>> '{document,byte_size}' OR v_doc.media_type <> v_env #>> '{document,media_type}' THEN
    RAISE EXCEPTION 'live_examination_document_mismatch' USING ERRCODE = 'P0001';
  END IF;

  -- (f) A mocked attempt is only ever about a committed synthetic fixture.
  IF NOT EXISTS (SELECT 1 FROM public.creator_record_v2_synthetic_fixtures f WHERE f.sha256 = v_doc.sha256) THEN
    RAISE EXCEPTION 'live_examination_content_not_recognized' USING ERRCODE = 'P0001';
  END IF;

  -- (g) Under one lock per document and profile: one reading, first write wins; a capped number of attempts.
  PERFORM pg_advisory_xact_lock(hashtextextended('si8.cr_v2_live_exam:' || v_doc.id::text || ':' || (v_env #>> '{profile,id}'), 0));

  SELECT * INTO v_reading FROM public.creator_record_v2_live_examination_attempts a
   WHERE a.document_id = v_doc.id AND a.profile_id = v_env #>> '{profile,id}' AND a.outcome_status = 'examined';
  IF FOUND THEN
    IF v_reading.envelope_canonical = p_envelope THEN
      RETURN QUERY SELECT v_reading.id, 'existing'::text;
      RETURN;
    END IF;
    RAISE EXCEPTION 'live_examination_conflict' USING ERRCODE = 'P0001';  -- never overwrite, never a second reading
  END IF;
  IF EXISTS (SELECT 1 FROM public.creator_record_v2_live_examination_attempts a
             WHERE a.document_id = v_doc.id AND a.profile_id = v_env #>> '{profile,id}'
               AND a.outcome_reason IN ('unsupported_format', 'file_too_large', 'empty_file')) THEN
    RAISE EXCEPTION 'live_examination_not_retryable' USING ERRCODE = 'P0001';
  END IF;
  SELECT count(*) INTO v_attempts FROM public.creator_record_v2_live_examination_attempts a WHERE a.document_id = v_doc.id AND a.profile_id = v_env #>> '{profile,id}';
  IF v_attempts >= 3 THEN
    RAISE EXCEPTION 'live_examination_attempts_exhausted' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.creator_record_v2_live_examination_attempts (
    attempt_number, examination_key, document_id, user_id, document_sha256, envelope_version, execution_origin, content_class,
    profile_id, profile_version, schema_version, prompt_version, executor_mode, provider, model,
    outcome_status, outcome_reason, executed_at, envelope_canonical, envelope_sha256, access_log_id)
  VALUES (
    v_attempts + 1, v_key, v_doc.id, v_doc.user_id, v_doc.sha256, 3, 'mock_test', 'known_synthetic_fixture',
    v_env #>> '{profile,id}', (v_env #>> '{profile,version}')::integer, v_env #>> '{profile,schema}', v_env #>> '{profile,prompt}', 'mock_test', 'test_double', 'mock-model-test-only',
    v_env #>> '{outcome,status}', v_env #>> '{outcome,reason}', v_env ->> 'executed_at', p_envelope, encode(sha256(convert_to(p_envelope, 'UTF8')), 'hex'), v_log.id)
  RETURNING id INTO v_id;
  RETURN QUERY SELECT v_id, 'created'::text;
END;
$$;

ALTER TABLE public.creator_record_v2_live_examination_attempts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.creator_record_v2_live_examination_attempts FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON TABLE public.creator_record_v2_live_examination_attempts TO service_role;
REVOKE ALL ON FUNCTION public.creator_record_v2_record_live_examination(bigint, text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.creator_record_v2_record_live_examination(bigint, text) TO service_role;
