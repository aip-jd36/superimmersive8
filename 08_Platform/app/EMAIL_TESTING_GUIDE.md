# Email Testing Guide
**Status:** Email implementation complete, needs production testing
**Date:** March 20, 2026

---

## ✅ What's Implemented

All 5 email flows are implemented using Resend:

1. **Submission Received** - When creator submits (payment confirmed)
2. **Submission Approved** - When admin approves
3. **Submission Rejected** - When admin rejects with reason
4. **Info Requested** - When admin requests more info (14-day deadline)
5. **Opt-In Confirmation** - When catalog entry goes live

---

## 📋 Pre-Test Checklist

### Environment Variables (Vercel)

Verify these are set in Vercel project settings:

```
RESEND_API_KEY=re_xxxxx...
ADMIN_EMAIL=jd@superimmersive8.com
NEXT_PUBLIC_SITE_URL=https://si8-creator-portal.vercel.app
```

**To check:**
1. Go to https://vercel.com/dashboard
2. Select project → Settings → Environment Variables
3. Verify all 3 variables exist
4. If missing, add them and redeploy

### Resend Domain Verification

**From email:** `noreply@superimmersive8.com`

1. Log in to Resend dashboard: https://resend.com/domains
2. Verify `superimmersive8.com` domain is verified
3. Check DNS records are correct
4. If not verified, emails will fail silently

---

## 🧪 Test Plan

### Test 1: Submission Approved Email

**Trigger:** Admin approves a submission

**Steps:**
1. Log in as admin
2. Go to `/admin`
3. Click "Review" on a pending submission
4. Click "Approve" button
5. Confirm approval

**Expected:**
- Creator receives email:
  - Subject: "Approved: [Title] is Rights Verified!"
  - Body mentions Rights Package PDF download
  - Link to dashboard
- Check creator's email inbox (within 1-2 minutes)
- Check Vercel logs for any email errors

**Pass criteria:**
- ✅ Email delivered
- ✅ Links work
- ✅ Styling renders correctly

---

### Test 2: Submission Rejected Email

**Trigger:** Admin rejects a submission

**Steps:**
1. Log in as admin
2. Go to `/admin`
3. Click "Review" on a pending submission
4. Click "Reject" button
5. Enter reason: "Test rejection - tools not approved for commercial use"
6. Submit

**Expected:**
- Creator receives email:
  - Subject: "Submission Update: [Title]"
  - Body includes rejection reason
  - Contact email for questions
- Check creator's email inbox

**Pass criteria:**
- ✅ Email delivered
- ✅ Rejection reason displays correctly
- ✅ Admin email link works

---

### Test 3: Info Requested Email

**Trigger:** Admin requests more info

**Steps:**
1. Log in as admin
2. Go to `/admin`
3. Click "Review" on a pending submission
4. Click "Request More Info" button
5. Enter requested info: "Test - please provide receipts for Runway Gen-3 paid plan"
6. Submit

**Expected:**
- Creator receives email:
  - Subject: "Action Required: Additional Information Needed for [Title]"
  - Body includes requested info text
  - Mentions 14-day deadline
  - Link to dashboard
- Check creator's email inbox

**Pass criteria:**
- ✅ Email delivered
- ✅ Requested info displays correctly
- ✅ Dashboard link works
- ✅ 14-day deadline mentioned

---

### Test 4: Check Resend Logs

**After each test:**

1. Go to Resend dashboard: https://resend.com/logs
2. Find recent emails sent
3. Check delivery status:
   - ✅ Delivered
   - ⚠️ Bounced
   - ❌ Failed

**If failed:**
- Check error message in Resend logs
- Check Vercel logs for console errors
- Verify FROM_EMAIL domain is verified
- Verify RESEND_API_KEY is correct

---

### Test 5: Check Vercel Logs

**For each admin action:**

