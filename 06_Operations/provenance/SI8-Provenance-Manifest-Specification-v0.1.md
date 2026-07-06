# SI8 Provenance Manifest Specification
**Version:** 0.1 · July 6, 2026
**Status:** DRAFT — pending review before sharing with Numbers Protocol
**Author:** SI8 — PMF Strategy Inc. d/b/a SuperImmersive 8

---

## Purpose

This document defines SI8's canonical information model for provenance output. It is deliberately independent of any specific infrastructure provider.

When SI8 completes a Campaign Assurance Assessment, it produces a structured set of outputs. Some of those outputs are embedded in the final video file. Some are delivered to the client. Some are shared with third parties via a public verification URL. Some are retained internally and never disclosed.

This specification defines what information belongs where, and why.

It is the document SI8 sends to Numbers Protocol alongside a sample MP4 to initiate the manifest mapping exercise.

---

## Governing Principles

**P2 — Technology Neutrality:** This specification must work with any future provenance infrastructure provider. If SI8 migrates from Numbers Protocol to a self-hosted C2PA implementation or an alternative signing service, only the implementation changes — the information model remains stable.

**P3 — Independent Assessment Is the Product:** The value SI8 delivers is human judgment. The provenance infrastructure carries that judgment. It does not create it.

**P6 — The File Is the Carrier; the Commercial Trust Layer Is the Product:** The video file carries the embedded signals. The SI8 assessment is the trust layer those signals point to.

---

## The Governing Question for Every Field

Before deciding where any piece of information belongs, four questions must be answered:

1. **Who reads this?** Machine reading a C2PA manifest / legal team reading the full report / brand reviewing the verification page / SI8 internally during an audit
2. **When is it read?** At delivery / two years later in a legal dispute / never
3. **Is it appropriate for public disclosure?** C2PA manifests are publicly readable — any embedded field is a public record
4. **What happens if it is wrong or needs correction?** An embedded hash cannot be "corrected" after signing; a report can be revised with a superseding version

These questions determine which disclosure zone a field belongs to.

---

## The Four Disclosure Zones

Rather than treating provenance as a stack of layers, SI8's information model is organized by disclosure scope. Every field belongs to exactly one zone.

| Zone | Name | Who can read it | When it is accessed |
|------|------|-----------------|---------------------|
| **Zone A** | Embedded in file | Anyone with the video file and a C2PA reader | Anytime, without contacting SI8 |
| **Zone B** | Public verification page | Anyone with the Assessment ID or verification URL | Anytime, via verify.superimmersive8.com |
| **Zone C** | Client deliverable | Authorized recipients (client, their legal team, E&O insurer) | At delivery; during due diligence |
| **Zone D** | Private archive | SI8 only | Internal audits; legal proceedings (if subpoenaed) |

---

## Zone A — Embedded in File (C2PA Manifest)

### What Zone A Is

Zone A fields are cryptographically bound to the specific video file via the C2PA manifest. They are tamper-evident — any modification to the video after signing invalidates the manifest. They are publicly readable by anyone who opens the file with a C2PA-compatible tool or viewer.

**Because Zone A is public, the bar for inclusion is high.** Only fields that are:
- Appropriate for permanent public disclosure
- Meaningful to a machine or third-party auditor without additional context
- Stable (unlikely to require correction after signing)

### Zone A Fields

**Assessment Identity** — always present

| Field | Format | Example | Rationale |
|-------|--------|---------|-----------|
| `si8:assessment_id` | ASSESS-NNN-YYYY-MM-DD | ASSESS-001-2026-08-15 | Primary link between manifest and SI8 record |
| `si8:assessment_date` | ISO 8601 | 2026-08-15 | Establishes when the assessment was performed |
| `si8:reviewer_org` | String | PMF Strategy Inc. d/b/a SuperImmersive 8 | Establishes who performed the review |
| `si8:methodology_version` | String | SI8 Reviewer Manual v0.1 | Tells a future auditor which framework was used |
| `si8:verification_url` | URL | https://verify.superimmersive8.com/ASSESS-001-2026-08-15 | Primary human-readable access path to the full outcome |

