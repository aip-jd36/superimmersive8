# Rights Verified — Decisions Log

A record of what changed between versions, why, and what remains unresolved.

---

## v0.1 — February 18, 2026

**What triggered this version:**
- First filmmaker conversations expected (post-Instagram outreach)
- Need documented process before first real submission — not after
- Rights Verified must be operational before pitching to brand buyers

**What's in v0.1:**
- Full project structure (7 documents)
- Submission requirements (10 sections, filmmaker-facing)
- Review process (4-stage workflow, target <90 min per submission)
- Review criteria (7 categories, pass/fail thresholds)
- Chain of Title schema (9 fields, one per catalog entry)
- Edge cases log (initialized; empty until first real submission)
- 5-7 business day turnaround commitment

**Key decisions made:**
- **Platform-first design:** Process designed from day one to become Year 3 self-serve platform
  - Submission requirements = future web form fields
  - Review criteria Stage 1 = future automated pre-screen
  - Chain of Title fields = future database columns
- **9-field Chain of Title schema** resolved (was flagged as carry-forward in Rights Playbook)
- **Music rights v0.1 position:** Conservative default. Silence/original AI audio = Pass. Licensed with docs = Conditional (flag for legal review at v0.3). Unlicensed = Fail.
- **Kling stance:** Caution-Flagged tier (not rejected). Documented in Chain of Title. Affects exclusivity pricing for buyers.
- **Turnaround commitment:** 5-7 business days from complete submission
- **Human authorship minimum:** 150 words, substantive not padded
- **Intake capacity:** Maximum 10 submissions/month at v0.1

**Relationship to Rights Playbook:**
- Rights Playbook = WHY (legal landscape, theory, tool tiers, platform policies)
- This project = HOW (operational process, submission requirements, review workflow, output schema)

---

## Open Questions (v0.1)

**Don't let these block v0.1. Document as-is.**

**Turnaround commitment:**
- v0.1 standard: 5-7 business days
- May adjust once real submission volume known
- v0.2 review: actual turnaround vs. commitment

**Music rights:**
- Current: conservative. Flag all edge cases for legal review at v0.3.
- v0.3 goal: music rights guidance with lawyer sign-off
- Real submissions will test this immediately

**Kling exclusivity pricing:**
- Caution-Flagged works can be licensed, but buyers needing strong IP indemnification may require different pricing
- Pricing differential TBD in pricing framework (out of scope)
- Note in Chain of Title; sales team handles buyer conversation

**MyVideo platform requirements:**
- Not yet asked: what does MyVideo require for AI content documentation?
- May affect Chain of Title format for Taiwan deals
- Ask in first Jamie Lin conversation

**Tier pricing differential:**
- Certified (Firefly) vs. Standard (Runway/Sora) — does tier affect licensing price?
- Not resolved. Flagged for pricing framework development.
- Rights Verified assigns tiers. Pricing attaches to tiers separately.

**Shopping Agreement modification clause:**
- Required before any Tier 2 deal can close
- As of v0.1, Filmmaker Agreement is WIP (see 06_Operations/legal/filmmaker-agreement/)
- Rights Verified process notes modification clause status in Chain of Title (Field 5)
- Must resolve before first Tier 2 brand pitch

**Lawyer review (v0.3 target):**
- Human authorship declaration — legally adequate?
- Chain of Title schema — adequate documentation for commercial use?
- Overall process — create or limit SI8's liability exposure?
- Music rights guidance — specific to APAC distribution
- Not blocker for v0.1. First 3 submissions reveal what needs attention most.

---

## Phase Roadmap

| Phase | Trigger | Focus |
|-------|---------|-------|
| **v0.1 (current)** | First filmmaker conversation | Define process for first real submission |
| **v0.2** | After 3 real submissions | Refine criteria from experience; document edge cases |
| **v0.3** | Lawyer review | Legal sign-off on authorship, schema, process |
| **v1.0** | First paid deal closes | Stable, lawyer-reviewed; schema in buyer agreements |
| **Platform** | Year 3 build | Fields = database columns; pre-screen automated |

---

## What's Next

**Before v0.2:**
- Complete first 3 real submissions
- Document all edge cases encountered
- Measure actual review time vs. 90-min target
- Assess 10/month intake cap

**Before v0.3:**
- Schedule lawyer review
- Compile all music rights edge cases from real submissions
- Finalize modification clause in Filmmaker Agreement

**Before v1.0:**
- Close first paid licensing deal
- Update schema based on v0.3 lawyer feedback
- Reference schema in actual buyer agreement

---

## v0.1 Post-Launch Updates — February 18, 2026

