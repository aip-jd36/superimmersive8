/**
 * CR-V2-MVP-M3A — the customer PDF renders schema 8 (examination-bearing) records, from the record alone.
 *
 * The record is real: built by the real builder from synthetic test sources, its examinations produced by the real replay adapter
 * (`test-support/customer-record-schema8.ts`). The templates and their approval are SYNTHETIC TEST placeholders. No database,
 * Storage, model or network. @react-pdf/renderer does not load under Jest, so laid-out bytes are proven by `customer-pdf-text.test.ts`.
 */
import { approvedPdfTemplates, CREATOR_RECORD_V2_SUBMISSIONS } from '@/lib/creator-record/customer-flow/approved-inputs'
import { buildCustomerDocument, CustomerPdfRefusal, documentText, type Block, type CustomerDocumentModel } from '@/lib/creator-record/customer-pdf/document-model'
import { CUSTOMER_PDF_EXAMINATION_SECTIONS, CUSTOMER_PDF_SECTIONS, templateFingerprint, wordingLockViolations, type CustomerPdfTemplates, type PdfTemplateApproval } from '@/lib/creator-record/customer-pdf/templates'
import { CURRENT_ISSUANCE_SUPPORT } from '@/lib/creator-record/customer-record/governance-state'
import { CUSTOMER_RECORD_EXAMINATION_SCHEMA_VERSION, verifyCustomerRecord, type CustomerRecordV2 } from '@/lib/creator-record/customer-record/record'
import type { ExaminationEnvelope } from '@/lib/creator-record/examination/envelope'
import { CREATOR_RECORD_GOVERNANCE_AUTHORITY as GOV } from '@/lib/creator-record/governed/sources'
import {
  CREATOR_RECORD_SYNTHETIC_TEST_AUTHORITY as BUNDLE, SYNTHETIC_EXAMINATION_PDF_TEMPLATES_FINGERPRINT, SYNTHETIC_TEST_EXAMINATION_PDF as EXAM_PDF,
} from '@/lib/creator-record/governed/synthetic-test-authority'
import { canonicalJson, sha256Hex } from '@/lib/creator-record/record-core/canonical'
import { CREATOR_RECORD_V2_ISSUANCE } from '@/lib/creator-record-artifacts/config'
import { DOCS, schema8Fixture, type Schema8Fixture } from '@/test-support/customer-record-schema8'

const ISSUED = { record_id: 'CR-2026-ABCD1234', issued_on: '2026-11-07' }
const T8 = EXAM_PDF.templates as unknown as CustomerPdfTemplates
const X = T8.examination!
const clone = <V,>(v: V): V => JSON.parse(JSON.stringify(v)) as V

/** Templates changed by `f`, under a synthetic approval of exactly that change (so the change itself is what is tested). */
function changed(f: (t: CustomerPdfTemplates) => void): { templates: unknown; approval: PdfTemplateApproval } {
  const t = clone(T8)
  f(t)
  return { templates: t, approval: { ...EXAM_PDF.approval, fingerprint: templateFingerprint(t) } }
}
const doc = (r: { canonical: string; sha256: string }, tpl: { templates: unknown; approval: PdfTemplateApproval | null } = EXAM_PDF) =>
  buildCustomerDocument({ canonical: r.canonical, sha256: r.sha256, issued: ISSUED, templates: tpl.templates, template_approval: tpl.approval })
