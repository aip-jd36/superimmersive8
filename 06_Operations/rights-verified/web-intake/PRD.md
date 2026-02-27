# Product Requirements Document — Rights Verified Web Intake Form

**Version:** 1.0 (Draft)
**Date:** February 27, 2026
**Author:** SI8 Operations
**Status:** Planning phase
**Target release:** v0.1 MVP by March 15, 2026

---

## Executive Summary

Build a web-based intake form that allows filmmakers to submit AI-generated work for SI8's Rights Verified review. This replaces manual email/PDF submissions with an automated, structured system that:
1. Captures all required submission data in a queryable format
2. Notifies SI8 team instantly when submissions arrive
3. Provides filmmakers with status tracking and automated updates
4. Prepares SI8 for Year 3 platform transition (same form becomes self-serve platform intake)

**Success = First filmmaker submits via web form Week 2, SI8 receives structured data, both parties get automated emails.**

---

## Problem Statement

### Current State (Manual Process):
- Filmmakers email submissions → SI8 manually parses unstructured data
- PDF forms → not mobile-friendly, data lives in PDFs (not queryable)
- No submission tracking → filmmaker doesn't know status
- Email templates sent manually → slow, inconsistent
- Receipts/files scattered across email threads

### Pain Points:
**For filmmakers:**
- Unclear what SI8 needs
- No way to track submission status
- Manual email = feels informal

**For SI8:**
- Time spent parsing email submissions (30+ min per submission)
- Data not structured = can't report metrics (approval rate, average review time)
- Risk of missing required fields
- Manual email notifications = human error

---

## Goals & Non-Goals

### Goals (v0.1 MVP):
✅ Filmmakers can complete full submission via web form (10 sections)
✅ All submissions stored as structured data (not PDFs/emails)
✅ SI8 notified instantly when submission received
✅ Filmmaker receives automated confirmation email
✅ Mobile-responsive (50%+ filmmakers use mobile)
✅ File uploads work (receipts, videos)

### Non-Goals (v0.1):
❌ Save & resume functionality (added in v0.2)
❌ Admin dashboard for SI8 reviewers (added in v0.2)
❌ Automated Chain of Title generation (added in v0.3)
❌ Payment processing (not needed until paid catalog)
❌ Multi-language support (English only for v0.1)

---

## User Personas

### Primary: **Alex, the AI Filmmaker**
- **Age:** 28-40
- **Location:** Global (English-speaking)
- **Tech savvy:** High (uses AI tools daily)
- **Device:** 60% desktop, 40% mobile
- **Pain:** Wants professional representation but unsure about legal rights
- **Motivation:** Get work into commercial licensing without legal risk
- **Quote:** "I make great AI films but have no idea if they're legally safe to license. I need someone to vet them."

### Secondary: **Jamie, the SI8 Reviewer**
- **Role:** SI8 internal reviewer (solo founder for now)
- **Tech savvy:** High
- **Pain:** Manually parsing email submissions takes 30+ min
- **Motivation:** Structured data = faster reviews, better metrics
- **Quote:** "I need to see all submission fields in one place, not scattered across emails."

---

## User Stories

### For Filmmakers:

**Submission:**
- As a filmmaker, I want to submit my work via a web form so I don't have to email PDFs
- As a filmmaker, I want clear instructions for each field so I know exactly what SI8 needs
- As a filmmaker, I want to upload receipts/files directly so they don't get lost in email
- As a filmmaker, I want to receive instant confirmation so I know my submission was received
- As a filmmaker, I want to submit from my phone so I don't need to wait until I'm at my desktop

**Validation & Help:**
- As a filmmaker, I want real-time validation errors so I can fix mistakes before submitting
- As a filmmaker, I want character counts on text fields so I know if I've written enough
- As a filmmaker, I want tooltips/help text so I understand complex fields (like "human authorship declaration")

**Status & Updates:**
- As a filmmaker, I want to know when my submission is being reviewed so I'm not waiting in limbo
- As a filmmaker, I want email updates when my status changes (received → in review → decision)

### For SI8 (Internal):

**Submission Management:**
- As an SI8 reviewer, I want instant notification when a submission arrives so I can start review quickly
- As an SI8 reviewer, I want all submission data in one structured view so I don't have to hunt through emails
- As an SI8 reviewer, I want file uploads automatically organized so I can find receipts/videos easily

