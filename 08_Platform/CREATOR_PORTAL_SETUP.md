# Creator Portal - Technical Setup Documentation

**Status:** Production-ready (March 19, 2026)
**URL:** https://si8-creator-portal.vercel.app

---

## Overview

The Creator Portal is the revenue-generating infrastructure for SI8's Rights Verified service. Filmmakers signup, submit their work, pay $499 via Stripe, and track their submission status in a dashboard.

**Flow:** Signup → Login → Submit (10 sections) → Pay $499 → Webhook → Dashboard

---

## Tech Stack

- **Frontend:** Next.js 14 (App Router, TypeScript, React Server Components)
- **Database:** Supabase (PostgreSQL with Row Level Security)
- **Authentication:** Supabase Auth
- **Payments:** Stripe (Test Mode → Live Mode ready)
- **Email:** Resend (SMTP for Supabase Auth + transactional emails)
- **Hosting:** Vercel (auto-deploy from GitHub)
- **Forms:** React Hook Form + Zod validation

---

## Environment Variables

### Required in Vercel (Production)

| Variable | Value | Where to Find |
|----------|-------|---------------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://lehqgcgnenwdmuzudbrs.supabase.co` | Supabase → Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGci...` | Supabase → Settings → API → Project API keys (anon/public) |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGci...` | Supabase → Settings → API → Project API keys (service_role) ⚠️ Secret |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_test_51TCcmw...` | Stripe → Developers → API keys → Publishable key |
| `STRIPE_SECRET_KEY` | `sk_test_51TCcmw...` | Stripe → Developers → API keys → Secret key ⚠️ Secret |
| `STRIPE_WEBHOOK_SECRET` | `whsec_mMn83I...` | Stripe → Developers → Webhooks → Signing secret ⚠️ Secret |
| `RESEND_API_KEY` | `re_...` | Resend → API Keys ⚠️ Secret |
| `ADMIN_EMAIL` | `jd@superimmersive8.com` | Your SI8 admin email |
| `NEXT_PUBLIC_SITE_URL` | `https://si8-creator-portal.vercel.app` | Your production URL (NOT preview URL) |

### Critical: URL Configuration

**❌ Common mistake:**
- Setting `NEXT_PUBLIC_SUPABASE_URL` to Vercel URL instead of Supabase URL
- Setting `NEXT_PUBLIC_SITE_URL` to git branch preview URL (`-git-main-` URL)

**✅ Correct:**
- `NEXT_PUBLIC_SUPABASE_URL` = Supabase project URL (ends in `.supabase.co`)
- `NEXT_PUBLIC_SITE_URL` = Production Vercel URL (`https://si8-creator-portal.vercel.app`)

---

## Database Schema

7 tables with Row Level Security (RLS):

1. **users** - User accounts (created by trigger on auth.users insert)
2. **submissions** - Filmmaker submissions (linked to users, contains all form data)
3. **opt_ins** - Filmmaker catalog opt-in (Tier 1 licensing)
4. **rights_packages** - Chain of Title PDFs (generated after approval)
5. **licensing_deals** - Buyer licensing transactions
6. **notifications** - In-app notifications
7. **audit_log** - Activity tracking

### Key Design Decisions

**RLS Bypass with service_role:**
- All database writes/reads go through API routes using `supabaseAdmin` (service_role key)
- RLS policies exist but are bypassed for reliability
- Client never calls Supabase directly (except auth)

**Why service_role instead of RLS policies?**
- Simpler debugging (no "permission denied" mysteries)
- Full control over authorization logic in API routes
- Easier to test (no policy conflicts)
- Production-ready architecture from day one

---

## Database Migrations

5 migrations applied in order:

| # | File | Purpose |
|---|------|---------|
| 001 | `001_initial_schema.sql` | Create all 7 tables + RLS policies |
| 002 | `002_fix_users_insert_policy.sql` | Allow users to insert own record (later replaced by trigger) |
| 003 | `003_auto_create_user_trigger.sql` | Auto-create public.users row when auth.users row created |
| 004 | `004_fix_submissions_foreign_key_check.sql` | Allow FK verification for submissions table |
| 005 | `005_grant_service_role_permissions.sql` | Grant service_role full access to all tables |

**To apply migrations:**
```sql
-- In Supabase SQL Editor, run each file in order
-- Check: Supabase → Database → Migrations (should show all 5)
```

---

## API Routes

### `/api/submissions/create` (POST)
**Purpose:** Create new submission (bypasses RLS with service_role)
**Input:** `{ submissionData, userId }`
**Output:** `{ submission }` with ID
**Called by:** Submit form (`/submit`)

