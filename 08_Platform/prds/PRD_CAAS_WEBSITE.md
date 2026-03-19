# PRD: CaaS Website Update
## Homepage, How It Works, Pricing for Verification Service

**Version:** 1.0
**Date:** March 2026
**Technical Architecture:** `08_Platform/architecture/TECHNICAL_ARCHITECTURE.md`
**Business Context:** BUSINESS_PLAN_v4.md (CaaS model, Gear A = $499 verification service)

---

## Executive Summary

**Purpose:** Update superimmersive8.com to reflect the v4 CaaS business model (Compliance as a Service + Showcase Marketplace).

**Target audiences:**
- **Primary:** Production agencies, brands, filmmakers (verification customers)
- **Secondary:** Buyers (catalog browsers)

**Key pages to update:**
1. **Homepage:** CaaS positioning, two paths (Get Verified / Browse Catalog), social proof
2. **How It Works:** Explain verification process, Rights Verified criteria, 5-day turnaround
3. **Pricing:** $499 per video, what's included, FAQs
4. **Nav updates:** Add Creator Login, Admin Login

**Success metrics:**
- 20%+ of homepage visitors click "Get Verified" CTA (primary conversion)
- 10%+ click "Browse Catalog" CTA (secondary conversion)
- <3% bounce rate on How It Works page (indicates clear messaging)
- >50% of Pricing page visitors click "Get Started" (intent signal)

---

## Page-by-Page Requirements

### 1. Homepage (`/`)

**Primary goal:** Convert visitors to sign up for verification or browse catalog.

**Layout Structure:**

```
┌─────────────────────────────────────────────────────────────┐
│  NAVIGATION                                                  │
│  SI8 Logo   How It Works   Pricing   Catalog   Login        │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  HERO SECTION                                                │
│                                                              │
│  Chain of Title Verification                                 │
│  for AI Video Content                                        │
│                                                              │
│  Get commercial use documentation for Sora, Runway, and      │
│  Kling outputs. $499 per video, 5-day turnaround.           │
│                                                              │
│  [Get Verified]  [Browse Catalog]                            │
│                                                              │
│  "Adobe verifies Firefly only. We verify the tools your      │
│  legal team is blocking."                                    │
│                                                              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  SOCIAL PROOF SECTION                                        │
│                                                              │
│  Trusted by creators and brands                              │
│                                                              │
│  [Logo 1]  [Logo 2]  [Logo 3]  (if available)               │
│  "20+ films verified" | "10+ agencies served"                │
│                                                              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  TWO PATHS SECTION                                           │
│                                                              │
│  ┌────────────────────────┐  ┌────────────────────────────┐│
│  │ For Creators &         │  │ For Buyers & Agencies      ││
│  │ Production Houses      │  │                            ││
│  │                        │  │                            ││
│  │ Get Your Video         │  │ Browse Rights Verified     ││
│  │ Verified               │  │ Catalog                    ││
│  │                        │  │                            ││
│  │ • $499 per video       │  │ • 20+ verified films       ││
│  │ • 5-day turnaround     │  │ • Commercial use cleared   ││
│  │ • Rights Package PDF   │  │ • Non-exclusive licensing  ││
│  │ • Opt into catalog     │  │ • Starting at $2,000       ││
│  │                        │  │                            ││
│  │ [Get Started →]        │  │ [Browse Catalog →]         ││
│  └────────────────────────┘  └────────────────────────────┘│
│                                                              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  WHAT IS RIGHTS VERIFIED SECTION                             │
│                                                              │
│  What We Verify                                              │
│                                                              │
│  ✓ AI tool provenance (Sora, Runway, Kling, etc.)           │
│  ✓ Commercial use authorization (paid plans, receipts)      │
│  ✓ No real person likeness (faces, voices, impersonation)   │
│  ✓ No copyrighted IP (characters, brands, logos)            │
│  ✓ Human authorship documented (creative direction)         │
│                                                              │
│  [Learn More About Our Process →]                            │
│                                                              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  HOW IT WORKS SECTION (3 steps)                              │
│                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                 │
│  │    1     │  │    2     │  │    3     │                 │
│  │ Submit   │  │ Review   │  │ Receive  │                 │
│  │          │  │          │  │          │                 │
│  │ Upload   │  │ We verify│  │ Download │                 │
│  │ your     │  │ within   │  │ Rights   │                 │
│  │ video +  │  │ 5 days   │  │ Package  │                 │
│  │ receipts │  │          │  │ PDF      │                 │
│  └──────────┘  └──────────┘  └──────────┘                 │
│                                                              │
│  [See Full Process →]                                        │
│                                                              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  PRICING SECTION (CTA)                                       │
│                                                              │
│  Start at $499 per video                                     │
│                                                              │
│  What's included:                                            │
│  • Manual review (90 min per video)                          │
│  • 9-field Chain of Title documentation                      │
│  • Rights Package PDF                                        │
│  • Opt-in to catalog (earn 80% of licensing deals)          │
│                                                              │
│  [Get Verified Now →]  [View Pricing Details →]             │
│                                                              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  FAQ SECTION (5-7 common questions)                          │
│                                                              │
│  ▼ What tools do you verify?                                │
│  ▼ How long does verification take?                          │
│  ▼ What if my submission is rejected?                        │
│  ▼ Can I license my verified work?                           │
│  ▼ Do you verify Adobe Firefly outputs?                      │
│                                                              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  FOOTER                                                      │
│  About | Contact | Terms | Privacy | Blog                   │
│  © 2026 SuperImmersive 8. All rights reserved.               │
└─────────────────────────────────────────────────────────────┘
```

