# CR-DESIGN-2B — Institutional Trust presentation: implementation report (revised for R2)

**Status: LOCAL AND INERT — NOT RELEASED, NOT APPROVED.**

- Branch `work/cr-design-2b` (local only; not pushed or merged).
- Production template approvals (v4/v5), the generator (`creator-record-v2-pdf-v3`) and every issuance path are unchanged.
- v6/v7 stay **pending and unregistered**.
- Awaiting founder and PM/Architecture approval of the final review package. Template approval and release are separate decisions (CR-DESIGN-2C).

**Authority.**
- Founder decisions FD-1–FD-12 and the 2B clarifications (2026-11-15).
- PM/Architecture review **CR-DESIGN-2B-R1** (2026-11-16).
- PM/Architecture instruction **CR-DESIGN-2B-R2** (2026-11-16), received from the founder for execution. It covers:
  - acceptance of P1 and P3 together for the P3 criterion;
  - acceptance of P10 as the customer-path behaviour for unsuccessful readings;
  - approval to move the "What you told us" panel below the guidance index;
  - final polish.

## 1. What was built

| Area | Change | Where |
|---|---|---|
| Presentation configuration | Data-only contract `si8/creator-record-pdf-presentation` v1: A4 geometry, tokens, type scale, hash-pinned fonts, chrome, registers and layout rules. **R2 changes:** `layout.declared_placement: 'after_index'`; the fallback family renamed to `SI8 Presentation Fallback` (own family, §3). Fingerprint `aa50507b4f76e8168744d88645220735e8b7820577e7be72e19c83dbedc017db` (R1 `75048e7e…`, 2B `5e050fc1…`) | `lib/creator-record/customer-pdf/presentation/institutional-trust.ts` |
| Placement | 2B: C5 caveat placement, C-3 pointer, C-1 heading, declared-title copy. R1: compact counts. **R2:** the same "What you told us" panel is placed after the guidance index and its open-matter lists when there is an index, and stays at the start of the overview when there is none (`declaredPlacement`). Same blocks, printed once; v1–v5 untouched | `customer-pdf/readiness-layout.ts`, `document-model.ts` |
| Drawing | 2B and R1 as reported (complete chrome on every page, guarded boxes, unbreakable opening units, index row units, adaptive hero, counts row, aligned reading sub-rows). **R2:** glyph characters assigned per document; presentation renders serialised | `customer-pdf/InstitutionalTrustPDF.tsx`, `ReadingLayoutView.tsx`, `CustomerRecordPDF.tsx` |
| Proposed templates | **v6** (schema 7) `a0cd0c248ce270d2826712910aa606579ce429f7923b051d68a0502c5305f476`; **v7** (schema 8) `5d7ccfc8ce824e57f6e904d51f1027b59e43ab250a7f4895b0f804debe1761ab`. Still v4/v5 verbatim plus `version`, `presentation` and `navigation` only; changed only through the presentation fingerprint. Lifecycle `pending`, authority `null`, registered nowhere (`governed/sources.ts` does not reference them) | `governed/proposals/CR-PDF-TEMPLATES-v{6,7}-*.proposal.json` |

## 2. R2 scope (requirement → result)

