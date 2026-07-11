# SI8 Reviewer Workbook — Control Classification Note
**Version:** 1.0
**Date:** 11 July 2026
**Status:** ACTIVE
**Audience:** SI8 reviewers — internal only
**Companion documents:** Reviewer Manual v0.1 · Reviewer Workbook Schema v0.1

---

## Purpose

Section 3 of the Reviewer Workbook contains 16 controls across 7 domains. All 16 use the same format (Evidence → Assessment notes → Judgment). They do not all represent the same type of reviewer work.

This note classifies each control into one of three categories and explains the methodological basis for each. It does not change the Workbook Schema, the control structure, or any assessment outcomes.

A future reviewer reading a completed workbook should be able to look at a control and know: was this reviewer checking something the submitter provided, investigating something independently, or reaching a professional conclusion from the evidence?

---

## The Three Categories of Reviewer Work

### 1. Validate Submitter Evidence

The reviewer confirms that submitted documentation (CertForm data, uploaded receipts, signed declarations) is present, plausible, internally consistent, and matches what was observed in Section 2.

**Source:** The submission package. The reviewer is cross-referencing, not investigating.

**When the field is empty or the document is missing:** that is the gap. Document it in the evidence field and assess its commercial significance. Do not infer the item probably exists.

**Manual reference:** Part 1, Principle 2 (Evidence Before Assumptions) — "Assumptions are not findings."

---

### 2. Perform Independent SI8 Research

The reviewer does work the submitter cannot do: watch the content independently for elements the submitter might not disclose, look up third-party terms of service as of the generation date, verify dates against external records.

**Source:** The reviewer's own investigation. The submitter's declaration is context, not authority.

**When the submitter declares "no brand elements" but the reviewer sees one:** the reviewer's observation governs. Document the discrepancy in Assessment notes.

**Manual reference:** Part 1, Principle 1 (Independence) — "The reviewer answers only to the evidence." Part 1, Principle 5 (Commercial Framing) — SI8's value is the independent view, not validation of the submitter's self-assessment.

---

### 3. Reach Professional Reviewer Conclusions

The reviewer applies professional judgment to determine the significance of what they have found. These assessments require expertise and cannot be derived mechanically from submitted data. The reviewer is deciding, not checking.

**Source:** The reviewer's professional knowledge, applied to what they observed and researched.

**When the reviewer is uncertain:** that is a finding, not a failure. Document the uncertainty specifically. "Suspected" is a valid conclusion for D02, L01, and L02.

**Manual reference:** Part 1, Principle 4 (Documenting Uncertainty Honestly) — "Calibrated uncertainty is more useful than false confidence."

---

## Control Classification — All 16

Controls are classified by their PRIMARY category. Several controls involve elements of more than one category; these are noted.

---

### Domain A — Identity & Accountability

| Control | Category | Basis |
|---------|----------|-------|
| **A01** — Submitter identification and accountability | **Validate** | Reviewer confirms submitter identity, company, role, and authority from CertForm Section 4. Evidence Custodian Declaration is a signed submitted document — the reviewer confirms it is on file, not that it is truthful in any way the reviewer can independently assess. If the declaration is absent, that is the gap. |

---

### Domain R — Commercial Rights & Licensing

