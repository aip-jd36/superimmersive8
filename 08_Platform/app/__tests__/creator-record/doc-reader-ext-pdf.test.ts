/**
 * CR-DOC-READER-EXT-2 — candidate PDF template set v8 (inactive) with integrated assessment v2, end to end (fixture:
 * `test-support/doc-reader-ext-fixture.ts`). Also: the v8 set is refused without an approval, v2 is refused outside the reading
 * layout, the v1 guard still refuses, and every registered set is unchanged.
 */
import { approvedPdfTemplates } from '@/lib/creator-record/customer-flow/approved-inputs'
import { buildCustomerDocument, CustomerPdfRefusal, type Block } from '@/lib/creator-record/customer-pdf/document-model'
import { checkTemplates, templateFingerprint } from '@/lib/creator-record/customer-pdf/templates'
import { CUSTOMER_RECORD_SCHEMA } from '@/lib/creator-record/customer-record/record'
import { candidateTemplateSetV8, CR_DOC_READER_EXT_2_TEMPLATE_STATUS, READING_PRIVACY_TEMPLATE, V7_FIELDS_NOT_ESTABLISHED, V8_FIELDS_NOT_ESTABLISHED, V7_NOT_DONE_COMPARISON_LINE, V8_NOT_DONE_COMPARISON_LINE } from '@/test-support/doc-reader-ext-2-template'
import { CREATOR_RECORD_PDF_TEMPLATE_SETS } from '@/lib/creator-record/governed/sources'
import { ISSUED, licenceRecord, SYNTHETIC_V8, V8 } from '@/test-support/doc-reader-ext-fixture'

const textsOf = (b: Block): string[] => ('text' in b ? [b.text] : 'label' in b ? [b.label, b.value] : [])
const docTexts = (m: ReturnType<typeof buildCustomerDocument>) => m.sections.find((s) => s.id === 'documents')!.blocks.flatMap(textsOf)
const allTexts = (m: ReturnType<typeof buildCustomerDocument>) => m.sections.flatMap((s) => s.blocks.flatMap(textsOf))

describe('candidate template set v8', () => {
  test('proposed, pending: refused for issuance without an approval; its content passes the template contract and wording lock', () => {
    expect(V8.status).toBe(CR_DOC_READER_EXT_2_TEMPLATE_STATUS)
    const pending = checkTemplates(V8.templates, V8.approval, { id: CUSTOMER_RECORD_SCHEMA, version: 8 })
    expect(pending.ok).toBe(false)
    expect(pending.ok ? [] : pending.refusals.map((r) => r.code)).toEqual(['approval_not_approved'])
    expect(checkTemplates(V8.templates, SYNTHETIC_V8, { id: CUSTOMER_RECORD_SCHEMA, version: 8 }).ok).toBe(true)
  })
  test('built from the approved v7 set by additions plus exactly one revised line', () => {
    const v7 = (CREATOR_RECORD_PDF_TEMPLATE_SETS as any[]).find((s) => s.approval.record_schema.version === 8 && s.approval.version === 7)
    expect(V8.base.fingerprint).toBe(v7.approval.fingerprint)
    // CR-DOC-READER-EXT-6B: reading_privacy is a further addition (the two fixed privacy lines).
    const { version, integrated_assessment_v2, reading_privacy, examination, live_examination, sections, ...rest } = V8.templates
    const { version: v7v, examination: v7x, live_examination: v7l, sections: v7s, ...v7rest } = v7.templates
    expect(rest).toEqual(v7rest)
    // CR-DOC-READER-EXT-7B R2: the fields_not_established limitation label is revised in both reading types; nothing else in them.
    expect(examination.limitation_labels.fields_not_established).toBe(V8_FIELDS_NOT_ESTABLISHED)
    expect(live_examination.limitation_labels.fields_not_established).toBe(V8_FIELDS_NOT_ESTABLISHED)
    expect(v7x.limitation_labels.fields_not_established).toBe(V7_FIELDS_NOT_ESTABLISHED)
    expect({ ...live_examination, limitation_labels: { ...live_examination.limitation_labels, fields_not_established: V7_FIELDS_NOT_ESTABLISHED } }).toEqual(v7l)
    expect(examination.field_labels.personal_details_present).toBe('Details about a person shown (as read)') // R3
    expect(integrated_assessment_v2.heading).toBe('How your documents may relate to open points in the guidance') // R1
    expect(version).toBe(8)
    expect(integrated_assessment_v2).toBeDefined()
    expect(reading_privacy).toEqual(READING_PRIVACY_TEMPLATE)
    for (const [k, v] of Object.entries(v7x.field_labels)) expect(examination.field_labels[k]).toBe(v)
    expect(sections.not_done.lines[4]).toBe(V8_NOT_DONE_COMPARISON_LINE)
    expect(v7s.not_done.lines[4]).toBe(V7_NOT_DONE_COMPARISON_LINE)
    expect({ ...sections, not_done: undefined }).toEqual({ ...v7s, not_done: undefined })
  })
  // CR-DOC-READER-EXT-5A: v8 is now registered as an INACTIVE candidate (pending); it alone carries v2, and it equals the candidate.
  test('registered sets: only the pending v8 carries v2 and equals the candidate, fingerprints match, and the live selection is unchanged', () => {
    for (const s of CREATOR_RECORD_PDF_TEMPLATE_SETS as any[]) {
      if (s.approval.version === 8) {
        expect(s.approval.lifecycle).toBe('pending')
        expect(s.templates).toEqual(candidateTemplateSetV8().templates)
      } else expect(s.templates).not.toHaveProperty('integrated_assessment_v2')
      expect(templateFingerprint(s.templates)).toBe(s.approval.fingerprint)
    }
    expect(JSON.stringify(approvedPdfTemplates())).not.toMatch(/integrated_assessment_v2/)
  })
})

