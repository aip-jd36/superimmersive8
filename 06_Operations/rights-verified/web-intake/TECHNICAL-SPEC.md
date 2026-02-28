# Technical Specification — Rights Verified Web Intake Form

**Version:** 2.0 (Airtable)
**Date:** February 28, 2026
**Status:** Final (stack decisions made)
**Target:** v0.1 MVP by March 15, 2026

---

## Stack Overview

| Layer | Technology | Why This Choice |
|-------|------------|-----------------|
| **Frontend** | Static HTML/CSS/JS | Simple, fast build, same as current website, no build step |
| **Storage** | Airtable | Free tier (1,000 records), built-in UI for reviews, API included, no auth complexity |
| **File Uploads** | Airtable Attachments + Video Links | Small files (receipts) in Airtable (1 GB free), videos as links (industry standard) |
| **Email** | Resend | Current SI8 email service, already integrated, $0/mo (100 emails/day free tier) |
| **Hosting** | Vercel | Current SI8 hosting, free tier, auto-deploy from GitHub, serverless functions |
| **API** | Vercel Serverless Functions | No backend server needed, same stack as current website |

**Cost:** $0/month (all free tiers)

**Why Airtable > Google Sheets:**
- ✅ No service account complexity (just API key)
- ✅ Built-in file attachments (no separate Drive API)
- ✅ Better UI for SI8 reviewers (forms, kanban, filters)
- ✅ Free tier: 1,000 records + 1 GB attachments (plenty for Year 1)
- ✅ API is simpler (REST, not Google's complex auth)
- ✅ Easy export to CSV/PostgreSQL later (Year 3 migration)

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
│  • File upload UI (receipts/docs)                            │
│  • Video link input (no video upload)                        │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ POST /api/submit
                       │
┌──────────────────────▼──────────────────────────────────────┐
│      Vercel Serverless Function (/api/submit.js)            │
│  • Server-side validation                                    │
│  • Convert files to base64 for Airtable                      │
│  • Create new record in Airtable                             │
│  • Send email notifications (Resend)                         │
│  • Return success + Submission ID                            │
└──────────────────────┬──────────────────────────────────────┘
                       │
           ┌───────────┼───────────┐
           │           │           │
           ▼           ▼           ▼
    ┌──────────┐  ┌────────┐  ┌───────────┐
    │ Airtable │  │Airtable│  │  Resend   │
    │ (Records)│  │(Files) │  │  Email    │
    │          │  │        │  │(Notify SI8│
    │          │  │        │  │+ Filmmaker│
    └──────────┘  └────────┘  └───────────┘
```

---

## Data Schema (Airtable)

### **Base:** "SI8 Rights Verified Submissions"

**Table 1: Submissions**

| Field Name | Field Type | Description | Example |
|------------|-----------|-------------|---------|
| **submission_id** | Single line text (auto-generated) | Unique ID: `SUB-2026-0001` | SUB-2026-0001 |
| **timestamp** | Date (created time) | Auto-generated on submit | 2026-03-01 14:23:15 |
| **status** | Single select | received / pre-screen / full review / pending info / approved / rejected | received |
| **filmmaker_name** | Single line text | Full name | Alex Chen |
| **filmmaker_email** | Email | Contact email | alex@example.com |
| **filmmaker_location** | Single line text | City, country | Singapore |
| **filmmaker_portfolio** | URL | Website/portfolio link | alexchen.com |
| **prior_works** | Long text | Links to 2-3 prior works | vimeo.com/123\nvimeo.com/456 |
| **first_submission** | Checkbox | First time submitting to SI8 | ✓ |
| **title** | Single line text | Work title | Neon Dreams |
| **runtime** | Single line text | mm:ss format | 01:45 |
| **genre** | Single line text | Genre/category | Narrative short |
| **logline** | Long text | 1-2 sentence description | A cyberpunk noir... |
| **intended_use** | Single select | Catalog / Placement / Both | Both |
| **production_start** | Single line text | Month/Year | Jan 2026 |
| **production_end** | Single line text | Month/Year | Feb 2026 |
| **existing_agreements** | Long text | Any existing licenses/festivals | None |
| **tools_json** | Long text (JSON) | Array of tools used (see schema below) | [{"tool":"Runway"...}] |
| **receipts** | Attachment | Tool receipts (PDFs, images) | runway.pdf, elevenlabs.pdf |
| **authorship_declaration** | Long text | Human authorship statement (min 150 words) | I began by crafting... |
| **likeness_confirmed** | Checkbox | No real person faces/voices | ✓ |
| **likeness_notes** | Long text | Any notes on likeness concerns | (blank if none) |
| **ip_confirmed** | Checkbox | No copyrighted IP imitation | ✓ |
| **ip_notes** | Long text | Any notes on IP concerns | (blank if none) |
| **audio_music_source** | Single select | Original AI / Licensed / Silent | Original AI |
| **audio_music_tool** | Single line text | If AI, which tool | ElevenLabs |
| **audio_sound_design** | Single select | Original AI / Licensed / None | Original AI |
| **audio_voiceover** | Single select | Own voice / AI / None | AI |
| **tier2_enrollment** | Single select | Yes full / Yes scenes / Not now | Yes full |
| **tier2_scenes** | Long text | If specific scenes, list them | (blank if full) |
| **territory_preference** | Single select | Global / APAC / Specific regions | Global |
| **territory_restrictions** | Long text | Any restricted territories | None |
| **exclusivity_preference** | Single select | Non-exclusive / Exclusive OK | Non-exclusive |
| **video_url** | URL | Google Drive/Vimeo/YouTube link | vimeo.com/123456 |
| **supporting_docs** | Attachment | Screenshots, process docs (optional) | process.pdf |
| **reviewer** | Single line text | SI8 reviewer name | JD |
| **review_notes** | Long text | Internal notes (not visible to filmmaker) | Clean pass on pre-screen |
| **catalog_id** | Single line text | If approved: SI8-2026-0001 | (blank until approved) |
| **chain_of_title_url** | URL | Link to generated Chain of Title PDF | (blank until approved) |
| **last_updated** | Last modified time | Auto-updated | 2026-03-02 10:15:30 |

**Total fields:** 39 (simplified from 40-column Google Sheets)

---

### **Tools JSON Schema** (tools_json field)

Each tool = one object in array:

```json
{
  "tool": "Runway",
  "version": "Gen-3 Alpha",
  "plan_type": "Paid - Unlimited Plan",
  "commercial_confirmed": true
}
```

**Example for 3 tools:**
```json
[
  {
    "tool": "Runway",
    "version": "Gen-3 Alpha",
    "plan_type": "Paid - Unlimited Plan",
    "commercial_confirmed": true
  },
  {
    "tool": "ElevenLabs",
    "version": "Standard",
    "plan_type": "Paid - Creator Plan",
    "commercial_confirmed": true
  },
  {
    "tool": "Topaz Video AI",
    "version": "4.0",
    "plan_type": "Paid - Perpetual License",
    "commercial_confirmed": true
  }
]
```

**Note:** Receipts are uploaded as attachments to the `receipts` field (not stored in JSON).

---

## API Design

### **Endpoint 1: Submit Form**

**URL:** `POST /api/submit`
**Purpose:** Receive form data, upload files to Airtable, send emails

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
      "commercialConfirmed": true
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
    "receipts": [
      { "name": "runway.pdf", "data": "base64..." },
      { "name": "elevenlabs.pdf", "data": "base64..." }
    ],
    "supportingDocs": [
      { "name": "process.pdf", "data": "base64..." }
    ]
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
3. Generate submission ID: `SUB-2026-0001` (query Airtable for last record, increment)
4. Convert receipt/doc files to Airtable attachment format
5. Create new record in Airtable (includes files as attachments)
6. Send confirmation email to filmmaker (Resend)
7. Send notification email to SI8 (Resend)
8. Return success response

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

## File Upload Architecture (Airtable Attachments + Video Links)

### **File Strategy:**

| File Type | Method | Size Limit | Storage |
|-----------|--------|------------|---------|
| **Receipts (PDFs, images)** | Upload to Airtable | 50 MB per file | Airtable (1 GB free) |
| **Supporting docs (PDFs, images)** | Upload to Airtable | 50 MB per file | Airtable (1 GB free) |
| **Videos** | **Link only** (no upload) | N/A | Filmmaker's Vimeo/YouTube/Drive |

**Why video links:**
- Videos are 50-500 MB → would quickly consume 1 GB Airtable limit
- Industry standard (festivals, agencies all require links)
- Faster for filmmakers (no waiting for large upload)
- Filmmakers already host videos on Vimeo/YouTube

**Free tier capacity:**
- Airtable: 1 GB attachments per base
- Receipts: ~500 KB each → 2,000 receipts = 1 GB
- Supporting docs: ~1-2 MB each → 500-1,000 docs = 1 GB
- **Estimate:** 1 GB = 200-400 submissions with receipts + docs

---

### **Airtable Attachment Format:**

Airtable accepts attachments in this format:

```json
{
  "fields": {
    "receipts": [
      {
        "url": "data:application/pdf;base64,JVBERi0xLjQKJeLjz9MK..."
      },
      {
        "url": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..."
      }
    ]
  }
}
```

**Upload process:**
1. Frontend: Filmmaker selects files (PDFs, images)
2. Frontend: Convert files to base64
3. Frontend: Send base64 data in JSON to `/api/submit`
4. Backend: Receive base64 data
5. Backend: Format as Airtable attachment objects
6. Backend: Include in Airtable record creation API call
7. Airtable: Stores files, generates URLs

**Alternative (simpler):**
- Use Airtable's file URL format (upload to temp storage first, send URLs)
- Or use multipart form-data and convert to base64 in backend

---

## Airtable API Integration

### **Authentication:**
- Airtable Personal Access Token (stored as Vercel environment variable: `AIRTABLE_API_KEY`)
- Base ID: `AIRTABLE_BASE_ID` (environment variable)
- Table name: `Submissions`

### **Dependencies:**
```json
{
  "airtable": "^0.12.2",
  "resend": "^3.0.0"
}
```

### **Create New Record:**

```javascript
// /api/submit.js
import Airtable from 'airtable';
import { Resend } from 'resend';

const airtable = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY });
const base = airtable.base(process.env.AIRTABLE_BASE_ID);