### `/api/submissions` (GET)
**Purpose:** Fetch user's submissions for dashboard
**Input:** Session cookie (authenticated)
**Output:** `{ submissions: [] }`
**Called by:** Dashboard page (`/dashboard`) - **No longer used** (now uses direct supabaseAdmin call)

### `/api/checkout/create-session` (POST)
**Purpose:** Create Stripe checkout session
**Input:** `{ submissionId, creatorEmail }`
**Output:** `{ url }` (redirect to Stripe checkout)
**Called by:** Submit form after submission created

### `/api/webhooks/stripe` (POST)
**Purpose:** Process Stripe webhook events
**Input:** Stripe webhook payload + signature
**Events handled:** `checkout.session.completed`
**Actions:**
- Updates submission: `payment_status = 'paid'`, `status = 'pending'`
- Stores Stripe IDs: `stripe_payment_intent_id`, `stripe_checkout_session_id`, `amount_paid`
- Sends confirmation email to filmmaker

**Webhook endpoint:** `https://si8-creator-portal.vercel.app/api/webhooks/stripe`
**Configured in:** Stripe → Developers → Webhooks

---

## Stripe Configuration

### Test Mode Setup

1. **Product:** "AI Video Chain of Title Verification"
   - Price: $499.00 USD
   - Type: One-time payment
   - Price ID: `price_1TCgphDHFv9ajBxS0Fj9f1h2`

2. **Webhook Endpoint:**
   - URL: `https://si8-creator-portal.vercel.app/api/webhooks/stripe`
   - Events: `checkout.session.completed`
   - Signing secret: Set in `STRIPE_WEBHOOK_SECRET` env var

3. **Test Cards:**
   - Success: `4242 4242 4242 4242`
   - Decline: `4000 0000 0000 0002`

### Switching to Live Mode

**Checklist:**
- [ ] Create Live Mode product in Stripe (same price $499)
- [ ] Get Live Mode API keys (pk_live_... and sk_live_...)
- [ ] Create Live Mode webhook endpoint
- [ ] Update Vercel env vars:
  - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` → Live key
  - `STRIPE_SECRET_KEY` → Live key
  - `STRIPE_WEBHOOK_SECRET` → Live webhook secret
- [ ] Test with real card (small amount first)

---

## Email Configuration

### Resend Integration

**SMTP for Supabase Auth:**
- Host: `smtp.resend.com`
- Port: `465` (or `587`)
- Username: `resend`
- Password: Your Resend API key

**Transactional Emails:**
- Submission confirmation (filmmaker receives)
- Internal notification (SI8 admin receives)
- Status change notifications (future)

**Templates in:** `/lib/emails.ts`

---

## Deployment

### Auto-Deploy from GitHub

**Repository:** https://github.com/aip-jd36/superimmersive8.git
**Branch:** `main` (Platform code is in `08_Platform/app/`)
**Vercel Project:** si8-creator-portal

**Deploy trigger:** Any push to `main` branch

### Manual Deploy

```bash
cd 08_Platform/app
vercel --prod
```

---

## Testing Checklist

### End-to-End Test Flow

- [ ] Signup with new email
- [ ] Check email for verification link
- [ ] Verify email, login
- [ ] Submit form (all 10 sections)
- [ ] Pay with test card `4242 4242 4242 4242`
- [ ] Verify redirect to dashboard (not Vercel login)
- [ ] Check dashboard shows submission with "PENDING" status
- [ ] Check Stripe dashboard shows payment succeeded
- [ ] Check Stripe webhook delivered (200 OK)
- [ ] Check filmmaker received confirmation email
- [ ] Check admin received internal notification

### Database Verification

```sql
-- Check submission was created
SELECT * FROM submissions ORDER BY created_at DESC LIMIT 1;

-- Check payment status
SELECT id, title, payment_status, stripe_payment_intent_id, amount_paid
FROM submissions
WHERE payment_status = 'paid'
ORDER BY created_at DESC;

-- Count all submissions
SELECT
  COUNT(*) as total_submissions,
  COUNT(CASE WHEN payment_status = 'paid' THEN 1 END) as paid,
  COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_review
