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

**Amended 2026-11-10** by founder decision CR-V2-MVP-INTEGRATION-2: see **§9, MVP integrated assessment**. §9 records how the integration requirement is met for the MVP, why automated receipt matching is deferred, and what post-MVP verification would need. Where §3 or §8 differ for the MVP, §9 governs; their original text is kept as history.

**Amended 2026-11-11** by founder decision CR-V2-MVP-PROVIDER-SCOPE-1: see **§10, MVP provider scope**. The MVP supports Higgsfield and Runway only; Pika is removed from new customer choices and from the active publication set, and Pika work is deferred until after the MVP.

**Released and closed 2026-11-15** by founder decision (GO): the MVP development and release milestone is closed with Build B (`0bec2dee`) live in Production. See **§12, MVP release closure**. §5 and §6 below describe the state at their own dates and are kept as history.

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
  - *2026-11-10, MVP (§9):* for the MVP, observations do **not** enter retrieval, applicability or Bounded Interpretation. They are related to governed requirements after composition, by the bounded integrated assessment (§9.3). Feeding them into applicability remains the post-MVP direction (§9.5), and needs fresh authorization.
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
  - *2026-11-10:* including the optional `integrated_assessment` wording block (§9.3), whose approval activates the integrated assessment.
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

1. **Admissibility and corroboration rules for document observations** (an engineering design decision, §3). *2026-11-10: deferred past the MVP by §9; observations are not admitted to applicability in the MVP.* This covers which observations may enter applicability, at what provenance and uncertainty, how they relate to the matching declaration, and how a conflict is shown, without ever becoming automatically authoritative.
2. **Live AI extraction:** what are the authorization criteria, including the real-document validation gate and a per-record cost ceiling?
3. **Upload policy:**
   - supported types and size, page and count limits (the PRD v0.3 proposal and the prototype differ);
   - consent wording for AI processing;
   - provider data terms;
   - document retention.
4. **Uploaded provider terms:** how are they handled, given that governed Living Knowledge is the authority for provider terms? Proposed: an observation only.
5. **Tool limit:** 3, as implemented, or up to 6, as PRD v0.3 proposed.

A positioning question that does not block implementation: **how the free CRC and the $29 Creator Record V2 relate in the funnel.**

---

## 9. MVP integrated assessment [DECISION, founder, 2026-11-10, CR-V2-MVP-INTEGRATION-2]

**Decided by:** the founder (JD). This section governs the MVP wherever §3 or §8 differ; their text is kept above as history.

> **SUPERSEDED for the released MVP (2026-11-14). Kept as history.**
> - **What replaced it:** by founder direction (CR-PDF-DECISION-1, 2026-11-13; approvals F1–F4 in `08_Platform/implementation/CR-V2-MVP-RELEASE-AUTHORIZATION-1-APPROVAL-RECORD.md`), automated document readings are presented **separately** from commercial-readiness considerations and are never compared with declarations. This reverses §9.1's statement that a separate documents section is not sufficient.
> - **In code:** the active template sets (v4 for schema 7, v5 for schema 8) carry no `integrated_assessment` block, and their layout refuses one.
> - **Where it remains:** the per-item integrated assessment (§9.1, §9.3) survives only in superseded set v3, the schema 8 set used before the cutover.
> - **What still applies:** §9.2's rationale, §9.4's exclusions and D10's display-only fallback (comparison method v2, withheld) still apply.
> - **Current state:** §12 and `08_Platform/app/lib/creator-record/README.md` ("Current state").

### 9.1 Founder-approved MVP definition

> "An integrated assessment of declarations and supporting documents against governed requirements."

For the MVP this is met by combining four things, for each guidance item, inside that item:

1. **Creator-confirmed declarations**, as recorded and attributed to the creator. They are never changed.
2. **AI-generated document observations**, always `not_verified`, with their provenance (run, observation ids, excerpt).
3. **Governed Living Knowledge requirements**: each applicability requirement of the claim, and each governed open dependency, exactly as composition recorded them.
4. **An integrated explanation**, for each requirement and each linked document. It says whether the document contains a relevant observation, leaves the requirement uncertain, cannot establish it, was disputed by the creator, or was not examined. It also says what that means for the requirement.

