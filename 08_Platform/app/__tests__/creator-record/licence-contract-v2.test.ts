/**
 * CR-DOC-READER-EXT-9R3 — the licence reading contract v2: the instructions sent to the model no longer contradict the validator,
 * and every rejection carries a generic cause code (no content). The limits and the non-repairing, fail-closed validator are unchanged.
 */
import {
  LICENCE_EXTRACTION_SCHEMA,
  LICENCE_EXTRACTION_SCHEMA_VERSION,
  LICENCE_FIELD_NAMES,
  LICENCE_MAX_EVIDENCE_CHARS,
  LICENCE_MAX_VALUE_CHARS,
  licenceExtractionViolation,
  validateLicenceExtraction,
} from '@/lib/creator-record/licence-examination/schema'
import { LICENCE_PROMPT_VERSION, LICENCE_SYSTEM_PROMPT } from '@/lib/creator-record/licence-examination/prompt'
import { customerObservationText } from '@/lib/creator-record/customer-record/reading-privacy'

type Raw = Record<string, unknown>
const notShown = () => ({ status: 'not_shown', value: null, evidence: null })
function reading(overrides: Raw = {}): Raw {
  return {
    document_kind: 'permission_or_consent_letter', readability: 'legible', instruction_like_text_present: false, personal_details_present: true,
    ...Object.fromEntries(LICENCE_FIELD_NAMES.map((f) => [f, notShown()])),
    ...overrides,
  }
}
const present = (value: string, evidence: string = value) => ({ status: 'present', value, evidence })

// A realistic permission statement longer than the value limit (180 characters), as on the EXT9-A4 synthetic licence.
const LONG = 'This certificate confirms that the item above was downloaded under the subscription named, for use in projects created during the subscription period, subject to the license terms.'
const SHORTENED = 'For use in projects created during the subscription period, subject to the license terms.'

describe('contract versions', () => {
  test('v2 prompt and schema are paired', () => {
    expect(LICENCE_EXTRACTION_SCHEMA_VERSION).toBe('licence-extraction-v2')
    expect(LICENCE_PROMPT_VERSION).toBe('licence-prompt-v2')
  })
})

