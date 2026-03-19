# PRD: Admin Panel
## Review Queue, Approve/Reject, Rights Package Generation, Catalog Management

**Version:** 1.0
**Date:** March 2026
**Technical Architecture:** `08_Platform/architecture/TECHNICAL_ARCHITECTURE.md`
**Business Context:** BUSINESS_PLAN_v4.md (CaaS model, Gear A = verification service)

---

## Executive Summary

**Purpose:** Internal tool for JD (admin) to review creator submissions, approve/reject with notes, generate Rights Package PDFs, manage public catalog, and track licensing deals.

**User role:** Admin (JD only in Year 1, expandable to team in Year 2+)

**Core admin workflows:**
1. Review submission queue (pending/under review submissions)
2. Approve submission → Generate Rights Package PDF → Notify creator
3. Reject submission → Provide reason → Notify creator
4. Manage catalog (hide/show entries, edit metadata)
5. Track licensing deals (create manually, mark as paid, send payouts)

**Success metrics:**
- <5 business days average review time (target: 2-3 days)
- <5% submissions require "Needs Info" back-and-forth (clear submission form)
- 100% approved submissions have Rights Package PDF generated
- Zero unauthorized access (admin-only pages locked down)

---

## User Stories

### 1. Review Queue Dashboard

**As an admin, I want to:**
- See all pending submissions in one place
- Filter by status (Pending, Under Review, Needs Info)
- Sort by submission date (oldest first = highest priority)
- Click into a submission to review details

**Acceptance criteria:**
- [ ] Admin dashboard shows table of submissions:
  - Submission ID (clickable link)
  - Film Title
  - Creator Name (clickable to creator profile)
  - Status badge (Pending, Under Review, Needs Info, Approved, Rejected)
  - Submission Date
  - Payment Status (Paid, Unpaid)
  - Actions (Review, View Details)
- [ ] Filter dropdowns:
  - Status: All, Pending, Under Review, Needs Info, Approved, Rejected
  - Payment Status: All, Paid, Unpaid
- [ ] Sort options:
  - Submission Date (oldest first, newest first)
  - Creator Name (A-Z, Z-A)
- [ ] Pagination (50 submissions per page)
- [ ] Summary cards at top:
  - Total Submissions
  - Pending Review (Pending + Under Review + Needs Info)
  - Approved This Week
  - Rejected This Week
- [ ] Empty state: "No submissions pending review. Great work!"

---

### 2. Review Submission Details

**As an admin, I want to:**
- View all submission data in a structured, easy-to-scan format
- Download uploaded receipts and screenshots
- Check each section against Rights Verified criteria
- Add internal review notes

**Review Page Layout:**

