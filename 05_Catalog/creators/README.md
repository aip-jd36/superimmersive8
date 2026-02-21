# Creator Management System

**Purpose:** Track all creators (filmmakers) who submit work to SI8's Rights Verified catalog, manage royalty payouts, and maintain creator relationships.

---

## Folder Structure

```
05_Catalog/creators/
├── README.md                          # This file — system overview
├── CREATOR-ROSTER.md                  # Master list of all signed creators
├── PAYOUT-MODEL.md                    # Tier 1 vs Tier 2 payout structure (the economics doc)
├── _templates/                        # Templates for creator onboarding
│   ├── creator-profile-template.md    # One per creator (bio, contact, portfolio)
│   ├── submission-tracker-template.md # Track submissions per creator
│   └── payout-tracker-template.md     # Track payouts per creator
├── payouts/                           # Monthly payout records
│   └── 2026/
│       ├── 2026-02-payouts.md
│       ├── 2026-03-payouts.md
│       └── ...
├── agreements/                        # Signed creator agreements
│   └── [creator-name]/
│       ├── creator-agreement-signed.pdf
│       └── agreement-metadata.md
└── [creator-name]/                    # Individual creator folders
    ├── profile.md                     # Creator info (contact, bio, social)
    ├── submissions.md                 # All submissions from this creator
    ├── payouts.md                     # All payouts to this creator
    └── notes.md                       # Internal notes, conversations, preferences
```

---

## Key Documents

| File | Purpose |
|------|---------|
| **CREATOR-ROSTER.md** | Master list of all creators: name, status (active/pending/inactive), join date, total assets in catalog |
| **PAYOUT-MODEL.md** | The economics: Tier 1 (20% royalty) vs Tier 2 (50/50 split), payment terms, thresholds |
| **creator-profile-template.md** | Template for each creator's profile page (bio, portfolio, contact info) |
| **submission-tracker-template.md** | Template for tracking submissions (title, status, review date, catalog ID) |
| **payout-tracker-template.md** | Template for tracking payouts (date, amount, deal ID, payment method) |

---

## Workflow

### 1. Creator Onboarding
1. Creator submits work via website form or email
2. Create folder: `05_Catalog/creators/[creator-name]/`
3. Copy templates: `profile.md`, `submissions.md`, `payouts.md`, `notes.md`
4. Add creator to `CREATOR-ROSTER.md`
5. Send creator agreement (from `06_Operations/legal/filmmaker-agreement/`)
6. Store signed agreement in `agreements/[creator-name]/`

### 2. Submission Review
1. Log submission in creator's `submissions.md`
2. Rights Verified review (see `06_Operations/rights-verified/`)
3. If approved → assign catalog ID → add to catalog
4. If rejected → update submission status, provide feedback

### 3. Deal Closes (Tier 1 or Tier 2)
1. Log deal in creator's `payouts.md`
2. Calculate payout (20% Tier 1 or 50% Tier 2)
3. Add to monthly payout batch: `payouts/2026/2026-[MM]-payouts.md`
4. Process payment (PayPal, wire, etc.)
5. Mark as paid in creator's `payouts.md`

### 4. Monthly Payout Cycle
1. Review all deals closed in the month
2. Generate monthly payout report
3. Batch payments (if threshold met: $50 minimum)
4. Update individual creator payout trackers
5. Send payout notification emails

---

## Creator Status Codes

| Status | Meaning |
|--------|---------|
| **Active** | Creator has 1+ assets in catalog; available for new submissions |
| **Pending** | Agreement sent, not yet signed; or first submission under review |
| **Inactive** | No active assets; not currently submitting |
| **Paused** | Creator requested pause (e.g., busy with other projects) |
| **Terminated** | Agreement ended (breach, mutual termination, etc.) |

---

## Payout Timing

**Tier 1 (Catalog Licensing):**
- Payment processed **30 days after buyer payment clears**
- Monthly batch (if balance ≥ $50; otherwise rolls to next month)
- Standard: PayPal or wire transfer

**Tier 2 (Custom Placement):**
- **50% upfront** (upon buyer deposit / project kickoff)
- **50% on delivery** (after final buyer approval)
- Faster payout cycle (project-based, not monthly batch)

---

## Current Status (February 2026)

- **Creators signed:** 0
- **Total submissions:** 0
- **Assets in catalog:** 0
- **Total payouts to date:** $0

**Next milestones:**
- [ ] First creator signed (target: March 2026)
- [ ] 3 creators signed (target: May 2026)
- [ ] First Tier 1 payout processed
- [ ] First Tier 2 deal closed

---

## Related Documentation

- **Creator Agreement:** `06_Operations/legal/filmmaker-agreement/`
- **Rights Verified Process:** `06_Operations/rights-verified/`
- **Catalog Management:** `05_Catalog/README.md`
- **Pricing Strategy:** `01_Business/pricing/PRICING-STRATEGY-v1.0.md`

---

**Last updated:** February 22, 2026
