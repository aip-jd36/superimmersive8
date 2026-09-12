# Commercial Assurance Submission Fact Coverage — Discovery / Architecture Audit

**Status:** DISCOVERY ONLY — no runtime, schema, API, UI, prompt, retrieval, BI, composition, CRC-orchestration, or Commercial Assurance control was changed by this milestone. This document records findings and a recommended sequence; it does not authorize any of it.

**Date:** 2026-09-12
**Branch:** `cah-4i-submission-fact-coverage-discovery`
**Author role:** Chief-of-Staff discovery pass, source-code-first (docs treated as claims to verify, not ground truth)

---

## 1. Scope and Non-Goals

**In scope:** determine whether the current CertForm ($499 SI8 Certified) submission questionnaire — and, where relevant, RecordForm ($29 Creator Record) and CRC (the free front door) — collect the project facts the *current* Commercial Assurance reviewer/control architecture actually needs; classify who should establish each fact; build a coverage matrix; investigate three motivating hypotheses (geography/jurisdiction, copyright registration, trademark) without presuming the answer; recommend a next-milestone sequence.

**Out of scope / explicitly NOT done:**
- No submission question was added, removed, or reworded.
- No trademark or other new Living Knowledge (LK) domain was onboarded.
- No CRC orchestration, retrieval, Bounded Interpretation (BI), or composition logic was touched.
- No Commercial Assurance control, workbook schema, or reviewer workflow was changed.
- No schema/migration/API/UI change of any kind.
- No legal conclusion (e.g. "this fact proves ownership/clearance") is asserted anywhere below — every such statement is explicitly flagged as a non-conclusion.
- This is not a redesign of the questionnaire. Longer forms are not the goal; the right upstream fact-acquisition architecture is the question.

---

## 2. Source Baseline

- Repository: `https://github.com/aip-jd36/superimmersive8.git`, local working copy at `C:\Users\User\desktop\superimmersive8`.
- `origin/main` fetched clean. Local `main` was 1 commit behind (`700cf35` → `92ef003`), a pure fast-forward with **zero file overlap** against the pre-existing uncommitted working-tree files (`01_Business/product-discovery/...`, `03_Sales/validation/...` — confirmed via `git diff --name-only HEAD origin/main` before merging). Fast-forwarded with `git merge --ff-only origin/main`.
- Discovery branch `cah-4i-submission-fact-coverage-discovery` created from `main` at `92ef00323c8798a446248b158c2aaa39523d850f` via `git branch` + `git switch` (verified: uncommitted working-tree changes survived the branch switch untouched, confirmed by `git status --short` before/after).
- All findings below are traced to this baseline. Two near-duplicate commits (`65c6bbe`/`eda05bf`, both titled "feat(crc): distribution/output-use territory structured fact contract") exist in history with identical messages — noted for completeness, not investigated further as it doesn't affect this audit's conclusions.

---

## 3. Current Submission-Question Architecture (Phase 2)

### 3.1 CertForm ($499 SI8 Certified) — the Commercial Assurance intake

Source: `08_Platform/app/app/certify/page.tsx` (1373 lines, single client component, React Hook Form + Zod), cross-checked against `08_Platform/prds/PRD_CERT_FORM.md`. **The PRD and the implementation have diverged** in at least one material way (documented in 8.1 below) — the PRD is a design document, the code is authoritative for what actually happens.

11 sections, gated (`currentSection` state machine, cannot skip forward), mode-branched on `submissionMode` ('creator' | 'agency') set in Section 1:

| # | Section (code) | Key fields | Mode branching |
|---|---|---|---|
| 1 | Production Details | `title`, `runtime`, `genre`, `logline`, `primary_use` (dropdown incl. "Brand Commercial/Advertisement"), live-campaign Y/N + `budget_range`, `distribution_channels[]` (multi-select: TV/Streaming/Online-Social/Cinema/OOH/Internal), brand-safety `suitable_categories[]`/`excluded_categories[]` | Brand-safety fields creator-only |
| 2 | Tool Disclosure | AI tools via modal: name, version, plan type, dates, primary flag, **required receipt upload** | Both |
| 3 | Third-party Assets | stock footage / 3D models / freelance-generated assets, Y/N + description/license per item | Both |
| 4 | Human Authorship | `authorship_statement` (150-word min), % AI-generated bucket, up to 5 scene attributions, post-gen editing tools | Both |
| 5 | Likeness & Identity | Path A (4 negative checkboxes: no real faces/voices/lookalikes/synthetic-people) vs Path B (licensed content, **upload required**) | Both |
| 6 | IP & Brand | Path A (3 negative checkboxes incl. `ip_no_trademarked_ip`) / Path B (licensed, upload) / Path C (Fair Use argument + doc) | Both |
| 7 | Audio & Music | `audio_source` enum (ai_generated/licensed/silent) + license upload if licensed | Both |
| 8 | Production Evidence | optional supporting materials | Both |
| 9 | Territory / Client Info | **Creator:** `territory` enum (Global/NA/Europe/Asia/Other) — "governs licensing deals through Showcase" per PRD line 244. **Agency:** Client Name (required) + optional `territory` (same enum, same field, relabeled "Intended territory for this campaign") | Diverges — see 8.1 |
| 10 | Video & Showcase | `video_url` (required), thumbnail/description/catalog opt-in (catalog currently disabled per code comment `"CATALOG DISABLED"`) | Both |
| 11 | Review & Submit | Evidence Custodian Declaration + Content Integrity/indemnification checkboxes | Both |

