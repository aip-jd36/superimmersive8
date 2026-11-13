/**
 * CR-V2-2B — mechanical layout of the customer document model.
 *
 * Reads ONLY a `CustomerDocumentModel` (`./document-model`): it decides nothing,
 * adds no text of its own except page numbers, and prints every block as given.
 * The stamp and record id are fixed in the header of every page; the footer
 * carries the template footer and the page label.
 *
 * Bytes are not reproducible (the PDF library writes its own creation time and
 * file id). Integrity is carried by the record's snapshot digest, printed in the
 * document, and by the per-attempt PDF digest an issuance pipeline records.
 *
 * CR-V2-PDF-7B: Helvetica holds Latin only, so other characters come from a bundled fallback font, chosen character by character
 * (`./fonts/README.md`). Every text sets `lineBreakOpportunities`, so nothing is dropped at the edge of a line. Text the fonts cannot
 * print refuses before any layout (`text_unsupported`), so an answer is never printed wrongly. Refusing leaves the step incomplete.
 */

import path from 'node:path'
import React from 'react'
import { Document, Font, Page, StyleSheet, Text, View, renderToStream, type TextProps } from '@react-pdf/renderer'
import { buildCustomerDocument, CustomerPdfRefusal, documentText, type Block, type CustomerDocumentInput, type CustomerDocumentModel } from './document-model'
import { lineBreakOpportunities, pdfText, unsupportedCharacters } from './text-layout'
import { ReadingSection, readingStyles } from './ReadingLayoutView'

const FALLBACK_FONT = 'SI8 Customer Record Fallback'
Font.register({ family: FALLBACK_FONT, src: path.join(process.cwd(), 'lib', 'creator-record', 'customer-pdf', 'fonts', 'NotoSansCJKtc-Regular.otf') })
const REGULAR = ['Helvetica', FALLBACK_FONT]
const BOLD = ['Helvetica-Bold', FALLBACK_FONT]

/** One text in the document: its characters are the record's, and it may wrap anywhere it needs to. */
const Line = ({ text, ...props }: { text: string } & Omit<TextProps, 'children' | 'hyphenationCallback'>) => (
  <Text {...props} hyphenationCallback={lineBreakOpportunities}>{pdfText(text)}</Text>
)

const s = StyleSheet.create({
  // No lineHeight on the page: a page-level lineHeight stops @react-pdf drawing the fixed page-number text
  // (CR-V2-2C, reproduced in isolation). Line height is set on each text style instead (on a wrapping View it
  // is applied as fixed gaps). A numeric lineHeight multiplies the text's OWN fontSize (default 18, not the page's),
  // so every style that sets lineHeight also sets fontSize.
  page: { paddingTop: 64, paddingBottom: 56, paddingHorizontal: 48, fontSize: 9.5, fontFamily: REGULAR, color: '#1c1c1e' },
  header: { position: 'absolute', top: 22, left: 48, right: 48, flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 0.75, borderBottomColor: '#233f66', paddingBottom: 5 },
  stamp: { fontSize: 7.5, fontFamily: BOLD, color: '#233f66', letterSpacing: 0.4, maxWidth: 380, lineHeight: 1.3 },
  headerId: { fontSize: 7.5, color: '#4a4a52' },
  footerText: { position: 'absolute', bottom: 22, left: 48, right: 140, fontSize: 7, color: '#83837e' },
  pageNumber: { position: 'absolute', bottom: 22, left: 48, right: 48, textAlign: 'right', fontSize: 7, color: '#83837e' },
  section: { marginBottom: 12 },
  heading: { fontSize: 12.5, fontFamily: BOLD, color: '#182c48', marginTop: 6, marginBottom: 5 },
  subheading: { fontSize: 10.5, fontFamily: BOLD, marginTop: 7, marginBottom: 3 },
  label: { fontFamily: BOLD, marginTop: 4, marginBottom: 1, fontSize: 9.5, lineHeight: 1.35 },
  paragraph: { marginBottom: 4, fontSize: 9.5, lineHeight: 1.35 },
  bulletRow: { flexDirection: 'row', marginBottom: 2, paddingLeft: 6 },
  bulletMark: { width: 9 },
  bulletText: { flex: 1, fontSize: 9.5, lineHeight: 1.35 },
  row: { flexDirection: 'row', marginBottom: 2 },
  rowLabel: { width: 170, color: '#4a4a52', paddingRight: 8, fontSize: 9.5, lineHeight: 1.35 },
  rowValue: { flex: 1, fontSize: 9.5, lineHeight: 1.35 },
  // A 64-hex digest must print on one line, unbroken: never split or hyphenated.
  rowDigest: { flex: 1, fontFamily: 'Courier', fontSize: 7.5 },
})

