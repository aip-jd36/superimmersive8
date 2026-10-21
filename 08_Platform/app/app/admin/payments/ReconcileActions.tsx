'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

type Props = {
  sessionId: string
  outcome: string
  anomalyOpen: boolean
  fulfillmentStatus: string
  emailStatus: string
}

const LABELS: Record<string, string> = {
  retry_fulfillment: 'Retry fulfillment',
  authorize_email_resend: 'Authorize email resend',
  close_unknown_email: 'Close email (no resend)',
  resolve_anomaly: 'Resolve anomaly',
}

export function ReconcileActions({ sessionId, outcome, anomalyOpen, fulfillmentStatus, emailStatus }: Props) {
  const router = useRouter()
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const accepted = outcome === 'accepted'
  const actions = [
    accepted && emailStatus !== 'unknown' && ['failed', 'needs_reconciliation'].includes(fulfillmentStatus) && 'retry_fulfillment',
    accepted && emailStatus === 'unknown' && 'authorize_email_resend',
    accepted && emailStatus === 'unknown' && 'close_unknown_email',
    anomalyOpen && 'resolve_anomaly',
  ].filter(Boolean) as string[]

  if (actions.length === 0) return null

  const run = async (action: string) => {
    setBusy(true)
    setMessage(null)
    try {
      const res = await fetch(`/api/admin/payments/${encodeURIComponent(sessionId)}/reconcile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, note }),
      })
      const json = await res.json().catch(() => ({}))
      setMessage(res.ok ? `${json.result}${json.fulfillment ? ` → ${json.fulfillment.status}` : ''}` : (json.error || 'Failed'))
      if (res.ok) {
        setNote('')
        router.refresh()
      }
    } catch {
      setMessage('Request failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-2 border-t pt-3">
      <Textarea
        placeholder="Reconciliation note (required — what you checked and why)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={2}
      />
      <div className="flex flex-wrap gap-2">
        {actions.map((a) => (
          <Button key={a} size="sm" variant="outline" disabled={busy || note.trim().length < 5} onClick={() => run(a)}>
            {LABELS[a]}
          </Button>
        ))}
      </div>
      {message && <p className="text-xs" style={{ color: '#52504A' }}>{message}</p>}
    </div>
  )
}
