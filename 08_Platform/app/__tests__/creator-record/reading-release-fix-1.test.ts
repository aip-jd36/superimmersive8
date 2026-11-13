/**
 * CR-PDF-RELEASE-FIX-1: the material corrections found by CR-PDF-WORDING-FREEZE-1, in the PROPOSED reading layout (v4 / v5 under
 * a synthetic approval; nothing registered). All wording here is PROPOSED, NOT APPROVED.
 *   FZ-1  no consideration: the About sentence describing "the guidance in section 2" is not printed; other disclaimers remain;
 *   FZ-2  no consideration: one selection-state sentence replaces the guidance introduction; the approved "SI8 has no published
 *         guidance…" sentence is never printed by this layout;
 *   FZ-3  the orientation assumes nothing was named;
 *   FZ-4  a schema 8 record whose comparison method can hold determinations is refused (the layout says readings were not compared);
 *   G4    singular and plural forms; R3 in the second person; shared open facts still counted once (unchanged).
 */
import { approvedPdfTemplates } from '@/lib/creator-record/customer-flow/approved-inputs'
import { buildCustomerDocument, CustomerPdfRefusal, type Block, type CustomerDocumentModel } from '@/lib/creator-record/customer-pdf/document-model'
import type { CustomerPdfTemplates } from '@/lib/creator-record/customer-pdf/templates'
import { CUSTOMER_RECORD_SCHEMA } from '@/lib/creator-record/customer-record/record'
import { HISTORICAL_COMPARISON_METHOD } from '@/lib/creator-record/evidence/persisted-comparison'
import { CREATOR_RECORD_GOVERNANCE_AUTHORITY as GOV } from '@/lib/creator-record/governed/sources'
import { canonicalJson, sha256Hex } from '@/lib/creator-record/record-core/canonical'
import { legacyCases } from '@/test-support/readiness-legacy-cases'
import { proposedTemplateSet, syntheticallyApproved } from '@/test-support/readiness-proposed-templates'
import { liveRecord } from '@/test-support/readiness-scenarios'
import { schema8Fixture } from '@/test-support/customer-record-schema8'

const ISSUED = { record_id: 'CR-2026-0000000F', issued_on: '2026-11-13' }
type Rec = { canonical: string; sha256: string; record: { schema_version: number } }
const SETS = { 7: syntheticallyApproved(proposedTemplateSet(7)), 8: syntheticallyApproved(proposedTemplateSet(8)) }
const T = (s: 7 | 8) => SETS[s].templates as unknown as CustomerPdfTemplates & { readiness_summary: { render: Record<string, any> } }
const build = (r: Rec) => { const s = r.record.schema_version as 7 | 8; return buildCustomerDocument({ canonical: r.canonical, sha256: r.sha256, issued: ISSUED, templates: SETS[s].templates, template_approval: SETS[s].approval }) }
const textsOf = (b: Block) => (b.kind === 'row' ? [b.label, b.value] : [b.text])
const sec = (m: CustomerDocumentModel, id: string) => m.sections.find((s) => s.id === id)!.blocks.flatMap(textsOf)
const all = (m: CustomerDocumentModel) => m.sections.flatMap((s) => s.blocks.flatMap(textsOf))
const BASE = { P1: ['Release fix video'], P3: ['own_channels'], F1: ['TW'], F2: ['TW'], L1: ['no'], H1: ['edited'] }
const NS = { T1: ['not_sure'], T3: ['not_sure'], T4: ['May 2026'] }
const rec7 = (id: string, a: Record<string, string[]>, tools: Record<string, string[]>[]) => liveRecord(id, { ...BASE, ...a }, tools) as unknown as Rec
const s8state = (a: Record<string, string[]>, tools: Record<string, string[]>[]) => ({ answers: { P1: ['Release fix video'], P3: ['own_channels'], F1: ['TW'], F2: ['online_worldwide'], L1: ['no'], H1: ['edited'], ...a }, tools, acknowledgements: { A1: true, A2: true } }) as never
const APPROVED_EMPTY = (approvedPdfTemplates(GOV as never, { id: CUSTOMER_RECORD_SCHEMA, version: 8 }).templates as CustomerPdfTemplates).sections.guidance.empty

const NONE7 = rec7('FIX1-NONE', { M0: ['none'] }, [NS])
const ARTLIST7 = rec7('FIX1-ARTLIST', { M0: ['music'], M1: ['artlist'], M2: ['no'] }, [NS])
const SOME7 = rec7('FIX1-SOME', { M0: ['none'] }, [{ T1: ['runway-gen3'], T3: ['Standard'], T4: ['May 2026'] }])
let NONE8: Rec
let S8: Rec
beforeAll(async () => {
  NONE8 = (await schema8Fixture({ state: s8state({ M0: ['none'] }, [{ T1: ['not_sure'], T3: ['not_sure'] }]) })) as unknown as Rec
  S8 = (await legacyCases()).find((c) => c.name === 's8-default')!.record as unknown as Rec
})

