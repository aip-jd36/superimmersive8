# Chain of Title PDF Generator

Automated PDF generation for Rights Verified Chain of Title documents.

## Overview

**Web-based tool** for generating Chain of Title PDFs from approved Airtable submissions.

**Access:** Open browser to `http://localhost:3000` → Select record → Click "Generate PDF" → Done

**Features:**
- ✅ Simple web UI (no command-line required)
- ✅ Dropdown list of approved records
- ✅ One-click PDF generation
- ✅ Real-time progress indicators
- ✅ Recent generations log
- ✅ Automatic file organization

**Time saved:** ~10-15 minutes per entry (manual copy-paste → automated)

---

## Quick Start (Web UI)

### 1. Install & Configure (One-Time Setup)

```bash
cd 06_Operations/rights-verified/pdf-generator
npm install
cp .env.example .env
# Edit .env and add your Airtable credentials
```

### 2. Start the Web Server

```bash
npm start
```

You'll see:
```
🚀 Chain of Title PDF Generator - Web UI
✅ Server running at: http://localhost:3000
```

### 3. Open Your Browser

Navigate to: **http://localhost:3000**

### 4. Generate a PDF

1. **Select a record** from the dropdown (only approved records shown)
2. **Review details** - confirm it's the right record
3. **Click "Generate PDF"** - wait ~5 seconds
4. **Success!** - PDF location shown, check the file
5. **Spot-check** the PDF for errors
6. **Upload** to Google Drive and update Airtable

### 5. Stop the Server

Press `Ctrl+C` in the terminal

---

## Setup Details (One-Time)

### 1. Install Dependencies

```bash
cd 06_Operations/rights-verified/pdf-generator
npm install
```

This installs:
- `airtable` - Airtable API client
- `puppeteer` - Headless Chrome for PDF rendering
- `dotenv` - Environment variable management

### 2. Configure Environment Variables

```bash
cp .env.example .env
```

Edit `.env` and add your Airtable credentials:

```env
AIRTABLE_API_KEY=your_airtable_api_key_here
AIRTABLE_BASE_ID=your_base_id_here
AIRTABLE_TABLE_NAME=Rights Verified Submissions
OUTPUT_DIR=../../../05_Catalog/represented
```

**How to get your Airtable credentials:**

1. **API Key:**
   - Go to https://airtable.com/account
   - Click "Generate API key" (or reveal existing key)
   - Copy the key

2. **Base ID:**
   - Open your Airtable base
   - Go to Help → API Documentation
   - The Base ID is shown at the top: `appXXXXXXXXXXXXXX`

### 3. Verify Airtable Field Names

The script expects these field names in Airtable (customize in `generate-pdf.js` if yours differ):

**Core Fields:**
- Work Title
- Filmmaker Name
- Runtime
- Production Date
- Catalog ID
- Review Date
- Reviewer
- Risk Tier
- Review Status

**See `mapRecordToTemplateData()` function for complete field list.**

---

## Two Ways to Use

### **Option 1: Web UI (Recommended)**

Simple browser-based interface. Best for:
- Non-technical reviewers
- Visual record selection
- Real-time feedback

**Usage:** `npm start` → Open browser → Click buttons

### **Option 2: Command Line (Advanced)**

Direct script execution. Best for:
- Automation/scripting
- Batch processing
- Integration with other tools

**Usage:** `node generate-pdf.js <record-id>`

---

## Usage (Command Line)

### Basic Usage

```bash
node generate-pdf.js <airtable-record-id>
```

**Example:**
```bash
node generate-pdf.js rec1234567890ABC
```

### Step-by-Step Process

**1. Approve submission in Airtable**
   - Review submission against criteria
   - Set status to "Approved"
   - Ensure all required fields are complete

**2. Get the Record ID**
   - In Airtable, right-click on the record → Copy record URL
   - The URL contains the record ID: `https://airtable.com/appXXX/tblYYY/viwZZZ/rec1234567890ABC`
   - Copy the `rec...` part

**3. Run the generator**
   ```bash
   node generate-pdf.js rec1234567890ABC
   ```

**4. Check the output**
   - PDF is saved to: `05_Catalog/represented/[filmmaker-slug]/[title-slug]/[catalog-id]-chain-of-title-v1.0.pdf`
   - Open the PDF and spot-check for errors

**5. Upload to Google Drive**
   - Upload PDF to your Google Drive folder
   - Get shareable link
   - Update Airtable "PDF Link" field

---

## Output

### File Location

```
05_Catalog/represented/
└── jane-chen/                  # Filmmaker name (slugified)
    └── neon-dreams/            # Work title (slugified)
        └── SI8-2026-0001-chain-of-title-v1.0.pdf
```

### Filename Format

```
[CATALOG-ID]-chain-of-title-v[VERSION].pdf
```

Example: `SI8-2026-0001-chain-of-title-v1.0.pdf`

---

## Customization

### Modify Template

