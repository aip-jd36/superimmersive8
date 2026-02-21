# Rights Verified Review Criteria

**Version:** v0.1 (February 2026)
**Audience:** SI8 internal reviewer
**Purpose:** Pass/fail thresholds for each review category. Removes ambiguity from the judgment layer where judgment is not needed. Reserves human judgment for genuine gray areas.

---

## How to Use This Document

For each of the seven categories, apply the criteria listed. If the submission clearly meets the Pass criteria, mark Pass. If it clearly meets the Fail criteria, mark Fail. If it falls in between, apply the Conditional or Flag guidance. Novel gray areas that don't fit existing criteria → log in EDGE-CASES.md.

---

## Category 1: Tool & Plan Verification

**What's being checked:** Every AI tool used in production has a paid commercial license; every tool is on the Approved or Caution tier list.

**Pass:**
- All tools listed are on the Approved or Caution tier list (see Rights Playbook for current tier assignments)
- Paid plan receipts or subscription confirmations are on file for every tool
- Every tool's commercial license status is confirmed (see Rights Playbook commercial use table)

**Fail:**
- Any Prohibited or High-Risk tool used as a primary generation source (e.g., Hailuo, non-commercial plans of any tool)
- Missing receipts for any tool — cannot confirm commercial authorization

**Flag (note in Chain of Title, work may still pass):**
- Caution-tier tool (e.g., Kling) used as primary or significant tool → note in Chain of Title; affects exclusivity pricing for buyers who require strong IP indemnification
- Tool version cannot be confirmed (older version, unclear what model was used) → note; affects traceability

**Reviewer note:** Tool tier list is maintained in the Rights Playbook and will be updated as tool ToS change, litigation landscapes shift, and new tools emerge. Always check the current list, not memory.

---

## Category 2: Human Authorship Evidence Quality

**What's being checked:** The Human Authorship Declaration (Section 4) demonstrates meaningful human creative direction over the work — sufficient to establish that the work reflects human authorship, not autonomous AI generation.

**Pass:**
- Declaration describes specific iteration decisions (what was tried, what was kept, why)
- Declaration describes editorial choices (pacing, structure, scene selection, composition)
- Declaration describes post-generation editing if any occurred
- Reading the declaration, you can understand the creative decisions the filmmaker made
- Minimum 150 words — and those words are substantive, not padding

**Fail:**
- Generic language only: "I wrote prompts and selected outputs" with no specifics
- AI clearly made all meaningful creative decisions and filmmaker made only trivial choices
- Declaration contradicts the work itself (e.g., claims heavy editing but work shows pure generation artifacts with no editing)

**Conditional (request expansion before deciding):**
- Declaration is substantive but brief — filmmaker clearly made decisions but didn't describe them in detail
- Some categories of decision described well, others missing entirely (e.g., good on prompts, silent on post-production)
- When requesting expansion: specify exactly which decisions need more detail. Do not ask for generic "more."

**Reviewer note:** This category is the copyright protection layer. US Copyright Office (as of late 2024) requires meaningful human authorship for copyright registration. Taiwan and Singapore law follow similar principles. A strong declaration is in the filmmaker's interest. Help them understand that — it protects them, not just SI8.

---

## Category 3: Likeness & Identity

**What's being checked:** No identifiable real person's face, voice, or identity appears in the work without documented consent.

**Pass:**
- All faces are clearly synthetic and non-identifiable — no real specific person could be identified
- All voices are original or AI-generated with no specific real-person identity
- No character clearly evokes a specific real person even through costume, setting, or context

**Fail:**
- Any identifiable real-person face appears without documented consent
- Any voice that is a clone or imitation of a specific real person without consent
- Any character that is clearly meant to represent a real person (even if slightly altered)
- Any doubt on any of the above

**Hard line: No exceptions. No gray area. If a face is possibly identifiable, it fails.**

This is the category with the highest legal exposure and the most direct reputational risk. The existence of "probably fine" is not a pass in this category. Only clear passes pass.

**Reviewer note:** Lookalike test — ask yourself: if this work were published and a journalist wrote about it, would any reasonable viewer say "that looks like [specific real person]"? If yes, it fails.

---

## Category 4: IP & Brand Imitation

**What's being checked:** No copyrighted characters, protected trade dress, or trademarked identifiers appear without authorization.

**Pass:**
- No character, creature, logo, or brand element that would be recognized as belonging to a real IP holder
- No content that replicates or parodies real brand trade dress (distinctive color combinations, packaging, visual identity)
- No trademarked slogans, logos, or identifiers

**Fail:**
- Clear imitation of a copyrighted character (e.g., a character that is clearly a real film/game/TV character, even if not pixel-identical)
- Protected trade dress replicated in a way that would cause consumer confusion
- Trademarked logos or identifiers visible and identifiable

