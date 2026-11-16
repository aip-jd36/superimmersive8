# CR-DESIGN-2C — Founder approval record (Institutional Trust customer PDF)

**Status: PREPARED FOR THE FOUNDER — NOT YET DECIDED.**

- Every decision field below is blank until the founder completes it. Nothing here is an approval until then.
- Approving this record does **not** authorise release. Release (CR-DESIGN-2D) needs its own explicit founder authorisation, with the values in §6.
- These are founder decisions, not counsel opinions or legal-compliance findings.

**Evidence:**
- `01-ACCEPTANCE-RECORD.md`;
- `C:\Users\User\SI8-review\CR-DESIGN-2B-R2-Final-Review-Package.zip`, SHA-256 `547fb2e4b37df5ff1d575cac622262a777ce284493bc727dbaf9edb13ba10487`;
- implementation commit `eba9f52d`, plus the 2C commit that carries these records.

## F-2C-1. Final template sets and presentation contract

| Item | Version | SHA-256 |
|---|---|---|
| Template set, schema 7 (replaces v4 for new issuances) | v6 | `a0cd0c248ce270d2826712910aa606579ce429f7923b051d68a0502c5305f476` |
| Template set, schema 8 (replaces v5 for new issuances) | v7 | `5d7ccfc8ce824e57f6e904d51f1027b59e43ab250a7f4895b0f804debe1761ab` |
| Presentation contract `si8/creator-record-pdf-presentation` | v1 | `aa50507b4f76e8168744d88645220735e8b7820577e7be72e19c83dbedc017db` |

**Content.**
- **v6 and v7** are the approved v4 and v5 sets verbatim, plus three fields: `version`, `navigation` (F-2C-2) and `presentation` (the reference to the contract above).
- **The presentation contract** carries layout, typography, colours, hash-pinned fonts and placement rules only. It carries no wording.
- **Approved fonts** (OFL 1.1, files and licences in `customer-pdf/fonts/`): Fraunces 400/500/600, Inter 400/500/600, IBM Plex Mono 400/500, and the Noto Sans CJK TC fallback.

**Placement rules carried by the presentation, all previously decided:**
- C5: each caveat panel at the end of its provider group (FD-5);
- the declared-title copy on page 1 (FD-4);
- the stamp repeated prominently on page 1 (FD-3);
- the reading-register pages for section 6;
- compact counts;
- the "What you told us" panel after the guidance index (R2).

Decision: ☐ Approve ☐ Do not approve  Founder: ________  Date: ________

## F-2C-2. Approved navigational additions (the only new strings)

| Path | String | Earlier decision |
|---|---|---|
| `navigation.contents_heading` | `What this record contains` | C-1, FD-6 |
| `navigation.caveats_pointer` | `See 'Please note' below.` | C-3, FD-6, printed only where the panel below applies |

Both are navigational, not substantive. Navigation copies, printed and recorded as copies, not new content:
- the declared title on page 1;
- its question;
- the pointer.

Decision: ☐ Approve ☐ Do not approve  Founder: ________  Date: ________

## F-2C-3. Known limitation accepted for release

**Within-document shared glyph.** A font can draw two characters with one glyph; for example, in Inter, ʼ U+02BC and ’ U+2019. When one record prints both, the PDF's text layer (copy, search, screen readers) can name only one of them for that glyph.
- The renderer keeps the character the document uses most, so approved wording keeps its ’.
- It reports the clash.
- The printed page is always correct.

Across records, sequentially or concurrently, the text layer is isolated (R2 regression, `01-ACCEPTANCE-RECORD.md` §4).

Decision: ☐ Accept ☐ Do not accept  Founder: ________  Date: ________

## F-2C-4. Deferred items (recorded, not blocking)

1. **Legacy v4/v5 rare-character text layer.** The Production renderer's Noto fallback has the same shared-glyph behaviour for rare characters. Deferred maintenance.
2. **"(continued)" headers.** Long cards that split are drawn to the page foot.
3. **Declaration spillover pages** before the reading register (accepted by PM/Architecture).
4. **Tagged PDF (PDF/UA)**, and viewers other than MuPDF.
5. **Wording maintenance items (FD-11)**, as previously deferred.

Decision: ☐ Accept as deferred ☐ Do not accept  Founder: ________  Date: ________

## F-2C-5. Bounded render queue (2C engineering change)

Redesigned PDFs render one at a time per server process (text-layer isolation).
- A failed render releases the next one at once.
- A render that has not finished after 30 seconds releases the next one, so issuance can never be blocked for good. Its PDF is never used: the render cannot be stopped, but if it finishes late its result is discarded as an error (`render_queue_hold_expired`).
- Nothing is stored, issued, emailed or delivered from a late render. The order stays pending and is retried as usual (sweep or admin reconcile), producing exactly one PDF. No payment is affected.
- Tested with real PDF rendering: a late render running alongside the next one does not change the next PDF's text.

*Corrected in CR-DESIGN-2C. The first version of this item did not say that a late render's PDF could still have been issued; that path is now closed.*

Measured cost: about 0.2–0.4 s per PDF locally; 13 simultaneous requests complete in about 3 s.

Decision: ☐ Accept ☐ Do not accept  Founder: ________  Date: ________

## F-2C-6. Acceptance coverage (already accepted by PM/Architecture in R2 and 2C; founder confirmation)

- **P3.** P1 and P3 together satisfy the revised P3 criterion: a schema 8 record without documents cannot exist.
- **P10.** P10 represents the customer-path behaviour for unsuccessful readings: shown as "Not examined". The replay-only failure label keeps its protections.

Decision: ☐ Confirm ☐ Do not confirm  Founder: ________  Date: ________

## F-2C-7. Physical print verification — PENDING OPERATOR ACTION

Print P1, P4, P5, P12 and P13 on A4, and on US Letter with "fit to page", then check each item below.

| # | Check | Pass |
|---|---|---|
| 1 | The footer and stamp (7.4–7.5 pt, 20 pt / about 7 mm from the page edge) are complete and legible on every page; not cut off | ☐ |
| 2 | The page number "Page N of M" is legible on every page | ☐ |
| 3 | The navy guidance index (page 1) prints solid without banding; its light text is readable | ☐ |
| 4 | The light backgrounds (warm paper, cool reading register) print as intended or drop out cleanly; text stays readable | ☐ |
| 5 | Greyscale printing: the accents, open-matter boxes and caveat panels stay distinguishable | ☐ |
| 6 | P12: the CJK and Vietnamese title prints with all marks | ☐ |

Printer / paper: ________  Operator: ________  Date: ________  Founder confirms: ☐  Date: ________

## Not decided here

The following belong to the CR-DESIGN-2D release authorisation (`03-CR-DESIGN-2D-RELEASE-PLAN.md`):
- template registration and the generator change to `creator-record-v2-pdf-v4`;
- deployment and Production UAT.
