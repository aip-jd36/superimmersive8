# Decision Quality Audit v0.1
**Date:** 2026-07-02
**Auditor:** Chief of Staff (Claude)
**Status:** PENDING JD REVIEW — no documents updated until approved
**Scope:** CLAUDE.md, ICP-DEFINITIONS.md, call notes (Sofia Yan), AI-COPYRIGHT-RESEARCH-2026.md
**Next audit:** End of next report cycle (est. July 2026)

---

## How to Use This Audit

Each entry identifies a statement that appears to have drifted between classifications — a Hypothesis presented as a Fact, a Decision justified as objective truth, a Principle hidden inside a factual claim. No documents have been changed.

For each entry, options are:
- **Accept** — reclassify as proposed; Claude will update the document
- **Reject** — keep current classification with a note explaining why
- **Defer** — note what evidence would resolve it

---

## Findings

### F01 — "C2PA will commoditize provenance metadata"

| Field | Value |
|-------|-------|
| **Source** | CLAUDE.md — "SI8's moat = judgment layer: C2PA/Content Credentials will commoditize provenance metadata." |
| **Current classification** | Stated as strategic FACT |
| **Proposed classification** | HYPOTHESIS |
| **Why** | "Will commoditize" is a prediction about market evolution — C2PA adoption is still early, Trust List requirements are tightening (not loosening), and commoditization timeline is unknown. No evidence yet that agencies treat C2PA as sufficient without human review. |
| **Validation method** | Track whether C2PA adoption increases without a corresponding increase in SI8 demand — that would indicate commoditization. Counter-evidence: any buyer who says "we already have C2PA, we don't need SI8." |
| **Note** | The adjacent claim — "SI8's value is subjective legal review that cannot be automated" — is a PRINCIPLE (P4), not a Fact. Can be separated. |

---

### F02 — "Opt-in flywheel" presented as business logic

| Field | Value |
|-------|-------|
| **Source** | CLAUDE.md — "Opt-in flywheel: More verifications → more opt-ins → larger catalog → more buyer traffic → more verifications." |
| **Current classification** | Stated as strategic FACT / business model mechanic |
| **Proposed classification** | HYPOTHESIS |
| **Why** | The flywheel has three unvalidated links: (1) verified creators actually opt into the Showcase; (2) catalog volume increases buyer traffic; (3) buyer traffic generates more verifications. None of these links have been observed in operation — the platform has had only one paid submission. |
| **Validation method** | Observe after 10 SI8 Certified verifications: what % opt into Showcase? After 20 Showcase entries: does inbound licensing traffic increase? |

---

### F03 — "Two confirmed ICPs" overstates ICP status

| Field | Value |
|-------|-------|
| **Source** | ICP-DEFINITIONS.md header — "Status: Two confirmed ICPs with supporting pipeline data." |
| **Current classification** | FACT (confirmed) |
| **Proposed classification** | ICP 1a: HYPOTHESIS with strong supporting signals. ICP 2: HYPOTHESIS with early signals. |
| **Why** | "Confirmed ICP" typically means buyers have converted (paid). What's been confirmed is the pain pattern — verbatim quotes from real people describing the exact problem SI8 solves. That is evidence for the hypothesis, not proof of it. No ICP 1a lead has purchased an SI8 Certified package at full price through normal sales motion. ICP 2 has even thinner evidence — 1 strong T1 signal (Justin Brown), 3 T2. |
| **Proposed language** | "Two ICPs with confirmed pain signals. ICP 1a: 7 verbatim T1 signals across 4 geos. ICP 2: 1 T1 signal + 3 T2 signals. Neither ICP has produced a paying customer through normal sales motion (excluding COMP codes)." |
| **Note** | The individual signal facts ARE facts: Matthew Sergison-Main said "yes I am being asked this 100%". These are real quotes from real people. What the data does not yet prove is that they will pay $499. |

---

### F04 — ICP 3 "upgrade from hypothesis" is premature

