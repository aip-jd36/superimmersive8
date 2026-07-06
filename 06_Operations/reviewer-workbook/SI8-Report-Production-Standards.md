# SI8 Report Production Standards
**Version:** 1.0 | **Effective:** July 2026 | **Status:** ACTIVE
**Document type:** Visual and production standards — distinct from Report Delivery SOP (process)

This document defines the visual language, file standards, and quality requirements for every SI8 Campaign Assurance Assessment Report. All reports must conform to these standards before delivery. Version changes require the "Governance" approval process in the final section.

---

## 1. Report Structure

Every SI8 Campaign Assurance Assessment Report uses the Report v0.2 structure:

| Section | Title | Purpose |
|---------|-------|---------|
| Cover page | — | Assessment identity and outcome at a glance |
| Section 1 | Commercial Assurance Summary | Commercial decision-maker view — outcome, confidence, findings, conditions |
| Section 2 | Assessment Scope | What was reviewed and what wasn't |
| Section 3 | Domain Assessment | 7-domain evidentiary detail |
| Section 4 | Standard Assurance Language | Verbatim policy language — never edited |
| Appendix A | Supporting Evidence Record | Structured evidence inventory |

**Required sections:** All of the above appear in every report. No section may be omitted. If a domain has no applicable evidence, the domain block still appears — with status "Not Applicable" and a one-sentence explanation in the finding field.

---

## 2. Color System

| Token | Hex value | Use |
|-------|-----------|-----|
| `c-black` | `#1A1918` | Body text, all running copy |
| `c-amber` | `#C8900A` | SI8 brand accent — amber cover rule, section underlines, domain left borders |
| `c-navy` | `#1C3557` | Section headings (H1, H2), cover page outcome block, table headers |
| `c-bg` | `#F0EDE8` | Warm off-white — alternating table rows, domain header bar, metadata block background |
| `c-border` | `#D8D4CE` | Thin rule lines, domain content border |
| `c-gray` | `#4A4744` | Secondary text, field labels (CAPS), running header/footer |

**Confidence badge colors:**

| Level | Background | Foreground |
|-------|------------|------------|
| HIGH | `#E8F5E9` | `#1B5E20` (dark green) |
| MEDIUM | `#FFF8E1` | `#7A4900` (dark amber) |
| LOW | `#FFEBEE` | `#B71C1C` (dark red) |

**Domain status label colors:**

| Status | Color | Icon |
|--------|-------|------|
| Verified | `#1B5E20` (dark green) | ✓ |
| Partially Verified | `#7A4900` (dark amber) | ◐ |
| Not Provided | `#B71C1C` (dark red) | ○ |
| Not Applicable | `#4A4744` (gray) | — |

---

## 3. Typography

**Font stack (in preference order):** Calibri · Arial · Helvetica Neue · Liberation Sans

On Windows 11, Calibri is the primary font. A single consistent sans-serif throughout — no serif/sans mixing.

| Element | Size | Weight | Color |
|---------|------|--------|-------|
| Body text | 10.5pt | Regular | `c-black` |
| H1 (section titles) | 14pt | Bold | `c-navy` |
| H2 (subsection titles) | 11pt | Bold | `c-black` |
| H3 (domain labels, field labels) | 10.5pt | Bold | `c-navy` |
| Field labels in blocks | 8.5pt | Bold | `c-gray` |
| Field labels tracking | 0.3–0.5pt | — | — |
| Running header/footer | 8pt | Regular | `c-gray` |
| Cover title (content title) | 24pt | Bold | `c-black` |
| Cover SI8 wordmark | 30pt | Bold | `c-amber` |

**Paragraph settings:** Justified, 0.78em leading, 1.15em paragraph spacing.

---

## 4. Page Layout

**Paper:** A4 (210mm × 297mm)

**Body page margins:** Top 3.2cm · Bottom 3.2cm · Left 2.8cm · Right 2.8cm

**Cover page margins:** Top 3cm · Bottom 3cm · Left 3.2cm · Right 3.2cm

### Running header (body pages, not cover page)

Left: `SI8 | Campaign Assurance` (bold `SI8`, regular rest)
Center: Assessment ID
Right: Report date

