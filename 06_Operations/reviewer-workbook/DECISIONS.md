# Reviewer Workbook / Assessment Report — Decisions Log

A record of decisions affecting the reviewer workbook, the Assessment Report
template, and the code that renders reports from workbook state. Governed
document *content* changes are recorded in the documents themselves; this log
records decisions about how the platform implements them.

---

## 2026-09-08 — CA-RLK-2b: report generator aligned to Assessment Report Template v0.2 (bounded projection)

**What triggered this:**
- CA-RLK-2a production smoke (SMOKE 5) surfaced two report defects that were
  **code-vs-governed-document drift**, not design gaps:
  1. Section 1 rendered an eight-item "Scope of Independent Review" checkmark
     grid whose ✓/○ marks were *inferred from control judgment status*
     (`buildScopeBox`). A control judged `Verified` does not establish that a
     document of that category was reviewed — per Reviewer Manual v0.2 a
     `Verified` Likeness/IP control commonly means the reviewer observed the
     content and nothing applicable was present (zero documents). The grid was
     never part of Assessment Report Template v0.1 or v0.2.
  2. Appendix A was titled "Chain of Title" and carried the sentence
     *"Chain of Title documentation for '<title>' as disclosed by the submitter
     and reviewed by SI8"* — obsolete v0.1 framing. Template v0.2 specifies
     **"Appendix A: Supporting Evidence Record"** — a documentation record, not
     a narrative assessment.
  3. Several per-domain and evidence-list fallbacks manufactured review
     activity, most notably `'CertForm submission and attached documentation
     reviewed.'`

**Decision:**
- Added `08_Platform/app/lib/assessments/reportProjection.ts` — a pure module
  that turns signed/authoritative assessment state into the *bounded
  propositions* a report is allowed to make. No generic
  `reviewed / considered_not_applicable / not_provided` ontology; every output
  traces to a reviewer-authored field, an actual submission artifact, or a
  governed neutral value. Fail-closed = omit / governed neutral, never a
  strengthened or invented negative fact.
- `Section7Brief.tsx`: deleted `buildScopeBox` and `getDomainEvidence`
  (manufactured-review fallback). Section 1 now shows only the governed
  methodology domain scope + a pointer to Sections 2 and 3. The itemized
  evidence list is governed content of **Section 2** (Template v0.2's
  "Evidence provided"), so Section 2 was aligned to the v0.2 field order
  (Content assessed / AI tools declared by submitter / Evidence provided /
  Scope limitations) and no longer synthesises evidence items.
- Appendix A rebuilt as "Supporting Evidence Record" from actual submission /
  section_3 / section_7 state, with an explicit
  `Yes / No / N/A / Verified — receipt on file / Partially verified /
  Not provided / Present / Not present / Unknown` vocabulary and the governed
  limitation language (no independent title searches / chain of copyright
  investigations / government registrations) verbatim.
- Executive-summary placeholder made outcome-neutral.

**Not changed:**
- No governed document was edited. `SI8-Assessment-Report-Template-v0.2.md`,
  `SI8-Reviewer-Manual-v0.2.md`, and the workbook schema are untouched — the
  code was wrong, not the specification.
- No deployment, no assessment regeneration, no artifact re-binding. The
  historical reference reports in `tools/report-pipeline/` were hand-maintained
  (commit d045cbb), not machine-generated, and were left unchanged; the new
  projection was visually validated locally against a synthetic fixture only.

**Deviation from the CA-RLK-2b-IMPL brief:**
- The brief said Section 1 renders the `evidence_reviewed` list. Template v0.2
  places the itemized evidence list in Section 2 ("Evidence provided") and has
  no scope subsection in Section 1. Since the milestone mandate is "align code
  to governed template v0.2", the list was placed in Section 2. Flagged for PM
  awareness in the implementation Final Report.