**Simply displaying document observations alongside governed guidance does not satisfy this requirement.** A documents section placed next to a guidance section, with no per-requirement explanation, is not an integrated assessment. The pre-existing CR-V2-MVP-M3A layout (separate `documents` section, comparisons withheld) and `customer-flow/guidance-with-documents.ts` (id-level links only) are therefore not sufficient on their own.

### 9.2 MVP approach and rationale

SI8 deliberately chooses **bounded, evidence-aware integration** rather than definitive automated receipt-to-declaration matching. This is an intentional product decision, not an accidental missing feature. The reasons:

- **The product has to be useful and educational now.** Creators need to see how their documents relate to the requirements that matter, and where the gaps are.
- **Reliable provider-plan verification is complex.** It needs normalization semantics, issuer identity, provider plan vocabularies and text-layer cross-checks, and each part failed or was incomplete when tested (§9.6).
- **Historical coverage is unsolved.** Providers rename and retire plans. A current pricing page cannot prove what a receipt from an earlier period could have said (the Runway case, §9.6).
- **Observations are not verified facts.** An AI reading of a document is what the document appears to show; it is not a fact about the creator's subscription.
- **D10's safety boundary must hold.** Until the reliability gates pass, no positive or negative comparison claim is made.
- **The cost is out of proportion at MVP stage.** Comprehensive receipt verification would mean maintaining sourced, time-scoped plan catalogues for every provider, plus a real-document validation programme.

### 9.3 MVP architecture

Permitted flow:

```
creator declarations --> Retrieval -> applicability -> Bounded Interpretation -> Composition --> guidance items
                                                                                                   |
document observations (not_verified) -------------------------------------------------------------+
                                                                                                   v
                                          bounded evidence-aware integrated assessment (pure, derived)
                                                                                                   v
                                                                     customer-facing Creator Record (PDF)
```

**Authority is preserved:**
- Living Knowledge, Retrieval and Bounded Interpretation keep sole authority over conclusions.
- The integrated layer runs **after** composition. It copies each guidance item's conclusion, applicability status and dependency status unchanged, and cannot alter them.

**What the integrated layer may and may not do:**
- **It may** explain evidence relevance and uncertainty.
- **It may not** create a stronger commercial-use conclusion, certify that evidence is sufficient, mark a dependency satisfied, change a declaration, or state that a document matches or contradicts a declaration (D10).

**How a document is linked to a requirement:** only through the record's own links:
- the tool declarations that selected the claim (`selection_basis`);
- the creator's own `tool_index` on the document;
- for a declared-plan requirement, its declared instance.

Nothing is matched by provider or plan name.

**No provider-specific orchestration.** A single generic table maps a requirement *fact type* to the observation fields that could bear on it. In the MVP that is only `tool_plan_tier` → printed plan name and plan candidates. Any other fact type is "not something a document examination reads". Governed dependencies have no governed evidence requirement (`contract/dependency-rows.ts`: `evidence_requirement: 'not_defined_by_governance'`), so documents are never assessed against them, and the assessment says so.

**Creator corrections:** a creator response to a document ("reading incorrect", "wrong document", "not relevant", "another plan applies") takes precedence. That document's reading is then not relied on for the requirement.

**Fail closed:** a reading that cannot be recovered exactly from its stored examination, or a document whose link to a requirement's tool cannot be established, is reported as "cannot establish", never as relevant.

**Implementation and activation:**
- **Code:** `lib/creator-record/integrated-assessment/assess.ts` (method `si8/creator-record-v2-integrated-assessment` v1). It is derived from a stored schema 8 record at render time: no new persistence, no schema change, no migration.
- **Rendering:** it prints inside each guidance item only when the approved PDF template set carries the optional `integrated_assessment` wording block.
- **Activation:** approving a template set that contains the block. Until then Production renders exactly as before, and issued records are never re-rendered.

### 9.4 MVP exclusions