```
┌─────────────────────────────────────────────────────────────┐
│  Review Submission: [Film Title]                             │
│  Status: [Pending ▼]  Payment: [Paid ✓]                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Creator: [John Doe] (email: john@example.com)              │
│  Submitted: Mar 18, 2026 at 3:45 PM                         │
│                                                              │
│  ──────────────────────────────────────────────────────────│
│                                                              │
│  1. Production Overview                                      │
│     Title: Neon Dreams                                       │
│     Runtime: 2:30                                            │
│     Genre: Commercial                                        │
│     Logline: A cyberpunk cityscape with neon lights...      │
│     Intended Use: ✓ Catalog Licensing  ✓ Custom Placement  │
│                                                              │
│  2. Tool Disclosure                                          │
│     [Table of tools]                                         │
│     Tool          Version    Plan    Dates        Receipt    │
│     Runway Gen-3  Alpha      Pro     Mar 1-5     [View PDF] │
│     Midjourney    v6         Plus    Feb 28-     [View PDF] │
│                                                              │
│     ✓ All receipts uploaded                                 │
│     ✓ All tools on Approved or Caution list                 │
│                                                              │
│  3. Human Authorship Declaration                             │
│     [Authorship statement text]                              │
│     Word count: 245 words ✓ (min 150 required)              │
│                                                              │
│  4. Likeness & Identity Confirmation                         │
│     ✓ No real person faces                                  │
│     ✓ No real person voices                                 │
│     ✓ No lookalikes or impersonation                        │
│     ✓ No synthetic versions of real people                  │
│                                                              │
│  5. IP & Brand Confirmation                                  │
│     ✓ No copyrighted characters                             │
│     ✓ No brand imitation                                    │
│     ✓ No trademarked IP                                     │
│                                                              │
│  6. Audio & Music Disclosure                                 │
│     Audio Source: AI-generated (original)                    │
│     Documentation: N/A                                       │
│                                                              │
│  7. Modification Rights                                      │
│     Authorization: Yes, full work                            │
│     Scope: Creator authorizes brand-integrated versions     │
│                                                              │
│  8. Territory & Exclusivity                                  │
│     Territory: Global                                        │
│     Existing Restrictions: None                              │
│                                                              │
│  9. Supporting Materials                                     │
│     Receipts: [View All] (3 files)                          │
│     Process Screenshots: [View All] (5 files)               │
│                                                              │
│  ──────────────────────────────────────────────────────────│
│                                                              │
│  Internal Review Notes (not visible to creator)              │
│  [_______________________________________________]           │
│  [_______________________________________________]           │
│                                                              │
│  ──────────────────────────────────────────────────────────│
│                                                              │
│  Actions:                                                    │
│  [Approve & Generate Rights Package]  [Reject]  [Need Info]│
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Acceptance criteria:**
- [ ] All submission data displayed in scannable format (sections 1-9)
- [ ] Receipt links open in new tab (or download)
- [ ] Checklist items clearly marked (✓ or ✗)
- [ ] Tools validated against Approved/Caution/Prohibited lists (auto-highlighted if Prohibited tool detected)
- [ ] Word count validation for authorship statement (min 150 words)
- [ ] Internal notes field (autosaves as admin types)
- [ ] Three action buttons: Approve, Reject, Request More Info

---

### 3. Approve Submission & Generate Rights Package

**As an admin, I want to:**
- Approve a submission with one click
- Auto-generate a 9-field Rights Package PDF
- Notify the creator immediately via email
- Prompt creator to opt into catalog

**Approval Flow:**
1. Admin clicks "Approve & Generate Rights Package" button
2. Confirmation modal:
   - "Are you sure? This will generate the Rights Package PDF and notify the creator."
   - Dropdown: Risk Tier (Certified, Standard)
   - [ ] Checkbox: "I have reviewed all materials and confirm this submission passes Rights Verified criteria"
   - [Confirm Approval] [Cancel]
3. After confirmation:
   - Submission status → "approved"
   - Rights Package PDF generated (API call to `/api/admin/rights-packages/generate`)
   - PDF uploaded to Supabase Storage (`rights-packages/` bucket)
   - Catalog ID assigned (`SI8-2026-0001` format)
   - Email sent to creator: "Congratulations! Your submission has been approved. [Download Rights Package] [Opt Into Catalog]"
   - Admin redirected to Rights Package preview page

**Rights Package PDF Structure (9 Fields):**

Generated from submission data + admin inputs:

1. **Tool Provenance Log:** Table of tools with versions, plans, receipts on file
2. **Model Disclosure:** AI models used (extracted from tool names)
3. **Rights Verified Sign-off:** "Reviewed by [Admin Name] on [Date]. Risk Tier: [Certified/Standard]. No conditions."
4. **Commercial Use Authorization:** "All tools used under commercial plans. Receipts on file. Authorized for commercial use."
5. **Modification Rights Status:** "Authorized: Full work" (or "Scene-level only" or "Not authorized")
6. **Category Conflict Log:** "None" (or list of restricted categories)
7. **Territory Log:** "Global" (or specific territories)
8. **Regeneration Rights Status:** "Authorized. Original project files archived." (or "Not authorized")
9. **Version History:** "v1.0 — Original submission approved [Date]"

**PDF footer:** Catalog ID: SI8-2026-0001 | superimmersive8.com/catalog/SI8-2026-0001

**Acceptance criteria:**
- [ ] Approval modal with risk tier dropdown
- [ ] PDF generation API endpoint (`/api/admin/rights-packages/generate`)
- [ ] PDF template with 9-field structure (Puppeteer or @react-pdf/renderer)
- [ ] PDF uploaded to Supabase Storage
- [ ] `rights_packages` table record created with PDF URL and catalog ID
- [ ] Email notification sent to creator with PDF download link + opt-in CTA
- [ ] Admin can preview PDF before creator download
- [ ] Audit log entry: "Admin [Name] approved submission [ID]"

---

### 4. Reject Submission with Reason

**As an admin, I want to:**
- Reject a submission that fails Rights Verified criteria
- Provide clear reason so creator knows what to fix
- Notify creator immediately
- Allow creator to resubmit (no additional payment required)

**Rejection Flow:**
1. Admin clicks "Reject" button
2. Modal opens:
   - "Why is this submission being rejected?"
   - Checkboxes (select all that apply):
     - [ ] Prohibited tool used (specify: _____)
     - [ ] Insufficient human authorship evidence
     - [ ] Real person likeness detected
     - [ ] Copyrighted character or brand imitation
     - [ ] Unlicensed music/audio
     - [ ] Missing or invalid receipts
     - [ ] Other (specify: _____)
   - Text area: "Additional details for creator (optional)"
   - [Confirm Rejection] [Cancel]
3. After confirmation:
   - Submission status → "rejected"
   - Email sent to creator: "Your submission did not pass Rights Verified review. Reason: [reasons]. You can resubmit with corrections at no additional cost."
   - Admin redirected back to review queue

**Acceptance criteria:**
- [ ] Rejection modal with reason checkboxes + text area
- [ ] Email notification sent to creator with rejection reasons
- [ ] Creator can edit submission and resubmit (no new payment required)
- [ ] Audit log entry: "Admin [Name] rejected submission [ID]. Reason: [reasons]"

---

### 5. Request More Info

**As an admin, I want to:**
- Request additional documentation without rejecting submission
- Specify exactly what's needed
- Pause review until creator provides info

**Request Info Flow:**
1. Admin clicks "Request More Info" button
2. Modal opens:
   - "What additional information do you need?"
   - Text area (required): "Please provide: [describe what's missing]"
   - [Send Request] [Cancel]
3. After sending:
   - Submission status → "needs_info"
   - Email sent to creator: "We need additional information for your submission. Please provide: [details]. You have 14 days to respond."
   - Submission stays in review queue with "Needs Info" badge
4. Creator uploads additional files or updates submission
5. Creator clicks "Resubmit for Review"
6. Submission status → "under_review" (back in admin queue)

**Acceptance criteria:**
- [ ] Request info modal with text area (required field)
- [ ] Email notification sent to creator
- [ ] Creator dashboard shows "Needs Info" status with admin's request
- [ ] Creator can upload additional files or edit submission
- [ ] After resubmission, admin is notified ("Submission [ID] updated and ready for re-review")
- [ ] 14-day countdown timer (after 14 days, submission auto-expires → creator must pay again)

---

### 6. Manage Catalog

**As an admin, I want to:**
- See all catalog entries (opted-in submissions)
- Hide/show entries without deleting opt-in record
- Edit catalog metadata (description, tags, thumbnail)
- Reorder catalog entries (featured vs. regular)

**Catalog Management Page:**

```
┌─────────────────────────────────────────────────────────────┐
│  Catalog Management                            [+ Add Entry] │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  [Search by title or creator...]           [Filter: All ▼]  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Thumbnail  Title          Creator   Status   Actions │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │ [IMG]      Neon Dreams    John Doe  Visible  [Edit]  │  │
│  │                                             [Hide]   │  │
│  │ [IMG]      Time Passing   Jane S.   Hidden   [Edit]  │  │
│  │                                             [Show]   │  │
│  │ [IMG]      Cyberpunk      Mike L.   Visible  [Edit]  │  │
│  │            City                              [Hide]   │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  Total Entries: 23 | Visible: 20 | Hidden: 3                │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Edit Catalog Entry Modal:**
- Film Title (read-only)
- Creator Name (read-only)
- Catalog Description (editable textarea, max 500 chars)
- Tags (editable, comma-separated)
- Thumbnail Image (upload new or keep existing)
- Video URL (editable, YouTube/Vimeo embed)
- Featured (checkbox: show at top of catalog)

