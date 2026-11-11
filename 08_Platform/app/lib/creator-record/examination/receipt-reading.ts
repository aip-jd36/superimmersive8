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

import { RECEIPT_EXTRACTION_SCHEMA_VERSION_V3 } from '../receipt-examination/issuer-evidence'
import { EXTRACTED_FIELD_NAMES, RECEIPT_EXTRACTION_SCHEMA_VERSION, validateReceiptExtraction, validateReceiptExtractionV3, type ReceiptExtraction } from '../receipt-examination/schema'
import type { ExaminationEnvelope, ExaminationObservation } from './envelope'

/** The receipt profile identity this inversion matches (`./receipt-profile.ts`; pinned by test). */
export const RECEIPT_READING_PROFILE = { id: 'receipt', version: 1 } as const
/** CRV2-IA-4D2: the inactive receipt profile v2 (reading contract v3), pinned by test to `./receipt-profile.ts`. */
export const RECEIPT_READING_PROFILE_V2 = { id: 'receipt', version: 2 } as const

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

/**
 * The parts of an envelope this inversion reads. A replay `ExaminationEnvelope` and a customer live envelope both satisfy it
 * (same profile identity and observation shape); CR-V2-MVP-INTEGRATION-2 reads both through this one exact inversion.
 */
export interface ReceiptReadableEnvelope {
  outcome: { status: string }
  profile: Pick<ExaminationEnvelope['profile'], 'id' | 'version' | 'schema'>
  observations: readonly Mapped[]
}

export function receiptReadingOf(envelope: ReceiptReadableEnvelope): ReceiptExtraction | null {
  if (envelope.outcome.status !== 'examined') return null
  const p = envelope.profile
  if (p.id === RECEIPT_READING_PROFILE_V2.id && p.version === RECEIPT_READING_PROFILE_V2.version && p.schema === RECEIPT_EXTRACTION_SCHEMA_VERSION_V3) return receiptReadingOfV3(envelope)
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

/** The same mapping as `receiptObservationsV3` (pinned by test). */
export function mapReceiptReadingV3(ex: ReceiptExtraction): Mapped[] {
  return [
    ...mapReceiptReading(ex),
    ...(ex.issuer_evidence?.statements ?? []).map((st): Mapped => ({ field: 'issuer_statement', qualifier: st.role, basis: 'printed_text', status: 'present', value: st.business, excerpt: st.evidence })),
  ]
}

/**
 * CRV2-IA-4D2: exact inversion for a profile v2 (contract v3) envelope. The statements are rebuilt from the `issuer_statement`
 * observations, the whole output re-validated by the v3 validator (which re-derives `issuer_name`), and the result must map
 * back to EXACTLY the stored observations, including the stored derived issuer_name. Anything else: null (not assessed).
 */
function receiptReadingOfV3(envelope: ReceiptReadableEnvelope): ReceiptExtraction | null {
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
    issuer_statements: obs.filter((o) => o.field === 'issuer_statement').map((o) => ({ business: o.value, role: o.qualifier, evidence: o.excerpt })),
  }
  for (const f of EXTRACTED_FIELD_NAMES) {
    if (f === 'issuer_name') continue // derived, never read back as input
    const o = only(f, 'printed_text')
    if (!o) return null
    raw[f] = { status: o.status, value: o.value, evidence: o.excerpt }
  }
  const reading = validateReceiptExtractionV3(raw)
  if (!reading) return null
  const back = mapReceiptReadingV3(reading)
  if (back.length !== obs.length) return null
  for (let i = 0; i < back.length; i++) {
    const a = back[i]
    const b = obs[i]
    if (a.field !== b.field || a.qualifier !== b.qualifier || a.basis !== b.basis || a.status !== b.status || a.value !== b.value || a.excerpt !== b.excerpt) return null
  }
  return reading
}
