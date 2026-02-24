# Rights Package PDF Versions Guide

**Last Updated:** February 24, 2026
**Purpose:** Instructions for generating and maintaining different PDF versions of Rights Packages

---

## Overview

SI8 maintains **two primary PDF versions** of each Rights Package:

| Version | Purpose | Watermark | Distribution | Receipts Included |
|---------|---------|-----------|--------------|-------------------|
| **Sample (Public)** | Marketing, sales, website | ✓ "SAMPLE" diagonal | Public (cold email, website download) | No (redacted) |
| **Full (Deliverable)** | Buyer deliverable post-deal | ✗ None | Private (post-deal only, under license) | Yes (full detail) |

---

## When to Use Each Version

### Sample Version (Public)
**Use for:**
- Cold email to prospects (brands, agencies, advisors)
- Website "Download Sample" button
- Filmmaker recruitment ("Here's what you'll get")
- Pitch decks and presentations
- Advisory board review
- LinkedIn content (visual samples)

**What's different:**
- Watermarked "SAMPLE" diagonally across pages
- Receipts redacted (say "receipt on file" instead of showing actual billing)
- May use fictional filmmaker info (like "Alex Chen" in Example 001)
- Clearly labeled as example/demo

---

### Full Version (Buyer Deliverable)
**Use for:**
- Delivered to buyer after deal closes
- Accompanies licensed content
- Part of license agreement package
- Audit trail for buyer's legal team

**What's included:**
- No watermark
- Full receipts (billing statements, invoices)
- Real filmmaker info
- All supporting documentation
- Signed by SI8 Review Team

---

## How to Generate PDFs from HTML

### Current Templates
- `neon-dreams.html` — Example 001 with all P1 + P2 fixes applied
- `rights-package-template.html` — Blank template for future packages

---

## Method 1: Browser Print (Recommended for Sample Version)

### Step 1: Open HTML in Chrome or Firefox

```bash
# From terminal:
cd /Users/JD/Desktop/SuperImmersive8/05_Catalog/_examples/pdf-template/
open neon-dreams.html
```

### Step 2: Print to PDF

**Chrome:**
1. File → Print (or Cmd+P)
2. Destination: **Save as PDF**
3. Settings:
   - Paper size: **A4**
   - Margins: **Default**
   - Background graphics: **✓ Enabled** (CRITICAL — ensures colors print)
   - Headers and footers: **✗ Disabled**
4. Click **Save**
5. Save as: `Sample - Rights Package - Neon Dreams.pdf`

**Firefox:**
1. File → Print (or Cmd+P)
2. Destination: **Save to PDF**
3. Settings: (same as Chrome)
4. Click **Save**

### Step 3: Add Watermark

**Option A: Preview (Mac built-in)**

1. Open the PDF in Preview
2. Tools → Annotate → Text
3. Add text box: "SAMPLE"
4. Font: Space Grotesk Bold, 72pt, 20% opacity gray
5. Rotate: -45 degrees
6. Position: Centered on page
7. Copy to all pages (tedious but works)
8. File → Export as PDF

**Option B: Adobe Acrobat (if available)**

1. Open PDF in Acrobat
2. Tools → Edit PDF → Watermark → Add
3. Text: "SAMPLE"
4. Font: Space Grotesk Bold, 72pt
5. Opacity: 20%
6. Rotation: -45 degrees
7. Apply to all pages
8. Save

**Option C: Online Tool (quickest)**

- Use: https://www.ilovepdf.com/add_watermark_to_pdf
- Upload PDF
- Text watermark: "SAMPLE"
- Diagonal, centered, 20% opacity
- Download watermarked version

---

## Method 2: Command Line with wkhtmltopdf

**Install wkhtmltopdf:**

```bash
# macOS
brew install wkhtmltopdf
```

**Generate PDF:**

```bash
cd /Users/JD/Desktop/SuperImmersive8/05_Catalog/_examples/pdf-template/

wkhtmltopdf \
  --page-size A4 \
  --margin-top 20mm \
  --margin-bottom 20mm \
  --margin-left 15mm \
  --margin-right 15mm \
  --enable-local-file-access \
  --print-media-type \
  neon-dreams.html \
  "Sample - Rights Package - Neon Dreams.pdf"
```

**Then add watermark** using one of the methods above.

---

## Method 3: Use the generate-pdf.sh Script

```bash
cd /Users/JD/Desktop/SuperImmersive8/05_Catalog/_examples/pdf-template/

./generate-pdf.sh neon-dreams.html "Sample - Rights Package - Neon Dreams.pdf"
```

