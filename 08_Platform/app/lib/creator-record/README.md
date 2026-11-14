# lib/creator-record — Creator Record v2

## Current state: MVP released and closed (read this first)

**This section governs.** Every later section is a milestone note written at the time of that milestone and kept as history. Where a later section says something is "empty", "stopped", "not approved", "locked", "local only" or "not wired", that describes its own milestone, not the code today.

**Product, release and qualifications:**
- `08_Platform/prds/PRD_CREATOR_RECORD_v2_MVP_SCOPE.md`: §12 covers the release closure, the UAT, the accepted qualifications and the deferred maintenance.
- `08_Platform/implementation/CR-V2-MVP-RELEASE-AUTHORIZATION-1-APPROVAL-RECORD.md`: approvals, release exceptions and operator evidence.

**Baseline.**
- Production runs Build B `0bec2dee` (released 2026-11-14, milestone closed 2026-11-15).
- The rollback floor is Build A `60b1d84d`. Never deploy a build without the takeover guard (`334d8d9f`, `678add4d` or earlier).

**Switches and identities:**

| Item | Value | Where |
|---|---|---|
| New submissions and purchases | `'open'` | `customer-flow/approved-inputs.ts` |
| Issuance | `'enabled'` | `lib/creator-record-artifacts/config.ts` |
| Generator | `creator-record-v2-pdf-v3` | `lib/creator-record-artifacts/renderers.ts` |
| Issuable record schemas / builders | 7, 8 / 5, 7 | `customer-record/governance-state.ts` (`CURRENT_ISSUANCE_SUPPORT`) |
| Issuable reading method | `live_model`, anthropic `claude-sonnet-5`, profile `receipt` v1 (`receipt-extraction-v2` / `receipt-prompt-v2`) | same |
| Registry / ledger | `CR-V2-LAUNCH-REGISTRY-3` / `CR-V2-LAUNCH-LEDGER-3` | `governed/sources.ts` |
| Published guidance | Runway and Higgsfield only. The Pika entry is withdrawn (LEDGER-3); Artlist is excluded | same |
| Customer live examination | Enabled: both live-examination locks are `true` (`live-examination/controls.ts`), and real documents are accepted (`evidence-intake/contract.ts`). The admin prototype's own live path stays locked (`evidence/config.ts`) | |

**PDF templates.**
- `approvedPdfTemplates` selects exactly one `approved` set per schema:
  - schema 7 → v4, `d4ecf3f39487ed43ce6c5e621d988d6525b638c952a8c5ead01e0cc9b8504f7e`;
  - schema 8 → v5, `a27e23cdbc1b12c16330b9518bba210b218bb0e8807e53ac164d6673ec873408`.
- Both use the three-level readiness layout (`customer-pdf/readiness-layout.ts`, `ReadingLayoutView.tsx`).
- v1 (schema 7) and v3 (schema 8) stay registered as `superseded`, for audit only.
- Issued PDFs are stored bytes and are never re-rendered.
- Takeover guard (`b6889585`): a pending artifact whose object is missing is re-rendered only by the generator that recorded it; otherwise it is refused and reconciled by hand.

**D10: readings, declarations and guidance stay independent.**
- Guidance is selected from declarations alone. Documents and readings are never a guidance input (`customer-record/record.ts`).
- Comparison method v2 records only `not_assessed` / `determination_withheld`.
- The v4/v5 layout prints readings only in the documents section, as automated and unchecked. It refuses:
  - an examination-bearing record whose comparison method is not v2;
  - a template set that also carries `integrated_assessment` (`customer-pdf/document-model.ts`, `replaceWithReadiness`).
- **Superseded design:** the per-item integrated assessment (`integrated-assessment/`, PRD §9) is still in the code, but only the superseded v3 set carries its block.
- **Review screen:** the readings-versus-declarations comparison panel and the "Guidance beside your documents" panel were removed (`cddb70fc`, `7892a643`).

**Terms, consent and AI permission.**
- Terms `terms-2026-11-14` and Privacy Notice `privacy-2026-11-09` (`lib/legal/policies.ts`).
- Storage-consent and AI-permission identifiers are `<wording>__privacy-2026-11-09__terms-2026-11-14` (`lib/creator-record-flow/authorization-versions.ts`).
- The database accepts an AI-permission grant only for the identifier in `creator_record_v2_ai_permission_authority` (migration `20261113000000`).
- That row is operator-maintained. Whenever the Terms or Privacy version changes, an operator replaces it by delete-and-insert; in-place updates are refused. Until then, AI examination fails closed.
- Grants made under an earlier identifier stay as history and no longer permit examination.

## Origin: receipt examination feasibility spike (PRODUCT-A-MVP-SPIKE-1A)

PRODUCT-A-MVP-SPIKE-1A. **Not wired into any customer surface** (at that milestone). Since
CR-V2-VERTICAL-SLICE-1 the only importers are the internal admin prototype
(`/admin/creator-record-v2` + `POST /api/admin/creator-record-v2/draft`) and its
two components, through an exact allowlist enforced by
`__tests__/creator-record/creator-record-boundaries.test.ts`.

| Path | Role |
|---|---|
| `receipt-examination/schema.ts` | Closed extraction schema `receipt-extraction-v1` + non-repairing validator |
| `receipt-examination/prompt.ts` | Fixed system prompt `receipt-prompt-v1`; document passed only as a PDF/image block |
| `receipt-examination/examine.ts` | Byte-sniffed input checks, one recovery retry, fail-closed outcome (no SDK) |
| `receipt-examination/examine.anthropic.ts` | The only SDK import; loaded by the runner's live mode only |
| `receipt-examination/compare.ts` | Deterministic comparisons `receipt-comparison-v1` (provider, plan, chronology, coverage) |
| `eval/fixtures/receipt-fixtures.json` | 41 synthetic documents: render params, ground truth, declared scenarios |
| `eval/fixtures/generate_receipt_fixtures.py` | Renders fixtures (Python 3.10+, PyMuPDF, Pillow) into `eval/fixtures/generated/` (git-ignored) |
| `eval/score.ts`, `eval/run-receipt-eval.ts` | Scoring and runner (default `dry-run`, no model calls) |

```
python -I lib/creator-record/eval/fixtures/generate_receipt_fixtures.py
npx tsx lib/creator-record/eval/run-receipt-eval.ts                        # dry-run, first-paid subset
npx tsx lib/creator-record/eval/run-receipt-eval.ts --mode mock --subset all
# PAID — only with PM approval of the spend ceiling, and with an external workspace spending limit in place.
# CR-V2-DOC-LIVE-1C-B2B: the dedicated evaluation key only, set in this one process; no --env-file, so no app
# environment (Supabase, other keys) is loaded. --model must be the live pin; --max-usd is predictive, not a cap.
CREATOR_RECORD_EXTRACTION_API_KEY=<dedicated evaluation key> npx tsx lib/creator-record/eval/run-receipt-eval.ts --mode live \
  --confirm-paid-calls --max-calls <n> --max-usd <approved> --model claude-sonnet-5 --subset first-paid \
  --input-usd-per-mtok <confirmed price> --output-usd-per-mtok <confirmed price>
```

