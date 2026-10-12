'use client'

/**
 * On-demand results-email viewer (CRC-EMAIL-HISTORY-1B). Fetches only on
 * explicit click, via the dedicated audited endpoint -- mirrors
 * TranscriptViewer exactly. Artifact content is never shipped in the
 * list/detail payload; it only ever appears after this explicit reveal.
 *
 * Shows the persisted historical artifact(s) for this session, most-recent
 * first. Never reconstructs, regenerates, or resends anything -- this is a
 * read-only projection over already-persisted rows.
 */

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import type { SalesResultsEmailArtifact } from '@/lib/crc-sales/types'

function deliveryStatusLabel(attempts: SalesResultsEmailArtifact['attempts']): string {
  if (attempts.length === 0) return 'No delivery attempt recorded'
  // Most recent attempt governs the headline label; 'accepted' is never
  // rendered as "delivered" -- it means the provider confirmed receipt only.
  const last = attempts[attempts.length - 1]
  if (last.outcome === 'accepted') return 'Accepted by provider'
  if (last.outcome === 'failed') return 'Delivery failed'
  return 'Delivery outcome unknown'
}

function ArtifactCard({ artifact }: { artifact: SalesResultsEmailArtifact }) {
  const [showHtml, setShowHtml] = useState(false)

  return (
    <div className="rounded border border-gray-200 p-3 bg-gray-50 space-y-2">
      <div className="flex flex-wrap items-baseline justify-between gap-2 text-xs text-gray-500">
        <span>Generated {new Date(artifact.generated_at).toLocaleString()}</span>
        <span>{deliveryStatusLabel(artifact.attempts)}</span>
      </div>
      <div className="text-sm">
        <div>
          <span className="text-gray-500">To:</span> <span className="text-gray-800">{artifact.recipient_normalized}</span>
        </div>
        <div>
          <span className="text-gray-500">Subject:</span> <span className="text-gray-800">{artifact.subject}</span>
        </div>
      </div>

      <div>
        <h4 className="text-xs font-semibold text-gray-600 mb-1">Exact email sent (plain text)</h4>
        <pre className="whitespace-pre-wrap text-xs text-gray-800 bg-white border border-gray-200 rounded p-2 max-h-72 overflow-y-auto">{artifact.text}</pre>
      </div>

      <div>
        <Button size="sm" variant="outline" onClick={() => setShowHtml((v) => !v)}>
          {showHtml ? 'Hide HTML view' : 'View HTML (as formatted)'}
        </Button>
        {showHtml && (
          // sandbox="" (no tokens) disables script execution, forms, popups,
          // and same-origin access -- the stored HTML is rendered read-only
          // and cannot execute active content of any kind.
          <iframe
            sandbox=""
            srcDoc={artifact.html}
            title="Results email (HTML, read-only)"
            className="w-full h-72 mt-2 border border-gray-200 rounded bg-white"
          />
        )}
      </div>

      {artifact.attempts.length > 0 && (
        <details className="text-xs">
          <summary className="cursor-pointer text-gray-600">Delivery attempts ({artifact.attempts.length})</summary>
          <ul className="mt-1 space-y-1 pl-4 text-gray-500">
            {artifact.attempts.map((a, i) => (
              <li key={i}>
                {new Date(a.attempted_at).toLocaleString()} — {a.outcome}
                {a.error_detail ? ` (${a.error_detail})` : ''}
              </li>
            ))}
          </ul>
        </details>
      )}

      <details className="text-xs">
        <summary className="cursor-pointer text-gray-600">Technical details</summary>
        <ul className="mt-1 space-y-0.5 pl-4 text-gray-500">
          <li>Artifact ID: {artifact.id}</li>
          <li>Template version: {artifact.template_version}</li>
          <li>Runtime commit: {artifact.runtime_commit}</li>
          <li>Content hash: {artifact.content_hash}</li>
          {artifact.previous_artifact_id && <li>Previous artifact: {artifact.previous_artifact_id}</li>}
        </ul>
      </details>
    </div>
  )
}

export function ResultsEmailViewer({ sessionId }: { sessionId: string }) {
  const [artifacts, setArtifacts] = useState<SalesResultsEmailArtifact[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function load() {
    setBusy(true)
    setErr(null)
    try {
      const res = await fetch(`/api/admin/crc-leads/sessions/${sessionId}/results-email`)
      const body = await res.json()
      if (!res.ok) {
        setErr(body?.error ?? 'Failed to load results email')
        return
      }
      setArtifacts(body.artifacts ?? [])
    } catch {
      setErr('Network error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section>
      <div className="flex items-center gap-2">
        <h3 className="font-semibold">Results email</h3>
        {artifacts === null && (
          <Button size="sm" variant="outline" disabled={busy} onClick={load}>
            {busy ? 'Loading…' : 'View results email'}
          </Button>
        )}
      </div>
      {err && <p className="text-xs text-red-600 mt-1">{err}</p>}
      {artifacts !== null && (
        <div className="mt-2 space-y-3">
          {artifacts.length === 0 ? (
            <p className="text-gray-500 text-xs">
              Exact historical email unavailable. This CRC predates stored results-email history.
            </p>
          ) : (
            artifacts.map((a) => <ArtifactCard key={a.id} artifact={a} />)
          )}
        </div>
      )}
    </section>
  )
}
