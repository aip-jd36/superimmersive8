# Rights Package Delivery — SOP Documentation

## What This Project Is

This project documents **how SI8 delivers rights documentation to buyers** when they license AI video content from our catalog. It defines the operational process for fulfilling orders, delivering legal documentation, and maintaining records for compliance and legal defense.

This is not about creating the Rights Package itself (that's documented in `06_Operations/safe-lane/`). This is about **how we get it to the customer** and **how we store it for the long term**.

---

## Why This Matters

**The Rights Package is the product. The video file is just the carrier.**

Based on the Getty Images model: buyers pay $450 for the legal guarantee, $50 for the JPEG. SI8's differentiation is providing documented defensibility that Getty doesn't offer for photography. Our delivery system must treat the Rights Package PDF as the primary deliverable, not an afterthought.

**Legal compliance:** Stock photo agencies maintain license records indefinitely. SI8 must do the same. If a buyer faces legal review 3 years after purchase, they need to retrieve their Rights Package. Our SOP must guarantee this.

---

## Relationship to Other SI8 Projects

| Project | What | Relationship to This Project |
|---------|------|------------------------------|
| **Safe Lane Verification** (`06_Operations/safe-lane/`) | HOW SI8 vets content before it enters catalog | Creates the Rights Package PDF that this project delivers |
| **Rights Playbook** (`06_Operations/legal/rights-playbook/`) | WHY SI8's process is legally sound | Legal foundation that Rights Package documents |
| **Filmmaker Agreement** (`06_Operations/legal/filmmaker-agreement/`) | How SI8 acquires rights from creators | Upstream relationship; affects modification rights in Rights Package |
| **This Project** | HOW SI8 delivers Rights Packages to buyers + stores records | Downstream fulfillment after Safe Lane vetting |

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
│ DECISIONS.md                           │ ← Version log, what changed, why
│ (Decision history, open questions)     │
└────────────────────────────────────────┘
```

---

## Current Version Status

**Version:** v0.1 (Draft — awaiting peer review)
**Date:** February 21, 2026
**Status:** Pre-launch design based on Getty Images SOP research

### Phase Roadmap

| Phase | Trigger | Implementation Focus |
|-------|---------|---------------------|
| **v0.1 (now)** | First catalog entries ready | Manual process: email templates, Google Drive storage, spreadsheet tracking |
| **v0.2** | After first 3 deals close | Semi-automated: Resend/Kit automation, Notion/Airtable license DB |
| **v0.3** | After 10+ deals, steady revenue | Refine based on buyer feedback, lawyer review of email language |
| **v1.0** | Month 6-12 | Stable manual→semi-automated SOP, ready for platform build |
| **Platform (Year 2-3)** | Revenue validates model | Self-serve user accounts, automated Rights Package delivery, API access |

---

## Key Design Principles

1. **Model after Getty Images** — proven 25+ year stock licensing SOP
2. **Rights Package = primary deliverable** — video file is secondary
3. **Indefinite record retention** — legal compliance requires permanent license history
4. **Year 1 = manual, Year 3 = automated** — build process before platform
5. **Email confirmation = immediate** — Rights Package download link sent within seconds of payment
6. **Invoice + Rights Package = legal defense bundle** — both must be preserved and retrievable

---

## Folder Structure

```
06_Operations/rights-package-delivery/
├── README.md                      # This file — project overview
├── DELIVERY-PROCESS.md            # Step-by-step buyer purchase → delivery flow
├── EMAIL-TEMPLATES.md             # All automated email templates
├── STORAGE-RETENTION.md           # File storage, backup, retention policies
├── ACCOUNT-DASHBOARD.md           # Year 2-3 self-serve platform design
├── DECISIONS.md                   # Version log, what changed, why
├── research/
│   └── getty-sop-research.md      # Feb 21 2026 web research on Getty's delivery process
└── versions/
    └── v0.1.md                    # First frozen snapshot (cut after peer review)
```

---

## Open Questions (To Be Resolved)

- **Payment processing:** Stripe vs. PayPal vs. wire transfer for international buyers?
- **File delivery method:** Email attachment (size limits) vs. download link (expiration policy)?
- **Rights Package versioning:** If a buyer licensed v1.0 but we later update to v1.1 (template change), do they get the new version? Or is it frozen at purchase date?
- **Re-download policy:** Unlimited re-downloads? Or "contact support after 90 days"?
- **Account creation:** Required at purchase? Or optional (just email-based delivery)?
- **Territory-specific invoicing:** Do we need different invoice formats for Taiwan vs. Singapore vs. US buyers?
- **Refund policy:** If buyer requests refund, do we revoke Rights Package access? (Getty: yes, within 30 days if unused)

---

## Next Steps

1. **Peer review:** Get feedback from ChatGPT, Gemini, and advisor network
2. **Draft all core documents:** Complete DELIVERY-PROCESS.md, EMAIL-TEMPLATES.md, STORAGE-RETENTION.md
3. **Legal review (Month 3):** Have lawyer review email language, invoice format, license confirmation wording
4. **Test with first deal:** Run manual process end-to-end, document what breaks
5. **Iterate to v0.2:** Refine based on real buyer experience

---

## Document Changelog

| Date | Version | Change | Reason |
|------|---------|--------|--------|
| Feb 21, 2026 | v0.1 | Initial draft based on Getty research | Establish SOP framework before first catalog deal |

---

**Project Owner:** JD
**Last Updated:** February 21, 2026
**Review Cycle:** After every 3 deals (v0.1 → v0.2 → v0.3) until stable at v1.0
