/**
 * CR-DOC-READER-EXT-5A — can a customer PDF template set print a licence/permission reading?
 *
 * Pure. The documents section refuses a reading field, classification value, reading status or limitation that the set does not
 * label (`observation_field_unlabelled`, `classification_unlabelled`, ...), so a set that fails this check cannot render a licence
 * reading. Licence reading may be enabled only while the selected schema 8 set passes it (`licenceReadingEnabled` in
 * `./approved-inputs`): a customer can never create a reading the selected PDF cannot print. Every label is
 * checked, not one sample, so a partly-labelled set also fails.
 *
 * Registered approved v7 fails (no licence labels); the candidate v8 passes. Test: `doc-reader-ext-activation.test.ts`, which
 * also renders a real licence record with each set to show this check agrees with the renderer.
 */
import { LICENCE_DOCUMENT_KINDS, LICENCE_FIELD_NAMES, LICENCE_FIELD_STATUSES, LICENCE_READABILITY_VALUES } from '../licence-examination/schema'

const BOOLEAN_VALUES = ['true', 'false'] as const

/** Every classification a licence reading can carry, with every value it can take. */
export const LICENCE_CLASSIFICATION_VALUES: Readonly<Record<string, readonly string[]>> = Object.freeze({
  document_kind: LICENCE_DOCUMENT_KINDS,
  readability: LICENCE_READABILITY_VALUES,
  instruction_like_text_present: BOOLEAN_VALUES,
  personal_details_present: BOOLEAN_VALUES,
})

/** Every limitation a licence reading can carry. A test proves this equals `licenceLimitations` over all its branches. */
export const LICENCE_POSSIBLE_LIMITATIONS: readonly string[] = Object.freeze(['no_location_reference', 'fields_not_established', 'instruction_like_text_present', 'partially_legible', 'illegible'])

const has = (o: unknown, k: string): boolean => typeof o === 'object' && o !== null && Object.prototype.hasOwnProperty.call(o, k) && typeof (o as Record<string, unknown>)[k] === 'string'

/** The labels a set is missing for a licence reading. Empty: the set can print one. */
export function missingLicenceLabels(templates: unknown): string[] {
  const t = templates as { examination?: Record<string, any>; live_examination?: Record<string, any> } | null
  const x = t?.examination
  const live = t?.live_examination
  if (!x || !live) return ['examination_section']
  const out: string[] = []
  for (const f of [...Object.keys(LICENCE_CLASSIFICATION_VALUES), ...LICENCE_FIELD_NAMES]) if (!has(x.field_labels, f)) out.push(`field:${f}`)
  for (const [f, values] of Object.entries(LICENCE_CLASSIFICATION_VALUES)) {
    for (const v of values) if (!has(x.classification_labels?.[f], v)) out.push(`classification:${f}=${v}`)
  }
  for (const s of LICENCE_FIELD_STATUSES) if (!has(x.reading_labels, s)) out.push(`reading:${s}`)
  for (const l of LICENCE_POSSIBLE_LIMITATIONS) if (!has(live.limitation_labels, l)) out.push(`limitation:${l}`)
  return out
}

export const templatesRenderLicenceReadings = (templates: unknown): boolean => templates !== null && templates !== undefined && missingLicenceLabels(templates).length === 0