Persistence: `08_Platform/app/app/certify/page.tsx:366-450` builds a flat `submissionData` object written to the `submissions` table. Several fields are legacy TEXT columns now carrying JSON-encoded objects (schema drift, not a migration): `intended_use` (`{primary_use, suitable_categories, excluded_categories}`), `likeness_confirmation`, `ip_confirmation`, `audio_disclosure`, `campaign_context` (`{is_live_campaign, budget_range, distribution_channels}` — added by `20260401000000_add_certform_fields.sql`), `third_party_assets`, `post_gen_editing`. `territory_preferences` (from `001_initial_schema.sql:56`, `DEFAULT 'Global'`) is a plain TEXT column, unchanged in shape since its original v3/Rights-Agency-era meaning.

### 3.2 RecordForm ($29 Creator Record) — free/automated tier, structurally parallel

`08_Platform/app/app/record/page.tsx`. Same field families as CertForm (confirmed: identical `ip_no_trademarked_ip` checkbox, identical `territory` enum, Section 8 explicitly labelled "Territory & Exclusivity Preferences" with helper text "governs the geographic scope of any licensing deals negotiated through the Showcase" — `record/page.tsx:1152`). Per `06_Operations/reviewer-workbook/SI8-Reviewer-Workbook-Schema-v0.1.md:62`, Creator Record submissions are explicitly **out of scope for the human Reviewer Workbook** ("Creator Record assessments are automated"). RecordForm is therefore a source of the *same* territory-field ambiguity described in 8.1, but not itself a Commercial Assurance intake — noted for completeness, not analyzed further as a CA gap.

### 3.3 CRC (free front door) — a structurally different, newer fact-acquisition model

CRC is not a questionnaire at all — see Section 4 (Phase 4) below. It matters here because it is the newest fact-acquisition surface in the codebase and (Section 8.1, 10) demonstrates a materially more precise architecture for at least one fact class (distribution territory) than the CertForm questionnaire it is supposed to eventually feed into. There is currently **no code path connecting CRC's structured facts to a CertForm/reviewer submission** — a CRC session and a CertForm submission are two independent data stores today (confirmed: no shared table/foreign key found; CRC persists to `crc_sessions`, submissions to `submissions`; the only connective tissue found anywhere is `lib/crc-assurance-handoff/` and the Reviewer's own optional "Linked CRC Context" tab described in `08_Platform/implementation/REVIEWER_RESOURCES_ARCHITECTURE.md`, which is a **reviewer-side read surface into a linked CRC transcript**, not a submission-question pre-fill or fact-import mechanism).

### 3.4 Reviewer surfacing of submitted facts — where the map breaks

- `submission.territory_preferences` IS displayed to the reviewer: `08_Platform/app/app/admin/submissions/[id]/review/Section1Intake.tsx:88` (`<span>Territory: </span><span>{submission.territory_preferences || 'Global'}</span>`).
- `submission.campaign_context` (distribution channels, budget range, live-campaign flag) is **written at submission time** (`certify/page.tsx:430-434`) and **read only in the creator-facing dashboard** (`08_Platform/app/app/dashboard/submissions/[id]/page.tsx:134`) — a repo-wide search (`grep -rn campaign_context 08_Platform/app`) found **no reference anywhere under `app/admin/`**. The fact is captured but structurally invisible to the Human Reviewer who is supposed to use "stated commercial use" and "campaign description" (Workbook Schema Section 1.1) to calibrate review depth. This is a proven Evidence/Reviewer-Workflow gap (Section 10.J below), independent of the three motivating hypotheses.

**QUESTION → RAW ANSWER → STRUCTURED FACT → CONSUMER map, condensed (full detail above):** every CertForm field reaches the `submissions` row; only a subset of that row is read back out by the admin review UI (`Section1Intake.tsx`, `WorkbookClient.tsx`, `Section7Brief.tsx` — confirmed by `grep -l territory_preferences` across `app/admin/**`); `campaign_context` is the one confirmed instance of a field that is captured but has zero reviewer-side consumer.

---

## 4. Commercial Assurance Fact-Demand Model (Phase 3)

Source: `06_Operations/reviewer-workbook/SI8-Reviewer-Workbook-Schema-v0.1.md` (locked Jul 3, 2026 — the canonical control list) and `06_Operations/reviewer-workbook/SI8-Reviewer-Manual-v0.2.md` (decision logic per domain). Cross-checked against `08_Platform/app/lib/assessments/` (service/repository/reportProjection — these implement assessment *lifecycle and publication*, not the control logic itself; the workbook is filled by a human and stored as `workbook_data` JSONB, consumed by `reportProjection.ts` for the PDF, per `08_Platform/prds/PRD_REVIEWER_WORKBOOK_UI.md`).

