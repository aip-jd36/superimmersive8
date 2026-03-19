# Technical Architecture: SI8 Creator Platform
## Compliance as a Service + Showcase Marketplace

**Version:** 1.0
**Date:** March 2026
**Business Plan:** BUSINESS_PLAN_v4.md (CaaS model)

---

## Executive Summary

**Platform purpose:** B2B verification service (Gear A) with opt-in creator marketplace (Gear B), built on Supabase + Next.js.

**Core user flows:**
1. **Creator:** Signs up → Submits video for verification ($499) → Gets approved → Downloads Rights Package → Opts into catalog → Earns licensing revenue (20% commission)
2. **Admin (JD):** Reviews submissions → Approves/rejects → Generates Rights Package PDF → Manages catalog
3. **Buyer:** Browses public catalog → Requests licensing → SI8 brokers deal → Film delivered with Rights Package

**Tech stack:**
- **Backend:** Supabase (PostgreSQL, Auth, Storage, Functions)
- **Frontend:** Next.js 14 (App Router, React Server Components, TypeScript)
- **Payments:** Stripe (verification fees, licensing payments)
- **File storage:** Supabase Storage (receipts, Rights Package PDFs)
- **Deployment:** Vercel (frontend), Supabase Cloud (backend)
- **Domain:** superimmersive8.com

**Build timeline:** 4 weeks for MVP (creator portal + admin panel + public catalog + CaaS website)

---

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Public     │  │   Creator    │  │    Admin     │          │
│  │   Website    │  │   Portal     │  │    Panel     │          │
│  │              │  │              │  │              │          │
│  │ • Catalog    │  │ • Dashboard  │  │ • Review     │          │
│  │ • How It     │  │ • Submit     │  │   Queue      │          │
│  │   Works      │  │ • Opt-in     │  │ • Approve/   │          │
│  │ • Pricing    │  │ • Earnings   │  │   Reject     │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│         │                 │                   │                  │
│         └─────────────────┴───────────────────┘                  │
│                           │                                      │
│                    Next.js Frontend                              │
│                    (Vercel Deployment)                           │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            │ HTTPS / API
                            │
┌───────────────────────────┴─────────────────────────────────────┐
│                      BACKEND LAYER                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                   SUPABASE                                │   │
│  │                                                           │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │   │
│  │  │  PostgreSQL │  │    Auth     │  │   Storage   │     │   │
│  │  │             │  │             │  │             │     │   │
│  │  │ • users     │  │ • Sign up   │  │ • Receipts  │     │   │
│  │  │ • submis-   │  │ • Login     │  │ • Rights    │     │   │
│  │  │   sions     │  │ • Email     │  │   Packages  │     │   │
│  │  │ • opt_ins   │  │   verify    │  │ • Avatars   │     │   │
│  │  │ • deals     │  │ • Password  │  │             │     │   │
│  │  │ • rights_   │  │   reset     │  │             │     │   │
│  │  │   packages  │  │ • RLS       │  │ • Public/   │     │   │
│  │  │             │  │             │  │   Private   │     │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘     │   │
│  │                                                           │   │
│  │  ┌─────────────────────────────────────────────────┐    │   │
│  │  │           Edge Functions (Optional)              │    │   │
│  │  │  • PDF generation (Rights Package)               │    │   │
│  │  │  • Email notifications (approval/rejection)      │    │   │
│  │  │  • Webhooks (Stripe payment confirmation)       │    │   │
│  │  └─────────────────────────────────────────────────┘    │   │
│  │                                                           │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            │ API / Webhooks
                            │
┌───────────────────────────┴─────────────────────────────────────┐
│                    EXTERNAL SERVICES                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │    Stripe    │  │   SendGrid   │  │    Vercel    │          │
│  │              │  │     (or      │  │              │          │
│  │ • Payment    │  │  Resend.com) │  │ • Hosting    │          │
│  │   processing │  │              │  │ • CDN        │          │
│  │ • Invoicing  │  │ • Email      │  │ • Analytics  │          │
│  │ • Webhooks   │  │   delivery   │  │              │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Database Schema (Supabase PostgreSQL)

