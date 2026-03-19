# Deployment Guide - SI8 Creator Portal

Deploy the Creator Portal to production on Vercel.

## Prerequisites

- [x] Application tested locally
- [x] Stripe test mode working
- [ ] Stripe **live mode** keys ready
- [ ] Production domain ready (superimmersive8.com)
- [ ] Code pushed to GitHub

## Step 1: Push to GitHub

```bash
cd /Users/JD/Desktop/SuperImmersive8

# Add all platform files
git add 08_Platform/app

# Commit
git commit -m "Add Creator Portal MVP - Next.js 14 app with Stripe integration"

# Push to main branch
git push origin main
```

## Step 2: Deploy to Vercel

### 2.1 Import Project

1. Go to [vercel.com](https://vercel.com)
2. Click **"Add New Project"**
3. Import your GitHub repository: `aip-jd36/superimmersive8`
4. **Root Directory**: Set to `08_Platform/app`
5. **Framework Preset**: Next.js (should auto-detect)
6. Click **"Deploy"**

### 2.2 Add Environment Variables

Before the first deployment completes, add environment variables:

1. In Vercel dashboard → Project Settings → Environment Variables
2. Add the following (copy from your local `.env.local`):

```bash
# Supabase (same as local - already configured)
NEXT_PUBLIC_SUPABASE_URL=https://lehqgcgnenwdmuzudbrs.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Stripe (LIVE MODE - NOT test mode!)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_YOUR_LIVE_KEY
STRIPE_SECRET_KEY=sk_live_YOUR_LIVE_KEY
STRIPE_WEBHOOK_SECRET=whsec_YOUR_PRODUCTION_WEBHOOK_SECRET

# Email (same as local)
RESEND_API_KEY=re_Ers6t5kr_PKKxtTJMdG3S9mHEsZgq1Shi

# Site (UPDATE to production URL)
NEXT_PUBLIC_SITE_URL=https://www.superimmersive8.com
ADMIN_EMAIL=jd@superimmersive8.com
```

3. Click **"Save"**
4. Redeploy the project

## Step 3: Get Stripe Live Mode Keys

### 3.1 Switch to Live Mode

1. Go to [https://dashboard.stripe.com](https://dashboard.stripe.com)
2. **Disable Test Mode** (toggle in top right - should turn from orange to gray)
3. Navigate to **Developers → API keys**
4. Copy:
   - **Publishable key** (starts with `pk_live_...`)
   - **Secret key** (starts with `sk_live_...`)
5. Add to Vercel environment variables (see Step 2.2)

### 3.2 Create Live Product

1. Go to **Dashboard → Products → Add product** (in LIVE mode)
2. **Name**: AI Video Chain of Title Verification
3. **Price**: $499.00 USD (one-time payment)
4. Click **Save product**
5. Copy the **Price ID** (starts with `price_...`)

### 3.3 Update Price ID in Code

1. Edit `/08_Platform/app/lib/stripe.ts`:

```typescript
export const VERIFICATION_PRICE_ID = 'price_YOUR_LIVE_PRICE_ID'
```

2. Commit and push:

```bash
git add 08_Platform/app/lib/stripe.ts
git commit -m "Update Stripe price ID for production"
git push origin main
```

Vercel will auto-deploy the update.

## Step 4: Configure Production Webhook

### 4.1 Get Production URL

After deployment, Vercel gives you a URL like:
`https://your-project-name.vercel.app`

Or if custom domain is configured:
`https://www.superimmersive8.com`

### 4.2 Add Webhook Endpoint in Stripe

1. In Stripe dashboard (LIVE mode) → **Developers → Webhooks**
2. Click **"Add endpoint"**
3. **Endpoint URL**: `https://www.superimmersive8.com/api/webhooks/stripe`
4. **Events to send**: Select `checkout.session.completed`
5. Click **"Add endpoint"**
6. Copy the **Signing secret** (starts with `whsec_...`)

### 4.3 Update Webhook Secret in Vercel

1. Go to Vercel → Project Settings → Environment Variables
2. Update `STRIPE_WEBHOOK_SECRET` with the new production secret
3. Click **"Save"**
4. Redeploy (or wait for next git push to trigger deploy)

## Step 5: Configure Domain

### 5.1 Add Domain in Vercel

1. In Vercel → Project Settings → Domains
2. Add `superimmersive8.com` and `www.superimmersive8.com`
3. Vercel will provide DNS records

### 5.2 Update DNS (Bluehost)

1. Log in to Bluehost
2. Go to **Domains → DNS Management**
3. Add/update records:

**A Record (apex domain):**
```
Type: A
Host: @
Value: 76.76.21.21 (Vercel IP)
TTL: 3600
```

**CNAME Record (www subdomain):**
```
Type: CNAME
Host: www
Value: cname.vercel-dns.com
TTL: 3600
```

4. Save changes
5. Wait 24-48 hours for DNS propagation (usually faster)

### 5.3 Verify Domain

1. In Vercel, click **"Verify"** next to your domain
2. Once verified, set `www.superimmersive8.com` as primary domain
3. Enable **"Redirect to Primary Domain"** for the apex domain

## Step 6: Test Production Deployment

### 6.1 Smoke Tests

- [ ] Visit `https://www.superimmersive8.com`
- [ ] Should redirect to `/auth/login`
- [ ] Sign up with a real email
- [ ] Verify email confirmation works
- [ ] Log in
- [ ] Navigate to `/submit`
- [ ] Fill out form
- [ ] Click "Submit & Pay $499"
- [ ] **Use a REAL test card** (Stripe live mode still allows test cards in developer mode):
  - Card: 4242 4242 4242 4242
  - Exp: Any future date
  - CVC: Any 3 digits
- [ ] Complete payment
- [ ] Should redirect to `/dashboard?payment=success`
- [ ] Submission should appear in dashboard

### 6.2 Webhook Test

- [ ] Check Stripe dashboard → **Developers → Webhooks → your-endpoint**
- [ ] Should see recent events with green checkmarks (successful delivery)
- [ ] If errors, check Vercel logs:
  - Vercel → Project → Deployments → [latest] → Logs

### 6.3 Email Test

- [ ] After completing payment, check email
- [ ] Should receive "Submission received" email
- [ ] Verify email content is correct

## Step 7: Monitor & Debug

### Vercel Logs

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# View logs
vercel logs
```

Or view in dashboard: **Vercel → Project → Deployments → [latest] → Logs**

### Stripe Logs

1. Stripe dashboard → **Developers → Events**
2. Filter by `checkout.session.completed`
3. Check for errors

### Supabase Logs

1. Supabase dashboard → **Logs**
2. Filter by API logs to see database queries

## Step 8: Post-Deployment Checklist

- [ ] Production domain accessible (superimmersive8.com)
- [ ] HTTPS enabled (automatic with Vercel)
- [ ] Auth flow works (signup, login, logout)
- [ ] Submission form loads and validates
- [ ] Stripe Checkout redirects correctly
- [ ] Payments process (webhook fires and updates database)
- [ ] Emails send via Resend
- [ ] Dashboard displays submissions
- [ ] Mobile responsive on real devices (test on iPhone, Android)
- [ ] No console errors in production
- [ ] Lighthouse score > 90 (Performance, Accessibility, Best Practices)

## Rollback Plan

If production deployment has issues:

1. **Revert to previous deployment** in Vercel:
   - Vercel → Deployments → [previous working deployment] → Promote to Production

2. **Rollback git commit**:
```bash
git revert HEAD
git push origin main
```

3. **Emergency: Take site offline**:
   - Vercel → Project Settings → Domains → Remove domain
   - Add maintenance page placeholder

## Security Checklist

- [ ] Stripe **live mode** keys are in environment variables (not hardcoded)
- [ ] Supabase RLS policies enabled on all tables
- [ ] Webhook signature verification enabled (`STRIPE_WEBHOOK_SECRET`)
- [ ] CORS configured correctly (Vercel handles this)
- [ ] Rate limiting enabled (TODO: Add rate limiting middleware)
- [ ] Environment variables are production-only (not test keys)

## Performance Optimization

- [ ] Enable **Vercel Edge Network** (automatic)
- [ ] Use **Vercel Image Optimization** for uploaded images (TODO: implement)
- [ ] Enable **Incremental Static Regeneration** for public catalog (TODO: after catalog built)
- [ ] Monitor **Vercel Analytics** for Core Web Vitals

## Cost Estimates (Month 1)

| Service | Plan | Cost |
|---------|------|------|
| Vercel | Pro (if needed) | $20/month (or Free tier) |
| Supabase | Free tier (up to 500MB database) | $0 (upgrade to $25/month if needed) |
| Stripe | Pay-as-you-go | 2.9% + $0.30 per transaction |
| Resend | Free tier (100 emails/day) | $0 (upgrade to $20/month if needed) |

**Estimated total**: $0-20/month for MVP (before revenue)

## Support

**Issues with deployment:**
- Check Vercel logs first
- Review Supabase dashboard for database errors
- Check Stripe webhook delivery logs
- Email: jd@superimmersive8.com

---

**Deployment Status**: Ready to deploy after Stripe live mode keys are added
**Last Updated**: March 19, 2026