async function createSubmission(data) {
  const submissionId = await generateSubmissionId();

  const record = await base('Submissions').create([
    {
      fields: {
        submission_id: submissionId,
        status: 'received',
        filmmaker_name: data.filmmaker.name,
        filmmaker_email: data.filmmaker.email,
        filmmaker_location: data.filmmaker.location,
        filmmaker_portfolio: data.filmmaker.portfolio,
        prior_works: data.filmmaker.priorWorks.join('\n'),
        first_submission: data.filmmaker.firstSubmission,
        title: data.production.title,
        runtime: data.production.runtime,
        genre: data.production.genre,
        logline: data.production.logline,
        intended_use: data.production.intendedUse,
        production_start: data.production.productionStart,
        production_end: data.production.productionEnd,
        existing_agreements: data.production.existingAgreements || 'None',
        tools_json: JSON.stringify(data.tools),
        authorship_declaration: data.authorship.declaration,
        likeness_confirmed: data.likeness.confirmed,
        likeness_notes: data.likeness.notes || '',
        ip_confirmed: data.ip.confirmed,
        ip_notes: data.ip.notes || '',
        audio_music_source: data.audio.musicSource,
        audio_music_tool: data.audio.musicTool || '',
        audio_sound_design: data.audio.soundDesign,
        audio_voiceover: data.audio.voiceover,
        tier2_enrollment: data.tier2.enrollment,
        tier2_scenes: data.tier2.scenes || '',
        territory_preference: data.territory.preference,
        territory_restrictions: data.territory.restrictions || 'None',
        exclusivity_preference: data.territory.exclusivity,
        video_url: data.files.videoUrl,
        reviewer: 'JD',
        // Attachments (receipts, supporting docs)
        receipts: data.files.receipts.map(file => ({
          url: `data:${file.type};base64,${file.data}`
        })),
        supporting_docs: data.files.supportingDocs?.map(file => ({
          url: `data:${file.type};base64,${file.data}`
        })) || []
      }
    }
  ]);

  return { submissionId, recordId: record[0].id };
}

