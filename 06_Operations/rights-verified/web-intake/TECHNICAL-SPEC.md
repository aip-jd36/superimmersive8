# Technical Specification — Rights Verified Web Intake Form

**Version:** 1.0
**Date:** February 27, 2026
**Status:** Final (stack decisions made)
**Target:** v0.1 MVP by March 15, 2026

---

## Stack Overview

| Layer | Technology | Why This Choice |
|-------|------------|-----------------|
| **Frontend** | Static HTML/CSS/JS | Simple, fast build, same as current website, no build step |
| **Storage** | Google Sheets | Free, unlimited rows, web UI for SI8 review, API built-in, easy migration to PostgreSQL later |
| **File Uploads** | Google Drive API | Free 15GB, familiar to filmmakers, folders = organization, shareable links |
| **Email** | Resend | Current SI8 email service, already integrated, $0/mo (100 emails/day free tier) |
| **Hosting** | Vercel | Current SI8 hosting, free tier, auto-deploy from GitHub, serverless functions |
| **API** | Vercel Serverless Functions | No backend server needed, same stack as current website |

**Cost:** $0/month (all free tiers)

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Filmmaker (Browser)                       │
│              superimmersive8.com/submit                      │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ Fills out form
                       │
┌──────────────────────▼──────────────────────────────────────┐
│               Frontend (HTML/CSS/JS)                         │
│  • 10 sections (SUBMISSION-REQUIREMENTS.md)                  │
│  • Client-side validation                                    │
│  • File upload UI                                            │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ POST /api/submit
                       │
