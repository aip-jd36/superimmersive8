-- CR-V2-DOC-1 — Creator Record v2 private evidence intake (documents, prepared-version references, access log).
--
-- ADDITIVE ONLY. Requires 20261101000000 (M2) and 20261102000000 (M3). No existing table, column, row,
-- policy, grant or function is changed; a new AFTER INSERT trigger is added to creator_record_v2_prepared.
--
--   * storage bucket `creator-record-evidence`: private; PDF, PNG and JPEG only; 4 MB per object. No storage
--     policy is created, so only the service role (server code) can read or write it.
--   * creator_record_v2_documents: one row per stored document, owned by one creator. Content columns are
--     immutable. Life cycle: pending (upload in progress) -> stored -> deleted. A pending row may be removed
--     (failed or abandoned upload); a stored row is never removed, only marked deleted, and only while no
--     prepared version references it. One live (non-deleted) row per creator and SHA-256 (deduplication).
--   * creator_record_v2_prepared_documents: which prepared version references which document, derived by the
--     database from the version's own canonical record at insert (documents.items). A reference to a document
--     that is not the same creator's, not stored, or whose SHA-256 differs refuses the whole insert.
--   * creator_record_v2_evidence_access_log: append-only record of every file read (owner or admin).
--
-- Not decided here (and therefore not possible): deleting a referenced document, automatic retention or
-- expiry, and any examination. A referenced document is retained.
--
-- ROLLBACK (only before any document exists): drop the four objects below and the trigger; remove the bucket
-- from the dashboard once empty.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('creator-record-evidence', 'creator-record-evidence', false, 4194304, ARRAY['application/pdf', 'image/png', 'image/jpeg'])
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.creator_record_v2_documents (
  id                 uuid PRIMARY KEY,
  user_id            uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  sha256             char(64) NOT NULL CHECK (sha256 ~ '^[0-9a-f]{64}$'),
  media_type         text NOT NULL CHECK (media_type IN ('application/pdf', 'image/png', 'image/jpeg')),
  byte_size          integer NOT NULL CHECK (byte_size > 0 AND byte_size <= 4194304),
  file_name          text NOT NULL CHECK (length(file_name) BETWEEN 1 AND 120),
  storage_path       text NOT NULL UNIQUE,
  consent_version    text NOT NULL CHECK (length(trim(consent_version)) > 0),
  state              text NOT NULL CHECK (state IN ('pending', 'stored', 'deleted')),
  created_at         timestamptz NOT NULL DEFAULT now(),
  stored_at          timestamptz,
  deleted_at         timestamptz,
  object_removed_at  timestamptz,
  CHECK (storage_path = user_id::text || '/' || id::text),
  CHECK ((state = 'pending') = (stored_at IS NULL)),
  CHECK ((state = 'deleted') = (deleted_at IS NOT NULL)),
  CHECK (object_removed_at IS NULL OR state = 'deleted')
);

-- At most one live document per creator and content: concurrent uploads of the same bytes converge on one row.
CREATE UNIQUE INDEX IF NOT EXISTS creator_record_v2_documents_live_sha_idx
  ON public.creator_record_v2_documents (user_id, sha256) WHERE state <> 'deleted';
