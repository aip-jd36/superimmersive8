# Revenue Model v4: Three-Gear Economics
## CaaS + Showcase + Producer

**Version:** 4.0
**Date:** March 2026
**Business Plan:** BUSINESS_PLAN_v4.md (CaaS model)

---

## Executive Summary

SI8 operates three revenue streams with different unit economics, scalability, and customer profiles:

| Gear | Primary Revenue | Scalability | Margin | Year 1 Target |
|------|----------------|-------------|--------|---------------|
| **Gear A: CaaS Verification** | $499/video transaction fee | High (platform) | ~100% | $30-40K |
| **Gear B: Showcase Licensing** | 20% commission on deals | Very high (marketplace) | ~100% | $10-20K |
| **Gear C: Producer Curation** | $10K-$20K project fee | Low (time-intensive) | 50% (after filmmaker split) | $30-40K |
| **Total** | | | | **$80-120K** |

**Key insight:** Gears A and B are the scalable foundation (platform economics). Gear C is the high-margin service layer that uses the platform.

---

## Gear A: CaaS Verification Service

### Unit Economics

**Price:** $499 per video verification

**Cost Structure (Year 1 — Manual):**
| Cost Item | Amount | Notes |
|-----------|--------|-------|
| **Founder time** | 90 min | Manual review: 70-field submission, generate 9-field Rights Package |
| **Opportunity cost** | ~$75 | Assuming $50/hr founder billing rate (not actual cash cost) |
| **Platform costs** | ~$2 | Supabase storage, email notifications, Stripe processing (2.9% + $0.30 = ~$15) |
| **Total cash cost** | **$17** | Stripe fees + platform overhead |
| **Gross margin** | **$482 (97%)** | Before founder time |

**Effective margin (Year 1):** 85% (if founder time is valued at $50/hr)

**Scalability path:**
- Year 1: 100% manual review (90 min/video)
- Year 2: Semi-automated intake reduces to 45 min/video (receipt OCR, automated pre-screening)
- Year 3: Mostly automated intake, human review as final gate (15-20 min/video)

---

### Revenue Projections (Year 1)

| Month | Verifications | Revenue | Cumulative |
|-------|--------------|---------|------------|
| **1** | 2 | $1,000 | $1,000 |
| **2** | 3 | $1,500 | $2,500 |
| **3** | 5 | $2,500 | $5,000 |
| **4** | 5 | $2,500 | $7,500 |
| **5** | 10 | $5,000 | $12,500 |
| **6** | 10 | $5,000 | $17,500 |
| **7-12** | 10/month | $5,000/month | **$47,500** |

**Year 1 total: 70 verifications = $35K**

---

### Customer Segmentation

**Segment A: Production Agencies (Primary — 60%)**
- Creative agencies producing AI video for brand clients
- Pain point: Client's legal team flags AI content as risky
- Value prop: "Provide Chain of Title documentation for client deliverables"
- Volume: 3-5 verifications per agency per year
- Year 1 target: 8-10 agencies

**Segment B: Independent Filmmakers (Secondary — 30%)**
- AI filmmakers wanting to monetize work commercially
- Pain point: No proof content is safe for brand licensing
- Value prop: "Get your work verified, opt into our catalog"
- Volume: 1-3 verifications per filmmaker (their portfolio pieces)
- Year 1 target: 15-20 filmmakers

**Segment C: Brands/In-House Teams (Tertiary — 10%)**
- Brands with in-house content teams experimenting with AI
- Pain point: Legal/compliance team needs documentation before publishing
- Value prop: "Internal audit trail for AI content use"
- Volume: 1-2 verifications (testing)
- Year 1 target: 3-5 brands

---

### Pricing Strategy & Variations

**Base price: $499 per video**

**Potential tiers (Year 2+):**
| Tier | Price | Service Level | Target Customer |
|------|-------|---------------|-----------------|
| **Standard** | $499 | 5-day turnaround, standard Rights Package | Individual filmmakers |
| **Express** | $699 | 48-hour turnaround, priority review | Agencies with tight deadlines |
| **Volume** | $399 each | 5+ videos at once, batched review | Production houses |
| **Enterprise** | Custom | API integration, white-label option | Large agencies, platforms |

**Year 1:** Single tier ($499) to keep offering simple. Test demand before adding complexity.

---

### Sales & Marketing (CAC Analysis)