┌──────────────────────▼──────────────────────────────────────┐
│      Vercel Serverless Function (/api/submit.js)            │
│  • Server-side validation                                    │
│  • Upload files to Google Drive                              │
│  • Write row to Google Sheets                                │
│  • Send email notifications (Resend)                         │
│  • Return success + Submission ID                            │
└──────────────────────┬──────────────────────────────────────┘
                       │
           ┌───────────┼───────────┐
           │           │           │
           ▼           ▼           ▼
    ┌──────────┐  ┌────────┐  ┌───────────┐
    │  Google  │  │ Google │  │  Resend   │
    │  Sheets  │  │  Drive │  │  Email    │
    │ (Storage)│  │ (Files)│  │(Notify SI8│
    └──────────┘  └────────┘  │+ Filmmaker│
                               └───────────┘
```

---

## Data Schema (Google Sheets)

### **Spreadsheet:** "SI8 Rights Verified Submissions"

**Sheet 1: Submissions**

| Column | Data Type | Description | Example |
|--------|-----------|-------------|---------|
| **A: submission_id** | Text | Unique ID: `SUB-2026-0001` | SUB-2026-0001 |
| **B: timestamp** | Datetime | Auto-generated on submit | 2026-03-01 14:23:15 |
| **C: status** | Text | received / pre-screen / full review / pending info / approved / rejected | received |
| **D: filmmaker_name** | Text | Full name | Alex Chen |
| **E: filmmaker_email** | Email | Contact email | alex@example.com |
| **F: filmmaker_location** | Text | City, country | Singapore |
| **G: filmmaker_portfolio** | URL | Website/portfolio link | alexchen.com |
| **H: prior_works** | Text | Links to 2-3 prior works (comma-separated) | vimeo.com/123, vimeo.com/456 |
| **I: first_submission** | Boolean | Y/N — first time submitting to SI8 | Y |
| **J: title** | Text | Work title | Neon Dreams |
| **K: runtime** | Text | mm:ss format | 01:45 |
| **L: genre** | Text | Genre/category | Narrative short |
| **M: logline** | Text | 1-2 sentence description | A cyberpunk noir... |
| **N: intended_use** | Text | Catalog / Placement / Both | Both |
| **O: production_start** | Text | Month/Year | Jan 2026 |
| **P: production_end** | Text | Month/Year | Feb 2026 |
| **Q: existing_agreements** | Text | Any existing licenses/festivals | N |
| **R: tools_json** | JSON | Array of tools used (see schema below) | [{"tool":"Runway","version":"Gen-3",...}] |
| **S: receipts_folder_url** | URL | Google Drive folder with all receipts | drive.google.com/folders/abc123 |
| **T: authorship_declaration** | Text | Human authorship statement (min 150 words) | I began by crafting... |
| **U: likeness_confirmed** | Boolean | No real person faces/voices | Y |
| **V: likeness_notes** | Text | Any notes on likeness concerns | (blank if none) |
| **W: ip_confirmed** | Boolean | No copyrighted IP imitation | Y |
| **X: ip_notes** | Text | Any notes on IP concerns | (blank if none) |
| **Y: audio_music_source** | Text | Original AI / Licensed / Silent | Original AI |
| **Z: audio_music_tool** | Text | If AI, which tool | ElevenLabs |
| **AA: audio_sound_design** | Text | Original AI / Licensed / None | Original AI |
| **AB: audio_voiceover** | Text | Own voice / AI / None | AI |
| **AC: tier2_enrollment** | Text | Yes full / Yes scenes / Not now | Yes full |
| **AD: tier2_scenes** | Text | If specific scenes, list them | (blank if full) |
| **AE: territory_preference** | Text | Global / APAC / Specific regions | Global |
| **AF: territory_restrictions** | Text | Any restricted territories | N |
| **AG: exclusivity_preference** | Text | Non-exclusive / Exclusive OK | Non-exclusive |
| **AH: video_file_url** | URL | Google Drive link or Vimeo/YouTube | vimeo.com/123456 |
| **AI: supporting_docs_folder** | URL | Google Drive folder with screenshots, docs | drive.google.com/folders/def456 |
| **AJ: reviewer** | Text | SI8 reviewer name (for future multi-person team) | JD |
| **AK: review_notes** | Text | Internal notes (not visible to filmmaker) | Clean pass on pre-screen |
| **AL: catalog_id** | Text | If approved: SI8-2026-0001 | (blank until approved) |
| **AM: chain_of_title_url** | URL | Link to generated Chain of Title PDF | (blank until approved) |
| **AN: last_updated** | Datetime | Last status change | 2026-03-02 10:15:30 |

**Total columns:** 40

---

### **Tools JSON Schema** (Column R)

Each tool = one object in array:

```json
{
  "tool": "Runway",
  "version": "Gen-3 Alpha",
  "plan_type": "Paid - Unlimited Plan",
  "commercial_confirmed": true,
  "receipt_filename": "runway-receipt-feb2026.pdf"
}
```

**Example for 3 tools:**
```json
[
  {
    "tool": "Runway",
    "version": "Gen-3 Alpha",
    "plan_type": "Paid - Unlimited Plan",
    "commercial_confirmed": true,
    "receipt_filename": "runway-receipt-feb2026.pdf"
  },
  {
    "tool": "ElevenLabs",
    "version": "Standard",
    "plan_type": "Paid - Creator Plan",
    "commercial_confirmed": true,
    "receipt_filename": "elevenlabs-receipt-feb2026.pdf"
  },
  {
    "tool": "Topaz Video AI",
    "version": "4.0",
    "plan_type": "Paid - Perpetual License",
    "commercial_confirmed": true,
    "receipt_filename": "topaz-license.pdf"
  }
]
```

---

## API Design

### **Endpoint 1: Submit Form**

**URL:** `POST /api/submit`
**Purpose:** Receive form data, upload files, write to Google Sheets, send emails

**Request Body (JSON):**
```json
{
  "filmmaker": {
    "name": "Alex Chen",
    "email": "alex@example.com",
    "location": "Singapore",
    "portfolio": "alexchen.com",
    "priorWorks": ["vimeo.com/123", "vimeo.com/456"],
    "firstSubmission": true
  },
  "production": {
    "title": "Neon Dreams",
    "runtime": "01:45",
    "genre": "Narrative short",
    "logline": "A cyberpunk noir set in 2080 Tokyo...",
    "intendedUse": "Both",
    "productionStart": "Jan 2026",
    "productionEnd": "Feb 2026",
    "existingAgreements": null
  },
  "tools": [
    {
      "tool": "Runway",
      "version": "Gen-3 Alpha",
      "planType": "Paid - Unlimited Plan",
      "commercialConfirmed": true,
      "receiptFile": "runway-receipt.pdf (base64 or file upload)"
    }
  ],
  "authorship": {
    "declaration": "I began by crafting detailed prompt sequences...",
    "wordCount": 187
  },
  "likeness": {
    "confirmed": true,
    "notes": null
  },
  "ip": {
    "confirmed": true,
    "notes": null
  },
  "audio": {
    "musicSource": "Original AI",
    "musicTool": "ElevenLabs",
    "soundDesign": "Original AI",
    "voiceover": "AI"
  },
  "tier2": {
    "enrollment": "Yes full",
    "scenes": null
  },
  "territory": {
    "preference": "Global",
    "restrictions": null,
    "exclusivity": "Non-exclusive"
  },
  "files": {
    "videoUrl": "vimeo.com/123456",
    "receipts": ["base64 or file upload array"],
    "supportingDocs": ["base64 or file upload array"]
  }
}
```

**Response (Success):**
```json
{
  "success": true,
  "submissionId": "SUB-2026-0001",
  "message": "Submission received successfully",
  "timestamp": "2026-03-01T14:23:15Z",
  "confirmationEmail": "Sent to alex@example.com"
}
```

**Response (Error):**
```json
{
  "success": false,
  "error": "Validation failed",
  "details": [
    "Section 4: Human authorship declaration must be at least 150 words (current: 87)",
    "Section 3: Receipt required for tool 'Runway'"
  ]
}
```

**Processing steps in `/api/submit.js`:**
1. Validate all required fields (server-side)
2. Check authorship declaration word count ≥ 150
3. Upload receipt files to Google Drive (create folder: `SUB-2026-0001-receipts/`)
4. Upload supporting docs to Google Drive (if any)
5. Generate submission ID: `SUB-2026-0001` (increment from last row)
6. Write new row to Google Sheets
7. Send confirmation email to filmmaker (Resend)
8. Send notification email to SI8 (Resend)
9. Return success response

---

### **Endpoint 2: Get Submission Status** (Future v0.2)

**URL:** `GET /api/submission/:id`
**Purpose:** Filmmaker checks submission status

**Response:**
```json
{
  "submissionId": "SUB-2026-0001",
  "status": "full review",
  "submittedDate": "2026-03-01",
  "lastUpdated": "2026-03-02",
  "estimatedCompletion": "2026-03-06"
}
```

---

## File Upload Architecture (Google Drive API)

### **Google Drive Setup:**

**Folder structure:**
```
SI8 Rights Verified Submissions/
├── SUB-2026-0001/
│   ├── receipts/
│   │   ├── runway-receipt-feb2026.pdf
│   │   ├── elevenlabs-receipt-feb2026.pdf
│   │   └── topaz-license.pdf
│   └── supporting-docs/
│       ├── prompt-screenshots.pdf
│       └── iteration-process.pdf
├── SUB-2026-0002/
│   └── receipts/
│       └── sora-receipt.pdf
└── SUB-2026-0003/
    └── receipts/
        └── pika-receipt.pdf
```

**Permissions:**
- SI8 Google account = owner (full access)
- Filmmaker = no access (files uploaded on their behalf)
- Buyer (future) = view-only link when licensing deal closes

### **API Integration (Node.js + Google Drive API v3):**

**Dependencies:**
```json
{
  "googleapis": "^120.0.0",
  "google-auth-library": "^9.0.0"
}
```

**Authentication:**
- Service account JSON key (stored as Vercel environment variable)
- Scope: `https://www.googleapis.com/auth/drive.file`

**Upload process:**
1. Filmmaker submits form with files
2. `/api/submit.js` receives files as base64 or multipart form-data
3. Create folder: `SUB-2026-0001`
4. Create subfolder: `receipts/`
5. Upload each receipt file to `receipts/` folder
6. Create subfolder: `supporting-docs/` (if any docs provided)
7. Upload supporting docs (if any)
8. Get shareable folder link (view-only)
9. Store folder URL in Google Sheets (Column S)

**Code snippet (simplified):**
```javascript
// /api/submit.js
import { google } from 'googleapis';

const drive = google.drive({ version: 'v3', auth: serviceAccount });

async function uploadReceipts(submissionId, receiptFiles) {
  // 1. Create submission folder
  const folderMetadata = {
    name: submissionId,
    mimeType: 'application/vnd.google-apps.folder',
    parents: ['SI8_SUBMISSIONS_FOLDER_ID'] // env variable
  };
  const folder = await drive.files.create({ resource: folderMetadata, fields: 'id' });

  // 2. Create receipts subfolder
  const receiptsFolder = await drive.files.create({
    resource: { name: 'receipts', mimeType: 'application/vnd.google-apps.folder', parents: [folder.data.id] },
    fields: 'id'
  });

  // 3. Upload each receipt
  for (const file of receiptFiles) {
    const fileMetadata = { name: file.name, parents: [receiptsFolder.data.id] };
    const media = { mimeType: file.type, body: file.buffer };
    await drive.files.create({ resource: fileMetadata, media: media, fields: 'id' });
  }

  // 4. Get shareable link
  await drive.permissions.create({
    fileId: folder.data.id,
    requestBody: { role: 'reader', type: 'anyone' }
  });
  const link = `https://drive.google.com/drive/folders/${folder.data.id}`;

  return link;
}
```

### **File Upload Limits:**
- Max file size: 50MB per file
- Max total upload: 200MB per submission
- Accepted types: PDF, JPG, PNG, MP4, MOV (receipts), any (supporting docs)
- Video files: Prefer links (Vimeo, YouTube, Google Drive) over uploads

---

## Email Integration (Resend)

### **Resend Setup:**
- API key stored in Vercel environment variable: `RESEND_API_KEY`
- From address: `noreply@superimmersive8.com`
- Reply-to: `jd@superimmersive8.com`

### **Email 1: Filmmaker Confirmation**

**Trigger:** Immediately after successful submit (within 5 minutes)
**To:** Filmmaker email (from form)
**From:** `noreply@superimmersive8.com`
**Reply-to:** `jd@superimmersive8.com`
**Subject:** `SI8 Rights Verified Submission Received — [Title]`

**Body (HTML + Plain Text):**
```html
<h2>Submission Received</h2>
<p>Hi [Filmmaker Name],</p>
<p>We've received your Rights Verified submission for "<strong>[Title]</strong>."</p>

