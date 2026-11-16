# CR-DESIGN-2B — Institutional Trust presentation: implementation report (revised for R1)

**Status: LOCAL AND INERT — NOT RELEASED, NOT APPROVED.**

- Branch `work/cr-design-2b` (local only; not pushed or merged).
- Production template approvals (v4/v5), the generator (`creator-record-v2-pdf-v3`) and every issuance path are unchanged.
- v6/v7 stay **pending**.
- Awaiting PM/Architecture and founder visual and engineering acceptance. Template approval and release are separate decisions (CR-DESIGN-2C).

**Authority.**
- Founder decisions FD-1–FD-12 and the PM/Architecture clarifications of the 2B authorisation (2026-11-15), against `08_Platform/implementation/cr-design-2a/`.
- The PM/Architecture review decision **CR-DESIGN-2B-R1** (2026-11-16): direction and architecture accepted; final acceptance withheld pending the corrections below.

**R1 in one paragraph.** The 2B package was defective in ways its tests did not see:
- no running footer and no page numbers on any page;
- overlapping content on P11 page 1;
- content running into the footer band and a broken index break on P5;
- a process-dependent apostrophe text-layer fault.

The 2B tests read a separate layout pass, not the PDF. R1 found each root cause on the bytes and fixed it narrowly in the presentation renderer, with no change to the stack, wording, schemas or v1–v5 drawing. It moved every decisive check onto the PDF bytes, including negative controls. Root causes: **`R1-ROOT-CAUSES.md`**.

## 1. What was built

| Area | Change | Where |
|---|---|---|
| Presentation configuration | Data-only contract `si8/creator-record-pdf-presentation` v1 covering: A4 geometry, tokens, type scale, hash-pinned fonts, chrome (which approved strings run where), registers and layout rules. **R1 changes:** `type.page_label` has no line height; new `layout.label_width`, `sub_indent`, `count_gap`, `index_lead_presence` and `hero_steps`. Fingerprint `75048e7ecaf8c2a7517f6e7aaadbbb7ded3fc7cd64d06f878ffc6a1aca075be7` (2B: `5e050fc1…`) | `lib/creator-record/customer-pdf/presentation/institutional-trust.ts` |
| Fonts | Unchanged from 2B: static Fraunces and Inter instanced reproducibly from `google/fonts@cc39c4c2`, IBM Plex Mono, OFL licences, Noto Sans CJK TC fallback | `customer-pdf/fonts/` |
| Template contract | Optional `presentation` and `navigation` fields (v1–v5 do not carry them) | `customer-pdf/templates.ts` |
| Document model | 2B as before, plus R1: the approved counts close "About" as one `counts` box (same blocks, strings and order; presentation sets only) | `customer-pdf/document-model.ts`, `readiness-layout.ts` (`compactCounts`) |
| Drawing | Running header = approved `footer`; running footer = approved `stamp`, both complete on every page; stamp again on page 1 (FD-3); navy index; reading-register pages. **R1 changes:** page label as its own fixed text; guarded boxes; cards and the index open with an unbreakable unit; index as a flat run of row units; heading before the index travels with it; adaptive hero size; compact counts row; reading sub-rows aligned to the value column; glyph characters primed before layout | `customer-pdf/InstitutionalTrustPDF.tsx`, `ReadingLayoutView.tsx`, `CustomerRecordPDF.tsx` |
| Proposed templates | **v6** (schema 7) `a38ac64f83e0e9fbc7734784060f3d71b9bed51b98190f5c041164cd51fb4e8d`; **v7** (schema 8) `9810d5c94c6a5719905874e1ac29c661118cecab6996ea678fd5f5ff7b0719f0`. Still v4/v5 verbatim plus `version`, `presentation` and `navigation` only. They changed only because the presentation fingerprint changed. Lifecycle `pending`, no authority, registered nowhere | `governed/proposals/CR-PDF-TEMPLATES-v{6,7}-*.proposal.json` |

## 2. R1 corrections (requirement → result)

