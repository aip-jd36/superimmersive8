# SI8-UX-2 — Questionnaire and Supporting Document Experience: local review package

**Status: LOCAL IMPLEMENTATION, NOT RELEASED.** Branch `work/si8-ux-2`, not pushed, not deployed. Authorized for local
implementation and testing only (SI8-UX-2 authorization). The new customer strings are **proposed and not approved**. No
approval, fingerprint, approval record, database, Production data, access setting or deployment was changed.

Founder wording approval, visual acceptance and Production release authorization are separate steps that have not happened.

## 1. What changed

Presentation and front-end orchestration only, over unchanged server contracts:

- **Multi-step questionnaire.** The six governed sections are the steps, in their governed order and with their governed titles,
  followed by the acknowledgements. Questions, options, conditions, requirements, validation and the single submission are
  unchanged. A step's own check is the existing `validateForm` result filtered to that step. The server still validates everything,
  and a server issue opens the step it concerns.
- **Documents inside each tool's section.** Upload with storage consent, or choose a document already added. Documents are linked at
  add time, and the link stays visible and correctable. Type, inclusion ("Not in this version"), the record-level reading switch,
  per-document AI permission and examination all work as before. Documents not linked to a tool, and documents needing a choice,
  are listed after the tools.
- **Tool-association integrity.** Removing a tool renumbers the links of later tools. The removed tool's documents are never moved
  to another tool: they need an explicit choice (link to a tool, leave not linked, or take out of the version). Changing a declared
  tool's identity in place has the same effect, including changes to or from "Not sure" and clearing it; a first choice is not a
  change, and a plan or date change is never a change. Preparation is blocked while any choice is open. Tool blocks have stable
  keys, and a tool already holding two documents is not offered as a link.
- **Readings.** What a reading says appears only in the prepared version's separate reading view (examination review), unchanged
  apart from styling. Responses to readings are unchanged.
- **Styling.** Institutional Trust styling, scoped to the Creator Record client (`.cr-it`), on `/creator-record` and the admin UAT
  page that shares the client. No other page changes.

## 2. Commits (local)

| Commit | Content |
|---|---|
| `3ea82f95` | Implementation, proposed strings, wording-guard coverage, new tests |
| `50255135` | Boundary allowlists, retired-panel assertion, server scenarios within the synthetic two-tool limit |
| `cb540e21` | Local browser harness and headless evidence driver (test support only) |
| this document, and the design archive README | Documentation, separate commits |

## 3. Changed-file inventory (`29919c57..cb540e21`)

**Application (customer surface):**
- `app/creator-record/CreatorRecordV2Client.tsx`
- `app/creator-record/page.tsx` (stylesheet import only)
- `app/creator-record/institutional-trust.css` (new)
- `app/admin/creator-record-v2/uat/page.tsx` (stylesheet import only)
- `components/creator-record/CreatorRecordQuestionnaire.tsx`
- `components/creator-record/ToolDocuments.tsx` (new)
- `components/creator-record/useCreatorRecordDocuments.ts` (new)
- `lib/creator-record-flow/document-associations.ts` (new, pure)
- `lib/creator-record-flow/questionnaire-steps.ts` (new, pure)
- `lib/creator-record-flow/wording.ts` (14 proposed strings)
- `scripts/customer-wording-check.js` (new files added to the guard)

**Tests:**
- new: `ux2-document-associations`, `ux2-questionnaire-steps`, `ux2-preparation-references`, `ux2-presentation`,
  `ux2-harness-references`;
- updated: `creator-record-boundaries` (allowlists), `examination-ui` (one assertion).

**Test support:** `test-support/si8-ux-2/*` (harness and driver).

**Not changed:**
- API routes, server services, evidence intake, examination, live examination;
- governed sources, approvals, PDF templates, presentation configuration, PDF generator, delivery;
- migrations, Living Knowledge, Retrieval, Bounded Interpretation, D10 policy;
- the dashboard, the marketing site.

## 4. Existing behaviour preserved

