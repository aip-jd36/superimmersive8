-- CR-V2-MVP-M2 — Creator Record v2 prepared records and pilot access.
--
-- ADDITIVE ONLY. Creates two new tables, one guard function and its trigger.
-- No existing table, column, row, policy or grant is changed. V1 submissions,
-- artifacts and downloads are untouched.
--
-- creator_record_v2_prepared
--   One row per prepared VERSION of a creator's declarations. A version is the
--   exact canonical record the builder produced (canonical JSON + SHA-256), the
--   strictly parsed questionnaire state it was built from, and its review state.
--   - Content is immutable from insert: owner, draft, version, record ref,
--     schema, canonical, digest and form state never change.
--   - status: 'prepared' -> 'reviewed' only (the creator confirmed exactly this
--     version). A reviewed version is frozen; a correction is a NEW version of
--     the same draft. Reviewed versions cannot be deleted.
--   - submission_id: null until checkout binding (M3); may be set once, only
--     on a reviewed version.
--   - Every version of a draft belongs to the same owner.
--
-- creator_record_v2_pilot_access
--   Invite list for the controlled pilot, keyed by user id (public.users, as submissions). Rows are added
--   by the operator (SQL editor); the application only reads it.
--
-- Access: RLS enabled with no policies; all privileges revoked from PUBLIC,
-- anon and authenticated. Only the server (service_role) reads and writes, and
-- the application routes enforce ownership from the authenticated session.

CREATE TABLE IF NOT EXISTS public.creator_record_v2_prepared (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  draft_id               uuid NOT NULL,
  version                integer NOT NULL CHECK (version >= 1),
  record_ref             text NOT NULL UNIQUE CHECK (record_ref ~ '^PREP-[0-9a-f-]{36}$'),
  record_schema          text NOT NULL CHECK (record_schema = 'si8/creator-record-v2-record'),
  record_schema_version  integer NOT NULL CHECK (record_schema_version >= 1),
  canonical              text NOT NULL CHECK (length(canonical) BETWEEN 2 AND 1000000),
  sha256                 char(64) NOT NULL CHECK (sha256 ~ '^[0-9a-f]{64}$'),
  form_state             jsonb NOT NULL,
  status                 text NOT NULL CHECK (status IN ('prepared', 'reviewed')),
  created_at             timestamptz NOT NULL DEFAULT now(),
  reviewed_at            timestamptz,
  submission_id          uuid UNIQUE REFERENCES public.submissions(id) ON DELETE RESTRICT,
  UNIQUE (draft_id, version),
  CHECK ((status = 'reviewed') = (reviewed_at IS NOT NULL)),
  CHECK (submission_id IS NULL OR status = 'reviewed')
);

CREATE INDEX IF NOT EXISTS creator_record_v2_prepared_owner_idx
  ON public.creator_record_v2_prepared (user_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.creator_record_v2_prepared_guard()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status <> 'prepared' OR NEW.reviewed_at IS NOT NULL OR NEW.submission_id IS NOT NULL THEN
      RAISE EXCEPTION 'a prepared record is inserted as prepared, unreviewed and unbound' USING ERRCODE = 'P0001';
    END IF;
    IF EXISTS (SELECT 1 FROM public.creator_record_v2_prepared p WHERE p.draft_id = NEW.draft_id AND p.user_id <> NEW.user_id) THEN
      RAISE EXCEPTION 'every version of a draft belongs to one owner' USING ERRCODE = 'P0001';
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    IF OLD.status = 'reviewed' THEN
      RAISE EXCEPTION 'reviewed prepared records are immutable' USING ERRCODE = 'P0001';
    END IF;
    RETURN OLD;
  END IF;

  IF NEW.id <> OLD.id OR NEW.user_id <> OLD.user_id OR NEW.draft_id <> OLD.draft_id OR NEW.version <> OLD.version
     OR NEW.record_ref <> OLD.record_ref OR NEW.record_schema <> OLD.record_schema
     OR NEW.record_schema_version <> OLD.record_schema_version OR NEW.canonical <> OLD.canonical
     OR NEW.sha256 <> OLD.sha256 OR NEW.form_state <> OLD.form_state OR NEW.created_at <> OLD.created_at THEN
    RAISE EXCEPTION 'prepared record content is immutable' USING ERRCODE = 'P0001';
  END IF;

  IF OLD.status = 'prepared' THEN
    -- Only the review transition, and no binding in the same statement.
    IF NEW.status <> 'reviewed' OR NEW.submission_id IS NOT NULL THEN
      RAISE EXCEPTION 'a prepared record may only be marked reviewed' USING ERRCODE = 'P0001';
    END IF;
    RETURN NEW;
  END IF;

  -- OLD.status = 'reviewed': frozen, except binding to a submission once.
  IF NEW.status <> 'reviewed' OR NEW.reviewed_at IS DISTINCT FROM OLD.reviewed_at THEN
    RAISE EXCEPTION 'reviewed prepared records are immutable' USING ERRCODE = 'P0001';
  END IF;
  IF OLD.submission_id IS NOT NULL AND NEW.submission_id IS DISTINCT FROM OLD.submission_id THEN
    RAISE EXCEPTION 'a reviewed prepared record is bound once' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS creator_record_v2_prepared_guard ON public.creator_record_v2_prepared;
CREATE TRIGGER creator_record_v2_prepared_guard
  BEFORE INSERT OR UPDATE OR DELETE ON public.creator_record_v2_prepared
  FOR EACH ROW EXECUTE FUNCTION public.creator_record_v2_prepared_guard();

ALTER TABLE public.creator_record_v2_prepared ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.creator_record_v2_pilot_access (
  user_id     uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  added_by    text NOT NULL CHECK (length(trim(added_by)) > 0),
  reason      text NOT NULL CHECK (length(trim(reason)) > 0),
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.creator_record_v2_pilot_access ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.creator_record_v2_prepared FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE public.creator_record_v2_pilot_access FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.creator_record_v2_prepared_guard() FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE ON TABLE public.creator_record_v2_prepared TO service_role;
GRANT SELECT ON TABLE public.creator_record_v2_pilot_access TO service_role;