**Outcome Assertions** — always present

| Field | Format | Values | Rationale |
|-------|--------|--------|-----------|
| `si8:outcome_id` | Enum | EVIDENCE_SUPPORTS · EVIDENCE_SUPPORTS_WITH_CONDITIONS · MATERIAL_RISKS_IDENTIFIED · INSUFFICIENT_EVIDENCE · UNABLE_TO_ASSESS | Machine-readable verdict; paired with assessment_date for correct interpretation |
| `si8:confidence_level` | Enum | HIGH · MEDIUM · LOW | Point-in-time confidence as of assessment_date |
| `si8:commercial_authorization` | Enum | AUTHORIZED · CONDITIONS_APPLY · NOT_AUTHORIZED | Simplified outcome for machines and platform integrations |

**Report Integrity** — always present

| Field | Format | Rationale |
|-------|--------|-----------|
| `si8:report_hash` | SHA-256 hex | Cryptographically binds this manifest to the specific PDF delivered. Without this, a fraudulent report could claim to be the one referenced. |
| `si8:report_version` | String (e.g. v0.2) | Identifies which report template was used; helps future auditors understand the document format |

**Generic Disclosure** — present by default; client may opt out

| Field | Format | Default | Rationale |
|-------|--------|---------|-----------|
| `si8:ai_generated_content` | Boolean | true | Simple machine-readable flag; no tool detail |
| `si8:commercial_licenses_confirmed` | Boolean | true | Confirms licenses existed; not the invoices themselves |
| `si8:likeness_assessment` | Enum | NO_SYNTHETIC_PERFORMERS · SYNTHETIC_PERFORMERS_CONSENTED · UNABLE_TO_ASSESS | Generic finding; not the specific evidence reviewed |

### What Does NOT Belong in Zone A

**AI tool names** — which specific tools the client used is the client's disclosure decision, not SI8's. SI8 confirms that commercial licenses exist. The tool names are in Zone C (client report) and Zone D (evidence archive). An opt-in field `si8:ai_tools` can be included if the client explicitly requests public tool disclosure — this must be a deliberate choice, not a default.

**Domain-level findings** — the specific findings for each of the 7 assessment domains (Identity, Rights, Human Creative Contribution, Third-Party IP, Likeness, Technical Provenance, Documentation Integrity) are rich narrative text. They belong in Zone C (the PDF report). Embedding abbreviated versions in Zone A would lose nuance and create permanent public statements that may require correction.

**Conditions and residual risks** — the specific conditions attached to a conditional outcome belong in Zone C. The manifest records that conditions exist (`EVIDENCE_SUPPORTS_WITH_CONDITIONS`); the conditions themselves are in the report.

**Evidence package hash** — a cryptographic reference to the evidence archive would imply SI8 holds that package and can produce it on demand. This may create discovery obligations in future legal proceedings. The evidence is retained in Zone D; its existence is documented internally; neither requires a public pointer. This field is intentionally omitted.

**Pricing, client identity, invoice amounts** — all Zone D. Never public.

### Zone A: Workflow Dependency

The report hash (`si8:report_hash`) creates a hard dependency: the PDF report must be finalized and hashed before the C2PA signing can occur. The correct workflow is:

```
Assessment complete → Report PDF finalized → Report SHA-256 computed →
C2PA manifest built with report hash → Capture API signs the video →
Delivery to client
```

The video cannot be signed until the report is locked. This is correct — an assessment that hasn't produced a final report cannot produce a credible embedded credential.

---

## Zone B — Public Verification Page

### What Zone B Is

Zone B is a public web page at `verify.superimmersive8.com/[ASSESS-ID]` that anyone can access using the Assessment ID from the C2PA manifest or directly from the report. It is the human-readable complement to the machine-readable manifest.

### Zone B Content

- Assessment outcome (plain language, not just the outcome code)
- Confidence level with explicit "as of [assessment date]" framing
- Name of reviewer organization
- Link to SI8 standard assurance language (the limitations text from Section 4 of the report)
- Assessment status: Active / Superseded / Withdrawn (if SI8 has issued a revised assessment)
- Whether conditions apply (yes/no — full conditions text requires Zone C access)
- Full report access gating: authorized recipients only (client, client-authorized parties)