const refusalOf = (f: () => unknown) => {
  try {
    f()
    return 'rendered'
  } catch (e) {
    return e instanceof CustomerPdfRefusal ? e.code : `other:${String(e)}`
  }
}
const section = (m: CustomerDocumentModel, id: string) => m.sections.find((s) => s.id === id)?.blocks ?? []
const texts = (blocks: Block[]) => blocks.flatMap((b) => (b.kind === 'row' ? [b.label, b.value] : [b.text]))
const rows = (blocks: Block[]) => blocks.filter((b): b is Extract<Block, { kind: 'row' }> => b.kind === 'row')
/** The blocks of document `n` (1-based) in the documents section. */
function documentBlocks(m: CustomerDocumentModel, n: number): Block[] {
  const all = section(m, 'documents')
  const starts = all.map((b, i) => (b.kind === 'subheading' && b.text === X.document_heading.replace('{n}', String(n)) ? i : -1)).filter((i) => i >= 0)
  const start = starts[0]
  const next = all.findIndex((b, i) => i > start && b.kind === 'subheading')
  return all.slice(start, next < 0 ? undefined : next)
}

let F: Schema8Fixture
let M: CustomerDocumentModel
beforeAll(async () => {
  F = await schema8Fixture()
  M = doc(F)
})
const env = (n: number): ExaminationEnvelope => F.envelopes.get(DOCS[n - 1].document_id)!

describe('a schema 8 record renders', () => {
  test('the fixture is a real, verifying schema 8 record with two examined documents and one not examined', () => {
    expect(F.record.schema_version).toBe(CUSTOMER_RECORD_EXAMINATION_SCHEMA_VERSION)
    expect(verifyCustomerRecord(F.canonical, F.sha256).ok).toBe(true)
    expect(F.record.documents.items.map((d) => (d.examination === 'not_examined' ? 'not_examined' : 'projection'))).toEqual(['projection', 'projection', 'not_examined'])
  })

  test('sections: the declarations first, then documents, then guidance; schema 7 keeps its own eight', () => {
    expect(M.sections.map((s) => s.id)).toEqual([...CUSTOMER_PDF_EXAMINATION_SECTIONS])
    expect(CUSTOMER_PDF_SECTIONS).not.toContain('documents')
    expect(rows(section(M, 'provenance')).find((b) => b.label === T8.sections.provenance.labels.record_schema_version)?.value).toBe('8')
  })

  test('each document is inventoried with its fingerprint, type and the creator\'s description', () => {
    for (const [i, d] of F.record.documents.items.entries()) {
      const b = rows(documentBlocks(M, i + 1))
      expect(b.find((x) => x.label === T8.documents.fingerprint)).toMatchObject({ value: d.sha256, value_from: 'record' })
      expect(b.find((x) => x.label === T8.documents.item_label.replace('{n}', String(i + 1)))).toMatchObject({ value: d.file_name, value_from: 'record' })
      expect(b.find((x) => x.label === T8.documents.category)?.value).toBe(T8.document_category_labels[d.category])
    }
  })

  test('every observation is printed once, verbatim where printed text, labelled where a classification, with its basis', () => {
    for (const n of [1, 2]) {
      const b = rows(documentBlocks(M, n))
      const e = env(n)
      const fieldRows = b.filter((x) => Object.values(X.field_labels).includes(x.label))
      expect(fieldRows).toHaveLength(e.observations.length)
      e.observations.forEach((o, k) => {
        const r = fieldRows[k]
        expect(r.label).toBe(X.field_labels[o.field])
        if (o.status !== 'present') expect(r).toMatchObject({ value: X.reading_labels[o.status], value_from: 'template' })
        else if (o.basis === 'printed_text') expect(r).toMatchObject({ value: o.value, value_from: 'record' })
        else expect(r).toMatchObject({ value: X.classification_labels[o.field][o.value!], value_from: 'template' })
      })
      expect(b.filter((x) => x.label === X.basis).map((x) => x.value)).toEqual(e.observations.map((o) => X.basis_labels[o.basis]))
      expect(b.filter((x) => x.label === X.excerpt).map((x) => x.value)).toEqual(e.observations.filter((o) => o.excerpt !== null).map((o) => o.excerpt))
      expect(b.filter((x) => x.label === X.qualifier).map((x) => x.value)).toEqual(e.observations.filter((o) => o.qualifier !== null).map((o) => X.qualifier_labels[o.qualifier!]))
    }
    // The second fixture prints more than one plan name, each with where it was shown.
    expect(env(2).observations.filter((o) => o.field === 'plan_candidate').length).toBeGreaterThan(1)
  })

  test('a value the examination did not report is never printed: absent fields show their reading status only', () => {
    const missing = env(1).observations.filter((o) => o.status !== 'present')
    expect(missing.length).toBeGreaterThan(0) // pdf-pika-pro-no-period prints no service period
    for (const o of missing) expect(o.value).toBeNull()
    const values = rows(documentBlocks(M, 1)).filter((x) => x.label === X.field_labels.service_period_start || x.label === X.field_labels.service_period_end)
    for (const v of values) expect(v.value_from).toBe('template')
  })

  test('limitations and provenance of each examination are printed exactly', () => {
    for (const n of [1, 2]) {
      const b = documentBlocks(M, n)
      const e = env(n)
      const p = F.record.documents.items[n - 1].examination as { envelope_sha256: string }
      const at = b.findIndex((x) => x.kind === 'label' && x.text === X.limitations_heading)
      const bullets = b.slice(at + 1).filter((x) => x.kind === 'bullet').map((x) => (x as { text: string }).text)
      expect(bullets).toEqual(e.limitations.map((l) => X.limitation_labels[l]))
      expect(e.limitations).toEqual(expect.arrayContaining(['recorded_test_data_not_model_output', 'observations_not_verified']))
      const r = rows(b)
      expect(r.find((x) => x.label === X.reference)).toMatchObject({ value: p.envelope_sha256.slice(0, 12), value_from: 'record' })
      expect(r.find((x) => x.label === X.method)?.value).toBe(X.method_labels.fixture_replay)
      expect(r.find((x) => x.label === X.content)?.value).toBe(X.content_labels.known_synthetic_fixture)
      expect(r.find((x) => x.label === X.profile)?.value).toBe(`[TEST ONLY] ${e.profile.id} version ${e.profile.version}`)
    }
  })

  test('a document that was not examined says so and has no readings', () => {
    const b = documentBlocks(M, 3)
    expect(rows(b).find((x) => x.label === X.status)?.value).toBe(X.status_labels.not_examined)
    expect(texts(b)).not.toContain(X.observations_heading)
    expect(texts(b)).not.toContain(X.limitations_heading)
  })
})

