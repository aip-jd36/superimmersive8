/**
 * CR-V2-PDF-7B — what the customer PDF may print, and where a line may break. Pure.
 *
 * A declaration must print exactly as recorded, or not at all:
 *   - `lineBreakOpportunities` lets a long token or CJK text wrap without changing a character. The library breaks a line at a
 *     zero-width glue node without adding anything, and treats an empty syllable as one. Any other split inserts a visible hyphen,
 *     which would alter an identifier or a URL. Without a break opportunity the library drops whatever does not fit.
 *   - `unsupportedCharacters` names what the fonts cannot print, so rendering refuses rather than printing a wrong or empty glyph.
 */

/** A token longer than this may break anywhere. At this length even the widest letters fit the narrowest PDF column. */
const LONG_TOKEN = 16
/** Printed unbroken: the layout gives a digest its own line. */
const DIGEST = /^[0-9a-f]{64}$/
/** Scripts written without spaces between words. Hangul is included: its words are often longer than a line allows. */
const NO_SPACES = /[⺀-鿿가-힯豈-﫿＀-￯]/

const segmenter = new Intl.Segmenter('en', { granularity: 'grapheme' })

export function lineBreakOpportunities(word: string): string[] {
  if (DIGEST.test(word) || (word.length <= LONG_TOKEN && !NO_SPACES.test(word))) return [word]
  const parts = Array.from(segmenter.segment(word), (s) => s.segment)
  return parts.flatMap((part, i) => (i < parts.length - 1 ? [part, ''] : [part]))
}

/** Canonically the same text, in the composed form the fonts hold: a base letter and its mark would otherwise come from different fonts. */
export const pdfText = (text: string): string => text.normalize('NFC')

const LAYOUT_CONTROLS: ReadonlySet<number> = new Set([0x09, 0x0a, 0x0d])
const COMBINING_MARK = /\p{M}/u

/** Each character of this text the PDF cannot print faithfully, as `U+XXXX` only (never the text itself), sorted. */
export function unsupportedCharacters(text: string, hasGlyph: (codePoint: number) => boolean): string[] {
  const out = new Set<string>()
  for (const ch of pdfText(text)) {
    const cp = ch.codePointAt(0) as number
    if (LAYOUT_CONTROLS.has(cp)) continue
    // The library picks a font one UTF-16 unit at a time, so anything outside the Basic Multilingual Plane cannot be laid out.
    // A mark left after composition has no precomposed form, so it could not be drawn on its base letter.
    if (cp > 0xffff || COMBINING_MARK.test(ch) || !hasGlyph(cp)) out.add(`U+${cp.toString(16).toUpperCase().padStart(4, '0')}`)
  }
  return Array.from(out).sort()
}
