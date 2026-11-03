/**
 * CR-V2-EXAM-INTEGRATION-X0 — the receipt reading an examination envelope carries, recovered EXACTLY.
 *
 * Pure. The receipt profile maps a reading to observations without loss (`./receipt-profile.ts`
 * `receiptObservations`). This inverts that mapping so the existing, unchanged comparison logic
 * (`../evidence/document-observations.ts` `reconcileToolEvidence`) can run on a persisted examination:
 *   - only for the receipt profile it was written for, and only for an `examined` outcome;
 *   - the result must pass the engine's own strict validator;
 *   - and it must map back to EXACTLY the envelope's observations (field, qualifier, basis, status, value and
 *     excerpt, in order). Anything else returns null, so a comparison is "not assessed", never guessed.
 * The mapping is restated here (not imported) so this module never loads the examination engine; a test pins it
 * to `receiptObservations` on every replay fixture.
 */

import { EXTRACTED_FIELD_NAMES, RECEIPT_EXTRACTION_SCHEMA_VERSION, validateReceiptExtraction, type ReceiptExtraction } from '../receipt-examination/schema'
import type { ExaminationEnvelope, ExaminationObservation } from './envelope'

/** The receipt profile identity this inversion matches (`./receipt-profile.ts`; pinned by test). */
export const RECEIPT_READING_PROFILE = { id: 'receipt', version: 1 } as const

type Mapped = Pick<ExaminationObservation, 'field' | 'qualifier' | 'basis' | 'status' | 'value' | 'excerpt'>

/** The same mapping as `receiptObservations` (pinned by test). */
export function mapReceiptReading(ex: ReceiptExtraction): Mapped[] {
  const cls = (field: string, value: string): Mapped => ({ field, qualifier: null, basis: 'examiner_classification', status: 'present', value, excerpt: null })
  return [
    cls('document_type', ex.document_type),
    cls('readability', ex.readability),
    cls('multiple_plans_shown', String(ex.multiple_plans_shown)),
    cls('instruction_like_text_present', String(ex.instruction_like_text_present)),
    ...EXTRACTED_FIELD_NAMES.map((f): Mapped => ({ field: f, qualifier: null, basis: 'printed_text', status: ex[f].status, value: ex[f].value, excerpt: ex[f].evidence })),
    ...ex.plan_candidates.map((c): Mapped => ({ field: 'plan_candidate', qualifier: c.context, basis: 'printed_text', status: 'present', value: c.text, excerpt: c.evidence })),
  ]
}

export function receiptReadingOf(envelope: ExaminationEnvelope): ReceiptExtraction | null {
  if (envelope.outcome.status !== 'examined') return null
  const p = envelope.profile
  if (p.id !== RECEIPT_READING_PROFILE.id || p.version !== RECEIPT_READING_PROFILE.version || p.schema !== RECEIPT_EXTRACTION_SCHEMA_VERSION) return null
  const obs = envelope.observations
  const only = (field: string, basis: Mapped['basis']) => {
    const m = obs.filter((o) => o.field === field && o.basis === basis)
    return m.length === 1 ? m[0] : null
  }
  const cls = (field: string) => {
    const o = only(field, 'examiner_classification')
    return o && o.status === 'present' ? o.value : null
  }
  const bool = (v: string | null) => (v === 'true' ? true : v === 'false' ? false : null)
  const raw: Record<string, unknown> = {
    document_type: cls('document_type'),
    readability: cls('readability'),
    multiple_plans_shown: bool(cls('multiple_plans_shown')),
    instruction_like_text_present: bool(cls('instruction_like_text_present')),
    plan_candidates: obs.filter((o) => o.field === 'plan_candidate').map((o) => ({ text: o.value, evidence: o.excerpt, context: o.qualifier })),
  }
  for (const f of EXTRACTED_FIELD_NAMES) {
    const o = only(f, 'printed_text')
    if (!o) return null
    raw[f] = { status: o.status, value: o.value, evidence: o.excerpt }
  }
  const reading = validateReceiptExtraction(raw)
  if (!reading) return null
  const back = mapReceiptReading(reading)
  if (back.length !== obs.length) return null
  for (let i = 0; i < back.length; i++) {
    const a = back[i]
    const b = obs[i]
    if (a.field !== b.field || a.qualifier !== b.qualifier || a.basis !== b.basis || a.status !== b.status || a.value !== b.value || a.excerpt !== b.excerpt) return null
  }
  return reading
}