describe('the instructions no longer contradict the validator', () => {
  const fieldDescriptions = LICENCE_FIELD_NAMES.map((f) => (LICENCE_EXTRACTION_SCHEMA.properties[f] as { properties: { value: { description: string }; evidence: { description: string } } }).properties)

  test('the value limit is stated with the validator constant, and a longer text may be shortened (not only "exactly as printed")', () => {
    for (const d of fieldDescriptions) {
      expect(d.value.description).toContain(`At most ${LICENCE_MAX_VALUE_CHARS} characters`)
      expect(d.value.description).toMatch(/if longer, shortened in the document's own words keeping every condition and limitation/)
      expect(d.value.description).not.toMatch(/exactly as printed/i)
      expect(d.evidence.description).toContain(`at most ${LICENCE_MAX_EVIDENCE_CHARS} characters`)
      expect(d.evidence.description).toMatch(/verbatim copy/)
    }
    expect(LICENCE_SYSTEM_PROMPT).toMatch(/longer text is shortened using only the document's own words, keeping every condition, limit or qualification/)
    expect(LICENCE_SYSTEM_PROMPT).toMatch(/never adding, strengthening or completing anything/)
  })

  test('dates: value ISO, excerpt as printed (no "as printed" requirement on the ISO value)', () => {
    expect(LICENCE_SYSTEM_PROMPT).toMatch(/dates are given as YYYY-MM-DD/)
    expect(LICENCE_SYSTEM_PROMPT).toMatch(/with a date as printed/)
  })

  test('a field that is not present carries null, never an empty string', () => {
    expect(LICENCE_SYSTEM_PROMPT).toMatch(/its value and excerpt are null, never an empty string/)
    for (const d of fieldDescriptions) expect(d.value.description).toMatch(/else null/)
  })

  test('leaving out personal details is stated as required, not as altering the document', () => {
    expect(LICENCE_SYSTEM_PROMPT).toMatch(/Leaving out a person's details from a value or an excerpt is required/)
  })

  test('no-determination instructions are unchanged', () => {
    expect(LICENCE_SYSTEM_PROMPT).toMatch(/Do not decide whether a licence is valid, what it permits, whether it covers any use/)
  })
})

describe('long statements', () => {
  test('the verbatim long statement as a value is still rejected (limits are authoritative), with its cause', () => {
    expect(LONG.length).toBeGreaterThan(LICENCE_MAX_VALUE_CHARS)
    const r = reading({ permission_statement: present(LONG) })
    expect(validateLicenceExtraction(r)).toBeNull()
    expect(licenceExtractionViolation(r)).toEqual({ code: 'present_value_too_long', field: 'permission_statement' })
  })
  test('a shortened value with the verbatim excerpt is accepted, unaltered', () => {
    expect(SHORTENED.length).toBeLessThanOrEqual(LICENCE_MAX_VALUE_CHARS)
    const r = validateLicenceExtraction(reading({ permission_statement: present(SHORTENED, LONG) }))
    expect(r?.permission_statement).toEqual({ status: 'present', value: SHORTENED, evidence: LONG })
  })
  test('an excerpt over the excerpt limit is rejected', () => {
    const r = reading({ permission_statement: present(SHORTENED, `${LONG} ${LONG}`) })
    expect(licenceExtractionViolation(r)).toEqual({ code: 'present_evidence_too_long', field: 'permission_statement' })
  })
  test('exactly at the limits is accepted', () => {
    expect(validateLicenceExtraction(reading({ permission_statement: present('a'.repeat(LICENCE_MAX_VALUE_CHARS), 'a'.repeat(LICENCE_MAX_EVIDENCE_CHARS)) }))).not.toBeNull()
  })
})

describe('malformed outputs fail closed with a generic cause', () => {
  test.each<[string, unknown, { code: string; field: string | null }]>([
    ['not an object', [], { code: 'not_an_object', field: null }],
    ['a missing top-level key', (() => { const r = reading(); delete r.valid_until; return r })(), { code: 'top_level_keys', field: null }],
    ['an extra top-level key', reading({ notes: 'x' }), { code: 'top_level_keys', field: null }],
    ['an unknown document kind', reading({ document_kind: 'contract' }), { code: 'document_kind', field: null }],
    ['a string flag', reading({ personal_details_present: 'true' }), { code: 'flags', field: null }],
    ['an extra field key', reading({ issue_date: { status: 'not_shown', value: null, evidence: null, note: '' } }), { code: 'field_shape', field: 'issue_date' }],
    ['an unknown status', reading({ issue_date: { status: 'maybe', value: null, evidence: null } }), { code: 'field_status', field: 'issue_date' }],
    ['a numeric value', reading({ issue_date: { status: 'present', value: 20261101, evidence: '2026-11-01' } }), { code: 'field_types', field: 'issue_date' }],
    ['an empty string for a field not shown', reading({ valid_until: { status: 'not_shown', value: '', evidence: '' } }), { code: 'non_present_carries_text', field: 'valid_until' }],
    ['a present field with an empty value', reading({ licence_or_plan_type: present('  ', 'Plan: Pro') }), { code: 'present_value_missing', field: 'licence_or_plan_type' }],
    ['a present field without an excerpt', reading({ licence_or_plan_type: { status: 'present', value: 'Pro', evidence: null } }), { code: 'present_evidence_missing', field: 'licence_or_plan_type' }],
  ])('%s', (_, raw, expected) => {
    expect(validateLicenceExtraction(raw)).toBeNull()
    expect(licenceExtractionViolation(raw)).toEqual(expected)
  })

  test('the cause code never carries document content', () => {
    const v = licenceExtractionViolation(reading({ permission_statement: present('Call 555 123 4567 for consent') }))
    expect(v).toEqual({ code: 'contact_details', field: 'permission_statement' })
    expect(JSON.stringify(v)).not.toMatch(/555|consent/)
  })
})

describe('uncertainty is reported, never resolved', () => {
  test.each(['unreadable', 'ambiguous', 'not_shown'])('%s with nulls is accepted as is', (status) => {
    const r = validateLicenceExtraction(reading({ valid_until: { status, value: null, evidence: null } }))
    expect(r?.valid_until).toEqual({ status, value: null, evidence: null })
  })
  test('ambiguous with a guessed value is rejected (not repaired)', () => {
    expect(licenceExtractionViolation(reading({ valid_until: { status: 'ambiguous', value: '2027-11-01', evidence: 'Valid until 01/11/27' } }))).toEqual({ code: 'non_present_carries_text', field: 'valid_until' })
  })
  test('a date value that is not ISO is rejected; ISO value with the printed form as excerpt is accepted', () => {
    expect(licenceExtractionViolation(reading({ issue_date: present('1 November 2026') }))).toEqual({ code: 'date_not_iso', field: 'issue_date' })
    expect(licenceExtractionViolation(reading({ issue_date: present('2026-02-30', 'Issued 30 Feb 2026') }))).toEqual({ code: 'date_not_iso', field: 'issue_date' })
    expect(validateLicenceExtraction(reading({ issue_date: present('2026-11-01', 'Issued: 1 November 2026') }))?.issue_date.value).toBe('2026-11-01')
  })
})

describe('privacy controls stay authoritative', () => {
  test.each([
    ['a phone number in a shortened value', reading({ permission_statement: present('Consent for online use; contact 0912-345-678', LONG) })],
    ['an email in the excerpt', reading({ permission_statement: present(SHORTENED, 'Questions: jordan@example.com') })],
  ])('%s rejects the whole reading', (_, r) => {
    expect(validateLicenceExtraction(r)).toBeNull()
    expect(licenceExtractionViolation(r)?.code).toBe('contact_details')
  })
  test('a name the model failed to leave out is still withheld from every customer surface (independent of personal_details_present)', () => {
    for (const flag of [true, false]) {
      const r = validateLicenceExtraction(reading({ personal_details_present: flag, permission_statement: present('I, Jordan Fictional-Person, give permission to use my likeness') }))
      expect(r).not.toBeNull()
      const shown = customerObservationText('licence', { field: 'permission_statement', status: 'present', value: r!.permission_statement.value, excerpt: r!.permission_statement.evidence })
      expect(shown).toEqual({ value: null, excerpt: null, value_withheld: true, excerpt_withheld: true })
    }
  })
})

describe('the validator is unchanged in effect', () => {
  test('values and excerpts are trimmed on acceptance and never otherwise altered', () => {
    const r = validateLicenceExtraction(reading({ licence_or_plan_type: present('  Pro (Social) ', ' Subscription: Artlist Pro (Social) ') }))
    expect(r?.licence_or_plan_type).toEqual({ status: 'present', value: 'Pro (Social)', evidence: 'Subscription: Artlist Pro (Social)' })
  })
  test('validate is null exactly when a violation is reported', () => {
    const cases = [reading(), reading({ permission_statement: present(LONG) }), reading({ issue_date: present('x') }), reading({ readability: 'blurry' }), reading({ licensed_item_reference: present('TRK_00987654') })]
    for (const c of cases) expect(validateLicenceExtraction(c) === null).toBe(licenceExtractionViolation(c) !== null)
  })
})
