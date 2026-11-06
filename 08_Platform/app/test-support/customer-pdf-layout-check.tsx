/**
 * Test fixture only (never imported by application code), run by `customer-pdf-text.test.ts` with tsx because @react-pdf/renderer
 * does not load under Jest. Lays out real synthetic documents with the real PDF component and prints, as JSON, what each text
 * block became: its lines, whether every glyph exists in its font, and whether anything passes the page edge.
 */
import React from 'react'
import { pdf, Font } from '@react-pdf/renderer'
import layoutDocument from '@react-pdf/layout'
import { approvedPdfTemplates } from '@/lib/creator-record/customer-flow/approved-inputs'
import { syntheticUatInputs } from '@/lib/creator-record/customer-flow/synthetic-uat'
import { CustomerRecordPDF, renderCustomerRecordPdf } from '@/lib/creator-record/customer-pdf/CustomerRecordPDF'
import { buildCustomerDocument, CustomerPdfRefusal } from '@/lib/creator-record/customer-pdf/document-model'
import { buildCustomerRecord } from '@/lib/creator-record/customer-record/record'
import { CREATOR_RECORD_SYNTHETIC_TEST_AUTHORITY as BUNDLE } from '@/lib/creator-record/governed/synthetic-test-authority'
import { TOPIC_CLAIMS_FIXTURE as CLAIMS } from '@/lib/retrieval-engine/topic-claims-fixture'

const SYN = syntheticUatInputs()
const T = approvedPdfTemplates(BUNDLE)
const ANSWERS = { P3: ['own_channels'], F1: ['TW'], F2: ['online_worldwide'], L1: ['no'], M0: ['none'], H1: ['edited'] }
const input = (title: string, plan = 'Standard') => {
  const b = buildCustomerRecord({
    state: { answers: { ...ANSWERS, P1: [title] }, tools: [{ T1: ['pika'], T3: [plan] }], acknowledgements: { A1: true, A2: true } },
    sources: SYN.sources, source_text: SYN.source_text, topicClaims: CLAIMS, as_of: '2026-11-06',
    record: { record_id: 'PREP-99999999-9999-4999-8999-999999999999', record_version: 1, captured_at: '2026-11-06T09:00:00.000Z' },
  })
  if (!b.ok) throw new Error(`fixture: ${JSON.stringify(b).slice(0, 200)}`)
  return { canonical: b.canonical, sha256: b.sha256, issued: { record_id: 'CR-2026-ABCD1234', issued_on: '2026-11-07' }, templates: T.templates, template_approval: T.approval }
}

interface Laid { text: string; lines: string[]; missingGlyphs: number; fonts: string[]; overflow: boolean }
function collect(node: any, pageWidth: number, out: Laid[]) {
  if (node.type === 'PAGE') pageWidth = node.box.width
  if (Array.isArray(node.lines) && node.lines.length > 0) {
    const fonts = new Set<string>()
    let missingGlyphs = 0
    let overflow = false
    for (const line of node.lines) {
      if ((node.box?.left ?? 0) + (line.box?.x ?? 0) + (line.xAdvance ?? 0) > pageWidth + 0.5) overflow = true
      for (const run of line.runs ?? []) {
        if (run.attributes?.font?.[0]?.fullName) fonts.add(run.attributes.font[0].fullName)
        for (const g of run.glyphs ?? []) if (g.id === 0) missingGlyphs++
      }
    }
    out.push({ text: node.lines.map((l: any) => l.string).join(''), lines: node.lines.map((l: any) => l.string), missingGlyphs, fonts: Array.from(fonts), overflow })
  }
  for (const c of node.children ?? []) collect(c, pageWidth, out)
}

async function layOut(title: string, plan?: string) {
  const i = input(title, plan)
  const instance = pdf(<CustomerRecordPDF model={buildCustomerDocument(i)} />) as unknown as { container: { document: unknown } }
  const laid = await (layoutDocument as any)(instance.container.document, Font)
  const out: Laid[] = []
  collect(laid, 0, out)
  return { pages: laid.children.length, blocks: out }
}

async function main() {
  const cases = JSON.parse(process.argv[2]) as Record<string, string>
  const result: Record<string, unknown> = {}
  for (const [name, title] of Object.entries(cases)) {
    try {
      const { bytes } = await renderCustomerRecordPdf(input(title))
      result[name] = { rendered: true, bytes: bytes.length, ...(await layOut(title)) }
    } catch (e) {
      result[name] = { rendered: false, refusal: e instanceof CustomerPdfRefusal ? { code: e.code, ref: e.ref } : String(e) }
    }
  }
  process.stdout.write(`\n@@RESULT@@${JSON.stringify(result)}`)
}
main().catch((e) => {
  console.error(e)
  process.exit(1)
})
