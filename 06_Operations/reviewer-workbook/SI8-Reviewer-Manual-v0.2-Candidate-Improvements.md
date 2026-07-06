# SI8 Reviewer Manual — v0.2 Candidate Improvements
**Version:** 0.1
**Created:** 6 July 2026
**Status:** ACTIVE — working document; not incorporated into Manual until validated
**Owner:** Chief of Staff
**Source:** Assessment Zero Post-Assessment Review + external critique synthesis

---

## Purpose

This document holds proposed improvements to the Reviewer Manual that have not yet been validated by real assessment evidence.

Under the SI8 Decision Quality Standards, these are **HYPOTHESES** — reasoned beliefs that require operational validation before promotion. They must not be incorporated into the Manual until evidence from real assessments justifies doing so.

**Promotion trigger:** Each hypothesis below identifies the evidence required to promote it to a Fact and incorporate it into the Manual.

**Do not edit the Reviewer Manual directly based on this document.** Changes go through the promotion protocol: evidence observed → Post-Assessment Review flag → Chief of Staff review → Manual update.

---

## Hypothesis Log

---

### H-M-001 — Domain T: Impact calibration should reflect deployment context, not just evidence absence

**Source:** Assessment Zero PAR — Control T02 judgment call

**Hypothesis:**
Missing prompt history export should be classified as **Medium commercial impact** (not Low) when the deployment context includes a regulated-sector client with a confirmed legal review gate, even when the workflow description and prompt summary are otherwise sufficient.

**Current Manual treatment:**
Domain T guidance states: "generation logs not preserved — common and acceptable if the workflow description is sufficiently specific." This implies Low impact by default for well-documented submissions. The Manual does not currently specify how deployment context modifies impact calibration.

**Why this might be correct:**
In Assessment Zero, the finserv brand legal review gate (confirmed from the T1 signal in original outreach) was the decisive factor elevating this from Low to Medium. The evidence itself was good; the context raised the stakes. A reviewer without explicit guidance might default to Low.

**Why this might be wrong:**
It's possible that experienced reviewers naturally apply context when evaluating impact without needing explicit instruction. The Manual's philosophy section (§5: commercial framing) may be sufficient guidance for reviewers who have internalised it.

**Proposed v0.2 language (for consideration only):**
*Add to Domain T, after the current decision table:*
> "Impact calibration should reflect the intended deployment context, not just the evidence absence in isolation. A missing prompt history export for a regulated-sector brand with a confirmed legal review gate = Medium. The same gap for a general consumer social campaign = Low. When uncertain, ask: what would a brand legal team in this specific context reasonably request?"