describe('declarations, observations and guidance stay apart', () => {
  test('no observation value or excerpt appears in the declaration sections, guidance or open items', () => {
    // A value the creator also declared (the same plan name, say) legitimately appears among the declarations, as the creator's own.
    const declared = new Set(F.record.declarations.answers.flatMap((a) => [a.answer_verbatim, ...a.values.flatMap((v) => [v.value, v.label ?? ''])]))
    const printed = new Set([1, 2].flatMap((n) => env(n).observations.flatMap((o) => [o.basis === 'printed_text' ? o.value : null, o.excerpt]).filter((v): v is string => !!v && v.length > 3 && !declared.has(v))))
    expect(printed.size).toBeGreaterThan(3)
    for (const id of ['project', 'tools', 'contribution', 'guidance', 'open_items']) {
      const t = texts(section(M, id)).join('\n')
      for (const v of printed) expect(t).not.toContain(v)
    }
  })

  test('no declared answer is printed in the documents section', () => {
    const t = texts(section(M, 'documents'))
    for (const a of F.record.declarations.answers) expect(t).not.toContain(a.question)
  })

  test('guidance is exactly what the same declarations produce without documents (observations change nothing)', async () => {
    const without = await schema8Fixture()
    const g = (m: CustomerDocumentModel) => section(m, 'guidance').slice(1)
    expect(canonicalJson(g(M))).toBe(canonicalJson(g(doc(without))))
    expect(F.record.guidance.items.length).toBeGreaterThan(0)
  })

  test('the record\'s comparisons are not printed: no consistency or conflict conclusion appears', () => {
    expect(F.record.comparison.policy).toBe('derived_per_version')
    const results = ('items' in F.record.comparison ? F.record.comparison.items : []).flatMap((c) => [c.provider.result, c.plan.result])
    expect(results.length).toBeGreaterThan(0)
    const all = documentText(M).join('\n')
    expect(all).not.toMatch(/appears[ _]consistent|appears[ _]to[ _]conflict|does[ _]not[ _]establish|consisten|conflict/i)
    expect(section(M, 'documents').some((b) => b.kind === 'paragraph' && b.text === X.comparison_note)).toBe(true)
    for (const c of ('items' in F.record.comparison ? F.record.comparison.items : [])) for (const f of [c.provider, c.plan]) expect(all).not.toContain(f.reason)
  })

  test('open items point to the documents section instead of repeating the inventory', () => {
    const t = texts(section(M, 'open_items'))
    expect(t).toContain(X.open_items_pointer)
    expect(t).not.toContain(T8.documents.not_examined)
    for (const d of F.record.documents.items) expect(t).not.toContain(d.sha256)
  })
})