**Acceptance criteria:**
- [ ] Hero section: Clear H1 ("Chain of Title Verification for AI Video Content"), subheading, two CTAs
- [ ] Social proof: "20+ films verified" badge (update dynamically from database)
- [ ] Two Paths: Side-by-side cards for Creators vs. Buyers
- [ ] What We Verify: 5 checkmarks with brief descriptions
- [ ] How It Works: 3-step visual (icons + short text)
- [ ] Pricing CTA: "$499 per video" prominently displayed, CTA button
- [ ] FAQ: Expandable accordions for 5-7 questions
- [ ] Mobile responsive: Single column on mobile, two-column on desktop
- [ ] Bilingual: English + Traditional Chinese (zh-TW) versions

**Copy notes:**
- **Headline:** Clear, benefit-focused ("Chain of Title Verification for AI Video Content" not "Welcome to SI8")
- **Subheadline:** Address pain point ("Adobe verifies Firefly only. We verify Sora, Runway, Kling.")
- **CTAs:** Action-oriented ("Get Verified" not "Learn More")
- **Tone:** Professional, confident, non-technical (avoid jargon like "RLS" or "JSONB")

---

### 2. How It Works Page (`/how-it-works`)

**Primary goal:** Explain the verification process in detail, build trust, convert to signup.

**Layout Structure:**

```
┌─────────────────────────────────────────────────────────────┐
│  HERO                                                        │
│  How Rights Verified Works                                   │
│  5-day turnaround | $499 per video | 90-minute review       │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  PROCESS OVERVIEW (3 steps, detailed)                        │
│                                                              │
│  Step 1: Submit Your Video                                   │
│  • Create account (email + password)                         │
│  • Fill 10-section submission form (~20 minutes)            │
│  • Upload tool receipts (Runway, Sora, Kling, etc.)         │
│  • Pay $499 via Stripe                                       │
│  • Receive confirmation email                                │
│                                                              │
│  Step 2: We Review (Within 5 Business Days)                 │
│  Our verification process checks:                            │
│  ✓ Tool Provenance: Which AI tools were used? Paid plans?   │
│  ✓ Human Authorship: Evidence of creative direction?        │
│  ✓ Likeness & Identity: Any real person faces or voices?    │
│  ✓ IP & Brand Safety: Copyrighted characters or logos?      │
│  ✓ Audio Rights: Music cleared for commercial use?          │
│                                                              │
│  Step 3: Receive Rights Package                              │
│  If approved:                                                │
│  • Download 9-field Chain of Title PDF                       │
│  • Catalog ID assigned (e.g., SI8-2026-0001)                │
│  • Option to list in catalog (earn 80% of licensing deals)  │
│                                                              │
│  If rejected:                                                │
│  • Clear reason provided (missing receipts, IP issue, etc.) │
│  • Free resubmission after corrections                       │
│                                                              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  WHAT'S INCLUDED (Rights Package breakdown)                  │
│                                                              │
│  Your Rights Package includes 9 documentation fields:        │
│  1. Tool Provenance Log (which tools, versions, plans)       │
│  2. Model Disclosure (AI models used)                        │
│  3. Rights Verified Sign-off (reviewer, date, tier)          │
│  4. Commercial Use Authorization (plan receipts on file)     │
│  5. Modification Rights Status (can brands integrate?)       │
│  6. Category Conflict Log (restricted use cases)             │
│  7. Territory Log (geographic rights)                        │
│  8. Regeneration Rights Status (original files archived?)    │
│  9. Version History (audit trail)                            │
│                                                              │
│  [Example Rights Package PDF →]                              │
│                                                              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  TWO RISK TIERS                                              │
│                                                              │
│  Standard Tier (Most Common)                                 │
│  Tools: Sora, Runway, Kling, Pika (paid plans)              │
│  For: Agencies, brands, streaming platforms                  │
│  Price: $499                                                 │
│                                                              │
│  Certified Tier (Maximum Defensibility)                      │
│  Tools: Adobe Firefly only                                   │
│  For: Fortune 500, financial services, risk-averse brands    │
│  Price: $499                                                 │
│                                                              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  CATALOG OPT-IN (Optional)                                   │
│                                                              │
│  After verification, you can opt into our catalog:           │
│  • Your film appears on superimmersive8.com/catalog          │
│  • Buyers can request licensing                              │
│  • You earn 80% of any licensing deals                       │
│  • Non-exclusive (you can still license elsewhere)           │
│                                                              │
│  Example: Buyer pays $5,000 → You get $4,000 → SI8 gets $1K │
│                                                              │
│  [Browse Catalog Examples →]                                 │
│                                                              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  CTA SECTION                                                 │
│  Ready to get verified?                                      │
│  [Get Started →]  or  [View Pricing →]                       │
└─────────────────────────────────────────────────────────────┘
```

