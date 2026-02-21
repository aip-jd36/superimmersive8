# Rights Verified Review Process

**Version:** v0.1 (February 2026)
**Audience:** SI8 internal reviewer
**Target total time:** Under 90 minutes per complete submission
**Turnaround commitment (v0.1):** 5 business days from receipt of complete submission

---

## Overview

Four stages. Each stage has a defined outcome. Do not skip stages or combine them — the order matters because early stages gate whether later stages are worth running.

| Stage | Name | Target Time | Purpose |
|-------|------|-------------|---------|
| 1 | Pre-Screen | 15 min | Quick gate: is this worth a full review? |
| 2 | Full Review | 45–60 min | Seven-category deep review |
| 3 | Risk Tier Assignment | 5 min | Classify the work based on review findings |
| 4 | Decision & Output | 10–15 min | Document decision; generate Chain of Title or reject |

---

## Stage 1 — Pre-Screen (15 min)

**Purpose:** Quick gate before investing full review time. Catch obvious problems early.

Run through the following five checks. Any single failure = stop and handle before proceeding.

**Check 1: Tool list coverage**
- Open Section 3 of the submission.
- Look up each tool against the current tool risk tier list (in Rights Playbook).
- Are all tools on the Approved or Caution list?
- If any Prohibited or High-Risk tool is listed as a primary generation source → **Reject at pre-screen.** Do not proceed.

**Check 2: Commercial plan receipts**
- Are paid plan receipts or subscription confirmations provided for every tool listed?
- If receipts are missing for any tool → **Request additional info.** Submission is incomplete.

**Check 3: No List visual scan**
- Watch the full work (or scan if very long — note timestamps of anything to revisit).
- Any obvious No List violations: celebrity likenesses, explicit content, deepfakes, copyrighted characters?
- If yes → **Reject at pre-screen.** Write explanation.

**Check 4: Modification rights authorization**
- Has Section 8 been completed? Is a selection made?
- If Section 8 is blank → **Request additional info.** This is required regardless of Tier 1/2 intention.

**Check 5: Audio disclosure**
- Has Section 7 been completed with a selection for each audio element?
- Any unlicensed commercial music claimed as "licensed" without documentation → **Request additional info.**

**Pre-Screen Outcomes:**

| Outcome | Action |
|---------|--------|
| **Proceed** | All 5 checks pass. Move to Stage 2. |
| **Request additional info** | Contact filmmaker with specific list of what's missing. Set 14-day deadline for response. Log date in DECISIONS.md or submission tracker. |
| **Reject** | Write explanation. Note whether resubmission is possible after remediation. |

---

## Stage 2 — Full Review (45–60 min)

**Purpose:** Seven-category deep review. Apply REVIEW-CRITERIA.md thresholds for each category.

Work through the seven categories in order. Note findings as you go — these become the basis of the Chain of Title.

### Category 1: Tool & Plan Verification
- Confirm each tool against current tier list.
- Confirm commercial license status for each tool.
- Note any Caution-tier tools (e.g., Kling) — these affect Chain of Title flags and exclusivity pricing.
- File copies of receipts in submission record.

### Category 2: Human Authorship Evidence Quality
- Read the declaration (Section 4) carefully.
- Apply REVIEW-CRITERIA.md Category 2 thresholds.
- Does it describe iteration, selection, editorial choices? Is meaningful human direction evident?
- If borderline → note specific gaps. If requesting expansion, be precise about what's missing.

### Category 3: Likeness & Identity Scan
- Watch the full work.
- Scan every face: is any face identifiable as a real specific person?
- Scan voices: any voice that sounds like a specific real person?
- Lookalike test: even if not identical — does a character clearly evoke a real specific person?
- Apply REVIEW-CRITERIA.md Category 3 thresholds. This is a hard line.
- If any doubt → **Fail this category. No exceptions.**

### Category 4: IP & Brand Imitation Scan
- Scan for: recognizable characters, protected trade dress, trademarked logos, brand color/identity combinations.
- Does any element clearly imitate or parody real IP without authorization?
- Ambiguous cases: document in EDGE-CASES.md. Do not unilaterally approve ambiguous cases.

### Category 5: Brand Safety Assessment
- Could this content be attached to mainstream commercial brand advertising?
- Note specific brand category restrictions (e.g., "suitable for most categories; not suitable for children's brands due to [scene X]").
- These restrictions populate the Category Conflict Log in the Chain of Title.

### Category 6: Audio & Music Rights Verification
- Review Section 7 disclosures against the actual audio.
- If "licensed" — review the license documentation. Is it a commercial license? Does it cover the intended use?
- If "original AI-generated" — confirm the tool permits commercial use and is on the paid plan.
- v0.1 default: any uncertain music rights → flag for legal review at v0.3. Take conservative position now.