The live report's `requests` lists every provider request (models, stop reason, tokens, latency, outcome, retry
attempt, live input bound); `live_input_bound` gives each fixture's live pre-call bound in every mode.

Current contract (SPIKE-1D): `receipt-extraction-v2`, `receipt-prompt-v2`,
`receipt-comparison-v2`, `receipt-scoring-v2`, `receipt-fixtures-v2` (45 documents).
v2 adds `plan_candidates`: every printed plan-name observation, and the plan
comparison is `unresolved` whenever two of them name different plans. These
rules can only see what the model lists; a plan name the model omits cannot be
detected. `eval/fixtures/history/` holds the frozen v1 spec, the v1 per-document
hashes (the 41 v1 documents must regenerate byte-identically) and the v1-only
truth corrections. SPIKE-1B/1C live results were produced with v1.

Extractions are what a document appears to show. They are never verified
facts, entitlements or rights findings, and they do not feed Living Knowledge,
applicability, bounded interpretation or projection.

## contract/ — CR-IMPL-1 contract core (PRD v0.3 §2–§4)

Deterministic, isolated, synthetic-only. No UI, database, model call or real
governance content. Layers Q/O (`question-registry.ts`), provenance
(`provenance.ts`), location relevance (`location.ts`), separate publication
authorization (`publication-ledger.ts`, default ineligible), dependency rows
(`dependency-rows.ts`, always open / not assessed) and bounded composition
(`compose.ts`, never stronger than Bounded Interpretation). Only type-only
imports of `@/lib/retrieval-engine/types` and `@/lib/bounded-interpretation/types`.
`testing/synthetic-fixtures.ts` is test-only; nothing in it is approved.

## integration/ — CR-IMPL-1b (CR-ARCH-1)

Connects the contract core to the existing Product A pipeline, reused unchanged:
`selectReviewerClaims` → (not_met excluded) → Creator Record publication
authorization **before** BI → `reviewerClaimToBiResult` → `buildBoundedInterpretations`
→ `composeGuidance` (re-checks authorization; one objective per claim; never
stronger than BI). Two fixed system objectives (`commercial_use`,
`third_party_source_rights`). Jurisdiction is always empty; location answers are
recorded only. Jurisdiction-scoped claims are never authorized in this milestone.
Runtime imports are limited to an exact allowlist (boundaries test).

## governed/, pilot/, presentation/, prototype/ — CR-V2-VERTICAL-SLICE-1

Internal admin prototype: questionnaire → existing pipeline → readable draft.
No database, upload, payment, email, PDF or model call.

| Path | Role |
|---|---|
| `governed/sources.ts` | The AUTHORITATIVE registry, ledger and labels. **Empty today** → no question shown, nothing published (fail closed) |
| `pilot/pilot-registry.ts` | PILOT questions (PRD v0.3 §5.1 common case), Observation Map, wording. **Internal and unapproved**; approval string says so; `isPilotApproval()` |
| `pilot/pilot-ledger.ts` | PILOT publication entries for 8 claims (Pika ×4, Kling ×2, Getty Editorial, one Artlist). **No Runway, no Higgsfield.** Not CRPR approvals |
| `prototype/form.ts` | Form state → declared observations via `eligibleQuestions` + `mapAnswer`; hidden answers discarded and reported |
| `prototype/build-draft.ts` | Validate → observations → `runCreatorRecordGuidance` (unchanged) → draft view. Sources are an explicit input: `governedSources()` or `pilotSources()`, never merged |
| `prototype/parse-form-state.ts` | Strict request-body parsing for the route |
| `presentation/templates.ts` | Every fixed sentence of the draft (wording lock) |
| `presentation/build-draft-record.ts` | Pure view model: declarations / guidance / open items / not included / independent review / not done / method |

Tests: `vertical-slice-journey`, `draft-record-wording`, `vertical-slice-route`, plus the boundaries test.

## identity/, evidence/ — CR-V2-EVIDENCE-SLICE-1

Governed selection and optional document examination for the admin prototype.
Synthetic documents only. Nothing is stored.

| Path | Role |
|---|---|
| `identity/selectable-identities.ts` | Dropdown options = the canonical registries (`CANONICAL_TOOL_IDS`, `ASSET_PROVIDER_IDS`) + "not listed" + "not sure". Display labels are presentation only (exhaustive over the registries). Never derived from a ledger; aliases stay in `extraction.ts` |
| `integration/plan-suggestions.ts` | Partial plan suggestions = governed `tool_plan_tier` values named by claims (`governedPlanValuesByTool`). Not a provider plan list |
| `evidence/document-observations.ts` | `ExaminedDocument` (what a document *appears to show*, labelled `fixture_replay` or `live_model`), strict parsers, `reconcileToolEvidence` (CR-V2-MVP-6: provisional, server-computed comparison with the declarations — appears consistent / appears to conflict / does not establish / not assessed), `toDocumentObservations` (contract provenance, trace only). No "verified" state. Browser-safe |
| `evidence/examine-upload.ts` | Server-only wrapper over `examineReceiptDocument` (unchanged): 4 MB ceiling, SHA-256, byte checks before any call, replay or live |
| `evidence/replay.ts` + `replay-fixtures.data.ts` | Fixture replay: recorded ground truth of the 45 synthetic fixtures keyed by SHA-256 (generated by `eval/build-replay-table.ts` from the eval oracle). **Not model output; proves nothing about extraction quality** |
| `evidence/config.ts` | Live gate. **Locked off in code** (`LIVE_EXTRACTION_PERMITTED_IN_THIS_BUILD = false`, CR-V2-EVIDENCE-PROD-UAT-1): no environment value or request can enable it. Lifting it needs a reviewed code change plus `CREATOR_RECORD_LIVE_EXTRACTION=enabled` |
| `evidence/verify-returned-documents.ts` | Server-only. Documents the page sends back are checked against the replay table (same SHA-256, fixture id, versions and extraction); anything else, including a `live_model` label, is refused |
| `evidence/live-caller.ts` | The only app path to `examine.anthropic.ts`, via dynamic import after the gate check |

