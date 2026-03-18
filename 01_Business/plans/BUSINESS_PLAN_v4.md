# SuperImmersive 8
## Business Plan v4.0 — Compliance as a Service + Creator Platform

**Version:** 4.0
**Date:** March 2026
**Supersedes:** BUSINESS_PLAN_v3.md (v3.2, March 2026)
**Change summary:** Major strategic pivot from rights agency to compliance infrastructure platform. Primary offering shifts from product placement to B2B verification service ($499 per video). Three-gear model: CaaS foundation + opt-in marketplace + producer track. CarFax two-sided model with opt-in flywheel solves chicken-egg problem. Platform architecture (Supabase, creator auth) built from day one. Peer review validation from ChatGPT (Claude Opus) and Gemini informed this direction.

> For historical context on v1-v3 models, see VERSION_HISTORY.md

---

## Executive Summary

**What SI8 is now:** A B2B compliance infrastructure provider for AI video content, with an opt-in creator marketplace built on top of the verification service.

**The pivot:** From distribution-first (v3: catalog licensing + product placement) to **compliance-first** (v4: verification service + marketplace byproduct).

**Why this works:** Solves the chicken-egg problem (need creators to attract buyers, need buyers to attract creators) by making verification the entry point. Filmmakers and production houses pay for Chain of Title documentation. Those who opt-in become marketplace inventory. Buyers discover verified content. The flywheel turns.

**Business model analogy:** CarFax for AI video
- **Side A (verification service):** Production houses pay $499 per video for Chain of Title documentation
- **Side B (discovery marketplace):** Verified creators opt into catalog, SI8 takes 20% commission on licensing deals
- **Side C (producer track):** JD curates custom slates for whale buyers (MyVideo), using SI8's compliance tools

**Revenue model (Year 1 target: $80-120K):**
- **CaaS verification:** $499/video × 10/month = $5K/month by Month 6
- **Showcase licensing:** 20% commission on deals = $2K/month by Month 6
- **Producer curation:** $10K MyVideo deal + future whale deals

**Platform architecture:** Supabase (auth + database + file storage), Next.js (frontend), creator login/dashboard, admin review panel, public catalog with Rights Verified badges.

**Geographic strategy:** Singapore/SEA agencies (CaaS), Taiwan (Producer track), filmmakers global.

**Year 1 success metrics:**
- 60 verifications completed ($30K revenue)
- 20+ verified films in catalog
- 10+ licensing deals closed ($50K GMV, $10K SI8 commission)
- MyVideo deal closed ($10K)
- Platform live with 50+ registered creators

---

## What Changed and Why

### v3 Positioning (Rights Agency + Product Placement)

> "We put your brand inside AI films that are cleared for commercial use. No reshoot. No legal exposure. That's the part of AI content nobody else is doing."

**Primary offer:** Custom AI product placement in vetted productions (Tier 2)
**Revenue model:** Licensing fees + modification fees, brokered deals
**Customer acquisition:** Outbound to brands/agencies, pitch product placement capability
**Problem encountered:** Chicken-egg deadlock — filmmakers won't submit without proof of buyers, buyers won't commit without catalog to browse.

### v4 Positioning (Compliance as a Service + Platform)

> "We provide Chain of Title verification for AI video content. Every verification comes with the option to list your work in our Rights Verified catalog, where buyers can discover and license it."

**Primary offer:** B2B verification service at $499 per video (CaaS)
**Secondary offer:** Opt-in marketplace for verified content (20% commission)
**Tertiary offer:** Producer curation for whale deals (JD as curator, using SI8 tools)
**Customer acquisition:** Outbound to production houses/agencies (sell verification), inbound catalog discovery (buyers find content)
**Why this solves chicken-egg:** Verification customers become marketplace inventory via opt-in checkbox. No need to recruit creators separately — they pay to get verified, then choose whether to enable licensing.

---

## The Three-Gear Model

SI8 operates as three interlocking gears. Each gear has different customers, different economics, and different scalability — but they work together as one system.

