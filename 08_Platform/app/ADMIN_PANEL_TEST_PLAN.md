# Admin Panel End-to-End Test Plan

## Prerequisites

✅ Dev server running on http://localhost:3000
✅ Supabase configured
✅ At least one user with `is_admin = true` in users table
✅ At least one test submission in database

---

## Test Flow Overview

```
1. Login as admin → Access admin panel
2. Review queue → View all submissions
3. Submission detail → Review full submission data
4. Approve submission → Generates catalog ID, sends email
5. Catalog management → Toggle visibility
6. Verify public catalog → Check if entry appears
7. Test reject workflow
8. Test request info workflow
```

---

## Part 1: Admin Access & Navigation

### 1.1 Login as Admin User

**Steps:**
1. Go to http://localhost:3000
2. Click "Sign In"
3. Login with admin credentials (user with `is_admin = true`)
4. Should redirect to `/dashboard`

**Expected Result:**
- ✅ See "Admin Panel" button in top right of dashboard
- ✅ Dashboard shows your personal submissions (if any)

### 1.2 Navigate to Admin Panel

**Steps:**
1. Click "Admin Panel" button from dashboard

**Expected Result:**
- ✅ Redirected to `/admin`
- ✅ See admin dashboard with:
  - Summary cards (Total, Pending Review, Approved, Rejected)
  - Submission Queue table
  - "Manage Catalog" and "Creator View" buttons in header

---

## Part 2: Review Queue

### 2.1 Review Queue Display

**Steps:**
1. On `/admin` page, view the submissions table

**Expected Result:**
- ✅ Table shows all submissions (newest first)
- ✅ Columns: Film Title, Creator, Status, Payment, Submitted, Actions
- ✅ Status badges color-coded:
  - Yellow = Pending
  - Blue = Under Review
  - Orange = Needs Info
  - Green = Approved
  - Red = Rejected
- ✅ Payment badges show "Paid $100.00" or "Unpaid"
- ✅ Each row has "Review" button

### 2.2 Summary Cards

**Expected Result:**
- ✅ Total Submissions shows correct count
- ✅ Pending Review shows submissions with status: pending/under_review/needs_info
- ✅ Approved count matches approved submissions
- ✅ Rejected count matches rejected submissions
- ✅ "Pending Review" card highlighted in yellow

---

## Part 3: Submission Detail View

### 3.1 Open Submission Detail

**Steps:**
1. Click "Review" button on any submission

**Expected Result:**
- ✅ Redirected to `/admin/submissions/[id]`
- ✅ Header shows:
  - Back button
  - Film title
  - Filmmaker name and email
  - Submission date
  - Status badge
  - Payment status (if paid)

### 3.2 Main Content Sections

**Expected Result:**
- ✅ **Production Overview**
  - Runtime (MM:SS format)
  - Genre
  - Logline
  - Intended Use

- ✅ **Tool Disclosure**
  - List of tools used with versions
  - Or "No tools specified"

- ✅ **Human Authorship Declaration**
  - Full authorship statement text

- ✅ **Rights Confirmations**
  - Likeness & Identity (checkmark or X)
  - IP & Brand (checkmark or X)

- ✅ **Audio & Music**
  - Source type (original/licensed/silent)
  - Documentation (if provided)

- ✅ **Catalog Opt-In** (only if user opted in)
  - Video URL with external link
  - Public description
  - Catalog status (visible/hidden)
  - Catalog ID (if assigned)

### 3.3 Sidebar Sections

**Expected Result:**
- ✅ **Review Actions Card**
  - If pending: Approve, Request Info, Reject buttons
  - If approved: Green "Approved" indicator
  - If rejected: Red "Rejected" indicator

- ✅ **Review Notes Card**
  - Shows notes if any
  - Or "No notes yet"

- ✅ **Submission Info Card**
  - Submission ID (UUID)
  - Creator name and email
  - Territory preferences
  - Modification rights status
  - Modification scope (if authorized)

---

## Part 4: Approve Workflow

### 4.1 Approve Submission (WITHOUT Catalog Opt-In)

**Steps:**
1. On submission detail page (pending status, NO catalog opt-in)
2. Click "Approve" button
3. Confirm in popup