**Acceptance criteria:**
- [ ] 3-step process explained in detail (Submit, Review, Receive)
- [ ] Rights Package 9-field breakdown (what buyers actually get)
- [ ] Two risk tiers explained (Standard vs. Certified)
- [ ] Catalog opt-in section (80/20 split, non-exclusive)
- [ ] Example Rights Package PDF download (redacted sample)
- [ ] CTA at bottom (Get Started, View Pricing)
- [ ] Mobile responsive
- [ ] Bilingual (EN + ZH-TW)

---

### 3. Pricing Page (`/pricing`)

**Primary goal:** Clear pricing, build trust with "what's included", convert to signup.

**Layout Structure:**

```
┌─────────────────────────────────────────────────────────────┐
│  HERO                                                        │
│  Pricing                                                     │
│  Simple, transparent. No hidden fees.                        │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  PRICING CARD                                                │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐│
│  │                                                         ││
│  │  Chain of Title Verification                            ││
│  │                                                         ││
│  │  $499                                                   ││
│  │  per video                                              ││
│  │                                                         ││
│  │  What's Included:                                       ││
│  │  ✓ Manual review (90 min per video)                    ││
│  │  ✓ 9-field Chain of Title documentation                ││
│  │  ✓ Rights Package PDF                                   ││
│  │  ✓ Catalog ID assigned (SI8-YYYY-####)                 ││
│  │  ✓ 5-day turnaround (or less)                           ││
│  │  ✓ Email support                                        ││
│  │  ✓ Free resubmission if rejected                        ││
│  │  ✓ Opt-in to catalog (optional)                         ││
│  │                                                         ││
│  │  [Get Verified Now →]                                   ││
│  │                                                         ││
│  └────────────────────────────────────────────────────────┘│
│                                                              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  OPTIONAL: CATALOG LICENSING (If you opt-in)                 │
│                                                              │
│  Earn passive income from licensing deals                    │
│                                                              │
│  You keep: 80% of licensing revenue                          │
│  SI8 takes: 20% commission                                   │
│                                                              │
│  Typical licensing deals:                                    │
│  • Editorial: $500-$1,500 (you earn $400-$1,200)            │
│  • Non-exclusive: $2K-$5K (you earn $1.6K-$4K)               │
│  • Category-exclusive: $5K-$10K (you earn $4K-$8K)           │
│  • Fully exclusive: $10K+ (you earn $8K+)                    │
│                                                              │
│  No upfront fees. Only pay commission when deals close.      │
│                                                              │
│  [Learn More About Catalog →]                                │
│                                                              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  VOLUME DISCOUNTS (Year 2)                                   │
│                                                              │
│  5+ videos: $399 each (save 20%)                             │
│  10+ videos: $349 each (save 30%)                            │
│                                                              │
│  [Contact us for volume pricing →]                           │
│                                                              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  FAQ (Pricing-specific)                                      │
│                                                              │
│  ▼ What payment methods do you accept?                       │
│     Credit card (Visa, Mastercard, Amex) via Stripe.        │
│                                                              │
│  ▼ Do you offer refunds?                                     │
│     No refunds, but free resubmission if rejected.           │
│                                                              │
│  ▼ How long does verification take?                          │
│     Up to 5 business days. Most completed in 2-3 days.       │
│                                                              │
│  ▼ Can I verify multiple videos at once?                     │
│     Yes. Each video is $499. Volume discounts available.     │
│                                                              │
│  ▼ What if my video is rejected?                             │
│     We provide clear reason. You can correct and resubmit    │
│     at no additional cost.                                   │
│                                                              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  CTA SECTION                                                 │
│  Ready to get verified?                                      │
│  [Get Started →]                                             │
└─────────────────────────────────────────────────────────────┘
```