**Acceptance criteria:**
- [ ] Catalog management page lists all opt-ins
- [ ] Search by title or creator name (real-time filter)
- [ ] Filter by status (Visible, Hidden, All)
- [ ] Hide/Show toggle (updates `visible` column in `opt_ins` table, doesn't delete record)
- [ ] Edit modal for catalog metadata
- [ ] Thumbnail upload (replaces existing, saved to `catalog-thumbnails/` bucket)
- [ ] Featured flag (prioritizes entry in public catalog sorting)
- [ ] Audit log: "Admin [Name] hid catalog entry [ID]" or "edited metadata"

---

### 7. Track & Manage Licensing Deals

**As an admin, I want to:**
- See all licensing deals (negotiating, signed, completed)
- Create new deal manually (buyer requests licensing)
- Mark deal as paid (after buyer pays SI8)
- Track creator payouts (80% to creator, 20% to SI8)
- Send payout notification to creator

**Licensing Deals Page:**

```
┌─────────────────────────────────────────────────────────────┐
│  Licensing Deals                          [+ Create New Deal]│
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  [Filter: All Statuses ▼]  [Sort: Date ▼]                   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Film          Buyer      Deal    SI8    Creator Status │ │
│  │ Title         Name       Value   (20%)  (80%)        │ │
│  ├──────────────────────────────────────────────────────┤  │
│  │ Neon Dreams   ABC Inc.   $5K     $1K    $4K   Paid    │ │
│  │ Time Passing  XYZ Ltd.   $3K     $600   $2.4K Negotia │ │
│  │ Cyberpunk     DEF Corp.  $10K    $2K    $8K   Signed  │ │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  Summary:                                                    │
│  Total GMV: $18K | SI8 Revenue: $3.6K | Creator Payouts: $│
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Create New Deal Flow:**
1. Admin clicks "+ Create New Deal"
2. Form modal:
   - Film (dropdown: all catalog entries)
   - Buyer Name (text input)
   - Buyer Email (text input)
   - Buyer Company (text input, optional)
   - License Type (dropdown: Editorial, Non-Exclusive Commercial, Category-Exclusive, Fully Exclusive)
   - Territory (text input, default: Global)
   - Duration (number input, months, or "Perpetual" checkbox)
   - Deal Value (currency input, e.g., $5,000)
   - **Auto-calculated:** SI8 Commission (20%), Creator Payout (80%)
   - [Create Deal]
3. After creation:
   - Deal record created in `licensing_deals` table
   - Status: "negotiating"
   - Email sent to creator: "Good news! A buyer has requested licensing for your film. Proposed deal: $[amount]. View details in your dashboard."
4. Admin manually updates status:
   - "signed" (contract signed by buyer)
   - "paid" (buyer paid SI8)
   - "completed" (creator paid out)

**Acceptance criteria:**
- [ ] Licensing deals table with all deals
- [ ] Filter by status (All, Negotiating, Signed, Paid, Completed)
- [ ] Sort by date, deal value, status
- [ ] Create deal form with auto-calculated commission split
- [ ] Email notification to creator when deal is created
- [ ] Manual status updates (admin changes status in dropdown, saved to database)
- [ ] Mark as "paid" button → sends payout notification to creator
- [ ] Audit log: "Admin [Name] created deal [ID] for $[amount]"

---

## UI/UX Design Specs

### Admin Navigation

```
┌─────────────────────────────────────────────────────────────┐
│  SI8 Admin    Review Queue   Catalog   Deals   Users   [JD] │
└─────────────────────────────────────────────────────────────┘
```

**Admin Role Badge:** Red "ADMIN" badge visible on all admin pages (visual indicator of elevated permissions)

---

### Review Queue Dashboard

**Filter bar:**
```
[Status: All ▼]  [Payment: Paid ▼]  [Sort: Oldest First ▼]  [Search: ...]
```

**Submissions table:**
- Hover row → highlight (helps scan long lists)
- Status badges color-coded (Pending = gray, Approved = green, Rejected = red)
- Payment status icon ($ = paid, ⏳ = pending)

---

## Technical Implementation

### Admin Authentication & Authorization

**Role-based access control (RLS):**

```sql
-- Admin-only policy for submissions table
CREATE POLICY "Admins can view all submissions"
  ON submissions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_id = auth.uid()
      AND users.role = 'admin'
    )
  );