**Then add watermark** using one of the methods above.

---

## Current Status (February 2026)

### Example 001 — Neon Dreams

| Version | Filename | Status | Location | Last Updated |
|---------|----------|--------|----------|--------------|
| **Full (Original)** | `[Example] Rights Package — Neon Dreams.pdf` | ✅ Generated | `05_Catalog/_examples/example-001-neon-dreams/` | Feb 21, 2026 |
| **Full (P1 Updated)** | `Rights Package — Neon Dreams.pdf` | 🔄 **NEEDS REGENERATION** | (regenerate from updated HTML) | Pending |
| **Sample (Watermarked)** | `Sample - Rights Package - Neon Dreams.pdf` | ⏳ **NOT YET GENERATED** | (to be created) | Pending |

**Action needed:**
1. Regenerate full PDF from `neon-dreams.html` (now includes P1 fixes + executive summary)
2. Generate watermarked Sample version from the regenerated PDF
3. Move old version to `05_Catalog/_examples/example-001-neon-dreams/versions/v0.9-original.pdf`

---

## Checklist: Regenerating Example 001 After P1+P2 Updates

- [ ] **Step 1:** Open `neon-dreams.html` in Chrome
- [ ] **Step 2:** Print to PDF (enable background graphics)
- [ ] **Step 3:** Save as `Rights Package — Neon Dreams.pdf` (full version, no watermark)
- [ ] **Step 4:** Move to `05_Catalog/_examples/example-001-neon-dreams/`
- [ ] **Step 5:** Replace old PDF (or archive to `/versions/`)
- [ ] **Step 6:** Duplicate the PDF
- [ ] **Step 7:** Rename duplicate to `Sample - Rights Package - Neon Dreams.pdf`
- [ ] **Step 8:** Add "SAMPLE" watermark (diagonal, 20% opacity)
- [ ] **Step 9:** Move Sample PDF to `05_Catalog/_examples/example-001-neon-dreams/`
- [ ] **Step 10:** Test: Open both PDFs, verify:
  - P1 fixes applied ("Reviewed and Documented By", training data disclaimer, legal entity in footer)
  - Executive summary appears after cover page
  - Watermark visible on Sample version, not on Full version
- [ ] **Step 11:** Update README.md to reflect both versions available
- [ ] **Step 12:** Git commit with message: "Regenerate Example 001 PDFs with P1+P2 updates"

---

## Future: Creating New Rights Packages

When creating a new Rights Package (e.g., Example 002):

1. **Copy template:** `cp rights-package-template.html new-work-title.html`
2. **Fill in placeholders** (see: `pdf-template/README.md`)
3. **Generate Full PDF** using Method 1 or 2
4. **Generate Sample PDF** by duplicating Full PDF + adding watermark
5. **Store both versions** in `05_Catalog/_examples/example-00X-title/`
6. **File naming:**
   - Full: `Rights Package — [Work Title].pdf`
   - Sample: `Sample - Rights Package - [Work Title].pdf`

---

## Watermark Specifications

**Text:** "SAMPLE"
**Font:** Space Grotesk Bold (or similar sans-serif)
**Size:** 72pt
**Color:** Gray (#999999 or similar)
**Opacity:** 20%
**Rotation:** -45 degrees (diagonal)
**Position:** Centered on page
**Apply to:** All pages

**Why diagonal?** Less intrusive, clearly visible, doesn't block key content.

**Why 20% opacity?** Still readable but doesn't dominate; professional look.

---

## Tips for Best Results

1. **Always enable background graphics** when printing to PDF (or colors won't show)
2. **Test print preview** before final generation
3. **Check fonts** — if Space Grotesk or Inter don't render, check internet connection (fonts load from Google Fonts)
4. **File size:** Should be 200-500 KB for 10-15 page PDF; if larger, may have embedded issues
5. **Verify footer** on all pages — should show "PMF Strategy Inc. d/b/a SuperImmersive 8"

---

## Related Documentation

- `05_Catalog/_examples/pdf-template/README.md` — Detailed PDF generation guide
- `05_Catalog/_examples/FEEDBACK-SYNTHESIS.md` — Why Sample version is needed (AI feedback)
- `06_Operations/rights-verified/CHAIN-OF-TITLE-SCHEMA.md` — 9-field schema definition

---

**Next Step:** Regenerate Example 001 PDFs using checklist above.
