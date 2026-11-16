/**
 * CR-DESIGN-2B — the Institutional Trust presentation of the customer PDF. Drawn only for a model whose template set selects it
 * (`model.design`); v1–v5 models are drawn by `CustomerRecordPDF`, unchanged.
 *
 * Mechanical, like the original: it prints each block of the model exactly once, in the model's order, through the same placement
 * tree (`./ReadingLayoutView`). The only text it adds is chrome taken whole from the template set (the running `footer` and
 * `stamp`, and the stamp again, prominently, on page 1 — founder FD-3), the page label and bullet marks.
 *
 * Every style, font, page and register setting comes from the presentation configuration it is given
 * (`./presentation/institutional-trust`), read at render time; nothing is hard-coded here. Fonts are verified against the
 * configuration's SHA-256 before they are registered.
 */
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import React from 'react'
import { Document, Font, Page, StyleSheet, Text, View, type TextProps } from '@react-pdf/renderer'
import type { CustomerDocumentModel, CustomerDocumentSection } from './document-model'
import type { PresentationConfig } from './presentation/institutional-trust'
import { ReadingSection, type ReadingOptions, type ReadingStyles } from './ReadingLayoutView'
import { lineBreakOpportunities, pdfText } from './text-layout'

const FONT_DIR = path.join(process.cwd(), 'lib', 'creator-record', 'customer-pdf', 'fonts')
const VERIFIED = new Set<string>()

export class PresentationRefusal extends Error {
  constructor(readonly code: string) {
    super(`creator_record_presentation_refused: ${code}`)
  }
}

function verifiedSrc(file: string, sha256: string): string {
  const src = path.join(FONT_DIR, file)
  const key = `${file}:${sha256}`
  if (!VERIFIED.has(key)) {
    const actual = createHash('sha256').update(readFileSync(src)).digest('hex')
    if (actual !== sha256) throw new PresentationRefusal(`font_fingerprint_mismatch:${file}`)
    VERIFIED.add(key)
  }
  return src
}

/** Registers the configuration's fonts, each verified against its pinned SHA-256 first. */
const REGISTERED = new Set<string>()
export function registerPresentationFonts(cfg: PresentationConfig): void {
  // Every file is verified on every call; a family is registered with the library once per process (re-registering creates a new
  // font source, and text laid out with one source must be embedded with the same one).
  // The key is everything registration uses (family, weight, verified file), so a changed configuration is never served a stale font.
  const files = [...(['display', 'body', 'mono'] as const).flatMap((r) => cfg.fonts[r].files.map((x) => `${cfg.fonts[r].family}:${x.weight}:${verifiedSrc(x.file, x.sha256)}`)), `${cfg.fonts.fallback.family}:${verifiedSrc(cfg.fonts.fallback.file, cfg.fonts.fallback.sha256)}`]
  const key = files.join('|')
  if (REGISTERED.has(key)) return
  REGISTERED.add(key)
  for (const role of ['display', 'body', 'mono'] as const) {
    const f = cfg.fonts[role]
    Font.register({ family: f.family, fonts: f.files.map((x) => ({ src: verifiedSrc(x.file, x.sha256), fontWeight: x.weight })) })
  }
  Font.register({ family: cfg.fonts.fallback.family, src: verifiedSrc(cfg.fonts.fallback.file, cfg.fonts.fallback.sha256) })
}

interface LoadedGlyph { id: number; codePoints: number[] }
interface LoadedFont { hasGlyphForCodePoint(cp: number): boolean; glyphForCodePoint(cp: number): LoadedGlyph }

/**
 * CR-DESIGN-2B-R1 (text layer): makes sure every glyph this document prints carries the character it prints.
 *
 * fontkit keeps ONE glyph object per glyph id for the life of the process. When a PDF is written, the TrueType subset decodes
 * composite glyphs and creates their component glyphs with no character (Inter's ” and ‚ are built from ’). A later text that
 * prints ’ then receives that cached glyph, so @react-pdf/pdfkit writes an empty ToUnicode entry for it and the word cannot be
 * found, copied or read aloud correctly (the "curly-apostrophe" defect; it depended on what the process had rendered before).
 * Before layout, each printed character's glyph in every registered face is looked up; a glyph left without its character is
 * given it. Nothing about the drawing changes: same glyph, same font, same text; only the text layer is corrected.
 * Returns the number of glyphs repaired (for tests).
 */