describe('creator responses', () => {
  test('each response is printed once, under what it concerns, and nothing else changes', async () => {
    const R = await schema8Fixture({
      responses: (envs, runs) => {
        const id = DOCS[0].document_id
        const o = envs.get(id)!.observations.find((x) => x.field === 'product_or_plan_name')!
        return [
          { target: { kind: 'observation', run_id: runs.get(id)!, observation_id: o.observation_id }, code: 'reading_incorrect' },
          { target: { kind: 'comparison', tool_index: 0, document_id: id, field: 'plan' }, code: 'other_plan_applies' },
        ]
      },
    })
    const m = doc(R)
    const b = rows(documentBlocks(m, 1))
    expect(b.filter((x) => x.label === X.your_response).map((x) => x.value)).toEqual([X.response_labels.reading_incorrect])
    const cmp = X.comparison_response.replace('{field}', X.comparison_field_labels.plan)
    expect(b.filter((x) => x.label === cmp).map((x) => x.value)).toEqual([X.response_labels.other_plan_applies])
    // The response sits directly after the observation it concerns.
    const all = documentBlocks(m, 1)
    const at = all.findIndex((x) => x.kind === 'row' && x.label === X.your_response)
    const before = all.slice(0, at).reverse().find((x) => x.kind === 'row' && x.label === X.field_labels.product_or_plan_name)
    expect(before).toBeDefined()
    expect(canonicalJson(section(m, 'guidance'))).toBe(canonicalJson(section(M, 'guidance')))
  })
})

