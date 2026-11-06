/**
 * CR-V2-DOC-LIVE-1B — the limits and the locks for a real examination. No network, no SDK, no logging. Disabled.
 *
 * Its own code lock, on purpose. `LIVE_EXTRACTION_PERMITTED_IN_THIS_BUILD` also opens the admin prototype's live path
 * (`app/api/admin/creator-record-v2/examine`), so an evaluation must never need it lifted: that lock stays false, and this one opens
 * only this contract, which no route reaches. Lifting this lock is a reviewed code change and a separate decision.
 *
 * What actually stands between this code and a model call today:
 *   - This compile-time lock is the principal barrier, together with the fact that no runner or route exists.
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
import { countPdfPages } from '../evidence/pdf-text-layer'
import type { EvidenceMediaType } from '../evidence-intake/vocabulary'
import { BASE_MAX_TOKENS, RETRY_MAX_TOKENS } from '../receipt-examination/examine'

export const LIVE_EXAMINATION_PERMITTED_IN_THIS_BUILD: boolean = false
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
