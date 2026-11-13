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
  })
}
type S = ReturnType<typeof readingStyles>

const T = ({ text, ...props }: { text: string } & Omit<TextProps, 'children' | 'hyphenationCallback'>) => (
  <Text {...props} hyphenationCallback={lineBreakOpportunities}>{pdfText(text)}</Text>
)
const DIGEST = /^[0-9a-f]{64}$/
const textsOf = (b: Block) => (b.kind === 'row' ? [b.label, b.value] : [b.text])

function Leaf({ b, hint, s }: { b: Block; hint: LayoutHint; s: S }) {
  if (b.kind === 'row') {
    if (hint === 'reference') return <><T style={s.refLabel} text={b.label} /><T style={s.refValue} text={b.value} /></>
    if (hint === 'map_xref') return <View style={s.mapXref} wrap={false}><T style={s.mapXrefLabel} text={b.label} /><T style={s.mapXrefValue} text={b.value} /></View>
    const compact = hint === 'compact' || hint === 'reading_sub'
    const style = hint === 'reading_sub' ? s.readingSub : compact || hint === 'conclusion' ? s.compact : s.row
    const value = DIGEST.test(b.value) ? s.digest : hint === 'conclusion' ? s.conclusionValue : hint === 'reading' ? s.readingValue : compact ? s.compactValue : s.rowValue
    return (
      <View style={style} wrap={false}>
        <T style={compact || hint === 'conclusion' ? s.compactLabel : s.rowLabel} text={b.label} />
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

function Node({ n, blocks, s }: { n: LayoutNode; blocks: readonly Block[]; s: S }) {
  if (n.kind === 'block') return <Leaf b={blocks[n.index]} hint={n.hint} s={s} />
  const kids = n.children.map((c, k) => <Node key={k} n={c} blocks={blocks} s={s} />)
  switch (n.box) {
    case 'consideration': {
      // The head travels with up to two following simple blocks (never a box, which may be long); a short consideration stays whole.
      const [head, ...rest] = kids
      let keep = 0
      while (keep < 2 && n.children[1 + keep]?.kind === 'block') keep++
      return <View style={s.consideration} wrap={sizeOf(blocks, n) > KEEP_CHARS}><View wrap={false}>{head}{rest.slice(0, keep)}</View>{rest.slice(keep)}</View>
    }
    case 'group': {
      // A provider band (and any shared selection) never stands alone at a page foot: it travels with the first consideration
      // when that is short, otherwise with a minimum of space below it.
      const lead = n.children[1]?.kind === 'box' && n.children[1].box === 'keep' ? 2 : 1
      const first = n.children[lead]
      const keepFirst = first !== undefined && sizeOf(blocks, first) <= KEEP_CHARS
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
    case 'document': return <View style={s.document}>{kids}</View>
    case 'map_row': return <View style={s.mapRow} wrap={false}>{kids}</View>
    // A subject group's heading travels with its first row; the group itself may break between rows.
    case 'map_group': return <View><View wrap={false}>{kids.slice(0, 2)}</View>{kids.slice(2)}</View>
    case 'map_ref': return <View style={s.mapRef}>{kids}</View>
    case 'map_topic': return <View style={s.mapTopic}>{kids}</View>
    case 'map_open': return <View style={s.mapOpen}>{kids}</View>
    case 'consideration_head': return <View style={s.considerationHead} wrap={false}>{kids}</View>
    case 'qa': return <View style={s.qa} wrap={false}>{kids}</View>
    case 'qa_answers': return <View style={s.qaAnswers}>{kids}</View>
    default: {
      const style = (s as Record<string, object>)[n.box] ?? {}
      return <View style={style as never} wrap={!UNBREAKABLE.has(n.box)}>{kids}</View>
    }
  }
}

/** One section of the reading layout. */
export function ReadingSection({ section, s }: { section: CustomerDocumentSection; s: S }) {
  if (!section.layout) throw new Error('creator_record_reading_layout_missing')
  return (
    <View style={s.section}>
      {section.layout.map((n, k) => <Node key={k} n={n} blocks={section.blocks} s={s} />)}
    </View>
  )
}
