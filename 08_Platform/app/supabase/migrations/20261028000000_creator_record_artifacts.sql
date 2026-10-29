-- ============================================================================
-- CR-ARTIFACT-1 — private Creator Record artifacts (ADDITIVE ONLY)
--
-- 1. A private `creator-records` storage bucket (PDF only, 10 MB). No storage
--    policy is created: only the service role (server code) can read or write.
-- 2. `creator_record_artifacts`: the authoritative identity of an issued
--    Creator Record PDF — one per submission, immutable once `issued`.
-- 3. `creator_record_artifact_uat`: the server-side rollout allowlist. Until
--    cutover, ONLY submissions listed here use the private path; every other
--    Creator Record keeps the existing (legacy) path unchanged.
-- 4. Explicit least-privilege grants on both tables (see "Privileges" below):
--    anon and authenticated get nothing; service_role gets only what the code
--    uses; nobody but the owner can TRUNCATE.
--
-- Nothing existing is altered: no change to `documents`, `rights_packages`,
-- payment tables, policies or historical objects.
--
-- Orphan objects (CR-ARTIFACT-1C): a takeover, or a stale attempt that lost the
-- race, can leave a private object at a superseded attempt path. It is never
-- referenced or served. There is no cleanup job; find them with:
--   select o.name, o.created_at from storage.objects o
--   where o.bucket_id = 'creator-records'
--     and not exists (select 1 from public.creator_record_artifacts a where a.storage_path = o.name);
--
-- ROLLBACK FLOOR: once any artifact row exists, never deploy code older than
-- CR-ARTIFACT-1 (it would ignore artifacts and could re-issue a public PDF).
-- Stop new issuance instead by emptying creator_record_artifact_uat, or by
-- deploying CR-ARTIFACT-1 code with CREATOR_RECORD_ARTIFACT_ROLLOUT = 'off'.
--
-- Rollback (only before any artifact has been issued to a customer):
--   drop table if exists public.creator_record_artifact_uat;
--   drop table if exists public.creator_record_artifacts;
--   -- the bucket can be removed from the dashboard once empty.
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('creator-records', 'creator-records', false, 10485760, ARRAY['application/pdf'])
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.creator_record_artifacts (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id      uuid NOT NULL UNIQUE REFERENCES public.submissions(id) ON DELETE RESTRICT,
  record_id          text NOT NULL UNIQUE,
  -- The current attempt. A pending artifact may be taken over by a newer
  -- attempt (compare-and-swap on attempt_id); an issued one never changes.
  attempt_id         uuid NOT NULL,
  storage_path       text NOT NULL UNIQUE,
  sha256             char(64) NOT NULL CHECK (sha256 ~ '^[0-9a-f]{64}$'),
  byte_size          integer NOT NULL CHECK (byte_size > 0),
  generator_version  text NOT NULL,
  status             text NOT NULL CHECK (status IN ('pending', 'issued')),
  -- true when issued through the internal UAT allowlist before cutover.
  uat                boolean NOT NULL,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  issued_at          timestamptz,
  CHECK ((status = 'issued') = (issued_at IS NOT NULL)),
  CHECK (storage_path = submission_id::text || '/' || attempt_id::text || '.pdf')
);

-- Immutability of issued artifacts is enforced in the database, not only in code.
CREATE OR REPLACE FUNCTION public.creator_record_artifacts_guard()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.status = 'issued' THEN
      RAISE EXCEPTION 'issued creator record artifacts are immutable' USING ERRCODE = 'P0001';
    END IF;
    RETURN OLD;
  END IF;
  IF OLD.status = 'issued' THEN
    RAISE EXCEPTION 'issued creator record artifacts are immutable' USING ERRCODE = 'P0001';
  END IF;
  IF NEW.submission_id <> OLD.submission_id OR NEW.record_id <> OLD.record_id OR NEW.uat <> OLD.uat THEN
    RAISE EXCEPTION 'creator record artifact identity cannot change' USING ERRCODE = 'P0001';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS creator_record_artifacts_guard ON public.creator_record_artifacts;
CREATE TRIGGER creator_record_artifacts_guard
  BEFORE UPDATE OR DELETE ON public.creator_record_artifacts
  FOR EACH ROW EXECUTE FUNCTION public.creator_record_artifacts_guard();

ALTER TABLE public.creator_record_artifacts ENABLE ROW LEVEL SECURITY;
-- No policies: service role only.

CREATE TABLE IF NOT EXISTS public.creator_record_artifact_uat (
  submission_id  uuid PRIMARY KEY REFERENCES public.submissions(id) ON DELETE CASCADE,
  added_by       text NOT NULL CHECK (length(trim(added_by)) > 0),
  reason         text NOT NULL CHECK (length(trim(reason)) > 0),
  created_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.creator_record_artifact_uat ENABLE ROW LEVEL SECURITY;
-- No policies: service role only. Rows are added by the operator in the SQL editor.

-- Privileges (CR-ARTIFACT-1J): least privilege, explicit. Deny everyone first,
-- including Supabase's default grants (ALL on new tables and EXECUTE on new
-- functions to anon, authenticated and service_role), then grant the server
-- role only what lib/creator-record-artifacts/store.ts uses:
--   creator_record_artifacts     SELECT, INSERT, UPDATE  (find, status and delivery
--                                reads; insert a pending row; takeover and
--                                mark-issued compare-and-swap). Never DELETE,
--                                TRUNCATE, REFERENCES or TRIGGER.
--   creator_record_artifact_uat  SELECT                  (the rollout gate). Rows are
--                                written only by the operator (the table owner).
-- TRUNCATE fires no row trigger, so the immutability guard cannot cover it; only
-- the table owner holds it. The guard function is a trigger function only: a
-- trigger does not check EXECUTE when it fires, so no role needs it.
REVOKE ALL ON TABLE public.creator_record_artifacts FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE public.creator_record_artifact_uat FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.creator_record_artifacts_guard() FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE ON TABLE public.creator_record_artifacts TO service_role;
GRANT SELECT ON TABLE public.creator_record_artifact_uat TO service_role;
