/**
 * CR-PDF-REVIEW-2 — targeted corrections to the three-level layout (PROPOSED wording; nothing here is approved or registered).
 *   U1   a subject answer that identifies no tool or service ("Not sure") is never treated as a named subject: the "no published
 *        guidance for the tools and services you named" sentence is said only of a named subject; unidentified answers get their
 *        own sentence. Generic over every subject question (tools, music, stock).
 *   U2/3 the About "open items" count is shown as its two parts (linked to considerations; answers not sure about). Same total.
 *   NAV  the overview map groups considerations under the summary's own subject groups, and an open fact held for several
 *        considerations is cross-referenced by the record's identity of the fact (fact type + tool), never by its label.
 *   PAG  every provenance row is drawn alike (compact).
 * Records are real, locally built; template sets are the proposed v4/v5 under a synthetic approval (registered nowhere).
 */
import { buildCustomerDocument, type CustomerDocumentModel } from '@/lib/creator-record/customer-pdf/document-model'
import { readinessLayout, type LayoutNode, type PlacedSource } from '@/lib/creator-record/customer-pdf/readiness-layout'
import { buildReadinessSummary, readinessTemplatesFingerprint, type ReadinessSummary, type ReadinessSummaryTemplates } from '@/lib/creator-record/readiness-summary/summary'
import { readinessRenderFingerprint, renderReadinessSummary, ReadinessRenderRefusal, type ReadinessRenderTemplates } from '@/lib/creator-record/readiness-summary/render'
import { legacyCases } from '@/test-support/readiness-legacy-cases'
import { proposedTemplateSet, syntheticallyApproved } from '@/test-support/readiness-proposed-templates'
import { liveRecord } from '@/test-support/readiness-scenarios'

const ISSUED = { record_id: 'CR-2026-0000000E', issued_on: '2026-11-13' }
const BASE = { P1: ['Proof video'], P3: ['own_channels'], F1: ['TW'], F2: ['TW'], L1: ['no'], H1: ['edited'] }
type Rec = { canonical: string; sha256: string; record: { schema_version: number } }
const SETS = { 7: syntheticallyApproved(proposedTemplateSet(7)), 8: syntheticallyApproved(proposedTemplateSet(8)) }
const blockOf = (schema: 7 | 8) => (SETS[schema].templates as { readiness_summary: { summary: ReadinessSummaryTemplates; render: ReadinessRenderTemplates } }).readiness_summary
const R = blockOf(7).render
const fill = (s: string, n: number) => s.replace('{n}', String(n))

function build(rec: Rec) {
  const set = SETS[rec.record.schema_version as 7 | 8]
  return buildCustomerDocument({ canonical: rec.canonical, sha256: rec.sha256, issued: ISSUED, templates: set.templates, template_approval: set.approval })
}
function summaryOf(rec: Rec): ReadinessSummary {
  const T = blockOf(rec.record.schema_version as 7 | 8).summary
  return buildReadinessSummary({ canonical: rec.canonical, sha256: rec.sha256, templates: T, approval: { template_id: T.template_id, version: T.version, fingerprint: readinessTemplatesFingerprint(T), lifecycle: 'approved', authority: 'SYNTHETIC TEST APPROVAL — CR-PDF-REVIEW-2', decision_date: '2026-11-13' } })
}
const texts = (m: CustomerDocumentModel, id: string) => m.sections.find((s) => s.id === id)!.blocks.flatMap((b) => (b.kind === 'row' ? [b.label, b.value] : [b.text]))
const record = (id: string, answers: Record<string, string[]>, tools: Record<string, string[]>[]) => liveRecord(id, { ...BASE, ...answers }, tools) as unknown as Rec
const after = (xs: string[], first: string) => xs.slice(xs.indexOf(first) + 1)