**Validation method:**
Track Domain T judgments across the first 3 real assessments. If two or more independent reviewers (or if JD's own judgment shifts between assessments without a clear rule) produce inconsistent T02 impact ratings for similar gaps, the rule is needed.

**Promote to Manual when:**
Evidence from 2+ assessments shows T02 impact calibration is inconsistent across contexts without explicit guidance.

**Current status:** Hypothesis — do not incorporate

---

### H-M-002 — Domain R: Explicit rule for recurring subscription date gaps

**Source:** Assessment Zero PAR — Control R01 judgment call; external critique

**Hypothesis:**
For recurring monthly subscriptions, a clear rule should govern when a prior-period receipt is sufficient to treat the control as Verified vs. Partially Verified.

**Current Manual treatment:**
Domain R guidance covers date alignment ("the license must be active at the time of generation") but does not address the specific case of monthly subscriptions where only the prior billing period receipt is available.

**Why this might be correct:**
In Assessment Zero, the Runway receipt was from May; production was June 14–16 (the June renewal date would be June 15). Reviewer judgment: Verified with a note. A different reviewer might reasonably treat this as Partially Verified given that the June renewal is not documented. Without a clear rule, different reviewers will produce different judgments on the same evidence.

**Why this might be wrong:**
This is a narrow edge case. Most submitters with active subscriptions will have a current receipt. If the gap appears rarely in real submissions, a rule may be over-engineering.

**Proposed v0.2 rule (for consideration only):**
> "For recurring monthly subscriptions where only the prior billing period receipt is available: prior period receipt + no adverse information (no cancellation notice, no downgrade indication, submitter confirmation of active status) = **Verified with note**. If the generation date is more than 45 days after the most recent receipt date, treat as **Partially Verified** and document the gap, unless the submitter provides account confirmation, a renewal receipt, or a bank statement confirming the relevant billing."

**Validation method:**
Track R01 judgments across the first 3 real assessments. Count how often monthly subscription receipts create date gaps and whether reviewers reach consistent conclusions.

**Promote to Manual when:**
Evidence from 2+ assessments where the same edge case (prior-period receipt, production in following cycle) was judged inconsistently, or where the absence of a rule demonstrably extended review time.

**Current status:** Hypothesis — do not incorporate

---

### H-M-003 — Domain R: Handling personal-tier subscriptions used for commercial work

**Source:** External critique; Assessment Zero (ChatGPT Plus handled as a supporting tool)

**Hypothesis:**
The Manual needs clearer guidance for submissions where personal-tier subscriptions (e.g., GPT Plus at $20/month) were used for commercial work, when the tool's ToS permits commercial use of outputs at the personal tier.

**Current Manual treatment:**
Domain R covers commercial licensing but focuses on primary generation tools. The Assessment Zero workbook treated GPT Plus as a supporting tool with well-documented commercial ToS — "standard commercial terms are well-documented for both platforms and the absence of receipts for ancillary tools is not a material gap." This was correct for Assessment Zero but relies on reviewer knowledge of specific ToS.

**Why this might be correct:**
As AI tooling proliferates, reviewers will encounter an increasing variety of personal-tier subscriptions used in commercial production workflows. Without explicit guidance, reviewers may inconsistently classify personal-tier tools that happen to permit commercial use.

**Why this might be wrong:**
OpenAI's ToS and Adobe's ToS are well-known; treating these as knowledge assumptions for a qualified reviewer is reasonable. The real edge case is less-known tools where commercial rights at the personal tier are ambiguous.

**Proposed v0.2 guidance (for consideration only):**
> "For supporting tools (script drafting, image editing, post-production) used on personal-tier subscriptions: confirm commercial output rights from the tool's published ToS. If the ToS clearly permits commercial use at the tier used, treat as Verified without requiring a receipt (receipt = Conditional for supporting tools). If the ToS is ambiguous at the tier used, treat as Partially Verified and document."

**Validation method:**
Track how often personal-tier subscriptions for supporting tools appear in real submissions and whether reviewers require guidance to classify them correctly.

**Promote to Manual when:**
Evidence from 2+ assessments where personal-tier supporting tool licensing created reviewer uncertainty or inconsistent findings.

**Current status:** Hypothesis — do not incorporate

---

### H-M-004 — Domain L: Structured verification process for voice model provenance

**Source:** Assessment Zero PAR — ElevenLabs voice model observation

**Hypothesis:**
As voice synthesis becomes more common in submissions, the Manual should provide a more structured process for verifying voice model provenance beyond accepting the submitter's statement.

**Current Manual treatment:**
Domain L guidance notes: "Submitter says 'no real person appears' without content being accessible for review" = Weak evidence. But the voice model provenance question (is this a cloned voice of a real person, or a proprietary model?) currently relies on the submitter's statement + reviewer's familiarity with the tool's documentation.

**Why this might be correct:**
ElevenLabs is currently the dominant voice synthesis tool, and "Rachel" is a well-documented proprietary model. But as voice cloning becomes easier and more tools enter the market, reviewer familiarity with specific model provenance cannot be assumed.

**Why this might be wrong:**
A structured verification process may be over-engineered for Assessment 1. Voice synthesis is currently a narrow use case; a protocol is more valuable after evidence shows it's a recurring ambiguity.

**Proposed v0.2 guidance (for consideration only):**
> "For voice synthesis submissions: identify the specific voice model used. Verify against the tool's published documentation whether the model is: (a) a proprietary model licensed by the platform; (b) a cloned voice with documented consent from the voice owner; or (c) unclear. Category (a) = Verified. Category (b) = Verified with release documentation. Category (c) = Not Provided, High commercial impact. If the voice model is not named in the submission, ask the submitter before completing Domain L."

**Validation method:**
Track voice synthesis submissions across first 5 assessments. If voice model ambiguity appears in more than 1 submission without clear reviewer guidance, the structured process is warranted.

**Promote to Manual when:**
Evidence from 2+ assessments where voice model provenance created reviewer uncertainty.

**Current status:** Hypothesis — do not incorporate

---

### H-G-001 — Evidence Preparation Guide: Platform-specific export instructions reduce prompt history gaps

**Source:** Assessment Zero PAR — Customer questions section; simulated observation

**Hypothesis:**
Adding specific export instructions for Runway (and other common generation tools) to the Evidence Preparation Guide will reduce the frequency of missing prompt history in real submissions.

**Current Guide treatment:**
The Evidence Preparation Guide asks for "workflow description" and "generation documentation if preserved." It does not provide specific UI instructions for how to export from any specific tool.

**Why this might be correct:**
In Assessment Zero, the fictional submitter explicitly stated: "I didn't export the prompt history before ending the session." This gap is likely common — generation sessions are often ended before the creator thinks about documentation. A specific instruction ("in Runway: History → Export — do this before ending your session") would prevent it.

**Why this might be wrong:**
Platform UIs change frequently. If Runway updates its dashboard, the specific instructions become wrong and potentially confusing. A general instruction ("export your generation history from each tool before ending your session") may be safer than platform-specific steps.

**Proposed addition (for consideration only):**
> *Add to Evidence Preparation Guide, under Domain T (Technical Provenance):*
> "For Runway users: after completing your generation sessions, go to History in your Runway dashboard and export the session records before ending your browser session. Generation history may not be recoverable after the session is closed. This is the single most commonly missing piece of provenance documentation — exporting it takes under a minute."

**Validation method:**
Track prompt history gap frequency in first 5 real submissions. If gap appears in 3 or fewer of 5 submissions after adding the instruction (vs. an expected 5 of 5 without it), the instruction is effective.

**Promote to Guide when:**
Baseline gap frequency established from Assessment 1-2 (before instruction added); then compare. Alternatively: add the instruction before Assessment 1 and track whether customers arrive with prompt history already exported.

**Note:** This is a customer-facing improvement, not a reviewer judgment improvement. The promotion bar is lower — a reasonable expectation of effectiveness is sufficient (vs. evidence of reviewer inconsistency required for Manual changes).

**Current status:** Hypothesis — do not incorporate into Guide until baseline established, OR add proactively and treat as low-risk improvement given the instruction's simplicity

---

## Governance

**Who adds entries:** JD (from Post-Assessment Reviews, external critiques, or observed gaps)
**Who promotes entries:** JD, after evidence satisfies the stated validation method
**Promotion format:** Use the standard Hypothesis → Fact promotion record in the relevant Post-Assessment Review, then incorporate into the Manual

**Version numbering:** This document tracks candidates for Manual v0.2. When Manual v0.2 is written, promoted hypotheses are removed from this document and the remaining unvalidated ones carry forward.

**Do not confuse this document with the Manual.** The Manual is what reviewers use during assessments. This document is what might become the Manual after evidence.

---

## Status Summary

| ID | Hypothesis | Source | Status |
|----|-----------|--------|--------|
| H-M-001 | Domain T impact calibration by deployment context | Assessment Zero PAR | Hypothesis |
| H-M-002 | Domain R recurring subscription date gap rule | Assessment Zero PAR + external critique | Hypothesis |
| H-M-003 | Domain R personal-tier subscription handling | External critique | Hypothesis |
| H-M-004 | Domain L voice model provenance process | Assessment Zero PAR | Hypothesis |
| H-G-001 | Evidence Prep Guide export instructions reduce prompt history gaps | Assessment Zero PAR | Hypothesis |
