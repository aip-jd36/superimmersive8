-- CR-V2-EXAM-INTEGRATION-X1 — Creator Record v2 examination: a second, separate UAT grant kind, customer_path_uat.
-- Requires 20261105000000 (PROD-UAT-B). Changes only the five functions named below and adds one grant column, one
-- run boundary value; every 20261105000000 table, column, trigger, index, privilege and refusal is otherwise unchanged.
-- Never re-apply 20261105000000 after this file except as step 2 of rollback_20261106.sql: on its own it is refused
-- (its status function has a different return type), so it fails closed and changes nothing.
--
-- WHAT THIS ADDS
--   * grant_kind on creator_record_v2_examination_uat_grants: 'operator_seed' (every existing grant, including the E4 one:
--     exactly the 20261105000000 behaviour) or 'customer_path_uat' (new). Immutable, like every other grant field.
--   * customer_path_uat: ONE approved test identity (non-admin, pilot-invited, never held any grant, no submission,
--     prepared record or live document at creation) bound to ONE committed synthetic fixture fingerprint. The document is
--     the identity's OWN upload through the DOC-1 intake (origin 'owner_upload', consent recorded, never seeded), stored,
--     uploaded after the grant was created, with exactly the granted bytes. The grant is bound to it, once, by the first
--     examination read (inside the access-log guard, under the grant's row lock); afterwards only that document. An
--     operator can never seed under it. Same window (≤ 2 h), nonce, revocation, read budget (≤ 4) and one-new-run limit.
--   * Runs made under it are stamped execution_boundary 'customer_path_synthetic_uat' (never 'operator_synthetic_uat').
--   * Exclusivity is unchanged and spans both kinds: at most one active grant of any kind, never alongside the marker.
--   * The status function also returns grant_kind (still answers only to the grant's single-use code).
--
-- NOT CHANGED: no API role gains any privilege (grants stay unreadable except by code through the status function); the
-- general customer examination authority stays absent — with no marker and no active grant every examination read and
-- run is refused, exactly as before; no route, no live execution, no retention decision.
-- Apply inside a transaction after 20261105000000; afterwards reload the PostgREST schema cache (NOTIFY pgrst, 'reload
-- schema'). ROLLBACK (only while no customer_path_uat grant exists): supabase/operator/creator-record-v2-uat/rollback_20261106.sql.

-- ── 0. Preconditions ───────────────────────────────────────────────────────────────────────────────────────

DO $pre$
DECLARE
  v_def text;
BEGIN
  IF to_regclass('public.creator_record_v2_examination_uat_grants') IS NULL THEN
    RAISE EXCEPTION '20261106000000 requires 20261105000000' USING ERRCODE = 'P0001';
  END IF;
  -- The run authority constraint replaced below must be exactly the 20261105000000 one (or already this file's).
  SELECT pg_get_constraintdef(oid) INTO v_def FROM pg_constraint
   WHERE conrelid = 'public.creator_record_v2_examination_runs'::regclass AND conname = 'creator_record_v2_examination_runs_authority_check';
  IF NOT FOUND OR (v_def <> 'CHECK (((environment_project_ref ~ ''^[a-z0-9]{20}$''::text) AND (((execution_boundary = ''isolated_synthetic_test''::text) AND (uat_grant_id IS NULL) AND (environment_project_ref <> ''lehqgcgnenwdmuzudbrs''::text)) OR ((execution_boundary = ''operator_synthetic_uat''::text) AND (uat_grant_id IS NOT NULL)))))' AND v_def NOT LIKE '%customer_path_synthetic_uat%') THEN
    RAISE EXCEPTION 'unexpected run authority constraint: %', coalesce(v_def, 'absent') USING ERRCODE = 'P0001';
  END IF;
END
$pre$;

-- ── 1. Grant kind ─────────────────────────────────────────────────────────────────────────────────────────
-- A constant default: existing rows (the E4 grant) read 'operator_seed' without a rewrite and without firing the guard.

ALTER TABLE public.creator_record_v2_examination_uat_grants ADD COLUMN IF NOT EXISTS grant_kind text NOT NULL DEFAULT 'operator_seed';
ALTER TABLE public.creator_record_v2_examination_uat_grants DROP CONSTRAINT IF EXISTS creator_record_v2_examination_uat_grants_kind_check;
ALTER TABLE public.creator_record_v2_examination_uat_grants ADD CONSTRAINT creator_record_v2_examination_uat_grants_kind_check
  CHECK (grant_kind IN ('operator_seed', 'customer_path_uat'));

-- Replaces 20261105000000's guard: identity rules per kind; grant_kind is immutable. Otherwise unchanged.
CREATE OR REPLACE FUNCTION public.creator_record_v2_examination_uat_grant_guard()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'an examination UAT grant is never deleted; revoke it' USING ERRCODE = 'P0001';
  END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.created_at := now();
    IF NEW.bound_document_id IS NOT NULL OR NEW.revoked_at IS NOT NULL OR NEW.revoked_by IS NOT NULL OR NEW.revoke_reason IS NOT NULL THEN
      RAISE EXCEPTION 'an examination UAT grant is created unbound and unrevoked' USING ERRCODE = 'P0001';
    END IF;
    PERFORM pg_advisory_xact_lock(hashtextextended('si8.cr_v2_examination_authority', 0));
    IF EXISTS (SELECT 1 FROM public.creator_record_v2_examination_environment) THEN
      RAISE EXCEPTION 'an examination UAT grant cannot coexist with the isolated-test environment marker' USING ERRCODE = 'P0001';
    END IF;
    IF EXISTS (SELECT 1 FROM public.creator_record_v2_examination_uat_grants g WHERE g.revoked_at IS NULL AND g.expires_at > now()) THEN
      RAISE EXCEPTION 'another examination UAT grant is active' USING ERRCODE = 'P0001';
    END IF;
    IF NEW.grant_kind = 'operator_seed' THEN
      -- A dedicated test identity: no admin, no pilot invitation, no customer activity, no document yet.
      IF NOT EXISTS (SELECT 1 FROM public.users u WHERE u.id = NEW.test_user_id AND u.is_admin IS NOT TRUE)
         OR EXISTS (SELECT 1 FROM public.creator_record_v2_pilot_access p WHERE p.user_id = NEW.test_user_id)
         OR EXISTS (SELECT 1 FROM public.submissions s WHERE s.user_id = NEW.test_user_id)
         OR EXISTS (SELECT 1 FROM public.creator_record_v2_prepared r WHERE r.user_id = NEW.test_user_id)
         OR EXISTS (SELECT 1 FROM public.creator_record_v2_documents d WHERE d.user_id = NEW.test_user_id AND d.state <> 'deleted') THEN
        RAISE EXCEPTION 'the test identity must be a dedicated non-admin user with no invitation, submission, prepared record or live document' USING ERRCODE = 'P0001';
      END IF;
    ELSIF NEW.grant_kind = 'customer_path_uat' THEN  -- any other value is refused by the kind CHECK
      -- CR-V2-EXAM-INTEGRATION-X1 (customer_path_uat): an APPROVED test identity — non-admin and pilot-invited (the
      -- customer path is unreachable without an invitation) — that has never held any UAT grant (so no earlier grant's
      -- record is ever reused or mixed) and has no submission, prepared record or live document yet.
      IF NOT EXISTS (SELECT 1 FROM public.users u WHERE u.id = NEW.test_user_id AND u.is_admin IS NOT TRUE)
         OR NOT EXISTS (SELECT 1 FROM public.creator_record_v2_pilot_access p WHERE p.user_id = NEW.test_user_id)
         OR EXISTS (SELECT 1 FROM public.creator_record_v2_examination_uat_grants g WHERE g.test_user_id = NEW.test_user_id)
         OR EXISTS (SELECT 1 FROM public.submissions s WHERE s.user_id = NEW.test_user_id)
         OR EXISTS (SELECT 1 FROM public.creator_record_v2_prepared r WHERE r.user_id = NEW.test_user_id)
         OR EXISTS (SELECT 1 FROM public.creator_record_v2_documents d WHERE d.user_id = NEW.test_user_id AND d.state <> 'deleted') THEN
        RAISE EXCEPTION 'a customer-path test identity must be a pilot-invited non-admin user with no earlier grant, submission, prepared record or live document' USING ERRCODE = 'P0001';
      END IF;
    END IF;
    RETURN NEW;
  END IF;
  -- UPDATE
  IF NEW.id <> OLD.id OR NEW.grant_kind <> OLD.grant_kind OR NEW.test_user_id <> OLD.test_user_id OR NEW.document_sha256 <> OLD.document_sha256
     OR NEW.supabase_project_ref <> OLD.supabase_project_ref OR NEW.binding_nonce_sha256 <> OLD.binding_nonce_sha256
     OR NEW.established_by <> OLD.established_by OR NEW.reason <> OLD.reason OR NEW.change_ref <> OLD.change_ref
     OR NEW.created_at <> OLD.created_at OR NEW.expires_at <> OLD.expires_at
     OR NEW.max_read_events <> OLD.max_read_events OR NEW.max_new_runs <> OLD.max_new_runs THEN
    RAISE EXCEPTION 'an examination UAT grant cannot be changed, extended or widened' USING ERRCODE = 'P0001';
  END IF;
  IF NEW.bound_document_id IS DISTINCT FROM OLD.bound_document_id THEN
    IF OLD.bound_document_id IS NOT NULL OR NEW.bound_document_id IS NULL THEN
      RAISE EXCEPTION 'an examination UAT grant is bound to one document, once' USING ERRCODE = 'P0001';
    END IF;
    IF pg_trigger_depth() < 2 THEN  -- depth 1 = a direct UPDATE; the seed-binding / access-log trigger's UPDATE runs at depth 2
      RAISE EXCEPTION 'an examination UAT grant is bound only by seeding its document' USING ERRCODE = 'P0001';
    END IF;
  END IF;
  IF (NEW.revoked_at, NEW.revoked_by, NEW.revoke_reason) IS DISTINCT FROM (OLD.revoked_at, OLD.revoked_by, OLD.revoke_reason) THEN
    IF OLD.revoked_at IS NOT NULL THEN
      RAISE EXCEPTION 'an examination UAT grant revocation is final' USING ERRCODE = 'P0001';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- ── 2. Seeding stays operator_seed only; the access-log guard binds a customer_path_uat grant ─────────────

CREATE OR REPLACE FUNCTION public.creator_record_v2_documents_seed_binding()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_grant public.creator_record_v2_examination_uat_grants%ROWTYPE;
BEGIN
  IF NEW.origin IS DISTINCT FROM 'operator_synthetic_seed' THEN
    RETURN NEW;
  END IF;
  SELECT * INTO v_grant FROM public.creator_record_v2_examination_uat_grants g WHERE g.id = NEW.seed_grant_id FOR UPDATE;
  IF NOT FOUND OR v_grant.revoked_at IS NOT NULL OR v_grant.expires_at <= now() OR v_grant.grant_kind <> 'operator_seed' THEN
    RAISE EXCEPTION 'operator seeding requires an active examination UAT grant' USING ERRCODE = 'P0001';
  END IF;
  IF v_grant.bound_document_id IS NOT NULL THEN
    RAISE EXCEPTION 'this examination UAT grant is already bound to a document' USING ERRCODE = 'P0001';
  END IF;
  IF NEW.user_id <> v_grant.test_user_id OR NEW.sha256 <> v_grant.document_sha256
     OR EXISTS (SELECT 1 FROM public.creator_record_v2_documents d WHERE d.user_id = NEW.user_id AND d.state <> 'deleted') THEN
    RAISE EXCEPTION 'operator seeding must place the grant''s one synthetic document for its test identity' USING ERRCODE = 'P0001';
  END IF;
  UPDATE public.creator_record_v2_examination_uat_grants SET bound_document_id = NEW.id WHERE id = v_grant.id;
  RETURN NEW;
END;
$$;

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

-- ── 3. Runs: a third boundary, customer_path_synthetic_uat, also bound to its grant ───────────────────────────

ALTER TABLE public.creator_record_v2_examination_runs DROP CONSTRAINT IF EXISTS creator_record_v2_examination_runs_authority_check;
ALTER TABLE public.creator_record_v2_examination_runs ADD CONSTRAINT creator_record_v2_examination_runs_authority_check CHECK (
  environment_project_ref ~ '^[a-z0-9]{20}$' AND (
    (execution_boundary = 'isolated_synthetic_test' AND uat_grant_id IS NULL AND environment_project_ref <> 'lehqgcgnenwdmuzudbrs')
    OR (execution_boundary IN ('operator_synthetic_uat', 'customer_path_synthetic_uat') AND uat_grant_id IS NOT NULL)));

-- Replaces the write path: per-kind document provenance check and boundary stamp. Otherwise unchanged.
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
BEGIN
  -- (a) Execution authority first: exactly one of the marker or an active grant, before anything is parsed.
  SELECT * INTO v_marker FROM public.creator_record_v2_examination_environment WHERE singleton;
  v_has_marker := FOUND;
  IF v_has_marker = EXISTS (SELECT 1 FROM public.creator_record_v2_examination_uat_grants g WHERE g.revoked_at IS NULL AND g.expires_at > now()) THEN
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
     OR (NOT v_has_marker AND v_log.uat_grant_id IS NULL) THEN
    RAISE EXCEPTION 'examination_access_not_logged' USING ERRCODE = 'P0001';
  END IF;
  IF NOT v_has_marker THEN
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
  IF NOT v_has_marker AND (SELECT count(*) FROM public.creator_record_v2_examination_runs r WHERE r.uat_grant_id = v_grant.id) >= v_grant.max_new_runs THEN
    RAISE EXCEPTION 'examination_uat_budget_exhausted' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.creator_record_v2_examination_runs (
    examination_key, document_id, user_id, document_sha256, envelope_version, content_class, workflow_authorization,
    execution_boundary, environment_project_ref, profile_id, profile_version, schema_version, prompt_version,
    executor_mode, replay_set, recording_sha256, replay_fixture_id, outcome_status, outcome_reason,
    envelope_canonical, envelope_sha256, supersedes_id, access_log_id, uat_grant_id)
  VALUES (
    v_key, v_doc.id, v_doc.user_id, v_doc.sha256, 2, 'known_synthetic_fixture', 'not_established',
    CASE WHEN v_has_marker THEN v_marker.environment_kind WHEN v_grant.grant_kind = 'customer_path_uat' THEN 'customer_path_synthetic_uat' ELSE 'operator_synthetic_uat' END,
    CASE WHEN v_has_marker THEN v_marker.supabase_project_ref ELSE v_grant.supabase_project_ref END,
    v_env #>> '{profile,id}', (v_env #>> '{profile,version}')::integer,
    v_env #>> '{profile,schema}', v_env #>> '{profile,prompt}', 'fixture_replay', v_env #>> '{executor,replay_set}',
    v_env #>> '{executor,recording_sha256}', v_fixture.fixture_id, v_env #>> '{outcome,status}', v_env #>> '{outcome,reason}',
    p_envelope, encode(sha256(convert_to(p_envelope, 'UTF8')), 'hex'), CASE WHEN v_has_head THEN v_head.id END, v_log.id,
    CASE WHEN v_has_marker THEN NULL ELSE v_grant.id END)
  RETURNING id INTO v_id;
  RETURN QUERY SELECT v_id, 'created'::text;
END;
$$;

-- ── 4. Status by single-use code: + grant_kind (the return type changes) ──────────────────────────────────

DROP FUNCTION IF EXISTS public.creator_record_v2_examination_uat_status(text);
CREATE FUNCTION public.creator_record_v2_examination_uat_status(p_nonce text)
RETURNS TABLE (grant_id uuid, test_user_id uuid, document_sha256 text, bound_document_id uuid, supabase_project_ref text,
               created_at timestamptz, expires_at timestamptz, active boolean, revoked boolean,
               read_events_used integer, max_read_events integer, new_runs_used integer, max_new_runs integer, grant_kind text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT g.id, g.test_user_id, g.document_sha256::text, g.bound_document_id, g.supabase_project_ref,
         g.created_at, g.expires_at, (g.revoked_at IS NULL AND g.expires_at > now()), g.revoked_at IS NOT NULL,
         (SELECT count(*) FROM public.creator_record_v2_evidence_access_log l WHERE l.uat_grant_id = g.id)::integer, g.max_read_events,
         (SELECT count(*) FROM public.creator_record_v2_examination_runs r WHERE r.uat_grant_id = g.id)::integer, g.max_new_runs, g.grant_kind
    FROM public.creator_record_v2_examination_uat_grants g
   WHERE p_nonce IS NOT NULL AND length(p_nonce) BETWEEN 32 AND 256
     AND g.binding_nonce_sha256 = encode(sha256(convert_to(p_nonce, 'UTF8')), 'hex')
$$;

-- ── 5. Access: unchanged — RLS on, no policies, nothing for any API role except the status function ─────────

REVOKE ALL ON TABLE public.creator_record_v2_examination_uat_grants FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.creator_record_v2_examination_uat_grant_guard() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.creator_record_v2_documents_seed_binding() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.creator_record_v2_evidence_access_log_insert_guard() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.creator_record_v2_record_examination(bigint, text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.creator_record_v2_examination_uat_status(text) FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.creator_record_v2_record_examination(bigint, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.creator_record_v2_examination_uat_status(text) TO service_role;
