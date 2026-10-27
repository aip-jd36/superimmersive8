/**
 * CR-V2-EVIDENCE-SLICE-1 — what an uploaded document APPEARS TO SHOW, and how
 * the creator reviewed it. Pure and browser-safe (no Node API, no SDK).
 *
 * Authority rules (test-enforced):
 *   - An examined document is an OBSERVATION, never a fact. It records what a
 *     document appears to show (receipt-extraction-v2), with its status per
 *     field. There is no "verified", "matched" or "confirmed" state.
 *   - Document observations are display-only. They never reach facts,
 *     applicability, Bounded Interpretation or composition. Only customer
 *     declarations do (`prototype/form.ts` → `integration/facts.ts`).
 *   - The creator may ADOPT a value the document appears to show as their own
 *     answer. The result is still a customer declaration ("on what you told
 *     us"); the document observation itself is never changed.
 *   - Nothing here compares a document with a declaration. The only check
 *     between them is an integrity check on the review itself: an "adopted"
 *     review must name a value the document appears to show, and the answer
 *     it claims to have set (see `isStaleReview`). Its result is never shown
 *     as a statement about the document.
 *   - Fixture replay and live model examination are always labelled
 *     (`extraction_mode`). Replay returns recorded ground truth for SI8's own
 *     synthetic test documents and says nothing about extraction quality.
 */

import {
  BILLING_DOCUMENT_TYPES,
  EXTRACTED_FIELD_NAMES,
  validateReceiptExtraction,
  type ExtractedFieldName,
  type ReceiptExtraction,
} from '../receipt-examination/schema'
import type { DocumentObservation, RecordContext } from '../contract/provenance'
import type { CouldNotExamineReason } from '../receipt-examination/examine'
import type { ReceiptMediaType } from '../receipt-examination/prompt'

export const EVIDENCE_SLICE_VERSION = 'cr-evidence-slice-1'

/** Conservative ceiling, below the serverless request-body limit. */
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024
/** Multipart overhead allowance on top of the file itself. */
export const MAX_EXAMINE_REQUEST_BYTES = MAX_UPLOAD_BYTES + 64 * 1024
export const MAX_DOCUMENTS_PER_TOOL = 1
export const MAX_FILE_NAME_CHARS = 120

export const EXTRACTION_MODES = ['fixture_replay', 'live_model'] as const
export type ExtractionMode = (typeof EXTRACTION_MODES)[number]

export const DOCUMENT_OUTCOMES = ['document_examined', 'could_not_examine', 'document_provided_not_examined'] as const
export type DocumentOutcome = (typeof DOCUMENT_OUTCOMES)[number]

export const NOT_EXAMINED_REASONS = ['unsupported_format', 'file_too_large', 'empty_file', 'model_error', 'structured_output_missing', 'schema_invalid', 'no_replay_fixture'] as const
export type NotExaminedReason = CouldNotExamineReason | 'no_replay_fixture'

const MEDIA_TYPES: readonly ReceiptMediaType[] = ['application/pdf', 'image/png', 'image/jpeg']

export interface ExaminedDocument {
  /** Stable for the same bytes: `DOC-` + the first 12 hex characters of the SHA-256. */
  document_id: string
  /** Display name as uploaded (path stripped, control characters removed, length-capped). */
  file_name: string
  /** Byte identity of the file received. Not authenticity, authorship or date. */
  sha256: string
  bytes: number
  /** Detected from the file's own bytes; the browser's declared type is never used. */
  detected_media_type: ReceiptMediaType | null
  outcome: DocumentOutcome
  reason: NotExaminedReason | null
  extraction_mode: ExtractionMode
  /** Fixture id when the observation was replayed from SI8's synthetic test set. */
  replay_fixture_id: string | null
  versions: { schema: string; prompt: string | null; replay_set: string | null }
  /** AI model calls actually made. Always 0 for fixture replay and for rejected inputs. */
  model_calls: number
  /** What the document appears to show. Null unless `outcome` is `document_examined`. */
  extraction: ReceiptExtraction | null
}

export const REVIEW_DECISIONS = ['not_reviewed', 'adopted', 'entered_different', 'ignored'] as const
export type ReviewDecision = (typeof REVIEW_DECISIONS)[number]

/** The creator's explicit choice about one document. The document itself is never edited. */
export interface DocumentReview {
  document_id: string
  decision: ReviewDecision
  /** The value adopted as the creator's own answer; only for `adopted`. */
  adopted_value: string | null
}