<p><strong>Submission Details:</strong></p>
<ul>
  <li>Submission ID: <strong>[SUB-2026-0001]</strong></li>
  <li>Submitted: [Date/Time]</li>
  <li>Target completion: [Date + 5 business days]</li>
</ul>

<p><strong>What happens next:</strong></p>
<ol>
  <li>We'll begin our Rights Verified review within 2 business days</li>
  <li>You'll receive an update by <strong>[Date + 5 business days]</strong> with one of three outcomes:
    <ul>
      <li>✅ Approved — Chain of Title issued</li>
      <li>⏳ Approved pending additional info</li>
      <li>❌ Not approved with explanation</li>
    </ul>
  </li>
  <li>If approved, your work will be added to SI8's catalog</li>
</ol>

<p>Questions? Reply to this email and we'll get back to you within 24 hours.</p>

<p>Best,<br>SI8 Review Team</p>

<hr>
<p style="font-size: 12px; color: #666;">
This is an automated confirmation. Your submission has been logged and our team will review it shortly.
</p>
```

### **Email 2: SI8 Internal Notification**

**Trigger:** Immediately after successful submit (within 5 minutes)
**To:** `jd@superimmersive8.com`
**From:** `noreply@superimmersive8.com`
**Subject:** `🎬 New Rights Verified Submission: [Title] by [Filmmaker Name]`

**Body:**
```html
<h2>New Rights Verified Submission</h2>

