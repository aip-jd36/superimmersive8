/**
 * CR-OPTION-C-OC1 — the INTERNAL draft PDF of a Creator Record v2 snapshot.
 *
 * Renders only `buildInternalDraftDocument(snapshot, sha256)`: it prints the
 * model's strings and nothing else. The marking is a `fixed` header and footer,
 * which @react-pdf repeats on every page the content flows onto.
 *
 * Independent of Production issuance: nothing in lib/creator-record-artifacts,
 * lib/payments, lib/pdf or the app imports this module (test-enforced), and it
 * imports none of them.
 */

import React from 'react'
import { Document, Page, StyleSheet, Text, View, renderToStream } from '@react-pdf/renderer'
import { buildInternalDraftDocument, type Block, type InternalDraftDocumentModel } from './document-model'
import type { InternalDraftSnapshot } from './snapshot'

const styles = StyleSheet.create({
  page: { paddingTop: 64, paddingBottom: 56, paddingHorizontal: 44, fontFamily: 'Helvetica', fontSize: 9, color: '#1a1918' },
  header: { position: 'absolute', top: 18, left: 44, right: 44, borderBottomWidth: 1, borderBottomColor: '#b42318', paddingBottom: 4 },
  headerTitle: { fontFamily: 'Helvetica-Bold', fontSize: 10, color: '#b42318' },
  headerDetail: { fontSize: 7, color: '#4a4a52' },
  footer: { position: 'absolute', bottom: 18, left: 44, right: 44, fontSize: 6.5, color: '#b42318' },
  heading: { fontFamily: 'Helvetica-Bold', fontSize: 12, marginTop: 12, marginBottom: 4 },
  subheading: { fontFamily: 'Helvetica-Bold', fontSize: 9.5, marginTop: 6, marginBottom: 2 },
  paragraph: { marginBottom: 3 },
  row: { marginBottom: 3 },
  rowLabel: { fontFamily: 'Helvetica-Bold' },
  rowNote: { color: '#4a4a52' },
  bullet: { marginLeft: 8, marginBottom: 2 },
})

function BlockView({ block }: { block: Block }) {
  switch (block.kind) {
    case 'heading':
      return <Text style={styles.heading}>{block.text}</Text>
    case 'subheading':
      return <Text style={styles.subheading}>{block.text}</Text>
    case 'paragraph':
      return <Text style={styles.paragraph}>{block.text}</Text>
    case 'bullet':
      return <Text style={styles.bullet}>{`• ${block.text}`}</Text>
    case 'row':
      return (
        <View style={styles.row} wrap={false}>
          <Text style={styles.rowLabel}>{block.label}</Text>
          <Text>{block.value}</Text>
          {block.note ? <Text style={styles.rowNote}>{block.note}</Text> : null}
        </View>
      )
  }
}

export function InternalDraftPDF({ model }: { model: InternalDraftDocumentModel }) {
  return (
    <Document title={model.meta.title} subject={model.meta.subject} creator={model.meta.creator} producer={model.meta.producer}>
      <Page size="A4" style={styles.page} wrap>
        <View style={styles.header} fixed>
          <Text style={styles.headerTitle}>{model.marking.title}</Text>
          <Text style={styles.headerDetail}>{model.marking.detail}</Text>
        </View>
        {model.title_block.map((b, i) => (
          <BlockView key={`t${i}`} block={b} />
        ))}
        {model.sections.map((s) => (
          <View key={s.id}>
            {s.blocks.map((b, i) => (
              <BlockView key={`${s.id}${i}`} block={b} />
            ))}
          </View>
        ))}
        <Text style={styles.footer} fixed>
          {model.marking.footer}
        </Text>
      </Page>
    </Document>
  )
}

/** Renders the internal draft PDF bytes. Refuses (throws) unless the snapshot and its digest pass `buildInternalDraftDocument`. */
export async function renderInternalDraftPdf(snapshot: InternalDraftSnapshot, sha256: string): Promise<Uint8Array> {
  const model = buildInternalDraftDocument(snapshot, sha256)
  const stream = await renderToStream(<InternalDraftPDF model={model} />)
  const chunks: Buffer[] = []
  for await (const chunk of stream as AsyncIterable<Buffer | string>) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  return new Uint8Array(Buffer.concat(chunks))
}
