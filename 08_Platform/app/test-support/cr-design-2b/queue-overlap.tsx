/**
 * CR-DESIGN-2C — TEST ONLY, run with tsx. Controlled timeout-overlap scenarios with REAL PDF rendering: does a render whose queue hold
 * expired interfere with the render that starts after it, and does its own late result stay out of the caller's hands?
 *
 * A render cannot be paused from outside, so each job runs `renderPresentation`'s own steps — `primeGlyphCharacters`, then the real
 * `InstitutionalTrustPDF` drawn by `renderToStream` — on a test queue with a short hold, with pauses injected exactly at the hazard
 * points (after priming, before drawing). SYNTHETIC records whose titles share glyphs across records: Inter Δ/∆ and Ω/Ω (A/B), Noto
 * 〈 U+3008 / U+2329 (C/D). Every PDF's text layer is checked from its bytes (`./verify_pdf_bytes.py`).
 *
 *   S1 late finisher: A primes, sleeps past its hold; B primes and draws completely (on time); A then draws. B's caller gets B's
 *      correct PDF; A's caller must receive `render_queue_hold_expired` (A's bytes are kept aside only to show the hazard).
 *   S2 interleaved:   A primes and sleeps; its hold expires; B primes, then sleeps; A wakes and draws completely (touching the shared font
 *      state AFTER B's priming); then B draws, within its own hold. B's caller gets B's correct PDF; A's caller must receive
 *      `render_queue_hold_expired`.
 *   S3 = S2 with the fallback-font pair (C, D).
 *   S4 a late FAILURE: a job that throws after its hold reports its own error, not `render_queue_hold_expired`.
 * Usage: tsx test-support/cr-design-2b/queue-overlap.tsx <outDir>   (prints one JSON object)
 */
import React from 'react'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { renderToStream } from '@react-pdf/renderer'
import { buildCustomerDocument, documentText, type CustomerDocumentModel } from '@/lib/creator-record/customer-pdf/document-model'
import { InstitutionalTrustPDF, primeGlyphCharacters, registerPresentationFonts } from '@/lib/creator-record/customer-pdf/InstitutionalTrustPDF'
import { presentationFor, type PresentationConfig } from '@/lib/creator-record/customer-pdf/presentation/institutional-trust'
import { createRenderQueue } from '@/lib/creator-record/customer-pdf/presentation/render-queue'
import { renderCustomerRecordPdf } from '@/lib/creator-record/customer-pdf/CustomerRecordPDF'
import { syntheticallyApproved2B } from './proposed-sets'
import { verifyPdfBytes, writeExpectations } from './render-review'
import { titledRecord } from './review-fixtures'

