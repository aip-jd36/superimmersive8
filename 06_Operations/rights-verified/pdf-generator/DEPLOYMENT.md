# Deployment Guide - Vercel

Complete guide to deploying the Chain of Title Generator to Vercel with custom domain.

---

## Prerequisites

- [x] Vercel account (free tier works)
- [x] GitHub repo connected to Vercel
- [x] Custom domain: superimmersive8.com (already configured in Vercel)
- [x] Airtable API credentials

---

## Step 1: Install Vercel CLI (One-Time)

```bash
npm install -g vercel
```

---

## Step 2: Link Project to Vercel

```bash
cd 06_Operations/rights-verified/pdf-generator
vercel login
vercel link
```

**Prompts:**
- Set up and deploy: `Y`
- Scope: Your Vercel account
- Link to existing project: `N` (create new)
- Project name: `chain-of-title-generator`
- Directory: `.` (current directory)

---

## Step 3: Configure Environment Variables in Vercel

### Via Vercel Dashboard (Recommended):

1. Go to https://vercel.com/dashboard
2. Select your project: `chain-of-title-generator`
3. Go to **Settings** → **Environment Variables**
4. Add these variables:

| Variable | Value | Environment |
|----------|-------|-------------|
| `AIRTABLE_API_KEY` | Your API key from https://airtable.com/account | Production, Preview, Development |
| `AIRTABLE_BASE_ID` | Your base ID (starts with `app...`) | Production, Preview, Development |
| `AIRTABLE_TABLE_NAME` | `Rights Verified Submissions` | Production, Preview, Development |
| `AUTH_USERNAME` | `admin` (or your preferred username) | Production, Preview, Development |
| `AUTH_PASSWORD` | **Strong password** (generate with password manager) | Production, Preview, Development |

### Via CLI (Alternative):

```bash
vercel env add AIRTABLE_API_KEY
vercel env add AIRTABLE_BASE_ID
vercel env add AIRTABLE_TABLE_NAME
vercel env add AUTH_USERNAME
vercel env add AUTH_PASSWORD
```

---

## Step 4: Deploy to Vercel

### Test Deployment (Preview):

```bash
vercel
```

This creates a preview deployment. Test the URL to ensure everything works.

### Production Deployment:

```bash
vercel --prod
```

Your app is now live at: `https://chain-of-title-generator.vercel.app`

---

## Step 5: Configure Custom Domain

### Option A: Subdomain (Recommended)

**URL:** `admin.superimmersive8.com`

1. **In Vercel Dashboard:**
   - Go to project → **Settings** → **Domains**
   - Add domain: `admin.superimmersive8.com`
   - Vercel will show DNS configuration needed

2. **In Your DNS Provider (where superimmersive8.com is hosted):**
   - Add CNAME record:
     - Name: `admin`
     - Value: `cname.vercel-dns.com`
     - TTL: 3600

3. **Wait for DNS propagation** (~5-60 minutes)

4. **Verify:** Visit `https://admin.superimmersive8.com`

### Option B: Path-Based Routing (Advanced)

**URL:** `www.superimmersive8.com/admin`

This requires merging with your main website project or using Vercel rewrites. **Subdomain is simpler and recommended.**

---

## Step 6: Test the Deployment

1. **Visit your domain:** `https://admin.superimmersive8.com`

2. **Login prompt should appear:**
   ```
   Authentication Required
   The site says: "Chain of Title Generator"
   Username: [admin]
   Password: [●●●●●●●●]
   ```

3. **Test the workflow:**
   - Select an approved record
   - Click "Generate PDF"
   - PDF should download automatically

4. **Check for errors:**
   - Open browser DevTools → Console
   - Vercel Dashboard → Project → **Logs** (for server-side errors)

---

## Step 7: Share Access with Reviewers

**Send reviewers:**

1. **URL:** `https://admin.superimmersive8.com`
2. **Username:** `admin` (or whatever you set)
3. **Password:** (send securely - Signal, 1Password shared vault, etc.)

**Usage instructions:**
- Open URL → Enter credentials → Select record → Generate PDF
- PDF downloads automatically to their computer
- Upload PDF to Google Drive manually
- Update Airtable with PDF link

---

## Troubleshooting