1. Go to Vercel dashboard → Runtime Logs
2. Look for email function calls:
   - `Error sending submission approved email:` (should NOT appear)
   - `Error sending submission rejected email:` (should NOT appear)
   - `Error sending info request email:` (should NOT appear)

**If errors appear:**
- Note the exact error message
- Check if it's a Resend API error
- Check if environment variables are missing

---

## 🐛 Troubleshooting

### Email Not Delivered

**Check 1: Domain Verification**
- Resend dashboard → Domains
- Ensure `superimmersive8.com` has green checkmark
- If not, update DNS records

**Check 2: API Key**
- Vercel settings → Environment Variables
- `RESEND_API_KEY` should start with `re_`
- Regenerate in Resend if needed

**Check 3: Rate Limits**
- Resend free tier: 100 emails/day, 3,000/month
- Check Resend dashboard for usage

### Email Goes to Spam

**Check 1: SPF/DKIM**
- Ensure DNS records for Resend are correct
- Test with mail-tester.com

**Check 2: FROM_EMAIL**
- Using `noreply@superimmersive8.com`
- Domain must be verified

### Email HTML Broken

**Check 1: Email Client**
- Test in multiple clients (Gmail, Outlook, Apple Mail)
- Some clients strip styles

**Check 2: Template Issues**
- All templates use inline styles (✅ good)
- Links use absolute URLs (✅ good)

---

## 📊 Test Results Template

Fill this out after testing:

### Test 1: Approve Email
- [ ] Email delivered
- [ ] Subject correct
- [ ] Body renders correctly
- [ ] Dashboard link works
- Time to deliver: _____ seconds
- Notes: _________________________________

### Test 2: Reject Email
- [ ] Email delivered
- [ ] Rejection reason shows correctly
- [ ] Admin contact link works
- Time to deliver: _____ seconds
- Notes: _________________________________

### Test 3: Request Info Email
- [ ] Email delivered
- [ ] Requested info shows correctly
- [ ] 14-day deadline mentioned
- [ ] Dashboard link works
- Time to deliver: _____ seconds
- Notes: _________________________________

### Resend Dashboard Check
- [ ] All emails show "Delivered" status
- [ ] No bounces or failures
- [ ] API usage within limits
- Notes: _________________________________

---

## ✅ Sign-Off

**Tested by:** _________________
**Date:** _________________
**All tests passed:** [ ] Yes  [ ] No
**Issues found:** _________________________________
**Production ready:** [ ] Yes  [ ] No

---

## 🚀 Production Checklist

Before going live:

- [ ] Domain verified in Resend
- [ ] All 3 environment variables set in Vercel
- [ ] All 3 email flows tested and passing
- [ ] Resend logs show deliveries
- [ ] No errors in Vercel logs
- [ ] Emails not going to spam
- [ ] Links work (dashboard URL correct)
- [ ] Styling renders in Gmail, Outlook, Apple Mail

---

## 📝 Email Templates Reference

**Location:** `/lib/emails.ts`

**Functions:**
1. `sendSubmissionReceivedEmail()` - On payment complete (not currently used)
2. `sendSubmissionApprovedEmail()` - On admin approval ✅
3. `sendSubmissionRejectedEmail()` - On admin rejection ✅
4. `sendInfoRequestEmail()` - On admin info request ✅
5. `sendOptInConfirmationEmail()` - On catalog opt-in approval ✅

**Called from:**
- `/api/admin/submissions/[id]/approve/route.ts`
- `/api/admin/submissions/[id]/reject/route.ts`
- `/api/admin/submissions/[id]/request-info/route.ts`

---

## 🔧 Future Improvements

**Not needed for MVP, but consider:**

- Email preview in admin panel before sending
- Email templates as React components (react-email)
- Email open tracking
- Link click tracking
- Resend webhooks for delivery status
- Creator reply-to handling (currently noreply@)
- Rich text formatting for admin-entered text
- Attachment support (Rights Package PDF)

---

**Last updated:** March 20, 2026