**Tracking & Metrics:**
- As an SI8 reviewer, I want to track submission status (received / pre-screen / full review / approved / rejected) so I can manage pipeline
- As an SI8 reviewer, I want to see metrics (submissions per week, approval rate, avg review time) so I can improve the process

---

## Functional Requirements

### Core Features (v0.1 MVP):

#### 1. **Submission Form (Public-Facing)**

**10 Sections** (maps 1:1 to SUBMISSION-REQUIREMENTS.md):
1. **Filmmaker Profile** — Name, location, email, portfolio links
2. **Production Overview** — Title, runtime, genre, logline, intended use
3. **Tool Disclosure** — Table with one row per AI tool (name, version, plan type, receipt upload)
4. **Human Authorship Declaration** — Long-form text field (min 150 words, character counter)
5. **Likeness & Identity Confirmation** — Checkboxes + conditional text field
6. **IP & Brand Confirmation** — Checkboxes + conditional text field
7. **Audio & Music Disclosure** — Radio buttons + conditional file upload
8. **Tier 2 Enrollment** — Radio buttons (Yes full / Yes specific scenes / Not now)
9. **Territory & Exclusivity** — Dropdowns + text fields
10. **Supporting Materials** — File upload for receipts, video link or upload

**Form UX:**
- Single-page form (all sections visible, no multi-step wizard for v0.1)
- Sticky progress indicator (shows which sections are complete)
- Required field indicators (red asterisk)
- Real-time validation (client-side)
- Character counter for text fields with minimums
- File upload with drag-and-drop support
- "Save draft" functionality (deferred to v0.2)

**Validation Rules:**
- All required fields must be filled before submit
- Email must be valid format
- Human authorship declaration min 150 words
- At least one tool must be listed in Section 3
- At least one receipt must be uploaded per tool
- File upload size limits: 50MB per file, 200MB total
- Accepted file types: PDF, JPG, PNG, MP4, MOV, links (Google Drive, Vimeo, YouTube)

#### 2. **Data Storage**

**Structured submission record:**
- Each submission = one database row (or Airtable record)
- All form fields stored as separate columns (queryable)
- Files stored separately (cloud storage) with references in record
- Unique submission ID assigned: `SUB-2026-0001`
- Timestamps: submission date, last updated, status changes

**Schema** (see TECHNICAL-SPEC.md for full schema):
- Filmmaker info (name, email, location, portfolio)
- Production info (title, runtime, genre, logline)
- Tools (array/JSON of tool records)
- Receipts (array of file URLs)
- Text fields (authorship declaration, IP/brand notes, audio disclosure)
- Tier 2 enrollment (boolean + scene list if applicable)
- Territory preferences
- Status (received / pre-screen / full review / pending info / approved / rejected)
- Assigned reviewer (future: for multi-person team)
- Review notes (internal, not visible to filmmaker)

#### 3. **Email Notifications (Automated)**

**Trigger 1: Submission received**
- **To:** Filmmaker (confirmation)
- **Subject:** "SI8 Rights Verified Submission Received — [Title]"
- **Content:** Submission ID, target completion date, what happens next
- **Send:** Within 5 minutes of form submit

**Trigger 2: Submission received (SI8 internal)**
- **To:** SI8 reviewer (jd@superimmersive8.com)
- **Subject:** "New Rights Verified Submission: [Title] by [Filmmaker]"
- **Content:** Submission ID, filmmaker name, title, link to full submission view
- **Send:** Within 5 minutes of form submit

**Future triggers** (v0.2+):
- Status change → in review
- Status change → pending info needed
- Status change → approved (with Chain of Title attached)
- Status change → rejected (with explanation)

#### 4. **Confirmation Page**

After successful submit, show:
- ✅ "Submission Received"
- Submission ID: SUB-2026-0001
- What happens next (review timeline)
- Confirmation email sent to [email]
- Link to submission status page (future: v0.2)

---

### Non-Functional Requirements

#### Performance:
- Page load: <3 seconds on 4G mobile
- Form submit: <5 seconds (including file upload)
- Email notifications: <5 minutes after submit
- Uptime: 99% (hosted on Vercel = 99.95% SLA)

