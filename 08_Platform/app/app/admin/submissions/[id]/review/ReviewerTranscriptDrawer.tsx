'use client'

/**
 * Reviewer CRC transcript drawer (CAH-4C §7).
 *
 * A deliberate, on-demand "View transcript" affordance for one active CRC
 * association. The transcript does NOT load with the page — clicking the button
 * calls the audited endpoint
 * (`/api/admin/submissions/[id]/reviewer-crc-context/[association_id]/transcript`),
 * which persists the fail-closed access audit BEFORE returning any content.
 *
 * This is the only client component in the reviewer-context surface. It:
 *   - holds NO workbook state and shares NO store with WorkbookClient;
 *   - imports no Section / WorkbookClient / workbook-schema;
 *   - issues exactly one GET, renders the verbatim entries in a bounded box;
 *   - has no copy-to-evidence / apply / accept / summarize / finding / outcome
 *     affordance of any kind.
 *
 * Fixed framing: verbatim CRC conversation — not verified, not assessment
 * evidence.
 */

import { useCallback, useState } from 'react'

interface TranscriptEntry {
  role: 'user' | 'assistant'
  text: string
  timestamp: string | null
}

type DrawerState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'loaded'; entries: TranscriptEntry[] }
  | { kind: 'error'; message: string }

const FRAMING =
  'Verbatim CRC conversation — customer and CRC assistant statements. Not verified and not assessment evidence.'

export function ReviewerTranscriptDrawer({
  submissionId,
  associationId,
}: {
  submissionId: string
  associationId: string
}) {
  const [state, setState] = useState<DrawerState>({ kind: 'idle' })

  const open = useCallback(async () => {
    setState({ kind: 'loading' })
    try {
      const res = await fetch(
        `/api/admin/submissions/${submissionId}/reviewer-crc-context/${associationId}/transcript`,
        { method: 'GET', cache: 'no-store' },
      )
      if (!res.ok) {
        const msg =
          res.status === 503
            ? 'Transcript unavailable — access could not be recorded.'
            : res.status === 404
              ? 'No linked CRC conversation is available here.'
              : res.status === 401 || res.status === 403
                ? 'Not authorized.'
                : 'Could not load the transcript.'
        setState({ kind: 'error', message: msg })
        return
      }
      const data = (await res.json()) as { entries?: TranscriptEntry[] }
      setState({ kind: 'loaded', entries: Array.isArray(data.entries) ? data.entries : [] })
    } catch {
      setState({ kind: 'error', message: 'Could not load the transcript.' })
    }
  }, [submissionId, associationId])

  return (
    <div className="mt-3">
      {state.kind === 'idle' && (
        <button
          type="button"
          onClick={open}
          className="text-xs rounded border px-2 py-1"
          style={{ borderColor: '#e0ddd2', color: '#4a4a52', backgroundColor: '#f7f5ef' }}
        >
          View transcript
        </button>
      )}

      {state.kind === 'loading' && (
        <p className="text-xs" style={{ color: '#83837e' }}>
          Loading transcript…
        </p>
      )}

      {state.kind === 'error' && (
        <div className="text-xs" style={{ color: '#83837e' }}>
          {state.message}{' '}
          <button type="button" onClick={open} className="underline">
            Try again
          </button>
        </div>
      )}

      {state.kind === 'loaded' && (
        <div className="rounded-md border" style={{ borderColor: '#e0ddd2', backgroundColor: '#fdfcf9' }}>
          <div className="px-3 py-2 text-xs" style={{ color: '#83837e', borderBottom: '1px solid #e0ddd2' }}>
            {FRAMING}
          </div>
          {state.entries.length === 0 ? (
            <p className="px-3 py-3 text-xs" style={{ color: '#83837e' }}>
              This CRC conversation has no recorded transcript.
            </p>
          ) : (
            <ol className="max-h-96 overflow-y-auto px-3 py-2 space-y-2 text-sm">
              {state.entries.map((e, i) => (
                <li key={i}>
                  <span
                    className="text-xs font-semibold uppercase tracking-wide"
                    style={{ color: e.role === 'user' ? '#233f66' : '#83837e' }}
                  >
                    {e.role === 'user' ? 'Customer' : 'CRC'}
                  </span>
                  {e.timestamp && (
                    <span className="ml-2 text-xs" style={{ color: '#83837e' }}>
                      {e.timestamp}
                    </span>
                  )}
                  <p className="mt-0.5 whitespace-pre-wrap" style={{ color: '#1c1c1e' }}>
                    {e.text}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
    </div>
  )
}
