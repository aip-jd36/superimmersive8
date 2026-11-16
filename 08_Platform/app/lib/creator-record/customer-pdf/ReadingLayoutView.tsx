/**
 * CR-PDF-IMPL-1 — drawing of the three-level reading layout (`./readiness-layout`). Mechanical, like the rest of the PDF:
 * it prints each block's own text exactly once, in order, as the layout tree visits it, and adds nothing but the page label
 * (drawn by the page itself) and bullet marks. Used only for a model whose `presentation` is the reading hierarchy; every other
 * model is drawn by the original section renderer, unchanged.
 *
 * Neutral by design: one ink-blue accent and warm neutrals (SI8 identity), no status colours, no icons, no scores. Every
 * conclusion has the same treatment. Fonts are the existing Helvetica + bundled CJK fallback (no new font).
 */
import React from 'react'
import { StyleSheet, Text, View, type TextProps } from '@react-pdf/renderer'
import type { Block, CustomerDocumentSection } from './document-model'
import type { LayoutHint, LayoutNode } from './readiness-layout'
import { lineBreakOpportunities, pdfText } from './text-layout'

const C = { ink: '#1c1c1e', inkSoft: '#4a4a52', muted: '#83837e', line: '#e0ddd2', accent: '#233f66', accentDeep: '#182c48', ground: '#f7f5ef' }

