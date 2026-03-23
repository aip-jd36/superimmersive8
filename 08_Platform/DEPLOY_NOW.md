# 🚀 Quick Deployment Guide

**Time Required:** 15-20 minutes
**Difficulty:** Medium

---

## Before You Start

You need:
- ✅ Supabase account (already have)
- ✅ Vercel account
- ✅ Stripe account (production mode)
- ✅ Code pushed to GitHub

---

## Step 1: Supabase Storage ✅ ALREADY CONFIGURED

**All 6 buckets are live in production.** No action needed — confirmed Mar 23, 2026.

| Bucket | Public | Purpose |
|--------|--------|---------|
| `submission-files` | No | Creator-uploaded receipts/files |
| `documents` | **Yes** | Chain of Title + Creator Record PDFs (generated server-side) |
| `catalog-videos` | Yes | Catalog video files |
| `catalog-thumbnails` | Yes | Catalog thumbnail images |
| `rights-packages` | No | (reserved) |
| `receipts` | No | (reserved) |

**PDF generation** (`generateChainOfTitle.tsx`, `generateCreatorRecordPDF()`) uploads to the `documents` bucket at path `rights-packages/{ID}_chain-of-title.pdf` or `rights-packages/{CR-ID}_creator-record.pdf`.

✅ **Done!** Storage is ready.

---

## Step 2: Database Schema (2 min)

Verify `rights_packages` table has PDF columns:

```sql
-- Run in Supabase SQL Editor
ALTER TABLE rights_packages
ADD COLUMN IF NOT EXISTS document_url text,
ADD COLUMN IF NOT EXISTS document_path text,
ADD COLUMN IF NOT EXISTS generated_at timestamp with time zone DEFAULT now(),
ADD COLUMN IF NOT EXISTS format varchar(10) DEFAULT 'pdf';
```

✅ **Done!** Database is ready.

---

## Step 3: Stripe Production Mode (3 min)

### Get Live Keys
1. Go to: https://dashboard.stripe.com
2. Toggle **Test mode OFF** → **Live mode**
3. Go to: Developers → API keys
4. Copy:
   - Publishable key (`pk_live_...`)
   - Secret key (`sk_live_...`)
5. **Save these** - you'll need them for Vercel

### Update Price ID in Code
1. Find your product: Dashboard → Products
2. Copy **Price ID** (starts with `price_...`)
3. Update code:

```bash
cd /Users/JD/Desktop/SuperImmersive8/08_Platform/app
# Edit lib/stripe.ts and replace the price ID
# Then commit:
git add lib/stripe.ts
git commit -m "Update Stripe price ID for production"
git push origin main
```

### Setup Webhook (Do AFTER Vercel deploy)
- We'll do this in Step 5 after we have the Vercel URL

✅ **Done!** (Webhook pending - Step 5)

---

## Step 4: Local Build Test (2 min)

Verify everything builds before deploying:

```bash
cd /Users/JD/Desktop/SuperImmersive8/08_Platform/app

# Build
npm run build

# Should see: "✓ Compiled successfully"
```

**If errors:** Fix them before proceeding!

✅ **Done!** Build verified.

---

## Step 5: Deploy to Vercel (3 min)

### Push to GitHub
```bash
cd /Users/JD/Desktop/SuperImmersive8
git status   # Verify clean
git push origin main
```

### Vercel Deployment

**If GitHub connected to Vercel:**
- Vercel auto-deploys on push
- Go to: https://vercel.com/dashboard
- Watch deployment logs
- Wait for "Ready" status

**If NOT connected:**
```bash
cd /Users/JD/Desktop/SuperImmersive8/08_Platform/app
vercel --prod
```

✅ **Done!** App is deployed.

---

## Step 6: Environment Variables (5 min)

**Go to:** Vercel Dashboard → Your Project → Settings → Environment Variables

**Add these (Production values):**

```bash
# Supabase (same as local)
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Site URL (CHANGE THIS!)
NEXT_PUBLIC_SITE_URL=https://YOUR_APP.vercel.app

# Stripe (PRODUCTION KEYS!)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=(get this in next step)

# Resend (same as local)
RESEND_API_KEY=re_...
```

**After adding variables:**
- Go to Deployments tab
- Click "⋯" on latest deployment
- Click "Redeploy"

---

## Step 7: Stripe Webhook (2 min)

**Now that you have Vercel URL:**

1. Go to: https://dashboard.stripe.com → Developers → Webhooks
2. Click "Add endpoint"
3. **Endpoint URL:** `https://YOUR_APP.vercel.app/api/webhooks/stripe`
4. **Events:** Select `checkout.session.completed`
5. Click "Add endpoint"
6. Copy **Signing secret** (`whsec_...`)
7. Go back to Vercel → Environment Variables
8. Add: `STRIPE_WEBHOOK_SECRET=whsec_...`
9. Redeploy again

✅ **Done!** Webhook configured.

---

## Step 8: Test Everything (5 min)

### Quick Smoke Test

**Visit:** `https://YOUR_APP.vercel.app`

1. ✅ Homepage loads (redirects to /dashboard or /auth/login)
2. ✅ Go to `/submit` - form loads with 11 sections
3. ✅ Click "Add Tool" - modal opens
4. ✅ Try uploading a file (if logged in)
5. ✅ Go to `/admin` - loads (need admin login)

**If any fail:** Check Vercel logs for errors

### Full End-to-End Test (Optional)

See `DEPLOYMENT_CHECKLIST.md` Step 9 for complete workflow test.

---

## ✅ You're Live!

**Your Creator Portal is now in production!**

### Next Steps:

1. **Create admin user** (if needed):
   ```sql
   -- In Supabase SQL Editor
   UPDATE public.users
   SET is_admin = true
   WHERE email = 'your-email@example.com';
   ```

2. **Test submission flow:**
   - Create test account
   - Submit content
   - Use test card: `4242 4242 4242 4242`
   - Approve as admin
   - Verify PDF generates

3. **Monitor for 24 hours:**
   - Check Vercel logs
   - Check Supabase logs
   - Watch for errors

---

## Troubleshooting

**File upload fails:**
- Check Supabase Storage bucket exists
- Verify RLS policies are correct
- Check browser console for errors

**PDF doesn't generate:**
- Check Vercel logs for errors
- Verify `@react-pdf/renderer` installed
- Check database `rights_packages` table

**Webhook fails:**
- Verify webhook secret in Vercel env vars
- Check Stripe Dashboard → Webhooks for delivery status
- Ensure endpoint URL is correct

---

## Need Help?

**Full documentation:** See `DEPLOYMENT_CHECKLIST.md`

**Common issues:** Check Vercel logs and Supabase logs first

**Still stuck?** Review Step-by-Step guide in full checklist

---

**Deployment Time:** ~15-20 minutes
**Status:** 🚀 Ready to Deploy
**Version:** Creator Portal v1.0 + PRD v3 + PDF Generation
