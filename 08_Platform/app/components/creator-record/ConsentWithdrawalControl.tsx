'use client'

/**
 * CR-V2-MVP-LAUNCH-FOUNDATION-1 — the creator's control for withdrawing AI-examination permission (Decisions 8N / 8Q).
 *
 * Uses the existing route (`POST /api/creator-record-v2/consent-withdrawal`, `{ "confirm": true }`). Two explicit steps; the
 * server decides and records everything (the database pauses affected records and paid orders in the same transaction). After a
 * withdrawal there is no way back here: no re-grant, no continuation (8R is not implemented). Wording: DRAFT (`wording.ts`).
 */
import { useState } from 'react'
import { V2_CONSENT } from '@/lib/creator-record-flow/wording'

export interface ConsentWithdrawalControlProps {
  /** The server-rendered state: null = permission not withdrawn. */
  initialWithdrawnAt: string | null
}

type Step = 'idle' | 'confirming' | 'working'

export function ConsentWithdrawalControl(props: ConsentWithdrawalControlProps) {
  const [withdrawnAt, setWithdrawnAt] = useState<string | null>(props.initialWithdrawnAt)
  const [step, setStep] = useState<Step>('idle')
  const [error, setError] = useState<string | null>(null)
  const when = (iso: string) => new Date(iso).toLocaleString()

  async function withdraw() {
    setStep('working')
    setError(null)
    try {
      const res = await fetch('/api/creator-record-v2/consent-withdrawal', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ confirm: true }),
      })
      const json = await res.json().catch(() => ({}))
      const at = (json as { consent_withdrawal?: { withdrawn_at?: unknown } }).consent_withdrawal?.withdrawn_at
      if (res.ok && typeof at === 'string') setWithdrawnAt(at)
      else setError(V2_CONSENT.failed)
    } catch {
      setError(V2_CONSENT.failed)
    } finally {
      setStep('idle')
    }
  }

  return (
    <section className="mb-8 rounded-lg border bg-white p-6" aria-labelledby="cr-consent-title" data-consent-control>
      <h2 id="cr-consent-title" className="text-lg font-semibold text-gray-900 mb-2">{V2_CONSENT.title}</h2>
      {withdrawnAt ? (
        <div role="status" data-consent-withdrawn>
          <p className="text-sm text-gray-800">{V2_CONSENT.withdrawn}</p>
          <p className="text-xs text-gray-500 mt-1">{V2_CONSENT.withdrawn_on} {when(withdrawnAt)}</p>
        </div>
      ) : (
        <div>
          <p className="text-sm text-gray-700 mb-3">{V2_CONSENT.active}</p>
          {step === 'idle' && (
            <button type="button" className="rounded-md border px-3 py-1.5 text-sm font-medium bg-white" onClick={() => setStep('confirming')}>
              {V2_CONSENT.withdraw}
            </button>
          )}
          {step !== 'idle' && (
            <div className="rounded-md border p-3" role="alertdialog" aria-labelledby="cr-consent-confirm">
              <p id="cr-consent-confirm" className="text-sm font-medium text-gray-900 mb-2">{V2_CONSENT.confirm_prompt}</p>
              <div className="flex gap-2">
                <button type="button" className="rounded-md border px-3 py-1.5 text-sm font-medium bg-white disabled:opacity-50" onClick={() => void withdraw()} disabled={step === 'working'}>
                  {step === 'working' ? V2_CONSENT.working : V2_CONSENT.confirm}
                </button>
                <button type="button" className="rounded-md border px-3 py-1.5 text-sm bg-white disabled:opacity-50" onClick={() => setStep('idle')} disabled={step === 'working'}>
                  {V2_CONSENT.cancel}
                </button>
              </div>
            </div>
          )}
          {error && <p className="text-sm font-medium text-red-700 mt-2" role="alert">{error}</p>}
        </div>
      )}
    </section>
  )
}
