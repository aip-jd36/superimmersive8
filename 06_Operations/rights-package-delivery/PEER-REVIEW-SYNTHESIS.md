# Peer Review Synthesis — ChatGPT & Gemini Feedback

**Date:** February 21, 2026
**Reviewers:** ChatGPT (GPT-4), Gemini (1.5 Pro)
**Document Reviewed:** Rights Package Delivery SOP v0.1

---

## Executive Summary

**Overall verdict:** The SOP is directionally correct and will feel professional to buyers, but has **critical gaps in security, legal language, and scope** that will cause problems at first enterprise deal or first dispute.

**Biggest risk identified (both models agree):**
Not storage costs. Not automation complexity. It's **exception creep** — bespoke terms, delivery variants, and support requests that kill your 10-15 hrs/week time budget.

**Core tension:**
- **ChatGPT's concern:** You're under-engineered on security and legal safeguards
- **Gemini's concern:** You're over-engineered on infrastructure and should focus on sales

**Both models agree:** Year 1 manual is correct, but you need to fix several things *before* first deal.

---

## 🔴 CRITICAL ISSUES — Must Fix Before First Deal

### 1. Language: Stop Using "Certification" (ChatGPT Flagged)

**The problem:**
- Calling it "Safe Lane Sign-Off (SI8's vetting certification)" creates legal liability
- "Certification" implies warranty/guarantee SI8 can't back up
- Even in internal docs, this language is dangerous

**The fix:**
```diff
- Safe Lane Certification
+ Safe Lane Review Sign-Off

- Safe Lane vetting certification
+ Safe Lane review record

- This certifies that...
+ This documents that SI8 completed its Safe Lane review process...
```

**Add disclaimer to every Rights Package:**
> "The Rights Package documents SI8's review process and filmmaker-provided disclosures. It is not legal advice and does not constitute a warranty or indemnification."

**Impact:** High legal risk if not fixed. Could void E&O insurance or create implied warranty.

**Decision needed:** ✅ Accept this change (non-negotiable)

---

### 2. Email Template: Remove "Getty Doesn't Provide This" (Both Models Flagged)

**The problem:**
- Confirmation email currently says: "This is what Getty Images doesn't provide. This is SI8's differentiation."
- ChatGPT: "Slightly salesy and unnecessary... keep it in proposal, not delivery"
- Gemini: "Sounds defensive. Don't sell past the close."

**The fix:**

**Current (delivery email):**
```
This is what Getty Images doesn't provide for stock photography.
This is SI8's differentiation.
```

**Revised (authority positioning):**
```
Please retain this Rights Package in your compliance records. This document
serves as your official Chain of Title record in the event of platform or
legal review.
```

**Impact:** Moderate. Current version reduces perceived professionalism.

**Decision needed:** ✅ Accept this change (both models agree)

---

### 3. Storage Security: No Public "Anyone with Link" Sharing (ChatGPT Flagged)

**The problem:**
- Year 1 plan uses Google Drive "Anyone with link can view" (no expiration)
- ChatGPT: "Non-expiring public links are a security foot-gun"
- Risk: Links get forwarded, cached, leaked → Tier 2 premium content leaks → filmmaker damage

**The fix:**

