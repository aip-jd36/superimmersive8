/**
 * CR-DESIGN-2B — the Institutional Trust presentation configuration (contract `si8/creator-record-pdf-presentation` v1).
 *
 * DATA ONLY. A template set selects it with `presentation: { contract, version, fingerprint }`; the fingerprint is the SHA-256 of
 * this object's canonical JSON, so it binds into the template set's own fingerprint. The renderer (`../InstitutionalTrustPDF`)
 * reads every value here, at render time, from the object it is given (a test proves that no leaf is ignored), and refuses a
 * template whose reference does not match.
 *
 * What the fingerprint establishes: WHICH configuration and WHICH declared renderer implementation a template set selected. It does
 * NOT prove the rendered layout: layout is computed by the renderer code and `@react-pdf`, identified by the generator version and the
 * deployed commit; the output of one render is identified by the issued PDF's own SHA-256.
 *
 * Wording is never here: every printed string comes from the template set or the record. Colours and type follow the CR-DESIGN-1
 * Round 2 tokens (paper ground, ink, institutional navy, gold editorial accent, cool clinical reading register).
 */
import { canonicalJson, sha256Hex } from '../../record-core/canonical'

export const PRESENTATION_CONTRACT_ID = 'si8/creator-record-pdf-presentation' as const

export const INSTITUTIONAL_TRUST_PRESENTATION = {
  contract: PRESENTATION_CONTRACT_ID,
  version: 1,
  renderer: { id: 'si8/creator-record-v2-pdf-presentation', implementation: 'institutional-trust', version: 1 },
  page: { size: 'A4', language: 'en', padding_top: 66, padding_bottom: 62, padding_x: 50, masthead_top: 24, footer_bottom: 20, page_label_width: 70 },
  fonts: {
    display: {
      family: 'SI8 Fraunces',
      files: [
        { weight: 400, file: 'Fraunces-400.ttf', sha256: '0b3d42e2d14402bf4e6c82279ec574ab8dd10258d19954f62c83b63fc104d1e5' },
        { weight: 500, file: 'Fraunces-500.ttf', sha256: '1ba7467be956072d05e4bcedce0ce6699d31a4b2f2bb0c0c9810656ea072236f' },
        { weight: 600, file: 'Fraunces-600.ttf', sha256: '5155cd22252d428986d2bef321d3f43fd9bcadf8dd7cb331a24ab5649b358583' },
      ],
    },
    body: {
      family: 'SI8 Inter',
      files: [
        { weight: 400, file: 'Inter-400.ttf', sha256: 'abfcc06b3303896ae13712cbd6fa15771ddcfe1b8b114e25e62b2f8209ac7f5b' },
        { weight: 500, file: 'Inter-500.ttf', sha256: '5b796062cdb3fe8e69a8ad9d27687e168436df2c2ccc21c054d2d11e7eb81f80' },
        { weight: 600, file: 'Inter-600.ttf', sha256: '2d7ceb708b63e14e641bd226a5818a6d5526a82325e057a62fbbd02463fc124d' },
      ],
    },
    mono: {
      family: 'SI8 IBM Plex Mono',
      files: [
        { weight: 400, file: 'IBMPlexMono-400.ttf', sha256: '6a3412f058c7d8dfd9170c41e85ade48e5156ecb89356110ca57a0a27734af46' },
        { weight: 500, file: 'IBMPlexMono-500.ttf', sha256: 'a9b4c49bb299e05b5f6c481e7fb5e78943d2793249a0c8874ab574a2d1ea6755' },
      ],
    },
    /** Every family stack ends with this font: characters the design faces lack (CJK, kana, Hangul, …) print from it. */
    fallback: { family: 'SI8 Customer Record Fallback', file: 'NotoSansCJKtc-Regular.otf', sha256: 'dce08bd4fd91aa8aa76ed8fea4b694c2dfb8550f67871e326843212ddbeb88b4' },
  },
  colors: {
    paper: '#F7F5EF', paper_raised: '#FDFCF9', ink: '#1C1C1E', ink_strong: '#182C48', ink_secondary: '#3c434e', ink_muted: '#565f6b', ink_fine: '#5f6670',
    hairline: '#d8d3c6', hairline_soft: '#ece6d8', navy: '#233F66', navy_on: '#FDFCF9', navy_line: '#3a567c', navy_tint: '#E9EDF3', navy_tint_border: '#c4d0df',
    gold: '#8a6a2a', gold_note_bg: '#f1e9d8', gold_note_border: '#c69a4a', gold_note_ink: '#6a4a1c',
    cool_ground: '#eceff3', cool_surface: '#f5f7f9', cool_hairline: '#c3ccd6', slate: '#5a6b7d', slate_ink: '#2b333d', slate_secondary: '#44505c', slate_fine: '#5a6672',
  },
  /** Sizes in PDF points. `weight` names a registered file weight. */
  type: {
    hero: { family: 'display', size: 25, weight: 500, line_height: 1.18 },
    hero_label: { family: 'body', size: 8.4, weight: 500, line_height: 1.4 },
    title: { family: 'display', size: 15, weight: 500, line_height: 1.25 },
    h1: { family: 'display', size: 17, weight: 500, line_height: 1.22 },
    h2: { family: 'display', size: 12.2, weight: 500, line_height: 1.28 },
    band: { family: 'body', size: 8.6, weight: 600, line_height: 1.3, letter_spacing: 1.1 },
    topic: { family: 'display', size: 13.2, weight: 500, line_height: 1.25 },
    reference: { family: 'mono', size: 8.4, weight: 500, line_height: 1.3 },
    lead: { family: 'body', size: 10.2, weight: 400, line_height: 1.5 },
    explanation: { family: 'display', size: 11.4, weight: 400, line_height: 1.5 },
    body: { family: 'body', size: 9.6, weight: 400, line_height: 1.5 },
    strong: { family: 'body', size: 9.6, weight: 600, line_height: 1.45 },
    label: { family: 'body', size: 8.6, weight: 400, line_height: 1.4 },
    value: { family: 'body', size: 9.6, weight: 500, line_height: 1.4 },
    eyebrow: { family: 'body', size: 7.6, weight: 600, line_height: 1.3, letter_spacing: 0.9 },
    fine: { family: 'body', size: 8.5, weight: 400, line_height: 1.45 },
    mono_value: { family: 'mono', size: 9.4, weight: 500, line_height: 1.4 },
    digest: { family: 'mono', size: 7.2, weight: 400, line_height: 1.4 },
    running_header: { family: 'body', size: 7.4, weight: 500, line_height: 1.3, letter_spacing: 0.3 },
    running_stamp: { family: 'body', size: 7.5, weight: 500, line_height: 1.35, letter_spacing: 0.2 },
    /** No line height: a render-prop text with one is mis-measured by @react-pdf and leaves the page. */
    page_label: { family: 'mono', size: 7.4, weight: 400 },
    first_page_stamp: { family: 'body', size: 9, weight: 600, line_height: 1.45, letter_spacing: 0.4 },
  },
  chrome: {
    /** Approved template strings only. `footer` and `stamp` are the template set's own `footer` and `stamp`, printed in full. */
    running_header: 'footer',
    running_footer: 'stamp',
    first_page_disclosure: 'stamp',
    rule_width: 0.9,
  },
  registers: {
    /** Sections printed on the cool reading-register pages (each starts a new page; the warm register resumes after them). */
    reading_sections: ['documents'],
  },
  layout: {
    /** CR-DESIGN-2A contract C5: the shared caveat panel sits at the end of the provider group it applies to. */
    caveat_placement: 'group_end',
    /** A consideration at most this long (characters) is kept whole on one page; a longer one breaks between its parts. */
    consideration_keep_chars: 650,
    /** C4: a consideration's open matters never start a page apart from the end of its guidance. */
    keep_open_with_body: true,
    section_gap: 14,
    block_gap: 8,
    card_padding: 10,
    rule_accent_width: 2.5,
    radius: 2,
    /** Label column width of a two-column row (points); a reading's sub-rows indent their label by `sub_indent` within it. */
    label_width: 175,
    sub_indent: 24,
    /** Room (points) kept below the heading run that introduces the guidance index, for the index's first row; else both move on. */
    index_lead_presence: 80,
    /** Gap between the compact counts. */
    count_gap: 14,
    /** CR-DESIGN-2B-R1 adaptive hero: from `min_width` (characters; CJK counted twice) the declared title uses `size` (points). */
    hero_steps: [
      { min_width: 64, size: 21 },
      { min_width: 120, size: 17.5 },
    ],
  },
} as const

export type PresentationConfig = typeof INSTITUTIONAL_TRUST_PRESENTATION

/** The fingerprint a template set's `presentation.fingerprint` must equal. */
export const presentationFingerprint = (config: unknown): string => sha256Hex(canonicalJson(config))

/** Registered presentation configurations, by contract and version. Adding one is a reviewed code change. */
export const PRESENTATIONS: ReadonlyMap<string, PresentationConfig> = new Map([[`${PRESENTATION_CONTRACT_ID}@1`, INSTITUTIONAL_TRUST_PRESENTATION]])

export function presentationFor(ref: { contract: string; version: number }): PresentationConfig | null {
  return PRESENTATIONS.get(`${ref.contract}@${ref.version}`) ?? null
}
