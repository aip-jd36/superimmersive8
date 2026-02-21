# Rights Verified — Decisions Log

A record of what changed between versions, why, and what remains unresolved.

---

## v0.1 — February 2026

**What triggered this version:**
- First filmmaker conversations expected (post-Lunar New Year)
- Need a documented process before the first real submission — not after
- Rights Verified must be operational before pitching Tier 2 to any brand buyer

**What's in v0.1:**
- Full project structure (7 documents)
- Submission requirements (10 sections, filmmaker-facing)
- Review process (4-stage workflow, target <90 min per submission)
- Review criteria (7 categories, pass/fail thresholds)
- Chain of Title schema (9 fields, one per catalog entry)
- Edge cases log (initialized; empty until first real submission)
- 5-business-day turnaround commitment (v0.1 standard)

**Key decisions made in this version:**
- Process designed from day one as if it will become a Year 3 self-serve platform intake flow
  - Submission requirements = future web form fields
  - Review criteria Stage 1 = future automated pre-screen rules
  - Chain of Title schema fields = future database columns
- 9-field Chain of Title schema resolved here (was flagged as v0.2 carry-forward item in Rights Playbook DECISIONS.md — now resolved and documented in RIGHTS-PACKAGE-SCHEMA.md)
- Music rights v0.1 position: conservative default. Silence or original AI audio = Pass. Licensed with documentation = Conditional (flag for legal review at v0.3). Unlicensed = Fail.
- Kling training data clause: work produced with Kling = Caution-Flagged tier, not rejected. Documented in Chain of Title. Affects exclusivity pricing for buyers requiring strong IP indemnification.
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
- Note in Chain of Title for now; sales team handles buyer conversation

**MyVideo platform requirements:**
- Jamie Lin connection has not been asked yet: what does MyVideo require for AI content documentation?
- May affect Chain of Title format for Taiwan-facing deals
- Flag: ask in first conversation. Note result here.

**Tier pricing differential:**
- Certified (Firefly only) vs. Standard (Runway/Pika/Sora) — does tier affect licensing price?
- Not resolved. Flagged for pricing framework development (separate workstream)
- Rights Verified process does not set prices — it assigns tiers. Pricing attaches to tiers separately.

**Shopping Agreement modification clause:**
- Required before any Tier 2 deal can close
- As of v0.1, Filmmaker Agreement is a work in progress (see `06_Operations/legal/filmmaker-agreement/`)
- Rights Verified process notes modification clause status in Chain of Title (Field 5)
- This dependency must be resolved before first Tier 2 pitch to a brand

**Lawyer review (v0.3 target):**
- Human authorship declaration language — is the current standard legally adequate?
- Chain of Title schema — does it constitute adequate documentation for commercial use?
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

---

## v0.1 — Post-Peer-Review Updates (February 2026)

**What triggered these updates:**
External peer review of v0.1 (ChatGPT + Gemini). Both independently flagged file integrity and Tier 2 regeneration copyright as the highest-priority gaps.

**Changes made (not a new version — amendments to v0.1):**

- **Field 10 added to Chain of Title schema:** SHA-256 file hash + file specs. Ties the Chain of Title to a specific reviewed file. Invalidated by any post-review modification to the file. Hash generated at Stage 4 before issuing the package.
- **Hash step added to Stage 4 (REVIEW-PROCESS.md):** First step of clean pass workflow. Must be generated from the master delivery file before it leaves reviewer possession.
- **Section 8 rewritten in SUBMISSION-REQUIREMENTS.md:** Reframed from "Modification Rights Authorization" (rights-grant framing) to "Tier 2 Brand Placement — Enrollment (Optional)" (income-opportunity framing). Legal substance unchanged; psychological framing inverted.
- **Intake capacity policy added to REVIEW-PROCESS.md:** 10 submissions/month cap at v0.1. Fast reject within 48 hours for Stage 1 failures. 5-business-day SLA clock starts only after Stage 1 confirmed complete.
- **Tier 2 regeneration copyright flagged for lawyer brief:** The unresolved question of who owns AI-regenerated Tier 2 scenes (original filmmaker vs. SI8) has been added to `06_Operations/legal/filmmaker-agreement/lawyer-briefs/brief-v1.md` as a specific question with three structural options (filmmaker-as-principal, SI8-as-owner, hybrid). Must be resolved before first Tier 2 pitch to any brand.

**Not addressed in this update (deferred):**
- Re-review triggers (what changes force a new Chain of Title)
- Third-party asset disclosure (fonts, SFX, overlays)
- Reviewer ID depersonalization for Year 3 scale
- Reverse face search step in Stage 2 Cat 3
- Watermark ghost / artifact scan
- ComfyUI / custom workflow tool handling

*(Add new entry each time a version is cut)*
