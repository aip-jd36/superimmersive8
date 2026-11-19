/**
 * CR-DOC-READER-EXT-1 (B) — closed extraction schema `licence-extraction-v1` for licences and permissions, and its
 * non-repairing validator. DEFINED, INACTIVE: no customer examination path selects it (see `../examination/licence-profile.ts`).
 *
 * What a reading may contain: what the document APPEARS to show, as printed, each field with a status and a short verbatim
 * excerpt. Never a determination: nothing here says a licence is valid, covers a use, belongs to the creator or relates to the
 * video. Same field states as the receipt schema (`present`, `not_shown`, `unreadable`, `ambiguous`); a missing or uncertain value
 * is never invented.
 *
 * Privacy: the schema has NO field for a person's name, address, email, phone number or signature. The model reports only
 * whether such details appear (`personal_details_present`). A response whose values or excerpts contain an email address or a
 * phone-like number is rejected whole (`schema_invalid`): the validator never repairs or redacts. A letter-led document
 * identifier (licence, order or asset reference) is not phone-like (CR-DOC-READER-EXT-9R1, `phoneLike`).
 */

/**
 * v2 (CR-DOC-READER-EXT-9R3): the field descriptions sent to the model no longer contradict the validator. v1 asked for every value
 * "exactly as printed" while the validator caps a value at 120 characters, so any longer printed statement could only be rejected.
 * v2: a printed text up to the limit is copied as printed; a longer one is shortened in the document's own words, keeping every
 * condition and limitation; the excerpt stays a verbatim copy. Dates: value ISO, excerpt as printed. Shape, limits and the
 * non-repairing validator are unchanged. v1 is retired: no v1 reading was ever stored.
 */
export const LICENCE_EXTRACTION_SCHEMA_VERSION = 'licence-extraction-v2' as const

export const LICENCE_DOCUMENT_KINDS = [
  'licence_or_licence_certificate',
  'licence_receipt_or_order',
  'permission_or_consent_letter',
  'provider_terms',
  'not_a_licence_or_permission',
  'unknown',
] as const
export type LicenceDocumentKind = (typeof LICENCE_DOCUMENT_KINDS)[number]

export const LICENCE_READABILITY_VALUES = ['legible', 'partially_legible', 'illegible'] as const
export type LicenceReadability = (typeof LICENCE_READABILITY_VALUES)[number]

export const LICENCE_FIELD_STATUSES = ['present', 'not_shown', 'unreadable', 'ambiguous'] as const
export type LicenceFieldStatus = (typeof LICENCE_FIELD_STATUSES)[number]

export const LICENCE_MAX_VALUE_CHARS = 120
export const LICENCE_MAX_EVIDENCE_CHARS = 200

export interface LicenceField {
  status: LicenceFieldStatus
  /** Non-null iff status === 'present'. Dates are ISO `YYYY-MM-DD`. */
  value: string | null
  /** Short verbatim excerpt from the document. Required when present. */
  evidence: string | null
}

/** Printed fields. None of them names or contacts a person. */
export const LICENCE_FIELD_NAMES = [
  'licence_or_plan_type',
  'content_designation',
  'permission_statement',
  'licensed_item_reference',
  'issue_date',
  'valid_until',
] as const
export type LicenceFieldName = (typeof LICENCE_FIELD_NAMES)[number]
export const LICENCE_DATE_FIELDS: readonly LicenceFieldName[] = ['issue_date', 'valid_until']

export interface LicenceExtraction {
  document_kind: LicenceDocumentKind
  readability: LicenceReadability
  instruction_like_text_present: boolean
  personal_details_present: boolean
  licence_or_plan_type: LicenceField
  content_designation: LicenceField
  permission_statement: LicenceField
  licensed_item_reference: LicenceField
  issue_date: LicenceField
  valid_until: LicenceField
}

const TOP_LEVEL_KEYS = ['document_kind', 'readability', 'instruction_like_text_present', 'personal_details_present', ...LICENCE_FIELD_NAMES] as const

