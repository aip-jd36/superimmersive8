/**
 * CR-DESIGN-2B — Institutional Trust presentation (local, inert). Acceptance tests for `08_Platform/implementation/cr-design-2a/
 * 05-CR-DESIGN-2B-ACCEPTANCE-CRITERIA.md` §3, plus the founder/PM clarifications of the 2B authorisation:
 *   1 caveat relocation only as authorised (C5), complete, consolidated, neutral order;  2 long content breaks (no clipping, no
 *   oversized unbreakable view);  3 D10 unchanged;  4 navigation copies told apart from substantive blocks;  5 the presentation
 *   configuration is actually consumed;  6 test-only approval of v6/v7 unreachable from Production;  7 drain gate untouched.
 */
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { approvedPdfTemplates } from '@/lib/creator-record/customer-flow/approved-inputs'
import { buildCustomerDocument, CustomerPdfRefusal, type CustomerDocumentModel } from '@/lib/creator-record/customer-pdf/document-model'
import { INSTITUTIONAL_TRUST_PRESENTATION, presentationFingerprint, type PresentationConfig } from '@/lib/creator-record/customer-pdf/presentation/institutional-trust'
import { templateFingerprint } from '@/lib/creator-record/customer-pdf/templates'
import { CREATOR_RECORD_V2_GENERATOR_VERSION } from '@/lib/creator-record-artifacts/renderers'
import { CUTOVER_VERSIONS, registeredPdfTemplateSet } from '@/test-support/registered-template-sets'
import { CAVEATS_POINTER, CONTENTS_HEADING, proposalDiff, proposalFileContent, readProposal, syntheticallyApproved2B } from '@/test-support/cr-design-2b/proposed-sets'
import { reviewCases, type ReviewCase } from '@/test-support/cr-design-2b/review-fixtures'
import type { CaseReport } from '@/test-support/cr-design-2b/render-review'

jest.setTimeout(900_000)

let CASES: ReviewCase[]
const issued = (c: ReviewCase) => ({ record_id: 'CR-2026-2B0000' + c.id.replace('P', '').padStart(2, '0'), issued_on: '2026-11-15' })
const caseOf = (id: string) => CASES.find((c) => c.id === id)!
function model(c: ReviewCase, set: { templates: unknown; approval: unknown } = syntheticallyApproved2B(c.schema), options = {}): CustomerDocumentModel {
  return buildCustomerDocument({ canonical: c.record.canonical, sha256: c.record.sha256, issued: issued(c), templates: set.templates, template_approval: set.approval as never }, options)
}
const approvedSet = (schema: 7 | 8) => registeredPdfTemplateSet(schema, CUTOVER_VERSIONS[schema])
const texts = (m: CustomerDocumentModel, id: string) => m.sections.find((s) => s.id === id)!.blocks.flatMap((b) => (b.kind === 'row' ? [b.label, b.value] : [b.text]))
/** A synthetically approved copy of a proposed set after `f` changes it (the approval follows the changed fingerprint). */
function changed(schema: 7 | 8, f: (t: Record<string, any>) => void) {
  const s = syntheticallyApproved2B(schema)
  const t = JSON.parse(JSON.stringify(s.templates))
  f(t)
  return { templates: t, approval: { ...s.approval, fingerprint: templateFingerprint(t) } }
}

beforeAll(async () => { CASES = await reviewCases() })