### Zone B Does Not Include

- Domain-level findings or specific risk details
- Evidence file contents
- Client identity (unless the client has authorized public disclosure of their name)
- Pricing or commercial terms

### Year 1 Implementation Note

`verify.superimmersive8.com` does not exist yet. In Year 1, the verification URL can redirect to the admin panel's submission detail page (auth-gated). The Zone B architecture should be built before the first commercial assessment is delivered — clients and their legal teams will follow this URL.

---

## Zone C — Client Deliverable

### What Zone C Is

Zone C is the content SI8 delivers directly to the client. It includes everything a legal team, E&O insurer, or brand reviewer needs to evaluate the assessment. Zone C content is not public but may be shared with authorized third parties by the client.

### Zone C Content

The current Zone C deliverable is the SI8 Assessment Report (v0.2 template). It contains:

- Commercial Assurance Summary Dashboard (outcome, confidence, domain status grid)
- Full domain-by-domain assessment findings (7 domains: A/R/H/I/L/T/D)
- Specific conditions attached to a conditional outcome
- Residual risks and recommended next steps
- SI8 Standard Assurance Language (verbatim, Section 4)
- Supporting Evidence Record — Appendix A (what was reviewed, not the evidence itself)
- Chain of Title documentation

Zone C may also include, in future versions:
- The signed video file (if delivered alongside the report)
- A Zone B verification URL walkthrough for clients unfamiliar with C2PA

### What Zone C Does Not Include

Zone C does not include the evidence files themselves (Zone D). The Supporting Evidence Record in Appendix A names what was reviewed; the files are retained by SI8 per the evidence retention policy.

---

## Zone D — Private Archive

### What Zone D Is

Zone D is SI8's internal evidence archive. It is retained by SI8 only. It is never embedded, linked, referenced, or hashed in the public record.

### Zone D Contents

- Client-provided evidence files (subscription receipts, license documentation, talent releases, audio licenses)
- Generation history exports (Runway history, Kling history, etc.)
- Prompt logs if provided
- Completed reviewer workbook (including internal assessment notes)
- Evidence Gap Log
- Post-Assessment Review
- Internal communications related to the assessment
- Intake form submission data

### Retention

SI8 retains Zone D materials for a minimum of three years following delivery. This period may be extended if SI8 becomes aware of a dispute involving the assessed content.

### Why Zone D Has No Public Pointer

Evidence files include commercially sensitive materials (subscription invoices with amounts, contract terms, unreleased prompt strategies). Creating any public reference — even a hash — implies SI8 holds these materials and can produce them. SI8 may be subject to subpoena, but the appropriate mechanism for compelled disclosure is a legal process, not a voluntary public reference.

---

## Mapping to Numbers Protocol

This section maps SI8's conceptual model to Numbers Protocol / Capture's infrastructure. It is a compatibility assessment, not an implementation guide.

### What Numbers/Capture Can Represent

**C2PA Custom Assertions**

Numbers/Capture allows custom JSON in the C2PA manifest via a custom assertion namespace. SI8's Zone A fields would be declared under the namespace `si8.commercial-assurance/v1`.

All Zone A fields (assessment identity, outcome assertions, report integrity, generic disclosure) map cleanly to C2PA custom assertions. The key technical question — answered on the upcoming technical call — is whether the API accepts arbitrary JSON in a custom namespace and what field size limits apply.

**Numbers Verification URL**

Numbers/Capture provides a verify.numbersprotocol.io URL for every signed file. This is separate from SI8's own verification URL. Both should be present:

| URL | Purpose | Audience |
|-----|---------|---------|
| `verify.numbersprotocol.io/[hash]` | Technical provenance — on-chain timestamp, C2PA manifest viewer | Technical audience, platform integration |
| `verify.superimmersive8.com/[ASSESS-ID]` | Commercial assurance — outcome, conditions, report access | Legal teams, brand reviewers, E&O insurers |

**ERC-7053 On-Chain Record**

