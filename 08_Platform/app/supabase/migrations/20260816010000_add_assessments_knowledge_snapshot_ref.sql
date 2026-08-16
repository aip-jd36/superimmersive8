-- Migration: assessments.knowledge_snapshot_ref (Phase 1B, off critical path)
-- Date: 2026-08-16
-- Status: DESIGNED, NOT APPLIED -- per PM's LK Phase 1 final approval, this
-- is a design deliverable only. Do NOT run this against any environment
-- without explicit sign-off. See ADR-004 (lib/assessments/ADR-004-
-- knowledge-snapshot-ref-phase-1b.md) for the full design rationale and the
-- open questions still pending human decision.
--
-- Purely additive: one nullable TEXT column on an existing table, one
-- permissive CHECK constraint, no index (no query pattern exists yet to
-- justify one), no RLS change (existing `assessments_public_select` policy
-- already covers SELECT; whether this column should be included in any
-- public-facing projection is itself one of ADR-004's open questions, and
-- is NOT decided by this migration). No backfill: every existing assessment
-- row gets NULL, which is the correct value for "issued before this concept
-- existed" -- same discipline as `pdf_hash_sha256`, `numbers_asset_id`, and
-- every other nullable field already on this table for exactly that reason.
--
-- What it will eventually record (once a Phase 1B writer is actually built
-- -- not by this migration): a reference to the state of SI8's governed
-- knowledge (Living Notebook + GOVERNED-CLAIMS.md) at the moment a given
-- assessment's report was generated, so a future reviewer or auditor can
-- answer "what did SI8 know, and consider settled, when this assessment
-- was issued" -- the same motivating question `methodology_version`
-- already answers for the Reviewer Manual, extended to the newer,
-- faster-moving Living Knowledge layer. Format left loose and
-- self-describing (see CHECK constraint) rather than constrained to one
-- mechanism, since no writer exists yet to prove which mechanism is right
-- -- see ADR-004 §"Format".

-- =============================================
-- UP
-- =============================================

ALTER TABLE assessments
  ADD COLUMN IF NOT EXISTS knowledge_snapshot_ref TEXT;

COMMENT ON COLUMN assessments.knowledge_snapshot_ref IS
  'Phase 1B (not yet wired to any writer as of 2026-08-16): reference to the '
  'state of SI8''s governed knowledge (Living Notebook + GOVERNED-CLAIMS.md) '
  'at report-generation time. NULL for every assessment issued before this '
  'column existed, and for every assessment issued before a real writer is '
  'built -- NULL always means "no snapshot reference was captured," never '
  '"knowledge was empty." See ADR-004 for format and open questions.';

-- Minimal hygiene only -- deliberately NOT constrained to a specific format
-- (e.g. a git-SHA regex) until a real writer exists and a format decision
-- is actually made. Prevents only the degenerate empty-string case, which
-- would be indistinguishable from "not set" but would defeat the NULL
-- check any future reader would otherwise rely on.
ALTER TABLE assessments
  ADD CONSTRAINT assessments_knowledge_snapshot_ref_not_blank
  CHECK (knowledge_snapshot_ref IS NULL OR length(trim(knowledge_snapshot_ref)) > 0);

-- =============================================
-- DOWN (rollback)
-- =============================================
-- ALTER TABLE assessments DROP CONSTRAINT IF EXISTS assessments_knowledge_snapshot_ref_not_blank;
-- ALTER TABLE assessments DROP COLUMN IF EXISTS knowledge_snapshot_ref;
