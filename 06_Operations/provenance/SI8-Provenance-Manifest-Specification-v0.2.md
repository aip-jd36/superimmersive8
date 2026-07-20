# SI8 Provenance Manifest Specification
**Version:** 0.2 · July 12, 2026
**Status:** ACTIVE — supersedes v0.1
**Author:** SI8 — PMF Strategy Inc. d/b/a SuperImmersive 8

---

## Purpose

This document defines SI8's canonical information model for provenance output. It is deliberately independent of any specific infrastructure provider.

When SI8 completes a Campaign Assurance Assessment, it produces a structured set of outputs. Some are embedded in the final video file. Some are delivered to the client. Some are available via a public verification URL. Some are retained internally and never disclosed.

This specification defines what information belongs where, and why.

---

## Key Architectural Insight (added v0.2)

**The C2PA manifest is a fragile pointer. The Verification Page is the durable record.**

The C2PA manifest travels inside the video file's container. When a file is re-encoded — composited in an NLE, transcoded for platform delivery, processed through a client's DAM system, re-encoded by YouTube, Instagram, Meta, or TikTok on upload — the container is rebuilt from scratch. Standard encoders do not carry C2PA boxes forward. The embedded manifest is stripped.

The Verification Page, by contrast, lives on SI8's server. It is unaffected by what happens to the file.

**This reverses the intuition the architecture is built on.** The question is not "how much should we embed" as if the embed were the primary record. The embed is the fragile record. Design the Verification Page as the source of truth. Design the manifest as a lightweight pointer to it — one that survives if the file is handled gently, but whose loss does not destroy the evidentiary record.

**Consequence for Zone A design:** Nothing load-bearing can live only in the manifest. The manifest's job is to point to Zone B. Zone B's job is to confirm the assessment exists and remains valid. Zone C's job is to carry the full findings. This means Zone A should be as small as possible — not because minimalism is stylistically pleasing, but because the manifest may not survive at all.

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
3. **Is it appropriate for permanent public disclosure?** C2PA manifests are publicly readable — any embedded field is a public record
4. **What happens if it needs correction?** An embedded manifest cannot be corrected after signing; the Verification Page can be updated at any time

---

## The Four Disclosure Zones

| Zone | Name | Who can read it | Durable? |
|------|------|-----------------|---------|
| **Zone A** | Embedded in file | Anyone with the video file and a C2PA reader | Fragile — stripped by re-encoding |
| **Zone B** | Verification Page | Anyone with the Assessment Number or URL | Durable — lives on SI8's server |
| **Zone C** | Client deliverable (PDF) | Authorized recipients (client, their legal team, E&O insurer) | Durable — delivered directly |
| **Zone D** | Private archive | SI8 only | Durable — internal |

---

## Zone A — Embedded in File (C2PA Manifest)

### What Zone A Is

Zone A fields are cryptographically bound to the specific video file via the C2PA manifest. They are tamper-evident — any modification to the video after signing invalidates the manifest. They are publicly readable by anyone who opens the file with a C2PA-compatible tool or viewer.

**Zone A is the fragile record.** It may not survive re-encoding, platform upload, or DAM processing. Nothing load-bearing can live only here.

**Because Zone A is public, the bar for inclusion is high.** Only fields that are:
- Appropriate for permanent public disclosure
- Meaningful to a machine or third-party auditor without additional context
- Stable — unlikely to require correction after signing

### Zone A — Confirmed Fields (v1)

Embedded as custom assertions under namespace `si8.commercial-assurance/v1`:

| Field | Format | Example | Rationale |
|-------|--------|---------|-----------|
| `si8:assessment_number` | ASSESS-NNN-YYYY-MM-DD | ASSESS-001-2026-07-10 | Primary link between manifest and SI8 Registry |
| `si8:assessment_date` | ISO 8601 | 2026-07-10 | Establishes when the assessment was performed |
| `si8:reviewer_organization` | String | PMF Strategy Inc. d/b/a SuperImmersive 8 | Establishes who performed the review |
| `si8:methodology_version` | String | SI8 Reviewer Manual v0.2 | Tells a future auditor which framework was used |
| `si8:outcome_code` | Enum | EVIDENCE_SUPPORTS | Machine-readable verdict |
| `si8:verification_url` | URL | https://app.superimmersive8.com/assessment/ASSESS-001-2026-07-10 | Primary access path to the authoritative record |