### Category 7: Modification Rights Scope Confirmation
- Review Section 8 selection.
- If authorized (full or scene-specific) — confirm the Shopping Agreement includes a modification clause. If not, note this must be resolved before Tier 2 deals are offered.
- If not authorized — note Tier 1 only in Chain of Title.
- Document scope precisely — "specific scenes" authorization requires a scene list.

---

## Stage 3 — Risk Tier Assignment (5 min)

Based on Stage 2 findings, assign one of four outcomes:

| Tier | Criteria |
|------|---------|
| **Certified** | Adobe Firefly as primary generation tool. No Caution-tier tools used. All categories pass cleanly. |
| **Standard** | Runway / Pika / Sora (paid plans) as primary tools. No Prohibited tools. All categories pass. Caution-tier tools may be present — note in Chain of Title. |
| **Caution-Flagged** | Approved tools used, but Caution-tier tool (e.g., Kling) is primary or significant. Note in Chain of Title. Affects exclusivity pricing for buyers. Work is licensable but buyers are informed. |
| **Reject** | Any Prohibited or High-Risk tool used as primary generation source. Or any Category 3 (Likeness) or Category 1 hard-line failure. |

*Note: Certified vs. Standard distinction matters for pricing (TBD in pricing framework). Both are licensable. Caution-Flagged is licensable with buyer disclosure. Reject is not.*

---

## Stage 4 — Decision & Output (10–15 min)

**Clean Pass:**
1. **Generate file hash.** Run SHA-256 on the master delivery file. Record filename, file specs, and hash in Field 10 of the Chain of Title. Do this before anything else — the hash must be generated from the file you reviewed, before it leaves your possession.
   - Mac/Linux: `shasum -a 256 [filename]` in Terminal
   - Windows: `certutil -hashfile [filename] SHA256`
2. Complete the Chain of Title schema (RIGHTS-PACKAGE-SCHEMA.md) for this work, including Field 10.
3. Assign catalog ID: `SI8-[YEAR]-[4-digit sequence]` (e.g., `SI8-2026-0001`).
4. Save Chain of Title to: `05_Catalog/represented/[filmmaker]/[title]/rights-package.md`
5. Add catalog entry to catalog index.
6. Notify filmmaker: pass, tier assigned, catalog ID, what happens next (Tier 1/2 eligibility, next steps).

**Conditional Pass:**
1. Contact filmmaker with specific list of what needs to be provided or corrected.
2. Set 14-day deadline.
3. Log in submission tracker with deadline date.
4. On receipt of additional materials: re-run only the relevant Stage 2 categories, then proceed to Stage 3-4.

**Reject:**
1. Write explanation: what failed, why, what the policy is.
2. State clearly whether resubmission is possible: if yes, what would need to change; if no, why not.
3. Keep record. If the same filmmaker resubmits, check prior rejection reason was addressed.

---

## Submission Tracker

Maintain a simple log of all submissions. Minimum fields:

| Catalog ID (once assigned) | Filmmaker | Title | Received | Pre-Screen result | Stage 2 complete | Decision | Tier | Notes |
|---|---|---|---|---|---|---|---|---|
| | | | | | | | | |

File: `05_Catalog/represented/` or a dedicated tracker in `06_Operations/safe-lane/` (decide at v0.2).

---

## Intake Capacity Policy (v0.1)

**Maximum submissions accepted per month: 10**

SI8 operates at 10–15 hours/week as of v0.1, with part-time or outsourced reviewer support. Accepting more than 10 submissions/month risks missing the 5-business-day turnaround commitment. Credibility depends on hitting that commitment.

**How intake is managed:**
- Submissions are accepted on a queue basis. If the queue is full for the current month, filmmaker is notified and placed at the front of the next month's queue.
- Fast reject (within 48 hours): If a submission fails Pre-Screen Stage 1 checks, reject immediately. Do not hold it in the queue.
- The 5-business-day SLA applies only after completeness is confirmed (i.e., after Stage 1 passes or additional info is received). An incomplete submission does not start the clock.
- Capacity review: reassess the 10/month cap after the first 3 real submissions. Adjust up or down based on actual review time.

*Note: Publishing the intake cap proactively (e.g., on the website or in filmmaker outreach) sets expectations and signals demand, not limitation.*

---

## Notes for v0.1 Reviewers

- When in doubt, take the conservative position and document it. Do not try to approve ambiguous cases through creative reasoning. Log them in EDGE-CASES.md.
- Music rights are the most complex category. If you are uncertain, flag it. Do not approve uncertain music rights in v0.1.
- The Likeness category is the hardest line. If a face is possibly identifiable, it fails. Period.
- The goal of v0.1 is not to approve everything — it is to run a clean, documented process for the first time.
- Generate the file hash (Field 10) before issuing any Chain of Title. The hash is the chain of custody. Without it, the package cannot prove it applies to the file the buyer received.