**Customer Acquisition Cost (CAC):**
| Channel | Cost per Acquisition | Notes |
|---------|---------------------|-------|
| **LinkedIn outreach** | $0 | Manual DM, free LinkedIn account |
| **Email campaigns** | $50 | List building tools, email platform |
| **LinkedIn ads (future)** | $200-300 | If organic doesn't scale |
| **Events/sponsorships** | $500-1,000 | AI Creators Fest attendee conversion |
| **Weighted CAC (Year 1)** | **~$50-100** | Mostly organic, minimal paid spend |

**Lifetime Value (LTV):**
- Assumption: Average customer orders 3 verifications over 12 months
- LTV = $499 × 3 = **$1,497**
- LTV/CAC ratio: **15-30x** (excellent)

**Break-even:** 1 verification covers CAC (if CAC < $499)

---

### Conversion Funnel (Estimated)

| Stage | Volume (Month 6 run rate) | Conversion Rate |
|-------|---------------------------|-----------------|
| **Outreach sent** | 500 contacts/month | |
| **Response rate** | 25 responses (5%) | 5% |
| **Discovery calls** | 10 calls (40% of responses) | 40% |
| **Proposals sent** | 8 proposals (80% of calls) | 80% |
| **Closed deals** | 3 new clients (37.5% close rate) | 37.5% |
| **Verifications from new clients** | 3 first verifications | 1 per client initially |
| **Repeat verifications** | 7 from existing clients | |
| **Total verifications/month** | **10** | |

**Key assumptions:**
- 5% response rate (LinkedIn/email cold outreach) — typical B2B range
- 37.5% close rate — high because offer is clear, price is low-risk
- Repeat customer rate: 70% order again within 6 months

---

## Gear B: Showcase Licensing (Marketplace)

### Unit Economics

**Typical license deal:** $2,000-$5,000 (varies by buyer, use case, exclusivity)

**Commission structure:**
- Creator: 80% ($1,600-$4,000)
- SI8: 20% ($400-$1,000)

**Cost Structure:**
| Cost Item | Amount | Notes |
|-----------|--------|-------|
| **Transaction processing** | 2.9% + $0.30 | Stripe fees (on full $2K-$5K, so ~$60-$150) |
| **Filmmaker payout** | 80% | $1,600-$4,000 to creator |
| **Platform overhead** | ~$5 | Email, contract generation, file delivery |
| **SI8 net revenue** | **$340-$850** | After Stripe + platform overhead |

**Effective margin:** 17-19% of gross deal value (after all costs including filmmaker payout)

---

### Revenue Projections (Year 1)

**Assumptions:**
- 60 verifications (Gear A) × 50% opt-in rate = 30 films in catalog by Month 6
- 30 films × 33% licensing rate over 12 months = 10 licensing deals by Month 12
- Average deal size: $3,000 (midpoint of $2K-$5K range)

| Month | Catalog Size | Licensing Deals | SI8 Commission (20%) | Cumulative |
|-------|--------------|-----------------|---------------------|------------|
| **1-2** | 3 | 0 | $0 | $0 |
| **3** | 8 | 1 | $600 | $600 |
| **4** | 12 | 1 | $600 | $1,200 |
| **5** | 20 | 2 | $1,200 | $2,400 |
| **6** | 30 | 2 | $1,200 | $3,600 |
| **7-12** | 40+ | 1-2/month | $600-$1,200/month | **$10,000** |

**Year 1 total: 10 deals, $30K GMV, $6K SI8 commission**

**Conservative case:** 5 deals = $3K SI8 commission
**Base case:** 10 deals = $6K SI8 commission
**Optimistic case:** 15 deals = $9K SI8 commission (if catalog quality is high and buyer discovery is strong)

---

### Buyer Segmentation

**Segment A: Streaming Platforms (40% of deals)**
- MyVideo, airline content libraries, regional streaming services
- Use case: Fill programming slots, ambient/background content
- Typical deal size: $2,000-$3,000 per film (non-exclusive, 12-month license)
- Volume: 1-3 films per buyer

**Segment B: Editorial/Content Publishers (30% of deals)**
- Online magazines, blogs, YouTube channels
- Use case: Illustrate articles, video essays, social content
- Typical deal size: $500-$1,500 per film (non-exclusive, perpetual editorial use)
- Volume: 1-2 films per buyer