#### Security:
- HTTPS only (SSL/TLS enforced)
- File upload restrictions (file type, size, malware scan)
- Rate limiting (max 5 submissions per email per day = prevent spam)
- No public access to submission data (only SI8 can view)
- PII protection (email, contact info not exposed publicly)

#### Accessibility:
- WCAG 2.1 AA compliance (keyboard navigation, screen readers)
- Mobile-responsive (works on iPhone, Android, tablets)
- Clear error messages (not just "invalid input")
- High contrast (readable on all devices)

#### Browser Support:
- Chrome (latest 2 versions)
- Safari (latest 2 versions)
- Firefox (latest 2 versions)
- Mobile browsers (iOS Safari, Chrome Android)

---

## Out of Scope (Future Versions)

### v0.2 (Month 2):
- Save & resume (draft submissions)
- Admin dashboard (SI8 reviewer portal)
- Status tracking page (filmmaker can check status)
- Search/filter submissions
- Export submissions as PDF

### v0.3 (Month 3-4):
- Automated Chain of Title generation (on approval)
- Multi-reviewer assignment workflow
- Bulk actions (approve multiple, reject multiple)
- Analytics dashboard (metrics, reports)

### v1.0 (Month 6):
- Lawyer-reviewed form language
- Legal terms acceptance checkbox
- E-signature integration (for shopping agreement)
- Payment integration (if paid submission fees)

### Platform (Year 3):
- Self-serve filmmaker accounts
- Public catalog search
- Buyer licensing portal
- AI-assisted pre-screening
- Automated rights monitoring (tool ToS changes)

---

## Success Metrics

### v0.1 MVP (Target: March 15, 2026):

