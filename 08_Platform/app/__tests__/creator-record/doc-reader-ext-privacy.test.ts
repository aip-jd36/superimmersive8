/**
 * CR-DOC-READER-EXT-6B — privacy-safe customer projection of licence/permission readings, on every customer surface.
 *
 * A reading that carries a third party's name and address (which only the reading instruction keeps out: validation enforces only
 * emails and phone numbers) must not reach the pre-purchase review, the PDF documents section or the PDF relationship block, whatever
 * the reading's own personal-details flag says. The stored record keeps it (internal provenance). Receipts are unchanged.
 */
import { LICENCE_CLASSIFICATION_VALUES } from '@/lib/creator-record/customer-flow/licence-compatibility'
import { LICENCE_DATE_FIELDS } from '@/lib/creator-record/licence-examination/schema'
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
  // CR-DOC-READER-EXT-7B: a name or address planted in EVERY free-text short field too.
  licence_or_plan_type: { status: 'present', value: `Pro licence for ${NAME}`, evidence: `Licence type: Pro, licensee ${NAME}` },
  content_designation: { status: 'present', value: `Editorial, ${ADDRESS}`, evidence: `Designation: Editorial (${ADDRESS})` },
  licensed_item_reference: { status: 'present', value: `Portrait of ${NAME}`, evidence: `Item: Portrait of ${NAME}` },
}
const textsOf = (b: Block): string[] => ('text' in b ? [b.text] : 'label' in b ? [b.label, b.value] : [])
const pdfText = (rec: { canonical: string; sha256: string }) =>
  buildCustomerDocument({ canonical: rec.canonical, sha256: rec.sha256, issued: ISSUED, templates: V8.templates, template_approval: SYNTHETIC_V8 }).sections.flatMap((s) => s.blocks.flatMap(textsOf))
const leaks = (texts: string[]) => texts.filter((t) => t.includes('Plantedname') || t.includes('Planted Road'))

describe('the projection rule', () => {
  test('licence: no excerpt ever; only closed-format values shown (classifications, ISO dates); every free-text value withheld; flag-independent', () => {
    // CR-DOC-READER-EXT-7B: an allow-list, exactly the closed classifications and the validator-enforced date fields.
    expect([...READING_PRIVACY_RULES.licence.shown_values].sort()).toEqual([...Object.keys(LICENCE_CLASSIFICATION_VALUES), ...LICENCE_DATE_FIELDS].sort())
    for (const f of ['permission_statement', 'licence_or_plan_type', 'content_designation', 'licensed_item_reference', 'some_future_field']) {
      expect(customerObservationText('licence', { field: f, status: 'present', value: 'x', excerpt: 'y' })).toEqual({ value: null, excerpt: null, value_withheld: true, excerpt_withheld: true })
    }
    expect(customerObservationText('licence', { field: 'issue_date', status: 'present', value: '2026-10-01', excerpt: 'Issued 2026-10-01' })).toEqual({ value: '2026-10-01', excerpt: null, value_withheld: false, excerpt_withheld: true })
    expect(customerObservationText('licence', { field: 'document_kind', status: 'present', value: 'unknown', excerpt: null })).toEqual({ value: 'unknown', excerpt: null, value_withheld: false, excerpt_withheld: false })
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
    // CR-DOC-READER-EXT-7B: free-text values withheld; the closed-format date and classification still print.
    expect(t).toEqual(expect.arrayContaining([READING_PRIVACY_TEMPLATE.value_withheld, READING_PRIVACY_TEMPLATE.excerpts_withheld, '2026-10-01', 'Permission or consent letter']))
    expect(t.filter((x) => x === READING_PRIVACY_TEMPLATE.value_withheld).length).toBeGreaterThanOrEqual(4)
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