/** One uploaded document attached to one tool block, with the creator's review. */
export interface ToolDocument {
  tool_index: number
  document: ExaminedDocument
  review: DocumentReview
}

export const documentIdFor = (sha256: string) => `DOC-${sha256.slice(0, 12).toUpperCase()}`

/** Strips any path, control characters and excess length from an uploaded file name. */
export function sanitizeFileName(name: string | null | undefined): string {
  const base = String(name ?? '').split(/[\\/]/).pop() ?? ''
  const clean = base.replace(/[\u0000-\u001f\u007f-\u009f‪-‮⁦-⁩]/g, '').trim()
  return (clean.length > 0 ? clean : 'document').slice(0, MAX_FILE_NAME_CHARS)
}

/**
 * Plan names the creator may adopt from a document: the plan/product name it
 * appears to show plus every printed plan-name observation, exactly as
 * extracted. Only for an examined billing document that is not illegible. The
 * creator decides; nothing is chosen for them.
 */
export function adoptablePlanValues(doc: ExaminedDocument): string[] {
  const ex = doc.extraction
  if (doc.outcome !== 'document_examined' || !ex) return []
  if (!BILLING_DOCUMENT_TYPES.includes(ex.document_type) || ex.readability === 'illegible') return []
  const out: string[] = []
  const push = (v: string | null) => {
    if (v && v.trim() !== '' && !out.includes(v)) out.push(v)
  }
  if (ex.product_or_plan_name.status === 'present') push(ex.product_or_plan_name.value)
  for (const c of ex.plan_candidates) push(c.text)
  return out
}

// ───────────────────────────────────────────── strict parsing (request bodies)

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const exactKeys = (o: Record<string, unknown>, keys: readonly string[]) => Object.keys(o).length === keys.length && keys.every((k) => Object.prototype.hasOwnProperty.call(o, k))
const DOCUMENT_KEYS = ['document_id', 'file_name', 'sha256', 'bytes', 'detected_media_type', 'outcome', 'reason', 'extraction_mode', 'replay_fixture_id', 'versions', 'model_calls', 'extraction'] as const
const SHORT = (v: unknown, max = 80) => typeof v === 'string' && v.length > 0 && v.length <= max

/**
 * Strict, non-repairing validation of an examined document returned by the
 * browser for display. Any inconsistency → null (the route answers 400).
 */
export function parseExaminedDocument(raw: unknown): ExaminedDocument | null {
  if (!isObj(raw) || !exactKeys(raw, DOCUMENT_KEYS)) return null
  const { document_id, file_name, sha256, bytes, detected_media_type, outcome, reason, extraction_mode, replay_fixture_id, versions, model_calls, extraction } = raw
  if (typeof sha256 !== 'string' || !/^[0-9a-f]{64}$/.test(sha256)) return null
  if (document_id !== documentIdFor(sha256)) return null
  if (typeof file_name !== 'string' || file_name !== sanitizeFileName(file_name)) return null
  if (typeof bytes !== 'number' || !Number.isInteger(bytes) || bytes < 0 || bytes > MAX_UPLOAD_BYTES) return null
  if (detected_media_type !== null && !MEDIA_TYPES.includes(detected_media_type as ReceiptMediaType)) return null
  if (typeof outcome !== 'string' || !(DOCUMENT_OUTCOMES as readonly string[]).includes(outcome)) return null
  if (typeof extraction_mode !== 'string' || !(EXTRACTION_MODES as readonly string[]).includes(extraction_mode)) return null
  if (typeof model_calls !== 'number' || !Number.isInteger(model_calls) || model_calls < 0 || model_calls > 2) return null
  if (extraction_mode === 'fixture_replay' && model_calls !== 0) return null
  if (replay_fixture_id !== null && !SHORT(replay_fixture_id)) return null
  if (extraction_mode === 'live_model' && replay_fixture_id !== null) return null
  if (!isObj(versions) || !exactKeys(versions, ['schema', 'prompt', 'replay_set'])) return null
  if (!SHORT(versions.schema) || (versions.prompt !== null && !SHORT(versions.prompt)) || (versions.replay_set !== null && !SHORT(versions.replay_set))) return null

  let parsedExtraction: ReceiptExtraction | null = null
  if (outcome === 'document_examined') {
    if (reason !== null) return null
    parsedExtraction = validateReceiptExtraction(extraction)
    if (!parsedExtraction) return null
    if (extraction_mode === 'fixture_replay' && replay_fixture_id === null) return null
  } else {
    if (extraction !== null) return null
    if (typeof reason !== 'string' || !(NOT_EXAMINED_REASONS as readonly string[]).includes(reason)) return null
    if (outcome === 'document_provided_not_examined' && reason !== 'no_replay_fixture') return null
    if (outcome === 'could_not_examine' && reason === 'no_replay_fixture') return null
  }
  return {
    document_id,
    file_name,
    sha256,
    bytes,
    detected_media_type: detected_media_type as ReceiptMediaType | null,
    outcome: outcome as DocumentOutcome,
    reason: reason as NotExaminedReason | null,
    extraction_mode: extraction_mode as ExtractionMode,
    replay_fixture_id: replay_fixture_id as string | null,
    versions: { schema: versions.schema as string, prompt: versions.prompt as string | null, replay_set: versions.replay_set as string | null },
    model_calls,
    extraction: parsedExtraction,
  }
}