```
GEAR A — CaaS FOUNDATION (B2B Verification Service)
──────────────────────────────────────────────────────
What: Chain of Title verification for AI video content
Who pays: Production houses, agencies, brands, filmmakers
Price: $499 per video
Process: 70-field submission → manual review (90 min) → 9-field Rights Package PDF
Value prop: "Get legal defensibility documentation for commercial AI video use"
Revenue type: Transaction fee (immediate cash)
Scalability: High (platform can automate intake, human judgment remains)

GEAR B — SHOWCASE MARKETPLACE (Opt-In Catalog)
──────────────────────────────────────────────────────
What: Verified films listed for licensing, discoverable by buyers
Who pays: Buyers (via licensing fees), SI8 takes 20% commission
Price: Varies by license ($2K-$10K typical)
Process: After Gear A verification, creator sees checkbox: "List in catalog?"
        → If yes, film appears on superimmersive8.com with Rights Verified badge
        → Buyers browse → request license → SI8 brokers deal
Value prop (creator): "Get discovered by brands and platforms"
Value prop (buyer): "Browse pre-verified AI content, license with confidence"
Revenue type: Commission (recurring, passive)
Scalability: Very high (marketplace scales with inventory)

GEAR C — PRODUCER TRACK (High-Touch Curation)
──────────────────────────────────────────────────────
What: JD curates custom slate of films for whale buyers
Who pays: Whale buyer (e.g., MyVideo pays $10K for 5-film slate)
Price: $10K-$20K per curated slate
Process: JD discovers films via Gear B catalog → curates slate
        → Uses Gear A to verify each film (cost absorbed by JD)
        → Delivers curated + verified slate to buyer
Value prop: "Custom-curated AI content, fully vetted, ready for programming"
Revenue type: Project fee (high-margin, low-volume)
Scalability: Low (JD's time-intensive) — but uses Gears A+B as infrastructure

Conflict of Interest Handling:
- JD acts as Producer/Curator for PMF Strategy Inc.
- SI8 (DBA) provides compliance tools
- For Gear C deals, JD absorbs Gear A cost internally
- For Gear A clients, SI8 is independent verifier
- Transparency: Role disclosed in each transaction
```

### How the Gears Work Together

**Flywheel mechanism:**

1. **CaaS verification (Gear A)** → Production house submits video for verification → Pays $499
2. **Opt-in prompt** → After approval, creator sees: "List this in SI8 catalog for licensing opportunities? (Non-exclusive, 20% commission)"
3. **Catalog growth (Gear B)** → Creator opts in → Film appears on public catalog with Rights Verified badge
4. **Buyer discovery** → Buyer browses catalog → Finds film → Requests license
5. **Licensing deal** → SI8 brokers deal → Creator gets 80%, SI8 gets 20%
6. **More verifications** → Success stories attract more verification customers → Flywheel accelerates

**Producer track uses the infrastructure:**
- JD curates slate from Gear B catalog (discovery)
- Uses Gear A to verify films (compliance)
- Delivers to whale buyer at premium price
- Filmmaker still gets paid (50% of $10K = filmmaker split)

**Key insight:** Gears A and B are the scalable platform. Gear C is the high-touch service layer that uses the platform. Both can coexist.

---

## Revenue Model — Three Streams, One System

### Stream 1: CaaS Verification (Gear A)

**Unit economics:**
- Price: $499 per video verification
- Cost: ~90 min founder time for manual review (currently unmonetized)
- Gross margin: ~100% (no COGS in Year 1)

**Target volume:**
- Month 1-2: 2 verifications ($1K)
- Month 3-4: 5 verifications/month ($2.5K/month)
- Month 5-6: 10 verifications/month ($5K/month)
- Year 1 total: 60 verifications ($30K)

**Customer profile:**
- Singapore/SEA production agencies (primary)
- Brands building in-house AI content teams
- Taiwan agencies via Mandarin outreach
- Individual filmmakers wanting commercial documentation

**Sales motion:**
- Outbound LinkedIn/email to agencies: "Does your legal team flag AI content as risky?"
- Pitch: Chain of Title verification for client deliverables
- Follow-up: Send sample Rights Package PDF, book demo call
- Close: Invoice via Stripe, onboard to submission portal

### Stream 2: Showcase Licensing (Gear B)

**Unit economics:**
- Typical license: $2K-$5K per film
- SI8 commission: 20%
- SI8 revenue per deal: $400-$1K
- Creator revenue per deal: $1.6K-$4K

**Target volume:**
- Month 1-3: 0 deals (building catalog)
- Month 4-5: 1 deal/month ($400-$1K)
- Month 6: 2 deals/month ($2K)
- Year 1 total: 10 deals ($10K SI8 commission)

**Customer profile (buyers):**
- Streaming platforms (MyVideo, airline content)
- Editorial/content publishers
- Agencies licensing for client campaigns
- Brands looking for pre-cleared AI assets

**Sales motion:**
- Inbound: Buyers discover via catalog browsing
- Outbound: JD pitches catalog to platform programmers
- Process: Buyer requests license → SI8 sends terms → Creator approves → Deal closes

**Conversion assumptions:**
- 60 verifications × 50% opt-in rate = 30 films in catalog by Month 6
- 30 films × 33% licensing rate = 10 deals by Month 12

### Stream 3: Producer Curation (Gear C)

**Unit economics (MyVideo example):**
- Deal size: $10K for 5-film curated slate
- Filmmaker split: 50% ($1K per film × 5 = $5K total to filmmakers)
- JD/SI8 revenue: $5K
- Verification cost (absorbed): $499 × 5 = $2,495 (internal cost, not billed separately)
- Net to SI8: $5K (verification cost absorbed as marketing/trust-building)

**Target volume:**
- Month 1: MyVideo deal ($10K) — priority close
- Month 6+: 1-2 additional whale deals ($10K-$20K each)
- Year 1 total: $30K-$40K from producer track

**Customer profile:**
- MyVideo (Taiwan streaming platform) — warm lead
- Other streaming platforms (Taipei, Singapore, regional)
- Brands wanting custom-curated AI video collections

