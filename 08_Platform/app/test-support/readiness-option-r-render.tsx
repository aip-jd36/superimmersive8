/**
 * CR-SUM-PDF-B1 — test fixtures only (never imported by application code). Run with tsx:
 *   npx tsx test-support/readiness-option-r-render.tsx <outDir>
 *
 * Renders, for every legacy case, the Option R PDF (the case's existing template set + the readiness block, under a synthetic
 * approval registered nowhere) with the unchanged CustomerRecordPDF component, and writes the PDFs plus a JSON report of
 * page counts. Synthetic only: the summary section's wording is draft wording.
 */
import React from 'react'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { renderToBuffer } from '@react-pdf/renderer'
import { CustomerRecordPDF } from '@/lib/creator-record/customer-pdf/CustomerRecordPDF'
import { buildCustomerDocument } from '@/lib/creator-record/customer-pdf/document-model'
import { legacyCases, legacyTemplateSet } from './readiness-legacy-cases'
import { layoutHash } from './readiness-legacy-baseline'
import { optionRTemplates } from './readiness-scenarios'

async function main() {
  const outDir = process.argv[2]
  if (!outDir) throw new Error('usage: readiness-option-r-render.tsx <outDir>')
  mkdirSync(outDir, { recursive: true })
  const report: Record<string, unknown> = {}
  for (const c of await legacyCases()) {
    const set = optionRTemplates(legacyTemplateSet(c), c.record.record.schema_version as 7 | 8)
    const model = buildCustomerDocument({ canonical: c.record.canonical, sha256: c.record.sha256, issued: { record_id: 'CR-2026-0000000C', issued_on: '2026-11-12' }, templates: set.templates, template_approval: set.approval })
    writeFileSync(join(outDir, `${c.name}.option-r.pdf`), await renderToBuffer(<CustomerRecordPDF model={model} />))
    const l = await layoutHash(model)
    report[c.name] = { sections: model.sections.map((s) => s.id), pages: l.pages }
  }
  writeFileSync(join(outDir, 'report.json'), JSON.stringify(report, null, 1))
  console.log(JSON.stringify(report))
}
main().catch((e) => {
  console.error(e)
  process.exit(1)
})
