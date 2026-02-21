# Rights Package Delivery Process

## Overview

This document defines the **step-by-step operational flow** from the moment a buyer clicks "Purchase" to the moment they have all files and documentation in hand.

**Goal:** Deliver Rights Package + video file + invoice to buyer within 5 minutes of payment confirmation.

**Non-goal:** This is NOT about how to create the Rights Package (see `06_Operations/safe-lane/`). This is about delivery logistics.

---

## Purchase Flow — Year 1 (Manual Process)

```
┌─────────────────────────────────────────────────────────────────┐
│ STEP 1: BUYER INQUIRY                                           │
│ ────────────────────────────────────────────────────────────────│
│ Buyer fills contact form on website or emails directly          │
│ → JD responds with catalog options + pricing                    │
│ → Buyer selects asset (e.g., SI8-2026-0001 "Neon Dreams")       │
└─────────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────────┐
│ STEP 2: PROPOSAL + INVOICE SENT                                 │
│ ────────────────────────────────────────────────────────────────│
│ JD sends:                                                        │
│  - 1-page proposal (asset details, license type, use case)      │
│  - Invoice (Stripe payment link OR wire transfer details)       │
│  - License terms reference (link to website)                    │
│                                                                  │
│ Buyer confirms:                                                  │
│  - Licensee name (can be different from buyer if for client)    │
│  - Intended use (product placement, streaming, editorial, etc.) │
│  - Territory (global or specific regions)                       │
└─────────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────────┐
│ STEP 3: PAYMENT RECEIVED                                        │
│ ────────────────────────────────────────────────────────────────│
│ Payment method: Stripe (card) OR wire transfer OR PayPal        │
│ → JD receives payment confirmation                              │
│ → Logs transaction in License History spreadsheet               │
└─────────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────────┐
│ STEP 4: PREPARE DELIVERY PACKAGE (Manual, ~15 min)              │
│ ────────────────────────────────────────────────────────────────│
│ JD assembles:                                                    │
│  1. Video file (MP4) — upload to Google Drive, set permissions  │
│  2. Rights Package PDF — generate from template (if not already)│
│  3. Invoice PDF — export from Stripe or accounting system       │
│                                                                  │
│ Create Google Drive folder:                                     │
│   /SI8 Licenses/[Buyer Company]/SI8-2026-0001/                  │
│     ├── Neon-Dreams_SI8-2026-0001.mp4                           │
│     ├── Rights-Package_SI8-2026-0001_v1.0.pdf                   │
│     └── Invoice_SI8-2026-0001.pdf                               │
│                                                                  │
│ Set folder sharing: "Anyone with link can view" (download only) │
└─────────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────────┐
│ STEP 5: SEND LICENSE CONFIRMATION EMAIL (Manual)                │
│ ────────────────────────────────────────────────────────────────│
│ From: jd@superimmersive8.com                                    │
│ To: [Buyer email]                                               │
│ Subject: "License Confirmed: [Asset Title] (SI8-YYYY-####)"     │
│                                                                  │
│ Body: (See EMAIL-TEMPLATES.md for full template)                │
│  - Transaction summary                                          │
│  - Download links (Google Drive folder)                         │
│  - License terms reference                                      │
│  - Support contact                                              │
│                                                                  │
│ Attachments: None (links to Google Drive instead)               │
└─────────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────────┐
│ STEP 6: BUYER DOWNLOADS FILES                                   │
│ ────────────────────────────────────────────────────────────────│
│ Buyer clicks Google Drive link → downloads all 3 files          │
│                                                                  │
│ Download link: Valid indefinitely (no expiration)               │
│ Re-download policy: Buyer can re-download anytime via same link │
│                                                                  │
│ If buyer loses email: Email JD → resend link within 24 hours    │
└─────────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────────┐
│ STEP 7: RECORD KEEPING (Immediate)                              │
│ ────────────────────────────────────────────────────────────────│
│ JD updates:                                                      │
│  - License History spreadsheet (catalog ID, date, buyer, price) │
│  - Accounting records (revenue tracking)                        │
│  - Filmmaker royalty tracker (if commission-based agreement)    │
│                                                                  │
│ Backup:                                                          │
│  - Google Drive folder remains live indefinitely                │
│  - Local backup of all files to external drive (weekly)         │
└─────────────────────────────────────────────────────────────────┘
```

