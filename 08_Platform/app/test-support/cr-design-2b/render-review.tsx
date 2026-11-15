/**
 * CR-DESIGN-2B — TEST ONLY. Renders the thirteen review PDFs with the REAL entry point (`renderCustomerRecordPdf`) and the PROPOSED
 * v6/v7 sets under a synthetic approval (registered nowhere), and checks each on the laid-out pages:
 *   - exact print: the body text equals the model's text in order, plus the page-1 disclosure (FD-3) after the identity block;
 *   - chrome: the full `footer` and `stamp` strings on EVERY page, and a correct "Page N of M" on every page;
 *   - orphan headings; react-pdf's oversized-unbreakable warnings;
 *   - the same record under the APPROVED v4/v5 set prints the same blocks (multiset), apart from the navigation copies.
 * Run: npx tsx test-support/cr-design-2b/render-review.tsx <outDir>
 */
import React from 'react'
import { mkdirSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { join } from 'node:path'
import { Font, pdf } from '@react-pdf/renderer'
import layoutDocument from '@react-pdf/layout'
import { renderCustomerRecordPdf } from '@/lib/creator-record/customer-pdf/CustomerRecordPDF'
import { buildCustomerDocument, type CustomerDocumentModel } from '@/lib/creator-record/customer-pdf/document-model'
import { InstitutionalTrustPDF, registerPresentationFonts } from '@/lib/creator-record/customer-pdf/InstitutionalTrustPDF'
import { presentationFor } from '@/lib/creator-record/customer-pdf/presentation/institutional-trust'
import { pdfText } from '@/lib/creator-record/customer-pdf/text-layout'
import { registeredPdfTemplateSet, CUTOVER_VERSIONS } from '@/test-support/registered-template-sets'
import { syntheticallyApproved2B } from './proposed-sets'
import { reviewCases } from './review-fixtures'

const norm = (t: string) => pdfText(t).replace(/\s+/g, '')
interface Laid { page: number; text: string; fixed: boolean }
function walk(node: any, page: number, fixed: boolean, out: Laid[]) {
  const f = fixed || node.props?.fixed === true
  if (Array.isArray(node.lines) && node.lines.length > 0) out.push({ page, text: node.lines.map((l: any) => l.string).join(''), fixed: f })
  for (const c of node.children ?? []) walk(c, page, f, out)
}
const textsOf = (m: CustomerDocumentModel, skip: Set<string> = new Set()) => m.sections.flatMap((s) => s.blocks.flatMap((b, i) => (skip.has(`${s.id}:${i}`) ? [] : b.kind === 'row' ? [b.label, b.value] : [b.text])))
const multiset = (xs: string[]) => { const m = new Map<string, number>(); for (const x of xs) m.set(x, (m.get(x) ?? 0) + 1); return m }

export interface CaseReport {
  id: string; title: string; schema: number; synthetic: string[]; file: string; sha256: string; bytes: number; pages: number
  exact_print: boolean; chrome_every_page: boolean; page_labels_ok: boolean; orphan_headings: string[]; oversize_warnings: number
  same_blocks_as_approved_set: boolean; navigation_copies: number; extra_vs_approved: string[]; missing_vs_approved: string[]
}

export async function renderReview(outDir: string): Promise<CaseReport[]> {
  mkdirSync(join(outDir, 'pdf'), { recursive: true })
  const cases = await reviewCases()
  const out: CaseReport[] = []
  for (const c of cases) {
    const set = syntheticallyApproved2B(c.schema)
    const input = { canonical: c.record.canonical, sha256: c.record.sha256, issued: { record_id: 'CR-2026-2B0000' + c.id.replace('P', '').padStart(2, '0'), issued_on: '2026-11-15' }, templates: set.templates, template_approval: set.approval }
    const { model, bytes } = await renderCustomerRecordPdf(input)
    const file = `${c.id}-${c.title.split(/[ ,(]/)[0].toLowerCase()}-schema${c.schema}.pdf`.replace(/[^A-Za-z0-9._-]/g, '')
    writeFileSync(join(outDir, 'pdf', file), bytes)
    // The layout pass the PDF is written from.
    const config = presentationFor(model.design!)!
    registerPresentationFonts(config)
    const warnings: string[] = []
    const warn = console.warn
    console.warn = (...args: unknown[]) => { warnings.push(args.map(String).join(' ')) }
    const laid = await (layoutDocument as any)((pdf(<InstitutionalTrustPDF model={model} config={config} />) as any).container.document, Font)
    console.warn = warn
    const nodes: Laid[] = []
    laid.children.forEach((p: any, i: number) => walk(p, i + 1, false, nodes))
    const pages = laid.children.length
    const body = nodes.filter((n) => !n.fixed && n.text !== '•')
    const identityCount = model.sections[0].id === 'identity' ? model.sections[0].blocks.reduce((n, b) => n + (b.kind === 'row' ? 2 : 1), 0) : 0
    const flat = textsOf(model)
    const expected = [...flat.slice(0, identityCount), model.marking.stamp, ...flat.slice(identityCount)]
    const exact = body.length === expected.length && expected.every((e, k) => norm(e) === norm(body[k].text))
    // Orphans: a heading/label whose following body text starts on a later page (a label alone in its box excepted, as before).
    const kinds = [...model.sections.flatMap((s) => s.blocks.flatMap((b) => (b.kind === 'row' ? ['row', 'row'] : [b.kind])))]
    kinds.splice(identityCount, 0, 'disclosure')
    const orphans = exact ? kinds.flatMap((k, i) => ((k === 'heading' || k === 'subheading' || k === 'label') && body[i + 1] && body[i + 1].page > body[i].page ? [`p${body[i].page}: ${body[i].text.slice(0, 60)}`] : [])) : ['(not checked: print mismatch)']
    const fixedOn = (text: string) => new Set(nodes.filter((n) => n.fixed && norm(n.text) === norm(text)).map((n) => n.page)).size === pages
    const chrome = fixedOn(model.marking.stamp) && fixedOn(model.marking.footer)
    const labels = Array.from({ length: pages }, (_, i) => nodes.some((n) => n.fixed && n.page === i + 1 && n.text === `Page ${i + 1} of ${pages}`)).every(Boolean)
    // Same record under the approved v4/v5 set: same printed blocks, apart from the navigation copies and the two navigational strings.
    const approved = registeredPdfTemplateSet(c.schema, CUTOVER_VERSIONS[c.schema])
    const legacy = buildCustomerDocument({ ...input, templates: approved.templates, template_approval: approved.approval })
    const skip = new Set((model.navigation_copies ?? []).map((x) => `${x.section}:${x.index}`))
    const contents = (set.templates.navigation as { contents_heading: string }).contents_heading
    const mine = multiset(textsOf(model, skip).filter((t) => t !== contents))
    const theirs = multiset(textsOf(legacy))
    const extra = [...mine].filter(([t, n]) => (theirs.get(t) ?? 0) < n).map(([t]) => t.slice(0, 80))
    const missing = [...theirs].filter(([t, n]) => (mine.get(t) ?? 0) < n).map(([t]) => t.slice(0, 80))
    const r: CaseReport = {
      id: c.id, title: c.title, schema: c.schema, synthetic: c.synthetic, file, sha256: createHash('sha256').update(bytes).digest('hex'), bytes: bytes.length, pages,
      exact_print: exact, chrome_every_page: chrome, page_labels_ok: labels, orphan_headings: orphans, oversize_warnings: warnings.filter((w) => /bigger than available page height/.test(w)).length,
      same_blocks_as_approved_set: extra.length === 0 && missing.length === 0, navigation_copies: skip.size, extra_vs_approved: extra, missing_vs_approved: missing,
    }
    out.push(r)
    console.log(c.id.padEnd(4), `pages=${pages}`, `exact=${exact}`, `chrome=${chrome}`, `labels=${labels}`, `orphans=${orphans.length}`, `oversize=${r.oversize_warnings}`, `same=${r.same_blocks_as_approved_set}`)
  }
  writeFileSync(join(outDir, 'report.json'), JSON.stringify(out, null, 1))
  return out
}

if (require.main === module) {
  const dir = process.argv[2]
  if (!dir) throw new Error('usage: render-review.tsx <outDir>')
  renderReview(dir).catch((e) => { console.error(e); process.exit(1) })
}
