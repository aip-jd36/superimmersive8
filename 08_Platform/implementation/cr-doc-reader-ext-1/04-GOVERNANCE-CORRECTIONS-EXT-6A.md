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

## EXT-6B addendum (2026-11-19) — privacy projection, final readiness

**Customer-visible projections of the four document notes.** Customers see evidence notes only in the PDF: the open-items section and
the readiness summary inside it. Both apply `documentNoteApplies`. The admin prototype and legacy UAT draft view
(`DraftRecordView`) are not customer surfaces. The relevance rule uses the creator's declared document type only and never states a
provider, asset or project association. The v8 association line prints wherever a reading is related to a point.

**Privacy-safe projection (implemented, inert while licence reading is off).**
- `lib/creator-record/customer-record/reading-privacy.ts`. For licence and permission readings, by default and whatever the
  personal-details flag says:
  - no excerpt is shown anywhere;
  - the `permission_statement` value is replaced by a fixed line;
  - closed classifications, validated ISO dates and the bounded, contact-validated short values (licence or plan type,
    designation, item) are kept.
- Applied on every customer surface:
  - the pre-purchase review, server-side (`examinationViewOf`), so the browser never receives the withheld text;
  - the PDF documents section;
  - the PDF v2 relationship block;
  - the receipt-era v1 block (no-op for receipts).
- The stored reading and the record are unchanged (internal provenance). Extraction validation, consent and withdrawal are
  unchanged. Receipt readings are unchanged.
- The fixed lines come from the PDF template set (`reading_privacy`), not from the customer wording set. A new review-page string
  would change the approved customer wording identity and refuse Production checkout. `missingLicenceLabels` requires them, so
  licence reading cannot be enabled without them. With no such set, a withheld value shows as nothing.
- Residual risk, disclosed: a name inside a short value (for example "Item: portrait of …") is still shown. Values are capped at 120
  characters and contact-validated only.

**v8 additions (pending; fingerprint now `9496eb43c9167454b29cdfa2e1432aa2191abb818c04733c22f5a4402ce4b287`).**
- `reading_privacy.value_withheld`: "Shown in the document; not reproduced here"
- `reading_privacy.excerpts_withheld`: "Text from this document is not reproduced here, because a licence or permission may include
  details about other people. The document itself has the exact wording."

**Source re-verification.** Getty, Shutterstock and Pond5: BLOCKED. Automated fetch returns HTTP 403, and the Claude in Chrome
extension was not connected in this session, so no browser capture could be made. Their terms are **not** assumed unchanged. Next:
a human Print-to-PDF capture of each page into the preserved evidence captures, then a review.

## EXT-6C addendum (2026-11-19) — source evidence closure attempt

Read-only. No claim, `last_verified` date or proposition was changed. Browser extension: not connected. Founder captures: none supplied.

| Provider (claim) | Source read | Capture / visible date | Result |
|---|---|---|---|
| iStock (`CLAIM-STOCK-EDITORIAL-001-v2`) | `istockphoto.com/legal/license-agreement` (automated, HTTP 200) | 2026-11-19 / "LAST UPDATED: July 2026" (same as recorded) | **Verified.** "You may not use content marked "editorial use only" for any commercial, promotional, advertorial, endorsement, advertising, gambling/betting/gaming uses or merchandising purpose." |
| Adobe Stock (same) | `stock.adobe.com/license-terms` (zh-TW rendering, as recorded) | 2026-11-19 / none visible | **Verified** (Tier 2, as recorded): editorial-only assets may not be used for advertising, promotion, endorsement, product placement, commercial blogs or merchandise without the copyright owner's prior written consent and additional clearance |
| Getty Images (same) | `gettyimages.com.au/eula` (automated, HTTP 200). `.com`, `.co.uk`: 403 | 2026-11-19 / "LAST UPDATED: April 2026" | **Verified on Getty's Australian agreement.** §3.7: "Unless explicitly authorised in a Getty Images invoice, sales order confirmation or licence agreement, you may not use content marked "editorial" or "intended for editorial" for any commercial, promotional, advertorial, endorsement, advertising, gambling/betting/gaming uses, or merchandising purpose." The `.com` agreement the claim cites was not readable, and regional agreements can differ |
| Shutterstock (same) | `shutterstock.com/license`, `/support/…`: 403; old help article: 404; `submit.shutterstock.com/help/en`: 200 (index only, no editorial text) | — | **Not verified** |
| Pond5 (`CLAIM-POND5-…-CONSENT-001-v1`) | `pond5.com/legal/license`, `pond5.com/help/en/?query=editorial`: 403; `help.pond5.com` redirects to that 403 | — | **Not verified.** Revision 2024-01-03 not re-confirmed |

