/**
 * CR-V2-MVP-M3A — test fixture only (never imported by application code), run by `customer-pdf-schema8-bytes.test.ts` with tsx
 * because @react-pdf/renderer does not load under Jest. Renders real schema 8 records with the real PDF component and the synthetic
 * schema 8 templates, and prints, as JSON, the byte count, page count and what each text block became (lines, missing glyphs,
 * page-edge overflow). With a second argument, also writes each PDF to that directory for manual inspection.
 */
import React from 'react'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { pdf, Font } from '@react-pdf/renderer'
import layoutDocument from '@react-pdf/layout'
import { CustomerRecordPDF, renderCustomerRecordPdf } from '@/lib/creator-record/customer-pdf/CustomerRecordPDF'
import { CustomerPdfRefusal } from '@/lib/creator-record/customer-pdf/document-model'
import { SYNTHETIC_TEST_EXAMINATION_PDF as EXAM_PDF } from '@/lib/creator-record/governed/synthetic-test-authority'
import { schema8Fixture } from './customer-record-schema8'

interface Laid { text: string; lines: string[]; missingGlyphs: number; overflow: boolean }
function collect(node: any, pageWidth: number, out: Laid[]) {
  if (node.type === 'PAGE') pageWidth = node.box.width
  if (Array.isArray(node.lines) && node.lines.length > 0) {
    let missingGlyphs = 0
    let overflow = false
    for (const line of node.lines) {
      if ((node.box?.left ?? 0) + (line.box?.x ?? 0) + (line.xAdvance ?? 0) > pageWidth + 0.5) overflow = true
      for (const run of line.runs ?? []) for (const g of run.glyphs ?? []) if (g.id === 0) missingGlyphs++
    }
    out.push({ text: node.lines.map((l: any) => l.string).join(''), lines: node.lines.map((l: any) => l.string), missingGlyphs, overflow })
  }
  for (const c of node.children ?? []) collect(c, pageWidth, out)
}

async function main() {
  const cases = JSON.parse(process.argv[2]) as Record<string, { title?: string; fileNames?: string[] }>
  const outDir = process.argv[3]
  if (outDir) mkdirSync(outDir, { recursive: true })
  const result: Record<string, unknown> = {}
  for (const [name, c] of Object.entries(cases)) {
    try {
      const f = await schema8Fixture({ title: c.title, fileNames: c.fileNames })
      const input = { canonical: f.canonical, sha256: f.sha256, issued: { record_id: 'CR-2026-ABCD1234', issued_on: '2026-11-07' }, templates: EXAM_PDF.templates, template_approval: EXAM_PDF.approval }
      const { bytes, model } = await renderCustomerRecordPdf(input)
      if (outDir) writeFileSync(join(outDir, `${name}.pdf`), bytes)
      const instance = pdf(<CustomerRecordPDF model={model} />) as unknown as { container: { document: unknown } }
      const laid = await (layoutDocument as any)(instance.container.document, Font)
      const blocks: Laid[] = []
      collect(laid, 0, blocks)
      result[name] = { rendered: true, bytes: bytes.length, header: Buffer.from(bytes.slice(0, 5)).toString('latin1'), pages: laid.children.length, blocks }
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