Route: `POST /api/admin/creator-record-v2/examine` (admin check before the body; streamed size limit; strict multipart). Document observations are **display-only**: the draft route re-validates them and `build-draft.ts` never passes them to `runCreatorRecordGuidance`. CR-V2-MVP-6 (Option C, declare first): there is no adoption — nothing a document appears to show can become or change a declaration; the G-R2 text-layer cross-check (`plan-cross-check.ts`, `pdf-text-layer.ts`) is deferred and unwired from this path.

```
python -I lib/creator-record/eval/fixtures/generate_receipt_fixtures.py
npx tsx lib/creator-record/eval/build-replay-table.ts     # regenerates evidence/replay-fixtures.data.ts
```

Tests: `evidence-identity`, `evidence-examine`, `evidence-draft`, plus the boundaries and a11y tests.

## public-uat/ — CR-V2-WORK-UAT-HARNESS-2

Temporary, passwordless, synthetic-only harness at `/uat/creator-record-v2` + `POST /api/uat/creator-record-v2/draft` for cloud-browser UAT. **Closed unless armed** (`config.ts`: enabled flag + ≤ 14-day window, `null` = not armed). Reuses `buildCreatorRecordDraft` over `pilotSources()` unchanged; no upload (allowlisted fixture ids only, observations built server-side by `fixtures.ts` from the replay table); `toPublicUatView` adds the PUBLIC UAT designation and strips internal metadata without changing any interpretation. Runtime import closure excludes auth, Supabase, storage, email, payments, examination and any model (test-enforced). Operations, disable procedure and firewall recommendation: `08_Platform/implementation/CR_V2_PUBLIC_UAT_HARNESS.md`. Tests: `public-uat-harness`.

## internal-draft/ — CR-OPTION-C-OC1

Deterministic INTERNAL snapshot and draft PDF of a Creator Record v2, for PM and
governance review only. **Not issued, not stored, and not reachable from any
route, page, payment or issuance code** (test-enforced; nothing outside this
folder imports it). Reuses `buildCreatorRecordDraft` and `formToObservations`
unchanged; the prototype and the public UAT harness are untouched.

| Path | Role |
|---|---|
| `snapshot.ts` | `buildInternalDraftSnapshot` → `{ snapshot, canonical, sha256 }`. Records registry, ledger, question and mapping versions where they exist; `missing_versions` lists what is not versioned yet (never invented). Refuses issued `CR-YYYY-XXXXXXXX` ids |
| `document-model.ts` | Pure model of what the PDF prints, only from the snapshot; refuses a snapshot whose digest, status, policy or conclusion labels do not hold |
| `InternalDraftPDF.tsx` | @react-pdf renderer; "INTERNAL DRAFT — NOT ISSUED — NOT A CREATOR RECORD" as a fixed header and footer on every page. Generator `si8-internal-draft/creator-record-v2-pdf@0` |
| `projection.ts` | OC-1B: structured, fail-closed projection of the prototype's view and documents to the fields the draft may use (exact keys and types; unknown, missing or ill-typed fields stop it). Never reads the prototype summary, reconciliation, reconciliation trace or a document's cross-check |
| `template-contract.ts` | OC-1B: fingerprint (SHA-256 of what `D` prints, functions probed with 0/1/2) and the check that it is the one pinned for the current template version |
| `templates.ts` | Internal wording (`D`, including the prototype strings it pins) and identifiers; template id, version and the append-only fingerprint pins |

**C1 (PM decision, OC-1): neutral fallback only.** The prototype's reconciliation
results, comparison counts and G-R2 cross-check are not carried into the snapshot,
so the PDF cannot show them. The hash covers the canonical snapshot, not the PDF
bytes (the PDF embeds a creation timestamp). Structure: summary, sections 1–7 of
the draft view and the separate "Your answers beside your documents" section. This
is not the PRD's 12-section structure, customer wording or a frozen contract.

**OC-1B.** Nothing is filtered by matching wording: the summary is built from
structured counts and `D`. The snapshot records `templates: { id, version,
fingerprint }`; a template change (including a change to a prototype string `D`
pins) stops snapshot building until the version is raised and its fingerprint
pinned. The prototype's own templates have no version and are listed in
`missing_versions` as `prototype_presentation_templates`.

Tests: `internal-draft`, `internal-draft-projection`.

## examination/ — CR-V2-DOC-2B (local; replay only, nothing wired)

A generic, closed examination envelope over one stored document, with the receipt engine as the first
profile. **No importer outside this folder** (test-enforced): no route, record, guidance, payment, PDF or
publication path reads it. No persistence, migration or storage adapter.