### Core Tables

#### 1. `users`

Stores user accounts (creators, admins, buyers).

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  full_name VARCHAR(255),
  role VARCHAR(50) DEFAULT 'creator', -- 'creator', 'admin', 'buyer'
  profile_image_url TEXT,
  bio TEXT,
  website_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  stripe_customer_id VARCHAR(255), -- For payment tracking

  -- Supabase Auth integration
  auth_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_auth_id ON users(auth_id);
```

**Notes:**
- `auth_id` links to Supabase Auth (handles password, email verification, etc.)
- `role` determines permissions (Row Level Security policies)
- `stripe_customer_id` links to Stripe for payment tracking

---

#### 2. `submissions`

Stores verification submissions (70-field intake form data).

```sql
CREATE TABLE submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,

  -- Production Overview (Section 2)
  title VARCHAR(255) NOT NULL,
  runtime_seconds INTEGER,
  genre VARCHAR(100),
  logline TEXT,
  intended_use VARCHAR(50), -- 'licensing', 'placement', 'both'

  -- Tool Disclosure (Section 3)
  tools_used JSONB, -- Array of {tool, version, plan_type, production_dates}

  -- Human Authorship Declaration (Section 4)
  authorship_statement TEXT, -- Min 150 words

  -- Likeness & Identity (Section 5)
  likeness_confirmed BOOLEAN DEFAULT FALSE,

  -- IP & Brand Confirmation (Section 6)
  ip_confirmed BOOLEAN DEFAULT FALSE,

  -- Audio & Music (Section 7)
  audio_source VARCHAR(50), -- 'ai_generated', 'licensed', 'silent'
  audio_documentation TEXT,

  -- Modification Rights (Section 8)
  modification_authorized BOOLEAN DEFAULT FALSE,
  modification_scope TEXT, -- 'full_work', 'specific_scenes', details

  -- Territory & Exclusivity (Section 9)
  territory VARCHAR(50) DEFAULT 'global',
  existing_restrictions TEXT,

  -- Supporting Materials (Section 10)
  receipt_urls JSONB, -- Array of Supabase Storage URLs
  process_screenshots_urls JSONB,

  -- Review Status
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'under_review', 'approved', 'rejected', 'needs_info'
  reviewer_id UUID REFERENCES users(id), -- Admin who reviewed
  review_notes TEXT,
  reviewed_at TIMESTAMP WITH TIME ZONE,

  -- Payment
  payment_status VARCHAR(50) DEFAULT 'unpaid', -- 'unpaid', 'paid', 'refunded'
  stripe_payment_intent_id VARCHAR(255),
  amount_paid INTEGER, -- In cents ($499 = 49900)

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_submissions_user_id ON submissions(user_id);
CREATE INDEX idx_submissions_status ON submissions(status);
CREATE INDEX idx_submissions_payment_status ON submissions(payment_status);
CREATE INDEX idx_submissions_created_at ON submissions(created_at DESC);
```

**Notes:**
- `tools_used` is JSONB for flexible structure (each tool has multiple fields)
- `status` drives review workflow
- `payment_status` ensures only paid submissions are reviewed

---

#### 3. `opt_ins`

Tracks which submissions have opted into the catalog.

```sql
CREATE TABLE opt_ins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID REFERENCES submissions(id) ON DELETE CASCADE UNIQUE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,

  opted_in BOOLEAN DEFAULT FALSE,
  opted_in_at TIMESTAMP WITH TIME ZONE,

  -- Catalog visibility
  visible BOOLEAN DEFAULT TRUE, -- Admin can hide without removing opt-in

  -- Video file
  video_url TEXT NOT NULL, -- YouTube/Vimeo embed or Supabase Storage URL
  thumbnail_url TEXT,

  -- Catalog metadata
  catalog_description TEXT,
  tags JSONB, -- Array of strings for filtering

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_opt_ins_submission_id ON opt_ins(submission_id);
CREATE INDEX idx_opt_ins_user_id ON opt_ins(user_id);
CREATE INDEX idx_opt_ins_visible ON opt_ins(visible);
```

**Notes:**
- One opt-in per submission (UNIQUE constraint)
- `visible` allows admin to moderate catalog without deleting opt-in record
- `video_url` can be YouTube/Vimeo embed (no video hosting costs for MVP) or Supabase Storage for uploaded files

---

#### 4. `rights_packages`

Stores generated Rights Package data (9-field Chain of Title).

```sql
CREATE TABLE rights_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID REFERENCES submissions(id) ON DELETE CASCADE UNIQUE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,

  -- 9-field Chain of Title structure
  tool_provenance_log JSONB, -- Structured: [{tool, version, plan, dates, receipt_on_file}]
  model_disclosure TEXT,
  rights_verified_signoff JSONB, -- {reviewer, review_date, tier_assigned, conditions}
  commercial_use_authorization JSONB, -- {confirmed, receipts_filed}
  modification_rights_status JSONB, -- {authorized, scope, details}
  category_conflict_log JSONB, -- Array of restricted categories
  territory_log VARCHAR(255) DEFAULT 'Global',
  regeneration_rights_status JSONB, -- {authorized, archived_files}
  version_history JSONB, -- Array of {version, date, modifications}

  -- PDF generation
  pdf_url TEXT, -- Supabase Storage URL for generated PDF
  pdf_generated_at TIMESTAMP WITH TIME ZONE,

  -- Catalog ID (SI8-YYYY-####)
  catalog_id VARCHAR(50) UNIQUE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_rights_packages_submission_id ON rights_packages(submission_id);
CREATE INDEX idx_rights_packages_catalog_id ON rights_packages(catalog_id);
```

**Notes:**
- `catalog_id` format: `SI8-2026-0001` (year + sequential number)
- JSONB fields allow structured data that can become PDF sections
- `pdf_url` points to generated Rights Package PDF in Supabase Storage

---

#### 5. `licensing_deals`

Tracks licensing deals (Gear B revenue).

```sql
CREATE TABLE licensing_deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID REFERENCES submissions(id) ON DELETE CASCADE,
  rights_package_id UUID REFERENCES rights_packages(id) ON DELETE CASCADE,
  creator_id UUID REFERENCES users(id) ON DELETE CASCADE,
  buyer_id UUID REFERENCES users(id), -- Optional if buyer not registered

  -- Deal details
  buyer_name VARCHAR(255) NOT NULL,
  buyer_email VARCHAR(255) NOT NULL,
  buyer_company VARCHAR(255),

  license_type VARCHAR(100), -- 'editorial', 'non_exclusive_commercial', 'category_exclusive', 'fully_exclusive'
  territory VARCHAR(255) DEFAULT 'Global',
  duration_months INTEGER, -- NULL = perpetual

  -- Pricing
  deal_value INTEGER NOT NULL, -- In cents
  si8_commission INTEGER NOT NULL, -- In cents (20% of deal_value)
  creator_payout INTEGER NOT NULL, -- In cents (80% of deal_value)

  -- Payment tracking
  payment_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'paid', 'partially_paid', 'disputed'
  stripe_payment_intent_id VARCHAR(255),
  paid_at TIMESTAMP WITH TIME ZONE,

  -- Status
  status VARCHAR(50) DEFAULT 'negotiating', -- 'negotiating', 'signed', 'delivered', 'completed'
  contract_signed_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_licensing_deals_submission_id ON licensing_deals(submission_id);
CREATE INDEX idx_licensing_deals_creator_id ON licensing_deals(creator_id);
CREATE INDEX idx_licensing_deals_status ON licensing_deals(status);
CREATE INDEX idx_licensing_deals_created_at ON licensing_deals(created_at DESC);
```

**Notes:**
- Tracks Gear B (Showcase licensing) revenue
- `si8_commission` is 20% of `deal_value`
- `buyer_id` can be NULL if buyer doesn't create account (manual entry by admin)

---

### Supporting Tables

#### 6. `notifications`

User notifications (approval, rejection, licensing requests).

```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,

  type VARCHAR(50) NOT NULL, -- 'submission_approved', 'submission_rejected', 'licensing_request', 'deal_completed'
  title VARCHAR(255) NOT NULL,
  message TEXT,
  link_url TEXT, -- Deep link to relevant page

  read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
```

---

#### 7. `audit_log`

Admin actions for compliance tracking.

```sql
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES users(id) ON DELETE SET NULL,

  action VARCHAR(100) NOT NULL, -- 'approved_submission', 'rejected_submission', 'generated_rights_package', 'edited_catalog', etc.
  target_type VARCHAR(50), -- 'submission', 'user', 'deal'
  target_id UUID,

  details JSONB, -- Flexible metadata about the action

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_audit_log_admin_id ON audit_log(admin_id);
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at DESC);
```

---

## Row Level Security (RLS) Policies

Supabase uses PostgreSQL Row Level Security to enforce permissions at the database level.

### Example: `submissions` table

```sql
-- Enable RLS
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;