All 8pt, `c-gray`. Thin 0.5pt `c-border` rule below.

### Running footer (body pages, not cover page)

Left: `Confidential — For authorized recipient only`
Right: `Page N of M`

All 8pt, `c-gray`. Thin 0.5pt `c-border` rule above.

### Cover page

No running header or footer. Contains its own branding block at top and disclaimer line at bottom.

---

## 5. Component Standards

### Section headings (H1)

- 14pt bold navy
- 1.8pt amber line below (full width), 0.6em space below line
- 1.5em vertical space above

### Subsection headings (H2)

- 11pt bold black
- Left amber border (3pt solid `c-amber`)
- 10pt left inset
- 1.0em above, 0.4em below

### Domain blocks

Consistent two-part structure:
1. **Header bar** — `c-bg` fill, 12pt horizontal inset, 8pt vertical inset. Domain name (11pt bold navy) on left; status label on right.
2. **Content area** — 3.5pt amber left border, 0.5pt `c-border` on other three sides, 12pt inset.
   - Three labeled subsections: `EVIDENCE REVIEWED` · `FINDING` · `COMMERCIAL IMPLICATION`
   - Labels: 8.5pt bold `c-gray`, 0.5pt tracking, uppercase
   - Content: 10pt body text

**Spacing between domain blocks:** 1.6em below each block.

### Confidence badge

Rounded box (3pt radius), padding 9pt horizontal, 5pt vertical. Text: 9.5pt bold. Three states: High/Medium/Low. Always followed by a linebreak — never inline with body text except in cover page and Section 1 overview.

### Evidence coverage table (Section 1)

Three columns: Domain name (2fr) · Status (1.4fr) · Commercial Impact of Any Gap (2fr).
Header row: `c-navy` fill, white bold text, 9pt.
Alternating rows: white / `c-bg` fill.
No table stroke. 10pt horizontal inset, 7pt vertical.

### Standard Assurance Language box (Section 4)

4pt navy left border. `c-bg` fill. 14pt horizontal inset, 12pt vertical inset. Right radius 3pt. Body text 9.5pt, leading 0.7em. The language inside is verbatim from the Methodology — never paraphrase or edit.

### Appendix A fields

Two-column grid: label column 160pt, value column 1fr.
Labels: 8.5pt bold `c-gray`, 0.3pt tracking, uppercase.
Values: 9.5pt body text.
4pt vertical gap between fields. Section separators: 0.5pt `c-border` rule.

---

## 6. Cover Page Standards

**Visual hierarchy (top to bottom):**

1. SI8 wordmark + "Campaign Assurance" label + entity line
2. 2pt amber rule (full width)
3. 1fr vertical space
4. "CAMPAIGN ASSURANCE ASSESSMENT" label (10pt bold navy, 1pt tracking)
5. Content title (24pt bold black)
6. Metadata block (`c-bg` fill) — Assessment ID, Report date, Submitted by, Submission ID
7. Outcome + confidence block (1.5pt navy stroke) — Outcome label, outcome text, confidence badge
8. 1fr vertical space
9. 0.5pt border rule
10. Prepared-by line + disclaimer line (8pt gray)

**Cover page items that must appear exactly:**
- "PMF Strategy Inc. d/b/a SuperImmersive 8" in the entity line and in the footer
- "superimmersive8.com" in the footer
- Disclaimer: "This report is not legal advice. See Standard Assurance Language (Section 4) for full scope limitations."

---

## 7. File Naming Convention

### Source files (Typst)

```
[ASSESS-ID].typ
```

Example: `ASSESS-001-2026-07-16.typ`

Assessment IDs follow the format: `ASSESS-[NUMBER]-YYYY-MM-DD` where NUMBER is zero-padded to 3 digits. Assessment Zero uses the special ID `ASSESS-ZERO-2026-07-06`.

### PDF output files

```
[ASSESS-ID].pdf
```

Same name as source, `.pdf` extension. Both files live in `tools/report-pipeline/`.

### Customer-facing filename (for email attachment)

```
SI8-Campaign-Assurance-[Abbreviated-Content-Title]-[ASSESS-ID].pdf
```

