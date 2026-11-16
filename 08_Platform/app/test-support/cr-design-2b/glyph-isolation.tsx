/**
 * CR-DESIGN-2B-R2 — TEST ONLY, run with tsx (react-pdf does not load under Jest). Regression for the glyph-character correction
 * (`primeGlyphCharacters`, `withPresentationFonts`): renders SYNTHETIC records one after another and concurrently in ONE process, and
 * checks every PDF's text layer from its bytes (`./verify_pdf_bytes.py`): each record's exact Unicode text, and no character of
 * another record in its text layer.
 *
 * The titles are chosen so records share glyphs with each other but not with approved wording: in Inter, Δ (U+0394) and ∆ (U+2206)
 * are one glyph, as are Ω (U+03A9) and Ω (U+2126); in Noto Sans CJK, 〈 (U+3008) and 〈 (U+2329) are one glyph. E carries ” and ‚,
 * composites built from ’ (the R1 hazard: the subset creates ’ with no character).
 *
 * A CONTROL draws B WITHOUT the correction (direct `renderToStream`) straight after A, to show that the hazard is real in this process
 * and that the checks see it. A last check shows the one limit inside a document (two characters sharing a glyph): reported, not hidden.
 * Usage: tsx test-support/cr-design-2b/glyph-isolation.tsx <outDir>   (prints one JSON object)
 */
import React from 'react'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { renderToStream } from '@react-pdf/renderer'
import { renderCustomerRecordPdf } from '@/lib/creator-record/customer-pdf/CustomerRecordPDF'
import { buildCustomerDocument } from '@/lib/creator-record/customer-pdf/document-model'
import { InstitutionalTrustPDF, primeGlyphCharacters, registerPresentationFonts } from '@/lib/creator-record/customer-pdf/InstitutionalTrustPDF'
import { presentationFor } from '@/lib/creator-record/customer-pdf/presentation/institutional-trust'
import { documentText } from '@/lib/creator-record/customer-pdf/document-model'
import { syntheticallyApproved2B } from './proposed-sets'
import { verifyPdfBytes, writeExpectations } from './render-review'
import { titledRecord } from './review-fixtures'

/** SYNTHETIC titles. Each record's own characters, chosen to collide with the others' glyphs. */
const TITLES: Record<string, string> = {
  A: 'Δ and Ω study (synthetic)', // U+0394, U+03A9
  B: '∆ and Ω study (synthetic)', // U+2206, U+2126: the same Inter glyphs as A's
  C: '〈都市の未来〉 synthetic', // U+3008 / U+3009, from the fallback
  D: '〈Angle brackets〉 synthetic', // U+2329 / U+232A: the same fallback glyphs as C's
  E: 'The director’s cut — “final” ‚draft‘ (synthetic)', // ’ and the composites built from it
}
/** A title that shares a glyph with approved wording (ʼ U+02BC and ’ U+2019 in Inter): the within-document limit. */
const SHARED_WITH_WORDING = 'Maʼohi study (synthetic)'

async function main(outDir: string) {
  mkdirSync(outDir, { recursive: true })
  const log = console.log
  console.log = () => {}
  const records: Record<string, { canonical: string; sha256: string }> = {}
  for (const [k, t] of Object.entries(TITLES)) records[k] = await titledRecord(`2B-R2-${k}`, t)
  const set = syntheticallyApproved2B(7)
  const input = (k: string, n: number) => ({ canonical: records[k].canonical, sha256: records[k].sha256, issued: { record_id: `CR-2026-2B9${String(n).padStart(5, '0')}`, issued_on: '2026-11-16' }, templates: set.templates, template_approval: set.approval })
  const written: { run: string; record: string; file: string; title_in_model: boolean }[] = []
  const save = (run: string, k: string, n: number, model: Parameters<typeof writeExpectations>[0], bytes: Uint8Array) => {
    const file = join(outDir, `${run}-${n}-${k}.pdf`)
    writeFileSync(file, bytes)
    written.push({ run, record: k, file: writeExpectations(model, presentationFor(model.design!)!, file), title_in_model: documentText(model).includes(TITLES[k]) })
  }

  // 1. Sequential, in an order that creates the hazards (ʼ before ’; 〈 U+3008 before 〈 U+2329), then the reverse.
  let n = 0
  for (const k of ['A', 'B', 'C', 'D', 'E', 'B', 'A', 'D', 'C', 'E']) { const r = await renderCustomerRecordPdf(input(k, ++n)); save('sequential', k, n, r.model, r.bytes) }

  // 2. Concurrent: all four at once, twice over, interleaved with each other.
  const batch = ['A', 'B', 'C', 'D', 'E', 'E', 'D', 'C', 'B', 'A'].map((k) => ({ k, i: ++n }))
  const results = await Promise.all(batch.map(({ k, i }) => renderCustomerRecordPdf(input(k, i))))
  results.forEach((r, j) => save('concurrent', batch[j].k, batch[j].i, r.model, r.bytes))

  // 3. CONTROL: B drawn without the correction, straight after A drew Δ and Ω with the same glyphs. Expected to FAIL the text check.
  const config = presentationFor(set.templates.presentation as never)!
  registerPresentationFonts(config)
  await renderCustomerRecordPdf(input('A', ++n))
  const model = buildCustomerDocument(input('B', ++n))
  const stream = await renderToStream(<InstitutionalTrustPDF model={model} config={config} />)
  const chunks: Buffer[] = []
  for await (const chunk of stream) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  save('control-uncorrected', 'B', n, model, new Uint8Array(Buffer.concat(chunks)))

  // 4. One document that prints two characters sharing a glyph: the most frequent (approved ’) is kept; the other is reported.
  const shared = await titledRecord('2B-R2-F', SHARED_WITH_WORDING)
  const fModel = buildCustomerDocument({ ...input('A', 99), canonical: shared.canonical, sha256: shared.sha256 })
  const conflict = await primeGlyphCharacters(config, documentText(fModel))

  const reports = verifyPdfBytes(written.map((w) => w.file))
  console.log = log
  process.stdout.write(JSON.stringify({ titles: TITLES, renders: written.map((w, i) => ({ ...w, ok: reports[i].ok, failures: reports[i].failures, probes: reports[i].probes_checked, strings: reports[i].strings_checked })), conflict }))
}

main(process.argv[2]).catch((e) => { process.stdout.write(JSON.stringify({ error: String(e && (e as Error).stack || e) })); process.exit(1) })
