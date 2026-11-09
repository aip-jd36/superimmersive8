/**
 * CR-V2-1A — the Source Text Approval contract.
 *
 * Some customer-visible texts carry no approval of their own: question wording
 * and help, option labels, acknowledgement wording, dependency labels and
 * caveat wording, and (CR-V2-MVP-PROD-PREP-1) the customer wording set held in code: checkout, email, dashboard, consent
 * controls, questionnaire chrome, panels and messages, named by its identity (`lib/creator-record-flow/customer-wording`).
 * They are approved TOGETHER, as one immutable content set,
 * identified by the SHA-256 of its canonical form. An approval names that exact
 * digest, so changing any text (or adding or removing one) without a new
 * approval is refused.
 *
 * Scope of an approval: WORDING ONLY. It never decides which questions are
 * shown (the Question Registry), which claims may be published or how strongly
 * (the publication ledger, applicability and Bounded Interpretation), or any
 * provenance. The content set has an exact shape: there is no category for
 * explanations, conclusions or conclusion labels, so an approval cannot carry
 * them.
 *
 * Three separate questions, deliberately kept apart:
 *   - preparation-time approval (here): may a record be PREPARED from these
 *     texts now? Only an `approved` approval for this exact content and record
 *     schema says yes;
 *   - historical integrity (`verifyCustomerRecord` in ./record): is a stored
 *     record exactly what was prepared? Checked from the record and its digest
 *     alone, whatever the approval's state today;
 *   - current issuance eligibility: may a prepared record be issued NOW (for
 *     example after a withdrawal)? Not decided here, and not implemented.
 *
 * Pure: no I/O, no clock.
 */

import type { QuestionRegistry } from '../contract/question-registry'
import { isApproved, isIsoDate } from '../contract/types'
import type { CreatorRecordSources } from '../prototype/build-draft'
import { canonicalJson, sha256Hex } from '../record-core/canonical'

export const SOURCE_TEXT_SOURCE_ID = 'si8/creator-record-v2-source-text'

/** The exact wording categories an approval covers. All are required; no other category exists. */
export const SOURCE_TEXT_CATEGORIES = ['question_wording', 'option_labels', 'acknowledgement_wording', 'dependency_labels', 'caveat_wording', 'customer_wording'] as const
export type SourceTextCategory = (typeof SOURCE_TEXT_CATEGORIES)[number]

export const SOURCE_TEXT_LIFECYCLE = ['pending', 'approved', 'withdrawn', 'superseded'] as const
export type SourceTextLifecycle = (typeof SOURCE_TEXT_LIFECYCLE)[number]

/** The approved content set: exactly these texts, nothing else. Its digest identifies it. */
export interface SourceTextContent {
  source_id: typeof SOURCE_TEXT_SOURCE_ID
  /** Wording and help for each APPROVED question, with its option labels, by question id and version. */
  questions: Record<string, { q_version: number; text: string; help: string | null; option_labels: Record<string, string> }>
  acknowledgements: Record<string, string>
  dependency_labels: Record<string, string>
  caveats: Record<string, string>
  /**
   * CR-V2-MVP-PROD-PREP-1: the customer wording set the flow renders (`customerWordingIdentity()`, derived from the wording itself), supplied by the approved-inputs
   * layer from code, never from a bundle. Absent for sources that carry none (pilot and internal sources); an approval without it covers
   * no customer flow wording; the key is then absent, so content built from such sources is byte-identical to before this field.
   */
  customer_wording?: { set_id: string; version: number; sha256: string }
}

export interface SourceTextApproval {
  source_id: typeof SOURCE_TEXT_SOURCE_ID
  /** Approval version: a positive integer, raised for every new approval. */
  version: number
  /** SHA-256 of the canonical JSON of the approved `SourceTextContent`. */
  content_sha256: string
  /** Must list exactly `SOURCE_TEXT_CATEGORIES`. */
  categories: readonly string[]
  /** The customer-record schema this wording was approved for. */
  record_schema: { id: string; version: number }
  lifecycle: SourceTextLifecycle
  /** Named approval authority (a person or body, never a role placeholder). */
  authority: string
  decision_date: string
  review_ref: string | null
}

/** Acknowledgement wording, by acknowledgement id. Part of the approved content set. */
export type AcknowledgementText = Readonly<Record<string, string>>

/**
 * The content set the given sources and acknowledgement wording amount to.
 * Questions: only approved ones. Throws nothing; missing pieces surface as
 * refusals in `checkSourceText` and as a different digest here.
 */