const UNKNOWN = record('REVIEW2-UNKNOWN', { M0: ['none'] }, [{ T1: ['not_sure'], T3: ['not_sure'], T4: ['May 2026'] }])
const NAMED_UNCOVERED = record('REVIEW2-NAMED', { M0: ['music', 'stock'], M1: ['artlist'], M2: ['no'], M3: ['getty'], M3D: ['no'] }, [{ T1: ['runway-gen3'], T3: ['not_sure'], T4: ['May 2026'] }])
const MIXED = record('REVIEW2-MIXED', { M0: ['music'], M1: ['artlist'], M2: ['no'] }, [{ T1: ['not_sure'], T3: ['not_sure'], T4: ['May 2026'] }])
const MUSIC_UNKNOWN = record('REVIEW2-MUSIC', { M0: ['music'], M1: ['not_sure'], M2: ['not_sure'] }, [{ T1: ['runway-gen3'], T3: ['Standard'], T4: ['May 2026'] }])
const TWO_TOOLS = record('REVIEW2-TWO', { M0: ['none'] }, [{ T1: ['runway-gen3'], T3: ['not_sure'], T4: ['May 2026'] }, { T1: ['not_sure'], T3: ['not_sure'], T4: ['May 2026'] }])

describe('U1: a tool or service that cannot be identified is never a named subject', () => {
  test('unknown only: no "named" sentence; the unidentified sentence lists the answer; the not-sure answers stay where they were', () => {
    const s = summaryOf(UNKNOWN)
    expect(s.groups.flatMap((g) => g.considerations)).toHaveLength(0)
    expect(s.uncovered_subjects).toEqual([])
    expect(s.unidentified_subjects.map((u) => [u.q_id, u.tool_index])).toEqual([['T1', 0]])
    const t = texts(build(UNKNOWN), 'readiness_summary')
    expect(t).not.toContain(R.guidance_empty)
    expect(t).not.toContain(R.uncovered_intro)
    expect(t).toContain(R.guidance_unidentified.one)
    expect(after(t, R.guidance_unidentified.one)[0]).toBe('Which AI tool did you use?')
    // Both uncertain answers are still listed under their own heading, unchanged.
    expect(after(t, R.not_sure_heading).slice(0, 2)).toEqual(['Which AI tool did you use?', 'Which plan were you on with this tool while you made the video?'])
    expect(s.open_items.not_sure.map((q) => q.q_id)).toEqual(['T1', 'T3'])
  })
  test('identifiable but uncovered: listed as named subjects without guidance; no unidentified sentence', () => {
    const s = summaryOf(NAMED_UNCOVERED)
    expect(s.unidentified_subjects).toEqual([])
    expect(s.uncovered_subjects.map((u) => u.answer)).toEqual(['Artlist', 'Getty Images'])
    const t = texts(build(NAMED_UNCOVERED), 'readiness_summary')
    expect(t).not.toContain(R.guidance_unidentified.one)
    expect(after(t, R.uncovered_intro).slice(0, 4)).toEqual(['Where did the music come from?', 'Artlist', 'Which stock service did the stock material come from?', 'Getty Images'])
  })
  test('mixed (an unidentified tool and a named service with no guidance): each statement says only what is true of its answers', () => {
    const s = summaryOf(MIXED)
    expect(s.unidentified_subjects.map((u) => u.q_id)).toEqual(['T1'])
    expect(s.uncovered_subjects.map((u) => u.answer)).toEqual(['Artlist'])
    const t = texts(build(MIXED), 'readiness_summary')
    const considerations = s.groups.flatMap((g) => g.considerations).length
    // "No published guidance for the tools and services you named" only when nothing was selected AND something was named.
    expect(t.includes(R.guidance_empty)).toBe(considerations === 0)
    expect(after(t, R.guidance_unidentified.one)[0]).toBe('Which AI tool did you use?')
    expect(after(t, R.uncovered_intro).slice(0, 2)).toEqual(['Where did the music come from?', 'Artlist'])
    expect(t).not.toContain('Not sure')
  })
  test('generic across subject categories: an unidentified music service is treated exactly like an unidentified tool', () => {
    const s = summaryOf(MUSIC_UNKNOWN)
    expect(s.groups.flatMap((g) => g.considerations).length).toBeGreaterThan(0)
    expect(s.unidentified_subjects.map((u) => u.q_id)).toEqual(['M1'])
    const t = texts(build(MUSIC_UNKNOWN), 'readiness_summary')
    expect(t).not.toContain(R.guidance_empty)
    expect(after(t, R.guidance_unidentified.one)[0]).toBe('Where did the music come from?')
  })
  test('several tools: only the unidentified tool is listed; no provider is inferred for it', () => {
    const s = summaryOf(TWO_TOOLS)
    expect(s.unidentified_subjects.map((u) => [u.q_id, u.tool_index])).toEqual([['T1', 1]])
    expect(s.groups.map((g) => g.subject?.answer)).toEqual(['Runway'])
    const t = texts(build(TWO_TOOLS), 'readiness_summary')
    expect(t.filter((x) => x === R.guidance_unidentified.one)).toHaveLength(1)
    expect(t).not.toContain(R.guidance_empty)
  })
  test('render level: a named subject alone keeps the existing sentence; a summary with nothing to say refuses (fail closed)', () => {
    const base = summaryOf(MIXED)
    const approval = { template_id: R.template_id, version: R.version, fingerprint: readinessRenderFingerprint(R), lifecycle: 'approved' as const, authority: 'SYNTHETIC TEST APPROVAL — CR-PDF-REVIEW-2', decision_date: '2026-11-13' }
    const blocksOf = (s: ReadinessSummary) => renderReadinessSummary(s, R, approval).blocks.flatMap((b) => (b.kind === 'row' ? [b.label, b.value] : [b.text]))
    const zero = { ...base, groups: [] }
    const namedOnly = blocksOf({ ...zero, unidentified_subjects: [] })
    expect(namedOnly).toContain(R.guidance_empty)
    expect(namedOnly).not.toContain(R.guidance_unidentified.one)
    expect(() => blocksOf({ ...zero, uncovered_subjects: [], unidentified_subjects: [] })).toThrow(ReadinessRenderRefusal)
  })
})

