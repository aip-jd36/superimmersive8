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

---

## 23. CAH-4I.2 REVIEW / PM ARCHITECTURE GATE (2026-09-12)

**Status:** Independent review of this document, performed against source (not against this document's own citations). Format below is **ORIGINAL CLAIM vs REVIEW FINDING** throughout. This section does not rewrite §0–§22; it gates which parts convert to adopted architecture.

**Reviewer's method note:** every claim below marked "independently re-verified" was checked directly against source in this review pass (grep/read on the actual files), not accepted on the strength of §0–§22's own citations. Claims marked "not independently re-checked this pass" were verified by the predecessor CAH-4I.1 review (a separate, earlier independent pass) and are carried forward without re-verification here for effort reasons; they are flagged, not silently trusted.

### 23.1 Artifact quality assessment

This is unusually well-grounded work for a design document: every load-bearing claim cites a `file:line` or a verbatim quote, doc-vs-code drift is recorded rather than papered over (§2.3), and the document twice corrects its own predecessor (CAH-4I.1) with cited evidence rather than silently restating it. The independent re-derivation performed for this review confirmed every claim it attempted to check. That is a strong result but it is not a reason to skip governance — see §23.3 and §23.10.

### 23.2 Independently re-verified this pass (highest-stakes claims)

| # | Claim | Source checked | Result |
|---|---|---|---|
| 1 | `review/page.tsx` builds the reviewer evidence list from exactly `tools_used[].receipt_path` and `audio_disclosure.license_path`, nothing else | `grep -n` on the file's `rawPaths` construction | **CONFIRMED EXACTLY.** Two sources, no more. |
| 2 | `likeness_release_path`, `ip_license_path`, `fair_use_doc_path`, `third_party_assets`, `production_evidence_paths` never appear anywhere under `app/admin/` | repo-wide grep of the admin tree | **CONFIRMED — zero hits.** All five are written at submission time (`certify/page.tsx`) and rendered on the creator's own dashboard (`app/dashboard/submissions/[id]/page.tsx`), never on any reviewer surface. |
| 3 | `reportProjection.ts` sets "Release on file" / "License on file" from path non-emptiness | grep on `reportProjection.ts` | **CONFIRMED** — lines ~352, ~364, ~381, ~393 set exactly these labels from `s(submission.ip_license_path)` / `s(submission.likeness_release_path)` non-emptiness. |
| 4 | CertForm's route has no askability/governance registry equivalent to CRC's | grep for askability/governance terms under `app/certify/` | **CONFIRMED — zero hits.** No registry, no import, no reference. |
| 5 | `dependency-askability.ts` fail-closed default with exactly one `askable_in_crc` entry | read of the file | **CONFIRMED** — `DEPENDENCY_TREATMENTS` has exactly one entry (`human_contribution_description`); header states "Absence defaults to [non-askable]." |
| 6 | `crc-assurance-handoff/types.ts` unauthenticated-identity language, quoted verbatim in §5/§12 | read of the file | **CONFIRMED near-verbatim** — "CRC has no authenticated identity and `crc_sessions.email` is unverified... a PERMISSION fact only" is genuine source text, not a paraphrase dressed as a quote. |
| 7 | 37 `CLAIM-` headers in `GOVERNED-CLAIMS.md`; zero are trademark-domain claims | `grep -c "^### CLAIM-"` + trademark grep | **CONFIRMED** — 37 headers exactly; the only 3 "trademark" mentions are incidental language inside stock-provider claims, not a dedicated claim. |
| 8 | Control I03 exists, machine-required at sign-off, with a `trademark_elements` field | `signoff.ts`, `workbook-schema.ts` | **CONFIRMED.** |

**New finding produced by this review, not present in §0–§22:** `e9e40b1` (the other session's accidental checkpoint on this branch) and `origin/main`'s own `23f6b82` are **tree-identical for all 13 CR-validation files** — `git diff 23f6b82 e9e40b1 --stat` shows zero difference outside our own two CAH-4I docs. This matters directly for §23.13 (branch cleanup): `e9e40b1` is not unique content requiring preservation via cherry-pick; it is a duplicate of content `main` already has under a different commit. See §23.13.

**Not independently re-checked this pass** (verified by the CAH-4I.1 review, an earlier, separate independent pass, and not re-derived here): the R03 custom-model acquisition gap (`AddToolModal` field sweep); the full 62-row §16 inventory beyond the rows implicated in the claims above; the exact wording of `jurisdiction-clarification.ts`'s question text and `JURISDICTION_VALUE_ALIASES`' seven US aliases (the core `resolveSubmissionJurisdiction` code-path claim itself *was* independently verified, in the CAH-4I.1 review pass, reading the actual function body).

### 23.3 Phase 3 — Shared fact-demand vs. fact-instance: **ACCEPT**

Re-derived from first principles rather than checked against the document's own framing: the strongest argument for a shared canonical instance is deduplication (avoid asking the same thing twice, avoid divergence). The strongest argument against is that "one fact instance" silently collapses onto "one authority source" the moment any consumer has to pick which instance to trust — and no precedence rule between an authenticated declaration, an unauthenticated conversational aside, and an inspected document can be written that doesn't either discard the stronger evidence or promote the weaker evidence to a status it hasn't earned. That is not an implementation inconvenience; it is the actual product being sold (independent judgment, P3) collapsing into whichever channel happened to write last. The document's own worked counter-example (`human_contribution_description` vs. `authorship_statement`, §12.3) is a real, checkable instance of two genuinely different questions at different granularity for different purposes — not a rhetorical device. **The "share demand, never the instance" resolution is sound, not merely internally consistent**, and it is correctly qualified (not absolute) — it permits a deliberate, provenance-preserving reference, which is the right escape hatch and matches ADR-001's own stated allowance.

### 23.4 Phase 4 — CRC → CertForm reuse/prefill: **ACCEPT WITH QUALIFICATION**

The substantive architecture conclusion holds and is correctly reasoned: identity, not caution, is the blocker (§12.2's "authority laundering" framing is the right frame — importing an E2 value into an E1 slot and asking the submitter to warrant it is a real integrity problem, not a hypothetical one). But **the qualification matters and should be stated plainly rather than left implicit**: the document does *not* actually reject all reuse — it explicitly leaves "pre-fill with explicit user reconfirmation" (option B) open, blocked only by a *product-risk* decision (D-4), not an architectural one. The framing this milestone's own kickoff message used ("CAH-4I.2 reportedly rejects CRC → CertForm prefill") **overstates the source document's actual position**. This review corrects that framing: CAH-4I.2 rejects *silent* prefill and rejects treating a shared record as canonical; it does not foreclose reconfirmed reuse. That is a materially different, and more useful, conclusion for a PM reading only a one-line summary.

### 23.5 Phase 5 — CertForm evidence-only governance gap: **Real. Severity: HIGH (not CRITICAL, not overstated).**

Independently confirmed as a genuine structural absence (§23.2 items 4–5). Classified HIGH rather than CRITICAL because it is **latent, not live** — this review found no current instance of an evidence-only fact actually being self-attested in CertForm today (`ip_no_trademarked_ip` is an adjacent, separately-flagged concern — a legal characterisation asked of a lay submitter, not one of the four `DAR_001`-classified evidence-only stock facts). The gap is that nothing would catch it if someone added one tomorrow, not that one exists. That distinction matters for prioritization: it is a process/governance fix (write the rule, require the same review shape `DAR_001` used), not an emergency patch.

### 23.6 Phase 6 — Reviewer evidence reachability: **Real, proven, CRITICAL.**

The single strongest finding in the document and the one this review invested the most direct verification in (§23.2 items 1–3). Correctly disaggregated per the task's own instruction: this is a **missing-UI-reachability** problem, not missing data (all five fields are persisted, confirmed by direct file read) and not a documentation mismatch (the Report's limitation paragraph already exists, so "License on file: Yes" is not a misstatement — it is accurate and unhelpful). The proven consequence — Domain L03's own decision table cannot be executed as written because the release its "Verified" branch requires is not visible to the person making that judgment — is an active assessment-integrity gap affecting every SI8 Certified submission with likeness content today, not a theoretical one. **This finding should be treated as the most urgent single item in the entire review**, independent of any of the architectural questions.

### 23.7 Phase 7 — Geography/jurisdiction: **ACCEPT the diagnosis; UNRESOLVED (correctly) on the G2 authority recommendation.**

The G1/distribution-territory vs. G2/assessment-jurisdiction-scope vs. G3/applicable-law three-way split is a genuine improvement over CAH-4I.1's classification (which the document itself, correctly, records as a correction rather than silently restating — §2.3 item 4). The root-cause claim (`resolveSubmissionJurisdiction` reads a G1 value and returns a G2-typed object) was independently verified against the actual function body in the predecessor review pass and holds. The recommendation that G2 should be reviewer-established (E5) rather than customer-declared (E1) is well-argued from the Manual's own text (scope is already a reviewer act) but is explicitly and correctly left as an open decision (D-3) rather than asserted as settled — this review agrees it should stay open; the case for E5 is stronger than for E1, but "stronger" is not "proven," and a pricing/expectation-setting decision legitimately belongs to PM, not to this document.

### 23.8 Phase 8 — Copyright registration: **ACCEPT.**

The four-way decomposition (registration status / application status / ownership claim / independent verification) is the correct move and matches the task's own instruction not to conflate them. "Ownership claim" being already covered by H02 and the other three being out of scope (with (a)/(b) reclassifiable as optional expansion, (d) blocked by SI8's own delivered disclaimer language) is a sound, appropriately conservative conclusion. Nothing in this review's independent checks contradicts it.

### 23.9 Phase 9 — Trademark: **ACCEPT.**

Independently confirmed: I03 is a real, sign-off-gated control (not a documentation aspiration), and zero governed trademark claims exist. The classification — LK knowledge gap sitting underneath an already-designed control, not a fact-demand gap, not a submission gap, not a reviewer-workflow gap — is exactly the right granularity of classification and correctly resists the temptation to treat "no trademark LK" as evidence trademark is out of scope (which would have inverted the task's own explicit caution).

### 23.10 Phase 10 — Custom/fine-tuned model (R03): **Carried forward from CAH-4I.1, not re-derived this pass.**

This review did not re-grep `AddToolModal` independently; it relies on CAH-4I.1's own prior independent verification (a separate review pass) that no such field exists. Given that CAH-4I.1's other checkable claims held up perfectly under this review's spot-checks, there is no specific reason to doubt this one, but it is flagged here rather than silently affirmed, per this review's own stated method.

### 23.11 Phase 11 — Authority/provenance taxonomy: **ACCEPT — this is the document's strongest structural contribution.**

Tested directly against the task's own adequacy criterion (fact authority ≠ evidence status ≠ provenance ≠ workflow): the document keeps these as four genuinely separate, independently-enumerated dimensions (§5 establishment class, §6 acquisition channel, §7 evidence status, §8 consumer/workflow), and it correctly rejects the task's own proposed taxonomy where "CRC-askable" was offered as a peer establishment class — that would have made channel and authority non-orthogonal, and the document's fix (askability is a permission on a fact×channel pair, not a class) is the right correction, not a rationalization. This is the one place in the review where the document improves on the task's own framing rather than merely satisfying it.

### 23.12 Phase 12 — Correction/supersession: **ACCEPT.**

The per-class policy (E1 append-only-versioned-with-invalidation reusing the report-binding lifecycle's existing stale-report pattern; E2 left as CRC's own unmodified mechanism; E3 immutable-plus-new-deposit; E4/E5 already handled by workbook revisioning) correctly avoids the trap the task warned against — forcing CRC's turn-scoped supersede-and-mark onto a point-in-time attested submission, which is a different kind of object with different stakes. No objection.

### 23.13 Phase 15 — Branch topology and cleanup recommendation

Confirmed topology: `cah-4i2-fact-demand-contract` = `358f2bf` (this review's parent commit) → `e9e40b1` (other session's checkpoint, accidentally here) → `b863738` (CAH-4I.1) → `173ed53` → `92ef003` (= `origin/main`'s ancestor at the time). `origin/main` is currently at `23f6b82`, one commit ahead of that same ancestor, with **tree-identical content to `e9e40b1`** (confirmed this review pass, §23.2).

**Recommended cleanup, once separately authorized (not executed in this review):** `git rebase origin/main` on this branch. Because `e9e40b1`'s patch is content-identical to what `origin/main` already carries via `23f6b82`, a standard rebase should let git recognize it as an empty/already-upstream patch and drop it automatically, replaying only `b863738` and `358f2bf` (and this review's own commit) cleanly onto current `main`. **No cherry-pick of `e9e40b1` onto `main` is needed or recommended** — it would create a duplicate, not preserve anything unique. Verify with `git range-diff` before trusting the rebase output, and re-confirm working-tree cleanliness immediately after, per this repo's own established `git range-diff` + rebase discipline (seen elsewhere in this codebase's CAH-4G integration history).

### 23.14 Ranked findings (this review's own ranking, not a restatement of §16/§17)

| Finding | Proven? | Severity | Assessment-integrity impact | Scope | Smallest next action |
|---|---|---|---|---|---|
| Reviewer evidence unreachable (5 upload channels) | Yes — independently confirmed | **CRITICAL** | Active — Domain L03 unexecutable as specified, today, on live submissions | Narrow, additive UI fix | Extend `rawPaths` in `review/page.tsx` (no schema change) |
| CertForm has no askability governance (C1/C2) | Yes — independently confirmed | HIGH | Latent — no live violation found, but no mechanism would catch one | Process + one governance doc | Write the `DAR_001`-shaped rule; no code |
| Geography G1/G2 category error | Yes — independently confirmed (this + predecessor pass) | HIGH | Currently degrades reviewer-LK applicability silently (claims surface as `unresolved`, not wrongly `met` — so not a false-positive risk, but a dead-code-path risk) | Requires a PM decision (D-3) before any fix | Resolve D-3 first; do not canonicalize G1→G2 as a stopgap |
| Trademark LK gap under I03 | Yes — independently confirmed | MEDIUM | An existing control operates without a differentiated legal standard | LK onboarding (deferred, correctly) | None this milestone |
| Copyright registration absent | Yes | LOW (by design) | None — nothing consumes it | Product-scope decision only | None unless a driver (e.g. E&O) appears |
| Provider-scope blindness (~58% of LK invisible to reviewers, no diagnostic) | Reported in §11.4, not independently re-verified this pass | Reported as HIGH by the source document | Would be a significant reviewer-visibility gap if the claim count holds | Needs its own verification pass before acting | Independently verify the 19/33 count before treating as settled |

### 23.15 Roadmap review: **ACCEPT the document's own recommendation, with one addition.**

The proposed smallest-next-milestone (CAH-4I.3 — Reviewer Evidence Reachability) is independently justified by this review's own verification, not merely by internal consistency with the rest of the document: it is the only finding in the whole set that is (a) fully proven against source, (b) currently causing a live control to be unexecutable as specified, and (c) fixable with a genuinely small, schema-free change. It should go first. The alternative "governance-first" framing (CAH-4I.3G) is not wrong, but it is process work with no live-defect urgency behind it — this review recommends sequencing evidence reachability first and governance adoption second, rather than treating them as a choice between equals. **One addition this review makes:** before either milestone starts, resolve the branch-topology question (§23.13) so the eventual PR for CAH-4I.3 is not built on top of an accidental cross-session commit.

### 23.16 GO / HOLD / NO-GO (this review's own recommendation)

- **GO** — adopt §16 as Commercial Assurance Fact-Demand Contract v0.1 (subject to D-1/D-2), and proceed with CAH-4I.3 (Reviewer Evidence Reachability) as the next milestone. Both are independently justified by this review's own verification, not merely by the source document's internal consistency.
- **GO, WITH THE FRAMING CORRECTION IN §23.4** — the CRC→CertForm reuse conclusion is sound but should not be summarized as a flat "rejects prefill"; option B (reconfirmed prefill) remains open pending D-4.
- **HOLD** — the G2-as-reviewer-established (E5) recommendation (§23.7) and the provider-scope-blindness severity claim (§23.14 last row) until each gets its own targeted verification or PM decision; neither should convert to architecture on this document's citation alone.
- **NO-GO** — no change to this review's own conclusions on trademark, copyright registration, or the shared-fact-instance rejection; all three held up under independent challenge.

**No runtime, schema, API, UI, CRC, LK, or Commercial Assurance control change was made in the course of this review.** All verification was read-only (`grep`, `git show`, `git diff`, file reads); no source file was edited.

---

## 24. CAH-4I.3 — Reviewer Evidence Reachability — IMPLEMENTED (2026-09-12)

**Status: implemented and merged.** This closes the highest-materiality finding from §17.3/§23.6: five evidence-upload channels were persisted at submission time, rendered on the creator's own dashboard, and reachable from **zero** reviewer surfaces.

**Proven defect (re-confirmed against source before implementation, not assumed from citation):** `review/page.tsx`'s evidence collection built its `rawPaths` list from exactly two sources (`tools_used[].receipt_path`, `audio_disclosure.license_path`). A repo-wide grep of the entire `app/admin/` tree confirmed zero references to `likeness_release_path`, `ip_license_path`, `fair_use_doc_path`, `third_party_assets`, or `production_evidence_paths` anywhere outside the creator's own dashboard.

**Generic architecture already existed; only its population was incomplete.** The reviewer workbook already has a persistent, always-reachable "Evidence" sidebar tab (`WorkbookClient.tsx`, `rightTab === 'evidence'`) rendering a flat `{name, url}[]` list — i.e., the "one generic submission evidence inventory visible throughout review" pattern was already built. Signed-URL generation (`supabaseAdmin.storage.from('submission-files').createSignedUrls(...)`) is already fully generic and path-agnostic — it does not care what kind of evidence a path represents. **No new security model, storage pattern, or UI surface was needed** — the defect was entirely in the population step (`rawPaths` construction), which wired 2 of 7 known channels.

**Selected architecture:** extract the `rawPaths` collection into a small, pure, unit-tested function — `collectSubmissionEvidencePaths()` in `lib/reviewer-evidence/collect-evidence-paths.ts` — rather than leave it inlined and untestable in the server component. This follows the exact precedent already set by `resolveSubmissionToolIds`/`resolveSubmissionJurisdiction` in `lib/reviewer-lk/submission-facts.ts` (pure function, `parseJsonMaybe` helper, no side effects), kept in its own module rather than added to `submission-facts.ts` because that module's own header scopes it specifically to LK-retrieval narrowing — a different concern from evidence surfacing. `review/page.tsx` now calls this function instead of inlining the logic; behavior for the two pre-existing channels is unchanged (proven by the regression-guard tests in §24 below), and five more channels are now collected the same way.

**Rejected alternative:** adding four bespoke, differently-shaped rendering blocks (one per evidence type) directly in `WorkbookClient.tsx`. Rejected because it would duplicate the existing generic list-and-sign pattern per domain — exactly the "domain-specific hard-coded patch" this milestone's own instructions ruled out in favor of a generic mechanism.

**Fail-closed behavior preserved, explicitly checked:** the new function's output is exactly `{label, path}` — no status field, no verification flag, no control identifier. Presence in the list means only "a file was uploaded," never "sufficient" or "Verified." Confirmed by source inspection that no code path reads `evidenceFiles.length` (or anything derived from it) to set any workbook control judgment — every `'Verified'` in the review tree is a reviewer-selected dropdown value, never a file-presence inference. This is also enforced by a dedicated test (`__tests__/reviewer-evidence/collect-evidence-paths.test.ts`, "assessment-integrity shape guarantee" — asserts the returned object has exactly the keys `label` and `path`, nothing else).

**Provenance:** each entry's `label` names the evidence type (and, for array channels, a 1-based index plus the submitter's own type/title text) so a reviewer can tell what an item is without opening it; this matches the existing convention (`"Runway receipt"`, `"Audio license"`) rather than inventing a new tagging scheme. Explicitly **not** added: a control-code tag (e.g., "L03") on each label — the existing two channels never carried one either, and adding one now would be a labeling-convention change beyond this milestone's reachability scope (recorded as a possible future enhancement, §24 Remaining risks below, not implemented here).

**Security/access:** no change to the authorization boundary. The whole page remains gated behind `requireAdmin()` before any of this code runs; the newly-collected paths were already present in the same `select('*')` row already being read with `supabaseAdmin` (service-role) — no new read path, no new grant, no widened exposure. Signed URLs remain 1-hour-expiring and are generated server-side only, exactly as for the two pre-existing channels.