**Total time from payment → delivery:** 15-30 minutes (manual process)

---

## Purchase Flow — Year 2 (Semi-Automated)

```
┌─────────────────────────────────────────────────────────────────┐
│ STEP 1-2: INQUIRY + PROPOSAL (Same as Year 1)                   │
└─────────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────────┐
│ STEP 3: PAYMENT RECEIVED (Automated Webhook)                    │
│ ────────────────────────────────────────────────────────────────│
│ Stripe payment webhook → triggers Vercel function               │
│ → Logs transaction to Notion/Airtable database                  │
│ → Sends automated email via Resend                              │
└─────────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────────┐
│ STEP 4-5: AUTOMATED DELIVERY (Instant)                          │
│ ────────────────────────────────────────────────────────────────│
│ Vercel function:                                                 │
│  1. Fetches pre-uploaded files from cloud storage (S3/GCS)      │
│  2. Generates time-limited download links (7 days)              │
│  3. Sends confirmation email with links (EMAIL-TEMPLATES.md)    │
│                                                                  │
│ Email includes:                                                  │
│  - Video file download link                                     │
│  - Rights Package PDF download link                             │
│  - Invoice PDF download link                                    │
│  - Account login link (to access license history)               │
└─────────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────────┐
│ STEP 6: BUYER DOWNLOADS FILES (Automated)                       │
│ ────────────────────────────────────────────────────────────────│
│ Buyer downloads within 7 days                                   │
│                                                                  │
│ After 7 days: Links expire → buyer logs into account            │
│ → Self-serve re-download from "My Licenses" dashboard           │
└─────────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────────┐
│ STEP 7: RECORD KEEPING (Automated)                              │
│ ────────────────────────────────────────────────────────────────│
│ Notion/Airtable database auto-updated                           │
│ Cloud storage auto-backup enabled                               │
│ Filmmaker royalty auto-calculated (if applicable)               │
└─────────────────────────────────────────────────────────────────┘
```

**Total time from payment → delivery:** < 60 seconds (automated)

---

## Purchase Flow — Year 3 (Full Platform)

```
┌─────────────────────────────────────────────────────────────────┐
│ BUYER BROWSES CATALOG (Self-Serve)                              │
│ ────────────────────────────────────────────────────────────────│
│ Catalog page: thumbnail grid + filters (genre, duration, tier)  │
│ → Click asset → preview page with Rights Package summary        │
│ → Select license tier (Tier 1 Standard / Tier 2 Custom)         │
│ → Add to cart                                                   │
└─────────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────────┐
│ CHECKOUT (Automated)                                            │
│ ────────────────────────────────────────────────────────────────│
│ Form fields:                                                     │
│  - Licensee name (defaults to account name)                     │
│  - Intended use (dropdown: streaming, advertising, editorial)   │
│  - Territory (dropdown: global, APAC, North America, etc.)      │
│                                                                  │
│ Payment: Stripe embedded checkout                               │
│ → Instant payment confirmation                                  │
└─────────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────────┐
│ INSTANT DELIVERY (Fully Automated)                              │
│ ────────────────────────────────────────────────────────────────│
│ 1. Email confirmation sent (< 10 seconds)                       │
│ 2. Files available in "My Licenses" dashboard immediately       │
│ 3. Invoice auto-generated and downloadable                      │
│ 4. Rights Package auto-generated from database template         │
│                                                                  │
│ Buyer can:                                                       │
│  - Download all files from account dashboard                    │
│  - Re-download anytime (unlimited)                              │
│  - View full license history                                    │
│  - Export records for compliance (ZIP download)                 │
└─────────────────────────────────────────────────────────────────┘
```

**Total time from payment → delivery:** < 10 seconds (platform)

---

## Tier 2 Custom Placement — Special Process

Tier 2 deals involve **custom AI regeneration** of brand elements into the video. This requires additional production time.

### Tier 2 Flow (Year 1-2)

