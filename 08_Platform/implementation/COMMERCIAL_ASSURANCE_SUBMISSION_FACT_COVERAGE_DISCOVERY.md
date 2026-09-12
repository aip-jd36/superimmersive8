# Commercial Assurance Submission Fact Coverage — Discovery / Architecture Audit

**Status:** DISCOVERY ONLY. No runtime, schema, API, UI, prompt, retrieval, Bounded Interpretation, composition, CRC-orchestration, or Commercial Assurance control change is authorized by this document.
**Date:** 2026-09-12
**Author context:** Upstream discovery workstream, run before returning to Consultative Composition (the CRC "Project-Fact-Aware Bounded Composition" deferred capability — `PRD_LIVING_KNOWLEDGE_SOURCE_INPUTS_v0.1.md` §27).
**Naming precedent:** `_DISCOVERY.md` suffix follows `HRR_SESSION_DISCOVERY.md` / `HRR_FOLLOWUP_DISCOVERY.md` in this same directory.

---

## 1. Scope and Non-Goals

**In scope:** whether the current CertForm ($499 SI8 Certified) submission questionnaire, CRC's structured fact model, Living Knowledge's governed claims, and the reviewer/evidence workflow together give Commercial Assurance the project facts it is actually designed to consume — examined directly from source, not from any single doc's summary of itself.

**Out of scope / explicitly NOT done here, per the task's own hard constraints:**
- No submission question added, removed, or reworded.
- No trademark (or any other) Living Knowledge domain onboarded.
- No CRC orchestration, retrieval, Bounded Interpretation, or composition change.
- No schema, migration, API, or UI change.
- No new assessment control, domain, or workbook field.
- Living Knowledge's current depth is treated as an **input** to this audit, never as the definition of what Commercial Assurance needs — absence from LK is reported as a possible **knowledge coverage gap**, never as proof a fact is irrelevant.
- Absence from the questionnaire, CRC, or the reviewer workbook is likewise never treated as proof of irrelevance; several facts are found **correctly absent** and this document says so explicitly rather than defaulting to "gap."
- No assessment conclusion (rights cleared / commercially approved / copyright owned / sufficient evidence / applicable jurisdiction) is treated as a project fact Commercial Assurance "needs as input" — these are outputs, and the document flags every place source material blurs that line.

This document is a map of what exists and what is missing, with a recommended sequence. It authorizes nothing beyond itself.

---

## 2. Source Baseline