<p><strong>Submission ID:</strong> SUB-2026-0001</p>
<p><strong>Filmmaker:</strong> [Name] ([Email])</p>
<p><strong>Title:</strong> [Title]</p>
<p><strong>Runtime:</strong> [Runtime]</p>
<p><strong>Intended use:</strong> [Catalog / Placement / Both]</p>

<p><strong>Quick links:</strong></p>
<ul>
  <li><a href="[Google Sheets row URL]">View full submission in Google Sheets</a></li>
  <li><a href="[Google Drive folder URL]">View receipts folder</a></li>
  <li><a href="[Video URL]">Watch video</a></li>
</ul>

<p><strong>Next step:</strong> Begin pre-screen review (target: within 2 business days)</p>

<hr>
<p><strong>Tools used:</strong></p>
<ul>
  <li>Runway Gen-3 Alpha (Paid - Unlimited Plan) ✅</li>
  <li>ElevenLabs (Paid - Creator Plan) ✅</li>
</ul>

<p><strong>Tier 2 enrollment:</strong> Yes (full film)</p>
<p><strong>First submission:</strong> Yes</p>
```

### **Code snippet (simplified):**
```javascript
// /api/submit.js
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

async function sendConfirmationEmails(submissionData) {
  // Email 1: Filmmaker confirmation
  await resend.emails.send({
    from: 'SI8 <noreply@superimmersive8.com>',
    replyTo: 'jd@superimmersive8.com',
    to: submissionData.filmmaker.email,
    subject: `SI8 Rights Verified Submission Received — ${submissionData.production.title}`,
    html: filmmakerEmailTemplate(submissionData)
  });

  // Email 2: SI8 internal notification
  await resend.emails.send({
    from: 'SI8 <noreply@superimmersive8.com>',
    to: 'jd@superimmersive8.com',
    subject: `🎬 New Rights Verified Submission: ${submissionData.production.title} by ${submissionData.filmmaker.name}`,
    html: internalEmailTemplate(submissionData)
  });
}
```

---

## Form Validation Rules

### **Client-Side Validation (JavaScript):**

Run on every field blur + before submit. Show real-time errors.

**Section 1: Filmmaker Profile**
- Name: Required, min 2 chars
- Email: Required, valid email format
- Location: Required
- Portfolio: Required, valid URL format
- First submission: Required (Y/N)

**Section 2: Production Overview**
- Title: Required, min 3 chars
- Runtime: Required, format `mm:ss`
- Genre: Required
- Logline: Required, min 20 chars
- Intended use: Required (radio buttons)
- Production dates: Required (month/year format)

**Section 3: Tool Disclosure**
- At least 1 tool required
- For each tool:
  - Tool name: Required
  - Version: Required
  - Plan type: Required
  - Commercial confirmed: Required (checkbox)
  - Receipt file: Required (one file per tool)

**Section 4: Human Authorship Declaration**
- Min 150 words (real-time word counter)
- Max 2,000 words (prevent abuse)
- Required

**Section 5: Likeness & Identity**
- All 4 checkboxes must be checked
- If "notes" field has content → flag for review

**Section 6: IP & Brand**
- All 3 checkboxes must be checked
- If "notes" field has content → flag for review

**Section 7: Audio & Music**
- Music source: Required (radio buttons)
- If "Licensed" selected → license doc upload required
- Sound design: Required (radio buttons)
- Voiceover: Required (radio buttons)

**Section 8: Tier 2 Enrollment**
- Required (radio buttons: Yes full / Yes scenes / Not now)
- If "Yes scenes" → scene list required (min 10 chars)

**Section 9: Territory & Exclusivity**
- Territory preference: Required (dropdown)
- Territory restrictions: Y/N required
- Exclusivity preference: Required (radio buttons)

**Section 10: Supporting Materials**
- Video URL or file: Required
- Receipt files: Required (at least 1, checked in Section 3)
- Supporting docs: Optional

**File Upload Validation:**
- File size: Max 50MB per file
- Total size: Max 200MB per submission
- File types:
  - Receipts: PDF, JPG, PNG only
  - Video: MP4, MOV only (or URL)
  - Supporting docs: Any

### **Server-Side Validation (Node.js):**

Run in `/api/submit.js` before writing to Google Sheets. Never trust client-side validation alone.

**Additional server-side checks:**
- Check authorship declaration word count server-side (in case client-side bypassed)
- Verify email format (regex)
- Verify URL formats (video, portfolio, Google Drive links)
- Check file sizes (reject if > 50MB per file)
- Check file types (reject if not allowed types)
- Sanitize all text inputs (prevent XSS, SQL injection even though using Google Sheets)
- Rate limiting: Max 5 submissions per email per day (prevent spam)

**Rate Limiting Logic:**
```javascript
// Check if email has submitted > 5 times today
const todaySubmissions = await sheets.values.get({
  spreadsheetId: SHEET_ID,
  range: 'Submissions!E:E' // Column E = filmmaker_email
});

