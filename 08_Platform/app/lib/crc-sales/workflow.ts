/**
 * CRC -> Sales minimal workflow state machine (CAH-3B, CAH-3A §F Model A).
 *
 *   NEW -> CONTACTED
 *   CONTACTED -> CONVERTING
 *   CONTACTED -> CLOSED{reason}
 *   CONVERTING -> CLOSED{reason}
 *   CLOSED -> CONTACTED            (single reopen path -- CAH-3A §F)
 *
 * No REVIEWED state, no notes, no CRM, no deal value, no forecast, no
 * activity timeline, no scoring. `NEW` is a DERIVED default: a session with
 * no `crc_sales_state` row is NEW; the first transition is the first write.
 *
 * Ambiguities CAH-3A left open, resolved here to the smaller / fail-closed
 * option (CAH-3B §8):
 *   - NEW -> CLOSED directly: ALLOWED (a rep can close an obviously
 *     unusable lead without a pointless "contacted" step). Reasons
 *     'not_a_fit' / 'unreachable' / 'no_response' are all valid from NEW.
 *   - NEW -> CONVERTING directly: REJECTED (a customer cannot agree to
 *     Assurance before being contacted).
 *   - Re-issuing the current status (e.g. CONTACTED -> CONTACTED):
 *     REJECTED as an invalid transition (not a silent no-op) so a
 *     double-click surfaces 409 rather than silently overwriting
 *     timestamps. The route may translate 409 into an idempotent UI
 *     response; the state machine itself is strict.
 */

export const SALES_STATUSES = ['NEW', 'CONTACTED', 'CONVERTING', 'CLOSED'] as const
export type SalesStatus = (typeof SALES_STATUSES)[number]

export const SALES_CLOSE_REASONS = ['converted', 'declined', 'not_a_fit', 'unreachable', 'no_response'] as const
export type SalesCloseReason = (typeof SALES_CLOSE_REASONS)[number]

/** Exhaustive allowed (from -> to) pairs. Anything not listed is invalid. */
const ALLOWED_TRANSITIONS: ReadonlyArray<readonly [SalesStatus, SalesStatus]> = [
  ['NEW', 'CONTACTED'],
  ['NEW', 'CLOSED'],
  ['CONTACTED', 'CONVERTING'],
  ['CONTACTED', 'CLOSED'],
  ['CONVERTING', 'CLOSED'],
  ['CLOSED', 'CONTACTED'],
]

export type TransitionResult =
  | { ok: true; to: SalesStatus; close_reason: SalesCloseReason | null }
  | { ok: false; code: 'invalid_transition' | 'missing_close_reason' | 'unexpected_close_reason' | 'unknown_status' | 'unknown_close_reason' }

/**
 * Validate a requested transition. `from` is the current effective status
 * (`NEW` when no row exists). Pure -- no I/O.
 */
export function validateTransition(from: SalesStatus, to: SalesStatus, closeReason: SalesCloseReason | null): TransitionResult {
  if (!SALES_STATUSES.includes(from)) return { ok: false, code: 'unknown_status' }
  if (!SALES_STATUSES.includes(to)) return { ok: false, code: 'unknown_status' }

  const allowed = ALLOWED_TRANSITIONS.some(([f, t]) => f === from && t === to)
  if (!allowed) return { ok: false, code: 'invalid_transition' }

  if (to === 'CLOSED') {
    if (closeReason == null) return { ok: false, code: 'missing_close_reason' }
    if (!SALES_CLOSE_REASONS.includes(closeReason)) return { ok: false, code: 'unknown_close_reason' }
  } else if (closeReason != null) {
    return { ok: false, code: 'unexpected_close_reason' }
  }

  return { ok: true, to, close_reason: to === 'CLOSED' ? closeReason : null }
}

/** Which timestamp column a transition sets (in addition to updated_at, set by the DB trigger). */
export function timestampColumnFor(to: SalesStatus): 'contacted_at' | 'converting_at' | 'closed_at' | null {
  switch (to) {
    case 'CONTACTED':
      return 'contacted_at'
    case 'CONVERTING':
      return 'converting_at'
    case 'CLOSED':
      return 'closed_at'
    case 'NEW':
      return null
  }
}
