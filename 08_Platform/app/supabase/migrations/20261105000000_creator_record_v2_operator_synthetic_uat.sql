-- CR-V2-PROD-UAT-B — Creator Record v2 examination: operator-controlled synthetic UAT authority + document provenance.
-- Requires 20261103000000 (DOC-1) and 20261104000000 (DOC-2C-B). Never re-apply 20261104000000 after this file: that
-- would restore its write function and access-log guard, which know nothing of grants (they would refuse every
-- grant-path read and run — fail closed, but not this contract).
--
-- WHAT THIS ADDS
--   * DOCUMENT PROVENANCE. creator_record_v2_documents.origin: 'owner_upload' (the DOC-1 intake: the owner uploaded the
--     file after the consent step; consent_version required, exactly as before) or 'operator_synthetic_seed' (an SI8
--     operator placed one committed synthetic fixture for a designated test identity under a UAT grant; NO consent
--     value — the owner gave none, and none is invented). seed_grant_id names that grant. Provenance never changes.
--   * HISTORICAL ROWS. Existing rows become 'owner_upload' only if each carries the one consent value the DOC-1 intake
--     ever writes. Otherwise this migration REFUSES (nothing is classified). This is CONSISTENCY EVIDENCE only: a row
--     is consistent with having been written by the DOC-1 intake. It is not proof that any user completed a consent
--     step, and a row written by hand with that value cannot be told apart.
--   * NO REMOVAL BY APPLICATION ROLES. An operator-seeded document row is never deleted, or marked deleted, by an
--     application role (service_role, authenticated, anon) — so ordinary DOC-1 cleanup (cleanupEvidence) or the DOC-1
--     delete route can never silently remove it or, through it, its object. Only the database operator can, as a
--     separate governed decision. This is an authority rule, not a retention rule: nothing requires keeping it.
--   * OPERATOR SYNTHETIC UAT GRANT (creator_record_v2_examination_uat_grants). Created and revoked only by the database
--     operator; no API role holds any privilege on it. One test identity, one committed synthetic fixture (by SHA-256),
--     at most 2 hours, at most 4 examination-read events, at most 1 newly saved run. A grant is bound to the one
--     document seeded under it, once, by the database (never re-pointed, even if that seed later fails). Revocation is
--     a one-time update and deletes nothing.
--   * MUTUAL EXCLUSION. The isolated-test environment marker (20261104000000, unchanged) and an active grant can never
--     coexist: both inserts take the same transaction lock and refuse while the other exists; every examination read
--     and run is refused when both (or neither) are present.
--   * BUDGET. The unit is an examination-purpose access event written under the grant (the access-log guard counts them
--     under a row lock on the grant). It bounds what the examination adapter may read, because the adapter reads only
--     after writing that event. It is NOT a limit on Supabase Storage access in general: the service role (DOC-1
--     download route, admin reads) can read objects without this mechanism, as it always could.
--   * RUN STAMP. Runs carry execution_boundary 'operator_synthetic_uat', the grant's project ref and uat_grant_id. The
--     isolated path stamps exactly what 20261104000000 stamped. Examination envelope v2 is unchanged.
--
-- UNCHANGED (DOC-1 privilege boundary): creator_record_v2_documents_guard() (SECURITY INVOKER), the DOC-1 shared
-- append-only guard, creator_record_v2_prepared_documents_link(), every DOC-1 grant. New behaviour on DOC-1 tables comes
-- only from NEW triggers: a SECURITY INVOKER provenance guard (immutability; no removal of seeded rows by application
-- roles), a narrowly scoped SECURITY DEFINER seed-binding trigger
-- (acts only on operator-seeded rows; reads, locks and binds the grant; trigger functions cannot be called directly),
-- and a SECURITY INVOKER guard keeping operator-seeded documents out of prepared records.
--
-- TRUST LIMITS: the database cannot observe which project it runs in — supabase_project_ref records the operator's
-- verified claim (see supabase/operator/creator-record-v2-uat). The database operator (postgres) can bypass all of this.
--
-- Not decided here (therefore not possible): retention, expiry or deletion of documents, events, runs or grants;
-- customer authority; live execution. Apply inside the transactional wrapper; run supabase/verification/
-- cr-v2-uat-preflight first; afterwards reload the PostgREST schema cache (NOTIFY pgrst, 'reload schema'). ROLLBACK (only while no grant exists): see the runbook in supabase/operator/creator-record-v2-uat.