export function readingStyles(fallback: string) {
  const REG = ['Helvetica', fallback]
  const BOLD = ['Helvetica-Bold', fallback]
  const ITAL = ['Helvetica-Oblique', fallback]
  return StyleSheet.create({
    title: { fontSize: 19, fontFamily: BOLD, color: C.accentDeep, marginBottom: 8, lineHeight: 1.2 },
    h1: { fontSize: 15, fontFamily: BOLD, color: C.accentDeep, marginBottom: 6, paddingBottom: 4, borderBottomWidth: 0.5, borderBottomColor: C.line, lineHeight: 1.25 },
    h2: { fontSize: 12, fontFamily: BOLD, color: C.ink, marginTop: 11, marginBottom: 4, lineHeight: 1.25 },
    lead: { fontSize: 10.2, fontFamily: REG, color: C.inkSoft, lineHeight: 1.5, marginBottom: 8 },
    band: { fontSize: 13, fontFamily: BOLD, color: C.accent, marginTop: 14, marginBottom: 2, paddingBottom: 3, borderBottomWidth: 0.75, borderBottomColor: C.accent, lineHeight: 1.2 },
    eyebrow: { fontSize: 7.8, fontFamily: BOLD, color: C.muted, letterSpacing: 0.5, marginTop: 6, marginBottom: 2, lineHeight: 1.3 },
    body: { fontSize: 10, fontFamily: REG, lineHeight: 1.5, color: C.ink, marginBottom: 4 },
    explanation: { fontSize: 10.4, fontFamily: REG, lineHeight: 1.55, color: C.ink, marginTop: 3, marginBottom: 4 },
    framing: { fontSize: 9.2, fontFamily: ITAL, color: C.inkSoft, lineHeight: 1.45, marginBottom: 4 },
    fine: { fontSize: 8.4, fontFamily: REG, lineHeight: 1.45, color: C.inkSoft, marginBottom: 3 },
    row: { flexDirection: 'row', paddingVertical: 2.5, borderBottomWidth: 0.4, borderBottomColor: C.line },
    rowLabel: { width: 175, paddingRight: 10, fontSize: 8.8, fontFamily: REG, color: C.inkSoft, lineHeight: 1.4 },
    rowValue: { flex: 1, fontSize: 9.8, fontFamily: REG, lineHeight: 1.4 },
    compact: { flexDirection: 'row', marginBottom: 1.5 },
    compactLabel: { width: 175, paddingRight: 10, fontSize: 8.4, fontFamily: REG, color: C.muted, lineHeight: 1.4 },
    compactValue: { flex: 1, fontSize: 9.2, fontFamily: REG, color: C.ink, lineHeight: 1.4 },
    conclusionValue: { flex: 1, fontSize: 9.6, fontFamily: BOLD, color: C.ink, lineHeight: 1.4 },
    digest: { flex: 1, fontFamily: 'Courier', fontSize: 6.8, color: C.inkSoft, paddingTop: 1 },
    bulletRow: { flexDirection: 'row', marginBottom: 2 },
    bulletMark: { width: 10, color: C.accent, fontSize: 10 },
    bulletText: { flex: 1, fontSize: 9.8, fontFamily: REG, lineHeight: 1.45 },
    condition: { flex: 1, fontSize: 9.8, fontFamily: BOLD, lineHeight: 1.45 },
    note: { borderLeftWidth: 1.5, borderLeftColor: C.line, paddingLeft: 7, marginTop: 2, marginBottom: 3 },
    consideration: { marginTop: 10, paddingLeft: 10, borderLeftWidth: 1.5, borderLeftColor: C.line },
    considerationHead: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 2 },
    refLabel: { fontSize: 7.8, fontFamily: BOLD, color: C.accent, letterSpacing: 0.5, marginRight: 3 },
    refValue: { fontSize: 12, fontFamily: BOLD, color: C.accent, marginRight: 9 },
    topic: { flex: 1, fontSize: 11.5, fontFamily: BOLD, color: C.accentDeep, lineHeight: 1.25 },
    open: { backgroundColor: C.ground, paddingHorizontal: 9, paddingVertical: 6, marginTop: 5, marginBottom: 2 },
    dependency: { marginTop: 5, paddingTop: 4, borderTopWidth: 0.4, borderTopColor: C.line },
    depTitle: { fontSize: 9.8, fontFamily: BOLD, lineHeight: 1.4, marginBottom: 1 },
    panel: { backgroundColor: C.ground, padding: 10, marginVertical: 7 },
    map: { marginTop: 4, marginBottom: 6, borderTopWidth: 0.75, borderTopColor: C.ink },
    mapRow: { flexDirection: 'row', paddingVertical: 5, borderBottomWidth: 0.4, borderBottomColor: C.line },
    mapRef: { width: 88, flexDirection: 'row', alignItems: 'baseline' },
    mapTopic: { width: 170, paddingRight: 10 },
    mapOpen: { flex: 1 },
    mapTopicText: { fontSize: 9.6, fontFamily: BOLD, lineHeight: 1.35 },
    mapProvider: { fontSize: 8.8, fontFamily: REG, color: C.inkSoft, lineHeight: 1.35 },
    mapNone: { fontSize: 8.6, fontFamily: ITAL, color: C.inkSoft, lineHeight: 1.4 },
    // CR-PDF-REVIEW-2: a subject group in the map (its heading, then its rows) and an open fact's cross-reference.
    mapGroup: { fontSize: 9.4, fontFamily: BOLD, color: C.accent, paddingTop: 6, paddingBottom: 2, borderBottomWidth: 0.4, borderBottomColor: C.line, lineHeight: 1.3 },
    mapXref: { flexDirection: 'row', paddingLeft: 10, marginBottom: 2 },
    mapXrefLabel: { fontSize: 7.8, fontFamily: REG, color: C.muted, marginRight: 4, lineHeight: 1.4 },
    mapXrefValue: { fontSize: 7.8, fontFamily: BOLD, color: C.inkSoft, lineHeight: 1.4 },
    scope: { marginTop: 14, paddingTop: 8, borderTopWidth: 0.75, borderTopColor: C.line },
    identity: { marginBottom: 14, paddingBottom: 10, borderBottomWidth: 1.25, borderBottomColor: C.accent },
    qa: { flexDirection: 'row', paddingVertical: 4, borderBottomWidth: 0.4, borderBottomColor: C.line },
    qaQuestion: { width: 220, paddingRight: 12, fontSize: 8.8, fontFamily: REG, color: C.inkSoft, lineHeight: 1.4 },
    qaAnswers: { flex: 1 },
    qaAnswer: { fontSize: 9.6, fontFamily: BOLD, lineHeight: 1.4, marginBottom: 1 },
    reading: { borderBottomWidth: 0.4, borderBottomColor: C.line, paddingBottom: 2 },
    readingValue: { flex: 1, fontSize: 9.6, fontFamily: BOLD, lineHeight: 1.4 },
    readingSub: { flexDirection: 'row', marginBottom: 1.5, paddingLeft: 175 },
    document: { borderWidth: 0.75, borderColor: C.line, borderRadius: 3, padding: 10, marginBottom: 9 },
    section: { marginBottom: 12 },
    // CR-DESIGN-2B hints. Never produced for a v1–v5 set; present so every style set has the same keys.
    hero: { fontSize: 16, fontFamily: BOLD, color: C.ink, lineHeight: 1.25, marginBottom: 6 },
    heroLabel: { fontSize: 8.4, fontFamily: REG, color: C.inkSoft, lineHeight: 1.4, marginBottom: 2 },
    pointer: { fontSize: 8.4, fontFamily: ITAL, color: C.inkSoft, lineHeight: 1.4, marginTop: 3, marginBottom: 2 },
    // CR-DESIGN-2B-R1 hints (never produced for v1–v5): compact counts; a reading sub-row's label (same as `compactLabel` here).
    counts: { flexDirection: 'row', flexWrap: 'wrap' },
    count: { fontSize: 10, fontFamily: REG, lineHeight: 1.5, color: C.ink, marginRight: 12 },
    readingSubLabel: { width: 175, paddingRight: 10, fontSize: 8.4, fontFamily: REG, color: C.muted, lineHeight: 1.4 },
  })
}
export type ReadingStyles = ReturnType<typeof readingStyles>
type S = ReadingStyles