**What triggered these updates:**
Pre-launch comprehensive review of submission requirements identified 6 critical gaps (licensing traps) that needed immediate addition before first real submission.

**Changes made (v0.1 amendments, not new version):**

1. **Licensed likenesses allowed (Section 5)** — Updated from binary "no identifiable person" to allow documented consent/licenses
   - Added table for person name, likeness type, documentation type, scope, date
   - Required: signed release/agreement covering commercial use, AI derivatives, third-party licensing
   - Conservative standard: ambiguous consent scope → Conditional, not Pass

2. **Licensed IP allowed (Section 6)** — Updated from binary "no IP imitation" to allow documented permissions
   - Added table for IP name, type, rights holder, documentation, scope
   - Parody/fair use claims explicitly flagged: require legal review, not approved unilaterally in v0.1

3. **Underlying rights disclosure (Section 2)** — Added question: "Is this adapted from existing material?"
   - If yes, must provide documentation of rights ownership or written permission
   - Catches: filmmaker adapts novel/screenplay without permission

4. **Third-party assets disclosure (Section 3)** — Added checklist: stock footage, fonts, SFX, overlays, LUTs
   - Many have licensing restrictions (commercial fonts, SFX packs, etc.)
   - Required: list each asset + provide license documentation in Section 10

5. **Existing brand placements (Section 8)** — Added question under Tier 2 enrollment
   - Critical for Tier 2: can't place Coke in film that already has Pepsi
   - Populates Category Conflict Log in Chain of Title

6. **Chain of Title schema expanded (Field 3)** — Added disclosure sections for:
   - Licensed Likenesses (if any)
   - Licensed IP (if any)
   - Underlying Rights (original vs. adapted)
   - Third-Party Assets (if any)
   - Existing Brand Placements (added to Field 6 Category Conflict Log)

**Updated files:**
- SUBMISSION-REQUIREMENTS.md — Sections 2, 3, 5, 6, 8, 10
- REVIEW-CRITERIA.md — Categories 3, 4 (updated Pass/Conditional/Fail thresholds)
- REVIEW-PROCESS.md — Stage 2 Categories 1, 3, 4, 7 (added verification steps)
- CHAIN-OF-TITLE-SCHEMA.md — Field 3 (expanded), Field 6 (existing brand placements)

---

## Deferred to v0.2

**Items identified during v0.1 review but deferred until after first 3 real submissions:**

These will be reviewed for inclusion when versioning to v0.2 (after 3 real submissions provide evidence of need).

**7. Collaboration / co-creators disclosure (Section 2):**
- Question: "Did anyone else contribute creative input (co-director, editor, collaborator)?"
- Affects: who signs Shopping Agreement, revenue splits, credits
- Deferred because: v0.1 assumes single filmmaker submission; complexity can be handled case-by-case initially

**8. Technical specs (Section 10):**
- Aspect ratio (16:9, 9:16, 1:1, other)
- Resolution (4K, 1080p, 720p)
- Frame rate (24fps, 30fps, 60fps)
- Deferred because: can be obtained from deliverable file; not critical for rights review

**9. Public exhibition history:**
- Question: "Has this work been publicly exhibited (festivals, YouTube, social media, broadcast)?"
- Affects: Is it already "out there"? Any takedown history?
- Deferred because: doesn't affect rights verification; more relevant for exclusivity negotiations

**10. Parody/fair use policy clarification (Section 6):**
- v0.1 stance documented: claimed fair use flagged for legal review, not approved unilaterally
- v0.2 may add clearer guidance after lawyer review at v0.3

**11. Company vs. individual submission (Section 1):**
- Affects contracts, invoicing, liability
- Deferred because: can be handled in Shopping Agreement; not critical for intake form

**12. Marketing tracking (Section 1):**
- Question: "How did you hear about SI8?"
- Deferred because: not critical for rights review; can track separately

**13. Property/location rights:**
- Question: "Any identifiable buildings/landmarks with property rights?"
- Example: Eiffel Tower at night requires permission, certain stadiums
- Deferred because: complex and rare; can be handled as edge case initially

**14. Minor content disclosure:**
- Question: "Does this work depict minors (under 18)?"
- Affects: brand safety, requires extra caution
- Deferred because: covered under brand safety assessment (Category 5); doesn't need separate field yet

**15. Legal history:**
- Question: "Has this work ever been subject to legal claims, takedown requests, or disputes?"
- Red flag question
- Deferred because: extreme edge case; if it comes up, will be obvious in filmmaker conversation

**Review trigger:** After 3 real submissions, assess which deferred items should be added based on:
- Did any submissions raise these issues?
- Would having these fields upfront have improved review efficiency?
- Do any represent unaddressed risk?

---

*(Add new entry each time version is cut)*
