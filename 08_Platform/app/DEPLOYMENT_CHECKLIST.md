# Production Deployment Checklist

**Deployment Date:** March 20, 2026
**Version:** Creator Portal v1.0 + PRD v3 Form + PDF Generation
**Target:** Vercel Production

---

## Pre-Deployment Checklist

### ✅ Code Preparation

- [x] All features committed to git
- [x] No console.log statements in production code (keep debug logs for now - helpful)
- [x] All TypeScript errors resolved
- [ ] Run `npm run build` locally to verify no build errors
- [ ] Test submission form locally
- [ ] Test admin panel locally

### ✅ Documentation

- [x] FILE_UPLOAD_IMPLEMENTATION.md created
- [x] PDF_GENERATION_IMPLEMENTATION.md created
- [x] STORAGE_SETUP_SUBMISSION_FILES.md created
- [x] DEVELOPMENT_GUIDE.md exists
- [x] README.md up to date

---

## Step 1: Supabase Storage Setup

**CRITICAL:** Must be done before deployment or file uploads will fail.

### Create `submission-files` Bucket

1. Go to: https://supabase.com/dashboard/project/YOUR_PROJECT_ID/storage/buckets
2. Click **"New bucket"**
3. Configure:
   ```
   Name: submission-files
   Public bucket: NO (unchecked) ✓
   File size limit: 10 MB
   Allowed MIME types: image/jpeg, image/png, application/pdf
   ```
4. Click **"Create bucket"**

### Configure RLS Policies

**Option A: Via SQL Editor (Recommended)**

Go to: https://supabase.com/dashboard/project/YOUR_PROJECT_ID/sql/new

Run this script:

```sql
-- Enable RLS on storage.objects (if not already enabled)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy 1: Creator upload access
CREATE POLICY "Creators can upload submission files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'submission-files' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy 2: Creator read own files
CREATE POLICY "Creators can read their own submission files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'submission-files' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy 3: Admin read all files
CREATE POLICY "Admins can read all submission files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'submission-files' AND
  (SELECT is_admin FROM public.users WHERE id = auth.uid()) = true
);

-- Policy 4: Admin delete files
CREATE POLICY "Admins can delete submission files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'submission-files' AND
  (SELECT is_admin FROM public.users WHERE id = auth.uid()) = true
);

-- Policy 5: Creator update own files
CREATE POLICY "Creators can update their own submission files"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'submission-files' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

**Option B: Via Dashboard (Manual)**

Follow instructions in `STORAGE_SETUP_SUBMISSION_FILES.md`

### Verify `documents` Bucket Exists

The `documents` bucket should already exist (for Chain of Title PDFs).

**Check:**
1. Go to Storage → Buckets
2. Verify `documents` bucket exists
3. Verify it's set to **Public**
4. Verify RLS policies exist for admin write access

If not, see `STORAGE_SETUP.md` for setup instructions.

---

## Step 2: Database Schema Verification

### Verify Tables Exist

Run this query in SQL Editor to check all required tables:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
  AND table_name IN (
    'users',
    'submissions',
    'opt_ins',
    'rights_packages',
    'licensing_deals',
    'notifications'
  )
ORDER BY table_name;
```

**Expected result:** All 6 tables listed.

### Verify `rights_packages` Schema

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'rights_packages'
ORDER BY ordinal_position;
```

**Required columns:**
- `id` (uuid)
- `submission_id` (uuid)
- `catalog_id` (varchar)
- `document_url` (text)
- `document_path` (text)
- `generated_at` (timestamp)
- `format` (varchar)

**If missing columns, run:**

```sql
ALTER TABLE rights_packages
ADD COLUMN IF NOT EXISTS document_url text,
ADD COLUMN IF NOT EXISTS document_path text,
ADD COLUMN IF NOT EXISTS generated_at timestamp with time zone DEFAULT now(),
ADD COLUMN IF NOT EXISTS format varchar(10) DEFAULT 'pdf';
```

---

## Step 3: Environment Variables

### Verify `.env.local` (Local)

Ensure your local `.env.local` has:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Site
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Resend
RESEND_API_KEY=re_...
```

### Add to Vercel (Production)

**IMPORTANT:** Update these values for production!

1. Go to: https://vercel.com/dashboard
2. Select your project
3. Go to **Settings → Environment Variables**
4. Add/update these variables:

```bash
# Supabase (SAME as local)
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Site (CHANGE to production URL)
NEXT_PUBLIC_SITE_URL=https://YOUR_VERCEL_APP.vercel.app
# OR if custom domain:
NEXT_PUBLIC_SITE_URL=https://portal.superimmersive8.com

# Stripe (CHANGE to production keys!)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_... (production webhook secret)

# Resend (SAME as local, or production key)
RESEND_API_KEY=re_...
```

**⚠️ CRITICAL:** Use **production Stripe keys** (pk_live_ and sk_live_), not test keys!

---

## Step 4: Stripe Production Setup

### 1. Switch to Live Mode

1. Go to: https://dashboard.stripe.com
2. Toggle **Test mode OFF** (top right)
3. You're now in **Live mode**

### 2. Get Production API Keys

1. Go to **Developers → API keys**
2. Copy:
   - **Publishable key** (starts with `pk_live_...`)
   - **Secret key** (starts with `sk_live_...`)
3. Add to Vercel environment variables (see Step 3)

### 3. Update Product Price ID

1. Go to **Products** in Stripe Dashboard
2. Find "AI Video Chain of Title Verification" product
3. Ensure price is **$499.00 USD** (one-time payment)
4. Copy **Price ID** (starts with `price_...`)
5. Update in code:

```bash
# Open this file:
vim 08_Platform/app/lib/stripe.ts

# Update the price ID:
export const VERIFICATION_PRICE_ID = 'price_LIVE_PRICE_ID_HERE'
```

6. Commit change:
```bash
git add 08_Platform/app/lib/stripe.ts
git commit -m "Update Stripe price ID for production"
git push origin main
```

### 4. Set Up Production Webhook

1. Go to **Developers → Webhooks → Add endpoint**
2. Configure:
   ```
   Endpoint URL: https://YOUR_VERCEL_APP.vercel.app/api/webhooks/stripe
   Description: Creator Portal Production
   Events to send: checkout.session.completed
   ```
3. Click **Add endpoint**
4. Copy **Signing secret** (starts with `whsec_...`)
5. Add to Vercel environment variables as `STRIPE_WEBHOOK_SECRET`

---

## Step 5: Build and Test Locally

Before deploying, verify everything builds:

```bash
cd /Users/JD/Desktop/SuperImmersive8/08_Platform/app

# Install dependencies (if needed)
npm install

# Run type checking
npx tsc --noEmit

# Build production bundle
npm run build

# Test production build locally
npm run start
```

**Check for:**
- ✅ No TypeScript errors
- ✅ No build errors
- ✅ App starts successfully
- ✅ Can access http://localhost:3000

