/**
 * CR-DOC-READER-EXT-6B — privacy-safe customer projection of licence/permission readings, on every customer surface.
 *
 * A reading that carries a third party's name and address (which only the reading instruction keeps out: validation enforces only
 * emails and phone numbers) must not reach the pre-purchase review, the PDF documents section or the PDF relationship block, whatever
 * the reading's own personal-details flag says. The stored record keeps it (internal provenance). Receipts are unchanged.
 */
import { buildCustomerDocument, type Block } from '@/lib/creator-record/customer-pdf/document-model'
import { examinationViewOf } from '@/lib/creator-record/customer-flow/service'
import { customerObservationText, READING_PRIVACY_RULES } from '@/lib/creator-record/customer-record/reading-privacy'
import { missingLicenceLabels } from '@/lib/creator-record/customer-flow/licence-compatibility'
import { approvedPdfTemplates } from '@/lib/creator-record/customer-flow/approved-inputs'
import { CUSTOMER_RECORD_SCHEMA, verifyCustomerRecord } from '@/lib/creator-record/customer-record/record'
import { ISSUED, LICENCE_OUTPUT, licenceRecord, SYNTHETIC_V8, V8 } from '@/test-support/doc-reader-ext-fixture'
import { READING_PRIVACY_TEMPLATE } from '@/test-support/doc-reader-ext-2-template'

const NAME = 'Jane Plantedname'
const ADDRESS = '12 Planted Road, Exampletown'
/** A permission reading with a third party's name and address in a value and in excerpts, and the flag (wrongly) false. */
const PLANTED = {
  ...LICENCE_OUTPUT,
  document_kind: 'permission_or_consent_letter',
  personal_details_present: false,
  permission_statement: { status: 'present', value: `${NAME} grants permission to use the photograph`, evidence: `I, ${NAME} of ${ADDRESS}, grant permission` },
  licence_or_plan_type: { status: 'present', value: 'Pro', evidence: `Licence type: Pro, licensee ${NAME}` },
}
const textsOf = (b: Block): string[] => ('text' in b ? [b.text] : 'label' in b ? [b.label, b.value] : [])
const pdfText = (rec: { canonical: string; sha256: string }) =>
  buildCustomerDocument({ canonical: rec.canonical, sha256: rec.sha256, issued: ISSUED, templates: V8.templates, template_approval: SYNTHETIC_V8 }).sections.flatMap((s) => s.blocks.flatMap(textsOf))
const leaks = (texts: string[]) => texts.filter((t) => t.includes('Plantedname') || t.includes('Planted Road'))

describe('the projection rule', () => {
  test('licence: no excerpt ever; the permission statement withheld; other values kept; independent of the personal-details flag', () => {
    expect(READING_PRIVACY_RULES.licence.withheld_values).toEqual(['permission_statement'])
    expect(customerObservationText('licence', { field: 'permission_statement', status: 'present', value: 'x', excerpt: 'y' })).toEqual({ value: null, excerpt: null, value_withheld: true, excerpt_withheld: true })
    expect(customerObservationText('licence', { field: 'licence_or_plan_type', status: 'present', value: 'Pro', excerpt: 'Licence type: Pro' })).toEqual({ value: 'Pro', excerpt: null, value_withheld: false, excerpt_withheld: true })
    expect(customerObservationText('licence', { field: 'permission_statement', status: 'not_shown', value: null, excerpt: null })).toEqual({ value: null, excerpt: null, value_withheld: false, excerpt_withheld: false })
  })
  test('receipt readings pass through unchanged', () => {
    const o = { field: 'product_or_plan_name', status: 'present', value: 'Standard', excerpt: 'Plan: Standard' }
    expect(customerObservationText('receipt', o)).toEqual({ value: 'Standard', excerpt: 'Plan: Standard', value_withheld: false, excerpt_withheld: false })
  })
  test('a licence reading cannot be enabled with a set lacking the privacy lines (v7 lacks them; v8 has them)', () => {
    expect(missingLicenceLabels(approvedPdfTemplates(undefined, { id: CUSTOMER_RECORD_SCHEMA, version: 8 }).templates)).toEqual(expect.arrayContaining(['reading_privacy:value_withheld', 'reading_privacy:excerpts_withheld']))
    expect(missingLicenceLabels(V8.templates)).toEqual([])
  })
})

describe('every customer surface withholds; the record keeps the reading', () => {
  test('the stored record still holds the planted text (internal provenance unchanged)', async () => {
    const rec = await licenceRecord({ M0: ['music'], M1: ['artlist'], M2: ['yes'] }, 'permission', null, PLANTED)
    expect(rec.canonical).toContain(NAME)
    expect(verifyCustomerRecord(rec.canonical, rec.sha256).ok).toBe(true)
  })

  test('PDF documents section: no name or address anywhere; fixed lines printed; structured values kept', async () => {
    const rec = await licenceRecord({ M0: ['music'], M1: ['artlist'], M2: ['yes'] }, 'licence', null, PLANTED)
    const t = pdfText(rec)
    expect(leaks(t)).toEqual([])
    expect(t).toEqual(expect.arrayContaining([READING_PRIVACY_TEMPLATE.value_withheld, READING_PRIVACY_TEMPLATE.excerpts_withheld, 'Pro', 'Synthetic Track 7']))
    expect(t).not.toContain('Licence type: Pro')
  })

  test('PDF relationship block (v2): the permission statement it relates to a point is withheld too', async () => {
    const rec = await licenceRecord({ M0: ['stock'], M3: ['pond5'], M3D: ['yes'] }, 'permission', null, PLANTED)
    const t = pdfText(rec)
    expect(leaks(t)).toEqual([])
    const i = t.indexOf('Appears to show')
    expect(i).toBeGreaterThanOrEqual(0)
    expect(t[i + 1]).toBe(READING_PRIVACY_TEMPLATE.value_withheld)
  })

  test('pre-purchase review: withheld server-side (the browser never receives the text)', async () => {
    const rec = await licenceRecord({ M0: ['music'], M1: ['artlist'], M2: ['yes'] }, 'licence', null, PLANTED)
    const record = verifyCustomerRecord(rec.canonical, rec.sha256)
    if (!record.ok) throw new Error('record')
    const withText = examinationViewOf(record.record, READING_PRIVACY_TEMPLATE)
    expect(JSON.stringify(withText)).not.toMatch(/Plantedname|Planted Road/)
    const obs = withText.documents[0].observations
    expect(obs.find((o) => o.field === 'permission_statement')?.value).toBe(READING_PRIVACY_TEMPLATE.value_withheld)
    expect(obs.every((o) => o.excerpt === null)).toBe(true)
    expect(withText.documents[0].privacy_notice).toBe(READING_PRIVACY_TEMPLATE.excerpts_withheld)
    const withoutText = examinationViewOf(record.record, null)
    expect(JSON.stringify(withoutText)).not.toMatch(/Plantedname|Planted Road/)
    expect(withoutText.documents[0].observations.find((o) => o.field === 'permission_statement')?.value).toBeNull()
  })
})
