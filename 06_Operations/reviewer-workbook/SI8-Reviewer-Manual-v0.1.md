# SI8 Reviewer Manual — Volume I: Core Review Principles
**Version:** 0.1
**Effective date:** July 5, 2026
**Status:** ACTIVE
**Audience:** SI8 reviewers — internal only. Do not share with customers or third parties.
**Owner:** Chief of Staff
**Companion documents:** Reviewer Workbook Schema v0.1 · Assessment Report Template v0.2 · Post-Assessment Review Template v0.1

---

## A Note on This Manual

This Manual captures current best design for SI8's Commercial Assurance review process. It is not a rulebook — it is a framework for judgment.

Part 4 (Domain Guidance) will be the most theoretically written section. The decision thresholds and risk calibrations described there reflect the best current thinking, not validated rules. Every Post-Assessment Review is the primary mechanism for updating this Manual as real assessments surface edge cases, refine decision logic, and identify gaps. The Case Library flag exists for this reason.

When in doubt between following the Manual exactly and making the correct judgment call for the evidence in front of you — make the correct judgment call and document your reasoning. That documentation is how the Manual improves.

---

## Part 1 — Reviewer Philosophy

*Read this section before beginning any assessment. It establishes the posture and orientation that govern all review decisions. The controls, decision logic, and workflow guidance in Parts 2–6 are applications of this philosophy — not substitutes for it.*

---

### 1. Independence

The reviewer's assessment is not influenced by the submitter's desired outcome, the commercial relationship, or the quality or appeal of the content being reviewed.

A well-produced film with incomplete evidence receives the same rigorous assessment as an unremarkable commercial with complete documentation. A submission from an established production house receives the same framework as one from an individual creator.

SI8's value to the commercial market is the independence of its assessment. An assessment that bends toward a favorable outcome — however subtly, however well-intentioned — is not an assessment. It is a formality, and formalities do not protect the commercial parties who rely on them.

Independence does not mean adversarial. The reviewer's posture toward the submitter is professional and collaborative. But within the assessment itself, the reviewer answers only to the evidence.

### 2. Evidence Before Assumptions

The reviewer's conclusions follow from evidence, not from inference about what the evidence probably is or what the submitter probably intended.

When evidence is absent, the reviewer documents its absence and assesses its commercial significance. The reviewer does not infer from surrounding evidence that the missing item probably exists. If a subscription receipt was not provided, the reviewer does not assume the tool was commercially licensed simply because the submitter uses professional tools, produces professional work, or has submitted other documentation.

Assumptions are not findings. Document what exists. Note what is missing. Do not bridge the gap.

### 3. Distinguishing Missing from Adverse

Missing evidence is not adverse evidence.

"Not provided" means the reviewer cannot verify the control — it does not mean the control fails. The commercial implication of a missing item depends entirely on context: which domain, which control, what other evidence exists in that domain, and what the content will be used for.

A missing prompt log in a high-fidelity enterprise submission with confirmed commercial licensing may have minimal commercial impact. A missing commercial license receipt for the primary AI generation tool has significant commercial impact regardless of what else is present.

The reviewer assesses the commercial significance of the gap — not the gap itself. A gap noted without a commercial impact assessment is an incomplete finding.

### 4. Documenting Uncertainty Honestly

The reviewer does not manufacture certainty where evidence is incomplete.

"Insufficient Supporting Evidence" is a legitimate and sometimes necessary assessment outcome. It is not a reviewer failure — it is an accurate description of the evidentiary state. Forced conclusions produced from inadequate evidence are more dangerous to commercial decision-makers than an honest statement of insufficiency.

When the reviewer is genuinely uncertain between two findings, that uncertainty should be captured in the Findings Log with the specific reason for the uncertainty. When the overall evidence picture is too incomplete to support a reliable assessment, the outcome should reflect that.

Calibrated uncertainty is more useful than false confidence. A Medium-confidence assessment with well-documented findings gives the commercial decision-maker something actionable. A High-confidence assessment based on incomplete evidence gives them false security.

### 5. Commercial Framing, Not Legal Conclusions

The reviewer explains what the evidence means for commercial deployment. The reviewer does not opine on:

- Whether the content is legally copyrightable
- Whether a license would survive a legal challenge
- Whether the content is "legally safe" to use
- Whether a specific jurisdiction's law applies to the content
- Whether the submitter has any legal obligations

These are legal questions. SI8 does not answer legal questions.

The reviewer's frame is always: *given this evidence, what can a commercial party reasonably rely upon when deploying this content?* The Standard Assurance Language in the Report makes this boundary explicit. The reviewer's language throughout the report should reinforce it, never undermine it.

When a finding has clear legal implications — a missing talent release, an unlicensed stock asset, content deployed in a jurisdiction with specific disclosure requirements — the reviewer documents the evidence and its commercial implication. The reviewer does not advise the submitter to "get a lawyer." The Report's Recommended Next Steps can note that specific professional advice may be warranted for specific risks, but this is framed as commercial guidance, not legal advice.

### 6. Consistency Over Convenience

The same assessment framework applies to every submission, regardless of:

- Who submitted the content or their relationship to SI8
- The submitting company's size, reputation, or commercial importance
- The content's creative quality or commercial appeal
- The reviewer's personal view of the content's subject matter
- Whether the reviewer knows what outcome the submitter wants or needs

Consistency is what makes SI8's assessment meaningful to third parties — the brand legal teams, E&O underwriters, and platform procurement leads who may rely on SI8's assessment without any direct relationship with SI8. If assessments are not applied consistently, they are not independent. If they are not independent, they are not worth the fee charged.

### 7. Calibrated Confidence

