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
  page: { paddingTop: 64, paddingBottom: 56, paddingHorizontal: 48, fontSize: 9.5, fontFamily: 'Helvetica', color: '#1c1c1e', lineHeight: 1.35 },
  header: { position: 'absolute', top: 22, left: 48, right: 48, flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 0.75, borderBottomColor: '#233f66', paddingBottom: 5 },
  stamp: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: '#233f66', letterSpacing: 0.4, maxWidth: 380 },
  headerId: { fontSize: 7.5, color: '#4a4a52' },
  footerText: { position: 'absolute', bottom: 22, left: 48, right: 140, fontSize: 7, color: '#83837e' },
  section: { marginBottom: 12 },
  heading: { fontSize: 12.5, fontFamily: 'Helvetica-Bold', color: '#182c48', marginTop: 6, marginBottom: 5 },
  subheading: { fontSize: 10.5, fontFamily: 'Helvetica-Bold', marginTop: 7, marginBottom: 3 },
  label: { fontFamily: 'Helvetica-Bold', marginTop: 4, marginBottom: 1 },
  paragraph: { marginBottom: 4 },
  bulletRow: { flexDirection: 'row', marginBottom: 2, paddingLeft: 6 },
  bulletMark: { width: 9 },
  bulletText: { flex: 1 },
  row: { flexDirection: 'row', marginBottom: 2 },
  rowLabel: { width: 170, color: '#4a4a52', paddingRight: 8 },
  rowValue: { flex: 1 },
  // A 64-hex digest must print on one line, unbroken: never split or hyphenated.
  rowDigest: { flex: 1, fontFamily: 'Courier', fontSize: 7.5 },
})

function BlockView({ b }: { b: Block }) {
  switch (b.kind) {
    case 'heading':
      return <Text style={s.heading}>{b.text}</Text>
    case 'subheading':
      return <Text style={s.subheading}>{b.text}</Text>
    case 'label':
      return <Text style={s.label}>{b.text}</Text>
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

export function CustomerRecordPDF({ model }: { model: CustomerDocumentModel }) {
  const m = model.marking
  return (
    <Document title={model.meta.title} subject={model.meta.subject} creator={model.meta.creator} producer={model.meta.producer}>
      <Page size="A4" style={s.page}>
        {/* OPEN LAYOUT DEFECT (CR-V2-2B): this page label is drawn for a short document but not in the full synthetic
            document in local tests. It carries no record content; resolve before any customer rendering. */}
        <Text style={{ position: 'absolute', bottom: 22, left: 48, right: 48, textAlign: 'right', fontSize: 7, color: '#83837e' }} fixed render={({ pageNumber, totalPages }) => m.page_label.replace('{page}', String(pageNumber)).replace('{pages}', String(totalPages))} />
        <View style={s.header} fixed>
          <Text style={s.stamp}>{m.stamp}</Text>
          <Text style={s.headerId}>{m.record_id}</Text>
        </View>
        <Text style={s.footerText} fixed>
          {m.footer}
        </Text>
        {model.sections.map((section) => (
          <View key={section.id} style={s.section}>
            {section.blocks.map((b, i) => (
              <BlockView key={i} b={b} />
            ))}
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
