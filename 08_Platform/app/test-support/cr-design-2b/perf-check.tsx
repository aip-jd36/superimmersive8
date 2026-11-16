/**
 * CR-DESIGN-2C — TEST ONLY. Lightweight performance observation of redesigned PDF generation in one fresh process (no optimisation).
 * Records: the cold first render (font loading and hash verification), warm sequential render durations for the thirteen synthetic
 * review records, today's approved v4/v5 renderer on the same records for comparison, a concurrent burst of all thirteen through the
 * serialised path (per-request latency and queue wait), and memory (RSS / heap) sampled every 20 ms.
 * Usage: node --expose-gc node_modules/tsx/dist/cli.mjs --tsconfig tsconfig.json test-support/cr-design-2b/perf-check.tsx
 */
import { performance } from 'node:perf_hooks'
import { renderCustomerRecordPdf } from '@/lib/creator-record/customer-pdf/CustomerRecordPDF'
import { cutoverLiveSet } from '@/test-support/registered-template-sets'
import { syntheticallyApproved2B } from './proposed-sets'
import { reviewCases, type ReviewCase } from './review-fixtures'

const MB = (n: number) => Math.round((n / 1048576) * 10) / 10
const gc = () => (globalThis as { gc?: () => void }).gc?.()
let peakRss = 0
let peakHeap = 0
const sampler = setInterval(() => { const m = process.memoryUsage(); peakRss = Math.max(peakRss, m.rss); peakHeap = Math.max(peakHeap, m.heapUsed) }, 20)
const resetPeak = () => { const m = process.memoryUsage(); peakRss = m.rss; peakHeap = m.heapUsed }
const stats = (xs: number[]) => { const s = [...xs].sort((a, b) => a - b); const p = (q: number) => s[Math.min(s.length - 1, Math.floor(q * s.length))]; return { n: s.length, min: Math.round(s[0]), median: Math.round(p(0.5)), p90: Math.round(p(0.9)), max: Math.round(s[s.length - 1]), total: Math.round(s.reduce((a, b) => a + b, 0)) } }

async function main() {
  const log = console.log
  console.log = () => {}
  const cases = await reviewCases()
  const input = (c: ReviewCase, legacy = false) => {
    const set = legacy ? cutoverLiveSet(c.schema) : syntheticallyApproved2B(c.schema)
    return { canonical: c.record.canonical, sha256: c.record.sha256, issued: { record_id: 'CR-2026-2C0000' + c.id.replace('P', '').padStart(2, '0'), issued_on: '2026-11-16' }, templates: set.templates, template_approval: set.approval }
  }
  gc()
  const base = process.memoryUsage()
  resetPeak()

  // Cold: the first redesigned render in the process (font files read, hashed and registered; fontkit parses them).
  const t0 = performance.now()
  await renderCustomerRecordPdf(input(cases[0]))
  const cold = performance.now() - t0

  // Warm sequential, redesigned.
  const seq: Record<string, number> = {}
  const pages: Record<string, number> = {}
  for (const c of cases) {
    const t = performance.now()
    const r = await renderCustomerRecordPdf(input(c))
    seq[c.id] = performance.now() - t
    pages[c.id] = (Buffer.from(r.bytes).toString('latin1').match(/\/Type\s*\/Page\b/g) ?? []).length
  }
  const afterSeq = process.memoryUsage()
  const peakSeq = { rss: peakRss, heap: peakHeap }

  // Today's approved v4/v5 renderer on the same records (warm after its own first render).
  await renderCustomerRecordPdf(input(cases[0], true))
  const legacy: Record<string, number> = {}
  for (const c of cases) { const t = performance.now(); await renderCustomerRecordPdf(input(c, true)); legacy[c.id] = performance.now() - t }

  // Concurrent burst: all thirteen requested at once through the real entry point (serialised).
  gc()
  resetPeak()
  const burstStart = performance.now()
  const latencies = await Promise.all(cases.map(async (c) => { const t = performance.now(); await renderCustomerRecordPdf(input(c)); return { id: c.id, latency: performance.now() - t } }))
  const burstTotal = performance.now() - burstStart
  const peakBurst = { rss: peakRss, heap: peakHeap }
  // Queue wait: a request's latency minus its own warm render time (the render itself is serialised, so the rest is waiting).
  const waits = latencies.map((l) => Math.max(0, l.latency - seq[l.id]))

  // Repeated runs: does memory keep growing (leak) or settle?
  const rssAfterRounds: number[] = []
  for (let round = 0; round < 3; round++) { for (const c of cases) await renderCustomerRecordPdf(input(c)); gc(); rssAfterRounds.push(MB(process.memoryUsage().rss)) }
  gc()
  const end = process.memoryUsage()
  clearInterval(sampler)
  console.log = log
  process.stdout.write(JSON.stringify({
    node: process.version, platform: `${process.platform} ${process.arch}`, gc_exposed: typeof (globalThis as { gc?: unknown }).gc === 'function',
    cold_first_render_ms: Math.round(cold),
    warm_sequential_ms: stats(Object.values(seq)), warm_sequential_by_case_ms: Object.fromEntries(Object.entries(seq).map(([k, v]) => [k, Math.round(v)])), pages,
    legacy_v4_v5_sequential_ms: stats(Object.values(legacy)),
    concurrent_burst: { requests: cases.length, total_ms: Math.round(burstTotal), latency_ms: stats(latencies.map((l) => l.latency)), queue_wait_ms: stats(waits) },
    memory_mb: {
      baseline: { rss: MB(base.rss), heap: MB(base.heapUsed) },
      after_sequential: { rss: MB(afterSeq.rss), heap: MB(afterSeq.heapUsed) }, peak_sequential: { rss: MB(peakSeq.rss), heap: MB(peakSeq.heap) },
      peak_concurrent_burst: { rss: MB(peakBurst.rss), heap: MB(peakBurst.heap) },
      rss_after_each_of_3_more_rounds: rssAfterRounds, end_after_gc: { rss: MB(end.rss), heap: MB(end.heapUsed) },
    },
  }, null, 1))
}

main().catch((e) => { clearInterval(sampler); process.stdout.write(JSON.stringify({ error: String((e as Error).stack ?? e) })); process.exit(1) })
