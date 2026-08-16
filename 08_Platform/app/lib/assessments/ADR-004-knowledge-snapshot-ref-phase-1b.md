# ADR-004: `assessments.knowledge_snapshot_ref` (Living Knowledge Phase 1B)

**Status:** Designed, not applied. Migration file written; not run against any environment. Not wired to any application code. Explicitly off the LK Phase 1 critical path per PM's final approval ("If a DB migration becomes necessary: STOP before dependent production deployment and report exactly what must be applied").
**Date:** 2026-08-16
**Context:** LK Phase 1 implementation, Phase G

---

## Problem this eventually solves

SI8's governed knowledge — `06_Operations/institutional-knowledge/notebook/GOVERNED-CLAIMS.md`, `PLATFORM-RIGHTS-MATRIX.md`, and the rest of the Living Notebook — changes over time: claims move from `Candidate` to `Adopted`, get superseded by a new version, or (rarely) get `Deprecated`. `assessments.methodology_version` already answers "which version of the Reviewer Manual governed this assessment's human review process." Nothing today answers the adjacent question for the faster-moving, git-native Living Knowledge layer: **what did SI8 consider settled, as governed knowledge, at the moment a given assessment's report was generated?**

This matters once (and only once) governed knowledge starts materially informing either the human reviewer's own judgment or the CRC pre-screening conversation a customer had before submitting for assessment. Neither is true yet in this codebase: Wave 1's four claims are `Lifecycle: Candidate` / `CRC-Eligible: Pending` (see `GOVERNED-CLAIMS.md`), so no assessment issued today is informed by governed knowledge in any way this column could usefully capture. That is precisely why this is Phase 1B, not Phase 1: there is nothing to reference yet.

## Why design it now anyway

PM's final approval explicitly reclassified this as "off critical path" but still asked for the column to be *designed* in Phase 1, not deferred entirely — the reasoning being that once a real Adopted+CRC-eligible claim exists and assessments start being informed by it, retrofitting a new column onto a live, populated `assessments` table is strictly more disruptive than adding an always-NULL nullable column now and leaving it unused until a real writer exists.

## What this migration does NOT do

- Does not backfill any existing row (all get `NULL` — correct, since no assessment issued before this concept existed has a snapshot to reference).
- Does not wire any writer. No code path in this codebase sets this column. It will remain `NULL` on every row, including newly created ones, until a separate, explicitly scoped piece of work builds a writer.
- Does not decide the snapshot format (see below — left open on purpose).
- Does not change the Verification Page, PDF template, C2PA manifest, or any public-facing output.
- Does not touch RLS. The existing `assessments_public_select` policy (`USING (true)`) already covers `SELECT` on this column same as every other column on the table; whether it *should* ever be exposed publicly is a separate, undecided product question (see Open Questions).

## Format — deliberately left open

Three candidate formats were considered; none is chosen here because no writer exists yet to prove which is right in practice:

| Option | What it captures | Tradeoff |
|---|---|---|
| Git commit SHA of the repo at report-generation time (e.g. `git:a1b2c3d...`) | Exact state of every file under `06_Operations/institutional-knowledge/` at that instant | Cheapest to produce (the deployed app already knows its own build SHA via Vercel's `VERCEL_GIT_COMMIT_SHA`); but a single repo-wide SHA conflates Living Knowledge changes with every other unrelated commit, and doesn't distinguish "the Matrix changed" from "a marketing page changed" |
| A dedicated, versioned "Knowledge Snapshot" table/object with its own ID, populated on a deliberate publish action (mirroring how `GOVERNED-CLAIMS.md` → `topic-claims-fixture.ts` is a manual, deliberate sync today) | A clean, product-scoped version number independent of unrelated repo churn | Requires building the snapshot/versioning mechanism first — real new infrastructure, not a byproduct of this column |
| A structured list of `{claim_id, version}` pairs actually consulted for this specific assessment | The most precise, assessment-specific record — proves exactly which claims were live, not just "the repo state" | Requires the reviewer tool to actually track claim consultation per assessment, which does not exist and is a larger feature than this ADR's scope |

The CHECK constraint (`knowledge_snapshot_ref IS NULL OR length(trim(knowledge_snapshot_ref)) > 0`) only rules out the degenerate empty-string case; it does not encode any of the three formats above, so choosing one later requires no migration change.

## Open questions (for PM, not decided here)

1. Which of the three formats above (or a fourth) should the eventual writer use?
2. Should `knowledge_snapshot_ref` ever appear on the Public Assessment Record, or stay internal-only like `pdf_hash_sha256`? Default assumption, unconfirmed: internal-only, same discipline as `pdf_hash_sha256`, until a specific product reason to expose it is identified.
3. When should the writer actually populate this — at Generate Report time (mirroring when `assessment_number` itself is allocated, per the report-binding lifecycle series in Execution Gaps §3o), or at some other lifecycle point?
4. Does a stale-report-invalidation event (`REPORT_GENERATED` → `DRAFT`, already implemented for workbook changes) need to also invalidate/clear a previously-set `knowledge_snapshot_ref`? Likely yes, for the same reason the PDF itself gets invalidated, but this is a real design decision for whoever builds the writer, not assumed here.

## Related files

- `08_Platform/app/supabase/migrations/20260816010000_add_assessments_knowledge_snapshot_ref.sql` — the migration itself (written, not applied)
- `08_Platform/app/supabase/migrations/20260712000000_create_assessments_table.sql` — the table this extends; `methodology_version` is the closest existing precedent for the question this column answers
- `06_Operations/institutional-knowledge/notebook/GOVERNED-CLAIMS.md` — the governed-knowledge layer this column would eventually reference
- `08_Platform/app/lib/assessments/ADR-001-provenance-provider-persistence.md`, `ADR-002-lifecycle-audit-log.md`, `ADR-003-manual-pdf-upload-provenance.md` — prior ADRs for this table, same format

---

*ADR-004 · SI8 Assessment Service · PMF Strategy Inc. d/b/a SuperImmersive 8 · August 16, 2026*