export function sourceTextContent(sources: CreatorRecordSources, registry: QuestionRegistry, acknowledgements: AcknowledgementText): SourceTextContent {
  const questions: SourceTextContent['questions'] = {}
  for (const q of Array.from(registry.questions.values())) {
    if (!isApproved(q.approval) || !Object.prototype.hasOwnProperty.call(sources.presentation, q.q_id)) continue
    const p = sources.presentation[q.q_id]
    questions[q.q_id] = { q_version: q.version, text: p.text, help: p.help ?? null, option_labels: { ...p.option_labels } }
  }
  return {
    source_id: SOURCE_TEXT_SOURCE_ID,
    questions,
    acknowledgements: { ...acknowledgements },
    dependency_labels: { ...sources.dependency_labels },
    caveats: { ...sources.caveats },
    ...(sources.customer_wording ? { customer_wording: { set_id: sources.customer_wording.set_id, version: sources.customer_wording.version, sha256: sources.customer_wording.sha256 } } : {}),
  }
}

export const sourceTextDigest = (content: SourceTextContent): string => sha256Hex(canonicalJson(content))

export const SOURCE_TEXT_REFUSAL_CODES = [
  'source_text_missing',
  'source_text_identity_invalid',
  'source_text_not_approved',
  'source_text_withdrawn',
  'source_text_superseded',
  'source_text_categories_invalid',
  'source_text_schema_mismatch',
  'source_text_digest_mismatch',
  'acknowledgement_text_missing',
  'acknowledgement_text_orphan',
] as const
export type SourceTextRefusalCode = (typeof SOURCE_TEXT_REFUSAL_CODES)[number]

export type SourceTextCheck =
  | { ok: true; content: SourceTextContent; digest: string; approval: SourceTextApproval }
  | { ok: false; refusals: { code: SourceTextRefusalCode | 'pilot_marker'; ref: string | null }[] }

const UNAPPROVED_MARKER = /pilot|prototype|unapproved|not a governance approval|not a creator record publication approval/i

/**
 * Preparation-time check: the approval is `approved`, names a real authority
 * and date, covers exactly the wording categories, is for this record schema,
 * and its digest is the digest of exactly these texts. Every acknowledgement
 * the questionnaire requires has wording, and no wording is orphaned.
 */
export function checkSourceText(
  sources: CreatorRecordSources,
  registry: QuestionRegistry,
  acknowledgements: AcknowledgementText | null,
  approval: SourceTextApproval | null,
  recordSchema: { id: string; version: number },
): SourceTextCheck {
  const refusals: { code: SourceTextRefusalCode | 'pilot_marker'; ref: string | null }[] = []
  const refuse = (code: SourceTextRefusalCode | 'pilot_marker', ref: string | null = null) => refusals.push({ code, ref })

  const ack = acknowledgements ?? {}
  for (const id of sources.acknowledgement_ids) if (!Object.prototype.hasOwnProperty.call(ack, id) || typeof ack[id] !== 'string' || ack[id].trim() === '') refuse('acknowledgement_text_missing', id)
  for (const id of Object.keys(ack)) if (!sources.acknowledgement_ids.includes(id)) refuse('acknowledgement_text_orphan', id)

  if (!approval) {
    refuse('source_text_missing')
    return { ok: false, refusals }
  }
  if (approval.source_id !== SOURCE_TEXT_SOURCE_ID || !Number.isInteger(approval.version) || approval.version < 1) refuse('source_text_identity_invalid')
  if (approval.lifecycle === 'withdrawn') refuse('source_text_withdrawn')
  else if (approval.lifecycle === 'superseded') refuse('source_text_superseded')
  else if (approval.lifecycle !== 'approved' || typeof approval.authority !== 'string' || approval.authority.trim() === '' || !isIsoDate(approval.decision_date)) refuse('source_text_not_approved')
  if (UNAPPROVED_MARKER.test(String(approval.authority)) || UNAPPROVED_MARKER.test(String(approval.review_ref ?? ''))) refuse('pilot_marker', 'source_text')
  const categories = Array.isArray(approval.categories) ? [...approval.categories].sort() : null
  if (!categories || canonicalJson(categories) !== canonicalJson([...SOURCE_TEXT_CATEGORIES].sort())) refuse('source_text_categories_invalid')
  if (!approval.record_schema || approval.record_schema.id !== recordSchema.id || approval.record_schema.version !== recordSchema.version) refuse('source_text_schema_mismatch')

  const content = sourceTextContent(sources, registry, ack)
  const digest = sourceTextDigest(content)
  if (approval.content_sha256 !== digest) refuse('source_text_digest_mismatch')

  if (refusals.length > 0) return { ok: false, refusals }
  return { ok: true, content, digest, approval }
}