-- ── 0. Preconditions: refuse rather than misclassify or overwrite an unexpected schema ─────────────────────

LOCK TABLE public.creator_record_v2_documents IN SHARE ROW EXCLUSIVE MODE;

DO $pre$
DECLARE
  v_def text;
BEGIN
  IF to_regclass('public.creator_record_v2_examination_runs') IS NULL OR to_regclass('public.creator_record_v2_documents') IS NULL THEN
    RAISE EXCEPTION '20261105000000 requires 20261103000000 and 20261104000000' USING ERRCODE = 'P0001';
  END IF;
  -- First application only: historical document provenance must be establishable.
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'public' AND table_name = 'creator_record_v2_documents' AND column_name = 'origin') THEN
    IF EXISTS (SELECT 1 FROM public.creator_record_v2_documents
               WHERE consent_version IS DISTINCT FROM 'DRAFT-UNAPPROVED-cr-v2-evidence-storage-consent-0') THEN
      RAISE EXCEPTION 'historical document provenance cannot be established: a document does not carry the only consent value the DOC-1 intake writes; refusing to classify it' USING ERRCODE = 'P0001';
    END IF;
  END IF;
  -- The two DOC-2C-B run constraints replaced below must be exactly as committed (or already replaced).
  SELECT pg_get_constraintdef(oid) INTO v_def FROM pg_constraint
   WHERE conrelid = 'public.creator_record_v2_examination_runs'::regclass AND conname = 'creator_record_v2_examination_runs_execution_boundary_check';
  IF FOUND AND v_def <> 'CHECK ((execution_boundary = ''isolated_synthetic_test''::text))' THEN
    RAISE EXCEPTION 'unexpected execution_boundary constraint: %', v_def USING ERRCODE = 'P0001';
  END IF;
  SELECT pg_get_constraintdef(oid) INTO v_def FROM pg_constraint
   WHERE conrelid = 'public.creator_record_v2_examination_runs'::regclass AND conname = 'creator_record_v2_examination_run_environment_project_ref_check';
  IF FOUND AND v_def <> 'CHECK (((environment_project_ref ~ ''^[a-z0-9]{20}$''::text) AND (environment_project_ref <> ''lehqgcgnenwdmuzudbrs''::text)))' THEN
    RAISE EXCEPTION 'unexpected environment_project_ref constraint: %', v_def USING ERRCODE = 'P0001';
  END IF;
END
$pre$;

-- ── 1. The operator synthetic UAT grant ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.creator_record_v2_examination_uat_grants (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_user_id          uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  document_sha256       char(64) NOT NULL REFERENCES public.creator_record_v2_synthetic_fixtures(sha256) ON DELETE RESTRICT,
  bound_document_id     uuid,
  supabase_project_ref  text NOT NULL CHECK (supabase_project_ref ~ '^[a-z0-9]{20}$'),
  binding_nonce_sha256  char(64) NOT NULL UNIQUE CHECK (binding_nonce_sha256 ~ '^[0-9a-f]{64}$'),
  established_by        text NOT NULL CHECK (length(trim(established_by)) > 0),
  reason                text NOT NULL CHECK (length(trim(reason)) > 0),
  change_ref            text NOT NULL CHECK (length(trim(change_ref)) > 0),
  created_at            timestamptz NOT NULL DEFAULT now(),
  expires_at            timestamptz NOT NULL,
  max_read_events       integer NOT NULL CHECK (max_read_events BETWEEN 1 AND 4),
  max_new_runs          integer NOT NULL DEFAULT 1 CHECK (max_new_runs = 1),
  revoked_at            timestamptz,
  revoked_by            text CHECK (revoked_by IS NULL OR length(trim(revoked_by)) > 0),
  revoke_reason         text CHECK (revoke_reason IS NULL OR length(trim(revoke_reason)) > 0),
  CHECK (expires_at > created_at AND expires_at <= created_at + interval '2 hours'),
  CHECK ((revoked_at IS NULL) = (revoked_by IS NULL) AND (revoked_at IS NULL) = (revoke_reason IS NULL))
);
CREATE INDEX IF NOT EXISTS creator_record_v2_examination_uat_grants_open_idx
  ON public.creator_record_v2_examination_uat_grants (expires_at) WHERE revoked_at IS NULL;

