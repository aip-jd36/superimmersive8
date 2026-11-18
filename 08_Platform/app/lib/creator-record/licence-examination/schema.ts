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
 * phone-like number is rejected whole (`schema_invalid`): the validator never repairs or redacts.
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

const fieldSchema = (description: string) => ({
  type: 'object',
  additionalProperties: false,
  properties: {
    status: { type: 'string', enum: [...LICENCE_FIELD_STATUSES] },
    value: { type: ['string', 'null'], maxLength: LICENCE_MAX_VALUE_CHARS, description },
    evidence: { type: ['string', 'null'], maxLength: LICENCE_MAX_EVIDENCE_CHARS },
  },
  required: ['status', 'value', 'evidence'],
})

/** JSON schema for structured output (used by a future live caller only). */
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
const PHONE = /(?:\+?\d[\d\s().-]{6,}\d)/
export function containsContactDetails(text: string): boolean {
  return EMAIL.test(text) || PHONE.test(text.replace(/\b\d{4}-\d{2}-\d{2}\b/g, ''))
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
