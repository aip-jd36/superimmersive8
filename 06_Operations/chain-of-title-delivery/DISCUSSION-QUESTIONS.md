# Discussion Questions — Chain of Title Delivery SOP

**Based on peer review feedback from ChatGPT & Gemini**
**Date:** February 21, 2026

These are the key decisions you need to make before finalizing the SOP. I've organized them by urgency and provided recommendation + rationale for each.

---

## 🔴 CRITICAL — Decide Before First Deal

### Question 1: Storage Security — Public Links or Email-Specific Sharing?

**Current plan:** Google Drive "Anyone with link can view" (no expiration)

**ChatGPT's concern:** "Non-expiring public links are a security foot-gun. Links get forwarded, cached, leaked."

**Gemini's take:** Didn't flag as major issue (implied: acceptable risk for Year 1)

**Options:**

| Option | How It Works | Pros | Cons |
|--------|-------------|------|------|
| **A: Public links** (current plan) | Share folder → get link → paste in email | ✅ Simple<br>✅ Buyer can download anytime<br>✅ No Google account required | ❌ Link can leak<br>❌ No audit trail |
| **B: Email-specific sharing** | Share folder to buyer@company.com | ✅ More secure<br>✅ Audit trail (who accessed when)<br>✅ Can revoke if needed | ❌ Buyer needs Google account<br>❌ Slightly less convenient |
| **C: Hybrid** | Email-specific for Tier 2, public links for Tier 1 | ✅ Security where it matters<br>✅ Convenience for commodity | ❌ Two different processes |

**My recommendation:** **Option B (email-specific sharing)**

**Rationale:**
- ChatGPT is right: Tier 2 custom placement ($15K-50K) leaking would damage filmmaker relationships
- Most B2B buyers have Google accounts (Gmail or Workspace)
- If buyer doesn't have Google account, they can create one in 2 minutes
- Audit trail is valuable (can see if files were actually downloaded)

**Trade-off:**
- Slightly more friction (buyer must log into Google to download)
- But buyers at $5K-50K price point can handle this

**Decision needed:**

- [ ] **Option A** — Keep public links (simpler, accept leak risk)
- [ ] **Option B** — Email-specific sharing (more secure, slight friction)
- [ ] **Option C** — Hybrid (Tier 2 = secure, Tier 1 = public)

---

### Question 2: Refund Policy — How to Handle "Unused" Verification?

**Current plan:** "Full refund if asset unused and not deployed"

**Both models flagged:** You can't verify "unused" — buyer could have downloaded, used, and still request refund

**Options:**