-- Written only by the database operator (no API privilege). Created unbound and unrevoked; afterwards only two
-- changes exist: the database binds it to its seeded document (once, from the seed-binding trigger only), and the
-- operator revokes it (once). It is never deleted, extended, widened or re-pointed.
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
    -- A dedicated test identity: no admin, no pilot invitation, no customer activity, no document yet.
    IF NOT EXISTS (SELECT 1 FROM public.users u WHERE u.id = NEW.test_user_id AND u.is_admin IS NOT TRUE)
       OR EXISTS (SELECT 1 FROM public.creator_record_v2_pilot_access p WHERE p.user_id = NEW.test_user_id)
       OR EXISTS (SELECT 1 FROM public.submissions s WHERE s.user_id = NEW.test_user_id)
       OR EXISTS (SELECT 1 FROM public.creator_record_v2_prepared r WHERE r.user_id = NEW.test_user_id)
       OR EXISTS (SELECT 1 FROM public.creator_record_v2_documents d WHERE d.user_id = NEW.test_user_id AND d.state <> 'deleted') THEN
      RAISE EXCEPTION 'the test identity must be a dedicated non-admin user with no invitation, submission, prepared record or live document' USING ERRCODE = 'P0001';
    END IF;
    RETURN NEW;
  END IF;
  -- UPDATE
  IF NEW.id <> OLD.id OR NEW.test_user_id <> OLD.test_user_id OR NEW.document_sha256 <> OLD.document_sha256
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
    IF pg_trigger_depth() < 2 THEN  -- depth 1 = a direct UPDATE; the seed-binding trigger's UPDATE runs at depth 2
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
DROP TRIGGER IF EXISTS creator_record_v2_examination_uat_grant_guard ON public.creator_record_v2_examination_uat_grants;
CREATE TRIGGER creator_record_v2_examination_uat_grant_guard
  BEFORE INSERT OR UPDATE OR DELETE ON public.creator_record_v2_examination_uat_grants
  FOR EACH ROW EXECUTE FUNCTION public.creator_record_v2_examination_uat_grant_guard();

-- The 20261104000000 marker table is unchanged; this NEW trigger refuses a marker while a grant is active.
CREATE OR REPLACE FUNCTION public.creator_record_v2_examination_environment_exclusivity()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('si8.cr_v2_examination_authority', 0));
  IF EXISTS (SELECT 1 FROM public.creator_record_v2_examination_uat_grants g WHERE g.revoked_at IS NULL AND g.expires_at > now()) THEN
    RAISE EXCEPTION 'the isolated-test environment marker cannot coexist with an active examination UAT grant' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS creator_record_v2_examination_environment_exclusivity ON public.creator_record_v2_examination_environment;
CREATE TRIGGER creator_record_v2_examination_environment_exclusivity
  BEFORE INSERT ON public.creator_record_v2_examination_environment
  FOR EACH ROW EXECUTE FUNCTION public.creator_record_v2_examination_environment_exclusivity();

-- ── 2. Document provenance (DOC-1 table; DOC-1 functions unchanged) ─────────────────────────────────────

