# Staging Validation Checklist — Report Binding & Assessment Lifecycle

**Status:** Required before pushing/deploying the 3-commit series (`b2748bb`, `1aec13a`, `c6b457c` on `main`, not yet pushed).
**Why this exists:** none of the code in these three commits has been exercised against a live or staging Supabase instance — the implementation environment had no database credentials. Everything below was verified only via `tsc --noEmit` and `npx jest`. This checklist is the gate between "type-checks" and "actually works."

**Prerequisite:** run against staging (or a disposable local Supabase project), never production, until every item below passes. If staging shares a database with production, use a disposable test submission created specifically for this — do not run through a real customer's record.

**Reference:** `06_Operations/assessments/ASSESS-005-2026-07-12/README.md` documents the original bug this series fixes (ASSESS-001-2026-07-10 vs ASSESS-005-2026-07-12 — the same assessment under two IDs from two different, uncoordinated numbering systems).

---

## Core Invariants

Everything below exists to prove these six statements hold under real conditions, not just in unit tests of isolated functions:

1. **One submission produces one canonical assessment.** Enforced at the schema level: `assessments.submission_id UUID NOT NULL UNIQUE`.
2. **One assessment number is allocated exactly once per assessment**, via an atomic Postgres sequence (`generate_assessment_number()`), and is immutable after creation — no code path in this series ever updates `assessment_number` on an existing row.
3. **Every official artifact (PDF, C2PA manifest, Public Assessment Record) derives from the canonical assessment** — not from the legacy `submissions.assess_id` field, which no longer participates in generation as of this series.
4. **A report cannot remain signable once the workbook data it was generated from changes.** (Phrased deliberately as "cannot remain signable," not "cannot become stale" — see § 4 below, which found a real gap in how completely this is enforced.)
5. **Only `DELIVERED` assessments are publicly discoverable.** Every other state — including `SIGNED` — must be indistinguishable from a nonexistent assessment number to an outside observer.
6. **The Registry (`assessments` table) is authoritative.** If the PDF, C2PA manifest, and Public Assessment Record ever disagree, the Registry is correct and the others are bugs — this is stated explicitly in the `assessments` table migration and is the whole reason this series exists.

## State Machine Reference

```
                    Generate Report
                          │
                          ▼
                       DRAFT ◄────────────┐
                          │               │ workbook data
                          │ upload PDF    │ changes while
                          ▼               │ REPORT_GENERATED
              REPORT_GENERATED ───────────┘
                          │
                          │ /sign
                          ▼
                       SIGNING
                          │
                          ▼
                       SIGNED
                          │
                          │ mark delivered
                          ▼
                     DELIVERED

Any of DRAFT / REPORT_GENERATED / SIGNING / SIGNED / DELIVERED
                          │
                          ▼
                       FAILED ──── retry ────► SIGNING
```

`assessment_number` is allocated once, at the `DRAFT` row's creation, and never changes across any of the above transitions — including retries through `FAILED`.

---

## Setup

1. Create (or pick) a test submission with `tier = 'si8_certified'` and no existing `assessments` row.
2. Complete Sections 1–5 of the Reviewer Workbook (`/admin/submissions/[id]/review`) so Section 6 can be reached. Section 6 outcome is required before any assessment can be created — this is a hard schema constraint (`assessments.outcome NOT NULL`), not just a UI gate.
3. Have a source video already uploaded (`SourceVideoUpload`) so `/sign`'s prerequisite check doesn't block on that separately from what you're testing.

---

## 1. Repeated generation (idempotency)

**Goal:** clicking Generate Report twice — sequentially, or after a browser refresh — doesn't create two assessments or bump the sequence twice.