**Runtime files changed:**
- New: `lib/reviewer-evidence/collect-evidence-paths.ts` (pure function + types).
- New: `__tests__/reviewer-evidence/collect-evidence-paths.test.ts` (12 tests).
- Modified: `app/admin/submissions/[id]/review/page.tsx` — inlined `rawPaths` construction (~65 lines) replaced with a single call to `collectSubmissionEvidencePaths(submission)`.
- No schema/migration, no new questionnaire field, no new control, no evidence reclassification, no change to control-outcome logic, no change to `WorkbookClient.tsx`'s rendering (the existing evidence tab renders the longer list with zero changes to it).

**Tests:** 12 new tests — absent input, malformed JSON (never throws), empty-string paths ignored, the two pre-existing channels as an explicit regression guard, each of the five newly-reachable channels individually, a full seven-channel submission together, and the assessment-integrity shape guarantee. All 12 pass.

**Full-suite regression check:** ran the complete Jest suite twice — once with CAH-4I.3's changes stashed (clean `eea7a9d` baseline) and once with them applied. **Identical result both times: 77 pre-existing failures / 20 pre-existing failing suites**, all in unrelated CRC-engine/Bounded-Interpretation tests untouched by this milestone. **Zero new failures.** `tsc --noEmit` clean. `next build`: webpack compilation and type-checking both succeeded ("Compiled successfully"); the build could not complete the page-data-collection step due to a missing `SUPABASE_URL` environment variable in this sandbox, affecting unrelated API routes (`/api/admin/catalog/...`, `/api/admin/submissions/.../generate-report`) — a pre-existing environment limitation, not a defect introduced here.

