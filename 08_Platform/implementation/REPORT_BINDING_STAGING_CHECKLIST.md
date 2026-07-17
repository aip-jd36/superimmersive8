# Staging Validation Checklist — Report Binding & Assessment Lifecycle

**Status:** Required before pushing/deploying the 3-commit series (`b2748bb`, `1aec13a`, `c6b457c` on `main`, not yet pushed).
**Why this exists:** none of the code in these three commits has been exercised against a live or staging Supabase instance — the implementation environment had no database credentials. Everything below was verified only via `tsc --noEmit` and `npx jest`. This checklist is the gate between "type-checks" and "actually works."

**Prerequisite:** run against staging (or a disposable local Supabase project), never production, until every item below passes. If staging shares a database with production, use a disposable test submission created specifically for this — do not run through a real customer's record.

**Reference:** `06_Operations/assessments/ASSESS-005-2026-07-12/README.md` documents the original bug this series fixes (ASSESS-001-2026-07-10 vs ASSESS-005-2026-07-12 — the same assessment under two IDs from two different, uncoordinated numbering systems).

---

## Setup

1. Create (or pick) a test submission with `tier = 'si8_certified'` and no existing `assessments` row.
2. Complete Sections 1–5 of the Reviewer Workbook (`/admin/submissions/[id]/review`) so Section 6 can be reached. Section 6 outcome is required before any assessment can be created — this is a hard schema constraint (`assessments.outcome NOT NULL`), not just a UI gate.
3. Have a source video already uploaded (`SourceVideoUpload`) so `/sign`'s prerequisite check doesn't block on that separately from what you're testing.

---

## 1. Repeated generation (idempotency)

**Goal:** clicking Generate Report twice doesn't create two assessments or bump the sequence twice.

