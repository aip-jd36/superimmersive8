# Chain of Title PDF Generation

This folder contains tools for generating branded PDF versions of Chain of Titles that match the SI8 website aesthetic.

---

## Files in This Folder

| File | Purpose |
|------|---------|
| `chain-of-title-template.html` | HTML template with SI8 design system |
| `generate-pdf.sh` | Shell script to convert HTML to PDF |
| `neon-dreams.html` | Styled HTML version of Example 001 (ready for PDF) |
| `README.md` | This file |

---

## Design System

The PDF template uses the same design aesthetic as superimmersive8.com:

**Colors:**
- Background: `#FFFBF5` (warm cream)
- Surface: `#FFFFFF` (white)
- Text: `#1a1a1a` (dark charcoal)
- Accent: `#C8900A` (golden amber)
- Accent Light: `#F5E6C8` (light gold)

**Typography:**
- Display font: Space Grotesk (headings, logo)
- Body font: Inter (paragraphs, tables)

**Layout:**
- A4 page size
- 20mm top/bottom margins, 15mm left/right
- Print-optimized (page breaks, no-break sections)

---

## How to Generate PDF

### Method 1: Browser Print (Easiest)

1. **Open the HTML file in Chrome or Firefox:**
   ```bash
   open neon-dreams.html
   # or: firefox neon-dreams.html
   ```

2. **Print to PDF:**
   - **Chrome:** File → Print → Save as PDF
   - **Firefox:** File → Print → Save to PDF
   - **Settings:**
     - Paper size: A4
     - Margins: Default
     - Background graphics: ✓ Enabled
     - Headers/footers: ✗ Disabled

3. **Save:** `neon-dreams-chain-of-title.pdf`

**Pros:** Easy, no installation, WYSIWYG
**Cons:** Manual process for each file

---

### Method 2: Command Line with wkhtmltopdf

**Install wkhtmltopdf:**
```bash
# macOS
brew install wkhtmltopdf

# Ubuntu/Debian
sudo apt-get install wkhtmltopdf

# Windows
# Download from: https://wkhtmltopdf.org/downloads.html
```

**Generate PDF:**
```bash
./generate-pdf.sh neon-dreams.html neon-dreams-chain-of-title.pdf
```

**Or manually:**
```bash
wkhtmltopdf \
  --page-size A4 \
  --margin-top 20mm \
  --margin-bottom 20mm \
  --margin-left 15mm \
  --margin-right 15mm \
  --enable-local-file-access \
  --print-media-type \
  neon-dreams.html \
  neon-dreams-chain-of-title.pdf
```

**Pros:** Scriptable, consistent output, batch processing
**Cons:** Requires installation

---

### Method 3: Puppeteer (Node.js) - Best for Automation

**Install Puppeteer:**
```bash
npm install puppeteer
```