const emailCount = todaySubmissions.data.values.filter(row => {
  return row[0] === email && isToday(row[1]); // Check if timestamp is today
}).length;

if (emailCount >= 5) {
  return res.status(429).json({ error: 'Rate limit exceeded. Max 5 submissions per day.' });
}
```

---

## Google Sheets API Integration

### **Authentication:**
- Service account JSON key (stored as Vercel environment variable: `GOOGLE_SERVICE_ACCOUNT_KEY`)
- Spreadsheet ID: `SHEET_ID` (environment variable)
- Sheet name: `Submissions`

### **Dependencies:**
```json
{
  "googleapis": "^120.0.0"
}
```

### **Write New Row (Append):**

```javascript
// /api/submit.js
import { google } from 'googleapis';

const sheets = google.sheets({ version: 'v4', auth: serviceAccount });

async function writeSubmission(data) {
  const submissionId = await generateSubmissionId(); // SUB-2026-0001

  const row = [
    submissionId,                           // A: submission_id
    new Date().toISOString(),               // B: timestamp
    'received',                             // C: status
    data.filmmaker.name,                    // D: filmmaker_name
    data.filmmaker.email,                   // E: filmmaker_email
    data.filmmaker.location,                // F: filmmaker_location
    data.filmmaker.portfolio,               // G: filmmaker_portfolio
    data.filmmaker.priorWorks.join(', '),   // H: prior_works
    data.filmmaker.firstSubmission ? 'Y' : 'N', // I: first_submission
    data.production.title,                  // J: title
    data.production.runtime,                // K: runtime
    data.production.genre,                  // L: genre
    data.production.logline,                // M: logline
    data.production.intendedUse,            // N: intended_use
    data.production.productionStart,        // O: production_start
    data.production.productionEnd,          // P: production_end
    data.production.existingAgreements || 'N', // Q: existing_agreements
    JSON.stringify(data.tools),             // R: tools_json
    data.files.receiptsFolderUrl,           // S: receipts_folder_url
    data.authorship.declaration,            // T: authorship_declaration
    data.likeness.confirmed ? 'Y' : 'N',    // U: likeness_confirmed
    data.likeness.notes || '',              // V: likeness_notes
    data.ip.confirmed ? 'Y' : 'N',          // W: ip_confirmed
    data.ip.notes || '',                    // X: ip_notes
    data.audio.musicSource,                 // Y: audio_music_source
    data.audio.musicTool || '',             // Z: audio_music_tool
    data.audio.soundDesign,                 // AA: audio_sound_design
    data.audio.voiceover,                   // AB: audio_voiceover
    data.tier2.enrollment,                  // AC: tier2_enrollment
    data.tier2.scenes || '',                // AD: tier2_scenes
    data.territory.preference,              // AE: territory_preference
    data.territory.restrictions || 'N',     // AF: territory_restrictions
    data.territory.exclusivity,             // AG: exclusivity_preference
    data.files.videoUrl,                    // AH: video_file_url
    data.files.supportingDocsFolderUrl || '', // AI: supporting_docs_folder
    'JD',                                   // AJ: reviewer (default for now)
    '',                                     // AK: review_notes (empty until review)
    '',                                     // AL: catalog_id (empty until approved)
    '',                                     // AM: chain_of_title_url (empty until approved)
    new Date().toISOString()                // AN: last_updated
  ];

  await sheets.spreadsheets.values.append({
    spreadsheetId: process.env.SHEET_ID,
    range: 'Submissions!A:AN',
    valueInputOption: 'USER_ENTERED',
    resource: { values: [row] }
  });

  return submissionId;
}

