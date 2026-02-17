# Safe Lane — Decisions Log

A record of what changed between versions, why, and what remains unresolved.

---

## v0.1 — February 2026

**What triggered this version:**
- First filmmaker conversations expected (post-Lunar New Year)
- Need a documented process before the first real submission — not after
- Safe Lane must be operational before pitching Tier 2 to any brand buyer

**What's in v0.1:**
- Full project structure (7 documents)
- Submission requirements (10 sections, filmmaker-facing)
- Review process (4-stage workflow, target <90 min per submission)
- Review criteria (7 categories, pass/fail thresholds)
- Rights Package schema (9 fields, one per catalog entry)
- Edge cases log (initialized; empty until first real submission)
- 5-business-day turnaround commitment (v0.1 standard)

**Key decisions made in this version:**
- Process designed from day one as if it will become a Year 3 self-serve platform intake flow
  - Submission requirements = future web form fields
  - Review criteria Stage 1 = future automated pre-screen rules
  - Rights Package schema fields = future database columns
- 9-field Rights Package schema resolved here (was flagged as v0.2 carry-forward item in Rights Playbook DECISIONS.md — now resolved and documented in RIGHTS-PACKAGE-SCHEMA.md)
- Music rights v0.1 position: conservative default. Silence or original AI audio = Pass. Licensed with documentation = Conditional (flag for legal review at v0.3). Unlicensed = Fail.
- Kling training data clause: work produced with Kling = Caution-Flagged tier, not rejected. Documented in Rights Package. Affects exclusivity pricing for buyers requiring strong IP indemnification.
- Turnaround commitment: 5 business days from receipt of complete submission (v0.1)
- Human authorship declaration minimum: 150 words, substantive not padded

**Relationship to Rights Playbook:**
- Rights Playbook (`06_Operations/legal/rights-playbook/`) = WHY (legal landscape, theory, tool risk tiers, platform policies)
- This project = HOW (operational process, submission requirements, review workflow, output schema)
- Rights Playbook DECISIONS.md `v0.1` entry had 9-field schema flagged as "v0.2 carry-forward" — now marked resolved; schema lives in RIGHTS-PACKAGE-SCHEMA.md

---

## Open Questions (v0.1)

Document these as-is. Do not block v0.1 on resolving them.

**Turnaround commitment:**
- v0.1 standard: 5 business days from complete submission
- May need adjustment once real submission volume is known
- v0.2 review: actual turnaround vs. commitment

**Music rights:**
- Current stance: conservative. Flag all edge cases for legal review at v0.3.
- v0.3 goal: music rights guidance with lawyer sign-off
- Real submissions will test this immediately — expect first edge cases here

**Kling exclusivity pricing:**
- Caution-Flagged works (Kling as primary tool) can be licensed, but buyers needing strong IP indemnification may require discounts or category-exclusives at different pricing
- Pricing differential: TBD in pricing framework (out of scope for this project)
- Note in Rights Package for now; sales team handles buyer conversation

**MyVideo platform requirements:**
- Jamie Lin connection has not been asked yet: what does MyVideo require for AI content documentation?
- May affect Rights Package format for Taiwan-facing deals
- Flag: ask in first conversation. Note result here.

**Tier pricing differential:**
- Certified (Firefly only) vs. Standard (Runway/Pika/Sora) — does tier affect licensing price?
- Not resolved. Flagged for pricing framework development (separate workstream)
- Safe Lane process does not set prices — it assigns tiers. Pricing attaches to tiers separately.

**Shopping Agreement modification clause:**
- Required before any Tier 2 deal can close
- As of v0.1, Filmmaker Agreement is a work in progress (see `06_Operations/legal/filmmaker-agreement/`)
- Safe Lane process notes modification clause status in Rights Package (Field 5)
- This dependency must be resolved before first Tier 2 pitch to a brand

**Lawyer review (v0.3 target):**
- Human authorship declaration language — is the current standard legally adequate?
- Rights Package schema — does it constitute adequate documentation for commercial use?
- Overall process — does it create or limit SI8's liability exposure?
- Music rights guidance — specific to APAC distribution
- Not a blocker for v0.1. First 3 real submissions will reveal what needs legal attention most urgently.

---

## Phase Roadmap

| Phase | Trigger | Focus |
|-------|---------|-------|
| **v0.1 (current)** | First filmmaker conversation | Define process clearly enough to run first real submission |
| **v0.2** | After 3 real submissions | Refine criteria from experience; add music rights guidance; document edge cases accumulated |
| **v0.3** | Lawyer review | Legal sign-off on authorship declaration, schema, overall process |
| **v1.0** | First paid deal closes | Stable, lawyer-reviewed process; schema referenced in actual buyer agreements |
| **Platform** | Year 3 build begins | Each field = database column; pre-screen automated; human judgment = final gate |

---

*(Add new entry each time a version is cut)*
