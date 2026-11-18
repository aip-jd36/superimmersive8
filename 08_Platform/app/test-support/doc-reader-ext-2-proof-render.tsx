/**
 * CR-DOC-READER-EXT-2 — renders the candidate v8 set (SYNTHETIC approval, not registered) for review, with the issuance renderer.
 * Usage: npx tsx --tsconfig tsconfig.json test-support/doc-reader-ext-2-proof-render.tsx <output directory>
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { renderCustomerRecordPdf } from '@/lib/creator-record/customer-pdf/CustomerRecordPDF'
import { ISSUED, licenceRecord, SYNTHETIC_V8, V8 } from '@/test-support/doc-reader-ext-fixture'

async function main() {
  const out = process.argv[2]
  if (!out) throw new Error('usage: doc-reader-ext-2-proof-render.tsx <output directory>')
  mkdirSync(out, { recursive: true })
  const cases: [string, Record<string, string[]>][] = [
    ['linked', { M0: ['music'], M1: ['artlist'], M2: ['yes'] }],
    ['ambiguous', { M0: ['music', 'stock'], M1: ['artlist'], M2: ['yes'], M3: ['getty'], M3D: ['yes'] }],
  ]
  for (const [name, materials] of cases) {
    const rec = await licenceRecord(materials)
    const { bytes } = await renderCustomerRecordPdf({ canonical: rec.canonical, sha256: rec.sha256, issued: ISSUED, templates: V8.templates, template_approval: SYNTHETIC_V8 })
    const file = join(out, `cr-doc-reader-ext-2-v8-${name}.pdf`)
    writeFileSync(file, bytes)
    console.log(`${file} ${bytes.length} bytes`)
  }
}
main().catch((e) => { console.error(e); process.exit(1) })