- Definitive automated receipt-to-declaration matching.
- Automatic certification of subscription or commercial-use eligibility.
- Historical provider-plan catalogue maintenance.
- Automated verification of document authenticity.
- Automated resolution of conflicting evidence. Conflicting or multiple plan names are reported as leaving the requirement uncertain, never resolved.
- The human-reviewed Commercial Assurance Assessment.

**D10's display-only fallback is preserved unchanged:**
- the persisted comparison method v2 records only `not_assessed` / `determination_withheld`;
- the PDF never prints a comparison result;
- the integrated assessment always states that SI8 did not compare a reading with the creator's answer.

### 9.5 Post-MVP automated verification roadmap [NOT APPROVED for implementation]

Nothing in this subsection is approved for implementation. Each item needs **fresh product-owner authorization**.

| Capability | State (2026-11-10) |
|---|---|
| Approved normalization and comparison semantics (G-R1: brackets kept; no customer-typed or issuer text removed; empty → unresolved) | **Implemented but inactive:** `904e46da`, receipt-comparison-v3, local branch only (§9.6) |
| Provider and plan identity resolution (legal-entity issuers, e.g. "Runway AI, Inc.") | **Implemented but inactive:** `904e46da`, reuses the comparison's existing resolver |
| Sourced, maintained, time-scoped factual plan vocabularies | **Partly implemented, inactive:** `ecae1e45`, Pika (complete) and Higgsfield (partial: team plans) approved 2026-11-10. **Time-scoping not implemented**, because the existing contracts carry no date for vocabulary coverage |
| Historical subscription-plan coverage | **Not established.** Runway's historical plan names are unsourced (D-1). Work stopped |
| Document-reading reliability and PDF text-layer cross-checks (G-R2) | **Implemented but inactive** (`evidence/plan-cross-check.ts`, unwired since CR-V2-MVP-6; scope wiring in `904e46da`) |
| G-R3 offline replay | **Failed** with approved vocabulary: 12/15 planted conflicts unresolved; clean-PDF true "consistent" 0/3; G-R2 ran on 0/9 PDFs. A simulated-approval preview passed, but it is not a result |
| G-R4 real-document check | **Not started**; needs separate PM authorization (real documents and paid calls) |
| Provenance, evidence retention, verification records | **Partly implemented:** examination runs, projections, retention. No verification-record type exists |
| Reliable handling of conflicting or ambiguous evidence | **Proposed future capability** |
| Persistence, issuance verification and schema approvals for any comparison outcome | **Proposed;** GATE-1 stopped because persisting a G-R2 outcome needs a migration |
| Customer-facing comparison wording and Bounded Interpretation controls | **Proposed;** the C2 label vocabulary is still open |
| Monitoring, maintenance (vocabulary review dates, provider renames) and regression testing | **Proposed;** vocabulary entries carry review dates and fail closed when overdue |
| Observations as inputs to retrieval/applicability (§3 original direction, §8.1 admissibility) | **Proposed; deferred** by this decision |

### 9.6 Engineering history and evidence (preserved for future agents)

**D10 (PRD v0.3 §0.1, a PM decision; branch `work/cr-option-c-oc0`):**
- display-only fallback;
- positive plan consistency only after G-R1–G-R3 pass, plus G-R4 for real documents.

**Option C / C1:** no real-document positive or negative comparisons without the gate (`PRD_CREATOR_RECORD_v2_RECONCILIATION_PROPOSED.md`).

**CR-V2-RECEIPT-GATE-1:** stopped, because persisting a G-R2 outcome needs a migration.

**CR-V2-RECEIPT-GATE-1A, G-R3 offline replay (2026-11-10). NO-GO.**
- **Inputs:** preserved SPIKE-1E extractions (30 entries; SPIKE-1C unusable, schema v1) over the regenerated fixtures.
- **Failure modes:** G-R1 unimplemented (bracket and provider-token merges); G-R2's provider scope failed on legal-entity issuers; the governed vocabulary was empty for Runway.
- **Result:** 3/15 planted conflicts were not unresolved, and clean-PDF true "consistent" fell from 3 to 0.