| Contract | Evidence |
|---|---|
| Question set, options, conditions, requirements | `ux2-questionnaire-steps` (Production registry); browser path A checks |
| Hidden answers discarded | `ux2-questionnaire-steps` (`formToObservations` discards F3/M1/M2) |
| Server issues mapped to their step | `ux2-questionnaire-steps` |
| `questionnaire_changed` recovery, correction (new version) | Unchanged client code; existing `questionnaire-recovery` and `examination-ui` suites pass in the control run |
| Storage consent per upload; AI permission per examination, separate and explicit | `ux2-presentation`; browser path B |
| Existing reading reuse ("existing" at no cost) and refusal/retry (retry only on 503) | Unchanged hook semantics; browser path B (503, then retry) |
| Record-level reading switch, document type, inclusion | `ux2-presentation`; browser path B request body |
| Responses to readings (recorded on a new version) | Browser path B |
| Preparation and confirmation contracts | `ux2-preparation-references` (real `preparePrepared`); browser request log |
| Stripe-hosted Checkout | `ux2-presentation` (source); browser paths A and B |
| Ownership, issuance, immutability, PDF and download | No change to those files (§3) |

## 5. D10 preservation

- No reading value, comparison, discrepancy wording, verification indicator, suggested correction or document-to-guidance link is
  rendered in the form (`ux2-presentation`). In the browser, the form's text never contains a reading value.
- In the review, reading values appear only inside the reading view, after "Your answers", and never inside the declarations
  (browser path B, desktop and mobile).
- Links are only ever set by the creator's explicit action; nothing reads a document or a reading to suggest one
  (`document-associations.ts`).
- Server-side D10 boundaries are untouched (§3).

## 6. Wording approval package (PROPOSED — not approved)

All 14 strings are new. No existing string is changed, moved under a new key or removed. The question text, option labels,
section titles and order, acknowledgements, storage consent, AI permission and PDF text are unchanged.

| Key | Proposed text | Location | Reason |
|---|---|---|---|
| `QUESTIONNAIRE_CHROME.step_status` | Step {n} of {total} | Above the step list | Orientation in the multi-step form |
| `QUESTIONNAIRE_CHROME.steps_label` | Questionnaire steps | Accessible name of the step navigation | Screen-reader landmark |
| `QUESTIONNAIRE_CHROME.back` | Back | Step actions | Navigation |
| `QUESTIONNAIRE_CHROME.continue` | Continue | Step actions | Navigation |
| `QUESTIONNAIRE_CHROME.submit_blocked` | Some documents need a choice before you can continue. Go to "The AI tools you used" to choose what to do with each one. | Last step, when blocked | Explains why preparation is held |
| `PANEL_TEXT.add_new_document` | Add a new document | Tool section | Upload entry point |
| `PANEL_TEXT.choose_existing` | Choose a document you have already added | Tool section and picker heading | Previously uploaded picker |
| `PANEL_TEXT.add_existing` | Add to this tool | Picker row | Adds the chosen document to this tool |
| `PANEL_TEXT.already_in_version` | This document is already in this version. You can change where it is linked where it is listed. | Tool section after a duplicate upload | Same file returns the same stored document; nothing moves |
| `PANEL_TEXT.close` | Close | Upload panel and picker | Dismiss |
| `PANEL_TEXT.unlinked_heading` | Documents not linked to a tool | After the tools | Groups unlinked documents |
| `PANEL_TEXT.needs_choice_heading` | Documents that need a choice | After the tools | Groups documents whose tool was removed |
| `PANEL_TEXT.needs_choice_removed` | The tool this document was linked to was removed. Choose a tool for it, leave it not linked, or take it out of this version. | Document row | Integrity notice (removal) |
| `PANEL_TEXT.needs_choice_changed` | You changed the AI tool this document is linked to. Choose a tool for it again, leave it not linked, or take it out of this version. | Document row | Integrity notice (in-place change) |

**Existing approved strings reused in new places, text unchanged:**
- `CUSTOMER_SECTION_TITLES` (step labels and headings);
- `QUESTIONNAIRE_CHROME.acknowledgements_heading`, `.choose`, `.tool_heading`, `.submit`, `.issues_heading`, `.remove_tool`, `.add_tool`;
- `EXAM_TEXT` / `EXAM_LIVE_TEXT`: `guidance_documents_label`, `guidance_no_document`, `consent_label`, `ai_permission_label`,
  `upload`, `uploading`, `examine`, `examining`, `examined`, `retry`, `link_label`, `not_linked`, `no_documents`,
  `evidence_title`, `evidence_intro`, `include_label`, `include_note`, legal links;
