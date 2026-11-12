/**
 * CR-SUM-PDF-B1 — Option R: a template set carrying `readiness_summary` replaces `guidance` and `open_items` with the
 * consultative summary and `record_limitations`. INERT: no approved template set carries the block; every Option R set here
 * is a synthetic test set (`optionRTemplates`), registered nowhere. Records are real, locally built.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { approvedPdfTemplates } from '@/lib/creator-record/customer-flow/approved-inputs'
import { buildCustomerDocument, CustomerPdfRefusal, documentModelCanonical, documentText, type CustomerDocumentModel } from '@/lib/creator-record/customer-pdf/document-model'
import { CUSTOMER_PDF_EXAMINATION_SECTIONS, CUSTOMER_PDF_READINESS_EXAMINATION_SECTIONS, CUSTOMER_PDF_READINESS_SECTIONS, CUSTOMER_PDF_SECTIONS, fill, type CustomerPdfTemplates } from '@/lib/creator-record/customer-pdf/templates'
import { CUSTOMER_RECORD_SCHEMA } from '@/lib/creator-record/customer-record/record'
import { CREATOR_RECORD_GOVERNANCE_AUTHORITY as GOV } from '@/lib/creator-record/governed/sources'
import { SYNTHETIC_TEST_EXAMINATION_PDF as EXAM_PDF } from '@/lib/creator-record/governed/synthetic-test-authority'
import { canonicalJson, sha256Hex } from '@/lib/creator-record/record-core/canonical'
import { legacyCases, legacyTemplateSet, type LegacyCase } from '@/test-support/readiness-legacy-cases'
import { liveRecord, optionRTemplates, PROPOSED_RENDER_TEMPLATES, PROPOSED_SUMMARY_TEMPLATES } from '@/test-support/readiness-scenarios'

const ISSUED = { record_id: 'CR-2026-0000000B', issued_on: '2026-11-12' }
const BASELINE = JSON.parse(readFileSync(join(__dirname, 'fixtures/readiness-legacy-baseline.json'), 'utf8')) as Record<string, { model_sha256: string }>
const legacyTemplates = (c: LegacyCase) => legacyTemplateSet(c)
const optionR = (c: LegacyCase, block?: Parameters<typeof optionRTemplates>[2]) => optionRTemplates(legacyTemplateSet(c), c.record.record.schema_version as 7 | 8, block)
const build = (r: { canonical: string; sha256: string }, tpl: { templates: unknown; approval: any }) => buildCustomerDocument({ canonical: r.canonical, sha256: r.sha256, issued: ISSUED, templates: tpl.templates, template_approval: tpl.approval })
const sectionText = (m: CustomerDocumentModel, ids: string[]) => m.sections.filter((s) => ids.includes(s.id)).flatMap((s) => s.blocks.flatMap((b) => (b.kind === 'row' ? [b.label, b.value] : [b.text])))
const count = (haystack: string[], needle: string) => haystack.filter((x) => x === needle).length

let CASES: LegacyCase[] = []
const LEGACY: Record<string, CustomerDocumentModel> = {}
const OPTION_R: Record<string, CustomerDocumentModel> = {}
beforeAll(async () => {
  CASES = await legacyCases()
  for (const c of CASES) {
    LEGACY[c.name] = build(c.record, legacyTemplates(c))
    OPTION_R[c.name] = build(c.record, optionR(c))
  }
})

describe('existing approved template sets keep their original behaviour', () => {
  test('no approved template set carries the readiness block, so the live path can never select it', () => {
    for (const v of [7, 8]) expect((approvedPdfTemplates(GOV as never, { id: CUSTOMER_RECORD_SCHEMA, version: v }).templates as CustomerPdfTemplates).readiness_summary).toBeUndefined()
  })
  test('legacy models are byte-identical to the baseline captured before the change (independent fixture)', () => {
    expect(Object.keys(BASELINE).sort()).toEqual(CASES.map((c) => c.name).sort())
    for (const c of CASES) expect([c.name, sha256Hex(documentModelCanonical(LEGACY[c.name]))]).toEqual([c.name, BASELINE[c.name].model_sha256])
  })
  test('legacy section order is unchanged (guidance and open items, no summary)', () => {
    for (const c of CASES) expect(LEGACY[c.name].sections.map((s) => s.id)).toEqual([...(c.record.record.schema_version === 8 ? CUSTOMER_PDF_EXAMINATION_SECTIONS : CUSTOMER_PDF_SECTIONS)])
  })
})

describe('Option R replaces, never duplicates', () => {
  test('section order: the summary and record limitations replace guidance and open items; never both presentations', () => {
    for (const c of CASES) {
      const ids = OPTION_R[c.name].sections.map((s) => s.id)
      expect(ids).toEqual([...(c.record.record.schema_version === 8 ? CUSTOMER_PDF_READINESS_EXAMINATION_SECTIONS : CUSTOMER_PDF_READINESS_SECTIONS)])
      expect(ids).not.toContain('guidance')
      expect(ids).not.toContain('open_items')
    }
  })
  test('the unchanged sections (about, declarations, documents, not done, provenance) are identical to the legacy ones', () => {
    for (const c of CASES) {
      const keep = ['about', 'project', 'tools', 'contribution', 'documents', 'not_done']
      for (const id of keep) expect([c.name, id, canonicalJson(OPTION_R[c.name].sections.find((s) => s.id === id) ?? null)]).toEqual([c.name, id, canonicalJson(LEGACY[c.name].sections.find((s) => s.id === id) ?? null)])
    }
  })
  test('provenance is the legacy provenance, except that each publication is referenced by its consideration number', () => {
    for (const c of CASES) {
      const T = legacyTemplates(c).templates as CustomerPdfTemplates
      const record = JSON.parse(c.record.canonical)
      const itemRefs = new Set(record.guidance.items.map((_: unknown, n: number) => fill(T.sections.open_items.item_ref, { index: n + 1 })))
      const legacy = LEGACY[c.name].sections.find((s) => s.id === 'provenance')!.blocks
      const now = OPTION_R[c.name].sections.find((s) => s.id === 'provenance')!.blocks
      expect([c.name, now.length]).toEqual([c.name, legacy.length])
      const swapped: number[] = []
      legacy.forEach((was, k) => {
        const b = now[k]
        if (was.kind === 'label' && itemRefs.has(was.text)) {
          // The publication's legacy "Item n" label → the summary's own consideration reference for the same claim.
          expect([c.name, b.kind, b.kind === 'row' ? b.label : null]).toEqual([c.name, 'row', PROPOSED_RENDER_TEMPLATES.consideration_ref_label])
          swapped.push(Number(b.kind === 'row' ? b.value : NaN))
        } else if (was.kind === 'row' && (was.label === T.sections.provenance.labels.templates_version || was.label === T.sections.provenance.labels.templates_fingerprint)) {
          // The template set's own identity: the Option R set's version and fingerprint, as its model identity states.
          const id = OPTION_R[c.name].identity.templates
          expect([c.name, b.kind === 'row' ? b.value : null]).toEqual([c.name, was.label === T.sections.provenance.labels.templates_version ? String(id.version) : id.fingerprint])
        } else expect([c.name, k, canonicalJson(b)]).toEqual([c.name, k, canonicalJson(was)])
      })
      expect([c.name, swapped.length]).toEqual([c.name, record.sources.publications.length])
      for (const v of swapped) expect(Number.isInteger(v) && v >= 1 && v <= record.guidance.items.length).toBe(true)
    }
  })
  test('one numbering scheme: no legacy "Item n" reference anywhere in an Option R document', () => {
    for (const c of CASES) {
      const T = legacyTemplates(c).templates as CustomerPdfTemplates
      const record = JSON.parse(c.record.canonical)
      const text = documentText(OPTION_R[c.name])
      for (let n = 1; n <= record.guidance.items.length; n++) expect([c.name, n, count(text, fill(T.sections.open_items.item_ref, { index: n }))]).toEqual([c.name, n, 0])
    }
  })
  test('one numbering scheme: no legacy "Item n" heading, and each governed explanation is printed exactly once', () => {
    for (const c of CASES) {
      const T = legacyTemplates(c).templates as CustomerPdfTemplates
      const text = documentText(OPTION_R[c.name])
      const itemHeading = new RegExp('^' + T.sections.guidance.item_heading.replace(/[.*+?^$()|[\]\\]/g, '\\$&').replace('\\{index\\}', '\\d+').replace('{index}', '\\d+').replace('{subject}', '.+') + '$')
      expect(text.filter((x) => itemHeading.test(x))).toEqual([])
      const record = JSON.parse(c.record.canonical)
      for (const i of record.guidance.items) expect([c.name, i.claim_id, count(text, i.explanation)]).toEqual([c.name, i.claim_id, 1])
    }
  })
})

describe('coverage: every material element of the replaced sections is accounted for', () => {
  test('each string the legacy guidance and open-items sections print is in the Option R document, or is a declared replacement', () => {
    for (const c of CASES) {
      const T = legacyTemplates(c).templates as CustomerPdfTemplates
      const S = T.sections
      const legacyStrings = sectionText(LEGACY[c.name], ['guidance', 'open_items'])
      const optionText = documentText(OPTION_R[c.name])
      const items: { claim_id: string }[] = JSON.parse(c.record.canonical).guidance.items
      // Declared replacements: headings, numbering and navigation the summary replaces with its own structure.
      const replaced = (s: string): string | null => {
        if (s === S.guidance.heading || s === S.open_items.heading) return 'section heading → summary headings'
        if (s === S.guidance.intro) return null // must be present (the summary reuses it)
        if (s === S.open_items.intro) return 'open-items intro → "What remains open" + the same second sentence'
        if (items.some((_, n) => s.startsWith(fill(S.guidance.item_heading, { index: n + 1, subject: '' }).trimEnd().replace(/:$/, '')))) return 'item heading → consideration reference + topic + subject'
        if (s === S.open_items.for_guidance) return '"Relates to" → consideration reference'
        if (items.some((_, n) => s === fill(S.open_items.item_ref, { index: n + 1 }))) return '"Item n" reference → consideration reference'
        if (s === S.open_items.not_established_heading) return 'fact grouping → the same fact label under each consideration'
        if (/^\d+(, \d+)*$/.test(s.replace(/^\D*/, '')) && s.startsWith(S.open_items.affects.split('{items}')[0])) return '"Affects items" → per-consideration "Depends on"'
        if (c.record.record.schema_version === 8 && (s === S.open_items.documents_heading || s === T.examination?.open_items_pointer)) return 'navigation to the documents section (kept as its own section)'
        return null
      }
      const unaccounted = legacyStrings.filter((s) => !optionText.includes(s) && replaced(s) === null)
      expect([c.name, unaccounted]).toEqual([c.name, []])
      // The fact labels of every "Affects items" row are still shown under the considerations they affect.
      for (const s of legacyStrings) if (s === S.open_items.not_established_heading) expect(optionText).toContain(S.guidance.depends_on)
    }
  })
  test('record limitations stay visible, verbatim and in order', () => {
    for (const c of CASES) {
      const T = legacyTemplates(c).templates as CustomerPdfTemplates
      const lim = OPTION_R[c.name].sections.find((s) => s.id === 'record_limitations')!
      const texts = lim.blocks.map((b) => (b.kind === 'row' ? b.value : b.text))
      expect(texts.slice(-T.sections.open_items.limitations.length)).toEqual(T.sections.open_items.limitations)
      expect(texts).toContain(T.sections.open_items.limitations_heading)
    }
  })
  test('the approved integrated assessment stays inside its own consideration, exactly as the legacy PDF prints it', () => {
    const c = CASES.find((x) => x.name === 's8ia-linked-docs')!
    const ia = (legacyTemplateSet(c).templates as unknown as CustomerPdfTemplates).integrated_assessment!
    const legacyGuidance = LEGACY[c.name].sections.find((s) => s.id === 'guidance')!.blocks
    const summary = OPTION_R[c.name].sections.find((s) => s.id === 'readiness_summary')!.blocks
    const iaStarts = (bs: typeof summary) => bs.map((b, i) => (b.kind === 'label' && b.text === ia.heading ? i : -1)).filter((i) => i >= 0)
    expect(iaStarts(summary).length).toBe(iaStarts(legacyGuidance).length)
    expect(iaStarts(summary).length).toBeGreaterThan(0)
    // Each legacy integrated-assessment block run reappears unchanged in the summary section.
    const runs = (bs: typeof summary) => iaStarts(bs).map((start) => {
      const end = bs.findIndex((b, i) => i > start && b.kind === 'paragraph' && b.text.startsWith(ia.method.split('{version}')[0]))
      return canonicalJson(bs.slice(start, end + 1))
    })
    expect(runs(summary).sort()).toEqual(runs(legacyGuidance).sort())
  })
})