| Field | Value |
|-------|-------|
| **Source** | ICP-DEFINITIONS.md — "Status: 4 confirming signals — upgrade from hypothesis." |
| **Current classification** | Status presented as FACT (confirmed, upgraded) |
| **Proposed classification** | HYPOTHESIS with supporting signals — not confirmed |
| **Why** | 4 signals are too few, and the signals are recognition of the concept, not confirmed buying intent. William Finkel described the cascade mechanism accurately, but that's a T2 (curiosity/awareness) not a T1 (actively being asked, being blocked). Ivan Petruzzelli described requirements he'd impose on agencies — but he hasn't engaged with SI8 to pre-approve SI8's format. Dan Lantry said he "would like to understand the issue better" — earliest possible stage. |
| **Validation method** | ICP 3 is confirmed when: (1) a brand legal or holdco legal team pre-approves SI8's documentation format in writing, OR (2) an agency CD cites a brand legal team requirement that references SI8 by name. |

---

### F05 — ICP 3 cascade math presented as strategic fact

| Field | Value |
|-------|-------|
| **Source** | ICP-DEFINITIONS.md — "One ICP 3 conversion → estimated 5–10 ICP 1a certifications/year at minimum. This is the multiplier that makes ICP 3 the highest-leverage target despite the smallest immediate pool." |
| **Current classification** | Stated as strategic analysis (FACT-adjacent) |
| **Proposed classification** | HYPOTHESIS |
| **Why** | "5–10 certifications/year at minimum" is a projection without empirical basis. The cascade mechanism (ICP 3 pre-approval → agency contract requirement → ICP 1a buys) is coherent but unobserved. "At minimum" implies conservative confidence in a claim that has no supporting data. |
| **Validation method** | Observe first ICP 3 conversion. Track whether their agencies independently approach SI8 within 6 months. |

---

### F06 — v4.1 pitch embeds unconfirmed C2PA Trust List capability

| Field | Value |
|-------|-------|
| **Source** | ICP-DEFINITIONS.md — v4.1 pitch for ICP 1a: "your final video re-signed with our clearance data embedded inside the file" / "When your client's legal team drops the file into Adobe's Content Authenticity viewer, they can verify the clearance themselves" |
| **Current classification** | Active pitch copy (presented as current product capability) |
| **Proposed classification** | OPEN QUESTION — capability unconfirmed |
| **Why** | Sofia Yan's call (Jul 1, 2026) established that old Capture doesn't satisfy C2PA's 2024-25 verification requirements for uploaded/edited content. Whether the Capture API produces a signature that appears as "trusted" vs. "unverified" in the Adobe Content Authenticity viewer is explicitly an open question. Follow-up email sent to Sofia Jul 1 — awaiting reply. If the answer is "unverified signer," this pitch claim is inaccurate. |
| **Action required** | Do NOT use this pitch language in active outreach until Sofia's reply is received and the test video is signed and checked in Adobe's viewer. |
| **Validation method** | Sign a test MP4 via Capture API; open in Adobe Content Authenticity viewer; document exact signer status. Estimated time: within 1 week of receiving API credentials from Sofia. |

---

### F07 — "Commercial Assurance" framing described as validated

| Field | Value |
|-------|-------|
| **Source** | CALL-2026-07-01-P001-Sofia-Yan call notes: "Both Sofia ('SOC 2 audit') and the overall meeting architecture point toward assurance engagement framing." Product implications: "Experiment with 'Independent Commercial Assurance for AI Media' in next few agency conversations." |
| **Current classification** | Treated as validated framing shift (from one partner meeting) |
| **Proposed classification** | HYPOTHESIS |
| **Why** | Sofia said *"有一点像insurance 或 sock2"* — "a bit like insurance or SOC2." "一点像" = "a bit like." This is one partner's spontaneous analogy, not buyer validation of the "assurance" term. Agency CDs and brand legal teams (the actual buyers) have not responded to "Commercial Assurance" language. Wave 1 test sent to Ramez Jul 1 — one email sent, zero replies. |
| **Validation method** | Wave 1 (Ramez, William, Matthew) replies. If 2 of 3 engage with the "commercial clearance" or "assurance" framing vs. ignoring or reframing it, treat as a signal worth continuing. Need 5+ buyer responses before considering a label change. |

---

