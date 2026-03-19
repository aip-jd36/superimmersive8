# SI8 Creator Portal - Rights Verified MVP

A Next.js 14 application for AI video creators to submit their work for Rights Verified verification and earn licensing revenue through the SI8 catalog.

## Features

- **Creator Authentication**: Sign up, log in, and manage your account
- **Submission Form**: 10-section intake form for AI video verification
- **Payment Integration**: Stripe Checkout for $499 verification fee
- **Dashboard**: Track submission status and earnings
- **Opt-in System**: List approved videos in the SI8 catalog for licensing
- **Email Notifications**: Automated emails for submissions, approvals, and deals

## Tech Stack

- **Framework**: Next.js 14 (App Router, React Server Components, TypeScript)
- **Database & Auth**: Supabase (PostgreSQL, Auth, Storage)
- **Payments**: Stripe Checkout
- **Email**: Resend
- **UI**: Tailwind CSS + shadcn/ui components
- **Forms**: React Hook Form + Zod validation

## Prerequisites

- Node.js 18+ installed
- Supabase account (already configured in `.env.local`)
- Stripe account (test mode keys needed)
- Resend account (API key already in `.env.local`)

## Setup Instructions

### 1. Install Dependencies

```bash
cd /Users/JD/Desktop/SuperImmersive8/08_Platform/app
npm install
```

### 2. Configure Environment Variables

Your `.env.local` file is already created at `/Users/JD/Desktop/SuperImmersive8/.env.local`.

**TODO: Add Stripe keys** (see Stripe Setup section below)

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Test the Application

See `TEST_PLAN.md` for detailed testing steps.

## Stripe Setup (REQUIRED)

The application will not work fully until you add your Stripe keys. Follow these steps:

