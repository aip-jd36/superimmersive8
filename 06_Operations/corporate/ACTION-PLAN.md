# Corporate Structure — Action Plan

**Status:** Approved for execution (February 23, 2026)
**Owner:** JD
**Timeline:** Week 1-3 (Feb 24 - Mar 14, 2026)

---

## Decisions Finalized

✅ **Q1:** Assume US entity acceptable for MyVideo (don't delay to ask)
✅ **Q2:** File Texas DBA this week
✅ **Q3:** CPA validates current structure (no additional consultation needed)

**Strategy confirmed:** PMF Strategy Inc. d/b/a SuperImmersive 8 = default for ALL contracts

---

## Week 1: File DBA (Feb 24-28, 2026)

### Action 1.1: File Texas DBA ⭐ PRIORITY

**Task:** File Form 503 with Texas Secretary of State

**Process:**
1. Go to: https://direct.sos.state.tx.us/
2. Select: "File an Assumed Name for a For-Profit or Professional Corporation"
3. Enter:
   - Corporation: PMF Strategy Inc.
   - Assumed Name: SuperImmersive 8
   - Business Address: [Your Texas registered address]
4. Pay: $25 (+ 2.7% processing fee = ~$25.68 total)
5. Submit

**Reference:** `DBA-FILING-GUIDE.md` for step-by-step instructions

**Expected outcome:** Confirmation email immediately, Certificate of Assumed Name PDF in 1-3 business days

**Completion criteria:**
- [ ] Form 503 submitted
- [ ] Confirmation email received
- [ ] Certificate PDF received and saved to `06_Operations/corporate/filed-documents/dba-certificate-2026.pdf`

---

### Action 1.2: Update DECISIONS.md with Filing Details

**After DBA is filed:**

Update `DECISIONS.md` with:
- Filing date
- File number (from certificate)
- Certificate location

**Template:**
```
Filing Date: [Date]
File Number: [From Texas SOS]
Certificate Location: 06_Operations/corporate/filed-documents/dba-certificate-2026.pdf
Status: Active
```

---

## Week 2: Update Contract Templates (Mar 3-7, 2026)

### Action 2.1: Update Master License Agreement

**File location:** `06_Operations/legal/contracts/` (to be created if doesn't exist)

**Update signature block to:**

```
AGREEMENT

This License Agreement is entered into by and between:

PMF Strategy Inc., a Texas corporation, doing business as SuperImmersive 8 ("SI8"),
with principal offices at [Address],

and

[Buyer Legal Name], a [jurisdiction] [entity type] ("Buyer"),
with principal offices at [Address].
```

**Then use "SI8" throughout the rest of the contract.**

**Completion criteria:**
- [ ] Signature block updated
- [ ] Template tested (review for formatting)
- [ ] Saved as master template

---

### Action 2.2: Update Filmmaker Shopping Agreement

**File location:** `06_Operations/legal/filmmaker-agreement/` (already exists)

**Update signature block with same format:**

```
This Shopping Agreement is entered into by and between:

PMF Strategy Inc., a Texas corporation, doing business as SuperImmersive 8 ("SI8"),
with principal offices at [Address],

and

[Filmmaker Legal Name] ("Filmmaker"),
with principal address at [Address].
```

**Completion criteria:**
- [ ] Signature block updated in WORKING.md
- [ ] Template ready for lawyer review
- [ ] Consistent with Master License Agreement format

---

### Action 2.3: Update Invoice Template

**Create invoice template with:**

**Header:** SuperImmersive 8 branding/logo

**Legal Entity Section:**
```
From:     PMF Strategy Inc.
          d/b/a SuperImmersive 8
          [Address]
          EIN: [Your PMF Strategy EIN]

To:       [Buyer Name]
          [Address]

Invoice #: SI8-INV-2026-001
Date:      [Date]
Due Date:  [Date]
```

**Completion criteria:**
- [ ] Template created (can be simple spreadsheet or PDF template)
- [ ] Legal entity formatting matches DBA structure
- [ ] EIN included
- [ ] Tested with sample data

---

### Action 2.4: Update Rights Verified Package Footer/Signature

**Files to update:**
- `06_Operations/rights-verified/CHAIN-OF-TITLE-SCHEMA.md`
- `05_Catalog/_examples/TEMPLATE.md`

**Footer (every page):**
```
SuperImmersive 8
PMF Strategy Inc. d/b/a SuperImmersive 8
Austin, TX • Taipei, Taiwan
www.superimmersive8.com
```

**Signature Block (final page):**
```
RIGHTS VERIFIED SIGN-OFF

This Chain of Title has been reviewed and verified by:

PMF Strategy Inc., doing business as SuperImmersive 8
Reviewer: [Your Name], Founder & Rights Manager
Date: [Date]

Entity Details:
PMF Strategy Inc. (Texas S-Corporation, 2022)
EIN: [Your EIN]
```

**Completion criteria:**
- [ ] Template footer updated
- [ ] Signature block updated
- [ ] Example 001 (Neon Dreams) updated as reference

---

## Week 3: Website + Final Documentation (Mar 10-14, 2026)

### Action 3.1: Update Website Footer

**File:** `07_Website/index.html` (and all other .html files)

**Current footer:** (check what's there now)

**Update to:**
```html
<div class="footer-bottom">
    <p>&copy; 2026 PMF Strategy Inc. d/b/a SuperImmersive 8. All rights reserved.</p>
</div>
```

**Files to update:**
- index.html (EN)
- index-zh.html (ZH-TW)
- pricing.html
- pricing-zh.html
- risk-briefing.html
- All Rights Verified pages (5 files)

**Completion criteria:**
- [ ] All HTML files updated
- [ ] Tested on desktop + mobile
- [ ] Deployed to production (Bluehost)

---

### Action 3.2: Create Intercompany Agreement Template (Optional)

**Only create if:**
- MyVideo specifically requires Taiwan entity
- Or proactively want framework ready

**If creating:**

**File location:** `06_Operations/corporate/INTERCOMPANY-AGREEMENT-TEMPLATE.md`

**Template structure:**
```
INTERCOMPANY RESELLER & SERVICES AGREEMENT

Between:  PMF Strategy Inc. (Principal)
And:      沉浸科技顧問有限公司 (Agent/Reseller)

Purpose:  Taiwan LLC acts as authorized local distributor
          for SuperImmersive 8 catalog in Taiwan market

Key Terms:
- Principal retains all IP ownership
- Agent earns [X%] commission on Taiwan sales
- Agent invoices Taiwan buyers, remits to Principal
- Transfer pricing documented for tax compliance
```

**Completion criteria:**
- [ ] Template drafted
- [ ] Flagged for lawyer review when needed
- [ ] Ready to activate if Taiwan buyer requires it

**Recommendation:** Wait until a Taiwan buyer specifically needs it (don't over-engineer).

---

### Action 3.3: Update Internal Documentation

**Files to update:**

1. **CLAUDE.md** — Update "Execution Gaps" section:
   - [x] Legal Ops: DBA filed ✓
   - [x] Contract templates updated ✓

2. **README.md** (project root) — Note entity structure if mentioned

**Completion criteria:**
- [ ] CLAUDE.md gaps list updated
- [ ] Any references to entity structure are current

---

## Week 4+: Operational Readiness

### Action 4.1: Bank Account Verification

**Verify:**
- PMF Strategy Inc. business bank account is active
- Account name matches: "PMF Strategy Inc."
- Can accept international wires (for filmmaker payouts)
- Confirm routing/SWIFT for wire instructions

**Add to invoice template:**
```
Wire Transfer Instructions:
Account Name: PMF Strategy Inc.
Bank: [Bank Name]
Routing: [Number]
Account: [Number]
SWIFT: [Code] (for international)
```

**Completion criteria:**
- [ ] Bank account verified
- [ ] Wire instructions documented
- [ ] Added to invoice template

---

### Action 4.2: First Contract Execution Test

**When ready to sign first filmmaker or buyer:**

**Pre-flight checklist:**
- [ ] DBA filed and certificate received
- [ ] Contract template uses proper signature block
- [ ] Invoice template ready
- [ ] Rights Verified Package template updated
- [ ] Bank wire instructions documented

**Test execution:**
1. Use updated contract template
2. Both parties sign (DocuSign or wet signature)
3. Issue invoice with proper entity formatting
4. Verify payment routing works

**Completion criteria:**
- [ ] First contract signed using new format
- [ ] No entity-related questions or friction from counterparty
- [ ] Payment processes successfully

---

## Success Criteria (End of Week 3)

**✅ Legal Structure Operational:**
- [ ] DBA filed and active
- [ ] Certificate saved in corporate/filed-documents/

**✅ Templates Updated:**
- [ ] Master License Agreement
- [ ] Filmmaker Shopping Agreement
- [ ] Invoice Template
- [ ] Rights Verified Package

**✅ Public Materials Updated:**
- [ ] Website footer (all pages)
- [ ] Bilingual (EN + ZH-TW)

**✅ Documentation Current:**
- [ ] DECISIONS.md reflects DBA filing
- [ ] CLAUDE.md gaps list updated
- [ ] All templates reference PMF Strategy d/b/a SI8

**✅ Ready for Business:**
- [ ] Can sign filmmaker agreements
- [ ] Can sign licensing deals
- [ ] Can issue invoices
- [ ] Can receive payments
- [ ] Rights Verified Packages use proper entity

---

## If MyVideo Requires Taiwan Entity Later

**Activation checklist:**

1. **Draft Intercompany Agreement** (1-2 days)
   - See template in Action 3.2
   - Define commission/service fee (e.g., 10-15%)
   - Get lawyer review

2. **Execute Intercompany Agreement** (1 day)
   - Sign between PMF Strategy and Taiwan LLC

3. **Create Taiwan-Specific Contract Template** (1 day)
   - Same format as US template
   - But entity is: 沉浸科技顧問有限公司 (operating as SuperImmersive 8)
   - Governed by Taiwan law

4. **MyVideo Deal Flow:**
   - Taiwan LLC signs deal with MyVideo
   - Taiwan LLC issues FaPiao (Taiwan invoice)
   - MyVideo pays Taiwan LLC in NTD
   - Taiwan LLC remits to PMF Strategy (minus commission)
   - PMF Strategy pays filmmaker royalty

**Timeline:** 3-5 days to activate if needed

**Cost:** Minimal (lawyer review of intercompany agreement ~$500-1,000)

---

## Timeline Summary

| Week | Focus | Key Deliverables |
|------|-------|------------------|
| **Week 1** (Feb 24-28) | File DBA | DBA certificate received |
| **Week 2** (Mar 3-7) | Update contracts | 4 templates updated |
| **Week 3** (Mar 10-14) | Website + docs | Website footer updated, all docs current |
| **Week 4+** | Operational readiness | Bank verified, first contract test |

---

## Next Checkpoint

**August 2026 (6-month review):**

Evaluate entity structure based on:
1. Revenue by geography (Taiwan % vs SEA % vs other)
2. Entity friction log (any buyer procurement issues?)
3. Taiwan LLC usage (how many deals required Taiwan entity?)
4. Filmmaker feedback (any entity-related friction?)
5. Tax complexity (CPA feedback on filing burden)

**Decision:** Continue DBA, or form standalone SI8 LLC/Inc.?

---

**Document Status:** Approved for execution
**Last Updated:** February 23, 2026
**Owner:** JD
