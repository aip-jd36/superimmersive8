# Environment Variables Setup

## Location

The environment variables file is located at:
```
/Users/JD/Desktop/SuperImmersive8/.env.local
```

This file is **shared** between the marketing website and the platform app.

## Why Not in This Directory?

The `.env.local` file is in the parent directory (`/Users/JD/Desktop/SuperImmersive8/`) because:
1. It contains credentials for multiple projects (website + platform)
2. Next.js automatically looks for `.env.local` in the project root
3. Keeps sensitive credentials in one place

## How Next.js Finds It

When you run `npm run dev` from this directory:
```bash
cd /Users/JD/Desktop/SuperImmersive8/08_Platform/app
npm run dev
```

Next.js will automatically look for `.env.local` in the current directory first, then parent directories.

## Current Status

### Already Configured
```bash
✅ NEXT_PUBLIC_SUPABASE_URL
✅ NEXT_PUBLIC_SUPABASE_ANON_KEY
✅ SUPABASE_SERVICE_ROLE_KEY
✅ RESEND_API_KEY
✅ NEXT_PUBLIC_SITE_URL
✅ ADMIN_EMAIL
```

### Need to Add (Stripe)
```bash
❌ NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_KEY
❌ STRIPE_SECRET_KEY=sk_test_YOUR_KEY
❌ STRIPE_WEBHOOK_SECRET=whsec_YOUR_SECRET
```

## How to Add Stripe Keys

1. Open the file:
```bash
open /Users/JD/Desktop/SuperImmersive8/.env.local
```

2. Update the Stripe section with your actual keys from https://dashboard.stripe.com/test/apikeys

3. Save and restart the dev server:
```bash
# Press Ctrl+C to stop
npm run dev
```

## Verification

To verify environment variables are loaded:

1. Add a test file:
```typescript
// test-env.ts
console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
console.log('Stripe Key:', process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
```

2. Run it:
```bash
node -r dotenv/config test-env.ts
```

## For Production (Vercel)

When deploying to Vercel:

1. Go to **Project Settings → Environment Variables**
2. Copy ALL values from `/Users/JD/Desktop/SuperImmersive8/.env.local`
3. Update `NEXT_PUBLIC_SITE_URL` to production URL
4. Use **live mode** Stripe keys (not test keys)

## Security Notes

- ✅ `.env.local` is in `.gitignore` (never committed)
- ✅ Only `NEXT_PUBLIC_*` variables are exposed to browser
- ✅ Sensitive keys (STRIPE_SECRET_KEY, SUPABASE_SERVICE_ROLE_KEY) are server-only

## Troubleshooting

### "process.env.VARIABLE is undefined"

**Solution**: Restart the dev server after changing `.env.local`

### "Cannot find .env.local"

**Solution**: Verify file exists at `/Users/JD/Desktop/SuperImmersive8/.env.local`

### Vercel deployment fails with env errors

**Solution**: Add all variables in Vercel dashboard (they're not automatically synced from local)

---

**Quick Reference**: The actual file is at `/Users/JD/Desktop/SuperImmersive8/.env.local`