async function generateSubmissionId() {
  // Get last row to determine next ID number
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.SHEET_ID,
    range: 'Submissions!A:A'
  });

  const rows = response.data.values || [];
  const lastId = rows[rows.length - 1]?.[0] || 'SUB-2026-0000';
  const lastNumber = parseInt(lastId.split('-')[2]);
  const nextNumber = (lastNumber + 1).toString().padStart(4, '0');

  return `SUB-2026-${nextNumber}`;
}
```

---

## Security Considerations

### **1. Data Privacy (PII Protection)**
- Filmmaker email, name, location = PII
- Google Sheets access: Private (only SI8 service account)
- Google Drive files: Private folders (not publicly listable)
- No public access to submission data

### **2. File Upload Security**
- File type validation (reject .exe, .sh, .bat)
- File size limits (prevent DoS via large uploads)
- Antivirus scan: Not in v0.1 (add in v0.2 if needed)
- Store files in isolated Google Drive folders (not web-accessible)

### **3. API Security**
- HTTPS enforced (Vercel auto-SSL)
- CORS: Only allow `superimmersive8.com` origin
- Rate limiting: 5 submissions per email per day
- No public read access (future: add auth for filmmaker status checks)

### **4. Environment Variables (Secrets)**
```
RESEND_API_KEY=re_xxxxx
GOOGLE_SERVICE_ACCOUNT_KEY={ "type": "service_account", ... }
SHEET_ID=1aBcDeFgHiJkLmNoPqRsTuVwXyZ
GOOGLE_DRIVE_FOLDER_ID=1XyZaBcDeFgHiJkLmNoPqRsTuV
```

**Storage:** Vercel Environment Variables (encrypted, not in code)

### **5. Input Sanitization**
- All text inputs: Sanitize to prevent XSS
- URLs: Validate format before storing
- Files: Validate type and size server-side

---

## Deployment Architecture

### **Hosting:** Vercel

**Current setup:**
- Domain: `superimmersive8.com`
- GitHub repo: `aip-jd36/superimmersive8`
- Auto-deploy: Push to `main` branch → Vercel redeploys

**New files for web intake form:**
```
07_Website/
├── submit.html                  (NEW - form page)
├── submit.css                   (NEW - form styles)
├── submit.js                    (NEW - form logic, validation, file upload)
├── api/
│   └── submit.js                (NEW - serverless function)
└── confirmation.html            (NEW - success page)
```

**URL:** `superimmersive8.com/submit`

### **CI/CD Pipeline:**
1. Developer pushes code to GitHub (`main` branch)
2. Vercel detects push → triggers build
3. Vercel builds Next.js app (or static site)
4. Vercel deploys to production
5. Form live at `superimmersive8.com/submit`

**Build time:** ~2 minutes
**Rollback:** Vercel dashboard → click "Rollback" on previous deployment

---

## Environment Setup (Local Development)

### **Prerequisites:**
- Node.js 18+
- Git
- Vercel CLI (`npm i -g vercel`)
- Google Cloud Project (for Drive + Sheets API)

### **Local setup steps:**

1. **Clone repo:**
```bash
git clone https://github.com/aip-jd36/superimmersive8.git
cd superimmersive8
```

2. **Install dependencies:**
```bash
npm install googleapis google-auth-library resend
```

3. **Create `.env.local` file:**
```
RESEND_API_KEY=re_xxxxx
GOOGLE_SERVICE_ACCOUNT_KEY={ "type": "service_account", ... }
SHEET_ID=1aBcDeFgHiJkLmNoPqRsTuVwXyZ
GOOGLE_DRIVE_FOLDER_ID=1XyZaBcDeFgHiJkLmNoPqRsTuV
```

4. **Run locally:**
```bash
vercel dev
```

5. **Test form:**
- Open `http://localhost:3000/submit`
- Fill out form
- Check console logs for errors
- Verify row written to Google Sheets
- Verify email sent to test address

