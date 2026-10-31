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
 */

import React from 'react'
import { Document, Font, Page, StyleSheet, Text, View, renderToStream } from '@react-pdf/renderer'
import { buildCustomerDocument, type Block, type CustomerDocumentInput, type CustomerDocumentModel } from './document-model'

// Words are never split across lines (ids, digests and labels stay intact).
Font.registerHyphenationCallback((word) => [word])

const s = StyleSheet.create({
  // No lineHeight on the page: a page-level lineHeight stops @react-pdf drawing the fixed page-number text
  // (CR-V2-2C, reproduced in isolation). Line height is set on each text style instead (on a wrapping View it
  // is applied as fixed gaps). A numeric lineHeight multiplies the text's OWN fontSize (default 18, not the page's),
  // so every style that sets lineHeight also sets fontSize.
  page: { paddingTop: 64, paddingBottom: 56, paddingHorizontal: 48, fontSize: 9.5, fontFamily: 'Helvetica', color: '#1c1c1e' },
  header: { position: 'absolute', top: 22, left: 48, right: 48, flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 0.75, borderBottomColor: '#233f66', paddingBottom: 5 },
  stamp: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: '#233f66', letterSpacing: 0.4, maxWidth: 380, lineHeight: 1.3 },
  headerId: { fontSize: 7.5, color: '#4a4a52' },
  footerText: { position: 'absolute', bottom: 22, left: 48, right: 140, fontSize: 7, color: '#83837e' },
  pageNumber: { position: 'absolute', bottom: 22, left: 48, right: 48, textAlign: 'right', fontSize: 7, color: '#83837e' },
  section: { marginBottom: 12 },
  heading: { fontSize: 12.5, fontFamily: 'Helvetica-Bold', color: '#182c48', marginTop: 6, marginBottom: 5 },
  subheading: { fontSize: 10.5, fontFamily: 'Helvetica-Bold', marginTop: 7, marginBottom: 3 },
  label: { fontFamily: 'Helvetica-Bold', marginTop: 4, marginBottom: 1, fontSize: 9.5, lineHeight: 1.35 },
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
      return <Text style={s.heading} minPresenceAhead={60}>{b.text}</Text>
    case 'subheading':
      return <Text style={s.subheading} minPresenceAhead={40}>{b.text}</Text>
    case 'label':
      return <Text style={s.label} minPresenceAhead={20}>{b.text}</Text>
    case 'paragraph':
      return <Text style={s.paragraph}>{b.text}</Text>
    case 'bullet':
      return (
        <View style={s.bulletRow} wrap={false}>
          <Text style={s.bulletMark}>•</Text>
          <Text style={s.bulletText}>{b.text}</Text>
        </View>
      )
    case 'row':
      return (
        <View style={s.row} wrap={false}>
          <Text style={s.rowLabel}>{b.label}</Text>
          <Text style={/^[0-9a-f]{64}$/.test(b.value) ? s.rowDigest : s.rowValue}>{b.value}</Text>
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

export function CustomerRecordPDF({ model }: { model: CustomerDocumentModel }) {
  const m = model.marking
  return (
    <Document title={model.meta.title} subject={model.meta.subject} creator={model.meta.creator} producer={model.meta.producer}>
      <Page size="A4" style={s.page}>
        <Text style={s.pageNumber} fixed render={({ pageNumber, totalPages }) => m.page_label.replace('{page}', String(pageNumber)).replace('{pages}', String(totalPages))} />
        <View style={s.header} fixed>
          <Text style={s.stamp}>{m.stamp}</Text>
          <Text style={s.headerId}>{m.record_id}</Text>
        </View>
        <Text style={s.footerText} fixed>
          {m.footer}
        </Text>
        {model.sections.map((section) => (
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

/** Build the model (all checks) and render it. Throws `CustomerPdfRefusal` before any rendering. */
export async function renderCustomerRecordPdf(input: CustomerDocumentInput): Promise<{ model: CustomerDocumentModel; bytes: Uint8Array }> {
  const model = buildCustomerDocument(input)
  const stream = await renderToStream(<CustomerRecordPDF model={model} />)
  const chunks: Buffer[] = []
  for await (const chunk of stream) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  return { model, bytes: new Uint8Array(Buffer.concat(chunks)) }
}