// CR-DOC-READER-EXT-3: the receipt schema's structured-output conventions — no length keywords (limits are stated in the
// descriptions and enforced by the validator); 12 union parameters (limit 16).
const fieldSchema = (description: string) => ({
  type: 'object',
  description,
  additionalProperties: false,
  properties: {
    status: {
      type: 'string',
      enum: [...LICENCE_FIELD_STATUSES],
      description: "'present' only if the value is printed in the document. 'not_shown' if the document does not show it. 'unreadable' if the area exists but cannot be read. 'ambiguous' if more than one reading is possible.",
    },
    value: {
      type: ['string', 'null'],
      description: `Only when status is 'present', else null. At most ${LICENCE_MAX_VALUE_CHARS} characters: as printed, or, if longer, shortened in the document's own words keeping every condition and limitation. Dates YYYY-MM-DD. No person's details.`,
    },
    evidence: {
      type: ['string', 'null'],
      description: `Only when status is 'present', else null. A verbatim copy (at most ${LICENCE_MAX_EVIDENCE_CHARS} characters) of one continuous part of the document showing the value; a date as printed. No person's details.`,
    },
  },
  required: ['status', 'value', 'evidence'],
} as const)

/** JSON schema sent through `jsonSchemaOutputFormat()` by the licence reading contract of the live caller. */
export const LICENCE_EXTRACTION_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    document_kind: { type: 'string', enum: [...LICENCE_DOCUMENT_KINDS] },
    readability: { type: 'string', enum: [...LICENCE_READABILITY_VALUES] },
    instruction_like_text_present: { type: 'boolean' },
    personal_details_present: { type: 'boolean' },
    licence_or_plan_type: fieldSchema('The licence, plan or tier name as printed (e.g. a plan or licence type). Never a person.'),
    content_designation: fieldSchema('A printed designation of the licensed content, such as "Editorial" or "Commercial", as printed.'),
    permission_statement: fieldSchema('A short printed statement granting permission or consent, as printed. No names of people.'),
    licensed_item_reference: fieldSchema('The printed title or reference of the licensed item (track, clip or asset). Never a person.'),
    issue_date: fieldSchema('The printed issue or order date, ISO YYYY-MM-DD.'),
    valid_until: fieldSchema('A printed end or expiry date, ISO YYYY-MM-DD.'),
  },
  required: [...TOP_LEVEL_KEYS],
} as const

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const exactKeys = (o: Record<string, unknown>, keys: readonly string[]) => Object.keys(o).length === keys.length && keys.every((k) => Object.prototype.hasOwnProperty.call(o, k))
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
function isIsoCalendarDate(v: string): boolean {
  if (!ISO_DATE.test(v)) return false
  const d = new Date(`${v}T00:00:00Z`)
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v
}
/** Contact details of a person. Their presence rejects the whole response; nothing is redacted or repaired. */
const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/
const PHONE = /(?:\+?\d[\d\s().-]{6,}\d)/g
/** A word that marks a token as contact information even when it also contains letters. */
const CONTACT_WORD = /tel|phone|fax|mob|cell|whats|sms|call/i

/**
 * CR-DOC-READER-EXT-9R1: a phone-like digit run is a DOCUMENT IDENTIFIER (a licence, order, asset or track reference such as
 * `AL-2026-0000-0000`, `INV-2026-00012345` or `TRK_00987654`) only when it lies wholly inside one whitespace-free token that starts
 * with a letter and contains no contact word. Anything else stays phone-like and rejects: a run spanning whitespace, a token that
 * does not start with a letter (`#12345678`, `0912-345-678`, `+1`), or a token naming a contact channel (`Tel555-123-4567`). Fail
 * closed: a purely numeric order number cannot be told from a phone number by its shape, so it is still rejected.
 */