Example: `SI8-Campaign-Assurance-Clarity-Harborne-ASSESS-001-2026-07-16.pdf`

Rename the PDF before attaching to the delivery email. Do not send the bare `ASSESS-ID.pdf` file — it is not descriptive from the customer's perspective.

---

## 8. PDF Metadata

Typst sets PDF metadata via document-level settings. The report file should include:

```typst
#set document(
  title: "SI8 Campaign Assurance Assessment — [Content Title]",
  author: "SI8 — PMF Strategy Inc. d/b/a SuperImmersive 8",
  keywords: ("SI8", "Campaign Assurance", "[Assessment ID]"),
  date: datetime.today(),
)
```

This appears in the file's Properties when the customer opens it in a PDF reader. Required on all reports.

---

## 9. Assessment ID Format

| Format | When used |
|--------|-----------|
| `ASSESS-ZERO-YYYY-MM-DD` | Assessment Zero (system validation only — never issued to real customers) |
| `ASSESS-001-YYYY-MM-DD` | First real customer assessment |
| `ASSESS-002-YYYY-MM-DD` | Second, and so on |

The date in the ID is the report delivery date, not the submission date or the review date.

---

## 10. Template Version Tracking

| Template version | Report file format | Effective date | Changes from prior version |
|-----------------|-------------------|----------------|---------------------------|
| 1.0 | `si8-report-template.typ v1.0` | July 2026 | Initial production release |

The template version is stated in the Appendix A evidence record of every report.

When the template is updated:
1. Increment the version number in the file header comment
2. Update this table
3. Document the change in the Version History below

---

## 11. Quality Checklist — Before Delivery

Run this checklist for every report before emailing to the customer:

**Cover page**
- [ ] Assessment ID matches all instances in the document (cover, header, Appendix A footer)
- [ ] Report date is correct
- [ ] Submitter name and company are correct
- [ ] Submission ID is correct
- [ ] Outcome text matches the Section 1 outcome
- [ ] Confidence badge level matches Section 1

**Structure**
- [ ] All 4 sections present (cover + Sections 1–4)
- [ ] Appendix A present
- [ ] No section is blank or placeholder

**Section 1**
- [ ] Confidence badge is High/Medium/Low (not a placeholder)
- [ ] Evidence Coverage Table has exactly 7 domain rows
- [ ] Domain statuses in the table match Section 3 findings
- [ ] Key Findings numbered list is present
- [ ] Conditions section present (even if it says "No conditions — evidence fully supports intended use")
- [ ] Residual Commercial Risks present (training data residual risk is standard language in every report)
- [ ] Recommended Next Steps present

**Section 3**
- [ ] All 7 domains appear in order (A, R, H, I, L, T, D)
- [ ] Each domain block has all three fields populated (Evidence Reviewed, Finding, Commercial Implication)

**Section 4**
- [ ] Standard Assurance Language is verbatim — not paraphrased, not shortened

**Typographic**
- [ ] No orphaned headings (heading at bottom of page, no body text on same page)
- [ ] Running header shows correct Assessment ID
- [ ] Page numbering is correct (pages counted, "Page N of M" visible)
- [ ] Cover page has no header/footer

**File**
- [ ] PDF renamed with customer-facing convention before attaching

---

## 12. Version History

| Date | Changed by | Change |
|------|-----------|--------|
| July 2026 | JD Chang | Version 1.0 — initial document |

---

## 13. Governance

**Who can change these standards:** JD Chang only, until a second reviewer is designated.

**When standards may change:**
- Evidence from real assessments shows a consistent visual or structural gap
- Customer feedback identifies a clarity or readability issue
- Regulatory or compliance context changes (e.g., new SI8 methodology version)
- Any change to the Standard Assurance Language requires a formal Methodology revision (not just a Standards update)

**How to change:**
1. Draft the proposed change with rationale
2. Note if it affects existing report files (backward compatibility)
3. Increment the template version and update this document
4. If the Standard Assurance Language changes: flag as Methodology change, not just Standards change

**What does NOT require a Standards update:**
- Adding a new report `.typ` file (new assessment)
- Minor phrasing updates within a domain block that don't affect structure
- Changes to Section 1 content (findings, conditions, risks) — these vary per assessment