**Adoption:**
- ✅ First filmmaker submits via web form (not email)
- ✅ 100% of submissions after launch use web form
- ✅ <10% form abandonment rate (start but don't finish)

**Functionality:**
- ✅ 100% of submissions captured as structured data
- ✅ 0 lost submissions (every submit is logged)
- ✅ SI8 notified within 5 min of every submission
- ✅ Filmmaker receives confirmation within 5 min

**Usability:**
- ✅ >50% of submissions completed on mobile (mobile-friendly)
- ✅ <5 support requests about "how to submit" (form is clear)
- ✅ Average form completion time: <30 minutes

**Performance:**
- ✅ Page load <3 sec on mobile
- ✅ Form submit <5 sec including file uploads
- ✅ 99% uptime (no downtime during filmmaker submissions)

---

## User Flows

### Happy Path (Filmmaker Submits Successfully):

1. Filmmaker receives submission link (from SI8 email or website)
2. Opens form on phone or desktop
3. Reads instructions at top
4. Fills out Section 1 (Filmmaker Profile)
5. Fills out Section 2-10 (Production, Tools, Declarations, etc.)
6. Uploads receipts and video link in Section 10
7. Reviews required field indicators (all green checkmarks)
8. Clicks "Submit for Rights Verified Review"
9. Sees loading spinner + "Uploading files..." progress bar
10. Redirected to confirmation page with Submission ID
11. Receives confirmation email within 5 minutes
12. (Future v0.2: Can check status on status page)

### Edge Case 1: Incomplete Submission

1. Filmmaker starts form, fills out Sections 1-5
2. Realizes they don't have receipts yet
3. (v0.1: Closes tab, has to start over)
4. (v0.2: Clicks "Save draft" → returns later to finish)

### Edge Case 2: Validation Error

1. Filmmaker fills out all sections
2. Clicks "Submit"
3. Form shows error: "Section 4: Human authorship declaration must be at least 150 words (current: 87)"
4. Filmmaker scrolls to Section 4, expands text field
5. Adds more detail, reaches 150 words
6. Clicks "Submit" again → success

### Edge Case 3: File Upload Failure

1. Filmmaker tries to upload 300MB video file
2. Form shows error: "File too large. Max 50MB per file. Please upload a link instead."
3. Filmmaker pastes Vimeo link in "Video link" field
4. Clicks "Submit" → success

---

## Assumptions & Dependencies

### Assumptions:
- Filmmakers have internet access (can't submit offline)
- Filmmakers have email (for confirmation)
- Filmmakers speak English (no translation for v0.1)
- Filmmakers have files <50MB or can use cloud links
- SI8 has one reviewer (no multi-reviewer workflow for v0.1)

### Dependencies:
- **Hosting:** Vercel (current SI8 website host) or similar
- **Email service:** Resend (current SI8 email service) or similar
- **Storage:** Airtable, Google Sheets, or PostgreSQL (TBD in TECHNICAL-SPEC)
- **File storage:** Google Drive API, AWS S3, or Cloudflare R2 (TBD)
- **Domain:** superimmersive8.com (subdomain: intake.superimmersive8.com or /submit)

---

## Technical Constraints

- **Stack consistency:** Use same stack as main website (HTML/CSS/JS or Next.js) for maintainability
- **No login required:** Public form (no filmmaker accounts for v0.1)
- **Mobile-first:** Must work on phones (60% traffic expected from mobile)
- **Low cost:** Prefer free-tier services (Airtable free tier, Resend free tier, Vercel free tier)
- **No backend server:** Use serverless functions (Vercel Functions) for API endpoints

---

## Open Questions (To Resolve Before Technical Spec)

### Stack Decisions:
1. **Storage:** Airtable (easiest), Google Sheets (free), PostgreSQL (scalable)?
2. **File uploads:** Google Drive API (free 15GB), AWS S3 (paid), Cloudflare R2 (paid)?
3. **Frontend:** Static HTML/CSS/JS (simple) or Next.js (scalable)?
4. **Email:** Resend (current), SendGrid, Postmark?

### UX Decisions:
1. **Form layout:** Single page (all sections visible) or multi-step wizard (one section per page)?
2. **File uploads:** Upload directly or require links (Google Drive/Vimeo)?
3. **Progress saving:** v0.1 or v0.2? (Adds complexity but improves completion rate)
4. **Required vs. optional:** Make all 10 sections required, or allow partial submissions with "Pending info" status?

### Business Logic:
1. **Submission limit:** How many submissions per filmmaker per month? (Prevent spam)
2. **File size limits:** 50MB per file, 200MB total? Or smaller?
3. **Review SLA:** Promise 5 business days turnaround in confirmation email?
4. **Rejection handling:** Allow resubmission, or one-time reject?

---

## Risks & Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Form breaks on mobile | High | Medium | Mobile-first design, cross-browser testing before launch |
| File uploads fail | High | Medium | Require links as alternative, test uploads with various file sizes |
| Email notifications don't send | High | Low | Use reliable service (Resend), add error logging + retry logic |
| Filmmaker abandons form mid-way | Medium | High | Add "Save draft" in v0.2, keep form as short as possible for v0.1 |
| Data loss (submission not saved) | Critical | Low | Use transactional database (not Google Sheets), add error logging |
| Spam submissions | Medium | Medium | Rate limiting (5 per email per day), reCAPTCHA if needed |

---

## Success Criteria (Go/No-Go for Launch)

Before v0.1 goes live, must have:
- ✅ All 10 sections implemented and validated
- ✅ File uploads working (tested with 10MB+ files)
- ✅ Email notifications sending (tested with real email)
- ✅ Submission data stored correctly (manual test: submit → check database)
- ✅ Mobile responsive (tested on iPhone + Android)
- ✅ Confirmation page working
- ✅ Error handling (form shows clear errors, doesn't silently fail)
- ✅ Documentation complete (TECHNICAL-SPEC, DEPLOYMENT, TESTING)

---

## Timeline

| Milestone | Date | Deliverable |
|-----------|------|-------------|
| **Planning complete** | Feb 28 | PRD, TECHNICAL-SPEC, IMPLEMENTATION-PLAN done |
| **v0.1 build starts** | Mar 1 | Code folder initialized, stack decided |
| **v0.1 alpha** | Mar 7 | Working form, no email notifications yet |
| **v0.1 beta** | Mar 10 | Email notifications working, internal testing |
| **v0.1 launch** | Mar 15 | Live on superimmersive8.com/submit, first filmmaker can use |

---

## Next Steps

1. ✅ PRD complete (this document)
2. ⏳ TECHNICAL-SPEC.md — Stack decisions, data schema, API design
3. ⏳ IMPLEMENTATION-PLAN.md — Phased build, task breakdown
4. ⏳ Start v0.1 build

---

**Approval:** (Founder sign-off required before moving to Technical Spec)

**Status:** Draft — awaiting stack decisions
