'use client'

/**
 * CAH-3F -- minimal, non-blocking submission-scoped panel for deliberately
 * linking a potentially related CRC conversation to this submission.
 *
 * Shows NO substantive CRC content (no transcript, goals, tools, jurisdiction,
 * project facts). Language is deliberately bounded: "potentially related CRC
 * conversation" -- never "your CRC" as a proven historical-ownership claim,
 * never "verified", "cleared", "approved", or "evidence". The customer is
 * never asked to attest that they personally ran the CRC or that its contents
 * remain true.
 */

import { useCallback, useEffect, useState } from 'react'

type Discovery =
  | { available: true; candidateHandle: string }
  | { available: false; reason: string }

type PanelState =
  | { kind: 'loading' }
  | { kind: 'none' }
  | { kind: 'candidate'; handle: string }
  | { kind: 'ambiguous' }
  | { kind: 'already_elsewhere' }
  | { kind: 'linked' }
  | { kind: 'error' }

export function CrcAssociationPanel({ submissionId }: { submissionId: string }) {
  const [state, setState] = useState<PanelState>({ kind: 'loading' })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`/api/dashboard/submissions/${submissionId}/crc-candidates`, { cache: 'no-store' })
        const data = (await res.json()) as Discovery
        if (cancelled) return
        if (data.available === true) {
          setState({ kind: 'candidate', handle: data.candidateHandle })
        } else if (data.reason === 'no_candidate' || data.reason === 'email_not_verified' || data.reason === 'unauthenticated') {
          setState({ kind: 'none' })
        } else if (data.reason === 'multiple_candidates_require_stronger_disambiguation') {
          setState({ kind: 'ambiguous' })
        } else if (data.reason === 'candidate_already_associated_elsewhere') {
          setState({ kind: 'already_elsewhere' })
        } else {
          setState({ kind: 'error' })
        }
      } catch {
        if (!cancelled) setState({ kind: 'error' })
      }
    })()
    return () => {
      cancelled = true
    }
  }, [submissionId])

  const onConfirm = useCallback(async (handle: string) => {
    setSubmitting(true)
    try {
      const res = await fetch(`/api/dashboard/submissions/${submissionId}/crc-association`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: true, candidateHandle: handle }),
      })
      const data = (await res.json()) as { ok: boolean; code?: string }
      if (data.ok) {
        setState({ kind: 'linked' })
      } else if (data.code === 'candidate_already_associated_elsewhere') {
        setState({ kind: 'already_elsewhere' })
      } else if (data.code === 'multiple_candidates_require_stronger_disambiguation') {
        setState({ kind: 'ambiguous' })
      } else if (data.code === 'no_candidate' || data.code === 'stale_candidate') {
        setState({ kind: 'none' })
      } else {
        setState({ kind: 'error' })
      }
    } catch {
      setState({ kind: 'error' })
    } finally {
      setSubmitting(false)
    }
  }, [submissionId])

  // Non-blocking: render nothing when there is nothing useful to say.
  if (state.kind === 'loading' || state.kind === 'none' || state.kind === 'error') return null

  return (
    <div className="p-4 rounded-lg bg-gray-50 border border-gray-200">
      {state.kind === 'candidate' && (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-gray-800">
            We found a <span className="font-medium">potentially related CRC conversation</span> connected to your account email.
            You can link it to this submission for context. Linking does not verify the conversation or its contents.
          </p>
          <div>
            <button
              type="button"
              disabled={submitting}
              onClick={() => onConfirm(state.handle)}
              className="inline-flex items-center rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
            >
              {submitting ? 'Linking…' : 'Link this CRC conversation'}
            </button>
          </div>
        </div>
      )}

      {state.kind === 'ambiguous' && (
        <p className="text-sm text-gray-700">
          We found more than one potentially related CRC conversation for your account email and can&apos;t tell which one belongs
          with this submission. No link was made.
        </p>
      )}

      {state.kind === 'already_elsewhere' && (
        <p className="text-sm text-gray-700">
          A potentially related CRC conversation is already linked to another of your submissions. It can&apos;t be linked here as well.
        </p>
      )}

      {state.kind === 'linked' && (
        <p className="text-sm text-gray-800">A potentially related CRC conversation has been linked to this submission.</p>
      )}
    </div>
  )
}