Evidence-trail finding: the four Pond5 preserved captures and their `MANIFEST.md` that the governed claim cites
(`evidence-captures/pond5/…`) are not on `main`. They exist only in commit `5309b1c1` on `recovery/pre-territory-main-worktree-2026-09-11`.
Their text layer is not extractable, and content was confirmed by human review (LK-59).

No inconsistency was found in any source that could be read. Getty and Adobe Stock add detail not in the proposition (Getty: third-party
approvals and gambling use; Adobe: modification and credit limits). It is narrower than the sources but not contradicted by them.

## EXT-6D addendum (2026-11-19) — browser re-verification (Claude in Chrome, founder's browser)

Pages were read as rendered text in the founder's own Chrome session on 2026-11-19. No sign-in, no form, and no bot check was solved
by the agent: the Getty Cloudflare check cleared on its own when the page was reloaded. These are text readings, not preserved PDF
artifacts.

| Provider | URL as served | Visible date | Passage | Result |
|---|---|---|---|---|
| Pond5 | `pond5.com/legal/license` | "(revised 2024-01-03)", footer "v. 2024-01-03": unchanged from the 2026-08-30 capture | §7: "For Content which the Item Page states is editorial or for editorial use only … This type of Content is intended to be used only in connection with events or topics that are newsworthy or of general public interest." / "Absent Pond5’s express and specific written (could be by email) consent, Editorial Content may not be used in any Merchandise, advertisement (other than in-context advertising of a Production in which Editorial Content has been incorporated), endorsement, promotion, advertorial, or other commercial Production." | **Verified, unchanged.** Matches the proposition word for word; "(could be by email)" is a detail, not a difference |
| Shutterstock | `shutterstock.com/license` | "EFFECTIVE DATE: October 5, 2026" (newer than the August research) | "An "editorial use" … shall be a use made for descriptive purposes in a context that is newsworthy or of human interest and expressly excludes commercial uses such as advertising or merchandising." / "YOU MAY NOT: … Use Visual Content designated "Editorial Use Only" (including, but not limited to, Editorial content) for commercial purposes, including for reference, in any advertising, merchandise or other non-editorial contexts." | **Verified.** No editorial-specific consent path is stated (only a general "contact Customer Service"). This is consistent with the claim's "some" providers. Also restricts broadcast/OTT, covers and >500k print runs |
| Getty Images | `gettyimages.com/eula` redirected to `gettyimages.hk/eula` (zh-HK) | "最後更新：2026 年 4 月" (April 2026) | "未經 Getty Images 事先書面同意並支付額外的授權費用，以下均被禁止" — prohibited without Getty's prior written consent and an additional licence fee: "除非在 Getty Images 發票、銷售訂單確認或授權協議明確授權，否則您不得將標記為「編輯性內容」…用於任何商業、促銷、社論式廣告、背書、廣告、博彩／打賭" — no commercial, promotional, advertorial, endorsement, advertising or gambling use of editorial content unless explicitly authorised in a Getty invoice, sales order confirmation or licence agreement. The zh-HK page text is broken mid-sentence; the English AU page has the full list, including merchandising | **Verified.** `.com` serves the regional agreement by location; the AU (English) and HK (Chinese) agreements, both April 2026, agree |

Result: every provider in both claims' scopes is verified against current terms, and none contradicts its proposition or provider
scope. No provider needs excluding.