- `PANEL_TEXT.not_in_version`, `.kind`, `.choose_document`, `.loading_documents`, `.document_fallback`;
- `EVIDENCE_MESSAGES.too_many_documents`.

**Presentation-only changes that participate in no fingerprint:** layout, CSS, colour tokens, the order in which existing strings
are rendered, splitting sections into steps, and code comments. These were verified by the control run: the identity is unchanged
when only the new strings are hidden.

## 7. Fingerprint impact (computed from the repository's own derivation functions)

The method reproduces every pinned value under the HEAD wording; that check is recorded in the private evidence.

| Identity | Current (pinned, approved) | Proposed (with the §6 strings exactly) |
|---|---|---|
| Customer wording identity (`si8/creator-record-v2-customer-wording`, v2) | `be6e06e826cff62c0d3b8838c10d73464c78f6b5c719a4cde75822ac031a01ec` | `d9ab1ccb43e8e983c997d9a80e12aae208f90123a4c3ea02b9cc780c1b2ff070` |
| Source Text content (schema 7 and 8 approvals share it) | `7798a482cbb31772bce7819e503e5b065ac657a8ae2537faf69e494b6efdfbd9` | `8af542da3e6c48c78df8854f78f0da628db22c7035801859913f7b19a427107d` |
| Questionnaire contract | `b398b0136f806278311d12a00a1faed54f8a1cef455910f67359ac48130abc95` | `6c95569de6093999997c2d17cd64d82b66eae56014c0e4423ae084296bdf45e8` |
| Synthetic test authority source text (test-only, not governance) | `260391e7d6ad73482bb877639db1e84e40c96ec68b35128850634be42e08dd6e` | `366f8ca7903e11c4042716078cdb73fe220a6e3512d46815b12376ae1375cd4c` |
| Synthetic test authority contract (test-only) | `d34bc6ce2ee5410ce10d16d049c9d94e320b0a321603dcce5a0d01175a518b26` | `4cbb9463ae4e5fed42217f9afa8df368f7ffbfefc19ae99e1711d3d5460b92a5` |
| Presentation templates pin `CUSTOMER_WORDING_TEMPLATES_SHA256` | `8f4c3888…abfc0` | unchanged |
| PDF template approvals v6 / v7 | `a0cd0c24…f476` / `5d7ccfc8…61ab` | unchanged |

Any edit to the proposed wording during review changes these values; they must be recomputed for the approved text.

**Approval records that would need renewal (pending founder approval; none recorded):**
1. Source Text Approval v9 (schema 7) and v10 (schema 8), content `8af542da…`.
2. Questionnaire contract approval v4, `6c95569d…`.
3. Storage-consent and AI-permission approval records, **with the same ids** (`cr-v2-storage-consent-1`,
   `cr-v2-ai-permission-1`), naming `d9ab1ccb…`. The consent identifier and the AI-permission version string
   (`{id}__{privacy}__{terms}`) are then unchanged, so the database permission row and existing grants are unaffected.
4. Pinned constants: `CREATOR_RECORD_SOURCE_TEXT_SHA256`, `CREATOR_RECORD_QUESTIONNAIRE_CONTRACT_SHA256`, and the test pins that
   assert them.
5. Test-only: the synthetic test authority pins. This is not a governance approval: governance mode refuses that authority.

## 8. Historical versions and release compatibility

From code (`customer-record/eligibility.ts`, `governance-state.ts:156-158`, `customer-flow/purchase.ts`,
`creator-record-artifacts/deliver.ts`):

| Case | After the wording rotation |
|---|---|
| Unpaid prepared version (not confirmed) | Not purchasable: its source-text approval reads as pending and its embedded questionnaire contract is no longer current. "Correct my answers" shows the earlier answers for reference (another contract), and the creator re-enters them. Its documents need a choice again (handled by the new code). |
| Confirmed but unpaid version | Same: "This version cannot be paid for right now." |
| Checkout session open across the cutover | Stripe may accept the payment; issuance then refuses (`governance_ineligible`) and the order goes to manual reconciliation ("Needs attention"). |
| Paid, not yet issued | Same refusal at issuance, then manual reconciliation. |
| Issued records and historical PDF access | Unaffected: delivery reads the stored artifact only, and artifacts are immutable. |
| Consent and AI-permission grants | Unaffected if the approval ids are kept (§7). If the records are not renewed, storage consent becomes unusable (uploads refused) and live examination is not offered. |
| Browser sessions open during deploy | The existing `questionnaire_changed` recovery. |