```

**Next.js middleware (protect admin routes):**

```typescript
// middleware.ts
export async function middleware(req: NextRequest) {
  const supabase = createMiddlewareClient({ req, res })
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(new URL('/auth/login', req.url))
  }

  // Check if user is admin
  const { data: userRecord } = await supabase
    .from('users')
    .select('role')
    .eq('auth_id', user.id)
    .single()

  if (userRecord?.role !== 'admin') {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*']
}
```

---

### Rights Package PDF Generation

**Using Puppeteer (server-side rendering):**

```typescript
// /api/admin/rights-packages/generate

import puppeteer from 'puppeteer'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: Request) {
  const { submissionId } = await req.json()

  // Fetch submission data
  const supabase = createClient(...)
  const { data: submission } = await supabase
    .from('submissions')
    .select('*, users(*)')
    .eq('id', submissionId)
    .single()

  // Generate catalog ID
  const catalogId = await generateCatalogId() // SI8-2026-0001

  // Render HTML template
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        /* PDF styling */
        body { font-family: Arial; }
        h1 { color: #333; }
        table { width: 100%; border-collapse: collapse; }
        td, th { border: 1px solid #ddd; padding: 8px; }
      </style>
    </head>
    <body>
      <h1>Rights Package: ${submission.title}</h1>
      <p>Catalog ID: ${catalogId}</p>

      <h2>1. Tool Provenance Log</h2>
      <table>
        <tr><th>Tool</th><th>Version</th><th>Plan</th><th>Receipt</th></tr>
        ${submission.tools_used.map(tool => `
          <tr>
            <td>${tool.tool}</td>
            <td>${tool.version}</td>
            <td>${tool.plan_type}</td>
            <td>On file</td>
          </tr>
        `).join('')}
      </table>

      <!-- Other 8 fields -->

      <hr>
      <p>superimmersive8.com/catalog/${catalogId}</p>
    </body>
    </html>
  `

  // Generate PDF with Puppeteer
  const browser = await puppeteer.launch()
  const page = await browser.newPage()
  await page.setContent(html)
  const pdfBuffer = await page.pdf({ format: 'A4' })
  await browser.close()

  // Upload to Supabase Storage
  const fileName = `rights-package-${catalogId}.pdf`
  const { data: uploadData } = await supabase.storage
    .from('rights-packages')
    .upload(`${submissionId}/${fileName}`, pdfBuffer)

  // Create rights_package record
  await supabase.from('rights_packages').insert({
    submission_id: submissionId,
    user_id: submission.user_id,
    catalog_id: catalogId,
    pdf_url: uploadData.path,
    pdf_generated_at: new Date().toISOString(),
    // ... other 9 fields populated from submission data
  })

  // Update submission status
  await supabase
    .from('submissions')
    .update({ status: 'approved', reviewed_at: new Date().toISOString() })
    .eq('id', submissionId)

  // Send email notification
  await sendEmail({
    to: submission.users.email,
    template: 'submission_approved',
    data: { catalogId, pdfUrl: uploadData.path }
  })

  return Response.json({ success: true, catalogId, pdfUrl: uploadData.path })
}
```

---

### Email Notifications

**Approval email (SendGrid template):**

```html
<h2>Congratulations! Your submission has been approved.</h2>

<p>Film Title: {{ filmTitle }}</p>
<p>Catalog ID: {{ catalogId }}</p>

<p>
  <a href="{{ pdfDownloadUrl }}">Download Your Rights Package (PDF)</a>
</p>

<p>
  Would you like to list this film in our catalog for licensing opportunities?
  You'll earn 80% of any licensing deals.
</p>

<p>
  <a href="{{ optInUrl }}">Opt Into Catalog</a>
</p>
```

---

## API Endpoints

### Admin Panel Endpoints

```
GET    /api/admin/submissions           Get all submissions (paginated, filterable)
GET    /api/admin/submissions/[id]      Get single submission with full details
PATCH  /api/admin/submissions/[id]      Update submission (status, notes, reviewer)

POST   /api/admin/rights-packages/generate  Generate Rights Package PDF
GET    /api/admin/rights-packages/[id]      Preview Rights Package before creator download

GET    /api/admin/catalog               Get all catalog entries
PATCH  /api/admin/catalog/[id]          Update catalog entry (description, tags, visibility)

GET    /api/admin/deals                 Get all licensing deals
POST   /api/admin/deals/create          Create new licensing deal manually
PATCH  /api/admin/deals/[id]            Update deal status (negotiating → signed → paid)

GET    /api/admin/audit-log             Get admin action audit log
GET    /api/admin/analytics             Get platform analytics (submissions, earnings, etc.)
```

---

## Testing Plan

### Unit Tests

- [ ] Catalog ID generation (correct format: SI8-YYYY-####)
- [ ] PDF generation (all 9 fields populated correctly)
- [ ] Commission calculation (20% to SI8, 80% to creator)
- [ ] Date formatting (submission dates, review dates)

### Integration Tests (Playwright)

- [ ] End-to-end approval flow (review → approve → PDF generated → email sent)
- [ ] End-to-end rejection flow (review → reject with reason → email sent)
- [ ] Catalog management (hide entry → verify not visible on public catalog)
- [ ] Deal creation (create deal → email sent to creator → deal visible in creator dashboard)

### Manual QA Checklist

- [ ] Admin-only access (non-admin users redirected from /admin routes)
- [ ] Review queue sorts correctly (oldest first, newest first)
- [ ] PDF downloads work (Rights Package opens in browser, no errors)
- [ ] Email notifications sent (approval, rejection, deal created)
- [ ] Catalog visibility toggle (hide/show reflects on public catalog)

---

## Security Considerations

### 1. Admin-Only Access
- **Middleware protection:** All `/admin/*` routes protected by role check
- **RLS policies:** Admin role bypasses creator restrictions in database
- **Audit logging:** All admin actions logged (who, what, when)

### 2. File Access
- **Rights Package PDFs:** Only admin + creator who owns submission can download
- **Receipts:** Only admin can view uploaded receipts (creators can't see each other's receipts)

### 3. Payment Tracking
- **Stripe payment verification:** Admin can't mark submission as "paid" unless Stripe payment_intent_id exists
- **Manual override:** Admin can force-approve unpaid submissions (for testing or special cases), but action is logged

---

## Performance Optimization

### 1. Pagination
- Review queue paginated (50 submissions per page)
- Catalog management paginated (50 entries per page)
- Deals list paginated (50 deals per page)

### 2. Caching
- Submissions list cached (invalidated when new submission arrives)
- Catalog list cached (invalidated when admin edits entry)

### 3. PDF Generation
- PDF generation can take 5-10 seconds (Puppeteer rendering)
- Show loading spinner: "Generating Rights Package... This may take a few moments."
- Consider moving to background job (Supabase Edge Function) if >10 seconds

---

## Success Metrics

### Quantitative

- **Review turnaround time:** <5 business days (target: 2-3 days)
- **Approval rate:** >70% of paid submissions approved
- **"Needs Info" rate:** <5% of submissions (indicates clear submission form)
- **PDF generation success rate:** 100% (no errors)
- **Admin time per review:** <90 minutes (target from Business Plan v4)

### Qualitative

- Admin reports review process is "efficient and clear" (internal feedback)
- Creators report Rights Package PDFs are "professional and useful" (creator feedback)
- Zero unauthorized access incidents (admin-only pages locked down)

---

## Open Questions

1. **Multi-admin support:** Should we build multi-admin from day one (assign reviewers, track who reviewed what)?
   - **Resolution:** Year 1 = single admin (JD). Year 2 = add reviewer assignment feature.

2. **PDF template customization:** Should admin be able to edit PDF template or is it fixed?
   - **Resolution:** Year 1 = fixed template. Year 2 = allow admin to customize footer text.

3. **Bulk actions:** Should admin be able to approve/reject multiple submissions at once?
   - **Resolution:** Year 1 = one at a time. Year 2 = add bulk actions if volume requires.

4. **Mobile admin panel:** Does admin need mobile access?
   - **Resolution:** Desktop-first (review requires large screen for receipts/details). Mobile = read-only view.

---

## Launch Checklist

**Pre-launch (Week 4):**
- [ ] All admin features implemented and tested
- [ ] PDF generation working (test with 5 sample submissions)
- [ ] Email notifications working (test approval, rejection, deal created)
- [ ] Admin authentication locked down (non-admins redirected)
- [ ] Audit log tracking all admin actions

**Launch (Week 5):**
- [ ] Deploy to production with Creator Portal
- [ ] JD (admin) onboarding: walkthrough of review flow, catalog management, deal creation
- [ ] Monitor first 10 submissions (ensure review process works smoothly)

**Post-launch (Week 6):**
- [ ] Collect admin feedback (what's clunky, what's missing)
- [ ] Optimize review workflow based on real usage
- [ ] Document common edge cases (add to Rights Verified EDGE-CASES.md)

---

**Document Status:** ✅ Complete — Ready for implementation
**Next:** `08_Platform/prds/PRD_PUBLIC_CATALOG.md`