**Segment C: Agencies/Brands (30% of deals)**
- Creative agencies licensing for client campaigns, brands for internal content
- Use case: Campaign visuals, social media, brand films
- Typical deal size: $5,000-$10,000 per film (exclusive or category-exclusive)
- Volume: 1 film per buyer (high-value, infrequent)

---

### Conversion Funnel (Catalog → Licensing)

**Inbound discovery (primary motion):**
| Stage | Estimated Volume (Month 6) | Conversion Rate |
|-------|---------------------------|-----------------|
| **Catalog views** | 500 monthly visitors | |
| **Film detail views** | 150 (30% CTR) | 30% |
| **Licensing inquiries** | 15 (10% of detail views) | 10% |
| **Proposals sent** | 10 (67% qualify) | 67% |
| **Closed deals** | 2 (20% close rate) | 20% |

**Outbound pitching (secondary motion):**
- JD pitches catalog to 10 platform programmers/month
- 2 respond with interest
- 1 closes licensing deal

**Combined: 2-3 licensing deals/month by Month 6**

---

### Pricing Strategy (Licensing)

**License types:**

| License Type | Price Range | Use Case | Territory | Duration |
|--------------|-------------|----------|-----------|----------|
| **Editorial** | $500-$1,500 | Articles, blogs, education | Global | Perpetual |
| **Non-exclusive commercial** | $2,000-$5,000 | Streaming, platforms, ambient | Regional or global | 12 months |
| **Category-exclusive** | $5,000-$10,000 | Brand campaigns (one brand per category) | Regional | 12-24 months |
| **Fully exclusive** | $10,000-$25,000 | Premium brand use, all categories blocked | Global | 24 months |

**Year 1 average: $3,000 per deal** (mix of non-exclusive commercial and editorial)

---

### Key Metrics to Track

**Opt-in conversion rate:**
- Target: 50% of verified creators opt into catalog
- If <30%: Opt-in value prop is weak, improve messaging or increase commission to 30%
- If >70%: Very strong signal, catalog will grow quickly

**Catalog → licensing conversion rate:**
- Target: 33% of catalog films licensed within 12 months
- If <10%: Catalog quality issue, buyer targeting problem, or pricing mismatch
- If >50%: Very strong signal, catalog has high commercial appeal

**Passive reuse rate (most important platform signal):**
- Target: 10% of catalog films licensed by 2+ different buyers within 12 months
- This is the "holy grail" metric — same asset, multiple revenue streams
- If this happens, platform economics are proven

---

## Gear C: Producer Curation

### Unit Economics (MyVideo Case Study)

**Deal structure:**
- Total deal size: $10,000
- Films in slate: 5
- Price per film: $2,000

**Cost structure:**
| Cost Item | Amount | Notes |
|-----------|--------|-------|
| **Filmmaker payments** | $5,000 (50%) | $1,000 per film × 5 films |
| **Verification labor (absorbed)** | $2,495 internal cost | $499 × 5 (not billed separately) |
| **Curation time** | 10-15 hours | Filmmaker outreach, slate assembly, client coordination |
| **Delivery coordination** | 3-5 hours | Rights Package generation, file delivery, invoicing |
| **Total filmmaker payout** | **$5,000** | |
| **SI8 gross revenue** | **$5,000** | |

**Effective margin:** 50% (after filmmaker split, before founder time)

**If founder time valued:** ~30-35% margin (after filmmaker split + founder time at $50/hr)

---

### Revenue Projections (Year 1)

| Deal | Timeline | Deal Size | SI8 Revenue | Cumulative |
|------|----------|-----------|-------------|------------|
| **MyVideo (slate 1)** | Month 1 | $10,000 | $5,000 | $5,000 |
| **MyVideo (renewal or Season 2)** | Month 6-7 | $10,000 | $5,000 | $10,000 |
| **Second whale buyer** | Month 9-10 | $15,000 | $7,500 | $17,500 |
| **Third whale buyer** | Month 11-12 | $15,000 | $7,500 | **$25,000** |

**Year 1 total: 3-4 deals, $40K-$50K total deal value, $20K-$25K SI8 revenue**

**Conservative case:** 2 deals (MyVideo only) = $10K SI8 revenue
**Base case:** 3 deals = $17.5K SI8 revenue
**Optimistic case:** 4 deals = $25K SI8 revenue

---

### Customer Profile (Whale Buyers)

**Ideal customer:**
- Streaming platform, airline content library, or brand with content programming need
- Looking for 5-10 curated films (not just one asset)
- Values curation + compliance in one package
- Willing to pay premium for high-touch service

