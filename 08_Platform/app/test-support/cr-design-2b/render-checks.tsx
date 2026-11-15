/**
 * CR-DESIGN-2B — TEST ONLY, run with tsx (react-pdf does not load under Jest; see `../customer-pdf-render-input.tsx`). Runs every
 * check that needs the real renderer and prints one JSON object for `__tests__/creator-record/cr-design-2b.test.ts`:
 *   - `reports`: the thirteen review cases (`./render-review`);
 *   - `unread`: configuration leaves NOT read while building and rendering three cases with an instrumented configuration;
 *   - `font_tamper` / `glyph`: the refusal each produces.
 * Usage: tsx test-support/cr-design-2b/render-checks.tsx <outDir>
 */
import { renderCustomerRecordPdf } from '@/lib/creator-record/customer-pdf/CustomerRecordPDF'
import { INSTITUTIONAL_TRUST_PRESENTATION, type PresentationConfig } from '@/lib/creator-record/customer-pdf/presentation/institutional-trust'
import { templateFingerprint } from '@/lib/creator-record/customer-pdf/templates'
import { syntheticallyApproved2B } from './proposed-sets'
import { renderReview } from './render-review'
import { reviewCases, type ReviewCase } from './review-fixtures'

const issued = (c: ReviewCase) => ({ record_id: 'CR-2026-2B0000' + c.id.replace('P', '').padStart(2, '0'), issued_on: '2026-11-15' })
const refusal = async (p: Promise<unknown>) => { try { await p; return 'rendered' } catch (e) { return e instanceof Error ? e.message : String(e) } }

async function main(outDir: string) {
  const log = console.log
  console.log = () => {}
  const reports = await renderReview(outDir)
  const cases = await reviewCases()
  const caseOf = (id: string) => cases.find((c) => c.id === id)!
  const input = (c: ReviewCase, t?: Record<string, unknown>) => {
    const s = syntheticallyApproved2B(c.schema)
    const templates = t ?? s.templates
    return { canonical: c.record.canonical, sha256: c.record.sha256, issued: issued(c), templates, template_approval: { ...s.approval, fingerprint: templateFingerprint(templates) } }
  }

  // Clarification 5: every configuration leaf must be read.
  const read = new Set<string>()
  const track = (v: unknown, path: string): unknown => (v && typeof v === 'object'
    ? new Proxy(v as object, { get: (o, k) => (typeof k === 'string' ? track((o as Record<string, unknown>)[k], path ? `${path}.${k}` : k) : (o as Record<string | symbol, unknown>)[k]) })
    : (read.add(path), v))
  const leaves: string[] = []
  const walk = (v: unknown, p: string) => (v && typeof v === 'object' ? Object.entries(v).forEach(([k, x]) => walk(x, p ? `${p}.${k}` : k)) : leaves.push(p))
  walk(INSTITUTIONAL_TRUST_PRESENTATION, '')
  const tracked = track(INSTITUTIONAL_TRUST_PRESENTATION, '') as PresentationConfig
  for (const id of ['P4', 'P5', 'P10']) await renderCustomerRecordPdf(input(caseOf(id)), { configOverride: tracked })
  const unread = leaves.filter((l) => !read.has(l))

  const bad = JSON.parse(JSON.stringify(INSTITUTIONAL_TRUST_PRESENTATION)) as PresentationConfig
  ;(bad.fonts.body.files[0] as { sha256: string }).sha256 = 'f'.repeat(64)
  const font_tamper = await refusal(renderCustomerRecordPdf(input(caseOf('P1')), { configOverride: bad }))

  const t = JSON.parse(JSON.stringify(syntheticallyApproved2B(7).templates))
  t.navigation.contents_heading = 'What this record contains \u{1F600}'
  const glyph = await refusal(renderCustomerRecordPdf(input(caseOf('P1'), t)))

  console.log = log
  process.stdout.write(JSON.stringify({ reports, unread, leaves: leaves.length, font_tamper, glyph }))
}

main(process.argv[2]).catch((e) => { process.stdout.write(JSON.stringify({ error: String(e) })); process.exit(1) })