**CR-V2-RECEIPT-GATE-1B (2026-11-10): two local commits in worktree `si8-cr-v2-github-synthetic-3`, branch `work/cr-v2-receipt-gate-1b` (parent `e0f0b037`). Not pushed, not merged, and inactive:**
- `904e46da`: G-R1 fixes (receipt-comparison-v3), G-R2 issuer scope, and a fail-closed product-side vocabulary module (approved entries only; review dates; partial coverage never supports absence).
- `ecae1e45`: the approved Pika and Higgsfield entries, with captures preserved byte-for-byte in `06_Operations/creator-record/receipt-plan-vocabulary/` (MANIFEST; hashes re-verified by test).
- Founder architecture decision: the plan vocabulary must be product-side factual data from dated official captures, never governed commercial-use propositions.

**Runway:**
- Current-plan names (Free, Standard, Pro, Max, Team, Enterprise) are sourced from a 2026-11-10 capture, but kept as **candidates only**.
- D-1: a current pricing-page capture does not prove historical completeness.
- The existing contracts cannot date-scope coverage.
- The replay's Runway receipts are dated April 2026, before any capture, so even a date-scoped rule could not make G-R3 pass honestly.

**Stop (founder, 2026-11-10):** receipt-verification engineering stopped for the MVP. CR-V2-RECEIPT-GATE-1C, historical Runway research, date-aware vocabulary completeness and receipt-matching persistence do **not** resume without a new founder decision.

## 10. MVP provider scope [DECISION, founder, 2026-11-11, CR-V2-MVP-PROVIDER-SCOPE-1]

**Decided by:** the founder (JD). Approval reference in code: `JD-CR-V2-MVP-PROVIDER-SCOPE-1-20261111`.

### 10.1 Decision

- The Creator Record V2 MVP supports two AI-video providers: **Higgsfield** and **Runway**.
- **Pika** is removed from new Creator Record customer tool choices and from the active Creator Record publication set.
- Kling and other providers remain outside MVP scope. They stay selectable, as before, and receive no guidance ("SI8 has no published guidance for the tools and services you named").
- **Deferred until after the MVP:** Pika research (including governance issue G-PIKA-TIME, current plan versus plan at generation), Pika claim updates (including the legacy plan names Standard and Pro), and broader Living Knowledge expansion.

### 10.2 Why

- G-PIKA-TIME is unresolved. The governed Pika plan claims are conditioned on the user's *current* plan, the record asks for the plan *while the video was made*, and the official Pika text available on 2026-11-11 does not settle which one governs commercial-use permission (CR-V2-LK-PIKA-TIME-1).
- Pika's 2026-11-10 pricing page names Standard and Pro as legacy plans; current paid plans are Starter, Creator and Fancy. The published Pika baseline wording names Standard, Pro and Fancy, so it would need re-verification before it could stay in issuance.

### 10.3 How it is implemented (`lib/creator-record/governed/sources.ts`)

- **T1 version 2:** the same question and wording, without the `pika` option and its observation-map entry (`CREATOR_RECORD_EXCLUDED_TOOL_IDS`). The tool identity registry is unchanged: Pika stays a registered tool for CRC and Living Knowledge.
- **CR-V2-LAUNCH-REGISTRY-2 / CR-V2-LAUNCH-LEDGER-3:** the Pika baseline ledger entry (version 1) is superseded by a version 2 entry with `creator_record_eligible: 'No'`, recorded as `withdrawn`. Version 1 is otherwise unchanged. Runway and Higgsfield entries are unchanged.
- **New approval versions** for the changed content: Source Text Approvals 5 (schema 7) and 6 (schema 8), questionnaire contract version 2. The earlier versions (3, 4 and 1) are preserved in history; the R2 packet digest is still reproduced by restoring the one removed option.
- **Not changed:** Pika Living Knowledge (claims, evidence, FGR/CPR history), CRC provider coverage, Bounded Interpretation, receipt examination and D10, the integrated-assessment architecture, PDF templates, customer wording identity and consent bindings.

### 10.4 Existing records

