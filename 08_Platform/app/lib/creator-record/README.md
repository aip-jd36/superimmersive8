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
| `evidence/document-observations.ts` | `ExaminedDocument` (what a document *appears to show*, labelled `fixture_replay` or `live_model`), creator review (`adopted` / `entered_different` / `ignored`), strict parsers, `toDocumentObservations` (contract provenance, trace only). No "verified" state. Browser-safe |
| `evidence/examine-upload.ts` | Server-only wrapper over `examineReceiptDocument` (unchanged): 4 MB ceiling, SHA-256, byte checks before any call, replay or live |
| `evidence/replay.ts` + `replay-fixtures.data.ts` | Fixture replay: recorded ground truth of the 45 synthetic fixtures keyed by SHA-256 (generated by `eval/build-replay-table.ts` from the eval oracle). **Not model output; proves nothing about extraction quality** |
| `evidence/config.ts` | Live gate. **Locked off in code** (`LIVE_EXTRACTION_PERMITTED_IN_THIS_BUILD = false`, CR-V2-EVIDENCE-PROD-UAT-1): no environment value or request can enable it. Lifting it needs a reviewed code change plus `CREATOR_RECORD_LIVE_EXTRACTION=enabled` |
| `evidence/verify-returned-documents.ts` | Server-only. Documents the page sends back are checked against the replay table (same SHA-256, fixture id, versions and extraction); anything else, including a `live_model` label, is refused |
| `evidence/live-caller.ts` | The only app path to `examine.anthropic.ts`, via dynamic import after the gate check |

Route: `POST /api/admin/creator-record-v2/examine` (admin check before the body; streamed size limit; strict multipart). Document observations are **display-only**: the draft route re-validates them and `build-draft.ts` never passes them to `runCreatorRecordGuidance`. An adopted value becomes the creator's own declaration; a stale adoption is refused.

```
python -I lib/creator-record/eval/fixtures/generate_receipt_fixtures.py
npx tsx lib/creator-record/eval/build-replay-table.ts     # regenerates evidence/replay-fixtures.data.ts
```

Tests: `evidence-identity`, `evidence-examine`, `evidence-draft`, plus the boundaries and a11y tests.
