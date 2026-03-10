# Rights Verified — Operational Process Documentation

**Status:** v0.1 (February 2026) — Pre-launch definition
**Purpose:** Define HOW SI8 reviews filmmaker submissions and generates Chain of Title documentation

---

## What This Is

This is the operational process layer for SI8's Rights Verified service. It defines:

- What filmmakers must provide when submitting work
- How SI8 reviews submissions step-by-step
- What criteria determine pass/fail decisions
- What documentation SI8 generates for approved works
- How edge cases and gray areas are handled

**This is NOT legal advice.** This is internal process documentation for running the Rights Verified review workflow.

---

## How This Relates to the Rights Playbook

| Document | Purpose | Audience |
|----------|---------|----------|
| **Rights Playbook** (`06_Operations/legal/rights-playbook/`) | WHY — Legal theory, jurisdiction landscape, tool risk tiers, platform policies | Legal research, buyer education |
| **Rights Verified Process** (this folder) | HOW — Operational workflow for reviewing submissions and generating Chain of Title | SI8 internal operations |

**The Playbook answers:** "What are the legal risks in AI video?"
**This process answers:** "How do we decide if a specific film is safe enough to represent?"

---

## Document Structure

```
06_Operations/rights-verified/
├── README.md                          ← You are here
├── SUBMISSION-REQUIREMENTS.md         ← What filmmakers must provide (10 sections)
├── REVIEW-PROCESS.md                  ← 4-stage workflow (<90 min target)
├── REVIEW-CRITERIA.md                 ← Pass/fail thresholds per category (7 categories)
├── CHAIN-OF-TITLE-SCHEMA.md           ← 9-field output template (the product)
├── EDGE-CASES.md                      ← Gray areas, judgment calls, precedents
├── DECISIONS.md                       ← Version log, open questions
└── versions/
    └── v0.1.md                        ← First frozen snapshot (after first real submission)
```

---

## How These Documents Work Together

**When a filmmaker submits work:**

1. **Check SUBMISSION-REQUIREMENTS.md** — Do they have all required materials?
2. **Follow REVIEW-PROCESS.md** — Run the 4-stage workflow
3. **Apply REVIEW-CRITERIA.md** — Evaluate against pass/fail thresholds
4. **Output CHAIN-OF-TITLE-SCHEMA.md** — Generate the structured documentation package
5. **Log in EDGE-CASES.md** — Document any gray areas encountered
6. **Update DECISIONS.md** — Track what changed and why

---

## Year 3 Platform Vision

Each field in the Chain of Title schema will become a **database column**.

**Current (Year 1):** Manual review, human judgment, document templates
**Future (Year 3+):** Web intake form → automated pre-screen → human final review → self-serve platform

The work we're doing now (defining fields, criteria, process) is the foundation for the platform. Every decision we make today shapes what the database schema will look like.

---

## Version Status

| Version | Date | Trigger | Status |
|---------|------|---------|--------|
| **v0.1** | Feb 2026 | First filmmaker conversation | Current — pre-launch definition |
| v0.2 | TBD | After 3 real submissions | Planned — refine from experience |
| v0.3 | TBD | Lawyer review | Planned — legal sign-off |
| v1.0 | TBD | First paid deal closes | Planned — stable, lawyer-reviewed |
| Platform | Year 3+ | Self-serve platform launch | Future — automated pre-screen |

---

## Open Questions (v0.1)

**Documented here so they don't block progress:**

- **Turnaround commitment:** What does SI8 promise filmmakers for review? 5-7 business days suggested.
- **Music rights stance:** v0.1 = silence or original AI audio only. Licensed music = Conditional Pass pending documentation.
- **Kling exclusivity pricing:** How to price catalog entries with Kling content for exclusive deals? Note in schema for now.
- **MyVideo platform requirements:** Still unknown — ask Jamie Lin. Note as open.
- **Tier pricing differential:** Does Certified (Firefly) vs Standard (Runway/Sora) affect licensing price?

**Resolution approach:** Document as-is, flag for future versions. Don't let unknowns block v0.1 from shipping.

---

## Key Principles

1. **The judgment layer is the moat:** C2PA will commoditize provenance. SI8's value is subjective legal review.
2. **Document everything:** Each real submission teaches us something. Edge cases accumulate into expertise.
3. **Build for the platform:** Every manual step today = a platform feature tomorrow.
4. **Conservative by default:** When in doubt, request more info or reject. Reputation risk > short-term revenue.
5. **Version, don't perfect:** Ship v0.1, learn from real submissions, iterate to v0.2.

---

## Related Documentation

- Rights Playbook v0.1: `06_Operations/legal/rights-playbook/versions/v0.1.md`
- Filmmaker Agreement (WIP): `06_Operations/legal/filmmaker-agreement/WORKING.md`
- Submission System Setup: `06_Operations/SUBMISSION_SYSTEM_SETUP.md`
- Filmmaker Terms: `07_Website/filmmaker-terms.html`

---

**Last Updated:** February 18, 2026
**Maintained By:** JD (jd@superimmersive8.com)
