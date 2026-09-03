-- Migration: CRC <-> Assurance association core (CAH-3D)
-- Date: 2026-09-04
--
-- Accepted design: CAH-3C discovery + CAH-3C.1 semantic contract. Implements
-- ONLY the policy-independent association core:
--
--   "Authenticated Assurance user U deliberately associated CRC work product X
--    with Assurance submission Y at time T under authorization basis B."
--
-- This milestone does NOT build a usable customer association flow. There is
-- no candidate discovery, no email match, no cookie/reference/token front
-- door, no customer/reviewer/admin route or UI. Every association row is
-- created by a trusted internal service caller (tests, or a future deliberate
-- internal backfill) -- see the `authorization_basis` CHECK below, which for
-- CAH-3D permits exactly one honestly-labelled value.
--
-- CAH-3C.1 propositions encoded here:
--   P2/P3  -- an association is an authenticated actor's deliberate C1 claim,
--            NOT proof of historical CRC creation/control/ownership. No column
--            is named ownership_* / verified_crc_owner / crc_owner.
--   P6     -- the minimum contract: association identity, CRC work-product ref,
--            submission ref, authenticated actor, timestamp, authorization
--            basis, active/removed + removal attribution, state-binding info.
--   P7     -- N CRC sessions may associate to one submission; one active
--            (crc_session_id, submission_id) pair is not duplicated. There is
--            deliberately NO global UNIQUE(crc_session_id): a future legitimate
--            replacement / reassessment / resubmission must be able to
--            associate the same CRC work product. Whether 1 CRC -> N
--            submissions is ultimately permitted remains UNRESOLVED and is not
--            foreclosed here.
--   P8/P9  -- state binding is over PERSISTED CRC PROJECT STATE
--            (StructuredUnderstanding), captured as a canonical-form fingerprint
--            plus a canonicalization-contract version. runtime_commit is a
--            SEPARATE weak temporal anchor column, never mixed into the
--            content fingerprint.
--   P10    -- historical BI is never stored here (it was never persisted
--            anywhere; recomputation is not a substitute). No BI/Retrieval/
--            Projection column exists.
--   P15    -- association_created and association_removed are the
--            security-critical audit events. They are written in the SAME
--            transaction as the association state change by the functions
--            below -- if the audit INSERT fails, the association operation
--            fails (CAH-3B transcript lesson: a required audit is not
--            best-effort).
--
-- Additive only. No existing table, column, constraint, function, or policy is
-- modified. RLS enabled, service_role-only, same posture as every crc_* table.
-- The association core is reached only through lib/crc-assurance-handoff/*,
-- which uses supabaseAdmin; there is no anon/authenticated access path.

-- =============================================
-- UP
-- =============================================

-- -- crc_assurance_associations ------------------------------------------------

CREATE TABLE IF NOT EXISTS crc_assurance_associations (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- CRC work-product reference. NO ON DELETE CASCADE: a crc_sessions row must
  -- not be deletable out from under a security-critical association without
  -- deliberate handling (CAH-3C.1 §19 -- full CRC-erasure-vs-delivered-report
  -- policy is explicitly deferred; the fail-closed choice for the core is to
  -- restrict). crc_sessions has no application delete path today.
  crc_session_id            UUID NOT NULL REFERENCES crc_sessions(id),

  -- Assurance submission reference. ON DELETE CASCADE is safe here: if the
  -- submission is gone the association has no meaning, and the security-audit
  -- trail lives in crc_assurance_association_events (no FK, append-only), so
  -- deleting the association row never destroys the audit history.
  submission_id             UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,

  -- Authenticated actor who made the deliberate association claim
  -- (auth.users.id / public.users.id). No FK -- same decoupled posture as
  -- crc_sales_state.updated_by / crc_sales_events.actor_user_id (CAH-3B): the
  -- attributable fact is "this id claimed it at this time," which must survive
  -- a later user deletion.
  associated_by             UUID NOT NULL,
  associated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- HOW the product permitted the association action -- a PERMISSION fact,
  -- never an ownership fact (CAH-3C.1 §H). CAH-3D has no customer-facing
  -- authorization front door, so the only honest value is
  -- 'core_internal_uninferred' (a trusted internal service caller, no
  -- real-world signal inferred). The real-world bases -- same-browser
  -- possession, reference-code possession, association-token possession,
  -- delegated authorization -- are added to this CHECK, and to the TS
  -- AuthorizationBasis type, ONLY by the milestone that builds the
  -- corresponding front door. None of them, and certainly not this one, imply
  -- historical CRC ownership.
  authorization_basis       TEXT NOT NULL,

  status                    TEXT NOT NULL DEFAULT 'active',
  removed_at                TIMESTAMPTZ,
  removed_by                UUID,

  -- State binding (CAH-3C.1 SB1-SB4). The fingerprint is a canonical-form
  -- digest of the PERSISTED StructuredUnderstanding at association time; the
  -- version identifies the canonicalization contract that produced it, so a
  -- later comparison across incompatible versions fails closed to
  -- "comparison unavailable" rather than a false "unchanged."
  crc_state_fingerprint     TEXT NOT NULL,
  crc_state_canon_version   TEXT NOT NULL,

  -- SB5 weak temporal anchor: the CRC session's runtime_commit captured at
  -- association time. Deliberately a SEPARATE column, never folded into
  -- crc_state_fingerprint. Proves only "which deploy served the session" --
  -- NOT historical claim/Matrix/TopicClaim/Retrieval/BI state.
  crc_session_runtime_commit TEXT,

  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$ BEGIN
  ALTER TABLE crc_assurance_associations
    ADD CONSTRAINT crc_assurance_associations_status_values
    CHECK (status IN ('active', 'removed'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CAH-3D permits exactly one authorization basis: an honestly-labelled
-- "no front door was used" value. Widening this CHECK is a deliberate act of
-- the milestone that builds a real front door.
DO $$ BEGIN
  ALTER TABLE crc_assurance_associations
    ADD CONSTRAINT crc_assurance_associations_authorization_basis_values
    CHECK (authorization_basis IN ('core_internal_uninferred'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- removed <=> (removed_at AND removed_by) present; active <=> both absent.
DO $$ BEGIN
  ALTER TABLE crc_assurance_associations
    ADD CONSTRAINT crc_assurance_associations_removal_consistency
    CHECK (
      (status = 'active'  AND removed_at IS NULL     AND removed_by IS NULL)
      OR
      (status = 'removed' AND removed_at IS NOT NULL AND removed_by IS NOT NULL)
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- P7: one ACTIVE (crc_session_id, submission_id) pair is not duplicated.
-- Partial index -> a removed association plus a new active one for the same
-- pair is allowed (re-association after removal), and the same crc_session_id
-- may be active against DIFFERENT submissions. This is NOT UNIQUE(crc_session_id).
CREATE UNIQUE INDEX IF NOT EXISTS crc_assurance_associations_active_pair_uniq
  ON crc_assurance_associations (crc_session_id, submission_id)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS crc_assurance_associations_submission_idx
  ON crc_assurance_associations (submission_id, status);
CREATE INDEX IF NOT EXISTS crc_assurance_associations_session_idx
  ON crc_assurance_associations (crc_session_id, status);

CREATE OR REPLACE FUNCTION crc_assurance_associations_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS crc_assurance_associations_updated_at ON crc_assurance_associations;
CREATE TRIGGER crc_assurance_associations_updated_at
  BEFORE UPDATE ON crc_assurance_associations
  FOR EACH ROW
  EXECUTE PROCEDURE crc_assurance_associations_touch_updated_at();

ALTER TABLE crc_assurance_associations ENABLE ROW LEVEL SECURITY;
-- No SELECT/INSERT/UPDATE/DELETE policies -- service_role only, same posture as
-- crc_sessions / crc_leads / crc_sales_state.
GRANT ALL ON public.crc_assurance_associations TO service_role;

-- -- crc_assurance_association_events (security-critical audit) ----------------
--
-- DEDICATED append-only audit, same rationale as crc_sales_events (CAH-3B):
-- NOT crc_pilot_events (no actor, session_id TEXT non-FK), NOT
-- crc_analytics_events (fail-OPEN). No FK to crc_assurance_associations, so an
-- ON DELETE CASCADE from submissions can never erase audit history. Denormalized
-- crc_session_id / submission_id so the trail is queryable without the
-- (possibly-deleted) association row. No conversation content, no project state.

CREATE TABLE IF NOT EXISTS crc_assurance_association_events (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type          TEXT NOT NULL,
  association_id      UUID NOT NULL,
  actor_user_id       UUID NOT NULL,
  crc_session_id      UUID NOT NULL,
  submission_id       UUID NOT NULL,
  authorization_basis TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$ BEGIN
  ALTER TABLE crc_assurance_association_events
    ADD CONSTRAINT crc_assurance_association_events_event_type_values
    CHECK (event_type IN ('association_created', 'association_removed'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS crc_assurance_association_events_assoc_idx
  ON crc_assurance_association_events (association_id, created_at DESC);
CREATE INDEX IF NOT EXISTS crc_assurance_association_events_submission_idx
  ON crc_assurance_association_events (submission_id, created_at DESC);

ALTER TABLE crc_assurance_association_events ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.crc_assurance_association_events TO service_role;

-- -- Atomic create ----------------------------------------------------------
--
-- Association row + required 'association_created' audit event in ONE
-- transaction (the implicit plpgsql function transaction). If the audit INSERT
-- raises, the whole function rolls back -> no association row exists (CAH-3D
-- §23). Submission ownership is re-checked here defensively (closes the
-- service-layer TOCTOU window). The partial unique index surfaces a duplicate
-- ACTIVE pair as a unique_violation, which the caller maps to a typed
-- 'duplicate_active' result rather than a raw error.
--
-- Completion eligibility (completion_reason in the 5 governed values, and
-- product_stop_reason conferring NOTHING) is enforced by the TS service before
-- this is called -- it needs the deserialized StructuredUnderstanding, which is
-- cleaner in TS than in SQL. This function trusts that check and does not
-- re-implement it.

CREATE OR REPLACE FUNCTION create_crc_assurance_association(
  p_crc_session_id            UUID,
  p_submission_id             UUID,
  p_associated_by             UUID,
  p_authorization_basis       TEXT,
  p_crc_state_fingerprint     TEXT,
  p_crc_state_canon_version   TEXT,
  p_crc_session_runtime_commit TEXT
) RETURNS JSONB AS $$
DECLARE
  v_owns BOOLEAN;
  v_row  crc_assurance_associations%ROWTYPE;
BEGIN
  -- Submission must exist AND be owned by the acting user.
  SELECT EXISTS (
    SELECT 1 FROM submissions
    WHERE id = p_submission_id AND user_id = p_associated_by
  ) INTO v_owns;
  IF NOT v_owns THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_submission_owner');
  END IF;

  BEGIN
    INSERT INTO crc_assurance_associations (
      crc_session_id, submission_id, associated_by, authorization_basis,
      crc_state_fingerprint, crc_state_canon_version, crc_session_runtime_commit
    ) VALUES (
      p_crc_session_id, p_submission_id, p_associated_by, p_authorization_basis,
      p_crc_state_fingerprint, p_crc_state_canon_version, p_crc_session_runtime_commit
    )
    RETURNING * INTO v_row;
  EXCEPTION
    WHEN unique_violation THEN
      RETURN jsonb_build_object('ok', false, 'reason', 'duplicate_active');
    WHEN foreign_key_violation THEN
      -- crc_session_id or submission_id does not exist.
      RETURN jsonb_build_object('ok', false, 'reason', 'reference_not_found');
  END;

  -- Required audit -- same transaction. A failure here rolls back the INSERT above.
  INSERT INTO crc_assurance_association_events (
    event_type, association_id, actor_user_id, crc_session_id, submission_id, authorization_basis
  ) VALUES (
    'association_created', v_row.id, p_associated_by, p_crc_session_id, p_submission_id, p_authorization_basis
  );

  RETURN jsonb_build_object('ok', true, 'association', to_jsonb(v_row));
END;
$$ LANGUAGE plpgsql;

-- -- Atomic remove ---------------------------------------------------------
--
-- Locks the association row (FOR UPDATE), verifies it is active and that the
-- acting user owns the associated submission, flips status -> removed with
-- attribution, writes the required 'association_removed' audit event -- all in
-- one transaction. Audit failure rolls back the status change (association
-- stays active).

CREATE OR REPLACE FUNCTION remove_crc_assurance_association(
  p_association_id UUID,
  p_removed_by     UUID
) RETURNS JSONB AS $$
DECLARE
  v_row  crc_assurance_associations%ROWTYPE;
  v_new  crc_assurance_associations%ROWTYPE;
  v_owns BOOLEAN;
BEGIN
  SELECT * INTO v_row FROM crc_assurance_associations WHERE id = p_association_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'association_not_found');
  END IF;
  IF v_row.status <> 'active' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_active');
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM submissions
    WHERE id = v_row.submission_id AND user_id = p_removed_by
  ) INTO v_owns;
  IF NOT v_owns THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_submission_owner');
  END IF;

  UPDATE crc_assurance_associations
     SET status = 'removed', removed_at = now(), removed_by = p_removed_by
   WHERE id = p_association_id
   RETURNING * INTO v_new;

  INSERT INTO crc_assurance_association_events (
    event_type, association_id, actor_user_id, crc_session_id, submission_id, authorization_basis
  ) VALUES (
    'association_removed', p_association_id, p_removed_by, v_row.crc_session_id, v_row.submission_id, NULL
  );

  RETURN jsonb_build_object('ok', true, 'association', to_jsonb(v_new));
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- DOWN (rollback) -- commented, matching repo convention
-- =============================================
-- DROP FUNCTION IF EXISTS remove_crc_assurance_association(UUID, UUID);
-- DROP FUNCTION IF EXISTS create_crc_assurance_association(UUID, UUID, UUID, TEXT, TEXT, TEXT, TEXT);
-- DROP TABLE IF EXISTS crc_assurance_association_events;
-- DROP TRIGGER IF EXISTS crc_assurance_associations_updated_at ON crc_assurance_associations;
-- DROP FUNCTION IF EXISTS crc_assurance_associations_touch_updated_at();
-- DROP TABLE IF EXISTS crc_assurance_associations;
