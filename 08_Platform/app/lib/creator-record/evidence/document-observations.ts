/**
 * CR-V2-EVIDENCE-SLICE-1 — what an uploaded document APPEARS TO SHOW, and how it
 * relates (provisionally) to the creator's declaration. Pure and browser-safe (no Node API, no SDK).
 *
 * Authority rules (test-enforced):
 *   - An examined document is an OBSERVATION, never a fact. It records what a
 *     document appears to show (receipt-extraction-v2), with its status per
 *     field. There is no "verified", "matched" or "confirmed" state.
 *   - Document observations are display-only. They never reach facts,
 *     applicability, Bounded Interpretation or composition. Only customer
 *     declarations do (`prototype/form.ts` → `integration/facts.ts`).
 *   - CR-V2-MVP-6 (Option C, declare first): nothing a document appears to
 *     show can become, fill or change a declaration. There is no adoption.
 *   - `reconcileToolEvidence` describes, provisionally, how a document's
 *     observations relate to the creator's declaration for one tool:
 *     appears consistent / appears to conflict / does not establish / not
 *     assessed. It is computed on the server from the declarations and the
 *     server-checked observation, is never an input to guidance and is never
 *     a verification.
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
import { distinctPlanObservations, planTokens } from '../receipt-examination/plan-tokens'
import { CROSS_CHECK_STATUSES, type PlanCrossCheck } from './plan-cross-check'
import type { CouldNotExamineReason } from '../receipt-examination/examine'
import type { ReceiptMediaType } from '../receipt-examination/prompt'

export const EVIDENCE_SLICE_VERSION = 'cr-evidence-slice-1'

/** Conservative ceiling, below the serverless request-body limit. */
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024
/** Multipart overhead allowance on top of the file itself. */
export const MAX_EXAMINE_REQUEST_BYTES = MAX_UPLOAD_BYTES + 64 * 1024
export const MAX_DOCUMENTS_PER_TOOL = 1
/**
 * CR-V2-MVP-1: live model reading is held to a smaller file (input cost scales
 * with the document; the largest synthetic fixture is under 0.9 MB).
 */
export const MAX_LIVE_UPLOAD_BYTES = 1024 * 1024
/**
 * CR-V2-MVP-1 server-enforced consent: the examine route refuses any upload
 * whose request does not carry this exact statement, sent by the page only
 * after the creator ticks "Before you add a document". The value names the
 * statement version agreed to.
 */
export const DOCUMENT_CONSENT_HEADER = 'x-cr-document-consent'
export const DOCUMENT_CONSENT_VALUE = 'synthetic-test-documents-v1'
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
  /**
   * CR-V2-MVP-3 (G-R2): the plan cross-check against the document's own text
   * layer. Separate from, and never altering, the reading above.
   */
  cross_check: PlanCrossCheck
}

/** One uploaded document attached to one tool block. The document itself is never edited. */
export interface ToolDocument {
  tool_index: number
  document: ExaminedDocument
  /**
   * CR-V2-MVP-7: the server-issued attestation of a LIVE observation
   * (`./attestation.ts`), opaque to the browser. Absent for fixture replay,
   * which is checked against SI8's own replay table instead.
   */
  attestation?: string
}

export const documentIdFor = (sha256: string) => `DOC-${sha256.slice(0, 12).toUpperCase()}`

/** Strips any path, control characters and excess length from an uploaded file name. */
export function sanitizeFileName(name: string | null | undefined): string {
  const base = String(name ?? '').split(/[\\/]/).pop() ?? ''
  const clean = base.replace(/[\u0000-\u001f\u007f-\u009f‪-‮⁦-⁩]/g, '').trim()
  return (clean.length > 0 ? clean : 'document').slice(0, MAX_FILE_NAME_CHARS)
}