const TITLES = { A: 'Δ and Ω study (synthetic)', B: '∆ and Ω study (synthetic)', C: '〈都市の未来〉 synthetic', D: '〈Angle brackets〉 synthetic' } as const
type K = keyof typeof TITLES
/** Long enough for an ordinary render (about 0.2–0.4 s) to finish on time; short enough to keep the test quick. */
const HOLD = 1500
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function main(outDir: string) {
  mkdirSync(outDir, { recursive: true })
  const log = console.log
  console.log = () => {}
  const set = syntheticallyApproved2B(7)
  const config = presentationFor(set.templates.presentation as never) as PresentationConfig
  registerPresentationFonts(config)
  const models = {} as Record<K, CustomerDocumentModel>
  let n = 0
  for (const k of Object.keys(TITLES) as K[]) {
    const r = await titledRecord(`2C-Q-${k}`, TITLES[k])
    models[k] = buildCustomerDocument({ canonical: r.canonical, sha256: r.sha256, issued: { record_id: `CR-2026-2C9${String(++n).padStart(5, '0')}`, issued_on: '2026-11-16' }, templates: set.templates, template_approval: set.approval })
  }
  // Warm the process (as a server that has issued before): one ordinary render through the real entry point.
  const warm = await titledRecord('2C-Q-warm', 'Warm-up record (synthetic)')
  await renderCustomerRecordPdf({ canonical: warm.canonical, sha256: warm.sha256, issued: { record_id: 'CR-2026-2C900000', issued_on: '2026-11-16' }, templates: set.templates, template_approval: set.approval })

  const files: { scenario: string; doc: string; role: string; file: string }[] = []
  const draw = async (m: CustomerDocumentModel) => {
    const stream = await renderToStream(<InstitutionalTrustPDF model={m} config={config} />)
    const chunks: Buffer[] = []
    for await (const c of stream) chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c))
    return new Uint8Array(Buffer.concat(chunks))
  }
  const prime = (m: CustomerDocumentModel) => primeGlyphCharacters(config, [...documentText(m), m.marking.page_label, '0123456789'])
  const keep = (scenario: string, k: K, role: string, bytes: Uint8Array) => {
    const file = join(outDir, `${scenario}-${role}-${k}.pdf`)
    writeFileSync(file, bytes)
    files.push({ scenario, doc: k, role, file: writeExpectations(models[k], config, file) })
  }
  const outcome = async (p: Promise<unknown>) => { try { await p; return 'resolved' } catch (e) { return (e as Error).message } }
  const timeline: Record<string, string[]> = {}
  const mark = (s: string, ev: string) => { (timeline[s] ??= []).push(ev) }

  // S1: late finisher.
  {
    const q = createRenderQueue(HOLD)
    const a = q.run(async () => { await prime(models.A); mark('S1', 'A primed'); await sleep(HOLD + 1000); mark('S1', 'A draws'); const b = await draw(models.A); keep('S1', 'A', 'late-raw', b); mark('S1', 'A drawn'); return b })
    const b = q.run(async () => { mark('S1', 'B starts'); await prime(models.B); const bytes = await draw(models.B); keep('S1', 'B', 'next', bytes); mark('S1', 'B drawn'); return bytes })
    const [ra, rb] = await Promise.all([outcome(a), outcome(b)])
    mark('S1', `A caller: ${ra}`); mark('S1', `B caller: ${rb}`)
  }
  // S2 / S3: interleaved — the expired render draws after the next one has primed, before it draws.
  for (const [s, x, y] of [['S2', 'A', 'B'], ['S3', 'C', 'D']] as const) {
    const q = createRenderQueue(HOLD)
    const first = q.run(async () => { await prime(models[x]); mark(s, `${x} primed`); await sleep(HOLD + 450); mark(s, `${x} draws`); const bytes = await draw(models[x]); keep(s, x, 'late-raw', bytes); mark(s, `${x} drawn`); return bytes })
    const next = q.run(async () => { mark(s, `${y} starts`); await prime(models[y]); mark(s, `${y} primed`); await sleep(900); mark(s, `${y} draws`); const bytes = await draw(models[y]); keep(s, y, 'next', bytes); mark(s, `${y} drawn`); return bytes })
    const [r1, r2] = await Promise.all([outcome(first), outcome(next)])
    mark(s, `${x} caller: ${r1}`); mark(s, `${y} caller: ${r2}`)
  }
  // S4: a failure after the hold keeps its own error.
  {
    const q = createRenderQueue(HOLD)
    const f = q.run(async () => { await sleep(HOLD + 300); throw new Error('render failed late') })
    const g = q.run(async () => 'next')
    const [rf, rg] = await Promise.all([outcome(f), outcome(g)])
    mark('S4', `failing caller: ${rf}`); mark('S4', `next caller: ${rg}`)
  }
  const reports = verifyPdfBytes(files.map((f) => f.file))
  console.log = log
  process.stdout.write(JSON.stringify({ hold_ms: HOLD, timeline, pdfs: files.map((f, i) => ({ ...f, ok: reports[i].ok, failures: reports[i].failures })) }))
}

main(process.argv[2]).catch((e) => { process.stdout.write(JSON.stringify({ error: String((e as Error).stack ?? e) })); process.exit(1) })