**Gray (log in EDGE-CASES.md; do not approve unilaterally):**
- Ambiguous similarity — character shares some features with real IP but is not clearly the same
- Stylistic reference to real brands but not direct imitation
- Parody that may or may not qualify for fair use (this requires legal review, not reviewer judgment)

**Reviewer note:** The standard is: would a reasonable IP holder's lawyer send a cease-and-desist? If yes, it fails. If unsure, log as gray area and flag for legal review at v0.3.

---

## Category 5: Brand Safety

**What's being checked:** Whether the content is suitable for commercial brand attachment, and which brand categories are appropriate.

**Pass:**
- Content is suitable for mainstream commercial brand attachment with no restrictions
- OR content has specific restrictions that can be clearly documented in the Chain of Title category conflict log

**Conditional (suitable for some categories, not others):**
- Content has mature themes but no explicit content → suitable for most brands; not suitable for children's, family, or certain regulated categories (pharma, healthcare, financial services targeting retail consumers)
- Content involves any of the following → document restriction in category conflict log: alcohol, gambling, political content, competitors in specific verticals
- Document the restriction precisely: "Not suitable for [category] due to [specific element in scene X at timestamp Y]"

**Fail:**
- Content that no mainstream commercial brand could attach to:
  - Graphic violence (realistic or prolonged)
  - Sexual content (explicit or strongly implied)
  - Political persuasion or propaganda
  - Drug use (celebratory or instructional)
  - Any content on the No List

**Reviewer note:** This category is subjective by nature. Use the question: "Would a Fortune 500 brand's marketing team approve this for their brand?" If yes, Pass. If yes-with-restrictions, Conditional and document. If no, Fail. When in doubt, document restrictions rather than failing — restrictions are useful data for buyers.

---

## Category 6: Audio & Music Rights

**What's being checked:** Every audio element is either original AI-generated with a commercial license, licensed with documentation, or absent.

**Pass:**
- All audio is original AI-generated using paid commercial plans (receipts on file)
- All licensed audio has documentation: license type, licensor name, license file, coverage scope confirms this use
- Work is silent (no audio)

**Fail:**
- Unlicensed commercial music (recognizable tracks, commercial releases) used without license documentation
- "Licensed" claimed but no documentation provided
- Audio license doesn't cover commercial use or the specific territory/medium

**Conditional (flag for legal review at v0.3; do not approve unilaterally in v0.1):**
- Licensed music with documentation but unusual terms (e.g., "for personal use," sync license that may not cover AI integration)
- AI-generated music from a tool whose commercial license scope is unclear
- Music from platforms with "royalty-free" claims that may not actually cover commercial distribution

**v0.1 default position:** Music rights are complex. SI8 does not have a lawyer on retainer yet. When uncertain, default to the conservative position: flag as Conditional, note in DECISIONS.md, and require filmmaker to either (a) replace with original AI audio, or (b) wait for legal review at v0.3. Do not approve uncertain music rights.

**Reviewer note:** "Royalty-free" does not mean "free of all licensing obligations." It means no per-use royalties. Many royalty-free licenses still restrict commercial use, AI integration, or specific distribution channels.

---

## Category 7: Modification Rights (Tier 2 Gate)

**What's being checked:** Whether the filmmaker has authorized SI8 to commission AI-regenerated brand-integrated versions for Tier 2 product placement deals.

**Authorized — Full Work:**
- Tier 2 eligible (all scenes)
- Note: Shopping Agreement must include modification clause. If it doesn't, Tier 2 cannot be offered until agreement is amended. Note this in Chain of Title.

**Authorized — Specific Scenes:**
- Tier 2 eligible for specified scenes only
- Document scene list precisely in Chain of Title
- Note modification clause requirement as above

**Not Authorized:**
- Tier 1 only. Note clearly in Chain of Title.
- Filmmaker can update authorization at any time (requires Chain of Title update and re-review of this category only)

**Scope note:** The scope of modification authorization affects what Tier 2 placement products can be offered. Full authorization = maximum flexibility. Scene-specific = limited to those scenes. This information is passed to the sales team when Tier 2 deals are being structured.

---

## Summary Table

| Category | Hard Fail | Conditional | Human Judgment Required |
|----------|-----------|-------------|------------------------|
| 1. Tool & Plan | Prohibited tool as primary; missing receipts | Caution-tier tool | Tool tier list edge cases |
| 2. Human Authorship | Pure AI / generic declaration | Substantive but brief | Borderline authorship quality |
| 3. Likeness | Any identifiable real person | N/A — this is binary | N/A — if in doubt, fail |
| 4. IP & Brand Imitation | Clear copyrighted character / trade dress | Ambiguous similarity | Parody / fair use questions |
| 5. Brand Safety | No-go content | Category restrictions | Ambiguous content appropriateness |
| 6. Audio & Music | Unlicensed commercial audio | Unclear license scope | Music rights complexity |
| 7. Modification Rights | N/A — this is a filmmaker choice | Missing Shopping Agreement clause | Scope interpretation |