/**
 * CR-V2-MVP-6 — provisional evidence reconciliation for one tool block.
 *
 * Fail-closed rules (anything short of them → "does not establish" or "not
 * assessed", never a positive description):
 *   - Seller: the seller name exactly as read must resolve, under SI8's
 *     EXISTING tool-identity resolution (supplied by the caller; exact
 *     aliases only, no suffix stripping or fuzzy matching), to one canonical
 *     tool. Unrecognised or ambiguous → does not establish.
 *   - Plan: compared only when the seller appears consistent with the
 *     declared tool, and only for a single, fully read plan: the plan field
 *     read as present, no cut-off marker, the value found in its own
 *     excerpt, listed among the printed plan names, and no second plan
 *     anywhere in the reading (receipt-comparison-v2 plan tokens).
 *   - "Not sure", a missing answer or a tool outside SI8's list → not assessed.
 * A single reported plan never shows that the document names no other plan:
 * every "appears" result is presented with that limitation.
 */
export const RECONCILIATION_RESULTS = ['appears_consistent', 'appears_to_conflict', 'does_not_establish', 'not_assessed'] as const
export type ReconciliationResult = (typeof RECONCILIATION_RESULTS)[number]

export type ReconciliationReason =
  | 'no_document'
  | 'document_not_read'
  | 'tool_not_identified'
  | 'plan_not_declared'
  | 'not_a_billing_document'
  | 'document_not_readable'
  | 'seller_not_read'
  | 'seller_not_recognized'
  | 'seller_ambiguous'
  | 'same_tool'
  | 'different_tool'
  | 'seller_not_established'
  | 'plan_not_read'
  | 'plan_incomplete'
  | 'plan_not_in_excerpt'
  | 'plan_not_listed'
  | 'more_than_one_plan'
  | 'plan_not_identifiable'
  | 'same_plan_name'
  | 'different_plan_name'

export interface FieldReconciliation {
  result: ReconciliationResult
  reason: ReconciliationReason
}

export interface EvidenceReconciliation {
  tool_index: number
  document_id: string | null
  provider: FieldReconciliation
  plan: FieldReconciliation
}

/** The caller's exact, existing tool-identity resolution of a seller name. */
export type SellerIdentity = { kind: 'canonical'; tool_id: string } | { kind: 'ambiguous' } | { kind: 'unrecognized' }

export interface ToolEvidenceInput {
  tool_index: number
  document: ExaminedDocument | null
  /** The canonical tool the creator's own answer resolved to, or null. */
  declared_tool_id: string | null
  /** The creator's plan answer as given; null or "not_sure" when none. */
  declared_plan: string | null
}

const INCOMPLETE = /…|\.\.\.|\uFFFD/
const r = (result: ReconciliationResult, reason: ReconciliationReason): FieldReconciliation => ({ result, reason })

export function reconcileToolEvidence(input: ToolEvidenceInput, resolveSeller: (name: string) => SellerIdentity): EvidenceReconciliation {
  const out = (provider: FieldReconciliation, plan: FieldReconciliation): EvidenceReconciliation => ({ tool_index: input.tool_index, document_id: input.document?.document_id ?? null, provider, plan })
  const doc = input.document
  if (!doc) return out(r('not_assessed', 'no_document'), r('not_assessed', 'no_document'))
  const ex = doc.extraction
  if (doc.outcome !== 'document_examined' || !ex) return out(r('not_assessed', 'document_not_read'), r('not_assessed', 'document_not_read'))
  const plan = (input.declared_plan ?? '').trim()
  const planDeclared = plan !== '' && plan !== 'not_sure'

  const gate: FieldReconciliation | null = !BILLING_DOCUMENT_TYPES.includes(ex.document_type) ? r('does_not_establish', 'not_a_billing_document') : ex.readability === 'illegible' ? r('does_not_establish', 'document_not_readable') : null

  let provider: FieldReconciliation
  if (!input.declared_tool_id) provider = r('not_assessed', 'tool_not_identified')
  else if (gate) provider = gate
  else if (ex.issuer_name.status !== 'present' || !ex.issuer_name.value) provider = r('does_not_establish', 'seller_not_read')
  else {
    const seller = resolveSeller(ex.issuer_name.value)
    provider =
      seller.kind === 'unrecognized'
        ? r('does_not_establish', 'seller_not_recognized')
        : seller.kind === 'ambiguous'
          ? r('does_not_establish', 'seller_ambiguous')
          : seller.tool_id === input.declared_tool_id
            ? r('appears_consistent', 'same_tool')
            : r('appears_to_conflict', 'different_tool')
  }

  const planResult = ((): FieldReconciliation => {
    if (!planDeclared) return r('not_assessed', 'plan_not_declared')
    if (!input.declared_tool_id) return r('not_assessed', 'tool_not_identified')
    if (gate) return gate
    if (provider.result !== 'appears_consistent') return r('does_not_establish', 'seller_not_established')
    const p = ex.product_or_plan_name
    if (p.status !== 'present' || !p.value) return r('does_not_establish', 'plan_not_read')
    if (INCOMPLETE.test(p.value) || ex.plan_candidates.some((c) => INCOMPLETE.test(c.text))) return r('does_not_establish', 'plan_incomplete')
    if (!p.evidence || !p.evidence.normalize('NFKC').toLowerCase().includes(p.value.normalize('NFKC').toLowerCase())) return r('does_not_establish', 'plan_not_in_excerpt')
    const providers = [ex.issuer_name.value, input.declared_tool_id]
    if (ex.multiple_plans_shown || distinctPlanObservations(ex, providers).length > 1) return r('does_not_establish', 'more_than_one_plan')
    const docKey = planTokens(p.value, providers).join(' ')
    if (!ex.plan_candidates.some((c) => planTokens(c.text, providers).join(' ') === docKey)) return r('does_not_establish', 'plan_not_listed')
    const declaredKey = planTokens(plan, providers).join(' ')
    if (docKey === '' || declaredKey === '') return r('does_not_establish', 'plan_not_identifiable')
    return docKey === declaredKey ? r('appears_consistent', 'same_plan_name') : r('appears_to_conflict', 'different_plan_name')
  })()
  return out(provider, planResult)
}

