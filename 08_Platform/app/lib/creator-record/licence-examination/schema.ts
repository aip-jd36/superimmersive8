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

export const LICENCE_EXTRACTION_SCHEMA_VERSION = 'licence-extraction-v1' as const

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
      description: `Exactly as printed (at most ${LICENCE_MAX_VALUE_CHARS} characters), ONLY when status is 'present'. Otherwise null. Never guess, complete or correct a value. Never a person's name, address, email address, phone number or signature.`,
    },
    evidence: {
      type: ['string', 'null'],
      description: `A short verbatim excerpt (at most ${LICENCE_MAX_EVIDENCE_CHARS} characters) copied from the document that shows the value. Null when status is not 'present'. Never include a person's contact details.`,
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

function validateField(raw: unknown, isDate: boolean): LicenceField | null {
  if (!isObj(raw) || !exactKeys(raw, ['status', 'value', 'evidence'])) return null
  const { status, value, evidence } = raw
  if (typeof status !== 'string' || !(LICENCE_FIELD_STATUSES as readonly string[]).includes(status)) return null
  if (value !== null && typeof value !== 'string') return null
  if (evidence !== null && typeof evidence !== 'string') return null
  if (status === 'present') {
    if (value === null || value.trim() === '' || value.length > LICENCE_MAX_VALUE_CHARS) return null
    if (evidence === null || evidence.trim() === '' || evidence.length > LICENCE_MAX_EVIDENCE_CHARS) return null
    if (isDate && !isIsoCalendarDate(value.trim())) return null
    if (containsContactDetails(value) || containsContactDetails(evidence)) return null
    return { status, value: value.trim(), evidence: evidence.trim() }
  }
  // A non-present status must not carry a value or an excerpt (contradictory, not recoverable).
  if (value !== null || evidence !== null) return null
  return { status: status as LicenceFieldStatus, value: null, evidence: null }
}

/** Strict, non-repairing. Returns null for anything outside the closed schema. */
export function validateLicenceExtraction(raw: unknown): LicenceExtraction | null {
  if (!isObj(raw) || !exactKeys(raw, TOP_LEVEL_KEYS)) return null
  if (typeof raw.document_kind !== 'string' || !(LICENCE_DOCUMENT_KINDS as readonly string[]).includes(raw.document_kind)) return null
  if (typeof raw.readability !== 'string' || !(LICENCE_READABILITY_VALUES as readonly string[]).includes(raw.readability)) return null
  if (typeof raw.instruction_like_text_present !== 'boolean' || typeof raw.personal_details_present !== 'boolean') return null
  const fields: Partial<Record<LicenceFieldName, LicenceField>> = {}
  for (const name of LICENCE_FIELD_NAMES) {
    const f = validateField(raw[name], LICENCE_DATE_FIELDS.includes(name))
    if (!f) return null
    fields[name] = f
  }
  return {
    document_kind: raw.document_kind as LicenceDocumentKind,
    readability: raw.readability as LicenceReadability,
    instruction_like_text_present: raw.instruction_like_text_present,
    personal_details_present: raw.personal_details_present,
    ...(fields as Record<LicenceFieldName, LicenceField>),
  }
}
