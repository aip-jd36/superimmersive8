# Commercial Assurance — Canonical Fact-Demand Architecture

**Status:** DESIGN / DISCOVERY ONLY (CAH-4I.2). No runtime, schema, migration, API, UI, CertForm question, CRC question, Living Knowledge claim, applicability fact, workbook field, or Commercial Assurance control change is authorized by this document. It defines *how Commercial Assurance should represent and reason about its own fact demand*; it does not build anything.
**Date:** 2026-09-12
**Milestone:** CAH-4I.2 — Canonical Commercial Assurance Fact-Demand Contract.
**Predecessor:** `COMMERCIAL_ASSURANCE_SUBMISSION_FACT_COVERAGE_DISCOVERY.md` (CAH-4I.1) — a coverage audit. This document is the architecture derived from, and in three places correcting, that audit.
**Naming:** `_ARCHITECTURE.md` per the root `CLAUDE.md` "Document & File Naming Conventions" — an internal design document defining how a subsystem represents and processes state, where the *what* is already normatively specified elsewhere (`PRD_ASSESSMENT_SERVICE_v1.0.md`, `SI8-Reviewer-Manual-v0.2.md`, `SI8-Reviewer-Workbook-Schema-v0.1.md`, `PRD_CRC_v1.0.md`, `PRD_LIVING_NOTEBOOK.md`). `_DISCOVERY.md` would be wrong — this is not pure fact-finding.

---

## 0. Executive summary — including a challenge to the premise

The task asked whether a **shared canonical project-fact model** is the right abstraction for Commercial Assurance. Direct source inspection says: **partly, and not in the way the question implies.**

**The premise that is wrong:** a single canonical *fact record*, shared across CRC, CertForm, evidence, and the reviewer workbook, is the wrong abstraction. The same proposition asserted through different channels is not the same fact, and merging the instances destroys precisely the distinction the product sells. "Runway Gen-3 on a Pro plan" said in an unauthenticated CRC conversation, declared on an authenticated CertForm submission under four named warranties, and read by a reviewer off a dated receipt are three different things with three different evidentiary weights. `lib/reviewer-lk/submission-facts.ts`'s own header already states the invariant in miniature: *"These remain SUBMISSION FACTS. They never become Living Knowledge. The Living Knowledge results they narrow never become submission evidence."*

**The premise that is right:** what genuinely does not exist, anywhere, is a **single declaration of what Commercial Assurance needs**. Fact demand today is scattered across four unconnected vocabularies that no code or document joins:

| Vocabulary | Owner | Where |
|---|---|---|
| `TopicClaim.unresolved_project_dependencies` (free-form strings) | Living Knowledge governance | `GOVERNED-CLAIMS.md`, mirrored in `topic-claims-fixture.ts` |
| `APPLICABILITY_FACTS` (closed 3-value union) | Living Knowledge schema | `lib/retrieval-engine/types.ts:174` |
| Workbook control fields (16 controls × per-control sub-fields) | Commercial Assurance methodology | `workbook-schema.ts`, `SI8-Reviewer-Workbook-Schema-v0.1.md` |
| CertForm question set (11 sections) | Product (no governance record exists) | `app/certify/page.tsx` |

The correct abstraction is therefore: **share the demand; never share the fact.** One Fact-Demand Registry; per-channel fact records that each keep their own authority, provenance, and evidence status; and one shared set of canonical *value spaces* (tool identifiers, asset-provider identifiers, jurisdiction labels) so that facts from different channels can be compared without being merged.

**The most material finding of this milestone is not a fact-model finding at all.** It is an asymmetry in governance:

> CRC cannot ask a user about an evidence-only fact — `dependency-askability.ts` fails closed by construction, and a formal PM review (`DAR_001`) was required to decide four stock facts were non-askable. **CertForm has no askability governance whatsoever.** Its questions were authored product-side with no registry, no review, and no record of who decided a given fact may be self-attested. Nothing in the current architecture would stop "Were any of your stock images marked Editorial-only?" from being added to CertForm tomorrow — the exact question `DAR_001` formally refused for CRC.

**The second most material finding** is an evidence-surfacing gap, proven from source: of the six evidence-upload channels CertForm offers, only two (tool receipts, audio licence) are reachable from the reviewer workbook. The signed talent release, the IP licence, the fair-use supporting document, the per-asset third-party licence documents, and the entire optional production-evidence set are uploaded, persisted, shown back to the **creator**, read by the Assessment Report as *presence booleans* — and never rendered, linked, or signed-URL'd on any reviewer surface. Domain L03's own decision logic ("Real person appears; release documentation confirmed → **Verified**") cannot be executed from the workbook, because the release is not accessible there.

---

## 1. Scope and non-goals

**In scope:** the generic contract for what project facts Commercial Assurance demands, who may establish each, where each may legitimately originate, what evidence status an instance carries, which systems consume it, at what granularity, whether it may be asked at all, and what provenance and correction semantics it needs.

**Explicitly not done here:**
- No CertForm or CRC question added, removed, reworded, or reordered.
- No Living Knowledge claim, `applicability_requirements` entry, `unresolved_project_dependencies` string, `provider_scope`, `tool_scope`, or `geographic_relevance_scope` value authored or changed.
- No trademark (or any) LK domain onboarded.
- No schema, migration, API, route, component, or test changed.
- No `activeReferents` / HRR session-context / Consultative Composition work.
- No assessment control, domain, judgment, outcome, or workbook field added.

**Method constraint honoured throughout:** fact demand is derived from the Commercial Assurance *methodology and architecture* — the 16 controls, the Reviewer Manual's decision logic, the Report's own projection, the LK applicability/dependency mechanisms — **not** from the existing CertForm field list and **not** from current LK coverage. Where a fact is absent from CertForm, CRC, or LK, that is reported as an acquisition or knowledge gap only where an independent consumer demands it; where nothing demands it, absence is reported as **correctly absent**.

**Code is authoritative over documentation.** Every drift found is recorded in §2.3.

---

## 2. Sources inspected

### 2.1 Runtime source (authoritative)

| Area | Files read |
|---|---|
| Submission instrument | `app/app/certify/page.tsx` (full), `app/components/AddToolModal.tsx`, `app/supabase/migrations/20260401000000_add_certform_fields.sql` |
| Assessment controls / sign-off | `app/lib/assessments/signoff.ts` (full), `app/lib/assessments/reportProjection.ts`, `app/app/admin/submissions/[id]/review/workbook-schema.ts` (full) |
| Reviewer workbook UI / fact surfacing | `review/page.tsx` (full), `review/WorkbookClient.tsx`, `review/Section1Intake.tsx` (full) |
| Reviewer Living Knowledge | `lib/reviewer-lk/submission-facts.ts` (full), `select-reviewer-claims.ts` (full), `ADR-001-reviewer-resources-authority-boundary.md` (full) |
| Retrieval / applicability / scoping | `lib/retrieval-engine/lookup-topic-claims.ts` (full), `lib/retrieval-engine/types.ts` (full), `topic-claims-fixture.ts` (metadata sweep) |
| CRC structured fact model | `app/types/interview-engine.ts` (schema + the `AssessmentJurisdictionMention`, `DistributionTerritoryMention`, `ContentPresenceMention`, `Attested<T>` doc comments in full) |
| CRC askability / acquisition | `lib/crc-engine/dependency-askability.ts` (full), `selector-askability.ts`, `knowledge-readiness.ts` (header), `jurisdiction-clarification.ts` (header + question constants), `human-contribution-clarification.ts` (question constant), `assessment-jurisdiction-scope.ts` (header) |
| CRC extraction contract | `lib/interview-engine/anthropic-extractor.ts` (territory/jurisdiction candidate instructions) |
| CRC → Assurance handoff | `lib/crc-assurance-handoff/service.ts` + `types.ts` (headers, full), `lib/crc-project-context/projection.ts` + `types.ts` (full), `lib/reviewer-context/{auth,repository,service}.ts` (headers) |
| Consumer sweep | repo-wide grep of every CertForm-persisted column against `lib/` and `app/` |

### 2.2 Governance / methodology documents

`SI8-Reviewer-Manual-v0.2.md` (Philosophy §4–§6, Step 0/1/2, Domains I and L in full), `SI8-Reviewer-Workbook-Schema-v0.1.md` (all 16 controls, Evidence Gap Log), `GOVERNED-CLAIMS.md` (claim census + inline askability governance comments), `governance-reviews/DAR_001_STOCK_DEPENDENCY_ASKABILITY_2026-08-21.md` (full), `CRC-PUBLICATION-POLICY.md` (referenced), `MATRIX-LEARNINGS.md` (Free-tier findings), `CRC_CURRENT_STATE.md` §1–§4, `COMMERCIAL_ASSURANCE_ARCHITECTURE_INDEX.md` (full), `REVIEWER_RESOURCES_ARCHITECTURE.md` (§5, §7, §11 rows), `PRD_CRC_v1.0.md` §17–§19 + Open Questions, `COMMERCIAL_ASSURANCE_SUBMISSION_FACT_COVERAGE_DISCOVERY.md` (full).

### 2.3 Doc-vs-code drift recorded

1. `20260401000000_add_certform_fields.sql` documents `third_party_assets.items[]` as `{type, description, license_status}`. The shipped code also stores `file_path` (an uploaded licence document). The migration comment is incomplete; the code is authoritative.
2. The same migration documents `production_evidence_paths` as `string[]`. The code stores `{items, notes}`. (Also noted by CAH-4I.1 §3.4 against the PRD; confirmed here against the migration too.)
3. `REVIEWER_RESOURCES_ARCHITECTURE.md:140` records "`assetProviderIds` is always `[]` … documented limitation, not a bug." True — but the *scale* is nowhere quantified (§11.4, §17.3): it silently removes 19 of 33 governed claims from reviewer reach.
4. CAH-4I.1 §6 classified the territory finding as a canonicalization/granularity gap. Source inspection shows it is **first** a semantic category error (§11.2); canonicalization is downstream of that. Recorded as a correction, not a contradiction — CAH-4I.1's code tracing was accurate; its classification under-stated the defect.
5. CAH-4I.1 §5 assigned `human_contribution_description` and CertForm's `authorship_statement` to one conceptual fact with two provenances. Source inspection of the two question texts and their two purposes says they are **not** the same fact at the same granularity (§12.3). Recorded as a correction.
6. `topic-claims-fixture.ts` carries 33 claims; `GOVERNED-CLAIMS.md` carries 37 `### CLAIM-` headers (including one `CLAIM-XXX` template and one `CLAIM-LIKENESS-…` withheld-from-CRC claim). Hand-sync is by design (`types.ts` header: "no live markdown parser"); the delta is explainable, not drift, but a future reader should not treat either count as canonical for the other.

---

## 3. Current-state architecture

### 3.1 Four fact surfaces exist; none of them is canonical

