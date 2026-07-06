# SI8 Report Production Pipeline
**Version:** 1.0 | **Effective:** July 2026

This directory contains the Typst-based PDF pipeline for all SI8 Campaign Assurance Assessment Reports.

---

## Why Typst

Typst produces enterprise-grade PDFs from plain-text source files. Benefits for SI8:

- **Plain text, version-controlled** — `.typ` files are readable, diffable, and committed to git. Full history of every report.
- **Deterministic** — the same source always produces the same PDF. No dependency on browser rendering, CSS quirks, or HTML-to-PDF conversion.
- **Professional typography** — LaTeX-level output quality without the LaTeX complexity.
- **Fast** — compiles in under 1 second for a typical report.
- **Single binary** — no Node.js, no Python dependencies, no browser install required.

---

## Installation (Windows 11)

### Option A: winget (recommended)

```
winget install Typst.Typst
```

Verify:

```
typst --version
```

### Option B: Direct download

Download the latest release from the Typst GitHub releases page. Extract `typst.exe` and add it to your PATH.

---

## Directory Structure

```
tools/report-pipeline/
├── si8-report-template.typ          # Master template — import this in every report
├── README.md                         # This file
│
└── [ASSESS-ID].typ                  # One Typst source file per assessment
    e.g. ASSESS-ZERO-2026-07-06.typ
```

Output PDFs are generated in this directory:
```
tools/report-pipeline/[ASSESS-ID].pdf
```

**PDFs are NOT committed to git** (binary files, too large). The `.typ` source file is the version-controlled artifact. Deliver the PDF to the customer; keep the `.typ` source.

---

## Generating a Report PDF

From the repo root or from `tools/report-pipeline/`:

```
cd tools/report-pipeline
typst compile ASSESS-ZERO-2026-07-06.typ ASSESS-ZERO-2026-07-06.pdf
```

Or with a full path from repo root:

```
typst compile tools/report-pipeline/ASSESS-ZERO-2026-07-06.typ tools/report-pipeline/ASSESS-ZERO-2026-07-06.pdf
```

Typst will print any errors to stdout. A clean compile prints nothing and produces the PDF.

---

## Creating a New Report

### Step 1: Create the Typst source file

Copy the most recent report file and rename it for the new assessment:

```
copy ASSESS-ZERO-2026-07-06.typ ASSESS-001-2026-MM-DD.typ
```

### Step 2: Update the header metadata

Edit the new `.typ` file. Update:
- Assessment ID (appears in: page header, cover page, appendix footer)
- Report date
- Content title
- Submitter name and company
- Submission ID
- Outcome (one of the 5 SI8 outcomes — see Reviewer Manual §2.3)
- Confidence level (`"High"`, `"Medium"`, or `"Low"`)

### Step 3: Update the global page setup block

At the top of the file, update the page header strings:

```typst
[*SI8* | Campaign Assurance],
[ASSESS-001-2026-MM-DD],       // ← change to new ID
[16 July 2026],                // ← change to new date
```

### Step 4: Populate report content

Follow the Report v0.2 structure:
1. Section 1 — Commercial Assurance Summary Dashboard
2. Section 2 — Assessment Scope
3. Section 3 — Domain Assessment (7 domains using `domain-block()`)
4. Section 4 — Standard Assurance Language (use `assurance-box()` — never edit the language)
5. Appendix A — Supporting Evidence Record

### Step 5: Compile

```
typst compile ASSESS-001-2026-MM-DD.typ ASSESS-001-2026-MM-DD.pdf
```

Review the PDF. Check:
- Cover page metadata correct
- Section 1 outcome and confidence match
- All 7 domains appear in Section 3
- Standard Assurance Language is verbatim
- Page numbering is correct
- Header shows correct assessment ID on body pages

### Step 6: Deliver

Email the PDF to the customer following the Report Delivery SOP (`06_Operations/reviewer-workbook/SI8-Report-Delivery-SOP-v0.1.md`).

---

## Template Reference

The `si8-report-template.typ` file exports these components:

### Color constants

| Name | Hex | Use |
|------|-----|-----|
| `c-black` | #1A1918 | Primary text |
| `c-amber` | #C8900A | SI8 accent, section lines, domain left borders |
| `c-navy` | #1C3557 | Headings, cover page, outcome block |
| `c-bg` | #F0EDE8 | Alt table rows, info boxes, domain header bar |
| `c-gray` | #4A4744 | Secondary text, field labels |

### Functions

**`confidence-badge(level)`**
- `level`: `"High"`, `"Medium"`, or `"Low"`
- Returns a colored rounded box badge

**`domain-status(status)`**
- `status`: `"Verified"`, `"Partially Verified"`, `"Not Provided"`, or `"Not Applicable"`
- Returns a colored inline text label

**`domain-block(name, status, evidence-reviewed, finding, commercial-implication)`**
- All arguments are named keyword arguments
- `evidence-reviewed`, `finding`, `commercial-implication` accept Typst content (square bracket syntax)
- Returns a full domain assessment block with header bar and amber left border

**`cover-page(content-title, assess-id, report-date, submitter, submission-id, outcome, confidence)`**
- All arguments are strings (Typst string syntax: `"value"`)
- Returns a full-page cover with SI8 branding, metadata block, and outcome block

**`assurance-box(content)`**
- Wraps content in the standard assurance language box (navy left border)
- Use for the verbatim Standard Assurance Language in Section 4

**`evidence-table(rows)`**
- `rows`: array of 3-element arrays: `(domain-name, status, gap-note)`
- Returns the evidence coverage table in Section 1
- Example: `#evidence-table((("Domain A", "Verified", "None"), ...))`

**`field(label, value)`**
- Named keyword arguments; both strings
- Returns a label + value row for Appendix A

---

## Fonts

The template specifies: `"Calibri"`, `"Arial"`, `"Helvetica Neue"`, `"Liberation Sans"` in preference order.

On Windows 11, Calibri is always available. If Typst cannot find any of these fonts, it will warn and fall back to its default — visually acceptable but not brand-consistent. Install Calibri if missing (included in standard Windows font library).

---

## Troubleshooting

**"file not found" error on import**
The report file uses `#import "si8-report-template.typ": *`. Run `typst compile` from inside the `tools/report-pipeline/` directory, not from the repo root.

**"unknown variable" errors**
Check the import line is at the top of the file: `#import "si8-report-template.typ": *`.

**Font warnings**
Typst will warn if named fonts are not found. Install Calibri (standard on Windows) or accept the fallback.

**Cover page bleeds into page 2 content**
The cover page uses `1fr` spacing to fill the page vertically. If the content title is very long (4+ words on two lines), reduce font size in the cover-page block.

**Page numbers show on cover page**
Check that the `header:` and `footer:` parameters in the `page()` call inside `cover-page()` are both `none`.

---

## Versioning

| File | Version | Notes |
|------|---------|-------|
| `si8-report-template.typ` | 1.0 | Initial production template |
| `ASSESS-ZERO-2026-07-06.typ` | 1.0 | Assessment Zero — system validation report |

Template version is tracked in `06_Operations/reviewer-workbook/SI8-Report-Production-Standards.md`.

When the template is updated, increment the version in the file header and in the Production Standards document. Do NOT update the template without updating the Standards document.
