/**
 * CR-DESIGN-2D — release rehearsal. Renders the thirteen synthetic review records through the REGISTERED Production approvals (exactly
 * what `approvedPdfTemplates` selects at issuance; no synthetic approval) and checks every PDF from its bytes (`./verify_pdf_bytes.py`).
 * Usage: tsx test-support/cr-design-2b/render-approved.tsx <outDir>   (prints one JSON object; exit 1 on any failure)
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { join } from 'node:path'
import { approvedPdfTemplates } from '@/lib/creator-record/customer-flow/approved-inputs'
import { renderCustomerRecordPdf } from '@/lib/creator-record/customer-pdf/CustomerRecordPDF'
import { presentationFor } from '@/lib/creator-record/customer-pdf/presentation/institutional-trust'
import { verifyPdfBytes, writeExpectations } from './render-review'
import { reviewCases } from './review-fixtures'

async function main(outDir: string) {
  mkdirSync(outDir, { recursive: true })
  const log = console.log
  console.log = () => {}
  const rows: { id: string; schema: number; version: number | undefined; fingerprint: string | undefined; sha256: string; file: string; expect: string }[] = []
  for (const c of await reviewCases()) {
    const sel = approvedPdfTemplates(undefined, { id: 'si8/creator-record-v2-record', version: c.schema })
    const { model, bytes } = await renderCustomerRecordPdf({ canonical: c.record.canonical, sha256: c.record.sha256, issued: { record_id: 'CR-2026-2D0000' + c.id.replace('P', '').padStart(2, '0'), issued_on: '2026-11-16' }, templates: sel.templates, template_approval: sel.approval as never })
    const file = join(outDir, `${c.id}-approved.pdf`)
    writeFileSync(file, bytes)
    rows.push({ id: c.id, schema: c.schema, version: sel.approval?.version, fingerprint: sel.approval?.fingerprint, sha256: createHash('sha256').update(bytes).digest('hex'), file, expect: writeExpectations(model, presentationFor(model.design!)!, file) })
  }
  const reports = verifyPdfBytes(rows.map((r) => r.expect))
  console.log = log
  const out = rows.map((r, i) => ({ id: r.id, schema: r.schema, template_version: r.version, template_fingerprint: r.fingerprint, pdf_sha256: r.sha256, pages: reports[i].pages, ok: reports[i].ok, failures: reports[i].failures }))
  process.stdout.write(JSON.stringify(out))
  process.exit(out.every((r) => r.ok) ? 0 : 1)
}

main(process.argv[2]).catch((e) => { process.stdout.write(JSON.stringify({ error: String((e as Error).stack ?? e) })); process.exit(1) })