The HTML template is in `template.html`. It uses `{{variable}}` placeholders that get replaced with Airtable data.

**Common placeholders:**
- `{{title}}` - Work title
- `{{filmmaker_name}}` - Filmmaker name
- `{{catalog_id}}` - Catalog ID
- `{{review_date}}` - Review date
- `{{tools_table_rows}}` - Generated HTML for tools table

**To customize:**
1. Edit `template.html`
2. Add/modify `{{placeholders}}`
3. Update `mapRecordToTemplateData()` in `generate-pdf.js` to provide the data

### Modify Field Mapping

Edit the `mapRecordToTemplateData()` function in `generate-pdf.js`:

```javascript
function mapRecordToTemplateData(record) {
  const fields = record.fields;

  return {
    catalog_id: fields['Your Field Name Here'],
    // ... add more mappings
  };
}
```

### Complex Sections (Tables, Lists)

For tables and multi-row sections, use generator functions:

```javascript
function generateToolsTableRows(fields) {
  // Parse your data structure
  const tools = fields['Tools Used'];

  // Generate HTML rows
  return tools.map(tool => `
    <tr>
      <td>${tool.name}</td>
      <td>${tool.version}</td>
      <!-- etc -->
    </tr>
  `).join('\n');
}
```

---

## Troubleshooting

### Error: "AIRTABLE_API_KEY is not set"

**Solution:** Create a `.env` file (copy from `.env.example`) and add your Airtable API key.

### Error: "Record not found"

**Possible causes:**
- Wrong record ID (check you copied the full `rec...` string)
- Wrong base ID in `.env`
- Wrong table name in `.env`

**Solution:** Verify your `.env` configuration matches your Airtable setup.

### Error: "Cannot find module 'airtable'"

**Solution:** Run `npm install` in the pdf-generator directory.

### PDF has "{{placeholder}}" text visible

**Cause:** Template variable not replaced - missing data or typo in field name.

**Solution:**
1. Check the console output for "Warning: X placeholders not replaced"
2. Verify the Airtable field name matches the one in `mapRecordToTemplateData()`
3. Add missing data to Airtable or update the mapping

### Puppeteer fails to install

**On Mac with M1/M2 chip:**
```bash
PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true npm install puppeteer
brew install chromium
export PUPPETEER_EXECUTABLE_PATH=/opt/homebrew/bin/chromium
```

### PDF margins/formatting wrong

**Solution:**
- Check `@page` margins in `template.html` CSS
- Verify `page.pdf()` options in `generate-pdf.js`
- Print settings should be: `margin: { top: 0, right: 0, bottom: 0, left: 0 }`

---

## Development Workflow

### Test with Sample Data

```bash
# Use the SAMPLE record ID (create one in Airtable first)
node generate-pdf.js recSAMPLEXXXXXXX
```

### Debug Mode

Add console.log() statements in `generate-pdf.js`:

```javascript
console.log('DEBUG: Fields =', record.fields);
console.log('DEBUG: Mapped data =', data);
```

### View Generated HTML (Before PDF)

Temporarily save the HTML to inspect it:

```javascript
// In generate-pdf.js, after populateTemplate():
await fs.writeFile('debug-output.html', html);
console.log('DEBUG: HTML saved to debug-output.html');
```

---

## Future Enhancements

**Phase 2 (After 15+ entries):**
- [ ] Auto-upload to Google Drive
- [ ] Auto-update Airtable with PDF link
- [ ] Email notification when PDF is ready
- [ ] Batch generation (multiple records at once)

**Phase 3 (Platform launch):**
- [ ] Webhook trigger (auto-generate on Airtable approval)
- [ ] Cloud Function deployment
- [ ] Web UI for reviewers
- [ ] Version tracking (v1.1, v1.2 regeneration)

---

## Architecture Notes

**Why Node.js + Puppeteer?**
- Puppeteer renders HTML → PDF with high fidelity (Chrome engine)
- Maintains exact website styling (fonts, colors, spacing)
- Easily customizable (just edit HTML/CSS)
- Foundation for Year 3 platform automation

**Why not use a PDF library directly?**
- PDF libraries (pdfkit, jsPDF) require complex layout code
- HTML → PDF is simpler: design in HTML, render to PDF
- Template is human-readable and maintainable
- Same styling as website (consistent brand)

**Data Flow:**
```
Airtable Record → fetch() → map() → populate() → render() → PDF file
```

---

## Support

**Issues?** Check:
1. Console output for specific error messages
2. Airtable field names match script expectations
3. `.env` file is configured correctly
4. All dependencies installed (`npm install`)

**Questions?** See `06_Operations/rights-verified/` documentation:
- `REVIEW-PROCESS.md` - Review workflow
- `CHAIN-OF-TITLE-SCHEMA.md` - Field definitions
- `DECISIONS.md` - Process decisions log

---

**Last Updated:** March 2026
**Version:** 1.0
**Status:** Production Ready