**Test these flows:**
1. Navigate to `/submit` - form loads
2. Click "Add Tool" - modal opens
3. Try file upload - no errors (will fail without auth, that's OK)
4. Navigate to `/admin` - redirects to login (expected)

**If any errors:** Fix before deploying!

---

## Step 6: Deploy to Vercel

### Option A: GitHub Integration (Recommended)

1. **Push to GitHub:**
   ```bash
   cd /Users/JD/Desktop/SuperImmersive8
   git status  # Verify all changes committed
   git push origin main
   ```

2. **Vercel auto-deploys:**
   - Vercel detects the push
   - Starts build automatically
   - Watch build logs in Vercel dashboard

3. **Monitor deployment:**
   - Go to: https://vercel.com/dashboard
   - Click on your project
   - View deployment logs
   - Wait for "Ready" status

### Option B: Manual Deploy (If GitHub not connected)

```bash
cd /Users/JD/Desktop/SuperImmersive8/08_Platform/app

# Install Vercel CLI (if not installed)
npm i -g vercel

# Login to Vercel
vercel login

# Deploy to production
vercel --prod
```

**Follow prompts:**
- Project name: `si8-creator-portal`
- Framework: Next.js (auto-detected)
- Root directory: `./` (current directory)

---

## Step 7: Post-Deployment Verification

### Smoke Tests (Production)

Visit your production URL (e.g., `https://si8-creator-portal.vercel.app`)

**✅ Test 1: Homepage loads**
- Navigate to `/`
- Should redirect to `/dashboard` or `/auth/login`
- No errors in browser console

**✅ Test 2: Submission form loads**
- Navigate to `/submit` (may need auth first)
- Form displays with 11 sections
- Progress bar shows
- "Add Tool" button visible

**✅ Test 3: Tool modal works**
- Click "Add Tool"
- Modal opens
- All dropdowns populated
- File upload area visible

**✅ Test 4: Admin panel loads**
- Navigate to `/admin` (need admin auth)
- Login as admin user
- Submissions list displays
- Can click into submission detail

**✅ Test 5: File upload works**
- Login as creator
- Go to `/submit`
- Click "Add Tool"
- Try uploading a receipt (PDF or image)
- Should upload successfully (no errors)

**✅ Test 6: PDF generation works**
- Login as admin
- Approve a submission with catalog opt-in
- Check: PDF generates automatically
- Download button appears
- PDF downloads and displays correctly

### Check Logs

**Vercel Logs:**
1. Go to Vercel Dashboard → Your Project → Logs
2. Watch for any errors during:
   - Page loads
   - Form submissions
   - File uploads
   - PDF generation

**Supabase Logs:**
1. Go to Supabase Dashboard → Logs
2. Check for:
   - Storage errors (file uploads)
   - Database errors (submissions, rights_packages)
   - Auth errors

---

## Step 8: Create Admin User (If Needed)

If you don't have an admin user yet:

### Option A: Via SQL

```sql
-- Find your user ID
SELECT id, email FROM auth.users WHERE email = 'your-email@example.com';

-- Set as admin in public.users
UPDATE public.users
SET is_admin = true
WHERE id = 'YOUR_USER_ID_FROM_ABOVE';
```

### Option B: Via Dashboard

1. Go to Supabase Dashboard → Table Editor → `users`
2. Find your row
3. Edit `is_admin` column to `true`
4. Save

---

## Step 9: Test Complete Workflow (End-to-End)

### As Creator (Test Account Recommended)

1. **Signup:**
   - Go to `/auth/signup`
   - Create test account: `test-creator@example.com`
   - Verify email if required

2. **Submit content:**
   - Go to `/submit`
   - Fill Section 1 (auto-filled)
   - Fill Section 2 (Production Overview)
   - **Section 3 (Tools):**
     - Click "Add Tool"
     - Select "Runway Gen-3"
     - Enter version "Alpha"
     - Select plan "Pro"
     - Enter dates
     - Upload receipt (test PDF)
     - Click "Add Tool"
     - Tool card appears
   - Fill Section 4 (Authorship - 150 chars minimum)
   - Check all boxes in Section 5 (Likeness - 4 boxes)
   - Check all boxes in Section 6 (IP - 3 boxes)
   - Select Section 7 (Audio Source)
   - Select Section 8 (Modification Rights - radio button)
   - Select Section 9 (Territory - dropdown)
   - Fill Section 10 (Video URL + catalog opt-in checkbox)
   - Review Section 11
   - Click "Submit & Pay $499"

3. **Payment (Test Mode):**
   - Stripe Checkout opens
   - Use test card: `4242 4242 4242 4242`
   - Expiry: Any future date (e.g., `12/34`)
   - CVC: Any 3 digits (e.g., `123`)
   - Complete payment

4. **Verify:**
   - Redirects to success page
   - Email received (submission confirmation)
   - Can see submission in `/dashboard`

### As Admin

1. **Login as admin:**
   - Go to `/auth/login`
   - Login with admin account

2. **Review submission:**
   - Go to `/admin`
   - See pending submission from test creator
   - Click to view details
   - Verify all data displays correctly:
     - Tools table shows
     - All checkboxes marked
     - Radio button selection visible
     - Territory shown

3. **Approve submission:**
   - Click "Approve" button
   - Confirm catalog opt-in checked
   - Watch console for PDF generation logs
   - Should see success message

4. **Verify PDF:**
   - Green "Chain of Title Generated" card appears
   - Click "Download PDF"
   - PDF opens in new tab
   - Verify:
     - All 9 sections present
     - Tool table formatted correctly
     - SI8 branding visible
     - No formatting errors

5. **Check catalog:**
   - Go to `/catalog` (public catalog)
   - See approved entry with catalog ID
   - Video displays
   - Can click to view detail

### Verify Email Delivery

- Creator receives: "Submission Approved" email
- Creator receives: "Catalog Opt-In Confirmation" email
- Check spam folder if not received
- Verify Resend dashboard for delivery status

---

## Step 10: Monitor for 24 Hours

### Watch for Issues

**Day 1 Monitoring:**
- [ ] Check Vercel logs every few hours
- [ ] Check Supabase logs
- [ ] Monitor Stripe webhook deliveries
- [ ] Check Resend email delivery rates
- [ ] Watch for any user-reported errors

**Common Issues to Watch For:**
- File upload failures (Storage permissions)
- PDF generation errors (missing data)
- Payment webhook failures (Stripe config)
- Email delivery issues (Resend limits)

---

## Rollback Plan (If Issues Found)

### Minor Issues
- Can be fixed with code updates
- Push fix to GitHub
- Vercel auto-deploys
- No rollback needed

### Critical Issues
1. **Rollback to previous deployment:**
   - Go to Vercel Dashboard → Deployments
   - Find previous working deployment
   - Click "⋯" → "Promote to Production"

2. **Disable feature:**
   - Can disable file uploads by commenting out FileUpload component
   - Can disable PDF generation by commenting out generateChainOfTitlePDF call
   - Quick hotfix, then proper fix later

---

## Success Criteria

### ✅ Deployment Successful When:

- [ ] All pages load without errors
- [ ] Submission form works end-to-end
- [ ] File uploads succeed (receipts, screenshots)
- [ ] Tool modal works (add, edit, remove)
- [ ] All form validations work
- [ ] Payment processing works (test mode)
- [ ] Admin panel accessible
- [ ] Approve/reject actions work
- [ ] PDF generates on approval
- [ ] PDF downloads correctly
- [ ] Catalog displays entries
- [ ] Emails deliver successfully
- [ ] No errors in Vercel logs
- [ ] No errors in Supabase logs

### 🎯 Ready for Production When:

- [ ] All success criteria met
- [ ] Test submission completed end-to-end
- [ ] PDF verified (all 9 fields, proper formatting)
- [ ] Admin workflow tested
- [ ] No critical errors in 24-hour monitoring
- [ ] Stripe production mode configured
- [ ] All environment variables updated

---

## Post-Deployment Tasks

### Immediate (After Deployment)

- [ ] Update Stripe to **Live Mode** (remove test mode keys)
- [ ] Test with real credit card (small amount, then refund)
- [ ] Create admin user guide (how to review submissions)
- [ ] Set up monitoring alerts (Vercel, Supabase)

### Within 1 Week

- [ ] Onboard first filmmaker (beta tester)
- [ ] Get feedback on submission form
- [ ] Monitor PDF generation quality
- [ ] Collect any bug reports

### Within 1 Month

- [ ] Add actual SI8 logo to PDF (replace text logo)
- [ ] Build creator submission detail page (`/dashboard/submissions/[id]`)
- [ ] Add analytics tracking
- [ ] Consider E&O insurance investigation

---

## Support & Troubleshooting

### Getting Help

**Vercel Issues:**
- Documentation: https://vercel.com/docs
- Support: https://vercel.com/support

**Supabase Issues:**
- Documentation: https://supabase.com/docs
- Community: https://github.com/supabase/supabase/discussions

**Stripe Issues:**
- Documentation: https://stripe.com/docs
- Support: https://support.stripe.com

**Next.js Issues:**
- Documentation: https://nextjs.org/docs
- GitHub: https://github.com/vercel/next.js/issues

### Common Deployment Errors

**Error: "Module not found: @react-pdf/renderer"**
- **Cause:** Package not in package.json
- **Fix:** Run `npm install @react-pdf/renderer` and redeploy

**Error: "Could not upload file to storage"**
- **Cause:** Storage bucket not created or RLS policies missing
- **Fix:** Follow Step 1 (Supabase Storage Setup)

**Error: "PDF generation failed"**
- **Cause:** Invalid data structure or missing tools
- **Fix:** Check console logs, verify submission data format

**Error: "Stripe webhook signature verification failed"**
- **Cause:** Wrong webhook secret in environment variables
- **Fix:** Update `STRIPE_WEBHOOK_SECRET` in Vercel (Step 4)

---

## Contact & Escalation

**For urgent production issues:**
- Check logs first (Vercel + Supabase)
- Review this checklist
- Document exact error messages
- Check GitHub issues for similar problems

---

**Deployment Prepared By:** Claude Sonnet 4.5
**Date:** March 20, 2026
**Version:** Creator Portal v1.0 with PRD v3 Form + PDF Generation
**Status:** Ready for Production Deployment ✅
