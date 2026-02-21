# Account Dashboard — Year 2-3 Platform Vision

## Overview

This document outlines the **self-serve buyer portal** that SI8 will build in Year 2-3, enabling buyers to manage their licenses, re-download files, and access Chain of Titles without emailing JD for support.

**Goal:** Match Getty Images' user experience — every buyer has an account, can see their full license history, and can retrieve files anytime.

**Non-goal (Year 1):** This is NOT built yet. Year 1 = manual email delivery. This document is the roadmap for when SI8 has validated the business model and is ready to scale.

---

## Why a User Account System Matters

### Problem (Year 1)

**Buyer:** "I licensed a video from SI8 6 months ago. I lost the email. Can you resend the download link?"
**JD:** [Manually searches Google Drive, finds folder, copies link, sends email]
**Time cost:** 10-15 minutes per support request

**Scaling problem:** If SI8 has 100 licenses in Year 2, and 5% of buyers lose their email, that's 5 support tickets per month = 1 hour/month of manual work. At 500 licenses (Year 3), that's 25 tickets/month = 5 hours/month.

### Solution (Year 2-3)

**Buyer:** Logs into superimmersive8.com/account → sees all licenses → clicks "Download Chain of Title" → gets new download link instantly
**JD:** [No action required]
**Time cost:** 0 minutes

**Additional benefits:**
- Buyers can browse all their licenses in one place (important for agencies with multiple projects)
- Download history provides audit trail (who downloaded what, when)
- Upsell opportunities (buyer sees catalog, licenses another asset)
- Professional appearance (matches Getty/Adobe Stock UX, builds trust)

---

## User Flows

### Flow 1: First-Time License Purchase

```
1. Buyer browses catalog (no account required)
   → Clicks "License This" on SI8-2026-0001

2. Checkout page
   → Option A: "Create account" (email + password)
   → Option B: "Continue as guest" (email only, no password)
   → Fills: Licensee name, intended use, territory
   → Pays via Stripe

3. Account created automatically (if Option A)
   → Confirmation email sent with:
      - Download links (7-day expiration)
      - Account login credentials
      - "Add to My Licenses" button

4. Buyer clicks "View My Licenses"
   → Logs in (if Option A) or accesses via magic link (if Option B)
   → Sees license in dashboard
   → Downloads files
```

### Flow 2: Returning Buyer (Already Has Account)

```
1. Buyer logs in to superimmersive8.com/account
   → Sees "My Licenses" dashboard
   → Sees catalog recommendation ("Assets similar to what you've licensed")

2. Buyer browses catalog, finds SI8-2026-0099
   → Clicks "License This"
   → Checkout pre-filled with account details
   → Pays via Stripe

3. License added to "My Licenses" immediately
   → Email confirmation sent
   → Buyer downloads from dashboard (no need to check email)
```

### Flow 3: Re-Download After 1 Year

```
1. Buyer's legal team requests Chain of Title for compliance review
   → Buyer logs in to superimmersive8.com/account
   → Finds SI8-2026-0001 in "My Licenses"
   → Clicks "Download Chain of Title (PDF)"
   → New download link generated (S3 pre-signed URL, 7-day expiration)
   → Buyer downloads

Total time: < 2 minutes, zero support tickets
```

### Flow 4: Guest Checkout (No Account)

```
1. Buyer licenses SI8-2026-0001 as guest (no password)
   → Email confirmation sent with magic link

2. 6 months later, buyer needs to re-download
   → Goes to superimmersive8.com/account
   → Clicks "Access My Licenses" → enters email
   → Magic link sent to email (passwordless login)
   → Clicks link → sees license → downloads files

Total time: < 3 minutes, zero support tickets
```

---

## Dashboard UI Design

### Page Structure

