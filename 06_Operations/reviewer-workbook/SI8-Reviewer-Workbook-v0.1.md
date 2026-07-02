# SI8 Reviewer Workbook — Overview
**Version:** 0.1
**Effective date:** July 2, 2026
**Status:** ACTIVE — operational artifact, expected to evolve after each real assessment
**Owner:** Chief of Staff / Reviewer

---

## Purpose

The Reviewer Workbook is the internal operational instrument SI8 reviewers use to conduct a Campaign Clearance Assessment. It guides a single reviewer through a consistent process — from receiving a customer submission to generating the raw content needed for the client-facing Assessment Report.

The workbook is not a permanent intellectual property asset. It is the current operational implementation of SI8's Commercial Clearance Methodology v0.1. It is expected to change after each real assessment.

SI8's durable IP is:
- SI8 Philosophy
- Commercial Clearance Model
- Commercial Clearance Methodology

The Reviewer Workbook is how those principles are applied today. It will improve as operational experience accumulates.

---

## Scope

This workbook covers one assessment at a time. It is designed for:

- One reviewer
- One submitted AI video campaign (one video or one coherent campaign package)
- Manual execution — no software dashboard, no automation, no customer portal
- Target assessment duration: 90 minutes

It does not cover:
- Batch assessments (multiple videos in a single session)
- Automated evidence processing
- Customer-facing workflow or portal management

---

## What This Workbook Is Not

**Not a legal opinion instrument.** SI8 does not provide legal advice. The workbook produces a commercial confidence assessment, not a legal clearance.

**Not a completeness requirement.** Most submissions will be incomplete. The workbook is designed to produce a useful assessment even when evidence is partial. Evidence gaps are documented as findings, not as assessment failures.

**Not permanent.** After each real assessment, the reviewer should note what was unclear, what took longer than expected, and what should change. Those notes feed directly into Methodology v0.2.

---

## Relationship to Other Documents

| Document | Role in the assessment workflow |
|----------|--------------------------------|
| CertForm (submission form, `/record` or `/certify` routes) | Customer intake — what the customer provides |
| **This workbook** | Reviewer's internal instrument during assessment |
| SI8 Assessment Report Template v0.1 | Client-facing output — populated from workbook findings |
| Chain of Title Schema | Output format for the Chain of Title PDF |
| Review Criteria (`06_Operations/rights-verified/REVIEW-CRITERIA.md`) | Pass/fail thresholds per domain |
| No List (CLAUDE.md) | Pre-assessment scope exclusions — checked before review begins |

Flow: Customer submits via CertForm → Reviewer opens this workbook → Reviewer works through workbook using submission evidence → Workbook generates structured findings → Report Template populated from findings → Assessment Report delivered to customer.

---

## Reviewer Workflow

A complete assessment follows this sequence. Time guidance is approximate for a standard submission with adequate evidence.

### Step 0 — Pre-Assessment Screen (5 min)

Before opening the workbook:

1. Confirm submission is in the review queue (Supabase admin panel or manual intake log)
2. Read the submission overview: title, stated commercial use, submitting party, tier (SI8 Certified only — Creator Record assessments are automated)
3. **Check the No List** — if any of the following are present, stop here and issue a Decline:
   - Celebrity or identifiable person's likeness without documented consent
   - Voice cloning of a real person
   - Explicit IP imitation (copyrighted characters, brands)
   - Political persuasion content
   - Deepfake or deceptive content
   - Adult or explicit content
   - No signed Evidence Custodian Declaration
4. If No List is clear, open the workbook and begin Section 1

### Step 1 — Intake & Scope (10 min)

Confirm the submission is properly bounded before beginning evidence review. Record: submitter identity, stated commercial use, video specifications, and any scope limitations that will affect the assessment.

### Step 2 — Evidence Checklist (25 min)

Work through the 16 controls across 7 evidence domains. For each control, record: what evidence was provided, your judgment (Verified / Partially Verified / Not Provided / Not Applicable), and any notes. Do not make findings yet — this section is purely evidence inventory.

### Step 3 — Evidence Gap Log (10 min)

