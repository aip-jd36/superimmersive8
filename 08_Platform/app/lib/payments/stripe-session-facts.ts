/**
 * CAA-SECURITY-3B — extract the Stripe-signed checkout-session facts that
 * record_checkout_payment() decides on.
 *
 * PURE. This module makes NO acceptance decision: the database is the single
 * acceptance authority. It only copies signed fields verbatim (with type
 * guards so a malformed value becomes null, which the database rejects).
 *
 * Deliberately NOT extracted: `metadata` (any key) and `customer_email`.
 * Stripe metadata is informational only and is never an input to payment,
 * tier, price, identity or approval decisions.
 */

export interface CheckoutSessionFacts {
  sessionId: string | null
  eventId: string | null
  clientReferenceId: string | null
  sessionCreatedEpoch: number | null
  sessionStatus: string | null
  mode: string | null
  paymentStatus: string | null
  paymentIntentId: string | null
  currency: string | null
  amountSubtotal: number | null
  amountTotal: number | null
  amountDiscount: number | null
  amountTax: number | null
  amountShipping: number | null
}

const str = (v: unknown): string | null => (typeof v === 'string' && v.length > 0 ? v : null)
const int = (v: unknown): number | null => (typeof v === 'number' && Number.isInteger(v) ? v : null)

export function extractCheckoutSessionFacts(event: { id?: unknown; data?: { object?: unknown } }): CheckoutSessionFacts {
  const s = (event?.data?.object ?? {}) as Record<string, any>
  const totals = (s.total_details ?? {}) as Record<string, unknown>
  const pi = s.payment_intent
  return {
    sessionId: str(s.id),
    eventId: str(event?.id),
    clientReferenceId: str(s.client_reference_id),
    sessionCreatedEpoch: int(s.created),
    sessionStatus: str(s.status),
    mode: str(s.mode),
    paymentStatus: str(s.payment_status),
    paymentIntentId: typeof pi === 'string' ? str(pi) : str(pi?.id),
    currency: str(s.currency),
    amountSubtotal: int(s.amount_subtotal),
    amountTotal: int(s.amount_total),
    amountDiscount: int(totals.amount_discount),
    amountTax: int(totals.amount_tax),
    amountShipping: int(totals.amount_shipping),
  }
}

export const isCheckoutSessionId = (v: unknown): v is string =>
  typeof v === 'string' && /^cs_[A-Za-z0-9_]+$/.test(v)

export const isStripeEventId = (v: unknown): v is string =>
  typeof v === 'string' && /^evt_[A-Za-z0-9_]+$/.test(v)
