/**
 * CR-DOC-READER-EXT-9R1 — document identifiers are not contact details; real contact details still reject the whole reading.
 */
import { readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { containsContactDetails, LICENCE_FIELD_NAMES, validateLicenceExtraction } from '@/lib/creator-record/licence-examination/schema'
import { customerObservationText } from '@/lib/creator-record/customer-record/reading-privacy'

const APP = path.join(__dirname, '../..')

/** A complete, valid raw licence reading with one field overridden. */
function raw(field: (typeof LICENCE_FIELD_NAMES)[number], value: string, evidence: string = value): Record<string, unknown> {
  const notShown = { status: 'not_shown', value: null, evidence: null }
  const base: Record<string, unknown> = {
    document_kind: 'licence_or_licence_certificate', readability: 'legible', instruction_like_text_present: false, personal_details_present: false,
    ...Object.fromEntries(LICENCE_FIELD_NAMES.map((f) => [f, notShown])),
  }
  base[field] = { status: 'present', value, evidence }
  return base
}

describe('identifiers are not phone numbers', () => {
  test.each([
    'AL-TEST-0000-0000', 'License ID: AL-TEST-0000-0000', 'Order INV-2026-00012345', 'Clip ref SS-1234567890', 'Track ID: TRK_00987654', 'Licence no. LIC/2026/0001234', 'Issued 2026-11-01', 'Paper Lanterns (TRK_00987654)', '"AL-2026-12345678",',
  ])('accepted: %s', (t) => expect(containsContactDetails(t)).toBe(false))

  test.each([
    ['international phone', 'Call +1 555 123 4567'], ['local phone', 'Mobile: 0912-345-678'], ['phone in parentheses', '(555) 123-4567'], ['bare phone', '0912345678'],
    ['phone glued to a label', 'Phone:555-123-4567'], ['contact word in the token', 'Tel555-123-4567'], ['spaced digits after letters', 'AL 0000 0000'], ['bracketed numeric', '(0912345678)'], ['quoted numeric', '"0912-345-678"'],
    ['purely numeric order number (indistinguishable from a phone)', 'Order #12345678'],
  ])('rejected: %s', (_, t) => expect(containsContactDetails(t)).toBe(true))

  test.each([
    ['email alone', 'jordan@example.com'], ['identifier with an email', 'AL-2026-12345678 jordan@example.com'], ['identifier with a phone', 'Licence AL-2026-12345678, phone 555 123 4567'],
  ])('rejected: %s', (_, t) => expect(containsContactDetails(t)).toBe(true))

  test('stable across repeated calls (the global pattern keeps no state)', () => {
    for (let i = 0; i < 3; i++) {
      expect(containsContactDetails('Call 555 123 4567')).toBe(true)
      expect(containsContactDetails('AL-2026-12345678')).toBe(false)
    }
  })
})

describe('the validator: identifiers pass, contact details reject the whole reading', () => {
  test('a licence reference with a letter-led identifier in the value and the excerpt is accepted', () => {
    const r = validateLicenceExtraction(raw('licensed_item_reference', 'Paper Lanterns (TRK_00987654)', 'Track ID: TRK_00987654 "Paper Lanterns"'))
    expect(r?.licensed_item_reference).toEqual({ status: 'present', value: 'Paper Lanterns (TRK_00987654)', evidence: 'Track ID: TRK_00987654 "Paper Lanterns"' })
  })
  test.each([
    ['a phone in the excerpt', raw('licensed_item_reference', 'Paper Lanterns', 'Paper Lanterns - call 555 123 4567')],
    ['an email in the value', raw('permission_statement', 'Contact jordan@example.com for use')],
    ['an identifier plus a phone', raw('licence_or_plan_type', 'Pro AL-2026-12345678', 'Pro AL-2026-12345678 / 0912-345-678')],
    ['a purely numeric order number', raw('licensed_item_reference', 'Order #12345678')],
  ])('rejected whole: %s', (_, r) => expect(validateLicenceExtraction(r)).toBeNull())
})

describe('privacy suppression is unchanged', () => {
  test('an accepted identifier is still never shown to the customer (free-text field and excerpt withheld)', () => {
    const shown = customerObservationText('licence', { field: 'licensed_item_reference', status: 'present', value: 'Paper Lanterns (TRK_00987654)', excerpt: 'Track ID: TRK_00987654' })
    expect(shown).toEqual({ value: null, excerpt: null, value_withheld: true, excerpt_withheld: true })
  })
  test('the receipt reader does not use the licence contact check (its behaviour is unchanged)', () => {
    const dir = path.join(APP, 'lib/creator-record/receipt-examination')
    // The shared live caller imports only the licence JSON schema and its version (for the licence reading contract), never the check.
    for (const f of readdirSync(dir).filter((n) => n.endsWith('.ts'))) expect(readFileSync(path.join(dir, f), 'utf8')).not.toMatch(/containsContactDetails/)
  })
})
