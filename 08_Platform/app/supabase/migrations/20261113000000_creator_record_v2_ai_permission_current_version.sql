-- CR-V2-SCHEMA8-PATH-1 (E6) — AI-examination permission is valid only under the version CURRENTLY authorized.
--
-- NOT APPLIED ANYWHERE. Tested on disposable local PostgreSQL only. Requires 20261112000000, so the Production order is
-- 20261108 → 20261110 → 20261111 → 20261112 → 20261113.
--
-- Before: the grant function accepted any well-formed version, and the database guard accepted a grant of ANY version for the
-- document. Only the application compared the version with its own current one, so a grant recorded under a draft or an earlier
-- version kept permitting AI examination at the database once the wording or the privacy notice and terms changed.
--
-- After:
--   * creator_record_v2_ai_permission_authority: one row, the permission identifier currently authorized (since E7 it names the
--     permission wording AND the approved privacy notice and terms versions). Established by an operator after the wording and
--     both policies are approved; never changed in place (delete and establish again, like the customer live enablement).
--     It can never hold a draft or unapproved identifier (CHECK). No row: no permission is current, so nothing is examined.
--   * the grant function records a permission only for exactly the current version (otherwise creator_record_v2_ai_permission_invalid),
--     checked after the existing ownership and withdrawal checks, so a withdrawn document still answers 'withdrawn';
--   * the guard on the live read, the reservation and the live_model attempt requires a grant of exactly the current version. A
--     grant under any earlier version stays in the append-only table as history and no longer permits examination: the creator
--     must give the current permission again.
-- Withdrawal (20261111) is unchanged and still overrides every grant: a withdrawn document cannot be granted under any version.
-- Correction (a new prepared version) does not touch permissions. Nothing here changes payment, binding, issuance, retention,
-- deletion, holds or replay examination.

DO $pre$
BEGIN
  IF to_regclass('public.creator_record_v2_ai_examination_permissions') IS NULL
     OR to_regprocedure('public.creator_record_v2_grant_ai_examination_permission(uuid, uuid, text)') IS NULL
     OR to_regprocedure('public.creator_record_v2_ai_permission_guard()') IS NULL THEN
    RAISE EXCEPTION '20261113000000 requires 20261112000000' USING ERRCODE = 'P0001';
  END IF;
END
$pre$;

CREATE TABLE public.creator_record_v2_ai_permission_authority (
  singleton           boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  permission_version  text NOT NULL
                      CHECK (permission_version ~ '^[A-Za-z0-9][A-Za-z0-9._-]{0,119}$')
                      CHECK (permission_version !~* '(draft|unapproved)'),
  established_by      text NOT NULL CHECK (length(trim(established_by)) BETWEEN 1 AND 200),
  reason              text NOT NULL CHECK (length(trim(reason)) BETWEEN 1 AND 500),
  created_at          timestamptz NOT NULL DEFAULT now()
);

-- Deleting the row makes no permission current (nothing is examined). Changing it is not possible: delete and establish again.
CREATE OR REPLACE FUNCTION public.creator_record_v2_ai_permission_authority_guard()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'the current AI-examination permission version is not changed in place' USING ERRCODE = 'P0001';
END;
$$;
CREATE TRIGGER creator_record_v2_ai_permission_authority_guard
  BEFORE UPDATE ON public.creator_record_v2_ai_permission_authority
  FOR EACH ROW EXECUTE FUNCTION public.creator_record_v2_ai_permission_authority_guard();

-- The version currently authorized, or NULL.
CREATE OR REPLACE FUNCTION public.creator_record_v2_current_ai_permission_version()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT a.permission_version FROM public.creator_record_v2_ai_permission_authority a WHERE a.singleton
$$;

-- As 20261112000000, plus: only exactly the current version is recorded.
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
  IF p_permission_version IS DISTINCT FROM public.creator_record_v2_current_ai_permission_version() THEN
    RAISE EXCEPTION 'creator_record_v2_ai_permission_invalid' USING ERRCODE = 'P0001';
  END IF;
  IF EXISTS (SELECT 1 FROM public.creator_record_v2_ai_examination_permissions p WHERE p.document_id = v_doc.id AND p.permission_version = p_permission_version) THEN
    RETURN 'existing';
  END IF;
  INSERT INTO public.creator_record_v2_ai_examination_permissions (user_id, document_id, permission_version) VALUES (v_doc.user_id, v_doc.id, p_permission_version);
  RETURN 'granted';
END;
$$;

-- As 20261112000000, plus: the owner's grant must be of exactly the current version. No current version: nothing is examined.
CREATE OR REPLACE FUNCTION public.creator_record_v2_ai_permission_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_current text;
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
  v_current := public.creator_record_v2_current_ai_permission_version();
  IF v_current IS NULL OR NOT EXISTS (SELECT 1 FROM public.creator_record_v2_documents d
                   JOIN public.creator_record_v2_ai_examination_permissions p ON p.document_id = d.id AND p.user_id = d.user_id
                  WHERE d.id = NEW.document_id AND p.permission_version = v_current) THEN
    RAISE EXCEPTION 'creator_record_v2_ai_permission_required' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;

ALTER TABLE public.creator_record_v2_ai_permission_authority ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.creator_record_v2_ai_permission_authority FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.creator_record_v2_ai_permission_authority_guard() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.creator_record_v2_current_ai_permission_version() FROM PUBLIC, anon, authenticated, service_role;
-- The replaced grant and guard functions keep the privileges 20261112000000 gave them (service_role may execute the grant only).