- Issued records keep their own embedded questionnaire contract, ledger version and guidance. They verify and render exactly as issued, including Pika guidance; nothing is re-evaluated against the current ledger.
- Per the no-grandfathering issuance policy (CR-V2-1C, CR-V2-MVP-ELIGIBILITY-1), a record **prepared but not yet issued** under the earlier approvals is refused at checkout and at issuance after this change, whatever tool it names. It must be prepared again. Before integration, confirm that Production holds no paid-but-unissued Creator Record.
- A browser holding the earlier questionnaire contract is refused when it submits and must reload.

### 10.5 What this does not change

This decision does **not** complete the MVP integrated-assessment requirement (§9). The published Runway and Higgsfield claims carry no applicability requirement and no governed dependency, so the integrated assessment has nothing to relate documents to for them and prints nothing (CR-V2-MVP-INTEGRATION-5B). Meeting §9.1 in Production still needs a published claim with a structured, document-assessable requirement.

## 11. MVP provider selection restriction [DECISION, founder, 2026-11-11, CR-V2-MVP-PROVIDER-SCOPE-2 / CRV2-PA-1A]

**Decided by:** the founder (JD). Approval reference in code: `JD-CR-V2-MVP-PROVIDER-SCOPE-2-20261111`. This refines §10.1: Kling and the other registered providers are **no longer selectable** in a new Creator Record.

### 11.1 Decision

- A new Creator Record may select only **Higgsfield** and **Runway**. No other registered tool may be chosen.
- "My tool isn't listed" is removed, so no tool can be named in free text (T1X is never shown).
- "Not sure" stays: the question registry requires it on every closed question. It records no tool identity and no guidance.
- T1 help text, founder-approved: "Choose it from the list. You can add up to 3 tools." (the sentence about "My tool isn't listed" is removed).
- Existing unissued records follow the no-grandfathering policy (§10.4). Nothing is rewritten.

### 11.2 How it is implemented (`lib/creator-record/governed/sources.ts`)

- **T1 version 3** offers `higgsfield`, `runway-gen3` and `not_sure` (`CREATOR_RECORD_MVP_TOOL_IDS`); only Higgsfield and Runway have identity observation entries. **CR-V2-LAUNCH-REGISTRY-3.** The ledger is unchanged (LEDGER-3).
- **New approval versions:** Source Text Approvals 7 (schema 7) and 8 (schema 8), questionnaire contract version 3, re-pinned digests. Versions 5, 6 and 2 are preserved in history.
- **Server-side enforcement** is the existing questionnaire validation: a T1 value outside the approved options is refused at prepare, checkout and issuance, and an answer to a question that is not shown (T1X) is discarded, never mapped, stored in the record, shown in guidance or printed.
- **Not changed:** the shared tool identity registry and its option list, CRC, Living Knowledge, the publication ledger, payment, pricing, issuance, legal policies, PDF templates, consent bindings and the synthetic admin UAT bundle.

### 11.3 Existing records

- Issued records verify and render exactly as issued (T1 v1 with Pika; T1 v2 with Kling or an unlisted tool), proven against reconstructions of both earlier approval states.
- Records prepared but not issued under T1 v2 are refused at checkout and issuance, whatever tool they name, and must be prepared again. Before integration, confirm that Production holds no paid-but-unissued Creator Record V2.

## 12. MVP release closure [DECISION, founder, 2026-11-15, CR-V2-MVP-RELEASE-EXECUTION-1]

**Decision:** GO. The Creator Record V2 MVP development and release milestone is closed. Approvals, release exceptions and operator evidence: `08_Platform/implementation/CR-V2-MVP-RELEASE-AUTHORIZATION-1-APPROVAL-RECORD.md` (§5, §6).

### 12.1 What is live in Production [FACT]

- **Build B, `0bec2dee`** (deployed 2026-11-14, Vercel `si8-creator-portal`):
  - PDF template set v4 for schema 7 (`d4ecf3f3…`) and v5 for schema 8 (`a27e23cd…`); v1 and v3 stay registered as superseded;
  - generator `creator-record-v2-pdf-v3`;
  - submissions open, issuance enabled;
  - Terms `terms-2026-11-14` (§4/§5 revised);
  - AI-permission authority `cr-v2-ai-permission-1__privacy-2026-11-09__terms-2026-11-14`.