### 1. Create Stripe Account
- Go to [https://dashboard.stripe.com](https://dashboard.stripe.com)
- Sign up or log in
- Enable **Test Mode** (toggle in top right corner)

### 2. Get API Keys
- Navigate to **Developers → API keys**
- Copy the following keys:
  - **Publishable key** (starts with `pk_test_...`)
  - **Secret key** (starts with `sk_test_...`)

### 3. Add Keys to `.env.local`
Open `/Users/JD/Desktop/SuperImmersive8/.env.local` and replace:

```bash
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_KEY_HERE
STRIPE_SECRET_KEY=sk_test_YOUR_KEY_HERE
```

### 4. Create Product in Stripe
- Go to **Dashboard → Products → Add product**
- **Name**: AI Video Chain of Title Verification
- **Price**: $499.00 USD (one-time payment)
- Click **Save product**
- Copy the **Price ID** (starts with `price_...`)

### 5. Update Price ID in Code
Open `/Users/JD/Desktop/SuperImmersive8/08_Platform/app/lib/stripe.ts` and replace:

```typescript
export const VERIFICATION_PRICE_ID = 'price_YOUR_PRICE_ID_HERE'
```

### 6. Set Up Webhook (for local testing)

**Option A: Test locally with Stripe CLI**
```bash
# Install Stripe CLI (macOS)
brew install stripe/stripe-cli/stripe

# Login to Stripe
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

Copy the webhook secret (starts with `whsec_...`) and add to `.env.local`:
```bash
STRIPE_WEBHOOK_SECRET=whsec_YOUR_SECRET_HERE
```

**Option B: Set up for production (after deployment)**
- Go to **Developers → Webhooks → Add endpoint**
- **URL**: `https://www.superimmersive8.com/api/webhooks/stripe`
- **Events to send**: Select `checkout.session.completed`
- Copy the **Signing secret** (starts with `whsec_...`)
- Add to `.env.local` (production environment variables on Vercel)

### 7. Test Payment Flow

Use Stripe's test card numbers:
- **Success**: `4242 4242 4242 4242`
- **Expiry**: Any future date (e.g., `12/34`)
- **CVC**: Any 3 digits (e.g., `123`)
- **ZIP**: Any 5 digits (e.g., `12345`)

## Project Structure

```
08_Platform/app/
├── app/                    # Next.js 14 App Router
│   ├── auth/              # Authentication pages
│   │   ├── signup/
│   │   ├── login/
│   │   └── callback/
│   ├── dashboard/         # Creator dashboard
│   ├── submit/            # Submission form
│   ├── api/               # API routes
│   │   ├── checkout/      # Stripe Checkout
│   │   └── webhooks/      # Stripe webhooks
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Home (redirects)
│   └── globals.css        # Global styles
├── components/            # React components
│   └── ui/                # shadcn/ui components
├── lib/                   # Utilities
│   ├── supabase/          # Supabase clients
│   ├── stripe.ts          # Stripe config
│   ├── emails.ts          # Email templates
│   └── utils.ts           # Helper functions
├── types/                 # TypeScript types
│   └── database.types.ts  # Supabase types
├── middleware.ts          # Auth middleware
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── next.config.js
```

## Key Files to Review

- **Submission Form**: `/app/submit/page.tsx` - Multi-step form with validation
- **Dashboard**: `/app/dashboard/page.tsx` - Displays submissions and stats
- **Stripe Webhook**: `/app/api/webhooks/stripe/route.ts` - Handles payment confirmation
- **Email Templates**: `/lib/emails.ts` - Transactional emails via Resend

## Supabase Database Schema

All database tables are already created. Key tables:

- `users` - Creator accounts
- `submissions` - Video submissions (70-field intake form)
- `opt_ins` - Catalog opt-ins for approved submissions
- `rights_packages` - Generated Rights Package PDFs
- `licensing_deals` - Licensing transactions (80% to creator, 20% to SI8)
- `notifications` - User notifications

## Deployment

### Deploy to Vercel

1. Push code to GitHub:
```bash
cd /Users/JD/Desktop/SuperImmersive8
git add 08_Platform/app
git commit -m "Add Creator Portal MVP"
git push origin main
```

2. Go to [vercel.com](https://vercel.com) and import your repository

3. Add environment variables in Vercel dashboard:
   - Copy all values from `.env.local`
   - Update `NEXT_PUBLIC_SITE_URL` to your production URL
   - Use **production Stripe keys** (not test keys)

4. Set up Stripe webhook for production (see Stripe Setup section)

### Update DNS

Point `superimmersive8.com` to Vercel:
- In your DNS provider (Bluehost), add a CNAME record:
  - **Name**: `@` or `www`
  - **Value**: `cname.vercel-dns.com`

## Known Limitations (MVP Scope)

- **File uploads**: Not fully implemented - receipts/screenshots upload logic needs completion
- **Opt-in modal**: Basic version - full modal UI not included
- **Admin panel**: Not built yet - admin will manage submissions directly in Supabase
- **Rights Package PDF generation**: Not implemented - manual process for MVP
- **Submission details page**: Not built - shows in dashboard table only

## Next Steps (Post-MVP)

1. **Complete file upload logic** for receipts and screenshots (Supabase Storage)
2. **Build opt-in modal** for catalog listing after approval
3. **Create admin panel** for reviewing submissions and generating Rights Packages
4. **Add submission details page** with full data view
5. **Implement PDF generation** for Rights Packages (puppeteer or @react-pdf/renderer)
6. **Add public catalog page** for buyers to browse opted-in videos

## Troubleshooting

### "Cannot find module '@/lib/supabase/client'"
- Run `npm install` to ensure all dependencies are installed
- Check that all files in `/lib` directory exist

### "Stripe signature verification failed"
- Ensure `STRIPE_WEBHOOK_SECRET` is correctly set in `.env.local`
- If testing locally, ensure Stripe CLI is running: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`

### "User not found" error after signup
- Check Supabase RLS policies are disabled for the `users` table (or properly configured)
- Verify the `users` table has an `auth_id` column linked to `auth.users`

### Email not sending
- Verify `RESEND_API_KEY` is valid in `.env.local`
- Check Resend dashboard for delivery status

## Support

For issues or questions:
- **Project lead**: JD (jd@superimmersive8.com)
- **Documentation**: See `/08_Platform/prds/PRD_CREATOR_PORTAL.md`
- **Technical architecture**: See `/08_Platform/architecture/TECHNICAL_ARCHITECTURE.md`

---

**Version**: 1.0 (MVP)
**Last updated**: March 19, 2026