| R1 requirement | Result (verified on the PDF bytes, all 13 cases) |
|---|---|
| Complete stamp and footer on every page | Both are extractable on all 80 pages, inside their reserved bands |
| Accurate visible page numbering | "Page N of M" is extractable and correct on every page, in the footer band; no other page number appears |
| No overlapping, clipped or obscured content | No overlapping text lines; no text covered by a later-drawn shape; no text off the page |
| Content kept out of the reserved regions | No glyph outside the content region; at 2× raster, the bands hold only the page ground |
| No inappropriate splitting of navigation rows | Each index row is unbreakable; a subject heading travels with its first row; the heading run before the index travels with it |
| Curly-apostrophe search and extraction | Every word containing a non-ASCII character is found by PDF search, and every printed string extracts in order. Approved wording is unchanged |
| First-page guidance visibility | Page 1 gains space from the compact counts row (about 30 pt) and the adaptive hero (P11: 5 title lines become 4). See §5 for the placement evaluation |
| Compact counts | One counts row (same approved sentences) instead of three or four paragraphs |
| Adaptive title typography | 25 pt; 21 pt from 64 characters; 17.5 pt from 120 (CJK counted twice) |
| Index pagination | Breaks only between rows; never starts as an empty strip at a page foot |
| Whitespace | No empty index strip. Remaining items are listed in §6 |
| Reading detail rows | Sub-row labels are indented; values align with the reading's value column |

## 3. Clarifications 1–7 (2B, re-verified)

1. **Caveat relocation:** C5 only. The block multiset, consolidations and consideration order are identical to v4/v5.
2. **Long content** breaks between parts or lines. Nothing is clipped, and no view is oversized (react-pdf warnings: 0).
3. **D10** is unchanged. Readings print only in section 6; the `readiness_layout_refused` guards still refuse.
4. **Navigation copies** are recorded and excluded exactly. The counts row changes placement only, not blocks.
5. **Configuration consumed:** all 181 leaves are read while building and rendering (tracked across P4, P5, P10 and P11).
6. **Not reachable from Production:** `approvedPdfTemplates` returns v4/v5, `sources.ts` does not reference v6/v7, and the generator is unchanged.
7. **Drain gate:** untouched.

## 4. Review PDFs (generated by the real renderer)