Standard C2PA field (in the `c2pa.actions` assertion, not a custom namespace):

| Field | IPTC URI | Rationale |
|-------|---------|-----------|
| `digitalSourceType` | `compositeWithTrainedAlgorithmicMedia` or `trainedAlgorithmicMedia` | Ecosystem interoperability signal — enables platform auto-labeling |

### Zone A — Confirmed Exclusions (v1)

**Confidence level** — excluded from Zone A entirely. Confidence is PDF-only. In isolation, "High confidence" divorced from "High confidence *given these specific gaps and scope limitations*" is the overclaim SI8's entire liability posture is built to avoid. Confidence belongs in the report where the reviewer's full reasoning contextualizes it.

**Report hash** — deferred to v2. Stored internally as `pdf_hash_sha256` in the Assessment Registry. Not embedded. Not displayed publicly. If SI8 needs to issue a corrected report, the correct mechanism is a new Assessment Number; the Verification Page status field handles supersession. Embedding the hash in v1 before correction workflows are established creates a correctability trap.

**AI tool names** — excluded. Which specific tools the client used is the client's disclosure decision, not SI8's. SI8 confirms that commercial licenses existed; the tool names are in Zone C.

**Domain-level findings** — excluded. Rich narrative text belongs in Zone C. Embedding abbreviated versions in Zone A creates permanent public statements that may require correction and loses the nuance that protects SI8 from misinterpretation.

**Intermediate reasoning** — excluded. Fields like "commercial licenses confirmed" or "no likeness identified" strip the professional qualification that protects SI8. The manifest records the overall commercial verdict; the report explains it. Additionally, a permanent public assertion that "commercial licenses confirmed: true" carries liability if it later emerges that submitted documentation was fraudulent — the manifest cannot be recalled.

**Customer identity, campaign identity, pricing** — Zone D only. Never public.

### `digitalSourceType` — Regulatory Boundary

`digitalSourceType` is a provenance metadata field for ecosystem interoperability. It tells platforms and validators that AI was involved in creating the content, enabling auto-labeling.

It is **not** an SI8 assertion. It is **not** a compliance claim. It carries no legal or regulatory opinion.

Specifically, it must not be described as fulfilling EU AI Act Article 50 obligations. Article 50(2) is the AI system **provider's** obligation (Runway, Kling, Veo) — not SI8's and not the agency's. Article 50(4) (human-visible disclosure) is handled by deployers via platform toggles, not by embedded metadata. SI8 includes `digitalSourceType` as a standard interoperability signal; it makes no compliance claim through it.

Correct product framing: *"SI8 restores the machine-readable provenance signal that compositing stripped, enabling platform auto-labeling."* Not: *"SI8 fulfills your Article 50 disclosure obligation."*

### Zone A — Workflow Dependency

The verification URL must be deterministic from the assessment number — the URL can be constructed before signing. The workflow is:

```
Assessment complete → Report PDF finalized → PDF SHA-256 computed (stored internally) →
C2PA manifest built with Zone A fields → Capture API signs the video →
Delivery to client
```

The video cannot be signed until the assessment is complete and persisted. This is correct — an assessment that hasn't produced a final report cannot produce a credible embedded credential.

---

## Zone B — Verification Page

### What Zone B Is

Zone B is a public web page at `app.superimmersive8.com/assessment/[ASSESS-NUMBER]` that anyone can access using the Assessment Number from the C2PA manifest or directly from the report. It is the human-readable complement to the machine-readable manifest — and the **durable** record that survives re-encoding.

**Zone B is the source of truth.** If the manifest is stripped, Zone B remains. If a question arises about an assessment's current validity, Zone B answers it.

### Zone B — Confirmed Fields (v1)

- Assessment Number (monospace)
- **Institutional Status** — `ACTIVE` / `SUPERSEDED` / `WITHDRAWN` (prominent banner if not ACTIVE)
- Outcome (human-readable label, not raw enum)
- Assessment Date
- Methodology Version
- Reviewer Organization
- Assessment Scope — the 7 domain names reviewed
- Numbers Verification Link (when available)