**Expected Result:**
- ✅ Success alert: "Submission approved successfully!"
- ✅ Page refreshes
- ✅ Status badge changes to green "APPROVED"
- ✅ Review Actions card shows green "Approved" indicator
- ✅ Approve/Reject buttons no longer visible

**Check Database:**
```sql
SELECT status, reviewed_at FROM submissions WHERE id = '[submission_id]';
-- Should show: status = 'approved', reviewed_at = timestamp
```

**Check Server Logs:**
- ✅ Should see: `Submission [id] approved and email sent to [email]`

**Check Email (if Resend configured):**
- ✅ Creator receives "Approved: [Title] is Rights Verified!" email

### 4.2 Approve Submission (WITH Catalog Opt-In)

**Steps:**
1. On submission detail page (pending status, HAS catalog opt-in)
2. Click "Approve" button
3. Confirm in popup

**Expected Result:**
- ✅ Success alert appears
- ✅ Status changes to approved
- ✅ Catalog ID assigned in format `SI8-2026-0001`

**Check Database:**
```sql
SELECT * FROM opt_ins WHERE submission_id = '[submission_id]';
-- Should show: visible = true, catalog_id = 'SI8-2026-XXXX'
```

**Check Email:**
- ✅ Creator receives approval email
- ✅ Creator receives catalog opt-in confirmation email

### 4.3 Verify Catalog ID Increments

**Steps:**
1. Approve multiple submissions with catalog opt-in
2. Check catalog IDs

**Expected Result:**
- ✅ First: SI8-2026-0001
- ✅ Second: SI8-2026-0002
- ✅ Third: SI8-2026-0003
- ✅ Sequence increments correctly

---

## Part 5: Reject Workflow

### 5.1 Reject Submission

**Steps:**
1. On submission detail page (pending status)
2. Click "Reject" button
3. Modal appears: "Reject Submission"
4. Enter rejection reason: "Tool disclosure incomplete - missing Runway Pro receipt"
5. Click "Reject" button in modal

**Expected Result:**
- ✅ Success alert: "Submission rejected and creator notified"
- ✅ Modal closes
- ✅ Page refreshes
- ✅ Status badge changes to red "REJECTED"
- ✅ Review Actions card shows red "Rejected" indicator
- ✅ Review Notes card shows rejection reason

**Check Database:**
```sql
SELECT status, review_notes, reviewed_at FROM submissions WHERE id = '[submission_id]';
-- Should show: status = 'rejected', review_notes = reason, reviewed_at = timestamp
```

**Check Email:**
- ✅ Creator receives "Submission Update: [Title]" email with rejection reason

### 5.2 Reject Validation

**Steps:**
1. Click "Reject" button
2. Leave reason field empty
3. Click "Reject" in modal

**Expected Result:**
- ✅ Alert: "Please provide a reason for rejection"
- ✅ Modal stays open
- ✅ Submission NOT rejected

---

## Part 6: Request Info Workflow

### 6.1 Request Additional Information

**Steps:**
1. On submission detail page (pending status)
2. Click "Request Info" button
3. Modal appears: "Request Additional Information"
4. Enter requested info: "Please provide commercial plan receipts for Runway Pro and expand your human authorship statement to include specific creative decisions made."
5. Click "Send Request" button

**Expected Result:**
- ✅ Success alert: "Info request sent to creator"
- ✅ Modal closes
- ✅ Page refreshes
- ✅ Status badge changes to orange "NEEDS INFO"
- ✅ Review Notes card shows requested info

**Check Database:**
```sql
SELECT status, review_notes FROM submissions WHERE id = '[submission_id]';
-- Should show: status = 'needs_info', review_notes = requested info
```

**Check Email:**
- ✅ Creator receives "Action Required: Additional Information Needed for [Title]" email
- ✅ Email states 14-day deadline

### 6.2 Request Info Validation

**Steps:**
1. Click "Request Info" button
2. Leave field empty
3. Click "Send Request"

**Expected Result:**
- ✅ Alert: "Please specify what information is needed"
- ✅ Modal stays open
- ✅ Status NOT changed

---

## Part 7: Catalog Management

### 7.1 Navigate to Catalog Management

