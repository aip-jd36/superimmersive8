# Rights Verified Verification — Project Overview

## What This Is

The Rights Verified is SI8's operational vetting process for AI-generated content. It is the core of SI8's value proposition: the judgment layer that separates SI8 from anyone who simply puts AI videos online.

This folder contains the process documentation — the HOW. It is not legal advice and does not constitute a legal guarantee. It is a documented workflow.

**Relationship to the Rights Playbook** (`06_Operations/legal/rights-playbook/`):
- The Rights Playbook covers the WHY: legal landscape, jurisdiction risk, tool risk tiers, platform policies, the No List.
- This project covers the HOW: what happens when a filmmaker submits work, what gets checked, what the output looks like.

Both must be understood together. The Rights Playbook provides the legal theory. The Rights Verified process applies that theory to real submissions.

---

## How the Documents Fit Together

| Document | Purpose | Audience |
|----------|---------|---------|
| `SUBMISSION-REQUIREMENTS.md` | What a filmmaker must provide | Filmmakers (external) |
| `REVIEW-PROCESS.md` | Step-by-step review workflow | SI8 internal reviewer |
| `REVIEW-CRITERIA.md` | Pass/fail thresholds per category | SI8 internal reviewer |
| `RIGHTS-PACKAGE-SCHEMA.md` | Structured output template per catalog entry | SI8 internal; referenced in buyer agreements |
| `EDGE-CASES.md` | Gray areas, judgment calls, precedents set | SI8 internal (grows over time) |
| `DECISIONS.md` | Version log, open questions, what changed and why | SI8 internal |

**Flow:**
1. Filmmaker receives `SUBMISSION-REQUIREMENTS.md` → fills it out and submits.
2. Reviewer runs `REVIEW-PROCESS.md`, applying thresholds from `REVIEW-CRITERIA.md`.
3. Clean pass → `RIGHTS-PACKAGE-SCHEMA.md` is completed for this work → entry added to catalog.
4. Any novel gray areas → logged in `EDGE-CASES.md`.
5. Process changes → logged in `DECISIONS.md`.

---

## Current Version Status

**v0.1 (February 2026) — Active**
- First usable version. Sufficient to run the first real submission.
- Not yet lawyer-reviewed. Conservative defaults on everything uncertain.
- Music rights: flag all edge cases; default to silence or original AI audio.
- See `DECISIONS.md` for open questions.

---

## Phase Roadmap

| Phase | Trigger | Focus |
|-------|---------|-------|
| **v0.1 (now)** | First filmmaker conversation | Define process clearly enough to run first real submission |
| **v0.2** | After 3 real submissions | Refine criteria from experience; add music rights guidance; document edge cases |
| **v0.3** | Lawyer review | Legal sign-off on authorship declaration language, schema, process |
| **v1.0** | First paid deal closes | Stable, lawyer-reviewed process; schema used in actual contracts |
| **Platform (Year 3)** | Platform build begins | Each schema field = a database column; pre-screen automated; human judgment = final gate |

---

## Year 3 Platform Vision

This process is designed from day one as if it will become a self-serve platform intake flow.

- `SUBMISSION-REQUIREMENTS.md` = the web intake form (same fields, same logic)
- `REVIEW-CRITERIA.md` = the automated pre-screen rules (Stage 1 only; human judgment for Stages 2-4)
- `RIGHTS-PACKAGE-SCHEMA.md` = the database schema (each field = a column)
- `EDGE-CASES.md` = the training data for edge case routing

The services phase is not a detour. It is the research phase for the platform. Every real submission is a data point.

---

## Internal Note

SI8's moat is not documentation. C2PA/Content Credentials will commoditize provenance documentation. SI8's moat is the judgment layer: subjective legal review, IP assessment, training data risk analysis — which software cannot automate. The Rights Verified process is what operationalizes that judgment.

The Chain of Title is the product. The content is the carrier.
