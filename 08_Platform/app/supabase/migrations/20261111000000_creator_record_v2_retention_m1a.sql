-- CR-V2-MVP-RETENTION-M1A — original-document retention: expiry, consent withdrawal, deletion requests, holds, paid-order extension.
--
-- NOT APPLIED ANYWHERE. Tested on disposable local PostgreSQL only. Applying it to any project, and in particular Production, is a
-- separate, explicitly authorized step. Requires 20261103000000 … 20261110000000 (20261108 and 20261110 are local only today).
--
-- Provisional product policy (not Production authorization), as implemented here:
--   * an owner upload's original expires 90 days after it was stored (`stored_at`); the row, its fingerprint and every link to it are
--     kept — only the state changes to `deleted` (reason `retention_expired`) and the object is then removed by the existing cleanup;
--   * an unfinished PAID order (accepted payment, no issued artifact) that references the document extends expiry by at most 14 days
--     (stored_at + 104 days). When that ends the document expires anyway, automated issuance of that order is stopped
--     (needs_reconciliation) and a refund / manual resolution is required — recorded in the ledger's reconciliation log;
--   * an administrative hold (named admin, reason, at most 30 days, explicit audited renewal, never automatic) defers expiry and a
--     deletion request. A hold cannot be placed or renewed while a deletion request is open, so a hold never silently defeats one: the
--     request stays visibly open and completes, at the latest, when the hold ends;
--   * a deletion request is independent of the submissions stop and of the pilot invitation; it completes at once unless a hold or an
--     unfinished paid order (at most 14 days from the request) stands in the way, in which case it stays open with its reason;
--   * consent withdrawal: no new examination read, reservation, replay run or live attempt for a document the creator uploaded at or
--     before the withdrawal, whatever authorization, reservation or retry already exists. Readings recorded before it are kept.
--
-- Physical removal "within 7 days" is the scheduled sweep's job (cleanup of deleted documents' objects, retried every run);
-- creator_record_v2_retention_status() reports what is overdue so the sweep fails loudly.
--
-- Not done here (explicit exclusions): erasure of examination data, prepared or issued records, or of any audit row; abandoned-record
-- erasure; moving a paid entitlement between prepared versions; operator-seeded synthetic documents (origin 'operator_synthetic_seed')
-- are not subject to this policy. No row of any earlier table is deleted.
--
-- Privilege model: every new table is RLS-on with no policy; service_role may only SELECT them. Every change goes through a
-- SECURITY DEFINER function below. The one existing table service_role can update (documents) accepts a retention deletion of a
-- referenced document only while the transaction-local flag `si8.cr_v2_retention` is set — which only these functions do (the
-- pattern of `si8.cr_v2_binding`, 20261102000000).

DO $pre$
BEGIN
  IF to_regclass('public.creator_record_v2_customer_live_reservations') IS NULL OR to_regclass('public.creator_record_v2_examination_runs') IS NULL
     OR to_regclass('public.payment_fulfillments') IS NULL OR to_regclass('public.creator_record_artifacts') IS NULL THEN
    RAISE EXCEPTION '20261111000000 requires 20261021000000, 20261028000000 and 20261103000000 through 20261110000000' USING ERRCODE = 'P0001';
  END IF;
END
$pre$;

-- ── 1. Deletion reason on the document row ────────────────────────────────────────────────────────────

ALTER TABLE public.creator_record_v2_documents
  ADD COLUMN deletion_reason text CHECK (deletion_reason IN ('owner_deleted', 'retention_expired', 'deletion_request')),
  ADD CONSTRAINT creator_record_v2_documents_deletion_reason_state_check CHECK (deletion_reason IS NULL OR state = 'deleted');
CREATE INDEX creator_record_v2_documents_retention_idx ON public.creator_record_v2_documents (stored_at) WHERE state = 'stored';
CREATE INDEX creator_record_v2_documents_removal_idx ON public.creator_record_v2_documents (deleted_at) WHERE state = 'deleted' AND object_removed_at IS NULL;

