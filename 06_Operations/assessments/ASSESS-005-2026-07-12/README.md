# ASSESS-005-2026-07-12 — Cloud World: Pan from Baby to Auntie Guard

**Assessment ID:** ASSESS-005-2026-07-12
**Assessment date:** July 12, 2026
**Status:** Complete — first live assessment issued by the Assessment Service (`assessments` table, atomic sequence)
**Submitter:** JDC_Media (self-test — JD's own submission, testing the CertForm → Reviewer Workbook → Sign & Deliver pipeline end to end)
**Submission ID:** SUB-A6A41B32
**Outcome:** Evidence Supports Intended Commercial Use
**Commercial Confidence:** High
**Public Assessment Record:** https://app.superimmersive8.com/assessment/ASSESS-005-2026-07-12

---

## What This Is

Cloud World is SI8's first assessment to run through the real, live CertForm → Reviewer Workbook → Assessment Service pipeline — submitted, reviewed, and signed by JD using his own content, not a fictional scenario (contrast with `assessment-zero/`, which is a fully simulated system-validation dossier). Because JD is both submitter and reviewer, several domain findings in this assessment are placeholder-quality test input (e.g. "Depends on region.", "These are consistent") rather than substantive commercial judgment. That's expected — this run was exercising the pipeline and PDF template (fonts, layout), not producing a real client deliverable.

The underlying submission, workbook data (`workbook_data` JSONB), evidence files, and the canonical `assessments` table row live in Supabase (production). This folder does not duplicate that data — it documents the assessment and points back to the source of truth.

---

## Assessment ID History (reconciled July 17, 2026)

This assessment was previously identified by two different IDs, produced by two different systems on either side of the Assessment Service launch:

- **`ASSESS-001-2026-07-10`** — the legacy `submissions.assess_id` field (added by the `20260710000000_add_workbook_data.sql` migration, "auto-generated when reviewer first opens workbook"). This is what was stamped on the PDFs generated locally on July 11, 2026 while JD iterated on the Typst report template's fonts and layout via the CLI/server-side pipeline (`_6pm` and `_10pm` versions found in `SI8 To Send/SI8 Cloud World -Golden Samples/`). This field predates the Assessment Registry and was explicitly deprecated in the admin UI on July 12 (commit `e7a5dd9`: *"Legacy submissions.assess_id is not rendered — canonical assessment number comes from the assessments table"*).
- **`ASSESS-005-2026-07-12`** — the canonical, DB-issued assessment number from the `assessments` table (atomic Postgres sequence, `20260712000001_atomic_assessment_number.sql`). This is the number the Public Assessment Record verification page actually resolves, and the one referenced in the July 13 email thread with Sofia Yan (Numbers Protocol).

**Only `ASSESS-005-2026-07-12` is canonical.** The `ASSESS-001-2026-07-10` PDFs are orphaned pre-launch artifacts — an ID the live verification system does not recognize.

---

## Report Regeneration (July 17, 2026)

The PDF in `SI8 To Send/SI8 Cloud World -Golden Samples/ASSESS-001-2026-07-10_10pm.pdf` was regenerated under the correct assessment ID:

- **Source:** `tools/report-pipeline/ASSESS-005-2026-07-12.typ`
- **Output:** `tools/report-pipeline/ASSESS-005-2026-07-12.pdf` (not committed to git — generated artifact, per pipeline convention; `.typ` source is the version-controlled artifact)
- Domain findings, evidence, and outcome preserved verbatim from the original — this is a faithful re-stamp of a legitimate self-test record, not a rewrite.
- Branding updated from "Campaign Assurance" to "Commercial Assurance" throughout, per the Jul 12, 2026 terminology freeze in `CLAUDE.md`. This also required correcting two hardcoded strings in the shared master template (`tools/report-pipeline/si8-report-template.typ` and its mirror `08_Platform/app/public/si8-report-template.typ`), which had not been updated since the terminology freeze — this fixes branding for all future reports generated from the template, not just this one.
- Section 4 (Standard Assurance Language) uses the current canonical verbatim policy text (matching `assurance-box()` usage in `ASSESS-ZERO-2026-07-06.typ`) rather than the shorter ad hoc wording embedded in the original PDF — Section 4 is controlled policy language per the pipeline README ("never edit the language"), so the current canonical version supersedes the pre-launch draft.
- Dates updated from July 10/11 to July 12, 2026, to match the canonical assessment number and the date the record actually became authoritative in the Registry.

---

## Known Follow-Up (not done as part of this regeneration)

- The master template (`si8-report-template.typ`) and `SI8-Report-Production-Standards.md` still say "Campaign Assurance" in some other places (e.g. the Production Standards doc body text, `ASSESS-ZERO-2026-07-06.typ`'s own content). Only the two hardcoded cover-page strings were fixed here, scoped to what affects future report generation. A full terminology sweep of `06_Operations/reviewer-workbook/SI8-Report-Production-Standards.md` was not performed.
- No `00-customer-profile.md` / `01-certform-submission.md` / etc. dossier files were created for this folder, unlike `assessment-zero/`. Cloud World's real submission and workbook data already exist in Supabase (`submissions` and `assessments` tables) — recreating them as local markdown would duplicate, not document, the source of truth.