**Steps:**
1. From admin dashboard (`/admin`)
2. Click "Manage Catalog" button

**Expected Result:**
- ✅ Redirected to `/admin/catalog`
- ✅ Header shows "Catalog Management"
- ✅ "Back to Admin" and "View Public Catalog" buttons visible

### 7.2 Catalog Summary Cards

**Expected Result:**
- ✅ Total Catalog Entries shows count of all opt_ins
- ✅ Visible (Public) shows count where visible = true (green card)
- ✅ Hidden shows count where visible = false (gray card)

### 7.3 Catalog Entries Table

**Expected Result:**
- ✅ Table shows all opt-in entries (newest first)
- ✅ Columns: Catalog ID, Film Title, Filmmaker, Status, Visibility, Added, Actions
- ✅ Catalog IDs displayed in blue monospace font
- ✅ Visibility shows:
  - Green eye icon + "Public" if visible
  - Gray eye-off icon + "Hidden" if not visible
- ✅ Actions: Hide/Show button + View button

### 7.4 Toggle Visibility (Hide)

**Steps:**
1. Find entry that is visible (shows "Public")
2. Click "Hide" button
3. Confirm in popup

**Expected Result:**
- ✅ Page refreshes
- ✅ Entry now shows "Hidden" with eye-off icon
- ✅ Button changes to "Show" (green)
- ✅ "Visible (Public)" count decreases by 1
- ✅ "Hidden" count increases by 1

**Check Database:**
```sql
SELECT visible FROM opt_ins WHERE id = '[entry_id]';
-- Should show: visible = false
```

### 7.5 Toggle Visibility (Show)

**Steps:**
1. Find entry that is hidden
2. Click "Show" button
3. Confirm in popup

**Expected Result:**
- ✅ Entry becomes visible
- ✅ Counts update correctly

---

## Part 8: Public Catalog Verification

### 8.1 View Public Catalog

**Steps:**
1. From catalog management page, click "View Public Catalog"
2. Or navigate to `/catalog` directly

**Expected Result:**
- ✅ Only entries with `visible = true` appear
- ✅ Hidden entries do NOT appear
- ✅ Each card shows:
  - Thumbnail
  - Catalog ID badge
  - Runtime badge
  - Film title
  - Filmmaker name
  - Genre tag
  - Public description
  - "Watch & License" button

### 8.2 Video Playback Modal

**Steps:**
1. Click on any catalog card

**Expected Result:**
- ✅ Modal opens with video player
- ✅ YouTube/Vimeo video plays with autoplay
- ✅ Modal header shows title, filmmaker, catalog ID
- ✅ Modal footer shows genre, runtime, "Request License" button
- ✅ X button closes modal

### 8.3 Search & Filter

**Steps:**
1. Use search bar to search by title/filmmaker
2. Use genre dropdown to filter

**Expected Result:**
- ✅ Search narrows results
- ✅ Genre filter works
- ✅ "Showing X entries" updates correctly

---

## Part 9: Edge Cases & Error Handling

### 9.1 Non-Admin Access Attempt

**Steps:**
1. Logout
2. Login as regular user (is_admin = false)
3. Try to navigate to `/admin`

**Expected Result:**
- ✅ Redirected to `/dashboard`
- ✅ No "Admin Panel" button visible on creator dashboard

### 9.2 Unauthenticated Access

**Steps:**
1. Logout
2. Navigate to `/admin` directly

**Expected Result:**
- ✅ Redirected to `/auth/login`

### 9.3 Invalid Submission ID

**Steps:**
1. Navigate to `/admin/submissions/invalid-uuid-123`

**Expected Result:**
- ✅ 404 page or "Not found" error

### 9.4 Button Loading States

**Steps:**
1. Click Approve/Reject/Request Info
2. Observe button during API call

**Expected Result:**
- ✅ Button shows loading spinner
- ✅ Button disabled during request
- ✅ Button re-enables after response

---

## Part 10: Cross-Reference Tests

### 10.1 Admin Panel ↔ Creator View

**Steps:**
1. From admin panel, click "Creator View"
2. Verify creator dashboard loads
3. Click "Admin Panel" to return

**Expected Result:**
- ✅ Navigation works both ways
- ✅ Admin user can switch between views

