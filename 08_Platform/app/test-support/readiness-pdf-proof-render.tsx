/**
 * CR-SUM-PDF-A — test fixtures only (never imported by application code). Run with tsx (react-pdf does not load under
 * Jest): `npx tsx test-support/readiness-pdf-proof-render.tsx <outDir>`.
 *
 * For each synthetic scenario: build the real record, the real customer document model with the LIVE approved PDF
 * template set for its schema, the bounded summary and its rendering under SYNTHETIC approvals, prepend the summary as a
 * proof section, and render with the unchanged `CustomerRecordPDF` component. Writes each PDF and, as JSON, page counts
 * and per-block layout facts (missing glyphs, page-edge overflow). Also writes the unmodified PDF of the same record,
 * for comparison.
 */
import React from 'react'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { renderToBuffer } from '@react-pdf/renderer'
import { approvedPdfTemplates } from '@/lib/creator-record/customer-flow/approved-inputs'
import { CustomerRecordPDF } from '@/lib/creator-record/customer-pdf/CustomerRecordPDF'
import { buildCustomerDocument } from '@/lib/creator-record/customer-pdf/document-model'
import { CUSTOMER_RECORD_SCHEMA } from '@/lib/creator-record/customer-record/record'
import { CREATOR_RECORD_GOVERNANCE_AUTHORITY as GOV } from '@/lib/creator-record/governed/sources'
import { renderReadinessSummary } from '@/lib/creator-record/readiness-summary/render'
import { buildReadinessSummary } from '@/lib/creator-record/readiness-summary/summary'
import { SYNTHETIC_TEST_EXAMINATION_PDF as EXAM_PDF } from '@/lib/creator-record/governed/synthetic-test-authority'
import { schema8Fixture } from './customer-record-schema8'
import { withReadinessSection } from './readiness-pdf-proof'
import { PROPOSED_RENDER_TEMPLATES, PROPOSED_SUMMARY_TEMPLATES, READINESS_SCENARIOS, SYNTHETIC_RENDER_APPROVAL, SYNTHETIC_SUMMARY_APPROVAL } from './readiness-scenarios'

async function main() {
  const outDir = process.argv[2]
  if (!outDir) throw new Error('usage: readiness-pdf-proof-render.tsx <outDir>')
  mkdirSync(outDir, { recursive: true })
  const report: Record<string, unknown> = {}
  // Schema 8 (documents and readings): the existing synthetic schema 8 fixture and its synthetic PDF template set.
  const s8 = await schema8Fixture({ docs: [{ tool_index: 0 }, { tool_index: 0 }] })
  const cases: [string, { canonical: string; sha256: string; record: { schema_version: number } }, { templates: unknown; approval: any } | null][] = [
    ...Object.entries(READINESS_SCENARIOS).map(([n, build]) => [n, build(), null] as [string, any, null]),
    ['6-schema8-documents-synthetic-sources', s8, { templates: EXAM_PDF.templates, approval: EXAM_PDF.approval }],
  ]
  for (const [name, r, override] of cases) {
    const tpl = override ?? approvedPdfTemplates(GOV as never, { id: CUSTOMER_RECORD_SCHEMA, version: r.record.schema_version })
    const model = buildCustomerDocument({ canonical: r.canonical, sha256: r.sha256, issued: { record_id: 'CR-2026-0000000A', issued_on: '2026-11-12' }, templates: tpl.templates, template_approval: tpl.approval })
    const summary = buildReadinessSummary({ canonical: r.canonical, sha256: r.sha256, templates: PROPOSED_SUMMARY_TEMPLATES, approval: SYNTHETIC_SUMMARY_APPROVAL })
    const rendered = renderReadinessSummary(summary, PROPOSED_RENDER_TEMPLATES, SYNTHETIC_RENDER_APPROVAL)
    const proof = withReadinessSection(model, rendered, PROPOSED_SUMMARY_TEMPLATES, PROPOSED_RENDER_TEMPLATES)
    const proofPdf = await renderToBuffer(<CustomerRecordPDF model={proof} />)
    const basePdf = await renderToBuffer(<CustomerRecordPDF model={model} />)
    writeFileSync(join(outDir, `${name}.pdf`), proofPdf)
    writeFileSync(join(outDir, `${name}.unmodified.pdf`), basePdf)
    report[name] = { schema: r.record.schema_version, templates: { version: (tpl.templates as { version: number }).version }, considerations: summary.groups.flatMap((g) => g.considerations).length, summary_blocks: proof.sections[0].blocks.length, bytes: proofPdf.length, unmodified_bytes: basePdf.length }
  }
  writeFileSync(join(outDir, 'report.json'), JSON.stringify(report, null, 1))
  console.log(JSON.stringify(report))
}
main().catch((e) => {
  console.error(e)
  process.exit(1)
})
