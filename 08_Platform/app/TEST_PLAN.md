# Creator Portal - Test Plan

## Manual Testing Steps

### Prerequisites

- [ ] Stripe test mode keys added to `.env.local`
- [ ] Stripe product created ($499 price)
- [ ] Stripe webhook configured (local: Stripe CLI running)
- [ ] Development server running (`npm run dev`)

---

## 1. Auth Flow

### Sign Up

- [ ] Visit `http://localhost:3000`
- [ ] Should redirect to `/auth/login`
- [ ] Click "Sign up" link
- [ ] Fill out signup form:
  - Full Name: Test Creator
  - Email: test@example.com
  - Password: TestPassword123
- [ ] Click "Sign Up"
- [ ] Should see "Check your email" success message
- [ ] Check terminal for Supabase email confirmation link (or check email inbox)
- [ ] Click confirmation link
- [ ] Should redirect to `/dashboard`

### Login

- [ ] Visit `http://localhost:3000/auth/login`
- [ ] Enter email: test@example.com
- [ ] Enter password: TestPassword123
- [ ] Click "Sign In"
- [ ] Should redirect to `/dashboard`

### Session Persistence

- [ ] Refresh the page
- [ ] Should remain logged in
- [ ] Navigate to `/submit`
- [ ] Should have access (not redirected to login)

### Logout

- [ ] Click "Logout" button in nav
- [ ] Should redirect to `/auth/login`
- [ ] Try accessing `/dashboard` without logging in
- [ ] Should redirect to `/auth/login`

---

## 2. Submission Form

### Form Navigation

- [ ] Log in and navigate to `/submit`
- [ ] Should see "Section 1 of 10" and progress bar at 10%
- [ ] Click "Continue" through all sections
- [ ] Progress bar should update (20%, 30%, etc.)
- [ ] Click "Back" button
- [ ] Should return to previous section

### Form Validation

#### Section 2: Production Overview

- [ ] Leave "Film Title" blank
- [ ] Click "Continue"
- [ ] Should see validation error: "Title is required"
- [ ] Fill in "Film Title": My Test Film
- [ ] Click "Continue"
- [ ] Should proceed to Section 3

#### Section 3: Tool Disclosure

- [ ] Leave "AI Tools Used" blank
- [ ] Click "Continue"
- [ ] Should see validation error: "At least one tool must be listed"
- [ ] Fill in: "Runway Gen-3, Midjourney"
- [ ] Click "Continue"
- [ ] Should proceed to Section 4

#### Section 4: Human Authorship Declaration

- [ ] Enter less than 150 characters
- [ ] Click "Continue"
- [ ] Should see validation error: "Must be at least 150 words"
- [ ] Enter at least 150 characters (copy/paste lorem ipsum if needed)
- [ ] Click "Continue"
- [ ] Should proceed to Section 5

#### Section 5: Likeness & Identity

- [ ] Leave checkbox unchecked
- [ ] Click "Continue"
- [ ] Should see validation error: "You must confirm"
- [ ] Check the box
- [ ] Click "Continue"
- [ ] Should proceed to Section 6

#### Section 6: IP & Brand

- [ ] Leave checkbox unchecked
- [ ] Click "Continue"
- [ ] Should see validation error
- [ ] Check the box
- [ ] Click "Continue"
- [ ] Should proceed to Section 7

### Auto-Save to LocalStorage

- [ ] Fill out sections 1-5
- [ ] Refresh the page
- [ ] Form data should be restored from localStorage
- [ ] Verify fields are still filled in

### Complete Submission

- [ ] Fill out all 10 sections with valid data
- [ ] Navigate to Section 10 (Review & Submit)
- [ ] Should see summary of submission
- [ ] Click "Submit & Pay $499"

---

## 3. Stripe Payment Flow

**IMPORTANT: This will only work after Stripe keys are added**

### Create Checkout Session

- [ ] After clicking "Submit & Pay $499":
- [ ] Should redirect to Stripe Checkout page
- [ ] Page should show: "AI Video Chain of Title Verification - $499.00"

### Test Payment Success

- [ ] Enter test card: `4242 4242 4242 4242`
- [ ] Expiry: `12/34`
- [ ] CVC: `123`
- [ ] ZIP: `12345`
- [ ] Name: Test Creator
- [ ] Click "Pay"
- [ ] Should redirect to `/dashboard?payment=success`

### Verify Submission Created

- [ ] Check dashboard
- [ ] Should see new submission in table
- [ ] Status should be "PENDING"
- [ ] Check terminal for webhook logs (if Stripe CLI is running)

### Test Payment Cancellation

- [ ] Start a new submission
- [ ] Fill out form and click "Submit & Pay $499"
- [ ] On Stripe Checkout page, click browser back button
- [ ] Should return to `/submit?payment=cancelled`
- [ ] Form data should still be saved in localStorage

---

## 4. Dashboard

### Empty State

- [ ] Create a new account (different email)
- [ ] Navigate to `/dashboard`
- [ ] Should see: "You haven't submitted any videos yet."
- [ ] Should see "Submit Your First Video" button

### With Submissions

- [ ] Log in with account that has submissions
- [ ] Should see summary cards:
  - Total Submissions: 1 (or more)
  - Approved: 0
  - Catalog Listings: 0
  - Total Earnings: $0.00
- [ ] Should see submissions table with:
  - Film Title
  - Status badge (colored)
  - Submitted date
  - "View Details" button

### Status Badges

- [ ] Pending submission: Gray badge
- [ ] (Later) Approved: Green badge with checkmark
- [ ] (Later) Rejected: Red badge with X

---

## 5. Stripe Webhook Handler

**This test requires Stripe CLI running locally**

### Start Stripe CLI

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