**Acceptance criteria:**
- [ ] Single pricing tier: $499 per video (no tiers, no confusion)
- [ ] "What's Included" list (8 checkmarks)
- [ ] Catalog licensing section (80/20 split explained, typical deal ranges)
- [ ] Volume discounts mentioned (Year 2 feature, "Contact us")
- [ ] FAQ specific to pricing (payment, refunds, turnaround, rejection)
- [ ] CTA at bottom (Get Started)
- [ ] Mobile responsive
- [ ] Bilingual (EN + ZH-TW)

---

### 4. Navigation Updates

**Current nav (v3):**
```
SI8 Logo | How It Works | Pricing | Catalog | Contact
```

**New nav (v4):**
```
SI8 Logo | How It Works | Pricing | Catalog | Login ▼
                                              • Creator Login
                                              • Admin Login
```

**Logged-in nav (creators):**
```
SI8 Logo | Dashboard | Submissions | Earnings | Profile | Logout
```

**Logged-in nav (admin):**
```
SI8 Logo | Review Queue | Catalog | Deals | Users | [JD] ▼ Logout
```

**Acceptance criteria:**
- [ ] Login dropdown added (Creator Login, Admin Login)
- [ ] After login, nav changes to logged-in state
- [ ] Mobile: Hamburger menu with all links
- [ ] Active page highlighted (underline or bold)

---

## Copy Guidelines

### Tone & Voice

**Characteristics:**
- **Professional but approachable:** Not academic, not casual
- **Confident without hype:** State facts, avoid superlatives ("best", "perfect", "revolutionary")
- **Clear over clever:** Simple language, no jargon unless explained

**Good examples:**
- "Chain of Title Verification for AI Video Content" (clear, benefit-focused)
- "Adobe verifies Firefly only. We verify Sora, Runway, Kling." (confident, factual)
- "$499 per video, 5-day turnaround" (specific, no fluff)

**Avoid:**
- "The world's leading AI video verification platform" (hype)
- "Revolutionize your AI workflow" (vague)
- "Cutting-edge blockchain-based provenance" (jargon)

---

### Key Messaging Pillars

**1. Coverage Gap ("We verify the tools legal teams are blocking")**
- Adobe only covers Firefly
- Brands want Sora, Runway, Kling (best creative tools)
- SI8 fills the gap

**2. Judgment Layer ("Provenance ≠ Safety")**
- C2PA proves who made it and how
- SI8 assesses whether it's safe to use commercially
- Human review of IP risk, likeness, training data

**3. Speed to Approval ("3 weeks → 3 days")**
- Traditional legal review: 2-3 weeks
- SI8 review: 2-3 days (up to 5 business days)
- Felt benefit: Faster time to market

**4. Getty Analogy ("Like Getty Images, but for AI video")**
- Buyers understand Getty instantly
- Vetting infrastructure + licensing marketplace
- SI8 = same model, AI video focus

---

### Bilingual (EN + ZH-TW) Requirements

**All pages must have Traditional Chinese versions:**
- `/` → `/zh` (Homepage)
- `/how-it-works` → `/zh/how-it-works`
- `/pricing` → `/zh/pricing`
- `/catalog` → `/zh/catalog` (optional Year 1, English-first for buyers)

**Language selector in nav:**
```
[EN / 繁體中文]
```

**Translation guidelines:**
- "Rights Verified" → "權益驗證" (avoid "版權清晰" which implies legal guarantee)
- "Chain of Title" → "權利鏈文件" (industry-familiar term)
- "$499 per video" → "每部影片 $499 美元" (keep USD, Taiwan buyers understand)

---

## Technical Implementation

### Tech Stack

- **Frontend:** Next.js 14 (App Router), React Server Components
- **UI Library:** shadcn/ui (Radix UI + Tailwind CSS)
- **Internationalization:** next-intl (locale routing, translations)
- **Analytics:** Vercel Analytics (track CTA clicks, page views)

