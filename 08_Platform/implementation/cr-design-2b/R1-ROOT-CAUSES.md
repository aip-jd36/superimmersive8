# CR-DESIGN-2B-R1 — Root causes of the acceptance discrepancies

**Status: LOCAL AND INERT — NOT RELEASED, NOT APPROVED.** Branch `work/cr-design-2b` (local only). Production is unchanged: v4/v5 approved, generator `creator-record-v2-pdf-v3`, nothing deployed.

The PM/Architecture review of the CR-DESIGN-2B package found defects that the 2B report and tests said were absent. Each finding below was reproduced from the PDF bytes before it was corrected. All fixtures are synthetic.

## 1. Why the 2B tests passed while the PDFs were defective

The 2B checks did not read the PDF. `render-review.tsx` ran a **second, separate `@react-pdf/layout` pass** over the same model and inspected the laid-out node tree:

- It accepted a chrome string as "present on every page" if a `fixed` text node with that string existed in the tree for each page. **It never checked the node's position.** The footer node existed on every page but sat about 213,000 pt below the page, so it was never drawn.
- It checked "Page N of M" the same way: the dynamic label node existed in the tree but was not on the page.
- It compared the body text with the model's text in order. Overlapping and squeezed nodes still contained the right strings, so P11 passed.
- The text-layer (copy and search) check ran on the bytes, but outside the test suite. It also had its own false positive (§4).

In short, the tests checked the document model and a layout tree, not the bytes, and the bytes were defective. **R1 moves every decisive check onto the PDF bytes** (§6).

## 2. Missing running footer and page numbers (all 80 pages)

**Cause.** The running stamp and the dynamic "Page N of M" text shared one `fixed`, absolutely positioned **flex row**, and the page label had a line height. @react-pdf/layout 4.4.2 measures a render-prop text before its content exists. In that row, both texts were measured at about **213,468 pt** tall, so the row's top was placed at about −212,651 pt (off the page). The legacy renderer had already avoided the same behaviour; the comment in `CustomerRecordPDF.tsx` notes it.

**Fix.**
- The stamp is its own fixed view.
- The page label is its own fixed `Text`, absolutely positioned, with no line height. The configuration's `type.page_label.line_height` is removed.

**Verified.** All 80 pages carry the complete footer, the complete stamp and the correct page label, extracted from the bytes, inside the reserved footer band.

## 3. P11 page 1 overlap and the P5 index break (content in the reserved footer band)

**Cause.** `splitNodes` in @react-pdf/layout 4.4.2 handles a breakable box whose first child cannot fit and cannot split by **keeping the whole box on the current page** whenever nothing precedes it **at its own nesting level**. The rule is meant for the top of an empty page, but it is applied at every nesting level. The box is then squeezed into the remaining height:

- its children draw over one another (P11: the considerations heading, "What you told us" and the index rows on top of each other);
- or they draw into the footer band (P1, P2, P5, P7: the index or the provider group running about 10–17 pt past the content area).

A related effect: a padded box whose first child moves on leaves its empty top (padding and background) behind. This produced the empty navy strip at the foot of P5 page 1.

**Fix (presentation renderer only; v1–v5 are drawn exactly as before).**
1. Every presentation box is drawn inside a plain wrapper whose first child is a zero-height view (`Guarded` in `ReadingLayoutView.tsx`). Something therefore always precedes the box at its level, so the library moves the box to the next page whole instead of squeezing it. The wrapper has no padding, border or background, so nothing of it shows. Boxes inside a row (index row, question-and-answer row, consideration head) are not wrapped, so their flex widths are unchanged.
2. Every card starts with an unbreakable unit, so it either starts with content or moves whole:
   - consideration: already did;
   - document: heading plus first row (new);
   - index: a flat run of unbreakable units, a subject heading with its first row and then each further row, so a page break falls only between rows (new).
3. The heading run that introduces the index keeps 80 pt below it (`layout.index_lead_presence`), the measured height of the index's first unit. Otherwise it moves with the index.

**Verified on the bytes.** No text outside the content region and no overlapping text lines in any of the 13 cases. No text is covered by a later-drawn shape, and the reserved bands hold only the page ground.

## 4. Curly-apostrophe text-layer defect

**Cause.** fontkit keeps **one glyph object per glyph id for the life of the process**. When a PDF is written, the TrueType subset decodes composite glyphs and creates their **component** glyphs with no character attached. Inter's ” and ‚, for example, are built from ’.

When a later text in the same process prints ’, it receives that cached glyph. Its character list is empty, so @react-pdf/pdfkit writes an empty ToUnicode entry, and copy, search and screen readers get `�` or a wrong character. For example, the Inter Medium ’ glyph mapped to nothing, and "didn’t" extracted as "didn9t". Which words were affected depended on what the process had rendered before, which is how a server behaves.