```
  ┌──────────────────────── CUSTOMER-ASSERTED ────────────────────────┐
  │                                                                    │
  │  (S1) CertForm → `submissions` row                                 │
  │       authenticated user, 4 named declarations, 11 fixed sections  │
  │       flat JSONB; no confidence; no provenance; no supersession    │
  │                                                                    │
  │  (S2) CRC → `crc_sessions.structured_understanding`                │
  │       UNauthenticated; email unverified                            │
  │       Attested<T>; 5 confidence states; source_turn +              │
  │       source_statement; supersede-and-mark; canonical resolution   │
  └────────────────────────────────────────────────────────────────────┘
  ┌──────────────────────── SI8-ESTABLISHED ──────────────────────────┐
  │                                                                    │
  │  (S3) Reviewer Workbook §2 + §3 → `submissions.workbook_data`      │
  │       §2 = reviewer's own direct observation (30+ structured       │
  │            fields: logos_observed, trademarks_observed,            │
  │            real_likeness_suspected, synthetic_humans, …)           │
  │       §3 = 16 control judgments + per-control sub-fields           │
  │       no confidence type; no provenance; revision-tracked          │
  │                                                                    │
  │  (S4) Uploaded artifacts → Supabase `submission-files` storage     │
  │       6 upload channels; only 2 reachable from the workbook        │
  └────────────────────────────────────────────────────────────────────┘
                                    │
       ┌────────────────────────────┼────────────────────────────┐
       ▼                            ▼                            ▼
  16 controls              Living Knowledge             Assessment Report
  (S1 partial + S3 + S4)   applicability/scoping        (S1 + S3)
                           (S1 partial only)
```

Living Knowledge is deliberately **not** a fifth project-fact surface: LK holds governed propositions *about the world*, never about a project. That boundary is enforced structurally (`__tests__/reviewer-lk/authority-firewall.test.ts`) and is not in question.

### 3.2 Where the four surfaces are joined — and where they are not

| Join | Mechanism | Status |
|---|---|---|
| S1 → controls | reviewer reads a rendered submission panel; no structured mapping | Partial. 8 of ~20 persisted CertForm fields reach any reviewer surface (§17.2) |
| S1 → LK narrowing | `buildReviewerLkContext` → `resolveSubmissionToolIds` (canonicalized) + `resolveSubmissionJurisdiction` (**not** canonicalized) | Defective (§11) |
| S1 → Report | `reportProjection.ts` reads ~10 columns directly | Working, with two presence-boolean assertions grounded in files no reviewer can open (§17.3) |
| S2 → S1 | **none** | By design today; see §12 |
| S2 → reviewer | `crc-assurance-handoff` (association) + `buildCrcProjectContext` (neutral projection) + audited transcript access | Working, read-only, explicitly never evidence |
| S2 → S3 | **forbidden** — ADR-001 permanently forbids silent/automatic movement | Correct |
| S3 → LK | **none** — no reviewer-established fact ever satisfies an LK dependency or applicability requirement | Gap (§17.4) |
| S4 → controls | two channels only (tool receipts, audio licence) | Gap (§17.3) |

### 3.3 CRC already has the mature primitives; Commercial Assurance has none of them

Every primitive a fact-demand architecture needs already exists — on the CRC side only:

| Primitive | CRC | CertForm / Workbook |
|---|---|---|
| Typed uncertainty (`confirmed` / `confirmed_absent` / `unresolved_no_visibility` / `unknown` / `declined`) | `Attested<T>`, `ConfidenceState` | none — a boolean is `true`, `false`, or absent |
| Provenance | `source_turn`, `source_statement` on every mention | none |
| Correction | supersede-and-mark, never edit in place | none — a correction is a new submission row |
| Canonical identity resolution | `normalizeCandidate`, `KNOWN_TOOLS`, `ASSET_PROVIDER_IDS` | free-text `toolNameOther`, no provider concept at all |
| Cardinality-many mention collections | `ToolMention[]`, `AssetProviderMention[]`, `AssessmentJurisdictionMention[]`, `DistributionTerritoryMention[]`, `ContentPresenceMention[]` | flat JSONB arrays with no identity |
| Demand-driven acquisition | `jurisdiction-clarification.ts` asks *only* when a governed claim requires it | fixed 11 sections, asked of everyone |
| Askability governance (fail-closed) | `dependency-askability.ts`, `selector-askability.ts`, `DAR_001` | **none** |

This asymmetry — not a missing shared fact table — is the actual architectural deficit.

---

## 4. Canonical fact-demand model

### 4.1 The unit: a Fact Demand, not a fact

A **Fact Demand** is a declaration that some consumer needs to know something about a project. It carries no value. It is the thing that should exist once and be referenced by every consumer.

```
FactDemand {
  fact_key               canonical concept id (snake_case, one per distinct concept)
  concept_statement      one plain sentence: what is being asked about the project
  value_space            see §6.3 — free_text | bounded_enum | canonical_identifier
                         | membership_set | per_instance_record | artifact
  granularity            project | per_tool | per_asset_provider | per_asset_item
                         | per_person | per_territory
  demanded_by[]          consumer references (control id, LK dependency string,
                         ApplicabilityFact, report field, reviewer workflow step)
  establishment_classes[] which of E1–E8 may establish it (§5)
  acquisition_channels[] which of C1–C9 may originate it (§6), each with a
                         permission state: permitted | forbidden | auto
  evidence_status_by_channel   what an instance from that channel IS (§7)
  never_self_attested    boolean + governance reference (the hard gate)
  correction_policy      §10
  governance_ref         the review that decided the above
}
```

Three properties of this model are load-bearing and each is grounded in existing source:

**(a) Demand is separate from acquisition.** `CRC_CURRENT_STATE.md` §4 already states the rule for CRC: *"Materiality ≠ askability. A fact being materially relevant to a claim does not by itself authorize CRC to ask about it."* The Fact Demand model generalizes this to every channel: a demand existing never implies any channel may acquire it.

**(b) Demand is separate from applicability.** Also already stated: *"Selector askability ≠ applicability. Whether CRC may ask about a fact is a separate governance decision from whether that fact, once known, makes a claim applicable."* The registry preserves both as independent fields.

**(c) A demand may be permanently unsatisfiable, and that is a valid state.** `retrieval-engine/types.ts:158` records that `client_supplied_asset`, `creator_relationship`, and `distribution_context` were reviewed and **rejected** as applicability facts because *"no reliable keyed structured fact exists for any of them today … text-matching it to manufacture a boolean is explicitly the 'pretending a predicate is supported when the underlying fact isn't' failure mode."* A demand with no permitted acquisition channel is recorded as such, not quietly satisfied by an approximation.

### 4.2 What the registry replaces — and what it must never replace

It **replaces** nothing at runtime. It is a *joining* artifact. The four existing vocabularies (§0) stay exactly where they are, owned by whoever owns them today. The registry records, for each fact concept, which entries in each vocabulary refer to it.

This is the same discipline `knowledge-readiness.ts` already states for its own vocabularies: *"The two systems are never aliased into each other and use separate `BoundaryState` cap records … precisely so a future engineer can never accidentally collapse them."* And `ContentPresenceMention`'s header names three vocabularies (schema categories, governed dependency strings, askability keys) that are *"deliberately never merged."* The registry is a cross-reference, not a merge.

It must **never** become: a place where a claim's governed proposition is restated; a place where a legal conclusion is recorded; a runtime store of values; or a fifth vocabulary that the other four are expected to migrate into.

---

## 5. Authority / establishment taxonomy

The task proposed seven candidate classes and invited a better taxonomy if the evidence supported one. It does, in one respect: **"CRC-askable" is not an establishment class.** It is a permission attached to a (fact, channel) pair. A fact CRC may ask about is established by exactly the same authority as one CertForm asks about — a person saying so. Treating askability as a class would make the taxonomy non-orthogonal to §6 and would hide the real distinction (authenticated vs. unauthenticated self-report).

The evidence-supported taxonomy is eight classes on one axis: *what makes this instance worth anything.*

| Class | Definition | Source basis | Examples found |
|---|---|---|---|
| **E1 — Attributed self-report** | An identified, authenticated party asserts it, under CertForm's four declarations (Evidence Custodian, Indemnification, Content Integrity, Scope Acknowledgment). Control A01 exists to weigh exactly this. | `certify/page.tsx` §11; `signoff.ts:157-158` requires both declarations on record before sign-off | tool name/version/plan/dates; audio source; post-gen editing; distribution territory; third-party asset list |
| **E2 — Unattributed self-report** | A person asserts it in a CRC conversation. **CRC has no authenticated identity and `crc_sessions.email` is unverified** (`crc-assurance-handoff/types.ts`). An association is *"a PERMISSION fact only"*, explicitly *"NOT proof that the actor historically created, controlled, participated in, or owned the CRC session."* | `crc-assurance-handoff/types.ts` (verbatim) | every `StructuredUnderstanding` mention and project fact |
| **E3 — Documentary artifact** | A document exists and, once inspected by a reviewer, establishes the fact. The artifact alone is not the fact; the inspection is. | Manual "Acceptable evidence" lists; Workbook `Receipts or plan confirmation provided?` | tool receipt; talent release; IP licence; provider asset record; prompt log; timeline export |
| **E4 — Reviewer direct observation** | The reviewer watches/views the content and records what is present. The Manual marks Domains I and L *"This domain requires direct content review"* and forbids relying on disclosure alone. | Manual Domain I/L; `workbook-schema.ts` `section_2` (30+ structured observation fields) | logos/trademarks observed; real-likeness suspected; synthetic humans; music heard; children/animals present; landmarks; on-screen text |
| **E5 — Reviewer judgment** | A control judgment, gap, finding, outcome, confidence, or scope limitation. **Always an output, never an input.** | Workbook §3–§6; `validateWorkbookForSignoff` | all 16 control judgments; the five outcomes; commercial confidence |
| **E6 — System-derived / structurally entailed** | Deterministically computed from other facts; asking would duplicate a capability that already exists. `DAR_001` formalized this as class **A — AUTO-SATISFIED**. | `DAR_001` §"Approval classification"; `providerScopeMatches` construction argument | `asset_confirmed_getty/istock/shutterstock` (true by construction when the claim is reachable); `which_provider` (resolved by ordinary extraction); tier; payment status; runtime; submission mode |
| **E7 — External / institutional** | Established by a registry, provider system, or third party that SI8 queries. **SI8 currently performs no E7 lookups and says so in every Report.** An E7 fact can only enter the system re-characterised as E3 (the customer supplies the artifact). | Report Standard Assurance Language: *"SI8 has not conducted independent title searches, chain of copyright investigations, or registrations with any government body"* (`reportProjection.ts:434-440`) | USCO registration record; USPTO mark record; provider's own asset classification page |
| **E8 — Not establishable (prohibited conclusion)** | Not a fact SI8 may hold at all. The Manual names five; governed claims name more per claim. | Manual §5 (five explicit non-opinions); `CLAIM-NY-SYNTHETIC-PERFORMER-DISCLOSURE-001-v1` Prohibited Conclusions | "which law applies"; "is this copyrightable"; "is this legally safe"; "is the depicted person actually recognizable"; "does an exemption apply" |