-- The DOC-1 guard, unchanged except: (a) a stored → deleted transition records its reason ('owner_deleted' when the caller gives
-- none, as the DOC-1 service does); (b) a referenced document may be deleted only for retention or a deletion request, and only by
-- the functions below; (c) the reason is final. Rows deleted before this migration keep a NULL reason.
CREATE OR REPLACE FUNCTION public.creator_record_v2_documents_guard()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  v_retention boolean := current_setting('si8.cr_v2_retention', true) IS NOT DISTINCT FROM 'on';
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.state <> 'pending' OR NEW.stored_at IS NOT NULL OR NEW.deleted_at IS NOT NULL OR NEW.object_removed_at IS NOT NULL OR NEW.deletion_reason IS NOT NULL THEN
      RAISE EXCEPTION 'a document is inserted as pending' USING ERRCODE = 'P0001';
    END IF;
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
    IF NEW.state <> 'stored' OR NEW.deletion_reason IS NOT NULL THEN
      RAISE EXCEPTION 'a pending document may only become stored' USING ERRCODE = 'P0001';
    END IF;
    RETURN NEW;
  END IF;

  IF OLD.state = 'stored' THEN
    IF NEW.state = 'stored' THEN
      IF NEW.stored_at IS DISTINCT FROM OLD.stored_at OR NEW.deletion_reason IS NOT NULL THEN
        RAISE EXCEPTION 'document content is immutable' USING ERRCODE = 'P0001';
      END IF;
      RETURN NEW;
    END IF;
    IF NEW.state <> 'deleted' OR NEW.stored_at IS DISTINCT FROM OLD.stored_at THEN
      RAISE EXCEPTION 'a stored document may only be deleted' USING ERRCODE = 'P0001';
    END IF;
    IF NEW.deletion_reason IS NULL THEN
      NEW.deletion_reason := 'owner_deleted';
    END IF;
    IF NEW.deletion_reason <> 'owner_deleted' AND NOT v_retention THEN
      RAISE EXCEPTION 'a retention deletion is made only by the retention functions' USING ERRCODE = 'P0001';
    END IF;
    IF NEW.deletion_reason = 'owner_deleted'
       AND EXISTS (SELECT 1 FROM public.creator_record_v2_prepared_documents l WHERE l.document_id = OLD.id) THEN
      RAISE EXCEPTION 'a document referenced by a prepared record is retained' USING ERRCODE = 'P0001';
    END IF;
    RETURN NEW;
  END IF;

  -- OLD.state = 'deleted': only recording that the object was removed, once.
  IF NEW.state <> 'deleted' OR NEW.deleted_at IS DISTINCT FROM OLD.deleted_at OR NEW.stored_at IS DISTINCT FROM OLD.stored_at
     OR NEW.deletion_reason IS DISTINCT FROM OLD.deletion_reason
     OR (OLD.object_removed_at IS NOT NULL AND NEW.object_removed_at IS DISTINCT FROM OLD.object_removed_at) THEN
    RAISE EXCEPTION 'a deleted document is final' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;

-- ── 2. Audit: retention events (append-only) ──────────────────────────────────────────────────────────

CREATE TABLE public.creator_record_v2_retention_events (
  id                          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  occurred_at                 timestamptz NOT NULL DEFAULT clock_timestamp(),
  event                       text NOT NULL CHECK (event IN (
                                'consent_withdrawn', 'deletion_requested', 'deletion_awaiting_resolution', 'deleted_on_request',
                                'deletion_request_already_deleted', 'retention_expired', 'paid_order_extension_applied',
                                'hold_placed', 'hold_renewed', 'hold_released', 'manual_resolution_required')),
  user_id                     uuid REFERENCES public.users(id) ON DELETE RESTRICT,
  document_id                 uuid REFERENCES public.creator_record_v2_documents(id) ON DELETE RESTRICT,
  hold_id                     uuid,
  deletion_request_id         uuid,
  stripe_checkout_session_id  text,
  actor_user_id               uuid,
  detail                      text CHECK (detail IS NULL OR length(detail) <= 1000)
);
CREATE INDEX creator_record_v2_retention_events_document_idx ON public.creator_record_v2_retention_events (document_id, event);
CREATE TRIGGER creator_record_v2_retention_events_append_only
  BEFORE UPDATE OR DELETE ON public.creator_record_v2_retention_events
  FOR EACH ROW EXECUTE FUNCTION public.creator_record_v2_examination_append_only_guard();

-- ── 3. Consent withdrawal ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE public.creator_record_v2_consent_withdrawals (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id       uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  scope         text NOT NULL CHECK (scope = 'ai_examination'),
  withdrawn_at  timestamptz NOT NULL
);
CREATE INDEX creator_record_v2_consent_withdrawals_user_idx ON public.creator_record_v2_consent_withdrawals (user_id, withdrawn_at DESC);
CREATE TRIGGER creator_record_v2_consent_withdrawals_append_only
  BEFORE UPDATE OR DELETE ON public.creator_record_v2_consent_withdrawals
  FOR EACH ROW EXECUTE FUNCTION public.creator_record_v2_examination_append_only_guard();

