# SI8 Creator Portal - Quickstart Guide

Get the Creator Portal running in 5 minutes.

## Step 1: Install Dependencies

```bash
cd /Users/JD/Desktop/SuperImmersive8/08_Platform/app
npm install
```

This will install all required packages (Next.js, Supabase, Stripe, etc.)

## Step 2: Environment Variables

Your environment variables are already configured in:
`/Users/JD/Desktop/SuperImmersive8/.env.local`

**What's already set up:**
- ✅ Supabase URL and keys
- ✅ Resend API key
- ✅ Site URL

**What you need to add:**
- ❌ Stripe publishable key
- ❌ Stripe secret key
- ❌ Stripe webhook secret

See the "Stripe Setup" section in `README.md` for detailed instructions.

## Step 3: Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Step 4: Test Without Stripe (Limited Functionality)

You can test auth and dashboard without Stripe:

1. **Sign up**: Create a test account
2. **Log in**: Verify session persistence
3. **Dashboard**: View empty state
4. **Submission form**: Navigate through sections (won't submit without Stripe)

## Step 5: Add Stripe Keys (Full Functionality)

To test the complete flow including payment:

1. Go to [https://dashboard.stripe.com](https://dashboard.stripe.com)
2. Enable **Test Mode** (toggle in top right)
3. Copy your test keys from **Developers → API keys**
4. Add them to `/Users/JD/Desktop/SuperImmersive8/.env.local`:

```bash
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
```

5. Create a product:
   - **Dashboard → Products → Add product**
   - Name: AI Video Chain of Title Verification
   - Price: $499.00 USD (one-time)
   - Copy the **Price ID** (starts with `price_...`)

6. Update the Price ID in `/lib/stripe.ts`:

```typescript
export const VERIFICATION_PRICE_ID = 'price_YOUR_ACTUAL_PRICE_ID'
```

7. Set up local webhook testing:

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

8. Copy the webhook secret from the terminal output and add to `.env.local`:

```bash
STRIPE_WEBHOOK_SECRET=whsec_...
```

9. Restart your dev server:

```bash
npm run dev
```

## Step 6: Test Complete Flow

1. **Sign up** with a test email
2. **Fill out submission form** (all 10 sections)
3. **Click "Submit & Pay $499"**
4. **Enter test card**: 4242 4242 4242 4242, exp: 12/34, CVC: 123
5. **Complete payment** → Should redirect to dashboard
6. **Check dashboard** → Submission should appear with "PENDING" status
7. **Check terminal** → Webhook should log payment processed

## Common Issues

### "Cannot find module" errors
```bash
# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Stripe webhook not firing
```bash
# Ensure Stripe CLI is running in a separate terminal
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

### Database connection errors
- Verify Supabase credentials in `.env.local`
- Check Supabase dashboard is accessible
- Ensure RLS policies are correctly configured

## Next Steps

- See `README.md` for full documentation
- See `TEST_PLAN.md` for comprehensive testing checklist
- See `/08_Platform/prds/PRD_CREATOR_PORTAL.md` for feature specifications

## Need Help?

- Check `README.md` → Troubleshooting section
- Review Supabase logs in dashboard
- Check browser console for errors
- Review terminal logs for API errors

---

**Ready to build!** Start with `npm run dev` and test the auth flow first.