**Create `generate-pdf.js`:**
```javascript
const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  await page.goto(`file://${path.resolve('neon-dreams.html')}`, {
    waitUntil: 'networkidle0'
  });

  await page.pdf({
    path: 'neon-dreams-chain-of-title.pdf',
    format: 'A4',
    margin: {
      top: '20mm',
      bottom: '20mm',
      left: '15mm',
      right: '15mm'
    },
    printBackground: true
  });

  await browser.close();
  console.log('PDF generated: neon-dreams-chain-of-title.pdf');
})();
```

**Run:**
```bash
node generate-pdf.js
```

**Pros:** Best quality, automation-ready, programmatic control
**Cons:** Requires Node.js setup

---

## Creating a New Chain of Title PDF

### Step 1: Copy the Template
```bash
cp chain-of-title-template.html new-work-title.html
```

### Step 2: Replace Placeholders

Open `new-work-title.html` and find/replace:

| Placeholder | Replace With |
|-------------|--------------|
| `[WORK TITLE]` | Actual work title |
| `[SI8-YYYY-####]` | Catalog ID (e.g., SI8-2026-0002) |
| `[Filmmaker Name]` | Filmmaker's name |
| `[Duration]` | Runtime (e.g., "90 seconds") |
| `[Month YYYY]` | Production date |
| `[Date]` | Package date |
| `[X.X]` | Version number |

### Step 3: Fill in Content

Replace section placeholders with actual Chain of Title content:
- Copy field content from the markdown Chain of Title
- Paste into corresponding HTML sections
- Preserve HTML table structure for tables
- Use `<ul class="checklist">` for checkmark lists

### Step 4: Generate PDF

Use any of the three methods above to create PDF.

---

## HTML Template Structure

```html
<div class="cover-page">
  <!-- Cover page with branding, title, metadata -->
</div>

<div class="page-break"></div>

<div class="content-page container">
  <h2>1. Tool Provenance Log</h2>
  <!-- Field 1 content -->

  <div class="section-divider"></div>

  <h2>2. Model Disclosure</h2>
  <!-- Field 2 content -->

  <!-- ... continue for all 9 fields -->
</div>

<div class="page-footer">
  <!-- Footer on every page -->
</div>
```

---

## Styling Components

### Callout Box (for Rights Verified approval)
```html
<div class="callout">
  <div class="callout-title">
    Rights Verified Status: <span class="badge badge-success">✓ APPROVED</span>
  </div>
  <div class="callout-content">
    <p>Content here</p>
  </div>
</div>
```

### Status Badges
```html
<span class="badge badge-success">✓ On file</span>
<span class="badge badge-warning">Pending</span>
<span class="badge badge-info">Standard Tier</span>
```

### Checklist
```html
<ul class="checklist">
  <li>Item with automatic checkmark</li>
  <li>Another item</li>
</ul>
```

### Section Divider
```html
<div class="section-divider"></div>
```

### Page Break
```html
<div class="page-break"></div>
```

---

## Tips for Best Results

1. **Page Breaks:**
   - Add `<div class="page-break"></div>` before major sections
   - Use `.no-break` class on tables to prevent splitting

2. **Typography:**
   - Use `<strong>` for bold (e.g., field labels)
   - Use `<em>` for emphasis
   - Keep paragraphs justified for professional look

3. **Tables:**
   - Headers automatically get golden background
   - Zebra striping on rows (automatic)
   - Keep tables under 10 rows per page (or they may split)

4. **Colors:**
   - All colors are print-optimized
   - `print-color-adjust: exact` ensures colors render in PDF
   - Test print preview before final generation

5. **Fonts:**
   - Template uses Google Fonts (Space Grotesk + Inter)
   - These are embedded in the HTML, so PDFs work offline
   - Fallback fonts: system sans-serif

---

## File Size Optimization

**Expected PDF sizes:**
- 10-page Chain of Title: ~200-300 KB
- 15-page Chain of Title: ~400-500 KB

**If file size is too large:**
1. Check for embedded images (none in template)
2. Use wkhtmltopdf with `--lowquality` flag for smaller output
3. Compress with Adobe Acrobat or online tools

---

## Troubleshooting

**Fonts not loading:**
- Check internet connection (fonts load from Google Fonts)
- For offline use, download fonts and embed locally

**Colors not printing:**
- Enable "Background graphics" in print settings
- In CSS: `print-color-adjust: exact` is already set

**Page breaks in wrong places:**
- Add `<div class="page-break"></div>` manually
- Use `.no-break` class on elements that shouldn't split

**Table too wide:**
- Reduce font size in table: `<table style="font-size: 8pt;">`
- Or adjust column widths

---

## Next Steps

1. **Generate Example 001 PDF** using `neon-dreams.html`
2. **Test with buyers** — get feedback on formatting, clarity
3. **Iterate template** based on feedback
4. **Add to website** as downloadable sample
5. **Create workflow** for future Chain of Titles

---

**Questions?** Contact SI8 operations team
