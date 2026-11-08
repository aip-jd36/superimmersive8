/**
 * CR-V2-MVP-LAUNCH-FOUNDATION-1-CORRECTIONS-1 — the browser's withdrawal request, and what its outcome can honestly be said to be.
 *
 * Client-safe: no server imports. It calls the existing route (`POST /api/creator-record-v2/consent-withdrawal`,
 * `{ "confirm": true }`), which is idempotent, so a retry is always harmless. Outcomes:
 *   - `withdrawn`  — the server confirmed the withdrawal and returned its time;
 *   - `signed_out` — the server refused before doing anything (401: no session), so nothing was recorded;
 *   - `uncertain`  — anything else (timeout, network error, server error, unexpected response): the withdrawal may or may not
 *                    have been recorded, and the creator is told exactly that.
 * Never reports success without the server's confirmation, and never claims that nothing changed.
 */

export const CONSENT_WITHDRAWAL_PATH = '/api/creator-record-v2/consent-withdrawal'
export const CONSENT_WITHDRAWAL_TIMEOUT_MS = 15_000

/** The dashboard's server-rendered starting state for the control (`consent-dashboard.ts`). */
export type ConsentControlInitial = { state: 'active' } | { state: 'withdrawn'; withdrawnAt: string } | { state: 'unknown' }

export type WithdrawalOutcome = { kind: 'withdrawn'; withdrawnAt: string } | { kind: 'signed_out' } | { kind: 'uncertain' }

type FetchLike = (input: string, init: RequestInit) => Promise<Pick<Response, 'ok' | 'status' | 'json'>>

export async function requestConsentWithdrawal(fetchImpl: FetchLike, timeoutMs: number = CONSENT_WITHDRAWAL_TIMEOUT_MS): Promise<WithdrawalOutcome> {
  const controller = typeof AbortController === 'function' ? new AbortController() : null
  let timer: ReturnType<typeof setTimeout> | undefined
  const timedOut = new Promise<'timeout'>((resolve) => {
    timer = setTimeout(() => {
      controller?.abort()
      resolve('timeout')
    }, timeoutMs)
  })
  try {
    const res = await Promise.race([
      fetchImpl(CONSENT_WITHDRAWAL_PATH, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ confirm: true }),
        ...(controller ? { signal: controller.signal } : {}),
      }),
      timedOut,
    ])
    if (res === 'timeout') return { kind: 'uncertain' }
    if (res.status === 401) return { kind: 'signed_out' }
    if (!res.ok) return { kind: 'uncertain' }
    const json = await Promise.race([res.json().catch(() => null), timedOut])
    if (json === 'timeout') return { kind: 'uncertain' }
    const at = (json as { consent_withdrawal?: { withdrawn_at?: unknown } } | null)?.consent_withdrawal?.withdrawn_at
    return typeof at === 'string' && at.length > 0 && !Number.isNaN(Date.parse(at)) ? { kind: 'withdrawn', withdrawnAt: at } : { kind: 'uncertain' }
  } catch {
    return { kind: 'uncertain' }
  } finally {
    if (timer !== undefined) clearTimeout(timer)
  }
}