describe('U2/U3: the About "open items" count in two parts', () => {
  test('the unknown-tool record: no open item linked to a consideration; two answers not sure about (total unchanged: 2)', () => {
    const about = texts(build(UNKNOWN), 'about')
    expect(about.slice(-2)).toEqual([fill(R.count_open_linked.other, 0), fill(R.count_not_sure.other, 2)])
  })
})

// ── layout walking ──
type Box = Extract<LayoutNode, { kind: 'box' }>
const boxes = (ns: readonly LayoutNode[], kind: string): Box[] => ns.flatMap((n) => (n.kind === 'box' ? [...(n.box === kind ? [n] : []), ...boxes(n.children, kind)] : []))
const leaves = (ns: readonly LayoutNode[]): Extract<LayoutNode, { kind: 'block' }>[] => ns.flatMap((n) => (n.kind === 'block' ? [n] : leaves(n.children)))

describe('NAV: the overview map', () => {
  let COMPLEX: Rec
  beforeAll(async () => { COMPLEX = (await legacyCases()).find((c) => c.name === 's7-5-unresolved-and-topic-caps')!.record as unknown as Rec })

  test('considerations are grouped under the summary’s own subject groups, every one kept, numbering unchanged', () => {
    for (const rec of [COMPLEX, NAMED_UNCOVERED, TWO_TOOLS]) {
      const m = build(rec)
      const sec = m.sections.find((s) => s.id === 'readiness_summary')!
      const s = summaryOf(rec)
      const groups = boxes(sec.layout!, 'map_group')
      expect(groups.map((g) => (sec.blocks[(g.children[0] as { index: number }).index] as { text: string }).text)).toEqual(s.groups.filter((g) => g.subject !== null).map((g) => g.subject!.answer))
      expect(groups.map((g) => boxes(g.children, 'map_row').map((r) => r.consideration))).toEqual(s.groups.filter((g) => g.subject !== null).map((g) => g.considerations.map((c) => c.index)))
      expect(boxes(sec.layout!, 'map_row').map((r) => r.consideration)).toEqual(s.groups.flatMap((g) => g.considerations.map((c) => c.index)))
    }
  })
  test('an open fact held for several considerations is cross-referenced by its identity (fact type + tool), never by its label', () => {
    for (const rec of [COMPLEX, NAMED_UNCOVERED]) {
      const sec = build(rec).sections.find((s) => s.id === 'readiness_summary')!
      const s = summaryOf(rec)
      const key = (x: { fact: string; tool: string | null }) => `${x.fact}|${x.tool}`
      for (const row of boxes(sec.layout!, 'map_row')) {
        const c = row.consideration!
        const expected = s.open_items.unresolved_applicability
          .filter((x) => x.consideration === c)
          .map((x) => s.open_items.unresolved_applicability.filter((y) => key(y) === key(x)).map((y) => y.consideration))
          .filter((cs) => new Set(cs).size > 1)
          .map((cs) => [...new Set(cs)].sort((a, b) => a - b).join(', '))
        const xrefs = leaves(row.children).filter((l) => l.hint === 'map_xref').map((l) => sec.blocks[l.index] as { label: string; value: string })
        expect([c, xrefs.map((x) => x.value)]).toEqual([c, expected])
        for (const x of xrefs) expect(x.label).toBe(R.caveat_applies_to_label)
      }
    }
    // The complex record: the plan of the one tool is open for considerations 2, 3 and 4; the Getty dependencies are never joined.
    const sec = build(COMPLEX).sections.find((s) => s.id === 'readiness_summary')!
    const values = boxes(sec.layout!, 'map_row').map((r) => leaves(r.children).filter((l) => l.hint === 'map_xref').map((l) => (sec.blocks[l.index] as { value: string }).value))
    expect(values).toEqual([[], ['2, 3, 4'], ['2, 3, 4'], ['2, 3, 4'], []])
  })
  test('the same open-fact label for a different tool is not joined (synthetic: no ledger yields this today)', () => {
    // The complex summary with consideration 4's open plan fact re-attributed to another tool code: the printed label is identical
    // ("The plan you were on with this tool"), the identity is not. SYNTHETIC — layout input only, never a record.
    const s0 = summaryOf(COMPLEX)
    const s: ReadinessSummary = { ...s0, open_items: { ...s0.open_items, unresolved_applicability: s0.open_items.unresolved_applicability.map((x) => (x.consideration === 4 ? { ...x, tool: 'synthetic-other-tool' } : x)) } }
    const approval = { template_id: R.template_id, version: R.version, fingerprint: readinessRenderFingerprint(R), lifecycle: 'approved' as const, authority: 'SYNTHETIC TEST APPROVAL — CR-PDF-REVIEW-2', decision_date: '2026-11-13' }
    const rendered = renderReadinessSummary(s, R, approval)
    const placed: PlacedSource[] = rendered.blocks.map((b) => ({
      block: b.kind === 'row' ? { kind: 'row', label: b.label, label_from: 'template', value: b.value, value_from: 'template' } : { kind: b.kind, text: b.text, from: 'template' },
      section: b.section, role: b.role, ...(b.consideration !== undefined ? { consideration: b.consideration } : {}), ...(b.applies_to ? { applies_to: b.applies_to } : {}),
    }))
    const l = readinessLayout(placed, s, { overviewNoOpen: R.overview_no_open, appliesTo: R.caveat_applies_to_label })
    const labels = boxes(l.layout, 'map_row').map((r) => leaves(r.children).filter((x) => x.hint === 'map_item').map((x) => (l.blocks[x.index] as { text: string }).text))
    expect(labels[1]).toEqual(labels[3]) // same label on 2 and 4
    const values = boxes(l.layout, 'map_row').map((r) => leaves(r.children).filter((x) => x.hint === 'map_xref').map((x) => (l.blocks[x.index] as { value: string }).value))
    expect(values).toEqual([[], ['2, 3'], ['2, 3'], [], []])
  })
})

describe('PAG: provenance rows are drawn alike', () => {
  test('no provenance row uses the larger row style', () => {
    for (const rec of [UNKNOWN, NAMED_UNCOVERED]) {
      const sec = build(rec).sections.find((s) => s.id === 'provenance')!
      expect(leaves(sec.layout!).filter((l) => l.hint === 'row')).toEqual([])
    }
  })
})
