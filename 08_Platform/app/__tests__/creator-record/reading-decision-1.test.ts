/**
 * CR-PDF-DECISION-1 — founder direction: automated document readings are presented separately from the commercial-readiness
 * guidance. In the PROPOSED reading layout (v4 / v5 under a synthetic approval; nothing registered):
 *   - Understand / Examine (the readiness summary section) carry nothing derived from a document: no integrated assessment, no
 *     reading value or excerpt, no document-to-condition relevance or comparison language;
 *   - Verify: the documents section carries every authorized reading, labelled automated and unchecked;
 *   - W1 (conditional About opening), U1 singular/plural, W2/W3 neutral non-comparison statements (all PROPOSED);
 *   - D5: a list label that would stand alone heads the note that explains it.
 * The approved v3 set (with its integrated assessment) is asserted unchanged in `reading-layout.test.ts` / the legacy baseline.
 */
import { approvedPdfTemplates } from '@/lib/creator-record/customer-flow/approved-inputs'
import { buildCustomerDocument, type Block, type CustomerDocumentModel } from '@/lib/creator-record/customer-pdf/document-model'
import type { LayoutNode } from '@/lib/creator-record/customer-pdf/readiness-layout'
import type { CustomerPdfTemplates } from '@/lib/creator-record/customer-pdf/templates'
import { CUSTOMER_RECORD_SCHEMA } from '@/lib/creator-record/customer-record/record'
import { CREATOR_RECORD_GOVERNANCE_AUTHORITY as GOV } from '@/lib/creator-record/governed/sources'
import { legacyCases } from '@/test-support/readiness-legacy-cases'
import { proposedTemplateSet, syntheticallyApproved } from '@/test-support/readiness-proposed-templates'
import { liveRecord } from '@/test-support/readiness-scenarios'

const ISSUED = { record_id: 'CR-2026-0000000D', issued_on: '2026-11-13' }
type Rec = { canonical: string; sha256: string; record: { schema_version: number } }
const SETS = { 7: syntheticallyApproved(proposedTemplateSet(7)), 8: syntheticallyApproved(proposedTemplateSet(8)) }
const T = (s: 7 | 8) => SETS[s].templates as unknown as CustomerPdfTemplates & { readiness_summary: { render: Record<string, any> } }
const build = (r: Rec) => buildCustomerDocument({ canonical: r.canonical, sha256: r.sha256, issued: ISSUED, templates: SETS[r.record.schema_version as 7 | 8].templates, template_approval: SETS[r.record.schema_version as 7 | 8].approval })
const textsOf = (b: Block) => (b.kind === 'row' ? [b.label, b.value] : [b.text])
const sectionTexts = (m: CustomerDocumentModel, id: string) => m.sections.find((s) => s.id === id)!.blocks.flatMap(textsOf)
const BASE = { P1: ['Decision video'], P3: ['own_channels'], F1: ['TW'], F2: ['TW'], L1: ['no'], H1: ['edited'] }
const record = (id: string, answers: Record<string, string[]>, tools: Record<string, string[]>[]) => liveRecord(id, { ...BASE, ...answers }, tools) as unknown as Rec
type Box = Extract<LayoutNode, { kind: 'box' }>
const boxes = (ns: readonly LayoutNode[], kind: string): Box[] => ns.flatMap((n) => (n.kind === 'box' ? [...(n.box === kind ? [n] : []), ...boxes(n.children, kind)] : []))
const leaves = (ns: readonly LayoutNode[]): Extract<LayoutNode, { kind: 'block' }>[] => ns.flatMap((n) => (n.kind === 'block' ? [n] : leaves(n.children)))

let S8: { name: string; rec: Rec }[] = []
let COMPLEX: Rec
beforeAll(async () => {
  const cases = await legacyCases()
  S8 = cases.filter((c) => c.record.record.schema_version === 8 && c.templates === 'synthetic8').map((c) => ({ name: c.name, rec: c.record as unknown as Rec }))
  COMPLEX = cases.find((c) => c.name === 's7-5-unresolved-and-topic-caps')!.record as unknown as Rec
})