ALTER TABLE public.creator_record_v2_documents ADD COLUMN IF NOT EXISTS origin text NOT NULL DEFAULT 'owner_upload';
ALTER TABLE public.creator_record_v2_documents ADD COLUMN IF NOT EXISTS seed_grant_id uuid
  REFERENCES public.creator_record_v2_examination_uat_grants(id) ON DELETE RESTRICT;
ALTER TABLE public.creator_record_v2_documents ALTER COLUMN consent_version DROP NOT NULL;
-- The DOC-1 non-empty consent CHECK stays; this pairs origin with consent and the seeding grant.
ALTER TABLE public.creator_record_v2_documents DROP CONSTRAINT IF EXISTS creator_record_v2_documents_provenance_check;
ALTER TABLE public.creator_record_v2_documents ADD CONSTRAINT creator_record_v2_documents_provenance_check CHECK (
  (origin = 'owner_upload' AND consent_version IS NOT NULL AND seed_grant_id IS NULL)
  OR (origin = 'operator_synthetic_seed' AND consent_version IS NULL AND seed_grant_id IS NOT NULL));
CREATE UNIQUE INDEX IF NOT EXISTS creator_record_v2_documents_seed_grant_idx
  ON public.creator_record_v2_documents (seed_grant_id) WHERE seed_grant_id IS NOT NULL;

-- Provenance is immutable. (The DOC-1 guard compares consent_version with <>, which a NULL would slip past.)
-- Operator-seeded rows are never removed by an application role (DOC-1 cleanup and delete route); the database
-- operator still can. Owner uploads keep exactly the DOC-1 deletion rules.
CREATE OR REPLACE FUNCTION public.creator_record_v2_documents_provenance_guard()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.origin = 'operator_synthetic_seed' AND current_user IN ('service_role', 'authenticated', 'anon') THEN
      RAISE EXCEPTION 'an operator-seeded synthetic document is removed only by the database operator' USING ERRCODE = 'P0001';
    END IF;
    RETURN OLD;
  END IF;
  IF OLD.origin = 'operator_synthetic_seed' AND NEW.state = 'deleted' AND OLD.state <> 'deleted'
     AND current_user IN ('service_role', 'authenticated', 'anon') THEN
    RAISE EXCEPTION 'an operator-seeded synthetic document is removed only by the database operator' USING ERRCODE = 'P0001';
  END IF;
  IF NEW.origin IS DISTINCT FROM OLD.origin OR NEW.seed_grant_id IS DISTINCT FROM OLD.seed_grant_id
     OR NEW.consent_version IS DISTINCT FROM OLD.consent_version THEN
    RAISE EXCEPTION 'document provenance is immutable' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS creator_record_v2_documents_provenance_guard ON public.creator_record_v2_documents;
CREATE TRIGGER creator_record_v2_documents_provenance_guard
  BEFORE UPDATE OR DELETE ON public.creator_record_v2_documents
  FOR EACH ROW EXECUTE FUNCTION public.creator_record_v2_documents_provenance_guard();

-- SECURITY DEFINER, deliberately narrow: owner uploads return immediately; for an operator-seeded row it reads and
-- locks the named grant (which no API role can read) and binds it to this document, once. It cannot be called
-- directly (a trigger function), EXECUTE is revoked, and it changes nothing on the document row.
CREATE OR REPLACE FUNCTION public.creator_record_v2_documents_seed_binding()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_grant public.creator_record_v2_examination_uat_grants%ROWTYPE;
BEGIN
  IF NEW.origin IS DISTINCT FROM 'operator_synthetic_seed' THEN
    RETURN NEW;
  END IF;
  SELECT * INTO v_grant FROM public.creator_record_v2_examination_uat_grants g WHERE g.id = NEW.seed_grant_id FOR UPDATE;
  IF NOT FOUND OR v_grant.revoked_at IS NOT NULL OR v_grant.expires_at <= now() THEN
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
DROP TRIGGER IF EXISTS creator_record_v2_documents_seed_binding ON public.creator_record_v2_documents;
CREATE TRIGGER creator_record_v2_documents_seed_binding
  BEFORE INSERT ON public.creator_record_v2_documents
  FOR EACH ROW EXECUTE FUNCTION public.creator_record_v2_documents_seed_binding();