**Release preconditions:** pause submissions and drain before cutover, as in CR-DESIGN-2D D1:
- no open checkout sessions;
- no paid-unissued orders;
- no unpaid prepared versions that anyone intends to buy (only admin UAT versions exist; access is invitation-only).

Production verification of this state is a separate read-only prerequisite.

## 9. Verification results

| Check | Result |
|---|---|
| `tsc --noEmit` | Clean |
| Wording guard (`scripts/customer-wording-check.js`) | Pass, with the new components guarded |
| `next build` | Exit 0 with fake placeholder environment values (no Supabase or other env exists locally; without them page-data collection fails on an unrelated route, `supabaseUrl is required`) |
| New UX-2 tests | 35 (associations, steps) + 14 (presentation) + 19 (harness parity) pass; 9 server scenarios pass in the control run and fail in the committed state (approval gate) |
| Full suite, baseline `29919c57` | 24 suites / 89 tests failing (the established baseline) |
| Full suite, control: committed code with the new strings hidden from the identity (measurement only, never committed) | 24 / 89, the identical failing set; 0 new failures; 9889 passing (+78) |
| Full suite, committed `cb540e21` | 54 suites / 578 tests failing: the baseline plus 30 suites / 493 tests that fail only because the proposed wording rotates the approval identity. None of them fails in the control. |
| Browser (headless Chrome, harness, synthetic) | 78/78 checks; paths A and B at 1280px and 390px; no horizontal scroll |

The committed-state failures are the outstanding wording-approval gate, not passes and not regressions. Evidence is in
`SI8-private-evidence/creator-record-v2/si8-ux-2/` (screenshots, checks, request log, suite summaries, build log, fingerprints,
`MANIFEST.sha256`).

## 10. Known limitations

- The browser evidence uses a fake in-page API, not the server. Server behaviour is proven by the unit tests. An admin UAT on
  Production (after approval and deploy) is still required.
- The review, confirmation and checkout screens are restyled only through the scoped tokens. The dashboard is unchanged (out of
  scope).
- `EvidencePanel.tsx` is no longer used by any page; it is kept, with its tests, to avoid unrelated deletion.
- Pre-existing, unchanged: the plan selector's group label ("Some plan names SI8 has guidance about (not a full list)") is typed in
  `CreatorRecordQuestionnaire.tsx`, outside the wording set. It renders only when plan suggestions are passed, which the customer
  page does not do. The guard does not detect `label=` attributes. Recommend moving it into the wording set in a later approval.
- Pre-existing, unchanged: question legends inside a tool block repeat "Tool N:" under a "TOOL N" heading.
- Changing a declared tool clears its plan answer (existing behaviour), so re-selecting a tool asks for the plan again.
- Web fonts are not loaded; the serif and sans stacks fall back to system fonts.

## 11. Proposed release and rollback plan (for later authorization)

1. Founder approves the §6 wording, or an edited version.
2. Engineering recomputes and pins the §7 identities, and records Source Text v9/v10, contract v4 and the renewed
   consent/permission records with the same ids, plus the test-only synthetic re-pin. Then the full suite (expected: baseline
   only) and `next build`.
3. Read-only Production prerequisite: the drain state in §8, and the permission authority row unchanged.
4. Pause submissions, deploy, then admin UAT on Production:
   - path A (one tool, no documents);
   - path B (two tools, previously uploaded and new documents, examination, tool removal and relinking, review, response,
     100% comp code purchase, issuance, download, PDF byte checks).
5. Reopen submissions, keeping the invitation gate (CR-PUBLIC-1 is separate).
6. **Rollback:** redeploy the CR-DESIGN-2D Production deployment (`29919c57` content). Because the approvals would be renewed in the
   same change, rolling back restores the earlier identity and approvals together. Versions prepared under the new wording would
   then be non-purchasable, so a drain applies to rollback too. Never roll back below Build A `60b1d84d`.
