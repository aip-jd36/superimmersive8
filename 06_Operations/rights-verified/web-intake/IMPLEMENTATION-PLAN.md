# Implementation Plan — Rights Verified Web Intake Form

**Version:** 1.0
**Date:** February 27, 2026
**Status:** Ready to execute
**Target v0.1 launch:** March 15, 2026

---

## Executive Summary

**Total build time (v0.1 MVP):** ~24 hours over 2 weeks
**Phases:** 3 phases (v0.1 = MVP, v0.2 = Enhanced, v0.3 = Automated)
**Critical path:** Google Cloud setup → API integration → Testing
**Launch date:** March 15, 2026 (first filmmaker can submit)

---

## Phase Overview

| Phase | Goal | Timeline | Effort |
|-------|------|----------|--------|
| **v0.1 MVP** | Working form, emails, storage | Week 1-2 (Mar 1-15) | 24 hrs |
| **v0.2 Enhanced** | Admin dashboard, status tracking | Month 2 (Apr 1-30) | 16 hrs |
| **v0.3 Automated** | Save & resume, Chain of Title auto-gen | Month 3-4 (May-Jun) | 20 hrs |

---

## Phase 1: v0.1 MVP (Week 1-2)

**Goal:** Launch working form that filmmakers can use. All submissions captured as structured data.

**Launch criteria:**
- ✅ Form live at superimmersive8.com/submit
- ✅ All 10 sections render correctly on mobile + desktop
- ✅ Submission writes to Google Sheets
- ✅ Files upload to Google Drive
- ✅ Both emails send (filmmaker + SI8)
- ✅ Tested with 3 real submissions (no errors)

---

### Week 1 (Mar 1-7): Planning + Setup + Frontend

#### **Day 1 (Mar 1, Saturday): Environment Setup** — 3 hours

**Tasks:**
1. **Google Cloud Project setup** (1 hr)
   - Create new Google Cloud project: "SI8 Rights Verified"
   - Enable Google Sheets API
   - Enable Google Drive API
   - Create service account
   - Download service account JSON key
   - Grant service account access to target Google Sheet
   - Grant service account access to Google Drive folder

2. **Google Sheets setup** (30 min)
   - Create new spreadsheet: "SI8 Rights Verified Submissions"
   - Create sheet: "Submissions"
   - Add 40 column headers (A-AN as per TECHNICAL-SPEC.md)
   - Share with service account email (Editor access)
   - Note Spreadsheet ID

3. **Google Drive folder setup** (30 min)
   - Create folder: "SI8 Rights Verified Submissions"
   - Share with service account email (Editor access)
   - Note Folder ID

4. **Local development environment** (1 hr)
   - Clone repo: `git clone https://github.com/aip-jd36/superimmersive8.git`
   - Install dependencies: `npm install googleapis google-auth-library resend`
   - Create `.env.local` file with all keys
   - Test Vercel CLI: `vercel dev`
   - Verify can connect to Google Sheets (write test row)

**Deliverables:**
- [x] Google Cloud project ready
- [x] Google Sheet created with schema
- [x] Google Drive folder created
- [x] Local dev environment working
- [x] `.env.local` file with all secrets

**Dependencies:** None (can start immediately)

---

#### **Day 2-3 (Mar 2-3, Sun-Mon): Frontend HTML/CSS** — 6 hours

**Tasks:**

**2.1 Create `submit.html` structure** (2 hrs)
- Copy header/footer from `index.html` (maintain consistent branding)
- Add page title: "Submit Your Work for Rights Verified Review"
- Add intro paragraph (what Rights Verified is, 5-day turnaround)
- Create 10 section containers (map to SUBMISSION-REQUIREMENTS.md)
- Add progress indicator (sticky sidebar showing section completion)
- Add submit button (disabled by default)
- Add loading spinner (hidden by default)

**2.2 Section markup** (2 hrs)
- **Section 1 (Filmmaker Profile):** Text inputs + checkboxes
- **Section 2 (Production):** Text inputs + dropdowns + date inputs
- **Section 3 (Tools):** Dynamic table (add/remove rows button)
- **Section 4 (Authorship):** Textarea with word counter
- **Section 5 (Likeness):** 4 checkboxes + conditional text field
- **Section 6 (IP):** 3 checkboxes + conditional text field
- **Section 7 (Audio):** Radio buttons + conditional fields
- **Section 8 (Tier 2):** Radio buttons + conditional text field
- **Section 9 (Territory):** Dropdowns + text fields
- **Section 10 (Files):** File upload inputs + URL inputs