---

### Key Components

#### 1. Homepage Hero (`components/HomepageHero.tsx`)

```tsx
export function HomepageHero() {
  return (
    <section className="py-20 text-center">
      <h1 className="text-5xl font-bold">
        Chain of Title Verification
        <br />
        for AI Video Content
      </h1>
      <p className="text-xl mt-4 text-gray-600">
        Get commercial use documentation for Sora, Runway, and Kling outputs.
        <br />
        $499 per video, 5-day turnaround.
      </p>
      <div className="flex gap-4 justify-center mt-8">
        <Link href="/auth/signup">
          <button className="bg-amber-600 text-white px-8 py-3 rounded-lg text-lg">
            Get Verified
          </button>
        </Link>
        <Link href="/catalog">
          <button className="border border-gray-300 px-8 py-3 rounded-lg text-lg">
            Browse Catalog
          </button>
        </Link>
      </div>
      <p className="text-sm mt-6 text-gray-500">
        "Adobe verifies Firefly only. We verify the tools your legal team is blocking."
      </p>
    </section>
  )
}
```

---

#### 2. Two Paths Section (`components/TwoPathsSection.tsx`)

```tsx
export function TwoPathsSection() {
  return (
    <section className="py-20">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="border rounded-lg p-8">
          <h2 className="text-2xl font-semibold mb-4">For Creators & Production Houses</h2>
          <h3 className="text-xl font-bold text-amber-600 mb-4">Get Your Video Verified</h3>
          <ul className="space-y-2">
            <li>✓ $499 per video</li>
            <li>✓ 5-day turnaround</li>
            <li>✓ Rights Package PDF</li>
            <li>✓ Opt into catalog</li>
          </ul>
          <Link href="/auth/signup">
            <button className="mt-6 bg-amber-600 text-white px-6 py-3 rounded w-full">
              Get Started →
            </button>
          </Link>
        </div>

        <div className="border rounded-lg p-8">
          <h2 className="text-2xl font-semibold mb-4">For Buyers & Agencies</h2>
          <h3 className="text-xl font-bold text-amber-600 mb-4">Browse Rights Verified Catalog</h3>
          <ul className="space-y-2">
            <li>✓ 20+ verified films</li>
            <li>✓ Commercial use cleared</li>
            <li>✓ Non-exclusive licensing</li>
            <li>✓ Starting at $2,000</li>
          </ul>
          <Link href="/catalog">
            <button className="mt-6 border border-gray-300 px-6 py-3 rounded w-full">
              Browse Catalog →
            </button>
          </Link>
        </div>
      </div>
    </section>
  )
}
```

---

#### 3. Internationalization Setup (`i18n/translations/en.json` and `zh-TW.json`)

**English (`en.json`):**
```json
{
  "homepage": {
    "hero": {
      "title": "Chain of Title Verification for AI Video Content",
      "subtitle": "Get commercial use documentation for Sora, Runway, and Kling outputs. $499 per video, 5-day turnaround.",
      "cta_primary": "Get Verified",
      "cta_secondary": "Browse Catalog"
    }
  }
}
```

**Traditional Chinese (`zh-TW.json`):**
```json
{
  "homepage": {
    "hero": {
      "title": "AI 影片內容的權利鏈驗證",
      "subtitle": "為 Sora、Runway 和 Kling 輸出提供商業使用文件。每部影片 $499 美元，5 天交付。",
      "cta_primary": "開始驗證",
      "cta_secondary": "瀏覽目錄"
    }
  }
}
```

---

## Analytics & Tracking

### Custom Events (Vercel Analytics)

**Track user interactions:**

```javascript
// Homepage CTA clicks
analytics.track('Get Verified Clicked', { source: 'homepage_hero' })
analytics.track('Browse Catalog Clicked', { source: 'homepage_hero' })

// How It Works page engagement
analytics.track('How It Works Viewed')
analytics.track('Example Rights Package Downloaded')

// Pricing page engagement
analytics.track('Pricing Page Viewed')
analytics.track('Get Started Clicked', { source: 'pricing_page' })

// FAQ interactions
analytics.track('FAQ Expanded', { question: 'What tools do you verify?' })
```

**Key metrics to monitor:**
- Homepage → Get Verified conversion rate (target: >20%)
- Homepage → Browse Catalog conversion rate (target: >10%)
- How It Works bounce rate (target: <3%)
- Pricing → Get Started conversion (target: >50%)