### F08 — "Disclosure and clearance are different buying decisions" misclassified

| Field | Value |
|-------|-------|
| **Source** | ICP-DEFINITIONS.md regulatory section; CLAUDE.md framing; sales pitch language throughout |
| **Current classification** | Strategic insight (FACT-adjacent) |
| **Proposed classification** | PRINCIPLE (P5) — already added to `06_Operations/DECISION-QUALITY-STANDARDS.md` |
| **Why** | This is an enduring belief that guides how SI8 positions itself, what it declines to claim it does, and how it corrects buyer framing. It is not derived from evidence and cannot be falsified. It is a foundational belief about how to run this business. |
| **Action** | No document edit needed — the Principles table in the DQS already captures this. Worth noting in ICP-DEFINITIONS.md regulatory section as a PRINCIPLE reference rather than as a standalone insight. |

---

### F09 — "SI8 Certified at $499 is validated" conflates DECISION and FACT

| Field | Value |
|-------|-------|
| **Source** | Multiple documents reference $499 as the SI8 Certified price without classification |
| **Current classification** | Treated as confirmed product/price (FACT) |
| **Proposed classification** | DECISION (pricing choice) + HYPOTHESIS (that $499 is the right price for this buyer) |
| **Why** | $499 is a strategic decision SI8 has committed to. The live mode Stripe setup and one COMP-TEST-LIVE transaction do not constitute price validation. No ICP 1a or ICP 2 lead has paid $499 through normal sales motion. The claim that "$499 is self-authorizable at agency level" (ICP-DEFINITIONS.md) is a hypothesis based on inference from agency cost structures. |
| **Note** | The DECISION to price at $499 is sound and should remain in force. The distinction matters when discussing price elasticity or considering a pricing change — those conversations need evidence, not just appeals to the current price as if it were proven correct. |

---

### F10 — "Fractional authorship" described as a solution

| Field | Value |
|-------|-------|
| **Source** | AI-COPYRIGHT-RESEARCH-2026.md — "SI8's documentation can isolate uncopyrightable AI elements from human-authored elements, establishing 'fractional copyright' over the final composite." |
| **Current classification** | Stated as a solution SI8 can provide (FACT-adjacent) |
| **Proposed classification** | HYPOTHESIS |
| **Why** | Fractional authorship is an unproven legal theory in the context of AI video. No court has ruled on it. No IP attorney has reviewed SI8's workflow and confirmed that SI8's documentation methodology creates a defensible copyright claim on human-authored elements. This may be correct, but it is a hypothesis until an IP attorney validates the methodology. |
| **Validation method** | Legal review of SI8's Chain of Title template by a licensed entertainment/IP attorney who confirms the documented human contributions create a defensible authorship claim. |

---

### F11 — AI Copyright Research mixes classifications without labeling

| Field | Value |
|-------|-------|
| **Source** | AI-COPYRIGHT-RESEARCH-2026.md — multiple sections |
| **Current classification** | Research document (classifications unmarked) |
| **Proposed classification** | Several statements need classification labels |
| **Specific items** | (1) "Purely prompt-to-output AI video = no copyright" — FACT (Thaler v. Perlmutter, Copyright Office 2025 report). (2) "Human-directed, iteratively edited AI video = possibly partial copyright" — HYPOTHESIS (Allen v. Perlmutter pending). (3) "Legal uncertainty does not automatically prevent commercial use" — PRINCIPLE (guiding belief, not a proven rule). (4) "Training data liability = commercial risk" — HYPOTHESIS (active litigation, unresolved). (5) "E&O insurance underwriters require verified chain of title" — HYPOTHESIS (stated confidently but no insurer documentation cited). |
| **Action** | Consider adding a Classification Index section to the document on next edit. Not urgent — document is clearly marked "living document." |

---

### F12 — Peer AI review treated as market validation

