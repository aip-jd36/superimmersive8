# ADR-003: Manual PDF Uploads Are Not Proven to Match Current Workbook State

**Status:** Known limitation, accepted for v1 — tracked, not blocking release
**Date:** 2026-07-17
**Context:** Report-binding lifecycle series (commits `b2748bb`, `1aec13a`, `c6b457c`), surfaced while writing `08_Platform/implementation/REPORT_BINDING_STAGING_CHECKLIST.md` §§ 4b and 8

---

## Problem

The report-binding lifecycle series closes the ID-mismatch bug documented in `06_Operations/assessments/ASSESS-005-2026-07-12/README.md` (a real assessment delivered under two different Assessment IDs from two uncoordinated numbering systems). In doing so it introduced strong guarantees around *artifact identity* — but not around *artifact correctness*, and the gap between those two was not obvious until the staging checklist was written and specifically probed for it.

---

## Current State

The system now guarantees that:

- the PDF is bound to the correct canonical assessment (`submissions.report_pdf_assessment_id = assessments.id`, validated by `/sign`);
- the uploaded file's SHA-256 matches the hash recorded before signing (`assessments.pdf_hash_sha256`, re-verified by `signAssessment()`);
- workbook changes while the assessment is `REPORT_GENERATED` invalidate the existing report and return the assessment to `DRAFT` (`invalidateGeneratedReport()`, wired into the workbook autosave route).

However, after invalidation, an administrator can manually re-upload an older PDF. `record-report` (`app/api/admin/submissions/[id]/record-report/route.ts`, backed by `recordReportGenerated()` in `lib/assessments/service.ts`) will hash and bind those bytes as the current report, allowing signing to proceed even if the PDF no longer reflects the current workbook outcome or findings.

The current controls therefore prove **artifact identity** (this file belongs to this assessment) and **post-upload integrity** (the file hasn't changed since it was bound), but they do not prove **content provenance** (that a manually uploaded PDF was actually generated from the current workbook state).

---

## Risk

This can produce a substantively stale report whose:

- assessment number is correct;
- artifact binding is correct;
- hash validation passes;

but whose outcome, findings, methodology content, title, or other report fields differ from the authoritative Registry or current workbook.

This is primarily an **operator-error risk**, not an external tampering risk — it requires an admin to deliberately re-upload a stale file rather than regenerate. Nothing in the described paths is exploitable by an outside party; the Public Assessment Record remains gated on `processing_status = 'DELIVERED'` regardless (see `isPubliclyVisibleProcessingStatus`, already live).

---

## Current Operational Mitigation

Until this is technically enforced:

- any workbook change after report generation requires the reviewer to regenerate the report through the Typst pipeline;
- reviewers must not restore or re-upload an older PDF after invalidation;
- manual PDF editing should be limited to formatting-only corrections;
- the reviewer remains responsible for confirming that the final PDF matches the current workbook and Registry before signing.

---

## Recommended Future Architecture

Preferred end state: a fully system-managed report artifact flow.

1. Generate the report from the current workbook and canonical assessment.
2. Compile and store the PDF server-side.
3. Record the exact report inputs, or a deterministic source fingerprint.
4. Allow reviewer preview and approval of that exact stored artifact.
5. Sign only the approved system-generated artifact.
6. Either remove arbitrary manual PDF uploads, or treat them as explicit, audited overrides.

### Possible implementation approaches to evaluate

| Approach | What it proves | Notes |
|----------|-----------------|-------|
| Deterministic hash of normalized report-generating inputs (assessment number, outcome, methodology version, relevant workbook sections, asset metadata), re-validated at sign time | The bound PDF's inputs match the current workbook | Discussed during the original three-piece design of this series as the "more elaborate" alternative to the simpler invalidate-on-any-save approach actually shipped |
| Immutable report artifact versions tied to assessment + workbook revision | Full history of what was generated when, from what | Natural extension of the AssessmentArtifact concept already described in ADR-001's "Future Architecture" section for signed media — the same separation applies to report PDFs |
| `SYSTEM_GENERATED` / `MANUAL_OVERRIDE` artifact provenance enum | Whether a bound file came from the pipeline or a human hand-edit | Needed regardless of which other approach is chosen, since manual correction is a legitimate workflow, not just a risk to eliminate |
| Uploader, timestamp, reason, replaced-artifact reference, and explicit approval captured for manual overrides | Who did it, when, why, and that it was reviewed | Matches the audit-trail bar already set for other assessment lifecycle events (`failure_diagnostic`, `status_reason`) |
| Substantive-content confirmation step before accepting an override (e.g., an explicit checkbox/attestation, not just a file picker) | The uploader affirmatively confirmed content correctness, not just clicked through | Cheapest of the options to ship; doesn't require new storage/versioning infrastructure |
| Replace `submissions.report_pdf_url` with an assessment report artifact model | Report artifacts become first-class, versioned entities instead of a single mutable field on `submissions` | Same direction as ADR-001's "Assessment / AssessmentArtifact / ProvenanceRecord" separation — could plausibly be unified with that future migration rather than done twice |

---

## Release Decision

This limitation does **not** block the current report-binding lifecycle release. The new implementation materially reduces accidental mismatches (the original ASSESS-001/ASSESS-005 bug class is closed) and is no weaker than the previous manual-upload workflow, which had no identity or integrity guarantees at all.

It must remain a visible, tracked limitation, and should be resolved before SI8 claims that a delivered PDF is technically proven to derive from the current workbook state — that specific claim is not yet true, even though the adjacent claims (correct ID, correct binding, unmodified since binding) now are.

---

## Related files

- `08_Platform/implementation/REPORT_BINDING_STAGING_CHECKLIST.md` — §§ 4b and 8, where this gap was identified and its exact reproduction steps are documented
- `08_Platform/app/app/api/admin/submissions/[id]/record-report/route.ts` — binds and hashes whatever file it's given; no content-freshness check
- `08_Platform/app/lib/assessments/service.ts` — `recordReportGenerated()`
- `08_Platform/app/app/admin/submissions/[id]/ReportPDFUpload.tsx` — the manual upload / "Replace PDF" UI
- `06_Operations/assessments/ASSESS-005-2026-07-12/README.md` — the original bug this series (and its residual gap) traces back to
- `08_Platform/app/lib/assessments/ADR-001-provenance-provider-persistence.md` — prior art for the AssessmentArtifact separation this ADR's recommended architecture would extend

---

*ADR-003 · SI8 Assessment Service · PMF Strategy Inc. d/b/a SuperImmersive 8 · July 17, 2026*
