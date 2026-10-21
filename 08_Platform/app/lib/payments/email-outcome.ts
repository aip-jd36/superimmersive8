/**
 * CAA-SECURITY-3B — classify a Resend send attempt for payment fulfillment.
 *
 * PURE. Three outcomes, never more certainty than the evidence supports:
 *
 *   accepted — Resend returned an email id.
 *   failed   — DEFINITE rejection: Resend answered with a parseable error
 *              naming a request-level refusal (4xx). Nothing was sent, so an
 *              automatic retry is safe.
 *   unknown  — AMBIGUOUS. Includes `application_error` and
 *              `internal_server_error`: resend@3.5.0 `fetchRequest` maps a
 *              thrown fetch (network failure / timeout), a non-JSON error
 *              body, AND an unparseable 2xx success body all to
 *              `application_error`, so it can mask an accepted send. Also any
 *              unrecognised error name, a thrown exception, or a response
 *              with neither id nor error. An unknown outcome is NEVER resent
 *              automatically; it requires admin reconciliation.
 */

export type PaymentEmailOutcome =
  | { status: 'accepted'; providerId: string }
  | { status: 'failed'; code: string }
  | { status: 'unknown'; reason: string }

/** Resend error names that mean the API refused the request (nothing sent). */
export const DEFINITE_REJECTION_ERROR_NAMES: ReadonlySet<string> = new Set([
  'missing_required_field',
  'invalid_access',
  'invalid_parameter',
  'invalid_region',
  'rate_limit_exceeded',
  'missing_api_key',
  'invalid_api_Key',
  'invalid_from_address',
  'validation_error',
  'not_found',
  'method_not_allowed',
])

export function classifyResendResult(result: unknown): PaymentEmailOutcome {
  const r = (result ?? {}) as { data?: { id?: unknown } | null; error?: { name?: unknown } | null }
  if (r.error) {
    const name = typeof r.error.name === 'string' ? r.error.name : ''
    if (DEFINITE_REJECTION_ERROR_NAMES.has(name)) return { status: 'failed', code: name }
    return { status: 'unknown', reason: name ? `provider_error:${name}` : 'provider_error:unnamed' }
  }
  const id = r.data?.id
  if (typeof id === 'string' && id.length > 0) return { status: 'accepted', providerId: id }
  return { status: 'unknown', reason: 'no_id_no_error' }
}

/** Run a send and classify it. Never throws: a thrown send is `unknown`. */
export async function sendAndClassify(send: () => Promise<unknown>): Promise<PaymentEmailOutcome> {
  try {
    return classifyResendResult(await send())
  } catch (err) {
    return { status: 'unknown', reason: `exception:${err instanceof Error ? err.message : String(err)}`.slice(0, 300) }
  }
}