function phoneLike(text: string): boolean {
  const t = text.replace(/\b\d{4}-\d{2}-\d{2}\b/g, '')
  for (const m of t.matchAll(PHONE)) {
    if (/\s/.test(m[0])) return true
    let start = m.index ?? 0
    let end = start + m[0].length
    while (start > 0 && !/\s/.test(t[start - 1])) start -= 1
    while (end < t.length && !/\s/.test(t[end])) end += 1
    // Surrounding quotes, brackets and trailing punctuation are not part of the identifier: `(TRK_00987654),` → `TRK_00987654`.
    const token = t.slice(start, end).replace(/^["'([{]+/, '').replace(/["')\]},;:.]+$/, '')
    if (!/^[A-Za-z]/.test(token) || CONTACT_WORD.test(token)) return true
  }
  return false
}

export function containsContactDetails(text: string): boolean {
  return EMAIL.test(text) || phoneLike(text)
}

/**
 * CR-DOC-READER-EXT-9R3: the generic cause of a rejection, as a fixed code with the field name only (never any content), so a
 * rejected reading can be diagnosed from safe telemetry. The rules are exactly the validator's; `validateLicenceExtraction` is null
 * iff this is non-null.
 */
export const LICENCE_VIOLATION_CODES = [
  'not_an_object', 'top_level_keys', 'document_kind', 'readability', 'flags',
  'field_shape', 'field_status', 'field_types', 'present_value_missing', 'present_value_too_long', 'present_evidence_missing',
  'present_evidence_too_long', 'date_not_iso', 'contact_details', 'non_present_carries_text',
] as const
export type LicenceViolationCode = (typeof LICENCE_VIOLATION_CODES)[number]
export interface LicenceViolation { code: LicenceViolationCode; field: LicenceFieldName | null }

function fieldViolation(raw: unknown, isDate: boolean): LicenceViolationCode | null {
  if (!isObj(raw) || !exactKeys(raw, ['status', 'value', 'evidence'])) return 'field_shape'
  const { status, value, evidence } = raw
  if (typeof status !== 'string' || !(LICENCE_FIELD_STATUSES as readonly string[]).includes(status)) return 'field_status'
  if ((value !== null && typeof value !== 'string') || (evidence !== null && typeof evidence !== 'string')) return 'field_types'
  if (status === 'present') {
    if (value === null || value.trim() === '') return 'present_value_missing'
    if (value.length > LICENCE_MAX_VALUE_CHARS) return 'present_value_too_long'
    if (evidence === null || evidence.trim() === '') return 'present_evidence_missing'
    if (evidence.length > LICENCE_MAX_EVIDENCE_CHARS) return 'present_evidence_too_long'
    if (isDate && !isIsoCalendarDate(value.trim())) return 'date_not_iso'
    if (containsContactDetails(value) || containsContactDetails(evidence)) return 'contact_details'
    return null
  }
  // A non-present status must not carry a value or an excerpt (contradictory, not recoverable).
  if (value !== null || evidence !== null) return 'non_present_carries_text'
  return null
}

/** The first rule a raw reading breaks, or null when it is valid. */
export function licenceExtractionViolation(raw: unknown): LicenceViolation | null {
  if (!isObj(raw)) return { code: 'not_an_object', field: null }
  if (!exactKeys(raw, TOP_LEVEL_KEYS)) return { code: 'top_level_keys', field: null }
  if (typeof raw.document_kind !== 'string' || !(LICENCE_DOCUMENT_KINDS as readonly string[]).includes(raw.document_kind)) return { code: 'document_kind', field: null }
  if (typeof raw.readability !== 'string' || !(LICENCE_READABILITY_VALUES as readonly string[]).includes(raw.readability)) return { code: 'readability', field: null }
  if (typeof raw.instruction_like_text_present !== 'boolean' || typeof raw.personal_details_present !== 'boolean') return { code: 'flags', field: null }
  for (const name of LICENCE_FIELD_NAMES) {
    const code = fieldViolation(raw[name], LICENCE_DATE_FIELDS.includes(name))
    if (code) return { code, field: name }
  }
  return null
}

const trimmedField = (f: { status: string; value: string | null; evidence: string | null }): LicenceField =>
  f.status === 'present' ? { status: 'present', value: (f.value as string).trim(), evidence: (f.evidence as string).trim() } : { status: f.status as LicenceFieldStatus, value: null, evidence: null }

/** Strict, non-repairing. Returns null for anything outside the closed schema. */
export function validateLicenceExtraction(raw: unknown): LicenceExtraction | null {
  if (licenceExtractionViolation(raw) !== null) return null
  const r = raw as Record<string, unknown>
  const fields = Object.fromEntries(LICENCE_FIELD_NAMES.map((n) => [n, trimmedField(r[n] as { status: string; value: string | null; evidence: string | null })])) as Record<LicenceFieldName, LicenceField>
  return {
    document_kind: r.document_kind as LicenceDocumentKind,
    readability: r.readability as LicenceReadability,
    instruction_like_text_present: r.instruction_like_text_present as boolean,
    personal_details_present: r.personal_details_present as boolean,
    ...fields,
  }
}