The commercial confidence level (High / Medium / Low) reflects the actual strength of the evidence — not the reviewer's preference for a clean outcome, not the content's apparent quality, and not the submitter's credibility.

High confidence requires that core evidence is verified and identified gaps have low commercial impact. If core evidence is present but a significant gap exists in a commercially critical domain, the confidence level should reflect that gap — it cannot be High.

The reviewer is not responsible for what the submitter did or did not provide. The reviewer is responsible for accurately communicating what the evidence picture means for commercial deployment. The submitter makes decisions about their content; the reviewer makes decisions about what the evidence shows.

---

## Part 2 — The Assessment Framework

### What SI8 Assesses

SI8 evaluates the commercial evidence behind AI-generated content across seven domains. The domains are designed to cover the principal areas of commercial risk for AI video deployed in advertising, broadcast, social, or licensing contexts.

| Domain Code | Domain Name | Commercial Risk Addressed |
|-------------|-------------|--------------------------|
| A | Identity & Accountability | Who submitted the content and on whose authority |
| R | Commercial Rights & Licensing | Whether the AI tools used permit commercial output |
| H | Human Creative Contribution | The nature and extent of human creative involvement |
| I | Third-Party IP | Whether identifiable third-party copyrighted material is present |
| L | Likeness & Performer Rights | Whether a real person's likeness, voice, or persona appears |
| T | Technical Provenance | Whether the production workflow is documented |
| D | Documentation Integrity | Whether the submitted evidence is internally consistent |

### What the Review Produces

The review produces a **Campaign Assurance Assessment Report** (Template v0.2). The Report contains:

1. A Commercial Assurance Summary Dashboard — the executive-facing assessment, outcome, confidence, key findings, conditions, and recommended next steps
2. A full Domain Assessment — 7 domain blocks with evidence status, evidence reviewed, finding, and commercial implication for each
3. Standard Assurance Language — controlled policy language, verbatim in every report
4. Appendix A — Supporting Evidence Record (a structured evidence log)

### What the Review Does Not Produce

- A legal opinion
- A copyright determination
- A guarantee of any kind
- A finding that the content is "safe" or "cleared"
- Advice on what the submitter should do legally

These limitations are explicitly stated in the Standard Assurance Language and should be reinforced throughout the reviewer's language choices.

### The Five Assessment Outcomes

| Outcome | When to use |
|---------|-------------|
| **Evidence Supports Intended Commercial Use** | Core evidence verified, gaps are low-impact or absent |
| **Evidence Supports Intended Commercial Use with Conditions** | Core evidence largely present; specific addressable gaps remain |
| **Evidence Indicates Material Commercial Risks** | Significant unresolved gaps or identified risks affect commercial deployment directly |
| **Insufficient Supporting Evidence** | Submission too incomplete to reach a reliable assessment of any kind |
| **Unable to Reach Assessment** | Exceptional circumstances: broken submission, post-intake scope conflict, material misrepresentation |

See Part 5 for decision logic on each outcome.

### Commercial Confidence Levels

| Level | Meaning |
|-------|---------|
| **High** | Core commercial evidence verified. Identified gaps are low commercial impact or addressable. |
| **Medium** | Material evidence verified but gaps present. Deployment should proceed with awareness of documented conditions. |
| **Low** | Core commercial evidence incomplete or inconsistent. Material gaps affect the reliability of the assessment. |

Commercial confidence is determined after domain assessment, not before. Assign it last.

### Relationship Between Manual, Workbook, and Report

| Artifact | Role |
|----------|------|
| **Reviewer Manual** | Teaches how to evaluate. This document. |
| **Reviewer Workbook Schema** | Records what the reviewer observed across all 16 controls. The structured working document. |
| **Assessment Report Template v0.2** | Communicates the assessment to the customer. Populated from Workbook Section 6. |
| **Post-Assessment Review Template** | Captures operational learning after every assessment. Primary input to Manual updates. |

The Workbook is the reviewer's internal working document. The Report is the customer-facing deliverable. The reviewer should never write the Report directly — always populate the Workbook first, then transfer Section 6 (Report Brief) into the Report Template.

---

## Part 3 — Assessment Workflow

### Overview

```
Step 0 — Pre-Assessment Triage     (10 min)
Step 1 — Intake & Scope            (10 min)
Step 2 — Evidence Checklist        (25 min)
Step 3 — Evidence Gap Log          (10 min)
Step 4 — Findings Log              (20 min)
Step 5 — Overall Assessment        (10 min)
Step 6 — Report Brief              (10 min)
                                   ────────
Total target                       ~95 min
```

These targets are design estimates for v0.1. The first several real assessments will calibrate actual timing. Record time per section in every Post-Assessment Review.

---

### Step 0 — Pre-Assessment Triage

Before opening the Workbook, confirm the submission is ready to assess.

**No List check.** Does the content or submission involve any of the following?