### 10.2 Submission Actions Reflect in Review Queue

**Steps:**
1. Approve a submission from detail view
2. Navigate back to admin dashboard
3. Check submission in queue table

**Expected Result:**
- ✅ Status updated to "APPROVED" with green badge
- ✅ Submission no longer counts in "Pending Review"

### 10.3 Catalog Visibility ↔ Public Catalog

**Steps:**
1. Hide an entry in catalog management
2. Check public catalog
3. Verify entry no longer visible
4. Show entry again
5. Verify entry reappears

**Expected Result:**
- ✅ Visibility toggle immediately affects public catalog
- ✅ Page refresh shows updated state

---

## Part 11: Database Integrity Checks

### 11.1 Approval Workflow

**SQL to verify:**
```sql
-- Check submission updated correctly
SELECT id, status, reviewed_at
FROM submissions
WHERE id = '[submission_id]';

-- Check catalog entry if opt-in
SELECT submission_id, catalog_id, visible
FROM opt_ins
WHERE submission_id = '[submission_id]';

-- Verify catalog ID sequence
SELECT catalog_id
FROM opt_ins
WHERE catalog_id LIKE 'SI8-2026-%'
ORDER BY catalog_id DESC
LIMIT 5;
```

### 11.2 Email Logs

**Check server console for:**
```
✅ Submission [id] approved and email sent to [email]
✅ Submission [id] rejected and email sent to [email]
✅ Info requested for submission [id] and email sent to [email]
```

---

## Test Checklist Summary

### Core Functionality
- [ ] Admin authentication works
- [ ] Non-admins cannot access admin routes
- [ ] Admin dashboard displays correctly
- [ ] Submission detail view shows all data
- [ ] Approve workflow completes successfully
- [ ] Reject workflow requires reason and sends email
- [ ] Request info workflow sets status and sends email
- [ ] Catalog ID generation increments correctly
- [ ] Catalog management table displays all entries
- [ ] Toggle visibility updates database and public catalog
- [ ] Public catalog only shows visible entries
- [ ] Video playback modal works

### Email Notifications
- [ ] Approval email sent to creator
- [ ] Catalog opt-in email sent (if applicable)
- [ ] Rejection email sent with reason
- [ ] Info request email sent with details

### UI/UX
- [ ] Status badges color-coded correctly
- [ ] Loading states show during API calls
- [ ] Error messages display for invalid actions
- [ ] Modals close after successful actions
- [ ] Page refreshes update data correctly
- [ ] Navigation between admin/creator views works

### Edge Cases
- [ ] Invalid submission IDs handled gracefully
- [ ] Empty fields validated before submission
- [ ] Multiple approvals don't duplicate catalog IDs
- [ ] Visibility toggle works repeatedly

---

## Known Limitations (Expected for MVP)

✅ **No email editing** - Creators cannot update submissions after info request (future feature)
✅ **No bulk actions** - Must approve/reject one at a time (future feature)
✅ **No advanced filtering** - Review queue shows all submissions (future feature)
✅ **No Rights Package PDF** - PDF generation not yet implemented (future feature)
✅ **Manual catalog ID** - No editing catalog IDs in UI (future feature)

---

## If Tests Fail

### Common Issues

**1. Email not sending:**
- Check `.env.local` has `RESEND_API_KEY`
- Check Resend dashboard for errors
- Verify sender domain approved in Resend

**2. Catalog ID not generating:**
- Check console for errors
- Verify opt_ins table has `catalog_id` column
- Check SQL query in approve route

**3. Status not updating:**
- Check browser console for API errors
- Check server logs for database errors
- Verify Supabase connection

**4. Unauthorized errors:**
- Verify user's `is_admin = true` in database
- Clear cookies and re-login
- Check session in browser DevTools

---

## Post-Test Actions

After successful testing:

1. ✅ Document any bugs found
2. ✅ Update CREATOR_PORTAL_SETUP.md with admin panel docs
3. ✅ Create git checkpoint commit
4. ✅ Consider deploying to staging environment
5. ✅ Set up Resend production API key for live emails

---

**Created:** February 18, 2026
**Version:** 1.0
**Status:** Ready for testing