// ───────────────────────────────────────────── strict parsing (request bodies)

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const exactKeys = (o: Record<string, unknown>, keys: readonly string[]) => Object.keys(o).length === keys.length && keys.every((k) => Object.prototype.hasOwnProperty.call(o, k))
const DOCUMENT_KEYS = ['document_id', 'file_name', 'sha256', 'bytes', 'detected_media_type', 'outcome', 'reason', 'extraction_mode', 'replay_fixture_id', 'versions', 'model_calls', 'extraction', 'cross_check'] as const

function parseCrossCheck(raw: unknown): PlanCrossCheck | null {
  if (!isObj(raw) || !exactKeys(raw, ['version', 'status', 'other_plan_names', 'reason', 'provider'])) return null
  const { version, status, other_plan_names, reason, provider } = raw
  if (!SHORT(version) || typeof status !== 'string' || !(CROSS_CHECK_STATUSES as readonly string[]).includes(status)) return null
  if (reason !== null && !SHORT(reason)) return null
  if (provider !== null && !SHORT(provider, 40)) return null
  if ((provider !== null) !== (status === 'other_plan_names_found' || status === 'no_other_plan_names_found')) return null
  if (!Array.isArray(other_plan_names) || other_plan_names.length > 8) return null
  const names: PlanCrossCheck['other_plan_names'] = []
  for (const n of other_plan_names) {
    if (!isObj(n) || !exactKeys(n, ['name', 'excerpt']) || !SHORT(n.name, 60) || !SHORT(n.excerpt, 80)) return null
    names.push({ name: n.name as string, excerpt: n.excerpt as string })
  }
  if ((status === 'other_plan_names_found') !== names.length > 0) return null
  return { version: version as string, status: status as PlanCrossCheck['status'], other_plan_names: names, reason: reason as string | null, provider: provider as string | null }
}
const SHORT = (v: unknown, max = 80) => typeof v === 'string' && v.length > 0 && v.length <= max

/**
 * Strict, non-repairing validation of an examined document returned by the
 * browser for display. Any inconsistency → null (the route answers 400).
 */
export function parseExaminedDocument(raw: unknown): ExaminedDocument | null {
  if (!isObj(raw) || !exactKeys(raw, DOCUMENT_KEYS)) return null
  const { document_id, file_name, sha256, bytes, detected_media_type, outcome, reason, extraction_mode, replay_fixture_id, versions, model_calls, extraction } = raw
  const cross_check = parseCrossCheck(raw.cross_check)
  if (!cross_check) return null
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
    cross_check,
  }
}

/** Every extracted field, in schema order. */
export const DOCUMENT_FIELDS: readonly ExtractedFieldName[] = EXTRACTED_FIELD_NAMES

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