async function generateSubmissionId() {
  // Query last record to get next ID
  const records = await base('Submissions')
    .select({
      maxRecords: 1,
      sort: [{ field: 'timestamp', direction: 'desc' }]
    })
    .firstPage();

  if (records.length === 0) {
    return 'SUB-2026-0001';
  }

  const lastId = records[0].get('submission_id');
  const lastNumber = parseInt(lastId.split('-')[2]);
  const nextNumber = (lastNumber + 1).toString().padStart(4, '0');

  return `SUB-2026-${nextNumber}`;
}
```

---

## Email Integration (Resend)

### **Resend Setup:**
- API key stored in Vercel environment variable: `RESEND_API_KEY`
- From address: `noreply@superimmersive8.com`
- Reply-to: `jd@superimmersive8.com`

### **Email 1: Filmmaker Confirmation**

**Trigger:** Immediately after successful submit (within 5 minutes)
**To:** Filmmaker email (from form)
**Subject:** `SI8 Rights Verified Submission Received — [Title]`

**Body (HTML):**
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
  <li>You'll receive an update by <strong>[Date + 5 business days]</strong></li>
  <li>If approved, your work will be added to SI8's catalog</li>
</ol>

<p>Questions? Reply to this email.</p>

<p>Best,<br>SI8 Review Team</p>
```

