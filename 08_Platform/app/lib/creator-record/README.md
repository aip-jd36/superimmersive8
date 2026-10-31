# lib/creator-record — receipt examination feasibility spike

PRODUCT-A-MVP-SPIKE-1A. **Not wired into any customer surface.** Since
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
# PAID — only with PM approval of the spend ceiling:
npx tsx --env-file=.env.local lib/creator-record/eval/run-receipt-eval.ts --mode live \
  --confirm-paid-calls --max-calls 26 --subset first-paid \
  --input-usd-per-mtok <price> --output-usd-per-mtok <price>
```

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

## record-core/ — shared (CR-V2-1)

| Path | Role |
|---|---|
| `canonical.ts` | Canonical JSON (sorted keys, verbatim strings; rejects `undefined`, non-finite numbers and non-plain objects) + SHA-256. Moved from `internal-draft/`, unchanged |
| `projection.ts` | The OC-1B exact-key projection combinators (`obj`, `str`, `oneOf`, `WITHHELD`…), throwing `ProjectionRefusal`; each caller maps it to its own error |

## customer-record/ — CR-V2-1

Deterministic, fail-closed preparation of the Creator Record v2 **customer record**
(`si8/creator-record-v2-record` v3, status `prepared_not_issued`). **Not approved
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

Tests: `customer-record`, `customer-record-eligibility`, `record-core-golden` (record-core output pinned to the pre-extraction code).

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

OD-17 (verbatim governed statements) is not implemented. Tests: `customer-pdf`.