describe('v8 rendering, end to end (synthetic approval)', () => {
  test('the licence reading is printed in the documents section; the v2 block relates it to the governed point and keeps it open', async () => {
    const rec = await licenceRecord({ M0: ['music'], M1: ['artlist'], M2: ['yes'] })
    const m = buildCustomerDocument({ canonical: rec.canonical, sha256: rec.sha256, issued: ISSUED, templates: V8.templates, template_approval: SYNTHETIC_V8 })
    const docs = docTexts(m)
    // What was read (documents section, unchanged mechanism) ...
    // CR-DOC-READER-EXT-6B: the value prints; its excerpt does not (privacy projection), and the fixed line says so.
    // CR-DOC-READER-EXT-7B R4: free-text values (plan type, item) are withheld too; the closed-format date and classifications print.
    expect(docs).toEqual(expect.arrayContaining(['Licence or plan type shown', READING_PRIVACY_TEMPLATE.value_withheld, '2026-10-01', 'Yes', READING_PRIVACY_TEMPLATE.excerpts_withheld]))
    expect(docs).not.toContain('Pro')
    expect(docs).not.toContain('Synthetic Track 7')
    expect(docs).not.toContain('Licence type: Pro')
    // ... then, separately, how it relates to the governed point.
    const T = V8.templates.integrated_assessment_v2
    const i = docs.indexOf(T.heading)
    expect(i).toBeGreaterThan(docs.indexOf('Licence type: Pro'))
    const v2 = docs.slice(i)
    expect(v2).toEqual(expect.arrayContaining([T.intro, 'Which Artlist licence applies', T.reading_labels.read, T.status_labels.relevant_observation_unverified, T.reason_labels.field_present, READING_PRIVACY_TEMPLATE.value_withheld, T.association, T.open_point]))
    expect(v2.join(' ')).not.toMatch(/\b(satisfied|sufficient|confirmed|cleared|approved|valid licence)\b/i)
  })
  test('association fails closed when both music and stock are declared: read, but not linked', async () => {
    const rec = await licenceRecord({ M0: ['music', 'stock'], M1: ['artlist'], M2: ['yes'], M3: ['getty'], M3D: ['yes'] })
    const docs = docTexts(buildCustomerDocument({ canonical: rec.canonical, sha256: rec.sha256, issued: ISSUED, templates: V8.templates, template_approval: SYNTHETIC_V8 }))
    const T = V8.templates.integrated_assessment_v2
    const v2 = docs.slice(docs.indexOf(T.heading))
    expect(v2).toEqual(expect.arrayContaining([T.reading_labels.read, T.status_labels.cannot_establish, T.reason_labels.association_ambiguous]))
    expect(v2).not.toContain(T.association)
  })
  test('governed conclusions are unchanged: the summary is identical with and without the v2 block', async () => {
    const rec = await licenceRecord({ M0: ['music'], M1: ['artlist'], M2: ['yes'] })
    const withV2 = buildCustomerDocument({ canonical: rec.canonical, sha256: rec.sha256, issued: ISSUED, templates: V8.templates, template_approval: SYNTHETIC_V8 })
    const noV2Templates = { ...V8.templates, integrated_assessment_v2: undefined }
    delete (noV2Templates as Record<string, unknown>).integrated_assessment_v2
    const noV2 = buildCustomerDocument({ canonical: rec.canonical, sha256: rec.sha256, issued: ISSUED, templates: noV2Templates, template_approval: { ...SYNTHETIC_V8, fingerprint: templateFingerprint(noV2Templates) } })
    for (const id of withV2.sections.map((s) => s.id).filter((id) => id !== 'documents' && id !== 'provenance')) {
      expect(withV2.sections.find((s) => s.id === id)).toEqual(noV2.sections.find((s) => s.id === id))
    }
    // Provenance differs only by the template fingerprint it prints (the two template variants differ by design).
    const prov = (m: typeof withV2) => m.sections.find((s) => s.id === 'provenance')!.blocks.flatMap(textsOf).filter((t) => !/^[0-9a-f]{64}$/.test(t))
    expect(prov(withV2)).toEqual(prov(noV2))
    expect(allTexts(withV2)).toEqual(expect.arrayContaining([V8_NOT_DONE_COMPARISON_LINE]))
  })
  test('v2 is refused outside the reading layout; the v1 guard still refuses v1 with the reading layout', async () => {
    const rec = await licenceRecord({ M0: ['music'], M1: ['artlist'], M2: ['yes'] })
    const noReadiness = { ...V8.templates }
    delete (noReadiness as Record<string, unknown>).readiness_summary
    delete (noReadiness as Record<string, unknown>).presentation
    delete (noReadiness as Record<string, unknown>).navigation
    const a = { ...SYNTHETIC_V8, fingerprint: templateFingerprint(noReadiness) }
    expect(() => buildCustomerDocument({ canonical: rec.canonical, sha256: rec.sha256, issued: ISSUED, templates: noReadiness, template_approval: a })).toThrow(CustomerPdfRefusal)
    const v3 = (CREATOR_RECORD_PDF_TEMPLATE_SETS as any[]).find((s) => s.approval.record_schema.version === 8 && s.approval.version === 3)
    const v1WithReading = { ...V8.templates, integrated_assessment: v3.templates.integrated_assessment }
    const b = { ...SYNTHETIC_V8, fingerprint: templateFingerprint(v1WithReading) }
    expect(() => buildCustomerDocument({ canonical: rec.canonical, sha256: rec.sha256, issued: ISSUED, templates: v1WithReading, template_approval: b })).toThrow(/readiness_layout_refused|integrated assessment with the reading layout/)
  })
})