-- Operator-seeded documents never enter a customer prepared record. References are written only by the DOC-1
-- SECURITY DEFINER link function (the service role holds SELECT only), so this fires inside it.
CREATE OR REPLACE FUNCTION public.creator_record_v2_prepared_documents_origin_guard()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.creator_record_v2_documents d WHERE d.id = NEW.document_id AND d.origin <> 'owner_upload') THEN
    RAISE EXCEPTION 'an operator-seeded synthetic document cannot enter a prepared record' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS creator_record_v2_prepared_documents_origin_guard ON public.creator_record_v2_prepared_documents;
CREATE TRIGGER creator_record_v2_prepared_documents_origin_guard
  BEFORE INSERT ON public.creator_record_v2_prepared_documents
  FOR EACH ROW EXECUTE FUNCTION public.creator_record_v2_prepared_documents_origin_guard();

-- ── 3. Access log: examination events carry the grant they consumed ─────────────────────────────────────

ALTER TABLE public.creator_record_v2_evidence_access_log ADD COLUMN IF NOT EXISTS uat_grant_id uuid
  REFERENCES public.creator_record_v2_examination_uat_grants(id) ON DELETE RESTRICT;
ALTER TABLE public.creator_record_v2_evidence_access_log DROP CONSTRAINT IF EXISTS creator_record_v2_evidence_access_log_uat_grant_check;
ALTER TABLE public.creator_record_v2_evidence_access_log ADD CONSTRAINT creator_record_v2_evidence_access_log_uat_grant_check
  CHECK (uat_grant_id IS NULL OR purpose = 'examination');
CREATE INDEX IF NOT EXISTS creator_record_v2_evidence_access_log_uat_grant_idx
  ON public.creator_record_v2_evidence_access_log (uat_grant_id) WHERE uat_grant_id IS NOT NULL;

-- Replaces the 20261104000000 guard. Marker only: exactly its behaviour. Grant only: the grant's one document, its
-- test identity, an operator-seeded row, and an event budget counted under the grant's row lock. Both or neither:
-- refused. The caller can never choose uat_grant_id.
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
      IF NEW.actor_user_id <> v_grant.test_user_id OR v_grant.bound_document_id IS DISTINCT FROM NEW.document_id
         OR v_doc.origin <> 'operator_synthetic_seed' OR v_doc.seed_grant_id IS DISTINCT FROM v_grant.id
         OR v_doc.sha256 <> v_grant.document_sha256 THEN
        RAISE EXCEPTION 'examination_uat_target_mismatch' USING ERRCODE = 'P0001';
      END IF;
      SELECT count(*) INTO v_used FROM public.creator_record_v2_evidence_access_log l WHERE l.uat_grant_id = v_grant.id;
      IF v_used >= v_grant.max_read_events THEN
        RAISE EXCEPTION 'examination_uat_budget_exhausted' USING ERRCODE = 'P0001';
      END IF;
      NEW.uat_grant_id := v_grant.id;
    END IF;
  END IF;
  RETURN NEW;  -- 'file_download' rows: as before (uat_grant_id is always NULL)
END;
$$;

-- ── 4. Runs: a second, operator-UAT boundary bound to its grant ─────────────────────────────────────────

ALTER TABLE public.creator_record_v2_examination_runs ADD COLUMN IF NOT EXISTS uat_grant_id uuid
  REFERENCES public.creator_record_v2_examination_uat_grants(id) ON DELETE RESTRICT;
