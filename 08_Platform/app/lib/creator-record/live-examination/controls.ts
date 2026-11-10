/**
 * CR-V2-DOC-LIVE-1B — the limits and the locks for a real examination. No network, no SDK, no logging. Disabled.
 *
 * Its own code lock, on purpose. `LIVE_EXTRACTION_PERMITTED_IN_THIS_BUILD` also opens the admin prototype's live path
 * (`app/api/admin/creator-record-v2/examine`), so an evaluation must never need it lifted: that lock stays false, and this one opens
 * only this contract, which no route reaches. Lifting this lock is a reviewed code change and a separate decision.
 *
 * What actually stands between this code and a model call today:
 *   - This compile-time lock is the principal barrier. No route reaches this code; the only runner (CR-V2-DOC-LIVE-1C-B1) is an operator
 *     CLI that refuses at this lock.
 *   - The object below is the executor's SESSION view of an authorization. Called directly, it is caller-supplied and unverified. The
 *     one entry point (`./evaluation`, CR-V2-DOC-LIVE-1C-A) builds it only from a durable authorization the database returned, and
 *     takes a durable reservation before each attempt. That schema is evaluation-only and applied to no deployed database.
 *   - `consent_reference` is checked for format only; nothing verifies the consent it refers to.
 *   - The in-memory spend ceiling here resets on a reload; the durable ledger is in the evaluation-only schema. Both are estimates. The
 *     external workspace spending limit would be the hard limit, and it is not yet configured.
 *   - The deployed database does NOT stop a model call: migration 20261108000000 stops a live result from being STORED.
 *
 * Proposed controls and prerequisites: `08_Platform/implementation/CR_V2_DOC_LIVE_EVALUATION_PROTOCOL.md`. No real-document evaluation
 * has been authorized.
 */

import { MAX_LIVE_UPLOAD_BYTES } from '../evidence/document-observations'
import { countPdfPages, extractPdfTextLayer, pdfHasUncountedContent } from '../evidence/pdf-text-layer'
import { RECEIPT_EXAMINATION_SYSTEM_PROMPT, RECEIPT_EXAMINATION_USER_TEXT } from '../receipt-examination/prompt'
import { RECEIPT_EXTRACTION_SCHEMA } from '../receipt-examination/schema'
import type { EvidenceMediaType } from '../evidence-intake/vocabulary'
import { BASE_MAX_TOKENS, RETRY_MAX_TOKENS } from '../receipt-examination/examine'

export const LIVE_EXAMINATION_PERMITTED_IN_THIS_BUILD: boolean = true

/**
 * CR-V2-MVP-M2A — the customer path's OWN code lock, separate on purpose: lifting the evaluation lock above (for a controlled evaluation)
 * must never open live examination to creators. A customer live examination needs BOTH locks true, the database's customer enablement
 * row (20261110000000), the submissions stop open and the real-document intake lock lifted. Each is a separate reviewed decision.
 */
export const CUSTOMER_LIVE_EXAMINATION_PERMITTED_IN_THIS_BUILD: boolean = true
export const LIVE_EVALUATION_ENV = 'CREATOR_RECORD_LIVE_EVALUATION'

/**
 * CR-V2-DOC-LIVE-1C-A. Environment variables the Anthropic SDK reads on its own. The adapter overrides the first four, and refuses the
 * fifth, but a real executor is not built at all while any of them is set: an evaluation runs with none of them.
 */
export const UNSAFE_SDK_ENVIRONMENT = ['ANTHROPIC_BASE_URL', 'ANTHROPIC_LOG', 'ANTHROPIC_AUTH_TOKEN', 'ANTHROPIC_PROFILE', 'ANTHROPIC_CUSTOM_HEADERS'] as const

export function unsafeSdkEnvironment(...envs: Readonly<Record<string, string | undefined>>[]): string[] {
  return UNSAFE_SDK_ENVIRONMENT.filter((k) => envs.some((e) => e[k] !== undefined && e[k] !== ''))
}