-- A document is under withdrawn consent when its creator withdrew at or after the document was created (its upload's consent). A
-- document created later carried a fresh consent identifier of its own.
-- Every examination write takes the creator's consent lock SHARED and then reads the withdrawals; a withdrawal takes it EXCLUSIVE.
-- So a write either committed before the withdrawal, or sees it (READ COMMITTED: the read after the lock takes a fresh snapshot).
CREATE OR REPLACE FUNCTION public.creator_record_v2_consent_examination_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_doc public.creator_record_v2_documents%ROWTYPE;
BEGIN
  IF TG_TABLE_NAME = 'creator_record_v2_evidence_access_log' THEN
    IF NEW.purpose NOT IN ('examination', 'live_examination') THEN
      RETURN NEW;   -- file downloads are not AI processing
    END IF;
  END IF;
  SELECT * INTO v_doc FROM public.creator_record_v2_documents d WHERE d.id = NEW.document_id;
  IF NOT FOUND THEN
    RETURN NEW;     -- the foreign key refuses it
  END IF;
  PERFORM pg_advisory_xact_lock_shared(hashtextextended('si8.cr_v2_consent:' || v_doc.user_id::text, 0));
  IF EXISTS (SELECT 1 FROM public.creator_record_v2_consent_withdrawals w WHERE w.user_id = v_doc.user_id AND w.withdrawn_at >= v_doc.created_at) THEN
    RAISE EXCEPTION 'creator_record_v2_consent_withdrawn' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER creator_record_v2_evidence_access_log_consent_guard
  BEFORE INSERT ON public.creator_record_v2_evidence_access_log
  FOR EACH ROW EXECUTE FUNCTION public.creator_record_v2_consent_examination_guard();
CREATE TRIGGER creator_record_v2_examination_runs_consent_guard
  BEFORE INSERT ON public.creator_record_v2_examination_runs
  FOR EACH ROW EXECUTE FUNCTION public.creator_record_v2_consent_examination_guard();
CREATE TRIGGER creator_record_v2_live_examination_attempts_consent_guard
  BEFORE INSERT ON public.creator_record_v2_live_examination_attempts
  FOR EACH ROW EXECUTE FUNCTION public.creator_record_v2_consent_examination_guard();
CREATE TRIGGER creator_record_v2_customer_live_reservations_consent_guard
  BEFORE INSERT ON public.creator_record_v2_customer_live_reservations
  FOR EACH ROW EXECUTE FUNCTION public.creator_record_v2_consent_examination_guard();

-- Owner action. Idempotent: an existing withdrawal that already covers every document of this creator is returned.
CREATE OR REPLACE FUNCTION public.creator_record_v2_withdraw_consent(p_user_id uuid)
RETURNS TABLE (withdrawal_id bigint, withdrawn_at timestamptz, result text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_w  public.creator_record_v2_consent_withdrawals%ROWTYPE;
  v_at timestamptz;
BEGIN
  IF p_user_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.users u WHERE u.id = p_user_id) THEN
    RAISE EXCEPTION 'creator_record_v2_retention_not_found' USING ERRCODE = 'P0001';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('si8.cr_v2_consent:' || p_user_id::text, 0));
  SELECT * INTO v_w FROM public.creator_record_v2_consent_withdrawals w WHERE w.user_id = p_user_id ORDER BY w.withdrawn_at DESC LIMIT 1;
  IF FOUND AND NOT EXISTS (SELECT 1 FROM public.creator_record_v2_documents d WHERE d.user_id = p_user_id AND d.created_at > v_w.withdrawn_at) THEN
    RETURN QUERY SELECT v_w.id, v_w.withdrawn_at, 'existing'::text;
    RETURN;
  END IF;
  v_at := clock_timestamp();   -- after the lock: every write that could still commit before it has already done so
  INSERT INTO public.creator_record_v2_consent_withdrawals (user_id, scope, withdrawn_at) VALUES (p_user_id, 'ai_examination', v_at) RETURNING * INTO v_w;
  INSERT INTO public.creator_record_v2_retention_events (event, user_id, actor_user_id) VALUES ('consent_withdrawn', p_user_id, p_user_id);
  RETURN QUERY SELECT v_w.id, v_w.withdrawn_at, 'created'::text;
END;
$$;

-- ── 4. Administrative holds ───────────────────────────────────────────────────────────────────────────

CREATE TABLE public.creator_record_v2_retention_holds (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id     uuid NOT NULL REFERENCES public.creator_record_v2_documents(id) ON DELETE RESTRICT,
  authorized_by   uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  reason          text NOT NULL CHECK (length(btrim(reason)) BETWEEN 10 AND 1000),
  starts_at       timestamptz NOT NULL,
  expires_at      timestamptz NOT NULL,
  renews_hold_id  uuid UNIQUE REFERENCES public.creator_record_v2_retention_holds(id) ON DELETE RESTRICT,
  released_at     timestamptz,
  released_by     uuid REFERENCES public.users(id) ON DELETE RESTRICT,
  release_reason  text CHECK (release_reason IS NULL OR length(btrim(release_reason)) BETWEEN 10 AND 1000),
  CHECK (expires_at > starts_at AND expires_at <= starts_at + interval '30 days'),
  CHECK ((released_at IS NULL) = (released_by IS NULL) AND (released_at IS NULL) = (release_reason IS NULL))
);
CREATE INDEX creator_record_v2_retention_holds_document_idx ON public.creator_record_v2_retention_holds (document_id, expires_at);

-- Never deleted; the terms never change; released once.
CREATE OR REPLACE FUNCTION public.creator_record_v2_retention_holds_guard()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'a retention hold is never deleted' USING ERRCODE = 'P0001';
  END IF;
  IF (NEW.id, NEW.document_id, NEW.authorized_by, NEW.reason, NEW.starts_at, NEW.expires_at, NEW.renews_hold_id)
       IS DISTINCT FROM (OLD.id, OLD.document_id, OLD.authorized_by, OLD.reason, OLD.starts_at, OLD.expires_at, OLD.renews_hold_id)
     OR (OLD.released_at IS NOT NULL AND (NEW.released_at, NEW.released_by, NEW.release_reason) IS DISTINCT FROM (OLD.released_at, OLD.released_by, OLD.release_reason)) THEN
    RAISE EXCEPTION 'a retention hold is changed only by being released, once' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER creator_record_v2_retention_holds_guard
  BEFORE UPDATE OR DELETE ON public.creator_record_v2_retention_holds
  FOR EACH ROW EXECUTE FUNCTION public.creator_record_v2_retention_holds_guard();