| R2 requirement | Result |
|---|---|
| 1. "What you told us" below the guidance index | Done in every case with an index (11 of 13). P8 and P9 have neither an index nor this panel. The introductory disclosures, approved wording, applicability qualifications and consideration order are unchanged; the block multiset equals v4/v5. Test: panel after index (v6/v7), before it (v4/v5) |
| 2. Guidance index on page 1 for ordinary records | **On page 1 in every schema 7 case with an index (P1, P2, P5, P6, P7, P12, P13)**; it now starts directly after the section 2 introduction. Not forced for the schema 8 records with document readings (P3, P4, P10, P11): their "About" section carries the reading paragraph and leaves 77–130 pt against the ~130 pt the heading and first index row need, so the index starts at the top of page 2 |
| 3. Avoidable whitespace | Reviewed; see §5. Page totals 80 → 79 (P5 6 → 5, P13 8 → 7, P3 7 → 8). No pagination logic added |
| 4. Glyph-character regression, sequential and concurrent | Added, and it found the R1 correction incomplete; fixed (§3). 10 sequential and 10 concurrent renders in one process keep exact Unicode text; the uncorrected control fails as it must |
| 5. Repeat all checks | All repeated and passing (§8) |
| 6. Final package | `C:\Users\User\SI8-review\cr-design-2b-r2-2026-11-16\` and its ZIP |

## 3. Glyph-character correction, completed in R2

Details are in `R1-ROOT-CAUSES.md` §7. In short, the process-wide glyph cache had two more effects:

- **Shared glyphs.** A font may draw several characters with one glyph (Inter: ’ and ʼ, Δ and ∆, Ω and Ω; Noto: 443 groups). The first character laid out in the process was written into every later PDF's text layer.
- **Shared fallback object.** The presentation's fallback shared the legacy renderer's font object.

Fixes:
- Each document now assigns its own characters to the glyphs it prints.
- Presentation renders are serialised.
- The presentation has its own fallback family.

**Remaining limit, inside one document only.** Two characters that share a glyph cannot both be named in the PDF's text layer. The more frequent one is kept (approved wording keeps its ’), the other is reported, and the drawing is unaffected.

**Out of scope.** A pre-existing follow-up for the legacy Production renderer's Noto fallback is recorded, not changed.

## 4. Review PDFs (generated by the real renderer)

**Location:** `C:\Users\User\SI8-review\cr-design-2b-r2-2026-11-16\`

| Item | Contents |
|---|---|
| `pdf/` | 13 PDFs, each with `.texts.json` and `.expect.json` |
| `png/` | Colour and greyscale, 110 dpi |
| `current-v4-v5-for-comparison/` | The same records under today's v4/v5 sets |
| `report.json`, `acceptance-checks.json` | Byte-check and acceptance results |
| `negative/` | Negative controls |
| `glyph-isolation/` and `glyph-isolation.json` | Sequential, concurrent and control renders with their byte checks |
| Documentation | README, root causes and this report |

Earlier 2B and R1 folders are superseded.

| Case | Content | Schema | Pages (R1 → R2) | Index starts on |
|---|---|---|---|---|
| P1 | No documents, Runway guidance | 7 | 5 → 5 | page 1 |
| P2 | Documents inventoried, not examined | 7 | 5 → 5 | page 1 |
| P3 | One reading and one document not read | 8 | 7 → 8 | page 2 |
| P4 | Reading with plan-name qualifier, AI-addressed text, creator response | 8 | 8 → 8 | page 2 |
| P5 | Runway + Higgsfield; shared caveats | 7 | 6 → 5 | page 1 (second row on page 2) |
| P6 | Unresolved applicability | 7 | 5 → 5 | page 1 |
| P7 | Uncovered source (Artlist) | 7 | 5 → 5 | page 1 |
| P8 | Unidentified provider (no index) | 7 | 4 → 4 | — |
| P9 | Zero selected guidance (no index) | 7 | 4 → 4 | — |
| P10 | Four documents | 8 | 10 → 10 | page 2 |
| P11 | Long title, long file name, digests | 8 | 8 → 8 | page 2 |
| P12 | Traditional Chinese, Japanese, Korean, Vietnamese title | 7 | 5 → 5 | page 1 |
| P13 | Topic-qualified subject, unspecified conditions | 7 | 8 → 7 | page 1 |

**Every case:**
- exact print; complete footer and stamp, and correct page labels, on every page;
- no orphan headings and no oversized views;
- same blocks as v4/v5;
- PDF-bytes check passed (disclosures, numbering, bounds, overlap, obscured text, reserved bands, in-order text, search).

**Approved v4/v5 output is unchanged.** I re-rendered all 13 and compared every page's raster and text with the R1 comparison PDFs:
- 9 are identical;
- 4 differ only on the "Answers fingerprint" line, a value the synthetic fixture regenerates on each build.

## 5. Whitespace review

- **Improved by the panel move:**
  - P5 and P13 each lose a page;
  - page 1 now ends with the guidance index instead of a part-empty page.
- **P3 gains a page.** Its index cannot fit on page 1 either way, and with the panel now following the index on page 2, section 5 no longer fits before the reading register. That register must start its own page, so section 5 sits alone on page 4. Keeping the panel above the index only when the index misses page 1 would be pagination-dependent logic, which R2 excludes.
- **Declaration spillover pages before the reading register** (P3 and P4 page 4: section 5 alone) follow from preserving the separate reading register. The previous page ends with 14–38 pt free, and section 5 needs about 170 pt. No straightforward change removes them without compressing type or adding pagination logic.
- **Final pages** (for example P1 page 5, the end of "How this record was made") are the record's natural end.
- **Split cards** still end at the page foot (@react-pdf split behaviour), as reported in R1.

## 6. Limitations of automated visual verification

- **Geometry, not quality.** Text checks see text lines and glyph boxes, not visual quality. Lines that only touch are tolerated, and a partly covered glyph is caught only if its centre is covered.
- **Reserved bands only.** The raster check covers the reserved header and footer bands. It cannot judge balance, whitespace or hierarchy.
- **Search scope.** Search probes are words with non-ASCII characters and CJK pairs. Pure-ASCII words are covered by the in-order text check.
- **One reader, no tagging.** The checks use one reader (MuPDF). Other viewers and screen readers were not tested, and the PDF is not tagged (PDF/UA out of scope).
- **Isolation coverage.** The isolation regression covers the shared-glyph pairs chosen for it and the composite hazard. It shows the mechanism is controlled; it cannot enumerate every character pair a creator might type.

## 7. Physical print checks requiring operator action

Print on A4, and on US Letter with "fit to page":
1. **Footer and stamp.** They print legibly (7.4–7.5 pt) and are not cut off by the printer's margin. The footer sits 20 pt (about 7 mm) from the page edge.
2. **Navy index.** It prints solid without banding, and its light text stays readable, including the index now on page 1.
3. **Light backgrounds.** The cool reading-register ground and the warm paper ground print as intended or drop out cleanly.
4. **Greyscale printing.** The accents, open-matter boxes and caveat panels stay distinguishable.
5. **CJK and Vietnamese title (P12).** It prints with all marks.

## 8. Build and test results

| Check | Result |
|---|---|
| `__tests__/creator-record/cr-design-2b.test.ts` | all passing |
| R2 additions to that file | panel-after-index placement; glyph isolation: sequential, concurrent, uncorrected control, within-document conflict report |
| PDF-related suites (`cr-design-2b`, `customer-pdf`, `customer-pdf-schema8`, `readiness-summary`) | 165 tests passing |
| Full suite | **24 failing suites / 89 failing tests**, the same failing set as the recorded baseline (compared test by test; no new failures); 9,796 passing |
| `tsc --noEmit` | clean |
| `scripts/customer-wording-check.js` | exit 0 |
| `next build` | **exit 0** (inert placeholder environment values, as before) |
| Font packaging and tracing | all 9 font files are traced and present for each of the four issuing routes |
| Byte-level checks (13 cases) | passing |
| Negative controls (intrusion, wrong page count, wrong stamp, missing text) | all rejected by the verifier |
| Configuration consumption | all 182 configuration leaves read |
| Refusals | the font-hash and `text_unsupported` refusals still refuse |

## 9. Acceptance-criteria reconciliation (decided in R2)

- **P3.** P1 and P3 together satisfy the revised P3 criterion: a schema 8 record without documents cannot exist.
- **P10.** P10 represents the customer-path behaviour for unsuccessful readings: shown as "Not examined". The replay-only failure-label path and its protections are unchanged.