| Control | Category | Basis |
|---------|----------|-------|
| **R01** — AI tool identification | **Validate** | Reviewer cross-references the declared tools list against Section 2 observations and the content itself. Undeclared tools visible in the content (via artifacts, watermarks, or metadata) are a Domain D/T concern. R01 specifically validates that the declared list is complete and specific. |
| **R02** — Commercial license confirmation | **Split: Validate + Independent research** | *Validate component:* receipts are present and dates are consistent with the generation dates. *Independent research component:* the reviewer looks up the ToS for each named tool as of the stated generation date, using SI8's tool license reference or direct access. Submitters cannot be trusted to accurately paraphrase their own ToS — this is one of the core justifications for SI8's existence. |
| **R03** — Custom or fine-tuned model provenance | **Professional conclusion** | No CertForm field asks whether a model is "custom or fine-tuned." The reviewer determines this from the tool name and their knowledge of AI model taxonomy. For standard commercial tools (Kling Pro, Runway Standard, ElevenLabs Starter), this is Not Applicable without investigation. For ambiguous tools, the reviewer applies judgment about what constitutes a custom model. |
| **R04** — AI output ownership | **Split: Independent research + Professional conclusion** | *Independent research:* the reviewer looks up the relevant ToS output rights clause for each named tool. This is not cross-referencing a submitted document — it is independent investigation. *Professional conclusion:* the reviewer determines whether a work-for-hire relationship exists and who holds commercial rights to the output. See the R04 Methodology Note below. |

---

### Domain H — Human Creative Contribution