const T = ({ text, ...props }: { text: string } & Omit<TextProps, 'children' | 'hyphenationCallback'>) => (
  <Text {...props} hyphenationCallback={lineBreakOpportunities}>{pdfText(text)}</Text>
)
const DIGEST = /^[0-9a-f]{64}$/
const textsOf = (b: Block) => (b.kind === 'row' ? [b.label, b.value] : [b.text])

function Leaf({ b, hint, s, o }: { b: Block; hint: LayoutHint; s: S; o?: ReadingOptions }) {
  if (b.kind === 'row') {
    if (hint === 'reference') return <><T style={s.refLabel} text={b.label} /><T style={s.refValue} text={b.value} /></>
    if (hint === 'map_xref') return <View style={s.mapXref} wrap={false}><T style={s.mapXrefLabel} text={b.label} /><T style={s.mapXrefValue} text={b.value} /></View>
    const compact = hint === 'compact' || hint === 'reading_sub'
    const style = hint === 'reading_sub' ? s.readingSub : compact || hint === 'conclusion' ? s.compact : s.row
    const value = DIGEST.test(b.value) ? s.digest : hint === 'conclusion' ? s.conclusionValue : hint === 'reading' ? s.readingValue : compact ? s.compactValue : s.rowValue
    return (
      <View style={style} wrap={false}>
        <T style={hint === 'reading_sub' && o ? s.readingSubLabel : compact || hint === 'conclusion' ? s.compactLabel : s.rowLabel} text={b.label} />
        <T style={value} text={b.value} />
      </View>
    )
  }
  const t = b.text
  switch (hint) {
    case 'title': return <T style={s.title} text={t} />
    case 'h1': return <T style={s.h1} text={t} minPresenceAhead={80} />
    case 'h2': return <T style={s.h2} text={t} minPresenceAhead={60} />
    // Inside an unbreakable unit with its content: no look-ahead needed (CR-PDF-REVIEW-2).
    case 'h2_kept': return <T style={s.h2} text={t} />
    case 'lead': return <T style={s.lead} text={t} />
    case 'band': return <T style={s.band} text={t} minPresenceAhead={120} />
    case 'topic': return <T style={s.topic} text={t} />
    case 'eyebrow': case 'map_label': return <T style={hint === 'map_label' ? [s.eyebrow, { marginTop: 0 }] : s.eyebrow} text={t} minPresenceAhead={24} />
    case 'framing': return <T style={s.framing} text={t} />
    case 'explanation': return <T style={s.explanation} text={t} />
    case 'fine': return <T style={s.fine} text={t} />
    case 'note': return <View style={s.note}><T style={s.fine} text={t} /></View>
    case 'dep_title': return <T style={s.depTitle} text={t} />
    case 'map_ref_label': return <T style={s.refLabel} text={t} />
    case 'map_ref_value': return <T style={s.refValue} text={t} />
    case 'map_topic': return <T style={s.mapTopicText} text={t} />
    case 'map_provider': return <T style={s.mapProvider} text={t} />
    case 'map_none': return <T style={s.mapNone} text={t} />
    case 'map_group': return <T style={s.mapGroup} text={t} minPresenceAhead={40} />
    case 'hero': { const scaled = o?.heroStyle?.(t); return <T style={scaled ? [s.hero, scaled] : s.hero} text={t} /> }
    case 'count': return <T style={s.count} text={t} />
    case 'hero_label': return <T style={s.heroLabel} text={t} />
    case 'pointer': return <T style={s.pointer} text={t} />
    case 'qa_question': return <T style={s.qaQuestion} text={t} />
    case 'qa_answer': return <T style={s.qaAnswer} text={t} />
    case 'bullet': case 'condition': case 'map_item':
      return <View style={s.bulletRow} wrap={false}><Text style={s.bulletMark}>•</Text><T style={hint === 'condition' ? s.condition : s.bulletText} text={t} /></View>
    default: return <T style={s.body} text={t} />
  }
}