---

## Testing Plan (see TESTING.md for full plan)

### **Manual Testing Checklist:**
- [ ] Form loads on desktop (Chrome, Safari, Firefox)
- [ ] Form loads on mobile (iOS Safari, Chrome Android)
- [ ] All 10 sections render correctly
- [ ] Client-side validation shows errors
- [ ] Word counter updates in real-time (Section 4)
- [ ] File upload works (drag-and-drop + button)
- [ ] Submit button disabled until all required fields filled
- [ ] Submit works → redirects to confirmation page
- [ ] Row written to Google Sheets with correct data
- [ ] Files uploaded to Google Drive in correct folder structure
- [ ] Confirmation email received (filmmaker)
- [ ] Notification email received (SI8)
- [ ] Submission ID generated correctly (SUB-2026-0001)

### **Edge Case Testing:**
- [ ] Submit with 149 words (should fail validation)
- [ ] Submit with 151 words (should pass)
- [ ] Upload 51MB file (should fail)
- [ ] Upload 49MB file (should pass)
- [ ] Submit same email 6 times in one day (6th should fail rate limit)
- [ ] Submit with missing required field (should show error)

---

## Performance Targets

- **Page load:** <3 seconds on 4G mobile
- **Form submit:** <5 seconds (including file upload)
- **Email delivery:** <5 minutes after submit
- **Google Sheets write:** <2 seconds
- **Google Drive upload:** <10 seconds for 5 files @ 10MB each

