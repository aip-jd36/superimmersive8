# Rights Verified Review Process

**Version:** v0.1 (February 2026)
**Audience:** SI8 internal reviewer
**Target total time:** Under 90 minutes per submission
**Turnaround commitment:** 5-7 business days from receipt of complete submission

---

## Overview

Four-stage workflow. Each stage has defined outcomes. Do not skip stages — the order matters.

| Stage | Name | Target Time | Purpose |
|-------|------|-------------|---------|
| 1 | Pre-Screen | 15 min | Quick gate: is this worth full review? |
| 2 | Full Review | 45-60 min | Seven-category deep review |
| 3 | Risk Tier Assignment | 5 min | Classify work based on findings |
| 4 | Decision & Output | 10-15 min | Generate Chain of Title or reject |

---

## Stage 1 — Pre-Screen (15 min)

**Purpose:** Catch obvious problems before investing full review time.

Run through five checks. Any failure = stop and handle before proceeding.

### Check 1: Tool List Coverage
- Open Section 3 of submission (Tool Disclosure)
- Look up each tool against current tool risk tier list (Rights Playbook)
- Are all tools on Approved or Caution list?
- **If any Prohibited/High-Risk tool is primary generation source → Reject at pre-screen**

### Check 2: Commercial Plan Receipts
- Are paid plan receipts provided for every tool listed?
- **If receipts missing → Request additional info (14-day deadline)**

### Check 3: No List Visual Scan
- Watch full work (or scan if very long — note timestamps)
- Any obvious No List violations: celebrity likenesses, explicit content, deepfakes, copyrighted characters?
- **If yes → Reject at pre-screen with explanation**

### Check 4: Modification Rights Authorization
- Has Section 8 been completed?
- **If blank → Request additional info (required regardless of Tier 1/2 intention)**

### Check 5: Audio Disclosure
- Has Section 7 been completed for all audio elements?
- Any unlicensed commercial music without documentation?
- **If yes → Request additional info or reject**

**Pre-Screen Outcomes:**

| Outcome | Action |
|---------|--------|
| **Proceed** | All 5 checks pass → Move to Stage 2 |
| **Request Info** | Contact filmmaker with specific list. 14-day deadline. Log in tracker. |
| **Reject** | Write explanation. State if resubmission possible. |

---

## Stage 2 — Full Review (45-60 min)

**Purpose:** Seven-category deep review using REVIEW-CRITERIA.md thresholds.

### Category 1: Tool & Plan Verification
- Confirm each tool against current tier list
- Confirm commercial license status for each
- Note any Caution-tier tools (e.g., Kling) — affects Chain of Title flags and exclusivity pricing
- File receipt copies in submission record
- **Check Section 2:** Underlying rights — if work is adapted from existing material, verify filmmaker owns rights or has written permission
- **Check Section 3:** Third-party assets — if non-AI assets used (fonts, SFX, stock footage, overlays), verify licenses cover commercial use

### Category 2: Human Authorship Evidence Quality
- Read declaration (Section 4) carefully
- Apply REVIEW-CRITERIA.md Category 2 thresholds
- Does it describe iteration, selection, editorial choices?
- Is meaningful human direction evident?
- **If borderline → note specific gaps for filmmaker to address**

### Category 3: Likeness & Identity Scan
- Watch full work
- Scan every face: identifiable as real specific person?
- Scan voices: sounds like specific real person?
- Lookalike test: does character clearly evoke real specific person?
- **If yes to any:** Check Section 5 — is consent/license documented?
  - Review consent documentation quality (Section 10)
  - Verify scope covers: (a) commercial use, (b) AI-generated derivatives, (c) third-party licensing
  - Check territory, duration, any restrictions
  - If minor depicted: verify parental/guardian consent
  - **Conservative standard:** If consent scope unclear or ambiguous → Conditional or Fail
- **If no identifiable likenesses:** Pass
- Apply REVIEW-CRITERIA.md Category 3 thresholds
- **Hard line. If any doubt about identity OR consent validity → Fail or Conditional. No "probably fine" passes.**

### Category 4: IP & Brand Imitation Scan
- Scan for: recognizable characters, protected trade dress, trademarked logos, brand color/identity combinations
- Does any element clearly imitate or parody real IP?
- **If yes:** Check Section 6 — is permission/license documented?
  - Review IP license documentation quality (Section 10)
  - Verify scope covers: (a) commercial use, (b) AI-generated derivatives, (c) third-party licensing
  - Check territory, duration, any restrictions
  - **Conservative standard:** If license scope unclear or ambiguous → Conditional or Fail