const sizeOf = (blocks: readonly Block[], n: LayoutNode): number => (n.kind === 'block' ? textsOf(blocks[n.index]).join('').length : n.children.reduce((x, c) => x + sizeOf(blocks, c), 0))
/** Never split: a heading run, a map row, a panel, a consideration head, a dependency, a question with its answers, a reading. */
const UNBREAKABLE = new Set(['keep', 'map_row', 'consideration_head', 'dependency', 'panel', 'qa', 'reading', 'identity'])
const KEEP_CHARS = 650

/**
 * CR-DESIGN-2B: options of a presentation. Absent (every v1–v5 set): the layout below is exactly as before.
 *   - `keepChars`: the size (characters) up to which a consideration is kept whole;
 *   - `keepOpenWithBody` (contract C4): a consideration's open matters travel with the last block of its guidance when both fit
 *     within `keepChars`, so they never start a page apart from it. Longer content breaks normally (nothing is clipped or forced).
 */
export interface ReadingOptions {
  keepChars: number
  keepOpenWithBody: boolean
  /** The style set inside the overview map (drawn on a solid ground). */
  mapStyles?: ReadingStyles
  /** CR-DESIGN-2B-R1: a smaller size for a long declared title (adaptive hero), or undefined for the configured size. */
  heroStyle?: (text: string) => { fontSize: number } | undefined
  /** CR-DESIGN-2B-R1: space (points) the heading run before the guidance index keeps below it for the index's first row. */
  indexLeadPresence?: number
}

/**
 * CR-DESIGN-2B-R1: a box as the presentation draws it. @react-pdf/layout (4.4.2, `splitNodes`) keeps a whole box on the current
 * page, overflowing it, when the box's first child cannot fit and nothing precedes the box AT ITS OWN NESTING LEVEL (a rule meant
 * for the top of an empty page, applied at every level). The squeezed box then draws into the footer band and over its own
 * lines (P11 page 1). A zero-height first sibling inside a plain wrapper means something always precedes the box, so the box moves
 * to the next page whole instead; the wrapper has no padding, border or background, so nothing of it shows where it splits.
 * Presentation only: v1–v5 are drawn without it, exactly as before.
 */
const Guarded = ({ children, presenceAhead }: { children: React.ReactNode; presenceAhead?: number }) => (
  <View {...(presenceAhead ? { minPresenceAhead: presenceAhead } : {})}><View style={{ height: 0 }} />{children}</View>
)

/** Boxes whose children are laid out in a row: a wrapper around a child would take over its flex width, so they are not guarded. */
const ROW_BOXES = new Set(['map_row', 'qa', 'consideration_head'])

function Node({ n, blocks, s, o, inRow, next }: { n: LayoutNode; blocks: readonly Block[]; s: S; o?: ReadingOptions; inRow?: boolean; next?: LayoutNode }) {
  if (n.kind === 'block') return <Leaf b={blocks[n.index]} hint={n.hint} s={s} o={o} />
  // Presentation: the heading run just before the guidance index needs room for the index's first row below it, or it moves with it.
  const lead = o?.indexLeadPresence && n.box === 'keep' && next?.kind === 'box' && next.box === 'map' ? o.indexLeadPresence : undefined
  return o && !inRow ? <Guarded presenceAhead={lead}><Box n={n} blocks={blocks} s={s} o={o} /></Guarded> : <Box n={n} blocks={blocks} s={s} o={o} />
}