**2.3 Create `submit.css`** (2 hrs)
- Form container styling (max-width 800px, centered)
- Section styling (card-based, clear separation)
- Input styling (consistent with main website theme)
- File upload area (drag-and-drop zone, file list display)
- Progress indicator (sticky sidebar, green checkmarks)
- Responsive breakpoints (mobile: stacked, desktop: sidebar)
- Error state styling (red border, error message below field)
- Loading spinner styling
- Submit button states (disabled, enabled, loading)

**Deliverables:**
- [x] `submit.html` — Complete structure, all 10 sections
- [x] `submit.css` — Styled form (desktop + mobile responsive)
- [x] Matches SI8 brand (dark theme, purple/pink gradients)

**Testing checklist:**
- [ ] Form renders correctly on Chrome/Safari/Firefox desktop
- [ ] Form renders correctly on iOS Safari + Chrome Android
- [ ] All sections visible and readable
- [ ] Progress indicator shows in sidebar (desktop) or top (mobile)

**Dependencies:** None

---

#### **Day 4-5 (Mar 4-5, Tue-Wed): Frontend JavaScript** — 8 hours

**Tasks:**

**4.1 Form validation logic** (3 hrs)
- Create `submit.js` file
- Add event listeners to all inputs (blur events for validation)
- Implement validation functions:
  - `validateEmail(email)` — regex check
  - `validateURL(url)` — regex check
  - `validateWordCount(text, min)` — split by whitespace, count
  - `validateFileSize(file, maxMB)` — check file.size
  - `validateFileType(file, allowedTypes)` — check file.type
- Show/hide error messages in real-time
- Update progress indicator (green checkmark when section valid)
- Enable/disable submit button based on form completeness

**4.2 Word counter** (1 hr)
- Section 4 (Authorship Declaration): Real-time word count
- Display: "Word count: 187 / 150 minimum" (green if ≥150, red if <150)
- Update on every keystroke (debounced 300ms)