- [ ] Fill in Section 6 with an outcome, save.
- [ ] Click "Generate Client Report (PDF)" in § 7. Note the assessment number shown (header badge + § 6 display + the PDF's cover page — all three should now match).
- [ ] Query `assessments` for this `submission_id` — exactly one row, `processing_status` (before upload) still `DRAFT` at this point since only `ensure-assessment` ran, not `record-report`.
- [ ] Click "Generate Client Report (PDF)" again (or "Download source (.typ)").
- [ ] Confirm: still exactly one row in `assessments` for this submission. `assessment_number` unchanged. No new row, no incremented sequence value consumed beyond the first.
- [ ] **Refresh the browser tab entirely** (not just re-click), navigate back into § 7, and click Generate Report again. Confirm the header badge and § 6 display both show the *same* assessment number they showed before the refresh (proves the number is being read back from the Registry via `findAssessmentBySubmissionId` on page load, not regenerated) — and confirm still only one row exists in `assessments`.

---

## 2. Concurrent generation (race condition)

**Goal:** determine what actually happens when two Generate Report requests race — this is a genuine gap, not a confirmed protection. `createAssessment()` (`repository.ts`) performs a plain `INSERT` with no `ON CONFLICT` handling. `createAssessmentFromWorkbook()`'s idempotency check (`findAssessmentBySubmissionId` before inserting) is a check-then-act pattern with a real race window: two concurrent calls can both see "no existing assessment" before either INSERT commits.

**Predicted outcome, based on reading the code (not yet confirmed against a real database):** the `assessments.submission_id UNIQUE` constraint will prevent actual data corruption (no duplicate assessment rows for one submission), but the *losing* request will not gracefully recover — it will receive a raw Postgres unique-violation error, surfaced by `ensure-assessment`'s catch block as a generic `500` with message `"Failed to create assessment: ..."`, not a friendly "someone else already created this" response.

- [ ] Open the same submission's workbook in two browser tabs, both past Section 6.
- [ ] Trigger Generate Report in both tabs as close to simultaneously as practical (two people, or two rapid manual clicks, or script both `fetch` calls to `ensure-assessment` back-to-back).
- [ ] Confirm exactly one row exists in `assessments` for this submission afterward (the UNIQUE constraint should guarantee this regardless of the race outcome).
- [ ] Record what actually happens to the losing request: does it get a `500`, or does something already return the existing assessment gracefully? If it's a `500`, note the exact error text shown to the user in the UI — an ungraceful `500` on a double-click is a poor experience but not data-corrupting; decide whether that's acceptable to ship as-is or worth a follow-up fix (retry-on-conflict inside `createAssessmentFromWorkbook`) before or after this push.

---

## 3. Outcome drift before report generation

**Goal:** changing the outcome before ever generating a report is picked up correctly (this is the common case — no report exists yet, so there's nothing to invalidate, just a plain outcome sync).

- [ ] Set Section 6 outcome to `EVIDENCE_SUPPORTS`. Do **not** click Generate Report yet.
- [ ] Change Section 6 outcome to `MATERIAL_RISKS_IDENTIFIED`. Save (autosave should fire).
- [ ] Now click Generate Report for the first time.
- [ ] Query `assessments` — the row's `outcome` should be `MATERIAL_RISKS_IDENTIFIED` (the value at the time Generate Report was actually clicked), not `EVIDENCE_SUPPORTS`.
- [ ] Open the generated PDF — Section 1 / cover page outcome text matches `MATERIAL_RISKS_IDENTIFIED`'s label, not the earlier value.

---

## 4. Outcome drift *after* report generation (stale-report invalidation)

**Goal:** confirm exactly how far the "stale-report" guarantee actually extends. It correctly blocks signing when nothing further happens after invalidation — but it does **not** verify that a re-uploaded PDF's *content* actually matches current workbook data. Test both cases; do not assume the stronger claim without checking it.

**4a. No re-upload after invalidation (protected):**

- [ ] With an assessment already `REPORT_GENERATED` or later from a prior step, go back to § 6 and change the outcome (or any workbook field — the invalidation fires on any save while `REPORT_GENERATED`, not just outcome changes; see commit `1aec13a`'s note on this deliberately being the simpler of two invalidation strategies).
- [ ] Save (autosave fires `PATCH /api/admin/submissions/[id]/workbook`).
- [ ] Query `assessments` — `processing_status` should now read `DRAFT` again (reverted from `REPORT_GENERATED`).
- [ ] Query `submissions` — `report_pdf_url` and `report_pdf_assessment_id` should both be `NULL` (cleared).
- [ ] In the admin UI, confirm `ReportPDFUpload` no longer shows "Report uploaded" (should show the upload prompt again, since `initialReportUrl` is now null after a page refresh — note: without a refresh, the client-side `hasReport` state may still show stale "uploaded" until `router.refresh()` or reload; check whether this is confusing in practice and flag it if so, it's a real UX gap not addressed by this series).
- [ ] Attempt to call `/sign` directly (or check that the Sign & Deliver panel is disabled/blocked) — should reject with "Assessment is not ready to sign (status: DRAFT)."

**4b. Re-uploading the OLD (stale) PDF after invalidation (NOT protected — confirm this gap, don't assume it's blocked):**

- [ ] Immediately after 4a's invalidation, instead of clicking Generate Report again, re-upload the *original* PDF file you downloaded before the outcome change (via "Replace PDF" / "Upload PDF" in `ReportPDFUpload`, pointing at the old, now-stale file).
- [ ] Confirm this **succeeds**: `record-report` has no way to know the file's content doesn't match current workbook data — it only hashes whatever bytes it's given and re-binds. Expect `assessments.processing_status` to move back to `REPORT_GENERATED`, `pdf_hash_sha256` updated to the old file's hash, and the binding restored.
- [ ] Confirm signing now **succeeds** against this stale-content file — because nothing checks content freshness, only self-consistency between the bound file and its recorded hash. This is a real, previously-undocumented gap: "stale-report invalidation" prevents *accidental* staleness (nothing happens = correctly blocked, per 4a) but does not prevent someone from manually defeating it by re-uploading an old file. Flag this for a product/process decision — the honest mitigation today is "the admin must actually click Generate Report, not just re-upload a file," which is a workflow discipline requirement, not a technical guarantee.
- [ ] Regenerate properly (click Generate Report, producing a fresh compile) and confirm the *same* `assessment_number` is reused (see check #1) with correctly updated content — this is the correct recovery path 4a and 4b are contrasted against.

---

## 5. Wrong artifact binding

**Goal:** a PDF that isn't bound to the assessment being signed is rejected, even if `report_pdf_url` happens to be non-null.

- [ ] Generate a report normally, upload it (through `ReportPDFUpload`, which calls `record-report` and sets `report_pdf_assessment_id`).
- [ ] Manually corrupt the binding to simulate a bug or bypass: `UPDATE submissions SET report_pdf_assessment_id = '<some other assessment's UUID, or any random UUID>' WHERE id = '<this submission>';` (staging only — this is deliberately breaking state to test the guard).
- [ ] Attempt to sign. Expect: `409`, error message `"Uploaded report PDF is not bound to this assessment..."`.
- [ ] Restore the correct `report_pdf_assessment_id` (re-run the upload, or set it back manually) and confirm signing proceeds normally afterward.
- [ ] Separately: with the binding correct but the *file itself* swapped (upload via Supabase Storage dashboard directly, bypassing `record-report`, replacing the bytes at the same storage path without updating `pdf_hash_sha256`) — attempt to sign. Expect `signAssessment()`'s hash check to catch it: assessment transitions to `FAILED` with diagnostic `"Report PDF hash mismatch..."`. This is the content-level check distinct from the ID-based check above — both need to be tested since they catch different failure modes.

---

## 6. Missing assessment

**Goal:** `/sign` and `record-report` both fail clearly, not silently or with a generic 500, when no assessment exists yet.

- [ ] Pick a submission that has never had Generate Report run (no `assessments` row).
- [ ] Call `POST /api/admin/submissions/[id]/record-report` directly with any `path` — expect `409`, `"No assessment exists yet for this submission. Run 'Generate Client Report (PDF)'..."`.
- [ ] Call `POST /api/admin/submissions/[id]/sign` — expect `400`, `"No assessment exists for this submission. Run 'Generate Client Report (PDF)'..."` (this may be masked by the earlier `missing.push('report PDF')` prerequisite check firing first, since there's no `report_pdf_url` either at this point — confirm which error actually surfaces and that it's still a clear, actionable message either way).

---

## 7. Retry after failure

**Goal:** a `FAILED` assessment can be retried from `/sign` without re-deriving state incorrectly, and without needing to regenerate the report — and, critically, without ever allocating a second assessment number for the same submission.

- [ ] Force a `FAILED` state: easiest is to trigger the hash-mismatch case from § 5 (content-swap), which calls `markFailed` directly. Alternatively, if a `NUMBERS_API_KEY` is configured, a transient Numbers API error during a real sign attempt will also produce `FAILED`.
- [ ] Confirm `assessments.failure_diagnostic` is populated and `processing_status = 'FAILED'`. **Record the `assessment_number` at this point.**
- [ ] Fix whatever caused the failure by re-uploading the corrected PDF through `ReportPDFUpload` (calls `record-report` → `recordReportGenerated`). Confirm the assessment **stays** `FAILED` (does not attempt an invalid `FAILED → REPORT_GENERATED` transition) but `assessments.pdf_hash_sha256` and `submissions.report_pdf_url` / `report_pdf_assessment_id` are updated to reflect the corrected file.
- [ ] Retry `/sign`. Confirm: transitions `FAILED → SIGNING` directly (per `signAssessment()`'s retry branch), `failure_diagnostic` is cleared only on successful `SIGNED` transition, not before.
- [ ] **Confirm `assessment_number` after a successful retry is byte-for-byte identical to what you recorded before the failure.** No code path in this series updates `assessment_number` on an existing row, but this is cheap to verify directly rather than assume — it's the specific invariant a regression here would violate silently (a new number would still "work" functionally, just reintroduce exactly the kind of mismatch this whole series exists to prevent).
- [ ] Confirm no duplicate Numbers Protocol asset is registered if `numbers_asset_id` was already set before the failure (partial-success recovery path — pre-existing behavior, not changed by this series, but worth re-confirming it still works with the new entry-state logic).

---

## 8. Manual override (upload a hand-corrected PDF)

**Goal:** confirm the *currently shipped* behavior for manual corrections, and that it's at least safe even though it's not fully audited (explicitly out of scope for this series — see commit `c6b457c`'s notes).

- [ ] Generate a report normally, download it, make a manual edit (e.g., fix a typo in a PDF editor), re-upload via "Replace PDF" in `ReportPDFUpload` **while still `REPORT_GENERATED`, before ever attempting to sign**. This is the routine case, not the failure-recovery case in § 7 — confirm it's handled: `recordReportGenerated` always re-syncs `pdf_hash_sha256` to the newly uploaded file's hash regardless of starting state, specifically so a plain re-upload doesn't get incorrectly flagged as tampered content the next time `/sign` runs its hash check.
- [ ] Confirm the re-upload correctly calls `record-report` again, recomputes the hash from the *new* file, and updates `assessments.pdf_hash_sha256` to match — i.e., the hand-edited file becomes the new "bound" artifact, and signing proceeds against it without a hash mismatch.
- [ ] Confirm there is currently **no** record of *who* made the manual edit, *when*, or *that* it was manually edited rather than system-generated — this is a known, deliberate gap (no `MANUAL_OVERRIDE` provenance tracking was built in this series), and it's the same underlying gap § 4b demonstrates from a different angle: nothing distinguishes "system-generated from current workbook data" from "any PDF a human decided to upload." Flag whether this gap is acceptable to ship as-is or needs to block the push.

---

## 9. Public visibility and information leakage

**Goal:** confirm the Commit 1 gate (`isPubliclyVisibleProcessingStatus`, already pushed and live) actually behaves correctly end-to-end against a real row — and, specifically, that a `DRAFT`/`SIGNING`/etc. assessment is not just "hidden" but **indistinguishable** from an assessment number that was never issued at all. A gate that returns a different error, status code, or response shape for "exists but not delivered" vs. "never existed" is itself a leak (it confirms to an outside party that *something* is in progress under that number).

For a single test assessment, check `GET /assessment/{assessment_number}` at each stage below, plus one genuinely nonexistent number (e.g. `ASSESS-999-2099-01-01`), and compare the full HTTP response — status code, body, timing if feasible — across all of them:

- [ ] Nonexistent assessment number — baseline "not found" response. Record its exact shape.
- [ ] `DRAFT` (right after Generate Report, before upload) — response must match the nonexistent-number baseline exactly.
- [ ] `REPORT_GENERATED` (after upload/binding) — must match baseline.
- [ ] `SIGNING` (mid-sign — may need to pause with a breakpoint or check quickly if signing is fast) — must match baseline.
- [ ] `SIGNED` (signing succeeded, not yet marked delivered) — must match baseline. This is the one most likely to surprise: signing success does not equal public visibility. Confirm this is actually the desired behavior in practice, not just in the spec — if the team expects `SIGNED` assessments to be immediately visible, this needs a product decision, not just a code check.
- [ ] `FAILED` (from any prior state) — must match baseline, regardless of what state it failed from.
- [ ] `DELIVERED` — the one case that should differ: publicly visible, all expected fields present (title, outcome, methodology, reviewer org, numbers asset ID if applicable).

---

## 10. End-to-end integrity — closing the loop on the original bug

**Goal:** this is the definitive regression test. Everything else in this checklist validates a mechanism in isolation; this validates that the mechanism actually prevents the specific failure that motivated this entire series — a real assessment (Cloud World) whose delivered PDF showed `ASSESS-001-2026-07-10` while the live Public Assessment Record showed `ASSESS-005-2026-07-12` for the same content.

- [ ] Take one test submission all the way through the real lifecycle: Generate Report → upload → sign → mark delivered (or whatever the actual delivery-completion step is in the admin UI).
- [ ] Gather three artifacts for this one assessment: the delivered PDF, the live Public Assessment Record page (`/assessment/{assessment_number}`), and a direct query of the `assessments` row (the Registry).
- [ ] Compare these fields across all three, side by side:
  - [ ] **Assessment Number** — identical string in all three, character for character.
  - [ ] **Outcome** — identical (accounting for label formatting differences, e.g. `EVIDENCE_SUPPORTS` vs. its human-readable label — the underlying value must match).
  - [ ] **Methodology Version** — identical.
  - [ ] **Title** — identical.
- [ ] If any field differs between the PDF, the Public Assessment Record, and the Registry, **do not push** — that's the exact defect class this series exists to eliminate, and something in the generation-to-delivery chain still has a gap.

---

## After this checklist passes

- [ ] Push all three commits (`b2748bb`, `1aec13a`, `c6b457c`) to `main` in order — do not squash, the commit boundaries document the reasoning at each layer.
- [ ] Watch the Vercel deployment for the Creator Portal / Assessment Service project (auto-deploys on push, confirmed in this same investigation — every push to `main` triggers a build regardless of which paths changed).
- [ ] Re-run § 9 (public visibility) and § 10 (end-to-end integrity) once against the *live* production verification page for a real `DELIVERED` assessment, to confirm the deployed behavior matches staging.
- [ ] File follow-up decisions on the gaps this checklist surfaced, none of which are fixed by this series and none of which should be forgotten:
  - § 2: ungraceful `500` on concurrent Generate Report requests (no retry-on-conflict).
  - § 4b / § 8: no content-freshness or provenance check on re-uploaded PDFs — "stale-report invalidation" is a workflow-discipline requirement, not a hard technical guarantee, once a human is re-uploading files by hand.