### Zone B — Institutional Status

This is the single most important Zone B field after the outcome. It gives SI8 the ability to act after delivery.

| Status | Display |
|--------|---------|
| ACTIVE | Normal display |
| SUPERSEDED | Prominent banner; link to replacement assessment when known |
| WITHDRAWN | Prominent banner; historical metadata remains visible |

The embedded C2PA manifest cannot be recalled — it is already distributed and immutable. The Verification Page can be updated at any time. This is why institutional status on Zone B is the only revocation lever SI8 has.

**Revocation protocol:** SI8 may update institutional status to SUPERSEDED or WITHDRAWN when: a material error in the assessment is discovered; submitted evidence is later found to be fraudulent; a replacement assessment is issued; or SI8 determines the original assessment should no longer be relied upon. `status_reason` documents the cause; when a replacement assessment exists, its number is recorded in `status_reason`.

### Zone B — Confirmed Exclusions

**Executive Summary** — excluded. The executive summary is written for a specific reader about a specific client's specific content. It contains SI8's nuanced interpretation of why the evidence did or didn't support the outcome. Publishing it on a public page: (a) publicly discloses SI8's reasoning about a client's commercial content without explicit consent; (b) creates a second version of the opinion that can be extracted from context and misused; (c) can be used against SI8 in a dispute.

**Scope detail / gap indicators** — excluded. Zone B shows the 7 domain names reviewed. It does not show coverage quality (✓/○ indicators), specific gaps, or whether any domain had insufficient evidence. That level of detail publicly flags specific weaknesses in the client's documentation without the client's consent. Gap detail belongs in Zone C.

**PDF download** — not available by default. The PDF contains residual-risk and gap language written for a legal reader. Out of context, it reads as an admission. Default is private; clients may authorize specific third-party access separately.

**Confidence** — excluded from Zone B. Confidence is PDF-only.

### Zone B — Error States

| Condition | Display |
|-----------|---------|
| Unknown assessment number | Assessment not found — clean message, no internal details |
| Numbers verification link unavailable | "Provenance verification is temporarily unavailable." Assessment information still shows. |

### Zone B — Design

Typography-first. Institutional. Certificate-like. No marketing language, hero sections, animations, or gradients. Closest visual reference: UL registry listing, ISO certificate page.

---

## Zone C — Client Deliverable (PDF)

### What Zone C Is

Zone C is the content SI8 delivers directly to the client. It includes everything a legal team, E&O insurer, or brand reviewer needs to evaluate the assessment. Zone C content is not public but may be shared with authorized third parties by the client.

### Zone C Content

The SI8 Assessment Report (v0.2 template) contains:

- Commercial Assurance Summary Dashboard (outcome, confidence level, domain status grid)
- Full domain-by-domain assessment findings (7 domains: A/R/H/I/L/T/D)
- Specific conditions attached to a conditional outcome
- Residual risks and recommended next steps
- SI8 Standard Assurance Language (verbatim)
- Supporting Evidence Record (Appendix A)
- Chain of Title documentation

**Confidence level lives here.** This is the only Zone where confidence appears. The report provides the full context — scope limitations, evidence quality, specific gaps — that makes the confidence rating meaningful to a sophisticated reader.

---

## Zone D — Private Archive

### What Zone D Is

Zone D is SI8's internal evidence archive. Retained by SI8 only. Never embedded, linked, referenced, or publicly hashed.

### Zone D Contents

- Client-provided evidence files
- Generation history exports
- Prompt logs (if provided)
- Completed Reviewer Workbook (including internal assessment notes)
- Evidence Gap Log
- Post-Assessment Review
- Internal communications

### Retention

Minimum three years following delivery. Extended if SI8 becomes aware of a dispute involving the assessed content.

---

## Industry Analogs

The architecture mirrors how established assurance systems handle the public/private boundary:

| System | Embedded in asset | External reference | Confidential |
|--------|------------------|-------------------|--------------|
| **UL mark** | UL mark + file number | UL public registry (file number → certificate status, scope, standard) | Full test reports, failure data |
| **ISO 27001** | Certificate (scope, validity, cert number) | Certification body's public registry | Audit findings, nonconformities |
| **SOC 2 Type II** | Nothing | Restricted-use report under NDA | Workpapers, testing detail, exceptions |
| **Financial audit** | Brief signed opinion letter (1–2 pages) | — | Workpapers, bank confirms, testing |
| **SI8** | Assessment Number + Outcome + Verification URL | Zone B Verification Page (outcome, status, scope) | Zone D (workbook, evidence, gap log) |

