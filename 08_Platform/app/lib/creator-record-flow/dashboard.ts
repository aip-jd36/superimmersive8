/**
 * CR-V2-MVP-M3 — what the dashboard says about a Creator Record v2 submission. PURE.
 *
 * Derived from stored state only. "Ready" requires an ISSUED private artifact; payment alone
 * never shows a record as ready, and the v1 "APPROVED" status is never shown for v2 (payment
 * auto-approves a Creator Record in the ledger, which is not an approval of its content).
 * If the artifact state cannot be read, no link is shown.
 */
import { V2_DASHBOARD } from './wording'

export type V2DashboardState = 'awaiting_payment' | 'preparing' | 'ready' | 'refunded' | 'unavailable'

export function v2DashboardState(p: { payment_status: string | null; artifact: 'issued' | 'pending' | 'none' | 'unknown' }): V2DashboardState {
  if (p.payment_status === 'refunded') return 'refunded'
  if (p.payment_status !== 'paid') return 'awaiting_payment'
  if (p.artifact === 'unknown') return 'unavailable'
  return p.artifact === 'issued' ? 'ready' : 'preparing'
}

export function v2DashboardView(state: V2DashboardState): { badge: string; message: string; download: boolean } {
  switch (state) {
    case 'ready':
      return { badge: V2_DASHBOARD.badge_ready, message: V2_DASHBOARD.ready, download: true }
    case 'preparing':
      return { badge: V2_DASHBOARD.badge_preparing, message: V2_DASHBOARD.preparing, download: false }
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
