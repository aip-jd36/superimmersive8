'use client'

/**
 * On-demand transcript viewer (CAH-3B §19). Fetches only on explicit
 * click, via the dedicated audited endpoint. Transcript content is never
 * shipped in list/detail/answer-context payloads.
 */

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import type { SalesTranscriptEntry } from '@/lib/crc-sales/types'

export function TranscriptViewer({ sessionId }: { sessionId: string }) {
  const [entries, setEntries] = useState<SalesTranscriptEntry[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function load() {
    setBusy(true)
    setErr(null)
    try {
      const res = await fetch(`/api/admin/crc-leads/sessions/${sessionId}/transcript`)
      const body = await res.json()
      if (!res.ok) {
        setErr(body?.error ?? 'Failed to load transcript')
        return
      }
      setEntries(body.entries ?? [])
    } catch {
      setErr('Network error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section>
      <div className="flex items-center gap-2">
        <h3 className="font-semibold">Conversation</h3>
        {entries === null && (
          <Button size="sm" variant="outline" disabled={busy} onClick={load}>
            {busy ? 'Loading…' : 'View conversation'}
          </Button>
        )}
      </div>
      {err && <p className="text-xs text-red-600 mt-1">{err}</p>}
      {entries !== null && (
        <div className="mt-2 space-y-2 max-h-96 overflow-y-auto rounded border border-gray-200 p-3 bg-gray-50">
          {entries.length === 0 ? (
            <p className="text-gray-500 text-xs">No conversation entries.</p>
          ) : (
            entries.map((e, i) => (
              <div key={i} className="text-xs">
                <span className={e.role === 'user' ? 'font-semibold text-gray-800' : 'font-semibold text-gray-500'}>
                  {e.role}:
                </span>{' '}
                <span className="text-gray-700 whitespace-pre-wrap">{e.text}</span>
              </div>
            ))
          )}
        </div>
      )}
    </section>
  )
}