**Ordering is not a ranking of truth.** E1 is not "weaker" than E3 in general — a dated Enterprise receipt (E3) and a submitter's plan declaration (E1) answer different halves of R02. The classes say *what would have to be wrong* for the instance to be wrong, which is what determines whether a control can be Verified on it.

**The E1/E2 split is the single most important distinction in this taxonomy** and is the one the current architecture does not represent anywhere (§12).

---

## 6. Acquisition-channel model

### 6.1 Channels

Acquisition channel answers *where an instance physically came from*. It is orthogonal to establishment class — the same class can arrive through several channels, and one channel can carry several classes.

| Channel | Description | Establishment classes it can carry | Askability governance today |
|---|---|---|---|
| **C1** CertForm section field | A fixed question in one of the 11 sections | E1 | **NONE** |
| **C2** CertForm file upload | One of 6 upload affordances | E3 (artifact deposited) | **NONE** |
| **C3** CRC deterministic question | A fixed, non-LLM question fired only on governed demand | E2 | `dependency-askability.ts` + `selector-askability.ts`, fail-closed |
| **C4** CRC passive extraction | Extracted when volunteered; never asked | E2 | extractor prompt contract; no proactive question |
| **C5** Reviewer §2 observation | Reviewer watches and records | E4 | n/a (reviewer authority) |
| **C6** Reviewer §3 control field | Reviewer records evidence reviewed + judgment | E3 (what was reviewed), E5 (judgment) | n/a |
| **C7** Reviewer artifact inspection | Reviewer opens an uploaded document | E3 | n/a — **but only 2 of 6 C2 deposits are reachable** (§17.3) |
| **C8** Deterministic derivation | Computed, never asked | E6 | structural |
| **C9** External lookup | Query a registry/provider | E7 | **does not exist; disclaimed** |

### 6.2 The governance asymmetry (the adversarial result)

`dependency-askability.ts` states the CRC rule in code: *"Absence defaults to non-askable, never the reverse — a dependency is never askable unless explicitly, deliberately listed here."* One entry exists. `selector-askability.ts` states the same for applicability facts; one entry exists, added only *"following a bounded live-model UAT."* `DAR_001` shows what it costs to add or refuse one: a chartered review, a primary-source citation, a per-dependency classification, and a recorded PM decision.

C1 and C2 have no equivalent. `ip_no_trademarked_ip` — a self-attestation that no trademarked IP appears, i.e. a legal characterisation of the content — exists as a checkbox with no governance record anywhere in the repository. It was never reviewed, refused, or approved; it was authored.

`DAR_001` refused `editorial_designation_confirmed` for CRC on the strength of SI8's own research: *"the asset's actual classification … as shown on the provider's own record, **not the user's self-report**."* That reasoning is channel-independent. It applies to CertForm identically. Nothing enforces it there.

**Required architectural addition: C1/C2 askability must be governed by the same fail-closed default as C3/C4.** Not the same registry file — a CertForm question is a product artifact, not a CRC turn — but the same rule, the same review shape, and the same recorded decision. This is process and documentation before it is code.

### 6.3 Value spaces

Comparing facts across channels requires a shared value space per fact, even though the fact instances stay separate.

| Value space | Rule | Existing precedent |
|---|---|---|
| `free_text` | Never matched, never compared; carries meaning only to a human. | `authorship_statement`, `logline`, `ScopedObservation.note` |
| `bounded_enum` | Closed, product-owned; extended one evidenced value at a time. | `CONTENT_PRESENCE_CATEGORIES`, `THIRD_PARTY_TYPES`, `audio_source` |
| `canonical_identifier` | Resolved through a curated alias table; unresolved values are **dropped**, never guessed. | `normalizeCandidate` + `KNOWN_TOOLS`; `ASSET_PROVIDER_IDS` |
| `membership_set` | `{included[], excluded[]}`; silence is neither. Present in both lists → fail closed to unresolved. | `AssessmentJurisdictionFacts` |
| `per_instance_record` | Keyed by a canonical identity; a project-level scalar would be dishonest. | `ToolMention.plan_tier` (per tool, not per project) |
| `artifact` | A storage path plus what it purports to be; establishes nothing until inspected. | `tools_used[].receipt_path` |

**Granularity rule, grounded in `DAR_001`'s asset-granularity pressure test:** *"a provider-level plain boolean is dishonest for a genuinely mixed multi-asset case."* Therefore — **never represent a per-instance fact at project level. If the truthful structure is unavailable, the fact stays unresolved.** `DAR_001` further shows what the truthful structure would look like if ever needed (`none / some / all / mixed / unknown`) and declines to build it absent a real need. That restraint is part of the contract.

---

## 7. Evidence-status model

Establishment class says *how* something became known. Evidence status says *what it counts as* inside an assessment. Four values; orthogonal to §5 and §6.

| Status | Meaning | Produced by | Consumable as |
|---|---|---|---|
| **V1 — Project assertion** | Someone said this about the project. Unverified by construction. | E1, E2 | An input a reviewer weighs. **Never** a control's basis for Verified on its own where the Manual requires direct review or documentation. |
| **V2 — Assessment evidence** | An artifact the reviewer inspected, recorded in §3 `evidence`. | E3 via C7 | A control's evidentiary basis. |
| **V3 — Reviewer record** | The reviewer's own observation (E4) or judgment (E5), in `workbook_data`. | E4, E5 | Controls, gaps, findings, outcome, report. |
| **V4 — Governed institutional fact** | A Living Knowledge proposition about the world. Never about this project. | LK governance | Research input to reviewer judgment, via Reviewer LK / HRR only. |

**Invariants, each already enforced somewhere and restated here as one contract:**

1. **V1 never becomes V2 by restatement.** A more detailed self-report is still a self-report. Reviewer Manual v0.2's Domain H rule is the canonical instance: an uncorroborated narrative caps at *Partially Verified* no matter how detailed.
2. **CRC output is V1 and may never become V2 or V3 automatically.** ADR-001 *permanently forbids* "silent or automatic movement of Reviewer LK or CRC content into `workbook_data`, an `assessments` row, evidence, a gap, a finding, a control result, an outcome, a sign-off, a report, or a publication decision."
3. **V4 never becomes V1 and V1 never becomes V4.** `submission-facts.ts` header, verbatim.
4. **V3 (E5 judgments) are outputs only.** No consumer may treat an outcome, confidence, or judgment as an input fact.
5. **A V2 claim requires an actual inspection.** An artifact's *presence* is a V1 fact ("a file was uploaded"); its *content* becomes V2 only after C7. §17.3 shows two Report fields currently straddle this line.

---

## 8. Consumer / dependency model

A Fact Demand is created by a consumer. Five consumer kinds exist; each has a different failure mode when its demand is unmet, and the registry must record which.

| Consumer | Failure mode when the fact is missing | Fails safely today? |
|---|---|---|
| **Assessment control (16)** | Reviewer records *Not Provided* / *Partially Verified* and logs an Evidence Gap. Honest by construction. | Yes |
| **Reviewer workflow step** | Scope limitation recorded in §1 and carried to the Report. | Yes |
| **LK applicability requirement** | Requirement evaluates `unresolved`; claim withheld from CRC, surfaced-with-status to a reviewer. | Yes — `evaluateRequirementStatus` never guesses |
| **LK scope narrowing** (`provider_scope`, `tool_scope`, `geographic_relevance_scope`) | Claim silently excluded from candidacy, with **no diagnostic by design**: *"No `provider_scope_unmet` diagnostic exists anywhere in this codebase, per explicit PM instruction."* | Safe, but **invisible** — the dominant reviewer-side blind spot (§11.4) |
| **Report projection field** | Fails closed to "Not stated" / "Unknown". `reportProjection.ts:397-405` is the model instance: no structured C2PA boolean exists, so the Report never asserts one. | Mostly — two exceptions at §17.3 |

**Architectural consequence:** *silent* scope-narrowing failure is acceptable in CRC (a user cannot act on an absent claim they never knew about) but is **not** acceptable for a Human Reviewer, whose entire job is knowing what was and was not considered. `selectReviewerClaims` already reports eligibility-withheld claims to the reviewer *with a reason*; it does not report scope-excluded ones, because the scope predicates it reuses are deliberately diagnostic-free. That is a correct reuse of a CRC primitive producing an incorrect outcome in a reviewer context. It is recorded here as a design finding; **no change is authorized.**

---

## 9. Provenance requirements

If the same underlying concept can exist in CRC, CertForm, evidence, and the workbook, the minimum provenance that must travel with **every** instance is:

```
FactInstance {
  fact_key            which demand this answers
  value               in the demand's declared value_space
  granularity_key     null | canonical tool id | provider id | asset item id | …
  channel             C1–C9
  establishment_class E1–E8
  evidence_status     V1–V4
  asserted_by         authenticated actor id
                      | 'unauthenticated_crc_session:<id>'
                      | 'reviewer:<actor>' | 'system'
  asserted_at         timestamp
  source_ref          CertForm section + field | CRC turn + verbatim statement
                      | storage path | workbook section + control
  certainty           the five-state ConfidenceState, or 'not_modelled'
  superseded_by       instance id | null
}
```

**Every field here already exists somewhere; none exists everywhere.** CRC carries `source_turn`, `source_statement`, `confidence`, `superseded_by`, and canonical resolution. Reviewer LK access carries actor + submission + timestamp in `crc_context_access_events`. The `submissions` row carries none of them.

**The two non-negotiable fields are `asserted_by` and `establishment_class`**, because they are what makes the E1/E2 distinction representable. Without them, a CRC-originated value and a CertForm-declared value are indistinguishable once written down — which is exactly the failure the whole CAH authority architecture exists to prevent.

**Verbatim preservation is required, not optional.** CRC's `source_statement` is what lets `buildCrcProjectContext` show a reviewer what the customer *actually said* rather than a normalized token, and `canonicalizeJurisdictionValue`'s own header records the reason: canonicalization is applied *"at the APPLICABILITY COMPARISON BOUNDARY, never at attestation/capture time … the user's own raw words are never rewritten."* Any future Commercial Assurance fact representation must adopt the same rule.

---

## 10. Correction / supersession requirements

**Determination: yes, canonical Commercial Assurance project facts require correction semantics — but NOT CRC's semantics.**

CRC's model is turn-scoped supersede-and-mark, designed for a live conversation where a later utterance replaces an earlier one within one session. Two of its own refinements show how carefully scoped it is: `AssessmentJurisdictionMention` and `DistributionTerritoryMention` support real 1:1 supersession, while `ContentPresenceMention` is **deliberately append-only** because *"a free-form correction statement can never be matched to a single, deterministic, provably-correct prior target"* without a count or identity the type deliberately does not carry.

Commercial Assurance has a different shape and a different stake:

1. A submission is a **point-in-time attested declaration** made under four warranties. It is not a running conversation.
2. An assessment is **bound** to a workbook revision and a report artifact. The report-binding lifecycle (Execution Gaps §3o) already implements stale-report invalidation: when workbook data changes after report generation, `REPORT_GENERATED` reverts to `DRAFT`, forcing regeneration before re-signing.
3. Therefore a *submission* fact changing after review begins has assessment-integrity consequences that a CRC correction never has.

**The required policy, by fact class:**

| Class | Correction policy |
|---|---|
| E1 (CertForm) | Append-only, versioned, attributed, with a reason. Never silent overwrite. If the assessment has reached `REPORT_GENERATED` or later, the correction must invalidate downstream artifacts by the same mechanism the report-binding lifecycle already uses. |
| E2 (CRC) | Unchanged — CRC's existing per-mention supersession is correct for CRC and must not be extended toward Commercial Assurance. |
| E3 (artifact) | Artifacts are immutable. A "correction" is a new deposit; the superseded artifact is retained (the same discipline `ADR-003-manual-pdf-upload-provenance.md` applies to report PDFs). |
| E4/E5 (reviewer) | Already revision-tracked via `workbook_data` + sign-off invalidation. No change needed. |
| E6 | Recomputed; correction is meaningless. |

**Today CertForm has no correction concept at all** — a resubmission is a new `submissions` row with no link to the prior one. That is a real gap, but it is a *lower* priority than §17.3, because it currently fails loudly (a second row is visible) rather than silently.

---

## 11. Geography / jurisdiction

This is the discriminating case the contract must get right, and the one where the existing architecture is most clearly wrong.

### 11.1 Three distinct concepts — already separated in CRC, collapsed at the Commercial Assurance boundary

| | **G1 — Distribution / output-use territory** | **G2 — Assessment jurisdiction scope** | **G3 — Applicable law** |
|---|---|---|---|
| What it is | Where the output will be distributed or used. A plain factual project-geography statement. | Which body of governed knowledge the assessment should consider. A **scope request**, not a fact about the world. | Which law actually governs this project. |
| CRC type | `DistributionTerritoryMention` | `AssessmentJurisdictionMention` | **not modelled** |
| Self-description (verbatim) | *"a plain FACTUAL PROJECT-GEOGRAPHY fact, deliberately NOT an assessment-scope request … and NOT itself a determination that any law applies"* | *"a jurisdiction the user has explicitly asked CRC to consider governed knowledge for — deliberately NOT a factual-territory fact (distribution region, filming/client/subject location) and NOT a CRC-determined conclusion about which law actually governs"* | Manual §5: SI8 does not opine on *"Whether a specific jurisdiction's law applies to the content"* |
| Value handling | Raw literal labels. **No alias table anywhere in the pipeline.** Exact case-insensitive match only. | Canonicalized at comparison time via `JURISDICTION_VALUE_ALIASES`. Membership set with explicit exclusion. | n/a |
| Consumer | `geographic_relevance_scope` → *discovery candidacy only* (inverted null polarity: opt-**out** by default) | `applicability_requirements` → *gating* | n/a |
| Establishment class | E1 / E2 | E1 / E2 today; **E5 is the better fit** (§11.5) | **E8** |

The extractor prompt states the non-collapsibility rule in operational form: *"NEVER infer it from a filming location, a client's location, a depicted person's location, or an assessment-jurisdiction statement — e.g. 'We filmed in New York.' and 'Please assess this for New York.' must NEVER produce a `distribution_territory_mention` candidate."*

CRC's own question text settles which concept it acquires: *"Which jurisdiction — for example, a country, or a specific state or province — should CRC consider for this assessment?"* That is unambiguously G2.

CertForm's field is labelled **"Territory"** / *"Intended territory for this campaign"*, with options `Global / North America / Europe / Asia / Other`. That is unambiguously G1. The Report renders it as **"Intended territory."** Also G1.

### 11.2 The defect: a category error, then a granularity error

`lib/reviewer-lk/submission-facts.ts:68-73`:

```ts
export function resolveSubmissionJurisdiction(territoryPreferences: unknown): AssessmentJurisdictionFacts {
  if (typeof territoryPreferences === 'string' && territoryPreferences.trim().length > 0) {
    return { included: [territoryPreferences.trim()], excluded: [] }
  }
  return { included: [], excluded: [] }
}
```

A **G1** value is read out of `submissions.territory_preferences` and returned as **`AssessmentJurisdictionFacts`** — the G2 type. Three defects compound, in this order:

1. **Semantic (primary).** G1 is substituted for G2. Even a perfect country-level G1 value would be the wrong concept: "we will distribute in the United States" is not "assess this under United States law." CRC refuses this substitution in three separate places; the reviewer path performs it.
2. **Granularity (secondary).** CertForm's five buckets cannot express a country, and cannot express a state at all. Governed claims key on `'United States'` (COPY-001/002/003) and `'New York'` (NY §396-b).
3. **Normalization (tertiary).** No canonicalization is applied — in contrast to `resolveSubmissionToolIds` four lines above, which does run through `normalizeCandidate`. `JURISDICTION_VALUE_ALIASES` contains seven US aliases and, correctly, does **not** map `'North America'`; its header states the fail-closed reasoning explicitly.

CAH-4I.1 identified (2) and (3) and classified the finding under them. (1) is the actual root cause and is recorded here as a correction to that classification.

### 11.3 Quantified consequence

Four governed claims carry a `jurisdiction` applicability requirement:

| Claim | Required value | Reachable from any CertForm territory option? |
|---|---|---|
| `CLAIM-COPY-001-v1` | `United States` | No — `Global`, `North America`, `Europe`, `Asia` all fail; only a free-text `Other` = literally "United States"/"US"/"USA"… would pass |
| `CLAIM-COPY-002-v1` | `United States` | No (same) |
| `CLAIM-COPY-003-v1` | `United States` | No (same) |
| `CLAIM-NY-SYNTHETIC-PERFORMER-DISCLOSURE-001-v1` | `New York` | **Never** — no CertForm option, and no alias, can produce it |

The remaining four applicability-gated claims require `tool_plan_tier` (Pika Standard/Pro/Fancy) or `tool_account_status` (Kling Member Account), and `buildReviewerLkContext` passes `toolMentions: []` unconditionally. **Therefore: zero applicability-gated governed claims can currently be `met` for a Human Reviewer, on any submission.** The claims are still *surfaced* (with `unresolved` status — `selectReviewerClaims` deliberately never withholds on applicability), so nothing is silently wrong in the output; but the deterministic applicability machinery contributes nothing on the reviewer path.

The Reviewer Manual's own NY gate survives this, because it is a manual reviewer instruction — *"For any submission with US territory in the intended deployment, flag this law's applicability … Note it in the Residual Commercial Risks section"* — not a code path. Note also that the Manual's gate is **country-level for a state-level statute**, and that the governed claim's own Prohibited Conclusions forbid stating *"that New York jurisdiction attaches to a specific project for any reason, including the user merely mentioning New York."* The Manual's instruction is consistent with that only because it produces a *residual-risk note*, not an applicability determination. That is a genuinely correct design; it just means **G1 → risk-note is a reviewer heuristic, and must never be code-generalized into G1 → G2.**

### 11.4 The larger, quieter geography-adjacent gap: provider scope

19 of 33 governed claims are `provider_scope`-scoped (all 7 STOCK, all 9 MUSIC/Artlist, plus Adobe Stock, Pond5, Storyblocks, Synthesia). `buildReviewerLkContext` sets `assetProviderIds: []` unconditionally — *"V1: no structured asset-provider field on `submissions`"* — and `providerScopeMatches` excludes a non-matching provider-scoped claim **before** any eligibility or diagnostic bookkeeping, so a scope-excluded claim is *"structurally indistinguishable from a claim that was never a candidate at all."*

Result: **roughly 58% of SI8's governed knowledge is invisible to a Human Reviewer, with no withheld-list entry and no diagnostic.** The root cause is a fact-acquisition gap: CertForm's third-party asset items carry `{type, description, license_status, file_path}` and **no provider identity field**, so even if the plumbing were wired there would be nothing canonical to wire.

This is documented as a limitation in `REVIEWER_RESOURCES_ARCHITECTURE.md:140`; its scale is not.

### 11.5 Recommended representation — and a recommendation the geography question does not usually reach

**Represent G1 and G2 separately. Never derive either from the other.**