/** Whole micro-dollars, rounded up: the unit the durable ledger uses, so a cost is never under-recorded by rounding. */
export const toMicroUsd = (usd: number): number => Math.max(0, Math.ceil(usd * 1_000_000 - 1e-6))

/** Checked before any model call. */
export const LIVE_BOUNDS = {
  max_document_bytes: MAX_LIVE_UPLOAD_BYTES,
  max_pdf_pages: 5,
  max_output_tokens_per_request: RETRY_MAX_TOKENS,
  /** The engine's own rule: one request and one recovery retry. */
  max_requests_per_attempt: 2,
  /** Added to the request timeout: a request the SDK has not ended by then is treated as timed out. */
  deadline_margin_ms: 1_000,
} as const

/**
 * USD per million tokens, for the model the code pins. Only for ESTIMATES: an unlisted model cannot run, and a price change is a code
 * change. From the Anthropic price table as cached on 2026-10-06: confirm against the live page before any authorized run.
 */
export const LIVE_MODEL_PRICES: Readonly<Record<string, { input: number; output: number }>> = {
  'claude-sonnet-5': { input: 2, output: 10 },
}

/** A deliberately high planning figure per PDF page (text plus page image), and the fixed prompt and schema. Not a measurement. */
export const ESTIMATED_INPUT_TOKENS_PER_PAGE = 5_000
export const ESTIMATED_PROMPT_INPUT_TOKENS = 2_000

/** The most any one authorization may ask for. A larger study is a code change. */
export const LIVE_AUTHORIZATION_CEILINGS = { max_documents: 10, max_estimated_usd: 10 } as const

export function estimatedUsd(model: string, inputTokens: number, outputTokens: number): number | null {
  const price = LIVE_MODEL_PRICES[model]
  return price ? (inputTokens * price.input + outputTokens * price.output) / 1_000_000 : null
}

/** The planning maximum for one attempt: the largest allowed document, both requests, every output token. */
export function worstCaseAttemptUsd(model: string): number | null {
  const input = LIVE_BOUNDS.max_pdf_pages * ESTIMATED_INPUT_TOKENS_PER_PAGE + ESTIMATED_PROMPT_INPUT_TOKENS
  return estimatedUsd(model, input * LIVE_BOUNDS.max_requests_per_attempt, BASE_MAX_TOKENS + RETRY_MAX_TOKENS)
}

export type LiveDocumentBound = 'within_bounds' | 'too_large' | 'too_many_pages' | 'pages_undetermined'

export function checkLiveDocumentBounds(bytes: Uint8Array, media: EvidenceMediaType): LiveDocumentBound {
  if (bytes.length > LIVE_BOUNDS.max_document_bytes) return 'too_large'
  if (media !== 'application/pdf') return 'within_bounds'
  const pages = countPdfPages(bytes)
  if (pages === null) return 'pages_undetermined'
  return pages > LIVE_BOUNDS.max_pdf_pages ? 'too_many_pages' : 'within_bounds'
}

// ── CR-V2-DOC-LIVE-1C-B1: the pre-call input bound ──────────────────────────────────────────────────
//
// An upper bound on the input tokens of ONE request, from the bytes that would be sent, computed before any reservation and again by
// the executor on the content it is about to send. Nothing here is a measurement, and the provider's count is not available without
// sending the document, so every term is a deliberate over-estimate, and anything that cannot be bounded is refused:
//   - text (the fixed prompt, the fixed user text, the output schema and each PDF's extracted text): two tokens per UTF-8 byte. A
//     byte-level tokenizer does not produce more than one token per byte; the factor of two covers layout and whitespace differences
//     between this text layer and the provider's;
//   - each image, and each PDF page (sent to the model as an image): the documented ceiling for the pinned model's image size limit
//     (about 4,784 tokens at 2,576 px on the long edge), rounded up. That a PDF page image obeys the same ceiling is an ASSUMPTION;
//   - a fixed allowance for message framing and the structured-output instructions the provider adds (ASSUMPTION).
// A PDF is refused if its text layer cannot be read, or if it carries content the text layer would not count (form fields, text
// annotations, embedded files, JavaScript, Type 3 fonts, tiling patterns, links with their own appearance). Its text is read with every
// Form XObject draw counted again; a form nested too deep, drawn inside itself, or drawn too often makes it unreadable, so refused
// (1C-B1-FIX). Both assumptions must be checked with a token count on synthetic documents before any run.