Review the Not Provided results from Section 2. For each missing evidence item, record: what's missing, whether it is addressable (customer could provide it), and the commercial impact of the gap.

This section is the primary input to the "Insufficient Supporting Evidence" outcome and to the "Residual Commercial Risks" section of the report.

### Step 4 — Findings Log (20 min)

Based on what was verified in Section 2 and what was found missing in Section 3, record your findings. A finding is a specific, evidence-based observation about a commercial risk domain. Findings may be positive (confirmed, no issue) or negative (specific risk identified or suspected).

Findings are not the overall assessment. They are the building blocks of it.

### Step 5 — Overall Assessment (10 min)

Select the assessment outcome. Record the primary basis for the outcome, any conditions attached, and your confidence level. This section directly populates the Executive Summary and Overall Assessment sections of the report.

### Step 6 — Report Brief (10 min)

Draft the raw language that will populate the client-facing Assessment Report. This is not a polished document — it is a structured briefing from the reviewer to whoever will finalize the report. In a solo-reviewer operation, the reviewer populates the Report Template directly from this section.

### Post-Assessment Notes (as needed)

After completing the workbook, note: what was unclear, what the workbook didn't account for, and what should be reconsidered in v0.2. These notes are the primary input to Methodology improvement.

---

## Workbook Structure

| Section | Purpose | Time |
|---------|---------|------|
| 1. Intake & Scope | Bound the assessment | 10 min |
| 2. Evidence Checklist | Inventory what was provided (16 controls) | 25 min |
| 3. Evidence Gap Log | Document what's missing and its impact | 10 min |
| 4. Findings Log | Record evidence-based observations | 20 min |
| 5. Overall Assessment | Outcome, confidence, conditions | 10 min |
| 6. Report Brief | Draft language for client report | 10 min |
| Post-Assessment Notes | Capture operational learning | As needed |
| **Total** | | **~90 min** |

---

## Assessment Lifecycle

```
Submission received
       ↓
Pre-Assessment Screen (No List check)
       ↓
[No List hit → Decline, notify customer]
       ↓
Workbook Sections 1–6
       ↓
Assessment Report drafted from Report Brief
       ↓
Report delivered to customer
       ↓
Post-Assessment Notes recorded
       ↓
Notes reviewed → Methodology v0.2 input
```

---

## Assessment Outcomes

Five possible outcomes. Select the one that best reflects the totality of the evidence:

| Outcome | When to use |
|---------|-------------|
| **Evidence Supports Intended Commercial Use** | The evidence provided is sufficient and consistent — no material gaps or identified risks prevent the stated commercial deployment |
| **Evidence Supports Intended Commercial Use with Conditions** | The evidence is largely sufficient, but one or more specific conditions must be met before or during commercial deployment |
| **Evidence Does Not Support Intended Commercial Use** | A specific, identified material risk prevents SI8 from assessing favorably — the issue is identified, not just suspected due to missing evidence |
| **Insufficient Supporting Evidence** | The submission does not provide enough evidence to reach a confident assessment — gaps are too significant to compensate for |
| **Unable to Reach Assessment** | Scope is outside SI8's operational bounds (post-No-List screen), the submission is incoherent, or a combination of factors prevents any meaningful assessment |

---

## Versioning Philosophy

This workbook is at version 0.1. It will be revised after each real assessment.

Version increments are triggered by:
- A control that proves unworkable in practice (split, merge, or reword)
- An evidence domain that was missing or misconfigured
- An outcome label that creates confusion with a real customer
- A section sequence that proves inefficient

Version increments do NOT require:
- Management approval
- Formal review cycle
- Retroactive application to previous assessments

Past assessments are logged under the workbook version they used. When Methodology v0.2 is ready, the workbook will be revised to match.

---

## Pre-Strategic OS Note

*Pre-Strategic OS source — Decision Quality classifications were not applied to Review Criteria, Chain of Title Schema, or CertForm PRD at time of creation. When those documents are directly cited in this workbook's operation, reviewers should treat their contents as operational guidance, not as validated methodology.*
