/** CR-DESIGN-2B — TEST ONLY. The same review records rendered with the APPROVED v4/v5 sets (today's Production renderer), for comparison. */
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { renderCustomerRecordPdf } from '@/lib/creator-record/customer-pdf/CustomerRecordPDF'
import { documentText } from '@/lib/creator-record/customer-pdf/document-model'
import { cutoverLiveSet, CUTOVER_VERSIONS } from '@/test-support/registered-template-sets'
import { reviewCases } from './review-fixtures'

async function main(out: string) {
  mkdirSync(out, { recursive: true })
  for (const c of await reviewCases()) {
    const set = cutoverLiveSet(c.schema)
    const { model, bytes } = await renderCustomerRecordPdf({ canonical: c.record.canonical, sha256: c.record.sha256, issued: { record_id: 'CR-2026-2B0000' + c.id.replace('P', '').padStart(2, '0'), issued_on: '2026-11-15' }, templates: set.templates, template_approval: set.approval })
    writeFileSync(join(out, `${c.id}-current-v${CUTOVER_VERSIONS[c.schema]}.pdf`), bytes)
    writeFileSync(join(out, `${c.id}-current-v${CUTOVER_VERSIONS[c.schema]}.texts.json`), JSON.stringify(documentText(model)))
  }
}
main(process.argv[2]).catch((e) => { console.error(e); process.exit(1) })