- [ ] Fill in Section 6 with an outcome, save.
- [ ] Click "Generate Client Report (PDF)" in § 7. Note the assessment number shown (header badge + § 6 display + the PDF's cover page — all three should now match).
- [ ] Query `assessments` for this `submission_id` — exactly one row, `processing_status` (before upload) still `DRAFT` at this point since only `ensure-assessment` ran, not `record-report`.
- [ ] Click "Generate Client Report (PDF)" again (or "Download source (.typ)").
- [ ] Confirm: still exactly one row in `assessments` for this submission. `assessment_number` unchanged. No new row, no incremented sequence value consumed beyond the first.

---

## 2. Outcome drift before report generation

**Goal:** changing the outcome before ever generating a report is picked up correctly (this is the common case — no report exists yet, so there's nothing to invalidate, just a plain outcome sync).

- [ ] Set Section 6 outcome to `EVIDENCE_SUPPORTS`. Do **not** click Generate Report yet.
- [ ] Change Section 6 outcome to `MATERIAL_RISKS_IDENTIFIED`. Save (autosave should fire).
- [ ] Now click Generate Report for the first time.
- [ ] Query `assessments` — the row's `outcome` should be `MATERIAL_RISKS_IDENTIFIED` (the value at the time Generate Report was actually clicked), not `EVIDENCE_SUPPORTS`.
- [ ] Open the generated PDF — Section 1 / cover page outcome text matches `MATERIAL_RISKS_IDENTIFIED`'s label, not the earlier value.

---

## 3. Outcome drift *after* report generation (stale-report invalidation)

**Goal:** the report becomes correctly un-signable the moment the outcome (or any workbook data) changes after generation — this is the core "stale-report" guarantee.

- [ ] With an assessment already `REPORT_GENERATED` or later from a prior step, go back to § 6 and change the outcome (or any workbook field — the invalidation fires on any save while `REPORT_GENERATED`, not just outcome changes; see commit `1aec13a`'s note on this deliberately being the simpler of two invalidation strategies).
- [ ] Save (autosave fires `PATCH /api/admin/submissions/[id]/workbook`).
- [ ] Query `assessments` — `processing_status` should now read `DRAFT` again (reverted from `REPORT_GENERATED`).
- [ ] Query `submissions` — `report_pdf_url` and `report_pdf_assessment_id` should both be `NULL` (cleared).
- [ ] In the admin UI, confirm `ReportPDFUpload` no longer shows "Report uploaded" (should show the upload prompt again, since `initialReportUrl` is now null after a page refresh — note: without a refresh, the client-side `hasReport` state may still show stale "uploaded" until `router.refresh()` or reload; check whether this is confusing in practice and flag it if so, it's a real UX gap not addressed by this series).
- [ ] Attempt to call `/sign` directly (or check that the Sign & Deliver panel is disabled/blocked) — should reject with "Assessment is not ready to sign (status: DRAFT)."
- [ ] Click Generate Report again — should succeed, producing a new PDF stamped with the *same* `assessment_number` (not a new one — see check #1) but reflecting the updated outcome.

---

## 4. Wrong artifact binding

**Goal:** a PDF that isn't bound to the assessment being signed is rejected, even if `report_pdf_url` happens to be non-null.

- [ ] Generate a report normally, upload it (through `ReportPDFUpload`, which calls `record-report` and sets `report_pdf_assessment_id`).
- [ ] Manually corrupt the binding to simulate a bug or bypass: `UPDATE submissions SET report_pdf_assessment_id = '<some other assessment's UUID, or any random UUID>' WHERE id = '<this submission>';` (staging only — this is deliberately breaking state to test the guard).
- [ ] Attempt to sign. Expect: `409`, error message `"Uploaded report PDF is not bound to this assessment..."`.
- [ ] Restore the correct `report_pdf_assessment_id` (re-run the upload, or set it back manually) and confirm signing proceeds normally afterward.
- [ ] Separately: with the binding correct but the *file itself* swapped (upload via Supabase Storage dashboard directly, bypassing `record-report`, replacing the bytes at the same storage path without updating `pdf_hash_sha256`) — attempt to sign. Expect `signAssessment()`'s hash check to catch it: assessment transitions to `FAILED` with diagnostic `"Report PDF hash mismatch..."`. This is the content-level check distinct from the ID-based check above — both need to be tested since they catch different failure modes.

---

## 5. Missing assessment

**Goal:** `/sign` and `record-report` both fail clearly, not silently or with a generic 500, when no assessment exists yet.

- [ ] Pick a submission that has never had Generate Report run (no `assessments` row).
- [ ] Call `POST /api/admin/submissions/[id]/record-report` directly with any `path` — expect `409`, `"No assessment exists yet for this submission. Run 'Generate Client Report (PDF)'..."`.
- [ ] Call `POST /api/admin/submissions/[id]/sign` — expect `400`, `"No assessment exists for this submission. Run 'Generate Client Report (PDF)'..."` (this may be masked by the earlier `missing.push('report PDF')` prerequisite check firing first, since there's no `report_pdf_url` either at this point — confirm which error actually surfaces and that it's still a clear, actionable message either way).

---

## 6. Retry after failure

**Goal:** a `FAILED` assessment can be retried from `/sign` without re-deriving state incorrectly, and without needing to regenerate the report.

- [ ] Force a `FAILED` state: easiest is to trigger the hash-mismatch case from #4 (content-swap), which calls `markFailed` directly. Alternatively, if a `NUMBERS_API_KEY` is configured, a transient Numbers API error during a real sign attempt will also produce `FAILED`.
- [ ] Confirm `assessments.failure_diagnostic` is populated and `processing_status = 'FAILED'`.
- [ ] Fix whatever caused the failure by re-uploading the corrected PDF through `ReportPDFUpload` (calls `record-report` → `recordReportGenerated`). Confirm the assessment **stays** `FAILED` (does not attempt an invalid `FAILED → REPORT_GENERATED` transition) but `assessments.pdf_hash_sha256` and `submissions.report_pdf_url` / `report_pdf_assessment_id` are updated to reflect the corrected file.
- [ ] Retry `/sign`. Confirm: transitions `FAILED → SIGNING` directly (per `signAssessment()`'s retry branch), `failure_diagnostic` is cleared only on successful `SIGNED` transition, not before.
- [ ] Confirm no duplicate Numbers Protocol asset is registered if `numbers_asset_id` was already set before the failure (partial-success recovery path — pre-existing behavior, not changed by this series, but worth re-confirming it still works with the new entry-state logic).

---

## 7. Manual override (upload a hand-corrected PDF)

**Goal:** confirm the *currently shipped* behavior for manual corrections, and that it's at least safe even though it's not fully audited (explicitly out of scope for this series — see commit `c6b457c`'s notes).

- [ ] Generate a report normally, download it, make a manual edit (e.g., fix a typo in a PDF editor), re-upload via "Replace PDF" in `ReportPDFUpload` **while still `REPORT_GENERATED`, before ever attempting to sign**. This is the routine case, not the failure-recovery case in #6 — confirm it's handled: `recordReportGenerated` always re-syncs `pdf_hash_sha256` to the newly uploaded file's hash regardless of starting state, specifically so a plain re-upload doesn't get incorrectly flagged as tampered content the next time `/sign` runs its hash check.
- [ ] Confirm the re-upload correctly calls `record-report` again, recomputes the hash from the *new* file, and updates `assessments.pdf_hash_sha256` to match — i.e., the hand-edited file becomes the new "bound" artifact, and signing proceeds against it without a hash mismatch.
- [ ] Confirm there is currently **no** record of *who* made the manual edit, *when*, or *that* it was manually edited rather than system-generated — this is a known, deliberate gap (no `MANUAL_OVERRIDE` provenance tracking was built in this series). Flag whether this gap is acceptable to ship as-is or needs to block the push.

---

## 8. Public visibility at each processing status

**Goal:** confirm the Commit 1 gate (`isPubliclyVisibleProcessingStatus`, already pushed and live) actually behaves correctly end-to-end against a real row, not just in the unit-tested pure function.

For a single test assessment, check `GET /assessment/{assessment_number}` (or the underlying `findAssessmentForVerification` call) at each stage, confirming it 404s/returns null for all but `DELIVERED`:

- [ ] `DRAFT` (right after Generate Report, before upload) — not publicly visible.
- [ ] `REPORT_GENERATED` (after upload/binding) — not publicly visible.
- [ ] `SIGNING` (mid-sign — may need to pause with a breakpoint or check quickly if signing is fast) — not publicly visible.
- [ ] `SIGNED` (signing succeeded, not yet marked delivered) — **not** publicly visible. This is the one most likely to surprise: signing success does not equal public visibility. Confirm this is actually the desired behavior in practice, not just in the spec — if the team expects `SIGNED` assessments to be immediately visible, this needs a product decision, not just a code check.
- [ ] `DELIVERED` — publicly visible, all expected fields present (title, outcome, methodology, reviewer org, numbers asset ID if applicable).
- [ ] `FAILED` (from any prior state) — not publicly visible, regardless of what state it failed from.

---

## After this checklist passes

- [ ] Push all three commits (`b2748bb`, `1aec13a`, `c6b457c`) to `main` in order — do not squash, the commit boundaries document the reasoning at each layer.
- [ ] Watch the Vercel deployment for the Creator Portal / Assessment Service project (auto-deploys on push, confirmed in this same investigation — every push to `main` triggers a build regardless of which paths changed).
- [ ] Re-run item 8 (public visibility) once against the *live* production verification page for a real `DELIVERED` assessment, to confirm the deployed behavior matches staging.
- [ ] File a follow-up decision on item 7 (manual override audit trail) and the `FAILED` + `recordReportGenerated` interaction flagged in item 6 — both are known gaps, not blocking, but should not be forgotten.
