-- CR-V2 permanent admin-only Production UAT: administrator-authorized synthetic examination replay.
-- Requires 20261106000000. Replaces two functions and the run authority CHECK. No table, row, grant or RLS change.
--
-- ADDS: with no isolated-test marker, an examination read and run are accepted for an actor whose public.users.is_admin is
-- true, on their OWN stored owner_upload document whose bytes are a committed fixture. Runs are stamped
-- admin_synthetic_uat with no grant. environment_project_ref is the Production ref: an unmarked database is treated as
-- Production, as the 20261106 grant path does; a staging database carries the marker and takes the marker path.
-- UNCHANGED: non-admins are refused exactly as before; the grant and marker paths; envelope validation; replay only.
-- FORWARD-ONLY once an admin run exists: the CHECK must keep accepting history.

DO $pre$
DECLARE v_def text;
BEGIN
  SELECT pg_get_constraintdef(oid) INTO v_def FROM pg_constraint
   WHERE conrelid = 'public.creator_record_v2_examination_runs'::regclass AND conname = 'creator_record_v2_examination_runs_authority_check';
  IF NOT FOUND OR v_def NOT LIKE '%customer_path_synthetic_uat%' THEN
    RAISE EXCEPTION '20261107000000 requires 20261106000000' USING ERRCODE = 'P0001';
  END IF;
END
$pre$;

ALTER TABLE public.creator_record_v2_examination_runs DROP CONSTRAINT creator_record_v2_examination_runs_authority_check;
ALTER TABLE public.creator_record_v2_examination_runs ADD CONSTRAINT creator_record_v2_examination_runs_authority_check CHECK (
  environment_project_ref ~ '^[a-z0-9]{20}$' AND (
    (execution_boundary = 'isolated_synthetic_test' AND uat_grant_id IS NULL AND environment_project_ref <> 'lehqgcgnenwdmuzudbrs')
    OR (execution_boundary IN ('operator_synthetic_uat', 'customer_path_synthetic_uat') AND uat_grant_id IS NOT NULL)
    OR (execution_boundary = 'admin_synthetic_uat' AND uat_grant_id IS NULL)));

CREATE OR REPLACE FUNCTION public.creator_record_v2_evidence_access_log_insert_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_marker    boolean;
  v_grant     public.creator_record_v2_examination_uat_grants%ROWTYPE;
  v_has_grant boolean;
  v_doc       public.creator_record_v2_documents%ROWTYPE;
  v_used      integer;
