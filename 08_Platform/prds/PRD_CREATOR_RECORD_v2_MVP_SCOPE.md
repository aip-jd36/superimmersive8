# Creator Record V2 — Approved MVP Product Scope (CR-V2-MVP-SCOPE-1)

**Classification:** DECISION — approved product scope · **Approved by:** PM (SI8 product management), PM brief CR-V2-MVP-SCOPE-1 · **Date:** 2026-11-01
**Status:** ACTIVE — the controlling product direction for Creator Record V2.

**What this approves:** the product definition, the required MVP capabilities, the architecture boundaries and the exclusions below.
**What this does NOT approve:**
- customer-facing wording;
- governed claims, or Creator Record publication (ledger) entries;
- question or observation-map entries;
- PDF templates, legal terms, price activation or Production activation.

Each of those still needs its own governance approval (see "Outstanding approvals").

**Supersedes:**
- every assumption that Creator Record V2's MVP is a declarations-only record;
- implementation-phase scope reductions, which are now gaps, not scope (see "Implemented vs. approved scope");
- for Creator Record V2, the earlier "free intake funnel" positioning (see "Superseded assumptions").

---

## 1. Product definition [DECISION]

SI8 Creator Record V2 is a **$29 AI-assisted Commercial Readiness Record** for AI-video creators.

- **It collects** structured creator declarations and accepts optional supporting documents.
- **It examines** those documents with AI-assisted parsing.
- **It evaluates** the relevant project information against applicable governed Living Knowledge.
- **The customer receives** a private, downloadable PDF. It records declarations, document observations, applicable educational guidance, unresolved dependencies, evidence limitations and provenance.

It is **not**:
- legal advice;
- commercial clearance certification;
- evidence authentication;
- the human-reviewed SI8 Commercial Assurance Assessment.

## 2. Required MVP capabilities [DECISION]

1. **Structured questionnaire.** It covers project identity, intended use, distribution, creative contributions, AI tools, plans and relevant third-party inputs.
2. **Optional supporting document uploads**, including relevant licences, receipts, provider terms and project documentation.
3. **Secure private document handling**: access control, supported-file validation, size limits, processing status and file fingerprints.
4. **AI-assisted document extraction and examination.** It preserves source references, uncertainty and processing limitations.
5. **Evaluation** of relevant declarations and document-derived observations against applicable governed Living Knowledge.
6. **Bounded Interpretation** that keeps these distinct:
   - creator declarations;
   - deterministic document metadata;
   - AI-extracted observations;
   - governed knowledge;
   - human-verified findings.
7. **Clear identification** of unresolved requirements, contradictory information, missing evidence and relevant limitations.
8. **Customer review and correction** of declarations before finalization.
9. **$29 payment and private PDF delivery** through the existing V2 infrastructure.
10. **A customer PDF** containing project information, declarations, an inventory of uploaded documents, extracted observations, applicable guidance, unresolved items, provenance and explicit limitations.
11. **Governed publication controls** for questions, explanations, claim guidance, customer wording and PDF templates.

## 3. Architecture boundaries [DECISION]

- **Keep these layers separate:** Living Knowledge, Retrieval, Bounded Interpretation, and Projection/Composition.
- **AI document parsing is never a parallel authority** for commercial-use requirements.
- **Document-derived observations never automatically establish** rights ownership, legal sufficiency, authorization or commercial clearance.
- **Document-derived observations are an intended input to governed retrieval and applicability evaluation,** subject to provenance-aware Bounded Interpretation. They are neither display-only nor automatically authoritative. The admissibility and corroboration rules (when an observation may count, and against what) are an engineering design decision.
- **Human-verified findings are not produced by the automated Creator Record MVP.** Any human-verified category is reserved for evidence that a human has genuinely reviewed, and is never populated through automated extraction.
- **All guidance stays subject to:**
  - provider scope, applicability and lifecycle;
  - CRC/Creator Record publication eligibility;
  - evidence limitations and supersession;
  - fail-closed behaviour.
- **No fabricated UserGoals,** and explicit and discovered relevance are never collapsed together.
- **Evidence-only stock facts never become self-attestation questions.** These are release status, editorial designation, separate authorization and rights-and-clearance status.

## 4. Exclusions [DECISION]

- Legal advice.
- Commercial clearance certification.
- Human verification of all uploaded evidence.
- Guarantees of document authenticity.
- Automatic resolution of missing permissions.
- The $499 human-reviewed Commercial Assurance Assessment.

---

## 5. Implemented vs. approved scope [FACT, at `5261514e`, deployed to Production with V2 submissions and issuance `stopped`]