**Sales motion:**
- High-touch, relationship-driven
- JD acts as Producer/Curator, not platform
- Uses Gear A (verification) + Gear B (catalog discovery) as infrastructure

### Combined Year 1 Revenue Projection

| Month | CaaS (Gear A) | Showcase (Gear B) | Producer (Gear C) | Total |
|-------|---------------|-------------------|-------------------|-------|
| **1** | $1K (2 verifications) | $0 | $10K (MyVideo) | **$11K** |
| **2** | $1K | $0 | $0 | **$1K** |
| **3** | $2.5K (5 verifications) | $1K (first licensing deal) | $0 | **$3.5K** |
| **4** | $2.5K | $1K | $0 | **$3.5K** |
| **5** | $5K (10 verifications) | $2K | $0 | **$7K** |
| **6** | $5K | $2K | $0 | **$7K** |
| **7-12** | $5K/month | $2K/month | $10K (second whale deal) | **$7-10K/month** |

**Year 1 total: $80K-$100K**

**Breakdown:**
- CaaS: $30K (60 verifications)
- Showcase: $10K (10 licensing deals)
- Producer: $30K-$40K (MyVideo + 1-2 whale deals)

**Key assumption:** MyVideo deal closes in Month 1. If delayed to Month 2-3, Year 1 total shifts but overall trajectory remains.

---

## Market Analysis

### Total Addressable Market (TAM)

**AI video production market (global):**
- Growing rapidly as Runway, Sora, Kling, Pika democratize creation
- Every brand producing AI video content faces same risk: legal defensibility unknown
- Current state: Most brands either (a) avoid AI video, or (b) use Adobe Firefly only (limited creativity), or (c) use Sora/Runway without compliance layer (unmanaged risk)

**SI8's TAM:** Every brand, agency, and production house using AI video for commercial purposes needs compliance documentation.

### Serviceable Addressable Market (SAM)

**Year 1-2 focus: Singapore/SEA + Taiwan production agencies**
- Singapore: ~500 creative/production agencies
- Bangkok: ~300 agencies
- Kuala Lumpur: ~200 agencies
- Manila: ~150 agencies
- Taiwan: ~400 agencies (Mandarin market)

**Target: 10% of SAM aware of SI8 by Year 1 = ~150 agencies**
- Conversion: 5% buy verification service = 7-8 agencies
- Each agency: 5-10 verifications/year = 40-80 verifications total
- Year 1 target: 60 verifications (within range)

### Competitive Landscape

**Direct competitors (verification services):**
- **Adobe Stock / Firefly:** Built-in commercial indemnification, but only for Firefly outputs (limited tools)
- **Getty Images:** Vetting infrastructure for photography, not yet AI video
- **None identified:** No B2B verification service specifically for Sora/Runway/Kling outputs

**SI8's differentiation:**
- Only service offering Chain of Title verification for non-Adobe AI tools (Sora, Runway, Kling)
- Human judgment layer (not just automated provenance tracking like C2PA)
- Covers the creative tools legal teams are currently blocking

**Indirect competitors (marketplaces):**
- **Escape.ai:** AI creator platform, allows showcase + monetization (focuses on creator tools, not rights verification)
- **Vimeo Stock:** Stock video licensing, not AI-specific, no rights vetting beyond standard stock terms
- **Adobe Stock:** Stock licensing with Firefly integration, but no verification service for external AI tools

**SI8's differentiation:**
- Only platform combining verification service (Gear A) + marketplace (Gear B) + producer curation (Gear C)
- Rights Verified process as core competency (not just hosting content)
- Focus on APAC/SEA market (no direct regional competitor)

### SI8's Moat

**What makes this defensible:**

1. **Judgment layer:** Human review cannot be automated. C2PA/Content Credentials will commoditize provenance metadata, but cannot assess:
   - IP infringement risk (subjective legal judgment)
   - Real-person likeness (visual assessment)
   - Brand safety (context-dependent)
   - Training data liability (emerging law, requires interpretation)

2. **Vetting pipeline:** Like Getty, SI8's moat is owning the process, relationships, and standards — not owning the content. Filmmakers retain copyright. SI8 owns the right to verify and license.

3. **Network effects:** More verifications → more opt-ins → larger catalog → more buyer traffic → more verifications (flywheel)

4. **Geographic focus:** APAC/SEA market underserved by US-based competitors. Local language, local relationships, local market knowledge.

5. **Data accumulation:** Over time, SI8 builds the largest dataset of "what gets approved vs. rejected" — this becomes training data for future semi-automation, and informs evolving standards.

**Monitor:** If Adobe/Getty/Shutterstock launch AI verification services, SI8's response is to emphasize judgment layer + APAC market + faster execution.

---

## Go-To-Market Strategy

### Geographic Strategy

**Primary markets (parallel tracks):**

**Track 1: Singapore/SEA agencies (CaaS primary)**
- Target: Production houses, creative agencies, brand marketing teams
- Language: English (business language across region)
- Pitch: "Does your legal team flag AI content as risky? We provide Chain of Title verification."
- Channel: LinkedIn outreach, email campaigns, industry events
- Goal: 5 agency clients by Month 6

