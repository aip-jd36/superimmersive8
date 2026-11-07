-- CR-V2-MVP-LAUNCH-FOUNDATION-1 — Decision 8Q: permission for AI examination, separate from the permission to store a document.
--
-- NOT APPLIED ANYWHERE. Tested on disposable local PostgreSQL only. Requires 20261111000000 (consent withdrawal and its lock), so
-- the Production order is 20261108 → 20261110 → 20261111 → 20261112.
--
-- Storage permission is unchanged: it is the consent identifier recorded on each document at upload. AI-examination permission is
-- new and separate: an explicit, versioned grant by the document's owner, for that one document, recorded before any model reads it.
--   * creator_record_v2_ai_examination_permissions: append-only. One row per (document, permission version). Written only by
--     creator_record_v2_grant_ai_examination_permission().
--   * The grant is refused for a document under withdrawn consent (20261111: a withdrawal at or after the document's upload), so a
--     withdrawal can never be followed by a fresh permission for the same document — not automatically, not on request. A later
--     upload is a different document and needs its own grant. A grant covers one document only: it never reaches another document,
--     another creator, or any prepared version (a record's readings stay governed by their own provenance).
--   * Enforced in the database before any AI processing: a `live_examination` read, a customer live reservation and a `live_model`
--     attempt each require a grant for that document by its owner. Replay examination (recorded synthetic test data, no model) is
--     not AI examination and is unchanged.
--   * Concurrency: the grant takes the creator's consent lock SHARED, like every examination write; a withdrawal takes it EXCLUSIVE.
--     A grant either committed before the withdrawal (and is then overridden by the 20261111 guards) or sees it and is refused.
-- Nothing here changes payment, binding, issuance, retention, deletion or holds.

DO $pre$
BEGIN
  IF to_regclass('public.creator_record_v2_consent_withdrawals') IS NULL
     OR to_regprocedure('public.creator_record_v2_document_consent_withdrawn(uuid)') IS NULL THEN
    RAISE EXCEPTION '20261112000000 requires 20261111000000' USING ERRCODE = 'P0001';
  END IF;
END
$pre$;

CREATE TABLE public.creator_record_v2_ai_examination_permissions (
  id                  bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id             uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  document_id         uuid NOT NULL REFERENCES public.creator_record_v2_documents(id) ON DELETE RESTRICT,
  permission_version  text NOT NULL CHECK (permission_version ~ '^[A-Za-z0-9][A-Za-z0-9._-]{0,119}$'),
  granted_at          timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE (document_id, permission_version)
);
CREATE INDEX creator_record_v2_ai_examination_permissions_owner_idx ON public.creator_record_v2_ai_examination_permissions (user_id, document_id);
CREATE TRIGGER creator_record_v2_ai_examination_permissions_append_only
  BEFORE UPDATE OR DELETE ON public.creator_record_v2_ai_examination_permissions
  FOR EACH ROW EXECUTE FUNCTION public.creator_record_v2_examination_append_only_guard();

-- The owner grants permission for one of their own stored uploads. Idempotent per (document, version): 'granted' or 'existing'.
-- Refusals (P0001): creator_record_v2_retention_not_found (not the owner's stored upload), creator_record_v2_ai_permission_invalid,
-- creator_record_v2_ai_permission_withdrawn.
CREATE OR REPLACE FUNCTION public.creator_record_v2_grant_ai_examination_permission(p_user_id uuid, p_document_id uuid, p_permission_version text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_doc public.creator_record_v2_documents%ROWTYPE;
BEGIN
  IF p_permission_version IS NULL OR p_permission_version !~ '^[A-Za-z0-9][A-Za-z0-9._-]{0,119}$' THEN
    RAISE EXCEPTION 'creator_record_v2_ai_permission_invalid' USING ERRCODE = 'P0001';
  END IF;
  SELECT * INTO v_doc FROM public.creator_record_v2_documents d WHERE d.id = p_document_id;
  IF NOT FOUND OR p_user_id IS NULL OR v_doc.user_id <> p_user_id OR v_doc.origin <> 'owner_upload' OR v_doc.state <> 'stored' THEN
    RAISE EXCEPTION 'creator_record_v2_retention_not_found' USING ERRCODE = 'P0001';
  END IF;
  PERFORM pg_advisory_xact_lock_shared(hashtextextended('si8.cr_v2_consent:' || v_doc.user_id::text, 0));
  IF public.creator_record_v2_document_consent_withdrawn(v_doc.id) THEN
    RAISE EXCEPTION 'creator_record_v2_ai_permission_withdrawn' USING ERRCODE = 'P0001';
  END IF;
  IF EXISTS (SELECT 1 FROM public.creator_record_v2_ai_examination_permissions p WHERE p.document_id = v_doc.id AND p.permission_version = p_permission_version) THEN
    RETURN 'existing';
  END IF;
  INSERT INTO public.creator_record_v2_ai_examination_permissions (user_id, document_id, permission_version) VALUES (v_doc.user_id, v_doc.id, p_permission_version);
  RETURN 'granted';
END;
$$;

-- No AI examination without the owner's grant for that document. (Withdrawal is enforced by the 20261111 guards on the same rows.)
CREATE OR REPLACE FUNCTION public.creator_record_v2_ai_permission_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF TG_TABLE_NAME = 'creator_record_v2_evidence_access_log' THEN
    IF NEW.purpose <> 'live_examination' THEN
      RETURN NEW;   -- file downloads and replay examination are not AI examination
    END IF;
  ELSIF TG_TABLE_NAME = 'creator_record_v2_live_examination_attempts' THEN
    IF NEW.execution_origin IS DISTINCT FROM 'live_model' THEN
      RETURN NEW;   -- the test-only mock shape
    END IF;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.creator_record_v2_documents d
                   JOIN public.creator_record_v2_ai_examination_permissions p ON p.document_id = d.id AND p.user_id = d.user_id
                  WHERE d.id = NEW.document_id) THEN
    RAISE EXCEPTION 'creator_record_v2_ai_permission_required' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER creator_record_v2_evidence_access_log_ai_permission_guard
  BEFORE INSERT ON public.creator_record_v2_evidence_access_log
  FOR EACH ROW EXECUTE FUNCTION public.creator_record_v2_ai_permission_guard();
CREATE TRIGGER creator_record_v2_customer_live_reservations_ai_permission_guard
  BEFORE INSERT ON public.creator_record_v2_customer_live_reservations
  FOR EACH ROW EXECUTE FUNCTION public.creator_record_v2_ai_permission_guard();
CREATE TRIGGER creator_record_v2_live_examination_attempts_ai_permission_guard
  BEFORE INSERT ON public.creator_record_v2_live_examination_attempts
  FOR EACH ROW EXECUTE FUNCTION public.creator_record_v2_ai_permission_guard();

-- The creator's own consent state, for their dashboard (read-only): the latest withdrawal, if any.
CREATE OR REPLACE FUNCTION public.creator_record_v2_consent_state(p_user_id uuid)
RETURNS TABLE (withdrawn boolean, withdrawn_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT max(w.withdrawn_at) IS NOT NULL, max(w.withdrawn_at) FROM public.creator_record_v2_consent_withdrawals w WHERE w.user_id = p_user_id
$$;

-- Whether a prepared version is paused by withdrawn consent (a referenced document is covered). Read-only, for the dashboard.
CREATE OR REPLACE FUNCTION public.creator_record_v2_prepared_consent_paused(p_prepared_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT EXISTS (SELECT 1 FROM public.creator_record_v2_prepared_documents pd
                  WHERE pd.prepared_id = p_prepared_id AND public.creator_record_v2_document_consent_withdrawn(pd.document_id))
$$;

ALTER TABLE public.creator_record_v2_ai_examination_permissions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.creator_record_v2_ai_examination_permissions FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON TABLE public.creator_record_v2_ai_examination_permissions TO service_role;
REVOKE ALL ON FUNCTION public.creator_record_v2_grant_ai_examination_permission(uuid, uuid, text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.creator_record_v2_ai_permission_guard() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.creator_record_v2_consent_state(uuid) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.creator_record_v2_prepared_consent_paused(uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.creator_record_v2_grant_ai_examination_permission(uuid, uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.creator_record_v2_consent_state(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.creator_record_v2_prepared_consent_paused(uuid) TO service_role;