BEGIN
  NEW.uat_grant_id := NULL;
  IF NEW.purpose = 'examination' THEN
    NEW.accessed_at := now();  -- server time: the correlation window cannot be back- or forward-dated
    v_marker := EXISTS (SELECT 1 FROM public.creator_record_v2_examination_environment WHERE singleton);
    -- Admin UAT: re-read is_admin here, so an application defect cannot authorize a non-admin. Own upload of a committed fixture only.
    IF NOT v_marker AND EXISTS (SELECT 1 FROM public.users u WHERE u.id = NEW.actor_user_id AND u.is_admin IS TRUE) THEN
      IF NEW.actor_role <> 'owner' OR NOT EXISTS (
           SELECT 1 FROM public.creator_record_v2_documents d
             JOIN public.creator_record_v2_synthetic_fixtures f ON f.sha256 = d.sha256
           WHERE d.id = NEW.document_id AND d.user_id = NEW.actor_user_id AND d.state = 'stored'
             AND d.origin = 'owner_upload' AND d.seed_grant_id IS NULL) THEN
        RAISE EXCEPTION 'examination_admin_uat_target_mismatch' USING ERRCODE = 'P0001';
      END IF;
      RETURN NEW;  -- uat_grant_id stays NULL: no grant, window or budget is involved
    END IF;
    SELECT * INTO v_grant FROM public.creator_record_v2_examination_uat_grants g
     WHERE g.revoked_at IS NULL AND g.expires_at > now() ORDER BY g.created_at DESC LIMIT 1 FOR UPDATE;
    v_has_grant := FOUND;
    IF v_marker = v_has_grant THEN
      RAISE EXCEPTION 'examination reads are not authorized in this environment' USING ERRCODE = 'P0001';
    END IF;
    IF NEW.actor_role <> 'owner' OR NOT EXISTS (
         SELECT 1 FROM public.creator_record_v2_documents d
         WHERE d.id = NEW.document_id AND d.user_id = NEW.actor_user_id AND d.state = 'stored') THEN
      RAISE EXCEPTION 'an examination read is logged only for the owner of a stored document' USING ERRCODE = 'P0001';
    END IF;
    IF v_has_grant THEN
      SELECT * INTO v_doc FROM public.creator_record_v2_documents d WHERE d.id = NEW.document_id;
      IF v_grant.grant_kind = 'operator_seed' THEN
        IF NEW.actor_user_id <> v_grant.test_user_id OR v_grant.bound_document_id IS DISTINCT FROM NEW.document_id
           OR v_doc.origin <> 'operator_synthetic_seed' OR v_doc.seed_grant_id IS DISTINCT FROM v_grant.id
           OR v_doc.sha256 <> v_grant.document_sha256 THEN
          RAISE EXCEPTION 'examination_uat_target_mismatch' USING ERRCODE = 'P0001';
        END IF;
      ELSE
        -- customer_path_uat: the test identity's OWN upload (owner_upload provenance, never seeded), uploaded under this
        -- grant (after it was created), exactly the granted fixture bytes; and, once bound, only that document.
        IF NEW.actor_user_id <> v_grant.test_user_id OR v_doc.origin <> 'owner_upload' OR v_doc.seed_grant_id IS NOT NULL
           OR v_doc.sha256 <> v_grant.document_sha256 OR v_doc.created_at < v_grant.created_at
           OR (v_grant.bound_document_id IS NOT NULL AND v_grant.bound_document_id <> NEW.document_id) THEN
          RAISE EXCEPTION 'examination_uat_target_mismatch' USING ERRCODE = 'P0001';
        END IF;
      END IF;
      SELECT count(*) INTO v_used FROM public.creator_record_v2_evidence_access_log l WHERE l.uat_grant_id = v_grant.id;
      IF v_used >= v_grant.max_read_events THEN
        RAISE EXCEPTION 'examination_uat_budget_exhausted' USING ERRCODE = 'P0001';
      END IF;
      -- customer_path_uat: the first examination read binds the grant to this document, once, under the row lock above
      -- (the grant guard accepts a binding only from a trigger, never from a direct UPDATE).
      IF v_grant.grant_kind = 'customer_path_uat' AND v_grant.bound_document_id IS NULL THEN
        UPDATE public.creator_record_v2_examination_uat_grants SET bound_document_id = NEW.document_id WHERE id = v_grant.id;
      END IF;
      NEW.uat_grant_id := v_grant.id;
    END IF;
  END IF;
  RETURN NEW;  -- 'file_download' rows: as before (uat_grant_id is always NULL)
END;
$$;