**Track 2: Taiwan market (Producer track + CaaS secondary)**
- Target: MyVideo (streaming platform) as anchor deal
- Language: Traditional Chinese (ZH-TW)
- Pitch: JD acts as Producer/Curator, delivers verified slate
- Channel: Warm lead (Jamie Lin), bilingual website, Taipei events
- Goal: MyVideo deal closed Month 1-2, 2-3 additional Taiwan agencies by Month 6

**Filmmaker acquisition (global, English-speaking):**
- Target: AI filmmakers producing Runway/Sora/Kling work
- Value prop: "Get your work verified for commercial use, opt into our catalog for licensing opportunities"
- Channel: Instagram/LinkedIn DM, AI filmmaker communities, Runway Discord
- Goal: 30 verified filmmakers in catalog by Month 6 (via 60 verifications × 50% from filmmakers vs. agencies)

### Customer Acquisition — CaaS (Gear A)

**Ideal customer profile:**
- Creative/production agencies producing AI video for clients
- 10-50 person teams
- Clients include brands with legal/compliance departments
- Currently using Runway, Pika, Midjourney video, or evaluating Sora/Kling
- Pain point: Legal team blocks or slows AI video projects due to risk concerns

**Outreach messaging (LinkedIn/Email):**

> Subject: Chain of Title verification for AI video deliverables
>
> [Agency name] — I noticed you're producing AI video work for clients. Quick question: does your legal team (or your clients' legal teams) flag AI-generated content as a compliance risk?
>
> We provide Chain of Title verification for AI video — tool provenance, commercial use authorization, IP clearance documentation. $499 per video, 5-day turnaround.
>
> Same concept as Getty Images licensing, applied to AI video.
>
> Worth 15 minutes to walk through how it works?

**Follow-up asset:** Sample Rights Package PDF (redacted) showing 9-field Chain of Title structure

**Call goal:** Book verification submission, explain opt-in catalog opportunity

### Customer Acquisition — Showcase (Gear B)

**Ideal customer profile (buyers):**
- Streaming platforms (MyVideo, airline content, regional platforms)
- Editorial publishers (online magazines, content sites)
- Agencies licensing for client campaigns
- Brands building content libraries

**Inbound discovery:**
- Public catalog on superimmersive8.com
- SEO: "AI video licensing", "commercially licensed AI content", "rights verified AI video"
- Each catalog entry has metadata for search discoverability

**Outbound outreach:**
- JD pitches catalog to platform programmers: "Browse 30 Rights Verified AI films, ready for licensing"
- Send curated PDF with thumbnails + loglines
- Offer: "Request licensing for any film, we handle rights clearance"

### Pricing Strategy

**CaaS verification (Gear A): $499 per video**
- Rationale: Comparable to legal document review ($300-$600/hour, 1-1.5 hours work)
- Competitive: Adobe indemnification is free (bundled with Firefly), but limited to Firefly only
- Value: Buyers get Sora/Runway/Kling cleared at same defensibility level as Firefly

**Showcase licensing (Gear B): 20% commission**
- Rationale: Lower than Getty (80-85% take rate), higher than creator-friendly platforms (10-15%)
- Positioning: Fair split for unproven platform, creator gets majority (80%)
- As catalog/brand grows: Consider tiered commission (15% for passive listing, 25% for active representation)

**Producer curation (Gear C): $10K-$20K per slate**
- Rationale: High-touch, custom curation justifies premium pricing
- Includes: Filmmaker sourcing, verification, delivery coordination, rights documentation
- Filmmaker split: 50% (negotiable based on filmmaker tier)

### Sales Cycle

**CaaS (Gear A):**
1. Outreach (LinkedIn/email) → Response (3-5% response rate)
2. Discovery call (15-30 min) → Explain process, send sample Rights Package
3. Proposal (1-page PDF with pricing) → $499/video, 5-day turnaround
4. Close (Stripe invoice) → Onboard to submission portal
5. Deliver (5 days) → Send Rights Package PDF, prompt opt-in checkbox

**Timeline: 14-21 days from first contact to first verification**

**Showcase (Gear B):**
1. Buyer discovers catalog (inbound) OR JD pitches (outbound)
2. Buyer requests licensing for specific film
3. SI8 sends license terms + pricing
4. Creator approves deal
5. Contract signed, payment processed
6. Film delivered with Rights Package

**Timeline: 7-14 days from request to delivery**

**Producer (Gear C):**
1. JD pitches custom slate to whale buyer (MyVideo)
2. Discovery call → Understand programming needs, timeline, budget
3. Curate slate from catalog (or source new filmmakers)
4. Verify each film via Gear A (cost absorbed)
5. Present slate → Get approval
6. Deliver slate + Rights Packages
7. Invoice ($10K-$20K)

**Timeline: 30-60 days from first conversation to delivery**

---

## Platform Roadmap — Build for Year 3 from Day One

