'use client'

/**
 * Minimal Sales workflow status control (CAH-3B). NEW is a derived default;
 * transitions are validated server-side. No notes, no CRM fields.
 */

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import type { SalesSessionWorkflowState } from '@/lib/crc-sales/types'
import type { SalesStatus, SalesCloseReason } from '@/lib/crc-sales/workflow'

const CLOSE_REASONS: SalesCloseReason[] = ['converted', 'declined', 'unreachable', 'no_response']

function nextActions(status: SalesStatus): Array<{ to: SalesStatus; label: string; needsReason?: boolean }> {
  switch (status) {
    case 'NEW':
      return [
        { to: 'CONTACTED', label: 'Mark contacted' },
        { to: 'CLOSED', label: 'Close', needsReason: true },
      ]
    case 'CONTACTED':
      return [
        { to: 'CONVERTING', label: 'Mark converting' },
        { to: 'CLOSED', label: 'Close', needsReason: true },
      ]
    case 'CONVERTING':
      return [{ to: 'CLOSED', label: 'Close', needsReason: true }]
    case 'CLOSED':
      return [{ to: 'CONTACTED', label: 'Reopen (contacted)' }]
  }
}

export function SessionStatusControl({ sessionId, initial }: { sessionId: string; initial: SalesSessionWorkflowState }) {
  const [wf, setWf] = useState(initial)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [reason, setReason] = useState<SalesCloseReason>('no_response')

  async function transition(to: SalesStatus, withReason: boolean) {
    setBusy(true)
    setErr(null)
    try {
      const res = await fetch(`/api/admin/crc-leads/sessions/${sessionId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to, close_reason: withReason ? reason : undefined }),
      })
      const body = await res.json()
      if (!res.ok) {
        setErr(body?.error ?? 'Failed')
        return
      }
      setWf(body.workflow)
    } catch {
      setErr('Network error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded border border-gray-200 p-3">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs uppercase tracking-wide text-gray-400">Sales state</span>
        <span className="font-semibold">{wf.status}</span>
        {wf.close_reason && <span className="text-gray-500 text-xs">({wf.close_reason})</span>}
      </div>
      <div className="mt-2 flex items-center gap-2 flex-wrap">
        {nextActions(wf.status).map((a) => (
          <span key={a.to} className="flex items-center gap-1">
            {a.needsReason && (
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value as SalesCloseReason)}
                className="h-8 rounded border border-gray-300 text-xs px-1"
              >
                {CLOSE_REASONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            )}
            <Button size="sm" variant="outline" disabled={busy} onClick={() => transition(a.to, !!a.needsReason)}>
              {a.label}
            </Button>
          </span>
        ))}
      </div>
      {err && <p className="text-xs text-red-600 mt-1">{err}</p>}
    </div>
  )
}