```
┌─────────────────────────────────────────────────────────────┐
│ SuperImmersive 8                    Account | Logout        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  My Licenses                                                 │
│  ────────────────────────────────────────────────────────  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ SI8-2026-0001 | Neon Dreams                          │  │
│  │ Licensed: Feb 25, 2026 | Tier 1 Standard              │  │
│  │ Territory: Global | Status: Active                    │  │
│  │                                                        │  │
│  │ ↓ Download Video (MP4)                                │  │
│  │ ↓ Download Chain of Title (PDF)                       │  │
│  │ ↓ Download Invoice (PDF)                              │  │
│  │ → View License Details                                │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ SI8-2026-0015 | Ocean Depths                         │  │
│  │ Licensed: Mar 10, 2026 | Tier 2 Custom Placement     │  │
│  │ Territory: APAC | Status: Active | Exclusive until    │  │
│  │ Sep 10, 2026 (6 months)                              │  │
│  │                                                        │  │
│  │ ↓ Download Custom Video (MP4)                         │  │
│  │ ↓ Download Original Video (MP4)                       │  │
│  │ ↓ Download Chain of Title v2.0 (PDF)                  │  │
│  │ ↓ Download Invoice (PDF)                              │  │
│  │ → View License Details                                │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ────────────────────────────────────────────────────────  │
│  Export All Records (ZIP)                                   │
│  ────────────────────────────────────────────────────────  │
│                                                              │
│  Browse Catalog → [Link to catalog page]                    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### License Detail Page (Expanded View)

When buyer clicks "View License Details":

```
┌─────────────────────────────────────────────────────────────┐
│ ← Back to My Licenses                                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  SI8-2026-0001: Neon Dreams                                 │
│  ──────────────────────────────────────────────────────────│
│                                                              │
│  LICENSE INFORMATION                                         │
│  ────────────────────────────────────────────────────────  │
│  Catalog ID: SI8-2026-0001                                  │
│  Asset Title: Neon Dreams                                   │
│  License Type: Tier 1 Standard (catalog as-is)              │
│  Licensed to: Acme Corporation                              │
│  Purchase Date: February 25, 2026                           │
│  Territory: Global (no restrictions)                        │
│  Status: Active                                             │
│                                                              │
│  DOWNLOADS                                                   │
│  ────────────────────────────────────────────────────────  │
│  ↓ Video File (MP4, 1920x1080, 60fps, 2:15)                │
│  ↓ Chain of Title (PDF, 12 pages)                          │
│  ↓ Invoice (PDF)                                            │
│                                                              │
│  WHAT'S IN YOUR RIGHTS PACKAGE                              │
│  ────────────────────────────────────────────────────────  │
│  ✓ Tool Provenance Log (Runway ML Gen-3 Alpha Turbo)       │
│  ✓ Model Disclosure (gen3a_turbo, Nov 2025)                │
│  ✓ Rights Verified Sign-Off (Reviewed Feb 20, 2026, Tier: Std)   │
│  ✓ Commercial Use Authorization (Paid plan receipts filed) │
│  ✓ Modification Rights: Not authorized (Tier 1 only)       │
│  ✓ Category Conflicts: None                                │
│  ✓ Territory: Global                                        │
│  ✓ Regeneration Rights: N/A (Tier 1)                       │
│  ✓ Version History: Production v1.0, Chain of Title v1.0   │
│                                                              │
│  LICENSE TERMS                                              │
│  ────────────────────────────────────────────────────────  │
│  Your license includes:                                     │
│  • Perpetual, royalty-free commercial use rights            │
│  • Worldwide distribution (unless territory-restricted)     │
│  • Up to 500,000 impressions per deployment                 │
│  • No attribution required (but appreciated)                │
│  • No resale as standalone stock content                    │
│                                                              │
│  Full terms: [Link to license agreement]                    │
│                                                              │
│  DOWNLOAD HISTORY                                           │
│  ────────────────────────────────────────────────────────  │
│  Feb 25, 2026, 3:45 PM — Video file downloaded              │
│  Feb 25, 2026, 3:46 PM — Chain of Title downloaded          │
│  Aug 10, 2026, 10:22 AM — Chain of Title re-downloaded      │
│                                                              │
│  SUPPORT                                                     │
│  ────────────────────────────────────────────────────────  │
│  Questions about this license?                              │
│  Email: jd@superimmersive8.com                              │
│  Expected response time: 24 hours                           │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Technical Architecture (Year 2-3)

### Stack Recommendation

| Component | Technology | Rationale |
|-----------|------------|-----------|
| **Frontend** | Next.js (React) | SEO-friendly, server-side rendering, easy to deploy on Vercel |
| **Backend** | Next.js API routes + Vercel Functions | Serverless, scales automatically, $0 until significant traffic |
| **Database** | PostgreSQL (Supabase or Railway) | Relational, open-source, free tier available |
| **Authentication** | NextAuth.js or Supabase Auth | Email/password + magic links + OAuth (Google/Microsoft) |
| **File Storage** | AWS S3 or Google Cloud Storage | Pre-signed URLs for secure downloads, versioning built-in |
| **Payment** | Stripe Checkout + webhooks | Already using Stripe, webhooks trigger license creation |
| **Email** | Resend (already integrated) | Transactional emails (confirmation, password reset, magic links) |

**Total cost (Year 2, <200 licenses):** ~$50/mo (database hosting + file storage + bandwidth)

### Database Schema