// CR-DOC-READER-EXT-6A — a governed document note prints only when a relevant document is in the record.
describe('document notes are conditional on a relevant document', () => {
  const { documentNoteApplies } = jest.requireActual('@/lib/creator-record/integrated-assessment/dependency-relevance')
  const ARTLIST_NOTE = 'A document you added may show an Artlist licence or plan type.'
  const render = async (category: string, tool: number | null = null) => {
    const rec = await licenceRecord({ M0: ['music'], M1: ['artlist'], M2: ['yes'] }, category, tool)
    return allTexts(buildCustomerDocument({ canonical: rec.canonical, sha256: rec.sha256, issued: ISSUED, templates: V8.templates, template_approval: SYNTHETIC_V8 }))
  }
  test('the rule: document-scoped entries only; mapped categories, not linked to an AI tool; other entries unchanged', () => {
    const { DOCUMENT_SCOPED_NOTE_ENTRIES } = jest.requireActual('@/lib/creator-record/integrated-assessment/dependency-relevance')
    const { CANDIDATE_LEDGER_ENTRIES } = jest.requireActual('@/lib/creator-record/governed/candidates/cr-doc-reader-ext-1')
    expect([...DOCUMENT_SCOPED_NOTE_ENTRIES].sort()).toEqual(CANDIDATE_LEDGER_ENTRIES.map((e: { entry_id: string }) => e.entry_id).sort())
    const A = 'CR-DOC-READER-EXT-1-LEDGER-CLAIM-MUSIC-ARTLIST-SOCIAL-VS-PRO-001-v1'
    const P = 'CR-DOC-READER-EXT-1-LEDGER-CLAIM-POND5-EDITORIAL-COMMERCIAL-USE-CONSENT-001-v1'
    expect(documentNoteApplies(A, 'artlist_license_type_confirmed', [{ category: 'licence', tool_index: null }])).toBe(true)
    expect(documentNoteApplies(A, 'artlist_license_type_confirmed', [{ category: 'billing_receipt', tool_index: null }])).toBe(true)
    expect(documentNoteApplies(A, 'artlist_license_type_confirmed', [{ category: 'licence', tool_index: 0 }])).toBe(false)
    expect(documentNoteApplies(A, 'artlist_license_type_confirmed', [{ category: 'other', tool_index: null }])).toBe(false)
    expect(documentNoteApplies(A, 'artlist_license_type_confirmed', [])).toBe(false)
    expect(documentNoteApplies(P, 'editorial_designation_confirmed', [{ category: 'permission', tool_index: null }])).toBe(false)
    expect(documentNoteApplies(P, 'separate_authorization_obtained', [{ category: 'permission', tool_index: null }])).toBe(true)
    // A general note (e.g. the pilot Getty entry) prints with or without documents.
    expect(documentNoteApplies('PILOT-UAT-LEDGER-CLAIM-STOCK-GETTY-EDITORIAL-001-v1', 'editorial_designation_confirmed', [])).toBe(true)
  })
  test('with a licence document the note prints; without a relevant one the explanation and open point print without it', async () => {
    const withDoc = await render('licence')
    expect(withDoc.some((t) => t.startsWith(ARTLIST_NOTE))).toBe(true)
    for (const [category, tool] of [['other', null], ['licence', 0]] as const) {
      const without = await render(category, tool)
      expect(without.some((t) => t.startsWith(ARTLIST_NOTE))).toBe(false)
      expect(without).toEqual(expect.arrayContaining(['Which Artlist licence applies']))
      expect(without.some((t) => t.includes('This record does not show which Artlist licence your account holds.'))).toBe(true)
    }
  })
})

