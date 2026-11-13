/**
 * CR-PDF-IMPL-1 — the three-level Creator Record PDF (reading hierarchy): composition, wording binding, governance boundaries and
 * isolation from Production issuance. All template sets with the readiness block here are the PROPOSED sets (v4 / v5) under a
 * synthetic approval of exactly their content; nothing is registered. Records are real, locally built.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { approvedPdfTemplates } from '@/lib/creator-record/customer-flow/approved-inputs'
import { buildCustomerDocument, documentText, READING_HIERARCHY_PRESENTATION, type Block, type CustomerDocumentModel } from '@/lib/creator-record/customer-pdf/document-model'
import { layoutOrder, type LayoutNode } from '@/lib/creator-record/customer-pdf/readiness-layout'
import { CUSTOMER_PDF_READINESS_EXAMINATION_SECTIONS, CUSTOMER_PDF_READINESS_SECTIONS, fill, type CustomerPdfTemplates } from '@/lib/creator-record/customer-pdf/templates'
import { CUSTOMER_RECORD_SCHEMA } from '@/lib/creator-record/customer-record/record'
import { CREATOR_RECORD_GOVERNANCE_AUTHORITY as GOV } from '@/lib/creator-record/governed/sources'
import { buildReadinessSummary, readinessTemplatesFingerprint, type ReadinessSummary } from '@/lib/creator-record/readiness-summary/summary'
import { canonicalJson } from '@/lib/creator-record/record-core/canonical'
import { legacyCases, type LegacyCase } from '@/test-support/readiness-legacy-cases'
import { proposedTemplateSet, syntheticallyApproved, type ProposedTemplateSet } from '@/test-support/readiness-proposed-templates'
import { liveRecord } from '@/test-support/readiness-scenarios'

const APP = join(__dirname, '../..')
const ISSUED = { record_id: 'CR-2026-0000005A', issued_on: '2026-11-13' }
type Rec = { canonical: string; sha256: string; record: { schema_version: number } }
const PROPOSED: Record<7 | 8, ProposedTemplateSet> = { 7: proposedTemplateSet(7), 8: proposedTemplateSet(8) }
const SET = { 7: syntheticallyApproved(PROPOSED[7]), 8: syntheticallyApproved(PROPOSED[8]) }
const T = (s: 7 | 8) => SET[s].templates as unknown as CustomerPdfTemplates
const R = (s: 7 | 8) => T(s).readiness_summary!.render as Record<string, any>
const build = (r: Rec) => buildCustomerDocument({ canonical: r.canonical, sha256: r.sha256, issued: ISSUED, templates: SET[r.record.schema_version as 7 | 8].templates, template_approval: SET[r.record.schema_version as 7 | 8].approval })
const summaryOf = (r: Rec): ReadinessSummary => {
  const st = T(r.record.schema_version as 7 | 8).readiness_summary!.summary as any
  return buildReadinessSummary({ canonical: r.canonical, sha256: r.sha256, templates: st, approval: { template_id: st.template_id, version: st.version, fingerprint: readinessTemplatesFingerprint(st), lifecycle: 'approved', authority: 'x', decision_date: '2026-11-13' } })
}
const textsOf = (b: Block) => (b.kind === 'row' ? [b.label, b.value] : [b.text])
const section = (m: CustomerDocumentModel, id: string) => m.sections.find((s) => s.id === id)!
const boxes = (nodes: readonly LayoutNode[], kind: string): Extract<LayoutNode, { kind: 'box' }>[] => nodes.flatMap((n) => (n.kind === 'box' ? [...(n.box === kind ? [n] : []), ...boxes(n.children, kind)] : []))
const blockIndices = (nodes: readonly LayoutNode[]) => layoutOrder(nodes)
const BASE = { P1: ['Layout test video'], P3: ['own_channels'], F1: ['TW'], F2: ['TW'], L1: ['no'], H1: ['edited'] }

let CASES: { name: string; rec: Rec }[] = []
const MODEL: Record<string, CustomerDocumentModel> = {}
beforeAll(async () => {
  const legacy: LegacyCase[] = (await legacyCases()).filter((c) => c.templates !== 'synthetic8_ia')
  CASES = [
    ...legacy.map((c) => ({ name: c.name, rec: c.record })),
    { name: 'live-not-sure-tool', rec: liveRecord('PREP-RL-NS', { ...BASE, M0: ['none'] }, [{ T1: ['not_sure'], T3: ['not_sure'], T4: ['May 2026'] }]) as never },
    { name: 'live-uncovered-artlist-getty', rec: liveRecord('PREP-RL-UNC', { ...BASE, M0: ['music', 'stock'], M1: ['artlist'], M2: ['no'], M3: ['getty'], M3D: ['no'] }, [{ T1: ['runway-gen3'], T3: ['not_sure'], T4: ['May 2026'] }]) as never },
  ]
  for (const c of CASES) MODEL[c.name] = build(c.rec)
})

describe('Production issuance is unchanged before activation', () => {
  test('the registered sets are still schema 7 v1 and schema 8 v3, unchanged, and neither carries the readiness block', () => {
    const a7 = approvedPdfTemplates(GOV as never, { id: CUSTOMER_RECORD_SCHEMA, version: 7 })
    const a8 = approvedPdfTemplates(GOV as never, { id: CUSTOMER_RECORD_SCHEMA, version: 8 })
    expect([a7.approval?.version, a7.approval?.fingerprint]).toEqual([1, 'c5fe2a21ec8a096c6abf7eccf0bd55f3103401e10a26512052e5d2ee15a11c6c'])
    expect([a8.approval?.version, a8.approval?.fingerprint]).toEqual([3, '287de01d8dc365e4e7c62ab0ea25fdce0b824b26e31367560b85b2f9e779c1b5'])
    expect((a7.templates as CustomerPdfTemplates).readiness_summary).toBeUndefined()
    expect((a8.templates as CustomerPdfTemplates).readiness_summary).toBeUndefined()
  })
  test('active lookup: exactly one APPROVED set per schema; pending or superseded sets are never selected', () => {
    const g = GOV as any
    const a7 = approvedPdfTemplates(GOV as never, { id: CUSTOMER_RECORD_SCHEMA, version: 7 })
    const extra = (lifecycle: string) => ({ ...g, pdf_template_sets: [...(g.pdf_template_sets ?? []), { templates: PROPOSED[7].templates, approval: { ...PROPOSED[7].proposed_approval, lifecycle, authority: 'x', decision_date: '2026-11-13' } }] })
    for (const lc of ['pending', 'superseded', 'withdrawn']) expect(approvedPdfTemplates(extra(lc) as never, { id: CUSTOMER_RECORD_SCHEMA, version: 7 }).approval?.version).toBe(a7.approval?.version)
    // Two approved sets for one schema select nothing (fail closed), exactly as before.
    expect(approvedPdfTemplates(extra('approved') as never, { id: CUSTOMER_RECORD_SCHEMA, version: 7 }).approval).toBeNull()
  })
  test('the proposal files are referenced by no application code and are not in the governance bundle', () => {
    const src = readFileSync(join(APP, 'lib/creator-record/governed/sources.ts'), 'utf8')
    expect(src).not.toMatch(/CR-PDF-TEMPLATES|readiness_summary/)
  })
})

describe('proposed template sets: stable, PROPOSED, built from the approved bases', () => {
  test('the committed proposal files equal the deterministic builder output (stable fingerprints)', () => {
    for (const s of [7, 8] as const) {
      const file = JSON.parse(readFileSync(join(APP, `lib/creator-record/governed/proposals/CR-PDF-TEMPLATES-v${s === 7 ? 4 : 5}-schema${s}.proposal.json`), 'utf8'))
      expect(canonicalJson(file)).toBe(canonicalJson(PROPOSED[s]))
    }
    expect(PROPOSED[7].fingerprints).toEqual({ pdf: 'da993e4e93c462c930bf817271b029dda0f07a4af1af133ec1d9c0341a74bc0f', summary: '2843199d69017bb61531cde7c91a3207f8270c1e218862c0c23e2b76f0b9c288', render: '286b84c7d65dea9239cd840b74f5e7f0287ff77bddb60fd0093e16d80b6807f4' })
    expect(PROPOSED[8].fingerprints).toEqual({ pdf: 'c6aa8eca13b62abf3a94185f9c68a9f286dce64054dc763a8061f119df648582', summary: '2843199d69017bb61531cde7c91a3207f8270c1e218862c0c23e2b76f0b9c288', render: '273a9dc16a0750109f45e2fab95033bef95a204c11b5fa28a4a995acb3a1b94e' })
  })
  test('they are marked PROPOSED, pending, with no authority, and versions 4 (schema 7) and 5 (schema 8)', () => {
    for (const s of [7, 8] as const) {
      expect(PROPOSED[s].status).toMatch(/^PROPOSED — NOT APPROVED/)
      expect(PROPOSED[s].proposed_approval).toMatchObject({ lifecycle: 'pending', authority: null, decision_date: null, version: s === 7 ? 4 : 5, record_schema: { id: CUSTOMER_RECORD_SCHEMA, version: s } })
    }
  })
  test('the selected wording is bound: G4, N4, N3 and the overview heading', () => {
    for (const s of [7, 8] as const) {
      expect(R(s).uncovered_intro).toBe('This record contains no SI8 guidance for these tools and services you named:')
      expect(R(s).overview_no_open).toBe('No open item was identified for this consideration from what you told SI8. This does not mean nothing is open.')
      expect(R(s).unresolved_heading).toBe('Considerations and what remains open')
      expect(R(s).limitations_heading).toBe(s === 7 ? '6. Documents and limitations' : '7. Limitations of this record')
    }
  })
})

describe('the three-level layout, both schemas', () => {
  test('presentation flag and section order: identity, about, the summary, then the supporting record', () => {
    for (const c of CASES) {
      const m = MODEL[c.name]
      expect(m.presentation).toBe(READING_HIERARCHY_PRESENTATION)
      expect(m.sections.map((s) => s.id)).toEqual([...(c.rec.record.schema_version === 8 ? CUSTOMER_PDF_READINESS_EXAMINATION_SECTIONS : CUSTOMER_PDF_READINESS_SECTIONS)])
    }
  })
  test('every section has a layout that visits each printed block exactly once, in printed order', () => {
    for (const c of CASES) for (const s of MODEL[c.name].sections) {
      expect([c.name, s.id, !!s.layout]).toEqual([c.name, s.id, true])
      expect(blockIndices(s.layout!)).toEqual(s.blocks.map((_, i) => i))
    }
  })
  test('identity block: the template title and two provenance rows, existing strings only', () => {
    for (const c of CASES) {
      const s = c.rec.record.schema_version as 7 | 8
      const P = T(s).sections.provenance.labels
      expect(section(MODEL[c.name], 'identity').blocks.map(textsOf)).toEqual([[fill(T(s).document_title, { record_id: ISSUED.record_id })], [P.record_id, ISSUED.record_id], [P.issued_on, ISSUED.issued_on]])
    }
  })
  test('consolidations are exact duplicates: the same strings are printed in the same place', () => {
    let total = 0
    for (const c of CASES) {
      const s = section(MODEL[c.name], 'readiness_summary')
      for (const x of s.consolidated!) {
        total++
        expect([c.name, x.texts]).toEqual([c.name, x.same_as.flatMap((i) => textsOf(s.blocks[i]))])
      }
    }
    expect(total).toBeGreaterThan(0)
  })
  test('governed explanations and conclusions: each printed exactly once, the record’s own, in order', () => {
    for (const c of CASES) {
      const record = JSON.parse(c.rec.canonical)
      const text = documentText(MODEL[c.name])
      for (const i of record.guidance.items) expect([c.name, i.claim_id, text.filter((t) => t === i.explanation).length]).toEqual([c.name, i.claim_id, 1])
      const sv = c.rec.record.schema_version as 7 | 8
      const labels = (T(sv).readiness_summary!.summary as any).conclusion_labels
      const conclusionRows = section(MODEL[c.name], 'readiness_summary').blocks.filter((b) => b.kind === 'row' && b.label === R(sv).conclusion_label).map((b) => (b as any).value)
      expect([c.name, conclusionRows]).toEqual([c.name, record.guidance.items.map((i: any) => labels[i.conclusion])])
    }
  })
  test('the overview map: one row per consideration; N4 only where the bounded output attaches no open matter', () => {
    let mixed = 0
    for (const c of CASES) {
      const sv = c.rec.record.schema_version as 7 | 8
      const sum = summaryOf(c.rec)
      const s = section(MODEL[c.name], 'readiness_summary')
      const rows = boxes(s.layout!, 'map_row')
      const cons = sum.groups.flatMap((g) => g.considerations)
      expect([c.name, rows.map((r) => r.consideration)]).toEqual([c.name, cons.map((x) => x.index)])
      const o = sum.open_items
      const hasOpen = (n: number) => [o.dependencies, o.unresolved_applicability, o.topic_qualified, o.unspecified].some((l) => l.some((x) => x.consideration === n))
      let withOpen = 0
      for (const r of rows) {
        const n4 = blockIndices([r]).some((i) => s.blocks[i].kind === 'paragraph' && (s.blocks[i] as any).text === R(sv).overview_no_open)
        expect([c.name, r.consideration, n4]).toEqual([c.name, r.consideration, !hasOpen(r.consideration!)])
        // N4 never sits beside the conclusion "it depends on something this record does not establish".
        if (n4) expect(cons.find((x) => x.index === r.consideration)!.conclusion.code).toBe('relevant_on_declared_facts')
        if (!n4) withOpen++
      }
      // A map row never carries a conclusion, explanation or caveat.
      const forbidden = new Set([...Object.values((T(sv).readiness_summary!.summary as any).conclusion_labels as Record<string, string>), ...cons.map((x) => x.explanation)])
      for (const r of rows) for (const i of blockIndices([r])) expect(forbidden.has(textsOf(s.blocks[i]).join(''))).toBe(false)
      if (withOpen > 0 && withOpen < rows.length) mixed++
    }
    expect(mixed).toBeGreaterThan(0) // at least one record mixes considerations with and without open matters
  })
  test('open matters sit beside their originating consideration', () => {
    for (const c of CASES) {
      const s = section(MODEL[c.name], 'readiness_summary')
      for (const cbox of boxes(s.layout!, 'consideration')) for (const open of boxes(cbox.children, 'open')) expect([c.name, open.consideration]).toEqual([c.name, cbox.consideration])
    }
  })
  test('G4: the "no SI8 guidance" list is exactly the record’s uncovered subjects; "Not sure" is never listed there', () => {
    for (const c of CASES) {
      const sv = c.rec.record.schema_version as 7 | 8
      const sum = summaryOf(c.rec)
      const text = section(MODEL[c.name], 'readiness_summary').blocks
      const at = text.findIndex((b) => b.kind === 'paragraph' && b.text === R(sv).uncovered_intro)
      expect([c.name, at >= 0]).toEqual([c.name, sum.uncovered_subjects.length > 0])
      if (at >= 0) expect(text.slice(at + 1, at + 1 + sum.uncovered_subjects.length).map(textsOf)).toEqual(sum.uncovered_subjects.map((u) => [u.question, u.answer]))
      for (const u of sum.uncovered_subjects) expect(/not sure/i.test(u.answer)).toBe(false)
    }
    const ns = summaryOf(CASES.find((x) => x.name === 'live-not-sure-tool')!.rec)
    expect(ns.uncovered_subjects).toEqual([])
    expect(ns.open_items.not_sure.some((n) => n.q_id === 'T1')).toBe(true)
    const unc = summaryOf(CASES.find((x) => x.name === 'live-uncovered-artlist-getty')!.rec)
    expect(unc.uncovered_subjects.map((u) => u.answer)).toEqual(['Artlist', 'Getty Images'])
  })
  test('evidence limitations are all printed verbatim: record limitations, what SI8 did not do, dependency evidence notes', () => {
    for (const c of CASES) {
      const sv = c.rec.record.schema_version as 7 | 8
      const text = documentText(MODEL[c.name])
      for (const l of [...T(sv).sections.open_items.limitations, ...T(sv).sections.not_done.lines]) expect([c.name, text.includes(l)]).toEqual([c.name, true])
      for (const d of summaryOf(c.rec).open_items.dependencies) if (d.evidence_note) expect([c.name, text.includes(d.evidence_note)]).toEqual([c.name, true])
      const lim = section(MODEL[c.name], 'record_limitations').blocks
      expect(lim[0]).toEqual({ kind: 'heading', text: R(sv).limitations_heading, from: 'template' })
    }
  })
  test('legacy-only wording is unreachable in the new layout', () => {
    for (const c of CASES) {
      const sv = c.rec.record.schema_version as 7 | 8
      const S = T(sv).sections
      const text = documentText(MODEL[c.name])
      const legacyOnly = [S.guidance.heading, S.open_items.heading, S.open_items.intro, S.guidance.intro, ...(T(sv).examination ? [T(sv).examination!.open_items_pointer] : [])]
      for (const l of legacyOnly) expect([c.name, l, text.includes(l)]).toEqual([c.name, l, false])
      const items = JSON.parse(c.rec.canonical).guidance.items
      for (let n = 1; n <= items.length; n++) expect(text.includes(fill(S.open_items.item_ref, { index: n }))).toBe(false)
      expect(text.some((t) => t.startsWith(S.open_items.affects.split('{items}')[0]))).toBe(false)
    }
  })
  test('CR-PDF-DECISION-1: the proposed schema 8 set carries no integrated assessment, and no integrated-assessment text is printed', () => {
    expect((T(8) as unknown as Record<string, unknown>).integrated_assessment).toBeUndefined()
    const v3 = approvedPdfTemplates(GOV as never, { id: CUSTOMER_RECORD_SCHEMA, version: 8 }) as { templates: unknown; approval: any }
    const ia = (v3.templates as CustomerPdfTemplates).integrated_assessment!
    // Every distinct integrated-assessment string of the approved v3 wording that is not also used elsewhere in the proposed set.
    const elsewhere = new Set<string>()
    const collect = (v: unknown) => { if (typeof v === 'string') elsewhere.add(v); else if (v && typeof v === 'object') Object.values(v).forEach(collect) }
    collect(T(8))
    const iaStrings = new Set<string>()
    const collectIa = (v: unknown) => { if (typeof v === 'string') { for (const part of v.split('\n\n')) iaStrings.add(part.split('{')[0]) } else if (v && typeof v === 'object') Object.values(v).forEach(collectIa) }
    collectIa(ia)
    const own = [...iaStrings].filter((x) => x.trim().length > 12 && ![...elsewhere].some((e) => e.includes(x)))
    expect(own.length).toBeGreaterThan(5)
    for (const c of CASES.filter((x) => x.rec.record.schema_version === 8)) {
      const text = MODEL[c.name].sections.flatMap((s) => s.blocks.flatMap(textsOf))
      for (const x of own) expect([c.name, x, text.some((t) => t.startsWith(x))]).toEqual([c.name, x, false])
    }
  })
  test('CR-PDF-DECISION-1: the approved v3 PDF still prints its integrated assessment inside the guidance, exactly as before', () => {
    const v3 = approvedPdfTemplates(GOV as never, { id: CUSTOMER_RECORD_SCHEMA, version: 8 }) as { templates: unknown; approval: any }
    const ia = (v3.templates as CustomerPdfTemplates).integrated_assessment!
    let runs = 0
    for (const c of CASES.filter((x) => x.rec.record.schema_version === 8)) {
      const live = buildCustomerDocument({ canonical: c.rec.canonical, sha256: c.rec.sha256, issued: ISSUED, templates: v3.templates, template_approval: v3.approval })
      runs += live.sections.find((s) => s.id === 'guidance')!.blocks.filter((b) => b.kind === 'label' && b.text === ia.heading).length
    }
    expect(runs).toBeGreaterThan(0)
  })
  test('CR-PDF-DECISION-1: a reading-layout set that also carries the integrated assessment refuses (fail closed)', () => {
    const v3 = approvedPdfTemplates(GOV as never, { id: CUSTOMER_RECORD_SCHEMA, version: 8 }) as { templates: any; approval: any }
    const both = syntheticallyApproved({ ...PROPOSED[8], templates: { ...PROPOSED[8].templates, integrated_assessment: v3.templates.integrated_assessment }, proposed_approval: PROPOSED[8].proposed_approval })
    const fp = require('@/lib/creator-record/customer-pdf/templates').templateFingerprint(both.templates)
    const c = CASES.find((x) => x.name === 's8-linked-docs')!
    expect(() => buildCustomerDocument({ canonical: c.rec.canonical, sha256: c.rec.sha256, issued: ISSUED, templates: both.templates, template_approval: { ...both.approval, fingerprint: fp } })).toThrow(/readiness_layout_refused: integrated assessment with the reading layout/)
  })
  test('CR-PDF-DECISION-1: every authorized document reading is printed in the documents section, as the approved v3 PDF prints it', () => {
    const v3 = approvedPdfTemplates(GOV as never, { id: CUSTOMER_RECORD_SCHEMA, version: 8 }) as { templates: unknown; approval: any }
    for (const c of CASES.filter((x) => x.rec.record.schema_version === 8)) {
      const live = buildCustomerDocument({ canonical: c.rec.canonical, sha256: c.rec.sha256, issued: ISSUED, templates: v3.templates, template_approval: v3.approval })
      const was = live.sections.find((s) => s.id === 'documents')!.blocks.map((b) => canonicalJson(b))
      const now = section(MODEL[c.name], 'documents').blocks.map((b) => canonicalJson(b))
      // Same blocks, except the section heading's number and the one proposed intro sentence (W3).
      expect([c.name, now.length]).toEqual([c.name, was.length])
      // The only differences: the section heading's number and the proposed W3 intro sentence; nothing else.
      const E5 = T(8).examination as unknown as { heading: string; intro: string[] }
      const changed = now.flatMap((b, i) => (b === was[i] ? [] : [textsOf(section(MODEL[c.name], 'documents').blocks[i]).join(' | ')]))
      expect([c.name, changed]).toEqual([c.name, [E5.heading, E5.intro[2]]])
    }
  })
  test('D10: no reading value or excerpt is printed outside the documents section (the guidance carries none)', () => {
    for (const c of CASES.filter((x) => x.rec.record.schema_version === 8)) {
      const record = JSON.parse(c.rec.canonical)
      const declared = new Set<string>()
      const walk = (v: unknown) => { if (typeof v === 'string') declared.add(v); else if (v && typeof v === 'object') Object.values(v).forEach(walk) }
      walk(record.declarations)
      const readings = new Set<string>()
      for (const d of record.documents.items) if (d.examination !== 'not_examined') for (const o of d.examination.envelope.observations) for (const t of [o.value, o.excerpt]) if (typeof t === 'string' && !declared.has(t)) readings.add(t)
      const outside = MODEL[c.name].sections.filter((x) => x.id !== 'documents').flatMap((x) => x.blocks.flatMap(textsOf))
      expect([c.name, outside.filter((t) => readings.has(t))]).toEqual([c.name, []])
    }
  })
  test('covers: both schemas; standard and complex; with and without documents', () => {
    const names = CASES.map((c) => c.name)
    expect(names).toEqual(expect.arrayContaining(['s7-1-runway-higgsfield', 's7-5-unresolved-and-topic-caps', 's8-default', 's8-music-dependency']))
    expect(CASES.some((c) => JSON.parse(c.rec.canonical).documents.items.length === 0)).toBe(true)
    expect(CASES.some((c) => JSON.parse(c.rec.canonical).documents.items.length > 0)).toBe(true)
  })
})

describe('no provider-specific composition', () => {
  test('the layout, its drawing and the composition name no provider, tool or service', () => {
    const files = ['lib/creator-record/customer-pdf/readiness-layout.ts', 'lib/creator-record/customer-pdf/ReadingLayoutView.tsx', 'lib/creator-record/customer-pdf/document-model.ts']
    for (const f of files) expect([f, readFileSync(join(APP, f), 'utf8').match(/\b(runway|pika|higgsfield|getty|artlist|sora|kling|midjourney|shutterstock|veo|firefly)\b/gi)]).toEqual([f, null])
  })
})