describe('proposals: v4/v5 carried verbatim, pending, registered nowhere (clarification 6)', () => {
  test.each([7, 8] as const)('schema %s: only version, presentation and navigation differ from the approved base', (schema) => {
    expect(proposalDiff(schema)).toEqual(['navigation', 'presentation', 'version'])
    const p = readProposal(schema)
    expect(p.templates.navigation).toEqual({ contents_heading: CONTENTS_HEADING, caveats_pointer: CAVEATS_POINTER })
    expect(p.templates.presentation).toEqual({ contract: 'si8/creator-record-pdf-presentation', version: 1, fingerprint: presentationFingerprint(INSTITUTIONAL_TRUST_PRESENTATION) })
    expect(p.proposed_approval).toMatchObject({ lifecycle: 'pending', authority: null, decision_date: null })
    expect(p.fingerprints.pdf).toBe(templateFingerprint(p.templates))
  })
  test.each([7, 8] as const)('schema %s: the committed proposal is exactly what the builder produces', (schema) => {
    expect(readProposal(schema)).toEqual(JSON.parse(JSON.stringify(proposalFileContent(schema))))
  })
  test('Production selects v4 / v5, no set carrying a presentation, and the generator is unchanged', () => {
    for (const schema of [7, 8] as const) {
      const a = approvedPdfTemplates(undefined, { id: 'si8/creator-record-v2-record', version: schema })
      expect(a.approval?.version).toBe(CUTOVER_VERSIONS[schema])
      expect((a.templates as Record<string, unknown>).presentation).toBeUndefined()
      expect((a.templates as Record<string, unknown>).navigation).toBeUndefined()
    }
    const sources = readFileSync(join(__dirname, '../../lib/creator-record/governed/sources.ts'), 'utf8')
    expect(sources).not.toMatch(/v6-schema7|v7-schema8|si8\/creator-record-pdf-presentation/)
    expect(CREATOR_RECORD_V2_GENERATOR_VERSION).toBe('creator-record-v2-pdf-v3')
  })
  test('the proposed set cannot render without an approval (as pending)', () => {
    const p = readProposal(8)
    expect(() => model(caseOf('P4'), { templates: p.templates, approval: p.proposed_approval })).toThrow(CustomerPdfRefusal)
  })
})

describe('legacy sets are drawn exactly as before', () => {
  test('a v4/v5 model has no presentation, no navigation copies, the overview caveat panel and no pointer', () => {
    for (const c of CASES) {
      const m = model(c, approvedSet(c.schema))
      expect(m.design).toBeUndefined()
      expect(m.navigation_copies).toBeUndefined()
      expect(m.sections.flatMap((s) => s.blocks).some((b) => b.kind !== 'row' && (b.text === CAVEATS_POINTER || b.text === CONTENTS_HEADING))).toBe(false)
    }
  })
})

describe('presentation reference: fail closed', () => {
  test('tampered presentation fingerprint', () => {
    expect(() => model(caseOf('P1'), changed(7, (t) => { t.presentation.fingerprint = '0'.repeat(64) }))).toThrow('templates_presentation_mismatch')
  })
  test('unknown contract or version', () => {
    expect(() => model(caseOf('P1'), changed(7, (t) => { t.presentation.version = 2 }))).toThrow('templates_presentation_unknown')
  })
  test('navigation without presentation', () => {
    expect(() => model(caseOf('P1'), changed(7, (t) => { delete t.presentation }))).toThrow('templates_presentation_invalid')
  })
  test('presentation without the readiness block', () => {
    expect(() => model(caseOf('P1'), changed(7, (t) => { delete t.readiness_summary }))).toThrow('templates_presentation_invalid')
  })
})

describe('the presentation configuration is consumed (clarification 5)', () => {
  test('font files match their pinned hashes', () => {
    const dir = join(__dirname, '../../lib/creator-record/customer-pdf/fonts')
    const f = INSTITUTIONAL_TRUST_PRESENTATION.fonts
    for (const x of [...f.display.files, ...f.body.files, ...f.mono.files, f.fallback]) expect(createHash('sha256').update(readFileSync(join(dir, x.file))).digest('hex')).toBe(x.sha256)
  })
  test('text colours meet 4.5:1 on their grounds', () => {
    const c = INSTITUTIONAL_TRUST_PRESENTATION.colors
    const lum = (hex: string) => { const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)); return 0.2126 * r + 0.7152 * g + 0.0722 * b }
    const ratio = (a: string, b: string) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05) }
    const pairs: [string, string][] = [
      [c.ink, c.paper], [c.ink_secondary, c.paper], [c.ink_muted, c.paper], [c.ink_fine, c.paper], [c.ink_strong, c.paper], [c.navy, c.paper], [c.gold, c.paper_raised],
      [c.ink_strong, c.navy_tint], [c.ink, c.gold_note_bg], [c.gold_note_ink, c.gold_note_bg], [c.navy_on, c.navy],
      [c.slate_ink, c.cool_ground], [c.slate_secondary, c.cool_surface], [c.slate, c.cool_ground], [c.slate_fine, c.cool_ground],
    ]
    for (const [fg, bg] of pairs) expect([fg, bg, ratio(fg, bg) >= 4.5]).toEqual([fg, bg, true])
  })
})

