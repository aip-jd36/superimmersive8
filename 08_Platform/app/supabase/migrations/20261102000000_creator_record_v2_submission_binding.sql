-- CR-V2-MVP-M3 — bind a reviewed Creator Record v2 prepared version to a submission.
--
-- ADDITIVE. Requires 20261101000000_creator_record_v2_prepared.sql (applied first).
--   * submissions.creator_record_product: new NULLABLE column. NULL = every existing
--     and every V1 submission (unchanged). 'v2' = a Creator Record v2 submission.
--     Only valid on tier 'creator_record'. Immutable once the row exists, and a 'v2'
--     row can only be created by create_creator_record_v2_submission() below.
--   * creator_record_v2_prepared_guard(): REPLACED with a stricter version (the M2
--     rules are kept unchanged, and):
--       - all writes to one draft are serialized (transaction advisory lock);
--       - versions are contiguous: a new version is exactly latest + 1;
--       - only the draft's latest version can be reviewed or bound (a superseded
--         version can never be bought);
--       - binding is possible only through create_creator_record_v2_submission(),
--         to a v2 submission of the same owner.
--   * create_creator_record_v2_submission(): atomic and idempotent. In one
--     transaction it locks the prepared row, re-checks owner, review state, the
--     digest the server verified and that no newer version exists, then either
--     returns the submission it is already bound to or creates the v2 submission
--     (pending / unpaid) and binds it.
--
-- No existing row, policy or grant is changed. No V1 column, trigger or function
-- is changed. Payment acceptance and price stay with the payment ledger
-- (a v2 submission is an ordinary 'creator_record' submission to it).
--
-- DEPLOY ORDER: apply this migration BEFORE deploying code that reads
-- submissions.creator_record_product (checkout + fulfilment select it; without the
-- column every Creator Record fulfilment would fail closed, V1 included).
-- Before applying, confirm the production `submissions` NOT NULL columns still
-- match 001_initial_schema.sql (the function below fills them with neutral values).

-- ── Marker column ─────────────────────────────────────────────────────────────

ALTER TABLE public.submissions ADD COLUMN IF NOT EXISTS creator_record_product text;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'submissions_creator_record_product_check') THEN
    ALTER TABLE public.submissions ADD CONSTRAINT submissions_creator_record_product_check
      CHECK (creator_record_product IS NULL OR (creator_record_product = 'v2' AND tier = 'creator_record'));
  END IF;
END
$$;

CREATE OR REPLACE FUNCTION public.submissions_creator_record_product_guard()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.creator_record_product IS NOT NULL AND current_setting('si8.cr_v2_binding', true) IS DISTINCT FROM 'on' THEN
      RAISE EXCEPTION 'a Creator Record v2 submission is created only by create_creator_record_v2_submission' USING ERRCODE = 'P0001';
    END IF;
    RETURN NEW;
  END IF;
  IF NEW.creator_record_product IS DISTINCT FROM OLD.creator_record_product THEN
    RAISE EXCEPTION 'submissions.creator_record_product is immutable' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS submissions_creator_record_product_guard ON public.submissions;
CREATE TRIGGER submissions_creator_record_product_guard
  BEFORE INSERT OR UPDATE ON public.submissions
  FOR EACH ROW EXECUTE FUNCTION public.submissions_creator_record_product_guard();

-- ── Stricter prepared-record guard ───────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.creator_record_v2_prepared_guard()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  v_latest integer;
  v_sub    record;
BEGIN
  -- Serialize every write to one draft (insert of a new version vs review vs bind).
  IF TG_OP = 'DELETE' THEN
    PERFORM pg_advisory_xact_lock(hashtextextended('si8.cr_v2_draft:' || OLD.draft_id::text, 0));
  ELSE
    PERFORM pg_advisory_xact_lock(hashtextextended('si8.cr_v2_draft:' || NEW.draft_id::text, 0));
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.status <> 'prepared' OR NEW.reviewed_at IS NOT NULL OR NEW.submission_id IS NOT NULL THEN
      RAISE EXCEPTION 'a prepared record is inserted as prepared, unreviewed and unbound' USING ERRCODE = 'P0001';
    END IF;
    IF EXISTS (SELECT 1 FROM public.creator_record_v2_prepared p WHERE p.draft_id = NEW.draft_id AND p.user_id <> NEW.user_id) THEN
      RAISE EXCEPTION 'every version of a draft belongs to one owner' USING ERRCODE = 'P0001';
    END IF;
    SELECT max(p.version) INTO v_latest FROM public.creator_record_v2_prepared p WHERE p.draft_id = NEW.draft_id;
    IF NEW.version <> coalesce(v_latest, 0) + 1 THEN
      RAISE EXCEPTION 'a new version of a draft is exactly the latest version + 1' USING ERRCODE = 'P0001';
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

  SELECT max(p.version) INTO v_latest FROM public.creator_record_v2_prepared p WHERE p.draft_id = NEW.draft_id;

  IF OLD.status = 'prepared' THEN
    -- Only the review transition, and no binding in the same statement.
    IF NEW.status <> 'reviewed' OR NEW.submission_id IS NOT NULL THEN
      RAISE EXCEPTION 'a prepared record may only be marked reviewed' USING ERRCODE = 'P0001';
    END IF;
    IF OLD.version <> v_latest THEN
      RAISE EXCEPTION 'only the latest version of a draft can be reviewed' USING ERRCODE = 'P0001';
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
  IF OLD.submission_id IS NULL AND NEW.submission_id IS NOT NULL THEN
    IF current_setting('si8.cr_v2_binding', true) IS DISTINCT FROM 'on' THEN
      RAISE EXCEPTION 'a prepared record is bound only by create_creator_record_v2_submission' USING ERRCODE = 'P0001';
    END IF;
    IF OLD.version <> v_latest THEN
      RAISE EXCEPTION 'a superseded version cannot be bound' USING ERRCODE = 'P0001';
    END IF;
    SELECT s.user_id, s.tier, s.creator_record_product INTO v_sub FROM public.submissions s WHERE s.id = NEW.submission_id;
    IF NOT FOUND OR v_sub.user_id <> OLD.user_id OR v_sub.tier <> 'creator_record' OR v_sub.creator_record_product IS DISTINCT FROM 'v2' THEN
      RAISE EXCEPTION 'a prepared record binds only to a v2 submission of the same owner' USING ERRCODE = 'P0001';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- ── Atomic, idempotent submission creation + binding ─────────────────────────