CREATE OR REPLACE FUNCTION public.creator_record_v2_document_on_hold(p_document_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT EXISTS (SELECT 1 FROM public.creator_record_v2_retention_holds h
                  WHERE h.document_id = p_document_id AND h.released_at IS NULL AND h.starts_at <= now() AND h.expires_at > now())
$$;

CREATE OR REPLACE FUNCTION public.creator_record_v2_retention_require_admin(p_admin_user_id uuid)
RETURNS void LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF p_admin_user_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.users u WHERE u.id = p_admin_user_id AND u.is_admin IS TRUE) THEN
    RAISE EXCEPTION 'creator_record_v2_retention_not_authorized' USING ERRCODE = 'P0001';
  END IF;
END;
$$;

-- p_days: 1..30. A hold cannot be placed while a deletion request is open for the document.
CREATE OR REPLACE FUNCTION public.creator_record_v2_place_retention_hold(p_document_id uuid, p_admin_user_id uuid, p_reason text, p_days integer)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_doc public.creator_record_v2_documents%ROWTYPE;
  v_id  uuid;
BEGIN
  PERFORM public.creator_record_v2_retention_require_admin(p_admin_user_id);
  IF p_days IS NULL OR p_days NOT BETWEEN 1 AND 30 OR p_reason IS NULL OR length(btrim(p_reason)) NOT BETWEEN 10 AND 1000 THEN
    RAISE EXCEPTION 'creator_record_v2_hold_invalid' USING ERRCODE = 'P0001';
  END IF;
  SELECT * INTO v_doc FROM public.creator_record_v2_documents d WHERE d.id = p_document_id FOR UPDATE;
  IF NOT FOUND OR v_doc.state <> 'stored' OR v_doc.origin <> 'owner_upload' THEN
    RAISE EXCEPTION 'creator_record_v2_retention_not_found' USING ERRCODE = 'P0001';
  END IF;
  IF EXISTS (SELECT 1 FROM public.creator_record_v2_deletion_requests r WHERE r.document_id = v_doc.id AND r.status = 'open') THEN
    RAISE EXCEPTION 'creator_record_v2_hold_conflicts_with_deletion_request' USING ERRCODE = 'P0001';
  END IF;
  IF public.creator_record_v2_document_on_hold(v_doc.id) THEN
    RAISE EXCEPTION 'creator_record_v2_hold_already_active' USING ERRCODE = 'P0001';
  END IF;
  INSERT INTO public.creator_record_v2_retention_holds (document_id, authorized_by, reason, starts_at, expires_at)
  VALUES (v_doc.id, p_admin_user_id, btrim(p_reason), now(), now() + make_interval(days => p_days))
  RETURNING id INTO v_id;
  INSERT INTO public.creator_record_v2_retention_events (event, user_id, document_id, hold_id, actor_user_id, detail)
  VALUES ('hold_placed', v_doc.user_id, v_doc.id, v_id, p_admin_user_id, btrim(p_reason));
  RETURN v_id;
END;
$$;

-- Explicit renewal only (never automatic): of a hold still active, once per hold, by a named admin with a reason, at most 30 days
-- from now; refused while a deletion request is open.
CREATE OR REPLACE FUNCTION public.creator_record_v2_renew_retention_hold(p_hold_id uuid, p_admin_user_id uuid, p_reason text, p_days integer)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_hold public.creator_record_v2_retention_holds%ROWTYPE;
  v_doc  public.creator_record_v2_documents%ROWTYPE;
  v_id   uuid;