- [ ] Celebrity likeness (a real, named person's face used without consent)
- [ ] Voice cloning of a real person
- [ ] Explicit IP imitation (copyrighted characters, trademarked brands used intentionally)
- [ ] Political persuasion content
- [ ] Deepfake or deceptive content
- [ ] Adult or explicit content
- [ ] No signed CertForm or missing Evidence Custodian Declaration

If any box is checked: **do not begin the assessment.** Contact JD for instructions on how to proceed. The submission may need to be returned to the submitter with an explanation.

**Accessibility check.** Can the reviewer access the content?

- [ ] Video link or file is accessible and plays correctly
- [ ] The content matches what was described in the submission
- [ ] Submission form (CertForm) is complete enough to begin

If the content is inaccessible, contact the submitter before proceeding. Document in the Workbook that Step 0 required follow-up.

---

### Step 1 — Intake & Scope (Workbook Section 1)

Populate the assessment header: Assessment ID, Submission ID, reviewer name, dates.

Review the submission overview: content title, format, duration, stated commercial use, intended territory, AI tools declared.

**Scope confirmation:** Does the submission fall within SI8's current scope?
- Commercial content for advertising, broadcast, social media, licensing — Yes
- Content intended for jurisdictions not yet researched by SI8 — note the limitation in scope
- Content types not covered by the 7 domains (e.g., pure audio without video) — note the scope limitation

Record any scope limitations explicitly in Workbook Section 1. These will carry through to the Report's Assessment Scope section.

---

### Step 2 — Evidence Checklist (Workbook Section 2)

Work through all 16 controls across 7 domains. For each control:

1. Review the relevant evidence from the CertForm submission
2. Assign a judgment: **Verified / Partially Verified / Not Provided / Not Applicable**
3. Record the specific evidence reviewed (not just "receipt provided" — note what the receipt says)
4. Note any questions or observations that will become gaps or findings

**Judgment definitions:**

| Judgment | Meaning |
|----------|---------|
| **Verified** | Evidence reviewed confirms the control. The basis for verification is documented. |
| **Partially Verified** | Some evidence present but incomplete. Specify what is verified and what is missing. |
| **Not Provided** | No evidence provided for this control. Document impact in Step 3. |
| **Not Applicable** | This control genuinely does not apply to this submission. State why. (Rare — use carefully.) |

"Not Applicable" is not a substitute for "Not Provided." If the evidence should exist but wasn't submitted, it is "Not Provided." "Not Applicable" is reserved for controls that structurally cannot apply — for example, the Likeness controls when a domain-level scope note confirms the content contains only AI-generated abstract imagery with no human figures.

Review Part 4 (Domain Guidance) for each domain before making judgment calls. The Domain Guidance provides decision logic for the common ambiguous cases.

---

### Step 3 — Evidence Gap Log (Workbook Section 3)

For every control marked "Not Provided" or "Partially Verified" that has a non-trivial commercial impact, create a Gap Log entry:

- **Gap ID** — sequential (G01, G02, etc.)
- **Related control** — domain code and control number
- **What is missing** — specific, not generic
- **Addressable?** — Yes (submitter could provide this) / No (not available retroactively) / Unknown
- **Commercial impact** — Low / Medium / High
- **Impact description** — one sentence on what the gap means for commercial deployment

A gap with Low commercial impact does not require a Gap Log entry if the reviewer is confident it will not affect the overall assessment or confidence level. Use judgment — the Gap Log should contain meaningful gaps, not every "Not Provided" control.

---

### Step 4 — Findings Log (Workbook Section 4)

A finding is a specific, evidence-based observation that has commercial significance. Findings can be positive (evidence confirmed, no risk identified) or negative (gap, inconsistency, identified risk).

For each finding:
- **Finding ID** — sequential (F01, F02, etc.)
- **Domain** — which of the 7 domains
- **Finding** — one to three sentences, factual, evidence-cited
- **Evidence basis** — what specifically supports this finding
- **Commercial impact** — Low / Medium / High
- **Addressable?** — Yes (submitter can resolve before deployment) / No / Unknown

Positive findings are not optional. A well-evidenced Commercial Rights & Licensing domain should produce a positive finding — it tells the commercial decision-maker that something was confirmed, not just that nothing went wrong.

**Finding vs. Gap distinction:** A gap is an absence of evidence. A finding is a conclusion from evidence (or from the absence of evidence combined with context). All significant gaps may produce findings, but not all gaps automatically become findings — a Low-impact gap in a well-evidenced submission may not rise to the level of a formal finding.

---

### Step 5 — Overall Assessment (Workbook Section 5)

With all domain assessments, gaps, and findings documented, the reviewer now reaches an overall assessment.

See Part 5 for decision rules on each outcome.

The reviewer should:

1. Identify which domains are Verified / Partially Verified / Not Provided
2. Identify the highest-impact gaps and findings
3. Select the appropriate outcome using the decision logic in Part 5
4. Determine the commercial confidence level
5. Draft conditions (if outcome is "with Conditions")
6. List the 2-3 most important residual risks
7. Sign off on the assessment

---

### Step 6 — Report Brief (Workbook Section 6)

The Report Brief is the bridge between the Workbook and the Report Template. It contains:

- Draft executive summary for Section 1 Dashboard (2-3 sentences)
- Key findings list (3-5, drawn from the Findings Log)
- Conditions (if applicable, drawn from Step 5)
- Residual risks (2-3, from Findings Log or domain assessment)
- Recommended next steps (2-4 items)
- Evidence list for Section 2 (Scope)
- Domain-by-domain notes for Section 3

The Report Brief is a working draft — not polished prose yet. The reviewer then transfers this into the Report Template v0.2 and refines the language per the guidance in Part 6.

---

## Part 4 — Domain Guidance

*This is the core of the Manual. Each domain chapter follows the same structure. Read the full chapter for a domain before assessing that domain's controls.*

*All guidance in Part 4 is v0.1 — designed before real assessments. Decision thresholds will be refined as operational experience accumulates. If a judgment call isn't covered here, document your reasoning in the Findings Log and flag it in the Post-Assessment Review.*

---

### Domain A — Identity & Accountability

**Purpose:** Establish who submitted the content and on whose authority.

**Reviewer objective:** Confirm that the submitting party is identifiable, that they have authority over the content being submitted, and that the Evidence Custodian Declaration is on file.

**Acceptable evidence:**
- Completed CertForm with named submitter, company, and role
- Evidence Custodian Declaration completed (required for all submissions)
- Any additional documentation confirming the submitter's role or authority over the content

**Weak evidence:**
- Submission without clear company affiliation
- Submission by someone who describes themselves as a contractor or representative without confirming the rights-holder's knowledge

**Typical evidence gaps:**
- Third-party submissions where the submitter is not the creator and the relationship to the rights-holder is unclear
- Submissions on behalf of a client without confirming the client has authorized SI8's assessment

**Decision logic:**
- If the CertForm is complete, the Evidence Custodian Declaration is signed, and the submitter's role is clear: **Verified**
- If the submitter appears to be acting on behalf of a third party without clear authorization: **Partially Verified** — note the question in the Gap Log
- Domain A is rarely a standalone basis for an adverse outcome, but a weak Domain A reduces the reliability of the entire submission — the submitter's representations across all other domains carry less weight when identity and authority are not clearly established

**Commercial implications:**
Confirmed identity and authority reduce the risk of competing claims on the content. A submission from an unnamed or unauthorized party creates uncertainty about whether the evidence provided can be trusted and whether the assessment can be relied upon.

---

### Domain R — Commercial Rights & Licensing

**Purpose:** Confirm that the AI tools used to create the content permit commercial output and that the submitter held the appropriate commercial license at the time of generation.

**Reviewer objective:** Verify that each AI tool declared in the submission was used on a commercially licensed plan active at the time of generation, and that the tool's terms permit commercial use of generated outputs.

This is the most commercially critical domain. A weak or missing finding here directly affects every downstream commercial deployment decision.

**Acceptable evidence:**
- Subscription receipt or invoice dated at or before the stated production date, confirming a paid plan with commercial output rights
- Account screenshot or confirmation email showing active commercial plan at relevant date
- Tool's published commercial licensing terms (link or screenshot) confirming output rights for the plan tier used

**Weak evidence:**
- Receipt without date, or with a date after the stated production date
- Receipt confirming a paid plan without confirming the tier's commercial output rights
- Submitter statement that they had a commercial license, without documentation
- Screenshot of current plan without confirmation of plan at time of generation

**Typical evidence gaps:**
- No receipt or account confirmation provided
- Free or personal-tier subscription used for content now being submitted for commercial use
- Tool version or plan tier unclear — tool may have multiple tiers with different commercial rights
- Tool's terms changed between generation and submission — prior terms applied at time of generation

**Decision logic:**

| Evidence state | Judgment |
|---------------|----------|
| Receipt confirms commercial plan active at generation date + terms confirm commercial output rights | **Verified** |
| Receipt present but date unclear or post-production | **Partially Verified** — note date gap; moderate commercial impact |
| Terms confirm commercial rights but no receipt / account confirmation | **Partially Verified** — note missing receipt; commercial impact depends on tool and tier |
| No receipt, no account confirmation, no tier information | **Not Provided** — High commercial impact |
| Tool declared as used but not included in license documentation | **Not Provided** for that tool — High commercial impact if it was a primary generation tool |

**Enterprise-tier considerations:** Enterprise and business-tier subscriptions typically include broader commercial indemnification from the AI vendor. When the submitter can confirm enterprise-tier usage, note this as a mitigating factor for residual training data liability (Domain I). Do not overweight this — enterprise licensing reduces residual risk from vendor indemnification; it does not eliminate all IP risk.

**Date alignment:** The license must be active at the time of generation. A current commercial subscription does not retroactively license content generated under a free or personal plan.

**Commercial implications:**
Unverified commercial licensing is the most direct source of commercial liability in AI-generated content. A tool used without commercial rights creates a direct infringement claim against the submitter and any downstream commercial party. This domain must be Verified or Partially Verified (with conditions to close the gap) for SI8 to reach a positive outcome.

---

### Domain H — Human Creative Contribution

**Purpose:** Document the nature and extent of human creative involvement in the final output.

**Reviewer objective:** Confirm that a human was meaningfully involved in the creative direction, editing, or production of the content, and that this involvement is documented.

**Important caveat:** SI8 does not make copyright determinations. The question in this domain is not "is there enough human creativity for copyright protection?" — it is "is there documented evidence of human creative involvement that supports the submitter's claim to have created or directed this content?" The copyright question belongs to courts and lawyers. The commercial risk question belongs to SI8.

**Acceptable evidence:**
- Written workflow description explaining: what was prompted, what generation iterations occurred, what editing decisions were made, and who made them
- Prompt log or generation notes (if preserved) — confirms authorship of the generative inputs
- Editing or post-production description — confirms human refinement of AI output
- Storyboard, brief, or creative direction document
- Project file or editing timeline export

**Weak evidence:**
- "I used [Tool Name] to create this" — without describing what was directed, edited, or decided
- Generic description of the tool without description of the specific creative work
- Prompt log only, without description of the selection, editing, or refinement process

**Typical evidence gaps:**
- No workflow description provided
- Submitter confirms AI was used but does not describe their role
- Content appears highly polished but the workflow described is minimal — possible inconsistency (flag for Domain D)

**Decision logic:**

| Evidence state | Judgment |
|---------------|----------|
| Clear workflow description with specific creative decisions documented | **Verified** |
| Some workflow description but gaps (e.g., generation described, editing not mentioned) | **Partially Verified** |
| Tool name provided but no description of creative involvement | **Not Provided** |
| Submitter explicitly states AI generated the content with no human direction | **Not Provided** — and flag as a material finding |

**Note on fully automated content:** If the submitter indicates that no human creative direction was involved — the tool was run without meaningful human input — this should be flagged as a material finding. The commercial implications of fully automated content (no copyright protection, no chain of creative authorship) are significant. SI8 does not refuse to assess such content, but the finding must appear clearly in the report.

**Commercial implications:**
Documented human creative involvement supports the submitter's ability to claim authorship and to enter into licensing agreements with confidence. Absence of documentation increases uncertainty about who has the authority to license the content and whether any copyright protection exists. For E&O underwriting purposes, documented creative direction is typically required.

---

### Domain I — Third-Party IP

**Purpose:** Identify whether identifiable third-party copyrighted material appears in the content or was used in its creation.

**Reviewer objective:** Review the content directly for visible third-party IP and assess the submitter's disclosure regarding training data and any licensed third-party assets incorporated into the final output.

**This domain requires direct content review.** The reviewer must watch or view the content, not rely solely on the submitter's disclosure.

**Acceptable evidence:**
- Content accessible for direct review
- Submitter disclosure that no third-party IP was intentionally incorporated
- License documentation for any third-party assets incorporated (stock footage, images, graphics)
- Tool's published statement regarding training data composition

**Weak evidence:**
- Submitter disclosure without direct content review
- License documentation for some assets but not all incorporated elements

**Typical evidence gaps:**
- Content not accessible for review (broken link, password-protected, not yet rendered)
- Submitter unsure whether any third-party IP appears
- Training data composition not disclosed or unknown

**Decision logic:**

*Visual review:*
- No identifiable third-party IP observed, submitter confirms no intentional use: **Verified** (with note that visual review is not exhaustive — this is a standard scope limitation)
- Identifiable third-party IP observed (character, logo, artwork, distinctive architectural work): **Not Provided** or **Flag as Finding** depending on whether the submitter disclosed and licensed it
- Content not accessible for review: **Not Provided** — note that direct review was impossible; this is a scope limitation that must appear in the Report

*Stock and licensed assets:*
- No third-party assets incorporated: note this in findings; **Verified** for this sub-control
- Third-party assets incorporated with license documentation: **Verified**
- Third-party assets incorporated without license documentation: **Not Provided** — High commercial impact

*Training data:*
SI8 cannot independently audit training data. The reviewer notes what the submitter disclosed and references the tool's published position. Training data liability is a residual risk for all AI-generated content — it should appear in the Residual Commercial Risks section of the Report regardless of how well other controls are verified. It is not a finding that blocks a positive outcome; it is a structural residual risk inherent to the current AI content landscape.

**Commercial implications:**
Identifiable third-party IP in commercial content creates direct infringement liability. Training data liability is a residual risk that cannot be fully mitigated at the evidence level — it is flagged as a structural uncertainty in every assessment. Licensed third-party assets that are confirmed reduce risk but should be documented explicitly.

---

### Domain L — Likeness & Performer Rights

**Purpose:** Identify whether any real person's likeness, face, voice, or distinctive persona appears in the content, and whether consent or rights documentation is in place.

**Reviewer objective:** Through direct content review, determine whether any identifiable real person appears. If yes, confirm documentation. Note jurisdiction-specific obligations for all submissions with US territory deployment.

**This domain requires direct content review.**

**Acceptable evidence:**
- Content accessible for direct review
- Submitter confirmation that no real person appears (and content review consistent with this)
- Signed talent release or right of publicity license for any real person who appears
- Consent documentation for any named individual depicted

**Weak evidence:**
- Submitter says "no real person appears" without content being accessible for review
- Release documentation that is unsigned or undated

**Typical evidence gaps:**
- AI-generated performer resembles a specific real person but no release is present
- Submitter uncertain whether their AI-generated performer resembles a real person
- Voice synthesis used — submitter unsure whose voice characteristics the synthesis resembles
- No talent release when a real person clearly appears

**Decision logic:**

| Evidence state | Judgment |
|---------------|----------|
| Content reviewed; no identifiable real person present; submitter confirms | **Verified** |
| Content reviewed; AI-generated performers present but clearly generic (no resemblance to any specific person) | **Verified** — note that this determination is reviewer's visual assessment |
| Content reviewed; AI-generated performer resembles a specific real person; no release | **Not Provided** — High commercial impact; flag as finding |
| Real person appears; release documentation confirmed | **Verified** |
| Real person appears; no release documentation | **Not Provided** — High commercial impact |
| Voice synthesis used; no information on voice model source or consent | **Partially Verified** — flag as gap |

**The "identifiable" threshold:** An AI-generated face is identifiable if a reasonable observer would recognize it as depicting a specific real person. This is a visual judgment call. When uncertain, document the uncertainty in the Findings Log rather than making a definitive call. The reviewer is not making a legal determination — they are documenting whether a reasonable commercial concern exists.

**NY Synthetic Performer Law (S.8420-A, effective June 9, 2026):** For any submission with US territory in the intended deployment, flag this law's applicability. The law requires disclosure when AI-generated performers are used in commercial content. This is a disclosure obligation (not a consent obligation) but it is jurisdiction-specific and commercially significant. Note it in the Residual Commercial Risks section for all US-deployed commercial AI video.

**Commercial implications:**
Likeness rights violations expose the submitter and downstream commercial parties to direct legal liability. NY Synthetic Performer Law creates specific disclosure obligations for US commercial deployment. For content with no identifiable real person, this domain contributes to a clean assessment. For content with an AI-generated performer that resembles a real person, this is a commercially material risk regardless of intent.

---

### Domain T — Technical Provenance

**Purpose:** Document the production workflow at a level that supports the commercial license verification and establishes a basis for the overall evidence package.

**Reviewer objective:** Confirm that the production workflow is described specifically enough to support the other domain findings. Provenance metadata (if present) is noted as a positive factor.

**Acceptable evidence:**
- Written workflow description naming each tool, its role, and the sequence of use
- Description of the generation → selection → editing → finalization process
- Prompt logs or generation notes (if preserved)
- Tool export files, project files, or metadata
- C2PA / Content Credentials embedded in the file (if present — note the tool that embedded it)
- On-chain registration or hash record (if present — note the registry)

**Weak evidence:**
- Tool name provided without workflow description
- Workflow described only in general terms ("I used AI tools to make this")
- Provenance metadata present but no workflow description — metadata alone is insufficient if the production process is otherwise undocumented

**Typical evidence gaps:**
- No workflow description provided
- Content appears technically sophisticated but the described workflow is minimal — possible inconsistency (flag for Domain D)
- Generation logs not preserved — common and acceptable if the workflow description is sufficiently specific

**Decision logic:**

| Evidence state | Judgment |
|---------------|----------|
| Workflow description names tools, sequence, and production steps with specificity | **Verified** |
| Workflow described but incomplete (e.g., generation named, editing not mentioned) | **Partially Verified** |
| Only tool name provided, no workflow description | **Not Provided** |
| Workflow description present + provenance metadata present | **Verified** — note metadata as a positive factor |

**Provenance metadata is not required.** C2PA / Content Credentials and on-chain registration are optional evidence types that strengthen the evidence package. Their absence is not a finding. Their presence is noted as a positive factor in Technical Provenance and in the Residual Commercial Risks section (as a mitigation for training data and provenance uncertainty).

**Commercial implications:**
A documented production workflow supports the credibility of all other domain findings. A workflow description that is too vague to reconstruct raises questions about whether the evidence in other domains can be trusted. The reviewer should note explicitly when findings in other domains rely primarily on submitter assertion rather than documentation — this affects the confidence level.

---

### Domain D — Documentation Integrity

**Purpose:** Assess whether the submitted evidence is internally consistent — that dates, declared tools, workflow descriptions, and content characteristics align with each other.

**Reviewer objective:** Identify material inconsistencies in the evidence package. Minor inconsistencies (date off by a month, tool version not specified) are noted but may not affect findings. Material inconsistencies (receipt post-dates production, tool declared is incapable of producing the content described) are findings.

**Acceptable evidence:**
No separate evidence type — this domain is assessed by cross-referencing evidence from all other domains.

**Typical inconsistencies to check:**

- **Date alignment:** Does the receipt or subscription confirmation date align with the stated production timeline? A receipt dated after the production date requires explanation.
- **Tool-to-content consistency:** Does the content appear consistent with the tools declared? A highly rendered cinematic piece declared as created with a free-tier mobile tool raises a consistency question.
- **Workflow-to-evidence consistency:** Does the workflow description align with the evidence? If the submitter describes extensive editing but no post-production tools are declared, note the gap.
- **CertForm internal consistency:** Are there any contradictions between different sections of the submission? (e.g., Section 5 says no third-party assets; Section 6 references licensed stock music)

**Decision logic:**

| Evidence state | Judgment |
|---------------|----------|
| No material inconsistencies identified | **Verified** |
| Minor inconsistencies noted (likely administrative) | **Partially Verified** — note in Gap Log |
| Material inconsistency identified (date misalignment, capability mismatch, cross-section contradiction) | **Not Provided** — flag as finding; assess commercial impact based on which domain the inconsistency affects |

**Commercial implications:**
Inconsistencies in the evidence package reduce the overall reliability of the assessment. A material inconsistency in a commercially critical area (e.g., receipt dated after production) should reduce the confidence level and should appear as a finding, not just a gap. The reviewer is not investigating fraud — but material inconsistencies should be documented transparently.

---

## Part 5 — Assessment Synthesis

### How to Reach the Overall Assessment

After completing all domain assessments, the reviewer synthesizes findings into a single overall outcome. This synthesis is a judgment call — the domain assessments provide the inputs, but the overall assessment requires the reviewer to weigh them.

Work through these questions in order:

**1. What is the status of the two most commercially critical domains?**

Domain R (Commercial Rights & Licensing) and Domain L (Likeness & Performer Rights) are the two domains most directly tied to commercial liability. If either is "Not Provided" with High commercial impact, the assessment is unlikely to support intended commercial use without conditions or material risk findings.

**2. Are there any findings that independently block commercial deployment?**

Certain findings — if confirmed — are material enough to produce an adverse outcome regardless of how well other domains are evidenced:
- A real person's likeness present without a release
- No commercial license for the primary generation tool
- Identifiable third-party IP present without licensing
- A material inconsistency in the evidence package that undermines a core domain finding

**3. What is the overall evidence quality across all 7 domains?**

Count the Verified, Partially Verified, and Not Provided judgments. A submission with 6 Verified domains and 1 Not Provided in a Low-impact control supports a positive outcome. A submission with 3 Verified, 2 Partially Verified, and 2 Not Provided in High-impact domains does not.

**4. Are the identified gaps addressable?**

The distinction between "Evidence Supports with Conditions" and "Evidence Indicates Material Commercial Risks" often turns on addressability. If the primary gaps are things the submitter can resolve before deployment — retain documentation, obtain a release, confirm plan tier — conditions can close those gaps. If the gaps are not addressable (content was generated before any commercial license existed, a real person appears without any path to consent), the outcome may be Material Commercial Risks.

---

### Outcome Decision Logic

**Evidence Supports Intended Commercial Use**

Use when:
- Domains R and L are Verified
- Domain A is Verified
- Domain D shows no material inconsistencies
- Any Not Provided controls are Low commercial impact
- No material adverse findings

Confidence: High

---

**Evidence Supports Intended Commercial Use with Conditions**

Use when:
- Core evidence is largely present
- Specific, addressable gaps remain (typically 1-3 conditions)
- The gaps do not independently block commercial deployment — they require the submitter to take a specific action before or during deployment
- The reviewer can write a condition that, if satisfied, would raise the assessment to "Evidence Supports"

Conditions must be:
- Specific (name the exact action: "retain the AI tool subscription receipt confirming active paid plan at time of generation")
- Actionable by the submitter (not dependent on third-party action)
- Commercially meaningful (not included simply to add caveats)

Confidence: High or Medium depending on the impact of the conditions

---

**Evidence Indicates Material Commercial Risks**

Use when:
- A finding in a High-impact domain is confirmed and not addressable through conditions
- An adverse finding exists (identifiable real person without release, no commercial license for primary tool, identifiable third-party IP)
- Material inconsistencies undermine core domain findings
- The gaps cannot be resolved through conditions — they represent actual commercial risks that the submitter must manage

This outcome does not mean the content cannot be deployed — it means SI8's assessment has identified specific risks that the commercial decision-maker should be aware of. The report should explain what those risks are and their commercial implications clearly.

Confidence: Low or Medium

---

**Insufficient Supporting Evidence**

Use when:
- The submission is too incomplete to reach a reliable assessment in either direction
- Multiple core domains are "Not Provided"
- The content is not accessible for review
- The workflow description is too vague to support any domain finding

This is distinct from "Material Commercial Risks": here, the evidence is insufficient to make any reliable determination. The reviewer cannot say the content supports or risks commercial use — they can only say the evidence isn't there to evaluate.

Confidence: Low

---

**Unable to Reach Assessment**

Use only in exceptional circumstances:
- The submission is technically broken and cannot be remediated without a new submission
- A post-intake scope conflict is discovered that should have been caught by the No List
- The content is materially different from what was represented in the submission
- A conflict of interest is identified post-intake that the reviewer cannot manage

Document specifically why the assessment cannot proceed. Contact JD before selecting this outcome.

---

### Determining Commercial Confidence

| Confidence | Conditions |
|-----------|-----------|
| **High** | Domain R Verified. Domain L Verified or N/A. Domain A Verified. Domain D no material inconsistencies. All Not Provided controls are Low commercial impact. |
| **Medium** | Core domains largely verified but 1-2 Partially Verified in commercially significant areas. Or one addressable gap with Medium commercial impact. Or Domain T is Not Provided (workflow undocumented). |
| **Low** | Domain R is Not Provided or Partially Verified with High impact. Or Domain L is Not Provided with High impact. Or multiple domains Not Provided. Or material inconsistency in Domain D affecting core findings. |

---

### Common Synthesis Errors

- **Assigning positive outcome when Domain R is Partially Verified with a missing receipt.** This should be "with Conditions" at minimum — the receipt is a specific addressable gap.
- **Assigning High confidence when Domain T is Not Provided.** If the workflow is undocumented, findings in other domains rely on submitter assertion. Confidence should be Medium.
- **Writing conditions that are not actionable.** "Ensure the content is compliant" is not a condition. "Retain the AI tool subscription receipt confirming active paid plan at time of generation" is a condition.
- **Conflating findings with residual risks.** A finding is evidence-based and specific to this submission. A residual risk is a structural uncertainty that applies across all AI-generated content (training data liability, evolving regulations). Both belong in the report, but they are different things.
- **Including more than 5 items in Key Findings in the Dashboard.** The Dashboard is for commercial decision-makers with limited time. Lead with the 3-5 most commercially significant findings.

---

## Part 6 — Report Guidance

### From Workbook to Report

The reviewer completes Workbook Section 6 (Report Brief) as a working draft, then transfers that content into the Assessment Report Template v0.2. The Report is refined in the template — Section 6 is a bridge, not a final draft.

---

### Section 1: Commercial Assurance Summary Dashboard

**Overall Assessment:** State the outcome and the basis in 2-3 sentences. Write for a general counsel with 90 seconds to understand the finding. Avoid jargon. State what the evidence shows and what that means for deployment.

Good: *"SI8 reviewed the Campaign Assurance submission for [Title], an AI-generated social campaign for financial services deployment. Commercial licensing was confirmed for all three AI generation tools, no identifiable real persons were identified in the content, and the production workflow was documented. The evidence reviewed supports the intended commercial use."*

Avoid: *"Based on our assessment of the evidence provided through the CertForm submission system, we have evaluated the content against our seven-domain framework and reached the following determination regarding commercial deployment suitability..."*

**Commercial Confidence:** Assign after the domain assessment is complete. See Part 5.

**Evidence Coverage Overview:** Pull directly from the domain judgments in Workbook Section 2. One-line commercial impact note for any gap — not a finding, just a brief orientation for the reader.

**Key Findings:** 3–5 maximum. Lead with the finding that most affects the deployment decision. Mix positive and negative findings — a clean Domain R finding is worth stating because it tells the reader something was actually confirmed.

**Conditions:** Only if outcome is "with Conditions." Conditions must be specific and actionable. Do not write conditions as hedges — write them as steps the submitter must take.

**Residual Commercial Risks:** 2–3 maximum. These are ongoing risks to monitor — not conditions and not findings. Training data liability appears as a residual risk in every assessment (it is a structural risk in the current AI content landscape). NY Synthetic Performer Law disclosure obligations appear for any US-deployed commercial content.

**Recommended Next Steps:** Always include "Retain this report and supporting submission package." Always include "Resubmit on material change." Add 1–2 specific to this assessment (condition follow-through, jurisdiction-specific monitoring).

---

### Section 3: Domain Assessment

Each domain block follows the same structure: evidence status / evidence reviewed / finding / commercial implication.

**Evidence reviewed:** Describe specifically what was provided and what was reviewed. Not "commercial license documentation" — "Runway subscription receipt dated June 14, 2026, confirming an active Standard plan with commercial output rights."

**Finding:** A factual statement. What the evidence shows. Not what the reviewer thinks about it.

Use: *"The commercial licensing documentation confirms that [Tool] was used on a paid plan with commercial output rights active at the stated production date."*

Avoid: *"We were satisfied with the licensing documentation provided."*

**Commercial implication:** What the finding means for deployment. Not what the reviewer recommends.

Use: *"Commercial output rights for [Tool] are confirmed for the stated production date. This supports the submitter's authority to deploy AI-generated outputs from this tool in commercial contexts."*

Avoid: *"This means the video is cleared for commercial use."*

---

### Language Standards

**Use:**
- "evidence reviewed"
- "evidence provided"
- "evidence indicates / confirms / does not establish"
- "the submission confirms" / "the submission does not include"
- "the assessment is unable to verify"
- "the commercial implication of this gap is..."
- "a reasonable commercial party should be aware that..."

**Avoid:**
- "we found" (implies investigation beyond what was submitted)
- "we believe"
- "this is safe" / "this is not safe"
- "legally compliant" / "legally cleared"
- "the reviewer could not find" (sounds like reviewer error, not evidence absence)
- "we recommend against deployment" (this is a commercial implication statement, not SI8's role)
- "guaranteed" / "certifies" / "warrants"

---

### Standard Assurance Language

The Standard Assurance Language must appear verbatim in every report. Do not edit it. Do not abbreviate it. Do not paraphrase it.

If a customer asks why certain language is in the report, explain it in plain language: "This is our standard limitation of assurance — it's in every report we produce because SI8's assessment is evidence-based, not a legal opinion or a guarantee."

---

### Appendix A: Supporting Evidence Record

Populate from the Workbook evidence log. This is a structured record — not a narrative, not a finding. Each row should reflect what was confirmed or noted, not what the reviewer thinks about it.

---

## Part 7 — Governance

### How the Manual Is Updated

The Manual is updated when operational evidence demonstrates that the current guidance is incomplete, ambiguous, or incorrect. It is not updated on a calendar schedule.

**Primary input mechanism:** The Post-Assessment Review Template (v0.1). Every assessment ends with a completed Post-Assessment Review within 24 hours of report delivery. The Post-Assessment Review captures:
- Controls that required difficult judgment
- Evidence consistently missing across assessments
- Cases where the Manual's guidance was unclear or absent
- Recommendations for specific wording or threshold changes

**Trigger conditions for Manual updates:**

| Trigger | Example |
|---------|---------|
| Repeated reviewer ambiguity on a specific control | "L02 came up in three assessments and the decision criteria for 'identifiable' wasn't clear enough each time" |
| Repeated evidence gap of the same type | "R01 is missing a receipt in every submission — the guidance on acceptable alternatives needs clarification" |
| A decision was made that differs from the Manual's guidance | "I made a different judgment call on Domain H than the Manual suggests — here's why" |
| A vendor's licensing terms change materially | "Runway updated their commercial output rights policy in August 2026 — Domain R guidance needs to reflect this" |
| A significant court decision or regulatory guidance affects evidence weighting | "The Copyright Office's March 2026 guidance changes how we treat Human Creative Contribution documentation" |

**Trigger conditions for Methodology updates (higher threshold):**

| Trigger | Example |
|---------|---------|
| 3+ assessments expose the same systemic gap in the 7-domain structure | "Music licensing is appearing as a standalone commercial risk that Domain I doesn't adequately cover" |
| SI8 decides to expand what it evaluates | New domain added (e.g., Platform Distribution Compliance) |
| Regulatory consensus changes SI8's evaluation framework | New category of AI-content obligation emerges that doesn't fit existing domains |

The Methodology evolves much more slowly than the Manual. Manual changes are operational improvements. Methodology changes represent a change in what SI8 evaluates.

---

### Who Decides

JD Chang acts as the Standards Committee for SI8 at current scale.

1. Post-Assessment Review completed within 24 hours of delivery
2. Proposed changes documented in the Post-Assessment Review (Workbook Improvements / Methodology Improvements sections)
3. JD reviews and approves proposed changes
4. Approved changes are incorporated into the next version of the Manual

Changes do not take effect between versions. When a meaningful number of approved changes accumulate, a new version is issued. The version number increments: v0.1 → v0.2 → v1.0.

**v1.0 target:** After approximately 5 real assessments, when the Manual has been stress-tested across a range of real submissions and the core decision logic has been validated or revised by operational evidence.

---

### Case Library Relationship

The Case Library (future artifact) will provide precedent entries that inform Part 4 (Domain Guidance). The Case Library flag on the Post-Assessment Review is the mechanism for identifying which assessments become Case Library entries.

A Case Library entry does not automatically update the Manual. It provides a reference case that may inform a future Manual revision. The reviewer may reference relevant Case Library entries in the Findings Log when a current assessment resembles a prior case.

---

### Version History

| Version | Date | Summary of Changes |
|---------|------|-------------------|
| 0.1 | 2026-07-05 | Initial version — all 7 parts. Pre-operational; domain decision thresholds are design estimates. |

---

*SI8 Reviewer Manual — Volume I · PMF Strategy Inc. d/b/a SuperImmersive 8*
*Internal use only — do not share with customers or third parties*
