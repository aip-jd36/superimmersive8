/**
 * CRC acquisition attribution (2026-09-29). Pure, no I/O -- shared by the
 * /crc client (reads its own URL) and the turn route (authoritative
 * server-side re-validation before anything is persisted).
 *
 * Captures ONLY five approved campaign parameters, first-touch, at CRC
 * session creation:
 *
 *   utm_source / utm_medium / utm_campaign / utm_content -- campaign
 *     identifiers, stored under the same column names;
 *   ref -- optional NON-PII lead/reference code (e.g. an existing CRM code
 *     like `B087`), stored as `crc_sessions.acquisition_ref`.
 *
 * Deliberately NOT captured: any other query parameter, document.referrer,
 * GA client/session ids. Values are opaque strings -- never case-folded,
 * parsed, or used to derive identity.
 *
 * Invalid input never fails a request and is never truncated: anything
 * that isn't a non-empty string within its length limit and matching
 * ACQUISITION_VALUE_PATTERN silently becomes null. The strict character
 * set (no spaces, `+`, `@`, `/`, `%`) also keeps emails/URLs out even if
 * someone tags a link by mistake.
 *
 * Write-path rule (see route.ts / supabase-session-store.ts): these values
 * are persisted ONLY in the two session-creation paths (guided creation and
 * new free-form creation) and never updated on an existing session.
 */

/** Public URL parameter names, in the order they are forwarded. */
export const ACQUISITION_PARAM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'ref'] as const
export type AcquisitionParamKey = (typeof ACQUISITION_PARAM_KEYS)[number]

export const ACQUISITION_VALUE_PATTERN = /^[A-Za-z0-9._~-]+$/
export const ACQUISITION_MAX_LENGTH: Record<AcquisitionParamKey, number> = {
  utm_source: 100,
  utm_medium: 100,
  utm_campaign: 100,
  utm_content: 100,
  ref: 64,
}

/** Sanitized acquisition, keyed by the public parameter names. */
export type CrcAcquisition = Record<AcquisitionParamKey, string | null>

/** crc_sessions column names -- public `ref` maps to `acquisition_ref`. */
export interface CrcAcquisitionColumns {
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  utm_content?: string
  acquisition_ref?: string
}

export const EMPTY_ACQUISITION: CrcAcquisition = Object.freeze({
  utm_source: null,
  utm_medium: null,
  utm_campaign: null,
  utm_content: null,
  ref: null,
}) as CrcAcquisition

function sanitizeValue(key: AcquisitionParamKey, value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (trimmed.length === 0 || trimmed.length > ACQUISITION_MAX_LENGTH[key]) return null
  return ACQUISITION_VALUE_PATTERN.test(trimmed) ? trimmed : null
}

/** Never throws. Non-object input, unknown keys, and invalid values all collapse to null. */
export function sanitizeAcquisition(raw: unknown): CrcAcquisition {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return { ...EMPTY_ACQUISITION }
  const source = raw as Record<string, unknown>
  const result = { ...EMPTY_ACQUISITION }
  for (const key of ACQUISITION_PARAM_KEYS) {
    result[key] = sanitizeValue(key, source[key])
  }
  return result
}

/** Client-side reader for a URL query string (e.g. `window.location.search`). Same rules as the server. */
export function readAcquisitionFromSearch(search: string): CrcAcquisition {
  const params = new URLSearchParams(search)
  const raw: Record<string, string | null> = {}
  for (const key of ACQUISITION_PARAM_KEYS) raw[key] = params.get(key)
  return sanitizeAcquisition(raw)
}

/**
 * Maps sanitized acquisition to crc_sessions columns, OMITTING null fields
 * so untagged traffic never references the acquisition columns at all.
 */
export function toAcquisitionColumns(acquisition: CrcAcquisition): CrcAcquisitionColumns {
  const columns: CrcAcquisitionColumns = {}
  if (acquisition.utm_source !== null) columns.utm_source = acquisition.utm_source
  if (acquisition.utm_medium !== null) columns.utm_medium = acquisition.utm_medium
  if (acquisition.utm_campaign !== null) columns.utm_campaign = acquisition.utm_campaign
  if (acquisition.utm_content !== null) columns.utm_content = acquisition.utm_content
  if (acquisition.ref !== null) columns.acquisition_ref = acquisition.ref
  return columns
}