- **Parody/fair use claimed:** Do not approve unilaterally in v0.1. Flag for legal review at v0.3.
- **Ambiguous cases → document in EDGE-CASES.md. Do not unilaterally approve.**

### Category 5: Brand Safety Assessment
- Could this be attached to mainstream commercial brand advertising?
- Note specific brand category restrictions (e.g., "suitable for most; not suitable for children's brands due to [scene X]")
- These populate Category Conflict Log in Chain of Title

### Category 6: Audio & Music Rights Verification
- Review Section 7 disclosures against actual audio
- If "licensed" — review documentation. Commercial license? Covers intended use?
- If "original AI-generated" — confirm tool permits commercial use on paid plan
- **v0.1 default: uncertain music rights → flag for legal review. Take conservative position.**

### Category 7: Modification Rights Scope Confirmation
- Review Section 8 selection
- If authorized (full or scene-specific) — confirm Shopping Agreement includes modification clause
- If not authorized → note Tier 1 only in Chain of Title
- **Check existing brand placements:** If work contains existing product placements or branded products, note in Chain of Title Category Conflict Log (affects Tier 2 eligibility for competing brands)
- **Document scope precisely: "specific scenes" requires scene list**

---

## Stage 3 — Risk Tier Assignment (5 min)

Based on Stage 2 findings, assign tier:

| Tier | Criteria |
|------|----------|
| **Certified** | Adobe Firefly primary. No Caution-tier tools. All categories pass cleanly. |
| **Standard** | Runway/Pika/Sora (paid) primary. No Prohibited tools. All categories pass. Caution-tier may be present (note in Chain of Title). |
| **Caution-Flagged** | Approved tools but Caution-tier (Kling) is primary/significant. Note in Chain of Title. Affects exclusivity pricing. Licensable with buyer disclosure. |
| **Reject** | Any Prohibited/High-Risk tool as primary. OR Category 3 (Likeness) OR Category 1 hard-line failure. |

*Note: Certified vs. Standard matters for pricing (TBD). Both licensable. Caution-Flagged licensable with disclosure.*

---

## Stage 4 — Decision & Output (10-15 min)

### Clean Pass:
1. Complete Chain of Title schema (CHAIN-OF-TITLE-SCHEMA.md)
2. Assign catalog ID: `SI8-[YEAR]-[4-digit sequence]` (e.g., SI8-2026-0001)
3. Save Chain of Title to: `05_Catalog/represented/[filmmaker]/[title]/chain-of-title.md`
4. Add entry to catalog (update Airtable, website catalog grid)
5. Send approval email with Chain of Title PDF and catalog link

### Conditional Pass:
1. Contact filmmaker with specific list of needed materials
2. Set 14-day deadline
3. Log in Airtable with status "Conditional" and deadline date
4. On receipt: re-run relevant Stage 2 categories → proceed to Stage 3-4

### Reject:
1. Write explanation: what failed, why, what policy is
2. State if resubmission possible: if yes, what needs to change; if no, why not
3. Keep record. If filmmaker resubmits, check prior rejection addressed
4. Send rejection email

---

## Submission Capacity Policy (v0.1)

**Maximum submissions accepted per month: 10**

SI8 operates 10-15 hours/week as of v0.1. Accepting more than 10/month risks missing 5-7 day turnaround.

**How intake is managed:**
- Queue-based. If full for current month, filmmaker notified and placed in next month's queue.
- Fast reject (within 48 hours): If submission fails Pre-Screen, reject immediately.
- 5-7 day SLA starts only after completeness confirmed (Stage 1 passes or additional info received).
- Reassess 10/month cap after first 3 real submissions. Adjust based on actual review time.

*Publishing intake cap proactively sets expectations and signals demand, not limitation.*

---

## Notes for v0.1 Reviewers

- **When in doubt, take conservative position.** Do not try to approve ambiguous cases through creative reasoning. Log in EDGE-CASES.md.
- **Music rights = most complex.** If uncertain, flag it. Do not approve uncertain music rights in v0.1.
- **Likeness = hardest line.** If face possibly identifiable, it fails. Period.
- **Goal of v0.1:** Not to approve everything — to run clean, documented process for first time.
- **Document everything:** Each submission teaches us something. Edge cases accumulate into expertise.

---

*Version: v0.1 — February 2026*
*This process is designed to become a platform workflow in Year 3. Each manual step = future platform feature.*
