# SI8-UX-2-R2 — Founder authorization record

| | |
|---|---|
| Approval reference | `JD-SI8-UX-2-R2-20261116` |
| Authority | JD, for PMF Strategy Inc. d/b/a SuperImmersive 8 |
| Decision date | 2026-11-16 |
| Given in | SI8-UX-2-R2 — Founder Authorization and Release Preparation (founder instruction) |
| Scope | Wording approval and release-candidate preparation only. **Does not authorize Production deployment or public access.** |

## Decisions (as given)

The founder approves:

1. All 14 proposed customer-facing strings in the SI8-UX-2 wording approval sheet, **without modification**.
2. Reuse of the existing pending-upload message ("This file is still being added. Try again in a moment.",
   `EVIDENCE_MESSAGES.upload_in_progress`) in the new location beside the submit button.
3. The Institutional Trust visual direction for the Creator Record questionnaire and supporting-document experience.
4. The SI8-UX-2-R1 asynchronous association correction as reported (commit `1dce088c`).

The approved strings are listed verbatim in `SI8-UX-2-founder-review-package/02-WORDING-APPROVAL-SHEET.md` and are in
`08_Platform/app/lib/creator-record-flow/wording.ts` (`QUESTIONNAIRE_CHROME.step_status`, `.steps_label`, `.back`, `.continue`,
`.submit_blocked`; `PANEL_TEXT.add_new_document`, `.choose_existing`, `.add_existing`, `.already_in_version`, `.close`,
`.unlinked_heading`, `.needs_choice_heading`, `.needs_choice_removed`, `.needs_choice_changed`).

## Approved identities (recomputed and verified before recording; all matched)

| Identity | Approved value |
|---|---|
| Customer wording (`si8/creator-record-v2-customer-wording` v2) | `d9ab1ccb43e8e983c997d9a80e12aae208f90123a4c3ea02b9cc780c1b2ff070` |
| Source Text content | `8af542da3e6c48c78df8854f78f0da628db22c7035801859913f7b19a427107d` |
| Questionnaire contract | `6c95569de6093999997c2d17cd64d82b66eae56014c0e4423ae084296bdf45e8` |

## Approval records written (`08_Platform/app`)

| Record | Before | After |
|---|---|---|
| Source Text Approval, record schema 7 | v7, `JD-CR-V2-MVP-PROVIDER-SCOPE-2-20261111 schema 7`, `7798a482…` | **v9**, `JD-SI8-UX-2-R2-20261116 schema 7`, `8af542da…` |
| Source Text Approval, record schema 8 | v8, `… schema 8`, `7798a482…` | **v10**, `JD-SI8-UX-2-R2-20261116 schema 8`, `8af542da…` |
| Questionnaire contract approval | v3, `JD-CR-V2-MVP-PROVIDER-SCOPE-2-20261111`, `b398b013…` | **v4**, `JD-SI8-UX-2-R2-20261116`, `6c95569d…` |
| Storage-consent approval `cr-v2-storage-consent-1` | names `be6e06e8…` | same id, names `d9ab1ccb…` |
| AI-permission approval `cr-v2-ai-permission-1` | names `be6e06e8…` | same id, names `d9ab1ccb…` |
| Pinned `CREATOR_RECORD_SOURCE_TEXT_SHA256` / `CREATOR_RECORD_QUESTIONNAIRE_CONTRACT_SHA256` | `7798a482…` / `b398b013…` | `8af542da…` / `6c95569d…` |
| Synthetic test authority pins (test-only; not a governance approval) | `260391e7…` / `d34bc6ce…` | `366f8ca7…` / `4cbb9463…` |

**Locations:**
- the Source Text and contract approvals, and the reference constant: `lib/creator-record/governed/sources.ts`;
- the consent and permission records: `lib/creator-record/evidence-intake/contract.ts`;
- the synthetic pins: `lib/creator-record/governed/synthetic-test-authority.ts`.

## Preserved

- **Consent and permission ids.** Unchanged, so the storage-consent identifier and the AI-permission version string
  (`{id}__{privacy}__{terms}`) are unchanged.
- **Governed wording.** All existing governed wording is unchanged: question text, option labels, section titles and order,
  acknowledgements, storage consent, AI permission, caveats, dependency labels and ledger explanations.
- **PDF.** The released PDF templates (v6 `a0cd0c24…`, v7 `5d7ccfc8…`), the presentation configuration and the generator are
  unchanged.
- **T1 question approval.** `JD-CR-V2-MVP-PROVIDER-SCOPE-2-20261111` is unchanged; only the wording approvals moved.
- **Historical records.** Records issued under the superseded approvals keep their own embedded approvals. The test
  reconstruction of the superseded v7/v8 + contract v3 state reproduces its pinned digests, and such records still verify and
  render (`__tests__/creator-record/provider-scope.test.ts`, `v3`).