- **Superseded design:** the §9 integrated assessment is no longer printed; readings appear separately (see the note under §9). Engineering current state: `08_Platform/app/lib/creator-record/README.md`.
- **Build A, `60b1d84d`** (guard + Terms + submissions pause) is the rollback floor. Never roll back to a pre-guard build (`334d8d9f`, `678add4d` or earlier).
- **Release validation:** `tsc` clean; customer-wording check passes; full Jest suite 24 suites / 89 tests failing, identical to the documented baseline, with no new failures (9,761 passed).

### 12.2 Production UAT [FACT, 2026-11-14]

**Record:** CR-2026-7E82CA09 (prepared record `PREP-10742325-219b-4fec-a9ef-1510f2b597a8`).

- **Issuance:** exactly one artifact, `issued` at 16:00:15 UTC, generator `creator-record-v2-pdf-v3`, schema 8.
- **Comparison:** method v2, every result `not_assessed / determination_withheld`.
- **Guidance:** one item (`CLAIM-RUNWAY-COMMERCIAL-USE-001-v1`), selected from the declarations; readings are not a guidance input.
- **Artifact:** sha256 `e38921286e477d574d8fa2d273a25225acd438758811854088fbf756e7ae16b9`, 28,342 bytes; the stored private object is present and its size matches.
- **Payment:** one payment row; fulfilment, PDF and email completed.
- **Review:** PM/Architecture reviewed the six-page PDF and accepted its content, presentation and customer-facing governance behaviour.
- **Production state afterwards:**
  - Q3/Q4/Q5 = 0;
  - artifact immutability triggers enabled;
  - the earlier issued records (CR-2026-719228D9 `-pdf-v1`, CR-2026-8D1022F5 `-pdf-v2`) unchanged;
  - authority row aligned with the revised Terms.

### 12.3 Qualifications [FACT; accepted by the founder]

1. **Fresh AI examination under the revised Terms was not exercised.**
   - The UAT record reused a stored live reading (attempt `4be776e0-…`, executed 2026-11-11 09:37:38 UTC, envelope `79118a472c3a…`). Production recorded no live attempt or reservation on or after 2026-11-14.
   - Demonstrated instead:
     - the reuse of a historical reading;
     - the creator renewing AI permission under `…terms-2026-11-14` (2026-11-14 15:54:55 UTC) before preparing.
   - The founder accepts this residual verification gap and requires no further UAT.
2. **Checkout and fulfilment were shown through a complimentary purchase, not by collecting a nonzero payment.**
   - The six payment rows Production holds (V1 and V2, 2026-10-21 to 2026-11-14) are all list price US$29.00 with a US$29.00 discount: US$0.00 collected.
   - Stripe reports such $0 sessions as `payment_status = paid`. "Paid" in the verification reports means that Stripe status, never money received.
   - **Reconciled figures:** six rows in total, five before the UAT. Three are V2 (CR-2026-719228D9, CR-2026-8D1022F5, CR-2026-7E82CA09, each accepted and completed). Three are V1: two accepted and completed, one rejected.
3. **The internal UAT purchase is recorded with `uat = false`.**
   - Reporting must exclude CR-2026-7E82CA09 (submission `7e82ca09-d081-4d34-acbc-73370def0ca5`) from customer counts.
   - The issued record is immutable and is not modified.
4. **Accepted release exceptions:** Q8/Q10 are three unpaid synthetic admin records, preserved. They are refused at checkout and issuance.
5. **Release risks retained** (founder, 2026-11-14):
   - documents stored under the earlier storage consent stay usable;
   - creators who accepted the earlier Terms can buy without re-accepting;
   - outside counsel review was waived for this MVP.
6. **Deferred wording maintenance retained:**
   - the `responses_intro` ("…or a comparison") Source Text change;
   - the v1/v3 `guidance.empty` ambiguity;
   - an automated check that no explanatory string names a tool or provider;
   - the v2/v3 PDF wording inconsistencies (§7 "section 5" readings, §8 "comparing"), which affect issued historical templates only.