-- Policy: Creators can view only their own submissions
CREATE POLICY "Creators can view own submissions"
  ON submissions FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Creators can insert their own submissions
CREATE POLICY "Creators can insert submissions"
  ON submissions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Admins can view all submissions
CREATE POLICY "Admins can view all submissions"
  ON submissions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Policy: Admins can update all submissions (review, status changes)
CREATE POLICY "Admins can update submissions"
  ON submissions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_id = auth.uid()
      AND users.role = 'admin'
    )
  );
```

**Notes:**
- RLS ensures data isolation (creators can't see each other's submissions)
- Admin role bypasses creator restrictions
- Similar policies apply to `opt_ins`, `rights_packages`, `licensing_deals`, `notifications`

---

## File Storage (Supabase Storage)

### Buckets

```
receipts/              (Private: only creator + admin can access)
├── {user_id}/
│   └── {submission_id}/
│       ├── receipt-1.pdf
│       ├── receipt-2.jpg
│       └── screenshot-1.png

rights-packages/       (Private: only creator + admin can access)
├── {submission_id}/
│   └── rights-package-SI8-2026-0001.pdf

avatars/               (Public: profile images)
├── {user_id}.jpg

catalog-thumbnails/    (Public: catalog grid images)
├── {submission_id}.jpg
```

### Storage Policies

```javascript
// receipts bucket: Private
{
  "name": "Creators can upload receipts",
  "definition": "bucket_id = 'receipts' AND auth.uid() = (storage.foldername(name))[1]::uuid"
}