describe('separation: document readings never reach the guidance', () => {
  test('the readiness summary section has no reading, excerpt or document-relevance statement; the documents section has every reading', () => {
    const v3 = approvedPdfTemplates(GOV as never, { id: CUSTOMER_RECORD_SCHEMA, version: 8 }).templates as CustomerPdfTemplates
    const iaPhrases = [v3.integrated_assessment!.heading, v3.integrated_assessment!.status_labels.relevant_observation_unverified, v3.integrated_assessment!.not_compared]
    expect(S8.length).toBeGreaterThan(2)
    for (const c of S8) {
      const m = build(c.rec)
      const doc = JSON.parse(c.rec.canonical)
      const declared = new Set<string>()
      const walk = (v: unknown) => { if (typeof v === 'string') declared.add(v); else if (v && typeof v === 'object') Object.values(v).forEach(walk) }
      walk(doc.declarations)
      const readings: string[] = []
      for (const d of doc.documents.items) if (d.examination !== 'not_examined') for (const o of d.examination.envelope.observations) for (const t of [o.value, o.excerpt]) if (typeof t === 'string' && !declared.has(t)) readings.push(t)
      const summary = sectionTexts(m, 'readiness_summary')
      const documents = sectionTexts(m, 'documents')
      // Readings the approved v3 documents section prints verbatim (classification codes are printed as their labels).
      const v3set = approvedPdfTemplates(GOV as never, { id: CUSTOMER_RECORD_SCHEMA, version: 8 }) as { templates: unknown; approval: any }
      const v3docs = buildCustomerDocument({ canonical: c.rec.canonical, sha256: c.rec.sha256, issued: ISSUED, templates: v3set.templates, template_approval: v3set.approval }).sections.find((s) => s.id === 'documents')!.blocks.flatMap(textsOf)
      const printed = readings.filter((r) => v3docs.includes(r))
      expect([c.name, printed.length > 0 || readings.length === 0]).toEqual([c.name, true])
      for (const r of readings) expect([c.name, r, summary.includes(r)]).toEqual([c.name, r, false])
      for (const r of printed) {
        expect([c.name, r, documents.includes(r)]).toEqual([c.name, r, true])
      }
      for (const p of iaPhrases) expect([c.name, p, m.sections.some((s) => s.blocks.flatMap(textsOf).some((t) => t.includes(p)))]).toEqual([c.name, p, false])
      // No relevance / validation / comparison verdict about documents anywhere in the summary section.
      for (const t of summary) expect([c.name, t, /document/i.test(t) && /(relevant to this condition|matches|satisf|confirm|contradict)/i.test(t)]).toEqual([c.name, t, false])
    }
  })
  test('the documents section labels readings as automated and unchecked, and states they were not compared or used', () => {
    const E = T(8).examination!
    for (const c of S8) {
      const docs = sectionTexts(build(c.rec), 'documents')
      expect(docs).toEqual(expect.arrayContaining(E.intro))
      expect(E.intro[1]).toMatch(/no person checked it/)
      expect(E.intro[2]).toBe('Readings were not compared with what you told SI8, and were not used to select or qualify the guidance in section 2.')
    }
  })
  test('W2: the "did not do" line no longer says SI8 drew conclusions from a comparison', () => {
    const v3 = approvedPdfTemplates(GOV as never, { id: CUSTOMER_RECORD_SCHEMA, version: 8 }).templates as CustomerPdfTemplates
    expect(v3.sections.not_done.lines[4]).toBe('SI8 drew no conclusion from comparing your documents with your declarations.') // approved v3: unchanged
    expect(T(8).sections.not_done.lines[4]).toBe('SI8 did not compare your documents, or their readings, with what you told SI8 or with the guidance.')
    for (const c of S8) expect(sectionTexts(build(c.rec), 'not_done')).toContain(T(8).sections.not_done.lines[4])
  })
})

describe('W1: conditional About opening', () => {
  test('no consideration: the proposed opening replaces the approved one (which speaks of tools you named)', () => {
    const r = record('DECISION1-NONE', { M0: ['none'] }, [{ T1: ['not_sure'], T3: ['not_sure'], T4: ['May 2026'] }])
    const about = sectionTexts(build(r), 'about')
    expect(about[1]).toBe(T(7).readiness_summary.render.about_intro_no_guidance)
    expect(about).not.toContain(T(7).sections.about.intro[0])
  })
  test('at least one consideration: the approved opening is kept unchanged', () => {
    const r = record('DECISION1-SOME', { M0: ['none'] }, [{ T1: ['runway-gen3'], T3: ['Standard'], T4: ['May 2026'] }])
    const about = sectionTexts(build(r), 'about')
    expect(about[1]).toBe(T(7).sections.about.intro[0])
    expect(about).not.toContain(T(7).readiness_summary.render.about_intro_no_guidance)
  })
  test('schema 8 has its own form, naming the documents', () => {
    expect(T(8).readiness_summary.render.about_intro_no_guidance).toMatch(/what any documents you added appear to show/)
  })
})

describe('U1: singular and plural', () => {
  test('one unidentified answer → singular; two → plural', () => {
    const U = T(7).readiness_summary.render.guidance_unidentified
    const one = sectionTexts(build(record('DECISION1-U1A', { M0: ['none'] }, [{ T1: ['not_sure'], T3: ['not_sure'], T4: ['May 2026'] }])), 'readiness_summary')
    expect(one).toContain(U.one)
    expect(one).not.toContain(U.other)
    const two = sectionTexts(build(record('DECISION1-U1B', { M0: ['music'], M1: ['not_sure'], M2: ['not_sure'] }, [{ T1: ['not_sure'], T3: ['not_sure'], T4: ['May 2026'] }])), 'readiness_summary')
    expect(two).toContain(U.other)
    expect(two).not.toContain(U.one)
    expect(two.slice(two.indexOf(U.other) + 1, two.indexOf(U.other) + 3)).toEqual(['Which AI tool did you use?', 'Where did the music come from?'])
  })
})

describe('D5: a list label heads the note that explains it', () => {
  test('the complex record: "Subjects shown as not established" sits with its note, never alone in an open box', () => {
    const m = build(COMPLEX)
    const sec = m.sections.find((s) => s.id === 'readiness_summary')!
    const label = T(7).readiness_summary.render.topic_qualified_heading as string
    // No open box consisting of the label alone.
    for (const b of boxes(sec.layout!, 'open')) {
      const ls = leaves(b.children)
      expect(ls.length === 1 && (sec.blocks[ls[0].index] as { text?: string }).text === label).toBe(false)
    }
    // The label is immediately followed by the consideration's note, in one unit.
    const units = boxes(sec.layout!, 'keep').filter((k) => k.children.length === 2 && k.children[0].kind === 'block' && (sec.blocks[(k.children[0] as { index: number }).index] as { text?: string }).text === label)
    expect(units.length).toBeGreaterThan(0)
    for (const u of units) expect((u.children[1] as { hint: string }).hint).toBe('note')
  })
})