### **Email 2: SI8 Internal Notification**

**To:** `jd@superimmersive8.com`
**Subject:** `🎬 New Rights Verified Submission: [Title] by [Filmmaker Name]`

**Body:**
```html
<h2>New Rights Verified Submission</h2>

<p><strong>Submission ID:</strong> SUB-2026-0001</p>
<p><strong>Filmmaker:</strong> [Name] ([Email])</p>
<p><strong>Title:</strong> [Title]</p>
<p><strong>Runtime:</strong> [Runtime]</p>

<p><strong>Quick links:</strong></p>
<ul>
  <li><a href="[Airtable record URL]">View submission in Airtable</a></li>
  <li><a href="[Video URL]">Watch video</a></li>
</ul>

<p><strong>Tools used:</strong></p>
<ul>
  <li>Runway Gen-3 Alpha (Paid - Unlimited Plan) ✅</li>
  <li>ElevenLabs (Paid - Creator Plan) ✅</li>
</ul>

<p><strong>Tier 2 enrollment:</strong> Yes (full film)</p>
```

---

## Form Validation Rules

### **Client-Side Validation (JavaScript):**

**Section 1: Filmmaker Profile**
- Name: Required, min 2 chars
- Email: Required, valid email format
- Location: Required
- Portfolio: Required, valid URL
- First submission: Required (checkbox)

**Section 2: Production Overview**
- Title: Required, min 3 chars
- Runtime: Required, format `mm:ss`
- Genre: Required
- Logline: Required, min 20 chars
- Intended use: Required (radio buttons)
- Production dates: Required (month/year)

**Section 3: Tool Disclosure**
- At least 1 tool required
- For each tool:
  - Tool name, version, plan type: Required
  - Commercial confirmed: Required (checkbox)
  - Receipt file: Required (one file per tool)

**Section 4: Human Authorship Declaration**
- Min 150 words (real-time word counter)
- Max 2,000 words
- Required

**Section 5-9:** (Same as before)

**Section 10: Supporting Materials**
- Video URL: Required (no file upload)
- URL format validation (Vimeo, YouTube, Google Drive, Dropbox)
- Receipts: Checked in Section 3
- Supporting docs: Optional

**File Upload Validation:**
- File size: Max 50 MB per file
- Total size: Max 200 MB per submission
- File types:
  - Receipts: PDF, JPG, PNG only
  - Supporting docs: PDF, JPG, PNG only
  - **Videos: Links only (no upload)**

---

## Security Considerations

### **1. Data Privacy (PII Protection)**
- Filmmaker email, name, location = PII
- Airtable access: Private (only SI8 API key)
- No public access to records

### **2. File Upload Security**
- File type validation (reject .exe, .sh, .bat)
- File size limits (prevent DoS)
- Max 200 MB per submission

### **3. API Security**
- HTTPS enforced (Vercel auto-SSL)
- CORS: Only allow `superimmersive8.com` origin
- Rate limiting: 5 submissions per email per day

### **4. Environment Variables (Secrets)**
```
RESEND_API_KEY=re_xxxxx
AIRTABLE_API_KEY=patXXXXXXXXXXXXXX
AIRTABLE_BASE_ID=appXXXXXXXXXXXXXX
```

**Storage:** Vercel Environment Variables (encrypted)

---

## Deployment Architecture

### **Hosting:** Vercel

**New files for web intake form:**
```
07_Website/
├── submit.html                  (NEW - form page)
├── submit.css                   (NEW - form styles)
├── submit.js                    (NEW - form logic, validation)
├── api/
│   └── submit.js                (NEW - serverless function)
└── confirmation.html            (NEW - success page)
```

**URL:** `superimmersive8.com/submit`

---