**The UL analogy is the most precise for Zone A:** the embedded C2PA manifest is the UL mark — it proves the assessment happened and gives you the file number. The PDF is the test data — it explains the outcome. The Verification Page is the public UL registry — it confirms the certificate is current and tells you if it has been withdrawn.

**The audit opinion analogy is the most precise for Zone C:** signed opinion is public-facing (deliverable to client and their authorized parties), workpapers stay private, the report explains the opinion, evidence stays with the assessor.

---

## Mapping to Numbers Protocol

Numbers Protocol Capture receives the video file plus Zone A fields as a custom assertion package. It returns:

- C2PA-signed MP4 (with all Zone A custom assertions embedded + standard `digitalSourceType`)
- `numbers_asset_id` for provider-side reference
- A `verify.numbersprotocol.io/[hash]` URL

**Storage:** SI8 downloads the signed MP4 from Numbers and stores it in private SI8-controlled Supabase Storage. The signed asset is not served permanently from Numbers' infrastructure.

**Both verification URLs belong in the delivery package:**

| URL | Audience | Purpose |
|-----|----------|---------|
| `verify.numbersprotocol.io/[hash]` | Technical audience, platform integrations | Cryptographic provenance, on-chain timestamp |
| `app.superimmersive8.com/assessment/[ASSESS-NUMBER]` | Legal teams, brand reviewers, E&O insurers | Commercial assurance outcome and validity status |

### Trust List Status (as of July 2026)

Numbers Protocol's uploaded MP4 signing path is not yet confirmed as a Trust List-recognized signer claim in Adobe's Content Authenticity viewer. Sofia Yan (Numbers Protocol co-founder) confirmed July 6, 2026: output is C2PA metadata + ERC-7053 provenance record, "not yet as an Adobe Trust List-recognized signer claim."

Do not make Trust List or Adobe Content Authenticity viewer claims in product copy until this is verified with a real signed sample.

Architecture delivers value regardless of Trust List status:
- Cryptographic binding of manifest to video — always present
- Report hash integrity verification — always present (once embedded)
- Verification URL as human-readable access path — always present
- On-chain timestamp proof — always present
- SI8 Zone B outcome page — always present

---

## Open Questions

| # | Question | Who answers it | Priority |
|---|----------|---------------|----------|
| OQ1 | Does embedding an outcome identifier in a public manifest create liability the standard assurance language doesn't cover? | Legal input | High — before finalizing Zone A |
| OQ2 | Does Capture's API accept custom assertion namespaces with arbitrary JSON? What are field size limits? | Numbers technical call | High — before implementation |
| OQ3 | Does ERC-7053 via Numbers support metadata/calldata for embedding Assessment Number? | Numbers technical call | Medium |
| OQ4 | What is the correct C2PA assertion namespace format for a third-party commercial layer? | C2PA spec review | Medium |
| OQ5 | What is SI8's evidence retention policy? (Minimum period, triggers for extended retention, destruction process?) | JD decision | Medium |
| OQ6 | Trust List recognition for uploaded MP4 path — confirmed with a real signed sample? | Numbers / test | High — before any Trust List product claims |

---

## Version History

| Version | Date | Change |
|---------|------|--------|
| 0.1 | 2026-07-06 | Initial draft — four disclosure zones, Zone A field specification, Numbers Protocol mapping |
| 0.2 | 2026-07-12 | Major revision: Zone A is fragile pointer / Zone B is durable record (architectural reframe); confidence excluded from Zone A and Zone B (PDF-only); report hash deferred to v2; executive summary and scope detail removed from Zone B; institutional status / revocation protocol added; `digitalSourceType` regulatory boundary clarified; industry analog table added; Trust List status updated per Sofia Yan July 6 reply |

---

*SI8 Provenance Manifest Specification · PMF Strategy Inc. d/b/a SuperImmersive 8 · superimmersive8.com*
