# Rights Package Examples

## Purpose

This folder contains **example Rights Packages** — demonstration versions of the documentation SI8 delivers to buyers and filmmakers. These are sales and education assets, not real catalog entries.

**Target audiences:**
- **Filmmakers:** "Here's what documentation you'll get when SI8 represents your work"
- **Buyers (brands/agencies):** "Here's the legal documentation you receive with every license"
- **Internal:** Template for actual catalog entries

---

## What Is a Rights Package?

A **Rights Package** is SI8's core deliverable — the structured legal documentation that accompanies every piece of AI-generated content in the SI8 catalog.

**Getty analogy:** When a brand licenses a photo from Getty Images, they're not just paying for the JPEG file. They're paying for:
- License agreement
- Model releases
- Property releases
- Usage rights documentation
- Legal indemnification trail

**The JPEG costs $50. The legal guarantee costs $400.**

SI8 provides the same value layer for AI video. The video file is the carrier. The Rights Package is the product.

---

## Rights Package Components

Each Rights Package includes **9 structured fields** (see: `/06_Operations/safe-lane/RIGHTS-PACKAGE-SCHEMA.md`):

| # | Field | What It Documents |
|---|---|---|
| 1 | Tool Provenance Log | Which AI tools generated the content; versions, plan tiers, production dates |
| 2 | Model Disclosure | Specific AI models used (e.g., Runway Gen-3 Alpha Turbo, Kling v1.6) |
| 3 | Safe Lane Sign-off | SI8 reviewer, review date, risk tier assigned, any flags or conditions |
| 4 | Commercial Use Authorization | Confirmation that tool Terms of Service permit commercial licensing; plan receipts verified |
| 5 | Modification Rights Status | Whether filmmaker has authorized SI8 to commission brand-integrated versions (Tier 2 gate) |
| 6 | Category Conflict Log | Brand categories restricted for product placement (e.g., alcohol, tobacco, political) |
| 7 | Territory Log | Geographic licensing restrictions (default: Global) |
| 8 | Regeneration Rights Status | Authorization scope for AI regeneration of brand elements into specific scenes |
| 9 | Version History | Production date, review date, any re-review triggers, modifications |

---

## Folder Structure

```
05_Catalog/_examples/
├── README.md                           # This file
├── TEMPLATE.md                         # Blank Rights Package template (copy for new entries)
├── example-001-neon-dreams/            # Example 1: Cyberpunk commercial/short
│   ├── rights-package-v1.0.md         # The Rights Package deliverable
│   ├── production-brief.md            # Fictional filmmaker submission (shows what SI8 receives)
│   └── notes.md                       # Design decisions, why we chose this example
├── example-002-[title]/                # Future examples as needed
└── versions/
    └── CHANGELOG.md                    # Track template evolution over time
```

---

## How to Use This Folder

### For Sales Conversations
- Share `example-001-neon-dreams/rights-package-v1.0.md` with prospects
- Demonstrates professionalism, legal rigor, defensibility
- Shows what buyers receive vs. unlicensed AI video stock sites

### For Filmmaker Onboarding
- Share `example-001-neon-dreams/production-brief.md` to show what submission requires
- Share `rights-package-v1.0.md` to show what documentation they'll receive in return

### For Internal Reference
- Copy `TEMPLATE.md` when creating actual catalog entries
- Follow the 9-field structure consistently
- Reference `example-001` for field formatting, level of detail

### For Website/Marketing
- Excerpt sections for "What You Get" copy
- Use as downloadable sample in sales materials
- Add to pitch decks

---

## Version Control

**Template versioning:** Track in `versions/CHANGELOG.md`

**Example versioning:** Each example has its own version number (e.g., `rights-package-v1.0.md`)

**When to create a new example:**
- Different content type (commercial vs. narrative short vs. music video)
- Different tool stack (Sora vs. Runway vs. Kling)
- Different use case (Tier 1 as-is vs. Tier 2 product placement)
- Edge case that needs demonstration

**When to update template:**
- Legal research reveals new required fields
- Lawyer feedback on documentation structure
- Buyer requests additional information consistently
- Platform policy changes require new disclosures

---

## Examples Roadmap

| Example | Content Type | Tool Stack | Use Case | Status |
|---------|-------------|------------|----------|--------|
| 001 - Neon Dreams | Cyberpunk commercial/short (90s) | Runway Gen-3 + ElevenLabs | Tier 1 + Tier 2 (modification authorized) | ✓ v1.0 |
| 002 - [TBD] | Narrative short film | Sora | Tier 1 only (no modification) | Planned |
| 003 - [TBD] | Product demo / explainer | Kling + custom audio | Tier 2 (product placement) | Planned |

---

## Key Principles

1. **Examples are fictional but realistic** — based on real tool capabilities, real submission requirements, real legal considerations
2. **Examples evolve with the business** — as Safe Lane process matures, examples get updated
3. **Examples are sales tools** — optimized for clarity and buyer confidence, not just internal reference
4. **All examples show "clean" outcomes** — these demonstrate successful Safe Lane approval, not rejection scenarios

---

## Related Documentation

- `/06_Operations/safe-lane/RIGHTS-PACKAGE-SCHEMA.md` — Full 9-field schema definition
- `/06_Operations/safe-lane/SUBMISSION-REQUIREMENTS.md` — What filmmakers must provide
- `/06_Operations/safe-lane/REVIEW-CRITERIA.md` — How SI8 evaluates submissions
- `/06_Operations/legal/rights-playbook/versions/v0.2.md` — Legal theory and landscape