## Environment Setup (Local Development)

### **Prerequisites:**
- Node.js 18+
- Git
- Vercel CLI (`npm i -g vercel`)
- Airtable account (free tier)

### **Setup steps:**

1. **Create Airtable Base:**
   - Go to https://airtable.com/
   - Sign in to "SuperImmersive 8" workspace
   - Create new base: "SI8 Rights Verified Submissions"
   - Create table: "Submissions"
   - Add all 39 fields from schema above

2. **Get Airtable credentials:**
   - Go to https://airtable.com/create/tokens
   - Create Personal Access Token with:
     - Scopes: `data.records:read`, `data.records:write`
     - Access: "SI8 Rights Verified Submissions" base
   - Copy token: `patXXXXXXXXXXXXXX`
   - Copy Base ID from base URL: `appXXXXXXXXXXXXXX`

3. **Clone repo:**
```bash
git clone https://github.com/aip-jd36/superimmersive8.git
cd superimmersive8
```

4. **Install dependencies:**
```bash
npm install airtable resend
```

5. **Create `.env.local` file:**
```
RESEND_API_KEY=re_xxxxx
AIRTABLE_API_KEY=patXXXXXXXXXXXXXX
AIRTABLE_BASE_ID=appXXXXXXXXXXXXXX
```

6. **Run locally:**
```bash
vercel dev
```

7. **Test form:**
- Open `http://localhost:3000/submit`
- Fill out form
- Check Airtable for new record
- Verify emails sent

---

## Performance Targets

- **Page load:** <3 seconds on 4G mobile
- **Form submit:** <5 seconds (including file upload)
- **Email delivery:** <5 minutes after submit
- **Airtable write:** <2 seconds
- **File upload:** <5 seconds for 5 files @ 5 MB each

---

## Migration Path (Year 3 Platform)

### **From Airtable to PostgreSQL:**

**v0.1-v0.2 (Year 1-2):** Airtable
- Free tier: 1,000 records
- Easy for SI8 to review (web UI, forms, kanban)
- Good enough for <1,000 submissions

**v1.0+ (Year 2-3):** PostgreSQL
- Needed when: >1,000 submissions OR filmmaker accounts OR real-time features
- Migration: Export Airtable to CSV → Import to PostgreSQL
- Schema already compatible (Airtable fields → SQL columns)

**Why this works:**
- Airtable API responses = similar structure to SQL query results
- Code changes minimal (swap Airtable SDK with SQL queries)
- Data schema identical

---

## Cost Breakdown (Year 1)

| Service | Free Tier Limit | Year 1 Usage Estimate | Cost |
|---------|----------------|----------------------|------|
| **Airtable** | 1,000 records/base, 1 GB attachments | 200 submissions | $0 |
| **Resend** | 100 emails/day, 3,000/month | 400 emails (200 submissions × 2) | $0 |
| **Vercel** | 100 GB bandwidth, 100 serverless invocations/day | 200 submissions | $0 |
| **Total** | — | — | **$0/month** |

**When to upgrade:**
- Airtable: >1,000 submissions ($20/user/month)
- Resend: >3,000 emails/month ($20/month)
- Vercel: >100 GB bandwidth (unlikely)

**Year 1 estimate:** All free tiers sufficient

---

## Open Questions (Resolved)

1. ~~**Storage:** Airtable, Google Sheets, or PostgreSQL?~~
   - ✅ **Airtable** (simpler auth, built-in attachments, better UI)

2. ~~**File storage:** Google Drive API, Cloudflare R2, or Airtable?~~
   - ✅ **Airtable attachments** (receipts/docs) + **video links** (no upload)

3. ~~**Video uploads:** Allow uploads or links only?~~
   - ✅ **Links only** (industry standard, saves storage, faster)

4. **Multi-step form vs. single page:**
   - **Single page for v0.1** (simpler), multi-step in v0.2 if needed

5. **Save draft functionality:**
   - **Defer to v0.2** (adds complexity)

---

## Next Steps

**Planning complete. Ready to build:**

1. ✅ Stack finalized (Airtable + video links)
2. ✅ Schema defined (39 Airtable fields)
3. ✅ API design complete
4. ✅ File strategy finalized (attachments + links)
5. ⏳ **Next:** Create Airtable base and start Day 1 setup

**No Google Cloud needed. No service account keys. Just Airtable API key.**

---

**Last updated:** February 28, 2026
