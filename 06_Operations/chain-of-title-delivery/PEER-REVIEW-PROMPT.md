# Peer Review Prompt — For ChatGPT & Gemini

**Copy-paste this entire prompt into ChatGPT and Gemini for feedback on SI8's Rights Package Delivery SOP.**

---

## Context: What is SuperImmersive 8 (SI8)?

SuperImmersive 8 is an AI film distribution agency based in Taipei, Taiwan, launching in Q1 2026. Think "Getty Images for AI video" — but with a critical legal compliance layer that Getty doesn't provide for photography.

**The business model:**
- We represent AI filmmakers and license their work to brands, agencies, platforms, and streaming services
- Our differentiation: We vet AI video content through a "Safe Lane" process to ensure it's defensible against legal risk (no unauthorized likeness, IP infringement, training data issues, tool ToS violations)
- We deliver a **Rights Package** — a 9-field legal documentation bundle — with every licensed asset

**The two-tier model:**
- **Tier 1 (Standard):** Catalog licensing as-is — buyer gets video file + Rights Package PDF
- **Tier 2 (Custom Placement):** AI product placement — we commission the filmmaker to regenerate brand elements into existing content (premium pricing, category-exclusive rights)

**The Rights Package (what we deliver):**
A PDF document with 9 structured fields:
1. Tool Provenance Log (every AI tool used)
2. Model Disclosure (which AI models, versions)
3. Safe Lane Sign-Off (SI8's vetting certification)
4. Commercial Use Authorization (receipts proving paid plans)
5. Modification Rights Status (can it be customized for Tier 2?)
6. Category Conflict Log (brand categories excluded from placement)
7. Territory Log (geographic licensing restrictions)
8. Regeneration Rights Status (which scenes can be AI-regenerated)
9. Version History (production timeline, review dates)

**Why this matters:**
Getty Images provides **invoice + license history** but **no detailed provenance documentation**. SI8's Rights Package fills this gap for AI video, where legal risk is higher (training data lawsuits, deepfake concerns, IP infringement potential).

---

## The Question I Need Your Help With

**I've designed SI8's Rights Package Delivery SOP** — the operational process for how we deliver the Rights Package (and video file) to buyers when they license content.

I researched Getty Images' actual delivery process and modeled SI8's SOP after their proven approach, but with the Rights Package as an added layer.

**I need peer review on:**
1. Is this SOP sound? Any gaps, risks, or overlooked details?
2. Are my Year 1 (manual) → Year 2 (semi-auto) → Year 3 (platform) phases realistic?
3. Are there edge cases I haven't considered?
4. Does the email template language feel right? Too formal? Too casual?
5. Storage/retention policy: Am I over-engineering? Under-engineering?
6. Any legal/compliance red flags?

---

## Here's the SOP Framework (Summary)

### Year 1 (Manual Process, 0-20 deals)

**Storage:** Google Drive (buyer-specific folders, shared links)
**Delivery:** Manual email with download links within 30 min of payment
**Tracking:** Google Sheets for license history
**Cost:** ~$24/year (Google Drive 100GB plan)

**Flow:**
1. Buyer inquires → JD sends proposal + invoice
2. Payment received → JD uploads files to Google Drive
3. JD sends confirmation email with download links (no expiration)
4. Buyer downloads video + Rights Package PDF + invoice
5. JD logs transaction in spreadsheet

### Year 2 (Semi-Automated, 20-100 deals)

**Storage:** AWS S3 or Google Cloud Storage
**Delivery:** Automated via Stripe webhook → Vercel function → Resend email (< 60 sec)
**Tracking:** Notion or Airtable database
**Cost:** ~$50/month (storage + bandwidth + database)

**Flow:**
1. Buyer inquires → JD sends proposal + Stripe payment link
2. Payment received → Stripe webhook triggers automation
3. Vercel function: generates download links → sends email
4. Buyer downloads from email links (7-day expiration)
5. After 7 days: buyer logs into account → generates new links

### Year 3 (Self-Serve Platform, 100+ deals)

**Storage:** AWS S3 with cross-region replication
**Delivery:** Fully automated, buyer account dashboard (like Getty's UX)
**Tracking:** PostgreSQL database
**Cost:** ~$200/month (hosting + storage + bandwidth)

**Flow:**
1. Buyer browses catalog → adds to cart → checks out (Stripe embedded)
2. Payment → instant account record + email confirmation
3. Buyer logs in → "My Licenses" dashboard → downloads files anytime
4. Re-download: unlimited, on-demand link generation

---

## Key Decisions I Made (Based on Getty Research)

| Decision | Rationale |
|----------|-----------|
| **Indefinite record retention** | Getty maintains license history forever; buyers may need docs years later for legal review |
| **Rights Package = primary deliverable** | Getty logic: buyers pay $450 for legal guarantee, $50 for the JPEG. SI8: video is carrier, Rights Package is the product. |
| **No expiration on download links (Year 1)** | Matches Getty UX, reduces support burden |
| **Plain text emails (Year 1)** | Easy to maintain, universal compatibility |
| **Year 1 = manual, Year 3 = platform** | Validate business model before building expensive infrastructure |
| **Master license agreement (not per-deal customization)** | Getty uses standard terms for all purchases; simplifies legal, scales better |
| **Cross-region backup (Year 2+)** | Disaster recovery + faster downloads for SEA buyers |

---

## Documents Created (You Don't Need to Read All, Just Skim)

I created 7 documents totaling ~15,000 words. Here's the structure:

### 1. README.md
- Project overview, how documents relate, version roadmap
- Key principle: "The Rights Package is the product. The video file is just the carrier."

### 2. DELIVERY-PROCESS.md
- Step-by-step flow from purchase → delivery (Year 1, 2, 3)
- Edge cases: refunds, re-downloads, lost files, wire transfers
- Quality checklist before delivery
- Metrics to track (delivery speed, download rate, refund rate)

### 3. EMAIL-TEMPLATES.md
- 8 templates: License confirmation (Tier 1 & 2), re-download, refund, proposal, payment reminder, follow-up, iteration request
- Tone guidelines: professional but warm, explain why Rights Package matters
- Plain text (Year 1) → HTML (Year 2+)

### 4. STORAGE-RETENTION.md
- Storage architecture: Google Drive (Year 1) → S3 (Year 2+)
- Retention policy: indefinite for all license records (matches Getty)
- Backup strategy: weekly external SSD (Year 1), cross-region replication (Year 2+)
- Storage tier transitions: Hot (0-1yr) → Warm (1-7yr) → Cold (7yr+)
- Cost projections: $24/yr (Year 1) → $12/yr (Year 2) → $236/yr (Year 3)

### 5. ACCOUNT-DASHBOARD.md
- Year 2-3 self-serve platform vision (Next.js + PostgreSQL)
- User flows: first purchase, returning buyer, re-download after 1 year, guest checkout
- Database schema (users, licenses, download logs)
- Admin dashboard for JD (view all licenses, refund processing, analytics)
- Migration path: Year 1 manual → Year 2 semi-auto → Year 3 full platform

### 6. DECISIONS.md
- Version log (v0.1 = this draft)
- 15 key decisions documented with rationale
- 8 open questions flagged (payment processing, download expiration, refund policy details, etc.)
- Precedents log (to be filled as real deals happen)
- Review triggers (after first 3 deals, after legal review, after Year 1)

### 7. research/getty-sop-research.md
- Web research findings on Getty's delivery process
- What Getty provides: invoice + account record + master agreement (NO certificates)
- Adobe Stock comparison: same approach, users request certificates but Adobe doesn't provide
- Key insight: There's a market gap — buyers want per-asset documentation, stock agencies don't provide it

---

## Specific Questions for You

### Question 1: Is the Year 1 → Year 2 → Year 3 phasing realistic?

**My thinking:**
- Year 1: Keep it simple, manual process, focus on closing deals and refining the Rights Package itself
- Year 2: Automate when manual work becomes painful (20+ deals = 10+ hours/month manual delivery)
- Year 3: Build platform when model is validated (100+ deals = sustainable revenue)

**Your feedback:**
- Does this timeline feel right?
- Should I automate earlier (Year 1.5)? Later (Year 4)?
- Am I underestimating the manual burden in Year 1?

---

### Question 2: Email template tone — is it right for B2B buyers?

Here's the Tier 1 confirmation email (shortened for this prompt):

```
Hi [Buyer First Name],

Thank you for licensing "[Asset Title]" through SuperImmersive 8.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
YOUR LICENSE DETAILS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Asset Title: Neon Dreams
Catalog ID: SI8-2026-0001
License Type: Tier 1 Standard (catalog as-is)
Licensed to: Acme Corporation
Date: February 25, 2026

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DOWNLOAD YOUR FILES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

→ Video File (MP4) [Link]
→ Rights Package (PDF) [Link]
→ Invoice (PDF) [Link]

These links do not expire. You can re-download anytime.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
WHAT'S IN YOUR RIGHTS PACKAGE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Your Rights Package is a 9-field legal documentation bundle designed to demonstrate defensibility in the event of legal review. It includes:

✓ Tool Provenance Log
✓ Model Disclosure
✓ Safe Lane Sign-Off
[... etc ...]

This is what Getty Images doesn't provide for stock photography. This is SI8's differentiation.
```

**Your feedback:**
- Is the tone professional enough? Too casual?
- Is "Hi [First Name]" appropriate for B2B? Or should it be "Dear [Full Name]"?
- Is the emoji (✓) too informal? Or does it improve scannability?
- Is explaining "This is what Getty doesn't provide" too self-promotional? Or is it helpful context?

---

### Question 3: Storage/retention — am I over-engineering?

**My plan:**
- **Year 1:** Google Drive + weekly external SSD backup
- **Year 2:** AWS S3 + cross-region replication
- **Year 3:** Hot/warm/cold storage tiers (cost optimization)

**Alternative (simpler):**
- **Year 1-3:** Just use Google Drive, upgrade to Business plan ($12/mo for 2TB) as needed. Delay cloud migration until Year 4.

**Your feedback:**
- Is my plan over-engineered for a Year 1 startup?
- Should I just stick with Google Drive longer?
- Or is the migration to S3 in Year 2 smart (because I'll need programmatic access for automation anyway)?

---

### Question 4: What edge cases am I missing?

**Edge cases I've documented:**
1. Buyer loses download link → resend
2. Buyer requests refund (within 30 days, asset unused)
3. Buyer's company is acquired → license transfers with company ownership
4. International wire transfer (3-5 day delay)
5. Rights Package template updated → buyer gets version at purchase date (frozen, not auto-upgraded)

**Your feedback:**
- What else could go wrong?
- What buyer scenarios haven't I considered?
- What happens if [X unexpected situation]?

---

### Question 5: Legal/compliance red flags?

**Things I'm aware of but not sure how to handle:**
- **GDPR (EU buyers):** Can buyer request account deletion? My stance: license records are business records (B2B), not subject to deletion while active.
- **Refund verification:** How do I verify buyer "hasn't used" the asset? Honor system? Contract clause?
- **Indemnification:** Getty provides limited indemnification. Should SI8? (Lawyer question, but flagging it.)
- **E&O insurance:** Should SI8 carry Errors & Omissions insurance? (Year 2-3 question, not Year 1 blocker.)

**Your feedback:**
- Are there compliance issues I'm not seeing?
- What legal risks does this SOP expose SI8 to?
- What should I ask a lawyer to review before first deal?

---

### Question 6: Anything else I'm not thinking about?

**Your feedback:**
- What's your overall gut reaction to this SOP?
- Is it too complex? Too simple?
- If you were a buyer, would this delivery experience feel professional and trustworthy?
- If you were an investor, would this SOP give you confidence SI8 can scale?
- What would you change if you were designing this from scratch?

---

## What I'm Looking For in Your Feedback

**Most helpful:**
- "You're missing [specific edge case / risk / consideration]"
- "This decision seems wrong because [reasoning]"
- "Have you considered [alternative approach]?"
- "This part is over-engineered, simplify by doing [X]"
- "This part is under-engineered, you'll regret it when [Y]"

**Less helpful:**
- "Looks good!" (too vague)
- "You should use [specific tech stack]" (unless there's a strong reason why)

**Format:** However you want! Bullet points, numbered list, paragraph form, whatever's easiest for you.

---

## Additional Context (If You Need It)

**Target buyers:**
- Agencies (Singapore, Manila, KL, Bangkok) — need AI video for client campaigns
- Brands (APAC + global) — want AI product placement in vetted content
- Platforms (streaming, airline, editorial) — licensing catalog for distribution

**Pricing (Year 1):**
- Tier 1: $5K-12K per asset (depending on use case, territory, exclusivity)
- Tier 2: $15K-50K per custom placement (premium pricing)

**First deal target:**
- MyVideo (Taiwan Mobile's streaming platform) — warm lead with chairman Jamie Lin
- Goal: Close pilot deal in Month 1-2 → use as credibility for SEA agency outreach

**Time constraints:**
- Solo founder (JD) running this part-time (10-15 hrs/week) until $5K/mo run rate
- Year 1 budget: minimal ($500 max for tools/software, rest is sweat equity)
- Must keep SOP simple enough to execute alone (no team until Year 2)

---

## Thank You!

I'm building this in public and documenting every decision. Your feedback will be logged in `DECISIONS.md` and will directly shape how SI8 delivers Rights Packages to buyers.

If you have time for a quick review, I'd hugely appreciate it. Even just answering 1-2 of the questions above would be helpful.

**End of prompt. Paste everything above into ChatGPT or Gemini.**

---

## How to Use This Prompt

1. Copy everything above (from "Context: What is SuperImmersive 8" to here)
2. Paste into ChatGPT (GPT-4 or GPT-4 Turbo recommended)
3. Paste into Gemini (Gemini 1.5 Pro recommended)
4. Compare their feedback
5. Log insights in `DECISIONS.md`
6. Update SOP docs based on peer review

**Expected response time:** 3-5 minutes per AI model
**Expected response length:** 500-2000 words of feedback