describe('placement (clarifications 1, 3, 4)', () => {
  test('the caveat panel is printed once, after the considerations of its group, with the pointer only where it applies', () => {
    for (const c of CASES) {
      const m = model(c)
      const legacy = model(c, approvedSet(c.schema))
      const r = m.sections.find((s) => s.id === 'readiness_summary')!
      const lr = legacy.sections.find((s) => s.id === 'readiness_summary')!
      // Same blocks, same consolidations: only the pointers are added (navigation copies).
      const pointers = (m.navigation_copies ?? []).filter((x) => x.of === 'navigation.caveats_pointer').map((x) => x.index)
      expect(r.blocks.filter((_b, i) => !pointers.includes(i)).map((b) => JSON.stringify(b)).sort()).toEqual(lr.blocks.map((b) => JSON.stringify(b)).sort())
      expect(r.consolidated?.map((x) => x.texts)).toEqual(lr.consolidated?.map((x) => x.texts))
      for (const i of pointers) expect(r.blocks[i]).toEqual({ kind: 'paragraph', text: CAVEATS_POINTER, from: 'template' })
      // Neutral order: the considerations' reference values appear in the same order in both.
      const refs = (s: typeof r) => s.blocks.filter((b) => b.kind === 'row' && /^\d+$/.test(b.value)).map((b) => (b as { value: string }).value)
      expect(refs(r)).toEqual(refs(lr))
      // The pointer is "below": every pointer precedes the caveat panel's first block.
      const firstCaveat = r.blocks.findIndex((b) => b.kind === 'label' && b.text === 'Please note')
      for (const i of pointers) expect(i).toBeLessThan(firstCaveat)
    }
  })
  test('navigation copies are exactly the declared title (and its question) and the pointers; everything else prints once as before', () => {
    for (const c of CASES) {
      const m = model(c)
      const legacy = model(c, approvedSet(c.schema))
      const id = m.sections.find((s) => s.id === 'identity')!
      const copies = m.navigation_copies ?? []
      const title = copies.find((x) => x.of === 'declared_title')
      expect(title).toBeDefined()
      expect(texts(m, 'project')).toContain((id.blocks[title!.index] as { text: string }).text)
      expect(texts(legacy, 'project')).toContain((id.blocks[title!.index] as { text: string }).text)
      expect(copies.every((x) => x.of === 'declared_title' || x.of === 'declared_title_question' || x.of === 'navigation.caveats_pointer')).toBe(true)
    }
  })
  test('D10: no reading text enters the guidance, the index or the caveat panel; readings print only on the reading-register pages', () => {
    for (const c of CASES.filter((x) => x.schema === 8)) {
      const m = model(c)
      const docs = new Set(texts(m, 'documents').filter((t) => t.length > 12))
      const summary = texts(m, 'readiness_summary')
      const legacyDocs = new Set(texts(model(c, approvedSet(8)), 'documents').filter((t) => t.length > 12))
      for (const t of summary) if (docs.has(t)) expect(legacyDocs.has(t) && texts(model(c, approvedSet(8)), 'readiness_summary').includes(t)).toBe(true)
      expect(INSTITUTIONAL_TRUST_PRESENTATION.registers.reading_sections).toEqual(['documents'])
    }
  })
  test('R1 compact counts: the approved count sentences close "About" as one counts row, same strings and order as v4/v5', () => {
    for (const c of CASES) {
      const m = model(c)
      const about = m.sections.find((s) => s.id === 'about')!
      const counts = about.layout!.filter((n) => n.kind === 'box' && n.box === 'counts')
      expect(counts).toHaveLength(1)
      const idx = (counts[0] as { children: { index: number; hint: string }[] }).children
      expect(idx.every((k) => k.hint === 'count')).toBe(true)
      expect(idx.map((k) => k.index)).toEqual(Array.from({ length: idx.length }, (_, i) => about.blocks.length - idx.length + i))
      const legacyAbout = texts(model(c, approvedSet(c.schema)), 'about')
      const countTexts = idx.map((k) => (about.blocks[k.index] as { text: string }).text)
      expect(legacyAbout.slice(-countTexts.length)).toEqual(countTexts)
    }
  })
  test('D10 guards still refuse (integrated assessment with the reading layout)', () => {
    const c = caseOf('P4')
    expect(() => model(c, changed(8, (t) => { t.integrated_assessment = registeredPdfTemplateSet(8, 3).templates.integrated_assessment }))).toThrow(/readiness_layout_refused|templates_/)
  })
})