{
  "name": "Admins can view all receipts",
  "definition": "bucket_id = 'receipts' AND auth.role() = 'admin'"
}

// rights-packages bucket: Private
{
  "name": "Creators can download own rights packages",
  "definition": "bucket_id = 'rights-packages' AND auth.uid() IN (SELECT user_id FROM rights_packages WHERE submission_id = (storage.foldername(name))[1]::uuid)"
}

// catalog-thumbnails bucket: Public (read-only)
{
  "name": "Anyone can view catalog thumbnails",
  "definition": "bucket_id = 'catalog-thumbnails'"
}
```

---

## Authentication Flow (Supabase Auth)

### Sign Up

```typescript
// Creator signs up with email + password
const { data, error } = await supabase.auth.signUp({
  email: 'creator@example.com',
  password: 'securepassword',
  options: {
    data: {
      full_name: 'John Doe',
      role: 'creator'
    },
    emailRedirectTo: 'https://superimmersive8.com/auth/callback'
  }
})

// After email verification, create user record in `users` table
await supabase.from('users').insert({
  auth_id: data.user.id,
  email: data.user.email,
  full_name: 'John Doe',
  role: 'creator'
})
```

### Login

```typescript
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'creator@example.com',
  password: 'securepassword'
})

// Redirect to dashboard after successful login
router.push('/dashboard')
```

### Password Reset

```typescript
// Request password reset email
await supabase.auth.resetPasswordForEmail('creator@example.com', {
  redirectTo: 'https://superimmersive8.com/auth/reset-password'
})