**Fix.** `primeGlyphCharacters` in `InstitutionalTrustPDF.tsx` runs before layout. For every character the document prints, it looks up the glyph in every registered face (each weight and the fallback). A glyph left without its character is given that character. The drawing does not change (same glyph, same font, same text); only the text layer is corrected. **No approved wording or declaration is altered; curly apostrophes stay curly.**

**Correction to the 2B report.** The 2B report said today's v4/v5 output had the same defect for 2 of 13 records. **That was wrong.** Both "failures" were a paragraph that continues onto the next page, read with the footer and header in between. The R1 check reads the body text with the chrome removed and finds every v4/v5 string, including every word with ’.

The legacy renderer draws Latin text in Helvetica (a standard PDF font, not subset through fontkit) and its fallback is a CFF font, which has no composite glyphs. It is therefore not exposed to this mechanism. Production v4/v5 is unchanged by R1.

## 5. What the corrected tests could still miss

See §7 of the implementation report (limitations of automated visual verification).

## 6. Verification now on the bytes

- `test-support/cr-design-2b/verify_pdf_bytes.py` uses PyMuPDF (MuPDF), as a reader would. Per page it checks:
  - complete header and stamp extractable;
  - correct page label in the footer band, with no other page number;
  - every glyph inside the content region and on the page;
  - no overlapping text lines;
  - no text covered by a later-drawn filled shape;
  - rasterised at 2×, the bands between the running header and the content, and between the content and the footer, hold only the page ground.
- Per document it checks that every printed string is extractable in print order and that every word containing a non-ASCII character (’, accents, CJK pairs) is found by PDF search.
- **Negative controls** in `render-checks.tsx` must fail, and do:
  - a deliberately squeezed layout (content allowed into both bands);
  - a wrong page count;
  - a wrong stamp;
  - a sentence the record does not contain.
- The reserved bands come from the configuration, never from the layout pass.

## 7. R2 addendum: the R1 apostrophe correction was incomplete (found and fixed in R2)

While adding the requested regression coverage across sequential and concurrent rendering, R2 found two remaining text-layer hazards in the R1 correction. Both come from the same process-wide glyph cache.

1. **Shared glyphs.** A font may draw several characters with one glyph. In Inter, ’ U+2019 and ʼ U+02BC are one glyph, as are Δ/∆ and Ω/Ω. Noto Sans CJK has 443 such groups, for example space and no-break space, or 〈 U+3008 and 〈 U+2329. The first character ever laid out with that glyph in the process was written into every later PDF's text layer. R1 repaired only glyphs with no character, so one record could still set another record's text layer (for example a ∆ that extracts as Δ). R2 reproduces this in a control: drawn without the correction straight after record A, record B's ∆ title extracts as A's characters.
2. **Shared fallback object.** The presentation registered its fallback under the legacy renderer's family name. The library resolves weight 400 to the first registered source, so both renderers shared one Noto font object, while bold fallback text used a second object that R1 never primed.

**Fix.**
- **Per-document mapping.** Before layout, each printed character's glyph in every presentation face is given that character, overwriting whatever another document left (not only filling empty entries).
- **One render at a time.** Presentation renders are serialised in the process (`withPresentationFonts`), so nothing can change the glyphs between one document's priming and its writing.
- **Own fallback family.** The presentation has its own fallback family (`SI8 Presentation Fallback`) and shares no font object with the legacy renderer. Legacy v4/v5 output is unchanged (re-rendered and compared).

**Remaining limit (inside one document).** When one document prints two characters that share a glyph in the same face, the PDF can name only one character for that glyph (one ToUnicode entry per glyph). The character printed most often is kept, so approved wording keeps its ’ when a declaration contains ʼ. The other is reported (`conflicts`), and the drawing is unaffected. Removing this limit would need per-span ActualText, which is outside the current rendering stack.

**Regression.** `test-support/cr-design-2b/glyph-isolation.tsx`:
- 10 sequential and 10 concurrent renders of synthetic records built to share glyphs, each checked from its bytes for exact Unicode text;
- the uncorrected control, which must fail;
- the within-document conflict report.

**Follow-up outside this scope (Production, pre-existing, not changed).** The legacy v4/v5 renderer prints Latin text in Helvetica, a standard font that does not go through fontkit. Characters Helvetica lacks are printed from the Noto fallback, which is exposed to the same shared-glyph behaviour, for example U+2003 em space and U+3000 ideographic space. It is rare, but it is real. Correcting it would change the Production renderer, so it is recorded here, not fixed.