**Users Table:**
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  company VARCHAR(255),
  password_hash VARCHAR(255), -- nullable (magic link users have no password)
  created_at TIMESTAMP DEFAULT NOW(),
  last_login TIMESTAMP
);
```

**Licenses Table:**
```sql
CREATE TABLE licenses (
  id UUID PRIMARY KEY,
  catalog_id VARCHAR(50) UNIQUE NOT NULL, -- e.g., SI8-2026-0001
  user_id UUID REFERENCES users(id),
  asset_title VARCHAR(255) NOT NULL,
  license_type VARCHAR(50) NOT NULL, -- 'Tier 1 Standard' or 'Tier 2 Custom'
  licensee_name VARCHAR(255) NOT NULL, -- can differ from user.name
  intended_use VARCHAR(255),
  territory VARCHAR(100) DEFAULT 'Global',
  amount_paid DECIMAL(10,2),
  currency VARCHAR(10) DEFAULT 'USD',
  purchase_date TIMESTAMP DEFAULT NOW(),
  status VARCHAR(50) DEFAULT 'Active', -- 'Active', 'Refunded', 'Expired'
  exclusivity_until DATE, -- for Tier 2 only
  stripe_payment_id VARCHAR(255),
  video_file_url TEXT, -- S3 key or path
  rights_package_url TEXT,
  invoice_url TEXT,
  notes TEXT
);
```

**Download Logs Table:**
```sql
CREATE TABLE download_logs (
  id UUID PRIMARY KEY,
  license_id UUID REFERENCES licenses(id),
  user_id UUID REFERENCES users(id),
  file_type VARCHAR(50), -- 'video', 'rights_package', 'invoice'
  downloaded_at TIMESTAMP DEFAULT NOW(),
  ip_address VARCHAR(50)
);
```

### API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/auth/login` | POST | Email + password or magic link login |
| `/api/auth/signup` | POST | Create new user account |
| `/api/auth/magic-link` | POST | Send passwordless login link |
| `/api/licenses` | GET | Get all licenses for logged-in user |
| `/api/licenses/[id]` | GET | Get specific license details |
| `/api/licenses/[id]/download` | POST | Generate S3 pre-signed download URL |
| `/api/checkout` | POST | Create Stripe checkout session |
| `/api/webhooks/stripe` | POST | Handle payment confirmation, create license record |

### Stripe Webhook Flow

```
1. Buyer completes Stripe checkout
   ↓
2. Stripe sends webhook to /api/webhooks/stripe
   ↓
3. Verify webhook signature (security)
   ↓
4. Extract payment metadata:
   - Buyer email
   - Catalog ID (SI8-2026-0001)
   - Licensee name
   - Intended use
   - Territory
   ↓
5. Database operations:
   - Check if user exists (by email)
   - If not, create new user record
   - Create new license record
   - Link license to user
   ↓
6. Send confirmation email (via Resend)
   - Include magic link to account (if no password set)
   - Include direct download links (7-day expiration)
   ↓
7. Return 200 OK to Stripe
```

**Total time:** < 5 seconds from payment → license available in dashboard

---

## User Experience Flows

### UX 1: Buyer Loses Password

```
1. Buyer goes to superimmersive8.com/account
2. Clicks "Forgot password?"
3. Enters email → magic link sent
4. Clicks link → logged in automatically
5. Option to set new password (or continue with magic links)
```

### UX 2: Buyer Shares License with Legal Team

```
1. Buyer logs in, navigates to SI8-2026-0001
2. Clicks "Share this license"
3. Enters colleague's email
4. Colleague receives email with:
   - License summary (asset title, ID, date)
   - Read-only view link (no login required)
   - Download links for Chain of Title + Invoice only (not video file)

Note: Video file download requires buyer account login (prevents unauthorized redistribution)
```

### UX 3: Buyer Needs License for Audit (3 Years Later)

```
1. Buyer receives audit request from legal team
2. Logs in to superimmersive8.com/account
3. Finds SI8-2026-0001 (purchased in 2026, now 2029)
4. Clicks "Download Chain of Title" → generates new S3 link
5. Clicks "Download Invoice" → generates new S3 link
6. Clicks "Export License Details (PDF)" → generates audit-ready PDF with:
   - License summary
   - Purchase date
   - Download history log
   - Full license terms

Total time: < 5 minutes, zero support tickets
```

---

## Self-Serve Features (Year 3)

### Feature 1: License Transfer

**Use case:** Buyer licensed for Client A, but client changes. Buyer wants to transfer license to Client B.