--
-- out_reason:
--   'created'      a new v2 submission was created and bound (out_submission_id)
--   'existing'     already bound; the same submission is returned (idempotent)
--   'not_found'    no such prepared version for this owner (indistinguishable)
--   'not_reviewed' the version has not been reviewed
--   'digest_mismatch' the stored digest is not the one the server verified
--   'superseded'   a newer version of the draft exists

CREATE OR REPLACE FUNCTION public.create_creator_record_v2_submission(
  p_prepared_id    uuid,
  p_user_id        uuid,
  p_sha256         text,
  p_filmmaker_name text
) RETURNS TABLE (out_submission_id uuid, out_reason text)
LANGUAGE plpgsql AS $$
DECLARE
  v_row    public.creator_record_v2_prepared%ROWTYPE;
  v_latest integer;
  v_sub    uuid;
BEGIN
  PERFORM set_config('si8.cr_v2_binding', 'on', true);

  SELECT * INTO v_row FROM public.creator_record_v2_prepared WHERE id = p_prepared_id FOR UPDATE;
  IF NOT FOUND OR v_row.user_id IS DISTINCT FROM p_user_id THEN
    PERFORM set_config('si8.cr_v2_binding', '', true);
    RETURN QUERY SELECT NULL::uuid, 'not_found'::text;
    RETURN;
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('si8.cr_v2_draft:' || v_row.draft_id::text, 0));

  IF v_row.submission_id IS NOT NULL THEN
    PERFORM set_config('si8.cr_v2_binding', '', true);
    -- Idempotent, but still only for the exact record the caller verified.
    IF v_row.sha256 IS DISTINCT FROM p_sha256 THEN
      RETURN QUERY SELECT NULL::uuid, 'digest_mismatch'::text;
      RETURN;
    END IF;
    RETURN QUERY SELECT v_row.submission_id, 'existing'::text;
    RETURN;
  END IF;
  IF v_row.status <> 'reviewed' THEN
    PERFORM set_config('si8.cr_v2_binding', '', true);
    RETURN QUERY SELECT NULL::uuid, 'not_reviewed'::text;
    RETURN;
  END IF;
  IF v_row.sha256 IS DISTINCT FROM p_sha256 THEN
    PERFORM set_config('si8.cr_v2_binding', '', true);
    RETURN QUERY SELECT NULL::uuid, 'digest_mismatch'::text;
    RETURN;
  END IF;
  SELECT max(p.version) INTO v_latest FROM public.creator_record_v2_prepared p WHERE p.draft_id = v_row.draft_id;
  IF v_row.version <> v_latest THEN
    PERFORM set_config('si8.cr_v2_binding', '', true);
    RETURN QUERY SELECT NULL::uuid, 'superseded'::text;
    RETURN;
  END IF;

  -- The prepared record is the authority for content; the V1 intake columns get neutral values.
  INSERT INTO public.submissions (
    user_id, tier, status, payment_status, creator_record_product,
    title, filmmaker_name, tools_used, authorship_statement, likeness_confirmation, ip_confirmation, audio_disclosure
  ) VALUES (
    p_user_id, 'creator_record', 'pending', 'unpaid', 'v2',
    'Creator Record', coalesce(nullif(trim(p_filmmaker_name), ''), 'Creator'), '[]'::jsonb, '', '{}'::jsonb, '{}'::jsonb, '{}'::jsonb
  ) RETURNING id INTO v_sub;

  UPDATE public.creator_record_v2_prepared SET submission_id = v_sub WHERE id = v_row.id;
  PERFORM set_config('si8.cr_v2_binding', '', true);
  RETURN QUERY SELECT v_sub, 'created'::text;
END;
$$;

REVOKE ALL ON FUNCTION public.submissions_creator_record_product_guard() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.create_creator_record_v2_submission(uuid, uuid, text, text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.create_creator_record_v2_submission(uuid, uuid, text, text) TO service_role;