**4.3 Dynamic tool table** (1 hr)
- Section 3 (Tools): Add/remove table rows
- "Add another tool" button → insert new row
- "Remove" button on each row → delete row
- Min 1 row required (can't remove last row)

**4.4 File upload UI** (2 hrs)
- Drag-and-drop zone for file inputs
- Show file list with size and remove button
- Progress bar while uploading (visual feedback)
- File size validation (client-side, before upload)
- Convert files to base64 for API submission (or FormData multipart)

**4.5 Conditional field logic** (1 hr)
- Section 5: Show "notes" field if checkbox not checked
- Section 6: Show "notes" field if checkbox not checked
- Section 7: Show license upload if "Licensed" selected
- Section 8: Show "scenes" field if "Yes scenes" selected

**Deliverables:**
- [x] `submit.js` — Complete validation logic
- [x] Real-time error display
- [x] Word counter working
- [x] Dynamic tool table working
- [x] File upload UI working
- [x] Progress indicator updating

**Testing checklist:**
- [ ] Validation errors show on blur
- [ ] Submit button disabled if any required field invalid
- [ ] Word counter updates in real-time
- [ ] Can add/remove tool rows
- [ ] File upload shows file list and size
- [ ] Conditional fields show/hide correctly

**Dependencies:** Day 2-3 (HTML/CSS must be complete)

---

### Week 2 (Mar 8-14): Backend + Integration + Testing

#### **Day 6-7 (Mar 8-9, Sat-Sun): API Endpoint** — 6 hours

**Tasks:**

**6.1 Create `/api/submit.js` serverless function** (2 hrs)
- Set up Vercel serverless function structure
- Import dependencies (googleapis, resend)
- Parse request body (JSON from frontend)
- Add CORS headers (allow superimmersive8.com only)
- Add error handling (try/catch, return proper error responses)

**6.2 Server-side validation** (1 hr)
- Re-validate all required fields
- Check authorship word count ≥ 150
- Validate email format (regex)
- Validate URL formats
- Check file sizes (reject if >50MB)
- Rate limiting: Check if email has submitted >5 times today (query Google Sheets)

**6.3 Google Drive integration** (2 hrs)
- Authenticate with service account
- Function: `uploadFilesToDrive(submissionId, files)`
  - Create folder: `SUB-2026-0001`
  - Create subfolder: `receipts/`
  - Upload receipt files to `receipts/` folder
  - Create subfolder: `supporting-docs/` (if any)
  - Upload supporting docs (if any)
  - Set folder permissions (private, SI8-only)
  - Return folder URL
- Handle errors (network failures, quota exceeded)

**6.4 Google Sheets integration** (1 hr)
- Authenticate with service account
- Function: `generateSubmissionId()` — query last row, increment
- Function: `writeSubmissionRow(data)` — append new row (40 columns)
- Map form data to schema (as per TECHNICAL-SPEC.md)
- Handle errors (connection failures, write failures)

**Deliverables:**
- [x] `/api/submit.js` — Working API endpoint
- [x] Google Drive uploads working
- [x] Google Sheets writes working
- [x] Error handling implemented
- [x] Rate limiting implemented

**Testing checklist:**
- [ ] Can submit test data via Postman
- [ ] Row appears in Google Sheets with correct data
- [ ] Files appear in Google Drive in correct folder structure
- [ ] Rate limit works (6th submission same day fails)
- [ ] Server-side validation catches invalid data

**Dependencies:** Day 1 (Google Cloud setup), Day 2-5 (Frontend for testing)

---

#### **Day 8 (Mar 10, Mon): Email Integration** — 2 hours

**Tasks:**

**8.1 Email templates** (1 hr)
- Create `email-templates/filmmaker-confirmation.js` — HTML template
- Create `email-templates/si8-notification.js` — HTML template
- Use template literals for variable substitution
- Match SI8 brand styling (dark theme, clean layout)

**8.2 Resend integration** (1 hr)
- Import Resend SDK in `/api/submit.js`
- Function: `sendConfirmationEmails(submissionData)`
  - Email 1: Filmmaker confirmation
    - To: filmmaker email
    - Subject: `SI8 Rights Verified Submission Received — ${title}`
    - Body: filmmakerConfirmationTemplate(data)
  - Email 2: SI8 notification
    - To: jd@superimmersive8.com
    - Subject: `🎬 New Rights Verified Submission: ${title} by ${name}`
    - Body: si8NotificationTemplate(data)
- Handle errors (Resend API failures, retry logic)
- Log email delivery (success/failure)

**Deliverables:**
- [x] Email templates created
- [x] Resend integration working
- [x] Both emails sending on submit

**Testing checklist:**
- [ ] Submit test form → filmmaker receives confirmation within 5 min
- [ ] SI8 receives notification within 5 min
- [ ] Email content is correct (all variables populated)
- [ ] Email renders correctly in Gmail, Outlook, mobile

**Dependencies:** Day 6-7 (API endpoint must be working)

---

#### **Day 9 (Mar 11, Tue): Confirmation Page + Form Integration** — 2 hours

**Tasks:**

**9.1 Create `confirmation.html`** (30 min)
- "Submission Received" heading
- Display submission ID (from URL param: `?id=SUB-2026-0001`)
- "What happens next" section (timeline, expected completion)
- "Confirmation email sent to [email]"
- Link back to homepage

**9.2 Frontend → API integration** (1 hr)
- Update `submit.js`:
  - On form submit → prevent default
  - Show loading spinner
  - Collect all form data into JSON object
  - Convert files to base64 or FormData
  - POST to `/api/submit`
  - Handle success → redirect to `confirmation.html?id=SUB-2026-0001`
  - Handle error → show error message, don't clear form

**9.3 Error handling UX** (30 min)
- If API returns validation errors → show errors inline (red border, message below field)
- If network error → show "Network error, please try again"
- If rate limit error → show "Too many submissions today. Max 5 per day."
- If unknown error → show "Something went wrong. Please contact SI8."

**Deliverables:**
- [x] `confirmation.html` — Success page
- [x] Frontend → API integration working
- [x] Error handling UX implemented

**Testing checklist:**
- [ ] Submit valid form → redirects to confirmation page with ID
- [ ] Submit invalid form → shows errors inline
- [ ] Submit while offline → shows network error
- [ ] Submit 6th time same day → shows rate limit error

**Dependencies:** Day 6-8 (API + emails must work)

---

#### **Day 10-11 (Mar 12-14, Wed-Fri): Testing + Bug Fixes** — 4 hours

**Tasks:**

**10.1 Manual testing** (2 hrs)
- Fill out form completely on desktop → submit → verify success
- Fill out form on mobile → submit → verify success
- Test all validation scenarios:
  - Missing required fields
  - Word count <150
  - Invalid email format
  - Invalid URL format
  - File too large (51MB)
  - Wrong file type (.exe)
- Test edge cases:
  - Submit same email 6 times (rate limit)
  - Upload 10 files (check Drive folder structure)
  - Use special characters in text fields (test sanitization)
- Cross-browser testing:
  - Chrome desktop
  - Safari desktop
  - Firefox desktop
  - iOS Safari mobile
  - Chrome Android mobile

**10.2 Data verification** (1 hr)
- Submit test form → check Google Sheets row (all 40 columns populated correctly)
- Check Google Drive folder (files in correct structure)
- Check emails (both received, content correct)
- Verify submission ID increments correctly

**10.3 Bug fixes** (1 hr)
- Fix any issues found during testing
- Update error messages (make clearer if confusing)
- Adjust styling (fix any mobile layout issues)
- Performance optimization (if page load >3 sec)

**Deliverables:**
- [x] All manual tests passed
- [x] No critical bugs
- [x] Data verified in Sheets + Drive + Emails
- [x] Ready for production launch

**Testing checklist:**
- [ ] End-to-end test: Form → Submit → Sheets → Drive → Emails (all working)
- [ ] Mobile responsive (iPhone + Android)
- [ ] Cross-browser compatible
- [ ] No console errors
- [ ] Page load <3 sec on 4G
- [ ] Submit completes <5 sec

**Dependencies:** Day 1-9 (all prior work must be complete)

---

#### **Day 12 (Mar 15, Sat): Deploy to Production** — 1 hour

**Tasks:**

**12.1 Environment variables** (15 min)
- Add all secrets to Vercel dashboard:
  - `RESEND_API_KEY`
  - `GOOGLE_SERVICE_ACCOUNT_KEY`
  - `SHEET_ID`
  - `GOOGLE_DRIVE_FOLDER_ID`
- Verify environment variables accessible in production

**12.2 Deploy** (15 min)
- Push to GitHub `main` branch
- Vercel auto-deploys
- Verify deployment succeeded (check Vercel dashboard)

**12.3 Smoke test production** (30 min)
- Visit `superimmersive8.com/submit`
- Fill out real test submission (use test email)
- Submit → verify:
  - Redirects to confirmation page
  - Row written to Google Sheets
  - Files in Google Drive
  - Both emails received
- Delete test row from Google Sheets (clean up)

**Deliverables:**
- [x] Deployed to production
- [x] Smoke test passed
- [x] Form live and working

**Go-live checklist:**
- [ ] Form loads at superimmersive8.com/submit
- [ ] Submit test form → all systems working
- [ ] No errors in Vercel logs
- [ ] Ready for first filmmaker submission

**Dependencies:** Day 10-11 (testing complete, no blocking bugs)

---

## Phase 1 Complete: v0.1 MVP Launch Criteria

Before declaring v0.1 "launched," must have:

✅ **Functional:**
- [ ] Form live at superimmersive8.com/submit
- [ ] All 10 sections render correctly
- [ ] Submission writes to Google Sheets (40 columns)
- [ ] Files upload to Google Drive (organized folders)
- [ ] Filmmaker confirmation email sends (<5 min)
- [ ] SI8 notification email sends (<5 min)
- [ ] Confirmation page shows with Submission ID

✅ **Tested:**
- [ ] Tested on desktop (Chrome, Safari, Firefox)
- [ ] Tested on mobile (iOS Safari, Chrome Android)
- [ ] Tested all validation scenarios (missing fields, file size, word count)
- [ ] Tested end-to-end (form → Sheets → Drive → Emails)
- [ ] No critical bugs

✅ **Performance:**
- [ ] Page load <3 sec on 4G mobile
- [ ] Form submit <5 sec (including file uploads)
- [ ] Email delivery <5 min

✅ **Documentation:**
- [ ] README.md updated (v0.1 status = Complete)
- [ ] DECISIONS.md created with any technical decisions made during build

---

## Phase 2: v0.2 Enhanced (Month 2)

**Goal:** Add admin tools for SI8 reviewer to manage submissions without manually editing Google Sheets.

**Timeline:** April 2026 (16 hours over 2-3 weeks)

### Features:

#### **2.1 Admin Dashboard** — 8 hours
- Login page (simple auth: password-protected)
- Submissions list view:
  - Table showing: ID, Filmmaker, Title, Status, Date submitted
  - Filters: Status (All / Received / Pre-screen / Approved / Rejected)
  - Search: By filmmaker name or title
  - Sort: By date (newest first)
- Submission detail view:
  - Click row → see all submission fields
  - Display all 40 fields (formatted)
  - Show file links (receipts folder, video link)
  - Status dropdown (change status)
  - Review notes textarea (internal notes)
  - Save button (update Google Sheets row)

#### **2.2 Status Tracking (Filmmaker-facing)** — 4 hours
- New page: `superimmersive8.com/submission/:id`
- Filmmaker enters Submission ID → sees status
- Display:
  - Submission ID
  - Current status (Received / Pre-screen / Full review / Approved / Rejected)
  - Submitted date
  - Last updated date
  - Estimated completion (if status = in review)
- No login required (public page, submission ID is the "key")

#### **2.3 Automated Status Update Emails** — 4 hours
- When SI8 changes status in admin dashboard → trigger email
- Email templates:
  - Status → Pre-screen: "Your submission is being reviewed"
  - Status → Pending info: "Additional info needed: [list]"
  - Status → Approved: "Approved! Chain of Title attached" (manual for now)
  - Status → Rejected: "Decision: Not approved. Reason: [text]"

**Launch criteria (v0.2):**
- [ ] Admin dashboard live (password-protected)
- [ ] Can view all submissions in list
- [ ] Can filter/search/sort submissions
- [ ] Can view submission details
- [ ] Can change status + add notes
- [ ] Status changes write to Google Sheets
- [ ] Filmmaker can check status at /submission/:id
- [ ] Status change emails send automatically

---

## Phase 3: v0.3 Automated (Month 3-4)

**Goal:** Reduce manual work. Add automation and conveniences.

**Timeline:** May-June 2026 (20 hours over 3-4 weeks)

### Features:

#### **3.1 Save & Resume (Filmmaker)** — 8 hours
- "Save draft" button on form
- Saves form data to localStorage (client-side)
- On return → auto-populate form from localStorage
- Clear draft after successful submit
- Warning if try to close tab with unsaved changes

#### **3.2 Chain of Title Auto-Generation** — 8 hours
- When SI8 marks status = Approved in admin dashboard:
  - Trigger function: `generateChainOfTitle(submissionId)`
  - Pull data from Google Sheets row
  - Populate Chain of Title template (9-field schema from CHAIN-OF-TITLE-SCHEMA.md)
  - Generate PDF
  - Upload PDF to Google Drive
  - Store PDF URL in Google Sheets (Column AM)
  - Include PDF URL in approval email

#### **3.3 Bulk Actions (Admin)** — 4 hours
- Select multiple submissions (checkboxes)
- Bulk status change (e.g., mark 5 as "Pre-screen")
- Bulk export (download selected submissions as CSV)
- Bulk delete (for spam submissions)

**Launch criteria (v0.3):**
- [ ] Save & resume working (localStorage persistence)
- [ ] Chain of Title auto-generates on approval
- [ ] Bulk actions working in admin dashboard

---

## Task Dependencies (Critical Path)

```
Day 1 (Google Cloud setup)
  ↓
Day 6-7 (API endpoint)
  ↓
Day 8 (Email integration)
  ↓
Day 9 (Form integration)
  ↓
Day 10-11 (Testing)
  ↓
Day 12 (Deploy)
```

**Parallel work (no dependencies):**
- Day 2-5 (Frontend) can start immediately (doesn't block anything)
- Day 1 (Google Cloud setup) must complete before Day 6-7 (API)

**Critical path:** Day 1 → Day 6-7 → Day 8 → Day 9 → Day 10-11 → Day 12

**Total critical path time:** 16 hours (if done sequentially)
**With parallel work:** 24 hours total (spread over 12 days)

---

## Resource Allocation

**Solo founder (JD):**
- Week 1: 12 hours (Day 1-5)
- Week 2: 12 hours (Day 6-12)
- Total: 24 hours over 2 weeks

**Time per day:**
- Weekend days: 3-4 hours (Day 1, 6, 7, 12)
- Weekday evenings: 2-3 hours (Day 2-5, 8-11)

**Realistic schedule (14-hour/week constraint):**
- Week 1: 14 hours (Mar 1-7)
- Week 2: 10 hours (Mar 8-14)
- Total: 24 hours

---

## Risk Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| **Google API quota exceeded** | Critical | Low | Free tier = 1,000 requests/100 sec. Monitor usage. Upgrade if needed ($0.40/1000 requests). |
| **File upload fails (large files)** | High | Medium | Set 50MB limit. Require video links (Vimeo/YouTube) instead of uploads. |
| **Email delivery fails** | High | Low | Resend = 99.9% deliverability. Add retry logic + error logging. |
| **Form abandonment (too complex)** | Medium | High | v0.1 = single page (no save/resume). Add save/resume in v0.2 if abandonment >10%. |
| **Rate limiting too strict** | Low | Medium | 5 submissions/email/day. Adjust if legit filmmakers hit limit. |
| **Cross-browser bugs** | Medium | Medium | Test on Chrome/Safari/Firefox before launch. Use standard HTML5 (no exotic features). |
| **Mobile layout issues** | High | Medium | Mobile-first CSS. Test on iPhone + Android before launch. |
| **Google Sheets performance** | Low | Low | Sheets = fast until >10,000 rows. Migrate to PostgreSQL when needed (Year 3). |
| **Security breach (PII exposed)** | Critical | Very Low | Service account = only SI8 access. No public read. HTTPS enforced. Input sanitization. |

**Contingency plans:**
- If Google Drive quota exceeded → upgrade to Google Workspace ($6/user/month for 30GB)
- If Resend quota exceeded → upgrade to paid plan ($10/mo for 10,000 emails)
- If Vercel quota exceeded → upgrade to Pro ($20/mo)
- If form abandonment high → add save/resume in v0.2 (already planned)
- If mobile issues discovered → delay launch 2-3 days for fixes

---

## Success Metrics (v0.1)

### **Week 1 (Mar 15-21):**
- [ ] First filmmaker submits via web form (not email)
- [ ] 100% of submissions after launch use web form
- [ ] <5% form abandonment rate (start but don't finish)
- [ ] 0 lost submissions (every submit logged)
- [ ] 0 critical bugs reported

### **Month 1 (Mar 15 - Apr 15):**
- [ ] 5-10 submissions received
- [ ] <10% abandonment rate
- [ ] SI8 notified within 5 min of every submission (100% success rate)
- [ ] Filmmaker confirmation sent within 5 min (100% success rate)
- [ ] >50% of submissions from mobile (mobile-friendly validated)
- [ ] <3 support requests about "how to submit" (form is clear)

---

## Go / No-Go Decision Points

### **Day 5 (Mar 5): Frontend Complete Check**
**Question:** Is frontend rendering correctly on all devices?
- **GO if:** Form renders on Chrome/Safari/Firefox + mobile, all sections visible
- **NO-GO if:** Major layout issues, can't test on mobile → delay 2 days for fixes

### **Day 9 (Mar 11): Integration Complete Check**
**Question:** Does end-to-end flow work (form → API → Sheets → Drive → Emails)?
- **GO if:** Test submission works end-to-end, all data correct
- **NO-GO if:** API fails, data not writing, emails not sending → delay launch 3-5 days for debugging

### **Day 11 (Mar 14): Pre-Launch Check**
**Question:** Are we ready for first real filmmaker submission?
- **GO if:** All testing passed, no critical bugs, smoke test successful
- **NO-GO if:** Critical bugs found, data integrity issues → delay launch until fixed

---

## Post-Launch Plan (v0.1)

### **Week 1 post-launch (Mar 15-21):**
- Monitor Vercel logs daily (check for errors)
- Check Google Sheets daily (verify submissions writing correctly)
- Respond to filmmaker support requests within 24 hours
- Fix any bugs reported (deploy fixes within 48 hours)

### **Week 2-4 post-launch (Mar 22 - Apr 15):**
- Track metrics (submissions, abandonment rate, mobile usage)
- Gather filmmaker feedback (email survey after submission)
- Document lessons learned (add to DECISIONS.md)
- Begin planning v0.2 features (admin dashboard)

### **Month 2 (April):**
- Review v0.1 metrics
- Decide: Start v0.2 build or iterate on v0.1?
- If v0.1 stable + filmmaker feedback positive → start v0.2 build
- If issues discovered → prioritize fixes before v0.2

---

## Rollback Plan

**If critical bug discovered post-launch:**

1. **Immediate:** Disable form (add "Temporarily unavailable" message)
2. **Investigate:** Check Vercel logs, Google Sheets, Drive for issues
3. **Fix:** Deploy fix to staging environment, test
4. **Re-enable:** Deploy fix to production, remove "unavailable" message
5. **Communicate:** Email any affected filmmakers (if submissions lost/corrupted)

**If data corruption:**
- Google Sheets = version history (can restore previous version)
- Google Drive = trash bin (can restore deleted files for 30 days)
- No permanent data loss risk

---

## Documentation Updates During Build

**As you build, update these documents:**

### **DECISIONS.md** (create during build)
Log any technical decisions made during implementation:
- Why chose X over Y (e.g., "Used FormData instead of base64 for file uploads because...")
- Any deviations from TECHNICAL-SPEC.md
- Edge cases discovered and how handled
- Performance optimizations made
- Security considerations addressed

### **TESTING.md** (create during testing phase)
Document all test scenarios and results:
- Manual test checklist (what was tested)
- Cross-browser test results
- Mobile test results
- Edge cases tested
- Bugs found and fixed
- Performance test results (page load time, submit time)

### **DEPLOYMENT.md** (create during deploy)
Document deployment process:
- Environment setup steps
- How to add environment variables in Vercel
- How to deploy (git push → auto-deploy)
- How to rollback (Vercel dashboard)
- Smoke test checklist
- Monitoring setup (Vercel logs, error tracking)

---

## Definition of Done (v0.1)

**Form is "done" when:**
- ✅ All tasks in Phase 1 completed
- ✅ All testing checklists passed
- ✅ All go-live criteria met
- ✅ Smoke test passed in production
- ✅ First real filmmaker can successfully submit
- ✅ Documentation updated (README, DECISIONS, TESTING, DEPLOYMENT)

**NOT done until:**
- Tested on mobile (iOS + Android)
- Tested on 3 browsers (Chrome, Safari, Firefox)
- End-to-end test passed (form → Sheets → Drive → Emails)
- No critical bugs
- Performance targets met (page load <3 sec, submit <5 sec)

---

## Timeline Summary

| Date | Milestone |
|------|-----------|
| **Feb 27** | Planning complete (PRD, TECHNICAL-SPEC, IMPLEMENTATION-PLAN) |
| **Mar 1** | Start build (Day 1: Environment setup) |
| **Mar 5** | Frontend complete (Day 2-5) |
| **Mar 9** | API complete (Day 6-7) |
| **Mar 10** | Email integration complete (Day 8) |
| **Mar 11** | Form integration complete (Day 9) |
| **Mar 14** | Testing complete (Day 10-11) |
| **Mar 15** | **🚀 v0.1 LAUNCH** (Day 12: Deploy to production) |
| **Mar 15-21** | Week 1 post-launch monitoring |
| **Apr 1** | Review v0.1 metrics, plan v0.2 |
| **Apr 30** | v0.2 complete (admin dashboard) |
| **Jun 30** | v0.3 complete (save & resume, automation) |

---

## Next Steps (Ready to Execute)

✅ **Planning phase complete:**
- [x] PRD.md (what we're building)
- [x] TECHNICAL-SPEC.md (how we're building it)
- [x] IMPLEMENTATION-PLAN.md (when we're building it)

⏳ **Ready to start build:**
- **Day 1 (Mar 1):** Google Cloud setup (3 hours)
- **Day 2-5 (Mar 2-5):** Frontend HTML/CSS/JS (14 hours)

**Total v0.1 effort:** 24 hours over 2 weeks
**Launch date:** March 15, 2026

---

**Status:** Planning complete. Ready to build. 🚀
