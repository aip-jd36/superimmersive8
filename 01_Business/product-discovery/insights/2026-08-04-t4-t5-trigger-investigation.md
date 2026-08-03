# Product Insight: The Enterprise Trigger (T4/T5) Is Almost Never Observed
**Date:** 2026-08-04
**Version impact:** Tests the core Commercial Assurance (Layer 2) wager directly
**Status:** Hypothesis-testing investigation — not a validated conclusion either way

---

## The question

Following the Pain A (documentation-production) vs. Pain B (independent-assurance) analysis, JD and ChatGPT proposed a sharper three-layer model:

- **Layer 1 — Production Documentation:** "How do I document how this was made?" (Anchor Film, C2PA, prompt logging solve this — not SI8)
- **Layer 2 — Commercial Assurance:** "Is the documentation actually sufficient for legal/procurement/enterprise approval?" (SI8)
- **Layer 3 — Enterprise Trigger Event:** what converts Layer 2 from latent risk into an active buying problem?

Two competing explanations for why Layer 2 hasn't shown up as a consciously-felt pain in outbound data:

- **Possibility A** — Commercial Assurance is simply too early; the risk exists but the trigger rarely occurs today.
- **Possibility B** — Commercial Assurance is only valuable *after* a specific trigger event, and SI8 has never instrumented for that trigger specifically.

This entry investigates whether the trigger itself — not messaging, not ICP — has ever actually been observed.

---

## Method

Searched every available data source beyond the original 642-reply LinkedIn CSV: `CRM.md` (full grep + manual read of every hit), `DISCOVERY-PIPELINE.md`, `DISCOVERY-PERFORMANCE-LOG.md` (258KB, grepped), and all 4 real call-notes files (Oliyah Joseph, Tim Deussen, Sofia Yan, Alice Feng/Anchor Film). Re-mined the previously-read LinkedIn dataset under a new classification scheme. One source checked and explicitly ruled out: `DISCOVERY-CALLS-ANALYSIS-MARCH-2026.md` is pre-pivot (old Getty-style marketplace model) and contains no Commercial Assurance-relevant customer data.

**Classification taxonomy (T0–T5):**
- T0 — no workflow discussed
- T1 — content creation only
- T2 — documentation produced
- T3 — internal governance ("our legal team reviews it")
- T4 — external acceptance event (client review, legal review, procurement, compliance — actually happened)
- T5 — post-delivery risk (dispute, claim, insurance denial, audit, litigation)

First pass covered the base Legal Friction sequence heavily but under-covered the FinServ, EU AI Act, and NY Law sequences specifically — corrected in a follow-up pass (see Correction section below). Every quote below is verified against source; confidence is labeled Observed / Reasonable inference / Speculation per the original request.

---

## Finding 1: T5 is a clean zero

**No T5 evidence exists anywhere in any source searched.** Not rare — never found once. No dispute, claim, litigation, insurance denial, or audit failure is described by any contact, in any channel, at any point in ~5 months of outreach and relationship notes. This directly undercuts the E&O/insurance-trigger hypothesis (Test 12 in `SPLIT-TEST-LOG.md`, also tracked as an open question) — it remains untested against zero supporting data, not weakly supported.

## Finding 2: T4 evidence exists but is extremely rare (~1% base rate) and clusters in large/institutional buyers

Six confirmed T4 examples across the entire investigation, against several hundred distinct contacts:

| Lead | Quote | Source | Confidence |
|---|---|---|---|
| **Ramez Tabshi** | *"Currently sends technical PDF (tools, data handling, security) — partially satisfies; follow-ups come."* / *"once their legal teams get involved, conversation immediately shifts to IP ownership and copyright risks… That IP and commercial licensing document is exactly what they are looking for."* | **JD personal email Q&A**, logged in `CRM.md` — not the LinkedIn thread | Observed. Single strongest data point — his own documentation is described as only partially satisfying reviewers, with recurring follow-ups. |
| **Myron Stapleton** | *"their legal and procurement teams are incredibly strict — they demand full proof of ownership, rights, origin and compliance for everything we deliver... It's honestly become one of the biggest hurdles to getting campaigns and projects signed off quickly."* (government/health-board clients) | LinkedIn, base Legal Friction | Observed — recurring operational obstacle, no single dated incident. |
| **Justin Lufair Brown (Amazon)** | *"Contract language around this has tightened a lot in the last 12 months... we're responsible for outputs being clear of third-party rights claims."* | LinkedIn, base Legal Friction | Observed — real contractual shift; T3/T4 boundary. |
| **Josh Guillaume** | *"We've had a couple clients initially say they want us to track and provide text prompts and entire workflow for their review, but we generally communicate that would slow the process."* | LinkedIn, base Legal Friction | Observed — real T4 request, negotiated away rather than complied with. |
| **Alex Jenkins (Nexus Studios)** | *"I know one of my clients want us to document whenever we use AI, I suspect this will be the steps towards this."* | LinkedIn, **EU AI Act sequence** | Observed — missed in the first pass, recovered in correction. |
| **Aaron D. Settipane (Sony Pictures)** | *"I'm not in those conversations so I don't know what they specifically say for a vetting at the procurement level."* | LinkedIn, **Who's Asking/NY Law sequence** | Observed — confirms a procurement-level vetting process exists at Sony even though he's not personally in it; missed in the first pass. |

