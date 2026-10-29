/**
 * CR-PDF-DECLARATIONS-1 — what a Creator Record PDF may say about the creator's
 * declarations, derived only from what the submission records.
 *
 * Contract:
 *   - `submissions.custodian_declaration` / `submissions.indemnification_confirmed`
 *     strictly `true`        → 'recorded': the submission records the declaration as
 *                              given. The PDF says so, says SI8 has not verified it, and
 *                              shows the current form wording as wording, not as proof of
 *                              what was accepted. Nothing is broadened.
 *   - anything else (false, null, undefined, a string, a number) → 'not_recorded'.
 *     `false` is ALSO the column default and the value of every row created before
 *     the columns existed (2026-07-10), so it does not mean "declined": the PDF says
 *     only that no declaration is recorded.
 *
 * The quoted wording is the RecordForm (/record) checkbox text, which the repository shows
 * unchanged since these flags began to be persisted (commit bfdd968d, 2026-07-10). That is
 * repository history, not evidence about any individual submission, so the PDF never claims
 * that a person accepted this wording. A regression test pins the form text to these constants.
 *
 * PURE. No I/O.
 */

export type DeclarationState = 'recorded' | 'not_recorded'

export function declarationState(value: unknown): DeclarationState {
  return value === true ? 'recorded' : 'not_recorded'
}

/** The RecordForm checkbox texts, verbatim (app/record/page.tsx). */
export const RECORD_FORM_CUSTODIAN_DECLARATION =
  'I confirm that I retain my prompt logs, iteration records, and production notes internally. I will produce these records if legally challenged or requested by a distributor or E&O insurer. SI8 does not collect raw prompts.'

export const RECORD_FORM_ACCURACY_WARRANTY =
  "I warrant that all information submitted is accurate and complete to the best of my knowledge. I agree to indemnify and hold harmless SI8 / PMF Strategy Inc. against any claims arising from inaccurate or incomplete information I have provided. I understand that SI8's verification is not a legal certification and does not replace independent legal advice."

/**
 * Provenance lines for a recorded declaration (CR-PDF-DECLARATIONS-1C). They keep three things apart:
 *   - recorded submission data: the flag is set on this submission (not that a particular person performed it);
 *   - verification: SI8 has not verified it;
 *   - wording: the text is the CURRENT form's wording, not proof of which wording version was accepted.
 */
export const DECLARATION_RECORDED_STATUS = 'Recorded in this submission as given. Self-attested; not verified by SI8.'
export const DECLARATION_WORDING_LABEL = 'Declaration wording on the Creator Record form when this document was generated:'

export const CUSTODIAN_NOT_RECORDED = 'No Evidence Custodian Declaration is recorded for this submission.'
export const ACCURACY_WARRANTY_NOT_RECORDED = 'No Accuracy Warranty and Indemnification confirmation is recorded for this submission.'

export interface DeclarationBlock {
  state: DeclarationState
  /** 'quote' = recorded, shown with the form wording; 'statement' = a neutral SI8 statement. */
  kind: 'quote' | 'statement'
  text: string
}

export function custodianDeclarationBlock(value: unknown): DeclarationBlock {
  return declarationState(value) === 'recorded'
    ? { state: 'recorded', kind: 'quote', text: RECORD_FORM_CUSTODIAN_DECLARATION }
    : { state: 'not_recorded', kind: 'statement', text: CUSTODIAN_NOT_RECORDED }
}

export function accuracyWarrantyBlock(value: unknown): DeclarationBlock {
  return declarationState(value) === 'recorded'
    ? { state: 'recorded', kind: 'quote', text: RECORD_FORM_ACCURACY_WARRANTY }
    : { state: 'not_recorded', kind: 'statement', text: ACCURACY_WARRANTY_NOT_RECORDED }
}

/**
 * Tool-receipt notice. The form never asks the creator about receipts, so no
 * declaration state can support a receipts warranty; the notice states SI8's
 * own limitation only.
 */
export const TOOL_RECEIPTS_NOTICE = 'Tool receipts are not verified by SI8 for the Creator Record tier.'
