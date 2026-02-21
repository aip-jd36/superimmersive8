# Chain of Title Delivery — SOP Documentation

## What This Project Is

This project documents **how SI8 delivers rights documentation to buyers** when they license AI video content from our catalog. It defines the operational process for fulfilling orders, delivering legal documentation, and maintaining records for compliance and legal defense.

This is not about creating the Chain of Title documentation itself (that's documented in `06_Operations/rights-verified/`). This is about **how we get it to the customer** and **how we store it for the long term**.

---

## Why This Matters

**The Chain of Title is the product. The video file is just the carrier.**

Based on the Getty Images model: buyers pay $450 for the legal guarantee, $50 for the JPEG. SI8's differentiation is providing documented defensibility that Getty doesn't offer for photography. Our delivery system must treat the Chain of Title & Compliance Log as the primary deliverable, not an afterthought.

**Legal compliance:** Stock photo agencies maintain license records indefinitely. SI8 must do the same. If a buyer faces legal review 3 years after purchase, they need to retrieve their documentation. Our SOP must guarantee this.

---

## Terminology: Industry-Familiar Language

**Key decision (v0.2):** We use stock-agency familiar terminology to reduce buyer friction.

| Internal Name | Buyer-Facing Name | Why |
|---------------|-------------------|-----|
| Chain of Title | **Chain of Title & Compliance Log** | Film/TV buyers already know "Chain of Title" = legal provenance |
| Rights Verified Sign-Off | **Chain of Title Verification** | Familiar legal audit terminology |
| Catalog ID | **Asset ID** (buyer-facing) | Stock agencies use "Asset ID" |
| Transaction | **Order** (with Order ID) | Familiar e-commerce language |

**What we deliver:**
- Video file (MP4)
- **Chain of Title & Compliance Log** (PDF, 9-field documentation)
- **License Summary** (1-page quick reference)
- Invoice
- Master License Agreement (standard terms)

---

## Relationship to Other SI8 Projects

| Project | What | Relationship to This Project |
|---------|------|------------------------------|
| **Rights Verified Verification** (`06_Operations/rights-verified/`) | HOW SI8 vets content before it enters catalog | Creates the Chain of Title documentation that this project delivers |
| **Rights Playbook** (`06_Operations/legal/rights-playbook/`) | WHY SI8's process is legally sound | Legal foundation that Chain of Title documents |
| **Filmmaker Agreement** (`06_Operations/legal/filmmaker-agreement/`) | How SI8 acquires rights from creators | Upstream relationship; affects modification rights in Chain of Title |
| **This Project** | HOW SI8 delivers documentation to buyers + stores records | Downstream fulfillment after Rights Verified vetting |

---

## How These Documents Fit Together

```
Buyer licenses content
         ↓
┌────────────────────────────────────────┐
│ DELIVERY-PROCESS.md                    │ ← Step-by-step purchase → delivery flow
│ (What happens when buyer clicks "Buy") │
└────────────────────────────────────────┘
         ↓
┌────────────────────────────────────────┐
│ EMAIL-TEMPLATES.md                     │ ← Automated emails sent at each step
│ (Confirmation, download links, support)│
└────────────────────────────────────────┘
         ↓
┌────────────────────────────────────────┐
│ STORAGE-RETENTION.md                   │ ← Where files live, how long, retrieval
│ (Server architecture, backup, archive) │
└────────────────────────────────────────┘
         ↓
┌────────────────────────────────────────┐
│ ACCOUNT-DASHBOARD.md                   │ ← Year 2-3 self-serve platform vision
│ (User portal like Getty's)             │
└────────────────────────────────────────┘
         ↓
┌────────────────────────────────────────┐
│ MASTER-LICENSE-AGREEMENT.md            │ ← Standard terms (one EULA for all)
│ (Lawyer review required before use)    │
└────────────────────────────────────────┘
         ↓
┌────────────────────────────────────────┐
│ LICENSE-SUMMARY-TEMPLATE.md            │ ← 1-page quick reference template
│ (Generated for every order)            │
└────────────────────────────────────────┘
         ↓
┌────────────────────────────────────────┐
│ DECISIONS.md                           │ ← Version log, what changed, why
│ (Decision history, open questions)     │
└────────────────────────────────────────┘
```

---

## Current Version Status

**Version:** v0.2 (Finalized after peer review)
**Date:** February 21, 2026
**Status:** Ready for first deal, pending lawyer review of Master Agreement

**Major changes in v0.2:**
- Terminology updated to match Getty/Shutterstock buyer expectations
- Added License Summary 1-pager (ultra-familiar to procurement teams)
- Added Master License Agreement (one EULA for all purchases)
- Folder structure redesigned to feel like "premium ZIP download"
- Email templates revised to use stock-agency voice
- All 7 peer review decisions implemented

### Phase Roadmap

| Phase | Trigger | Implementation Focus |
|-------|---------|---------------------|
| **v0.2 (now)** | First deal ready to close | Manual process optimized for buyer familiarity (Getty-like UX) |
| **v0.3** | After first 3 deals close | Refine based on real buyer feedback, document edge cases |
| **v1.0** | Month 6-12, lawyer review complete | Stable manual SOP, lawyer-approved Master Agreement |
| **Platform (Year 2-3)** | Revenue validates model | Self-serve user accounts, automated delivery, API access |

---

## Key Design Principles

1. **Model after Getty Images** — proven 25+ year stock licensing SOP
2. **Feel familiar, deliver more** — Use Getty's UX language, but include Chain of Title documentation they don't provide
3. **Chain of Title = primary deliverable** — video file is secondary
4. **Indefinite record retention** — legal compliance requires permanent license history
5. **Year 1 = manual, Year 3 = automated** — build process before platform
6. **Master License Agreement + Order ID** — familiar transaction model (one EULA, many purchases)
7. **"SI8 Library" framing** — Even in Year 1, delivery feels like account vault (not agency handoff)

---

## Folder Structure

```
06_Operations/chain-of-title-delivery/
├── README.md                         # This file — project overview
├── DELIVERY-PROCESS.md               # Step-by-step buyer purchase → delivery flow
├── EMAIL-TEMPLATES.md                # All automated email templates
├── STORAGE-RETENTION.md              # File storage, backup, retention policies
├── ACCOUNT-DASHBOARD.md              # Year 2-3 self-serve platform design
├── MASTER-LICENSE-AGREEMENT.md       # Draft standard terms (EULA)
├── LICENSE-SUMMARY-TEMPLATE.md       # 1-page quick reference template
├── DECISIONS.md                      # Version log, what changed, why
├── PEER-REVIEW-SYNTHESIS.md          # ChatGPT + Gemini feedback analysis
├── DISCUSSION-QUESTIONS.md           # Structured decision questions (answered)
├── PEER-REVIEW-PROMPT.md             # Prompt used for peer review
├── research/
│   └── getty-sop-research.md         # Feb 21 2026 web research on Getty's delivery process
└── versions/
    ├── v0.1.md                       # First draft snapshot (pre-peer review)
    └── v0.2.md                       # Post-peer review (ready for first deal)
```

---

## Open Questions (To Be Resolved)

### Resolved in v0.2 (Peer Review)

- ✅ **Storage security:** Email-specific sharing (not public links)
- ✅ **Refund policy:** No refunds after delivery (matches Getty)
- ✅ **Documentation scope:** Everything included in base package (no upsell)
- ✅ **Year 1.5 automation:** Wait for manual pain (support >2hrs/week) before automating
- ✅ **Category taxonomy:** Start with 5 categories, expand as conflicts arise
- ✅ **E&O insurance:** Investigate when first Tier 2 deal is live
- ✅ **Google Workspace:** Stay on Google Drive through Year 2

### Still Open (Resolve by Month 3)

- **Payment processing:** Stripe preferred, but add PayPal/wire for international buyers?
- **Territory-specific invoicing:** Different invoice formats for Taiwan/Singapore/US?
- **Master Agreement governing law:** Taiwan? Singapore? Buyer's jurisdiction?
- **Filmmaker royalty tracking:** Automate or manual spreadsheet in Year 1?

---

## Next Steps

1. ✅ **Peer review complete** (ChatGPT + Gemini feedback synthesized)
2. ✅ **Terminology updated** (Chain of Title, Order ID, License Summary added)
3. ⚠️ **Lawyer review** (Master Agreement, disclaimer language, refund policy)
4. 📋 **Test with first deal** (MyVideo pilot — run manual process end-to-end)
5. 📋 **Update website** (terminology consistency across homepage + Rights Verified pages)
6. 📋 **Iterate to v0.3** (after first 3 deals, refine based on buyer feedback)

---

## Document Changelog

| Date | Version | Change | Reason |
|------|---------|--------|--------|
| Feb 21, 2026 | v0.1 | Initial draft based on Getty research | Establish SOP framework before first catalog deal |
| Feb 21, 2026 | v0.2 | Terminology update + peer review decisions implemented | Make delivery feel familiar to Getty/Shutterstock buyers |

---

**Project Owner:** JD
**Last Updated:** February 21, 2026
**Review Cycle:** After every 3 deals (v0.2 → v0.3 → v1.0)