- Repository: `https://github.com/aip-jd36/superimmersive8.git`, branch `main`.
- Pre-existing uncommitted working-tree changes (unrelated in-progress work under `01_Business/product-discovery/` and `03_Sales/validation/`) were present at the start of this session and were **not** touched, staged, or discarded.
- `git fetch origin` confirmed local `main` was 1 commit behind `origin/main` (`700cf35` → `92ef003`), with **zero file overlap** (`git diff --name-only HEAD origin/main` touched only `08_Platform/implementation/HRR_CONVERSATIONAL_ARCHITECTURE.md` and `08_Platform/prds/PRD_CAH_4G_HRR.md`) with the uncommitted working-tree files. Fast-forwarded via `git merge --ff-only origin/main` — safe, no working-tree disturbance, confirmed by `git status` immediately after.
- **Baseline commit used for this discovery: `92ef00323c8798a446248b158c2aaa39523d850f` (`origin/main`).**
- New branch `cah-4i-submission-fact-coverage-discovery` created from that HEAD via `git branch` + `git switch` (not `checkout -b`, per the task's own caution) — confirmed the 12 pre-existing uncommitted files carried across the switch unchanged.
- This document is the only file added on that branch. It has not been merged or pushed.

---

## 3. Current Submission Architecture (Phase 2)

### 3.1 Which form is "the" submission contract

Two submission products exist: **RecordForm** (`app/record`, $29, self-attested, auto-approved, no human review — its `rights_packages` output is explicitly stamped "SELF-ATTESTED — NOT FOR COMMERCIAL USE") and **CertForm** (`app/certify`, $499, human-reviewed, the only tier that reaches the Commercial Assurance reviewer workbook — `SI8-Reviewer-Workbook-Schema-v0.1.md` Step 0 pre-assessment triage explicitly checks "Submission is SI8 Certified tier (not Creator Record — Creator Record assessments are automated)"). **CertForm is the relevant contract for this audit** and is the only one traced in detail below.

### 3.2 CertForm — source-verified section map

Source: `08_Platform/app/app/certify/page.tsx` (1373 lines, read in full). Code is authoritative; `PRD_CERT_FORM.md` and `CERT_FORM_IMPL.md` describe an 11-section design that **numbers and groups sections differently from the shipped code** — documented drift, not a functional problem (§3.4).

11 sections as actually shipped (`SECTION_NAMES`, page.tsx:21-33):

| # | Section | Key fields (raw answer → persisted shape) | Persisted column (migration) |
|---|---|---|---|
| 1 | Production Details | `title`, `runtime_minutes`/`runtime_seconds` → `runtime` (seconds), `genre`, `logline`, `primary_use`; submission mode (`creator`/`agency`) and `client_name` (agency only); Commercial Context block: `isLiveCampaign` (bool), `budgetRange` (enum), `distributionChannels` (multi-select) | `title`, `runtime`, `genre`, `logline`, `intended_use` (JSONB incl. `primary_use` + brand-safety category lists), `client_name`, `campaign_context` JSONB (`20260401000000_add_certform_fields.sql`) |
| 2 | Tool Disclosure | Repeating `Tool` objects via `AddToolModal`: `toolName`/`toolNameOther`, `version`, `planType` (incl. `Enterprise`/`Free`), `startDate`/`endDate`, `receipt` (required — `requireReceipt={true}`), `isPrimary` | `tools_used` JSONB array |
| 3 | Third-party Assets | Boolean `hasThirdParty`; repeating items: `type` (Stock Footage / 3D Model / Freelance-Generated Element / Music-SFX / Other), `description`, `license_status` (Licensed / Purchased Outright / Public Domain / Unclear), optional license-doc upload | `third_party_assets` JSONB |
| 4 | Human Authorship | `authorship_statement` (≥150 words, zod-enforced), `aiPercentage` (0-100 slider), post-gen editing (bool + software list + description), optional scene-attribution rows (scene/tool/prompt-summary), **Evidence Custodian Declaration** (bool, required to advance) | `authorship_statement`, `ai_percentage`, `post_gen_editing` JSONB, `scene_attribution` JSONB, `custodian_declaration` bool |
| 5 | Likeness & Identity | Path A (4 no-real-person checkboxes) **or** Path B (signed release upload, required if chosen) | `likeness_confirmation` JSONB (`{path:'a', no_real_faces...}` or `{path:'b', has_licensed_content, release_on_file}`), `likeness_release_path` |
| 6 | IP & Brand | Path A (3 checkboxes incl. `ip_no_trademarked_ip`, `ip_no_brand_imitation`) **or** Path B (license/authorization upload) **or** Path C (fair-use argument text + optional supporting doc) | `ip_confirmation` JSONB, `ip_license_path`, `fair_use_argument`, `fair_use_doc_path` |
| 7 | Audio & Music | `audio_source` enum (`ai_generated`/`licensed`/`silent`); license upload required if `licensed` | `audio_disclosure` JSONB (`{source_type, license_path}`) |
| 8 | Production Evidence (optional) | Boolean; repeating evidence items (type/title/upload) + free-text notes | `production_evidence_paths` JSONB (`{items, notes}` — **one column**, not two; see §3.4) |
| 9 | Territory (creator) / Commercial Context (agency) | `territory` enum: `Global` / `North America` / `Europe` / `Asia` / `Other` (+ `territory_other` free text if `Other`); agency mode instead shows `client_name` + the same coarse territory enum, both optional | `territory_preferences` (text — stores the enum value or the free-text override) |
| 10 | Video | `video_url` (required, YouTube/Vimeo) | `video_url` |
| 11 | Review & Submit | Evidence Custodian (if not already checked), **Indemnification Warranty**, **Content Integrity Declaration**, **Scope of Review Acknowledgment** — all 4 required to submit | `indemnification_confirmed`, `content_integrity_accepted`, `scope_acknowledged`, `custodian_declaration` |

**Catalog/Showcase opt-in is currently disabled in code** (page.tsx:354, :458-465, :1218, :1232-1245 — all marked `// CATALOG DISABLED`). `PRD_CERT_FORM.md`'s Section 10 title ("Video & Showcase") and its DB-changes table therefore describe a state the live form does not currently offer.

### 3.3 Consumers

- `POST /api/submissions/create` persists `submissionData` verbatim as constructed above (page.tsx:366-456).
- `POST /api/checkout/create-session` starts Stripe checkout; on webhook success the submission becomes reviewable.
- **Reviewer workbook** (`app/admin/submissions/[id]/review/*`) is the primary downstream consumer — Section 1 Intake reads `territory_preferences`/`tools_used`/etc. directly (see §4).
- `lib/assessments/reportProjection.ts` reads `submission.territory` / `submission.territory_preferences` for the Report's "Intended territory" field (line 253-254), and explicitly documents (lines 397-405) that **no submission field or reviewer control produces a structured C2PA-presence boolean** — the Report projection fails closed to "Unknown" rather than inferring one.
- `lib/reviewer-lk/submission-facts.ts` reads `tools_used` and `territory_preferences` to narrow Reviewer Living Knowledge lookups (see §7.1 — this is the flagship geography finding).

### 3.4 Confirmed doc-vs-code drift (informational, not itself a gap)

- `PRD_CERT_FORM.md` groups sections differently (its "Section 3" = Tool Disclosure **and** Third-party Assets combined; the shipped code splits these into Sections 2 and 3).
- `PRD_CERT_FORM.md`'s DB-changes table lists `production_evidence_notes` as a separate column; the shipped migration and code use one `production_evidence_paths` JSONB column with an internal `notes` key.
- `PRD_CERT_FORM.md` describes an active Showcase opt-in in Section 10; the shipped code has it fully commented out.
- None of this drift is itself a fact-coverage gap — it is recorded because the task requires flagging doc/code divergence, and because a future reader must not plan against the PRD's section numbering.

---

## 4. Commercial Assurance Fact-Demand Inventory (Phase 3)

Source: `06_Operations/reviewer-workbook/SI8-Reviewer-Manual-v0.2.md` (895 lines, read in full) and `SI8-Reviewer-Workbook-Schema-v0.1.md` (512 lines, read in full), cross-checked against `08_Platform/app/lib/assessments/signoff.ts` (`METHODOLOGY_DOMAIN_CODES`, `DOMAIN_CODE_LABELS`) and `service.ts` (`METHODOLOGY_VERSION = 'SI8 Reviewer Manual v0.2'`). **The 7 domains and their labels are implemented in code, not only in the markdown manual** — `signoff.ts` is the authoritative source and matches the manual exactly: `A` Identity & Accountability, `R` Commercial Rights & Licensing, `H` Human Creative Contribution, `I` Third-Party IP, `L` Likeness & Performer Rights, `T` Technical Provenance, `D` Documentation Integrity. 16 controls total.

| Domain.Control | Fact/concept the control consumes | Why needed | Implemented today? | Blocks what if absent | Source |
|---|---|---|---|---|---|
| A01 | Submitter identity, company, role, authority to submit | Establishes who is making every other representation in the submission | Implemented (CertForm submission-mode + auth identity) | Reduces reliability of every other domain's weight (not itself outcome-blocking) | Manual v0.2:333-358; Schema:88-98 |
| R01 | Named AI tool(s) + version | Basis for R02/R03/R04 and for I (training-data residual risk) | Implemented (`tools_used`) | Cannot assess licensing at all | Manual:362-402; Schema:104-112 |
| R02 | Commercial-plan proof for each tool, dated at/before generation | Most commercially critical domain — direct infringement exposure if absent | Implemented (receipt upload required, `plan_type` incl. Enterprise) | Blocks a positive outcome outright per Manual:402 | Manual:364-402; Schema:114-124 |
| R03 | Custom/fine-tuned/locally-hosted model + training-data-rights documentation | Different, additional licensing question when a bespoke model was used | **No corresponding submission question** — `AddToolModal` has no "custom/fine-tuned model" field | Reviewer has no signal to trigger this control at all — see §8, proven gap | Manual:126-136 (Schema R03); page.tsx AddToolModal fields |
| R04 | Output-rights basis (tool ToS + work-for-hire/contractor agreement if applicable) | Confirms who legally holds rights to license the output | Partially implemented — tool ToS is inferable from R01/R02; **no explicit work-for-hire/contractor-agreement question** exists anywhere in CertForm | Reviewer must infer from Section 3 (third-party) or Section 1 (submission mode) rather than a direct answer | Manual:138-147; Schema:138-147 |
| H01/H02 | Nature/extent of human creative involvement; copyright-claim basis (never copyright sufficiency itself — see the explicit "SI8 does not make copyright determinations" caveat, Manual:412) | Chain-of-title / authorship narrative | Implemented (`authorship_statement`, `ai_percentage`, post-gen editing, scene attribution) | Domain H caps at "Partially Verified" without a **corroborating artifact** (prompt log/project file/brief/timeline export) per the v0.2 corroboration rule (Manual:441) | Manual:406-447; Schema:151-176 |
| I01 | Recognizable third-party copyrighted content in the content itself | Direct-content-review control — reviewer must watch, not just read disclosure | Implemented as a submission disclosure input (Section 3) that the reviewer cross-checks against direct viewing | The reviewer-side viewing step is not a submission fact at all — correctly evidence-only/reviewer-established | Manual:450-479; Schema:181-191 |
| I02 | Audio/music rights (AI-generated w/ commercial rights, or licensed) | Same infringement-exposure logic as R02, applied to audio | Implemented (`audio_disclosure`) | — | Manual (Domain I, audio sub-control referenced at Schema:193-204) |
| I03 | "Brand, Logo, and Trademark Elements" — identifiable trademark/brand elements in the content | Nominally a distinct control label | Implemented as a **self-attestation checkbox** (`ip_no_trademarked_ip`, `ip_no_brand_imitation`) cross-checked by reviewer visual review — **but the Manual's own decision logic (lines 473-479) does not differentiate trademark analysis from copyright-character visual detection at all**; there is no registration, use-in-commerce, or likelihood-of-confusion concept anywhere | Reviewer treats "logo" identically to "character" — see §10.3, a genuine finding, not a fabricated one | Schema:206-215 (I03 label); Manual:450-479 (decision logic, no I03-specific branch) |
| L01/L02/L03 | Real-person likeness presence, synthetic-performer distinctness, consent/release documentation | Direct legal exposure (right of publicity, NY §396-b) | Implemented — Path A self-attestation checkboxes + Path B release upload, explicitly cross-checked by reviewer's own direct-review "identifiable" visual judgment (Manual:517-528) — **a well-structured example of self-attestation correctly paired with independent reviewer determination, not solely relied upon** | — | Manual:493-533; Schema:219-255 |
| — (L, jurisdiction gate) | "US territory deployment" — gates whether NY Synthetic Performer Law (S.8420-A) gets flagged in the Report | Jurisdiction-specific disclosure obligation, explicitly commercially significant | Sourced from the **same coarse `territory_preferences` field** used for the Report's "Intended territory" display — see §7.1 for why this is unreliable | If the submitter picked "North America" rather than typing "United States," this jurisdiction-specific flag will not reliably fire | Manual:497, 530 |
| T01 | Generation-workflow documentation depth; C2PA/Content Credentials presence (if any); on-chain registration (if any) | Supports the other domains' evidence weight; provenance metadata noted as a positive factor, never required | Workflow documentation implemented (Section 4/8). **C2PA/on-chain presence has no structured submission field or reviewer-tool signal at all** — `reportProjection.ts:397-405` explicitly documents this and fails closed to "Unknown" | Correctly NOT a submission-appropriate fact (it would require inspecting the file's embedded metadata, a reviewer/technical determination, not a self-report) | Manual:537-554; `reportProjection.ts:397-413` |
| D01/D02 | Internal date/tool/version consistency across submitted documents; indicators of retroactive documentation | Cross-check control, derived entirely from other domains' evidence | Correctly **not** a distinct submission question — it is a reviewer synthesis step | — | Schema:276-299 |