// Update password with token
await supabase.auth.updateUser({
  password: 'newpassword'
})
```

---

## API Endpoints (Next.js API Routes)

### Creator Portal Endpoints

```
POST   /api/submissions/create          Create new submission
GET    /api/submissions                 Get user's submissions
GET    /api/submissions/[id]            Get single submission
PATCH  /api/submissions/[id]/opt-in     Opt into catalog

GET    /api/rights-packages/[id]        Download Rights Package PDF
GET    /api/deals                       Get user's licensing deals
```

### Admin Panel Endpoints

```
GET    /api/admin/submissions           Get all submissions (paginated, filterable)
PATCH  /api/admin/submissions/[id]      Update submission status (approve/reject)
POST   /api/admin/rights-packages/generate  Generate Rights Package PDF

GET    /api/admin/catalog               Get all catalog entries
PATCH  /api/admin/catalog/[id]/visibility   Toggle catalog visibility

GET    /api/admin/deals                 Get all licensing deals
POST   /api/admin/deals/create          Create new licensing deal manually
```

### Public Endpoints

```
GET    /api/catalog                     Get public catalog (opt-ins only, visible=true)
GET    /api/catalog/[id]                Get single catalog entry
POST   /api/catalog/[id]/request-license  Submit licensing request (creates lead)
```

---

## Payment Flow (Stripe Integration)

### Verification Payment ($499)

**Flow:**
1. Creator fills out submission form
2. Before submitting, redirected to Stripe Checkout
3. Stripe Checkout session created:
```typescript
const session = await stripe.checkout.sessions.create({
  payment_method_types: ['card'],
  line_items: [{
    price_data: {
      currency: 'usd',
      product_data: {
        name: 'Chain of Title Verification',
        description: 'AI video rights verification service'
      },
      unit_amount: 49900 // $499.00 in cents
    },
    quantity: 1
  }],
  mode: 'payment',
  success_url: 'https://superimmersive8.com/submit/success?session_id={CHECKOUT_SESSION_ID}',
  cancel_url: 'https://superimmersive8.com/submit/cancel',
  client_reference_id: submissionId, // Link payment to submission
  customer_email: user.email
})
```

4. After successful payment, Stripe webhook fires:
```typescript
// /api/webhooks/stripe
const event = stripe.webhooks.constructEvent(request.body, sig, webhookSecret)

if (event.type === 'checkout.session.completed') {
  const session = event.data.object
  const submissionId = session.client_reference_id

  // Update submission payment status
  await supabase
    .from('submissions')
    .update({
      payment_status: 'paid',
      stripe_payment_intent_id: session.payment_intent,
      amount_paid: session.amount_total
    })
    .eq('id', submissionId)
}
```

5. Submission becomes visible in admin review queue

---

### Licensing Payment (20% commission to SI8, 80% to creator)

**Flow:**
1. Buyer requests licensing → Admin creates deal record
2. Stripe invoice sent to buyer for full amount
3. After buyer pays, Stripe Connect payout to creator (80%) + SI8 platform fee (20%)

**Implementation (Year 2):** Stripe Connect for automated payouts. **Year 1:** Manual payouts via bank transfer after deals close.

---

## PDF Generation (Rights Package)

### Approach

**Year 1 (MVP):** Server-side PDF generation using `@react-pdf/renderer` or `puppeteer`

**Flow:**
1. Admin clicks "Approve" → triggers Rights Package generation
2. API route `/api/admin/rights-packages/generate` called
3. Fetch submission data + generate 9-field Chain of Title structure
4. Render PDF using template
5. Upload PDF to Supabase Storage (`rights-packages/` bucket)
6. Save PDF URL to `rights_packages` table
7. Send notification to creator with download link

**Example (puppeteer approach):**
```typescript
import puppeteer from 'puppeteer'

