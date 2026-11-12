/**
 * CRV2-IA-4D2 — scorer and gates for the issuer-evidence contract (v3). Pure; never calls a model.
 *
 * Input: the fixtures and, per document fixture, the reading under evaluation (a validated v3 extraction, or null when the run
 * could not examine the document). The derived state comes from the SAME shared rule every consumer uses (`issuerEvidenceOf`).
 *
 * Gates (all must hold for PASS):
 *   readings_complete        every document fixture has a reading                                     = all
 *   v3_readings              every reading carries v3 issuer evidence (no reading is `unclassified`)   = all
 *   false_identified         an issuer identified where the truth identifies none, or the wrong one     = 0  (critical)
 *   denial_identified        a business the document denies is derived as the issuer                    = 0  (critical)
 *   state_accuracy           derived state equals the truth state                                       >= 0.95
 *   historical_unclassified  every historical v2 reading derives `unclassified`                         = all
 *   denials_extracted        every denial the truth records is read as an issuer_denied statement for    = all
 *                            the same business (CRV2-IA-4D3: a missed denial is never the same result as an
 *                            extracted one, even where the derived state is also accepted)
 */

import { issuerEvidenceOf, normalizeBusiness, type IssuerEvidenceState } from '../receipt-examination/issuer-evidence'
import type { ReceiptExtraction } from '../receipt-examination/schema'
import { ISSUER_EVIDENCE_FIXTURES, type HistoricalReadingFixture, type IssuerEvidenceTruth } from './issuer-evidence-fixtures'

/** v2 (CRV2-IA-4D3 gate): adds per-document denial extraction and the `denials_extracted` gate. */
export const ISSUER_EVIDENCE_SCORING_VERSION = 'issuer-evidence-scoring-v2' as const
export const ISSUER_EVIDENCE_GATES = { state_accuracy_min: 0.95 } as const

/**
 * CRV2-IA-4D3 S2b: anything scorable — a rendered issuer-evidence fixture, a baseline document with its v3 truth, or a private
 * document whose truth is held outside the repository. `accept_states` lists other derived states that are equally correct for that
 * document; it can never contain `identified` (the critical gates are computed from the truth alone and are never relaxed).
 */
export interface ScorableIssuerDocument {
  kind: 'document'
  id: string
  truth: IssuerEvidenceTruth & { accept_states?: readonly Exclude<IssuerEvidenceState, 'identified' | 'unclassified'>[] }
}
export type ScorableIssuerFixture = ScorableIssuerDocument | HistoricalReadingFixture

export interface IssuerEvidenceDocResult {
  id: string
  expected_state: IssuerEvidenceState
  derived_state: IssuerEvidenceState | 'no_reading'
  state_correct: boolean
  false_identified: boolean
  denial_identified: boolean
  /** Distinct businesses the truth records as denied. */
  denials_expected: number
  /** Of those, how many the reading reports as `issuer_denied` (null without a reading). Counts only: no business names. */
  denials_extracted: number | null
}

export interface IssuerEvidenceScore {
  documents: IssuerEvidenceDocResult[]
  gates: { id: string; passed: boolean; detail: string }[]
  verdict: 'PASS' | 'FAIL'
}

export function scoreIssuerEvidence(
  readings: ReadonlyMap<string, ReceiptExtraction | null>,
  fixtures: readonly ScorableIssuerFixture[] = ISSUER_EVIDENCE_FIXTURES,
): IssuerEvidenceScore {
  const documents: IssuerEvidenceDocResult[] = []
  let historicalOk = true
  for (const f of fixtures) {
    if (f.kind === 'historical_v2_reading') {
      if (issuerEvidenceOf(f.reading).state !== 'unclassified') historicalOk = false
      continue
    }
    const reading = readings.get(f.id) ?? null
    const derived = reading ? issuerEvidenceOf(reading) : null
    const state = derived ? derived.state : 'no_reading'
    const truthBusiness = f.truth.business === null ? null : normalizeBusiness(f.truth.business)
    const derivedBusiness = derived?.business ? normalizeBusiness(derived.business) : null
    const deniedByTruth = new Set(f.truth.statements.filter((s) => s.role === 'issuer_denied').map((s) => normalizeBusiness(s.business)))
    const falseIdentified = state === 'identified' && (truthBusiness === null || derivedBusiness !== truthBusiness)
    const denialIdentified = state === 'identified' && derivedBusiness !== null && deniedByTruth.has(derivedBusiness)
    const accepted = (f.truth.accept_states ?? []).filter((x) => x !== ('identified' as string))
    const stateCorrect =
      (state === f.truth.state && (f.truth.state !== 'identified' || derivedBusiness === truthBusiness)) || (state !== 'no_reading' && (accepted as string[]).includes(state))
    const deniedInReading = new Set((reading?.issuer_evidence?.statements ?? []).filter((s) => s.role === 'issuer_denied').map((s) => normalizeBusiness(s.business)))
    const denialsExtracted = reading ? Array.from(deniedByTruth).filter((b) => deniedInReading.has(b)).length : null
    documents.push({
      id: f.id,
      expected_state: f.truth.state,
      derived_state: state,
      state_correct: stateCorrect,
      false_identified: falseIdentified,
      denial_identified: denialIdentified,
      denials_expected: deniedByTruth.size,
      denials_extracted: denialsExtracted,
    })
  }
  const n = documents.length
  const correct = documents.filter((d) => d.state_correct).length
  const accuracy = n === 0 ? 0 : correct / n
  const gates = [
    { id: 'readings_complete', passed: documents.every((d) => d.derived_state !== 'no_reading'), detail: `${documents.filter((d) => d.derived_state !== 'no_reading').length}/${n}` },
    { id: 'v3_readings', passed: documents.every((d) => d.derived_state !== 'unclassified'), detail: `${documents.filter((d) => d.derived_state === 'unclassified').length} unclassified` },
    { id: 'false_identified', passed: documents.every((d) => !d.false_identified), detail: `${documents.filter((d) => d.false_identified).length} (= 0 required)` },
    { id: 'denial_identified', passed: documents.every((d) => !d.denial_identified), detail: `${documents.filter((d) => d.denial_identified).length} (= 0 required)` },
    { id: 'state_accuracy', passed: accuracy >= ISSUER_EVIDENCE_GATES.state_accuracy_min, detail: `${correct}/${n} (>= ${ISSUER_EVIDENCE_GATES.state_accuracy_min} required)` },
    { id: 'historical_unclassified', passed: historicalOk, detail: historicalOk ? 'all unclassified' : 'a historical reading derived an issuer state' },
    (() => {
      const withDenials = documents.filter((d) => d.denials_expected > 0)
      const missed = withDenials.filter((d) => d.denials_extracted !== d.denials_expected)
      return { id: 'denials_extracted', passed: missed.length === 0, detail: `${withDenials.length - missed.length}/${withDenials.length} documents with every recorded denial extracted` }
    })(),
  ]
  return { documents, gates, verdict: gates.every((g) => g.passed) ? 'PASS' : 'FAIL' }
}
