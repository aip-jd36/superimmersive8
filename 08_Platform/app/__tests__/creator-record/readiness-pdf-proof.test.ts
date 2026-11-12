/**
 * CR-SUM-PDF-A — governance and compatibility checks for the synthetic PDF proof (model level; the PDFs themselves are
 * rendered by `test-support/readiness-pdf-proof-render.tsx` with tsx, because @react-pdf/renderer does not load under Jest).
 * All records, templates and approvals here are synthetic test fixtures; nothing is approved or registered.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { approvedPdfTemplates } from '@/lib/creator-record/customer-flow/approved-inputs'
import { buildCustomerDocument, documentModelCanonical, documentText, type CustomerDocumentModel } from '@/lib/creator-record/customer-pdf/document-model'
import { CUSTOMER_RECORD_SCHEMA } from '@/lib/creator-record/customer-record/record'
import { CREATOR_RECORD_GOVERNANCE_AUTHORITY as GOV, CREATOR_RECORD_PUBLICATION_LEDGER } from '@/lib/creator-record/governed/sources'
import { SYNTHETIC_TEST_EXAMINATION_PDF as EXAM_PDF } from '@/lib/creator-record/governed/synthetic-test-authority'
import { renderReadinessSummary, type RenderedReadinessSummary } from '@/lib/creator-record/readiness-summary/render'
import { buildReadinessSummary, type ReadinessSummary } from '@/lib/creator-record/readiness-summary/summary'
import { canonicalJson } from '@/lib/creator-record/record-core/canonical'
import { schema8Fixture } from '@/test-support/customer-record-schema8'
import { PROOF_BANNER, PROOF_SECTION_ID, withReadinessSection } from '@/test-support/readiness-pdf-proof'
import {
  ARTLIST_APPROVED_TEST_COPY, liveRecord, PROPOSED_RENDER_TEMPLATES, PROPOSED_SUMMARY_TEMPLATES, READINESS_SCENARIOS,
  SYNTHETIC_PROOF_AUTHORITY, SYNTHETIC_RENDER_APPROVAL, SYNTHETIC_SUMMARY_APPROVAL,
} from '@/test-support/readiness-scenarios'

type Built = { canonical: string; sha256: string; record: { schema_version: number } }
const ISSUED = { record_id: 'CR-2026-0000000A', issued_on: '2026-11-12' }
function proofOf(b: Built, tpl = approvedPdfTemplates(GOV as never, { id: CUSTOMER_RECORD_SCHEMA, version: b.record.schema_version }) as { templates: unknown; approval: any }) {
  const model = buildCustomerDocument({ canonical: b.canonical, sha256: b.sha256, issued: ISSUED, templates: tpl.templates, template_approval: tpl.approval })
  const summary = buildReadinessSummary({ canonical: b.canonical, sha256: b.sha256, templates: PROPOSED_SUMMARY_TEMPLATES, approval: SYNTHETIC_SUMMARY_APPROVAL })
  const rendered = renderReadinessSummary(summary, PROPOSED_RENDER_TEMPLATES, SYNTHETIC_RENDER_APPROVAL)
  const before = documentModelCanonical(model)
  const proof = withReadinessSection(model, rendered, PROPOSED_SUMMARY_TEMPLATES, PROPOSED_RENDER_TEMPLATES)
  return { model, summary, rendered, proof, before }
}
const renderedTexts = (r: RenderedReadinessSummary) => r.blocks.flatMap((b) => (b.kind === 'row' ? [b.label, b.value] : [b.text]))
const sectionTexts = (m: CustomerDocumentModel, i: number) => m.sections[i].blocks.flatMap((b) => (b.kind === 'row' ? [b.label, b.value] : [b.text]))

const CASES: Record<string, ReturnType<typeof proofOf>> = {}
let S8: ReturnType<typeof proofOf>
let S8_FIXTURE: Awaited<ReturnType<typeof schema8Fixture>>
beforeAll(async () => {
  for (const [k, build] of Object.entries(READINESS_SCENARIOS)) CASES[k] = proofOf(build())
  S8_FIXTURE = await schema8Fixture({ docs: [{ tool_index: 0 }, { tool_index: 0 }] })
  S8 = proofOf(S8_FIXTURE, { templates: EXAM_PDF.templates, approval: EXAM_PDF.approval })
})

describe('the proof leaves the existing document untouched', () => {
  test('the original model is not mutated, and its sections follow the proof section unchanged and in order', () => {
    for (const c of [...Object.values(CASES), S8]) {
      expect(documentModelCanonical(c.model)).toBe(c.before)
      expect(canonicalJson(c.proof.sections.slice(1))).toBe(canonicalJson(c.model.sections))
      expect(c.proof.sections[0].id).toBe(PROOF_SECTION_ID)
      expect(c.proof.marking).toEqual(c.model.marking)
      expect(c.proof.identity).toEqual(c.model.identity)
    }
  })
  test('the unmodified model is the live path’s own output (built by the unchanged buildCustomerDocument with the live approved set)', () => {
    for (const [k, build] of Object.entries(READINESS_SCENARIOS)) {
      const b = build()
      const tpl = approvedPdfTemplates(GOV as never, { id: CUSTOMER_RECORD_SCHEMA, version: b.record.schema_version })
      const again = buildCustomerDocument({ canonical: b.canonical, sha256: b.sha256, issued: ISSUED, templates: tpl.templates, template_approval: tpl.approval })
      expect([k, documentModelCanonical(again)]).toEqual([k, CASES[k].before])
    }
  })
})

describe('governance of the proof section', () => {
  test('its text is exactly the banner followed by the renderer’s own output, nothing added, changed or dropped', () => {
    for (const c of [...Object.values(CASES), S8]) expect(sectionTexts(c.proof, 0)).toEqual([PROOF_BANNER, ...renderedTexts(c.rendered)])
  })
  test('text tagged as record text is record text; everything else is draft template wording', () => {
    const tmpl = new Set<string>()
    const walk = (v: unknown) => { if (typeof v === 'string') tmpl.add(v); else if (v && typeof v === 'object') Object.values(v).forEach(walk) }
    walk(PROPOSED_SUMMARY_TEMPLATES)
    walk(PROPOSED_RENDER_TEMPLATES)
    for (const [k, c] of Object.entries(CASES)) {
      const canonical = READINESS_SCENARIOS[k as keyof typeof READINESS_SCENARIOS]().canonical
      for (const b of c.proof.sections[0].blocks) {
        const parts = b.kind === 'row' ? [[b.label, b.label_from], [b.value, b.value_from]] as const : [[b.text, b.from]] as const
        for (const [text, from] of parts) {
          if (from === 'record') expect([k, text, canonical.includes(JSON.stringify(text))]).toEqual([k, text, true])
          else expect([k, text, tmpl.has(text) || text === PROOF_BANNER || /^[1-9]\d*(, [1-9]\d*)*$/.test(text)]).toEqual([k, text, true])
        }
      }
    }
  })
  test('no conclusion beyond the summary: one per consideration, verbatim', () => {
    for (const c of [...Object.values(CASES), S8]) {
      const labels = new Set(Object.values(PROPOSED_SUMMARY_TEMPLATES.conclusion_labels))
      const shown = c.proof.sections[0].blocks.filter((b) => b.kind === 'row' && labels.has(b.value)).map((b) => (b.kind === 'row' ? b.value : ''))
      expect(shown).toEqual(c.summary.groups.flatMap((g) => g.considerations).map((x) => x.conclusion.label))
    }
  })
  test('D10: no document id, reading value or excerpt appears in the proof section', () => {
    const ids = S8_FIXTURE.record.documents.items.map((d) => d.document_id)
    const readings = new Set<string>()
    for (const d of S8_FIXTURE.record.documents.items) if (d.examination !== 'not_examined') for (const o of (d.examination as any).envelope.observations) for (const t of [o.value, o.excerpt]) if (typeof t === 'string') readings.add(t)
    const declared = new Set<string>()
    const walk = (v: unknown) => { if (typeof v === 'string') declared.add(v); else if (v && typeof v === 'object') Object.values(v).forEach(walk) }
    walk(S8_FIXTURE.record.declarations)
    for (const t of sectionTexts(S8.proof, 0)) {
      for (const id of ids) expect(t.includes(id)).toBe(false)
      if (readings.has(t)) expect(declared.has(t)).toBe(true)
    }
    expect(S8.summary.groups.flatMap((g) => g.considerations).some((x) => x.documents.length > 0)).toBe(true)
  })
  test('schema 7 (live approved set v1) and schema 8 (synthetic set) both build', () => {
    expect(Object.values(CASES).every((c) => c.summary.identity.schema_version === 7)).toBe(true)
    expect(S8.summary.identity.schema_version).toBe(8)
  })
})

describe('determinism, version isolation and test-only material', () => {
  test('the proof is byte-identical for the same record, and another version leaves it unchanged', () => {
    const k = '1-runway-higgsfield'
    const again = proofOf(READINESS_SCENARIOS[k]())
    expect(documentModelCanonical(again.proof)).toBe(documentModelCanonical(CASES[k].proof))
    const v2 = proofOf(liveRecord('PREP-PDFA-1', { P1: ['Synthetic PDF proof video'], P3: ['own_channels'], F1: ['TW'], F2: ['TW'], L1: ['no'], H1: ['edited'], M0: ['none'] }, [{ T1: ['runway-gen3'], T3: ['not_sure'], T4: ['May 2026'] }], 2))
    expect(v2.summary.identity.record_version).toBe(2)
    expect(v2.summary.identity.snapshot_sha256).not.toBe(CASES[k].summary.identity.snapshot_sha256)
    expect(documentModelCanonical(proofOf(READINESS_SCENARIOS[k]()).proof)).toBe(documentModelCanonical(CASES[k].proof))
  })
  test('the Artlist entry is a test copy; the live ledger still has no Artlist entry; approvals are synthetic', () => {
    expect(CREATOR_RECORD_PUBLICATION_LEDGER.some((e) => e.claim_id.includes('ARTLIST'))).toBe(false)
    expect(ARTLIST_APPROVED_TEST_COPY.approver).toBe('SYNTHETIC TEST APPROVER')
    expect(SYNTHETIC_SUMMARY_APPROVAL.authority).toBe(SYNTHETIC_PROOF_AUTHORITY)
    expect(SYNTHETIC_RENDER_APPROVAL.authority).toBe(SYNTHETIC_PROOF_AUTHORITY)
    expect(SYNTHETIC_PROOF_AUTHORITY).toMatch(/SYNTHETIC TEST APPROVAL/)
    // The proof banner is visible on every proof document.
    for (const c of Object.values(CASES)) expect(documentText(c.proof)).toContain(PROOF_BANNER)
  })
  test('no application code imports the proof, the scenarios, the renderer or the summary', () => {
    const root = join(__dirname, '../..')
    const files: string[] = []
    const walk = (d: string) => {
      for (const n of readdirSync(d)) {
        if (['node_modules', '.next', '__tests__', '.git'].includes(n)) continue
        const p = join(d, n)
        if (statSync(p).isDirectory()) walk(p)
        else if (/\.(ts|tsx|js|mjs)$/.test(n)) files.push(p)
      }
    }
    for (const d of ['app', 'lib', 'components', 'scripts']) {
      try { walk(join(root, d)) } catch { /* folder absent */ }
    }
    const own = join(root, 'lib/creator-record/readiness-summary')
    // CR-SUM-PDF-B1: the customer document model is the one gated importer of the summary; nothing imports the test-side proof.
    const importers = files.filter((p) => !p.startsWith(own) && /from ['"][^'"]*(readiness-summary|readiness-pdf-proof|readiness-scenarios)/.test(readFileSync(p, 'utf8'))).map((p) => relative(root, p).split(sep).join('/'))
    expect(importers).toEqual(['lib/creator-record/customer-pdf/document-model.ts'])
  })
})