FROM submissions;
```

---

## Production Test Results

**Date:** March 19, 2026
**Status:** ✅ All tests passed

| Test Account | Submission Title | Payment | Dashboard | Webhook | Email |
|--------------|------------------|---------|-----------|---------|-------|
| jd@aipenguins.com | Test1 | ✅ $499 | ✅ Shows | ✅ 200 OK | ✅ Sent |
| jd@standingencore.com | STEC_TEST | ✅ $499 | ✅ Shows | ✅ 200 OK | ✅ Sent |
| jdchangmedia@gmail.com | JDCTEST | ✅ $499 | ✅ Shows | ✅ 200 OK | ✅ Sent |

**Total test revenue:** $1,497 (3 submissions × $499)

---

## Public Catalog (Added March 20, 2026)

### Overview

Public-facing catalog at `/catalog` where approved, opted-in works are displayed for licensing. Filmmakers opt in during submission (Section 10), admin approves entries, videos appear in grid with click-to-play modal.

### Submit Form - Section 10: Video & Catalog

**New fields added:**
- **video_url** (required) - YouTube or Vimeo URL
- **thumbnail_url** (optional) - Custom thumbnail, auto-generated if not provided
- **public_description** (optional) - Falls back to logline from Section 2
- **catalog_opt_in** (boolean) - Checkbox: "List in Public Catalog (after approval)"

**Schema validation:**
```typescript
video_url: z.string().url('Must be a valid URL').min(1),
thumbnail_url: z.string().url().optional(),
public_description: z.string().max(500).optional(),
catalog_opt_in: z.boolean().default(false),
```

### Catalog Opt-In System

**When `catalog_opt_in = true`:**
1. API creates record in `opt_ins` table
2. Links to submission via `submission_id`
3. Stores: `video_url`, `thumbnail_url`, `public_description`
4. Sets `visible = false` (admin must approve)
5. `catalog_id` is `null` (assigned by admin)

**opt_ins table schema:**
```sql
CREATE TABLE public.opt_ins (
  id UUID PRIMARY KEY,
  submission_id UUID REFERENCES submissions(id) UNIQUE NOT NULL,
  catalog_id TEXT UNIQUE, -- SI8-2026-0001 format
  opted_in BOOLEAN DEFAULT FALSE,
  video_url TEXT,
  thumbnail_url TEXT,
  public_description TEXT,
  visible BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Public Catalog Page

**URL:** `https://si8-creator-portal.vercel.app/catalog`

**Features:**
- Responsive grid layout (3 cols desktop, 2 tablet, 1 mobile)
- Auto-generated thumbnails from YouTube/Vimeo
- Catalog ID badge in top-right corner
- Genre tags
- Filmmaker attribution
- Click video → modal opens with iframe player

**API Route:** `/api/catalog`
```typescript
// Fetches approved + visible entries
const { data: entries, error } = await supabaseAdmin
  .from('opt_ins')
  .select(`
    id, catalog_id, video_url, thumbnail_url, public_description,
    submission:submissions!inner (
      title, genre, filmmaker_name, status
    )
  `)
  .eq('opted_in', true)
  .eq('visible', true)
  .eq('submission.status', 'approved')
  .order('created_at', { ascending: false })
```

**Note:** Uses `!inner` join to ensure only entries with approved submissions are returned.

### Video Modal Player

**Features:**
- Click video → modal opens
- YouTube/Vimeo iframe embed with autoplay
- Click X or outside modal to close
- Displays: title, filmmaker, description, catalog ID
- "Request License" button (placeholder)

**Helper Functions:**
```typescript
// Convert watch URLs to embed format
getEmbedUrl(url: string): string
  // YouTube: youtube.com/watch?v=ABC → youtube.com/embed/ABC?autoplay=1
  // Vimeo: vimeo.com/123 → player.vimeo.com/video/123?autoplay=1

// Auto-generate thumbnails
getThumbnailUrl(videoUrl: string, provided: string | null): string
  // YouTube: img.youtube.com/vi/{videoId}/maxresdefault.jpg
  // Vimeo: placeholder (API integration needed)
```

### Admin Approval Workflow (Manual)

**To approve a catalog entry:**
```sql
-- 1. Approve the submission
UPDATE submissions
SET status = 'approved'
WHERE id = 'SUBMISSION_ID';

-- 2. Make visible and assign catalog ID
UPDATE opt_ins
SET visible = true,
    catalog_id = 'SI8-2026-0001'
WHERE submission_id = 'SUBMISSION_ID';
```

**Catalog ID format:** `SI8-YYYY-####` (e.g., SI8-2026-0001)

### Testing Catalog Display

**Verify opt-in was created:**
```sql
SELECT
  s.id, s.title, s.status,
  o.opted_in, o.video_url, o.visible, o.catalog_id
FROM submissions s
LEFT JOIN opt_ins o ON o.submission_id = s.id
WHERE s.title = 'YOUR_TITLE';
```

**Check what catalog API returns:**
```sql
SELECT
  o.id, o.catalog_id, o.video_url, o.visible,
  s.title, s.genre, s.filmmaker_name, s.status
FROM opt_ins o
JOIN submissions s ON o.submission_id = s.id
WHERE o.opted_in = true
  AND o.visible = true
  AND s.status = 'approved';
```

### Production Test Results

**Test entry:** jdchangmedia@gmail.com → "TESTLINK"
- ✅ Video URL: `https://youtu.be/Z0tJ3p5U9Cs`
- ✅ Catalog ID: `SI8-2026-0001`
- ✅ Displays in catalog grid
- ✅ Modal opens with YouTube player
- ✅ Video plays with autoplay
- ✅ All metadata displayed correctly

---

## Known Issues & Fixes

### Issue 1: "Unexpected token '<', '<!DOCTYPE'... is not valid JSON"
**Cause:** `NEXT_PUBLIC_SUPABASE_URL` was set to Vercel URL instead of Supabase URL
**Fix:** Set to correct Supabase project URL (`https://lehqgcgnenwdmuzudbrs.supabase.co`)

### Issue 2: Post-payment redirect to Vercel login page
**Cause:** `NEXT_PUBLIC_SITE_URL` was set to git branch preview URL
**Fix:** Set to production URL (`https://si8-creator-portal.vercel.app`)

### Issue 3: Dashboard showing 0 submissions despite successful payment
**Cause:** Server-to-server fetch not forwarding auth cookies properly
**Fix:** Changed dashboard to use `supabaseAdmin` directly (server component)

### Issue 4: "permission denied for table submissions"
**Cause:** service_role lacked table-level GRANT permissions
**Fix:** Applied migration 005 (`GRANT ALL ON ... TO service_role`)

### Issue 5: Catalog showing empty despite approved entries
**Cause:** Incorrect Supabase query syntax - `.eq('submissions.status', 'approved')` doesn't work on joined tables
**Fix:** Changed to `.eq('submission.status', 'approved')` (use alias) + added `!inner` join modifier
**Details:** PostgREST requires using relationship alias, not table name, when filtering on joined columns

---

## Architecture Principles

1. **Service_role for all database operations** - Bypass RLS complexity
2. **Server Components where possible** - Reduce client-side JavaScript
3. **API routes for client-triggered actions** - Submissions, checkout creation
4. **Direct supabaseAdmin for server-side queries** - Dashboard, admin panels
5. **Environment variables for all secrets** - Nothing hardcoded
6. **Test Mode first, Live Mode later** - Validate flow before real payments

---

## Next Steps (Post-MVP)

### Public Catalog Enhancements
- [ ] Add "Catalog" link to main navigation
- [ ] Catalog filters (genre, search, sort)
- [ ] "Request License" functionality (form or email)
- [ ] Vimeo thumbnail API integration
- [ ] Video view analytics

### Admin Review Panel
- [ ] Review queue page (`/admin/submissions`)
- [ ] Approve/reject actions with UI (currently manual SQL)
- [ ] Generate catalog_id automatically
- [ ] Set visible=true from admin panel
- [ ] Status change emails to filmmakers
- [ ] Notes/feedback field

### Chain of Title Generation
- [ ] 9-field template (PDF)
- [ ] Generate on approval
- [ ] Store in `rights_packages` table
- [ ] Email PDF to filmmaker

### Submission Detail View
- [ ] `/dashboard/submissions/[id]` page
- [ ] Show all submission fields
- [ ] Display review status + notes
- [ ] Download Chain of Title PDF (if approved)

### Analytics
- [ ] Track submission volume over time
- [ ] Tool usage breakdown (which AI tools are popular)
- [ ] Geographic distribution
- [ ] Approval rate metrics
- [ ] Catalog video views, modal opens, license requests

---

## Support & Troubleshooting

**Logs:**
- Vercel: Functions → Select function → Logs
- Stripe: Developers → Webhooks → Select endpoint → Attempts
- Supabase: Database → Logs

**Common Issues:**
1. Payment succeeded but dashboard empty → Check webhook delivered (Stripe)
2. Login fails with JSON error → Check `NEXT_PUBLIC_SUPABASE_URL`
3. Redirect to wrong URL after payment → Check `NEXT_PUBLIC_SITE_URL`
4. Database errors → Check service_role permissions (migration 005)

**Contact:** jd@superimmersive8.com

---

**Last Updated:** March 20, 2026
