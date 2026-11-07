/**
 * CR-V2-MVP-M4A — test fixture only (never imported by application code), run with tsx because @react-pdf/renderer does not load
 * under Jest. Renders ONE customer document input (read from the JSON file named by the first argument) with the real PDF renderer
 * and prints, as JSON, the byte count, the PDF header, the SHA-256 of the bytes and the page count; or the refusal code.
 */
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { renderCustomerRecordPdf } from '@/lib/creator-record/customer-pdf/CustomerRecordPDF'
import { CustomerPdfRefusal, type CustomerDocumentInput } from '@/lib/creator-record/customer-pdf/document-model'

async function main() {
  const input = JSON.parse(readFileSync(process.argv[2], 'utf8')) as CustomerDocumentInput
  try {
    const { bytes } = await renderCustomerRecordPdf(input)
    const text = Buffer.from(bytes).toString('latin1')
    process.stdout.write(JSON.stringify({
      ok: true, byte_size: bytes.byteLength, header: text.slice(0, 5), sha256: createHash('sha256').update(bytes).digest('hex'),
      pages: (text.match(/\/Type\s*\/Page(?!s)/g) ?? []).length,
    }))
  } catch (e) {
    process.stdout.write(JSON.stringify({ ok: false, refusal: e instanceof CustomerPdfRefusal ? e.code : String(e) }))
  }
}

void main()