ERC-7053 registers the content hash on-chain with a timestamp. The primary value is immutable proof that this specific file version existed at a specific date. 

Open question: does the Numbers/ERC-7053 implementation support calldata or metadata fields? If yes, embedding the Assessment ID in the on-chain record creates a direct link between the blockchain timestamp and the SI8 assessment — useful for long-horizon legal defense. If no, the on-chain record still functions as a timestamp artifact; the Assessment ID lives in the C2PA manifest.

### What Numbers Cannot Represent

- Zone C content (the full report and findings) — this is delivered by SI8 directly, not embedded
- Zone D materials — private evidence archive, never embedded
- Dynamic fields (e.g., assessment status updates) — C2PA manifests are signed at a moment in time; if an assessment is superseded, the original manifest remains unchanged; the Zone B verification page handles status updates

### Mapping Summary

| SI8 Zone A Field | Numbers/Capture Mechanism | Confirmed? |
|------------------|--------------------------|------------|
| assessment_id | C2PA custom assertion | Pending technical call |
| assessment_date | C2PA custom assertion | Pending technical call |
| reviewer_org | C2PA claim_generator or custom assertion | Pending technical call |
| methodology_version | C2PA custom assertion | Pending technical call |
| verification_url | C2PA custom assertion or actions | Pending technical call |
| report_hash | C2PA custom assertion | Pending technical call |
| outcome_id | C2PA custom assertion | Pending technical call |
| confidence_level | C2PA custom assertion | Pending technical call |
| commercial_authorization | C2PA custom assertion | Pending technical call |
| ai_generated_content | C2PA custom assertion | Pending technical call |
| commercial_licenses_confirmed | C2PA custom assertion | Pending technical call |
| likeness_assessment | C2PA custom assertion | Pending technical call |
| on-chain assessment_id | ERC-7053 calldata (if supported) | Pending technical call |

---

## Trust List Independence

This specification does not assume Adobe Trust List recognition. The architecture is designed to deliver value regardless of Trust List status:

| What works without Trust List | What Trust List adds |
|-------------------------------|----------------------|
| Cryptographic binding of manifest to video | Named signer display in Adobe Content Authenticity viewer |
| Report hash integrity verification | Removal of "unknown signer" warning in Adobe viewer |
| Verification URL as human-readable path | Higher immediate credibility with legal teams using Adobe tools |
| On-chain timestamp proof | — |
| SI8 zone B outcome page | — |

Trust List recognition is an upgrade to the viewer experience, not a prerequisite for the information architecture.

**Implication for product messaging:** Until Trust List status is confirmed with a real signed sample, SI8 describes the output as: "C2PA Content Credentials embedded in the final video file, with Chain of Title fields represented as verified assertions, backed by an on-chain registration timestamp and accessible via SI8's verification URL." No Trust List, Adobe, or Content Authenticity viewer language until the display behavior is verified.

---

## Open Questions — Must Resolve Before Finalizing

| # | Question | Who answers it | Priority |
|---|----------|---------------|----------|
| OQ1 | Does embedding an outcome identifier in a public manifest create liability the standard assurance language doesn't cover? | Legal input | High — before finalizing Zone A |
| OQ2 | Does Capture's API accept custom assertion namespaces with arbitrary JSON? What are the field size limits? | Numbers technical call | High — before implementation scoping |
| OQ3 | Does ERC-7053 via Numbers support metadata/calldata for embedding Assessment ID? | Numbers technical call | Medium — value-add, not blocking |
| OQ4 | What is the correct C2PA assertion namespace format for a third-party commercial layer? (Is `si8.commercial-assurance/v1` valid per the spec?) | C2PA spec review | Medium — before finalization |
| OQ5 | What is SI8's evidence retention policy? (Minimum period, triggers for extended retention, destruction process?) | JD decision | Medium — Zone D governance |

---

## Version History

| Version | Date | Change |
|---------|------|--------|
| 0.1 | 2026-07-06 | Initial draft — four disclosure zones, Zone A field specification, Numbers Protocol mapping |

---

*SI8 Provenance Manifest Specification · PMF Strategy Inc. d/b/a SuperImmersive 8 · superimmersive8.com*