describe('FZ-1: no consideration, no sentence about "the guidance in section 2"', () => {
  test.each([[7, () => NONE7], [8, () => NONE8]] as const)('schema %i', (s, r) => {
    const about = sec(build(r()), 'about')
    const sentence = T(s).sections.about.intro[s === 7 ? 2 : 3]
    expect(sentence).toMatch(/^The guidance in section 2 is educational/)
    expect(about).not.toContain(sentence)
    expect(about[1]).toBe(T(s).readiness_summary.render.about_intro_no_guidance)
    // Every other approved About sentence is still printed.
    for (const x of T(s).sections.about.intro.slice(1)) if (x !== sentence) expect(about).toContain(x)
    // The disclaimers the omitted sentence carried remain in "What SI8 did not do".
    expect(sec(build(r()), 'not_done')).toEqual(expect.arrayContaining([T(s).sections.not_done.lines[0], T(s).sections.not_done.lines[1]]))
  })
  test('with a consideration the sentence is printed unchanged', () => {
    expect(sec(build(SOME7), 'about')).toContain(T(7).sections.about.intro[2])
  })
})

describe('FZ-2: one selection-state sentence; never "SI8 has no published guidance"', () => {
  test('named subject without guidance and an unidentified tool: no duplicate, no publication-state claim', () => {
    const R = T(7).readiness_summary.render
    const m = build(ARTLIST7)
    const t = sec(m, 'readiness_summary')
    expect(t.filter((x) => x === R.guidance_none_selected)).toHaveLength(1)
    expect(t).not.toContain(R.guidance_intro)
    expect(all(m)).not.toContain(APPROVED_EMPTY)
    expect(t).toContain(R.guidance_unidentified.one)
    expect(t[t.indexOf(R.uncovered_intro.one) + 1]).toBe('Where did the music come from?')
    expect(t).not.toContain(R.uncovered_intro.other)
  })
  test('no record built from the proposed sets prints the approved guidance.empty sentence', async () => {
    for (const r of [NONE7, ARTLIST7, SOME7, NONE8, S8]) expect(all(build(r))).not.toContain(APPROVED_EMPTY)
  })
})

describe('FZ-3 and R3: state-neutral orientation; second person', () => {
  test.each([7, 8] as const)('schema %i', (s) => {
    const R = T(s).readiness_summary.render
    expect(R.orientation).not.toMatch(/you named|the creator/)
    expect(R.orientation).toMatch(/^This section brings together any of SI8’s published guidance that was selected from what you told SI8/)
    expect(R.assurance_text).not.toMatch(/the creator/)
    expect(R.assurance_text).toMatch(/^This record organises what you declared/)
    for (const r of [NONE7, SOME7]) expect(sec(build(r), 'readiness_summary')[1]).toBe(T(7).readiness_summary.render.orientation)
  })
})

describe('FZ-4: a record whose comparisons can hold determinations is refused by the reading layout', () => {
  test('the current method (every result withheld) renders; the historical method refuses, fail closed', () => {
    expect(() => build(S8)).not.toThrow()
    const doc = JSON.parse(S8.canonical)
    doc.comparison.method = { ...HISTORICAL_COMPARISON_METHOD }
    const canonical = canonicalJson(doc)
    const historical = { canonical, sha256: sha256Hex(canonical), record: { schema_version: 8 } }
    expect(() => build(historical)).toThrow(CustomerPdfRefusal)
    expect(() => build(historical)).toThrow(/comparison method with determinations/)
  })
  test('the v5 wording that relies on it: readings were not compared', () => {
    expect(T(8).sections.not_done.lines[4]).toBe('SI8 did not compare your documents, or their readings, with what you told SI8 or with the guidance.')
    expect(sec(build(S8), 'documents')).toContain('Readings were not compared with what you told SI8, and were not used to select or qualify the guidance in section 2.')
  })
})

describe('G4 and shared open facts', () => {
  test('two named subjects without guidance use the plural form', () => {
    const r = rec7('FIX1-TWO', { M0: ['music', 'stock'], M1: ['artlist'], M2: ['no'], M3: ['getty'], M3D: ['no'] }, [{ T1: ['runway-gen3'], T3: ['not_sure'], T4: ['May 2026'] }])
    const R = T(7).readiness_summary.render
    const t = sec(build(r), 'readiness_summary')
    expect(t).toContain(R.uncovered_intro.other)
    expect(t).not.toContain(R.uncovered_intro.one)
  })
})
