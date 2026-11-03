/**
 * CR-V2-EXAM-INTEGRATION-X3 — pure helpers and wording for the creator examination experience (no React, no fetch).
 *
 * WORDING STATUS: DRAFT, NOT APPROVED. Every creator-facing string here is engineering draft text for synthetic UAT
 * only. It states what the product does and does not do; it makes no commercial, licensing or legal claim. It must be
 * replaced by approved wording before any customer sees it.
 *
 * Semantics kept apart, always: DECLARATIONS (what the creator said; authoritative for guidance), OBSERVATIONS (what a
 * document appears to show; never verified), COMPARISONS (derived from this version's declarations and the
 * observations; provisional), CREATOR RESPONSES (closed codes, this version only; they change nothing else).
 */
// Client-safe: the vocabulary module has no Node dependency (the contract module does, so it stays server-side; the
// consent identifier reaches the browser as a prop from the server page).
import { EVIDENCE_CATEGORIES } from '@/lib/creator-record/evidence-intake/vocabulary'
import type { CreatorRecordFormState } from '@/lib/creator-record/prototype/form'
import type { ExaminationView, PreparedView } from '@/lib/creator-record/customer-flow/service'

export const X3_WORDING_STATUS = 'draft_unapproved' as const

export const EXAM_TEXT = {
  evidence_title: 'Documents (synthetic test documents only)',
  evidence_intro: 'You can add SI8’s synthetic test receipts, link each to a tool, and ask SI8 to examine it. Examination replays recorded test data; no AI model reads your file. What it shows is not verified.',
  consent_label: 'I will add only synthetic test documents, and I agree that SI8 stores them privately for this record.',
  upload: 'Add document',
  uploading: 'Adding…',
  examine: 'Examine',
  examining: 'Examining…',
  retry: 'Try again',
  examined: 'Examined. The findings appear when you include them in a version.',
  include_label: 'Include examination findings in this version',
  include_note: 'A version with examination findings is for testing only: it cannot be paid for or issued.',
  link_label: 'Link to',
  not_linked: 'Not linked to a tool',
  no_documents: 'No documents added yet.',
  findings_title: 'What the documents appear to show',
  findings_intro: 'These are observations from an automated examination of recorded test data. They are NOT verified. They are not a finding, a certification, a licence check or commercial clearance, and they do not change your declarations.',
  not_verified: 'Not verified',
  limitations_title: 'Limitations',
  comparisons_title: 'How this compares with your declarations',
  comparisons_intro: 'Each comparison is provisional and uses this version’s declarations. Correcting your answers recalculates it.',
  responses_title: 'Your responses',
  responses_intro: 'You can respond to an observation or a comparison. Your response is recorded on a new version. It does not change the document, the observation or your declarations.',
  record_responses: 'Record my responses',
  recording: 'Recording…',
  earlier_title: 'Responses from your previous version',
  earlier_intro: 'These targets did not change. Earlier responses are not carried over automatically: tick any you want to give again.',
  no_response: 'No response',
  payment_blocked: 'This version includes examination findings, so it cannot be paid for or issued. Prepare a version without them to continue.',
} as const

export const COMPARISON_LABELS: Record<string, string> = {
  appears_consistent: 'Appears consistent',
  appears_to_conflict: 'Appears to conflict',
  does_not_establish: 'Does not establish',
  not_assessed: 'Not assessed',
}

export const OBSERVATION_STATUS_LABELS: Record<string, string> = {
  present: 'Shown',
  not_shown: 'Not shown',
  unreadable: 'Unreadable',
  ambiguous: 'Ambiguous',
}

export const RESPONSE_LABELS: Record<string, string> = {
  reading_incorrect: 'This reading is wrong',
  wrong_document: 'This is the wrong document',
  other_plan_applies: 'A different plan applies',
  not_relevant: 'Not relevant',
}