### Verify Webhook Processes Payment

- [ ] Complete a test payment (see section 3)
- [ ] Check terminal for webhook event log
- [ ] Should see: "checkout.session.completed"
- [ ] Should see: "Submission payment processed: [submission-id]"

### Verify Database Updated

- [ ] Open Supabase dashboard
- [ ] Navigate to Table Editor → `submissions`
- [ ] Find the submission
- [ ] Verify fields:
  - `payment_status`: "paid"
  - `amount_paid`: 49900 (cents)
  - `stripe_payment_intent_id`: pi_... (populated)
  - `status`: "pending"

### Verify Email Sent

- [ ] Check terminal for email log
- [ ] Should see: "Sending submission received email to [email]"
- [ ] (If Resend is configured) Check email inbox for confirmation

---

## 6. Responsive Design

### Mobile (375px width)

- [ ] Open Chrome DevTools (F12)
- [ ] Toggle device toolbar (Ctrl+Shift+M / Cmd+Shift+M)
- [ ] Select "iPhone 12 Pro"
- [ ] Test:
  - [ ] Login page renders correctly
  - [ ] Dashboard nav collapses or wraps
  - [ ] Submissions table scrolls horizontally
  - [ ] Submit form sections display properly

### Tablet (768px width)

- [ ] Select "iPad"
- [ ] Test:
  - [ ] Dashboard summary cards layout (2x2 grid)
  - [ ] Form inputs take full width
  - [ ] Navigation is accessible

### Desktop (1440px width)

- [ ] Select "Responsive" and set to 1440px
- [ ] Test:
  - [ ] Dashboard summary cards layout (4 columns)
  - [ ] Form is centered and max-width constrained
  - [ ] Everything is readable and accessible

---

## 7. Error Handling

### Network Error

- [ ] Disconnect internet
- [ ] Try submitting form
- [ ] Should see error message
- [ ] Reconnect internet
- [ ] Retry submission
- [ ] Should work

### Invalid Email (Signup)

- [ ] Try signing up with email: `notanemail`
- [ ] Should see validation error: "Invalid email address"

### Duplicate Email (Signup)

- [ ] Try signing up with existing email
- [ ] Should see error: "Email already exists" (from Supabase)

### Wrong Password (Login)

- [ ] Enter correct email but wrong password
- [ ] Should see error: "Invalid email or password"

### Stripe Key Missing

- [ ] Remove Stripe keys from `.env.local`
- [ ] Try submitting form
- [ ] Should see error in console (form won't proceed past submission)

---

## 8. Edge Cases

### Incomplete Form Submission

- [ ] Fill out only sections 1-5
- [ ] Try clicking "Submit & Pay" on section 10
- [ ] Form validation should prevent submission
- [ ] Should see error messages for missing sections

### Session Expiry

- [ ] Log in
- [ ] Manually delete Supabase cookies (Chrome DevTools → Application → Cookies)
- [ ] Refresh page
- [ ] Should redirect to `/auth/login`

### Concurrent Sessions

- [ ] Log in on Chrome
- [ ] Log in on Firefox with same account
- [ ] Submit form on Chrome
- [ ] Check dashboard on Firefox
- [ ] Should see the new submission (after refresh)

---

## 9. Admin Workflow (Manual - no admin panel yet)

Since the admin panel is not built, these are manual database operations:

### Approve a Submission

- [ ] Open Supabase dashboard
- [ ] Go to Table Editor → `submissions`
- [ ] Find a pending submission
- [ ] Update:
  - `status`: "approved"
  - `reviewed_at`: current timestamp
- [ ] Click Save
- [ ] (Later) Manually send approval email or test email function

### Reject a Submission

- [ ] Update submission:
  - `status`: "rejected"
  - `review_notes`: "Reason for rejection"
  - `reviewed_at`: current timestamp
- [ ] Click Save

### Verify Status Updates in Dashboard

- [ ] Log in as the creator
- [ ] Navigate to `/dashboard`
- [ ] Should see updated status badge

---

## 10. Performance

### Page Load Times

- [ ] Use Chrome DevTools Network tab
- [ ] Measure page load times:
  - [ ] `/auth/login`: < 2 seconds
  - [ ] `/dashboard`: < 2 seconds (with 10 submissions)
  - [ ] `/submit`: < 3 seconds

### Form Responsiveness

- [ ] Type in form fields
- [ ] Should have no lag or delay
- [ ] Auto-save should not cause UI freezing

---

## Success Criteria

- [ ] All auth flows work (signup, login, logout)
- [ ] Submission form validates correctly
- [ ] Stripe payment flow completes successfully
- [ ] Webhook processes payment and updates database
- [ ] Dashboard displays submissions correctly
- [ ] Email notifications send (if Resend configured)
- [ ] Mobile responsive on iPhone, iPad, Desktop
- [ ] No console errors during normal usage

---

## Known Issues / Won't Fix in MVP

- [ ] File uploads for receipts/screenshots not implemented (shows input but doesn't save)
- [ ] Submission details page not built (only table view)
- [ ] Opt-in modal not implemented
- [ ] Rights Package PDF download not implemented
- [ ] Admin panel not built (use Supabase dashboard)

---

## Blockers

**Cannot test without:**

1. Stripe test mode keys in `.env.local`
2. Stripe product created with Price ID updated in code
3. Stripe webhook secret (from Stripe CLI or dashboard)

**Before production deployment:**

1. Switch to Stripe live mode keys
2. Set up production webhook endpoint
3. Update `NEXT_PUBLIC_SITE_URL` to production URL
4. Configure Resend domain for production emails

---

**Test Plan Status**: Ready for testing after Stripe setup
**Last Updated**: March 19, 2026
