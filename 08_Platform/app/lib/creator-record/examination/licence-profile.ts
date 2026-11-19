/**
 * CR-DOC-READER-EXT-1 (B) — the licence/permission examination profile. INACTIVE BY DEFAULT.
 *
 * CR-DOC-READER-EXT-5A: wired behind ONE switch (`LICENCE_READING_SWITCH`, 'off'). Only while licence reading is enabled
 * (`licenceReadingEnabled`: the switch on AND the selected schema 8 PDF template set can print a licence reading) is it an active
 * customer profile, in the customer live registry, and its method issuable. With the registered approved v7 selected it stays off
 * whatever the switch says: v7 has no labels for its fields, and the customer document refuses an unlabelled field (fail closed).
 *
 * The engine is the receipt engine's generic form (`examineWithContract`): the same byte-sniffed input checks, two-attempt rule
 * and fixed failure reasons, with the licence contract's own non-repairing validator.
 *
 * Mapping (no interpretation): printed fields → `printed_text` observations (value and excerpt verbatim); document kind,
 * legibility and the two flags → `examiner_classification`. Limitations use ONLY existing codes: the approved templates must label
 * exactly the closed limitation vocabulary, so adding a code would invalidate every approved set. "Not a licence or permission" is
 * therefore a classification, never a limitation.
 */
import { examineWithContract, type ReadingContract, type ReceiptModelCaller } from '../receipt-examination/examine'
import { LICENCE_PROMPT_VERSION } from '../licence-examination/prompt'
import { LICENCE_EXTRACTION_SCHEMA_VERSION, LICENCE_FIELD_NAMES, validateLicenceExtraction, type LicenceExtraction } from '../licence-examination/schema'
import type { ExaminationLimitation } from './envelope'
import type { ExaminationProfile, ProfileObservation, ProfileReading } from './profile'

export const LICENCE_PROFILE_ID = 'licence'
/** 2 (CR-DOC-READER-EXT-9R3): reading contract licence-extraction-v2 / licence-prompt-v2. Version 1 (v1 contract) is retired; its pin is kept. */
export const LICENCE_PROFILE_VERSION = 2

/**
 * Pinned output fingerprints (append-only; versioning contract in `./profile.ts`). SHA-256 of
 * `canonicalJson(profileOutputCanonical(LICENCE_PROFILE_INACTIVE, corpus))` over the corpus in
 * `__tests__/creator-record/doc-reader-ext-licence-profile.test.ts`.
 */
export const LICENCE_PROFILE_OUTPUT_FINGERPRINTS: Readonly<Record<number, string>> = {
  1: 'f629d07349542e736c69f7222b32685c4f42e9efd5456bee997639a557216950',
  2: '57152297e2995ff693c7ff5dba4de3efd102d3094478390dcf01ee75ee187b40',
}

export const LICENCE_READING_CONTRACT: ReadingContract<LicenceExtraction> = {
  schema_version: LICENCE_EXTRACTION_SCHEMA_VERSION,
  prompt_version: LICENCE_PROMPT_VERSION,
  validate: validateLicenceExtraction,
}

const recordedCaller = (recordedOutput: unknown): ReceiptModelCaller => async () => ({
  id: 'fixture-replay',
  stop_reason: 'end_turn',
  content: [{ type: 'text' }],
  usage: { input_tokens: 0, output_tokens: 0 },
  parsed_output: recordedOutput,
})

export function licenceObservations(ex: LicenceExtraction): ProfileObservation[] {
  const cls = (field: string, value: string): ProfileObservation => ({ field, qualifier: null, basis: 'examiner_classification', status: 'present', value, excerpt: null })
  return [
    cls('document_kind', ex.document_kind),
    cls('readability', ex.readability),
    cls('instruction_like_text_present', String(ex.instruction_like_text_present)),
    cls('personal_details_present', String(ex.personal_details_present)),
    ...LICENCE_FIELD_NAMES.map((f): ProfileObservation => ({ field: f, qualifier: null, basis: 'printed_text', status: ex[f].status, value: ex[f].value, excerpt: ex[f].evidence })),
  ]
}

export function licenceLimitations(ex: LicenceExtraction): ExaminationLimitation[] {
  const out: ExaminationLimitation[] = ['no_location_reference']
  if (LICENCE_FIELD_NAMES.some((f) => ex[f].status !== 'present')) out.push('fields_not_established')
  if (ex.instruction_like_text_present) out.push('instruction_like_text_present')
  if (ex.readability === 'partially_legible') out.push('partially_legible')
  if (ex.readability === 'illegible') out.push('illegible')
  return out
}

export const LICENCE_PROFILE_INACTIVE: ExaminationProfile = {
  ref: { id: LICENCE_PROFILE_ID, version: LICENCE_PROFILE_VERSION, schema: LICENCE_EXTRACTION_SCHEMA_VERSION, prompt: LICENCE_PROMPT_VERSION },
  media_types: ['application/pdf', 'image/png', 'image/jpeg'],
  async readRecorded(bytes: Uint8Array, recordedOutput: unknown): Promise<ProfileReading> {
    const outcome = await examineWithContract(bytes, { callModel: recordedCaller(recordedOutput), contract: LICENCE_READING_CONTRACT })
    if (outcome.status !== 'examined') return { status: 'could_not_examine', reason: outcome.reason, engine_attempts: outcome.usage.attempts }
    return { status: 'examined', observations: licenceObservations(outcome.extraction), limitations: licenceLimitations(outcome.extraction), engine_attempts: outcome.usage.attempts }
  },
}