function Box({ n, blocks, s, o }: { n: Extract<LayoutNode, { kind: 'box' }>; blocks: readonly Block[]; s: S; o?: ReadingOptions }) {
  const kids = n.children.map((c, k) => <Node key={k} n={c} blocks={blocks} s={s} o={o} inRow={ROW_BOXES.has(n.box)} next={n.children[k + 1]} />)
  const keepChars = o ? o.keepChars : KEEP_CHARS
  switch (n.box) {
    case 'consideration': {
      // The head travels with up to two following simple blocks (never a box, which may be long); a short consideration stays whole.
      const [head, ...rest] = kids
      let keep = 0
      while (keep < 2 && n.children[1 + keep]?.kind === 'block') keep++
      const whole = sizeOf(blocks, n) > keepChars
      if (o?.keepOpenWithBody) {
        const firstOpen = n.children.findIndex((c) => c.kind === 'box' && c.box === 'open')
        const tail = firstOpen - 1
        if (firstOpen > 0 && tail > keep && n.children.slice(tail).reduce((x, c) => x + sizeOf(blocks, c), 0) <= keepChars) {
          return <View style={s.consideration} wrap={whole}><View wrap={false}>{head}{rest.slice(0, keep)}</View>{kids.slice(1 + keep, tail)}<View wrap={false}>{kids.slice(tail)}</View></View>
        }
      }
      return <View style={s.consideration} wrap={whole}><View wrap={false}>{head}{rest.slice(0, keep)}</View>{rest.slice(keep)}</View>
    }
    case 'group': {
      // A provider band (and any shared selection) never stands alone at a page foot: it travels with the first consideration
      // when that is short, otherwise with a minimum of space below it.
      const lead = n.children[1]?.kind === 'box' && n.children[1].box === 'keep' ? 2 : 1
      const first = n.children[lead]
      const keepFirst = first !== undefined && sizeOf(blocks, first) <= keepChars
      const unit = keepFirst ? lead + 1 : lead
      return <View><View wrap={false} minPresenceAhead={keepFirst ? 0 : 140}>{kids.slice(0, unit)}</View>{kids.slice(unit)}</View>
    }
    case 'open': {
      // Several dependencies may break between them (each dependency never splits); the label travels with the first one.
      const firstDep = n.children.findIndex((c) => c.kind === 'box' && c.box === 'dependency')
      if (firstDep >= 0) return <View style={s.open}><View wrap={false}>{kids.slice(0, firstDep + 1)}</View>{kids.slice(firstDep + 1)}</View>
      return <View style={s.open} wrap={false}>{kids}</View>
    }
    // A document may hold many readings: always breakable (each reading group itself never splits).
    // Presentation: a card opens with an unbreakable unit (its heading and first row), so it either starts on a page with content
    // or moves whole; a breakable first child would leave the card's empty top on the page before (CR-DESIGN-2B-R1).
    case 'document': return o ? <View style={s.document}><View wrap={false}>{kids.slice(0, 2)}</View>{kids.slice(2)}</View> : <View style={s.document}>{kids}</View>
    case 'map': {
      if (!o?.mapStyles) return <View style={s.map}>{kids}</View>
      // Presentation: the index is a flat run of unbreakable units — a subject heading with its first row, then each further row —
      // so a page break falls only between rows, never inside one, and the index never starts as an empty strip at a page foot.
      const m = o.mapStyles
      const units: React.ReactNode[] = []
      n.children.forEach((c, k) => {
        if (c.kind === 'box' && c.box === 'map_group') {
          const [head, ...rows] = c.children
          units.push(<View key={`${k}`} wrap={false}><Node n={head} blocks={blocks} s={m} o={o} inRow />{rows.length > 0 ? <Node n={rows[0]} blocks={blocks} s={m} o={o} inRow /> : null}</View>)
          rows.slice(1).forEach((r, j) => units.push(<Node key={`${k}.${j}`} n={r} blocks={blocks} s={m} o={o} inRow />))
        } else units.push(<View key={`${k}`} wrap={false}><Node n={c} blocks={blocks} s={m} o={o} inRow /></View>)
      })
      return <View style={s.map}>{units}</View>
    }
    case 'map_row': return <View style={s.mapRow} wrap={false}>{kids}</View>
    // A subject group's heading travels with its first row; the group itself may break between rows.
    case 'map_group': return <View><View wrap={false}>{kids.slice(0, 2)}</View>{kids.slice(2)}</View>
    case 'map_ref': return <View style={s.mapRef}>{kids}</View>
    case 'map_topic': return <View style={s.mapTopic}>{kids}</View>
    case 'map_open': return <View style={s.mapOpen}>{kids}</View>
    case 'consideration_head': return <View style={s.considerationHead} wrap={false}>{kids}</View>
    case 'qa': return <View style={s.qa} wrap={false}>{kids}</View>
    case 'qa_answers': return <View style={s.qaAnswers}>{kids}</View>
    case 'counts': return <View style={s.counts} wrap={false}>{kids}</View>
    default: {
      const style = (s as Record<string, object>)[n.box] ?? {}
      return <View style={style as never} wrap={!UNBREAKABLE.has(n.box)}>{kids}</View>
    }
  }
}

/** One section of the reading layout. */
export function ReadingSection({ section, s, o }: { section: CustomerDocumentSection; s: S; o?: ReadingOptions }) {
  if (!section.layout) throw new Error('creator_record_reading_layout_missing')
  const view = (
    <View style={s.section}>
      {section.layout.map((n, k) => <Node key={k} n={n} blocks={section.blocks} s={s} o={o} next={section.layout![k + 1]} />)}
    </View>
  )
  return o ? <Guarded>{view}</Guarded> : view
}