### Year 1: Manual + Platform MVP (Supabase Architecture)

**Why build platform infrastructure in Year 1:**
- Tracking verifications via Google Sheets will break quickly
- Need creator login/dashboard for submissions and opt-ins
- Admin review panel required for efficient verification workflow
- Database structure becomes platform foundation in Year 3

**Tech stack:**
- **Supabase:** Auth (email/password), Postgres database, file storage (receipts + Rights Packages), Row Level Security
- **Next.js:** Frontend framework, React components, server-side rendering
- **Stripe:** Payment processing (verification fees, licensing payments)
- **Vercel:** Hosting and deployment

**Platform features (Year 1 MVP):**

**Public pages:**
- Homepage: CaaS positioning, two CTAs (Get Verified / Browse Catalog)
- How It Works: Explain CaaS process, show sample Rights Package
- Pricing: $499 per verification
- Catalog: Browse verified films with Rights Verified badges, request licensing
- About/Contact

**Creator portal (auth required):**
- Signup/login (email + password)
- Dashboard: View submissions (status: pending, approved, rejected)
- Submit for Verification: 70-field form (receipts upload, authorship declaration, IP confirmations)
- Rights Package download (PDF) after approval
- Opt-in toggle: "List in catalog for licensing? (20% commission)"
- Earnings tracker (if licensing deals happen)

**Admin panel (JD access only):**
- All submissions queue (sortable by status, date)
- Review interface: Approve / Reject / Request more info
- Generate Rights Package PDF (template + data merge from submission)
- Manage catalog (add/remove films, edit descriptions)
- View licensing deals (track commissions)

**Build timeline: 4 weeks (parallel with MyVideo close)**
- Week 1: Supabase setup, auth, database schema
- Week 2: Creator dashboard + submission form
- Week 3: Admin panel + review workflow
- Week 4: Opt-in system + public catalog + Rights Package PDF generation

### Year 2: Semi-Automated Intake + Analytics

**Features to add:**
- Automated pre-screening: Flag submissions with prohibited tools (Stable Diffusion unlicensed, Kling without commercial plan) before manual review
- Receipt OCR: Extract tool names, dates, plan types from uploaded receipts automatically
- Filmmaker reputation score: Track approval rate, licensing performance, build trust indicators
- Buyer analytics: Track catalog views, licensing requests, conversion funnel
- Email automation: Approval/rejection notifications, opt-in prompts, licensing deal confirmations

**Goal: Reduce manual review time from 90 min to 45 min per submission via semi-automation**

### Year 3: Self-Serve Platform + API

**Platform maturity features:**
- Self-serve verification: Filmmaker uploads, automated pre-screen, human review as final gate
- Instant Rights Package generation: Auto-generated PDF from structured data
- Self-serve licensing: Buyer browses catalog, purchases license via Stripe, receives Rights Package instantly
- API for enterprise: Brands/agencies integrate SI8 verification into their production pipelines
- White-label option: Production houses can offer "verified by SI8" as premium tier to their clients

**Goal: Platform can scale to 500 verifications/month without proportional increase in founder time**

### Why This Architecture Matters

Every manual step in Year 1 is designed to become a platform feature later:

| Manual Process (Year 1) | Platform Feature (Year 3) |
|-------------------------|--------------------------|
| Email submission → manual intake | Self-serve upload via creator portal |
| Review spreadsheet → manual approve/reject | Admin queue with one-click approval |
| Word template → manual Rights Package creation | Auto-generated PDF from database |
| Email to buyer → manual licensing coordination | Self-serve licensing with instant delivery |
| Spreadsheet tracking → manual exclusivity check | Database conflict detection (category-exclusive logic) |
| Email follow-up → manual opt-in request | Automated checkbox prompt after approval |

**The platform is being built now, in spreadsheet and document form. Year 3 is when it becomes software.**

---

## Six-Month Execution Plan (March - August 2026)

### Month 1 (March): Platform MVP Build + MyVideo Close

**Platform development (Week 1-4):**
- [ ] Supabase setup: Auth, database schema, file storage
- [ ] Creator portal: Signup, login, dashboard, submission form
- [ ] Admin panel: Review queue, approve/reject, Rights Package PDF generation
- [ ] Opt-in system: Checkbox after approval, catalog listing toggle
- [ ] Public catalog: Browse verified films with badges, request licensing
- [ ] Bilingual (EN + ZH-TW) for all public pages

**MyVideo track (Gear C):**
- [ ] Week 1: Email Jamie Lin with slate pitch
- [ ] Week 2: Discovery call → Present 5-film slate concept
- [ ] Week 3: Curate films (reach out to Essa, Leon, others)
- [ ] Week 4: Close deal → Sign contract ($10K)

**CaaS prep:**
- [ ] Build Singapore agency target list (100 contacts)
- [ ] Draft CaaS pitch email templates
- [ ] Create sample Rights Package PDF for outreach

**Deliverable by Month 1 end:**
- Platform MVP live (creators can submit, JD can review, opt-ins work)
- MyVideo deal signed
- Singapore outreach ready to launch