**UAT contract (not executed — design/spec only, per this milestone's own restriction against production UAT without separate authorization):**
1. Synthetic submission with likeness content + a talent-release upload → reviewer opens the workbook → Evidence tab shows "Talent release" → reviewer can open it → Domain L03's judgment field is still a manual reviewer selection, unaffected by the file's presence.
2. Synthetic submission with a third-party asset licence upload → Evidence tab shows "Third-party asset license #1: <type>" → openable.
3. Synthetic submission with no evidence uploads at all → Evidence tab correctly shows "No evidence files uploaded." (pre-existing empty-state copy, unchanged).
4. Reviewer authorization: a non-admin session cannot reach this page at all (`requireAdmin()` gate, unchanged, not touched by this milestone).
5. Confirm no control's judgment field is pre-populated or defaulted to "Verified" by evidence presence, for any of the five newly-reachable channels.

**Remaining risks / explicitly deferred (not part of this milestone):**
- Evidence items are not individually cross-linked to their specific control (e.g., no inline "see L03" affordance next to the Talent release link) — the generic evidence-library pattern (always-visible sidebar tab) is the existing architecture and was preserved as-is, per this milestone's instruction not to invent new UI patterns beyond the reachability fix itself.
- `WorkbookClient.tsx` keys each rendered evidence link on `file.name` (the label) — a pre-existing fragility this milestone did not touch; the new labels were deliberately made unique (via a 1-based index for array-derived channels) to avoid triggering it, but the underlying key choice itself was left alone as out of scope.
- The Report's own "License on file" / "Release on file" presence-boolean phrasing (§17.3, §23.6) is a separate, lower-priority, non-blocking finding and was **not** touched by this milestone.

**Smallest next milestone after this:** none required to close CAH-4I.3 itself. The next open item from the broader CAH-4I roadmap is CertForm askability governance (D-1/D-2, §20), unrelated to evidence reachability.

---

## 25. CAH-4I.4 — Submission Fact Acquisition / Askability Governance (2026-09-12)

**Status: GOVERNANCE / ARCHITECTURE DISCOVERY ONLY. No runtime, schema, questionnaire, CRC, LK, or reviewer-workbook change is authorized by this section.** It re-derives the acquisition/askability contract §18–§20 gestured at but did not fully specify, and answers the open decisions D-1 through D-5/D-7 as far as the evidence actually supports — no further.

### 25.1 Re-deriving the pipeline — the proposed formulation is incomplete, not wrong

The proposed shape was:

```
Commercial Assurance fact demand → fact authority → channel permission/askability
→ already-established fact availability → acquisition need → question/evidence request/reviewer establishment
```

Re-derived from the one channel where this is most mature — CRC — this collapses two independent gates into one step. `jurisdiction-clarification.ts`'s actual eligibility rule (read in full this pass) requires, as **separate, conjunctive conditions**: (A) an active confirmed UserGoal resolves to a governed claim needing jurisdiction — **applicability/relevance**, computed from this submission's own context — AND (C) `ProjectFacts.jurisdiction` is neither confirmed nor declined — **not-already-satisfied** — AND the ordinary Constraint pipeline permits it — **generic conversational-fit**. `dependency-askability.ts` supplies a *fourth*, independent gate — **channel askability**, a fail-closed registry lookup that has nothing to do with whether the fact is relevant to this submission. CAH-4I.2 already stated the first pairwise distinction generically (`CRC_CURRENT_STATE.md` §4: *"Selector askability ≠ applicability"*); this milestone's re-derivation confirms it holds up under a real worked example and generalizes cleanly.

**Corrected shape** — fact authority and applicability are properties of the *demand*, evaluated independently of each other and of the channel; askability is a property of the *(demand, channel)* pair; all three gate an acquisition attempt in conjunction, not in sequence:

```
                         FACT DEMAND
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                      ▼                      ▼
  FACT AUTHORITY        APPLICABILITY           CHANNEL ASKABILITY
  (who may ever          (is this fact           (may THIS channel
   establish it —        relevant to THIS         actively ask, at
   channel-independent)  submission —             all — a governance
                          channel-independent)     record, not a
                                                    relevance judgment)
        └─────────────────────┬─────────────────────┘
                               ▼
              acquisition authorized iff: applicable
              AND askable-for-this-channel AND not
              already satisfied for this instance
                               ▼
                    ACQUISITION ATTEMPT (bounded,
                    channel-native mechanism)
                               ▼
              FACT INSTANCE (channel-scoped: own
              provenance, own evidence status —
              never merged with another channel's
              instance for the same demand)
```

This is not a cosmetic redraw. It matters concretely for CertForm: CAH-4I.2 (§11) already found CertForm has **no applicability mechanism at all** (only hardcoded UI branches) and **no askability governance at all** (§15/§23). Treating these as one linear "channel permission" step would understate that CertForm is missing *two* independent primitives, not one — and a fix that adds askability governance without also adding applicability-gating would only solve half the problem this milestone is chartered to name.

### 25.2 Authority taxonomy — reused, not re-invented, then narrowed for this milestone's actual question

CAH-4I.2's E1–E8 taxonomy (§23.11 of this document independently accepted it as sound and orthogonal) is reused rather than re-derived from zero — the task's own instruction is to avoid blind adoption, not to discard working prior art without cause, and re-testing it against `dependency-askability.ts` and `jurisdiction-clarification.ts` this pass found no conflict.

**Narrowed for CAH-4I.4's specific deliverable** (a CertForm ask/no-ask contract): "askability" is only ever a live question for **E1** facts (attributed self-report — the only class a *question* can legitimately target). E2 is CRC-specific by definition (unauthenticated). E3–E8 are never askable-as-a-question by construction — they are acquired by upload, direct review, computation, or external lookup, never by asking the submitter to assert them. This is exactly why CAH-4I.2's §15 adversarial check treated a hypothetical evidence-only self-attestation checkbox as a **category error**, not merely a missing gate: an E3 fact was never a candidate for "ask" in the first place, and no governance record can make it one — only re-classifying the fact's authority could, and that is a legal/product decision far outside this milestone's remit.

### 25.3 CertForm ask/no-ask decision contract

The task proposed six categories. Re-tested against the taxonomy above, they are **not six peers of the same kind** — category 6 is a cross-cutting modifier, not a sixth alternative outcome, and this milestone corrects that rather than implementing the six as given:

| # | Category (as proposed) | Correction after re-derivation |
|---|---|---|
| 1 | REQUIRED / ASK | Valid outcome — applies when: fact authority includes E1, applicability = always-true (no gating dependency), and a channel-askability record exists (or is created) authorizing CertForm specifically. |
| 2 | CONDITIONAL / ASK WHEN APPLICABLE | Valid outcome, but requires CertForm to have an **applicability mechanism** it does not currently have (§25.1) — this category is currently **unimplementable on CertForm as built**, not merely unused. It is fully implemented on the CRC side (`jurisdiction-clarification.ts` is a worked instance of exactly this category). |
| 3 | DO NOT ASK — EVIDENCE ONLY | Valid outcome — the stock-governance class (§25.7) and any other E3 fact. Never a question, regardless of applicability. |
| 4 | DO NOT ASK — REVIEWER ESTABLISHES | Valid outcome — E4/E5. CertForm may still collect a submitter's own good-faith disclosure as *context* for the reviewer (the existing I01 pattern: submitter disclosure input + independent reviewer visual review), but that disclosure is never itself the established fact. |
| 5 | DO NOT ASK — SYSTEM/EXTERNAL | Valid outcome — E6/E7. |
| 6 | ALREADY AVAILABLE, RECONFIRMATION MAY BE POSSIBLE | **Not a peer category — a cross-cutting flag.** Any fact in categories 1–2 can *additionally* have a prior instance available from another channel (typically CRC). Whether that prior instance may inform this acquisition is answered by §25.5's reuse contract, independently of which of 1–5 the fact belongs to. Re-classified here as a modifier, not an outcome. |

**The governance record itself (D-1) is the actual missing primitive**, independent of which category a given fact falls into: `dependency-askability.ts` proves the pattern (a small, explicit, fail-closed registry + a per-entry PM/legal decision record, `DAR_001`'s shape) works for one channel (CRC). Nothing analogous exists for CertForm. This milestone recommends the **same pattern, a separate registry** — not a shared one (§25.6) — scoped to CertForm questions, populated one deliberate entry at a time, exactly as CRC's own registry has exactly one real entry today despite the mechanism being fully generic.

### 25.4 Fact-instance / provenance contract

No change from CAH-4I.2 §9/§12.5, re-confirmed rather than re-derived: a fact instance is channel-scoped (own `asserted_by`, `establishment_class`, `evidence_status`, `source_ref`); "another channel has a value" means exactly that and nothing more automatically — it does not mean *this* channel's acquisition requirement is satisfied, shown to the user, or reconfirmable, each of which is a separate, explicit governance question (§25.5).

### 25.5 CRC → CertForm reuse contract — re-derived, not merely re-asserted

The task is correct that CAH-4I.2 did not prove all reuse is forbidden, and this milestone's own re-review (§23.4 of this document, produced independently before this section) already flagged the "rejects prefill" framing as an overstatement. Re-deriving the five options directly:

| Option | Determination |
|---|---|
| A. "CRC said X, therefore CertForm fact = X" (silent) | **Forbidden.** Authority laundering — an E2 (unauthenticated) instance becomes an E1 (attributed, warranted) instance with no act by the authenticated party. `crc-assurance-handoff/types.ts`'s own unauthenticated-identity language is a hard architectural fact, re-verified this pass, not a policy preference that could be waived by convenience. |
| B. "CRC previously recorded X; CertForm displays it as reference" | **Permitted, and already has a partial precedent** — `buildCrcProjectContext` already does exactly this for the **reviewer** (a neutral, read-only, never-evidence projection). Extending an equivalent read-only reference display to the **submitter's own** CertForm session is architecturally the same shape, but does not exist today and would be new product surface, not a code reuse of the reviewer-facing path. |
| C. "CRC previously recorded X; submitter explicitly confirms X for this submission" | **Not architecturally forbidden — re-establishes E1 authority the moment the authenticated party affirms it.** But this milestone found **zero existing plumbing** for it (no session-to-CertForm value-passing mechanism was found anywhere in `crc-assurance-handoff` or the CertForm route). This is D-4, correctly left open in CAH-4I.2, and this milestone does not newly resolve it — it is a genuine product-risk decision (showing a user words that may not be theirs, inside a form whose entire value proposition is that the words *are* theirs), not an architecture gap. |
| D. "CRC previously recorded X; submitter corrects it to Y" | Falls out of C for free once C is designed: correction is just declining the shown value and asserting a new one, which is ordinary E1 acquisition, unaffected by where the displayed default came from. No new mechanism needed beyond whatever C requires. |
| E. "Reviewer can see both instances with provenance" | **Already implemented, verified this pass by cross-reference to the Reviewer Resources / Linked CRC Context work** (CAH-4F/4G, indexed in `COMMERCIAL_ASSURANCE_ARCHITECTURE_INDEX.md`) — the reviewer already has a tab showing CRC session content separately from the Workbook, with the boundary that CRC context is never assessment evidence enforced structurally (ADR-001). This is the mechanism that should be pointed to as the working precedent for "provenance-preserving reference," not a hypothetical. |

**Net determination:** the reuse question decomposes cleanly into "is silent authority transfer safe" (no, settled) and "should CertForm ever show a submitter their own prior CRC answer for reconfirmation" (D-4, genuinely open, a product decision about UX/trust framing, not an architecture question this milestone can resolve).

### 25.6 Relationship to Living Knowledge — does the system need one shared registry?

**No — and there is now direct precedent for this conclusion, not just CAH-4I.2's own reasoning.** `dependency-askability.ts`'s own header states its designers already considered and explicitly rejected a generic cross-channel "InformationNeed framework living inside governance," citing two prior diagnostics by name, for the stated reason that it would blur the ownership boundary between governed claim content (Retrieval/governance's domain) and acquisition-side product metadata (CRC's own domain). This is the identical question CAH-4I.4 was asked to resolve for CertForm, already asked and answered for CRC, by the people who own that boundary, roughly three weeks before this milestone. Applying the same reasoning: Commercial Assurance fact demand, LK applicability demand, CRC askability, and (the newly-proposed) CertForm askability should remain **separate, small, purpose-owned registries with explicit cross-references** — exactly CAH-4I.2's "share the demand, never merge the vocabulary" conclusion (§4.2), now reinforced by a second, independent instance of the same design choice already made elsewhere in this codebase for a structurally identical reason.

### 25.7 Stock-governance / fail-closed re-confirmation

Re-tested against `dependency-askability.ts`'s literal registry contents (read in full this pass, not re-derived): exactly one entry (`human_contribution_description`), fail-closed default confirmed in the file's own header (*"Absence defaults to non-askable, never the reverse"*), and the four real stock dependencies (`editorial_designation_confirmed`, `separate_authorization_obtained`, `release_status_confirmed`, `rights_and_clearance_status`) confirmed absent from the registry — meaning CRC cannot ask about them, by construction, not by discipline. No equivalent mechanism exists for CertForm (§25.3's D-1 finding, unchanged from the CAH-4I.2 review). **No fact classified evidence-only anywhere in this document is proposed here for self-attestation.**

### 25.8 Discriminating examples — applying the contract

| Fact | CA demand today? | Authority | May ask? (which channel) | Currently collected? | Existing value reusable? | Evidence involved? | CertForm question = authority error? |
|---|---|---|---|---|---|---|---|
| Distribution territory (G1) | Yes (Report, Manual heuristic) | E1 | Yes — CertForm (already does), CRC (passive extraction only) | Yes, coarse | N/A | No | No |
| Assessment jurisdiction scope (G2) | Yes (LK applicability gate) | **See §25.9 — genuinely re-examined, not simply re-asserted E5** | CRC only, today (tightly gated per §25.1) | No, on CertForm | CRC's instance is session-scoped only | No | Not yet askable on CertForm at all — no authority error exists to make, because no question exists |
| Applicable law (G3) | No — explicitly disclaimed | **E8** | None | No | N/A | No | Would be, if ever asked |
| `human_contribution_description` (CRC) vs `authorship_statement` (CertForm) | Yes, both | E1/E2 respectively | Both — different granularity, different purpose (§23 of this doc already found these are siblings, not duplicates) | Yes, both, independently | Per §25.5(C), not today | Only via H-5 corroborating artifact | No — each is a genuine, separately-authorized question |
| Custom/fine-tuned model (R03) | Yes (named control, no trigger) | E1 (existence) | CertForm, conditionally (category 2) | No | N/A | Training-data rights doc would be E3 | **CertForm cannot ask this conditionally today — §25.3 category-2 unimplementability, not a missing question** |
| Work-for-hire (R04) | Yes (acceptable evidence in Manual) | E1 (existence) + E3 (agreement) | CertForm, category 1 or 2 | No, only inferable | N/A | Yes, contractor agreement | Weak candidate, not proven necessary given existing inference path |
| Third-party asset/licence facts | Yes (I01/I02) | E1 (existence) + E3 (licence) | CertForm | Yes | N/A | Yes | No |
| Likeness/release evidence | Yes (L03) | E1 (self-report) + E3 (release document, reviewer-inspected) | CertForm for both; reviewer inspects | Yes (fixed by CAH-4I.3) | N/A | Yes, now reachable | No |
| Stock-governance facts | Yes (via `CLAIM-STOCK-*`) | **E3 — evidence only, by explicit prior governance decision** | **No channel may ask** | No | N/A | Yes, only | **Would be, definitively — this is the exact case the fail-closed registry exists to prevent** |
| Copyright registration | **Re-tested, not promoted** — see §25.10 | F (unresolved authority) if ever adopted | None today | No | N/A | Would be E3 if adopted | N/A — not currently a demand |
| Trademark / trademark registration | See §25.11 | E1 (existing self-attestation) + E4 (reviewer visual) for the *content* fact; registration status is a **separate, currently non-demanded** concept | CertForm already asks the content-presence self-attestation | Yes, for content presence only | N/A | Reviewer visual review | The *existing* `ip_no_trademarked_ip` checkbox is itself an unreviewed, ungoverned authority decision (flagged, not newly created, by CAH-4I.2 §14.6) — registration status is not asked and this milestone does not recommend adding it |
| C2PA / provenance presence | Yes (T01, positive factor) | **E4 — technical/file-level inspection** | None (correctly) | No field | N/A | N/A (a reviewer-tool gap, not a fact-acquisition gap) | Would be, if ever asked as a self-report |
| Documentation-consistency (D01/D02) | Yes | **E5 — reviewer synthesis output** | None (correctly) | N/A | N/A | N/A | Would be, definitively — a control cannot self-attest its own cross-check |

**Nothing above adds a fact to the demand contract because it "sounds commercially useful."** Every "Yes" in the first column traces to a named control, claim, or Report field already established in CAH-4I.1/4I.2; every entry re-examined for copyright and trademark below explicitly declines promotion absent new authority.

### 25.9 Assessment jurisdiction authority — genuinely re-examined, resolved to RECOMMENDED not UNRESOLVED, with a specific reason not previously stated

CAH-4I.2 offered E5 (reviewer-established) as "a recommendation, not a decision," and this document's own §23.7 review held that open. Re-examining with the freshly-read CRC precedent: CRC's own live, shipped `JURISDICTION_CLARIFICATION_QUESTION` — *"Which jurisdiction ... should CRC consider for this assessment?"* — already asks the **user** a jurisdiction-scope-preference question, tightly gated, and treats the answer as a **preference CRC will use to select governed knowledge**, never as a legal conclusion CRC asserts. This is a real, already-approved (per the file's own PM-approval citation) precedent for exactly the authority split this milestone needs: **the submitter may express an assessment-jurisdiction preference (E1, category-2 conditional-ask, gated on an applicability trigger analogous to CRC's own); the reviewer retains final authority to accept, narrow, or override it when setting the workbook's own Assessment Scope (E5)** — matching the Manual's existing reviewer-owned scope-setting act (Step 1) exactly, rather than replacing it.

This is stated as **RECOMMENDED, requires PM approval** — not PROVEN, because CertForm has no equivalent field or applicability mechanism today and the CRC precedent, while real, was approved for CRC's own conversational context, not for a static submission form. It is a materially stronger basis than CAH-4I.2's original framing (which cited only the Manual's scope-ownership language, not this now-verified CRC precedent), so it is upgraded from CAH-4I.2's bare "recommendation" to this milestone's own qualified recommendation, but it is not asserted as settled.

### 25.10 Copyright registration — re-tested, conclusion unchanged, reasoning strengthened

Re-tested per the task's explicit instruction not to promote it without new authority. Nothing found this pass changes CAH-4I.2 §13's conclusion: swept again against `signoff.ts`'s 16 controls, the Manual's 7 domains, and the Report's own disclaimer language — no consumer demands registration/application status today, and the disclaimer (*"SI8 has not conducted independent title searches, chain of copyright investigations, or registrations with any government body"*) remains live, shipped Report boilerplate. **Classification unchanged: OUT OF SCOPE today, OPTIONAL PRODUCT EXPANSION if a future driver (most plausibly E&O underwriting) appears.** Not promoted to required fact.

### 25.11 Trademark — re-tested, distinguishing four concepts as instructed

1. **Existing assessment/control demand:** I03 remains real and sign-off-gated (re-verified in the CAH-4I.3 work this session, `signoff.ts` `ALL_CONTROLS` still includes it).
2. **Submission fact demand:** the *content-presence* self-attestation (`ip_no_trademarked_ip` et al.) already exists and is already flagged (not newly discovered) as an ungoverned E1 checkbox that would not obviously survive an askability review — this remains true and unresolved by this milestone (it requires the same D-1 governance process, applied retroactively to an existing question, which is a larger and more sensitive undertaking than gating new questions and is explicitly out of scope here).
3. **Registration/status information:** genuinely **not currently demanded by any control** — distinct from content-presence, and this milestone does not invent a demand for it merely because "trademark" and "registration" are adjacent concepts. No promotion.
4. **Future LK knowledge coverage:** unchanged — zero governed trademark claims exist; this is a knowledge-onboarding gap under an already-designed control, not a fact-acquisition gap, and LK's absence here is not used as a reason to suppress or invent submission-fact demand in either direction.

### 25.12 Questionnaire architecture implications

**Assessment: a full generic metadata-driven acquisition layer is not proven necessary by this milestone's evidence — a smaller architecture is.** The concrete gaps found (category-2 conditional-ask unimplementability, no askability governance) both trace to two *specific, missing primitives* — an applicability check and a governance registry — not to the static-form model itself being wrong. CRC's own precedent (`dependency-askability.ts` + `jurisdiction-clarification.ts`) proves these two primitives can be added to an existing, otherwise-conventional codebase incrementally, one small module at a time, without a wholesale form-generation rewrite. **Recommendation: if CertForm ever needs conditional/governed questions, add the same two small, purpose-specific primitives CRC already has (an askability registry; a per-fact applicability-eligibility function) rather than building a generic form-schema engine.** This is deliberately the conservative reading — CAH-4I.2 §18.1's three-layer model (registry, governance, per-channel instances) already pointed the same direction; this milestone's contribution is confirming, via CRC's own build history, that the *smaller* version of that model was sufficient there and is the more defensible starting point here too.

### 25.13 PM / governance decision table

| # | Decision | Status | Basis |
|---|---|---|---|
| D-1 | CertForm askability governance (a `DAR_001`-shaped registry + review process for CertForm questions) | **RECOMMENDED, requires PM approval** | Proven necessary (§25.7); proven pattern exists (`dependency-askability.ts`); zero code required to start (a process + a registry file) |
| D-2 | Adopt §16's inventory as Commercial Assurance Fact-Demand Contract v0.1 | **RECOMMENDED, requires PM approval** | Unchanged from CAH-4I.2; this milestone adds no new inventory rows, only re-examines existing ones |
| D-3 | Assessment-jurisdiction authority (submitter-preference + reviewer-confirms) | **RECOMMENDED, requires PM approval** — upgraded from "unresolved recommendation" per §25.9's new CRC-precedent evidence | Real precedent (CRC's shipped, PM-approved jurisdiction question) now supports the split explicitly, but CertForm has no implementation and the precedent was approved for a different channel |
| D-4 | CRC-answer reconfirmation in CertForm | **UNRESOLVED** — genuinely, not a placeholder | No architectural blocker (§25.5, option C); zero existing plumbing; a product-trust framing decision this milestone has no authority to make |
| D-5 | External (E7) registry verification | **DEFERRED** | Would require changing shipped Report language; no driver identified this pass |
| D-7 | Reviewer visibility of scope-excluded LK claims | **Not newly examined this pass** — carried forward unresolved from CAH-4I.2 §20, no new evidence found or sought (out of this milestone's discriminating-example set) |
| New | A generic acquisition-metadata layer for CertForm (full engine, not two small primitives) | **REJECTED as the next step** | §25.12 — not proven necessary; smaller architecture (registry + applicability function) suffices per CRC's own precedent |
| New | Category 6 ("already available, reconfirmation possible") as a peer ask/no-ask outcome | **REJECTED as originally framed** | §25.3 — re-classified as a cross-cutting modifier on categories 1–2, not a sixth outcome |

### 25.14 Architecture risks

- **The two-registry-parity risk:** building a CertForm askability registry that silently drifts in structure or review rigor from CRC's own would recreate exactly the asymmetry this milestone diagnoses, just with two weak registries instead of one strong one and one absent one. Any D-1 implementation should be reviewed against `dependency-askability.ts`'s actual shape and `DAR_001`'s actual review rigor, not merely inspired by them.
- **The D-3 upgrade risk:** this milestone upgraded D-3 from "unresolved" to "recommended" on the strength of a precedent from a different channel (CRC). If a PM reviews the CRC precedent and finds it was approved for reasons specific to CRC's conversational, bounded context, the upgrade should be reverted — this milestone's confidence is qualified, not asserted as certain, and says so explicitly (§25.9).
- **Scope creep into implementation:** every table and contract above is deliberately abstract; none names a specific new CertForm field, section, or copy. The temptation this milestone's own findings create — "we now know exactly which facts to ask" — is precisely the trap Phase 4's instructions warned against, and this document does not cross that line.

### 25.15 Implementation gate

**B — HOLD.** D-1 through D-4 are PM/governance decisions this milestone correctly identifies but cannot resolve on its own authority — exactly the boundary CAH-4I.2 already respected and this milestone preserves. The governance *contract* (the pipeline, taxonomy, and ask/no-ask categories) is sound and internally consistent, re-tested against fresh source this pass, but "sound contract" is not the same as "authorized to build" — D-1/D-2/D-3 need explicit PM sign-off before any subsequent design milestone should begin drafting a registry, an applicability function, or a jurisdiction-scope field.

**Smallest next milestone:** a **governance decision milestone**, not a design or implementation one — specifically, a PM review of D-1 (adopt CertForm askability governance, yes/no, and who reviews entries) and D-3 (accept the submitter-preference + reviewer-confirms jurisdiction split, yes/no). Both are cheap to decide (no code, no new research needed — the evidence is already in this document) and both gate everything else in §25.13. Trademark LK onboarding, a geography implementation, and any CertForm question change should all wait behind this decision, not proceed in parallel with it.

**Runtime-change confirmation:** none. This section is the only change made in this milestone; verified via `git diff --check` and a changed-file-scope check before commit (§25.16).

### 25.16 Documentation / git state

Committed on a dedicated branch (`cah-4i4-submission-fact-acquisition-governance`), created off the integrated `main` baseline (`5a95065`, which already includes CAH-4I.1–4I.3). Not pushed, not merged — per this milestone's own instruction to keep it isolated and reviewable pending PM review of §25.13.

---

## 26. CAH-4I.4A — Human Reviewer Audiovisual Observation / Inspection Architecture Discovery (2026-09-13)

**Status: DISCOVERY / GOVERNANCE ONLY. No database field, workbook control, UI, form, API, prompt, reviewer workflow, media-analysis system, or Living Knowledge change is authorized by this section.** It tests whether Commercial Assurance formally models direct Human Reviewer audiovisual observation as a distinct source of project fact, using source verified this pass, not carried forward from prior sections' citations.

### 26.1 Product-promise finding (Phase 1) — EXPLICITLY REQUIRED, not inferred

`SI8-Reviewer-Manual-v0.2.md` states, verbatim, for two domains independently:

> Domain I (Third-Party IP), line 456: **"This domain requires direct content review. The reviewer must watch or view the content, not rely solely on the submitter's disclosure."**
> Domain L (Likeness & Performer Rights), line 499: **"This domain requires direct content review."**

This is the strongest classification available (**explicitly required**), not "strongly implied." The Manual's own decision logic already goes further than a bare requirement to watch — it explicitly separates the *act of observing* from the *legal weight of the observation*, in its own words, independently of anything CAH-4I.2/4I.4 proposed:

> Domain L, line 528: *"The reviewer is not making a legal determination — they are documenting whether a reasonable commercial concern exists."*

This is direct evidence that the product methodology already understands the observation/conclusion boundary conceptually, in prose, before this milestone asked the question. What was untested until this pass is whether that prose intent is actually carried through in the *data model* — answered in §26.3–§26.4.

Per-capability classification, source-checked individually:

| Capability | Classification | Source |
|---|---|---|
| Reviewer watches the video | **Explicitly required** | Manual:456, 499; `section_2.viewing_passes.first_complete` is a signoff-blocking gate (`signoff.ts:161`) |
| Reviewer listens to audio | **Explicitly required** (as part of "direct content review"; no separate audio-specific mandate sentence exists, but I02's `audio_reviewed` checkbox and Section 2's `has_audio`/`music_heard`/`speech_heard` fields make it operationally identical to the visual mandate) | `workbook-schema.ts` `section_3.I02.audio_reviewed`; `section_2.music_heard` |
| Reviewer looks for visual third-party IP | **Explicitly required** | Manual:454–478 (Domain I decision logic) |
| Reviewer looks for likeness/person issues | **Explicitly required** | Manual:497–530 (Domain L decision logic) |
| Reviewer looks for logos/brands/trademarks | **Explicitly required** (subsumed under Domain I's "character, logo, artwork" language, and independently captured as its own Section 2 field) | Manual:477; `workbook-schema.ts` `logos_observed`/`trademarks_observed` |
| Reviewer evaluates music/audio concerns for third-party similarity | **Possible but undocumented as its own mandate** — the Manual's only audio-specific sentence concerns *voice-model provenance* ("Voice synthesis used; no information on voice model source"), not "does this music resemble known third-party material." `music_heard`'s `PRESENCE` options (`None observed`/`Possible`/`Confirmed`) structurally support recording exactly this concern, but no Manual sentence instructs the reviewer to listen *for* third-party-similarity the way Domain I's sentence instructs looking for visual IP. | Manual:526 (voice provenance only); `workbook-schema.ts` `music_heard` (structurally capable, not textually mandated) |
| Reviewer identifies undisclosed material | **Explicitly required, and explicitly generic** — Section 2's `unexpected_content`/`unexpected_description` fields exist with no domain qualifier at all, alongside the domain-specific fields | `workbook-schema.ts` `section_2.unexpected_content` |
| Reviewer requests/follows up on evidence based on inspection | **Possible but incompletely structured** — see §26.6 | Section 4 (Evidence Gap Log) exists; no explicit observation→gap link field |

### 26.2 Controls relying on direct media inspection (Phase 2)

Re-derived from `signoff.ts`'s `ALL_CONTROLS` and the Manual, cross-checked against `workbook-schema.ts` `section_3` this pass (not carried forward):

| Control | Fact assessed | Source(s) expected | Requires direct inspection? | Self-report alone sufficient? | Observation can contradict submitter? | Structurally captured? | Reviewer records why flagged? | Timestamp captured? | Reaches signed workbook? | Distinguishes observation from legal conclusion? |
|---|---|---|---|---|---|---|---|---|---|---|
| I01 — recognizable third-party copyrighted content | Visual IP presence | Direct viewing + submitter disclosure | **Yes** | No (Manual:465, "weak evidence") | Yes | Yes — `section_2.copyrighted_artwork` (PRESENCE) + `section_3.I01.elements_identified` (free text) + `content_viewed` checkbox | Via free-text description only, no structured reason field | Informally — placeholder text invites it, no dedicated field | Yes (`workbook_data`) | **Yes** — Manual:528 explicit; `section_2` (PRESENCE) vs `section_3` (JUDGMENT) is a different, orthogonal vocabulary |
| I02 — audio/music rights | Audio source + licensing | Submitter disclosure + `audio_reviewed` flag | Operationally yes (checkbox exists), not textually mandated the way I01/L is | Structurally yes today (no Manual sentence forces contradiction-seeking for audio) | Structurally possible (`music_heard`), not methodology-mandated | Yes — `section_2.music_heard` (PRESENCE) | Same as I01 | Same as I01 | Yes | Same mechanism as I01, less textual mandate |
| I03 — brand/logo/trademark elements | Trademark/brand presence | Direct viewing + submitter checkboxes | **Yes** | No | Yes | Yes — `section_2.logos_observed`/`trademarks_observed` (PRESENCE) + `section_3.I03.trademark_elements` (free text) | Free text only | Informally, placeholder-prompted | Yes | Yes, same mechanism |
| L01/L02 — likeness / synthetic-performer presence | Real-person resemblance | Direct viewing | **Yes, explicitly (Manual:499)** | No | Yes | Yes — `section_2.real_likeness_suspected`/`synthetic_humans` + `section_3.L01.likeness_found` | Free text only | Informally | Yes | **Yes — the clearest instance**: Manual:528 states the observation/conclusion boundary in words; `real_likeness_suspected` (Possible/Confirmed) is structurally distinct from `L01.likeness_found` (None identified/Suspected/Confirmed — a *different*, overlapping-but-separate enum, itself worth flagging, §26.9) |
| L03 — consent/release documentation | Documentation, not observation per se | Evidence artifact (fixed by CAH-4I.3) | No — this is an evidence-sufficiency control, not an observation control | N/A | N/A | N/A | N/A | N/A | Yes | N/A — correctly not an observation control |
| (no control) — `unexpected_content` | Anything unanticipated | Direct viewing | Implicit (part of "direct content review" generally) | No | Yes | Yes, but **with no linked control at all** (§26.6) | Free text only | Informally | Yes | Ambiguous — has no control to route a conclusion through |

### 26.3 The current reviewer data model (Phase 3) — a real, generic, two-vocabulary structure already exists

Read `workbook-schema.ts` in full this pass (not from citation). The canonical `EMPTY_WORKBOOK` (`workbook_version: '0.2'`) already contains:

- **`section_2`** — ~30 fields, generic across every domain touched (visual, audio, likeness, brand): a small set of **procedural fields** (`viewing_passes: {first_complete, second_viewing, frame_by_frame}`, `runtime_observed`, `scene_count`) plus, for each observation category, a **bounded enum** (`Sel`, options `['None observed', 'Possible', 'Confirmed']` — the `PRESENCE` constant, `Section2Visual.tsx:110`) with a **conditionally-revealed free-text elaboration field** (`Textarea`) that only appears once the enum indicates something was seen. This same `Sel`+conditional-`Textarea` pattern is reused identically across `synthetic_humans`, `real_likeness_suspected`, `music_heard`, `logos_observed`, `trademarks_observed`, `landmarks_observed`, `copyrighted_artwork` — genuinely one generic structural pattern, not domain-specific bespoke code, even though each field is separately named (unavoidable — "logo" and "likeness" are different concepts).
- **`section_3`** — 16 control judgments, each using the **entirely separate** `JUDGMENT_OPTIONS = ['Verified', 'Partially Verified', 'Not Provided', 'Not Applicable']` enum.
- **`section_4`** — Evidence Gap Log, control-linked (`{id, control, what_missing, addressable, commercial_impact, impact_description}`).
- **`section_5`** — Findings Log, domain-linked (`{id, domain, finding, evidence_basis, commercial_impact, addressable}`) — per the markdown Workbook Schema doc's own definition (§367 of that file, re-read this pass): *"A finding is what you concluded from the evidence, not just what was provided"* — i.e., Section 5 is explicitly conclusion-level, not observation-level.

**Direct code-level UI linkage confirmed, read in full this pass:** `Section3Evidence.tsx` renders an `S2Banner` inside each relevant control's editing block (I01, I02, I03, L01), pulling the specific `section_2` fields relevant to that control and displaying them alongside the control's own judgment inputs — e.g., I03's block shows `Logos`/`Trademarks` from `section_2` next to the `trademark_elements` free-text field the reviewer fills in for the control itself. **This linkage is real and functioning, but is a hand-written UI-code convention (each control's JSX manually names which `section_2` fields to show), not a data-level relationship** (no `linked_control` field exists on any `section_2` entry).

**Section-ordering enforces the observation-before-determination discipline procedurally, not just conceptually:** `computeGates()` in `workbook-schema.ts` makes `canEnterSection3: section2Complete` — a reviewer cannot even open the control-judgment section until Section 2's `viewing_passes.first_complete` is true and `freeform_observations` is ≥20 characters (also enforced again at `signoff.ts:161-163` as a hard signoff-blocking check). This is a genuine, code-enforced sequencing rule, not documentation-only.

**Answering Phase 3's ten questions directly:** semantically, `section_2` represents observation and `section_3` represents determination (yes, structured, not free text alone — bounded enums with conditional elaboration); it has *no* per-field reviewer identity, timestamp, or media-location beyond what a reviewer chooses to type into the elaboration text; it links to controls only via UI code, not data; it can represent an observation without a conclusion (this is exactly what Section 2 does — `PRESENCE` never implies `JUDGMENT`); it survives signoff (it is part of the same `workbook_data` JSONB the report-binding lifecycle already protects); it does **not** reach the customer Report (§26.5); it is auditable internally after signing (the raw JSONB persists) but not customer-visible.

### 26.4 Fact-authority model test (Phase 4) — the distinction PM asked about already exists in the taxonomy; this pass confirms it against code for the first time

CAH-4I.2's own §5 taxonomy (independently re-accepted, not re-derived, in this document's §23.11) **already contains exactly this split**, and it was not invented for this milestone:

> **E4 — Reviewer direct observation:** *"The reviewer watches/views the content and records what is present."* Examples listed: *"logos/trademarks observed; real-likeness suspected; synthetic humans; music heard..."*
> **E5 — Reviewer judgment:** *"A control judgment, gap, finding, outcome, confidence, or scope limitation. Always an output, never an input."*

What this milestone adds, verified this pass and not merely re-asserted: **E4 and E5 are not just conceptually distinct in a governance document — they are implemented as two different bounded enums in production code** (`PRESENCE` vs. `JUDGMENT_OPTIONS`), gated by a procedural section-ordering rule enforced at both the UI (`computeGates`) and the signoff-validation layer (`signoff.ts`). This is materially stronger evidence than CAH-4I.2 had when it wrote §5 — that section was reasoning from the Manual's prose and the schema's field *names*; this pass reasoned from the enums' actual *values* and the code paths that gate between them.

**Direct answer to Phase 4's core question:** "reviewer observation" is **not a new authority class** — it is E4, already named, and this milestone found no evidence requiring a ninth class. What was genuinely open before this pass — whether E4 is *actually* distinguishable from E5 in the running system, or only on paper — is now closed: **yes, distinguishable, confirmed structurally.** The real, remaining gap is not in the taxonomy; it is in the **provenance layer underneath E4** (§26.7) and the **observation→investigation mechanism** (§26.6), neither of which the taxonomy alone guarantees.

**One taxonomy-adjacent finding this pass does add:** `section_3.L01.likeness_found` uses its own enum (`['None identified', 'Suspected — describe in notes', 'Confirmed — describe in notes']`) — a *third*, separate vocabulary, distinct from both `PRESENCE` and `JUDGMENT_OPTIONS`, describing essentially the same conceptual axis as `section_2.real_likeness_suspected`'s `PRESENCE` value but with different wording and housed in Section 3 rather than Section 2. This is not evidence of a missing authority class — it is evidence of **vocabulary proliferation within E4/E5's boundary**, worth flagging (§26.9) as a smaller, adjacent hygiene finding, not the core question this milestone was asked to answer.

### 26.5 Submitter representation vs. reviewer observation — discriminating examples (Phase 5)

All four examples are answerable from source, not hypothetically:

| Example | What the architecture actually permits today | Does observation overwrite submitter fact? | Does it manufacture a conclusion? |
|---|---|---|---|
| A. Submitter says no logos; reviewer sees one | `submissions.ip_confirmation` (submitter, E1) and `workbook_data.section_2.logos_observed` (reviewer, E4) are **different JSONB columns on different tables** (`submissions` vs. the assessment's workbook) — structurally impossible for one to overwrite the other. The reviewer records `Confirmed` + a free-text description; `section_3.I03.trademark_elements` is where the reviewer writes their own assessment, informed by both, per Manual:477's decision logic (*"depending on whether the submitter disclosed and licensed it"*). | **No — confirmed structurally impossible**, not merely discouraged. | No — `I03.judgment` is a separate field the reviewer sets manually; nothing computes it from `logos_observed` |
| B. Submitter says no likeness; reviewer suspects resemblance | Same structural separation. Manual:528's own language — *"document the uncertainty in the Findings Log rather than making a definitive call"* — is the prescribed path when the reviewer is unsure, i.e., escalate to Section 5 as a *finding under uncertainty*, not silently resolve it either way. | No | No — the Manual explicitly instructs against a premature legal conclusion here |
| C. Submitter declares original audio; reviewer hears something similar to known music | Structurally identical mechanism (`music_heard` = `Possible`/`Confirmed`), but **methodologically the weakest-supported of the four** — no Manual sentence parallels Domain I/L's explicit "must watch/view" mandate for audio-similarity specifically (§26.1). The structure exists; the textual mandate to actively listen *for third-party similarity* (as opposed to listening for source/provenance) does not, as clearly. | No (same structural guarantee) | No, but the methodology gap means a reviewer has less explicit instruction on *when* to escalate this one |
| D. Submitter declares no third-party visual assets; reviewer sees artwork/signage/character imagery | Same as A, via `copyrighted_artwork`/`I01`. | No | No |

**Across all four, the request/investigate/unresolved path is the same generic one** (Section 4's Evidence Gap Log, or Section 5's Findings Log under Manual:528's "document uncertainty" instruction) — there is no domain-specific escalation mechanism, and this milestone found no evidence one is needed (consistent with the task's own strong presumption against domain-specific structures, §26.8).

### 26.6 Observation → investigation (Phase 6) — the generic mechanism exists but the link is not structural

The dangerous shortcut ("observation → legal conclusion") is **not** wired anywhere — confirmed by the complete absence of any code path that reads `section_2` values and writes a `section_3` judgment automatically (grepped; none found). The safe path — *"I observed X, therefore I need to investigate Y"* — is expressible today, but through **two independent, pre-existing generic mechanisms, connected only by reviewer discretion**:

1. **Section 4 (Evidence Gap Log):** structured, control-linked, but keyed to a *control ID*, not to a specific Section-2 observation entry. A reviewer who saw something in Section 2 must manually decide to open a gap and manually write which control it relates to; there is no `source_observation` field pointing back.
2. **Section 5 (Findings Log) under Manual:528's instruction:** the closest thing to a formal "document the uncertainty" path, but it is a *prose instruction in the Manual*, not a structural requirement — nothing in `workbook-schema.ts` forces an uncertain Section-2 `Possible` value to produce a Section-5 finding or a Section-4 gap. A reviewer could technically mark `logos_observed: 'Possible'`, write a two-sentence description, and proceed to `I03: Verified` without the system ever requiring a gap or finding to reconcile the tension. This is the **most concrete gap this milestone identifies**: the *capability* to express "observed, therefore investigate" exists, but the *requirement* that an ambiguous or contradictory observation actually be reconciled before signoff does not.

**Bounded-Interpretation-style discipline (Phase 8's principle, checked here for consistency) is preserved regardless:** because nothing computes a control judgment from an observation automatically, no downstream layer can currently produce "a stronger conclusion than the observation itself permits" — the risk is under-enforcement of investigation, not over-assertion of conclusions. That is a materially safer failure mode, and this milestone records it as such rather than treating the two risks as equally severe.

### 26.7 Provenance / auditability (Phase 7)

Minimum fields present today for a `section_2` entry: **value** (PRESENCE enum) and **elaboration** (free text, which informally carries timestamp/location when the reviewer chooses to type it — both `logos_description` and `trademarks_description` placeholders literally say *"Describe what you saw and at which timestamp"*, confirmed by direct read of `Section2Visual.tsx`). **Not present as structured fields:** reviewer identity per-entry (implicit only, via the single authenticated reviewer who owns the whole assessment — adequate today since one reviewer completes one workbook, but not per-observation), a structured timecode/frame field (informally text-only), creation timestamp per entry (the workbook's own revision history covers the whole document, not per-field), an explicit link to which control the observation feeds (UI-code convention only, §26.3), and correction/supersession at the per-observation level (the whole `workbook_data` JSONB is what the report-binding lifecycle already protects — overwriting a field before signoff is silent, exactly like every other pre-signoff draft field in this system, and is not a *new* gap introduced by this analysis).

**Signed-workbook immutability already covers this class of information, fully, at the document level — not at the per-observation level.** The report-binding lifecycle's stale-report invalidation (Execution Gaps §3o, this repo's own institutional record) reverts `REPORT_GENERATED` to `DRAFT` whenever *any* workbook data changes post-generation, `section_2` included — so an observation cannot be silently altered after a report has been generated without forcing regeneration. This is adequate document-level auditability; it is not per-observation provenance, and this milestone does not recommend building the latter absent a demonstrated need (none was found).

### 26.8 Living Knowledge interaction (Phase 8)

Confirmed by direct re-check: nothing in `submission-facts.ts`'s `buildReviewerLkContext` (re-read this pass) reads any `section_2` field — Reviewer-LK narrowing is driven only by `tools_used` and `territory_preferences`, exactly as this document's earlier sections already established. **A reviewer observation is, today, none of "retrieval trigger," "assessment fact," or "contextual input" to Living Knowledge — it is invisible to LK entirely.** A reviewer who observes a logo and wants governed trademark-adjacent knowledge must manually invoke HRR's free-form research interface and type a question themselves; there is no automatic "observation made LK content newly relevant" trigger, and — per this milestone's restrictions — none is proposed. This is consistent with, not a violation of, the Living Knowledge → Retrieval → Bounded Interpretation → Projection chain: LK simply does not currently ingest reviewer observations as an input at all, so there is no risk of an observation being laundered into a stronger LK-backed conclusion than Bounded Interpretation permits, because the pipe does not exist yet in either direction.

### 26.9 Impact on CAH-4I fact acquisition (Phase 9)

**The authority × applicability × channel askability model from CAH-4I.4 (§25) still holds and needs no structural extension** — E4 (reviewer direct observation) was already a class in that model before this milestone; nothing here required adding a class, splitting one, or introducing a new axis. What this milestone clarifies, as a refinement rather than a correction: **E4 is a genuine, distinct *acquisition channel* (C5 in §25/§6.1's own table — "Reviewer §2 observation") separate from Human Reviewer Determination (E5, produced via C6 — "Reviewer §3 control field")** — and this separation was already present in CAH-4I.2's own channel table (§6.1: `C5 Reviewer §2 observation` vs. `C6 Reviewer §3 control field`, each with a different establishment-class column). This milestone's contribution is verifying that separation against the actual Section 2/Section 3 code split, not introducing it.

**No authority-laundering risk was found**, because — unlike the CRC→CertForm case §25.5 spent most of its analysis on — there is no channel boundary being crossed here at all: both the observation (C5) and the determination (C6) are made by the same authenticated reviewer, within the same signed document, and the system already keeps them in structurally separate fields with separate vocabularies. The CRC↔CertForm reuse risk (an *unauthenticated* party's statement being imported as an *authenticated* one) has no analogue here.

### 26.10 Product coverage classification (Phase 10)

**B — PARTIALLY MODELED.**

Not A, because the capture layer is real and structurally distinct from determination, but incomplete: no per-instance/timestamped structure (one aggregate field per observation category, not a list), no data-level control linkage (UI convention only), no structural observation→investigation requirement (§26.6), and raw observation content does not reach the customer Report (§26.3/§26.5 — confirmed again this pass: `reportProjection.ts` reads only `section2?.viewing_passes?.first_complete`, nothing else from `section_2`).

Not C ("unmodeled material capability"), because a generic, cross-domain observation-capture mechanism genuinely exists in production, is signoff-enforced, and is UI-linked to the relevant controls — this is well past "the architecture has no governed observation layer."

Not D, because this is not a future/aspirational capability — it is live, shipped, signoff-gated, and used on every SI8 Certified assessment today.

### 26.11 Do we need a new control? (Phase 11)

**No new control.** Re-testing the three possibilities against source: (1) inspection-as-review-method is exactly what exists today — Section 2 is a review *method* applied once per assessment, feeding multiple controls (I01, I02, I03, L01, L02); (2) a standalone "media was inspected" control would be redundant with the existing signoff-blocking `viewing_passes.first_complete` + `freeform_observations` ≥ 20 chars gate, which already functions as a procedural completion requirement without needing to be a numbered control (`ALL_CONTROLS` deliberately does not include a "viewing completed" entry, and this milestone found no evidence that omission is a defect — the gate is enforced at `signoff.ts`, which is arguably the *correct* place for a procedural precondition, not the Findings/Judgment layer that answers substantive questions); (3) domain controls consuming observation as one of several evidence sources is exactly today's model (I01/I02/I03/L01/L02 each read from Section 2 alongside submitter disclosure and uploaded evidence). **The smallest correct model is already in production: inspection is a review method (option 1), generically structured (Section 2), feeding existing domain controls (option 3) — not a new control, and not merely domain controls alone without the generic capture layer that already exists.**

### 26.12 Automation boundary (Phase 12)

Nothing in this milestone's findings touches, requires, or gestures toward computer vision, audio fingerprinting, face recognition, or automated detection of any kind. Every mechanism discussed (`section_2`'s bounded enums, the S2Banner UI linkage, the Evidence Gap Log, the Findings Log) is a **human-entered** data structure describing what a **human** reviewer personally saw or heard. This boundary was never at risk of being crossed by this discovery pass and is recorded as explicitly preserved.

### 26.13 Architecture options compared (Phase 13)

| Option | Governance safety | Generic scalability | Provenance | Auditability | Correction | Complexity | Control coupling | LK compatibility | Report/signoff impact |
|---|---|---|---|---|---|---|---|---|---|
| **1. Clarify existing notes/rationale semantics (no structural change)** | Adequate — the E4/E5 split already exists | Already generic | Unchanged (weak, informal timestamp) | Unchanged (document-level only) | Unchanged | **Lowest — documentation only** | Unchanged (UI convention) | Unchanged (none) | None |
| **2. Generic structured `ReviewerObservation` concept (per-instance, timestamped, control-linked, list-valued)** | Strong — closes §26.6/§26.7's real gaps | High — one shape, many domains, matches the CRC-precedent discipline (§25.6: small, purpose-owned structures, not a mega-framework) | Strong if built to include reviewer/time/control/timecode | Strong | Would need its own append-vs-correct policy (not yet designed) | **Highest of the three real options** — schema, migration, UI, signoff-validation changes | Would formalize the existing informal C5→C6 link as data | Could become an LK/HRR context input if later authorized — not proposed here | Would need report-projection review (currently correctly excludes raw observations; a structured version might change that calculus, a future decision) |
| **3. Domain-specific observation structures (separate shapes for copyright/likeness/trademark/music)** | Would fragment the fail-closed, generic discipline this document has repeatedly found to be load-bearing (§25.6, §15) | **Low — explicitly what this milestone's own instructions and CAH-4I.2/4I.4's prior findings argue against** | Inconsistent across domains by construction | Inconsistent | Inconsistent | High, and repeated per domain | Ad hoc per control | Would repeat the anti-pattern `dependency-askability.ts`'s own header explicitly rejected once already (§25.6) | Inconsistent | **Rejected — no evidence supports it; strong presumption confirmed, not overridden** |
| **4. Treat uploaded media as evidence, leave observations implicit** | Weak — this is close to the *pre-CAH-4I.3* state for uploaded documents (present but unreachable/unexamined), and would discard the real, working Section-2 capture layer that already exists | N/A | None | Weakest | N/A | Lowest (do nothing) | None | None | None — **actively regresses** a working capability |

**Option 3 is rejected, per the task's own strong presumption, with direct evidence: `dependency-askability.ts`'s own header already documents choosing a small generic mechanism over per-domain frameworks once, for the identical reason, in this same codebase (§25.6).** Option 4 is rejected as a regression from the current state, not merely as insufficient. The realistic choice is between Option 1 (do nothing; the existing E4/E5 split and Section 2/3 structure already substantially answer PM's question) and Option 2 (a future, separately-authorized design milestone to close the specific, named gaps in §26.6/§26.7).

### 26.14 Recommended architecture (Phase 13/14)

**Recommend Option 1 now; scope Option 2 as a named future candidate, not as this milestone's output.** The evidence does not show the current architecture is broken or misrepresents the product — it shows a real, working, generically-structured observation layer with three specific, narrow, named incompleteness gaps: (a) no structural observation→investigation requirement (§26.6), (b) informal rather than structured timecode/location provenance (§26.7), (c) no data-level control linkage (§26.3). None of the three, individually or together, rises to "the product methodology depends on human audiovisual inspection but the architecture has no governed observation layer" (Phase 10's option C) — that classification would be **false** on this evidence, and this document does not assert it.

### 26.15 Claims challenged, rejected, or qualified

- **Challenged and refined:** the implicit premise that this milestone would be discovering something new. It is largely **confirming and hardening** a distinction (E4 vs. E5) CAH-4I.2 already made and this milestone's own earlier §23 review already endorsed — the genuine new contribution is code-level verification (`PRESENCE` vs. `JUDGMENT_OPTIONS`, `computeGates`, `signoff.ts`'s gate) that had not previously been checked at this level of detail.
- **Qualified:** "reviewer evaluates music/audio for third-party similarity" — downgraded from "explicitly required" (which the task's illustrative framing implied) to "structurally supported, methodologically less explicit than the visual mandate" (§26.1) — a real, if narrow, distinction the source does not fully support treating as identical to the visual case.
- **Rejected:** the premise that a new authority class or a domain-specific architecture is needed. Neither is supported.
- **Incidental finding, not requested but discovered via source verification and recorded rather than fixed (per this milestone's own no-implementation rule):** `Section3Evidence.tsx`'s `S2Banner` `warn` logic for `logos_observed` and `trademarks_observed` compares against the literal string `'No'` (`section2.logos_observed !== 'No'`), but the actual `PRESENCE` enum never contains that value (`'None observed' | 'Possible' | 'Confirmed'`) — meaning the "all clear" case (`'None observed'`) is miscompared and the warning banner likely renders even when nothing was observed. `copyrighted_artwork` and `music_heard`'s parallel checks correctly compare against `'None observed'`/`'None'`. This is a small, localized, mechanically-fixable UI bug, unrelated to any of this milestone's architectural conclusions, explicitly **not fixed here** — recorded for a future, narrowly-scoped bug-fix milestone.

### 26.16 Governance risks

- Building Option 2 without first deciding its report-projection policy (does a structured observation ever become customer-visible, and under what review) would repeat exactly the risk pattern CAH-4I.2 named for evidence generally (§7's V1-never-becomes-V2-by-restatement rule) — a structured observation is still V1/V3-adjacent, not automatically stronger evidence merely because it gained a timecode field.
- The informal "describe what you saw and at which timestamp" placeholder pattern is a real, working mitigation today, but it depends entirely on reviewer diligence with no system-level enforcement — acceptable given the single-reviewer, single-document signoff model, but worth naming as a soft spot rather than a hard guarantee.

### 26.17 PM decisions required

| # | Decision |
|---|---|
| D-9 | Should Option 2 (structured, timestamped, control-linked `ReviewerObservation`) be scoped as a future design milestone, given the three specific gaps named in §26.14, or is Option 1 (status quo, documentation-only clarification) sufficient indefinitely? |
| D-10 | Should an ambiguous (`Possible`) Section-2 observation be *required* to produce a Section-4 gap or Section-5 finding before signoff (closing §26.6's most concrete gap), independent of whether the fuller Option-2 structure is ever built? This is a smaller, cheaper decision than D-9 and could be adopted on its own. |
| D-11 | Should the Manual gain an explicit audio-similarity-listening sentence parallel to Domain I/L's visual mandate (§26.1), or is the current, less explicit treatment intentional? |

### 26.18 Smallest next milestone

**Not a design or implementation milestone for Option 2.** The smallest next step is a **governance decision milestone** resolving D-9 and D-10 — both answerable from this document without further source investigation, and D-10 in particular could independently justify a very small, tightly-scoped follow-on (a signoff-validation rule, not a schema change) if approved. The incidental `S2Banner` sentinel bug (§26.15) is a separate, unrelated, and much smaller candidate for its own narrow bug-fix milestone whenever convenient — it should not be bundled into whatever D-9/D-10 produces.

### 26.19 Runtime-change confirmation

None. This section is the only change made in this milestone.

### 26.20 Documentation / git state

Continued on the same isolated branch as CAH-4I.4 (`cah-4i4-submission-fact-acquisition-governance`), one commit above `06fbc62`. Not pushed, not merged, per this milestone's own instruction.

### 26.21 GO / HOLD / NO-GO

**HOLD** — not because the architecture is unsound (it is not; §26.10's classification is B, not C), but because §26.14's recommendation (Option 1 now, Option 2 scoped as a future candidate) itself depends on D-9/D-10, which are PM decisions this milestone can name but not make. This is a narrower, more optimistic HOLD than CAH-4I.4's own — this milestone found the underlying architecture materially sound, with small, specific, well-understood gaps, not an open design question requiring new invention.

---

## 27. CAH-4I.4B — Reviewer Observation Reconciliation Governance / Signoff Contract (2026-09-13)

**Status: GOVERNANCE / ARCHITECTURE ONLY. No schema, UI, signoff code, workbook field, control, or LK change is authorized by this section.** It re-derives, from a fresh direct read of `signoff.ts` (not from §26's own citations), whether an ambiguous or material Section-2 observation can currently be signed off without being accounted for — and if so, defines the smallest generic contract to close that gap, without designing or building it.

### 27.1 Current observation contract (re-verified, unchanged from §26)

`section_2` observation values remain the bounded `PRESENCE` enum (`'None observed' | 'Possible' | 'Confirmed'`, `Section2Visual.tsx:110`) with conditional free-text elaboration, distinct from `section_3`'s `JUDGMENT` enum. Nothing in this pass changes that finding; it is the premise this milestone builds on.

### 27.2 Current determination contract (re-verified)

`section_3` control judgments use `JUDGMENTS = ['Verified', 'Partially Verified', 'Not Provided', 'Not Applicable']` (`signoff.ts:122`, identical to `workbook-schema.ts`'s `JUDGMENT_OPTIONS`). Each control also carries its own descriptive sub-field(s) — e.g. `I03: {judgment, notes, trademark_elements}`, `I01: {evidence, judgment, notes, content_viewed, elements_identified}`, `L01: {judgment, notes, content_viewed, likeness_found}` (where `likeness_found` is itself a third, separate enum — `['None identified', 'Suspected — describe in notes', 'Confirmed — describe in notes']` — distinct from both `PRESENCE` and `JUDGMENT_OPTIONS`; noted, not resolved, in §26.9, and not re-opened here).

### 27.3 Current signoff behavior — read in full this pass, not excerpted from citation

`validateWorkbookForSignoff` (`signoff.ts:131-193`, read start-to-finish) checks, in order: Section 1's five scope-check booleans; the submission's two platform declarations; Section 2's `viewing_passes.first_complete` and `freeform_observations` length ≥ 20; **for Section 3, only that `JUDGMENTS.includes(s3[id].judgment)` for every control** — no check of any kind on `notes`, `elements_identified`, `trademark_elements`, `likeness_found`, or any other descriptive sub-field; Section 5's requirement of at least one non-empty finding *anywhere*, not per-domain or per-control; and Section 6's outcome/confidence/basis/conditions. **The function ends there — nothing after it.**

**This directly and conclusively answers Phase 1's question 5:** a reviewer can sign off today with `section_2.logos_observed = 'Confirmed'`, `section_2.logos_description` populated, `section_3.I03.judgment = 'Verified'`, and `section_3.I03.trademark_elements = ''` (empty) — the signoff function has no code path that would reject this. The same is true for `'Possible'` and for an "unresolved/ambiguous" observation left with no corresponding control text at all. **Phase 1's question 6 (is there already a "reconciled"/"investigated"/"disposition" concept) is answered no** — a repo-wide grep for `reconcil`, `disposition`, `investigat` across `app/` and `lib/` found no reviewer-observation-reconciliation concept anywhere; every hit was either an unrelated Report-boilerplate sentence ("chain of copyright investigations," `reportProjection.ts:438`) or unrelated code in other subsystems (CRC abuse-prevention, interview-engine decision logic, etc.).

### 27.4 Challenge to the proposed governance principle (Phase 2)

> "A reviewer observation that could materially affect an existing Commercial Assurance control must not itself determine that control, but it must be reconciled before assessment signoff."

**A. "Could materially affect" is not sufficiently bounded for a system contract — rejected as the trigger, not as the intent.** Materiality is exactly the judgment call the reviewer, not the system, is positioned to make, and the system already has a bounded proxy for it: **the reviewer's own choice of `PRESENCE` value.** Requiring the system to separately assess "could this materially affect a control" before requiring reconciliation would have the system second-guess the reviewer's primary judgment call before the reviewer has even acted on it — backwards, and unnecessary, because a deterministic trigger already exists: **`PRESENCE !== 'None observed'`** (i.e., `'Possible'` or `'Confirmed'`).

**B. Reconciliation should be required for both `'Possible'` and `'Confirmed'`, not one or the other.** Both states are the reviewer affirmatively flagging that something may be present; `'None observed'` is the only state that legitimately requires nothing further.

**C. Reconciliation does not require a new reviewer-entered *state*, but current authoritative state cannot yet *prove* it either — a small, additive check is needed, not a new field.** Re-derived directly: `judgment` being any valid enum value is already required and proves nothing about whether the observation was addressed (§27.3). What *would* prove it, using **fields that already exist** for every domain control with an observation link (`trademark_elements`, `elements_identified`, `likeness_found` + `notes`, `audio_source`/`license_provided`) — is requiring that field to be non-empty (or non-trivial, mirroring the existing `freeform_observations ≥ 20 chars` precedent already in `signoff.ts:162-163`) whenever the linked Section-2 observation is `'Possible'` or `'Confirmed'`. This needs one small, explicit, generic **observation-category → control mapping** (five or six entries, the same shape and size as `dependency-askability.ts`'s own registry) plus one additive signoff check function — not a new workbook field, not a new enum, not a new authority class.

**D. Requiring reconciliation must not force a stronger conclusion — verified safe by construction.** The proposed check only requires the descriptive *field* to be non-empty; it says nothing about what `judgment` value must be chosen. `'Not Provided'` and `'Partially Verified'` remain fully legitimate judgments under the check — the reviewer is required to *write something*, never to *resolve* anything.

**E. A legitimate reconciliation outcome may be unresolved, insufficient, "concern remains," or "not material to this control"** — confirmed compatible: nothing in the proposed check inspects the *content* of the descriptive field for a particular conclusion, only its presence. A reviewer writing "Possible logo observed at ~00:17; generic geometric shape, not identifiable as any specific mark; not material" and setting `judgment: 'Verified'` satisfies the check exactly as validly as one writing "Confirmed identifiable logo; no license on file" and setting `judgment: 'Not Provided'`.

**F. The current architecture does not already guarantee this indirectly** — conclusively re-verified in §27.3; this is not a restatement of §26's finding, it is that finding confirmed against the complete, unabridged validation function.

**Refined principle, replacing the original as too broadly framed:**

> **Any Section-2 observation recorded as `'Possible'` or `'Confirmed'`, for a category with an existing linked control, must be accompanied — before signoff — by non-trivial reviewer-authored text in that control's own descriptive field, regardless of what judgment the reviewer ultimately reaches for that control.**

This is materially narrower than the original (a deterministic enum trigger, not a judged "materiality" trigger) and materially safer to implement (it can never elevate or manufacture a conclusion, by construction, per D/E above).

### 27.5 Final reconciliation definition (Phase 3)

The candidate definition —

> "An observation is reconciled when the Human Reviewer has explicitly accounted for its relevance to the applicable Commercial Assurance control(s) through the governed assessment workflow, including where the resulting determination remains unresolved or insufficient."

— is sound in substance but under-specified in one place: **"through the governed assessment workflow" does not name which existing artifact counts.** Sharpened:

> **An observation is reconciled, for signoff purposes, when the reviewer has entered non-trivial, control-specific text addressing it — in that control's own descriptive field (the default path), or, for an observation category with no linked control, in a Section 5 finding naming the relevant domain (§27.7) — regardless of whether the resulting judgment is Verified, Partially Verified, Not Provided, or Not Applicable. Reconciliation proves attention was paid and recorded. It never itself constitutes evidence, sufficiency, authorization, clearance, or a legal conclusion.**

Per Phase 3's own preference ("prefer no new state if existing authoritative state can prove reconciliation without ambiguity"): **no new reviewer-entered fact or state is introduced.** The definition is built entirely from fields that already exist (`notes`, `elements_identified`, `trademark_elements`, `likeness_found`, `audio_source`, Section 5's `finding`/`domain`) plus one new, additive, generic **signoff-time check** — closest to Phase 3's options 2 ("derived from existing determination completion") and 4 ("a signoff invariant spanning observation + existing control state") combined.

### 27.6 Observation → control relationship (Phase 4) — discriminating examples

| # | Observation | Linked control | Reconciliation obligation? | Legitimate reconciled outcome | Signoff consequence today (unreconciled) |
|---|---|---|---|---|---|
| 1 | Possible logo in background | I03 (`logos_observed`/`trademarks_observed`) | Yes | `judgment` + non-empty `trademark_elements`, any conclusion | **Currently passes signoff with `trademark_elements` empty — the gap** |
| 2 | Character resembling a known fictional character | I01 (`copyrighted_artwork`, not `logos_observed` — a copyright-character concern, not a trademark/logo one) | Yes | `judgment` + non-empty `elements_identified` | Same gap, I01 instead of I03 |
| 3 | Music sounds potentially familiar | I02 (`music_heard`) | Yes | `judgment` + non-empty `audio_source` (or `notes`, whichever the reviewer used to record the concern) | Same gap |
| 4 | Person may resemble an identifiable natural person | L01/L02 (`real_likeness_suspected`) | Yes | `judgment` + `likeness_found` set beyond its default, or `notes` populated | Same gap |
| 5 | "None observed" | — | **No** — the clean case; nothing to reconcile | N/A | No gap; correctly requires nothing |
| 6 | Possible issue; reviewer determines insufficient evidence | Whichever domain applies | Yes | `judgment: 'Not Provided'` + notes explaining the insufficiency — **explicitly legitimate**, not a failure to reconcile | Would now require the explanatory text; does not require resolution |
| 7 | Possible issue; reviewer determines not material to the control | Whichever domain applies | Yes | `judgment` (Verified or Not Applicable, reviewer's call) + notes explaining why it's immaterial — **explicitly legitimate** | Same — text required, conclusion not dictated |
| 8 | Confirmed presence; authorization evidence missing | Whichever domain applies | Yes | `judgment: 'Not Provided'` (already the Manual's own prescribed outcome, e.g. Manual:483) + notes | Already the Manual's expected path; the check would simply require the notes to exist |

**No example manufactures a legal conclusion.** In every row, the reconciliation obligation is satisfied by presence of reviewer-authored text, never by any particular value of `judgment`.

### 27.7 Signoff invariant (Phase 5)

Refined from the candidate shape given, resolving each open question against source:

> IF `section_2.<observation_field>` is `'Possible'` or `'Confirmed'` for a category with a linked control (per a small, explicit, generic mapping — not inferred), THEN signoff must fail closed unless that control's own descriptive field is non-trivial (mirroring the existing `≥ 20 chars` convention already used for `freeform_observations`). For `unexpected_content` (no linked control), the same fail-closed rule applies against **Section 5** instead — at least one finding must exist whose `domain` is populated and whose `finding` text is non-trivial, when `unexpected_content = true`.

Resolved questions:
- **What existing state proves "accounted for"?** Non-triviality of the linked control's own descriptive sub-field (or, for `unexpected_content`, a populated Section-5 finding) — nothing else.
- **Can the reviewer legitimately sign with an unresolved/insufficient determination?** Yes, unconditionally — §27.4.D/E.
- **Does the gate require resolution or merely an explicit bounded disposition?** Merely a bounded disposition. Never resolution.
- **How should `unexpected_content` behave?** Routed to Section 5, not forced into the same control-mapping table as the other categories — Section 5 is already domain-scoped rather than control-scoped, making it the correct existing home for an observation with no natural control, rather than a reason to invent one.
- **Would a generic gate accidentally make `unexpected_content` impossible to complete?** Only if wrongly forced into the control-mapping approach; routing it to Section 5 instead avoids that failure mode entirely.
- **Is this a signoff concern, workbook-schema concern, or methodology guidance?** Primarily a **signoff concern** (an additive check in `signoff.ts`, reusing existing fields — no schema change for the five mapped categories); only a light **methodology-guidance** note is needed for the `unexpected_content` → Section 5 routing, since Section 5 already exists.

### 27.8 D-9 / D-10 / D-11 — restated exactly, then decided

> **D-9** (§26, verbatim): *"Should Option 2 (structured, timestamped, control-linked `ReviewerObservation`) be scoped as a future design milestone, given the three specific gaps named in §26.14, or is Option 1 (status quo, documentation-only clarification) sufficient indefinitely?"*
> **Decision: ACCEPT WITH QUALIFICATION.** This milestone's signoff-invariant design closes the *reconciliation* gap — the most material of §26.14's three — without needing Option 2's full per-instance/timestamped structure. Option 2 remains a legitimate future candidate for the *other* two gaps (structured timecode provenance, data-level control linkage) if a future need (e.g., legal discoverability) is demonstrated, but is **not** required to solve reconciliation specifically. Not accepted or rejected outright — narrowed to what it would actually still be for.

> **D-10** (§26, verbatim): *"Should an ambiguous (`Possible`) Section-2 observation be required to produce a Section-4 gap or Section-5 finding before signoff (closing §26.6's most concrete gap), independent of whether the fuller Option-2 structure is ever built? This is a smaller, cheaper decision than D-9 and could be adopted on its own."*
> **Decision: ACCEPT WITH QUALIFICATION — the mechanism is refined, not the goal.** This milestone finds the *precise* location for the required text should be **the linked control's own descriptive field** (already existing, already control-specific) as the default path, with Section 4/5 reserved for the one category (`unexpected_content`) that has no linked control. D-10 as originally framed (route everything through Section 4/5) would work but is less precise than reusing each control's own field — the control's field is a tighter, more directly relevant place to require the explanation than a general gap/finding log, and requires no cross-referencing between logs and controls to audit later. This is a genuine refinement of D-10, recorded explicitly rather than silently substituted.

> **D-11** (§26, verbatim): *"Should the Manual gain an explicit audio-similarity-listening sentence parallel to Domain I/L's visual mandate (§26.1), or is the current, less explicit treatment intentional?"*
> **Decision: DEFER — unchanged.** Nothing in this milestone's reconciliation analysis bears on Manual wording; D-11 is an independent methodology-completeness question, correctly left exactly where §26 left it.

### 27.9 Separate backlog items (Phase 7) — kept explicitly out of scope

1. **`Section3Evidence.tsx` `'No'` vs. `'None observed'` sentinel mismatch:** re-confirmed, not re-derived (already verified against the literal `PRESENCE` enum in §26.15/CAH-4I.4A) — this is a genuine, narrow, unrelated UI bug. **Not fixed here.** Recorded as its own tiny bug-fix candidate.
2. **Structured timestamp/location provenance:** re-tested against this milestone's own reconciliation definition — **not required.** Reconciliation as defined (§27.5) needs only that non-trivial text exist in the linked field; it does not need a machine-parseable timecode. The existing informal "describe what you saw and at which timestamp" placeholder remains sufficient for reconciliation specifically. A stronger, structured provenance need (e.g., for legal discoverability) is a separate question, unaffected by this decision.
3. **Customer-report projection of observations:** untouched. Reconciliation is an internal signoff concern; nothing here changes what `reportProjection.ts` projects.
4. **Living Knowledge integration:** untouched. No observation is wired into LK or retrieval by this milestone, and none is proposed.
5. **Trademark LK onboarding:** untouched, separate workstream.
6. **Submission questionnaire / fact acquisition:** untouched. No CertForm question is added, removed, or reworded.

### 27.10 Architecture invariants — explicitly re-verified against the proposed contract

- **Reviewer observation ≠ reviewer determination:** preserved — the check requires text in the determination section but never sets or infers the judgment value itself.
- **Submitter disclosure ≠ reviewer observation:** untouched by this milestone; no interaction proposed between the two.
- **Evidence ≠ fact ≠ sufficiency:** preserved — non-trivial text is required, not any particular evidentiary weight or sufficiency conclusion.
- **Observation cannot itself create a legal conclusion:** preserved by construction (§27.4.D) — the check never reads or constrains the *content* of the required text, only its non-emptiness.
- **Bounded Interpretation remains the conclusion ceiling:** unaffected — this contract is entirely within the reviewer-authored workbook layer; it does not touch LK, Retrieval, or Bounded Interpretation in any way.
- **Signoff fails closed where required:** this is the entire point of the proposed invariant, and it extends (does not weaken) the existing fail-closed pattern already in `signoff.ts`.
- **No domain-specific orchestration unless proven necessary:** the mapping table is small and generic (one shape, five or six entries, reused identically per category) — the same discipline already demonstrated safe by `dependency-askability.ts`'s own registry; `unexpected_content`'s Section-5 routing reuses an existing generic mechanism rather than inventing a domain-specific one.
- **No automatic LK conclusion from reviewer observation:** untouched, unchanged.
- **Human Reviewer retains assessment authority:** preserved — the reviewer chooses the judgment value and the wording; the system only verifies non-emptiness.
- **Unresolved/insufficient evidence remains a legitimate bounded outcome:** explicitly and repeatedly confirmed (§27.4.E, §27.6 rows 6–7).
- **Commercial Assurance remains human-reviewed:** unaffected — nothing here is automated interpretation of the observation's content; only its presence is checked, mechanically, the same way `freeform_observations`' length already is.

All eleven hold under the proposed contract as designed; none required weakening or a workaround.

### 27.11 Implementation gate (Phase 9)

**B — SMALL GENERIC IMPLEMENTATION JUSTIFIED**, not built in this milestone. The smallest future implementation, if separately authorized, would be:

1. A small, explicit, generic constant mapping Section-2 observation-category keys to `{control_id, descriptive_field}` (five or six entries: `logos_observed`/`trademarks_observed` → I03/`trademark_elements`; `copyrighted_artwork` → I01/`elements_identified`; `music_heard` → I02/`audio_source`; `real_likeness_suspected`/`synthetic_humans` → L01/`likeness_found` — exact field choices for the L-domain and any consolidation across `logos_observed`+`trademarks_observed` sharing one I03 field are implementation detail for that future milestone, not decided here).
2. One additive function in `signoff.ts`, alongside the existing checks, applying that mapping plus a `≥ N` non-trivial-length check (reusing the existing `trim().length` pattern already in the file) — no new import, no new dependency, no schema change.
3. One additional rule for `unexpected_content` requiring a populated Section-5 finding when true.

This is explicitly **not** authorized to be built now.

### 27.12 Remaining open questions

- The exact minimum-length threshold for "non-trivial" (this milestone reused the existing 20-character convention as a plausible default; a future milestone should decide it deliberately, not inherit it silently).
- Whether `logos_observed` and `trademarks_observed` should map to the *same* I03 field (as they do today in the UI, §26.3) or whether the future signoff check should require the field to actually discuss *both* concerns when both are non-`'None observed'` — a real, small design question for the future milestone, not resolved here.
- Whether any assessment currently in `DRAFT`/pre-signoff state would newly fail this check if adopted retroactively — not investigated in this milestone (would require querying live data, out of scope for a documentation/governance pass).

### 27.13 Smallest next milestone

**A small, scoped implementation-design milestone** (not documentation-only, unlike D-9/D-10 themselves, which this milestone has now resolved) — specifically: design and build the signoff-invariant described in §27.11, resolving §27.12's two open design questions first. This is smaller and more concrete than CAH-4I.4A's own recommended next step, because this milestone converted D-10 from an open governance question into a scoped, safe, small design.

### 27.14 Runtime-change confirmation

None. This section is the only change made in this milestone.

### 27.15 Documentation / git state

Committed on the same isolated branch as CAH-4I.4/4I.4A (`cah-4i4-submission-fact-acquisition-governance`), one commit above `79f3d4b`. Not pushed, not merged, per this milestone's own instruction.

### 27.16 GO / HOLD / NO-GO

**GO — for scoping the §27.11 implementation as a future milestone.** Unlike CAH-4I.4/4I.4A's HOLDs, this milestone resolved its own central open question (D-10) rather than merely naming it, using evidence gathered this pass (the complete, unabridged `validateWorkbookForSignoff` read) rather than deferring further. The remaining open items (§27.12) are small, scoped design decisions appropriate for the implementation milestone itself, not further governance review.

---

## 28. CAH-4I.4C — Reviewer Observation Reconciliation Implementation Design (2026-09-13)

**Status: DESIGN / VERIFICATION ONLY. No schema, UI, signoff code, workbook field, or control change is authorized by this section.** Its purpose was explicitly to verify, not extend, CAH-4I.4B's proposed mechanism — and the verification pass **found real errors in CAH-4I.4B's own sketch**, corrected below rather than carried forward.

**Repository note (Phase 0):** mid-milestone, the shared working directory was found checked out on `main` at a merge commit (`f4347c6`, "Merge EU AI Act Article 50 governance/evidence package") rather than this branch — a different concurrent session's activity, not this milestone's. Verified via `git reflog` before touching anything: this branch and all three prior CAH-4I.4 commits (`06fbc62`, `79f3d4b`, `226c48f`) were fully intact and untouched. Verified the merge's 17 changed files (`git diff --name-only 5a95065 f4347c6`) have zero overlap with any file this milestone reads or would touch. A second collision occurred later in the same milestone — a concurrent session switched the shared working directory to `main` and then to a third branch (`work/lk-knowledgetopic-foundation`) mid-edit; the edit tool detected the on-disk mismatch and refused to write rather than silently overwriting, so nothing was lost, and this branch's commits were re-confirmed intact before resuming. Neither `main` nor `origin/main` was touched, rebased, or merged by this work.

### 28.1 Canonical observation inventory (Phase 1) — every `section_2` field, read exhaustively this pass, not sampled

`Section2Visual.tsx` read in full (not excerpted). Every field, its actual widget/enum, and whether it carries rights/observation semantics at all:

| Field | Widget / actual options | Carries a Possible/Confirmed-style judgment? |
|---|---|---|
| `video_url_confirmed`, `runtime_observed`, `scene_count`, `aspect_ratio`, `pacing`, `color_treatment` | Text/Num/Sel, purely technical | No |
| `viewing_passes.*` | Check, procedural | No (gates entry, not an observation) |
| `synthetic_humans` | `Sel`, options `['None', '1–2', 'Several (3–10)', 'Many (10+)']` | **No — a quantity descriptor, not a resemblance judgment.** Textually adjacent to likeness but structurally a different axis. |
| `real_likeness_suspected` | `Sel`, options **hand-typed** `['None identified', 'Possible', 'Confirmed']` — **not** the shared `PRESENCE` constant, and its "clean" sentinel (`'None identified'`) differs from `PRESENCE`'s (`'None observed'`) | Yes |
| `real_likeness_description` | Conditional `Textarea` (shown when `Possible`/`Confirmed`) | N/A — this is the *observation's own* elaboration, not a control-accounting field |
| `animals_present`, `children_present` | Check | No |
| `has_audio`, `speech_heard`, `sound_effects`, `audio_quality_issues` | Check/Text, technical | No |
| `music_heard` | `Sel`, options **hand-typed** `['None', 'Generic / royalty-free', 'Identifiable track', 'Possibly identifiable']` — **four values, not three; not the shared `PRESENCE` constant** | Yes, but the trigger is *not* "≠ `'None'`" — `'Generic / royalty-free'` is also a clean, non-concerning state |
| `text_visible` / `text_description` | Check + conditional `Textarea` | Ambiguous — see §28.3 |
| `logos_observed` | `Sel`, `options={[...PRESENCE]}` — **literally spreads the shared constant** | Yes, standard `PRESENCE` |
| `trademarks_observed` | `Sel`, `options={[...PRESENCE]}` — **literally spreads the shared constant** | Yes, standard `PRESENCE` |
| `landmarks_observed` | `Sel`, `options={[...PRESENCE]}`, with legacy boolean→string normalization | Yes, standard `PRESENCE` |
| `copyrighted_artwork` | `Sel`, `options={[...PRESENCE]}` | Yes, standard `PRESENCE` |
| `ai_artifacts`, `temporal_consistency`, `visual_quality` | `Sel`, technical/quality severity scales (one, `ai_artifacts`, coincidentally starts with the string `'None observed'` but is not spread from `PRESENCE` and has no rights semantics) | No |
| `unexpected_content` / `unexpected_description` | Check + conditional `Textarea` | Yes — already established (CAH-4I.4A/4B) as generic and control-less |
| `freeform_observations`, `overall_first_impression` | `Textarea` | N/A — general-purpose, already signoff-gated as a whole (≥20 chars), not per-category |

**Correction to CAH-4I.4A/4B, made explicit rather than silently absorbed:** only **four** fields (`logos_observed`, `trademarks_observed`, `landmarks_observed`, `copyrighted_artwork`) actually share the literal `PRESENCE` constant and its `'None observed'` sentinel. `real_likeness_suspected` and `music_heard` are separately hand-typed with **different** vocabularies and **different** "clean" sentinels. CAH-4I.4A's citation of these fields as if they were uniformly `PRESENCE`-shaped was imprecise; this milestone's own signoff-invariant design in §27 did not yet depend on that imprecision, but a future implementation would have failed silently if it assumed one universal trigger condition (`value !== 'None observed'`) across all six fields — `real_likeness_suspected` would never trigger (it never equals `'None observed'`, so a naive check comparing against that string would treat every value, including the real `'None identified'` clean state, as requiring reconciliation), and `music_heard` would over-trigger on `'Generic / royalty-free'`, a state that should not require reconciliation.

`synthetic_humans` is excluded from the reconciliation-relevant set entirely — it is a count, not a judgment, and this milestone found no control or Manual passage that treats it as a trigger in its own right (only `real_likeness_suspected` carries the actual resemblance judgment).

### 28.2 Canonical control / accounting-field inventory (Phase 1)

Re-read `workbook-schema.ts` `section_3` and `Section3Evidence.tsx`'s per-control JSX in full this pass:

| Control | Fields | Accounting shape |
|---|---|---|
| I01 | `{evidence, judgment, notes, content_viewed, elements_identified}` | `elements_identified` (Textarea) is the specific descriptive field; `notes` is general-purpose; `content_viewed` (bool) is a generic "watched independently" flag, not tied to any specific observation |
| I02 | `{judgment, notes, audio_source, license_provided, audio_reviewed}` | `audio_source` (Textarea) + `notes`; `audio_reviewed` (bool) generic, same caveat as `content_viewed` |
| I03 | `{judgment, notes, trademark_elements}` | `trademark_elements` (Textarea) is the specific descriptive field — **shared by both `logos_observed` and `trademarks_observed`**, confirming a genuine "multiple observations → one control (one field)" case |
| L01 | `{judgment, notes, content_viewed, likeness_found}` | `likeness_found` is itself a **third** enum (`['None identified', 'Suspected — describe in notes', 'Confirmed — describe in notes']`), distinct from both `PRESENCE` and `real_likeness_suspected`'s own enum — but string-typed like every other field, so a non-empty/non-default check still applies uniformly |
| L02 | `{judgment, notes, performers_present, distinctness}` | **Conditional shape, read in full this pass**: `performers_present` (bool) gates whether `distinctness` (Sel, 3 options) is shown/required at all — accounting is "`performers_present` explicitly recorded, AND if true, `distinctness` non-empty," not simply "one field non-empty" |
| L03 | evidence-sufficiency control, not an observation-accounting control (unchanged from CAH-4I.4A) | N/A |

### 28.3 Explicit vs. inferred relationships (Phase 2) — the discipline the task required

Classified per the task's own A/B/C scheme, not assumed:

- **Category A (Manual/schema/control-name established):** `logos_observed`+`trademarks_observed`→I03 (the control is literally named "Brand, Logo, and Trademark Elements"); `copyrighted_artwork`→I01 (Manual:477 names "artwork, distinctive architectural work" under Domain I's own decision logic); `real_likeness_suspected`→L01/L02 (Manual:497-530's explicit Domain L mandate, and L02's own `distinctness` field is worded almost identically to the resemblance question); `music_heard`→I02 (I02 is explicitly the audio/music control).
- **Category B (UI-label-implied only):** `text_visible`/`text_description` — the placeholder text ("Any brand or IP references?") *suggests* a connection to I01/I03, but no Manual sentence or control definition establishes it, and no other source ties it to a specific control by name. **Per the task's own instruction ("only A should normally be eligible for a hard signoff mapping"), this field is excluded from the mapping.** It remains a legitimate free-text observation with no reconciliation obligation attached, pending a future, separate PM/Manual decision if one is ever wanted.
- **Category C (would have to be invented):** none found. Every field with genuine rights/observation semantics maps to an existing control under Category A, except the two below.
- **Newly confirmed, previously unflagged:** `landmarks_observed` has **no linked control at all** — a second instance of the `unexpected_content` problem, not identified in CAH-4I.4A or CAH-4I.4B. The Manual and Schema name no "Location/Landmark Clearance" control anywhere in the 16-control set, yet the field's own placeholder ("Could they trigger location clearance requirements?") shows real commercial-risk intent behind its existence.

### 28.4 Accounting-field suitability (Phase 3)

Tested each candidate field against the task's nine questions. All are genuinely reviewer-authored (persisted only via the same authenticated reviewer's own workbook edits), part of the relevant control's own record, intended to capture control-specific reasoning, persisted in `workbook_data`, survive signoff (protected by the same report-binding stale-report invalidation already covering the whole document), and mutable up to signoff. **The one substantive risk the task asked to check: could a field be non-empty for reasons unrelated to the triggering observation?** Yes, in principle, for any free-text field — a reviewer could paste boilerplate, or text left over from editing a different concern. This milestone does **not** propose solving that by semantic analysis (explicitly rejected, §28.5). It is accepted as a known, bounded limitation: the mechanical predicate proves *attention*, not *correctness of content* — exactly what CAH-4I.4B already defined reconciliation to mean (§27.5), and no stronger claim is made here.

### 28.5 Challenge to the "non-trivial text" proxy (Phase 4)

| Option | Verdict |
|---|---|
| **A — non-empty text (`trim().length > 0`)** | **Selected**, for the reasons under D below. |
| **B — minimum length ("non-trivial")** | **Rejected, per the task's own explicit skepticism, and independently re-derived here.** A length threshold (the 20-character convention already used for `freeform_observations`) creates exactly the "fake rigor" risk named in the prompt: a reviewer could type 20 characters of meaningless filler and pass, while a genuinely complete but terse answer ("Generic logo, no mark" — 21 characters, coincidentally passes; "N/A" — 3 characters, fails) is judged by an arbitrary count that has no relationship to whether the observation was actually addressed. Non-emptiness (Option A) already proves the reviewer took an affirmative action distinct from leaving a field at its default; a length threshold adds no additional real guarantee, only false precision. **Rejected.** |
| **C — new explicit reconciliation boolean/state** | Rejected as unnecessary — §27.5 already established existing fields suffice; inventing a new field the reviewer must separately check would add a second, redundant place to record the same fact the descriptive field already records, and risks a reviewer checking the box without actually writing anything (worse than today, not better). |
| **D — existing control judgment-completion alone** | **Rejected — this is exactly the status quo CAH-4I.4B already proved is insufficient** (§27.3: `judgment` being any valid enum value is already required today and does not prevent the empty-`trademark_elements` case). |
| **E — another existing structural signal** | Considered: the generic `content_viewed`/`audio_reviewed` booleans (I01, I02, L01) are a candidate *complementary* signal (a reviewer affirmatively confirming independent review occurred) but do not, on their own, prove the *specific* flagged observation was addressed — a reviewer could have checked it from routine habit unrelated to what they observed. **Not selected as a substitute for the descriptive-field check; could optionally be required in addition to it in a future implementation, but that is an enhancement decision for that milestone, not a requirement this design imposes.** |

**Non-trivial-text proposal (CAH-4I.4B's own phrasing): QUALIFIED — accepted in substance, corrected in threshold.** "Non-trivial" is replaced with plain non-emptiness (Option A); the word "trivial" implied a judgment this milestone found no safe, non-semantic way to operationalize, and the length-threshold instantiation of it is explicitly rejected above.

### 28.6 Selected mechanical predicate (Phase 5)

```
hasReviewerAccounting(value: unknown): boolean {
  return typeof value === 'string' && value.trim().length > 0
}
```

Applied per mapping entry (not universally) against the specific field(s) named in §28.7's table — for entries with a conditional shape (L02), the predicate is composed as described there, still built entirely from this same primitive plus an explicit boolean check, never from text content inspection.

**Why this does not judge substantive sufficiency (Phase 5's own required proof):** the predicate takes a single field's raw value and asks only whether a human typed something into it. It has no access to, and makes no use of, what the *other* fields say (the triggering observation's own value, the chosen `judgment`, any other control) — it cannot and does not compare the text's content against the observation, evaluate whether the explanation is legally sound, or influence what `judgment` value is legitimate. It is the same shape of check `signoff.ts` already performs for `freeform_observations` and `section_6.basis`, just without the arbitrary length threshold those two already (perhaps unnecessarily) carry — this milestone does not recommend revisiting those two existing checks, which are out of scope here.

### 28.7 Final canonical mapping (Phase 2/6/7) — corrected, complete, and precise enough to implement without further governance decisions

| Observation field | Trigger condition | Category | Linked control | Accounting requirement | Signoff consequence if unmet |
|---|---|---|---|---|---|
| `logos_observed` | `value ∉ {'', 'None observed'}` | A | I03 | `trademark_elements` non-empty | Fail closed |
| `trademarks_observed` | `value ∉ {'', 'None observed'}` | A | I03 (**same field** as above — one control, satisfied once) | `trademark_elements` non-empty | Fail closed |
| `copyrighted_artwork` | `value ∉ {'', 'None observed'}` | A | I01 | `elements_identified` non-empty | Fail closed |
| `real_likeness_suspected` | `value ∉ {'', 'None identified'}` **(note: different sentinel than `PRESENCE`)** | A | L01 and, where `synthetic_humans` context indicates a synthetic performer specifically, L02 | L01: `likeness_found` non-default-empty **or** `notes` non-empty. L02: `performers_present` explicitly set (`true` or `false`), **and if `true`**, `distinctness` non-empty | Fail closed |
| `music_heard` | `value ∈ {'Identifiable track', 'Possibly identifiable'}` **(not `≠ 'None'`)** | A | I02 | `audio_source` non-empty **or** `notes` non-empty | Fail closed |
| `landmarks_observed` | `value ∉ {'', 'None observed'}` | **A relationship to a concern exists; no control exists** | none | At least one Section-5 finding with non-empty `domain` and `finding` | Fail closed, via the Section-5 fallback (§28.8), not a control field |
| `unexpected_content` | `=== true` | Established (CAH-4I.4A/4B) | none, by design | Same Section-5 fallback | Fail closed |
| `text_visible` | — | **B — excluded from the hard mapping** | — | — | No signoff consequence; unchanged from today |
| `synthetic_humans` | — | **Excluded — not a judgment field** | — | — | No signoff consequence |

**One observation → one control:** `copyrighted_artwork`→I01, `music_heard`→I02, `real_likeness_suspected`→L01 (primary). **Multiple observations → one control:** `logos_observed` + `trademarks_observed` → I03 (same field). **One observation → multiple controls:** `real_likeness_suspected` → L01 and, conditionally, L02. **Mixed** is therefore the correct general answer to Phase 2's question, not a uniform 1:1 assumption.

### 28.8 `unexpected_content` and `landmarks_observed` — the uncontrolled-observation fallback (Phase 7)

Both resolved the same way, for the same reason, confirmed from source: **Option B (exclude from a control-specific hard mapping; route to the existing generic Section-5 fallback) — not Option A (force into a control that doesn't own it) and not Option C (a genuine architecture gap requiring new design).** `unexpected_content` was already so classified in CAH-4I.4A/4B; `landmarks_observed` is newly found to need the identical treatment, for the identical reason (a real commercial concern with no owning control), and this milestone applies the already-established rule rather than inventing a new one. **No fake control is created merely to make the mapping symmetrical**, matching the task's own explicit instruction.

### 28.9 Multi-control / multi-observation / correction behavior (Phase 6) — all twelve cases

1. **One observation → one control:** covered, §28.7.
2. **One observation → multiple controls:** `real_likeness_suspected` → L01 and L02 — both must satisfy their own accounting requirement independently; satisfying one does not satisfy the other.
3. **Multiple observations → one control:** `logos_observed` + `trademarks_observed` → I03's single `trademark_elements` field — either observation being triggered requires the same one field to be non-empty; if both are triggered, the single non-empty field satisfies both (there is no way to distinguish which prompted it, and this milestone does not propose inventing one — a coarser but honest outcome).
4. **Relevant control unresolved:** legitimate — `judgment` may be any value; the predicate does not read `judgment` at all.
5. **Relevant control insufficient evidence:** legitimate, same reasoning — `'Not Provided'` is a fully valid `judgment` alongside a non-empty accounting field.
6. **Relevant control passes ('Verified'):** legitimate, unaffected.
7. **Relevant control fails (no equivalent "fail" state exists in `JUDGMENT_OPTIONS`** — the closest is `'Not Provided'`, already covered above).
8. **Accounting text entered before the observation was recorded:** the predicate is stateless and re-evaluated at signoff time only — order of entry during drafting is irrelevant; only the final persisted values at the moment of signoff matter.
9. **Observation changes `None observed` → `Possible`:** the trigger becomes active; if the linked accounting field is still empty from before, signoff now fails closed where it previously would have passed — correct, intended behavior.
10. **Observation changes `Possible` → `None observed`:** the trigger becomes inactive; a previously-required accounting field is no longer required (though any text already there is simply left in place — nothing is cleared automatically, and this design does not propose clearing it).
11. **Observation changes `Possible` → `Confirmed`:** no change in required behavior — both values trigger the same requirement identically; there is no escalation in the accounting requirement itself between the two.
12. **Accounting text later becomes blank** (edited down to empty after having been non-empty): the predicate is re-evaluated fresh each time signoff is attempted — a blank field fails closed exactly the same as one that was never filled in. **No correction/supersession machinery is introduced or required** — this is the same "revision-tracked as a whole document" behavior `workbook_data` already has (§27's own finding), not a new per-field history mechanism.

### 28.10 Mapping ownership / location (Phase 8)

**A single, small, dedicated constant — not inline in `signoff.ts`, not duplicated into the UI.** Precedent already established twice in this codebase for exactly this shape and size of decision (`dependency-askability.ts`'s ~1-entry-today, generically-shaped registry; this document's own §25.6 finding that such registries are deliberately kept small, separate, and purpose-owned rather than merged). The mapping expresses only *structural* relationships (`observation field → control id → accounting field(s) → shape`), never legal reasoning — consistent with the task's own example distinction ("`observation category → existing control/accounting surface`," not "`logo → trademark infringement investigation`"). `Section3Evidence.tsx`'s existing hand-written `S2Banner` calls (§26.3, §28.2) would ideally read from the same constant in a future refactor to eliminate the current UI/signoff duplication risk, but that consolidation is not required to ship the signoff check itself and is noted as a nice-to-have, not a blocker.

### 28.11 Signoff failure-message contract (Phase 9)

**One error per unmet mapping entry (not per observation-field, not per control) is the correct deterministic unit**, because a single control (I03) can be the accounting target for two different observation triggers (§28.9 case 3) — emitting one error per *entry* naturally collapses to one message even when two observation fields point at the same requirement, avoiding duplicate, confusing errors about the same missing field.

Message shape, conceptually (not implemented): *"You recorded [Possible/Confirmed] for [observation label]. Account for this in [control label]'s notes before signoff."* — names the observation and the destination, never a legal conclusion, matching the task's own good/bad examples exactly. For the Section-5 fallback: *"You recorded [unexpected content / a possible landmark]. Add a Finding (Section 5) accounting for it before signoff."*

### 28.12 Authority / governance firewall (Phase 10) — explicitly proven, not asserted

The predicate (§28.6) reads exactly one field's type and trimmed length. It has no branch, lookup, or dependency that could interpret content, infer infringement, infer missing rights, infer likeness violation, infer copyrightability, infer trademark status, judge evidence sufficiency, choose a `judgment` value, or require any particular outcome. It cannot require a PASS: `'Not Provided'` and `'Partially Verified'` satisfy it identically to `'Verified'` (§28.9 cases 4–6). It does not touch `submissions` (submitter facts), Living Knowledge, Retrieval, or Bounded Interpretation in any way — it is entirely internal to the reviewer's own `workbook_data`. It creates no new Commercial Assurance control (§26.11's conclusion stands, unmodified). **The firewall reduces to exactly the sentence the task itself specifies:** a Human Reviewer recorded a governed observation that requires accounting; therefore the Human Reviewer must explicitly account for it before signoff — nothing more is enforced, and nothing less.

### 28.13 Section3Evidence bug — re-verified a third time, still not fixed (Phase 11)

Re-traced end-to-end this pass, independently of the two prior confirmations: `S2Banner`'s `warn` prop (`Section3Evidence.tsx:123-143`) renders an amber-vs-gray chip based on the caller-supplied boolean; the I03 and L01 call sites (`:217`, `:251-252`, `:266`) compute that boolean as `value !== 'No'`, but `logos_observed`/`trademarks_observed`/`real_likeness_suspected` never take the literal value `'No'` (their real "clean" sentinels are `'None observed'` and `'None identified'` respectively) — so the comparison is always true for any non-empty value, including the clean case, and the banner likely renders amber even when nothing was observed. `copyrighted_artwork`/`music_heard`'s parallel checks (`:218`, `:234`) correctly compare against their own real sentinels (`'None observed'`, `'None'`) and do not share this defect.

**Interaction with this milestone's own design:** the bug affects only banner *coloring* in the UI, not the `section_2`/`section_3` field values themselves, and not the mechanical predicate in §28.6 (which never reads `warn` or any UI-computed boolean). **It could create visual noise during a future UAT** (a tester seeing an amber "clean" banner might mistakenly think reconciliation should be required when it should not), so it is worth fixing **before** UAT of the future signoff implementation, though it does not need to be fixed before the implementation is *designed* or even *built* — the signoff check reads raw field values, not banner colors. **Recommendation: fix as its own tiny, separate milestone, scheduled before (not bundled into) the future implementation's UAT phase.** Not fixed here.

### 28.14 Exact future implementation scope (Phase 12)

Files a future, separately-authorized milestone would touch — identified, not edited:

1. **New:** a small constant module (e.g. `lib/assessments/observation-reconciliation.ts` or similar — exact naming/location is that milestone's own small decision) containing `hasReviewerAccounting()` and the §28.7 mapping table.
2. **Modified:** `lib/assessments/signoff.ts` — one additive block in `validateWorkbookForSignoff`, after the existing Section 3 check, applying the mapping.
3. **Modified (optional, not required to ship):** `Section3Evidence.tsx` — could import the same mapping constant to eliminate the `S2Banner` call-site duplication, and, if fixed then, correct the §28.13 bug in the same pass.
4. **No changes to:** `workbook-schema.ts` (no new fields), any migration, any UI form structure, `reportProjection.ts`, or any test file until the implementation milestone writes its own.

### 28.15 Test matrix (Phase 12)

| Case | Expected |
|---|---|
| Every observation `'None observed'`/`'None identified'`/`'None'`/`false` | Signoff not blocked by this check |
| `'Possible'` with empty accounting field | Blocked |
| `'Confirmed'` with empty accounting field | Blocked |
| `'Possible'`/`'Confirmed'` with non-empty accounting field | Not blocked by this check |
| `judgment` = `'Verified'`, `'Partially Verified'`, `'Not Provided'`, `'Not Applicable'` — each paired with a satisfied accounting requirement | Not blocked, in every case — proves the check never inspects `judgment` |
| Whitespace-only accounting text (`'   '`) | Blocked — `trim().length > 0` fails |
| `logos_observed = 'Confirmed'`, `trademarks_observed = 'None observed'`, `trademark_elements` non-empty | Not blocked — one shared field satisfies both |
| `real_likeness_suspected = 'Possible'`, L02 `performers_present = false` | Not blocked — an explicit `false` is a complete answer |
| `real_likeness_suspected = 'Possible'`, L02 `performers_present = true`, `distinctness = ''` | Blocked |
| `unexpected_content = true`, no Section-5 finding | Blocked |
| `landmarks_observed = 'Possible'`, a Section-5 finding exists with non-empty `domain`/`finding` | Not blocked |
| An unrelated control (e.g. R02) with its own pre-existing judgment requirement | Unaffected — proves no cross-contamination with existing checks |
| Full existing signoff test suite (if one exists for `signoff.ts`) | Zero new failures — this is additive only |

### 28.16 Implementation gate (Phase 13)

**A — READY FOR SMALL GENERIC IMPLEMENTATION.** Every entry in §28.7's mapping now has a fully specified, non-ambiguous, purely structural trigger, target field(s), and required shape — including the two conditional/multi-field cases (I03's shared field; L02's gated `distinctness`) and the two uncontrolled categories (routed identically to Section 5, not invented separately). The one Category-B relationship found (`text_visible`) is excluded by consistent application of the task's own stated rule, not left as an open judgment call. No remaining entry requires a new governance decision before a future milestone can implement it directly from §28.7/§28.14/§28.15.

### 28.17 Remaining risks / open decisions

- Whether `content_viewed`/`audio_reviewed` should be required *in addition to* the descriptive-field check (§28.5, Option E) — a genuine enhancement decision, not a blocker, left to the implementing milestone.
- Whether the future implementation should also update `Section3Evidence.tsx` to read from the same mapping constant (closing the UI/signoff duplication and, incidentally, the §28.13 bug) in the same change, or as a strictly separate follow-up — a sequencing preference, not an open architectural question.
- The exact module name/location for the new mapping constant (§28.14 item 1) — a naming decision, not a design one.

### 28.18 Smallest next milestone

**The implementation itself** (§28.14), now that this milestone has resolved D-10's mechanism precisely enough to build from directly — **but the §28.13 UI bug should be fixed first, as its own separate, smaller, unrelated milestone**, so that the future implementation's UAT is not confused by a miscolored banner while verifying reconciliation behavior.

### 28.19 Runtime-change confirmation

None. This section is the only change made in this milestone.

### 28.20 Documentation / git state

Committed on the same isolated branch as CAH-4I.4/4I.4A/4I.4B (`cah-4i4-submission-fact-acquisition-governance`), one commit above `226c48f`. Not pushed, not merged. `main`/`origin/main` moved independently during this milestone (§28's repository note) but were not touched by this work.

### 28.21 GO / HOLD / NO-GO

**GO.** This is the first CAH-4I.4 sub-milestone to reach a clean **A** implementation-readiness gate rather than a HOLD — the verification pass this milestone was chartered to perform found and corrected real errors in the prior sketch (§28.1's `PRESENCE`-sharing correction; §28.3's second uncontrolled category) rather than rubber-stamping it, which is what makes the resulting mapping trustworthy enough to build from without further governance review.

---

## 29. CAH-4I.4D — Section3Evidence Clean-State Presentation Bug Fix (2026-09-13)

**Status: SMALL RUNTIME BUG FIX, IMPLEMENTED.** The presentation defect independently re-verified in §26.15, §27.13, and §28.13 is fixed in this milestone. No observation semantics, enums, reviewer determinations, controls, signoff behavior, reconciliation behavior, schema, database, report projection, Living Knowledge, CRC, or submission questions were changed.

**Repository note:** this milestone experienced the most severe concurrent-session interference of the CAH-4I series so far — a working-tree edit was made, then transiently appeared reverted (working tree briefly showed clean against the buggy source) before reappearing correctly, consistent with another concurrent session's own `stash`/checkout activity in this same shared directory (that session's own 10 unrelated, in-progress `lib/crc-engine/`, `lib/retrieval-engine/`, `lib/reviewer-lk/`, `lib/hrr/`, `lib/crc-sales/` modifications were visible throughout and were never touched, staged, or committed by this work). Verified via direct `grep` re-check and `git branch`/`git rev-parse HEAD` immediately before staging that this branch, `fd4ad4f`, and the actual fix content were all correct before committing. `git add` was scoped to exactly the two files below; the other session's ten files were confirmed excluded from the staged diff before commit.

### 29.1 Bug re-proven from source (Phase 1)

**A. Canonical clean-state value(s):** `logos_observed`/`trademarks_observed` share the literal `PRESENCE` constant (`Section2Visual.tsx:110`, `['None observed', 'Possible', 'Confirmed']`) — clean sentinel `'None observed'`. `real_likeness_suspected` has its own, separately hand-typed enum (`Section2Visual.tsx:214-216`, `['None identified', 'Possible', 'Confirmed']`) — clean sentinel `'None identified'`. Neither enum contains the string `'No'`.

**B. Presentation condition found in source, four occurrences, all identical in shape:** `Section3Evidence.tsx` lines 217, 251, 252, 266 (pre-fix) each computed `warn: !!section2.<field> && section2.<field> !== 'No'`.

**C. Is `'No'` a valid value for these fields?** No — confirmed by direct enumeration of both enums above; the string never appears in either.

**D. Exact UI consequence:** because the comparison is against a string the field can never equal, `warn` evaluates `true` for *any* non-empty value of the field, including its own real clean sentinel — the clean-observation banner chip (`S2Banner`, same file, lines 123-144) renders with amber/warning styling (`border-amber-300 bg-amber-50 text-amber-800`) instead of neutral styling (`border-gray-200 bg-white text-gray-600`) whenever a reviewer records `'None observed'`/`'None identified'`.

**E. Scope of effect, confirmed by reading the full render path:** styling only — specifically, which of two pre-defined Tailwind class strings is applied to one `<span>`. Confirmed this does **not** affect: the persisted `section_2`/`section_3` field values (the `warn` boolean is computed inline at render time and is never written back anywhere); the label or value text shown (`String(i.value)` renders regardless of `warn`); reviewer workflow, judgment selection, or signoff (`signoff.ts`'s `validateWorkbookForSignoff`, re-confirmed by grep this pass, contains no reference to `warn`, `S2Banner`, or any color/styling computation).

**Classification: CONFIRMED — a real, source-proven presentation-only defect.** Not merely re-asserted from CAH-4I.4A/B/C's own citations — independently re-traced end to end in this milestone before any edit was made.

### 29.2 Fix (Phase 2/4)

Four literal string replacements, one per occurrence, using each field's own already-correct canonical clean value — no shared constant introduced, no new abstraction, no helper function, no import added:

| Line (pre-fix) | Control | Field | Before | After |
|---|---|---|---|---|
| 217 | I01 | `logos_observed` | `!== 'No'` | `!== 'None observed'` |
| 251 | I03 | `logos_observed` | `!== 'No'` | `!== 'None observed'` |
| 252 | I03 | `trademarks_observed` | `!== 'No'` | `!== 'None observed'` |
| 266 | L01 | `real_likeness_suspected` | `!== 'No'` | `!== 'None identified'` |

The already-correct comparisons for `copyrighted_artwork` (`!== 'None observed'`) and `music_heard` (`!== 'None'`) were left untouched — confirmed by diff inspection (§29.5) and by the test's own regression guard (§29.3). `real_likeness_suspected`'s distinct sentinel (`'None identified'`, not `'None observed'`) was deliberately preserved as its own, different value — per CAH-4I.4C's own finding that these fields carry genuinely different vocabularies, this fix does not collapse them into one.

### 29.3 Regression test (Phase 3)

No component-rendering test convention exists anywhere in this repository (`jest.config.js` uses `testEnvironment: 'node'`; no `@testing-library/react` dependency). Introducing DOM-rendering infrastructure for a four-line string-literal fix would be disproportionate, per the task's own explicit escape hatch. Instead: `__tests__/reviewer-workbook/section3-evidence-clean-state.test.ts` — a source-contract test reading `Section3Evidence.tsx`'s own text and asserting, via targeted regex extraction, that each field's warn-comparison sentinel matches its real canonical clean value, that the literal string `'No'` never appears as a warn-comparison sentinel anywhere in the file, and that the two already-correct comparisons remain unchanged (a regression guard against this fix accidentally touching them). **Proven to genuinely discriminate the bug**: run against the pre-fix source, 4 of 5 tests failed; run against the post-fix source, all 5 passed (§29.6).

### 29.4 Concerning-state behavior preserved (Phase 3/6, "J")

Unaffected: the fix only changes which literal string a field's value is compared *against* for the amber/gray styling choice — it does not change the enum, the field, the styling classes themselves, or the fact that `'Possible'`/`'Confirmed'` (and `real_likeness_suspected`'s own `'Possible'`/`'Confirmed'`) still evaluate `warn: true` exactly as before. No test or code path was found that would suggest otherwise.

### 29.5 Semantic non-change verification (Phase 5)

`git diff` on the staged change (§29 repository note) shows exactly 8 lines changed (4 removed, 4 added) in `Section3Evidence.tsx`, all four inside `warn:` expressions, none touching: `workbook-schema.ts` (not modified), `Section2Visual.tsx` (not modified — observation collection unchanged), `signoff.ts` (not modified, and confirmed by grep this pass to contain no reference to the changed expressions), `reportProjection.ts` (not modified), any control's `judgment`/`notes`/descriptive fields (the `Textarea`/`Sel` elements below each `S2Banner` are untouched), or any evidence-reachability code from CAH-4I.3 (untouched). Reviewer authority and assessment-outcome logic are unaffected — nothing in this fix reads or writes `judgment`, `outcome`, `commercial_confidence`, or any signoff field.

### 29.6 Tests / typecheck / build (Phase 6)

- New regression test: 5/5 passing (confirmed failing pre-fix, passing post-fix — a genuine before/after proof, not just a passing test written after the fact).
- `tsc --noEmit`: clean, no output.
- Full suite: **77 pre-existing failures / 20 pre-existing failing suites — identical to the baseline independently confirmed twice already in the CAH-4I.3 milestone.** Zero new failures. (Total test count rose by exactly 5, all passing, matching the new file.)
- `next build` not re-run this pass — the pre-existing environment limitation documented in CAH-4I.3 (missing `SUPABASE_URL` blocking unrelated API-route page-data collection) is unrelated to this change and `tsc`'s clean result already covers what a build's type-checking phase would additionally reveal for this specific edit.

### 29.7 PM visual-UAT contract (Phase 7) — not executed

1. **Clean observation:** reviewer records `logos_observed = 'None observed'` (or `trademarks_observed`, or `real_likeness_suspected = 'None identified'`) → open the corresponding control (I01/I03/L01) → expect the §2 observation banner chip to render in **neutral gray**, not amber.
2. **Concerning observation:** reviewer records `'Possible'` or `'Confirmed'` for the same field → expect the chip to render in **amber**, exactly as before this fix.
3. **Persistence:** navigate away from and back to the control (or reload the workbook) → the recorded observation value is unchanged — confirmed structurally by this fix touching no write path, only a render-time comparison.

### 29.8 Documentation / git state (Phase 8/9)

**Runtime files changed:** exactly two — `08_Platform/app/app/admin/submissions/[id]/review/Section3Evidence.tsx` (4 literal edits) and the new test file `08_Platform/app/__tests__/reviewer-workbook/section3-evidence-clean-state.test.ts`. Verified via `git diff --cached --stat` immediately before commit that no other file was staged, and via `git status` that the other concurrent session's ten unrelated modified files remained present but untouched and unstaged. Branch confirmed (`cah-4i4-submission-fact-acquisition-governance`) and HEAD confirmed (`fd4ad4f`, this milestone's own parent) immediately before staging. Not pushed, not merged, main/origin main untouched.

### 29.9 Relationship to CAH-4I.4E

This milestone was a prerequisite, not a substitute: CAH-4I.4C's reconciliation mapping and predicate are unaffected by and independent of this fix (the reconciliation predicate never reads `warn` or any UI-computed value). CAH-4I.4E may now proceed using CAH-4I.4C's verified mapping without the risk this milestone was chartered to remove — a future reviewer testing reconciliation behavior will no longer see a miscolored clean-state banner that could be mistaken for a reconciliation signal.

### 29.10 Remaining risks

- The other concurrent session's ten unrelated in-progress files remain uncommitted in this shared working directory as of this milestone's close — not this milestone's responsibility, not touched, but worth the next session in this directory being aware they are still there.
- No new risks specific to this fix were identified — it is a minimal, fully tested, semantically-verified presentation correction.

### 29.11 Smallest next milestone

**CAH-4I.4E — Reviewer Observation Reconciliation Implementation**, using CAH-4I.4C's verified observation→control→accounting-field mapping (§28.7) and structural reconciliation predicate (§28.6) directly, now unblocked by this fix.

### 29.12 GO / HOLD / NO-GO

**GO.** Success criterion met: the clean observation state renders correctly, a concerning observation still renders as concerning, and nothing about Commercial Assurance semantics or signoff changed — confirmed by source diff inspection, not merely asserted.

---

## 30. CAH-4I.4E — Reviewer Observation Reconciliation Implementation (2026-09-13)

**Status: IMPLEMENTED.** The signoff invariant designed in CAH-4I.4C is now live: a reviewer cannot sign a workbook while a non-clean audiovisual observation lacks structurally-present reconciliation in its mapped existing field, while remaining completely agnostic about what conclusion the reviewer reaches.

**Repository/concurrency note:** this milestone experienced the most severe interference of the CAH-4I series to date — the shared main working directory was found, before any edit, checked out on a *third* unrelated branch (`work/lk-knowledgetopic-foundation`, with a new commit already on top of the earlier Article-50 merge). Given the repository already has an established convention of ~10 dedicated worktrees for concurrent isolated work, this milestone followed that precedent rather than continuing in the shared directory: a new worktree was created (`git worktree add`, purely additive, touching no other worktree or branch) checked out to the existing isolated `cah-4i4-submission-fact-acquisition-governance` branch, and all implementation work was performed there. `node_modules` (not git-tracked) was linked via a directory junction to the main worktree's existing install rather than reinstalling — a read-only reference, not a write. All work in this section was done entirely inside that dedicated worktree; the shared main directory was not touched again after Phase 0.

### 30.1 Lineage re-verification (Phase 0)

Confirmed in the new worktree before any edit: branch `cah-4i4-submission-fact-acquisition-governance`, HEAD `135f57a` (CAH-4I.4D), clean working tree, and all five prior CAH-4I.4 commits present (`06fbc62`, `79f3d4b`, `226c48f`, `fd4ad4f`, `135f57a`).

### 30.2 Re-derivation from current source (Phase 1) — no drift found

Re-checked directly in the new worktree, not assumed from CAH-4I.4C's own citations: `PRESENCE` enum (`Section2Visual.tsx:110`) unchanged; `real_likeness_suspected` options (`['None identified', 'Possible', 'Confirmed']`) unchanged; `music_heard` options (`['None', 'Generic / royalty-free', 'Identifiable track', 'Possibly identifiable']`) unchanged; `section_3` control shapes (`workbook-schema.ts`) unchanged; `section_5` findings shape unchanged; `signoff.ts` contained no pre-existing reconciliation logic (confirmed by grep). **CAH-4I.4C's mapping was found fully current — no discrepancy, no STOP required.**

### 30.3 Final observation inventory / vocabularies / clean sentinels (Phase 2, E/F/G/H final report items)

| Observation field | Vocabulary | Clean sentinel | Trigger |
|---|---|---|---|
| `logos_observed` | shared `PRESENCE` | `'None observed'` | `∉ {'', 'None observed'}` |
| `trademarks_observed` | shared `PRESENCE` | `'None observed'` | `∉ {'', 'None observed'}` |
| `copyrighted_artwork` | shared `PRESENCE` | `'None observed'` | `∉ {'', 'None observed'}` |
| `landmarks_observed` | shared `PRESENCE` (legacy-normalized) | `'None observed'` | `∉ {'', 'None observed'}` |
| `real_likeness_suspected` | own, separate enum | `'None identified'` | `∉ {'', 'None identified'}` |
| `music_heard` | own, four-value enum | `'None'` **and** `'Generic / royalty-free'` (both clean) | `∈ {'Identifiable track', 'Possibly identifiable'}` |
| `unexpected_content` | boolean | `false` | `=== true` |
| `text_visible` | boolean | — | **excluded — no reconciliation obligation** (Category B relationship only, per CAH-4I.4C, unchanged here) |
| `synthetic_humans` | count enum | — | **excluded — not a judgment field** (unchanged from CAH-4I.4C) |

### 30.4 Final mapping (Phase 2/6, G)

Implemented in `08_Platform/app/lib/assessments/observation-reconciliation.ts`:

| Observation | Target | Satisfied by |
|---|---|---|
| `logos_observed` **or** `trademarks_observed` | I03 (shared) | `trademark_elements` non-empty |
| `copyrighted_artwork` | I01 | `elements_identified` non-empty |
| `real_likeness_suspected` | L01 (only — see below) | `likeness_found` non-empty **or** `notes` non-empty |
| `music_heard` | I02 | `audio_source` non-empty **or** `notes` non-empty |
| `landmarks_observed` | Section 5 (no control) | ≥1 finding with non-empty `domain` **and** `finding` |
| `unexpected_content` | Section 5 (no control) | same fallback, shared with `landmarks_observed` |

**A scope decision made and documented, not silently resolved:** `real_likeness_suspected` maps only to L01, not additionally to L02 as CAH-4I.4C's own design left open ("where `synthetic_humans` context indicates..."). L02's `performers_present` boolean defaults to `false`, which is structurally indistinguishable from "the reviewer explicitly recorded no performers present" — enforcing it as a required gate would require inventing a new touched/untouched tri-state, which this design deliberately does not do. L01's plain-string fields (`likeness_found`, `notes`) have a clean empty/non-empty distinction and are used as the sole required target. This is recorded in the module's own header comment, not hidden.

### 30.5 Structural predicate (Phase 3, I/J)

```ts
function isNonEmptyString(value: unknown): boolean {
  return typeof value === 'string' && value.trim().length > 0
}
```

No minimum-length threshold (explicitly rejected in CAH-4I.4C as "fake rigor," re-confirmed here). Proven by construction and by direct test (`observation-reconciliation.test.ts`, "authority firewall" describe block) that the predicate's result is identical regardless of the linked control's `judgment` value — `'Verified'`, `'Partially Verified'`, `'Not Provided'`, `'Not Applicable'`, and even an arbitrary/undefined value all produce the same block/pass behavior, driven entirely by the accounting field's non-emptiness.

### 30.6 Signoff invariant (Phase 5, J)

One additive block in `validateWorkbookForSignoff` (`signoff.ts`), inserted immediately after the existing Section 3 judgment-completeness loop:

```ts
for (const issue of findUnreconciledObservations(wb)) {
  reasons.push(issue.message)
}
```

Existing validation is unmodified and remains authoritative; this only adds new possible entries to the same `reasons` array every other check already populates. No mutation, no new persisted state, no judgment-setting, no outcome inference.

### 30.7 Failure-message contract (Phase 5/9, K)

Example: *"Account for the observed logo/trademark element in Control I03's notes before signoff."* — names the observation category and the destination field, never a legal or commercial conclusion. Directly tested (`signoff-reconciliation.test.ts`, "failure-message contract") against six forbidden patterns (`infring`, `resolve the`, `obtain rights`, `cannot pass`, `violation`, `insufficient evidence detected`) — none match.

### 30.8 Special cases (Phase 6, L/M/N/O)

- **Shared targets (L):** `logos_observed` and `trademarks_observed` both target `I03.trademark_elements`; if both trigger and the field is empty, exactly **one** issue is raised (not two) — tested directly.
- **`unexpected_content` (M):** routed to the Section-5 fallback exactly as CAH-4I.4C specified; no new control created.
- **`landmarks_observed` (N):** routed to the identical Section-5 fallback, sharing it with `unexpected_content` — if both trigger, one qualifying finding satisfies both (tested); if neither has one, two independent issues are raised (tested).
- **`real_likeness_suspected` (O):** confirmed its own distinct enum is used, not the shared `PRESENCE` sentinel — its clean state (`'None identified'`) does not accidentally trigger, and L02 is deliberately excluded from the hard gate (§30.4).
- **`text_visible`:** confirmed absent from the implementation entirely — the CAH-4I.4C Category-B exclusion was preserved, not silently converted into a governed relationship.

### 30.9 Correction / current-state semantics (Phase 8, Q)

No new correction/supersession or historical-state machinery was added or is needed. `findUnreconciledObservations` is a pure function re-evaluated fresh against whatever workbook state is passed to it — a correction from non-clean to clean removes the requirement immediately; a change from clean to non-clean introduces it immediately; reconciliation text added satisfies it; the same text later deleted re-introduces the requirement with no memory of the prior satisfied state. All four directions directly tested.

### 30.10 Unresolved / insufficient outcomes (R)

Explicitly and repeatedly tested: text documenting "unable to determine," "insufficient evidence," or any adverse (`'Not Provided'`) judgment all satisfy the reconciliation gate identically to a favorable (`'Verified'`) one with equivalent text — the gate has no opinion on which outcome is correct.

### 30.11 Authority-firewall verification (Phase 7, S)

Proven, not merely asserted: `findUnreconciledObservations` reads exactly two kinds of input per rule — a Section-2 observation value (string or boolean) and a Section-3/Section-5 field's type + trimmed length. It contains no code path capable of reading, comparing, or reasoning about text content beyond emptiness; no code path writes to the workbook; no code path reads or sets `judgment`, `outcome`, or `commercial_confidence`. It is therefore structurally incapable of deciding infringement, rights sufficiency, copyrightability, trademark status, likeness authorization, music licensing, or any assessment outcome — these categories of decision simply have no representation anywhere in the function's inputs or logic.

### 30.12 Runtime files changed (T)

- **New:** `08_Platform/app/lib/assessments/observation-reconciliation.ts`.
- **New:** `08_Platform/app/__tests__/assessments/observation-reconciliation.test.ts` (32 tests).
- **New:** `08_Platform/app/__tests__/assessments/signoff-reconciliation.test.ts` (21 tests).
- **Modified:** `08_Platform/app/lib/assessments/signoff.ts` — one import line + one 7-line additive block.
- **No changes to:** `workbook-schema.ts`, `Section2Visual.tsx`, `Section3Evidence.tsx`, `reportProjection.ts`, any migration, any API route, any Living Knowledge or CRC file.

### 30.13 Tests / regression results (U/V)

- New tests: 53/53 passing (32 pure-module + 21 signoff-integration), covering all 19 of CAH-4I.4C's discriminating cases plus the failure-message contract and an explicit authority-firewall proof.
- **Test-first discipline honored, not just claimed:** the signoff-integration test file was run against the *unmodified* `signoff.ts` first and produced 9 failing / 12 passing (proving the gap existed exactly as designed), then re-run after the additive integration and produced 21/21 passing.
- Full existing `assessments`/`reviewer-workbook`/`reviewer-lk`/`reviewer-evidence` suites: only 2 pre-existing failures (`mock-provider.test.ts`, `MockProvenanceProvider` — a mock asset-ID generator, zero relationship to `signoff.ts` or this change), independently reconfirmed as pre-existing by stashing this milestone's entire changeset and re-running the same file, which failed identically.
- Full repository suite: **77 pre-existing failures — identical to the baseline independently confirmed multiple times earlier in the CAH-4I.3/4I.4D milestones.** Zero new failures.
- `tsc --noEmit`: clean.

### 30.14 PM UAT contract (Phase 10, X) — not executed

Scenarios A-F as specified in the task, mapped directly onto the implemented mapping: **A** (all-clean) → not blocked; **B** (logo/trademark) → blocked with the §30.7 message, clears once accounting text is entered including an unresolved conclusion; **C** (likeness) → correctly targets L01, not a `PRESENCE`-style comparison; **D** (music) → triggers on `'Identifiable track'`/`'Possibly identifiable'`, clears on either `'None'` or `'Generic / royalty-free'`; **E** (unresolved) → gate accepts the documentation structurally, existing control/signoff rules independently govern the judgment; **F** (correction) → reverting to the clean value removes the requirement with no stale state.

### 30.15 Documentation / git state (Y/Z)

This section, appended in the dedicated worktree, chronology preserved (§25-29 untouched). Committed locally on `cah-4i4-submission-fact-acquisition-governance` (see final report for the exact SHA) inside the dedicated worktree; not pushed, not merged, main/origin main untouched throughout.

### 30.16 Runtime-scope confirmation (AA)

Confirmed via `git diff --check` and file-by-file inspection immediately before staging: exactly one existing file modified (`signoff.ts`, additive only), one new lib module, two new test files, one doc section. No schema, migration, UI, API route, report-projection, Living Knowledge, or CRC file touched.

### 30.17 Remaining limitations / risks (AB)

- L02 remains outside the hard reconciliation gate for likeness observations (§30.4) — a deliberate, documented scope decision, not an oversight; revisiting it would require a governance decision about whether a boolean's default value may ever function as a valid "explicitly answered" signal, which this milestone correctly declines to make unilaterally.
- The Section-5 fallback for `unexpected_content`/`landmarks_observed` is workbook-wide (any one qualifying finding satisfies both), not per-observation — an honest, structural limitation already anticipated and accepted in CAH-4I.4C rather than a new gap introduced here.
- `Section3Evidence.tsx`'s `S2Banner` UI was not updated to read from the same mapping constant (CAH-4I.4C §28.10 noted this as an optional, non-blocking future consolidation) — the signoff invariant and the UI banner remain two independently-correct but separately-maintained representations of similar information.

### 30.18 Smallest next milestone (AC)

None required by this milestone's own success criterion, which is now met. Any further CAH-4I work (L02 inclusion, UI/signoff mapping consolidation, CertForm askability governance from CAH-4I.4's own D-1/D-2) is a separate, later decision, not implied or begun here.

### 30.19 GO / HOLD / NO-GO (AD)

**GO.** Success criterion met exactly: a reviewer cannot sign off while a current non-clean audiovisual observation lacks structurally-present reconciliation in its mapped field, proven by 53 passing tests including a before/after proof of the gap's existence and closure; the implementation remains completely agnostic about what conclusion the reviewer reaches, proven by explicit tests pairing every `JUDGMENT_OPTIONS` value with both an empty and a satisfied accounting field and observing identical pass/block behavior driven only by text presence.

---

## 31. CAH-4I.4F — Reviewer Observation Reconciliation UAT / Integration Gate (2026-09-13)

**Status: AUTOMATED VERIFICATION COMPLETE AND RE-CONFIRMED. LIVE PM UAT NOT PERFORMED — INFRASTRUCTURE UNAVAILABLE TO THIS CLI SESSION. INTEGRATION HELD PENDING LIVE UAT OR EXPLICIT PM AUTHORIZATION.** This section is deliberately honest about the boundary between what was re-verified by source/test inspection and what would require a live, deployed, credentialed environment this session does not have — the same boundary this document's own institutional history (referenced in `COMMERCIAL_ASSURANCE_ARCHITECTURE_INDEX.md`'s CAH-4G entries, e.g. CAH-4G.8/4G.10C) has repeatedly and explicitly drawn rather than papered over.

### 31.1 Repository/worktree re-verification (Phase 0)

Confirmed in the dedicated CAH-4I.4E worktree (`C:/Users/User/Desktop/si8-cah4i4e-reconciliation`): branch `cah-4i4-submission-fact-acquisition-governance`, HEAD `1709e8d`, working tree clean, no in-progress merge/rebase/cherry-pick, full CAH-4I.4 lineage intact (`06fbc62`→`79f3d4b`→`226c48f`→`fd4ad4f`→`135f57a`→`1709e8d`). `origin/main` fetched for awareness: `f4347c6`, 6 ahead / 7 behind (unrelated drift, not yet inspected for overlap — deferred to §31.9 since integration itself is held, per §31.2). No STOP condition triggered — this is the correct isolated worktree, no runtime overlap found, no unexplained working-tree state.

### 31.2 Why integration (Phase 7) is not attempted in this milestone

The task's own Phase 3 instruction governs directly: *"If deployment is not yet available, do NOT fabricate UAT results. If CLI cannot deploy or inspect production directly, provide the exact PM handoff steps and stop at the appropriate gate."* Checked directly: no `.env.local` exists in this worktree (only `.env.local.example`), confirming no live Supabase credentials are configured; the branch is local-only and unpushed, so no Vercel preview deployment exists for it (per this repo's own documented deployment model — Vercel auto-deploys from GitHub pushes to `main`, and this branch has never been pushed); this CLI session has no admin-authenticated browser session and no Claude-in-Chrome connection established. **Live, credentialed, browser-based PM UAT against a real (or synthetic) reviewer workbook is therefore not executable from this session — not a failure, an infrastructure absence.** Per Phase 6/7's own gating ("only if all required UAT scenarios pass" / STOP on failure or inconclusive), and per this milestone's explicit prohibition on fabricating results, **Phase 7 (rebase/integration/push to main) is correctly withheld.**

### 31.3 What WAS re-verified (Phases 1-2, in full)

- **Phase 1 (contract re-verification):** `git show 1709e8d` re-read in full. Confirmed: the mapping is exactly as designed (§30.4, unchanged); clean sentinels remain field-specific (`'None observed'` for the `PRESENCE`-style fields, `'None identified'` for `real_likeness_suspected`, and both `'None'`/`'Generic / royalty-free'` for `music_heard`); the predicate remains exactly `typeof value === 'string' && value.trim().length > 0`, nothing more; no judgment-value inspection exists anywhere in `observation-reconciliation.ts`; no legal/rights conclusion is inferred anywhere (re-confirmed by re-reading the module's full source, not just its diff); unresolved/insufficient dispositions remain structurally permitted (nothing checks disposition, only presence); exactly 5 files are touched by the whole CAH-4I.4E commit, none of them schema, API, report-projection, Living Knowledge, or CRC files.
- **Phase 2 (automated re-verification):** re-ran `observation-reconciliation.test.ts` (32), `signoff-reconciliation.test.ts` (21), `signoff-integrity.test.ts`, `signoff-public-record.test.ts`, and the full `reviewer-workbook` suite together — **128/128 passing.** `tsc --noEmit`: clean. Full repository suite: **77 pre-existing failures, identical to the baseline independently confirmed at least three times earlier in this arc (CAH-4I.3, CAH-4I.4D, CAH-4I.4E) — zero new failures, re-confirmed once more in this milestone.**

### 31.4 UAT preconditions assessment (Phase 3) — the honest gate

| Precondition | Status |
|---|---|
| Implementation deployed to a reviewer-UAT-accessible environment | **No** — branch is local-only, unpushed |
| Test submission is internal/synthetic | Would need to be created once deployed — not yet applicable |
| No real customer assessment affected | Cannot be affirmed or denied without a live environment; moot until deployed |
| PM can access the reviewer workbook | Not from this CLI session — no admin browser session, no Claude-in-Chrome connection active |
| Reconciliation behavior active in deployed code | **No deployed code exists yet for this branch** |

**None of the five preconditions are met.** Per the task's own instruction, this milestone does not proceed to fabricate Phase 4-6 results against a nonexistent deployment.

### 31.5 Scenario-by-scenario status (Phases 4-5)

For each scenario, two columns are reported honestly and never conflated: **Live PM UAT** (requires deployment + admin browser access — not available this session) and **Automated equivalent** (the exact scenario's logic, re-run this pass against the committed implementation, in `signoff-reconciliation.test.ts`/`observation-reconciliation.test.ts`).

| Scenario | Live PM UAT | Automated equivalent (re-run this pass) |
|---|---|---|
| A — Clean observation | **INCONCLUSIVE — not performed, no live environment** | PASS — `completeWorkbook()` with `logos_observed: 'None observed'` signs cleanly (test 1) |
| B — Possible logo/trademark | **INCONCLUSIVE** | PASS — blocked empty (tests 2-3), neutral message confirmed (failure-message contract test), clears on ordinary text (test 5) |
| C — Unresolved/insufficient | **INCONCLUSIVE** | PASS — explicit "unable to determine"/"insufficient evidence" text satisfies the gate identically to any other text (tests 6-7); safety-critical case directly covered |
| D — Likeness | **INCONCLUSIVE** | PASS — targets L01 correctly, does not use the shared `PRESENCE` sentinel (test 15; pure-module tests confirm the distinct enum throughout) |
| E — Music | **INCONCLUSIVE** | PASS — triggers only on `'Identifiable track'`/`'Possibly identifiable'`; both clean states (`'None'`, `'Generic / royalty-free'`) confirmed non-triggering (test 16 + pure-module music tests) |
| F — Correction / no stale state | **INCONCLUSIVE** | PASS — non-clean→clean removes the block immediately with no added text (test 17); clean→non-clean introduces it (test 18) |
| G — Shared target | **INCONCLUSIVE** | PASS — `logos_observed`+`trademarks_observed` both triggered, one field satisfies both, exactly one issue when unmet (test 11 + pure-module shared-target tests) |
| H — Unexpected/landmarks fallback | **INCONCLUSIVE** | PASS — both route to the Section-5 fallback exactly as designed (tests 13-14 + pure-module fallback tests) |

**No scenario is classified as a live PASS.** Classifying any of them as "PASS" against real production/reviewer behavior would be exactly the fabrication this milestone is instructed not to commit. The automated-equivalent column is offered as strong, real, re-executed supporting evidence — not a substitute for the live UAT the task requires before integration.

### 31.6 Authority-firewall / neutral-message / unresolved-outcome re-confirmation (M/N/O)

All re-confirmed by direct re-read of the committed source and re-run tests, not carried forward from the CAH-4I.4E report without re-checking: the predicate reads no `judgment` field anywhere in `observation-reconciliation.ts` (grep-confirmed this pass); the failure message (*"Account for the observed logo/trademark element in Control I03's notes before signoff."*) contains none of the six forbidden legal-conclusion patterns (re-run test, passing); unresolved/insufficient-evidence text satisfies the gate identically to any other non-empty text (re-run tests 6-7, C-scenario's automated equivalent).

### 31.7 Correction / no-stale-state re-confirmation (P)

Re-run this pass: reverting `logos_observed` from `'Confirmed'` to `'None observed'` with the accounting field still empty removes the block immediately (test 17) — the predicate is stateless and re-evaluated fresh against whatever workbook state is passed to it; no historical/audit machinery exists or is needed.

### 31.8 Origin/main drift (Q) — not yet actioned

`origin/main` is at `f4347c6`, 7 commits ahead of this branch's own base (`5a95065`) — unrelated EU AI Act Article 50 and Living-Knowledge-topic-foundation work, per the branch names observed during this arc's own repository-safety checks. **Not inspected for file-level overlap in this milestone**, because integration itself is correctly held pending live UAT (§31.2) — inspecting drift in detail now would be preparatory work for a gate this milestone does not reach, and is deferred to whichever future milestone actually performs the integration once UAT evidence exists.

### 31.9 Integration / rebase / push (R-U) — NOT PERFORMED

No rebase, no range-diff, no push. `main`/`origin/main` untouched by this milestone, exactly as required when the integration gate is not reached.

### 31.10 PM handoff — manual UAT script (for when live access exists)

To be run by whoever has admin access to a deployed instance of this branch (or a merged preview), against one internal synthetic submission, one scenario at a time, recording actual observed behavior rather than expected behavior:

1. **Deploy this branch** (or have it merged/previewed) so the reconciliation check is live.
2. **Scenario A:** On a synthetic submission's workbook, Section 2 → set "Logos observed" to `None observed`. Attempt signoff (with everything else complete). Expect: not blocked by any reconciliation-related message.
3. **Scenario B:** Set "Logos observed" to `Possible` or `Confirmed`. Leave I03's "Trademark/brand elements" field empty. Attempt signoff. Expect: blocked, with a message naming the observation and Control I03 — never a legal conclusion. Then type any non-empty text (e.g. *"Observed a possible logo in the background; unable to determine significance from the submitted material."*) into that field. Attempt signoff again. Expect: no longer blocked by this check (other checks may still apply).
4. **Scenario C:** Repeat B's setup, but enter text that explicitly states the concern is unresolved or evidence is insufficient. Expect: still not blocked — the system does not require a favorable or resolved conclusion.
5. **Scenario D:** Set "Real person likeness" to `Possible` or `Confirmed`. Leave L01's fields empty. Expect: blocked. Add any text to L01's notes or select any `likeness_found` value. Expect: no longer blocked.
6. **Scenario E:** Set "Music heard" to `Identifiable track`. Expect: blocked. Change it to `None` — expect: no longer blocked. Change it to `Generic / royalty-free` instead — expect: also no longer blocked (this is the specific over-trigger risk CAH-4I.4C/4E both flagged and fixed; confirm it in the real UI, not just the automated test).
7. **Scenario F:** With a triggered, unaccounted-for observation blocking signoff, revert the observation itself back to its clean value **without** adding any accounting text. Expect: the block disappears immediately.
8. **Scenario G:** Set both "Logos observed" and "Trademarks observed" to non-clean values, leave I03 empty. Expect: one blocking message, not two. Fill I03's field once. Expect: fully cleared.
9. **Scenario H:** Set "Unexpected content" to true (or a landmark observation to non-clean) with no Section 5 finding present. Expect: blocked, directing to Section 5. Add one finding with both a domain and finding text. Expect: cleared.

Record each scenario's actual result (PASS/FAIL) and any exact message text observed, then return to this document to close CAH-4I.4F for real.

### 31.11 Final status of this milestone

**CAH-4I.4 is NOT yet closed.** CAH-4I.4A through 4I.4E are complete and re-confirmed by source and automated test as of this pass. **CAH-4I.4F itself remains open** pending either (a) live PM UAT per §31.10, or (b) an explicit PM decision to authorize integration on the strength of the automated verification alone — a product/risk decision this milestone can surface but not make unilaterally.

---

## 32. CAH-4I.4F-PROD — Controlled Production UAT Integration (2026-09-13)

**Status: DEPLOYED FOR CONTROLLED UAT. NOT YET PRODUCTION-ACCEPTED.** PM explicitly authorized running controlled UAT directly in Production (no live Commercial Assurance users currently rely on it, so Preview does not materially reduce blast radius). This section records the integration only — **it does not close CAH-4I.4**, which remains open pending real production observations from PM. §31's HOLD result above is left unmodified as the historical record of the state before this authorization.

### 32.1 Drift re-inspection (Phases 0-1)

Re-verified in the dedicated worktree: branch, HEAD (`190a742`), full lineage, clean working tree — all as §31 left them. `origin/main` had **not moved** since §31's own check (still `f4347c6`) — the only drift since the branch base remains the 7-commit EU AI Act Article 50 governance/evidence-capture range (17 files, all under `06_Operations/institutional-knowledge/notebook/`), re-confirmed via `git diff --name-only` to have **zero overlap**, programmatically (via `comm`), with the 7 files this branch touches. No semantic overlap either — the drift is pure LK research documentation, no code.

### 32.2 Patch verification (Phase 2)

Re-confirmed the full CAH-4I.4 range touches exactly 7 files: the reconciliation module, its two test files, `signoff.ts` (additive only), `Section3Evidence.tsx` (the 4D fix), the Section3Evidence regression test, and this architecture document. No schema, API, report-projection, Living Knowledge, or CRC file anywhere in the range.

### 32.3 Rebase (Phase 3)

`git rebase origin/main` — **clean, zero conflicts**, all 7 commits replayed.

### 32.4 SHA mapping (Phase 4)

| Original | Rebased |
|---|---|
| `06fbc62` | `bc606cd` |
| `79f3d4b` | `89ca081` |
| `226c48f` | `e515097` |
| `fd4ad4f` | `a779312` |
| `135f57a` | `c773b4e` |
| `1709e8d` | `92fc337` |
| `190a742` | `fe0a86e` |

### 32.5 Range-diff / semantic equivalence (Phase 4)

`git range-diff 5a95065..190a742 f4347c6..fe0a86e` — **all 7 commits marked `=` (patch-identical)**. `git diff --check` on the full range: clean. Additionally, not relying on the range-diff marker alone, directly re-grepped the rebased tree and confirmed unchanged: the reconciliation predicate (`trim().length > 0`, no length threshold), the mapping targets (`trademark_elements`, `elements_identified`, `likeness_found`, `audio_source`), the Section3Evidence clean-state fix (all four occurrences using `'None observed'`/`'None identified'`, never `'No'`), and the `signoff.ts` integration (import + additive loop).

### 32.6 Automated regression gate (Phase 5)

Focused suite (`observation-reconciliation.test.ts`, `signoff-reconciliation.test.ts`, `signoff-integrity.test.ts`, `signoff-public-record.test.ts`, `reviewer-workbook/`): **128/128 passing**, re-run post-rebase. `tsc --noEmit`: clean. Full repository suite: **77 pre-existing failures, unchanged — zero new**, re-confirmed a further time post-rebase.

### 32.7 Production deployment readiness (Phase 6)

Per this repository's own documented deployment model (`CLAUDE.md`: Vercel auto-deploy from GitHub pushes to `main`, ~2 minutes) — pushing to `main` **automatically** triggers a Production deploy; no separate manual deploy step exists or is required. PM's authorization for this exact path is on record in this milestone's own instructions. No inference was needed beyond citing the repository's own stated behavior.

### 32.8 Push evidence (Phase 7)

```
git push origin cah-4i4-submission-fact-acquisition-governance:main
   f4347c6..fe0a86e  cah-4i4-submission-fact-acquisition-governance -> main
```

Fast-forward, no force. Post-push: `origin/main` = local `HEAD` = `fe0a86e17ee9d15f5953d02387b005bdc86d94ca`, ahead/behind `0/0`, working tree clean. Local `main` ref synced to match (`git fetch origin main:main`).

**Production-target SHA: `fe0a86e17ee9d15f5953d02387b005bdc86d94ca`.**

### 32.9 Documentation status (Phase 9)

This section records integration and deployed-for-controlled-UAT status only. **CAH-4I.4 is explicitly NOT marked closed and NOT marked production-accepted.** That determination is deferred entirely to real PM observations against the §31.10 manual UAT script (unchanged, still the operative script — reproduced in the final report below for convenience).

### 32.10 Current acceptance status

**DEPLOYED FOR CONTROLLED UAT. UAT-PENDING.** Vercel's own deploy will complete automatically within its usual ~2-minute window following the push above; PM should confirm the deploy has completed (e.g., via the Vercel dashboard or by confirming the reconciliation behavior is present) before beginning the §31.10 scenarios. Next action is PM running those scenarios against an internal/synthetic assessment in Production and returning the actual observed results — signoff blocked/allowed, exact message text, observation and accounting values used, and any unexpected UI behavior — to this document, at which point CAH-4I.4 can be formally closed or, if any scenario fails, rolled back/repaired.