export async function primeGlyphCharacters(cfg: PresentationConfig, texts: readonly string[]): Promise<number> {
  const codePoints = [...new Set(texts.flatMap((t) => [...pdfText(t)].map((ch) => ch.codePointAt(0) as number)))]
  const faces = [
    ...(['display', 'body', 'mono'] as const).flatMap((r) => cfg.fonts[r].files.map((f) => ({ fontFamily: cfg.fonts[r].family, fontWeight: f.weight }))),
    { fontFamily: cfg.fonts.fallback.family },
  ]
  let repaired = 0
  for (const face of faces) {
    await Font.load(face)
    const font = Font.getFont(face)?.data as unknown as LoadedFont | undefined
    if (!font) throw new PresentationRefusal(`font_not_loaded:${face.fontFamily}`)
    for (const cp of codePoints) {
      if (!font.hasGlyphForCodePoint(cp)) continue
      const glyph = font.glyphForCodePoint(cp)
      if (glyph.codePoints.length === 0) { glyph.codePoints = [cp]; repaired++ }
    }
  }
  return repaired
}

/** The renderer refuses a configuration it does not implement. */
export function assertImplemented(cfg: PresentationConfig, design: NonNullable<CustomerDocumentModel['design']>): void {
  if (cfg.renderer.id !== 'si8/creator-record-v2-pdf-presentation' || cfg.renderer.implementation !== 'institutional-trust' || cfg.renderer.version !== 1) throw new PresentationRefusal('renderer_not_implemented')
  if (cfg.contract !== design.contract || cfg.version !== design.version) throw new PresentationRefusal('presentation_reference_mismatch')
  if (cfg.page.size !== 'A4') throw new PresentationRefusal('page_size_not_implemented')
}

type Register = 'warm' | 'reading' | 'navy'
type TypeKey = keyof PresentationConfig['type']