| Control | Category | Basis |
|---------|----------|-------|
| **H01** — Human creative contribution — level and documentation | **Split: Validate + Professional conclusion** | *Validate:* the authorship statement and workflow documentation are present and describe the submitter's role. *Professional conclusion:* the reviewer assesses the level of contribution (Substantial / Moderate / Minimal) based on what is described. This requires judgment about what constitutes meaningful creative direction — not a mechanical check. |
| **H02** — Human authorship assertion | **Professional conclusion** | The reviewer infers from the authorship statement whether the submission positions the human as the creative author and whether that assertion is supported by evidence. This is not a copyright determination (that is R04's territory — who holds commercial rights via ToS). See the H02 Methodology Note below. |

---

### Domain I — Third-Party IP

| Control | Category | Basis |
|---------|----------|-------|
| **I01** — Third-party copyrighted content — visual | **Independent research** | The reviewer must watch the content before consulting the submitter's IP declarations. The independence check ("Reviewer watched content independently") exists for this reason. Submitters may not recognise copyrighted elements in AI-generated content — distinctive architecture, artistic styles, characters, and set pieces can all carry copyright. The submitter's declaration is cross-referenced after the independent review, not before. |
| **I02** — Third-party copyrighted content — audio | **Independent research** | Same basis as I01 for audio. AI-generated music platforms (Suno, Udio, Stable Audio) have varying commercial terms that require independent confirmation. Licensed audio tracks require documentation — a platform subscription is not the same as a commercial licence for a specific track. |
| **I03** — Trademarks and brand elements | **Independent research** | Reviewer watches independently for synthetic marks that resemble real brands. Submitters may not recognise AI-generated logos or brand-resembling elements as potential trademark concerns. The reviewer notes all observed elements and cross-references against the declaration. |

---

### Domain L — Likeness & Performer Rights

| Control | Category | Basis |
|---------|----------|-------|
| **L01** — Synthetic likeness — real person resemblance | **Independent research** | The reviewer must watch independently. The NY Synthetic Performer Law (effective June 9, 2026) creates "actual knowledge" liability — once SI8 identifies a synthetic performer resembling a real identifiable individual, that knowledge is documented. Relying on the submitter's declaration ("no real persons appear") does not protect against the "actual knowledge" standard. The reviewer's independent view is the commercial-risk-relevant determination. |
| **L02** — Performer distinctness — generic vs. identifiable | **Professional conclusion** | The reviewer assesses whether synthetic performers could plausibly be confused with a specific real identifiable individual. This requires judgment that no submitted document can provide — it depends on the reviewer's knowledge of the subject, the content's context, and reasonable audience perception. |
| **L03** — Likeness releases and right-of-publicity documentation | **Validate (conditional)** | Only triggered if L01 finds a real-person resemblance. If triggered, the reviewer confirms whether appropriate documentation (talent release, right-of-publicity licence) is on file. This is a straightforward validation: the documentation either exists or it does not. |

---

### Domain T — Technical Provenance

| Control | Category | Basis |
|---------|----------|-------|
| **T01** — Production workflow documentation and coherence | **Split: Validate + Professional conclusion** | *Validate:* each evidence type (declared workflow, prompt records, output metadata) is either present, partially present, or absent. The reviewer records the status of each. *Professional conclusion:* the reviewer assesses whether the overall workflow description is coherent — whether the tools, sequence, and output decisions described are consistent with the content reviewed. An incoherent workflow is a Domain D/T finding requiring explanation. |

---

### Domain D — Documentation Integrity

| Control | Category | Basis |
|---------|----------|-------|
| **D01** — Date and version consistency | **Validate** | Date arithmetic across all submitted documents. Subscription receipt dates must predate or match generation dates. Version claims (e.g., Runway Gen-3 on a plan that only offered Gen-2) are cross-referenced against known tool capabilities. This is mechanical cross-referencing — inconsistencies are findings, not judgments. |
| **D02** — Retroactive documentation indicators | **Professional conclusion** | The reviewer assesses whether submitted documentation shows signs of retroactive preparation: inconsistent PDF metadata timestamps, print dates postdating submission, workflow descriptions that read as reconstructions rather than contemporaneous records. No submitted document can confirm or deny its own authenticity — this assessment requires the reviewer's forensic judgment. |

---

### Summary

| Category | Controls |
|----------|---------|
| Validate | A01, R01, L03, D01 |
| Independent research | I01, I02, I03, L01 |
| Professional conclusion | R03, H02, L02, D02 |
| Split (validate + independent research) | R02 |
| Split (validate + professional conclusion) | H01, T01 |
| Split (independent research + professional conclusion) | R04 |

---

## H02 — Methodology Note

### The Problem with "Copyright Claim"

The previous framing of H02 asked whether the submitter was making a copyright claim. This framing is incorrect for three reasons:

1. **It conflates two separate assessments.** Commercial rights to the AI output are established via ToS (R04). Whether the human is the creative author is a separate question that H02 addresses. A submitter can hold full commercial rights via ToS (R04: Verified) without making any authorship claim (H02: No claim stated) — and they can make a clear authorship assertion without it being a formal legal copyright claim.

2. **Most SI8 submissions assert human authorship.** The CertForm `authorship_statement` field exists specifically to document the human's creative contribution. A submission with a detailed, credible authorship statement is asserting authorship — it is not, as a legal matter, filing a copyright claim. Asking "are you making a copyright claim?" causes reviewers to undercount yes answers.

3. **SI8 does not assess copyright questions.** Per Manual Part 1, Principle 5: "The reviewer does not opine on whether the content is legally copyrightable." The H02 assessment is whether the submission credibly documents human creative authorship — not whether that authorship would survive a copyright challenge.

### Correct Framing

**H02 asks:** Does the submission assert human authorship, and is that assertion reasonably supported by the evidence?

- **Yes — human authorship asserted:** the submission positions the human as a creative author through the authorship statement, workflow documentation, or other evidence. Triggers the claim basis and assessment fields — the reviewer documents what is being asserted and whether the evidence supports it.
- **No claim stated:** the submission does not position the human as a creative author (e.g., a submitter who describes themselves only as the person who ran the tool, with no creative direction documented).
- **Unclear:** the authorship statement is ambiguous about whether any creative direction was exercised.

### Manual Reference

Part 1, Principle 5 (Commercial Framing, Not Legal Conclusions) — H02 is a commercial evidence assessment, not a legal copyright determination. The reviewer documents whether the human contribution is credibly asserted and documented. They do not determine whether that contribution is copyrightable.

### Assessment 001 (Cloud World) — Correct Application

The Cloud World authorship statement is detailed, specific, and credible. It names: the prompt structure, character and world design, camera choreography (whip pan with specific parameters), narrative concept, explicit style constraints, and the deliberate decision to use a single unmodified generation. This is a clear assertion of human creative authorship.

H02 for Assessment 001:
- **Does the submission assert human authorship?** Yes — human authorship asserted
- **Claim basis:** Prompt authorship, character and world design, camera choreography direction, narrative concept, style constraints — all named specifically
- **Assessment:** Plausible and documented — the specificity and coherence of the authorship statement is consistent with genuine creative direction
- **Judgment: Verified**

---

## R04 — Work-for-Hire Methodology Note

### The Issue

The work-for-hire field appears for all submissions regardless of submission mode. For Individual Creator submissions, work-for-hire is structurally inapplicable.

### Methodology Guidance by Submission Mode

**Individual Creator submissions:**
Commercial rights to the AI output flow from the tool's ToS (the reviewer confirms this in R02 and R04's ToS research). No employment or contractor relationship exists at the submission stage. The reviewer should record "Not applicable (creator owns work)" for the work-for-hire field without further investigation.