| Option | How It Works | Pros | Cons |
|--------|-------------|------|------|
| **A: No refunds after delivery** | Refunds only if SI8 can't deliver within 7 days | ✅ Simple<br>✅ Matches Getty model<br>✅ No verification burden | ❌ May reduce buyer confidence<br>❌ Perceived as harsh |
| **B: Certificate of Destruction** | Buyer signs DocuSign confirming deletion of all files | ✅ Legally enforceable<br>✅ More buyer-friendly | ❌ Adds operational step<br>❌ Still honor system (can't prove deletion) |
| **C: Refund window with caveats** | 30-day refund if: (1) Certificate of Destruction signed, (2) No public deployment detected | ✅ Balance of security + trust | ❌ Requires monitoring for deployment<br>❌ Complex to enforce |

**My recommendation:** **Option B (Certificate of Destruction)**

**Rationale:**
- At $5K-50K price points, refund requests will be rare (< 1% based on stock licensing norms)
- Having a policy is more important than the policy being perfect
- Certificate of Destruction is legally sound (even if unenforceable in practice, it deters bad actors)
- Adds only ~5 minutes of work (send DocuSign template, wait for signature, process Stripe refund)

**Template language:**
```
Refund Policy

Refunds are available within 30 days of purchase if:
1. The asset has not been deployed publicly (websites, social media, broadcast, etc.)
2. Buyer signs a Certificate of Destruction confirming all copies have been deleted
3. Download access will be revoked upon refund processing

Refunds are processed within 5-10 business days to original payment method.
```

**Decision needed:**

- [ ] **Option A** — No refunds after delivery (simplest, like Getty)
- [ ] **Option B** — Certificate of Destruction required (balanced)
- [ ] **Option C** — Refund with deployment monitoring (complex)

---

### Question 3: Documentation Scope — "In Package" vs. "Available on Request"?

**ChatGPT's concern:** Enterprise legal teams will ask for tool receipts, ToS snapshots, etc. If you provide for one buyer but not another, you create inconsistent precedent.

**Options:**

| Option | What's Included in Base Chain of Title | What Costs Extra |
|--------|----------------------------------------|------------------|
| **A: Everything included** | 9 fields PLUS tool receipts, ToS PDFs, model docs, filmmaker submission | Nothing |
| **B: Two-tier system** (ChatGPT's suggestion) | 9 fields (summary documentation) | Compliance Add-On (+$500): receipts, ToS PDFs, full submission |
| **C: Everything on request** | 9 fields only | Additional docs provided free upon request (case-by-case) |

**My recommendation:** **Option B (Two-tier system)**

**Rationale:**
- Most buyers won't ask for receipts/ToS (they trust the Chain of Title summary)
- Enterprise buyers with strict compliance will pay $500 for full audit trail
- Creates upsell opportunity (Tier 1 Standard = $8K, Tier 1 + Compliance = $8.5K)
- Prevents scope creep ("just one more doc" requests)

**Pricing:**
- **Tier 1 Standard:** Chain of Title (9 fields) included
- **Tier 1 + Compliance Add-On:** +$500 for full documentation package
- **Tier 2 Custom:** Compliance package included (built into premium pricing)

**What's in Compliance Add-On:**
1. Tool plan receipts (PDFs)
2. Tool ToS snapshots (archived from production date)
3. Model training data disclosure links (from tool providers)
4. Filmmaker production brief (full 10-section submission)
5. Rights Verified review checklist (internal QA notes)

**Decision needed:**

- [ ] **Option A** — Everything included (no upsell, prevents all scope questions)
- [ ] **Option B** — Two-tier system (upsell opportunity, clear boundaries)
- [ ] **Option C** — Everything on request (flexible, but inconsistent)

---

### Question 4: Year 1.5 Automation — Zapier Now or Wait?

**ChatGPT's suggestion:** Add "Year 1.5" light automation when support load increases (Zapier: Stripe → Gmail → Drive → Sheet)

**Gemini's suggestion:** Skip automation entirely until Year 3 platform. Manual is fine for 100 deals.

**Options:**

| Option | When to Automate | How |
|--------|------------------|-----|
| **A: Year 1.5 (ChatGPT)** | When support requests > 5/month OR delivery time > 1 hour/week | Zapier/Make: Stripe webhook → create Drive folder → send email → log Sheet |
| **B: Year 2 only (middle ground)** | After 20-30 deals, manual process becomes painful | Same as Option A, but wait longer |
| **C: Year 3 only (Gemini)** | Only when building self-serve platform | Skip no-code tools, go straight to Next.js platform |

**My recommendation:** **Option B (Year 2, or when manual work exceeds 2 hours/week)**

**Rationale:**
- Gemini is right: manual delivery takes 3-5 minutes per deal. At 20 deals/year = 1 hour total. Not worth automating.
- But ChatGPT is also right: support requests (re-downloads, questions, amendments) add up
- Trigger should be **time burden**, not deal count
- Zapier/Make takes 1-2 hours to set up. Only worth it when it saves >2 hours/month.

**Automation trigger (revised):**
> Implement Year 1.5 automation when ANY of these conditions met:
> - Support/delivery work exceeds 2 hours/week (averaged over 4 weeks)
> - Re-download requests > 3/month
> - You're spending more time on delivery admin than sales calls

**Decision needed:**

- [ ] **Option A** — Build Zapier flow now (proactive)
- [ ] **Option B** — Wait for manual pain to justify automation (reactive)
- [ ] **Option C** — Skip no-code tools, wait for Year 3 platform (Gemini's approach)

---

## ⚠️ HIGH PRIORITY — Decide Before First Tier 2 Deal

### Question 5: Category Exclusivity Taxonomy — Build Now or Wait?

**ChatGPT's concern:** "Category-exclusive" is ambiguous. Is "food delivery" a conflict with "QSR"? Is "telco" a conflict with "device manufacturer"?

**Options:**

| Option | When to Build | Scope |
|--------|--------------|-------|
| **A: Build taxonomy now** | Before first Tier 2 pitch | Define 20-30 common categories + conflict rules |
| **B: Build as you go** | After first category conflict arises | Start with minimal list, expand iteratively |
| **C: Case-by-case** | Never formalize | Ask buyer "Would you consider X a competitor?" for each deal |

**My recommendation:** **Option B (Build as you go)**

**Rationale:**
- You don't have any Tier 2 deals yet — premature to define 30 categories
- First 3-5 Tier 2 deals will reveal which categories buyers actually care about
- Start simple:
  - Month 1: List the 5 categories you expect (QSR, telco, auto, banking, CPG)
  - Month 3: Expand based on actual deal conflicts
- Document each precedent in DECISIONS.md → builds taxonomy organically

**Starter taxonomy (5 categories, expand later):**
1. **QSR / Fast Food** — Conflicts with: fast casual, food delivery
2. **Telco (Mobile Carrier)** — Conflicts with: MVNOs, device manufacturers (case-by-case)
3. **Automotive** — Conflicts with: auto dealers, ride-sharing
4. **Banking / Financial Services** — Conflicts with: fintech, credit cards
5. **CPG (Consumer Packaged Goods)** — Sub-categories by product type (beverage, snacks, etc.)

**Conflict resolution rule:**
> When in doubt, ask buyer: "Would your brand consider [X competitor name] a direct competitor for this campaign?" If yes → conflict.

**Decision needed:**

- [ ] **Option A** — Build full taxonomy now (30+ categories)
- [ ] **Option B** — Start with 5 categories, expand as needed
- [ ] **Option C** — Case-by-case, no formal taxonomy

---

### Question 6: E&O Insurance — Investigate Now or Later?

**Gemini's concern:** "You're selling a vetting certification = professional advisory service. Get E&O before first $50K Tier 2 deal."

**ChatGPT's take:** Future investigation, not Year 1 blocker.

**Options:**

| Option | Timeline | Action |
|--------|----------|--------|
| **A: Investigate now** | Month 1-2 | Get quotes, understand coverage options, budget for Year 1 |
| **B: Investigate before first Tier 2** | Month 2-3 | Research only if/when Tier 2 deal materializes |
| **C: Wait until buyer asks** | Month 6+ | Reactive — only investigate if enterprise buyer requires it |

**My recommendation:** **Option B (Investigate before first Tier 2 deal)**

**Rationale:**
- Tier 1 catalog licensing = low risk (buyer licenses as-is, Chain of Title is documentation not warranty)
- Tier 2 custom placement = higher risk (SI8 is commissioning regeneration, more involvement)
- E&O insurance = $2K-$5K/year estimated (not trivial for pre-revenue startup)
- Don't buy insurance you don't need yet, but understand options before first $50K deal

**Action items (when first Tier 2 deal is being negotiated):**
1. Research providers: Hiscox, Chubb, Hartford (media E&O)
2. Get quotes: $1M-$2M coverage
3. Understand exclusions: Does it cover AI-specific claims?
4. Decide: Is absence of E&O a deal-blocker for this buyer?

**If buyer requires E&O:**
- Pass cost to buyer: "Tier 2 deals require E&O insurance. Premium is $3K/year, prorated to deal value. This Tier 2 deal will include +$500 E&O fee."

**Decision needed:**

- [ ] **Option A** — Investigate now (get quotes this month)
- [ ] **Option B** — Investigate when first Tier 2 deal is live (Month 2-3)
- [ ] **Option C** — Wait until buyer explicitly requires it

---

## 📋 MEDIUM PRIORITY — Decide by Month 3

### Question 7: Google Workspace Upgrade — Now or When Drive is Full?

**Gemini's suggestion:** "Use Google Workspace Business Standard ($12/mo for 2TB). Enterprise-grade, access logging, shared drives."

**Current plan:** Google Drive 100GB ($2/mo), upgrade when full

**Options:**

| Option | Cost | When to Upgrade | Benefits |
|--------|------|----------------|----------|
| **A: Upgrade to Workspace now** | $144/year (2TB) | Immediately | Access logs, admin controls, 20x capacity |
| **B: Stay on Drive, upgrade at 100GB** | $24/year → $30/year (200GB) | When catalog exceeds 100GB (~20 entries) | Cheaper, simpler |
| **C: Stay on Drive through Year 2** | $24-120/year (scale as needed) | Only upgrade to Workspace if enterprise buyer requires it | Cheapest |

**My recommendation:** **Option C (Stay on Drive, upgrade only if needed)**

**Rationale:**
- $120/year difference ($24 vs $144) is negligible
- But Workspace adds admin overhead (user management, permission groups, etc.)
- Current scale (0-20 deals Year 1) doesn't justify enterprise tools
- **Trigger:** Upgrade to Workspace when:
  - Catalog exceeds 500GB (Drive plans max out at 2TB for $10/mo)
  - Enterprise buyer requests audit logs / admin controls
  - Building Year 3 platform (need Shared Drives for team access)

**Cost comparison (Year 1-2):**

| Scenario | Drive Cost | Workspace Cost | Savings |
|----------|-----------|---------------|---------|
| 10 deals (50GB) | $24/year | $144/year | $120 |
| 20 deals (100GB) | $24/year | $144/year | $120 |
| 50 deals (250GB) | $30/year (200GB tier) | $144/year | $114 |
| 100 deals (500GB) | $120/year (2TB tier) | $144/year | $24 |

**At 100 deals, Workspace makes sense.** Before that, Drive is cheaper.

**Decision needed:**

- [ ] **Option A** — Upgrade to Workspace now (enterprise-grade from day 1)
- [ ] **Option B** — Upgrade when Drive hits 100GB (~20 deals)
- [ ] **Option C** — Stay on Drive through Year 2, only upgrade for platform (Year 3)

---

## ✅ AUTO-ACCEPT (Both Models Agreed — No Decision Needed)

These changes should be implemented immediately. No trade-offs, both models agreed.

### 1. Language Changes
- ✅ Change "certification" → "review sign-off" everywhere
- ✅ Remove "This is what Getty doesn't provide" from delivery email
- ✅ Add disclaimer to Chain of Title: "Not legal advice, not a warranty"

### 2. Process Additions
- ✅ Add Agency/End-Client licensing fields to checkout + Chain of Title
- ✅ Add Platform Takedown Response Kit template to every delivery
- ✅ Define Tier 2 approval workflow (concept → draft → revisions → final, 2 rounds included)
- ✅ Add License Amendment workflow to SOP (territory/media/term expansions)
- ✅ Create Takedown/Dispute Response SOP (what to do in first 24 hours of infringement claim)

### 3. Strategic Shifts
- ✅ Year 2 automation = Zapier/Make (skip custom Vercel functions until Year 3)
- ✅ Refine trigger: Automate when support load increases, not just deal count
- ✅ Biggest operational risk = exception creep (bespoke terms, delivery variants) — guard against this

---

## 📊 DECISION SUMMARY TEMPLATE

**Copy this section, fill in your decisions, and I'll update all SOP docs accordingly.**

```
DECISION SUMMARY — Chain of Title Delivery SOP v0.2

Date: ___________
Decided by: JD

CRITICAL DECISIONS (Before First Deal):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Q1: Storage Security
  ☐ Option A (Public links — simpler, accept leak risk)
  ☐ Option B (Email-specific sharing — more secure)
  ☐ Option C (Hybrid — Tier 2 secure, Tier 1 public)

Q2: Refund Policy
  ☐ Option A (No refunds after delivery)
  ☐ Option B (Certificate of Destruction required)
  ☐ Option C (Refund with deployment monitoring)

Q3: Documentation Scope
  ☐ Option A (Everything included in base package)
  ☐ Option B (Two-tier: base + $500 compliance add-on)
  ☐ Option C (Everything on request, case-by-case)

Q4: Year 1.5 Automation
  ☐ Option A (Build Zapier flow now)
  ☐ Option B (Wait for manual pain, then automate)
  ☐ Option C (Skip no-code, wait for Year 3 platform)

HIGH PRIORITY DECISIONS (Before First Tier 2):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Q5: Category Exclusivity Taxonomy
  ☐ Option A (Build full taxonomy now, 30+ categories)
  ☐ Option B (Start with 5, expand as conflicts arise)
  ☐ Option C (Case-by-case, no formal taxonomy)

Q6: E&O Insurance
  ☐ Option A (Investigate now, get quotes Month 1-2)
  ☐ Option B (Investigate when Tier 2 deal is live)
  ☐ Option C (Wait until buyer explicitly requires it)

MEDIUM PRIORITY DECISIONS (By Month 3):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Q7: Google Workspace Upgrade
  ☐ Option A (Upgrade now — enterprise-grade day 1)
  ☐ Option B (Upgrade at 100GB / ~20 deals)
  ☐ Option C (Stay on Drive through Year 2)

ADDITIONAL NOTES / CUSTOM DECISIONS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[Add any other decisions or modifications you want]
```

---

## 🎯 NEXT STEPS AFTER YOU DECIDE

Once you've filled out the Decision Summary:

1. **I'll update all SOP docs** (README, DELIVERY-PROCESS, EMAIL-TEMPLATES, STORAGE-RETENTION, DECISIONS.md)
2. **Create v0.2 commit** with all changes based on peer review + your decisions
3. **Flag items for legal review** (Master Agreement, disclaimer language, refund policy)
4. **Update execution plan** (Month 1-3 priorities based on critical decisions)

**Estimated time to implement changes:** 2-3 hours (document updates + template revisions)

---

**Prepared by:** Claude
**Date:** February 21, 2026
**Status:** Ready for JD decisions
**Format:** Fill out Decision Summary → I'll execute changes