---

## Migration Path (Year 3 Platform)

### **From Google Sheets to PostgreSQL:**

**v0.1-v0.2 (Year 1-2):** Google Sheets
- Free, unlimited rows
- Easy for SI8 to review (web UI)
- Good enough for <1,000 submissions

**v1.0+ (Year 2-3):** PostgreSQL
- Needed when: >1,000 submissions OR filmmaker accounts OR real-time status updates
- Migration: Export Google Sheets → Import to PostgreSQL
- Schema already designed for SQL (each column = table column)

**Why this works:**
- Google Sheets API responses = same structure as SQL query results
- Code changes minimal (swap `sheets.values.append()` with `db.query()`)
- Data schema identical (40 columns = 40 table columns)

---

## Open Questions (To Resolve Before Build)

1. **Google Drive folder permissions:** Should filmmakers have view-only access to their own submission folder? Or SI8-only?
   - **Recommendation:** SI8-only for v0.1 (simpler), add filmmaker access in v0.2

2. **Video file handling:** Require links only (no video uploads), or allow small video uploads (<50MB)?
   - **Recommendation:** Links only for v0.1 (faster), allow uploads in v0.2

3. **Multi-step form vs. single page:** Should form be one long page (all 10 sections visible) or multi-step wizard (one section per page)?
   - **Recommendation:** Single page for v0.1 (simpler to build), multi-step in v0.2 if abandonment rate high

4. **Save draft functionality:** v0.1 or defer to v0.2?
   - **Recommendation:** Defer to v0.2 (adds complexity, uses localStorage or database)

---

## Next Document: IMPLEMENTATION-PLAN.md

Now that stack is decided and architecture is defined, next step is:
- Break down build into phases (v0.1, v0.2, v0.3)
- Create granular task list with time estimates
- Identify dependencies (what blocks what)
- Set milestones and deadlines

**Ready to create IMPLEMENTATION-PLAN.md?**