**Examples:**
- MyVideo (Taiwan streaming platform)
- Starlux Airlines (Taiwanese premium carrier, in-flight entertainment)
- Singapore Airlines, Cathay Pacific (regional long-haul content)
- Netflix/YouTube regional programming (aspirational)

**Sales cycle:** 30-60 days (relationship-building, not transactional)

---

### Filmmaker Split Negotiation

**Standard split:** 50/50 (filmmaker gets $1K per film from $2K per-film deal)

**Variables that affect split:**
| Factor | Filmmaker Gets More (60-70%) | Filmmaker Gets Less (40-50%) |
|--------|----------------------------|----------------------------|
| **Filmmaker tier** | Established, high-demand work | Emerging, first commercial deal |
| **Exclusivity** | Non-exclusive (can still license elsewhere) | Fully exclusive to SI8 for 12 months |
| **Volume** | One-off deal | Multi-film slate, recurring relationship |
| **Filmmaker leverage** | Filmmaker brought the buyer | JD brought the buyer |

**Year 1 default:** 50/50 split for simplicity. Refine based on real negotiations.

---

## Combined Revenue Model (Three Gears)

### Year 1 Monthly Projection

| Month | CaaS (A) | Showcase (B) | Producer (C) | Total | Cumulative |
|-------|----------|--------------|--------------|-------|------------|
| **1** | $1,000 | $0 | $10,000 | **$11,000** | $11,000 |
| **2** | $1,500 | $0 | $0 | **$1,500** | $12,500 |
| **3** | $2,500 | $600 | $0 | **$3,100** | $15,600 |
| **4** | $2,500 | $600 | $0 | **$3,100** | $18,700 |
| **5** | $5,000 | $1,200 | $0 | **$6,200** | $24,900 |
| **6** | $5,000 | $1,200 | $0 | **$6,200** | $31,100 |
| **7** | $5,000 | $1,200 | $10,000 | **$16,200** | $47,300 |
| **8-12** | $5K/mo | $1.2K/mo | $7.5K (1 deal) | **$6.2-13.7K/mo** | **$80K-$100K** |

**Year 1 total (base case): $90K**

---

### Revenue Mix Analysis

| Stream | Year 1 Revenue | % of Total | Scalability | Founder Time | Margin |
|--------|----------------|-----------|-------------|--------------|--------|
| **CaaS (A)** | $35K | 39% | High (platform) | 90 min/verification | 97% |
| **Showcase (B)** | $6K | 7% | Very high (marketplace) | 1-2 hrs/deal | 85% (after filmmaker payout) |
| **Producer (C)** | $17.5K | 19% | Low (time-intensive) | 15 hrs/deal | 50% (after filmmaker payout) |
| **MyVideo (C)** | $10K | 11% | One-time | 20 hrs total | 50% |
| **Other revenue** | $21.5K | 24% | | | |
| **Total** | **$90K** | 100% | | | |

**Key insight:** CaaS is the largest single revenue stream by Year 1 end (39%), but Producer deals provide the largest individual transactions ($10K each).

---

### Break-Even Analysis

**Fixed costs (Year 1):**
| Category | Annual Cost |
|----------|-------------|
| Platform/tools | $1,000 (Supabase Pro, Vercel, Stripe fees) |
| Legal/admin | $3,000 (DBA filing, contracts, lawyer consult) |
| Marketing | $2,000 (LinkedIn ads, optional event sponsorship) |
| **Total fixed** | **$6,000** |

**Variable costs:**
- Filmmaker payouts: 50% of Producer revenue = $17.5K (on $35K Producer gross)
- Showcase payouts: 80% of licensing deals = $24K (on $30K GMV)
- **Total variable:** $41.5K

**Total costs (Year 1): $47.5K**

**Break-even: $47.5K revenue**
- Achieved by Month 6-7 in base case
- CaaS alone would break even at 95 verifications ($47.5K ÷ $499)

**Net profit (Year 1): $42.5K** (on $90K revenue)

---

### Sensitivity Analysis

**What if CaaS underperforms? (5 verifications/month instead of 10)**
- CaaS revenue: $17.5K (instead of $35K)
- Total Year 1: $72.5K (still profitable, but below target)

**What if Showcase doesn't convert? (0 licensing deals)**
- Showcase revenue: $0 (instead of $6K)
- Total Year 1: $84K (minimal impact, CaaS + Producer carry the business)