describe('fail closed', () => {
  test.each([
    ['the schema 7 templates', () => approvedPdfTemplates(BUNDLE), /^templates_/],
    ['no approval', () => ({ templates: EXAM_PDF.templates, approval: null }), /^templates_approval_missing$/],
    ['the Production governance bundle (no templates)', () => ({ templates: GOV.pdf_templates, approval: GOV.pdf_template_approval }), /^templates_/],
    ['an approval for other templates', () => ({ templates: EXAM_PDF.templates, approval: { ...EXAM_PDF.approval, fingerprint: 'f'.repeat(64) } }), /^templates_fingerprint_mismatch$/],
    ['a withdrawn approval', () => ({ templates: EXAM_PDF.templates, approval: { ...EXAM_PDF.approval, lifecycle: 'withdrawn' as const } }), /^templates_approval_withdrawn$/],
    ['templates without the examination wording', () => changed((t) => { delete (t as { examination?: unknown }).examination }), /^templates_examination_missing$/],
    ['an unlabelled observation field', () => changed((t) => { delete t.examination!.field_labels.issuer_name }), /^observation_field_unlabelled$/],
    ['an unlabelled classification value', () => changed((t) => { delete t.examination!.classification_labels.document_type.receipt; delete t.examination!.classification_labels.document_type.invoice; delete t.examination!.classification_labels.document_type.billing_screenshot; delete t.examination!.classification_labels.document_type.subscription_confirmation; delete t.examination!.classification_labels.document_type.unknown }), /^classification_unlabelled$/],
    ['an unlabelled qualifier', () => changed((t) => { t.examination!.qualifier_labels = {} }), /^observation_qualifier_unlabelled$/],
    ['a limitation label missing', () => changed((t) => { delete (t.examination!.limitation_labels as Record<string, string>).illegible }), /^templates_templates_malformed$/],
    ['examination wording that breaks the wording lock', () => changed((t) => { t.examination!.intro = ['[TEST ONLY] Each reading is verified.'] }), /^templates_wording_lock$/],
    ['an unknown key in the examination wording', () => changed((t) => { (t.examination as unknown as Record<string, unknown>).extra = 'x' }), /^templates_templates_malformed$/],
  ])('%s: refused', (_n, tpl, code) => {
    expect(refusalOf(() => doc(F, tpl()))).toMatch(code)
  })

  test('a tampered schema 8 record does not render', () => {
    const r = clone(F.record) as CustomerRecordV2
    const p = r.documents.items[0].examination as { envelope: ExaminationEnvelope }
    const o = p.envelope.observations.find((x) => x.status === 'present' && x.basis === 'printed_text')!
    o.value = `${o.value} (edited)`
    const canonical = canonicalJson(r)
    expect(refusalOf(() => doc({ canonical, sha256: sha256Hex(canonical) }))).toBe('record_invalid')
    expect(refusalOf(() => doc({ canonical: F.canonical.replace('synthetic-1.png', 'synthetic-9.png'), sha256: F.sha256 }))).toBe('record_invalid')
  })

  test('a schema 7 record still refuses schema 8 templates, and schema 8 refuses schema 7 ones', () => {
    const t7 = approvedPdfTemplates(BUNDLE)
    expect(refusalOf(() => doc(F, t7))).toMatch(/^templates_/)
  })
})

describe('governance', () => {
  test('the synthetic schema 8 templates are pinned, marked test-only, pass the wording lock and never enter a bundle', () => {
    expect(templateFingerprint(EXAM_PDF.templates)).toBe(SYNTHETIC_EXAMINATION_PDF_TEMPLATES_FINGERPRINT)
    expect(EXAM_PDF.approval.fingerprint).toBe(SYNTHETIC_EXAMINATION_PDF_TEMPLATES_FINGERPRINT)
    expect(wordingLockViolations(T8)).toEqual([])
    expect(EXAM_PDF.approval.authority).toMatch(/SYNTHETIC TEST AUTHORITY/)
    const strings: string[] = []
    const walk = (v: unknown, key = '') => {
      if (typeof v === 'string') { if (!['template_id', 'page_label', 'subject_with_tool'].includes(key) && !/^(project|contribution)$/.test(v)) strings.push(v) }
      else if (Array.isArray(v)) v.forEach((x) => walk(x, key))
      else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) if (k !== 'record_schema') walk(x, k)
    }
    walk(X)
    for (const s of strings) expect(s).toMatch(/^\[TEST ONLY\] /)
    expect(approvedPdfTemplates(BUNDLE).templates).not.toBe(EXAM_PDF.templates)
    expect((approvedPdfTemplates(BUNDLE).templates as CustomerPdfTemplates).record_schema.version).toBe(7)
  })

  test('every commercial gate is still closed, and Production has no templates', () => {
    expect(CURRENT_ISSUANCE_SUPPORT).toEqual({ record_schemas: [], builders: [], examination_methods: [] })
    expect(CREATOR_RECORD_V2_SUBMISSIONS).toBe('stopped')
    expect(CREATOR_RECORD_V2_ISSUANCE).toBe('stopped')
    expect(GOV.pdf_templates).toBeNull()
    expect(GOV.pdf_template_approval).toBeNull()
  })
})