/** Rendering checks run with tsx (react-pdf does not load under Jest), as `customer-pdf-render-input.tsx` does. */
describe('rendered with the real entry point (clarifications 2 and 5)', () => {
  let out: { reports: CaseReport[]; unread: string[]; leaves: number; font_tamper: string; glyph: string; negative: Record<'intrusion' | 'wrong_page_count' | 'wrong_stamp' | 'wrong_text', string[]> }
  beforeAll(() => {
    const dir = mkdtempSync(join(tmpdir(), 'cr-design-2b-'))
    out = JSON.parse(execFileSync(process.execPath, [join(process.cwd(), 'node_modules', 'tsx', 'dist', 'cli.mjs'), '--tsconfig', 'tsconfig.json', join('test-support', 'cr-design-2b', 'render-checks.tsx'), dir], { cwd: process.cwd(), encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }))
  })
  test('all thirteen cases', () => expect(out.reports.map((r) => r.id)).toEqual(['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8', 'P9', 'P10', 'P11', 'P12', 'P13']))
  test.each(['exact_print', 'chrome_every_page', 'page_labels_ok', 'same_blocks_as_approved_set'] as const)('%s holds for every case', (k) => {
    expect(out.reports.filter((r) => !r[k]).map((r) => r.id)).toEqual([])
  })
  test('no orphan headings and no oversized unbreakable views', () => {
    expect(out.reports.flatMap((r) => r.orphan_headings.map((o) => `${r.id} ${o}`))).toEqual([])
    expect(out.reports.filter((r) => r.oversize_warnings > 0).map((r) => r.id)).toEqual([])
  })
  test('every leaf of the presentation configuration is read while building and rendering', () => {
    expect(out.leaves).toBeGreaterThan(50)
    expect(out.unread).toEqual([])
  })
  test('a font whose bytes do not match the configuration refuses before rendering', () => expect(out.font_tamper).toMatch('font_fingerprint_mismatch'))
  test('text no font can print refuses (text_unsupported), as before', () => expect(out.glyph).toMatch('text_unsupported'))

  // CR-DESIGN-2B-R1: the decisive checks read the PDF BYTES (PyMuPDF, `verify_pdf_bytes.py`), not the model or a layout pass. The
  // thirteen cases render one after another in one process, as a server does (the apostrophe defect depended on render history).
  test('PDF bytes: disclosures, page numbers, bounds, overlap, obscured text, reserved bands, text and search — every case', () => {
    expect(out.reports.flatMap((r) => (r.bytes_check?.failures ?? ['no byte check']).map((f) => `${r.id} ${f}`))).toEqual([])
    for (const r of out.reports) {
      expect(r.bytes_check!.pages).toBe(r.pages)
      expect(r.bytes_check!.strings_checked).toBeGreaterThan(50)
    }
  })
  test('PDF bytes: curly apostrophes and international text are searchable (probes exist and are found)', () => {
    expect(out.reports.reduce((n, r) => n + r.bytes_check!.probes_checked, 0)).toBeGreaterThan(13)
    expect(out.reports.find((r) => r.id === 'P12')!.bytes_check!.probes_checked).toBeGreaterThan(5)
  })
  test('R2: the "What you told us" panel follows the guidance index where there is one, and keeps its place where there is none', () => {
    for (const c of CASES) {
      const m = model(c)
      const r = m.sections.find((s) => s.id === 'readiness_summary')!
      const panel = r.layout!.findIndex((n) => n.kind === 'box' && n.box === 'panel' && n.children[0]?.kind === 'block' && (r.blocks[n.children[0].index] as { text?: string }).text === 'What you told us')
      const index = r.layout!.findIndex((n) => n.kind === 'box' && n.box === 'map')
      if (panel < 0) continue
      if (index >= 0) expect([c.id, panel > index]).toEqual([c.id, true])
      const legacy = model(c, approvedSet(c.schema)).sections.find((s) => s.id === 'readiness_summary')!
      const legacyPanel = legacy.layout!.findIndex((n) => n.kind === 'box' && n.box === 'panel')
      const legacyIndex = legacy.layout!.findIndex((n) => n.kind === 'box' && n.box === 'map')
      if (legacyIndex >= 0) expect(legacyPanel).toBeLessThan(legacyIndex)
    }
  })
  test('the byte verifier detects intrusion into the reserved bands, a wrong page count, a wrong disclosure and missing text', () => {
    expect(out.negative.intrusion.join('\n')).toMatch(/outside the content region|non-background pixels/)
    expect(out.negative.wrong_page_count.join('\n')).toMatch(/page label 'Page 1 of 99' not found/)
    expect(out.negative.wrong_stamp.join('\n')).toMatch(/running stamp not extractable/)
    expect(out.negative.wrong_text.join('\n')).toMatch(/printed strings not extractable/)
  })
})