**Revenue: $10K (MyVideo)**

---

### Month 2 (April): CaaS Outreach Launch + First Verifications

**CaaS outreach (Gear A):**
- [ ] Send 100 LinkedIn/email pitches (20/day, 5 days/week)
- [ ] Goal: 5 responses, 2 discovery calls booked
- [ ] First verification client signed

**Platform usage:**
- [ ] 2-3 filmmaker submissions (from MyVideo slate filmmakers)
- [ ] First opt-ins: Ask MyVideo filmmakers to opt into catalog
- [ ] Test full workflow: Submit → Review → Approve → Opt-in → Catalog live

**MyVideo delivery:**
- [ ] Generate 5 Rights Packages for MyVideo slate
- [ ] Deliver to MyVideo for programming review
- [ ] Invoice $10K
- [ ] Pay filmmakers their split (50% = $5K total)

**Deliverable by Month 2 end:**
- 2-5 verifications completed ($1K-$2.5K revenue)
- 3-5 films in catalog (MyVideo slate + any filmmaker opt-ins)
- Platform proven with real users

**Revenue: $1K-$2.5K (CaaS)**

---

### Month 3 (May): Scale CaaS + Event Credibility

**CaaS outreach:**
- [ ] Send 150 LinkedIn/email pitches (expand to Bangkok, KL)
- [ ] Goal: 10 responses, 5 discovery calls, 3 clients signed
- [ ] 5 verifications completed ($2.5K)

**Event (optional):**
- [ ] AI Creators Fest (Taipei or Singapore)
- [ ] Position as "Rights Verified for AI Video" industry briefing
- [ ] Goal: 30 attendees (agencies + filmmakers), 5 CaaS leads generated

**Showcase activity (Gear B):**
- [ ] First licensing deal: Platform buyer or JD outbound pitch
- [ ] Close 1 licensing deal ($2K-$5K, SI8 gets 20% = $400-$1K)

**Deliverable by Month 3 end:**
- 10 total verifications completed YTD
- 8-10 films in catalog
- First licensing deal closed (Showcase revenue proven)

**Revenue: $3.5K ($2.5K CaaS + $1K licensing commission)**

---

### Month 4-5 (June-July): Ramp Verifications + Licensing Pipeline

**CaaS outreach:**
- [ ] Maintain 100 pitches/month
- [ ] Goal: 5 verifications/month ($2.5K/month)
- [ ] Total verifications by Month 5 end: 20 YTD

**Showcase growth:**
- [ ] 1-2 licensing deals/month
- [ ] Catalog grows to 15-20 films
- [ ] Outbound catalog pitches to streaming platforms (airlines, regional content buyers)

**Platform iteration:**
- [ ] Improve based on user feedback
- [ ] Add analytics (track catalog views, licensing requests)
- [ ] Automate email notifications (approval/rejection/opt-in prompts)

**Deliverable by Month 5 end:**
- 20 verifications completed YTD ($10K CaaS revenue)
- 15-20 films in catalog
- 3-5 licensing deals closed ($6K-$10K GMV, $1.2K-$2K SI8 commission)

**Revenue: $7K/month ($5K CaaS + $2K licensing)**

---

### Month 6 (August): Assessment + Scale or Pivot Decision

**CaaS target:**
- [ ] 10 verifications/month ($5K/month) — if achieved, model is validated
- [ ] 30-40 verifications completed YTD

**Showcase target:**
- [ ] 2-3 licensing deals/month
- [ ] 25-30 films in catalog
- [ ] Repeat buyers (key signal: passive reuse)

**Assessment questions:**
- Is CaaS gaining traction? (Response rate >5%, conversion rate >10%)
- Is Showcase converting? (Catalog → licensing rate >20%)
- Are opt-ins happening? (Verification → opt-in rate >40%)
- Is MyVideo renewing or expanding? (Repeat buyer signal)

**Three possible outcomes:**

**A. Model validated → Scale**
- CaaS is working (10+ verifications/month)
- Showcase is converting (2+ licensing deals/month)
- Flywheel is turning (opt-ins → catalog → buyers → more verifications)
- Decision: Scale outreach, hire part-time sales help, invest in platform features

**B. Model partially validated → Iterate**
- CaaS is working but Showcase isn't converting (or vice versa)
- Diagnosis: Is it messaging, pricing, catalog quality, or buyer targeting?
- Decision: Fix bottleneck, iterate for 3 more months

**C. Model not validated → Pivot or Shutdown**
- CaaS isn't gaining traction (<5 verifications/month)
- Showcase isn't converting (<1 licensing deal/month)
- Decision: Return to v3 model (producer track only) or shut down SI8

**Month 6 is the checkpoint. Not a hard deadline, but a decision milestone.**

**Revenue by Month 6: $30K-$40K YTD**

---

## Financial Projections

### Revenue (Year 1)