CREATE OR REPLACE FUNCTION public.creator_record_v2_record_examination(p_access_log_id bigint, p_envelope text)
RETURNS TABLE (run_id uuid, result text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_marker      public.creator_record_v2_examination_environment%ROWTYPE;
  v_has_marker  boolean;
  v_grant       public.creator_record_v2_examination_uat_grants%ROWTYPE;
  v_env         jsonb;
  v_log         public.creator_record_v2_evidence_access_log%ROWTYPE;
  v_doc         public.creator_record_v2_documents%ROWTYPE;
  v_fixture     public.creator_record_v2_synthetic_fixtures%ROWTYPE;
  v_existing    public.creator_record_v2_examination_runs%ROWTYPE;
  v_head        public.creator_record_v2_examination_runs%ROWTYPE;
  v_has_head    boolean;
  v_key         text;
  v_id          uuid;
  v_admin       boolean;
BEGIN
  -- (a) Execution authority first: exactly one of the marker or an active grant, before anything is parsed.
  SELECT * INTO v_marker FROM public.creator_record_v2_examination_environment WHERE singleton;
  v_has_marker := FOUND;
  v_admin := NOT v_has_marker AND EXISTS (SELECT 1 FROM public.creator_record_v2_evidence_access_log l JOIN public.users u ON u.id = l.actor_user_id
                                          WHERE l.id = p_access_log_id AND l.uat_grant_id IS NULL AND u.is_admin IS TRUE);
  IF NOT v_admin AND v_has_marker = EXISTS (SELECT 1 FROM public.creator_record_v2_examination_uat_grants g WHERE g.revoked_at IS NULL AND g.expires_at > now()) THEN
    RAISE EXCEPTION 'examination_environment_not_authorized' USING ERRCODE = 'P0001';
  END IF;

  -- (b) Envelope v2: parse, then exact keys at every level, closed vocabularies, typed scalars.
  IF p_envelope IS NULL OR length(p_envelope) NOT BETWEEN 2 AND 262144 THEN
    RAISE EXCEPTION 'examination_envelope_invalid' USING ERRCODE = 'P0001';
  END IF;
  BEGIN
    v_env := p_envelope::jsonb;
  EXCEPTION WHEN others THEN
    RAISE EXCEPTION 'examination_envelope_invalid' USING ERRCODE = 'P0001';
  END;
  IF NOT coalesce(
       public.creator_record_v2_jsonb_exact_keys(v_env, ARRAY['envelope', 'examination_key', 'identity', 'document', 'content_class', 'workflow_authorization', 'profile', 'executor', 'outcome', 'observations', 'limitations', 'provenance'])
       AND public.creator_record_v2_jsonb_exact_keys(v_env -> 'envelope', ARRAY['id', 'version'])
       AND public.creator_record_v2_jsonb_exact_keys(v_env -> 'document', ARRAY['document_id', 'sha256', 'media_type', 'byte_size'])
       AND public.creator_record_v2_jsonb_exact_keys(v_env -> 'profile', ARRAY['id', 'version', 'schema', 'prompt'])
       AND public.creator_record_v2_jsonb_exact_keys(v_env -> 'executor', ARRAY['mode', 'replay_set', 'recording_sha256'])
       AND public.creator_record_v2_jsonb_exact_keys(v_env -> 'outcome', ARRAY['status', 'reason'])
       AND public.creator_record_v2_jsonb_exact_keys(v_env -> 'provenance', ARRAY['integrity', 'replay_fixture_id', 'engine_attempts', 'model_calls', 'prompt_sent'])
       AND jsonb_typeof(v_env -> 'observations') = 'array'
       AND jsonb_typeof(v_env -> 'limitations') = 'array', false) THEN
    RAISE EXCEPTION 'examination_envelope_invalid' USING ERRCODE = 'P0001';
  END IF;
  IF NOT coalesce(
       v_env #>> '{envelope,id}' = 'si8/creator-record-v2-examination'
       AND v_env #> '{envelope,version}' = '2'::jsonb
       AND v_env ->> 'identity' = 'deterministic_replay_key'
       AND v_env ->> 'content_class' = 'known_synthetic_fixture'
       AND v_env ->> 'workflow_authorization' = 'not_established'
       AND jsonb_typeof(v_env -> 'examination_key') = 'string' AND v_env ->> 'examination_key' ~ '^[0-9a-f]{64}$'
       AND jsonb_typeof(v_env #> '{document,document_id}') = 'string' AND v_env #>> '{document,document_id}' ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
       AND jsonb_typeof(v_env #> '{document,sha256}') = 'string' AND v_env #>> '{document,sha256}' ~ '^[0-9a-f]{64}$'
       AND v_env #>> '{document,media_type}' IN ('application/pdf', 'image/png', 'image/jpeg')
       AND jsonb_typeof(v_env #> '{document,byte_size}') = 'number' AND v_env #>> '{document,byte_size}' ~ '^[1-9][0-9]{0,8}$'
       AND jsonb_typeof(v_env #> '{profile,id}') = 'string' AND v_env #>> '{profile,id}' ~ '^[a-z][a-z0-9_-]{0,39}$'
       AND jsonb_typeof(v_env #> '{profile,version}') = 'number' AND v_env #>> '{profile,version}' ~ '^[1-9][0-9]{0,8}$'
       AND jsonb_typeof(v_env #> '{profile,schema}') = 'string' AND v_env #>> '{profile,schema}' ~ '^[a-z0-9][a-z0-9._-]{0,99}$'
       AND jsonb_typeof(v_env #> '{profile,prompt}') = 'string' AND v_env #>> '{profile,prompt}' ~ '^[a-z0-9][a-z0-9._-]{0,99}$'
       AND v_env #>> '{executor,mode}' = 'fixture_replay'
       AND jsonb_typeof(v_env #> '{executor,replay_set}') = 'string' AND v_env #>> '{executor,replay_set}' ~ '^[a-z0-9][a-z0-9._/-]{0,99}$'
       AND jsonb_typeof(v_env #> '{executor,recording_sha256}') = 'string' AND v_env #>> '{executor,recording_sha256}' ~ '^[0-9a-f]{64}$'
       AND v_env #>> '{provenance,integrity}' = 'sha256_size_and_type_rechecked'
       AND jsonb_typeof(v_env #> '{provenance,replay_fixture_id}') = 'string' AND v_env #>> '{provenance,replay_fixture_id}' ~ '^[a-z0-9][a-z0-9-]{0,99}$'
       AND jsonb_typeof(v_env #> '{provenance,engine_attempts}') = 'number' AND v_env #>> '{provenance,engine_attempts}' ~ '^[0-9]{1,3}$'
       AND v_env #> '{provenance,model_calls}' = '0'::jsonb
       AND v_env #> '{provenance,prompt_sent}' = 'false'::jsonb
       AND ((v_env #>> '{outcome,status}' = 'examined' AND v_env #> '{outcome,reason}' = 'null'::jsonb)
            OR (v_env #>> '{outcome,status}' = 'could_not_examine'
                AND v_env #>> '{outcome,reason}' IN ('unsupported_format', 'file_too_large', 'empty_file', 'model_error', 'structured_output_missing', 'schema_invalid')
                AND jsonb_array_length(v_env -> 'observations') = 0))
       AND (v_env -> 'limitations') @> '["recorded_test_data_not_model_output", "observations_not_verified"]'::jsonb, false) THEN
    RAISE EXCEPTION 'examination_envelope_invalid' USING ERRCODE = 'P0001';
  END IF;
  -- Limitations: closed vocabulary, strings, no duplicates.
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(v_env -> 'limitations') l
             WHERE jsonb_typeof(l) IS DISTINCT FROM 'string' OR l #>> '{}' NOT IN (
               'recorded_test_data_not_model_output', 'observations_not_verified', 'no_location_reference', 'fields_not_established',
               'single_plan_reading_does_not_exclude_others', 'multiple_plans_shown', 'instruction_like_text_present',
               'not_a_billing_document', 'partially_legible', 'illegible'))
     OR (SELECT count(*) FROM jsonb_array_elements(v_env -> 'limitations')) <> (SELECT count(DISTINCT l) FROM jsonb_array_elements(v_env -> 'limitations') l) THEN
    RAISE EXCEPTION 'examination_envelope_invalid' USING ERRCODE = 'P0001';
  END IF;
  -- Observations: exact keys, closed vocabularies, value iff present, same document, id prefixed by the key.
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
               AND o ->> 'origin' = 'fixture_replay_recorded', false))
     OR (SELECT count(*) FROM jsonb_array_elements(v_env -> 'observations')) <> (SELECT count(DISTINCT o ->> 'observation_id') FROM jsonb_array_elements(v_env -> 'observations') o) THEN
    RAISE EXCEPTION 'examination_envelope_invalid' USING ERRCODE = 'P0001';
  END IF;

  -- (c) Identity: the database RECOMPUTES the deterministic replay key from the validated (escape-free) fields,
  -- exactly as canonicalJson orders them (proved equal to examinationKey()).
  v_key := encode(sha256(convert_to(
    '{"document_id":"' || (v_env #>> '{document,document_id}')
    || '","envelope":{"id":"si8/creator-record-v2-examination","version":2},"executor":{"mode":"fixture_replay","recording_sha256":"'
    || (v_env #>> '{executor,recording_sha256}') || '","replay_set":"' || (v_env #>> '{executor,replay_set}')
    || '"},"profile":{"id":"' || (v_env #>> '{profile,id}') || '","prompt":"' || (v_env #>> '{profile,prompt}')
    || '","schema":"' || (v_env #>> '{profile,schema}') || '","version":' || (v_env #>> '{profile,version}')
    || '},"sha256":"' || (v_env #>> '{document,sha256}') || '"}', 'UTF8')), 'hex');
  IF v_key <> v_env ->> 'examination_key' THEN
    RAISE EXCEPTION 'examination_key_mismatch' USING ERRCODE = 'P0001';
  END IF;

  -- (d) Audit-event correlation: a recent, unconsumed examination read logged for this document and its owner,
  -- issued under the authority now in force (no grant for the marker path; this grant for the grant path).
  SELECT * INTO v_log FROM public.creator_record_v2_evidence_access_log l WHERE l.id = p_access_log_id FOR UPDATE;
  IF NOT FOUND OR v_log.purpose <> 'examination' OR v_log.actor_role <> 'owner'
     OR v_log.document_id::text <> v_env #>> '{document,document_id}'
     OR v_log.accessed_at < now() - interval '15 minutes' OR v_log.accessed_at > now()
     OR EXISTS (SELECT 1 FROM public.creator_record_v2_examination_runs r WHERE r.access_log_id = v_log.id)
     OR (v_has_marker AND v_log.uat_grant_id IS NOT NULL)
     OR (NOT v_has_marker AND NOT v_admin AND v_log.uat_grant_id IS NULL) THEN
    RAISE EXCEPTION 'examination_access_not_logged' USING ERRCODE = 'P0001';
  END IF;
  IF NOT v_has_marker AND NOT v_admin THEN
    SELECT * INTO v_grant FROM public.creator_record_v2_examination_uat_grants g WHERE g.id = v_log.uat_grant_id FOR UPDATE;
    IF NOT FOUND OR v_grant.revoked_at IS NOT NULL OR v_grant.expires_at <= now() THEN
      RAISE EXCEPTION 'examination_environment_not_authorized' USING ERRCODE = 'P0001';
    END IF;
    IF v_grant.test_user_id <> v_log.actor_user_id OR v_grant.bound_document_id IS DISTINCT FROM v_log.document_id THEN
      RAISE EXCEPTION 'examination_uat_target_mismatch' USING ERRCODE = 'P0001';
    END IF;
  END IF;

  -- (e) The document: stored, owned by the logged actor, exactly the bytes the envelope names.
  SELECT * INTO v_doc FROM public.creator_record_v2_documents d WHERE d.id = v_log.document_id FOR SHARE;
  IF NOT FOUND OR v_doc.state <> 'stored' OR v_doc.user_id <> v_log.actor_user_id
     OR v_doc.sha256 <> v_env #>> '{document,sha256}'
     OR v_doc.byte_size::text <> v_env #>> '{document,byte_size}'
     OR v_doc.media_type <> v_env #>> '{document,media_type}' THEN
    RAISE EXCEPTION 'examination_document_mismatch' USING ERRCODE = 'P0001';
  END IF;
  IF NOT v_has_marker AND v_grant.grant_kind = 'operator_seed' AND (v_doc.origin <> 'operator_synthetic_seed' OR v_doc.seed_grant_id IS DISTINCT FROM v_grant.id
                           OR v_doc.sha256 <> v_grant.document_sha256) THEN
    RAISE EXCEPTION 'examination_uat_target_mismatch' USING ERRCODE = 'P0001';
  END IF;
  -- CR-V2-EXAM-INTEGRATION-X1: customer_path_uat — the test identity's own upload, never a seeded row.
  IF NOT v_has_marker AND v_grant.grant_kind = 'customer_path_uat' AND (v_doc.origin <> 'owner_upload' OR v_doc.seed_grant_id IS NOT NULL
                           OR v_doc.sha256 <> v_grant.document_sha256 OR v_doc.created_at < v_grant.created_at) THEN
    RAISE EXCEPTION 'examination_uat_target_mismatch' USING ERRCODE = 'P0001';
  END IF;

  IF v_admin AND (v_doc.origin <> 'owner_upload' OR v_doc.seed_grant_id IS NOT NULL) THEN
    RAISE EXCEPTION 'examination_admin_uat_target_mismatch' USING ERRCODE = 'P0001';
  END IF;

  -- (f) Content recognition (precondition only, never authority): committed fixture bytes, set, id AND recording.
  SELECT * INTO v_fixture FROM public.creator_record_v2_synthetic_fixtures f
   WHERE f.sha256 = v_doc.sha256 AND f.fixture_set = v_env #>> '{executor,replay_set}';
  IF NOT FOUND OR v_fixture.fixture_id <> v_env #>> '{provenance,replay_fixture_id}'
     OR v_fixture.recording_sha256 <> v_env #>> '{executor,recording_sha256}' THEN
    RAISE EXCEPTION 'examination_content_not_recognized' USING ERRCODE = 'P0001';
  END IF;

  -- (g) Serialize per (document, profile id); idempotency and the head are decided under this lock.
  PERFORM pg_advisory_xact_lock(hashtextextended('si8.cr_v2_exam:' || v_doc.id::text || ':' || (v_env #>> '{profile,id}'), 0));

  SELECT * INTO v_existing FROM public.creator_record_v2_examination_runs r WHERE r.examination_key = v_key;
  IF FOUND THEN
    IF v_existing.envelope_canonical IS DISTINCT FROM p_envelope THEN
      RAISE EXCEPTION 'examination_key_conflict' USING ERRCODE = 'P0001';  -- never overwrite, never replace
    END IF;
    RETURN QUERY SELECT v_existing.id, 'existing'::text;
    RETURN;
  END IF;

  SELECT * INTO v_head FROM public.creator_record_v2_examination_runs r
   WHERE r.document_id = v_doc.id AND r.profile_id = v_env #>> '{profile,id}'
     AND NOT EXISTS (SELECT 1 FROM public.creator_record_v2_examination_runs s WHERE s.supersedes_id = r.id);
  v_has_head := FOUND;
  IF v_has_head AND v_head.profile_version > (v_env #>> '{profile,version}')::integer THEN
    RAISE EXCEPTION 'examination_profile_regression' USING ERRCODE = 'P0001';
  END IF;
  -- Grant path: at most max_new_runs NEW runs (an idempotent 'existing' above creates none). Counted under the
  -- grant's row lock taken in (d).
  IF NOT v_has_marker AND NOT v_admin AND (SELECT count(*) FROM public.creator_record_v2_examination_runs r WHERE r.uat_grant_id = v_grant.id) >= v_grant.max_new_runs THEN
    RAISE EXCEPTION 'examination_uat_budget_exhausted' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.creator_record_v2_examination_runs (
    examination_key, document_id, user_id, document_sha256, envelope_version, content_class, workflow_authorization,
    execution_boundary, environment_project_ref, profile_id, profile_version, schema_version, prompt_version,
    executor_mode, replay_set, recording_sha256, replay_fixture_id, outcome_status, outcome_reason,
    envelope_canonical, envelope_sha256, supersedes_id, access_log_id, uat_grant_id)
  VALUES (
    v_key, v_doc.id, v_doc.user_id, v_doc.sha256, 2, 'known_synthetic_fixture', 'not_established',
    CASE WHEN v_admin THEN 'admin_synthetic_uat' WHEN v_has_marker THEN v_marker.environment_kind WHEN v_grant.grant_kind = 'customer_path_uat' THEN 'customer_path_synthetic_uat' ELSE 'operator_synthetic_uat' END,
    CASE WHEN v_admin THEN 'lehqgcgnenwdmuzudbrs' WHEN v_has_marker THEN v_marker.supabase_project_ref ELSE v_grant.supabase_project_ref END,
    v_env #>> '{profile,id}', (v_env #>> '{profile,version}')::integer,
    v_env #>> '{profile,schema}', v_env #>> '{profile,prompt}', 'fixture_replay', v_env #>> '{executor,replay_set}',
    v_env #>> '{executor,recording_sha256}', v_fixture.fixture_id, v_env #>> '{outcome,status}', v_env #>> '{outcome,reason}',
    p_envelope, encode(sha256(convert_to(p_envelope, 'UTF8')), 'hex'), CASE WHEN v_has_head THEN v_head.id END, v_log.id,
    CASE WHEN v_has_marker OR v_admin THEN NULL ELSE v_grant.id END)
  RETURNING id INTO v_id;
  RETURN QUERY SELECT v_id, 'created'::text;
END;
$$;

REVOKE ALL ON FUNCTION public.creator_record_v2_evidence_access_log_insert_guard() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.creator_record_v2_record_examination(bigint, text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.creator_record_v2_record_examination(bigint, text) TO service_role;