**16 controls across 7 domains** (verified by counting the schema doc: 1+4+2+3+3+1+2 = 16, matching the doc's own "Total controls: 16"):

| Domain | Controls | Facts consumed | Implemented today? |
|---|---|---|---|
| **A** — Identity & Accountability | A01 | Submitter identity/authority | Yes — submission mode + client name |
| **R** — Commercial Rights & Licensing | R01–R04 | Tool names/versions, tool commercial license (receipts), custom-model training-data rights, output-rights basis (ToS + work-for-hire) | Yes — Section 2/3 of CertForm |
| **H** — Human Creative Contribution | H01–H02 | Nature/level of human contribution, whether a copyright claim is made and its basis | Yes (H01, via authorship statement) / **H02 is reviewer-derived** — see below |
| **I** — Third-Party IP | I01–I03 | Recognizable copyrighted content in-frame, music/audio rights, **brand/logo/trademark elements in-frame** | Partially — I01/I02 have direct submission input (Path A/B/C); I03 has only a negative self-attestation checkbox, reviewer visual scan is the real check |
| **L** — Likeness & Performer Rights | L01–L03 | Real-person likeness presence, synthetic-performer distinctness, consent/rights documentation | Yes (L01/L03 via Section 5 Path A/B) / **L02 (distinctness) has no dedicated submission input** — reviewer judgment from direct content review only |
| **T** — Technical Provenance | T01 | Generation workflow documentation, prompt logs, output metadata | Yes — Section 4 + tool receipts |
| **D** — Documentation Integrity | D01–D02 | Internal consistency of dates/tools/receipts, indicators of retroactive documentation | **Not a submission fact at all — purely reviewer-derived from cross-checking other submitted facts** |

**Conclusion-shaped concepts explicitly identified and excluded from "facts to ask the user" (per the task's own critical instruction):**
- "Copyright claim ... sufficient" (H02) — Manual says: "Assessment: Contribution appears sufficient / Insufficient / Cannot assess" — **explicitly a reviewer judgment**, never a submitter self-report. This is Authority Class D (derived/interpretive).
- "Rights cleared" / "commercially approved" — these are the Section 5 outcome labels (`Evidence Supports Intended Commercial Use`, etc.), never fields the submitter fills in.
- "Applicable jurisdiction" — **not modeled as a workbook field at all.** The Manual references jurisdiction only as reviewer *judgment* triggered by a raw geography fact (`SI8-Reviewer-Manual-v0.2.md:497,530`: "Note jurisdiction-specific obligations for all submissions with US territory deployment" / "For any submission with US territory in the intended deployment, flag [NY Synthetic Performer Law]'s applicability"). This is the load-bearing finding for Section 8.1 below: the Manual's decision logic depends on a **primitive geography fact** ("is this deployed in the US") that the reviewer receives, today, only as a coarse, semantically-overloaded field (`territory_preferences`).
- "Sufficient evidence" — Section 5.4 Commercial Confidence, explicitly the reviewer's own judgment, "independent of the outcome."

**No control asks for, or is designed around, copyright registration/application status or trademark registration of the submitter's own marks.** I03 is about detecting *third-party* trademarks appearing *in the footage* (a different concept — see Section 10.N).

**Territory/geography as a Commercial Assurance concept exists only as free-text/enum context** in Workbook Section 1.1 ("Intended territory: [e.g., UK, US, global]") and as the Manual's reviewer-judgment trigger described above — it is not one of the 16 controls, and Domain T is "Technical Provenance," not "Territory" (verified directly from the schema doc; my working assumption before reading the source file was wrong and was corrected against the primary source). The Manual's own governance table (`SI8-Reviewer-Manual-v0.2.md:843`) explicitly lists "New domain added (e.g., Platform Distribution Compliance)" as a *future*, not-yet-taken step — confirming SI8 itself has already flagged distribution/territory as a candidate future domain, not a current one.

---

## 5. CRC Fact-Demand Model (Phase 4)

Source: `08_Platform/app/types/interview-engine.ts` (the `StructuredUnderstanding` contract) and `08_Platform/app/lib/crc-engine/dependency-askability.ts`.

CRC's structured project-fact catalog today consists of exactly **five mention types**, all with real correction/supersession semantics except one deliberately append-only type:

| Mention type | What it captures | Correction semantics | Relevant to |
|---|---|---|---|
| `ToolMention` | AI tool identity, access surface, plan tier | Supersede | R01/R02 |
| `AssetProviderMention` | Stock/third-party asset provider + usage + license (free text) | Supersede (sub-fields) | I02/R03-adjacent |
| `AssessmentJurisdictionMention` | A jurisdiction the **user explicitly asked CRC to consider** for governed-knowledge purposes — *not* a factual-territory fact, *not* a legal-applicability conclusion (`interview-engine.ts:308-348`) | Supersede | LK discovery scoping only |
| `DistributionTerritoryMention` | A plain factual project-geography value ("this will run in France") — explicitly *not* an assessment-scope request and *not* itself a legal-applicability determination (`interview-engine.ts:350-399`) | Supersede | Territory/geography (8.1) |
| `ContentPresenceMention` | Presence/absence of content in a **closed, 2-value category list**: `person_visual_presence`, `person_voice_presence` only (`CONTENT_PRESENCE_CATEGORIES`, `interview-engine.ts:436`) | **Append-only, by deliberate design** ("Content-Presence Correction Safety — Append-Only Closure, 2026-08-28") | L01/L02 only |

**GoalCategory (CRC's topic taxonomy) is a closed union:** `commercial_use, copyright_ownership, copyrightability, likeness, third_party_source_rights, unknown` (`interview-engine.ts:695`). There is **no `trademark` value and no `registration`/`copyright_registration` value.** Adding either as a first-class CRC-discoverable topic is a type-level schema change, not a content-authoring exercise — this is material to Section 12 (roadmap sequencing).

**Askability is governed by a single, generic, fail-closed registry** — `dependency-askability.ts`. This is the authoritative mechanism for Phase 6 (Section 6 below): a dependency string is askable in CRC *only* if explicitly, deliberately listed with `treatment: 'askable_in_crc'`; **absence defaults to non-askable, never the reverse** (`dependency-askability.ts:29-31`). As of this baseline, exactly **one** real entry exists: `human_contribution_description`. The file's own header names the real stock-governance dependencies this registry deliberately does NOT promote: `editorial_designation_confirmed`, `separate_authorization_obtained`, `release_status_confirmed`, `rights_and_clearance_status`, `which_provider`, `asset_confirmed_getty/istock/shutterstock` — "None of the real stock dependency strings are registered `askable_in_crc` here — doing so would require a PM/legal decision on safe question wording ... which this architecture milestone does not make on its own authority" (`dependency-askability.ts:56-63`).

This is the exact mechanism referenced by the task's "Stock Governance Hard Rule" — **found, verified, and preserved untouched.** It is also, architecturally, the *right generic pattern* to extend for any new fact-authority decision (geography, registration, trademark) rather than inventing a bespoke gate per domain (see Section 12).

---

## 6. Living Knowledge Fact Demand (Phase 5)

Source: `08_Platform/app/lib/retrieval-engine/types.ts` (`TopicClaim` interface) and `06_Operations/institutional-knowledge/notebook/GOVERNED-CLAIMS.md`.

`TopicClaim`'s generic dependency/applicability surface: `topic` (`GoalCategory`), `jurisdiction`, `lifecycle`, `crc_eligible`, `applicability_requirements[]`, `unresolved_project_dependencies: string[]`, `provider_scope: AssetProviderId[] | null`, `tool_scope: string[] | null`, `geographic_relevance_scope?: string[] | null`.

**`geographic_relevance_scope` is a real, shipped field with zero live users.** Per the `3f74e8b` commit message (verified against the fixture directly, not just the commit text): "a new describe block ... proves ... zero real claims have a non-null/non-empty `geographic_relevance_scope` today" and the discovery engine built to consume it "produce[s] zero territory-attributable occurrences ... against current production Living Knowledge, for any synthetic territory value." Confirmed independently: `grep -c geographic_relevance_scope topic-claims-fixture.ts` shows the field type exists but no populated claim uses it as of this baseline. This is a **dormant, correctly-built capability**, not a gap in the mechanism — the gap (if any) is in governance content, not architecture.

**Copyright LK coverage (`CLAIM-COPY-001` through `-004`) is about *copyrightability/authorship doctrine*** (the human-authorship threshold, referencing the US Copyright Office's Zarya of the Dawn decision — `GOVERNED-CLAIMS.md:204,320`), **not about registration status of a specific submitted work.** No claim, fixture, or type anywhere models "has this work been registered/filed with a copyright office" as governed knowledge or as a structured project fact. All "registration" hits found in `lib/` (18 files) are either (a) tool/provider *onboarding* registration (`tool-identity/registry.ts`, "provider registration" for LK onboarding — an internal SI8 process, unrelated to submitter facts) or (b) Stability AI's own tool-specific applicability dependency (`stabilityai_commercial_registration_completed` — whether *Stability AI's platform* requires the *user's business* to register with Stability AI under its Community License, a narrow, tool-specific concept, not a generic "copyright registration" concept). **Zero conflation found between these and a general copyright-registration fact** — worth stating explicitly since the names are superficially similar.

**Trademark LK coverage is zero.** `grep -c trademark topic-claims-fixture.ts` → 0. The only repository-wide substantive mentions of trademark as a *concept SI8 might need to reason about* are: (a) doc-comment placeholders in `lib/bounded-interpretation/types.ts:166` and `lib/retrieval-engine/types.ts:242` listing "trademark" alongside "copyrightability, likeness ... disclosure" as an enumerated *future* unmodeled-dependency category — i.e. the architecture already anticipates this domain generically, it just isn't built; and (b) `06_Operations/institutional-knowledge/notebook/PENDING-QUESTIONS.md` PQ-004 (raised 2026-07-30, still Open), which records a real, unresolved scenario where "the commercial idea and its specific advertising execution can be protected separately via trademark" — explicitly flagged as "not verified legal research, and not yet reconciled with how SI8 actually scores Domain I ... or Domain H."

**Classification: this is a genuine LK DOMAIN / KNOWLEDGE COVERAGE GAP for trademark**, per the task's own architectural premise — its absence must not be read as "trademark is not relevant to Commercial Assurance." Whether it *is* relevant is a governance/product question this milestone does not resolve (see Section 13).

---

## 7. Fact Authority Classification (Phase 6)

Applying the task's taxonomy (A–F) to the facts actually found:

| Class | Definition | Examples found in this audit |
|---|---|---|
| **A** — Submission-appropriate user fact | Submitter can safely self-report | Tool names/versions (R01), audio source type (I02), % AI-generated (H01), whether a live campaign exists (Section 2) |
| **B** — Conditional/CRC-askable user fact | Legitimate but not necessarily mandatory up-front | `human_contribution_description` — the one live `askable_in_crc` entry |
| **C** — Evidence-only/reviewer-established | Must never become self-attestation | `editorial_designation_confirmed`, `separate_authorization_obtained`, `release_status_confirmed`, `rights_and_clearance_status`, `which_provider`, `asset_confirmed_*` (all fail-closed to `evidence_only` per `dependency-askability.ts`); H02's "is the claim sufficient" judgment; D01/D02 (documentation-consistency findings) |
| **D** — Derived/interpretive | Governed logic / reviewer judgment, not a raw fact | "Applicable jurisdiction," "rights cleared," "commercial confidence," L02 synthetic-performer distinctness assessment |
| **E** — External/institutional | Registry, provider, or SI8 workflow state | Tool receipt verification against provider ToS; C2PA/on-chain provenance metadata (optional, per Manual v0.2:570) |
| **F** — Unresolved authority | Insufficient evidence to classify | **Copyright registration/application status of the submitted work** — no code, doc, or claim commits to who should establish this if SI8 ever needs it; **Trademark status of submitter's own marks** — same |

**Stock Governance Hard Rule — located and confirmed intact.** `dependency-askability.ts` is the authoritative implementation. No change was made to it, and no evidence-only fact discovered in this audit is recommended for conversion to self-attestation anywhere below (see the explicit downgrade in Section 15).

---

## 8. Canonical Coverage Matrix (Phase 7)

Statuses per the task's vocabulary. "Consumer(s)" abbreviated to domain/control IDs where applicable.

| Fact / concept | CA demand | Authority class | Submission coverage | Structured-fact coverage | CRC askability | LK dependency/coverage | Reviewer/evidence coverage | Consumer(s) | Gap classification | Evidence |
|---|---|---|---|---|---|---|---|---|---|---|
| AI tool name/version | Yes | A | COVERED | COVERED (`ToolMention`) | Askable (tool identity flow) | `tool_scope` | Receipt review | R01 | None | `certify/page.tsx` §2; `interview-engine.ts:146` |
| AI tool commercial license | Yes | A + E | COVERED (receipt upload) | Partial (receipt not modeled in CRC) | N/A | N/A | Reviewer verifies against ToS | R02 | None | Workbook R02; PRD_CERT_FORM §3 |
| Custom model / fine-tune rights | Conditional | A | COVERED (conditional Y/N) | Not modeled in CRC | Not askable | Not modeled | Reviewer | R03 | None (N/A path exists) | Workbook R03 |
| Output rights / work-for-hire | Yes | A + D (partial) | PARTIALLY COVERED | Not modeled | Not askable | Not modeled | Reviewer infers from ToS + contract | R04 | Minor — no dedicated field for "who legally holds output rights" beyond ToS summary | Workbook R04 |
| Human contribution narrative | Yes | A/B | COVERED (150-word statement) | COVERED (`ProjectFacts.human_contribution_description`) | **Askable** (only live entry) | `unresolved_project_dependencies: [human_contribution_description]` | Reviewer judgment (H01) | H01 | None | `dependency-askability.ts:110` |
| Copyright-claim sufficiency | N/A (conclusion) | D | N/A — correctly not asked | N/A | N/A | `CLAIM-COPY-001..004` (doctrine, not per-submission) | Reviewer (H02) | H02 | **INTENTIONALLY NOT USER-ASKABLE** | Workbook H02; `SI8-Reviewer-Manual-v0.2.md` |
| Third-party copyrighted content in-frame | Yes | A (disclosure) + D (final call) | COVERED (Section 6 Path A/B/C) | Not modeled in CRC (`GoalCategory` has `third_party_source_rights` but no in-frame-recognition mention type) | Not askable | Provider-scoped stock claims only | Reviewer direct viewing (I01) | I01 | None material | Workbook I01; Section 6 |
| Music/audio rights | Yes | A | COVERED | Partial (`AssetProviderMention` covers stock; no dedicated music mention type) | Partially askable via asset-provider flow | Music Scenario A claims exist (per root CLAUDE.md §3r) | Reviewer | I02 | None material | Workbook I02; Section 7 |
| Third-party trademark/brand elements in-frame | Yes | A (disclosure) + D (final call) | **PARTIAL** — only a negative checkbox (`ip_no_trademarked_ip`), no structured "what mark, whose, licensed?" capture | NOT COVERED (no CRC mention type) | Not askable | **LK COVERAGE ABSENT** | Reviewer visual scan (I03) | I03 | Proven gap (submission) + LK domain gap | `certify/page.tsx:82`; Workbook I03 |
| Real-person likeness presence | Yes | A (disclosure) + D (final call) | COVERED (Section 5 Path A/B) | COVERED (`ContentPresenceMention: person_visual_presence`) | Askable via free-form conversation (append-only) | `CLAIM-LIKENESS-NY-CONSENT-REQUIREMENT-001-v1` etc. | Reviewer direct viewing (L01) | L01 | None | interview-engine.ts:436; Workbook L01 |
| Synthetic-performer distinctness | Yes | D | NOT COVERED as a submission fact | Presence only, not distinctness | Not askable | Not modeled | Reviewer judgment only (L02) | L02 | **CORRECTLY reviewer-only** — distinctness is inherently a judgment call, not a fact the submitter can self-certify | Workbook L02 |
| Likeness consent/rights docs | Conditional | A + C | COVERED (Section 5 Path B upload) | Not modeled | Not askable (evidence-only by nature) | N/A | Reviewer (L03) | L03 | None | Workbook L03 |
| Generation workflow / provenance | Yes | A + E | COVERED | Partial | N/A | Optional C2PA/on-chain (not required) | Reviewer (T01) | T01 | None | Manual v0.2:570 |
| Documentation internal consistency | N/A (conclusion) | C/D | N/A — correctly not asked | N/A | N/A | N/A | Reviewer only (D01/D02) | D01/D02 | **INTENTIONALLY NOT USER-ASKABLE** | Workbook D01/D02 |
| Stated commercial use / campaign context | Yes (context, calibrates review depth) | A | **COVERED at submission, NOT SURFACED to reviewer** | `campaign_context` JSONB | Not askable | N/A | **NOT COVERED — reviewer UI has zero reference** | Workbook §1.1 | **Proven Evidence/Reviewer-Workflow gap** | `grep campaign_context 08_Platform/app` — no hits under `app/admin/` |
| Distribution channels (TV/social/etc.) | Yes (context) | A | COVERED at submission | `campaign_context.distribution_channels` | Not askable | N/A | Same as above — not surfaced | Workbook §1.1 | Same gap as above | Same |
| Intended distribution/deployment territory | Yes (Manual v0.2 explicitly conditions legal flags on it) | A (primitive fact) — NOT D | **PARTIALLY COVERED, ambiguous** — optional in agency mode, coarse 4-continent enum, same field/column as Showcase-licensing territory | `territory_preferences` (legacy, overloaded) vs. CRC's separate, precise `DistributionTerritoryMention` | **Askable in CRC (newer, better model), disconnected from CertForm** | `geographic_relevance_scope` exists, zero live claims use it | Reviewer sees only the overloaded field | Manual v0.2:497,530 (NY law trigger) | **Proven gap — structured-fact-model + submission-question, not LK** | See Section 9 below |
| Assessment/legal jurisdiction (which law applies) | N/A (conclusion) | D | N/A — correctly not asked directly | N/A | N/A (CRC's `AssessmentJurisdictionMention` is a *scope request*, not this) | `TopicClaim.jurisdiction` per-claim | Reviewer derives from territory + Manual guidance | Manual v0.2 | **INTENTIONALLY NOT USER-ASKABLE** (correctly so) — but its input primitive (territory) is under-specified, see above | — |
| Copyright registration/application status | Unclear — no current control demands it | **F — Authority Unresolved** | NOT COVERED | NOT COVERED | NOT COVERED (no GoalCategory value) | NOT COVERED (Copy claims are doctrine, not registration-status) | NOT COVERED | None today | **Plausible candidate, not a proven gap** — no current Commercial Assurance control reads or would change behavior on this fact | Section 10 below |
| Trademark status of submitter's own marks | Unclear — no current control demands it | **F — Authority Unresolved** | NOT COVERED | NOT COVERED | NOT COVERED (no GoalCategory value) | **LK COVERAGE ABSENT** | NOT COVERED | None today | **Plausible candidate requiring product/governance decision**, flagged by SI8's own PQ-004 | Section 11 below |
| Stock asset editorial designation / license tier | Yes (Domain R/I adjacent) | **C — protected, do not convert** | Not a dedicated field (folded into free-text license description, Section 3) | `unresolved_project_dependencies` names exist, unregistered | **Deliberately NOT askable** | Named in claims, `evidence_only` by omission | Reviewer must obtain from documentary evidence | R02/I02 | **INTENTIONALLY NOT USER-ASKABLE — hard rule, preserved** | `dependency-askability.ts:48-63` |

---

## 9. Motivating-Hypothesis Findings (Phase 8)

### 9.1 Geography / Jurisdiction — **PROVEN GAP, both submission and structured-fact-model**

Distinguishing the concepts the task asked to keep separate:
- **Intended distribution/output-use territory** — a primitive project fact ("this ad runs in the US"). This is the one the Reviewer Manual actually needs (v0.2:497, 530).
- **Client/entity location, production location** — not modeled as distinct fields anywhere found; not investigated further as no control was found to require them.
- **Assessment jurisdiction** — CRC's `AssessmentJurisdictionMention` is an explicit user *request* to consider a jurisdiction's governed knowledge, not a project fact and not a legal-applicability conclusion (by its own doc comment). Correctly excluded from "user fact to derive law from."
- **Legally applicable jurisdiction** — a reviewer conclusion (Class D). Correctly never asked directly anywhere in the codebase.

**What is actually broken:** the CertForm/reviewer side's only representation of "intended distribution/output-use territory" is `territory_preferences` — a field whose *name*, *original purpose* (per `record/page.tsx` and the CertForm PRD, "governs licensing deals through Showcase"), and *granularity* (4 continents + free-text "Other") were all designed for a different concept (IP-licensing scope for the Showcase marketplace) than the one the Reviewer Manual needs (deployment jurisdiction, specifically whether the US, and more specifically whether New York, is in scope for a disclosure-law flag). The field is **optional in agency mode** — exactly the submission population (agencies clearing real ad campaigns) where this fact is most likely to be legally material. Meanwhile CRC — a separate, newer, and unconnected system — has already built a more architecturally correct model for exactly this concept (`DistributionTerritoryMention`, real supersession semantics, deliberately no continent/country hierarchy so it never silently over- or under-infers), plus a dormant LK discovery mechanism (`geographic_relevance_scope`) built to consume it, with zero governed claims currently opted in.

**What this does NOT prove:** it does not prove SI8 needs country-level or address-level precision, does not prove the Manual's NY-law trigger is the only jurisdiction-sensitive rule that will ever exist, and does not prove CRC's territory model should simply be wired into CertForm as-is (CRC's model is free-text/exact-match; a submission field may reasonably want a constrained picker for reviewer consistency — that trade-off was not evaluated here and is a product decision, not a fact this audit can settle).

### 9.2 Copyright Registration — **NOT a proven gap under current controls; a plausible candidate requiring a decision**

No control in the 16-control Workbook Schema reads or is designed around "has the submitter registered/applied for copyright registration of this specific work." H02 asks whether a copyright *claim* is made and whether the underlying *contribution* is sufficient to support it — a copyrightability/authorship question, not a registration-status question. LK's copyright claims (`CLAIM-COPY-001..004`) are exclusively about the copyrightability doctrine (human-authorship threshold), never about registration status. No mention type, `ProjectFacts` field, or `GoalCategory` value represents "registration filed/granted/rejected, registrant identity, registry, reference number." **This audit did not find repository evidence that Commercial Assurance's current 5-outcome model would change its behavior based on a registration-status fact** — the outcome language (Section 5.1) is about "evidence supports intended commercial use," not about registry status. Per the task's explicit instruction not to infer that registration proves ownership/clearance/readiness, and not to invent requirements from a conceivable legal issue alone: **this is classified as a Plausible Candidate, not a Proven Gap.** If SI8 decides copyright registration status is commercially material (e.g., because it affects statutory-damages availability under US law, a real legal fact this document does not evaluate), the correct authority class is most likely **A (submission-appropriate user fact for "have you filed?")** paired with **C (evidence-only for "is a valid registration actually on file" — should come from an uploaded certificate/receipt, not self-report alone)** — but this split is itself a recommendation requiring a product/legal decision, not a finding this audit is authorized to institutionalize.

### 9.3 Trademark — **LK domain gap, confirmed; submission/CRC coverage limited to a different concept**

Two genuinely distinct trademark-adjacent concepts exist in the repository, and conflating them would be a mistake:
1. **Third-party trademarks appearing in the submitted footage** (I03) — this IS covered today, but only as a negative self-attestation checkbox (`ip_no_trademarked_ip`) plus a reviewer visual scan. No structured capture of "which mark, whose, was it licensed" exists — comparable in shape to I01's stock-asset handling but with less structure than Section 3's third-party-asset flow.
2. **The submitter's own trademark rights/registration status in their own project title, characters, or brand elements** — **zero coverage anywhere**: not in the questionnaire, not in CRC's `GoalCategory` (closed union, would require a schema change to add), not in LK (zero claims, confirmed by direct grep), not in the reviewer workbook (no control asks about it).

SI8's own institutional record (`PENDING-QUESTIONS.md` PQ-004, Open since 2026-07-30) already flags a live, unresolved scenario where the trademark distinction matters ("the commercial idea and its specific advertising execution can be protected separately via trademark") and explicitly says this has "not yet [been] reconciled with how SI8 actually scores Domain I ... or Domain H." **This audit independently confirms PQ-004's premise from the architecture side**: trademark is a structurally anticipated-but-unbuilt category (named explicitly in two doc comments as a future unmodeled-dependency kind) with a real open question already on record. **This is classified as a genuine LK Domain/Knowledge Coverage Gap for concept #2**, per the task's architectural premise — its absence from LK must not be read as proof it's irrelevant to Commercial Assurance. Whether SI8 should build it is a governance/product decision this audit does not make.

---

## 10. Additional Gaps Found (Phase 9) — traced to evidence, not speculative

**J. Evidence/Reviewer-Workflow gap — `campaign_context` invisible to the reviewer.** Proven directly (Section 3.4): the submitter's stated distribution channels, budget range, and live-campaign flag are collected and stored but never rendered anywhere under `app/admin/`. This is not a questionnaire gap (the question exists and is answered) and not an LK gap — it is a pure reviewer-tooling gap, the kind of thing Section 10 of the task (questionnaire-architecture assessment) would call "a fact sourced through one channel but not wired to its intended consumer."

**No other gap met this document's evidentiary bar.** Candidates considered and explicitly downgraded rather than included as proven:
- "Client/production location" as a distinct fact from distribution territory — plausible in the abstract, but no control or doc was found that treats it as materially different from the territory question already covered in 9.1; not elevated beyond a footnote.
- A dedicated "music mention type" in CRC (parallel to `AssetProviderMention` but music-specific) — I02 is functionally covered via the generic asset-provider flow and Music Scenario A LK claims exist (root `CLAUDE.md` §3r); no evidence this is blocking anything today.
- R04 "output rights holder" granularity — noted as PARTIALLY COVERED in the matrix, not elevated to a proven gap; the ToS-summary + work-for-hire-flag combination may already be sufficient and this audit found no Manual guidance suggesting otherwise.

---

## 11. Questionnaire-Architecture Assessment (Phase 10)

Direct answers to the task's specific questions, from source:

- **Is the questionnaire effectively static?** Yes. `certify/page.tsx` is a single hand-written component with a fixed 11-section state machine and a hardcoded Zod schema. There is no data-driven section/question model.
- **Does it support conditional applicability?** Only coarsely — one boolean branch (`submissionMode === 'creator' | 'agency'`) toggling which of a small number of fields render. There is no mechanism for a question to appear *because* a governed dependency (LK claim, CRC-discovered relevance) requires it.
- **Can questions be derived from governed dependencies?** No. `dependency-askability.ts` is CRC-side only; CertForm has no equivalent concept and no code path reads any LK/CRC artifact to decide what to ask.
- **Does it distinguish user facts from evidence requests?** Partially, and inconsistently. Some sections do this well (Section 5/6's Path A/B/C pattern: self-attest vs. upload-a-license vs. argue-fair-use is a genuine, structured evidence-vs-attestation split). Others don't (Section 9's territory field conflates two purposes in one enum with no evidence backing either).
- **Can one fact be sourced through multiple channels?** Not architecturally — the one place this happens today (`territory_preferences` also existing, unconnectedly, as CRC's `DistributionTerritoryMention`) is an accident of two systems evolving independently, not a designed multi-channel fact model.
- **Are facts normalized independently from question wording?** No — the JSON-in-TEXT-column pattern (`intended_use`, `campaign_context`, etc.) couples storage shape directly to the current form's field names; there is no canonical fact layer between "what the form asked" and "what got stored."
- **Can future LK domains declare dependencies without bespoke questionnaire orchestration?** On the CRC side, yes in principle (the `dependency-askability.ts` + `unresolved_project_dependencies` pattern is generic, fail-closed, and already proven across multiple domains). On the CertForm side, no — there is no equivalent registry or hook point.
- **Is mandatory up-front collection overused where conditional questioning would fit better?** Plausibly yes for territory in agency mode (optional today, but the Manual's own decision logic implies it should be a required, precise fact whenever the answer would change the outcome) — flagged as a candidate, not asserted as proven, since this audit did not measure how often agency submissions omit it or what the reviewer does when it's blank.
- **Can correction/supersession semantics work across submission and CRC facts?** Not today — CertForm has no correction model at all (a resubmission is a new row); CRC has a mature one. These are two disconnected fact universes.

**Answer to the framing question:** the questionnaire model itself — not merely its content — is a real constraint. CertForm is a static, hand-authored form; the generic, governed, fail-closed fact/dependency architecture SI8 has already built and proven (dependency-askability registry, mention-type correction semantics, `geographic_relevance_scope` discovery) lives entirely on the CRC/LK side and has no bridge to the paid product's actual intake. This is closer to shape **B (generic submission-fact architecture revision)** and **D (LK domain onboarding, for trademark specifically)** than to shape **A (questionnaire content revision only)** — but seeSection 12 for why content-only fixes are still appropriate for the narrowest proven gap (J, above).

---

## 12. Architecture Risks / Drift Traps

- **Silent field reuse.** `territory_preferences` is the clearest live example: a column and a UI label surviving three product eras (v3 Rights Agency → CaaS → institutional Commercial Assurance) while its meaning quietly shifted. Any future "just add a field" fix risks repeating this pattern unless the fact is named for what it *means* (deployment jurisdiction) rather than reusing a field named for what an earlier product needed (licensing preference).
- **Two independently-evolving fact universes.** CRC/LK's generic, governed, fail-closed architecture is materially more mature than CertForm's static form. Building trademark or copyright-registration support directly into CertForm (bespoke checkboxes) would create a *third* fact representation, worsening rather than fixing the fragmentation this audit surfaces.
- **LK-absence-as-irrelevance.** Explicitly guarded against throughout this document per the task's premise; restated here as a standing risk for whoever picks this up next.
- **Conclusion-as-fact drift.** The workbook schema currently keeps this boundary clean (Section 5 outcomes are structurally separate from Section 2 evidence fields). Any new fact-acquisition work must preserve this — a "jurisdiction" field, if ever added, must capture the *primitive* (deployment territory) and never a pre-computed "applicable law" value.

---

## 13. Unresolved Questions (Phase 8/9, carried forward explicitly)

- Does SI8 want copyright-registration status to matter for any current or planned Commercial Assurance outcome? (No current control needs it — Section 9.2.)
- Does SI8 want trademark (submitter's own marks) to become a governed LK domain, given PQ-004 is already open and unresolved? (Section 9.3.)
- Should deployment territory become a required, country-level (not continent-level) fact for agency-mode CertForm submissions, and should it be represented separately from Showcase-licensing territory at the schema level? (Section 9.1.)
- Should `campaign_context` simply be added to the existing `Section1Intake.tsx` reviewer view (a narrow, low-risk fix distinct from the larger architecture question), independent of any of the above? (Section 10.J — this one looks like a small, self-contained fix a future milestone could take on its own, without waiting on the larger fact-architecture decision.)
- Is CRC's exact-literal-match, no-hierarchy territory model (deliberately, per its own doc comments) the right end-state representation for a paid, human-reviewed product's compliance-relevant geography field, or does Commercial Assurance need country/region hierarchy CRC deliberately declined to build for its own (different) purposes?

---

## 14. Candidate Next Milestones and Recommended Sequence (Phase 11)

The task's own proposed shape was: CA fact model → LK domain onboarding → submission/CRC fact acquisition design → questionnaire revision → UAT → Consultative Composition resumes. Repository evidence **partially supports, partially reorders** this:

1. **Smallest, lowest-risk, fully decoupled fix (not gated on anything else):** surface `campaign_context` in the reviewer workbook UI (Section 10.J). This requires no product/legal decision, no schema change, no new fact model — it is a pure reviewer-tooling completion of work already done. Recommended as the literal next PR-sized task, independent of the rest of this sequence.
2. **Explicit product/governance decision on the three hypotheses** (do NOT skip this step): whether territory needs to be a required, precise, submission-appropriate fact distinct from Showcase-licensing territory; whether copyright-registration status is ever Commercial-Assurance-material; whether trademark becomes a governed LK domain. None of these should be built speculatively — all three need an explicit PM/governance decision first, per the task's own instruction not to invent requirements from conceivable issues alone.
3. **Generic submission-fact architecture work** (only for whichever of the above get a "yes"): extend the *pattern* already proven on the CRC side (a fail-closed askability/authority registry, mention-type correction semantics) to CertForm, rather than adding bespoke fields per domain. This is architecture work, not LK content authoring.
4. **LK domain onboarding** (trademark, and/or a copyright-registration-status concept) — only after step 2 authorizes it, and only using the generic dependency/applicability contract `TopicClaim` already provides (`geographic_relevance_scope` is the direct precedent for how a new cross-cutting dependency gets wired without special-casing).
5. **Questionnaire revision** — the actual CertForm content change, informed by 3 and 4, not ahead of them.
6. **UAT**, then **Consultative Composition resumes**, as originally proposed.

This reorders the task's sketch by inserting an explicit decision gate (step 2) before any architecture or content work, and by pulling the one already-decoupled fix (step 1) forward — both changes are evidence-driven (Sections 9–10), not stylistic preferences.

---

## 15. Explicit Implementation Gate

**No implementation of any kind is authorized by this document.** Specifically:
- No submission question changes until step 2's governance decisions are made.
- No LK domain onboarding (trademark or otherwise) until step 2 authorizes it.
- No CRC orchestration/schema change (e.g., adding a `trademark` `GoalCategory` value) until step 2 and step 3 are both explicitly authorized.
- The one item flagged as "smallest next milestone" (campaign_context reviewer visibility) is a recommendation, not a self-authorization — it still requires the user's go-ahead like any other change.

---

## Validation Checklist (performed before finalizing)

- `git diff --check` — no whitespace/conflict-marker issues (only new file added, no existing file touched).
- Confirmed via `git status` that only this document is new/staged for commit; the pre-existing unrelated uncommitted files (`01_Business/product-discovery/...`, `03_Sales/validation/...`) were left exactly as found.
- No schema/runtime/test file was opened in write mode at any point in this session (Read/Grep only against source).
- Every "gap" claim above cites a specific file path, line reference, or direct grep result; every hypothesis explicitly separates "proven" from "plausible candidate."
- No evidence-only fact (Section 7, Class C; `dependency-askability.ts` entries) is recommended for conversion to self-attestation anywhere in this document — checked explicitly against Section 8/12 language before finalizing.
- LK absence (trademark, copyright-registration) is described exactly as "coverage absent" / "domain gap," never as "not relevant" — checked against the task's own architectural premise before finalizing.
- No legal conclusion (e.g., "registration proves ownership," "this territory triggers liability") is asserted; every legal-sounding statement above is either a direct quote/citation of existing SI8 doctrine (Reviewer Manual, GOVERNED-CLAIMS.md) or explicitly hedged as unresolved.