CREATE INDEX IF NOT EXISTS creator_record_v2_documents_owner_idx
  ON public.creator_record_v2_documents (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.creator_record_v2_prepared_documents (
  prepared_id  uuid NOT NULL REFERENCES public.creator_record_v2_prepared(id) ON DELETE CASCADE,
  document_id  uuid NOT NULL REFERENCES public.creator_record_v2_documents(id) ON DELETE RESTRICT,
  sha256       char(64) NOT NULL,
  PRIMARY KEY (prepared_id, document_id)
);
CREATE INDEX IF NOT EXISTS creator_record_v2_prepared_documents_document_idx
  ON public.creator_record_v2_prepared_documents (document_id);

CREATE TABLE IF NOT EXISTS public.creator_record_v2_evidence_access_log (
  id             bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  document_id    uuid NOT NULL REFERENCES public.creator_record_v2_documents(id) ON DELETE RESTRICT,
  actor_user_id  uuid NOT NULL,
  actor_role     text NOT NULL CHECK (actor_role IN ('owner', 'admin')),
  accessed_at    timestamptz NOT NULL DEFAULT now()
);

-- ── Document guard: immutable content, legal transitions, referenced documents retained ──────────────

CREATE OR REPLACE FUNCTION public.creator_record_v2_documents_guard()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.state <> 'pending' OR NEW.stored_at IS NOT NULL OR NEW.deleted_at IS NOT NULL OR NEW.object_removed_at IS NOT NULL THEN
      RAISE EXCEPTION 'a document is inserted as pending' USING ERRCODE = 'P0001';
    END IF;
    -- Quota (CR-V2-DOC-1B): at most 24 live (pending or stored) documents per creator. Inserts for one creator
    -- are serialized, and the count is taken after the lock, so concurrent uploads cannot exceed it. Distinct
    -- SQLSTATE so the server can tell "quota" from any other refusal.
    PERFORM pg_advisory_xact_lock(hashtextextended('si8.cr_v2_evidence_quota:' || NEW.user_id::text, 0));
    IF (SELECT count(*) FROM public.creator_record_v2_documents d WHERE d.user_id = NEW.user_id AND d.state <> 'deleted') >= 24 THEN
      RAISE EXCEPTION 'evidence quota reached' USING ERRCODE = 'S8EQ1';
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    IF OLD.state <> 'pending' THEN
      RAISE EXCEPTION 'only a pending (unfinished) upload may be removed' USING ERRCODE = 'P0001';
    END IF;
    RETURN OLD;
  END IF;

  IF NEW.id <> OLD.id OR NEW.user_id <> OLD.user_id OR NEW.sha256 <> OLD.sha256 OR NEW.media_type <> OLD.media_type
     OR NEW.byte_size <> OLD.byte_size OR NEW.file_name <> OLD.file_name OR NEW.storage_path <> OLD.storage_path
     OR NEW.consent_version <> OLD.consent_version OR NEW.created_at <> OLD.created_at THEN
    RAISE EXCEPTION 'document content is immutable' USING ERRCODE = 'P0001';
  END IF;

  IF OLD.state = 'pending' THEN
    IF NEW.state <> 'stored' THEN
      RAISE EXCEPTION 'a pending document may only become stored' USING ERRCODE = 'P0001';
    END IF;
    RETURN NEW;
  END IF;

  IF OLD.state = 'stored' THEN
    IF NEW.state = 'stored' THEN
      IF NEW.stored_at IS DISTINCT FROM OLD.stored_at THEN
        RAISE EXCEPTION 'document content is immutable' USING ERRCODE = 'P0001';
      END IF;
      RETURN NEW;
    END IF;
    IF NEW.state <> 'deleted' OR NEW.stored_at IS DISTINCT FROM OLD.stored_at THEN
      RAISE EXCEPTION 'a stored document may only be deleted' USING ERRCODE = 'P0001';
    END IF;
    IF EXISTS (SELECT 1 FROM public.creator_record_v2_prepared_documents l WHERE l.document_id = OLD.id) THEN
      RAISE EXCEPTION 'a document referenced by a prepared record is retained' USING ERRCODE = 'P0001';
    END IF;
    RETURN NEW;
  END IF;

  -- OLD.state = 'deleted': only recording that the object was removed, once.
  IF NEW.state <> 'deleted' OR NEW.deleted_at IS DISTINCT FROM OLD.deleted_at OR NEW.stored_at IS DISTINCT FROM OLD.stored_at
     OR (OLD.object_removed_at IS NOT NULL AND NEW.object_removed_at IS DISTINCT FROM OLD.object_removed_at) THEN
    RAISE EXCEPTION 'a deleted document is final' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS creator_record_v2_documents_guard ON public.creator_record_v2_documents;
CREATE TRIGGER creator_record_v2_documents_guard
  BEFORE INSERT OR UPDATE OR DELETE ON public.creator_record_v2_documents
  FOR EACH ROW EXECUTE FUNCTION public.creator_record_v2_documents_guard();

-- ── Prepared-version references, derived from the version's own canonical record ─────────────────────

-- SECURITY DEFINER (trigger only, EXECUTE revoked from every role): the service role cannot write references
-- itself; only this function, from the version's own canonical record, can.
CREATE OR REPLACE FUNCTION public.creator_record_v2_prepared_documents_link()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_items jsonb;
  v_item  jsonb;
  v_doc   public.creator_record_v2_documents%ROWTYPE;
BEGIN
  BEGIN
    v_items := (NEW.canonical::jsonb) #> '{documents,items}';
  EXCEPTION WHEN others THEN
    RAISE EXCEPTION 'a prepared record must be valid JSON' USING ERRCODE = 'P0001';
  END;
  IF v_items IS NULL OR jsonb_typeof(v_items) = 'null' THEN
    RETURN NEW;
  END IF;
  IF jsonb_typeof(v_items) <> 'array' THEN
    RAISE EXCEPTION 'documents.items must be an array' USING ERRCODE = 'P0001';
  END IF;
  FOR v_item IN SELECT * FROM jsonb_array_elements(v_items) LOOP
    SELECT * INTO v_doc FROM public.creator_record_v2_documents d WHERE d.id = (v_item ->> 'document_id')::uuid FOR SHARE;
    IF NOT FOUND OR v_doc.user_id <> NEW.user_id OR v_doc.state <> 'stored' OR v_doc.sha256 <> (v_item ->> 'sha256') THEN
      RAISE EXCEPTION 'a prepared record references only the same creator''s stored documents, by their exact SHA-256' USING ERRCODE = 'P0001';
    END IF;
    INSERT INTO public.creator_record_v2_prepared_documents (prepared_id, document_id, sha256) VALUES (NEW.id, v_doc.id, v_doc.sha256);
  END LOOP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS creator_record_v2_prepared_documents_link ON public.creator_record_v2_prepared;
CREATE TRIGGER creator_record_v2_prepared_documents_link
  AFTER INSERT ON public.creator_record_v2_prepared
  FOR EACH ROW EXECUTE FUNCTION public.creator_record_v2_prepared_documents_link();

-- References are written only by the trigger above and never change.
CREATE OR REPLACE FUNCTION public.creator_record_v2_append_only_guard()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    RAISE EXCEPTION '% is append-only', TG_TABLE_NAME USING ERRCODE = 'P0001';
  END IF;
  -- DELETE: only the cascade from removing an unreviewed prepared version (its own guard decides) is allowed.
  IF TG_TABLE_NAME = 'creator_record_v2_prepared_documents' AND NOT EXISTS (SELECT 1 FROM public.creator_record_v2_prepared p WHERE p.id = OLD.prepared_id) THEN
    RETURN OLD;
  END IF;
  RAISE EXCEPTION '% is append-only', TG_TABLE_NAME USING ERRCODE = 'P0001';
END;
$$;

DROP TRIGGER IF EXISTS creator_record_v2_prepared_documents_append_only ON public.creator_record_v2_prepared_documents;
CREATE TRIGGER creator_record_v2_prepared_documents_append_only
  BEFORE UPDATE OR DELETE ON public.creator_record_v2_prepared_documents
  FOR EACH ROW EXECUTE FUNCTION public.creator_record_v2_append_only_guard();

DROP TRIGGER IF EXISTS creator_record_v2_evidence_access_log_append_only ON public.creator_record_v2_evidence_access_log;
CREATE TRIGGER creator_record_v2_evidence_access_log_append_only
  BEFORE UPDATE OR DELETE ON public.creator_record_v2_evidence_access_log
  FOR EACH ROW EXECUTE FUNCTION public.creator_record_v2_append_only_guard();

-- ── Access: RLS on, no policies; least privilege for the service role only ───────────────────────────

ALTER TABLE public.creator_record_v2_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_record_v2_prepared_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_record_v2_evidence_access_log ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.creator_record_v2_documents FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE public.creator_record_v2_prepared_documents FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE public.creator_record_v2_evidence_access_log FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.creator_record_v2_documents_guard() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.creator_record_v2_prepared_documents_link() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.creator_record_v2_append_only_guard() FROM PUBLIC, anon, authenticated, service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.creator_record_v2_documents TO service_role;
GRANT SELECT ON TABLE public.creator_record_v2_prepared_documents TO service_role;
GRANT SELECT, INSERT ON TABLE public.creator_record_v2_evidence_access_log TO service_role;
