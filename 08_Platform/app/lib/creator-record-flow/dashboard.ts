/**
 * CR-V2-MVP-M3 — what the dashboard says about a Creator Record v2 submission. PURE.
 *
 * Derived from stored state only. "Ready" requires an ISSUED private artifact; payment alone
 * never shows a record as ready, and the v1 "APPROVED" status is never shown for v2 (payment
 * auto-approves a Creator Record in the ledger, which is not an approval of its content).
 * If the artifact state cannot be read, no link is shown.
 *
 * CR-V2-MVP-LAUNCH-FOUNDATION-1: a paid, unissued order that is in the payment ledger's manual queue (for ANY reason: a consent
 * pause, an original no longer held, a refused issuance, an ambiguous email) is shown as "needs attention", never as "being
 * prepared" indefinitely; an unpaid record paused by withdrawn AI-examination permission is shown as "paused", never as "complete
 * payment". No internal status, reason or ledger detail is shown. Anything that cannot be read is "unavailable" (fail closed).
 */
import { V2_DASHBOARD } from './wording'

export type V2DashboardState = 'awaiting_payment' | 'preparing' | 'ready' | 'refunded' | 'unavailable' | 'support_required' | 'paused'

/** The fulfilment of the submission's accepted payment, as the dashboard needs it. */
export type V2FulfilmentView = 'manual_resolution' | 'automatic' | 'none' | 'unknown'

export function v2DashboardState(p: {
  payment_status: string | null
  artifact: 'issued' | 'pending' | 'none' | 'unknown'
  fulfilment?: V2FulfilmentView
  /** The bound version references a document under withdrawn AI-examination permission. */
  paused?: boolean | 'unknown'
}): V2DashboardState {
  if (p.payment_status === 'refunded') return 'refunded'
  if (p.payment_status !== 'paid') return p.paused === true ? 'paused' : 'awaiting_payment'
  if (p.artifact === 'unknown') return 'unavailable'
  if (p.artifact === 'issued') return 'ready'
  if (p.fulfilment === 'manual_resolution') return 'support_required'
  if (p.fulfilment === 'unknown') return 'unavailable'
  return 'preparing'
}

/** The ledger's fulfilment status, reduced to what the dashboard may know. */
export function v2FulfilmentView(row: { fulfillment_status: string | null } | null, lookupFailed: boolean): V2FulfilmentView {
  if (lookupFailed) return 'unknown'
  if (!row || !row.fulfillment_status) return 'none'
  return row.fulfillment_status === 'needs_reconciliation' ? 'manual_resolution' : 'automatic'
}

export function v2DashboardView(state: V2DashboardState): { badge: string; message: string; download: boolean } {
  switch (state) {
    case 'ready':
      return { badge: V2_DASHBOARD.badge_ready, message: V2_DASHBOARD.ready, download: true }
    case 'preparing':
      return { badge: V2_DASHBOARD.badge_preparing, message: V2_DASHBOARD.preparing, download: false }
    case 'support_required':
      return { badge: V2_DASHBOARD.badge_support_required, message: V2_DASHBOARD.support_required, download: false }
    case 'paused':
      return { badge: V2_DASHBOARD.badge_paused, message: V2_DASHBOARD.paused, download: false }
    case 'refunded':
      return { badge: 'REFUNDED', message: V2_DASHBOARD.refunded, download: false }
    case 'unavailable':
      return { badge: V2_DASHBOARD.badge_preparing, message: V2_DASHBOARD.unavailable, download: false }
    default:
      return { badge: V2_DASHBOARD.badge_awaiting_payment, message: V2_DASHBOARD.awaiting_payment, download: false }
  }
}

/** The list-page badge, without an artifact lookup: never "ready" or "approved". */
export function v2ListBadge(paymentStatus: string | null): string {
  if (paymentStatus === 'refunded') return 'REFUNDED'
  return paymentStatus === 'paid' ? 'PAID' : V2_DASHBOARD.badge_awaiting_payment
}