- **G1 `distribution_territory`** — E1, project-level, cardinality-many, raw literal labels, **no alias table** (matching CRC's deliberate prohibition). Consumers: Report "Intended territory"; the reviewer's own scope reasoning; `geographic_relevance_scope` discovery if ever wired. CertForm's current coarse enum is *adequate for its actual consumers* and does not need widening for G2's sake.
- **G2 `assessment_jurisdiction_scope`** — membership set `{included[], excluded[]}`, canonicalized at comparison time only, cardinality-many, and **acquired only when a governed claim actually demands it**, exactly as `jurisdiction-clarification.ts` already gates CRC's question.

**The non-obvious recommendation:** for Commercial Assurance, **G2's best establishment class is E5 — reviewer-established assessment scope — not E1.**

Evidence: Reviewer Manual Step 1 already makes scope the reviewer's own act — *"Does the submission fall within SI8's current scope? … Content intended for jurisdictions not yet researched by SI8 — note the limitation in scope. Record any scope limitations explicitly in Workbook Section 1."* The public "Assessment Scope" is already reviewer/methodology-owned, not customer-owned (`signoff.ts` snapshots `scope_domain_codes` from the methodology version, explicitly *"never derived from Not-Applicable control judgments"*). Asking a *customer* which law the assessment should be conducted under inverts the authority model in the same way Manual §5 says asking them which law applies would.

Under this reading, the customer supplies **G1** (what they intend to do), and the **reviewer** sets **G2** (what SI8 will assess against, and what it explicitly will not) — which is also the only representation under which the Manual's existing "jurisdictions not yet researched by SI8" scope limitation becomes structurally expressible rather than free text.

This is a recommendation, not a decision. It is listed as open PM decision **D-3** (§20).

**Prohibited under all options:** inferring `United States` from `North America`; inferring `New York` from `United States`; inferring G2 from G1; inferring either from a filming location, client HQ, or depicted-person location; treating `Global` as membership in any specific jurisdiction.

---

## 12. CRC / CertForm fact reuse

### 12.1 The four options, evaluated against source

| Option | Verdict |
|---|---|
| **1. Deliberate duplication** (status quo) | Correct **today**, for a reason stronger than caution — see §12.2. Should not be defended forever on inertia. |
| **2. Pre-fill with explicit user reconfirmation** | **Blocked on identity, not on principle.** Cannot be adopted while CRC has no authenticated identity. |
| **3. Shared canonical project fact with separate provenance/evidence status** | **Rejected as the primary abstraction.** Shares the wrong layer (§12.4). |
| **4. Other** | **Recommended**: share the *demand* and the *value space*; keep fact instances per-channel; permit reuse only as a deliberate, actor-initiated, provenance-preserving act. |

### 12.2 Why pre-fill is blocked: identity, not squeamishness

`crc-assurance-handoff/types.ts`, verbatim: an association *"is NOT proof that the actor historically created, controlled, participated in, or owned the CRC session — CRC has no authenticated identity and `crc_sessions.email` is unverified. No type or field here is named `ownership_*` / `verified_crc_owner` / `crc_owner`. The 'how was this permitted' fact is `authorization_basis` — a PERMISSION fact only."*

CertForm's answers are E1: made by an authenticated user under four named warranties, and control **A01** exists specifically to weigh the identity and authority behind them. Pre-filling an E1 field from an E2 source would import an unattributed statement into an attributed declaration and then have the submitter warrant it. That is not a provenance-labelling problem — it is an authority laundering problem, and no amount of provenance metadata on the resulting row fixes it.

(Explicit reconfirmation *does* re-establish E1 authority — the user reads it and declares it. The obstacle is narrower: showing a user words that may not be theirs, inside a form whose value is that the words are theirs. That is a product-risk decision, recorded as **D-4**.)

### 12.3 The "duplicated question" is not actually duplicated

CAH-4I.1 treated `human_contribution_description` and `authorship_statement` as one concept asked twice. Reading both in source shows otherwise:

| | CRC `human_contribution_description` | CertForm `authorship_statement` |
|---|---|---|
| Question | *"Beyond entering prompts, what did you personally do to shape the final video — for example selecting takes, arranging the sequence, editing, or compositing?"* | Free-text, **≥150 words**, with five structured prompts (which scenes; what prompts/styles; how you iterated and what you rejected; editorial decisions; post-production) |
| Purpose | Resolve the *conversational* information gap enough to tailor an explanation — one additive sentence (`shouldIncludeHumanContributionSentence`) | Domain H01/H02 assessment input |
| Does answering resolve anything? | Explicitly **no**: *"capturing a self-reported description resolves the CONVERSATIONAL information gap … but does not, and must never, resolve the underlying LEGAL dependency"* — which is why the string is deliberately retained in `unresolved_project_dependencies` | Also **no**: Reviewer Manual v0.2 caps Domain H at *Partially Verified* without a corroborating artifact |
| Evidence status | V1 (E2) | V1 (E1) |

Two questions, different granularity, different purpose, different authority, and *neither one resolves its underlying dependency*. They are siblings, not duplicates. The genuine redundancy cost to a customer is a few minutes of retyping — real, but far smaller than CAH-4I.1's framing implied, and not worth crossing an authority boundary to remove.

### 12.4 Why a shared canonical fact shares the wrong layer

A shared fact record would have to answer: what is the canonical value of `human_contribution_description` for this project? There is no such thing. There is a bounded conversational answer (E2/V1) and a detailed declaration (E1/V1) and, if a prompt log was uploaded and inspected, a corroborating artifact (E3/V2). A single canonical slot forces a precedence rule, and any precedence rule either discards the stronger instance or promotes the weaker one.

What *is* genuinely shared and genuinely missing:
- **The demand** — "Commercial Assurance needs to know the nature and extent of human creative involvement, and Domain H requires a corroborating artifact to Verify it." Stated once, referenced by H01, H02, `CLAIM-COPY-001/002/003`'s dependency string, and CRC's askability entry. Today it is stated four times in four vocabularies with no link.
- **The value space** — canonical tool ids, canonical provider ids, jurisdiction labels. `resolveSubmissionToolIds` already proves cross-channel value-space sharing works and is safe: it reuses CRC's `normalizeCandidate` on submission data without importing any CRC fact.

### 12.5 Determination

> **CRC and Commercial Assurance keep separate fact instances. They share the Fact-Demand Registry and the canonical value spaces. Cross-channel movement of a fact instance is permitted only as a deliberate, actor-initiated, provenance-preserving act — never as silent pre-fill, and never in the customer direction while CRC identity is unauthenticated.**

This is the smallest architecture that preserves all three required boundaries (CRC result ≠ assessment evidence; CRC conclusion ≠ reviewer conclusion; user-supplied fact ≠ verified evidence), and it is already the shape ADR-001 left open: *"A future deliberate, reviewer-initiated, provenance-preserving citation / reference affordance … is **explicitly not prohibited** by this ADR."*

Note also `PRD_CRC_v1.0.md`'s own frozen Open Questions include *"Should users upload evidence during CRC?"* — deliberately undecided. Nothing here presumes an answer.

---

## 13. Copyright registration

### 13.1 Decompose first (four distinct concepts, as the task requires)

| Concept | What it is | Class |
|---|---|---|
| **(a) Registration status** | A registration was granted / refused / never sought, for this work | E1 self-report; E3 if a certificate is deposited; E7 to verify |
| **(b) Application status** | An application was filed; registry; date; reference number | E1 / E3 / E7 |
| **(c) Ownership claim** | Who asserts authorship and on what basis | E1 — **already demanded and already acquired** |
| **(d) Independent registry verification** | SI8 queries the registry and confirms | E7 — **does not exist; explicitly disclaimed** |

### 13.2 What actually demands each

**(c) is already in scope and already acquired.** Workbook control **H02** carries `copyright_claim`, `claim_basis`, and `assessment` fields; the Manual frames H02 as the *basis* of a copyright claim while stating *"SI8 does not make copyright determinations … The copyright question belongs to courts and lawyers."* CertForm's `authorship_statement` + `ai_percentage` + `post_gen_editing` + `scene_attribution` supply the inputs. **No gap.**

**(a) and (b): no consumer demands them.** Swept: all 16 controls, the Manual's seven domains, the Report projection's Supporting Evidence Record, all 33 governed claims, `APPLICABILITY_FACTS`, every `unresolved_project_dependencies` string. The four `CLAIM-COPY-*` claims concern **copyrightability** (USCO Part 2, *Thaler v. Perlmutter*, *Zarya of the Dawn*), not registration. Nothing reads a registration fact anywhere.

**(d) is in direct conflict with shipped, delivered product language.** `reportProjection.ts:434-440`, reused verbatim from `SI8-Assessment-Report-Template-v0.2.md`: *"SI8 has not conducted independent title searches, chain of copyright investigations, or registrations with any government body."*

### 13.3 Is self-reported registration *compatible* with the disclaimer?

Technically yes — the disclaimer says SI8 does not *verify*, not that SI8 does not *record*. A submitter-supplied certificate would be an ordinary E3 artifact like any receipt. But recording a registration number in an assurance report, while disclaiming that it was checked, creates an expectation gap a brand's legal reader will not parse carefully. That is a positioning judgement, not an architecture one.

### 13.4 Classification

| Concept | Classification |
|---|---|
| (c) ownership claim / claim basis | **PROVEN FACT DEMAND — already acquired** (H02). No action. |
| (a) registration status, (b) application status | **OUT OF SCOPE** for the current product — no consumer demands them. Reclassifiable as **OPTIONAL PRODUCT EXPANSION** if an external driver appears (the most plausible is E&O underwriting; see `COMMERCIAL-RISKS-AI-VIDEO-EXTERNAL-EVIDENCE-2026.md`, which is flagged ICP-3/deferred). Would be E1 + optional E3; would require no new architecture — one Fact Demand, one C1 field, one C2 upload. |
| (d) independent registry verification | **OUT OF SCOPE**, and adopting it would require changing the Report's Standard Assurance Language — a positioning decision, recorded as **D-5**, not an architecture gap. |

**Net answer to "does copyright registration belong in the current product?" — No.** Not because it is unimportant, but because nothing in the current architecture consumes it, and the one thing that would make it meaningful (independent verification) is something SI8 currently tells every customer it does not do.

---

## 14. Trademark

The task requires four separate determinations. Kept separate deliberately, and derived **without** using LK's absence to define the fact universe.

### 14.1 Commercial Assurance fact demand that already exists

Derived from the Workbook Schema and the Manual alone:

- **I03 — Brand, Logo, and Trademark Elements**: *"Does the content contain identifiable logos, brand marks, or trademarked visual elements?"* with fields `Identifiable trademark elements: [None identified / Suspected / Confirmed — describe]` and `Submitter's disclosure`. A named control in the 16-control set, machine-required for sign-off (`signoff.ts` `CONTROLS` includes `I03`).
- **Workbook §2** carries four dedicated reviewer-observation fields: `logos_observed`, `logos_description`, `trademarks_observed`, `trademarks_description`.
- **The No List** (Section 1 scope check, rendered in `Section1Intake.tsx`) includes *"Explicit IP imitation — copyrighted characters, brand mascots, or protected marks."*
- Manual Domain I "Decision logic" includes *"Identifiable third-party IP observed (character, **logo**, artwork, distinctive architectural work)."*

So the demand is real, named, gated, and pre-dates any LK consideration.

### 14.2 Submission acquisition that already exists

`ip_confirmation` Path A: `ip_no_copyrighted_characters`, `ip_no_brand_imitation`, `ip_no_trademarked_ip` (E1 checkboxes). Path B: `ip_license_path` (E3 deposit). Path C: `fair_use_argument` + `fair_use_doc_path`. All rendered to the reviewer's Submission panel (the three checkboxes) — except the Path B and Path C artifacts, which are not (§17.3).

### 14.3 Evidence / reviewer demand that exists

E4 direct visual review is the Manual's requirement for Domain I (*"The reviewer must watch or view the content, not rely solely on the submitter's disclosure"*), with §2's four observation fields as the structured capture, and I03's `trademark_elements` as the control record.

### 14.4 What is genuinely missing because trademark LK has not been onboarded

**Not a fact. An interpretive standard.**

`GOVERNED-CLAIMS.md` contains zero trademark-domain claims (37 headers: 4 COPY, 10 MUSIC, 7 STOCK, 1 LIKENESS, 1 NY, 11 tool/provider-specific, 1 template, 2 misc). The three incidental mentions of "trademark" are inside stock claims (a provider's own trademark/property-release language) and one Pending Question.

The consequence is visible in the Manual: Domain I's decision logic has **no trademark-specific branch**. A logo is evaluated under the same visual-scan rule as a copyrighted character. Nothing in the methodology distinguishes registration, use in commerce, likelihood of confusion, nominative or descriptive fair use, incidental background depiction, or a provider's property-release chain — all of which are the distinctions a brand's legal counsel would expect an assurance product to draw.

### 14.5 The generic-architecture check (the point of including trademark here)

A future trademark claim needs **zero new fact types.** It would declare dependencies as ordinary `unresolved_project_dependencies` strings (e.g. `mark_visible_in_content_confirmed`, `mark_owner_authorization_obtained`, `nominative_use_basis_stated`), each routed through the existing four-class treatment decision (§6.2), and would consume the already-existing E4 observation fields. If it needed a gate it would use an existing `ApplicabilityFact` or trigger the same "no reliable keyed structured fact exists" refusal that `client_supplied_asset` already received.

This is the evidence that the generic architecture holds: **trademark is not a new orchestration problem. It is a knowledge-onboarding problem sitting under an already-designed control.**

### 14.6 Determination

**LK KNOWLEDGE GAP — not a fact-demand gap, not an acquisition gap, not a reviewer-workflow gap.** Onboarding is not authorized by this document and is not recommended as the next milestone (§21). One adversarial note is recorded for whoever does it: `ip_no_trademarked_ip` is an ungoverned E1 self-attestation asking a lay submitter to make a legal characterisation. Under §6.2's required governance it would have to be reviewed, and it is not obvious it would survive.

---

## 15. Stock-governance adversarial check

**The test:** does the proposed architecture prevent an evidence-only stock fact from becoming a user self-attestation question?

**Setup.** `DAR_001` classified four facts **D — EVIDENCE-ONLY**: `editorial_designation_confirmed`, `separate_authorization_obtained`, `release_status_confirmed`, `rights_and_clearance_status`. Three `asset_confirmed_*` facts and `which_provider` were classified **A — AUTO-SATISFIED**. `CRC_CURRENT_STATE.md` §4 restates the rule and adds: *"This list is not broadened here; broadening it requires its own governance decision, not a documentation pass."*

**Attack 1 — via CRC.** *Add `editorial_designation_confirmed` to `DEPENDENCY_TREATMENTS` as `askable_in_crc`.* **Blocked in practice**: the registry is a deliberate, reviewed, fail-closed structure; `DAR_001` exists as the recorded refusal; `knowledge-readiness.ts` reads only registered entries; `PRD_CAH_4G_HRR.md` and `HRR_GRI_TECHNICAL_DESIGN.md` independently restate the rule for HRR's classifier, so the reviewer research surface cannot convert it either. Adding an entry is possible but is a visible, reviewable act that contradicts a recorded decision. **PASS.**

**Attack 2 — via CertForm.** *Add to Section 3: "Were any of your stock assets marked Editorial-use-only? ☐ Yes ☐ No ☐ Unsure."* **NOT BLOCKED.** There is no registry, no review requirement, no fail-closed default, and no test. The question would be a two-line JSX addition and one JSONB key. It would produce an E1/V1 answer that looks structurally identical to every other Section-3 answer, and — because `third_party_assets` reaches no reviewer surface (§17.2) — would not even be visible to the person whose judgment it purports to support. **FAIL.**

**Attack 3 — via a "convenience" default.** *Treat an unanswered evidence-only fact as `false`/"none".* **Blocked** in CRC (`evaluateRequirementStatus` returns `unresolved`; *"Unresolved knowledge does not become resolved because CRC stops asking"*). **Partially exposed** in Commercial Assurance: `Section1Intake.tsx` and `WorkbookClient.tsx` both render `submission.territory_preferences || 'Global'` — a display-layer default that shows a reviewer a value the submitter may never have chosen. Low materiality (the form itself defaults to `Global`), but it is the same failure shape and is recorded.

**Attack 4 — via granularity flattening.** *Ask one project-level "was any of your stock editorial?" boolean.* Blocked by §6.3's granularity rule and `DAR_001`'s own asset-granularity pressure test (*"a provider-level plain boolean is dishonest for a genuinely mixed multi-asset case"*), which the contract adopts verbatim as a rule rather than a finding.

**Result: the current architecture fails the adversarial check on the CertForm side.** The proposed contract passes it only if §6.2's required addition — a fail-closed askability gate and governance record for C1/C2 — is adopted. **That is the single change without which this whole contract does not actually protect anything.**

**Discipline confirmation:** no fact classified E3 or E4 anywhere in this document is recommended for self-attestation. The four `DAR_001` facts, C2PA/on-chain presence, provider asset classification, "is this mark actually infringing", and "is this person actually recognizable" all remain where they are.

---

## 16. Representative fact-demand inventory

Covers all 16 controls plus the non-control consumers (Report projection, LK narrowing, reviewer scope). Column key — **Class**: §5. **Chan**: §6.1. **Status**: §7. **Gran**: §6.3.

### Domain A — Identity & Accountability

| # | Fact demand | Class | Gran | Chan (today) | Status | Consumers | Assessment |
|---|---|---|---|---|---|---|---|
| A-1 | Submitter identity + contact | E1/E6 | project | C1 (auth session) | V1 | A01, Report | Covered |
| A-2 | Submission mode (individual creator vs agency) | E1 | project | C1 | V1 | A01, form branching | Covered |
| A-3 | End client identity (agency mode) | E1 | project | C1 (`client_name`) | V1 | A01 | **Acquired, not surfaced** (§17.2) |
| A-4 | Authority to submit (declarations on record) | E1 | project | C1 ×4 | V1 | A01, §1 scope checks, `validateWorkbookForSignoff` | Covered — machine-gated at sign-off |
| A-5 | Tier + payment state | E6 | project | C8 | V1 | §1 `certified_tier` check | Covered |

### Domain R — Commercial Rights & Licensing

| # | Fact demand | Class | Gran | Chan (today) | Status | Consumers | Assessment |
|---|---|---|---|---|---|---|---|
| R-1 | AI tool identity | E1 | per_tool | C1 | V1 | R01, R02, R04, I (training data), LK `tool_scope`, Report | Covered; canonicalized for LK via `normalizeCandidate` |
| R-2 | Tool version | E1 | per_tool | C1 | V1 | R01, D01 | Covered |
| R-3 | Tool plan tier | E1 | per_tool | C1 (`planType`, tool-agnostic enum) | V1 | R02, LK `tool_plan_tier`, Report | **Acquired; not projected into reviewer applicability facts** (`toolMentions: []`). Enum cannot express Pika `Fancy`. **Option label asserts a legal conclusion** (§17.6) |
| R-4 | Tool account/membership status | E1 | per_tool | **none** | — | LK `tool_account_status` (Kling Member Account) | **Acquisition gap** — a distinct concept from plan tier by design |
| R-5 | Access surface (consumer app vs API) | E1 | per_tool | **none** | — | Tool identity itself (Gemini API vs Consumer App are distinct Matrix rows) | **Acquisition gap** — CRC models it (`ToolMention.access_surface`); CertForm does not |
| R-6 | Generation date window | E1 | per_tool | C1 (`startDate`/`endDate`) | V1 | R02 (licence dated at/before generation), D01 | Covered |
| R-7 | Commercial-plan proof artifact | E3 | per_tool | C2 (`receipt`, required) | V2 after C7 | R02, Report | Covered — one of only two reachable C7 paths |
| R-8 | Custom / fine-tuned / locally hosted model used | E1 | per_tool | **none** | — | R03 | **Proven acquisition gap** (CAH-4I.1 §8.1, re-verified). Workbook has `R03.custom_model` — the reviewer has a slot, no signal |
| R-9 | Training-data rights documentation | E3 | per_tool | **none** | — | R03 | Gap, conditional on R-8 |
| R-10 | Output-rights basis (tool ToS) | E6/E3 | per_tool | derived from R-1..R-3 + LK | V1/V4 | R04 | Covered indirectly |
| R-11 | Work-for-hire / contractor agreement | E3 | project | **none** (inferable from A-2 and I-1 freelance items) | — | R04 | Weak gap — reviewer has an indirect path |

### Domain H — Human Creative Contribution

| # | Fact demand | Class | Gran | Chan (today) | Status | Consumers | Assessment |
|---|---|---|---|---|---|---|---|
| H-1 | Nature/extent of human creative involvement | E1 (+E2 separately in CRC) | project | C1 (`authorship_statement` ≥150w); C3 in CRC | V1 | H01, Report, `CLAIM-COPY-001/002/003` dependency | Covered; §12.3 |
| H-2 | AI-generated proportion estimate | E1 | project | C1 (slider, defaults 80) | V1 | H01 | Covered; default value is itself an unasserted value |
| H-3 | Post-generation editing (occurred / software / description) | E1 | project | C1 | V1 | H01 | **Acquired, not surfaced** (§17.2) |
| H-4 | Scene-level tool + prompt-summary attribution | E1 | per_scene | C1 (optional) | V1 | H01, T01, D01 | **Acquired, not surfaced** (§17.2) |
| H-5 | **Corroborating artifact** (prompt log / project file / storyboard / brief) | E3 | project | C2 (`production_evidence_paths`) | V2 **only after C7** | H01/H02 — Manual v0.2 caps at *Partially Verified* without it | **Acquired, not reachable by the reviewer** (§17.3). This is the highest-materiality instance of the surfacing gap |
| H-6 | Copyright ownership claim + basis | E1 | project | C1 (within H-1) | V1 | H02 | Covered (§13.2) |
| H-7 | Fully-automated-content flag (zero human involvement) | E1 | project | inferred from H-2/H-1 | V1 | H02 — Manual:443 treats it as a distinct material finding | Weak gap — inference burden on the reviewer |
| H-8 | Evidence Custodian Declaration | E1 | project | C1 | V1 | §1 scope check, sign-off gate | Covered |

### Domain I — Third-Party IP

| # | Fact demand | Class | Gran | Chan (today) | Status | Consumers | Assessment |
|---|---|---|---|---|---|---|---|
| I-1 | Third-party assets present + per-item type/description/licence status | E1 | per_asset_item | C1 | V1 | I01, I02 | **Acquired, not surfaced** (§17.2) |
| I-2 | **Canonical asset-provider identity** | E1 | per_asset_provider | **none** | — | LK `provider_scope` (19 of 33 claims), I01, I02 | **Proven acquisition gap — largest by consumer count** (§11.4) |
| I-3 | Per-asset licence document | E3 | per_asset_item | C2 (`items[].file_path`) | V2 only after C7 | I01 | **Acquired, not reachable** (§17.3) |
| I-4 | Editorial designation of specific assets | **E3/E4** | per_asset_item | **evidence-only by governance** | V2 | `CLAIM-STOCK-*` ×5 | **Correctly evidence-only** (`DAR_001`). Never a question |
| I-5 | Separate authorization obtained | **E3** | per_asset_item | evidence-only | V2 | `CLAIM-STOCK-EDITORIAL-001`, Getty | **Correctly evidence-only** |
| I-6 | Release status of stock subjects | **E3** | per_asset_item | evidence-only | V2 | `CLAIM-STOCK-EDITORIAL-002` | **Correctly evidence-only** |
| I-7 | Rights & clearance engagement status | **E3** | per_asset_item | evidence-only | V2 | `CLAIM-STOCK-SHUTTERSTOCK-EDITORIAL-001` | **Correctly evidence-only** |
| I-8 | Recognizable third-party copyrighted content in the output | **E4** | project | C5 (§2 `copyrighted_artwork`) + C1 disclosure as input | V3 | I01 | Covered — model instance of E1-input + E4-determination |
| I-9 | Audio source type | E1 | project | C1 | V1 | I02, Report | Covered |
| I-10 | Audio licence artifact | E3 | project | C2 | V2 after C7 | I02, Report | Covered — the second reachable C7 path |
| I-11 | Music provider identity + licence tier + subscription-active-at-publication | E1/E3 | per_asset_provider | **none** | — | 9 MUSIC/Artlist claims | **Acquisition gap** (subsumed by I-2) |
| I-12 | Identifiable trademark/brand/logo elements | **E4** (+E1 input) | project | C5 (§2 ×4 fields) + C1 (3 checkboxes) | V3 | I03, No List | Covered as fact; **interpretive standard missing** (§14) |
| I-13 | Fair-use argument + supporting doc | E1 + E3 | project | C1 + C2 | V1 / V2 | No named control; Report per CertForm's own UI promise | **Structured-fact-model gap** — collected, promised in the Report, no control owns it, artifact not reachable |
| I-14 | Training-data composition | **E7/E8** | per_tool | none | — | I (residual risk) | **Correctly absent.** Manual: *"SI8 cannot independently audit training data"*; treated as a structural residual risk in every assessment |

### Domain L — Likeness & Performer Rights

| # | Fact demand | Class | Gran | Chan (today) | Status | Consumers | Assessment |
|---|---|---|---|---|---|---|---|
| L-1 | Real person present (self-report) | E1 | project | C1 (Path A ×4 checkboxes) | V1 | L01 | Covered |
| L-2 | Real person present (determination) | **E4** | per_person | C5 (§2 `real_likeness_suspected`, `synthetic_humans`) | V3 | L01, L02 | Covered — Manual's *"identifiable" threshold* is explicitly a reviewer visual judgment |
| L-3 | Synthetic performer distinctness | **E4** | per_person | C5/C6 | V3 | L02, `synthetic_performer_present_confirmed` (NY claim dependency) | Covered on the reviewer side; **no link from the reviewer fact to the LK dependency** (§17.4) |
| L-4 | Consent / release documentation | E3 | per_person | C2 (`likeness_release_path`) | V2 **only after C7** | L03, Report "Release on file" | **Acquired, not reachable** (§17.3). L03's own decision logic is unexecutable from the workbook |
| L-5 | Voice model provenance / consent | E3 | per_person | **none** | — | L03 (Manual lists *"Voice synthesis used; no information on voice model source"* → *Partially Verified*); already a logged Manual v0.2 candidate improvement | Known gap, already tracked in `SI8-Reviewer-Manual-v0.2-Candidate-Improvements.md` |
| L-6 | Advertiser / statutory duty-holder status | **E3/E4** | project | none | — | NY §396-b claim dependency | Correctly not askable — a legal-status characterisation |
| L-7 | Actual knowledge (statutory) | **E8** | project | none | — | NY §396-b dependency | **Correctly absent** — a statutory mental-state element; not SI8's to establish |
| L-8 | Expressive-work exemption applies | **E8** | project | none | — | NY §396-b dependency | **Correctly absent** — the claim's own Prohibited Conclusions forbid stating it |

### Domain T — Technical Provenance

| # | Fact demand | Class | Gran | Chan (today) | Status | Consumers | Assessment |
|---|---|---|---|---|---|---|---|
| T-1 | Generation-workflow description depth | E1 | project | C1 (H-1, H-3, H-4) | V1 | T01 | Covered |
| T-2 | Workflow artifacts (screenshots, session exports, timeline, prompt logs) | E3 | project | C2 (`production_evidence_paths`, 6 typed kinds) | V2 after C7 | T01, H-5 | **Acquired, not reachable** (§17.3) |
| T-3 | C2PA / Content Credentials presence | **E4 (technical inspection)** | project | **none** | — | T01, Report | **Correctly not submission-appropriate.** `reportProjection.ts:397-405` fails closed to "Unknown" rather than inferring. A *reviewer-tool* gap, not a questionnaire gap |
| T-4 | On-chain registration presence | **E4** | project | none | — | T01, Report | Same as T-3 |
| T-5 | Workflow coherence | **E5** | project | C6 | V3 | T01 | Correctly a reviewer judgment |

### Domain D — Documentation Integrity

| # | Fact demand | Class | Gran | Chan (today) | Status | Consumers | Assessment |
|---|---|---|---|---|---|---|---|
| D-1 | Date / version / receipt-date consistency | **E5** | project | C6 (derived from R-2, R-6, R-7) | V3 | D01 | **Correctly absent as a question** — circular if asked |
| D-2 | Retroactive-documentation indicators | **E5** | project | C6 | V3 | D02 | Correctly reviewer-only |

### Non-control consumers

| # | Fact demand | Class | Gran | Chan (today) | Status | Consumers | Assessment |
|---|---|---|---|---|---|---|---|
| X-1 | **G1** Distribution / output-use territory | E1 | project, cardinality-many | C1 (5-bucket enum, single-valued) | V1 | Report "Intended territory"; Manual's NY residual-risk heuristic; `geographic_relevance_scope` (0 claims opted in) | Coarse but adequate for its real consumers; **mis-piped into G2** (§11) |
| X-2 | **G2** Assessment jurisdiction scope | E5 recommended (E1/E2 today) | membership set | **none on CertForm**; C3 in CRC only | V1/V3 | LK `jurisdiction` applicability (4 claims); Manual Step 1 scope limitation | **Acquisition gap + category error** (§11) |
| X-3 | **G3** Applicable law | **E8** | — | — | — | — | **Correctly absent** — Manual §5 |
| X-4 | Intended commercial use | E1 | project | C1 (`primary_use` + brand-safety category lists) | V1 | Report, reviewer context, Manual Step 1 | Covered. Brand-safety lists are a v3 Showcase remnant no control consumes |
| X-5 | Live-campaign status, budget band, distribution channels | E1 | project | C1 (`campaign_context`) | V1 | — | **Acquired; zero consumers; not surfaced.** Either a demand exists and is undocumented, or the fields should be reconsidered |
| X-6 | Content title / runtime / media type | E1/E6 | project | C1 | V1 | Report, Assessment Registry (locked at sign-off) | Covered |
| X-7 | Production / filming location | — | — | none | — | **none found** | **Correctly absent** — re-swept; the extractor prompt explicitly forbids inferring territory from it |
| X-8 | Client HQ / entity jurisdiction | — | — | none | — | **none found** | **Correctly absent** |
| X-9 | Video accessibility | E4 | project | C5/§1 scope check | V3 | §1 gate, §2 | Covered |
| X-10 | Assessment outcome / confidence / findings / gaps | **E5** | — | C6 | V3 | Report, Registry, Public Assessment Record | **Correctly outputs, never inputs** |

---

## 17. Demanded vs. acquired: the five distinct gap classes

The task requires these be kept apart. They are different problems with different owners.

### 17.1 Facts currently demanded — summary

62 distinct fact demands inventoried across 16 controls and 10 non-control consumers. Of these: 8 are **correctly not facts at all** (E8 prohibited conclusions and E5 outputs: L-7, L-8, X-3, X-10, D-1, D-2, T-5, I-14). 6 are **correctly evidence-only** (I-4..I-7, T-3, T-4). The remainder are legitimately acquirable.

### 17.2 Acquisition gap — type A: acquired but never surfaced to the reviewer

**Proven by repo-wide grep.** These CertForm fields are collected, persisted, and rendered **only** on the creator's own dashboard (`app/dashboard/submissions/[id]/page.tsx`). No reviewer surface reads them:

`third_party_assets` (I-1) · `post_gen_editing` (H-3) · `scene_attribution` (H-4) · `ai_percentage` (H-2 — shown to creator only) · `production_evidence_paths` (H-5/T-2) · `fair_use_argument` (I-13) · `campaign_context` (X-5) · `client_name` (A-3) · `content_integrity_accepted` · `scope_acknowledged`

The reviewer's Submission panel renders exactly: title, creator, intended use, territory, logline, tools (+plan +dates), audio source, likeness checkboxes, IP checkboxes, authorship statement. The "View full submission" link goes to `/admin/submissions/[id]`, which renders a *smaller* set still.

**The most consequential single instance: `third_party_assets` is invisible to the reviewer.** Domain I01's workbook field is literally `Submitter's IP disclosure: [Summary of what submitter declared]` — and the reviewer cannot see what was declared.

### 17.3 Acquisition gap — type B: evidence deposited but unreachable

`review/page.tsx:50-88` builds the reviewer's evidence list from **exactly two** sources: `tools_used[].receipt_path` and `audio_disclosure.license_path`. Signed URLs are generated for those and nothing else.

Unreachable from the reviewer workbook: `likeness_release_path` (L-4) · `ip_license_path` (I-3/§14.2) · `fair_use_doc_path` (I-13) · `third_party_assets.items[].file_path` (I-3) · `production_evidence_paths.items[]` (H-5/T-2).

Two consequences, both proven:

1. **Domain L03 cannot be executed as specified.** Its decision table says *"Real person appears; release documentation confirmed → **Verified**."* The release is not accessible.
2. **The Assessment Report asserts two presence facts from files nobody reviewed.** `reportProjection.ts:381-387` sets `Release on file: Yes` from `likeness_release_path` being non-empty; `:352-358` sets `License on file: Yes` from `ip_license_path`. The labels are literally accurate ("on file") and the Report's own limitation paragraph is present — so this is not a misstatement. But it is a V1 presence fact rendered in the **Supporting Evidence Record** beside V2/V3 content, for artifacts the reviewer had no in-product way to open.

**This is the highest-materiality finding in CAH-4I.2 and is independent of every architectural question in it.**

### 17.4 Acquisition gap — type C: fact classes with no acquisition channel at all

R-4 (tool account status) · R-5 (access surface) · R-8/R-9 (custom model + training-data rights) · R-11 (work-for-hire) · **I-2 (canonical asset-provider identity — largest by consumer count)** · I-11 (music provider/tier/subscription) · L-5 (voice model provenance) · **X-2 (G2 assessment jurisdiction scope)** · H-7 (fully-automated flag, weak).

### 17.5 LK knowledge gaps (distinct from acquisition gaps)

- **Trademark: 0 governed claims** under an existing, sign-off-gated control (§14).
- **`geographic_relevance_scope`: 0 claims opted in.** The Generic Distribution/Output-Use Territory Contract (2026-09-11) shipped complete infrastructure — extraction, supersession, discovery trigger, inverted-polarity scope field — with no governed consumer. Not a defect; a noted state.
- **`distribution_territory_mentions` is not projected** by `buildCrcProjectContext`. A reviewer viewing Linked CRC Context sees `assessment_jurisdiction` assertions but never the customer's stated distribution territories. Projection gap, newly found.
- Three `ApplicabilityFact` candidates (`client_supplied_asset`, `creator_relationship`, `distribution_context`) remain formally rejected for want of a reliable structured fact — an LK *capability* ceiling that the fact-demand registry would make visible rather than leave implicit in a type comment.

### 17.6 Evidence gaps and one integrity finding

- Every E3 demand above depends on C7 reachability; §17.3 is therefore also an evidence gap.
- **Integrity finding (new):** CertForm's plan-type option is labelled **"Free (not eligible for commercial use)"** — a tool-agnostic assertion of a per-tool legal conclusion, embedded in the data-entry UI. SI8's own primary-source verification (`MATRIX-LEARNINGS.md`) found this **false for Runway** (*"commercial rights are granted on all tiers; the watermark is cosmetic, not a legal restriction"*) and **true for Pika, Midjourney, and ElevenLabs**. This contradicts Principle **P2** (technology neutrality) and mirrors exactly the prohibition `selector-askability.ts` states for governance metadata: *"this registry must never carry a mapping like 'Kling Pro → paid' or any other provider-specific plan/entitlement knowledge."* The same prohibition should bind questionnaire copy. **Reported, not fixed.**

### 17.7 Optional product expansions (not gaps)

Copyright registration status / application status as E1 context + E3 artifact (§13.4) · external registry verification (would require changing the Report's Standard Assurance Language, D-5) · C2PA/on-chain *detection* as a reviewer tool (T-3/T-4 — a technical capability, not a question) · per-asset editorial-designation structure (`none/some/all/mixed/unknown`) if an evidence-side need ever arises (`DAR_001` already designed it and declined to build it).

---

## 18. Recommended target architecture

### 18.1 Three layers, in dependency order

**Layer 1 — Fact-Demand Registry (documentation first, code later or never).**
One enumeration of `FactDemand` entries (§4.1). §16 is its seed content. Owned jointly by Commercial Assurance methodology (which controls demand what) and Living Knowledge governance (which claims demand what). It **cross-references** the four existing vocabularies; it never absorbs them. Its first and possibly only implementation is a markdown table — the same "hand-synced, no live parser" discipline `topic-claims-fixture.ts` already uses for governed claims, and for the same reason.

**Layer 2 — Channel askability governance, symmetric and fail-closed.**
Generalize the rule `dependency-askability.ts` and `selector-askability.ts` already implement for CRC to C1 and C2. A new CertForm question requires a recorded decision in the shape `DAR_001` already established (classify **askable / evidence-only / auto-satisfied / not-askable**, with a primary-source basis and a named approver). Absence remains non-askable. **This is the change §15 shows the contract depends on.** It costs a process rule and a governance file; it costs no code.

**Layer 3 — Per-channel fact instances with shared value spaces.**
Facts stay where they are. What becomes shared is (a) the `fact_key` each answers and (b) the canonical value space each is compared in. `resolveSubmissionToolIds` already demonstrates the pattern end to end: submission data, canonicalized through a CRC-owned primitive, used for LK comparison, with the raw value never rewritten and unresolved values dropped rather than guessed.

### 18.2 What this architecture explicitly does not do

- No canonical project-fact table. No merged fact record. No precedence rule between channels.
- No CRC→CertForm pre-fill. No automatic promotion of any CRC or LK content into workbook or assessment state (ADR-001 forbids it permanently).
- No new applicability fact, dependency string, claim, or control.
- No bespoke orchestration for copyright, trademark, stock, music, or likeness. Every one of those classes is expressible as `FactDemand` entries plus existing dependency/applicability/scope mechanisms (§14.5 is the worked proof).

### 18.3 The answers the contract yields

| Question | Answer |
|---|---|
| What facts does Commercial Assurance need? | §16 — 62 demands across 16 controls + 10 non-control consumers |
| Why each class? | §8 — each demand traces to a named consumer with a named failure mode |
| Who may establish them? | §5 — E1–E8, on the axis of *what would have to be wrong* |
| Which can users safely self-report? | E1-permitted demands only, and only where a recorded governance decision says so (§18.2 Layer 2). Today no such record exists for any CertForm question |
| Which may CRC ask? | Exactly one: `human_contribution_description`. Plus one selector fact: `tool_account_status`. Everything else fails closed |
| Which require evidence or reviewer establishment? | All E3/E4 demands — the `DAR_001` four, C2PA/on-chain, editorial designation, "is this mark infringing", "is this person recognizable", direct-review content facts |
| Which can be reused across CRC and CA? | **None as instances.** Demands and value spaces are shared; instances are not (§12.5) |
| Which submission questions are unnecessary / missing / duplicated / too coarse? | Unnecessary: X-5 (no consumer), the v3 brand-safety category lists. Missing: §17.4. Duplicated: none genuinely (§12.3). Too coarse: R-3 (tool-agnostic plan enum), X-1 (5-bucket territory, only if it is ever asked to serve G2 — it should not be) |
| Does copyright registration belong? | **No** (§13.4) |
| What trademark work is required? | LK onboarding only — knowledge, not facts or plumbing (§14.6) |
| How should geography be represented? | G1 and G2 as separate demands, never inferred from one another; G2 probably reviewer-established (§11.5) |
| What do future LK domains plug into? | `unresolved_project_dependencies` + the four-class treatment decision + `ApplicabilityFact` where a reliable structured fact exists — all already generic. The registry adds only the missing cross-reference (§14.5) |

---

## 19. Migration implications (no implementation)

**Adopting the contract requires no schema change.** Layers 1 and 2 are documentation and process.

Were later milestones authorized, the implied changes — each separately reviewable, none authorized here — would be:

| Change | Shape | Precedent |
|---|---|---|
| Surface the four unreachable evidence channels to the reviewer | Extend `review/page.tsx`'s `rawPaths` collection; no schema change | The existing two-path collector |
| Surface the ten unsurfaced submission fields | Additive rendering in `WorkbookClient`'s Submission tab; no schema change | — |
| Canonical asset-provider identity on third-party items (I-2) | Additive field on the existing per-item record + `ASSET_PROVIDER_IDS` reuse | `resolveSubmissionToolIds` |
| Pass `toolMentions` into reviewer applicability facts (R-3) | Map `tools_used[]` → `ToolMention`-shaped facts in `buildReviewerLkContext` | The tool-id path in the same file |
| Represent G2 separately (X-2) | **Not** a `submissions` column if E5 is chosen — a Workbook §1 field, so `workbook_version` bumps, not a migration | `workbook-schema.ts` `workbook_version: '0.2'` |
| Correction/supersession for E1 facts (§10) | Versioned append-only + downstream invalidation | The report-binding lifecycle's stale-report invalidation (§3o); `assessment-jurisdiction-scope.ts`'s legacy-scalar bridge is the precedent for migrating a representation without rewriting history |

**Ordering constraint:** value-space work (canonical provider identity) must precede consumption work (provider-scoped LK narrowing). Wiring consumption first would produce a permanently-empty channel that looks wired.

---

## 20. Open PM / governance decisions

| # | Decision | Why it cannot be resolved here |
|---|---|---|
| **D-1** | Adopt a fail-closed askability governance rule for CertForm questions (C1/C2), in the `DAR_001` shape? | A process/authority decision. §15 shows the contract protects nothing without it |
| **D-2** | Adopt §16 as the Commercial Assurance Fact-Demand Contract v0.1, or revise it first? | Methodology ownership sits with the Reviewer Manual's governance, not with engineering |
| **D-3** | Is **G2** (assessment jurisdiction scope) customer-declared (E1) or reviewer-established (E5)? | Evidence leans E5 (§11.5) but this is a product/methodology choice with pricing and expectation consequences |
| **D-4** | May a customer ever be shown their own prior CRC statements inside CertForm for explicit reconfirmation? | Blocked today on unauthenticated CRC identity; becomes a genuine product-risk decision only if CRC identity changes |
| **D-5** | Does SI8 ever want to perform E7 external verification (registry lookups)? | Would require changing the Report's Standard Assurance Language — positioning, not architecture |
| **D-6** | Should `campaign_context` (X-5) acquire a consumer, or be retired? | Product decision; it is currently asked of every $499 customer and read by nothing |
| **D-7** | Should the reviewer be shown which governed claims were **scope-excluded** (provider/tool) rather than silently dropped? | Changes a deliberate, PM-instructed no-diagnostic design (§8). Safe in CRC; arguably wrong for a reviewer |
| **D-8** | Correct the "Free (not eligible for commercial use)" option label (§17.6)? | Small, but it is a customer-facing legal characterisation contradicted by SI8's own governed research; wording is a PM call |

---

## 21. Smallest next milestone

**Recommended: CAH-4I.3 — Reviewer Evidence Reachability.**

Make the four unreachable CertForm evidence-upload channels (`likeness_release_path`, `ip_license_path`, `fair_use_doc_path`, `third_party_assets.items[].file_path`, `production_evidence_paths.items[]`) reachable from the reviewer workbook's Evidence panel, using the existing `createSignedUrls` collector already in `review/page.tsx`.

Why this is the right smallest next step:
- **Highest materiality of anything found.** It makes Domain L03's own specified decision logic executable, and makes Domain H's v0.2 corroboration requirement satisfiable from uploaded artifacts.
- **Architecture-independent.** It does not depend on D-1…D-8, the registry, or the geography decision. It is correct under every option.
- **Smallest possible surface.** No schema, no migration, no new question, no LK change, no CRC change, no applicability change. It extends one existing array in one server component.
- **Tests the contract cheaply.** It is a pure C2→C7 reachability fix — the first thing the contract says must be true before any E3 demand can produce V2 evidence.

**Alternative if PM prefers governance-first: CAH-4I.3G — Fact-Demand Contract v0.1 adoption + CertForm askability governance record** (D-1 + D-2). Zero code. It is the prerequisite for any future CertForm question change and closes the §15 adversarial failure.

**Explicitly not recommended as next:** trademark LK onboarding (§14.6 — the fact layer is ready, the sequencing is not); any geography code change (blocked on D-3); any generic fact-model implementation (Layer 3 is the last step, not the first).

---

## 22. Implementation gate

**Nothing in this document authorizes:** adding, removing, or rewording any CertForm or CRC question · building any part of the Fact-Demand Registry in code · the geography separation · surfacing any field or evidence path · onboarding trademark or any LK domain · adding a `FactDemand`, `ApplicabilityFact`, dependency string, control, or workbook field · changing the Report's Standard Assurance Language · any schema, migration, API, route, component, prompt, retrieval, Bounded Interpretation, composition, applicability, or audit change · any CRC↔Commercial Assurance fact transfer of any kind · resuming Consultative Composition.

Each requires its own explicit PM/governance authorization referencing this document.

---

## Validation performed

- Every fact demand in §16 traced to a named consumer in source (control id, LK claim/dependency, report projection line, or Manual instruction) before being listed. Demands with no consumer are recorded as **correctly absent** (X-3, X-7, X-8, L-7, L-8, I-14, T-3, T-4, D-1, D-2) rather than defaulted to "gap".
- Absence from Living Knowledge is never used as evidence that a fact is out of scope — §14 reaches the opposite conclusion for trademark, deriving the demand from the Workbook Schema and Manual independently of LK.
- No fact classified E3 or E4 is proposed anywhere for self-attestation. The `DAR_001` four remain evidence-only; §15 is an explicit adversarial re-check and reports the architecture's own current failure rather than asserting a pass.
- No legal conclusion is asserted. Every reference to applicability, jurisdiction, copyrightability, infringement, or clearance either quotes SI8's existing disclaimers or is explicitly flagged **E8 — not establishable**.
- Three CAH-4I.1 findings are corrected with source citations rather than silently restated (§2.3 items 4, 5, and the §11.2 root-cause reclassification).
- Doc-vs-code drift recorded in §2.3; code treated as authoritative throughout.
