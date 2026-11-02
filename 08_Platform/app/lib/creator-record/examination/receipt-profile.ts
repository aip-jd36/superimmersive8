/**
 * CR-V2-DOC-2B — the receipt examination engine as the first generic profile.
 *
 * An ADAPTER, not a change: the engine (`../receipt-examination/examine.ts`, `schema.ts`, `prompt.ts`) is
 * reused unchanged — byte-sniffed input checks, its two-attempt rule, its non-repairing validator and its
 * fixed failure reasons. The recorded output is supplied exactly as the existing fixture replay does
 * (`../evidence/examine-upload.ts` `replayCaller`), so a replayed reading is the same reading.
 *
 * Mapping (no interpretation, no inference added):
 *   - the five printed fields and every printed plan name → `printed_text` observations, values and
 *     excerpts verbatim;
 *   - document type, legibility and the two flags → `examiner_classification` observations;
 *   - limitations are fixed codes derived mechanically from the reading.
 */

import { examineReceiptDocument, type ReceiptModelCaller } from '../receipt-examination/examine'
import { RECEIPT_PROMPT_VERSION } from '../receipt-examination/prompt'
import { EXTRACTED_FIELD_NAMES, RECEIPT_EXTRACTION_SCHEMA_VERSION, type ReceiptExtraction } from '../receipt-examination/schema'
import type { ExaminationLimitation } from './envelope'
import type { ExaminationProfile, ProfileObservation, ProfileReading } from './profile'

export const RECEIPT_PROFILE_ID = 'receipt'
export const RECEIPT_PROFILE_VERSION = 1

/** The recorded output in place of a model response: the same shape `examine-upload.ts` replays. */
const recordedCaller = (recordedOutput: unknown): ReceiptModelCaller => async () => ({
  id: 'fixture-replay',
  stop_reason: 'end_turn',
  content: [{ type: 'text' }],
  usage: { input_tokens: 0, output_tokens: 0 },
  parsed_output: recordedOutput,
})

export function receiptObservations(ex: ReceiptExtraction): ProfileObservation[] {
  const cls = (field: string, value: string): ProfileObservation => ({ field, qualifier: null, basis: 'examiner_classification', status: 'present', value, excerpt: null })
  return [
    cls('document_type', ex.document_type),
    cls('readability', ex.readability),
    cls('multiple_plans_shown', String(ex.multiple_plans_shown)),
    cls('instruction_like_text_present', String(ex.instruction_like_text_present)),
    ...EXTRACTED_FIELD_NAMES.map((f): ProfileObservation => ({ field: f, qualifier: null, basis: 'printed_text', status: ex[f].status, value: ex[f].value, excerpt: ex[f].evidence })),
    ...ex.plan_candidates.map((c): ProfileObservation => ({ field: 'plan_candidate', qualifier: c.context, basis: 'printed_text', status: 'present', value: c.text, excerpt: c.evidence })),
  ]
}

export function receiptLimitations(ex: ReceiptExtraction): ExaminationLimitation[] {
  const out: ExaminationLimitation[] = ['no_location_reference']
  if (EXTRACTED_FIELD_NAMES.some((f) => ex[f].status !== 'present')) out.push('fields_not_established')
  if (ex.product_or_plan_name.status === 'present') out.push('single_plan_reading_does_not_exclude_others')
  if (ex.multiple_plans_shown) out.push('multiple_plans_shown')
  if (ex.instruction_like_text_present) out.push('instruction_like_text_present')
  if (ex.document_type === 'not_a_billing_document') out.push('not_a_billing_document')
  if (ex.readability === 'partially_legible') out.push('partially_legible')
  if (ex.readability === 'illegible') out.push('illegible')
  return out
}

export const RECEIPT_PROFILE: ExaminationProfile = {
  ref: { id: RECEIPT_PROFILE_ID, version: RECEIPT_PROFILE_VERSION, schema: RECEIPT_EXTRACTION_SCHEMA_VERSION, prompt: RECEIPT_PROMPT_VERSION },
  media_types: ['application/pdf', 'image/png', 'image/jpeg'],
  async readRecorded(bytes: Uint8Array, recordedOutput: unknown): Promise<ProfileReading> {
    const outcome = await examineReceiptDocument(bytes, { callModel: recordedCaller(recordedOutput) })
    if (outcome.status !== 'examined') return { status: 'could_not_examine', reason: outcome.reason, engine_attempts: outcome.usage.attempts }
    return { status: 'examined', observations: receiptObservations(outcome.extraction), limitations: receiptLimitations(outcome.extraction), engine_attempts: outcome.usage.attempts }
  },
}