async function generateRightsPackagePDF(submissionId: string) {
  // Fetch submission + rights package data
  const { data } = await supabase
    .from('submissions')
    .select('*, rights_packages(*)')
    .eq('id', submissionId)
    .single()

  // Render HTML template
  const html = renderRightsPackageTemplate(data)

  // Generate PDF with puppeteer
  const browser = await puppeteer.launch()
  const page = await browser.newPage()
  await page.setContent(html)
  const pdfBuffer = await page.pdf({ format: 'A4' })
  await browser.close()

  // Upload to Supabase Storage
  const fileName = `rights-package-${data.rights_packages.catalog_id}.pdf`
  const { data: uploadData } = await supabase.storage
    .from('rights-packages')
    .upload(`${submissionId}/${fileName}`, pdfBuffer)

  // Update rights_packages record with PDF URL
  await supabase
    .from('rights_packages')
    .update({ pdf_url: uploadData.path, pdf_generated_at: new Date().toISOString() })
    .eq('submission_id', submissionId)
}
```

---

## Email Notifications

### Transactional Emails (SendGrid or Resend.com)

**Templates needed:**

1. **Submission Received**
   - Sent to: Creator after payment + submission
   - Content: "Your submission is under review. We'll notify you within 5 business days."

2. **Submission Approved**
   - Sent to: Creator after admin approval
   - Content: "Congratulations! Your submission has been approved. Download your Rights Package here: [link]. Would you like to list this in our catalog for licensing opportunities? [Opt-in link]"

3. **Submission Rejected**
   - Sent to: Creator if submission fails review
   - Content: "Your submission did not pass our Rights Verified process. Reason: [reason]. You can resubmit with corrections."

4. **Opt-In Confirmation**
   - Sent to: Creator after opting into catalog
   - Content: "Your film is now live in the SI8 catalog. View it here: [catalog link]. You'll earn 80% of any licensing deals."

5. **Licensing Request**
   - Sent to: Creator when buyer requests licensing
   - Content: "Good news! A buyer has requested licensing for your film '[title]'. Proposed deal: $[amount]. Approve or decline here: [link]"

6. **Deal Completed**
   - Sent to: Creator after deal closes
   - Content: "Your licensing deal has been completed. You earned $[payout]. Payment will be processed within 7 business days."

---

## Security Considerations

### 1. Row Level Security (RLS)
- **All tables have RLS enabled** — no data leakage between users
- Admin role has elevated permissions (can view/edit all submissions)

### 2. File Upload Validation
- **Receipt uploads:** Max 10MB per file, accepted formats: PDF, JPG, PNG
- **Malware scanning:** Use Supabase Storage's built-in virus scanning (Enterprise plan) or third-party service (Year 2)
- **Private storage:** Receipts and Rights Packages not publicly accessible

### 3. Payment Security
- **Stripe handles all payment data** — SI8 never stores credit card info
- **Webhook signature verification** — ensures webhooks are from Stripe
- **Idempotency keys** — prevent duplicate charges

### 4. Authentication
- **Password hashing:** Supabase Auth uses bcrypt
- **Email verification required** — users can't submit until email verified
- **Rate limiting:** Prevent brute-force login attempts (Supabase built-in)

### 5. HTTPS Everywhere
- **All API requests over HTTPS** (enforced by Vercel + Supabase)
- **Secure cookies** — httpOnly, sameSite=strict

---

## Performance Optimization

### 1. Database Indexes
- All foreign keys indexed
- Common query patterns indexed (status, created_at, user_id)

### 2. Caching
- **Public catalog:** Cache with Vercel Edge (CDN)
- **Static pages:** Pre-render at build time (Next.js ISR)
- **User dashboard:** Real-time updates via Supabase Realtime (optional)

### 3. File Storage
- **CDN for public files:** Supabase Storage serves files via CDN
- **Image optimization:** Use Next.js Image component for thumbnails

### 4. Query Optimization
- **Pagination:** All list views paginated (50 items per page)
- **Select only needed fields:** Avoid `SELECT *` in production
- **Joins minimized:** Denormalize where appropriate (e.g., copy creator name to deals table)

---

## Monitoring & Analytics

### Application Monitoring

**Vercel Analytics:**
- Page load times
- API endpoint latency
- Error rates

**Supabase Dashboard:**
- Database connection pool usage
- Query performance (slow queries flagged)
- Storage usage

### Business Metrics

**Custom dashboard (admin panel):**
- Total submissions (by status)
- Opt-in conversion rate (submissions → opt-ins)
- Catalog → licensing conversion rate
- Revenue by gear (CaaS, Showcase, Producer)
- Average review time per submission
- User growth (creators, buyers)

---

## Deployment Strategy

### Environments

```
Development  → localhost:3000 (local Next.js dev server)
Staging      → staging.superimmersive8.com (Vercel preview deployment)
Production   → superimmersive8.com (Vercel production deployment)
```

### CI/CD Pipeline (Vercel)

```
GitHub push → main branch
  ↓