Important: an Individual Creator submission with intended use "Agency Deliverable / Client Work" does not create a work-for-hire relationship at the evidence review stage. The creator is the original rights-holder at submission time. If they subsequently contract with an agency, that is a downstream commercial arrangement outside SI8's scope.

**Agency / Production House submissions:**
Work-for-hire assessment IS required. The question is whether the agency holds rights it can license to the end client, or whether the end client holds the rights and the agency is merely the production party.

This is often unclear without seeing the agency-client contract. If no contract is provided, note the ambiguity: "Agency submission — work-for-hire relationship with end client not documented; rights assumed to rest with agency per production convention unless contradicted."

### Assessment 001 (Cloud World) — Correct Application

Submission mode: Individual Creator (JDC_Media).
Work-for-hire: Not applicable (creator owns work). No further investigation required.

---

## Why Reviewer-Derived Controls Are Intentionally Independent of the CertForm

The following explanation is for reviewers who encounter a control with no CertForm field to cross-reference and wonder what they are supposed to do.

**The CertForm collects submitter declarations. It does not replace SI8's independent assessment.**

Specific reasons why certain controls cannot be CertForm-driven:

**Submitters cannot objectively assess their own content for third-party IP (I01, I02, I03).**
A submitter who declares "no brand elements" may be correct, or may simply not have recognised a synthetic logo resembling a real mark. The submitter's declaration is context — it tells the reviewer what the submitter believed. SI8's independent visual review is what the commercial party is paying for.

**Submitters cannot confirm their own ToS compliance (R02, R04).**
A submitter who says "my tool permits commercial use" may be correct, or may be wrong about their plan tier, the version of the ToS in effect at generation time, or the specific clause that governs commercial use. SI8 looks up the ToS independently, as of the generation date, for each named tool.

**The "actual knowledge" doctrine makes likeness independence legally significant (L01).**
The NY Synthetic Performer Law creates "actual knowledge" liability for those who deploy content featuring synthetic performers resembling real individuals. Once SI8 identifies a potential resemblance and documents it, that knowledge is on record. Relying only on the submitter's declaration ("no real persons appear") would undermine the commercial assurance the assessment is supposed to provide.

**Custom model determination requires taxonomy knowledge the submitter may lack (R03).**
Many submitters do not know whether the tool they used qualifies as a "custom" or "fine-tuned" model. They know the tool name. The reviewer, with knowledge of AI model taxonomy, makes the determination based on what the tool name actually represents.

**Documentation integrity cannot be self-assessed (D02).**
A submitter cannot tell SI8 whether their own documentation appears retroactively prepared — that judgment requires an outside view. D02 exists because contemporaneous documentation is materially different from reconstructed documentation, and the distinction matters for commercial confidence in the Chain of Title.

**Human authorship level requires expert calibration (H01).**
What constitutes "substantial" creative direction versus "minimal" tool operation is a professional judgment. The submitter's characterisation of their own contribution is data — not the conclusion.

---

*This note is a companion to Reviewer Manual v0.1. It does not supersede any Manual content. Amendments to this note require a version increment and should be driven by operational evidence from completed assessments.*
