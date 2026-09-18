-- Migration: durable Material Demand governance-intake foundation
-- Date: 2026-09-18
--
-- LK-DEMAND-2D1 (Durable Governance Review-Container Foundation), the
-- smallest durable architecture approved by LK-DEMAND-2D/2D0 for turning
-- qualified Material Demand evidence (crc_knowledge_demand_occurrences,
-- LK-DEMAND-2C) into reviewable human-governance input.
--
-- CORE INVARIANT (2D/2D0's own core finding, restated here because it is
-- this migration's entire reason for existing): a row in either table below
-- proves ONLY that a human reviewer intentionally created a review
-- container, or intentionally associated one piece of historical evidence
-- with one such container. It proves NOTHING about:
--   - subject identity (GovernedSubject, GovernedSubjectType);
--   - a KnowledgeTopic;
--   - a domain or platform classification;
--   - knowledge coverage or non-coverage;
--   - a knowledge gap;
--   - an onboarding decision;
--   - priority or confidence;
--   - a customer-facing conclusion.
-- Accordingly, NEITHER table below has a subject/coverage/domain/gap/
-- onboarding/priority/confidence/workflow-state/decision column, by design
-- (2D0's own explicit exclusion list) -- not because those concerns don't
-- matter, but because 2D1 has no authoritative contract yet for any of
-- them (GovernedSubject identity admission is not yet operationally
-- defined anywhere in this codebase -- only the empty type-level ontology,
-- GOVERNED_SUBJECT_TYPES = [] as const, exists). Adding such a field now
-- would let this intake layer silently pre-empt a governance act that
-- hasn't been designed yet.
--
-- Neither table is read by, or has any effect on, CRC runtime: Retrieval,
-- Track A/B/C, Bounded Interpretation, Composition, Projection,
-- questioning, completion, or the Results Gate. Candidate creation is
-- exclusively a human/reviewer-initiated server-side operation -- no
-- extraction/persistence/completion code path may create a candidate (see
-- lib/crc-engine/governance-candidates.ts's own header).
--
-- =============================================
-- TABLE 1: crc_knowledge_demand_governance_candidates
-- =============================================
--
-- A durable, human-created review container. Nothing more. `label` is a
-- reviewer's own free-text organizational note -- never auto-populated
-- from raw customer text (enforced by the repository function's own
-- contract, not by this schema), never unique (two reviewers may
-- legitimately use similar working language), never treated as an alias,
-- canonical identity, or taxonomy. Mutable: a reviewer may edit their own
-- label in place -- this cannot mutate evidence or any Living Knowledge
-- registry, since nothing else references label content.
--
-- Deliberately excluded (2D0's own explicit list, all still correct):
-- resolved_subject_id, target_subject_id, subject_id, subject_type,
-- subject_type_guess, normalized_concept, domain, workflow_state, status,
-- decision, coverage_status, knowledge_gap_status, onboarding_status,
-- priority, confidence, crc_eligible, runtime_commit, schema_version.
-- workflow_state specifically deferred to a later milestone (2D2) that
-- will actually have a reviewer UI to consume it -- adding it now, with
-- zero consumers, would be exactly the speculative field 2D0 warns
-- against.
--
-- created_by: UUID, NOT NULL, no FK -- mirrors the established
-- actor_user_id convention used identically across crc_sales_events
-- (20260903000000), crc_assurance_associations (20260904000000), and
-- reviewer_crc_context_access_events (20260909010000): a server-resolved
-- reviewer/admin identity (lib/auth/admin.ts's requireAdmin(), which
-- returns an authenticated user already verified against users.is_admin),
-- never client-supplied, never a new identity system, and deliberately no
-- FK to `users` since no other table in this codebase establishes that
-- precedent either -- this migration does not introduce one.

CREATE TABLE IF NOT EXISTS crc_knowledge_demand_governance_candidates (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label         TEXT NOT NULL,
  created_by    UUID NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE crc_knowledge_demand_governance_candidates ENABLE ROW LEVEL SECURITY;
-- No SELECT/INSERT/UPDATE/DELETE policies -- same posture as every other
-- crc_* evidence/governance table (crc_sessions, crc_knowledge_demand_occurrences,
-- crc_context_access_events, crc_sales_events): RLS enabled with ZERO
-- policies (default-deny for anon/authenticated), service_role only.
GRANT ALL ON public.crc_knowledge_demand_governance_candidates TO service_role;

-- =============================================
-- TABLE 2: crc_knowledge_demand_governance_candidate_evidence
-- =============================================
--
-- The durable fact that a reviewer associated one specific, historical
-- Material Demand evidence row with one candidate. References
-- crc_knowledge_demand_occurrences.id -- the evidence table's own
-- immutable gen_random_uuid() primary key -- never occurrence_id, which is
-- only unique WITHIN a session (UNIQUE(session_id, occurrence_id), see
-- that table's own migration, 20260918010000), not globally; referencing
-- the immutable row id lets one candidate cleanly aggregate evidence
-- across many different sessions with a single scalar FK.
--
-- UNIQUE(candidate_id, evidence_row_id) is an ORDINARY (non-partial)
-- unique constraint -- LK-DEMAND-2D1's own explicit correction to the
-- 2D0 design report, which had proposed a partial index permitting
-- multiple historical link/unlink/relink rows. 2D1 is NOT event-sourcing
-- link/unlink chronology: one candidate x one evidence row = exactly one
-- durable association row, full stop. Current state is represented by
-- unlinked_at (NULL = currently linked, NOT NULL = currently unlinked);
-- relinking reactivates the SAME row (unlinked_at set back to NULL) rather
-- than inserting a second row. If repeated link/unlink chronology ever
-- proves materially necessary, that is a separately-designed audit/event
-- mechanism, not something this table simulates via duplicate rows.
--
-- linked_by: UUID NOT NULL, same actor_user_id-style convention as
-- created_by above -- no FK, no new identity system.
--
-- ON DELETE RESTRICT on both foreign keys, deliberately, not the default
-- left implicit: 2D1 exposes no deleteCandidate/deleteEvidence operation
-- at all (candidates and evidence are both governance/history-bearing
-- records -- see this table's own header and crc_knowledge_demand_occurrences'
-- own append-only philosophy), so RESTRICT exists purely as a defensive
-- backstop -- it makes it IMPOSSIBLE to delete a candidate or an evidence
-- row out from under an existing association via direct SQL, protecting
-- governance-link history even against an operator mistake, never merely
-- relying on application discipline alone.

CREATE TABLE IF NOT EXISTS crc_knowledge_demand_governance_candidate_evidence (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id      UUID NOT NULL REFERENCES crc_knowledge_demand_governance_candidates(id) ON DELETE RESTRICT,
  evidence_row_id   UUID NOT NULL REFERENCES crc_knowledge_demand_occurrences(id) ON DELETE RESTRICT,
  linked_by         UUID NOT NULL,
  linked_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  unlinked_at       TIMESTAMPTZ
);

ALTER TABLE crc_knowledge_demand_governance_candidate_evidence
  ADD CONSTRAINT crc_knowledge_demand_governance_candidate_evidence_unique
  UNIQUE (candidate_id, evidence_row_id);

CREATE INDEX IF NOT EXISTS crc_knowledge_demand_governance_candidate_evidence_candidate_idx
  ON crc_knowledge_demand_governance_candidate_evidence (candidate_id);

CREATE INDEX IF NOT EXISTS crc_knowledge_demand_governance_candidate_evidence_evidence_idx
  ON crc_knowledge_demand_governance_candidate_evidence (evidence_row_id);

ALTER TABLE crc_knowledge_demand_governance_candidate_evidence ENABLE ROW LEVEL SECURITY;
-- Same zero-policy, service_role-only posture as every other table in
-- this migration and this project's crc_* family.
GRANT ALL ON public.crc_knowledge_demand_governance_candidate_evidence TO service_role;

-- =============================================
-- DOWN (rollback)
-- =============================================
-- DROP INDEX IF EXISTS crc_knowledge_demand_governance_candidate_evidence_evidence_idx;
-- DROP INDEX IF EXISTS crc_knowledge_demand_governance_candidate_evidence_candidate_idx;
-- ALTER TABLE crc_knowledge_demand_governance_candidate_evidence DROP CONSTRAINT IF EXISTS crc_knowledge_demand_governance_candidate_evidence_unique;
-- DROP TABLE IF EXISTS crc_knowledge_demand_governance_candidate_evidence;
-- DROP TABLE IF EXISTS crc_knowledge_demand_governance_candidates;