Vercel auto-deploy
  ↓
Build Next.js app
  ↓
Run tests (optional)
  ↓
Deploy to production
  ↓
Invalidate CDN cache
```

### Database Migrations

**Supabase Migrations:**
- Use Supabase CLI to manage schema changes
- Migrations stored in `supabase/migrations/` folder
- Applied automatically on `supabase db push`

```bash
# Create new migration
supabase migration new add_submissions_table

# Apply migrations
supabase db push
```

---

## Technology Stack Summary

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend** | Next.js 14 (App Router) | React framework with SSR, API routes |
| **UI Components** | Tailwind CSS + shadcn/ui | Styling + pre-built components |
| **Backend** | Supabase | PostgreSQL database + Auth + Storage |
| **Payments** | Stripe | Payment processing + invoicing |
| **Email** | SendGrid or Resend.com | Transactional emails |
| **File Storage** | Supabase Storage | Receipts, Rights Packages, images |
| **PDF Generation** | Puppeteer or @react-pdf/renderer | Rights Package PDFs |
| **Hosting** | Vercel | Frontend deployment + CDN |
| **Domain** | superimmersive8.com | Existing domain (Bluehost DNS → Vercel) |
| **Version Control** | GitHub | Code repository |
| **Analytics** | Vercel Analytics | Performance monitoring |

---

## Open Questions & Future Considerations

### Year 1 MVP Scope

**In scope:**
- Creator signup, login, submission form
- Admin review queue, approve/reject, Rights Package generation
- Opt-in checkbox after approval
- Public catalog with Rights Verified badges
- Manual licensing deal creation by admin

**Out of scope (Year 2+):**
- Self-serve licensing (buyers purchase directly via Stripe)
- Automated payouts (Stripe Connect)
- Advanced search/filters on catalog
- Creator messaging system
- Buyer accounts (Year 1 = guest checkouts only)
- API for enterprise integration

### Migration from Current Website

**Current:** Static HTML/CSS/JS on Bluehost
**New:** Next.js app on Vercel

**Migration plan:**
1. Build Next.js app (4 weeks)
2. Deploy to staging.superimmersive8.com
3. Test all flows (creator, admin, public)
4. Update DNS (superimmersive8.com → Vercel)
5. Old website archived (Bluehost files remain as backup)

**No downtime:** DNS update takes 24-48 hours, but Vercel edge handles traffic immediately

---

## Next Steps

1. **Create PRDs** for each user-facing component:
   - Creator Portal
   - Admin Panel
   - Public Catalog
   - CaaS Website Update

2. **Implementation Plan:** 4-week sprint breakdown

3. **Start coding:** Week 1 = Supabase setup + database schema + auth

---

**Document Status:** ✅ Complete — Ready for PRD creation
**Next:** `08_Platform/prds/PRD_CREATOR_PORTAL.md`