**Option A (Gemini's approach - simpler):**
- Keep Google Drive, but share folders to **specific email addresses** only (buyer + legal team)
- Buyer can download unlimited times from their Google account
- No public links

**Option B (ChatGPT's approach - more secure):**
- Same as Option A, but add:
  - Viewer-only permissions (require "request access" for downloads)
  - Or: Manual link rotation every 90 days

**Trade-off:**
- Option A: Easy to implement, still secure enough for Year 1
- Option B: More secure, but adds manual admin work (link rotation)

**Gemini's counter:** "If you're using email-specific sharing, the risk is already low. Don't over-engineer Year 1."

**Impact:** High if Tier 2 content leaks; low if just Tier 1 catalog licensing.

**Decision needed:**
❓ **Which option?** (See Discussion Question #1 below)

---

### 4. Refund Policy: "Unused" is Unverifiable (Both Models Flagged)

**The problem:**
- Current policy: "Full refund if asset unused and not deployed"
- ChatGPT: "You can't really verify 'unused'"
- Gemini: "You cannot 'return' an MP4. How do you know they deleted it?"

**The fix:**

**Option A (No refunds after delivery):**
```
Refunds only if SI8 cannot deliver agreed files/documentation within 7 days.
No refunds after delivery except as legally required.
```

**Option B (Certificate of Destruction required):**
```
Refunds within 30 days require buyer to sign a Certificate of Destruction
(via DocuSign) confirming deletion of all copies from local and cloud storage.
Download links will be revoked.
```

**Trade-off:**
- Option A: Simple, but may reduce buyer confidence
- Option B: More buyer-friendly, but adds operational step (DocuSign signature)

**Industry standard (Getty):** No refunds after download, only if file corrupted/wrong file delivered.

**Impact:** Moderate. Refund requests are rare at $5K+ price points, but need clear policy.

**Decision needed:**
❓ **Which option?** (See Discussion Question #2 below)

---

### 5. Agency vs. End-Client Licensing (Both Models Flagged)

**The problem:**
- Who is "Licensed to" when agency buys for brand client?
  - Ogilvy Singapore (agency)?
  - Coca-Cola (end client)?
  - Both?
- Without clarity, agency could reuse $10K video for different client (scope creep)

**The fix:**

Add field to checkout form + Rights Package:
```
Licensed to: [Agency Name]
On behalf of: [End Client / Brand Name]
Authorized use: [Campaign Name / Project Description]
```

**Master License Agreement clause:**
```
Agency may license on behalf of named end client. License is valid only for
the specific end client and campaign listed. Reuse for different clients
requires separate license.
```

**Impact:** High. Without this, first agency deal creates bad precedent.

**Decision needed:** ✅ Accept this change (both models flagged)

---

### 6. Year 2 Automation: Skip Custom Code (Both Models Agree)

**The problem:**
- Current Year 2 plan: Build custom Vercel functions, S3 integrations, PostgreSQL database
- Gemini: "Dangerous distraction. You're falling into the Builder's Trap."
- ChatGPT: "Better trigger: support load, not deal count. Add Year 1.5 light automation."

**The fix:**

**Revised phasing:**

| Phase | Trigger | Implementation | Cost |
|-------|---------|----------------|------|
| **Year 1** | 0-10 deals | Manual (Google Drive + Gmail) | $24/year |
| **Year 1.5** (optional) | Support requests >5/month | No-code automation (Zapier/Make): Stripe → Gmail template → Drive folder → Sheet log | $20/month |
| **Year 2** | 20-50 deals | Continue no-code tools, add Notion/Airtable for better tracking | $50/month |
| **Year 3** | 100+ deals OR self-serve catalog launch | Full platform (Next.js + PostgreSQL) | $200/month |

**Year 1.5 automation (Zapier/Make flow):**
```
1. Stripe payment webhook received
   ↓
2. Create Google Drive folder: /SI8 Licenses/[Buyer Name]/[Catalog ID]/
   ↓
3. Copy files from catalog folder to buyer folder
   ↓
4. Share folder to buyer email (specific email, not public link)
   ↓
5. Send Gmail template with folder link
   ↓
6. Log transaction to Google Sheets
```

**Time to build:** 1-2 hours (vs. weeks for custom Vercel functions)

**Impact:** High time savings. Gemini: "Save the Next.js build for Year 3 when you actually transition to self-serve marketplace."

**Decision needed:** ✅ Accept this change (both models agree)

---

## ⚠️ HIGH PRIORITY ISSUES — Address by Month 3

### 7. Define "In Package" vs. "Available on Request" (ChatGPT Flagged)

**The problem:**
- Enterprise legal teams will ask: "Can you provide the tool receipts? Tool ToS snapshots? Model version evidence?"
- If you say yes to first buyer but no to second buyer, you create inconsistent precedent

**The fix:**

**Create two-tier documentation system:**

**Tier A — Included in Rights Package (every deal):**
1. Tool Provenance Log (summary: tool names, versions, dates)
2. Model Disclosure (model names, training cutoff dates)
3. Safe Lane Sign-Off (review date, tier, reviewer name)
4. Commercial Use Authorization (confirmation receipts filed)
5. Modification Rights Status
6. Category Conflict Log
7. Territory Log
8. Regeneration Rights Status
9. Version History

**Tier B — Available Upon Request (enterprise add-on):**
1. Tool plan receipts (PDFs)
2. Tool ToS snapshots (PDFs from production date)
3. Model training data disclosures (links to provider docs)
4. Filmmaker declaration (full submission form)
5. Safe Lane review notes (internal QA checklist)

**Pricing:**
- Tier 1 Standard: Tier A included
- Tier 1 + Compliance Add-On: Tier A + Tier B (+$500)
- Tier 2 Custom: Tier A + Tier B included

**Impact:** Medium. Prevents scope creep ("just one more doc") from eating your time.

**Decision needed:**
❓ **Accept this two-tier model?** (See Discussion Question #3 below)

---

### 8. Tier 2 Approval Workflow Missing (ChatGPT Flagged)

**The problem:**
- Tier 2 = custom AI regeneration. What happens when:
  - Brand wants revisions after seeing placement?
  - Filmmaker is unavailable?
  - Regenerated scene introduces new IP/brand safety issue?

**The fix:**

**Add to DELIVERY-PROCESS.md (Tier 2 section):**

```
Tier 2 Custom Placement — Approval Workflow

1. Mockup/Concept Approval (before regeneration)
   - SI8 sends storyboard/reference frames
   - Buyer has 3 business days to approve or request changes
   - 1 concept revision included

2. Regeneration Production (filmmaker commissioned)
   - Filmmaker regenerates scenes per approved concept
   - 5-7 business days turnaround

3. Draft Review (first regenerated version)
   - SI8 runs Safe Lane QA on regenerated content
   - Sends draft to buyer for review
   - Buyer has 5 business days to approve or request changes

4. Revisions (if needed)
   - 2 revision rounds included in base price
   - Each round: 3-5 business days
   - Additional revisions: +$2,000 per round

5. Final Approval & Delivery
   - Buyer signs off on final version
   - SI8 generates Rights Package v2.0
   - Delivery within 24 hours of final approval
   - 50% deposit (concept approval), 50% final payment (delivery)
```

**Impact:** High. Without this, first Tier 2 deal will have scope creep and timeline chaos.

**Decision needed:** ✅ Accept this workflow (ChatGPT flagged as critical)

---

### 9. Category Exclusivity Taxonomy Needed (ChatGPT Flagged)

**The problem:**
- "Category-exclusive" sounds clean until:
  - "Food delivery brand" vs. "restaurant brand" — conflict?
  - "Telco" vs. "device manufacturer" — conflict?
  - "Bank" vs. "fintech" — conflict?

**The fix:**

**Create Category Taxonomy v0.1 (living document):**

| Tier 1 Category | Examples | Conflicts With |
|----------------|----------|----------------|
| QSR (Quick Service Restaurant) | McDonald's, KFC | Fast casual, food delivery platforms |
| Fast Casual | Chipotle, Sweetgreen | QSR |
| Food Delivery | Uber Eats, DoorDash | QSR, fast casual, grocery delivery |
| Telco (Mobile Carrier) | T-Mobile, Verizon | MVNOs, device manufacturers |
| Device Manufacturer | Apple, Samsung | Telco (if device-focused campaign) |
| Banking | Chase, HSBC | Fintech, credit cards |
| Fintech | PayPal, Stripe | Banking, credit cards |
| Auto (Manufacturer) | Toyota, Tesla | Auto dealers, ride-sharing |
| Ride-Sharing | Uber, Lyft | Auto manufacturers, auto rental |

**Conflict resolution rule:**
- When in doubt, ask buyer: "Would your brand consider [X] a direct competitor?"
- If yes → conflict → decline or charge premium for non-exclusive

**Impact:** Medium. Needed before first Tier 2 exclusive deal.

**Decision needed:**
❓ **Start this taxonomy now, or wait until first conflict arises?** (See Discussion Question #4 below)

---

### 10. Platform Takedown Response Kit (Gemini Flagged)

**The problem:**
- YouTube/TikTok/Instagram auto-flags AI content
- Buyer panics, emails SI8: "Our video got taken down, help!"
- Without a standard response, you scramble

**The fix:**

**Create "Emergency Dispute Kit" (template buyer can use):**

```
Subject: Content ID Dispute — Licensed AI Video with Rights Package

To: [Platform] Content Review Team

Our video [Title / URL] was flagged by your automated system. This is
AI-generated content properly licensed through SuperImmersive 8, a
rights-vetting agency.

Attached:
1. Rights Package (PDF) — documents tool provenance, Safe Lane review
2. Invoice (PDF) — proof of commercial license
3. License Agreement (PDF) — confirms authorized use

This content was created using [Tool Names] with paid commercial plans.
No copyrighted materials, unauthorized likenesses, or third-party IP
were used. Full provenance documentation is available upon request.

Please review and reinstate this content.

Contact: jd@superimmersive8.com for verification.
```

**Delivery:** Include in every Tier 1 & Tier 2 package as separate PDF: `Platform-Dispute-Template.pdf`

**Impact:** Low frequency, but high stress when it happens. Prevents 2am panic emails.

**Decision needed:** ✅ Accept this addition (low effort, high value)

---

## 📋 MEDIUM PRIORITY ISSUES — Address by Month 6

### 11. E&O Insurance Investigation (Gemini Flagged)

**The problem:**
- Gemini: "Because you are selling a 'Vetting Certification' (The Rights Package), you are technically providing a professional advisory service."
- You should investigate E&O (Errors & Omissions) insurance before first $50K Tier 2 deal

**The fix:**

**Month 3-6 action items:**
1. Research E&O insurance providers (media liability, tech E&O)
2. Get quotes for small agency scale ($1M-$2M coverage)
3. Determine if absence of E&O creates sales friction with enterprise buyers
4. Budget: ~$2K-$5K/year estimated

**Not a Year 1 blocker**, but flag for investigation.

**Decision needed:**
❓ **Investigate now or wait until first enterprise buyer asks?** (See Discussion Question #5 below)

---

### 12. License Scope Amendments (ChatGPT Flagged)

**The problem:**
- Buyer licenses Tier 1 for "APAC only" → 6 months later wants "Global"
- Buyer licenses for "Social media only" → wants to add "Broadcast/OTT"
- Current SOP has no amendment workflow

**The fix:**

**Add to DELIVERY-PROCESS.md:**

```
License Scope Amendments

When buyer requests expansion of existing license:

1. Verify original license (catalog ID, scope, purchase date)
2. Calculate amendment fee:
   - Territory expansion: 50% of price delta
   - Media expansion: 75% of price delta
   - Term extension (12mo → perpetual): 100% of original price
3. Create Amendment Agreement (references original license)
4. Buyer pays amendment fee
5. SI8 issues Rights Package v1.1 (updated Territory/Media fields)
6. Both versions retained in account (v1.0 + v1.1)
```

**Impact:** Medium. Likely to happen 2-3 times in Year 1.

**Decision needed:** ✅ Accept this workflow (ChatGPT flagged)

---

### 13. Takedown/Dispute SOP (ChatGPT Flagged)

**The problem:**
- If someone claims infringement (filmmaker lied, tool training data lawsuit, etc.), what happens in first 24 hours?

**The fix:**

**Create "Infringement Claim Response SOP":**

```
If SI8 receives infringement claim:

Hour 0-2:
  - Log claim in Claims Register (Google Sheet)
  - Notify buyer via email: "We received a claim, investigating"
  - Do NOT revoke license immediately (contractual obligation)

Hour 2-24:
  - Review original Safe Lane submission
  - Contact filmmaker: request response to claim
  - Review tool ToS, model training data disclosures
  - Consult lawyer if claim appears credible

Day 1-7:
  - If claim is frivolous: notify buyer, no action
  - If claim has merit: offer buyer (a) full refund, (b) license remains
    valid but SI8 indemnity removed, (c) voluntary takedown
  - Notify all other buyers who licensed same asset

Never: Unilaterally revoke license without buyer consent (breach of contract)
```

**Impact:** Low frequency, but catastrophic if handled wrong.

**Decision needed:** ✅ Accept this SOP (ChatGPT flagged as important)

---

### 14. Google Workspace vs. Google Drive (Gemini Flagged)

**The problem:**
- Current plan: Google Drive free/paid tiers
- Gemini: "Use Google Workspace Business Standard ($12/user/month for 2TB). Enterprise-grade, built-in access logging, native link-sharing."

**The trade-off:**

| Option | Cost | Capacity | Features |
|--------|------|----------|----------|
| **Google Drive** (current plan) | $24/year (100GB) | Limited | Basic sharing, no access logs |
| **Google Workspace Business** | $144/year (2TB) | 20x larger | Access logs, shared drives, enterprise admin controls |

**Gemini's argument:** "Don't touch AWS until Year 3 platform. Workspace is enough through Year 2."

**Impact:** Low. $120/year difference is negligible. Workspace gives better security + access logs.

**Decision needed:**
❓ **Upgrade to Workspace now, or stick with Drive until capacity exceeded?** (See Discussion Question #6 below)

---

## ✅ WHAT BOTH MODELS AGREED ON

### Strong Consensus (Implement Immediately)

1. ✅ **Year 1 manual process is correct** — Don't automate until it breaks
2. ✅ **Remove "Getty doesn't provide" from delivery email** — Sounds defensive
3. ✅ **Stop using "certification" language** — Legal liability risk
4. ✅ **Define Agency vs. End-Client licensing** — Prevent scope creep
5. ✅ **Year 2 automation = no-code tools (Zapier/Make)** — Skip custom Vercel functions until Year 3
6. ✅ **Biggest risk = exception creep** — Bespoke terms kill your time budget
7. ✅ **Refund policy needs Certificate of Destruction** — Can't verify "unused"

### Strong Consensus (Validate After First Deal)

8. ✅ **Track support requests, not just deal count** — Real bottleneck is buyer questions, not delivery volume
9. ✅ **Add disclaimer to every Rights Package** — "Not legal advice, not a warranty"
10. ✅ **Tier 2 needs revision cap + approval workflow** — Prevent infinite iteration

---

## ❓ WHERE THEY DISAGREED (Need Your Decision)

| Issue | ChatGPT | Gemini | Implication |
|-------|---------|--------|-------------|
| **Storage security** | Public links are risky; use email-specific sharing | Didn't flag as major issue | ChatGPT = more cautious |
| **Year 1.5 automation** | Light automation (Zapier) is fine when support load increases | Skip automation entirely until Year 3 | ChatGPT = incremental; Gemini = binary |
| **E&O insurance timing** | Future investigation | Get before first $50K Tier 2 deal | Gemini = more risk-averse |
| **Storage migration** | AWS S3 in Year 2 when you need programmatic access | Google Workspace through Year 2, AWS only for Year 3 platform | Gemini = simpler/cheaper |

---

## 🎯 NEXT STEPS — Implementation Priority

### 🔴 Before First Deal (This Week)

1. ✅ Change all "certification" language to "review sign-off"
2. ✅ Revise email template (remove Getty comparison, add disclaimer)
3. ✅ Add Agency/End-Client field to checkout + Rights Package template
4. ✅ Decide refund policy (Certificate of Destruction or no refunds?)
5. ✅ Decide storage sharing method (public links or email-specific?)
6. ✅ Create Platform Takedown Response Kit template

### ⚠️ Before First Tier 2 Deal (Month 2-3)

7. ✅ Document Tier 2 approval workflow (concept → draft → revisions → final)
8. ✅ Create two-tier documentation system ("in package" vs. "on request")
9. ✅ Start Category Exclusivity Taxonomy
10. ✅ Add License Amendment workflow to SOP

### 📋 Before Month 6

11. ⚠️ Investigate E&O insurance (get quotes, assess need)
12. ⚠️ Create Takedown/Dispute SOP
13. ⚠️ Lawyer review: Master License Agreement, email language, disclaimer
14. ⚠️ Evaluate Google Workspace upgrade vs. staying on Drive

### 📊 After First 3 Deals

15. 📊 Review support request volume (triggers Year 1.5 automation decision)
16. 📊 Document edge cases in EDGE-CASES.md
17. 📊 Iterate SOP v0.1 → v0.2 based on real buyer feedback

---

## 💬 DISCUSSION QUESTIONS FOR JD

These are the decisions you need to make based on peer review feedback. I've structured them to be answerable quickly.

### (See next section for structured decision questions)

---

**Prepared by:** Claude (synthesizing ChatGPT + Gemini feedback)
**Date:** February 21, 2026
**Status:** Ready for JD review and decisions
**Next:** Answer discussion questions → update SOP docs → legal review
