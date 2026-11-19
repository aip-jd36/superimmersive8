# CR-DOC-READER-EXT-6A — Governance corrections (D2, D5, privacy)

**Status: PREPARED FOR FOUNDER AND COUNSEL REVIEW — NOTHING HERE IS APPROVED, PUBLISHED OR ACTIVE.** Production is unchanged
(`24db05de`: licence reading off, schema 8 selects v7, the four claims unpublished). Code changes in this milestone are local and
inert: they affect only unpublished candidate entries and the pending, never-selected template set v8.

## 1. D2 — document notes conditional on a relevant document (implemented, inert)

Problem (EXT-6): an entry's evidence notes print on every dependency row, so a creator who added no document would read "A document
you added may show …".

Correction: the four candidate entries' notes are **document-scoped** (`DOCUMENT_SCOPED_NOTE_ENTRIES`,
`lib/creator-record/integrated-assessment/dependency-relevance.ts`; a test pins the list to the four candidate entry ids). A
document-scoped note prints only when the record holds at least one document, not linked to an AI tool, of a category the governed
relevance table (D4) names for that dependency. Otherwise the governed explanation and the open point (label, "what you told us",
status) print **without** the note. Applied in both customer surfaces: the PDF open-items section and the readiness summary.

- Display only: the record still carries the note, because method v2 uses it as the governance signal that documents may be relevant.
- Every other entry's notes are unchanged. This includes general statements of what evidence could show a point, such as the pilot
  ledger's Getty note; the legacy rendering baseline is byte-identical.
- Note wording itself is unchanged (it is now true whenever it prints).

## 2. D2 — source re-verification (2026-11-19, automated fetch)

| Claim | Provider | Source | Result | Visible date |
|---|---|---|---|---|
| `CLAIM-STOCK-EDITORIAL-001-v2` | iStock | `istockphoto.com/legal/license-agreement` | **Supports.** Verbatim: "You may not use content marked "editorial use only" for any commercial, promotional, advertorial, endorsement, advertising, gambling/betting/gaming uses or merchandising purpose." No authorisation path found in the portion read (page truncated at ~40k of 66k characters). | "LAST UPDATED: July 2026" (unchanged from the recorded date) |
| same | Adobe Stock | `stock.adobe.com/license-terms` (zh-TW rendering, as recorded) | **Supports** both the restriction and a separate path: editorial-only assets may not be used for advertising, promotion, endorsement, product placement, commercial blogs, merchandise or other commercial purposes without the copyright owner's prior written consent and necessary additional clearance, even with an enhanced licence. Also: no modification beyond minor technical adjustment; credit required. | none visible |
| same | Getty Images | `gettyimages.com/eula` | **Could not be checked** (HTTP 403) | — |
| same | Shutterstock | `shutterstock.com/license` | **Could not be checked** (HTTP 403) | — |
| `CLAIM-POND5-EDITORIAL-COMMERCIAL-USE-CONSENT-001-v1` | Pond5 | `pond5.com/legal/license` | **Could not be checked** (HTTP 403); revision 2024-01-03 not re-confirmed | — |

No substantive change was found in what could be read. The re-verification is **incomplete**: Getty, Shutterstock and Pond5 need a
human browser capture (Print-to-PDF into the preserved evidence captures, as for Artlist and the original Pond5 capture). No
proposition was changed. Governed Claims' `last_verified` dates are unchanged (Stock 2026-08-27, Pond5 2026-08-30); updating them is a
governance step after the captures.

## 3. D5 — revised v8 wording (implemented in the pending candidate; new fingerprint)

Template set v8 remains `pending` (never selected). Fingerprint `351843de…ca73` → **`65cf053851cce49388a38ac16567668de3fc3060567b43862245b31c7551d1fa`**.
The registered literal is regenerated and still test-proven equal to the candidate.

| Item | Was | Now |
|---|---|---|
| Details about a person shown = true | "Yes (not copied into this record)" | **"Yes"** |
| Block heading | "How your documents relate to this consideration" | **"How your documents may relate to this consideration"** |
| Block intro (appended) | — | **"“May be relevant” means only that a reading may concern this point: it does not settle the point, and SI8 did not decide whether the guidance fits your project."** |
| Reading label | "Read by an automated reading" | **"Read automatically"** |

All other v8 wording is unchanged from EXT-6.

## 4. Privacy findings (licence and permission readings)

| Identifier | Prompt instruction | Enforced validation | Can reach the stored reading / excerpt / PDF? |
|---|---|---|---|
| Email address | "Never report …" | Yes: any value or excerpt matching an email rejects the whole reading | No (rejected) |
| Phone number | "Never report …" | Yes: same | No (rejected) |
| Person's name | "Never report …" | **No** | **Yes**, if the model does not comply |
| Postal address | "Never report …" | **No** | **Yes**, if the model does not comply |
| Signature | "Never report …" (an image cannot be copied; a description such as "signed by …" can) | **No** | A description can |
| `personal_details_present` flag | Model-reported | No | n/a (it is the model's own report) |

Where it would appear: values and excerpts of printed fields are stored in the reading envelope and the record, and printed in the
PDF documents section (and, under v8, in "Appears to show" / "Excerpt"). `permission_statement` is the most likely carrier ("X
grants Y …"). Limits: value ≤ 120 characters, excerpt ≤ 200. The original document itself (with all third-party details) is stored
privately and sent to Anthropic by design. Observation outside this milestone: the live receipt reader has no personal-details
instruction or contact validation (receipts usually show the creator's own billing details).

Enforced options for decision (not implemented):
- **A (recommended):** when a licence reading reports `personal_details_present = true`, the PDF prints no excerpts and no
  `permission_statement` value for that document, only a fixed line (new wording for D5), e.g. "Not printed: this document shows
  details about a person."
- B: add an address-pattern check to the validator. Unreliable across countries; reduces risk only.
- C: never print `permission_statement` values or any licence excerpt in the PDF.

## 5. Proposed privacy wording (for counsel; no legal sufficiency claimed)

- Privacy Notice §4, add: "A licence or permission may name another person or organisation, such as whoever gave a permission. Add
  one only if you are entitled to share it with SI8 for this purpose. You may cover details that are not needed to show the licence or
  permission."
- Privacy Notice §5, add: "If a document shows a person's details, the reading is instructed not to copy them, and the record notes only
  that such details are shown. This is not guaranteed: a reading may include a name or address shown in the document. The document
  itself, including those details, is stored and sent to Anthropic as described above."
- AI permission (optional; makes every existing permission stale): "… to be read for this record, including any details it shows
  about other people, which I am entitled to share."
- Counsel to consider: notice to the people named in these documents.

## 6. D1, D3, D4 independence

Approving D1, D3 or D4 changes nothing customers see until a separate code change ships:
- D1 is a scope decision with no runtime effect.
- D3 labels appear only on rows of a published claim (D2). Shipping them changes the Source Text digest, so records prepared but
  not yet bought would need preparing again: ship D3 together with D2.
- D4 is used only by the v8 block (v8 pending) and by the document-scoped note rule, which affects only the unpublished D2 entries.
