# 4-Week Implementation Plan: SI8 CaaS Platform v1.0

**Document Status:** ✅ Complete — Ready for execution
**Created:** February 18, 2026
**Sprint Duration:** 4 weeks (February 19 - March 18, 2026)
**Sprint Goal:** Launch MVP CaaS platform with creator submissions, admin review, and public catalog

---

## Overview

This plan delivers the minimum viable CaaS platform:
- Creators can sign up, submit videos, pay $499, and receive Rights Packages
- JD can review submissions and generate PDF Rights Packages
- Buyers can browse catalog and request licensing
- Website reflects v4 CaaS model

**What ships in v1.0:**
- Supabase backend (auth, database, storage, functions)
- Next.js 14 frontend (App Router, TypeScript, Tailwind CSS)
- Stripe payment integration ($499 per submission)
- PDF generation (Puppeteer) for Rights Packages
- Public catalog with filtering
- Basic email notifications

**What's deferred post-v1.0:**
- Advanced analytics dashboard
- Automated opt-in email campaigns
- Multi-language support (EN only for v1.0, zh-TW in v1.1)
- In-app chat/messaging
- Mobile apps

---

## Prerequisites

### Required Accounts
- [ ] Supabase account (free tier OK for MVP)
- [ ] Vercel account (free tier OK)
- [ ] Stripe account (test mode enabled)
- [ ] SendGrid or Resend.com account (email notifications)
- [ ] GitHub repo access (https://github.com/aip-jd36/superimmersive8.git)

### Local Development Setup
- [ ] Node.js 18+ installed
- [ ] npm or yarn installed
- [ ] Git configured
- [ ] Code editor (VS Code recommended)
- [ ] Supabase CLI installed: `npm install -g supabase`

### Domain & Hosting
- [ ] Bluehost DNS configured to point to Vercel
- [ ] SSL certificate (Vercel handles automatically)
- [ ] Environment variables template created

---

## Week 1: Foundation (Feb 19-25)

**Goal:** Supabase infrastructure + Next.js scaffold + Auth working

### Day 1 (Wed): Project Setup
- [ ] Create Next.js 14 project: `npx create-next-app@latest si8-platform --typescript --tailwind --app`
- [ ] Install dependencies:
  ```bash
  npm install @supabase/supabase-js @supabase/auth-helpers-nextjs
  npm install stripe @stripe/stripe-js
  npm install puppeteer
  npm install @radix-ui/react-dialog @radix-ui/react-dropdown-menu
  npm install lucide-react date-fns
  ```
- [ ] Create `.env.local` template:
  ```
  NEXT_PUBLIC_SUPABASE_URL=
  NEXT_PUBLIC_SUPABASE_ANON_KEY=
  SUPABASE_SERVICE_ROLE_KEY=
  STRIPE_SECRET_KEY=
  STRIPE_PUBLISHABLE_KEY=
  STRIPE_WEBHOOK_SECRET=
  SENDGRID_API_KEY=
  NEXT_PUBLIC_SITE_URL=http://localhost:3000
  ```
- [ ] Push to GitHub `main` branch

### Day 2 (Thu): Supabase Setup
- [ ] Create new Supabase project: "SI8 CaaS Platform"
- [ ] Run database migrations from `TECHNICAL_ARCHITECTURE.md`:
  ```sql
  -- Copy all CREATE TABLE statements from architecture doc
  -- Run in Supabase SQL Editor
  -- Order: users → submissions → opt_ins → rights_packages → licensing_deals → notifications → audit_log
  ```
- [ ] Enable Row Level Security (RLS) policies:
  ```sql
  -- Copy all RLS policy definitions from architecture doc
  -- Run in SQL Editor
  ```
- [ ] Create Storage buckets:
  - `receipts` (private)
  - `rights-packages` (private)
  - `catalog-thumbnails` (public)
  - `catalog-videos` (public)
- [ ] Configure storage bucket policies (see architecture doc)
- [ ] Test connection from local: `npm run dev` and verify Supabase client initialization

### Day 3 (Fri): Auth Implementation
- [ ] Create `/app/auth/` folder structure:
  ```
  /app/auth/
    /signup/
      page.tsx
    /login/
      page.tsx
    /callback/
      route.ts
    /admin/
      /login/
        page.tsx
  ```
- [ ] Implement signup page (creator-facing):
  - Email + password form
  - Supabase auth signup
  - Redirect to `/dashboard` after success
- [ ] Implement login page (creator-facing):
  - Email + password form
  - Supabase auth login
  - Redirect to `/dashboard`
- [ ] Implement admin login page:
  - Separate route: `/auth/admin/login`
  - Check `is_admin` flag after login
  - Redirect to `/admin` if admin, else error
- [ ] Create auth callback route (`/auth/callback/route.ts`):
  ```typescript
  import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
  import { cookies } from 'next/headers'
  import { NextResponse } from 'next/server'

  export async function GET(request: Request) {
    const requestUrl = new URL(request.url)
    const code = requestUrl.searchParams.get('code')

    if (code) {
      const supabase = createRouteHandlerClient({ cookies })
      await supabase.auth.exchangeCodeForSession(code)
    }

    return NextResponse.redirect(requestUrl.origin)
  }
  ```
- [ ] Test: Sign up new user → verify in Supabase dashboard → log in

### Day 4 (Sat): Stripe Integration Setup
- [ ] Create Stripe account (or use existing)
- [ ] Enable test mode
- [ ] Get API keys (publishable + secret)
- [ ] Add keys to `.env.local`
- [ ] Create product in Stripe Dashboard:
  - Name: "AI Video Chain of Title Verification"
  - Price: $499 USD one-time
  - Get Price ID
- [ ] Create webhook endpoint in Stripe:
  - URL: `https://yourdomain.com/api/webhooks/stripe` (placeholder for now)
  - Events: `checkout.session.completed`, `payment_intent.succeeded`
  - Get webhook secret
- [ ] Create `/app/api/checkout/create-session/route.ts`:
  ```typescript
  import Stripe from 'stripe'
  import { NextResponse } from 'next/server'

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2023-10-16',
  })

  export async function POST(req: Request) {
    const { submissionData, userId } = await req.json()

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: 'price_XXXXXX', // Your Price ID
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/submit?payment=cancelled`,
      metadata: {
        user_id: userId,
        submission_data: JSON.stringify(submissionData),
      },
    })

    return NextResponse.json({ url: session.url })
  }
  ```
- [ ] Test: Create checkout session → redirect to Stripe → complete test payment

### Day 5 (Sun): Stripe Webhook Handler
- [ ] Create `/app/api/webhooks/stripe/route.ts`:
  ```typescript
  import Stripe from 'stripe'
  import { createClient } from '@supabase/supabase-js'
  import { NextResponse } from 'next/server'

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  export async function POST(req: Request) {
    const body = await req.text()
    const sig = req.headers.get('stripe-signature')!

    let event: Stripe.Event

    try {
      event = stripe.webhooks.constructEvent(
        body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET!
      )
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 400 })
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session
      const userId = session.metadata?.user_id
      const submissionData = JSON.parse(session.metadata?.submission_data || '{}')

      // Create submission in database
      const { data, error } = await supabase
        .from('submissions')
        .insert({
          user_id: userId,
          title: submissionData.title,
          tools_used: submissionData.tools_used,
          authorship_statement: submissionData.authorship_statement,
          likeness_confirmation: submissionData.likeness_confirmation,
          ip_confirmation: submissionData.ip_confirmation,
          audio_disclosure: submissionData.audio_disclosure,
          modification_authorized: submissionData.modification_authorized,
          territory_preferences: submissionData.territory_preferences,
          supporting_materials: submissionData.supporting_materials,
          payment_status: 'paid',
          stripe_payment_intent_id: session.payment_intent as string,
          status: 'pending',
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating submission:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      // Send notification email to admin
      // TODO: Implement SendGrid email

      return NextResponse.json({ received: true })
    }

    return NextResponse.json({ received: true })
  }
  ```
- [ ] Deploy to Vercel (staging environment)
- [ ] Update Stripe webhook URL to deployed URL
- [ ] Test webhook: Complete test payment → verify submission created in Supabase

**Week 1 Checkpoint:**
- [ ] Auth working (signup, login, admin login)
- [ ] Supabase database live with all tables
- [ ] Stripe payment flow working end-to-end
- [ ] Submissions created after successful payment
- [ ] Git commit: "Week 1: Foundation complete"

---

## Week 2: Creator Portal + Admin Panel (Feb 26 - Mar 3)

**Goal:** Creators can submit videos, JD can review and approve

### Day 6 (Mon): Creator Dashboard
- [ ] Create `/app/dashboard/page.tsx`:
  - Fetch user's submissions from Supabase
  - Display table: Title, Status, Submitted Date, Actions
  - Empty state: "No submissions yet. Submit your first video!"
  - Link to `/submit` page
- [ ] Create `/app/dashboard/layout.tsx`:
  - Nav: Dashboard, Submit New, Logout
  - Check auth: redirect to `/auth/login` if not logged in
- [ ] Create middleware for protected routes (`middleware.ts`):
  ```typescript
  import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
  import { NextResponse } from 'next/server'
  import type { NextRequest } from 'next/server'

  export async function middleware(req: NextRequest) {
    const res = NextResponse.next()
    const supabase = createMiddlewareClient({ req, res })
    const { data: { session } } = await supabase.auth.getSession()

    // Protected routes
    if (req.nextUrl.pathname.startsWith('/dashboard')) {
      if (!session) {
        return NextResponse.redirect(new URL('/auth/login', req.url))
      }
    }

    if (req.nextUrl.pathname.startsWith('/admin')) {
      if (!session) {
        return NextResponse.redirect(new URL('/auth/admin/login', req.url))
      }

      // Check if admin
      const { data: user } = await supabase
        .from('users')
        .select('is_admin')
        .eq('id', session.user.id)
        .single()

      if (!user?.is_admin) {
        return NextResponse.redirect(new URL('/dashboard', req.url))
      }
    }

    return res
  }

  export const config = {
    matcher: ['/dashboard/:path*', '/admin/:path*'],
  }
  ```
- [ ] Test: Log in → see dashboard → see empty state

### Day 7 (Tue): Submission Form (Part 1)
- [ ] Create `/app/submit/page.tsx` with multi-step form:
  - Step 1: Filmmaker Profile (name, location, contact, portfolio links)
  - Step 2: Production Overview (title, runtime, genre, logline, intended use)
  - Step 3: Tool Disclosure (dynamic table: tool name, version, plan type, dates)
- [ ] Use React Hook Form for validation:
  ```bash
  npm install react-hook-form zod @hookform/resolvers
  ```
- [ ] Create form validation schema with Zod
- [ ] Save draft to localStorage (in case user leaves page)
- [ ] Test: Fill out Steps 1-3 → validate → save draft

### Day 8 (Wed): Submission Form (Part 2)
- [ ] Continue `/app/submit/page.tsx`:
  - Step 4: Human Authorship Declaration (min 150 words)
  - Step 5: Likeness & Identity Confirmation (checkboxes)
  - Step 6: IP & Brand Confirmation (checkboxes)
  - Step 7: Audio & Music Disclosure (source type + documentation upload)
- [ ] Implement file upload for receipts:
  - Upload to Supabase Storage bucket `receipts/`
  - Store file URLs in form state
- [ ] Test: Complete Steps 4-7 → upload test receipts → validate

### Day 9 (Thu): Submission Form (Part 3) + Payment
- [ ] Continue `/app/submit/page.tsx`:
  - Step 8: Modification Rights Authorization (yes/no + scope)
  - Step 9: Territory & Exclusivity Preferences
  - Step 10: Supporting Materials (file uploads)
- [ ] Add final review screen (Step 11):
  - Display all entered data
  - "Edit" buttons to go back to each step
  - "Submit & Pay $499" button
- [ ] Implement payment flow:
  - On "Submit & Pay", call `/api/checkout/create-session` with full form data
  - Redirect to Stripe Checkout
  - Handle success return (`/dashboard?payment=success`)
  - Display success message with submission ID
- [ ] Test: Complete full form → pay with test card → verify submission created

### Day 10 (Fri): Admin Panel - Review Queue
- [ ] Create `/app/admin/page.tsx`:
  - Fetch all submissions with `status = 'pending'`
  - Display table: ID, Title, Filmmaker, Submitted Date, Actions
  - Sort by oldest first
  - Click row → navigate to `/admin/review/[id]`
- [ ] Create `/app/admin/layout.tsx`:
  - Nav: Review Queue, Catalog, Deals, Logout
  - Admin-only guard (check `is_admin`)
- [ ] Add stats cards at top of admin page:
  - Pending reviews count
  - Approved this week count
  - Total catalog entries count
- [ ] Test: Log in as admin → see pending submissions

### Day 11 (Sat): Admin Panel - Review Details
- [ ] Create `/app/admin/review/[id]/page.tsx`:
  - Fetch submission by ID
  - Display all 10 sections in readable format
  - Show uploaded files (receipts, supporting materials) with download links
  - Video player for submitted video (if uploaded)
  - Checkboxes for 7 review criteria (from REVIEW-CRITERIA.md):
    1. Tool & Plan Verification ✓
    2. Human Authorship Evidence ✓
    3. Likeness & Identity ✓
    4. IP & Brand Imitation ✓
    5. Brand Safety ✓
    6. Audio & Music Rights ✓
    7. Modification Rights ✓
  - Notes textarea for internal review notes
  - Action buttons: Approve, Request Info, Reject
- [ ] Create API route `/app/api/admin/submissions/[id]/route.ts`:
  - PATCH: Update submission status + review notes
  - GET: Fetch submission details
  - Require admin auth
- [ ] Test: Review test submission → check all criteria → save notes

### Day 12 (Sun): PDF Generation
- [ ] Create `/app/api/admin/generate-rights-package/route.ts`:
  ```typescript
  import puppeteer from 'puppeteer'
  import { createClient } from '@supabase/supabase-js'

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  export async function POST(req: Request) {
    const { submissionId } = await req.json()

    // Fetch submission data
    const { data: submission } = await supabase
      .from('submissions')
      .select('*, users(name, email)')
      .eq('id', submissionId)
      .single()

    // Generate catalog ID
    const catalogId = await generateCatalogId()

    // Build HTML for PDF (9-field Rights Package structure)
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; }
          h1 { color: #f59e0b; }
          .section { margin-bottom: 30px; }
          .field { margin-bottom: 15px; }
          .label { font-weight: bold; }
        </style>
      </head>
      <body>
        <h1>Rights Verified Documentation Package</h1>
        <p>Catalog ID: ${catalogId}</p>
        <p>Film Title: ${submission.title}</p>

        <div class="section">
          <h2>1. Tool Provenance Log</h2>
          <div class="field">
            <div class="label">Tools Used:</div>
            <pre>${JSON.stringify(submission.tools_used, null, 2)}</pre>
          </div>
        </div>

        <div class="section">
          <h2>2. Model Disclosure</h2>
          <div class="field">
            <p>${submission.model_disclosure || 'See Tool Provenance Log'}</p>
          </div>
        </div>

        <div class="section">
          <h2>3. Rights Verified Sign-off</h2>
          <div class="field">
            <div class="label">Reviewer:</div>
            <p>JD Lin, SuperImmersive 8</p>
          </div>
          <div class="field">
            <div class="label">Review Date:</div>
            <p>${new Date().toISOString().split('T')[0]}</p>
          </div>
          <div class="field">
            <div class="label">Risk Tier:</div>
            <p>Standard</p>
          </div>
        </div>

        <div class="section">
          <h2>4. Commercial Use Authorization</h2>
          <div class="field">
            <p>All tools used are authorized for commercial output per their Terms of Service. Commercial plan receipts on file.</p>
          </div>
        </div>

        <div class="section">
          <h2>5. Modification Rights Status</h2>
          <div class="field">
            <div class="label">Status:</div>
            <p>${submission.modification_authorized ? 'Authorized' : 'Not Authorized'}</p>
          </div>
        </div>

        <div class="section">
          <h2>6. Category Conflict Log</h2>
          <div class="field">
            <p>${submission.category_conflicts || 'None identified'}</p>
          </div>
        </div>

        <div class="section">
          <h2>7. Territory Log</h2>
          <div class="field">
            <p>${submission.territory_preferences || 'Global'}</p>
          </div>
        </div>

        <div class="section">
          <h2>8. Regeneration Rights Status</h2>
          <div class="field">
            <p>${submission.modification_authorized ? 'Authorized for specified scenes' : 'Not authorized'}</p>
          </div>
        </div>

        <div class="section">
          <h2>9. Version History</h2>
          <div class="field">
            <div class="label">Production Version:</div>
            <p>1.0</p>
          </div>
          <div class="field">
            <div class="label">Review Date:</div>
            <p>${new Date().toISOString().split('T')[0]}</p>
          </div>
        </div>

        <hr style="margin-top: 50px;">
        <p style="font-size: 12px; color: #666;">
          This Rights Verified Documentation Package is provided for informational purposes only and does not constitute legal advice or a warranty of non-infringement. Buyers are encouraged to conduct their own legal review.
        </p>
      </body>
      </html>
    `

    // Generate PDF with Puppeteer
    const browser = await puppeteer.launch({ headless: true })
    const page = await browser.newPage()
    await page.setContent(html)
    const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true })
    await browser.close()

    // Upload to Supabase Storage
    const fileName = `${catalogId}-rights-package.pdf`
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('rights-packages')
      .upload(`${submissionId}/${fileName}`, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true,
      })

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 })
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('rights-packages')
      .getPublicUrl(`${submissionId}/${fileName}`)

    // Create rights_package record
    await supabase.from('rights_packages').insert({
      submission_id: submissionId,
      catalog_id: catalogId,
      tool_provenance_log: submission.tools_used,
      pdf_url: publicUrl,
    })

    // Update submission status
    await supabase
      .from('submissions')
      .update({ status: 'approved' })
      .eq('id', submissionId)

    return NextResponse.json({ catalogId, pdfUrl: publicUrl })
  }

  async function generateCatalogId() {
    const year = new Date().getFullYear()
    const { count } = await supabase
      .from('rights_packages')
      .select('id', { count: 'exact', head: true })
    const sequence = String((count || 0) + 1).padStart(4, '0')
    return `SI8-${year}-${sequence}`
  }
  ```
- [ ] Add "Approve" button handler in review page:
  - Call `/api/admin/generate-rights-package`
  - Show success toast
  - Redirect to catalog
- [ ] Test: Approve a submission → verify PDF generated → download and review

**Week 2 Checkpoint:**
- [ ] Creator can submit full form + pay $499
- [ ] JD can review submissions in admin panel
- [ ] JD can approve and generate Rights Package PDF
- [ ] PDF contains all 9 fields from Chain of Title schema
- [ ] Git commit: "Week 2: Submission & review complete"

---

## Week 3: Public Catalog + Opt-in (Mar 4-10)

**Goal:** Public catalog live, creators can opt-in after approval

### Day 13 (Mon): Catalog Page - Grid View
- [ ] Create `/app/catalog/page.tsx`:
  - Fetch all opt-ins where `visible = true`
  - Display grid of catalog entries (4 columns desktop, 2 tablet, 1 mobile)
  - Each card: Thumbnail, title, genre, catalog ID, "View Details" link
  - Filter sidebar: Genre, Style, Use Case (checkboxes)
  - Sort dropdown: Newest, Oldest, Title A-Z
- [ ] Create API route `/app/api/catalog/route.ts`:
  - GET: Fetch all visible opt-ins with submission details
  - Query params: `genre`, `style`, `useCase`, `sort`
- [ ] Style catalog cards with Rights Verified badge:
  ```tsx
  <div className="relative">
    <img src={film.thumbnailUrl} alt={film.title} />
    <div className="absolute top-2 right-2 bg-amber-600 text-white text-xs px-2 py-1 rounded">
      Rights Verified
    </div>
  </div>
  ```
- [ ] Test: Navigate to `/catalog` → see grid → apply filters → sort

### Day 14 (Tue): Catalog Page - Film Details
- [ ] Create `/app/catalog/[id]/page.tsx`:
  - Fetch opt-in by catalog ID
  - Display film details: Title, description, runtime, genre, filmmaker name
  - Embed video player (Vimeo/YouTube or direct MP4)
  - Show Rights Verified badge prominently
  - "Request Licensing" button (opens modal)
  - Related films section (same genre)
- [ ] Create video player component:
  ```tsx
  export function VideoPlayer({ url }: { url: string }) {
    return (
      <div className="aspect-video bg-black rounded-lg overflow-hidden">
        <iframe
          src={url}
          allow="autoplay; fullscreen"
          className="w-full h-full"
        />
      </div>
    )
  }
  ```
- [ ] Test: Click film card → view details → watch video

### Day 15 (Wed): Request Licensing Flow
- [ ] Create modal component for "Request Licensing" form:
  - Fields: Name, Email, Company, Intended Use, Territory, Budget Range, Additional Details
  - Submit button
- [ ] Create API route `/app/api/licensing/request/route.ts`:
  ```typescript
  export async function POST(req: Request) {
    const { name, email, company, intendedUse, territory, budgetRange, details, catalogId } = await req.json()

    // Fetch film and creator info
    const { data: optIn } = await supabase
      .from('opt_ins')
      .select('*, submissions(id, user_id, title), users(name, email)')
      .eq('catalog_id', catalogId)
      .single()

    // Create licensing deal record
    const { data: deal } = await supabase
      .from('licensing_deals')
      .insert({
        submission_id: optIn.submissions.id,
        buyer_name: name,
        buyer_email: email,
        buyer_company: company,
        intended_use: intendedUse,
        territory: territory,
        budget_range: budgetRange,
        status: 'negotiating',
      })
      .select()
      .single()

    // Send 3 emails:
    // 1. To admin (JD)
    await sendEmail({
      to: 'jd@superimmersive8.com',
      subject: `New licensing request: ${optIn.submissions.title}`,
      html: `
        <p>New licensing request received!</p>
        <p><strong>Film:</strong> ${optIn.submissions.title}</p>
        <p><strong>Buyer:</strong> ${name} (${email})</p>
        <p><strong>Company:</strong> ${company}</p>
        <p><strong>Intended Use:</strong> ${intendedUse}</p>
        <p><strong>Territory:</strong> ${territory}</p>
        <p><strong>Budget Range:</strong> ${budgetRange}</p>
        <p><strong>Details:</strong> ${details}</p>
        <p><a href="${process.env.NEXT_PUBLIC_SITE_URL}/admin/deals/${deal.id}">View in Admin Panel</a></p>
      `,
    })

    // 2. To creator
    await sendEmail({
      to: optIn.users.email,
      subject: `Licensing interest in "${optIn.submissions.title}"`,
      html: `
        <p>Great news! A buyer is interested in licensing your film "${optIn.submissions.title}".</p>
        <p>SI8 will handle negotiations and follow up with you directly.</p>
        <p>Buyer: ${name} from ${company}</p>
      `,
    })

    // 3. To buyer (confirmation)
    await sendEmail({
      to: email,
      subject: `Licensing request received: ${optIn.submissions.title}`,
      html: `
        <p>Thank you for your licensing request for "${optIn.submissions.title}".</p>
        <p>We'll review your request and get back to you within 2 business days.</p>
        <p>Best regards,<br>SuperImmersive 8 Team</p>
      `,
    })

    return NextResponse.json({ success: true, dealId: deal.id })
  }
  ```
- [ ] Implement email sending helper (SendGrid or Resend):
  ```typescript
  import sgMail from '@sendgrid/mail'

  sgMail.setApiKey(process.env.SENDGRID_API_KEY!)

  export async function sendEmail({ to, subject, html }: { to: string, subject: string, html: string }) {
    await sgMail.send({
      to,
      from: 'noreply@superimmersive8.com',
      subject,
      html,
    })
  }
  ```
- [ ] Test: Submit licensing request → verify 3 emails sent → check deal created in database

### Day 16 (Thu): Opt-in Flow (Creator Dashboard)
- [ ] Add "Opt-in to Showcase" card to `/app/dashboard/page.tsx`:
  - Show for approved submissions only
  - Display benefits: "Earn 80% of licensing fees", "Increase visibility"
  - "Opt In Now" button
- [ ] Create opt-in modal:
  - Fields: Video embed URL (Vimeo/YouTube/direct), Thumbnail upload, Public description (optional), Genre tags, Style tags
  - Checkbox: "I agree to the Showcase Terms (20% commission to SI8)"
  - Submit button
- [ ] Create API route `/app/api/opt-in/create/route.ts`:
  ```typescript
  export async function POST(req: Request) {
    const { submissionId, videoUrl, thumbnailUrl, description, genre, style } = await req.json()

    // Fetch catalog ID from rights_package
    const { data: rightsPackage } = await supabase
      .from('rights_packages')
      .select('catalog_id')
      .eq('submission_id', submissionId)
      .single()

    // Create opt-in
    const { data } = await supabase
      .from('opt_ins')
      .insert({
        submission_id: submissionId,
        catalog_id: rightsPackage.catalog_id,
        opted_in: true,
        video_url: videoUrl,
        thumbnail_url: thumbnailUrl,
        public_description: description,
        genre: genre,
        style: style,
        visible: true,
      })
      .select()
      .single()

    return NextResponse.json({ success: true, catalogId: rightsPackage.catalog_id })
  }
  ```
- [ ] Test: Approve submission → log in as creator → opt in → verify appears in catalog

### Day 17 (Fri): Admin Panel - Catalog Management
- [ ] Create `/app/admin/catalog/page.tsx`:
  - Fetch all opt-ins (visible + hidden)
  - Display table: Catalog ID, Title, Filmmaker, Genre, Visible, Actions
  - Actions: Hide/Show toggle, Edit metadata, View on catalog
- [ ] Create edit metadata modal:
  - Update genre, style, description
  - Override thumbnail
- [ ] Create API route `/app/api/admin/catalog/[id]/route.ts`:
  - PATCH: Update opt-in metadata or visibility
- [ ] Test: Hide a catalog entry → verify removed from public catalog → show again

### Day 18 (Sat): Admin Panel - Deals Management
- [ ] Create `/app/admin/deals/page.tsx`:
  - Fetch all licensing_deals
  - Display table: ID, Film Title, Buyer, Status, Deal Value, Created Date
  - Filter by status: All, Negotiating, Closed, Cancelled
  - Click row → navigate to `/admin/deals/[id]`
- [ ] Create `/app/admin/deals/[id]/page.tsx`:
  - Display deal details: Buyer info, film info, intended use, territory, budget range
  - Internal notes textarea
  - Status dropdown: Negotiating, Closed, Cancelled
  - Deal value input (when closed)
  - "Mark as Paid" button
  - Calculate creator payout (80%) and SI8 commission (20%)
- [ ] Create API route `/app/api/admin/deals/[id]/route.ts`:
  - PATCH: Update deal status, value, notes
- [ ] Test: Create test deal → update status to Closed → add deal value → calculate payouts

### Day 19 (Sun): Email Notifications
- [ ] Implement notification system for key events:
  - Submission received (to creator): "We received your submission and will review within 5 business days"
  - Submission approved (to creator): "Your film is approved! Download your Rights Package here"
  - Submission rejected (to creator): "Unfortunately, we cannot approve your submission. Reason: [reason]"
  - Info requested (to creator): "We need additional information for your submission"
  - Opt-in success (to creator): "Your film is now live in the Showcase catalog"
  - Licensing request received (to admin): See Day 15
  - Deal closed (to creator): "Congratulations! Your film has been licensed. You'll receive [amount] within 30 days"
- [ ] Create email templates in `/lib/email-templates/`:
  ```typescript
  export const emailTemplates = {
    submissionReceived: (creatorName: string, filmTitle: string) => ({
      subject: `Submission received: ${filmTitle}`,
      html: `
        <p>Hi ${creatorName},</p>
        <p>We've received your submission for "${filmTitle}" and will review it within 5 business days.</p>
        <p>You'll receive an email when the review is complete.</p>
        <p>Best,<br>SuperImmersive 8 Team</p>
      `,
    }),
    submissionApproved: (creatorName: string, filmTitle: string, dashboardUrl: string) => ({
      subject: `Approved: ${filmTitle}`,
      html: `
        <p>Hi ${creatorName},</p>
        <p>Great news! Your film "${filmTitle}" has been approved and Rights Verified.</p>
        <p><a href="${dashboardUrl}">Download your Rights Verified Documentation Package</a></p>
        <p>You can also opt-in to our Showcase catalog to earn licensing revenue (you keep 80%).</p>
        <p>Best,<br>SuperImmersive 8 Team</p>
      `,
    }),
    // Add remaining templates...
  }
  ```
- [ ] Wire up email sends to existing API routes (approval, rejection, opt-in, deals)
- [ ] Test: Trigger each email type → verify received and formatted correctly

**Week 3 Checkpoint:**
- [ ] Public catalog live at `/catalog`
- [ ] Creators can opt-in after approval
- [ ] Buyers can request licensing
- [ ] JD can manage catalog and deals in admin panel
- [ ] Email notifications working for all key events
- [ ] Git commit: "Week 3: Catalog & opt-in complete"

---

## Week 4: Website Update + Testing + Launch (Mar 11-18)

**Goal:** Launch production site with updated v4 messaging

### Day 20 (Mon): Set Up /newsite/ Staging Directory + Homepage

**Note:** Build new v4 site in `/newsite/` subdirectory to avoid disrupting production site. Use folder/index.html pattern for clean URLs (Vercel compatibility).

- [ ] Create `/07_Website/newsite/` directory structure:
  ```
  /newsite/
  ├── index.html           (homepage)
  ├── styles.css           (shared styles)
  ├── script.js            (shared scripts)
  ├── how-it-works/
  │   └── index.html
  ├── pricing/
  │   └── index.html
  ├── catalog/
  │   └── index.html       (placeholder for now)
  └── rights-verified/
      ├── index.html       (overview landing page) ✅ Already created
      ├── playbook/
      │   └── index.html   (deep-dive) ✅ Already created
      └── chain-of-title/
          └── index.html   (9-field schema) ✅ Already created
  ```
- [ ] Copy `/07_Website/homepage-v4-mock.html` to `/newsite/index.html`
- [ ] Update nav in homepage:
  - Add "Rights Verified" dropdown: Overview, Full Playbook, Chain of Title
  - Add "Login" dropdown: Creator Login, Admin Login
  - Add "Get Verified" CTA button
- [ ] Update all links to use clean URLs (no .html extensions):
  - `/newsite/how-it-works` (not `/newsite/how-it-works.html`)
  - `/newsite/pricing`
  - `/newsite/rights-verified`
- [ ] Test: Open `/newsite/index.html` in browser → verify styling → click nav links

### Day 21 (Tue): Website - How It Works + Pricing Pages
- [ ] Create `/07_Website/newsite/how-it-works/index.html`:
  - Section 1: "What is Chain of Title Verification?"
    - Explain the Rights Verified process
    - Why brands need it ("won't get you sued" positioning)
    - What you get: 9-field Chain of Title documentation
  - Section 2: "How It Works (4 Stages)"
    - Stage 1: Pre-Screen (15 min)
    - Stage 2: Full Review (45-60 min)
    - Stage 3: Risk Tier Assignment
    - Stage 4: Decision & Chain of Title Generation
  - Section 3: "What We Check" (7 categories overview)
  - Section 4: "Optional: Opt into Showcase"
    - Explain marketplace, 80/20 split, passive income potential
  - CTA: "Get Started" (to `/auth/signup`)
  - Link to Rights Verified deep-dive: "Read Full Playbook"
- [ ] Test: Read through → verify explains process clearly

### Day 22 (Wed): Website - Pricing Page + Rights Verified Review
- [ ] Create `/07_Website/newsite/pricing/index.html`:
  - Single tier: $499 per video
  - "What's Included" section:
    - 90-minute expert review (7 categories)
    - Rights Verified Documentation Package (9-field Chain of Title PDF)
    - Commercial use authorization verification
    - 5-business-day turnaround (or faster)
    - Optional catalog opt-in (earn 80% of licensing fees)
  - "Compare to Alternatives" table:
    - Adobe Stock: Only Firefly accepted, no Sora/Runway/Kling
    - DIY: No expert review, brands assume all risk
    - SI8: Best tools verified, expert review, fast turnaround
  - FAQ: Pricing-specific questions (refunds, volume discounts, what if rejected)
  - CTA: "Get Verified" (to `/auth/signup`)
- [ ] Review Rights Verified 3-page structure (already created):
  - `/newsite/rights-verified/index.html` ✅ Landing page complete
  - `/newsite/rights-verified/playbook/index.html` ✅ Full legal reference complete
  - `/newsite/rights-verified/chain-of-title/index.html` ✅ 9-field schema complete
  - Test all 3 pages → verify content accuracy → check nav links work
- [ ] Test: View pricing → verify $499 clear → understand what's included

### Day 23 (Thu): Integration Testing
- [ ] Test full creator flow end-to-end:
  - [ ] Sign up → verify email confirmation
  - [ ] Log in → see empty dashboard
  - [ ] Navigate to Submit page
  - [ ] Fill out all 10 sections of submission form
  - [ ] Upload test receipts and supporting materials
  - [ ] Click "Submit & Pay $499"
  - [ ] Complete Stripe test payment (card: 4242 4242 4242 4242)
  - [ ] Redirected to dashboard with success message
  - [ ] Verify submission appears in dashboard with "Pending" status
  - [ ] Verify email received: "Submission received"
- [ ] Test admin review flow:
  - [ ] Log in as admin
  - [ ] See test submission in review queue
  - [ ] Click to view details
  - [ ] Review all sections and uploaded files
  - [ ] Check all 7 criteria boxes
  - [ ] Add review notes
  - [ ] Click "Approve"
  - [ ] Verify Rights Package PDF generated
  - [ ] Download and review PDF (all 9 fields present)
  - [ ] Verify submission status changed to "Approved"
  - [ ] Verify email sent to creator: "Submission approved"
- [ ] Test opt-in flow:
  - [ ] Log in as creator
  - [ ] See "Opt-in to Showcase" option for approved submission
  - [ ] Click "Opt In Now"
  - [ ] Fill out opt-in form (video URL, thumbnail, description)
  - [ ] Agree to terms
  - [ ] Submit
  - [ ] Verify opt-in created in database
  - [ ] Verify email sent: "Opt-in success"
  - [ ] Log out
  - [ ] Navigate to `/catalog` (public)
  - [ ] Verify film appears in catalog grid
- [ ] Test licensing request flow:
  - [ ] Browse catalog as anonymous user
  - [ ] Click on test film
  - [ ] Watch video
  - [ ] Click "Request Licensing"
  - [ ] Fill out licensing form
  - [ ] Submit
  - [ ] Verify deal created in database
  - [ ] Verify 3 emails sent (admin, creator, buyer)
- [ ] Test admin deals management:
  - [ ] Log in as admin
  - [ ] Navigate to Deals page
  - [ ] See test deal
  - [ ] Click to view details
  - [ ] Update status to "Closed"
  - [ ] Add deal value: $5000
  - [ ] Verify creator payout calculated: $4000 (80%)
  - [ ] Verify SI8 commission: $1000 (20%)

### Day 24 (Fri): Bug Fixes + Polish
- [ ] Fix any bugs discovered during integration testing
- [ ] Polish UI/UX:
  - [ ] Loading states for all async actions
  - [ ] Error handling for failed API calls
  - [ ] Success toasts for completed actions
  - [ ] Empty states for lists (submissions, catalog, deals)
  - [ ] Responsive design checks (mobile, tablet, desktop)
  - [ ] Accessibility: keyboard navigation, ARIA labels, alt text
- [ ] Performance optimization:
  - [ ] Add image optimization (Next.js Image component)
  - [ ] Lazy load catalog thumbnails
  - [ ] Cache catalog queries (React Query or SWR)
  - [ ] Optimize PDF generation (consider queueing for larger submissions)
- [ ] Security review:
  - [ ] Verify all RLS policies working
  - [ ] Test unauthorized access attempts (e.g., non-admin accessing `/admin`)
  - [ ] Ensure file uploads validated (size, type)
  - [ ] Check for SQL injection vulnerabilities (use parameterized queries)
  - [ ] Verify CORS settings
  - [ ] Test Stripe webhook signature verification

### Day 25 (Sat): Production Deployment
- [ ] Final pre-launch checklist:
  - [ ] All tests passing
  - [ ] All environment variables set in Vercel
  - [ ] Stripe production keys added (switch from test mode)
  - [ ] SendGrid production API key added
  - [ ] Supabase production database populated with JD admin user
  - [ ] Domain DNS configured (superimmersive8.com → Vercel)
  - [ ] SSL certificate active
  - [ ] Google Analytics added (optional)
- [ ] Deploy to Vercel production:
  ```bash
  # From Next.js project directory
  vercel --prod
  ```
- [ ] Verify deployment:
  - [ ] Visit https://superimmersive8.com
  - [ ] Test homepage loads
  - [ ] Test login works
  - [ ] Create test submission with real Stripe payment (small amount)
  - [ ] Verify webhook triggered correctly
  - [ ] Test admin panel access
  - [ ] Test public catalog loads
- [ ] Update Bluehost DNS if needed (already pointing to Vercel)
- [ ] Monitor for errors in Vercel logs and Sentry (if installed)

### Day 26 (Sun): Documentation + Handoff
- [ ] Create `/08_Platform/README.md`:
  - Project overview
  - Tech stack
  - Local development setup
  - Deployment instructions
  - Environment variables reference
  - Common tasks (add admin user, generate catalog ID, etc.)
- [ ] Create `/08_Platform/DEPLOYMENT.md`:
  - Vercel deployment steps
  - Supabase configuration
  - Stripe setup
  - SendGrid setup
  - DNS configuration
  - Troubleshooting common issues
- [ ] Create `/08_Platform/MAINTENANCE.md`:
  - How to review submissions
  - How to approve/reject
  - How to manage catalog
  - How to handle licensing deals
  - How to add admin users
  - How to monitor errors
- [ ] Update CLAUDE.md:
  - Add platform architecture summary
  - Add links to new PRDs and implementation docs
  - Update execution gaps (mark platform as complete)
- [ ] Git commit: "Week 4: Launch complete - v1.0 production"
- [ ] Tag release: `git tag v1.0.0`

**Week 4 Checkpoint:**
- [ ] Website updated with v4 CaaS messaging
- [ ] Full platform tested end-to-end
- [ ] Deployed to production at superimmersive8.com
- [ ] Documentation complete
- [ ] Ready for first real creator signups

---

## Post-Launch (Week 5+)

### Immediate Next Steps (Week 5)
- [ ] Send launch announcement to network (LinkedIn, email)
- [ ] Reach out to Essa and Leon (beta testers)
- [ ] Create sample submission walkthrough video
- [ ] Set up weekly metrics tracking:
  - Creator signups
  - Submissions received
  - Approval rate
  - Opt-in rate
  - Licensing requests
  - Revenue (CaaS + Showcase)

### Future Enhancements (v1.1+)
- [ ] Traditional Chinese (zh-TW) website translation
- [ ] Automated email campaigns (opt-in reminders, re-engagement)
- [ ] Advanced analytics dashboard (conversion funnels, revenue charts)
- [ ] In-app chat for creator-admin communication
- [ ] Bulk upload for creators (multiple submissions at once)
- [ ] API for programmatic submissions (enterprise customers)
- [ ] Mobile-responsive improvements
- [ ] Filmmaker portfolio pages (showcase all their verified work)
- [ ] Referral program (creators refer other creators, earn commission)

---

## Risk Management

### Technical Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| **Puppeteer fails in production** | Medium | High | Test PDF generation in Vercel staging environment early; consider serverless function with increased timeout |
| **Stripe webhook misses** | Low | High | Log all webhook events; add manual payment verification fallback; monitor webhook delivery dashboard |
| **Supabase storage limits** | Low | Medium | Monitor storage usage; compress videos/thumbnails; consider Cloudflare R2 for video hosting if needed |
| **Form abandonment (70 fields)** | High | Medium | Auto-save to localStorage; show progress indicator; allow "Save Draft" |
| **Auth session expires during submission** | Medium | Medium | Extend session timeout; prompt user to save before timeout; restore draft after re-login |
| **PDF generation timeout** | Medium | High | Move to background job queue (Supabase Edge Functions or separate worker); send email when ready |

### Business Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| **No creator signups** | Medium | High | Outreach to Essa/Leon directly; offer first 5 creators 50% discount; share on LinkedIn |
| **Low opt-in rate (<30%)** | Medium | Medium | Improve opt-in messaging; add success stories; consider time-limited bonus (extra promo) |
| **Approval rate too low (<60%)** | Low | High | Review criteria may be too strict; document rejections to find patterns; offer "resubmit with fixes" option |
| **Licensing requests but no closes** | Medium | High | JD may need to actively broker deals; lower commission initially to incentivize buyers; build case studies |
| **MyVideo stalls** | High | Low | Don't wait for MyVideo to launch platform; proceed with creator outreach and SEA agencies in parallel (Track 2) |

---

## Success Criteria

### Week 4 Launch (Minimum)
- [ ] Platform live at superimmersive8.com
- [ ] Creator can submit + pay + receive Rights Package
- [ ] Admin can review + approve + generate PDF
- [ ] Public catalog live with at least 1 opt-in entry (test or real)
- [ ] All critical user flows tested and working

### Month 1 Post-Launch
- [ ] 5+ creator signups
- [ ] 3+ submissions received
- [ ] 2+ submissions approved
- [ ] 1+ opt-in to Showcase
- [ ] $1,500+ revenue (3 verifications minimum)

### Month 3 Post-Launch
- [ ] 20+ creator signups
- [ ] 15+ submissions approved
- [ ] 10+ catalog entries in Showcase
- [ ] 3+ licensing requests received
- [ ] 1+ licensing deal closed
- [ ] $7,500+ CaaS revenue + $2,000+ Showcase revenue

---

## Tools & Resources

### Development
- **Code Editor:** VS Code with extensions:
  - ESLint
  - Prettier
  - Tailwind CSS IntelliSense
  - Supabase (for database queries)
- **API Testing:** Postman or Thunder Client (VS Code extension)
- **Database Client:** Supabase Studio (web UI) or TablePlus
- **Git Client:** Command line or GitHub Desktop

### Design
- **UI Components:** shadcn/ui (https://ui.shadcn.com)
- **Icons:** Lucide React (https://lucide.dev)
- **Colors:** Tailwind CSS default palette
- **Fonts:** Inter (body), Space Grotesk (headings) via Google Fonts

### Monitoring & Analytics
- **Error Tracking:** Sentry (free tier) - optional for v1.0
- **Analytics:** Google Analytics 4 or Plausible - optional for v1.0
- **Uptime Monitoring:** Vercel built-in monitoring
- **Logs:** Vercel logs + Supabase logs

### Communication
- **Email Service:** SendGrid (free tier: 100 emails/day) or Resend.com
- **Email Testing:** Mailpit (local) or Mailtrap (staging)

---

## Daily Standup Template

Use this template to track progress during implementation:

```markdown
## Date: YYYY-MM-DD

### Yesterday
- [ ] Task 1 completed
- [ ] Task 2 in progress

### Today
- [ ] Task 3 (2 hours)
- [ ] Task 4 (3 hours)

### Blockers
- None / [Describe blocker]

### Notes
- [Any important decisions or observations]
```

---

## Handoff Checklist

When platform is ready for JD to use independently:

- [ ] Admin credentials provided (email + password)
- [ ] Admin panel walkthrough video recorded (5-10 minutes)
- [ ] Stripe account ownership transferred (if not already JD's)
- [ ] Supabase project ownership transferred (if not already JD's)
- [ ] GitHub repo access confirmed
- [ ] Vercel project access confirmed
- [ ] SendGrid account access confirmed
- [ ] Documentation reviewed: README, DEPLOYMENT, MAINTENANCE
- [ ] Emergency contact established (for critical bugs)
- [ ] Monitoring alerts configured (Vercel + Supabase)

---

## Contact & Support

**Technical Lead:** [Your Name]
**Product Owner:** JD Lin
**Project Repository:** https://github.com/aip-jd36/superimmersive8

**Questions during implementation:**
- Post in project Slack/Discord (if applicable)
- Email JD directly
- Comment in GitHub issues

---

**Document Status:** ✅ Complete — Ready for execution
**Last Updated:** February 18, 2026
**Next Review:** After Week 1 checkpoint (February 25, 2026)