### 502 Bad Gateway or Timeout

**Cause:** PDF generation took >10 seconds (Hobby tier limit) or >60 seconds (Pro tier limit)

**Solution:**
- Check Vercel logs: Dashboard → Project → **Logs**
- If timeout, upgrade to Vercel Pro ($20/month for 60s timeout)
- Optimize PDF generation (reduce template complexity)

### "Authentication required" loops

**Cause:** AUTH_USERNAME or AUTH_PASSWORD not set in Vercel environment variables

**Solution:**
- Verify environment variables in Vercel Dashboard → Settings → Environment Variables
- Redeploy: `vercel --prod`

### "Airtable credentials not configured"

**Cause:** AIRTABLE_API_KEY or AIRTABLE_BASE_ID missing

**Solution:**
- Add environment variables in Vercel Dashboard
- Redeploy: `vercel --prod`

### Chrome/Puppeteer fails in serverless function

**Cause:** `chrome-aws-lambda` not installed or incompatible version

**Solution:**
- Ensure `package.json` has `chrome-aws-lambda` and `puppeteer-core`
- Run `npm install`
- Commit `package.json` and `package-lock.json`
- Redeploy: `vercel --prod`

### PDF has missing data or {{placeholders}}

**Cause:** Airtable field names don't match script expectations

**Solution:**
- Check `lib/airtable.js` → `mapRecordToTemplateData()` function
- Update field names to match your Airtable structure
- Commit changes and redeploy

---

## Monitoring

### Check Deployment Logs:

```bash
vercel logs
```

Or in Dashboard: Project → **Logs**

### Check Function Execution Time:

Dashboard → Project → **Analytics** → Function duration

If consistently >8 seconds, consider upgrading to Pro tier.

---

## Updating the Deployment

### Deploy Changes:

```bash
git add -A
git commit -m "Update PDF generator"
git push origin main
vercel --prod
```

Vercel auto-deploys from GitHub (if you connected the repo).

### Update Environment Variables:

Vercel Dashboard → Settings → Environment Variables → Edit

**Important:** After changing env vars, redeploy:
```bash
vercel --prod
```

---

## Cost Estimate

**Vercel Hobby (Free):**
- 100GB bandwidth/month
- 10s function timeout
- Unlimited deployments
- **Cost:** $0/month
- **Good for:** <50 PDFs/month, <10s generation time

**Vercel Pro ($20/month):**
- 1TB bandwidth/month
- 60s function timeout
- Priority support
- **Cost:** $20/month
- **Good for:** >50 PDFs/month, 10-60s generation time, professional deployment

**Recommendation for Year 1:** Start with Hobby, upgrade to Pro if you hit limits.

---

## Security Notes

1. **Password Strength:**
   - Use a strong password (16+ characters, random)
   - Store in password manager
   - Share securely with reviewers (Signal, encrypted email)

2. **Airtable API Key:**
   - Keep secret (never commit to git)
   - Stored only in Vercel environment variables
   - Rotate if compromised

3. **HTTPS:**
   - Vercel automatically provides SSL/TLS
   - All traffic encrypted
   - Custom domain gets free SSL certificate

4. **Access Control:**
   - HTTP Basic Auth protects the entire app
   - All reviewers share same credentials (upgrade to NextAuth for individual accounts)

---

## Next Steps After Deployment

- [ ] Test with real Airtable record
- [ ] Share URL + credentials with first reviewer
- [ ] Monitor Vercel logs for errors
- [ ] Check function execution times (upgrade to Pro if needed)
- [ ] Document any field mapping customizations
- [ ] Set up monitoring/alerting (optional)

---

## Rollback (If Needed)

### Rollback to previous deployment:

Vercel Dashboard → Project → **Deployments** → Find previous working deployment → Click **⋯** → **Promote to Production**

### Rollback code:

```bash
git revert HEAD
git push origin main
vercel --prod
```

---

## Support

**Vercel Docs:** https://vercel.com/docs
**Vercel Status:** https://vercel-status.com

**Common Issues:**
- https://vercel.com/docs/errors
- https://github.com/vercel/vercel/discussions

---

**Last Updated:** March 2026
**Version:** 2.0 (Vercel Serverless)
