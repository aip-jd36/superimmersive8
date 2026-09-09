-- Migration: Reviewer CRC context-access audit (CAH-4C)
-- Date: 2026-09-09
--
-- CAH-4B gave a Commercial Assurance reviewer a read-only view of the CRC
-- context associated with a submission. CAH-4C lets the reviewer DELIBERATELY
-- open the verbatim transcript of an authoritatively-associated CRC
-- conversation — and the access must be durably audited BEFORE any transcript
-- content is returned (fail-closed audit-before-content, the same discipline
-- `crc_sales_events` enforces for the Sales transcript route).
--
-- 1. crc_context_access_events — DEDICATED append-only audit for reads through
--    the reviewer-context surface. Same rationale as `crc_sales_events` /
--    `crc_assurance_association_events` (CAH-3B / CAH-3D):
--      * NOT crc_pilot_events (no actor, session_id TEXT non-FK).
--      * NOT crc_analytics_events (logAnalyticsEvent is fail-OPEN / never
--        throws — the exact opposite of what an audit-before-content contract
--        needs).
--      * NOT crc_sales_events — that table's `event_type` CHECK is
--        `('transcript_viewed')` only, its purpose/retention is Sales-abuse
--        investigation, and it has no submission/association reference.
--        Conflating a reviewer's assessment-context access with a sales rep's
--        lead-qualification access weakens both audit trails.
--      * NOT crc_assurance_association_events — that table's `event_type`
--        CHECK is a deliberate 2-value set (`association_created` /
--        `association_removed`), both SECURITY-CRITICAL lifecycle events
--        written IN THE SAME TRANSACTION as the association state change. A
--        transcript-view is a READ event of a different class, not a state
--        change, and would blur that constraint. That table is also keyed on
--        the association; a future submission-scoped reviewer access (e.g.
--        Reviewer Living Knowledge research, CAH-4D) has no association at all
--        and could not be recorded there without distortion.
--
--    `crc_context_access_events` is the one home for every deliberate read a
--    reviewer performs through the reviewer-context surface. `access_kind`
--    discriminates; its only value today is `'transcript'`. A future access
--    kind (e.g. Living Knowledge research) is added by extending the CHECK —
--    NO speculative columns for it are added here.
--
--    * actor_user_id / submission_id: NOT NULL — every reviewer-context access
--      is performed by an authenticated reviewer, scoped to one submission
--      (the route is /api/admin/submissions/[id]/...).
--    * association_id / crc_session_id: NULLABLE — a `'transcript'` access
--      names both (enforced by CHECK below); a future non-association-scoped
--      access kind would leave them NULL.
--    * No FK: append-only audit history must survive an ON DELETE CASCADE of
--      the submission or the association. Denormalized so the trail is
--      queryable without the (possibly-deleted) parent rows.
--    * No conversation content, no project state, no transcript text — the
--      bounded ACCESS FACT only. This table never says or implies the
--      reviewer relied on, accepted, or was influenced by the transcript.
--
-- Additive only. No existing table, column, constraint, function, or policy is
-- modified. RLS enabled, service_role-only, same posture as every other crc_*
-- audit table — reached ONLY through lib/reviewer-context/repository.ts via
-- supabaseAdmin in authenticated /api/admin/* routes; no anon/authenticated
-- access path.

-- =============================================
-- UP
-- =============================================

CREATE TABLE IF NOT EXISTS crc_context_access_events (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  access_kind    TEXT NOT NULL,
  actor_user_id  UUID NOT NULL,
  submission_id  UUID NOT NULL,
  association_id UUID,
  crc_session_id UUID,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Governed vocabulary. Only `'transcript'` today; extend deliberately.
DO $$ BEGIN
  ALTER TABLE crc_context_access_events
    ADD CONSTRAINT crc_context_access_events_access_kind_values
    CHECK (access_kind IN ('transcript'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- A transcript access is always association- AND session-scoped.
DO $$ BEGIN
  ALTER TABLE crc_context_access_events
    ADD CONSTRAINT crc_context_access_events_transcript_is_scoped
    CHECK (
      access_kind <> 'transcript'
      OR (association_id IS NOT NULL AND crc_session_id IS NOT NULL)
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Read paths: "all accesses for this submission, newest first" (the reviewer
-- audit view) and "all accesses of this association" (per-conversation trail).
CREATE INDEX IF NOT EXISTS crc_context_access_events_submission_idx
  ON crc_context_access_events (submission_id, created_at DESC);
CREATE INDEX IF NOT EXISTS crc_context_access_events_association_idx
  ON crc_context_access_events (association_id, created_at DESC)
  WHERE association_id IS NOT NULL;

ALTER TABLE crc_context_access_events ENABLE ROW LEVEL SECURITY;
-- No SELECT/INSERT/UPDATE/DELETE policies — service_role only, same posture as
-- crc_sales_events / crc_assurance_association_events. Default-deny for anon
-- and authenticated.
GRANT ALL ON public.crc_context_access_events TO service_role;

COMMENT ON TABLE crc_context_access_events IS
  'CAH-4C. Append-only audit of deliberate reviewer reads through the reviewer-context surface. access_kind = transcript today. Records the bounded ACCESS FACT only — never that the transcript became evidence, was accepted, or affected an assessment.';

-- =============================================
-- DOWN (rollback) — commented, matching repo convention
-- =============================================
-- DROP TABLE IF EXISTS crc_context_access_events;