**T3 (internal governance confirmed, not yet an external event) for context:** Ivan Petruzzelli (State Street — machine-readable audit brief, real), Jon Draper (Synima — building internal AI production auditing/lineage-export/governance checks), James T (Connect Management — active flow-down "prohibited tools" policy), William Finkel (Hello Sunshine — describes the full B2B2B cascade mechanism as real company policy, but explicitly states no AI productions are currently active there), Daniele Zennaro (AiYR4 — T3/T4 boundary, describes current pressure but softened), Karina L (proactive contract clause blocking tool-choice disputes — inferential risk-awareness, not an observed event).

**Explicit T4/T5 denials, for base-rate context:** Michele Hill (Clearance Pro test — "I have not seen any brand clients starting to add any documentation requirements... as of yet"), Cory Warfield ("It hasn't"), Hugo Barbera ("We never got anything rejected in more than 3 years"), Brian Cox/Inworld AI ("no, there are no legal teams asking any questions"), Oliyah Joseph & Paul ("We're not being asked for this... this is more for the future" — plus a pointed skepticism about whether third-party assurance would even carry legal weight: *"Anybody can sign a bit of paper — how legal is the document you sign off on anyway?"*).

## Correction: per-campaign coverage was uneven in the first pass

Re-checked specifically after JD asked whether FinServ/EU Act/NY Law campaigns were covered:

- **Legal Friction — FinServ (both variants, 7 replies, England + New York):** clean null result. Zero T3+ signal — every reply was an outright decline or explicit non-knowledge (Brian Grant, Alina Baimatova, Devin Curry, Alon Bendory). The campaign explicitly targeting finserv produced *less* trigger evidence than the unfiltered base sequence.
- **EU AI Act (23 replies):** mostly T0–T2 ("not yet," "already covered internally," no genAI in production), but recovered two real signals on correction (Alex Jenkins — T4; Daniele Zennaro — T3/T4 boundary).
- **Who's Asking/NY Law family:** reasonably covered in the first pass (James T included); recovered two more on correction (William Finkel — T3; Aaron Settipane — T3/T4).

**Notable implication:** every corrected T4 example comes from either the base (unfiltered) Legal Friction sequence or the general EU Act/NY Law pool — **none** come from the dedicated FinServ campaign specifically, which is the one campaign explicitly labeled/targeted for the HGE-adjacent hypothesis. This is a small but real data point that the trigger may correlate with landing on large/institutional buyers *regardless of finserv labeling*, not because a finserv label itself does the targeting work. Worth weighing directly in Standing Encore's HGE/SCE design.

---

## Time trend

**Insufficient data.** The 6 T4 examples are scattered March–July 2026 with no even spacing. N=6 cannot support an "increasing vs. flat" claim in either direction — reporting a trend here would be manufacturing a pattern the data doesn't contain.

---

## Verdict: Possibility A vs. B

Neither cleanly — **closer to B, but weakly, and not yet at a volume that rules out A.**

Evidence for B: the six T4 signals are not randomly distributed. Every one sits inside a large, institutional, or regulated-adjacent buyer relationship (State Street, government/health-board clients, Amazon, Sony Pictures, a Dubai enterprise-clients agency, an EU-Act-adjacent London ECD) — none from a small agency or general consumer brand. That's a real, if thin, pattern.

Evidence against declaring B confirmed: 6 data points against several hundred contacts (base rate under 1%) is too thin to rule out that the trigger is simply rare *everywhere right now*, including inside the HGE segment specifically. Standing Encore's actual job is to find out whether the pattern holds at real volume in a deliberately-built HGE population, or thins out to the same near-zero rate as the general pool once examined closely.

---

## Product implication

- Do not build messaging or a product roadmap around "the trigger is common" — it isn't, in observed data.
- Do not treat the E&O/insurance angle (T5) as validated — it has zero supporting evidence anywhere, not weak evidence.
- The concentration of T4 signal in large/institutional buyers is directionally useful for Standing Encore's HGE hypothesis, but the FinServ-campaign null result is a real caution against assuming a finserv *label* alone finds it — targeting by actual company scale/institutional character may matter more than industry-sector labeling.
- Recommend tracking T4 mentions as their own explicit metric in Standing Encore's read-out, separate from reply rate and T1/T2/T3 classification, since it's the rarer and more decision-relevant signal.

**Deep-dive companion:** none — this file is the deep-dive.
**Related:** `03_Sales/outreach/SPLIT-TEST-LOG.md` (Test 12, E&O hypothesis — still zero supporting data after this investigation); `06_Operations/institutional-knowledge/` Living Notebook (this finding was deliberately kept out of the Living Notebook — it's customer/GTM research, not reviewer-methodology knowledge, so it belongs here instead, consistent with the notebook's own scope exclusion).