describe('fail closed and isolation', () => {
  const c7 = () => CASES.find((x) => x.name === 's7-5-unresolved-and-topic-caps')!
  test('a summary that refuses stops the document: no fallback to the legacy presentation', () => {
    const broken = optionR(c7(), { summary: { ...PROPOSED_SUMMARY_TEMPLATES, topic_framing: { commercial_use: PROPOSED_SUMMARY_TEMPLATES.topic_framing.commercial_use } }, render: PROPOSED_RENDER_TEMPLATES })
    let code = 'built'
    try {
      build(c7().record, broken)
    } catch (e) {
      code = e instanceof CustomerPdfRefusal ? e.code : `other:${String(e)}`
    }
    expect(code).toBe('readiness_summary_refused')
  })
  test('a render that refuses stops the document', () => {
    const broken = optionR(c7(), { summary: PROPOSED_SUMMARY_TEMPLATES, render: { ...PROPOSED_RENDER_TEMPLATES, fact_labels: {} } })
    expect(() => build(c7().record, broken)).toThrow(CustomerPdfRefusal)
  })
  test('a block changed after approval, or an unapproved set, refuses before anything is composed', () => {
    const t = optionR(c7())
    const tampered = { ...t.templates, readiness_summary: { summary: PROPOSED_SUMMARY_TEMPLATES, render: { ...PROPOSED_RENDER_TEMPLATES, heading: 'changed' } } }
    expect(() => build(c7().record, { templates: tampered, approval: t.approval })).toThrow(CustomerPdfRefusal)
    expect(() => build(c7().record, { templates: t.templates, approval: null })).toThrow(CustomerPdfRefusal)
  })
  test('determinism and version isolation: a record version renders the same every time, and another version does not affect it', () => {
    const r1 = liveRecord('PREP-B1-ISO', { P1: ['Isolation'], P3: ['own_channels'], F1: ['TW'], F2: ['TW'], L1: ['no'], H1: ['edited'], M0: ['none'] }, [{ T1: ['runway-gen3'], T3: ['Pro'], T4: ['May 2026'] }], 1)
    const set7 = optionR(c7())
    const a = documentModelCanonical(build(r1, set7))
    const r2 = liveRecord('PREP-B1-ISO', { P1: ['Isolation'], P3: ['own_channels'], F1: ['TW'], F2: ['TW'], L1: ['no'], H1: ['edited'], M0: ['none'] }, [{ T1: ['runway-gen3'], T3: ['not_sure'], T4: ['May 2026'] }], 2)
    const b = documentModelCanonical(build(r2, set7))
    expect(b).not.toBe(a)
    expect(documentModelCanonical(build(r1, set7))).toBe(a)
  })
  test('D10: outside the approved integrated assessment, the summary section carries no reading value or excerpt', () => {
    for (const c of CASES.filter((x) => x.record.record.schema_version === 8)) {
      const record = JSON.parse(c.record.canonical)
      const readings = new Set<string>()
      for (const d of record.documents.items) if (d.examination !== 'not_examined') for (const o of d.examination.envelope.observations) for (const t of [o.value, o.excerpt]) if (typeof t === 'string') readings.add(t)
      const declared = new Set<string>()
      const walk = (v: unknown) => { if (typeof v === 'string') declared.add(v); else if (v && typeof v === 'object') Object.values(v).forEach(walk) }
      walk(record.declarations)
      const ia = (legacyTemplateSet(c).templates as unknown as CustomerPdfTemplates).integrated_assessment
      const blocks = OPTION_R[c.name].sections.find((s) => s.id === 'readiness_summary')!.blocks
      let inIa = false
      for (const b of blocks) {
        if (ia && b.kind === 'label' && b.text === ia.heading) inIa = true
        const texts = b.kind === 'row' ? [b.label, b.value] : [b.text]
        if (!inIa) for (const t of texts) if (readings.has(t)) expect([c.name, t, declared.has(t)]).toEqual([c.name, t, true])
        if (ia && b.kind === 'paragraph' && b.text.startsWith(ia.method.split('{version}')[0])) inIa = false
      }
    }
  })
})