/**
 * CR-DESIGN-2B-R2: the glyph-character correction across sequential and concurrent generation in one process. Synthetic records share
 * glyphs (Inter Δ/∆, Ω/Ω; Noto 〈/〈); every PDF's exact Unicode text is checked from its bytes.
 */
describe('text layer: one record never contaminates another (sequential and concurrent, one process)', () => {
  type Render = { run: string; record: string; ok: boolean; failures: string[]; title_in_model: boolean }
  let iso: { titles: Record<string, string>; renders: Render[]; conflict: { assigned: number; conflicts: string[] }; error?: string }
  beforeAll(() => {
    const dir = mkdtempSync(join(tmpdir(), 'cr-design-2b-iso-'))
    iso = JSON.parse(execFileSync(process.execPath, [join(process.cwd(), 'node_modules', 'tsx', 'dist', 'cli.mjs'), '--tsconfig', 'tsconfig.json', join('test-support', 'cr-design-2b', 'glyph-isolation.tsx'), dir], { cwd: process.cwd(), encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }))
  })
  test('every record keeps its exact Unicode text, rendered one after another', () => {
    const seq = iso.renders.filter((r) => r.run === 'sequential')
    expect(seq.length).toBe(10)
    expect(seq.every((r) => r.title_in_model)).toBe(true)
    expect(seq.flatMap((r) => r.failures.map((f) => `${r.record} ${f}`))).toEqual([])
  })
  test('every record keeps its exact Unicode text, rendered concurrently', () => {
    const conc = iso.renders.filter((r) => r.run === 'concurrent')
    expect(conc.length).toBe(10)
    expect(conc.flatMap((r) => r.failures.map((f) => `${r.record} ${f}`))).toEqual([])
  })
  test('control: drawn without the correction, a record takes the previous record\'s characters (the check sees it)', () => {
    const control = iso.renders.filter((r) => r.run === 'control-uncorrected')
    expect(control).toHaveLength(1)
    expect(control[0].ok).toBe(false)
    expect(control[0].failures.join('\n')).toContain(iso.titles.B)
  })
  test('within one document, two characters sharing a glyph are reported; approved wording keeps its character', () => {
    expect(iso.conflict.conflicts).toContain('SI8 Inter 400: U+02BC shares a glyph with U+2019')
  })
})