export const INPUT_BOUND = {
  tokens_per_text_byte: 2,
  tokens_per_image: 5_000,
  framing_tokens: 2_000,
  /**
   * The most one request may carry. With two requests per attempt, this bounds an attempt's input. Sized so a five-page PDF with a
   * few kilobytes of text fits: at the limit an attempt costs about $0.27 for the pinned model, which the per-attempt reservation must cover.
   */
  max_input_tokens_per_request: 60_000,
} as const

const utf8 = (s: string) => Buffer.byteLength(s, 'utf8')
const FIXED_TEXT_BYTES = utf8(RECEIPT_EXAMINATION_SYSTEM_PROMPT) + utf8(RECEIPT_EXAMINATION_USER_TEXT) + utf8(JSON.stringify(RECEIPT_EXTRACTION_SCHEMA))

export type InputBoundRefusal = 'image_unreadable' | 'pdf_pages_undetermined' | 'pdf_text_unreadable' | 'pdf_uncounted_content' | 'input_over_limit'
export type InputBound = { ok: true; input_tokens: number } | { ok: false; reason: InputBoundRefusal }

/** Width and height from a PNG IHDR or a JPEG start-of-frame. Null when neither can be read. */
export function imageDimensions(bytes: Uint8Array, media: 'image/png' | 'image/jpeg'): { width: number; height: number } | null {
  const b = bytes
  if (media === 'image/png') {
    if (b.length < 24 || b[12] !== 0x49 || b[13] !== 0x48 || b[14] !== 0x44 || b[15] !== 0x52) return null
    const w = ((b[16] << 24) >>> 0) + (b[17] << 16) + (b[18] << 8) + b[19]
    const h = ((b[20] << 24) >>> 0) + (b[21] << 16) + (b[22] << 8) + b[23]
    return w > 0 && h > 0 ? { width: w, height: h } : null
  }
  let i = 2
  while (i + 9 < b.length) {
    if (b[i] !== 0xff) return null
    const marker = b[i + 1]
    if (marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd7) || marker === 0x01) { i += 2; continue }
    const len = (b[i + 2] << 8) + b[i + 3]
    if (len < 2) return null
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      const h = (b[i + 5] << 8) + b[i + 6]
      const w = (b[i + 7] << 8) + b[i + 8]
      return w > 0 && h > 0 ? { width: w, height: h } : null
    }
    i += 2 + len
  }
  return null
}