| Field | Value |
|-------|-------|
| **Source** | CLAUDE.md — "Peer Review Validation (March 2026): Both ChatGPT (Claude Opus) and Gemini validated the v4 CaaS model." Multiple strategic claims in CLAUDE.md and other docs cite "validated by Claude, ChatGPT, and Gemini" or similar. |
| **Current classification** | Treated as validation (FACT) |
| **Proposed classification** | DECISION (strengthened by consensus reasoning) — not a FACT |
| **Why** | AI peer review is consensus reasoning, not empirical validation. Decision Hygiene Rule #3: "Do not confuse consensus with validation." The three-AI agreement is a useful internal check on logical consistency — it catches obvious errors and blind spots. It is not equivalent to customer interviews, purchase decisions, or market data. The v4 decisions may be correct, but their correctness comes from evidence, not from AI agreement. |
| **Note** | This is a systemic pattern worth flagging once and applying consistently. Going forward: cite AI peer review as "consistent with [reasoning]" not "validated by." |

---

## Summary Table

| ID | Document | Statement | Current | Proposed | Priority |
|----|----------|-----------|---------|----------|----------|
| F01 | CLAUDE.md | "C2PA will commoditize" | Fact | Hypothesis | Medium |
| F02 | CLAUDE.md | Opt-in flywheel | Fact | Hypothesis | Medium |
| F03 | ICP-DEFINITIONS | "Two confirmed ICPs" | Fact | Hypothesis (strong signals) | High |
| F04 | ICP-DEFINITIONS | ICP 3 "upgrade from hypothesis" | Fact | Hypothesis | High |
| F05 | ICP-DEFINITIONS | ICP 3 cascade math | Fact | Hypothesis | Medium |
| F06 | ICP-DEFINITIONS | v4.1 C2PA pitch copy | Active pitch | Open Question | **Critical** |
| F07 | Call notes / ICP | "Commercial Assurance" validated | Fact | Hypothesis | High |
| F08 | Multiple | "Disclosure ≠ clearance" | Insight/Fact | Principle (P5) | Low |
| F09 | Multiple | $499 validated price | Fact | Decision + Hypothesis | Medium |
| F10 | AI Copyright doc | Fractional authorship as solution | Fact | Hypothesis | Medium |
| F11 | AI Copyright doc | Mixed classifications throughout | Unmarked | Needs labeling | Low |
| F12 | Multiple | Peer AI review = validation | Fact | Consensus reasoning | Medium |

---

## Priority Actions (Pending JD Approval)

**Critical (affects live outreach):**
- **F06** — Remove or qualify C2PA Trust List pitch language until Sofia's reply is received and test video is signed. Risk: sending pitch copy that claims a capability that may be unverified.

**High (affects ICP definition):**
- **F03** — Add "confirmed pain signals" vs. "confirmed ICP" distinction to ICP-DEFINITIONS.md header. The facts (verbatim quotes) are real; the ICP classification should reflect what "confirmed" means.
- **F04** — Revise ICP 3 status to "hypothesis with 4 supporting signals" and define what evidence would confirm it.
- **F07** — Label "Commercial Assurance" as hypothesis-under-test in call notes and pitch docs.

**Medium (background hygiene):**
- F01, F02, F05, F09, F10, F12 — labeling updates for accuracy. No operational impact today.

**Low (on next edit):**
- F08, F11 — classification labels to add when documents are next touched for other reasons.

---

## Promotion Records (This Cycle)

No Hypotheses have been promoted to Facts this cycle. The following were reviewed and held at Hypothesis:

- ICP 1a pain pattern: strong signals (7 verbatim T1), not yet converted — held as Hypothesis
- Numbers Protocol infra-only status: confirmed FACT (Sofia Yan in-person meeting, Jul 1, 2026)
- C2PA Trust List via Capture API: held as Open Question (unconfirmed per Sofia Yan meeting)

**One Hypothesis-to-Fact promotion logged:**

```
PROMOTION RECORD
Hypothesis: Numbers Protocol does not intend to enter legal review or compliance
Promoted to: FACT
Date: 2026-07-01
Evidence: Sofia Yan verbatim: "才叫protocol 就是才叫protocol 所以我们其实是想做infra的东西"
          ("It's called protocol because we want to be infra.")
Source: Sofia Yan in-person meeting, Taipei, Jul 1, 2026. Transcript: sofia_yan_transcript.txt
Recorded by: Claude (Chief of Staff)
```