| Stream | Q1 | Q2 | Q3 | Q4 | Year 1 Total |
|--------|-------|-------|-------|-------|-------------|
| **CaaS (Gear A)** | $2.5K | $7.5K | $15K | $15K | **$40K** |
| **Showcase (Gear B)** | $1K | $3K | $6K | $10K | **$20K** |
| **Producer (Gear C)** | $10K | $10K | $10K | $10K | **$40K** |
| **Total** | **$13.5K** | **$20.5K** | **$31K** | **$35K** | **$100K** |

**Assumptions:**
- CaaS: 60 verifications by Year 1 end (ramp: 2, 5, 10, 10/month in Q1-Q4)
- Showcase: 10 licensing deals by Year 1 end (ramp: 1, 2, 3, 4 deals in Q1-Q4)
- Producer: MyVideo $10K (Q1), repeat MyVideo or new whale deal $10K (Q2), 2 more deals Q3-Q4

**Conservative case: $80K** (if Producer track doesn't repeat beyond MyVideo)
**Base case: $100K** (if 1-2 additional whale deals close)
**Optimistic case: $120K** (if CaaS accelerates to 15/month by Q4)

### Expenses (Year 1)

| Category | Annual | Notes |
|----------|--------|-------|
| **Platform development** | $0 | JD codes (self), Supabase free tier |
| **Hosting/tools** | $1K | Supabase Pro ($25/mo), Vercel, Stripe fees |
| **Legal/admin** | $3K | DBA filing, contract templates, lawyer consult |
| **Marketing** | $2K | LinkedIn ads, event sponsorship (optional) |
| **Filmmaker payouts** | $20K | 50% of Producer revenue ($40K × 50%) |
| **Contractor/VA** | $5K | Part-time help for outreach, catalog curation (Month 6+) |
| **Total** | **$31K** | |

**Net profit (Year 1): $69K-$89K** (on $100K-$120K revenue)

### Runway

**Current situation:**
- JD employed full-time at Calyx (salary covers living expenses)
- SI8 operates as side project (10-15 hrs/week)
- No external funding required for Year 1
- SI8 revenue is upside (can reinvest or take as income)

**Transition trigger:**
- If SI8 reaches $5K-$7K/month consistent revenue (Month 6 target), consider full-time transition
- If not, maintain as side project through Year 1, reassess at Month 12

---

## Risk Analysis

### Risk 1: Platform Development Delays

**Risk:** 4-week build timeline slips to 6-8 weeks, delaying CaaS launch

**Mitigation:**
- Start with Airtable + Softr (3-5 day MVP) if Supabase build is blocked
- Migrate to Supabase later once validated
- Manual processes (email intake) can run while platform builds

### Risk 2: Low Opt-In Conversion Rate

**Risk:** Verification customers don't opt into catalog (<20% opt-in rate)

**Impact:** Showcase doesn't grow, flywheel stalls

**Mitigation:**
- Make opt-in value prop stronger: "Get discovered by buyers, earn passive income"
- Show success stories: "Filmmaker X earned $3K from catalog licensing"
- Offer higher commission (30% instead of 20%) for early opt-ins

### Risk 3: CaaS Demand Lower Than Expected

**Risk:** Agencies don't perceive verification as valuable enough to pay $499

**Impact:** CaaS revenue misses target (<5 verifications/month)

**Diagnosis questions:**
- Is it price? (Test $299 tier for single-video verification)
- Is it messaging? (Try different angles: legal defensibility, client confidence, competitive advantage)
- Is it market? (Singapore isn't ready, try different geography)

**Mitigation:**
- Offer first verification free or 50% off (lead generation)
- Bundle: 5 verifications for $2K (volume discount)
- Pivot to filmmakers as primary CaaS customers (not agencies)

### Risk 4: Conflict of Interest Perception

**Risk:** Buyers or filmmakers perceive conflict: "JD is both seller (Producer) and auditor (CaaS verifier)"

**Impact:** Loss of credibility, deals stall

**Mitigation:**
- Transparency: Disclose role in each transaction
- Separation: JD acts as Producer for Gear C, SI8 acts as verifier for Gear A clients
- Third-party review: Bring in legal advisor to audit SI8 vetting process (credibility signal)

### Risk 5: Competitive Response

**Risk:** Adobe/Getty/Shutterstock launch AI verification services, with more resources and brand trust

**Impact:** SI8's CaaS differentiation erodes

**Response strategy:**
- Emphasize judgment layer (not just metadata)
- Emphasize APAC market (local relationships, language, speed)
- Emphasize Gear B+C integration (not just verification, but discovery + curation)

**Long-term:** If big players enter, SI8 can position as premium boutique (like how boutique agencies coexist with WPP)

### Risk 6: Legal Liability

**Risk:** SI8 verifies content, buyer uses it, gets sued for infringement, sues SI8 for negligent verification

**Mitigation (already in place):**
- Rights Package is documentation, not certification
- Language: "Rights Verified process" (not "Rights Certified" or "Guaranteed non-infringing")
- Disclaimer in every Rights Package: "This documentation reflects the verification process undertaken. It does not constitute a legal guarantee of non-infringement."
- E&O insurance: Investigate in Month 6 if deal volume increases

---

## Team & Structure

### Corporate Structure

**Legal entity:** PMF Strategy Inc. (Texas S-Corporation, est. 2022)
- **DBA:** SuperImmersive 8 (filed with Texas Secretary of State)
- **Tax structure:** S-Corp pass-through
- **All contracts issued by:** PMF Strategy Inc. d/b/a SuperImmersive 8

**Secondary entity (optional):** 沉浸科技顧問有限公司 (Taiwan LLC)
- Used only if Taiwan buyer requires local entity for invoicing
- Acts as local reseller via intercompany agreement
- Not used by default

### Current Team

**JD (Founder):**
- Role: Product, sales, verification reviewer, platform builder
- Time commitment: 10-15 hrs/week (Month 1-5), full-time (Month 6+ if revenue validates)

### Year 1 Hires (As Needed)

**Developer (contract, Month 6+):** If platform features exceed JD's coding capacity
**VA/Sales Assistant (contract, Month 6+):** Outreach list building, email campaigns, scheduling
**Legal Advisor (consult basis):** Review filmmaker agreements, verify Rights Package language

### Advisory Board (Year 1 Credibility Asset)

**Target: 3-5 advisors by Month 3**

**Profiles:**
- Entertainment/IP lawyer (AI content expertise)
- Brand marketing executive (APAC experience)
- AI filmmaker/creative technologist
- Streaming/platform executive

**Compensation:** Equity (0.5-1% advisor shares) or $5K-$10K annual retainer (once revenue is stable)

**Value:** Credibility signal for buyers, strategic guidance, warm intros to enterprise buyers

---

## Success Metrics

### Month 6 Targets (Validation Checkpoint)

- **CaaS:** 30 verifications completed ($15K revenue)
- **Showcase:** 20 films in catalog, 5 licensing deals closed ($10K GMV, $2K SI8 commission)
- **Producer:** MyVideo deal closed + 1 repeat or new whale deal ($20K total)
- **Platform:** 50+ registered creators, 80%+ uptime, <5% bug rate
- **Opt-in rate:** 40%+ of verified creators opt into catalog

### Month 12 Targets (Scale Validation)

- **CaaS:** 60 verifications completed ($30K revenue), 10/month run rate
- **Showcase:** 40 films in catalog, 10 licensing deals closed ($50K GMV, $10K SI8 commission)
- **Producer:** 3-4 whale deals closed ($30K-$40K total)
- **Revenue:** $80K-$100K total, $7K-$10K/month run rate
- **Key signal:** Repeat buyers (passive reuse) + organic inbound inquiries

### Year 3 Platform Metrics (Long-Term Vision)

- **CaaS:** 500 verifications/month ($250K/month revenue)
- **Showcase:** 200+ films in catalog, 50 licensing deals/month ($500K GMV, $100K SI8 commission)
- **Platform:** Self-serve, 1,000+ registered creators, 90%+ automated intake
- **Team:** 5-10 FTEs (product, sales, verification reviewers, customer success)
- **Funding:** Self-funded or VC-backed (decision made in Year 2 based on growth trajectory)

---

## Appendix

### A. Peer Review Summary

See: `01_Business/plans/PEER_REVIEW_SUMMARY_CAAS.md`

**ChatGPT (Claude Opus) feedback:** Two-sided CarFax model validated, phased timeline (verification first, marketplace second)

**Gemini feedback:** Parallel execution critical (don't delay MyVideo), "Two Hats" separation required, aggressive 30-day plan

**Synthesis:** Both agree on two-sided model. Disagreement on timing (sequential vs. parallel). User chose parallel execution.

### B. Filmmaker Feedback (Essa, Leon Call Notes)

See: `03_Sales/filmmakers/call-notes/`

**Pattern identified:** 20% royalty + unproven platform = not compelling enough to convert. Neither filmmaker submitted work.

**v4 solution:** Free portfolio exposure (Gear B opt-in) + fair commission (20%) + verification service creates immediate value (Gear A), solving conversion problem.

### C. Version History

See: `01_Business/plans/VERSION_HISTORY.md`

- **v1 (January 2026):** Supply-side first (filmmaker acquisition, catalog building)
- **v2 (February 2026):** Demand-side first (brands/agencies, MyVideo anchor)
- **v3 (March 2026):** Rights agency + AI product placement (custom brand integration)
- **v4 (March 2026):** Compliance as a Service + creator platform (verification service + opt-in marketplace)

**Why v3 → v4:** Chicken-egg problem (need creators for buyers, buyers for creators) solved by making verification the entry point. CaaS model generates immediate revenue, opt-in flywheel builds catalog organically.

---

**One-Sentence Summary:**

*SI8 provides Chain of Title verification for AI video content at $499 per video, with an opt-in marketplace where verified creators can list their work for licensing (20% commission) and a producer curation track for high-value deals — effectively building the CarFax of AI video.*

---

*Version: 4.0 (March 2026)*
*Previous version: BUSINESS_PLAN_v3.md*
*Next: Platform PRDs, technical architecture documentation*