export function boundLiveInputTokens(bytes: Uint8Array, media: EvidenceMediaType): InputBound {
  let documentTokens: number
  if (media === 'application/pdf') {
    const pages = countPdfPages(bytes)
    if (pages === null) return { ok: false, reason: 'pdf_pages_undetermined' }
    const hidden = pdfHasUncountedContent(bytes)
    if (hidden !== false) return { ok: false, reason: hidden === null ? 'pdf_text_unreadable' : 'pdf_uncounted_content' }
    // Every form draw counted again, and anything that would be skipped makes the file unreadable (1C-B1-FIX).
    const layer = extractPdfTextLayer(bytes, { countEveryDraw: true })
    // `no_text`: no text is drawn at all (a scan, say). Every other unavailable reason means the text could not be read, so it is unbounded.
    if (layer.status === 'unavailable' && layer.reason !== 'no_text') return { ok: false, reason: 'pdf_text_unreadable' }
    const textBytes = layer.status === 'extracted' ? utf8(layer.text) : 0
    documentTokens = textBytes * INPUT_BOUND.tokens_per_text_byte + pages * INPUT_BOUND.tokens_per_image
  } else {
    if (!imageDimensions(bytes, media)) return { ok: false, reason: 'image_unreadable' }
    documentTokens = INPUT_BOUND.tokens_per_image
  }
  const total = FIXED_TEXT_BYTES * INPUT_BOUND.tokens_per_text_byte + INPUT_BOUND.framing_tokens + documentTokens
  return total > INPUT_BOUND.max_input_tokens_per_request ? { ok: false, reason: 'input_over_limit' } : { ok: true, input_tokens: total }
}

/** The most one attempt can cost if every bound holds: both requests at the input bound, every output token. Null for an unpriced model. */
export function attemptCostBoundUsd(model: string, inputTokensPerRequest: number): number | null {
  return estimatedUsd(model, inputTokensPerRequest * LIVE_BOUNDS.max_requests_per_attempt, BASE_MAX_TOKENS + RETRY_MAX_TOKENS)
}

// ── The explicit authorization for one bounded evaluation ───────────────────────────────────────────

export interface LiveEvaluationAuthorization {
  authorization_id: string
  expires_at: string
  max_estimated_usd: number
  /** The only documents this run may read. Each names the consent it rests on, as a reference: no personal data here. */
  permitted_documents: { sha256: string; consent_reference: string }[]
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const exact = (o: Record<string, unknown>, keys: readonly string[]) => Object.keys(o).length === keys.length && keys.every((k) => Object.prototype.hasOwnProperty.call(o, k))
const ID = /^[a-z0-9][a-z0-9._-]{7,63}$/
const HEX64 = /^[0-9a-f]{64}$/
const ISO_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/

/** Exact keys and ceilings. Null on anything else. */
export function parseLiveEvaluationAuthorization(raw: unknown): LiveEvaluationAuthorization | null {
  if (!isObj(raw) || !exact(raw, ['authorization_id', 'expires_at', 'max_estimated_usd', 'permitted_documents'])) return null
  const { authorization_id, expires_at, max_estimated_usd, permitted_documents } = raw
  if (typeof authorization_id !== 'string' || !ID.test(authorization_id)) return null
  if (typeof expires_at !== 'string' || !ISO_INSTANT.test(expires_at) || Number.isNaN(Date.parse(expires_at))) return null
  if (typeof max_estimated_usd !== 'number' || !Number.isFinite(max_estimated_usd) || max_estimated_usd <= 0 || max_estimated_usd > LIVE_AUTHORIZATION_CEILINGS.max_estimated_usd) return null
  if (!Array.isArray(permitted_documents) || permitted_documents.length < 1 || permitted_documents.length > LIVE_AUTHORIZATION_CEILINGS.max_documents) return null
  const seen = new Set<string>()
  for (const d of permitted_documents) {
    if (!isObj(d) || !exact(d, ['sha256', 'consent_reference'])) return null
    if (typeof d.sha256 !== 'string' || !HEX64.test(d.sha256) || seen.has(d.sha256)) return null
    if (typeof d.consent_reference !== 'string' || !ID.test(d.consent_reference)) return null
    seen.add(d.sha256)
  }
  return raw as unknown as LiveEvaluationAuthorization
}

export function liveEvaluationEnabled(env: Readonly<Record<string, string | undefined>>, authorization: LiveEvaluationAuthorization, now: Date, permitted: boolean = LIVE_EXAMINATION_PERMITTED_IN_THIS_BUILD): boolean {
  return permitted === true && env[LIVE_EVALUATION_ENV] === authorization.authorization_id && now.getTime() < Date.parse(authorization.expires_at)
}