---

## SEO & Metadata

### Homepage Meta Tags

```html
<title>Chain of Title Verification for AI Video | SuperImmersive 8</title>
<meta name="description" content="Get commercial use documentation for Sora, Runway, and Kling outputs. $499 per video, 5-day turnaround. Adobe verifies Firefly only—we verify the rest." />
<meta property="og:title" content="Chain of Title Verification for AI Video | SuperImmersive 8" />
<meta property="og:description" content="Get commercial use documentation for Sora, Runway, and Kling outputs. $499 per video, 5-day turnaround." />
<meta property="og:image" content="https://superimmersive8.com/og-image.png" />
```

### Keywords

**Primary keywords:**
- AI video verification
- Chain of Title AI content
- Sora commercial use
- Runway commercial license
- Kling IP clearance
- AI content rights

**Long-tail keywords:**
- "How to get AI video commercially licensed"
- "Sora video legal documentation"
- "Rights cleared AI video for brands"

---

## Testing Plan

### A/B Tests (Year 2)

**Headline variations:**
- A: "Chain of Title Verification for AI Video Content"
- B: "Commercial AI Video, Legally Defensible"
- C: "Get Sora, Runway, and Kling Outputs Verified"

**CTA variations:**
- A: "Get Verified"
- B: "Start Verification"
- C: "Verify Now"

**Pricing variations:**
- A: "$499 per video"
- B: "Starting at $499"
- C: "$499 (typically 2-3 day turnaround)"

---

### Manual QA Checklist

- [ ] Homepage loads (hero, two paths, how it works, pricing CTA)
- [ ] All CTAs link correctly (Get Verified → /auth/signup, Browse Catalog → /catalog)
- [ ] How It Works page loads (3 steps, Rights Package breakdown, risk tiers)
- [ ] Pricing page loads (pricing card, catalog licensing, FAQ)
- [ ] Nav updates (Login dropdown, Creator/Admin login links work)
- [ ] Mobile responsive (all pages, all sections)
- [ ] Bilingual (EN + ZH-TW versions load, language selector works)
- [ ] FAQ accordions expand/collapse
- [ ] Social proof updates dynamically ("20+ films verified" pulls from database)

---

## Success Metrics

### Quantitative

- **Homepage traffic:** 1,000+ monthly visitors by Month 3
- **Get Verified conversion:** >20% of homepage visitors click CTA
- **Browse Catalog conversion:** >10% of homepage visitors click CTA
- **How It Works bounce rate:** <3% (indicates clear messaging)
- **Pricing → Get Started:** >50% conversion (intent signal)

### Qualitative

- Visitors report website is "clear and professional" (user testing, N=5)
- No confusion about pricing ($499 per video is understood)
- Rights Verified process is "well explained" (How It Works page feedback)

---

## Open Questions

1. **Social proof:** What if we don't have logos or testimonials by launch?
   - **Resolution:** Use "20+ films verified" badge instead. Add logos in Month 3.

2. **FAQ quantity:** 5 or 10 questions?
   - **Resolution:** Start with 7 (most common). Add more based on support emails.

3. **Volume discounts:** Should we advertise this if not automated?
   - **Resolution:** Mention on Pricing page, but "Contact us" for now (manual quotes).

4. **Call-to-action balance:** Too many CTAs (Get Verified, Browse Catalog, View Pricing)?
   - **Resolution:** Get Verified = primary CTA (all pages). Browse Catalog = secondary (homepage only).

---

## Launch Checklist

**Pre-launch (Week 4):**
- [ ] All pages implemented (Homepage, How It Works, Pricing)
- [ ] Bilingual (EN + ZH-TW) complete
- [ ] Nav updated (Login dropdown, Creator/Admin links)
- [ ] Mobile responsive tested
- [ ] Analytics events working (track CTA clicks)

**Launch (Week 5):**
- [ ] Deploy with Creator Portal + Admin Panel + Public Catalog
- [ ] Update DNS (superimmersive8.com → Vercel)
- [ ] Announce website launch (LinkedIn, email leads)
- [ ] Monitor homepage traffic and conversion rates

**Post-launch (Week 6):**
- [ ] Collect user feedback (email survey to first 10 signups)
- [ ] A/B test headline variations (if traffic >100/day)
- [ ] Optimize based on analytics (which CTA gets more clicks, which FAQ is most opened)

---

**Document Status:** ✅ Complete — Ready for implementation
**Next:** `08_Platform/implementation/4_WEEK_SPRINT_PLAN.md`