```
1. Buyer inquiry → JD sends proposal + mockup/storyboard
2. Buyer approves concept + pays 50% deposit
3. SI8 commissions filmmaker to regenerate scenes (2-5 days)
4. Review iteration (1-2 rounds)
5. Final approval + 50% final payment
6. Delivery: same as Tier 1 PLUS updated Rights Package v2.0
   - v2.0 includes: regeneration log, brand placement details, category exclusivity
```

**Timeline:** 7-14 days from deposit to delivery (vs. instant for Tier 1)

**Rights Package versioning:**
- Tier 1 (as-is licensing): `Rights-Package_SI8-2026-0001_v1.0.pdf`
- Tier 2 (custom placement): `Rights-Package_SI8-2026-0001_v2.0.pdf`

Both versions stored. Buyer receives the version corresponding to their license tier.

---

## Edge Cases & Exceptions

### Buyer Loses Download Link
- **Year 1:** Email JD → manual resend within 24 hours
- **Year 2+:** Self-serve re-download from account dashboard

### Buyer Requests Refund (Within 30 Days)
- **Policy:** Full refund if asset unused and not deployed
- **Process:** Buyer confirms non-use in writing → JD processes refund → revoke download link → mark license as "Refunded" in database
- **Rights Package:** Buyer must delete all copies (honor system, not enforceable)

### Buyer Needs Updated Rights Package (Template Change)
- **Scenario:** SI8 updates Rights Package template format in Month 6 (e.g., adds new field). Buyer licensed in Month 2 with old template.
- **Policy (v0.1 proposal):** License is frozen at purchase date. Buyer keeps v1.0 template. No automatic upgrade.
- **Exception:** If template change is legally material (e.g., adds critical compliance field), SI8 may offer voluntary re-issue.

### Buyer Loses All Files (Hard Drive Failure)
- **Policy:** Indefinite re-download rights. Buyer can request files anytime.
- **Year 1:** Email JD → manual resend
- **Year 2+:** Self-serve from account

### Buyer Purchased for Client, Client Needs Direct Access
- **Policy:** Licensee name transfer allowed post-purchase
- **Process:** Buyer emails SI8 with client email → JD sends duplicate confirmation email to client with same download links
- **Database:** Both buyer and licensee emails logged

### International Wire Transfer (Payment Delayed)
- **Process:** JD sends invoice with wire instructions → buyer initiates transfer → 3-5 days clearing time → JD confirms receipt → delivery triggered
- **Timeline:** Delivery within 24 hours of payment confirmation (not instant)

---

## Quality Checks Before Delivery

Before sending confirmation email, verify:

- [ ] Payment confirmed (Stripe dashboard / bank account)
- [ ] Correct asset files uploaded (filename matches catalog ID)
- [ ] Rights Package PDF is final version (not draft/internal)
- [ ] Invoice matches payment amount received
- [ ] Licensee name spelled correctly in all documents
- [ ] Download links tested (can access from incognito browser)
- [ ] Email template customized (asset title, catalog ID, buyer name)

**Time required:** 5 minutes (manual checklist)

---

## Metrics to Track

| Metric | How to Measure | Target (Year 1) |
|--------|----------------|-----------------|
| **Delivery speed** | Time from payment → confirmation email sent | < 30 min |
| **Download rate** | % of buyers who download files within 7 days | > 95% |
| **Re-download requests** | # of "I lost the link" support tickets | < 5% of deals |
| **Refund rate** | % of licenses refunded | < 2% |
| **File access errors** | # of "link doesn't work" support tickets | 0 |

---

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| Feb 21, 2026 | Use Google Drive for Year 1 delivery | Free, reliable, familiar to buyers, no expiration on links |
| Feb 21, 2026 | No file attachments in email (links only) | Avoid email size limits, easier to update files if needed |
| Feb 21, 2026 | Indefinite download rights (no expiration) | Matches Getty model; buyer owns perpetual access to their license docs |
| TBD | Payment processor (Stripe vs. PayPal vs. wire) | Need to test international fees + conversion rates |
| TBD | Download link expiration policy (Year 2+) | 7 days proposed, but need to test buyer behavior |

---

**Next Steps:**
1. Draft email templates (EMAIL-TEMPLATES.md)
2. Set up Google Drive folder structure
3. Create license history tracking spreadsheet
4. Test end-to-end delivery with mock transaction
5. Document first real deal experience → iterate to v0.2
