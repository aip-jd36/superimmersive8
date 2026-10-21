import { requireAdmin } from '@/lib/auth/admin'
import { listAttention } from '@/lib/payments/repository'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { ReconcileActions } from './ReconcileActions'

/**
 * CAA-SECURITY-3B — durable payment reconciliation queue.
 * Shows every ledger row with an open anomaly or fulfillment that needs a
 * human (failed / needs_reconciliation). Never filtered by age.
 */

export const dynamic = 'force-dynamic'

const money = (cents: number | null) => (typeof cents === 'number' ? `$${(cents / 100).toFixed(2)}` : '—')

export default async function PaymentReconciliationPage() {
  await requireAdmin()
  const rows = await listAttention(200)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: '#1a1918' }}>Payment reconciliation</h1>
        <p className="text-sm mt-1" style={{ color: '#52504A' }}>
          {rows.length === 0
            ? 'Nothing needs attention.'
            : `${rows.length} ledger record${rows.length === 1 ? '' : 's'} need attention (oldest first).`}
          {' '}An unknown email outcome is never resent automatically — check the Resend log before choosing an action.
        </p>
      </div>

      {rows.map((r) => (
        <Card key={r.stripe_checkout_session_id}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-mono">{r.stripe_checkout_session_id}</CardTitle>
            <CardDescription>
              {r.outcome} · {r.outcome_reason} · binding {r.session_binding}
              {r.anomaly_status === 'open' ? ' · anomaly open' : ''}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <div><strong>Submission:</strong>{' '}
                {r.submission_id
                  ? <Link className="underline" href={`/admin/submissions/${r.submission_id}`}>{String(r.submission_id).slice(0, 8)}</Link>
                  : (r.submission_ref ? `${String(r.submission_ref).slice(0, 8)} (deleted)` : '—')}
              </div>
              <div><strong>Tier:</strong> {r.tier ?? '—'}</div>
              <div><strong>List / paid:</strong> {money(r.expected_amount)} / {money(r.amount_total)} {r.currency ?? ''}</div>
              <div><strong>Stripe status:</strong> {r.stripe_payment_status ?? '—'}</div>
              <div><strong>Fulfillment:</strong> {r.fulfillment_status}</div>
              <div><strong>PDF:</strong> {r.pdf_status}</div>
              <div><strong>Email:</strong> {r.email_status}{r.email_provider_id ? ` (${r.email_provider_id})` : ''}</div>
              <div><strong>Attempts:</strong> {r.attempts}</div>
            </div>
            {r.last_error && <p style={{ color: '#991b1b' }}><strong>Last error:</strong> {r.last_error}</p>}
            {Array.isArray(r.reconciliation_log) && r.reconciliation_log.length > 0 && (
              <ul className="text-xs list-disc pl-5" style={{ color: '#52504A' }}>
                {r.reconciliation_log.map((e: any, i: number) => (
                  <li key={i}>{e.at} — {e.action}: {e.note}</li>
                ))}
              </ul>
            )}
            <ReconcileActions
              sessionId={r.stripe_checkout_session_id}
              outcome={r.outcome}
              anomalyOpen={r.anomaly_status === 'open'}
              fulfillmentStatus={r.fulfillment_status}
              emailStatus={r.email_status}
            />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
