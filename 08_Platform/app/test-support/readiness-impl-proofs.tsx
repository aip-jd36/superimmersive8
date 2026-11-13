/**
 * CR-PDF-IMPL-1 — test fixtures only. Synthetic proofs of the implemented three-level layout, rendered by the PRODUCTION
 * component (`CustomerRecordPDF`) with the PROPOSED template sets under a synthetic approval (registered nowhere).
 * Run with tsx:  npx tsx test-support/readiness-impl-proofs.tsx <outDir>
 *
 * Per case it writes the PDF and checks, on the laid-out text (the layout pass the PDF is written from):
 *   - exact print: the body text equals the model's section text, in order (nothing missing, added or reordered);
 *   - marking (stamp, record id, footer) on every page; no oversized unbreakable view (react-pdf warning captured);
 *   - orphan headings (a heading/subheading/label whose next text starts on a later page).
 * The proof PDFs' stamp is prefixed with a visible PROPOSED marker (proof copies only; the model is otherwise unchanged).
 */
import React from 'react'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { Font, pdf, renderToBuffer } from '@react-pdf/renderer'
import layoutDocument from '@react-pdf/layout'
import { CustomerRecordPDF } from '@/lib/creator-record/customer-pdf/CustomerRecordPDF'
import { buildCustomerDocument, type Block, type CustomerDocumentModel } from '@/lib/creator-record/customer-pdf/document-model'
import { pdfText } from '@/lib/creator-record/customer-pdf/text-layout'
import { legacyCases } from './readiness-legacy-cases'
import { proposedTemplateSet, syntheticallyApproved } from './readiness-proposed-templates'
import { liveRecord } from './readiness-scenarios'

const norm = (t: string) => pdfText(t).replace(/\s+/g, '')
const MARK = 'PROPOSED WORDING — NOT APPROVED · '
interface Laid { page: number; text: string; fixed: boolean }
function walk(node: any, page: number, fixed: boolean, out: Laid[]) {
  const f = fixed || node.props?.fixed === true
  if (Array.isArray(node.lines) && node.lines.length > 0) out.push({ page, text: node.lines.map((l: any) => l.string).join(''), fixed: f })
  for (const c of node.children ?? []) walk(c, page, f, out)
}
const BASE = { P1: ['Proof video'], P3: ['own_channels'], F1: ['TW'], F2: ['TW'], L1: ['no'], H1: ['edited'] }

async function main() {
  const outDir = process.argv[2]
  if (!outDir) throw new Error('usage: readiness-impl-proofs.tsx <outDir>')
  mkdirSync(join(outDir, 'pdf'), { recursive: true })
  const sets = { 7: syntheticallyApproved(proposedTemplateSet(7)), 8: syntheticallyApproved(proposedTemplateSet(8)) }
  const legacy = await legacyCases()
  const pick = (n: string) => legacy.find((c) => c.name === n)!.record
  const cases: [string, { canonical: string; sha256: string; record: { schema_version: number } }][] = [
    ['s7-standard-runway-higgsfield', pick('s7-1-runway-higgsfield')],
    ['s7-complex-pika-getty', pick('s7-5-unresolved-and-topic-caps')],
    ['s7-not-sure-tool', liveRecord('PREP-IMPL-NS', { ...BASE, M0: ['none'] }, [{ T1: ['not_sure'], T3: ['not_sure'], T4: ['May 2026'] }]) as never],
    ['s7-uncovered-artlist-getty', liveRecord('PREP-IMPL-UNC', { ...BASE, M0: ['music', 'stock'], M1: ['artlist'], M2: ['no'], M3: ['getty'], M3D: ['no'] }, [{ T1: ['runway-gen3'], T3: ['not_sure'], T4: ['May 2026'] }]) as never],
    ['s8-documents', pick('s8-default')],
    ['s8-documents-mixed-open', pick('s8-music-dependency')],
  ]
  const report: Record<string, unknown> = {}
  for (const [name, rec] of cases) {
    const set = sets[rec.record.schema_version as 7 | 8]
    const model: CustomerDocumentModel = buildCustomerDocument({ canonical: rec.canonical, sha256: rec.sha256, issued: { record_id: 'CR-2026-0000004A', issued_on: '2026-11-13' }, templates: set.templates, template_approval: set.approval })
    const proof: CustomerDocumentModel = { ...model, marking: { ...model.marking, stamp: MARK + model.marking.stamp } }
    const warnings: string[] = []
    const warn = console.warn
    console.warn = (...args: unknown[]) => { warnings.push(args.map(String).join(' ')) }
    const el = <CustomerRecordPDF model={proof} />
    const laid = await (layoutDocument as any)((pdf(el) as any).container.document, Font)
    writeFileSync(join(outDir, 'pdf', `${name}.pdf`), await renderToBuffer(el))
    console.warn = warn
    const nodes: Laid[] = []
    laid.children.forEach((p: any, i: number) => walk(p, i + 1, false, nodes))
    const pages = laid.children.length
    const body = nodes.filter((n) => !n.fixed && n.text !== '•')
    type Exp = { text: string; kind: Block['kind'] }
    const expected: Exp[] = model.sections.flatMap((s) => s.blocks.flatMap((b): Exp[] => (b.kind === 'row' ? [{ text: b.label, kind: b.kind }, { text: b.value, kind: b.kind }] : [{ text: b.text, kind: b.kind }])))
    const exact = body.length === expected.length && expected.every((e, k) => norm(e.text) === norm(body[k].text))
    // CR-PDF-REVIEW-2: a label that is the ONLY content of its layout box heads nothing (e.g. the lone list label that is itself a
    // consideration's open matter, deferred D5), so a page break after it orphans nothing. Every other heading/label is checked.
    const standalone = new Set<number>()
    let offset = 0
    for (const s of model.sections) {
      const startOf: number[] = []
      s.blocks.forEach((b) => { startOf.push(offset); offset += b.kind === 'row' ? 2 : 1 })
      const visit = (n: any) => {
        if (n.kind !== 'box') return
        if (n.children.length === 1 && n.children[0].kind === 'block' && s.blocks[n.children[0].index].kind === 'label') standalone.add(startOf[n.children[0].index])
        n.children.forEach(visit)
      }
      ;(s.layout ?? []).forEach(visit)
    }
    const orphans = exact ? expected.flatMap((e, k) => ((e.kind === 'heading' || e.kind === 'subheading' || e.kind === 'label') && !standalone.has(k) && body[k + 1] && body[k + 1].page > body[k].page ? [`p${body[k].page}: ${e.text.slice(0, 50)}`] : [])) : ['(not checked: print mismatch)']
    const marking = ['stamp', 'record_id', 'footer'].every((k) => new Set(nodes.filter((n) => n.fixed && norm(n.text) === norm((proof.marking as any)[k])).map((n) => n.page)).size === pages)
    report[name] = { schema: rec.record.schema_version, pages, exact_print: exact, printed: body.length, expected: expected.length, marking_every_page: marking, last_page_body_texts: body.filter((n) => n.page === pages).length, orphan_headings: orphans, oversize_warnings: warnings.filter((w) => /bigger than available page height/.test(w)).length }
    console.log(name.padEnd(30), JSON.stringify(report[name]))
  }
  writeFileSync(join(outDir, 'report.json'), JSON.stringify(report, null, 1))
}
main().catch((e) => { console.error(e); process.exit(1) })