| # | Capability | State |
|---|---|---|
| 1 | Questionnaire | **Implemented** from governed sources (`lib/creator-record/governed/sources.ts`), currently **empty**. The only question content is the unapproved pilot set (`lib/creator-record/pilot/pilot-registry.ts`). Up to 3 tools. |
| 2 | Optional uploads | **Missing from the customer flow.** The prepared record forces `documents: not_provided` (`lib/creator-record/customer-record/record.ts`). Uploads exist only in the internal admin prototype and the synthetic public UAT harness. |
| 3 | Private document handling | **Partly.** Issued PDFs are stored privately (`creator-records` bucket, access-checked delivery). There is no persistence or private storage for customer-uploaded documents; fingerprints are computed in the prototype only. |
| 4 | AI extraction and examination | **Built, locked.** `lib/creator-record/receipt-examination/` and `evidence/` support replay of synthetic fixtures. Live extraction is disabled in the build, and the real-document validation gate has not been run. |
| 5 | Evaluation against Living Knowledge | **Declarations: implemented** (retrieval → applicability → Bounded Interpretation → composition, through the existing pipeline). **Document observations: not yet an input.** The prototype's current reconciliation (CR-V2-MVP-6, Option C) compares them with declarations and shows the result, but does not feed them into retrieval or applicability. The target is §3: an input, subject to provenance-aware Bounded Interpretation, with the admissibility rules still to be designed. |
| 6 | Bounded Interpretation statement types | **Partly.** Declarations, document observations, governed propositions and bounded explanations are kept separate. Deterministic document metadata is not yet a separate category. Human-verified findings are correctly absent: the automated MVP never produces them (§3). |
| 7 | Unresolved, contradictory, missing | **Unresolved and missing: implemented** (open items, "not sure", limitations). **Contradictions** between declarations and documents exist only in the prototype reconciliation. |
| 8 | Review and correction | **Implemented**: versioned prepared records, correction creates a new version, confirmation freezes it. |
| 9 | $29 payment and private PDF delivery | **Implemented, stopped**: checkout, webhook, payment ledger, private artifact, ready email, dashboard download. V1 is retired from new sales (CR-V2-CUTOVER-1). |
| 10 | PDF contents | **Partly.** The 8-section template contract (`lib/creator-record/customer-pdf/templates.ts`) has no document-inventory or extracted-observations section. No customer template text exists. |
| 11 | Governed publication controls | **Implemented**: approval contracts for questions and mappings, Source Text Approval, the publication ledger and template approval, all fail-closed. **No approvals exist.** |

## 6. Outstanding approvals [OPEN; none granted by this decision]

- Question Registry and Observation Map entries.
- Customer wording (the Source Text Approval).
- Per-claim Creator Record publication entries, with their explanations.
- PDF templates.
- Flow copy (`lib/creator-record-flow/wording.ts`, DRAFT).
- Legal terms: acknowledgements, and consent for AI processing of uploads.
- Who the named approver is (PRD v0.3 OD-2a).
- Counsel-review scope (PRD v0.3 L-G6).
- Activation of the $29 price and of V2 in Production.

## 7. Superseded assumptions [preserved, not rewritten]

| Earlier assumption | Where | Status |
|---|---|---|
| Creator Record is a free intake funnel; $29 only as an abuse fallback | `claude.md` (Revenue Model); `01_Business/plans/PRODUCT-STRATEGY-2026-06-28.md` §2; memory and outreach records | **Superseded for Creator Record V2:** V2 is a $29 product. Historical outreach that offered free Creator Records is unchanged, as a record of what was offered. |
| The $29 Creator Record is a dormant legacy fallback, outside the narrative | `01_Business/pricing/PRICING-STRATEGY-v3.0.md`, Update 2026-08-05 | **Superseded for Creator Record V2.** That update described V1 (RecordForm). V1 remains retired from new sales. |
| CRC is the free front door "replacing the $29 Creator Record" | `08_Platform/prds/PRD_CRC_v1.0.md` (frozen) | **Not amended.** That statement concerns V1. CRC stays free. How CRC and Creator Record V2 relate in the funnel is an open positioning question (§8). |
| Creator Record V2 MVP = declarations only (no uploads, no AI examination) | Implementation-phase scope; CR-V2-M0-B1 analysis | **Superseded.** These are missing capabilities (§5), not scope. |
| PRD v0.3 as the product specification | `PRD_CREATOR_RECORD_v2_DRAFT.md` v0.3 (2026-10-25, "NOT FROZEN"). Committed only on branch `work/cr-option-c-oc0` (`fe601fb5`); untracked original in `si8-product-a-spike-1a/08_Platform/prds/` | **Historical design input.** Not frozen and not policy. Only its §0.1 items D1–D10 were PM decisions. Its proposals (Register contract, questionnaire, PDF structure, launch gates, open decisions) are inputs to the approvals in §6, not requirements. |

## 8. Open product questions that affect implementation [OPEN]

Decided 2026-11-01 (PM review of this record), and now in §3:
- document observations are an intended input to retrieval and applicability, under provenance-aware Bounded Interpretation;
- human-verified findings are reserved and never produced by the automated MVP.

Still open:

1. **Admissibility and corroboration rules for document observations** (an engineering design decision, §3). This covers which observations may enter applicability, at what provenance and uncertainty, how they relate to the matching declaration, and how a conflict is shown, without ever becoming automatically authoritative.
2. **Live AI extraction:** what are the authorization criteria, including the real-document validation gate and a per-record cost ceiling?
3. **Upload policy:**
   - supported types and size, page and count limits (the PRD v0.3 proposal and the prototype differ);
   - consent wording for AI processing;
   - provider data terms;
   - document retention.
4. **Uploaded provider terms:** how are they handled, given that governed Living Knowledge is the authority for provider terms? Proposed: an observation only.
5. **Tool limit:** 3, as implemented, or up to 6, as PRD v0.3 proposed.

A positioning question that does not block implementation: **how the free CRC and the $29 Creator Record V2 relate in the funnel.**