ALTER TABLE public.creator_record_v2_examination_runs DROP CONSTRAINT IF EXISTS creator_record_v2_examination_runs_execution_boundary_check;
ALTER TABLE public.creator_record_v2_examination_runs DROP CONSTRAINT IF EXISTS creator_record_v2_examination_run_environment_project_ref_check;
ALTER TABLE public.creator_record_v2_examination_runs DROP CONSTRAINT IF EXISTS creator_record_v2_examination_runs_authority_check;
ALTER TABLE public.creator_record_v2_examination_runs ADD CONSTRAINT creator_record_v2_examination_runs_authority_check CHECK (
  environment_project_ref ~ '^[a-z0-9]{20}$' AND (
    (execution_boundary = 'isolated_synthetic_test' AND uat_grant_id IS NULL AND environment_project_ref <> 'lehqgcgnenwdmuzudbrs')
    OR (execution_boundary = 'operator_synthetic_uat' AND uat_grant_id IS NOT NULL)));
CREATE INDEX IF NOT EXISTS creator_record_v2_examination_runs_uat_grant_idx
  ON public.creator_record_v2_examination_runs (uat_grant_id) WHERE uat_grant_id IS NOT NULL;

-- ── 5. The only write path (replaces 20261104000000's; same signature, refusals and checks (b)–(g)) ──────
-- Authority: exactly one of the marker or an active grant. Grant path: the event must have been issued under that
-- grant, which must still be active; the document must be its operator-seeded one; at most max_new_runs new runs.
-- Added refusals (P0001): examination_uat_target_mismatch, examination_uat_budget_exhausted.

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
  IF NOT v_has_marker AND (v_doc.origin <> 'operator_synthetic_seed' OR v_doc.seed_grant_id IS DISTINCT FROM v_grant.id
                           OR v_doc.sha256 <> v_grant.document_sha256) THEN
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
    CASE WHEN v_has_marker THEN v_marker.environment_kind ELSE 'operator_synthetic_uat' END,
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

-- ── 6. Operator target binding: status by single-use code (no other API access to grants) ───────────────
-- Answers only when the caller presents the code whose SHA-256 the operator stored in the grant: it lets the operator
-- script confirm it reaches the same database where the grant was created. Reveals nothing about the marker.

CREATE OR REPLACE FUNCTION public.creator_record_v2_examination_uat_status(p_nonce text)
RETURNS TABLE (grant_id uuid, test_user_id uuid, document_sha256 text, bound_document_id uuid, supabase_project_ref text,
               created_at timestamptz, expires_at timestamptz, active boolean, revoked boolean,
               read_events_used integer, max_read_events integer, new_runs_used integer, max_new_runs integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT g.id, g.test_user_id, g.document_sha256::text, g.bound_document_id, g.supabase_project_ref,
         g.created_at, g.expires_at, (g.revoked_at IS NULL AND g.expires_at > now()), g.revoked_at IS NOT NULL,
         (SELECT count(*) FROM public.creator_record_v2_evidence_access_log l WHERE l.uat_grant_id = g.id)::integer, g.max_read_events,
         (SELECT count(*) FROM public.creator_record_v2_examination_runs r WHERE r.uat_grant_id = g.id)::integer, g.max_new_runs
    FROM public.creator_record_v2_examination_uat_grants g
   WHERE p_nonce IS NOT NULL AND length(p_nonce) BETWEEN 32 AND 256
     AND g.binding_nonce_sha256 = encode(sha256(convert_to(p_nonce, 'UTF8')), 'hex')
$$;

-- ── 7. Access: RLS on, no policies; nothing new for any API role except the status function ─────────────

ALTER TABLE public.creator_record_v2_examination_uat_grants ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.creator_record_v2_examination_uat_grants FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.creator_record_v2_examination_uat_grant_guard() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.creator_record_v2_examination_environment_exclusivity() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.creator_record_v2_documents_provenance_guard() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.creator_record_v2_documents_seed_binding() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.creator_record_v2_prepared_documents_origin_guard() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.creator_record_v2_evidence_access_log_insert_guard() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.creator_record_v2_record_examination(bigint, text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.creator_record_v2_examination_uat_status(text) FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.creator_record_v2_record_examination(bigint, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.creator_record_v2_examination_uat_status(text) TO service_role;
