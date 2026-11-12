/**
 * CR-SUM-PDF-B1 — test fixtures only (never imported by application code). Run with tsx:
 *   npx tsx test-support/readiness-legacy-baseline.tsx <out.json>
 *
 * Captures, for a fixed set of legacy cases (existing APPROVED template set v1 for schema 7; the synthetic schema 8 set),
 *   - model_sha256:  SHA-256 of the customer document model's canonical form;
 *   - layout_sha256: SHA-256 of the laid-out PDF (page count, and for every text node its page, position and exact lines),
 *                    taken from @react-pdf/layout, the same layout pass the PDF bytes are written from.
 * Raw PDF bytes are NOT hashed: besides the creation date and document ID, react-pdf embeds the fallback font
 * asynchronously, so object numbers can differ between two renders of identical content. The layout hash covers what is
 * actually printed, deterministically. The output is committed as an independent baseline captured BEFORE the Option R
 * change; the same script re-run after the change must produce identical hashes.
 */
import React from 'react'
import { writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { Font, pdf } from '@react-pdf/renderer'
import layoutDocument from '@react-pdf/layout'
import { CustomerRecordPDF } from '@/lib/creator-record/customer-pdf/CustomerRecordPDF'
import { buildCustomerDocument, documentModelCanonical, type CustomerDocumentModel } from '@/lib/creator-record/customer-pdf/document-model'
import { legacyCases, legacyTemplateSet } from './readiness-legacy-cases'

const sha = (b: string) => createHash('sha256').update(b).digest('hex')

/** Every laid-out text node: page, rounded position, and its exact lines. */
function laidOut(node: any, page: number, out: string[]) {
  if (node.type === 'PAGE') page += 1
  if (Array.isArray(node.lines) && node.lines.length > 0) out.push(JSON.stringify([page, Math.round(node.box?.left ?? 0), Math.round(node.box?.top ?? 0), node.lines.map((l: any) => l.string)]))
  let p = page
  for (const c of node.children ?? []) {
    if (c.type === 'PAGE') p += 1
    laidOut(c, c.type === 'PAGE' ? p - 1 : p, out)
  }
}

export async function layoutHash(model: CustomerDocumentModel): Promise<{ pages: number; sha256: string }> {
  const instance = pdf(<CustomerRecordPDF model={model} />) as unknown as { container: { document: unknown } }
  const laid = await (layoutDocument as any)(instance.container.document, Font)
  const lines: string[] = []
  laidOut(laid, 0, lines)
  return { pages: laid.children.length, sha256: sha(`${laid.children.length}\n${lines.join('\n')}`) }
}

async function main() {
  const out = process.argv[2]
  if (!out) throw new Error('usage: readiness-legacy-baseline.tsx <out.json>')
  const result: Record<string, { model_sha256: string; pages: number; layout_sha256: string }> = {}
  for (const c of await legacyCases()) {
    const tpl = legacyTemplateSet(c)
    const model = buildCustomerDocument({ canonical: c.record.canonical, sha256: c.record.sha256, issued: { record_id: 'CR-2026-0000000B', issued_on: '2026-11-12' }, templates: tpl.templates, template_approval: tpl.approval })
    const l = await layoutHash(model)
    result[c.name] = { model_sha256: sha(documentModelCanonical(model)), pages: l.pages, layout_sha256: l.sha256 }
  }
  writeFileSync(out, JSON.stringify(result, null, 1) + '\n')
  console.log(JSON.stringify(result))
}
if (require.main === module) main().catch((e) => {
  console.error(e)
  process.exit(1)
})