**Explicit conclusion-vs-fact discipline confirmed from source, twice, independently:**
1. Manual v0.2:65-79 ("Commercial Framing, Not Legal Conclusions") lists five things the reviewer explicitly **does not opine on**, including *"Whether a specific jurisdiction's law applies to the content"* and *"Whether the content is legally copyrightable."*
2. The Report's own boilerplate (`reportProjection.ts:434-440`, verbatim from `SI8-Assessment-Report-Template-v0.2.md`): *"SI8 has not conducted independent title searches, chain of copyright investigations, or registrations with any government body."*

Both are **direct, primary-source evidence** that "applicable jurisdiction" and "copyright/registration status" are, by SI8's own current design, conclusions/verifications SI8 explicitly disclaims performing — not facts Commercial Assurance is designed to independently establish. This bounds how far §7.2/§7.3 below can go: a submission-collected registration fact could exist as **self-reported context or attached documentary evidence**, but SI8's own methodology already states it will not independently verify it against a government registry.

---

## 5. Authority/Source Taxonomy (Phase 6)

Classes A-F as specified in the task, applied to the facts actually found in §4/§7/§8:

| Class | Definition | Examples found |
|---|---|---|
| **A — Submission-appropriate user fact** | Submitter can safely self-report an observable/project fact | Tool names/versions/dates; audio source type; "did you add post-gen editing"; distribution channels; live-campaign status |
| **B — Conditional/CRC-askable user fact** | Legitimate but not necessarily mandatory-up-front; askable only when governed relevance warrants it | `human_contribution_description` (CRC's one live `askable_in_crc` entry — `dependency-askability.ts:110`); CRC's assessment-jurisdiction clarification (askable only when an active confirmed UserGoal resolves to a claim with a jurisdiction requirement — `jurisdiction-clarification.ts`) |
| **C — Evidence-only/reviewer-established fact** | Must come from documentary evidence or direct reviewer review; must NOT become self-attestation | Editorial designation, separate authorization, release status, rights-and-clearance status (the codified "stock governance" set, `dependency-askability.ts:109-111`, `CRC_CURRENT_STATE.md:48`); C2PA/on-chain presence (technical, file-level); "is this trademark/logo actually infringing" (reviewer visual judgment, Manual I01/I03) |
| **D — Derived/interpretive fact** | Produced by governed logic/BI/reviewer judgment, not askable as if the user were authoritative | "Applicable jurisdiction" (explicitly disclaimed, Manual:72); "sufficient evidence"/outcome/Risk Rating (Workbook §5); D01/D02 documentation-integrity findings |
| **E — External/institutional fact** | From a registry, provider, or SI8 workflow state | A copyright-registration certificate or USCO filing receipt, if the submitter uploads one (would be evidence, Class C/E hybrid — SI8 does not itself query the registry, per §4's Report-boilerplate citation) |
| **F — Unresolved authority** | Evidence insufficient to decide | Copyright-registration status generally (see §10.2) — no domain currently claims it, so there is no basis yet to assign A/B/C |

### 5.1 Stock Governance Hard Rule — authoritative citation

The task's example list ("Editorial designation; separate authorization; release status; rights-and-clearance status") is **verbatim from this repository**, not invented for this task:

> **"Stock governance (evidence-only, unchanged):** editorial designation, separate authorization, release status, and rights-and-clearance status remain evidence-only — never converted into user self-attestation questions. This list is not broadened here; broadening it requires its own governance decision, not a documentation pass."
> — `08_Platform/implementation/CRC_CURRENT_STATE.md:48`

Its **code-level enforcement mechanism** is `08_Platform/app/lib/crc-engine/dependency-askability.ts:109-116`: a closed registry (`DEPENDENCY_TREATMENTS`) with exactly one `askable_in_crc` entry (`human_contribution_description`); every other dependency — including the entire stock-governance set — is absent from the registry and therefore **fails closed to non-askable by construction** ("Absence defaults to non-askable, never the reverse," line 29-30). `PRD_CAH_4G_HRR.md:142,213` and `HRR_GRI_TECHNICAL_DESIGN.md:224` independently restate the identical rule for HRR's free-form reviewer research classifier, confirming the boundary is enforced consistently across both CRC's user-facing questioning and the reviewer's own research interface — HRR cannot convert an evidence-only fact into a reviewer self-attestation prompt either.

**No evidence-only fact was found, anywhere in this audit, recommended as a candidate for submitter self-attestation.** This was checked explicitly per the validation requirement.

---

## 6. Canonical Coverage Matrix (Phase 7)

Statuses per the task's own vocabulary. "Consumer(s)" abbreviates: Rev=reviewer workbook, Rpt=Assessment Report, LK=Living Knowledge/Retrieval, CRC=CRC session.

| Fact / concept | CA demand | Authority class | Submission coverage | Structured fact coverage | CRC askability | LK dependency/coverage | Reviewer/evidence coverage | Consumer(s) | Gap classification | Evidence |
|---|---|---|---|---|---|---|---|---|---|---|
| AI tool identity + version | Yes (R01) | A | COVERED | `tools_used` JSONB | Yes (`tool_mention`, canonicalized via `normalizeCandidate`) | Tool-scoped claims exist (PIKA/KLING/RUNWAY/etc.) | Rev reads directly | Rev, Rpt, LK | — | page.tsx:379-388; extraction.ts |
| AI tool commercial license/receipt | Yes (R02) | A + C (receipt) | COVERED | `tools_used[].receipt_path`, `plan_type` | Related: `tool_account_status` selector exists in CRC | Plan-tier applicability facts reserved (`ApplicabilityFacts.toolMentions`) | Rev reviews receipt directly | Rev, Rpt | — | Manual:362-402 |
| Custom/fine-tuned model + training-data rights | Yes (R03, "if applicable") | A (existence) + C (training-data rights docs) | **NOT COVERED** | none | No | No | No trigger signal reaches reviewer at all | Rev (manual-only) | **PROVEN GAP — questionnaire gap** | Schema:126-136 vs. AddToolModal fields (no custom-model flag) |
| Output rights / work-for-hire basis | Yes (R04) | A + C | PARTIALLY COVERED (inferable, not asked directly) | none dedicated | No | No | Reviewer infers from Sections 1/3 | Rev | PLAUSIBLE CANDIDATE (not proven — reviewer has always had a workaround) | Schema:138-147 |
| Human creative contribution narrative | Yes (H01/H02) | A (narrative) + C (corroborating artifact) | COVERED | `authorship_statement`, `scene_attribution`, `post_gen_editing` | Yes — separately, in CRC (`human_contribution_description`, the one `askable_in_crc` entry) | N/A | Rev requires corroborating artifact per v0.2 (Manual:441) | Rev, Rpt, CRC (parallel, unbridged) | See §7.4 — CRC↔submission bridge gap, not a submission-question gap | Manual:406-447; `dependency-askability.ts:110` |
| Third-party assets (stock/freelance/music) | Yes (I01) | A + C (license doc) | COVERED | `third_party_assets` JSONB | Yes — extensive (stock-provider claims, editorial-designation dependencies, all evidence-only) | Deep (7 STOCK claims + Getty/Shutterstock/iStock specific) | Rev cross-checks by direct viewing | Rev, LK | — | Schema:181-191 |
| Likeness / real-person presence | Yes (L01-L03) | A (self-report) + C (reviewer visual judgment, cross-checked) | COVERED | `likeness_confirmation` JSONB | Partial (LIKENESS-NY claim exists, jurisdiction-scoped) | 1 claim (`CLAIM-NY-SYNTHETIC-PERFORMER-DISCLOSURE-001-v1`) | Rev makes independent "identifiable" visual call | Rev, Rpt, LK | — | Manual:493-533 |
| Trademark/brand/logo elements | Yes (I03, nominal control) | C (reviewer visual) + A (self-attest as input) | COVERED as input, but decision logic undifferentiated | `ip_confirmation` JSONB | No | **0 governed claims** | Rev applies copyright-visual-scan logic, not a distinct trademark test | Rev | **LK DOMAIN GAP** (control exists; no governed knowledge backs it) — see §10.3 | Schema:206-215; Manual:450-479; GOVERNED-CLAIMS.md claim count |
| Fair use argument | Implicit (I domain, Report caveat) | A (argument) + C (supporting doc) | COVERED, but no dedicated workbook control | `fair_use_argument`, `fair_use_doc_path` | No | No | Rev documents in Report per Manual:1009 (CertForm UI copy), no Schema I-sub-control named "fair use" | Rev, Rpt | Minor structured-fact-model gap (collected but not modeled as its own control) | page.tsx Section 6 Path C; Schema §Domain I (no dedicated control) |
| Audio/music source + license | Yes (I02) | A + C | COVERED | `audio_disclosure` JSONB | No | 10 MUSIC claims (Envato/Epidemic/Artlist) | Rev reviews directly | Rev, LK | — | Schema:193-204 |
| Production workflow depth | Yes (T01) | A (description) + C (artifacts) | COVERED | `production_evidence_paths`, `scene_attribution` | No | No | — | Rev, Rpt | — | Manual:537-554 |
| C2PA / on-chain provenance presence | Yes (T01, positive factor only) | C (technical/file-level) | **NOT COVERED** — no field | none | No | No | No reviewer tool computes this from the file | Rpt (fails closed to "Unknown") | **Correctly NOT submission-appropriate** — this is a file-inspection fact, not a self-report | `reportProjection.ts:397-413` |
| Documentation internal consistency | Yes (D01/D02) | D (derived) | N/A — synthesis step | N/A | No | No | Rev synthesizes from other domains | Rev | **NOT APPLICABLE** — correctly absent as its own question | Schema:276-299 |
| Distribution / intended deployment territory | Yes (Report display; L-domain US-jurisdiction gate) | A (self-report) | COVERED but coarse (5-bucket enum) | `territory_preferences` (raw string) | Passive only (`distribution_territory_mention`, extracted if volunteered, not actively asked) | Consumed by CRC's own discovered-relevance/retrieval | `resolveSubmissionJurisdiction` wraps the raw string with **no canonicalization** | Rev, Rpt, CRC(session-only) | **PROVEN GAP** — granularity + no canonicalization bridge; see §7.1 | `submission-facts.ts:68-73`; `lookup-topic-claims.ts:102-115` |
| Assessment jurisdiction (which law's governed knowledge to surface) | Implicit (drives which LK claims are eligible) | B (CRC-askable, narrowly gated) | **NOT COVERED on CertForm at all** | CRC-session-only (`StructuredUnderstanding.assessment_jurisdiction_mentions`) | Yes, actively (`jurisdiction-clarification.ts`) | 3 COPY claims require `jurisdiction: 'United States'` | Reviewer never sees this CRC fact — no CAH bridge for structured facts | CRC only | **CRC ASKABILITY GAP relative to submission** — exists and is askable in CRC, never reaches the submission/reviewer surface | `assessment-jurisdiction-scope.ts`; `crc-assurance-handoff/service.ts` (association-only, no fact transfer) |
| Copyright registration (filed/granted, registrant, registry ref) | Not established as a Commercial Assurance requirement today | F (unresolved) | NOT COVERED | none | No | 0 registration-specific claims (4 COPY claims all address *copyrightability*, not registration) | Domain H explicitly disclaims copyright determinations; Report boilerplate explicitly disclaims registry investigations | none | **PLAUSIBLE CANDIDATE, not proven** — see §10.2 | GOVERNED-CLAIMS.md (COPY-001..004); Manual:412; `reportProjection.ts:434-440` |
| Client/entity location (HQ jurisdiction, distinct from deployment territory) | No evidence found | F | NOT COVERED (only `client_name` text) | none | No | No | No control references it | none | **Correctly absent** — no source evidence Commercial Assurance needs this distinct from deployment territory | Manual (no reference found) |
| Production/filming location | No evidence found | F | NOT COVERED | none | No | No | No control references it | none | **Correctly absent** | Manual (no reference found) |
| Fully-automated-content flag (zero human involvement) | Yes (Manual:443, "material finding") | A | Indirectly covered (`ai_percentage` slider + narrative), no explicit boolean | none dedicated | No | No | Rev infers from percentage/narrative | Rev | Minor — inference works today, not proven broken | Manual:443 |

---

## 7. Motivating-Hypothesis Findings (Phase 8)

### 7.1 Geography / distribution territory / jurisdiction — the flagship, code-proven finding

Three **structurally separate, uncoordinated** geography representations exist today:

1. **CertForm's `territory` field** (page.tsx:84-85, :1172-1204) — a 5-value enum (`Global`/`North America`/`Europe`/`Asia`/`Other` + free text) persisted as a raw string to `submissions.territory_preferences`. This feeds (a) the Assessment Report's "Intended territory" display (`reportProjection.ts:253-254`) and (b) the Reviewer Manual's own jurisdiction-specific gate: *"For any submission with US territory in the intended deployment, flag [NY Synthetic Performer Law S.8420-A]'s applicability"* (Manual:497, 530).

2. **CRC's `assessment_jurisdiction_mention`** — a structured, session-scoped fact (`lib/crc-engine/assessment-jurisdiction-scope.ts`, `jurisdiction-clarification.ts`) that CRC can **actively ask about** (Class B), narrowly gated on an active confirmed UserGoal resolving to a claim with a jurisdiction requirement. This is what determines which of the 3 governed `CLAIM-COPY-00{1,2,3}-v1` claims (the only claims with a jurisdiction requirement — `applicability_requirements: [{fact:'jurisdiction', operator:'equals', value:'United States'}]`, `topic-claims-fixture.ts:174,193,212`) become CRC-eligible for that session.

3. **CRC's `distribution_territory_mention`** (Generic Distribution/Output-Use Territory Contract, 2026-09-11 — `extraction.ts`, `mutations.ts`) — the newest, most precise representation: raw country/region strings, correction/supersession-aware, feeding CRC's own discovered-relevance and retrieval. Confirmed via `gates.ts`/`candidate-question.ts` grep: this fact is **passively extracted only** (when the user volunteers it), never actively asked by CRC today.

**None of #2 or #3 reach the CertForm submission or the reviewer workbook.** `lib/crc-assurance-handoff/service.ts` is confirmed (by direct reading) to be a pure **association/authorization** primitive — it binds a CRC session id to a submission id so a reviewer can *browse* that session's context live; it does not copy any structured fact into `submissions` or into `workbook_data`. Confirmed by `grep -n "territory" lib/crc-assurance-handoff/*.ts` returning zero non-test hits.

Instead, the reviewer-LK narrowing path (`08_Platform/implementation/REVIEWER_RESOURCES_ARCHITECTURE.md:63,66,131`) reads `submissions.territory_preferences` directly, through `lib/reviewer-lk/submission-facts.ts:68-73`:

```ts
export function resolveSubmissionJurisdiction(territoryPreferences: unknown): AssessmentJurisdictionFacts {
  if (typeof territoryPreferences === 'string' && territoryPreferences.trim().length > 0) {
    return { included: [territoryPreferences.trim()], excluded: [] }
  }
  return { included: [], excluded: [] }
}
```

This wraps the raw CertForm enum value **with no canonicalization** — contrast with the parallel `resolveSubmissionToolIds`, four lines above it in the same file, which does run tool names through the governed `normalizeCandidate` primitive. The applicability comparison this feeds (`lib/retrieval-engine/lookup-topic-claims.ts:102-159`) only canonicalizes a small, explicit alias table (`us`/`usa`/`u.s.`/`the us` → `'United States'`) — deliberately **not** including `'North America'`, since a super-region cannot be safely collapsed to a specific country (the code's own comment confirms this is intentional, not an oversight: "An unrecognized string ... is returned unchanged and therefore still fails a `'United States'` requirement exactly as before — fail-closed by construction").

**The concrete, code-proven consequence:** a genuine US submission that selects CertForm's `"North America"` bucket (rather than typing `"United States"` verbatim into the free-text "Other" field) will have `territory_preferences = "North America"`, which will **never** canonicalize to `"United States"`, which means every `jurisdiction`-gated claim (currently the 3 COPY claims, and structurally any future US-gated claim such as a Reviewer-LK-surfaced NY §396-b claim) resolves as `not_met` for Reviewer LK narrowing purposes even though the underlying reality is a US deployment. The Reviewer Manual's own NY-law flag (Manual:530) is a **manual reviewer judgment call**, not code-enforced, so it survives this gap today — but the Reviewer-LK *lookup* narrowing (a separate, code-enforced path) does not.

**Classification:** this is a genuine, source-proven **structured-fact-model gap** (three uncoordinated geography representations) compounded by a **submission-question granularity gap** (the CertForm enum's buckets don't align with the country-level values LK claims key on). It is *not* a "just add more submission questions" problem — see §11.

### 7.2 Copyright registration — investigated, found architecturally out-of-scope today, not a proven gap

Searched: all 4 `CLAIM-COPY-*` governed claims (`GOVERNED-CLAIMS.md:76-433`), the Reviewer Manual's Domain H, the Report boilerplate, CertForm, and CRC's structured facts. Findings:

- All 4 COPY claims concern **copyrightability** (whether/how much human involvement is legally required for AI output to be copyrightable at all — USCO Part 2 Report, *Thaler v. Perlmutter*, *Zarya of the Dawn*). None concerns registration status, application filing, or registry records for a *specific* submitted work.
- Domain H explicitly states: *"SI8 does not make copyright determinations ... The copyright question belongs to courts and lawyers"* (Manual:412).
- The Report's own Standard Assurance Language explicitly disclaims: *"SI8 has not conducted independent title searches, chain of copyright investigations, or registrations with any government body"* (`reportProjection.ts:434-440`, verbatim from `SI8-Assessment-Report-Template-v0.2.md`).
- No CertForm field, CRC structured fact, or reviewer workbook control references registration status anywhere.

**Conclusion:** copyright registration is not currently modeled anywhere in Commercial Assurance, and there is **no source evidence that the current architecture is designed to establish it** — the opposite: SI8's own methodology disclaims doing the verification work a registration claim would require (an independent registry check). This is classified as a **PLAUSIBLE CANDIDATE requiring a product/governance decision**, not a proven gap. If SI8 ever wants this (e.g., because E&O underwriters value it), the primitive fact ("has an application been filed, what registry, what reference number") would be Class A/E (self-report + optionally an uploaded certificate as Class C evidence) — but adding it would not, by itself, let SI8 verify it, since SI8's own Report language explicitly declines to perform registry investigations.

### 7.3 Trademark — investigated, found to be a genuine LK domain gap sitting under an already-existing control

Unlike copyright registration, trademark is **not absent from Commercial Assurance's conceptual scope** — Domain I explicitly names control `I03 — Brand, Logo, and Trademark Elements` (`SI8-Reviewer-Workbook-Schema-v0.1.md:206-215`), and CertForm explicitly collects self-attestation input for it (`ip_no_trademarked_ip`, `ip_no_brand_imitation`, page.tsx:961-963). The gap is **downstream of that**: the Manual's actual decision logic for Domain I (lines 473-479) treats "logo" identically to "character" under one undifferentiated visual-scan rule — there is no separate trademark-specific evidence-acceptability standard (registration, use-in-commerce, likelihood-of-confusion, source-asset licensing chain).

`GOVERNED-CLAIMS.md` contains **zero trademark-domain governed claims** out of 37 total (4 COPY, 10 MUSIC, 7 STOCK, remainder tool/platform-specific commercial-use claims — verified by direct header count: `grep -oE "^### CLAIM-[A-Z]+"`). This matches the task's own framing precisely: **copyright coverage is itself modest (4 claims) but trademark coverage is zero**, and the existing I03 control label is evidence Commercial Assurance's design already anticipated trademark relevance without LK ever having been asked to back it.

**Classification:** genuine **LK DOMAIN / KNOWLEDGE COVERAGE GAP** — not a submission-question gap (submission already collects the relevant self-attestation input), not a reviewer-workflow gap (the control exists), but a governed-knowledge gap underneath an already-designed-for control. Per the task's explicit instruction, **no trademark claim, propositions, or CRC behavior is proposed here.**

### 7.4 The CRC ↔ Commercial Assurance fact bridge — a cross-cutting structural finding, not specific to any one hypothesis

All three motivating hypotheses (geography, registration, trademark) intersect one deeper structural fact: **CRC and Commercial Assurance maintain two entirely separate, unrelated project-fact object models**, and the one linkage mechanism that exists (`crc-assurance-handoff`, CAH-3x/4x) is deliberately an *association* (which CRC session belongs to which submission, for a reviewer to browse) rather than a *fact-transfer* mechanism. `human_contribution_description` is the sharpest illustration: it is CRC's one actively-askable structured fact, and it asks for **exactly the same underlying information** as CertForm's `authorship_statement` field — yet a customer who already answered it in a CRC conversation gets no benefit; CertForm asks the identical question again from scratch, with no pre-fill, no cross-reference, no corroboration credit. This is explored further in §11.

---

## 8. Additional Proven Gaps (Phase 9)

Beyond the three motivating hypotheses, direct source inspection surfaced:

1. **Domain R03 (custom/fine-tuned model rights) has no CertForm trigger question at all.** `AddToolModal.tsx`'s tool fields (`toolName`, `version`, `planType`, dates, receipt) have no "is this a custom/fine-tuned/locally-hosted model" flag. The Reviewer Manual's own control (Schema:126-136) can only ever be marked "N/A — no custom model" by inference, never affirmatively triggered by submission data. **PROVEN GAP** (a real, existing control has zero submission-side signal), traced to source on both sides.

2. **Domain R04 (work-for-hire/contractor agreement)** has no dedicated question; the Manual explicitly lists it as acceptable evidence (Manual:144) but CertForm never asks for it directly — only inferable from submission mode and Section 3's freelance-item entries. **Weaker finding** — flagged as a plausible candidate, not proven, since the reviewer has always had an indirect path.

3. **Fair-use argument/documentation** (`fair_use_argument`, `fair_use_doc_path`) is collected by CertForm Section 6 Path C but has **no corresponding named control** in the Workbook Schema — Domain I's controls (I01/I02/I03) don't mention fair use, even though the CertForm UI explicitly promises *"SI8 will document your argument in the Chain of Title"* (page.tsx:1009). This is a minor **structured-fact-model gap**: real data is collected with nowhere formally defined in the workbook schema for the reviewer to record their assessment of it (the Manual's Findings Log can absorb it informally, but there is no dedicated control).

4. **Fully-automated-content flag** — Manual:443 treats "no human involvement at all" as a distinct, material finding, but CertForm has no explicit boolean for it; the reviewer must infer this from the `ai_percentage` slider (which defaults to 80, not 0 or 100) and the free-text authorship narrative. Weak finding, not proven broken, but a real inference burden shifted onto the reviewer that a single boolean question could remove.

No other candidate gap met the bar of tracing to concrete repository/product evidence; several plausible legal-checklist items (production location, client HQ jurisdiction, insurance status, distribution-platform-specific terms) were considered and explicitly rejected below as correctly absent (§9).

---

## 9. Facts Correctly Absent from Submission (explicit, per task's own caution against conflating "not asked" with "gap")

- **C2PA/Content-Credentials/on-chain-registration presence** — a file-level technical fact, not something a submitter reliably self-reports; `reportProjection.ts` already fails closed to "Unknown" rather than inventing a submission field. Correctly a reviewer/technical-inspection concern, not a submission-question gap.
- **Documentation internal consistency (D01/D02)** — by definition a cross-check derived from other domains' evidence; cannot be a submission question without becoming circular.
- **"Applicable jurisdiction" as a direct question** — explicitly disclaimed as a conclusion SI8 does not reach (Manual:72); asking it directly of the submitter would invert the authority model (the submitter is not positioned to answer a legal-applicability question, and the Manual is explicit that SI8 itself won't answer it as a legal matter either).
- **Production/filming location, client HQ jurisdiction** — no control, no claim, no doc anywhere references either as distinct from *deployment* territory. No evidence found that Commercial Assurance's design needs them; recorded as an explicit finding of absence, not silently dropped.
- **Assessment outcome / Risk Rating / commercial confidence** — these are Workbook Section 5 outputs, never inputs; already correctly reviewer/synthesis-only and never collected from the submitter (obviously correct, checked anyway per the task's own conclusion-vs-fact discipline).

---

## 10. Evidence-Only / Reviewer-Only Protections (cross-reference to §5.1)

Restated here for completeness against the task's required section list: see §5.1 for the full citation chain (`CRC_CURRENT_STATE.md:48`, `dependency-askability.ts:109-116`, `PRD_CAH_4G_HRR.md:142,213`, `HRR_GRI_TECHNICAL_DESIGN.md:224`). No finding in this document proposes converting any of the codified stock-governance facts (editorial designation, separate authorization, release status, rights-and-clearance status) — or the newly-examined C2PA/on-chain-provenance fact, or the "is this trademark actually infringing" reviewer visual judgment — into a submitter self-attestation question. Every fact this document classifies as Class C is left Class C.

---

## 11. Questionnaire-Architecture Assessment (Phase 10)

Answering the task's specific diagnostic questions directly, from source:

- **Is the questionnaire effectively static?** Yes. CertForm is a fixed 11-section `react-hook-form` + `zod` schema (page.tsx:65-90) with hardcoded section gating (`currentSection` state machine). There is no mechanism for a section or question to appear/disappear based on a governed dependency — the only conditionals present are hand-coded UI branches (`submissionMode === 'agency'`, `watch('territory') === 'Other'`, `likenessPath === 'b'`, etc.), not a generic dependency-declaration mechanism.
- **Does it support conditional applicability?** Only in the narrow, hardcoded sense above — not derived from LK's `applicability_requirements` or `unresolved_project_dependencies` concepts at all. CertForm and LK's applicability model are two unrelated systems.
- **Can questions be derived from governed dependencies?** No. There is no code path from a `TopicClaim`'s `unresolved_project_dependencies` to a CertForm field. The only place governed dependencies drive a question at all is CRC's own `dependency-askability.ts` + `knowledge-readiness.ts` mechanism — and that is scoped to CRC's own conversational turn logic, structurally unrelated to CertForm.
- **Does it distinguish user facts from evidence requests?** Partially, and inconsistently. Some sections correctly pair a self-attestation path with an evidence-upload path (Likeness §5, IP §6 — both offer "I confirm X" *or* "upload documentation"). Others only offer self-attestation with an optional upload (Third-party assets §3). None of this distinction is expressed in a shared, reusable schema-level concept — each section reimplements its own ad hoc "path A/B/C" pattern in component state (`likenessPath`, `ipPath`), not a generic authority-class-aware field type.
- **Can one fact be sourced through multiple channels?** No shared mechanism exists. `human_contribution_description` is the clearest counter-example proving the absence: CRC can ask it, CertForm separately asks the same underlying thing (`authorship_statement`), and the two are entirely disconnected (§7.4). There is no "fact already known from channel X, don't re-ask" concept anywhere in this stack.
- **Are facts normalized independently from question wording?** Only for tool identity (`normalizeCandidate`) and, per §7.1, deliberately *not* for jurisdiction/territory. This is an existing, real asymmetry within the codebase itself, not a hypothetical risk.
- **Can future LK domains declare dependencies without bespoke questionnaire orchestration?** Not today, on the CertForm side. On the CRC side, `dependency-askability.ts` + `knowledge-readiness.ts` were explicitly built (2026-08-20 "Generic Living-Knowledge Readiness/Askability milestone") to let a *CRC* dependency declare its own acquisition strategy generically — this is the right precedent to generalize, but it currently has no counterpart or bridge into the submission form at all.
- **Is mandatory up-front collection overused where conditional questioning would be better?** Yes, structurally — CertForm collects everything up front in one fixed 11-section pass regardless of what the specific submission actually needs (e.g., R03's custom-model question, if it existed, would need to be asked of every submitter even though it's rare — there's no mechanism to only surface it when relevant).
- **Can correction/supersession semantics work across submission and CRC facts?** No — CRC has a mature, deliberate supersession model (`supersedeDistributionTerritoryMention`, `supersedeAssessmentJurisdictionMention`) entirely internal to a CRC session's `StructuredUnderstanding`; CertForm has no correction/supersession concept at all (a resubmission is a brand-new row, not a correction to a prior fact).

**Answer to the task's Phase 10 question ("is the questionnaire model itself the problem?"):** **Yes, partially — but not primarily as "not enough questions."** The concrete gaps found (§7, §8) are not, on inspection, best fixed by lengthening CertForm. They trace to the **absence of a shared, generic project-fact model** that CRC, CertForm, and the reviewer workbook could all read/write against — CRC already has the more sophisticated primitives (canonicalization, dependency-askability, supersession) that CertForm lacks entirely, and Commercial Assurance's reviewer workbook currently reads submission facts through a third, independent, much cruder path (raw JSONB, no canonicalization) that bypasses both.

---

## 12. Unresolved Questions

Recorded per the Chief-of-Staff Decision Quality Standards — these remain open, not silently assumed resolved:

1. **Is a unified CRC↔Commercial-Assurance project-fact model an actual near-term product priority**, or should the geography/registration/trademark findings above be solved as narrower, independent fixes (e.g., just canonicalize `territory_preferences` before the reviewer-LK comparison, without a full generic-fact-model rebuild)? This document does not have evidence to decide between "smaller, faster, narrower fixes" and "invest in the generic architecture now" — both are defensible readings of the same evidence.
2. **Does SI8 want copyright-registration or trademark-registration status as Commercial Assurance inputs at all**, given the Report's own explicit disclaimer against performing registry investigations? This is a genuine product/positioning decision, not something this audit can resolve — the evidence only shows it is *currently* out of scope, not that it *should stay* out of scope.
3. **Should CertForm's territory field be widened to country-level granularity**, or should the fix instead be a canonicalization layer that maps "North America"+downstream free-text answers onto the same jurisdiction vocabulary LK claims use? These are different architectural choices with different costs; this document does not recommend one over the other.
4. Whether `human_contribution_description`'s CRC-askable/CertForm-duplicate situation (§7.4) should be resolved by (a) letting a completed CRC answer pre-fill CertForm, (b) treating them as intentionally independent (CRC's answer is educational context, CertForm's is the assessed representation, and conflating them could blur the "CRC is not assessment evidence" boundary that CAH's own invariants protect — `COMMERCIAL_ASSURANCE_ARCHITECTURE_INDEX.md` §4 item 7), or (c) leaving them separate deliberately. This document surfaces the tension; it does not resolve it, because resolving it requires a governance decision about whether CRC content may ever influence submission content — a boundary this audit was explicitly told not to touch.

---

## 13. Candidate Next Milestones

Per the task's instruction to distinguish PROVEN GAP from PLAUSIBLE CANDIDATE REQUIRING A PRODUCT/GOVERNANCE DECISION:

**Proven gaps (source-verified, ready for a scoped follow-on milestone once authorized):**
- (a) Reviewer-LK jurisdiction canonicalization mismatch (§7.1) — narrowly scoped, single-function fix candidate (`resolveSubmissionJurisdiction` / `JURISDICTION_VALUE_ALIASES`), but a **product decision is still needed** on whether to widen CertForm's territory options, add a canonicalization layer, or both.
- (b) Domain R03 (custom/fine-tuned model) has no submission trigger (§8.1) — a scoped, additive CertForm field candidate.
- (c) Trademark LK domain gap under the existing I03 control (§7.3) — an LK-domain-onboarding candidate, explicitly **not** authorized to begin by this document.

**Plausible candidates requiring a product/governance decision before any design work:**
- Copyright-registration modeling (§7.2) — decision needed on whether SI8 wants this at all, given the explicit registry-investigation disclaimer.
- Generic CRC↔Commercial-Assurance project-fact bridge (§7.4, §11) — the largest, most architecturally significant candidate; requires an explicit decision on the CRC-context-is-not-assessment-evidence boundary before any design work, per `COMMERCIAL_ASSURANCE_ARCHITECTURE_INDEX.md` invariant 7.
- Domain R04 work-for-hire question, fair-use dedicated control, fully-automated-content boolean (§8.2-8.4) — minor, independently schedulable candidates.

---

## 14. Recommended Sequence (Phase 11)

The task's illustrative shape was:

```
Commercial Assurance fact model → missing LK domain onboarding → submission/CRC fact acquisition design → questionnaire revision → UAT → Consultative Composition resumes
```

**This audit's evidence supports that shape with one adjustment**, not a rejection of it: the evidence does not show LK-domain-onboarding (trademark) as the highest-value next step, because the geography finding (§7.1) is both more concretely proven (a specific function, a specific mismatch, already silently degrading Reviewer-LK narrowing today) and cheaper to reason about (it doesn't require a new governance/CRC-publication cycle the way a new LK domain does). Recommended ordering:

1. **PM/governance decision** on the Unresolved Questions in §12 (especially #1 and #4) — this determines whether steps 2-4 below are "narrow fixes" or "generic architecture," and this audit should not presume the answer.
2. **Commercial Assurance fact model clarification** — an explicit, written inventory (this document's §4/§6 as a starting point, formally adopted or revised) of which facts each domain actually consumes, so future submission/CRC/LK work has one shared reference instead of three independently-read sources of truth.
3. **Narrow geography fix** (§7.1) — scoped independently of the larger fact-model question, since it is proven, cheap, and currently silently degrading a shipped reviewer feature.
4. **Submission/CRC fact acquisition design** — only after step 1's governance decision, and only as a generic mechanism (per the task's explicit preference for generic architecture over domain-specific patches) — not a bespoke geography-only, trademark-only, or registration-only patch.
5. **LK domain onboarding (trademark)** — deferred until after step 4's acquisition design exists, since onboarding a new domain into a fact-acquisition architecture that doesn't yet support conditional/dependency-driven questioning would just repeat the current CertForm limitations (§11) for a fourth domain.
6. **Questionnaire revision** — last, and only for the specific, now-decided fields (custom-model flag, possibly territory granularity) — not a wholesale CertForm rewrite.
7. **UAT.**
8. **Consultative Composition resumes** — per the task's own framing, this fact-coverage question was explicitly opened as a prerequisite check before returning to that CRC milestone; per §7.4, resolving whether CRC facts may ever flow toward Commercial Assurance also directly informs how Consultative Composition itself should be scoped, so there is a genuine dependency, not just a scheduling one.

---

## 15. Explicit Implementation Gate

**Nothing in this document authorizes:**
- Adding, removing, or rewriting any CertForm question.
- Building the geography canonicalization fix identified in §7.1, however small it looks.
- Onboarding trademark or any other Living Knowledge domain.
- Any change to CRC orchestration, retrieval, Bounded Interpretation, composition, applicability, schemas, migrations, APIs, prompts, or UI.
- Beginning Consultative Composition or any other CRC milestone.

All of the above require a separate, explicit PM/governance authorization referencing this document, per the task's own Phase 11/DOCUMENTATION instructions.

---

## Validation Checklist (performed before finalizing)

- `git diff --check` — clean (no whitespace errors), confirmed on the single new file.
- Only file touched by this work: this document. Confirmed via `git status` immediately after `git branch`/`git switch` and again after writing this file — no runtime, schema, or test file modified.
- Every "gap" cross-checked against actual source before being labeled a gap (see inline `file:line` citations throughout §4/§6/§7/§8); several plausible-sounding gaps were explicitly downgraded to "correctly absent" (§9) or "plausible candidate, not proven" (§8.2, §7.2) rather than asserted.
- No evidence-only fact was recommended, anywhere in this document, as a candidate for user self-attestation (§10).
- Absence from Living Knowledge was never used as proof of irrelevance — §7.3's trademark finding explicitly states the opposite conclusion (an existing control lacks governed backing, which is a knowledge gap, not evidence trademark is out of scope).
- No legal conclusion was invented — every reference to "applicable jurisdiction," "copyright ownership," or "commercially cleared" in this document either quotes SI8's own existing disclaimers or explicitly flags the concept as a conclusion, never as a fact this document asserts.