| Path | Role |
|---|---|
| `envelope.ts` | `si8/creator-record-v2-examination` **v2** and its strict parser. Document fingerprint, profile and executor identity (including `recording_sha256`), `content_class: 'known_synthetic_fixture'` and `workflow_authorization: 'not_established'`, observations (`printed_text` / `examiner_classification`, always `not_verified`, origin `fixture_replay_recorded`), closed limitation codes, provenance (`model_calls: 0`, `prompt_sent: false`). `PreflightRefusal` is separate: a refused request never yields an envelope |
| `profile.ts` | The generic profile interface (`readRecorded`: a recorded output through the profile's own engine; no way to reach a model), the registry keyed by exact `id@version`, and the VERSIONING CONTRACT (`profileOutputCanonical`) |
| `receipt-profile.ts` | Adapter over `receipt-examination/` **unchanged** (same recorded-response shape as `evidence/examine-upload.ts` replay); mechanical mapping to observations and limitations; `RECEIPT_PROFILE_OUTPUT_FINGERPRINTS` (append-only pins per version) |
| `examine-document.ts` | The pure core, all ports injected: request (exact keys) → profile → executor (replay only, exact identity) → document stored → owner → bytes re-hashed (SHA-256, size, sniffed type) → media type → known-fixture CONTENT check by the re-computed hash → recording (canonical JSON; its SHA-256 computed here) → engine → envelope |
| `replay-executor.ts` | Replay executor and known-fixture registry from the committed replay table (the same table DOC-1 intake uses) |

**Content is not authority (CR-V2-DOC-2B-IDENTITY-1).** Recognising a document's bytes as one of SI8's
committed synthetic fixtures says only what the bytes are. The fixture generator and its parameters are in a
public repository, so anyone can reproduce those bytes: recognition establishes nothing about who uploaded a
document or whether its use is an authorised synthetic test, a customer record or a submission. Every
envelope therefore carries `workflow_authorization: 'not_established'`, and no field can say otherwise.
Workflow authority needs a separately approved source (open: DOC-2C-B). DOC-1 intake's own
`isSyntheticTestDocument` check (unchanged here) is likewise a content check.

**Identity.** `examination_key` is a deterministic replay key over every input that can change the
envelope: envelope version (core assembly), document id and bytes, profile identity (adapter/mapping
version, engine schema and prompt versions) and executor identity (mode, replay-set label and
`recording_sha256`, the SHA-256 of the canonical JSON of the exact recorded output replayed, computed by the
core and never taken from the executor). Different replay data under the same label therefore gives a
different key; the profile consumes exactly the hashed value (re-materialised from the hashed text,
deep-frozen). A profile's `version` must be raised, as an explicit reviewed change, whenever its readings can
change in any case. The pinned output fingerprint over a fixed corpus (all committed fixtures plus fixed
failure cases) is corpus-limited regression protection only: a mismatch proves a change on the corpus, a
match proves nothing about other inputs. Nothing is
persisted, so no exactly-once execution is claimed. Observations are never facts, declarations or findings,
and never reach retrieval, applicability or Bounded Interpretation (admissibility is DOC-2E). Tests:
`examination-foundation` (all 45 fixtures equal the existing replay path once normalized).

## record-core/ — shared (CR-V2-1)

| Path | Role |
|---|---|
| `canonical.ts` | Canonical JSON (sorted keys, verbatim strings; rejects `undefined`, non-finite numbers and non-plain objects) + SHA-256. Moved from `internal-draft/`, unchanged |
| `projection.ts` | The OC-1B exact-key projection combinators (`obj`, `str`, `oneOf`, `WITHHELD`…), throwing `ProjectionRefusal`; each caller maps it to its own error |

## customer-record/ — CR-V2-1

Deterministic, fail-closed preparation of the Creator Record v2 **customer record**
(`si8/creator-record-v2-record` v4, status `prepared_not_issued`). **Not approved
customer content, not issued, and not reachable from any route, payment or
issuance code** (test-enforced). Pure: no database, payment, Storage, email, PDF,
clock or randomness.

| Path | Role |
|---|---|
| `sources.ts` | `checkApprovedSources`: approved governed sources only. Refuses pilot or prototype material, missing or unapproved registry/ledger versions (never invented), a registry approving no question, missing or orphan question wording and option labels, wording that is not exactly what an approved Source Text Approval names, and incomplete, duplicated, stale, lapsed or unknown ledger entries or caveats without text. Every reason is reported |
| `source-text.ts` | CR-V2-1A Source Text Approval contract. The wording with no approval of its own (question wording and help, option labels, acknowledgement wording, dependency labels, caveats) is one content set, identified by the SHA-256 of its canonical form. An approval names source id, version, that digest, the exact categories, the record schema, lifecycle (`pending`/`approved`/`withdrawn`/`superseded`), a named authority and a date. Only `approved` prepares a record. Wording only: it has no category for explanations or conclusions, and cannot change eligibility, applicability, provenance or a conclusion |
| `record.ts` | `buildCustomerRecord` → `{ record, canonical, sha256 }`; `verifyCustomerRecord`; `customerRecordDigestMatches`. CR-V2-1C: records `builder` provenance and `sources.authority_digests` |
| `authority-content.ts` | CR-V2-1C: the content digest of each referenced question, observation-map entry, ledger entry and governed claim (lifecycle and validity fields excluded). Version labels are never taken as proof of content |
| `eligibility.ts` | CR-V2-1C: `issuanceReferences(record)` and the generic, pure `evaluateIssuanceEligibility(canonical, sha256, snapshot)` → `eligible` / `ineligible` / `invalid_record` / `indeterminate` (`conflict`, `malformed_state`, `unavailable`). Integrity first; withdrawn, superseded, retired or pending authority blocks; no transitions, no substitution, no conclusion read |
| `governance-state.ts` | CR-V2-1C: pure adapters from the current sources (registry, ledger, claims, wording approvals, supported schemas and builders) to the generic snapshot. Pilot material is never approved; unreadable sources stay unavailable |

Reuses `prototype/declared-guidance.ts` (`runDeclaredGuidance`: the existing form
validation, declaration mapping and guidance pipeline, now shared with the draft;
loads no pilot data) and the `record-core/` modules. Documents are not accepted:
every declared tool is `not_provided`, and comparisons are `disabled`. Guidance is
the composition as produced, read through an exact-key projection and re-checked
(never stronger than Bounded Interpretation and applicability permit; explanation
and caveats are the approved ledger and source text, verbatim). The record holds no
SI8-generated prose (`content.generated_text: 'none'`): answers, approved source
text, identifiers and codes only. Wording comes from the approved content set, whose
digest the record carries; acknowledgements are stored with their exact approved
wording. Preparation-time approval, historical integrity (`verifyCustomerRecord`,
from the record and digest alone, whatever the approval's state today) and current
issuance eligibility (not implemented) are separate. Its reference is a preparation reference, never
an issued `CR-` id. An explicitly approved empty ledger gives a declarations-only
record (PRD OD-14 is a PM decision).

**CR-V2-2E selection provenance (schema v4, builder v2).** Each guidance item carries `selection_basis`: for every scope the governed claim declares (tool, asset provider), the matched canonical ids and exactly the declared observations that contributed them. It is captured at the selection boundary (`selectionBasisFor` in `integration/run-creator-record-guidance.ts`) by applying the governed scope predicates to the same id sets the selector used and tracing each id to the declarations that produced it in the same run; an id with no contributing declaration, or a scoped claim with no matched id, refuses. It is selection evidence only: never an applicability input, never attached to a dependency, never a change to a conclusion. Claim selection and composition are unchanged (pinned pre-change snapshot).

Tests: `customer-record`, `customer-record-eligibility`, `customer-record-selection`, `record-core-golden` (record-core output pinned to the pre-extraction code).

## customer-pdf/ — CR-V2-2B

The customer PDF of a Creator Record v2, in eight sections (about; project and use;
tools and plans; people, materials and contribution; guidance; open items and
limitations; what SI8 did not do; declarations and provenance). **Not reachable from
any route, page, payment or issuance code, and no template set ships with it: none
is approved, so it renders only in tests** (test-enforced).

| Path | Role |
|---|---|
| `templates.ts` | The PDF template contract: data only (strings, lists, `{slot}`s, closed code→label maps, question→section placement), fingerprinted as the SHA-256 of its canonical JSON. Its `PdfTemplateApproval` (id, version, fingerprint, record schema, lifecycle, authority, date) is separate from the questionnaire Source Text Approval: a template change never touches a prepared record. PRD §5.4 wording lock enforced on every template string |
| `document-model.ts` | `buildCustomerDocument`: verifies the record first, reads it by exact keys, checks the templates against their approval, then maps it mechanically into blocks tagged `record` / `issuance` / `template`. Unknown conclusion, topic, fact, code, document state or unmapped question refuses (`CustomerPdfRefusal`); nothing is inferred |
| `CustomerRecordPDF.tsx` | Mechanical @react-pdf layout of the model; 64-hex digests in monospace, never broken. CR-V2-2C: no lineHeight on the page (it stops the fixed page number being drawn); each text style sets fontSize with its lineHeight; headings are kept with what follows |

CR-V2-2C: guidance items are numbered and section 6 refers to them by number; section 6 lists every condition the record leaves open (dependency rows, facts not established grouped by fact, guidance with no listed condition, "Not sure" answers), and the open-items count is the number of entries listed there (a display count, not an assessment).

CR-V2-2H (presentation only; no selection, interpretation, conclusion or schema change): every guidance explanation is followed by a fixed limitation line (`item_limitation`). Bounded Interpretation's status is per objective and is the ceiling for every item of that objective (ADR-002), so an item whose own applicability is `met` can still be `relevant_applicability_unresolved`. CR-V2-2I: such an item (no dependency, BI provenance `supporting` with that status) gets a generic topic-level explanation (`topic_level`, section 6 `topic_qualified_heading`) that names no other item, because the record does not establish which inputs produced the topic-level status (an input can be omitted after interpretation, and an unresolved applicability need not list a fact). "Not listed" (`unspecified_condition`) is said only for an item's own condition genuinely absent from the record: applicability `unresolved` with no material fact, or, defensively, no reason the record can show. The provenance section prints guidance by number, its version and SI8 review date; it does not print the wording approver's name or date, or internal ledger ids, which remain in the verified record. The empty open-items message does not imply that nothing else needs checking.

CR-V2-MVP-M1: the provenance section prints no date for guidance. The ledger `refresh_by` is a future re-check date, not a review date, and no authoritative "last reviewed" date is defined yet (PM direction 9). `refresh_by`, `decision_date` and `claim_last_verified` stay in the verified record and keep their eligibility role.

OD-17 (verbatim governed statements) is not implemented. Tests: `customer-pdf`.

## customer-flow/ — CR-V2-MVP-M2

The invited creator's prepare → review flow (M2), and from M3 the purchase and issuance rules below.

| Path | Role |
|---|---|
| `customer-flow/service.ts` | PURE (ports injected). `preparePrepared` builds a record from the approved sources with the existing fail-closed builder and stores it as a NEW immutable version of a draft; `getPrepared` is owner-only and re-verifies the canonical record against its digest and the row's identity columns; `reviewPrepared` freezes the draft's latest version. The creator is the session user; record ids, versions, digests and statuses are never read from a request. |
| `customer-flow/approved-inputs.ts` | The approved inputs, read only from `governed/sources.ts` (never the pilot). All empty or null until M0, so nothing is prepared. `CREATOR_RECORD_V2_SUBMISSIONS = 'stopped'` by default. |

Outside this module: routes `app/api/creator-record-v2/prepared` (POST), `.../[id]` (GET), `.../[id]/review` (POST); page `app/creator-record`; production ports `lib/creator-record-flow/`. Storage: migration `20261101000000_creator_record_v2_prepared.sql` (additive; RLS on, service role only; content immutable; prepared → reviewed only; a reviewed version binds to a submission once; reviewed rows cannot be deleted; pilot invite list `creator_record_v2_pilot_access`).

Issuance stop: `CREATOR_RECORD_V2_ISSUANCE = 'stopped'` (`lib/creator-record-artifacts/config.ts`), enforced in `rendererForFamily` — the boundary every issuance path passes (webhook fulfilment, sweep, reconcile, admin retry). A v2 submission is refused there before anything is rendered or stored.

### CR-V2-MVP-M3 — checkout binding and v2 fulfilment (local; nothing deployed or applied)

| Path | Role |
|---|---|
| `customer-flow/purchase.ts` | PURE. `startPurchase`: the reviewed latest version becomes a submission through the DB bind function (atomic, idempotent, digest-checked). `checkV2Checkout`: run by the existing checkout route for a v2 submission before any Stripe call. `renderV2ForIssuance`: the v2 renderer's body — re-checks the persisted v2 identity, the bound version (owner, reviewed, SHA-256 + identity columns) and current governance eligibility, then renders exactly the stored record. Throws `V2IssuanceRefusal`; nothing is rendered or stored. |
| `customer-flow/approved-inputs.ts` | Adds `approvedGovernanceSnapshot` (eligibility state from the approved sources only) and `approvedPdfTemplates` (both null until M0). |
| `governed/sources.ts` | Adds the empty `CREATOR_RECORD_PDF_TEMPLATES` / `CREATOR_RECORD_PDF_TEMPLATE_APPROVAL` slots. |

Contracts:
- **Binding** (migration `20261102000000_creator_record_v2_submission_binding.sql`): `submissions.creator_record_product` (`'v2'` or NULL, creator_record only, immutable, settable only by `create_creator_record_v2_submission`). The prepared-record guard is replaced with a stricter one: per-draft serialization, contiguous versions, only the latest version can be reviewed or bound, binding only through the function. A v2 submission is an ordinary `creator_record` to the payment ledger (unchanged; same price).
- **Checkout**: purchase route `POST /api/creator-record-v2/prepared/[id]/purchase` → existing `POST /api/checkout/create-session`. Both refuse unless v2 issuance is `enabled`, new submissions are `open`, the creator is invited and the bound record is reviewed, latest, intact and eligible. Checked before any Stripe call, including reuse of an open session. V1 checkout is unchanged.
- **Fulfilment**: the v2 renderer is registered in `lib/creator-record-artifacts/renderers.ts` but reachable only when `CREATOR_RECORD_V2_ISSUANCE = 'enabled'` (default `stopped`), for every path (webhook, sweep, reconcile, admin retry). It records `creator-record-v2-pdf-v1`, never permits the legacy generator and never resumes a v1 row (nor v1 a v2 row). Private artifact storage and delivery are reused unchanged. A refused issuance leaves the PDF step pending (retried, then the reconciliation queue); the v2 ready email is sent only after the PDF step completed. A correction after payment does not stop issuance of the paid version.
- **Customer wording**: `lib/creator-record-flow/wording.ts`, DRAFT pending M0, wording-locked by test.

DEPLOY ORDER: M2 then M3 migrations BEFORE any code that selects `creator_record_product` (checkout and fulfilment select it for every Creator Record, V1 included).

Tests: `customer-purchase`, `creator-record-flow/*`, `run-payment-fulfillment` (v2 cases), real PostgreSQL `db/creator-record-v2-binding.db.test.ts`.


### CR-V2-MVP-M4B — synthetic authority isolation and rollback safety (local; nothing deployed or applied)

| Path | Role |
|---|---|
| `governed/publication-authority.ts` | PURE. `resolvePublicationAuthority(env)` → `governance` (default; Production needs no variable) or `synthetic_isolated_test`, or a refusal. `selectAuthorityBundle` returns the one bundle the build may publish from, or null. |
| `governed/sources.ts` | Adds `CREATOR_RECORD_GOVERNANCE_AUTHORITY` (`authority_class: 'governance'`), the existing approved slots as one bundle. |
| `governed/synthetic-test-authority.ts` | `CREATOR_RECORD_SYNTHETIC_TEST_AUTHORITY` (`authority_class: 'synthetic_test'`). M4C: populated with a reduced, `[TEST ONLY]`-worded questionnaire, SYN-* ledger entries and placeholder PDF templates, digests pinned (`synthetic-test-authority.test.ts`). Inert in Production by construction. |
| `customer-flow/approved-inputs.ts` | Every approved input (prepare, checkout governance, issuance governance, PDF templates) now comes from the selected bundle. No bundle → empty inputs and `unavailable` governance: nothing prepared, sold or issued. |

Contracts:
- **Synthetic authority**: selected only if `SI8_CR_PUBLICATION_AUTHORITY=synthetic-isolated-test` AND `VERCEL_ENV` ≠ `production` (absent/`preview`/`development` only) AND the Supabase project in `NEXT_PUBLIC_SUPABASE_URL` is not Production and equals `SI8_CR_SYNTHETIC_SUPABASE_REF` AND `STRIPE_SECRET_KEY` is a test key. Any other value of the mode variable, or any failed check, fails closed. Each mode accepts only its own structural `authority_class`, so a synthetic bundle is never Production authority (on any branch or deploy route) and renaming an approver changes nothing; governance mode also refuses approval text that reads as synthetic. Source Text Approval and eligibility apply unchanged to the selected bundle; both stops apply in both modes.
- **Rollback guard** (appended to `20261102000000_creator_record_v2_submission_binding.sql`, so the marker column never exists without it): `creator_record_artifacts` refuses a non-v2 generator for a v2 submission (and the v2 generator for a V1 one); `rights_packages` refuses any v2 submission. Any code, of any age, therefore fails closed instead of issuing a V1 PDF for a v2 submission.

DEPLOY SEQUENCE: (1) apply M2 then M3 migrations; (2) deploy M3+ code (stops `stopped`); (3) open stops only by reviewed code change. ROLLBACK: set the stops to `stopped` (preferred). Deploying older code is safe for V1; a paid v2 submission then stays visibly paid-but-not-issued (the guard refuses the V1 write; no ready email) until M3+ code is redeployed and reconciliation retries it. Never drop the M3 objects while a v2 submission exists.

Tests: `publication-authority`, `v2-rollback-guard-static`, real PostgreSQL 15 + 17 `db/creator-record-v2-binding.db.test.ts` (rollback guard).

### CR-V2-MVP-M4C — isolated staging preparation (local; nothing provisioned, deployed, migrated or paid)

Runbook: `08_Platform/implementation/CR_V2_STAGING_REHEARSAL_CHECKLIST.md`. Staging-only tooling, refusing Production by construction: `scripts/staging/apply-staging-migrations.sh` (full history onto a fresh non-Production project; runs the `supabase/staging/before_20260909000000_*` placeholder that a fresh history needs), `supabase/staging/seed_pilot_access.sql` (one invited test creator), `scripts/staging/cr-v2-staging-preflight.ts` (no-network env check). The stops stay `stopped` here; the two-line staging flip is documented in the runbook and cannot merge green.

### CR-V2-CUTOVER-1 — single-product cutover (local; nothing deployed, migrated or sold)

Creator Record v2 is the only Creator Record a new customer can buy. v1 (a `creator_record` submission with no `creator_record_product` marker) is retired from NEW sales by one code constant, `CREATOR_RECORD_V1_NEW_SALES = 'retired'` (`lib/submissions/build-intake-insert.ts`), modelled on the CR-CERTIFIED-PATH-1B retirement of the legacy `certified` tier. It is not a product registry. `'open'` exists only as the reviewed one-line rollback lever during the v2 launch, and is deleted together with the v1 form once v2 is established.

| Retired: new v1 sales | Retained: existing v1 records and shared infrastructure |
|---|---|
| `/api/submissions/create` refuses `tier: 'creator_record'` with "tier no longer offered". This route only ever creates v1; v2 rows come from the database bind function. | Payment recording (database ledger), the Stripe webhook, `runPaymentFulfillment`, the recovery sweep, admin reconcile and admin retry. None of them reads the cutover setting. |
| `/api/checkout/create-session` refuses a v1 row with 409 `v1_creator_record_retired`, before any price lookup, Stripe call or write. This includes not reusing or returning a persisted open session. | The v1 renderer, `legacy-creator-record-pdf-v3`, still issues for a paid v1 submission. |
| `/record` (and `/submit`) redirects to `/creator-record`. The v1 form is kept unchanged behind `app/record/layout.tsx`, for rollback only. | Historical PDFs: `/api/creator-record/[id]/pdf` still serves private artifacts and the legacy `documents` bucket. |
| The dashboard buttons and nav, and sign-up `next=/record`, go to `/creator-record`, and the "$29" v1 label is no longer shown. | Auth, private storage (`creator-records`) and delivery emails. The database still prices `creator_record` at 2900, so a session opened before the cutover settles. |

v2 is unchanged and stays fail-closed:
- both stops stay `stopped`;
- the publication authority stays empty in Production;
- the v2 renderer never permits the legacy path or a v1 version;
- an unknown marker is never treated as v1: checkout returns 400, and fulfilment raises `UnsupportedProductFamilyError`.

**Window.** Once this code is deployed and before v2 is opened, no Creator Record can be bought. v1 is refused and v2 is stopped. Ship it in the same release as the reviewed change that opens v2, or accept the pause.

**MIGRATION-FIRST ROLLOUT**
1. Read-only Production checks:
   - the `submissions` column types and CHECKs, including `authorship_statement`;
   - `rights_packages.submission_id`;
   - the pending v1 work:
     - unpaid v1 with a persisted session: `select id, stripe_checkout_session_id from submissions where tier = 'creator_record' and payment_status = 'unpaid' and stripe_checkout_session_id is not null`;
     - paid but not fully fulfilled: `select stripe_checkout_session_id, submission_id, fulfillment_status, pdf_status, email_status from payment_fulfillments where tier = 'creator_record' and outcome = 'accepted' and (pdf_status = 'pending' or email_status not in ('not_required', 'accepted', 'reconciled'))`;
     - pending artifacts: `select submission_id, generator_version from creator_record_artifacts where status = 'pending'`.
2. Apply `20261101000000` (M2), then `20261102000000` (M3, including the M4B guards). Both are additive: new tables, a nullable column and new triggers and functions, with no change to any function the deployed code calls. The currently deployed code therefore keeps working: it never sets the marker and only writes v1 rows, which the guards allow.
3. Deploy this code. It needs the M3 column, because checkout and fulfilment select `creator_record_product`.
4. Optional: expire the open v1 sessions from step 1 in Stripe. Otherwise a customer who already holds the URL can still pay within the session's lifetime (up to 24 h). That payment is recorded and fulfilled as v1, unchanged.
5. Re-run the step 1 queries. Any pending v1 completes through the sweep, admin reconcile or admin retry, all on the v1 renderer.
6. Opening v2 is a separate, reviewed change (approved governance plus the two stops). It is not part of this cutover.

**ROLLBACK**
- **Stop all Creator Record sales and issuance:** the state is already that while v2's stops are `stopped`. Once v2 is open, set both stops back to `stopped`.
- **Re-open v1:** set `CREATOR_RECORD_V1_NEW_SALES = 'open'` as a reviewed one-line change, or deploy the pre-cutover code. That is safe for v1, but never deploy anything older than CR-ARTIFACT-1 or than M3 once v2 rows exist. With M3 applied, older code fails closed for v2: the guards refuse a v1 PDF or a `rights_packages` row for a v2 submission, so it stays visibly paid but not issued.
- **Never drop** the M3 objects while a v2 submission exists. **Never delete** objects in the `documents` or `creator-records` buckets: historical downloads depend on them.

Tests:
- `security/creator-record-v1-cutover`;
- the cutover blocks in `security/checkout-integrity`, `security/submission-create-route` and `security/legacy-certified-containment`;
- `creator-record-flow/v2-checkout-route`.

## Questionnaire contract approval (CR-V2-DECL-1B-1)

`customer-record/questionnaire-contract.ts` binds everything about the questionnaire that the Source Text Approval (wording only) does not: order, options, requiredness, visibility, input types, per-tool behaviour, exclusive options, mappings and their review references, prohibited targets, acknowledgement ids, sections, limits, and the wording digest. One approval in the authority bundle (`questionnaire_approval`) names its SHA-256; `checkApprovedSources` refuses a missing, malformed, withdrawn, superseded or mismatched approval, so the form gate and preparation both refuse. A field with no entry in `QUESTIONNAIRE_FIELD_CLASSES` is refused until classified.

- **What a digest proves:** this contract is exactly the one the approval names. It does not authenticate a reviewer; `authority` and `review_ref` are recorded text.
- **Rules version:** `QUESTIONNAIRE_VALIDATION_RULES` is raised by hand. `__tests__/creator-record/questionnaire-validation-rules.test.ts` pins behaviour and the rule files: a test-time guard only, with no runtime detection.

## Contract identity and record provenance (CR-V2-DECL-1B-2)

- **Display to submission:** both pages pass the approved digest in the same render as the questions, and the client submits it as `questionnaire_contract_sha256`. `preparePrepared` checks the server's own approval first (503), then the identity (409 `questionnaire_changed`; 400 `invalid_request` if malformed), then the answers. Nothing is written on a refusal, and a match authorizes nothing.
- **Limit:** the digest is what the client states it displayed, compared with the current contract. It does not prove what a person read.
- **Recovery:** `lib/creator-record-flow/questionnaire-recovery.ts` keeps an answer only when nothing about its meaning changed, reports every other one, and always clears acknowledgements. `router.refresh()` delivers the update. Only an explicit submit sends anything.
- **Responses and corrections:** a response names its own version's contract and is refused unless that is the current one, so it never rebuilds a version under another questionnaire. A schema 5 or 6 version has none, and is described as having no recorded contract, never as a mismatch. A correction across contracts lists the earlier answers and fills none in.
- **Schemas:** the builder writes 7 and 8: 5 and 6 plus `sources.questionnaire_contract` (identity, approval details, whole body, whole wording). `verifyCustomerRecord` checks them from the record alone. 5 and 6 stay readable exactly as stored and are never stamped.
- **Reconstruction limit:** the body holds the validation rules' version, not their code. Behaviour under that version is recoverable from git only.
- **Not yet:** schemas 7 and 8 are not issuable, the customer PDF renders schema 7 only, and whether confirmation should need a current contract is undecided.

## Commercial eligibility (CR-V2-MVP-ELIGIBILITY-1)

`evaluateIssuanceEligibility` is the one check purchase, checkout and issuance share, and each individual record's sale and issue stay automated.

- **Contract:** the contract a record embeds must be the current approved one. Missing, replaced, superseded, withdrawn or pending refuses. This is a conservative MVP policy for new commercial actions, not a decision about records already issued.
- **Never eligible:** a record with no contract (schema 5, 6), and a synthetic record unless the running bundle is `synthetic_test`, which Production can never select. Both stay readable.
- **Support:** `CURRENT_ISSUANCE_SUPPORT` is empty. Enabling a schema is a separate decision.
- **Live examination foundation (CR-V2-DOC-LIVE-1A):** `live-examination/envelope.ts` and `live-examination/examine.ts` hold a closed contract for a model-read examination, envelope v3, beside replay (v2). The v2 parser refuses v3, so v3 cannot reach a record, guidance or eligibility. Migration 20261108000000 adds its own table, refuses `live_model` and needs the isolated-test marker. New schema 8 records make no consistency determination (comparison method 2); earlier records keep what they hold.
- **Real-examination preparation (CR-V2-DOC-LIVE-1B), disabled:** `live-examination/real-executor.ts` is the one real executor, over the existing Anthropic adapter, with a pinned model, a deadline, a response-model check, fixed failure kinds and a spend guard. `live-examination/controls.ts` holds its own code lock (false), the document bounds and the authorization format. It is separate from `LIVE_EXTRACTION_PERMITTED_IN_THIS_BUILD`, so an evaluation never has to open the admin prototype's live path. `live-examination/document-access.ts` checks user, prepared version, tool and bytes before anything runs, and `creator-record-flow/live-examination-production.ts` holds the storage ports. No route imports any of it and no runner exists. Observations stay evidence only. Protocol and remaining decisions: `08_Platform/implementation/CR_V2_DOC_LIVE_EVALUATION_PROTOCOL.md`.
- **Evaluation infrastructure (CR-V2-DOC-LIVE-1C-A), disabled:** `live-examination/evaluation.ts` (`runAuthorizedEvaluation`) is the one entry point. It authenticates the operator from a credential, reads a durable authorization through a database preflight, builds the executor itself, binds only the current prepared version, and takes a durable reservation before the first request. The database side is `supabase/evaluation-only/20261109000000_creator_record_v2_live_evaluation.sql`, which is not a migration and has only been applied to disposable local databases. The Anthropic adapter now fixes its endpoint, logging and credentials against the SDK's environment variables, and `countPdfPages` walks the page tree and refuses anything ambiguous, including any page-tree object defined more than once (1C-A-FIX), so it also refuses some valid, incrementally updated PDFs. The entry point takes all its dependencies from the caller, so its guarantees hold only with the reviewed production ports, profile and adapter; the fixed runner (1C-B1, below) is that composition, and nothing else may call it. The dollar reservation is an estimate, and dense PDFs can exceed its token assumption.
- **Fixed runner and input bound (CR-V2-DOC-LIVE-1C-B1), disabled:** `creator-record-flow/live-evaluation-runner.ts` (`runFixedEvaluation`) takes one request and nothing else, and always passes the production ports, the one registered profile and the real adapter. Its only caller is the locked operator CLI `scripts/creator-record-live-evaluation.ts`, which takes a request file and no flags. `boundLiveInputTokens` bounds one request's input from the document before the reservation, and the executor bounds it again from the content it sends; the reservation must cover it. Two terms of that bound are unconfirmed assumptions. Install, verification and rollback: `08_Platform/implementation/CR_V2_DOC_LIVE_EVALUATION_ENVIRONMENT.md`.
- **PDF (CR-V2-PDF-7):** `buildCustomerDocument` renders schema 7 only and refuses 5, 6 and 8 by name. Issued PDFs are stored bytes, so this affects no historical artifact. `declarationIncompatibilities` checks every answer against the contract the record embeds. The PDF prints the contract's id, version and a short reference, and never approval text. Only synthetic templates exist; none is approved.
- **PDF text (CR-V2-PDF-7B):** Latin prints in Helvetica; other characters come from the bundled Noto Sans CJK TC (`customer-pdf/fonts/`), which also covers Simplified Chinese, Vietnamese, kana and Hangul. Long tokens and CJK text wrap without an inserted hyphen. Text the fonts cannot print, such as emoji, refuses with `text_unsupported`. Nothing checks this at submission yet, so such an answer would only refuse at issuance.
- **After payment:** `authorizeV2Issuance` refuses a bound version that is no longer the draft's latest, and runs again just before an artifact is marked issued, including on a resumed attempt. A refused payment stays recorded in the ledger: the step stays incomplete, retries, then reaches `needs_reconciliation` with an admin alert. No refund or customer message is automated.
- **Schema 8 payment and issuance (CR-V2-MVP-M4A), closed by default:**
  - **Reading methods:** a schema 8 record holding a model reading is eligible only when that reading's exact method (provider, model, profile id, version, schema and prompt) is on `CURRENT_ISSUANCE_SUPPORT.examination_methods`, which is empty. A recorded-replay reading is refused like a synthetic record, outside the `synthetic_test` class. Listing schema 8 never admits its readings.
  - **Integrity:** checkout and issuance re-check every referenced reading by its kind (`verifyReferencedReadings`, wired as `productionReadingsIntact`). A model reading can only be re-checked while both live-examination locks are true. With either lock false, as in this build, a record holding one is refused.
  - **Templates:** `approvedPdfTemplates(bundle, schema)` picks the one approved set whose approval names the record's schema: the main set or one of `pdf_template_sets`. None, or more than one, gives no templates. Checkout refuses a version those templates could not render, and issuance refuses it as `templates_unavailable`, including before a resumed attempt is marked issued.
  - **After payment:** a refusal also alerts an operator at once ("Paid Creator Record could not be issued"). The only synthetic schema 8 set is in the synthetic bundle; the governance bundle has none.
- **Original-document retention (CR-V2-MVP-RETENTION-M1A), local only; migration 20261111000000 not applied anywhere:** provisional product policy, not Production authorization.
  - **Expiry:** an owner upload's original expires 90 days after it was stored. The database (`creator_record_v2_apply_retention`) marks it `deleted` with `deletion_reason = 'retention_expired'` even when a prepared version references it; the row, its fingerprint and every link stay, issued artifacts are untouched, and the existing `cleanupEvidence` removes the object. A record not yet issued that references an expired original fails the existing evidence check at checkout and issuance. Operator-seeded synthetic documents are outside the policy.
  - **Paid orders:** an accepted payment with no issued artifact extends expiry by at most 14 days (once, recorded). After that the original expires anyway, and the order moves to `needs_reconciliation` with a documented `retention_original_unavailable` reason: automated issuance stops and a refund or manual resolution is required. Nothing refunds automatically.
  - **Holds:** a named admin (`users.is_admin`, re-checked by the database) places a hold of 1–30 days with a reason (`POST /api/admin/creator-record-v2/retention/holds`). Renewal is explicit, once per hold, never automatic. At most 60 cumulative days per original (8O): the union of every hold's term, whoever authorized it, enforced on every insert under a per-document lock, so overlap, renewal or release-and-recreate cannot reset it. There is no override. Holds are never deleted and change only by being released.
  - **Deletion requests:** `POST /api/creator-record-v2/evidence/[id]/deletion-request` is not behind the submissions stop, the invitation or payment status (8M). It completes at once unless an administrative hold stands in the way; then it stays open (`awaiting` = `administrative_hold`), is escalated to an operator, and completes when the hold ends. No hold can be placed or renewed while a request is open. A paid order the deletion makes unfulfillable moves to `needs_reconciliation` (`retention_original_unavailable`) in the same request.
  - **Consent withdrawal:** `POST /api/creator-record-v2/consent-withdrawal` records an append-only withdrawal. The database then refuses every new examination read, reservation, replay run and live attempt for documents the creator uploaded at or before it, including an attempt whose read and reservation came first. Unissued records relying on such a document are paused (8N): a new prepared version cannot reference it, a reviewed version cannot be bound, an artifact can be neither started nor marked issued, and paid orders move to `needs_reconciliation` (`consent_withdrawn_awaiting_customer_decision`). Checkout and issuance refuse as `consent_withdrawn` in the application too. There is no customer continue/cancel workflow yet, so the pause holds. A later upload carries its own consent and never restores the withdrawn one.
  - **Schedule:** `.github/workflows/creator-record-retention-sweep.yml` calls `/api/internal/creator-record-v2/retention/sweep` every 6 hours, with its own secret. Every run is recorded (append-only); a run more than 24 hours after the last clean one fails as `sweep_gap`. The sweep fails, and alerts with counts only, on any failure or on anything overdue: an original past its deadline, or an object still present 7 days after deletion. A scheduler that never runs again needs an external monitor.
  - **Customer downloads:** an owner can download a v2 PDF for 12 calendar months after issuance, then gets `410 {"code":"access_expired"}`. Admin access, V1 records and the stored record are unchanged.
  - **Not done:** 24-month record erasure, abandoned-record erasure, entitlement transfer, customer wording.