/** One complete style set (every key the placement tree uses) for one register, from the configuration only. */
export function presentationStyles(cfg: PresentationConfig, register: Register): ReadingStyles {
  const c = cfg.colors
  const L = cfg.layout
  const fallback = cfg.fonts.fallback.family
  const tx = (k: TypeKey, color: string, extra: Record<string, unknown> = {}) => {
    const t = cfg.type[k] as { family: 'display' | 'body' | 'mono'; size: number; weight: number; line_height: number; letter_spacing?: number }
    return { fontFamily: [cfg.fonts[t.family].family, fallback], fontSize: t.size, fontWeight: t.weight, lineHeight: t.line_height, ...(t.letter_spacing !== undefined ? { letterSpacing: t.letter_spacing } : {}), color, ...extra }
  }
  const reading = register === 'reading'
  const navy = register === 'navy'
  const ink = navy ? c.navy_on : reading ? c.slate_ink : c.ink
  const strong = navy ? c.navy_on : reading ? c.slate_ink : c.ink_strong
  const second = navy ? c.navy_on : reading ? c.slate_secondary : c.ink_secondary
  const muted = navy ? c.navy_on : reading ? c.slate : c.ink_muted
  const line = navy ? c.navy_line : reading ? c.cool_hairline : c.hairline
  const soft = navy ? c.navy_line : reading ? c.cool_hairline : c.hairline_soft
  const accent = navy ? c.navy_on : reading ? c.slate : c.navy
  return StyleSheet.create({
    title: tx('title', strong, { marginBottom: L.block_gap }),
    h1: tx('h1', strong, { marginBottom: L.block_gap, paddingBottom: 4, borderBottomWidth: cfg.chrome.rule_width, borderBottomColor: line }),
    h2: tx('h2', strong, { marginTop: L.section_gap * 0.8, marginBottom: 4 }),
    lead: tx('lead', second, { marginBottom: L.block_gap }),
    band: tx('band', accent, { marginTop: L.section_gap, marginBottom: 3, paddingBottom: 3, borderBottomWidth: cfg.chrome.rule_width, borderBottomColor: accent }),
    eyebrow: tx('eyebrow', muted, { marginTop: 6, marginBottom: 2 }),
    body: tx('body', ink, { marginBottom: 4 }),
    explanation: tx('explanation', ink, { marginTop: 4, marginBottom: 5, paddingLeft: L.card_padding, borderLeftWidth: L.rule_accent_width, borderLeftColor: accent }),
    framing: tx('body', second, { marginBottom: 4 }),
    fine: tx('fine', second, { marginBottom: 3 }),
    row: { flexDirection: 'row', paddingVertical: 2.5, borderBottomWidth: 0.4, borderBottomColor: soft },
    rowLabel: tx('label', second, { width: L.label_width, paddingRight: 10 }),
    rowValue: tx(reading ? 'mono_value' : 'value', ink, { flex: 1 }),
    compact: { flexDirection: 'row', marginBottom: 1.5 },
    compactLabel: tx('label', muted, { width: L.label_width, paddingRight: 10 }),
    compactValue: tx('value', ink, { flex: 1 }),
    conclusionValue: tx('strong', ink, { flex: 1 }),
    digest: tx('digest', second, { flex: 1, paddingTop: 1 }),
    bulletRow: { flexDirection: 'row', marginBottom: 2 },
    bulletMark: tx('body', accent, { width: 10 }),
    bulletText: tx('body', ink, { flex: 1 }),
    condition: tx('strong', ink, { flex: 1 }),
    note: { borderLeftWidth: 1.5, borderLeftColor: line, paddingLeft: 7, marginTop: 2, marginBottom: 3 },
    consideration: { marginTop: L.block_gap + 2, padding: L.card_padding, backgroundColor: c.paper_raised, borderWidth: 0.6, borderColor: line, borderRadius: L.radius },
    considerationHead: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 3 },
    // Gold numerals on paper; on the navy index the same numerals use the on-navy colour (contrast).
    refLabel: tx('reference', navy ? c.navy_on : c.gold, { marginRight: 3 }),
    refValue: tx('reference', navy ? c.navy_on : c.gold, { marginRight: 9 }),
    topic: tx('topic', strong, { flex: 1 }),
    open: { backgroundColor: c.gold_note_bg, borderLeftWidth: 2, borderLeftColor: c.gold_note_border, paddingHorizontal: L.card_padding, paddingVertical: 6, marginTop: 5, marginBottom: 2 },
    dependency: { marginTop: 5, paddingTop: 4, borderTopWidth: 0.4, borderTopColor: c.gold_note_border },
    depTitle: tx('strong', c.gold_note_ink, { marginBottom: 1 }),
    panel: { backgroundColor: c.navy_tint, borderWidth: 0.6, borderColor: c.navy_tint_border, borderLeftWidth: L.rule_accent_width, borderLeftColor: c.navy, padding: L.card_padding, marginVertical: 7 },
    map: { backgroundColor: c.navy, padding: L.card_padding + 2, marginTop: 4, marginBottom: L.section_gap, borderRadius: L.radius },
    mapRow: { flexDirection: 'row', paddingVertical: 5, borderBottomWidth: 0.4, borderBottomColor: line },
    mapRef: { width: 88, flexDirection: 'row', alignItems: 'baseline' },
    mapTopic: { width: 170, paddingRight: 10 },
    mapOpen: { flex: 1 },
    mapTopicText: tx('h2', strong),
    mapProvider: tx('label', second),
    mapNone: tx('fine', second),
    mapGroup: tx('band', accent, { paddingTop: 6, paddingBottom: 2, borderBottomWidth: 0.4, borderBottomColor: line }),
    mapXref: { flexDirection: 'row', paddingLeft: 10, marginBottom: 2 },
    mapXrefLabel: tx('fine', muted, { marginRight: 4 }),
    mapXrefValue: tx('reference', second),
    scope: { marginTop: L.section_gap, paddingTop: 8, borderTopWidth: cfg.chrome.rule_width, borderTopColor: line },
    identity: { marginBottom: L.section_gap, paddingBottom: 10, borderBottomWidth: cfg.chrome.rule_width * 1.4, borderBottomColor: accent },
    qa: { flexDirection: 'row', paddingVertical: 4, borderBottomWidth: 0.4, borderBottomColor: soft },
    qaQuestion: tx('label', second, { width: 220, paddingRight: 12 }),
    qaAnswers: { flex: 1 },
    qaAnswer: tx('value', ink, { marginBottom: 1 }),
    reading: { borderBottomWidth: 0.4, borderBottomColor: soft, paddingBottom: 2 },
    readingValue: tx('mono_value', ink, { flex: 1 }),
    // A reading's basis / source-text rows sit one indent under their value, so the text keeps a wide column (v5 indented a full label width).
    readingSub: { flexDirection: 'row', marginBottom: 1.5, paddingLeft: L.sub_indent },
    document: { backgroundColor: c.cool_surface, borderWidth: 0.6, borderColor: c.cool_hairline, borderRadius: L.radius, padding: L.card_padding, marginBottom: L.block_gap + 1 },
    section: { marginBottom: L.section_gap },
    hero: tx('hero', strong, { marginBottom: 6 }),
    heroLabel: tx('hero_label', muted, { marginTop: 4, marginBottom: 2 }),
    pointer: tx('fine', second, { marginTop: 3, marginBottom: 2 }),
    counts: { flexDirection: 'row', flexWrap: 'wrap', marginTop: L.block_gap, paddingTop: 6, borderTopWidth: 0.4, borderTopColor: line },
    count: tx('value', ink, { marginRight: L.count_gap, marginBottom: 3, paddingLeft: 6, borderLeftWidth: L.rule_accent_width * 0.8, borderLeftColor: accent }),
    // A reading's basis / source-text rows: indented label, value aligned with the reading's own value column.
    readingSubLabel: tx('label', muted, { width: L.label_width - L.sub_indent, paddingRight: 10 }),
  }) as unknown as ReadingStyles
}

