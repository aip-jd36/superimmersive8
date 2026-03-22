# SI8 Pricing Strategy v2.0

**Date:** March 2026
**Status:** Current — Two-tier CaaS pricing model
**Supersedes:** PRICING-STRATEGY-v1.0.md (v3 licensing tiers — now archive)
**Next review:** After first 10 verifications

---

## Executive Summary

**Model shift:** From licensing-tier pricing (v3 Rights Agency) to verification-service pricing (v4 CaaS + Creator Platform).

**Core insight:** The verification service is the product. Licensing fees are the downstream flywheel.

**Two-tier verification pricing:**
- **Creator Record** — $29 early access (regular $49) — funnel mechanism
- **SI8 Certified** — $499 — primary revenue driver

---

## Tier 1: Creator Record — $29 (Early Access)

**Role:** Paid lead magnet / funnel mechanism. Not a primary revenue driver.

**What it is:** Self-attested documentation. Automated. No human review. PDF stamped: "SELF-ATTESTED — NOT FOR COMMERCIAL USE"

**Target:** Indie creators, social media creators, YouTube, portfolio work, film festival submissions.

**Pricing rationale:**
- Anchors against creator tool stack ($20-50/mo for Runway, ElevenLabs, Midjourney)
- FilmFreeway analog: $25-45 festival submission fees (known reference)
- $29 = low enough to be impulse buy; $49 feels like "another subscription"
- ChatGPT framing: "paid lead magnet that pays for itself in 3-4 sign-ups"
- Gemini framing: "FilmFreeway price anchoring — creators already pay this range for access to opportunity"

**Purpose in funnel:**
1. Creator signs up → pays $29 → gets structured record (minimal friction)
2. Creator gets commercial opportunity → needs upgrade → pays $499 delta
3. Upgrade path creates repeat revenue on same customer

**What it does NOT include:**
- Human review
- Commercial use clearance
- Receipt verification
- Brand legal compliance

**PDF stamp:** `SELF-ATTESTED — NOT FOR COMMERCIAL USE`

**Unit economics:** $29 revenue, ~$1.50 cost (Stripe) = 95% gross margin

---

## Tier 2: SI8 Certified — $499

**Role:** Primary revenue driver. Gear A of the CaaS model.

**What it is:** 90-minute human review across 7 categories. PDF stamped: "CLEARED FOR COMMERCIAL USE"

**Target:** Ad agencies, production houses, brands with AI content teams, short films for streaming/distribution, anyone needing E&O insurance documentation.

**Pricing rationale:**
- $499 = less than 1 hour of entertainment lawyer billing ($400-800/hr)
- Compared to: manual legal review of AI content = $2K-$5K+ for full risk assessment
- B2B anchor: agency charges client $5K+ for the commercial; $499 for compliance = <10% of project cost
- Cheap enough to be an expense line, not a budget negotiation
- Volume discount path shows seriousness for agency accounts

**What it includes:**
- 90-minute review of all 7 categories (Tool & Plan, Human Authorship, Likeness, IP, Brand Safety, Audio, Modification Rights)
- Receipt verification (commercial plan confirmed)
- Full 9-field Chain of Title documentation (PDF)
- Rights Verified badge + Catalog ID (SI8-YYYY-####)
- E&O insurer-ready documentation
- Risk flags + remediation guidance if issues found
- 3-5 business day turnaround
- Free resubmission after corrections
- Optional Showcase catalog listing (earn 80% of licensing fees)

**PDF stamp:** `CLEARED FOR COMMERCIAL USE`

**Unit economics:** $499 revenue, ~$17 cost = 97% gross margin

---

## Volume Pricing (SI8 Certified only)

For agencies verifying multiple videos:

| Volume | Price | Savings |
|--------|-------|---------|
| 1-4 videos | $499 each | — |
| 5-9 videos | $399 each | 20% off |
| 10+ videos | $349 each | 30% off |

**Note:** Volume discounts activate in Year 2 when operational volume can support them. Offer early access to warm agency leads.

---

## Licensing Fees (Gear B: Showcase Marketplace)

After SI8 Certified verification, creator opts in to Showcase catalog. Licensing fees:

| License Type | Buyer Price | Creator Earns | SI8 Earns |
|-------------|------------|---------------|-----------|
| Editorial | $500-$1,500 | $400-$1,200 (80%) | $100-$300 (20%) |
| Non-Exclusive | $2,000-$5,000 | $1,600-$4,000 (80%) | $400-$1,000 (20%) |
| Category-Exclusive | $5,000-$10,000 | $4,000-$8,000 (80%) | $1,000-$2,000 (20%) |
| Fully Exclusive | $10,000+ | $8,000+ (80%) | $2,000+ (20%) |

**Note:** Licensing fees earned only when deals close. Verification fee ($499) is paid upfront and separate. Creator Record ($29) does not include catalog listing.

---

## Why Not 3 Tiers?

Gemini proposed a $199 "Film/Entertainment" middle tier for short films and streaming submissions. Rejected for v1 because:

1. **Distribution liability = buyer, not format.** A short film licensed to MyVideo has the same legal exposure as a commercial. Tier by use/buyer, not content format.
2. **Simpler = better for launch.** 2 tiers = clear decision tree. 3 tiers = "which do I need?" confusion.
3. **PDF stamp architecture.** "SELF-ATTESTED" vs "CLEARED" is binary. A $199 middle stamp would be ambiguous.
4. **$199 falls between two chairs.** Too expensive for casual creators (loses Tier 1 funnel), not credible enough for commercial buyers (loses Tier 2 sales).

Review after 30 verifications if creators are consistently misclassifying.

---

## Upgrade Path

Creator Record → SI8 Certified is the core funnel:

1. Creator pays $29 → gets record → submission stored in platform
2. Commercial opportunity appears
3. Creator logs in → "Upgrade to SI8 Certified" → pays $499
4. Existing submission enters human review queue (no re-fill required)

**This creates:** Recurring revenue from same customer. Converts $29 casual users into $499 commercial clients.

---

## Early Access Pricing

Tier 1 is currently offered at **$29 early access** (regular price: $49 when volume allows brand perception justification).

Early access pricing ends when:
- SI8 has 50+ verified films in catalog (proof of track record)
- OR 6 months after launch (March → September 2026)
- Whichever comes first

---

*Version: v2.0 — March 2026*
*See PRICING-STRATEGY-v1.0.md for v3 licensing-tier pricing (archived — reference only)*