**Flow:**
1. Buyer logs in, navigates to license
2. Clicks "Transfer license"
3. Enters new licensee name + email
4. Confirms transfer (warning: "This action cannot be undone")
5. Database updates licensee_name field
6. New licensee receives email with license details
7. Original buyer retains access to license (remains in "My Licenses")

**Limitation (v1):** Transfer allowed only if license unused (no downloads logged). If already deployed, buyer must contact support.

### Feature 2: Usage Reporting

**Use case:** Buyer needs to report to legal team where/when asset was deployed.

**Flow:**
1. Buyer logs in, navigates to license
2. Clicks "Add deployment record"
3. Fills form:
   - Deployment date
   - Platform (website, social media, streaming, broadcast)
   - Estimated impressions
   - Campaign name (optional)
4. Record saved to database (linked to license)
5. Buyer can export deployment history as CSV for compliance reporting

**Benefit:** Creates audit trail, helps buyer stay organized, demonstrates responsible usage.

### Feature 3: Renewal Request (Tier 2 Exclusivity)

**Use case:** Buyer licensed Tier 2 with 6-month exclusivity. Wants to extend exclusivity for another 6 months.

**Flow:**
1. Dashboard shows "Exclusivity expires in 14 days" warning
2. Buyer clicks "Extend exclusivity"
3. Redirected to checkout (renewal fee: 50% of original Tier 2 price)
4. Pays via Stripe → exclusivity_until field updated → confirmation email sent

**Benefit:** Recurring revenue stream, buyer doesn't lose exclusivity.

---

## Admin Dashboard (Internal, JD-Only)

**URL:** superimmersive8.com/admin (password-protected)

**Features:**
- View all licenses (filterable by status, tier, date, buyer)
- Search by catalog ID, buyer email, company
- Manual license creation (for wire transfer payments)
- Refund processing (revoke license, mark as refunded)
- Download analytics (who's downloading what, when)
- Revenue dashboard (total sales, average deal size, Tier 1 vs Tier 2 split)

**Tech:** Same Next.js app, role-based access control (admin users only)

---

## Migration Path (Year 1 → Year 2)

### Step 1: Build Core Platform (Month 6-9)

1. Database schema setup (PostgreSQL on Supabase/Railway)
2. User authentication (NextAuth.js with magic links)
3. "My Licenses" dashboard (read-only view)
4. Download link generation (S3 pre-signed URLs)

**Launch criteria:** Existing Year 1 buyers can log in, see their licenses, re-download files

### Step 2: Integrate with Existing Manual Process (Month 9-12)

1. When Year 1 manual deal closes, JD manually creates user + license in database
2. Send buyer "Your license is now available online" email with login link
3. Gradually migrate all Year 1 buyers to platform

**Goal:** By end of Year 1, all licenses (past and future) are in the platform

### Step 3: Automate New Purchases (Month 12-15, Year 2)

1. Add catalog browse page
2. Integrate Stripe checkout
3. Automate license creation via webhooks
4. Retire manual email delivery process

**Launch criteria:** Buyer can browse → checkout → download without JD's involvement

---

## Open Questions

- **Guest checkout vs. account required?** Guest = lower friction, but Account = better UX long-term. Recommendation: Allow guest, encourage account.
- **How to handle team accounts?** (e.g., agency with 5 employees, all need access to same licenses). Year 3 feature: "Add team members" → shared license pool.
- **Should buyers be able to delete their account?** GDPR requires "right to deletion", but licenses are business records. Recommendation: Buyer can delete account, but license records remain (anonymized: email → "deleted_user_[UUID]").
- **What if buyer's email bounces?** (invalid email at checkout). Stripe checkout validates email, but not deliverability. Recommendation: Log failed email sends, flag in admin dashboard.

---

## Decision Log

| Date | Decision | Rationale |
|------|---------|-----------|
| Feb 21, 2026 | Build account dashboard in Year 2, not Year 1 | Year 1 = validate model with manual process; don't overbuild before product-market fit |
| Feb 21, 2026 | Use Next.js + Supabase stack | Modern, fast, serverless, low cost, easy to hire for in Year 2-3 |
| Feb 21, 2026 | Support both password + magic link auth | Magic link = lower friction (no password to remember), password = familiar UX |
| Feb 21, 2026 | Allow guest checkout | Reduces friction, but encourage account creation with incentive ("Save 10% on next license") |

---

**Next Steps:**
1. Bookmark this document as Year 2 roadmap
2. After 10-20 manual deals in Year 1, revisit platform build timeline
3. Prototype "My Licenses" dashboard (UI mockup in Figma) in Month 6
4. Get buyer feedback on platform features ("What would make this easier for your team?")
5. Budget $5K for initial platform build (outsource to freelance dev or build in-house)