// CR-DOC-READER-EXT-7C — the founder's D5 approval is recorded on v8 without activating it.
describe('D5 approval recorded, v8 still inactive', () => {
  const { checkTemplates: check } = jest.requireActual('@/lib/creator-record/customer-pdf/templates')
  const v8 = () => (CREATOR_RECORD_PDF_TEMPLATE_SETS as any[]).find((s) => s.approval.version === 8)
  test('the approval names the approved fingerprint exactly, and the templates still hash to it', () => {
    expect(v8().approval).toMatchObject({ fingerprint: '1d0cb5f3707d210eb4b9576bae6d9be33c1e24a1d5bae260bef6d5adf60c6fbf', lifecycle: 'pending', decision_date: '2026-11-19' })
    expect(v8().approval.review_ref).toMatch(/^JD-CR-DOC-READER-EXT-7C-D5-20261119:/)
    expect(templateFingerprint(v8().templates)).toBe('1d0cb5f3707d210eb4b9576bae6d9be33c1e24a1d5bae260bef6d5adf60c6fbf')
    expect(v8().templates).toEqual(candidateTemplateSetV8().templates)
  })
  test('not active: schema 8 still selects v7, and the renderer refuses v8 while it is pending', () => {
    expect(approvedPdfTemplates(undefined, { id: CUSTOMER_RECORD_SCHEMA, version: 8 }).approval?.version).toBe(7)
    expect(() => check(v8().templates, v8().approval)).toThrow()
  })
})