**What if MyVideo delays to Month 3?**
- Cash flow delayed by 2 months
- Year 1 total unchanged ($90K)
- Risk: Lower runway in Month 1-2

**What if Producer track gets 4 deals (optimistic)?**
- Producer revenue: $25K (instead of $17.5K)
- Total Year 1: $97.5K (nearly $100K)

**Most resilient scenario:** CaaS reaches 10 verifications/month. Even if Showcase and Producer underperform, SI8 is profitable.

---

## Year 2-3 Projections (Platform Growth)

### Year 2 Target (Semi-Automated Platform)

| Stream | Year 2 Target | Growth Rate | Key Driver |
|--------|---------------|-------------|------------|
| **CaaS** | $120K (20 verifications/month) | 3.4x Year 1 | Platform efficiency, word-of-mouth |
| **Showcase** | $50K (40 licensing deals) | 8x Year 1 | Larger catalog (100 films), passive reuse |
| **Producer** | $60K (4-6 whale deals) | 3.4x Year 1 | Reputation, repeat buyers |
| **Total** | **$230K** | 2.6x Year 1 | |

**Year 2 net profit: ~$150K** (65% margin after filmmaker payouts + platform overhead)

---

### Year 3 Target (Self-Serve Platform)

| Stream | Year 3 Target | Growth Rate | Key Driver |
|--------|---------------|-------------|------------|
| **CaaS** | $600K (100 verifications/month) | 5x Year 2 | Self-serve intake, API, enterprise contracts |
| **Showcase** | $300K (150 licensing deals) | 6x Year 2 | Network effects, 300+ film catalog |
| **Producer** | $100K (6-8 whale deals) | 1.7x Year 2 | Maintain as premium service layer |
| **Total** | **$1M** | 4.3x Year 2 | |

**Year 3 net profit: ~$600K** (60% margin after filmmaker payouts + team overhead)

**Team (Year 3):** 3-5 FTEs (product, sales, verification reviewers)

---

## Key Success Metrics (Targets)

### Month 6 Checkpoint (Validation)

- [ ] CaaS: 30 verifications completed ($15K revenue)
- [ ] Showcase: 20 films in catalog, 5 licensing deals ($3K SI8 commission)
- [ ] Producer: MyVideo closed + 1 additional deal ($20K total)
- [ ] **Total revenue: $38K** (on track for $80K Year 1)
- [ ] Opt-in rate: >40%
- [ ] Catalog → licensing rate: >20%

**If these are met:** Model is validated, scale aggressively.

**If these are missed:** Diagnose bottleneck (demand, pricing, conversion), iterate for 3 months, reassess at Month 9.

---

### Month 12 Goals (Year 1 End)

- [ ] CaaS: 70 verifications ($35K revenue), 10/month run rate
- [ ] Showcase: 40 films in catalog, 10 licensing deals ($6K SI8 commission)
- [ ] Producer: 3-4 whale deals ($17.5K-$25K revenue)
- [ ] **Total revenue: $80K-$100K**
- [ ] Platform: 100+ registered creators, self-serve submission working
- [ ] Key signal: 1-2 films licensed by multiple buyers (passive reuse)

**If these are met:** Year 2 goal is $200K+. Consider full-time transition, possible hiring.

**If these are missed:** Assess whether to continue as side project, pivot back to v3 model (producer only), or shut down.

---

## Conclusion

**The three-gear model diversifies revenue and de-risks the business:**
- **CaaS (Gear A)** is the reliable foundation — transactional, scalable, high-margin
- **Showcase (Gear B)** is the long-term value multiplier — marketplace economics, passive income
- **Producer (Gear C)** is the premium service layer — high-margin, relationship-driven

**If any one gear underperforms, the other two can carry the business.**

**Year 1 success is defined by:** CaaS reaching 10 verifications/month + MyVideo deal closing + Showcase proving opt-in flywheel works (even if licensing volume is low).

**Platform thesis is validated when:** Passive reuse happens (same film, 2+ buyers) + opt-in rate >40% + catalog → licensing rate >20%.

---

**Files to reference:**
- `BUSINESS_PLAN_v4.md` — Full strategic context
- `PEER_REVIEW_SUMMARY_CAAS.md` — Strategic validation from ChatGPT + Gemini
- `COMPETITIVE_ANALYSIS_CAAS_2026.md` — Market positioning and competitor economics

**Next:** Build platform, execute MyVideo, test CaaS demand.