const T = ({ text, ...props }: { text: string } & Omit<TextProps, 'children' | 'hyphenationCallback'>) => (
  <Text {...props} hyphenationCallback={lineBreakOpportunities}>{pdfText(text)}</Text>
)

type Marking = CustomerDocumentModel['marking']
const markingText = (m: Marking, key: string): string => {
  if (key !== 'footer' && key !== 'stamp') throw new PresentationRefusal(`chrome_not_implemented:${key}`)
  return m[key]
}

/** Consecutive sections of one register. A reading-register run always starts a new page and the warm register resumes after it. */
function pageRuns(sections: CustomerDocumentSection[], readingIds: readonly string[]): { register: 'warm' | 'reading'; sections: CustomerDocumentSection[] }[] {
  const runs: { register: 'warm' | 'reading'; sections: CustomerDocumentSection[] }[] = []
  for (const s of sections) {
    const register = readingIds.includes(s.id) ? 'reading' : 'warm'
    const last = runs[runs.length - 1]
    if (last && last.register === register) last.sections.push(s)
    else runs.push({ register, sections: [s] })
  }
  return runs
}

export function InstitutionalTrustPDF({ model, config }: { model: CustomerDocumentModel; config: PresentationConfig }) {
  if (!model.design) throw new PresentationRefusal('model_has_no_presentation')
  assertImplemented(config, model.design)
  const c = config.colors
  const P = config.page
  const ty = config.type
  const fallback = config.fonts.fallback.family
  const fam = (role: 'display' | 'body' | 'mono') => [config.fonts[role].family, fallback]
  const m = model.marking
  const header = markingText(m, config.chrome.running_header)
  const footer = markingText(m, config.chrome.running_footer)
  const disclosure = markingText(m, config.chrome.first_page_disclosure)
  const warm = presentationStyles(config, 'warm')
  const reading = presentationStyles(config, 'reading')
  const navy = presentationStyles(config, 'navy')
  // Adaptive hero: a long declared title steps down to a smaller configured size. Width is counted in em-like units (a CJK, kana or
  // Hangul character counts twice), so a short CJK title is not shrunk and a long Latin one is.
  const heroWidth = (t: string) => [...t].reduce((n, ch) => n + (/[⺀-鿿가-힯豈-﫿＀-￯]/u.test(ch) ? 2 : 1), 0)
  const heroSteps = config.layout.hero_steps.map((x) => ({ min: x.min_width, size: x.size })).sort((a, b) => b.min - a.min)
  const heroStyle = (t: string) => {
    const w = heroWidth(t)
    const step = heroSteps.find((x) => w >= x.min)
    return step ? { fontSize: step.size } : undefined
  }
  const opts = (s: ReadingStyles): ReadingOptions => ({ keepChars: config.layout.consideration_keep_chars, keepOpenWithBody: config.layout.keep_open_with_body, mapStyles: s === warm ? navy : undefined, heroStyle, indexLeadPresence: config.layout.index_lead_presence })
  const chrome = (k: 'running_header' | 'running_stamp' | 'page_label' | 'first_page_stamp', color: string) => ({
    fontFamily: fam(ty[k].family), fontSize: ty[k].size, fontWeight: ty[k].weight, ...('line_height' in ty[k] ? { lineHeight: (ty[k] as { line_height: number }).line_height } : {}),
    ...('letter_spacing' in ty[k] ? { letterSpacing: (ty[k] as { letter_spacing: number }).letter_spacing } : {}), color,
  })
  return (
    <Document title={model.meta.title} subject={model.meta.subject} creator={model.meta.creator} producer={model.meta.producer} language={P.language}>
      {pageRuns(model.sections, config.registers.reading_sections).map((run, r) => {
        const isReading = run.register === 'reading'
        const s = isReading ? reading : warm
        const rule = isReading ? c.slate : c.navy
        const fine = isReading ? c.slate_fine : c.ink_fine
        return (
          <Page key={r} size={P.size} style={{ paddingTop: P.padding_top, paddingBottom: P.padding_bottom, paddingHorizontal: P.padding_x, backgroundColor: isReading ? c.cool_ground : c.paper, color: isReading ? c.slate_ink : c.ink }}>
            <View fixed style={{ position: 'absolute', top: P.masthead_top, left: P.padding_x, right: P.padding_x, borderBottomWidth: config.chrome.rule_width, borderBottomColor: rule, paddingBottom: 4 }}>
              <T style={chrome('running_header', fine)} text={header} />
            </View>
            {/* The running footer and the page label are separate fixed elements. A render-prop text inside a flex row (or with a
                line height) is measured by @react-pdf before its content exists and grows to ~213,000 pt, which pushes the whole row
                off the page (CR-DESIGN-2B-R1 root cause 1; the same library behaviour the legacy renderer's page label avoids). */}
            <View fixed style={{ position: 'absolute', bottom: P.footer_bottom, left: P.padding_x, right: P.padding_x, borderTopWidth: config.chrome.rule_width * 0.6, borderTopColor: isReading ? c.cool_hairline : c.hairline, paddingTop: 4, paddingRight: P.page_label_width }}>
              <T style={chrome('running_stamp', fine)} text={footer} />
            </View>
            <Text fixed style={{ ...chrome('page_label', fine), position: 'absolute', bottom: P.footer_bottom, right: P.padding_x, width: P.page_label_width, textAlign: 'right' }} render={({ pageNumber, totalPages }) => m.page_label.replace('{page}', String(pageNumber)).replace('{pages}', String(totalPages))} />
            {run.sections.map((section) => (
              <React.Fragment key={section.id}>
                <ReadingSection section={section} s={s} o={opts(s)} />
                {section.id === 'identity' ? (
                  <View style={{ backgroundColor: c.navy_tint, borderLeftWidth: config.layout.rule_accent_width, borderLeftColor: c.navy, padding: config.layout.card_padding, marginBottom: config.layout.section_gap }}>
                    <T style={chrome('first_page_stamp', c.ink_strong)} text={disclosure} />
                  </View>
                ) : null}
              </React.Fragment>
            ))}
          </Page>
        )
      })}
    </Document>
  )
}