BEGIN
  PERFORM public.creator_record_v2_retention_require_admin(p_admin_user_id);
  IF p_days IS NULL OR p_days NOT BETWEEN 1 AND 30 OR p_reason IS NULL OR length(btrim(p_reason)) NOT BETWEEN 10 AND 1000 THEN
    RAISE EXCEPTION 'creator_record_v2_hold_invalid' USING ERRCODE = 'P0001';
  END IF;
  SELECT * INTO v_hold FROM public.creator_record_v2_retention_holds h WHERE h.id = p_hold_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'creator_record_v2_retention_not_found' USING ERRCODE = 'P0001';
  END IF;
  SELECT * INTO v_doc FROM public.creator_record_v2_documents d WHERE d.id = v_hold.document_id FOR UPDATE;
  SELECT * INTO v_hold FROM public.creator_record_v2_retention_holds h WHERE h.id = p_hold_id FOR UPDATE;
  IF v_hold.released_at IS NOT NULL OR v_hold.expires_at <= now() OR v_doc.state <> 'stored'
     OR EXISTS (SELECT 1 FROM public.creator_record_v2_retention_holds h WHERE h.renews_hold_id = v_hold.id) THEN
    RAISE EXCEPTION 'creator_record_v2_hold_not_renewable' USING ERRCODE = 'P0001';
  END IF;
  IF EXISTS (SELECT 1 FROM public.creator_record_v2_deletion_requests r WHERE r.document_id = v_doc.id AND r.status = 'open') THEN
    RAISE EXCEPTION 'creator_record_v2_hold_conflicts_with_deletion_request' USING ERRCODE = 'P0001';
  END IF;
  INSERT INTO public.creator_record_v2_retention_holds (document_id, authorized_by, reason, starts_at, expires_at, renews_hold_id)
  VALUES (v_doc.id, p_admin_user_id, btrim(p_reason), now(), now() + make_interval(days => p_days), v_hold.id)
  RETURNING id INTO v_id;
  INSERT INTO public.creator_record_v2_retention_events (event, user_id, document_id, hold_id, actor_user_id, detail)
  VALUES ('hold_renewed', v_doc.user_id, v_doc.id, v_id, p_admin_user_id, btrim(p_reason));
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.creator_record_v2_release_retention_hold(p_hold_id uuid, p_admin_user_id uuid, p_reason text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_hold public.creator_record_v2_retention_holds%ROWTYPE;
BEGIN
  PERFORM public.creator_record_v2_retention_require_admin(p_admin_user_id);
  IF p_reason IS NULL OR length(btrim(p_reason)) NOT BETWEEN 10 AND 1000 THEN
    RAISE EXCEPTION 'creator_record_v2_hold_invalid' USING ERRCODE = 'P0001';
  END IF;
  SELECT * INTO v_hold FROM public.creator_record_v2_retention_holds h WHERE h.id = p_hold_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'creator_record_v2_retention_not_found' USING ERRCODE = 'P0001';
  END IF;
  IF v_hold.released_at IS NOT NULL OR v_hold.expires_at <= now() THEN
    RETURN 'not_active';
  END IF;
  UPDATE public.creator_record_v2_retention_holds SET released_at = now(), released_by = p_admin_user_id, release_reason = btrim(p_reason) WHERE id = v_hold.id;
  INSERT INTO public.creator_record_v2_retention_events (event, user_id, document_id, hold_id, actor_user_id, detail)
  SELECT 'hold_released', d.user_id, d.id, v_hold.id, p_admin_user_id, btrim(p_reason) FROM public.creator_record_v2_documents d WHERE d.id = v_hold.document_id;
  RETURN 'released';
END;
$$;

-- ── 5. Unfinished paid orders ─────────────────────────────────────────────────────────────────────────

-- Accepted payments of v2 submissions bound to a prepared version that references the document, with no issued artifact.
CREATE OR REPLACE FUNCTION public.creator_record_v2_document_unfinished_paid_sessions(p_document_id uuid)
RETURNS SETOF text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT f.stripe_checkout_session_id
    FROM public.creator_record_v2_prepared_documents pd
    JOIN public.creator_record_v2_prepared p ON p.id = pd.prepared_id
    JOIN public.submissions s ON s.id = p.submission_id AND s.creator_record_product = 'v2'
    JOIN public.payment_fulfillments f ON f.submission_ref = s.id AND f.outcome = 'accepted'
   WHERE pd.document_id = p_document_id
     AND NOT EXISTS (SELECT 1 FROM public.creator_record_artifacts a WHERE a.submission_id = s.id AND a.status = 'issued')
$$;

-- Stop automated issuance of every paid, unissued v2 order whose record references an original deleted for retention or on request:
-- the order moves to the ledger's durable manual queue with a documented reason (refund or manual resolution). A fulfilment that is
-- running (claimed) is left to finish; it fails closed (the original is gone) and is moved on the next run.
CREATE OR REPLACE FUNCTION public.creator_record_v2_retention_stop_issuance()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_f     public.payment_fulfillments%ROWTYPE;
  v_count integer := 0;
  v_note  constant text := 'retention_original_unavailable: an original this paid Creator Record references was removed under the retention policy; automated issuance stopped; refund or manual resolution required';
BEGIN
  FOR v_f IN
    SELECT f.* FROM public.payment_fulfillments f
     WHERE f.outcome = 'accepted' AND f.fulfillment_status IN ('pending', 'failed')
       AND NOT EXISTS (SELECT 1 FROM public.creator_record_artifacts a WHERE a.submission_id = f.submission_ref AND a.status = 'issued')
       AND EXISTS (SELECT 1 FROM public.submissions s
                     JOIN public.creator_record_v2_prepared p ON p.submission_id = s.id
                     JOIN public.creator_record_v2_prepared_documents pd ON pd.prepared_id = p.id
                     JOIN public.creator_record_v2_documents d ON d.id = pd.document_id
                    WHERE s.id = f.submission_ref AND s.creator_record_product = 'v2'
                      AND d.state = 'deleted' AND d.deletion_reason IN ('retention_expired', 'deletion_request'))
     FOR UPDATE OF f SKIP LOCKED
  LOOP
    UPDATE public.payment_fulfillments
       SET fulfillment_status = 'needs_reconciliation',
           last_error = left(v_note || COALESCE(' | ' || last_error, ''), 1000),
           reconciliation_log = reconciliation_log || jsonb_build_array(jsonb_build_object(
             'at', now(), 'actor', 'system:creator_record_v2_retention', 'action', 'stop_automated_issuance', 'note', v_note,
             'fulfillment_status', v_f.fulfillment_status, 'email_status', v_f.email_status)),
           updated_at = now()
     WHERE stripe_checkout_session_id = v_f.stripe_checkout_session_id;
    INSERT INTO public.creator_record_v2_retention_events (event, stripe_checkout_session_id, detail)
    VALUES ('manual_resolution_required', v_f.stripe_checkout_session_id, 'refund or manual resolution required');
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;

-- ── 6. Deletion requests ──────────────────────────────────────────────────────────────────────────────

CREATE TABLE public.creator_record_v2_deletion_requests (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  document_id   uuid NOT NULL REFERENCES public.creator_record_v2_documents(id) ON DELETE RESTRICT,
  requested_at  timestamptz NOT NULL DEFAULT clock_timestamp(),
  status        text NOT NULL CHECK (status IN ('open', 'completed')),
  awaiting      text CHECK (awaiting IN ('administrative_hold', 'paid_order_in_progress')),
  resolution    text CHECK (resolution IN ('deleted', 'already_deleted')),
  resolved_at   timestamptz,
  CHECK ((status = 'completed') = (resolution IS NOT NULL)),
  CHECK ((status = 'completed') = (resolved_at IS NOT NULL)),
  CHECK (status = 'open' OR awaiting IS NULL)
);
CREATE UNIQUE INDEX creator_record_v2_deletion_requests_open_idx ON public.creator_record_v2_deletion_requests (document_id) WHERE status = 'open';

CREATE OR REPLACE FUNCTION public.creator_record_v2_deletion_requests_guard()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'a deletion request is never deleted' USING ERRCODE = 'P0001';
  END IF;
  IF (NEW.id, NEW.user_id, NEW.document_id, NEW.requested_at) IS DISTINCT FROM (OLD.id, OLD.user_id, OLD.document_id, OLD.requested_at)
     OR OLD.status = 'completed' THEN
    RAISE EXCEPTION 'a deletion request is changed only while open' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER creator_record_v2_deletion_requests_guard
  BEFORE UPDATE OR DELETE ON public.creator_record_v2_deletion_requests
  FOR EACH ROW EXECUTE FUNCTION public.creator_record_v2_deletion_requests_guard();

-- Internal (no grant). Lock order everywhere: document, then request. Result: deleted | already_deleted | awaiting_resolution | not_open.
CREATE OR REPLACE FUNCTION public.creator_record_v2_resolve_deletion_request(p_request_id uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_req      public.creator_record_v2_deletion_requests%ROWTYPE;
  v_doc      public.creator_record_v2_documents%ROWTYPE;
  v_awaiting text;
BEGIN
  SELECT * INTO v_req FROM public.creator_record_v2_deletion_requests r WHERE r.id = p_request_id;
  IF NOT FOUND THEN
    RETURN 'not_open';
  END IF;
  SELECT * INTO v_doc FROM public.creator_record_v2_documents d WHERE d.id = v_req.document_id FOR UPDATE;
  SELECT * INTO v_req FROM public.creator_record_v2_deletion_requests r WHERE r.id = p_request_id FOR UPDATE;
  IF v_req.status <> 'open' THEN
    RETURN 'not_open';
  END IF;

  IF v_doc.state = 'deleted' THEN
    UPDATE public.creator_record_v2_deletion_requests SET status = 'completed', awaiting = NULL, resolution = 'already_deleted', resolved_at = clock_timestamp() WHERE id = v_req.id;
    INSERT INTO public.creator_record_v2_retention_events (event, user_id, document_id, deletion_request_id) VALUES ('deletion_request_already_deleted', v_req.user_id, v_doc.id, v_req.id);
    RETURN 'already_deleted';
  END IF;

  IF public.creator_record_v2_document_on_hold(v_doc.id) THEN
    v_awaiting := 'administrative_hold';
  ELSIF EXISTS (SELECT 1 FROM public.creator_record_v2_document_unfinished_paid_sessions(v_doc.id)) AND v_req.requested_at + interval '14 days' > now() THEN
    v_awaiting := 'paid_order_in_progress';
  END IF;
  IF v_awaiting IS NOT NULL THEN
    IF v_req.awaiting IS DISTINCT FROM v_awaiting THEN
      UPDATE public.creator_record_v2_deletion_requests SET awaiting = v_awaiting WHERE id = v_req.id;
      INSERT INTO public.creator_record_v2_retention_events (event, user_id, document_id, deletion_request_id, detail)
      VALUES ('deletion_awaiting_resolution', v_req.user_id, v_doc.id, v_req.id, v_awaiting);
    END IF;
    RETURN 'awaiting_resolution';
  END IF;

  PERFORM set_config('si8.cr_v2_retention', 'on', true);
  UPDATE public.creator_record_v2_documents SET state = 'deleted', deleted_at = clock_timestamp(), deletion_reason = 'deletion_request' WHERE id = v_doc.id;
  PERFORM set_config('si8.cr_v2_retention', '', true);
  UPDATE public.creator_record_v2_deletion_requests SET status = 'completed', awaiting = NULL, resolution = 'deleted', resolved_at = clock_timestamp() WHERE id = v_req.id;
  INSERT INTO public.creator_record_v2_retention_events (event, user_id, document_id, deletion_request_id) VALUES ('deleted_on_request', v_req.user_id, v_doc.id, v_req.id);
  RETURN 'deleted';
END;
$$;

-- Owner action, independent of the submissions stop. Idempotent per document: an open request is re-evaluated and returned.
CREATE OR REPLACE FUNCTION public.creator_record_v2_request_document_deletion(p_user_id uuid, p_document_id uuid)
RETURNS TABLE (request_id uuid, status text, awaiting text, resolution text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_doc public.creator_record_v2_documents%ROWTYPE;
  v_id  uuid;
BEGIN
  SELECT * INTO v_doc FROM public.creator_record_v2_documents d WHERE d.id = p_document_id FOR UPDATE;
  IF NOT FOUND OR p_user_id IS NULL OR v_doc.user_id <> p_user_id OR v_doc.origin <> 'owner_upload' OR v_doc.state = 'pending' THEN
    RAISE EXCEPTION 'creator_record_v2_retention_not_found' USING ERRCODE = 'P0001';
  END IF;
  SELECT r.id INTO v_id FROM public.creator_record_v2_deletion_requests r WHERE r.document_id = v_doc.id AND r.status = 'open';
  IF NOT FOUND THEN
    INSERT INTO public.creator_record_v2_deletion_requests (user_id, document_id, status) VALUES (p_user_id, v_doc.id, 'open') RETURNING id INTO v_id;
    INSERT INTO public.creator_record_v2_retention_events (event, user_id, document_id, deletion_request_id, actor_user_id) VALUES ('deletion_requested', p_user_id, v_doc.id, v_id, p_user_id);
  END IF;
  PERFORM public.creator_record_v2_resolve_deletion_request(v_id);
  RETURN QUERY SELECT r.id, r.status, r.awaiting, r.resolution FROM public.creator_record_v2_deletion_requests r WHERE r.id = v_id;
END;
$$;

-- ── 7. The scheduled transition ───────────────────────────────────────────────────────────────────────

-- Run by the retention sweep (service_role). Bounded by p_limit per step. Returns counts as JSON.
CREATE OR REPLACE FUNCTION public.creator_record_v2_apply_retention(p_limit integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_id        uuid;
  v_doc       public.creator_record_v2_documents%ROWTYPE;
  v_r         text;
  v_requests  jsonb := '{"deleted":0,"already_deleted":0,"awaiting_resolution":0}'::jsonb;
  v_expired   integer := 0;
  v_extended  integer := 0;
  v_held      integer := 0;
  v_stopped   integer;
  v_session   text;
BEGIN
  IF p_limit IS NULL OR p_limit NOT BETWEEN 1 AND 1000 THEN
    RAISE EXCEPTION 'creator_record_v2_retention_invalid' USING ERRCODE = 'P0001';
  END IF;

  -- 1. Open deletion requests (a hold or paid order that has ended no longer stands in the way).
  FOR v_id IN SELECT r.id FROM public.creator_record_v2_deletion_requests r WHERE r.status = 'open' ORDER BY r.requested_at LIMIT p_limit LOOP
    v_r := public.creator_record_v2_resolve_deletion_request(v_id);
    IF v_r IN ('deleted', 'already_deleted', 'awaiting_resolution') THEN
      v_requests := jsonb_set(v_requests, ARRAY[v_r], to_jsonb((v_requests ->> v_r)::integer + 1));
    END IF;
  END LOOP;

  -- 2. Originals past 90 days.
  FOR v_id IN SELECT d.id FROM public.creator_record_v2_documents d
               WHERE d.state = 'stored' AND d.origin = 'owner_upload' AND d.stored_at <= now() - interval '90 days'
               ORDER BY d.stored_at LIMIT p_limit LOOP
    SELECT * INTO v_doc FROM public.creator_record_v2_documents d WHERE d.id = v_id FOR UPDATE;
    IF v_doc.state <> 'stored' THEN
      CONTINUE;
    END IF;
    IF public.creator_record_v2_document_on_hold(v_doc.id) THEN
      v_held := v_held + 1;
      CONTINUE;
    END IF;
    v_session := NULL;
    SELECT s INTO v_session FROM public.creator_record_v2_document_unfinished_paid_sessions(v_doc.id) s LIMIT 1;
    IF v_session IS NOT NULL AND v_doc.stored_at + interval '104 days' > now() THEN
      IF NOT EXISTS (SELECT 1 FROM public.creator_record_v2_retention_events e WHERE e.document_id = v_doc.id AND e.event = 'paid_order_extension_applied') THEN
        INSERT INTO public.creator_record_v2_retention_events (event, user_id, document_id, stripe_checkout_session_id, detail)
        VALUES ('paid_order_extension_applied', v_doc.user_id, v_doc.id, v_session, 'extended until ' || to_char((v_doc.stored_at + interval '104 days') AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'));
      END IF;
      v_extended := v_extended + 1;
      CONTINUE;
    END IF;
    PERFORM set_config('si8.cr_v2_retention', 'on', true);
    UPDATE public.creator_record_v2_documents SET state = 'deleted', deleted_at = clock_timestamp(), deletion_reason = 'retention_expired' WHERE id = v_doc.id;
    PERFORM set_config('si8.cr_v2_retention', '', true);
    INSERT INTO public.creator_record_v2_retention_events (event, user_id, document_id, stripe_checkout_session_id)
    VALUES ('retention_expired', v_doc.user_id, v_doc.id, v_session);
    v_expired := v_expired + 1;
  END LOOP;

  -- 3. Paid orders that can no longer be issued automatically.
  v_stopped := public.creator_record_v2_retention_stop_issuance();

  RETURN jsonb_build_object('deletion_requests', v_requests, 'expired', v_expired, 'extended', v_extended, 'held', v_held, 'issuance_stopped', v_stopped);
END;
$$;

-- What is overdue, for the sweep to fail loudly on. Removal is due 7 days after the applicable expiry (90 days, or 104 with an
-- unfinished paid order); an active hold defers it. A deleted document's object is due 7 days after its deletion.
CREATE OR REPLACE FUNCTION public.creator_record_v2_retention_status()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT jsonb_build_object(
    'overdue_expiry', (SELECT count(*) FROM public.creator_record_v2_documents d
                        WHERE d.state = 'stored' AND d.origin = 'owner_upload'
                          AND NOT public.creator_record_v2_document_on_hold(d.id)
                          AND now() > d.stored_at + CASE WHEN EXISTS (SELECT 1 FROM public.creator_record_v2_document_unfinished_paid_sessions(d.id))
                                                         THEN interval '104 days' ELSE interval '90 days' END + interval '7 days'),
    'removal_pending', (SELECT count(*) FROM public.creator_record_v2_documents d WHERE d.state = 'deleted' AND d.object_removed_at IS NULL),
    'overdue_removal', (SELECT count(*) FROM public.creator_record_v2_documents d
                         WHERE d.state = 'deleted' AND d.object_removed_at IS NULL AND d.deleted_at < now() - interval '7 days'),
    'open_deletion_requests', (SELECT count(*) FROM public.creator_record_v2_deletion_requests r WHERE r.status = 'open'),
    'deletion_requests_awaiting_hold', (SELECT count(*) FROM public.creator_record_v2_deletion_requests r WHERE r.status = 'open' AND r.awaiting = 'administrative_hold'),
    'active_holds', (SELECT count(*) FROM public.creator_record_v2_retention_holds h WHERE h.released_at IS NULL AND h.starts_at <= now() AND h.expires_at > now()),
    'manual_resolution_open', (SELECT count(*) FROM public.payment_fulfillments f
                                WHERE f.fulfillment_status = 'needs_reconciliation' AND f.last_error LIKE 'retention_original_unavailable:%'))
$$;

-- ── Privileges ────────────────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.creator_record_v2_retention_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_record_v2_consent_withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_record_v2_retention_holds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_record_v2_deletion_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.creator_record_v2_retention_events FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE public.creator_record_v2_consent_withdrawals FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE public.creator_record_v2_retention_holds FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE public.creator_record_v2_deletion_requests FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON TABLE public.creator_record_v2_retention_events TO service_role;
GRANT SELECT ON TABLE public.creator_record_v2_consent_withdrawals TO service_role;
GRANT SELECT ON TABLE public.creator_record_v2_retention_holds TO service_role;
GRANT SELECT ON TABLE public.creator_record_v2_deletion_requests TO service_role;

REVOKE ALL ON FUNCTION public.creator_record_v2_documents_guard() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.creator_record_v2_consent_examination_guard() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.creator_record_v2_retention_holds_guard() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.creator_record_v2_deletion_requests_guard() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.creator_record_v2_document_on_hold(uuid) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.creator_record_v2_retention_require_admin(uuid) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.creator_record_v2_document_unfinished_paid_sessions(uuid) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.creator_record_v2_retention_stop_issuance() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.creator_record_v2_resolve_deletion_request(uuid) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.creator_record_v2_withdraw_consent(uuid) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.creator_record_v2_place_retention_hold(uuid, uuid, text, integer) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.creator_record_v2_renew_retention_hold(uuid, uuid, text, integer) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.creator_record_v2_release_retention_hold(uuid, uuid, text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.creator_record_v2_request_document_deletion(uuid, uuid) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.creator_record_v2_apply_retention(integer) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.creator_record_v2_retention_status() FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.creator_record_v2_withdraw_consent(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.creator_record_v2_place_retention_hold(uuid, uuid, text, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.creator_record_v2_renew_retention_hold(uuid, uuid, text, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.creator_record_v2_release_retention_hold(uuid, uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.creator_record_v2_request_document_deletion(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.creator_record_v2_apply_retention(integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.creator_record_v2_retention_status() TO service_role;