/** Plain explanations of the envelope's limitation codes. An unknown code is shown as is, never hidden. */
export const LIMITATION_LABELS: Record<string, string> = {
  recorded_test_data_not_model_output: 'This result replays recorded test data. No AI model read the file.',
  observations_not_verified: 'Nothing here has been verified by SI8 or anyone else.',
  no_location_reference: 'Observations do not point to a place in the document.',
  fields_not_established: 'Some details could not be read from the document.',
  single_plan_reading_does_not_exclude_others: 'Reading one plan does not rule out others.',
  multiple_plans_shown: 'The document shows more than one plan.',
  instruction_like_text_present: 'The document contains text that looks like instructions; it was not followed.',
  not_a_billing_document: 'The document does not appear to be a billing document.',
  partially_legible: 'Parts of the document are hard to read.',
  illegible: 'The document could not be read.',
}
export const limitationText = (code: string) => LIMITATION_LABELS[code] ?? code

export const EVIDENCE_CATEGORY_DEFAULT: (typeof EVIDENCE_CATEGORIES)[number] = 'billing_receipt'
export { EVIDENCE_CATEGORIES }

export type ResponseTarget = ExaminationView['responses'][number]['target']
export interface ResponseInput { target: ResponseTarget; code: string }
export interface Attachment { document_id: string; category: string; tool_index: number | null }

/** A stable key for a response target (UI selection state only; never sent). */
export const targetKey = (t: ResponseTarget) => (t.kind === 'observation' ? `o:${t.run_id}:${t.observation_id}` : `c:${t.tool_index}:${t.document_id}:${t.field}`)

/** The prepare request body. Only these keys exist; the server rejects anything else. */
export function preparedBody(o: { state: CreatorRecordFormState; draftId?: string | null; attachments: Attachment[]; includeExaminations: boolean; responses?: ResponseInput[] }): Record<string, unknown> {
  return {
    state: o.state,
    ...(o.draftId ? { draft_id: o.draftId } : {}),
    ...(o.attachments.length > 0 ? { documents: o.attachments.map((a) => ({ document_id: a.document_id, category: a.category, tool_index: a.tool_index })) } : {}),
    ...(o.includeExaminations ? { include_examinations: true } : {}),
    ...(o.includeExaminations && o.responses && o.responses.length > 0 ? { responses: o.responses.map((r) => ({ target: r.target, code: r.code })) } : {}),
  }
}

/** The documents a version references, as attachments (so responding re-sends exactly the same version inputs). */
export const attachmentsOf = (view: PreparedView): Attachment[] => view.documents.map((d) => ({ document_id: d.document_id, category: d.category, tool_index: d.tool_index }))

/** Responses chosen in the form: one per target, only closed codes the version offers. */
export function chosenResponses(choice: Record<string, string>, view: PreparedView): ResponseInput[] {
  const e = view.examination
  if (!e) return []
  const targets: ResponseTarget[] = [
    ...e.documents.flatMap((d) => d.observations.map((o): ResponseTarget => ({ kind: 'observation', run_id: d.run_id, observation_id: o.observation_id }))),
    ...e.comparisons.flatMap((c) => (['provider', 'plan'] as const).map((field): ResponseTarget => ({ kind: 'comparison', tool_index: c.tool_index, document_id: c.document_id, field }))),
  ]
  return targets.flatMap((t) => {
    const code = choice[targetKey(t)]
    return code && e.response_codes.includes(code) ? [{ target: t, code }] : []
  })
}

/** One document's examination request outcome, from the X2 route's response. */
export type ExamineState = { kind: 'idle' } | { kind: 'working' } | { kind: 'done'; result: 'created' | 'existing' } | { kind: 'refused'; message: string; retry: boolean }
export function examineStateFrom(status: number, json: unknown): ExamineState {
  const j = (json ?? {}) as { examination?: { result?: string }; error?: unknown; code?: unknown }
  if (status === 200 && (j.examination?.result === 'created' || j.examination?.result === 'existing')) return { kind: 'done', result: j.examination.result }
  const message = typeof j.error === 'string' ? j.error : 'Something went wrong. Nothing was changed.'
  // Transient (503 unavailable, network) may be retried; a refusal (403/404/409/422, stopped) is final.
  return { kind: 'refused', message, retry: status === 503 && j.code === 'unavailable' }
}