**Location:** `C:\Users\User\SI8-review\cr-design-2b-r1-2026-11-16\`

| Item | Contents |
|---|---|
| `pdf/` | 13 PDFs, each with its printed strings (`.texts.json`) and byte-check expectations (`.expect.json`) |
| `png/` | Every page in colour and greyscale, 110 dpi |
| `current-v4-v5-for-comparison/` | The same records rendered with today's v4/v5 templates |
| `report.json`, `acceptance-checks.json` | Byte-check and acceptance results |
| `negative/` | The deliberately broken controls |
| Documentation | Package README, root causes and this report |

The 2B folders are superseded.

| Case | Content | Schema | Pages (2B → R1) |
|---|---|---|---|
| P1 | No documents, Runway guidance | 7 | 5 → 5 |
| P2 | Documents inventoried, not examined | 7 | 5 → 5 |
| P3 | One reading and one document not read (substitute, §8) | 8 | 8 → 7 |
| P4 | Reading with plan-name qualifier, AI-addressed text, creator response | 8 | 8 → 8 |
| P5 | Runway + Higgsfield; shared caveats | 7 | 5 → 6 |
| P6 | Unresolved applicability | 7 | 5 → 5 |
| P7 | Uncovered source (Artlist) | 7 | 5 → 5 |
| P8 | Unidentified provider | 7 | 4 → 4 |
| P9 | Zero selected guidance | 7 | 4 → 4 |
| P10 | Four documents (two read, one not read after a failed attempt, one not read) | 8 | 10 → 10 |
| P11 | Long title, maximum-length file name, digests | 8 | 8 → 8 |
| P12 | Traditional Chinese, Japanese, Korean and Vietnamese title | 7 | 5 → 5 |
| P13 | Topic-qualified subject, unspecified conditions | 7 | 8 → 8 |

P5 gained a page because its index now moves whole to page 2 with its heading, instead of overflowing page 1 into the footer band.

**Every case:**
- exact print;
- complete footer and stamp on every page;
- correct page labels;
- no orphan headings and no oversized views;
- same blocks as v4/v5;
- byte check passed.

**Approved v4/v5 output is unchanged.** I re-rendered all 13 records with today's v4/v5 sets on this code and compared each page's raster and extracted text with the 2B comparison PDFs:
- 9 schema-7 records are identical;
- 4 schema-8 records differ only on the "Answers fingerprint" line, a value the synthetic fixture regenerates on each build.

## 5. Placement evaluation (R1 §3)

**Question asked:** can an approved placement adjustment bring the guidance overview earlier without weakening disclosures or separating qualifications?

**Measurement:**
- The index with its heading needs about 140 pt for one row.
- Single-consideration records (P1, P2, P7) leave 116 pt on page 1 after "What you told us".

**Options:**
- **Closing the gap by compressing page 1.** This would mean tightening the identity block or the page-1 disclosure panel. Not done: it would weaken the disclosures.
- **Moving the "What you told us" panel below the index.** The index would then fit on page 1 in those records. This is a change to approved placement, so it is **not implemented** and is offered for decision.
- **Moving the index above "About this record".** Rejected: the disclosures that frame the guidance would come after it.

## 6. Visual notes for the reviewers

- When a long card continues on the next page, its first part is drawn to the page foot. That is @react-pdf's split behaviour, so a card can end in up to about 40 pt of empty card. There is no "(continued)" header (deferred, as in 2B).
- P10: Document 4 moves to its own page (it needs about 174 pt; about 90 pt remain). The reading-register section then ends and the warm register resumes on a new page, as designed.
- The CJK title prints in the fallback face beside Fraunces (expected).

## 7. Limitations of automated visual verification

- **Geometry, not quality.**
  - Text checks see text lines and their glyph boxes (font ascent and descent), not how the text looks.
  - Lines that only touch are tolerated, and a partly covered glyph is caught only if its centre is covered.
- **Reserved bands only.** The raster check is limited to the reserved header and footer bands. It cannot judge balance, whitespace, hierarchy or whether a page looks finished.
- **Search scope.** Search probes are words containing non-ASCII characters and CJK pairs. Pure-ASCII words are covered by the in-order text check, not by search.
- **One reader.** The checks use one reader (MuPDF). Other viewers' text extraction and copy behaviour (Acrobat, Preview, Chrome) and screen readers were not tested. The PDF is not tagged (PDF/UA remains out of scope).
- **No print check.** On-screen rendering does not verify print. See §9.

## 8. P3 and failed-reading fixtures, reconciled with the acceptance criteria (`cr-design-2a/05`, §2)

- **P3** was specified as "Schema 8, no documents". That state cannot be produced: a record without a reading is always schema 7. The schema 8 "no documents" wording is therefore covered by the schema 7 cases:
  - P1 prints "You did not add any documents.";
  - P3 is the nearest real schema 8 record (one reading, one document not read).

  No impossible state was fabricated to satisfy the criterion. **Decision requested:** accept P1 together with P3 as meeting the P3 criterion.
- **P10** was specified to include "one that could not be read (failure label)". A failed live reading is never carried into an issued record, so its failure label cannot print. P10 shows such a document as "Not examined". The failure label is printed only for replayed readings, which the customer path does not produce. No such record was fabricated. **Decision requested:** accept P10 as meeting this criterion, or remove the failure-label sub-criterion.

## 9. Physical print checks requiring operator action

These need a person and a printer, ideally on A4 and on US Letter with "fit to page":
1. **Footer and stamp.** The footer and stamp print legibly (7.4–7.5 pt) and are not cut off by the printer's unprintable margin. The footer sits 20 pt (about 7 mm) from the page edge.
2. **Navy index.** It prints solid without banding, and its light text stays readable. Also check toner use.
3. **Light backgrounds.** The cool reading-register ground and the warm paper ground either print as intended or drop out cleanly; text on both stays readable.
4. **Greyscale printing.** The gold and navy accents, the open-matter boxes and the caveat panels stay distinguishable.
5. **CJK and Vietnamese title (P12).** It prints with all marks intact.

## 10. Build and test results

| Check | Result |
|---|---|
| `__tests__/creator-record/cr-design-2b.test.ts` | **30 tests**, all passing |
| R1 additions to that file | byte-level checks for every case, search probes, the negative controls, the compact-counts placement |
| `customer-pdf.test.ts` | passing |
| Full suite | **24 failing suites / 89 failing tests**, the same failing set as the recorded baseline (compared test by test; no new failures); 9,791 passing |
| `tsc --noEmit` | clean |
| `scripts/customer-wording-check.js` | exit 0 |
| `next build` | **exit 0**, run with inert placeholder environment values, as before; a build without them fails on an unrelated route's Supabase client |
| Font packaging and tracing | all 9 font files are traced and present for each of the four issuing routes |

The byte checks need Python 3 with PyMuPDF (`verify_pdf_bytes.py`). A local build is not a deployment.
