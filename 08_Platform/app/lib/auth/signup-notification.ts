/**
 * CR-PUBLIC-2A-FIX — the admin "new account" notification, sent only from a trusted server-side event.
 *
 * Before: the sign-up page called a public, unauthenticated `POST /api/notify-signup` with whatever name and email the browser
 * sent, and the email inserted them unescaped. Anyone could send unlimited emails (with injected HTML) to SI8's inbox, and the
 * call proved nothing about any account. That route is removed.
 *
 * Now: `/auth/callback` calls `notifyConfirmedSignup` only after Supabase has exchanged the confirmation link's single-use code
 * for a session. The user object therefore comes from Supabase, not from the request. It notifies only when that user's email
 * was confirmed within `SIGNUP_NOTIFY_WINDOW_MS`, which is the confirmation event itself:
 *   - the code is single-use, so replaying the link exchanges nothing and sends nothing;
 *   - an already-confirmed account reaching the callback later is outside the window and sends nothing;
 *   - nothing is stored and no response reveals whether an account exists (the callback always redirects).
 * Failures never affect sign-up: every error is swallowed after logging a fixed code (never the name or email).
 */

export const SIGNUP_NOTIFY_WINDOW_MS = 15 * 60 * 1000

export interface ConfirmedUserFacts {
  id?: string | null
  email?: string | null
  email_confirmed_at?: string | null
  user_metadata?: Record<string, unknown> | null
}

/** True only for a Supabase user whose email was confirmed within the window ending now (no future timestamps). */
export function isFreshConfirmation(user: ConfirmedUserFacts | null | undefined, now: number): boolean {
  if (!user || typeof user.email !== 'string' || !user.email) return false
  const confirmed = Date.parse(String(user.email_confirmed_at ?? ''))
  if (!Number.isFinite(confirmed)) return false
  return confirmed <= now + 5_000 && now - confirmed <= SIGNUP_NOTIFY_WINDOW_MS
}

/** The product the visitor signed up from, from the callback's own validated destination. */
export function signupProductLabel(destination: string): string {
  const path = destination.split(/[?#]/)[0]
  if (path === '/creator-record' || path === '/record') return 'Creator Record'
  if (path === '/certify') return 'SI8 Certified'
  return 'Not specified'
}

export type SignupNotificationSender = (fullName: string, email: string, productLabel: string) => Promise<void>

export async function notifyConfirmedSignup(
  user: ConfirmedUserFacts | null | undefined,
  destination: string,
  deps: { send: SignupNotificationSender; now?: () => number; log?: (code: string) => void },
): Promise<'sent' | 'skipped' | 'failed'> {
  const log = deps.log ?? ((code: string) => console.warn(`signup-notification: ${code}`))
  try {
    if (!isFreshConfirmation(user, (deps.now ?? Date.now)())) return 'skipped'
    const raw = user!.user_metadata?.full_name
    const fullName = typeof raw === 'string' && raw.trim() ? raw.trim().slice(0, 120) : 'Unknown'
    await deps.send(fullName, String(user!.email).slice(0, 254), signupProductLabel(destination))
    return 'sent'
  } catch {
    log('send_failed')
    return 'failed'
  }
}