function BlockView({ b }: { b: Block }) {
  switch (b.kind) {
    case 'heading':
      // A heading is never left alone at the foot of a page.
      return <Line style={s.heading} minPresenceAhead={60} text={b.text} />
    case 'subheading':
      return <Line style={s.subheading} minPresenceAhead={40} text={b.text} />
    case 'label':
      return <Line style={s.label} minPresenceAhead={20} text={b.text} />
    case 'paragraph':
      return <Line style={s.paragraph} text={b.text} />
    case 'bullet':
      return (
        <View style={s.bulletRow} wrap={false}>
          <Text style={s.bulletMark}>•</Text>
          <Line style={s.bulletText} text={b.text} />
        </View>
      )
    case 'row':
      return (
        <View style={s.row} wrap={false}>
          <Line style={s.rowLabel} text={b.label} />
          <Line style={/^[0-9a-f]{64}$/.test(b.value) ? s.rowDigest : s.rowValue} text={b.value} />
        </View>
      )
  }
}

const HEADING_KINDS: ReadonlySet<Block['kind']> = new Set(['heading', 'subheading', 'label'])
/** A block short enough to keep on the same page as the heading above it. */
const SHORT_BLOCK_CHARS = 400

/**
 * CR-V2-2F: a heading (or a run of headings) is laid out together with the block that follows it, so it is never
 * stranded at the foot of a page (`minPresenceAhead` alone did not hold for long section headings). A long
 * following block is not grouped, so it can still break across pages. Layout only: no block is added or changed.
 */
export function groupHeadings(blocks: readonly Block[]): Block[][] {
  const groups: Block[][] = []
  let run: Block[] = []
  for (const b of blocks) {
    if (HEADING_KINDS.has(b.kind)) {
      run.push(b)
      continue
    }
    const size = b.kind === 'row' ? b.label.length + b.value.length : b.text.length
    if (run.length > 0 && size <= SHORT_BLOCK_CHARS) groups.push([...run, b])
    else {
      if (run.length > 0) groups.push(run)
      groups.push([b])
    }
    run = []
  }
  if (run.length > 0) groups.push(run)
  return groups
}

/** CR-PDF-IMPL-1: the reading-layout styles (same fonts: Helvetica with the bundled fallback). */
const reading = readingStyles(FALLBACK_FONT)

export function CustomerRecordPDF({ model }: { model: CustomerDocumentModel }) {
  const m = model.marking
  return (
    <Document title={model.meta.title} subject={model.meta.subject} creator={model.meta.creator} producer={model.meta.producer}>
      <Page size="A4" style={s.page}>
        <Text style={s.pageNumber} fixed render={({ pageNumber, totalPages }) => m.page_label.replace('{page}', String(pageNumber)).replace('{pages}', String(totalPages))} />
        <View style={s.header} fixed>
          <Line style={s.stamp} text={m.stamp} />
          <Line style={s.headerId} text={m.record_id} />
        </View>
        <Line style={s.footerText} fixed text={m.footer} />
        {model.presentation
          ? model.sections.map((section) => <ReadingSection key={section.id} section={section} s={reading} />)
          : model.sections.map((section) => (
          <View key={section.id} style={s.section}>
            {groupHeadings(section.blocks).map((group, i) =>
              group.length === 1 ? (
                <BlockView key={i} b={group[0]} />
              ) : (
                <View key={i} wrap={false}>
                  {group.map((b, j) => (
                    <BlockView key={j} b={b} />
                  ))}
                </View>
              ),
            )}
          </View>
        ))}
      </Page>
    </Document>
  )
}

/** A font as the library loaded it. Its own check is what the layout consults, so this refuses exactly what would print wrongly. */
async function glyphCheck(fontFamily: string): Promise<(codePoint: number) => boolean> {
  await Font.load({ fontFamily })
  const data = Font.getFont({ fontFamily }).data as unknown as { hasGlyphForCodePoint(codePoint: number): boolean }
  return (codePoint) => data.hasGlyphForCodePoint(codePoint)
}

/** Build the model (all checks) and render it. Throws `CustomerPdfRefusal` before any rendering. */
export async function renderCustomerRecordPdf(input: CustomerDocumentInput): Promise<{ model: CustomerDocumentModel; bytes: Uint8Array }> {
  const model = buildCustomerDocument(input)
  const [latin, fallback] = await Promise.all([glyphCheck('Helvetica'), glyphCheck(FALLBACK_FONT)])
  const unsupported = unsupportedCharacters(documentText(model).join('\n'), (cp) => latin(cp) || fallback(cp))
  if (unsupported.length > 0) throw new CustomerPdfRefusal('text_unsupported', unsupported.join(', '))
  const stream = await renderToStream(<CustomerRecordPDF model={model} />)
  const chunks: Buffer[] = []
  for await (const chunk of stream) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  return { model, bytes: new Uint8Array(Buffer.concat(chunks)) }
}