export function parseDocumentReview(raw: unknown): DocumentReview | null {
  if (!isObj(raw) || !exactKeys(raw, ['document_id', 'decision', 'adopted_value'])) return null
  const { document_id, decision, adopted_value } = raw
  if (typeof document_id !== 'string' || !/^DOC-[0-9A-F]{12}$/.test(document_id)) return null
  if (typeof decision !== 'string' || !(REVIEW_DECISIONS as readonly string[]).includes(decision)) return null
  if (decision === 'adopted') {
    if (typeof adopted_value !== 'string' || adopted_value.trim() === '' || adopted_value.length > 120) return null
  } else if (adopted_value !== null) return null
  return { document_id, decision: decision as ReviewDecision, adopted_value: adopted_value as string | null }
}

/** Every extracted field, in schema order. */
export const DOCUMENT_FIELDS: readonly ExtractedFieldName[] = EXTRACTED_FIELD_NAMES

/**
 * Integrity of a review against the document and the creator's current plan
 * answer. An `adopted` review whose value the document does not appear to
 * show, or whose value is no longer the creator's answer, is stale: the draft
 * is refused rather than recorded as adopted.
 */
export function isStaleReview(td: ToolDocument, currentPlanAnswer: string | undefined): boolean {
  if (td.review.document_id !== td.document.document_id) return true
  if (td.review.decision !== 'adopted') return false
  const v = td.review.adopted_value as string
  return !adoptablePlanValues(td.document).includes(v) || (currentPlanAnswer ?? '').trim() !== v.trim()
}

/**
 * The contract-level provenance of one document (PRD v0.3 §2.8): one
 * `document_examined` observation per extracted field and per printed plan
 * name, or a single `document_provided_not_examined` observation. These are
 * recorded for the trace only and are never passed to the guidance pipeline.
 */
export function toDocumentObservations(ctx: RecordContext, td: ToolDocument): DocumentObservation[] {
  const d = td.document
  const replay = d.extraction_mode === 'fixture_replay'
  const base = {
    record_id: ctx.record_id,
    record_version: ctx.record_version,
    file: { sha256: d.sha256, category: 'billing_document' },
    captured_at: ctx.captured_at,
    supersedes: null,
  }
  const id = (field: string, i = 0) => `${ctx.record_id}:v${ctx.record_version}:DOC:${d.document_id}:${field}:${i}`
  if (d.outcome !== 'document_examined' || !d.extraction) {
    return [{ ...base, observation_id: id('none'), source_kind: 'document_provided_not_examined', profile: null, field: null, value: null, excerpt: null }]
  }
  const profile = replay
    ? { id: 'receipt-fixture-replay', version: d.versions.replay_set ?? '' }
    : { id: 'receipt-extraction', version: `${d.versions.schema}/${d.versions.prompt ?? ''}` }
  const ex = d.extraction
  const out: DocumentObservation[] = DOCUMENT_FIELDS.map((f) => ({
    ...base,
    observation_id: id(f),
    source_kind: 'document_examined' as const,
    profile,
    field: `${f}:${ex[f].status}`,
    value: ex[f].value,
    excerpt: ex[f].evidence,
  }))
  ex.plan_candidates.forEach((c, i) => out.push({ ...base, observation_id: id('plan_candidate', i), source_kind: 'document_examined', profile, field: `plan_candidate:${c.context}`, value: c.text, excerpt: c.evidence }))
  return out
}
